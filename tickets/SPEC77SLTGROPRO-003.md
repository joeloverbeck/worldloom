# SPEC77SLTGROPRO-003: commitment-block-authoring Phase 4 amendment

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — amends `.claude/skills/commitment-block-authoring/SKILL.md` Phase 4 with new authoring preamble, per-field requirements for the new `grounding` sub-paths, and the inlined banned-phrase list reference
**Deps**: archive/tickets/SPEC77SLTGROPRO-001.md

## Problem

The commitment-block-authoring skill at `.claude/skills/commitment-block-authoring/SKILL.md` Phase 4 (block-shape authoring) currently produces SLT records that satisfy the schema but can omit `grounding` because the schema has not yet required it. Once SPEC77SLTGROPRO-001's schema change lands (Slice A) making `grounding.compatible_turn_drivers` and `grounding.reason_to_exist` required, every block authored by this skill must populate both. The skill needs (a) the authoring preamble explaining what `reason_to_exist` must name and which phrasings are structurally rejected, (b) per-field requirements for the two new sub-paths with concrete examples, and (c) the inlined banned-phrase list mirroring the validator's enforcement so authors see at authoring time what the validator will reject at validation time.

The reassessed SPEC-77 §3.2 relocated the authoring guideline from the shared-record-schemas surface (which is schema-only) into this skill's Phase 4 — this ticket lands that relocation.

## Assumption Reassessment (2026-05-23)

1. `.claude/skills/commitment-block-authoring/SKILL.md` exists at HEAD (verified during `/reassess-spec` session) with Phase 4 currently structured per the established skill template (Phase 4 begins around line 256). Phase 4's content describes batch-diversity validation; the authoring of individual blocks is at Phase 2 (line 180). The amendment for per-field grounding requirements lands at Phase 4 per SPEC-77 §3.3 (post-reassess-spec wording), positioning the new contract alongside the existing batch-diversity checks and authoring discipline that Phase 4 enforces.
2. SPEC-77 §3.3 (post-reassess-spec) specifies a Phase 4 preamble (the authoring guideline blockquote relocated from the original §3.2), per-field requirements for `grounding.compatible_turn_drivers[]` and `grounding.reason_to_exist`, and the 9-entry banned-phrase list with concrete examples (pursuit pattern, deadline pattern, runtime_jit). The banned-phrase list cross-references the utility at `tools/validators/src/structural/slt-grounding-utils.ts` (introduced by SPEC77SLTGROPRO-001) as the source-of-truth.
3. Cross-skill boundary: this ticket amends the commitment-block-authoring skill. The skill is a Story-Pipeline (Category 2c) skill per `.claude/skills/_shared-templates/story-state-contract.md` §12 / FOUNDATIONS §Story Bundles §7. The amendment introduces no new cross-skill contract — it operationalizes SPEC77SLTGROPRO-001's schema field at authoring time within this skill's own Phase 4. Sibling Category 2c skills (`branching-story-bootstrap`, `branching-story-turn-cycle`) also produce SLT records and will need parallel authoring guidance; that scope is out for this ticket (those skills' bootstrap-seeded and JIT-created SLTs will satisfy the schema via SPEC77SLTGROPRO-001's atomic schema + fixture migration, with the runtime-JIT singleton constraint operationalized by SPEC77SLTGROPRO-004's Phase 2.1 filter).
4. FOUNDATIONS §Story Bundles §5a (Commitment Blocks Are Causal Moves) at `docs/FOUNDATIONS.md:648-652`: the authoring guideline preamble operationalizes §5a's "a good block says: when these conditions hold, this kind of action can happen, these beats dramatize it, and these state effects follow" requirement. The banned-phrase list rejects the exact failure modes §5a names ("advance Act II", "raise stakes before midpoint"). The skill amendment makes the failure modes visible at authoring time rather than only at validation time.

## Architecture Check

1. **Why Phase 4 rather than Phase 2**: Phase 4 is where the established batch-level discipline (move-family diversity, recovery coverage, social-state coverage) already lives; adding per-block grounding requirements alongside the existing checks keeps the authoring-discipline surface coherent. SPEC-77 §3.3's prescription targets Phase 4 explicitly.
2. **Why the authoring guideline lives in the skill rather than the schema contract**: per the reassess-spec Q2=(a) resolution, the schema contract at `_shared-templates/story-record-schemas.md` §4.4 is schema-only and does not host authoring guidance; the skill is the right home for the "what `reason_to_exist` must name" guidance because that is where authors look at authoring time.
3. **Why the banned-phrase list is inlined in skill prose AND cross-references the utility**: the inlined list lets authors see what will be rejected without leaving the skill; the cross-reference to `tools/validators/src/structural/slt-grounding-utils.ts` names the source-of-truth so future amendments to the list go through the utility (and a successor spec for the validator) rather than drifting between the skill and the utility.
4. No backwards-compatibility aliasing/shims introduced — skill prose change only; no skill-level behavior change beyond enforcing the new schema requirements.

## Verification Layers

1. **Skill prose documents both new sub-paths** → codebase grep-proof: `grep -n 'compatible_turn_drivers\|reason_to_exist' .claude/skills/commitment-block-authoring/SKILL.md` returns both field names in the new Phase 4 preamble + per-field requirements.
2. **Authoring guideline preamble matches the reassess-spec resolution** → codebase grep-proof: `grep -n 'reason_to_exist must name\|active or reusable pressure logic' .claude/skills/commitment-block-authoring/SKILL.md` returns the preamble blockquote with the canonical language from SPEC-77 §3.3.
3. **Banned-phrase list mirrors the utility** → codebase grep-proof: the 9 entries in the skill prose match `SLT_GROUNDING_BANNED_PHRASES` in `tools/validators/src/structural/slt-grounding-utils.ts` (SPEC77SLTGROPRO-001).
4. **FOUNDATIONS §Story Bundles §5a alignment** → FOUNDATIONS alignment check: the authoring guideline operationalizes §5a's good-block / bad-block contract by making the bad-block patterns visible at authoring time.

## What to Change

### 1. Phase 4 amendment — `.claude/skills/commitment-block-authoring/SKILL.md`

Amend the Phase 4 section to add (a) the authoring-guideline preamble blockquote, and (b) the per-field requirements section. Position the changes within Phase 4 such that the preamble appears before the existing batch-diversity checks (so authors read the per-block guideline before the batch-level checks fire).

**(a) Preamble blockquote**:

```markdown
> An SLT's `reason_to_exist` must name the active or reusable pressure logic the storylet captures — what causal state makes it eligible, and what kind of move it represents. Generic phrases like "dramatic variety," "good conflict," "advance the plot," "raise stakes," "create tension," and "for pacing" are structurally rejected (see `slt_grounding_minimal_integrity` banned-phrase list below).
```

**(b) Per-field requirements**:

```markdown
Per-field requirements (new under SPEC-77):

- Require `grounding.compatible_turn_drivers[]` to be set per block. For a global-author-pool / branch-prefix pattern, list every driver kind the pattern can serve (commonly: `[player_action, player_write_in, npc_action, offstage_action]` for a pursuit pattern; `[clock_fire, world_pressure]` for a deadline-pressure pattern). For a branch-scoped runtime_jit block, list the single driver kind the JIT was created for.
- Require `grounding.reason_to_exist` per block. Provide a 1-2 sentence statement naming the active pressure record(s) or reusable pressure class. Examples:
  - "Covers offstage or onstage pursuit pressure from an active opposing actor." (global pattern)
  - "Varro's active plan (STPLAN-9) and ambush clock (CLK-3) became due; Jon and Mara must react in POV." (runtime_jit)
- Banned-phrase list (rejected by `slt_grounding_minimal_integrity`): "dramatic variety", "good conflict", "advance the plot", "raise stakes", "create tension", "for pacing", "dramatic moment", "story beat", "narrative momentum". This list is amendable via the shared utility at `tools/validators/src/structural/slt-grounding-utils.ts`; mirror amendments here when the utility changes.
```

The exact placement within Phase 4 should preserve the existing batch-diversity-check structure — the new content slots in as a logical precondition (per-block grounding) before the batch-level checks (which inspect across multiple blocks). If Phase 4 already has a structured sub-section list, append a new sub-section titled "Grounding (SPEC-77)" at an appropriate position.

## Files to Touch

- `.claude/skills/commitment-block-authoring/SKILL.md` (modify)

## Out of Scope

- The schema change at `tools/validators/src/schemas/story-storylet.schema.json` (covered by SPEC77SLTGROPRO-001). This ticket assumes the schema field exists; the skill amendment requires the field at authoring time.
- The validator at `tools/validators/src/structural/slt-grounding-minimal-integrity.ts` (covered by SPEC77SLTGROPRO-002). This ticket's skill prose references the validator by name but does not implement it.
- The Phase 2.1 driver-kind compatibility filter at `branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md` (covered by SPEC77SLTGROPRO-004, Slice D). That filter is consumed at selection time, not at authoring time.
- Parallel guidance for `branching-story-bootstrap` and `branching-story-turn-cycle` (the two sibling Category 2c skills that also produce SLT records). Bootstrap-seeded and JIT-created SLTs satisfy the schema via SPEC77SLTGROPRO-001's atomic landing; runtime-JIT singleton-kind enforcement is the Phase 2.1 filter's job (SPEC77SLTGROPRO-004). If those skills need their own authoring guidance for the new fields, that scope belongs to a separate ticket cycle.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE 'compatible_turn_drivers|reason_to_exist' .claude/skills/commitment-block-authoring/SKILL.md` returns ≥2 lines in the Phase 4 section.
2. `grep -n 'reason_to_exist must name' .claude/skills/commitment-block-authoring/SKILL.md` returns the preamble blockquote.
3. `grep -nE '"dramatic variety"|"good conflict"|"narrative momentum"' .claude/skills/commitment-block-authoring/SKILL.md` returns the inlined banned-phrase list entries.
4. `grep -n 'slt-grounding-utils.ts' .claude/skills/commitment-block-authoring/SKILL.md` returns the cross-reference to the utility's source-of-truth location.

### Invariants

1. **Authoring-time enforcement parity** — every banned phrase the validator at SPEC77SLTGROPRO-002 rejects is also documented in this skill so authors see at authoring time what will be rejected at validation time.
2. **Single source of truth for banned-phrase list** — the inlined list in skill prose mirrors `SLT_GROUNDING_BANNED_PHRASES` in `slt-grounding-utils.ts`; the skill prose's cross-reference to the utility names the canonical location for future amendments.
3. **FOUNDATIONS §Story Bundles §5a operationalization** — the authoring guideline preamble makes the good-block / bad-block contract visible at the surface where authors compose blocks.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -nE 'compatible_turn_drivers|reason_to_exist|slt-grounding-utils' .claude/skills/commitment-block-authoring/SKILL.md` — confirms all required cross-references and field names are present.
2. `grep -cE '"dramatic variety"|"good conflict"|"advance the plot"|"raise stakes"|"create tension"|"for pacing"|"dramatic moment"|"story beat"|"narrative momentum"' .claude/skills/commitment-block-authoring/SKILL.md` — confirms all 9 banned phrases are inlined (expected count: 9).
