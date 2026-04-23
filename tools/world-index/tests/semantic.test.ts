import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { parseMarkdown } from "../src/parse/markdown";
import { contentHashForProse } from "../src/parse/canonical";
import { extractSemanticEdges } from "../src/parse/semantic";
import { domainFileNodeId } from "../src/parse/prose";
import { extractYamlNodes } from "../src/parse/yaml";
import { CURRENT_INDEX_VERSION } from "../src/schema/version";
import type { NodeRow } from "../src/schema/types";

function loadFixture(name: string): { source: string; filePath: string } {
  const filePath = path.resolve(__dirname, "..", "..", "tests", "fixtures", name);
  return {
    source: readFileSync(filePath, "utf8"),
    filePath
  };
}

test("semantic extraction emits typed YAML edges and attribution edges without duplicate originates_in fallout", () => {
  const { source, filePath } = loadFixture("fixture-semantic-edges.md");
  const { tree, lines } = parseMarkdown(source);
  const { nodes: yamlNodes, parseIssues: yamlIssues } = extractYamlNodes(tree, lines, filePath);
  assert.equal(yamlIssues.length, 0);

  const proseNodes = buildFixtureProseNodes(source, filePath);
  const { edges, parseIssues } = extractSemanticEdges(
    tree,
    lines,
    filePath,
    "animalia",
    yamlNodes,
    proseNodes
  );

  assert.equal(
    edges.some(
      (edge) =>
        edge.edge_type === "derived_from" &&
        edge.source_node_id === "CF-0002" &&
        edge.target_unresolved_ref === "CF-0001"
    ),
    true
  );

  assert.equal(
    edges.some(
      (edge) =>
        edge.edge_type === "modified_by" &&
        edge.source_node_id === "CF-0002" &&
        edge.target_node_id === "CH-0014"
    ),
    true
  );

  assert.equal(
    edges.filter((edge) => edge.edge_type === "originates_in" && edge.target_unresolved_ref === "CF-0039")
      .length,
    1
  );

  assert.equal(
    edges.some(
      (edge) =>
        edge.edge_type === "required_world_update" &&
        edge.source_node_id === "CF-0002" &&
        edge.target_node_id === domainFileNodeId("animalia", "INSTITUTIONS.md") &&
        edge.target_unresolved_ref === null
    ),
    true
  );

  assert.equal(
    edges.some(
      (edge) =>
        edge.edge_type === "patched_by" &&
        edge.source_node_id === "animalia:INSTITUTIONS.md:Domain History:Brinewick history:0" &&
        edge.target_unresolved_ref === "CF-0041"
    ),
    true
  );

  assert.equal(
    edges.some(
      (edge) =>
        edge.edge_type === "clarified_by" &&
        edge.source_node_id === "animalia:INSTITUTIONS.md:Economy:0" &&
        edge.target_node_id === "CH-0014"
    ),
    true
  );

  assert.equal(
    edges.some((edge) => edge.edge_type === "patched_by" && edge.target_unresolved_ref === "CF-0099"),
    false
  );

  assert.deepEqual(parseIssues.map((issue) => issue.code).sort(), ["malformed_attribution_target"]);
});

test("semantic extraction preserves YAML-derived edges for recovery-parsed Canon Fact records", () => {
  const source = `## Canon Fact Records

\`\`\`yaml
id: CF-0099
title: Recovery edge fixture
status: hard_canon
type: institution
statement: Recovery-only YAML still emits semantic edges.
scope:
  geographic: local
  temporal: current
  social: public
truth_scope:
  world_level: true
  diegetic_status: objective
domains_affected:
  - institutions
visible_consequences:
  - "halfbreed" plot conveniences do not exist in this world
costs_and_limits:
  - marriage-broker catechism extensions in adopting-region households:
    "is the stop kept in the family?"
required_world_updates:
  - INSTITUTIONS.md
source_basis:
  direct_user_approval: false
  derived_from:
    - CF-0001
modification_history:
  - change_id: CH-0099
    originating_cf: CF-0001
    date: 2026-04-23
    summary: Preserved recovered semantic edges.
\`\`\`
`;

  const filePath = "/tmp/worlds/animalia/CANON_LEDGER.md";
  const { tree, lines } = parseMarkdown(source);
  const { nodes: yamlNodes, parseIssues: yamlIssues } = extractYamlNodes(tree, lines, filePath);
  assert.equal(yamlIssues.length, 0);

  const proseNodes = [
    makeProseNode({
      nodeId: domainFileNodeId("animalia", "INSTITUTIONS.md"),
      filePath,
      headingPath: "INSTITUTIONS.md",
      lineStart: 1,
      lineEnd: lines.length,
      nodeType: "domain_file",
      body: source
    })
  ];

  const { edges, parseIssues } = extractSemanticEdges(
    tree,
    lines,
    filePath,
    "animalia",
    yamlNodes,
    proseNodes
  );

  assert.deepEqual(parseIssues, []);
  assert.equal(
    edges.some(
      (edge) =>
        edge.edge_type === "derived_from" &&
        edge.source_node_id === "CF-0099" &&
        edge.target_unresolved_ref === "CF-0001"
    ),
    true
  );
  assert.equal(
    edges.some(
      (edge) =>
        edge.edge_type === "required_world_update" &&
        edge.source_node_id === "CF-0099" &&
        edge.target_node_id === domainFileNodeId("animalia", "INSTITUTIONS.md")
    ),
    true
  );
  assert.equal(
    edges.some(
      (edge) =>
        edge.edge_type === "modified_by" &&
        edge.source_node_id === "CF-0099" &&
        edge.target_unresolved_ref === "CH-0099"
    ),
    true
  );
});

function buildFixtureProseNodes(source: string, filePath: string): NodeRow[] {
  const lines = source.split(/\r?\n/);
  const domainHistoryStart = findLine(lines, "## Domain History");
  const brinewickStart = findLine(lines, "### Brinewick history");
  const economyStart = findLine(lines, "## Economy");
  const sectionDomainBody = lines.slice(domainHistoryStart, economyStart - 1).join("\n");
  const subsectionBody = lines.slice(brinewickStart, economyStart - 1).join("\n");
  const economyBody = lines.slice(economyStart).join("\n");

  return [
    makeProseNode({
      nodeId: domainFileNodeId("animalia", "INSTITUTIONS.md"),
      filePath,
      headingPath: "INSTITUTIONS.md",
      lineStart: 1,
      lineEnd: lines.length,
      nodeType: "domain_file",
      body: source
    }),
    makeProseNode({
      nodeId: "animalia:INSTITUTIONS.md:Domain History:0",
      filePath,
      headingPath: "Domain History",
      lineStart: domainHistoryStart,
      lineEnd: economyStart - 1,
      nodeType: "section",
      body: sectionDomainBody
    }),
    makeProseNode({
      nodeId: "animalia:INSTITUTIONS.md:Domain History:Brinewick history:0",
      filePath,
      headingPath: "Domain History > Brinewick history",
      lineStart: brinewickStart,
      lineEnd: economyStart - 1,
      nodeType: "subsection",
      body: subsectionBody
    }),
    makeProseNode({
      nodeId: "animalia:INSTITUTIONS.md:Economy:0",
      filePath,
      headingPath: "Economy",
      lineStart: economyStart,
      lineEnd: lines.length,
      nodeType: "section",
      body: economyBody
    })
  ];
}

function makeProseNode({
  nodeId,
  filePath,
  headingPath,
  lineStart,
  lineEnd,
  nodeType,
  body
}: {
  nodeId: string;
  filePath: string;
  headingPath: string;
  lineStart: number;
  lineEnd: number;
  nodeType: NodeRow["node_type"];
  body: string;
}): NodeRow {
  return {
    node_id: nodeId,
    world_slug: "animalia",
    file_path: filePath,
    heading_path: headingPath,
    byte_start: 0,
    byte_end: 0,
    line_start: lineStart,
    line_end: lineEnd,
    node_type: nodeType,
    body,
    content_hash: contentHashForProse(body),
    anchor_checksum: contentHashForProse(body),
    summary: null,
    created_at_index_version: CURRENT_INDEX_VERSION
  };
}

function findLine(lines: string[], needle: string): number {
  const lineIndex = lines.findIndex((line) => line === needle);
  assert.notEqual(lineIndex, -1);
  return lineIndex + 1;
}
