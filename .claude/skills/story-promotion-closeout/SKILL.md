---
name: story-promotion-closeout
description: "Use when closing a story promotion after canon-addition has adjudicated the proposal package. Records the verdict in a closeout ledger and, only when the verdict changes story-local state, supersedes affected SF/BEL/STENT/SREL/DA records using the amended shared schemas. Produces: optional superseding story records via patch engine + SP-<integer>-closeout.md ledger + bundle INDEX.md update + conditional per-world stories/INDEX.md update on archive + optional SE-<integer> closeout event. Mutates: only worlds/<world_slug>/stories/<story_slug>/ plus optionally worlds/<world_slug>/stories/INDEX.md when same_story_branch_handling: archive."
user-invocable: true
arguments:
  - name: world_slug
    description: "Existing world directory slug under worlds/"
    required: true
  - name: story_slug
    description: "Existing story bundle slug under worlds/<world_slug>/stories/"
    required: true
  - name: promotion_id
    description: "SP-<integer> of the source promotion (whose proposal package was previously written by story-fact-promotion-to-canon)"
    required: true
  - name: canon_addition_verdict
    description: "accepted | accepted_with_limits | rejected | deferred. The verdict canon-addition emitted on the proposal package."
    required: true
  - name: linked_cf_ids
    description: "List of CF-<integer> ids canon-addition created (or modified). Required when verdict is accepted-flavored; ignored otherwise."
    required: false
  - name: linked_ch_ids
    description: "List of CH-<integer> (Change Log) ids canon-addition created. Required when verdict is accepted-flavored; ignored otherwise."
    required: false
  - name: linked_pa_ids
    description: "List of PA-<integer> (Adjudication) ids canon-addition created. Required when verdict is accepted-flavored; ignored otherwise."
    required: false
  - name: same_story_branch_handling
    description: "none | flag | archive. Default: derive from the proposal package's contradiction_preference. Limits branch-handling to same-story branches only."
    required: false
  - name: affected_branch_ids
    description: "List of BR-<integer> to apply same_story_branch_handling to. Default: enumerate from the proposal package's downstream_impact_report.same_story_contradictory_branches."
    required: false
  - name: notes
    description: "Natural-language closeout notes captured in the SP-<integer>-closeout.md ledger."
    required: false
  - name: emit_closeout_event
    description: "true | false. Default false. When true, emit one SE-<integer> with event_kind: promotion_closeout."
    required: false
---

# Story Promotion Closeout

Close a story promotion after canon-addition has adjudicated — record the verdict in the closeout ledger, supersede story-local records only when their canonical fields actually change, and never mutate world canon.

<HARD-GATE>
Do NOT submit any patch plan to `mcp__worldloom__submit_patch_plan`, write `worlds/<world_slug>/stories/<story_slug>/story-promotions/SP-<integer>-closeout.md`, update bundle `INDEX.md`, or update per-world `stories/INDEX.md`, until:

(a) Pre-flight Check has completed: bundle resolved; `SP-<integer>-proposal-package.yaml` + `SP-<integer>.md` ledger loaded and `promotion_id` verified; canon-addition verdict + accepted-flavored linked CF / CH / PA records existence-verified at `worlds/<world_slug>/_source/canon/`, `worlds/<world_slug>/_source/change-log/`, `worlds/<world_slug>/adjudications/`; supersession ids allocated per source_records count + optional SE id allocated.

(b) Phases 1-4 have completed in working memory: verdict context loaded with linked CF / CH / PA cross-references (Phase 1); story-local effects determined per verdict-specific supersession pattern (Phase 2); 6-gate Phase 3 validation passed (no world-canon mutation; linked-records exist; branch-handling same-story; supersedes pattern verified; rejected preserves history; supersession count matches proposal package source_records inventory); `SP-<integer>-closeout.md` ledger drafted (Phase 4).

(c) Phase 3 validation passed across all 6 gates.

(d) The user has explicitly approved the deliverable summary (verdict + linked-records inventory; per-source-record supersession plan; branch-handling actions per `affected_branch_ids`; optional SE event preview; closeout ledger preview).

This gate is authoritative under Auto Mode or any other autonomous-execution context — invoking this skill does not constitute approval of the deliverable summary.
</HARD-GATE>

## Process Flow

```
Pre-flight Check (load FOUNDATIONS + shared contract; resolve bundle +
  SP-<integer>-proposal-package.yaml + SP-<integer>.md ledger; verify verdict-
  linked CF / CH / PA records exist; allocate supersession ids +
  optional SE id)
        |
        v
Phase 1: Load promotion package + canon-addition verdict context
                                   (read-only linked CF / CH / PA refs)
        |
        v
Phase 2: Determine story-local effects per verdict
                                   (verdict-specific supersession pattern)
        |
        v
Phase 3: Validate (6 gates: no world canon mutation; linked-records
                  exist; branch-handling same-story; supersedes used;
                  rejected preserves history; supersession count matches)
        |
        v
Phase 4: Author SP-<integer>-closeout.md ledger
        |
        v
Phase 5: HARD-GATE fires → patch (create_*_record per supersession +
                                   optional create_se_record)
                          + SP-<integer>-closeout.md write
                          + bundle INDEX.md update
                          + conditional per-world stories/INDEX.md
                            update on archive
```

## Inputs

### Required

- `world_slug` — string — existing world directory slug under `worlds/`
- `story_slug` — string — existing story bundle slug under `worlds/<world_slug>/stories/`
- `promotion_id` — `SP-<integer>` — source promotion id
- `canon_addition_verdict` — enum — `accepted | accepted_with_limits | rejected | deferred`

### Conditionally required (on accepted-flavored verdicts: `accepted | accepted_with_limits`)

- `linked_cf_ids` — list[CF-<integer>] — canon-addition's CF outputs
- `linked_ch_ids` — list[CH-<integer>] — canon-addition's Change Log outputs
- `linked_pa_ids` — list[PA-<integer>] — canon-addition's Adjudication outputs

### Optional

- `same_story_branch_handling` — enum — `none | flag | archive`. Default: derive from proposal package's `contradiction_preference`.
- `affected_branch_ids` — list[BR-<integer>] — branches to apply `same_story_branch_handling`. Default: enumerate from proposal package's `downstream_impact_report.same_story_contradictory_branches`.
- `notes` — string — closeout notes captured in the ledger.
- `emit_closeout_event` — `true | false`. Default `false`. Emits one `SE-<integer>` with `event_kind: promotion_closeout`.

## Output

| Class | File path | Created when |
|---|---|---|
| `SF-<integer>` (supersession) | `_source/facts/SF-<integer>.yaml` | IF verdict ∈ {accepted, accepted_with_limits, rejected} AND proposal contains SF source records |
| `BEL-<integer>` (supersession) | `_source/beliefs/BEL-<integer>.yaml` | IF belief witnesses need an amended-schema update to `truth_relation`, `claim`, `basis`, or `consequences` |
| `STENT-<integer>` (supersession) | `_source/entities/STENT-<integer>.yaml` | IF `source_kind: character_outcome` AND verdict accepted-flavored |
| `SREL-<integer>` (supersession) | `_source/relationships/SREL-<integer>.yaml` | IF `source_kind: relationship_or_institutional_outcome` AND verdict accepted-flavored |
| `DA-<integer>` (supersession) | `_source/artifacts/DA-<integer>.yaml` | IF `source_kind: artifact_canonization` AND verdict accepted-flavored (uses `append_story_diegetic_artifact_record`) |
| `SE-<integer>` | `_source/events/SE-<integer>.yaml` | IF `emit_closeout_event: true` (single record with `event_kind: promotion_closeout`) |
| `SP-<integer>-closeout.md` | `story-promotions/SP-<integer>-closeout.md` | Always (closeout ledger; companion to original SP-<integer>.md which stays unchanged) |
| Bundle `INDEX.md` | `INDEX.md` | Always (updated last) |
| Per-world stories INDEX | `worlds/<world_slug>/stories/INDEX.md` | IF `same_story_branch_handling: archive` (archived branch status reflected) |

All patch-engine submissions target story-bundle scope; ZERO ops target `worlds/<world_slug>/_source/<world-subdir>/*.yaml`. The original `SP-<integer>.md` ledger stays unchanged as the historical proposal-time record.

## World-State Prerequisites

Before this skill acts, it MUST receive (per FOUNDATIONS §Tooling Recommendation):

- `docs/FOUNDATIONS.md` — §Story Bundles §5 (story-scope authority discipline), §Canon Layers (linked CF status references), Rule 6 (Change Log Entry — canon-addition wrote it; closeout reads + cites it)
- `.claude/skills/_shared-templates/story-state-contract.md` — §4 record schemas (SF, BEL, STENT, SREL, DA, SE — closeout output classes; BR — read-only branch lineage), §10 shared write order, §11 mystery and canon authority
- `worlds/<world_slug>/stories/<story_slug>/story-promotions/SP-<integer>-proposal-package.yaml` — source of truth for the promotion's `source_records` / `source_kind` / `branch_path` / `contradiction_preference` / `downstream_impact_report`
- `worlds/<world_slug>/stories/<story_slug>/story-promotions/SP-<integer>.md` — original ledger (read-only; cross-referenced in closeout ledger)
- `worlds/<world_slug>/_source/canon/CF-<integer>.yaml` (each linked CF) — read-only world-canon reference
- `worlds/<world_slug>/_source/change-log/CH-<integer>.yaml` (each linked CH) — read-only Change Log Entry citation for Rule 6 audit-trail
- `worlds/<world_slug>/adjudications/PA-<integer>-*.md` (each linked PA) — read-only adjudication record
- `worlds/<world_slug>/stories/<story_slug>/_source/<class>/<record-id>.yaml` for each source record from the proposal package

The bundle MUST exist; SP-<integer> proposal package + ledger MUST exist; on accepted-flavored verdicts, every linked CF / CH / PA MUST exist (Pre-flight aborts with linked-record-not-found error otherwise — this prevents recording a fake canon-addition outcome).

## Pre-flight Check

Before Phase 1:

1. Load `docs/FOUNDATIONS.md` and `.claude/skills/_shared-templates/story-state-contract.md` into working context.
2. Resolve `worlds/<world_slug>/stories/<story_slug>/`. Abort with bundle-not-found on miss.
3. Load `story-promotions/SP-<integer>-proposal-package.yaml` and `story-promotions/SP-<integer>.md`. Verify the package's `promotion_id` matches the `promotion_id` argument. Abort with promotion-not-found or promotion-id-mismatch error on miss.
4. Validate `canon_addition_verdict`: must be one of `accepted | accepted_with_limits | rejected | deferred`. On accepted-flavored verdicts, validate that `linked_cf_ids`, `linked_ch_ids`, `linked_pa_ids` are all supplied + non-empty.
5. On accepted-flavored verdicts: verify each `linked_cf_ids` entry resolves to `worlds/<world_slug>/_source/canon/CF-<integer>.yaml`; each `linked_ch_ids` entry resolves to `worlds/<world_slug>/_source/change-log/CH-<integer>.yaml`; each `linked_pa_ids` entry resolves to a `worlds/<world_slug>/adjudications/PA-<integer>-*.md` file. Abort with linked-record-not-found error on any miss — this is the primary defense against fake-verdict invocations.
6. Allocate ids via `mcp__worldloom__allocate_next_id(world_slug, id_class, story_slug=<story_slug>)`:
   - One id per superseding record (count determined by source_records inventory only; branch handling is ledger / INDEX-only).
   - One `SE-<integer>` when `emit_closeout_event: true`.
7. Load all source records from the proposal package's `source_records[]` for Phase 2 supersession drafting.

If any precondition fails, the skill aborts before Phase 1.

## Phase 1: Load promotion package + canon-addition verdict context

Load into working memory:

- The `SP-<integer>-proposal-package.yaml` (per Pre-flight step 3).
- The original `SP-<integer>.md` ledger (for cross-reference in the closeout ledger).
- On accepted-flavored verdicts: each linked CF record (`worlds/<world_slug>/_source/canon/CF-<integer>.yaml`) + each linked CH record + each linked PA record. **Read-only** — closeout cites these in superseding story-local records but does NOT modify them.
- All source records from the proposal package: SF / BEL / STENT / SREL / DA per source_kind.
- The branches in `affected_branch_ids` (for Phase 2 branch-handling decisions).

## Phase 2: Determine story-local effects per verdict

The verdict dictates the supersession pattern:

### `accepted`

The candidate is now world canon. Record the canon link in the closeout ledger. Supersede story-local source records only when an amended-schema field must change:

- Each `SF-<integer>` source MAY be superseded with the same class shape from shared contract §4.5.3, carrying `supersedes: SF-<integer>`, `authority: canon_linked`, and at least one parent CF id in `derived_from`. The broader CF / CH / PA verdict linkage lives in the closeout ledger; the parent CF id on the superseding SF is the schema-backed authority link.
- Each implicated `BEL-<integer>` MAY be superseded with the §4.1 shape when `truth_relation`, `claim`, `basis`, or `consequences` must change to reflect the adjudicated canon outcome. The CF / CH / PA linkage lives in the closeout ledger.
- For `source_kind: artifact_canonization`, supersede story-local `DA` only if a §4.5.10 field changes. World-level DA linkage is recorded in the closeout ledger.
- For `source_kind: character_outcome`, supersede `STENT` only if a §4.5.1 field changes.
- For `source_kind: relationship_or_institutional_outcome`, supersede `SREL` only if a §4.5.7 field changes.

### `accepted_with_limits`

Same decision pattern as `accepted`, with canon-addition's restrictions recorded in the closeout ledger and reflected in superseding records only through existing amended-schema fields.

### `rejected`

The candidate is NOT canon. Record the rejection in the closeout ledger. Supersede story-local source records only when their amended-schema fields must change to preserve the claim as branch-local:

- Each `SF-<integer>` source MAY be superseded with `supersedes: <prior SF id>` and revised `statement` / `authority` / `derived_from` values if the record itself needs to stop implying canon authority. Use `authority: branch_local` for ordinary retained branch truth or `branch_local_counterfactual` for deliberately branch-only contradictions. The rejection linkage lives in the closeout ledger.
- Optionally a new `BEL-<integer>` marking the claim as `false | disputed | rumor` when the user's `notes` argument indicates the rejection should manifest in-story.
- No CF / CH / PA links — no canon-addition outputs to cite.

### `deferred`

Canon-addition didn't decide either way. No supersessions by default. Closeout records the deferral timestamp + user's `notes` in the ledger.

### Branch-handling (per `same_story_branch_handling`)

- `flag`: record each affected branch in the closeout ledger and bundle INDEX; BR records remain unchanged.
- `archive`: record the archival disposition in the closeout ledger and per-world stories INDEX; BR records remain unchanged.
- `none`: no branch disposition changes.

## Phase 3: Validate

Run 6 validation gates BEFORE patch submission:

1. **No world-canon mutation attempted** — every op in the patch plan targets `worlds/<world_slug>/stories/<story_slug>/_source/<class>/*.yaml`; ZERO ops target `worlds/<world_slug>/_source/<world-subdir>/*.yaml`. Hook 3 enforces structurally; this gate verifies before submission as defense-in-depth.

2. **Accepted-flavored links reference actual canon-addition outputs** — re-verify Pre-flight step 5 (each `linked_cf_ids` / `linked_ch_ids` / `linked_pa_ids` entry resolves to a real file).

3. **Branch-handling actions only affect same-story branches** — when `same_story_branch_handling ∈ {flag, archive}`, every branch in `affected_branch_ids` MUST exist in this bundle's `_source/branches/`. Cross-story branch modifications are forbidden.

4. **Story records superseded append-only** — every superseding record carries `supersedes: <prior-id>`; no in-place structural mutation of prior records.

5. **Rejected outcomes preserve branch-local history** — on `rejected`, source records are either left intact with the rejection recorded in the closeout ledger, or superseded through amended-schema fields when the story-local state itself must change. The original `SF` / `BEL` / etc. remain on disk.

6. **Verdict-driven supersession count matches the proposal package's source_records inventory** — every source record gets a corresponding supersession (or non-supersession on `deferred`). Missing supersessions for accepted-flavored verdicts indicate the closeout is incomplete; abort.

## Phase 4: Author SP-<integer>-closeout.md ledger

Draft `worlds/<world_slug>/stories/<story_slug>/story-promotions/SP-<integer>-closeout.md`:

```markdown
---
promotion_id: SP-<integer>
canon_addition_verdict: accepted | accepted_with_limits | rejected | deferred
linked_cf_ids: [CF-<integer>]
linked_ch_ids: [CH-<integer>]
linked_pa_ids: [PA-<integer>]
same_story_branch_handling: none | flag | archive
affected_branch_ids: [BR-<integer>]
closeout_event: SE-<integer> | null
closed_at: <iso8601 date>
---

# SP-<integer> closeout: <verdict>

## Verdict

<canon_addition_verdict> — <one-paragraph narrative explanation>

## Linked canon-addition outputs (accepted-flavored only)

- **CF records**: CF-<integer> list with one-line title each
- **CH records**: CH-<integer> list
- **PA records**: PA-<integer> list with adjudication-verdict summary

## Story-local effects applied

<Per superseding record: prior id → new id, plus ledger-only canon links / rejection / deferral notes>

## Branch handling

<Per branch in affected_branch_ids: prior status → new status (flagged / archived / unchanged)>

## Notes

<User-supplied notes>

## Recommended next steps

<For accepted: bundle has an adjudicated canon link recorded in this closeout ledger; turn-cycle reads any superseding records that changed story-local state.>
<For rejected: branch-local counterfactual preserved; no further closeout action required.>
<For deferred: the promotion remains open; re-run canon-addition when evidence accumulates.>
```

The original `SP-<integer>.md` ledger stays unchanged as the historical proposal-time record. Sub-class (b) inline template — no separate `templates/` directory needed; the ledger is structurally simple and the inline format suffices.

## Phase 5: Commit / Write — HARD-GATE fires

1. Build the patch plan covering all supersessions from Phase 2 as a single envelope. Operations include `create_sf_record`, `create_bel_record` (via PEENH-007 inheritance — now landed), `create_stent_record`, `create_srel_record`, `append_story_diegetic_artifact_record` (for story-local DA supersessions, with `expected_id_allocations.story_da_ids`), and optionally `create_se_record` (when `emit_closeout_event: true`). Branch disposition is recorded in the closeout ledger / INDEX surfaces, not as a `BR` record operation. Each op requires a `target_file` field naming the on-disk write path (e.g., `worlds/<world_slug>/stories/<story_slug>/_source/<class>/<ID>.yaml`); see `docs/MACHINE-FACING-LAYER.md` §`describe_envelope_schema` or invoke `mcp__worldloom__describe_envelope_schema(op_kind?)` at pre-flight for the machine-readable per-op shape.

2. Dry-run via `mcp__worldloom__validate_patch_plan`. Each new record passes `record_schema_compliance` (BEL via VALENH-011 inheritance).

3. Present the complete deliverable summary to the user:
   - `SP-<integer>` id + verdict.
   - Linked canon-addition outputs (CF / CH / PA records cited with one-line summaries).
   - Per-source-record supersession plan (prior id → new id when state changes; ledger-only when no amended-schema field changes).
   - Branch-handling actions per `affected_branch_ids` (flag / archive / none).
   - Optional SE event preview.
   - Closeout ledger preview.

4. **HARD-GATE fires** — wait for explicit user approval. Auto Mode does not override.

5. On approval: obtain patch approval token; submit the patch plan via `mcp__worldloom__submit_patch_plan`.

6. On patch success:
   - Write `worlds/<world_slug>/stories/<story_slug>/story-promotions/SP-<integer>-closeout.md` (direct write).
   - Update bundle `INDEX.md` to reflect closeout entry + branch-status changes.
   - For `same_story_branch_handling: archive`: update per-world `stories/INDEX.md` to reflect archived branch status. This is the ONLY condition under which the per-world index changes (flag-only or none leave it alone).

7. Report closeout path + supersession inventory + branch-handling actions. Do NOT `git commit`.

**Failure behavior**: Pre-flight failure (missing promotion / missing linked canon-addition records / verdict-record mismatch) → write nothing; surface the missing-reference error. Phase 3 validation failure → write nothing; surface the failed gate. Patch submission failure → write nothing; the verdict is recorded only in user-side state until re-invoked. Partial write success (patch succeeded but markdown failed) → patch is authoritative; closeout ledger can be repaired manually; surface partial-failure.

## Validation Rules This Skill Upholds

- **Rule 4 (No Globalization by Accident)** — Phase 3 gate 3 (branch-handling actions limited to same-story). Mechanism: closeout cannot reach into sibling story bundles or world-canon branches.
- **Rule 6 (No Silent Retcons)** — Phase 1 + Phase 3 gate 2. Mechanism: closeout reads canon-addition's `CH-<integer>` Change Log Entry (which satisfies Rule 6 at world scope); the closeout ledger cites linked CF / CH / PA outputs so the audit trail is intact end-to-end without adding non-schema fields to story records.
- **Rule 7 (Preserve Mystery Deliberately)** — N/A at this skill; upstream-enforced at `story-fact-promotion-to-canon` Phase 4 (mystery firewall on the proposal) and at `canon-addition` (mystery-firewall re-check at adjudication). Closeout's Phase 3 gate 2 (linked-records exist) verifies the canon-addition outputs are real, ensuring closeout never cites a fake CF that could have bypassed the firewall.

Rules 1 / 2 / 3 / 5 / 11 / 12 enforced upstream by `canon-addition` at adjudication time. Closeout records the outcome; does not re-enforce.

## Record Schemas

All record schemas referenced by this skill live in `.claude/skills/_shared-templates/story-state-contract.md`:

- `SF` (§4), `BEL` (§4.1), `STENT`, `SREL`, `DA`, `SE` (§4.3) — record classes that may be superseded or emitted by closeout.
- `BR` (§4.5.11) — read-only for same-story branch disposition; branches fork rather than replace prior branch records.

The `SP-<integer>-closeout.md` ledger schema is defined inline in Phase 4's template (sub-class (b) authored from scratch; no per-skill `templates/` directory needed — the ledger is structurally simple and inline format suffices).

## FOUNDATIONS Alignment

| Principle | Phase | Mechanism |
|---|---|---|
| Rule 1 (No Floating Facts) | N/A at this skill | Canon-addition enforced at adjudication. |
| Rule 2 (No Pure Cosmetics) | N/A at this skill | Canon-addition enforced. |
| Rule 3 (No Specialness Inflation) | N/A at this skill | Canon-addition enforced. |
| Rule 4 (No Globalization by Accident) | Phase 3 gate 3 | Branch-handling limited to same-story. |
| Rule 5 (No Consequence Evasion) | N/A at this skill | Canon-addition vetted consequences at adjudication. |
| Rule 6 (No Silent Retcons) | Phase 1, Phase 3 gate 2 | Read canon-addition's CH-<integer>; cite linked CF / CH / PA outputs in the closeout ledger. |
| Rule 7 (Preserve Mystery Deliberately) | N/A at this skill | Story-fact-promotion-to-canon's firewall ran at proposal time + canon-addition re-checked at adjudication. Closeout's Phase 3 gate 2 verifies linked records exist (defense against fake-verdict invocations). |
| Rule 11 (No Spectator Castes) | N/A at this skill | Canon-addition enforced. |
| Rule 12 (No Single-Trace Truths) | N/A at this skill | Canon-addition enforced. |
| Canon Layers | Phase 1 | Read linked CF records' `status` (5 layer values). |
| Mystery Reserve | N/A at this skill | Story-fact-promotion-to-canon + canon-addition handled. |
| §Story Bundles §4a (Plan-Authority Boundary) | All phases | Closeout reads `PG` records as authoritative; never mutates them. Supersessions affect SF / BEL / STENT / SREL / DA, NOT branch or page records. |
| §Story Bundles §5 (Validation Rules At Story Scope) | Phase 2 | On accepted verdicts, the closeout ledger records the canon link; story-local records are superseded only through amended-schema fields when their branch-local state changes. |
| Change Control Policy | Phase 1, Phase 3 gate 2 | Closeout reads canon-addition's CH Change Log Entry and cites it in the closeout ledger. |
| Tooling Recommendation | Pre-flight | Linked canon-addition records loaded via direct file reads (CF / CH / PA paths); no `get_context_packet` retrieval needed since closeout works against direct record paths. |

## Guardrails

- **Never mutate world canon.** Hook 3 blocks raw `Edit` / `Write` on `worlds/<slug>/_source/<world-subdir>/*.yaml`. Patch plans target ONLY story-bundle scope + the one authorized per-world `stories/INDEX.md` write on archive. Phase 3 gate 1 verifies before submission as defense-in-depth.
- **Closeout records the verdict; it does NOT decide.** Canon-addition decided at adjudication; closeout writes back faithfully.
- **Rejected outcomes preserve branch-local history.** Closeout records rejection in the closeout ledger rather than deleting. Original SF / BEL / etc. remain on disk; supersession is used only when amended-schema state fields need to change.
- **Branch-handling actions only affect same-story branches.** Phase 3 gate 3. Cross-story branch modifications are forbidden; cross-story contradictions belong to `branching-story-health-audit` `cross_story` mode or a separate world-level workflow.
- **The original SP-<integer>.md ledger stays unchanged.** Closeout writes a NEW `SP-<integer>-closeout.md` companion. This preserves the historical proposal-time record append-only at the markdown layer.
- **Schema minimalism per shared contract §2 + FOUNDATIONS §Story Bundles §5b.** Superseding records must conform to the amended class schemas in shared contract §4. Ledger-only canon links, rejection disposition, archive disposition, and deferral notes stay in `SP-<integer>-closeout.md` / INDEX surfaces until a future contract amendment deliberately promotes a structured field.
- **Skills do not chain.** Closeout never invokes `canon-addition` (already ran), `story-fact-promotion-to-canon` (already ran), or any other sibling. The user invokes closeout separately after canon-addition adjudicates.
- **Worktree discipline**: if invoked inside a git worktree, all paths resolve from the worktree root.
- **Known integration debt**:
  - **MCPENH-040** (BEL allocator registration) — Phase 2 supersedes BEL records during accepted-flavored verdicts. Inherited from bootstrap's Shape C rollout.
  - **PEENH-007** (`create_bel_record` patch op) — Phase 2 + Phase 5 submit BEL supersession ops. **Now landed** (verified during this skill's gap-filler infrastructure audit; the op is present in `tools/patch-engine/src/envelope/schema.ts`).
  - **VALENH-011** (BEL `record_schema_compliance`) — Phase 5 dry-run exercises BEL validator on each BEL supersession.
  - **PEENH-008** — Phase 2 + Phase 5 submit DA supersession ops for `source_kind: artifact_canonization` accepted-flavored verdicts. Closeout uses the existing story-local DA op `append_story_diegetic_artifact_record`, which writes `DA-<integer>` records under `_source/artifacts/` and consumes `expected_id_allocations.story_da_ids`.
  - **MCPENH-041** (task_type rename) — does NOT affect this skill; closeout does not use `get_context_packet` retrieval.

## What is intentionally NOT in this skill

- **No world-canon writes.** Canon-addition already wrote the CF / CH / PA records during adjudication. Closeout reads them as references; never modifies.
- **No re-enforcement of world-canon rules.** Rules 1 / 2 / 3 / 5 / 6 / 7 / 11 / 12 were enforced upstream (canon-addition at adjudication; story-fact-promotion-to-canon's firewall at proposal time). Closeout assumes those gates already passed.
- **No re-running of canon-addition.** Closeout consumes the verdict; never re-adjudicates.
- **No cross-story modifications.** Closeout's branch-handling is bounded to the source bundle.
- **No mutation of the original SP-<integer>.md ledger.** New closeout ledger is written as a companion file; original is preserved as historical proposal-time record.
- **No automatic invocation of further siblings.** When closeout completes, the user may want to run `branching-story-health-audit` to verify the bundle's post-closeout state, or `branching-story-turn-cycle` to advance the story now that canon has been updated — but closeout does NOT trigger those automatically.

## Final Rule

This skill records canon-addition's verdict in the story-promotion closeout ledger, supersedes source records only through amended-schema fields when story-local state changes, never mutates world canon, never invokes another skill, and routes every CF / CH / PA reference read-only.
