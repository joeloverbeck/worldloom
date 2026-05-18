# SPEC42STOSTADEB-013: branching-story-prose-attach verification for clock-tick + secret-reveal prose

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — extends `branching-story-prose-attach` SKILL.md Phase 4 (prose-vs-state checks) to verify that rendered prose mentions clock-tick events present in the page's SE state-delta AND discloses revealed secrets when STSEC.status flips to `revealed`; surfaces findings as prose-receipt observations (not engine HARD-REJECTs); no new prose-attach phases introduced
**Deps**: archive/tickets/SPEC42STOSTADEB-001.md, archive/tickets/SPEC42STOSTADEB-002.md, archive/tickets/SPEC42STOSTADEB-003.md, SPEC42STOSTADEB-009

## Problem

Once turn-cycle integration (SPEC42STOSTADEB-009) lands clock-tick and secret-reveal mechanisms during page commits, the rendered prose at `pages-prose/PG-<integer>.md` must reflect those state transitions for the bundle to remain coherent — a CLK that ticks but isn't mentioned in prose leaves readers without the dramatic-pressure cue; a STSEC that flips to `revealed` but the prose doesn't disclose creates state/prose divergence. The existing prose-attach Phase 4 (prose-vs-state checks per SPEC-42 brainstorm agent reports) handles BEL / SF / DA divergence but doesn't yet cover the new classes. This ticket extends Phase 4 with two new prose verification checks.

## Assumption Reassessment (2026-05-17)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. Codebase verified at Step 2 codebase validation (2026-05-17): `.claude/skills/branching-story-prose-attach/SKILL.md` exists; existing Phase 4 prose-vs-state checks handle BEL/SF/DA divergence (verified in SPEC-42 brainstorm agent reports). The skill's existing prose-receipt shape at `pages-prose-receipts/PG-<integer>.yaml` is the persistent surface for these checks' observations; new checks add new fields to this receipt without breaking existing shape.
2. Spec verified at `specs/SPEC-42-story-state-debt-secret-clock-records.md` §E Phase 4: "`branching-story-prose-attach` rendered-prose verification (when SE has clock-tick effect, prose mentions tick; when secret status flips to `revealed`, prose discloses)" — this ticket implements both checks as Phase 4 extensions.
3. Cross-skill / cross-tool shared boundary: `branching-story-prose-attach` is a Skill Category 2c skill. It depends on turn-cycle integration (-009) being complete — the SE.state_delta entries it inspects are produced by turn-cycle Phase 4. Prose-attach does NOT mutate state; it produces receipt observations only (per FOUNDATIONS §Story Bundles §4a Plan-Authority Boundary — rendered prose is a renderable receipt artifact, not a second state engine).
4. FOUNDATIONS §Story Bundles §4a (Plan-Authority Boundary) motivates this ticket directly: *"Story state is authoritative at page-plan commit. Rendered prose is a rendering of that state, not a second state engine. ... Prose deviating from plan is routed by `branching-story-prose-attach` as either a prose-quality issue (revise prose), a structural-fact issue (run a repair turn), or a canon-candidate (run promotion)."* The two new prose verification checks (clock-tick verification + secret-reveal verification) operate within this discipline: they SURFACE prose-vs-state divergence as receipt observations the user can act on (revise prose / run repair turn / route to promotion); they NEVER HARD-REJECT a page commit. This preserves the canonical posture that rendered prose is a receipt, not a second state engine — even when the new classes introduce new categories of prose/state divergence. The heuristic-keyword-match approach for v1 is consistent with §4a's discipline: divergence is observed and surfaced, not engine-gated.

## Architecture Check

1. **Prose-receipt observations, not engine HARD-REJECTs**: this distinction preserves §4a Plan-Authority Boundary — rendered prose deviating from plan is routed by prose-attach as a prose-quality issue (revise prose), a structural-fact issue (run a repair turn), or a canon-candidate (run promotion); it does NOT HARD-REJECT the page commit. The two new checks follow this existing pattern.
2. **Two new checks share the same Phase 4 surface**: both clock-tick verification and secret-reveal verification are prose-vs-SE-state-delta diffs. Bundling them keeps the Phase 4 extension reviewable as a unit.
3. **No new prose-attach phases**: extends Phase 4 only; preserves the existing 6-deterministic-check structure.

## Verification Layers

1. Prose-attach flags rendered prose that omits a clock-tick event present in the page's SE state-delta → prose-receipt observation test (fixture: page with `tick_pressure_clock` in SE.state_delta but no mention in prose)
2. Prose-attach flags rendered prose that doesn't disclose a STSEC.status flip to `revealed` present in the page's SE state-delta → prose-receipt observation test
3. Prose-attach does NOT flag pages without clock-tick or secret-reveal SE entries (no false positives) → prose-receipt observation test
4. Prose-attach receipts include the new check observations in the existing receipt schema without breaking existing fields → schema-compatibility test

## What to Change

### 1. Phase 4 extension — clock-tick prose verification

Modify `.claude/skills/branching-story-prose-attach/SKILL.md` Phase 4. Add a new prose-vs-state check:
- For each `tick_pressure_clock` op in the page's SE.state_delta, verify the rendered prose mentions the tick (heuristic: search prose for the CLK record's `title` keyword and/or the tick's `cause` string; configurable strictness)
- Surface unmentioned ticks as prose-receipt observations with type: clock_tick_undisclosed (or similar; match existing receipt-observation naming convention)
- The check is heuristic — exact-keyword matching is sufficient for v1; semantic-match refinement deferred to future tickets

### 2. Phase 4 extension — secret-reveal prose verification

Add a new prose-vs-state check:
- For each STSEC whose status transitions to `revealed` in this page's SE.state_delta, verify the rendered prose discloses the secret (heuristic: search prose for keywords from the STSEC's `secret_claim` string and/or the carriers' `clue_text`)
- Surface non-disclosing reveals as prose-receipt observations with type: secret_reveal_undisclosed
- Same heuristic-keyword-match-for-v1 caveat

### 3. Prose-receipt schema extension

If the prose-receipt schema (`pages-prose-receipts/PG-<integer>.yaml`) has a structured observation field, extend the observation-type enum to include `clock_tick_undisclosed` and `secret_reveal_undisclosed`. Additive-only extension. If the receipt schema accepts free-form observation entries (no enum), no schema change is needed.

## Files to Touch

- `.claude/skills/branching-story-prose-attach/SKILL.md` (modify — Phase 4 prose-vs-state check additions; receipt-observation-type extension if schema requires)

## Out of Scope

- CLK/STSEC/STQ class foundations — owned by SPEC42STOSTADEB-001 / -002 / -003
- Per-class validators — owned by SPEC42STOSTADEB-005 / -006 / -007
- Shared validator extensions — owned by archive/tickets/SPEC42STOSTADEB-008.md
- Turn-cycle integration producing the SE.state_delta entries this ticket inspects — owned by SPEC42STOSTADEB-009
- Bootstrap optional seeding — owned by SPEC42STOSTADEB-010
- Commitment-block-authoring extension — owned by SPEC42STOSTADEB-011
- Health-audit bundle-wide checks — owned by SPEC42STOSTADEB-012
- STQ-specific prose verification (per SPEC-42 §E Phase 4 names CLK and STSEC; STQ has no equivalent prose-verification requirement in the spec)
- Semantic-match refinement for keyword-based heuristics (deferred to future tickets if the v1 heuristic proves insufficient)

## Acceptance Criteria

### Tests That Must Pass

1. Skill dry-run on a fixture page with `tick_pressure_clock` in SE.state_delta and prose that mentions the tick: prose-attach receipt has NO `clock_tick_undisclosed` observation
2. Skill dry-run on a fixture page with `tick_pressure_clock` in SE.state_delta and prose that omits the tick: prose-attach receipt INCLUDES `clock_tick_undisclosed` observation
3. Skill dry-run on a fixture page with STSEC reveal in SE.state_delta and prose that discloses the secret: prose-attach receipt has NO `secret_reveal_undisclosed` observation
4. Skill dry-run on a fixture page with STSEC reveal in SE.state_delta and prose that does NOT disclose: prose-attach receipt INCLUDES `secret_reveal_undisclosed` observation
5. Skill dry-run on a fixture page with NO clock-tick or secret-reveal SE entries: prose-attach receipt has NEITHER new observation type (no false positives)

### Invariants

1. The two new checks are prose-receipt observations only — they NEVER HARD-REJECT a page commit (per §4a Plan-Authority Boundary)
2. The existing Phase 4 checks (BEL/SF/DA divergence) are unchanged
3. The receipt schema extension is additive-only (existing receipts continue to parse without modification)
4. The heuristic-keyword-match approach is v1; semantic-match refinement is explicit out-of-scope

## Test Plan

### New/Modified Tests

1. Skill-level fixture tests (path depends on existing prose-attach test structure; confirm at edit time) — fixtures covering: clock-tick-mentioned (positive), clock-tick-omitted (negative), secret-revealed-disclosed (positive), secret-revealed-undisclosed (negative), neither-mechanism-present (no-false-positive)

### Commands

1. Skill dry-run (manual or via skill-test harness if available): invoke `branching-story-prose-attach` on each fixture and inspect the resulting prose receipt
2. The full-pipeline verification command lands in SPEC42STOSTADEB-015 capstone
