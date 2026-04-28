import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import test from "node:test";

import { getRecord } from "../../src/tools/get-record";

import { createTempRepoRoot, destroyTempRepoRoot, seedWorld, withRepoRoot } from "./_shared";

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
