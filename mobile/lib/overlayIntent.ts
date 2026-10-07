import { NativeModules } from "react-native";

/**
 * Reads the launch-intent extra that the Android overlay attaches when the user
 * taps a call-time action.
 *
 * `HandshakeOverlayModule.consumeOverlayAction()` reads and clears a pending
 * action that `MainActivity` captured from `onCreate`/`onNewIntent`. Consuming
 * is one-shot so a configuration change cannot replay a stale action.
 */
type OverlayIntentModule = {
  consumeOverlayAction: () => Promise<string | null>;
};

const nativeOverlay = NativeModules.HandshakeOverlay as OverlayIntentModule | undefined;

export async function consumeOverlayAction(): Promise<string | null> {
  if (!nativeOverlay?.consumeOverlayAction) return null;
  try {
    return await nativeOverlay.consumeOverlayAction();
  } catch {
    return null;
  }
}