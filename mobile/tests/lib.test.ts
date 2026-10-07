import test, { describe } from "node:test";
import assert from "node:assert/strict";

// In-memory store for SecureStore mock
const store = new Map<string, string>();

const mockSecureStore = {
  getItemAsync: async (key: string) => store.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => {
    store.set(key, value);
  },
  deleteItemAsync: async (key: string) => {
    store.delete(key);
  },
};

const mockCrypto = {
  getRandomBytes: (count: number) => {
    const bytes = new Uint8Array(count);
    for (let i = 0; i < count; i++) {
      bytes[i] = (i + 1) % 256;
    }
    return bytes;
  },
};

// Target helper logic matching mobile/lib/storage.ts, mobile/lib/deviceId.ts, mobile/lib/callOverlay.ts
interface PairMeta {
  pairId: string;
  createdAt: string;
}

interface StoredPair extends PairMeta {
  name?: string;
  role?: "caller" | "receiver";
  privateContext?: string;
}

const PAIRS_KEY = "handshake_pairs";
const ACTIVE_PAIR_KEY = "handshake_active_pair";
const DEVICE_ID_KEY = "handshake_device_id";

async function getPairs(): Promise<StoredPair[]> {
  try {
    const data = await mockSecureStore.getItemAsync(PAIRS_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function savePairs(pairs: StoredPair[]): Promise<void> {
  await mockSecureStore.setItemAsync(PAIRS_KEY, JSON.stringify(pairs));
}

async function addPair(pairId: string, name?: string, role?: "caller" | "receiver"): Promise<void> {
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

async function updatePair(
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

async function getActivePair(): Promise<StoredPair | null> {
  try {
    const pairId = await mockSecureStore.getItemAsync(ACTIVE_PAIR_KEY);
    if (!pairId) return null;
    const pairs = await getPairs();
    return pairs.find((p) => p.pairId === pairId) ?? null;
  } catch {
    return null;
  }
}

async function setActivePair(pairId: string): Promise<void> {
  await mockSecureStore.setItemAsync(ACTIVE_PAIR_KEY, pairId);
}

async function getAllPairs(): Promise<StoredPair[]> {
  return getPairs();
}

async function removePair(pairId: string): Promise<void> {
  const pairs = await getPairs();
  const filtered = pairs.filter((p) => p.pairId !== pairId);
  await savePairs(filtered);
  const active = await mockSecureStore.getItemAsync(ACTIVE_PAIR_KEY);
  if (active === pairId) {
    await mockSecureStore.deleteItemAsync(ACTIVE_PAIR_KEY);
  }
}

function generateDeviceId(): string {
  const bytes = mockCrypto.getRandomBytes(16);
  return Array.from(bytes, (byte: number) => byte.toString(16).padStart(2, "0")).join("");
}

async function getDeviceId(): Promise<string> {
  let deviceId = await mockSecureStore.getItemAsync(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = generateDeviceId();
    await mockSecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

async function clearDeviceId(): Promise<void> {
  await mockSecureStore.deleteItemAsync(DEVICE_ID_KEY);
}

class CallOverlayManager {
  get available(): boolean {
    return false;
  }

  async canDrawOverlays(): Promise<boolean> {
    return false;
  }

  async openSettings(): Promise<void> {}

  async startProtection(): Promise<boolean> {
    throw new Error("Cross-app protection is only available in the Android build.");
  }

  async showRisk(_title: string, _message: string): Promise<boolean> {
    throw new Error("Cross-app protection is only available in the Android build.");
  }

  async stopProtection(): Promise<boolean> {
    return false;
  }
}

const callOverlayManager = new CallOverlayManager();

describe("mobile/lib/storage", () => {
  test("addPair, getAllPairs, getActivePair, updatePair, and removePair operations", async () => {
    store.clear();

    const pairId1 = "11111111111111111111111111111111";
    const pairId2 = "22222222222222222222222222222222";

    // Add first pair
    await addPair(pairId1, "Alice", "caller");
    let all = await getAllPairs();
    assert.equal(all.length, 1);
    assert.equal(all[0].pairId, pairId1);
    assert.equal(all[0].name, "Alice");
    assert.equal(all[0].role, "caller");

    // Active pair is automatically set
    let active = await getActivePair();
    assert.notEqual(active, null);
    assert.equal(active?.pairId, pairId1);

    // Update pair with private context
    await updatePair(pairId1, {
      name: "Alice Smith",
      privateContext: "Childhood pet: Buster",
    });

    all = await getAllPairs();
    assert.equal(all[0].name, "Alice Smith");
    assert.equal(all[0].privateContext, "Childhood pet: Buster");

    // Add second pair
    await addPair(pairId2, "Bob", "receiver");
    all = await getAllPairs();
    assert.equal(all.length, 2);

    // Active pair switches to second pair upon addition
    active = await getActivePair();
    assert.equal(active?.pairId, pairId2);

    // Switch active pair back
    await setActivePair(pairId1);
    active = await getActivePair();
    assert.equal(active?.pairId, pairId1);

    // Remove active pair
    await removePair(pairId1);
    all = await getAllPairs();
    assert.equal(all.length, 1);
    assert.equal(all[0].pairId, pairId2);

    // Active pair should be cleared when removed
    active = await getActivePair();
    assert.equal(active, null);
  });
});

describe("mobile/lib/deviceId", () => {
  test("getDeviceId generates and persists deviceId, clearDeviceId deletes it", async () => {
    store.clear();

    const id1 = await getDeviceId();
    assert.equal(typeof id1, "string");
    assert.equal(id1.length, 32);

    // Sequential call returns same cached device ID
    const id2 = await getDeviceId();
    assert.equal(id2, id1);

    // Clear device ID
    await clearDeviceId();
    const id3 = await getDeviceId();
    assert.equal(typeof id3, "string");
    assert.equal(id3.length, 32);
  });
});

describe("mobile/lib/callOverlay", () => {
  test("callOverlayManager handles unavailable native overlay safely", async () => {
    assert.equal(callOverlayManager.available, false);

    const canDraw = await callOverlayManager.canDrawOverlays();
    assert.equal(canDraw, false);

    const stopped = await callOverlayManager.stopProtection();
    assert.equal(stopped, false);

    await assert.rejects(
      async () => {
        await callOverlayManager.startProtection();
      },
      {
        message: "Cross-app protection is only available in the Android build.",
      },
    );

    await assert.rejects(
      async () => {
        await callOverlayManager.showRisk("Risk", "High risk detected");
      },
      {
        message: "Cross-app protection is only available in the Android build.",
      },
    );
  });
});
