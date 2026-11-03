#!/usr/bin/env node
/**
 * Smoke test for the HexParse implementation.
 *
 * Run from the repo root, after `yarn build-packages`:
 *     yarn node scripts/verify-hexparse.mjs
 *
 * Node 24 strips TypeScript types natively, so this imports the real modules
 * (not a copy) and exercises them against the committed patterns.json.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { HexDir, HexPattern } from "@hextools/renderer/staffGrid";

import { layoutPatterns } from "../src/hexparse/layout.ts";
import { maskToPattern } from "../src/hexparse/mask.ts";
import {
  decodeNumberPattern,
  directionFromName,
  lookupNumber,
} from "../src/hexparse/numbers.ts";
import { parseHex } from "../src/hexparse/resolve.ts";

const data = JSON.parse(
  readFileSync(
    new URL("../public/data/patterns.json", import.meta.url),
    "utf8",
  ),
);

let checks = 0;
function check(name, fn) {
  fn();
  checks++;
  console.log(`ok ${checks} - ${name}`);
}

const sig = (pattern) => `${HexDir[pattern.startDir]} ${pattern.signature}`;

check("patterns.json has hexcasting data", () => {
  assert.ok(
    data.patterns.length > 100,
    `only ${data.patterns.length} patterns`,
  );
  assert.ok(data.numbers["1"], "missing number 1");
});

check("num_1 resolves to the pregenerated table entry", () => {
  const result = parseHex("num_1", data);
  assert.equal(result.errors[0], undefined);
  const [startdir, signature] = data.numbers["1"];
  assert.equal(sig(result.tokens[0].pattern), `${startdir} ${signature}`);
  assert.ok(!result.tokens[0].approximate);
});

check("num_-546 (negative literal) matches the table", () => {
  const result = parseHex("num_-546", data);
  const [startdir, signature] = data.numbers["-546"];
  assert.equal(sig(result.tokens[0].pattern), `${startdir} ${signature}`);
});

check("add and hexcasting:add resolve to hexdoc's add signature", () => {
  const add = data.patterns.find((p) => p.id === "hexcasting:add");
  assert.ok(add, "hexcasting:add missing from patterns.json");
  for (const token of ["add", "hexcasting:add"]) {
    const result = parseHex(token, data);
    assert.equal(
      sig(result.tokens[0].pattern),
      `${add.startdir} ${add.signature}`,
      `${token} resolved differently`,
    );
  }
  assert.equal(`${add.startdir} ${add.signature}`, "NORTH_EAST waaw");
});

check("mask_v-v generates a pattern", () => {
  const pattern = maskToPattern("v-v");
  assert.ok(pattern);
  assert.equal(sig(pattern), "SOUTH_EAST aeea");
  const result = parseHex("mask_v-v", data);
  assert.equal(result.errors[0], undefined);
  assert.equal(result.patterns.length, 1);
  assert.equal(sig(maskToPattern("-v")), "EAST ea");
  assert.equal(maskToPattern("x-v"), null);
});

check("{ and } parse as open/close paren", () => {
  const open = data.patterns.find((p) => p.id === "hexcasting:open_paren");
  const close = data.patterns.find((p) => p.id === "hexcasting:close_paren");
  assert.ok(open && close);

  const result = parseHex("{ } ( ) intro retro", data);
  assert.deepEqual(Object.keys(result.errors), []);
  assert.equal(result.tokens.length, 6);
  assert.equal(
    sig(result.tokens[0].pattern),
    `${open.startdir} ${open.signature}`,
  );
  assert.equal(
    sig(result.tokens[1].pattern),
    `${close.startdir} ${close.signature}`,
  );
  assert.equal(
    sig(result.tokens[2].pattern),
    `${open.startdir} ${open.signature}`,
  );
  assert.equal(
    sig(result.tokens[3].pattern),
    `${close.startdir} ${close.signature}`,
  );
  assert.equal(result.tokens[4].kind, "paren");
  assert.equal(result.tokens[5].kind, "paren");
});

check("\\ escapes and DIR_sig parsing", () => {
  const result = parseHex("\\ NORTH_EAST_waaw _qqq", data);
  assert.deepEqual(Object.keys(result.errors), []);
  assert.equal(sig(result.tokens[0].pattern), "WEST qqqaw");
  assert.equal(sig(result.tokens[1].pattern), "NORTH_EAST waaw");
  assert.equal(sig(result.tokens[2].pattern), "EAST qqq");
});

check("unknown tokens report errors instead of throwing", () => {
  const result = parseHex("num_1 definitely_not_a_pattern", data);
  assert.equal(result.patterns.length, 1);
  assert.ok(result.errors[1]);
});

check("numbers outside the table use the greedy fallback", () => {
  const lookup = lookupNumber(123456, data.numbers);
  assert.ok(lookup?.approximate);
  const result = parseHex("num_123456", data);
  assert.ok(result.warnings[0]);
});

check("layout places patterns left to right", () => {
  const result = parseHex("num_1 num_2 add", data);
  const laidOut = layoutPatterns(result.patterns);
  assert.equal(laidOut.length, 3);
  for (let i = 1; i < laidOut.length; i++) {
    assert.ok(
      laidOut[i].origin.q > laidOut[i - 1].origin.q,
      "origins not increasing",
    );
  }
});

check("direction helper understands every HexDir", () => {
  for (const name of [
    "NORTH_EAST",
    "EAST",
    "SOUTH_EAST",
    "SOUTH_WEST",
    "WEST",
    "NORTH_WEST",
  ]) {
    assert.equal(directionFromName(name), HexDir[name]);
  }
  assert.equal(directionFromName("north-east"), HexDir.NORTH_EAST);
  assert.equal(directionFromName("nope"), null);
});

check("greedy number encoding decodes back to the input", () => {
  for (const n of [123456, -123456, 42, -7, 3141592]) {
    const lookup = lookupNumber(n, {});
    assert.ok(lookup?.approximate, `no fallback for ${n}`);
    assert.equal(decodeNumberPattern(lookup.pattern.signature), n);
  }
});

console.log(`\n${checks} checks passed (${fileURLToPath(import.meta.url)})`);
