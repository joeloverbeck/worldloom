# HARD-GATE Read Triage

Use this reference when deciding whether `docs/HARD-GATE-DISCIPLINE.md` must be read for a ticket that touches canon-write paths, validation signals, pre-apply behavior, or story-record contracts.

## Required Reads

- Read `docs/HARD-GATE-DISCIPLINE.md` before preparing or submitting a patch plan that mutates engine-only source under `worlds/<slug>/_source/` or `worlds/<slug>/stories/<story-slug>/_source/`. Test-only, temp-fixture, or package-local integration calls to `submit_patch_plan` / `submitPatchPlan` count for this read requirement even when they do not mutate a live world.
- Read it before finalizing reassessment when the ticket changes validation signals used by HARD-GATE flows, including skill HARD-GATE semantics, canon-write ordering, Mystery Reserve firewall enforcement/gate behavior, approval-token behavior, `validate_patch_plan`, `submit_patch_plan`, pre-apply validation, content-generating skill pre-flight input validation, parse-time consumer schema checks, handoff-artifact required-field validation, or other machine-facing validation signals.
- Docs-only edits to `engine-envelope-shape.md` or similar envelope-construction references require the read when they change schema-discovery guidance, patch-plan assembly guidance, approval-token guidance, validate/submit behavior, or pre-apply validation expectations.
- Edits to content-generating skills' Phase 9 validation-gate rows, `validation_trace` semantics, operator PASS/FAIL criteria, or required-field checks for handoff artifacts such as remediation storylet proposal cards and `source_audit_path` require the read even when no validator code changes.

## Usually Not Required

- A pure command substitution inside an unchanged gated sequence, such as replacing one bootstrap command with another while preserving order, approval, failure handling, and validation signals.
- Retrieval-time error recovery or diagnostic audit fields, unless they alter `validate_patch_plan`, `submit_patch_plan`, approval-token behavior, pre-apply validation, or a canon-mutation gate.
- Running `validate_patch_plan`, `validate-patch-plan`, or an equivalent pre-apply validator only as downstream proof when the active ticket does not change validation behavior, schemas, gate order, approval-token semantics, pre-apply semantics, or another validation signal. Record the command as proof-only if the distinction affects reassessment or closeout.
- Story-record contract or skill-prescription edits merely because they rename, add, or remove authored record fields. Record `HARD-GATE read: not required` when reassessment proves the ticket does not change skill HARD-GATE wording, validator behavior, `validation_trace`, approval-token behavior, submit/validate flow, pre-apply behavior, or machine-enforced required-field checks.
- Non-semantic inventory, output-list, record-class-list, or deliverable-summary updates inside an existing `<HARD-GATE>` block do not require the read when the edit preserves gate order, approval timing, failure handling, operator PASS/FAIL criteria, validation semantics, and submit/approval-token behavior. In the pre-edit checkpoint, record `HARD-GATE read: not required` and name the unchanged gate behavior. If the edit changes what must pass, when approval fires, what counts as failure, or what the operator must approve, treat it as a HARD-GATE semantics change and read `docs/HARD-GATE-DISCIPLINE.md`.

## Borderline Cases

- Read-only introspection of envelope, approval-token, pre-apply, `validate_patch_plan`, or `submit_patch_plan` contracts counts as a machine-facing validation-signal change for reassessment.
- Read-only retrieval or visibility work that merely surfaces Mystery Reserve constraints does not require the extra HARD-GATE read by default.
- If a story-record schema change also touches enforcement surfaces, read `docs/HARD-GATE-DISCIPLINE.md` before finalizing reassessment.
