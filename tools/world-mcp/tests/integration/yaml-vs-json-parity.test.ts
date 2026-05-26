import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { computePgStateHash } from "../../src/package-interop.js";
import { runComputePgHashesCli } from "../../src/cli/compute-pg-hashes.js";

function makeTmpDir(): string {
  return mkdtempSync(path.join(os.tmpdir(), "world-mcp-yaml-vs-json-parity-"));
}

function writeText(dir: string, name: string, value: string): string {
  const filePath = path.join(dir, name);
  writeFileSync(filePath, value, "utf8");
  return filePath;
}

test("compute-pg-hashes rejects YAML and hashes envelope-extracted JSON", async () => {
  const tmp = makeTmpDir();
  try {
    const planBody = "Final PG-9 plan bytes.\nThe byte stream is the plan authority.\n";
    const planPath = writeText(tmp, "PG-9.md", planBody);
    const pgRecord = {
      record_kind: "page_record",
      id: "PG-9",
      story_id: "STORY-1",
      branch_id: "BR-1",
      parent_page_id: "PG-8",
      branch_path: ["PG-1", "PG-8", "PG-9"],
      turn_index: 8,
      input: {
        choice_id: "CHC-30",
        manual_action_text: null,
        resolved_event_id: "SE-9"
      },
      state_hash_parent: "1f0047483b2b87c63fef1b6cf107e0750cdbddc24d22c7655cd567d578754049",
      state_hash: "placeholder",
      state_snapshot: {
        canon_revision: "CH-9",
        active_records: {
          BEL: ["BEL-1"],
          CLK: ["CLK-3"]
        },
        visible_affordances: []
      },
      plan: {
        plan_hash: "placeholder"
      },
      prose_plan_path: "pages-prose-plans/PG-9.md",
      emitted_choices: ["CHC-31"],
      validation_trace: {
        branch_isolation: "PASS: branch path is explicit."
      }
    };
    const jsonPath = writeText(tmp, "PG-9-from-envelope.json", `${JSON.stringify(pgRecord, null, 2)}\n`);
    const yamlPath = writeText(
      tmp,
      "PG-9.yaml",
      [
        "record_kind: page_record",
        "id: PG-9",
        "story_id: STORY-1",
        "branch_id: BR-1",
        "parent_page_id: PG-8",
        "branch_path: [PG-1, PG-8, PG-9]",
        "turn_index: 8",
        "state_hash: placeholder",
        "plan:",
        "  plan_hash: placeholder",
        ""
      ].join("\n")
    );

    const yamlResult = await runComputePgHashesCli(["--plan", planPath, "--pg", yamlPath]);
    assert.equal(yamlResult.exitCode, 1);
    assert.equal(yamlResult.stdout, "");
    assert.match(yamlResult.stderr, /must be valid JSON/);
    assert.match(yamlResult.stderr, /no longer accepts YAML input/);

    const jsonResult = await runComputePgHashesCli(["--plan", planPath, "--pg", jsonPath]);
    const output = JSON.parse(jsonResult.stdout) as { plan_hash: string; state_hash: string };
    const expectedPlanHash = createHash("sha256")
      .update(Buffer.from(planBody, "utf8"))
      .digest("hex");

    assert.equal(jsonResult.exitCode, 0);
    assert.equal(jsonResult.stderr, "");
    assert.equal(output.plan_hash, expectedPlanHash);
    assert.equal(
      output.state_hash,
      computePgStateHash({
        ...pgRecord,
        plan: {
          plan_hash: expectedPlanHash
        }
      })
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
