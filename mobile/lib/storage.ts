import * as SecureStore from "expo-secure-store";
import type { PairMeta } from "@/lib/apiTypes";

const PAIRS_KEY = "handshake_pairs";
const ACTIVE_PAIR_KEY = "handshake_active_pair";

export interface StoredPair extends PairMeta {
  name?: string;
  role?: "caller" | "receiver";
  privateContext?: string;
}

async function getPairs(): Promise<StoredPair[]> {
  try {
    const data = await SecureStore.getItemAsync(PAIRS_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function savePairs(pairs: StoredPair[]): Promise<void> {
  await SecureStore.setItemAsync(PAIRS_KEY, JSON.stringify(pairs));
}

export async function addPair(
  pairId: string,
  name?: string,
  role?: "caller" | "receiver",
): Promise<void> {
  const pairs = await getPairs();
  const exists = pairs.some((p) => p.pairId === pairId);
  if (!exists) {
    const newPair: StoredPair = {
      pairId,
      createdAt: new Date().toISOString(),
      name: name ?? "Trusted person",
      role,
    };
    await savePairs([...pairs, newPair]);
  }
  await setActivePair(pairId);
}

export async function updatePair(
  pairId: string,
  patch: { name?: string; privateContext?: string },
): Promise<void> {
  const pairs = await getPairs();
  const index = pairs.findIndex((pair) => pair.pairId === pairId);
  if (index === -1) return;
  const next = [...pairs];
  next[index] = { ...next[index], ...patch };
  await savePairs(next);
}

export async function getActivePair(): Promise<StoredPair | null> {
  try {
    const pairId = await SecureStore.getItemAsync(ACTIVE_PAIR_KEY);
    if (!pairId) return null;
    const pairs = await getPairs();
    return pairs.find((p) => p.pairId === pairId) ?? null;
  } catch {
    return null;
  }
}

export async function setActivePair(pairId: string): Promise<void> {
  await SecureStore.setItemAsync(ACTIVE_PAIR_KEY, pairId);
}

export async function getAllPairs(): Promise<StoredPair[]> {
  return getPairs();
}

export async function removePair(pairId: string): Promise<void> {
  const pairs = await getPairs();
  const filtered = pairs.filter((p) => p.pairId !== pairId);
  await savePairs(filtered);
  const active = await SecureStore.getItemAsync(ACTIVE_PAIR_KEY);
  if (active === pairId) {
    await SecureStore.deleteItemAsync(ACTIVE_PAIR_KEY);
  }
}
