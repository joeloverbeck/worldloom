# SPEC09CANSAFEXP-001: FOUNDATIONS design-contract extension for canon-safety expansion

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `docs/FOUNDATIONS.md` (Core Principle, Canon Fact Record Schema, Relation Types, Validation Rules, Acceptance Tests sections); `docs/WORKFLOWS.md` (one-paragraph pointer). No tool/skill code touched in this ticket.
**Deps**: `specs/SPEC-09-canon-safety-expansion.md`

## Problem

At intake, Worldloom's canon-pipeline needed Rules 11 (No Spectator Castes by Accident) and 12 (No Single-Trace Truths) plus two conditionally-mandatory CF schema blocks (`epistemic_profile`, `exception_governance`) plus six new relation types. All downstream tickets (validators, schema enforcement, skill updates, audit check) read FOUNDATIONS.md as the authoritative declaration of these rules and shapes. Before this ticket landed, every downstream implementation referenced a non-existent design contract. This ticket is the design-contract update that gates everything else.

## Assumption Reassessment (2026-04-27)

1. `docs/FOUNDATIONS.md` exists and contains §Core Principle, §Canon Fact Record Schema, §Relation Types, §Validation Rules, and §Acceptance Tests. Current implementation used section anchors rather than stale line numbers.
2. SPEC-09 §Deliverables item 7 specifies that the new "Genesis-world rule" paragraph lands **after** the `pre_figured_by[]` paragraph and **before** the SPEC-13 Canonical-storage blockquote (per reassess-spec finding M10 resolution).
3. **Cross-skill / cross-artifact boundary under audit**: this ticket is the design-contract source-of-truth for SPEC09CANSAFEXP-002, -003, -004, -005, -007. Every ticket downstream of -001 cites FOUNDATIONS principle/schema as enforcement input. No code reads FOUNDATIONS at runtime — these are documentation-side declarations consumed by skill prose and validator design.
4. **FOUNDATIONS principle motivating this ticket**: SPEC-09 Approach Moves 1, 2, 3, 4 collectively extend FOUNDATIONS's seven validation rules (adding 11, 12), the CF Record Schema (adding two conditionally-mandatory blocks), the §Core Principle (adding Default Reality paragraph), and §Relation Types (adding six new relations). All edits are additive — no removals, no semantic narrowing of existing principles.
5. The drafted YAML verification assumed comment-separated alternatives would parse via `js-yaml.loadAll()`. The landed `docs/FOUNDATIONS.md` example uses a real `---` document separator before the `n_a` alternatives so the extracted YAML block is parseable while still showing both populated and `n_a` forms.

## Architecture Check

1. FOUNDATIONS.md is the canonical declaration surface for canon-pipeline design contracts (per FOUNDATIONS §Tooling Recommendation and CLAUDE.md §What This Repo Is). Putting Rules 11/12 here — alongside Rules 1-7 — keeps the design-contract surface unified rather than splitting new rules into a separate file. Same for the new CF schema blocks (extending the existing schema example) and new relation types (extending the existing list).
2. No backwards-compatibility shims introduced. The Genesis-world rule paragraph encodes the append-only grandfather policy explicitly: historical CFs predating a schema extension remain valid; new CFs meet the current schema. This is policy, not a code shim.

## Verification Layers

1. FOUNDATIONS.md renders as valid markdown after edits — codebase grep-proof (`grep -nE "Rule 11|Rule 12|epistemic_profile|exception_governance|observed_by|recorded_in|suppressed_by|distorted_by|countered_by|rate_limited_by|Default Reality|Genesis-world rule" docs/FOUNDATIONS.md` returns the new content).
2. Two new YAML blocks in §Canon Fact Record Schema parse cleanly when extracted — schema validation (`js-yaml.loadAll()` parses the first YAML code block, including the `---`-delimited `n_a` alternative document).
3. WORKFLOWS.md pointer paragraph references the new tests by name — codebase grep-proof (`grep -nE "Test 11|Test 12|conditional-mandate" docs/WORKFLOWS.md`).
4. Genesis-world rule paragraph lands at the correct anchor (after `pre_figured_by[]` paragraph, before SPEC-13 storage blockquote) — manual review against §Canon Fact Record Schema's tail order.

## What to Change

### 1. `docs/FOUNDATIONS.md` §Core Principle — Default Reality paragraph (≤120 words)

Append a "Default Reality" paragraph after the constrained-model bullet list and before the following `---` separator. Content: silence is not license to invent later; previously-unmodeled areas, when first canonized, must be acknowledged as previously unmodeled. Cross-reference Rule 6 explicitly. Word-budget cap: 120 words.

### 2. `docs/FOUNDATIONS.md` §Canon Fact Record Schema — extend YAML example with two new blocks

Insert into the existing YAML example block after the `notes:` field and before the closing of the example. Use the SPEC-09 §Deliverables item 2 fields (header comments + populated form + `n_a` form for both `epistemic_profile` and `exception_governance`), with a `---` separator before the `n_a` alternatives so the example parses with `js-yaml.loadAll()`.

### 3. `docs/FOUNDATIONS.md` §Relation Types — append six new relations

Append to the bulleted list after `mythologizes`:
- `observed_by` — names actors who can directly perceive the fact
- `recorded_in` — names artifacts/records that capture the fact
- `suppressed_by` — names actors who actively prevent propagation
- `distorted_by` — names actors who systematically misrepresent the fact
- `countered_by` — names mechanisms that limit the fact's effects
- `rate_limited_by` — names mechanisms that throttle exercise of the fact

### 4. `docs/FOUNDATIONS.md` §Validation Rules — add Rules 11 and 12

Append after Rule 7. Use the same shape as Rules 1-7 (### header + statement + one-sentence rationale if non-obvious). Content per SPEC-09 Move 1.

### 5. `docs/FOUNDATIONS.md` §Validation Rules — cross-reference notes for rejected Rules 9, 10

Add brief cross-reference notes under Rules 11 and 12 pointing to existing enforcement: Rule 9 (No Impossible Knowledge) → character-generation Phase 7b + diegetic-artifact-generation Phase 7c; Rule 10 (No Premise-Collapsing Exceptions) → canon-addition Phase 5 (Diffusion Analysis) + Phase 7 (Counterfactual Pressure Test) + Validation Tests 3, 8.

### 6. `docs/FOUNDATIONS.md` §Acceptance Tests — add new test

Append to the Acceptance Tests bulleted list. Content: "When an exceptional capability exists, what leverage remains to ordinary, mid-tier, and institutional actors respectively?"

### 7. `docs/FOUNDATIONS.md` §Canon Fact Record Schema — Genesis-world rule paragraph

Add after the `pre_figured_by[]` paragraph and before the SPEC-13 Canonical-storage blockquote. Content: "*Genesis-world rule.* New worlds adopt the full schema from `CF-0001`. Existing worlds honor the append-only ledger — historical CFs predating a schema extension remain valid; new CFs appended after a schema extension meet the current schema."

### 8. `docs/WORKFLOWS.md` — one-paragraph pointer

Add a one-paragraph pointer (location: at the canon-addition or validation section, wherever validation tests are referenced). Explains the new Tests 11 and 12 and the conditional-mandate regime for `epistemic_profile` / `exception_governance`. References FOUNDATIONS.md §Canon Fact Record Schema and §Validation Rules for full detail.

## Files to Touch

- `docs/FOUNDATIONS.md` (modify) — 7 discrete edits per §Approach above
- `docs/WORKFLOWS.md` (modify) — one-paragraph pointer
- `archive/tickets/SPEC09CANSAFEXP-001.md` (modify) — reassessment, closeout, and truthful verification command shape

## Out of Scope

- Validator implementation of Rule 11 / Rule 12 (delivered by SPEC09CANSAFEXP-003)
- Structural-schema enforcement of `epistemic_profile` / `exception_governance` block presence (delivered by SPEC09CANSAFEXP-002)
- canon-addition skill updates referencing the new Tests 11/12 (delivered by SPEC09CANSAFEXP-004)
- continuity-audit silent-area-canonization check (delivered by SPEC09CANSAFEXP-005)
- create-base-world genesis-enforcement skill prose (delivered by SPEC09CANSAFEXP-007)
- diegetic-artifact-generation template cleanup (delivered by SPEC09CANSAFEXP-006; unrelated to canon-safety expansion's main thrust)
- Any code change in `tools/`

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "Rule 11\|Rule 12" docs/FOUNDATIONS.md` returns at minimum 2 matches at the new rule headers (plus any cross-reference notes).
2. `grep -n "epistemic_profile:\|exception_governance:" docs/FOUNDATIONS.md` returns matches in the §Canon Fact Record Schema YAML example block (4 matches expected: each block's populated form + each block's `n_a` form).
3. `grep -n "observed_by\|recorded_in\|suppressed_by\|distorted_by\|countered_by\|rate_limited_by" docs/FOUNDATIONS.md` returns 6 matches at the §Relation Types list.
4. `grep -n "Default Reality\|Genesis-world rule" docs/FOUNDATIONS.md` returns 2 matches.
5. `grep -n "Test 11\|Test 12\|conditional-mandate" docs/WORKFLOWS.md` returns matches confirming the pointer paragraph landed.
6. The two new YAML blocks (`epistemic_profile`, `exception_governance`), when extracted from the §Canon Fact Record Schema code block, parse via `js-yaml.loadAll()` without error.

### Invariants

1. No existing FOUNDATIONS principle is removed, narrowed, or contradicted by this ticket. Edits are strictly additive — Rules 1-7 unchanged; existing CF schema fields unchanged; existing relation types unchanged.
2. Genesis-world rule paragraph lands between the `pre_figured_by[]` paragraph and the SPEC-13 Canonical-storage blockquote (preserving the section's tail logical order: schema example → pre_figured_by → genesis policy → storage policy).
3. WORKFLOWS.md pointer references FOUNDATIONS.md by section name, not by line number (line numbers drift; section names are stable).

## Test Plan

### New/Modified Tests

`None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -nE "Rule 11|Rule 12|epistemic_profile|exception_governance|observed_by|recorded_in|suppressed_by|distorted_by|countered_by|rate_limited_by|Default Reality|Genesis-world rule" docs/FOUNDATIONS.md` — all new content greppable.
2. `grep -nE "Test 11|Test 12|conditional-mandate" docs/WORKFLOWS.md` — pointer paragraph greppable.
3. `cd tools/validators && node -e 'const yaml = require("js-yaml"); const fs = require("fs"); const fence = String.fromCharCode(96).repeat(3); const md = fs.readFileSync("../../docs/FOUNDATIONS.md", "utf8"); const block = md.split(fence + "yaml\n")[1].split("\n" + fence)[0]; yaml.loadAll(block); console.log("OK");'` — extracted YAML example parses cleanly (using `loadAll` because the block contains a `---` separator before the `n_a` alternatives; `js-yaml` is package-local to `tools/validators`).

## Outcome

Completion date: 2026-04-27.

Completed the design-contract landing for SPEC-09:

- Added `Default Reality`, Rules 11 and 12, the action-space acceptance test, six epistemic/exception relation types, and the `Genesis-world rule` to `docs/FOUNDATIONS.md`.
- Extended the Canon Fact Record YAML example with parseable populated and `n_a` examples for `epistemic_profile` and `exception_governance`.
- Added the `docs/WORKFLOWS.md` pointer to Test 11, Test 12, and the conditional-mandate regime.

## Verification Result

- `grep -nE "Rule 11|Rule 12|epistemic_profile|exception_governance|observed_by|recorded_in|suppressed_by|distorted_by|countered_by|rate_limited_by|Default Reality|Genesis-world rule" docs/FOUNDATIONS.md` — passed; all new FOUNDATIONS contract terms are present.
- `grep -nE "Test 11|Test 12|conditional-mandate" docs/WORKFLOWS.md` — passed; pointer paragraph is present.
- `cd tools/validators && node -e 'const yaml = require("js-yaml"); const fs = require("fs"); const fence = String.fromCharCode(96).repeat(3); const md = fs.readFileSync("../../docs/FOUNDATIONS.md", "utf8"); const block = md.split(fence + "yaml\n")[1].split("\n" + fence)[0]; yaml.loadAll(block); console.log("OK");'` — passed; the root-level variant failed because `js-yaml` is not installed at repo root.

## Deviations

- The YAML example uses a real `---` separator for the `n_a` alternative forms. This preserves the ticket's intended two-form documentation while making the recorded `js-yaml.loadAll()` proof truthful.
