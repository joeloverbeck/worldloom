# Storylet-pool-authoring skill audit — triage (2026-05-12)

## Source

User-commissioned skill-streamlining audit of `.claude/skills/storylet-pool-authoring/` (SKILL.md + 6 references + 6 templates) following the post-prose-strip overhaul that extracted prose generation from `branching-story-bootstrap` and `branching-story-page-cycle` into `branching-story-page-prose-finalize`. Audit cross-checked sibling skills `branching-story-bootstrap`, `branching-story-page-cycle`, `branching-story-health-audit`, `story-fact-promotion-to-canon` (user-supplied via `--sibling_skill_paths`). The audit's HIGH findings are concentrated in `templates/storylet-record.yaml` worked-example divergence from the live engine validator grammar — a divergence that `branching-story-bootstrap/references/phase-6-storylet-pool-seed.md:72-106` already documented and handed off to this audit by name. The audit report is the conversational deliverable; this triage file persists the action items.

## Decision summary

The skill is structurally sound — the schema-authority arrangement with `branching-story-bootstrap` (bootstrap delegates Phase 6 to this skill; this skill's `templates/storylet-record.yaml` is the SLT schema source-of-truth pipeline-wide) is correctly architected. The user's rework concern about whether storylets produced by bootstrap match those produced by storylet-pool-authoring resolved: the divergence is internal — between the schema-authority template's worked examples and its own predicate-DSL grammar — not between two skills. Six HIGH correctness fixes cluster on `templates/storylet-record.yaml` (STPOOL-002 through STPOOL-005), `SKILL.md` Phase 6 deliverable (STPOOL-006), and the world-bound `templates/tone-theme-tag-dictionary.md` (STPOOL-007). Four MEDIUM duplication/drift fixes (STPOOL-008 through STPOOL-011) reduce maintenance hazards. Two LOW nits bundled as STPOOL-012. Nothing should be deleted wholesale.

## Accepted items (11 tickets)

| Ticket | Audit finding | Severity | Effort | Rationale |
|---|---|---|---|---|
| [STPOOL-002](../../archive/tickets/STPOOL-002-fix-stop-predicate-args-in-storylet-record-examples.md) | F-01 — stop-predicate args drift in storylet-record.yaml examples | HIGH | Small | Completed and archived. The worked examples now use validator-aligned `commitment_class`, `participant`, and `irreversible_cost_imminent` / `cost_axis` stop-policy args; the paired predicate-DSL prompt text now matches the live validator grammar. |
| [STPOOL-003](../../archive/tickets/STPOOL-003-add-realization-target-to-beat-scaffolds.md) | F-02 — `realization_target` missing from beat scaffolds | HIGH | Small | Completed and archived. The main beat scaffold and all three example arcs now include `beat_plan.beats[].realization_target`, and the direct Phase 3 / bootstrap reference prose now matches the validator-required beat field set. |
| [STPOOL-004](../../archive/tickets/STPOOL-004-add-non-empty-interrupt-before-to-examples.md) | F-03 — `interrupt_before` must be non-empty | HIGH | Small | Completed and archived. The main SLT scaffold now states `interrupt_before` must be non-empty, fragile_offer and bounded_question worked examples include populated interrupt-before entries, and predicate-dsl prompt grammar matches validator/bootstrap args for the interrupt predicates used by those examples. |
| [STPOOL-005](../../archive/tickets/STPOOL-005-remove-dangling-beat-functions-reference.md) | F-04 — dangling cross-reference to non-existent file | HIGH | Small | `templates/storylet-record.yaml:189` references `references/beat-functions.md`, which does not exist. Redirect to `templates/arc-archetypes.md` (the de facto beat-function vocabulary source). |
| [STPOOL-006](../../tickets/STPOOL-006-phase-6-rejected-candidates-off-by-5.md) | F-05 — Phase 6 HARD-GATE summary's rejected-candidates list off-by-5 | HIGH | Small | `SKILL.md:304-313` lists 9 of 14 Phase 4 gate-failure categories. `templates/storylet-batch-manifest.md:32-45` correctly lists 14. The user-facing HARD-GATE deliverable silently masks 5 categories of rejection. Numeric drift between HARD-GATE 14-gate block, manifest template's 14 rows, and Phase 6 summary's 9 rows. |
| [STPOOL-007](../../tickets/STPOOL-007-genericize-tone-theme-tag-dictionary.md) | F-06 — tone-theme tag dictionary is world-bound but framed as generic | HIGH | Medium | `templates/tone-theme-tag-dictionary.md` is structured as generic guidance but ≥40 of its tags are bound to one specific world (Marla/Iker mystery-thriller in Basque Country). The skill claims to be invocable against any world; the template will produce misleading guidance for any other world. Recommended remediation: genericize-in-place (keep family headings + descriptions; strip world-bound instances; add per-world dictionary authoring guidance). |
| [STPOOL-008](../../tickets/STPOOL-008-consolidate-valenh-002-paragraph-duplication.md) | F-07 — VALENH-002 backstop paragraph duplicated verbatim | MEDIUM | Small | The same ≥80-word paragraph about `record_schema_compliance`'s VALENH-002 backstop appears at SKILL.md:256 and SKILL.md:268. Consolidate to the Phase 5b inline site; replace the Procedure step with a one-line summary. |
| [STPOOL-009](../../tickets/STPOOL-009-phase-6-inline-parallel-enumerates-manifest.md) | F-08 — Phase 6 inline block parallel-enumerates manifest content | MEDIUM | Medium | `SKILL.md:277-325` re-enumerates the structural shape that `templates/storylet-batch-manifest.md` already owns. STPOOL-006 is the materialized form of this drift hazard. Add explicit alignment markers in both files so future edits trigger lockstep updates. |
| [STPOOL-010](../../tickets/STPOOL-010-final-rule-paraphrases-hardgate.md) | F-09 — Final Rule paraphrases HARD-GATE pass conditions | MEDIUM | Small | `SKILL.md:384-386` paraphrases gates 1+2, gate 7, gate 8, Phase 5 checks, and the user-approval gate. If the HARD-GATE pass conditions evolve, the Final Rule silently drifts. Reframe as a thematic close that cites the HARD-GATE block as authoritative. |
| [STPOOL-011](../../tickets/STPOOL-011-predicate-dsl-phase-7-6-reference-drift.md) | F-10 — predicate-DSL doc names Phase 7.6 as the runtime stop-condition evaluator | MEDIUM | Small | After the prose-strip rework, Phase 7.6 runs Layer 1 only (declaration check); Layer 2/3 (semantic evaluation) move to `branching-story-page-prose-finalize` Phase 4. Update the predicate-DSL reference to reflect the post-rework split. |
| [STPOOL-012](../../tickets/STPOOL-012-janitorial-sweep-low-findings.md) | F-11 + F-12 — vestigial "(NEW)" markers + unqualified cross-skill references | LOW | Small | Drop "NEW gate 14" prefix from gate-14 references at `phase-4-5-canon-safety-checks.md:30` and `governance-and-foundations.md:41`. Add `branching-story-page-cycle/references/` path prefix to `prose-craft-contract.md` references at `templates/storylet-record.yaml:230` and `templates/predicate-dsl.md:243`. Bundled as one sweep. |

## Dismissed items (audit findings NOT actioned)

| Item | Audit finding | Why dismissed |
|---|---|---|
| (none) | — | All 12 audit findings were accepted into tickets per the user's ACCEPT-and-create-tickets disposition at HARD-GATE; no findings reclassified or dropped during ticket allocation. |

## Follow-up considerations

- **Bootstrap reference's resolved Template-divergence note was retired by [STPOOL-013](../../archive/tickets/STPOOL-013-retire-resolved-bootstrap-template-divergence-note.md).** `branching-story-bootstrap/references/phase-6-storylet-pool-seed.md` now remains a validator landmine checklist without describing the corrected STPOOL-002/STPOOL-003/STPOOL-004 template examples as current divergences.
- **Predicate-DSL stop-args drift was completed in [STPOOL-014](../../archive/tickets/STPOOL-014-align-predicate-dsl-stop-args-with-validator.md).** STPOOL-013 reassessment found unrelated stop-predicate args rows in `templates/predicate-dsl.md`; STPOOL-014 aligned them with the live validator and bootstrap landmine table.
- **The bound-world for `tone-theme-tag-dictionary.md` is identifiable but not bound by this triage.** The tags reference a Marla/Iker mystery-thriller set in Basque Country (San Sebastián / Centro / Gros / Irún). If the user wants the existing dictionary preserved as a per-world artifact rather than stripped, the relocation target would be `worlds/<bound-world-slug>/templates/tone-theme-tag-dictionary.md`; STPOOL-007's Assumption Reassessment item 5 names the option but does not commit to it.
- **Cross-skill alignment with bootstrap's SLT inline-authoring landmines.** STPOOL-002/003/004 align with bootstrap's `phase-6-storylet-pool-seed.md:70-106` landmine documentation. If a future ticket touches that bootstrap reference (e.g., to add new landmines as the schema evolves), the storylet-pool-authoring template should be re-audited to confirm continued alignment.

## Implementation order recommendation

**Tier 1 (correctness — do first; partially completed):**

- **STPOOL-002** (stop-predicate args drift) — completed and archived.
- **STPOOL-003** (add realization_target) — completed and archived.
- **STPOOL-005** (dangling beat-functions.md ref) — independent. Trivial.
- **STPOOL-006** (Phase 6 rejected-candidates off-by-5) — independent. Trivial.
- **STPOOL-004** (interrupt_before non-empty) — completed and archived after STPOOL-002 corrected the escalation-to-confrontation example's interrupt predicate.
- **STPOOL-007** (genericize tone-theme dictionary) — independent of STPOOL-002/003/004/005/006. Medium-effort decision required during implementation (genericize-in-place recommended). Run after Tier 1 small fixes settle.

**Tier 2 (clarity — do after Tier 1):**

- **STPOOL-008** (VALENH-002 paragraph dedup) — independent.
- **STPOOL-009** (Phase 6 inline block alignment markers) — depends on STPOOL-006 (the alignment marker rationale uses STPOOL-006's 14-row enumeration alignment as the worked example). Run after STPOOL-006.
- **STPOOL-010** (Final Rule reframe) — independent.
- **STPOOL-011** (predicate-DSL Phase 7.6 drift) — independent.

**Tier 3 (polish — do whenever):**

- **STPOOL-012** (janitorial sweep — F-11 + F-12) — independent. Trivial.

## Total scope

- 11 ticket files at `tickets/STPOOL-002.md` through `tickets/STPOOL-012.md`.
- Files touched across all 11 tickets: 7 unique files inside `.claude/skills/storylet-pool-authoring/` (`SKILL.md`, `references/phase-4-5-canon-safety-checks.md`, `references/governance-and-foundations.md`, `templates/storylet-record.yaml`, `templates/predicate-dsl.md`, `templates/storylet-batch-manifest.md`, `templates/tone-theme-tag-dictionary.md`).
- No engine, validator, hook, or schema changes — every ticket is documentation/template-content scope.
- No git commit at ticket-implementation time; the user reviews diffs and commits per skill discipline.
