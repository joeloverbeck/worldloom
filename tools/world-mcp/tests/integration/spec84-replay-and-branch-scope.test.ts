import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { build } from "@worldloom/world-index/commands/build";
import YAML from "yaml";

import { selectStoryletCandidates } from "../../src/tools/select-storylet-candidates.js";
import { createTempRepoRoot, destroyTempRepoRoot, withRepoRoot } from "../tools/_shared.js";

interface FixtureFile {
  path: string;
  content: string;
}

interface FixtureRecord {
  node_type: string;
  node_id: string;
  file_path: string;
  parsed: Record<string, unknown>;
}

interface Spec84Fixture {
  world_slug: string;
  story_slug: string;
  records: FixtureRecord[];
  files?: FixtureFile[];
}

const FIXTURE_PATH = path.resolve(
  process.cwd(),
  "../validators/tests/fixtures/spec84-replay-and-branch-scope/fixture.json"
);

const PLAYER_DRIVER = {
  kind: "player_action" as const,
  initiator: "STCHAR-1",
  driver_records: ["STCHAR-1"]
};

function loadFixture(): Spec84Fixture {
  return JSON.parse(readFileSync(FIXTURE_PATH, "utf8")) as Spec84Fixture;
}

function materializeFixture(root: string, fixture: Spec84Fixture): void {
  for (const file of fixture.files ?? []) {
    const absolutePath = path.join(root, "worlds", fixture.world_slug, file.path);
    mkdirSync(path.dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, file.content, "utf8");
  }

  for (const record of fixture.records) {
    const absolutePath = path.join(root, "worlds", fixture.world_slug, record.file_path);
    mkdirSync(path.dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, YAML.stringify(record.parsed), "utf8");
  }
}

async function withSpec84World<T>(
  run: (root: string, fixture: Spec84Fixture) => Promise<T>
): Promise<T> {
  const root = createTempRepoRoot();

  try {
    const fixture = loadFixture();
    materializeFixture(root, fixture);
    assert.equal(build(root, fixture.world_slug, { quiet: true }), 0);
    return await run(root, fixture);
  } finally {
    destroyTempRepoRoot(root);
  }
}

async function candidatesFor(parentPageId: string) {
  return withSpec84World((root, fixture) =>
    withRepoRoot(root, () =>
      selectStoryletCandidates({
        world_slug: fixture.world_slug,
        story_slug: fixture.story_slug,
        parent_page_id: parentPageId,
        turn_driver: PLAYER_DRIVER,
        max_candidates: 24
      })
    )
  );
}

test("SPEC-84 replay from BR-1 sees newer global SLT-2", async () => {
  const result = await candidatesFor("PG-5");

  assert.ok(!("code" in result));
  assert.equal(result.filter_trace.pool_total, 5);
  assert.ok(result.shortlisted_candidate_ids.includes("SLT-2"));
});

test("SPEC-84 replay rejects global SLT-3 with a story-bundle record ref at source-record stage", async () => {
  const result = await candidatesFor("PG-5");

  assert.ok(!("code" in result));
  assert.ok(!result.shortlisted_candidate_ids.includes("SLT-3"));
  assert.equal(
    result.filter_trace.after_predicate_class - result.filter_trace.after_source_record_id,
    1
  );
});

test("SPEC-84 BR-1 replay excludes sibling BR-2 branch-scoped SLT-4 at scope stage", async () => {
  const result = await candidatesFor("PG-5");

  assert.ok(!("code" in result));
  assert.ok(!result.shortlisted_candidate_ids.includes("SLT-4"));
  assert.equal(result.filter_trace.pool_total - result.filter_trace.after_scope, 1);
});

test("SPEC-84 BR-1 replay includes branch-prefix SLT-5 when the page path matches", async () => {
  const result = await candidatesFor("PG-5");

  assert.ok(!("code" in result));
  assert.ok(result.shortlisted_candidate_ids.includes("SLT-5"));
});

test("SPEC-84 BR-2 replay excludes branch-prefix SLT-5 when the page path does not match", async () => {
  const result = await candidatesFor("PG-4");

  assert.ok(!("code" in result));
  assert.ok(!result.shortlisted_candidate_ids.includes("SLT-5"));
  assert.equal(result.filter_trace.pool_total - result.filter_trace.after_scope, 1);
});
