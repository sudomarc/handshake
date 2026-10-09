import assert from "node:assert/strict";
import { test, describe } from "node:test";
import { storePendingInvite, peekPendingInvite, consumePendingInvite } from "../mobile/lib/pairing";
import {
  checkRuntimePermissions,
  requestRuntimePermissions,
  needsPermissionBanner,
} from "../mobile/lib/permissions";
import { classifyPressure, THREAT_PRESSURE_SCORE } from "../mobile/lib/shield/capabilities";
import * as configModule from "../mobile/lib/config";

const config =
  (configModule as unknown as { default?: typeof configModule }).default ?? configModule;

describe("mobile/lib/pairing", () => {
  test("store, peek, and consume pending invite state machine", () => {
    assert.equal(consumePendingInvite(), null);
    assert.equal(peekPendingInvite(), null);

    storePendingInvite("invite_test_123");
    assert.equal(peekPendingInvite(), "invite_test_123");
    assert.equal(peekPendingInvite(), "invite_test_123"); // peek is non-destructive

    const consumed = consumePendingInvite();
    assert.equal(consumed, "invite_test_123");
    assert.equal(peekPendingInvite(), null);
    assert.equal(consumePendingInvite(), null);
  });
});

describe("mobile/lib/permissions", () => {
  test("needsPermissionBanner returns true only when a permission is explicitly denied", () => {
    assert.equal(needsPermissionBanner({ notifications: true, readPhoneState: true }), false);
    assert.equal(needsPermissionBanner({ notifications: false, readPhoneState: true }), true);
    assert.equal(needsPermissionBanner({ notifications: true, readPhoneState: false }), true);
    assert.equal(needsPermissionBanner({ notifications: false, readPhoneState: false }), true);
    assert.equal(needsPermissionBanner({ notifications: null, readPhoneState: null }), false);
  });

  test("checkRuntimePermissions and requestRuntimePermissions return state gracefully", async () => {
    const checkState = await checkRuntimePermissions();
    assert.equal(typeof checkState, "object");
    assert.ok("notifications" in checkState);
    assert.ok("readPhoneState" in checkState);

    const reqState = await requestRuntimePermissions();
    assert.equal(typeof reqState, "object");
    assert.ok("notifications" in reqState);
    assert.ok("readPhoneState" in reqState);
  });
});

describe("mobile/lib/shield/capabilities", () => {
  test("classifyPressure returns threat for high score or high risk level", () => {
    assert.equal(THREAT_PRESSURE_SCORE, 70);

    assert.equal(
      classifyPressure({
        pressureScore: 80,
        riskLevel: "high",
        reasoning: "Urgent wire request",
      }),
      "threat",
    );

    assert.equal(
      classifyPressure({
        pressureScore: 70,
        riskLevel: "medium",
        reasoning: "Score at threshold",
      }),
      "threat",
    );

    assert.equal(
      classifyPressure({
        pressureScore: 30,
        riskLevel: "high",
        reasoning: "Risk level high override",
      }),
      "threat",
    );

    assert.equal(
      classifyPressure({
        pressureScore: 10,
        riskLevel: "low",
        reasoning: "Routine call",
      }),
      "clear",
    );
  });
});

describe("mobile/lib/config", () => {
  test("exposes valid request timeout and null or string API_BASE_URL", () => {
    assert.equal(config.REQUEST_TIMEOUT_MS, 30000);
    assert.ok(config.API_BASE_URL === null || typeof config.API_BASE_URL === "string");
  });
});
