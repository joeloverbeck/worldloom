# MCPENH-020: Document `persisted_with_summary` fallback path and surface `get_records` / `get_persisted_packet_slice` in canon-pipeline-adjacent skill preflight references

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None — documentation-only ticket; no code, no schema, no MCP tool surface change. Touched: `.claude/skills/canon-facts-from-diegetic-artifacts/SKILL.md`, `.claude/skills/canon-facts-from-diegetic-artifacts/references/preflight-and-prerequisites.md`, `.claude/skills/propose-new-canon-facts/SKILL.md`, `.claude/skills/propose-new-canon-facts/references/preflight-and-prerequisites.md`, `.claude/skills/propose-new-characters/SKILL.md`, `.claude/skills/propose-new-characters/references/preflight-and-prerequisites.md`, `.claude/skills/continuity-audit/references/retrieval-tool-tree.md`, `.claude/skills/propose-new-worlds-from-preferences/SKILL.md`, `.claude/skills/branching-story-health-audit/SKILL.md`, `.claude/skills/story-fact-promotion-to-canon/SKILL.md`; verified existing `docs/CONTEXT-PACKET-CONTRACT.md` coverage without changing it.
**Deps**: None — `mcp__worldloom__get_records` and `mcp__worldloom__get_persisted_packet_slice` already ship per the `tools/world-mcp/` package surface and the FOUNDATIONS.md §Tooling Recommendation enumeration

## Problem

At intake, when a `canon-pipeline-adjacent` skill (Category 2 per `references/cross-skill-consistency.md`) loaded the context packet at Pre-flight, the packet's `delivery_status` could return `persisted_with_summary` for artifact-or-character-anchored task types whose seed-relevant neighborhood was dense. In this state:

- All `nodes` arrays in `local_authority`, `exact_record_links`, `scoped_local_context`, `governing_world_context`, and `impact_surfaces` are empty (`[]`).
- The full packet body is persisted to a `/tmp/worldloom-mcp-tool-results/<uuid>.json` file referenced by `task_header.persisted_output_path`.
- Only `governing_summary` (id-lists per record class) and `truncation_summary.fallback_advice` survive inline.
- `token_budget.allocated` is much smaller than `token_budget.requested` (e.g., 2429 of 12000 in the worked instantiation below).

The packet response's `truncation_summary.fallback_advice` field already names the correct recovery: `"Full packet body persisted at task_header.persisted_output_path. Use mcp__worldloom__get_persisted_packet_slice for structured slice extraction, or mcp__worldloom__get_record / mcp__worldloom__get_records for individual records by id."` — this is an MCP-runtime advice string, machine-readable.

At intake, the canon-pipeline-adjacent skills' Pre-flight references (e.g., `canon-facts-from-diegetic-artifacts/references/preflight-and-prerequisites.md` §"Targeted record retrieval") did NOT enumerate `get_records` (plural) or `get_persisted_packet_slice` in the documented retrieval-tool list. Operators reading the skill prose saw only `get_record` (singular), `search_nodes`, `get_firewall_content`, `get_neighbors`, `find_named_entities`, `find_sections_touched_by` — and had to either (a) re-discover the plural and persisted-slice tools from the runtime advice string mid-flow, or (b) fall back to N individual `get_record` calls when a single `get_records(record_ids: [...])` call would suffice.

Worked session evidence (2026-05-03): a `canon-facts-from-diegetic-artifacts` invocation against `worlds/erotica-world/diegetic-artifacts/marla-kerns-journal-the-iker-entries.md` (DA-0001) called `get_context_packet(task_type='canon_facts_from_diegetic_artifacts', world_slug='erotica-world', seed_nodes=[<11 ids: DA-0001 + CHAR-0001 + CHAR-0002 + CF-0001..0003 + 5 entity:* ids>], token_budget=12000)`. The response carried `delivery_status: persisted_with_summary`, `token_budget.allocated: 2429`, all five major `nodes` arrays empty, and `dropped_node_ids_by_class` listing 50+ records (DA / CHAR / CF / INV / M / OQ / ENT / SEC / CH). Phase 6 needed all 10 invariants + all 4 mystery-reserve records + 3 CFs + 5 SECs in full-body form — the operator made ~24 individual `get_record` calls (would have been a single `get_records` call for the per-class batches plus the one-shot `get_firewall_content`). Tool-call round count: ~24. With `get_records` plural + `get_persisted_packet_slice` documented at Pre-flight, the same workflow could have been ~3-5 batched calls.

The friction was specifically a documentation gap: the MCP runtime advice surfaced the right tools at fallback time, but the operator's mental model was built from the skill prose's enumerated retrieval-tool list, which was incomplete relative to the runtime surface. This ticket now documents the recovery path at Pre-flight reading sites.

## Assumption Reassessment (2026-05-03)

1. **Affected skill files (canon-pipeline-adjacent — Category 2 per `references/cross-skill-consistency.md` §Skill Category Classification):**
   - `.claude/skills/canon-facts-from-diegetic-artifacts/references/preflight-and-prerequisites.md` §"Targeted record retrieval (during classification, scoring, and 6 sub-checks)" — verified: enumerates `get_record`, `search_nodes`, `get_firewall_content`, `get_neighbors`, `find_named_entities`, `find_sections_touched_by`; does NOT enumerate `get_records` or `get_persisted_packet_slice`.
   - `.claude/skills/propose-new-canon-facts/references/preflight-and-prerequisites.md` §"Targeted record retrieval (during diagnosis and reasoning)" — verified: same gap; same retrieval-tool list shape.
   - `.claude/skills/propose-new-characters/references/preflight-and-prerequisites.md` §"Targeted record retrieval (during reasoning)" — verified: same gap.
   - `.claude/skills/canon-addition/`, `.claude/skills/character-generation/`, `.claude/skills/diegetic-artifact-generation/`, `.claude/skills/continuity-audit/`, `.claude/skills/emergent-pressure-events/`, and other canon-pipeline-adjacent OR canon-reading-content-generation skills (Category 2 / 2b) were scanned at implementation phase to distinguish already-aligned surfaces from same-seam partial gaps.

2. **Tools verified to ship (FOUNDATIONS.md §Tooling Recommendation):** `mcp__worldloom__get_records`, `mcp__worldloom__get_record_field`, `mcp__worldloom__get_records_field`, `mcp__worldloom__get_persisted_packet_slice` — all enumerated in FOUNDATIONS.md alongside `get_record` and `get_context_packet`. The plural and persisted-slice tools are not net-new MCP capabilities; this ticket only documents existing functionality.

3. **Cross-skill / cross-artifact boundary:** the shared boundary under audit was the **retrieval-tool enumeration convention** in canon-pipeline-adjacent skill preflight references — Category 2 / 2b skill Pre-flight Targeted-Retrieval sections are parallel surfaces that must remain consistent. Drift between siblings (one skill listing `get_records`, others not) would mislead operators. Per `references/cross-skill-consistency.md` §"Concrete shared-surface triggers" → "Documented alignment-convention statements" + "Consumer-side output-schema dependencies", this shared surface warranted the implementation-phase sibling investigation recorded below.

4. **FOUNDATIONS principle under audit:** §Tooling Recommendation states LLM agents "should always receive — directly or via the documented context-packet + targeted-retrieval pattern — current World Kernel, current Invariants, relevant canon fact records, affected domain files, unresolved contradictions list, mystery reserve entries touching the same domain." The skill prose already honored this for the singular targeted-retrieval path; this ticket strengthened the same principle by documenting the batch (`get_records`) and persisted-slice (`get_persisted_packet_slice`) fallback shape for the `persisted_with_summary` case.

5. **No HARD-GATE / Canon Safety Check / Mystery Reserve firewall surface touched:** this is documentation only; the underlying canon-safety enforcement remains identical. No risk of weakening the firewall.

6. **No schema extension:** no Canon Fact Record / Change Log Entry / proposal card / character dossier / diegetic artifact field changes.

7. **Adjacent contradictions:** the runtime advice string in `truncation_summary.fallback_advice` already names `get_records` and `get_persisted_packet_slice`. Skill prose is the surface that lags — bringing it into alignment is the entire ticket. No separate bugs uncovered.

8. **Implementation-phase cascade correction:** the live repo has only three `references/preflight-and-prerequisites.md` files, all three named primary targets, and they still omit both `get_records` and `get_persisted_packet_slice` in their Targeted Retrieval lists. `character-generation/references/world-state-prerequisites.md` and `diegetic-artifact-generation/references/world-state-prerequisites.md` already document `delivery_status === 'persisted_with_summary'`, `governing_summary`, `get_records`, `get_records_field`, and `get_persisted_packet_slice`, so no edits are needed there. Same-seam partial gaps remain in `continuity-audit/references/retrieval-tool-tree.md` (batch retrieval present, persisted-summary recovery absent), `propose-new-worlds-from-preferences/SKILL.md` (context-packet follow-up lists only singular `get_record` / scans), `branching-story-health-audit/SKILL.md` (fallback lists `get_records` but not `get_persisted_packet_slice`), and `story-fact-promotion-to-canon/SKILL.md` (context-packet line lacks explicit fallback handling). `branching-story-bootstrap`, `branching-story-page-cycle`, and `storylet-pool-authoring` already name both recovery paths in their packet-too-large fallback; `emergent-pressure-events` primarily uses whole-class `list_records` and only invokes `get_context_packet` as a complement, so its existing targeted follow-up wording remains truthful for this ticket.

9. **Context-packet contract status:** `docs/CONTEXT-PACKET-CONTRACT.md` already documents `persisted_with_summary` under §Fast-Summary Inline Delivery, the §Index + Follow-Up Retrieval Pattern, and §Focused Retrieval Tools, including `get_records` and `get_persisted_packet_slice`. No docs/CONTEXT-PACKET-CONTRACT.md edit was required; the edited skill prose now cross-references the existing section.

## Architecture Check

1. **Why this approach is cleaner than alternatives:**
   - Alternative A — extend the MCP runtime to push the batch tool surface more aggressively (e.g., make `get_context_packet` always include batch-fallback advice in a more prominent envelope field): rejected because the runtime advice IS already returned; the friction is operator-side reading, not runtime-side communication.
   - Alternative B — add a new "summary-mode operator-friendly fallback" tool: rejected as redundant with `get_persisted_packet_slice` and `get_records`, both of which already exist.
   - The chosen approach (document existing tools in skill prose) follows the established pattern: `get_firewall_content` is documented in skill prose as the bulk-retrieval recommendation for Phase 6b; we are extending the same documentation discipline to `get_records` (general batch retrieval) and `get_persisted_packet_slice` (persisted-summary recovery).

2. **No backwards-compatibility shims:** documentation additions only; no code paths altered, no API signatures changed, no enum extensions. Existing skill invocations continue to work; the addition expands the operator's documented toolkit.

## Verification Layers

1. **`get_records` and `get_persisted_packet_slice` enumerated in canon-facts-from-diegetic-artifacts/references/preflight-and-prerequisites.md** → codebase grep-proof: `grep -rn 'get_records\|get_persisted_packet_slice' .claude/skills/canon-facts-from-diegetic-artifacts/` returns hits.
2. **Sibling alignment preserved across Category 2 / 2b / story-canon retrieval surfaces** → codebase grep-proof plus manual review per `references/cross-skill-consistency.md` shared-surface trigger; implementation-phase scan confirms already-correct siblings and touched partial gaps.
3. **`persisted_with_summary` fallback path documented as recovery shape** → manual review of the new documentation paragraph; explicitly cites the `delivery_status: persisted_with_summary` field name and recommends `get_persisted_packet_slice(persisted_path, slice_path)` OR `get_records(record_ids: [...])` per use-case.
4. **Context-packet contract already covers the shared runtime behavior** → grep-proof/manual review against `docs/CONTEXT-PACKET-CONTRACT.md`; no runtime code or schema changes required.
5. **FOUNDATIONS alignment preserved** → FOUNDATIONS alignment check: §Tooling Recommendation enumeration includes `get_records` and `get_persisted_packet_slice`; this ticket extends skill-prose alignment to that enumeration.

## Landed Changes

### 1. Extended primary preflight targeted-retrieval lists

In `.claude/skills/canon-facts-from-diegetic-artifacts/references/preflight-and-prerequisites.md`, `.claude/skills/propose-new-canon-facts/references/preflight-and-prerequisites.md`, and `.claude/skills/propose-new-characters/references/preflight-and-prerequisites.md`:

- Added a §"Persisted-with-summary delivery handling" section that cites `docs/CONTEXT-PACKET-CONTRACT.md` §Fast-Summary Inline Delivery, names `task_header.delivery_status: persisted_with_summary`, explains the empty inline `nodes` arrays, and gives two recovery paths: `get_records(record_ids=[...], world_slug=<slug>)` for known id sets and `get_persisted_packet_slice(persisted_path=task_header.persisted_output_path, slice_path='<dot-path>')` for ranked persisted slices.
- Added `mcp__worldloom__get_records(record_ids, world_slug?)` to the targeted-retrieval list.
- Added `mcp__worldloom__get_persisted_packet_slice(persisted_path, slice_path)` to the targeted-retrieval list.

### 2. Cascaded same-seam sibling retrieval docs

Added the missing batch / persisted-slice recovery language to same-seam partial surfaces:

- `.claude/skills/continuity-audit/references/retrieval-tool-tree.md`
- `.claude/skills/propose-new-worlds-from-preferences/SKILL.md`
- `.claude/skills/branching-story-health-audit/SKILL.md`
- `.claude/skills/story-fact-promotion-to-canon/SKILL.md`

Also updated parent summary / process-flow lines in the three primary skills so they no longer summarize targeted retrieval as only singular `get_record` / search:

- `.claude/skills/canon-facts-from-diegetic-artifacts/SKILL.md`
- `.claude/skills/propose-new-canon-facts/SKILL.md`
- `.claude/skills/propose-new-characters/SKILL.md`

Implementation-phase scan confirmed `character-generation/references/world-state-prerequisites.md`, `diegetic-artifact-generation/references/world-state-prerequisites.md`, `branching-story-bootstrap/SKILL.md`, `branching-story-page-cycle/SKILL.md`, and `storylet-pool-authoring/SKILL.md` already documented the same recovery tools and required no edit.

### 3. Verified context-packet contract coverage

Verified `docs/CONTEXT-PACKET-CONTRACT.md` already covers `persisted_with_summary`, `get_records`, and `get_persisted_packet_slice` in §Fast-Summary Inline Delivery, §Index + Follow-Up Retrieval Pattern, and §Focused Retrieval Tools. No edit was needed.

## Files to Touch

- `.claude/skills/canon-facts-from-diegetic-artifacts/references/preflight-and-prerequisites.md` (modify)
- `.claude/skills/canon-facts-from-diegetic-artifacts/SKILL.md` (modify)
- `.claude/skills/propose-new-canon-facts/references/preflight-and-prerequisites.md` (modify)
- `.claude/skills/propose-new-canon-facts/SKILL.md` (modify)
- `.claude/skills/propose-new-characters/references/preflight-and-prerequisites.md` (modify)
- `.claude/skills/propose-new-characters/SKILL.md` (modify)
- `.claude/skills/continuity-audit/references/retrieval-tool-tree.md` (modify)
- `.claude/skills/propose-new-worlds-from-preferences/SKILL.md` (modify)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)
- `.claude/skills/story-fact-promotion-to-canon/SKILL.md` (modify)

## Out of Scope

- Tuning the context-packet ranking profile or token-budget allocation algorithm — the `persisted_with_summary` delivery state is WAI for dense-neighborhood seed sets like canon-facts-from-diegetic-artifacts on artifact-anchored seeds with rich canon_links; the friction is operator documentation, not runtime tuning.
- Adding new MCP tools — this ticket only documents existing tools (`get_records`, `get_persisted_packet_slice`).
- Changing the `delivery_status` enum or runtime advice string — these are stable contracts.
- Skill prose at meta-tooling targets (brainstorm, skill-creator, skill-audit, skill-consolidate, skill-extract-references) — meta-tooling skills do not consume `get_context_packet` for canon retrieval; out of scope.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n 'get_records\|get_persisted_packet_slice' .claude/skills/canon-facts-from-diegetic-artifacts/references/preflight-and-prerequisites.md` returns at least 2 hits each (one in §Targeted record retrieval, one in §Persisted-with-summary delivery handling).
2. `grep -n 'persisted_with_summary' .claude/skills/canon-facts-from-diegetic-artifacts/references/preflight-and-prerequisites.md` returns at least 1 hit.
3. Sibling cascades verified: grep proof returns `get_records`, `get_persisted_packet_slice`, or `persisted_with_summary` hits across the three primary preflight references plus `continuity-audit`, `propose-new-worlds-from-preferences`, `branching-story-health-audit`, and `story-fact-promotion-to-canon` same-seam surfaces.
4. `docs/CONTEXT-PACKET-CONTRACT.md` already documents `persisted_with_summary`, `get_records`, and `get_persisted_packet_slice`; no context-packet contract edit is required.
5. `git diff --check` reports no whitespace errors in the edited documentation.

### Invariants

1. The retrieval-tool enumeration in canon-pipeline-adjacent skill preflight references stays consistent with `tools/world-mcp/`'s shipped tool surface — no skill documents a tool the runtime does not ship; no skill omits a tool the runtime ships if that tool is operationally relevant to the skill's phases.
2. The `persisted_with_summary` recovery path is documented at a Pre-flight reading site, not buried in the runtime advice string — operators reading the skill prose end-to-end at first use should see the recovery shape before they encounter the runtime advice.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -rn 'get_records\|get_persisted_packet_slice\|persisted_with_summary' .claude/skills/*/references/preflight*.md .claude/skills/continuity-audit/references/retrieval-tool-tree.md .claude/skills/propose-new-worlds-from-preferences/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md .claude/skills/story-fact-promotion-to-canon/SKILL.md .claude/skills/canon-facts-from-diegetic-artifacts/SKILL.md .claude/skills/propose-new-canon-facts/SKILL.md .claude/skills/propose-new-characters/SKILL.md` — confirm all expected sibling cascades landed.
2. `grep -n 'persisted_with_summary\|get_records\|get_persisted_packet_slice' docs/CONTEXT-PACKET-CONTRACT.md docs/FOUNDATIONS.md tools/world-mcp/src/tool-names.ts tools/world-mcp/src/server.ts` — confirm the existing runtime and contract surfaces already ship / document the tools.
3. `git diff --check` — documentation whitespace hygiene.

## Outcome

Completed: 2026-05-03.

Completed as a documentation-only alignment change. The primary canon-pipeline-adjacent preflight references now document `persisted_with_summary` recovery before Targeted Retrieval and enumerate both `get_records` and `get_persisted_packet_slice`. Same-seam parent summaries and partial sibling fallback surfaces now name the same batch / persisted-slice recovery tools. No MCP runtime, schema, hard-gate, canon-write, or validator behavior changed.

## Verification Result

1. `grep -rn 'get_records\|get_persisted_packet_slice\|persisted_with_summary' .claude/skills/*/references/preflight*.md .claude/skills/continuity-audit/references/retrieval-tool-tree.md .claude/skills/propose-new-worlds-from-preferences/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md .claude/skills/story-fact-promotion-to-canon/SKILL.md .claude/skills/canon-facts-from-diegetic-artifacts/SKILL.md .claude/skills/propose-new-canon-facts/SKILL.md .claude/skills/propose-new-characters/SKILL.md` — passed; hits cover the three preflight references, the same-seam sibling surfaces, and the parent summaries.
2. `grep -n 'persisted_with_summary\|get_records\|get_persisted_packet_slice' docs/CONTEXT-PACKET-CONTRACT.md docs/FOUNDATIONS.md tools/world-mcp/src/tool-names.ts tools/world-mcp/src/server.ts` — passed; the existing contract and runtime surfaces already document / register the tools.
3. `rg -n 'search_nodes / get_record|packet-too-large fallback|delivery_status=.persisted_with_summary' .claude/skills/canon-facts-from-diegetic-artifacts .claude/skills/propose-new-canon-facts .claude/skills/propose-new-characters .claude/skills/continuity-audit .claude/skills/propose-new-worlds-from-preferences .claude/skills/branching-story-health-audit .claude/skills/story-fact-promotion-to-canon` — passed as a stale-anchor sweep; remaining hits are updated positive fallback text or parent-flow lines that now include batch / persisted-slice retrieval.
4. `git diff --check` — passed with no whitespace errors.

## Deviations

- The drafted skill dry-run against `worlds/erotica-world/...` was not run. This ticket changed only prose and no executable skill runner exists for a faithful automated dry-run; grep proof plus manual contract review is the truthful verification boundary.
- The drafted `cd tools/world-mcp && npm test` runtime lane was not run. No runtime code, schema, or MCP registration changed; existing runtime coverage was verified by source/contract grep against `docs/CONTEXT-PACKET-CONTRACT.md`, `docs/FOUNDATIONS.md`, `tools/world-mcp/src/tool-names.ts`, and `tools/world-mcp/src/server.ts`.
- The drafted `docs/CONTEXT-PACKET-CONTRACT.md` edit was unnecessary because the live document already covered `persisted_with_summary`, `get_records`, and `get_persisted_packet_slice`.
- `character-generation`, `diegetic-artifact-generation`, `branching-story-bootstrap`, `branching-story-page-cycle`, and `storylet-pool-authoring` were inspected and left untouched because their live fallback prose already named the batch / persisted-slice recovery paths.
