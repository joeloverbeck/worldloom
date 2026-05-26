# SPEC91PAGPLABOD-003: §14 continuity packet restructure

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/_shared-templates/story-state-contract.md` §8 row for §14 + new sub-section; `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` §14 authoring procedure.
**Deps**: None

## Problem

Page-plan §14 ("Recent Prose Continuity") is currently optional and, when present, inlines the parent rendered prose verbatim from `pages-prose/PG-(N-1).md`. The verified pathology in sample plans at `worlds/erotica-world/stories/red-bunny/`: this verbatim dump keeps prior anchors highly salient in the external renderer's cold context, and the rendered prose orbits the same stocks ("bookshop bag", "pigtails", "four fingers", "strawberry", "pressure", "shape", "choosing") across consecutive pages. The continuity intent (give the renderer enough parent-state awareness to honor narrative continuity) is sound; the verbatim-dump implementation is the source of the recurring-metaphor pathology. This ticket replaces the verbatim dump with a structured 4-subsection packet (Where the previous page ended / Facts to preserve / Do not reuse these exact prior phrases, anchors, or metaphor stocks / Fresh anchor opportunities); verbatim prior-prose quotation is permitted only on explicit triggers (mid-dialogue continuation, clue-phrase legal/social weight, precise lie/promise/accusation/question preservation) with a hard cap of 1-3 lines.

## Assumption Reassessment (2026-05-26)

<!-- Items 1-3 always required. Items 4+ from menu, renumbered sequentially. -->

1. **Codebase reference check**: `.claude/skills/_shared-templates/story-state-contract.md` §8 enumerates §14 as optional ("when parent prose is rendered"). `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` line 9 mentions §14 inlining recent rendered prose continuity from `pages-prose/<recent>.md` when available. Sample plan PG-2/PG-3/PG-4 in red-bunny demonstrate the verbatim-dump shape and the resulting recurring-metaphor pathology in `pages-prose/PG-{2,3,4}.md`.
2. **Spec reference**: SPEC-91 §6 §14 subsection specifies the 4-subsection restructure with canonical template snippet (lines 137-155 in the spec); SPEC-91 §11 SPEC91-003 ticket scope at lines 276-280 names the bootstrap PG-1 omission, the turn-cycle authoring procedure, and the parent prose rendered guard.
3. **Cross-skill boundary**: shared `.claude/skills/_shared-templates/story-state-contract.md` §8 is the canonical authority for §14 structure. `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` is the procedural reference governing when §14 fires (parent prose rendered) and how it's authored. Bootstrap PG-1 has no parent, so §14 is omitted unconditionally there — the bootstrap phase reference needs no §14-related edit.
4. **FOUNDATIONS principle restatement**: §Story Bundles §9 (Prose Length Discipline) is the principle most directly engaged — no word-count enforcement. The new §14 packet uses bullets (3-8 continuity bullets, facts to preserve list, do-not-reuse list, fresh anchor opportunities list); the verbatim-quotation hard cap (1-3 lines) is a leakage-prevention rule, not a length target. §9's "no word-count targets, floors, ceilings, ranges, or budgets" prohibition stays satisfied.

## Architecture Check

1. **Why structured continuity is cleaner than verbatim dump**: the verbatim dump optimizes for "renderer has access to parent prose" but pessimizes for "renderer reproduces parent anchors verbatim". The structured packet optimizes for both: the "Where the previous page ended" bullets give the renderer awareness without saturating the context with verbatim phrasing; the "Do not reuse" list converts the anti-repetition discipline from implicit-pattern-detection into explicit-prohibition. The Holtzman/Welleck text-generation literature on degeneration-via-context-saturation supports this framing (cited in the source ChatGPT-Pro report's §4 External research synthesis).
2. **No backwards-compatibility shims**: existing pre-SPEC-91 plans with §14 verbatim dumps remain as-is per SPEC-91 §9 Migration / scope; the new contract applies to plans authored after the ticket lands. Mid-bundle continuation works regardless of parent plan's §14 shape — the "Where the previous page ended" subsection summarizes parent prose in structured form regardless of how the parent's §14 was authored.

## Verification Layers

1. **§14 4-subsection template populated correctly** → manual review of new authoring guidance + grep-proof that updated `phase-7-page-plan.md` describes the 4-subsection shape (Where the previous page ended / Facts to preserve / Do not reuse / Fresh anchor opportunities).
2. **Verbatim-quotation trigger conditions documented** → codebase grep-proof that story-state-contract.md and the turn-cycle phase reference both describe the three explicit trigger conditions (mid-dialogue continuation, clue-phrase legal/social weight, precise lie/promise/accusation/question preservation) AND the 1-3 line hard cap.
3. **§9 word-count discipline preservation** → manual review confirming the new §14 prose uses no word-count language; bullet lists and the verbatim-quotation cap are leakage-prevention rules, not length targets.

## What to Change

### 1. Update `.claude/skills/_shared-templates/story-state-contract.md` §8

Rewrite the §8 row for §14 ("Recent prose continuity") to describe the structured 4-subsection packet shape per SPEC-91 §6 §14 worked template (spec lines 137-155). Add a new sub-section after §8's table (parallel to existing per-section sub-sections like the §9b / §9c / §10b sub-sections at lines 467-498 and 569+) describing §14 authoring discipline:

- Default shape: 4 subsections — `Where the previous page ended` (3-8 concise continuity bullets), `Facts to preserve` (object/position/body/relationship facts), `Do not reuse these exact prior phrases, anchors, or metaphor stocks`, `Fresh anchor opportunities`.
- Verbatim prior-prose quotation permitted ONLY on three explicit triggers (mid-dialogue continuation, clue-phrase legal/social weight, precise lie/promise/accusation/question preservation). Hard cap when permitted: 1-3 lines, not full pages.
- §14 remains optional — omitted entirely when no parent prose is available (bootstrap PG-1 and turn-cycle pages whose parent prose has not yet been rendered, i.e., `parent.prose_status != rendered` per PROSESPLIT-002).

### 2. Update `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md`

Add §14 authoring procedure: when parent prose has been rendered (`PG-(N-1).prose_status: rendered`), generate the structured 4-subsection packet; when not yet rendered, omit §14 entirely. Cite the per-trigger conditions for verbatim quotation. Include a canonical template snippet matching the spec §6 §14 template.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify)
- `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` (modify)

## Out of Scope

- `.claude/skills/branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md` — bootstrap PG-1 has no parent and unconditionally omits §14; no bootstrap-side edit needed.
- Rewriting existing PG-2 through PG-5 in `worlds/erotica-world/stories/red-bunny/pages-prose-plans/` — per SPEC-91 §9 Migration / scope, forward-only.
- §7 / §7a / §9 / §9b / §9c / §10b body translation — §7 / §7a is covered by `archive/tickets/SPEC91PAGPLABOD-001.md`; §9 / §9b / §9c / §10b is covered by `archive/tickets/SPEC91PAGPLABOD-002.md`.
- Modifying the `pages-prose/PG-<integer>.md` artifact shape or location — only the §14 authoring procedure changes; the parent-prose artifact stays where it is.
- New validator scanning §14 for compliance with the 4-subsection shape — out of scope for this ticket (a future ticket may add structural validation if §14 drift becomes a recurring issue; the spec §10 test plan does not name a §14-specific validator for SPEC-91).

## Acceptance Criteria

### Tests That Must Pass

1. **§14 structured-packet template documented**: `grep -B1 -A10 "Recent prose continuity\|Where the previous page ended" .claude/skills/_shared-templates/story-state-contract.md` returns the 4-subsection template.
2. **Verbatim-quotation trigger conditions documented**: `grep -E "mid-dialogue continuation|clue.phrase.*legal|precise lie.*promise.*accusation.*question|1-3 lines" .claude/skills/_shared-templates/story-state-contract.md .claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` returns matches in both files.
3. **Turn-cycle §14 authoring procedure cites parent prose_status guard**: `grep -E "prose_status.*rendered|parent prose has been rendered" .claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` returns the rendered-guard language.

### Invariants

1. **§14 stays optional**: the contract and procedural prose must continue to describe §14 as omittable; nothing in this ticket makes §14 mandatory or removes its optional status.
2. **§9 Prose Length Discipline preserved**: no word-count target, floor, ceiling, range, or budget is introduced anywhere in the §14 prose. The 1-3 line verbatim-quotation cap is a leakage-prevention rule scoped to verbatim-quotation-only; it does not constrain the §14 packet's bullet-list length.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -B2 -A12 "Recent prose continuity" .claude/skills/_shared-templates/story-state-contract.md` — confirms §14 row + sub-section carry the structured-packet contract.
2. `grep -E "Where the previous page ended|Facts to preserve|Do not reuse these exact|Fresh anchor opportunities" .claude/skills/_shared-templates/story-state-contract.md .claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` — confirms the 4-subsection template surfaces in both files.
3. `grep -E "1-3 lines|hard cap" .claude/skills/_shared-templates/story-state-contract.md` — confirms the verbatim-quotation cap is documented.
