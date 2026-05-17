# Triage — Story-Local Diegetic Artifacts (2026-05-17)

**Source**: `reports/story-local-diegetic-artifacts.md` — ChatGPT-Pro external review (15 sections + copy-pasteable spec section, ~1675 lines). User instruction: reassess proposals critically and create a spec if changes warranted.

**Deliverable**: `specs/SPEC-38-story-local-diegetic-artifact-authoring.md` (single spec, 12 grouped deliverables across 3 tiers).

**Verification**: four parallel Explore agents covering schema/contract, patch-engine/validators, FOUNDATIONS, and skill-capability claim clusters. All four returned verbatim quotes with file:line citations confirming the substrate is complete and the prescription gaps are real.

---

## Accepted items (folded into SPEC-38)

| # | Item | Spec deliverable | Rationale |
|---|---|---|---|
| R2 | Bootstrap DA-triage step | D3 | Verified gap: `branching-story-bootstrap/SKILL.md:131` only mentions DA in output-table with `IF in-play`; no triage logic. |
| R5 | Prose-attach load-bearing artifact-mention check | D6 + D12 | Verified gap: `prose-attach/SKILL.md:204-218` `invented_structural_fact` catches explicit-record-id mentions only, not narrative phrasings. |
| R6 | Commitment-block-authoring `artifact_accessible` + anti-pattern | D7 | Verified gap: predicate defined at story-state-contract.md §5 line 140 but not in skill prose. |
| R7 | Shared contract §4.5.10 commentary | D2 | Schema definition exists; rule-of-use commentary missing. |
| R9 | Story-promotion-closeout DA-supersession reinforcement | D9 | Existing rule at `story-promotion-closeout/SKILL.md:187`; reinforce with three worked examples. |

## Accepted with modification

| # | Item | Modification | Spec deliverable |
|---|---|---|---|
| R1 | New skill `.claude/skills/story-diegetic-artifact-authoring/` | Modified to shared reference `_shared-templates/da-authoring-reference.md` `(structural)`. Worldloom convention: cross-skill content lives in `_shared-templates/` not as standalone skills. | D1 |
| R3 | Turn-cycle Phase 3 DA triage + Phase 4 propagation | Modified: Phase 4 already documents `expected_witness_coverage` at `turn-cycle/SKILL.md:325`; only Phase 3 triage is added; Phase 4 gets a cross-reference sentence. | D4 |
| R4 | Health-audit DA-specific checks (9 FAIL + 8 WARN proposed) | Narrowed to 3 mechanical checks + 1 authorial warning `(pragmatic — scoping)`. Six conditions already covered by existing validators; remaining nine route to §Risks for follow-up iteration. | D5 + D10 + D11 |
| R8 | Promotion skill clarification | Extended with FOUNDATIONS §365 routing rule (out-of-report finding O1): DA pre-figurement routes through `CF.source_basis.derived_from`, not `pre_figured_by[]`. | D8 |

## Dismissed items

| # | Item | Reason |
|---|---|---|
| R10 | Schema field `source_world_artifact` | `(pragmatic)` ChatGPT-Pro's own defer recommendation honored; body annotation suffices until concrete pattern evidence demands the field. Revisit if cross-namespace ambiguity bites a pilot bundle. |
| R11 | Schema field `carrier_object` | `(structural)` `derived_from: [STOBJ-*]` already expresses carrier linkage; schema-minimalism doctrine forbids redundant fields. |
| R12 | Schema field `body_mode` | `(structural)` `genre` and body content can encode full-text vs excerpt vs transcript vs visual-description; not load-bearing for validation. |
| R13 | Structured `claims[]` field | `(structural)` Would duplicate world-level DA's heavyweight epistemic-horizon / claim-map at story-local scale; violates story-state-contract §2 schema-minimalism. |
| R14 | Standalone skill `.claude/skills/story-diegetic-artifact-authoring/` | `(structural)` Rejected in favor of R1 modification; rubric is never invoked independently of bootstrap/turn-cycle. |
| R15 | Example records in a "non-archive examples or tests location" | `(structural)` `worlds/` is gitignored per CLAUDE.md; freestanding examples conflict with convention. Three examples embed inline in D1's shared reference instead of report's five. |

## Confirms existing position

| # | Item | Confirmation |
|---|---|---|
| R16 | "Repository already has a validator hook for this exact failure mode" (public/factional DA propagation) | Verified: `expected_witness_coverage.ts:13,164-214` already enforces public/factional → BEL indirect-route propagation with `non_propagation:event_leaves_no_accessible_trace` fallback. **No validator code changes for this surface.** Work is documentation/skill-prose to make the existing enforcement visible to authors. |

## Out-of-report findings (folded in)

| # | Finding | Where it landed |
|---|---|---|
| O1 | FOUNDATIONS.md line 365 requires DA pre-figurement go in `CF.source_basis.derived_from`, not `CF.pre_figured_by[]` (CF-only). | D8 routing-rule paragraph in `story-fact-promotion-to-canon`. |
| O2 | `record-schema-compliance.ts` already validates DA schema enum violations (`truth_relation`, `circulation`). | Spec's §Out of Scope explicitly notes this to prevent double-add; report's FAIL #9 already covered. |
| O3 | `expected_witness_coverage` is more sophisticated than the report's "validator hook" framing implies (11-route indirect set, non-propagation tag parser, four verdict codes, `PUBLIC_DA_CIRCULATION` constant). | Spec references rather than extends; documented at Problem Statement under "Validator coverage". |
| O4 | `BEL.basis.access_route` enum has 11 routes (`direct_observation, testimony, document, object_trace, location_trace, inference, surveillance, institutional_channel, magic_tech, rumor, authorial_initialization`); report listed a subset. | D1 patch-obligations checklist enumerates the full indirect set; spec's Problem Statement quotes the full enum. |

## Deferred to follow-up specs

- **Cross-namespace DA reference resolution** (world-level vs story-local `DA-*`) — `(pragmatic)` per §Risks #1 in SPEC-38. New spec when pattern evidence emerges.
- **Remaining 9 audit conditions** from report §10 (circulation/BEL mismatch, suppressed-artifact custody, `truth_relation: true` without support, body-overlength, world-level DA import ambiguity, suppressor evidence check, etc.) — `(pragmatic)` per §Risks #2 in SPEC-38. Pilot-bundle evidence drives the next iteration.
- **Body-similarity clustering for D11** — `(pragmatic)` per §Risks #3 in SPEC-38. Title+author exact-match clustering lands in v1; body-similarity is opt-in extension awaiting duplicate-DA patterns in pilot audits.

---

## Notes

- The report's central thesis ("substrate exists; authoring judgment is missing") survives codebase verification verbatim across all four claim clusters.
- Two corrections to ChatGPT-Pro's design sharpen the proposal without changing its direction: shared-reference convention (R1 modification) and FOUNDATIONS §365 routing rule (R8 extension via O1).
- Tier structure (reference+contract / skill amendments / validator additions) maps onto natural ticket-decomposition phases per SPEC-38 §Approach.
- specs/ is currently empty (all archived through SPEC-37); SPEC-38 is the first active spec in the new cycle. No `specs/IMPLEMENTATION-ORDER.md` exists; spec deliberately defers index-file decisions until ≥3 active specs exist.
