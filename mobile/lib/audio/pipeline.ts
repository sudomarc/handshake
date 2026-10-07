/**
 * Real-time call-audio analysis pipeline for Handshake-controlled calls.
 *
 *     audio frames
 *       → VAD (voice activity detection)
 *       → short buffered speech windows
 *       → streaming STT
 *       → incremental risk analysis
 *       → risk engine
 *       → Protected / Verify / Risk
 *
 * IMPORTANT SCOPE BOUNDARY — read before wiring this to anything:
 *
 * This pipeline only operates on audio that Handshake itself controls or
 * receives. On Android today, Handshake controls **no** call audio:
 *
 *   - carrier calls: `TelephonyCallback` exposes call *state*, not the audio
 *     stream. Microphone foreground services continue microphone capture under
 *     explicit permission, which is not the same thing as the call's audio.
 *   - third-party apps (WhatsApp, etc.): their private two-way audio is not
 *     exposed to Handshake at all.
 *
 * `AudioFrameSource` therefore has no production implementation, and
 * `assertControllableSource` refuses to run the pipeline over any source that
 * does not declare itself Handshake-controlled. That refusal is deliberate: it
 * is what stops this module from being quietly pointed at carrier audio and
 * producing a fabricated "Protected" claim.
 *
 * Privacy properties:
 *   - raw audio is never uploaded. Only short-lived text transcriptions of
 *     speech windows leave the device, and each window is discarded after it is
 *     transcribed.
 *   - windows are bounded in duration, so latency stays near-real-time and the
 *     buffer cannot grow into a recording.
 *   - analysis stops when the source stops, and `stop()` clears all buffers.
 */

export type AudioSampleFormat = "pcm_s16le" | "pcm_f32le";

/** One block of audio from a source Handshake controls. */
export interface AudioFrame {
  /** Interleaved samples in `format`. */
  data: Float32Array;
  sampleRate: number;
  /** Monotonic timestamp of the first sample, in milliseconds. */
  timestampMs: number;
}

/**
 * A source of audio that Handshake legitimately controls.
 *
 * `handshakeControlled` must be `true` and justified by the calling surface.
 * There is deliberately no constructor that sets it from a carrier or
 * third-party call.
 */
export interface ControllableAudioSource {
  readonly handshakeControlled: true;
  readonly format: AudioSampleFormat;
  readonly sampleRate: number;
  start(onFrame: (frame: AudioFrame) => void): Promise<void>;
  stop(): Promise<void>;
}

export class UncontrollableAudioSourceError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "UncontrollableAudioSourceError";
  }
}

/** Refuses to run over audio Handshake does not control. */
export function assertControllableSource(
  source: ControllableAudioSource | null | undefined,
): ControllableAudioSource {
  if (!source) {
    throw new UncontrollableAudioSourceError(
      "No Handshake-controlled audio source is available for this call.",
    );
  }
  if (source.handshakeControlled !== true) {
    throw new UncontrollableAudioSourceError(
      "Refusing to analyse audio that Handshake does not control.",
    );
  }
  return source;
}

/* ------------------------------------------------------------------ */
/* 1. Voice activity detection                                         */
/* ------------------------------------------------------------------ */

export interface VadOptions {
  /** RMS energy above which a frame counts as speech. */
  speechThreshold: number;
  /** Consecutive speech frames required to open a speech run. */
  hangoverFrames: number;
}

export const DEFAULT_VAD_OPTIONS: VadOptions = {
  speechThreshold: 0.02,
  hangoverFrames: 3,
};

/** Root-mean-square energy of one frame. Cheap, adequate for speech gating. */
export function frameEnergy(frame: Float32Array): number {
  if (frame.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < frame.length; i += 1) sum += frame[i] * frame[i];
  return Math.sqrt(sum / frame.length);
}

export interface VadEvent {
  /** True when the frame was classified as speech. */
  speech: boolean;
  /** True on the first frame of a new speech run. */
  started: boolean;
  /** True on the frame that ends a speech run (silence hangover elapsed). */
  ended: boolean;
  energy: number;
}

export class VoiceActivityDetector {
  private hangover = 0;
  private speaking = false;
  private readonly options: VadOptions;

  constructor(options: Partial<VadOptions> = {}) {
    this.options = { ...DEFAULT_VAD_OPTIONS, ...options };
  }

  reset(): void {
    this.hangover = 0;
    this.speaking = false;
  }

  /** Classifies one frame and reports run transitions. */
  push(frame: Float32Array): VadEvent {
    const energy = frameEnergy(frame);
    const speech = energy >= this.options.speechThreshold;

    let started = false;
    let ended = false;

    if (speech) {
      this.hangover = 0;
      if (!this.speaking) {
        this.speaking = true;
        started = true;
      }
    } else if (this.speaking) {
      this.hangover += 1;
      if (this.hangover >= this.options.hangoverFrames) {
        this.speaking = false;
        this.hangover = 0;
        ended = true;
      }
    }

    return { speech: this.speaking, started, ended, energy };
  }
}

/* ------------------------------------------------------------------ */
/* 2. Short speech windows                                            */
/* ------------------------------------------------------------------ */

export interface WindowingOptions {
  sampleRate: number;
  /** Target window length. Windows are cut here unless speech ends first. */
  windowMs: number;
  /** Hard cap so a continuous utterance cannot build an unbounded buffer. */
  maxWindowMs: number;
}

export const DEFAULT_WINDOWING: Omit<WindowingOptions, "sampleRate"> = {
  windowMs: 4_000,
  maxWindowMs: 8_000,
};

/**
 * Buffers speech frames into bounded windows.
 *
 * A window is emitted when the utterance ends or when it reaches `maxWindowMs`.
 * The `final` flag tells the consumer whether more speech may still extend it,
 * which keeps the risk engine able to revise its own earlier reads.
 */
export class SpeechWindower {
  private buffer: Float32Array[] = [];
  private bufferedSamples = 0;
  private readonly options: WindowingOptions;

  constructor(options: WindowingOptions) {
    this.options = options;
  }

  reset(): void {
    this.buffer = [];
    this.bufferedSamples = 0;
  }

  get bufferedMs(): number {
    return (this.bufferedSamples / this.options.sampleRate) * 1000;
  }

  push(frame: Float32Array, speechActive: boolean): SpeechWindow[] {
    const out: SpeechWindow[] = [];
    if (speechActive && frame.length > 0) {
      this.buffer.push(frame);
      this.bufferedSamples += frame.length;
    }

    const maxSamples = Math.floor((this.options.maxWindowMs / 1000) * this.options.sampleRate);
    const targetSamples = Math.floor((this.options.windowMs / 1000) * this.options.sampleRate);

    if (this.bufferedSamples >= maxSamples || (!speechActive && this.bufferedSamples > 0)) {
      const complete = this.bufferedSamples >= targetSamples || !speechActive;
      out.push({
        samples: this.flatten(),
        durationMs: this.bufferedMs,
        final: complete && this.bufferedSamples < maxSamples,
      });
      this.reset();
    }
    return out;
  }

  private flatten(): Float32Array {
    const out = new Float32Array(this.bufferedSamples);
    let offset = 0;
    for (const chunk of this.buffer) {
      out.set(chunk, offset);
      offset += chunk.length;
    }
    return out;
  }
}

export interface SpeechWindow {
  samples: Float32Array;
  durationMs: number;
  /** True when no further speech will extend this window. */
  final: boolean;
}

/* ------------------------------------------------------------------ */
/* 3. Streaming STT                                                    */
/* ------------------------------------------------------------------ */

/**
 * Transcribes one short window.
 *
 * Implementations must be incremental: they return only the text for the given
 * window, and must not retain raw audio after resolving.
 */
export type TranscribeWindow = (window: SpeechWindow) => Promise<string>;

/* ------------------------------------------------------------------ */
/* 4. Incremental risk engine                                         */
/* ------------------------------------------------------------------ */

export interface RiskSignal {
  name:
    | "urgency"
    | "pressure"
    | "financial_request"
    | "secrecy"
    | "impersonation"
    | "suspicious_instructions"
    | "coercion"
    | "authority_pressure";
  evidence: string;
  weight: number;
}

export interface RiskAssessment {
  score: number;
  signals: RiskSignal[];
  reasoning: string;
}

export const RISK_THRESHOLD = 70;

/**
 * Local, deterministic risk signals over a transcript window.
 *
 * This is intentionally keyword/pattern based rather than an LLM call: the
 * pipeline needs per-window latency in the low seconds, and a model round trip
 * per window would make the call lag behind the conversation. `analyzeWindow`
 * can be swapped for a server-backed analyser without changing the pipeline.
 */
export function analyzeWindow(transcript: string): RiskAssessment {
  const text = transcript.toLowerCase();
  const signals: RiskSignal[] = [];

  const add = (name: RiskSignal["name"], pattern: RegExp, evidence: string, weight: number) => {
    const match = text.match(pattern);
    if (match) signals.push({ name, evidence: match[0], weight });
  };

  add("urgency", /\b(right now|immediately|quickly|asap|don't (?:waste|dismiss)|hurry)\b/, "time pressure", 18);
  add(
    "financial_request",
    /\b(send (?:me )?(?:the )?money|wire (?:the )?money|transfer (?:funds|money)|gift cards?|bitcoin|crypto|bank (?:account|details)|your pin)\b/,
    "money or credentials requested",
    34,
  );
  add(
    "secrecy",
    /\b(don'?t (?:tell|say|mention)|keep this (?:secret|between)|do not (?:hang up|end the call)|stay on the (?:line|call))\b/,
    "isolation from the user's normal contacts",
    26,
  );
  add(
    "authority_pressure",
    /\b(police|court|irs|hmrc|bank|government|investigat\w+).{0,40}\b(money|payment|arrest|penalty)\b/,
    "authority invoked to demand payment",
    24,
  );
  add(
    "impersonation",
    /\b(this is .{0,24}(?:calling|here)|speaking (?:is|with) .{0,20}(?:support|security|bank))\b/,
    "identity asserted rather than verified",
    18,
  );
  add(
    "coercion",
    /\b(you (?:must|have to)|don'?t (?:argue|question)|no time to (?:explain|check))\b/,
    "pressure to comply without checking",
    20,
  );
  add(
    "suspicious_instructions",
    /\b(remote access|install (?:this )?(?:app|software)|screen sharing|verification code|one-time password|otp)\b/,
    "instruction to grant device or account access",
    32,
  );

  const score = Math.min(100, signals.reduce((total, signal) => total + signal.weight, 0));
  return {
    score,
    signals,
    reasoning: signals.length
      ? signals.map((signal) => signal.evidence).join("; ")
      : "No pressure signals in this window.",
  };
}

/**
 * Accumulates per-window assessments into a single escalating risk state.
 *
 * Later windows can only raise the score, never lower it, so a risk that was
 * already surfaced cannot be talked away mid-call. `clear` requires an explicit
 * user decision rather than a quiet window.
 */
export class RiskEngine {
  private accumulated: RiskSignal[] = [];

  get score(): number {
    return Math.min(100, this.accumulated.reduce((total, s) => total + s.weight, 0));
  }

  get triggered(): boolean {
    return this.score >= RISK_THRESHOLD;
  }

  /** Folds one window's assessment in. Returns the current combined state. */
  ingest(assessment: RiskAssessment): { score: number; triggered: boolean; signals: RiskSignal[] } {
    for (const signal of assessment.signals) {
      const duplicate = this.accumulated.some(
        (existing) => existing.name === signal.name && existing.evidence === signal.evidence,
      );
      if (!duplicate) this.accumulated.push(signal);
    }
    return { score: this.score, triggered: this.triggered, signals: [...this.accumulated] };
  }

  reset(): void {
    this.accumulated = [];
  }
}

/* ------------------------------------------------------------------ */
/* 5. Pipeline                                                         */
/* ------------------------------------------------------------------ */

export interface PipelineEvents {
  onStateChange?: (state: "clear" | "risk") => void;
  onTranscript?: (text: string, cumulative: boolean) => void;
  onError?: (error: Error) => void;
}

export interface PipelineStats {
  framesReceived: number;
  speechWindows: number;
  transcribedWindows: number;
  failedWindows: number;
  riskScore: number;
}

/**
 * Wires audio → VAD → windows → STT → risk → state.
 *
 * A failed window is counted and reported, never swallowed: a silent failure
 * must not be presented as protection.
 */
export class CallAudioPipeline {
  private readonly vad: VoiceActivityDetector;
  private readonly windower: SpeechWindower;
  private readonly engine = new RiskEngine();
  private running = false;
  private stats: PipelineStats = {
    framesReceived: 0,
    speechWindows: 0,
    transcribedWindows: 0,
    failedWindows: 0,
    riskScore: 0,
  };

  constructor(
    private readonly source: ControllableAudioSource,
    private readonly transcribe: TranscribeWindow,
    private readonly events: PipelineEvents = {},
    private readonly vadOptions: Partial<VadOptions> = {},
  ) {
    assertControllableSource(source);
    this.vad = new VoiceActivityDetector(vadOptions);
    this.windower = new SpeechWindower({
      sampleRate: source.sampleRate,
      ...DEFAULT_WINDOWING,
    });
  }

  get isRunning(): boolean {
    return this.running;
  }

  get currentState(): "clear" | "risk" {
    return this.engine.triggered ? "risk" : "clear";
  }

  get snapshot(): PipelineStats {
    return { ...this.stats, riskScore: this.engine.score };
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.vad.reset();
    this.windower.reset();
    this.engine.reset();
    await this.source.start((frame) => {
      this.handleFrame(frame);
    });
  }

  /** Stops the source and discards every buffer. Raw audio is never retained. */
  async stop(): Promise<void> {
    if (!this.running) return;
    this.running = false;
    this.vad.reset();
    this.windower.reset();
    this.engine.reset();
    await this.source.stop();
  }

  private handleFrame(frame: AudioFrame): void {
    this.stats.framesReceived += 1;
    const event = this.vad.push(frame.data);
    const windows = this.windower.push(frame.data, event.speech);
    if (event.ended) this.windower.push(frame.data, false);

    for (const window of windows) {
      this.stats.speechWindows += 1;
      void this.processWindow(window);
    }
  }

  private async processWindow(window: SpeechWindow): Promise<void> {
    try {
      const text = (await this.transcribe(window)).trim();
      if (!text) return;
      this.stats.transcribedWindows += 1;
      this.events.onTranscript?.(text, window.final);

      const assessment = analyzeWindow(text);
      const combined = this.engine.ingest(assessment);
      this.stats.riskScore = combined.score;
      this.events.onStateChange?.(combined.triggered ? "risk" : "clear");
    } catch (error) {
      this.stats.failedWindows += 1;
      // Surfaced, not hidden: a dropped window means less analysis, and the UI
      // must be able to say so rather than imply a clean call.
      this.events.onError?.(
        error instanceof Error ? error : new Error("Call audio analysis failed."),
      );
    }
  }
}

/** True when Handshake can legitimately analyse audio for the given surface. */
export function audioSurfaceIsAnalysable(surface: "handshake-call" | "carrier-call" | "third-party-call"): boolean {
  return surface === "handshake-call";
}