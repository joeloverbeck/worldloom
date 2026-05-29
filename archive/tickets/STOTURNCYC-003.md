# STOTURNCYC-003: SREL introduction-grounding validator keeps fresh introductions present-causal and reports disallowed-but-active classes accurately

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `relationship_introduction_grounding_integrity` validator (message split), focused validator tests, `_shared-templates/story-record-schemas.md` §4.5.7 reconciliation, and same-seam turn-cycle / health-audit guidance truthing. Class-set decision: keep fresh SREL introductions present-causal and leave broad schema acceptance for bootstrap / ongoing derivation.
**Deps**: None

## Problem

At intake, creating a freshly-introduced relationship SREL-4 (Ane→Jon, `fear` axis), I set `derived_from: ["BEL-8", "STCHAR-2"]` — STCHAR-2 because SREL schema §4.5.7 explicitly invited it. The dry-run rejected STCHAR-2:

```
srel_intro_grounding_missing: SREL-4.derived_from entry STCHAR-2 is not an allowed parent-active or same-event-created grounding record.
```

I then tried `["BEL-8", "THR-2"]`; the validator rejected THR-2 with the **same message** — but THR-2 **was** parent-active on PG-1. The message was factually wrong for THR-2 and cost a debugging cycle. Two defects existed before this ticket:

1. **Schema-vs-validator contradiction.** `relationship-introduction-grounding-integrity.ts` `ALLOWED_GROUNDING_PREFIXES` excluded STCHAR, while pre-ticket `story-record-schemas.md` (§4.5.7) unconditionally invited STCHAR in SREL `derived_from[]`. That prose is now scoped to bootstrap / supersession / ongoing relationship provenance, while fresh mid-story introductions require present-causal grounding.
2. **Misleading message.** The pre-ticket validator checked `!isAllowedGroundingId(groundingId) || !activeOrCreatedGroundingIds.has(groundingId)` and emitted a single message blaming active-ness. A disallowed-class record that *was* active (THR-2) got "not parent-active or same-event-created," which was false. The validator now emits a distinct class-not-allowed verdict before active-ness checks.

## Assumption Reassessment (2026-05-29)

1. `tools/validators/src/structural/relationship-introduction-grounding-integrity.ts` — `ALLOWED_GROUNDING_PREFIXES` excludes STCHAR, and `isAllowedGroundingId` keys on the id prefix. The old combined grounding check was split in this ticket.
2. `.claude/skills/_shared-templates/story-record-schemas.md` (§4.5.7 SREL) — before this ticket, the schema prose explicitly endorsed STCHAR in `derived_from` without distinguishing fresh mid-story introductions from bootstrap / supersession / ongoing relationship provenance. This was the schema text under audit.
3. `.claude/skills/_shared-templates/story-state-contract.md` §11a four-layer model — STCHAR is **durable authority** that explains *why* a present-causal record matters, distinct from the present-causal trigger that *introduces* a relationship. Phase-4-5 turn-cycle guidance ("reach for the direct cause … a relationship shift driven by an affective state derives from that STEMO") points at present-causal grounds (BEL/STEMO/SF/SREL), not durable authority.
4. FOUNDATIONS Rule 1 (no floating facts): a fresh relationship's `derived_from` should name the **present causal** ground. Under that principle the validator's exclusion of STCHAR for *introductions* is defensible — but then the **schema text is the bug** for inviting STCHAR unconditionally. Decision: scope §4.5.7's STCHAR allowance to bootstrap / superseded / ongoing relationship provenance and keep the validator strict for fresh mid-story introductions. This preserves §11a's durable-vs-present separation while leaving `record_schema_compliance` acceptance of STCHAR in SREL `derived_from[]` intact for non-introduction contexts.
5. THR exclusion: the validator omits THR from the allowed set. THR is an ongoing concern, not a present root cause, so its exclusion may be intentional; the **message** is the unambiguous bug regardless of the THR class decision.
6. Shared boundary under audit: the `SREL.derived_from` contract across (a) SREL schema §4.5.7, (b) the `relationship_introduction_grounding_integrity` allowed-class set, (c) phase-4-5 turn-cycle grounding guidance, and (d) active STCHAR runtime-authority prose in turn-cycle / health-audit guidance. Other introduction-grounding validators with similar wording are left out of scope unless they produce the same SREL-specific false active-ness claim; this ticket owns the relationship introduction diagnostic.
7. `tools/validators/package.json` confirms `npm test` runs `npm run build` before `node --test dist/tests/**/*.test.js`; pre-edit baseline on 2026-05-29 passed. Ignored package artifacts already existed: `tools/validators/dist/` and `tools/validators/node_modules/`.
8. `tools/validators/README.md` lists the validator by name only; no same-seam diagnostic wording or class-set prose needed updating there.

## Architecture Check

1. Splitting the old combined grounding condition into two distinct verdicts (`grounding_class_not_allowed` vs `grounding_not_active_or_same_event`) makes the failure self-explanatory and removes false "not active" claims — cleaner than a single conflated message.
2. Scoping the schema text to match the validator (option a) preserves the §11a durable/present separation without a compatibility shim; no alias path introduced.

## Verification Layers

1. Schema text matches validator -> FOUNDATIONS/§11a alignment check + codebase grep-proof: §4.5.7 STCHAR allowance is scoped to match `ALLOWED_GROUNDING_PREFIXES` (or the set is widened to include STCHAR).
2. Message correctness -> focused structural validator test: a fresh SREL with a disallowed-class active record (e.g., THR) yields a class-not-allowed verdict, not a "not parent-active" verdict.
3. Happy path -> focused structural validator test: a fresh SREL grounded in a present-causal record (BEL/STEMO) passes.

## Landed Changes

### 1. Reconciled schema and validator
Scoped `story-record-schemas.md` §4.5.7 STCHAR-in-`derived_from` allowance to bootstrap / superseded / ongoing relationships, and stated that **freshly-introduced mid-story** SREL `derived_from` must name a present-causal record (per the introduction validator). `STCHAR` was not added to `ALLOWED_GROUNDING_PREFIXES`.

### 2. Split the conflated verdict
In `relationship-introduction-grounding-integrity.ts`, separated `!isAllowedGroundingId` from `!activeOrCreatedGroundingIds.has` into two distinct codes/messages so an active-but-disallowed-class entry is described accurately.

### 3. THR remains disallowed for fresh SREL introduction grounding
Keep THR out of the allowed set. THR is an ongoing concern rather than the direct present-causal record that makes a fresh relationship axis lawful. The owned fix is the diagnostic split so an active THR reports as a disallowed class, not as inactive.

## Files to Touch

- `tools/validators/src/structural/relationship-introduction-grounding-integrity.ts` (modify)
- `.claude/skills/_shared-templates/story-record-schemas.md` (modify, §4.5.7)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify STCHAR/SREL runtime-authority summary)
- `.claude/skills/branching-story-turn-cycle/references/governance-and-foundations.md` (modify STCHAR/SREL runtime-authority summary)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify STCHAR/SREL audit wording)
- `tools/validators/tests/structural/relationship-introduction-grounding-integrity.test.ts` (modify)

## Out of Scope

- Widening allowed grounding classes for non-introduction (supersession) SREL validation.
- Changes to other introduction validators beyond the SREL-specific message split.

## Acceptance Criteria

### Tests That Must Pass

1. Fresh SREL grounded only in STCHAR fails consistently with the reconciled schema text — and the SREL schema §4.5.7 no longer invites a rejected entry for fresh mid-story introductions.
2. Fresh SREL grounded in an active THR yields a distinct "class not allowed" verdict, never "not parent-active or same-event-created."
3. `cd tools/validators && npm test`.

### Invariants

1. SREL schema §4.5.7, turn-cycle guidance, health-audit guidance, and `ALLOWED_GROUNDING_PREFIXES` agree that STCHAR is lawful broad SREL provenance for bootstrap / supersession / ongoing contexts, but not a fresh mid-story introduction grounding class.
2. No introduction-grounding verdict claims a record is "not parent-active" when it is parent-active.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/relationship-introduction-grounding-integrity.test.ts` relationship-introduction-grounding case: active-but-disallowed-class THR entry -> class-not-allowed verdict (asserts the message split).
2. `tools/validators/tests/structural/relationship-introduction-grounding-integrity.test.ts` STCHAR-in-SREL-derived_from introduction case matching the reconciled schema decision.

### Commands

1. `cd tools/validators && npm run build`
2. `cd tools/validators && node --test dist/tests/structural/relationship-introduction-grounding-integrity.test.js`
3. `cd tools/validators && npm test`
4. The validator unit test is the correct primary boundary because the contradiction is internal to the validator/schema pair and reproducible without a full bundle; a world-mcp CLI smoke is not required because this ticket does not change envelope construction, handler wiring, or pre-apply overlay materialization.

## Outcome

Completed. Fresh mid-story SREL introductions now distinguish disallowed grounding classes from allowed-but-inactive grounding records. STCHAR remains valid broad SREL provenance for bootstrap / supersession / ongoing relationship contexts, but active shared prose now says fresh mid-story introductions must derive from the present-causal record and carry STCHAR rationale in event / scene-plan rationale instead.

## Verification Result

1. `cd tools/validators && npm test` — pre-edit baseline passed on 2026-05-29 (`1062` pass, `0` fail).
2. `cd tools/validators && npm run build` — passed after implementation.
3. `cd tools/validators && node --test dist/tests/structural/relationship-introduction-grounding-integrity.test.js` — passed after implementation (`13` tests, `0` fail), including STCHAR rejection and active THR class-not-allowed diagnostics.
4. `cd tools/validators && npm test` — passed after implementation (`1063` tests, `0` fail).
5. Stale-anchor review over validator/source/skill/doc/ticket surfaces found only historical intake evidence in this ticket, archived/triage provenance, intentionally unchanged bootstrap guidance for initial SREL records, and out-of-scope similar wording in non-SREL validators.

## Deviations

1. Same-seam active prose widened from the draft file list: turn-cycle runtime-authority summaries and health-audit STCHAR/SREL wording were truthed so active skills do not imply fresh mid-story SREL introductions should put STCHAR in `derived_from[]`.
2. The drafted world-mcp `validate-patch-plan` smoke was not run. The accepted boundary is the validators package build, focused structural test, full package suite, and manual contract/stale-anchor review because this ticket did not change envelope construction, handler wiring, or pre-apply overlay materialization.
3. Similar combined "allowed parent-active or same-event-created" wording in `thread_introduction_grounding_integrity` and `turn_cycle_output_grounding_integrity` is out of scope; the reproduced false active-ness defect and new code are specific to fresh SREL introduction grounding.
