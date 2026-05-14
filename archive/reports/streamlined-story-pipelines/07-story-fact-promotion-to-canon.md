# story-fact-promotion-to-canon — Streamlined v1

## Purpose

Create a proposal package for promoting a branch-local story claim into world canon. This skill stops after proposal creation. Post-adjudication story maintenance is handled by `story-promotion-closeout`.

## Source kinds

Use one common proposal flow for all source kinds:

- `story_fact`
- `mystery_resolution`
- `character_outcome`
- `artifact_canonization`
- `relationship_or_institutional_outcome`
- `other_branch_claim`

The source kind changes required evidence, not the workflow shape.

## Inputs

Required:

- `world_slug`
- `story_slug`
- `source_kind`
- `source_record_ids[]`
- `branch_path`
- `supporting_page_ids[]`

Optional:

- `desired_canon_status: hard_canon | soft_canon | contested_canon | mystery_reserve`
- `scope_argument`
- `contradiction_preference: flag | archive_same_story_branches | leave_counterfactual`

## Preconditions

- Supporting evidence pages must have rendered prose when prose is part of the evidence.
- Supporting pages should have `pages-prose-receipts` with `PASS` or `WARN`; `FAIL` requires explicit user acceptance.
- Forbidden mysteries cannot be promoted.
- Branch-local truth is evidence, not authority.

## Outputs

Direct files:

- `story-promotions/SP-NNNN.md`
- `story-promotions/SP-NNNN-proposal-package.yaml`
- bundle `INDEX.md` last

No world-canon writes occur here.

## Workflow

### 1. Load source and branch provenance

Load:

- source records,
- supporting pages,
- prose receipts,
- relevant `SE` events,
- relevant `BEL` records showing who knows/believes the claim,
- branch path and sibling branch summaries,
- world canon context packet,
- whole-class Mystery Reserve entries when source touches a mystery.

### 2. Translate source into canon candidate

Produce a `CF`-shaped candidate:

```yaml
candidate:
  title: string
  status: hard_canon | soft_canon | contested_canon | mystery_reserve
  type: string
  statement: string
  scope:
    geographic: string
    temporal: string
    social: string
  truth_scope:
    world_level: true | false | uncertain
    diegetic_status: objective | believed | disputed | legendary | propagandistic
  domains_affected: []
  prerequisites: []
  distribution: {}
  costs_and_limits: []
  visible_consequences: []
  required_world_updates: []
  contradiction_risk:
    hard: false
    soft: false
```

Do not put branch provenance into `source_basis.derived_from` as if the branch were world authority. Provenance lives in the proposal body and future change log/adjudication notes.

### 3. Scope-inflation check

Ask:

- Is this true only in this branch?
- Is it true only for one location, faction, time, narrator, or social group?
- Is the supporting prose sufficient for world-level truth?
- Does it contradict other branches?
- Does canonizing it collapse a Mystery Reserve entry?

Widening requires explicit rationale.

### 4. Mystery firewall

Reject:

- forbidden mystery resolution,
- accidental resolution of an unrelated mystery,
- branch-local counterfactual presented as objective canon,
- mystery progress effect promoted through the wrong source kind.

### 5. Downstream impact

List affected world domains and story branches. Same-story contradictory branches can later be flagged or archived by closeout. Cross-story contradictions are flag-only unless a separate world-level workflow handles them.

### 6. Assemble proposal package

The package includes:

- promotion id,
- source kind,
- source records,
- branch path,
- supporting rendered pages and receipts,
- claim visibility and belief context,
- CF-shaped candidate,
- scope-inflation report,
- mystery firewall report,
- downstream impact,
- contradiction preference,
- user decision field.

### 7. Hard gate

Always show the proposal to the user. No execution mode bypass.

### 8. Write proposal

On approval, write the proposal package and update the story index. Then instruct the caller to run `canon-addition` separately.

## Removed from old promotion skill

- No post-adjudication closeout in the same workflow.
- No branch supersession writes here.
- No conditional story-local artifact superseders here.
- No multi-phase process that pauses mid-skill while canon-addition runs elsewhere.

## What closeout owns now

After canon-addition returns a verdict, run `story-promotion-closeout` to:

- record accepted/rejected outcome,
- link new CF/CH/PA ids,
- supersede story-local records with promotion links,
- flag/archive same-story contradictory branches if approved.
