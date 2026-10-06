import test from 'node:test';
import assert from 'node:assert/strict';
import { derivePairSecret, getCurrentCode, verifyCode } from './totp.ts';

const TEST_KEY = 'a'.repeat(32);
const VALID_PAIR_ID = '849d3b149d0cf133d5c9018995147c38';

test('derivePairSecret is deterministic for the same pairId', () => {
  process.env.PAIR_DERIVATION_KEY = TEST_KEY;
  const secret1 = derivePairSecret(VALID_PAIR_ID);
  const secret2 = derivePairSecret(VALID_PAIR_ID);
  assert.deepEqual(secret1, secret2);
  assert.ok(secret1 instanceof Uint8Array);
  assert.equal(secret1.length, 32);
});

test('derivePairSecret produces different secrets for different pairIds', () => {
  process.env.PAIR_DERIVATION_KEY = TEST_KEY;
  const secret1 = derivePairSecret(VALID_PAIR_ID);
  const secret2 = derivePairSecret('a1b2c3d4e5f607182930415263748596');
  assert.notDeepEqual(secret1, secret2);
});

test('getCurrentCode generates a valid 6-digit TOTP code and secondsRemaining', async () => {
  process.env.PAIR_DERIVATION_KEY = TEST_KEY;
  const info = await getCurrentCode(VALID_PAIR_ID);

  assert.equal(typeof info.code, 'string');
  assert.match(info.code, /^\d{6}$/);
  assert.equal(typeof info.secondsRemaining, 'number');
  assert.ok(info.secondsRemaining >= 0 && info.secondsRemaining <= 30);
});

test('verifyCode verifies valid code for current window', async () => {
  process.env.PAIR_DERIVATION_KEY = TEST_KEY;
  const { code } = await getCurrentCode(VALID_PAIR_ID);

  const verdict = await verifyCode(VALID_PAIR_ID, code);
  assert.equal(verdict, 'verified');
});

test('verifyCode rejects invalid 6-digit code', async () => {
  process.env.PAIR_DERIVATION_KEY = TEST_KEY;
  const { code } = await getCurrentCode(VALID_PAIR_ID);
  const wrongCode = code === '123456' ? '654321' : '123456';

  const verdict = await verifyCode(VALID_PAIR_ID, wrongCode);
  assert.equal(verdict, 'not-verified');
});
