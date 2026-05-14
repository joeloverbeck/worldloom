# SCAUD-001: Apply SPEC-24 audit verdicts to story-state-contract.md and skill SKILL.md prescriptions

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — modifies `.claude/skills/_shared-templates/story-state-contract.md`, `.claude/skills/branching-story-bootstrap/SKILL.md`, `.claude/skills/branching-story-turn-cycle/SKILL.md`, `.claude/skills/branching-story-prose-attach/SKILL.md`, `.claude/skills/branching-story-health-audit/SKILL.md`, `.claude/skills/story-promotion-closeout/SKILL.md`, `docs/FOUNDATIONS.md`, `archive/specs/SPEC-24-story-state-contract-property-audit.md`, and dependency wording in `tickets/SCAUD-002-cleanup-red-bunny-drifted-records.md` / `tickets/SCAUD-003-tighten-json-validator-schemas.md`.
**Deps**: SPEC-24

## Problem

At intake, the story-state contract at `.claude/skills/_shared-templates/story-state-contract.md` §4 defined field schemas for only 4 of the 16 story-bundle record classes listed in §3 (`BEL`, `PG`, `SE`, `SLT`). The other 12 classes (`STENT`, `STINT`, `SF`, `OBL`, `CNSQ`, `THR`, `SREL`, `STLOC`, `STOBJ`, `DA`, `BR`, `CHC`) had no canonical shape, and the JSON validator schemas in `tools/validators/src/schemas/story-*.schema.json` were minimal (only `{id, story_id}` required, `additionalProperties: true`) for 13 of 16. The result was silent drift: `branching-story-bootstrap` and `branching-story-turn-cycle` emitted different field sets for the same record class, dead-write fields persisted (`rendered_prose` on PG), and duplicate fields accumulated (`created_at_page` + `introduced_at_page` on OBL). SPEC-24 audited every property of every class against a five-criterion load-bearing rubric and produced verdicts. This ticket applied those verdicts to the contract and to the skill prescriptions that emit affected records.

## Assumption Reassessment (2026-05-14)

1. SPEC-24 now lives at `archive/specs/SPEC-24-story-state-contract-property-audit.md` with full per-class audit verdict tables, the R3 PG reconciliation, and amended §4 YAML schema blocks for all 16 classes. At SCAUD-001 implementation time it lived under `specs/`; the amended schemas were the literal text copied into `story-state-contract.md` §4 (modulo §4 numbering reconciliation per SPEC-24 §Risks).
2. `story-state-contract.md` today carries §4.1 BEL, §4.2 PG, §4.3 SE, §4.4 SLT, §4.4a action_family taxonomy, §4.4b STENT/SREL taxonomies, §4.5 prose receipt. SPEC-24 §Risks flags the numbering collision with proposed §4.5a-§4.5p — this ticket resolves the numbering as: renumber the prose receipt to §4.6, use §4.1 BEL → §4.2 PG → §4.3 SE → §4.4 SLT (+ §4.4a / §4.4b) → §4.5 per-class container with §4.5.1 through §4.5.12 sub-sections for the 12 newly-defined classes (STENT, STINT, SF, OBL, CNSQ, THR, SREL, STLOC, STOBJ, DA, BR, CHC). Already-defined classes (BEL/PG/SE/SLT) keep their §4.1-§4.4 numbering; their re-audit under SPEC-24 produces edits to PG §4.2 (R3 reconciliation) and no edits to BEL/SE/SLT.
3. The shared boundary under audit is `story-state-contract.md` §4 (the canonical record-schema source) AND every SKILL.md that prescribes or reads affected record fields. `docs/FOUNDATIONS.md` §Story Bundles §5b was same-seam because it still described only five schema classes; it now points at all story-bundle record schemas. `docs/MACHINE-FACING-LAYER.md` was inspected and did not document old per-op CHC/PG payload fields.
4. FOUNDATIONS §Story Bundles §5b (Schema-Minimalism) is the motivating principle. The amended contract makes §5b structurally enforceable for the 12 previously-undefined classes and for the PG R3 reconciliation.
5. PG §4.2's hash-payload exclusion list (§4.2a) changes per SPEC-24 R3 reconciliation. Pre-SCAUD-001 PG records retain their original state_hash values (treated as opaque strings). Post-SCAUD-001 PG records use the new payload definition. The `snapshot_replay_equality` validator must tolerate this discontinuity — confirm in implementation that `recursive-reference-closure.ts` and `snapshot_replay_equality.ts` (or equivalents) do not recompute pre-existing PG hashes.
6. Schema-extension blast radius: `story-state-contract.md` is consumed by 7 story-skill SKILL.md files. `commitment-block-authoring` and `story-fact-promotion-to-canon` did not require edits after inspection; their current field dependencies still line up with the amended classes they read. `branching-story-bootstrap`, `branching-story-turn-cycle`, `branching-story-prose-attach`, `branching-story-health-audit`, and `story-promotion-closeout` required same-seam text updates.
7. Rename/remove blast radius: stale operational prescriptions were removed for PG prose paths, CHC action-family shape, SF provenance, and health-audit reads. Broad grep over all `.claude/skills/` still finds legitimate negative guardrails and unrelated fields with the same spelling, so the proof surface was corrected to targeted stale-prescription sweeps plus manual classification rather than a brittle repo-wide zero-hit.
8. Adjacent contradiction surfaced during implementation: `story-promotion-closeout` wanted to add canon-link / rejection marker fields that are not in the amended SF/BEL/STENT/SREL/DA/BR schemas. This ticket resolved the contradiction on the schema-minimal side: canon links, rejection disposition, archive disposition, and deferral notes are ledger/INDEX surfaces unless an existing amended-schema field actually changes. A future contract amendment may promote structured closeout fields if a consumer becomes load-bearing.
9. Adjacent contradiction surfaced: SPEC-24 discovered that `attempt` appears in the `target_or_action_family` enum in `story-choice.schema.json`, but it is structurally an SE `outcome_route` per §6, not an action_family. The live §4.4a taxonomy already did not include `attempt`; this ticket added a clarifying footnote and left validator enum removal to SCAUD-003.
10. Mismatch + correction: contract §4 numbering reconciled per Assumption 2 above; SPEC-24 and SCAUD-003 were truth-updated to the chosen `plan: {plan_hash}` / top-level `prose_plan_path` resolution.

## Architecture Check

1. This is a contract-amendment ticket. The clean approach is verdict-application from SPEC-24 to the contract file, with parallel updates to all SKILL.md files that prescribe affected record shapes. The alternative — applying the audit per-class across many tickets — fragments the single coherent decision into N decisions that can drift again.
2. No backwards-compatibility shims. Dropped fields are removed entirely from the contract. Hook 3 + the patch engine + validator (per SCAUD-003) progressively enforce the new shape. Existing records that carry dropped fields remain on disk per §3 append-only discipline; the validator accepts them via `additionalProperties: true` until SCAUD-003 tightens schemas.

## Verification Layers

1. **Contract conformance** → manual review + scripted check: every class in §3 inventory has a §4.x subsection.
2. **Skill prescription coverage** → targeted greps over current story-skill operational text verify stale PG/CHC/SF/read prescriptions are removed; remaining broad matches are legitimate negative guardrails, unrelated fields, or historical/spec/ticket references.
3. **Plural CHC action-families propagation** → grep `.claude/skills/branching-story-bootstrap/SKILL.md` and `.claude/skills/branching-story-turn-cycle/SKILL.md` for `target_or_action_family:` (singular field with colon); verify zero hits post-amendment. Also verify both Phase 8 prescriptions name `target_or_action_families`.
4. **PG hash-payload spec consistency** → manual review + grep: §4.2a's exclusion list explicitly names `prose_path` and `prose_receipt_path` as excluded and includes `prose_plan_path`; the old nested prose block is not named.
5. **Action-family enum cleanup** → manual review: §4.4a does not list `attempt`; a footnote clarifies that `attempt` is an SE `outcome_route`.

## What to Change

### 1. Rewrite `story-state-contract.md` §4

For each of the 12 previously-undefined classes (`STENT`, `STINT`, `SF`, `OBL`, `CNSQ`, `THR`, `SREL`, `STLOC`, `STOBJ`, `DA`, `BR`, `CHC`), copy the amended YAML schema block from SPEC-24 §4.5a through §4.5o (and §4.5l for DA) into a new §4.5 subsection. Numbering: §4.5.1 STENT, §4.5.2 STINT, §4.5.3 SF, §4.5.4 OBL, §4.5.5 CNSQ, §4.5.6 THR, §4.5.7 SREL, §4.5.8 STLOC, §4.5.9 STOBJ, §4.5.10 DA, §4.5.11 BR, §4.5.12 CHC. Each subsection contains: a one-paragraph purpose statement, the YAML schema block, any taxonomy or enum cross-references.

Renumber the existing §4.5 prose receipt to §4.6.

Update the §4 preamble paragraph to state: "All 16 story-bundle record classes listed in §3 have field schemas defined below. §4.1-§4.4 cover the four classes with closed schemas; §4.5 covers the 12 additional classes; §4.6 covers the prose receipt direct-write artifact."

### 2. Amend §4.2 PG schema per R3 reconciliation

Per SPEC-24 §R3 verdict:
- Remove the `rendered_prose:` nested block (the lines defining `rendered_prose.path` and `rendered_prose.receipt_path`).
- Add three top-level fields: `prose_plan_path: pages-prose-plans/PG-<integer>.md*`, `prose_path: pages-prose/PG-<integer>.md | null`, `prose_receipt_path: pages-prose-receipts/PG-<integer>.yaml | null`.
- (Sub-decision): collapse `plan: {path, plan_hash}` to `plan: {plan_hash}` only — `plan.path` is redundant with the new top-level `prose_plan_path`. Update §4.2a's hash-payload language accordingly.

### 3. Amend §4.2a PG hash-payload exclusion list

Replace the existing "exclude `rendered_prose` entirely" clause with:
- Exclude `state_hash` itself.
- Exclude `prose_path` (mutable publication receipt).
- Exclude `prose_receipt_path` (mutable publication receipt).
- INCLUDE `prose_plan_path` (stable address tied to plan_hash and fork identity).

Add a compatibility note: "Pre-SCAUD-001 PG records retain their original state_hash values, computed against the old `rendered_prose`-bearing payload. The values are read as opaque strings; no re-hashing is performed. Post-SCAUD-001 PG records use the new payload definition. The `snapshot_replay_equality` validator must tolerate this discontinuity."

### 4. Remove `attempt` from §4.4a action_family enum (if present)

The current §4.4a `action_family` taxonomy lists 20 values. Per SPEC-24 §Risks finding, verify whether `attempt` appears (the JSON validator schema enum includes it but the §4.4a contract enum may not). If present, remove it; `attempt` is an SE `outcome_route` per §6, not an action family. Add a footnote: "`attempt` is an SE `outcome_route` per §6, not an action_family. CHC records carrying an action that resolves to `attempt` use the action_family describing the attempted action (e.g., `pursue`, `persuade`, `harm`)."

### 5. Update `branching-story-bootstrap/SKILL.md` Phase 8 (CHC prescription)

Current Phase 8 (line 271) prescribes singular `target_or_action_family`. Update to plural `target_or_action_families: [<action_family>]` (non-empty list, §4.4a closed enum). Update the field-set description to enumerate exactly the amended §4.5.12 fields. Remove any reference to dropped CHC properties.

### 6. Update `branching-story-bootstrap/SKILL.md` Phase 6 (PG prescription)

Current Phase 6 (around line 250) prescribes `prose_plan_path` as legacy and `rendered_prose.{path,receipt_path}` as canonical. Per R3 reconciliation, invert: `prose_plan_path`, `prose_path`, `prose_receipt_path` are the canonical top-level fields; the `rendered_prose:` block is removed. Update the prescription accordingly.

### 7. Update `branching-story-turn-cycle/SKILL.md` Phase 8 (CHC prescription)

Same plural-form correction as §5 above for Phase 8 (line 317).

### 8. Update `branching-story-turn-cycle/SKILL.md` Phase 6 (PG prescription)

Same R3 reconciliation as §6 above for Phase 6 (around line 293).

### 9. Update `branching-story-turn-cycle/SKILL.md` Phase 3 (SF prescription, if any)

Phase 3 of turn-cycle creates SF records. Per SPEC-24 §4.5.3 SF amendment, the field set is `{id, story_id, created_at_page, supersedes, statement, derived_from}`. Update Phase 3 to prescribe this shape; remove any reference to `trace_records`, `certainty`, `scope`, `who_knows`, `why_it_matters_at_opening`, or empty-list `derived_from`.

### 10. Update `branching-story-bootstrap/SKILL.md` Phase 2 (SF prescription)

Current Phase 2 prescribes the bootstrap-rich SF shape with `certainty`, `scope`, `who_knows`, `derived_from_cf`, `why_it_matters_at_opening`. Update to the amended §4.5.3 shape: `{id, story_id, created_at_page, supersedes, statement, derived_from}`. The bootstrap-specific mirroring discipline (CF reference) becomes a non-empty `derived_from` list with CF ids.

### 11. Update `branching-story-bootstrap/SKILL.md` Phase 4 (OBL/CNSQ/THR/SREL prescriptions)

Phase 4 creates OBL / CNSQ / THR / SREL records. Update each per SPEC-24 §4.5.4 / §4.5.5 / §4.5.6 / §4.5.7. Remove the duplicate-field pattern (OBL had both `created_at_page` and `introduced_at_page` — only `created_at_page` survives).

### 12. Update sibling SKILL.md files

- `commitment-block-authoring/SKILL.md` — re-check SLT prescription against amended §4.4. No changes expected; SLT §4.4 is unchanged. Confirm no reference to dropped CHC fields if commitment-block-authoring emits CHC records.
- `branching-story-prose-attach/SKILL.md` — re-check prose receipt §4.6 (renumbered from §4.5). Update any §-reference if section number changes. Also confirm prose-attach writes `prose_path` and `prose_receipt_path` (the new canonical top-level fields) on the PG record per R3 reconciliation.
- `branching-story-health-audit/SKILL.md` — re-check structural-replay assumptions about field set. The `snapshot_replay_equality` check operates on the PG canonical payload; confirm the audit understands the new payload exclusion list.
- `story-fact-promotion-to-canon/SKILL.md` — re-check claim-source field expectations. The promotion source can be `SF | BEL | DA | STENT`; confirm the amended schemas for these classes preserve the fields the promotion flow reads.
- `story-promotion-closeout/SKILL.md` — re-check supersession-marker field expectations. The closeout flow writes supersession records on story-local classes; confirm the supersedes-field semantics in the amended schemas.

### 13. Update `docs/MACHINE-FACING-LAYER.md`

If this doc documents `describe_envelope_schema` per-op shapes against the old contract (e.g., naming dropped CHC fields in `create_chc_record` op documentation), update to reflect the amended shapes.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify §4 sections; §4.2 R3 reconciliation; §4.2a hash-payload; §4.4a enum cleanup; renumber §4.5 prose receipt to §4.6; add §4.5.1-§4.5.12 per-class schemas)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify Phase 2 SF; Phase 4 OBL/CNSQ/THR/SREL; Phase 6 PG; Phase 8 CHC; Output table column updates)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify Phase 3 SF/OBL/CNSQ/THR/SREL; Phase 6 PG; Phase 8 CHC; Output table column updates)
- `.claude/skills/commitment-block-authoring/SKILL.md` (re-check; modify if needed)
- `.claude/skills/branching-story-prose-attach/SKILL.md` (re-check §-references; confirm receipt-write shape)
- `.claude/skills/branching-story-health-audit/SKILL.md` (re-check replay-equality understanding)
- `.claude/skills/story-fact-promotion-to-canon/SKILL.md` (re-check claim-source field reads)
- `.claude/skills/story-promotion-closeout/SKILL.md` (modify supersession-marker semantics so non-schema closeout metadata stays in ledger/INDEX surfaces)
- `docs/FOUNDATIONS.md` (modify §Story Bundles §5b to point at all story-bundle record schemas, not only the five original schemas)
- `archive/specs/SPEC-24-story-state-contract-property-audit.md` (modified SCAUD-001 status, numbering, proof, and `plan.path` resolution; archived after SPEC-24 completion)
- `tickets/SCAUD-002-cleanup-red-bunny-drifted-records.md` (modify dependent PG-3 shape to match collapsed `plan`)
- `tickets/SCAUD-003-tighten-json-validator-schemas.md` (modify dependent schema guidance to treat collapsed `plan.path` as resolved)
- `docs/MACHINE-FACING-LAYER.md` (inspected; no old per-op shape wording found)

## Out of Scope

- Tightening JSON schemas under `tools/validators/src/schemas/` (SCAUD-003, deferred).
- Migrating any user-side `worlds/` bundles other than red-bunny (SCAUD-002 covers red-bunny only).
- Reformatting `story-state-contract.md` for general readability — surgical §4 amendments only.
- Introducing new record classes — the audit covers the 16 currently in §3.

## Acceptance Criteria

### Tests That Must Pass

1. Manual review: every class in contract §3 inventory has a §4.x subsection.
2. Targeted stale-prescription sweeps return zero hits in the current emitting/reading skills:
   - `grep -rE 'target_or_action_family:' .claude/skills/branching-story-bootstrap/ .claude/skills/branching-story-turn-cycle/`
   - `grep -rE 'rendered_prose|derived_from_cf|trace_records|introduced_at_page|open_at_opening|why_it_matters_at_opening|who_knows' .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md`
3. `grep -rE 'target_or_action_family:' .claude/skills/branching-story-bootstrap/ .claude/skills/branching-story-turn-cycle/` returns zero hits (the singular form is no longer prescribed; plural `target_or_action_families:` is the canonical form).
4. Manual review: §4.2a hash-payload language explicitly names `prose_path` and `prose_receipt_path` as excluded and `prose_plan_path` as included; the old nested prose-block exclusion language is removed.
5. Manual review: SPEC-24 §Risks "attempt enum bug" addressed — `attempt` is removed from §4.4a if it was present, or a §4.4a footnote clarifies.

### Invariants

1. The contract is now the single source of truth for record shape. Any new story bundle authored after this ticket lands must conform.
2. Schema-Minimalism Doctrine (contract §2) holds for every newly-promoted field: each one cites a load-bearing consumer per SPEC-24's audit verdict.
3. Append-only discipline (contract §3) is preserved: this ticket modifies no atomic `_source/*.yaml` record; only the contract and skill prescription files are edited.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.` This ticket modifies contract and SKILL.md prose. Validator behavior tests are added in SCAUD-003 when the JSON schemas are tightened.

### Commands

1. `grep -rE 'target_or_action_family:' .claude/skills/branching-story-bootstrap/ .claude/skills/branching-story-turn-cycle/` — singular-form sweep; must return zero hits.
2. `grep -rE 'rendered_prose|derived_from_cf|trace_records|introduced_at_page|open_at_opening|why_it_matters_at_opening|who_knows' .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md` — stale PG/SF/debt-read sweep; must return zero hits.
3. `grep -nE '^#### 4\\.5\\.(1|2|3|4|5|6|7|8|9|10|11|12) ' .claude/skills/_shared-templates/story-state-contract.md` — verify all 12 added class subsections exist.
4. `grep -n '### 4.6 Prose receipt' .claude/skills/_shared-templates/story-state-contract.md` — verify the receipt renumbering.
5. `git diff --check` — whitespace/patch hygiene.
6. The narrower commands above are sufficient because this ticket is documentation/skill-contract only. Validator-side behavior tests fire in SCAUD-003; data-side cleanup proof fires in SCAUD-002.

## Outcome

Implemented. `story-state-contract.md` §4 now defines all 16 story-bundle record classes, applies PG R3 reconciliation (`plan.plan_hash`, top-level `prose_plan_path`, `prose_path`, `prose_receipt_path`), moves the prose receipt to §4.6, and documents hash-continuity tolerance for pre-SCAUD-001 PG records.

Updated bootstrap and turn-cycle prescriptions for SF/PG/CHC field shapes; updated prose-attach §4.6 references; updated health-audit reads for PG prose paths, CHC action-family lists, and mirrored SF `derived_from`; and updated story-promotion-closeout so canon/rejection/archive metadata remains ledger/INDEX-owned unless existing amended-schema fields change.

Also truth-updated `docs/FOUNDATIONS.md`, SPEC-24, and dependent SCAUD-002/SCAUD-003 wording for the chosen schema boundary.

## Verification Result

Passed on 2026-05-14:

1. `grep -nE '^#### 4\\.5\\.(1|2|3|4|5|6|7|8|9|10|11|12) ' .claude/skills/_shared-templates/story-state-contract.md` returned all 12 added subsections:
   - `4.5.1 STENT` through `4.5.12 CHC` at lines 340, 356, 371, 386, 405, 421, 437, 457, 473, 488, 507, and 522.
2. `grep -n '### 4.6 Prose receipt' .claude/skills/_shared-templates/story-state-contract.md` returned line 541.
3. `grep -rE 'target_or_action_family:' .claude/skills/branching-story-bootstrap/ .claude/skills/branching-story-turn-cycle/` returned zero matches (exit 1 expected for no grep hits).
4. `grep -rE 'rendered_prose|derived_from_cf|trace_records|introduced_at_page|open_at_opening|why_it_matters_at_opening|who_knows' .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-turn-cycle/SKILL.md .claude/skills/branching-story-health-audit/SKILL.md` returned zero matches (exit 1 expected for no grep hits).
5. `rg -n "target_or_action_families|prose_plan_path|prose_path|prose_receipt_path" .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-turn-cycle/SKILL.md` confirmed the replacement PG and CHC prescriptions in bootstrap and turn-cycle.
6. `git diff --check` returned clean.

## Deviations

- `docs/MACHINE-FACING-LAYER.md` was inspected but not edited; it does not document old `create_chc_record` / `create_pg_record` per-op property payloads.
- `commitment-block-authoring/SKILL.md` and `story-fact-promotion-to-canon/SKILL.md` were inspected but not edited; no current stale emitted-field prescriptions were found.
- Broad zero-hit grep for every dropped property across all `.claude/skills/` was replaced with targeted stale-prescription proof plus manual classification because legitimate current text still contains same-spelling fields in other schemas or negative guardrails, such as `SLT.exit_options[].likely_effects`, `BEL.confidence` prose, and "no version discriminator" guidance.
