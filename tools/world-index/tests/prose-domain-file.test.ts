import assert from "node:assert/strict";
import test from "node:test";

import { parseMarkdown } from "../src/parse/markdown";
import { domainFileNodeId, extractProseNodes } from "../src/parse/prose";
import { extractSemanticEdges } from "../src/parse/semantic";
import { extractYamlNodes } from "../src/parse/yaml";

test("mandatory top-level world files emit one stable domain-file node", () => {
  const source = [
    "# Institutions",
    "",
    "## Civic Order",
    "",
    "Brinewick keeps a public watch around the salt piers."
  ].join("\n");
  const { tree, lines } = parseMarkdown(source);
  const nodes = extractProseNodes(tree, lines, "INSTITUTIONS.md", "animalia");
  const domainFileNode = nodes.find((node) => node.node_type === "domain_file");

  assert.ok(domainFileNode);
  assert.equal(domainFileNode.node_id, domainFileNodeId("animalia", "INSTITUTIONS.md"));
  assert.equal(domainFileNode.file_path, "INSTITUTIONS.md");
});

test("required_world_update resolves mandatory filenames to domain-file nodes and leaves missing files unresolved", () => {
  const source = [
    "## Canon Fact Records",
    "",
    "```yaml",
    "id: CF-0001",
    "title: Harbor rites",
    "status: hard_canon",
    "type: institution",
    "statement: Harbor rites require cross-file updates.",
    "scope:",
    "  geographic: local",
    "  temporal: current",
    "  social: public",
    "truth_scope:",
    "  world_level: true",
    "  diegetic_status: objective",
    "domains_affected:",
    "  - institutions",
    "required_world_updates:",
    "  - INSTITUTIONS.md",
    "  - NOT_REAL.md",
    "source_basis:",
    "  direct_user_approval: true",
    "```"
  ].join("\n");
  const { tree, lines } = parseMarkdown(source);
  const { nodes: yamlNodes, parseIssues } = extractYamlNodes(tree, lines, "CANON_LEDGER.md");

  assert.equal(parseIssues.length, 0);

  const proseNodes = extractProseNodes(tree, lines, "CANON_LEDGER.md", "animalia");
  const { edges } = extractSemanticEdges(tree, lines, "CANON_LEDGER.md", "animalia", yamlNodes, proseNodes);
  const requiredEdges = edges.filter((edge) => edge.edge_type === "required_world_update");

  assert.equal(requiredEdges.length, 2);
  assert.deepEqual(requiredEdges[0], {
    edge_id: 1,
    source_node_id: "CF-0001",
    target_node_id: domainFileNodeId("animalia", "INSTITUTIONS.md"),
    target_unresolved_ref: null,
    edge_type: "required_world_update"
  });
  assert.deepEqual(requiredEdges[1], {
    edge_id: 2,
    source_node_id: "CF-0001",
    target_node_id: null,
    target_unresolved_ref: "NOT_REAL.md",
    edge_type: "required_world_update"
  });
});
