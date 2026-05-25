# Implementation Order

**Status:** COMPLETED 2026-05-23

Specs derived from the triage of `archive/reports/character-bridge-consolidation-second-iteration.md`
(see `docs/triage/2026-05-23-character-bridge-consolidation-second-iteration-triage.md`).

The prior sprint's `IMPLEMENTATION-ORDER.md` (world-system-consolidation-second-iteration triage,
SPEC-68/69/70) was archived as `archive/specs/IMPLEMENTATION-ORDER-2026-05-23.md`.

## Active specs

| Order | Spec | Scope | Depends on | Risk |
|---|---|---|---|---|
| _none_ | _none_ | _none_ | _none_ | _none_ |

## Completed specs

| Spec | Scope | Completed |
|---|---|---|
| [`archive/specs/SPEC-73-page-packet-required-because-label-parsing.md`](SPEC-73-page-packet-required-because-label-parsing.md) | Multi-label parsing of §16a `Required because:` so composite values containing `speaker` / `viewpoint` / `voice_shapes_page` trigger the voice-block requirement; parallel fix for `offstage_causal` exact-match drift; closed-vocabulary warning for unknown labels. Validator-only change; no schema, no record mutation. | 2026-05-23 via `archive/tickets/SPEC73PAGPACREQ-001.md` |

## Sequencing notes

- Single-spec sprint; no inter-spec dependency.
- Migration: `unknown_role_label` warnings should clear before the next character-bridge audit iteration. Voice-block failures on composite packets must be repaired immediately — they indicate the packet was always supposed to carry a voice block under the documented `story-state-contract.md:466` vocabulary.
- The five other proposals from the source report are explicitly **not** in this sprint — see the triage file for the verdict on each (Proposals 2 / 4 rejected as re-proposed deliberately-rejected scope; Proposal 5 already-resolved; Proposal 3 deferred pending a concrete consumer; Proposal 6 folded into SPEC-73's test plan).

## Outcome

Completed 2026-05-23. This implementation-order file covered a single-spec sprint for SPEC-73, which landed through `archive/tickets/SPEC73PAGPACREQ-001.md` and is now archived at `archive/specs/SPEC-73-page-packet-required-because-label-parsing.md`.

Deviations: none to the implementation order. The prior same-date implementation-order archive already exists, so this file is archived with a non-colliding dated filename.

Verification: SPEC-73's validator proof passed (`npm run build`, focused compiled test with 18 tests, final `npm test` with 901 tests from `tools/validators`).
