# branching-story-health-audit

## Purpose

Diagnose the health of a branching-story bundle. The default audit is **deterministic and fast** — structural-replay-based checks over the bundle's `_source/` records with no LLM semantic pass. Three additional opt-in modes extend coverage:

- **`structural`** (default) — snapshot replay, branch isolation, debt health, belief / visibility health, mystery / canon safety, continuation or terminal proof.
- **`prose`** — compare rendered prose and prose receipts against committed state.
- **`remediation`** — draft `RSP-NNNN` (remediation-storylet-proposal) cards for fixable findings; consumed by `commitment-block-authoring` `audit_repair` mode.
- **`cross_story`** — world-level contradiction scan across sibling story bundles in the same world.

Modes can be combined; the audit report names which checks ran.

**The audit NEVER mutates story state or world canon.** Outputs are read-only reports + opt-in repair-request cards.

Branching-story-health-audit is the fifth skill in the rebuilt story-skill family per `docs/plans/2026-05-13-streamlined-story-skills-greenfield-plan.md`.

## Inputs

Required:

- `world_slug` — existing world directory slug under `worlds/`.
- `story_slug` — existing story bundle slug under `worlds/<world_slug>/stories/`.

Optional:

- `mode` — comma-separated list of modes to run; default `structural`. Valid values: `structural`, `prose`, `remediation`, `cross_story`. Mode `cross_story` requires no `story_slug` companion check — it scans every sibling bundle within `worlds/<world_slug>/stories/`.
- `branch_path_filter` — `BR-NNNN` or list; restricts replay + isolation + debt + continuation checks to the named branches and their descendants. Default: all branches.
- `severity_threshold` — `error | warning | info`; default `info` (report everything). When set to `error`, only error-severity findings appear; `warning` reports errors + warnings.
- `emit_remediation_requests` — `true | false`; default `false`. When `true`, the audit drafts `RSP-NNNN` cards for fixable findings even if `remediation` is not explicitly in `mode`. When `mode` includes `remediation`, RSP drafting is unconditional regardless of this flag.

## Output Bundle

Direct-write markdown:

- `worlds/<world_slug>/stories/<story_slug>/audits/SAU-NNNN-<YYYY-MM-DD>.md` — the audit report; structured by severity ladder + per-mode sections + summary findings table.
- `worlds/<world_slug>/stories/<story_slug>/audits/SAU-NNNN/remediation-storylet-proposals/RSP-NNNN-<slug>.md` — one RSP card per fixable finding when `mode` includes `remediation` OR `emit_remediation_requests: true`. The sub-directory is created on first use of remediation mode for this audit.
- `worlds/<world_slug>/stories/<story_slug>/audits/INDEX.md` — bundle-local audit index updated last.

No patch-engine submissions. The audit is read-only with respect to story-bundle state.

## Pre-Flight

1. **Load FOUNDATIONS** — `docs/FOUNDATIONS.md`. §Story Bundles §5 (Validation Rules at Story Scope), §5a (Commitment Blocks Are Causal Moves), §5b (Schema-Minimalism), §6a (Belief vs. Fact), §11 (Mystery and Canon Authority — via the shared contract) govern the audit's checks.
2. **Load the shared contract** — `.claude/skills/_shared-templates/story-state-contract.md`. §4 record schemas (the audit compares records against these), §5 closed predicate DSL (for SLT precondition parse-back), §7 eight hard gates (the audit verifies bundle state respects them retrospectively), §9 branching procedure (for replay logic), §11 mystery and canon authority (for Phase 2e classification).
3. **Resolve the bundle** — `worlds/<world_slug>/stories/<story_slug>/` must exist with `STORY_KERNEL.md`, `_source/`, and at minimum `_source/branches/`, `_source/pages/`, `_source/events/`.
4. **Allocate ids**:
   - One `SAU` id via `mcp__worldloom__allocate_next_id(world_slug, 'SAU', story_slug=<story_slug>)`.
   - Per-RSP `RSP` ids (allocated at Phase 5 after findings are enumerated; `mcp__worldloom__allocate_next_id(world_slug, 'RSP', story_slug=<story_slug>, audit_id='SAU-NNNN')`).
5. **Load world canon context** via `mcp__worldloom__get_context_packet(world_slug, task_type='branching_story_health_audit', seed_nodes=<every M-NNNN with status:forbidden + every INV record + active cast + any CF the bundle's mirrored SF records derive from>, token_budget=<default>)`. Whole-class Mystery Reserve + Invariants loaded for the Phase 2e firewall.
6. **Cross-story Pre-flight** (only when `cross_story` in `mode`): enumerate every sibling bundle in `worlds/<world_slug>/stories/`; load each sibling's `_source/` index for cross-bundle reference resolution.
7. **HARD-GATE deferral** — the HARD-GATE fires at Phase 7 (Commit / Write) AFTER the audit report + optional RSP cards are drafted in working memory. The user reviews the full deliverable before any write.

## Phases

### Phase 1: Scope branches

Build the branch tree from `_source/branches/BR-*.yaml` records. For each branch:

- Identify the root page (lowest `turn_index` in the branch).
- Identify the active leaf (highest `turn_index` with no superseding entry).
- Identify any terminal pages (`PG.state_snapshot.continuation.terminal_status: terminal_closed | branch_pause`).
- Determine descendants and ancestors via the `parent_branch_id` chain.

Apply `branch_path_filter` if supplied — restrict subsequent structural checks to the named branches and their descendants. Cross-branch findings (e.g., branch-isolation violations) still scan across all branches; the filter affects which branches are walked for replay / debt / continuation.

Output: a scoped branch list + per-branch metadata used by Phases 2-4.

### Phase 2: Structural checks (mandatory when `structural` in `mode`; default)

Six sub-checks running in sequence. Each emits findings tagged with `severity` (error / warning / info) and `branch` (for branch-scoped findings) or `cross_branch` (for inter-branch findings).

**Phase 2a: Replay events**

For each scoped branch:

1. Load the root page's `state_snapshot`.
2. Walk the page chain in branch order.
3. For each page, apply the corresponding `SE.state_delta` to the running snapshot.
4. Compute the running snapshot's hash (sha256 over canonicalized YAML) and compare to `PG.state_hash`.
5. Record divergence as a `snapshot_replay_mismatch` finding with `severity: error`.

Snapshot divergence indicates corruption — the bundle's authoritative state hashes don't match a fresh replay from root. ERROR.

**Phase 2b: Branch isolation**

Flag:

- Records appearing in a branch's `state_snapshot.active_records` that were `created_at_page` of a sibling branch's page — `branch_isolation_leak`, ERROR.
- Author-pool `SLT` records (`scope.visibility: author_pool`) with preconditions referencing branch-local records (records whose `created_at_page` is non-null) — `author_pool_branch_dependency`, ERROR.
- Page-plan references in `pages-prose-plans/PG-*.md` to records that don't exist in the page's active snapshot — `plan_state_reference_dangling`, ERROR.
- Emitted `CHC` records whose `target_or_action_family` requires records not in the page's active snapshot — `choice_state_reference_dangling`, ERROR.

**Phase 2c: Debt health**

For each open `OBL-NNNN`, `CNSQ-NNNN`, and `THR-NNNN` in the scoped branches' leaf snapshots:

- Is it still actionable (referenced by at least one eligible commitment block's preconditions or effects)? If not — `unactionable_debt`, severity depends on `saliency.urgency` (HIGH urgency → WARNING; LOW urgency → INFO).
- Has it been ignored beyond its urgency threshold (specific to the bundle's cadence; default: HIGH urgency → ignored for >5 pages flags WARNING; MEDIUM → >10 pages flags WARNING; LOW → never)?
- Has it been invalidated by an upstream change (entity death / location move / belief shift that should have closed the debt)? — `invalidated_debt`, WARNING.

**Phase 2d: Belief / visibility health (FOUNDATIONS §Story Bundles §6a)**

Flag:

- Public consequences (`CNSQ` with high social-impact tags) with no `public` / `shared`-visibility `BEL` records anchoring them — `public_consequence_without_witness`, WARNING.
- Secret actions (events with `outcome_route: accommodate` involving deception) known by everyone (i.e., `BEL.holder: public` records derived from them without a corresponding revealing event) — `secret_publicly_known_without_event`, WARNING.
- Relationship changes (`SREL` supersessions) without a belief or event basis (`SREL.basis` doesn't trace to an `SE` or `BEL`) — `relationship_change_without_basis`, WARNING.
- Choices (`CHC` records) whose `player_visible_intent` requires the actor's `STENT.entity_status` + active `BEL` to support knowledge the prior page didn't establish — `choice_relies_on_unestablished_knowledge`, WARNING.
- Lies (`BEL` with `truth_relation: false, confidence: performative_lie`) that become accepted-as-true (`SF` records derived from them without a `branch_local_counterfactual` authority marker) — `lie_promoted_silently`, ERROR.

**Phase 2e: Mystery and canon safety (FOUNDATIONS Rule 7 + shared contract §11)**

Flag:

- Any mystery with `status: forbidden` resolved by an `SE.state_delta` — `forbidden_mystery_resolved`, ERROR.
- A `branch_local_counterfactual`-authority `SF` record treated as `world_level: true` in any downstream effect — `counterfactual_promoted_to_canon`, ERROR.
- A `canon_candidate`-authority `SE.promotion_claims[]` entry that didn't pause the bundle (no subsequent `story-fact-promotion-to-canon` invocation found in the audit-window) — `canon_candidate_not_promoted`, WARNING (the candidate may still be a deliberate hold).
- Promotion claims with rendered evidence required but missing rendered prose — `promotion_lacks_evidence`, WARNING (only when paired with a prose-attached page that should have rendered the claim).

ERROR-severity findings here are the hardest audit failures — they indicate the bundle has actively-broken canon discipline.

**Phase 2f: Continuation or terminal proof**

For each non-terminal leaf page:

- Is at least one author-pool or JIT-eligible `SLT` available against the page's `state_snapshot`? — if not, `unactionable_leaf`, ERROR.
- Does the page emit choices grounded in active records? — if not, `leaf_without_choices`, ERROR.

For each terminal leaf (`continuation.terminal_status: terminal_closed`):

- Does `terminal_rationale` name how high-salience debts were closed, abandoned, inherited, or intentionally left unresolved? — if not, `terminal_without_rationale`, WARNING.
- Are any debts orphaned (open in the leaf snapshot but not referenced by `terminal_rationale`)? — `orphan_debt_at_terminal`, WARNING.

### Phase 3: Prose checks (conditional on `prose` in `mode`)

For each `PG-NNNN` in the scoped branches:

- Does `pages-prose/PG-NNNN.md` exist when `PG.rendered_prose.path` is set? — if not, `missing_prose_file`, WARNING.
- Does `pages-prose-receipts/PG-NNNN.yaml` exist when prose has been rendered (one of the bundle's pages has a non-null `rendered_prose.path` for this PG)? — if not, `missing_prose_receipt`, INFO.
- For each existing receipt, does it record `verdict: FAIL`? — if so, `prose_receipt_failed`, severity from receipt's `repair_recommendation` (FAIL with `run_story_fact_promotion_to_canon` → ERROR; FAIL with `run_turn_cycle_repair` → ERROR; FAIL with `revise_prose` → WARNING).
- Does the prose receipt's `checks.invented_structural_fact: FAIL` flag a state-fact invention not yet repaired? — `unrepaired_prose_invention`, WARNING.
- Are there `SE.state_delta` records (state changes) that the prose for the corresponding `PG` doesn't render (per `required_event_rendered: WARN | FAIL`)? — `state_change_unrendered`, WARNING.

### Phase 4: Cross-story checks (conditional on `cross_story` in `mode`)

For each sibling bundle in `worlds/<world_slug>/stories/`:

- Do the sibling's mirrored `SF` records contradict this bundle's mirrored `SF` records on the same `derived_from_cf`? — `cross_story_mirrored_fact_contradiction`, WARNING. (Bundles can legitimately interpret canon differently; the audit flags but doesn't fail.)
- Do the sibling's `SE.promotion_claims[]` and this bundle's `SE.promotion_claims[]` contradict on the same target — i.e., both claim canon-candidate authority on contradictory `SF` content? — `cross_story_promotion_contradiction`, ERROR (a world-canon promotion path cannot have two contradictory canon candidates queued).
- Do the sibling's terminal closures inherit debts that exist in this bundle as still-open? — `cross_story_inherited_debt_mismatch`, INFO.

### Phase 5: Remediation drafting (conditional on `remediation` in `mode` OR `emit_remediation_requests: true`)

For each finding tagged `repair_kind != none` (the audit's finding emitter assigns a `repair_kind` from the streamlined-pipeline taxonomy: `commitment_block | turn_repair | prose_revision | promotion | branch_flag`), draft an `RSP-NNNN-<slug>.md` card:

```markdown
---
id: RSP-NNNN
audit_id: SAU-NNNN
created: <iso8601 date>
finding_ids: [<finding ids from this audit>]
repair_kind: commitment_block | turn_repair | prose_revision | promotion | branch_flag
target_records: [<record ids the repair should engage with>]
target_branch: BR-NNNN | null
suggested_block_purpose: aftermath | escalation | reveal | refusal | negotiation | flight | investigation | intimacy | conflict | repair | closure | transition | null
visibility: author_pool | branch_scoped | null
---

# RSP-NNNN: <short title>

## Findings addressed

(One bullet per finding_id, with severity + one-line summary)

## Rationale

(Narrative explanation of why this repair is needed and which lawful repair path applies.)

## Recommended next step

(Sibling-handoff guidance: which downstream skill consumes this RSP, with the relevant invocation hint.)
```

`repair_kind` taxonomy (per the streamlined-pipeline report):

- `commitment_block` — author pool needs a new block. Consumed by `commitment-block-authoring` `audit_repair` mode.
- `turn_repair` — the bundle needs a repair turn that adds branch-local state to support an unrepaired prose invention or an unactionable debt. Consumed by `branching-story-turn-cycle` with the user supplying a manual_action_text framing.
- `prose_revision` — rendered prose needs revision (typically tied to a `prose_receipt_failed` finding). User revises `pages-prose/PG-NNNN.md` and re-invokes `branching-story-prose-attach`.
- `promotion` — a `canon_candidate` authority claim should be promoted via `story-fact-promotion-to-canon`.
- `branch_flag` — a branch is structurally broken (e.g., replay mismatch); flag for the user's attention without proposing automated repair.

**Do NOT draft full commitment blocks here.** RSP cards are repair requests; `commitment-block-authoring` `audit_repair` mode consumes them and produces the actual SLT records.

### Phase 6: Author SAU report

Draft `worlds/<world_slug>/stories/<story_slug>/audits/SAU-NNNN-<YYYY-MM-DD>.md` with this structure:

```markdown
---
audit_id: SAU-NNNN
story_id: STORY-NNNN
story_slug: <story_slug>
world_slug: <world_slug>
created: <iso8601 date>
modes_run: [structural, prose, remediation, cross_story]   # whichever ran
branch_path_filter: null | BR-NNNN | [BR-NNNN, ...]
severity_threshold: error | warning | info
findings_total: N
findings_by_severity:
  error: <count>
  warning: <count>
  info: <count>
rsp_cards_emitted: N | 0
---

# SAU-NNNN — Bundle health audit (<YYYY-MM-DD>)

## Summary

<3-5 sentence overview of bundle health by mode.>

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

(One bullet per emitted RSP-NNNN with its `repair_kind` + suggested consumer skill + finding link.)
```

Apply `severity_threshold` to filter the findings table and per-phase sections.

### Phase 7: Commit / Write — HARD-GATE fires

1. Present the deliverable summary to the user: audit path, modes run, severity breakdown, top-5 highest-severity findings (one-liner each), RSP card count + per-card `repair_kind` summary, recommended next steps.
2. **HARD-GATE fires** — wait for explicit user approval. Auto Mode does not override.
3. On approval:
   - Write `audits/SAU-NNNN-<YYYY-MM-DD>.md` (direct write).
   - For each RSP card (if any), create the `audits/SAU-NNNN/remediation-storylet-proposals/` sub-directory on first use (idempotent `mkdir -p`), then write `RSP-NNNN-<slug>.md` (direct write).
   - Update `audits/INDEX.md` last.
4. Report the SAU path + RSP card inventory to the user. Surface the recommended next-step skill for each `repair_kind` cluster (`commitment-block-authoring audit_repair` for `commitment_block` cards; `branching-story-turn-cycle` for `turn_repair` cards; `branching-story-prose-attach` re-run for `prose_revision`; `story-fact-promotion-to-canon` for `promotion`; manual attention for `branch_flag`). Do NOT `git commit`.

**Failure behavior**: file-write fail → surface diagnostic to user; the audit was the deliverable, so this is a hard fail. Partial write success (SAU written but some RSP cards failed) → SAU is authoritative; remaining RSP cards can be repaired directly; surface partial-failure.

## Validation Rules This Skill Upholds

- **Rule 1 (No Floating Facts)** — Phase 2a (replay events). Mechanism: snapshot replay verifies every record referenced in `state_snapshot.active_records` corresponds to a real record file; missing references surface as replay mismatches.
- **Rule 4 (No Globalization by Accident)** — Phase 2b (branch isolation). Mechanism: flags sibling-branch records leaking into a branch's snapshot; flags author-pool blocks with branch-local dependencies.
- **Rule 5 (No Consequence Evasion)** — Phase 2c (debt health) + Phase 2f (continuation / terminal proof). Mechanism: unactionable debt + terminal-without-rationale findings expose Rule 5 violations after-the-fact (the audit catches what bootstrap / turn-cycle's eight-gate validation missed or accepted).
- **Rule 7 (Preserve Mystery Deliberately)** — Phase 2e (mystery and canon safety). Mechanism: forbidden-mystery-resolution + counterfactual-promotion-to-canon checks against whole-class Mystery Reserve loaded at Pre-flight.

## Record Schemas

All record schemas referenced by this skill live in `.claude/skills/_shared-templates/story-state-contract.md`:

- `PG` (§4.2), `SE` (§4.3), `SLT` (§4.4), `BEL` (§4.1), prose receipt (§4.5) — the audit reads these record types.

The SAU report and RSP cards are markdown direct-write artifacts (not atomic `_source/` records). Their shapes are defined inline in Phase 6 (SAU template) and Phase 5 (RSP template) above.

## FOUNDATIONS Alignment

| Principle | Phase | Mechanism |
|---|---|---|
| Rule 1 (No Floating Facts) | Phase 2a | Replay verifies every active-record reference resolves. |
| Rule 2 (No Pure Cosmetics) | N/A | Story-bundle scope. World-canon principle. |
| Rule 3 (No Specialness Inflation) | N/A | Same as Rule 2. |
| Rule 4 (No Globalization by Accident) | Phase 2b | Branch-isolation enforcement. |
| Rule 5 (No Consequence Evasion) | Phase 2c, 2f | Debt-health + continuation-or-terminal-proof findings. |
| Rule 6 (No Silent Retcons) | N/A | Audit reads only; emits no canon changes. |
| Rule 7 (Preserve Mystery Deliberately) | Phase 2e | Mystery / canon safety checks. |
| Rule 11 (No Spectator Castes) | N/A | World-canon-only principle. |
| Rule 12 (No Single-Trace Truths) | N/A | World-canon-only principle. |
| Canon Layers | Pre-flight, Phase 2e | World canon loaded via context packet; per-event canon-authority classification. |
| Mystery Reserve | Pre-flight, Phase 2e | Whole-class Mystery Reserve loaded; forbidden-status firewall. |
| §Story Bundles §4a (Plan-Authority Boundary) | All phases | The audit reads `PG` records as authoritative; does NOT mutate them. Drift between rendered prose and state is reported in findings, not in PG records. |
| §Story Bundles §5a (Commitment Blocks Are Causal Moves) | Phase 2b, 2c | Author-pool SLT records validated for branch-local-dependency leaks; debt-block matching validates eligibility. |
| §Story Bundles §5b (Schema-Minimalism) | N/A | Audit reads records but does not draft new ones. SLT schema enforcement is `commitment-block-authoring`'s scope. |
| §Story Bundles §6a (Belief vs. Fact) | Phase 2d | Belief / visibility health checks (lie-promotion, public-consequence-without-witness, etc.). |
| §Story Bundles §9 (Prose Length Discipline) | N/A | Audit reports no word-count metrics. |
| Change Control Policy | N/A | Audit emits no Change Log Entries. |
| Tooling Recommendation | Pre-flight | World canon retrieval via `mcp__worldloom__get_context_packet`. |

## Guardrails

- **Never mutate story state or world canon.** The audit reads `_source/` records, `pages-prose-plans/*.md`, `pages-prose/*.md`, `pages-prose-receipts/*.yaml`, and the bundle's `INDEX.md`. It writes ONLY to `audits/SAU-NNNN-*.md` + `audits/SAU-NNNN/remediation-storylet-proposals/RSP-NNNN-*.md` + `audits/INDEX.md`. No patch-engine submissions.
- **Never write rendered prose.** The audit reads prose for Phase 3 prose checks; it does not author prose.
- **RSP cards are repair requests, not blocks.** The audit drafts requests with `repair_kind`, `target_records`, `target_branch`, `rationale`, `suggested_block_purpose`, `visibility` — but NOT full SLT records. `commitment-block-authoring` `audit_repair` mode consumes RSP cards and produces the actual SLT records.
- **Audit is read-only with respect to bundle records.** Drift between rendered prose and committed state, replay mismatches, branch-isolation violations are all REPORTED in findings; the audit does NOT alter `PG` records, `SE` deltas, `SLT` blocks, or any other bundle-record file to "fix" what it finds.
- **Schema minimalism per shared contract §2.** The SAU report and RSP card shapes are defined inline in this skill's Phase 5 / Phase 6 templates. No nice-to-have fields.
- **Skills do not chain.** The audit never invokes `commitment-block-authoring`, `branching-story-turn-cycle`, `branching-story-prose-attach`, `story-fact-promotion-to-canon`, or `story-promotion-closeout`. RSP cards record sibling-handoff recommendations; the user separately invokes the named sibling with the RSP card path as input.
- **Worktree discipline**: if invoked inside a git worktree, all paths resolve from the worktree root.
- **Known integration debt**:
  - **MCPENH-040** (BEL allocator registration), **PEENH-007** (`create_bel_record` patch op), **VALENH-011** (BEL `record_schema_compliance`) — Phase 2d (belief / visibility health) reads `BEL` records. Inherited from bootstrap's Shape C rollout.
  - **MCPENH-041** (task_type rename) — does NOT affect this skill; `branching_story_health_audit` task_type was not renamed.

## What is intentionally NOT in this skill

- **No LLM semantic pass by default.** Default `structural` mode is fully deterministic — replay, schema checks, predicate parse, hash comparison. The optional `prose` mode reads prose receipts (already deterministic-checked by `branching-story-prose-attach`) but does not run a fresh LLM critic over prose. A future ticket could add an opt-in `prose_critic` mode if needed.
- **No bundle mutation.** The audit reports; it does not edit `PG` / `SE` / `SLT` / `BEL` records.
- **No RSP-to-SLT inflation.** RSP cards are requests; the audit does NOT draft full SLT records. `commitment-block-authoring` `audit_repair` mode owns SLT drafting.
- **No cross-world audit.** `cross_story` mode is bounded to sibling bundles within the same world. World-level audits across `worlds/*/` are out of scope (handled by `continuity-audit` if and when it extends to cross-world coverage).
- **No word-count metrics** (per FOUNDATIONS §Story Bundles §9). Prose-mode findings cite receipt verdicts, not word counts.

## References

- `.claude/skills/_shared-templates/story-state-contract.md` — §4 record schemas, §5 closed predicate DSL, §7 eight hard gates, §9 branching procedure, §11 mystery and canon authority.
- `docs/FOUNDATIONS.md` — §Story Bundles §5 / §5a / §5b / §6a govern the audit's checks.
- `reports/streamlined-story-pipelines/06-branching-story-health-audit.md` — streamlined-pipeline source report.
- `docs/plans/2026-05-13-streamlined-story-skills-greenfield-plan.md` §C.5 — blueprint summary.
- Sibling skills:
  - `.claude/skills/branching-story-bootstrap/SKILL.md`, `.claude/skills/branching-story-turn-cycle/SKILL.md`, `.claude/skills/branching-story-prose-attach/SKILL.md`, `.claude/skills/commitment-block-authoring/SKILL.md` — upstream producers of the records this audit reads.
  - `commitment-block-authoring` `audit_repair` mode (already shipping) consumes this audit's `RSP-NNNN` cards.
  - `story-fact-promotion-to-canon` (future, not yet shipping) is the recommended next step for RSP cards with `repair_kind: promotion`.
- `tools/world-mcp/src/tools/allocate-next-id.ts` — `SAU` and `RSP` id-class registration. RSP is sub-audit-scoped (requires `story_slug` + `audit_id`).
