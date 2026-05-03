# MCPENH-020: Document `persisted_with_summary` fallback path and surface `get_records` / `get_persisted_packet_slice` in canon-pipeline-adjacent skill preflight references

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None — documentation-only ticket; no code, no schema, no MCP tool surface change. Touches: `.claude/skills/canon-facts-from-diegetic-artifacts/references/preflight-and-prerequisites.md`, `.claude/skills/propose-new-canon-facts/references/preflight-and-prerequisites.md`, `.claude/skills/propose-new-characters/references/preflight-and-prerequisites.md`, optionally `.claude/skills/character-generation/` and `.claude/skills/diegetic-artifact-generation/` if their references carry the parallel retrieval-list pattern, plus a cross-reference clarification in `docs/CONTEXT-PACKET-CONTRACT.md`
**Deps**: None — `mcp__worldloom__get_records` and `mcp__worldloom__get_persisted_packet_slice` already ship per the `tools/world-mcp/` package surface and the FOUNDATIONS.md §Tooling Recommendation enumeration

## Problem

When a `canon-pipeline-adjacent` skill (Category 2 per `references/cross-skill-consistency.md`) loads the context packet at Pre-flight, the packet's `delivery_status` may return `persisted_with_summary` for artifact-or-character-anchored task types whose seed-relevant neighborhood is dense. In this state:

- All `nodes` arrays in `local_authority`, `exact_record_links`, `scoped_local_context`, `governing_world_context`, and `impact_surfaces` are empty (`[]`).
- The full packet body is persisted to a `/tmp/worldloom-mcp-tool-results/<uuid>.json` file referenced by `task_header.persisted_output_path`.
- Only `governing_summary` (id-lists per record class) and `truncation_summary.fallback_advice` survive inline.
- `token_budget.allocated` is much smaller than `token_budget.requested` (e.g., 2429 of 12000 in the worked instantiation below).

The packet response's `truncation_summary.fallback_advice` field already names the correct recovery: `"Full packet body persisted at task_header.persisted_output_path. Use mcp__worldloom__get_persisted_packet_slice for structured slice extraction, or mcp__worldloom__get_record / mcp__worldloom__get_records for individual records by id."` — this is an MCP-runtime advice string, machine-readable.

But the canon-pipeline-adjacent skills' Pre-flight references (e.g., `canon-facts-from-diegetic-artifacts/references/preflight-and-prerequisites.md` §"Targeted record retrieval") do NOT enumerate `get_records` (plural) or `get_persisted_packet_slice` in the documented retrieval-tool list. Operators reading the skill prose see only `get_record` (singular), `search_nodes`, `get_firewall_content`, `get_neighbors`, `find_named_entities`, `find_sections_touched_by` — and have to either (a) re-discover the plural and persisted-slice tools from the runtime advice string mid-flow, or (b) fall back to N individual `get_record` calls when a single `get_records(record_ids: [...])` call would suffice.

Worked session evidence (2026-05-03): a `canon-facts-from-diegetic-artifacts` invocation against `worlds/erotica-world/diegetic-artifacts/marla-kerns-journal-the-iker-entries.md` (DA-0001) called `get_context_packet(task_type='canon_facts_from_diegetic_artifacts', world_slug='erotica-world', seed_nodes=[<11 ids: DA-0001 + CHAR-0001 + CHAR-0002 + CF-0001..0003 + 5 entity:* ids>], token_budget=12000)`. The response carried `delivery_status: persisted_with_summary`, `token_budget.allocated: 2429`, all five major `nodes` arrays empty, and `dropped_node_ids_by_class` listing 50+ records (DA / CHAR / CF / INV / M / OQ / ENT / SEC / CH). Phase 6 needed all 10 invariants + all 4 mystery-reserve records + 3 CFs + 5 SECs in full-body form — the operator made ~24 individual `get_record` calls (would have been a single `get_records` call for the per-class batches plus the one-shot `get_firewall_content`). Tool-call round count: ~24. With `get_records` plural + `get_persisted_packet_slice` documented at Pre-flight, the same workflow could have been ~3-5 batched calls.

The friction is specifically a documentation gap: the MCP runtime advice surfaces the right tools at fallback time, but the operator's mental model is built from the skill prose's enumerated retrieval-tool list, which is incomplete relative to the runtime surface. Catching this at Pre-flight reading time (before the packet call) is preferable to catching it via runtime-advice-string inspection mid-flow.

## Assumption Reassessment (2026-05-03)

1. **Affected skill files (canon-pipeline-adjacent — Category 2 per `references/cross-skill-consistency.md` §Skill Category Classification):**
   - `.claude/skills/canon-facts-from-diegetic-artifacts/references/preflight-and-prerequisites.md` §"Targeted record retrieval (during classification, scoring, and 6 sub-checks)" — verified: enumerates `get_record`, `search_nodes`, `get_firewall_content`, `get_neighbors`, `find_named_entities`, `find_sections_touched_by`; does NOT enumerate `get_records` or `get_persisted_packet_slice`.
   - `.claude/skills/propose-new-canon-facts/references/preflight-and-prerequisites.md` §"Targeted record retrieval (during diagnosis and reasoning)" — verified: same gap; same retrieval-tool list shape.
   - `.claude/skills/propose-new-characters/references/preflight-and-prerequisites.md` §"Targeted record retrieval (during reasoning)" — verified: same gap.
   - `.claude/skills/canon-addition/`, `.claude/skills/character-generation/`, `.claude/skills/diegetic-artifact-generation/`, `.claude/skills/continuity-audit/`, `.claude/skills/emergent-pressure-events/`, and other canon-pipeline-adjacent OR canon-reading-content-generation skills (Category 2 / 2b) likely carry the parallel pattern; per-skill investigation is required at implementation phase to confirm.

2. **Tools verified to ship (FOUNDATIONS.md §Tooling Recommendation):** `mcp__worldloom__get_records`, `mcp__worldloom__get_record_field`, `mcp__worldloom__get_records_field`, `mcp__worldloom__get_persisted_packet_slice` — all enumerated in FOUNDATIONS.md alongside `get_record` and `get_context_packet`. The plural and persisted-slice tools are not net-new MCP capabilities; this ticket only documents existing functionality.

3. **Cross-skill / cross-artifact boundary:** the shared boundary under audit is the **retrieval-tool enumeration convention** in canon-pipeline-adjacent skill preflight references — every Category 2 / 2b skill's Pre-flight Targeted-Retrieval section is a parallel surface that must remain consistent. Drift between siblings (one skill listing `get_records`, others not) would mislead operators. Per `references/cross-skill-consistency.md` §"Concrete shared-surface triggers" → "Documented alignment-convention statements" + "Consumer-side output-schema dependencies", this is a shared surface that warrants per-finding sibling investigation at implementation phase.

4. **FOUNDATIONS principle under audit:** §Tooling Recommendation states LLM agents "should always receive — directly or via the documented context-packet + targeted-retrieval pattern — current World Kernel, current Invariants, relevant canon fact records, affected domain files, unresolved contradictions list, mystery reserve entries touching the same domain." The skill prose currently honors this for the singular targeted-retrieval path; documenting the batch (`get_records`) and persisted-slice (`get_persisted_packet_slice`) tools strengthens the same principle by giving operators the canonical fallback shape for the `persisted_with_summary` case.

5. **No HARD-GATE / Canon Safety Check / Mystery Reserve firewall surface touched:** this is documentation only; the underlying canon-safety enforcement remains identical. No risk of weakening the firewall.

6. **No schema extension:** no Canon Fact Record / Change Log Entry / proposal card / character dossier / diegetic artifact field changes.

7. **Adjacent contradictions:** the runtime advice string in `truncation_summary.fallback_advice` already names `get_records` and `get_persisted_packet_slice`. Skill prose is the surface that lags — bringing it into alignment is the entire ticket. No separate bugs uncovered.

## Architecture Check

1. **Why this approach is cleaner than alternatives:**
   - Alternative A — extend the MCP runtime to push the batch tool surface more aggressively (e.g., make `get_context_packet` always include batch-fallback advice in a more prominent envelope field): rejected because the runtime advice IS already returned; the friction is operator-side reading, not runtime-side communication.
   - Alternative B — add a new "summary-mode operator-friendly fallback" tool: rejected as redundant with `get_persisted_packet_slice` and `get_records`, both of which already exist.
   - The chosen approach (document existing tools in skill prose) follows the established pattern: `get_firewall_content` is documented in skill prose as the bulk-retrieval recommendation for Phase 6b; we are extending the same documentation discipline to `get_records` (general batch retrieval) and `get_persisted_packet_slice` (persisted-summary recovery).

2. **No backwards-compatibility shims:** documentation additions only; no code paths altered, no API signatures changed, no enum extensions. Existing skill invocations continue to work; the addition expands the operator's documented toolkit.

## Verification Layers

1. **`get_records` and `get_persisted_packet_slice` enumerated in canon-facts-from-diegetic-artifacts/references/preflight-and-prerequisites.md** → codebase grep-proof: `grep -rn 'get_records\|get_persisted_packet_slice' .claude/skills/canon-facts-from-diegetic-artifacts/` returns hits.
2. **Sibling alignment preserved across Category 2 skills** → manual review per `references/cross-skill-consistency.md` shared-surface trigger; per-skill investigation at implementation phase confirms sibling references touched as needed.
3. **`persisted_with_summary` fallback path documented as recovery shape** → manual review of the new documentation paragraph; should explicitly cite the `delivery_status: persisted_with_summary` field name and recommend `get_persisted_packet_slice(persisted_path, slice_spec)` OR `get_records(record_ids: [...])` per use-case.
4. **No MCP runtime regression** → skill dry-run: invoke `canon-facts-from-diegetic-artifacts` against an existing world's diegetic artifact (e.g., `worlds/erotica-world/diegetic-artifacts/marla-kerns-journal-the-iker-entries.md`) and confirm Pre-flight retrieves the same record set as before, with operator (per the new docs) using batched calls.
5. **FOUNDATIONS alignment preserved** → FOUNDATIONS alignment check: §Tooling Recommendation enumeration includes `get_records` and `get_persisted_packet_slice`; this ticket extends skill-prose alignment to that enumeration.

## What to Change

### 1. Extend canon-facts-from-diegetic-artifacts targeted-retrieval list

In `.claude/skills/canon-facts-from-diegetic-artifacts/references/preflight-and-prerequisites.md`, under §"Targeted record retrieval (during classification, scoring, and 6 sub-checks)":

- Add `mcp__worldloom__get_records(record_ids: [...])` after the existing `get_record(record_id)` bullet, with a one-line use case: "batch retrieval of N records by id in a single call; preferred over N individual `get_record` calls when Phase 6a (10 invariants) / Phase 6b (4 MR records) / Phase 6c (multiple capability CFs) need all-of-class context per card."
- Add `mcp__worldloom__get_persisted_packet_slice(persisted_path, slice_spec)` after the existing `get_firewall_content` bullet, with a one-line use case: "structured slice extraction from a persisted-with-summary packet body. Used when the Pre-flight context packet returned `delivery_status: persisted_with_summary` (the inline packet had only governing-summary id-lists; full record bodies are on disk). Pair with `get_records` for direct id-batch retrieval as an alternative recovery path."

Add a §"Persisted-with-summary delivery handling" sub-section between §"Primary load: context packet" and §"Targeted record retrieval":

> When `get_context_packet` returns `delivery_status: persisted_with_summary`, the inline response carries only the `governing_summary` (id-lists per record class) and `truncation_summary.fallback_advice` (recovery instructions). All `nodes` arrays in `local_authority`, `exact_record_links`, `scoped_local_context`, `governing_world_context`, and `impact_surfaces` are empty. Two recovery paths:
>
> 1. **Direct id-batch retrieval (preferred when known ids fit operator's needs)**: read the `governing_summary.invariant_ids` / `seed_relevant_cf_ids` / `dropped_node_ids_by_class` lists, then `get_records(record_ids: [...])` for the records this skill's downstream phases need. Phase 6a needs every invariant id; Phase 6b can use `get_firewall_content(world_slug)` directly without the packet; Phase 6c reads CF bodies for distribution-discipline lookup.
> 2. **Persisted slice extraction (preferred when operator wants the packet's neighborhood ranking preserved)**: `get_persisted_packet_slice(persisted_path=<task_header.persisted_output_path>, slice_spec={...})` returns the persisted body's relevant slice. Use when the packet's ranking-profile-aware neighborhood selection is more useful than direct id retrieval.
>
> Either path is correct; choice is operator judgment based on whether ranking-profile context matters for the current phase. The persisted file's lifetime is bounded; treat it as session-local.

### 2. Cascade to sibling Category 2 skills

In `.claude/skills/propose-new-canon-facts/references/preflight-and-prerequisites.md`, apply the same parallel additions to §"Targeted record retrieval (during diagnosis and reasoning)" and add a parallel §"Persisted-with-summary delivery handling" sub-section.

In `.claude/skills/propose-new-characters/references/preflight-and-prerequisites.md`, apply the same parallel additions to §"Targeted record retrieval (during reasoning)" and add a parallel §"Persisted-with-summary delivery handling" sub-section.

Per-skill investigation at implementation phase: scan other canon-pipeline-adjacent (Category 2) and canon-reading content-generation (Category 2b) skills' preflight references — `canon-addition`, `character-generation`, `diegetic-artifact-generation`, `continuity-audit`, `emergent-pressure-events`, `propose-new-worlds-from-preferences`, `reassess-spec`, `spec-to-tickets`, `branching-story-health-audit`, `branching-story-bootstrap`, `branching-story-page-cycle`, `storylet-pool-authoring`, `story-fact-promotion-to-canon` — and apply parallel cascade where the retrieval-tool list pattern exists. Each cascade application is a separate `N.cascade-x` entry per `references/cascade-and-summary-discipline.md`.

### 3. Cross-reference docs/CONTEXT-PACKET-CONTRACT.md

In `docs/CONTEXT-PACKET-CONTRACT.md`, verify that the `persisted_with_summary` delivery state and the `get_persisted_packet_slice` recovery tool are documented. If they are not, add a short paragraph; if they are, ensure the skill prose cross-references that section.

## Files to Touch

- `.claude/skills/canon-facts-from-diegetic-artifacts/references/preflight-and-prerequisites.md` (modify)
- `.claude/skills/propose-new-canon-facts/references/preflight-and-prerequisites.md` (modify)
- `.claude/skills/propose-new-characters/references/preflight-and-prerequisites.md` (modify)
- `.claude/skills/canon-addition/references/preflight-and-prerequisites.md` (modify, conditional on parallel-pattern presence)
- `.claude/skills/character-generation/references/<preflight-equivalent>.md` (modify, conditional)
- `.claude/skills/diegetic-artifact-generation/references/<preflight-equivalent>.md` (modify, conditional)
- `.claude/skills/continuity-audit/references/<preflight-equivalent>.md` (modify, conditional)
- `.claude/skills/emergent-pressure-events/references/<preflight-equivalent>.md` (modify, conditional)
- `.claude/skills/propose-new-worlds-from-preferences/references/<preflight-equivalent>.md` (modify, conditional)
- `.claude/skills/branching-story-health-audit/references/<preflight-equivalent>.md` (modify, conditional)
- `.claude/skills/branching-story-bootstrap/references/<preflight-equivalent>.md` (modify, conditional)
- `.claude/skills/branching-story-page-cycle/references/<preflight-equivalent>.md` (modify, conditional)
- `.claude/skills/storylet-pool-authoring/references/<preflight-equivalent>.md` (modify, conditional)
- `.claude/skills/story-fact-promotion-to-canon/references/<preflight-equivalent>.md` (modify, conditional)
- `docs/CONTEXT-PACKET-CONTRACT.md` (modify or verify existing coverage)

## Out of Scope

- Tuning the context-packet ranking profile or token-budget allocation algorithm — the `persisted_with_summary` delivery state is WAI for dense-neighborhood seed sets like canon-facts-from-diegetic-artifacts on artifact-anchored seeds with rich canon_links; the friction is operator documentation, not runtime tuning.
- Adding new MCP tools — this ticket only documents existing tools (`get_records`, `get_persisted_packet_slice`).
- Changing the `delivery_status` enum or runtime advice string — these are stable contracts.
- Skill prose at meta-tooling targets (brainstorm, skill-creator, skill-audit, skill-consolidate, skill-extract-references) — meta-tooling skills do not consume `get_context_packet` for canon retrieval; out of scope.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n 'get_records\|get_persisted_packet_slice' .claude/skills/canon-facts-from-diegetic-artifacts/references/preflight-and-prerequisites.md` returns at least 2 hits each (one in §Targeted record retrieval, one in §Persisted-with-summary delivery handling).
2. `grep -n 'persisted_with_summary' .claude/skills/canon-facts-from-diegetic-artifacts/references/preflight-and-prerequisites.md` returns at least 1 hit.
3. Sibling cascades verified: `grep -ln 'get_records\|get_persisted_packet_slice' .claude/skills/propose-new-canon-facts/references/preflight-and-prerequisites.md .claude/skills/propose-new-characters/references/preflight-and-prerequisites.md` returns hits in both files.
4. `world-validate` (full pipeline) does not regress; the documentation changes are skill-prose-only and do not touch any record schemas the validators consume.

### Invariants

1. The retrieval-tool enumeration in canon-pipeline-adjacent skill preflight references stays consistent with `tools/world-mcp/`'s shipped tool surface — no skill documents a tool the runtime does not ship; no skill omits a tool the runtime ships if that tool is operationally relevant to the skill's phases.
2. The `persisted_with_summary` recovery path is documented at a Pre-flight reading site, not buried in the runtime advice string — operators reading the skill prose end-to-end at first use should see the recovery shape before they encounter the runtime advice.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -rn 'get_records\|get_persisted_packet_slice\|persisted_with_summary' .claude/skills/*/references/preflight*.md` — confirm all expected sibling cascades landed.
2. Invoke `canon-facts-from-diegetic-artifacts` skill against `worlds/erotica-world/diegetic-artifacts/marla-kerns-journal-the-iker-entries.md` and verify Pre-flight reads succeed; manual review of operator workflow confirms the new documentation visibility shortens tool-call rounds vs. the pre-ticket baseline.
3. `cd tools/world-mcp && npm test` — runtime contract unaffected; existing tests pass without modification (this ticket changes no runtime code).
