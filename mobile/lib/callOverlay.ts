import { NativeModules, Platform, Linking } from "react-native";
import type { CallState } from "@/lib/trust/callState";

type OverlayModule = {
  canDrawOverlays: () => Promise<boolean>;
  openOverlaySettings: () => Promise<boolean>;
  startProtection: () => Promise<boolean>;
  setCallState: (state: CallState, detail: string) => Promise<boolean>;
  showRisk: (title: string, message: string) => Promise<boolean>;
  stopProtection: () => Promise<boolean>;
};

const nativeOverlay = NativeModules.HandshakeOverlay as OverlayModule | undefined;

class CallOverlayManager {
  get available(): boolean {
    return Platform.OS === "android" && !!nativeOverlay;
  }

  async canDrawOverlays(): Promise<boolean> {
    if (!this.available || !nativeOverlay) return false;
    return nativeOverlay.canDrawOverlays();
  }

  async openSettings(): Promise<void> {
    if (this.available && nativeOverlay) {
      await nativeOverlay.openOverlaySettings();
      return;
    }
    await Linking.openSettings();
  }

  async startProtection(): Promise<boolean> {
    if (!this.available || !nativeOverlay) {
      throw new Error("Cross-app protection is only available in the Android build.");
    }
    return nativeOverlay.startProtection();
  }

  /**
   * Publishes the current call state to the overlay.
   *
   * `state` must come from `deriveCallState`; this layer does no deciding of its
   * own. There is no `protected` argument, which is what makes it impossible to
   * reintroduce the "Handshake Protected" claim from the call path.
   */
  async setCallState(state: CallState, detail: string): Promise<boolean> {
    if (!this.available || !nativeOverlay) return false;
    return nativeOverlay.setCallState(state, detail);
  }

  async showRisk(title: string, message: string): Promise<boolean> {
    if (!this.available || !nativeOverlay) {
      throw new Error("Cross-app protection is only available in the Android build.");
    }
    return nativeOverlay.showRisk(title, message);
  }

  async stopProtection(): Promise<boolean> {
    if (!this.available || !nativeOverlay) return false;
    return nativeOverlay.stopProtection();
  }
}

export const callOverlayManager = new CallOverlayManager();