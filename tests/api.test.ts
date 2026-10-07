import assert from "node:assert/strict";
import { test, describe, beforeEach, afterEach } from "node:test";
import { NextRequest } from "next/server";
import { GET as getCurrentCodeHandler } from "../app/api/code/current/route";
import { POST as verifyCodeHandler } from "../app/api/code/verify/route";
import { POST as createPairHandler } from "../app/api/circle/route";
import { POST as analyzeHandler } from "../app/api/analyze/route";
import { POST as challengeHandler } from "../app/api/challenge/route";
import { resetRateLimits } from "../lib/rateLimit";
import { getCurrentCode } from "../lib/totp";

const TEST_DERIVATION_KEY = "0123456789abcdef0123456789abcdef"; // 32 chars
const VALID_PAIR_ID = "a1b2c3d4e5f60718293a4b5c6d7e8f90";

const originalFetch = globalThis.fetch;

describe("API routes", () => {
  beforeEach(() => {
    process.env.PAIR_DERIVATION_KEY = TEST_DERIVATION_KEY;
    process.env.FEATHERLESS_API_KEY = "test_api_key_12345";
    resetRateLimits();

    // Mock fetch for Featherless LLM calls
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlString = typeof input === "string" ? input : input.toString();
      if (urlString.includes("featherless.ai")) {
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    pressureScore: 10,
                    riskLevel: "low",
                    reasoning: "No pressure signals detected.",
                    challenge: "What is your favorite color?",
                    category: "personal",
                    difficulty: "easy",
                  }),
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return originalFetch(input, init);
    };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("GET /api/code/current", () => {
    test("returns 200 with code payload for valid pairId", async () => {
      const req = new NextRequest(`http://localhost/api/code/current?pairId=${VALID_PAIR_ID}`);
      const res = await getCurrentCodeHandler(req);
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.pairId, VALID_PAIR_ID);
      assert.match(json.code, /^\d{6}$/);
      assert.equal(json.periodSeconds, 30);
      assert.equal(typeof json.secondsRemaining, "number");
    });

    test("returns 400 for invalid pairId format", async () => {
      const req = new NextRequest("http://localhost/api/code/current?pairId=short");
      const res = await getCurrentCodeHandler(req);
      assert.equal(res.status, 400);

      const json = await res.json();
      assert.equal(json.error.code, "invalid_input");
    });
  });

  describe("POST /api/code/verify", () => {
    test("verifies correct code and rejects incorrect code", async () => {
      const current = await getCurrentCode(VALID_PAIR_ID);

      // Verify correct code
      const req1 = new NextRequest("http://localhost/api/code/verify", {
        method: "POST",
        body: JSON.stringify({ pairId: VALID_PAIR_ID, code: current.code }),
        headers: { "Content-Type": "application/json" },
      });
      const res1 = await verifyCodeHandler(req1);
      assert.equal(res1.status, 200);

      const json1 = await res1.json();
      assert.equal(json1.verdict, "verified");
      assert.equal(typeof json1.checkedAt, "string");

      // Reject wrong code
      const wrongCode = current.code === "000000" ? "111111" : "000000";
      const req2 = new NextRequest("http://localhost/api/code/verify", {
        method: "POST",
        body: JSON.stringify({ pairId: VALID_PAIR_ID, code: wrongCode }),
        headers: { "Content-Type": "application/json" },
      });
      const res2 = await verifyCodeHandler(req2);
      assert.equal(res2.status, 200);

      const json2 = await res2.json();
      assert.equal(json2.verdict, "not-verified");
    });

    test("returns 400 for malformed payload", async () => {
      const req = new NextRequest("http://localhost/api/code/verify", {
        method: "POST",
        body: JSON.stringify({ pairId: VALID_PAIR_ID, code: "123" }), // short code
        headers: { "Content-Type": "application/json" },
      });
      const res = await verifyCodeHandler(req);
      assert.equal(res.status, 400);

      const json = await res.json();
      assert.equal(json.error.code, "invalid_input");
    });

    test("returns 429 when per-pair rate limit is exceeded", async () => {
      // Consume 5 allowed attempts
      for (let i = 0; i < 5; i++) {
        const req = new NextRequest("http://localhost/api/code/verify", {
          method: "POST",
          body: JSON.stringify({ pairId: VALID_PAIR_ID, code: "000000" }),
          headers: { "Content-Type": "application/json" },
        });
        const res = await verifyCodeHandler(req);
        assert.equal(res.status, 200);
      }

      // 6th attempt should return 429 RateLimitError
      const req6 = new NextRequest("http://localhost/api/code/verify", {
        method: "POST",
        body: JSON.stringify({ pairId: VALID_PAIR_ID, code: "000000" }),
        headers: { "Content-Type": "application/json" },
      });
      const res6 = await verifyCodeHandler(req6);
      assert.equal(res6.status, 429);
      assert.notEqual(res6.headers.get("Retry-After"), null);

      const json = await res6.json();
      assert.equal(json.error.code, "rate_limited");
    });
  });

  describe("POST /api/circle", () => {
    test("creates pair and returns 201 Created", async () => {
      const res = await createPairHandler();
      assert.equal(res.status, 201);

      const json = await res.json();
      assert.match(json.pairId, /^[a-f0-9]{32}$/);
      assert.equal(typeof json.createdAt, "string");
    });
  });

  describe("POST /api/analyze & POST /api/challenge", () => {
    test("returns 400 on invalid analyze request payload", async () => {
      const req = new NextRequest("http://localhost/api/analyze", {
        method: "POST",
        body: JSON.stringify({ transcript: "" }), // empty transcript
        headers: { "Content-Type": "application/json" },
      });
      const res = await analyzeHandler(req);
      assert.equal(res.status, 400);

      const json = await res.json();
      assert.equal(json.error.code, "invalid_input");
    });

    test("returns 400 on invalid challenge request payload", async () => {
      const req = new NextRequest("http://localhost/api/challenge", {
        method: "POST",
        body: JSON.stringify({ pairId: "invalid-id" }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await challengeHandler(req);
      assert.equal(res.status, 400);

      const json = await res.json();
      assert.equal(json.error.code, "invalid_input");
    });

    test("returns 200 for valid analyze request and 429 on IP rate limit exceed", async () => {
      for (let i = 0; i < 10; i++) {
        const req = new NextRequest("http://localhost/api/analyze", {
          method: "POST",
          body: JSON.stringify({ transcript: "Send money now" }),
          headers: { "x-forwarded-for": "10.0.0.1", "Content-Type": "application/json" },
        });
        const res = await analyzeHandler(req);
        assert.equal(res.status, 200);
      }

      const req11 = new NextRequest("http://localhost/api/analyze", {
        method: "POST",
        body: JSON.stringify({ transcript: "Send money now" }),
        headers: { "x-forwarded-for": "10.0.0.1", "Content-Type": "application/json" },
      });
      const res11 = await analyzeHandler(req11);
      assert.equal(res11.status, 429);
      assert.notEqual(res11.headers.get("Retry-After"), null);

      const json = await res11.json();
      assert.equal(json.error.code, "rate_limited");
    });

    test("returns 200 for valid challenge request", async () => {
      const req = new NextRequest("http://localhost/api/challenge", {
        method: "POST",
        body: JSON.stringify({ pairId: VALID_PAIR_ID, context: "Dog name is Rover" }),
        headers: { "x-forwarded-for": "10.0.0.2", "Content-Type": "application/json" },
      });
      const res = await challengeHandler(req);
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.challenge, "What is your favorite color?");
      assert.equal(json.category, "personal");
      assert.equal(json.difficulty, "easy");
    });
  });
});
