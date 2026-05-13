# story-promotion-closeout

## Purpose

Close a story promotion after `canon-addition` has adjudicated the proposal package. This skill consumes the adjudication verdict + the linked canon-addition outputs (CF / CH / PA record ids), supersedes story-local records to link the canon outcome (or to preserve the claim as branch-local on rejected outcomes), optionally archives or flags contradictory same-story branches per the proposal's `contradiction_preference`, and writes an `SP-NNNN-closeout.md` companion to the original promotion ledger.

**The closeout NEVER mutates world canon.** Canon-addition already did that during adjudication. The closeout's job is to write the verdict back onto story-local records so the bundle's state reflects what canon-addition decided.

Story-promotion-closeout is the seventh and final skill in the rebuilt story-skill family per `docs/plans/2026-05-13-streamlined-story-skills-greenfield-plan.md`. It pairs with `story-fact-promotion-to-canon` (which creates the proposal package) and `canon-addition` (which adjudicates) to complete the lawful story-to-world canon-promotion path.

## Inputs

Required:

- `world_slug` — existing world directory slug under `worlds/`.
- `story_slug` — existing story bundle slug.
- `promotion_id` — `SP-NNNN` of the source promotion (whose proposal package was previously written by `story-fact-promotion-to-canon`).
- `canon_addition_verdict` — `accepted | accepted_with_limits | rejected | deferred`. The verdict canon-addition emitted on the proposal package.

Required on accepted-flavored verdicts (`accepted | accepted_with_limits`):

- `linked_cf_ids` — list of `CF-NNNN` ids canon-addition created (or modified) when accepting the candidate. Used to populate `promoted_to_cf` on superseding story-local records.
- `linked_ch_ids` — list of `CH-NNNN` (Change Log) ids canon-addition created. Used to populate `promoted_via_ch` on superseding records.
- `linked_pa_ids` — list of `PA-NNNN` (Adjudication) ids canon-addition created. Used for cross-reference + verification (Phase 3 verifies the PA records exist at `worlds/<world_slug>/adjudications/PA-NNNN-*.md`).

Optional:

- `same_story_branch_handling` — `none | flag | archive`. Default: derive from the proposal package's `contradiction_preference` field. `flag` marks contradictory same-story branches with a metadata note; `archive` supersedes the branch records with archived status; `none` makes no branch-level change.
- `affected_branch_ids` — list of `BR-NNNN` to apply `same_story_branch_handling` to. Default: enumerate from the proposal package's `downstream_impact_report.same_story_contradictory_branches`.
- `notes` — natural-language closeout notes captured in the `SP-NNNN-closeout.md` ledger.
- `emit_closeout_event` — `true | false`. Default `false`. When `true`, emit an `SE-NNNN` with `event_kind: promotion_closeout` for the bundle's event log; this is the ONLY way closeout produces a non-supersession patch op.

## Output Bundle

Patch-engine story records (submitted via `mcp__worldloom__submit_patch_plan` per shared contract §10):

On `accepted | accepted_with_limits`:

- Superseding `SF` records carrying `promoted_to_cf: CF-NNNN` + `promoted_via_ch: CH-NNNN` + `supersedes: <prior-SF-id>` — one per `SF` source record from the proposal package.
- Superseding `BEL` records (when belief-witness records need a `promoted_to_cf` link for canon-derived beliefs) — one per implicated `BEL`.
- Superseding `DA` records (when `source_kind: artifact_canonization` — link story-local DA to world-level DA created by canon-addition).
- Superseding `STENT` records (when `source_kind: character_outcome` — link story-local entity outcome to world-canon character).
- Superseding `SREL` records (when `source_kind: relationship_or_institutional_outcome`).
- Superseding `BR` records — when `same_story_branch_handling: flag | archive`, one per branch in `affected_branch_ids`.
- Optional `SE-NNNN` with `event_kind: promotion_closeout` — only when `emit_closeout_event: true`.

On `rejected`:

- Superseding source records (typically just `SF` and `BEL`) marked `promotion_rejected: SP-NNNN` + retaining `branch_local_counterfactual` authority (if the source was a counterfactual that got rejected) or adding a `contested_authority` marker (if the source was held as canon_candidate but canon-addition rejected promotion).
- Optionally a new `BEL` record marking the claim as `false` or `disputed` if that matters in-story (driven by the user's `notes` argument).

On `deferred`:

- No supersessions. The proposal stays unresolved; the closeout records the deferral with a timestamp.

Direct-write markdown:

- `worlds/<world_slug>/stories/<story_slug>/story-promotions/SP-NNNN-closeout.md` — new ledger companion to the original `SP-NNNN.md` (which stays unchanged as the historical record of the proposal-time state).
- `worlds/<world_slug>/stories/<story_slug>/INDEX.md` — bundle index updated last.
- `worlds/<world_slug>/stories/INDEX.md` — per-world story index only when `same_story_branch_handling: archive` changed any branch's archive status.

**No world-canon writes occur.** Canon-addition already wrote the CF / CH / PA records during adjudication. The closeout reads them as references; it does NOT modify them.

## Pre-Flight

1. **Load FOUNDATIONS** — `docs/FOUNDATIONS.md`. §Story Bundles §11 (mystery and canon authority), §Canon Layers (the linked_cf_ids may carry any of the 5 statuses), Rule 6 (No Silent Retcons — canon-addition already wrote the Change Log Entry; closeout reads it).
2. **Load the shared contract** — `.claude/skills/_shared-templates/story-state-contract.md`. §4 record schemas (SF, BEL, STENT, SREL, DA, BR, SE — all of which may be superseded), §10 shared write order, §11 mystery and canon authority.
3. **Resolve the bundle + promotion** — `worlds/<world_slug>/stories/<story_slug>/` must exist with `story-promotions/SP-NNNN-proposal-package.yaml` AND `story-promotions/SP-NNNN.md`. Abort with promotion-not-found error if either is missing.
4. **Load the proposal package** — read `SP-NNNN-proposal-package.yaml` to obtain: source_kind, source_records, branch_path, candidate (CF-shaped), `downstream_impact_report.same_story_contradictory_branches`, `contradiction_preference`. The candidate's `promotion_id` MUST match the `promotion_id` argument.
5. **Validate verdict-linked ids** — when `canon_addition_verdict ∈ {accepted, accepted_with_limits}`: each `CF-NNNN` in `linked_cf_ids` MUST resolve to an existing `worlds/<world_slug>/_source/canon/CF-NNNN.yaml`; each `CH-NNNN` in `linked_ch_ids` MUST resolve to `worlds/<world_slug>/_source/change-log/CH-NNNN.yaml`; each `PA-NNNN` in `linked_pa_ids` MUST resolve to a `worlds/<world_slug>/adjudications/PA-NNNN-*.md` file. Abort with linked-record-not-found error on any miss (this prevents recording a fake canon-addition outcome).
6. **Allocate ids** — via `mcp__worldloom__allocate_next_id(world_slug, id_class, story_slug=<story_slug>)`:
   - One id per superseding record (the count depends on source_kind + verdict).
   - One `SE-NNNN` id when `emit_closeout_event: true`.
   - For `same_story_branch_handling: flag | archive`: one new `BR-NNNN` per branch in `affected_branch_ids` (supersedes the existing branch record).
7. **HARD-GATE deferral** — the HARD-GATE fires at Phase 5 (Commit / Write) AFTER the patch plan + closeout ledger are drafted in working memory. The user reviews the supersession inventory + branch-handling actions + closeout summary before any write.

## Phases

### Phase 1: Load promotion package + canon-addition verdict context

Load into working memory:

- The `SP-NNNN-proposal-package.yaml` (per Pre-flight step 4).
- The original `SP-NNNN.md` ledger (for cross-reference in the closeout ledger).
- For accepted-flavored verdicts: each linked CF record (`worlds/<world_slug>/_source/canon/CF-NNNN.yaml`) + each linked CH record + each linked PA record. These are read-only references — the closeout cites them in superseding story-local records but does NOT modify them.
- All source records from the proposal package: SF / BEL / STENT / SREL / DA per source_kind.
- The branches in `affected_branch_ids` (loaded for Phase 2 branch-handling decisions).

### Phase 2: Determine story-local effects per verdict

The verdict dictates the supersession pattern:

**`accepted`**: the candidate is now world canon. Story-local source records are superseded to carry the canon link:

- Each `SF-NNNN` source: new `SF-NNNN+M` with `supersedes: SF-NNNN`, `promoted_to_cf: CF-NNNN` (from `linked_cf_ids`), `promoted_via_ch: CH-NNNN` (from `linked_ch_ids`), `promoted_via_pa: PA-NNNN` (from `linked_pa_ids`).
- Each implicated `BEL-NNNN` whose `truth_relation` should now reflect canon truth: new `BEL` with `truth_relation: true` (was previously `unknown | partly_true | contested`), `supersedes: <prior BEL id>`, `promoted_via_cf: CF-NNNN`.
- For `source_kind: artifact_canonization`: new story-local `DA-NNNN+M` with `supersedes: <prior DA id>`, `linked_world_da: DA-NNNN` (the world-level DA canon-addition created; if canon-addition didn't write a world-level DA, this link is null and the story-local DA just records the promotion outcome).
- For `source_kind: character_outcome`: new `STENT-NNNN+M` superseding the prior STENT with `promoted_to_cf: CF-NNNN` (when the character outcome maps to a canon-level character status).
- For `source_kind: relationship_or_institutional_outcome`: new `SREL-NNNN+M` superseding with `promoted_to_cf: CF-NNNN`.

**`accepted_with_limits`**: same supersession pattern as `accepted`, but each superseding record includes a `canon_limits: <natural-language description>` field reproducing canon-addition's restrictions (e.g., "accepted only when the claim is qualified as 'under the Marsh-Court's jurisdiction'").

**`rejected`**: the candidate is NOT canon. Story-local source records are superseded to mark the rejection but preserve the claim as branch-local:

- Each `SF-NNNN` source: new `SF-NNNN+M` with `supersedes: <prior SF id>`, `promotion_rejected: SP-NNNN`, `authority: branch_local_counterfactual` (downgraded if it was `canon_candidate`), retaining `branch/story scope`.
- Optionally a new `BEL-NNNN` marking the claim as `false | disputed | rumor` when the user's `notes` argument indicates the rejection should manifest in-story (e.g., a character learns the proposed canon was wrong).
- No CF / CH / PA links — there are no canon-addition outputs to cite.

**`deferred`**: canon-addition didn't decide either way. No supersessions. The closeout records the deferral with `deferred_at: <iso8601>` + the user's `notes` (typically explaining why canon-addition deferred — e.g., insufficient evidence, waiting for cross-story confirmation).

### Phase 3: Validate

Run validation gates BEFORE patch submission:

1. **No world-canon mutation attempted** — the patch plan's ops target ONLY `worlds/<world_slug>/stories/<story_slug>/_source/<class>/*.yaml`; ZERO ops target `worlds/<world_slug>/_source/<world-subdir>/*.yaml`. Hook 3 enforces structurally, but this gate verifies before submission.

2. **Accepted-flavored links reference actual canon-addition outputs** — for each `linked_cf_ids` / `linked_ch_ids` / `linked_pa_ids` entry, verify the corresponding world-canon file exists (already done in Pre-flight step 5; re-verified here as a defense-in-depth check).

3. **Branch-handling actions only affect same-story branches** — when `same_story_branch_handling: flag | archive`, every branch in `affected_branch_ids` MUST exist in this bundle's `_source/branches/`. Cross-story branch modifications are forbidden.

4. **Story records superseded append-only** — every superseding record carries a `supersedes: <prior-id>` field; no in-place mutation of structural fields on prior records. The patch engine enforces; this gate verifies the plan shape.

5. **Rejected outcomes do not erase branch-local history** — on `rejected`, source records are superseded (new file with `promotion_rejected` marker), NOT deleted or replaced in-place. The original `SF` / `BEL` / etc. remain on disk; the new superseding records carry the rejection metadata.

6. **Verdict-driven supersession count matches the proposal package's source_records inventory** — every source record in the proposal package gets a corresponding supersession (or non-supersession on `deferred`). Missing supersessions for accepted-flavored verdicts indicate the closeout is incomplete; abort.

### Phase 4: Author SP-NNNN-closeout.md ledger

Draft `worlds/<world_slug>/stories/<story_slug>/story-promotions/SP-NNNN-closeout.md` per the template:

```markdown
---
promotion_id: SP-NNNN
canon_addition_verdict: accepted | accepted_with_limits | rejected | deferred
linked_cf_ids: [<CF-NNNN>]
linked_ch_ids: [<CH-NNNN>]
linked_pa_ids: [<PA-NNNN>]
same_story_branch_handling: none | flag | archive
affected_branch_ids: [<BR-NNNN>]
closeout_event: SE-NNNN | null
closed_at: <iso8601 date>
---

# SP-NNNN closeout: <verdict>

## Verdict

<canon_addition_verdict> — <one-paragraph narrative explanation>

## Linked canon-addition outputs (accepted-flavored only)

- **CF records**: <CF-NNNN list with one-line title each>
- **CH records**: <CH-NNNN list>
- **PA records**: <PA-NNNN list with adjudication-verdict summary>

## Story-local effects applied

<Per superseding record: prior id → new id, with the canon link / rejection marker / deferral note>

## Branch handling

<Per branch in affected_branch_ids: prior status → new status (flagged / archived / unchanged)>

## Notes

<User-supplied notes>

## Recommended next steps

<For accepted: bundle is now canon-aware; turn-cycle reads the superseding records.>
<For rejected: branch-local counterfactual preserved; no further closeout action required.>
<For deferred: the promotion remains open; re-run canon-addition when evidence accumulates.>
```

The original `SP-NNNN.md` ledger stays unchanged as the historical proposal-time record.

### Phase 5: Commit / Write — HARD-GATE fires

1. Build the patch plan covering all supersessions from Phase 2 as a single envelope. Operations include `create_sf_record`, `create_bel_record`, `create_stent_record`, `create_srel_record`, `create_da_record` (if applicable), `create_br_record` (for branch supersessions), and optionally `create_se_record` (when `emit_closeout_event: true`).

2. Dry-run via `mcp__worldloom__validate_patch_plan`. Each new record passes `record_schema_compliance` (BEL via VALENH-011 inheritance).

3. Present the complete deliverable summary to the user:
   - `SP-NNNN` id + verdict.
   - Linked canon-addition outputs (CF / CH / PA records cited, with one-line summaries).
   - Per-source-record supersession plan (prior id → new id, with canon link or rejection marker).
   - Branch-handling actions (per branch in `affected_branch_ids`: flag / archive / none).
   - Optional SE event preview.
   - Closeout ledger preview.

4. **HARD-GATE fires** — wait for explicit user approval. Auto Mode does not override.

5. On approval:
   - Obtain patch approval token; submit the patch plan via `mcp__worldloom__submit_patch_plan`.
   - On patch success: write `story-promotions/SP-NNNN-closeout.md` (direct write).
   - Update bundle `INDEX.md` to reflect the closeout entry + any branch-status changes.
   - For `same_story_branch_handling: archive`: update per-world `stories/INDEX.md` to reflect the archived branch's status (this is the only condition under which the per-world index changes; flag-only or none leave it alone).

6. Report the closeout path + supersession inventory + branch-handling actions to the user. Do NOT `git commit`.

**Failure behavior**: Pre-flight failure (missing promotion, missing linked canon-addition records) → write nothing; surface the missing-reference error. Phase 3 validation failure → write nothing; surface the failed gate. Patch submission failure → write nothing; the verdict is recorded only in user-side state until re-invoked. Partial write success (patch succeeded but markdown failed) → patch is authoritative; closeout ledger can be repaired manually; surface partial-failure.

## Validation Rules This Skill Upholds

- **Rule 4 (No Globalization by Accident)** — Phase 3 gate 3 (branch-handling actions only affect same-story branches). Mechanism: closeout cannot reach into sibling story bundles or world-canon branches.
- **Rule 6 (No Silent Retcons)** — Phase 1 + Phase 3 gate 2. Mechanism: closeout reads the `CH-NNNN` Change Log Entry canon-addition wrote (which satisfies Rule 6 at world scope); closeout's story-local supersessions cite the `CH-NNNN` in `promoted_via_ch` so the audit trail is intact.

Rules 1 / 2 / 3 / 5 / 7 / 11 / 12 are upstream-enforced by `canon-addition` at adjudication time (Rules 1 / 2 / 3 / 5 / 11 / 12) or by `story-fact-promotion-to-canon` at proposal time (Rule 7's mystery firewall). Closeout records the outcome; it does NOT re-enforce these rules.

## Record Schemas

All record schemas referenced by this skill live in `.claude/skills/_shared-templates/story-state-contract.md`:

- `SF` (§4 — story-local fact), `BEL` (§4.1), `STENT`, `SREL`, `DA`, `BR`, `SE` (§4.3) — record classes that may be superseded by this skill.

The `SP-NNNN-closeout.md` ledger schema is defined inline in Phase 4's template above. No skill-local template directory needed — the ledger is structurally simple and the inline template suffices (sub-class (b) authored from scratch).

## FOUNDATIONS Alignment

| Principle | Phase | Mechanism |
|---|---|---|
| Rule 1 (No Floating Facts) | N/A at this skill | Canon-addition enforced at adjudication; superseding records inherit field structure from prior records. |
| Rule 2 (No Pure Cosmetics) | N/A at this skill | Canon-addition enforced. |
| Rule 3 (No Specialness Inflation) | N/A at this skill | Canon-addition enforced. |
| Rule 4 (No Globalization by Accident) | Phase 3 gate 3 | Branch-handling limited to same-story branches; cross-story modifications forbidden. |
| Rule 5 (No Consequence Evasion) | N/A at this skill | Canon-addition enforced (the candidate's consequences were vetted at adjudication). |
| Rule 6 (No Silent Retcons) | Phase 1, Phase 3 gate 2 | Read canon-addition's `CH-NNNN`; cite it in story-local supersessions via `promoted_via_ch`. |
| Rule 7 (Preserve Mystery Deliberately) | N/A at this skill | Story-fact-promotion-to-canon enforced the mystery firewall at proposal time. |
| Rule 11 (No Spectator Castes) | N/A at this skill | Canon-addition enforced. |
| Rule 12 (No Single-Trace Truths) | N/A at this skill | Canon-addition enforced. |
| Canon Layers | Phase 1 | Read the linked CF records to see their `status` (5 layer values). |
| Mystery Reserve | N/A at this skill | Story-fact-promotion-to-canon's firewall ran at proposal time. |
| §Story Bundles §4a (Plan-Authority Boundary) | All phases | The closeout reads `PG` records as authoritative; never mutates them. Supersessions affect SF / BEL / STENT / SREL / DA / BR, NOT page records. |
| §Story Bundles §11 (Mystery and Canon Authority) | Phase 2 | On accepted verdicts, story-local SF records gain `promoted_to_cf` + `authority` updated from `canon_candidate` to canonical. |
| Change Control Policy | Phase 1, Phase 3 gate 2 | Closeout reads canon-addition's CH Change Log Entry; the story-local supersession cites it. |
| Tooling Recommendation | Pre-flight | Linked canon-addition records loaded via direct file reads (CF / CH / PA paths); world canon retrieval via `mcp__worldloom__get_record(record_id)` when needed for cross-reference. |

## Guardrails

- **Never mutate world canon.** Hook 3 blocks raw `Edit` / `Write` on `worlds/<slug>/_source/<world-subdir>/*.yaml`. Patch plans submitted by this skill target ONLY story-bundle scope (`worlds/<world_slug>/stories/<story_slug>/_source/<class>/*.yaml`). Phase 3 gate 1 verifies before submission as defense-in-depth.
- **Closeout records the verdict; it does NOT decide.** Canon-addition decided at adjudication. The closeout's job is to write the verdict back onto story-local records faithfully.
- **Rejected outcomes preserve branch-local history.** Closeout supersedes (new record file with rejection marker) rather than deleting. The original SF / BEL / etc. remain on disk; the supersession adds the canon-rejection metadata.
- **Branch-handling actions only affect same-story branches.** Phase 3 gate 3. Cross-story branch modifications are forbidden; cross-story contradictions belong to `branching-story-health-audit` `cross_story` mode or a separate world-level workflow.
- **The original SP-NNNN.md ledger stays unchanged.** Closeout writes a NEW `SP-NNNN-closeout.md` companion. This preserves the historical proposal-time record append-only at the markdown layer.
- **Schema minimalism per shared contract §2 + FOUNDATIONS §5b.** Superseding records add only the canon-link fields (`promoted_to_cf` / `promoted_via_ch` / `promoted_via_pa` / `canon_limits` / `promotion_rejected`); no other extras.
- **Skills do not chain.** Closeout never invokes `canon-addition` (already ran), `story-fact-promotion-to-canon` (already ran), or any other sibling. The user invokes closeout separately after canon-addition adjudicates.
- **Worktree discipline**: paths resolve from worktree root.
- **Known integration debt**:
  - **MCPENH-040** (BEL allocator registration), **PEENH-007** (`create_bel_record` patch op), **VALENH-011** (BEL `record_schema_compliance`) — Phase 2 supersedes BEL records (when belief witnesses need canon-aware updates). Inherited from bootstrap's Shape C rollout.
  - **MCPENH-041** (task_type rename) — does NOT affect this skill; closeout does not require a registered `mcp__worldloom__get_context_packet` task_type (it works against direct-record reads + the proposal package YAML).

## What is intentionally NOT in this skill

- **No world-canon writes.** Canon-addition already wrote the CF / CH / PA records during adjudication. Closeout reads them as references; never modifies.
- **No re-enforcement of world-canon rules.** Rules 1 / 2 / 3 / 5 / 6 / 7 / 11 / 12 were enforced at adjudication (Rules 1/2/3/5/6/11/12 by canon-addition) or proposal time (Rule 7's mystery firewall by story-fact-promotion-to-canon). Closeout assumes those gates already passed.
- **No re-running of canon-addition.** Closeout consumes the verdict; it does not re-adjudicate.
- **No cross-story modifications.** Closeout's branch-handling is bounded to the source bundle.
- **No mutation of the original SP-NNNN.md ledger.** New closeout ledger is written as a companion file; the original is preserved as the historical proposal-time record.
- **No automatic invocation of further siblings.** When the closeout completes, the user may want to run `branching-story-health-audit` to verify the bundle's post-closeout state, or `branching-story-turn-cycle` to advance the story now that canon has been updated — but the closeout does NOT trigger those automatically.

## References

- `.claude/skills/_shared-templates/story-state-contract.md` — §4 record schemas, §10 shared write order, §11 mystery and canon authority.
- `docs/FOUNDATIONS.md` — §Canon Layers (linked CF status values), §Canon Fact Record Schema (linked CF structure read at Phase 1), Rule 6 (Change Log Entry as the Rule 6 satisfier — closeout cites the CH at story scope).
- `reports/streamlined-story-pipelines/08-story-promotion-closeout.md` — streamlined-pipeline source report.
- `docs/plans/2026-05-13-streamlined-story-skills-greenfield-plan.md` §C.7 — blueprint summary.
- Sibling skills:
  - `.claude/skills/story-fact-promotion-to-canon/SKILL.md` — UPSTREAM creator of the SP-NNNN proposal package this skill consumes.
  - `.claude/skills/canon-addition/SKILL.md` — adjudicates the proposal package and emits the verdict + linked CF/CH/PA records this skill reads.
  - Rebuilt story-skill family (`branching-story-bootstrap`, `branching-story-turn-cycle`, `branching-story-prose-attach`, `commitment-block-authoring`, `branching-story-health-audit`, `story-fact-promotion-to-canon`) — produce the bundle records this skill supersedes.
