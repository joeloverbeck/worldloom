# CORRIDOR-001: Context packet — enforce token_budget strictly with drop-priority + truncation_summary

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-mcp/` packet-builder (budget enforcement + truncation tracking); `docs/CONTEXT-PACKET-CONTRACT.md` schema extension (additive `truncation_summary` field + drop-priority documentation)
**Deps**: None — additive enforcement on existing packet contract

## Problem

`mcp__worldloom__get_context_packet` returns payloads that exceed the requested `token_budget`, forcing the runtime to save the response to a file rather than deliver it inline. Session evidence from DA-0003 generation against `worlds/animalia/` (47 CFs, 20 M records, 16 invariants): a `token_budget=14000` request for the `diegetic_artifact_generation` profile returned a 69,330-character payload (~23K-token equivalent), saved to a temporary file. The documented default `token_budget=10000` would have overflowed similarly.

`docs/CONTEXT-PACKET-CONTRACT.md` line 118 already specifies that the packet's five content layers "deliver an INDEX of locality-relevant nodes plus body-preview snippets sufficient for ranking and citation, not the full bodies of every node." For mature worlds the cumulative preview content is exceeding any reasonable budget, indicating either preview snippets are too long, all five layers are filled without prioritization under budget pressure, or the implementation isn't enforcing the cap. The result: skills cannot rely on inline packet delivery and must improvise fallbacks (dossier-trace shortcut when `character_path` is provided; per-record retrieval otherwise) without documented procedures.

## Assumption Reassessment (2026-04-27)

1. `tools/world-mcp/src/tools/` contains the get-context-packet tool handler; `tools/world-mcp/src/tool-names.ts:6` confirms `get_record_field: "mcp__worldloom__get_record_field"` exists alongside `get_record`. The packet builder logic itself lives in the world-mcp package; exact file path verified at implementation time.
2. `docs/CONTEXT-PACKET-CONTRACT.md` line 118 documents the index+preview discipline; line 113 documents `packet_incomplete_required_classes` as the completeness-insufficiency signal (distinct from budget-pressure truncation, which is a separate concern this ticket introduces).
3. Cross-artifact boundary: the packet schema is consumed by every canon-pipeline skill that calls `get_context_packet` — character-generation, diegetic-artifact-generation, canon-addition, continuity-audit, propose-new-canon-facts, canon-facts-from-diegetic-artifacts, create-base-world. The `truncation_summary` field is additive and can be ignored by consumers that don't yet read it.
4. FOUNDATIONS principle under audit: `docs/FOUNDATIONS.md` §Tooling Recommendation (line 476) requires LLM agents receive "current World Kernel + current Invariants + relevant canon fact records + affected domain files + unresolved contradictions list + mystery reserve entries touching the same domain" via the context packet "complemented by targeted per-record retrieval." Strict budget enforcement preserves this contract because the packet's job is to identify WHAT must be retrieved (index); per-record retrieval delivers the bodies. Truncation under budget pressure routes the dropped layers' nodes to the per-record fallback explicitly rather than implicitly via overflow-to-file.
6. Schema extension: `truncation_summary` is an additive optional field on the packet response. Consumers can ignore it safely; consumers that read it gain explicit visibility into what to fetch via `get_record` / `get_record_field`. No breaking change.

## Architecture Check

1. Strict budget enforcement with documented drop priority is cleaner than overflow-to-file because it keeps the packet response inline (consumable by the calling skill without a subagent or jq round-trip) and surfaces truncation as first-class metadata rather than a runtime artifact. The fallback path (per-record retrieval) is already part of FOUNDATIONS §Tooling Recommendation; truncation just routes dropped nodes there explicitly.
2. No backwards-compatibility aliasing/shims introduced. `truncation_summary` is a new optional field; existing callers that don't read it are unaffected. Drop priority is a new behavior under budget pressure that previously didn't exist (the prior behavior was overflow); since prior overflow was a failure mode, replacing it doesn't constitute a contract break.

## Verification Layers

1. `token_budget` is respected on every packet response → schema validation: integration test asserts `len(json.dumps(response))` (or token-equivalent) is ≤ requested budget for each canonical profile against a mature-world fixture.
2. Drop priority is correct under budget pressure → unit tests on packet builder: assert that with budget set to force truncation, layers are dropped in order `impact_surfaces` → `scoped_local_context` → `exact_record_links` → `governing_world_context`, with `local_authority` + `task_header` always preserved.
3. `truncation_summary` is populated correctly → schema validation: integration test asserts that when truncation occurred, `truncation_summary` lists each dropped layer name plus the node-id list that would have appeared there (so the consumer can fetch via `get_record`).
4. CONTEXT-PACKET-CONTRACT.md drop-priority documentation is internally consistent with the implementation → FOUNDATIONS alignment check: drop order in the doc matches drop order in the code.

## What to Change

### 1. Packet builder enforces `token_budget` strictly

When the cumulative serialized response would exceed `token_budget`, the builder drops content in priority order rather than emitting the over-budget payload. Drop priority (cheapest-to-drop first):

1. `impact_surfaces` — downstream-impact hints, optional per CONTEXT-PACKET-CONTRACT.md line 104 ("trim-first under budget pressure")
2. `scoped_local_context` — adjacent same-file nodes that keep the seed-local bundle truthful
3. `exact_record_links` — direct edges from local_authority nodes
4. `governing_world_context` — kernel + invariants + active rules

`local_authority` and `task_header` are never dropped. If even `local_authority` would exceed budget alone, return the response with a `packet_incomplete_required_classes` entry per CONTRACT line 113 (existing mechanism) plus `truncation_summary` listing every layer that didn't fit.

### 2. Add `truncation_summary` field to the packet response schema

Schema:

```json
{
  "truncation_summary": {
    "dropped_layers": ["impact_surfaces", "scoped_local_context"],
    "dropped_node_ids_by_layer": {
      "impact_surfaces": ["SEC-INS-007", "SEC-ELF-002", ...],
      "scoped_local_context": ["CF-0033", "M-12", ...]
    },
    "fallback_advice": "Retrieve dropped nodes via mcp__worldloom__get_record(record_id) or mcp__worldloom__get_record_field(record_id, field_path) as needed."
  }
}
```

When no truncation occurred, `truncation_summary` MAY be absent OR present-with-empty-arrays — the implementation chooses one and CONTRACT.md documents the choice.

### 3. Update `docs/CONTEXT-PACKET-CONTRACT.md`

Add a new subsection §Budget Enforcement after the existing §Layers section (or wherever it fits structurally). Document:
- Strict enforcement: response size ≤ requested `token_budget`.
- Drop priority order (1-4 as above).
- `local_authority` and `task_header` are never dropped.
- `truncation_summary` field schema + when it is populated.
- Fallback procedure (per-record retrieval per FOUNDATIONS §Tooling Recommendation).

### 4. Update skill documentation that references the packet

Skills that document a "fallback when packet exceeds budget" procedure (currently `diegetic-artifact-generation/references/world-state-prerequisites.md` §Context-packet-too-large fallback added in PA-0017 audit follow-up) cross-reference the new CONTRACT.md §Budget Enforcement section to keep the fallback discipline aligned.

## Files to Touch

- `tools/world-mcp/src/tools/get-context-packet.ts` (modify — exact path verified at implementation time)
- `tools/world-mcp/src/packet-builder/` (modify — drop-priority logic)
- `docs/CONTEXT-PACKET-CONTRACT.md` (modify — add §Budget Enforcement section + `truncation_summary` schema)
- `tools/world-mcp/tests/` (new tests — drop priority + truncation_summary)
- `.claude/skills/diegetic-artifact-generation/references/world-state-prerequisites.md` (modify — cross-reference CONTRACT.md §Budget Enforcement from §Context-packet-too-large fallback)

## Out of Scope

- New delivery modes (e.g., `summary_only`) — that is CORRIDOR-002.
- New filter parameters (e.g., `node_classes_to_include`) — that is CORRIDOR-003.
- Hybrid-record retrieval via `get_record` — that is CORRIDOR-004.
- New focused retrieval tools (`get_firewall_content`) — that is CORRIDOR-005.
- The `packet_incomplete_required_classes` mechanism (existing per CONTRACT line 113) — preserved as-is; this ticket is about budget-pressure truncation, not completeness insufficiency.

## Acceptance Criteria

### Tests That Must Pass

1. `node tools/world-mcp/dist/tests/packet-budget.test.js` — request packet with `token_budget=8000` against `worlds/animalia/` (mature-world fixture); response size ≤ 8000-token equivalent AND `truncation_summary.dropped_layers` is non-empty AND every dropped node-id resolves via `mcp__worldloom__get_record`.
2. `node tools/world-mcp/dist/tests/packet-no-truncation.test.js` — request packet with `token_budget=100000`; response within budget AND `truncation_summary` is absent OR has empty arrays per CONTRACT.md choice.
3. Full pipeline: invoke `diegetic-artifact-generation` skill against `worlds/animalia/` with the existing brief; the skill's pre-flight packet load succeeds inline at default budget, and any reported `truncation_summary` matches the skill's recorded fallback-procedure trace in `notes`.

### Invariants

1. `local_authority` and `task_header` are present in every successful packet response regardless of budget pressure.
2. The serialized response size is always ≤ requested `token_budget`.
3. Every node-id in `truncation_summary.dropped_node_ids_by_layer` resolves via `mcp__worldloom__get_record(record_id)` against the same world.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/packet-budget.test.ts` — strict-budget enforcement under multiple budget settings.
2. `tools/world-mcp/tests/packet-drop-priority.test.ts` — assert drop order matches CONTRACT.md.
3. `tools/world-mcp/tests/packet-truncation-summary.test.ts` — assert `truncation_summary` schema and content.

### Commands

1. `cd tools/world-mcp && npm test -- --grep "packet-budget"` — targeted budget-enforcement test suite.
2. `cd tools/world-mcp && npm test` — full world-mcp test suite to confirm no regression.
3. `Skill diegetic-artifact-generation worlds/animalia briefs/<existing-brief>.md` — manual full-pipeline verification that the packet load now succeeds inline at default budget.
