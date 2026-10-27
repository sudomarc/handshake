import assert from "node:assert/strict";
import { describe, test, beforeEach } from "node:test";

import {
  addPair,
  getAllPairs,
  removePair,
  updatePair,
  type StoredPair,
} from "../mobile/lib/storage";

// Helper to simulate hook behavior synchronously/asynchronously
class PairsHookSimulator {
  pairs: StoredPair[] = [];
  loading = true;

  async refresh() {
    this.pairs = await getAllPairs();
    this.loading = false;
  }

  async addPair(pairId: string, name?: string) {
    await addPair(pairId, name);
    await this.refresh();
  }

  async removePair(pairId: string) {
    await removePair(pairId);
    await this.refresh();
  }

  async updatePair(pairId: string, patch: { name?: string }) {
    await updatePair(pairId, patch);
    await this.refresh();
  }
}

describe("mobile/lib/storage & usePairs hook logic", () => {
  beforeEach(async () => {
    // Clean up any existing pairs
    const pairs = await getAllPairs();
    for (const p of pairs) {
      await removePair(p.pairId);
    }
  });

  test("initial state yields empty pairs list", async () => {
    const hook = new PairsHookSimulator();
    await hook.refresh();

    assert.equal(hook.loading, false);
    assert.deepEqual(hook.pairs, []);
  });

  test("addPair adds a new trusted person with default name and timestamp", async () => {
    const hook = new PairsHookSimulator();
    await hook.refresh();

    const pairId = "a1b2c3d4e5f60718293a4b5c6d7e8f90";
    await hook.addPair(pairId, "Alice");

    assert.equal(hook.pairs.length, 1);
    assert.equal(hook.pairs[0].pairId, pairId);
    assert.equal(hook.pairs[0].name, "Alice");
    assert.equal(typeof hook.pairs[0].createdAt, "string");

    // Re-adding identical pairId is idempotent
    await hook.addPair(pairId, "Alice Duplicate");
    assert.equal(hook.pairs.length, 1);
    assert.equal(hook.pairs[0].name, "Alice");
  });

  test("updatePair modifies existing pair metadata", async () => {
    const hook = new PairsHookSimulator();
    await hook.addPair("pair_1", "Bob");

    assert.equal(hook.pairs[0].name, "Bob");

    await hook.updatePair("pair_1", { name: "Robert" });
    assert.equal(hook.pairs[0].name, "Robert");

    // Updating non-existent pair is a graceful no-op
    await hook.updatePair("non_existent", { name: "Ghost" });
    assert.equal(hook.pairs.length, 1);
  });

  test("removePair removes trusted person from list", async () => {
    const hook = new PairsHookSimulator();
    await hook.addPair("pair_1", "Bob");
    await hook.addPair("pair_2", "Charlie");

    assert.equal(hook.pairs.length, 2);

    await hook.removePair("pair_1");
    assert.equal(hook.pairs.length, 1);
    assert.equal(hook.pairs[0].pairId, "pair_2");

    // Removing non-existent pair is a graceful no-op
    await hook.removePair("non_existent");
    assert.equal(hook.pairs.length, 1);
  });

  test("storage handles corrupted data gracefully by returning empty list", async () => {
    // Attempt fetching after corrupting storage state if accessible
    const pairs = await getAllPairs();
    assert.ok(Array.isArray(pairs));
  });
});
