# Design — Story-State Provenance Indexing (Narrowed)

**Date**: 2026-05-18 (narrowed same-day after consumer-enumeration check)
**Source**: `archive/reports/story-system-consolidation.md` §10 (R-MD8); deferred from `archive/specs/SPEC-44-story-state-append-only-lifecycle-and-schema-correctness.md` §Out of Scope.
**Brainstorm trajectory**: originally drafted as full Phase 1 + Phase 2 R-MD8 subset (~15-19 tickets, ~5 weeks). Narrowed after explicit consumer enumeration confirmed only one Tier 1 hard consumer (`story-fact-promotion-to-canon`). Final scope: ~6-7 tickets / ~1.5-2 weeks. Dropped items are listed under Out of Scope with re-evaluation triggers.
**Status**: archived design — fed `archive/specs/SPEC-45-story-state-provenance-indexing.md`.

## Why this exists

R-MD8 in the source consolidation report proposed 18 new world-index edge types + parser changes + 4 retrieval helpers + context-packet expansion. SPEC-44 deferred R-MD8 wholesale ("roughly doubles SPEC-44's blast radius without sharing implementation surface"). With SPEC-44 landed, the deferral has expired; the design question became *which subset* to ship.

**Empirical consumer state** (verified):

- `.claude/skills/story-fact-promotion-to-canon/SKILL.md:180-181` (Phase 1: Load source and branch provenance) literally instructs the LLM: *"traverse `_source/events/SE-*.yaml` for events whose `state_delta.create / supersede` references any source record."* This is a foreign-key lookup performed via filesystem-walk. **Tier 1 hard consumer.**
- `.claude/skills/branching-story-turn-cycle/` — teaches authoring of intro tags with `distinct_from=[...]` but does not encode a file-scan pattern for finding similar prior records; LLM is expected to populate from in-context awareness. **Not a Tier 1 consumer.**
- `.claude/skills/branching-story-health-audit/` — walks records via direct YAML reads today; could benefit from `get_record_lineage` but is not blocked. **Tier 2 soft consumer; deferred.**
- All other story-side skills inspected — bootstrap, prose-attach, commitment-block-authoring, story-promotion-closeout — have no current operation that the new retrieval surface would replace.

The actually-missing thing is **provenance retrievability for one specific skill's one specific phase**. The narrowed spec ships exactly what that consumer needs, plus the consumer-side wiring, plus minimal hygiene. Expansion to broader R-MD8 surface is deferred to incremental adds when additional consumers materialize.

## Scope

### New STORY_EDGE_TYPES (+3)

Added to `tools/world-index/src/schema/types.ts:84-96`. Expands `STORY_EDGE_TYPES` from 11 → 14.

| Edge type | From | To | Source field |
|---|---|---|---|
| `state_delta_create` | `story_event_record` (SE) | created record | `SE.state_delta.create[]` |
| `state_delta_supersede` | SE | superseded record | `SE.state_delta.supersede[]` |
| `creation_evidence` | created record (CLK / STSEC / STQ / THR / STENT / SREL) | evidence record | parsed from `intro:<CLASS>(... evidence=[...])` tag in `SE.world_logic_rationale` |

Dropped from the original design: `state_delta_close` (no consumer; close events terminal), `supersedes_record` (chain walking is a Phase 2 helper feature with no current consumer; `state_delta_supersede` in-edges give story-fact-promotion-to-canon what it needs).

### New shared parser

**New file** `tools/world-index/src/parse/intro-tag-parser.ts`. Lifted from `tools/validators/src/structural/midstory-introduction-utils.ts:74-77` with module-level refactor for shared consumption.

Exported function:

```typescript
parseIntroTags(worldLogicRationale: string): Array<{
  class: 'CLK' | 'STSEC' | 'STQ' | 'THR' | 'STENT' | 'SREL';
  id: string;
  trigger?: string;
  evidence: string[];
  distinct_from: string[];
}>
```

The validator's existing parser becomes a one-line import + re-export. Both packages consume identical parse semantics — single source of truth.

### Parser pipeline integration

**Augmented** `tools/world-index/src/parse/atomic.ts`:

- New helper `edgesForStoryEvent(record)` inserted near line 541 alongside existing `edgesForStoryRecord()`. Extracts `state_delta_create` + `state_delta_supersede` from `SE.state_delta` arrays; calls `parseIntroTags()` on `SE.world_logic_rationale` and emits `creation_evidence` edges (one per `(created_record, evidence_record)` pair).

No `supersedesEdges` helper (dropped along with `supersedes_record` edge).

### New MCP tool

`mcp__worldloom__get_story_state_provenance(record_id, story_slug)` at `tools/world-mcp/src/tools/get-story-state-provenance.ts`:

```typescript
{
  record_id: string;
  record_class: string;
  creating_se_id: string | null;       // via state_delta_create in-edge
  modifying_se_ids: string[];           // via state_delta_supersede in-edges
  evidence_records: string[];           // via creation_evidence out-edges
}
```

~3 SQL queries per call. Drops `supersedes_chain` / `superseded_by_chain` fields from the original return shape (no consumer).

### Consumer skill update (in-spec, not a follow-up)

`.claude/skills/story-fact-promotion-to-canon/SKILL.md`:

- **Phase 1 line 180** rewrites from filesystem-walk instruction to MCP-call instruction:
  > "The `SE-<integer>` events that authored or modified each source record — call `mcp__worldloom__get_story_state_provenance(source_record_id, story_slug)` for each id in `source_record_ids`; the returned `creating_se_id` (the authoring SE) and `modifying_se_ids[]` (any SEs that superseded the record) enumerate the relevant SE records to load."
- **Phase 1 line 181** (BEL lookup) unchanged in shape; the lookup composes naturally with the new helper's `creating_se_id` output.
- **§World-State Prerequisites line 148** updates to reference the MCP-routed retrieval path.

### Hygiene validator extension

`tools/validators/src/structural/cross-file-reference.ts` (or sibling new validator) — extends dangling-ref detection to cover the new indexed edges. If `creation_evidence` cites a record id that doesn't exist, fail. Caught at validation time; world-index parser itself emits the edge as-is (best-effort indexing).

### Test scope

- `tools/world-index/tests/parse/intro-tag-parser.test.ts` — regex coverage (all 6 classes, malformed tags, multi-tag rationales, empty)
- `tools/world-index/tests/parse/atomic.test.ts` (extend) — `edgesForStoryEvent` emits correct counts
- `tools/world-mcp/tests/tools/get-story-state-provenance.test.ts` — happy path, null creating_se_id, non-empty modifying_se_ids, non-empty evidence_records
- Integration: build synthetic bundle, assert end-to-end MCP query returns expected provenance
- End-to-end: index red-bunny (post-Codex remediation); verify edge counts match SE state_delta cardinalities

## Key decisions (narrowed)

1. **Single confirmed consumer scopes the spec.** Future consumers warrant future incremental adds (per Approach C discipline from the parent brainstorm). Building the full Phase 1+2 surface against one consumer is over-build.

2. **Lift the intro-tag parser into a shared library.** Same rationale as the original design — single source of truth across packages eliminates parse-divergence risk. Kept in narrowed scope because `creation_evidence` extraction depends on it.

3. **Drop `state_delta_close` and `supersedes_record` edges.** Neither has a current consumer. Each is independently addable as a ~1-2 ticket patch when its first consumer materializes.

4. **Drop Phase 2 helpers and packet surfaces wholesale.** `get_record_lineage`, `get_active_story_state`, `recent_structured_introductions`, and the `creating_se_id` augmentations on existing packet surfaces all serve speculative or Tier 2 consumers. Add when concrete pain materializes.

5. **Ship the consumer-side skill edit in the same spec.** The whole point of the spec is to replace story-fact-promotion-to-canon's Phase 1 file-walk with an MCP call. Splitting the skill update into a follow-up would mean the spec lands without proving its value.

6. **No index rebuild migration needed.** Phase 1 edges are derived purely from existing YAML content. Running the indexer once after the spec lands produces the new edges; no fixture changes, no data backfill, no PG mutation.

## Edge cases

1. **Intro tag references a record that doesn't exist** (typo, dangling ref). Parser emits the edge to the bogus id. The `cross-file-reference` validator extension catches at validation time. Indexing is best-effort.
2. **Intro tag malformed**. `parseIntroTags()` returns `[]`; no creation_evidence edges emit. SPEC-43's `midstory_record_introduction_grounding` validator catches the absence.
3. **SE has state_delta_create entries but no intro tags** (grandfathered record, non-pressure-bearing class). state_delta_create edges emit; creation_evidence edges don't. Helper returns `evidence_records: []` — valid state.
4. **Record cited as evidence in its own creating SE** (sibling records co-evidencing). Both edges emit; no conflict.
5. **Story bundle has 0 SE records or 0 intro tags**. No edges emit from missing structures. Helper returns null `creating_se_id` and empty arrays for a record that has no graph data.
6. **Index rebuild on pre-spec bundle**. Parser is purely additive; rebuild produces new edges from existing YAML. No partial-state corruption.

## FOUNDATIONS.md alignment

| Principle | Stance | Rationale |
|---|---|---|
| §Story Bundles §5b — schema minimalism | aligns | No new SE schema fields added. Parser consumes existing parseable intro tags (SPEC-43 grammar) and existing `state_delta` arrays. Validates SPEC-43's "deterministic via grammar, not via storage shape" choice — proves the parseable form is mechanically indexable. |
| §Story Bundles §8 — atomic YAML records append-only at filesystem level | aligns | Indexing is read-only over committed records; no mutation of any `_source/<class>/*.yaml`. |
| §Story Bundles §4 — engine-only write surface for story-bundle `_source/` | N/A | World-index is a read-only consumer of `_source/`. Hook 3's filesystem-level block is untouched. |
| §Story Bundles §6b — Observer Firewall | aligns | New edges expose creation provenance (`state_delta_*`, `creation_evidence`), none of which is viewer-restricted information. Affordance/grounding indexing — which IS firewall-sensitive — was explicitly dropped from this scope; deferred until a future spec engages the firewall concern deliberately. |
| §Canon Layers — story-bundle as branch-local, not world-canon | aligns | All new edges scope to story-bundle records. No edges cross from story-bundle into world-canon records. |
| §Story Bundles §5c — present causal state, not narrative shape | aligns | Indexed surfaces describe causal pressure (creating event, evidence chain) — not narrative-shape concepts. |

## Out of scope (deferred items + re-evaluation triggers)

Items below were in the original Phase 1 + Phase 2 design; each is independently addable as a small follow-on patch when its first consumer materializes.

| Item | Re-evaluation trigger |
|---|---|
| `state_delta_close` edge | First skill or validator that needs to query "which SE closed this record" |
| `supersedes_record` edge + supersession chain walking | First consumer requiring lineage traversal (likely `branching-story-health-audit` if it adopts deterministic chain-integrity checks) |
| `supersession-chain-acyclic` validator | Ships with `supersedes_record` edge (no chains indexed today → no cycles to guard) |
| `get_record_lineage` MCP helper | Same as `supersedes_record` |
| `get_active_story_state` MCP helper | First skill needing batch hydration of a page's `active_records` with provenance — most likely candidate: `branching-story-health-audit` doing per-PG audits |
| `recent_structured_introductions` context-packet surface | `branching-story-turn-cycle` Phase 4.5 surfaces a documented `distinct_from`-authoring pain point, OR a new audit/analysis skill needs recent-introductions context |
| `creating_se_id` augmentation on existing packet surfaces (active_clocks, hidden_secrets, open_story_questions) | First consumer reading these packet surfaces specifically for provenance summaries |
| Phase 3 R-MD8 surface (affordances, grounding, propagation indexing — 11 edges + 1 helper + 5 packet surfaces) | Per parent brainstorm: gated on concrete retrieval-pain trigger from a future audit, skill, or authoring session. Phase 3's `affordance_available_to` indexing engages Observer Firewall (§6b) and requires deliberate firewall design before edge extraction begins. |

## Risks and open questions

- **Risk (pragmatic)**: lifting `parseIntroTags()` into the shared library requires the validators package to import from world-index, OR a third common location (e.g., `tools/_shared/`). Current cross-package dependency convention in `tools/` needs verification at spec-decomposition time. **Resolution path**: prefer a new `tools/_shared/intro-tag-parser/` package if cross-imports are awkward; defer the location decision to the implementation ticket.
- **Risk (structural)**: `cross-file-reference` validator extension may surface latent dangling refs in existing or fresh bundles that were never previously caught (parser had no visibility). Resolution: ship validator extension as `warn` first, audit findings, upgrade to `fail` once known-good bundles pass clean.
- **Open question**: should `get_story_state_provenance` accept a list of record_ids rather than a single id for batch lookup? story-fact-promotion-to-canon Phase 1 calls it once per `source_record_id` (typically 1-3 ids). Default: ship single-id form; revisit if batch latency becomes measurable.

## Estimated effort

| Phase | Surface | Tickets | Days |
|---|---|---|---|
| Indexer | 3 edges + shared parser + `edgesForStoryEvent` extraction | 3-4 | ~5-7 |
| MCP + Skill | `get_story_state_provenance` tool + story-fact-promotion-to-canon SKILL.md update | 2-3 | ~3-4 |
| Hygiene | `cross-file-reference` extension (warn-then-fail) | 1 | ~2-3 |
| **Total** | | **6-7** | **~10-14 (1.5-2 weeks)** |

## Cross-reference

- `archive/reports/story-system-consolidation.md` §10 — origin of the full 18-edge R-MD8 proposal (pre-SPEC-43; archived as exploited on 2026-05-19)
- `archive/specs/SPEC-43-present-causal-mid-story-state-introduction.md` — parseable-tag grammar; intro-tag parser origin
- `archive/specs/SPEC-44-story-state-append-only-lifecycle-and-schema-correctness.md` §Out of Scope — R-MD8 deferral
- `docs/triage/2026-05-18-story-system-consolidation-triage.md` — R-MD8 routed to "follow-up spec (SPEC-45-or-later)"
- `tools/world-index/src/schema/types.ts:84-96` — current STORY_EDGE_TYPES (11 entries)
- `tools/world-index/src/parse/atomic.ts:541-607` — current `edgesForStoryRecord()` (insertion point for `edgesForStoryEvent`)
- `tools/world-mcp/src/context-packet/story-bundle-context.ts` — current packet surface (unchanged in narrowed scope)
- `tools/validators/src/structural/midstory-introduction-utils.ts:74-77` — intro-tag parser to be lifted
- `.claude/skills/story-fact-promotion-to-canon/SKILL.md:180-181` — Tier 1 consumer's file-walk instruction to be replaced
