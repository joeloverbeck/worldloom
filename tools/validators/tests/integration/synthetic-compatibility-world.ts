import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import yaml from "js-yaml";

export function materializeCompatibilityFixtureWorld(
  repoRoot: string,
  packageRoot: string
): { worldSlug: string; storySlug: string } {
  const fixture = yaml.load(
    readFileSync(path.join(packageRoot, "tests", "fixtures", "midstory-introduction", "compatibility", "legacy-snapshot.yaml"), "utf8"),
    { schema: yaml.JSON_SCHEMA }
  ) as {
    world_slug: string;
    story_slug: string;
    records: Array<{ node_id: string; file_path?: string; parsed: Record<string, unknown> }>;
  };
  const worldSlug = fixture.world_slug;
  const storySlug = fixture.story_slug;
  const worldRoot = path.join(repoRoot, "worlds", worldSlug);

  writeSyntheticWorldAnchor(worldRoot);
  for (const item of fixture.records) {
    const id = String(item.parsed.id ?? item.node_id.split(":").at(-1) ?? item.node_id);
    const filePath = item.file_path ?? `stories/${storySlug}/_source/records/${id}.yaml`;
    writeFixtureFile(worldRoot, filePath, yaml.dump(item.parsed, { lineWidth: 0 }));
  }

  return { worldSlug, storySlug };
}

function writeSyntheticWorldAnchor(worldRoot: string): void {
  writeFixtureFile(worldRoot, "WORLD_KERNEL.md", "# Synthetic compatibility world\n");
  writeFixtureFile(worldRoot, "ONTOLOGY.md", "# Synthetic compatibility ontology\n");
  writeFixtureFile(worldRoot, "_source/canon/CF-1.yaml", yaml.dump({
    id: "CF-1",
    title: "Synthetic compatibility anchor",
    status: "hard_canon",
    type: "institution",
    statement: "The synthetic compatibility fixture has a harmless civic archive.",
    scope: { geographic: "local", temporal: "current", social: "public" },
    truth_scope: { world_level: true, diegetic_status: "objective" },
    domains_affected: [],
    required_world_updates: [],
    source_basis: { direct_user_approval: true },
    contradiction_risk: { hard: false, soft: false },
    epistemic_profile: { n_a: "Institution fixture anchor only; no knowability asymmetry is under test." },
    exception_governance: { n_a: "Institution fixture anchor only; no exception mechanism is under test." }
  }, { lineWidth: 0 }));
  writeFixtureFile(worldRoot, "_source/change-log/CH-1.yaml", yaml.dump({
    change_id: "CH-1",
    date: "2026-05-19",
    change_type: "addition",
    summary: "Create the synthetic compatibility fixture anchor.",
    affected_fact_ids: ["CF-1"],
    reason: ["Test fixture support for validator compatibility coverage."],
    decided_by: "test_fixture"
  }, { lineWidth: 0 }));
}

function writeFixtureFile(worldRoot: string, relativePath: string, content: string): void {
  const destination = path.join(worldRoot, relativePath);
  mkdirSync(path.dirname(destination), { recursive: true });
  writeFileSync(destination, content, "utf8");
}
