# SPEC20SCECOM-010: Storylet Template Comment Edit (Side-Deliverable)

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` line 232 comment for `safety_valves.max_words` field rewritten to drop the "(multi-beat target about 1500-2000 words)" framing and replace with engine-only runaway-defense semantics per Prose Craft Contract Rule 11.
**Deps**: None (single-line template comment edit; independent of phase-cycle chain)

## Problem

The SLT v2 schema template at `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` line 232 carries a comment for `safety_valves.max_words`: `"default: 2200; multi-beat target about 1500-2000 words"`. The "(multi-beat target about 1500-2000 words)" framing was inherited from the pre-`b28aead` design (commit `b28aead` 2026-05-06 removed word-per-page guidelines from the rendering instructions). Even though SPEC-20 §D + §H rebuilt the rendering surface to honor Prose Craft Contract Rule 11 ("Length follows content"), the template comment continues to suggest "target" semantics to anyone reading the schema. This side-deliverable was added to SPEC-20's Deliverables table during reassessment 2026-05-07 to close the schema-runtime inconsistency.

## Assumption Reassessment (2026-05-07)

1. Verified `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` exists; line 232 confirmed to contain `max_words: 2200                        # default: 2200; multi-beat target about 1500-2000 words` per the SPEC-20 reassessment session's grep output. The `safety_valves.max_words` field itself stays — SPEC-19 §A defines it as the engine-side runaway-defense ceiling; only the comment's "target" framing changes.
2. Verified SPEC-19 (archived) §A defines `safety_valves.max_words` as a hard cap, not a soft target; the schema field semantics are preserved by this ticket. Verified `prose-craft-contract.md` Rule 11 ("Length follows content") is the active runtime contract that the comment must align with.
3. Cross-skill boundary: `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` is the canonical SLT v2 template consumed by `storylet-pool-authoring` Phase 3 (structured drafting) AND by `branching-story-page-cycle` Phase 4 (selection) AND by SPEC-22 §Track 2's `arc_schema_compliance` validator. The comment edit does NOT change the schema; consumers see no behavior change. The contract under audit is the comment's framing — "target" vs. "engine-only runaway-defense".
4. FOUNDATIONS Rule 6 (No Silent Retcons) — renumbered from template item 4: this ticket preserves the b28aead Rule 11 contract by removing target-framing residue from the schema template. Explicit attribution to the commit is documented in the new comment.

## Architecture Check

1. The schema field stays unchanged; only the comment changes. This is a documentation-fidelity edit that aligns the schema's framing with the runtime contract.
2. Putting the engine-only runaway-defense framing in the schema comment (not just in the runtime prose) makes the discipline grep-discoverable from the schema authority — a future implementer who reads the template doesn't have to spelunk through `phase-7-page-render.md` to learn that `max_words` is not a target.
3. No backwards-compatibility aliasing/shims: schema field unchanged; no consumer-side migration needed.

## Verification Layers

1. Comment edit lands at line 232 → codebase grep-proof for the new comment text.
2. "target" framing absent from comment → codebase grep-proof confirming absence of "(multi-beat target about 1500-2000 words)" phrasing.
3. Schema field unchanged → codebase grep-proof confirming `max_words: 2200` value preserved.

## What to Change

### 1. Edit line 232 comment in storylet-record.yaml

In `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml`, replace line 232's comment:

**Before**:
```yaml
    max_words: 2200                        # default: 2200; multi-beat target about 1500-2000 words
```

**After**:
```yaml
    max_words: 2200                        # default: 2200; engine-only runaway-defense ceiling (NOT a soft target — see prose-craft-contract.md Rule 11)
```

The schema field itself (`max_words: 2200`) is preserved verbatim; only the comment text changes.

## Files to Touch

- `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` (modify — single comment edit on line 232)

## Out of Scope

- `safety_valves.max_words` schema field semantics change (none — engine-side hard cap preserved).
- Phase 7 rendering surface (SPEC20SCECOM-003).
- STORY_KERNEL.md `cadence_policy` extension (completed in `archive/tickets/SPEC20SCECOM-007.md`).
- `phase-7-page-render.md` Length-per-Rule-11 paragraph (SPEC20SCECOM-003).
- Other template comment edits (none required by SPEC-20).

## Acceptance Criteria

### Tests That Must Pass

1. Schema parse-check: `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` parses as valid YAML after the edit.
2. Comment fidelity: line 232 contains the new "engine-only runaway-defense ceiling" framing AND a cross-reference to `prose-craft-contract.md` Rule 11.
3. Schema invariance: line 232's `max_words: 2200` value is unchanged.

### Invariants

1. The schema field `safety_valves.max_words` is preserved verbatim (no schema breakage).
2. The new comment includes the cross-reference to `prose-craft-contract.md` Rule 11 (audit-trail attribution per FOUNDATIONS Rule 6).

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.

### Commands

1. `grep -n "max_words: 2200" .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` — confirms schema field unchanged.
2. `grep -n "engine-only runaway-defense\|prose-craft-contract.md Rule 11" .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` — confirms new comment framing lands.
3. `grep -n "multi-beat target about 1500-2000 words" .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` — should return zero matches (eliminated).
