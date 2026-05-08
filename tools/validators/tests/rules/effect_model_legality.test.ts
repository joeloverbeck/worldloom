import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import yaml from "js-yaml";

import { effectModelLegality } from "../../src/rules/effect_model_legality.js";
import { context, record } from "../structural/helpers.js";

test("effect_model_legality accepts a valid v2 effect model", async () => {
  const result = await effectModelLegality.run({}, context([storyletRecord(completeStorylet())]));

  assert.deepEqual(result, []);
});

test("effect_model_legality rejects empty variants", async () => {
  const parsed = completeStorylet();
  (parsed.effect_model as Record<string, unknown>).variants = [];

  const result = await effectModelLegality.run({}, context([storyletRecord(parsed)]));

  assert.ok(result.some((verdict) => verdict.code === "effect_model_legality.empty_variants"));
});

test("effect_model_legality rejects empty required_effects", async () => {
  const parsed = completeStorylet();
  const variant = firstVariant(parsed);
  variant.required_effects = [];

  const result = await effectModelLegality.run({}, context([storyletRecord(parsed)]));

  assert.ok(result.some((verdict) => verdict.code === "effect_model_legality.empty_required_effects"));
});

test("effect_model_legality rejects unknown required and forbidden effect types", async () => {
  const parsed = completeStorylet();
  const variant = firstVariant(parsed);
  variant.required_effects = [{ type: "invented_effect" }];
  variant.forbidden_effects = [{ type: "also_invented" }];

  const result = await effectModelLegality.run({}, context([storyletRecord(parsed)]));

  assert.equal(
    result.filter((verdict) => verdict.code === "effect_model_legality.unknown_effect_type").length,
    2
  );
});

test("effect_model_legality rejects out-of-band variant outcomes", async () => {
  const parsed = completeStorylet();
  firstVariant(parsed).maps_to_outcome = "backfires";

  const result = await effectModelLegality.run({}, context([storyletRecord(parsed)]));

  assert.ok(result.some((verdict) => verdict.code === "effect_model_legality.out_of_band_outcome"));
});

function completeStorylet(): Record<string, unknown> {
  return yaml.load(readFileSync(path.resolve(process.cwd(), "tests", "fixtures", "story-storylet-complete.yaml"), "utf8"), {
    schema: yaml.JSON_SCHEMA
  }) as Record<string, unknown>;
}

function firstVariant(parsed: Record<string, unknown>): Record<string, unknown> {
  const variants = (parsed.effect_model as Record<string, unknown>).variants as Record<string, unknown>[];
  return variants[0] as Record<string, unknown>;
}

function storyletRecord(parsed: Record<string, unknown>, id = String(parsed.id ?? "SLT-0001")) {
  return record("storylet_record", id, `stories/alpha/_source/storylets/${id}.yaml`, {
    ...parsed,
    id
  });
}
