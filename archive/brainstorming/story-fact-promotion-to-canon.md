# story-fact-promotion-to-canon

## Purpose

Create a proposal package for promoting a branch-local story claim into world canon. The skill **ends after proposal creation** — it does NOT route the package to `canon-addition` automatically, and it does NOT mutate world canon. After the user approves the proposal, the skill writes the package and instructs the caller to invoke `canon-addition` separately with the proposal-package path as input. Post-adjudication closeout (writing the canon-addition verdict back onto story-local records) is handled by the separate `story-promotion-closeout` skill.

Story-fact-promotion-to-canon is the sixth skill in the rebuilt story-skill family per `docs/plans/2026-05-13-streamlined-story-skills-greenfield-plan.md` and the **only lawful path** by which a story bundle's claims can become world canon.

## Source kinds

One common proposal flow over six source kinds. The source kind changes the **required evidence**, not the workflow shape:

- **`story_fact`** — a branch-local `SF-NNNN` that should become world canon. Evidence: the SF record + the `SE-NNNN` that produced it + supporting page(s) with rendered prose + `BEL` records establishing witness or epistemic standing.
- **`mystery_resolution`** — an active or passive Mystery Reserve entry (`M-NNNN`) that should become resolved at world canon (e.g., the murderer's identity becomes canonical). Evidence: the mystery's pre-resolution `BEL` chain + the `SE-NNNN` that resolved it + the page-plan §11 demonstrating the mystery was previously in `forbidden_resolutions[]` of any block (firewall trace).
- **`character_outcome`** — a character's significant arc outcome (death, transformation, exile, exaltation) that should be canon. Evidence: the relevant `STENT-NNNN` supersession + `SE-NNNN` chain + rendered-prose pages demonstrating the outcome.
- **`artifact_canonization`** — a story-local diegetic artifact (`DA-NNNN`) that should become a world-level `DA-NNNN`. Evidence: the story-local DA + the events that authored it + the rendered prose where it appears.
- **`relationship_or_institutional_outcome`** — an `SREL-NNNN` change or institutional event that should reshape world canon. Evidence: the supersession chain + supporting events + rendered prose.
- **`other_branch_claim`** — catch-all for claims not fitting the other kinds (e.g., a geographic discovery, a metaphysical law revealed). Evidence: user-provided rationale + relevant records + rendered prose.

Forbidden mysteries (`M-NNNN` with `status: forbidden`) **cannot be promoted**. Phase 4 mystery firewall rejects any source whose effect would resolve a forbidden mystery.

## Inputs

Required:

- `world_slug` — existing world directory slug under `worlds/`.
- `story_slug` — existing story bundle slug under `worlds/<world_slug>/stories/`.
- `source_kind` — one of the six source kinds above.
- `source_record_ids` — list of record ids that constitute the candidate (e.g., `[SF-0042]` for `story_fact`; `[M-0003]` for `mystery_resolution`; `[STENT-0007]` for `character_outcome`; etc.).
- `branch_path` — `BR-NNNN` of the branch where the claim is established.
- `supporting_page_ids` — list of `PG-NNNN` ids whose rendered prose constitutes evidence.

Optional:

- `desired_canon_status` — `hard_canon | soft_canon | contested_canon | mystery_reserve`. Default: derive from `source_kind` (story_fact → soft_canon; mystery_resolution → hard_canon; etc.).
- `scope_argument` — natural-language rationale for the promotion's geographic / temporal / social scope (used by Phase 3 scope-inflation check).
- `contradiction_preference` — `flag | archive_same_story_branches | leave_counterfactual`. Default: `flag` (other branches that contradict the promoted claim are flagged in the proposal but not modified; archive / leave decisions belong to `story-promotion-closeout`).

## Output Bundle

Direct-write markdown + YAML:

- `worlds/<world_slug>/stories/<story_slug>/story-promotions/SP-NNNN.md` — promotion ledger entry (human-readable narrative explanation of the promotion attempt).
- `worlds/<world_slug>/stories/<story_slug>/story-promotions/SP-NNNN-proposal-package.yaml` — the CF-shaped candidate package consumed by `canon-addition`. Preserves canon-addition's parse-time field schema byte-for-byte per sub-class (a) of skill-creator's template-derivation discipline.
- `worlds/<world_slug>/stories/<story_slug>/INDEX.md` — bundle index updated last.

**No world-canon writes occur in this skill.** No patch-engine submissions to `worlds/<world_slug>/_source/`. The proposal package is a CANDIDATE; `canon-addition` adjudicates and (on accept) writes the actual CF / CH / PA records to world scope. After adjudication, `story-promotion-closeout` writes the verdict back onto story-local records.

## Pre-Flight

1. **Load FOUNDATIONS** — `docs/FOUNDATIONS.md`. §Canon Layers (the promotion targets `hard_canon` / `soft_canon` / `contested_canon` / `mystery_reserve`); §Canon Fact Record Schema (the proposal package's structural target); §Story Bundles §11 (mystery and canon authority); Rules 1-7 + 11-12 (the proposal package must respect all world-canon rules even though this skill doesn't apply them — canon-addition does).
2. **Load the shared contract** — `.claude/skills/_shared-templates/story-state-contract.md`. §4 record schemas (BEL, PG, SE, SF, STENT, SREL, DA — all read as evidence depending on source_kind), §11 mystery and canon authority (canon-candidate authority discipline), §10 shared write order.
3. **Resolve the bundle** — `worlds/<world_slug>/stories/<story_slug>/` must exist with `STORY_KERNEL.md`, `_source/`. Abort with bundle-not-found error otherwise.
4. **Resolve source records** — for each id in `source_record_ids`, load the corresponding `_source/<class>/*.yaml` record. Abort with source-not-found error on any miss.
5. **Resolve supporting pages** — for each `PG-NNNN` in `supporting_page_ids`, load the page record AND the corresponding `pages-prose/<page_id>.md` (rendered prose) AND `pages-prose-receipts/<page_id>.yaml` (prose receipt) when prose is part of the evidence (always for source_kind `story_fact`, `mystery_resolution`, `character_outcome`, `artifact_canonization`, `relationship_or_institutional_outcome`; optional for `other_branch_claim` per user discretion). Abort with missing-prose error if rendered prose is absent for a required-prose source_kind. Receipt `verdict: PASS | WARN` is acceptable; `verdict: FAIL` requires explicit user acceptance at Phase 7 HARD-GATE.
6. **Resolve branch** — verify `branch_path` resolves to a `BR-NNNN.yaml` record AND that every source record's branch lineage traces to `branch_path` (a `story_fact` source cannot be promoted from a branch that didn't author it). Abort with branch-mismatch error on any failure.
7. **Allocate id** — one `SP-NNNN` via `mcp__worldloom__allocate_next_id(world_slug, 'SP', story_slug=<story_slug>)`.
8. **Load world canon context** via `mcp__worldloom__get_context_packet(world_slug, task_type='story_fact_promotion_to_canon', seed_nodes=<source_record_ids + every M-NNNN regardless of status (whole-class for firewall) + every INV (whole-class for invariant check) + parent CFs of every SF source>, token_budget=<default>)`.
9. **HARD-GATE deferral** — the HARD-GATE fires at Phase 7 AFTER the proposal package is assembled in working memory. The user reviews the full CF-shaped candidate + scope-inflation report + mystery-firewall report + downstream impact + contradiction-preference disposition before any write.

## Phases

### Phase 1: Load source and branch provenance

Load into working memory:

- The source records named in `source_record_ids` (per `source_kind` — Phase 1 verifies the source-kind-to-record-class mapping: `story_fact` → SF; `mystery_resolution` → M; `character_outcome` → STENT; `artifact_canonization` → DA; `relationship_or_institutional_outcome` → SREL; `other_branch_claim` → user-supplied records).
- The `SE-NNNN` events that authored or modified each source record (per `_source/events/SE-*.yaml` traversal).
- The `BEL-NNNN` records showing who knows / believes / witnesses the claim — load every BEL whose `consequences.opens[]` or `basis.source_event` references any source record's authoring SE.
- The `branch_path` `BR-NNNN.yaml` record + sibling branch summaries (for Phase 5 downstream impact analysis on same-story contradictory branches).
- The rendered prose at `pages-prose/<page_id>.md` and the prose receipts at `pages-prose-receipts/<page_id>.yaml` for each `supporting_page_ids` entry.
- The whole-class Mystery Reserve (loaded at Pre-flight) for Phase 4 firewall.
- World canon CF records loaded at Pre-flight as context for Phase 2 candidate translation + Phase 3 scope-inflation check + Phase 5 downstream impact.

### Phase 2: Translate source into CF-shaped candidate

Produce a candidate matching FOUNDATIONS §Canon Fact Record Schema. The field set depends on `source_kind`:

```yaml
candidate:
  title: <short descriptive title>
  status: hard_canon | soft_canon | contested_canon | mystery_reserve   # from desired_canon_status or derived
  type: capability | artifact | law | belief | event | institution | species | <etc>   # per CF schema enum
  statement: >
    <natural-language statement of the fact>
  scope:
    geographic: local | regional | global | cosmic
    temporal: ancient | historical | current | future | cyclical
    social: restricted_group | public | elite | secret | rumor
  truth_scope:
    world_level: true | false | uncertain
    diegetic_status: objective | believed | disputed | propagandistic | legendary
  domains_affected: [<domain per canonical-vocabularies domain enum>]
  prerequisites: [<prerequisite>]
  distribution:
    who_can_do_it: [<group>]
    who_cannot_easily_do_it: [<group>]
    why_not_universal: [<reason>]
  costs_and_limits: [<limit>]
  visible_consequences: [<consequence>]
  required_world_updates: [<file or domain>]
  contradiction_risk:
    hard: true | false
    soft: true | false
  source_basis:
    direct_user_approval: true                # set true after Phase 7 HARD-GATE approval
    derived_from: [<parent CF id if mirrored, or null if novel>]
    story_branch: BR-NNNN                     # the originating branch
    story_evidence:
      source_records: [<source_record_ids>]
      supporting_pages: [<supporting_page_ids>]
      authoring_events: [<SE-NNNN ids>]
      belief_witnesses: [<BEL-NNNN ids>]
  promotion_provenance:                       # narrative explanation
    story_slug: <story_slug>
    source_kind: <source_kind>
    branch_path: <branch_path>
    rationale: <natural-language explanation of why this branch-local claim should become world canon>
```

**Do NOT put branch provenance into `source_basis.derived_from` as if the branch were world authority.** Branch provenance lives in `source_basis.story_branch` + `source_basis.story_evidence` + `promotion_provenance`. World-canon authority comes from `canon-addition`'s adjudication; until then, the candidate is just a proposal.

### Phase 3: Scope-inflation check (FOUNDATIONS Rule 4)

For each source record, verify the candidate's `scope` does not over-promote:

- **Is this true only in this branch?** If `branch_local_counterfactual` was set on any source SF, the candidate cannot exceed `contested_canon` status (the world-level truth is uncertain).
- **Is it true only for one location / faction / time / narrator / social group?** The candidate's `scope.geographic` / `scope.temporal` / `scope.social` must respect the source's actual scope. A `local` source cannot become a `global` candidate without explicit `scope_argument` from the user.
- **Is the supporting prose sufficient for world-level truth?** When `desired_canon_status: hard_canon`, the supporting prose must demonstrate the claim's manifestation in concrete, witnessed, or recorded form across at least 2 traces (Rule 12 anticipation — the canon-addition skill enforces, but this skill should flag potential violations).
- **Does it contradict other branches?** Phase 5 downstream impact enumerates same-story contradictions; this check flags inter-branch contradiction risk on the candidate's `contradiction_risk.soft` and `contradiction_risk.hard` fields.
- **Does canonizing it collapse a Mystery Reserve entry?** Phase 4 firewall covers; this check cross-references mystery-collapse risk into the proposal's narrative section.

Scope-widening (e.g., `local` → `regional`) requires explicit user rationale via `scope_argument`. The scope-inflation check produces a structured report:

```yaml
scope_inflation_report:
  source_actual_scope: <derived from source records>
  candidate_proposed_scope: <from candidate.scope>
  widening_applied: <none | geographic_local_to_regional | etc>
  scope_argument: <user-supplied or null>
  flags: [<scope-widening flag if any>]
```

### Phase 4: Mystery firewall (FOUNDATIONS Rule 7 + shared contract §11)

Reject:

- **Forbidden mystery resolution** — any mystery with `status: forbidden` whose effect would be resolved by accepting this candidate. ABORT before Phase 5.
- **Accidental resolution of unrelated mystery** — the candidate's `statement` / `domains_affected` / `visible_consequences` would resolve a mystery the user didn't explicitly intend to resolve. Flag in the proposal; require explicit user acceptance at Phase 7.
- **Branch-local counterfactual presented as objective canon** — if any source SF carries `branch_local_counterfactual` authority, reject unless `desired_canon_status: contested_canon` (counterfactuals can be promoted as contested, never as hard).
- **Mystery progress effect promoted through the wrong source_kind** — e.g., a `story_fact` source_kind that resolves a mystery should be re-classified as `mystery_resolution` source_kind. Flag and recommend re-invocation with corrected source_kind.

Produce a structured firewall report:

```yaml
mystery_firewall_report:
  mysteries_scanned: <count of M-NNNN records loaded>
  forbidden_resolution_attempts: [<M-NNNN, if any>]
  accidental_resolution_warnings: [<M-NNNN, if any>]
  counterfactual_promotion_attempts: [<source SF id, if any>]
  source_kind_mismatch_warnings: [<recommended source_kind change, if any>]
  firewall_verdict: PASS | ABORT | REQUIRES_USER_ACCEPTANCE
```

`PASS` → continue. `ABORT` → abort before Phase 5 (no proposal written). `REQUIRES_USER_ACCEPTANCE` → continue but flag at Phase 7 HARD-GATE.

### Phase 5: Downstream impact analysis

Enumerate:

- **World domains affected** — list the FOUNDATIONS §Mandatory World Files concerns the promotion would touch (e.g., `peoples-and-species`, `institutions`, `economy-and-resources`).
- **Same-story contradictory branches** — list other branches (`BR-NNNN`) in this bundle whose state contradicts the candidate. These are NOT modified by this skill; the proposal's `contradiction_preference` field records the user's desired handling (`flag | archive_same_story_branches | leave_counterfactual`), and `story-promotion-closeout` applies the chosen action after canon-addition adjudication.
- **Cross-story contradictions** — list sibling story bundles (other `worlds/<world_slug>/stories/<sibling_story>/`) whose state contradicts the candidate. These are flag-only here; cross-bundle resolution belongs to `branching-story-health-audit` `cross_story` mode or a separate world-level workflow.

Produce a structured impact report:

```yaml
downstream_impact_report:
  world_domains_affected: [<domain>]
  same_story_contradictory_branches: [<BR-NNNN>]
  cross_story_contradictions: [<sibling_story_slug:record_id>]
  affected_world_files: [<file path under worlds/<slug>/>]
  promotion_provenance_narrative: <one-paragraph explanation>
```

### Phase 6: Assemble proposal package

Combine outputs of Phases 1-5 into the proposal package:

```yaml
promotion_id: SP-NNNN
story_slug: <story_slug>
source_kind: <source_kind>
source_records: [<source_record_ids>]
branch_path: <branch_path>
supporting_pages: [<supporting_page_ids>]
authoring_events: [<SE-NNNN ids>]
belief_witnesses: [<BEL-NNNN ids>]
claim_visibility:
  who_holds_belief: [<STENT-NNNN | group:<name> | public>]
  belief_truth_relations: [<truth_relation per BEL>]
candidate: <Phase 2 CF-shaped candidate>
scope_inflation_report: <Phase 3 report>
mystery_firewall_report: <Phase 4 report>
downstream_impact_report: <Phase 5 report>
contradiction_preference: flag | archive_same_story_branches | leave_counterfactual
user_decision:
  hard_gate_approved: false   # set true at Phase 7 HARD-GATE approval
  acceptance_of_warnings: []  # list of warning ids the user explicitly accepted
prose_receipt_failures_accepted: []   # source_kind-evidence pages with FAIL receipts that the user explicitly accepted
```

This is the `SP-NNNN-proposal-package.yaml` content. The companion `SP-NNNN.md` ledger is a human-readable narrative explanation pointing at the YAML package.

### Phase 7: HARD-GATE

**Always show the proposal to the user. No execution-mode bypass.** Auto Mode does not override.

Present the deliverable summary:
- `SP-NNNN` id + the candidate's `title` / `status` / `type` / `statement` (one-line each).
- Scope-inflation report findings (widening applied, scope_argument supplied, flags).
- Mystery-firewall report findings (firewall_verdict, any REQUIRES_USER_ACCEPTANCE items).
- Downstream impact report (world domains affected, same-story contradictory branches, cross-story contradictions).
- Prose-receipt failures requiring acceptance (per Pre-flight step 5).
- The contradiction-preference disposition.
- The recommended next step (`invoke canon-addition with proposal_path=worlds/<world_slug>/stories/<story_slug>/story-promotions/SP-NNNN-proposal-package.yaml`).

Wait for explicit user approval. The user may accept warnings (recorded in `user_decision.acceptance_of_warnings`), accept prose-receipt failures (recorded in `prose_receipt_failures_accepted`), and approve the final candidate. On approval: set `user_decision.hard_gate_approved: true`.

### Phase 8: Write proposal package

1. Write `worlds/<world_slug>/stories/<story_slug>/story-promotions/SP-NNNN-proposal-package.yaml` (direct write; this is the machine-readable artifact canon-addition consumes).
2. Write `worlds/<world_slug>/stories/<story_slug>/story-promotions/SP-NNNN.md` (direct write; the human-readable ledger entry per the `story-promotion-ledger.md` template).
3. Update bundle `INDEX.md` to reflect the new promotion entry.
4. Report the proposal paths to the user. Explicitly instruct the next step: *"Run `canon-addition` with `proposal_path=worlds/<world_slug>/stories/<story_slug>/story-promotions/SP-NNNN-proposal-package.yaml`. After canon-addition adjudicates, run `story-promotion-closeout` to write the verdict back onto story-local records."* Do NOT `git commit`.

**No world-canon writes occur.** Canon-addition is invoked separately by the user.

## Failure Behavior

- Pre-flight failure → write nothing; surface the precondition violation.
- Phase 4 firewall ABORT → write nothing; surface the forbidden-mystery / counterfactual / source-kind-mismatch violation.
- Phase 7 user rejection → write nothing; surface the rejection.
- Partial write success (proposal-package.yaml written but ledger.md failed) → proposal-package is authoritative; surface partial-failure; user can manually author or re-run the ledger.

## Validation Rules This Skill Upholds

- **Rule 4 (No Globalization by Accident)** — Phase 3 scope-inflation check. Mechanism: every candidate's `scope.geographic / temporal / social` is verified against the source records' actual scope; scope-widening requires explicit `scope_argument`.
- **Rule 7 (Preserve Mystery Deliberately)** — Phase 4 mystery firewall. Mechanism: forbidden-mystery-resolution check against whole-class Mystery Reserve; counterfactual-promotion check; accidental-mystery-resolution flagging.

Rules 1 / 2 / 3 / 5 / 6 / 11 / 12 are world-canon-mutation-surface rules enforced by **`canon-addition`** when it adjudicates the proposal package. This skill is canon-reading; it does NOT enforce world-canon-mutation rules itself, but the proposal package's CF-shaped candidate is structured to make canon-addition's enforcement clean (every required field present per FOUNDATIONS §Canon Fact Record Schema).

## Record Schemas

- The proposal package YAML schema is defined in this skill's `templates/proposal-package.yaml` template, which preserves canon-addition's parse-time field schema byte-for-byte per sub-class (a) of skill-creator's template-derivation discipline.
- The ledger markdown schema is defined in this skill's `templates/story-promotion-ledger.md` template.
- Read schemas: shared contract §4 (BEL §4.1, PG §4.2, SE §4.3) + FOUNDATIONS §Canon Fact Record Schema (the candidate's target).

## FOUNDATIONS Alignment

| Principle | Phase | Mechanism |
|---|---|---|
| Rule 1 (No Floating Facts) | N/A at this skill | Canon-addition enforces on the candidate at adjudication time (required CF-schema fields). |
| Rule 2 (No Pure Cosmetics) | N/A at this skill | Canon-addition enforces. |
| Rule 3 (No Specialness Inflation) | N/A at this skill | Canon-addition enforces. |
| Rule 4 (No Globalization by Accident) | Phase 3 | Scope-inflation check on candidate scope. |
| Rule 5 (No Consequence Evasion) | N/A at this skill | Canon-addition enforces. |
| Rule 6 (No Silent Retcons) | N/A at this skill | Canon-addition writes the Change Log Entry that satisfies Rule 6. |
| Rule 7 (Preserve Mystery Deliberately) | Phase 4 | Mystery firewall + forbidden-status rejection. |
| Rule 11 (No Spectator Castes) | N/A at this skill | Canon-addition enforces. |
| Rule 12 (No Single-Trace Truths) | Phase 3 + N/A | Phase 3 flags potential single-trace risk in `contradiction_risk`; canon-addition enforces at adjudication. |
| Canon Layers | Pre-flight, Phase 2 | Candidate's `status` field selects layer (`hard_canon | soft_canon | contested_canon | mystery_reserve`). |
| Mystery Reserve | Pre-flight, Phase 4 | Whole-class Mystery Reserve loaded; forbidden-status firewall. |
| Canon Fact Record Schema | Phase 2, 6 | Candidate strictly matches FOUNDATIONS §Canon Fact Record Schema field set. |
| §Story Bundles §4a (Plan-Authority Boundary) | All phases | The skill reads `PG` records as authoritative state; never mutates. |
| §Story Bundles §11 (Mystery and Canon Authority) | Phase 2, 4 | Canon-candidate authority discipline + forbidden-mystery firewall. |
| Change Control Policy | N/A at this skill | Canon-addition writes the Change Log Entry. |
| Tooling Recommendation | Pre-flight | World canon retrieval via `mcp__worldloom__get_context_packet`. |

## Guardrails

- **Never write world-level canon.** Hook 3 blocks raw `Edit` / `Write` on `worlds/<slug>/_source/<world-subdir>/*.yaml`. This skill writes ONLY to `worlds/<world_slug>/stories/<story_slug>/story-promotions/` and `worlds/<world_slug>/stories/<story_slug>/INDEX.md`. No patch-engine submissions to world scope.
- **Output is NOT canon until canon-addition adjudicates.** The proposal package is a CANDIDATE. The skill explicitly instructs the user to invoke canon-addition separately. No automatic chaining; no implicit acceptance.
- **Forbidden mysteries cannot be promoted.** Phase 4 ABORT-on-forbidden-resolution. The skill REFUSES to write a proposal package whose candidate would resolve a forbidden mystery.
- **Branch-local truth is evidence, not authority.** Phase 2 keeps branch provenance in `source_basis.story_branch` + `source_basis.story_evidence`, NEVER in `source_basis.derived_from` (which is reserved for parent CF references — world authority).
- **HARD-GATE is absolute.** Always show the proposal to the user. No execution-mode bypass; no Auto Mode override. Phase 7 always pauses for explicit user approval.
- **No post-adjudication closeout in this skill.** After canon-addition adjudicates, the user runs `story-promotion-closeout` to write the verdict back onto story-local records (supersession of SF / BEL / DA / STENT / SREL / BR records that the canon-addition outcome implicates).
- **Skills do not chain.** This skill never invokes `canon-addition` or `story-promotion-closeout`. Phase 8 surfaces the recommendation; the user separately invokes the named sibling.
- **Worktree discipline**: if invoked inside a git worktree, all paths resolve from the worktree root.
- **Known integration debt**:
  - **MCPENH-040** (BEL allocator registration), **PEENH-007** (`create_bel_record` patch op), **VALENH-011** (BEL `record_schema_compliance`) — Phase 1 reads `BEL` records as evidence for several source kinds (mystery_resolution, story_fact, character_outcome). Inherited from bootstrap's Shape C rollout.
  - **MCPENH-041** (task_type rename) — does NOT affect this skill; `story_fact_promotion_to_canon` task_type was not renamed.

## What is intentionally NOT in this skill

- **No world-canon writes.** All CF / CH / PA writes belong to canon-addition. This skill writes ONLY proposal packages and ledgers to story-bundle scope.
- **No post-adjudication closeout.** `story-promotion-closeout` writes the verdict back onto story-local records (next §D step 9).
- **No multi-phase process pausing mid-skill for canon-addition.** The skill RUNS TO COMPLETION (writes the package, instructs the user) — canon-addition is invoked separately by the user. Splitting proposal creation from adjudication keeps each half short and independently testable.
- **No automatic same-story-branch archival.** When `contradiction_preference: archive_same_story_branches` is set, the proposal records the user's preference, but `story-promotion-closeout` applies the archival after canon-addition adjudicates.
- **No cross-story contradiction resolution.** Phase 5 flags cross-story contradictions; resolution belongs to `branching-story-health-audit` `cross_story` mode or a separate world-level workflow.
- **No execution-mode bypass for the HARD-GATE.** Even under Auto Mode, the HARD-GATE pauses for explicit user approval. World-canon promotion is too high-stakes for automation.

## References

- `.claude/skills/_shared-templates/story-state-contract.md` — §4 record schemas, §10 shared write order, §11 mystery and canon authority.
- `docs/FOUNDATIONS.md` — §Canon Layers, §Canon Fact Record Schema (the candidate's target), §Story Bundles §11 (mystery and canon authority), Rules 1-7 + 11-12 (canon-addition enforces; this skill's candidate must respect them).
- `reports/streamlined-story-pipelines/07-story-fact-promotion-to-canon.md` — streamlined-pipeline source report.
- `docs/plans/2026-05-13-streamlined-story-skills-greenfield-plan.md` §C.6 — blueprint summary.
- Sibling skills:
  - `.claude/skills/canon-addition/SKILL.md` — the DOWNSTREAM consumer that adjudicates this skill's proposal packages. CF-schema parity is preserved byte-for-byte in `templates/proposal-package.yaml` per sub-class (a).
  - `.claude/skills/branching-story-bootstrap/SKILL.md`, `.claude/skills/branching-story-turn-cycle/SKILL.md`, `.claude/skills/branching-story-prose-attach/SKILL.md`, `.claude/skills/commitment-block-authoring/SKILL.md`, `.claude/skills/branching-story-health-audit/SKILL.md` — upstream producers of the records this skill reads as evidence.
  - `story-promotion-closeout` (future, §D step 9) — consumes canon-addition's verdict and writes it back onto story-local records.

## Templates

- `templates/proposal-package.yaml` — CF-shaped candidate package. Preserves canon-addition's parse-time CF-schema field set byte-for-byte (per skill-creator sub-class (a)). Field comments document parity intent.
- `templates/story-promotion-ledger.md` — human-readable promotion ledger entry pointing at the YAML proposal package and summarizing the user's HARD-GATE approval + the recommended next step.
