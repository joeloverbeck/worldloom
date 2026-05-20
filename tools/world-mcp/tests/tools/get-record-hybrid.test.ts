import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { getRecord } from "../../src/tools/get-record.js";

import { createTempRepoRoot, destroyTempRepoRoot, seedWorld, withRepoRoot } from "./_shared.js";

const CHAR_FILE_BODY = [
  "---",
  "character_id: CHAR-0001",
  "slug: vespera-nightwhisper",
  "name: Vespera Nightwhisper",
  "world_consistency:",
  "  invariants_respected:",
  "    - ONT-1",
  "    - SOC-2",
  "  mystery_reserve_firewall:",
  "    - M-1",
  "    - M-2",
  "  canon_facts_consulted:",
  "    - CF-0001",
  "author_profile:",
  "  voice_register: weary-cadenced",
  "  embodiment: hare-folk",
  "---",
  "# Vespera Nightwhisper",
  "",
  "## Material Reality",
  "",
  "She lives in the salt port and walks the harbor each dawn.",
  "",
  "## Capabilities",
  "",
  "- verse-keeping in the trade-tongue register",
  "- weather-reading from gull patterns",
  "",
  "## Voice and Perception",
  "",
  "Her interior register is salt-spare and short-clause.",
  ""
].join("\n");

const DA_FILE_BODY = [
  "---",
  "artifact_id: DA-0001",
  "slug: harbor-letter",
  "title: Harbor Letter",
  "author: Anonymous Salt-Clerk",
  "world_consistency:",
  "  invariants_respected:",
  "    - DIS-1",
  "  mystery_reserve_firewall: []",
  "  canon_facts_consulted:",
  "    - CF-0001",
  "---",
  "# Harbor Letter",
  "",
  "## Body",
  "",
  "Sirs, the salt has been counted.",
  ""
].join("\n");

const PA_FILE_BODY = [
  "---",
  "pa_id: PA-0001",
  "verdict: accept",
  "summary: Brinewick fact accepted.",
  "---",
  "# PA-0001 — accept",
  "",
  "## Adjudication Notes",
  "",
  "The proposal was accepted on first pass.",
  ""
].join("\n");

const NCP_FILE_BODY = [
  "---",
  "proposal_id: NCP-0001",
  "slug: brinewick-salt-apprentice",
  "title: Brinewick Salt Apprentice",
  "memorability_profile:",
  "  niche_pressure: beloved institutional monster",
  "  dramatic_hook: keeps the harbor's impossible ledgers",
  "  signature_scene_behaviors:",
  "    - recites tariff law to gulls",
  "---",
  "# Brinewick Salt Apprentice",
  "",
  "## Character Seed",
  "",
  "A ledger-keeper whose social power comes from making boring rules memorable.",
  "",
  "## Rejected Directions Audit",
  "",
  "- Generic orphan thief rejected because the harbor institution must stay load-bearing.",
  ""
].join("\n");

const NCB_FILE_BODY = [
  "---",
  "batch_id: NCB-0001",
  "world_slug: seeded",
  "summary: Brinewick supporting cast proposals",
  "card_ids:",
  "  - NCP-0001",
  "---",
  "# NCB-0001",
  "",
  "## Batch Brief",
  "",
  "Generate harbor characters whose pressures come from institutions.",
  ""
].join("\n");

const OVERSIZE_DA_FILE_BODY = [
  "---",
  "artifact_id: DA-0002",
  "slug: large-harbor-journal",
  "title: Large Harbor Journal",
  "author_profile:",
  "  voice_register: ledger-heavy",
  "claim_map:",
  "  major_claims:",
  "    - CF-0001",
  "epistemic_horizon:",
  "  knows_firsthand:",
  "    - Harbor inventory",
  "---",
  "# Large Harbor Journal",
  "",
  "## 18 April",
  "",
  "Cargo tally. ".repeat(140),
  "",
  "## 19 April",
  "",
  "Harbor rumor. ".repeat(140),
  ""
].join("\n");

function sha256(input: string): string {
  return createHash("sha256").update(input.normalize("NFC"), "utf8").digest("hex");
}

function buildSeededHybridWorld(root: string): void {
  seedWorld(root, {
    worldSlug: "seeded",
    nodes: [
      {
        node_id: "CHAR-0001",
        world_slug: "seeded",
        file_path: "characters/vespera-nightwhisper.md",
        node_type: "character_record",
        body: CHAR_FILE_BODY
      },
      {
        node_id: "DA-0001",
        world_slug: "seeded",
        file_path: "diegetic-artifacts/harbor-letter.md",
        node_type: "diegetic_artifact_record",
        body: DA_FILE_BODY
      },
      {
        node_id: "PA-0001",
        world_slug: "seeded",
        file_path: "adjudications/PA-0001-accept.md",
        node_type: "adjudication_record",
        body: PA_FILE_BODY
      },
      {
        node_id: "NCP-0001",
        world_slug: "seeded",
        file_path: "character-proposals/NCP-0001.md",
        node_type: "character_proposal_card",
        body: NCP_FILE_BODY
      },
      {
        node_id: "NCB-0001",
        world_slug: "seeded",
        file_path: "character-proposals/batches/NCB-0001.md",
        node_type: "character_proposal_batch",
        body: NCB_FILE_BODY
      }
    ]
  });
}

test("get-record-hybrid returns parsed frontmatter and body sections for CHAR records", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededHybridWorld(root);

    const result = await withRepoRoot(root, () =>
      getRecord({ record_id: "CHAR-0001", world_slug: "seeded" })
    );

    assert.ok("frontmatter" in result, "expected hybrid full response shape");
    assert.equal(result.record_kind, "character");
    assert.equal(result.record_id, "CHAR-0001");
    assert.equal(result.file_path, "characters/vespera-nightwhisper.md");
    assert.equal(result.content_hash, sha256(CHAR_FILE_BODY));
    assert.equal(result.frontmatter.character_id, "CHAR-0001");
    assert.deepEqual(
      (result.frontmatter.world_consistency as Record<string, unknown>).invariants_respected,
      ["ONT-1", "SOC-2"]
    );
    assert.ok(result.body_sections["Material Reality"]?.includes("salt port"));
    assert.ok(result.body_sections["Capabilities"]?.includes("verse-keeping"));
    assert.ok(result.body_sections["Voice and Perception"]?.includes("salt-spare"));
    assert.ok(result.body_sections["Vespera Nightwhisper"] !== undefined);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("get-record-hybrid returns parsed shape for DA records", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededHybridWorld(root);

    const result = await withRepoRoot(root, () =>
      getRecord({ record_id: "DA-0001", world_slug: "seeded" })
    );

    assert.ok("frontmatter" in result, "expected hybrid full response shape");
    assert.equal(result.record_kind, "diegetic_artifact");
    assert.equal(result.frontmatter.artifact_id, "DA-0001");
    assert.ok(result.body_sections["Body"]?.includes("salt has been counted"));
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("get-record-hybrid returns parsed shape for PA records", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededHybridWorld(root);

    const result = await withRepoRoot(root, () =>
      getRecord({ record_id: "PA-0001", world_slug: "seeded" })
    );

    assert.ok("frontmatter" in result, "expected hybrid full response shape");
    assert.equal(result.record_kind, "adjudication");
    assert.equal(result.frontmatter.pa_id, "PA-0001");
    assert.equal(result.frontmatter.verdict, "accept");
    assert.ok(result.body_sections["Adjudication Notes"]?.includes("first pass"));
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("get-record-hybrid returns parsed shape and section projections for NCP records", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededHybridWorld(root);

    const result = await withRepoRoot(root, () =>
      getRecord({ record_id: "NCP-0001", world_slug: "seeded" })
    );

    assert.ok("frontmatter" in result, "expected hybrid full response shape");
    assert.equal(result.record_kind, "character_proposal_card");
    assert.equal(result.record_id, "NCP-0001");
    assert.equal(result.file_path, "character-proposals/NCP-0001.md");
    assert.equal(result.content_hash, sha256(NCP_FILE_BODY));
    assert.equal(result.frontmatter.proposal_id, "NCP-0001");
    assert.equal(
      (result.frontmatter.memorability_profile as Record<string, unknown>).niche_pressure,
      "beloved institutional monster"
    );
    assert.ok(result.body_sections["Character Seed"]?.includes("ledger-keeper"));

    const projected = await withRepoRoot(root, () =>
      getRecord({
        record_id: "NCP-0001",
        world_slug: "seeded",
        section_path: "frontmatter.memorability_profile"
      })
    );

    assert.ok("section_path" in projected, "expected section response shape");
    assert.equal(projected.record_kind, "character_proposal_card");
    assert.deepEqual(projected.value, {
      niche_pressure: "beloved institutional monster",
      dramatic_hook: "keeps the harbor's impossible ledgers",
      signature_scene_behaviors: ["recites tariff law to gulls"]
    });
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("get-record-hybrid returns parsed shape for NCB records", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededHybridWorld(root);

    const result = await withRepoRoot(root, () =>
      getRecord({ record_id: "NCB-0001", world_slug: "seeded" })
    );

    assert.ok("frontmatter" in result, "expected hybrid full response shape");
    assert.equal(result.record_kind, "character_proposal_batch");
    assert.equal(result.frontmatter.batch_id, "NCB-0001");
    assert.deepEqual(result.frontmatter.card_ids, ["NCP-0001"]);
    assert.ok(result.body_sections["Batch Brief"]?.includes("harbor characters"));
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("get-record-hybrid persists oversized hybrid responses with projection suggestions", async () => {
  const root = createTempRepoRoot();
  const originalCeiling = process.env.WORLDLOOM_MCP_HARNESS_CEILING_CHARS;
  const originalResultsDir = process.env.WORLDLOOM_MCP_TOOL_RESULTS_DIR;
  process.env.WORLDLOOM_MCP_HARNESS_CEILING_CHARS = "5000";
  process.env.WORLDLOOM_MCP_TOOL_RESULTS_DIR = path.join(root, "tool-results");

  try {
    seedWorld(root, {
      worldSlug: "seeded",
      nodes: [
        {
          node_id: "DA-0002",
          world_slug: "seeded",
          file_path: "diegetic-artifacts/large-harbor-journal.md",
          node_type: "diegetic_artifact_record",
          body: OVERSIZE_DA_FILE_BODY
        }
      ]
    });

    const result = await withRepoRoot(root, () =>
      getRecord({ record_id: "DA-0002", world_slug: "seeded" })
    );

    assert.ok("delivery_status" in result, "expected oversize response shape");
    assert.equal(result.delivery_status, "oversize_with_projection_suggestions");
    assert.equal(result.record_kind, "diegetic_artifact");
    assert.ok(result.total_chars > result.response_cap_chars);
    assert.equal(result.response_cap_chars, 1000);
    assert.ok(
      JSON.stringify(result, null, 2).length <= result.response_cap_chars,
      "oversize recovery response must fit the effective cap"
    );
    assert.match(
      result.persisted_output_path,
      /tool-results\/.*-seeded-get_record-DA-0002-[0-9a-f-]+\.json$/
    );
    assert.ok(existsSync(result.persisted_output_path));
    assert.ok(result.suggested_section_paths.includes("frontmatter"));
    assert.ok(result.suggested_section_paths.includes("frontmatter.author_profile"));
    assert.ok(result.suggested_section_paths.includes("frontmatter.claim_map"));
    assert.ok(result.suggested_section_paths.includes("frontmatter.epistemic_horizon"));
    assert.ok(result.suggested_section_paths.includes("body.18 April"));
    assert.ok(result.suggested_section_paths.includes("body.19 April"));

    const persisted = JSON.parse(readFileSync(result.persisted_output_path, "utf8"));
    assert.equal(persisted.record_id, "DA-0002");
    assert.equal(persisted.record_kind, "diegetic_artifact");
    assert.ok(persisted.body_sections["18 April"].includes("Cargo tally."));

    const projected = await withRepoRoot(root, () =>
      getRecord({
        record_id: "DA-0002",
        world_slug: "seeded",
        section_path: "body.18 April"
      })
    );

    assert.ok("section_path" in projected, "expected section response shape");
    assert.equal(projected.section_path, "body.18 April");
    assert.ok(typeof projected.value === "string");
    assert.ok(projected.value.includes("Cargo tally."));
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

test("get-record-hybrid resolves a hybrid record id without world_slug", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededHybridWorld(root);

    const result = await withRepoRoot(root, () => getRecord({ record_id: "CHAR-0001" }));

    assert.ok("record_kind" in result);
    assert.equal(result.record_kind, "character");
    assert.equal(result.record_id, "CHAR-0001");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("get-record-hybrid does not regress atomic dispatch", async () => {
  const root = createTempRepoRoot();

  try {
    seedWorld(root, {
      worldSlug: "seeded",
      nodes: [
        {
          node_id: "CF-0001",
          world_slug: "seeded",
          file_path: "_source/canon/CF-0001.yaml",
          node_type: "canon_fact_record",
          body: [
            "id: CF-0001",
            "title: Brinewick Fact",
            "status: hard_canon",
            "type: geography",
            "statement: Brinewick anchors the western salt trade.",
            "scope:",
            "  geographic: regional",
            "  temporal: current",
            "  social: public",
            "truth_scope:",
            "  world_level: true",
            "  diegetic_status: objective",
            "domains_affected:",
            "  - geography",
            "required_world_updates:",
            "  - GEOGRAPHY.md",
            "source_basis:",
            "  direct_user_approval: true",
            ""
          ].join("\n")
        }
      ]
    });

    const result = await withRepoRoot(root, () =>
      getRecord({ record_id: "CF-0001", world_slug: "seeded" })
    );

    assert.ok("record" in result, "expected atomic response shape");
    assert.equal(result.record.record_kind, "canon_fact");
    assert.equal(result.record.title, "Brinewick Fact");
  } finally {
    destroyTempRepoRoot(root);
  }
});
