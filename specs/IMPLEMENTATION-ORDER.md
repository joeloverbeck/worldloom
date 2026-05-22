# Implementation Order

Specs derived from the triage of `archive/reports/world-system-consolidation-second-iteration.md`
(see `docs/triage/2026-05-22-world-system-consolidation-second-iteration-triage.md`).

## Active specs

| Order | Spec | Scope | Depends on | Risk |
|---|---|---|---|---|
| 1 | `SPEC-69-index-disk-consistency-coverage-extension.md` | Extend the existing `index_disk_consistency` validator to `characters/`, `diegetic-artifacts/` | none | low — single validator file, additive |

## Completed specs

| Spec | Scope | Completed |
|---|---|---|
| `archive/specs/SPEC-68-diegetic-artifact-claim-map-schema-hardening.md` | Typed DA `claim_map.items`, the loose DA frontmatter objects, and `if/then` anti-laundering rules | 2026-05-22 |
| `archive/specs/SPEC-70-char-stchar-semantic-preservation.md` | `CHAR -> STCHAR` semantic-preservation contract, `source_operational_fact_map`, `stchar_source_fact_coverage`, STCHAR operational-home subsections, and §16a capabilities line | 2026-05-22 |

## Sequencing notes

- **The remaining active spec is SPEC-69.** It touches
  `tools/validators/src/structural/index-disk-consistency.ts`.
- SPEC-69 derives from the `world-system-consolidation-second-iteration` triage
  (`docs/triage/2026-05-22-world-system-consolidation-second-iteration-triage.md`).
- SPEC-68 and SPEC-70 are complete and archived.
- SPEC-69 ships entirely in `tools/validators`.
