import * as SecureStore from "expo-secure-store";

const PAIRS_KEY = "handshake_pairs";
// Legacy key from the previous "default trusted person" concept. Nothing reads
// or writes it anymore; the one-time migration below only removes any leftover
// value so old installs do not keep orphaned data around.
const LEGACY_ACTIVE_PAIR_KEY = "handshake_active_pair";

/**
 * A trusted person, established via short-lived QR physical pairing.
 *
 * `pairId` is now an opaque server-assigned relation id returned by the invite
 * flow. It is never displayed or typed by the user; it only exists so this
 * phone can talk to the trust backend about this relationship.
 *
 * There is no `code` field, no private-context editor, and no "default"
 * concept: trust is per-person, and during a call every trusted person is
 * checked automatically.
 */
export interface StoredPair {
  /** Opaque server-assigned relation id (never rendered). */
  pairId: string;
  name?: string;
  role?: "caller" | "receiver";
  createdAt: string;
}

let migrationRan = false;

/** One-time cleanup of the retired "active pair" key. Best effort only. */
async function migrateLegacyActivePair(): Promise<void> {
  if (migrationRan) return;
  migrationRan = true;
  try {
    await SecureStore.deleteItemAsync(LEGACY_ACTIVE_PAIR_KEY);
  } catch {
    // Best effort: a leftover key is harmless, it is simply never read again.
  }
}

async function getPairs(): Promise<StoredPair[]> {
  await migrateLegacyActivePair();
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
}

export async function updatePair(pairId: string, patch: { name?: string }): Promise<void> {
  const pairs = await getPairs();
  const index = pairs.findIndex((pair) => pair.pairId === pairId);
  if (index === -1) return;
  const next = [...pairs];
  next[index] = { ...next[index], ...patch };
  await savePairs(next);
}

export async function getAllPairs(): Promise<StoredPair[]> {
  return getPairs();
}

export async function removePair(pairId: string): Promise<void> {
  const pairs = await getPairs();
  const filtered = pairs.filter((p) => p.pairId !== pairId);
  await savePairs(filtered);
}