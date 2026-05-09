import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import Database from "better-sqlite3";

import { build } from "../src/commands/build";
import { render } from "../src/commands/render";
import { cleanup, createAtomicRepoRoot } from "./helpers/atomic-fixture";

function withCapturedOutput<T>(run: () => T): { result: T; stdout: string; stderr: string } {
  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];
  const stdoutWrite = process.stdout.write.bind(process.stdout);
  const stderrWrite = process.stderr.write.bind(process.stderr);

  process.stdout.write = ((chunk: string | Uint8Array) => {
    stdoutChunks.push(String(chunk));
    return true;
  }) as typeof process.stdout.write;
  process.stderr.write = ((chunk: string | Uint8Array) => {
    stderrChunks.push(String(chunk));
    return true;
  }) as typeof process.stderr.write;

  try {
    return {
      result: run(),
      stdout: stdoutChunks.join(""),
      stderr: stderrChunks.join("")
    };
  } finally {
    process.stdout.write = stdoutWrite;
    process.stderr.write = stderrWrite;
  }
}

test("build indexes ARC_TRACE records, typed rows, edges, and opt-in story render output", () => {
  const root = createAtomicRepoRoot();

  try {
    writeArcTrace(root, "atomic-world", "harborwatch", "ARCTRACE-0001");

    assert.equal(build(root, "atomic-world", { quiet: true }), 0);
    assert.equal(build(root, "atomic-world", { quiet: true }), 0);

    const db = new Database(path.join(root, "worlds", "atomic-world", "_index", "world.db"), {
      readonly: true
    });
    try {
      const node = db
        .prepare(
          `
            SELECT node_id, node_type, story_slug
            FROM nodes
            WHERE node_id = 'harborwatch:ARCTRACE-0001'
          `
        )
        .get() as { node_id: string; node_type: string; story_slug: string };
      assert.deepEqual(node, {
        node_id: "harborwatch:ARCTRACE-0001",
        node_type: "arc_trace_node",
        story_slug: "harborwatch"
      });

      const trace = db
        .prepare(
          `
            SELECT id, created_at_page_node_id, arc_realized_node_id, semantic_critic_status, claim_text, action_text
            FROM arc_trace_node
            WHERE id = 'harborwatch:ARCTRACE-0001'
          `
        )
        .get() as {
        id: string;
        created_at_page_node_id: string;
        arc_realized_node_id: string;
        semantic_critic_status: string;
        claim_text: string;
        action_text: string;
      };
      assert.equal(trace.created_at_page_node_id, "harborwatch:PG-0001");
      assert.equal(trace.arc_realized_node_id, "harborwatch:SLT-0001");
      assert.equal(trace.semantic_critic_status, "pass");
      assert.match(trace.claim_text, /watch continued/);
      assert.match(trace.action_text, /keeps watch/);

      const edgeTypes = db
        .prepare(
          `
            SELECT edge_type, target_node_id
            FROM edges
            WHERE source_node_id = 'harborwatch:ARCTRACE-0001'
            ORDER BY edge_type, target_node_id
          `
        )
        .all() as Array<{ edge_type: string; target_node_id: string | null }>;
      assert.deepEqual(edgeTypes, [
        { edge_type: "arc_trace_describes_page", target_node_id: "harborwatch:PG-0001" },
        { edge_type: "arc_trace_observes_action_by", target_node_id: "harborwatch:STENT-0001" },
        { edge_type: "arc_trace_realizes_arc", target_node_id: "harborwatch:SLT-0001" },
        { edge_type: "created_at_page", target_node_id: "harborwatch:PG-0001" }
      ]);

      const match = db
        .prepare("SELECT arc_trace_id FROM arc_trace_node_fts WHERE arc_trace_node_fts MATCH ?")
        .get("continued") as { arc_trace_id: string };
      assert.equal(match.arc_trace_id, "ARCTRACE-0001");
    } finally {
      db.close();
    }

    const defaultRender = withCapturedOutput(() =>
      render(root, "atomic-world", { storySlug: "harborwatch" })
    );
    assert.equal(defaultRender.result, 0);
    assert.doesNotMatch(defaultRender.stdout, /ARCTRACE-0001/);

    const traceRender = withCapturedOutput(() =>
      render(root, "atomic-world", { storySlug: "harborwatch", arcTraces: true })
    );
    assert.equal(traceRender.result, 0);
    assert.match(traceRender.stdout, /ARCTRACE-0001/);
  } finally {
    cleanup(root);
  }
});

function writeArcTrace(root: string, worldSlug: string, storySlug: string, id: string): void {
  const targetDirectory = path.join(
    root,
    "worlds",
    worldSlug,
    "stories",
    storySlug,
    "_source",
    "arc-traces"
  );
  mkdirSync(targetDirectory, { recursive: true });
  writeFileSync(
    path.join(targetDirectory, `${id}.yaml`),
    [
      `id: ${id}`,
      "story_id: STORY-0001",
      "created_at_page: PG-0001",
      "arc_realized: SLT-0001",
      "effect_variant_applied: steady-watch",
      "realized_beats:",
      "  - beat_id: B1",
      "    function: maintain-watch",
      "    evidence_span: { start: 0, end: 24 }",
      "    realized: \"true\"",
      "observed_actions:",
      "  - actor: STENT-0001",
      "    action: keeps watch",
      "    target: salt gate",
      "    evidence_span: { start: 0, end: 24 }",
      "observed_claims:",
      "  - claim: watch continued",
      "    source: inference",
      "    canon_status: story_local",
      "    evidence_span: { start: 0, end: 24 }",
      "possible_violations: []",
      "stop_condition_hit:",
      "  id: watch-stabilized",
      "  category: normal_exit",
      "  evidence_span: { start: 0, end: 24 }",
      "effect_evidence:",
      "  - effect_ref: 0",
      "    realized: \"true\"",
      "    evidence_span: { start: 0, end: 24 }",
      "semantic_critic_verdict:",
      "  status: pass",
      "  reasons: []",
      "  required_revision_constraints: []",
      ""
    ].join("\n"),
    "utf8"
  );
}
