# Governance and FOUNDATIONS Alignment

This reference holds the cross-cutting governance content for branching-story-page-cycle: the Mandatory LLM Roles per phase, the Validation Rules this skill upholds, the FOUNDATIONS Alignment table, and the full Guardrails list. The thin SKILL.md surfaces a short Hard Rules summary; this file is the authoritative full version.

## Mandatory LLM Roles

Run the page-cycle turn through these critics where applicable:

- **Choice Parser** — Phase 1 Path B (write-in path only).
- **Choice Proposer** — Phase 8 step 2.
- **Choice Renderer** — Phase 8 step 5 (surface labels).
- **Prose Renderer** — Phase 7.
- **JIT Storylet Generator** — Phase 4 fallback only; delegated to `storylet-pool-authoring` `mode=jit`.
- **Continuity Critic** — Phase 7 post-render claim classification + Phase 9 gate 7 cross-check.
- **Mystery Curator** — Phase 9 gate 1 firewall check.
- **Pacing Critic** — verifies the page lands at a real choice point (Phase 7 fail-fast checks).

The proposer / renderer / parser are the LLM's first-class roles per the proposal's "LLM as surface realization, not source of truth" rule. The continuity / mystery / pacing critics are validation roles. Per `execution_mode`: `authoring` runs all listed critics; `interactive_runtime` runs parser / proposer / renderer mandatorily and critics on validation failure or high-risk touches; `batch_generation` runs full critics on configured checkpoints only (per the HARD-GATE block table).

## Validation Rules This Skill Upholds

See §FOUNDATIONS Alignment below for per-rule enforcement (Rules 1, 4, 5, 6, 7 are actively upheld; Rules 2, 3, 11, 12 are N/A as a canon-reading skill).

## FOUNDATIONS Alignment

| Principle | Phase / Mechanism | Notes |
|---|---|---|
| Tooling Recommendation (§"non-negotiable") | Pre-flight loads `docs/FOUNDATIONS.md` + `WORLD_KERNEL.md` + `ONTOLOGY.md` + `STORY_KERNEL.md`; whole-class M + INV record loads via `list_records(... include_full_body=true)`; premise-and-state-bounded retrieval via `get_context_packet(task_type='story_page_cycle')`. Whole-class enumeration authorized for class-bounded firewalls per FOUNDATIONS §Tooling Recommendation. | Direct `Read` of `_source/<world-subdir>/` redirected to MCP retrieval by Hook 2; story-bundle `_source/<story-subdir>/` is direct-Read because Hook 2's match pattern does NOT match the nested bundle. |
| Multi-world directory discipline | Single-world scope; required `world_slug` argument; ALL world-state reads rooted at `worlds/<world-slug>/`; ALL writes rooted at `worlds/<world-slug>/stories/<story-slug>/`. | Story-bundle scope nested inside single-world scope. |
| Default Reality (FOUNDATIONS §Core Principle) | Phase 4.5 `canon_candidate` HARD-GATE handoff to `story-fact-promotion-to-canon` is never elided in any execution_mode. World-canon mutation is always an explicit user act per FOUNDATIONS §Default Reality. | The Phase 10 per-mode HARD-GATE lifting applies ONLY to story-bundle writes (which are not world canon); the canon-mutation gate is structurally separate. |
| Rule 1: No Floating Facts | Phase 5 SF schema requires `epistemic_class` + scoping fields + `derived_from_cf` (or `canon_relation: not_applicable`); Phase 9 gate 11 backstop. | Story-local facts that aren't world canon declare `not_applicable` rather than null. |
| Rule 2: No Pure Cosmetics | N/A | Not applicable — canon-reading skill writes story-bundle records, not new world-level species/rituals/technologies/artifacts/institutions. The Rule 2 enforcement surface is `canon-addition` Phase 5 (Diffusion Analysis) and `propose-new-canon-facts` Phase 4 (Domain Coverage); story-local STENT/STOBJ/STLOC/story-local-DA are not Rule-2-eligible because they are story-scoped, not world-canon. |
| Rule 3: No Specialness Inflation | N/A | Not applicable — canon-reading skill produces no new world-level capability, artifact, or species. The enforcement surface is `canon-addition` (CF stabilizers + Rule-3 audit). Story-local capability assertions inherit from the source CF's `costs_and_limits` (per Phase 5 fact_create discipline); they do not inflate world-level specialness. |
| Rule 4: No Globalization by Accident | Phase 3 continuation feasibility check + Phase 9 gate 2 backstop. INV `break_conditions` enforced against every applied_event_op via the whole-class INV load. | Distribution check is the concern of source CFs imported as SFs; this skill does not introduce world-level distribution claims. |
| Rule 5: No Consequence Evasion | Phase 2 emits `required_aftermath`; Phase 5 persists each item as CNSQ (or routes to newly-opened OBL); Phase 9 gate 12 enforces no item silently dropped. | The proposal's central design rule — runtime engine forgetting consequences turns the promise/consequence engine into a goldfish. |
| Rule 6: No Silent Retcons | Story-bundle records are append-only via supersession (new record cites `supersedes`; original retained); world-canon retcon route is `canon-addition` via Phase 4.5 `canon_candidate` handoff (never elided). | Story-scope supersession is Rule 6 applied by analogy at story scope; world-scope Rule 6 is `canon-addition`'s territory. |
| Rule 7: Preserve Mystery Deliberately | Phase 4 storylet selection + delegated `storylet-pool-authoring` JIT gate set + Phase 4.5 per-claim authority routing + Phase 7 prose `mystery-risk` rejection + Phase 9 gate 1 backstop. | `forbidden`-status M resolutions hard-rejected at every enforcement point; whole-class M load powers storylet-pool-authoring's JIT gates and page-cycle's defense-in-depth checks. |
| Rule 11: No Spectator Castes by Accident | N/A at this skill's own emission surface; story-scope Rule 11 enforcement at the SLT level fires inside delegated `storylet-pool-authoring` `mode=jit` emission (see `storylet-pool-authoring` Phase 4 gate 14: arc-effect_model `fact_create` ops with world-level scope + populated `exception_governance` require ≥3 ordinary-actor leverage forms in `arc.notes`). | World-scope Rule 11 enforcement is `canon-addition` Phase 5 + `propose-new-canon-facts` (CF leverage-enumeration). Story-local cast capabilities inherit from the source CF's distribution + costs. |
| Rule 12: No Single-Trace Truths | N/A | Not applicable — same reasoning as Rule 2 / 3 / 11; the trace-multiplicity discipline applies to new world-level hard-canon truths, not to story-local imports/mutations. The enforcement surface is `canon-addition` + `propose-new-canon-facts`. |
| Canon Layering | Phase 5 SF mutations preserve `derived_from_cf` and `canon_relation`; Phase 4.5 firewall preserves Mystery Reserve layer; story-only entities (created via Phase 5 `cast_change` ops with `world_ent_id: null`) marked `story_only: true` (a soft-canon-local-to-story register, not promoted to any world canon layer without explicit `story-fact-promotion-to-canon`). | Story bundle is its own per-story layer below world canon. |
| Change Control Policy | N/A | Not applicable — canon-reading skill emits no Change Log Entries. Per FOUNDATIONS §Change Control Policy, "every approved change must get a record" applies to world-level canon mutations; story bundles are not world-level canon. The handoff is `canon-addition` for any later promotion via `story-fact-promotion-to-canon`. |

## Guardrails

- **HARD-GATE is bicameral** (see top of file). The Phase 10 gate over story-bundle writes is per-mode liftable (`authoring` shows; `interactive_runtime` and `batch_generation` auto-commit after Phase 9 PASS). The Phase 4.5 canon-promotion handoff to `story-fact-promotion-to-canon` is **absolute in every mode** — Auto Mode does not override it. A future maintainer "simplifying" the gate to a single absolute form would break the runtime use case the skill exists to support; one lifting Phase 4.5 in `interactive_runtime` for "consistency" would silently weaken the canon-mutation firewall. Both moves are wrong.
- **Never write world-level canon.** This skill never `Write`s or `Edit`s `worlds/<world-slug>/WORLD_KERNEL.md`, `ONTOLOGY.md`, or any `worlds/<world-slug>/_source/<world-subdir>/*.yaml` record. Hook 3 enforces the latter. No CF, CH, INV, M, OQ, ENT, or world-level SEC record is emitted by this skill — the Phase 4.5 `canon_candidate` route hands off to `story-fact-promotion-to-canon` for that.
- **Never read sibling-branch pages.** State assembly at Pre-flight reads only pages along `parent_page.branch_path`. Phase 9 gate 3 (recursive reference closure) is the structural enforcement; the read scope discipline at Pre-flight is the procedural enforcement. Both are load-bearing.
- **Records are append-only via supersession.** A new page that "updates" an existing OBL writes a NEW record citing `supersedes: OBL-NNNN`; the original record is never edited. The branch-replay contract depends on this.
- **Story-bundle YAML writes are engine-routed.** Direct `Write` to `worlds/<slug>/stories/<story-slug>/_source/<class>/*.yaml` is forbidden by Hook 3. Use `mcp__worldloom__submit_patch_plan` with story-bundle create ops after the Phase 10 gate or auto-commit validation path. Page prose and `INDEX.md` remain direct markdown surfaces.
- **Canon-mutation handoff sibling (existing, shipping)**:
  - **`story-fact-promotion-to-canon`** — the canon-mutation HARD-GATE handoff for Phase 4.5 `canon_candidate` resolutions. See `references/phase-4-storylet-and-mystery-authority.md` §Sibling-handoff seam for the pause-and-prompt protocol.
- **Existing siblings (audit feedback consumers)**:
  - **`branching-story-health-audit`** — consumes `narrative_health.flagged_for_audit` and high-JIT-rate signals to surface branches needing curation. Its `audit_focus=flagged_pages_priority` value prioritizes flagged branches, and its deliverable summary surfaces flagged-page and high-JIT-rate branch signals.
- **Sibling interop (existing)**:
  - **Consumes**: `branching-story-bootstrap` outputs (the story bundle this skill operates over).
  - **Consumes**: `storylet-pool-authoring` `mode=jit` as the Phase 4 fallback storylet generator. Page-cycle calls it with `parent_skill_invocation: true`, receives one branch-scoped `runtime_jit` SLT plus validation packet, applies the SLT in Phase 5, rechecks in Phase 9, and writes it in Phase 11 if the page tick commits.
  - **Consumes (own outputs across turns)**: this skill's PG-NNNN / SE-NNNN / CHC-NNNN / SF-NNNN / etc. records produced on prior turns are read on subsequent turns.
- **Content policy is a contract, not a setting.** The NC-21 block from this skill's `templates/content-policy.txt` is prepended verbatim to EVERY LLM prompt assembled by this skill — the parser, the proposer, the renderer, the prose render, the JIT storylet generator. `content_intensity_baseline` (`tame` / `mature` / `explicit`) is a routing tag for tone consistency within branches — never a censor. Phase 9 gate 6 is the structural backstop.
- **The LLM is never the continuity database.** All state lives in `worlds/<slug>/stories/<slug>/_source/*.yaml`; the LLM proposes structured outputs (parser → ProposedEvent; proposer → CHCs; renderer → prose) that the engine validates and commits. A maintainer who would rewrite a phase to "let the LLM track state" violates the proposal's load-bearing rule.
- **Worktree discipline**: if invoked inside a worktree, all paths resolve from the worktree root.
- **Do NOT commit to git.** Writes land in the working tree only; the user reviews the diff and commits.
