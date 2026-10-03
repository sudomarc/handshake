import { randomBytes } from "node:crypto";
import { NotImplementedError } from "./errors";
import {
  createPairResponseSchema,
  type CreatePairResponse,
  type PairId,
  type PairMeta,
} from "./schemas";

export async function createPair(): Promise<CreatePairResponse> {
  const pairId = randomBytes(16).toString("hex") as PairId;
  return createPairResponseSchema.parse({
    pairId,
    createdAt: new Date().toISOString(),
  });
}

export async function getPair(pairId: string): Promise<PairMeta> {
  void pairId;
  throw new NotImplementedError("getPair");
}

export async function listPairs(): Promise<PairMeta[]> {
  throw new NotImplementedError("listPairs");
}
