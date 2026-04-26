# SPEC17AUDTRARET-001: Deprecate notes-paragraph CF-modification convention

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None — pure-additive prose change to a skill template, a SKILL.md, a tool README, an op-file header comment, and a validator file header comment. No engine code, validator code, or schema change.
**Deps**: None

## Problem

At intake, the pre-SPEC-13 CF authoring convention required BOTH a `notes` paragraph (`Modified YYYY-MM-DD by CH-NNNN (CF-NNNN): <summary>`) AND a structured `modification_history[]` entry per retroactive modification. The post-SPEC-13 patch engine's `append_modification_history_entry` op (`tools/patch-engine/src/ops/append-modification-history-entry.ts:64`) already appended only the structured entry; it did NOT touch `notes`. The `modification_history_retrofit` validator (`tools/validators/src/structural/modification-history-retrofit.ts:11`) checked one direction only: notes → history. The reverse direction was unchecked because the engine no longer emits to `notes`.

Before this ticket, the dual-convention was still prescribed in `.claude/skills/create-base-world/templates/canon-fact-record.yaml:97-118` (the `notes:` block + comments above `modification_history: []`). A future skill author authoring a new canon-mutating skill might have re-invented the dual-convention by analogy to that template. Track C1 deprecated the convention by replacing the prescription at the actual prescription surface and adding defense-in-depth deprecation prose at four additional surfaces a future skill author would naturally consult.

## Assumption Reassessment (2026-04-26)

1. Verified canonical prescription surface: `.claude/skills/create-base-world/templates/canon-fact-record.yaml:97-118` carries the dual-convention prescription verbatim — *"When a future canon-addition run modifies this CF, that run is responsible for appending a standardized line: `Modified YYYY-MM-DD by CH-NNNN (CF-NNNN): <one-sentence summary>`"* and *"the notes-field 'Modified YYYY-MM-DD by CH-NNNN (CF-NNNN): ...' line and the modification_history entry are required together whenever the scan identifies the CF."* Direct grep at `/reassess-spec` time confirmed the canon-addition SKILL.md, its references/ files (consequence-analysis.md, counterfactual-and-verdict.md, proposal-normalization.md, retrieval-tool-tree.md), the skill-creator CF template, and the continuity-audit CF template do NOT contain the prescription. The `tools/patch-engine/README.md` is 32 lines with no per-op description — adding a new H2 §Audit Trail Discipline section after §Atomicity is the publicly-visible landing surface.
2. Verified post-SPEC-13 audit-trail truth: `continuity-audit/SKILL.md:309,314` and `continuity-audit/templates/retcon-proposal-card.md:131-141` reference `modification_history` (the structured field) for retcon planning. Per `docs/FOUNDATIONS.md` §Rule 6 No Silent Retcons (lines 386-387) and §Canonical Storage Layer (lines 458-468), `modification_history[]` is one of the authorized in-place mutation surfaces for an accepted CF; the structured field carries the audit log; the deprecated notes paragraph adds redundancy without enforcement value (only one direction is checked).
3. Cross-skill / cross-artifact boundary under audit: the CF authoring contract spans (a) `create-base-world` (CF template authority — emits the genesis CF with the canonical comment block), (b) `canon-addition` (the only skill that retroactively modifies CFs), (c) `tools/patch-engine` (the engine emits to `modification_history[]` only via `append_modification_history_entry`), and (d) `tools/validators/src/structural/modification-history-retrofit.ts` (the one-way notes → history check). The deprecation message must land coherently across all four surfaces (plus canon-addition SKILL.md as the canon-mutating skill where a future maintainer would look for guidance) so a future skill author consulting any one of them does not reinvent the dual-convention.
4. FOUNDATIONS principle motivating this ticket: Rule 6 (No Silent Retcons) — *"All canon changes must be logged with justification."* The structured `modification_history[]` field carries `change_id`, `originating_cf`, `date`, `summary` per the patch engine's `append_modification_history_entry` op. Rule 6 is satisfied by the structured field alone; the notes-paragraph convention added redundancy that only the one-way validator check enforces, and engine emissions never produce the notes line, so the redundancy is unrecoverable from the canonical write path.
5. HARD-GATE / canon-write-ordering / Canon Safety Check surfaces: NOT affected. This ticket adds prose near canon-addition's existing Phase 12a guidance (or under §Validation Rules This Skill Upholds → Rule 6 mechanism — implementer's choice); it does NOT modify the HARD-GATE block (`§HARD-GATE → Phase 15a submit`), canon-write ordering (the engine's 3-tier order is unchanged), or any Canon Safety Check surface. The Mystery Reserve firewall is unaffected — `modification_history[]` audit-trail discipline is independent of MR semantics.
6. Output schema extension status: NEITHER schema is extended. The `notes` field and `modification_history[]` array shapes in FOUNDATIONS.md §Canon Fact Record Schema (lines 263-322) are unchanged. Pre-SPEC-13 CFs with dual notes-paragraph + history-entry records remain valid under the existing one-way `modification_history_retrofit` check; future modifications add only history entries; the structured-field schema is preserved.
7. Adjacent contradictions exposed during reassessment: `.claude/skills/create-base-world/templates/canon-fact-record.yaml` forward-references `canon-addition/templates/canon-fact-record.yaml` and `canon-addition/references/accept-path.md`; both files do not exist (canon-addition/templates/ contains only `critic-prompt.md` and `critic-report-format.md`; there is no `accept-path.md` in canon-addition/references/). Classification: required consequence of THIS ticket. Implementation removed both the inline forward-references near `modification_history: []` and the top-of-file sync comment's stale `canon-addition/templates/canon-fact-record.yaml` path. Root-cause triage (whether the referenced files were deferred, renamed, or absorbed during SPEC-06 / SPEC-15 work) is tracked by `tickets/SPEC17AUDTRARET-003.md`.
8. Same-seam reference scan found a historical SPEC-06 migration table row: `specs/SPEC-06-skill-rewrite-patterns.md` still mentions "Attribution stamping (`<!-- added by CF-NNNN -->`, notes-field lines) | SPEC-03 engine auto-stamp". Classification: out of this ticket's Track C1 implementation boundary. SPEC17AUDTRARET-001 owns the five SPEC-17 C1 prescription/defense surfaces and create-base-world's stale forward-references; it does not reopen the older SPEC-06 migration table wording. SPEC-06 truthing is tracked by `tickets/SPEC17AUDTRARET-003.md`.

## Architecture Check

1. Pure-additive prose change is the cleanest of the three options enumerated in SPEC-17 §Approach Track C1 Rationale. **Option A** (auto-sync in engine) introduces formatting opinion the engine doesn't have today — where in `notes` does the line go? section-aware? appended? — and would require test coverage on every future CF mutation. **Option B** (validator-both-directions) is the worst intermediate state — every engine-emitted CF mutation between landing and engine update would FAIL validation. **Option C** (deprecate the convention; structured field is canonical) requires no engine code change, no validator code change, and no schema change — only prose updates. Selected by the spec.
2. No backwards-compatibility aliasing/shims introduced. Pre-SPEC-13 CFs retain their dual-convention `notes` paragraphs as historical artifact; the validator's one-way notes → history check continues to enforce consistency for those records. Future modifications to those CFs add only structured history entries via the engine; their `notes` paragraphs are not touched and not extended — the historical artifact is preserved without ongoing maintenance burden.

## Verification Layers

1. Deprecated prescription removed from CF template → codebase grep-proof: `grep -nE "Modified.*by CH-" .claude/skills/create-base-world/templates/canon-fact-record.yaml` returns 0 matches; `grep -nE "notes-field.*line and the|required together" .claude/skills/create-base-world/templates/canon-fact-record.yaml` returns 0 matches.
2. Canonical prose lands across 5 surfaces → codebase grep-proof: 5 grep commands against the new prose strings on each surface (canon-addition SKILL.md, create-base-world template, patch-engine README, op-file header, validator file header) — see Acceptance Criteria.
3. Sibling CF templates remain clean (defense-in-depth) → codebase grep-proof: `grep -nE "Modified.*by CH-|notes-field" .claude/skills/skill-creator/templates/canon-fact-record.yaml .claude/skills/continuity-audit/templates/canon-fact-record.yaml` returns 0 matches.
4. Validator behavior unchanged → existing validator-package test suite: `cd tools/validators && npm test` passes — the test fixtures at `tools/validators/tests/structural/modification-history-retrofit.test.ts:10,23` use the pre-SPEC-13 dual-convention pattern as test input data; the deprecation message in the validator file's new header comment is documentation, not behavior.
5. End-to-end behavioral verification → manual review of the next canon-addition run: a subsequent canon-addition run produces a CF modification via `append_modification_history_entry` with no parallel notes-paragraph append; `world-validate` returns clean; `continuity-audit`, when next exercised, reads the structured field for retcon planning. (Informal evidence; not a gating criterion for ticket close.)

## What to Change

### 1. Replace dual-convention prose in create-base-world CF template

In `.claude/skills/create-base-world/templates/canon-fact-record.yaml`, replace lines 97-118 (the `notes:` block instructing future canon-addition runs to "append a standardized line: `Modified YYYY-MM-DD by CH-NNNN (CF-NNNN): ...`" plus the comment block over `modification_history: []` stating that "the notes-field 'Modified YYYY-MM-DD by CH-NNNN (CF-NNNN): ...' line and the modification_history entry are required together") with prose stating the post-SPEC-13 convention: free-form `notes:` continues to carry adjudication reasoning and scope-narrowing decisions; `modification_history[]` is the canonical structured audit surface for any future canon-addition run that modifies this CF; the engine's `append_modification_history_entry` op writes only to that field; future modifications do NOT also append a parallel notes paragraph. Cite SPEC-17 for the decision context. The forward-references to `canon-addition/templates/canon-fact-record.yaml` and `canon-addition/references/accept-path.md` are stale (both files do not exist today) and must be removed in the same edit; the schema-uniformity claim those references supported is preserved by the deprecation prose itself.

### 2. Add net-new prose in canon-addition SKILL.md

In `.claude/skills/canon-addition/SKILL.md`, add net-new prose explicitly stating `modification_history[]` is the canonical post-SPEC-13 audit surface, the engine's `append_modification_history_entry` op writes only to that field, and skills do NOT append a parallel notes paragraph. Land near the existing Phase 12a prose (which already references `modification_history` for the axis-(c) judgment) or under §Validation Rules This Skill Upholds → Rule 6 mechanism — implementer's choice; the prose MUST contain the literal phrase `modification_history[] is the canonical` so the post-apply grep can prove it landed. Cite SPEC-17 for the decision context. (No existing prescription needs replacing — verified clean by reassessment grep.)

### 3. Add §Audit Trail Discipline section to patch-engine README

In `tools/patch-engine/README.md`, add a new H2 section `## Audit Trail Discipline` after the existing `## Atomicity` section, with the following body:

> Post-SPEC-13, `modification_history[]` is the canonical audit surface for CF retroactive modifications. The `append_modification_history_entry` op writes only to that field; the engine does NOT mirror entries into the `notes` field. Pre-SPEC-13 CFs may carry dual notes-paragraph + history-entry records as historical artifact; new modifications use the structured field only. The `modification_history_retrofit` validator polices the historical convention in one direction only (notes → history); the reverse direction is intentionally unchecked because the engine no longer emits to `notes`. See `specs/SPEC-17-audit-trail-and-retrieval-contract-clarifications.md` Track C1.

### 4. Add header comment to append-modification-history-entry.ts

In `tools/patch-engine/src/ops/append-modification-history-entry.ts`, add a top-of-file header comment (above the imports) stating: `// modification_history[] is the canonical post-SPEC-13 audit surface. This op intentionally writes only to that field. The engine does NOT mirror entries into notes. See SPEC-17 Track C1.` This defends against re-introduction of the dual-convention during future op refactors.

### 5. Add header comment to modification-history-retrofit.ts

In `tools/validators/src/structural/modification-history-retrofit.ts`, add a top-of-file header comment (above the imports) explaining the deprecation context: the validator polices the historical convention in one direction only (notes → history); the reverse direction is intentionally unchecked because the engine no longer emits to `notes`; pre-SPEC-13 CFs with dual notes-paragraph + history-entry records remain valid under this one-way check. The comment ensures a future reader doesn't re-add the reverse-direction check by mistake. Reference SPEC-17 Track C1 for the decision context.

## Files to Touch

- `.claude/skills/create-base-world/templates/canon-fact-record.yaml` (modify)
- `.claude/skills/canon-addition/SKILL.md` (modify)
- `tools/patch-engine/README.md` (modify)
- `tools/patch-engine/src/ops/append-modification-history-entry.ts` (modify)
- `tools/validators/src/structural/modification-history-retrofit.ts` (modify)

## Out of Scope

- Backfilling missing `notes` paragraphs on pre-SPEC-13 CFs (e.g., the just-shipped CF-0024 modification for PR-0015 / CH-0021 / CF-0048). Per SPEC-15 §Out of Scope, reaffirmed in SPEC-17 §Out of Scope.
- Removing pre-SPEC-13 `notes` paragraphs from historical CFs (CF-0006, CF-0017, etc.). They remain as historical artifact; no migration. The validator's one-way check continues to enforce consistency for these records.
- Engine code change to `tools/patch-engine/src/ops/append-modification-history-entry.ts`. Op behavior is unchanged; only the file header comment is added.
- Validator code change to `tools/validators/src/structural/modification-history-retrofit.ts`. The one-way check is unchanged; only the file header comment is added.
- Schema change to FOUNDATIONS.md §Canon Fact Record Schema. The `notes` field and `modification_history[]` shapes are unchanged.
- Triage of broken forward-references in `.claude/skills/create-base-world/templates/canon-fact-record.yaml` (the references to non-existent `canon-addition/templates/canon-fact-record.yaml` and `canon-addition/references/accept-path.md`). The forward-references are removed inline as part of change #1; their root-cause investigation (deferred / renamed / absorbed during SPEC-06 / SPEC-15 work?) is recommended as a separate triage pass per SPEC-17 §Risks.
- Track C2 deliverables (FOUNDATIONS §Tooling Recommendation amendment + CONTEXT-PACKET-CONTRACT subsection + world-mcp README cross-reference + MACHINE-FACING-LAYER recommended composition note); covered by SPEC17AUDTRARET-002.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "modification_history\[\] is the canonical" .claude/skills/canon-addition/SKILL.md` returns ≥1 match (canonical phrasing landed in canon-addition).
2. `grep -nE "canonical post-SPEC-13 audit surface|canonical structured audit surface|canonical audit surface" .claude/skills/create-base-world/templates/canon-fact-record.yaml` returns ≥1 match (template prescription replaced).
3. `grep -n "Audit Trail Discipline" tools/patch-engine/README.md` returns ≥1 match (new H2 section landed).
4. `grep -n "canonical post-SPEC-13 audit surface" tools/patch-engine/src/ops/append-modification-history-entry.ts` returns ≥1 match (op-file header landed).
5. `grep -nE "canonical post-SPEC-13 audit surface|deprecation context|notes -> history" tools/validators/src/structural/modification-history-retrofit.ts` returns ≥1 match (validator-file header landed).
6. `grep -nE "Modified.*by CH-" .claude/skills/create-base-world/templates/canon-fact-record.yaml` returns 0 matches (deprecated prescription removed).
7. `grep -nE "notes-field.*line and the|required together" .claude/skills/create-base-world/templates/canon-fact-record.yaml` returns 0 matches (dual-convention framing removed).
8. `grep -nE "canon-addition/templates/canon-fact-record\.yaml|canon-addition/references/accept-path\.md" .claude/skills/create-base-world/templates/canon-fact-record.yaml` returns 0 matches (stale forward-references removed inline).
9. `grep -nE "Modified.*by CH-|notes-field" .claude/skills/skill-creator/templates/canon-fact-record.yaml .claude/skills/continuity-audit/templates/canon-fact-record.yaml` returns 0 matches (defense-in-depth check that sibling CF templates remain clean).
10. `cd tools/validators && npm test` passes (validator-package test suite; existing notes → history one-way check continues to function on pre-SPEC-13 dual-convention test fixtures).

### Invariants

1. The patch engine emits to `modification_history[]` only; it does NOT emit to `notes` for retroactive modifications. Engine code is unchanged.
2. The `modification_history_retrofit` validator continues to check one direction only (notes → history); pre-SPEC-13 CFs with dual notes-paragraph + history-entry records remain valid under this check.
3. CF Record schema in FOUNDATIONS.md §Canon Fact Record Schema is unchanged; both `notes` and `modification_history[]` retain their existing semantics (free-form prose for `notes`; structured `change_id` / `originating_cf` / `date` / `summary` per entry in `modification_history[]`).
4. The Mystery Reserve firewall is unaffected — `modification_history[]` audit-trail discipline is orthogonal to MR resolution semantics.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `for f in ".claude/skills/canon-addition/SKILL.md" ".claude/skills/create-base-world/templates/canon-fact-record.yaml" "tools/patch-engine/README.md" "tools/patch-engine/src/ops/append-modification-history-entry.ts" "tools/validators/src/structural/modification-history-retrofit.ts"; do echo "=== $f ==="; grep -nE "modification_history\[\] is the canonical|canonical .*audit surface|Audit Trail Discipline|notes -> history|deprecation context" "$f"; done` — positive grep verification across all 5 surfaces.
2. `for f in ".claude/skills/create-base-world/templates/canon-fact-record.yaml" ".claude/skills/skill-creator/templates/canon-fact-record.yaml" ".claude/skills/continuity-audit/templates/canon-fact-record.yaml"; do echo "=== $f ==="; grep -nE "Modified.*by CH-|notes-field.*line and the|required together" "$f" || echo "  ✓ clean"; done` — removal verification on the create-base-world template + defense-in-depth check on sibling CF templates.
3. `cd tools/validators && npm test` — full validator-package test suite (the narrowest correctness gate that exercises the `modification_history_retrofit` validator's one-way check against pre-SPEC-13 fixtures).

## Outcome

Completed Track C1 as a prose/comment-only deprecation:

- Replaced the create-base-world CF template's dual notes-paragraph + history-entry prescription with post-SPEC-13 structured audit guidance.
- Removed stale create-base-world forward-references to non-existent canon-addition template/reference files.
- Added explicit canon-addition guidance that modification_history[] is the canonical post-SPEC-13 audit surface and no parallel notes paragraph is emitted.
- Added the patch-engine README `## Audit Trail Discipline` section.
- Added non-behavioral header comments to `append-modification-history-entry.ts` and `modification-history-retrofit.ts`.

No engine behavior, validator behavior, schema, HARD-GATE semantics, canon-write ordering, or Mystery Reserve firewall behavior changed.

## Verification Result

Completed:

1. `grep -n "modification_history\[\] is the canonical" .claude/skills/canon-addition/SKILL.md` returned line 69.
2. `grep -nE "canonical post-SPEC-13 audit surface|canonical structured audit surface|canonical audit surface" .claude/skills/create-base-world/templates/canon-fact-record.yaml` returned line 108.
3. `grep -n "Audit Trail Discipline" tools/patch-engine/README.md` returned line 33.
4. `grep -n "canonical post-SPEC-13 audit surface" tools/patch-engine/src/ops/append-modification-history-entry.ts` returned line 1.
5. `grep -nE "canonical post-SPEC-13 audit surface|deprecation context|notes -> history" tools/validators/src/structural/modification-history-retrofit.ts` returned lines 1 and 3.
6. `grep -nE "Modified.*by CH-" .claude/skills/create-base-world/templates/canon-fact-record.yaml` returned zero matches.
7. `grep -nE "notes-field.*line and the|required together" .claude/skills/create-base-world/templates/canon-fact-record.yaml` returned zero matches.
8. `grep -nE "canon-addition/templates/canon-fact-record\.yaml|canon-addition/references/accept-path\.md" .claude/skills/create-base-world/templates/canon-fact-record.yaml` returned zero matches.
9. `grep -nE "Modified.*by CH-|notes-field" .claude/skills/skill-creator/templates/canon-fact-record.yaml .claude/skills/continuity-audit/templates/canon-fact-record.yaml` returned zero matches.

10. `npm test` from `tools/validators` passed: 54 tests, 54 pass, 0 fail. The package emitted the existing Git default-branch hint during temp-repo setup; no ticket-owned warning or failure was introduced.

## Deviations

- The validator/README prose uses ASCII `notes -> history` rather than the Unicode arrow form from the drafted ticket, matching repository ASCII editing discipline.
- The create-base-world top-of-file stale `canon-addition/templates/canon-fact-record.yaml` sync reference was removed because it made the ticket's stale-forward-reference grep proof fail and belonged to the same template-reference seam.
- `specs/SPEC-06-skill-rewrite-patterns.md` still contains an older migration-table reference to `notes-field lines`; that historical spec wording is outside this ticket's five-surface SPEC-17 Track C1 boundary and is tracked by `tickets/SPEC17AUDTRARET-003.md`.
