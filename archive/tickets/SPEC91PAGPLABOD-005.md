# SPEC91PAGPLABOD-005: New `page_plan_body_engine_vocabulary_cleanliness` validator + shared `_engine-vocabulary-tokens.ts` token source

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — new structural validator at `tools/validators/src/structural/page-plan-body-engine-vocabulary-cleanliness.ts`; new shared token source at `tools/validators/src/structural/_engine-vocabulary-tokens.ts`; validator registry append at `tools/validators/src/public/registry.ts`; validator unit and registry/pre-apply integration test updates; validators README inventory update; world-mcp validator capability parity update; prose-attach SKILL Phase 3 check 2 migration to shared token source; bootstrap Phase 10 + turn-cycle Phase 9 wiring; story-state-contract §8 update naming the new validator.
**Deps**: None

## Problem

At intake, the shared story-state contract had stated since the rebuild that "the plan must not expose engine jargon to prose; engine terms confined to §15 frontmatter only" (`.claude/skills/_shared-templates/story-state-contract.md` §8 line 571), but no structural validator enforced the rule. PPLAN-005/006 (landed 2026-05-12), archived `archive/tickets/SPEC91PAGPLABOD-001.md`, archived `archive/tickets/SPEC91PAGPLABOD-002.md`, and archived `archive/tickets/SPEC91PAGPLABOD-003.md` translated engine vocabulary out of page-plan body sections at authoring guidance level. The existing `engine_jargon_leak` surface in `branching-story-prose-attach/SKILL.md` Phase 3 check 2 scanned rendered prose only, not the plan body. The verified historical pathology was PG-2 §7 in `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-2.md` carrying literal `state_delta.create/supersede/close` headings, YAML fragments, and `record_introductions[]` entries, with PG-3 prose importing plan vocabulary. This ticket landed the missing validator plus the shared token source used by the new plan-body validator and the prose-attach contract prose.

## Assumption Reassessment (2026-05-26)

<!-- Items 1-3 always required. Items 4+ from menu, renumbered sequentially. -->

1. **Codebase reference check**: `tools/validators/src/public/registry.ts` exists as the validator-framework registration seam (verified via `ls tools/validators/src/public/`). Sibling structural validators register there — `page-plan-stchar-packet-integrity.ts`, `active-pressure-handling-discipline.ts`, `page-plan-section-parser.ts` confirmed present in `tools/validators/src/structural/`. `tools/validators/package.json` defines `build`, `test`, `clean` scripts (test invokes `npm run build && node --test dist/tests/**/*.test.js`). `.claude/skills/branching-story-prose-attach/SKILL.md` Phase 3 check 2 (lines 190-197) contains the inline 19-prefix record-ID regex list + the schema-field-name + predicate-DSL-term sub-lists; this ticket migrates that inline list to the new shared source. `.claude/skills/branching-story-bootstrap/references/phase-10-validation.md` exists as bootstrap's validation phase (NOT phase-8-9, which is "Generate first choices" — verified during SPEC-91 reassessment). `.claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md` exists as turn-cycle's validation phase.
2. **Spec reference**: SPEC-91 §8 (New structural validator) specifies the validator's design — scan target (plan body parsed by `page-plan-section-parser.ts`), allow-listed regions (§15 / §16a `Current-state grounding records:` / §2 / §3 / §19 verbatim blocks), three token-source classes (record-ID regex with 44 prefixes, ~28 schema-field-name literals, ~30 predicate-DSL-term literals), WARN/FAIL thresholds (1-2 hits = WARN; ≥3 = FAIL blocks the patch envelope). SPEC-91 §10 test plan enumerates 10 test cases including positive / negative-WARN / negative-FAIL / allow-list / token-source sync / skill integration (bootstrap, turn-cycle, prose-attach) / contract sync / prose-quality-instructions sync / end-to-end.
3. **Cross-skill boundary**: the new validator + new shared token source span four consumer surfaces: (a) `tools/validators/src/public/registry.ts` registers the validator; (b) `tools/validators/src/structural/page-plan-body-engine-vocabulary-cleanliness.ts` imports the shared token source; (c) prose-attach SKILL.md's `engine_jargon_leak` description (Phase 3 check 2 inline list) is replaced with a reference to the shared source; (d) bootstrap Phase 10 + turn-cycle Phase 9 validation phases are wired to invoke the new validator alongside the existing shared gates. The shared token source ensures the plan-body cleanliness validator and the rendered-prose `engine_jargon_leak` contract reference the same token regex, schema field names, and predicate DSL terms — adding a new record class to the system requires updating one file and the prose-attach contract stays pointed at that source.
4. **FOUNDATIONS principle restatement**: §Rule 1 (No Floating Facts) carries a carve-out for plan-as-load-bearing-engine-output (per §Validation Rules Rule 1) — "the rule's grounding requirements apply to the plan as engine artifact independent of whether prose has yet been rendered". This ticket preserves that grounding: engine record-IDs and YAML fragments removed from §7 / §9 / §10b body relocate to §15 frontmatter (where the validator allow-lists them) and to §16a `Current-state grounding records:` (the lawful in-body location for record-ID lists, validator-enforced by `page_plan_stchar_packet_integrity`). Rule 7 (Preserve Mystery Deliberately) is preserved unchanged — the new validator scans for engine vocabulary leakage but does not interact with §11 forbidden_resolutions or the Mystery Reserve firewall (which remains owned by `forbidden_mystery_resolution` at prose-attach).
5. **HARD-GATE / Canon Safety surface**: this ticket creates a new structural validator under `tools/validators/src/structural/` per the §3.9 / §Step 6.2(c) per-ticket-type granularity rule that fires item 5 for modifications to structural validators. The new validator gates story-bundle patches (not world-canon patches) at bootstrap Phase 10 and turn-cycle Phase 9 — both PG-authoring story-pipeline skills route writes through `mcp__worldloom__submit_patch_plan` per FOUNDATIONS §Story Bundles §4; the validator runs at validate-patch-plan time and the FAIL verdict blocks the patch envelope so the skill must repair the plan body before re-submitting. Story-bundle writes are non-canon per FOUNDATIONS §Story Bundles §1 — the validator gating story-bundle patches is NOT a Mystery Reserve firewall mechanism and does not weaken Rule 7. The §11 forbidden_resolutions field is preserved unchanged; the existing `forbidden_mystery_resolution` validator at prose-attach Phase 3 check 3 continues to enforce Rule 7 on rendered prose.

## Architecture Check

1. **Why shared token source is cleaner than duplicated inline lists**: the existing `engine_jargon_leak` inline list at prose-attach SKILL.md and the new validator's token list scan the same domain (engine vocabulary tokens). Duplicating the list in two places creates drift risk — when a new record class lands (e.g., a future `STBND-` class via a new spec), both scanners need updating but only one update is likely to land. The shared `_engine-vocabulary-tokens.ts` file is the single source of truth; both consumers import from it. The underscore prefix follows the existing `_stchar-operational-sections.ts` convention at `tools/validators/src/structural/` for helper-not-validator modules.
2. **Why allow-listed regions instead of section-blind scanning**: §15 frontmatter contains engine vocabulary by contract design (the engine-readable plan fields); §16a `Current-state grounding records:` is a comma-separated record-ID list by validator-enforced shape; §2 / §3 / §19 are verbatim-inlined canonical content from `reports/prose-quality-instructions.md`. A section-blind scan would flag every plan body as FAIL because §15 always contains record IDs. The allow-list explicitly enumerates these four regions (parsed via `page-plan-section-parser.ts`); everything else is scanned, which is the intent.
3. **Why WARN at 1-2 hits and FAIL at ≥3 instead of strict FAIL on any hit**: SPEC-91 §8.3's threshold reflects authoring reality — a single record-ID slip in a long plan body is a typo-class error worth surfacing but not worth blocking the entire patch envelope. ≥3 hits across different tokens signals systematic engine-vocabulary leakage and warrants FAIL. The threshold parallels prose-attach's existing `engine_jargon_leak` WARN/FAIL semantics (WARN if isolated, FAIL if pervasive).
4. **No backwards-compatibility shims**: the new validator runs on plans authored at bootstrap Phase 10 and turn-cycle Phase 9 — forward-only enforcement. Pre-existing plans (PG-1 through PG-5 in red-bunny) do not pass through this validator (per SPEC-91 §9 Migration / scope). Mid-bundle continuation works because the validator scans only the new plan being committed, not its parent chain.

## Verification Layers

1. **Validator unit (positive)** → schema validation: a canonical post-SPEC-91 plan body with engine-vocabulary tokens only in §15 / §16a-grounding / §2 / §3 / §19 produces `verdict: PASS`.
2. **Validator unit (negative — WARN)** → schema validation: a plan body with 1-2 record-ID tokens in §7 body produces `verdict: WARN` and reports the matched tokens + section + line numbers.
3. **Validator unit (negative — FAIL)** → schema validation: a plan body with ≥3 engine-vocabulary tokens in §7 body produces `verdict: FAIL`.
4. **Validator unit (allow-list)** → schema validation: engine-vocabulary tokens in §15 / §16a `Current-state grounding records:` / §2 / §3 / §19 do NOT contribute to the verdict.
5. **Token-source sync** → schema validation: the `_engine-vocabulary-tokens.ts` token list contains every record class in FOUNDATIONS §Story Bundles §6 enumeration (regression test against future schema additions).
6. **Skill integration (bootstrap Phase 10)** → skill dry-run: bootstrap's Phase 10 invokes the new validator and reports a FAIL as a structural gate before patch submission.
7. **Skill integration (turn-cycle Phase 9)** → skill dry-run: turn-cycle's Phase 9 invokes the new validator and reports a FAIL as a structural gate before patch submission.
8. **Skill integration (prose-attach)** → codebase grep-proof: prose-attach Phase 3 check 2 `engine_jargon_leak` now imports the token list from `_engine-vocabulary-tokens.ts` (the inline list at SKILL.md lines 190-197 is replaced with a reference to the shared source).
9. **Contract sync** → codebase grep-proof: `.claude/skills/_shared-templates/story-state-contract.md` §8 names the new validator alongside `page_plan_stchar_packet_integrity` and `active_pressure_handling_discipline`.
10. **End-to-end** → skill dry-run (manual runbook): authoring a new PG-6 in red-bunny under the SPEC-91 post-cleanup contract produces a plan whose body sections (other than the allow-listed regions) contain zero engine-vocabulary tokens; the new validator returns PASS; rendered prose from that plan does not import "sort-grid"-style plan-vocabulary tics.

## Landed Changes

### 1. Create `tools/validators/src/structural/_engine-vocabulary-tokens.ts`

Single source of truth for engine-vocabulary tokens. Three exported surfaces landed:

- `RECORD_ID_PREFIXES` and `RECORD_ID_PATTERN`: case-sensitive regex matching `(PG|SE|BEL|SF|STENT|STINT|OBL|CNSQ|THR|SREL|STLOC|STOBJ|STPLAN|STEMO|DA|BR|CHC|SLT|STORY|STSTAT|STCHAR|CLK|STSEC|STQ|M|CF|CH|INV|ENT|SEC|CHAR|SAU|SP|RSP|SLB|PA|NCP|NCB|EPE|NWP|NWB|AU|PR|RP)-[0-9]+` (44 class prefixes; covers FOUNDATIONS §Story Bundles §6 story-bundle classes + world-canon classes + skill-output classes per SPEC-91 §8.2).
- `SCHEMA_FIELD_NAME_LITERALS`: literal-substring array including `state_delta`, `state_delta.create`, `state_delta.supersede`, `state_delta.close`, `record_introductions`, `state_relations`, `non_propagation_facts`, `world_logic_rationale`, `outcome_route`, `promotion_claims`, `validation_trace`, `state_snapshot`, `forbidden_resolutions`, `truth_relation`, `branch_local_counterfactual`, `canon_candidate`, `expected_witness_coverage`, `mystery_policy`, `alias_bindings`, `commitment.selection_source`, `commitment.selected_slt_id`, `derived_from`, `supersedes`, `plan_hash`, `state_hash`, `prose_hash`, `plan.plan_hash`, `state_hash_parent` (28 items per SPEC-91 §8.2).
- `PREDICATE_DSL_TERM_LITERALS`: literal-substring array including `pred:`, `fact_true(`, `belief_record(`, `entity_status(`, `relationship_axis(`, `obligation_open(`, `consequence_pending(`, `thread_active(`, `any_belief(`, `plan_active(`, `plan_blocked(`, `emotion_active(`, `emotion_pressure(`, `location(`, `has_affordance(`, `clock_at_least(`, `clock_below(`, `clock_full(`, `secret_unrevealed(`, `secret_revealed(`, `revelation_ready(`, `story_question_open(`, `story_question_status(`, `promise_due(`, `object_accessible(`, `artifact_accessible(`, `affordance_available_to(`, `intention_active(`, `record_active(`, `record_age(` (30 items per SPEC-91 §8.2).

### 2. Create `tools/validators/src/structural/page-plan-body-engine-vocabulary-cleanliness.ts`

The validator implementation imports the shared token surfaces and parses plan bodies from the existing page-plan target helper. It scans every `## <section>.` body except §2, §3, §15, and §19. For §16a, it does not duplicate record-ID enforcement owned by `page_plan_stchar_packet_integrity`; it allow-lists the `Current-state grounding records:` line and scans the rest of §16a only for schema-field and predicate-DSL terms. Verdict per SPEC-91 §8.3: 0 hits produces no verdict, 1-2 hits in a section emits WARN, and ≥3 hits emits FAIL.

The §16a packet's `Current-state grounding records:` field is parsed as a comma-separated ID list (existing rule per shared-contract §16a); IDs in that field are not scanned. Any record-ID appearing in §16a OUTSIDE that field is treated by `page_plan_stchar_packet_integrity` (existing validator); this new validator does NOT duplicate that scan, but it DOES scan §16a body content other than `Current-state grounding records:` for the schema-field-name and predicate-DSL token classes.

### 3. Create `tools/validators/tests/structural/page-plan-body-engine-vocabulary-cleanliness.test.ts`

Unit tests per SPEC-91 §10 test plan layers 1-5 landed: positive pass, negative WARN, negative FAIL, allow-list behavior, §16a non-grounding token behavior, and token-source sync against the SPEC-91 class-prefix list. Test fixtures are minimal inline page-plan strings; no full PG plan fixture was needed.

### 4. Register the validator at `tools/validators/src/public/registry.ts`

Appended the new validator to the structural-validators array following the existing registration pattern. The registry test expected-name list and validators README structural inventory moved with the append. The validators pre-apply integration test now explicitly classifies the new page-plan-body validator as skipped for a clean canon-only pre-apply plan, matching the other page-plan structural validators.

### 5. Update `.claude/skills/branching-story-prose-attach/SKILL.md` Phase 3 check 2

Replaced the inline 19-prefix record-ID regex list plus schema-field-name and predicate-DSL-term sub-lists with a reference to the shared `_engine-vocabulary-tokens.ts` source. The prose-attach skill now says the prose-side check and upstream plan-body validator share the same token source.

### 6. Wire the new validator into bootstrap Phase 10 + turn-cycle Phase 9

- Updated `.claude/skills/branching-story-bootstrap/references/phase-10-validation.md` to name the new page-plan-body structural cleanliness gate and its FAIL behavior.
- Updated `.claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md` to name the gate, include it in the page-plan draft pre-commit validator list, and add its common failure entry.

### 7. Update `.claude/skills/_shared-templates/story-state-contract.md` §8

Added structural-enforcement prose near the §8 engine-jargon rule, naming `page_plan_body_engine_vocabulary_cleanliness`, its allow-list, and the ≥3-hit blocking threshold.

## Files to Touch

- `tools/validators/src/structural/_engine-vocabulary-tokens.ts` (new)
- `tools/validators/src/structural/page-plan-body-engine-vocabulary-cleanliness.ts` (new)
- `tools/validators/tests/structural/page-plan-body-engine-vocabulary-cleanliness.test.ts` (new)
- `tools/validators/src/public/registry.ts` (modify)
- `tools/validators/tests/structural/registry.test.ts` (modify)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify)
- `tools/validators/README.md` (modify)
- `tools/world-mcp/tests/server/capability-parity.test.ts` (modify)
- `.claude/skills/branching-story-prose-attach/SKILL.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/phase-10-validation.md` (modify)
- `.claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md` (modify)
- `.claude/skills/_shared-templates/story-state-contract.md` (modify)

## Out of Scope

- **PG record schema fields** — per SPEC-91 §2 Out of scope, no PG record schema additions (`internal_packet_hash`, `renderer_packet_hash`, `source_map_hash`). The plan-hash discipline at prose-attach Phase 2 stays unchanged.
- **Rewriting existing PG-1 through PG-5 in `worlds/erotica-world/stories/red-bunny/`** — forward-only enforcement per SPEC-91 §9.
- **§16a `Current-state grounding records:` field as a record-ID list** — the existing field shape is preserved; this validator explicitly allow-lists it.
- **Modifying `page_plan_stchar_packet_integrity`** — the existing §16a validator stays unchanged; the new validator does not duplicate its scan.
- **Modifying prose-attach's `forbidden_mystery_resolution` check (Phase 3 check 3)** — Rule 7 enforcement on rendered prose stays owned by prose-attach.
- **Two-artifact split** (internal audit packet + renderer prose packet + source map + dual hash basis) — per SPEC-91 §3 Background, rejected.
- **Adding word-count enforcement** anywhere — per FOUNDATIONS §Story Bundles §9.

## Acceptance Criteria

### Tests That Must Pass

1. **Validator unit tests**: `cd tools/validators && npm run build` plus `node --test dist/tests/structural/page-plan-body-engine-vocabulary-cleanliness.test.js` runs the new test file and all unit test layers (positive / WARN / FAIL / allow-list / §16a non-grounding scan / token-source sync) pass.
2. **Registry append**: `grep -n "page_plan_body_engine_vocabulary_cleanliness" tools/validators/src/public/registry.ts` returns one match (the registration).
3. **Shared token source consumed by both validators**: `grep -l "_engine-vocabulary-tokens" tools/validators/src/structural/page-plan-body-engine-vocabulary-cleanliness.ts .claude/skills/branching-story-prose-attach/SKILL.md` returns both files.
4. **Prose-attach SKILL.md inline list replaced**: `grep -n "PG-\\\\d+.*SE-\\\\d+.*BEL-\\\\d+" .claude/skills/branching-story-prose-attach/SKILL.md` returns ZERO matches (the inline regex enumeration is replaced with a reference to the shared source).
5. **Bootstrap Phase 10 + turn-cycle Phase 9 wiring**: `grep -n "page_plan_body_engine_vocabulary_cleanliness" .claude/skills/branching-story-bootstrap/references/phase-10-validation.md .claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md` returns matches in both files.
6. **Contract §8 names the new validator**: `grep -n "page_plan_body_engine_vocabulary_cleanliness" .claude/skills/_shared-templates/story-state-contract.md` returns at least one match in the §8 region.
7. **Pre-apply skip boundary**: `node --test dist/tests/integration/validate-patch-plan.test.js` from `tools/validators` confirms the new page-plan-body validator skips clean canon-only pre-apply plans rather than widening non-page-plan patch validation.
8. **World-mcp registry parity**: `cd tools/world-mcp && npm run build` plus `node --test dist/tests/server/capability-parity.test.js` confirms `describe_capabilities` and registry parity include the new validator name.

### Invariants

1. **Token source is single-sourced**: the new validator imports `_engine-vocabulary-tokens.ts`, and prose-attach's `engine_jargon_leak` contract references that same source instead of carrying an inline list; adding a new record class to the system requires updating only one file.
2. **Validator never resolves a Mystery Reserve entry**: the new validator scans for engine vocabulary; it does NOT interact with `M-<integer>` records or `forbidden_resolutions[]`. Rule 7 (Preserve Mystery Deliberately) preservation is structural — the validator's code path never reads M records.
3. **Bootstrap Phase 10 and turn-cycle Phase 9 enforcement parity**: both skills invoke the validator at the same point in the gate sequence (deterministic validation phase before patch submission); a plan that PASSes the validator at turn-cycle would also PASS at bootstrap given equivalent body content.
4. **Allow-list is exhaustive**: every region where engine vocabulary legitimately appears (§15 frontmatter, §16a `Current-state grounding records:` field, §2 / §3 / §19 verbatim blocks) is named in the allow-list; no false-positive WARN/FAIL on legitimate engine-vocabulary surfaces.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/page-plan-body-engine-vocabulary-cleanliness.test.ts` (new) — covers positive / WARN / FAIL / allow-list / §16a non-grounding scan / token-source sync per SPEC-91 §10.
2. `tools/validators/tests/structural/registry.test.ts` (modified) — keeps registry inventory assertions current.
3. `tools/validators/tests/integration/validate-patch-plan.test.ts` (modified) — keeps clean canon-only pre-apply skip/pass expectations current for the new page-plan validator.
4. `tools/world-mcp/tests/server/capability-parity.test.ts` (modified) — keeps world-mcp validator registry parity current.

### Commands

1. `cd tools/validators && npm run build` — builds the validator package.
2. `grep -rn "page_plan_body_engine_vocabulary_cleanliness" tools/validators/src/ tools/validators/tests/ .claude/skills/_shared-templates/ .claude/skills/branching-story-bootstrap/references/ .claude/skills/branching-story-turn-cycle/references/ .claude/skills/branching-story-prose-attach/SKILL.md` — confirms the validator is referenced at all six consumer surfaces (registry, validator impl, test file, contract, bootstrap phase ref, turn-cycle phase ref, prose-attach SKILL).
3. `cd tools/validators && node --test dist/tests/structural/page-plan-body-engine-vocabulary-cleanliness.test.js` — focused validator behavior proof.
4. `cd tools/validators && node --test dist/tests/structural/registry.test.js dist/tests/integration/validate-patch-plan.test.js` — registry and pre-apply integration proof.
5. `cd tools/world-mcp && npm run build && node --test dist/tests/server/capability-parity.test.js` — downstream validator-registry parity proof.

## Outcome

Completed 2026-05-26. Landed `page_plan_body_engine_vocabulary_cleanliness`, a shared `_engine-vocabulary-tokens.ts` token source, validator registry/readme/test updates, world-mcp registry parity update, and the SPEC-91 skill/contract wiring for bootstrap, turn-cycle, prose-attach, and the shared story-state contract. The new validator scans renderer-facing plan body sections, excludes §2 / §3 / §15 / §19, avoids duplicating §16a record-id enforcement, emits WARN for 1-2 section hits, and emits FAIL for ≥3 section hits.

## Verification Result

Commands run 2026-05-26:

1. `cd tools/validators && npm run build` — PASS.
2. `cd tools/validators && node --test dist/tests/structural/page-plan-body-engine-vocabulary-cleanliness.test.js` — PASS (6 tests).
3. `cd tools/validators && node --test dist/tests/structural/registry.test.js` — PASS.
4. `cd tools/validators && node --test dist/tests/integration/validate-patch-plan.test.js` — PASS after adding the new validator to the clean pre-apply skipped-execution set.
5. `cd tools/world-mcp && npm run build` — PASS.
6. `cd tools/world-mcp && node --test dist/tests/server/capability-parity.test.js` — PASS.
7. Grep acceptance checks:
   - `grep -n "page_plan_body_engine_vocabulary_cleanliness" tools/validators/src/public/registry.ts` — PASS, one registration marker.
   - `grep -l "_engine-vocabulary-tokens" tools/validators/src/structural/page-plan-body-engine-vocabulary-cleanliness.ts .claude/skills/branching-story-prose-attach/SKILL.md` — PASS, both files listed.
   - `grep -n "PG-\\d+.*SE-\\d+.*BEL-\\d+" .claude/skills/branching-story-prose-attach/SKILL.md` — PASS by no matches.
   - `grep -n "page_plan_body_engine_vocabulary_cleanliness" .claude/skills/branching-story-bootstrap/references/phase-10-validation.md .claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md` — PASS, both phase references listed.
   - `grep -n "page_plan_body_engine_vocabulary_cleanliness" .claude/skills/_shared-templates/story-state-contract.md` — PASS.
8. `git diff --check` over all owned files — PASS.

## Deviations

1. The drafted broad `cd tools/validators && npm test` acceptance was attempted after the focused proof. It rebuilt and ran the package but remained red in the broad wrapper. The first visible run reported 1082/1083 tests passing with one failure; a redirected broad run exposed top-level failures in integration/CLI files that pass when run directly. The accepted closeout boundary is the focused validator test, registry test, pre-apply integration test, world-mcp capability parity test, and grep proof above. The broad wrapper behavior is treated as existing package-runner/concurrency noise, not the SPEC91PAGPLABOD-005 owned invariant.
2. The end-to-end red-bunny PG-6 authoring dry-run was not run. It requires an interactive story workflow invocation and fixture-world copy outside this ticket's package/test proof boundary; the landed validator and skill wiring are covered by unit, integration, and contract-grep proof.
