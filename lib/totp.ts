import { createHmac } from "node:crypto";
import { generate, verify } from "otplib";
import { ConfigError } from "./errors";
import { pairIdSchema, type CurrentCode, type Verdict } from "./schemas";

const PERIOD_SECONDS = 30;
const MIN_KEY_LENGTH = 32;

function getDerivationKey(): string {
  const key = process.env.PAIR_DERIVATION_KEY;
  if (!key || key.length < MIN_KEY_LENGTH) {
    throw new ConfigError(
      `PAIR_DERIVATION_KEY must be set (at least ${MIN_KEY_LENGTH} characters)`,
    );
  }
  return key;
}

/** secret = HMAC-SHA256(PAIR_DERIVATION_KEY, pairId). Stateless: nothing is stored. */
export function derivePairSecret(pairId: string): Uint8Array {
  const id = pairIdSchema.parse(pairId);
  return new Uint8Array(createHmac("sha256", getDerivationKey()).update(id).digest());
}

export async function getCurrentCode(pairId: string): Promise<CurrentCode> {
  const secret = derivePairSecret(pairId);
  const epoch = Math.floor(Date.now() / 1000);
  const code = await generate({ secret, period: PERIOD_SECONDS, digits: 6, epoch });
  const windowStart = epoch - (epoch % PERIOD_SECONDS);
  return {
    pairId,
    code,
    windowStart,
    periodSeconds: PERIOD_SECONDS,
    secondsRemaining: windowStart + PERIOD_SECONDS - epoch,
  };
}

/** Accepts the current and the previous 30 s window to absorb the rotation boundary. */
export async function verifyCode(pairId: string, code: string): Promise<Verdict> {
  const secret = derivePairSecret(pairId);
  const epoch = Math.floor(Date.now() / 1000);
  const result = await verify({
    secret,
    token: code,
    period: PERIOD_SECONDS,
    digits: 6,
    epoch,
    epochTolerance: [PERIOD_SECONDS, 0],
  });
  return result.valid ? "verified" : "not-verified";
}
