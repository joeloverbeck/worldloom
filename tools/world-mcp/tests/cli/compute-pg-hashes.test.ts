import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { computePgStateHash } from "../../src/package-interop.js";

import { runComputePgHashesCli } from "../../src/cli/compute-pg-hashes.js";

function makeTmpDir(): string {
  return mkdtempSync(path.join(os.tmpdir(), "world-mcp-cli-compute-pg-hashes-"));
}

function writeText(dir: string, name: string, value: string): string {
  const filePath = path.join(dir, name);
  writeFileSync(filePath, value, "utf8");
  return filePath;
}

test("cli-compute-pg-hashes: --help prints usage to stdout and exits 0", async () => {
  const result = await runComputePgHashesCli(["--help"]);

  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /Usage: compute-pg-hashes/);
  assert.equal(result.stderr, "");
});

test("cli-compute-pg-hashes: missing args exit 2 with usage", async () => {
  const result = await runComputePgHashesCli([]);

  assert.equal(result.exitCode, 2);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /--pg <path> is required/);
  assert.match(result.stderr, /Usage: compute-pg-hashes/);
});

test("cli-compute-pg-hashes: reports missing PG files", async () => {
  const result = await runComputePgHashesCli(["--pg", "/tmp/worldloom-missing-pg.json"]);

  assert.equal(result.exitCode, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /Failed to read PG file/);
});

test("cli-compute-pg-hashes: reports malformed JSON", async () => {
  const tmp = makeTmpDir();
  try {
    const pgPath = writeText(tmp, "PG-2.json", '{"id": "PG-2", "plan": ');

    const result = await runComputePgHashesCli(["--pg", pgPath]);

    assert.equal(result.exitCode, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /must be valid JSON/);
    assert.match(result.stderr, /no longer accepts YAML input/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("cli-compute-pg-hashes: computes state_hash from a JSON PG draft", async () => {
  const tmp = makeTmpDir();
  try {
    const pgObject = {
      id: "PG-2",
      story_id: "STORY-1",
      state_hash: "placeholder",
      validation_trace: {
        input_legality: "PASS: checked",
        branch_isolation: "PASS: checked"
      }
    };
    const pgPath = writeText(
      tmp,
      "PG-2.json",
      `${JSON.stringify(pgObject, null, 2)}\n`
    );

    const result = await runComputePgHashesCli(["--pg", pgPath]);
    const output = JSON.parse(result.stdout) as { state_hash: string; plan_hash?: string };
    const expectedStateHash = computePgStateHash(pgObject);

    assert.equal(result.exitCode, 0);
    assert.equal(result.stderr, "");
    assert.equal(output.plan_hash, undefined);
    assert.equal(output.state_hash, expectedStateHash);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("cli-compute-pg-hashes: rejects YAML PG drafts before hashing", async () => {
  const tmp = makeTmpDir();
  try {
    const yamlPath = writeText(
      tmp,
      "PG-5.yaml",
      [
        "record_kind: page_record",
        "id: PG-5",
        "story_id: STORY-1",
        "branch_id: BR-1",
        "parent_page_id: PG-4",
        "branch_path:",
        "  - PG-1",
        "  - PG-4",
        "  - PG-5",
        "turn_index: 4",
        "input:",
        "  choice_id: CHC-16",
        "  manual_action_text: null",
        "  resolved_event_id: SE-5",
        "state_hash_parent: 2a0047483b2b87c63fef1b6cf107e0750cdbddc24d22c7655cd567d578754049",
        "state_hash: placeholder",
        "state_snapshot:",
        "  canon_revision: CH-9",
        "  active_records:",
        "    BEL:",
        "      - BEL-1",
        "      - BEL-12",
        "    CLK:",
        "      - CLK-3",
        "  visible_affordances:",
        "    - ordinal: 0",
        "      label: \"Ane at the cafetería threshold — speak again or wait\"",
        "      grounded_in:",
        "        - STLOC-2",
        "      available_to:",
        "        - STENT-1",
        "      action_families:",
        "        - communicate",
        "        - wait",
        "plan:",
        "  plan_hash: placeholder",
        "prose_plan_path: pages-prose-plans/PG-5.md",
        "emitted_choices:",
        "  - CHC-17",
        "validation_trace:",
        "  branch_isolation: \"PASS: kept observer scope; CLK-2 -> CLK-3 remains grounded.\"",
        "  world_logic_rationale: |",
        "    PASS: multi-line rationale keeps exact JSON newline bytes.",
        "    Unicode stays authored: → and — are not normalized.",
        ""
      ].join("\n")
    );
    const yamlResult = await runComputePgHashesCli(["--pg", yamlPath]);

    assert.equal(yamlResult.exitCode, 1);
    assert.equal(yamlResult.stdout, "");
    assert.match(yamlResult.stderr, /must be valid JSON/);
    assert.match(yamlResult.stderr, /no longer accepts YAML input/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("cli-compute-pg-hashes: equivalent envelope JSON produces direct helper state hash", async () => {
  const tmp = makeTmpDir();
  try {
    const pgObject = {
      record_kind: "page_record",
      id: "PG-5",
      story_id: "STORY-1",
      branch_id: "BR-1",
      parent_page_id: "PG-4",
      branch_path: ["PG-1", "PG-4", "PG-5"],
      turn_index: 4,
      input: {
        choice_id: "CHC-16",
        manual_action_text: null,
        resolved_event_id: "SE-5"
      },
      state_hash_parent: "2a0047483b2b87c63fef1b6cf107e0750cdbddc24d22c7655cd567d578754049",
      state_hash: "placeholder",
      state_snapshot: {
        canon_revision: "CH-9",
        active_records: {
          BEL: ["BEL-1", "BEL-12"],
          CLK: ["CLK-3"]
        },
        visible_affordances: [
          {
            ordinal: 0,
            label: "Ane at the cafetería threshold — speak again or wait",
            grounded_in: ["STLOC-2"],
            available_to: ["STENT-1"],
            action_families: ["communicate", "wait"]
          }
        ]
      },
      emitted_choices: ["CHC-17"],
      validation_trace: {
        branch_isolation: "PASS: kept observer scope; CLK-2 -> CLK-3 remains grounded.",
        world_logic_rationale:
          "PASS: multi-line rationale keeps exact JSON newline bytes.\nUnicode stays authored: → and — are not normalized.\n"
      }
    };
    const jsonPath = writeText(tmp, "PG-5-from-envelope.json", `${JSON.stringify(pgObject, null, 2)}\n`);

    const result = await runComputePgHashesCli(["--pg", jsonPath]);
    const output = JSON.parse(result.stdout) as { state_hash: string; plan_hash?: string };

    assert.equal(result.exitCode, 0);
    assert.equal(result.stderr, "");
    assert.equal(output.plan_hash, undefined);
    assert.equal(
      output.state_hash,
      computePgStateHash(pgObject)
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("cli-compute-pg-hashes: accepts planless PG drafts", async () => {
  const tmp = makeTmpDir();
  try {
    const pgRecord = { id: "PG-7", state_hash: "placeholder", emitted_choices: [] };
    const pgPath = writeText(
      tmp,
      "PG-7.json",
      `${JSON.stringify(pgRecord, null, 2)}\n`
    );

    const result = await runComputePgHashesCli(["--pg", pgPath]);
    const output = JSON.parse(result.stdout) as { state_hash: string };

    assert.equal(result.exitCode, 0);
    assert.equal(result.stderr, "");
    assert.equal(output.state_hash, computePgStateHash(pgRecord));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
