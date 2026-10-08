import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { TranscriptCheck } from "@/lib/shield/capabilities";
import { callOverlayManager } from "@/lib/callOverlay";

/**
 * In-call risk state.
 *
 * The shield no longer runs a manual "check a call" transcript flow. That entry
 * point has been removed from the product UX, because two competing models —
 * manual transcript checking and automatic call analysis — cannot both be the
 * primary architecture.
 *
 * What remains is the *sink* for automatic analysis: whatever produces
 * incremental risk assessments for a call Handshake controls (see
 * `lib/audio/pipeline.ts`) reports into this engine, and the engine maps the
 * result to the single user-facing call state. There is currently no production
 * source of those assessments on Android, so `status` stays `idle` until a
 * Handshake-controlled audio surface exists. That is the honest state, and it is
 * why the overlay can never claim "Protected" on its own.
 */
export type ShieldStatus = "idle" | "risk";

export interface ShieldState {
  status: ShieldStatus;
  /** Latest incremental assessment, for the in-app surface. */
  check: TranscriptCheck | null;
  /** Whether Handshake currently has analysable audio for this call. */
  audioAnalysable: boolean;
  /** Reason analysis is unavailable, when it is. */
  unavailableReason: string | null;
}

export interface ShieldApi extends ShieldState {
  /** Called by the in-call audio pipeline for each analysed window. */
  reportRisk: (assessment: TranscriptCheck) => void;
  /** Marks a Handshake-controlled call as live so analysis can start. */
  setAudioAnalysable: (analysable: boolean, reason?: string) => void;
  /** Clears all call-time state; called when the call ends. */
  reset: () => void;
}

const INITIAL: ShieldState = {
  status: "idle",
  check: null,
  audioAnalysable: false,
  unavailableReason: null,
};

const ShieldContext = createContext<ShieldApi | null>(null);

export function ShieldProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ShieldState>(INITIAL);
  const runRef = useRef(0);

  const reportRisk = useCallback(
    (assessment: TranscriptCheck) => {
      const run = runRef.current;
      setState((prev) =>
        run === runRef.current && assessment.verdict === "threat"
          ? { ...prev, status: "risk", check: assessment }
          : prev,
      );
      if (assessment.verdict !== "threat") return;
      void callOverlayManager
        .showRisk(
          "Risk detected",
          assessment.result.reasoning ||
            "Handshake detected pressure tactics during this call.",
        )
        .catch(() => {
          // The overlay permission may be unavailable; in-app state stays authoritative.
        });
    },
    [],
  );

  const setAudioAnalysable = useCallback((analysable: boolean, reason?: string) => {
    setState((prev) => ({
      ...prev,
      audioAnalysable: analysable,
      unavailableReason: analysable ? null : reason ?? null,
    }));
  }, []);

  const reset = useCallback(() => {
    runRef.current += 1;
    setState({ ...INITIAL });
  }, []);

  const value = useMemo<ShieldApi>(
    () => ({ ...state, reportRisk, setAudioAnalysable, reset }),
    [state, reportRisk, setAudioAnalysable, reset],
  );

  return <ShieldContext.Provider value={value}>{children}</ShieldContext.Provider>;
}

export function useShield(): ShieldApi {
  const value = useContext(ShieldContext);
  if (!value) {
    throw new Error("useShield must be used inside ShieldProvider");
  }
  return value;
}