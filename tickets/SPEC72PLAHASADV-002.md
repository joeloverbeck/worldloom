# SPEC72PLAHASADV-002: Shared contract — split-signal hash_integrity semantics + Tooling carve-out

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/_shared-templates/story-record-schemas.md` (canonical contract consumed by all 8 story-pipeline skills plus the `prose_receipt_schema_compliance` validator). No code changes.
**Deps**: None

## Problem

The shared story-record contract at `.claude/skills/_shared-templates/story-record-schemas.md` is the canonical reference for `hash_integrity` field semantics (§4.6 prose receipt schema) and for the `compute-pg-hashes` CLI mandate (§4.2a Deterministic PG hash computation, Tooling paragraph at line 157). Both sections currently encode the binary `accept_plan_drift`-gated FAIL semantics that SPEC-72 replaces with a split signal (plan_hash drift → WARN advisory; state_hash drift → FAIL tamper).

Specifically: §4.6 line 919 currently reads *"`hash_integrity` is `PASS` when the recorded `PG.plan.plan_hash` and `PG.state_hash` are lowercase sha256-shaped and match the recomputed plan/state hashes, `WARN` when drift is accepted because `accept_plan_drift=true`, and `FAIL` when drift is not accepted or either PG hash field is missing, placeholder, or non-sha256"* — which assumes the `accept_plan_drift` input still exists and that plan_hash drift defaults to FAIL. §4.2a line 157 currently reads *"Every PG-authoring OR PG-verifying skill (PG-authoring: `branching-story-bootstrap` Phase 7 hash steps, `branching-story-turn-cycle` Phase 9; PG-verifying: `branching-story-prose-attach` Phase 2 `computed_state_hash` recomputation against the committed `PG.state_hash` for `hash_integrity` check) MUST compute these hashes through the canonical CLI at `tools/world-mcp/dist/src/cli/compute-pg-hashes.js`"* — which forces prose-attach Phase 2 to use the CLI, but the CLI's `applyComputedPlanHash` step (`tools/world-mcp/src/cli/compute-pg-hashes.ts:211`) re-reads the plan file and overwrites `plan.plan_hash` before computing `state_hash`, re-introducing the very plan-file→state-hash coupling SPEC-72 §2.2 removes.

This ticket lands SPEC-72 §2.3 contract updates: §4.6 hash_integrity semantics flip to the split signal; §4.2a Tooling paragraph narrows the CLI mandate to PG-authoring skills only.

## Assumption Reassessment (2026-05-23)

1. `.claude/skills/_shared-templates/story-record-schemas.md` §4.6 lives at line 873-933 (the prose receipt schema definition). The `hash_integrity` semantics paragraph at line 919 cites `accept_plan_drift=true` and treats plan_hash drift as FAIL-by-default. §4.2a Deterministic PG hash computation lives at lines 141-165; the Tooling paragraph at line 157 mandates `compute-pg-hashes` CLI for both PG-authoring (`branching-story-bootstrap` Phase 7, `branching-story-turn-cycle` Phase 9) and PG-verifying (`branching-story-prose-attach` Phase 2) cases. Both anchor points were verified at audit time during `/reassess-spec` on SPEC-72.
2. SPEC-72 §2.3 prescribes both edits in the same bullet list. The §4.6 wording target is given inline ("PASS when nothing drifted; WARN when only plan_hash drifted; FAIL only on state_hash drift or a missing/placeholder/non-sha256 state_hash"). The §4.2a edit was surfaced as a HIGH Issue (I1) at `/reassess-spec` time and added to the spec's §2.3 bullet list during the reassessment.
3. Cross-skill boundary: the shared contract is consumed by all 8 story-pipeline skills (`story-character-profile`, `branching-story-bootstrap`, `branching-story-turn-cycle`, `branching-story-prose-attach`, `commitment-block-authoring`, `branching-story-health-audit`, `story-fact-promotion-to-canon`, `story-promotion-closeout`) per FOUNDATIONS §Story Bundles §7, plus the `prose_receipt_schema_compliance` validator at `tools/validators` (named in §4.6 line 875). The §4.6 wording change affects how prose-attach Phase 2 computes the `hash_integrity` verdict; SPEC72PLAHASADV-003 lands that operational change. The §4.2a wording change affects which skills the CLI mandate covers; PG-authoring skills (bootstrap Phase 7, turn-cycle Phase 9) continue using the CLI unchanged, prose-attach Phase 2 stops using it for state_hash recomputation (also landed in -003). No other consumer of §4.2a exists in the pipeline.
4. FOUNDATIONS §Story Bundles §4a (Plan-Authority Boundary) and §5b (Schema-Minimalism) are the load-bearing principles. §4a: "Story state is authoritative at page-plan commit. Rendered prose is a rendering of that state, not a second state engine." The §4.6 split-signal semantics align the receipt verdict with §4a — plan_hash drift (a rendering-input mismatch) is advisory, while state_hash drift (a committed-state-tamper mismatch) stays FAIL. §5b: "Every field in every story-bundle record schema must be load-bearing." Removing the `accept_plan_drift` toggle from the §4.6 semantics (landed in -003 for the SKILL.md surface) aligns the receipt schema with §5b — the toggle is no longer load-bearing because advisory is now the default for plan_hash drift.

## Architecture Check

1. The contract update is documentation-only — no code changes, no schema changes (the `prose-receipt.schema.json` `hash_integrity` enum is already `PASS/WARN/FAIL` per `tools/validators/src/schemas/prose-receipt.schema.json:49`, so the §4.6 prose simply re-aligns with what the schema enum already permits). The §4.2a edit narrows a documented mandate; the underlying CLI is unchanged (SPEC-72 §3 Out of scope explicitly preserves CLI behavior). This is the cleanest possible shape — update the canonical reference once, and operational changes in sibling tickets flow from the updated reference.
2. No backwards-compatibility aliasing/shims: the §4.6 wording removes the `accept_plan_drift=true` reference outright rather than gating it behind a "legacy semantics" carve-out. The §4.2a wording narrows the CLI mandate outright rather than introducing a "PG-verifying contexts MAY use the CLI" hedge. Per CLAUDE.md §Core Rules and the project's no-backcompat-shims discipline, the contract is updated to the new state, not bridged through both.

## Verification Layers

1. §4.6 hash_integrity semantics paragraph at line 919 reflects the split signal (plan_hash drift → WARN; state_hash drift → FAIL only) → grep-proof: `grep -n "accept_plan_drift" .claude/skills/_shared-templates/story-record-schemas.md` returns zero matches inside §4.6 (the `accept_plan_drift` reference is gone); `grep -n "hash_integrity\` is .PASS" .claude/skills/_shared-templates/story-record-schemas.md` confirms the new wording at the §4.6 line.
2. §4.2a Tooling paragraph at line 157 reflects the narrowed CLI mandate → grep-proof: `grep -n "PG-verifying.*compute through.*CLI\|PG-verifying.*MUST compute" .claude/skills/_shared-templates/story-record-schemas.md` returns zero matches (the prose-attach mandate is gone); `grep -n "PG-authoring" .claude/skills/_shared-templates/story-record-schemas.md` confirms the surviving authoring-only mandate; `grep -n "computePgStateHash" .claude/skills/_shared-templates/story-record-schemas.md` confirms the new prose-attach carve-out cites the `@worldloom/world-index/hash/content` import path.
3. `prose_receipt_schema_compliance` continues to validate receipts against the unchanged `prose-receipt.schema.json` → `npm test --prefix tools/validators` passes (no schema file is edited; the contract prose is the documented reference for the schema's intent).

## What to Change

### 1. `story-record-schemas.md` §4.6 — split-signal `hash_integrity` semantics

Modify the `hash_integrity` description paragraph at `.claude/skills/_shared-templates/story-record-schemas.md:919` (inside the §4.6 prose receipt section, the paragraph beginning *"The `checks` mapping contains eight deterministic prose/state checks, the surfaced `char_authority_leak` verdict from `no_char_authority_in_story_runtime`, plus the optional `craft_critic` result."*). Replace the `hash_integrity` clause from:

> *"`hash_integrity` is `PASS` when the recorded `PG.plan.plan_hash` and `PG.state_hash` are lowercase sha256-shaped and match the recomputed plan/state hashes, `WARN` when drift is accepted because `accept_plan_drift=true`, and `FAIL` when drift is not accepted or either PG hash field is missing, placeholder, or non-sha256."*

to:

> *"`hash_integrity` is `PASS` when the recorded `PG.plan.plan_hash` and `PG.state_hash` are lowercase sha256-shaped and match the recomputed plan/state hashes, `WARN` when only the recorded `plan_hash` drifted from the on-disk page-plan body (plan-only drift is advisory per SPEC-72 / FOUNDATIONS §Story Bundles §4a Plan-Authority Boundary), and `FAIL` only on `state_hash` drift (genuine PG-record tamper) or a missing/placeholder/non-sha256 `state_hash`. The `plan_hash` field is structurally validated at PG schema-compliance time (`tools/validators/src/schemas/story-page.schema.json` requires `^[0-9a-f]{64}$`), so prose-attach Phase 2 sees only well-formed `plan_hash` values; their drift is advisory regardless. `state_hash` is recomputed from the committed PG record's own stored fields (the `snapshot_replay_equality` basis — `computePgStateHash` from `@worldloom/world-index/hash/content`), not by re-reading the plan file."*

Preserve the rest of the paragraph (the `required_event_rendered` subcheck discussion, the `choice_consequence_visibility` discussion) verbatim — only the `hash_integrity` clause changes.

### 2. `story-record-schemas.md` §4.2a — narrow the Tooling CLI mandate

Modify the Tooling paragraph at `.claude/skills/_shared-templates/story-record-schemas.md:157` (the paragraph beginning *"**Tooling.** Every PG-authoring OR PG-verifying skill ..."*). Narrow the mandate so it covers only PG-authoring skills (`branching-story-bootstrap` Phase 7, `branching-story-turn-cycle` Phase 9) and carves out `branching-story-prose-attach` Phase 2. Replace the opening clause from:

> *"**Tooling.** Every PG-authoring OR PG-verifying skill (PG-authoring: `branching-story-bootstrap` Phase 7 hash steps, `branching-story-turn-cycle` Phase 9; PG-verifying: `branching-story-prose-attach` Phase 2 `computed_state_hash` recomputation against the committed `PG.state_hash` for `hash_integrity` check) MUST compute these hashes through the canonical CLI at `tools/world-mcp/dist/src/cli/compute-pg-hashes.js`, not through ad-hoc one-off scripts. The PG-verifying case requires the same canonical-JSON serializer as the PG-authoring case — hand-rolling the serializer at verification time produces drift between committed and recomputed hashes that the receipt would misclassify as `hash_integrity: FAIL` when no actual drift exists."*

to:

> *"**Tooling.** PG-authoring skills (`branching-story-bootstrap` Phase 7 hash steps, `branching-story-turn-cycle` Phase 9) MUST compute these hashes through the canonical CLI at `tools/world-mcp/dist/src/cli/compute-pg-hashes.js`, not through ad-hoc one-off scripts. The CLI's plan-file→state-hash coupling (it reads `--plan` bytes, computes `plan_hash`, overwrites `plan.plan_hash` in the PG payload, then computes `state_hash` from the coupled payload) is the correct authoring-time behavior — both hashes are stamped together at commit. `branching-story-prose-attach` Phase 2 is carved out from this mandate per SPEC-72 §2.2: it recomputes `state_hash` via `computePgStateHash` from `@worldloom/world-index/hash/content` directly on the PG record's parsed contents (the `snapshot_replay_equality` basis), NOT through the CLI, because the CLI's plan-file coupling would re-introduce the over-enforcement SPEC-72 removes (a plan-file edit would change the CLI's computed `state_hash` even when the committed PG record's state is unchanged). The validator package's `snapshot_replay_equality` at `tools/validators/src/structural/snapshot-replay-equality.ts` already uses `computePgStateHash` on the parsed PG record (line 296); prose-attach Phase 2's recomputation uses the same helper from the same module."*

Preserve the rest of the §4.2a section (lines 158-165, the example invocation block and the hand-rolling discouragement) verbatim — the carve-out applies to prose-attach Phase 2 only; authoring-time CLI usage is unchanged.

## Files to Touch

- `.claude/skills/_shared-templates/story-record-schemas.md` (modify) — §4.6 line 919 `hash_integrity` paragraph + §4.2a line 157 Tooling paragraph.

## Out of Scope

- `prose-receipt.schema.json` and `story-page.schema.json` — SPEC-72 §2.3 explicitly leaves these unchanged. The `hash_integrity` enum on the receipt schema is already `PASS/WARN/FAIL`; the `plan_hash` requirement on the page schema is already `^[0-9a-f]{64}$`. Both align with the new contract prose.
- `tools/world-mcp/src/cli/compute-pg-hashes.ts` — the CLI source is unchanged. SPEC-72 §3 Out of scope preserves CLI behavior; PG-authoring skills continue using it with the plan-file→state-hash coupling intact.
- `tools/validators/src/structural/snapshot-replay-equality.ts` — the validator is unchanged. Its existing `computePgStateHash(parsed)` call at line 296 is the canonical pattern that prose-attach Phase 2 will adopt (landed in SPEC72PLAHASADV-003).
- Operational SKILL.md updates in `branching-story-prose-attach` — those land in SPEC72PLAHASADV-003.
- Hook 6 changes — landed in `archive/tickets/SPEC72PLAHASADV-001.md`.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "accept_plan_drift" .claude/skills/_shared-templates/story-record-schemas.md` returns zero matches inside the §4.6 prose-receipt section (lines 873-933).
2. `grep -n "PG-verifying" .claude/skills/_shared-templates/story-record-schemas.md` returns zero matches inside the §4.2a section (lines 141-165) — the prose-attach mandate is gone.
3. `grep -n "computePgStateHash" .claude/skills/_shared-templates/story-record-schemas.md` returns ≥1 match inside §4.2a confirming the new prose-attach carve-out cites the import path.
4. `npm test --prefix tools/validators` passes — the `prose_receipt_schema_compliance` validator continues to validate receipts against the unchanged `prose-receipt.schema.json`.

### Invariants

1. The contract is the canonical reference for `hash_integrity` semantics. After this ticket, any sibling skill that derives a `hash_integrity` verdict (currently: only `branching-story-prose-attach` Phase 2) must follow the §4.6 split-signal description.
2. The §4.2a Tooling paragraph names exactly which skills use the `compute-pg-hashes` CLI; any future PG-verifying surface that wants to skip the CLI must add itself to the carve-out list, not silently break the mandate.
3. The §4.6 wording reflects what `prose-receipt.schema.json` already permits (the `hash_integrity` enum is already `PASS/WARN/FAIL`); no schema migration is needed and no compatibility shim is introduced.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is grep-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n "accept_plan_drift\|PG-verifying\|computePgStateHash" .claude/skills/_shared-templates/story-record-schemas.md` — targeted grep confirming the three terminology shifts landed (zero `accept_plan_drift` and zero `PG-verifying` inside the affected sections; ≥1 `computePgStateHash` reference inside §4.2a).
2. `npm test --prefix tools/validators` — full validator-suite verification confirming `prose_receipt_schema_compliance` still passes against unchanged schemas.
3. `awk '/^### 4.6/,/^### 4\.7|^---$/' .claude/skills/_shared-templates/story-record-schemas.md | grep -n "hash_integrity"` — confirms the §4.6 `hash_integrity` description is the only remaining mention inside §4.6 (no orphan `accept_plan_drift` references).
