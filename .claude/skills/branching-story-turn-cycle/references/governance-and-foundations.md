# Governance, Validation Rules, Record Schemas, FOUNDATIONS Alignment, and Guardrails

## Validation Rules This Skill Upholds

- **Rule 1 (No Floating Facts)** — Phase 3 + Phase 7. Mechanism: every drafted record conforms to shared contract §4 schemas; Phase 9 gate 7 (plan grounding) requires every required beat and every emitted `CHC` to be grounded in active records or world canon, with `visible_affordances[].grounded_in[]` restricted to active `STLOC` / `STOBJ` records only and `CHC.grounded_in.records[]` permitting any active record class — see gate 7's per-surface enumeration for the precise pattern.
- **Rule 4 (No Globalization by Accident)** — Phase 5 + Phase 9 gate 4. Mechanism: Phase 5 canon-authority classification keeps branch-local truth from leaking world-wide (`branch_local_counterfactual` vs. `canon_candidate`); Phase 9 gate 4 branch isolation rejects sibling-branch records.
- **Rule 5 (No Consequence Evasion)** — Phase 3 + Phase 9 gate 6 + Phase 9 saliency-rationale, causal-dependency, and choice-consequence checks. Mechanism: Phase 3 death/incapacity reconciliation propagates second-order effects in the same delta; Phase 9 gate 6 requires continuation capacity (eligible SLT) or terminal proof (rationale naming high-salience debt closure), Selection Rationale explains why equal-or-higher-salience eligible blocks lost, and Choice Consequence Integrity for accepted choices; the judgment-based causal dependency review rejects choices, affordances, obligations, and high-salience debt paths whose dependencies were clobbered by the drafted delta.
- **Rule 7 (Preserve Mystery Deliberately)** — Phase 5 + Phase 9 gate 3. Mechanism: Phase 5 classifies claims and rejects forbidden mystery resolution; Phase 9 gate 3 mystery firewall verifies no forbidden `M-<integer>` is resolved and no selected SLT's `mystery_policy.forbidden_resolutions` is breached.

## Record Schemas

All record schemas referenced by this skill live in `.claude/skills/_shared-templates/story-record-schemas.md` §4 (`BEL` §4.1, `PG` §4.2, `SE` §4.3, `SLT` §4.4). No skill-local templates needed — the shared schemas file is the canonical reference.

## FOUNDATIONS Alignment

| Principle | Phase | Mechanism |
|---|---|---|
| Rule 1 (No Floating Facts) | Phase 3, 7 | Shared contract §4 record schemas; Phase 9 gate 7 plan grounding. |
| Rule 2 (No Pure Cosmetics) | N/A | Not applicable — turn-cycle mutates branch-local story state; world canon is not touched. Handoff to `canon-addition` via `story-fact-promotion-to-canon` when a story claim promotes. |
| Rule 3 (No Specialness Inflation) | N/A | Not applicable — same handoff as Rule 2. |
| Rule 4 (No Globalization by Accident) | Phase 5, 9 | Phase 5 canon-authority classification; Phase 9 gate 4 branch isolation. |
| Rule 5 (No Consequence Evasion) | Phase 3, 9 | Phase 3 death/incapacity reconciliation; Phase 9 gate 6 continuation or terminal proof; Phase 9 Selection Rationale, Choice Consequence Integrity, and validator-backed `causal_dependency_threat_scan` (see SPEC-36 D1) for clobbered CHC / affordance / OBL / SLT dependencies. |
| Rule 6 (No Silent Retcons) | N/A | Not applicable — turn-cycle mutates story-bundle scope, not world canon. World canon retcon routes through `canon-addition`. |
| Rule 7 (Preserve Mystery Deliberately) | Phase 5, 9 | Phase 5 forbidden-mystery rejection; Phase 9 gate 3 mystery firewall. |
| Rule 11 (No Spectator Castes) | N/A | Not applicable — Rule 11 governs new exceptional capabilities at world canon. |
| Rule 12 (No Single-Trace Truths) | N/A | Not applicable — story-bundle scope, not world canon. |
| Canon Layers | Pre-flight, Phase 5 | World canon layers loaded via context packet; story-bundle records carry story-local truths per FOUNDATIONS §Story Bundles §1. |
| Mystery Reserve | Pre-flight, Phase 5, 9 | Whole-class Mystery Reserve loaded; Phase 5 classification; Phase 9 gate 3 enforces firewall. |
| §Story Bundles §4a (Plan-Authority Boundary) | Pre-flight, Phase 6, 10 | `accept_parent_unrendered: true` default; rendered prose remains a deterministic filesystem artifact outside PG; no ARC_TRACE emitted; the new PG is the next fork primitive. |
| §Story Bundles §4b (Canon Baseline Drift) | Pre-flight, Phase 6, 9 | Parent `state_snapshot.canon_revision` compared to the latest context-packet `change_log_entry`; new PG persists the current `canon_revision`; non-compatible drift routes to audit, repair, or promotion/retcon review. |
| §Story Bundles §5a (Commitment Blocks Are Causal Moves) | Phase 2 | Selected or JIT SLT records follow §4.4 schema discipline; JIT blocks have 1-5 beats and minimal effects; no `arc_contract` / `dramatic_unit` / `stop_policy` / shape discriminators. |
| §Story Bundles §5b (Schema-Minimalism) | All record-drafting phases | Every drafted record conforms to shared contract §4 schemas; supersession is file-level append-only via `supersedes:` field, no new patch op. |
| §Story Bundles §6a (Belief vs. Fact) | Phase 4 | Mandatory `expected_witnesses` coverage for actions involving secrecy / betrayal / deception / violence / sex / law / status / public ritual; each relevant witness group gets a `BEL` create/supersession or a closed-set non-propagation rationale. `truth_relation` + `visibility` + `confidence` are consumed by the social-state firewall. |
| §Story Bundles §6b (Information / Observer Firewall) | Phase 2, 4, 6, 8, 9 | Selected `SLT` actor-bindings, character actions, emitted `CHC` choices, and newly authored `BEL` records must rely only on information available to the acting entity, or record a valid access route through belief, observation, artifact/document access, inference, surveillance, institutional channel, magic/tech, or another canonically valid mechanism. Phase 6 records non-system character motivation grounding in `SE.world_logic_rationale`; Phase 4 retains knowledge-access routes in `BEL.basis.access_route` / `BEL.basis.access_records` for health-audit replay. |
| §Story Bundles §6.1 (Story-Local Character Authority) | Pre-flight, Phase 3, 7, 8, 9 | Runtime characterization consumes active STCHAR through `STENT.bound_stchar_id`, `PG.state_snapshot.active_records.STCHAR`, targeted story-scoped retrieval, §16a page-plan packets, and CHC/STPLAN/STEMO/SREL grounding. World `CHAR-*` is not runtime authority; `STCHAR.source_char_id` remains provenance only. Complex new non-background characters route to `story-character-profile` via `blocked_requires_stchar` before meaningful STENT/SE/PG/CHC state is committed. |
| Change Control Policy | N/A | Not applicable — canon-reading skill emits no Change Log Entries. |
| Tooling Recommendation | Pre-flight | World canon retrieval via `mcp__worldloom__get_context_packet`. |

## Guardrails

- **Never write world-level canon.** Hook 3 blocks raw `Edit` / `Write` on `worlds/<slug>/_source/<world-subdir>/*.yaml`. Story-bundle records at `worlds/<world_slug>/stories/<story_slug>/_source/<class>/*.yaml` are the exclusive write surface, routed through the patch engine.
- **Never write rendered prose at turn-cycle.** Rendered prose at `pages-prose/PG-<integer>.md` is supplied externally and validated by `branching-story-prose-attach`. Turn-cycle writes only the plan and updates the bundle INDEX.
- **Silent rejection is forbidden.** Every action — including impossible ones — produces an `SE` and a page plan. `world_block` and `terminal` are first-class outcomes routed through the same machinery as `accept`.
- **Deaths and removals are first-class outcomes.** No main-character protection via out-of-world logic. Phase 3 reconciliation propagates death / incapacity effects in the same delta.
- **Schema minimalism per shared contract §2 + FOUNDATIONS §Story Bundles §5b.** Every field in every record drafted by this skill conforms to the shared contract §4 schemas. No nice-to-have fields. Supersession is file-level append-only (a new record file carrying `supersedes:` in its YAML body, using existing `create_*_record` ops).
- **Verbatim §2 / §3 / §19 of the page plan** inlined from `reports/prose-quality-instructions.md` on every page. Operationally load-bearing — external LLM has no cross-plan state.
- **No word-count targets** anywhere in the plan (per FOUNDATIONS §Story Bundles §9). Pacing is expressed structurally via beats and stop conditions.
- **Runtime character authority is STCHAR.** Turn-cycle loads active STCHAR before runtime derivation; non-background STENT records require `bound_stchar_id`; page-plan §16a packets carry voice/behavior authority; CHC/STPLAN/STEMO/SREL cite STCHAR when stable persona materially shapes them. World `CHAR-*` is provenance/source material only for bootstrap, `story-character-profile`, and explicit promotion/adjudication flows.
- **Skills do not chain.** Turn-cycle never invokes `branching-story-prose-attach`, `commitment-block-authoring`, `branching-story-health-audit`, `story-fact-promotion-to-canon`, or `story-promotion-closeout`. When `promotion_claims[]` are emitted, turn-cycle surfaces the recommendation; the user separately invokes `story-fact-promotion-to-canon` with the new `SE-<integer>` as evidence.
- **Worktree discipline**: if invoked inside a git worktree, all paths resolve from the worktree root.
