import assert from "node:assert/strict";
import test from "node:test";

import { validateOptions } from "../../src/cli/_helpers.js";

test("RULE_FILTER_PATTERN accepts mechanized rule 11 and 12 combinations", () => {
  for (const rules of ["11", "12", "11,12", "1,11", "1,2,11,12", "7,12,1"]) {
    assert.equal(validateOptions({ rules }), null, rules);
  }
});

test("RULE_FILTER_PATTERN rejects unsupported rule numbers", () => {
  for (const rules of ["3", "13", "21", "0", "1,13", "11,3"]) {
    assert.match(validateOptions({ rules }) ?? "", /mechanized rule numbers/, rules);
  }
});
