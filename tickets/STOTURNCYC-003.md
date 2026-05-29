# STOTURNCYC-003: SREL introduction-grounding validator excludes STCHAR (contradicts SREL schema) and emits a misleading message for disallowed-but-active classes

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `relationship_introduction_grounding_integrity` validator (message split) + `_shared-templates/story-record-schemas.md` §4.5.7 reconciliation. A class-set decision is required.
**Deps**: None

## Problem

Creating a freshly-introduced relationship SREL-4 (Ane→Jon, `fear` axis), I set `derived_from: ["BEL-8", "STCHAR-2"]` — STCHAR-2 because SREL schema §4.5.7 explicitly invites it. The dry-run rejected STCHAR-2:

```
srel_intro_grounding_missing: SREL-4.derived_from entry STCHAR-2 is not an allowed parent-active or same-event-created grounding record.
```

I then tried `["BEL-8", "THR-2"]`; the validator rejected THR-2 with the **same message** — but THR-2 **is** parent-active on PG-1. The message is factually wrong for THR-2 and cost a debugging cycle. Two defects:

1. **Schema-vs-validator contradiction.** `relationship-introduction-grounding-integrity.ts:7-22` `ALLOWED_GROUNDING_PREFIXES` = {SE, SF, BEL, OBL, CNSQ, STINT, SREL, DA, CLK, STSEC, STQ, STSTAT, STPLAN, STEMO} — it **excludes STCHAR**. But `story-record-schemas.md:596` (§4.5.7) says: "Use STCHAR in `derived_from[]` when a relationship's stable conduct, voice, pressure behavior, or appraisal pattern depends on story-local character authority." The schema invites an entry the introduction validator forbids.
2. **Misleading message.** Line 118 checks `!isAllowedGroundingId(groundingId) || !activeOrCreatedGroundingIds.has(groundingId)` and emits a single message blaming active-ness. A disallowed-class record that *is* active (THR-2) gets "not parent-active or same-event-created," which is false.

## Assumption Reassessment (2026-05-29)

1. `tools/validators/src/structural/relationship-introduction-grounding-integrity.ts:7-22,117-124` — `ALLOWED_GROUNDING_PREFIXES` and the combined check confirmed above. `isAllowedGroundingId` (line 229-232) keys on the id prefix.
2. `.claude/skills/_shared-templates/story-record-schemas.md:596` (§4.5.7 SREL) — explicitly endorses STCHAR in `derived_from`. This is the schema text under audit.
3. `.claude/skills/_shared-templates/story-state-contract.md` §11a four-layer model — STCHAR is **durable authority** that explains *why* a present-causal record matters, distinct from the present-causal trigger that *introduces* a relationship. Phase-4-5 turn-cycle guidance ("reach for the direct cause … a relationship shift driven by an affective state derives from that STEMO") points at present-causal grounds (BEL/STEMO/SF/SREL), not durable authority.
4. FOUNDATIONS Rule 1 (no floating facts): a fresh relationship's `derived_from` should name the **present causal** ground. Under that principle the validator's exclusion of STCHAR for *introductions* is defensible — but then the **schema text is the bug** for inviting STCHAR unconditionally. This is the reconciliation decision the ticket must make: either (a) scope §4.5.7's STCHAR allowance to superseded/ongoing relationships and keep the validator strict, or (b) admit STCHAR for introductions and widen the validator. Recommendation: (a) — it preserves §11a's durable-vs-present separation; the implementer must confirm against §11a before coding.
5. THR exclusion: the validator omits THR from the allowed set. THR is an ongoing concern, not a present root cause, so its exclusion may be intentional; the **message** is the unambiguous bug regardless of the THR class decision.
6. Shared boundary under audit: the `SREL.derived_from` contract across (a) SREL schema §4.5.7, (b) the `relationship_introduction_grounding_integrity` allowed-class set, and (c) phase-4-5 turn-cycle grounding guidance. Adjacent contradiction: confirm whether other introduction-grounding validators (THR/STENT) carry the same conflated message and fix in the same pass or split.

## Architecture Check

1. Splitting the line-118 condition into two distinct verdicts (`grounding_class_not_allowed` vs `grounding_not_active_or_same_event`) makes the failure self-explanatory and removes false "not active" claims — cleaner than a single conflated message.
2. Scoping the schema text to match the validator (option a) preserves the §11a durable/present separation without a compatibility shim; no alias path introduced.

## Verification Layers

1. Schema text matches validator -> FOUNDATIONS/§11a alignment check + codebase grep-proof: §4.5.7 STCHAR allowance is scoped to match `ALLOWED_GROUNDING_PREFIXES` (or the set is widened to include STCHAR).
2. Message correctness -> skill dry-run: a fresh SREL with a disallowed-class active record (e.g., THR) yields a class-not-allowed verdict, not a "not parent-active" verdict.
3. Happy path -> skill dry-run: a fresh SREL grounded in a present-causal record (BEL/STEMO) passes.

## What to Change

### 1. Reconcile schema and validator (decision required)
Recommended: scope `story-record-schemas.md` §4.5.7 STCHAR-in-`derived_from` allowance to **superseded/ongoing** relationships, and state that **freshly-introduced** SREL `derived_from` must name a present-causal record (per the introduction validator). If the maintainer instead chooses to admit STCHAR for introductions, add `STCHAR` to `ALLOWED_GROUNDING_PREFIXES` and note the §11a tension.

### 2. Split the conflated verdict
In `relationship-introduction-grounding-integrity.ts`, separate `!isAllowedGroundingId` from `!activeOrCreatedGroundingIds.has` into two distinct codes/messages so an active-but-disallowed-class entry is described accurately.

### 3. Optionally reconsider THR
Decide whether THR belongs in the allowed set; document the rationale either way.

## Files to Touch

- `tools/validators/src/structural/relationship-introduction-grounding-integrity.ts` (modify)
- `.claude/skills/_shared-templates/story-record-schemas.md` (modify, §4.5.7)
- `.claude/skills/branching-story-turn-cycle/references/phase-4-5-belief-and-mystery.md` (modify, if grounding-class guidance needs a note)
- `tools/validators/tests/` (new/modified test)

## Out of Scope

- Widening allowed grounding classes for non-introduction (supersession) SREL validation.
- Changes to other introduction validators beyond the shared message-split pattern if confirmed identical.

## Acceptance Criteria

### Tests That Must Pass

1. Fresh SREL grounded only in STCHAR fails (or passes) consistently with the reconciled schema text — and the SREL schema §4.5.7 no longer invites a rejected entry.
2. Fresh SREL grounded in an active THR yields a distinct "class not allowed" verdict, never "not parent-active or same-event-created."
3. `cd tools/validators && npm test`.

### Invariants

1. SREL schema §4.5.7 and `ALLOWED_GROUNDING_PREFIXES` never disagree about whether STCHAR is a valid `derived_from` entry.
2. No introduction-grounding verdict claims a record is "not parent-active" when it is parent-active.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/` relationship-introduction-grounding case: active-but-disallowed-class entry → class-not-allowed verdict (asserts the message split).
2. `tools/validators/tests/` STCHAR-in-SREL-derived_from case matching the reconciled schema decision.

### Commands

1. `cd tools/validators && npm run build && npm test`
2. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js <envelope with a fresh SREL grounded in present-causal BEL/STEMO>` passes.
3. The validator unit test is the correct primary boundary because the contradiction is internal to the validator/schema pair and reproducible without a full bundle.
