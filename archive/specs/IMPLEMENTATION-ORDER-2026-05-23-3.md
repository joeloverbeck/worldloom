# Implementation Order

**Status:** COMPLETE 2026-05-23

Specs derived from the triage of `archive/reports/stchar-distillation-rework.md`
(see [`docs/triage/2026-05-23-stchar-distillation-rework-triage.md`](../../docs/triage/2026-05-23-stchar-distillation-rework-triage.md)).

The prior sprint's `IMPLEMENTATION-ORDER.md` (SPEC-73 single-spec sprint from the character-bridge-consolidation-second-iteration triage) was archived as `archive/specs/IMPLEMENTATION-ORDER-2026-05-23-2.md`.

## Active specs

| Order | Spec | Scope | Depends on | Risk |
|---|---|---|---|---|
| _none_ | _All specs from this sprint have landed._ | _n/a_ | _n/a_ | _n/a_ |

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
| [`SPEC-75-branch-aware-stchar-supersession.md`](SPEC-75-branch-aware-stchar-supersession.md) | Replaced the page-ordinal-only reachability check in `stchar_supersession_integrity` with direct `branch_path` set-inclusion, so branch-local STCHAR regeneration does not silently force sibling branches to use the regenerated profile. No traversal primitive or ancestry walker was added. Dedicated multi-branch validator tests cover the descendant, sibling, pre-supersession, and failure diagnostics. | 2026-05-23 |
| [`archive/specs/SPEC-74-stchar-distillation-boundary-hardening.md`](SPEC-74-stchar-distillation-boundary-hardening.md) | STCHAR distillation boundary hardening: skill/template wording + `regeneration_reason_class` schema field + `Stable Source Material Inventory` body subsection + 3 new structural validators + page-packet validator extension. Capstone -013 archived as superseded — red-bunny remediation handled manually; synthetic capstone test judged not worth standalone implementation. | 2026-05-23 |

## Outcome

Both specs landed on 2026-05-23. STCHAR profiles structurally cannot carry opening-scene state in operational sections, structurally must inventory stable source material beyond `dramatic_core` for `source_kind: world_char` profiles, structurally must classify every regeneration's lifecycle reason, and structurally must declare and ground page-packet projections against active `PG.state_snapshot.active_records[]` — without any reintroduction of removed hash machinery. Branch-local STCHAR regeneration is safe to use without silently mutating sibling branch character authority.
