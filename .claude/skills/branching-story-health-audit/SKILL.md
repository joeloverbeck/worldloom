---
name: branching-story-health-audit
description: "Use when diagnosing the health of a branching-story bundle. Four modes: structural (default; replay + snapshots + isolation + debt + belief/visibility + mystery/canon + continuation), prose (compare rendered prose + receipts against state), remediation (draft RSP-<integer> cards consumed by commitment-block-authoring), cross_story (sibling-bundle contradiction scan). Produces: audits/SAU-<integer>-<date>.md + optional audits/SAU-<integer>/remediation-storylet-proposals/RSP-<integer>-<slug>.md + audits/INDEX.md update. Mutates: only worlds/<world_slug>/stories/<story_slug>/audits/."
user-invocable: true
arguments:
  - name: world_slug
    description: "Existing world directory slug under worlds/"
    required: true
  - name: story_slug
    description: "Existing story bundle slug under worlds/<world_slug>/stories/"
    required: true
  - name: mode
    description: "Comma-separated list of modes; default 'structural'. Valid: structural, prose, remediation, cross_story. Modes can be combined."
    required: false
  - name: branch_path_filter
    description: "BR-<integer> or list; restricts structural checks to named branches + descendants. Default: all branches."
    required: false
  - name: severity_threshold
    description: "error | warning | info; default 'info' (report everything). When 'error', only error-severity findings appear; 'warning' reports errors + warnings."
    required: false
  - name: emit_remediation_requests
    description: "true | false; default false. When true, the audit drafts RSP-<integer> cards for fixable findings even if 'remediation' is not in mode. When 'remediation' is in mode, RSP drafting is unconditional."
    required: false
---

# Branching Story Health Audit

Diagnose the health of a branching-story bundle via deterministic structural-replay checks, optional prose-mode receipt scan, optional remediation-mode RSP card drafting, and optional cross-story contradiction scan — the audit never mutates story state or world canon.

<HARD-GATE>
Do NOT write `audits/SAU-<integer>-<YYYY-MM-DD>.md`, any `audits/SAU-<integer>/remediation-storylet-proposals/RSP-<integer>-<slug>.md` cards, or update `audits/INDEX.md` until:

(a) Pre-flight Check has completed: bundle resolved at `worlds/<world_slug>/stories/<story_slug>/`; `SAU` id allocated via `mcp__worldloom__allocate_next_id`; world canon context packet loaded via `mcp__worldloom__get_context_packet(world_slug, task_type='branching_story_health_audit', ...)`; for `cross_story` mode, sibling bundles in `worlds/<world_slug>/stories/` enumerated.

(b) Phases 1-6 have completed in working memory: branch tree built from `_source/branches/` + `_source/pages/` (Phase 1); 6 structural sub-phases (2a replay, 2b branch isolation, 2c debt health, 2d belief / visibility health, 2e mystery / canon safety, 2f continuation / terminal proof) executed when `structural` in mode (default); prose checks executed when `prose` in mode; cross-story contradiction scan executed when `cross_story` in mode; `RSP-<integer>` cards drafted when `remediation` in mode OR `emit_remediation_requests: true`; SAU report drafted with severity-filtered findings table.

(c) The user has explicitly approved the deliverable summary (audit path, modes run, severity breakdown, top-5 highest-severity findings one-line each, RSP card count + per-card `repair_kind` summary, recommended next-step sibling per `repair_kind` cluster).

This gate is authoritative under Auto Mode or any other autonomous-execution context — invoking this skill does not constitute approval of the deliverable summary.
</HARD-GATE>

## Process Flow

```
Pre-flight Check (load FOUNDATIONS + shared contract; resolve bundle;
  allocate SAU id; load world canon context packet; enumerate sibling
  bundles if cross_story in mode)
        |
        v
Phase 1: Scope branches (build tree from BR + PG; apply
                         branch_path_filter)
        |
        v
Phase 2 [structural; default]: 6 sub-phases executed sequentially
  ├─ 2a: Replay events (snapshot hash comparison)
  ├─ 2b: Branch isolation
  ├─ 2c: Debt health
  ├─ 2d: Belief / visibility health
  ├─ 2e: Mystery / canon safety
  └─ 2f: Continuation / terminal proof
        |
        v
Phase 3 [conditional on `prose` in mode]: Prose checks (5 finding
                                                        types over
                                                        prose + receipts)
        |
        v
Phase 4 [conditional on `cross_story` in mode]: Cross-story
                                                contradiction scan
        |
        v
Phase 5 [conditional on `remediation` in mode OR
         emit_remediation_requests=true]: Draft RSP cards
        |
        v
Phase 6: Author SAU report (apply severity_threshold filter)
        |
        v
Phase 7: HARD-GATE fires → write SAU report + RSP cards (if any)
                          + INDEX update
```

## Inputs

### Required

- `world_slug` — string — existing world directory slug under `worlds/`
- `story_slug` — string — existing story bundle slug under `worlds/<world_slug>/stories/`

### Optional

- `mode` — comma-separated list — default `structural`. Valid values: `structural`, `prose`, `remediation`, `cross_story`. Modes can be combined.
- `branch_path_filter` — `BR-<integer>` or list — restricts structural checks to named branches + descendants. Default: all branches.
- `severity_threshold` — enum — `error | warning | info`. Default: `info` (report everything).
- `emit_remediation_requests` — `true | false` — default `false`. Forces RSP drafting even without explicit `remediation` mode.

## Output

- `audits/SAU-<integer>-<YYYY-MM-DD>.md` — Always (audit report with severity-filtered findings table)
- `audits/SAU-<integer>/remediation-storylet-proposals/RSP-<integer>-<slug>.md` — One per fixable finding when `remediation` in mode OR `emit_remediation_requests: true`. Sub-directory created on first use.
- `audits/INDEX.md` — Always (updated last)

All direct-write markdown. No patch-engine submissions — the audit is read-only with respect to bundle records.

## World-State Prerequisites

Before this skill acts, it MUST receive (per FOUNDATIONS §Tooling Recommendation):

- `docs/FOUNDATIONS.md` — §Story Bundles §5 / §5a / §5b / §6a govern the audit checks
- `.claude/skills/_shared-templates/story-state-contract.md` — §4 record schemas (audit reads against), §5 closed predicate DSL, §7 eight hard gates, §9 branching procedure, §11 mystery and canon authority
- `worlds/<world_slug>/stories/<story_slug>/_source/branches/BR-*.yaml` — branch tree
- `worlds/<world_slug>/stories/<story_slug>/_source/pages/PG-*.yaml` — page snapshots
- `worlds/<world_slug>/stories/<story_slug>/_source/events/SE-*.yaml` — event deltas
- `worlds/<world_slug>/stories/<story_slug>/_source/<class>/*.yaml` — every other record class read per Phase 2 sub-phase needs (SF, BEL, OBL, CNSQ, THR, SREL, STENT, STINT, STLOC, STOBJ, DA, SLT, CHC)
- `worlds/<world_slug>/stories/<story_slug>/pages-prose/<page_id>.md` + `pages-prose-receipts/<page_id>.yaml` — Phase 3 prose checks (conditional on `prose` in mode)
- `worlds/<world_slug>/stories/<sibling_story_slug>/_source/` — Phase 4 cross-story checks (conditional on `cross_story` in mode); may be empty if this is the only bundle in the world
- World canon context packet via `mcp__worldloom__get_context_packet(world_slug, task_type='branching_story_health_audit', seed_nodes=<every M-<integer> with status:forbidden + every INV + active cast STENTs + parent CFs for the bundle's mirrored SF records>, token_budget=<default>)`

Bundle MUST exist. For `cross_story`, sibling bundles are enumerated at Pre-flight (zero siblings is legitimate and produces a no-op for Phase 4).

## Pre-flight Check

Before Phase 1:

1. Load `docs/FOUNDATIONS.md` and `.claude/skills/_shared-templates/story-state-contract.md`. Abort with clear missing-file error on any unreadable path.
2. Resolve `worlds/<world_slug>/stories/<story_slug>/`. Abort with bundle-not-found error if missing.
3. Parse `mode` argument — comma-separated list of `structural | prose | remediation | cross_story`; default to `structural` if absent. Validate every named mode is in the valid set.
4. Allocate `SAU` id via `mcp__worldloom__allocate_next_id(world_slug, 'SAU', story_slug=<story_slug>)`. **`RSP` ids are allocated at Phase 5 per-finding** via `mcp__worldloom__allocate_next_id(world_slug, 'RSP', story_slug=<story_slug>, audit_id='SAU-<integer>')` — deferred-allocation pattern, since the count of fixable findings is unknown until phases complete.
5. Load world canon context packet seeded with: every `M-<integer>` with `status: forbidden` (whole-class for per-event firewall in Phase 2e), every `INV` record (whole-class for invariant verification in Phase 2e), active cast `STENT` ids (for Phase 2d belief / visibility checks), and parent `CF` records for any `SF` records in the bundle (for Phase 2e canon-authority classification).
6. If `cross_story` in `mode`: enumerate `worlds/<world_slug>/stories/*/` directories; for each sibling bundle, load its `_source/` record-index sufficient for Phase 4 contradiction checks (mirrored `SF` records keyed by CF ids in `derived_from`, `SE.promotion_claims[]` queue, terminal-closure inherited-debt notes).

If any precondition fails, the skill aborts before Phase 1.

## Phase 1: Scope branches

Build the branch tree from `_source/branches/BR-*.yaml` records. For each branch:

- Identify the root page (the page with no `parent_page_id` whose `branch_id` matches).
- Identify the active leaf (the page with the highest `turn_index` in the branch and no descendant page citing it as `parent_page_id`).
- Identify any terminal pages (`PG.state_snapshot.continuation.terminal_status ∈ {terminal_closed, branch_pause}`).
- Determine descendants and ancestors via `parent_branch_id` traversal.

Apply `branch_path_filter` if supplied — restrict Phases 2c (debt health), 2f (continuation), 3 (prose), and Phase 2a (replay walks) to the named branches + their descendants. Phases 2b (branch isolation) and 2e (mystery / canon safety) still scan all branches because cross-branch findings are their core concern.

Output: a scoped branch list + per-branch metadata used by Phases 2-4.

## Phase 2: Structural checks (mandatory when `structural` in `mode`; default)

Six sub-phases run in sequence. Findings accumulate into a shared in-memory pool with severity (`error | warning | info`), branch scope (`branch_id` or `cross_branch`), record references, and pre-assigned `repair_kind` (for Phase 5 RSP drafting).

### Phase 2a: Replay events

For each scoped branch:

1. Load the root page's `state_snapshot`.
2. Walk the page chain in branch order.
3. For each page, apply the corresponding `SE.state_delta` to the running snapshot (create / supersede / close primitives).
4. Compute the running snapshot's hash (sha256 over canonicalized YAML) and compare to `PG.state_hash`.
5. Divergence → `snapshot_replay_mismatch` finding, `severity: error`, `repair_kind: branch_flag` (replay corruption is not auto-repairable).

When replaying repair events, distinguish `system_repair` (engine-initiated repair such as schema-gate recovery) from `audit_repair` (audit-finding-driven repair). The old undifferentiated value is not a valid current-contract event kind.

### Phase 2b: Branch isolation

Flag:

- `branch_isolation_leak` — records in a branch's `state_snapshot.active_records` whose `created_at_page` belongs to a sibling branch. ERROR; `repair_kind: branch_flag`.
- `global_author_pool_branch_dependency` — global-author-pool `SLT` records (`scope.visibility: global_author_pool`) with preconditions referencing branch-local records (records whose `created_at_page` is non-null). ERROR; `repair_kind: commitment_block` (the SLT needs rework into a branch-scoped block).
- `plan_state_reference_dangling` — page-plan references in `pages-prose-plans/PG-*.md` to records that don't exist in the page's active snapshot. ERROR; `repair_kind: prose_revision` (the plan body needs revision OR a repair turn must add the missing state).
- `choice_state_reference_dangling` — emitted `CHC` records whose action-family list requires records not in the page's active snapshot. ERROR; `repair_kind: turn_repair`.

### Phase 2c: Debt health

For each open `OBL` / `CNSQ` / `THR` in the scoped branches' leaf snapshots:

- `unactionable_debt` — no eligible author-pool SLT block's preconditions are satisfiable against the debt + leaf state. Severity scales with `saliency.urgency`: HIGH → WARNING; MEDIUM → WARNING; LOW → INFO. `repair_kind: commitment_block` (the bundle needs a new block addressing this debt).
- `invalidated_debt` — the debt's preconditions have been broken upstream (entity death / location move / belief shift that should have closed the debt). WARNING; `repair_kind: turn_repair` (a repair turn closes or transfers the debt).
- `ignored_debt_beyond_urgency` — HIGH-urgency debt has been ignored for >5 pages; MEDIUM-urgency for >10 pages. WARNING; `repair_kind: commitment_block` (urgent debt needs payoff path).

### Phase 2d: Belief / visibility health (per FOUNDATIONS §Story Bundles §6a)

Flag:

- `public_consequence_without_witness` — `CNSQ` records with high social-impact tags and no `BEL.visibility: public | shared` records anchoring them. WARNING; `repair_kind: turn_repair`.
- `secret_publicly_known_without_event` — `BEL.holder: public` records derived from secret actions (events with `outcome_route: accommodate` involving deception) without a corresponding revealing event. WARNING; `repair_kind: turn_repair`.
- `relationship_change_without_basis` — `SREL` supersessions whose `basis` doesn't trace to an `SE` or `BEL`. WARNING; `repair_kind: turn_repair`.
- `choice_relies_on_unestablished_knowledge` — `CHC` records whose `player_visible_intent` requires the actor's `STENT.entity_status` + active `BEL` to support knowledge the prior page didn't establish. WARNING; `repair_kind: turn_repair`.
- `lie_promoted_silently` — `BEL` records with `truth_relation: false, belief_mode: deceives` that become accepted-as-true (`SF` records derived from them without a `branch_local_counterfactual` authority marker). ERROR; `repair_kind: turn_repair`.

### Phase 2e: Mystery / canon safety (per FOUNDATIONS Rule 7 + shared contract §11)

Flag:

- `forbidden_mystery_resolved` — any mystery with `status: forbidden` resolved by an `SE.state_delta`. ERROR; `repair_kind: branch_flag` (forbidden mysteries cannot be resolved by any path — the branch may need to be archived).
- `counterfactual_promoted_to_canon` — a `branch_local_counterfactual`-authority `SF` record treated as `world_level: true` in any downstream effect. ERROR; `repair_kind: branch_flag`.
- `canon_candidate_not_promoted` — a `canon_candidate`-authority `SE.promotion_claims[]` entry that didn't pause the bundle (no subsequent `story-fact-promotion-to-canon` invocation found in the audit window). WARNING; `repair_kind: promotion` (the candidate may still be a deliberate hold).
- `promotion_lacks_evidence` — promotion claims with rendered evidence required but missing rendered prose. WARNING; `repair_kind: prose_revision` (render the page first, then re-run promotion).

ERROR-severity findings here indicate actively-broken canon discipline.

### Phase 2f: Continuation / terminal proof

For each non-terminal leaf page:

- `unactionable_leaf` — no eligible author-pool or JIT-eligible `SLT` against the page's `state_snapshot`. ERROR; `repair_kind: commitment_block`.
- `leaf_without_choices` — the page emits zero `CHC` records but `continuation.terminal_status: open`. ERROR; `repair_kind: turn_repair`.

For each terminal leaf (`continuation.terminal_status: terminal_closed`):

- `terminal_without_rationale` — `terminal_rationale` is empty or doesn't name how high-salience debts were closed, abandoned, inherited, or intentionally left unresolved. WARNING; `repair_kind: branch_flag`.
- `orphan_debt_at_terminal` — debts open in the leaf snapshot but not referenced by `terminal_rationale`. WARNING; `repair_kind: branch_flag`.

## Phase 3: Prose checks (conditional on `prose` in `mode`)

For each `PG-<integer>` in the scoped branches:

- `missing_prose_file` — `PG.prose_path` is set but the file is absent. WARNING; `repair_kind: prose_revision`.
- `missing_prose_receipt` — prose has been rendered (file exists, `PG.prose_path` non-null) but no `pages-prose-receipts/PG-<integer>.yaml` exists. INFO; `repair_kind: prose_revision` (re-run `branching-story-prose-attach`).
- `prose_receipt_failed` — receipt's `verdict: FAIL`. Severity from receipt's `repair_recommendation`: FAIL with `run_story_fact_promotion_to_canon` → ERROR + `repair_kind: promotion`; FAIL with `run_turn_cycle_repair` → ERROR + `repair_kind: turn_repair`; FAIL with `revise_prose` → WARNING + `repair_kind: prose_revision`.
- `unrepaired_prose_invention` — receipt's `checks.invented_structural_fact: FAIL` flag persists with no subsequent repair turn. WARNING; `repair_kind: turn_repair`.
- `state_change_unrendered` — receipt's `checks.required_event_rendered: WARN | FAIL`. WARNING; `repair_kind: prose_revision`.

## Phase 4: Cross-story checks (conditional on `cross_story` in `mode`)

For each sibling bundle in `worlds/<world_slug>/stories/`:

- `cross_story_mirrored_fact_contradiction` — sibling's mirrored `SF` records contradict this bundle's mirrored `SF` records on the same parent CF id in `derived_from`. WARNING; `repair_kind: branch_flag` (bundles can legitimately interpret canon differently; the audit flags but doesn't propose repair).
- `cross_story_promotion_contradiction` — sibling's `SE.promotion_claims[]` and this bundle's `SE.promotion_claims[]` both claim canon-candidate authority on contradictory `SF` content. ERROR; `repair_kind: promotion` (one or both candidates must be retracted or revised before any can promote).
- `cross_story_inherited_debt_mismatch` — sibling's terminal closures inherit debts that exist in this bundle as still-open. INFO; `repair_kind: branch_flag`.

## Phase 5: Remediation drafting (conditional on `remediation` in `mode` OR `emit_remediation_requests: true`)

For each finding tagged with a fixable `repair_kind` (everything except findings tagged with no `repair_kind`), allocate an `RSP` id via `mcp__worldloom__allocate_next_id(world_slug, 'RSP', story_slug=<story_slug>, audit_id='SAU-<integer>')` and draft a card:

```markdown
---
id: RSP-<integer>
audit_id: SAU-<integer>
created: <iso8601 date>
finding_ids: [<finding ids from this audit>]
repair_kind: commitment_block | turn_repair | prose_revision | promotion | branch_flag
target_records: [<record ids the repair should engage with>]
target_branch: BR-<integer> | null
suggested_block_move_family: orient | world_pressure | pursuit | investigation | disclosure | negotiation | bond_shift | status_shift | conflict | evasion | protection | resource_exchange | transformation | ritual_protocol | decision | recovery | null
visibility: global_author_pool | branch_scoped | null
---

# RSP-<integer>: <short title>

## Findings addressed

(One bullet per finding_id, with severity + one-line summary.)

## Rationale

(Narrative explanation of why this repair is needed and which lawful repair path applies.)

## Recommended next step

(Sibling-handoff guidance per `repair_kind`:
 - `commitment_block` → invoke `commitment-block-authoring` `audit_repair` mode with this RSP id
 - `turn_repair` → invoke `branching-story-turn-cycle` with a `manual_action_text` framing the repair
 - `prose_revision` → revise `pages-prose/PG-<integer>.md` and re-invoke `branching-story-prose-attach`
 - `promotion` → invoke `story-fact-promotion-to-canon` with the canon-candidate evidence
 - `branch_flag` → manual user attention; no automated repair recommended)
```

**`repair_kind` taxonomy** (5 values):

- `commitment_block` — author pool needs a new block. Consumed by `commitment-block-authoring` `audit_repair` mode.
- `turn_repair` — bundle needs a repair turn adding branch-local state to support unrepaired prose invention or unactionable debt. Consumed by `branching-story-turn-cycle`.
- `prose_revision` — rendered prose needs revision. User revises `pages-prose/PG-<integer>.md` and re-invokes `branching-story-prose-attach`.
- `promotion` — a `canon_candidate` authority claim should be promoted via `story-fact-promotion-to-canon`.
- `branch_flag` — branch is structurally broken (replay mismatch, forbidden mystery resolution, etc.); flag for user attention without automated repair.

**Do NOT draft full commitment blocks here.** RSP cards are repair requests; `commitment-block-authoring` `audit_repair` mode consumes them and produces actual SLT records.

## Phase 6: Author SAU report

Draft `worlds/<world_slug>/stories/<story_slug>/audits/SAU-<integer>-<YYYY-MM-DD>.md`:

```markdown
---
audit_id: SAU-<integer>
story_id: STORY-<integer>
story_slug: <story_slug>
world_slug: <world_slug>
created: <iso8601 date>
modes_run: [structural, prose, remediation, cross_story]   # whichever ran
branch_path_filter: null | BR-<integer> | [BR-<integer>, ...]
severity_threshold: error | warning | info
findings_total: N
findings_by_severity:
  error: <count>
  warning: <count>
  info: <count>
rsp_cards_emitted: N | 0
---

# SAU-<integer> — Bundle health audit (<YYYY-MM-DD>)

## Summary

(3-5 sentence overview of bundle health by mode.)

## Branch coverage

(Per-branch one-line: branch id, root page, leaf page, terminal status, finding count.)

## Replay / hash errors

(Phase 2a findings.)

## Branch isolation

(Phase 2b findings.)

## Open debt health

(Phase 2c findings.)

## Belief / visibility health

(Phase 2d findings.)

## Mystery / canon safety

(Phase 2e findings.)

## Continuation / terminal status

(Phase 2f findings.)

## Prose health (if `prose` in modes)

(Phase 3 findings.)

## Cross-story consistency (if `cross_story` in modes)

(Phase 4 findings.)

## Findings table

| Finding id | Severity | Branch | Type | One-line summary |
|---|---|---|---|---|

## Remediation requests (if any)

(One bullet per emitted RSP-<integer> with its `repair_kind` + suggested consumer skill + finding link.)
```

Apply `severity_threshold` to filter the findings table and per-phase sections. When `severity_threshold: error`, only ERROR findings appear; `warning` reports ERROR + WARNING; `info` (default) reports everything.

## Phase 7: Commit / Write — HARD-GATE fires

1. Present the deliverable summary to the user: audit path, modes run, severity breakdown, top-5 highest-severity findings (one-liner each), RSP card count + per-card `repair_kind` summary, per-`repair_kind` recommended-sibling guidance, severity-threshold filter applied (if any).
2. **HARD-GATE fires** — wait for explicit user approval. Auto Mode does not override.
3. On approval:
   - Write `audits/SAU-<integer>-<YYYY-MM-DD>.md` (direct write).
   - For each RSP card (if any): create `audits/SAU-<integer>/remediation-storylet-proposals/` sub-directory on first use (idempotent `mkdir -p`); write `RSP-<integer>-<slug>.md` (direct write).
   - Update `audits/INDEX.md` last.
4. Report SAU path + RSP card inventory to the user. Surface the recommended next-step sibling skill per `repair_kind` cluster (`commitment-block-authoring audit_repair` for `commitment_block` cards; `branching-story-turn-cycle` for `turn_repair`; `branching-story-prose-attach` re-run for `prose_revision`; `story-fact-promotion-to-canon` for `promotion`; manual attention for `branch_flag`). Do NOT `git commit`.

**Failure behavior**: SAU-report-write fail → hard fail; the audit was the deliverable, no partial state. Partial RSP-write success (SAU written but some RSP cards failed) → SAU is authoritative; remaining RSP cards can be repaired directly. INDEX update fail (after SAU + RSP cards written) → SAU + RSP cards authoritative; index repairable.

## Validation Rules This Skill Upholds

- **Rule 1 (No Floating Facts)** — Phase 2a (replay events). Mechanism: replay verifies every record referenced in `state_snapshot.active_records` corresponds to a real record file; missing references surface as `snapshot_replay_mismatch` findings.
- **Rule 4 (No Globalization by Accident)** — Phase 2b (branch isolation). Mechanism: flags sibling-branch records leaking into a branch's snapshot; flags author-pool blocks with branch-local dependencies.
- **Rule 5 (No Consequence Evasion)** — Phase 2c (debt health) + Phase 2f (continuation / terminal proof). Mechanism: unactionable / invalidated / ignored debt findings + terminal-without-rationale + orphan-debt-at-terminal findings.
- **Rule 7 (Preserve Mystery Deliberately)** — Phase 2e (mystery / canon safety). Mechanism: forbidden-mystery-resolution + counterfactual-promotion-to-canon + canon-candidate-without-promotion-hold checks against whole-class Mystery Reserve loaded at Pre-flight.

## Record Schemas

All record schemas referenced by this skill live in `.claude/skills/_shared-templates/story-state-contract.md`:

- `PG` (§4.2), `SE` (§4.3), `SLT` (§4.4), `BEL` (§4.1), prose receipt (§4.5) — the audit reads these record types.

The SAU report and RSP cards are markdown direct-write artifacts (not atomic `_source/` records). Their shapes are defined inline in this skill's Phase 5 (RSP) and Phase 6 (SAU) templates.

## FOUNDATIONS Alignment

| Principle | Phase | Mechanism |
|---|---|---|
| Rule 1 (No Floating Facts) | Phase 2a | Replay verifies every active-record reference resolves. |
| Rule 2 (No Pure Cosmetics) | N/A | Story-bundle scope. World-canon principle. |
| Rule 3 (No Specialness Inflation) | N/A | Same as Rule 2. |
| Rule 4 (No Globalization by Accident) | Phase 2b | Branch-isolation enforcement (4 finding types). |
| Rule 5 (No Consequence Evasion) | Phase 2c, 2f | Debt-health + continuation-or-terminal-proof findings. |
| Rule 6 (No Silent Retcons) | N/A | Audit reads only; emits no canon changes. |
| Rule 7 (Preserve Mystery Deliberately) | Phase 2e | Mystery / canon safety checks (4 finding types). |
| Rule 11 (No Spectator Castes) | N/A | World-canon-only principle. |
| Rule 12 (No Single-Trace Truths) | N/A | World-canon-only principle. |
| Canon Layers | Pre-flight, Phase 2e | World canon loaded via context packet; per-event canon-authority classification. |
| Mystery Reserve | Pre-flight, Phase 2e | Whole-class Mystery Reserve loaded; forbidden-status firewall. |
| §Story Bundles §4a (Plan-Authority Boundary) | All phases | Audit reads `PG` records as authoritative; never mutates them. Drift between prose and state is reported in findings, not in PG records. |
| §Story Bundles §5a (Commitment Blocks Are Causal Moves) | Phase 2b, 2c | Author-pool `SLT` records validated for branch-local-dependency leaks; debt-block eligibility matching enforces commitment-blocks-as-moves. |
| §Story Bundles §5b (Schema-Minimalism) | N/A | Audit reads records; does not draft schema-bearing records. |
| §Story Bundles §6a (Belief vs. Fact) | Phase 2d | Belief / visibility health checks (5 finding types). |
| §Story Bundles §9 (Prose Length Discipline) | N/A | Audit reports no word-count metrics. |
| Change Control Policy | N/A | Audit emits no Change Log Entries. |
| Tooling Recommendation | Pre-flight | World canon retrieval via `mcp__worldloom__get_context_packet`. |

## Guardrails

- **Never mutate story state or world canon.** The audit reads `_source/` records, `pages-prose-plans/*.md`, `pages-prose/*.md`, `pages-prose-receipts/*.yaml`, and bundle `INDEX.md`. It writes ONLY to `audits/SAU-<integer>-*.md` + `audits/SAU-<integer>/remediation-storylet-proposals/RSP-<integer>-*.md` + `audits/INDEX.md`. No patch-engine submissions.
- **Never write rendered prose.** The audit reads prose for Phase 3 checks; it does not author prose.
- **RSP cards are repair requests, not blocks.** Phase 5 drafts requests with `repair_kind`, `target_records`, `target_branch`, `rationale`, `suggested_block_move_family`, `visibility` — never full SLT records. `commitment-block-authoring` `audit_repair` mode owns SLT drafting.
- **Audit is read-only with respect to bundle records.** Drift between rendered prose and committed state, replay mismatches, branch-isolation violations are all REPORTED in findings; the audit does NOT alter `PG` records, `SE` deltas, `SLT` blocks, or any other bundle-record file to "fix" what it finds.
- **Schema minimalism per shared contract §2.** SAU report + RSP card shapes defined inline. No nice-to-have fields.
- **Skills do not chain.** The audit never invokes `commitment-block-authoring`, `branching-story-turn-cycle`, `branching-story-prose-attach`, `story-fact-promotion-to-canon`, or `story-promotion-closeout`. RSP cards record sibling-handoff recommendations; the user separately invokes the named sibling with the RSP card path as input.
- **Worktree discipline**: paths resolve from worktree root if invoked inside one.
- **Known integration debt**:
  - **MCPENH-040** (BEL allocator registration), **PEENH-007** (`create_bel_record` patch op), **VALENH-011** (BEL `record_schema_compliance`) — Phase 2d reads `BEL` records for belief / visibility health checks. Inherited from bootstrap's Shape C rollout.
  - **MCPENH-041** (task_type rename) — does NOT affect this skill; `branching_story_health_audit` task_type was not renamed in MCPENH-041's scope.

## What is intentionally NOT in this skill

- **No LLM semantic pass by default.** Default `structural` mode is fully deterministic — replay, schema checks, predicate parse-back, hash comparison. The optional `prose` mode reads existing prose receipts (already deterministic-checked by `branching-story-prose-attach`) but does NOT run a fresh LLM critic over prose. A future ticket could add an opt-in `prose_critic` mode if it surfaces as a real need.
- **No bundle mutation.** The audit reports; it does not edit `PG` / `SE` / `SLT` / `BEL` records.
- **No RSP-to-SLT inflation.** RSP cards are requests; `commitment-block-authoring` `audit_repair` mode owns SLT drafting.
- **No cross-world audit.** `cross_story` mode is bounded to sibling bundles within the same world. World-level audits across `worlds/*/` are out of scope.
- **No word-count metrics** (per FOUNDATIONS §Story Bundles §9). Prose-mode findings cite receipt verdicts, not word counts.

## Final Rule

The audit produces severity-tagged findings and optional repair-request cards — it diagnoses bundle health by reading records, never mutates story state or world canon, and routes every fixable finding to a lawful repair path through `repair_kind` + sibling-handoff recommendation rather than performing the repair itself.
