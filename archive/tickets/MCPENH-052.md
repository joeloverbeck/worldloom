# MCPENH-052: Audit and correct `ACTIVE_RULES` cross-task_type rule-paraphrase drift against FOUNDATIONS Validation Rule canonical names

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-mcp/src/context-packet/governing-world-context.ts` (modify); `tools/world-mcp/tests/context-packet/active-rules-foundations-alignment.test.ts` (extend; created by MCPENH-051)
**Deps**: `archive/tickets/MCPENH-051.md`

## Problem

At intake, this ticket was a **Phase-5-surfaced sweep follow-up** to MCPENH-051 (the canon_addition rule-name correction). At Phase 5 verification of MCPENH-051, the operator read `tools/world-mcp/src/context-packet/governing-world-context.ts` to confirm the canon_addition gap was genuinely present, and incidentally exposed the same defect class — rule entries that misname FOUNDATIONS Validation Rules — in multiple OTHER task_types' `ACTIVE_RULES` entries. The drift was documented in MCPENH-051's Assumption Reassessment item 6 as adjacent contradictions classified as "future cleanup that must become its own ticket." Per the operator's judgment-call authorization at the /mcp-integration-audit Phase 8 final summary (where the user invited a sweep ticket without requiring per-task_type Phase 2 session evidence), this ticket filed that follow-up.

The audit-evidence shape for this ticket was intentionally narrower than MCPENH-051: it lacked per-task_type Phase 2 session evidence (none of `emergent_pressure_events`, `canon_facts_from_diegetic_artifacts`, `commitment_block_authoring`, `story_fact_promotion_to_canon`, or the story-pipeline task_types were exercised in the intake session), but Phase 5 codebase verification grep against the source-of-truth file confirmed each defect was present before this ticket. The /mcp-integration-audit §Twofold evidence guardrail was satisfied for the codebase-verification leg; the session-evidence leg was satisfied indirectly via MCPENH-051's intake session (the operator's Phase 5 read incidentally surfaced the pattern), with operator-judgment-call authorization to file as a preemptive sweep rather than waiting for each task_type to be audit-targeted independently.

**Specific HARD-WRONG entries observed before this ticket** (rule number mapped to a substantively different FOUNDATIONS rule):

- `ACTIVE_RULES['emergent_pressure_events'][1]` = `"Rule 2: visible consequences are required"` — Rule 2 is "No Pure Cosmetics" per FOUNDATIONS §Validation Rules. "Visible consequences are required" is the substance of Rule 5 ("No Consequence Evasion"), not Rule 2. The entry attaches Rule 5's substance to Rule 2's number — a literal misnomer.
- `ACTIVE_RULES['canon_facts_from_diegetic_artifacts'][1]` = `"Rule 5: separate diegetic claims from world-level truth"` — Rule 5 is "No Consequence Evasion." "Separate diegetic claims from world-level truth" is the skill's domain-specific framing — closer to a §Acceptance Tests / "What contradictions are permitted because they are diegetic rather than ontological?" concern than to Rule 5's "If a new fact has obvious second-order effects, either integrate them or explicitly explain why they do not manifest" substance. Like the prior case, it attaches a non-Rule-5 concept to the Rule 5 number.

**Soft paraphrases observed before this ticket** (rule number was correct; prose was a skill-specific application or fair short-hand rather than the canonical name):

- Multiple uses of `"Rule 4: distribution discipline"` (in `character_generation[0]`, `propose_new_characters[1]`, `story_bootstrap[2]`, `story_turn_cycle[2]`, `commitment_block_authoring[2]`, `branching_story_health_audit[2]`, `story_fact_promotion_to_canon[2]`) — Rule 4 is "No Globalization by Accident"; "distribution discipline" is a fair short-hand of Rule 4's distribution-related substance, less defective than the HARD-WRONG cases above.
- `commitment_block_authoring[4]` = `"Rule 6: storylet records remain append-only by new allocation"` — Rule 6 is "No Silent Retcons"; append-only-by-new-allocation is the means of Rule-6 compliance applied to story-bundle records, not Rule 6's statement.
- `story_fact_promotion_to_canon[5]` = `"Rule 12: hard-canon promotions need redundant support"` — Rule 12 is "No Single-Trace Truths"; redundant-support is the means of Rule-12 compliance applied to promotions.
- `story_bootstrap[1]` / `story_turn_cycle[1]` / `commitment_block_authoring[1]` / `branching_story_health_audit[1]` / `story_fact_promotion_to_canon[1]` all use `"Rule 1: imported facts must cite world authority"` (or near-variants) — Rule 1 is "No Floating Facts"; the imported-facts-cite-world-authority statement is the story-pipeline application of Rule 1's domain/scope/prerequisites/limits/consequences requirement.
- `story_turn_cycle[5]` = `"Rule 6: story state changes remain append-only by supersession"` and `story_fact_promotion_to_canon[3]` = `"Rule 6: promotion must preserve visible change lineage"` — both are application-paraphrases of Rule 6's "All canon changes must be logged with justification" substance.
- `emergent_pressure_events[3]` = `"Rule 5: separate candidate events from world-level truth"` and several other Rule 5 variants — same pattern as the HARD-WRONG Rule 5 entry above; these are application-paraphrases that attach Rule-5's number to a skill-specific framing rather than Rule 5's actual "No Consequence Evasion" substance. Operator judgment: this might escalate to HARD-WRONG if interpreted strictly (the Rule-5 number is being used for "separation of provisional from canonical" semantics that don't map to consequence-evasion), or could be tolerated as application-paraphrase.

The downstream impact is the same defect class MCPENH-051 documented for canon_addition: a future operator querying the packet's `active_rules` field for these task_types without independently cross-checking FOUNDATIONS could be misled about what rule a given entry actually cites — most dangerously when the same FOUNDATIONS rule number is referenced in multiple skills' tables with different substantive prose, masking which skill is actually invoking which FOUNDATIONS rule.

## Assumption Reassessment (2026-05-16)

1. `tools/world-mcp/src/context-packet/governing-world-context.ts` defines `ACTIVE_RULES: Record<TaskType, string[]>`. Reassessment confirmed the HARD-WRONG entries (`emergent_pressure_events[1]`, `canon_facts_from_diegetic_artifacts[1]`) and soft paraphrases listed in Problem were present before this ticket. The post-MCPENH-051 state of `canon_addition` already enumerated the corrected 8-rule list; MCPENH-052's source edit left that entry unchanged.
2. `docs/FOUNDATIONS.md` §Validation Rules defines the canonical Rule names: Rule 1 "No Floating Facts", Rule 2 "No Pure Cosmetics", Rule 3 "No Specialness Inflation", Rule 4 "No Globalization by Accident", Rule 5 "No Consequence Evasion", Rule 6 "No Silent Retcons", Rule 7 "Preserve Mystery Deliberately", Rule 11 "No Spectator Castes by Accident", Rule 12 "No Single-Trace Truths". The Rule Numbering and Enforcement Map enumerates the per-rule enforcement surface (validator file + skill review pairs); each task_type's `ACTIVE_RULES` entry should align with both the canonical Rule name AND the rule numbers the skill actually enforces per its own FOUNDATIONS Alignment table.
3. Shared boundary under audit: the same contract MCPENH-051 documented for canon_addition — between `get_context_packet` (provider, at `tools/world-mcp/src/context-packet/governing-world-context.ts`) and each `task_type`'s consumer (the corresponding skill's FOUNDATIONS Alignment table and Validation-Rules-this-skill-upholds discipline). The shared schema is the same `active_rules` string-array field returned in `governing_world_context.active_rules` and `governing_summary.active_rules`. This ticket extends the boundary to ALL non-canon_addition task_types in the table.
4. FOUNDATIONS principle motivating this ticket: §Tooling Recommendation — the same "non-negotiable" truthfulness commitment MCPENH-051 cited. The packet's `active_rules` field is part of the governing-context layer the §Tooling Recommendation commits to delivering; misnaming a FOUNDATIONS Validation Rule in that field — for ANY task_type — breaks the truthfulness commitment. The defect class is identical to MCPENH-051's; this ticket extends the correction to the remaining table entries.
5. Existing output schema extended: the `ACTIVE_RULES: Record<TaskType, string[]>` table per-task_type string array IS the schema. Changes for the listed task_types were corrective re-texts to make each numbered entry start with the canonical FOUNDATIONS Rule name. This run chose Policy B using ASCII `" - "` separators: `"Rule N: <canonical-name> - <skill-specific application>"`. Non-rule disciplines such as diegetic-to-world laundering remain unnumbered so they do not masquerade as FOUNDATIONS Validation Rules. Consumers: every skill task_type that reads the packet's `active_rules` field. Additive/re-texted entries are safe because the prior wrong strings were literal data errors, not compatibility contracts.
6. Adjacent contradictions exposed during reassessment — Phase 5 of MCPENH-051 also surfaced that the *sibling* registries in the same file (`REQUIRED_OUTPUT_SCHEMA`, `PROHIBITED_MOVES`, `GOVERNING_FILE_PATHS`, `GOVERNING_ATOMIC_NODE_TYPES`) may have parallel drift patterns — their per-task_type entries were not audited during MCPENH-051's Phase 5 (the grep scope was narrowed to `ACTIVE_RULES`-related lines). **Classification**: future cleanup that must become its own ticket — out of session-evidence scope for THIS ticket too, since the per-task_type Phase 2 session evidence requirement applies symmetrically. A targeted Phase 5 grep against the sibling registries would be the natural next step; the ticket-shape would mirror MCPENH-051 / MCPENH-052 (per-entry text correction at the source registry). The scope decision belongs to a separate ticket; this ticket is bounded to `ACTIVE_RULES` to match MCPENH-051's surface.
7. Package proof shape verified: `tools/world-mcp/package.json` defines `npm test` as `npm run build && node --test "dist/tests/**/*.test.js"`. The pre-edit baseline `npm test` passed with 368 passing tests. The new all-task-type test uses the existing story-bundle fixture and passes `story_slug` for story-pipeline task types because the live `get_context_packet` argument contract requires it.

## Architecture Check

1. Same architectural reasoning as MCPENH-051: direct text correction at the source-of-truth `ACTIVE_RULES` table is the cleanest fix. The defect class is identical (rule-name misnaming + optional enumeration under-scoping); applying the same fix-shape across the table at the same source file gives consistent semantics for all consumers without indirection. Filing as a single sweep ticket rather than per-task_type tickets batches the implementation work cleanly (one source file edit + parallel test extension) and lands the fix atomically rather than as a drip-feed of /mcp-integration-audit follow-ups.
2. No backwards-compatibility shims. The HARD-WRONG entries' prior text was wrong, not a documented intentional paraphrase; no consumer relied on the literal misnamed values. The soft-paraphrase entries were upgraded with canonical prefixes plus application clauses, which is forward-compatible with consumers that read the array as opaque strings.

## Verification Layers

1. `ACTIVE_RULES['emergent_pressure_events']` and `ACTIVE_RULES['canon_facts_from_diegetic_artifacts']` HARD-WRONG entries are corrected → codebase grep-proof: `if grep -nE "Rule 2: visible consequences are required|Rule 5: separate diegetic claims" tools/world-mcp/src/context-packet/governing-world-context.ts; then exit 1; fi` passes with no output.
2. Soft-paraphrase entries use Policy B canonical prefixes → codebase grep-proof: `grep -nE "Rule [0-9]+:" tools/world-mcp/src/context-packet/governing-world-context.ts` plus manual review against the canonical Rule names enumerated in Assumption Reassessment item 2.
3. The test created by MCPENH-051 (`tools/world-mcp/tests/context-packet/active-rules-foundations-alignment.test.ts`) asserts correctness for every task type in `TASK_TYPES` → schema validation. The extension covers expected canonical Rule names, regression guards against the prior HARD-WRONG strings, and Policy-B canonical-prefix correctness.
4. FOUNDATIONS alignment check: each numbered entry in each affected `ACTIVE_RULES['<task_type>']` cites a FOUNDATIONS Validation Rule number whose canonical text at `docs/FOUNDATIONS.md` §Validation Rules matches the entry's prefix → manual review against FOUNDATIONS §Validation Rules table.

## Landed Changes

### 1. Corrected HARD-WRONG entries in `governing-world-context.ts`

`emergent_pressure_events` now uses `"Rule 5: no consequence evasion - visible consequences are required"` for the visible-consequence rule and keeps candidate/canon separation as an unnumbered proposal-boundary discipline. `canon_facts_from_diegetic_artifacts` now keeps diegetic-to-world laundering as an unnumbered firewall entry rather than mislabeling it as Rule 5.

### 2. Addressed soft-paraphrase entries with Policy B

All numbered soft-paraphrase entries now begin with the canonical FOUNDATIONS Rule name and append skill-specific framing after `" - "`. A code comment above `ACTIVE_RULES` documents this convention for future contributors.

### 3. Extended the test created by MCPENH-051

`tools/world-mcp/tests/context-packet/active-rules-foundations-alignment.test.ts` now covers every `TASK_TYPES` entry through `getContextPacket`, asserts the full expected `active_rules` array per task type, guards against the two prior HARD-WRONG strings, and verifies every numbered entry starts with a FOUNDATIONS-defined canonical rule name.

### 4. (Out of scope for this ticket) Sibling registry sweep

`REQUIRED_OUTPUT_SCHEMA`, `PROHIBITED_MOVES`, `GOVERNING_FILE_PATHS`, and `GOVERNING_ATOMIC_NODE_TYPES` in the same file may have parallel drift patterns. Per Assumption Reassessment item 6, that audit is a future-cleanup follow-up — explicitly out of this ticket's scope.

## Files to Touch

- `tools/world-mcp/src/context-packet/governing-world-context.ts` (modify)
- `tools/world-mcp/tests/context-packet/active-rules-foundations-alignment.test.ts` (extend; created by MCPENH-051)

## Out of Scope

- Corrections to canon_addition's `ACTIVE_RULES` entry — already landed in MCPENH-051.
- Audit of the sibling registries (`REQUIRED_OUTPUT_SCHEMA`, `PROHIBITED_MOVES`, `GOVERNING_FILE_PATHS`, `GOVERNING_ATOMIC_NODE_TYPES`) — surfaced as adjacent contradiction per Assumption Reassessment item 6; out of scope for this ticket.
- FOUNDATIONS document edits — same rationale as MCPENH-051; current rule names are the source of truth this ticket aligns the MCP table TO.
- Changes to the `ACTIVE_RULES` table's type signature or structure — additive entries and text corrections fit the existing `Record<TaskType, string[]>` shape.
- Changes to per-skill FOUNDATIONS Alignment tables in the affected skills' `SKILL.md` files — the skills' own FOUNDATIONS Alignment tables are the truth this MCP table aligns TO, not the inverse.

## Acceptance Criteria

### Tests That Must Pass

1. `if grep -nE "Rule 2: visible consequences are required|Rule 5: separate diegetic claims" tools/world-mcp/src/context-packet/governing-world-context.ts; then exit 1; fi` returns 0 hits across the source file.
2. `grep -nE "Rule [0-9]+:" tools/world-mcp/src/context-packet/governing-world-context.ts` shows every `Rule N:` entry in `ACTIVE_RULES` cites a FOUNDATIONS-defined rule number with the canonical Policy-B prefix.
3. From `tools/world-mcp`, `npm run build` followed by `node --test dist/tests/context-packet/active-rules-foundations-alignment.test.js` passes (extended test covers all in-scope task_types).
4. From `tools/world-mcp`, `npm test` full suite passes (no regression of existing context-packet tests).

### Invariants

1. Every numbered entry in `ACTIVE_RULES['<task_type>']` (for every `<task_type>` in scope) cites a FOUNDATIONS Validation Rule number whose canonical text at `docs/FOUNDATIONS.md` §Validation Rules matches the entry's prefix.
2. The HARD-WRONG strings enumerated in Problem (Rule 2 / visible consequences; Rule 5 / separate diegetic claims) never reappear in this file — the post-MCPENH-052 test in Acceptance Criteria item 3 is the regression surface.
3. canon_addition's entry (the surface MCPENH-051 corrected) is unchanged by this ticket; the test created by MCPENH-051 continues to pass alongside the extended assertions added here.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/context-packet/active-rules-foundations-alignment.test.ts` — extended. Added all-task-type assertions covering HARD-WRONG-string regression guards, canonical-rule-number citation completeness, and Policy-B canonical-prefix correctness.

### Commands

1. `if grep -nE "Rule 2: visible consequences are required|Rule 5: separate diegetic claims" tools/world-mcp/src/context-packet/governing-world-context.ts; then exit 1; fi` (regression guard against HARD-WRONG strings)
2. `grep -nE "Rule [0-9]+:" tools/world-mcp/src/context-packet/governing-world-context.ts` (verify ACTIVE_RULES table content post-fix)
3. `cd tools/world-mcp && npm run build`
4. `cd tools/world-mcp && node --test dist/tests/context-packet/active-rules-foundations-alignment.test.js` (extended-test run)
5. `cd tools/world-mcp && npm test` (full-suite regression check)
6. `git diff --check`

## Outcome

Completed 2026-05-16. `ACTIVE_RULES` now uses canonical FOUNDATIONS Rule names as the prefix for every numbered `active_rules` entry across all task types, with skill-specific Policy-B application clauses after `" - "` where useful. The prior hard-wrong strings were removed from `governing-world-context.ts`, and diegetic/candidate separation disciplines remain unnumbered rather than being mislabeled as Rule 5.

## Verification Result

1. Pre-edit baseline `cd tools/world-mcp && npm test` passed: 368 passing tests.
2. `cd tools/world-mcp && npm run build` passed.
3. First targeted `cd tools/world-mcp && node --test dist/tests/context-packet/active-rules-foundations-alignment.test.js` exposed a test-request issue: story-pipeline task types require `story_slug`. The test was corrected to use the existing story-bundle fixture and pass `story_slug` for story-pipeline task types.
4. `cd tools/world-mcp && npm run build` passed after the test correction.
5. `cd tools/world-mcp && node --test dist/tests/context-packet/active-rules-foundations-alignment.test.js` passed: 3 passing tests.
6. `if grep -nE "Rule 2: visible consequences are required|Rule 5: separate diegetic claims" tools/world-mcp/src/context-packet/governing-world-context.ts; then exit 1; fi` passed with no output.
7. `grep -nE "Rule [0-9]+:" tools/world-mcp/src/context-packet/governing-world-context.ts` showed every numbered `ACTIVE_RULES` entry with the canonical FOUNDATIONS Rule name prefix.
8. `cd tools/world-mcp && npm test` passed: 369 passing tests.
9. `git diff --check` passed.

## Deviations

- Chose Policy B using ASCII `" - "` separators rather than an em dash, preserving canonical grep prefixes without introducing new Unicode punctuation into the TypeScript source.
- The optional direct external `mcp__worldloom__get_context_packet(...)` smoke was not exercised; the extended package test invokes the same `getContextPacket` path for every task type, including the affected `emergent_pressure_events` and `canon_facts_from_diegetic_artifacts` entries.
