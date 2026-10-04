import { useEffect, useState, useCallback, useRef } from "react";

const REFRESH_EVERY_MS = 10_000;
const TICK_INTERVAL_MS = 500;

type LiveCodeState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      code: string;
      secondsRemaining: number;
      periodSeconds: number;
      windowStart: number;
    };

interface Snapshot {
  code: string;
  remaining: number;
  windowStart: number;
  periodSeconds: number;
  fetchedAt: number;
}

interface UseLiveCodeResult {
  status: "loading" | "error" | "ready";
  code: string;
  secondsRemaining: number;
  periodSeconds: number;
  windowStart: number;
  error: string | null;
}

export function useLiveCode(pairId: string) {
  const [state, setState] = useState<{
    status: "loading" | "error" | "ready";
    code: string;
    secondsRemaining: number;
    periodSeconds: number;
    windowStart: number;
    error: string | null;
  }>({
    status: "loading",
    code: "000000",
    secondsRemaining: 0,
    periodSeconds: 30,
    windowStart: 0,
    error: null,
  });

  const cancelledRef = useRef(false);
  const snapshotRef = useRef<{
    code: string;
    remaining: number;
    windowStart: number;
    periodSeconds: number;
    fetchedAt: number;
  } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://192.168.100.35:3000"}/api/code/current?pairId=${encodeURIComponent(pairId)}`,
        {
          cache: "no-store",
        },
      );
      if (!res.ok) throw new Error("Failed to load code");
      const json = await res.json();
      if (json.code && json.secondsRemaining !== undefined) {
        return {
          code: json.code,
          remaining: json.secondsRemaining,
          windowStart: json.windowStart,
          periodSeconds: json.periodSeconds,
          fetchedAt: Date.now(),
        };
      }
    } catch (error) {
      if (error instanceof Error) {
        return { error: error.message };
      }
      return { error: "Failed to load code" };
    }
    return null;
  }, [pairId]);

  const tick = useCallback(() => {
    const snapshot = snapshotRef.current;
    if (!snapshot) return;
    const now = Date.now();
    const elapsed = (now - snapshot.fetchedAt) / 1000;
    const left = Math.max(0, Math.ceil(snapshot.remaining - elapsed));
    setState({
      status: "ready",
      code: snapshot.code,
      secondsRemaining: left,
      periodSeconds: 30,
      windowStart: snapshot.windowStart,
      error: null,
    });
    if (left === 0) {
      load();
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const snapshot = await fetch(
        `${process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://192.168.100.35:3000"}/api/code/current?pairId=${encodeURIComponent(pairId)}`,
        {
          cache: "no-store",
        },
      );
      if (!res.ok) throw new Error("Failed to load code");
      const json = await res.json();
      if (json.code && json.secondsRemaining !== undefined) {
        return {
          code: json.code,
          remaining: json.secondsRemaining,
          windowStart: json.windowStart,
          periodSeconds: json.periodSeconds,
          fetchedAt: Date.now(),
        };
      }
    } catch (error) {
      if (error instanceof Error) {
        return { error: error.message };
      }
      return { error: "Failed to load code" };
    }
    return null;
  }, [pairId]);

  return {
    status: "loading",
    code: "000000",
    secondsRemaining: 0,
    periodSeconds: 30,
    windowStart: 0,
    error: null,
  };
}
