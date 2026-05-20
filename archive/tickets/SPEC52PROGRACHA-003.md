# SPEC52PROGRACHA-003: Revise character-generation for dramatic_core + anti-flattening

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `character-generation` SKILL.md, references (phase-0-normalize-brief, phases-1-6-character-construction, phase-8-validation-tests, governance-and-foundations), and the dossier template.
**Deps**: archive/tickets/SPEC52PROGRACHA-001.md

## Problem

At intake, `character-generation` built grounded, validated dossiers but had no structured surface for world-produced wound, appetite, self-mythology, pressure behavior, relational charge, moral edge, or signature scene behavior — and a strong NCP could be fed in and emerge as a safer, duller dossier. SPEC-52 D4 makes final CHAR dossiers preserve and deepen a proposal's memorability via a required `dramatic_core` block + an anti-flattening preservation contract.

## Assumption Reassessment (2026-05-20)

1. At intake, `character-generation` ran Phases 0-9 (`.claude/skills/character-generation/SKILL.md`); Phase 0 normalize lived in `references/phase-0-normalize-brief.md`; Phases 1-6 construction in `references/phases-1-6-character-construction.md` (Phase 4 = Goal and Pressure Construction); Phase 8 tests in `references/phase-8-validation-tests.md` had 10 tests, incl. "World-Grown Specificity". The dossier template `templates/character-dossier.md` had 9 body sections and no `dramatic_core` frontmatter or protagonist-grade body sections.
2. SPEC-52 §Phase 4 + Deliverable 4 enumerate: Phase 0 preservation contract (`input_memorability_contract`), Phase 4b deepening/preservation, required CHAR frontmatter `dramatic_core`, six new body sections before "Likely Story Hooks", and new Phase 8 validation tests.
3. Cross-skill boundary: the CHAR `dramatic_core` frontmatter block field names MUST match `.claude/skills/_shared-references/protagonist-grade-character-engine.md` (001) and the NCP `memorability_profile` block completed in `archive/tickets/SPEC52PROGRACHA-002.md`; when `character_brief_path` is an NCP card, Phase 0 extracts its `memorability_profile` as the preservation contract. The `dramatic_core` schema is enforced by `character-frontmatter.schema.json` (005) and the body sections by the structural validator (006).
4. FOUNDATIONS Rule 2 (No Pure Cosmetics) + Rule 3 (No Specialness Inflation): `dramatic_core` is required on every CHAR because every dossier-pipeline character is a deliberately-kept world character (ephemeral cast are story-system STENT records, outside this spec) — "engine density, not theatrical loudness," not universal exceptional capability. Rule 7: the Phase 7 Canon Safety Check / Mystery Reserve firewall is unchanged; if canon repair must weaken a dramatic element, the anti-flattening contract surfaces the tradeoff before commit.
5. Output-schema extension (character dossier): adding required `dramatic_core` frontmatter + six body sections extends the CHAR output shape. Consumers: `character-frontmatter.schema.json` (005), the structural validator (006), and `branching-story-bootstrap` (reads CHAR ids only — unaffected; no story-aware fields are added). The extension is required-breaking by design (existing animalia dossiers fail until manually edited) — Rule 6: this is the documented intended break (SPEC-52 §Key Design Decisions), not a silent retcon.
6. HARD-GATE read required and completed: Phase 8 validation rows are part of the content-generating skill gate before `submit_patch_plan`, and `docs/HARD-GATE-DISCIPLINE.md` requires validation/rejection tests to record PASS with authority-cited rationales. This ticket adds tests and preserves gate order/approval semantics; it does not alter approval-token or submit behavior.
7. Same-skill governance reference `.claude/skills/character-generation/references/governance-and-foundations.md` also described the old CHAR schema/body list and Rule 2 phase mapping. That reference is same-seam operational documentation, so this ticket includes it in the landed file set.
8. The drafted skill dry-run proof was not executable in this Codex context: there is no repo-local runner that invokes `.claude/skills/character-generation` and captures an emitted, uncommitted dossier preview. The accepted proof boundary is grep-proof over edited operational surfaces plus manual contract review against the shared reference, SPEC-52, and HARD-GATE discipline.

## Architecture Check

1. A Phase 4b that converts contradiction→repeated behavior, shame→self-mythology, desire→appetite, embedding→relational charge, voice→pressure speech preserves the NCP engine instead of flattening it, with the preservation contract making any canon-forced flattening explicit. Cleaner than a post-hoc "add dramatic flavor" pass.
2. No backwards-compatibility aliasing/shims — old dossiers fail validation and are manually migrated (intended).

## Verification Layers

1. `dramatic_core` frontmatter block present in `templates/character-dossier.md`, field names matching 001 → grep-proof + manual cross-check.
2. Six new body sections present before "Likely Story Hooks" → grep-proof.
3. Phase 0 `input_memorability_contract` + Phase 4b present → grep-proof.
4. New Phase 8 tests present; "Likely Story Hooks" stays non-story-system-specific → grep-proof + manual review.
5. Rule 2/3/7 conformance → FOUNDATIONS alignment check.

## Landed Changes

### 1. Phase 0 preservation contract (`references/phase-0-normalize-brief.md`)

Added the NCP preservation contract path: when `character_brief_path` is an NCP card carrying `memorability_profile`, Phase 0 extracts it into `input_memorability_contract` (`source_proposal_id`, `preserved_essence[]`, `protagonist_grade_engine{}`, `flattening_forbidden_without_user_approval: true`). The nested `voice_under_pressure` keys match the live NCP template (`lying`, `begging`, `threatening`, `grieving_or_hiding_ignorance`).

### 2. Phase 4b deepening/preservation (`references/phases-1-6-character-construction.md`)

Inserted Phase 4b after Phase 4: preserve NCP `memorability_profile` if present, else derive `dramatic_core`; convert contradiction→behavior, shame→self-mythology, desire→appetite, embedding→relational charge, voice→pressure speech; add at least 3 signature scene behaviors from body/work/status/fear/appetite/institution.

### 3. SKILL.md flow + dossier template (`SKILL.md`, `templates/character-dossier.md`)

Added Phase 4b to the flow and anti-flattening tradeoff-surfacing at Phase 9. Added required `dramatic_core` frontmatter (engine fields; `signature_scene_behaviors` at least 3; `pressure_behavior` 5 keys; `voice_under_pressure` 4 keys; `relational_charge` at least 1) and the six body sections (`## Protagonist-Grade Core`, `## Pressure Behavior`, `## Self-Mythology and Blind Spots`, `## Relational Charge`, `## Moral and Psychological Edge`, `## Signature Scene Behavior`) before "Likely Story Hooks".

### 4. Phase 8 tests (`references/phase-8-validation-tests.md`)

Expanded Phase 8 from 10 to 18 tests: `dramatic_core` required + complete; wound world-produced; contradiction behavioral + recurrent; pressure behaviors distinct; relational charge has need + harm; voice-under-pressure passes swap test; if NCP source, dossier preserves/names any altered element; no story-system-specific fields.

### 5. Same-skill governance reference (`references/governance-and-foundations.md`)

Updated the same-skill schema/body-section summary and Rule 2 phase mapping so governance guidance no longer describes the pre-`dramatic_core` CHAR shape.

## Files to Touch

- `.claude/skills/character-generation/SKILL.md` (modify)
- `.claude/skills/character-generation/references/phase-0-normalize-brief.md` (modify)
- `.claude/skills/character-generation/references/phases-1-6-character-construction.md` (modify)
- `.claude/skills/character-generation/references/phase-8-validation-tests.md` (modify)
- `.claude/skills/character-generation/templates/character-dossier.md` (modify)
- `.claude/skills/character-generation/references/governance-and-foundations.md` (modify — same-seam schema/body list and Rule 2 phase mapping)

## Out of Scope

- The shared reference (001) and `propose-new-characters` (`archive/tickets/SPEC52PROGRACHA-002.md`).
- `character-frontmatter.schema.json` / structural validator (005/006) — this ticket emits the dossier shape; the schema enforces it.
- Any story-system-specific field (arc beat, act position, plot destiny, companion quest); "Likely Story Hooks" stays a pressure-surface description.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "dramatic_core" .claude/skills/character-generation/templates/character-dossier.md` returns the frontmatter block.
2. `grep -nE "## Protagonist-Grade Core|## Pressure Behavior|## Signature Scene Behavior" .claude/skills/character-generation/templates/character-dossier.md` returns the six sections.
3. `grep -n "input_memorability_contract" .claude/skills/character-generation/references/phase-0-normalize-brief.md` returns the contract.
4. Manual contract review confirms the NCP preservation contract, Phase 4b, Phase 8 tests, Phase 9 anti-flattening summary, and dossier template preserve load-bearing memorability elements and surface canon-forced flattening before approval.

### Invariants

1. `dramatic_core` field names match the shared reference (001) and NCP `memorability_profile` from `archive/tickets/SPEC52PROGRACHA-002.md` exactly.
2. No story-system-specific fields are added; `branching-story-bootstrap` CHAR-id resolution is unaffected.
3. The Phase 7 Mystery Reserve firewall is unchanged (Rule 7).

## Test Plan

### New/Modified Tests

1. `.claude/skills/character-generation/references/phase-8-validation-tests.md` — adds the `dramatic_core` + anti-flattening validation tests (skill-internal test list).

### Commands

1. `grep -nE "dramatic_core|## Protagonist-Grade Core|input_memorability_contract" .claude/skills/character-generation/templates/character-dossier.md .claude/skills/character-generation/references/phase-0-normalize-brief.md`
2. `grep -nE "Phase 4b|anti-flattening|all 18 tests|dramatic_core" .claude/skills/character-generation/SKILL.md .claude/skills/character-generation/references/phases-1-6-character-construction.md .claude/skills/character-generation/references/phase-8-validation-tests.md .claude/skills/character-generation/references/governance-and-foundations.md`
3. Manual contract review: compare `dramatic_core` fields and preservation/anti-flattening language against `.claude/skills/_shared-references/protagonist-grade-character-engine.md`, SPEC-52 Phase 4, and `docs/HARD-GATE-DISCIPLINE.md` validation-test discipline.

## Outcome

Completed: 2026-05-20

Revised `character-generation` so CHAR dossiers now carry the protagonist-grade engine as first-class output. The skill now extracts NCP `memorability_profile` into an `input_memorability_contract`, runs Phase 4b to preserve or derive `dramatic_core`, emits the six protagonist-grade body sections before `Likely Story Hooks`, runs 18 Phase 8 validation tests, and surfaces anti-flattening tradeoffs in the Phase 9 deliverable before HARD-GATE approval.

## Verification Result

1. `grep -nE "dramatic_core|## Protagonist-Grade Core|input_memorability_contract" .claude/skills/character-generation/templates/character-dossier.md .claude/skills/character-generation/references/phase-0-normalize-brief.md` — passed.
2. `grep -nE "Phase 4b|anti-flattening|all 18 tests|dramatic_core" .claude/skills/character-generation/SKILL.md .claude/skills/character-generation/references/phases-1-6-character-construction.md .claude/skills/character-generation/references/phase-8-validation-tests.md .claude/skills/character-generation/references/governance-and-foundations.md` — passed.
3. Nested `voice_under_pressure` key alignment grep across the CHAR template, Phase 0 contract, Phase 4b guidance, and NCP template — passed; CHAR now uses `lying`, `begging`, `threatening`, and `grieving_or_hiding_ignorance`.
4. `git diff --check -- .claude/skills/character-generation/SKILL.md .claude/skills/character-generation/references/governance-and-foundations.md .claude/skills/character-generation/references/phase-0-normalize-brief.md .claude/skills/character-generation/references/phase-8-validation-tests.md .claude/skills/character-generation/references/phases-1-6-character-construction.md .claude/skills/character-generation/templates/character-dossier.md archive/tickets/SPEC52PROGRACHA-003.md` — passed.
5. Manual FOUNDATIONS/HARD-GATE review — passed; Rule 2 world-producedness, Rule 3 capability discipline, Rule 7 firewall preservation, and explicit approval-before-write semantics are preserved. The ticket adds validation rows but does not alter approval-token, submit, or write-order behavior.

## Deviations

- The drafted skill dry-run proof was replaced with grep-proof plus manual contract review because this Codex context has no executable runner for `.claude/skills/character-generation` that can produce an uncommitted dossier preview.
- `.claude/skills/character-generation/references/governance-and-foundations.md` was added to the landed file set after reassessment because it carried same-seam schema/body-section and Rule 2 phase guidance that would otherwise be stale.
