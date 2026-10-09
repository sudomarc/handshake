/**
 * Mobile permission & overlay intent tests.
 *
 * Covers runtime permission state evaluation logic, non-Android platform
 * fallback behavior, and overlay intent action consumption.
 */

import assert from "node:assert/strict";
import { test, describe } from "node:test";
import {
  needsPermissionBanner,
  checkRuntimePermissions,
  requestRuntimePermissions,
  type RuntimePermissionState,
} from "../mobile/lib/permissions";
import { consumeOverlayAction } from "../mobile/lib/overlayIntent";

describe("mobile permission utilities", () => {
  describe("needsPermissionBanner", () => {
    test("returns false when both permissions are granted", () => {
      const state: RuntimePermissionState = { notifications: true, readPhoneState: true };
      assert.equal(needsPermissionBanner(state), false);
    });

    test("returns true when notifications permission is denied", () => {
      const state: RuntimePermissionState = { notifications: false, readPhoneState: true };
      assert.equal(needsPermissionBanner(state), true);
    });

    test("returns true when readPhoneState permission is denied", () => {
      const state: RuntimePermissionState = { notifications: true, readPhoneState: false };
      assert.equal(needsPermissionBanner(state), true);
    });

    test("returns true when both permissions are denied", () => {
      const state: RuntimePermissionState = { notifications: false, readPhoneState: false };
      assert.equal(needsPermissionBanner(state), true);
    });

    test("returns false when permission state is unknown or loading (null)", () => {
      const state: RuntimePermissionState = { notifications: null, readPhoneState: null };
      assert.equal(needsPermissionBanner(state), false);
    });

    test("returns true if one permission is denied and the other is null", () => {
      const state1: RuntimePermissionState = { notifications: false, readPhoneState: null };
      assert.equal(needsPermissionBanner(state1), true);

      const state2: RuntimePermissionState = { notifications: null, readPhoneState: false };
      assert.equal(needsPermissionBanner(state2), true);
    });
  });

  describe("checkRuntimePermissions & requestRuntimePermissions non-Android fallback", () => {
    test("checkRuntimePermissions returns true/true for non-Android platform", async () => {
      const result = await checkRuntimePermissions();
      assert.deepEqual(result, { notifications: true, readPhoneState: true });
    });

    test("requestRuntimePermissions returns true/true for non-Android platform", async () => {
      const result = await requestRuntimePermissions();
      assert.deepEqual(result, { notifications: true, readPhoneState: true });
    });
  });

  describe("consumeOverlayAction", () => {
    test("returns null when overlay action is empty or unhandled", async () => {
      const action = await consumeOverlayAction();
      assert.equal(action, null);
    });
  });
});
