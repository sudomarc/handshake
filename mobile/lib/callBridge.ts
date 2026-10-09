/**
 * JS consumer of the native call-state events.
 *
 * The Android overlay module (`NativeModules.HandshakeOverlay`) emits RN events
 * named `HandshakeCallState` with a payload of `{ state: "ringing" | "active" |
 * "idle" }` (and optionally `at`). This module is the only place that knows the
 * native event naming; callers subscribe through `subscribeCallState` so the
 * rest of the app never touches `NativeEventEmitter` directly.
 *
 * The native module is a work-in-progress, so everything here is defensive:
 * a missing module yields a no-op unsubscribe, and every payload is validated
 * at the boundary before it reaches app code (native input is untrusted).
 */

import { NativeEventEmitter, NativeModules, Platform } from "react-native";

// The constructor's expected module type is the internal NativeModule shape;
// my dynamic module typing needs the double cast to satisfy it.
type EmitterModule = ConstructorParameters<typeof NativeEventEmitter>[0];

export type HandshakeCallStateValue = "ringing" | "active" | "idle";

export interface HandshakeCallStatePayload {
  state: HandshakeCallStateValue;
  at?: number;
}

type HandshakeOverlayNativeModule = {
  /** Present on Android builds that include the overlay service. */
  startProtection?: () => Promise<boolean>;
  /** Retry call-state listener registration after runtime permission grant. */
  retryCallStateRegistration?: () => Promise<boolean>;
  [key: string]: unknown;
};

let emitter: NativeEventEmitter | null = null;

function getEmitter(): NativeEventEmitter | null {
  if (Platform.OS !== "android") return null;
  const module = NativeModules.HandshakeOverlay as
    | HandshakeOverlayNativeModule
    | undefined;
  if (!module) return null;
  if (!emitter) {
    try {
      emitter = new NativeEventEmitter(module as unknown as EmitterModule);
    } catch {
      // The module exists but is not usable as an emitter; treat as absent.
      return null;
    }
  }
  return emitter;
}

/**
 * Subscribes to native call-state events.
 *
 * Returns an unsubscribe function. Safe to call on any platform and in any
 * build: when the native module is missing the returned unsubscribe is a no-op.
 */
export function subscribeCallState(
  handler: (payload: HandshakeCallStatePayload) => void,
): () => void {
  const currentEmitter = getEmitter();
  if (!currentEmitter) return () => {};

  const subscription = currentEmitter.addListener(
    "HandshakeCallState",
    (payload: unknown) => {
      if (!isValidPayload(payload)) return;
      const normalized = payload as { state: HandshakeCallStateValue; at?: number };
      handler({ state: normalized.state, at: normalized.at });
    },
  );

  return () => {
    subscription.remove();
  };
}

function isValidPayload(payload: unknown): payload is { state: HandshakeCallStateValue } {
  if (typeof payload !== "object" || payload === null) return false;
  const candidate = payload as { state?: unknown };
  return (
    candidate.state === "ringing" ||
    candidate.state === "active" ||
    candidate.state === "idle"
  );
}

/**
 * Retries native call-state listener registration after READ_PHONE_STATE grant.
 * Returns true if the listener is now active, false if still unavailable.
 */
export async function retryCallStateRegistration(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  const module = NativeModules.HandshakeOverlay as
    | HandshakeOverlayNativeModule
    | undefined;
  if (!module?.retryCallStateRegistration) return false;
  try {
    return await module.retryCallStateRegistration();
  } catch {
    return false;
  }
}