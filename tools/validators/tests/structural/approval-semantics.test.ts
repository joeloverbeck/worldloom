import assert from "node:assert/strict";
import test from "node:test";

import { approvalSemantics } from "../../src/structural/approval-semantics.js";
import { context, record, validCf } from "./helpers.js";

test("approval_semantics rejects direct_user_approval on non-CF records", async () => {
  const verdicts = await approvalSemantics.run(
    undefined,
    context([
      record("retcon_proposal_card", "RP-1", "audits/AU-1/retcon-proposals/RP-1.md", {
        source_basis: {
          direct_user_approval: false,
          user_approved: false
        }
      })
    ])
  );

  assert.equal(verdicts.length, 1);
  assert.equal(verdicts[0]?.validator, "approval_semantics");
  assert.equal(verdicts[0]?.severity, "fail");
  assert.equal(verdicts[0]?.code, "approval_semantics.direct_user_approval_reserved");
  assert.match(verdicts[0]?.message ?? "", /reserved for accepted canon_fact_record records/);
  assert.match(verdicts[0]?.message ?? "", /source_basis\.user_approved/);
  assert.deepEqual(verdicts[0]?.location, {
    file: "audits/AU-1/retcon-proposals/RP-1.md",
    node_id: "RP-1"
  });
});

test("approval_semantics preserves the CF direct_user_approval carve-out", async () => {
  const verdicts = await approvalSemantics.run(
    undefined,
    context([
      record("canon_fact_record", "CF-1", "_source/canon/CF-1.yaml", validCf)
    ])
  );

  assert.deepEqual(verdicts, []);
});

test("approval_semantics accepts proposal-side user_approved fields", async () => {
  const verdicts = await approvalSemantics.run(
    undefined,
    context([
      record("character_proposal_card", "NCP-1", "characters/proposals/NCP-1.md", {
        source_basis: {
          user_approved: true,
          generated_by: "character-dossier"
        }
      }),
      record("diegetic_artifact_record", "DA-1", "diegetic-artifacts/DA-1.md", {
        source_basis: {
          user_approved: false
        }
      })
    ])
  );

  assert.deepEqual(verdicts, []);
});
