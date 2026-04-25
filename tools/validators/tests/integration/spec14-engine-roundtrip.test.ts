import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { canonicalOpHash, submitPatchPlan, type PatchOperation, type PatchPlanEnvelope } from "@worldloom/patch-engine";
import { openIndex } from "@worldloom/world-index/index/open";

import { recordSchemaCompliance } from "../../src/structural/record-schema-compliance.js";
import { context } from "../structural/helpers.js";

const WORLD_SLUG = "spec14-roundtrip";

test("SPEC-14 roundtrip: engine-emitted PA frontmatter passes record_schema_compliance", async (t) => {
  const worldRoot = fs.mkdtempSync(path.join(os.tmpdir(), "worldloom-spec14-roundtrip-"));
  const worldPath = path.join(worldRoot, "worlds", WORLD_SLUG);
  fs.mkdirSync(path.join(worldPath, "_source"), { recursive: true });
  fs.writeFileSync(path.join(worldPath, "WORLD_KERNEL.md"), "# Kernel\n\nA minimal test world.\n", "utf8");
  fs.writeFileSync(path.join(worldPath, "ONTOLOGY.md"), "# Ontology\n\n## Categories in Use\n\n- entity\n", "utf8");
  const db = openIndex(worldRoot, WORLD_SLUG);
  db.close();
  const secret = Buffer.from("spec14-roundtrip-secret");
  const secretPath = path.join(worldRoot, "tools", "world-mcp", ".secret");
  fs.mkdirSync(path.dirname(secretPath), { recursive: true });
  fs.writeFileSync(secretPath, secret, { mode: 0o600 });
  t.after(() => fs.rmSync(worldRoot, { recursive: true, force: true }));

  const patch: PatchOperation = {
    op: "append_adjudication_record",
    target_world: WORLD_SLUG,
    target_file: "adjudications/PA-0001-roundtrip.md",
    payload: {
      adjudication_frontmatter: {
        pa_id: "PA-0001",
        verdict: "ACCEPT",
        date: "2026-04-25",
        originating_skill: "canon-addition",
        mystery_reserve_touched: [],
        invariants_touched: [],
        cf_records_touched: [],
        open_questions_touched: ["OQ-0001"],
        change_id: "CH-0001"
      },
      body_markdown: "# PA-0001 -- Adjudication Record\n\nEngine-emitted body prose."
    }
  };
  const oqPatch: PatchOperation = {
    op: "create_oq_record",
    target_world: WORLD_SLUG,
    payload: {
      oq_record: {
        id: "OQ-0001",
        topic: "Roundtrip question",
        body: "A minimal open question keeps the test world atomic-source enabled.",
        when_to_resolve: "When the test requires it.",
        extensions: []
      }
    }
  };
  const envelope: PatchPlanEnvelope = {
    plan_id: "PLAN-SPEC14-ROUNDTRIP",
    target_world: WORLD_SLUG,
    approval_token: "unused",
    verdict: "ACCEPT",
    originating_skill: "canon-addition",
    expected_id_allocations: { oq_ids: ["OQ-0001"], pa_ids: ["PA-0001"] },
    patches: [oqPatch, patch]
  };

  const result = await submitPatchPlan(envelope, signedToken(envelope, secret), {
    worldRoot,
    hmacSecretPath: secretPath,
    preApplyValidator: async () => ({ ok: true })
  });

  assert.ok(!("ok" in result), JSON.stringify(result));
  const relativePath = "adjudications/PA-0001-roundtrip.md";
  const content = fs.readFileSync(path.join(worldPath, relativePath), "utf8");
  const verdicts = await recordSchemaCompliance.run(
    { files: [{ path: relativePath, content }] },
    context([], { world_slug: WORLD_SLUG })
  );

  assert.deepEqual(verdicts, []);
});

function signedToken(envelope: PatchPlanEnvelope, secret: Buffer): string {
  const payload = JSON.stringify({
    plan_id: envelope.plan_id,
    world_slug: envelope.target_world,
    patch_hashes: envelope.patches.map(canonicalOpHash),
    issued_at: "2026-04-25T00:00:00.000Z",
    expires_at: "2999-01-01T00:00:00.000Z"
  });
  const signature = createHmac("sha256", secret).update(Buffer.from(payload, "utf8")).digest("hex");
  return Buffer.from(`${payload}.${signature}`, "utf8").toString("base64url");
}
