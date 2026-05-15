import assert from "node:assert/strict";
import test from "node:test";

import { auditOnlySeShape } from "../../src/structural/audit-only-se-shape.js";
import { context, record } from "./helpers.js";

test("audit_only_se_shape accepts a valid promotion_closeout event", async () => {
  const verdicts = await auditOnlySeShape.run(
    undefined,
    context([auditOnlyEvent("SE-0001", { event_kind: "promotion_closeout" })])
  );

  assert.deepEqual(verdicts, []);
});

test("audit_only_se_shape rejects audit-only events with non-empty state deltas", async () => {
  const verdicts = await auditOnlySeShape.run(
    undefined,
    context([
      auditOnlyEvent("SE-0001", {
        state_delta: {
          create: ["SF-0001"],
          supersede: [],
          close: []
        }
      })
    ])
  );

  assert.ok(verdicts.some((verdict) => verdict.code === "audit_only_se_shape_violation"));
  assert.ok(verdicts.some((verdict) => verdict.message.includes("state_delta.create")));
});

test("audit_only_se_shape rejects audit-only events with selected storylets", async () => {
  const verdicts = await auditOnlySeShape.run(
    undefined,
    context([
      auditOnlyEvent("SE-0001", {
        commitment: {
          selected_slt_id: "SLT-0001",
          selection_source: "author_pool",
          alias_bindings: {}
        }
      })
    ])
  );

  assert.ok(verdicts.some((verdict) => verdict.message.includes("selected_slt_id")));
  assert.ok(verdicts.some((verdict) => verdict.message.includes("selection_source")));
});

test("audit_only_se_shape rejects audit-only events with alias bindings", async () => {
  const verdicts = await auditOnlySeShape.run(
    undefined,
    context([
      auditOnlyEvent("SE-0001", {
        commitment: {
          selected_slt_id: null,
          selection_source: "none",
          alias_bindings: { actor: "STENT-0001" }
        }
      })
    ])
  );

  assert.ok(verdicts.some((verdict) => verdict.message.includes("alias_bindings")));
});

test("audit_only_se_shape rejects audit-only events with resolution or promotion claims", async () => {
  const verdicts = await auditOnlySeShape.run(
    undefined,
    context([
      auditOnlyEvent("SE-0001", {
        resolution: {
          result: "success",
          player_visible_feedback: "The closeout resolves cleanly."
        },
        promotion_claims: [{ source_record: "SF-0001", authority: "apparent" }]
      })
    ])
  );

  assert.ok(verdicts.some((verdict) => verdict.message.includes("omit resolution")));
  assert.ok(verdicts.some((verdict) => verdict.message.includes("promotion_claims")));
});

test("audit_only_se_shape rejects audit-only events used as page-producing input", async () => {
  const verdicts = await auditOnlySeShape.run(
    undefined,
    context([
      auditOnlyEvent("SE-0001"),
      record("page_record", "test-story:PG-0002", "stories/test-story/_source/pages/PG-0002.yaml", {
        id: "PG-0002",
        story_id: "STORY-001",
        input: { resolved_event_id: "SE-0001" }
      })
    ])
  );

  assert.ok(verdicts.some((verdict) => verdict.message.includes("input.resolved_event_id")));
});

test("audit_only_se_shape is pre-apply scoped to create_se_record plans", () => {
  assert.equal(auditOnlySeShape.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_pg_record") })), false);
  assert.equal(auditOnlySeShape.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_se_record") })), true);
});

function auditOnlyEvent(id: string, overrides: Record<string, unknown> = {}) {
  return {
    ...record("story_event_record", `test-story:${id}`, `stories/test-story/_source/events/${id}.yaml`, {
      id,
      story_id: "STORY-001",
      created_at_page: "PG-0002",
      parent_page_id: "PG-0002",
      event_kind: "prose_attach",
      actor: "system",
      commitment: {
        selected_slt_id: null,
        selection_source: "none",
        alias_bindings: {}
      },
      outcome_route: "accept",
      world_logic_rationale: "Audit-only ledger event.",
      state_delta: {
        create: [],
        supersede: [],
        close: []
      },
      promotion_claims: [],
      ...overrides
    }),
    story_slug: "test-story"
  };
}

function patchPlan(op: "create_pg_record" | "create_se_record") {
  return {
    plan_id: "plan-audit-only",
    target_world: "test",
    approval_token: "placeholder",
    verdict: "story_audit",
    originating_skill: "test",
    expected_id_allocations: {},
    patches: [{ op, target_world: "test", payload: { story_slug: "test-story", record: { id: "SE-0001" } } }]
  };
}
