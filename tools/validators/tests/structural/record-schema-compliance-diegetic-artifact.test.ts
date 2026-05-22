import assert from "node:assert/strict";
import test from "node:test";

import { recordSchemaCompliance } from "../../src/structural/record-schema-compliance.js";
import { context } from "./helpers.js";

test("record_schema_compliance accepts template-conformant diegetic artifact claim_map entries", async () => {
  const result = await recordSchemaCompliance.run(
    {
      files: [
        {
          path: "diegetic-artifacts/DA-10-test.md",
          content: diegeticArtifactMarkdown("DA-10", validClaimMap())
        }
      ]
    },
    context([])
  );

  assert.equal(result.length, 0);
});

test("record_schema_compliance rejects diegetic artifact claim_map enum drift", async () => {
  const result = await recordSchemaCompliance.run(
    {
      files: [
        {
          path: "diegetic-artifacts/DA-11-test.md",
          content: diegeticArtifactMarkdown("DA-11", {
            ...validClaimMap(),
            canon_status: "canonization_allowed"
          })
        }
      ]
    },
    context([])
  );

  assert.ok(hasSchemaViolation(result, "DA-11", "enum", "/claim_map/0/canon_status"));
});

test("record_schema_compliance rejects canonically_true claim_map entries without cf_id", async () => {
  const claim = validClaimMap();
  delete claim.cf_id;

  const result = await recordSchemaCompliance.run(
    {
      files: [
        {
          path: "diegetic-artifacts/DA-12-test.md",
          content: diegeticArtifactMarkdown("DA-12", claim)
        }
      ]
    },
    context([])
  );

  assert.ok(hasSchemaViolation(result, "DA-12", "required", "/claim_map/0"));
});

test("record_schema_compliance rejects mystery_adjacent claim_map entries without mr_id", async () => {
  const claim = {
    ...validClaimMap(),
    canon_status: "mystery_adjacent",
    cf_id: null
  };
  delete claim.mr_id;

  const result = await recordSchemaCompliance.run(
    {
      files: [
        {
          path: "diegetic-artifacts/DA-13-test.md",
          content: diegeticArtifactMarkdown("DA-13", claim)
        }
      ]
    },
    context([])
  );

  assert.ok(hasSchemaViolation(result, "DA-13", "required", "/claim_map/0"));
});

type ClaimMapEntry = {
  claim: string;
  canon_status: string;
  narrator_belief: string;
  source: string;
  contradiction_risk: string;
  mode: string;
  adaptive_behavior_preserved_under_wrong_ontology: boolean;
  cf_id?: string | null;
  mr_id?: string | null;
  repair_trace: Record<string, unknown> | null;
};

function validClaimMap(): ClaimMapEntry {
  return {
    claim: "The author witnessed the Mudbrook audit.",
    canon_status: "canonically_true",
    narrator_belief: "true",
    source: "witnessed",
    contradiction_risk: "none",
    mode: "direct",
    adaptive_behavior_preserved_under_wrong_ontology: false,
    cf_id: "CF-0001",
    mr_id: null,
    repair_trace: null
  };
}

function diegeticArtifactMarkdown(artifactId: string, claim: ClaimMapEntry): string {
  return [
    "---",
    `artifact_id: ${artifactId}`,
    "slug: test-artifact",
    "title: Test Artifact",
    "artifact_type: report",
    "author: Test Author",
    "author_character_id: null",
    "date: 2026-05-22",
    "place: Mudbrook",
    "audience: internal",
    "communicative_purpose: narrate",
    "desired_relation_to_truth: accurate",
    "author_profile: {}",
    "epistemic_horizon: {}",
    "claim_map:",
    ...claimMapLines(claim),
    "world_consistency: {}",
    "source_basis: {}",
    "---",
    "# Test Artifact",
    "",
    "Body prose."
  ].join("\n");
}

function claimMapLines(claim: ClaimMapEntry): string[] {
  const lines = [
    `  - claim: ${claim.claim}`,
    `    canon_status: ${claim.canon_status}`,
    `    narrator_belief: "${claim.narrator_belief}"`,
    `    source: ${claim.source}`,
    `    contradiction_risk: ${claim.contradiction_risk}`,
    `    mode: ${claim.mode}`,
    `    adaptive_behavior_preserved_under_wrong_ontology: ${claim.adaptive_behavior_preserved_under_wrong_ontology}`
  ];
  if ("cf_id" in claim) {
    lines.push(`    cf_id: ${claim.cf_id ?? "null"}`);
  }
  if ("mr_id" in claim) {
    lines.push(`    mr_id: ${claim.mr_id ?? "null"}`);
  }
  lines.push("    repair_trace: null");
  return lines;
}

function hasSchemaViolation(
  result: Awaited<ReturnType<typeof recordSchemaCompliance.run>>,
  nodeId: string,
  keyword: string,
  instancePath: string
): boolean {
  return result.some(
    (verdict) =>
      verdict.location.node_id === nodeId &&
      verdict.code === `record_schema_compliance.${keyword}` &&
      verdict.message.includes(instancePath)
  );
}
