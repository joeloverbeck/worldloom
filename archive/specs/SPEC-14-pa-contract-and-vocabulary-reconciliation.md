<!-- spec-drafting-rules.md not present; using default structure + Deliverables + Migration + Risks & Open Questions. -->

# SPEC-14: PA Contract & Vocabulary Reconciliation

**Phase**: Phase 2 prerequisite — lands before SPEC-06 skill rewrites can satisfy their acceptance criterion ("every emitted record passes `record_schema_compliance`"); does not gate SPEC-06's pre-acceptance work
**Depends on**: SPEC-01 (world index), SPEC-02 (MCP retrieval surface — host of the new `get_canonical_vocabulary` tool), archived SPEC-03 (patch engine — amended by this spec), archived SPEC-04 (validator framework — amended by this spec), SPEC-13 (atomic-source storage — frontmatter-bearing hybrid records)
**Blocks**: SPEC-06 Phase 2 acceptance (canon-addition's engine-emitted PAs must pass the validator end-to-end); SPEC-08 animalia structural-fail resolution (the bulk fix targets the SPEC-14 contract, not the legacy three-way drift)
**Status (2026-04-25)**: COMPLETED

**Supersedes**:
- archived SPEC-03 (`tools/patch-engine/`) §Deliverables row "`append_adjudication_record`" payload shape (field `id` → `pa_id`; `verdict` constrained to canonical enum; `originating_skill` retained as optional schema field; OQ-allocation pre-flight added)
- archived SPEC-03 §Deliverables row "`append_touched_by_cf`" semantics (now bidirectional fail-fast: rejects unless target CF lists the section's file_class in `required_world_updates`)
- archived SPEC-04 (`tools/validators/`) §Deliverables row "`record_schema_compliance`" adjudication parsing (now reads YAML frontmatter via `frontmatterFor` instead of the retired `parseDiscoveryBlock` body-scan; the legacy `adjudication_discovery_fields` validator is removed)
- archived SPEC-04 §Deliverables row "`rule7_mystery_reserve_preservation`" enum (now status-coupled: `forbidden` → `none`; `active`/`passive` → `low`/`medium`/`high`; cross-field rule)
- archived SPEC-04 §Deliverables row "`rule2_no_pure_cosmetics`" canonical-domain enum (adds `geography` and `technology`)

The archived SPEC-03 and SPEC-04 documents are not edited in place; this archived spec records the superseding SPEC-14 contract.

## Problem Statement

Three layers disagree about the canonical shape of an adjudication record (`adjudications/PA-NNNN-*.md`), causing the dominant grandfathering bucket on animalia (140 of 224 findings; 62.5%) and guaranteeing reproduction of the same drift on every adjudication produced by the SPEC-06 pipeline as written:

| Layer | What it expects |
|---|---|
| Patch engine (`tools/patch-engine/src/ops/append-adjudication-record.ts`) | `---\n{YAML frontmatter}\n---\n{body_markdown}`; field `id`; free-form `verdict` |
| Historical validator schema (`tools/validators/src/schemas/adjudication-discovery.schema.json`) | Plain markdown body with `## Discovery` heading + bullet list; field `pa_id`; enum `verdict` (UPPERCASE). Replaced by `adjudication-frontmatter.schema.json` in `SPEC14PAVOC-001`. |
| Existing animalia PA files | 15 of 17 have neither; 2 have `## Discovery` with bold-emphasized non-canonical field names |

Beyond the PA-shape drift, three structural gaps drive the remaining bulk:

- **Bidirectional CF↔SEC consistency** is workflow-fragile (45 GF-0010 findings). `append_touched_by_cf` updates only the section side; nothing forces the CF's `required_world_updates` to include the section's file_class.
- **Canonical vocabulary lives in code only** (17 GF-0006 + 8 GF-0008 findings). Skills emit candidate domain values (`history`/`memory`/`geography`) and mystery `future_resolution_safety` values (`zero`/`medium-low`/`LOW`/`very`) without any way to query the validator's enum at reasoning time.
- **The mandatory world concern `geography` is missing from the canonical domain enum** (1 GF-0006 finding) — a real FOUNDATIONS gap, since `geography` is one of the 13 mandatory world concerns per `docs/FOUNDATIONS.md` §Mandatory World Files but not in Rule 2's domain list. Follow-up reassessment also found `technology` missing even though FOUNDATIONS lists `technology` as an ontology category and `Magic or Tech Systems` as a mandatory concern; no current animalia GF-0006 finding used `technology`, but the omission would reject valid future technology-domain CFs.
- **Mystery `future_resolution_safety` enum** (`low|medium|high`) collapses the load-bearing semantic distinction between forbidden mysteries and rare-but-allowed mysteries (8 GF-0008 findings). M-5's whole architecture depends on `forbidden`-status mysteries being categorically different from low-resolution-safety mysteries.

**Source context**: `docs/triage/2026-04-25-spec04-grandfathering-triage.md` — full finding distribution, dismissed alternatives, decision audit (A–H).

## Approach

Reconcile the three-layer drift into a single PA contract; close the structural gaps with engine fail-fast, validator cross-field rules, and a vocabulary MCP surface. Five workstreams:

1. **PA frontmatter contract.** PA files become hybrid records analogous to characters and diegetic artifacts: `---\n{YAML frontmatter}\n---\n# PA-NNNN — Adjudication Record\n\n{free-form analysis prose}`. The validator reads frontmatter; the prose body is unconstrained.

2. **Engine API alignment.** `append_adjudication_record` payload's `adjudication_frontmatter` interface renames `id` → `pa_id`, constrains `verdict` to the schema enum, retains `originating_skill` (added to schema as optional). `append_adjudication_record` accepts an optional `oq_allocations` pre-flight payload that creates new OQ records as part of the same plan when the PA's `open_questions_touched[]` cites IDs not yet in `_source/open-questions/`.

3. **Bidirectional `append_touched_by_cf`.** The op fails fast (`code: required_world_updates_mismatch`) unless the target CF's `required_world_updates` already includes the section's file_class. Skills that need to extend a CF's surface must include an `update_record_field` op alongside, in the same plan; the engine processes ops in declared order so the CF extension lands before the section citation.

4. **Validator updates.** `record_schema_compliance` adjudication path switches from `parseDiscoveryBlock` to `frontmatterFor` (mirroring characters/DAs). `rule7_mystery_reserve_preservation` adds a status-coupled cross-field rule. `rule2_no_pure_cosmetics`'s canonical-domain enum adds `geography` and `technology`. `adjudication_discovery_fields` validator retires (its purpose is subsumed by frontmatter-based `record_schema_compliance`).

5. **Canonical-vocabulary MCP tool.** New `mcp__worldloom__get_canonical_vocabulary(class)` returns the canonical enum lists at runtime. Backed by a shared enum module (`tools/_shared/canonical-vocabularies/` — new package or in-place under `tools/world-index/src/public/`) imported by both validator and MCP server. Eliminates the validator-as-sole-source pattern.

## Deliverables

### Validator (`tools/validators/`)

| Path | Change |
|---|---|
| `src/schemas/adjudication-discovery.schema.json` | Renamed → `adjudication-frontmatter.schema.json`. Schema unchanged in field set (still requires `pa_id`, `date`, `verdict`, `mystery_reserve_touched`, `invariants_touched`, `cf_records_touched`, `open_questions_touched`, `change_id`); adds `originating_skill` (optional string); title comment updated to *"Parsed YAML frontmatter for `worlds/<slug>/adjudications/PA-NNNN-*.md`; consistent with `character-frontmatter` and `diegetic-artifact-frontmatter`."* |
| `src/structural/record-schema-compliance.ts` | Adjudication path replaces `parseDiscoveryBlock(file.content)` call with `frontmatterFor(file.content)` + `parseYamlSurface`. Mirrors the existing characters / diegetic-artifacts handling. Removes the `## Discovery` body-scan code path. |
| `src/structural/utils.ts` | `RECORD_TYPE_TO_SCHEMA` entry `adjudication_record` → `adjudication-frontmatter` (was `adjudication-discovery`). |
| `src/_helpers/index-access.ts` | `parsedBodyFor` adjudication branch switches to `parseYamlRecord(frontmatterFor(row.body) ?? "")` (mirrors character_record / diegetic_artifact_record). The `parseDiscoveryBlock` import is removed. |
| `src/structural/adjudication-discovery-fields.ts` | **Retired.** Its purpose (catching non-canonical Discovery field names) is subsumed by `record_schema_compliance` against the new frontmatter schema (`additionalProperties: false`). Removed from the public validator registry. |
| `tools/world-index/src/public/canonical-vocabularies.ts` | Adds `geography` and `technology` to `CANONICAL_DOMAINS`. This package-level public module is consumed by `tools/validators/` and `tools/world-mcp/`. |
| `src/rules/rule7-mystery-reserve-preservation.ts` | Replaces flat `VALID_FUTURE_RESOLUTION_SAFETY` set with a status-coupled rule: if `parsed.status === "forbidden"`, allowed value is `none`; otherwise allowed values are `low \| medium \| high`. Emits `rule7.future_resolution_safety_status_mismatch` when the coupling is violated. |
| `src/schemas/mystery-reserve.schema.json` | `future_resolution_safety` constraint stays `string minLength: 1` (the enum is enforced by `rule7_mystery_reserve_preservation`, not by the JSON Schema, since the valid set depends on `status`). No change — this is documentation that the constraint is intentional. |

### Patch engine (`tools/patch-engine/`)

| Path | Change |
|---|---|
| `src/ops/append-adjudication-record.ts` | `AdjudicationFrontmatter` interface field `id` → `pa_id`; `verdict` typed as union of `"ACCEPT" \| "ACCEPT_WITH_REQUIRED_UPDATES" \| "ACCEPT_AS_LOCAL_EXCEPTION" \| "ACCEPT_AS_CONTESTED_BELIEF" \| "REVISE_AND_RESUBMIT" \| "REJECT"`; `originating_skill` retained. The serialized YAML frontmatter is now consumable by the validator's `record_schema_compliance` end-to-end. |
| `src/ops/append-touched-by-cf.ts` | Adds bidirectional check: looks up target CF in the world index; if `required_world_updates` does not include the section's `file_class`, throws `PatchEngineOpError` with `code: required_world_updates_mismatch` (new error code added to the union in `src/ops/shared.ts`). Skills resolve by including an `update_record_field` op for `required_world_updates` ahead of the `append_touched_by_cf` in the plan. |
| `src/ops/append-extension.ts` | Applies the same bidirectional check before section-target extensions auto-add their `originating_cf` to `touched_by_cf[]`, preventing a bypass around `append_touched_by_cf`. |
| `src/ops/shared.ts` | Adds `required_world_updates_mismatch` to `PatchEngineOpErrorCode`. |
| `src/envelope/schema.ts` | Updated `AdjudicationFrontmatter` re-export reflects the new field shape. |
| `tests/ops/append-adjudication-record.test.ts` | Test payload updated to canonical shape (`pa_id`, UPPERCASE verdict). Runtime rejection covers non-canonical verdicts. |
| `tests/ops/append-touched-by-cf.test.ts` | New test coverage: rejects when target CF lacks the section's file_class; accepts when CF lists it; same-plan `update_record_field` + `append_touched_by_cf` resolves the case. |

### MCP retrieval surface (`tools/world-mcp/`)

| Path | Change |
|---|---|
| `src/tools/get-canonical-vocabulary.ts` | **New** tool. Signature: `get_canonical_vocabulary({ class: "domain" \| "verdict" \| "mystery_resolution_safety" \| "mystery_status" })`. Returns `{ canonical_values: string[], coupling?: { field: string, rule: string } }`. The `coupling` field is populated for `mystery_resolution_safety` to surface the status-coupled rule. |
| `src/server.ts` | Registers the new tool under `mcp__worldloom__get_canonical_vocabulary`. |
| `tests/tools/get-canonical-vocabulary.test.ts` | New test suite. |

### Shared canonical-vocabulary source

| Path | Change |
|---|---|
| `tools/_shared/canonical-vocabularies/` (or under `tools/world-index/src/public/`, depending on package-boundary preference at implementation time) | **New module** exporting `CANONICAL_DOMAINS`, `VERDICT_ENUM`, `MYSTERY_STATUS_ENUM`, `mysteryResolutionSafetyForStatus(status)`. Single source consumed by `tools/validators/` and `tools/world-mcp/`. The implementation may colocate this with `tools/world-index/src/public/types.ts` (already a shared-types boundary per archived SPEC-03 §Record-type TypeScript interfaces) to avoid creating a new package. The implementing ticket selects the placement; both options preserve single-source-of-truth. |

### Schema/test fixtures

| Path | Change |
|---|---|
| `tools/validators/tests/structural/record-schema-compliance.test.ts` | Updated test fixtures use frontmatter-form PAs; old `## Discovery`-block fixtures removed. |
| `tools/validators/tests/integration/spec14-engine-roundtrip.test.ts` | Acceptance test asserts `record_schema_compliance` passes on engine-emitted PAs. |

### Collateral amendments (Tier 1 of triage work plan)

| Path | Change |
|---|---|
| `specs/SPEC-06-skill-rewrite-patterns.md` | Skills consume canonical-vocab MCP at reasoning time (replaces "canonical domain known to skill prose" assumption). canon-addition emits validator-conformant PAs via engine; OQ allocation joins the patch plan. New acceptance criterion: every record emitted by a rewritten skill passes `record_schema_compliance` end-to-end. |
| `archive/specs/SPEC-08-migration-and-phasing.md` | Animalia structural-fail resolution path uses SPEC-14 contract; bulk migration target is zero grandfathering entries post-Tier 3 (was: residual structural fails grandfathered indefinitely). |
| `docs/FOUNDATIONS.md` | Rule 2 list adds `geography`. Mystery Reserve definition (§5) adds note: *"`future_resolution_safety` is coupled to `status`: `forbidden`-status mysteries take `none`; `active`/`passive` take `low`/`medium`/`high`."* |
| `specs/IMPLEMENTATION-ORDER.md` | SPEC-14 inserted in dependency chain after SPEC-13, before SPEC-06 Phase 2; collateral amendments to SPEC-06/08 noted. |

### Tickets decomposed from this spec (Tier 2 of triage work plan)

| Ticket | Scope |
|---|---|
| `archive/tickets/SPEC14PAVOC-001.md` | Validator framework update (adjudication frontmatter parser; status-coupled mystery rule; `geography` domain; retire `adjudication_discovery_fields`) |
| `archive/tickets/SPEC14PAVOC-002.md` | Patch engine update (`append_adjudication_record` field rename + verdict enum; bidirectional `append_touched_by_cf`; OQ-allocation pre-flight) |
| `archive/tickets/SPEC14PAVOC-003.md` | Canonical-vocabulary MCP tool + shared-enum-module refactor |

### Migration tickets (Tier 3 of triage work plan)

| Ticket | Scope |
|---|---|
| `archive/tickets/SPEC14PAVOC-004.md` | Animalia PA migration (rewrite 17 PAs to frontmatter form; OQ reconciliation + new OQ allocations; PA-0009/PA-0014 Synthesis-block move) |
| `archive/tickets/SPEC14PAVOC-005.md` | Animalia CF cleanup (domain re-tags `history`/`memory`→`memory_and_myth`; mystery enum normalizations to status-coupled values; `required_world_updates` extensions for the 45 GF-0010 fixes) |
| `archive/tickets/SPEC14PAVOC-006.md` | Animalia one-off fixes (CHAR-0002 `major_local_pressures` type fix; DA-0002 frontmatter cleanup; M-5 `disallowed_cheap_answers`; CF-0003 modification_history retrofit; CF-0020 dangling reference resolution) |
| `archive/tickets/SPEC14PAVOC-007.md` | SPEC-06 acceptance handoff for canon-addition validator-pass proof; archived as a downstream skill-rewrite acceptance boundary rather than active SPEC-14 implementation work |
| `archive/tickets/SPEC14PAVOC-008.md` | Animalia final grandfathering closure (adds `institutions` + `everyday_life` to the canonical-domain enum, re-tags CF-0038 residual domains, retrofits CHAR-0001/CHAR-0002 `continuity_checked_with`, and archives the now-empty grandfathering policy) |

## FOUNDATIONS Alignment

| Principle | Stance | Rationale |
|---|---|---|
| §Mandatory World Files / Ontology Categories | aligns | Adding `geography` and `technology` to Rule 2's canonical domain list closes the gap between Rule 2 and FOUNDATIONS (`geography` is one of the 13 mandatory concerns; `technology` appears in the ontology categories and in the Magic or Tech Systems concern). |
| §Mystery Reserve (§5) | aligns | Status-coupled `future_resolution_safety` formalizes the load-bearing distinction between forbidden mysteries (M-5 architecture) and rare-but-allowed mysteries (M-15-style). FOUNDATIONS §5's "whether future canon may resolve it" is now structurally enforced. |
| Rule 2 (No Pure Cosmetics) | aligns | Canonical-domain enum becomes queryable by skills via MCP; reasoning-time validation eliminates a class of post-write fails. |
| Rule 6 (No Silent Retcons) | aligns | Engine fail-fast on `append_touched_by_cf` makes bidirectional CF↔SEC integrity structurally enforced rather than post-write-validator-detected. |
| Rule 7 (Preserve Mystery Deliberately) | aligns | Status-coupled rule enforces the mystery-classification discipline at the field level; eliminates ambiguous "low" use on forbidden mysteries. |
| §Canonical Storage Layer | aligns | Adjudications join characters and diegetic artifacts as frontmatter-bearing hybrid records; one consistent shape for the three hybrid types simplifies the storage layer's mental model. |
| §Change Control Policy | aligns | Engine-validated bidirectional pointers make "downstream files updated" checkable at submit-time, not after. |

## Migration

The animalia bulk fix is decomposed into completed Tier 3 tickets `SPEC14PAVOC-004` through `SPEC14PAVOC-006`, plus final closure ticket `SPEC14PAVOC-008`. `SPEC14PAVOC-007` is archived as the SPEC-06 canon-addition skill acceptance handoff after the zero-finding baseline, not as remaining SPEC-14 implementation work. Migration sequence:

1. Land Tier 2 (validator + engine + MCP). Engine and validator now agree on the contract, but no migration of legacy data has happened. Animalia's existing grandfathering remains in effect (`info`-level findings unchanged).
2. Land `SPEC14PAVOC-004` (PA migration). Rewrites 17 PAs to frontmatter form; OQ reconciliation (matches existing 60 OQs where possible; allocates new OQ records via patch engine for unmatched topic strings; total new OQ allocations expected ~10–30 depending on overlap). Closes ~136 findings (GF-0004 PA portion) + 7 findings (GF-0001 — PA-0009/PA-0014 Synthesis-block move).
3. Land `SPEC14PAVOC-005` (CF cleanup). Closes 45 (GF-0010) + the history/memory/geography subset of GF-0006 + 8 (GF-0008) findings; residual CF-0036/CF-0038 vocabulary findings are deferred to `SPEC14PAVOC-008`.
4. Land `SPEC14PAVOC-006` (one-off fixes). Closes 6 findings (GF-0002, GF-0003, GF-0005, GF-0007, GF-0009, and the non-character-frontmatter one-off subset).
5. Land `SPEC14PAVOC-008` (final grandfathering closure). Closes the final GF-0004 character `continuity_checked_with` findings and the final GF-0006 domain-vocabulary findings, then archives `worlds/animalia/audits/validation-grandfathering.yaml` as audit-trail evidence.
6. Run `world-validate animalia` — expect zero findings.
7. Hand off `SPEC14PAVOC-007` to SPEC-06 skill-rewrite acceptance: verify SPEC-06's new acceptance criterion end-to-end on a fresh canon-addition run when that skill rewrite is exercised.

OQ allocation mid-migration: when `SPEC14PAVOC-004` reconciles topic-strings to IDs, each new OQ allocation goes through the patch engine (`create_oq_record` op) so the resulting OQ records are properly indexed and back-referenced from PAs.

## Verification

- **Engine-validator end-to-end**: a fresh canon-addition-shaped plan that emits a PA via `append_adjudication_record` produces a file that passes `record_schema_compliance` with zero findings. Verified by `tools/validators/tests/integration/spec14-engine-roundtrip.test.ts` cross-package fixture.
- **Bidirectional section-to-CF writes**: tests cover `append_touched_by_cf` and section-target `append_extension` against CFs whose `required_world_updates` lack the section's file_class → engine rejects with `required_world_updates_mismatch`. Same-plan overlays with `update_record_field` or `create_cf_record` ahead of the section write succeed.
- **Status-coupled mystery rule**: validator unit test asserts `forbidden`-status + `low` → fails; `forbidden`-status + `none` → passes; `active`-status + `none` → fails; `active`-status + `medium` → passes.
- **`geography` / `technology` domains**: validator unit test asserts both are accepted in `domains_affected`; existing canonical domains all still pass.
- **Canonical-vocab MCP tool**: integration test invokes `get_canonical_vocabulary({class: "domain"})` and asserts the returned list matches `CANONICAL_DOMAINS` exactly; same for verdict, mystery status, mystery resolution safety (the latter returns the coupling rule).
- **Animalia post-migration**: `world-validate animalia` exits with zero findings; `worlds/animalia/audits/validation-grandfathering.yaml` either has no `entries` or is removed.
- **SPEC-06 acceptance handoff**: the SPEC-14 contract now gives SPEC-06 a validator-conformant PA/atomic-record surface; the fresh canon-addition acceptance run remains a SPEC-06 skill-rewrite gate via archived `SPEC14PAVOC-007`.

## Out of Scope

- Continuity-audit record (`audits/AU-NNNN-*.md`) shape reconciliation. If a future audit finds drift between `append_audit_record` (mentioned as future work in SPEC-06 line 131) and audit-record validation, follow the same SPEC-14 umbrella pattern with its own spec.
- Proposal record (`proposals/PR-NNNN-*.md`) and character-proposal record shape reconciliation. Proposal cards are not canon and have lighter validation; not in scope here.
- Retroactive retcon of past CF authoring decisions (e.g., re-evaluating whether CF-0027's `geography` domain is the right tag once the enum exists). The triage's decision is to keep authorial intent where the new enum supports it.
- Hook 5 post-apply integration (the `world-validate` step running automatically after every patch-engine apply). Mentioned as future work in SPEC-04; out of scope for SPEC-14.
- Performance optimization of the validator. Adding the `frontmatterFor` adjudication path is a constant-time substitution; no performance regression expected.

## Risks & Open Questions

- **Engine-emitted PA frontmatter ordering**. The patch engine's `serializeStableYaml` uses `sortMapEntries: true`. Frontmatter field order will be alphabetical (`change_id`, `cf_records_touched`, `date`, `invariants_touched`, `mystery_reserve_touched`, `open_questions_touched`, `originating_skill`, `pa_id`, `verdict`). This is mechanically correct but visually less natural than the human-canonical ordering (`pa_id`, `date`, `verdict`, …). Mitigation: accept alphabetical for engine output; the schema doesn't constrain order; readability cost is small. If unacceptable, add a stable canonical-order list to the engine's adjudication serializer (small one-shot code change).
- **OQ-allocation explosion mid-migration.** PA-0002's 4 freeform topic-strings, multiplied across 17 PAs, could yield 30+ new OQ records during `SPEC14PAVOC-004`. Mitigation: the migration ticket's first step is OQ-string-to-existing-OQ matching; only unmatched strings get new allocations. Expected residual: 10–30 new OQ records, manageable size.
- **`adjudication_discovery_fields` validator retirement edge case.** Some existing animalia PAs (PA-0009, PA-0014) have a `## Discovery` block in their body. After `SPEC14PAVOC-004`, those bodies are restructured (Synthesis-block move) and the body content stops being a Discovery block. If migration is partial and some PAs still have `## Discovery` blocks, the retired validator can't catch them. Mitigation: `record_schema_compliance` against the frontmatter schema is the catch-all; if a body still has a `## Discovery` block, it's prose noise (not validated, but not validator-relevant either).
- **`originating_skill` value drift.** The schema accepts `originating_skill` as an unconstrained string. Could drift across different skill names ("canon-addition", "canon_addition", "CanonAddition"). Mitigation: not gated; if drift becomes a problem, add an enum to the schema later. Minor cosmetic concern.
- **Bidirectional `append_touched_by_cf` performance.** Each `append_touched_by_cf` call now requires a CF read from the world index (or pre-apply overlay). Performance impact is small (single record lookup per op); CF records are small atomic YAML files. No expected regression.
- **Vocabulary-MCP availability during skill reasoning.** Skills currently reason without a vocabulary lookup; the new MCP tool is opt-in. SPEC-06 amendment's "consume canonical-vocab MCP at reasoning time" wording leaves room for skills to skip the lookup if they're confident in their emission. Mitigation: rely on validator catch as backstop; the MCP tool is a reasoning-time check, not a write-time gate.

## Outcome

Completed: 2026-04-25.

SPEC-14's engine, validator, MCP vocabulary, FOUNDATIONS, and Animalia grandfathering contracts have landed through the archived `SPEC14PAVOC-*` ticket family:

- `SPEC14PAVOC-001` through `SPEC14PAVOC-003` reconciled adjudication frontmatter validation, patch-engine emission, bidirectional CF/SEC write checks, status-coupled Mystery Reserve validation, and canonical-vocabulary surfacing.
- `SPEC14PAVOC-004` through `SPEC14PAVOC-006` migrated Animalia PA/frontmatter and one-off structural findings.
- `SPEC14PAVOC-008` closed the final Animalia grandfathering findings, added the final mandatory-concern vocabulary entries, and archived the grandfathering policy as historical audit evidence.
- `SPEC14PAVOC-007` is archived as the downstream SPEC-06 canon-addition acceptance handoff rather than remaining active SPEC-14 implementation.

Verification recorded by the completed tickets includes package-level validator, patch-engine, world-index, and world-mcp tests; the `tools/validators/tests/integration/spec14-engine-roundtrip.test.ts` engine-to-validator roundtrip; and Animalia `world-validate` zero-finding proof after the final grandfathering closure.
