# Brainstorming: post-pilot MCP retrieval-surface refinements + engine convention sync

**Source**: surfaced by the 2026-04-26 first-live canon-addition run (animalia world, PR-0015 corner-share register). This doc captures findings that emerged from running the live pipeline end-to-end — they were not visible in any prior dry-run, fixture test, or static-validation pass.

**Status**: brainstorming. Awaits design call before promotion to a spec.

**Related shipped work**:
- `archive/specs/SPEC-15-pilot-feedback-fixes.md` — covers the immediately-actionable findings (Track A: rule5 + append_extension; Track B: documentation + skill content). SPEC-15 deliberately does NOT cover the items in this brainstorming doc; those are scoped here for separate prioritization.

---

## Bottom line

Six items split into two groups.

**Group 1 — Engine convention sync**:
- C1: `modification_history[]` ↔ `notes` synchronization decision.

**Group 2 — MCP retrieval-surface refinements**:
- C2: `get_context_packet` returns body_previews not full bodies.
- C3: `get_record` on large records exceeds context window.
- C4: No schema-discovery MCP tool.
- C5: `get_context_packet` budget guess-and-check UX.
- C6: `find_named_entities` prose-body scan parameter.

Each item is a real friction observed during the pilot. None block any current workflow (workarounds exist), but each pressures FOUNDATIONS §Tooling Recommendation ("LLM agents should never operate on prose alone. They should always receive: current World Kernel, current Invariants, relevant canon fact records, affected domain files, unresolved contradictions list") in different ways. Resolving this group is design work, not bug-fixing — choices have load-bearing consequences for the SPEC-12 skill-reliable-retrieval contract and (in some cases) for FOUNDATIONS prose itself.

---

## C1 — modification_history ↔ notes synchronization

### Observation

The patch engine's `append_modification_history_entry` op (`tools/patch-engine/src/ops/append-modification-history-entry.ts`) appends a structured entry to `record.modification_history[]` but does NOT touch `record.notes`. The validator `modification_history_retrofit` (`tools/validators/src/structural/modification-history-retrofit.ts`) checks one direction only: notes → history (every "Modified YYYY-MM-DD by CH-NNNN" line in notes must have a matching history entry). The reverse direction is unchecked.

Pre-SPEC-13 CF authoring convention (visible in CF-0006, CF-0024, CF-0017, and others) appended BOTH a notes "Modified YYYY-MM-DD by CH-NNNN (CF-NNNN): ..." paragraph AND a structured modification_history entry. The convention is currently maintained by SKILL.md prose only.

Live evidence: the just-shipped CF-0024 modification (for PR-0015 / CH-0021 / CF-0048) gained a structured history entry but no corresponding notes paragraph, drifting from the pre-SPEC-13 convention.

### The three options

**Option A — Auto-sync in engine.** Extend `append_modification_history_entry` op to also append a corresponding `Modified <date> by <ch_id> (<originating_cf>): <summary>` line to `record.notes` (or formalize a generated section). Pros: convention enforced by code; uniform across every engine-emitted CF mutation. Cons: modifies engine; introduces formatting opinion (where in `notes` does the line go? appended to end?); requires test coverage; affects every future CF mutation.

**Option B — Enforce both directions in validator.** Extend `modification_history_retrofit` to also check history → notes (every modification_history entry must have a corresponding notes paragraph). Pros: convention enforced by validator; engine stays simple. Cons: WORST intermediate state — every engine-emitted CF mutation between landing and the engine being updated to also write notes would FAIL validation. Useless without a coordinated engine update.

**Option C — Deprecate the notes-paragraph convention.** Declare `modification_history[]` the canonical audit surface post-SPEC-13. Update SKILL.md prose to drop the notes-paragraph requirement. Pros: least invasive; honors atomic-record discipline (modification_history IS the structured audit trail). Cons: loses human-readable in-record audit trail (a reader skimming a CF YAML's `notes` field no longer sees the modification history inline; they have to consult `modification_history[]` separately); creates a visible asymmetry between pre-SPEC-13 CFs (have both) and post-SPEC-13 CFs (have only modification_history).

### Open questions

- Is the notes-paragraph convention load-bearing for any current skill or audit workflow, or is it pure human-ergonomics? `continuity-audit` reads CF records — does it use the notes paragraphs, or is it driven by structured fields?
- If Option A, where exactly in `notes` does the new line land? Beginning? End? Section-aware (after a "Modification History (chronological):" header)? The engine has no current convention.
- Option C alignment with FOUNDATIONS: Rule 6 (No Silent Retcons) requires "all canon changes must be logged with justification." `modification_history[]` carries the structured log; the notes paragraph is human-redundant. Option C is FOUNDATIONS-compliant; Options A/B are FOUNDATIONS-strengthening (extra redundancy register).

### Recommended discussion path

Pick the option, then ticket. Each option has a different blast radius and different test-coverage implications. The decision should not be made inside a ticket; it's a SKILL.md / FOUNDATIONS / engine contract decision.

---

## C2 — get_context_packet returns body_previews, not full bodies

### Observation

`mcp__worldloom__get_context_packet(task_type, seed_nodes, token_budget)` returns nodes with `body_preview` truncated at ~282 chars and `summary` always null. For real reasoning, skills need full record content, requiring follow-up `get_record(record_id)` calls per cited node.

The packet's value is as an INDEX of relevant nodes, not as content. Live result: the 2026-04-26 PR-0015 packet at 16000-token budget covered 132 nodes but every node body was truncated; reasoning required ~7 follow-up `get_record` calls for the load-bearing CFs/SECs.

### FOUNDATIONS pressure

`docs/FOUNDATIONS.md` §Tooling Recommendation:
> LLM agents should never operate on prose alone. They should always receive:
> - current World Kernel
> - current Invariants
> - relevant canon fact records
> - affected domain files
> - unresolved contradictions list

The plain reading is "agents receive content, not pointers to content." Current packet behavior delivers pointers (truncated previews) + a follow-up call pattern. Either FOUNDATIONS prose needs softening to "agents should receive — directly or via a documented retrieval pattern — Kernel + Invariants + relevant CF records + ...", or the packet needs to ship full bodies for the load-bearing classes.

### The three options

**Option A — Ship full record bodies in the packet for load-bearing classes.** For `task_type='canon_addition'`, full bodies for: cited CFs, all invariants under `_source/invariants/`, the proposal's seed_node sections. Bumps default packet size from ~16KB to ~50–80KB per typical canon-addition run. Pros: agents get content directly; aligns with FOUNDATIONS plain reading; eliminates the follow-up-call tax. Cons: packets often exceed model context window in single response (already observed at 16K budget — agent had to use subagent extraction); requires either streaming responses or budget-driven truncation discipline at the MCP boundary.

**Option B — Add a `richness: 'index' | 'full'` parameter.** Default to current `'index'` behavior; opt into `'full'` for skills that need it. Pros: backwards compatible; skill chooses. Cons: skill author has to know to ask; no FOUNDATIONS pressure relief.

**Option C — Soften FOUNDATIONS prose.** Reword §Tooling Recommendation to explicitly endorse the index + follow-up-call pattern. Pros: zero code changes; documents existing behavior. Cons: potentially weakens the principle.

### Connection to other items

C5 (auto-budget) and C3 (slice tool) both reduce the friction of the index + follow-up pattern, partially relieving the C2 pressure even if the packet itself stays index-only. If C3 + C5 land, C2 may not need a code change — Option C suffices.

---

## C3 — get_record_field slice tool

### Observation

`mcp__worldloom__get_record(record_id)` returns the full parsed record. For records >50KB (animalia: SEC-ELF-001 ≈ 76KB), the response exceeds context budget and the agent has to dispatch a subagent with jq queries. There is no MCP tool to retrieve a specific field of a record without retrieving the whole thing.

### Proposal

New tool: `mcp__worldloom__get_record_field(record_id, field_path)`, where `field_path` is a string array (e.g., `["touched_by_cf"]` or `["body"]` or `["extensions", 0, "body"]`). Returns the specified field's value, parsed.

### Open questions

- Does this break the SPEC-12 skill-reliable-retrieval contract, which is built around whole-record retrieval? Answer: probably not — the contract is about completeness guarantees per task type, not whole-record-only.
- Should the tool support multiple field paths in one call? E.g., `get_record_fields(record_id, [["touched_by_cf"], ["extensions"]])`. Probably yes; reduces round-trips for skills doing structural inspection.
- File-class-aware variants? E.g., `get_section_metadata(sec_id)` returning `{file_class, heading, touched_by_cf, extension_count}` without the body. Or is that already covered by `find_sections_touched_by` reverse-lookup? Mostly yes; `find_sections_touched_by(cf_id)` returns metadata without body for sections citing a CF.

### Connection to other items

Largely orthogonal to C2. Ships independently. Reduces friction of the index + follow-up pattern (C2 Option C) by making per-field retrieval cheap.

---

## C4 — get_record_schema discovery tool

### Observation

`mcp__worldloom__get_canonical_vocabulary({class})` returns enum values for `domain`, `verdict`, `mystery_status`, `mystery_resolution_safety`. There is no parallel tool for record-shape contracts: field names, types, optional/required, regex patterns. A skill author who wants to know "what fields can a CF have?" must either:
- Read `tools/world-index/src/schema/types.ts` directly (TypeScript source)
- Read `tools/validators/src/schemas/canon-fact-record.schema.json` (JSON Schema)
- Submit a draft and read the validation failure messages

Live evidence: the 2026-04-26 PR-0015 run hit a `record_schema_compliance.pattern` failure for `pre_figured_by/0` because the agent didn't know the field's regex constraint.

### Proposal

New tool: `mcp__worldloom__get_record_schema(node_type)`, where `node_type` is `canon_fact_record` / `change_log_entry` / `invariant` / `mystery_reserve_entry` / `open_question_entry` / `named_entity` / `section` / `character_dossier` / `diegetic_artifact_frontmatter` / `adjudication_frontmatter`. Returns the JSON Schema for that record type, sourced from the existing `tools/validators/src/schemas/*.json` files.

### Open questions

- Should the response also include human-readable field semantics (e.g., "`pre_figured_by` is for CF-to-CF foreshadowing; DA refs go in `source_basis.derived_from`")? That's the SPEC15PILFIX-002 documentation gap — answered there for one field; could the schema endpoint return the same prose? If yes, the schema files need a `description` field per property; not present today.
- Generation pattern: returns the static JSON Schema, or computes a "current effective schema" merging structural validators + rule-level constraints (e.g., FOUNDATIONS Rules 11/12 from SPEC-09's conditionally-mandatory fields)? For SPEC-09 strict mode, the latter is more useful but harder to maintain.

### Connection to other items

Largely orthogonal. Ships independently. Reduces the "read TypeScript to understand schemas" tax that every skill author hits today.

---

## C5 — get_context_packet auto-budget UX

### Observation

`get_context_packet(..., token_budget=10000)` failed with `packet_incomplete_required_classes` and reported `minimum_required_budget: 12485`. Bumped to 14000 — failed again with `minimum_required_budget: 14322`. Bumped to 16000 — succeeded but produced a packet larger than the agent's context could hold.

The packet sizing requires guess-and-check. The error tells the agent the exact minimum but doesn't auto-grant it. Three potential fixes:

### The three options

**Option A — First-call success.** When the requested budget is below the minimum, the tool auto-grants `minimum_required_budget` and returns a successful packet plus a warning. Pros: zero round-trips. Cons: the agent might genuinely want a budget cap and the tool overrides it.

**Option B — `dry_run: true` parameter.** Returns `{minimum_required_budget: N}` without producing the packet. Agent can then call with the exact budget. Pros: explicit; no implicit override. Cons: 2 round-trips; awkward UX.

**Option C — Improved error response.** Current error message includes the minimum, but the agent has to parse and retry manually. Add a structured retry hint: `error: { code: "packet_incomplete_required_classes", retry_with: { token_budget: 12485 } }`. Pros: lightweight; preserves explicit retry. Cons: still 2 round-trips.

### Open questions

- What's the right default packet budget for `task_type='canon_addition'`? Live observation: minimum was ~14.3K for animalia at current state. Defaults of 15000 or 20000 would have first-call-succeeded. Setting a higher default risks bloating non-canon-addition tasks that don't need it.
- Per-task-type defaults? `task_type='canon_addition'` defaults to 15000; `task_type='character_generation'` defaults to 8000; etc. Probably yes — already endorsed by SPEC-12's task-type-aware ranking profiles.

### Connection to other items

Largely orthogonal. Ships independently. Reduces friction of any context-packet-using workflow.

---

## C6 — find_named_entities prose-body scan parameter

### Observation

`mcp__worldloom__find_named_entities(names)` searches the entity registry's canonical_name + alias + scoped_reference fields. It does NOT lexically scan prose body content (section bodies, diegetic-artifact bodies, character-dossier bodies). For Rule 6 audit-trail / pre-figuring scans where the target string may appear ONLY in prose (e.g., a name mentioned in a diegetic artifact's body but never registered as a canonical entity), the current tool returns zero matches.

Live evidence: during PR-0015 pre-figuring scan, I queried `["corner-share", "serious-share", ...]` and got zero canonical_matches — correct! But I had no way to confirm via MCP that the strings DO appear in DA-0001's body prose; I had to trust the proposal's self-claim. A FTS5 lexical scan would have surfaced DA-0001 paragraph 7 directly.

### Proposal

Add a parameter to `find_named_entities`:

```
find_named_entities(names, options?: {
  include_prose_body?: boolean,  // default false
  body_node_types?: NodeType[]   // default ['section', 'diegetic_artifact_record', 'character_record'] when prose_body is true
})
```

When `include_prose_body: true`, the tool ALSO runs an FTS5 lexical query against the listed node types' body text and returns matches in a fourth array: `prose_matches[]`.

### Open questions

- Is this better as a separate tool? E.g., `find_string_in_world(query, node_types?)`. Answer: probably yes — the SPEC-12 ranking layer already endorses task-type-aware searches; "find this string anywhere" is a different task than "find this entity."
- Does the existing `mcp__worldloom__search_nodes(query)` already cover this? Partially — it runs lexical search but its ranking returns ranked-by-relevance results, not exhaustive presence/absence. For Rule 6 audit-trail scans, exhaustive is what's needed.

### Connection to other items

Couples loosely with the SPEC-12 search-vs-find separation. May be cleaner to specify as an extension of `search_nodes` (add an `exhaustive: true` mode) rather than a new parameter on `find_named_entities`.

---

## Summary — recommended sequencing if these are promoted to specs

If/when this brainstorming doc gets promoted to a spec (or split into multiple specs):

1. **C5 first** — auto-budget UX. Smallest blast radius; no contract changes; pure UX win.
2. **C3 + C4 next** — both are new MCP tools, additive. Independent of each other; can land in parallel.
3. **C1** — design call between A/B/C. May land via FOUNDATIONS amendment + skill prose change rather than code.
4. **C6** — depends on the C6 / search_nodes coupling decision (extend find_named_entities vs extend search_nodes vs new tool).
5. **C2** — likely the last to ship; biggest architectural decision (full-bodies-in-packet vs index-only contract). Resolution of C3 + C5 may relieve enough pressure that C2 stays at Option C (FOUNDATIONS prose softening).

This sequencing keeps the smallest, most contained changes shipping first and defers the FOUNDATIONS-pressuring decisions to last.
