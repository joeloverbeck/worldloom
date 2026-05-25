# SPEC86CHAFITSEL-001: Add §11a Character-Fit Selection Contract + §12 enumeration update

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — adds a new section §11a to `.claude/skills/_shared-templates/story-state-contract.md` (shared by all story-pipeline skills); updates §12 first paragraph to enumerate §11a; no engine code changes; no schema / MCP / validator / fixture changes.
**Deps**: None

## Problem

The shared story-state contract codifies authority model, schema-minimalism, record schemas, predicate DSL, action routing, hard gates, page-plan structure, branching, write order, and mystery/canon authority — but does not document the discipline by which story-pipeline skills select `SLT` records and emit `CHC` choices through the durable / current-state separation between `STCHAR` and the temporal record classes. The discipline is operationally implicit across existing validators (`stchar-temporal-reference-boundary`, `character-grounding-consistency`, `turn-cycle-output-grounding-integrity.chc_response_topical_grounding_missing`, `slt-grounding-minimal-integrity`) and across skill prose, but has never been stated as a contract section. This creates two recurring drift risks:

1. **Authoring drift in commitment blocks**: without a canonical contract, authors of global author-pool SLTs may reach for `record_active(STCHAR-X)` in `hard.preconditions[]` (legal under the predicate DSL but architecturally wrong at global visibility — STCHAR identity is not portable across branches). The existing `slt-grounding-minimal-integrity` validator does not catch this.
2. **Drift in skill prose**: each story-pipeline skill re-implements its own understanding of STCHAR's role in selection, scattered across `story-character-profile`, `commitment-block-authoring`, `branching-story-turn-cycle`, and `branching-story-bootstrap`. Drift between these is the symptom; the absence of a contract anchor is the cause.

This ticket codifies the discipline as a new §11a Character-Fit Selection Contract section between the existing §11 Mystery and Canon Authority and §12 How Skills Use This Contract. It also updates §12's first paragraph to enumerate §11a in the section reference list. The ticket is documentation-only — no schemas, no validators, no MCP changes; per SPEC-86 §3 Non-goals, every other iter-4 follow-on (SPEC-B/C/D/E/F) is explicitly deferred with named lift-conditions recorded in the companion triage file.

## Assumption Reassessment (2026-05-25)

<!-- Items 1-3 always required; items 4-7 conditional per template menu. -->

1. **Codebase reference**: `.claude/skills/_shared-templates/story-state-contract.md` currently has §11 Mystery and Canon Authority ending at the start of §12. Verified by audit-phase Agent 3 (this session): section list runs §1 Authority Model → §2 Schema-Minimalism Doctrine → §3 Record Class Inventory → §4 Record Schemas → §5 Closed Predicate DSL (with §5a) → §6 Action Routing → §7 Nine Shared Hard Gates → §8 Page Plan Minimum Contract (with §7a, §9b, §9c, §16a) → §9 Branching and Rewind → §10 Shared Write Order → §11 Mystery and Canon Authority → §12 How Skills Use This Contract. No §11a or §13 currently exists.
2. **Spec reference**: SPEC-86 §4.1 (verbatim §11a body) + §4.2 (verbatim §12 first-paragraph replacement). Companion triage file at `docs/triage/2026-05-25-slt-chc-overhaul-fourth-iteration-triage.md` records the SPEC-A → SPEC-86 acceptance plus the SPEC-B/C/D/E deferrals and SPEC-F confirms-existing-position.
3. **Cross-skill boundary**: `.claude/skills/_shared-templates/story-state-contract.md` is the shared contract template referenced by every story-pipeline skill (`story-character-profile`, `branching-story-bootstrap`, `branching-story-turn-cycle`, `commitment-block-authoring`, `branching-story-prose-attach`, `branching-story-health-audit`, `story-fact-promotion-to-canon`, `story-promotion-closeout`). The new §11a is a contract addition with consumer surface = every story-pipeline skill that cites the shared contract. Ticket SPEC86CHAFITSEL-002 follows this one and updates 4 skill anchors to cite the new §11a.
4. **FOUNDATIONS principle**: motivated by FOUNDATIONS §Story Bundles §6.1 (Story-Local Character Authority — STCHAR is the runtime authority; world `CHAR-*` is not consumed at story runtime), Rule 4 at story scope (branch isolation — global-vs-branch-scoped STCHAR predicate discipline prevents global-author-pool SLTs from acquiring branch-local exact-STCHAR dependencies that would silently apply across branches at replay/fork), and §Story Bundles §5b (schema-minimalism — §11a adds zero schema fields; it documents authoring and judgment discipline that the existing validators already partially enforce, without expanding the schema surface). The contract section codifies the implicit discipline as canonical text, satisfying Rule 1 (No Floating Facts) for the discipline itself by giving it scope (story-pipeline skills) / prerequisites (existing validators + record schemas) / limits (judgment territory) / consequences (drift prevention).
5. **Predicate-name correction**: SPEC-86 §4.1's drafted existential predicate list named `any_obligation_active`, but the live closed predicate DSL names the OBL existential predicate `any_obligation_open` in `.claude/skills/_shared-templates/story-state-contract.md` and `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`. This ticket lands the live predicate name in §11a and amends SPEC-86's embedded contract text accordingly; this is a factual correction, not a behavior change.

## Architecture Check

1. **Documentation-only approach preserves the "no schema fields without consumers" discipline** (FOUNDATIONS §Story Bundles §5b). Iter-4 proposed five schema/MCP/validator/fixture changes (SPEC-B/C/D/E) — all deferred per the companion triage file. The contract section captures the architectural understanding without expanding the operational footprint beyond what existing validators already enforce.
2. **No backwards-compatibility aliasing or shims introduced.** §11a is a new section; §12's first paragraph gets an additive enumeration update naming §11a. No existing section is renamed, moved, or deprecated.
3. **Placement at §11a (not §13)** minimizes renumbering pressure on the existing §12 reference text. The §11 cluster pattern (alongside the existing §5a / §7a / §9b / §9c / §16a sub-numbered sections elsewhere in the contract) accommodates the addition cleanly. SPEC-86 §9 open question 2 acknowledges a future restructure could renumber to §13; the §11a positioning is the current commitment.

## Verification Layers

1. **§11a section presence** → codebase grep-proof (`grep -nE "^## 11a\. Character-Fit Selection Contract" .claude/skills/_shared-templates/story-state-contract.md` returns exactly 1 match).
2. **§12 enumeration update** → codebase grep-proof (`grep -nE "and the character-fit selection contract \(§11a\)" .claude/skills/_shared-templates/story-state-contract.md` returns exactly 1 match).
3. **No behavior change in validators** → existing test suites pass unchanged (`cd tools/validators && npm test`); FOUNDATIONS alignment check: §11a names existing hard-discipline validators (`stchar-temporal-reference-boundary`, `character-grounding-consistency`, `turn-cycle-output-grounding-integrity`, `slt-grounding-minimal-integrity`, `chc-slt-selected-commitment-trace`, `rule_choice_set_noncollapse`) as unchanged enforcement anchors. Documentation-only change cannot affect compiled validator behavior; the test command is regression-protection, not edit-content verification.
4. **Single-layer ticket** for edit-content verification — both layers (1) and (2) are codebase grep-proofs of the same shared-template file. Mapping additional surfaces is N/A for a doc-only single-file edit.

## What to Change

### 1. Insert §11a between §11 and §12 in story-state-contract.md

Insert the §11a body verbatim from SPEC-86 §4.1 between the existing §11 Mystery and Canon Authority (ending just before §12 starts) and the existing §12 How Skills Use This Contract header. The new §11a contains:

- **§11a header**: `## 11a. Character-Fit Selection Contract`
- **Preamble paragraph**: anchors the four-layer mediation model on the durable / current-state separation between STCHAR and temporal record classes.
- **Four-layer mediation model** (4 numbered items): stable constraint layer (STCHAR), current-state derivation layer (12 temporal record classes), eligibility / ranking layer (SLT predicates + MCP filter pipeline), rendering / surface layer (page plan §16a + CHC wording).
- **Global-pool vs branch-scoped STCHAR predicate discipline**: discipline contract (not schema) — `record_active(STCHAR-<integer>)` is lawful in `hard.preconditions[]` only for `branch_scoped` / `branch_prefix_scoped` SLTs; global-author-pool SLTs use existential / role-keyed / driver-record predicates.
- **What belongs in STCHAR / What belongs in current-state records**: two short inventories.
- **CHC quality discipline** (judgment-territory): what a CHC freezes vs. doesn't promise; persona-specific CHCs cite STCHAR + active temporal record.
- **Non-player driver discipline**: selected SLT under non-player initiative; response CHC stance-variation; `chc_response_topical_grounding_missing` validator enforces driver-record grounding.
- **Hard discipline / Authoring discipline / Judgment territory** three-tier classification.

Use the text from SPEC-86 §4.1 (the section between the opening ` ```markdown ` fence and the closing fence), with the live predicate-name correction recorded in Assumption Reassessment item 5: `any_obligation_active` is corrected to `any_obligation_open`. The cross-reference to story-record-schemas.md uses `§4.5.12` (per SPEC-86 reassessment fix M1), not `§4.5`. The `required_because` vocabulary is cited generically (`§16a's required_because vocabulary is the authoring-time discipline for STCHAR packet inclusion.`), not enumerated verbatim (per SPEC-86 reassessment fix M2).

### 2. Update §12 first paragraph to enumerate §11a

Replace the existing first paragraph of §12 (which currently enumerates §4, §5, §6, §7, §8, §9, §10, §11) with the verbatim replacement from SPEC-86 §4.2 (appends `, and the character-fit selection contract (§11a)` to the enumeration). The change is additive — the existing enumeration text is preserved up to the §11 mention, with the §11a clause appended.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify)
- `archive/specs/SPEC-86-character-fit-selection-contract.md` (modify — same-seam factual predicate-name correction; archived after SPEC-86 completion)

## Out of Scope

- No schema changes (STCHAR / SLT / CHC / SE / PG record schemas unchanged — per SPEC-86 §3).
- No new validators (SPEC-86 §3 defers SPEC-C's 5 warning validators with named lift-condition; iter-3 SPEC-88 lift unmet).
- No MCP changes (SPEC-86 §3 defers SPEC-B's 6 projection columns + signature input + trace response with named lift-conditions; existing edge-join shape suffices per SPEC-81 1000-SLT proof).
- No new fixtures (SPEC-86 §3 defers SPEC-D's 6 fixture types — 3 already covered by archived SPEC-81/84/85, 1 already enforced by `stchar-temporal-reference-boundary`, 2 consumer-dependent on SPEC-C).
- No new health-audit mode (SPEC-86 §3 defers SPEC-E; existing structural mode Phase 2m covers actionable STCHAR authority health).
- No skill-prose anchor updates (those are in ticket SPEC86CHAFITSEL-002, which depends on this ticket).
- No renumbering of §11a to §13 (deferred per SPEC-86 §9 open question 2 — current §11a placement minimizes pressure on §12's existing enumeration text).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "^## 11a\. Character-Fit Selection Contract" .claude/skills/_shared-templates/story-state-contract.md` returns exactly 1 match.
2. `grep -nE "and the character-fit selection contract \(§11a\)" .claude/skills/_shared-templates/story-state-contract.md` returns exactly 1 match.
3. `cd tools/validators && npm test` passes with no regressions (regression sanity check — documentation-only change cannot affect validator behavior).
4. Document-order check: `grep -nE "^## " .claude/skills/_shared-templates/story-state-contract.md` shows §11 Mystery and Canon Authority → §11a Character-Fit Selection Contract → §12 How Skills Use This Contract in that order.

### Invariants

1. The shared story-state contract retains all existing sections (§1 through §12) with their content unchanged; §11a is purely additive between §11 and §12.
2. No FOUNDATIONS principle is weakened; §11a names existing validators as unchanged enforcement anchors.
3. Schema-minimalism doctrine (§Story Bundles §5b) is preserved — §11a adds zero schema fields.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -nE "^## 11a" .claude/skills/_shared-templates/story-state-contract.md` (presence of new §11a header)
2. `grep -nE "§11a" .claude/skills/_shared-templates/story-state-contract.md` (§12 enumeration update + any cross-reference)
3. `cd tools/validators && npm test` (regression sanity check — documentation-only change should not affect validator behavior; a regression here would indicate accidental scope expansion beyond the §11a + §12 edit)

## Outcome

Completed: 2026-05-25

- Added `## 11a. Character-Fit Selection Contract` to `.claude/skills/_shared-templates/story-state-contract.md` between §11 and §12.
- Updated §12's first paragraph to enumerate the character-fit selection contract (§11a).
- Amended `archive/specs/SPEC-86-character-fit-selection-contract.md` so the embedded §11a text uses the live predicate DSL name `any_obligation_open`; at ticket closeout time this file still lived under `specs/` and was archived after SPEC-86 completion.
- No schema, validator, MCP, fixture, or package source files were changed.

## Verification Result

- `grep -nE "^## 11a\. Character-Fit Selection Contract" .claude/skills/_shared-templates/story-state-contract.md` -> one match at line 619.
- `grep -nE "and the character-fit selection contract \(§11a\)" .claude/skills/_shared-templates/story-state-contract.md` -> one match at line 667.
- `grep -nE "^## (11\. Mystery|11a\. Character|12\. How)" .claude/skills/_shared-templates/story-state-contract.md` -> §11 at line 606, §11a at line 619, §12 at line 665.
- `rg -n "any_obligation_active" .claude/skills/_shared-templates/story-state-contract.md archive/specs/SPEC-86-character-fit-selection-contract.md` -> no matches after spec archival.
- `git diff --check -- .claude/skills/_shared-templates/story-state-contract.md archive/specs/SPEC-86-character-fit-selection-contract.md archive/tickets/SPEC86CHAFITSEL-001.md` -> PASS after spec archival.
- `npm test` in `tools/validators/` -> PASS, 1021/1021 tests.

## Deviations

- SPEC-86 §4.1 originally said to insert the §11a body verbatim, but live predicate verification showed `any_obligation_active` is not a valid predicate. The landed contract and the active spec use `any_obligation_open`, matching `.claude/skills/_shared-templates/story-state-contract.md`'s predicate table and `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`.
