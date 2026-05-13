# commitment-block-authoring

## Purpose

Create compact reusable commitment blocks (`SLT` records) for the author pool of a branching-story bundle. The skill produces small causal moves with preconditions, beats, effects, exit options, and saliency — the building blocks that `branching-story-turn-cycle` selects from during action routing.

Two user-invocable modes:

1. **`direct_batch`** — create a fresh batch of author-pool commitment blocks targeting coverage gaps in the bundle's current pool.
2. **`audit_repair`** — consume `RSP-NNNN` (remediation-storylet-proposal) cards emitted by `branching-story-health-audit`'s remediation mode and create blocks addressing the audit's findings.

Commitment blocks are reusable causal moves, **NOT** dramatic acts, arcs, mini-stories, or plot rails per FOUNDATIONS §Story Bundles §5a (Commitment Blocks Are Causal Moves). A good block says: *"when these conditions hold, this kind of action can happen, these beats dramatize it, these state effects follow."* A bad block says: *"advance Act II"* or *"raise stakes before midpoint."*

Commitment-block-authoring is the fourth skill in the rebuilt story-skill family per `docs/plans/2026-05-13-streamlined-story-skills-greenfield-plan.md`. Every record drafted by this skill conforms to `.claude/skills/_shared-templates/story-state-contract.md` §4.4 (SLT schema) + §5 (closed predicate DSL).

## Inputs

Required (all modes):

- `world_slug` — existing world directory slug under `worlds/`.
- `story_slug` — existing story bundle slug under `worlds/<world_slug>/stories/`.
- `mode` — `direct_batch | audit_repair`.

Mode-specific:

- `direct_batch`:
  - `target_count` — integer; default `6`, max `12`. Number of new SLT records to create. Bootstrap's `seed_commitment_blocks: minimal` mode authors 4–8; `direct_batch` defaults match the typical author-pool growth increment.
  - `focus` — optional natural-language hint guiding which purposes / action families the batch should emphasize (e.g., "post-violence reflection arc", "investigation phase coverage", "intimacy escalation pathways"). The diversity gate at Phase 4 enforces minimum spread regardless.

- `audit_repair`:
  - `audit_id` — `SAU-NNNN` of the source health-audit report.
  - `finding_ids` — list of `RSP-NNNN` ids to address. The skill creates one SLT block per RSP card.

## Output Bundle

Patch-engine story records (submitted via `mcp__worldloom__submit_patch_plan` per shared contract §10):

- `SLT-NNNN` records — `target_count` blocks (direct_batch) OR `len(finding_ids)` blocks (audit_repair).

Direct-write markdown:

- `worlds/<world_slug>/stories/<story_slug>/storylet-batches/SLB-NNNN.md` — batch manifest naming the SLT ids created, the source RSP ids (audit_repair only), the focus hint (direct_batch only), and the per-block validation traces.
- `worlds/<world_slug>/stories/<story_slug>/INDEX.md` — bundle index updated last.

All SLT records in a batch share the same `provenance.origin` value: `author_batch` for `direct_batch`, `audit_repair` for `audit_repair`.

## Pre-Flight

1. **Load FOUNDATIONS** — `docs/FOUNDATIONS.md`. §Story Bundles §5 (Validation Rules at Story Scope), §5a (Commitment Blocks Are Causal Moves), §5b (Schema-Minimalism), §6a (Belief vs. Fact), §9 (Prose Length Discipline) govern this skill.
2. **Load the shared contract** — `.claude/skills/_shared-templates/story-state-contract.md`. §4.4 SLT schema (the canonical record shape), §5 closed predicate DSL (the 10-predicate language for preconditions), §10 write order, §11 mystery and canon authority.
3. **Resolve the bundle** — `worlds/<world_slug>/stories/<story_slug>/` must exist with `STORY_KERNEL.md`, `_source/`, and `_source/storylets/` (the latter may be absent on first invocation post-bootstrap if `seed_commitment_blocks: none`).
4. **Mode-specific resolution**:
   - `direct_batch`: load the bundle's current SLT pool (every `_source/storylets/SLT-*.yaml`) for coverage-gap analysis.
   - `audit_repair`: resolve `worlds/<world_slug>/stories/<story_slug>/audits/<audit_id>-*.md` (the source audit report) AND load each RSP card from `audits/<audit_id>/remediation-storylet-proposals/RSP-*.md`. Abort with audit-not-found or rsp-not-found error on any missing reference.
5. **Allocate ids** via `mcp__worldloom__allocate_next_id(world_slug, id_class, story_slug=<story_slug>)`:
   - `SLT` ids for each block to be created.
   - One `SLB` id for the batch manifest.
6. **Load world canon context** via `mcp__worldloom__get_context_packet(world_slug, task_type='commitment_block_authoring', seed_nodes=<active cast + mystery reserve forbidden-status entries + open obligations / threads in the bundle>, token_budget=<default>)` — MCPENH-041 lands the `commitment_block_authoring` task_type rename; see Guardrails §Known integration debt.
7. **HARD-GATE deferral** — the HARD-GATE fires at Phase 6 (Commit / Write) AFTER the blocks + manifest are drafted in working memory. The user reviews the full batch before any patch submission.

## Phases

### Phase 1: Diagnose coverage gaps (`direct_batch`) OR load RSP cards (`audit_repair`)

**`direct_batch`**: Analyze the current SLT pool (loaded in Pre-flight step 4) against the bundle's narrative needs. Identify gaps by **causal function**, not by arc taxonomy:

- No aftermath block for violence / death / sex / betrayal outcomes.
- No belief-repair block after deception or public discovery.
- No movement / escape block.
- No relationship-pressure block (intimacy, conflict, alliance, severance).
- No consequence-payoff block (delivering on a pending `CNSQ`).
- No terminal / closure block.
- No fallback continuation block (lets turn-cycle proceed when no specific block matches).
- No information-seeking / investigation block.
- No reveal / disclosure block.
- No refusal / declination block.
- No negotiation / bargain block.

If a `focus` hint was supplied, weight the gap diagnosis toward the named focus area. The diversity gate at Phase 4 still enforces minimum spread regardless of `focus`.

Output: a list of `target_count` planned blocks, each with a `purpose` value from the 12-purpose enum (per shared contract §4.4) and a brief draft scope (preconditions sketch, beat outline, effects shape).

**`audit_repair`**: For each `RSP-NNNN` card in `finding_ids`, load the card's:

- `repair_kind` — `commitment_block | turn_repair | prose_revision | promotion | branch_flag` (commit-block-authoring handles `commitment_block` and ignores other kinds with a warning).
- `target_records` — records the block should engage with.
- `target_branch` — `BR-NNNN` or null (author-pool when null).
- `rationale` — natural-language reason from the audit.
- `suggested_block_purpose` — from the 12-purpose enum.
- `visibility` — `author_pool | branch_scoped`.

Each card maps 1:1 to one planned block. Cards whose `repair_kind` is not `commitment_block` produce a warning ("RSP-NNNN is repair_kind=<X>; not handled by commitment-block-authoring; recommend `<sibling-skill>` instead") and are skipped.

### Phase 2: Draft commitment blocks

For each planned block (from Phase 1), draft a full `SLT` record per shared contract §4.4:

```yaml
id: SLT-NNNN
story_id: STORY-NNNN
scope:
  visibility: author_pool | branch_scoped   # branch_scoped only when audit_repair RSP card specifies it
  branch_id: BR-NNNN | null
created_at_page: null   # null for author_batch and audit_repair; runtime_jit case lives in turn-cycle Phase 2
title: <short descriptive title>
purpose: aftermath | escalation | reveal | refusal | negotiation | flight | investigation | intimacy | conflict | repair | closure | transition
preconditions:
  hard: [<predicate per shared contract §5>]
  soft: [<predicate per shared contract §5>]
beats:
  - beat_id: B1
    function: setup | pressure | turn | consequence | exit
    instruction: >
      <prose-facing beat instruction, no engine jargon>
  # 1-5 beats per block
effects:
  create: [<record id placeholder; resolved at runtime>]
  supersede: [<record id placeholder>]
  close: [<record id placeholder>]
exit_options:
  - intent: flee | confront | confess | hide | ask | attack | spare | bargain | wait | custom
    surface_hint: <player-visible label>
    likely_effects: [<short label>]
saliency:
  urgency: low | medium | high
  cooldown_pages: 0   # default; integer
  tags: [<string>]   # optional; queryable hints
mystery_policy:
  forbidden_resolutions: [M-NNNN]   # mysteries this block must not resolve
  allowed_authority: apparent | branch_local_counterfactual | canon_candidate | none
provenance:
  origin: author_batch | audit_repair   # never runtime_jit for this skill; that origin is turn-cycle's
```

**Predicate DSL discipline** (per shared contract §5): predicates use the closed 10-predicate set (`fact_true`, `belief`, `entity_status`, `relationship_axis`, `obligation_open`, `consequence_pending`, `thread_active`, `location`, `has_affordance`, plus `all[]` / `any[]` / `not[]` combinators). No free-form predicate prose.

**Beat discipline**: 1–5 beats per block. Each beat names a `function` (setup / pressure / turn / consequence / exit) and a prose-facing instruction that the renderer can dramatize without engine vocabulary.

**Schema-minimalism discipline** (per FOUNDATIONS §Story Bundles §5b): every field on the block conforms to the shared contract §4.4 schema. **NO** `arc_contract`, `dramatic_unit`, `execution_envelope`, nested `effect_model`, `stop_policy`, `record_version` discriminator above `1`, or `shape:` discriminator. The block is a causal move, not a dramatic-act surrogate.

### Phase 3: Per-block validation

Run 6 per-block gates on each drafted SLT record:

1. **Schema completeness** — all required fields per shared contract §4.4 are present (`id`, `story_id`, `scope.visibility`, `title`, `purpose`, `preconditions.hard`, `beats[]` with ≥1 entry, `exit_options[]` with ≥1 entry, `saliency.urgency`, `saliency.cooldown_pages`, `mystery_policy.allowed_authority`, `provenance.origin`). Missing required field → `FAIL`.
2. **Predicate parse** — every predicate in `preconditions.hard` and `preconditions.soft` is one of the 10 closed-DSL predicates, with valid record-id references. Free-form prose, undefined predicates, or ill-formed combinator syntax → `FAIL`.
3. **Branch-scope legality** — `scope.visibility: author_pool` blocks reference NO branch-local records (records whose `created_at_page` is non-null). `scope.visibility: branch_scoped` blocks reference only records in the named `scope.branch_id`'s lineage. Cross-branch references → `FAIL`.
4. **Mystery / invariant firewall** — `mystery_policy.forbidden_resolutions[]` does NOT include any mystery the block's effects could resolve. `mystery_policy.allowed_authority` is compatible with the block's effects (a block that creates a `canon_candidate`-authority `SF` cannot have `allowed_authority: none`). Inconsistent → `FAIL`. World invariants (loaded in Pre-flight step 6) are NOT violated by any predicate or effect → `FAIL` on violation.
5. **Effect legality** — `effects.create | supersede | close` references valid record classes; supersede targets must reference records the block's preconditions establish as active; close targets must reference records that are currently open. Dangling references → `FAIL`.
6. **Exit-option grounding** — each entry in `exit_options[]` has a non-empty `intent`, `surface_hint`, and at least an empty `likely_effects[]` list (per shared contract §4.4 schema). Missing field → `FAIL`.

Blocks that fail any gate are removed from the batch with a logged rejection reason. If all blocks fail, abort before Phase 4.

### Phase 4: Batch-diversity validation (`direct_batch` only)

`audit_repair` skips this phase — its blocks are RSP-driven and may legitimately concentrate on one repair theme.

For `direct_batch`, verify across the surviving blocks:

1. **Purpose diversity** — at least 3 distinct `purpose` values across the batch (a 6-block batch must span ≥3 of the 12 enum values).
2. **Aftermath coverage** — at least 1 block has `purpose: aftermath`. The bundle needs aftermath coverage so that violence, betrayal, sex, and death outcomes route to graceful follow-up.
3. **Belief-or-relationship coverage** — at least 1 block has effects that modify `BEL` or `SREL` records (the social-state engine needs ongoing pool support per FOUNDATIONS §Story Bundles §6a).
4. **No branch-local dependencies in author-pool blocks** — re-verifies Phase 3 gate 3 at batch scope (redundant by design — gate 3 already caught individual cases, but this confirms aggregate compliance).

If any batch-level check fails, regenerate the affected blocks (loop to Phase 2 for replacements) OR shrink the batch to the diversity-compliant subset. Surface the regeneration / shrink decision to the user at Phase 6's deliverable summary.

### Phase 5: Author the batch manifest

Draft `worlds/<world_slug>/stories/<story_slug>/storylet-batches/SLB-NNNN.md`:

```markdown
# SLB-NNNN: <mode> batch

**Mode**: direct_batch | audit_repair
**Source**: <focus hint, if direct_batch> | <audit_id + finding_ids, if audit_repair>
**Created**: <iso8601 date>
**Records**: <count> SLT records

## Blocks

| SLT id | purpose | scope | source RSP (if audit_repair) |
|---|---|---|---|
| SLT-NNNN | <purpose> | author_pool | RSP-NNNN |
| ... | | | |

## Validation traces

(One entry per block with the per-block 6-gate pass record.)
```

The SLB file is a markdown manifest, not an atomic YAML record. No `create_slb_record` patch op exists; the file is direct-write per shared contract §10.

### Phase 6: Commit / Write — HARD-GATE fires

1. Build the patch plan covering all surviving SLT records as a single envelope: one `create_slt_record` op per block.
2. Dry-run via `mcp__worldloom__validate_patch_plan`.
3. Present the complete deliverable summary to the user:
   - Mode + source (focus hint OR audit_id + finding_ids).
   - SLT inventory by `purpose` value (Phase 1 + Phase 4 diagnosis preserved).
   - Per-block one-line summary (id, purpose, title, beat count, exit-option count).
   - Per-block validation trace (6 gates → PASS / rationale).
   - Batch-diversity validation result (direct_batch only).
   - Any skipped RSP cards (audit_repair only, with reason).
   - The SLB manifest path + contents preview.
4. **HARD-GATE fires** — wait for explicit user approval. Auto Mode does not override.
5. On approval: obtain patch approval token; submit the patch plan via `mcp__worldloom__submit_patch_plan`.
6. On patch success: write the markdown artifacts in shared contract §10 write order: `storylet-batches/SLB-NNNN.md` → update bundle `INDEX.md`.
7. Report SLT ids + SLB id + bundle INDEX state to the user. Do NOT `git commit`.

**Failure behavior**: patch fail → write nothing; surface the failed per-block gate and the corrective action. Patch success + markdown fail → story-bundle `_source/` records are authoritative; the SLB manifest can be repaired directly; surface partial-failure to user. Per-block rejections during Phase 3 → blocks removed from batch with logged reason; surface the per-block rejection summary even on overall success so the user sees what was filtered.

## Validation Rules This Skill Upholds

- **Rule 1 (No Floating Facts)** — enforced at Phase 3 gate 1 (schema completeness). Mechanism: every drafted SLT record conforms to shared contract §4.4 schema; missing required fields fail the block.
- **Rule 4 (No Globalization by Accident)** — enforced at Phase 3 gate 3 (branch-scope legality). Mechanism: author-pool blocks cannot reference branch-local records; branch-scoped blocks cannot reference cross-branch records.
- **Rule 5 (No Consequence Evasion)** — enforced at Phase 3 gate 5 (effect legality). Mechanism: effects must reference records the block's preconditions establish; close targets must currently be open.
- **Rule 7 (Preserve Mystery Deliberately)** — enforced at Phase 3 gate 4 (mystery / invariant firewall). Mechanism: `mystery_policy.forbidden_resolutions[]` discipline + invariant non-violation check.

## Record Schemas

All record schemas referenced by this skill live in `.claude/skills/_shared-templates/story-state-contract.md`:

- `SLT` (§4.4) — commitment block schema (the skill's primary output).
- Predicate DSL (§5) — closed 10-predicate language for `preconditions.hard | soft`.
- The SLB manifest is a markdown direct-write artifact, not an atomic `_source/` record; its shape is defined by this skill's Phase 5 template above.

## FOUNDATIONS Alignment

| Principle | Phase | Mechanism |
|---|---|---|
| Rule 1 (No Floating Facts) | Phase 3 gate 1 | Schema completeness per shared contract §4.4. |
| Rule 2 (No Pure Cosmetics) | N/A | Not applicable — commitment-block-authoring writes branch-local story-bundle records; it does not introduce species / rituals / technology / artifacts to world canon. Handoff to `canon-addition` via `story-fact-promotion-to-canon` when a story claim is promoted. |
| Rule 3 (No Specialness Inflation) | N/A | Same handoff as Rule 2. |
| Rule 4 (No Globalization by Accident) | Phase 3 gate 3 | Branch-scope legality enforcement. |
| Rule 5 (No Consequence Evasion) | Phase 3 gate 5 | Effect legality enforcement. |
| Rule 6 (No Silent Retcons) | N/A | Story-bundle scope; world-canon retcons route through `canon-addition`. |
| Rule 7 (Preserve Mystery Deliberately) | Phase 3 gate 4 | Mystery / invariant firewall on every block. |
| Rule 11 (No Spectator Castes) | N/A | World-canon-only principle. |
| Rule 12 (No Single-Trace Truths) | N/A | World-canon-only principle. |
| Canon Layers | Pre-flight, Phase 1, 3 | World canon loaded via context packet; Phase 3 gate 4 verifies invariants and mystery firewall against world canon. |
| Mystery Reserve | Pre-flight, Phase 3 gate 4 | Whole-class Mystery Reserve loaded; per-block firewall check. |
| §Story Bundles §4a (Plan-Authority Boundary) | All phases | Commitment-block-authoring does NOT mutate page records; it authors author-pool storylets that turn-cycle later consults. The page snapshot remains authoritative. |
| §Story Bundles §5a (Commitment Blocks Are Causal Moves) | Phase 2 | Drafted blocks follow §4.4 schema discipline; no `arc_contract` / `dramatic_unit` / `execution_envelope` / `stop_policy` / shape discriminators. The skill REJECTS attempts to write blocks with those fields. |
| §Story Bundles §5b (Schema-Minimalism) | Phase 2, 3 | Every field in every drafted record conforms to shared contract §4.4. Phase 3 gate 1 rejects non-conformant blocks. |
| §Story Bundles §6a (Belief vs. Fact) | Phase 4 batch-diversity check 3 | direct_batch mode requires at least 1 block in the batch to affect `BEL` or `SREL` state — the social-state engine needs ongoing pool support. |
| §Story Bundles §9 (Prose Length Discipline) | Phase 2 beat drafting | Beats carry prose-facing instructions but no word-count targets. |
| Change Control Policy | N/A | Canon-reading skill emits no Change Log Entries. |
| Tooling Recommendation | Pre-flight step 6 | World canon retrieval via `mcp__worldloom__get_context_packet`. |

## Guardrails

- **Never write world-level canon.** Hook 3 blocks raw `Edit` / `Write` on `worlds/<slug>/_source/<world-subdir>/*.yaml`. Story-bundle records under `worlds/<world_slug>/stories/<story_slug>/_source/storylets/SLT-*.yaml` are this skill's exclusive write surface, routed through the patch engine.
- **Never write rendered prose.** Commitment-block-authoring writes record schemas, not narrative text.
- **Commitment blocks are causal moves, not dramatic acts.** Per FOUNDATIONS §Story Bundles §5a, the schema explicitly forbids `arc_contract`, `dramatic_unit`, `execution_envelope`, nested `effect_model`, `stop_policy`, `record_version` discriminators above `1`, and `shape:` discriminators. The skill REJECTS any attempt to write blocks with those fields (Phase 3 gate 1 schema completeness extends to schema strictness).
- **Schema minimalism per shared contract §2 + FOUNDATIONS §Story Bundles §5b.** Every field in every record drafted by this skill conforms to the shared contract §4.4 schema. No nice-to-have fields.
- **Predicate DSL is closed** (10 predicates per shared contract §5). No free-form predicate prose; Phase 3 gate 2 rejects undefined predicates.
- **No `in_memory_jit` mode** — turn-cycle's Phase 2 inlines JIT block creation following the same shared contract §4.4 schema. The two skills share the schema discipline without chaining: turn-cycle never invokes commitment-block-authoring. Future work could extract JIT discipline to a sub-routine call; for now both skills reference the contract independently.
- **Skills do not chain.** Commitment-block-authoring never invokes `branching-story-turn-cycle`, `branching-story-prose-attach`, `branching-story-health-audit`, `story-fact-promotion-to-canon`, or `story-promotion-closeout`. When `audit_repair` skips an RSP card with non-commitment-block `repair_kind`, the skill surfaces the sibling-handoff recommendation; the user separately invokes the named sibling.
- **Worktree discipline**: if invoked inside a git worktree, all paths resolve from the worktree root.
- **Known integration debt**:
  - **MCPENH-040** (allocator: BEL id-class registration + ARCTRACE drop) — commitment-block-authoring reads `BEL` references in its effect-legality check (Phase 3 gate 5) when blocks declare belief-update effects. Inherited from bootstrap's Shape C rollout.
  - **PEENH-007** (patch-engine `create_bel_record` op) — not directly used by this skill (commit-block-authoring writes `create_slt_record`, not `create_bel_record`), but BEL references in SLT effects are validated against the contract that PEENH-007 establishes.
  - **VALENH-011** (validator `record_schema_compliance` for BEL) — same as PEENH-007: indirect inheritance.
  - **MCPENH-041** (task_type rename: `story_page_cycle` → `story_turn_cycle`, `storylet_pool_authoring` → `commitment_block_authoring`) — commitment-block-authoring's Pre-flight step 6 uses `task_type='commitment_block_authoring'` per the rename. Ships alongside this skill.

## What is intentionally NOT in this skill

- **No `in_memory_jit` mode.** The streamlined-pipeline source report named three modes; this skill ships two (`direct_batch`, `audit_repair`). Turn-cycle's Phase 2 inlines JIT block creation per the no-chain discipline. Both skills reference shared contract §4.4 independently. If a future refactor extracts JIT to a shared sub-routine, a new ticket can capture that work.
- **No prose generation.** Beats carry prose-facing instructions; the skill does NOT render beat prose. Beat instructions are inputs to the external renderer when turn-cycle later authors a page plan using the selected block.
- **No word-count targets** (per FOUNDATIONS §Story Bundles §9). Beat instructions are bounded by purpose and effect; no min/max word counts on the SLT record.
- **No legacy schema fields**: no `arc_contract`, `dramatic_unit`, `execution_envelope`, nested `effect_model`, `stop_policy`, `record_version: 2|3`, `shape:` discriminator. Schema is closed at shared contract §4.4.
- **No author-pool block with branch-local references.** Phase 3 gate 3 rejects. Only `branch_scoped` blocks may reference branch-local records, and only within the named branch's lineage.
- **No batch-level mystery resolution.** A batch where multiple blocks jointly resolve a forbidden mystery (even when each block individually passes the firewall) is forbidden. Phase 4 diversity validation does NOT currently check cross-block mystery aggregation; if this becomes a real audit failure mode, add a Phase 4 gate.

## References

- `.claude/skills/_shared-templates/story-state-contract.md` — §4.4 SLT schema (canonical), §5 closed predicate DSL, §10 shared write order, §11 mystery and canon authority.
- `docs/FOUNDATIONS.md` — §Story Bundles §5 / §5a / §5b / §6a / §9 govern this skill.
- `reports/streamlined-story-pipelines/05-commitment-block-authoring.md` — streamlined-pipeline source report.
- `docs/plans/2026-05-13-streamlined-story-skills-greenfield-plan.md` §C.4 — blueprint summary.
- Sibling skills:
  - `.claude/skills/branching-story-bootstrap/SKILL.md` — Phase 5 seeds 4-8 (`minimal`) or 8-14 (`standard`) SLT records during initial bundle creation. Commitment-block-authoring extends the same pool post-bootstrap.
  - `.claude/skills/branching-story-turn-cycle/SKILL.md` — Phase 2 selects SLT records from the author pool (or JIT-creates branch-scoped blocks when no fit). Commitment-block-authoring grows the pool turn-cycle consults.
  - `branching-story-health-audit` (future, not yet shipping) — `remediation` mode emits `RSP-NNNN` cards consumed by this skill's `audit_repair` mode.
