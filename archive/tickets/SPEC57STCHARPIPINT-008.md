# SPEC57STCHARPIPINT-008: Promotion skills STCHAR evidence handling

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — modifies `story-fact-promotion-to-canon` and `story-promotion-closeout`; no new tool/schema.
**Deps**: archive/tickets/SPEC57STCHARPIPINT-001.md (STCHAR records are the evidence subject).

## Problem

At intake, the promotion skills had no STCHAR handling, leaving ambiguous whether a story-local character profile could become an automatic promotion source or silently reach world `CHAR`. SPEC-57 Phase 8 constrains STCHAR to supporting-evidence-only, keeps `character_outcome` rooted in STENT/STSTAT, and folds STCHAR supersession into the existing closeout discipline.

## Assumption Reassessment (2026-05-21)

1. `.claude/skills/story-fact-promotion-to-canon/SKILL.md` enumerates six source kinds; `character_outcome` is rooted in `STENT`/`STSTAT` supersession-chain evidence (not STCHAR), and there is currently no `proposal_evidence.supporting_story_character_profiles[]` field. `.claude/skills/story-promotion-closeout/SKILL.md` supersedes story-local records only when an amended-schema field must change (schema-agnostic discipline).
2. SPEC-57 §Phase 8 specifies: `character_outcome` stays rooted in STENT/STSTAT; STCHAR may appear only as `proposal_evidence.supporting_story_character_profiles[]` (evidence context, never an automatic promotion source); STCHAR must not be added to CF candidate `source_basis.derived_from[]` or `promotion_claims[].source_record`; story-local → world-`CHAR` promotion is out of scope; closeout supersedes STCHAR only when schema fields change.
3. Cross-skill boundary under audit: both promotion skills share the SP proposal-package / closeout-ledger surfaces; the STCHAR-as-evidence addition is the shared contract change. Both skills are edited together because the constraint (STCHAR is evidence, not source) spans the promotion→closeout pipeline.
4. FOUNDATIONS Rule 4 (No Globalization by Accident — story-local STCHAR never auto-promotes to world `CHAR`) and Rule 6 (No Silent Retcons — closeout supersession uses new ids when fields change). Story-to-world character promotion is explicitly deferred to a future dedicated workflow.
5. Output-schema extension: `story-fact-promotion-to-canon`'s SP proposal package (`story-promotions/SP-<integer>-proposal-package.yaml`) gains an optional `proposal_evidence.supporting_story_character_profiles[]` evidence array. Consumer: `canon-addition` (which receives the package). The extension is additive-only (new optional evidence array; STCHAR is explicitly barred from the CF-candidate `source_basis.derived_from[]` and `promotion_claims[].source_record`, so the candidate's promotion-source surface is unchanged).

## Architecture Check

1. Confining STCHAR to `supporting_story_character_profiles[]` (evidence) rather than a promotion source mirrors the existing STPLAN/STEMO "evidence context only" treatment — consistent with the promotion pipeline's discipline and preventing a story-local persona profile from silently becoming world canon.
2. No backwards-compatibility shim: `character_outcome`'s STENT/STSTAT rooting is unchanged; STCHAR is added only as an optional evidence array.

## Verification Layers

1. STCHAR is supporting evidence only → grep-proof that STCHAR appears in `supporting_story_character_profiles[]` and not in `source_basis.derived_from[]` / `promotion_claims[].source_record`.
2. `character_outcome` stays STENT/STSTAT-rooted → manual review of the source-kind definition.
3. Story-to-world character promotion is out of scope → grep-proof of the Out-of-Scope statement in both skills.
4. Single-layer note: these are skill-prose edits; the proof surfaces are grep + manual review.

## Landed Changes

### 1. story-fact-promotion-to-canon

Added STCHAR to `proposal_evidence.supporting_story_character_profiles[]` as evidence context; explicitly forbids STCHAR in CF candidate `source_basis.derived_from[]`, `promotion_claims[].source_record`, and `source_record_ids`; keeps `character_outcome` rooted in STENT/STSTAT; states story-local-to-world-`CHAR` promotion is out of scope. The FOUNDATIONS Alignment table now references STCHAR.

### 2. story-promotion-closeout

Documented that STCHAR is superseded only when an amended STCHAR field actually changes. Closeout records STCHAR verdict relevance in the ledger when no profile field changes, keeps STCHAR out of promotion source records, and never turns it into world `CHAR`. The FOUNDATIONS Alignment table now references STCHAR.

## Files to Touch

- `.claude/skills/story-fact-promotion-to-canon/SKILL.md` (modify)
- `.claude/skills/story-promotion-closeout/SKILL.md` (modify)

## Out of Scope

- A story-local-character → world-`CHAR` promotion workflow (explicitly deferred).
- Adding STCHAR as a promotion source kind.
- The STCHAR authoring skill (archive/tickets/SPEC57STCHARPIPINT-001.md).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "supporting_story_character_profiles" .claude/skills/story-fact-promotion-to-canon/SKILL.md` returns the evidence field; `grep -n "source_basis.derived_from\|promotion_claims" ...` shows STCHAR explicitly excluded.
2. `grep -n "STCHAR\|out of scope" .claude/skills/story-promotion-closeout/SKILL.md` shows the supersession-when-fields-change discipline.
3. Both skills' FOUNDATIONS Alignment tables reference STCHAR.

### Invariants

1. STCHAR is never an automatic promotion source and never enters CF `source_basis.derived_from[]`.
2. Story-local STCHAR never silently becomes world `CHAR`.

## Test Plan

### New/Modified Tests

1. `None — skill-prose ticket; promotion skills are LLM-executed and verified by grep-proof + manual review. No structured-output schema is emitted by these edits beyond the optional evidence array.`

### Commands

1. `grep -n "supporting_story_character_profiles\|source_basis.derived_from\|promotion_claims\|STCHAR" .claude/skills/story-fact-promotion-to-canon/SKILL.md .claude/skills/story-promotion-closeout/SKILL.md`
2. Manual review of the `character_outcome` source-kind definition and closeout supersession discipline.
3. Grep + manual review is the correct boundary because both deliverables are skill-prose constraints with no executable surface.

## Outcome

Completed: 2026-05-21.

Promotion skill prose now treats STCHAR as story-local evidence context only. `story-fact-promotion-to-canon` can include supporting profiles under `proposal_evidence.supporting_story_character_profiles[]`, but the skill now forbids STCHAR as a promotion source, as CF `source_basis.derived_from[]` authority, or as an automatic route to world `CHAR`. `story-promotion-closeout` now records STCHAR evidence dispositions separately from promotion source records and supersedes STCHAR only when an amended STCHAR field changes.

No production code or schema changed; this ticket was a skill-prose contract update.

## Verification Result

- `grep -n "supporting_story_character_profiles\|source_basis.derived_from\|promotion_claims\|STCHAR" .claude/skills/story-fact-promotion-to-canon/SKILL.md .claude/skills/story-promotion-closeout/SKILL.md` — PASS; the edited skills show the supporting evidence field plus explicit exclusions from CF authority and promotion source surfaces.
- `grep -n "STCHAR\|out of scope" .claude/skills/story-promotion-closeout/SKILL.md` — PASS; closeout now names STCHAR supersession only when amended fields change and states it never becomes world `CHAR`.
- `grep -n "§6.1 Story-Local Character Authority\|STCHAR" .claude/skills/story-fact-promotion-to-canon/SKILL.md .claude/skills/story-promotion-closeout/SKILL.md` — PASS; both skills' FOUNDATIONS Alignment tables reference STCHAR.
- Manual review — PASS; `character_outcome` remains rooted in `STENT`/`STSTAT`, and STCHAR stays supporting evidence only.
- `git diff --check -- .claude/skills/story-fact-promotion-to-canon/SKILL.md .claude/skills/story-promotion-closeout/SKILL.md archive/tickets/SPEC57STCHARPIPINT-008.md` — PASS.

## Deviations

- None.
