import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

const TICK_MS = 500;

export interface LiveCode {
  status: "loading" | "ready" | "error";
  code: string;
  secondsRemaining: number;
  periodSeconds: number;
  error: string | null;
}

interface Snapshot {
  code: string;
  remaining: number;
  periodSeconds: number;
  fetchedAt: number;
}

const INITIAL: LiveCode = {
  status: "loading",
  code: "",
  secondsRemaining: 0,
  periodSeconds: 30,
  error: null,
};

/** Fetches the current code once, counts down locally, and re-fetches when the window ends. */
export function useLiveCode(pairId: string): LiveCode & { retry: () => void } {
  const [state, setState] = useState<LiveCode>(INITIAL);
  const snapshotRef = useRef<Snapshot | null>(null);
  const loadingRef = useRef(false);
  const aliveRef = useRef(true);

  const load = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const res = await api.getCurrentCode(pairId);
      if (!aliveRef.current) return;
      snapshotRef.current = {
        code: res.code,
        remaining: res.secondsRemaining,
        periodSeconds: res.periodSeconds,
        fetchedAt: Date.now(),
      };
      setState({
        status: "ready",
        code: res.code,
        secondsRemaining: res.secondsRemaining,
        periodSeconds: res.periodSeconds,
        error: null,
      });
    } catch (error) {
      if (!aliveRef.current) return;
      snapshotRef.current = null;
      setState({
        ...INITIAL,
        status: "error",
        error: error instanceof Error ? error.message : "Could not load the code.",
      });
    } finally {
      loadingRef.current = false;
    }
  }, [pairId]);

  useEffect(() => {
    aliveRef.current = true;
    snapshotRef.current = null;
    setState(INITIAL);
    void load();

    const timer = setInterval(() => {
      const snap = snapshotRef.current;
      if (!snap) return;
      const elapsed = (Date.now() - snap.fetchedAt) / 1000;
      const left = Math.max(0, Math.ceil(snap.remaining - elapsed));
      setState((prev) => (prev.status === "ready" ? { ...prev, secondsRemaining: left } : prev));
      if (left === 0) void load();
    }, TICK_MS);

    return () => {
      aliveRef.current = false;
      clearInterval(timer);
    };
  }, [load]);

  const retry = useCallback(() => {
    setState(INITIAL);
    void load();
  }, [load]);

  return { ...state, retry };
}
