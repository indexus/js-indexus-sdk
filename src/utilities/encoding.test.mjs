/**
 * Unit tests for the location algebra shared with go-indexus-core:
 * domain.IsDirectChild and zoneKeyID.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  BASEURL64,
  ROOT,
  decodeUrl64,
  encodeUrl64,
  isDirectChild,
  parent,
  zoneKeyID,
} from "./encoding.js";

describe("isDirectChild", () => {
  it("accepts one encoding step below the parent", () => {
    assert.equal(isDirectChild(ROOT, "7"), true);
    assert.equal(isDirectChild("q", "qu"), true);
    assert.equal(isDirectChild("7", "7x"), true);
  });

  it("rejects self-keys, which is what stops a traversal looping", () => {
    assert.equal(isDirectChild(ROOT, ROOT), false);
    assert.equal(isDirectChild("q", "q"), false);
  });

  it("rejects anything deeper than one step", () => {
    assert.equal(isDirectChild(ROOT, "7x"), false);
    assert.equal(isDirectChild("7", "7xy"), false);
  });

  it("rejects the `location:reference` rows an item carries", () => {
    assert.equal(isDirectChild("n", "nLKc:item"), false);
    assert.equal(isDirectChild("nLKc", "nLKc:item"), false);
  });

  // P4: the key space belongs to locations. Reserving a character as a marker
  // hides every zone named after it — on the Go side that lost every item
  // stored under `_`, present in the collection and counted by nobody.
  it("treats every character of the alphabet as an ordinary location", () => {
    for (const character of BASEURL64) {
      assert.equal(
        isDirectChild(ROOT, character),
        true,
        `${character} is a letter of the alphabet, so a child of the root`
      );
      assert.equal(isDirectChild(character, `${character}A`), true);
    }
  });
});

describe("zoneKeyID", () => {
  it("lets the location lead, so sibling zones stay adjacent under XOR", () => {
    const collection = "DvFMV2020idx0001";
    const here = zoneKeyID(collection, "7x");
    const sibling = zoneKeyID(collection, "7y");
    const elsewhere = zoneKeyID(collection, "Ax");

    assert.equal(encodeUrl64(here).slice(0, 2), "7x");
    assert.equal(encodeUrl64(sibling).slice(0, 2), "7y");
    assert.equal(encodeUrl64(elsewhere).slice(0, 2), "Ax");
  });

  it("keys the root zone on the collection alone", () => {
    const collection = "DvFMV2020idx0001";
    assert.deepEqual(
      zoneKeyID(collection, ROOT),
      decodeUrl64(collection),
      "the root carries no location prefix"
    );
  });

  it("keeps the collection width whatever the location depth", () => {
    const collection = "DvFMV2020idx0001";
    const width = zoneKeyID(collection, ROOT).length;
    assert.equal(zoneKeyID(collection, "7").length, width);
    assert.equal(zoneKeyID(collection, "7xAb").length, width);
  });
});

describe("parent", () => {
  it("walks one step up, and the root has none", () => {
    assert.equal(parent("abc"), "ab");
    assert.equal(parent("a"), ROOT);
    assert.equal(parent(ROOT), "");
  });
});
