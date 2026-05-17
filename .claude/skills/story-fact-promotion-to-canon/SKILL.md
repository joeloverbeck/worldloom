---
name: story-fact-promotion-to-canon
description: "Use when creating a proposal package for promoting a branch-local story claim into world canon. One common flow over 6 source kinds (story_fact, mystery_resolution, character_outcome, artifact_canonization, relationship_or_institutional_outcome, other_branch_claim). Produces: story-promotions/SP-<integer>-proposal-package.yaml CF-shaped candidate + story-promotions/SP-<integer>.md ledger + bundle INDEX.md update. Mutates: only worlds/<world_slug>/stories/<story_slug>/."
user-invocable: true
arguments:
  - name: world_slug
    description: "Existing world directory slug under worlds/"
    required: true
  - name: story_slug
    description: "Existing story bundle slug under worlds/<world_slug>/stories/"
    required: true
  - name: source_kind
    description: "One of: story_fact | mystery_resolution | character_outcome | artifact_canonization | relationship_or_institutional_outcome | other_branch_claim. Changes required evidence, not workflow shape."
    required: true
  - name: source_record_ids
    description: "List of record ids constituting the candidate (e.g., [SF-42] for story_fact or mystery_resolution; [STENT-7] for character_outcome). M records are governing firewall context and are not user-supplied source_record_ids."
    required: true
  - name: branch_path
    description: "BR-<integer> of the branch where the claim is established. Every source record's lineage must trace to branch_path."
    required: true
  - name: supporting_page_ids
    description: "List of PG-<integer> ids whose rendered prose constitutes evidence. Required-prose source kinds: story_fact, mystery_resolution, character_outcome, artifact_canonization, relationship_or_institutional_outcome. Optional for other_branch_claim."
    required: true
  - name: desired_canon_status
    description: "hard_canon | derived_canon | soft_canon | contested_canon. Default: derive from source_kind."
    required: false
  - name: scope_argument
    description: "Natural-language rationale for the promotion's geographic / temporal / social scope (consumed by Phase 3 scope-inflation check)."
    required: false
  - name: contradiction_preference
    description: "flag | archive_same_story_branches | leave_counterfactual. Default: flag. Story-promotion-closeout applies the chosen action after canon-addition adjudicates."
    required: false
---

# Story Fact Promotion to Canon

Create a proposal package for promoting a branch-local story claim into world canon — assembles a CF-shaped candidate, runs scope-inflation + mystery-firewall + downstream-impact analyses, and writes the proposal package; never mutates world canon.

<HARD-GATE>
Do NOT write `worlds/<world_slug>/stories/<story_slug>/story-promotions/SP-<integer>-proposal-package.yaml`, `worlds/<world_slug>/stories/<story_slug>/story-promotions/SP-<integer>.md`, or update bundle `INDEX.md` until:

(a) Pre-flight Check has completed: bundle resolved at `worlds/<world_slug>/stories/<story_slug>/`; source records loaded and traced to `branch_path`; supporting pages + rendered prose + receipts loaded (FAIL receipts surfaced for explicit user acceptance); `SP-<integer>` id allocated via `mcp__worldloom__allocate_next_id`; world canon context packet loaded via `mcp__worldloom__get_context_packet(world_slug, task_type='story_fact_promotion_to_canon', ...)`.

(b) Phases 1-6 have completed in working memory: source + branch provenance loaded (Phase 1); CF-shaped candidate translated per FOUNDATIONS §Canon Fact Record Schema (Phase 2); scope-inflation report produced (Phase 3); mystery-firewall report produced with `firewall_verdict: PASS | REQUIRES_USER_ACCEPTANCE` — `firewall_verdict: ABORT` exits before Phase 5 with no proposal written (Phase 4); downstream-impact report produced (Phase 5); full proposal package assembled per the SP-<integer>-proposal-package.yaml shape (Phase 6).

(c) Phase 4 `firewall_verdict` is NOT `ABORT`. Forbidden-mystery resolution attempts cause abort before Phase 5.

(d) The user has explicitly approved the deliverable summary (candidate title / status / type / statement; scope-inflation report findings including widening applied + scope_argument + flags; mystery-firewall report findings including any REQUIRES_USER_ACCEPTANCE items; downstream-impact report including world domains affected + same-story contradictory branches + cross-story contradictions; prose-receipt failures requiring acceptance; contradiction-preference disposition; the recommended next step is invoking `canon-addition` with the proposal-package path).

This gate is authoritative under Auto Mode or any other autonomous-execution context — invoking this skill does not constitute approval of the deliverable summary. World-canon promotion is too high-stakes for automation override.
</HARD-GATE>

## Process Flow

```
Pre-flight Check (load FOUNDATIONS + shared contract; resolve bundle;
  resolve source records; resolve supporting pages + prose + receipts;
  resolve branch + verify source records trace to branch_path;
  allocate SP id; load world canon context packet)
        |
        v
Phase 1: Load source and branch provenance (records + authoring SE +
                                            witness BEL + rendered prose)
        |
        v
Phase 2: Translate source into CF-shaped candidate (per FOUNDATIONS
                                                    §Canon Fact Record Schema)
        |
        v
Phase 3: Scope-inflation check (Rule 4 — structured scope_inflation_report)
        |
        v
Phase 4: Mystery firewall (Rule 7 — firewall_verdict PASS | ABORT |
                                    REQUIRES_USER_ACCEPTANCE)
                                    [ABORT exits before Phase 5]
        |
        v
Phase 5: Downstream impact analysis (world domains affected; same-story
                                     contradictory branches; cross-story
                                     contradictions)
        |
        v
Phase 6: Assemble proposal package (combine Phase 1-5 outputs)
        |
        v
Phase 7: HARD-GATE fires → write SP-<integer>-proposal-package.yaml
                          + SP-<integer>.md ledger + INDEX update; instruct
                          user to invoke canon-addition separately
```

## Inputs

### Required

- `world_slug` — string — existing world directory slug under `worlds/`
- `story_slug` — string — existing story bundle slug under `worlds/<world_slug>/stories/`
- `source_kind` — enum — one of `story_fact | mystery_resolution | character_outcome | artifact_canonization | relationship_or_institutional_outcome | other_branch_claim`
- `source_record_ids` — list — record ids constituting the candidate (mapping per source_kind documented below)
- `branch_path` — `BR-<integer>` — branch where the claim is established
- `supporting_page_ids` — list[PG-<integer>] — pages whose rendered prose is evidence

### Optional

- `desired_canon_status` — enum — `hard_canon | derived_canon | soft_canon | contested_canon`. Default: derive from source_kind.
- `scope_argument` — string — rationale for the candidate's scope (consumed by Phase 3)
- `contradiction_preference` — enum — `flag | archive_same_story_branches | leave_counterfactual`. Default `flag`.

### Source-kind record-class mapping

| source_kind | Required source_record class(es) | Permitted supporting source records | Prose evidence |
|---|---|---|---|
| `story_fact` | `SF-<integer>` | authoring `SE`, witness `BEL` | Required |
| `mystery_resolution` | `SF-<integer>` or `BEL-<integer>` that states the apparent, held, or candidate resolution | resolving `SE`, pre-resolution `BEL` chain, relevant `PG.state_snapshot.unresolved_mystery_claims[].evidence_records[]` | Required; M records are governing firewall load (auto-loaded from world context, not user-supplied as `source_record_ids`) |
| `character_outcome` | `STENT-<integer>` | `STSTAT-<integer>` supersession-chain evidence showing the outcome's accumulation; STENT alone is sufficient when no status record carries load-bearing evidence | Required |
| `artifact_canonization` | `DA-<integer>` (story-local) | authoring `SE` | Required |
| `relationship_or_institutional_outcome` | `SREL-<integer>` | `BEL-<integer>`, `SF-<integer>`, supersession chain, supporting events | Required |
| `other_branch_claim` | user-supplied records from the lawful `promotion_claims[].source_record` classes | none | Optional |

## Output

- `story-promotions/SP-<integer>-proposal-package.yaml` — Always (pre-acceptance proposal package with a CF-shaped `candidate:` block and top-level `proposal_evidence:` audit trail; consumed by `canon-addition`, which copies only `candidate:` into the accepted CF payload and sets accepted-CF approval provenance if it accepts the proposal)
- `story-promotions/SP-<integer>.md` — Always (human-readable ledger pointing at YAML package)
- Bundle `INDEX.md` — Always (updated last)

All direct-write. No patch-engine submissions to world scope. **No world-canon writes occur — `canon-addition` is invoked separately by the user with the proposal-package path.**

## World-State Prerequisites

Before this skill acts, it MUST receive (per FOUNDATIONS §Tooling Recommendation):

- `docs/FOUNDATIONS.md` — §Canon Layers (candidate status enum), §Canon Fact Record Schema (parity target for Phase 2 candidate), §Story Bundles §5 (story-scope authority discipline), Rules 1-7 + 11-12 (canon-addition enforces; this skill's candidate must respect them)
- `.claude/skills/_shared-templates/story-state-contract.md` — §11 mystery and canon authority
- `.claude/skills/_shared-templates/story-record-schemas.md` — §4 record schemas (BEL §4.1, PG §4.2, SE §4.3 — read as evidence)
- `worlds/<world_slug>/stories/<story_slug>/_source/<class>/<record-id>.yaml` — source records per `source_record_ids` + authoring `SE` events + witness `BEL` records (resolved by following `consequences.opens[]` and `basis.source_event` chains)
- `worlds/<world_slug>/stories/<story_slug>/_source/branches/<branch_path>.yaml` — branch lineage verification
- `worlds/<world_slug>/stories/<story_slug>/pages-prose/<page_id>.md` + `pages-prose-receipts/<page_id>.yaml` — for each `supporting_page_ids` entry (required for prose-evidence source kinds)
- World canon context packet via `mcp__worldloom__get_context_packet(world_slug, task_type='story_fact_promotion_to_canon', story_slug=<story_slug>, seed_nodes=<every M-<integer> whole-class for firewall + every INV whole-class + parent CFs of mirrored SF sources>, token_budget=<default>)`. Load `source_record_ids` and related authoring `SE` / witness `BEL` records through targeted `mcp__worldloom__get_records(record_ids=<ids>, story_slug=<story_slug>)` or direct story-bundle reads allowed by the current workflow; do not pass story-local ids in world-scope `seed_nodes`.

The bundle MUST exist (non-bootstrap variant); source records MUST exist and trace to `branch_path`; supporting prose MUST exist for required-prose source kinds. Receipt `verdict: PASS | WARN` is acceptable at Pre-flight; `verdict: FAIL` requires explicit user acceptance at Phase 7.

## Pre-flight Check

Before Phase 1:

1. Load `docs/FOUNDATIONS.md` and `.claude/skills/_shared-templates/story-state-contract.md` into working context. Abort with clear missing-file error on unreadable path.
2. Resolve `worlds/<world_slug>/stories/<story_slug>/`. Abort with bundle-not-found error if missing.
3. Resolve source records: for each id in `source_record_ids`, load the corresponding `_source/<class>/<id>.yaml`. Verify source-kind-to-record-class mapping (per the table in §Inputs). When `source_kind: mystery_resolution`, every `source_record_ids` entry MUST be `SF-<integer>` or `BEL-<integer>`; `M-<integer>` records are auto-loaded as governing firewall context and are not lawful source records. Abort with source-not-found, source-kind-mismatch, or `source_kind_record_class_mismatch` on any miss.
4. Resolve supporting pages: for each `PG-<integer>` in `supporting_page_ids`, load the page record AND `pages-prose/<page_id>.md` (rendered prose) AND `pages-prose-receipts/<page_id>.yaml` (prose receipt). Abort with missing-prose error if rendered prose is absent for a required-prose source_kind. Accept `verdict: PASS | WARN`; flag `verdict: FAIL` for Phase 7 user acceptance.
5. Resolve branch: load `_source/branches/<branch_path>.yaml`. Verify every source record's branch lineage traces to `branch_path` (a `story_fact` source cannot be promoted from a branch that didn't author it). Abort with branch-mismatch error on any failure.
6. Allocate `SP-<integer>` id via `mcp__worldloom__allocate_next_id(world_slug, 'SP', story_slug=<story_slug>)`.
7. Load `source_record_ids`, related authoring `SE` events, and witness `BEL` records through `story_slug` scoped targeted retrieval (or direct story-bundle reads allowed by the current workflow). Load the world canon context packet with `story_slug=<story_slug>` and world-scope seeds only: whole-class Mystery Reserve (for Phase 4 firewall), whole-class INV (for invariant check), and parent CFs of any mirrored `SF` sources (for Phase 2 candidate's `source_basis.derived_from`).

Persisted-summary recovery: see
`.claude/skills/_shared-templates/persisted-packet-recovery.md`. If
`get_context_packet` (or `get_records` / `describe_envelope_schema`) returns
`delivery_status: persisted_with_summary`, retrieve required slices via
`mcp__worldloom__get_persisted_packet_slice` before continuing.

If any precondition fails, the skill aborts before Phase 1.

## Phase 1: Load source and branch provenance

Load into working memory:

- The source records named in `source_record_ids` (per the source-kind-to-record-class mapping in §Inputs).
- The `SE-<integer>` events that authored or modified each source record (traverse `_source/events/SE-*.yaml` for events whose `state_delta.create / supersede` references any source record).
- The `BEL-<integer>` records showing who knows / believes / witnesses the claim — load every BEL whose `consequences.opens[]` or `basis.source_event` references any authoring `SE`.
- Any authoring `SE.resolution.player_visible_feedback` where `resolution.result == held_for_promotion`; carry this into the proposal evidence narrative so canon-addition reviewers can see what the player was told at the hold point.
- The `branch_path` `BR-<integer>.yaml` record + sibling branch summaries (for Phase 5 downstream impact on same-story contradictory branches).
- Rendered prose at `pages-prose/<page_id>.md` and receipts at `pages-prose-receipts/<page_id>.yaml` for each `supporting_page_ids` entry.
- Whole-class Mystery Reserve and whole-class INV (loaded at Pre-flight) for Phase 4 firewall.
- World canon CF records relevant to Phase 2 candidate translation + Phase 3 scope-inflation + Phase 5 downstream impact.

## Phase 2: Translate source into CF-shaped candidate

Produce a candidate matching FOUNDATIONS §Canon Fact Record Schema strictly. The field set is the SAME across all 6 source kinds (source kind changes required evidence, not workflow shape):

```yaml
candidate:
  title: <short descriptive title>
  status: hard_canon | derived_canon | soft_canon | contested_canon
  type: capability | artifact | law | belief | event | institution | species | <etc per CF schema enum>
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
  required_world_updates: [<UPPER_SNAKE SEC file class>]
  contradiction_risk:
    hard: true | false
    soft: true | false
  source_basis:
    direct_user_approval: false   # pre-acceptance package only; canon-addition sets accepted CF records to true after its own HARD-GATE
    derived_from: []              # novel candidate; mirrored candidate uses [<parent CF id>]; never null or branch ids
```

**Branch provenance lives in top-level `proposal_evidence`, NEVER inside `candidate.source_basis` or `candidate.promotion_provenance`.** `candidate.source_basis.derived_from` is reserved for parent CF references — world authority. The branch is evidence, not authority. The package is not an accepted Canon Fact Record: `direct_user_approval` stays `false` until `canon-addition` accepts the proposal through its own HARD-GATE and emits a `create_cf_record` payload with `true`.

When `candidate.type` is in `CF_TYPE_EPISTEMIC_PROFILE_REQUIRED` (`capability`,
`bloodline`, `magic_practice`, `technology`, `divine_action`,
`artifact_dependent_truth`, `exception_introducing_fact`,
`institution_with_secrecy`, `knowledge_asymmetric_fact`) OR
`CF_TYPE_EXCEPTION_GOVERNANCE_REQUIRED` (the same list minus the last two), the
candidate MUST include the corresponding `epistemic_profile` and/or
`exception_governance` block — either as a full object, or as
`{ n_a: "<substantive rationale citing an ontology category>" }`. Do not defer
this reasoning to `canon-addition`; `proposal_package_shape` enforces it at
validation time. The reasoning lives in the candidate because it is part of
what story-promotion-closeout reviewers need to evaluate the proposal, not part
of the canon-addition adjudication.

## Phase 3: Scope-inflation check (FOUNDATIONS Rule 4)

For each source record, verify the candidate's `scope` does not over-promote. Five sub-checks:

1. **Branch-local-counterfactual cap** — if any source `SF.authority == branch_local_counterfactual`, the candidate cannot exceed `contested_canon` status. Hard-canon promotion of counterfactuals → FAIL. Valid `SF.authority` values are `branch_local`, `branch_local_counterfactual`, `canon_candidate`, and `canon_linked`; this phase treats `canon_linked` sources as already backed by parent CF ids in `SF.derived_from`.
2. **Scope-widening rationale** — if candidate's `scope.geographic` / `scope.temporal` / `scope.social` exceeds the source records' actual scope, `scope_argument` must be supplied. Widening without rationale → FAIL.
3. **Trace-count sufficiency (Rule 12 anticipation)** — when `desired_canon_status: hard_canon`, the supporting prose must demonstrate the claim across at least 2 distinct registers (per Rule 12). Single-trace hard-canon → FLAG (canon-addition will enforce at adjudication; this skill flags potential failure).
4. **Inter-branch contradiction risk** — populate `candidate.contradiction_risk.hard` and `contradiction_risk.soft` per Phase 5 cross-branch enumeration.
5. **Mystery-collapse cross-reference** — if Phase 4 firewall identifies mystery-collapse risk, surface in the report.

Produce a structured `scope_inflation_report`:

```yaml
scope_inflation_report:
  source_actual_scope:
    geographic: <derived>
    temporal: <derived>
    social: <derived>
  candidate_proposed_scope:
    geographic: <from candidate>
    temporal: <from candidate>
    social: <from candidate>
  widening_applied: <none | geographic_local_to_regional | temporal_current_to_historical | etc>
  scope_argument: <user-supplied or null>
  trace_count: <integer; the number of distinct registers the supporting prose covers>
  flags: [<short label per failed sub-check>]
```

## Phase 4: Mystery firewall (FOUNDATIONS Rule 7 + shared contract §11)

Mystery Reserve (`M-<integer>`) records are loaded from world canon context as whole-class governing firewall context. They are NOT user-supplied through `source_record_ids`; for `source_kind: mystery_resolution`, those ids are branch evidence records (`SF` / `BEL`) that state the apparent, held, or candidate resolution.

Reject conditions:

1. **Forbidden mystery resolution** — any mystery with `status: forbidden` whose effect would be resolved by accepting this candidate. `firewall_verdict: ABORT` (no proposal written; Phase 5+ skipped).
2. **Accidental resolution of unrelated mystery** — the candidate's `statement` / `domains_affected` / `visible_consequences` would resolve a mystery the user didn't explicitly intend to resolve. `firewall_verdict: REQUIRES_USER_ACCEPTANCE` (flag at Phase 7).
3. **Branch-local counterfactual presented as objective canon** — if any source `SF.authority == branch_local_counterfactual`, reject unless `desired_canon_status: contested_canon`. `firewall_verdict: ABORT`.
4. **Source_kind mismatch** — e.g., a `story_fact` source_kind whose effect would resolve a mystery should be `mystery_resolution`. `firewall_verdict: REQUIRES_USER_ACCEPTANCE` with recommended source_kind change.

Produce a structured `mystery_firewall_report`:

```yaml
mystery_firewall_report:
  mysteries_scanned: <count of M-<integer> records loaded>
  forbidden_resolution_attempts: [M-<integer>, if any]
  accidental_resolution_warnings: [M-<integer>, if any]
  counterfactual_promotion_attempts: [<source SF id, if any>]
  source_kind_mismatch_warnings: [<recommended source_kind change, if any>]
  firewall_verdict: PASS | ABORT | REQUIRES_USER_ACCEPTANCE
```

`ABORT` exits before Phase 5 with no proposal written. `REQUIRES_USER_ACCEPTANCE` continues to Phase 5 but the items appear at Phase 7 HARD-GATE for explicit user acceptance.

## Phase 5: Downstream impact analysis

Enumerate:

1. **World domains affected** — list FOUNDATIONS §Mandatory World Files concerns the promotion would touch (`peoples-and-species`, `institutions`, `economy-and-resources`, `magic-or-tech-systems`, `everyday-life`, `geography`, `timeline`).
2. **Same-story contradictory branches** — list other branches (`BR-<integer>`) in this bundle whose state contradicts the candidate. The proposal's `contradiction_preference` field records the user's desired handling (`flag | archive_same_story_branches | leave_counterfactual`); `story-promotion-closeout` applies the chosen action after canon-addition adjudicates. This skill does NOT modify other branches.
3. **Cross-story contradictions** — list sibling story bundles (other `worlds/<world_slug>/stories/<sibling_story>/`) whose state contradicts the candidate. Flag-only here; resolution belongs to `branching-story-health-audit` `cross_story` mode or a separate world-level workflow.

Produce a structured `downstream_impact_report`:

```yaml
downstream_impact_report:
  world_domains_affected: [<domain>]
  same_story_contradictory_branches: [BR-<integer>]
  cross_story_contradictions: [<sibling_story_slug:record_id>]
  affected_world_files: [<file path under worlds/<world_slug>/>]
  promotion_provenance_narrative: <one-paragraph explanation>
```

## Phase 6: Assemble proposal package

Combine Phase 1-5 outputs into the full `SP-<integer>-proposal-package.yaml` shape (see `templates/proposal-package.yaml`):

```yaml
promotion_id: SP-<integer>
story_slug: <story_slug>
source_kind: <source_kind>
candidate: <Phase 2 CF-shaped candidate>
proposal_evidence:
  story_branch: BR-<integer>
  source_kind: <source_kind>
  source_records: [<source_record_ids>]
  supporting_pages: [<supporting_page_ids>]
  authoring_events: [SE-<integer> ids]
  belief_witnesses: [BEL-<integer> ids]
  rendered_prose_receipts: [pages-prose-receipts/PG-<integer>.yaml]
  resolution_feedback_evidence:
    - event_id: SE-<integer>
      player_visible_feedback: <copied from SE.resolution.player_visible_feedback when result == held_for_promotion>
  claim_visibility:
    who_holds_belief: [STENT-<integer> | group:<name> | public]
    belief_truth_relations: [<truth_relation per BEL>]
  rationale: <natural-language explanation of why this branch-local claim should become world canon>
scope_inflation_report: <Phase 3 report>
mystery_firewall_report: <Phase 4 report>
downstream_impact_report: <Phase 5 report>
contradiction_preference: flag | archive_same_story_branches | leave_counterfactual
user_decision:
  hard_gate_approved: false   # set true at Phase 7
  acceptance_of_warnings: []
prose_receipt_failures_accepted: []
```

The companion `SP-<integer>.md` ledger is a human-readable narrative explanation pointing at the YAML package.

## Phase 7: Commit / Write — HARD-GATE fires

1. Present the deliverable summary to the user:
   - `SP-<integer>` id + candidate `title` / `status` / `type` / `statement` (one-line each).
   - Scope-inflation report findings (widening applied, scope_argument supplied, trace_count, flags).
   - Mystery-firewall report findings (firewall_verdict, REQUIRES_USER_ACCEPTANCE items if any).
   - Downstream-impact report (world domains affected, same-story contradictory branches, cross-story contradictions).
   - Prose-receipt failures requiring acceptance (per Pre-flight step 4).
   - Contradiction-preference disposition.
   - Recommended next step: *"Run `canon-addition` with `proposal_path=worlds/<world_slug>/stories/<story_slug>/story-promotions/SP-<integer>-proposal-package.yaml`. After canon-addition adjudicates, run `story-promotion-closeout` to write the verdict back onto story-local records."*

2. **HARD-GATE fires** — wait for explicit user approval. Auto Mode does not override.

3. On approval:
   - Set `user_decision.hard_gate_approved: true`.
   - Record `user_decision.acceptance_of_warnings` per the user's explicit acceptances of REQUIRES_USER_ACCEPTANCE items.
   - Record `prose_receipt_failures_accepted` per the user's explicit acceptances of FAIL receipts.
   - Write `worlds/<world_slug>/stories/<story_slug>/story-promotions/SP-<integer>-proposal-package.yaml` (direct write — `templates/proposal-package.yaml` is the schema reference).
   - Write `worlds/<world_slug>/stories/<story_slug>/story-promotions/SP-<integer>.md` (direct write — `templates/story-promotion-ledger.md` is the format reference).
   - Update bundle `INDEX.md` to reflect the new promotion entry.

4. Report the proposal paths to the user. Explicitly instruct the next step. Do NOT `git commit`.

**Failure behavior**: Pre-flight failure → write nothing; surface the precondition violation. Phase 4 ABORT → write nothing; surface the forbidden-mystery / counterfactual / source-kind-mismatch violation. Phase 7 user rejection → write nothing; surface the rejection reason. Partial write success (YAML written but markdown failed) → YAML proposal package is authoritative for canon-addition; surface partial-failure; user can manually author or re-run the ledger.

## Validation Rules This Skill Upholds

- **Rule 4 (No Globalization by Accident)** — Phase 3 scope-inflation check. Mechanism: every candidate's `scope.geographic / temporal / social` verified against source records' actual scope; scope-widening requires explicit `scope_argument`.
- **Rule 7 (Preserve Mystery Deliberately)** — Phase 4 mystery firewall. Mechanism: forbidden-mystery-resolution check against whole-class Mystery Reserve; counterfactual-promotion check; accidental-mystery-resolution flagging; source_kind-mismatch flagging.

Rules 1 / 2 / 3 / 5 / 6 / 11 / 12 are world-canon-mutation-surface rules enforced by **`canon-addition`** at adjudication time. This skill is canon-reading; it does NOT enforce those rules itself, but the proposal package's CF-shaped candidate is structured (per FOUNDATIONS §Canon Fact Record Schema) so canon-addition's enforcement is clean field-copy parsing.

## Record Schemas

- `templates/proposal-package.yaml` — proposal package with a CF-shaped `candidate:` block and top-level `proposal_evidence:` audit trail; consumed by `canon-addition` at parse time.
- `templates/story-promotion-ledger.md` — human-readable ledger entry pointing at the YAML package.
- Read schemas: shared contract §4 (BEL §4.1, PG §4.2, SE §4.3) + FOUNDATIONS §Canon Fact Record Schema (the candidate's target).

## FOUNDATIONS Alignment

| Principle | Phase | Mechanism |
|---|---|---|
| Rule 1 (No Floating Facts) | Phase 2, 6 | The proposal keeps `candidate:` CF-shaped and moves branch evidence into top-level `proposal_evidence`; canon-addition enforces the accepted CF at adjudication time. |
| Rule 2 (No Pure Cosmetics) | N/A at this skill | Canon-addition enforces. |
| Rule 3 (No Specialness Inflation) | N/A at this skill | Canon-addition enforces. |
| Rule 4 (No Globalization by Accident) | Phase 3 | Scope-inflation check on candidate scope. |
| Rule 5 (No Consequence Evasion) | N/A at this skill | Canon-addition enforces. |
| Rule 6 (No Silent Retcons) | N/A at this skill | Canon-addition writes the Change Log Entry. |
| Rule 7 (Preserve Mystery Deliberately) | Phase 4 | Mystery firewall + forbidden-status rejection. |
| Rule 11 (No Spectator Castes) | N/A at this skill | Canon-addition enforces. |
| Rule 12 (No Single-Trace Truths) | Phase 3 (anticipation) + N/A | Phase 3 trace_count flagging anticipates the rule; canon-addition enforces at adjudication. |
| Canon Layers | Pre-flight, Phase 2 | Candidate's `status` field selects layer. |
| Mystery Reserve | Pre-flight, Phase 4 | Whole-class Mystery Reserve loaded; forbidden-status firewall. |
| Canon Fact Record Schema | Phase 2, 6 | `candidate:` carries only CF fields; branch-local proposal evidence stays outside the candidate. |
| §Story Bundles §4a (Plan-Authority Boundary) | All phases | Skill reads `PG` records as authoritative state; never mutates. |
| §Story Bundles §5 (Validation Rules At Story Scope) | Phase 2, 4 | Canon-candidate authority discipline + forbidden-mystery firewall. |
| Change Control Policy | N/A at this skill | Canon-addition writes the Change Log Entry. |
| Tooling Recommendation | Pre-flight | World canon retrieval via `mcp__worldloom__get_context_packet`. |

## Guardrails

- **Never write world-level canon.** Hook 3 blocks raw `Edit` / `Write` on `worlds/<slug>/_source/<world-subdir>/*.yaml`. This skill writes ONLY to `worlds/<world_slug>/stories/<story_slug>/story-promotions/` + bundle `INDEX.md`. No patch-engine submissions to world scope.
- **Output is NOT canon until canon-addition adjudicates.** The proposal package is a CANDIDATE. The skill explicitly instructs the user to invoke canon-addition separately. No automatic chaining; no implicit acceptance.
- **Forbidden mysteries cannot be promoted.** Phase 4 ABORT-on-forbidden-resolution. The skill REFUSES to write a proposal package whose candidate would resolve a forbidden mystery.
- **Branch-local truth is evidence, not authority.** Phase 2 keeps branch provenance in top-level `proposal_evidence`, NEVER in `candidate.source_basis` or `source_basis.derived_from` (which is reserved for parent CF references — world authority).
- **HARD-GATE is absolute.** Always show the proposal to the user. No execution-mode bypass; no Auto Mode override. Phase 7 always pauses for explicit user approval. World-canon promotion is too high-stakes for automation.
- **No post-adjudication closeout in this skill.** After canon-addition adjudicates, the user runs `story-promotion-closeout` to write the verdict back onto story-local records (supersession of SF / BEL / DA / STENT / SREL records that the canon-addition outcome implicates, with branch disposition recorded in the closeout ledger / INDEX surfaces).
- **Skills do not chain.** This skill never invokes `canon-addition` or `story-promotion-closeout`. Phase 7 surfaces the recommendation; the user separately invokes the named sibling.
- **Worktree discipline**: if invoked inside a git worktree, all paths resolve from the worktree root.

## Final Rule

This skill creates a proposal package for promoting a branch-local story claim into world canon — never mutates world canon, never resolves a forbidden mystery, never elevates branch-local counterfactual to objective canon without explicit `contested_canon` framing, and always pauses at the HARD-GATE for explicit user approval; `canon-addition` is the only authority that turns the candidate into canon.
