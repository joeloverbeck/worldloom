# SPEC22SCECOM-011: branching-story-health-audit v2 alignment: `audit_focus` + 3 sub-checks + Phase 4 closure walk + Phase 7 self-check + RSP card

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — modifies `.claude/skills/branching-story-health-audit/SKILL.md`, health-audit templates, and the `storylet-pool-authoring` RSP consumer schema reference. No code changes.
**Deps**: archive/tickets/SPEC22SCECOM-005.md, archive/tickets/SPEC22SCECOM-006.md, archive/tickets/SPEC22SCECOM-008.md

## Problem

At intake, SPEC-22 §Track 4's branching-story-health-audit deliverable still needed to extend the SAU report with 3 new metric sections (Choice Cadence, Arc Conformance, Commitment-Class Coverage), extend the audit_focus enum with 3 new values, extend Pre-flight to whole-class load ARC_TRACE records via `mcp__worldloom__list_records`, extend the Phase 4 recursive reference closure walk to ARC_TRACE references, extend Phase 7 self-check structural floors with ARC_TRACE evidence-alignment and envelope-violation severity, extend `choice_pair_distance` for v2 strong-axis collective difference, extend `choice_continuation_capacity` for v2 CHC → arc references, and extend the RSP card schema with `target_commitment_class` + `target_arc_archetype`.

## Assumption Reassessment (2026-05-08)

1. `.claude/skills/branching-story-health-audit/SKILL.md` exists. The live `audit_focus` argument enum currently has **21 values** (including `flagged_pages_priority` and `all`); the 3 new values bring it to 24. SPEC-22's historical "22-value" statement was stale against the live skill.
2. Phase 3 Coverage Analysis section exists with sub-checks including `mystery_firewall`, `prose_ledger_consistency`, `choice_pair_distance`, `choice_continuation_capacity` (verified). Phase 4 has "Cross-Branch Reference Closure Leakage (Recursive)" walking story-local IDs (OBL.dependent_facts[], CHC.continuation_capacity.valid_seed_storylets[], etc.). Phase 7 has 11 self-check tests (per SPEC-22 §Track 4, growing to 13 with the two new structural-floor checks).
3. Templates: `templates/remediation-storylet-proposal-card.md` (the spec's "or equivalent" cushion accepts the actual filename, which differs from the spec's `rsp-card.md` shorthand). `templates/story-audit-report.md` exists for the SAU report shape.
4. **Cross-skill boundary under audit**: health-audit consumes (a) v2 validators (005) — Phase 7 self-check structural floors cite `arc_trace_evidence_alignment` + `arc_envelope_conformance` failure modes; (b) canonical-vocabularies (archive/tickets/SPEC22SCECOM-006.md) — RSP card schema's `target_commitment_class` + `target_arc_archetype` use the closed enums; (c) MCP retrieval (008) — Pre-flight uses `list_records('arc_trace_record', story_slug, include_full_body=true)` to whole-class load traces. No cross-skill cascade beyond these consumer dependencies.
5. **FOUNDATIONS Rule 7 (Preserve Mystery Deliberately)** restated: Phase 7 self-check structural floor for `arc_envelope_conformance` HARD-REJECTs ARC_TRACE entries with high-severity `mystery_preservation.forbidden_resolutions[]` violations — preserves Mystery Reserve firewall at audit time as well as at canonical-record-time (005).
6. (HARD-GATE / canon-write ordering): N/A — health-audit produces SAU reports + remediation proposals; no canon mutation.
7. (Schema extension): RSP card schema additive (new fields `target_commitment_class` + `target_arc_archetype` + `sketch_arc_contract` + `sketch_dramatic_unit`). Existing audit reports under `worlds/<slug>/stories/<slug>/audits/SAU-NNNN/remediation-storylet-proposals/` may carry RSP cards without the new fields — those are historical records preserved as-is per SPEC-22 §Risks.
8. **Forbidden-status M (Mystery Reserve)** firewall preserved through the existing Phase 4 recursive walk extension; no silent MR resolutions admitted via ARC_TRACE references.
9. Same-seam consumer parity: `storylet-pool-authoring` Phase 1/2 references already consumed the new RSP arc fields, but `references/pre-flight-and-prerequisites.md` still validated only the four older target fields. This ticket absorbed that one-line consumer schema parity edit so the RSP template and parse-time validation remain aligned.
10. Because the consumer parity edit touches a content-generating skill's pre-flight validation path, `docs/HARD-GATE-DISCIPLINE.md` was read. The change does not weaken a gate or approval checkpoint; it tightens schema validation to match the new required RSP fields.

## Architecture Check

1. Cohesive single-skill update — all health-audit phase + template changes land together so the SAU report shape, Phase 3 sub-check enumeration, Phase 4 closure walk, Phase 7 self-check floors, and RSP card schema remain internally consistent.
2. Each new sub-check (`choice_cadence`, `arc_conformance`, `commitment_class_coverage`) follows the existing audit_focus narrowing pattern — when narrowed to a single category, Phases 3-5 skip non-matching sub-checks; Phase 4's snapshot-integrity and recursive-reference-closure checks always run.
3. No backwards-compatibility aliasing — v1 beat-cadence metrics dropped wholesale; arc-unit metrics replace them.

## Verification Layers

1. `audit_focus` enum has 24 values (21 existing + 3 new) → grep audit_focus enum in SKILL.md.
2. Phase 3 Coverage Analysis includes 3 new sub-checks → grep `choice_cadence`, `arc_conformance`, `commitment_class_coverage` in SKILL.md Phase 3 section.
3. Pre-flight loads ARC_TRACE via `list_records` → grep `list_records.*arc_trace_record` in SKILL.md Pre-flight section.
4. Phase 4 recursive walk extends to ARC_TRACE references → grep `ARC_TRACE.created_at_page`, `ARC_TRACE.arc_realized`, `ARC_TRACE.observed_actions[].actor`, `ARC_TRACE.observed_actions[].target`, `ARC_TRACE.effect_evidence[].effect_ref`, `ARC_TRACE.stop_condition_hit.id` in SKILL.md Phase 4.
5. Phase 7 self-check has 13 tests (was 11; growth verified) — grep self-check enumeration count.
6. RSP card schema extends with new fields → grep `target_commitment_class`, `target_arc_archetype`, `sketch_arc_contract`, `sketch_dramatic_unit` in `templates/remediation-storylet-proposal-card.md`.
7. Choice cadence metrics in arc-units only — no word-count metrics in SAU choice-cadence section (per Rule 11 + SPEC-22 reassessment).
8. FOUNDATIONS Rule 7 alignment: Phase 7 self-check structural floor catches high-severity envelope violations.

## Landed Changes

### 1. `audit_focus` argument enum extends with 3 new values

In SKILL.md frontmatter argument enum: added `arc_conformance`, `choice_cadence`, `commitment_class_coverage`. Each follows existing focus-narrowing semantics.

### 2. Pre-flight World-State Prerequisites: ARC_TRACE whole-class load

In SKILL.md Pre-flight section: added loading all ARC_TRACE records for audited branches via `mcp__worldloom__list_records(world_slug, record_type='arc_trace_record', story_slug=<story_slug>, include_full_body=true)`. Whole-class load is bounded by `story_slug`; `include_full_body=true` is required for Phase 3's arc-conformance sub-check.

### 3. Phase 3 Coverage Analysis: 3 new sub-checks

- **Choice Cadence** (`audit_focus=choice_cadence`): per audited branch, compute mean arcs between menus (count of consecutive non-menu-emitting pages, per `narrative_point_classification ∈ {CONTINUE_ARC, CONTINUE_ONLY_PAUSE}`, in arc-units), counts of CONTINUE_ONLY_PAUSE / CONTINUE_ARC / INTERRUPT_HINGE pages, ratio of menu-emitting pages to total pages. Findings: mean arcs between menus < `STORY_KERNEL.cadence_policy.max_arcs_without_menu_soft / 2` → `warning` (menu-thrash); ratio of menu-emitting pages > 70% AND mean arcs between menus < 1.5 → `warning` (beat-cadence regression). Word-count metrics forbidden per Rule 11.
- **Arc Conformance** (`audit_focus=arc_conformance`): per audited branch, % of pages whose ARC_TRACE shows `semantic_critic_verdict.status == pass`; per-violation breakdown of `possible_violations[]` grouped by `envelope_item`; mean `realized_beats[]` realization rate. Findings: any page with `semantic_critic_verdict.status == reject_arc` → `warning`; any envelope-violation `severity: high` → `error`; cumulative envelope-violation `severity: medium` count > 30% of pages → `warning`.
- **Commitment-Class Coverage** (`audit_focus=commitment_class_coverage`): per audited branch, distribution of `arc.arc_contract.commitment_class` across realized arcs. Findings: gaps (commitment_classes appearing in 0 of bundle's realized arcs) → `info`; over-representation (any single commitment_class > 40% of pages) → `warning` (commitment-monoculture).

### 4. Phase 7 Self-Check structural-floor extensions (11 → 13 tests)

Add two new tests:

- ARC_TRACE evidence-alignment failures (any `effect_evidence[].effect_ref` outside variants[<applied>].required_effects[] range; any evidence_span outside prose byte-range) → ALWAYS `error`. Self-check test: "ARC_TRACE evidence-alignment findings cite trace id, offending evidence index, byte-range/variant-index error, severity is `error`."
- High-severity envelope violations (any `possible_violations[].severity: high`) → ALWAYS `error`. Medium-severity violations are `warning` by default; low-severity are `info`. Self-check test: "Envelope-violation findings cite page id, trace id, offending envelope_item, prose evidence_span, severity, and severity classification matches the floors above."

### 5. Phase 4 Cross-Branch Reference Closure Leakage (Recursive) extends to ARC_TRACE references

Add ARC_TRACE references to the existing recursive walk:

- `ARC_TRACE.created_at_page` → must satisfy existing PG branch_path rule
- `ARC_TRACE.arc_realized` → SLT id; satisfies existing SLT global-or-branch-local rule
- `ARC_TRACE.observed_actions[].actor` → STENT id; satisfies existing STENT rule
- `ARC_TRACE.observed_actions[].target` → STENT/STOBJ/STLOC id
- `ARC_TRACE.effect_evidence[].effect_ref` → variant index in arc.effect_model.variants[<applied>].required_effects[] (in-range)
- `ARC_TRACE.stop_condition_hit.id` → must reference a real `arc.stop_policy.normal_exits[N].id` or `interrupt_before[N].id`

### 6. Existing `choice_pair_distance` sub-check extends for v2 strong-axis collective difference

Under v2 (per archived SPEC-19 §B CHC schema): the menu's surviving CHCs MUST collectively cover ≥2 distinct `choice_worthiness.strong_axes` entries. Two CHCs that both engage only `relationship_trajectory` share the same axis profile; the menu fails the strong-axis-collective-difference check. Findings cite page id, menu's strong_axes union, rule violation, severity (`warning` by default; `error` when available choices collapse to a single strong-axis profile).

### 7. Existing `choice_continuation_capacity` sub-check extends for v2 CHC → arc references

Under v2: every CHC's `continuation_capacity.valid_seed_storylets[]` may name v2 SLT records. Verify named arc's `arc_contract.commitment_class` matches CHC's `commitment_class` field — mismatch → `warning`. Empty `valid_seed_storylets[]` AND empty `jit_shape_spec` AND empty native-seed reference is still the existing dead-end `error`.

### 8. RSP card schema extension

In `templates/remediation-storylet-proposal-card.md`: added header-block fields:

```yaml
target_commitment_class: <commitment_class enum>
target_arc_archetype: <arc_archetype enum>
sketch_arc_contract: >
sketch_dramatic_unit: >
```

The id class `RSP-NNNN` is preserved (no rename). The card body's free-form rationale section preserves its existing structure; the new fields are an additive header block. The `storylet-pool-authoring` pre-flight schema checklist now recognizes these fields as part of the mirrored RSP consumer schema.

### 9. SAU report shape: 3 new sections

In SKILL.md SAU report section and `templates/story-audit-report.md`: added `Choice Cadence`, `Arc Conformance`, `Commitment-Class Coverage` sections per the metrics described in §3 above.

## Files to Touch

- `.claude/skills/branching-story-health-audit/SKILL.md` (modify — audit_focus enum + Pre-flight + Phase 3 sub-checks + Phase 4 closure walk + Phase 7 self-check + existing-sub-check extensions + SAU report sections)
- `.claude/skills/branching-story-health-audit/templates/remediation-storylet-proposal-card.md` (modify — RSP card schema extension)
- `.claude/skills/branching-story-health-audit/templates/story-audit-report.md` (modify — SAU shape)
- `.claude/skills/storylet-pool-authoring/references/pre-flight-and-prerequisites.md` (modify — same-seam RSP consumer schema parity)
- `specs/SPEC-22-scene-commitment-arc-engine-and-cross-skill.md` (modify — same-seam count/prose truthing)
- `specs/IMPLEMENTATION-ORDER.md` (modify — same-seam pilot metric truthing)
- `archive/tickets/SPEC22SCECOM-011.md` (modify — reassessment, closeout truthing, and archival)

## Out of Scope

- Bootstrap alignment (in 010)
- Promotion alignment (in 012)
- Page-cycle record-schemas (in 013)
- Migration: red-bunny discard (in 014)
- Validator implementations (in 003/004/005)
- Canonical vocabularies (in archive/tickets/SPEC22SCECOM-006.md)
- MCP retrieval (in 008)
- Same downstream Out of Scope as 001/002

## Acceptance Criteria

### Tests That Must Pass

1. `audit_focus` enum has 24 values (21 existing + `arc_conformance` + `choice_cadence` + `commitment_class_coverage`) → grep enum in SKILL.md.
2. Pre-flight loads ARC_TRACE via `list_records` (grep returns ≥1 match in Pre-flight section).
3. Phase 3 has 3 new sub-checks, each with documented metric formulas + finding severities.
4. Phase 4 recursive walk lists 6 new ARC_TRACE reference checks (created_at_page / arc_realized / observed_actions.actor / observed_actions.target / effect_evidence.effect_ref / stop_condition_hit.id).
5. Phase 7 self-check has 13 tests (was 11; +2 for ARC_TRACE evidence-alignment + envelope-violation severity).
6. RSP card schema includes 4 new fields (target_commitment_class, target_arc_archetype, sketch_arc_contract, sketch_dramatic_unit).
7. `grep -nE 'mean words per arc|words between menus|words per arc-page' .claude/skills/branching-story-health-audit/SKILL.md` returns 0 active-prose matches (audit-trail rejection prose acceptable).

### Invariants

1. Health-audit remains a Category 2c story-pipeline skill; FOUNDATIONS Rule 7 preserved through Phase 7 self-check structural floor for high-severity envelope violations.
2. Word-count metrics are forbidden from SAU report's choice-cadence section (Rule 11).
3. RSP card id-class `RSP-NNNN` is preserved; new fields are additive header-block.
4. Forbidden-status M (Mystery Reserve) firewall preserved through Phase 4 recursive walk extension.

## Test Plan

### New/Modified Tests

`None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -nE 'arc_conformance|choice_cadence|commitment_class_coverage' .claude/skills/branching-story-health-audit/SKILL.md`
2. `grep -nE 'list_records.*arc_trace_record' .claude/skills/branching-story-health-audit/SKILL.md`
3. `grep -nE 'target_commitment_class|target_arc_archetype|sketch_arc_contract|sketch_dramatic_unit' .claude/skills/branching-story-health-audit/templates/ .claude/skills/storylet-pool-authoring/references/pre-flight-and-prerequisites.md`
4. `! grep -nE 'mean words per arc|words between menus|words per arc-page' .claude/skills/branching-story-health-audit/SKILL.md`
5. Manual review of SAU report shape against SPEC-22 §Track 4.

## Outcome

Completed: 2026-05-09.

Implemented the health-audit v2 alignment for SPEC-22 Track 4:

1. Extended `audit_focus` to the live 24-value set and wired the three new focus categories into the skill's inputs, process flow, Phase 3 checks, and SAU report shape.
2. Added story-scoped ARC_TRACE whole-class loading, Phase 3 choice-cadence / arc-conformance / commitment-class-coverage checks, Phase 4 ARC_TRACE recursive reference closure, and Phase 7 evidence/envelope severity floors.
3. Extended choice pair-distance for v2 strong-axis collective difference and continuation-capacity for CHC-to-arc commitment-class matching.
4. Extended the RSP card template and `storylet-pool-authoring` pre-flight consumer schema reference with `target_commitment_class`, `target_arc_archetype`, `sketch_arc_contract`, and `sketch_dramatic_unit`.
5. Truthed the same-seam SPEC-22 and implementation-order prose to the live 24-value enum count and arc-unit-only cadence metrics.

## Verification Result

1. `node -e "const fs=require('fs');const m=fs.readFileSync('.claude/skills/branching-story-health-audit/SKILL.md','utf8').match(/audit_focus[\s\S]*?description: \"One of: ([^\"]+)/); const vals=m[1].replace(/\. Default: all\.$/,'').split('|').map(s=>s.trim()); console.log(vals.length, vals.join(','));"` — passed; printed 24 values.
2. `grep -nE 'arc_conformance|choice_cadence|commitment_class_coverage' .claude/skills/branching-story-health-audit/SKILL.md` — passed; finds the new enum/focus categories.
3. `grep -nE 'list_records.*arc_trace_record' .claude/skills/branching-story-health-audit/SKILL.md` — passed; finds the pre-flight ARC_TRACE whole-class load.
4. `grep -nE 'target_commitment_class|target_arc_archetype|sketch_arc_contract|sketch_dramatic_unit' .claude/skills/branching-story-health-audit/templates/remediation-storylet-proposal-card.md .claude/skills/branching-story-health-audit/templates/story-audit-report.md .claude/skills/storylet-pool-authoring/references/pre-flight-and-prerequisites.md` — passed; finds the RSP fields in the producer template and consumer schema reference.
5. `! grep -nE 'mean words per arc|words between menus|words per arc-page' .claude/skills/branching-story-health-audit/SKILL.md` — passed; no active health-audit skill prose uses the forbidden word-count cadence metrics.
6. `grep -nE 'ARC_TRACE\.created_at_page|ARC_TRACE\.arc_realized|ARC_TRACE\.observed_actions\[\]\.actor|ARC_TRACE\.observed_actions\[\]\.target|ARC_TRACE\.effect_evidence\[\]\.effect_ref|ARC_TRACE\.stop_condition_hit\.id' .claude/skills/branching-story-health-audit/SKILL.md` — passed; finds all six ARC_TRACE recursive-closure references.
7. `grep -nE '^[0-9]+\. ' .claude/skills/branching-story-health-audit/SKILL.md` — passed by manual classification; the Phase 7 self-check block lists tests 1-13.
8. `git diff --check` — passed.
9. Manual review against `docs/FOUNDATIONS.md` and `docs/HARD-GATE-DISCIPLINE.md` — passed; health-audit remains read-only against story state, writes only audit artifacts after user approval, and preserves the Rule 7 mystery firewall through high-severity envelope violation floors.

## Deviations

- SPEC-22's historical "22-value enum" statement was stale against the live health-audit skill. The landed enum has 24 values: 21 live values plus the 3 new SPEC-22 categories.
- Same-seam consumer parity added `.claude/skills/storylet-pool-authoring/references/pre-flight-and-prerequisites.md` to the file set, because the RSP card schema claims byte-for-byte parse-time consumer parity.
- `specs/IMPLEMENTATION-ORDER.md` was updated only for the same-seam pilot metric wording: choice cadence is arc-unit-only, not word-count based.
