# Implementation Order

Specs derived from the triage of `archive/reports/world-system-consolidation-second-iteration.md`
(see `docs/triage/2026-05-22-world-system-consolidation-second-iteration-triage.md`).

## Active specs

| Order | Spec | Scope | Depends on | Risk |
|---|---|---|---|---|
| _none_ | _n/a_ | _All specs in this snapshot are complete._ | _n/a_ | _n/a_ |

## Completed specs

| Spec | Scope | Completed |
|---|---|---|
| `archive/specs/SPEC-69-index-disk-consistency-coverage-extension.md` | Extend the existing `index_disk_consistency` validator to `characters/`, `diegetic-artifacts/` | 2026-05-22 |
| `archive/specs/SPEC-68-diegetic-artifact-claim-map-schema-hardening.md` | Typed DA `claim_map.items`, the loose DA frontmatter objects, and `if/then` anti-laundering rules | 2026-05-22 |
| `archive/specs/SPEC-70-char-stchar-semantic-preservation.md` | `CHAR -> STCHAR` semantic-preservation contract, `source_operational_fact_map`, `stchar_source_fact_coverage`, STCHAR operational-home subsections, and §16a capabilities line | 2026-05-22 |
| `archive/specs/SPEC-71-strip-stchar-tamper-hashes.md` | Remove Job-B STCHAR/page-packet content-tamper hashes and add the `forbidden_stchar_tamper_hash_fields` reintroduction guard | 2026-05-23 |
| `archive/specs/SPEC-72-plan-hash-advisory.md` | Downgrade `plan_hash` enforcement: Hook 6 warns, prose-attach `hash_integrity` splits plan drift WARN from state_hash tamper FAIL, and the `state_hash` chain remains untouched | 2026-05-23 |

## Sequencing notes

- SPEC-69 derives from the `world-system-consolidation-second-iteration` triage
  (`docs/triage/2026-05-22-world-system-consolidation-second-iteration-triage.md`).
- SPEC-68, SPEC-69, and SPEC-70 are complete and archived.
- SPEC-71 and SPEC-72 derive from the 2026-05-22 hash-integrity audit/determination
  (in-chat brainstorm). They are logically independent — neither blocks the other —
  but both edit `branching-story-prose-attach/SKILL.md` and the prose-receipt
  schema/contract, so SPEC-71 was implemented before SPEC-72 to avoid edit conflicts.
  SPEC-72 is now archived at `archive/specs/SPEC-72-plan-hash-advisory.md`; the live
  `red-bunny` PG-2 regression was not rerun in this checkout because the story path
  was absent.
