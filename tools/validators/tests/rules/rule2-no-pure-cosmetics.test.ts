import assert from "node:assert/strict";
import test from "node:test";

import { CANONICAL_DOMAINS } from "../../src/rules/_shared/domain-enum.js";
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

test("canonical domain enum has the reassessed 22 entries", () => {
  assert.equal(CANONICAL_DOMAINS.length, 22);
});
