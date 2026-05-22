# SPEC-55 — Character Pipeline Fourth-Iteration Fixes

**Status:** COMPLETED
**Created:** 2026-05-20
**Depends on:** SPEC-52 / SPEC-53 / SPEC-54 (all archived, completed 2026-05-20)

Triage note: this spec is the warranted slice of the fourth-iteration audit
`archive/reports/deepening-characters-fourth-iteration.md` (produced by ChatGPT-Pro under
repository-only constraints). That report's headline "fix first" recommendation —
broad NCP body-section heading validation — and its deterministic anti-flattening
companion are **REJECTED** here, because they re-propose decisions deliberately made
in the opposite direction by SPEC-52 Phase 5 item 6, re-affirmed by SPEC-53, and
re-affirmed again by SPEC-54 (§Out of Scope). The report did not consult the
`archive/specs/` decision record and so misread a design decision (the protagonist-grade
engine lives in AJV-validated `memorability_profile` frontmatter, not in body prose) as
an open gap. See §Out of Scope for the full rejection rationale and the codebase
verification that grounds it. Only three genuinely-open, deterministic, FOUNDATIONS-aligned
items survive triage: hybrid field-projection error guidance (audit Medium #4), the
story-pipeline authoring-proposal seed loophole (audit Medium #5), and a small
schema/template drift documentation + regression-test slice (audit Medium #6 + Low items).

---

## Context

The character-proposal pipeline (NCP `character_proposal_card` → NCB
`character_proposal_batch` → CHAR `character_record`) reached feature-complete state
across SPEC-52/53/54. A fourth external audit was run and is mostly refuted by
codebase verification against current `main`:

- **NCP body-section validation** is intentionally absent — the engine is the
  AJV-validated `memorability_profile` frontmatter, validated by
  `character-proposal-card.schema.json`; structural validation checks frontmatter-derived
  conditions plus the upgraded/user-seed `## Rejected Directions Audit` heading only
  (`tools/validators/src/structural/character-memorability-structure.ts:129-167`). A
  well-formed NCP with a thin-but-present body is intended-valid (`SPEC-54` Definition
  of Done). This is the deterministic-vs-LLM boundary in FOUNDATIONS §Tooling
  Recommendation.
- **Anti-flattening** is an LLM-critic responsibility (`character-generation` Phase 8
  Test 17 + Phase 9). The single deterministic sliver — `source_basis.source_proposal_id`
  format enforcement when a CHAR declares an NCP source — already exists at
  `character-memorability-structure.ts:115-124`.
- **World-index build/sync** already has current-template-shaped fixtures at
  `tests/fixtures/animalia/character-proposals/` (7 full NCPs + a full NCB manifest)
  exercised by the structured-edge and prose-whole-file tests.

Three open items remain. They are deterministic, narrow, and align with the
machine-facing-layer "actionable failure messages" and "clean story/world separation"
principles. They do not touch canon semantics, the protagonist-grade engine, or any
LLM-critic surface.

---

## Phase 1 — Actionable hybrid-record error for field-projection tools (audit Medium #4) — Medium

**Problem.** `get_record_field` / `get_records_field` are atomic/story-bundle field
readers. When handed a hybrid id (`CHAR`, `DA`, `PA`, `NCP`, `NCB`), they fall through
`parseRecordBody` and return the generic
`"Node 'NCP-0001' is not an atomic record node."`
(`tools/world-mcp/src/tools/get-record.ts:290-297`, reached via
`tools/world-mcp/src/tools/get-record-field.ts`). The message does not tell the operator
that hybrid records are projected through `get_record(section_path=…)`, so a caller
hitting the wrong tool gets no route forward.

**Changes.**

1. In `tools/world-mcp/src/tools/get-record-field.ts`, before attempting atomic-record
   body parsing, detect hybrid record ids (the same id family the hybrid path in
   `get-record.ts` recognizes: `^(?:CHAR|DA|PA|NCP|NCB)-\d+$`) and return an actionable
   error: hybrid records are read via
   `get_record(record_id, section_path='frontmatter.<field>')` or
   `get_record(record_id, section_path='body.<section>')`, not via `get_record_field`.
2. `tools/world-mcp/src/tools/get-records-field.ts` delegates to `getRecordField`, so it
   inherits the corrected per-id error automatically. Add a per-id success/error
   assertion so the batch path is covered.

**Acceptance criteria.**

- `get_record_field({ record_id: "NCP-0001", field: "..." })` returns an error whose
  message names `get_record(section_path='frontmatter.<field>'|'body.<section>')` as the
  correct tool, for each of `CHAR`, `DA`, `PA`, `NCP`, `NCB`.
- Atomic-record and story-bundle field reads are unchanged (no regression).
- `get_records_field` over a mix of atomic and hybrid ids returns the actionable error in
  the hybrid entries and normal results in the atomic entries.

---

## Phase 2 — Story-pipeline authoring-proposal seed-node guard (audit Medium #5) — Medium

**Problem.** `get_context_packet` already keeps *story-local* node ids
(`SF`, `BEL`, `PG`, …) out of the world-scope seed assembly for **story-pipeline** task
types: gated by `isStoryPipelineTaskType` (imported at
`tools/world-mcp/src/tools/get-context-packet.ts:8`), `seedNodesForAssembly` (line 44)
filters them out and `storyLocalSeedNodeWarnings` (line 34) emits the
`story_local_seed_nodes_ignored` warning (constant at line 32), because story-local ids
belong in the `story_bundle_context` layer (resolved via `story_slug`), not in world
seeds. Non-story task types return early (lines 35, 45) and keep all seeds. The
complementary case is unguarded: `NCP` / `NCB` are **world-scope authoring-proposal** ids,
so when supplied as seeds to a story-pipeline task type they pass straight through
`seedNodesForAssembly` and resolve silently into the packet. Current story skills seed
only with realized `CHAR` ids and world anchors, so this is not a current breakage — but
it is an unprotected seam in the clean story/world separation that the existing
story-local guard already establishes the pattern for.

**Changes.**

1. Extend the existing `isStoryPipelineTaskType`-gated branch in both
   `seedNodesForAssembly` and `storyLocalSeedNodeWarnings` to also recognize an
   `AUTHORING_PROPOSAL_SEED_NODE_PATTERN` (`^(?:[a-z0-9-]+:)?(?:NCP|NCB)-\d+$`): for
   story-pipeline task types, drop matching seeds from assembly and emit a new
   `authoring_proposal_seed_nodes_ignored` warning (a sibling constant to
   `story_local_seed_nodes_ignored`). Reuse the existing two-function shape rather than
   adding new scaffolding; non-story task types keep their early return, so world
   authoring seeds are untouched.
2. Add a one-line note to `docs/CONTEXT-PACKET-CONTRACT.md`: story-pipeline seed nodes must
   be realized `CHAR-<integer>` ids and world anchors; `NCP`/`NCB` authoring-proposal nodes
   are world-scope and are warned-and-dropped for story task types.

**Acceptance criteria.**

- A story-pipeline `get_context_packet` call seeded with an `NCP`/`NCB` id emits the
  `authoring_proposal_seed_nodes_ignored` warning and excludes that node from the
  assembled packet.
- World task types are unaffected: `NCP`/`NCB` remain valid seeds for world authoring
  tasks (e.g. the `propose_new_characters` profile), exactly as today.
- Story-local seed warnings (the existing mechanism) are unchanged.
- The contract doc states the realized-`CHAR`-only seeding rule for story tasks.

---

## Phase 3 — Schema/template drift documentation + regression tests (audit Medium #6 + Low) — Low

**Problem.** `occupancy_strength`, `score_aggregate`, and `source_basis.batch_id` appear
in the batch NCP template but are not required by `character-proposal-card.schema.json`
(`source_basis` is `additionalProperties: true`, so `batch_id` inside it is unvalidated).
The audit asks whether they should be required. They must **not** be promoted to required:
the upgraded/user-seed template legitimately omits `source_basis.batch_id`
(`deepen-character-proposal/templates/upgraded-proposal-card.md`), and forcing the others
would reject otherwise-valid cards for no canon-safety gain. The correct resolution is to
record their **advisory** status so the next audit does not re-flag the drift. Two cheap
regression tests are also missing.

**Changes.**

1. Document the advisory status of `occupancy_strength`, `score_aggregate`, and
   `source_basis.batch_id` — in the schema `description` fields and/or the
   `propose-new-characters` proposal-card template comments — as "authored guidance fields,
   not schema-required."
2. Add a regression test asserting that an NCB manifest carrying a stale `proposal_ids`
   field (and omitting `card_ids`) is rejected. This is already structurally guaranteed by
   `character-proposal-batch.schema.json` (`additionalProperties: false` + required
   `card_ids`); the test pins the behavior.
3. Add a regression test asserting that a `user_seed` upgraded NCP with **no** `batch_id`
   and all required upgraded frontmatter passes schema validation.

**Acceptance criteria.**

- An NCB fixture with `proposal_ids` instead of `card_ids` fails schema validation, with a
  test asserting it.
- A `user_seed` NCP without `batch_id` passes schema validation, with a test asserting it.
- The advisory status of the three drift fields is documented at the schema or template
  surface.
- No field is promoted to schema-required (no behavior change for existing valid cards).

---

## Out of Scope

These items from `archive/reports/deepening-characters-fourth-iteration.md` are **rejected** and
recorded here so a future audit does not re-propose them:

- **Broad NCP body-section heading validation** (audit High #1, the report's headline
  "fix first": requiring `Material Reality`, `Niche Analysis`, `Canon Safety Check Trace`,
  the base sections, `Seed Essence`, `Upgrade Diagnosis`, `Canon Routing`) — **rejected**.
  Contradicts SPEC-52 Phase 5 item 6, SPEC-53 (§Out of Scope, "audit H1a"), and SPEC-54
  (§Out of Scope). The NCP engine is the AJV-validated `memorability_profile` frontmatter,
  not body prose. A well-formed NCP with a thin-but-present body is intended-valid. The
  report's own §5 concedes validators should "avoid judging literary greatness"; a
  required-section validator is exactly that pressure re-entering through structure.
  Verified: `character-memorability-structure.ts:129-167` performs only frontmatter-derived
  + `## Rejected Directions Audit` checks, by design.
- **Deterministic anti-flattening / "strong NCP → duller CHAR rejected" test**
  (audit High #3 / Medium #2) — **rejected**. Out of Scope per SPEC-54:223-226; semantic
  flattening judgment is `character-generation` Phase 8 Test 17 + Phase 9 (LLM critic). The
  only deterministic sliver (`source_basis.source_proposal_id` format) already exists at
  `character-memorability-structure.ts:115-124`.
- **"Test theater" reframing of the structural-validator fixtures** (audit High #2a) —
  **refuted**. Accepting a thin well-formed NCP body is the specified behavior, not a
  masked bug.
- **World-index build/sync realistic-fixture gap** (audit High #2b) — **already resolved**.
  `tests/fixtures/animalia/character-proposals/` carries current-template-shaped NCP/NCB
  fixtures exercised by the structured-edge and prose-whole-file tests.
- **MCP `list_records` fixture upgrade to full-template bodies** (audit Medium #2,
  retrieval slice) — **rejected** as marginal. The fixtures already carry realistic
  frontmatter; body content is not load-bearing for the metadata/full-body assertions.
- **`card_ids.minItems: 1`** (audit Low) — **rejected**. An all-dropped batch can
  legitimately produce an empty `card_ids`; do not over-constrain.

---

## FOUNDATIONS Alignment

| Principle | Stance | Rationale |
|---|---|---|
| §Tooling Recommendation — "LLM agents should never operate on prose alone" / deterministic-vs-LLM boundary | aligns | All three phases keep literary/semantic judgment with the LLM critic and confine deterministic work to retrieval-error guidance, seed-node hygiene, and schema/test pinning — and the spec explicitly rejects the audit's body-prose and semantic-flattening deterministic proposals. |
| §Machine-Facing Layer item 2 (Retrieval MCP — typed retrieval, actionable failures) | aligns | Phase 1 turns an unhelpful generic error into an actionable route to the correct hybrid-projection tool; Phase 2 hardens seed-node resolution. |
| §Story Bundles §8 / clean story-world separation | aligns | Phase 2 closes the seam where world-scope authoring-proposal nodes could enter a story-pipeline packet, symmetric to the existing story-local-into-world warning. |
| §Canonical Storage Layer — hybrid read discipline (`get_record` section_path projection) | aligns | Phase 1's corrected error points operators at exactly the documented hybrid-projection path; Phase 3 pins NCP/NCB schema behavior on the hybrid surface. |
| Rule 1 (No Floating Facts) — analogue at proposal scope | N/A | NCP/NCB/CHAR are pre-canon proposal/realization artifacts, not CF/CH world canon; Rule 1 governs accepted canon facts. Listed defensively because the pipeline feeds `canon-addition`, but this spec touches only proposal-side retrieval/validation/test surfaces. |

---

## Definition of Done

- `get_record_field` / `get_records_field` return an actionable hybrid-record error naming
  `get_record(section_path=…)` for `CHAR/DA/PA/NCP/NCB`; atomic/story field reads unchanged.
- Story-pipeline `get_context_packet` warns-and-drops `NCP`/`NCB` seeds
  (`authoring_proposal_seed_nodes_ignored`); world task types still accept them;
  `docs/CONTEXT-PACKET-CONTRACT.md` states the realized-`CHAR`-only story-seed rule.
- Advisory status of `occupancy_strength` / `score_aggregate` / `source_basis.batch_id`
  documented; no field promoted to required.
- Regression tests pin stale-`proposal_ids` NCB rejection and `user_seed` no-`batch_id`
  NCP acceptance.
- The rejected body-section-validation and deterministic-anti-flattening recommendations
  remain out of scope, with the SPEC-52/53/54 decision record cited.
- `npm run build`, `npm test`, and lint pass in `tools/world-mcp` and `tools/validators`.

---

## Summary

SPEC-55 implements the narrow, deterministic, FOUNDATIONS-aligned slice of the
fourth-iteration character-pipeline audit: actionable hybrid-record error guidance for
field-projection MCP tools, a story-pipeline authoring-proposal seed-node guard symmetric
to the existing story-local warning, and small schema/template drift documentation plus two
regression tests. The audit's headline body-section-validation and deterministic
anti-flattening recommendations are rejected as re-proposals of the deliberate SPEC-52/53/54
design decision that the protagonist-grade engine lives in AJV-validated frontmatter, not
body prose, with literary judgment owned by the LLM critic.

## Outcome

Completed: 2026-05-20

SPEC-55 landed through three archived tickets:

- `archive/tickets/SPEC55CHAPIPFOU-001.md` implemented actionable hybrid-record errors for `get_record_field` / `get_records_field`.
- `archive/tickets/SPEC55CHAPIPFOU-002.md` implemented the story-pipeline `NCP`/`NCB` authoring-proposal seed guard and context-packet contract note.
- `archive/tickets/SPEC55CHAPIPFOU-003.md` documented advisory NCP drift fields and added regression coverage for stale NCB `proposal_ids` rejection plus `user_seed` no-`batch_id` acceptance.

Deviations from the original plan:

- No field was promoted to schema-required; this was an explicit design constraint, not an omission.
- The package manifests for `tools/world-mcp` and `tools/validators` do not define lint scripts, so the lint lane named in Definition of Done was unavailable. Build and test lanes were run instead.

Final verification:

- `npm run build` from `tools/world-mcp` passed.
- `npm test` from `tools/world-mcp` passed with 422 tests.
- `npm run build` from `tools/validators` passed.
- `node --test dist/tests/schemas/character-proposal-schema-fixtures.test.js` from `tools/validators` passed with 12 tests.
- `npm test` from `tools/validators` passed with 743 tests.
- Advisory-note grep found the schema and template annotations for `occupancy_strength`, `score_aggregate`, and `source_basis.batch_id`.
