/**
 * Unit tests for mobile/lib/pairing.ts (storePendingInvite, consumePendingInvite, peekPendingInvite)
 */
import assert from "node:assert/strict";
import { describe, test, beforeEach } from "node:test";
import {
  storePendingInvite,
  consumePendingInvite,
  peekPendingInvite,
} from "../mobile/lib/pairing";

describe("mobile/lib/pairing pending invite registry", () => {
  beforeEach(() => {
    // Clear any leftover state before each test
    consumePendingInvite();
  });

  test("returns null when no pending invite is stored", () => {
    assert.equal(peekPendingInvite(), null);
    assert.equal(consumePendingInvite(), null);
  });

  test("storePendingInvite updates pending invite and peekPendingInvite inspects without clearing", () => {
    const inviteId = "0123456789abcdef0123456789abcdef";
    storePendingInvite(inviteId);

    assert.equal(peekPendingInvite(), inviteId);
    assert.equal(peekPendingInvite(), inviteId); // Peek does not consume
  });

  test("consumePendingInvite retrieves and clears the pending invite", () => {
    const inviteId = "0123456789abcdef0123456789abcdef";
    storePendingInvite(inviteId);

    assert.equal(consumePendingInvite(), inviteId);
    assert.equal(peekPendingInvite(), null);
    assert.equal(consumePendingInvite(), null); // Already consumed
  });

  test("overwriting pending invite replaces previous value", () => {
    const invite1 = "11111111111111111111111111111111";
    const invite2 = "22222222222222222222222222222222";

    storePendingInvite(invite1);
    storePendingInvite(invite2);

    assert.equal(peekPendingInvite(), invite2);
    assert.equal(consumePendingInvite(), invite2);
    assert.equal(peekPendingInvite(), null);
  });
});
