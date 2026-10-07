import assert from "node:assert/strict";
import { test, describe, beforeEach } from "node:test";
import { ZodError } from "zod";
import {
  derivePairSecret,
  getCurrentCode,
  verifyCode,
} from "../lib/totp";
import {
  consume,
  resetRateLimits,
} from "../lib/rateLimit";
import {
  pairIdSchema,
  sixDigitCodeSchema,
  verdictSchema,
  analysisRequestSchema,
  pressureCheckResponseSchema,
  challengeRequestSchema,
  challengeResponseSchema,
} from "../lib/schemas";
import { createPair, getPair, listPairs } from "../lib/store";
import { handleApiError } from "../lib/http";
import {
  ConfigError,
  NotImplementedError,
  PairNotFoundError,
  RateLimitError,
} from "../lib/errors";
import {
  createCallSessionRequestSchema,
} from "../lib/callSchemas";
import { callSessionStore } from "../lib/callStore";

const TEST_DERIVATION_KEY = "0123456789abcdef0123456789abcdef"; // 32 chars
const VALID_PAIR_ID = "a1b2c3d4e5f60718293a4b5c6d7e8f90";

describe("lib/totp", () => {
  test("derivePairSecret requires a valid PAIR_DERIVATION_KEY", () => {
    const origKey = process.env.PAIR_DERIVATION_KEY;
    try {
      delete process.env.PAIR_DERIVATION_KEY;
      assert.throws(() => derivePairSecret(VALID_PAIR_ID), ConfigError);

      process.env.PAIR_DERIVATION_KEY = "short_key";
      assert.throws(() => derivePairSecret(VALID_PAIR_ID), ConfigError);

      process.env.PAIR_DERIVATION_KEY = TEST_DERIVATION_KEY;
      const secret = derivePairSecret(VALID_PAIR_ID);
      assert.equal(secret instanceof Uint8Array, true);
      assert.equal(secret.length, 32);
    } finally {
      process.env.PAIR_DERIVATION_KEY = origKey;
    }
  });

  test("getCurrentCode and verifyCode roundtrip", async () => {
    const origKey = process.env.PAIR_DERIVATION_KEY;
    try {
      process.env.PAIR_DERIVATION_KEY = TEST_DERIVATION_KEY;
      const current = await getCurrentCode(VALID_PAIR_ID);
      assert.equal(current.pairId, VALID_PAIR_ID);
      assert.match(current.code, /^\d{6}$/);
      assert.equal(current.periodSeconds, 30);
      assert.equal(typeof current.windowStart, "number");
      assert.equal(current.secondsRemaining >= 1 && current.secondsRemaining <= 30, true);

      const verdict = await verifyCode(VALID_PAIR_ID, current.code);
      assert.equal(verdict, "verified");

      const wrongVerdict = await verifyCode(VALID_PAIR_ID, "000000" === current.code ? "111111" : "000000");
      assert.equal(wrongVerdict, "not-verified");
    } finally {
      process.env.PAIR_DERIVATION_KEY = origKey;
    }
  });
});

describe("lib/rateLimit", () => {
  beforeEach(() => {
    resetRateLimits();
  });

  test("consume enforces fixed window limits", () => {
    const key = "test-bucket";
    const max = 3;
    const windowMs = 30000;
    const now = 1000000;

    const r1 = consume(key, max, windowMs, now);
    assert.equal(r1.allowed, true);
    if (r1.allowed) assert.equal(r1.remaining, 2);

    const r2 = consume(key, max, windowMs, now);
    assert.equal(r2.allowed, true);
    if (r2.allowed) assert.equal(r2.remaining, 1);

    const r3 = consume(key, max, windowMs, now);
    assert.equal(r3.allowed, true);
    if (r3.allowed) assert.equal(r3.remaining, 0);

    const r4 = consume(key, max, windowMs, now);
    assert.equal(r4.allowed, false);
    if (!r4.allowed) assert.equal(typeof r4.retryAfterSeconds, "number");

    // After window reset
    const r5 = consume(key, max, windowMs, now + windowMs + 1000);
    assert.equal(r5.allowed, true);
  });

  test("per-client IP rate limiting prevents pairId bypass attacks", () => {
    const clientIp = "192.168.1.100";
    const max = 10;
    const windowMs = 60000;
    const now = 2000000;

    // Simulate 10 requests from same IP with different pairIds
    for (let i = 0; i < max; i++) {
      const pairId = `pair_${i}`;
      const ipResult = consume(`analyze:ip:${clientIp}`, max, windowMs, now);
      const pairResult = consume(`analyze:pair:${pairId}`, max, windowMs, now);
      assert.equal(ipResult.allowed, true);
      assert.equal(pairResult.allowed, true);
    }

    // 11th request from same IP with a brand-new pairId should be blocked by IP rate limit
    const ipResult11 = consume(`analyze:ip:${clientIp}`, max, windowMs, now);
    assert.equal(ipResult11.allowed, false);
  });
});

describe("lib/schemas", () => {
  test("pairIdSchema validates 32-hex string", () => {
    assert.equal(pairIdSchema.safeParse(VALID_PAIR_ID).success, true);
    assert.equal(pairIdSchema.safeParse("invalid-hex").success, false);
    assert.equal(pairIdSchema.safeParse("12345").success, false);
  });

  test("sixDigitCodeSchema validates 6 digits", () => {
    assert.equal(sixDigitCodeSchema.safeParse("123456").success, true);
    assert.equal(sixDigitCodeSchema.safeParse("12345").success, false);
    assert.equal(sixDigitCodeSchema.safeParse("abcdef").success, false);
  });

  test("verdictSchema validates enum values", () => {
    assert.equal(verdictSchema.safeParse("verified").success, true);
    assert.equal(verdictSchema.safeParse("not-verified").success, true);
    assert.equal(verdictSchema.safeParse("waiting").success, true);
    assert.equal(verdictSchema.safeParse("unknown").success, false);
  });

  test("analysisRequestSchema validates transcript constraints", () => {
    assert.equal(analysisRequestSchema.safeParse({ transcript: "Hello Mom" }).success, true);
    assert.equal(analysisRequestSchema.safeParse({ transcript: "" }).success, false);
    assert.equal(
      analysisRequestSchema.safeParse({ transcript: "a".repeat(4001) }).success,
      false,
    );
  });

  test("pressureCheckResponseSchema validates response schema", () => {
    const valid = {
      pressureScore: 85,
      riskLevel: "high",
      reasoning: "Urgent financial request",
    };
    assert.equal(pressureCheckResponseSchema.safeParse(valid).success, true);

    const invalid = {
      pressureScore: 150, // out of range
      riskLevel: "high",
      reasoning: "Urgent financial request",
    };
    assert.equal(pressureCheckResponseSchema.safeParse(invalid).success, false);
  });

  test("challengeRequestSchema and response schema", () => {
    assert.equal(
      challengeRequestSchema.safeParse({ pairId: VALID_PAIR_ID, context: "Dog name is Rover" }).success,
      true,
    );

    const validResponse = {
      challenge: "What is your dog's name?",
      category: "personal",
      difficulty: "easy",
    };
    assert.equal(challengeResponseSchema.safeParse(validResponse).success, true);
  });
});

describe("lib/store", () => {
  test("createPair generates valid PairId and timestamp", async () => {
    const res = await createPair();
    assert.match(res.pairId, /^[a-f0-9]{32}$/);
    assert.equal(typeof res.createdAt, "string");
  });

  test("getPair and listPairs throw NotImplementedError", async () => {
    await assert.rejects(() => getPair(VALID_PAIR_ID), NotImplementedError);
    await assert.rejects(() => listPairs(), NotImplementedError);
  });
});

describe("lib/http", () => {
  test("handleApiError returns appropriate HTTP statuses and payloads", async () => {
    const origConsoleError = console.error;
    console.error = () => {};
    try {
      const dummyZodError = new ZodError([]);
      const r1 = handleApiError(dummyZodError);
      assert.equal(r1.status, 400);

      const r2 = handleApiError(new RateLimitError(10));
      assert.equal(r2.status, 429);
      assert.equal(r2.headers.get("Retry-After"), "10");

      const r3 = handleApiError(new ConfigError("missing key"));
      assert.equal(r3.status, 503);

      const r4 = handleApiError(new NotImplementedError("todo"));
      assert.equal(r4.status, 501);

      const r5 = handleApiError(new PairNotFoundError());
      assert.equal(r5.status, 404);

      const r6 = handleApiError(new Error("unexpected"));
      assert.equal(r6.status, 500);
    } finally {
      console.error = origConsoleError;
    }
  });
});

describe("lib/callSchemas & lib/callStore", () => {
  test("callSchemas validation", () => {
    const req = {
      pairId: VALID_PAIR_ID,
      callerId: "12345678901234567890123456789012",
      callerName: "Alice",
    };
    assert.equal(createCallSessionRequestSchema.safeParse(req).success, true);
  });

  test("callSessionStore operations", async () => {
    const callerId = "12345678901234567890123456789012";
    const calleeId = "98765432109876543210987654321098";

    // Create session
    const session = await callSessionStore.createSession({
      pairId: VALID_PAIR_ID,
      callerId,
    });
    assert.equal(session.pairId, VALID_PAIR_ID);
    assert.equal(session.status, "pending");
    assert.equal(session.callerDeviceId, callerId);

    // Get session
    const fetched = await callSessionStore.getSession(session.sessionId);
    assert.notEqual(fetched, null);
    assert.equal(fetched?.sessionId, session.sessionId);

    // Pending session for pair
    const pending = await callSessionStore.getPendingSessionForPair(VALID_PAIR_ID, calleeId);
    assert.notEqual(pending, null);
    assert.equal(pending?.sessionId, session.sessionId);

    // Set offer
    const updatedOffer = await callSessionStore.setOffer(session.sessionId, {
      sessionId: session.sessionId,
      offer: { type: "offer", sdp: "dummy-sdp-offer" },
      fromDeviceId: callerId,
    });
    assert.equal(updatedOffer?.offer?.sdp, "dummy-sdp-offer");

    // Set answer
    const updatedAnswer = await callSessionStore.setAnswer(session.sessionId, {
      sessionId: session.sessionId,
      answer: { type: "answer", sdp: "dummy-sdp-answer" },
      fromDeviceId: calleeId,
    });
    assert.equal(updatedAnswer?.status, "active");
    assert.equal(updatedAnswer?.calleeDeviceId, calleeId);
    assert.equal(updatedAnswer?.answer?.sdp, "dummy-sdp-answer");

    // Add ICE candidate
    await callSessionStore.addIceCandidate(session.sessionId, {
      sessionId: session.sessionId,
      candidate: { candidate: "candidate-1", sdpMid: "0", sdpMLineIndex: 0 },
      fromDeviceId: callerId,
    });

    const iceForCallee = await callSessionStore.getIceCandidates(session.sessionId, calleeId);
    assert.equal(iceForCallee.length, 1);
    assert.equal(iceForCallee[0].candidate, "candidate-1");

    // End session
    const ended = await callSessionStore.endSession(session.sessionId);
    assert.equal(ended?.status, "ended");
  });
});
