# Implementation Order

Specs derived from the triage of `archive/reports/world-system-consolidation-second-iteration.md`
(see `docs/triage/2026-05-22-world-system-consolidation-second-iteration-triage.md`).

## Active specs

| Order | Spec | Scope | Depends on | Risk |
|---|---|---|---|---|
| 1 | `SPEC-69-index-disk-consistency-coverage-extension.md` | Extend the existing `index_disk_consistency` validator to `characters/`, `diegetic-artifacts/` | none | low — single validator file, additive |
| 2 | `SPEC-70-char-stchar-semantic-preservation.md` | `CHAR → STCHAR` semantic-preservation contract + `source_operational_fact_map` frontmatter + new `stchar_source_fact_coverage` validator + STCHAR operational-home subsections + §16a capabilities line | none (built atop landed SPEC-56/57/59/63/66) | medium — schema + new validator + skill/contract text; 3 legacy STCHAR migrated warn-until-touched |

## Completed specs

| Spec | Scope | Completed |
|---|---|---|
| `archive/specs/SPEC-68-diegetic-artifact-claim-map-schema-hardening.md` | Typed DA `claim_map.items`, the loose DA frontmatter objects, and `if/then` anti-laundering rules | 2026-05-22 |

## Sequencing notes

- **All active specs are independent and may be implemented in parallel.** SPEC-69 touches
  `tools/validators/src/structural/index-disk-consistency.ts`; SPEC-70 touches the STCHAR seam
  (`story-character-authority.schema.json`, a new `stchar-source-fact-coverage.ts` validator,
  `stchar-body-integrity.ts`, the `story-character-profile` / `branching-story-bootstrap` skills, and the
  shared `story-state-contract.md`). Disjoint surfaces.
- SPEC-69 derives from the `world-system-consolidation-second-iteration` triage
  (`docs/triage/2026-05-22-world-system-consolidation-second-iteration-triage.md`). SPEC-70 derives from
  the triage of `reports/character-bridge-consolidation-first-iteration.md` (2026-05-22), which dropped 2
  of 7 proposed changes as already-landed/refuted (SPEC-59 / SPEC-57 / SPEC-66) and trimmed a third.
- SPEC-68 is complete and archived.
- SPEC-69 ships entirely in `tools/validators`. SPEC-70 also ships primarily in `tools/validators` but
  additionally edits skill/contract markdown and the STCHAR schema; it requires no patch-engine or
  FOUNDATIONS change, and migrates 3 existing STCHAR records warn-until-touched.
