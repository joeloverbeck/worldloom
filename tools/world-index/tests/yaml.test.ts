import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import YAML from "yaml";

import { parseMarkdown } from "../src/parse/markdown";
import { contentHashForProse, contentHashForYaml } from "../src/parse/canonical";
import { extractYamlNodes } from "../src/parse/yaml";

function loadFixture(name: string): { source: string; filePath: string } {
  const filePath = path.resolve(__dirname, "..", "..", "tests", "fixtures", name);
  return {
    source: readFileSync(filePath, "utf8"),
    filePath
  };
}

test("well-formed CF and CH YAML blocks become typed nodes with canonical YAML hashes", () => {
  const { source, filePath } = loadFixture("fixture-yaml-wellformed.md");
  const { tree, lines } = parseMarkdown(source);
  const { nodes, parseIssues } = extractYamlNodes(tree, lines, filePath);

  assert.equal(parseIssues.length, 0);
  assert.equal(nodes.length, 2);

  const canonFact = nodes[0];
  const changeLog = nodes[1];
  assert.ok(canonFact);
  assert.ok(changeLog);

  assert.equal(canonFact.node_type, "canon_fact_record");
  assert.equal(canonFact.node_id, "CF-0001");
  assert.equal(canonFact.body.includes("Harbor bells warn of tide shifts"), true);
  assert.equal(
    canonFact.content_hash,
    contentHashForYaml({
      id: "CF-0001",
      title: "Harbor bells warn of tide shifts",
      status: "hard_canon",
      type: "institution",
      statement: "Harbor bells ring before flood tide.",
      scope: { geographic: "local", temporal: "current", social: "public" },
      truth_scope: { world_level: true, diegetic_status: "objective" },
      domains_affected: ["institutions"],
      required_world_updates: ["EVERYDAY_LIFE.md"],
      source_basis: { direct_user_approval: true }
    })
  );

  assert.equal(changeLog.node_type, "change_log_entry");
  assert.equal(changeLog.node_id, "CH-0001");
  assert.equal(changeLog.body.includes("Clarified the harbor-bell timing"), true);
  assert.equal(
    changeLog.content_hash,
    contentHashForYaml({
      change_id: "CH-0001",
      date: "2026-04-22",
      change_type: "clarification",
      affected_fact_ids: ["CF-0001"],
      summary: "Clarified the harbor-bell timing.",
      reason: ["Needed a clearer public cue."],
      scope: {
        local_or_global: "local",
        changes_ordinary_life: true,
        creates_new_story_engines: false,
        mystery_reserve_effect: "unchanged"
      },
      downstream_updates: ["EVERYDAY_LIFE.md"],
      impact_on_existing_texts: ["Minor wording refresh."],
      severity_before_fix: 2,
      severity_after_fix: 1,
      retcon_policy_checks: {
        no_silent_edit: true,
        replacement_noted: true,
        no_stealth_diegetic_rewrite: true,
        net_contradictions_not_increased: true,
        world_identity_preserved: true
      }
    })
  );
});

test("malformed YAML records a warn parse issue and still emits a partial node", () => {
  const { source, filePath } = loadFixture("fixture-yaml-malformed.md");
  const { tree, lines } = parseMarkdown(source);
  const { nodes, parseIssues } = extractYamlNodes(tree, lines, filePath);

  assert.equal(nodes.length, 1);
  assert.equal(parseIssues.length, 1);
  const parseIssue = parseIssues[0];
  const node = nodes[0];
  assert.ok(parseIssue);
  assert.ok(node);
  assert.equal(parseIssue.severity, "warn");
  assert.equal(parseIssue.validator_name, "yaml_parse_integrity");
  assert.equal(parseIssue.code, "yaml_syntax_error");
  assert.equal(node.node_type, "canon_fact_record");
  assert.equal(node.body, "foo: [bar");
  assert.equal(node.content_hash, contentHashForProse("foo: [bar"));
});

test("missing required statement records a yaml_parse_integrity warning and keeps CF routing", () => {
  const { source, filePath } = loadFixture("fixture-yaml-missing-field.md");
  const { tree, lines } = parseMarkdown(source);
  const { nodes, parseIssues } = extractYamlNodes(tree, lines, filePath);

  assert.equal(nodes.length, 1);
  const node = nodes[0];
  const parseIssue = parseIssues[0];
  assert.ok(node);
  assert.ok(parseIssue);
  assert.equal(node.node_type, "canon_fact_record");
  assert.equal(parseIssues.length, 1);
  assert.equal(parseIssue.severity, "warn");
  assert.equal(parseIssue.code, "missing_required_field:statement");
});

test("unknown top-level fields are preserved in the parsed YAML-backed node contract", () => {
  const { source, filePath } = loadFixture("fixture-yaml-unknown-field.md");
  const { tree, lines } = parseMarkdown(source);
  const { nodes, parseIssues } = extractYamlNodes(tree, lines, filePath);
  const node = nodes[0];
  assert.ok(node);

  assert.equal(nodes.length, 1);
  assert.equal(parseIssues.length, 0);
  assert.equal(node.node_type, "canon_fact_record");

  const rawNode = YAML.parse(node.body) as Record<string, unknown>;
  assert.deepEqual(rawNode.exception_governance, { waiver_body: "Admiralty Court" });
  assert.equal(rawNode.id, "CF-0003");
});

test("YAML outside canonical ledger sections is routed as a generic section node and flagged as info", () => {
  const { source, filePath } = loadFixture("fixture-yaml-other-section.md");
  const { tree, lines } = parseMarkdown(source);
  const { nodes, parseIssues } = extractYamlNodes(tree, lines, filePath);

  assert.equal(nodes.length, 1);
  const node = nodes[0];
  const parseIssue = parseIssues[0];
  assert.ok(node);
  assert.ok(parseIssue);
  assert.equal(node.node_type, "section");
  assert.equal(parseIssues.length, 1);
  assert.equal(parseIssue.severity, "info");
  assert.equal(parseIssue.code, "unexpected_yaml_section");
});

test("section ancestry determines CF versus CH routing even for identical raw YAML", () => {
  const { source, filePath } = loadFixture("fixture-yaml-section-routing.md");
  const { tree, lines } = parseMarkdown(source);
  const { nodes, parseIssues } = extractYamlNodes(tree, lines, filePath);

  assert.equal(nodes.length, 2);
  const firstNode = nodes[0];
  const secondNode = nodes[1];
  assert.ok(firstNode);
  assert.ok(secondNode);
  assert.equal(firstNode.node_type, "canon_fact_record");
  assert.equal(secondNode.node_type, "change_log_entry");
  assert.equal(firstNode.body, secondNode.body);
  assert.deepEqual(
    parseIssues.map((issue) => issue.code),
    ["missing_required_field:id", "missing_required_field:change_id"]
  );
});
