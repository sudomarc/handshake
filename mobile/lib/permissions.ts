/**
 * Runtime permission handling for call protection.
 *
 * Handshake needs two Android runtime permissions to protect a call:
 *   - POST_NOTIFICATIONS (Android 13+): the foreground protection service runs
 *     behind a notification; without it the service looks like it never started.
 *   - READ_PHONE_STATE: lets the native side observe call state so trust can be
 *     checked automatically when a call starts.
 *
 * Denials are handled gracefully here — nothing throws — and the snapshot is
 * offered to the home surface so the user can retry from a calm banner.
 */

import { PermissionsAndroid, Platform } from "react-native";

export interface RuntimePermissionState {
  /** True when granted (or not needed), false when denied, null when unknown. */
  notifications: boolean | null;
  readPhoneState: boolean | null;
}

const NOTIFICATIONS_RATIONALE =
  "Handshake uses notifications to keep call protection running in the background.";
const PHONE_STATE_RATIONALE =
  "Handshake reads call state so it can check trusted people automatically when a call starts.";

function isAndroid(): boolean {
  return Platform.OS === "android";
}

/** Reads the current grant state without prompting. Never throws. */
export async function checkRuntimePermissions(): Promise<RuntimePermissionState> {
  if (!isAndroid()) return { notifications: true, readPhoneState: true };
  try {
    const [notifications, readPhoneState] = await Promise.all([
      PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS),
      PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE),
    ]);
    return { notifications, readPhoneState };
  } catch {
    // Unavailable in dev shells; report as unknown rather than crashing.
    return { notifications: null, readPhoneState: null };
  }
}

/** Requests both permissions with short rationale text. Never throws. */
export async function requestRuntimePermissions(): Promise<RuntimePermissionState> {
  if (!isAndroid()) return { notifications: true, readPhoneState: true };
  try {
    let notifications: boolean | null = null;
    if (Number(Platform.Version) >= 33) {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        {
          title: "Call protection",
          message: NOTIFICATIONS_RATIONALE,
          buttonPositive: "Allow",
          buttonNegative: "Not now",
        },
      );
      notifications = result === PermissionsAndroid.RESULTS.GRANTED;
    } else {
      // Pre-Android 13 has no runtime notifications permission to request.
      notifications = true;
    }

    const phoneResult = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
      {
        title: "Call protection",
        message: PHONE_STATE_RATIONALE,
        buttonPositive: "Allow",
        buttonNegative: "Not now",
      },
    );
    return { notifications, readPhoneState: phoneResult === PermissionsAndroid.RESULTS.GRANTED };
  } catch {
    return { notifications: null, readPhoneState: null };
  }
}

/** True when the banner should be shown (one of the two is denied). */
export function needsPermissionBanner(state: RuntimePermissionState): boolean {
  return state.notifications === false || state.readPhoneState === false;
}