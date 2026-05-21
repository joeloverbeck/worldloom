# SPEC-60 — STCHAR Machine-Layer & Docs Completeness

**Status:** COMPLETED
**Date:** 2026-05-21
**Classification:** story-canon-related (machine-facing layer + docs for the Skill Category 2c pipeline)
**Source:** `reports/stchar-audit-first-iteration.md` §13 I3/I4/I5 + §10 patch-engine/MCP findings (verified against `main`)
**Depends on:** none — independent of SPEC-58/59; may proceed in parallel
**Companion:** `docs/triage/2026-05-21-stchar-audit-first-iteration-triage.md`

## Implementation Notes

- 2026-05-21: I3 landed via `archive/tickets/SPEC60STCHARMACLAY-001.md`. `tools/world-index` now extracts record refs from structured predicate argument fields and nested `predicate` / `predicates` combinators for both SLT preconditions and STPLAN predicates. Verification: `cd tools/world-index && npm run build` and `cd tools/world-index && npm test` (`127` tests passed).
- 2026-05-21: I4 landed via `archive/tickets/SPEC60STCHARMACLAY-002.md`. `tools/world-mcp` now registers `story_character_profile` as a first-class story-pipeline `get_context_packet` task type with a ranking profile, default budget, governing-world maps, reserve governing full-body policy, task-type full-body delivery for source `CHAR`, package README prose, and capability enum coverage. Verification: `cd tools/world-mcp && npm test` (`427` tests passed).
- 2026-05-21: Patch-engine stale-index coverage for the STCHAR hybrid path landed via `archive/tickets/SPEC60STCHARMACLAY-003.md`. `tools/patch-engine` now includes `stories/%/story-characters/%.md` in the `detectStaleIndex` `file_versions` watch set, with receipt coverage proving edited STCHAR markdown returns `index_stale` before validators run. Verification: `cd tools/patch-engine && npm test` (`92` tests passed).
- 2026-05-21: I5 docs reconciliation landed via `archive/tickets/SPEC60STCHARMACLAY-004.md`. `docs/MACHINE-FACING-LAYER.md` now lists `story_character_authority_record` and distinguishes bootstrap/profile-source `CHAR` reads from runtime STCHAR authority; `docs/CONTEXT-PACKET-CONTRACT.md` now documents `story_character_profile` and status-based `story_bundle_context.active_story_characters`; the stale dossier-retrieval report moved to `archive/reports/story-character-dossier-retrieval-concerns-2026-05-21.md`; and the 2026-05-20 triage carries an OBSOLETE banner. Verification: grep/manual-review proof over the edited docs, archive path existence/source absence checks, explicit non-change status for the two historical STCHAR reports, and classified `bound_char_id` discovery hits.

## 1. Context

STCHAR is well-supported in MCP record retrieval and world-index node/edge generation (verified:
`get_record`/`get_records`/`list_records`/`get_record_schema` all route STCHAR; world-index emits
`stchar_source_character` / `stchar_supersedes` / `stchar_bound_stent` / `stent_character_authority`
/ `page_active_record` edges). Three machine-layer gaps and one docs gap remain after SPEC-57. None
of these changes canon semantics; this is tooling and documentation completeness.

## 2. Changes

### 2.1 I3 — World-index extracts record refs from structured predicate args

**Files:** `tools/world-index/src/parse/atomic.ts`

- `storyRefsInRecordArrayField` (lines ~1422–1430) extracts record IDs only from the stringified
  `pred` field (`storyRefsInString(stringField(item, "pred"))`). It misses **structured** predicate
  argument fields such as `{ pred: "record_active", record: "STCHAR-1" }`.
- Extend extraction to be **field-name-agnostic**: for each predicate object, scan every
  string-valued argument for record-ID patterns using the existing `storyRefsInString` regex. The
  record-ref-bearing arg field varies by predicate — `record` for `record_active`/`record_age`,
  `holder` for `plan_*`/`emotion_*`, `belief_id` for `belief_record`, and
  `obligation`/`consequence`/`thread`/`clock`/`secret`/`question`/`intention`/`object`/`artifact`/
  `entity`/`from`/`to` for the remaining predicates (the authoritative arg-field grammar is
  `PREDICATE_ARG_SCHEMAS` in `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`). Recurse
  into **both** nested combinator wrappers: `predicate` (singular, used by `not`) and `predicates`
  (plural list, used by `all`/`any`). Apply to SLT `preconditions.hard|soft` and STPLAN
  success/fallback predicates so both edge sources are covered.

  > A value scan keyed on `PREDICATE_ARG_SCHEMAS` is preferred over a hand-listed field set: the
  > DSL emits no `target` arg field (that was the extraction-loop variable, not a predicate field),
  > and a hand-list would silently under-extract the dozen-plus non-`record` arg fields above.

**Scope reframing (from the report):** ChatGPT-Pro framed this as STCHAR-specific. It is **general**
— *any* record ref carried in a structured predicate arg (SF, STSEC, STCHAR, …) currently produces
no `storylet_predicate_ref` / plan-predicate edge. STCHAR is one beneficiary; the fix is class-agnostic.

**Acceptance:**
- Both `record_active(STCHAR-1)` (string form) and `{ pred: "record_active", record: "STCHAR-1" }`
  (structured form) emit a `storylet_predicate_ref` edge.
- A record ref nested inside a combinator — `{ pred: "not", predicate: { pred: "record_active",
  record: "STCHAR-1" } }` and `{ pred: "any", predicates: [ … ] }` — is extracted via recursion
  into both `predicate` and `predicates` wrappers.
- A non-`record` arg field carrying a record ID (e.g., `{ pred: "obligation_open", obligation:
  "OBL-1" }`) emits an edge.
- STPLAN success/fallback structured predicates index their record refs.
- Existing string-form edges are unchanged (no regression).

### 2.2 I4 — `story_character_profile` MCP task profile

**Files:**
- `tools/world-mcp/src/ranking/profiles/index.ts`
- context-packet docs/tests (see 2.4)

- Add `"story_character_profile"` to `TASK_TYPES` (lines ~19–35; currently absent). Because
  `rankingProfilesByTaskType` (`Record<TaskType, RankingWeights>`) and
  `DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE` (`Record<TaskType, number>`) are exhaustive mapped types over
  `TaskType`, both require a new `story_character_profile` entry in the same change or the package
  fails to typecheck.
- Add a ranking profile (defined in `tools/world-mcp/src/ranking/profiles/canon-pipeline-adjacent.ts`
  alongside the other story-pipeline profiles, or a new sibling module, and wired into
  `profiles/index.ts`) tuned for the `story-character-profile` skill's retrieval: targeted
  full/section retrieval of the source `CHAR-*` dossier for `create_from_world_char` /
  `regenerate`, and story-bundle context for `create_story_local`.

**Basis:** `story-character-profile/SKILL.md:160` calls
`get_context_packet(task_type='story_character_profile', …)`, which currently has no matching
profile.

**Acceptance:**
- `get_context_packet(task_type="story_character_profile")` resolves against a defined profile
  rather than falling back to `other`/erroring.
- An oversize source `CHAR` returns section-projection suggestions.

### 2.3 Patch-engine stale-index covers the STCHAR hybrid path

**Files:** `tools/patch-engine/src/apply.ts`

- `detectStaleIndex` (lines ~197–212) watches `characters/%.md`, `diegetic-artifacts/%.md`,
  `adjudications/%.md` but **not** `stories/<story_slug>/story-characters/STCHAR-*.md`. Add a
  `file_path LIKE 'stories/%/story-characters/%.md'` clause so an out-of-band edit to a STCHAR
  hybrid file is detected as a stale index before patch application, matching the existing staging
  support for STCHAR.

**Acceptance:**
- A modified `stories/<slug>/story-characters/STCHAR-*.md` whose hash differs from the indexed
  version triggers the stale-index guard.
- World-level hybrid path coverage is unchanged.

### 2.4 I5 — Documentation reconciliation

**Files:**
- `docs/MACHINE-FACING-LAYER.md`
- `docs/CONTEXT-PACKET-CONTRACT.md`
- `reports/story-character-dossier-retrieval-concerns.md`

- `MACHINE-FACING-LAYER.md`: add `story_character_authority_record` to the retrievable record-type
  listings; clarify that story-pipeline `seed_nodes` use world-scope `CHAR` ids **only for
  bootstrap / profile-source reads**, while normal turn-cycle/page-plan/prose runtime consumes
  active STCHAR through story context and targeted STCHAR retrieval.
- `CONTEXT-PACKET-CONTRACT.md`: document the `story_character_profile` task type and the STCHAR
  components of `story_bundle_context` (`active_story_characters`).
- `reports/story-character-dossier-retrieval-concerns.md`: this report is pervasively pre-STCHAR
  (`STENT.bound_char_id`, turn-cycle re-seeding world `CHAR` dossiers). **Archive it** to
  `archive/reports/story-character-dossier-retrieval-concerns-2026-05-21.md` (or prepend an
  "OBSOLETE — superseded by STCHAR (SPEC-56/57)" banner if kept in-tree). Operators must not follow
  contradictory pre-STCHAR guidance.
- `docs/triage/2026-05-20-story-character-dossier-retrieval-triage.md`: the companion triage of the
  report above. Lines 25 and 44 describe turn-cycle deriving `STENT.bound_char_id` and an Option-D
  "durable detector" keyed on `STENT.bound_char_id` — a field the validator
  `story-kernel-cast-bind-list-integrity.ts:84–90` now flags as legacy ("story runtime authority
  must use STCHAR ids"). Prepend the same "OBSOLETE — superseded by STCHAR (SPEC-56/57)" banner so
  operators do not build a detector on a removed field. (The `bound_char_id` mention in
  `docs/triage/2026-05-16-story-related-improvements-seventh-iteration-triage.md` is a historical
  record of a past contract state — leave it as-is.)

**Explicit non-change:** `reports/stchar-implementation-first-iteration.md` and
`reports/stchar-audit-first-iteration.md` legitimately contain `bound_char_id` as historical
migration narrative — **do not edit them**.

**Optional / secondary (defer if low value):** `story_bundle_context.active_story_characters` is
currently status-based (filtered on STCHAR `status === "active"`), not page/branch-snapshot-bound.
Either rename the field to `global_active_story_characters` for honesty, or add a page-scoped
`active_story_character_ids_by_latest_page`. Low priority; include only if 2.2 work makes it cheap.

### 2.5 Acceptance for docs

- No active (non-archive, non-historical-report) doc states STENT uses `bound_char_id`.
- Retrieval docs list `story_character_authority_record`.
- Story-pipeline docs distinguish bootstrap/profile source reads from runtime STCHAR reads.

## 3. Test requirements

- World-index: `{ pred: "record_active", record: "STCHAR-1" }` and the string form both emit
  `storylet_predicate_ref`; a combinator-nested ref (`not[record_active(STCHAR-1)]`, `any[…]`) and a
  non-`record` arg field (`{ pred: "obligation_open", obligation: "OBL-1" }`) both index; STPLAN
  success/fallback structured predicate refs index.
- MCP: `story_character_profile` task type resolves to a profile;
  `get_context_packet(task_type="story_character_profile")` no longer falls back.
- Patch-engine: stale-index test for an edited `stories/<slug>/story-characters/STCHAR-*.md`.

## 4. FOUNDATIONS alignment

| Principle | Stance | Rationale |
|---|---|---|
| §Tooling Recommendation / Machine-Facing Layer | aligns | A `story_character_profile` task profile and complete predicate-edge extraction make STCHAR retrievable through the documented context-packet + targeted-retrieval pattern rather than ad hoc reads. |
| §6.1 Story-Local Character Authority | aligns | Doc reconciliation removes pre-STCHAR `bound_char_id` guidance and states that runtime consumes STCHAR, not world `CHAR`. |
| Rule 6 (No Silent Retcons) — analogue | aligns | Stale-index coverage for the STCHAR hybrid path prevents out-of-band STCHAR edits from being silently overwritten by a patch built on a stale index. |
| §5b Schema-Minimalism | N/A | No schema fields are added; the optional `active_story_characters` rename (2.4) is a naming-honesty change, not a new field. |

## Outcome

Completed: 2026-05-21

SPEC-60 is complete across all four tickets:

- I3 landed via `archive/tickets/SPEC60STCHARMACLAY-001.md`: `tools/world-index` extracts record refs from structured predicate argument fields and nested predicate combinators for SLT and STPLAN predicate sources.
- I4 landed via `archive/tickets/SPEC60STCHARMACLAY-002.md`: `tools/world-mcp` registers `story_character_profile` as a first-class story-pipeline context-packet task type with ranking, budget, governing-world, full-body, README, and capability coverage.
- Patch-engine stale-index coverage landed via `archive/tickets/SPEC60STCHARMACLAY-003.md`: STCHAR hybrid markdown paths are included in the pre-apply stale-index watch set.
- I5 landed via `archive/tickets/SPEC60STCHARMACLAY-004.md`: active machine-facing docs now list `story_character_authority_record`, document `story_character_profile`, distinguish profile-source `CHAR` reads from runtime STCHAR authority, archive the stale dossier-retrieval report, and banner the stale 2026-05-20 triage.

Deviations from the original plan:

- The optional `story_bundle_context.active_story_characters` rename / page-scoped active-cast surface was deferred. The docs now explicitly label the current field as status-based instead of changing the runtime schema.
- The `bound_char_id` proof is a classified historical/provenance sweep rather than a zero-hit sweep, because SPEC-60, archived reports, and historical triage records intentionally preserve the old term as evidence.

Final verification:

- `cd tools/world-index && npm run build` passed.
- `cd tools/world-index && npm test` passed: 127 tests.
- `cd tools/world-mcp && npm test` passed: 427 tests.
- `cd tools/patch-engine && npm test` passed: 92 tests.
- Docs/ticket proof for I5 passed: `story_character_authority_record` and `story_character_profile` / `active_story_characters` grep checks returned the expected active-doc hits; the stale report exists only under `archive/reports/story-character-dossier-retrieval-concerns-2026-05-21.md`; the source report path is gone; and the explicitly excluded STCHAR historical reports were unchanged.
