# COMTAX-003: Update story skills for commitment-family/class/detail taxonomy

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — updates storylet-pool-authoring, branching-story-page-cycle, branching-story-bootstrap, branching-story-health-audit, templates, and reports to author and audit `commitment_family`, closed base `commitment_class`, and optional `commitment_detail`.
**Deps**: `archive/tickets/COMTAX-001-commitment-family-and-expanded-base-taxonomy.md`, `archive/tickets/COMTAX-002-story-record-commitment-route-fields-and-red-bunny-validity.md`

## Problem

At intake, after archived COMTAX-001 and completed COMTAX-002, the machine contract supported:

```yaml
commitment_family: inquiry_discovery
commitment_class: ask_one_bounded_question
commitment_detail: ask_where_the_knife_came_from
```

Before this ticket, the active story skills still instructed operators and LLMs to think in terms of a single closed `commitment_class`. Without skill updates, new records could either omit the new family/detail fields or misuse `commitment_class` as an open story-specific label, recreating the problem the taxonomy change was meant to solve.

This ticket owns the prompt/procedure layer.

## Assumption Reassessment (2026-05-12)

1. Current storylet-pool authoring references use `commitment_class` as the single coverage and seed-selection axis, e.g. `.claude/skills/storylet-pool-authoring/references/phase-1-coverage-diagnosis.md`, `phase-2-generation-seeds.md`, `phase-3-structured-drafting.md`, `phase-4-5-canon-safety-checks.md`, and `templates/storylet-record.yaml`.
2. Current page-cycle write-in handling classifies free-form `manual_action_text` into exactly one closed `commitment_class` in `.claude/skills/branching-story-page-cycle/references/phase-1-choice-resolution.md`.
3. Current bootstrap and health-audit logic uses commitment-class coverage and target fields without family/detail layers.
4. Shared boundary under audit: skill-generated CHC, SLT, and RSP records must match COMTAX-002 record schemas and COMTAX-001 vocabulary semantics.
5. Red-bunny preservation: COMTAX-002 chose derivation compatibility, so skills must be able to read existing `red-bunny` records that lack explicit `commitment_family` or `commitment_detail`. Skills must not require prose/content rewrites.
6. HARD-GATE / validation-signal check: `docs/HARD-GATE-DISCIPLINE.md` was read because bootstrap Phase 9 validation-gate prose is a content-generating skill gate surface. The owned change is route-taxonomy wording only; it does not weaken approval, submit, pre-apply validation, or Mystery Reserve firewall behavior.
7. Same-seam file-list correction: `.claude/skills/branching-story-bootstrap/SKILL.md` also summarizes storylet-pool coverage and must move with the bootstrap reference/template updates.
8. Mismatch + correction: do not follow the research report’s field naming where open `commitment_class` replaces the base key. In active skills, `commitment_class` remains closed/base; `commitment_detail` is the story-specific label.

## Architecture Check

1. Updating skills after schemas prevents schema/tool drift: LLM operators get the same field semantics the engine validates.
2. `commitment_family` should drive broad coverage and routing summaries; `commitment_class` should drive base-class continuation matching and diversity; `commitment_detail` should provide precision but not be a hard join key.
3. No backwards-compatibility aliasing. Skills must not emit `base_commitment_class`.

## Verification Layers

1. Storylet seed/draft templates emit all route fields where required by COMTAX-002 -> grep/manual review.
2. Page-cycle write-in classification produces family + base class + optional detail, with dominant scene-strategy guidance -> grep/manual review.
3. Bootstrap diversity and health-audit coverage distinguish family coverage from base-class coverage -> grep/manual review.
4. RSP card guidance uses `target_commitment_family`, `target_commitment_class`, and optional `target_commitment_detail` consistently -> grep/manual review.
5. Red-bunny remains a valid live-corpus proof lane through COMTAX-002 validation command -> validator proof.

## Landed Changes

### 1. Storylet-pool authoring

Updated `SKILL.md`, Phase 1-5 references, `templates/storylet-record.yaml`, and `templates/storylet-batch-manifest.md` so diagnosis, seeds, SLT arc contracts, exit portfolios, batch manifests, diversity checks, and JIT/audit paths carry `commitment_family`, closed base `commitment_class`, and optional `commitment_detail`. Family and class are separate coverage axes; detail is optional precision and not a continuation key.

### 2. Branching story page-cycle

Updated Phase 1, Phase 4, Phase 8, and CHC schema references so structured choices and write-ins carry family/class/detail route fields. Arc selection remains keyed by closed base `commitment_class`; `commitment_family` is consistency/fallback metadata and `commitment_detail` is descriptive unless a future ticket adds detail-level matching. Write-in guidance now classifies by dominant scene strategy rather than surface verb.

### 3. Branching story bootstrap

Updated `SKILL.md`, Phase 6/8/9 references, and bootstrap templates so seed-pool sizing, validation gate 9, story kernel summaries, bundle index summaries, and PG-0001 CHC scaffolds distinguish family coverage from base-class coverage.

### 4. Branching story health audit

Updated health-audit procedure and report template so audit output reports commitment-route coverage, distinguishes family distribution from class distribution, validates CHC-to-SLT continuation on base class plus family consistency when explicit, and treats detail as diagnostic precision rather than a join key. The existing RSP card template already carried the COMTAX-002 fields and did not need a content change.

## Files to Touch

- `.claude/skills/storylet-pool-authoring/SKILL.md` (modify)
- `.claude/skills/storylet-pool-authoring/references/phase-1-coverage-diagnosis.md` (modify)
- `.claude/skills/storylet-pool-authoring/references/phase-2-generation-seeds.md` (modify)
- `.claude/skills/storylet-pool-authoring/references/phase-3-structured-drafting.md` (modify)
- `.claude/skills/storylet-pool-authoring/references/phase-4-5-canon-safety-checks.md` (modify)
- `.claude/skills/storylet-pool-authoring/templates/storylet-batch-manifest.md` (modify)
- `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` (modify)
- `.claude/skills/branching-story-page-cycle/references/phase-1-choice-resolution.md` (modify)
- `.claude/skills/branching-story-page-cycle/references/phase-4-storylet-and-mystery-authority.md` (modify)
- `.claude/skills/branching-story-page-cycle/references/phase-8-choice-generation.md` (modify)
- `.claude/skills/branching-story-page-cycle/references/record-schemas.md` (modify)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/phase-6-storylet-pool-seed.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/phase-8-choice-generation.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md` (modify)
- `.claude/skills/branching-story-bootstrap/templates/story-kernel.md` (modify)
- `.claude/skills/branching-story-bootstrap/templates/story-bundle-index.md` (modify)
- `.claude/skills/branching-story-bootstrap/templates/story-records.yaml` (modify)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)
- `.claude/skills/branching-story-health-audit/templates/story-audit-report.md` (modify)

## Out of Scope

- Canonical vocabulary implementation (COMTAX-001).
- Validator/schema implementation (COMTAX-002).
- Editing `red-bunny` content directly. COMTAX-002 chose derivation compatibility, so this ticket must not require story-content rewrites.
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
4. `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --story red-bunny`

## Outcome

Completed on 2026-05-12.

The four story-pipeline skill families now describe and template the COMTAX route shape consistently: `commitment_family` for broad coverage/routing summaries, closed base `commitment_class` for deterministic continuation matching, and optional open `commitment_detail` for story-specific precision. The implementation did not add `base_commitment_class`, did not add detail-level routing, and did not edit `red-bunny` story content.

## Verification Result

Passed:

1. `rg -n "base_commitment_class" .claude docs tools reports` — hits are historical research-report references plus one explicit active-skill "do not emit" guard in `storylet-pool-authoring/references/phase-2-generation-seeds.md`; active templates do not emit it.
2. `rg -n "commitment_family|commitment_detail" .claude/skills/storylet-pool-authoring .claude/skills/branching-story-page-cycle .claude/skills/branching-story-bootstrap .claude/skills/branching-story-health-audit`
3. `git diff --check`
4. `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --story red-bunny` — 6 validators run, 3 skipped, 0 fail / 0 warn / 0 info.

Manual review:

1. Storylet-pool authoring route fields and diversity axes were updated across SKILL prose, Phase 1-5 references, SLT template, and batch manifest.
2. Page-cycle Path A/Path B routing and CHC schema references now carry family/class/detail while preserving `commitment_class` as the hard arc-selection key.
3. Bootstrap Phase 6/8/9 and templates now summarize family and class separately.
4. Health-audit coverage reports family and class distributions separately and keeps detail diagnostic only.

## Deviations

1. `.claude/skills/branching-story-health-audit/templates/remediation-storylet-proposal-card.md` was listed in the original plan, but COMTAX-002 had already updated it with `target_commitment_family`, `target_commitment_class`, and `target_commitment_detail`; this ticket left it unchanged after review.
