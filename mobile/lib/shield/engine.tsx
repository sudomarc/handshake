import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePairs } from "@/hooks/usePairs";
import {
  checkTranscript,
  createPersonalQuestion,
  type TranscriptCheck,
} from "@/lib/shield/capabilities";
import type { ChallengeResponse } from "@/lib/apiTypes";
import { callOverlayManager } from "@/lib/callOverlay";

export type ShieldStatus = "safe" | "analyzing" | "threat" | "escalated";
export type EscalationOutcome = "pass" | "fail";

export interface ShieldState {
  status: ShieldStatus;
  transcript: string;
  checking: boolean;
  check: TranscriptCheck | null;
  error: string | null;
  challenge: ChallengeResponse | null;
  challengeLoading: boolean;
  challengeError: string | null;
  escalationOutcome: EscalationOutcome | null;
}

export interface ShieldApi extends ShieldState {
  setTranscript: (value: string) => void;
  startAnalysis: () => void;
  submitTranscript: () => Promise<void>;
  resolveEscalation: (outcome: EscalationOutcome) => void;
  reset: () => void;
}

const INITIAL: ShieldState = {
  status: "safe",
  transcript: "",
  checking: false,
  check: null,
  error: null,
  challenge: null,
  challengeLoading: false,
  challengeError: null,
  escalationOutcome: null,
};

const ShieldContext = createContext<ShieldApi | null>(null);

function messageOf(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function ShieldProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ShieldState>(INITIAL);
  const { activePair, pairs } = usePairs();
  const runRef = useRef(0);

  const setTranscript = useCallback((value: string) => {
    setState((prev) => ({ ...prev, transcript: value, error: null }));
  }, []);

  const startAnalysis = useCallback(() => {
    runRef.current += 1;
    setState((prev) => ({
      ...INITIAL,
      status: "analyzing",
    }));
  }, []);

  const reset = useCallback(() => {
    runRef.current += 1;
    setState(() => ({ ...INITIAL }));
  }, []);

  const escalate = useCallback(
    (run: number) => {
      const pair = activePair ?? pairs[0] ?? null;
      const pairId = pair?.pairId ?? null;
      if (!pairId) {
        setState((prev) =>
          run === runRef.current && prev.status === "threat"
            ? {
                ...prev,
                challengeLoading: false,
                challengeError: "Add a trusted person to run a personal question.",
              }
            : prev,
        );
        return;
      }
      setState((prev) =>
        run === runRef.current && prev.status === "threat"
          ? { ...prev, challengeLoading: true, challengeError: null }
          : prev,
      );
      if (!pair?.privateContext?.trim()) {
        setState((prev) =>
          run === runRef.current && prev.status === "threat"
            ? {
                ...prev,
                challengeLoading: false,
                challengeError: "Add a private verification detail for this person first.",
              }
            : prev,
        );
        return;
      }
      createPersonalQuestion(pairId, pair.privateContext.trim())
        .then((challenge) => {
          setState((prev) =>
            run === runRef.current && prev.status === "threat"
              ? { ...prev, status: "escalated", challenge, challengeLoading: false }
              : prev,
          );
        })
        .catch((error: unknown) => {
          setState((prev) =>
            run === runRef.current && prev.status === "threat"
              ? {
                  ...prev,
                  challengeLoading: false,
                  challengeError: messageOf(error, "Could not create a personal question."),
                }
              : prev,
          );
        });
    },
    [activePair?.pairId, pairs],
  );

  const submitTranscript = useCallback(async () => {
    const run = runRef.current;
    const transcript = state.transcript.trim();
    if (!transcript) {
      setState((prev) => ({ ...prev, error: "Type what they said." }));
      return;
    }
    setState((prev) =>
      prev.status === "analyzing" ? { ...prev, checking: true, error: null, check: null } : prev,
    );
    try {
      const check = await checkTranscript(transcript, activePair?.pairId);
      if (run !== runRef.current) return;
      if (check.verdict === "clear") {
        setState((prev) => (run === runRef.current ? { ...prev, checking: false, check } : prev));
        return;
      }
      setState((prev) =>
        run === runRef.current ? { ...prev, checking: false, check, status: "threat" } : prev,
      );
      void callOverlayManager
        .showRisk(
          "Suspicious interaction",
          check.result.reasoning || "Handshake detected meaningful social-engineering risk signals.",
        )
        .catch(() => {
          // The in-app shield remains authoritative if cross-app overlay permission is unavailable.
        });
      escalate(run);
    } catch (error) {
      setState((prev) =>
        run === runRef.current
          ? { ...prev, checking: false, error: messageOf(error, "The check failed. Try again.") }
          : prev,
      );
    }
  }, [state.transcript, activePair?.pairId, escalate]);

  const resolveEscalation = useCallback((outcome: EscalationOutcome) => {
    setState((prev) =>
      prev.status === "escalated" ? { ...prev, escalationOutcome: outcome } : prev,
    );
  }, []);

  const value = useMemo<ShieldApi>(
    () => ({
      ...state,
      setTranscript,
      startAnalysis,
      submitTranscript,
      resolveEscalation,
      reset,
    }),
    [
      state,
      primaryLabel,
      setTranscript,
      startAnalysis,
      submitTranscript,
      resolveEscalation,
      reset,
    ],
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
