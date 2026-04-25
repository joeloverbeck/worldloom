import assert from "node:assert/strict";
import test from "node:test";

import { rule4NoGlobalizationByAccident } from "../../src/rules/rule4-no-globalization-by-accident.js";
import { cfRecord, completeCf, testContext } from "./helpers.js";

test("rule4_no_globalization_by_accident requires why_not_universal for limited scope", async () => {
  const bad = cfRecord("CF-0001", {
    ...completeCf,
    distribution: { why_not_universal: [] }
  });
  const good = cfRecord("CF-0002");
  const globalPublic = cfRecord("CF-0003", {
    ...completeCf,
    scope: { geographic: "global", temporal: "current", social: "public" },
    distribution: { why_not_universal: [] }
  });

  const result = await rule4NoGlobalizationByAccident.run({}, testContext([bad, good, globalPublic]));

  assert.deepEqual(result.map((verdict) => verdict.code), ["rule4.missing_why_not_universal"]);
});
