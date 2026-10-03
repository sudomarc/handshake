"use client";

import { useEffect, useState } from "react";
import { currentCodeResponseSchema } from "@/lib/schemas";

export type LiveCodeState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; code: string; secondsLeft: number };

const GENERIC_ERROR = "We couldn't load the code. Check your connection.";
const REFRESH_EVERY_MS = 10_000;

type Snapshot = { code: string; remaining: number; at: number; fetchedAt: number };

/** Server-anchored countdown: the browser clock is never trusted, only elapsed time. */
export function useLiveCode(pairId: string): LiveCodeState {
  const [state, setState] = useState<LiveCodeState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;
    let snapshot: Snapshot | null = null;

    async function load() {
      if (inFlight) return;
      inFlight = true;
      try {
        const res = await fetch(`/api/code/current?pairId=${encodeURIComponent(pairId)}`, {
          cache: "no-store",
        });
        const json: unknown = await res.json();
        if (!res.ok) {
          const message =
            typeof json === "object" && json !== null && "error" in json
              ? String((json as { error: { message?: unknown } }).error?.message ?? GENERIC_ERROR)
              : GENERIC_ERROR;
          throw new Error(message);
        }
        const data = currentCodeResponseSchema.parse(json);
        const now = performance.now();
        snapshot = { code: data.code, remaining: data.secondsRemaining, at: now, fetchedAt: now };
        if (!cancelled) tick();
      } catch (error) {
        if (!cancelled && !snapshot) {
          setState({
            status: "error",
            message: error instanceof Error && error.message ? error.message : GENERIC_ERROR,
          });
        }
      } finally {
        inFlight = false;
      }
    }

    function tick() {
      if (!snapshot || cancelled) return;
      const now = performance.now();
      const left = Math.max(0, Math.ceil(snapshot.remaining - (now - snapshot.at) / 1000));
      setState({ status: "ready", code: snapshot.code, secondsLeft: left });
      if (left === 0 || now - snapshot.fetchedAt > REFRESH_EVERY_MS) void load();
    }

    void load();
    const timer = setInterval(tick, 500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [pairId]);

  return state;
}
