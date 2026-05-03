# Example: SF Promotion (story_fact source_kind)

Adapted from the source proposal's SF-0042 → CF-NNNN narrative example: the proposal sketches the SF supersession in YAML; this worked example expands it into the full pipeline trace for a hypothetical Animalia-style world, showing the SP ledger, the CF candidate, and the post-acceptance state.

## Scenario

A branching story `harborwatch-conspiracy` in world `animalia` reaches PG-0042 where the protagonist Mara discovers (through SF-0042) that the city's harbormaster has been quietly redirecting taxed grain shipments to a foreign syndicate for years. The user, satisfied that this branch's outcome is the world's truth ("yes, the harbormaster IS corrupt; that has been true all along"), invokes:

```
/story-fact-promotion-to-canon \
  world_slug=animalia \
  story_slug=harborwatch-conspiracy \
  source_kind=story_fact \
  source_sf_id=SF-0042 \
  promotion_branch_path=[PG-0001, PG-0007, PG-0024, PG-0042]
```

## Pre-flight Trace

- FOUNDATIONS.md loaded ✓
- `worlds/animalia/` exists ✓
- `worlds/animalia/stories/harborwatch-conspiracy/` exists ✓
- `worlds/animalia/stories/harborwatch-conspiracy/_source/facts/SF-0042.yaml` exists ✓
- promotion_branch_path validated: PG-0001 → PG-0007 → PG-0024 → PG-0042 (all exist; chain parent-traversable) ✓
- SP-0001 allocated (first promotion in this story) — manual scan fallback used (MCPENH-018 not yet landed) ✓
- World canon loaded via `task_type='canon_addition'` (MCPENH-019 fallback) — packet includes Animalia's invariants, CFs touching `economy-and-resources` and `institutions` domains, and every M-NNNN ✓
- Whole-class M load: 47 M-records loaded with full bodies for Phase 4 firewall ✓
- content_policy block (NC-21) loaded ✓

## Phase 1 Source Extraction

Loaded `SF-0042.yaml`:

```yaml
id: SF-0042
story_id: STORY-0001
logical_id: SF-0042
subject: STENT-0008                # the harbormaster (story-local entity, world_ent_id: ENT-0193)
predicate: "has_been_redirecting_taxed_grain_to"
object: STENT-0023                 # the foreign syndicate (story_only: true)
epistemic_class: objective
truth_value: true
certainty: 1.0
known_by: [STENT-0001, STENT-0014]  # Mara + the dock-clerk who showed her the ledger
believed_by: []
derived_from_cf: null              # not derived from any existing CF
canon_relation: not_applicable     # premise-specific to this story
created_at_page: PG-0042
evidence:
  - event_id: SE-0042
    page_id: PG-0042
    strength: decisive             # the ledger entries were physical evidence
```

Branch path validated: SF-0042's `created_at_page` (PG-0042) lies on the cited promotion_branch_path. ✓

Supporting prose captured: 4 excerpts from `pages-prose/PG-0024.md` (the dock-clerk's first warning), `pages-prose/PG-0030.md` (Mara investigates), `pages-prose/PG-0042.md` (the ledger discovery scene), and `pages-prose/PG-0042.md` (the implication conversation).

## Phase 2 CF Candidate Translation

```yaml
id: CF-<placeholder>
title: "Brinewick's harbormaster has been embezzling taxed grain shipments to foreign buyers"
status: contested_canon            # not hard_canon — only two characters know
type: institution
statement: >
  The harbormaster of Brinewick's main customs post has, over the past several
  years, systematically redirected a portion of taxed grain shipments to a
  foreign syndicate operating out of the southern free-ports, falsifying ledger
  entries to conceal the diversion. The arrangement is known directly to two
  parties (the harbormaster and a contact in the syndicate); a small number of
  dock-clerks have suspicions but no consolidated proof.
scope:
  geographic: local                # Brinewick harbor only
  temporal: current                # ongoing
  social: secret                   # only ~2 know directly; ~3 suspect
truth_scope:
  world_level: true                # the user has decided this is now world-true
  diegetic_status: objective       # it IS happening (not merely believed); but social: secret
domains_affected:
  - economy
  - institutions
  - law
prerequisites:
  - access to harbor customs ledgers
  - foreign-syndicate contact
  - ability to falsify ledger entries
distribution:
  who_can_do_it:
    - the_harbormaster_of_brinewick
  who_cannot_easily_do_it:
    - other_harbor_officials
    - inland_tax_collectors
    - the_syndicate's_buyers (they participate but did not initiate the diversion)
  why_not_universal:
    - requires_authority_over_ledger_entries
    - requires_pre-existing_syndicate_contact
    - requires_systematic_concealment_skill
costs_and_limits:
  - discovery would mean execution under Brinewick's customs law
  - the syndicate's portion is limited by what can be concealed in routine "spoilage" entries
  - a careful audit by an outside inspector would expose the pattern within weeks
visible_consequences:
  - Brinewick's reported customs revenue is ~8% lower than projections suggest it should be
  - dock-clerks who notice anomalies tend to be reassigned or quietly dismissed
  - the foreign syndicate has unusually consistent grain supply at favorable prices
required_world_updates:
  - economy-and-resources           # SEC-ECR-NNN section on Brinewick's revenue / shadow economy
  - institutions                    # SEC-INS-NNN section on Brinewick's customs office
  - law                             # NOT a SEC file class — handled in CH downstream_updates instead
source_basis:
  direct_user_approval: true
  derived_from: []                  # no parent CFs; this is a new fact
contradiction_risk:
  hard: false
  soft: false
notes: >
  Promoted from story `harborwatch-conspiracy`, branch leaf PG-0042, via SP-0001.
  Original story-local source: SF-0042. Branch-path provenance: [PG-0001, PG-0007,
  PG-0024, PG-0042]. Supporting pages: PG-0024, PG-0030, PG-0042.
  Full audit trail: SP-0001.md + CH-NNNN.yaml + PA-NNNN-<verdict>.md.
epistemic_profile:
  directly_observable_by: [the_harbormaster, the_syndicate_contact]
  inferable_by: [outside_auditor_with_full_records, dock_clerks_aggregating_anomalies]
  recorded_by: [the_syndicate's_internal_ledger]
  suppressed_by: [the_harbormaster, the_dock_clerks_he_dismissed]
  distortion_vectors: [falsified_ledger_entries, "spoilage" miscategorization]
  propagation_channels: [dock-clerk gossip — slow and unverified]
  evidence_left: [pattern of customs revenue shortfall, anomalous grain supply at southern free-ports]
  knowledge_exclusions: [Brinewick's elected magistrate, the inland tax authority]
exception_governance:
  activation_conditions: [shipping season, trusted-clerk shift]
  rate_limits: [bounded by what "spoilage" categorization can absorb]
  countermeasures: [outside audit; whistleblower-clerk testimony; physical interception of a redirected shipment]
  nondeployment_reasons: [risk of execution if exposed]
pre_figured_by: []                  # no prior CF foreshadowed this
```

## Phase 3 Scope Inflation Check

- Source's `known_by` is 2 (Mara + dock-clerk) → diegetic_status correctly set to `objective` with `social: secret` (NOT `believed`/`disputed` because the user explicitly accepts this is REALLY happening).
- `scope.geographic: local` matches source's confined-to-Brinewick reach. ✓
- No inflation detected. ✓

## Phase 4 Mystery Firewall Check

- source_kind != mystery_resolution → main branch skipped.
- Whole-class M scan for accidental touch: none of Animalia's 47 mysteries are touched by the harbormaster's embezzlement. ✓
- PASS — proceed.

## Phase 5 Downstream-Impact Analysis

Within this story, 2 other branches found:
- BR-0002 (Mara never investigates; takes a different choice at PG-0007). Leaf state_snapshot does NOT contain SF-0042 or any contradicting fact. **No contradiction.**
- BR-0003 (Mara investigates but the harbormaster bribes her at PG-0030; SF-0030 in this branch's snapshot says the harbormaster is innocent). Leaf state_snapshot contains a contradicting SF (the bribe-success path established the harbormaster's innocence as a `believed` fact in Mara's head). **Contradiction detected.**

Cross-story scan not performed (`cross_story_impact_scan: false`).

`downstream_impact`:
- this_story.contradicting_branches: [BR-0003 → recommended_handling: flag (per default `flag_contradicting_branches`)]
- cross_story.scan_performed: false

## Phase 6 Build Proposal Package

Proposal package assembled in memory per `templates/proposal-package.yaml`. Will be written to disk only on Phase 8 user-accept.

## Phase 7 Mandatory LLM Critics

| Critic | Verdict | Rationale |
|---|---|---|
| Provenance | PASS | All four supporting pages cited + quoted; SF-0042's `created_at_page` (PG-0042) lies on the promotion_branch_path; supersession history clean. |
| Scope-Inflation | PASS | `social: secret` correctly reflects 2-character knowledge; `geographic: local` matches Brinewick-only setting; no widening claimed. |
| Mystery-Firewall | PASS | Not a mystery resolution; whole-class M scan found no accidental touch. |
| Downstream-Impact | PASS | BR-0003 contradicting branch enumerated; flag handling appropriate (Mara's bribed-path belief is a legitimate counterfactual that should remain explorable, not be archived). |
| Rule 12 Two-Trace | N/A | proposed_status: contested_canon, not hard_canon — Rule 12 critic does not run. |

All applicable critics PASS with rationale. Proceed to Phase 8.

## Phase 8 HARD-GATE

User reviews the full Phase 8 summary (per the SKILL.md presentation format). User chooses ACCEPT.

## Phase 9 Hand Off to canon-addition

`SP-0001-proposal-package.yaml` written to `worlds/animalia/stories/harborwatch-conspiracy/story-promotions/SP-0001-proposal-package.yaml`.

User invokes:

```
/canon-addition world_slug=animalia proposal_path=worlds/animalia/stories/harborwatch-conspiracy/story-promotions/SP-0001-proposal-package.yaml
```

canon-addition runs its own Phases 0–11. Verdict: ACCEPT_WITH_REQUIRED_UPDATES (the new CF requires extending two SEC records: SEC-ECR-003 Brinewick economy + SEC-INS-007 customs institutions). canon-addition assembles the patch plan creating CF-0193 + CH-0048 + extensions + PA-0019, fires its own HARD-GATE, user approves, patch plan submitted via `mcp__worldloom__submit_patch_plan`.

User returns with: `verdict=ACCEPT_WITH_REQUIRED_UPDATES, CF=CF-0193, CH=CH-0048, PA=PA-0019`.

## Phase 10 Post-Adjudication Ledger + Story-Side Effects

### Step 1: Write SP-0001.md

`worlds/animalia/stories/harborwatch-conspiracy/story-promotions/SP-0001.md` written per `templates/story-promotion-ledger.md` with:
- This-pipeline outcome: ACCEPT (handed to canon-addition)
- canon-addition outcome: ACCEPT_WITH_REQUIRED_UPDATES
- Resulting CF: CF-0193
- Resulting CH: CH-0048
- Adjudication record: PA-0019
- All five critic verdicts (with N/A for Rule 12)
- Provenance, scope, downstream-handling sections populated.

### Step 2: Story-Local Source Update

Allocate next SF id via `mcp__worldloom__allocate_next_id(world_slug='animalia', id_class='SF', story_slug='harborwatch-conspiracy')` → SF-0091.

Write `worlds/animalia/stories/harborwatch-conspiracy/_source/facts/SF-0091.yaml`:

```yaml
id: SF-0091
story_id: STORY-0001
logical_id: SF-0042                  # original logical fact
supersedes: SF-0042
created_at_page: PG-0042             # leaf of promotion_branch_path
promoted_to_cf: CF-0193              # the new world-level CF
# all other fields inherited from SF-0042 (subject, predicate, object,
# epistemic_class, truth_value, certainty, known_by, evidence)
```

SF-0042 itself is NOT deleted — it remains in `_source/facts/`. The link is recorded, not erased.

### Step 3: Contradiction Handling

Default `contradiction_handling_preference: flag_contradicting_branches`. BR-0003 (Mara's bribed-path branch) is flagged:

Allocate next BR id → BR-0004. Write `worlds/animalia/stories/harborwatch-conspiracy/_source/branches/BR-0004.yaml`:

```yaml
id: BR-0004
story_id: STORY-0001
supersedes: BR-0003
status: contradicted_by_promoted_canon
contradicted_by_sp: SP-0001
contradicted_by_cf: CF-0193
# all other BR-0003 fields inherited (root_page_id, current_leaf_page_id,
# branch_path, etc.)
```

BR-0003 itself is NOT deleted; the supersession is the lawful mutation. BR-0004 is the new active record. The branch may continue to be played (page-cycle ticks remain valid against BR-0004's `status: contradicted_by_promoted_canon`).

### Step 4: World-Canon Propagation Note (informational)

CF-0193 is now part of Animalia's world canon. Every subsequent `branching-story-page-cycle` tick (in this story OR any other story in Animalia) will retrieve CF-0193 via Pre-flight world-canon retrieval. No retroactive `canon_sync` op is added to any branch's existing pages.

## Phase 11 INDEX Updates

`worlds/animalia/stories/harborwatch-conspiracy/INDEX.md` edited:
- New `## Promotions` section with: `- [SP-0001](story-promotions/SP-0001.md) — story_fact (SF-0042) promoted to CF-0193 [ACCEPT_WITH_REQUIRED_UPDATES] — 2026-05-03`
- BR-0003's existing INDEX entry annotated: `⚠ contains state contradicting CF-0193 promoted at SP-0001 (now BR-0004)`

Do NOT git commit. User reviews the full diff and commits separately.

## Net Result

- **World canon mutated**: CF-0193 + CH-0048 + extensions to SEC-ECR-003 + SEC-INS-007 + PA-0019.
- **Story bundle mutated**: SP-0001.md + SP-0001-proposal-package.yaml + SF-0091 (superseder) + BR-0004 (supersedes BR-0003) + INDEX.md.
- **Story-local SF-0042 preserved**: still in `_source/facts/`; future audit can trace it to CF-0193 via SF-0091's `promoted_to_cf` field.
- **BR-0003 preserved**: still in `_source/branches/`; the bribed-path branch can continue to be played as a flagged-counterfactual exploration.
- **Audit trail intact**: SP-0001 + CH-0048 + PA-0019 triad satisfies Rule 6.
