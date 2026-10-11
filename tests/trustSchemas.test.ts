/**
 * Tests for lib/trustSchemas.ts
 *
 * Verifies schema parsing and boundary validation for:
 * - Device IDs, secrets, nonces, session IDs, and proofs
 * - Enrollment requests & responses
 * - Pairing invitations (create, accept, confirm)
 * - Call sessions (open, join, status query, trust state enum)
 * - Circle status queries
 * - Revocation requests
 */

import assert from "node:assert/strict";
import { test, describe } from "node:test";
import {
  pairIdSchema,
  deviceIdSchema,
  deviceSecretSchema,
  nonceSchema,
  sessionIdSchema,
  hexProofSchema,
  displayNameSchema,
  enrollDeviceRequestSchema,
  enrollDeviceResponseSchema,
  createInviteRequestSchema,
  createInviteResponseSchema,
  getInviteResponseSchema,
  acceptInviteRequestSchema,
  acceptInviteResponseSchema,
  confirmInviteRequestSchema,
  confirmInviteResponseSchema,
  openSessionRequestSchema,
  openSessionResponseSchema,
  joinSessionRequestSchema,
  trustStateSchema,
  joinSessionResponseSchema,
  getSessionQuerySchema,
  sessionStatusResponseSchema,
  circleStatusQuerySchema,
  circleStatusResponseSchema,
  revokeDeviceRequestSchema,
  revokeDeviceResponseSchema,
} from "../lib/trustSchemas";

const VALID_PAIR_ID = "a1b2c3d4e5f60718293a4b5c6d7e8f90";
const VALID_DEVICE_ID = "11223344556677889900aabbccddeeff";
const VALID_SECRET = "1".repeat(64);
const VALID_NONCE = "d".repeat(32);
const VALID_SESSION_ID = "e".repeat(32);
const VALID_PROOF = "f".repeat(64);
const ISO_DATE = "2026-10-11T12:00:00.000Z";

describe("lib/trustSchemas basic types", () => {
  test("pairIdSchema requires 32 hex chars", () => {
    assert.equal(pairIdSchema.safeParse(VALID_PAIR_ID).success, true);
    assert.equal(pairIdSchema.safeParse("not-hex").success, false);
    assert.equal(pairIdSchema.safeParse("1234").success, false);
    assert.equal(pairIdSchema.safeParse(VALID_PAIR_ID + "a").success, false);
  });

  test("deviceIdSchema requires 32 hex chars", () => {
    assert.equal(deviceIdSchema.safeParse(VALID_DEVICE_ID).success, true);
    assert.equal(deviceIdSchema.safeParse("invalid").success, false);
  });

  test("deviceSecretSchema requires 64 hex chars", () => {
    assert.equal(deviceSecretSchema.safeParse(VALID_SECRET).success, true);
    assert.equal(deviceSecretSchema.safeParse("shortsecret").success, false);
  });

  test("nonceSchema & sessionIdSchema require 32 hex chars", () => {
    assert.equal(nonceSchema.safeParse(VALID_NONCE).success, true);
    assert.equal(sessionIdSchema.safeParse(VALID_SESSION_ID).success, true);
  });

  test("hexProofSchema requires 64 hex chars", () => {
    assert.equal(hexProofSchema.safeParse(VALID_PROOF).success, true);
  });

  test("displayNameSchema requires 1..60 non-empty characters", () => {
    assert.equal(displayNameSchema.safeParse("Alice").success, true);
    assert.equal(displayNameSchema.safeParse("   ").success, false);
    assert.equal(displayNameSchema.safeParse("a".repeat(61)).success, false);
  });
});

describe("enrollment schemas", () => {
  test("enrollDeviceRequestSchema accepts valid enrollment payload", () => {
    const valid = {
      pairId: VALID_PAIR_ID,
      deviceId: VALID_DEVICE_ID,
      deviceSecret: VALID_SECRET,
      label: "Alice's Phone",
    };
    assert.equal(enrollDeviceRequestSchema.safeParse(valid).success, true);
  });

  test("enrollDeviceResponseSchema accepts valid enrollment response", () => {
    const valid = {
      pairId: VALID_PAIR_ID,
      deviceId: VALID_DEVICE_ID,
      enrolledAt: ISO_DATE,
      label: "Alice's Phone",
    };
    assert.equal(enrollDeviceResponseSchema.safeParse(valid).success, true);
  });
});

describe("pairing invitation schemas", () => {
  test("createInviteRequestSchema & createInviteResponseSchema", () => {
    assert.equal(createInviteRequestSchema.safeParse({ displayName: "Bob" }).success, true);

    const validRes = {
      inviteId: VALID_NONCE,
      displayName: "Bob",
      expiresAt: ISO_DATE,
      url: `handshake://pair?invite=${VALID_NONCE}`,
    };
    assert.equal(createInviteResponseSchema.safeParse(validRes).success, true);
  });

  test("getInviteResponseSchema handles pending and confirmed states", () => {
    const pending = {
      inviteId: VALID_NONCE,
      displayName: "Alice",
      peerName: null,
      state: "pending",
      createdAt: ISO_DATE,
      expiresAt: ISO_DATE,
    };
    assert.equal(getInviteResponseSchema.safeParse(pending).success, true);

    const confirmed = {
      ...pending,
      peerName: "Bob",
      state: "confirmed",
      pairId: VALID_PAIR_ID,
    };
    assert.equal(getInviteResponseSchema.safeParse(confirmed).success, true);
  });

  test("acceptInviteRequestSchema & acceptInviteResponseSchema", () => {
    const req = {
      displayName: "Bob",
      deviceId: VALID_DEVICE_ID,
      deviceSecret: VALID_SECRET,
      label: "Bob Phone",
    };
    assert.equal(acceptInviteRequestSchema.safeParse(req).success, true);

    const res = {
      inviteId: VALID_NONCE,
      displayName: "Alice",
      peerName: "Bob",
      state: "accepted",
      pairId: VALID_PAIR_ID,
      deviceId: VALID_DEVICE_ID,
      enrolledAt: ISO_DATE,
    };
    assert.equal(acceptInviteResponseSchema.safeParse(res).success, true);
  });

  test("confirmInviteRequestSchema & confirmInviteResponseSchema", () => {
    const req = {
      pairId: VALID_PAIR_ID,
      deviceId: VALID_DEVICE_ID,
      deviceSecret: VALID_SECRET,
    };
    assert.equal(confirmInviteRequestSchema.safeParse(req).success, true);

    const res = {
      state: "confirmed",
      pairId: VALID_PAIR_ID,
    };
    assert.equal(confirmInviteResponseSchema.safeParse(res).success, true);
  });
});

describe("call session schemas", () => {
  test("trustStateSchema allows only unverified and trusted", () => {
    assert.equal(trustStateSchema.safeParse("unverified").success, true);
    assert.equal(trustStateSchema.safeParse("trusted").success, true);
    assert.equal(trustStateSchema.safeParse("protected").success, false);
    assert.equal(trustStateSchema.safeParse("partially_trusted").success, false);
  });

  test("openSessionRequestSchema & openSessionResponseSchema", () => {
    const req = {
      pairId: VALID_PAIR_ID,
      deviceId: VALID_DEVICE_ID,
      nonce: VALID_NONCE,
      issuedAt: 1700000000000,
      proof: VALID_PROOF,
    };
    assert.equal(openSessionRequestSchema.safeParse(req).success, true);

    const res = {
      sessionId: VALID_SESSION_ID,
      pairId: VALID_PAIR_ID,
      challengeNonce: VALID_NONCE,
      openedByDeviceId: VALID_DEVICE_ID,
      issuedAt: 1700000000000,
      expiresAt: 1700000300000,
      status: "awaiting-peer",
    };
    assert.equal(openSessionResponseSchema.safeParse(res).success, true);
  });

  test("joinSessionRequestSchema & joinSessionResponseSchema", () => {
    const req = {
      sessionId: VALID_SESSION_ID,
      deviceId: VALID_DEVICE_ID,
      nonce: VALID_NONCE,
      issuedAt: 1700000000000,
      proof: VALID_PROOF,
    };
    assert.equal(joinSessionRequestSchema.safeParse(req).success, true);

    const res = {
      sessionId: VALID_SESSION_ID,
      pairId: VALID_PAIR_ID,
      state: "trusted",
      peerDeviceId: VALID_DEVICE_ID,
      attestation: "attestation-hash",
      issuedAt: 1700000000000,
      expiresAt: 1700000300000,
    };
    assert.equal(joinSessionResponseSchema.safeParse(res).success, true);
  });

  test("getSessionQuerySchema coerces numeric issuedAt", () => {
    const query = {
      deviceId: VALID_DEVICE_ID,
      nonce: VALID_NONCE,
      issuedAt: "1700000000000",
      proof: VALID_PROOF,
    };
    const parsed = getSessionQuerySchema.safeParse(query);
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(typeof parsed.data.issuedAt, "number");
      assert.equal(parsed.data.issuedAt, 1700000000000);
    }
  });

  test("sessionStatusResponseSchema", () => {
    const status = {
      sessionId: VALID_SESSION_ID,
      pairId: VALID_PAIR_ID,
      state: "unverified",
      initiatorDeviceId: VALID_DEVICE_ID,
      peerDeviceId: null,
      attestation: null,
      issuedAt: 1700000000000,
      expiresAt: 1700000300000,
    };
    assert.equal(sessionStatusResponseSchema.safeParse(status).success, true);
  });
});

describe("circle status & revocation schemas", () => {
  test("circleStatusQuerySchema and circleStatusResponseSchema", () => {
    assert.equal(circleStatusQuerySchema.safeParse({}).success, true);

    const response = {
      pairId: VALID_PAIR_ID,
      devices: [
        {
          deviceId: VALID_DEVICE_ID,
          label: "Primary Phone",
          enrolledAt: ISO_DATE,
          lastSeenAt: ISO_DATE,
          revokedAt: null,
        },
      ],
      authorized: true,
    };
    assert.equal(circleStatusResponseSchema.safeParse(response).success, true);
  });

  test("revokeDeviceRequestSchema & revokeDeviceResponseSchema", () => {
    const req = {
      pairId: VALID_PAIR_ID,
      actorDeviceId: VALID_DEVICE_ID,
      actorNonce: VALID_NONCE,
      actorIssuedAt: 1700000000000,
      actorProof: VALID_PROOF,
      targetDeviceId: VALID_DEVICE_ID,
      revokeWholeCircle: true,
    };
    assert.equal(revokeDeviceRequestSchema.safeParse(req).success, true);

    const res = {
      pairId: VALID_PAIR_ID,
      revokedDeviceIds: [VALID_DEVICE_ID],
      revokedAt: ISO_DATE,
    };
    assert.equal(revokeDeviceResponseSchema.safeParse(res).success, true);
  });
});
