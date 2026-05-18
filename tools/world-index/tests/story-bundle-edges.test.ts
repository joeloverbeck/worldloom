import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { parseStoryBundleSourceFile } from "../src/parse/atomic.js";

test("belief records emit holder, basis, access, and consequence edges", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "world-index-belief-edges-"));

  try {
    writeStoryBelief(root, "harborwatch", "BEL-1", [
      "id: BEL-1",
      "story_id: STORY-1",
      "created_at_page: PG-1",
      "holder: STENT-1",
      "claim: Brinewick believes the salt gate needs watching.",
      "belief_mode: believes",
      "truth_relation: true",
      "confidence: high",
      "visibility: shared",
      "basis:",
      "  source_event: SE-1",
      "  access_route: witnessed",
      "  access_records:",
      "    - PG-1",
      "    - DA-1",
      "consequences:",
      "  opens:",
      "    - OBL-1",
      "    - STQ-1",
      "  constrains_choices: []"
    ]);

    const parsed = parseStoryBundleSourceFile(
      root,
      "fixture-world",
      "stories/harborwatch/_source/beliefs/BEL-1.yaml"
    );

    assert.deepEqual(
      beliefEdges(parsed.edges),
      [
        {
          source_node_id: "harborwatch:BEL-1",
          target_unresolved_ref: "harborwatch:STENT-1",
          edge_type: "belief_holder",
          story_slug: "harborwatch"
        },
        {
          source_node_id: "harborwatch:BEL-1",
          target_unresolved_ref: "harborwatch:SE-1",
          edge_type: "belief_basis_event",
          story_slug: "harborwatch"
        },
        {
          source_node_id: "harborwatch:BEL-1",
          target_unresolved_ref: "harborwatch:PG-1",
          edge_type: "belief_access_record",
          story_slug: "harborwatch"
        },
        {
          source_node_id: "harborwatch:BEL-1",
          target_unresolved_ref: "harborwatch:DA-1",
          edge_type: "belief_access_record",
          story_slug: "harborwatch"
        },
        {
          source_node_id: "harborwatch:BEL-1",
          target_unresolved_ref: "harborwatch:OBL-1",
          edge_type: "belief_opens",
          story_slug: "harborwatch"
        },
        {
          source_node_id: "harborwatch:BEL-1",
          target_unresolved_ref: "harborwatch:STQ-1",
          edge_type: "belief_opens",
          story_slug: "harborwatch"
        }
      ]
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("belief records with empty optional fields emit only populated belief edges", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "world-index-belief-empty-"));

  try {
    writeStoryBelief(root, "harborwatch", "BEL-2", [
      "id: BEL-2",
      "story_id: STORY-1",
      "created_at_page: PG-1",
      "holder: STENT-2",
      "claim: Brinewick has an unsupported suspicion.",
      "belief_mode: suspects",
      "truth_relation: unknown",
      "confidence: low",
      "visibility: private",
      "basis:",
      "  source_event: null",
      "  access_route: inference",
      "  access_records: []",
      "consequences:",
      "  opens: []",
      "  constrains_choices: []"
    ]);

    const parsed = parseStoryBundleSourceFile(
      root,
      "fixture-world",
      "stories/harborwatch/_source/beliefs/BEL-2.yaml"
    );

    assert.deepEqual(
      beliefEdges(parsed.edges).map((edge) => ({
        target_unresolved_ref: edge.target_unresolved_ref,
        edge_type: edge.edge_type
      })),
      [
        {
          target_unresolved_ref: "harborwatch:STENT-2",
          edge_type: "belief_holder"
        }
      ]
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("relationship records emit participant and derived-from edges", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "world-index-srel-edges-"));

  try {
    writeStoryRelationship(root, "harborwatch", "SREL-1", [
      "id: SREL-1",
      "story_id: STORY-1",
      "created_at_page: PG-2",
      "supersedes: null",
      "participants:",
      "  - STENT-1",
      "  - STENT-2",
      "axis: trust",
      "value: allied",
      "direction:",
      "  kind: bidirectional",
      "  from: null",
      "  to: null",
      "evidence:",
      "  - SE-1",
      "derived_from:",
      "  - SE-1",
      "  - BEL-1"
    ]);

    const parsed = parseStoryBundleSourceFile(
      root,
      "fixture-world",
      "stories/harborwatch/_source/relationships/SREL-1.yaml"
    );

    assert.deepEqual(
      relationshipEdges(parsed.edges),
      [
        {
          source_node_id: "harborwatch:SREL-1",
          target_unresolved_ref: "harborwatch:STENT-1",
          edge_type: "relationship_participant",
          story_slug: "harborwatch"
        },
        {
          source_node_id: "harborwatch:SREL-1",
          target_unresolved_ref: "harborwatch:STENT-2",
          edge_type: "relationship_participant",
          story_slug: "harborwatch"
        },
        {
          source_node_id: "harborwatch:SREL-1",
          target_unresolved_ref: "harborwatch:SE-1",
          edge_type: "relationship_derived_from",
          story_slug: "harborwatch"
        },
        {
          source_node_id: "harborwatch:SREL-1",
          target_unresolved_ref: "harborwatch:BEL-1",
          edge_type: "relationship_derived_from",
          story_slug: "harborwatch"
        }
      ]
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("relationship records with empty arrays emit no relationship edges", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "world-index-srel-empty-"));

  try {
    writeStoryRelationship(root, "harborwatch", "SREL-2", [
      "id: SREL-2",
      "story_id: STORY-1",
      "created_at_page: PG-2",
      "supersedes: null",
      "participants: []",
      "axis: trust",
      "value: neutral",
      "direction:",
      "  kind: bidirectional",
      "  from: null",
      "  to: null",
      "evidence: []",
      "derived_from: []"
    ]);

    const parsed = parseStoryBundleSourceFile(
      root,
      "fixture-world",
      "stories/harborwatch/_source/relationships/SREL-2.yaml"
    );

    assert.deepEqual(relationshipEdges(parsed.edges), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

function beliefEdges(edges: Array<{ edge_type: string; source_node_id: string; target_unresolved_ref: string | null; story_slug?: string | null }>): Array<{
  source_node_id: string;
  target_unresolved_ref: string | null;
  edge_type: string;
  story_slug: string | null;
}> {
  return edges
    .filter((edge) => edge.edge_type.startsWith("belief_"))
    .map((edge) => ({
      source_node_id: edge.source_node_id,
      target_unresolved_ref: edge.target_unresolved_ref,
      edge_type: edge.edge_type,
      story_slug: edge.story_slug ?? null
    }));
}

function relationshipEdges(edges: Array<{ edge_type: string; source_node_id: string; target_unresolved_ref: string | null; story_slug?: string | null }>): Array<{
  source_node_id: string;
  target_unresolved_ref: string | null;
  edge_type: string;
  story_slug: string | null;
}> {
  return edges
    .filter((edge) => edge.edge_type.startsWith("relationship_"))
    .map((edge) => ({
      source_node_id: edge.source_node_id,
      target_unresolved_ref: edge.target_unresolved_ref,
      edge_type: edge.edge_type,
      story_slug: edge.story_slug ?? null
    }));
}

function writeStoryBelief(root: string, storySlug: string, beliefId: string, lines: string[]): void {
  const relativeDirectory = path.join(
    root,
    "worlds",
    "fixture-world",
    "stories",
    storySlug,
    "_source",
    "beliefs"
  );
  mkdirSync(relativeDirectory, { recursive: true });
  writeFileSync(path.join(relativeDirectory, `${beliefId}.yaml`), `${lines.join("\n")}\n`, "utf8");
}

function writeStoryRelationship(root: string, storySlug: string, relationshipId: string, lines: string[]): void {
  const relativeDirectory = path.join(
    root,
    "worlds",
    "fixture-world",
    "stories",
    storySlug,
    "_source",
    "relationships"
  );
  mkdirSync(relativeDirectory, { recursive: true });
  writeFileSync(path.join(relativeDirectory, `${relationshipId}.yaml`), `${lines.join("\n")}\n`, "utf8");
}
