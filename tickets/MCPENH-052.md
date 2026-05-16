# MCPENH-052: Audit and correct `ACTIVE_RULES` cross-task_type rule-paraphrase drift against FOUNDATIONS Validation Rule canonical names

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-mcp/src/context-packet/governing-world-context.ts` (modify); `tools/world-mcp/tests/context-packet/active-rules-foundations-alignment.test.ts` (extend; created by MCPENH-051)
**Deps**: `archive/tickets/MCPENH-051.md`

## Problem

This ticket is a **Phase-5-surfaced sweep follow-up** to MCPENH-051 (the canon_addition rule-name correction). At Phase 5 verification of MCPENH-051, the operator read `tools/world-mcp/src/context-packet/governing-world-context.ts` lines 108-194 to confirm the canon_addition gap was genuinely present at HEAD, and incidentally exposed the same defect class — rule entries that misname FOUNDATIONS Validation Rules — in multiple OTHER task_types' `ACTIVE_RULES` entries. The drift was documented in MCPENH-051's Assumption Reassessment item 6 as adjacent contradictions classified as "future cleanup that must become its own ticket." Per the operator's judgment-call authorization at the /mcp-integration-audit Phase 8 final summary (where the user invited a sweep ticket without requiring per-task_type Phase 2 session evidence), this ticket files that follow-up.

The audit-evidence shape for this ticket is intentionally narrower than MCPENH-051: it lacks per-task_type Phase 2 session evidence (none of `emergent_pressure_events`, `canon_facts_from_diegetic_artifacts`, `commitment_block_authoring`, `story_fact_promotion_to_canon`, or the story-pipeline task_types were exercised this session), but Phase 5 codebase verification grep against the source-of-truth file confirms each defect is present at HEAD. The /mcp-integration-audit §Twofold evidence guardrail is satisfied for the codebase-verification leg; the session-evidence leg is satisfied indirectly via MCPENH-051's intake session (the operator's Phase 5 read incidentally surfaced the pattern), with operator-judgment-call authorization to file as a preemptive sweep rather than waiting for each task_type to be audit-targeted independently.

**Specific HARD-WRONG entries** (rule number maps to a substantively different FOUNDATIONS rule):

- `ACTIVE_RULES['emergent_pressure_events'][1]` = `"Rule 2: visible consequences are required"` — Rule 2 is "No Pure Cosmetics" per FOUNDATIONS §Validation Rules. "Visible consequences are required" is the substance of Rule 5 ("No Consequence Evasion"), not Rule 2. The entry attaches Rule 5's substance to Rule 2's number — a literal misnomer.
- `ACTIVE_RULES['canon_facts_from_diegetic_artifacts'][1]` = `"Rule 5: separate diegetic claims from world-level truth"` — Rule 5 is "No Consequence Evasion." "Separate diegetic claims from world-level truth" is the skill's domain-specific framing — closer to a §Acceptance Tests / "What contradictions are permitted because they are diegetic rather than ontological?" concern than to Rule 5's "If a new fact has obvious second-order effects, either integrate them or explicitly explain why they do not manifest" substance. Like the prior case, it attaches a non-Rule-5 concept to the Rule 5 number.

**Soft paraphrases** (rule number is correct; prose is a skill-specific application or fair short-hand rather than the canonical name — operator-discretion whether to align strictly):

- Multiple uses of `"Rule 4: distribution discipline"` (in `character_generation[0]`, `propose_new_characters[1]`, `story_bootstrap[2]`, `story_turn_cycle[2]`, `commitment_block_authoring[2]`, `branching_story_health_audit[2]`, `story_fact_promotion_to_canon[2]`) — Rule 4 is "No Globalization by Accident"; "distribution discipline" is a fair short-hand of Rule 4's distribution-related substance, less defective than the HARD-WRONG cases above.
- `commitment_block_authoring[4]` = `"Rule 6: storylet records remain append-only by new allocation"` — Rule 6 is "No Silent Retcons"; append-only-by-new-allocation is the means of Rule-6 compliance applied to story-bundle records, not Rule 6's statement.
- `story_fact_promotion_to_canon[5]` = `"Rule 12: hard-canon promotions need redundant support"` — Rule 12 is "No Single-Trace Truths"; redundant-support is the means of Rule-12 compliance applied to promotions.
- `story_bootstrap[1]` / `story_turn_cycle[1]` / `commitment_block_authoring[1]` / `branching_story_health_audit[1]` / `story_fact_promotion_to_canon[1]` all use `"Rule 1: imported facts must cite world authority"` (or near-variants) — Rule 1 is "No Floating Facts"; the imported-facts-cite-world-authority statement is the story-pipeline application of Rule 1's domain/scope/prerequisites/limits/consequences requirement.
- `story_turn_cycle[5]` = `"Rule 6: story state changes remain append-only by supersession"` and `story_fact_promotion_to_canon[3]` = `"Rule 6: promotion must preserve visible change lineage"` — both are application-paraphrases of Rule 6's "All canon changes must be logged with justification" substance.
- `emergent_pressure_events[3]` = `"Rule 5: separate candidate events from world-level truth"` and several other Rule 5 variants — same pattern as the HARD-WRONG Rule 5 entry above; these are application-paraphrases that attach Rule-5's number to a skill-specific framing rather than Rule 5's actual "No Consequence Evasion" substance. Operator judgment: this might escalate to HARD-WRONG if interpreted strictly (the Rule-5 number is being used for "separation of provisional from canonical" semantics that don't map to consequence-evasion), or could be tolerated as application-paraphrase.

The downstream impact is the same defect class MCPENH-051 documented for canon_addition: a future operator querying the packet's `active_rules` field for these task_types without independently cross-checking FOUNDATIONS could be misled about what rule a given entry actually cites — most dangerously when the same FOUNDATIONS rule number is referenced in multiple skills' tables with different substantive prose, masking which skill is actually invoking which FOUNDATIONS rule.

## Assumption Reassessment (2026-05-16)

1. `tools/world-mcp/src/context-packet/governing-world-context.ts:108-194` defines `ACTIVE_RULES: Record<TaskType, string[]>`. Phase 5 verification at MCPENH-051 enumerated every task_type entry in this table; the HARD-WRONG entries (`emergent_pressure_events[1]`, `canon_facts_from_diegetic_artifacts[1]`) and soft paraphrases listed in Problem are present at HEAD verbatim. The post-MCPENH-051 state of `canon_addition` already enumerates the corrected 8-rule list; MCPENH-052's scope explicitly excludes canon_addition.
2. `docs/FOUNDATIONS.md` §Validation Rules defines the canonical Rule names: Rule 1 "No Floating Facts", Rule 2 "No Pure Cosmetics", Rule 3 "No Specialness Inflation", Rule 4 "No Globalization by Accident", Rule 5 "No Consequence Evasion", Rule 6 "No Silent Retcons", Rule 7 "Preserve Mystery Deliberately", Rule 11 "No Spectator Castes by Accident", Rule 12 "No Single-Trace Truths". The Rule Numbering and Enforcement Map enumerates the per-rule enforcement surface (validator file + skill review pairs); each task_type's `ACTIVE_RULES` entry should align with both the canonical Rule name AND the rule numbers the skill actually enforces per its own FOUNDATIONS Alignment table.
3. Shared boundary under audit: the same contract MCPENH-051 documented for canon_addition — between `get_context_packet` (provider, at `tools/world-mcp/src/context-packet/governing-world-context.ts`) and each `task_type`'s consumer (the corresponding skill's FOUNDATIONS Alignment table and Validation-Rules-this-skill-upholds discipline). The shared schema is the same `active_rules` string-array field returned in `governing_world_context.active_rules` and `governing_summary.active_rules`. This ticket extends the boundary to ALL non-canon_addition task_types in the table.
4. FOUNDATIONS principle motivating this ticket: §Tooling Recommendation — the same "non-negotiable" truthfulness commitment MCPENH-051 cited. The packet's `active_rules` field is part of the governing-context layer the §Tooling Recommendation commits to delivering; misnaming a FOUNDATIONS Validation Rule in that field — for ANY task_type — breaks the truthfulness commitment. The defect class is identical to MCPENH-051's; this ticket extends the correction to the remaining table entries.
5. Existing output schema extended: the `ACTIVE_RULES: Record<TaskType, string[]>` table per-task_type string array IS the schema. Changes for the listed task_types are corrective (re-texting HARD-WRONG entries to match FOUNDATIONS canonical Rule names) AND optionally additive per skill (extending enumeration to cover each skill's full FOUNDATIONS Alignment commitment, parallel to MCPENH-051's `canon_addition` extension from 3 to 8 rules). Consumers: every skill task_type that reads the packet's `active_rules` field (each affected task_type's own skill). Additive entries are safe; the HARD-WRONG re-texts are corrections of literal data errors with no consumer relying on the wrong text. Soft-paraphrase entries are operator-discretion at implementation time — either align strictly to canonical names (matching MCPENH-051's pattern) OR keep as skill-applied paraphrases (with the rule number's canonical name visible to greppers via a clarifying suffix like `"Rule N: <canonical-name> — <skill-specific application>"`).
6. Adjacent contradictions exposed during reassessment — Phase 5 of MCPENH-051 also surfaced that the *sibling* registries in the same file (`REQUIRED_OUTPUT_SCHEMA`, `PROHIBITED_MOVES`, `GOVERNING_FILE_PATHS`, `GOVERNING_ATOMIC_NODE_TYPES`) may have parallel drift patterns — their per-task_type entries were not audited during MCPENH-051's Phase 5 (the grep scope was narrowed to `ACTIVE_RULES`-related lines). **Classification**: future cleanup that must become its own ticket — out of session-evidence scope for THIS ticket too, since the per-task_type Phase 2 session evidence requirement applies symmetrically. A targeted Phase 5 grep against the sibling registries would be the natural next step; the ticket-shape would mirror MCPENH-051 / MCPENH-052 (per-entry text correction at the source registry). The scope decision belongs to a separate ticket; this ticket is bounded to `ACTIVE_RULES` to match MCPENH-051's surface.

## Architecture Check

1. Same architectural reasoning as MCPENH-051: direct text correction at the source-of-truth `ACTIVE_RULES` table is the cleanest fix. The defect class is identical (rule-name misnaming + optional enumeration under-scoping); applying the same fix-shape across the table at the same source file gives consistent semantics for all consumers without indirection. Filing as a single sweep ticket rather than per-task_type tickets batches the implementation work cleanly (one source file edit + parallel test extension) and lands the fix atomically rather than as a drip-feed of /mcp-integration-audit follow-ups.
2. No backwards-compatibility shims. The HARD-WRONG entries' prior text was wrong, not a documented intentional paraphrase; no consumer relied on the literal misnamed values. The soft-paraphrase entries' prior text was defensible; operator can choose to leave them alone OR upgrade to canonical names — either choice is forward-compatible with consumers that read the array as opaque strings.

## Verification Layers

1. `ACTIVE_RULES['emergent_pressure_events']` and `ACTIVE_RULES['canon_facts_from_diegetic_artifacts']` HARD-WRONG entries are corrected to cite the right FOUNDATIONS rule number → codebase grep-proof: `grep -nE "Rule 2: visible consequences are required|Rule 5: separate diegetic claims" tools/world-mcp/src/context-packet/governing-world-context.ts` returns 0 hits post-fix.
2. Soft-paraphrase entries (per operator-discretion at implementation) either align strictly to canonical names OR retain skill-application clauses with the canonical name embedded → codebase grep-proof: per-entry inspection against the canonical Rule names enumerated in Assumption Reassessment item 2.
3. The test created by MCPENH-051 (`tools/world-mcp/tests/context-packet/active-rules-foundations-alignment.test.ts`) is extended to assert correctness for the additional task_types in scope here → schema validation. The extension covers each task_type listed in Problem with parameterized assertions (expected canonical Rule names, regression guard against the prior HARD-WRONG strings, optional enumeration-completeness check per each skill's FOUNDATIONS Alignment commitment).
4. FOUNDATIONS alignment check: each entry in each affected `ACTIVE_RULES['<task_type>']` cites a FOUNDATIONS Validation Rule number whose canonical text at `docs/FOUNDATIONS.md` §Validation Rules matches the entry's substantive prose (or the rule-name prefix in the hybrid pattern) → manual review against FOUNDATIONS §Validation Rules table.

## What to Change

### 1. Correct HARD-WRONG entries in `governing-world-context.ts`

At `tools/world-mcp/src/context-packet/governing-world-context.ts:148-154`, the `emergent_pressure_events` entry:

```typescript
emergent_pressure_events: [
  "Pressure events are proposal inputs, not accepted canon",
  "Rule 2: visible consequences are required",   // ← HARD-WRONG
  "Rule 4: distribution discipline",
  "Rule 5: separate candidate events from world-level truth",
  "Rule 7: preserve Mystery Reserve deliberately"
],
```

Change `"Rule 2: visible consequences are required"` to `"Rule 5: no consequence evasion"` (the substantively-correct rule number for "visible consequences are required"). If the operator decides the emergent_pressure_events skill ALSO needs to enforce Rule 2 ("No Pure Cosmetics"), add a separate `"Rule 2: no pure cosmetics"` entry; do NOT replace one rule number with another while keeping the original prose unchanged.

At `tools/world-mcp/src/context-packet/governing-world-context.ts:143-147`, the `canon_facts_from_diegetic_artifacts` entry:

```typescript
canon_facts_from_diegetic_artifacts: [
  "Proposal-only surface; canonization happens in canon-addition",
  "Rule 5: separate diegetic claims from world-level truth",   // ← HARD-WRONG
  "Rule 7: preserve Mystery Reserve deliberately"
],
```

The "separate diegetic claims from world-level truth" substance maps to FOUNDATIONS §Acceptance Tests #10 ("What contradictions are permitted because they are diegetic rather than ontological?") and to the skill's diegetic-to-world laundering firewall discipline — not to any numbered Validation Rule. Choose one of: (a) replace with `"Diegetic-to-world laundering firewall: diegetic claims must not become world-canon without explicit canon-addition adjudication"` (drop the Rule number; the substance is the discipline); (b) replace with the canonical `"Rule 5: no consequence evasion"` AND separately add the diegetic-laundering prose as a non-Rule-numbered entry; or (c) operator's preferred re-text.

### 2. Operator-discretion: address soft-paraphrase entries

For the soft-paraphrase entries enumerated in Problem (Rule 4 distribution discipline; Rule 6 storylet append-only / change-lineage; Rule 12 redundant support; Rule 1 imported-facts-cite-authority; Rule 5 separation paraphrases), choose one of two implementation policies at implementation time and apply consistently across the table:

- **Policy A (strict canonical alignment)**: replace every entry with pure FOUNDATIONS-canonical Rule name (e.g., `"Rule 4: distribution discipline"` → `"Rule 4: no globalization by accident"`). Matches MCPENH-051's `canon_addition` pattern. Loses skill-specific framing visibility but maximizes grep-discoverability of the canonical rule.
- **Policy B (hybrid)**: keep the rule number canonical AND append the skill-specific framing as a clarifying clause (e.g., `"Rule 4: no globalization by accident — distribution discipline applied to story-local facts"`). Preserves skill-pedagogical framing while still allowing greppers to match the canonical rule name. Slightly longer strings; preserves more context.

Recommend Policy B for the soft-paraphrase entries (it's strictly more informative than Policy A) but defer to operator preference at implementation time. The Policy choice should be documented as a code comment above the `ACTIVE_RULES` table for future contributors.

### 3. Extend the test created by MCPENH-051

In `tools/world-mcp/tests/context-packet/active-rules-foundations-alignment.test.ts` (created by MCPENH-051), parameterize the assertions to cover the additional task_types in scope here: `emergent_pressure_events`, `canon_facts_from_diegetic_artifacts`, `commitment_block_authoring`, `story_fact_promotion_to_canon`, `story_bootstrap`, `story_turn_cycle`, `branching_story_health_audit`, `propose_new_canon_facts`, `propose_new_characters`, `propose_new_worlds_from_preferences`, `character_generation`, `diegetic_artifact_generation`, `continuity_audit`, `other`. For each task_type, assert:

- The HARD-WRONG strings ("Rule 2: visible consequences are required", "Rule 5: separate diegetic claims from world-level truth") are ABSENT from the returned `active_rules` array (regression guard).
- Every entry beginning with `"Rule N: "` cites a FOUNDATIONS-defined rule number (1, 2, 4, 5, 6, 7, 11, 12 — Rule 3 has no validator per FOUNDATIONS line 400 and is judgment-only).
- If Policy A applied: each entry's rule-name suffix matches the canonical FOUNDATIONS Rule name. If Policy B applied: each entry's rule-name prefix (before the em-dash separator) matches the canonical name.

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

1. `grep -nE "Rule 2: visible consequences are required|Rule 5: separate diegetic claims" tools/world-mcp/src/context-packet/governing-world-context.ts` returns 0 hits across the source file.
2. `grep -nE "Rule [0-9]+:" tools/world-mcp/src/context-packet/governing-world-context.ts` shows every `Rule N:` entry in `ACTIVE_RULES` cites a FOUNDATIONS-defined rule number (1, 2, 4, 5, 6, 7, 11, 12) with a substantively-correct suffix per the chosen Policy A or Policy B.
3. From `tools/world-mcp`, `npm run build` followed by `node --test dist/tests/context-packet/active-rules-foundations-alignment.test.js` passes (extended test covers all in-scope task_types).
4. From `tools/world-mcp`, `npm test` full suite passes (no regression of existing context-packet tests).

### Invariants

1. Every entry in `ACTIVE_RULES['<task_type>']` (for every `<task_type>` in scope) cites a FOUNDATIONS Validation Rule number whose substantive text at `docs/FOUNDATIONS.md` §Validation Rules matches the entry's prose (modulo punctuation, case, and the Policy-B-allowed skill-specific-clarifying-clause).
2. The HARD-WRONG strings enumerated in Problem (Rule 2 / visible consequences; Rule 5 / separate diegetic claims) never reappear in this file — the post-MCPENH-052 test in Acceptance Criteria item 3 is the regression surface.
3. canon_addition's entry (the surface MCPENH-051 corrected) is unchanged by this ticket; the test created by MCPENH-051 continues to pass alongside the extended assertions added here.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/context-packet/active-rules-foundations-alignment.test.ts` — extend (file created by MCPENH-051). Add parameterized assertions per task_type covering: HARD-WRONG-string regression guards; canonical-rule-number citation completeness; rule-name suffix correctness per the chosen Policy A or B.

### Commands

1. `grep -nE "Rule 2: visible consequences are required|Rule 5: separate diegetic claims" tools/world-mcp/src/context-packet/governing-world-context.ts` (regression guard against HARD-WRONG strings)
2. `grep -nE "Rule [0-9]+:" tools/world-mcp/src/context-packet/governing-world-context.ts` (verify ACTIVE_RULES table content post-fix)
3. `cd tools/world-mcp && npm run build`
4. `cd tools/world-mcp && node --test dist/tests/context-packet/active-rules-foundations-alignment.test.js` (extended-test run)
5. `cd tools/world-mcp && npm test` (full-suite regression check)
6. Optional dry-run after landing: `mcp__worldloom__get_context_packet(task_type='emergent_pressure_events', world_slug=<fixture>, seed_nodes=[<minimal>], token_budget=12000)` and similar for `canon_facts_from_diegetic_artifacts` → verify the returned `governing_world_context.active_rules` carries corrected rule names.
