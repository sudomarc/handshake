/**
 * Unit tests for mobile helper modules and utility functions.
 *
 * Covers permissions banner evaluation, QR invite URL parsing,
 * pending invite storage/retrieval, and trust relation state calculation.
 */

import assert from "node:assert/strict";
import { test, describe } from "node:test";
import { needsPermissionBanner } from "../mobile/lib/permissions";
import { parsePairInvite, relationState, CircleDevice } from "../mobile/lib/trust/api";
import {
  storePendingInvite,
  peekPendingInvite,
  consumePendingInvite,
} from "../mobile/lib/pairing";

describe("mobile/lib/permissions - needsPermissionBanner", () => {
  test("returns false when all required permissions are granted", () => {
    assert.equal(needsPermissionBanner({ notifications: true, readPhoneState: true }), false);
  });

  test("returns true when notifications permission is denied", () => {
    assert.equal(needsPermissionBanner({ notifications: false, readPhoneState: true }), true);
  });

  test("returns true when readPhoneState permission is denied", () => {
    assert.equal(needsPermissionBanner({ notifications: true, readPhoneState: false }), true);
  });

  test("returns true when both permissions are denied", () => {
    assert.equal(needsPermissionBanner({ notifications: false, readPhoneState: false }), true);
  });

  test("returns false when permission state is null (unknown/unpromoted)", () => {
    assert.equal(needsPermissionBanner({ notifications: null, readPhoneState: null }), false);
  });
});

describe("mobile/lib/trust/api - parsePairInvite", () => {
  test("parses custom protocol handshake://pair?invite=...", () => {
    assert.equal(
      parsePairInvite("handshake://pair?invite=0123456789abcdef0123456789abcdef"),
      "0123456789abcdef0123456789abcdef",
    );
  });

  test("parses https web pairing URL https://example.com/pair?invite=...", () => {
    assert.equal(
      parsePairInvite("https://handshake.app/pair?invite=fedcba9876543210fedcba9876543210"),
      "fedcba9876543210fedcba9876543210",
    );
  });

  test("trims whitespace from input and invite ID", () => {
    assert.equal(
      parsePairInvite("  handshake://pair?invite=  abc123456  "),
      "abc123456",
    );
  });

  test("fallback regex parses non-standard deep link strings", () => {
    assert.equal(
      parsePairInvite("custom-scheme/pair?invite=fallback_invite_id"),
      "fallback_invite_id",
    );
  });

  test("returns null for invalid or missing invite URLs", () => {
    assert.equal(parsePairInvite(null), null);
    assert.equal(parsePairInvite(undefined), null);
    assert.equal(parsePairInvite(""), null);
    assert.equal(parsePairInvite("handshake://other?invite=12345"), null);
    assert.equal(parsePairInvite("handshake://pair"), null);
  });
});

describe("mobile/lib/trust/api - relationState", () => {
  test("returns trusted when circle is authorized and has active non-revoked device", () => {
    const circle = {
      authorized: true,
      devices: [
        {
          deviceId: "dev1",
          label: "Phone",
          enrolledAt: "2026-10-01T00:00:00Z",
          lastSeenAt: null,
          revokedAt: null,
        } as CircleDevice,
      ],
    };
    assert.equal(relationState(circle), "trusted");
  });

  test("returns verify when circle is authorized but all devices are revoked", () => {
    const circle = {
      authorized: true,
      devices: [
        {
          deviceId: "dev1",
          label: "Phone",
          enrolledAt: "2026-10-01T00:00:00Z",
          lastSeenAt: null,
          revokedAt: "2026-10-02T00:00:00Z",
        } as CircleDevice,
      ],
    };
    assert.equal(relationState(circle), "verify");
  });

  test("returns verify when circle is not authorized", () => {
    const circle = {
      authorized: false,
      devices: [
        {
          deviceId: "dev1",
          label: "Phone",
          enrolledAt: "2026-10-01T00:00:00Z",
          lastSeenAt: null,
          revokedAt: null,
        } as CircleDevice,
      ],
    };
    assert.equal(relationState(circle), "verify");
  });
});

describe("mobile/lib/pairing - pending invite store", () => {
  test("stores, peeks, and consumes pending invite ID correctly", () => {
    assert.equal(peekPendingInvite(), null);
    assert.equal(consumePendingInvite(), null);

    storePendingInvite("invite_test_999");
    assert.equal(peekPendingInvite(), "invite_test_999");
    assert.equal(peekPendingInvite(), "invite_test_999"); // peek does not consume

    assert.equal(consumePendingInvite(), "invite_test_999");
    assert.equal(consumePendingInvite(), null); // consume clears state
    assert.equal(peekPendingInvite(), null);
  });
});
