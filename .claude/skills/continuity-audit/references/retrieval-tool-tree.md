# Retrieval Tool Decision Tree

Per-phase map of which MCP retrieval tool to invoke during `continuity-audit`. SKILL.md names the tools at key points; this reference records why each call belongs in that phase so the operator does not need to inspect TypeScript source mid-run.

The audit is an enumerate-and-judge workflow: every category sub-pass enumerates candidate nodes via typed queries, then applies semantic judgment. Bulk reads of `_source/` are redirected by Hook 2 — do not reach for them.

## Pre-flight

- `mcp__worldloom__allocate_next_id(world_slug, 'AU')` once per run. Allocate `RP` lazily — only when a finding produces a retcon card. Allocation is per-class-directory and append-only; a dropped card's reserved id becomes a permanent gap.
- `mcp__worldloom__get_canonical_vocabulary({class})` for `domain` (used to validate any retcon card's `domains_affected`), `verdict` (used when this audit's findings might be cited by a future canon-addition run), and `mystery_resolution_safety` (used in Phase 4h reasoning about Mystery Reserve corruption).
- `mcp__worldloom__get_context_packet(task_type='continuity_audit', seed_nodes=[<world-overview-seeds>], token_budget=20000)` to gather Kernel + Invariants + Mystery Reserve + recent CF/CH + named-entity neighbors. The audit packet is wider than canon-addition's because the categories are intrinsically cross-cutting; if `body_preview` is not enough for a category sub-pass, follow up with `get_record` on the specific node.

## Phase 0–1: Normalize Parameters and Scope

- `mcp__worldloom__search_nodes(query='change_id:CH-NNNN', node_types=['change_log_entry'])` to verify a `recent_canon_addition_cutoff` value before locking the delta window. If the cutoff CH-id is absent from the index, abort.
- `mcp__worldloom__get_record(record_id)` on the latest CH-NNNN to confirm the cutoff equals the latest CH (inclusive-anchor disambiguation per SKILL.md Phase 0 cutoff semantics).

## Phase 2: Change Log Delta Analysis

- `mcp__worldloom__search_nodes(node_types=['change_log_entry'], filters={...})` to enumerate CH records inside the cutoff window.
- For each CH in the window: `mcp__worldloom__get_record(CH-NNNN)` for `affected_fact_ids`, `required_world_updates`, `change_type`.
- `mcp__worldloom__get_neighbors(CH-NNNN, edge_types=['affects_cf', 'touches_invariant', 'touches_mystery_reserve'])` to fan out from each CH to its affected CFs, invariants, and mystery interactions.
- `mcp__worldloom__find_sections_touched_by(cf_id)` per affected CF to verify the `required_world_updates` list reflects actual `touched_by_cf` state on the SEC records (Rule 6 surface: a CH whose stated required updates do not match the SEC `touched_by_cf` arrays is a silent-retcon candidate).

## Phase 3: Continuity Lint Sweep

- `mcp__worldloom__search_nodes(query=..., exhaustive=true)` for the prose-body lint questions (Q9 diegetic re-reading, Q10 mystery overexposure). Exhaustive mode is the audit-trail surface.
- `mcp__worldloom__find_named_entities(names)` when a question targets specific named entities that may appear in `characters/` or `diegetic-artifacts/` frontmatter.
- `mcp__worldloom__get_neighbors(node_id, edge_types=['references_record'])` to follow structured edges where the lint question is structural (Q4 redundancy, Q5 silent-broader-adoption).

## Phase 4: Audit Category Passes

Each category names its preferred enumeration tool. All `_source/*.yaml` content arrives via these tools, never via raw `Read`.

- **4a Ontological Contradictions** — `search_nodes(node_types=['canon_fact_record'], filters={type: ['species','entity','metaphysical_rule','hidden_truth']})`; for each, `get_neighbors(CF, edge_types=['conforms_to_invariant'])` then compare against ONT-N invariants.
- **4b Causal Contradictions** — `search_nodes` for CFs with non-empty `costs_and_limits`; `get_neighbors(CF, edge_types=['referenced_by_cf'])` to surface CFs that USE a capability without paying the cost.
- **4c Distribution Contradictions** — `search_nodes(filters={'scope.geographic': ['local','regional']})`; cross-check downstream references via `get_neighbors`.
- **4d Timeline Contradictions** — `get_record` per SEC-TML record; `find_sections_touched_by(cf_id)` for any CF claiming temporal placement.
- **4e Institutional Contradictions** — `search_nodes(node_types=['section_record'], filters={file_class: 'institutions'})`; cross-reference against CFs whose `domains_affected` includes institutional domains.
- **4f Everyday-Life Contradictions** — `search_nodes(node_types=['section_record'], filters={file_class: 'everyday-life'})`; flag any CF whose `visible_consequences` would reshape ordinary life and is not reflected in any ELF SEC.
- **4g Tone / Identity Drift** — `get_record(WORLD_KERNEL.md)` for tonal contract; `search_nodes` over recent CFs' `notes` and `statement` fields for drift markers.
- **4h Mystery Corruption** — `search_nodes(node_types=['mystery_reserve_entry'])`; for each, `get_neighbors(M-NNNN, edge_types=['threatened_by_cf'])` to surface CFs that may have softened the firewall.
- **4i Diegetic Leakage** — `find_named_entities` to list `characters/` and `diegetic-artifacts/` records; `get_record` per dossier/artifact frontmatter; cross-check `known_firsthand` / `wrongly_believes` / artifact body claims against M-NNNN `disallowed cheap answers`.
- **4j Local/Global Drift** — `search_nodes(filters={'scope.geographic': ['local'], 'scope.social': ['restricted_group']})`; `find_impacted_fragments(CF-id)` to enumerate prose surfaces and flag scope-qualifier-dropping.

## Phase 6: Burden Debt Analysis

- `search_nodes(node_types=['canon_fact_record'], filters={type: ['capability','artifact','technology','institution','ritual','magic_practice']})`.
- For each CF: `get_record(CF)` for `costs_and_limits` and `distribution.why_not_universal` as declared at acceptance.
- `find_impacted_fragments(CF-id)` to enumerate later CFs and SEC records that reference this CF; check whether those references respect the stabilizers.

## Phase 8: Retcon Card Drafting

- `mcp__worldloom__allocate_next_id(world_slug, 'RP')` per emitted card. Cards-without-target-CF (escalation cases) consume no RP id.
- `mcp__worldloom__get_record(target_CF-NNNN)` to verify each `target_cf_ids` entry exists before writing the card.
- `mcp__worldloom__get_canonical_vocabulary({class: 'domain'})` to validate the card's `domains_affected` values before writing.

## Phase 13: Commit

- No retrieval call. Direct-`Edit` writes to `audits/AU-NNNN-<date>.md`, `audits/AU-NNNN/retcon-proposals/RP-NNNN-*.md`, and `audits/INDEX.md`. Hook 3 allows these because they live outside `_source/`.
