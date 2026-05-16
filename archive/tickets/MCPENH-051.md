# MCPENH-051: Correct `ACTIVE_RULES['canon_addition']` rule names and enumeration to match FOUNDATIONS Validation Rules

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/context-packet/governing-world-context.ts` (modify); `tools/world-mcp/tests/context-packet/active-rules-foundations-alignment.test.ts` (new)
**Deps**: None

## Problem

Before this ticket, during the 2026-05-16 CF-10 (platform-mediated cam-creator economy) canon-addition run for `worlds/erotica-world/`, `mcp__worldloom__get_context_packet(task_type='canon_addition', world_slug='erotica-world', seed_nodes=[23 ids], token_budget=14000)` returned `governing_world_context.active_rules` AND `governing_summary.active_rules` both equal to the literal string array:

```
["Rule 1: no floating facts",
 "Rule 2: preserve causal integrity",
 "Rule 7: preserve Mystery Reserve deliberately"]
```

Two structural defects:

**(a) Rule 2 was misnamed.** `docs/FOUNDATIONS.md` §Validation Rules carries the canonical text `### Rule 2: No Pure Cosmetics`. "Preserve causal integrity" is not a paraphrase of Rule 2 — it sounds like a CAU-class invariant description (per FOUNDATIONS §Invariants > Causal Invariants: "How causes and effects behave") misattached to a Validation Rule number. The text was wrong, not just imprecise; no FOUNDATIONS Validation Rule says "preserve causal integrity."

**(b) Enumeration was under-scoped.** `ACTIVE_RULES['canon_addition']` enumerated 3 rules (1, 2, 7). Canon-addition's own Procedure step 8 (Phase 14a Validation) explicitly enforces "Rules 1, 2, 4, 5, 6, 7, 11, 12" — 8 rules. Sibling task_types in the same `ACTIVE_RULES` table enumerate 5-6 rules (e.g., `emergent_pressure_events` enumerates Rules 2, 4, 5, 7 plus a header; `story_fact_promotion_to_canon` enumerates Rules 1, 4, 6, 7, 12 plus a header). Canon_addition's old 3-entry list was an under-enumeration outlier — Rules 4, 5, 6, 11, 12 were absent despite being load-bearing in canon-addition's 14-test checklist.

The combined defect could have misled a future canon-addition operator who queries the packet's `active_rules` without independently cross-checking FOUNDATIONS: they could record a wrong Rule 2 rationale in the Phase 14a checklist (citing "causal integrity" when the test should cite "no pure cosmetics"), or skip Rules 4, 5, 6, 11, 12 entirely if they trust the packet's enumeration as canonical. The operator in the intake session cross-checked independently via the in-session FOUNDATIONS Read at the skill-audit phase, so canon-addition's CF-10 output was unaffected.

## Assumption Reassessment (2026-05-16)

1. `tools/world-mcp/src/context-packet/governing-world-context.ts` defines `ACTIVE_RULES: Record<TaskType, string[]>` and returns `active_rules: ACTIVE_RULES[taskType]` to the packet. The `canon_addition` entry now enumerates the corrected 8-rule list; before this ticket it contained the misnaming and under-enumeration documented in Problem.
2. `docs/FOUNDATIONS.md` §Validation Rules carries the canonical Rule 2 name `### Rule 2: No Pure Cosmetics` and the full Rule Numbering and Enforcement Map (Rules 1, 2, 3, 4, 5, 6, 7, 11, 12 with intentional gap at 8, 9, 10 per the rule-numbering paragraph immediately preceding the map).
3. Shared boundary under audit: the contract between `get_context_packet` (provider, at `tools/world-mcp/src/context-packet/governing-world-context.ts` — same file owns the `ACTIVE_RULES` table that materializes the contract) and `task_type='canon_addition'` consumers (canon-addition skill's Procedure step 8 Phase 14a Validation Checklist with 14 tests covering Rules 1, 2, 4, 5, 6, 7 mechanical + judgment layers plus Tests 11, 12 for Rules 11, 12). The shared schema is the `active_rules` string-array field returned in `governing_world_context.active_rules` and `governing_summary.active_rules` (the persisted-with-summary fallback shape carries the same string array, so the fix lands at both surfaces with a single source edit).
4. FOUNDATIONS principle motivating this ticket: §Tooling Recommendation — *"LLM agents should never operate on prose alone. They should always receive — directly or via the documented context-packet + targeted-retrieval pattern — current World Kernel, current Invariants, relevant canon fact records, affected domain files, unresolved contradictions list, mystery reserve entries touching the same domain. This is non-negotiable."* The packet's `active_rules` field is part of the "current Invariants" governing-context layer the §Tooling Recommendation commits to delivering; misnaming a FOUNDATIONS Validation Rule in that field breaks the non-negotiable truthfulness commitment that the documented context-packet pattern rests on. Operators downstream of the packet treat its content as authoritative governing context — wrong rule names propagate into downstream artifacts (canon-addition's Phase 14a checklist, the PA `body_markdown`'s Validation Checklist section) where they become indirect evidence of FOUNDATIONS rule semantics.
5. Existing output schema extended: the `ACTIVE_RULES: Record<TaskType, string[]>` table per-task_type string array IS the schema. The change for `canon_addition` is both additive (adding Rules 4, 5, 6, 11, 12 entries) AND corrective (re-texting the existing Rule 2 entry). Consumers: every skill task_type that reads the packet's `active_rules` field (currently every canon-pipeline-adjacent and canon-mutating skill that calls `get_context_packet`); canon-addition is the only consumer with session-evidenced verification this audit. Additive entries are safe (no consumer breaks when receiving MORE rule strings); the Rule-2 re-text is a correction of a literal data error — the prior "Rule 2: preserve causal integrity" text was not a documented intentional paraphrase but a misnamed rule entry, so no consumer relied on the wrong text (any consumer that DID rely on it was getting wrong data and silently making wrong decisions; correcting the data is unambiguously additive at the correctness layer).
6. Adjacent contradictions exposed during reassessment — same `ACTIVE_RULES` table has consistent rule-paraphrase drift across multiple OTHER task_types not exercised in this session: `emergent_pressure_events[1]` says "Rule 2: visible consequences are required" (Rule 2 is "No Pure Cosmetics"; "visible consequences are required" is closer to Rule 5 "No Consequence Evasion"); `canon_facts_from_diegetic_artifacts[1]` says "Rule 5: separate diegetic claims from world-level truth" (Rule 5 is "No Consequence Evasion"; the diegetic-separation statement is the skill's prose, not Rule 5's substance); `commitment_block_authoring[4]` says "Rule 6: storylet records remain append-only by new allocation" (Rule 6 is "No Silent Retcons"; append-only-by-new-allocation is a consequence of Rule 6 applied to story-bundle records, not Rule 6's statement); `story_fact_promotion_to_canon[5]` says "Rule 12: hard-canon promotions need redundant support" (Rule 12 is "No Single-Trace Truths"; the redundant-support is Rule 12 applied to promotions, not Rule 12's name). Multiple uses of "Rule 4: distribution discipline" — Rule 4 is "No Globalization by Accident" and "distribution discipline" is a fair short-hand of Rule 4's distribution-related substance, less defective than the others. **Classification**: future cleanup that must become its own ticket. Out of session-evidence scope for THIS ticket per the §Twofold evidence guardrail (only `canon_addition` was exercised this session). A follow-up `/mcp-integration-audit` invocation on any of those skills would surface their entries as session-evidenced findings; alternatively a pre-emptive sweep ticket could be filed without per-task_type session evidence if the operator judges the table-wide alignment audit valuable on its own merits. The ticket-shape would mirror this one (per-entry text corrections at the source table) but the scope decision belongs to a separate ticket.
7. Live package proof shape correction: `tools/world-mcp/package.json` defines `npm test` as `npm run build && node --test "dist/tests/**/*.test.js"`. Passing a source `.ts` path through `npm test -- tests/context-packet/active-rules-foundations-alignment.test.ts` would append an uncompiled TypeScript path to the compiled broad lane. The truthful targeted proof is `npm run build` from `tools/world-mcp`, followed by `node --test dist/tests/context-packet/active-rules-foundations-alignment.test.js`; the broad regression proof remains package-root `npm test`. Pre-edit baseline `npm test` passed with 366 passing tests.

## Architecture Check

1. Direct text correction + enumeration extension at the source-of-truth table (`ACTIVE_RULES` in `governing-world-context.ts`) is the cleanest fix — the table IS the canonical schema for what rules apply per task_type, and aligning it with FOUNDATIONS' own rule numbering eliminates the divergence at the source. Alternatives (e.g., adding a `getActiveRules(taskType)` helper that runtime-translates short-hands to FOUNDATIONS-canonical names, or adding a validation layer that asserts the table matches FOUNDATIONS at startup) would introduce indirection without solving the underlying data correctness problem at the table itself, leaving the wrong literal text visible to any direct source reader.
2. No backwards-compatibility shims. The prior "Rule 2: preserve causal integrity" text was wrong, not a documented intentional paraphrase; no consumer relied on the literal value (any consumer that DID rely on it was being silently misled), so re-texting is a straight data correction with no migration concern. The additive entries (Rules 4, 5, 6, 11, 12) are net-new strings — consumers receiving them either render them as additional rule citations (the intended behavior) or ignore them (existing behavior unchanged).

## Verification Layers

1. `ACTIVE_RULES['canon_addition']` enumerates Rules 1, 2, 4, 5, 6, 7, 11, 12 with canonical FOUNDATIONS names → codebase grep-proof: targeted grep against `tools/world-mcp/src/context-packet/governing-world-context.ts` block shows exactly 8 entries matching FOUNDATIONS canonical names.
2. The Rule 2 entry text matches the FOUNDATIONS canonical name → codebase grep-proof: `grep -E "Rule 2: no pure cosmetics" tools/world-mcp/src/context-packet/governing-world-context.ts` returns ≥1 hit AND `grep -n "preserve causal integrity" tools/world-mcp/src/` returns 0 hits.
3. A new packet-construction test asserts the `canon_addition` packet's `active_rules` field returns the corrected 8-entry list with the literal FOUNDATIONS-canonical text per entry → schema validation via `tools/world-mcp/tests/context-packet/active-rules-foundations-alignment.test.ts` against a fixture world.
4. FOUNDATIONS alignment check: each entry in `ACTIVE_RULES['canon_addition']` cites a FOUNDATIONS Validation Rule number (1, 2, 4, 5, 6, 7, 11, 12) whose canonical text at `docs/FOUNDATIONS.md` §Validation Rules matches the entry's substantive prose (modulo punctuation and case) → manual review against FOUNDATIONS §Validation Rules table.

## Landed Changes

### 1. Corrected `ACTIVE_RULES['canon_addition']` entry in `governing-world-context.ts`

At `tools/world-mcp/src/context-packet/governing-world-context.ts`, replaced the old 3-entry array:

```typescript
canon_addition: [
  "Rule 1: no floating facts",
  "Rule 2: preserve causal integrity",
  "Rule 7: preserve Mystery Reserve deliberately"
],
```

with the corrected and extended 8-entry array matching canon-addition's Procedure step 8 Phase 14a Validation Checklist enforcement:

```typescript
canon_addition: [
  "Rule 1: no floating facts",
  "Rule 2: no pure cosmetics",
  "Rule 4: no globalization by accident",
  "Rule 5: no consequence evasion",
  "Rule 6: no silent retcons",
  "Rule 7: preserve Mystery Reserve deliberately",
  "Rule 11: no spectator castes by accident",
  "Rule 12: no single-trace truths"
],
```

Each entry's text matches FOUNDATIONS §Validation Rules rule canonical names, modulo trailing punctuation and case normalization to match the existing array's lowercase convention.

### 2. Added a test asserting `ACTIVE_RULES['canon_addition']` content correctness

Added `tools/world-mcp/tests/context-packet/active-rules-foundations-alignment.test.ts`. The test:

- Calls the packet-assembly path against a minimal temp fixture world with `task_type: 'canon_addition'`, a minimal `seed_nodes` list, and a large test budget.
- Asserts the returned `governing_world_context.active_rules` array contains all 8 expected rule strings from canon-addition's Phase 14a checklist enforcement, with the literal FOUNDATIONS-canonical text per entry (deep-equals against the canonical 8-string list).
- Asserts the prior buggy text "Rule 2: preserve causal integrity" is absent from the returned array (regression guard against accidental reversion).
- Asserts `governing_summary.active_rules` (the persisted-with-summary fallback shape) carries the same 8 strings, since both surfaces are populated from the same `ACTIVE_RULES['canon_addition']` table entry.

## Files to Touch

- `tools/world-mcp/src/context-packet/governing-world-context.ts` (modify)
- `tools/world-mcp/tests/context-packet/active-rules-foundations-alignment.test.ts` (new)

## Out of Scope

- Corrections to OTHER task_types' `ACTIVE_RULES` entries (`emergent_pressure_events`, `canon_facts_from_diegetic_artifacts`, `commitment_block_authoring`, `story_fact_promotion_to_canon`, others). Surfaced as adjacent contradiction per Assumption Reassessment item 6; out of session-evidence scope for THIS ticket per the §Twofold evidence guardrail. Future cleanup belongs in its own ticket (per-skill-audit-driven OR a pre-emptive sweep ticket).
- Changes to the `ACTIVE_RULES` table's structure / schema / type signature — additive entries fit the existing `Record<TaskType, string[]>` shape; this ticket does not introduce a new typed-rule schema, an enum, or any structural refactor.
- FOUNDATIONS document edits — current Rule names are the source of truth this ticket aligns the MCP table TO, not the inverse direction. Per `/mcp-integration-audit` Guardrails §No FOUNDATIONS edits, this skill never edits FOUNDATIONS; if a future audit determined FOUNDATIONS' rule names themselves needed revision, that work would route through a separate `FOUNDATIONS-NNN` ticket.
- Changes to `REQUIRED_OUTPUT_SCHEMA`, `PROHIBITED_MOVES`, `GOVERNING_FILE_PATHS`, or `GOVERNING_ATOMIC_NODE_TYPES` (the sibling registries in `governing-world-context.ts`). F1's gap is scoped to `ACTIVE_RULES` only; the sibling tables were not audited this session and are not under verification scope for this ticket.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "Rule [0-9]+:" tools/world-mcp/src/context-packet/governing-world-context.ts` shows the `canon_addition` block enumerates Rules 1, 2, 4, 5, 6, 7, 11, 12 with the canonical FOUNDATIONS names listed in Landed Changes item 1.
2. `grep -rn "preserve causal integrity" tools/world-mcp/src/` returns 0 hits across the package source tree.
3. From `tools/world-mcp`, `npm run build` followed by `node --test dist/tests/context-packet/active-rules-foundations-alignment.test.js` passes (new test asserts the corrected 8-entry list at both `governing_world_context.active_rules` and `governing_summary.active_rules` surfaces).
4. From `tools/world-mcp`, `npm test` full suite passes (no regression of existing context-packet tests including `packet-class-filter.test.ts` and `harness-ceiling.test.ts`).

### Invariants

1. Every entry in `ACTIVE_RULES['canon_addition']` cites a FOUNDATIONS Validation Rule number (1, 2, 4, 5, 6, 7, 11, 12 — matching the gap-preserving numbering at `docs/FOUNDATIONS.md` §Validation Rules) whose substantive text at FOUNDATIONS §Validation Rules matches the entry's prose, modulo punctuation and case normalization to the table's existing lowercase convention.
2. `ACTIVE_RULES['canon_addition']` enumerates the same rule set canon-addition's Procedure step 8 Phase 14a Validation Checklist enforces (currently 8 rules: Rules 1, 2, 4, 5, 6, 7, 11, 12), without omission. If canon-addition's Phase 14a checklist evolves in a future ticket to add or remove a rule, this table's `canon_addition` entry must update in lockstep — the test in item 3 of Tests That Must Pass is the regression surface for the alignment.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/context-packet/active-rules-foundations-alignment.test.ts` — new test file. Asserts `ACTIVE_RULES['canon_addition']` correctness against FOUNDATIONS canonical rule names AND enumeration completeness against canon-addition Phase 14a enforcement; includes a regression guard against the prior "Rule 2: preserve causal integrity" string.

### Commands

1. `grep -nE "Rule [0-9]+:" tools/world-mcp/src/context-packet/governing-world-context.ts` (verify ACTIVE_RULES table content post-fix)
2. `grep -rn "preserve causal integrity" tools/world-mcp/src/` (verify regression-source absent)
3. `cd tools/world-mcp && npm run build`
4. `cd tools/world-mcp && node --test dist/tests/context-packet/active-rules-foundations-alignment.test.js` (targeted new-test run)
5. `cd tools/world-mcp && npm test` (full-suite regression check)

## Outcome

Completed 2026-05-16. `ACTIVE_RULES['canon_addition']` now returns the FOUNDATIONS-aligned rule list for Rules 1, 2, 4, 5, 6, 7, 11, and 12. The prior `"Rule 2: preserve causal integrity"` string was removed from `tools/world-mcp/src/`. The new context-packet test asserts the corrected list on both `governing_world_context.active_rules` and the persisted-with-summary `governing_summary.active_rules` fallback.

## Verification Result

1. `cd tools/world-mcp && npm test` pre-edit baseline passed: 366 passing tests.
2. `cd tools/world-mcp && npm run build` passed.
3. `cd tools/world-mcp && node --test dist/tests/context-packet/active-rules-foundations-alignment.test.js` passed: 2 passing tests.
4. `grep -nE "Rule [0-9]+:" tools/world-mcp/src/context-packet/governing-world-context.ts` showed the corrected `canon_addition` block at lines 110-117 with Rules 1, 2, 4, 5, 6, 7, 11, and 12.
5. `grep -rn "preserve causal integrity" tools/world-mcp/src` returned exit code 1 with no output, the expected no-match proof.
6. `grep -n "Rule 2: no pure cosmetics" tools/world-mcp/src/context-packet/governing-world-context.ts` returned the corrected Rule 2 entry.
7. `cd tools/world-mcp && npm test` final regression passed: 368 passing tests.

## Deviations

- The drafted targeted command `npm --prefix tools/world-mcp test -- tests/context-packet/active-rules-foundations-alignment.test.ts` was replaced with the package-truthful compiled proof: `cd tools/world-mcp && npm run build`, then `cd tools/world-mcp && node --test dist/tests/context-packet/active-rules-foundations-alignment.test.js`.
- Direct post-landing `mcp__worldloom__get_context_packet(...)` smoke was not exercised; package-local handler/assembler tests are the accepted proof because this run did not prove a rebuilt/restarted live MCP session.
- Other task types' `ACTIVE_RULES` paraphrase drift remains out of scope as recorded in Assumption Reassessment item 6.
