# Governance and Foundations

## FOUNDATIONS Alignment

| Principle | Phase | Mechanism |
|---|---|---|
| Rule 1 (No Floating Facts) | Phase 3 gate 1 | Schema completeness per shared contract §4.4. |
| Rule 2 (No Pure Cosmetics) | N/A | Story-bundle scope. World-canon principle. Handoff to `canon-addition` via `story-fact-promotion-to-canon`. |
| Rule 3 (No Specialness Inflation) | N/A | Same handoff as Rule 2. |
| Rule 4 (No Globalization by Accident) | Phase 3 gate 3, Phase 4 check 4 | Branch-scope legality at per-block and batch scope. |
| Rule 5 (No Consequence Evasion) | Phase 3 gate 5 | Effect legality (supersede / close target verification). |
| Rule 6 (No Silent Retcons) | N/A | Story-bundle scope; world-canon retcons route through `canon-addition`. |
| Rule 7 (Preserve Mystery Deliberately) | Phase 3 gate 4 | Per-block mystery / invariant firewall. |
| Rule 11 (No Spectator Castes) | N/A | World-canon-only principle. |
| Rule 12 (No Single-Trace Truths) | N/A | World-canon-only principle. |
| Canon Layers | Pre-flight, Phase 3 gate 4 | World canon loaded via context packet; per-block invariant + mystery firewall. |
| Mystery Reserve | Pre-flight, Phase 3 gate 4 | Whole-class Mystery Reserve loaded; per-block firewall. |
| §Story Bundles §4a (Plan-Authority Boundary) | All phases | Commitment-block-authoring writes author-pool storylets; does NOT mutate page records. |
| §Story Bundles §5a (Commitment Blocks Are Causal Moves) | Phase 2, 3 gate 1 | Drafted blocks reject `arc_contract` / `dramatic_unit` / `execution_envelope` / nested `effect_model` / `stop_policy` / shape discriminators per shared contract §4.4. |
| §Story Bundles §5b (Schema-Minimalism) | Phase 2, 3 gate 1 | Every field conforms to shared contract §4.4; gate 1 rejects extras and forbidden legacy fields; no new `any_story_character_active` predicate is introduced. |
| §Story Bundles §6a (Belief vs. Fact) | Phase 4 check 3 | `direct_batch` requires ≥1 block in the batch to affect `BEL` or `SREL` state. |
| §Story Bundles §6.1 (Story-Local Character Authority) | Pre-flight, Phase 1, Phase 2, Phase 3 gate 3 | Pre-flight enumerates active STCHARs' `role_in_story` proactively (including offstage); Phase 1 cast-role coverage criterion surfaces unrepresented pressure-bearing roles as authoring lanes; character-specific blocks consume active STCHAR through story-scoped retrieval and the Character-Fit Selection Contract's predicate discipline; world `CHAR-*` remains provenance only. |
| §Story Bundles §9 (Prose Length Discipline) | Phase 2 beat drafting | Beats carry prose-facing instructions but no word-count targets. |
| Change Control Policy | N/A | Canon-reading skill emits no Change Log Entries. |
| Tooling Recommendation | Pre-flight step 6 | World canon retrieval via `mcp__worldloom__get_context_packet`. |

## Guardrails

- **Never write world-level canon.** Hook 3 blocks raw `Edit` / `Write` on `worlds/<slug>/_source/<world-subdir>/*.yaml`. Story-bundle records under `worlds/<world_slug>/stories/<story_slug>/_source/storylets/SLT-*.yaml` are this skill's exclusive write surface, routed through the patch engine.
- **Never write rendered prose.** Commitment-block-authoring writes record schemas, not narrative text. Beat instructions are inputs to the external renderer when turn-cycle later authors a page plan using the selected block.
- **Do not fabricate DA existence in SLT preconditions.** An SLT may require `artifact_accessible(...)` or `any_belief(... access_route=document ...)` over an existing DA, but the storylet itself does not create DA records. DA creation belongs to runtime state deltas authored by `branching-story-bootstrap` or `branching-story-turn-cycle`. An SLT precondition naming a `DA-<integer>` that no runtime delta has created will silently never bind; the validator's `storylet_predicate_dsl_parsability` rule cannot detect this because predicate parsability does not verify record existence at authoring time.
- **Commitment blocks are causal moves, not dramatic acts.** Per FOUNDATIONS §Story Bundles §5a, the schema explicitly forbids `arc_contract`, `dramatic_unit`, `execution_envelope`, nested `effect_model`, `stop_policy`, `record_version` discriminators above `1`, and `shape:` discriminators. The skill REJECTS any attempt to write blocks with those fields (Phase 3 gate 1 schema completeness extends to schema strictness).
- **Schema minimalism per shared contract §2 + FOUNDATIONS §Story Bundles §5b.** Every field in every record drafted by this skill conforms to the shared contract §4.4 schema. No nice-to-have fields.
- **Predicate DSL is closed** (per shared contract §5). No free-form predicate prose; Phase 3 gate 2 rejects undefined predicates and unbound `bound:<alias>` references.
- **STCHAR is story-local character authority, not a new predicate family.** Follow the Character-Fit Selection Contract for exact-STCHAR predicate discipline. Do not invent `any_story_character_active`, `character_has_wound`, `character_arc_stage`, or other persona-state predicates.
- **No `in_memory_jit` mode.** The streamlined-pipeline source report named three modes; this skill ships two (`direct_batch`, `audit_repair`). Turn-cycle's Phase 2 inlines JIT block creation following the same shared contract §4.4 schema. The two skills share the schema discipline without chaining: turn-cycle never invokes commitment-block-authoring; commitment-block-authoring never produces a `runtime_jit`-origin block. If a future refactor extracts JIT to a shared sub-routine, a new ticket can capture that work.
- **No word-count enforcement** (per FOUNDATIONS §Story Bundles §9). Beat instructions carry no min/max word counts.
- **Skills do not chain.** Commitment-block-authoring never invokes `branching-story-turn-cycle`, `branching-story-prose-attach`, `branching-story-health-audit`, `story-fact-promotion-to-canon`, or `story-promotion-closeout`. When `audit_repair` skips an RSP card with non-commitment-block `repair_kind`, the SLB manifest records the sibling-handoff recommendation; the user separately invokes the named sibling.
- **Worktree discipline**: if invoked inside a git worktree, all paths resolve from the worktree root.
