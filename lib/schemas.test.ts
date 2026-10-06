import test from 'node:test';
import assert from 'node:assert/strict';
import {
  verifyCodeRequestSchema,
  analysisRequestSchema,
  challengeRequestSchema,
  pressureCheckResponseSchema,
  challengeResponseSchema,
} from './schemas.ts';

test('verifyCodeRequestSchema validates correct pairId and 6-digit code', () => {
  const valid = { pairId: 'a1b2c3d4e5f607182930415263748596', code: '123456' };
  const res = verifyCodeRequestSchema.safeParse(valid);
  assert.equal(res.success, true);
});

test('verifyCodeRequestSchema rejects invalid code format', () => {
  const invalidCode = { pairId: 'a1b2c3d4e5f607182930415263748596', code: '12345' };
  const res = verifyCodeRequestSchema.safeParse(invalidCode);
  assert.equal(res.success, false);
});

test('analysisRequestSchema validates transcript string', () => {
  const valid = { transcript: 'Hello mom please send money' };
  const res = analysisRequestSchema.safeParse(valid);
  assert.equal(res.success, true);
});

test('pressureCheckResponseSchema validates model output format', () => {
  const valid = {
    pressureScore: 85,
    humanLikelihood: 15,
    reasoning: 'High urgency detected',
    verdict: 'likely_clone' as const,
  };
  const res = pressureCheckResponseSchema.safeParse(valid);
  assert.equal(res.success, true);
});

test('challengeRequestSchema validates pairId', () => {
  const valid = { pairId: '849d3b149d0cf133d5c9018995147c38' };
  const res = challengeRequestSchema.safeParse(valid);
  assert.equal(res.success, true);
});

test('challengeResponseSchema validates challenge response', () => {
  const valid = {
    challenge: 'What is our pet dog name?',
    category: 'personal' as const,
    difficulty: 'easy' as const,
  };
  const res = challengeResponseSchema.safeParse(valid);
  assert.equal(res.success, true);
});
