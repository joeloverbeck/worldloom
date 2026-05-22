# Implementation Order

Specs derived from the triage of `archive/reports/world-system-consolidation-second-iteration.md`
(see `docs/triage/2026-05-22-world-system-consolidation-second-iteration-triage.md`).

## Active specs

| Order | Spec | Scope | Depends on | Risk |
|---|---|---|---|---|
| 1 | `specs/SPEC-71-strip-stchar-tamper-hashes.md` | Remove the four Job-B content-tamper hashes (`profile_hash`/`voice_block_hash`/`page_packet_hash`/`source_char_hash`) from schemas, §16a contract, validators, CLI, and 5 skills; add the `forbidden_stchar_tamper_hash_fields` reintroduction guard | none | medium-high (broad surface) |
| 2 | `specs/SPEC-72-plan-hash-advisory.md` | Downgrade `plan_hash` enforcement: Hook 6 → warn, prose-attach `hash_integrity` splits (plan drift = WARN, state_hash tamper = FAIL); `state_hash` chain untouched | none (sequence after SPEC-71 for shared prose-attach/receipt edits) | low-medium |

## Completed specs

| Spec | Scope | Completed |
|---|---|---|
| `archive/specs/SPEC-69-index-disk-consistency-coverage-extension.md` | Extend the existing `index_disk_consistency` validator to `characters/`, `diegetic-artifacts/` | 2026-05-22 |
| `archive/specs/SPEC-68-diegetic-artifact-claim-map-schema-hardening.md` | Typed DA `claim_map.items`, the loose DA frontmatter objects, and `if/then` anti-laundering rules | 2026-05-22 |
| `archive/specs/SPEC-70-char-stchar-semantic-preservation.md` | `CHAR -> STCHAR` semantic-preservation contract, `source_operational_fact_map`, `stchar_source_fact_coverage`, STCHAR operational-home subsections, and §16a capabilities line | 2026-05-22 |

## Sequencing notes

- SPEC-69 derives from the `world-system-consolidation-second-iteration` triage
  (`docs/triage/2026-05-22-world-system-consolidation-second-iteration-triage.md`).
- SPEC-68, SPEC-69, and SPEC-70 are complete and archived.
- SPEC-71 and SPEC-72 derive from the 2026-05-22 hash-integrity audit/determination
  (in-chat brainstorm). They are logically independent — neither blocks the other —
  but both edit `branching-story-prose-attach/SKILL.md` and the prose-receipt
  schema/contract, so implement SPEC-71 before SPEC-72 to avoid edit conflicts.
  SPEC-72 also resolves the live `red-bunny` PG-2 `hash_integrity: FAIL`.
