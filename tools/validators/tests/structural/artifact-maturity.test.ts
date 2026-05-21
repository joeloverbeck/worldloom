import assert from "node:assert/strict";
import test from "node:test";

import { artifactMaturity } from "../../src/structural/artifact-maturity.js";
import { context, record } from "./helpers.js";

test("artifact_maturity rejects a character proposal framed as a realized dossier", async () => {
  const verdicts = await artifactMaturity.run(
    {},
    context([
      characterProposal({
        authority_tier: "realized_character_dossier",
        title: "Salt Court Witness"
      })
    ], { run_mode: "pre-apply" })
  );

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.validator, "artifact_maturity");
  assert.equal(verdicts[0]?.severity, "fail");
  assert.equal(verdicts[0]?.code, "artifact_maturity.collapse");
  assert.match(verdicts[0]?.message ?? "", /candidate character proposal/);
  assert.match(verdicts[0]?.message ?? "", /realized hybrid/);
  assert.match(verdicts[0]?.message ?? "", /character-generation/);
  assert.deepEqual(verdicts[0]?.location, {
    file: "character-proposals/NCP-1-salt-court-witness.md",
    node_id: "NCP-1"
  });
});

test("artifact_maturity accepts correctly framed candidate proposals", async () => {
  const verdicts = await artifactMaturity.run(
    {},
    context([
      characterProposal({
        authority_tier: "candidate_character",
        title: "Salt Court Witness"
      })
    ])
  );

  assert.deepEqual(verdicts, []);
});

test("artifact_maturity warns on full-world maturity collapse", async () => {
  const verdicts = await artifactMaturity.run(
    {},
    context([
      characterProposal({
        authority_tier: "character_record",
        title: "Salt Court Witness"
      })
    ], { run_mode: "full-world" })
  );

  assert.equal(verdicts[0]?.severity, "warn");
});

test("artifact_maturity scans markdown content when indexed parsed body lacks frontmatter", async () => {
  const content = [
    "---",
    "proposal_id: NCP-2",
    "title: Brine Oracle",
    "---",
    "# Brine Oracle",
    "",
    "This file presents itself as a realized character dossier."
  ].join("\n");

  const verdicts = await artifactMaturity.run(
    {
      files: [
        {
          path: "character-proposals/NCP-2-brine-oracle.md",
          content
        }
      ]
    },
    context([])
  );

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.location.node_id, "NCP-2");
  assert.equal(verdicts[0]?.detail && typeof verdicts[0].detail === "object"
    ? (verdicts[0].detail as { routing_skill?: string }).routing_skill
    : undefined, "character-generation");
});

function characterProposal(overrides: Record<string, unknown> = {}) {
  return record("character_proposal_card", "NCP-1", "character-proposals/NCP-1-salt-court-witness.md", {
    proposal_id: "NCP-1",
    source_basis: {
      user_approved: false
    },
    ...overrides
  });
}
