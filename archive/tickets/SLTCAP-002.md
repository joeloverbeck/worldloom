# SLTCAP-002: Stop commitment-block-authoring from omitting `created_at_page`

**Status**: DONE
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/commitment-block-authoring/` references (`phase-6-envelope-skeleton.md`, `phase-3-4-validation.md`); no tool/validator code.
**Deps**: Logically pairs with SLTCAP-001 (which makes the omission a hard validate-time failure). This ticket fixes the authoring guidance that *produced* the omission so authors emit the field before the engine is reached.

## Problem

`red-bunny` batch `SLB-3` (`SLT-20`…`SLT-25`) was committed without a `created_at_page` field, while `SLB-1`/`SLB-2` (`SLT-8`…`SLT-19`) carry `created_at_page: null`. The divergence traces to contradictory guidance inside the same skill:

- `.claude/skills/commitment-block-authoring/references/phase-2-draft-blocks.md:12` shows the correct block shape with `created_at_page: null` and a comment that it is nullable for `direct_batch`/`audit_repair`.
- `.claude/skills/commitment-block-authoring/references/phase-6-envelope-skeleton.md:65` states: *"This skill never emits `runtime_jit`, so `created_at_page` MAY be omitted/null."* The "MAY be omitted" clause directly licensed dropping the field from the `SLB-3` envelope.

The field is load-bearing for `recursive_reference_closure` branch-leak detection (see SLTCAP-001), so omission silently makes the block unselectable whenever it is reached through the page reference chain. The authoring guidance must require the field, set to `null` for this skill's batch/repair origins.

## Assumption Reassessment (2026-05-29)

1. `phase-6-envelope-skeleton.md:65` currently reads "so `created_at_page` MAY be omitted/null." Confirmed by grep. `phase-2-draft-blocks.md:12` already prescribes `created_at_page: null`. The two references contradict each other; the envelope-skeleton wording is the operative one at envelope-assembly time and is the regression source.
2. Against specs/docs: FOUNDATIONS §Story Bundles §5a/§5b governs storylets as causal moves whose fields must be load-bearing. No spec authorizes omitting a load-bearing field; the "MAY be omitted" wording is skill-local drift, not a contract allowance.
3. Cross-skill boundary under audit: the `create_slt_record` envelope shape shared between `commitment-block-authoring` (this skill), `branching-story-bootstrap` (`phase-6-commitment-blocks.md:13`, already correct with `created_at_page: null`), and `branching-story-turn-cycle` (JIT blocks set `created_at_page: <PG-id>`). Only this skill's guidance permits omission; the fix is confined here.
4. FOUNDATIONS principle restated: Rule 5 (No Consequence Evasion). A commitment block that lands unselectable is silent consequence-capacity loss; `phase-2-draft-blocks.md` already invokes this rationale for permanently-inert affect-keyed blocks, so the same rule governs the `created_at_page` omission.
5. HARD-GATE / write-ordering surfaces: this ticket touches skill *guidance* (markdown references), not HARD-GATE sequencing, canon-write ordering, or the Mystery Reserve firewall. No firewall weakening.
6. Adjacent contradiction classification: the internal phase-2-vs-phase-6 contradiction is a required consequence to resolve in this ticket (both must say the field is mandatory). No separate bug spun off.

## Architecture Check

1. Cleaner than relying solely on SLTCAP-001's schema gate: fixing the guidance prevents the malformed envelope from being assembled at all, so the author sees a correct template rather than discovering the gap only at dry-run. Schema-required (SLTCAP-001) and authoring-prescribed (this ticket) are defense-in-depth at two distinct boundaries, not redundant.
2. No backwards-compatibility aliasing/shims introduced; this is a guidance correction plus a skill-side validation gate, with no tolerant fallback path.

## Verification Layers

1. Invariant: the skill's envelope guidance mandates `created_at_page` → codebase grep-proof (`phase-6-envelope-skeleton.md` no longer contains "MAY be omitted"; states the field is required and `null` for `author_batch`/`audit_repair`).
2. Invariant: the skill's Phase 3-4 validation refuses a drafted block missing `created_at_page` → manual review of the added validation gate in `phase-3-4-validation.md` plus skill dry-run producing a batch where every block carries `created_at_page: null`.
3. Invariant: phase-2 and phase-6 references agree → codebase grep-proof that both prescribe the field as mandatory.

## What to Change

### 1. Correct the envelope-skeleton guidance

In `.claude/skills/commitment-block-authoring/references/phase-6-envelope-skeleton.md` (line 65 bullet), replace the "`created_at_page` MAY be omitted/null" wording with a requirement: `created_at_page` MUST be present on every block; this skill emits only `author_batch` / `audit_repair` origins, so it is always set to `null` (a `PG-<n>` value occurs only for `runtime_jit`, which this skill never produces). Add the field to the worked `payload.record` example if absent.

### 2. Add a skill-side validation gate

In `.claude/skills/commitment-block-authoring/references/phase-3-4-validation.md`, add a gate (with PASS-rationale discipline) asserting every drafted block carries `created_at_page` set to `null`, so the omission is caught in the skill's own validation phase before envelope assembly — not only at the engine dry-run.

### 3. Confirm phase-2 consistency

Verify `phase-2-draft-blocks.md:12` continues to show `created_at_page: null` and that its comment matches the mandatory framing; tighten the comment from "nullable" to "always `null` for this skill's origins" if needed.

## Files to Touch

- `.claude/skills/commitment-block-authoring/references/phase-6-envelope-skeleton.md` (modify)
- `.claude/skills/commitment-block-authoring/references/phase-3-4-validation.md` (modify)
- `.claude/skills/commitment-block-authoring/references/phase-2-draft-blocks.md` (modify, comment-only if needed)

## Out of Scope

- The schema-required enforcement (SLTCAP-001).
- Backfilling existing `SLT-20`…`SLT-25` (SLTCAP-003).
- `branching-story-bootstrap` guidance (already correct).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "MAY be omitted" .claude/skills/commitment-block-authoring/references/phase-6-envelope-skeleton.md` returns no matches.
2. A `commitment-block-authoring` dry-run (direct_batch) produces an envelope in which every `create_slt_record` payload sets `created_at_page: null`, and that envelope passes `node tools/world-mcp/dist/src/cli/validate-patch-plan.js <plan>` (including SLTCAP-001's required-field check).
3. The Phase 3-4 validation reference contains an explicit `created_at_page`-presence gate.

### Invariants

1. Every block authored by `commitment-block-authoring` carries `created_at_page: null`.
2. The skill's phase-2, phase-3-4, and phase-6 references agree that `created_at_page` is mandatory.

## Test Plan

### New/Modified Tests

1. `None — skill-guidance ticket; verification is grep-proof plus a `commitment-block-authoring` dry-run whose produced envelope is checked against the SLTCAP-001 schema gate. No automated test file changes.`

### Commands

1. `grep -rn "created_at_page" .claude/skills/commitment-block-authoring/references/` (confirm mandatory framing across phase-2/3-4/6).
2. Dry-run the skill on a representative coverage gap, persist its envelope, and run `node tools/world-mcp/dist/src/cli/validate-patch-plan.js <plan>` to confirm every block carries the field and validation passes.
