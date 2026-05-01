import assert from "node:assert/strict";
import test from "node:test";

import { OPERATION_KINDS } from "@worldloom/patch-engine";

import { describeEnvelopeSchema } from "../../src/tools/describe-envelope-schema";

test("describeEnvelopeSchema returns the full envelope and every operation schema", async () => {
  const manifest = await describeEnvelopeSchema({});

  assert.equal(manifest.tool_names.validate_patch_plan, "mcp__worldloom__validate_patch_plan");
  assert.equal(manifest.tool_names.submit_patch_plan, "mcp__worldloom__submit_patch_plan");
  assert.ok(manifest.source_paths.includes("tools/world-mcp/src/tools/_shared.ts"));
  assert.deepEqual(Object.keys(manifest.op_schemas).sort(), [...OPERATION_KINDS].sort());

  const envelopeProperties = manifest.envelope_schema.properties as Record<string, unknown>;
  const patches = envelopeProperties.patches as {
    items?: { oneOf?: Array<{ $ref?: string }> };
  };
  assert.equal(patches.items?.oneOf?.length, OPERATION_KINDS.length);

  const allocations = envelopeProperties.expected_id_allocations as {
    properties?: Record<string, unknown>;
  };
  assert.ok(allocations.properties?.cf_ids);
  assert.ok(allocations.properties?.pa_ids);
  assert.ok(allocations.properties?.char_ids);
  assert.ok(allocations.properties?.da_ids);
});

test("describeEnvelopeSchema filters to one op kind and exposes CF payload schema", async () => {
  const manifest = await describeEnvelopeSchema({ op_kind: "create_cf_record" });

  assert.deepEqual(Object.keys(manifest.op_schemas), ["create_cf_record"]);

  const schema = manifest.op_schemas.create_cf_record!;
  assert.deepEqual(schema.required, ["op", "target_world", "target_file", "payload"]);
  const properties = schema.properties as Record<string, unknown>;
  assert.deepEqual(properties.op, { const: "create_cf_record" });

  const payload = properties.payload as {
    required?: string[];
    properties?: { cf_record?: { $ref?: string } };
  };
  assert.deepEqual(payload.required, ["cf_record"]);

  const cfRef = payload.properties?.cf_record?.$ref;
  assert.equal(cfRef, "https://worldloom.local/schemas/canon-fact-record.schema.json");

  const cfSchema = manifest.referenced_schemas[cfRef] as {
    required?: string[];
    properties?: Record<string, unknown>;
  };
  assert.ok(cfSchema.required?.includes("id"));
  assert.ok(cfSchema.required?.includes("required_world_updates"));
  assert.ok(cfSchema.properties?.status);
});

test("describeEnvelopeSchema exposes update and hybrid operation payloads", async () => {
  const updateManifest = await describeEnvelopeSchema({ op_kind: "update_record_field" });
  const updateProperties = updateManifest.op_schemas.update_record_field!.properties as Record<string, unknown>;
  const updatePayload = updateProperties.payload as {
    properties?: Record<string, { enum?: string[] }>;
  };
  assert.deepEqual(updatePayload.properties?.operation?.enum, ["set", "append_list", "append_text"]);

  const adjudicationManifest = await describeEnvelopeSchema({ op_kind: "append_adjudication_record" });
  const adjudicationProperties = adjudicationManifest.op_schemas.append_adjudication_record!.properties as Record<
    string,
    unknown
  >;
  const adjudicationPayload = adjudicationProperties.payload as {
    required?: string[];
    properties?: { adjudication_frontmatter?: { $ref?: string } };
  };
  assert.deepEqual(adjudicationPayload.required, ["adjudication_frontmatter", "body_markdown"]);
  assert.equal(
    adjudicationPayload.properties?.adjudication_frontmatter?.$ref,
    "https://worldloom.local/schemas/adjudication-frontmatter.schema.json"
  );
});
