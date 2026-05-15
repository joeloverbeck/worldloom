# Triage — Story-Related Improvements (Fourth Iteration)

**Date**: 2026-05-15
**Source**: `reports/story-related-improvements-fourth-iteration.md` — external review (ChatGPT-Pro) of the post-overhaul branching-story system, fed `docs/FOUNDATIONS.md` + the seven story-pipeline skills + `.claude/skills/_shared-templates/`, with no access to `tools/`, `docs/HARD-GATE-DISCIPLINE.md`, `docs/CONTEXT-PACKET-CONTRACT.md`, or `archive/specs/`. 14 evaluated items (5 P0, 6 P1, 3 P2) plus a "do not recommend" section and 5-step implementation order.
**Outcome**: 9 accepted (6 plain accept, 1 modification, 2 small-additive accepts via D4 split) → `archive/specs/SPEC-30-story-contract-hardening-ii.md` (D1–D10); 2 deferred to follow-up specs (items 8, 10); 1 already-resolved (item 11); 2 confirm-existing-decisions (items 13, 14).
**Verification**: every claim re-checked against the working tree across three parallel exploration passes (one on `_shared-templates/story-state-contract.md` + `docs/FOUNDATIONS.md`, one on the seven story skills, one on `tools/validators/` + `tools/patch-engine/` + `tools/world-mcp/` + `tools/world-index/` + `tools/hooks/`). Diagnoses are largely sound; codebase counts are sloppy in two places (claims "10-predicate DSL" — actually 20+; claims "8 coverage targets" — actually 11) but substantive verdicts hold. One framing — "character outcomes often live in STSTAT, not STENT" — misreads the deliberate identity/status separation; SREL half is correct, STSTAT half reframed as additive (D4).
**Cross-iteration check**: P1.11 (property-based tests) was the previous-iteration P2 hostile test-fixture suite — `docs/triage/2026-05-15-story-related-improvements-triage.md:41` deferred indefinitely with explicit user pricing-out rationale. Item 13 (defer STPRAC) matches existing third-iteration P1.3 dismissal. SPEC-28 (D1–D7) and SPEC-29 are clean — no fourth-iteration item re-proposes any SPEC-28/29 deliverable.

## Accepted → SPEC-30 (D1–D10)

| Intake | Deliverable | One-line rationale |
|---|---|---|
| P0.1 | D1 | Real contradiction: `story-state-contract.md:100-101` enforces "exactly one of choice_id/manual_action_text" and `:693-694` Gate 1 requires "exactly one source action", but PG-1's `story_start` event has neither — bootstrap structurally violates the contract. Add `story_start` carve-out to schema + gate + bootstrap prose. |
| P0.2 | D2 | Real but small: `branching-story-bootstrap/SKILL.md:295` says "§4.2 omits explicit listing" but `story-state-contract.md:97` now lists `branch_path` in §4.2 explicitly. One-line bootstrap correction. |
| P0.3 | D3 | Real ambiguity: `story-state-contract.md:640` defines `belief(holder, claim, ...)` (free-string claim), `:662` references `belief(holder, BEL-<integer>)` (id form). Two semantics share one predicate name. Split into `belief_record` (BEL-id, hard execution) + `any_belief` (existential, prefiltering — DSL grammar already has it). |
| P0.4 | D4 | Real gaps in `promotion_claims.source_record` (`:220` enum: `SF\|BEL\|DA\|STENT`). SREL absent — `relationship_or_institutional_outcome` can't cite the right kind. STSTAT acceptance reframed: ChatGPT-Pro's "character outcomes live in STSTAT" misreads the identity/status separation at `:582-596`; correct framing is *STSTAT-additive supporting evidence* for `character_outcome` (STENT remains required). |
| P0.5 | D5 | Real gap: `unresolved_mystery_claims[]` at `:131-134` lacks evidence pointers, so the §Mystery Accretion rule (`FOUNDATIONS.md:616`) is hard to operationalize. Add `evidence_records: [SF\|BEL\|DA\|SE]` (required for non-`preserved` statuses); gives health-audit a deterministic chain. |
| P0.6 (SLT effects) | D6 | Real tension: `commitment-block-authoring/SKILL.md:214` says effects MAY be empty; `:241-242` requires LITERAL effects entries — pressures authors into fake effects. Replace literal-effects-only requirement with three-form OR (effects / exit_options.likely_effects / preconditions any_belief\|any_relationship_axis). Schema unchanged. |
| P1.6 (motivation grounding) | D8 | Real gap: no current rule requires non-system character actions to ground in active STINT/BEL/OBL/CNSQ/THR/SREL/affordance. No-schema-change approach (record citation in `SE.world_logic_rationale`; health-audit replays from existing active records) is right-sized. |
| P1.7 | D7 | Real gap: Choice Consequence Integrity (`branching-story-health-audit/SKILL.md:163`) operates at audit-time replay only — three differently-worded CHCs all mapping to the same SLT/records currently pass. New page-plan + turn-cycle gate `choice_set_noncollapse` + audit-time `choice_set_collapse_observed`. |
| P1.9 | D9 | Real gap: SPEC-28 D2 added `selected_slt_id` + `selection_source` but no "why this over others" rationale. Conservative approach (require selection rationale in `SE.world_logic_rationale` prose; defer structured field) avoids schema churn while enabling `saliency_starvation` audit. |
| P2.12 | D10 | Confirmed: `story-relationship.schema.json:36` is `type: string, minLength: 1` with two example formats but no enforcement. Pre-production hard cutover to structured `direction: { kind: directed\|bidirectional, from, to }` — zero `_source/` story bundles exist to migrate. |

## Deferred to follow-up specs

| Intake | Reason | Follow-up |
|---|---|---|
| P1.8 — SLT-pool linter (6 sub-checks: dead_storylet, dominated_storylet, generic_storylet, missing_debt_coverage, cooldown_trap, branch_scope_leak) | Real gaps (none of the 6 terms appear anywhere in the seven skills or `tools/validators/`), but cluster is structurally distinct from contract hardening and roughly doubles SPEC-30's scope. *(pragmatic — under no-cost conditions all 6 belong; deferred only on retrofit-cost / scope-doubling grounds; revisit if constraint changes)* | SPEC-31 (recommended sequencing: immediately after SPEC-30 lands) |
| P1.10 — `story_sift` audit mode (recap, never steers future pages) | Real gap (no recap output exists in any audit mode) but value is author-comprehension/QA, not coherence-protection. Lower priority than P0/P1 contract hardening. *(structural — recap is a different surface from validation; deserves its own design)* | Separate follow-up spec post-SPEC-30; no specific sequencing pressure |

## Already-resolved

| Intake | Reason |
|---|---|
| P1.11 — property-based branch simulation tests | Previously-iteration P2 hostile test-fixture suite; `docs/triage/2026-05-15-story-related-improvements-triage.md:41` deferred indefinitely with explicit reasoning: structural invariants need either a mocked-skill harness (doesn't exist; would need to be built) or pilot-bundle authoring (user priced out — "not going to spend actual tokens running skills to produce a test story"); static bundle fixtures add breadth not depth (already covered by `record-schema-compliance` + `snapshot-replay-equality.test.ts` + `recursive-reference-closure.test.ts`). No re-litigation. *(verdict resolved 2026-05-15 in third-iteration triage)* |

## Confirm-existing-decisions (no action)

| Intake | Reason |
|---|---|
| P2.13 — defer `STPRAC` social-practice class | Negative recommendation; matches third-iteration P1.3 dismissal ("authoring convention, not load-bearing structure"). Architecture confirms current `SLT + THR + OBL + BEL + SREL` stack covers most social-practice scope. |
| P2.14 — defer `STINT.target_records` | Negative recommendation aligning with YAGNI. D8 (motivation grounding) provides the audit surface that would surface need for `target_records` if it ever arose. |

## Implementation-order file

`specs/IMPLEMENTATION-ORDER.md` is absent. Per Step 5 §`specs/IMPLEMENTATION-ORDER.md`-absent default rule, no index update — single-spec deliverable doesn't qualify for fresh creation (requires ≥3 specs in a logical bundle with meaningful sequencing).

## Out-of-report findings

None — exploration didn't surface pre-existing contract drift beyond what's already triaged. SPEC-28 (D1–D7, merged 2026-05-13 via PR #32) and SPEC-29 (legacy tools vocabulary cleanup, merged 2026-05-15) are clean.

## Verification reference

The three parallel exploration agents' verification results are summarized below for audit traceability (full quotes available in the conversation log):

- **Contract / FOUNDATIONS verifier**: Items 1, 3, 4, 5, 6 (SLT effects), 7, 9, 10 (`world_logic_rationale` + `state_delta` exist), 11 (Mystery Accretion + statuses), 12 (observer firewall + expected_witnesses) — all CONFIRMED. Item 2 (branch_path) — REFUTED at contract level (it's canonical at `:97`); the stale wording lives in bootstrap, not contract. Item 7 — `direction` is technically free string with example formats (CONFIRMED qualified). Item 9 — STSTAT exists distinct from STENT (CONFIRMED).
- **Story skills verifier**: Item A (branch_path bootstrap) — CONFIRMED stale wording at `branching-story-bootstrap/SKILL.md:295`. Item B (six outcome routes + silent rejection forbidden) — CONFIRMED. Item C (turn-cycle PG-1 special case) — REFUTED no current handling. Item D (effects-may-be-empty + literal-effects diversity) — both CONFIRMED. Item E — actual count is 11 coverage targets, not 8 as ChatGPT-Pro implied. Item F — actual DSL is 20+ predicates, not 10. Item G (six promotion source kinds + character_outcome STENT requirement) — CONFIRMED. Item H (closeout supersedes SF/BEL/STENT/SREL/DA; STSTAT NOT mentioned) — CONFIRMED. Item I (CCI operates at audit-time replay only) — CONFIRMED. Item J (4 audit modes; no story_sift) — CONFIRMED + REFUTED. Item K (no selected_slt rationale) — PARTIAL (commitment recorded but rationale absent). Items L + M — REFUTED, none of the proposed terms exist in any skill.
- **Tools blast-radius mapper**: full surface mapped per deliverable; SPEC-30's "Files touched" sub-sections derive from this map. Schema files at `tools/validators/src/schemas/story-{page,event,belief,relationship,storylet,choice,obligation,consequence,thread,entity,status,fact,location,object,intention,branch,diegetic-artifact}.schema.json`; predicate DSL at `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`; patch-engine ops at `tools/patch-engine/src/ops/create-story-record.ts`; MCP context-packet at `tools/world-mcp/src/context-packet/story-bundle-context.ts`; world-index parser at `tools/world-index/src/parse/semantic.ts`; hook5 post-patch validator at `tools/hooks/src/hook5-validate-after-patch.ts`.
