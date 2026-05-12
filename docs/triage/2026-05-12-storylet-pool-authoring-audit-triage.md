# Storylet-pool-authoring skill audit — triage (2026-05-12)

## Source

User-commissioned skill-streamlining audit of `.claude/skills/storylet-pool-authoring/` (SKILL.md + 6 references + 6 templates) following the post-prose-strip overhaul that extracted prose generation from `branching-story-bootstrap` and `branching-story-page-cycle` into `branching-story-page-prose-finalize`. Audit cross-checked sibling skills `branching-story-bootstrap`, `branching-story-page-cycle`, `branching-story-health-audit`, `story-fact-promotion-to-canon` (user-supplied via `--sibling_skill_paths`). The audit's HIGH findings are concentrated in `templates/storylet-record.yaml` worked-example divergence from the live engine validator grammar — a divergence that `branching-story-bootstrap/references/phase-6-storylet-pool-seed.md:72-106` already documented and handed off to this audit by name. The audit report is the conversational deliverable; this triage file persists the action items.

## Decision summary

The skill is structurally sound — the schema-authority arrangement with `branching-story-bootstrap` (bootstrap delegates Phase 6 to this skill; this skill's `templates/storylet-record.yaml` is the SLT schema source-of-truth pipeline-wide) is correctly architected. The user's rework concern about whether storylets produced by bootstrap match those produced by storylet-pool-authoring resolved: the divergence is internal — between the schema-authority template's worked examples and its own predicate-DSL grammar — not between two skills. Six HIGH correctness fixes cluster on `templates/storylet-record.yaml` (STPOOL-002 through STPOOL-005), `SKILL.md` Phase 6 deliverable (STPOOL-006), and the formerly world-bound `templates/tone-theme-tag-dictionary.md` (STPOOL-007). Four MEDIUM duplication/drift fixes (STPOOL-008 through STPOOL-011) reduce maintenance hazards. Two LOW nits bundled as STPOOL-012. Nothing should be deleted wholesale.

## Accepted items (11 tickets)

| Ticket | Audit finding | Severity | Effort | Rationale |
|---|---|---|---|---|
| [STPOOL-002](../../archive/tickets/STPOOL-002-fix-stop-predicate-args-in-storylet-record-examples.md) | F-01 — stop-predicate args drift in storylet-record.yaml examples | HIGH | Small | Completed and archived. The worked examples now use validator-aligned `commitment_class`, `participant`, and `irreversible_cost_imminent` / `cost_axis` stop-policy args; the paired predicate-DSL prompt text now matches the live validator grammar. |
| [STPOOL-003](../../archive/tickets/STPOOL-003-add-realization-target-to-beat-scaffolds.md) | F-02 — `realization_target` missing from beat scaffolds | HIGH | Small | Completed and archived. The main beat scaffold and all three example arcs now include `beat_plan.beats[].realization_target`, and the direct Phase 3 / bootstrap reference prose now matches the validator-required beat field set. |
| [STPOOL-004](../../archive/tickets/STPOOL-004-add-non-empty-interrupt-before-to-examples.md) | F-03 — `interrupt_before` must be non-empty | HIGH | Small | Completed and archived. The main SLT scaffold now states `interrupt_before` must be non-empty, fragile_offer and bounded_question worked examples include populated interrupt-before entries, and predicate-dsl prompt grammar matches validator/bootstrap args for the interrupt predicates used by those examples. |
| [STPOOL-005](../../archive/tickets/STPOOL-005-remove-dangling-beat-functions-reference.md) | F-04 — dangling cross-reference to non-existent file | HIGH | Small | `templates/storylet-record.yaml:189` references `references/beat-functions.md`, which does not exist. Redirect to `templates/arc-archetypes.md` (the de facto beat-function vocabulary source). |
| [STPOOL-006](../../archive/tickets/STPOOL-006-phase-6-rejected-candidates-off-by-5.md) | F-05 — Phase 6 HARD-GATE summary's rejected-candidates list off-by-5 | HIGH | Small | Completed and archived. The Phase 6 HARD-GATE `REJECTED CANDIDATES` block now lists all 14 Phase 4 gate-failure categories and matches `templates/storylet-batch-manifest.md:32-45` after manifest-template backtick normalization. |
| [STPOOL-007](../../archive/tickets/STPOOL-007-genericize-tone-theme-tag-dictionary.md) | F-06 — tone-theme tag dictionary is world-bound but framed as generic | HIGH | Medium | Completed and archived. The skill-level `templates/tone-theme-tag-dictionary.md` now keeps generic family guidance, strips world-bound tag instances, and documents per-world dictionary extensions; `templates/predicate-dsl.md` now uses generic location-kind/class examples. |
| [STPOOL-008](../../archive/tickets/STPOOL-008-consolidate-valenh-002-paragraph-duplication.md) | F-07 — VALENH-002 backstop paragraph duplicated verbatim | MEDIUM | Small | Completed and archived. The Procedure step now summarizes Phase 5b while the full VALENH-002 `record_schema_compliance` backstop paragraph remains single-sourced in the inline Phase 5b block. |
| [STPOOL-009](../../archive/tickets/STPOOL-009-phase-6-inline-parallel-enumerates-manifest.md) | F-08 — Phase 6 inline block parallel-enumerates manifest content | MEDIUM | Medium | Completed and archived. The Phase 6 HARD-GATE decision summary and `templates/storylet-batch-manifest.md` now carry reciprocal alignment markers so future edits trigger lockstep updates. |
| [STPOOL-010](../../archive/tickets/STPOOL-010-final-rule-paraphrases-hardgate.md) | F-09 — Final Rule paraphrases HARD-GATE pass conditions | MEDIUM | Small | Completed and archived. The Final Rule now closes thematically and points to the top HARD-GATE block as the authoritative pass-condition source instead of enumerating individual pass conditions. |
| [STPOOL-011](../../tickets/STPOOL-011-predicate-dsl-phase-7-6-reference-drift.md) | F-10 — predicate-DSL doc names Phase 7.6 as the runtime stop-condition evaluator | MEDIUM | Small | After the prose-strip rework, Phase 7.6 runs Layer 1 only (declaration check); Layer 2/3 (semantic evaluation) move to `branching-story-page-prose-finalize` Phase 4. Update the predicate-DSL reference to reflect the post-rework split. |
| [STPOOL-012](../../tickets/STPOOL-012-janitorial-sweep-low-findings.md) | F-11 + F-12 — vestigial "(NEW)" markers + unqualified cross-skill references | LOW | Small | Drop "NEW gate 14" prefix from gate-14 references at `phase-4-5-canon-safety-checks.md:30` and `governance-and-foundations.md:41`. Add `branching-story-page-cycle/references/` path prefix to `prose-craft-contract.md` references at `templates/storylet-record.yaml:230` and `templates/predicate-dsl.md:243`. Bundled as one sweep. |

## Dismissed items (audit findings NOT actioned)

| Item | Audit finding | Why dismissed |
|---|---|---|
| (none) | — | All 12 audit findings were accepted into tickets per the user's ACCEPT-and-create-tickets disposition at HARD-GATE; no findings reclassified or dropped during ticket allocation. |

## Follow-up considerations

- **Bootstrap reference's resolved Template-divergence note was retired by [STPOOL-013](../../archive/tickets/STPOOL-013-retire-resolved-bootstrap-template-divergence-note.md).** `branching-story-bootstrap/references/phase-6-storylet-pool-seed.md` now remains a validator landmine checklist without describing the corrected STPOOL-002/STPOOL-003/STPOOL-004 template examples as current divergences.
- **Predicate-DSL stop-args drift was completed in [STPOOL-014](../../archive/tickets/STPOOL-014-align-predicate-dsl-stop-args-with-validator.md).** STPOOL-013 reassessment found unrelated stop-predicate args rows in `templates/predicate-dsl.md`; STPOOL-014 aligned them with the live validator and bootstrap landmine table.
- **The bound-world dictionary was not relocated by STPOOL-007.** STPOOL-007 genericized the skill-level dictionary in place and documented `worlds/<slug>/templates/tone-theme-tag-dictionary.md` as the convention for future per-world extensions. Preserving the previous bound-world tag set would require a user-identified world slug and a separate world-content decision.
- **Cross-skill alignment with bootstrap's SLT inline-authoring landmines.** STPOOL-002/003/004 align with bootstrap's `phase-6-storylet-pool-seed.md:70-106` landmine documentation. If a future ticket touches that bootstrap reference (e.g., to add new landmines as the schema evolves), the storylet-pool-authoring template should be re-audited to confirm continued alignment.

## Implementation order recommendation

**Tier 1 (correctness — do first; partially completed):**

- **STPOOL-002** (stop-predicate args drift) — completed and archived.
- **STPOOL-003** (add realization_target) — completed and archived.
- **STPOOL-005** (dangling beat-functions.md ref) — independent. Trivial.
- **STPOOL-006** (Phase 6 rejected-candidates off-by-5) — completed and archived.
- **STPOOL-004** (interrupt_before non-empty) — completed and archived after STPOOL-002 corrected the escalation-to-confrontation example's interrupt predicate.
- **STPOOL-007** (genericize tone-theme dictionary) — completed and archived; used genericize-in-place and did not relocate the previous bound-world dictionary.

**Tier 2 (clarity — do after Tier 1):**

- **STPOOL-008** (VALENH-002 paragraph dedup) — completed and archived.
- **STPOOL-009** (Phase 6 inline block alignment markers) — completed and archived. The alignment marker rationale uses archived STPOOL-006's 14-row enumeration alignment as the worked example.
- **STPOOL-010** (Final Rule reframe) — completed and archived.
- **STPOOL-011** (predicate-DSL Phase 7.6 drift) — independent.

**Tier 3 (polish — do whenever):**

- **STPOOL-012** (janitorial sweep — F-11 + F-12) — independent. Trivial.

## Total scope

- 11 ticket files across active and archived paths: STPOOL-002 through STPOOL-010 are archived; STPOOL-011 through STPOOL-012 remain active.
- Files touched across all 11 tickets: 7 unique files inside `.claude/skills/storylet-pool-authoring/` (`SKILL.md`, `references/phase-4-5-canon-safety-checks.md`, `references/governance-and-foundations.md`, `templates/storylet-record.yaml`, `templates/predicate-dsl.md`, `templates/storylet-batch-manifest.md`, `templates/tone-theme-tag-dictionary.md`).
- No engine, validator, hook, or schema changes — every ticket is documentation/template-content scope.
- No git commit at ticket-implementation time; the user reviews diffs and commits per skill discipline.
