# SPEC-101 — Manual Story Studio: Metadata, Manual Records, Manual Character Profile, CRUD

**Status:** PROPOSED
**Date:** 2026-05-30
**Classification:** story-canon-related (defines the per-manual-story data model that the prompt composer (SPEC-102) and prose paste flow (SPEC-103) consume; record vocabulary is deliberately segregated from world-canon and story-bundle classes via lowercase `m`-prefix discipline established in SPEC-100).
**Depends on:** **SPEC-100** (package skeleton, write sandbox, `enumerate.ts` exclusion, web frontend shell). SPEC-100 landed 2026-05-30 (archived at `specs/archive/SPEC-100-manual-story-studio-package-boundary.md`); SPEC-101 is the next ticketization per `specs/IMPLEMENTATION-ORDER.md`.
**Related:** `docs/FOUNDATIONS.md` §Story Bundles §6.1 (STCHAR profile sections borrowed for Manual Character Profile schema), `tools/world-index/src/parse/story-directories.ts` (uppercase ID patterns Manual Studio avoids by case), `archive/specs/SPEC-99-context-packet-scene-surface-and-closeout.md` and earlier (precedent for spec format).
**Source:** critical triage of `reports/manual-story-studio-first-iteration.md` §5 / §6 / §7 / §15 milestone M2 (ChatGPT-Pro, 2026-05-30). Accepted with: enum-vocabulary gaps for `language_register` / `prose_preferences.*` resolved during ticket decomposition; "sequences" → "consequences" interpretation **confirmed by user 2026-05-30** (CNSQ-shaped `consequences/mcnsq-*.yaml` records, per §2 In scope item 2 and §3 Manual Character Profile schema below); hybrid hard-delete-vs-inactive policy ships as proposed.

---

## 1. Context & Motivation

SPEC-100 established the boundary: a write-safe Manual Studio package and a content surface at `worlds/<slug>/manual-stories/<slug>/`. This spec fills that surface with the data model authors actually edit: the per-manual-story metadata file, the 18 manual record classes (beliefs, intentions, plans, emotions, relationships, threads, clocks, secrets, questions, artifacts, statuses, locations, objects, facts, obligations, consequences, entities, cast/characters, plus beat-templates deferred to SPEC-104), the Manual Character Profile, reference integrity, the hybrid deletion policy, the record CRUD backend, the frontend record editor, and the dashboard cockpit.

The schema discipline is the inverse of the branching-story `_source/` record schema: every field must be useful **to a human author** authoring deterministic state. There are no replay primitives, no append-only supersession, no state hashes, no validators that assume PG snapshots — those are story-bundle infrastructure for engine-driven authority. Manual Studio is a writer's cockpit: small YAML files the author edits directly through a form UI, validated for syntactic integrity and reference closure but not for branching-story-engine consistency.

ChatGPT-Pro's proposal §6 sketches a sensible common-fields shape and class list. The triage accepts the shape and elevates one gap: `story_contract.language_register` and `prose_preferences.*` reference vocabularies the proposal doesn't define — this spec defines them. The §6 note "the user's 'sequences' should be interpreted as **consequences**, matching the existing `CNSQ` concept" was confirmed by the user on 2026-05-30; this spec ships `consequences/mcnsq-*.yaml` as proposed.

## 2. Scope

### In scope

1. **`manual-story.yaml` schema** (one file per manual story, at `worlds/<slug>/manual-stories/<slug>/manual-story.yaml`). Fields:
   - `schema_version: manual-story.v1`
   - `world_slug` (string), `manual_story_slug` (string), `title` (string)
   - `created_at`, `updated_at` (ISO 8601 strings)
   - `source.world_commit` (null in MVP; reserved), `source.notes` (string)
   - `story_contract.premise` / `tone` / `pov` (one of `first | close third | distant third | omniscient`) / `tense` (one of `past | present`) / `content_intensity` (one of `general | mature | explicit`) / `explicitness` (string, free-form authorial note) / `language_register` (one of `casual | literary | formal | period_voice | colloquial | mixed`) / `prose_preferences.psychic_distance` (one of `deep_close | close | mid | distant | variable`) / `dialogue_density` (one of `dense | moment_led | sparse | mixed`) / `interiority` (one of `free_indirect | filtered | minimal | mixed`) / `paragraphing` (one of `literary | journalistic | dialogue_led | mixed`)
   - `cast_order: [mchar-*]` (ordered list of cast character IDs)
   - `segment_order: [SEG-*]` (ordered list of segment IDs — populated by SPEC-103)
   - `prompt_policy.save_prompts` (bool, default `true`), `require_moment_directive` (bool, default `true`), `default_beat_count` (string, default `"2-5"`), `include_recent_segments` (int, default `1`)
   - `manuscript.compile_on_segment_save` (bool, default `true`), `include_segment_titles` (bool, default `false`)
2. **18 manual record classes** stored at `worlds/<slug>/manual-stories/<slug>/records/<class>/<id>.yaml`:
   - `cast/mchar-*.yaml` (character / cast member)
   - `entities/ment-*.yaml` (non-character entities — institutions, factions, animals, forces)
   - `statuses/mstat-*.yaml` (active life / agency / location status)
   - `locations/mloc-*.yaml`
   - `objects/mobj-*.yaml`
   - `facts/mfact-*.yaml` (branch-local facts)
   - `beliefs/mbel-*.yaml`
   - `intentions/mint-*.yaml`
   - `plans/mplan-*.yaml`
   - `emotions/memo-*.yaml`
   - `relationships/mrel-*.yaml`
   - `threads/mthr-*.yaml`
   - `obligations/mobl-*.yaml`
   - `consequences/mcnsq-*.yaml` (CNSQ-shaped — user confirmed "sequences" maps to consequences, 2026-05-30)
   - `clocks/mclock-*.yaml`
   - `secrets/msecret-*.yaml`
   - `questions/mq-*.yaml` (open questions)
   - `artifacts/martifact-*.yaml`
   - (`beat-templates/mtemplate-*.yaml` — schema deferred to SPEC-104)

   **Common fields (every record):** `id` (matches filename), `title` (string), `active` (bool, default `true`), `importance` (one of `low | medium | high | central`, default `medium`), `tags` (string array), `summary` (string), `details` (string), `refs.characters` (`[mchar-*]`), `refs.locations` (`[mloc-*]`), `refs.related_records` (mixed array of `m*-*` IDs), `prompt_visibility` (one of `always | include_when_relevant | only_if_pinned`), `last_reviewed_after_segment` (`SEG-*` or null), `notes` (string), `retired_reason` (string, populated when `active: false` via the inactive-not-hard-delete path).

   **Per-class additions** (delta from common fields, kept minimal):
   - `cast/mchar-*.yaml`: see §3 Manual Character Profile schema (separate spec section).
   - `beliefs/mbel-*.yaml`: `holder: mchar-*` (the believer), `truth_relation` (one of `true | false | partly_true | unknown | contested`), `confidence` (one of `low | medium | high | certain`).
   - `secrets/msecret-*.yaml`: `held_by: [mchar-*]`, `audience_visibility` (one of `hidden | known_to_holders | rumored | partially_revealed | revealed`), `forbidden_reveal_tags` (string array, drives §SPEC-104 beat-template filtering).
   - `clocks/mclock-*.yaml`: `axis` (string, e.g., `trust`, `fear`, `attraction`, `arrival`), `value` (number or string), `direction` (one of `rising | falling | stalled | unset`).
   - `obligations/mobl-*.yaml`: `owed_by: mchar-*`, `owed_to: mchar-*`, `urgency` (one of `latent | low | medium | high | overdue`).
   - `consequences/mcnsq-*.yaml`: `caused_by_segment: SEG-*` (or null), `pending` (bool), `urgency` (same as obligations).
   - `intentions/mint-*.yaml`: `held_by: mchar-*`, `target` (string, free-form description).
   - `plans/mplan-*.yaml`: `held_by: mchar-*`, `target` (string), `visibility` (one of `private | shared | factional | public`).
   - `emotions/memo-*.yaml`: `held_by: mchar-*`, `valence` (one of `positive | mixed | negative`), `intensity` (one of `mild | moderate | strong | overwhelming`).
   - `relationships/mrel-*.yaml`: `between: [mchar-*, mchar-*]`, `axes.trust` / `axes.fear` / `axes.attraction` / `axes.power` / `axes.respect` / `axes.familiarity` (each one of `low | medium | high | volatile | unset`), `dominant_axis` (string, optional).
   - `threads/mthr-*.yaml`: `subject` (string), `status` (one of `open | building | climaxing | resolving | closed | dormant`).
   - `questions/mq-*.yaml`: `kind` (one of `open | mystery | forbidden_reveal`), `answer_known` (bool), `must_not_resolve_unless` (string array, free-form authorial constraints).
   - `artifacts/martifact-*.yaml`: `kind` (one of `physical | text | symbolic | digital`), `current_holder` (`mchar-*` or `mloc-*` or null), `provenance` (string).
   - `locations/mloc-*.yaml`: `tags` (extends common — e.g., `public`, `semi-private`, `intimate`, `park`).
   - `objects/mobj-*.yaml`: `current_location` (`mloc-*` or null), `current_holder` (`mchar-*` or null).
   - `statuses/mstat-*.yaml`: `subject: mchar-*` (or `mloc-*`, `mobj-*`), `kind` (one of `life | agency | location | bodily | social | other`).
   - `entities/ment-*.yaml`: `kind` (one of `institution | faction | force | population | animal | other`).
   - `facts/mfact-*.yaml`: no additional fields beyond common.
3. **Manual Character Profile schema** (the cast/mchar-*.yaml body, borrowing STCHAR's author-facing sections per `docs/FOUNDATIONS.md` §Story Bundles §6.1 without STCHAR's bootstrap/lifecycle/source-kind/revisioning fields):
   - Top-level: `id`, `display_name`, `roles: [<role>]` (closed enum: `viewpoint | primary_actor | opposing_actor | allied_actor | authority | dependent | witness | information_source | pressure_source | social_bridge | background` — `player_proxy` omitted per proposal §2), `source_world_character: CHAR-*` (optional read-only provenance pointer; never used as an operational shortcut, mirroring FOUNDATIONS §6.1 discipline).
   - `identity.one_line` / `public_face` / `private_pressure` (strings).
   - `world_pressure_core.world_produced_wound` / `active_appetite` / `self_mythology` / `irreconcilable_contradiction` / `relational_charge` / `moral_psychological_edge` / `cannot_be_swapped_out_because` (strings).
   - `body_and_presence.physicality` / `body_limits` / `habitual_gestures` / `clothing_or_presentation` / `social_presentation` (strings).
   - `voice.baseline` / `under_pressure` / `intimacy` / `evasion` / `anger` / `lying` (strings), `voice.anti_generic_warnings` (string array).
   - `pressure_behavior.cornered` / `tempted` / `humiliated` / `protecting_attachment` / `offered_power` (strings).
   - `perception_and_embodiment.notices` / `misses` / `misreads` / `sensory_bias` (strings).
   - `agency_and_planning.default_strategy` / `risk_style` / `fallback_style` / `planning_blind_spots` (strings).
   - `relationship_behavior` (map: `mchar-<id>` → string description; plus optional `authority_figures` and `dependents` summary strings).
   - `prose_constraints.prose_must_not_imply` (string array), `forbidden_inventions` (string array), `voice_do_not_do` (string array).
4. **Reference validation.** A record's `refs.*` and per-class typed pointers (e.g., `belief.holder`, `obligation.owed_by`) must point to existing records inside the same manual story OR to records marked `active: false` (archived but retained). Validator at `tools/manual-story-studio/src/validate/refs.ts` returns a list of broken-ref violations per record; CRUD save flow refuses to write a record with broken refs unless the author confirms an override (UI: "this record references missing IDs: <list>; save anyway?"). Reference closure is shallow (one hop, not recursive) — the goal is preventing obvious dangling refs, not enforcing engine-grade reference integrity. The `source_world_character: CHAR-*` provenance field on Manual Character Profiles is informational and explicitly outside ref-validation scope — the validator does not inspect it (resolution against world canon is M6 deferral per §8 Risks).
5. **Hybrid deletion policy.**
   - **Unreferenced record:** allow hard delete (`DELETE /api/.../records/<class>/<id>` → `fs.unlinkSync` after the in-tool reference scan returns zero referrers).
   - **Referenced record:** default to `active: false` with `retired_reason` (PUT, not DELETE). Audit-trailed.
   - **Force-delete:** allowed after the UI surfaces a reference-list warning and the user explicitly confirms. Audit-trailed.
   - Hard delete and force-delete both invoke the SPEC-100 write sandbox; both are restricted to paths inside the manual story root.
6. **Backend record CRUD routes** (Manual Studio backend, under `wrapRouterWritable`):
   - `GET /api/worlds/:slug/manual-stories/:msSlug/records?class=<class>` — list records of a class (returns parsed YAML with summary fields).
   - `GET /api/worlds/:slug/manual-stories/:msSlug/records/:class/:id` — single record (full YAML body).
   - `POST /api/worlds/:slug/manual-stories/:msSlug/records/:class` — create record (allocates next-available numeric suffix for the class; see §3 ID allocation).
   - `PUT /api/worlds/:slug/manual-stories/:msSlug/records/:class/:id` — update record.
   - `DELETE /api/worlds/:slug/manual-stories/:msSlug/records/:class/:id` — delete (hard delete if unreferenced; `?force=true` for force-delete with confirmation flag in request body).
   - `GET /api/worlds/:slug/manual-stories/:msSlug/metadata` / `PUT /api/worlds/:slug/manual-stories/:msSlug/metadata` — read/update `manual-story.yaml`.
7. **Frontend Records screen.** Three-pane layout: left rail (class navigation; per-class counts; active vs archived toggle), center (record card grid; filters by tag / importance / role; "New Record" button), right (per-record YAML-backed form with class-specific field sections). Cast & Profile editor is a specialization of the Records screen for the `cast/` class.
8. **Dashboard cockpit screen.** Single-pane authoring hub with widgets:
   - Story contract summary (premise, tone, POV, tense, content intensity, prose preferences).
   - Current directive draft (free-text input that becomes SPEC-102's moment directive).
   - Active cast list (with role badges).
   - Active high-importance records (top 20 by importance, filterable).
   - Open clocks / secrets / questions (counts + drill-down).
   - Latest segment (preview, last edited timestamp).
   - Manuscript word count (computed in SPEC-103).
   - "Generate Prompt" primary action (navigates to SPEC-102's Moment Composer).

### Out of scope

- Prompt composer, content-policy reuse, prompt lint, Markdown prompt format — SPEC-102.
- Prose paste, segment storage, manuscript compiler, state-update checklist — SPEC-103.
- Beat templates and deterministic filtering — SPEC-104.
- Cross-world canon import flows, read-only canon character lookup helpers — M6 deferral.
- Optional rebuildable indexes (`records.json`, `manuscript.json`) — M6 deferral.
- Full-text search over manual records — M6 deferral.
- Append-only supersession of manual records — explicitly rejected (proposal §6: "Append-only supersession would be overkill for the MVP").

## 3. Key decisions

- **ID allocation is per-class, per-manual-story, append-only natural integer suffix.** Allocator at `tools/manual-story-studio/src/write/id-allocator.ts` scans the class directory, computes `max(existing_numeric_suffix) + 1`, and reserves the next ID inside the POST handler. Class prefixes are short memorable abbreviations chosen to minimize collision with engine-recognized uppercase ID classes (STENT/STCHAR/SLT/etc.) rather than mechanically derived from directory names; `cast/` → `mchar-` follows the proposal §6 recommendation that aligns the manual-character prefix with STCHAR's role, and the full mapping is documented in `docs/ID-ALLOCATION.md` §Manual-story-scoped. The allocator is single-server (Manual Studio backend serves one client); race conditions are not a meaningful concern for a local writing cockpit.
- **YAML records are stored one per file, not concatenated.** Matches the proposal §6 recommendation; gives the author predictable diff surfaces in git and a stable per-record review unit.
- **Reference integrity is shallow (one hop), not recursive.** Recursive closure (e.g., "the belief's `holder` references a character whose `relationship_behavior` references a missing character") is engine-grade discipline that doesn't pay for itself at the authoring layer; the author will fix the chain when the broken ref surfaces during their own editing.
- **Hybrid delete policy avoids accidental destruction without forcing append-only.** The proposal's §6 recommendation matches Worldloom's FOUNDATIONS §Story Bundles §8 ("atomic YAML records remain append-only at the filesystem level, following the same record-append-only discipline that governs `_source/<world-subdir>/*.yaml`") in spirit at the inactive-record level while honoring the proposal's explicit "Append-only supersession would be overkill for the MVP" position via permitted hard-delete for unreferenced records and force-delete with audit-trailed warnings.
- **Enum vocabularies are closed where the closure is obvious; free-form with examples elsewhere.** `pov`, `tense`, `content_intensity`, `language_register`, prose preferences, role enums, importance, prompt_visibility, belief truth-relation/confidence, secret audience-visibility, clock direction, obligation urgency, relationship axes — closed. `relationship_behavior` map values, `voice.anti_generic_warnings`, `prose_constraints.*` — free-form because they're author authorial notes.
- **No `_index/` directory inside Manual Studio's content.** No DB, no FTS. Per-manual-story content is plain YAML readable in any editor; FTS is the M6 deferral.
- **No write to world canon, no write to story bundles.** Manual Studio's CRUD operates exclusively inside `worlds/<slug>/manual-stories/<slug>/records/`. The SPEC-100 sandbox enforces this; the Records screen has no UI affordance for cross-surface writes.

## 4. Files to touch

**Create (Manual Studio backend):**

- `tools/manual-story-studio/src/read/records.ts` — list / read per class.
- `tools/manual-story-studio/src/read/manual-story-metadata.ts` — read `manual-story.yaml`.
- `tools/manual-story-studio/src/write/records.ts` — create / update / delete records, invoking sandbox + ref-integrity validator.
- `tools/manual-story-studio/src/write/manual-story-metadata.ts` — update `manual-story.yaml`.
- `tools/manual-story-studio/src/write/id-allocator.ts` — per-class append-only allocator.
- `tools/manual-story-studio/src/validate/refs.ts` — shallow reference-integrity validator.
- `tools/manual-story-studio/src/validate/schema.ts` — YAML parse + required-field check per class (declarative schema definitions for the 18 MVP record classes — beat-templates land in SPEC-104).
- `tools/manual-story-studio/src/schema/manual-story.ts` — TypeScript types for all classes and `manual-story.yaml`.
- `tools/manual-story-studio/src/server/routes/records.ts` — CRUD routes.
- `tools/manual-story-studio/src/server/routes/metadata.ts` — metadata read/update routes.
- `tools/manual-story-studio/test/` — fixture-based tests for: ID allocation determinism, ref validator detects dangling refs, hybrid delete policy (unreferenced → hard delete; referenced → inactive; force-delete with warning), schema rejects missing required fields, sandbox rejects out-of-root writes.

**Create (Manual Studio frontend):**

- `tools/manual-story-studio/web/src/pages/Records.tsx` — three-pane records screen.
- `tools/manual-story-studio/web/src/pages/CastAndProfiles.tsx` — specialized Records view for `cast/` class.
- `tools/manual-story-studio/web/src/pages/Dashboard.tsx` — cockpit screen with widgets.
- `tools/manual-story-studio/web/src/components/RecordForm.tsx` — class-aware YAML-backed form (renders enum fields as selects, string arrays as chip inputs, etc.).
- `tools/manual-story-studio/web/src/components/RecordCard.tsx` — compact record summary card.
- `tools/manual-story-studio/web/src/components/RefList.tsx` — refs.* renderer with click-through to referenced records.
- `tools/manual-story-studio/web/src/api/records.ts` — typed client for CRUD routes.

**Modify:**

- `tools/manual-story-studio/src/server/http.ts` — register the new routes under `wrapRouterWritable`.
- `tools/manual-story-studio/web/src/App.tsx` — add routes for `/dashboard`, `/records`, `/cast`.
- `tools/manual-story-studio/README.md` — document the record class list and the hybrid delete policy.
- `docs/ID-ALLOCATION.md` — add a new `### Manual-story-scoped` section after `### Story-bundle-scoped` enumerating the 18 MVP lowercase `m`-prefix classes (`mchar-`, `mbel-`, `mrel-`, etc. — see §3 Key decisions for the full list) plus the deferred `mtemplate-` class, noting that allocation is performed by the Manual Studio backend (not the `mcp__worldloom__allocate_*` family) and that gaps from hard-delete are preserved.

**No modification to:**

- `tools/world-index/` (no new content reaches the world index; SPEC-100 exclusion suffices).
- `tools/hooks/` (Manual Studio's record paths are outside Hook 3 / Hook 2 patterns).
- `tools/patch-engine/`, `tools/world-mcp/`, `tools/validators/`, `tools/story-explorer/`.

## 5. FOUNDATIONS alignment

| Principle | Stance | Rationale (with surface) |
| --- | --- | --- |
| §Canonical Storage Layer engine-only-write discipline | aligns | Manual Studio's record CRUD writes only inside `worlds/<slug>/manual-stories/<slug>/records/`, enforced by the SPEC-100 sandbox; world canon `_source/` is untouched. |
| §Story Bundles §6 Story-Bundle ID Classes (uppercase patterns) | aligns @ case-discipline | All manual record IDs use lowercase `m`-prefix (`mchar-`, `mbel-`, `mrel-`, `mcnsq-`, etc.); world-index uppercase patterns (`^STENT-[0-9]+$`, etc.) cannot match. |
| §Story Bundles §6.1 Story-Local Character Authority (STCHAR profile sections) | aligns @ author-facing-section reuse | Manual Character Profile borrows Stable Persona Core / World Pressure Core / Voice / Pressure Behavior / Perception / Agency / Relationship Behavior / Prose Constraints sections — the load-bearing author-facing surface — without STCHAR's machine lifecycle (source kinds, supersession, status, revisioning, bound STENT IDs); `source_world_character: CHAR-*` is read-only provenance, never an operational shortcut. |
| §Story Bundles §6a Belief vs. Fact | aligns @ separation | Manual `mbel-*` records carry `holder` + `truth_relation` + `confidence`; manual `mfact-*` records are kept separate. |
| §Story Bundles §6b Information / Observer Firewall | aligns @ authoring-time-discipline | Manual records carry `prompt_visibility` so authors can mark a record as `only_if_pinned` to keep observer-asymmetric facts out of cast-wide prompts; firewall enforcement is the author's responsibility at the prompt-composer layer (SPEC-102), not engine-grade for this tool. |
| §Story Bundles §5b Schema-Minimalism | aligns @ load-bearing-fields-only | Per-class additions are minimal (typically 2-4 fields beyond common); fields are scoped to what the author edits or what SPEC-102 / SPEC-103 / SPEC-104 read. |
| §Story Bundles §8 record append-only discipline | aligns @ inactive-default | The hybrid policy defaults to `active: false` + `retired_reason` for referenced records (audit-preserving); hard delete is permitted for unreferenced records only, matching the proposal's "Append-only supersession would be overkill for MVP" position with an inactive-record audit fallback. |

## 6. Build & test

`tools/manual-story-studio`: `npm test` (builds backend + runs `node --test dist/test/**` + `npm --prefix web test`). Per-class CRUD tests live in `test/records-<class>.test.ts`; cross-cutting tests (ID allocation, ref validator, hybrid delete) live in `test/records-cross-cutting.test.ts`. Fixture manual stories live in `test/fixtures/manual-stories/`. Frontend component tests use the Vite test runner under `web/`.

## 7. Acceptance criteria

1. `manual-story.yaml` schema parses with all enum vocabularies validated; missing required fields rejected; tested for each enum.
2. All 18 MVP record classes (beat-templates excluded) parse, validate, and CRUD-round-trip; per-class required fields enforced.
3. ID allocator is deterministic: creating N records of class X yields `<prefix>-1` through `<prefix>-N`; gaps from hard-delete are preserved (allocator does not reuse deleted IDs).
4. Reference validator flags dangling refs; CRUD save refuses dangling refs unless explicitly overridden (tested for both paths).
5. Hybrid delete: hard delete of unreferenced record succeeds; delete of referenced record defaults to `active: false` with `retired_reason`; force-delete requires confirmation flag and is audit-logged (in the response body for now; persistent audit log is M6 deferral).
6. Manual Character Profile schema renders correctly in the Cast & Profile editor; all section fields editable; the `source_world_character: CHAR-*` field is read-only.
7. Dashboard renders all widgets with live data from the loaded manual story.
8. Records screen three-pane layout works; per-class filtering, tag filter, active/archived toggle all functional.
9. `npm test` passes for `@worldloom/manual-story-studio`.

## 8. Risks & Open Questions

- **No replay / no snapshot.** Manual Studio's records carry no `state_snapshot` or per-page-state-delta. The author maintains state by editing records after each segment. This is the deliberate inversion of branching-story discipline; the cost is that "what changed in this manual story between segments N and N+1" is a git-diff question, not an in-tool query. Acceptable for MVP.
- **No append-only supersession.** Editing a record in place loses prior values unless the author copies them into the `notes` field manually. This matches the proposal's MVP-scope choice and is the right tradeoff for an authoring tool.
- **Enum vocabulary may drift.** As authoring patterns surface, the closed enums (especially `language_register`, prose preferences, role enums, secret audience-visibility, clock axes) may need expansion. Drift is handled by amending this spec, not by introducing engine-grade vocabulary migration.
- **No cross-manual-story sharing of records.** Each manual story has its own record namespace. If two manual stories share a cast, the author duplicates the character profile. Shared cast is M6 deferral.
- **No machine-readable provenance from `source_world_character: CHAR-*` to canon.** The pointer is informational. If the author wants the manual character to mirror canon updates, that's a manual re-copy step. Auto-sync from canon is M6 deferral.
