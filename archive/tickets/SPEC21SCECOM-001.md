# SPEC21SCECOM-001: Arc archetype library (NEW template)

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium-Large
**Engine Changes**: Yes — new template at `.claude/skills/storylet-pool-authoring/templates/arc-archetypes.md`; no impact on existing skill prose until consuming Phase rewrites land
**Deps**: `specs/SPEC-22-scene-commitment-arc-engine-and-cross-skill.md` (ARC_ARCHETYPES enum + COMMITMENT_CLASSES enum)

## Problem

The scene-commitment-arc rewrite of `storylet-pool-authoring` (per SPEC-21) needed an authoring artifact that the LLM proposers could consult when generating arc seeds and drafts. At intake, without an archetype library, Phase 2 seed generation had no structural reference point for arc shape, and JIT mode had no deterministic mapping from `commitment_class` to `arc_archetype`. The landed library is the seed of authoring quality — it gives the genre range of supported worlds (literary character drama, erotica, mystery, action) an initial closed-enum archetype basis while preserving future append-only expansion through SPEC-22's canonical vocabulary.

## Assumption Reassessment (2026-05-08)

1. The 20 archetype names in SPEC-21 §G match SPEC-22 Track 3 ARC_ARCHETYPES enum verbatim: `fragile_offer`, `bounded_question`, `confession_received`, `refusal_and_aftercare`, `practical_aid_attempt`, `withdrawal_without_abandonment`, `escalation_to_confrontation`, `concealment_under_pressure`, `third_party_intervention`, `investigation_followup`, `aftermath_processing`, `route_change`, `public_commitment`, `private_betrayal`, `intimacy_negotiation`, `boundary_setting`, `restitution_offered`, `silent_witness`, `forced_disclosure`, `pressure_release`. Verified against SPEC-22 lines 106-115.
2. The mapping table uses 20 commitment_class entries matching SPEC-22 Track 3 COMMITMENT_CLASSES enum (lines 83-104). Per `specs/SPEC-21-scene-commitment-arc-authoring.md` §G, the table is consumed by JIT mode for the deterministic `commitment_class → recommended_archetype` mapping.
3. Cross-skill boundary under audit: the template is consumed internally by `references/phase-2-generation-seeds.md` (seed brief generation), `references/phase-3-structured-drafting.md` (LLM prompt archetype excerpt), and the JIT mode template cascade in `SKILL.md`. The shared boundary is the archetype-name surface between this template and SPEC-22's `tools/world-index/src/public/canonical-vocabularies.ts` ARC_ARCHETYPES enum — the runtime `record_schema_compliance` validator extension (SPEC-22 Track 2) HARD-REJECTs unknown enum values, so any archetype name in this template that is not in the enum becomes a runtime gate failure.
4. Mismatch + correction: the SPEC-21 reassessment 2026-05-08 corrected the §G mapping table's `mirror_acknowledgment | bear_witness` typo to `mirror_acknowledgment | silent_witness` (`bear_witness` is a commitment_class, not a valid archetype per ARC_ARCHETYPES enum) and the §Risks JIT-fallback "generic `bear_witness` archetype" to "generic `silent_witness` archetype". The landed template reflects the corrected mapping verbatim: it has no `bear_witness` archetype heading and no right-hand mapping-table target value of `bear_witness`.
5. Live worktree boundary: `specs/SPEC-21-scene-commitment-arc-authoring.md` and sibling tickets `tickets/SPEC21SCECOM-002.md` through `tickets/SPEC21SCECOM-007.md` were already dirty or untracked at intake. This ticket used the live SPEC-21/SPEC-22 texts as authority but only owns the new `templates/arc-archetypes.md` file; sibling phase rewrites remain out of scope.

## Architecture Check

1. Centralizing the archetype library as a separate template (rather than inlining into Phase 3's reference doc) preserves the per-archetype detail (~30-50 lines + YAML sketches each, total 400-700 lines) without bloating the Phase 3 reference, and lets Phase 2 + JIT mode reference table-only excerpts independently of the full archetype prose. Per SPEC-21 §Risks #2, the LLM prompt strategy is "archetype excerpt is library-table-only (not full archetype prose)" — the file structure must support that excerpting.
2. No backwards-compatibility shims — this is a new template; v1 had no archetype library and no `arc_archetype` enum.

## Verification Layers

1. Archetype-name fidelity invariant → codebase grep-proof: every `## ` archetype heading in the template MUST match an entry in SPEC-22 §Track 3 ARC_ARCHETYPES enum (20 entries) — verified by `grep "^## " templates/arc-archetypes.md` and cross-reference against SPEC-22.
2. Mapping-table archetype validity invariant → manual cross-reference: every right-hand-side value in the `commitment_class → arc_archetype` mapping table MUST be present as a `## ` archetype heading in the same file.
3. Mapping-table commitment_class coverage invariant → grep-proof: the mapping table contains 20 data rows, one per COMMITMENT_CLASSES enum value.
4. FOUNDATIONS alignment check: this template does not introduce canon-impacting mechanisms — FND alignment is N/A at the template level. Rule 11 leverage discipline lands in SPEC21SCECOM-006's Phase 4 Gate 14, not here.

## Landed Changes

### 1. Created `.claude/skills/storylet-pool-authoring/templates/arc-archetypes.md`

Per SPEC-21 §G, the template now has the following structure:

- **File preamble**: purpose statement, structure summary, and extension policy citing SPEC-22 append-only authorial change to `canonical-vocabularies.ts`.
- **20 archetype entries**: one `## <archetype_name>` heading per SPEC-22 `ARC_ARCHETYPES` value, in SPEC-21 order, followed by structured prose and a YAML sketch naming entry pressure, value delta target, beat plan, execution envelope, stop policy, effect model, and native exit seeds.
- **Mapping table** (`# Mapping table (used by JIT mode)`): `commitment_class -> recommended arc_archetype`, with 20 rows covering all `COMMITMENT_CLASSES` values and the reassessment corrections applied verbatim: `bear_witness -> silent_witness` and `mirror_acknowledgment -> silent_witness`.

The landed library is 523 lines, within the ~400-700 line target from SPEC-21 §G.

## Files to Touch

- `.claude/skills/storylet-pool-authoring/templates/arc-archetypes.md` (new)

## Out of Scope

- Updates to `tools/world-index/src/public/canonical-vocabularies.ts` (owned by SPEC-22 Track 3)
- Updates to `.claude/skills/storylet-pool-authoring/SKILL.md` to reference this template (owned by SPEC21SCECOM-007)
- Updates to `references/phase-2-generation-seeds.md` and `references/phase-3-structured-drafting.md` to consume this template (owned by SPEC21SCECOM-004 and SPEC21SCECOM-005)
- Beyond-20 archetype expansion (per SPEC-21 §Out of Scope: append-only authorial change, no spec required)

## Acceptance Criteria

### Tests That Must Pass

1. `grep -c "^## " .claude/skills/storylet-pool-authoring/templates/arc-archetypes.md` returns 20 (one heading per archetype).
2. Every archetype heading in the file appears in SPEC-22 §Track 3 `ARC_ARCHETYPES` enum.
3. Mapping table has 20 data rows, one per `COMMITMENT_CLASSES` value: `awk '/^\| commitment_class/,0' .claude/skills/storylet-pool-authoring/templates/arc-archetypes.md | grep -c "^|"` returns 22 (1 header + 1 separator + 20 rows).
4. `grep " bear_witness " .claude/skills/storylet-pool-authoring/templates/arc-archetypes.md` returns only the left-hand `commitment_class` row `| bear_witness | silent_witness |`, never a heading or right-hand archetype target.

### Invariants

1. Every archetype heading is a member of SPEC-22 §Track 3 ARC_ARCHETYPES (closed enum, 20 values)
2. Mapping table covers all 20 COMMITMENT_CLASSES (no gaps in the left-hand column)
3. No archetype name appears in the right-hand column that is not in the closed enum (would be HARD-REJECTed at runtime by SPEC-22's `record_schema_compliance` validator extension)

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is grep-based per Acceptance Criteria above. The skill dry-run that exercises this template (Phase 2 seed generation in storylet-pool-authoring) lands when SPEC21SCECOM-004 implements the consumer.

### Commands

1. `wc -l .claude/skills/storylet-pool-authoring/templates/arc-archetypes.md` (returned 523 lines; within the 400-700 line target)
2. `grep -c "^## " .claude/skills/storylet-pool-authoring/templates/arc-archetypes.md` (returned 20 archetype headings)
3. `awk '/^\| commitment_class/,0' .claude/skills/storylet-pool-authoring/templates/arc-archetypes.md | grep -c "^|"` (returned 22 mapping-table rows)

## Outcome

Completed 2026-05-08. Added the new `storylet-pool-authoring` arc archetype library template with 20 SPEC-22-aligned archetype headings, per-archetype structured prose/YAML sketches, and a complete 20-row JIT mapping table from `COMMITMENT_CLASSES` to recommended `ARC_ARCHETYPES`.

## Verification Result

1. `wc -l .claude/skills/storylet-pool-authoring/templates/arc-archetypes.md` -> 523 lines.
2. `grep -c '^## ' .claude/skills/storylet-pool-authoring/templates/arc-archetypes.md` -> 20.
3. `awk '/^\| commitment_class/,0' .claude/skills/storylet-pool-authoring/templates/arc-archetypes.md | grep -c '^|'` -> 22.
4. `grep ' bear_witness ' .claude/skills/storylet-pool-authoring/templates/arc-archetypes.md` -> only `| bear_witness | silent_witness |`.
5. Manual cross-reference: the 20 `##` headings match SPEC-22 §Track 3 `ARC_ARCHETYPES` exactly, and every right-hand mapping-table value is one of those headings.

## Deviations

- None. The ticket remained bounded to the new template. Parent `SKILL.md`, phase references, `storylet-record.yaml` examples, and `storylet-batch-manifest.md` remain owned by sibling tickets.
