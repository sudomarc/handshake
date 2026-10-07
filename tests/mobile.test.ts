import assert from "node:assert/strict";
import { test, describe } from "node:test";
import { ApiError } from "../mobile/lib/api";
import { classifyPressure, THREAT_PRESSURE_SCORE } from "../mobile/lib/shield/capabilities";
import {
  pairIdSchema,
  sixDigitCodeSchema,
  pressureCheckResponseSchema,
  challengeResponseSchema,
  createPairResponseSchema,
  verifyCodeResponseSchema,
  type PressureCheckResponse,
} from "../mobile/lib/apiTypes";

const VALID_PAIR_ID = "a1b2c3d4e5f60718293a4b5c6d7e8f90";

describe("mobile/lib/api - ApiError", () => {
  test("instantiates ApiError with status, code, message, and optional retryAfterSeconds", () => {
    const err = new ApiError(429, "rate_limited", "Too many attempts", 15);
    assert.equal(err instanceof Error, true);
    assert.equal(err instanceof ApiError, true);
    assert.equal(err.name, "ApiError");
    assert.equal(err.status, 429);
    assert.equal(err.code, "rate_limited");
    assert.equal(err.message, "Too many attempts");
    assert.equal(err.retryAfterSeconds, 15);

    const netErr = new ApiError(0, "network", "No connection");
    assert.equal(netErr.retryAfterSeconds, undefined);
  });
});

describe("mobile/lib/shield/capabilities - Risk Classification", () => {
  test("THREAT_PRESSURE_SCORE is 70", () => {
    assert.equal(THREAT_PRESSURE_SCORE, 70);
  });

  test("classifyPressure returns threat when score >= 70 or riskLevel is high", () => {
    const highPressure: PressureCheckResponse = {
      pressureScore: 75,
      riskLevel: "medium",
      reasoning: "Urgency detected",
    };
    assert.equal(classifyPressure(highPressure), "threat");

    const highRiskLevel: PressureCheckResponse = {
      pressureScore: 40,
      riskLevel: "high",
      reasoning: "Impersonation threat",
    };
    assert.equal(classifyPressure(highRiskLevel), "threat");
  });

  test("classifyPressure returns clear when score < 70 and riskLevel is low or medium", () => {
    const lowRisk: PressureCheckResponse = {
      pressureScore: 15,
      riskLevel: "low",
      reasoning: "Casual conversation",
    };
    assert.equal(classifyPressure(lowRisk), "clear");

    const moderateRisk: PressureCheckResponse = {
      pressureScore: 65,
      riskLevel: "medium",
      reasoning: "Slight urgency",
    };
    assert.equal(classifyPressure(moderateRisk), "clear");
  });
});

describe("mobile/lib/apiTypes - Schema Contracts", () => {
  test("pairIdSchema validates 32-character hex string", () => {
    assert.equal(pairIdSchema.safeParse(VALID_PAIR_ID).success, true);
    assert.equal(pairIdSchema.safeParse("not-hex").success, false);
    assert.equal(pairIdSchema.safeParse("12345").success, false);
  });

  test("sixDigitCodeSchema validates 6-digit code string", () => {
    assert.equal(sixDigitCodeSchema.safeParse("654321").success, true);
    assert.equal(sixDigitCodeSchema.safeParse("12345").success, false);
    assert.equal(sixDigitCodeSchema.safeParse("abcdef").success, false);
  });

  test("pressureCheckResponseSchema validates response schema", () => {
    const valid = {
      pressureScore: 80,
      riskLevel: "high",
      reasoning: "Unusual request for immediate payment",
    };
    assert.equal(pressureCheckResponseSchema.safeParse(valid).success, true);

    const invalidScore = {
      pressureScore: -5,
      riskLevel: "low",
      reasoning: "Test",
    };
    assert.equal(pressureCheckResponseSchema.safeParse(invalidScore).success, false);
  });

  test("challengeResponseSchema validates response schema", () => {
    const valid = {
      challenge: "What was the name of our childhood dog?",
      category: "personal",
      difficulty: "easy",
    };
    assert.equal(challengeResponseSchema.safeParse(valid).success, true);

    const invalidCategory = {
      challenge: "Question?",
      category: "unknown",
      difficulty: "easy",
    };
    assert.equal(challengeResponseSchema.safeParse(invalidCategory).success, false);
  });

  test("createPairResponseSchema and verifyCodeResponseSchema validate payloads", () => {
    const createRes = {
      pairId: VALID_PAIR_ID,
      createdAt: new Date().toISOString(),
    };
    assert.equal(createPairResponseSchema.safeParse(createRes).success, true);

    const verifyRes = {
      verdict: "verified",
      checkedAt: new Date().toISOString(),
    };
    assert.equal(verifyCodeResponseSchema.safeParse(verifyRes).success, true);
  });
});
