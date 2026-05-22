# VALENH-031: `thread_introduction_grounding_integrity` allow-list is stale — rejects the SPEC-42/SPEC-47 `derived_from` classes the contract and schema explicitly admit

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/validators` (`thread-introduction-grounding-integrity.ts` allow-list + its test).
**Deps**: SPEC-42 (CLK/STSEC/STQ), SPEC-47 (STPLAN/STEMO) — both already shipped; this closes a validator gap they left behind.

## Problem

`thread_introduction_grounding_integrity` rejects `THR.derived_from` entries whose class is `CLK`, `STSEC`, `STQ`, `STSTAT`, `STPLAN`, or `STEMO`, even though the turn-cycle contract, the record schema, and basic story logic all say a thread can be caused by exactly those records. A `branching-story-turn-cycle` run on 2026-05-22 grounded a newly-superseding encounter thread `THR-4` in the open dramatic question `STQ-1` (the most semantically apt parent — the thread *is* the live form of that question), and the validator rejected it with `thread_intro_grounding_missing`. The turn was forced to substitute a proxy grounding (`SE-2` + beliefs), degrading provenance fidelity.

The allow-list predates SPEC-42 and SPEC-47 and was never widened when those classes became first-class causal story state.

Concretely:

- The validator hardcodes `ALLOWED_GROUNDING_PREFIXES = {"SE","SF","BEL","OBL","CNSQ","STINT","SREL","DA"}` (`tools/validators/src/structural/thread-introduction-grounding-integrity.ts:7`) and fails any `derived_from` entry whose prefix is not in that set (`:82`, `isAllowedGroundingId` `:131-134`).
- The turn-cycle SKILL is explicit and contradicts that list: "When this tick's state change *causes* a new or superseding `THR` / `SREL` / `CNSQ` / `SF` / story-`DA`, ground its `derived_from` in the active record that caused it — the canonical record-id set on these classes admits `CLK` / `STSEC` / `STQ` / `STSTAT` / `STPLAN` / `STEMO`, so a thread that escalates because a clock ticked derives from that `CLK` …" (`.claude/skills/branching-story-turn-cycle/SKILL.md:159`).
- The `THR` schema's `derived_from` already permits all of these (and more): `^(STENT|STSTAT|STINT|SF|BEL|SE|OBL|CNSQ|THR|CLK|STSEC|STQ|SREL|STLOC|STOBJ|DA|BR|PG|CHC|SLT|STPLAN|STEMO|CF|CH|M|INV|SEC)-[0-9]+$` (`tools/validators/src/schemas/story-thread.schema.json`). The validator is *stricter than its own schema* on a semantic axis the schema intends to allow.

Net effect: a thread that legitimately escalates because a clock fired, a secret surfaced, a question opened, a status changed, or a plan/emotion drove it cannot cite that direct cause; authors must launder the grounding through a proxy (`SE`/`BEL`), losing the causal link the contract asks for ("Reach for the direct cause rather than a legacy proxy" — SKILL `:159`).

## Assumption Reassessment (2026-05-22)

1. **Validator current behavior** — confirmed `ALLOWED_GROUNDING_PREFIXES` at `tools/validators/src/structural/thread-introduction-grounding-integrity.ts:7` = `{SE,SF,BEL,OBL,CNSQ,STINT,SREL,DA}`; enforced at `:82` via `isAllowedGroundingId` (`:131`). Bootstrap-created threads (`created_at_page === "PG-1"`) are exempt (`:53`), which is why `THR-3.derived_from=[BEL-1, STQ-1]` was accepted at bootstrap while `THR-4.derived_from=[…STQ-1]` was rejected at turn-cycle — an internal inconsistency, not a deliberate genesis-only allowance of STQ.
2. **Contract source of truth** — `.claude/skills/branching-story-turn-cycle/SKILL.md:159` explicitly admits `CLK/STSEC/STQ/STSTAT/STPLAN/STEMO` for `THR/SREL/CNSQ/SF/DA` `derived_from`. `story-record-schemas.md` §4.5.6 documents `THR.derived_from` with no narrower class restriction; §4.5.17/§4.5.18 (STPLAN/STEMO) and §4.5.14-16 (CLK/STSEC/STQ) are the SPEC-42/47 classes the list omits.
3. **Shared boundary under audit** — the semantic class allow-list for thread causal grounding. Three surfaces currently disagree: schema (broad union, syntactic), turn-cycle SKILL (legacy set + SPEC-42/47 set, the intended semantic set), and this validator (legacy set only). This ticket aligns the validator to the SKILL-documented semantic set.
4. **FOUNDATIONS-aligned enforcement surface** — this is a structural validator. Restated principle under audit: introduction grounding exists to prove a mid-story `THR` has a *real present-causal parent in active branch state* (not authorial plot insertion). Widening the allow-list to the SPEC-42/47 causal classes strengthens, not weakens, that principle — those classes *are* present-causal branch state. It does not touch the Mystery Reserve firewall or resolve any `M-` entry.
5. **Adjacent contradictions (classified)** —
   - (separate, future cleanup) `relationship_introduction_grounding_integrity` imposes **no** class allow-list on `SREL.derived_from` (it checks participants-active + non-empty + duplicate-axis only, `tools/validators/src/structural/relationship-introduction-grounding-integrity.ts:74-90`); `CNSQ`/`SF`/`DA` have **no** introduction-grounding validator at all. So `THR` is the only one of the five SKILL-named classes with a semantic grounding allow-list, and it is the stale one. Whether to add symmetric grounding checks to SREL/CNSQ/SF/DA is a **separate consistency ticket**, not in scope here.
   - (decision required, in scope) `STENT` is in the schema pattern but NOT in the SKILL-documented admit set, and the existing test pins `STENT` as a *disallowed* thread grounding (`…test.ts:50-59`). Recommended resolution: **keep `STENT` disallowed** — a thread derives from a causal event/state, not from a bare entity; an entity's entrance is captured via the `SE` or a same-event `STSTAT`. This preserves the existing negative test. The implementer must confirm this line rather than reflexively widening to the full schema union.
6. **Mismatch + correction** — the validator allow-list is the defect. Correction: add `STQ`, `CLK`, `STSEC`, `STSTAT`, `STPLAN`, `STEMO` to `ALLOWED_GROUNDING_PREFIXES`. Do **not** widen to the full schema pattern (that would admit `THR/PG/CHC/SLT/BR/CF/CH/M/INV/SEC`, which are not present-causal parents and would weaken the check).

## Architecture Check

1. **Align the validator's semantic allow-list to the documented contract, not to the syntactic schema.** The schema is intentionally permissive (syntactic id shape); the validator is the semantic gate. The correct semantic set is the SKILL-documented one: legacy `{SE,SF,BEL,OBL,CNSQ,STINT,SREL,DA}` ∪ SPEC-42/47 `{CLK,STSEC,STQ,STSTAT,STPLAN,STEMO}`. This is cleaner than (a) deleting the allow-list (would lose the "no plot-insertion" guarantee) or (b) widening to the schema union (would admit non-causal classes).
2. **No backwards-compatibility shims.** A single constant set is widened; no dual code paths, no alias prefixes. Existing committed bundles are unaffected because widening an allow-list can only newly-*accept*, never newly-*reject* — there is zero regression risk to already-applied story state.

## Verification Layers

1. Validator allow-list equals the SKILL-documented causal set -> codebase grep-proof (`thread-introduction-grounding-integrity.ts:7` vs `branching-story-turn-cycle/SKILL.md:159`).
2. `THR.derived_from` grounded in each of `STQ`/`CLK`/`STSEC`/`STSTAT`/`STPLAN`/`STEMO` (active or same-event-created) is accepted -> validator unit test (new cases).
3. `THR.derived_from` grounded in `STENT` is still rejected, and an inactive grounding id is still rejected -> existing negative tests retained.
4. `THR` schema already permits these prefixes; no schema change required -> schema grep-proof (`story-thread.schema.json` `derived_from.items.pattern`).
5. Contract alignment -> FOUNDATIONS/contract alignment check (`SKILL.md:159`; `story-record-schemas.md` §4.5.6 / §4.5.14-18).

## What to Change

### 1. Widen the allow-list

`tools/validators/src/structural/thread-introduction-grounding-integrity.ts:7`:

```ts
const ALLOWED_GROUNDING_PREFIXES = new Set([
  "SE", "SF", "BEL", "OBL", "CNSQ", "STINT", "SREL", "DA",
  "STQ", "CLK", "STSEC", "STSTAT", "STPLAN", "STEMO"
]);
```

(`STENT` deliberately excluded per Assumption Reassessment item 5; confirm before merging.)

### 2. Strengthen the test (existing coverage is insufficient — this gap is *why* the defect shipped)

`tools/validators/tests/structural/thread-introduction-grounding-integrity.test.ts` currently covers only `[SE, BEL, DA]` acceptance and `[STENT]` rejection. Add positive cases proving each SPEC-42/47 class is accepted as `THR.derived_from` (active and same-event-created), and keep the `STENT` negative case.

## Files to Touch

- `tools/validators/src/structural/thread-introduction-grounding-integrity.ts` (modify)
- `tools/validators/tests/structural/thread-introduction-grounding-integrity.test.ts` (modify — add SPEC-42/47 acceptance cases)

## Out of Scope

- Adding symmetric grounding-class allow-lists to `SREL`/`CNSQ`/`SF`/`DA` introduction validators (Assumption Reassessment item 5; separate consistency ticket if desired).
- The `created_at_page === "PG-1"` bootstrap exemption (left as-is; widening the allow-list already removes the bootstrap-vs-turn-cycle inconsistency for the common classes).
- Any change to `story-thread.schema.json` (already permissive).
- Re-grounding the already-committed `red-bunny` `THR-4` (its `[SE-2, BEL-6, BEL-7]` grounding is valid; re-editing would require another patch cycle for no correctness gain — leave it; future threads may cite `STQ`/`CLK`/etc. once this lands).

## Acceptance Criteria

### Tests That Must Pass

1. A mid-story (non-PG-1) introduced `THR` whose `derived_from` is `[STQ-N]` (active or same-event-created) produces **no** `thread_intro_grounding_missing` verdict.
2. The same for each of `CLK-N`, `STSEC-N`, `STSTAT-N`, `STPLAN-N`, `STEMO-N`.
3. A `THR` grounded in `STENT-N` still produces `thread_intro_grounding_missing` (entity is not a causal-state parent); a `THR` grounded in an inactive/uncreated id still fails; a `THR` with empty `derived_from` still fails `thread_intro_missing_derived_from`.
4. Full validator suite: `npm test` in `tools/validators` passes (incl. `registry.test.ts` and `integration/validate-patch-plan.test.ts`).

### Invariants

1. The validator's accepted thread-grounding classes equal the turn-cycle SKILL-documented set; the validator never accepts a class the SKILL excludes (e.g., `PG`/`CHC`/`SLT`/`BR`/`CF`).
2. Widening introduces no path by which a previously-accepted plan is newly rejected (allow-list growth is monotonic-accept).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/thread-introduction-grounding-integrity.test.ts` — add one acceptance test per SPEC-42/47 class (`STQ`/`CLK`/`STSEC`/`STSTAT`/`STPLAN`/`STEMO`) as `THR.derived_from`, and retain the `STENT` rejection and inactive-grounding rejection. Rationale: the absence of any SPEC-42/47 acceptance case is the exact coverage hole that let the stale list ship.

### Commands

1. Targeted: `npm test --prefix tools/validators -- thread-introduction-grounding` (or the repo's test-filter equivalent) — must show the new acceptance cases green.
2. Full-pipeline: `npm test --prefix tools/validators` then a `branching-story-turn-cycle` dry-run whose tick supersedes a `THR` grounded in an active `STQ`/`CLK` — `validate-patch-plan` returns `pass` with the `STQ`/`CLK` grounding intact (no proxy substitution needed).
