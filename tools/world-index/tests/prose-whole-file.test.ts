import assert from "node:assert/strict";
import test from "node:test";

import { parseMarkdown } from "../src/parse/markdown.js";
import { extractProseNodes } from "../src/parse/prose.js";

function parseWholeFile(relativePath: string, source: string) {
  const { tree, lines } = parseMarkdown(source);
  return extractProseNodes(tree, lines, relativePath, "animalia");
}

test("whole-file record families prefer canonical frontmatter ids", () => {
  const cases = [
    {
      relativePath: "diegetic-artifacts/a-season-on-the-circuit.md",
      expectedNodeType: "diegetic_artifact_record",
      source: ["---", "artifact_id: DA-0001", "---", "", "# Artifact"].join("\n"),
      expectedNodeId: "DA-0001"
    },
    {
      relativePath: "characters/vespera-nightwhisper.md",
      expectedNodeType: "character_record",
      source: ["---", "character_id: CHAR-0001", "---", "", "# Character"].join("\n"),
      expectedNodeId: "CHAR-0001"
    },
    {
      relativePath: "proposals/corner-share.md",
      expectedNodeType: "proposal_card",
      source: ["---", "proposal_id: PR-0010", "---", "", "# Proposal"].join("\n"),
      expectedNodeId: "PR-0010"
    },
    {
      relativePath: "pressure-events/salt-caravan-collapse.md",
      expectedNodeType: "pressure_event_card",
      source: ["---", "event_id: EPE-0001", "---", "", "# Pressure Event"].join("\n"),
      expectedNodeId: "EPE-0001"
    },
    {
      relativePath: "pressure-events/salt-caravan-collapse.proposal.md",
      expectedNodeType: "pressure_event_sidecar_proposal",
      source: ["---", "proposal_id: PR-0011", "---", "", "# Pressure Event Proposal"].join("\n"),
      expectedNodeId: "PR-0011"
    },
    {
      relativePath: "pressure-events/batches/pressure-round.md",
      expectedNodeType: "pressure_event_batch",
      source: ["---", "batch_id: BATCH-0001", "---", "", "# Pressure Event Batch"].join("\n"),
      expectedNodeId: "animalia:pressure-round.md:pressure-round:0"
    },
    {
      relativePath: "world-proposals/unburied-calendar.md",
      expectedNodeType: "world_proposal_card",
      source: ["---", "proposal_id: NWP-0001", "---", "", "# World Proposal"].join("\n"),
      expectedNodeId: "NWP-0001"
    },
    {
      relativePath: "world-proposals/batches/origin-round.md",
      expectedNodeType: "world_proposal_batch",
      source: ["---", "batch_id: NWB-0001", "---", "", "# World Proposal Batch"].join("\n"),
      expectedNodeId: "NWB-0001"
    },
    {
      relativePath: "character-proposals/bruenna-lockwash.md",
      expectedNodeType: "character_proposal_card",
      source: ["---", "proposal_id: NCP-0001", "---", "", "# Character Proposal"].join("\n"),
      expectedNodeId: "NCP-0001"
    },
    {
      relativePath: "character-proposals/batches/founding-round.md",
      expectedNodeType: "character_proposal_batch",
      source: ["---", "batch_id: NCB-0001", "---", "", "# Character Proposal Batch"].join("\n"),
      expectedNodeId: "NCB-0001"
    },
    {
      relativePath: "audits/animalia-audit.md",
      expectedNodeType: "audit_record",
      source: ["---", "audit_id: AU-0001", "---", "", "# Audit"].join("\n"),
      expectedNodeId: "AU-0001"
    }
  ] as const;

  for (const fixture of cases) {
    const nodes = parseWholeFile(fixture.relativePath, fixture.source);
    assert.equal(nodes.length, 1);
    assert.equal(nodes[0]?.node_id, fixture.expectedNodeId);
    assert.equal(nodes[0]?.node_type, fixture.expectedNodeType);
  }
});

test("whole-file records fall back when the canonical frontmatter id is missing or malformed", () => {
  const missingIdNodes = parseWholeFile(
    "diegetic-artifacts/a-season-on-the-circuit.md",
    ["---", "title: No id here", "---", "", "# Artifact"].join("\n")
  );
  assert.equal(
    missingIdNodes[0]?.node_id,
    "animalia:a-season-on-the-circuit.md:a-season-on-the-circuit:0"
  );

  const malformedIdNodes = parseWholeFile(
    "proposals/corner-share.md",
    ["---", "proposal_id: not-a-proposal-id", "---", "", "# Proposal"].join("\n")
  );
  assert.equal(malformedIdNodes[0]?.node_id, "animalia:corner-share.md:corner-share:0");

  const invalidFrontmatterNodes = parseWholeFile(
    "audits/animalia-audit.md",
    ["---", "audit_id: [", "---", "", "# Audit"].join("\n")
  );
  assert.equal(invalidFrontmatterNodes[0]?.node_id, "animalia:animalia-audit.md:animalia-audit:0");
});
