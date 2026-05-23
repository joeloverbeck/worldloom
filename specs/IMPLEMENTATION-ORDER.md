# Implementation Order

**Status:** ACTIVE 2026-05-23

Specs derived from the triage of `reports/stchar-distillation-rework.md`
(see [`docs/triage/2026-05-23-stchar-distillation-rework-triage.md`](../docs/triage/2026-05-23-stchar-distillation-rework-triage.md)).

The prior sprint's `IMPLEMENTATION-ORDER.md` (SPEC-73 single-spec sprint from the character-bridge-consolidation-second-iteration triage) was archived as `archive/specs/IMPLEMENTATION-ORDER-2026-05-23-2.md`.

## Active specs

| Order | Spec | Scope | Depends on | Risk |
|---|---|---|---|---|
| 1 | [`SPEC-74-stchar-distillation-boundary-hardening.md`](SPEC-74-stchar-distillation-boundary-hardening.md) | Closes the two STCHAR distillation gaps: temporal contamination (opening state copied into durable STCHAR) and semantic loss (stable source material outside `dramatic_core` silently filtered out). Skill/template wording hardening + 1 new schema field (`regeneration_reason_class`) + 1 new body subsection (`Stable Source Material Inventory`) + 3 new structural validators (`stchar_temporal_reference_boundary`, `stchar_regeneration_reason_integrity`, `stchar_source_material_inventory_integrity`) + page-packet validator extension + fail-everywhere migration for the 3 active red-bunny STCHAR profiles. | _none_ | Medium — schema field add + 3 new validators + fail-everywhere migration requires one-shot red-bunny remediation pass; coordinate with ENGINESYNC-005 hash-drift blocker before patch-engine-routed mutations. |
| 2 | [`SPEC-75-branch-aware-stchar-supersession.md`](SPEC-75-branch-aware-stchar-supersession.md) | Replaces the page-ordinal-only reachability check in `stchar_supersession_integrity` with branch-ancestry-aware reachability so a branch-local STCHAR regeneration on one branch does not silently force sibling branches to use the regenerated profile. Adds a branch-ancestry traversal primitive available for any future cross-branch validator. | Soft dependency on SPEC-74 §4.7 only for the doc-encouragement gate's reference to `regeneration_reason_class: durable_branch_transformation`; validator changes themselves do not require SPEC-74 to land first. | Medium-high — new traversal primitive, multi-branch test fixtures, strict relaxation of an existing validator. No fixture remediation required (no current red-bunny sibling-branch regeneration). |

## Sequencing notes

- **Independent specs.** SPEC-74 and SPEC-75 operate on orthogonal mechanisms (body-subsection / record-class-id parsing vs. branch-ancestry traversal) and could be implemented in parallel by independent ticket streams.
- **Recommended order: SPEC-74 first.** SPEC-74 closes the user-reported bug (temporal contamination + semantic loss observed on red-bunny); SPEC-75 closes a latent correctness concern that is not yet biting any active bundle (no current sibling-branch STCHAR regeneration exists). Priority follows the user-reported-bug-first principle.
- **SPEC-75 doc-gate references SPEC-74.** SPEC-75 §4.4 adds a doc note that references `regeneration_reason_class: durable_branch_transformation` from SPEC-74 §4.7. If SPEC-75 lands first, defer the §4.4 doc update or stage it conditionally on SPEC-74's landing. The validator-and-primitive changes themselves do not need to wait.
- **No re-spec of already-landed work.** SPEC-73 already landed the multi-label `Required because:` parsing and the voice-block-requirement extension to composite packets — those proposals from the source report's §6.12 are not re-specified here (see the companion triage file).
- **No re-introduction of STCHAR hashes.** SPEC-71 removed all four tamper hashes (`profile_hash`, `voice_block_hash`, `page_packet_hash`, `source_char_hash`); the source report's verbatim text references them in §6.3 / §6.5 / §6.12. The hash references are dropped from SPEC-74's adapted version of those proposals (see SPEC-74 §3 Out of Scope and the companion triage's refuted-by-verification list).
- **Migration coordination.** SPEC-74's fail-everywhere policy on `worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-{1,2,3}.md` requires a one-shot pre-landing remediation pass. Check `MEMORY.md` entry `project_red_bunny_hash_drift.md` (tracked by ENGINESYNC-005) before any engine-routed STCHAR mutation — the patch-engine `file_versions` hash-basis mismatch blocks the first post-bootstrap patch to a bundle. SPEC-74 §5 documents the disposition required.

## Out of scope for this sprint

- Schema-structured `story_irrelevant` rationale categories (currently structured via validator inspection of the body inventory rationale field; would be a separate schema-extension proposal).
- Cross-bundle or cross-world STCHAR supersession (STCHAR is per-bundle by FOUNDATIONS §Story Bundles §6.1; cross-bundle is not a defined operation).
- LLM-judgment semantic validators of STCHAR body prose (FOUNDATIONS §Tooling Recommendation rejects prose-only operation; all validators in this sprint are structural).
- Any reintroduction of STCHAR hash fields (SPEC-71 + the schema's `additionalProperties: false` + the `forbidden_stchar_tamper_hash_fields` validator structurally prevent it).

## Completed specs

| Spec | Scope | Completed |
|---|---|---|
| _none yet_ | | |

## Outcome

When both specs land, STCHAR profiles structurally cannot carry opening-scene state in operational sections, structurally must inventory stable source material beyond `dramatic_core` for `source_kind: world_char` profiles, structurally must classify every regeneration's lifecycle reason, and structurally must declare and ground page-packet projections against active `PG.state_snapshot.active_records[]` — without any reintroduction of removed hash machinery. Branch-local STCHAR regeneration becomes safe to use without silently mutating sibling branch character authority.
