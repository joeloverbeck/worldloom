<!--
SPEC-54: Character Pipeline — Third-Iteration Implementation Fixes
Delta against SPEC-53 (Character Pipeline Second-Iteration Fixes, archived/implemented 2026-05-20)
and SPEC-52 (Protagonist-Grade Character Pipeline, archived/implemented 2026-05-20).
Source audit: archive/reports/deepening-characters-third-iteration.md (ChatGPT-Pro, third iteration).
Triage note: the source audit's #1 "fix first" item (broad NCP body-section validation) is
REJECTED here as a re-proposal of a decision deliberately made in the opposite direction by
SPEC-52 Phase 5 item 6 and re-affirmed by SPEC-53 (Out of Scope). Only the genuinely-warranted
frontmatter-integrity slice of that finding is accepted (Phase 2).
-->

# SPEC-54: Character Pipeline — Third-Iteration Implementation Fixes

**Status:** COMPLETED
**Date:** 2026-05-20
**Predecessor:** SPEC-53 — Character Pipeline Second-Iteration Fixes (archived; this spec is a focused delta on its landed deliverables)
**Source audit:** `archive/reports/deepening-characters-third-iteration.md`

---

## Problem Statement

SPEC-52 landed the protagonist-grade character pipeline and SPEC-53 closed the second-iteration
seams (NCP schema reconciliation with the deepening template, `get_record`/`list_records` hybrid
support for NCP/NCB, `user_seed` audit parity, NCP→CHAR provenance persistence, and critic-rationale
substance). A third-iteration audit re-examined the closed system. After verifying every codebase
claim in the audit against source and reconciling it with the SPEC-52/SPEC-53 decision record, the
following are the genuinely-open, FOUNDATIONS-aligned residuals:

1. **Batch-generated NCPs can omit `batch_id`.** `character-proposal-card.schema.json` lists
   `batch_id` in `properties` (pattern `^NCB-[0-9]+$`) but **not** in any `required` constraint. The
   only `origin_kind`-keyed conditional governs `critic_pass_trace` shape, not `batch_id` presence.
   A batch card that omits `batch_id` still validates, but the NCP→NCB structured edge
   (`batch_id` → NCB `batch_id`, used by the world index) is silently dropped, breaking batch lineage
   and batch-scoped retrieval. SPEC-53 deliberately made `batch_id` *omittable for upgraded/user-seed*
   cards; it never added the converse requirement for batch cards.

2. **Malformed or missing frontmatter on `character-proposals/` files escapes all validation.**
   `yaml-parse-integrity.ts` checks markdown-frontmatter parse-ability for `characters/` and
   `diegetic-artifacts/` but **not** `character-proposals/`. When frontmatter is malformed YAML or
   absent, both `record-schema-compliance.ts` (`parseYamlSurface` → `null` → `continue`) and
   `character-memorability-structure.ts` (`parseFrontmatter` → `null` → skip) silently skip the file.
   Because the protagonist-grade engine lives entirely in the NCP `memorability_profile` *frontmatter*,
   a card whose frontmatter does not parse — or is missing — bypasses the AJV `memorability_profile`
   requirement with no verdict. This is an integrity hole on the load-bearing surface, distinct from
   (and not to be confused with) NCP body-prose heading checks (see §Out of Scope).

3. **`get_record_schema` does not expose NCP/NCB.** SPEC-53 added `get_record`/`list_records` hybrid
   support for `character_proposal_card`/`character_proposal_batch`, and `list_records` error guidance
   tells callers to consult the record schema — but `get_record_schema`'s
   `SUPPORTED_RECORD_SCHEMA_NODE_TYPES` (and the `server.ts` capability enum derived from it) omit both
   proposal types, even though their JSON schemas exist in `tools/validators/src/schemas/`. The
   describe surface is asymmetric with the retrieve surface SPEC-53 landed.

4. **Test-fixture / terminology drift.** Three test-fidelity defects, none changing runtime behavior:
   the MCP NCB fixtures (added by SPEC-53's `SPEC53CHAPIPSEC-002`) seed frontmatter with `proposal_ids`
   while the live `character-proposal-batch.schema.json` uses `card_ids`; the CHAR schema fixture uses
   `source_basis: { generated_from: "NCP-12" }` while the canonical, structurally-checked key is
   `source_proposal_id`; and `propose-new-characters` Phase 15 prose names
   `institutional_embedding_checklist` and `repeated_forced_choice` as if they were frontmatter fields
   when they are body/acceptance-test concepts.

### Key design decisions

- **Do NOT add broad NCP body-section heading validation.** The source audit's headline "fix first"
  recommendation (require `Niche Analysis`, `Canon Safety Check Trace`, the six base body sections,
  `Seed Essence`, `Upgrade Diagnosis`) is **rejected**. SPEC-52 Phase 5 item 6 deliberately decided NCP
  body prose is not heading-checked because the engine lives in `memorability_profile` frontmatter
  (AJV-validated); SPEC-53 (Out of Scope, "audit H1a") re-affirmed that rejection. The third audit
  offers no new argument and was written without that decision record. The audit's own §11.3 proposed
  code is additionally unsound: its required-section list omits the batch-only `## Likely Story Hooks`
  and the upgraded-only `## Canon Routing` headings the live templates actually emit. Phase 2 accepts
  only the **frontmatter-integrity** slice of that finding — which *protects* the load-bearing surface
  the prior decision relies on, rather than re-checking prose.
- **Anti-flattening stays an LLM-critic responsibility — and is already resolved structurally.**
  SPEC-53 Phase 4 (`SPEC53CHAPIPSEC-004`) already landed controlled NCP/CHAR fixtures,
  `source_basis.source_proposal_id` persistence, and a structural format check. The semantic
  "strong NCP → duller CHAR is rejected" judgment is, by SPEC-53's deliberate decision,
  `character-generation` Phase 8 Test 17 + the Phase 9 tradeoff summary, not a deterministic test
  (there is no LLM-in-the-loop test harness). No spec phase is warranted; the audit's Medium #2 is
  already-resolved.
- **`batch_id` requirement is keyed to `origin_kind`.** The new conditional requires `batch_id` only
  when the card is batch-generated (`upgrade_lineage` absent, or `origin_kind: batch_generated`),
  exactly mirroring SPEC-53's decision to omit it for `upgraded_seed`/`user_seed`. Batch cards (the
  current `validCard()` fixture) and upgraded/user-seed cards (no `batch_id`) must both stay valid in
  their respective regression guards.
- **MCP `get_record_schema` exposure is purely additive** — two enum entries plus two
  node-type→schema-file mappings. No new task type, ranking profile, or context-packet entry (those
  remain deferred per SPEC-52/SPEC-53).
- **Fixture changes are test-fidelity only.** The CHAR `source_basis` object is schema-open
  (`{type: object}`), so `generated_from` vs `source_proposal_id` is not a validation behavior change;
  the fix aligns fixtures with the canonical key the structural validator checks. No production schema
  field is added or removed.

---

## Approach

### Phase 1 — Require `batch_id` for batch-generated NCPs (audit High #2) — High

**Files**
- `tools/validators/src/schemas/character-proposal-card.schema.json` (edit)
- `tools/validators/tests/schemas/character-proposal-schema-fixtures.test.ts` (edit)

**Work**
1. In the existing root-level `allOf`, locate the batch-generated conditional whose `if` is
   `anyOf: [ {not: {required: [upgrade_lineage]}}, {origin_kind: batch_generated} ]` and whose `then`
   currently constrains `critic_pass_trace` to `batchCriticPassTrace`. Add `"required": ["batch_id"]`
   to that `then` block (preserving the existing `critic_pass_trace` constraint). Do **not** add
   `batch_id` to the schema's top-level `required` array — the requirement must remain conditional so
   the upgraded/user-seed path is unaffected.
2. Confirm the upgraded/user-seed conditional (`origin_kind ∈ {upgraded_seed, user_seed}`) does **not**
   require `batch_id` (SPEC-53 omits it there). No change expected; assert via test.

**Acceptance**
- A batch card (`validCard()`, `origin_kind: batch_generated` / no `upgrade_lineage`) **with**
  `batch_id` still validates.
- The same card **without** `batch_id` fails with a `required`/`batch_id` AJV error.
- An upgraded card (`origin_kind: upgraded_seed`, upgrade critic trace, ≥3 object-shaped rejected
  directions) **without** `batch_id` still validates.
- An upgraded card **with** a (well-formed) `batch_id` still validates (no over-strictness regression).

### Phase 2 — Frontmatter integrity for `character-proposals/` (warranted slice of audit High #1) — High

**Files**
- `tools/validators/src/structural/yaml-parse-integrity.ts` (edit)
- `tools/validators/src/structural/record-schema-compliance.ts` (edit)
- `tools/validators/tests/structural/yaml-parse-integrity.test.ts` and/or
  `tools/validators/tests/structural/record-schema-compliance.test.ts` (edit/add)

**Work**
1. Extend the markdown-frontmatter path condition in `yaml-parse-integrity.ts` to include
   `character-proposals/` alongside `characters/` and `diegetic-artifacts/` (this naturally covers both
   `character-proposals/*.md` NCP cards and `character-proposals/batches/*.md` NCB manifests). This makes
   **malformed** YAML frontmatter on those files produce a parse-integrity verdict instead of being
   silently skipped.
2. Close the **missing-frontmatter** escape in `record-schema-compliance.ts`: when a path matches the
   NCP card pattern (`^character-proposals/[^/]+\.md$`) or the NCB batch pattern
   (`^character-proposals/batches/[^/]+\.md$`) but `frontmatterFor(content)` returns `null` (no
   frontmatter block at all), emit an actionable "missing frontmatter" verdict rather than `continue`.
   A file under these paths must carry a parseable frontmatter block; the schema then enforces
   `memorability_profile` (NCP) / manifest fields (NCB) as today.
3. Do **not** add any NCP body-section heading checks (see §Out of Scope). The existing
   `## Rejected Directions Audit` heading check for upgraded/user-seed cards (landed in SPEC-53) is the
   only NCP body heading that remains validated, and is unchanged.

**Acceptance**
- An NCP card whose frontmatter is malformed YAML fails (parse-integrity verdict), where today it is
  skipped.
- An NCP card with no frontmatter block at all fails (missing-frontmatter verdict), where today it is
  skipped.
- An NCB manifest with malformed/missing frontmatter fails likewise.
- A well-formed NCP/NCB file with valid frontmatter and a thin-but-present body still **passes** the
  structural validators (no body-prose heading check is introduced) — this guards the SPEC-52/SPEC-53
  boundary against accidental scope creep.

### Phase 3 — Expose NCP/NCB via `get_record_schema` (audit Medium #1) — Medium

**Files**
- `tools/world-mcp/src/tools/get-record-schema.ts` (edit — `SUPPORTED_RECORD_SCHEMA_NODE_TYPES` +
  node-type→schema-file map)
- `tools/world-mcp/src/server.ts` (capability enum is derived from the constant; confirm no separate
  hardcoded list needs updating)
- `tools/world-mcp/tests/tools/get-record-schema.test.ts` (the existing parametrized
  "every supported node type" test will exercise the new entries; add explicit assertions)

**Work**
1. Add `"character_proposal_card"` and `"character_proposal_batch"` to
   `SUPPORTED_RECORD_SCHEMA_NODE_TYPES`.
2. Add the corresponding entries to the node-type→schema-file map, pointing at
   `character-proposal-card.schema.json` and `character-proposal-batch.schema.json` respectively
   (same resolution mechanism `character_record` → `character-frontmatter.schema.json` uses). The lookup
   path is confirmed: `get-record-schema.ts`'s `validatorsSchemaRoot()` resolves `tools/validators/src/schemas/`
   via a repo-root walk, and `getRecordSchema()` loads `join(schemaRoot, NODE_TYPE_TO_SCHEMA_FILE[node_type])`,
   so adding the two map entries (plus the two `SUPPORTED_RECORD_SCHEMA_NODE_TYPES` values) suffices; the
   existing parametrized "every supported node type" test exercises them automatically and fails loudly if a
   mapped schema file cannot be loaded.

**Acceptance**
- `get_record_schema({ node_type: "character_proposal_card" })` returns the
  `character-proposal-card.schema.json` payload (no error code).
- `get_record_schema({ node_type: "character_proposal_batch" })` returns the
  `character-proposal-batch.schema.json` payload (no error code).
- The server capability enum advertises both node types.
- The existing "every supported node type" parametrized test passes with the two additions.

### Phase 4 — Test-fixture / terminology fidelity (audit Low) — Low

**Files**
- `tools/world-mcp/tests/tools/get-record-hybrid.test.ts` (edit — NCB fixture)
- `tools/world-mcp/tests/tools/list-records.test.ts` (edit — NCB fixture)
- `tools/validators/tests/schemas/character-frontmatter-schema-fixtures.test.ts` (edit — CHAR fixture)
- `.claude/skills/propose-new-characters/references/phases-14-16-compose-validate-commit.md` (edit — prose)

**Work**
1. In both MCP test files, change the NCB fixture frontmatter field `proposal_ids:` to `card_ids:`
   (matching `character-proposal-batch.schema.json`), and update the corresponding assertions
   (`result.frontmatter.proposal_ids` → `result.frontmatter.card_ids`). This makes the retrieval tests
   exercise the live manifest field name rather than a non-schema field.
2. In the CHAR schema fixture, change `source_basis: { generated_from: "NCP-12" }` to
   `source_basis: { source_proposal_id: "NCP-12" }` (the canonical key the structural validator format-
   checks). Keep any companion test that asserts `source_proposal_id` acceptance.
3. In `propose-new-characters` Phase 15 prose, mark `institutional_embedding_checklist` and
   `repeated_forced_choice` explicitly as body/acceptance-test concepts (not frontmatter fields) so the
   wording does not invite false byte-for-byte schema-field expectations.

**Acceptance**
- MCP NCB retrieval tests use `card_ids` and pass.
- The CHAR schema fixture uses `source_proposal_id` and passes.
- No acceptance-test prose names a nonexistent frontmatter field without an explicit "body/acceptance
  concept" qualifier.

---

## Out of Scope

- **Broad NCP body-section heading validation** (audit High #1 core: `Niche Analysis`,
  `Canon Safety Check Trace`, the six base sections, `Seed Essence`, `Upgrade Diagnosis`) — **rejected**.
  Contradicts SPEC-52 Phase 5 item 6 and SPEC-53 (Out of Scope, "audit H1a"); the NCP engine is the
  AJV-validated `memorability_profile` frontmatter, not body prose; the audit's proposed required-section
  list also mis-models the live templates (omits batch-only `Likely Story Hooks` / upgraded-only
  `Canon Routing`). Only the frontmatter-integrity slice is accepted (Phase 2).
- **A deterministic anti-flattening / "strong NCP → duller CHAR rejected" test** (audit Medium #2) —
  **already resolved**. SPEC-53 Phase 4 landed fixtures + provenance + the structural format check; the
  semantic judgment is `character-generation` Phase 8 Test 17 + Phase 9 (LLM critic), by deliberate
  decision. No deterministic literary-quality scoring will be added.
- **Critic-rationale literary-substance deterministic gates** — remain skill-prose / LLM-critic
  discipline per SPEC-52/SPEC-53.
- **A dedicated `character_proposal_*` MCP task type, ranking profile, token budget, or context-packet
  entry** — remains deferred per SPEC-52/SPEC-53 §Out of Scope.
- **Story-system awareness of NCP/NCB** — story skills continue to consume only realized `CHAR-<integer>`
  dossiers; no change.

---

## FOUNDATIONS Alignment

| Principle | Stance | Rationale |
|---|---|---|
| §Machine-Facing Layer item 4 (Validator Framework — executable enforcement of structural invariants) | aligns | Phase 1 (`batch_id` requirement) and Phase 2 (frontmatter integrity) add deterministic structural enforcement on the load-bearing NCP/NCB surfaces; failure messages are actionable. |
| §Canonical Storage Layer — Read discipline (hybrid records retrievable; schema-backed describe surface) | aligns | Phase 3 makes the `get_record_schema` describe surface symmetric with the `get_record`/`list_records` retrieve surface SPEC-53 landed for `character_proposal_card`/`character_proposal_batch`. |
| §Tooling Recommendation — "LLM agents should never operate on prose alone" / deterministic-vs-LLM boundary | aligns | The spec keeps literary judgment (blandness, anti-flattening, memorability) with the LLM critic and confines validators to presence/shape/routing — explicitly rejecting the audit's body-prose and semantic-flattening deterministic-test proposals. |
| Rule 6 (No Silent Retcons) / auditability | aligns | Phase 1's enforced `batch_id` preserves the NCP→NCB lineage edge so batch provenance is not silently dropped; Phase 4 keeps fixtures honest against the canonical provenance key (`source_proposal_id`). |
| Rule 1 (No Floating Facts) — analogue at proposal scope | N/A | NCP/NCB are pre-canon proposal artifacts, not CF/CH world canon; Rule 1 governs accepted canon facts. Listed defensively because the pipeline feeds `canon-addition`, but this spec touches only the proposal-side validators/retrieval. |

---

## Verification

- `npm test` from `tools/validators` — schema fixtures (Phase 1, Phase 4 CHAR), structural validators
  (Phase 2), full-world baseline.
- `npm test` from `tools/world-mcp` — `get_record_schema` parametrized + explicit NCP/NCB assertions
  (Phase 3), NCB hybrid/list fixtures using `card_ids` (Phase 4).
- `npm run build` from each touched package.
- Manual: confirm a deliberately malformed-frontmatter NCP fixture now yields a verdict under
  `world-validate`, and a thin-but-well-formed NCP still passes (no body-heading regression).

---

## Notes

- 2026-05-20: Phase 1 landed via `archive/tickets/SPEC54CHAPIPTHI-001.md`. Batch-generated
  NCP cards now conditionally require `batch_id`; upgraded/user-seed cards can still omit it.
- 2026-05-20: Phase 2 landed via `archive/tickets/SPEC54CHAPIPTHI-002.md`. `yaml_parse_integrity` now covers
  malformed frontmatter in `character-proposals/`, `record_schema_compliance` now emits a
  `missing_frontmatter` verdict for NCP/NCB files with no frontmatter block, and the validators
  full-world legacy baseline now includes that additional known proposal gap.
- 2026-05-20: Phase 3 landed via `archive/tickets/SPEC54CHAPIPTHI-003.md`. `get_record_schema` now
  exposes `character_proposal_card` and `character_proposal_batch`, with package and public-doc proof.
- 2026-05-20: Phase 4 landed via `archive/tickets/SPEC54CHAPIPTHI-004.md`. NCB fixtures now use
  `card_ids`, the CHAR fixture uses `source_basis.source_proposal_id`, and Phase 15 skill prose labels
  `institutional_embedding_checklist` / `repeated_forced_choice` as body / acceptance-test concepts.
- This spec is the third focused delta in the SPEC-52 → SPEC-53 → SPEC-54 character-pipeline line. After
  Phases 1–4 landed, the audit's remaining items are either rejected-by-prior-decision (body-section
  validation) or already-resolved (anti-flattening), and no further major character-system audit is
  anticipated.
- Single-spec deliverable: `specs/IMPLEMENTATION-ORDER.md` is intentionally not created (one spec; the
  four phases are independently landable in any order, though Phase 1 → Phase 2 → Phase 3 → Phase 4 is
  the natural high-to-low severity sequence).

## Outcome

Completed: 2026-05-20

SPEC-54 is complete. The third-iteration character-pipeline fixes landed across four archived tickets:
conditional batch lineage enforcement for NCPs, frontmatter integrity for `character-proposals/` NCP/NCB
records, additive NCP/NCB exposure through `get_record_schema`, and fixture/prose fidelity cleanup for
NCB/CHAR proposal terminology. The intentionally rejected body-section validation and deterministic
anti-flattening recommendations remain out of scope per the SPEC-52/SPEC-53 decision record.

Final verification:

- `npm test` from `tools/validators` passed in the Phase 1, Phase 2, and Phase 4 ticket runs; the final
  Phase 4 run reported 741 passing checks after rebuilding `tools/validators/dist/`.
- `npm test --prefix tools/world-mcp` passed in the Phase 3 ticket run, reporting 418 passing checks.
- `cd tools/world-mcp && npm test` passed in the Phase 4 ticket run, reporting 418 passing checks after
  rebuilding `tools/world-mcp/dist/`.
- Phase-specific grep/manual-review proofs confirmed the public schema-discovery docs and Phase 15
  body/acceptance-test terminology matched the landed contract.
