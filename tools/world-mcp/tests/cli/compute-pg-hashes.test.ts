import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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
  assert.match(result.stderr, /--plan <path> is required/);
  assert.match(result.stderr, /Usage: compute-pg-hashes/);
});

test("cli-compute-pg-hashes: reports missing plan and PG files", async () => {
  const result = await runComputePgHashesCli([
    "--plan",
    "/tmp/worldloom-missing-plan.md",
    "--pg",
    "/tmp/worldloom-missing-pg.json"
  ]);

  assert.equal(result.exitCode, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /Failed to read plan file/);
});

test("cli-compute-pg-hashes: reports malformed JSON", async () => {
  const tmp = makeTmpDir();
  try {
    const planPath = writeText(tmp, "PG-2.md", "Plan bytes\n");
    const pgPath = writeText(tmp, "PG-2.json", '{"id": "PG-2", "plan": ');

    const result = await runComputePgHashesCli(["--plan", planPath, "--pg", pgPath]);

    assert.equal(result.exitCode, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /must be valid JSON/);
    assert.match(result.stderr, /no longer accepts YAML input/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("cli-compute-pg-hashes: computes plan_hash and state_hash from a JSON PG draft", async () => {
  const tmp = makeTmpDir();
  try {
    const planBody = "Final page plan bytes.\nDo not normalize.\n";
    const planPath = writeText(tmp, "PG-2.md", planBody);
    const pgObject = {
      id: "PG-2",
      story_id: "STORY-1",
      state_hash: "placeholder",
      prose_plan_path: "pages-prose-plans/PG-2.md",
      plan: {
        plan_hash: "placeholder"
      },
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

    const result = await runComputePgHashesCli(["--plan", planPath, "--pg", pgPath]);
    const output = JSON.parse(result.stdout) as { plan_hash: string; state_hash: string };
    const expectedPlanHash = createHash("sha256")
      .update(Buffer.from(planBody, "utf8"))
      .digest("hex");
    const expectedStateHash = computePgStateHash({
      id: "PG-2",
      story_id: "STORY-1",
      state_hash: "placeholder",
      prose_plan_path: "pages-prose-plans/PG-2.md",
      plan: {
        plan_hash: expectedPlanHash
      },
      validation_trace: {
        input_legality: "PASS: checked",
        branch_isolation: "PASS: checked"
      }
    });

    assert.equal(result.exitCode, 0);
    assert.equal(result.stderr, "");
    assert.equal(output.plan_hash, expectedPlanHash);
    assert.equal(output.state_hash, expectedStateHash);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("cli-compute-pg-hashes: rejects YAML PG drafts before hashing", async () => {
  const tmp = makeTmpDir();
  try {
    const planBody = "Final PG-5 plan bytes.\nKeep every byte stable.\n";
    const planPath = writeText(tmp, "PG-5.md", planBody);
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
    const yamlResult = await runComputePgHashesCli(["--plan", planPath, "--pg", yamlPath]);

    assert.equal(yamlResult.exitCode, 1);
    assert.equal(yamlResult.stdout, "");
    assert.match(yamlResult.stderr, /must be valid JSON/);
    assert.match(yamlResult.stderr, /no longer accepts YAML input/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("cli-compute-pg-hashes: equivalent envelope JSON produces direct helper hashes", async () => {
  const tmp = makeTmpDir();
  try {
    const planBody = "Final PG-5 plan bytes.\nKeep every byte stable.\n";
    const planPath = writeText(tmp, "PG-5.md", planBody);
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
      plan: {
        plan_hash: "placeholder"
      },
      prose_plan_path: "pages-prose-plans/PG-5.md",
      emitted_choices: ["CHC-17"],
      validation_trace: {
        branch_isolation: "PASS: kept observer scope; CLK-2 -> CLK-3 remains grounded.",
        world_logic_rationale:
          "PASS: multi-line rationale keeps exact JSON newline bytes.\nUnicode stays authored: → and — are not normalized.\n"
      }
    };
    const jsonPath = writeText(tmp, "PG-5-from-envelope.json", `${JSON.stringify(pgObject, null, 2)}\n`);

    const result = await runComputePgHashesCli(["--plan", planPath, "--pg", jsonPath]);
    const output = JSON.parse(result.stdout) as { plan_hash: string; state_hash: string };
    const expectedPlanHash = createHash("sha256")
      .update(Buffer.from(planBody, "utf8"))
      .digest("hex");

    assert.equal(result.exitCode, 0);
    assert.equal(result.stderr, "");
    assert.equal(output.plan_hash, expectedPlanHash);
    assert.equal(
      output.state_hash,
      computePgStateHash({
        ...pgObject,
        plan: {
          plan_hash: expectedPlanHash
        }
      })
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("cli-compute-pg-hashes: reports missing plan block", async () => {
  const tmp = makeTmpDir();
  try {
    const planPath = writeText(tmp, "PG-7.md", "Plan bytes\n");
    const pgPath = writeText(
      tmp,
      "PG-7.json",
      `${JSON.stringify({ id: "PG-7", state_hash: "placeholder" }, null, 2)}\n`
    );

    const result = await runComputePgHashesCli(["--plan", planPath, "--pg", pgPath]);

    assert.equal(result.exitCode, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /must contain a top-level plan object/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("cli-compute-pg-hashes: post-write re-hash detects plan-file drift", async () => {
  const tmp = makeTmpDir();
  try {
    const cleanPlanBody = "Final page plan bytes.\nDo not normalize.\n";
    const driftedPlanBody = "Final page plan bytes.\nDo not normalize.\nPost-write drift.\n";
    const planPath = writeText(tmp, "PG-2.md", cleanPlanBody);
    const pgObject = {
      id: "PG-2",
      story_id: "STORY-1",
      state_hash: "placeholder",
      prose_plan_path: "pages-prose-plans/PG-2.md",
      plan: {
        plan_hash: "placeholder"
      },
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

    const clean = await runComputePgHashesCli(["--plan", planPath, "--pg", pgPath]);
    assert.equal(clean.exitCode, 0);
    assert.equal(clean.stderr, "");
    const cleanOutput = JSON.parse(clean.stdout) as { plan_hash: string; state_hash: string };
    const committedPlanHash = cleanOutput.plan_hash;

    writeFileSync(planPath, driftedPlanBody, "utf8");

    const drifted = await runComputePgHashesCli(["--plan", planPath, "--pg", pgPath]);
    assert.equal(drifted.exitCode, 0);
    assert.equal(drifted.stderr, "");
    const driftedOutput = JSON.parse(drifted.stdout) as { plan_hash: string; state_hash: string };

    assert.notEqual(
      driftedOutput.plan_hash,
      committedPlanHash,
      "post-write drift must produce a different plan_hash"
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
