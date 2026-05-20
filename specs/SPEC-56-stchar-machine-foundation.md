# SPEC-56 — STCHAR Machine-Facing Foundation

**Status:** DRAFT
**Created:** 2026-05-20
**Depends on:** nothing (machine-layer foundation; consumed by SPEC-57)
**Consumed by:** SPEC-57 — STCHAR Pipeline Integration

Triage note: this spec is the machine-layer half of the warranted slice of
`reports/stchar-implementation-first-iteration.md` (produced by ChatGPT-Pro). Every
codebase claim in that report was verified across five parallel exploration passes and
found accurate. The report's core thesis — that the story pipeline needs a first-class
**story-local character authority** record (`STCHAR`) because stable voice / persona /
appraisal / pressure-behavior has no home in the present-causal temporal records
(`BEL` / `STINT` / `SREL` / `STEMO`) — is **ACCEPTED**. The report's implementation is
**ACCEPTED-WITH-MODIFICATION**: three over-engineered surfaces are trimmed (see §Out of
Scope: M1 13-section-hash reduction, M2 skill-mode reduction, M3 deferred MCP packet tool).

**This spec supersedes the decision recorded in
`docs/triage/2026-05-20-story-character-dossier-retrieval-triage.md`.** That triage
accepted a lean fix (Option A targeted CHAR retrieval + Option D drift audit + a single
`bound_char_content_hash` field on `STENT`) and explicitly **rejected** a new `STCHAR`
record class on FOUNDATIONS §5b Schema-Minimalism grounds. Reassessment reverses that
rejection: §5b governs the per-field token cost of *atomic state records*; `STCHAR` is a
**hybrid markdown authority artifact** (like `CHAR` / `DA`), retrieved on-demand by
`section_path`, and is exempt from that concern by the same precedent that makes `CHAR`
dossiers deliberately rich. The triage's accepted items are **subsumed**, not discarded:
targeted CHAR retrieval becomes the one-time STCHAR distillation; the `bound_char_content_hash`
field becomes `STCHAR.source_char_hash`; the drift audit becomes the optional health-audit
source-drift mode (SPEC-57). The triage file should be marked superseded by this spec.

---

## Context

A story bundle binds story entities (`STENT`) to world character dossiers (`CHAR-*`)
through a thin `STENT.bound_char_id` pointer. Verification confirmed the failure mode the
user reported (characters in stories are dramatically flatter than their world dossiers):

- `STENT` carries only `{id, story_id, created_at_page, supersedes, display_name,
  bound_char_id, role_in_story}` — no voice, appraisal, pressure behavior, persona
  contradictions, or relationship-specific conduct
  (`.claude/skills/_shared-templates/story-record-schemas.md` §4.5.1).
- **No story-pipeline skill loads the `CHAR` dossier body for runtime characterization.**
  Bootstrap passes `CHAR` ids as world-scope seed nodes to `get_context_packet` (existence
  verification only); turn-cycle seeds from `STENT.bound_char_id` but never loads the body;
  `character_record` is absent from the `story_turn_cycle` full-body delivery rules
  (`tools/world-mcp/src/context-packet/full-body-delivery.ts`).
- The page-plan minimum contract has no mandatory character-voice authority section — only
  optional §16 "Cast material reality projection" and §17 "Style/register notes"
  (`.claude/skills/_shared-templates/story-state-contract.md` §8). The external prose
  renderer receives a cold-context page plan with no voice authority for its speakers.

The temporal records cannot fix this: `BEL` / `STINT` / `SREL` / `STEMO` capture present
causal state (what a character *currently* believes/intends/feels/relates), not the stable
performative authority (voice, syntax, register, metaphor field, pressure-behavior pattern,
perception style) that makes a character render as *that person*. A stable, story-local,
voice-bearing authority artifact is the missing surface.

`STCHAR` is that artifact: a story-local distillation of `CHAR` (or of story-local inputs),
stored once per cast member, consumed by every downstream story skill, and never re-derived
from `CHAR` at runtime. This spec builds the machine-facing layer that stores, retrieves,
validates, and indexes it. SPEC-57 builds the skills that produce and consume it.

There are **zero production story bundles** in the repository (no `worlds/*/stories/*`
content, no `STENT` records outside the test fixture). A hard cutover with no migration
shim is therefore safe.

---

## Phase 1 — FOUNDATIONS + shared-contract amendments

**Implementation note (2026-05-20):** Landed by `archive/tickets/SPEC56STCHARMACFOU-001.md`.
`docs/FOUNDATIONS.md`, `.claude/skills/_shared-templates/story-state-contract.md`, and
`.claude/skills/_shared-templates/story-record-schemas.md` now declare `STCHAR`, replace
`STENT.bound_char_id` with `STENT.bound_stchar_id`, reserve the not-yet-mandatory STCHAR
page-plan packet section, and keep `STCHAR` out of `BEL.basis.access_records` and
`SE.promotion_claims[].source_record`. Remaining Phase 1 prose below is historical
implementation scope for the ticket.

**Files:**
- `docs/FOUNDATIONS.md`
- `.claude/skills/_shared-templates/story-state-contract.md`
- `.claude/skills/_shared-templates/story-record-schemas.md`

**Changes:**

1. **FOUNDATIONS §Story Bundles → §6 Story-Bundle ID Classes**: add `STCHAR` to the
   per-bundle record class list with the gloss "story-local character authority profile;
   hybrid markdown artifact under `story-characters/`."
2. **FOUNDATIONS — new subsection** under §Story Bundles, "Story-Local Character Authority":

   > World-level `CHAR-*` records remain story-agnostic. Story bundles that need
   > character-specific behavior, voice, appraisal, or planning authority use story-local
   > `STCHAR-*` profiles. Normal story runtime consumes active `STCHAR` profiles, not world
   > `CHAR` dossiers. `CHAR` provenance may be recorded in `STCHAR` frontmatter; it must not
   > be used as an operational shortcut in `STENT`, `CHC`, page plans, or prose receipts.

3. **story-state-contract.md §3 Record Class Inventory**: add `STCHAR` — "stable story-local
   character authority profile; hybrid markdown artifact under `story-characters/`."
4. **story-state-contract.md §record_active predicate**: add `STCHAR` to the lawful
   record-class list (line 187 surface).
5. **story-state-contract.md lifecycle write discipline**: add — "`STCHAR` is a hybrid
   story-bundle authority artifact, created/superseded by patch-engine hybrid operations and
   participating in `PG.state_snapshot.active_records`."
6. **story-state-contract.md §8 page-plan minimum contract**: **reserve** (do not yet mandate)
   a §16-class "STCHAR-derived character authority packets" section as a named placeholder.
   SPEC-57 Phase 6 supplies its full text and promotes it to **mandatory** once the emitting
   skills (bootstrap / turn-cycle) and the packet-presence check land. SPEC-56 must not declare
   the section mandatory while nothing produces or enforces it — otherwise the SPEC-56→SPEC-57
   window carries a mandatory contract section with no producer (and tensions this spec's own
   Out of Scope "all skill behavior changes: SPEC-57"). The prior optional §16/§17 remain for
   material-reality / page-level style only. (The §2/§3/§19 verbatim-inlining discipline is
   unchanged — STCHAR packets are per-page-computed, not verbatim-inlined.)
7. **story-record-schemas.md §4.5.1 — replace `STENT` schema**:
   ```yaml
   id: STENT-<integer>
   story_id: STORY-<integer>
   created_at_page: PG-<integer>
   supersedes: STENT-<integer> | null
   display_name: <string>
   bound_stchar_id: STCHAR-<integer> | null   # null ONLY when role_in_story is exactly [background]
   role_in_story: [<role>]
   ```
   Rule: `bound_stchar_id` may be `null` only when `role_in_story` is exactly `[background]`;
   any other role requires a resolvable active `STCHAR`. `bound_char_id` is **removed**.
8. **story-record-schemas.md §4.2** — add `STCHAR: [STCHAR-<integer>]` to
   `PG.state_snapshot.active_records`.
9. **story-record-schemas.md** — add `STCHAR` to: `CHC.grounded_in.records[]` (§4.5.12);
   `SE.state_delta.create/supersede/close[]`; `SE.record_introductions[].class`;
   `SREL.derived_from[]`; `STPLAN.derived_from[]`; `STEMO.derived_from[]`.
   Do **NOT** add `STCHAR` to `BEL.basis.access_records[]` (epistemic access, not persona
   authority — FOUNDATIONS §6a). Do **NOT** add `STCHAR` to `SE.promotion_claims[].source_record`.

**Acceptance criteria:**
- `STCHAR` is listed as a story-local authority class in FOUNDATIONS and the shared contract.
- World/story separation rule for character authority is explicit.
- `STENT.bound_stchar_id` replaces `bound_char_id` with the background-only-null rule.
- Active-record, grounding, and lifecycle surfaces enumerate `STCHAR`.
- `BEL.basis.access_records` and `promotion_claims.source_record` are unchanged.

---

## Phase 2 — STCHAR JSON schema + dependent schema edits

**Files:**
- `tools/validators/src/schemas/story-character-authority.schema.json` (new)
- `tools/validators/src/schemas/story-entity.schema.json`
- `tools/validators/src/schemas/story-page.schema.json`
- `tools/validators/src/schemas/story-choice.schema.json`
- `tools/validators/src/schemas/story-event.schema.json`
- `tools/validators/tests/**`

**`story-character-authority.schema.json` — trimmed frontmatter schema** (M1 applied: three
hashes only, no per-section hash map):

Required fields: `id`, `story_id`, `story_slug`, `world_slug`, `source_kind`,
`source_char_id`, `source_char_hash`, `source_char_sections_used`, `generated_at_page`,
`created_by_skill`, `supersedes`, `status`, `bound_stent_ids`, `profile_revision`,
`body_schema_version`, `profile_hash`, `voice_block_hash`, `page_packet_hash`.

- `id`: `^STCHAR-(0|[1-9][0-9]*)$`
- `source_kind`: enum `world_char | story_local | hybrid | regenerated`
- `source_char_id`: `^CHAR-(0|[1-9][0-9]*)$` or `null`
- `story_local_inputs_used[]`: optional; story-bundle id pattern
- `generated_at_page`: `story_bootstrap` | `^PG-(0|[1-9][0-9]*)$` | `null`
- `supersedes` / `superseded_by`: `^STCHAR-...$` | `null`
- `status`: enum `active | superseded | retired`
- `bound_stent_ids[]`: `^STENT-...$`
- `profile_revision`: integer ≥ 1
- `body_schema_version`: const `stchar.v1`
- `profile_hash` / `voice_block_hash` / `page_packet_hash`: `^sha256:[0-9a-f]{64}$`
- `additionalProperties: false`
- Conditional `allOf`: `source_kind == world_char` ⇒ require `source_char_id` + `source_char_hash`
  non-null; `source_kind == story_local` ⇒ `source_char_id` and `source_char_hash` are `null`.

**REMOVED from the report's schema (M1):** the `section_hashes` object with 13 entries. No
consumer reads per-section hashes; the three top-level hashes (identity/drift, voice-block
fidelity, page-packet fidelity) cover every named consumer in SPEC-57.

**`story-entity.schema.json`:** remove `bound_char_id`; add
`"bound_stchar_id": { "type": ["string","null"], "pattern": "^STCHAR-[0-9]+$" }`. Add
conditional: if `role_in_story` contains any value other than `background`, `bound_stchar_id`
must be a string. `additionalProperties` stays `false`.

**`story-page.schema.json`:** add `STCHAR` bucket to `active_records`:
`{ "type": "array", "items": { "type": "string", "pattern": "^STCHAR-[0-9]+$" } }`.

**`story-choice.schema.json`:** add `STCHAR` to the `grounded_in.records[]` pattern union.

**`story-event.schema.json`:** add `STCHAR` to `record_introductions[].class` enum, to the
`state_delta.create/supersede/close` patterns, and add an `STCHAR` trigger row. Do **not**
add `STCHAR` to `promotion_claims[].source_record`.

**Acceptance criteria:**
- New schema validates a well-formed STCHAR frontmatter; rejects missing required field,
  missing hash, malformed id, `world_char` without `source_char_id`/`hash`, `story_local`
  with a `source_char_id`.
- `story-entity` accepts `bound_stchar_id`, rejects `bound_char_id`, rejects non-background
  STENT with null `bound_stchar_id`, accepts exactly-`[background]` STENT with null.
- `story-page` accepts `active_records.STCHAR`; `story-choice` accepts `STCHAR` grounding;
  `story-event` accepts `STCHAR` in introductions/state_delta, rejects it in `promotion_claims`.

---

## Phase 3 — Structural validators

**Files:** `tools/validators/src/structural/*` + `tools/validators/tests/structural/*`
(follow the existing `Validator` export pattern: `{ name, severity_mode, applies_to(), run() }`,
e.g. `branch-isolation.ts`, `id-uniqueness.ts`).

**New validators (trimmed to load-bearing set):**

1. `stent_requires_stchar` — non-background `STENT` must have `bound_stchar_id`.
2. `stchar_resolves` — every `STENT.bound_stchar_id` and `active_records.STCHAR` id resolves
   to an existing STCHAR file.
3. `stchar_active_for_bound_stent` — every active non-background STENT's bound STCHAR is
   present in that page's `active_records.STCHAR`.
4. `stchar_supersession_integrity` — no active page references a `superseded`/`retired` STCHAR
   unless the page predates the supersession.
5. `no_char_authority_in_story_runtime` (M5 — kept strict) — story-bundle runtime records,
   page plans, and prose receipts must not cite `CHAR-*` as operational character authority.
   Exceptions: `STCHAR.source_char_id` provenance, and the explicit promotion/adjudication
   surfaces. This is the anti-split-authority guarantee.
6. `character_grounding_consistency` — when a `CHC` is marked character-specific, or a
   `STPLAN`/`STEMO` declares persona-derived shape, the corresponding `STCHAR` appears in
   `grounded_in`/`derived_from`. (Folds the report's separate choice/plan/emotion grounding
   validators into one — they share resolution logic.)

Replay/closure validators (`snapshot_replay_equality`, `recursive_reference_closure`) must
accept `STCHAR` in `active_records` and follow `STENT → STCHAR` and `STCHAR → source CHAR`
edges. Judgment-assisted fidelity checks are **not** deterministic validators — they live in
prose-attach / health-audit (SPEC-57).

**Acceptance criteria:** each validator has a passing fixture and a failing fixture; the
direct-CHAR-authority leak and missing-STCHAR cases fail deterministically.

---

## Phase 4 — Patch-engine support

**Files:**
- `tools/patch-engine/src/envelope/schema.ts`
- `tools/patch-engine/src/ops/story-record-specs.ts` (register the STCHAR op in the
  `STORY_RECORD_SPECS` registry, mirroring the `append_story_diegetic_artifact_record` entry)
- `tools/patch-engine/src/ops/create-story-record.ts` (dispatch — confirm hybrid-markdown
  handling for the new entry, mirroring story DA)
- `tools/patch-engine/src/apply.ts`
- `tools/world-mcp/src/tools/describe-envelope-schema.ts`
- `tools/world-mcp/tests/tools/validate-patch-plan.test.ts`

**Changes:**
- Add `stchar_ids?: string[]` to the ID-allocation envelope fields.
- Register the STCHAR write op as a `STORY_RECORD_SPECS` entry (in `story-record-specs.ts`)
  following the `append_story_diegetic_artifact_record` shape — e.g.
  `append_story_character_authority_record: { allocationKey: "stchar_ids", idPattern: /^STCHAR-\d+$/, nodeType: "story_character_authority_record", prefix: "STCHAR", sourceDir: "story-characters" }`.
  Do **NOT** model the op on the world-canon `append-character-record.ts` standalone op file (that
  writes `worlds/<slug>/characters/` with `expectedPrefix: "characters"` and is not a story-record
  registry entry); the shared `stageNewHybridFile` helper may be reused, but the op is registered
  in the story-record registry like every other story-bundle op. STCHAR is a hybrid markdown
  artifact like story DA — written to
  `worlds/<world_slug>/stories/<story_slug>/story-characters/STCHAR-<id>.md` (a markdown file, not
  under `_source/`); mirror story DA's hybrid-write handling at implementation.
- Add a `supersede_story_character_authority_record` op modeled on the existing
  `supersede_clk_record` / `supersede_stsec_record` / `supersede_stq_record` ops — NOT a bespoke
  `supersede_stchar_profile`. Op names use the story-bundle `<verb>_story_<class>_record`
  convention (FOUNDATIONS §Story Bundles §4), not `*_stchar_profile`. **Implementer open-point**:
  STCHAR is the first *hybrid* story-bundle record needing supersession (story DA is append-only
  with no supersede op), so the hybrid-supersede path is novel — confirm/establish it against the
  atomic `supersede_<class>_record` precedent and story DA's hybrid writer when the ticket lands.
- Add stale-index detection covering `stories/*/story-characters/STCHAR-*.md`.
- `describe_envelope_schema` documents the new ops.

**Acceptance criteria:** `allocate_next_id` supports `STCHAR` (via `stchar_ids`); the
`append_story_character_authority_record` op writes `stories/<slug>/story-characters/STCHAR-<id>.md`;
the `supersede_story_character_authority_record` op writes the superseding file and lifecycle-marks
the old, mirroring the existing `supersede_<class>_record` ops; stale-index guard detects a changed
STCHAR file; envelope schema describes the new ops.

---

## Phase 5 — World-index node + edges

**Files:** `tools/world-index/src/schema/types.ts`, `tools/world-index/src/parsers/*`,
`tools/world-index/src/edges/*`, `tools/world-index/tests/*`.

**Changes:**
- Add node type `story_character_authority_record` to `NODE_TYPES`.
- Parse STCHAR frontmatter + body sections (hybrid parser, model on the `character_record`
  parser).
- Add edge types: `stent_character_authority` (`STENT.bound_stchar_id → STCHAR`),
  `stchar_source_character` (`STCHAR.source_char_id → CHAR`), `stchar_supersedes`
  (`STCHAR.supersedes → STCHAR`), `stchar_bound_stent` (`STCHAR.bound_stent_ids[] → STENT`).
- Existing generic edges (`page_active_record`, `choice_grounded_in`, `plan_derived_from`,
  `emotion_derived_from`) accept `STCHAR` after the union updates from Phase 2.

**Acceptance criteria:** STCHAR is indexed as `story_character_authority_record`; frontmatter
and body sections parse; the four new edges emit; `page_active_record` emits for active STCHAR.

---

## Phase 6 — MCP retrieval + context packet

**Files:** `tools/world-mcp/src/tools/get-record.ts`, `list-records.ts`,
`get-record-schema.ts`, `tools/world-mcp/src/context-packet/*`, `allocate-next-id.ts`
(`ID_CLASS_FORMATS` + `ID_CLASSES` enum), `tools/world-mcp/tests/tools/*`.

**Changes:**
- `allocate_next_id`: add `STCHAR` to `ID_CLASS_FORMATS` and the `ID_CLASSES` enum
  (story-scoped; allocated with `story_slug`).
- `list_records`: add `story_character_authority_record` to `SUPPORTED_LIST_RECORD_TYPES`
  with hybrid handling (`getHybridKind`), `include_full_body` returning parsed frontmatter +
  body sections.
- `get_record`: `STCHAR` resolves with `story_slug`; `section_path` projects
  `frontmatter.*` and `body.<section>` (including `body.Page-Plan Voice Block`) using the
  existing hybrid section-path machinery. (Note: the current code rejects `section_path` for
  story-bundle hybrid ids — that guard must be relaxed for STCHAR, since on-demand section
  projection is the mechanism that replaces the deferred packet tool. See M3.)
- `story_bundle_context`: add `active_story_characters[]` summary —
  `{ id, status, bound_stent_ids, source_kind, source_char_id, profile_revision,
  profile_hash, voice_block_hash, page_packet_hash, packet_preview }`.
- `story_bundle_context`: update `buildCastBindList` (`tools/world-mcp/src/context-packet/story-bundle-context.ts`)
  and the `cast_bind_list` type (`tools/world-mcp/src/context-packet/shared.ts`) to read
  `stchar_id` + `source_char_id` in place of `char_id`, tracking SPEC-57's STORY_KERNEL.md
  `cast_bind_list` reshape. This is machine-layer parser work (SPEC-56 territory, not SPEC-57's);
  without it, `cast_bind_list.char_id` parses as `null` once SPEC-57's reshape lands. It must be
  sequenced with that reshape (see Definition of Done).
- **M3 (deferred):** do **not** build `get_story_character_packet`. The report itself notes it
  is "not strictly required if `get_record(section_path)` is robust"; verification confirmed
  the section-path machinery is robust. Add the dedicated tool later only if repeated
  section-path logic in story skills proves burdensome (audit-driven backfill).

**Acceptance criteria:** `get_record(STCHAR, story_slug)` works; `section_path` works for
frontmatter / body sections / page-plan voice block; `list_records` returns STCHAR;
`story_bundle_context.active_story_characters` is populated; story-turn-cycle context surfaces
active STCHAR summaries and does not deliver world `CHAR` full bodies.

---

## Phase 7 — Fixtures

**Files:** `tools/world-mcp/tests/tools/story-bundle-fixture.ts` + dependent test fixtures.

**Changes:**
- Replace `bound_char_id` usage. `STENT-2` binds `bound_stchar_id: STCHAR-1` and the fixture
  creates `STCHAR-1.md` (source_kind `world_char`, source_char_id `CHAR-1`). `STENT-3` is a
  pure-`[background]` entity with `bound_stchar_id: null`.
- Add an invalid fixture: witness/pressure-source STENT with null `bound_stchar_id` (must fail
  `stent_requires_stchar`).

**Acceptance criteria:** no fixture uses `bound_char_id`; at least one active STENT binds a
STCHAR; at least one background-only STENT has null; invalid fixtures prove the validators fire.

---

## Out of Scope

- **M1 — 13 per-section hashes (`section_hashes` map): REJECTED.** No consumer reads
  individual section hashes; the three top-level hashes cover every named SPEC-57 consumer.
  Re-add only when a concrete reader appears.
- **M2 — `retire`/`supersede_from_story_evidence` as distinct skill modes and a separate
  `retire_story_character_authority_record` patch op: DEFERRED.** v1 ships
  `create_from_world_char`, `create_story_local`, `regenerate` (SPEC-57) and the
  `append_story_character_authority_record` / `supersede_story_character_authority_record`
  patch ops.
- **M3 — `get_story_character_packet` MCP tool: DEFERRED** to audit-driven backfill;
  `get_record(section_path)` is the v1 mechanism.
- **Migration shim for `bound_char_id`: NOT NEEDED** — zero production story bundles; hard
  cutover. (If a production bundle is discovered before merge, this decision must be revisited.)
- **STCHAR → world `CHAR` promotion workflow:** out of scope here and in SPEC-57; story-local
  characters never auto-promote (FOUNDATIONS §No globalization by accident).
- All skill behavior changes: SPEC-57.

---

## FOUNDATIONS Alignment

| FOUNDATIONS principle | Stance | Rationale |
|---|---|---|
| §Story Bundles — World/story separation | aligns | `CHAR` stays world-level/story-agnostic; STCHAR is the story-local downstream authority; runtime never reads `CHAR` (`no_char_authority_in_story_runtime`). |
| §5b Schema-Minimalism at story scope | aligns | STCHAR is a hybrid on-demand artifact (CHAR/DA precedent), not an atomic state record; M1 trims the only non-load-bearing surface (section hashes). New atomic-record references (`bound_stchar_id`, `active_records.STCHAR`, grounding) are each load-bearing for resolution/replay. |
| §Canonical Storage Layer — engine-only write surface | aligns | STCHAR writes route through `submit_patch_plan` hybrid ops; never direct-written; lives in the story bundle, never in world `characters/`. |
| §4a Plan-Authority Boundary / "no floating facts" | aligns | STCHAR is indexed, hash-backed, active in PG snapshots, referenced through resolvable ids. |
| §6a Belief vs. Fact | aligns | STCHAR is explicitly excluded from `BEL.basis.access_records` — persona authority is not epistemic access. |
| §6b Observer firewall | aligns | STCHAR explains how a character acts; it grants no knowledge the character lacks (no `BEL` basis role). |
| §5a/§5c Commitment blocks / present causal state | aligns | STCHAR carries no arc/act/stage fields; it informs behavior under pressure, while `BEL`/`STINT`/`STPLAN`/`STEMO` remain present-state. |
| §9 Prose length discipline | aligns | STCHAR and its packets impose no word-count ceiling/floor. |
| Rule 6 No Silent Retcons | aligns | STCHAR regeneration is append/supersede (new id, `supersedes` link), never in-place rewrite. |

---

## Definition of Done

- All seven phases' acceptance criteria pass.
- `pnpm`/`npm` build + typecheck + tests green across `tools/validators`, `tools/patch-engine`,
  `tools/world-index`, `tools/world-mcp`.
- No fixture or schema references `bound_char_id`.
- The prior triage file is marked superseded by this spec.
- The `cast_bind_list` parser update (Phase 6) is sequenced with SPEC-57's STORY_KERNEL.md
  `cast_bind_list` reshape — neither the field-drop nor the parser-change strands the other.
- SPEC-57 can be implemented against the surfaces this spec lands.

---

## Summary

Builds the storage/retrieval/validation/index/patch machinery for `STCHAR`, a story-local
character authority hybrid artifact, trimmed from the source report by removing the 13-section
hash map (M1), deferring two skill modes and the dedicated packet MCP tool (M2/M3), and doing a
clean no-migration cutover from `STENT.bound_char_id` to `bound_stchar_id`. Supersedes the
lean-fix triage decision of 2026-05-20. SPEC-57 layers the skill behavior on top.
