# SPEC-67 — Story World-Index Edge Parity (Consumer-Scoped)

**Status:** COMPLETED
**Date:** 2026-05-21
**Classification:** story-canon-related (Skill Category 2c surface — world-index over story-bundle records)
**Source:** `archive/reports/stchar-audit-second-iteration.md` §9.7 (edge parity drift), §13 (world-index required edge additions), §17 Important #7; triage `docs/triage/2026-05-21-stchar-audit-second-iteration-triage.md`
**Depends on:** none

## 1. Context

Verification against `main` confirmed the report's edge-coverage findings: the world-index parser
(`tools/world-index/src/parse/atomic.ts`) emits no edges for several documented reference fields, and
four story node types — `STLOC` (story_location_record), `STOBJ` (story_object_record), `CNSQ`
(consequence_record), and story-local `DA` (story_diegetic_artifact_record) — have **zero** edge
functions.

Edges are capability-expansion: each one is only worth emitting if a current or near-term consumer
(health-audit traversal, `get_neighbors`, `find_impacted_fragments`, a validator) reads it. Per
FOUNDATIONS §5b and the YAGNI discipline, this spec adds **only consumer-backed edges** and explicitly
documents the rest as intentionally non-indexed, rather than emitting the report's full ~16-edge list
"for completeness."

### Verified corrections to the report

- **`STQ.source_event` / `STQ.answer_event` are NOT missing.** The parser already emits
  `story_question_source` (from `source_records[]`), `story_question_payoff_of` (from `payoff_of`), and
  `story_question_answer_record` (from `answer_records[]`) — `atomic.ts` lines ~987–1000. The report's
  "scalar event fields" do not exist as separate schema fields; STQ edge coverage is complete. **No
  action.**
- `STCHAR.supersedes` already emits `stchar_supersedes` (lines ~736–742); only the reverse
  `superseded_by` is unindexed.

## 2. Changes

All changes touch `tools/world-index/src/parse/atomic.ts` (edge emission),
`tools/world-index/src/schema/types.ts` (`STORY_EDGE_TYPES`), `docs/MACHINE-FACING-LAYER.md` (edge
catalog), and world-index parser tests (one positive fixture per new edge type).

### 2.1 Consumer-backed edges to add

| Field → edge type | Verified state | Consumer (why it's worth indexing) |
|---|---|---|
| `STSEC.protected_mystery_refs[]` → `secret_protected_mystery` | ABSENT | `branching-story-health-audit` Mystery-Accretion firewall walk (Rule 7 / FOUNDATIONS §5 Mystery Accretion — must traverse which secrets protect which Mystery Reserve entries to detect cumulative narrowing). |
| `STSEC.source_records[]` → `secret_source_record` | ABSENT | health-audit secret-provenance traversal; impact analysis when a source record is superseded. |
| `OBL.owed_by`, `OBL.owed_to` → `obligation_owed_by`, `obligation_owed_to` | ABSENT (only `dependent_fact` exists) | health-audit dangling-obligation / debt-party traversal (Rule 5 — who still owes what to whom). |
| `CNSQ.derived_from`, `THR.derived_from` → `consequence_derived_from`, `thread_derived_from` | ABSENT (CNSQ has zero edges) | Rule-5 consequence/debt provenance traversal; `find_impacted_fragments` when an upstream record changes. CNSQ is currently un-traversable at all. **OBL has no `derived_from` field** (verified against `tools/validators/src/schemas/story-obligation.schema.json`, a closed `additionalProperties: false` schema, and the `OBL` block in `.claude/skills/_shared-templates/story-record-schemas.md`); its provenance is captured by `dependent_facts` (already indexed as the `dependent_fact` edge) and by `supersedes`, so no `obligation_derived_from` edge applies. The report's `OBL.derived_from` listing (`archive/reports/stchar-audit-second-iteration.md` §17 #7) is a source-document error, not a real field. |
| `STCHAR.superseded_by` → `stchar_superseded_by` | ABSENT (forward `stchar_supersedes` exists) | reverse-supersession lookup for `stchar-supersession-integrity` and health-audit stale-STCHAR detection; cheap parity with the existing forward edge. |

For each **story-local-target** edge (`secret_source_record`, `obligation_owed_by`,
`obligation_owed_to`, `consequence_derived_from`, `thread_derived_from`, `stchar_superseded_by`):
emit only when the field is present and the target is a valid story-record reference (mirror the
existing `pushStoryEdgeIfReference` / `createStoryRefEdge` guards, which story-scope the target as
`<slug>:<ref>`); skip placeholders. `obligation_owed_by` / `obligation_owed_to` correctly skip the
non-reference `owed_by` / `owed_to` placeholder values (`group:<name>`, `public`, `null`) because the
existing `isStoryRecordReference` guard (`/^[A-Z]+-[0-9]+$/`) matches only `STENT-<integer>`.

**`secret_protected_mystery` is the one cross-namespace story→world edge** and must NOT use
`createStoryRefEdge`: `STSEC.protected_mystery_refs[]` references world-canon `M-*` Mystery Reserve
entries, which are indexed as `mystery_reserve_entry` nodes with id `^M-[0-9]+$` and **no story-slug
prefix**. Story-scoping the target (`<slug>:M-1`) would never resolve and the edge would dangle,
defeating the firewall-walk consumer. Emit it via `createRefEdge` (leaves the target ref unprefixed),
guarded by an `M-` ref regex (`/^M-\d+$/`, mirroring `CANON_FACT_REF_REGEX = /^CF-\d+$/`). This mirrors
the parser's existing story→world edges `world_entity_binding` (STENT→ENT), `stchar_source_character`
(STCHAR→CHAR), and `story_fact_derived_from` (SF→CF).

**Acceptance:** each of the seven new edge types appears in `STORY_EDGE_TYPES`, is emitted by the
parser when the field is populated, has a positive parser-test fixture, and is listed in the
`docs/MACHINE-FACING-LAYER.md` edge catalog. When updating the catalog, reconcile its stated running
total against the actual `STORY_EDGE_TYPES.length` rather than adding to the printed figure: the doc
currently states "65 story-bundle edge types" but the constant already holds 69 entries (a pre-existing
drift), so the correct post-change total is 76. CNSQ records now produce at least the
`consequence_derived_from` edge.

### 2.2 Document intentionally non-indexed fields

**Files:** `docs/MACHINE-FACING-LAYER.md` (a short "intentionally non-indexed story fields" note).

The following fields are **not** indexed for lack of a current consumer; record them as a deliberate
decision so a future audit does not re-flag them as accidental omissions:

- `STSTAT.location`, `STOBJ.owner`, `STOBJ.current_location`, `STLOC.bound_ent` — spatial/ownership
  fields with no current traversal consumer (no health-audit or retrieval path reads them today).
- `CLK.thresholds[].effects.create/supersede/close` references — clock threshold effects are resolved
  at tick time, not traversed structurally; the existing `clock_linked_record` / `clock_driver` /
  `clock_tick_event` edges cover the consumed surface.

**Acceptance:** the doc note enumerates these fields with the one-line "no current consumer" rationale;
re-indexing any of them later requires naming the consumer at that time.

## 3. Out of scope

- A `world_index_edge_parity` registry-driven meta-test (report §12 #5 / §17 Critical #1 registry) —
  rejected with the registry framework in SPEC-65; per-edge positive fixtures (§2.1) plus the
  non-indexed doc note (§2.2) are the proportionate guard.
- Edges for the four non-indexed field groups in §2.2 — deferred until a consumer exists.

## Outcome

Completed: 2026-05-21

SPEC-67 landed through two tickets:

- `archive/tickets/SPEC67STOWORIND-001.md` added seven consumer-backed story-bundle edge types,
  parser emissions, fixtures, count assertions, and the machine-facing edge catalog rows.
- `archive/tickets/SPEC67STOWORIND-002.md` documented the intentionally non-indexed story fields in
  `docs/MACHINE-FACING-LAYER.md`, including the rule that re-indexing any of those fields later
  requires naming the consumer.

Final verification:

- `npm run build` from `tools/world-index` — PASS.
- `npm test` from `tools/world-index` — PASS, 130 tests.
- `grep -n "intentionally non-indexed\|no current consumer" docs/MACHINE-FACING-LAYER.md` — PASS.
- `grep -n "STSTAT.location\|STOBJ.owner\|STOBJ.current_location\|STLOC.bound_ent\|CLK.thresholds" docs/MACHINE-FACING-LAYER.md` — PASS.

No active SPEC-67 tickets remain. Consumerless fields remain deliberately unindexed until a future
consumer is named.
