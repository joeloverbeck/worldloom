# SPEC20SCECOM-010: Storylet Template Safety-Valve Comment Edit (Side-Deliverable)

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` line 232 comment and `.claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` safety-valve note for `max_words_reached` were rewritten to drop target-framing and replace it with engine-only runaway-defense semantics per Prose Craft Contract Rule 11. `archive/specs/SPEC-20-scene-commitment-arc-runtime-pipeline.md` deliverables were truthed to name the absorbed predicate DSL side edit.
**Deps**: None (template comment/prose fidelity edit; independent of phase-cycle chain)

## Problem

At intake, the SLT v2 schema template at `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` line 232 carried a comment for `safety_valves.max_words`: `"default: 2200; multi-beat target about 1500-2000 words"`. The predicate DSL stop-policy note at `.claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` line 243 also said the "multi-beat target is roughly 1500-2000 words." That framing was inherited from the pre-`b28aead` design (commit `b28aead` 2026-05-06 removed word-per-page guidelines from the rendering instructions). SPEC-20 §D + §H rebuilt the rendering surface to honor Prose Craft Contract Rule 11 ("Length follows content"), so this ticket removed the stale target semantics from the active schema/grammar template authority pair.

## Assumption Reassessment (2026-05-08)

1. Verified `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` exists; line 232 contained `max_words: 2200                        # default: 2200; multi-beat target about 1500-2000 words` before this ticket. The `safety_valves.max_words` field itself stayed — SPEC-19 §A defined it as an engine-side ceiling, while SPEC-20 supersedes the target wording with runaway-defense-only framing.
2. Verified `.claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` is also loaded by `storylet-pool-authoring` Phase 3 and is named by the parent `SKILL.md` schema transition note as the SPEC-19 stop-predicate authority. It contained the same stale target framing for `max_words_reached`, so this ticket absorbed that same-seam template fallout.
3. Verified SPEC-20 §D and §H supersede the archived SPEC-19 target wording for runtime prose length: `max_words` is an engine-side runaway-defense termination trigger only, not an LLM-facing target, soft target, minimum, or preferred range. Verified `prose-craft-contract.md` Rule 11 ("Length follows content") is the active runtime contract that both template comments must align with.
4. Cross-skill boundary: `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` and `.claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` are the canonical SLT v2 schema/grammar authorities consumed by `storylet-pool-authoring` Phase 3 and downstream stop-policy validation. The edits do NOT change schema fields or predicate names; consumers see no behavior change. The contract under audit is the prose framing — "target" vs. "engine-only runaway-defense".
5. FOUNDATIONS Rule 6 (No Silent Retcons): this ticket preserves the b28aead Rule 11 contract by removing target-framing residue from the active storylet template authorities and truthing SPEC-20's deliverables list to name the predicate DSL side edit.

## Architecture Check

1. The schema field and predicate label stay unchanged; only comments/prose notes change. This is a documentation-fidelity edit that aligns the template authority pair's framing with the runtime contract.
2. Putting the engine-only runaway-defense framing in both the schema comment and predicate DSL safety-valve note makes the discipline grep-discoverable from the schema/grammar authorities — a future implementer who reads the templates doesn't have to spelunk through `phase-7-page-render.md` to learn that `max_words` is not a target.
3. No backwards-compatibility aliasing/shims: schema field unchanged; no consumer-side migration needed.

## Verification Layers

1. Comment/prose edits land in the schema and predicate DSL template authorities → codebase grep-proof for the new engine-only runaway-defense wording.
2. "target" framing absent from the active storylet template authorities → codebase grep-proof confirming absence of `multi-beat target` and `1500-2000 words` phrasing under `.claude/skills/storylet-pool-authoring/templates/`.
3. Schema field unchanged → codebase grep-proof confirming `max_words: 2200` value preserved.

## Landed Changes

### 1. Edit line 232 comment in storylet-record.yaml

In `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml`, replace line 232's comment:

**Before**:
```yaml
    max_words: 2200                        # default: 2200; multi-beat target about 1500-2000 words
```

**After**:
```yaml
    max_words: 2200                        # default: 2200; engine-only runaway-defense ceiling (NOT a soft target; see prose-craft-contract.md Rule 11)
```

The schema field itself (`max_words: 2200`) was preserved verbatim; only the comment text changed.

### 2. Edit max_words_reached note in predicate-dsl.md

In `.claude/skills/storylet-pool-authoring/templates/predicate-dsl.md`, the stale target wording in the `max_words_reached` safety-valve note was replaced with engine-only runaway-defense semantics and a Rule 11 cross-reference.

### 3. Truth SPEC-20 deliverable table

In `archive/specs/SPEC-20-scene-commitment-arc-runtime-pipeline.md`, the Deliverables table now names the predicate DSL safety-valve note edit alongside the original storylet-record comment edit.

## Files to Touch

- `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` (modify — single comment edit on line 232)
- `.claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` (modify — safety-valve note for `max_words_reached`)
- `archive/specs/SPEC-20-scene-commitment-arc-runtime-pipeline.md` (modify — deliverables table truthing for absorbed same-seam predicate DSL side edit)

## Out of Scope

- `safety_valves.max_words` schema field semantics change (none — engine-side hard cap preserved).
- Phase 7 rendering surface (SPEC20SCECOM-003).
- STORY_KERNEL.md `cadence_policy` extension (completed in `archive/tickets/SPEC20SCECOM-007.md`).
- `phase-7-page-render.md` Length-per-Rule-11 paragraph (SPEC20SCECOM-003).
- Runtime behavior, validator logic, and schema shape.

## Acceptance Criteria

### Tests That Must Pass

1. Schema parse-check: `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` parses as valid YAML after the edit.
2. Comment fidelity: the storylet template authorities contain the new "engine-only runaway-defense" framing AND a cross-reference to `prose-craft-contract.md` Rule 11.
3. Schema invariance: line 232's `max_words: 2200` value is unchanged.
4. Stale target framing is absent from `.claude/skills/storylet-pool-authoring/templates/`.

### Invariants

1. The schema field `safety_valves.max_words` is preserved verbatim (no schema breakage).
2. The new comments include the cross-reference to `prose-craft-contract.md` Rule 11 (audit-trail attribution per FOUNDATIONS Rule 6).

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.

### Commands

1. `grep -n "max_words: 2200" .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` — confirms schema field unchanged.
2. `grep -R -n "engine-only runaway-defense\|prose-craft-contract.md Rule 11" .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml .claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` — confirms new comment framing lands.
3. `grep -R -n "multi-beat target\|1500-2000 words" .claude/skills/storylet-pool-authoring/templates/` — returns zero matches after this ticket.

## Outcome

Completed. The active storylet template authority pair now describes `safety_valves.max_words` / `max_words_reached` as an engine-only runaway-defense ceiling, not a prose target. The `max_words: 2200` schema value and the `max_words_reached` safety-valve label were preserved. SPEC-20's deliverables table now names the same-seam predicate DSL note edit discovered during reassessment.

## Verification Result

1. `grep -n "max_words: 2200" .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` — passed; line 232 still contains `max_words: 2200`.
2. `grep -R -n "engine-only runaway-defense\|prose-craft-contract.md Rule 11" .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml .claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` — passed; both edited template authorities contain the new framing.
3. `grep -R -n "multi-beat target\|1500-2000 words" .claude/skills/storylet-pool-authoring/templates/` — passed with zero matches.
4. `python3 -c "import yaml; yaml.safe_load(open('.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml')); print('ok')"` — passed; Ruby was unavailable, so Python/PyYAML was used for the YAML parse check.

## Deviations

- The drafted ticket named only `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml`. Reassessment found the same stale target framing in `.claude/skills/storylet-pool-authoring/templates/predicate-dsl.md`, which is part of the same storylet schema/grammar authority seam, so the active ticket absorbed that edit.
