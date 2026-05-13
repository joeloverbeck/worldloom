# Streamlined Story Skills — Greenfield Plan

## Brainstorm Context

**Original request**: Analyze `reports/streamlined-story-pipelines/*` (eleven files authored by ChatGPT-Pro proposing a redesign of the worldloom story-skill family). The reports frame the redesign as a *migration* from the current six-skill family (`branching-story-bootstrap`, `branching-story-page-cycle`, `branching-story-page-prose-finalize`, `branching-story-health-audit`, `storylet-pool-authoring`, `story-fact-promotion-to-canon`). The user disagrees with the migration framing — they intend to **remove the existing skills outright and author new ones from zero**. This plan identifies every migration-flavored claim in the reports, resolves each from a greenfield perspective, and produces a clean blueprint that future `skill-creator` runs can consume.

**Reference files** (all under `reports/streamlined-story-pipelines/`):

- `00-STREAMLINED-PIPELINE-OVERVIEW.md`
- `01-SHARED-STORY-STATE-CONTRACT.md`
- `02-branching-story-bootstrap.md`
- `03-branching-story-turn-cycle.md`
- `04-branching-story-prose-attach.md`
- `05-commitment-block-authoring.md`
- `06-branching-story-health-audit.md`
- `07-story-fact-promotion-to-canon.md`
- `08-story-promotion-closeout.md`
- `09-MIGRATION-NOTES.md`
- `RESEARCH-MEMO.md`

**Key decisions that shaped the plan**:

1. *Considered* preserving the existing six-skill directories as `legacy-*` shells during a transition window; *chose* outright deletion because the user has zero existing live bundles to support (the single existing bundle `worlds/erotica-world/stories/red-bunny/` is being deleted as a legacy experiment).
2. *Considered* keeping `SLT.record_version: 3` and `shape: commitment_block` to honor the reports' compatibility framing; *chose* `record_version: 1` and no `shape:` discriminator because greenfield has no v2 history to acknowledge and one-shape discriminators are YAGNI dead weight.
3. *Considered* a per-skill brainstorming/*.md proposal batch as the deliverable; *chose* a single planning doc because the migration-strip work is the unit of value here — per-skill brainstorming proposals are the natural next step (Step 6 of this plan).

**Final confidence**: 88%, with assumptions resolved by user confirmation (existing bundle deleted; record_version = 1; old skills removed) plus author judgment on the `shape:` discriminator.

---

## A. Migration → Greenfield Triage

Every migration-flavored claim located in the reports, classified as:

- **DROP** — claim exists only to handle legacy state; in greenfield it has no referent and the entire claim is deleted.
- **STRIP-FRAMING** — substantive content survives, but "Removed from old X" / "replaces X" / "for compatibility" wrapping disappears because there is no old X.
- **KEEP-AS-WRITTEN** — claim is already greenfield-clean; no action needed.

| # | Source | Claim | Class | Greenfield resolution |
|---|---|---|---|---|
| 1 | `00-OVERVIEW.md` L17–26 | "Replacement skill set" table with `Replaces / changes` column | STRIP-FRAMING | Inventory the new skills with their scopes; drop the "replaces" column entirely. The replacement framing dies here. |
| 2 | `00-OVERVIEW.md` L28 | Header "What changes most" | STRIP-FRAMING | Reframe as "Architecture decisions" or "Core design moves". |
| 3 | `00-OVERVIEW.md` throughout | Phrases like "no pending-prose lifecycle", "no finalize placeholders" | STRIP-FRAMING | The page commits a state delta at plan time; prose attaches via receipt. Stated positively, not as a removal. |
| 4 | `01-CONTRACT.md` L35–36 | "`SLT` — storylet id class, now also used by `shape: commitment_block` records" | STRIP-FRAMING | "`SLT` — commitment block id class." Single sentence. |
| 5 | `01-CONTRACT.md` L177–181 | "New `SLT` records should use: `record_version: 3 shape: commitment_block`" | DROP-then-replace | Every `SLT` record is a commitment block. `record_version: 1`. No `shape:` field. |
| 6 | `01-CONTRACT.md` L225–226 | "Remove as required fields: `arc_contract`, `dramatic_unit`, `execution_envelope`, nested `effect_model`, separate `stop_policy`, and `ARC_TRACE` expectations" | DROP | These fields never exist in greenfield. The "remove" sentence has no referent. The `SLT` schema is defined positively. |
| 7 | `02-bootstrap.md` L184–192 | "Removed from old bootstrap" section | DROP | Entire section deleted. |
| 8 | `03-turn-cycle.md` L218–226 | "Removed from old page-cycle" section | DROP | Entire section deleted. |
| 9 | `04-prose-attach.md` L30 | "There is no requirement that `PG.prose_status == pending`; that field is deprecated" | DROP | `PG.prose_status` never exists. Sentence has no referent. |
| 10 | `04-prose-attach.md` L120–126 | "Removed from old finalize" section | DROP | Entire section deleted. |
| 11 | `05-commitment-block-authoring.md` L5–7 | "This replaces the broad `storylet-pool-authoring` workflow while keeping the `SLT` id class for compatibility" | STRIP-FRAMING | "This skill authors compact reusable commitment blocks (`SLT` records) for the story engine." |
| 12 | `05-commitment-block-authoring.md` L162–170 | "Removed from old storylet authoring" section | DROP | Entire section deleted. |
| 13 | `06-health-audit.md` L172–179 | "Removed from old health audit" section | DROP | Entire section deleted. |
| 14 | `07-promotion.md` L149–153 | "Removed from old promotion skill" section | DROP | Entire section deleted. |
| 15 | `07-promotion.md` L155–163 | "What closeout owns now" section | STRIP-FRAMING | Becomes the closeout skill's purpose statement, not a delta-from-old-promotion list. |
| 16 | `08-closeout.md` L78–81 | "Why this exists" — references "old promotion skill" | STRIP-FRAMING | "Splitting proposal creation from canon-handoff closeout keeps each half short and independently testable." |
| 17 | `09-MIGRATION-NOTES.md` §1 | "Keep existing records valid" + version-2 `scene_commitment_arc` shim guidance + "Existing `PG.prose_status` fields are ignored" + "Existing `ARC_TRACE` records remain historical audit artifacts" | DROP | Entire section deleted. No existing records to preserve. |
| 18 | `09-MIGRATION-NOTES.md` §2 | "Add `BEL` support / Backfill only when needed" | DROP | `BEL` is a day-one first-class record class; nothing to backfill. |
| 19 | `09-MIGRATION-NOTES.md` §3 | "Deprecate finalize as state mutation" + index repair guidance | DROP | No finalize to deprecate; no index to repair. |
| 20 | `09-MIGRATION-NOTES.md` §4 | "Remove `ARC_TRACE` dependence" + `mode: legacy_arc_trace` carve-out | DROP | `ARC_TRACE` is not a class at all. No legacy mode. |
| 21 | `09-MIGRATION-NOTES.md` §5 | "Shrink validation traces / Map old validation gates" table | DROP | Only the eight shared gates exist. No "old concern" column to map from. |
| 22 | `09-MIGRATION-NOTES.md` §6 | "Update skill names gradually / Recommended migration order" | DROP-then-replace | Replaced by §D Recommended authoring order below — sequencing is for fresh authoring, not phased migration. |
| 23 | `09-MIGRATION-NOTES.md` §7 | "Regression tests" — list of behaviors to test | STRIP-FRAMING | Same test specifications, but framed as **initial correctness tests** for the new skills, not regressions against an older pipeline. |
| 24 | `RESEARCH-MEMO.md` L43–45 | "Main critique of current pipelines" — frames findings as a correction of the old design | STRIP-FRAMING | Research findings stand independently as motivation for the new design; the "critique of current pipelines" framing goes. |

**Side artifacts in the reports** that have no migration content and need no resolution: `02-bootstrap.md` workflow body, `03-turn-cycle.md` workflow body, `04-prose-attach.md` workflow body, `05-commitment-block-authoring.md` workflow body, `06-health-audit.md` modes and workflow bodies, `07-promotion.md` workflow body, `08-closeout.md` workflow body, all `01-CONTRACT.md` schemas (after rows 4–6 are applied). These survive intact into the greenfield blueprint.

---

## B. Settled Greenfield Decisions

| Decision | Resolution | Rationale |
|---|---|---|
| Disposition of existing `worlds/erotica-world/stories/red-bunny/` bundle | User will delete | Legacy experiment with no continuation needs; removes the only forcing function for back-compat in the new skills. |
| Disposition of the six existing `.claude/skills/branching-*`, `storylet-pool-authoring`, `story-fact-promotion-to-canon` directories | Delete outright once new family is authored | No `legacy-*` shells; no transition window. |
| `SLT.record_version` value | `1` | No v2 / v3 history to acknowledge in greenfield. |
| `SLT.shape` discriminator field | Drop | Single shape (`commitment_block`); discriminator with one valid value is dead weight. Reintroduce if a second shape is ever needed. |
| Shared contract location | `.claude/skills/_shared-templates/story-state-contract.md` | Consistent with the existing `_shared-templates/page-plan.md` convention for cross-skill content. |
| Authoring artifact discipline | One `brainstorming/<skill>.md` proposal per new skill, then one `skill-creator` run per proposal | Mirrors the established meta-pipeline (per `archive/brainstorming/canon-addition.md`, `archive/brainstorming/create-base-world.md`). |
| Runaway-defense `max_words` ceiling on the SLT schema | Drop entirely | No `stop_policy` field in the greenfield SLT schema. The prose renderer is external to the engine; runaway-defense is not the engine's concern. Avoids dragging word-count enforcement back into the story-pipeline surface under a different name. |
| `SLT.effects.*` shape | CRUD mirror of `SE.state_delta`: `effects.create | supersede | close` | Reports 01 and 05 contradict on this field. Per schema-minimalism, drop the three specialized `_updates` buckets in 01 (supersession IS update); reject 05's per-class buckets (class typing is implicit in record IDs). Mirroring `SE.state_delta` lets the engine apply SLT effects through the same replay primitive that walks events. |

---

## C. Clean Greenfield Blueprint

For each artifact, the blueprint records: target path, scope summary, the load-bearing contract decisions (cleaned of migration framing), and the `skill-creator`-ready intent statement that the next-step `brainstorming/<skill>.md` proposal will expand on.

### C.0 Shared story state contract (not a skill)

- **Target path**: `.claude/skills/_shared-templates/story-state-contract.md`
- **Scope**: defines the authority model (world canon / story state / rendered prose), the record-class inventory (`STENT` / `STINT` / `SF` / `SE` / `OBL` / `CNSQ` / `THR` / `SREL` / `STLOC` / `STOBJ` / `DA` / `BR` / `PG` / `CHC` / `SLT` / `BEL`), the `BEL` schema, the `PG` snapshot schema, the `SE` event-delta schema, the `SLT` commitment-block schema, the prose-receipt schema, the eight shared hard gates, and the shared write order.
- **Load-bearing decisions**:
  - `BEL` is a day-one first-class record class; no backfill from `SF`. Its schema (per `01-CONTRACT.md` L45–66) is canonical.
  - `PG` has no `prose_status` field; `rendered_prose.path` and `rendered_prose.receipt_path` are informational nullable pointers.
  - `SLT` records are commitment blocks; `record_version: 1`, no `shape:` field, no `arc_contract` / `dramatic_unit` / `execution_envelope` / nested `effect_model` / separate `stop_policy`.
  - No `ARC_TRACE` class. No `arc-traces/` subdirectory in story bundles.
  - The eight shared hard gates: input legality, parent snapshot compatibility, mystery/invariant firewall, branch isolation, append-only delta, consequence capacity or terminal proof, plan grounding, canon promotion hold.
  - **Schema minimalism is doctrine** at this layer: every field in every story-record schema must be load-bearing — consumed by a validation gate, a replay primitive, a predicate, a fork operation, or recorded audit-trail discipline. The finalized field lists at §F.3 of this plan are the canonical reference; the `01-CONTRACT.md` shapes are the *starting* point, trimmed per §F.3.
- **Intent**: every state-changing story skill references this contract for schemas and gates; the contract is the only place where these are defined.

### C.1 `branching-story-bootstrap`

- **Target path**: `.claude/skills/branching-story-bootstrap/SKILL.md`
- **Scope**: creates a new story bundle, root causal state, root page snapshot, root prose plan, and first choices.
- **Load-bearing decisions**:
  - No prose-rendering lifecycle; `PG-0001` lands with `rendered_prose.path: null` and is immediately usable as the parent of turn-cycle.
  - Seed-commitment-block default is `minimal` (4–8 blocks); `none` defers all to runtime JIT; `standard` allows 8–14 blocks (cap).
  - Initial `BEL` records are mandatory for any premise that hinges on private knowledge, misconception, deception, or asymmetric witness.
  - Premise is normalized into a *state seed* (cast / location / pressure / private knowledge / contested claims / forbidden mysteries), **not** a dramatic-act structure. No mandatory midpoint reversals, climax structures, or fixed ending paths.
- **Intent**: bootstrap is a fast initializer. It does not author prose, does not pre-allocate a giant storylet pool, and does not promise lifecycle states that prose later fulfills.

### C.2 `branching-story-turn-cycle`

- **Target path**: `.claude/skills/branching-story-turn-cycle/SKILL.md`
- **Scope**: advances a story by one causal tick from any parent page (handles both continuation and forking). Consumes a selected `CHC` or free-form write-in, applies world logic, commits the resulting state delta, writes the next page snapshot, emits a renderer-facing prose plan, and emits next choices.
- **Load-bearing decisions**:
  - **Parent rendered prose is optional**. The authoritative input is `parent.state_snapshot`. `allow_unrendered_parent: true` by default.
  - Action routing has six outcomes (`accept` / `accommodate` / `attempt` / `world_block` / `promotion_hold` / `terminal`). **Silent rejection is forbidden** — even impossible actions produce a page plan that dramatizes the impossibility.
  - JIT commitment-block creation is a small local helper following the shared schema; it is **not** an embedded storylet-authoring workflow.
  - Deaths and removals are first-class outcomes. No "main-character protection" out-of-world logic.
  - `BEL` updates are mandatory whenever actions involve secrecy, betrayal, deception, violence, sex, law, status, or public ritual.
  - Page snapshot includes `visible_affordances[]`, `entity_status` per active `STENT`, `unresolved_mystery_claims[]`, `open_debt`, `continuation` status, and `state_hash`.
- **Intent**: the turn-cycle is the only state-mutation skill in normal operation. It is fast (compact YAML), self-contained per page, and never blocked on prose.

### C.3 `branching-story-prose-attach`

- **Target path**: `.claude/skills/branching-story-prose-attach/SKILL.md`
- **Scope**: validates and attaches external prose for an already-committed page; emits a prose receipt; updates the bundle index.
- **Load-bearing decisions**:
  - **Does not mutate `PG`**. Does not create `ARC_TRACE`. Does not emit a default `SE` event (optional `event_kind: prose_attach` only if the project enables it).
  - Receipt is the deliverable: `pages-prose-receipts/PG-NNNN.yaml` with `verdict: PASS | WARN | FAIL` over six deterministic checks + optional `craft_critic` mode.
  - Plan-hash / state-hash drift fails the receipt unless `accept_plan_drift=true`; drift is recorded in the receipt, not in `PG`.
  - On invented structural facts, the receipt's `repair_recommendation` routes to one of: `revise_prose`, `run_turn_cycle_repair`, `run_story_fact_promotion_to_canon`. Never silent acceptance.
- **Intent**: prose-attach is an *audit and indexing* step, not a state engine. Strict mode is opt-in.

### C.4 `commitment-block-authoring`

- **Target path**: `.claude/skills/commitment-block-authoring/SKILL.md`
- **Scope**: creates compact reusable commitment blocks (`SLT` records) in three modes: `direct_batch` (small author-pool batch), `audit_repair` (consume `RSP-NNNN` requests from health audit), `in_memory_jit` (single branch-scoped block for turn-cycle; no writes).
- **Load-bearing decisions**:
  - Bootstrap seeds 4–8 blocks; `direct_batch` defaults to 6 (max 12). Runtime JIT is the expected pattern for unforeseen actions.
  - Closed predicate DSL (10 predicates: `fact_true`, `belief`, `entity_status`, `relationship_axis`, `obligation_open`, `consequence_pending`, `thread_active`, `location`, `has_affordance`, plus `all[]` / `any[]` / `not[]`). No free-form predicate prose.
  - Six per-block validation gates: schema completeness, predicate parse, branch-scope legality, mystery/invariant firewall, effect legality, exit-option grounding.
  - Diversity gates apply only to `direct_batch`: purposes are not all the same; at least one aftermath block; at least one block changes belief or relationship state; no block depends on branch-local records unless branch-scoped.
  - **`effects.*` shape**: `effects.create | supersede | close`, mirroring `SE.state_delta`. No specialized `_updates` buckets — supersession IS update. Record class is implicit in record IDs. No `required_context` block (redundant with predicate preconditions). No `record_version` / `shape` discriminator. No `stop_policy` (runaway-defense ceiling dropped entirely; the engine does not enforce word counts).
- **Intent**: commitment blocks are small causal moves with preconditions / beats / effects / exits / saliency. They are not acts, arcs, or mini story skeletons.

### C.5 `branching-story-health-audit`

- **Target path**: `.claude/skills/branching-story-health-audit/SKILL.md`
- **Scope**: diagnoses story-bundle health. Four modes: `structural` (default — replay, snapshots, branch isolation, debt, continuation, mystery/canon safety, belief visibility), `prose` (compare rendered prose and receipts against committed state), `remediation` (draft `RSP-NNNN` repair-request cards for `commitment-block-authoring mode=audit_repair`), `cross_story` (world-level contradiction scan).
- **Load-bearing decisions**:
  - Default audit is structural-only and fast (deterministic; no LLM semantic pass).
  - Modes can be combined, but the report must state which checks ran.
  - The audit never mutates story state or world canon.
  - `RSP-NNNN` cards do **not** draft full commitment blocks; they are repair requests with `repair_kind`, `target_records[]`, `target_branch`, `rationale`, `suggested_block_purpose`, `visibility`.
- **Intent**: cheap default; opt-in heavyweight modes.

### C.6 `story-fact-promotion-to-canon`

- **Target path**: `.claude/skills/story-fact-promotion-to-canon/SKILL.md`
- **Scope**: creates a proposal package for promoting a branch-local story claim into world canon. **Ends after proposal creation.**
- **Load-bearing decisions**:
  - One common proposal flow over six source kinds (`story_fact`, `mystery_resolution`, `character_outcome`, `artifact_canonization`, `relationship_or_institutional_outcome`, `other_branch_claim`); source kind changes required evidence, not workflow shape.
  - Supporting evidence pages must have rendered prose and `PASS` or `WARN` receipts when prose is part of the evidence; `FAIL` requires explicit user acceptance.
  - Forbidden mysteries cannot be promoted; branch-local truth is evidence, not authority.
  - Scope-inflation check is mandatory: "is this true only in this branch / location / time / faction / narrator?"
  - HARD-GATE: always show the proposal to the user; no execution-mode bypass.
  - **No** post-adjudication closeout in this skill. After approval, the skill writes the proposal package and instructs the caller to run `canon-addition` separately.
- **Intent**: assemble a CF-shaped candidate with scope-inflation + mystery-firewall reports; hand off to `canon-addition`.

### C.7 `story-promotion-closeout`

- **Target path**: `.claude/skills/story-promotion-closeout/SKILL.md`
- **Scope**: closes a story promotion after `canon-addition` adjudication — records the verdict, links new CF/CH/PA ids on superseding story-local records, optionally flags or archives contradictory same-story branches.
- **Load-bearing decisions**:
  - Inputs include `canon_addition_verdict: accepted | accepted_with_limits | rejected | deferred`; on accepted outcomes, `linked_cf_ids[]`, `linked_ch_ids[]`, `linked_pa_ids[]` are required.
  - Story-local effects supersede `SF` / `BEL` / `DA` / `STENT` / `SREL` / `BR` as needed; rejected outcomes preserve the claim as branch-local / contested / counterfactual.
  - **No world-canon mutation.** Branch archive/flag actions only affect same-story branches.
  - Optional `SE` with `event_kind: promotion_closeout`.
- **Intent**: small, sharply-scoped closeout. Inputs are the canon-addition verdict; outputs are story-local supersedes plus index updates.

---

## D. Recommended Authoring Order

Greenfield sequencing — not migration phasing. Each step produces durable artifacts the next steps consume.

1. **Delete the existing surface** — `worlds/erotica-world/stories/red-bunny/` (the legacy story bundle) and the six legacy skill directories (`branching-story-bootstrap/`, `branching-story-page-cycle/`, `branching-story-page-prose-finalize/`, `branching-story-health-audit/`, `storylet-pool-authoring/`, `story-fact-promotion-to-canon/`). Also delete any cross-references in CLAUDE.md, MEMORY.md, `.claude/skills/_shared-templates/page-plan.md`, or sibling skills that point at the deleted skills.
2. **Author the shared contract** at `.claude/skills/_shared-templates/story-state-contract.md` — schemas (BEL, PG, SE, SLT, prose-receipt) + the eight shared hard gates + shared write order. This is referenced by every state-changing skill, so it must exist first.
3. **Write `brainstorming/branching-story-bootstrap.md`** → run `skill-creator` → produces `.claude/skills/branching-story-bootstrap/SKILL.md` and templates.
4. **Write `brainstorming/branching-story-turn-cycle.md`** → run `skill-creator`.
5. **Write `brainstorming/branching-story-prose-attach.md`** → run `skill-creator`.
6. **Write `brainstorming/commitment-block-authoring.md`** → run `skill-creator`. (Bootstrap and turn-cycle reference it for JIT and seed pool, so it should land before any live story bundle is created.)
7. **Write `brainstorming/branching-story-health-audit.md`** → run `skill-creator`.
8. **Write `brainstorming/story-fact-promotion-to-canon.md`** → run `skill-creator`.
9. **Write `brainstorming/story-promotion-closeout.md`** → run `skill-creator`.
10. **Update repository-level docs** — `CLAUDE.md`'s §Skill Architecture and §Repository Layout to reflect the new skill names (rename `branching-story-page-cycle` → `branching-story-turn-cycle`; rename `branching-story-page-prose-finalize` → `branching-story-prose-attach`; rename `storylet-pool-authoring` → `commitment-block-authoring`; add `story-promotion-closeout`); `docs/WORKFLOWS.md` for invocation forms; `docs/FOUNDATIONS.md` per §F below — §F.1 stale-reference cleanup is mandatory the moment the legacy artifacts are deleted; §F.2 new-principle enshrinement is recommended; §F.3 finalized field lists land in the shared story state contract with FOUNDATIONS pointing at it as authoritative.

Steps 3–9 do **not** strictly require sequential execution, but bootstrap and turn-cycle benefit from having the commitment-block schema settled (step 6) before they enumerate seed-pool and JIT semantics — so a practical ordering is 3-then-6-first, with 4/5/7/8/9 in any order after.

---

## E. Pre-Skill-Creator Action Items

These are the items the user (or a follow-up brainstorm) needs to address before the per-skill `brainstorming/*.md` proposals can be authored cleanly:

1. **Delete `worlds/erotica-world/stories/red-bunny/`** (user-stated intent; not auto-done by this plan).
2. **Audit `.claude/skills/_shared-templates/page-plan.md`** — the existing template is referenced by both `branching-story-bootstrap` and `branching-story-page-cycle`. Confirm whether the template's contract survives unchanged into the new skills, or whether the new shared-contract doc replaces / supersedes it. If superseded, schedule deletion alongside the legacy skill directories in step 1 of §D. (Per MEMORY.md: `_shared-templates/page-plan.md:11-14` commits §2 / §3 / §19 as inlined verbatim from `reports/prose-quality-instructions.md` — the verbatim commitment must either survive into the new shared contract or be explicitly retired.)
3. **Confirm the shared contract's host directory**: `.claude/skills/_shared-templates/story-state-contract.md` (recommended) vs. `docs/STORY-STATE-CONTRACT.md` (alternative — promotes it from a templating artifact to a first-class design doc).
4. **Confirm `RSP-NNNN` id-class preservation**: the audit→remediation→commitment-block-authoring loop reuses `RSP-NNNN` ids per CLAUDE.md's allocation conventions. The new family preserves the id class (no renaming). Confirm.
5. **Confirm `_source/` subdirectory layout for the new family**: existing `worlds/<slug>/stories/<story-slug>/_source/` has 15 class-subdirs (per CLAUDE.md). The new family adds a `beliefs/` subdir for `BEL-NNNN.yaml` records and removes `arc-traces/`. Final subdir count: 15 (15 original − 1 removed + 1 added). Confirm the per-class subdir naming for beliefs (`beliefs/` recommended, mirroring `facts/`, `events/`, etc.).
6. **Confirm `pages-prose-receipts/` directory exists in the bundle layout** — net-new directory introduced by `branching-story-prose-attach`. Add to CLAUDE.md §Repository Layout under the per-bundle layout.
7. **Confirm `mcp__worldloom__allocate_next_id` id-class registration** for the new `BEL` class — the allocator (per CLAUDE.md §Skill Architecture) needs `BEL-NNNN` added to its scoped-class table. Whether this is in scope for this plan or a separate `tools/world-mcp` ticket depends on whether the allocator is currently extensible by skill-authoring alone or requires a code change.

Items 1, 4, 5, 6 are routine confirmations. Items 2, 3, 7 may surface as separate tickets if they involve cross-package work.

---

## F. FOUNDATIONS.md Amendments

The new story-skill family teaches three things `docs/FOUNDATIONS.md` should encode: which existing references it makes are no longer valid (§F.1), which new principles it has learned and should enshrine (§F.2), and which fields in the new story-record schemas are load-bearing vs. nice-to-have (§F.3). The schema-minimalism principle is the user's explicit ask: every field in a story-bundle record schema costs LLM tokens at authoring time and at retrieval, so the schema must justify each field through gate / predicate / fork / audit consumption.

Amendments land in FOUNDATIONS.md as the last step of §D (after the new skill family is authored). Until then, FOUNDATIONS.md remains the authoritative document for the still-live legacy family; the amendments below describe the target state, not the current state.

### F.1 Stale references requiring cleanup

| Line(s) in FOUNDATIONS.md | Current content (summarized) | Target rewrite |
|---|---|---|
| L388 (Rule 1) | "A plan IS load-bearing engine output ... consumed by Phase 7.5 declared-affordance validation, Phase 9 `plan_completeness_check`, Phase 9.5 `plan_self_containment`, and `branching-story-page-prose-finalize` Phase 1 plan/prose pairing." | "A plan IS load-bearing engine output. The story-pipeline `pages-prose-plans/PG-NNNN.md` artifact is validated by the shared eight hard gates (plan grounding is gate 7) at page-plan commit. Rule 1's grounding requirements apply to the plan as engine artifact independent of whether prose has yet been rendered." |
| L430–434 (Rule 7) | "Firewall split for the plan + finalize pipeline. Mystery firewall enforcement now runs at two times: Plan-time ... Finalize-time ... `branching-story-page-prose-finalize` Phase 3 ..." | "Mystery firewall is enforced at plan time as gate 3 (mystery/invariant firewall) of the shared eight hard gates in every state-changing story skill. The deterministic forbidden-mystery-resolution check inside `branching-story-prose-attach` is a redundant downstream guard on rendered prose, not a second authoritative gate. Forbidden-status `M` is NEVER resolved at either site." |
| §Story Bundles §1 L538 | "...intentions, locations, objects, pages, branches, choices, storylets, and artifacts." | Append "and beliefs" so the inventory reads "...storylets, artifacts, and beliefs." |
| §Story Bundles §4 L558 entire "Pipeline shape: plan + finalize" paragraph | References finalize-time validators (`prose_ledger_consistency`, `arc_trace_evidence_alignment`, `prose_critic_8_axis`), ARC_TRACE record emission, and the strict serialization "bootstrap-plan or page-cycle-plan → external prose render → finalize → next plan." | "**Pipeline shape: plan + (optional) prose-attach.** Story state is authoritative at page-plan commit; rendered prose is a renderable receipt artifact, not a second state-transition workflow. `branching-story-turn-cycle` may advance the story from any committed page snapshot without requiring rendered parent prose; `branching-story-prose-attach` validates rendered prose against the plan and emits a `pages-prose-receipts/PG-NNNN.yaml` receipt without mutating page state. No ARC_TRACE class. World-canon mutation remains exclusive to `story-fact-promotion-to-canon`, which hands the candidate to `canon-addition`; `story-promotion-closeout` records the verdict on story-local records after adjudication." |
| §Story Bundles §5 L562 | "SLT records require `mystery_safety`, `provenance`, `visibility`, predicate-DSL preconditions, and structured fact / relationship effects per `storylet-pool-authoring/templates/storylet-record.yaml`." | "SLT records require `mystery_policy`, `provenance.origin`, `scope.visibility`, `preconditions.hard|soft` (in the closed predicate DSL), and `effects.create|supersede|close` (mirroring `SE.state_delta`) per the shared story state contract at `.claude/skills/_shared-templates/story-state-contract.md`." |
| §Story Bundles §5 L568 | "story-local `M_resolution_claims` authority discipline: `apparent`, `branch_local_counterfactual`, and `canon_candidate` claims remain separate." | "story-local `unresolved_mystery_claims` (on `PG.state_snapshot`) and `mystery_policy.allowed_authority` (on commitment blocks) authority discipline: `apparent`, `branch_local_counterfactual`, and `canon_candidate` claims remain separate." |
| §Story Bundles §6 L574 | "...STENT, SF, SE, OBL, CNSQ, THR, SREL, STINT, STLOC, STOBJ, BR, PG, CHC, SLT, and SLB." | Insert `BEL`: "...STENT, SF, SE, OBL, CNSQ, THR, SREL, STINT, STLOC, STOBJ, BEL, BR, PG, CHC, SLT, and SLB." |
| §Story Bundles §7 L580 | "The five story-pipeline skills constitute Skill Category 2c: `branching-story-bootstrap`, `branching-story-page-cycle`, `storylet-pool-authoring`, `branching-story-health-audit`, and `story-fact-promotion-to-canon`." | "The seven story-pipeline skills constitute Skill Category 2c: `branching-story-bootstrap`, `branching-story-turn-cycle`, `branching-story-prose-attach`, `commitment-block-authoring`, `branching-story-health-audit`, `story-fact-promotion-to-canon`, and `story-promotion-closeout`." |
| §Story Bundles §7 L582 | "Sibling-scan ... the predicate DSL, the STENT `role_in_story` enum, the `state_snapshot` schema, the RSP card schema, and the shared `content_policy` block." | Replace "the predicate DSL" with "the closed 10-predicate DSL" and "the `state_snapshot` schema" with "the `PG.state_snapshot` schema (per the shared story state contract)". Other items unchanged. |
| §Story Bundles §9 L596 | Lists the same five legacy skills + cross-references `branching-story-page-cycle/references/prose-craft-contract.md`. | Update the skill list to the seven-skill greenfield set; re-anchor the prose-craft-contract reference to its new home (recommended: fold into `_shared-templates/story-state-contract.md` as a §Prose Craft sub-section, or carry it forward as `branching-story-turn-cycle/references/prose-craft-contract.md`). |
| §Story Bundles §9 L598–604 entire "Engine-side runaway-defense exception" paragraph | "an engine-only `arc.stop_policy.safety_valves.max_words` ceiling IS permitted on storylet `stop_policy` as runaway-defense, with a strict shape..." | **DELETE the entire paragraph.** No `stop_policy` field on the greenfield SLT schema; no `max_words` ceiling anywhere in the story-pipeline surface. The §9 archived-reassessment references (commit `b28aead` 2026-05-06 + archived SPEC-20 §H 2026-05-07) at L592–594 are retained as historical justification for the no-word-count discipline; the engine-side exception is dropped because its anchor field no longer exists. |

### F.2 New principles to enshrine

Five principles teach durable doctrine that should land in FOUNDATIONS.md as positive statements, not migration deltas:

1. **State-authority boundary** (recommended location: new §Story Bundles §4a "Plan-Authority Boundary"). Story state is authoritative at page-plan commit. Rendered prose is a rendering of that state, not a second state engine. Page snapshots are the fork primitive; any committed page is a valid parent for `branching-story-turn-cycle`, regardless of whether its prose has been rendered. This is the single most important architectural lesson of the redesign and prevents the original plan-then-finalize coupling from recurring.

2. **`BEL` semantics** (recommended location: new §Story Bundles §6a "Belief vs. Fact"). `SF` records what is true in the branch; `BEL` records what a holder believes, claims, witnesses, suspects, denies, or is deceived about. The two classes are kept separate so that lies, secrets, betrayals, witness asymmetry, and contested public claims remain coherent without inventing plot rails. `BEL.truth_relation` (`true | false | partly_true | unknown | contested | branch_counterfactual`) distinguishes belief from truth; `BEL.visibility` (`private | shared | public | concealed | suppressed`) is consumed by the social-state firewall.

3. **Commitment-block discipline** (recommended location: new §Story Bundles §5a "Commitment Blocks Are Causal Moves"). SLT records are reusable causal moves with preconditions, beats, effects, exits, and saliency — not dramatic acts, not arcs, not mini-stories, not plot rails. The schema explicitly forbids `arc_contract`, `dramatic_unit`, `execution_envelope`, nested `effect_model`, `stop_policy`, `record_version` discriminators above `1`, and `shape:` discriminators (until a second shape is ever needed). Each block's `effects.*` mirrors `SE.state_delta` (create / supersede / close).

4. **Schema-minimalism at story scope** (recommended location: new §Story Bundles §5b "Schema-Minimalism"). Every field in every story-bundle record schema (`BEL`, `PG`, `SE`, `SLT`, prose receipt) must be load-bearing — directly consumed by a validation gate, a replay primitive, a predicate, a fork operation, or recorded audit-trail discipline. Nice-to-have fields are dropped, because each field costs LLM tokens to author at every record and to read at every retrieval. The canonical field lists for the five core story-bundle schemas live in the shared story state contract at `.claude/skills/_shared-templates/story-state-contract.md`, derived from the reports' schemas trimmed per §F.3 of this plan.

5. **No-ARC_TRACE policy** (folds into principle 1 or stands alone as a short addendum to §Story Bundles §4a). There is no parallel "did the prose realize the planned arc" state engine. Prose deviating from plan is routed by `branching-story-prose-attach` as either a prose-quality issue (revise prose), a structural-fact issue (run a repair turn), or a canon-candidate (run promotion). Never a second state-transition pass.

### F.3 Schema-minimalism audit — finalized field lists

The audit below is the canonical field list for the five core story-bundle record classes. Fields not listed are dropped; fields marked `*` are required, fields without `*` are optional with documented defaults. These lists supersede the schemas in `01-CONTRACT.md` and should land verbatim in `.claude/skills/_shared-templates/story-state-contract.md`.

**`BEL` record** (down from 16 sub-paths in `01-CONTRACT.md` to 12):

- `id*`, `story_id*`, `created_at_page*`, `supersedes` (default null)
- `holder*`, `claim*`, `truth_relation*`, `confidence*`, `visibility*`
- `basis.source_event*`
- `consequences.opens[]`, `consequences.constrains_choices[]`

Dropped: `basis.witnessed_page`, `basis.told_by`, `basis.inferred_from` (collapse into `basis.source_event` — the source event is the strongest replay anchor; the three semantic refinements are nice-to-have). `notes` (the canonical example of nice-to-have; story records are append-only at the file level per §Story Bundles §8, so Rule-6-style retcon-discipline-on-notes does not apply at story scope).

**`PG` record** (down from ~27 sub-paths to ~21):

- `id*`, `story_id*`, `branch_id*`, `parent_page_id*`, `turn_index*`
- `input.choice_id` ⊕ `input.manual_action_text` (exactly one is non-null), `input.resolved_event_id*`
- `state_hash_parent`, `state_hash*`
- `state_snapshot.active_records*` (per-class lists, including `BEL`)
- `state_snapshot.entity_status*`
- `state_snapshot.visible_affordances*[]` with `id` as a page-local ordinal (not an allocated `AFF-PG-NNNN-NN`), `label*`, `grounded_in*`, `available_to*`, `action_families*`
- `state_snapshot.unresolved_mystery_claims*[]`
- `state_snapshot.continuation*`
- `plan.path*`, `plan.plan_hash*`
- `rendered_prose.path` (default null), `rendered_prose.receipt_path` (default null)
- `emitted_choices[]*`
- `validation_trace*` (one entry per shared gate, each carrying `PASS` + one-line rationale per CLAUDE.md)

Dropped: `input.kind` (implicit in which of `choice_id` / `manual_action_text` is non-null); `canon_revision_at_plan_time` (YAGNI; reintroduce only if cross-revision replay surfaces as a real problem); `state_snapshot.open_debt` (derivable from `state_snapshot.active_records.OBL / CNSQ / THR`); `state_delta_summary.creates / supersedes / closes` (`SE.state_delta` is the authoritative replay primitive; rollup on PG is pure redundancy).

**`SE` event** (down from ~16 sub-paths to ~12):

- `id*`, `story_id*`, `created_at_page*`, `parent_page_id*`, `event_kind*`
- `actor*`, `targets[]`
- `outcome_route*`, `world_logic_rationale*`
- `state_delta.create[]`, `state_delta.supersede[]`, `state_delta.close[]`
- `promotion_claims[]` with `source_record*` and `authority*` per entry

Dropped: `input_surface.choice_id`, `input_surface.manual_action_text` (`PG.input` is the authoritative link; SE doesn't need to re-store); `state_delta.no_change[]` (absence from create / supersede / close IS the no-change signal); `promotion_claims[].required_action` (implied by `authority == canon_candidate`).

**`SLT` commitment block** (down from ~29 sub-paths to ~18):

- `id*`, `story_id*`
- `scope.visibility*` (`author_pool | branch_scoped`), `scope.branch_id` (null for `author_pool`)
- `created_at_page` (null for `author_pool`)
- `title*`, `purpose*` (12-value enum)
- `preconditions.hard*`, `preconditions.soft`
- `beats[]*` with `beat_id*`, `function*`, `instruction*` per beat (1–5 beats per block)
- `effects.create[]`, `effects.supersede[]`, `effects.close[]` (mirrors `SE.state_delta`)
- `exit_options[]*` with `intent*`, `surface_hint*`, `likely_effects` per option
- `saliency.urgency*`, `saliency.cooldown_pages*`, `saliency.tags[]` (retained — enables batch queries during authoring; bounded cost)
- `mystery_policy.forbidden_resolutions[]`, `mystery_policy.allowed_authority*`
- `provenance.origin*` (`bootstrap_seed | author_batch | audit_repair | runtime_jit`)

Dropped: `record_version`, `shape` (decided in §B); `required_context.cast / locations / objects / beliefs` (redundant with predicate preconditions like `entity_status`, `location`, `belief`); `effects.belief_updates / relationship_updates / consequence_updates` (collapse into `effects.create | supersede | close`); `stop_policy` and its `safety_valves.max_words` ceiling (decided in §B — engine does not enforce word counts).

**Prose receipt** (already minimal in the reports; no trims):

- `page_id*`, `story_id*`, `plan_path*`, `prose_path*`, `plan_hash*`, `prose_hash*`, `state_hash_at_plan_time*`, `checked_at*`, `strict*`, `verdict*`
- `checks` block with deterministic-check sub-fields (`engine_jargon_leak`, `forbidden_mystery_resolution`, `required_event_rendered`, `entity_status_consistency`, `invented_structural_fact`, `canon_claim_without_authority`, `craft_critic`)
- `notes[]`, `repair_recommendation`

### F.4 Sequencing

The FOUNDATIONS amendments land at §D step 10, after the new skill family is authored. Within step 10:

- **10a.** Apply §F.1 stale-reference cleanup (mandatory the moment the legacy artifacts are deleted; otherwise FOUNDATIONS would reference deleted skill paths and dead phase IDs).
- **10b.** Apply §F.2 new-principle enshrinement (recommended — these capture the durable design wins; defer only if you want the family shaken down in practice first).
- **10c.** Apply §F.3 finalized field lists by writing the shared story state contract at `.claude/skills/_shared-templates/story-state-contract.md` (the contract becomes the canonical schema reference); update FOUNDATIONS §Story Bundles §5b to point at it as authoritative.

§F.1 cleanup is non-negotiable once the legacy artifacts are gone. §F.2 enshrinement is recommended on the same pass to lock in the architectural lessons before drift sets in. §F.3 is non-negotiable for the new skill family to function at all (the schemas are the contract).
