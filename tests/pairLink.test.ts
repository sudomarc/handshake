/**
 * parsePairInvite: the QR/deep-link parser. Regression test for the QR pairing
 * failure where `handshake://pair?invite=…` was rejected because WHATWG URL
 * puts `pair` in the host, not the pathname.
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { parsePairInvite } from "../mobile/lib/trust/pairLink";

const ID = "0123456789abcdef0123456789abcdef";

describe("parsePairInvite", () => {
  test("accepts the custom-scheme QR payload (regression)", () => {
    assert.equal(parsePairInvite(`handshake://pair?invite=${ID}`), ID);
  });

  test("accepts a trailing slash on the custom scheme", () => {
    assert.equal(parsePairInvite(`handshake://pair/?invite=${ID}`), ID);
  });

  test("accepts an HTTPS pair link", () => {
    assert.equal(parsePairInvite(`https://example.com/pair?invite=${ID}`), ID);
  });

  test("trims accidental surrounding whitespace", () => {
    assert.equal(parsePairInvite(`  handshake://pair?invite=${ID}  `), ID);
    assert.equal(parsePairInvite(`handshake://pair?invite=%20${ID}%20`), ID);
  });

  test("rejects a missing or empty invite", () => {
    assert.equal(parsePairInvite("handshake://pair"), null);
    assert.equal(parsePairInvite("handshake://pair?invite="), null);
    assert.equal(parsePairInvite("handshake://pair?invite=%20%20"), null);
  });

  test("rejects an invite that is not a server-shaped id", () => {
    assert.equal(parsePairInvite("handshake://pair?invite=not-an-id"), null);
    assert.equal(parsePairInvite(`handshake://pair?invite=${ID}zz`), null);
    assert.equal(parsePairInvite("handshake://pair?invite=<script>"), null);
  });

  test("rejects an unknown custom scheme", () => {
    assert.equal(parsePairInvite(`otherapp://pair?invite=${ID}`), null);
  });

  test("rejects the wrong host or path", () => {
    assert.equal(parsePairInvite(`handshake://pairx?invite=${ID}`), null);
    assert.equal(parsePairInvite(`handshake://open/pair?invite=${ID}`), null);
    assert.equal(parsePairInvite(`https://example.com/other?invite=${ID}`), null);
    assert.equal(parsePairInvite(`https://example.com/pair/extra?invite=${ID}`), null);
  });

  test("rejects malformed URLs and arbitrary strings", () => {
    assert.equal(parsePairInvite(`junk/pair?invite=${ID}`), null);
    assert.equal(parsePairInvite("pair?invite=" + ID), null);
    assert.equal(parsePairInvite("not a url"), null);
    assert.equal(parsePairInvite(""), null);
    assert.equal(parsePairInvite(null), null);
    assert.equal(parsePairInvite(undefined), null);
  });
});
