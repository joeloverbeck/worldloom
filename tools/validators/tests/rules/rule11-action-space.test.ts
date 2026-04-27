import assert from "node:assert/strict";
import test from "node:test";

import { rule11ActionSpace } from "../../src/rules/rule11-action-space.js";
import { cfRecord, completeCf, testContext } from "./helpers.js";

const governedCapability = {
  ...completeCf,
  type: "capability",
  exception_governance: {
    activation_conditions: ["training required"],
    rate_limits: ["seasonal"],
    mobility_limits: ["local only"],
    diffusion_barriers: ["guild guarded"],
    countermeasures: ["ordinary offices can deny permits"],
    nondeployment_reasons: ["costly"]
  }
};

test("rule11_action_space accepts three permissible leverage forms in notes", async () => {
  const cf = cfRecord("CF-0001", {
    ...governedCapability,
    notes: "Rule 11 leverage: locality, secrecy, legitimacy"
  });

  const result = await rule11ActionSpace.run({}, testContext([cf]));

  assert.deepEqual(result, []);
});

test("rule11_action_space fails governed capability with fewer than three leverage forms", async () => {
  const cf = cfRecord("CF-0001", {
    ...governedCapability,
    notes: "Rule 11 leverage: locality, access"
  });

  const result = await rule11ActionSpace.run({}, testContext([cf]));

  assert.deepEqual(result.map((verdict) => verdict.code), ["rule11.insufficient_leverage_forms"]);
  assert.match(result[0]?.message ?? "", /found 2/);
});

test("rule11_action_space does not infer leverage from unlabeled notes prose", async () => {
  const cf = cfRecord("CF-0001", {
    ...governedCapability,
    notes: "Locality, secrecy, and legitimacy appear in surrounding prose, but no explicit Rule 11 list is declared."
  });

  const result = await rule11ActionSpace.run({}, testContext([cf]));

  assert.deepEqual(result.map((verdict) => verdict.code), ["rule11.insufficient_leverage_forms"]);
  assert.match(result[0]?.message ?? "", /found 0/);
});

test("rule11_action_space fails invalid leverage enum entries", async () => {
  const cf = cfRecord("CF-0001", {
    ...governedCapability,
    notes: "Rule 11 leverage: locality, protagonist luck, social trust"
  });

  const result = await rule11ActionSpace.run({}, testContext([cf]));

  assert.deepEqual(
    result.map((verdict) => verdict.code).sort(),
    ["rule11.insufficient_leverage_forms", "rule11.invalid_leverage_form"]
  );
});

test("rule11_action_space ignores n_a exception governance and historical missing blocks", async () => {
  const notApplicable = cfRecord("CF-0001", {
    ...completeCf,
    type: "capability",
    exception_governance: { n_a: "Structural capability placeholder with no exception axis." }
  });
  const historical = cfRecord("CF-0002", { ...completeCf, type: "capability" });

  const result = await rule11ActionSpace.run({}, testContext([notApplicable, historical]));

  assert.deepEqual(result, []);
});
