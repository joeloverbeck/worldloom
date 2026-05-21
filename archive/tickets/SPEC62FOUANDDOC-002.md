# SPEC62FOUANDDOC-002: FOUNDATIONS — document `passive_depth` + relax forbidden-mystery absolutism

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `docs/FOUNDATIONS.md` §Mystery Reserve resolution-safety note; no code, schema, or validator change.
**Deps**: None

## Problem

At intake, FOUNDATIONS line 95's resolution-safety note documented only `active` / `passive` / `forbidden`, while `MYSTERY_STATUS_ENUM` and `mystery-reserve.schema.json` both defined **four** statuses including `passive_depth`, and `create-base-world/SKILL.md:171` referenced all four — a documentation drift. Separately, FOUNDATIONS Rule 7 mandated *deliberate, bounded unknowns* but did NOT require a permanently-unresolvable (`forbidden`) mystery in every world; discovery-driven worlds were crippled by treating a forbidden mystery as an absolute law. This ticket updated the §Mystery Reserve note to close both drift points.

## Assumption Reassessment (2026-05-21)

1. Verified against current code: `MYSTERY_STATUS_ENUM = ["active", "passive", "passive_depth", "forbidden"]` at `tools/world-index/src/public/canonical-vocabularies.ts:43`; `mysteryResolutionSafetyForStatus(status)` (same file, ~line 211) returns `["none"]` only for `forbidden` and `["low","medium","high"]` for every other status (so `passive_depth` takes `low|medium|high`, exactly what §2.3 now documents); `mystery-reserve.schema.json` enum includes `passive_depth`. The validator already enforced the coupling — this ticket was documentation catch-up.
2. SPEC-62 §2.3 (lines 65–75) + §2.4 first bullet (lines 86–89) were the source deliverables; the edit target was the resolution-safety note at `docs/FOUNDATIONS.md:95`. At intake, that note listed only `active`/`passive`/`forbidden`; it now includes `passive_depth` on the non-forbidden arm and the separate strong-default sentence. Triage verdicts A3 (Fault, drift) + A4 (Fault 4, narrowed) route both here; the report's `resolution_intent` enum + `mystery_policy_validator` are dropped (YAGNI, no consumer).
3. Single-artifact ticket (`docs/FOUNDATIONS.md`); the shared boundary under audit is the validator-enforced `status`↔`future_resolution_safety` coupling — this doc edit must stay consistent with `mysteryResolutionSafetyForStatus`, not redefine it.
4. FOUNDATIONS principle restated: Rule 7 (Preserve Mystery Deliberately) — "Unknowns must be chosen, bounded, and tracked." The relaxation keeps unknowns deliberate and bounded (at least one bounded unknown is still expected) while removing the absolute that exceeds Rule 7's text. The existing line-95 note's `forbidden ⇒ none` coupling is preserved verbatim; `passive_depth` is added to the `active`/`passive` arm.
5. Canon Safety surface named: the `rule7_mystery_reserve_preservation` validator (cited at line 95) and the `forbidden ⇒ future_resolution_safety: none` coupling are the enforcement surfaces. This ticket changes only FOUNDATIONS prose — it does NOT touch the validator, the coupling, or any Mystery Reserve firewall; the relaxation adds a "strong default, not universal law" framing that the validator does not enforce (the validator only enforces the safety-coupling, never forbidden-presence). Confirmed: no firewall weakening — `forbidden` mysteries still take `none`, and nothing here lets canon resolve a forbidden `M`.

## Architecture Check

1. Documenting `passive_depth` at the contract closes a drift the validator already enforces — the doc becomes truthful to code without changing behavior. Relaxing the forbidden-absolutism sentence in the contract (rather than only in the skill) keeps the authority where Rule 7 lives, so the skill change (003) has an authoritative basis.
2. No backwards-compatibility aliasing/shims — the line-95 note is edited in place; the `forbidden ⇒ none` coupling sentence is retained unchanged.

## Verification Layers

1. `passive_depth` appears in the resolution-safety note taking `low|medium|high` → codebase grep-proof (`grep -n "passive_depth" docs/FOUNDATIONS.md`).
2. The forbidden-relaxation sentence ("strong default, not a universal law"; record the policy explicitly when a central mystery is intended for eventual revelation) is present in §Mystery Reserve → codebase grep-proof.
3. The `forbidden ⇒ future_resolution_safety: none` coupling and the `rule7_mystery_reserve_preservation` validator citation are unchanged → manual review against the pre-edit line 95.
4. The documented coupling matches `mysteryResolutionSafetyForStatus` → FOUNDATIONS alignment check (doc `passive_depth → low|medium|high` equals the function's non-forbidden return).

## Landed Changes

### 1. Added `passive_depth` to the resolution-safety note (§2.3)

In the §Mystery Reserve resolution-safety note, the `active`/`passive` arm now includes `passive_depth`: like `active`/`passive` it takes `future_resolution_safety: low | medium | high` (per `mysteryResolutionSafetyForStatus`). The `forbidden ⇒ none` coupling and the validator citation remain unchanged.

### 2. Added the forbidden-relaxation sentence (§2.4 FOUNDATIONS bullet)

§Mystery Reserve now states that a forbidden mystery is a **strong default**, not a universal law; a world should preserve at least one bounded unknown, but when a central mystery is intended for eventual revelation, the world records the policy explicitly rather than forcing a permanent lock.

## Files to Touch

- `docs/FOUNDATIONS.md` (modify)

## Out of Scope

- The `resolution_intent` 7-value enum + `mystery_policy_validator` — dropped (YAGNI; no current consumer).
- The skill/template change implementing the relaxation (`propose-new-worlds-from-preferences`) — that is `archive/tickets/SPEC62FOUANDDOC-003.md`, which depends on this ticket.
- `create-base-world` — unchanged; its symmetric "at least one of each" genesis seeding is not the reported defect.
- Any validator, schema, or `canonical-vocabularies.ts` change (the coupling is already enforced).
- The two new FOUNDATIONS sections (SPEC62FOUANDDOC-001).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "passive_depth" docs/FOUNDATIONS.md` returns a match inside the §Mystery Reserve resolution-safety note, on the `low | medium | high` arm.
2. `grep -n "strong default" docs/FOUNDATIONS.md` returns the forbidden-relaxation sentence in §Mystery Reserve.
3. `grep -n "forbidden.*future_resolution_safety: none\|status: forbidden" docs/FOUNDATIONS.md` confirms the forbidden→none coupling sentence is retained unchanged.

### Invariants

1. The documented `status`↔`future_resolution_safety` coupling stays byte-consistent with `mysteryResolutionSafetyForStatus` (`forbidden ⇒ none`; all others ⇒ `low|medium|high`).
2. Rule 7's enforcement (the `rule7_mystery_reserve_preservation` validator, the Mystery Reserve firewall) is untouched — no forbidden mystery becomes resolvable as a result of this edit.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n "passive_depth\|strong default" docs/FOUNDATIONS.md`
2. `grep -n "mysteryResolutionSafetyForStatus" tools/world-index/src/public/canonical-vocabularies.ts` — cross-check the documented coupling against the live function.
3. Narrower-command rationale: a single-note doc edit whose only correctness contract is consistency with an existing validator-enforced coupling; grep-proof of the doc plus a read of the coupling function is the correct verification boundary.

## Outcome

Completed: 2026-05-21.

`docs/FOUNDATIONS.md` now documents `status: passive_depth` as taking `future_resolution_safety: low | medium | high`, matching the live `mysteryResolutionSafetyForStatus` function. It also states that forbidden mysteries are a strong default rather than a universal law while preserving the rule that `status: forbidden` takes `future_resolution_safety: none`.

No validator, schema, skill, or world-data change was made.

## Verification Result

1. `grep -n "passive_depth\|strong default" docs/FOUNDATIONS.md` — PASS; returned the updated resolution-safety note and the new strong-default sentence in §Mystery Reserve.
2. `grep -n "forbidden.*future_resolution_safety: none\|status: forbidden" docs/FOUNDATIONS.md` — PASS; confirmed the forbidden-to-`none` coupling sentence remains present.
3. `grep -n "mysteryResolutionSafetyForStatus" tools/world-index/src/public/canonical-vocabularies.ts` — PASS; confirmed the live function remains the coupling authority checked by this docs-only ticket.

## Deviations

None. The ticket landed as a docs-only FOUNDATIONS update; `resolution_intent`, `mystery_policy_validator`, skill/template edits, schemas, validators, and world data remained out of scope.
