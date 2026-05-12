# COMTAX-003: Update story skills for commitment-family/class/detail taxonomy

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — updates storylet-pool-authoring, branching-story-page-cycle, branching-story-bootstrap, branching-story-health-audit, templates, and reports to author and audit `commitment_family`, closed base `commitment_class`, and optional `commitment_detail`.
**Deps**: `archive/tickets/COMTAX-001-commitment-family-and-expanded-base-taxonomy.md`, `tickets/COMTAX-002-story-record-commitment-route-fields-and-red-bunny-validity.md`

## Problem

After archived COMTAX-001 and active COMTAX-002, the machine contract will support:

```yaml
commitment_family: inquiry_discovery
commitment_class: ask_one_bounded_question
commitment_detail: ask_where_the_knife_came_from
```

The active story skills still instruct operators and LLMs to think in terms of a single closed `commitment_class`. Without skill updates, new records will either omit the new family/detail fields or misuse `commitment_class` as an open story-specific label, recreating the problem the taxonomy change is meant to solve.

This ticket owns the prompt/procedure layer.

## Assumption Reassessment (2026-05-12)

1. Current storylet-pool authoring references use `commitment_class` as the single coverage and seed-selection axis, e.g. `.claude/skills/storylet-pool-authoring/references/phase-1-coverage-diagnosis.md`, `phase-2-generation-seeds.md`, `phase-3-structured-drafting.md`, `phase-4-5-canon-safety-checks.md`, and `templates/storylet-record.yaml`.
2. Current page-cycle write-in handling classifies free-form `manual_action_text` into exactly one closed `commitment_class` in `.claude/skills/branching-story-page-cycle/references/phase-1-choice-resolution.md`.
3. Current bootstrap and health-audit logic uses commitment-class coverage and target fields without family/detail layers.
4. Shared boundary under audit: skill-generated CHC, SLT, and RSP records must match COMTAX-002 record schemas and COMTAX-001 vocabulary semantics.
5. Red-bunny preservation: skills must be able to read existing `red-bunny` records that lack explicit `commitment_family` or `commitment_detail` if COMTAX-002 chose derivation compatibility. If COMTAX-002 materialized fields, skills must still not require prose/content rewrites.
6. Mismatch + correction: do not follow the research report’s field naming where open `commitment_class` replaces the base key. In active skills, `commitment_class` remains closed/base; `commitment_detail` is the story-specific label.

## Architecture Check

1. Updating skills after schemas prevents schema/tool drift: LLM operators get the same field semantics the engine validates.
2. `commitment_family` should drive broad coverage and routing summaries; `commitment_class` should drive base-class continuation matching and diversity; `commitment_detail` should provide precision but not be a hard join key.
3. No backwards-compatibility aliasing. Skills must not emit `base_commitment_class`.

## Verification Layers

1. Storylet seed/draft templates emit all route fields where required by COMTAX-002 -> grep/manual review.
2. Page-cycle write-in classification produces family + base class + optional detail, with dominant scene-strategy guidance -> grep/manual review.
3. Bootstrap diversity and health-audit coverage distinguish family coverage from base-class coverage -> grep/manual review.
4. RSP card guidance uses `target_commitment_family`, `target_commitment_class`, and optional `target_commitment_detail` consistently -> grep/manual review.
5. Red-bunny remains a valid live-corpus proof lane through COMTAX-002 validation command -> referenced proof, not reimplemented here.

## What to Change

### 1. Storylet-pool authoring

Update:

- `SKILL.md`
- `references/phase-1-coverage-diagnosis.md`
- `references/phase-2-generation-seeds.md`
- `references/phase-3-structured-drafting.md`
- `references/phase-4-5-canon-safety-checks.md`
- `templates/storylet-record.yaml`
- `templates/storylet-batch-manifest.md`

Required semantic updates:

- Diagnosis matrix should include `commitment_family_distribution` and `commitment_class_distribution`.
- Seed shape should include `commitment_family`, `commitment_class`, and optional `commitment_detail`.
- Phase 3 should select the dominant scene-strategy commitment, not the surface verb.
- Diversity checks should use family and class separately: family for broad coverage, class for monoculture avoidance.
- `commitment_detail` is open and optional; it must never be used as the only continuation key.

### 2. Branching story page-cycle

Update:

- `references/phase-1-choice-resolution.md`
- `references/phase-4-storylet-and-mystery-authority.md`
- `references/phase-8-choice-generation.md`
- `references/record-schemas.md`

Required semantic updates:

- Path A carries CHC `commitment_family`, `commitment_class`, and optional `commitment_detail`.
- Path B write-in classification selects family + base class first, then optional detail.
- Arc selection filters should match by `commitment_class` and may use `commitment_family` as fallback or diagnostic; `commitment_detail` is descriptive unless a future ticket adds detail-level matching.
- Choice-generation instructions must avoid classifying by surface action when the dominant scene strategy differs.

### 3. Branching story bootstrap

Update:

- `references/phase-6-storylet-pool-seed.md`
- `references/phase-8-choice-generation.md`
- `references/phase-9-validation-gates.md`
- `templates/story-kernel.md`
- `templates/story-bundle-index.md`
- `templates/story-records.yaml`

Bootstrap should summarize available families and classes, not just classes.

### 4. Branching story health audit

Update:

- `SKILL.md`
- `templates/remediation-storylet-proposal-card.md`
- `templates/story-audit-report.md`

Health-audit should:

- Report family distribution and class distribution separately.
- Validate RSP target family/class consistency.
- Treat `target_commitment_detail` as optional story-specific precision.
- Preserve existing continuation-capacity checks by matching base `commitment_class`.

## Files to Touch

- `.claude/skills/storylet-pool-authoring/SKILL.md` (modify)
- `.claude/skills/storylet-pool-authoring/references/*.md` relevant to phases 1-5 (modify)
- `.claude/skills/storylet-pool-authoring/templates/*.md` and `templates/storylet-record.yaml` (modify)
- `.claude/skills/branching-story-page-cycle/references/*.md` relevant to phases 1, 4, 8, schemas (modify)
- `.claude/skills/branching-story-bootstrap/references/*.md` relevant to phases 6, 8, 9 (modify)
- `.claude/skills/branching-story-bootstrap/templates/*.md` / `templates/story-records.yaml` (modify)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)
- `.claude/skills/branching-story-health-audit/templates/*.md` (modify)

## Out of Scope

- Canonical vocabulary implementation (COMTAX-001).
- Validator/schema implementation (COMTAX-002).
- Editing `red-bunny` content directly, except if COMTAX-002 already chose a materialized migration and this ticket must adjust skill examples to match that shape.
- Adding detail-level routing.

## Acceptance Criteria

### Tests That Must Pass

1. `rg -n "base_commitment_class" .claude docs tools reports` returns only historical report references or explicit "do not use" prose; active skill templates do not emit it.
2. `rg -n "commitment_family|commitment_detail" .claude/skills/storylet-pool-authoring .claude/skills/branching-story-page-cycle .claude/skills/branching-story-bootstrap .claude/skills/branching-story-health-audit` shows all four skill families updated.
3. `git diff --check` passes for all touched skill/template files.
4. If COMTAX-002 provided a validation command for `red-bunny`, rerun it after skill edits if any templates/examples are consumed by validators.

### Invariants

1. `commitment_class` remains a closed base-class routing key in skill prose.
2. `commitment_detail` is optional and open, but never the only deterministic join key.
3. Skills classify by dominant scene strategy, not surface verb.
4. Existing `red-bunny` content is not rewritten by this ticket.

## Test Plan

### New/Modified Tests

1. None — skill/template/documentation ticket; verification is grep/manual review plus any live-corpus validation inherited from COMTAX-002.

### Commands

1. `rg -n "base_commitment_class" .claude docs tools reports`
2. `rg -n "commitment_family|commitment_detail" .claude/skills/storylet-pool-authoring .claude/skills/branching-story-page-cycle .claude/skills/branching-story-bootstrap .claude/skills/branching-story-health-audit`
3. `git diff --check`
4. `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --story red-bunny` if validator build artifacts are current and COMTAX-002 makes this command the live-corpus proof lane.
