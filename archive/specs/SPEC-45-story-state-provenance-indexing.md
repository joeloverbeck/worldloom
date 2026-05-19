# SPEC-45: Story-State Provenance Indexing

**Status**: COMPLETED
**Brainstorm source**: `docs/plans/2026-05-18-world-index-story-state-provenance-indexing-design.md`
**Source report**: `archive/reports/story-system-consolidation.md` §10 (R-MD8)
**Deferred from**: `archive/specs/SPEC-44-story-state-append-only-lifecycle-and-schema-correctness.md` §Out of Scope
**Blocks**: future incremental adds (per design's Out of Scope table) — each independently scoped when its first consumer materializes

## Problem Statement

`.claude/skills/story-fact-promotion-to-canon/SKILL.md:180-181` (Phase 1: Load source and branch provenance) instructs the LLM literally:

> "The `SE-<integer>` events that authored or modified each source record (**traverse `_source/events/SE-*.yaml` for events whose `state_delta.create / supersede` references any source record**)."

This is a foreign-key lookup executed via filesystem-walk: open every SE YAML, parse `state_delta.create` / `state_delta.supersede`, match against `source_record_ids`. The skill encodes deterministic semantics, but execution-time determinism is delegated to LLM file-walks and substring-matching — probabilistic in execution (may miss references in long files, mis-parse YAML, or context-window-trim mid-scan) and token-inefficient (5+ SE files × ~150 lines each loaded into context for what is structurally a 3-row SQL query).

The world-index database already stores story-event records (`story_event_record` node type, mapped at `tools/world-index/src/parse/atomic.ts:67-88`), but **zero edges are extracted from SE.state_delta or from the SPEC-43 intro-tag content in SE.world_logic_rationale** (`edgesForStoryRecord()` at `tools/world-index/src/parse/atomic.ts:541-607` has no story_event_record arm). The data is fully present in the indexed YAML; it is unreachable via graph query because no edges exist.

This spec indexes the missing provenance edges and exposes one MCP retrieval helper that directly replaces the file-walk instruction. The consumer-side skill update lands in the same spec so the spec proves its value at landing time rather than shipping infrastructure for a future use.

### Why not bundled with SPEC-44

SPEC-44 was contract-correctness work (append-only lifecycle enforcement, schema completeness, validator hardening). This spec is capability-expansion (retrievability). SPEC-44 §Out of Scope explicitly deferred R-MD8: *"World-index edge expansion and MCP context-packet provenance summaries... Capability-expansion track; deferred to a follow-up spec. Roughly doubles this spec's blast radius without sharing implementation surface."* SPEC-44's deferral was structurally correct; the surfaces touched (`tools/world-index/`, `tools/world-mcp/`, story-side skill prose) are disjoint from SPEC-44's surfaces (`tools/patch-engine/`, `tools/validators/`, turn-cycle skill).

### Why narrowed from the original brainstorm scope

The original brainstorm (parent design doc) scoped R-MD8 to Phase 1 + Phase 2: 5 new edges, 3 new MCP helpers, 1 new context-packet surface + 3 packet augmentations, ~15-19 tickets, ~5 weeks. Consumer enumeration during brainstorm refinement confirmed only one Tier 1 hard consumer (`story-fact-promotion-to-canon`). Building the wider surface against a single consumer is over-build. This spec ships the minimum surface that consumer needs + the consumer-side wiring; each dropped item is independently addable as a small follow-on patch when its first consumer materializes (per the design doc's Out of Scope table with explicit re-evaluation triggers).

### Key design decisions

- **Considered shipping the original Phase 1 + Phase 2 brainstorm scope** (5 edges + 3 helpers + packet surfaces). Rejected. Reason (pragmatic): single confirmed Tier 1 consumer doesn't justify the wider surface; deferred items are independently addable as small patches with clear consumer triggers documented in the design doc.
- **Considered shipping the MCP helper without the consumer-side skill update**, leaving the SKILL.md edit for a follow-up. Rejected. Reason (structural): a tool with no consumer is infrastructure-on-spec, not delivered value. Shipping both lands the value at spec completion.
- **Considered indexing the `supersedes_record` edge (record → predecessor) for chain walking**. Rejected for this spec. Reason: `state_delta_supersede` in-edges (SE → superseded record) cover the Tier 1 consumer's "modifying SEs" query. Chain walking is a Phase 2 helper feature deferred until `branching-story-health-audit` or another consumer materializes a lineage-traversal need.
- **Considered indexing `state_delta_close` edges**. Rejected. Reason: no current consumer queries closed records; close events are terminal and the storage cost is non-zero. Add when first consumer materializes.
- **Considered duplicating the intro-tag parser into world-index** (rather than lifting from validators). Rejected. Reason (structural): parse-divergence risk between validator (strict reject) and indexer (silent ingest) would create subtle data-correctness bugs. Shared library eliminates the failure mode.
- **Considered batch-API form for `get_story_state_provenance` (list of ids)** vs single-id form. Chose single-id. Reason: Tier 1 consumer calls it 1-3 times per invocation (per `source_record_ids` entry); batch form is premature optimization. Convert if latency proves measurable.

## Approach

Three phases, executed in order. Each phase is independently testable.

### Phase 1 — Indexer

1. Add 3 new entries to `STORY_EDGE_TYPES` at `tools/world-index/src/schema/types.ts:84-96`: `state_delta_create`, `state_delta_supersede`, `creation_evidence`. Expands the array from 11 → 14.

2. Create new shared parser file `tools/world-index/src/parse/intro-tag-parser.ts`. Export `parseIntroTags(worldLogicRationale: string)` returning `Array<{ class, id, trigger?, evidence: string[], distinct_from: string[] }>`. Lift the regex and parsing logic from `tools/validators/src/structural/midstory-introduction-utils.ts:74-77` verbatim; refactor the validator's existing call site to import from the new shared location (single-line import + delegation). Cross-package import path: prefer a new `tools/_shared/intro-tag-parser/` package if direct world-index → validators or validators → world-index imports are awkward under current `tools/` package conventions; the implementation ticket surveys and decides.

3. Add new helper `edgesForStoryEvent(record)` to `tools/world-index/src/parse/atomic.ts` near line 541 (alongside existing `edgesForStoryRecord()`). For each `story_event_record`:
   - Emit `state_delta_create` edges: one per id in `record.state_delta.create[]`, from SE id to created record id.
   - Emit `state_delta_supersede` edges: one per id in `record.state_delta.supersede[]`, from SE id to superseded record id.
   - Call `parseIntroTags(record.world_logic_rationale)`; for each parsed tag, emit `creation_evidence` edges: one per id in `tag.evidence[]`, from the tag's `id` (the created record) to each evidence record id.
   - No `state_delta_close` edges emit (deferred per Key Design Decisions).

4. Wire `edgesForStoryEvent` into the `edgesForStoryRecord()` dispatch (or its successor structure — implementation ticket may refactor for clarity if the existing single-function shape becomes unwieldy).

### Phase 2 — MCP tool + consumer skill update

5. Create new MCP tool `tools/world-mcp/src/tools/get-story-state-provenance.ts` registered as `mcp__worldloom__get_story_state_provenance(record_id, story_slug)`. Return shape:

   ```typescript
   {
     record_id: string;
     record_class: string;
     creating_se_id: string | null;       // via state_delta_create in-edge (single row expected; null if record was not created by an SE)
     modifying_se_ids: string[];          // via state_delta_supersede in-edges
     evidence_records: string[];           // via creation_evidence out-edges
   }
   ```

   ~3 SQL queries per call. Story-slug required for story-bundle id resolution per existing tool conventions (e.g., `tools/world-mcp/src/tools/get-record.ts:34, 231-236`).

6. Register the new tool in `tools/world-mcp/src/tools/_shared.ts` or the equivalent tool-registry surface (whichever location follows current conventions). Update `describe-capabilities.ts` if the tool inventory is enumerated there.

7. Update `.claude/skills/story-fact-promotion-to-canon/SKILL.md`:
   - **Line 180** (Phase 1 SE-event load): replace the file-walk instruction with an MCP-call instruction. Proposed text: *"The `SE-<integer>` events that authored or modified each source record — call `mcp__worldloom__get_story_state_provenance(source_record_id, story_slug)` for each id in `source_record_ids`; the returned `creating_se_id` (authoring SE) and `modifying_se_ids[]` (any SEs that superseded the record) enumerate the relevant SE records to load via `mcp__worldloom__get_records` or direct YAML read."*
   - **Line 148** (§World-State Prerequisites): add the new MCP tool to the world-canon retrieval surface list alongside the existing `get_context_packet` / `get_records` references.
   - **Line 181** (BEL lookup): unchanged in shape; the lookup composes naturally with the new helper's `creating_se_id` output (skill takes the authoring SE id from the helper, then queries BELs referencing it via existing tools).

### Phase 3 — Hygiene validator

8. Extend `tools/validators/src/structural/cross-file-reference.ts` (or add sibling `cross-file-reference-indexed-edges.ts` if structurally cleaner) to cover the new indexed edges. Rule: if a `creation_evidence` edge cites a record id with no corresponding indexed record, emit diagnostic. Severity: `warn` initially (to surface latent issues without blocking); upgrade to `fail` after one validator-pass cycle confirms no false positives on known-good bundles. State_delta_* edge dangling refs are already covered by the existing `cross_file_reference` validator's id-based check, but verify coverage explicitly during implementation.

## Deliverables

| Phase | File | Action |
|---|---|---|
| 1 | `tools/world-index/src/schema/types.ts` | Add 3 entries to STORY_EDGE_TYPES (lines 84-96) |
| 1 | `tools/world-index/src/parse/intro-tag-parser.ts` | New shared parser file (lifted from validators) |
| 1 | `tools/validators/src/structural/midstory-introduction-utils.ts` | Refactor to import + re-export shared parser |
| 1 | `tools/world-index/src/parse/atomic.ts` | New `edgesForStoryEvent` helper + dispatch wire-up |
| 1 | `tools/world-index/tests/parse/intro-tag-parser.test.ts` | New unit tests for shared parser |
| 1 | `tools/world-index/tests/parse/atomic.test.ts` (extend) | New test cases for `edgesForStoryEvent` |
| 2 | `tools/world-mcp/src/tools/get-story-state-provenance.ts` | New MCP tool |
| 2 | `tools/world-mcp/src/tools/_shared.ts` (or registry equivalent) | Register new tool |
| 2 | `tools/world-mcp/src/tools/describe-capabilities.ts` | Add tool to inventory (if enumerated) |
| 2 | `tools/world-mcp/tests/tools/get-story-state-provenance.test.ts` | New tool tests |
| 2 | `.claude/skills/story-fact-promotion-to-canon/SKILL.md` | Update lines 148, 180; preserve line 181 |
| 3 | `tools/validators/src/structural/cross-file-reference.ts` (or sibling) | Extend to cover indexed `creation_evidence` edges |
| 3 | `tools/validators/tests/structural/cross-file-reference.test.ts` (extend) | New fixture for dangling creation_evidence ref |
| All | `tools/validators/src/public/registry.ts` | Register validator extension/sibling if added as new validator |
| All | `tools/world-index/tests/parse/atomic-integration.test.ts` (new or extend) | Synthetic-bundle build + edge-count assertions |
| All | `tools/world-mcp/tests/integration/spec45-provenance-e2e.test.ts` | End-to-end: synthetic bundle → indexer → MCP query → assertions |

## FOUNDATIONS Alignment

| Principle | Stance | Rationale |
|---|---|---|
| §Story Bundles §5b — schema minimalism | aligns | No new SE schema fields added. Parser consumes existing parseable intro tags (SPEC-43 grammar) and existing `state_delta` arrays. Validates SPEC-43's "deterministic via grammar, not via storage shape" choice by proving the parseable form is mechanically indexable, not just validator-consumable. |
| §Story Bundles §8 — atomic YAML records append-only at filesystem level | aligns | Indexing is read-only over committed records; no mutation of any `_source/<class>/*.yaml`. |
| §Story Bundles §4 — engine-only write surface for story-bundle `_source/` | N/A | World-index is a read-only consumer of `_source/`. Hook 3's filesystem-level block is untouched. |
| §Story Bundles §6b — Observer Firewall | aligns | New edges expose creation provenance (`state_delta_*`, `creation_evidence`), none of which is viewer-restricted information. Firewall-sensitive edges (`affordance_available_to` and related) were deliberately dropped from this scope and deferred until a future spec engages the firewall concern directly. |
| §Canon Layers — story-bundle as branch-local, not world-canon | aligns | All new edges scope to story-bundle records (SE / CLK / STSEC / STQ / THR / STENT / SREL). No edges cross from story-bundle into world-canon records. |
| §Story Bundles §5c — present causal state, not narrative shape | aligns | Indexed surfaces describe causal pressure (creating event, evidence chain) — not narrative-shape concepts (climax, arc, expected payoff). |
| Tooling Recommendation (machine-facing layer) | aligns | New MCP tool extends the existing `mcp__worldloom__*` surface following established conventions (story_slug parameter, JSON return shape, story-bundle id resolution). |

## Verification

### Phase 1

- `npm run build` from `tools/world-index` passes after schema + parser + atomic changes.
- `npm run build` from `tools/validators` passes after midstory-introduction-utils refactor (parser becomes one-line re-export).
- `tools/world-index/tests/parse/intro-tag-parser.test.ts` covers: valid tags across all 6 classes; malformed tags (missing close paren, unknown class, invalid id format); multi-tag rationales; rationales with embedded prose alongside tags; empty rationale; rationale with leading/trailing whitespace.
- Cross-validation: shared parser produces identical output to the validators' historical parser on the SPEC-43 test corpus (run validators test suite — all passes after refactor).
- New `edgesForStoryEvent` test cases assert: SE with 3 create + 2 supersede + 4 intro tags emits the exact `state_delta_*` plus `creation_evidence` rows; SE with empty state_delta and no intro tags emits zero event edges; SE with malformed intro tag rejects through the shared strict parser (`MidstoryIntroductionTagError`) rather than emitting partial edges.

### Phase 2

- `npm run build` from `tools/world-mcp` passes after new tool registration.
- `get_story_state_provenance` tests cover: happy path (record with creating_se + modifying_se + evidence); null creating_se_id (legacy record never created by an SE); non-empty modifying_se_ids (record superseded by multiple newer revisions); non-empty evidence_records; record-id mismatch / missing record returns appropriate error per existing tool conventions.
- story-fact-promotion-to-canon SKILL.md edits are reviewed manually for prose coherence: Phase 1 reads cleanly post-edit; line 181 BEL flow still resolves from the helper's `creating_se_id`; §World-State Prerequisites lists the new tool alongside existing tools.

### Phase 3

- `cross-file-reference` validator extension tests fire on synthetic fixture with intentionally-dangling `creation_evidence` target id; pass when target resolves.
- Focused validator coverage for indexed `creation_evidence`, `state_delta_create`, and `state_delta_supersede` dangling refs passes. The full validator suite remains red on the known SPEC-43 red-bunny `compatible_optional_absence` baseline documented in the ticket outcomes.

### End-to-end

- Run indexer rebuild against a temp copy of red-bunny (post-Codex remediation per `reports/red-bunny-validation-remediation.md`). Assert: `SELECT COUNT(*) FROM edges WHERE edge_type='state_delta_create' AND story_slug='red-bunny'` equals `Σ|SE.state_delta.create[]|` summed across copied red-bunny SE records. Same shape for state_delta_supersede. Creation_evidence count = sum of `|tag.evidence[]|` across all intro tags in red-bunny SEs.
- Synthetic bundle with known provenance shape: index it, call `get_story_state_provenance` on each record, assert returned creating_se_id + modifying_se_ids + evidence_records match the bundle's authored structure.
- The updated story-fact-promotion-to-canon Phase 1 is covered by the consumer-skill contract review in `archive/tickets/SPEC45STOSTAPRO-004.md` plus the in-memory MCP/server capstone in `archive/tickets/SPEC45STOSTAPRO-006.md`; no dedicated skill-replay harness exists in this repo.

## Out of Scope

Items below were considered during brainstorming and deliberately deferred. Each is independently addable as a small follow-on patch when its first consumer materializes. Full re-evaluation triggers are documented in the design doc's Out of Scope table at `docs/plans/2026-05-18-world-index-story-state-provenance-indexing-design.md`.

- **`state_delta_close` edge** — no consumer queries closed-record provenance today. Add when first consumer needs it.
- **`supersedes_record` edge + supersession chain walking** — `state_delta_supersede` in-edges suffice for the Tier 1 consumer. Add when a chain-traversal consumer (likely `branching-story-health-audit`) materializes.
- **`supersession-chain-acyclic` validator** — ships with `supersedes_record` edge.
- **`get_record_lineage` MCP helper** — ships with `supersedes_record` edge.
- **`get_active_story_state` MCP helper** — batch hydration of a page's `active_records` with provenance. Add when first consumer needs it (likely `branching-story-health-audit` doing per-PG audits).
- **`recent_structured_introductions` context-packet surface** — `branching-story-turn-cycle` Phase 4.5 would benefit as ambient context but is not actively blocked. Add when a documented authoring pain point or a new analysis skill surfaces.
- **`creating_se_id` augmentation on existing packet surfaces** (`active_clocks`, `hidden_secrets`, `open_story_questions`) — add when first consumer reads these for provenance summaries.
- **Phase 3 R-MD8 surface** (affordances, grounding, propagation indexing — 11 edges + 1 helper + 5 packet surfaces) — gated on concrete retrieval-pain trigger from a future audit, skill, or authoring session. `affordance_available_to` engages Observer Firewall (§6b) and requires deliberate firewall design before extraction.
- **Reversing SPEC-43's parseable-tag choice** — parseable form is now mechanically indexable (this spec proves it); reversing would re-litigate 17 SPEC-43 tickets without changing what gets validated or indexed.
- **Reversing SPEC-44's removal of the 7 lifecycle ops** — append-only-via-supersession is contract; this spec consumes that contract (via state_delta_supersede in-edges as the "modifying SEs" query).

## Risks & Open Questions

- **Risk (pragmatic)**: lifting `parseIntroTags()` into a shared library requires resolving a cross-package import path. Direct world-index → validators or validators → world-index imports may be awkward under current `tools/` package conventions. **Resolution path**: prefer a new `tools/_shared/intro-tag-parser/` package if cross-imports are awkward; defer the location decision to the implementation ticket (the surveying step is small).
- **Risk (structural)**: `cross-file-reference` validator extension may surface latent dangling refs in existing bundles that were never previously caught (parser had no visibility). **Resolution**: ship as `warn` first, audit findings on known-good bundles, upgrade to `fail` once the warn cycle confirms no false positives. Documented in Phase 3 deliverables.
- **Risk (pragmatic)**: the `edgesForStoryEvent` helper introduces the first per-class arm in `edgesForStoryRecord()` (existing code treats all story records uniformly via the helper's switch over `node_type`). Adding the SE-specific arm may invite a refactor of the dispatch shape. **Resolution**: implementation ticket may refactor for clarity if needed; the refactor stays within the helper and does not change the function's external contract.
- **Open question**: should the `get_story_state_provenance` MCP tool accept a list of record_ids (batch form) rather than a single id? story-fact-promotion-to-canon Phase 1 calls it 1-3 times per invocation (per `source_record_ids` entry). Default: ship single-id form; revisit if batch latency becomes measurable in production use. Adding batch form later is non-breaking (new optional argument).
- **Open question**: when the new validator extension warns on `creation_evidence` dangling refs in red-bunny or other known-good bundles, what's the cleanup path? Default assumption: no warns expected on red-bunny (red-bunny has no intro tags currently, per consolidated validator output). If a different bundle surfaces warns, address per-bundle as small follow-up patches; do not block the spec's main path on cleanup.
- **Open question**: should this spec's ticket namespace prefix follow the convention from SPEC-44 (SPEC44STOSTAAPP)? Suggested prefix: `SPEC45STSTPRO` (Spec 45, Story-State Provenance). Defer final decision to `/spec-to-tickets`.

## Outcome

Completed: 2026-05-18

What changed:

1. `tools/world-index` now exposes the shared strict intro-tag parser, indexes `state_delta_create`, `state_delta_supersede`, and `creation_evidence` story edges, and has focused plus capstone tests for the new edge family.
2. `tools/world-mcp` now registers `mcp__worldloom__get_story_state_provenance`, returns `{ record_id, record_class, creating_se_id, modifying_se_ids, evidence_records }`, documents the tool in machine-facing surfaces, and has handler, dispatch, capability, and capstone tests.
3. `.claude/skills/story-fact-promotion-to-canon/SKILL.md` now uses the MCP helper instead of instructing an LLM to file-walk every `SE-*.yaml`.
4. `tools/validators` now warns on dangling indexed provenance-edge targets for `creation_evidence`, `state_delta_create`, and `state_delta_supersede`.
5. The final capstone adds temp-copy red-bunny edge-count proof and synthetic MCP round-trip proof without mutating real world content.

Deviations:

1. The parser API preserved the live `extractIntroTags` / `ParsedIntroTag.recordId` naming and strict malformed-tag rejection rather than adopting the spec's illustrative `parseIntroTags` / silent-malformed shape.
2. Test paths followed live package layout: `tools/world-index/tests/intro-tag-parser.test.ts`, `tools/world-index/tests/structured-edges.test.ts`, and `tools/world-index/tests/integration/spec45-atomic-integration.test.ts` rather than the draft `tests/parse/*` paths.
3. The full `tools/validators` suite remains red on the known SPEC-43 red-bunny `compatible_optional_absence` fixture assertion; SPEC-45 accepted focused validator proof plus the green world-index/world-mcp capstones.
4. No executable story-fact-promotion skill replay harness exists; consumer coverage is the skill contract review plus MCP/server capstone.

Verification:

1. `npm test --prefix tools/world-index` — passed, 97/97.
2. `npm test --prefix tools/world-mcp` — passed, 405/405.
3. `node --test dist/tests/integration/spec45-atomic-integration.test.js` from `tools/world-index` — passed, 2/2.
4. `node --test dist/tests/integration/spec45-provenance-e2e.test.js` from `tools/world-mcp` — passed, 2/2.
5. `npm test --prefix tools/validators` — red, 540/541, known SPEC-43 red-bunny fixture assertion.
