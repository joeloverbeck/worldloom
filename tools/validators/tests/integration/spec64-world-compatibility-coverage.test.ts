import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { build as buildWorldIndex } from "@worldloom/world-index/commands/build";
import yaml from "js-yaml";

import { parseJsonOutput, runWorldValidate } from "../_helpers/cli.js";
import { validCf } from "../structural/helpers.js";

const WORLD_SLUG = "spec64";

type CompatibilityRun = {
  verdicts: Array<{
    validator: string;
    severity: string;
    code: string;
    location: { file: string; node_id?: string };
  }>;
  summary: {
    fail_count: number;
    warn_count: number;
    info_count: number;
    validators_run: string[];
  };
};

test("SPEC-64 capstone: compatibility CLI catches maturity collapse", () => {
  withIndexedFixture((worldRoot) => {
    writeCharacterProposal(worldRoot, {
      proposal_id: "NCP-1",
      slug: "salt-witness",
      title: "Salt Witness",
      authority_tier: "character_record",
      source_basis: { user_approved: false }
    });
    writeFile(
      worldRoot,
      "character-proposals/INDEX.md",
      "- [Salt Witness](NCP-1-salt-witness.md) - candidate\n"
    );
  }, (repoRoot) => {
    const run = runCompatibility(repoRoot, {
      expectStatus: 1,
      file: "character-proposals/NCP-1-salt-witness.md"
    });
    assertHasVerdict(run, "artifact_maturity", "artifact_maturity.collapse", "warn");
  });
});

test("SPEC-64 capstone: compatibility CLI catches non-CF direct_user_approval", () => {
  withIndexedFixture((worldRoot) => {
    writeYaml(worldRoot, "_source/change-log/CH-1.yaml", {
      change_id: "CH-1",
      date: "2026-05-21",
      change_type: "addition",
      affected_fact_ids: ["CF-1"],
      source_basis: { direct_user_approval: true }
    });
  }, (repoRoot) => {
    const run = runCompatibility(repoRoot, { expectStatus: 1 });
    assertHasVerdict(run, "approval_semantics", "approval_semantics.direct_user_approval_reserved", "fail");
  });
});

test("SPEC-64 capstone: compatibility CLI reports INDEX drift as nonblocking full-world warning", () => {
  withIndexedFixture((worldRoot) => {
    mkdirSync(path.join(worldRoot, "character-proposals"), { recursive: true });
    writeFile(
      worldRoot,
      "character-proposals/INDEX.md",
      "- [Absent Candidate](NCP-99-absent.md) - candidate\n"
    );
  }, (repoRoot) => {
    const run = runCompatibility(repoRoot);
    assert.equal(run.summary.fail_count, 0);
    assert.equal(run.summary.warn_count, 1);
    assertHasVerdict(run, "index_disk_consistency", "index_disk_drift", "warn");
  });
});

test("SPEC-64 capstone: clean fixture world passes compatibility validation", () => {
  withIndexedFixture(() => undefined, (repoRoot) => {
    const run = runCompatibility(repoRoot);
    assert.deepEqual(run.summary.validators_run, [
      "record_schema_compliance",
      "approval_semantics",
      "artifact_maturity",
      "index_disk_consistency"
    ]);
    assert.equal(run.summary.fail_count, 0);
    assert.equal(run.summary.warn_count, 0);
    assert.equal(run.summary.info_count, 0);
    assert.deepEqual(run.verdicts, []);
  });
});

function withIndexedFixture(
  mutate: (worldRoot: string) => void,
  assertion: (repoRoot: string) => void
): void {
  const fixtureRoot = mkdtempSync(path.join(os.tmpdir(), "worldloom-spec64-fixture-"));
  const runRoot = mkdtempSync(path.join(os.tmpdir(), "worldloom-spec64-run-"));
  try {
    const worldRoot = path.join(fixtureRoot, "worlds", WORLD_SLUG);
    writeCleanWorld(worldRoot);
    mutate(worldRoot);
    assert.equal(buildWorldIndex(fixtureRoot, WORLD_SLUG, { quiet: true }), 0);

    cpSync(fixtureRoot, runRoot, { recursive: true });
    assertion(runRoot);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
    rmSync(runRoot, { recursive: true, force: true });
  }
}

function runCompatibility(
  repoRoot: string,
  options: { expectStatus?: number; file?: string } = {}
): CompatibilityRun {
  const args = [WORLD_SLUG, "--compatibility", "--json"];
  if (options.file) {
    args.push("--file", options.file);
  }
  const result = runWorldValidate(args, {
    cwd: repoRoot,
    expectedStatus: options.expectStatus ?? 0
  });

  return parseJsonOutput<CompatibilityRun>(result);
}

function assertHasVerdict(
  run: CompatibilityRun,
  validator: string,
  code: string,
  severity: string
): void {
  assert.ok(
    run.verdicts.some(
      (verdict) =>
        verdict.validator === validator &&
        verdict.code === code &&
        verdict.severity === severity
    ),
    `expected ${severity} ${validator}/${code}; got ${JSON.stringify(run.verdicts, null, 2)}`
  );
}

function writeCleanWorld(worldRoot: string): void {
  writeFile(worldRoot, "WORLD_KERNEL.md", "# SPEC-64 fixture\n");
  writeFile(worldRoot, "ONTOLOGY.md", "# Ontology\n");
  writeYaml(worldRoot, "_source/canon/CF-1.yaml", validCf);
}

function writeCharacterProposal(worldRoot: string, frontmatter: Record<string, unknown>): void {
  writeFile(
    worldRoot,
    "character-proposals/NCP-1-salt-witness.md",
    markdownWithFrontmatter(
      frontmatter,
      "Salt Witness",
      "This candidate incorrectly presents itself as a realized character dossier."
    )
  );
}

function writeYaml(worldRoot: string, relativePath: string, recordBody: Record<string, unknown>): void {
  writeFile(worldRoot, relativePath, `${yaml.dump(recordBody, { lineWidth: -1 }).trimEnd()}\n`);
}

function writeFile(worldRoot: string, relativePath: string, content: string): void {
  const absolutePath = path.join(worldRoot, relativePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content, "utf8");
}

function markdownWithFrontmatter(frontmatter: Record<string, unknown>, title: string, body = ""): string {
  return ["---", yaml.dump(frontmatter, { lineWidth: -1 }).trimEnd(), "---", `# ${title}`, "", body, ""].join("\n");
}
