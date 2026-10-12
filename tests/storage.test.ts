/**
 * Unit tests for mobile/lib/storage.ts.
 *
 * Exercises StoredPair management: adding, updating, retrieving, removing pairs,
 * legacy active pair key cleanup, and corrupt JSON resilience.
 */

import assert from "node:assert/strict";
import { describe, test, beforeEach } from "node:test";
import {
  getAllPairs,
  addPair,
  updatePair,
  removePair,
} from "../mobile/lib/storage";
import {
  resetMockSecureStore,
  getMockSecureStoreState,
  mockSecureStore,
} from "./mocks/register-react-native";

describe("mobile/lib/storage", () => {
  beforeEach(() => {
    resetMockSecureStore();
  });

  test("one-time legacy active pair migration deletes handshake_active_pair key on initial call", async () => {
    // Set a legacy key in SecureStore before any storage method is called in this test suite run (or when key pre-exists).
    await mockSecureStore.setItemAsync("handshake_active_pair", "legacy-data");

    const pairs = await getAllPairs();
    assert.deepEqual(pairs, []);

    const rawState = getMockSecureStoreState();
    assert.equal(rawState.handshake_active_pair, undefined);
  });

  test("getAllPairs returns empty array when no storage items exist", async () => {
    const pairs = await getAllPairs();
    assert.deepEqual(pairs, []);
  });

  test("addPair stores a new pair and getAllPairs retrieves it", async () => {
    await addPair("pair-12345", "Alice", "caller");
    const pairs = await getAllPairs();

    assert.equal(pairs.length, 1);
    assert.equal(pairs[0].pairId, "pair-12345");
    assert.equal(pairs[0].name, "Alice");
    assert.equal(pairs[0].role, "caller");
    assert.ok(typeof pairs[0].createdAt === "string");
  });

  test("addPair defaults display name to 'Trusted person' if not provided", async () => {
    await addPair("pair-67890");
    const pairs = await getAllPairs();

    assert.equal(pairs.length, 1);
    assert.equal(pairs[0].name, "Trusted person");
  });

  test("addPair is idempotent and does not add duplicate pairId", async () => {
    await addPair("pair-111", "Bob");
    await addPair("pair-111", "Bob Redundant");

    const pairs = await getAllPairs();
    assert.equal(pairs.length, 1);
    assert.equal(pairs[0].name, "Bob");
  });

  test("updatePair modifies an existing pair's name", async () => {
    await addPair("pair-222", "Charlie");
    await updatePair("pair-222", { name: "Charles" });

    const pairs = await getAllPairs();
    assert.equal(pairs.length, 1);
    assert.equal(pairs[0].name, "Charles");
  });

  test("updatePair is a no-op if pairId is not found", async () => {
    await addPair("pair-333", "David");
    await updatePair("non-existent-pair", { name: "Ghost" });

    const pairs = await getAllPairs();
    assert.equal(pairs.length, 1);
    assert.equal(pairs[0].name, "David");
  });

  test("removePair removes the target pair and preserves other pairs", async () => {
    await addPair("pair-444", "Eve");
    await addPair("pair-555", "Frank");

    await removePair("pair-444");

    const pairs = await getAllPairs();
    assert.equal(pairs.length, 1);
    assert.equal(pairs[0].pairId, "pair-555");
    assert.equal(pairs[0].name, "Frank");
  });

  test("getAllPairs handles corrupt non-JSON data safely by returning empty array", async () => {
    await mockSecureStore.setItemAsync(
      "handshake_pairs",
      "invalid-json-string{",
    );

    const pairs = await getAllPairs();
    assert.deepEqual(pairs, []);
  });

  test("getAllPairs handles non-array JSON data safely by returning empty array", async () => {
    await mockSecureStore.setItemAsync(
      "handshake_pairs",
      JSON.stringify({ notAnArray: true }),
    );

    const pairs = await getAllPairs();
    assert.deepEqual(pairs, []);
  });
});
