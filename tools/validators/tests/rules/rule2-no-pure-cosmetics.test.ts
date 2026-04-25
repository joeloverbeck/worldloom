import assert from "node:assert/strict";
import test from "node:test";

import { CANONICAL_DOMAINS } from "@worldloom/world-index/public/canonical-vocabularies";
import { rule2NoPureCosmetics } from "../../src/rules/rule2-no-pure-cosmetics.js";
import { cfRecord, completeCf, testContext } from "./helpers.js";

test("rule2_no_pure_cosmetics catches empty and non-canonical domains", async () => {
  const empty = cfRecord("CF-0001", { ...completeCf, domains_affected: [] });
  const invalid = cfRecord("CF-0002", { ...completeCf, domains_affected: ["sparkle"] });

  const result = await rule2NoPureCosmetics.run({}, testContext([empty, invalid]));

  assert.deepEqual(
    result.map((verdict) => verdict.code).sort(),
    ["rule2.missing_domains_affected", "rule2.non_canonical_domain"].sort()
  );
});

test("rule2_no_pure_cosmetics accepts FOUNDATIONS concern domains", async () => {
  const technology = cfRecord("CF-0001", { ...completeCf, domains_affected: ["technology"] });
  const geography = cfRecord("CF-0002", { ...completeCf, domains_affected: ["geography"] });
  const institutions = cfRecord("CF-0003", { ...completeCf, domains_affected: ["institutions"] });
  const everydayLife = cfRecord("CF-0004", { ...completeCf, domains_affected: ["everyday_life"] });

  const result = await rule2NoPureCosmetics.run({}, testContext([technology, geography, institutions, everydayLife]));

  assert.deepEqual(result, []);
});

test("canonical domain enum has the reassessed 26 entries", () => {
  assert.equal(CANONICAL_DOMAINS.length, 26);
  assert.ok(CANONICAL_DOMAINS.includes("geography"));
  assert.ok(CANONICAL_DOMAINS.includes("technology"));
  assert.ok(CANONICAL_DOMAINS.includes("institutions"));
  assert.ok(CANONICAL_DOMAINS.includes("everyday_life"));
});
