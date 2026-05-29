# SPEC94SCNPUBSTA-004: `branching-story-scene-prose-attach` — replace `SCN.status` precondition

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/branching-story-scene-prose-attach/SKILL.md` HARD-GATE precondition prose. No change to the receipt schema or to any tool/validator; the skill still writes only the receipt + INDEX.
**Deps**: SPEC94SCNPUBSTA-001

## Problem

`branching-story-scene-prose-attach` aborts at HARD-GATE step 3 (L107) if the retrieved `scene_id`'s `status` is not one of `planned | rendered | attached`. With the field removed (001/002), this precondition references a field that no longer exists. It must be replaced with the still-valid preconditions that genuinely gate attach: the `SCN` exists, is the latest non-superseded record for its id lineage, and its scene-plan + prose pair are present. Attach continues to write only the receipt + INDEX and mutates no `_source` record.

## Assumption Reassessment (2026-05-29)

1. `.claude/skills/branching-story-scene-prose-attach/SKILL.md`: HARD-GATE step 3 at L107 ("Retrieve `scene_id` … Abort if missing or if its `status` is not `planned`, `rendered`, or `attached`"); steps 4–6 already check `prose_plan_path`/`prose_path`/`receipt_path` shape and artifact presence; the "never mutates PG/SCN/SE" contract is at L3 (frontmatter), L25 (intro), and L203 ("Do not create, supersede, or edit `PG`, `SCN`, `SE`…"). Verified by reading the SKILL.md this session.
2. SPEC-94 §2 item 4 specifies: remove the L107 `status` precondition; replace with `SCN` exists + is the latest non-superseded record for its id lineage + scene-plan/prose pair present. Attach write surface (receipt + INDEX, no `_source` mutation) unchanged.
3. Cross-skill boundary under audit: the precondition reads an `SCN` retrieved via MCP; the removed `status` field is owned by the contract (001) and schema (002). The replacement "latest non-superseded" check reads the `supersedes` pointer (an existing schema field), aligning with the derived `superseded` indicator defined in 001.
4. FOUNDATIONS principle motivated: derive-don't-store — a precondition gating on a permanently-`planned` field gated on nothing; the replacement gates on durable membership facts (existence, supersession lineage, artifact presence).
5. HARD-GATE precondition surface (Canon Safety): step 3 is part of this skill's HARD-GATE. The edit swaps a dead status-check for existence/supersession/artifact-presence checks. **Confirm the change does not weaken the Mystery Reserve firewall**: scene-prose-attach's MR firewall is the separate deterministic `scene_range_forbidden_mystery_resolution` receipt check — it is NOT the `status` precondition and is untouched by this ticket. The skill remains non-mutating of all `_source` records (writes only the receipt + INDEX), so no canon-write ordering is affected.

## Architecture Check

1. Gating on existence + latest-non-superseded + artifact-pair-present is the set of conditions attach actually requires; the old `status ∈ {planned,rendered,attached}` check admitted everything (the field was always `planned`) and so gated nothing — the replacement is a real precondition, not cosmetic.
2. No backwards-compatibility shim: the status branch is removed, not retained as a tolerated legacy path.

## Verification Layers

1. No precondition reads `SCN.status` → codebase grep-proof (`grep -n "status" SKILL.md` shows no `planned, rendered, attached` precondition).
2. Replacement precondition checks existence + latest-non-superseded + artifact-pair → manual review of the reworded step 3.
3. MR firewall intact → FOUNDATIONS alignment check: `scene_range_forbidden_mystery_resolution` (receipt check) is untouched; attach still mutates no `_source` record.
4. Reference files (`receipt-checks.md`, `write-and-validation.md`) carry no `scn_status` mention (confirmed this session — only `scene_range_entity_status_consistency`, out of scope) → grep-proof verify-no-op.

## What to Change

### 1. HARD-GATE step 3 (L107)

- Replace "Abort if missing or if its `status` is not `planned`, `rendered`, or `attached`" with: abort if the `SCN` is missing; abort if it is not the latest non-superseded record for its id lineage (per `supersedes`); the scene-plan + prose pair presence checks at steps 4–6 continue to gate attach. No reference to a publication status.

### 2. Reference files (verify-no-op)

- `references/receipt-checks.md`, `references/write-and-validation.md`: confirm no `scn_status`/`SCN.status` mention requires reconciliation (expected no edit — the only `*status*` token there is `scene_range_entity_status_consistency`, an out-of-scope receipt check). If a stray reference is found, reconcile it; otherwise no change.

## Files to Touch

- `.claude/skills/branching-story-scene-prose-attach/SKILL.md` (modify)
- `.claude/skills/branching-story-scene-prose-attach/references/receipt-checks.md` (modify — verify-no-op; edit only if a stray `SCN.status` ref is found)
- `.claude/skills/branching-story-scene-prose-attach/references/write-and-validation.md` (modify — verify-no-op; edit only if a stray `SCN.status` ref is found)

## Out of Scope

- The contract markdown (001), JSON schema + tests (002), scene-plan skill (003), docs/fixtures (005).
- Any change to the receipt schema, the attach write surface (receipt + INDEX), or the `scene_range_forbidden_mystery_resolution` MR-firewall check.
- Any new `_source` mutation by prose-attach (the no-mutation contract is preserved).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "planned.*rendered.*attached\|SCN.status" .claude/skills/branching-story-scene-prose-attach/SKILL.md` returns zero.
2. HARD-GATE step 3 reads `SCN` exists + latest-non-superseded; steps 4–6 (artifact presence) unchanged.
3. The skill still writes only the receipt + INDEX and mutates no `_source` record (the L203 prohibition is intact).

### Invariants

1. The Mystery Reserve firewall (`scene_range_forbidden_mystery_resolution`) is unchanged — Rule 7 preserved.
2. Prose-attach remains non-authoritative: no `PG`/`SCN`/`SE`/`_source` mutation.

## Test Plan

### New/Modified Tests

1. `None — skill-prose ticket; verification is grep-based and the cross-cutting §6 sweep in SPEC94SCNPUBSTA-006 is the acceptance boundary.`

### Commands

1. `grep -n "status" .claude/skills/branching-story-scene-prose-attach/SKILL.md` (expect no `planned, rendered, attached` precondition)
2. `grep -rn "scn_status\|SCN\.status" .claude/skills/branching-story-scene-prose-attach/` (expect zero)
