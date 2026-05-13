# branching-story-health-audit — Streamlined v1

## Purpose

Diagnose story-bundle health. The default audit is deterministic and fast. Semantic prose criticism and remediation-card drafting are optional modes.

## Modes

- `structural` default — replay, snapshots, branch isolation, debt, continuation, mystery/canon safety.
- `prose` — compare rendered prose and receipts against committed state.
- `remediation` — draft repair recommendations or commitment-block requests.
- `cross_story` — optional world-level contradiction scan across story bundles.

Modes can be combined, but the report must state which checks ran.

## Inputs

Required:

- `world_slug`
- `story_slug`

Optional:

- `branch_path_filter`
- `mode[]`
- `severity_threshold`
- `emit_remediation_requests: true | false`

## Outputs

Direct markdown:

- `audits/SAU-NNNN-<date>.md`
- optional `audits/SAU-NNNN/remediation-requests/RSP-NNNN.md`
- `audits/INDEX.md` last

The audit never mutates story state or world canon.

## Structural workflow

### 1. Scope branches

Build the branch tree from `BR` and `PG` records. Identify roots, leaves, terminal pages, and filtered branch paths.

### 2. Replay events

For each scoped branch:

1. load root snapshot,
2. walk page chain in branch order,
3. apply each `SE.state_delta`,
4. compare computed snapshot hash to `PG.state_hash`,
5. record divergence.

Snapshot divergence is an error.

### 3. Check branch isolation

Flag:

- records created in sibling branches appearing in this branch snapshot,
- author-pool `SLT` records depending on branch-local records,
- prose/plan references to sibling-only facts,
- choices pointing outside the active branch state.

Branch isolation violations are errors.

### 4. Check debt health

For each open `OBL`, `CNSQ`, and `THR`:

- is it still actionable?
- does it have at least one eligible or JIT-able commitment block?
- has it been ignored beyond its urgency?
- has it been invalidated by death, absence, location change, or belief change?

Uncovered high-salience debt is a warning unless it breaks continuation.

### 5. Check belief and visibility health

Flag:

- public consequences with no public/witness belief,
- secret actions known by everyone without evidence,
- relationship changes without belief or event basis,
- choices that rely on knowledge the acting character does not have,
- lies that become true facts without transition.

### 6. Check mystery and canon safety

Flag:

- forbidden mystery resolution,
- branch-local counterfactual treated as world truth,
- canon-candidate facts not held for promotion,
- promotion claims without rendered evidence when evidence is required.

Forbidden mystery resolution is an error.

### 7. Check continuation or terminal proof

Every non-terminal leaf must have at least one of:

- an eligible commitment block,
- a valid JIT continuation path,
- a meaningful write-in affordance,
- a planned pause state.

Every terminal leaf must name how high-salience debts were closed, abandoned, inherited by another branch, or intentionally left unresolved.

## Prose workflow

Only runs when `mode: prose`.

Check:

- missing prose files,
- missing receipts,
- receipt failures,
- prose inventions that have no state support,
- state changes not rendered in prose,
- repeated phrasing or tonal drift if requested.

Pending/missing prose is informational unless publication readiness is the audit focus.

## Remediation workflow

Only runs when `mode: remediation`.

For each fixable finding, create a compact remediation request:

```yaml
id: RSP-NNNN
audit_id: SAU-NNNN
finding_ids: []
repair_kind: commitment_block | turn_repair | prose_revision | promotion | branch_flag
target_records: []
target_branch: BR-NNNN
rationale: string
suggested_block_purpose: aftermath | escalation | repair | closure | transition | other
visibility: author_pool | branch_scoped
```

Do not draft full commitment blocks here. `commitment-block-authoring mode=audit_repair` consumes remediation requests.

## Report severity

Errors:

- snapshot replay mismatch,
- branch isolation violation,
- forbidden mystery resolution,
- canon assertion without promotion hold,
- impossible continuation with no terminal proof.

Warnings:

- high-salience debt without payoff route,
- belief visibility inconsistency,
- repeated commitment block use,
- prose receipt failure in publication audit,
- terminal branch with weak closure.

Info:

- missing prose on non-publication branch,
- unused but valid commitment block family,
- optional prose craft notes,
- low-salience debt still open.

## Removed from old health audit

- RSP generation is no longer bundled by default.
- Prose and structural checks are not mixed unless requested.
- Cross-story conflict scanning is opt-in.
- No `ARC_TRACE` dependency.
- No bootstrap discipline trace re-litigation unless structural root snapshot is broken.
- No broad LLM semantic audit in the default path.

## Fast default report sections

1. Summary.
2. Branch coverage.
3. Replay/hash errors.
4. Branch isolation.
5. Open debt health.
6. Belief/visibility health.
7. Mystery/canon safety.
8. Continuation/terminal status.
9. Findings.
10. Optional remediation requests.
