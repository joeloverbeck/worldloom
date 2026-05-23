# Implementation Order

**Status:** ACTIVE 2026-05-23

Specs derived from the triage of `reports/stchar-distillation-rework.md`
(see [`docs/triage/2026-05-23-stchar-distillation-rework-triage.md`](../docs/triage/2026-05-23-stchar-distillation-rework-triage.md)).

The prior sprint's `IMPLEMENTATION-ORDER.md` (SPEC-73 single-spec sprint from the character-bridge-consolidation-second-iteration triage) was archived as `archive/specs/IMPLEMENTATION-ORDER-2026-05-23-2.md`.

## Active specs

| Order | Spec | Scope | Depends on | Risk |
|---|---|---|---|---|
| 1 | [`SPEC-75-branch-aware-stchar-supersession.md`](SPEC-75-branch-aware-stchar-supersession.md) | Replaces the page-ordinal-only reachability check in `stchar_supersession_integrity` with branch-ancestry-aware reachability so a branch-local STCHAR regeneration on one branch does not silently force sibling branches to use the regenerated profile. Adds a branch-ancestry traversal primitive available for any future cross-branch validator. | _none_ — SPEC-74 has landed; the §4.4 doc-gate reference to `regeneration_reason_class: durable_branch_transformation` is unconditional. | Medium-high — new traversal primitive, multi-branch test fixtures, strict relaxation of an existing validator. No fixture remediation required (no current red-bunny sibling-branch regeneration). |

## Sequencing notes

- **No re-spec of already-landed work.** SPEC-73 already landed the multi-label `Required because:` parsing and the voice-block-requirement extension to composite packets — those proposals from the source report's §6.12 are not re-specified here (see the companion triage file).
- **No re-introduction of STCHAR hashes.** SPEC-71 removed all four tamper hashes (`profile_hash`, `voice_block_hash`, `page_packet_hash`, `source_char_hash`); the source report's verbatim text references them in §6.3 / §6.5 / §6.12. The hash references stayed out of SPEC-74's adapted proposals and remain out of scope for SPEC-75.

## Out of scope for this sprint

- Schema-structured `story_irrelevant` rationale categories (currently structured via validator inspection of the body inventory rationale field; would be a separate schema-extension proposal).
- Cross-bundle or cross-world STCHAR supersession (STCHAR is per-bundle by FOUNDATIONS §Story Bundles §6.1; cross-bundle is not a defined operation).
- LLM-judgment semantic validators of STCHAR body prose (FOUNDATIONS §Tooling Recommendation rejects prose-only operation; all validators in this sprint are structural).
- Any reintroduction of STCHAR hash fields (SPEC-71 + the schema's `additionalProperties: false` + the `forbidden_stchar_tamper_hash_fields` validator structurally prevent it).

## Completed specs

| Spec | Scope | Completed |
|---|---|---|
| [`archive/specs/SPEC-74-stchar-distillation-boundary-hardening.md`](../archive/specs/SPEC-74-stchar-distillation-boundary-hardening.md) | STCHAR distillation boundary hardening: skill/template wording + `regeneration_reason_class` schema field + `Stable Source Material Inventory` body subsection + 3 new structural validators + page-packet validator extension. Capstone -013 archived as superseded — red-bunny remediation handled manually; synthetic capstone test judged not worth standalone implementation. | 2026-05-23 |

## Outcome

When both specs land, STCHAR profiles structurally cannot carry opening-scene state in operational sections, structurally must inventory stable source material beyond `dramatic_core` for `source_kind: world_char` profiles, structurally must classify every regeneration's lifecycle reason, and structurally must declare and ground page-packet projections against active `PG.state_snapshot.active_records[]` — without any reintroduction of removed hash machinery. Branch-local STCHAR regeneration becomes safe to use without silently mutating sibling branch character authority.
