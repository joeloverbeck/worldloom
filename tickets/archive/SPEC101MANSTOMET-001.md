# SPEC101MANSTOMET-001: Schema types foundation for Manual Studio records

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — introduces `tools/manual-story-studio/src/schema/` directory and `manual-story.ts` type module; no impact on existing tooling packages.
**Deps**: None

## Problem

SPEC-101 establishes the per-manual-story data model (one metadata file + 18 record classes + Manual Character Profile). Every downstream Manual Studio module — schema validator, ref validator, ID allocator, read layer, write layer, CRUD routes, frontend API client, frontend forms — needs a single typed source of truth for record shapes, common fields, per-class additions, and closed enum vocabularies. Without a foundation type module, each downstream ticket would either re-derive types from the spec (drift risk) or share types via ad-hoc imports (boundary erosion). The foundation type module is the structural prerequisite for SPEC-101's 11 other tickets.

## Assumption Reassessment (2026-05-30)

1. `tools/manual-story-studio/src/` exists and contains `cli.ts`, `read/`, `server/`, `write/` (per SPEC-100 ticket landing); `src/schema/` does NOT yet exist (verified via `ls tools/manual-story-studio/src/`). This ticket creates `src/schema/` and the single `manual-story.ts` type module.
2. SPEC-101 §2 In scope items 1-3 enumerate the field set: `manual-story.yaml` metadata (§2.1), 18 record classes with common fields + per-class additions (§2.2), Manual Character Profile (§3). SPEC-101 §3 Key decisions records the lowercase `m`-prefix convention and per-class file layout. The full prefix enumeration was added to `docs/ID-ALLOCATION.md §Manual-story-scoped` during the in-session reassess-spec edit (2026-05-30).
3. Cross-artifact boundary under audit: `tools/manual-story-studio/src/schema/manual-story.ts` becomes the typed contract surface consumed by every other Manual Studio module (validators, read, write, routes, API client). Boundary discipline: no re-derivation of record shapes elsewhere; every consumer imports from this module.
4. FOUNDATIONS principle motivating this ticket: §Story Bundles §5b Schema-Minimalism ("Every field in every story-bundle record schema must be load-bearing"). Manual Studio is non-canon and outside story-bundle authority per SPEC-101 §5, but the minimalism discipline applies: per-class additions are minimal (typically 2-4 fields beyond common), enums are closed where the closure is obvious, and free-form fields are reserved for authorial notes. The Manual Character Profile additionally borrows STCHAR's author-facing sections per FOUNDATIONS §Story Bundles §6.1 without STCHAR's machine lifecycle (source kinds, supersession, status, revisioning, bound STENT IDs); `source_world_character: CHAR-*` is read-only provenance, never an operational shortcut.

## Architecture Check

1. A single type module (vs. one type file per record class) keeps the 18 record classes' common-field union legible — adding a new common field or a new enum value is a single-file edit, not an 18-file cascade. Common-field reuse across classes (the `RecordCommonFields` interface) is the load-bearing discipline; per-class types extend it.
2. No backwards-compatibility shims. SPEC-100 introduced no record-shape types (it scaffolded the package boundary, sandbox, and write surface only); this ticket is the first record-shape type surface in the package.

## Verification Layers

1. Type module compiles cleanly under `tsc -p tsconfig.json` → codebase grep-proof (npm run build:backend succeeds).
2. Every enum literal listed in SPEC-101 §2.1 + §2.2 + §3 appears as a closed `type` union in `manual-story.ts` → codebase grep-proof (one grep per enum: `pov`, `tense`, `content_intensity`, `language_register`, `psychic_distance`, `dialogue_density`, `interiority`, `paragraphing`, `importance`, `prompt_visibility`, role enum, `truth_relation`, `confidence`, `audience_visibility`, clock `direction`, `urgency`, `valence`, `intensity`, plan `visibility`, thread `status`, question `kind`, artifact `kind`, status `kind`, entity `kind`, relationship `axes` value union).
3. The common-field interface (`RecordCommonFields`) and per-class type aliases match SPEC-101 §2.2's enumerated fields → manual review against the spec.

## What to Change

### 1. Create `tools/manual-story-studio/src/schema/manual-story.ts`

Module exports:

- **`ManualStoryMetadata`** interface — shape of `manual-story.yaml`:
  - `schema_version: "manual-story.v1"`
  - `world_slug: string`, `manual_story_slug: string`, `title: string`
  - `created_at: string`, `updated_at: string` (ISO 8601 strings)
  - `source: { world_commit: string | null; notes: string }`
  - `story_contract`: object with `premise`, `tone`, `pov` (closed union), `tense` (closed union), `content_intensity` (closed union), `explicitness: string`, `language_register` (closed union), `prose_preferences` (nested with `psychic_distance` / `dialogue_density` / `interiority` / `paragraphing`, each a closed union)
  - `cast_order: string[]` (`mchar-*` IDs), `segment_order: string[]` (`SEG-*` IDs)
  - `prompt_policy: { save_prompts: boolean; require_moment_directive: boolean; default_beat_count: string; include_recent_segments: number }`
  - `manuscript: { compile_on_segment_save: boolean; include_segment_titles: boolean }`

- **`ManualStoryRole`** type union — closed: `viewpoint | primary_actor | opposing_actor | allied_actor | authority | dependent | witness | information_source | pressure_source | social_bridge | background` (player_proxy omitted per SPEC-101 §3 / proposal §2 line 25).

- **`RecordImportance`** = `low | medium | high | central`.
- **`PromptVisibility`** = `always | include_when_relevant | only_if_pinned`.

- **`RecordCommonFields`** interface — common to every record:
  - `id: string` (matches filename)
  - `title: string`
  - `active: boolean` (default `true`)
  - `importance: RecordImportance` (default `medium`)
  - `tags: string[]`
  - `summary: string`
  - `details: string`
  - `refs: { characters: string[]; locations: string[]; related_records: string[] }`
  - `prompt_visibility: PromptVisibility`
  - `last_reviewed_after_segment: string | null` (`SEG-*` or null)
  - `notes: string`
  - `retired_reason?: string` (populated when `active: false` via inactive-not-hard-delete path)

- **18 per-class type aliases extending `RecordCommonFields`**, each adding the per-class fields listed in SPEC-101 §2.2:
  - `ManualCharacterRecord` (cast/mchar-*) — see Manual Character Profile body below
  - `ManualEntityRecord` (entities/ment-*) — `kind: "institution" | "faction" | "force" | "population" | "animal" | "other"`
  - `ManualStatusRecord` (statuses/mstat-*) — `subject: string` (`mchar-*` | `mloc-*` | `mobj-*`); `kind: "life" | "agency" | "location" | "bodily" | "social" | "other"`
  - `ManualLocationRecord` (locations/mloc-*) — `tags` extends common with examples like `public`, `semi-private`, `intimate`, `park` (open set, not enum-restricted)
  - `ManualObjectRecord` (objects/mobj-*) — `current_location: string | null` (`mloc-*` or null); `current_holder: string | null` (`mchar-*` or null)
  - `ManualFactRecord` (facts/mfact-*) — no additional fields beyond common
  - `ManualBeliefRecord` (beliefs/mbel-*) — `holder: string` (`mchar-*`); `truth_relation: "true" | "false" | "partly_true" | "unknown" | "contested"`; `confidence: "low" | "medium" | "high" | "certain"`
  - `ManualIntentionRecord` (intentions/mint-*) — `holder: string` (`mchar-*`); `target: string`
  - `ManualPlanRecord` (plans/mplan-*) — `holder: string` (`mchar-*`); `target: string`; `visibility: "private" | "shared" | "factional" | "public"`
  - `ManualEmotionRecord` (emotions/memo-*) — `holder: string` (`mchar-*`); `valence: "positive" | "mixed" | "negative"`; `intensity: "mild" | "moderate" | "strong" | "overwhelming"`
  - `ManualRelationshipRecord` (relationships/mrel-*) — `between: [string, string]` (`mchar-*` pair); `axes: { trust: AxisLevel; fear: AxisLevel; attraction: AxisLevel; power: AxisLevel; respect: AxisLevel; familiarity: AxisLevel }` where `AxisLevel = "low" | "medium" | "high" | "volatile" | "unset"`; `dominant_axis?: string`
  - `ManualThreadRecord` (threads/mthr-*) — `subject: string`; `status: "open" | "building" | "climaxing" | "resolving" | "closed" | "dormant"`
  - `ManualObligationRecord` (obligations/mobl-*) — `owed_by: string` (`mchar-*`); `owed_to: string` (`mchar-*`); `urgency: "latent" | "low" | "medium" | "high" | "overdue"`
  - `ManualConsequenceRecord` (consequences/mcnsq-*) — `caused_by_segment: string | null` (`SEG-*` or null); `pending: boolean`; `urgency: "latent" | "low" | "medium" | "high" | "overdue"`
  - `ManualClockRecord` (clocks/mclock-*) — `axis: string` (free-form, examples: `trust`, `fear`, `attraction`, `arrival`); `value: number | string`; `direction: "rising" | "falling" | "stalled" | "unset"`
  - `ManualSecretRecord` (secrets/msecret-*) — `held_by: string[]` (`mchar-*[]`); `audience_visibility: "hidden" | "known_to_holders" | "rumored" | "partially_revealed" | "revealed"`; `forbidden_reveal_tags: string[]`
  - `ManualQuestionRecord` (questions/mq-*) — `kind: "open" | "mystery" | "forbidden_reveal"`; `answer_known: boolean`; `must_not_resolve_unless: string[]`
  - `ManualArtifactRecord` (artifacts/martifact-*) — `kind: "physical" | "text" | "symbolic" | "digital"`; `current_holder: string | null` (`mchar-*` | `mloc-*` | null); `provenance: string`

- **`ManualCharacterProfile`** (the `cast/mchar-*.yaml` body extending `RecordCommonFields`):
  - `display_name: string`
  - `roles: ManualStoryRole[]`
  - `source_world_character?: string` (optional read-only `CHAR-*` provenance pointer; informational; outside ref-validation scope per SPEC-101 §2.4)
  - `identity: { one_line: string; public_face: string; private_pressure: string }`
  - `world_pressure_core: { world_produced_wound: string; active_appetite: string; self_mythology: string; irreconcilable_contradiction: string; relational_charge: string; moral_psychological_edge: string; cannot_be_swapped_out_because: string }`
  - `body_and_presence: { physicality: string; body_limits: string; habitual_gestures: string; clothing_or_presentation: string; social_presentation: string }`
  - `voice: { baseline: string; under_pressure: string; intimacy: string; evasion: string; anger: string; lying: string; anti_generic_warnings: string[] }`
  - `pressure_behavior: { cornered: string; tempted: string; humiliated: string; protecting_attachment: string; offered_power: string }`
  - `perception_and_embodiment: { notices: string; misses: string; misreads: string; sensory_bias: string }`
  - `agency_and_planning: { default_strategy: string; risk_style: string; fallback_style: string; planning_blind_spots: string }`
  - `relationship_behavior: Record<string, string>` (map: `mchar-<id>` → description; plus optional `authority_figures` / `dependents` summary keys)
  - `prose_constraints: { prose_must_not_imply: string[]; forbidden_inventions: string[]; voice_do_not_do: string[] }`

- **`ManualRecord`** discriminated union type combining all 18 per-class types (for downstream generic consumers that need to switch on class).

- **`ManualRecordClass`** type union — closed list of 18 class names: `cast | entities | statuses | locations | objects | facts | beliefs | intentions | plans | emotions | relationships | threads | obligations | consequences | clocks | secrets | questions | artifacts`.

- **`MANUAL_RECORD_CLASS_PREFIXES`** const map — `{ cast: "mchar", entities: "ment", statuses: "mstat", ... }` for the 18 classes. Source of truth for prefix-to-class mapping; consumed by ID allocator, validators, and ref-validator.

## Files to Touch

- `tools/manual-story-studio/src/schema/manual-story.ts` (new)

## Out of Scope

- Schema validation logic (declarative schema definitions + required-field checks) — SPEC101MANSTOMET-002.
- Reference-integrity validator — SPEC101MANSTOMET-003.
- ID allocator implementation — SPEC101MANSTOMET-004.
- Read / write layer implementations — SPEC101MANSTOMET-005 / 006.
- Beat-template type (`mtemplate-*`) — deferred to SPEC-104.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm run build:backend` succeeds — type module compiles cleanly.
2. `cd tools/manual-story-studio && npm test` passes (no regressions in SPEC-100 capstone or scaffolded tests).
3. `grep -n "MANUAL_RECORD_CLASS_PREFIXES" tools/manual-story-studio/src/schema/manual-story.ts` returns exactly 1 match (the const declaration); the map has 18 entries matching `docs/ID-ALLOCATION.md §Manual-story-scoped`.

### Invariants

1. Every per-class type extends `RecordCommonFields` — no class redeclares common fields with divergent types.
2. Every closed enum from SPEC-101 §2.1 + §2.2 + §3 appears as a `type` union; no enum is left as bare `string`.
3. `MANUAL_RECORD_CLASS_PREFIXES` keys match `ManualRecordClass` union members exactly (18 entries each).

## Test Plan

### New/Modified Tests

1. `None — type-only module; verification is `tsc -p tsconfig.json` compilation success and the grep-proof in AC #3. Downstream tickets exercise the types through validator and CRUD tests.`

### Commands

1. `cd tools/manual-story-studio && npm run build:backend`
2. `cd tools/manual-story-studio && npm test`
3. `grep -cE "^export (type|interface|const)" tools/manual-story-studio/src/schema/manual-story.ts` — counts exported symbols; expected ≥ 21 (18 per-class types + RecordCommonFields + ManualCharacterProfile + ManualStoryMetadata + MANUAL_RECORD_CLASS_PREFIXES + ManualRecord + ManualRecordClass + role/importance/prompt-visibility enums).
