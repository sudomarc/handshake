import { NotImplementedError } from "./errors";
import type { CurrentCode, Verdict } from "./schemas";

export function derivePairSecret(pairId: string): string {
  throw new NotImplementedError(`derivePairSecret(${pairId})`);
}

export async function getCurrentCode(pairId: string): Promise<CurrentCode> {
  throw new NotImplementedError(`getCurrentCode(${pairId})`);
}

export async function verifyCode(pairId: string, code: string): Promise<Verdict> {
  void code;
  throw new NotImplementedError(`verifyCode(${pairId})`);
}
