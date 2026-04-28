import assert from "node:assert/strict";
import test from "node:test";

import { getRecord } from "../../src/tools/get-record";

import { createTempRepoRoot, destroyTempRepoRoot, seedWorld, withRepoRoot } from "./_shared";

const CHAR_FILE_BODY = [
  "---",
  "character_id: CHAR-0003",
  "slug: namahan-of-the-third-gate",
  "name: Namahan of the Third Gate",
  "world_consistency:",
  "  invariants_respected:",
  "    - ONT-1",
  "    - SOC-2",
  "    - AES-1",
  "  mystery_reserve_firewall:",
  "    - M-1",
  "    - M-7",
  "  canon_facts_consulted:",
  "    - CF-0044",
  "    - CF-0046",
  "author_profile:",
  "  voice_register: drylands gate-turn cadence",
  "  embodiment: hare-folk drylands-adapted",
  "---",
  "# Namahan of the Third Gate",
  "",
  "## Material Reality",
  "",
  "She holds the Third Gate well-stop on the drylands corridor.",
  "",
  "## Capabilities",
  "",
  "- verse-keeping in the trade-tongue register",
  "- station-log keeping in DIS-2 trade-tongue",
  "",
  "## Voice and Perception",
  "",
  "Her register is short-clause and worn-leather sober.",
  ""
].join("\n");

function buildSeededHybridWorld(root: string): void {
  seedWorld(root, {
    worldSlug: "seeded",
    nodes: [
      {
        node_id: "CHAR-0003",
        world_slug: "seeded",
        file_path: "characters/namahan-of-the-third-gate.md",
        node_type: "character_record",
        body: CHAR_FILE_BODY
      }
    ]
  });
}

test("get-record-section-path projects a frontmatter block", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededHybridWorld(root);

    const result = await withRepoRoot(root, () =>
      getRecord({
        record_id: "CHAR-0003",
        world_slug: "seeded",
        section_path: "frontmatter.world_consistency"
      })
    );

    assert.ok("section_path" in result, "expected section response shape");
    assert.equal(result.section_path, "frontmatter.world_consistency");
    assert.equal(result.record_kind, "character");
    assert.deepEqual(result.value, {
      invariants_respected: ["ONT-1", "SOC-2", "AES-1"],
      mystery_reserve_firewall: ["M-1", "M-7"],
      canon_facts_consulted: ["CF-0044", "CF-0046"]
    });
    assert.equal(result.content_hash.length, 64);
    assert.equal(result.file_path, "characters/namahan-of-the-third-gate.md");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("get-record-section-path projects a nested frontmatter field", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededHybridWorld(root);

    const result = await withRepoRoot(root, () =>
      getRecord({
        record_id: "CHAR-0003",
        world_slug: "seeded",
        section_path: "frontmatter.world_consistency.canon_facts_consulted"
      })
    );

    assert.ok("section_path" in result, "expected section response shape");
    assert.deepEqual(result.value, ["CF-0044", "CF-0046"]);
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("get-record-section-path projects a body section by heading", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededHybridWorld(root);

    const result = await withRepoRoot(root, () =>
      getRecord({
        record_id: "CHAR-0003",
        world_slug: "seeded",
        section_path: "body.Capabilities"
      })
    );

    assert.ok("section_path" in result, "expected section response shape");
    assert.ok(typeof result.value === "string");
    assert.ok((result.value as string).includes("verse-keeping"));
    assert.ok((result.value as string).includes("station-log"));
    assert.ok(!(result.value as string).startsWith("## "), "section value must not include the heading line");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("get-record-section-path-missing returns section_not_found with valid_paths hint", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededHybridWorld(root);

    const result = await withRepoRoot(root, () =>
      getRecord({
        record_id: "CHAR-0003",
        world_slug: "seeded",
        section_path: "body.NonExistentSection"
      })
    );

    assert.ok("code" in result);
    assert.equal(result.code, "section_not_found");
    assert.equal(result.details?.section_path, "body.NonExistentSection");
    assert.equal(result.details?.record_id, "CHAR-0003");
    const validPaths = result.details?.valid_paths;
    assert.ok(Array.isArray(validPaths));
    assert.ok((validPaths as string[]).includes("body.Capabilities"));
    assert.ok((validPaths as string[]).includes("frontmatter.world_consistency"));
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("get-record-section-path returns section_not_found for missing nested frontmatter keys", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededHybridWorld(root);

    const result = await withRepoRoot(root, () =>
      getRecord({
        record_id: "CHAR-0003",
        world_slug: "seeded",
        section_path: "frontmatter.world_consistency.bogus"
      })
    );

    assert.ok("code" in result);
    assert.equal(result.code, "section_not_found");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("get-record-section-path rejects section_path on atomic record ids", async () => {
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
            "title: A Fact",
            "status: hard_canon",
            "type: geography",
            "statement: A fact.",
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
      getRecord({ record_id: "CF-0001", world_slug: "seeded", section_path: "frontmatter.x" })
    );

    assert.ok("code" in result);
    assert.equal(result.code, "invalid_input");
    assert.equal(result.details?.field, "section_path");
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("get-record-section-path rejects malformed dot-paths", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededHybridWorld(root);

    const malformed = ["nodot", "frontmatter.", ".body"];
    for (const sectionPath of malformed) {
      const result = await withRepoRoot(root, () =>
        getRecord({ record_id: "CHAR-0003", world_slug: "seeded", section_path: sectionPath })
      );

      assert.ok("code" in result, `expected error for section_path '${sectionPath}'`);
      assert.equal(result.code, "invalid_input");
      assert.equal(result.details?.field, "section_path");
    }
  } finally {
    destroyTempRepoRoot(root);
  }
});

test("get-record-section-path rejects unknown realms", async () => {
  const root = createTempRepoRoot();

  try {
    buildSeededHybridWorld(root);

    const result = await withRepoRoot(root, () =>
      getRecord({
        record_id: "CHAR-0003",
        world_slug: "seeded",
        section_path: "metadata.foo"
      })
    );

    assert.ok("code" in result);
    assert.equal(result.code, "invalid_input");
    assert.equal(result.details?.field, "section_path");
  } finally {
    destroyTempRepoRoot(root);
  }
});
