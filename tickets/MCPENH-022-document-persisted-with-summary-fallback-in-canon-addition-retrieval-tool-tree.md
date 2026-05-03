# MCPENH-022: Extend MCPENH-020's `persisted_with_summary` fallback documentation pattern to canon-addition's retrieval-tool-tree reference

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: None — documentation-only ticket; no code, no schema, no MCP tool surface change. Touched: `.claude/skills/canon-addition/references/retrieval-tool-tree.md` (add `get_persisted_packet_slice` enumeration + persisted-with-summary recovery section); optionally `.claude/skills/canon-addition/SKILL.md` §World-State Prerequisites (inline mention of the fallback path)
**Deps**: MCPENH-020 (which established the persisted-with-summary documentation pattern for Category 2 / 2b skills); `mcp__worldloom__get_persisted_packet_slice` already ships per MCPENH-020 and FOUNDATIONS.md §Tooling Recommendation

## Problem

`mcp__worldloom__get_context_packet` returns a structured response whose `delivery_status` indicates whether the packet body is delivered inline or persisted to a `/tmp/worldloom-mcp-tool-results/<uuid>.json` file. When the packet's content exceeds the harness ceiling (60000 chars per the response's `harness_ceiling_chars`), the runtime returns `delivery_status: persisted_with_summary`:

- All `nodes` arrays in `local_authority`, `exact_record_links`, `scoped_local_context`, `governing_world_context`, and `impact_surfaces` are empty (`[]`).
- The full packet body is persisted to a file referenced by `task_header.persisted_output_path`.
- Only `governing_summary` (id-lists per record class) and `truncation_summary.fallback_advice` survive inline.
- `token_budget.allocated` is much smaller than `token_budget.requested` (e.g., 2477 of 12000 in the worked instantiation below).

The packet response's `truncation_summary.fallback_advice` field already names the correct recovery: `"Full packet body persisted at task_header.persisted_output_path. Use mcp__worldloom__get_persisted_packet_slice for structured slice extraction, or mcp__worldloom__get_record / mcp__worldloom__get_records for individual records by id."` — this is an MCP-runtime advice string, machine-readable.

MCPENH-020 (`archive/tickets/MCPENH-020-document-persisted-with-summary-fallback-and-batch-retrieval.md`, completed 2026-05-03) extended skill-prose alignment with this runtime advice for Category 2 / 2b skills (`canon-facts-from-diegetic-artifacts`, `propose-new-canon-facts`, `propose-new-characters`, `continuity-audit`, `propose-new-worlds-from-preferences`, `branching-story-health-audit`, `story-fact-promotion-to-canon`). The MCPENH-020 ticket explicitly listed `canon-addition` among the Category 3 canon-mutating skills its scan touched but did NOT amend, on the grounds that canon-addition's existing references already documented `get_records` and the batch-retrieval pattern (verified at `.claude/skills/canon-addition/references/retrieval-tool-tree.md` lines 9, 14, 22-23, 35).

What MCPENH-020 did NOT verify (because it was Category 2/2b-scoped) is that canon-addition's `references/retrieval-tool-tree.md` ALSO documents `get_persisted_packet_slice`. It does not. The `get_persisted_packet_slice` tool is absent from canon-addition's retrieval-tool guidance entirely (`grep -n "get_persisted_packet_slice" .claude/skills/canon-addition/` returns zero hits). Operators following canon-addition's documentation see `get_records` for batch retrieval and `get_record` for singular retrieval, but no documented path for the `persisted_with_summary` case where a slice extraction from the persisted file is the recovery shape.

Worked session evidence (2026-05-03): a `canon-addition` invocation for `worlds/erotica-world/proposals/PR-0002-centro-cultivated-purchased-discretion-grammar.md` (PA-0003 / CF-0004 / CH-0004) called `get_context_packet(world_slug='erotica-world', task_type='canon_addition', seed_nodes=[<11 ids: CF-0001 + CF-0003 + DIS-1 + CAU-2 + SOC-2 + AES-1 + M-1 + 4 SEC ids>], token_budget=12000)`. The response returned `delivery_status: persisted_with_summary`, `token_budget.allocated: 2477`, all `nodes` arrays empty, and `dropped_node_ids_by_class` listing the 11 seed records plus the full canonical neighborhood (50+ records total). The operator subsequently made ~11 individual `get_record` calls to retrieve the relevant CFs / invariants / mystery-reserve entries / sections rather than calling `get_persisted_packet_slice(task_header.persisted_output_path, slice_path='governing_world_context.nodes')` once to extract the persisted slice, or `get_records(record_ids=[...11 ids...], world_slug='erotica-world')` to batch-fetch. Tool-call round count: ~11 individual reads where a single batch or slice would have sufficed. The operator reported the friction in the canon-addition skill-audit (this session) and traced the gap to absent `get_persisted_packet_slice` documentation in the cited reference (`references/retrieval-tool-tree.md`).

This ticket extends MCPENH-020's documentation pattern to canon-addition's `references/retrieval-tool-tree.md` so the persisted-with-summary recovery path is discoverable from the skill prose's enumerated retrieval-tool list. The MCP runtime tools and behavior are unchanged; only the documentation surface widens.

## Assumption Reassessment (2026-05-03)

1. **Current state of canon-addition retrieval-tool-tree.md verified by direct file read:** lines 9, 14, 22-23, 35 enumerate `mcp__worldloom__get_records` for batch retrieval; line 9 documents the `retry_with.token_budget` retry pattern; line 9 also documents the canon-addition default budget as 16000. `mcp__worldloom__get_persisted_packet_slice` is absent across the entire skill directory (verified via `grep -rn "get_persisted_packet_slice" .claude/skills/canon-addition/` — zero hits).
2. **Current state of canon-addition SKILL.md §World-State Prerequisites verified by direct file read:** line 76 cites `docs/CONTEXT-PACKET-CONTRACT.md` (which does cover the `persisted_with_summary` case per MCPENH-020 §Assumption Reassessment item 9), names `mcp__worldloom__get_record` (singular) for individual record retrieval, references `references/retrieval-tool-tree.md` for the phase-by-phase decision tree, but does NOT inline-mention `get_persisted_packet_slice` or the persisted-with-summary case. The cited reference is currently incomplete on this point.
3. **Cross-skill / cross-artifact boundary:** the shared boundary is the **retrieval-tool enumeration convention** in skill prose that documents the MCP packet pattern. MCPENH-020 established this convention for Category 2 / 2b skills (per `references/cross-skill-consistency.md` §Skill Category Classification); this ticket extends it to canon-addition (Category 3). Per MCPENH-020 §Assumption Reassessment item 1, the convention is: "skills using `get_context_packet` document `get_persisted_packet_slice` and `get_records` as the recovery paths for `persisted_with_summary` delivery." The convention is sibling-stable across MCPENH-020's targets; canon-addition is the asymmetric outlier.
4. **FOUNDATIONS principle under audit (§Tooling Recommendation):** "LLM agents should always receive — directly or via the documented context-packet + targeted-retrieval pattern — current World Kernel, current Invariants, relevant canon fact records, affected domain files, unresolved contradictions list, mystery reserve entries touching the same domain." canon-addition's pattern honors this for the singular retrieval path; this ticket strengthens the same principle by documenting the persisted-slice fallback shape so operators can satisfy the recommendation efficiently when the packet exceeds inline budget.
5. **No HARD-GATE / Mystery Reserve firewall surface touched:** documentation only; canon-mutation enforcement (Hook 3 engine-only `_source/` writes, the patch engine's append-only ledger discipline, MR firewall enforcement) is unaffected.
6. **No schema extension:** no Canon Fact Record / Change Log Entry / proposal card / character dossier / diegetic artifact field changes.
7. **Adjacent contradictions:** `references/retrieval-tool-tree.md` line 9 documents the `retry_with.token_budget` retry pattern but does not enumerate the `persisted_with_summary` case as a distinct delivery state requiring different recovery. The reference's mental model treats packet-incompleteness as a budget-too-small problem solvable by retry; the actual runtime behavior includes a budget-exceeds-harness-ceiling case where retry alone won't help (the persisted-with-summary path is the only complete recovery). Adding the `get_persisted_packet_slice` guidance also clarifies this distinction.
8. **MCPENH-020 scope decision audit:** MCPENH-020's §Assumption Reassessment item 1 explicitly named `.claude/skills/canon-addition/` among the scanned-but-not-amended surfaces. The justification was sibling-scoping (Category 2 / 2b only). The decision was correct under MCPENH-020's scope; this ticket does not reverse it but extends the same documentation pattern under a Category 3 scope. Confirmed via `git log --all -- archive/tickets/MCPENH-020-*.md` and direct read of MCPENH-020's text.
9. **Verification command sanity check:** the only commands this ticket needs are documentation-completeness greps and a manual review of the new prose. No build, no test runner, no validator invocation. The verification surface mirrors MCPENH-020's documentation-only verification posture (per its §Verification Layers).
10. **Optional in-scope addition:** SKILL.md §World-State Prerequisites (line 76) could surface the persisted-with-summary recovery inline (one-line mention) instead of relying on operators to load `references/retrieval-tool-tree.md`. This is a judgment call; the parsimonious version of this ticket touches only the reference (single file), but the SKILL.md inline mention would mirror MCPENH-020's same-seam pattern (it added inline mentions to several Category 2 skill SKILL.md files). Recommendation: include the SKILL.md inline mention as part of this ticket; it is a 1-2 sentence addition that closes the discoverability gap fully.

## Architecture Check

1. **Why this approach is cleaner than alternatives:**
   - **Alternative A** — extend the MCP runtime to make `get_context_packet` always return inline content even when over budget (e.g., truncate per-node content to fit): rejected because the existing persisted-with-summary design is the right runtime behavior for over-budget cases (preserves full content in a recoverable form rather than silently dropping); the friction is documentation-side, not runtime-side.
   - **Alternative B** — add a new MCP tool that combines `get_persisted_packet_slice` + `get_records` into a single fallback-recovery primitive: rejected as redundant with the existing two-tool surface MCPENH-020 already documents; introducing a third tool would dilute the convention rather than clarify it.
   - **Alternative C** — leave canon-addition's documentation as-is and rely on operators to load the cited `docs/CONTEXT-PACKET-CONTRACT.md` for the persisted-with-summary recovery: rejected because it requires operators to consult a doc-tree document mid-flow; MCPENH-020 established the convention of inline documentation in skill prose for Category 2/2b skills, and applying the same convention to canon-addition (Category 3) is the consistent extension.
   - **The chosen approach** (extend canon-addition's `references/retrieval-tool-tree.md` to enumerate `get_persisted_packet_slice` and add a brief persisted-with-summary recovery section) follows MCPENH-020's established pattern, requires zero runtime change, and closes the discoverability gap at the location operators are already directed to read (`references/retrieval-tool-tree.md` is cited by SKILL.md §World-State Prerequisites line 76).

2. **No backwards-compatibility shims:** documentation additions only; no code paths altered, no API signatures changed, no enum extensions. Existing operator workflows continue to work; the addition expands the documented toolkit and clarifies the recovery shape for an operationally-likely case.

## Verification Layers

1. **`get_persisted_packet_slice` enumerated in canon-addition's retrieval-tool-tree.md** → codebase grep-proof: `grep -n "get_persisted_packet_slice" .claude/skills/canon-addition/references/retrieval-tool-tree.md` returns at least one hit naming the tool and its arguments (`persisted_path`, `slice_path`).
2. **Persisted-with-summary recovery shape documented inline** → manual review of the new prose: the section explicitly names `delivery_status: persisted_with_summary`, the empty inline `nodes` arrays, the persisted-path location (`task_header.persisted_output_path`), and the two recovery paths (`get_persisted_packet_slice` for slice extraction; `get_records` for known id sets).
3. **Sibling alignment with MCPENH-020 preserved** → manual review: the new section's wording and structure parallel MCPENH-020's edits in `canon-facts-from-diegetic-artifacts/references/preflight-and-prerequisites.md` §"Persisted-with-summary delivery handling" (cited from MCPENH-020 §Landed Changes item 1) so canon-addition operators reading the prose see the same recovery shape Category 2/2b operators see.
4. **No documentation drift introduced elsewhere** → codebase grep-proof: `grep -rn "persisted_with_summary" .claude/skills/canon-addition/` post-edit shows hits ONLY in the touched files; no orphaned references introduced.
5. **FOUNDATIONS alignment preserved** → FOUNDATIONS alignment check: §Tooling Recommendation enumeration includes `get_records` and `get_persisted_packet_slice`; this ticket extends skill-prose alignment to that enumeration for the canon-addition surface.
6. **Optional SKILL.md inline mention reads coherently** → manual review: if the SKILL.md §World-State Prerequisites inline mention is added per Assumption Reassessment item 10, the new sentence does not disrupt the section's flow and cites `references/retrieval-tool-tree.md` for the full recovery details.

## What to Change

### 1. Extend canon-addition's retrieval-tool-tree.md

In `.claude/skills/canon-addition/references/retrieval-tool-tree.md`:

- Add `mcp__worldloom__get_persisted_packet_slice(persisted_path, slice_path)` to the §Pre-flight retrieval-tool enumeration (currently lines 9-14 area; verify exact insertion point at implementation time).
- Add a brief §"Persisted-with-summary delivery handling" sub-section near the §Pre-flight section that:
  - Names `delivery_status: persisted_with_summary` as the over-budget delivery state.
  - Notes the empty inline `nodes` arrays and the persisted file path location (`task_header.persisted_output_path`).
  - Names the two recovery paths: `get_persisted_packet_slice(persisted_path=task_header.persisted_output_path, slice_path='<dot-path>')` for ranked slice extraction, and `get_records(record_ids=[...], world_slug=<slug>)` for known id sets.
  - Cross-references `docs/CONTEXT-PACKET-CONTRACT.md` for the full contract.
- Pattern-match MCPENH-020's wording in `.claude/skills/canon-facts-from-diegetic-artifacts/references/preflight-and-prerequisites.md` §"Persisted-with-summary delivery handling" so the prose is sibling-stable.

### 2. Optional: surface in canon-addition SKILL.md §World-State Prerequisites

In `.claude/skills/canon-addition/SKILL.md` (line 76 area, §World-State Prerequisites):

- Add a 1-sentence inline mention of the persisted-with-summary recovery, citing `references/retrieval-tool-tree.md` for details. Example phrasing: "When the packet returns `delivery_status: persisted_with_summary` (over-budget delivery), use `mcp__worldloom__get_persisted_packet_slice` or `mcp__worldloom__get_records` per `references/retrieval-tool-tree.md` rather than falling back to per-record `get_record` calls."
- Verify the addition does not disrupt the section's existing flow; the section currently lists `get_record`, `find_sections_touched_by`, `find_named_entities` for targeted retrieval — the new mention slots in as a fallback-state note.

This addition is recommended (Assumption Reassessment item 10) but separable; if the operator implementing this ticket prefers the parsimonious version (reference-only), the SKILL.md edit can be deferred to a follow-up ticket.

## Files to Touch

- `.claude/skills/canon-addition/references/retrieval-tool-tree.md` (modify — primary edit)
- `.claude/skills/canon-addition/SKILL.md` (modify — optional inline mention per Assumption Reassessment item 10)

## Out of Scope

- **Runtime behavior changes**: `get_context_packet` continues to return `persisted_with_summary` for over-budget deliveries; the inline-vs-persisted decision logic is unchanged.
- **Other canon-mutating skills (Category 3)**: `create-base-world` does not call `get_context_packet` in the same pattern (it bootstraps a new world with no prior content to gather); it does not need this documentation. If a future Category 3 skill is added that does use the packet pattern, it should follow MCPENH-022's pattern rather than re-deriving.
- **Other Category 2/2b skills**: MCPENH-020 already covered them. This ticket is scoped to canon-addition only.
- **`docs/CONTEXT-PACKET-CONTRACT.md` source edits**: per MCPENH-020 §Assumption Reassessment item 9, the contract document already covers `persisted_with_summary`, `get_persisted_packet_slice`, and `get_records`. No source change needed; cross-references in the touched files cite the existing section.
- **New MCP tools**: out-of-scope per Architecture Check §1 alternatives B.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "get_persisted_packet_slice" .claude/skills/canon-addition/references/retrieval-tool-tree.md` — returns at least one hit naming the tool and its arguments after the edit.
2. `grep -n "persisted_with_summary" .claude/skills/canon-addition/references/retrieval-tool-tree.md` — returns at least one hit naming the delivery state after the edit.
3. `grep -rn "persisted_with_summary\|get_persisted_packet_slice" .claude/skills/canon-addition/` — post-edit hits are confined to the touched files; no orphaned references introduced.
4. **None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.** No build, no test runner, no validator invocation.

### Invariants

1. **canon-addition operators have a documented recovery path for the persisted-with-summary case**: `references/retrieval-tool-tree.md` enumerates `get_persisted_packet_slice` and the recovery shape, parallel to the Category 2/2b skills MCPENH-020 covered.
2. **Sibling-stability with MCPENH-020 preserved**: the new prose's structure mirrors `canon-facts-from-diegetic-artifacts/references/preflight-and-prerequisites.md` §"Persisted-with-summary delivery handling" so a future operator reading both finds the same shape and conclusions.
3. **No runtime tool surface change**: `mcp__worldloom__get_context_packet` and `mcp__worldloom__get_persisted_packet_slice` continue to behave exactly as before; this ticket adds no new MCP tool, no new runtime field, no new behavior.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n "get_persisted_packet_slice" .claude/skills/canon-addition/references/retrieval-tool-tree.md` — targeted documentation grep.
2. `grep -n "persisted_with_summary" .claude/skills/canon-addition/references/retrieval-tool-tree.md` — targeted documentation grep.
3. `grep -rn "persisted_with_summary\|get_persisted_packet_slice" .claude/skills/canon-addition/` — coverage-completeness grep.
4. Manual side-by-side review of the new section against `.claude/skills/canon-facts-from-diegetic-artifacts/references/preflight-and-prerequisites.md` §"Persisted-with-summary delivery handling" to confirm sibling-stability of structure and wording.
