import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { createTempRepoRoot, destroyTempRepoRoot } from "./_shared";

import { OPERATION_KINDS } from "@worldloom/patch-engine";

import { describeEnvelopeSchema } from "../../src/tools/describe-envelope-schema";

async function withHarnessCeiling<T>(ceiling: string, run: () => Promise<T>): Promise<T> {
  const originalCeiling = process.env.WORLDLOOM_MCP_HARNESS_CEILING_CHARS;
  try {
    process.env.WORLDLOOM_MCP_HARNESS_CEILING_CHARS = ceiling;
    return await run();
  } finally {
    if (originalCeiling === undefined) {
      delete process.env.WORLDLOOM_MCP_HARNESS_CEILING_CHARS;
    } else {
      process.env.WORLDLOOM_MCP_HARNESS_CEILING_CHARS = originalCeiling;
    }
  }
}

test("describeEnvelopeSchema returns the full envelope and every operation schema when it fits inline", async () => {
  const manifest = await withHarnessCeiling("1000000", () => describeEnvelopeSchema({}));

  assert.equal(manifest.delivery_status, "inline");
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
  assert.ok(allocations.properties?.bel_ids);
  assert.equal(allocations.properties?.arc_trace_ids, undefined);
});

test("describeEnvelopeSchema exposes create_bel_record wrapper schema", async () => {
  const manifest = await describeEnvelopeSchema({ op_kind: "create_bel_record" });

  assert.equal(manifest.delivery_status, "inline");
  assert.deepEqual(Object.keys(manifest.op_schemas), ["create_bel_record"]);

  const schema = manifest.op_schemas.create_bel_record!;
  const properties = schema.properties as Record<string, unknown>;
  assert.deepEqual(properties.op, { const: "create_bel_record" });

  const payload = properties.payload as {
    required?: string[];
    properties?: {
      story_slug?: { pattern?: string };
      record?: { required?: string[]; properties?: { id?: { pattern?: string } } };
    };
  };
  assert.deepEqual(payload.required, ["story_slug", "record"]);
  assert.equal(payload.properties?.story_slug?.pattern, "^[a-z0-9-]+$");
  assert.deepEqual(payload.properties?.record?.required, ["id"]);
  assert.equal(payload.properties?.record?.properties?.id?.pattern, "^BEL-[0-9]+$");
});

test("describeEnvelopeSchema exposes create_ststat_record wrapper schema", async () => {
  const manifest = await describeEnvelopeSchema({ op_kind: "create_ststat_record" });

  assert.equal(manifest.delivery_status, "inline");
  assert.deepEqual(Object.keys(manifest.op_schemas), ["create_ststat_record"]);

  const schema = manifest.op_schemas.create_ststat_record!;
  const properties = schema.properties as Record<string, unknown>;
  assert.deepEqual(properties.op, { const: "create_ststat_record" });

  const payload = properties.payload as {
    required?: string[];
    properties?: {
      story_slug?: { pattern?: string };
      record?: { $ref?: string };
    };
  };
  assert.deepEqual(payload.required, ["story_slug", "record"]);
  assert.equal(payload.properties?.story_slug?.pattern, "^[a-z0-9-]+$");
  assert.equal(payload.properties?.record?.$ref, "https://worldloom.local/schemas/story-status.schema.json");
  assert.equal(
    manifest.referenced_schemas["https://worldloom.local/schemas/story-status.schema.json"]?.$id,
    "https://worldloom.local/schemas/story-status.schema.json"
  );
});

test("describeEnvelopeSchema filters to one op kind and exposes CF payload schema", async () => {
  const manifest = await describeEnvelopeSchema({ op_kind: "create_cf_record" });

  assert.equal(manifest.delivery_status, "inline");
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
  assert.equal(updateManifest.delivery_status, "inline");
  const updateProperties = updateManifest.op_schemas.update_record_field!.properties as Record<string, unknown>;
  const updatePayload = updateProperties.payload as {
    properties?: Record<string, { enum?: string[]; oneOf?: unknown[]; properties?: Record<string, { pattern?: string }> }>;
  };
  assert.deepEqual(updatePayload.properties?.operation?.enum, ["set", "append_list", "append_text"]);
  const retconAttestation = updatePayload.properties?.retcon_attestation;
  assert.equal(retconAttestation?.properties?.originating_ch?.pattern, "^CH-[0-9]+$");
  assert.equal(retconAttestation?.properties?.originating_se?.pattern, "^SE-[0-9]+$");
  assert.equal(retconAttestation?.oneOf?.length, 2);

  const repairManifest = await describeEnvelopeSchema({ op_kind: "repair_skipped_change_log_entry" });
  assert.equal(repairManifest.delivery_status, "inline");
  const repairProperties = repairManifest.op_schemas.repair_skipped_change_log_entry!.properties as Record<
    string,
    unknown
  >;
  const repairPayload = repairProperties.payload as {
    required?: string[];
    properties?: { target_ch_id?: { pattern?: string }; repaired_record?: { $ref?: string } };
  };
  assert.deepEqual(repairPayload.required, ["target_ch_id", "repaired_record", "repair_reason"]);
  assert.equal(repairPayload.properties?.target_ch_id?.pattern, "^CH-[0-9]+$");
  assert.equal(repairPayload.properties?.repaired_record?.$ref, "https://worldloom.local/schemas/change-log-entry.schema.json");

  const removeAliasManifest = await describeEnvelopeSchema({ op_kind: "remove_ch_affected_cf_ids" });
  assert.equal(removeAliasManifest.delivery_status, "inline");
  const removeAliasProperties = removeAliasManifest.op_schemas.remove_ch_affected_cf_ids!.properties as Record<
    string,
    unknown
  >;
  const removeAliasPayload = removeAliasProperties.payload as {
    required?: string[];
    properties?: { target_ch_id?: { pattern?: string } };
  };
  assert.deepEqual(removeAliasPayload.required, ["target_ch_id"]);
  assert.equal(removeAliasPayload.properties?.target_ch_id?.pattern, "^CH-[0-9]+$");

  const adjudicationManifest = await describeEnvelopeSchema({ op_kind: "append_adjudication_record" });
  assert.equal(adjudicationManifest.delivery_status, "inline");
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

test("describeEnvelopeSchema persists the unfiltered manifest and returns op-kind summary when over ceiling", async () => {
  const root = createTempRepoRoot();
  const originalCeiling = process.env.WORLDLOOM_MCP_HARNESS_CEILING_CHARS;
  const originalResultsDir = process.env.WORLDLOOM_MCP_TOOL_RESULTS_DIR;
  const resultsDir = path.join(root, "tool-results");

  try {
    mkdirSync(resultsDir, { recursive: true });
    process.env.WORLDLOOM_MCP_HARNESS_CEILING_CHARS = "9000";
    process.env.WORLDLOOM_MCP_TOOL_RESULTS_DIR = resultsDir;

    const manifest = await describeEnvelopeSchema({});

    assert.equal(manifest.delivery_status, "persisted_with_summary");
    assert.match(manifest.persisted_output_path, /tool-results\/.*describe_envelope_schema-all-.*\.json$/);
    assert.equal(manifest.summary.tool, "describe_envelope_schema");
    assert.equal(manifest.summary.op_kind_filter, null);
    assert.deepEqual(manifest.summary.available_op_kinds, [...OPERATION_KINDS]);
    assert.ok(manifest.summary.suggested_slice_paths.includes("op_schemas.create_cf_record"));

    const persisted = JSON.parse(readFileSync(manifest.persisted_output_path, "utf8")) as {
      delivery_status?: string;
      op_schemas?: Record<string, unknown>;
    };
    assert.equal(persisted.delivery_status, "inline");
    assert.deepEqual(Object.keys(persisted.op_schemas ?? {}).sort(), [...OPERATION_KINDS].sort());
  } finally {
    if (originalCeiling === undefined) {
      delete process.env.WORLDLOOM_MCP_HARNESS_CEILING_CHARS;
    } else {
      process.env.WORLDLOOM_MCP_HARNESS_CEILING_CHARS = originalCeiling;
    }
    if (originalResultsDir === undefined) {
      delete process.env.WORLDLOOM_MCP_TOOL_RESULTS_DIR;
    } else {
      process.env.WORLDLOOM_MCP_TOOL_RESULTS_DIR = originalResultsDir;
    }
    destroyTempRepoRoot(root);
  }
});
