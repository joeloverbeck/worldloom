import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { createTempRepoRoot, destroyTempRepoRoot } from "./_shared.js";

import { OPERATION_KINDS } from "../../src/package-interop.js";

import { describeEnvelopeSchema } from "../../src/tools/describe-envelope-schema.js";

const PREDICATE_DSL_GRAMMAR_ID = "https://worldloom.local/schemas/predicate-dsl-grammar.schema.json";
const STCHAR_SCHEMA_PATH = path.resolve(
  process.cwd(),
  "../validators/src/schemas/story-character-authority.schema.json"
);

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
  assert.ok(allocations.properties?.stsec_ids);
  assert.ok(allocations.properties?.stq_ids);
  assert.ok(allocations.properties?.stplan_ids);
  assert.ok(allocations.properties?.stemo_ids);
  assert.equal(allocations.properties?.arc_trace_ids, undefined);
});

test("describeEnvelopeSchema exposes create_bel_record full BEL wrapper schema", async () => {
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
      record?: { $ref?: string; required?: string[]; properties?: { id?: { pattern?: string } } };
    };
  };
  assert.deepEqual(payload.required, ["story_slug", "record"]);
  assert.equal(payload.properties?.story_slug?.pattern, "^[a-z0-9-]+$");
  assert.equal(payload.properties?.record?.$ref, "https://worldloom.local/schemas/story-belief.schema.json");
  assert.equal(payload.properties?.record?.required, undefined);
  assert.equal(payload.properties?.record?.properties, undefined);

  const beliefSchema = manifest.referenced_schemas["https://worldloom.local/schemas/story-belief.schema.json"];
  assert.ok(beliefSchema);
  assert.deepEqual(beliefSchema.required, [
    "id",
    "story_id",
    "created_at_page",
    "holder",
    "claim",
    "belief_mode",
    "truth_relation",
    "confidence",
    "visibility",
    "basis",
    "consequences"
  ]);
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

test("describeEnvelopeSchema exposes STPLAN and STEMO wrapper schemas", async () => {
  const planManifest = await describeEnvelopeSchema({ op_kind: "create_stplan_record" });
  const emotionManifest = await describeEnvelopeSchema({ op_kind: "create_stemo_record" });

  assert.equal(planManifest.delivery_status, "inline");
  assert.equal(emotionManifest.delivery_status, "inline");

  const planProperties = planManifest.op_schemas.create_stplan_record!.properties as Record<string, unknown>;
  const planPayload = planProperties.payload as {
    required?: string[];
    properties?: { story_slug?: { pattern?: string }; record?: { $ref?: string } };
  };
  assert.deepEqual(planPayload.required, ["story_slug", "record"]);
  assert.equal(planPayload.properties?.story_slug?.pattern, "^[a-z0-9-]+$");
  assert.equal(planPayload.properties?.record?.$ref, "https://worldloom.local/schemas/story-plan.schema.json");
  assert.equal(
    planManifest.referenced_schemas["https://worldloom.local/schemas/story-plan.schema.json"]?.$id,
    "https://worldloom.local/schemas/story-plan.schema.json"
  );

  const emotionProperties = emotionManifest.op_schemas.create_stemo_record!.properties as Record<string, unknown>;
  const emotionPayload = emotionProperties.payload as {
    required?: string[];
    properties?: { story_slug?: { pattern?: string }; record?: { $ref?: string } };
  };
  assert.deepEqual(emotionPayload.required, ["story_slug", "record"]);
  assert.equal(emotionPayload.properties?.story_slug?.pattern, "^[a-z0-9-]+$");
  assert.equal(emotionPayload.properties?.record?.$ref, "https://worldloom.local/schemas/story-emotion.schema.json");
  assert.equal(
    emotionManifest.referenced_schemas["https://worldloom.local/schemas/story-emotion.schema.json"]?.$id,
    "https://worldloom.local/schemas/story-emotion.schema.json"
  );
});

test("describeEnvelopeSchema exposes SCN create and supersede wrapper schemas", async () => {
  const createManifest = await describeEnvelopeSchema({ op_kind: "create_scn_record" });
  const supersedeManifest = await describeEnvelopeSchema({ op_kind: "supersede_scn_record" });

  assert.equal(createManifest.delivery_status, "inline");
  assert.equal(supersedeManifest.delivery_status, "inline");

  for (const [kind, manifest] of [
    ["create_scn_record", createManifest],
    ["supersede_scn_record", supersedeManifest]
  ] as const) {
    const properties = manifest.op_schemas[kind]!.properties as Record<string, unknown>;
    const payload = properties.payload as {
      required?: string[];
      properties?: { story_slug?: { pattern?: string }; record?: { $ref?: string } };
    };
    assert.deepEqual(payload.required, ["story_slug", "record"]);
    assert.equal(payload.properties?.story_slug?.pattern, "^[a-z0-9-]+$");
    assert.equal(payload.properties?.record?.$ref, "https://worldloom.local/schemas/story-scene.schema.json");
    assert.equal(
      manifest.referenced_schemas["https://worldloom.local/schemas/story-scene.schema.json"]?.$id,
      "https://worldloom.local/schemas/story-scene.schema.json"
    );
  }
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
  assert.equal(manifest.referenced_schemas[PREDICATE_DSL_GRAMMAR_ID], undefined);
});

test("describeEnvelopeSchema includes predicate DSL grammar for storylet creation", async () => {
  const manifest = await describeEnvelopeSchema({ op_kind: "create_slt_record" });

  assert.equal(manifest.delivery_status, "inline");
  assert.deepEqual(Object.keys(manifest.op_schemas), ["create_slt_record"]);

  const storyletSchema = manifest.referenced_schemas["https://worldloom.local/schemas/story-storylet.schema.json"];
  assert.ok(storyletSchema);

  const predicateSchema = manifest.referenced_schemas[PREDICATE_DSL_GRAMMAR_ID] as {
    $id?: string;
    oneOf?: Array<{ title?: string; required?: string[]; properties?: { pred?: { const?: string } } }>;
  };
  assert.equal(predicateSchema.$id, PREDICATE_DSL_GRAMMAR_ID);
  assert.ok(predicateSchema.oneOf);
  assert.ok(predicateSchema.oneOf.length > 0);
  assert.ok(
    predicateSchema.oneOf.some(
      (entry) =>
        entry.title === "obligation_open" &&
        entry.properties?.pred?.const === "obligation_open" &&
        entry.required?.includes("obligation")
    )
  );
  assert.ok(
    predicateSchema.oneOf.some(
      (entry) =>
        entry.title === "consequence_pending" &&
        entry.properties?.pred?.const === "consequence_pending" &&
        entry.required?.includes("consequence")
    )
  );
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

  const stcharMaintenanceManifest = await describeEnvelopeSchema({
    op_kind: "remove_story_character_authority_frontmatter_field"
  });
  assert.equal(stcharMaintenanceManifest.delivery_status, "inline");
  const stcharMaintenanceProperties = stcharMaintenanceManifest.op_schemas
    .remove_story_character_authority_frontmatter_field!.properties as Record<string, unknown>;
  const stcharMaintenancePayload = stcharMaintenanceProperties.payload as {
    required?: string[];
    properties?: {
      target_record_id?: { pattern?: string };
      field_name?: { enum?: string[] };
    };
  };
  assert.deepEqual(stcharMaintenancePayload.required, ["story_slug", "target_record_id", "field_name"]);
  assert.equal(stcharMaintenancePayload.properties?.target_record_id?.pattern, "^STCHAR-(0|[1-9][0-9]*)$");
  assert.deepEqual(stcharMaintenancePayload.properties?.field_name?.enum, [
    "profile_hash",
    "voice_block_hash",
    "page_packet_hash",
    "source_char_hash"
  ]);
  const stcharBodyMaintenanceManifest = await describeEnvelopeSchema({
    op_kind: "remove_story_character_authority_body_hash_note_field"
  });
  assert.equal(stcharBodyMaintenanceManifest.delivery_status, "inline");
  const stcharBodyMaintenanceProperties = stcharBodyMaintenanceManifest.op_schemas
    .remove_story_character_authority_body_hash_note_field!.properties as Record<string, unknown>;
  const stcharBodyMaintenancePayload = stcharBodyMaintenanceProperties.payload as {
    required?: string[];
    properties?: {
      target_record_id?: { pattern?: string };
      field_name?: { enum?: string[] };
    };
  };
  assert.deepEqual(stcharBodyMaintenancePayload.required, ["story_slug", "target_record_id", "field_name"]);
  assert.equal(stcharBodyMaintenancePayload.properties?.target_record_id?.pattern, "^STCHAR-(0|[1-9][0-9]*)$");
  assert.deepEqual(stcharBodyMaintenancePayload.properties?.field_name?.enum, [
    "profile_hash",
    "voice_block_hash",
    "page_packet_hash",
    "source_char_hash"
  ]);
  const stcharBodyRepairManifest = await describeEnvelopeSchema({
    op_kind: "repair_story_character_authority_body_integrity"
  });
  assert.equal(stcharBodyRepairManifest.delivery_status, "inline");
  const stcharBodyRepairProperties = stcharBodyRepairManifest.op_schemas
    .repair_story_character_authority_body_integrity!.properties as Record<string, unknown>;
  const stcharBodyRepairPayload = stcharBodyRepairProperties.payload as {
    required?: string[];
    properties?: {
      target_record_id?: { pattern?: string };
      body_markdown?: { minLength?: number };
      source_operational_fact_map?: {
        minItems?: number;
        items?: { properties?: Record<string, { enum?: string[] }> };
      };
    };
  };
  assert.deepEqual(stcharBodyRepairPayload.required, [
    "story_slug",
    "target_record_id",
    "body_markdown",
    "source_operational_fact_map"
  ]);
  assert.equal(stcharBodyRepairPayload.properties?.target_record_id?.pattern, "^STCHAR-(0|[1-9][0-9]*)$");
  assert.equal(stcharBodyRepairPayload.properties?.body_markdown?.minLength, 1);
  assert.equal(stcharBodyRepairPayload.properties?.source_operational_fact_map?.minItems, 1);
  assert.ok(
    stcharBodyRepairPayload.properties?.source_operational_fact_map?.items?.properties?.source_field?.enum?.includes(
      "signature_scene_behaviors"
    )
  );
  const repairMapItem = stcharBodyRepairPayload.properties?.source_operational_fact_map?.items;
  const repairTargetEnum = retainedTargetSectionEnum(repairMapItem);
  const stcharRecordTargetEnum = retainedTargetSectionEnum(readStcharRecordSourceFactMapItem());
  assert.ok(repairTargetEnum.includes("Stable Persona Core"));
  assert.equal(repairTargetEnum.includes("Validation / Audit Anchors"), false);
  assert.deepEqual(repairTargetEnum, stcharRecordTargetEnum);
  const daClaimMapMaintenanceManifest = await describeEnvelopeSchema({
    op_kind: "repair_diegetic_artifact_claim_map_metadata"
  });
  assert.equal(daClaimMapMaintenanceManifest.delivery_status, "inline");
  const daClaimMapMaintenanceProperties = daClaimMapMaintenanceManifest.op_schemas
    .repair_diegetic_artifact_claim_map_metadata!.properties as Record<string, unknown>;
  const daClaimMapMaintenancePayload = daClaimMapMaintenanceProperties.payload as {
    required?: string[];
    properties?: {
      target_record_id?: { pattern?: string };
      claim_map_updates?: { minItems?: number; items?: { properties?: Record<string, unknown> } };
    };
  };
  assert.deepEqual(daClaimMapMaintenancePayload.required, ["target_record_id", "claim_map_updates"]);
  assert.equal(daClaimMapMaintenancePayload.properties?.target_record_id?.pattern, "^DA-[0-9]+$");
  const claimMapUpdateProperties = daClaimMapMaintenancePayload.properties?.claim_map_updates?.items?.properties as
    | Record<string, { const?: string; enum?: string[]; type?: string }>
    | undefined;
  assert.equal(daClaimMapMaintenancePayload.properties?.claim_map_updates?.minItems, 1);
  assert.equal(claimMapUpdateProperties?.expected_canon_status?.const, "canonically_true");
  assert.deepEqual(claimMapUpdateProperties?.canon_status?.enum, ["partially_true", "contested"]);
  assert.equal(claimMapUpdateProperties?.cf_id?.type, "null");
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

function readStcharRecordSourceFactMapItem(): unknown {
  const schema = JSON.parse(readFileSync(STCHAR_SCHEMA_PATH, "utf8")) as {
    properties?: {
      source_operational_fact_map?: {
        items?: unknown;
      };
    };
  };
  return schema.properties?.source_operational_fact_map?.items;
}

function retainedTargetSectionEnum(mapItem: unknown): string[] {
  const item = mapItem as {
    allOf?: Array<{
      then?: {
        properties?: {
          target_section?: {
            enum?: unknown[];
          };
        };
      };
    }>;
  };
  for (const condition of item.allOf ?? []) {
    const enumValues = condition.then?.properties?.target_section?.enum;
    if (Array.isArray(enumValues) && enumValues.every((value) => typeof value === "string")) {
      return enumValues;
    }
  }
  throw new Error("retained target_section enum not found");
}
