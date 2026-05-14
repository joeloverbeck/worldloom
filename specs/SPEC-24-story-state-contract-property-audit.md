<!-- spec-drafting-rules.md not present; using default structure + Audit Methodology + Per-Class Audit Tables + R3 Reconciliation + Deliverables + Risks & Open Questions. -->

# SPEC-24: Story State Contract — Per-Property Audit and §4 Amendment

**Status**: IMPLEMENTED-IN-CONTRACT (SCAUD-001 landed; SCAUD-002 superseded — red-bunny removed and re-bootstrapped instead of remediated; SCAUD-003 remains active)
**Supersedes**: portions of archived SPEC-23 (story-state-contract-taxonomies) where the §4 schema enumeration was incomplete.
**Companion tickets**: SCAUD-001 (apply verdicts — completed), SCAUD-002 (red-bunny cleanup — superseded; the bundle is removed and re-bootstrapped from zero rather than remediated in place), SCAUD-003 (validator strengthening — deferred; unblocked once red-bunny removal eliminated its only remaining dependency).

## Problem Statement

The story-state contract at `.claude/skills/_shared-templates/story-state-contract.md` is the canonical surface that every story-skill must conform to. Today, contract §3 lists 16 story-bundle record classes (`STENT`, `STINT`, `SF`, `BEL`, `SE`, `OBL`, `CNSQ`, `THR`, `SREL`, `STLOC`, `STOBJ`, `DA`, `BR`, `PG`, `CHC`, `SLT`), but §4 provides field schemas for only 4 of them (`BEL`, `PG`, `SE`, `SLT`). The remaining 12 classes have no canonical shape in the contract.

In parallel, the JSON schemas under `tools/validators/src/schemas/story-*.schema.json` enforce structural shape for only 3 of the 16 classes (`story-belief`, `story-page` partially, `story-storylet`). The other 13 schemas declare `{id, story_id}` required with `additionalProperties: true`, meaning the validator accepts any field set for those classes.

The result is silent drift. The red-bunny bundle at `worlds/erotica-world/stories/red-bunny/` provides the smoking gun: CHC records emitted at `PG-1` by `branching-story-bootstrap` carry 13+ legacy fields (`record_version: 2`, `target_or_action_families` plural, `choice_contract`, `choice_worthiness.{expected_state_delta, foreseeable_difference, strategic_question_answered, strong_axes, why_not_microbeat}`, `commitment_class`, `commitment_detail`, `commitment_family`, `continuation_capacity`, `likely_effects`, `strategy_cluster`, `emitted_at_branch`, `emitted_by_page`), while CHC records emitted at `PG-2` by `branching-story-turn-cycle` carry the lean 10-field shape prescribed by both SKILL.md files. Neither set matches the contract because the contract has no CHC schema. Other classes show similar drift: SF-1..8 (bootstrap) carry `certainty`, `scope.{branch_id,story_id}`, `who_knows`, `derived_from_cf`, `why_it_matters_at_opening`, while SF-9 (turn-cycle) carries the disjoint set `derived_from: []`, `trace_records`, `supersedes`. OBL-1 carries both `created_at_page` AND `introduced_at_page` as a duplicate time-of-creation pair.

A third layer of drift exists between the contract and the validators: contract §4.2's PG schema requires a `rendered_prose: {path, receipt_path}` nested block, while `story-page.schema.json` requires `prose_plan_path` (a top-level field absent from §4.2) and permits an optional top-level `prose_path` (also absent from §4.2). Both SKILL.md files document this cross-layer mismatch as "legacy until reconciliation" and emit both forms. The `rendered_prose:` block is consumed by nothing — every PG record in red-bunny carries it as a dead write.

The contract's own §2 Schema-Minimalism Doctrine commits to keeping every field load-bearing — "directly consumed by a validation gate, a replay primitive, a predicate, a fork operation, or recorded audit-trail discipline." That doctrine is currently being silently violated for 12 of 16 record classes because there is no §4 schema to enforce it against, and for at least one class (`CHC`) the violation is structural: even the validator schema permits `additionalProperties: true`, so author-discretion fills the gap and the gap fills with whatever the authoring session produces.

This spec audits every property of every record class against a five-criterion load-bearing rubric, produces verdicts (`keep` / `rename` / `replace` / `drop` / `promote` / `reconcile`), and writes the resulting §4 amendment shape inline so that SCAUD-001 can mechanically apply it. The one currently-affected user bundle (red-bunny) carried only 2 pages, so rather than supersession-cleanup via the patch engine (originally scoped as SCAUD-002), the bundle is removed and re-bootstrapped from zero against the amended contract. SCAUD-003 (deferred) tightens the 13 minimal JSON schemas to match the amended contract.

### Key design decisions

- **Considered methodology-only spec; chose verdicts-in-spec** because verdict-drift between methodology and implementation is the exact pathology motivating this work. Author-discretion at implementation time is what produced the current drift; the spec must own the verdicts.
- **Considered separate triage doc; chose single umbrella spec** because the audit decisions ARE the spec content, not adjacent triage. The triage file at `docs/triage/` carries only the deliverable index and verdict summary, not the audit tables themselves.
- **Considered tightening JSON schemas in-spec; chose deferred ticket (SCAUD-003)** because the contract is the canonical source and the validator-side mechanism follows the canon. SCAUD-001 lands the contract; SCAUD-003 lands the mechanism that enforces it. Doing both in one ticket would couple two distinct review surfaces.
- **Considered preserving all duplicate fields for backward compatibility; chose append-only-supersession cleanup** because Hook 3 already forbids in-place mutation of `_source/*.yaml` records. Tolerance of duplicates encourages future drift and inflates retrieval-time tokens with no payoff.
- **Considered re-auditing already-defined classes (BEL/PG/SE/SLT); chose yes** because PG's dead-write `rendered_prose:` block survives only via a re-audit blind spot. The audit treats every class equally regardless of current contract coverage.
- **Considered promoting `target_or_action_families` (plural) as the canonical CHC action-family field; chose yes** because plural list semantics align with the precedent set by `PG.visible_affordances[].action_families` (which is already plural in contract §4.2) and richer authorial signal is structurally superior to the singular form even though only the singular form is currently validator-enforced.

## Approach

A per-property audit of all 16 story-bundle record classes against a five-criterion load-bearing rubric produces six verdict types. The audit output is canonical YAML schemas matching the format of contract §4.1 / §4.2 / §4.3 / §4.4, ready to be copied into `story-state-contract.md` by SCAUD-001. The PG §4.2 reconciliation (§R3 below) is handled as a special case because it crosses the contract/validator boundary.

Implementation tickets execute mechanically against the verdicts:
- SCAUD-001 rewrites `story-state-contract.md` §4 and updates skill SKILL.md prescriptions to match.
- SCAUD-002 (superseded) was to clean red-bunny by superseding drifted CHC and OBL records; with only 2 pages in the bundle, red-bunny is instead removed and re-bootstrapped from zero against the amended contract.
- SCAUD-003 (deferred) tightens 13 JSON schemas + 3 strict-schema re-audits.

## Audit Methodology

### Five-criterion load-bearing rubric

A property is **load-bearing** iff it passes criterion 1 OR a combination of 2-5 with explicit citation. A property failing all five is dropped.

1. **Validator-enforcement test**: is the field referenced by a JSON schema `required` entry, a `properties` regex, a structural validator (e.g., `recursive-reference-closure.ts`), a hash-payload input (`computePgStateHash`, `computePlanHash`), or a context-packet field?
2. **Skill-prescription test**: is the field prescribed by a current SKILL.md? (A field prescribed by a deleted skill is legacy, not load-bearing.)
3. **Predicate-DSL test**: is the field consumed by contract §5's closed predicate DSL?
4. **Replay/snapshot test**: is the field needed to reconstruct branch-local state at a `PG` snapshot, or to evaluate `SLT.preconditions`, or to drive `SE.state_delta`?
5. **Audit-trail test**: is the field needed for supersession lineage, provenance attribution, or post-hoc auditability per FOUNDATIONS Rule 5 (No Consequence Evasion) or Rule 6 (No Silent Retcons)?

### Verdict types

- `keep` — load-bearing in current shape; appears in amended §4 as-is.
- `rename` — load-bearing but name is wrong (typically a duplicate-field collapse to the better name).
- `replace` — load-bearing but current shape is inferior; better form replaces it (e.g., singular scalar → plural list when affordances are naturally multi-valued).
- `drop` — fails all five criteria; removed from contract.
- `promote` — currently absent from contract but appearing in skill output AND load-bearing; promoted into §4.
- `reconcile` — contract and validator disagree; spec picks the winning shape and the deferred ticket aligns the loser.

### Audit evidence sources

For every class, the audit cross-checks four sources:
- `story-state-contract.md` §4 (where defined).
- `tools/validators/src/schemas/story-<class>.schema.json` (always present, often minimal).
- The current SKILL.md prescriptions in `.claude/skills/branching-story-bootstrap/`, `.claude/skills/branching-story-turn-cycle/`, and (where applicable) `commitment-block-authoring`, `branching-story-prose-attach`, `branching-story-health-audit`, `story-fact-promotion-to-canon`, `story-promotion-closeout`.
- Actual wild records under `worlds/erotica-world/stories/red-bunny/_source/<class>/*.yaml` (the only currently-affected user bundle).

For classes never emitted in the wild (e.g., `DA` is absent from red-bunny), the audit falls back to skill-prescription evidence only and tags verdicts with `evidence: skill-prescription-only`.

## R3 Reconciliation: PG `rendered_prose` vs `prose_plan_path`

This subsection is called out before the per-class tables because it crosses the contract/validator boundary and the decision propagates into the PG §4.2 amended schema.

| Field | Today's state | Verdict | Rationale |
|---|---|---|---|
| `prose_plan_path` (top-level) | Required by `story-page.schema.json:14`; documented as "legacy" in both SKILL.md files (bootstrap line 250, turn-cycle line 293); written to every PG record in red-bunny. | **promote → canonical** | Schema-mandatory (criterion 1); semantically meaningful (the plan path is the address the renderer reads); cannot be removed without breaking the validator and every existing PG record. |
| `prose_path` (top-level) | Optional in `story-page.schema.json`; nullable until prose attaches; written as `null` in every PG record in red-bunny. | **promote → canonical** | Schema-validated when present (criterion 1); semantically distinct from `prose_plan_path` (one is the plan, the other is the rendered prose). Honors the §4a Plan-Authority Boundary by leaving prose nullable. |
| `prose_receipt_path` (proposed new top-level) | Today buried as `rendered_prose.receipt_path`; never consumed. | **promote → canonical, renamed** | Semantically parallel to `prose_path`; receipt-attachment skill writes here. Top-level placement matches `prose_path` shape; the nested form is a relic of the never-completed `rendered_prose:` redesign. |
| `rendered_prose` (nested block) | Defined in contract §4.2 only; consumed by nothing; written as `{path: null, receipt_path: null}` in every PG record. | **drop** | Dead writes. Fails all five criteria. Replaced semantically by the three top-level fields above. |

Net effect on PG §4.2: the `rendered_prose:` nested block is removed; three top-level fields (`prose_plan_path`, `prose_path`, `prose_receipt_path`) replace it. The §4.2a hash-payload exclusion language updates accordingly: `prose_path` and `prose_receipt_path` are excluded from the canonical state-hash payload (they are mutable publication receipts, not fork state); `prose_plan_path` is INCLUDED (it is a stable address tied to `plan_hash` and to the page's fork identity).

The full amended §4.2 schema appears in the §PG subsection below.

## Per-Class Audit Tables

Each class subsection has the structure: **(a) Current-state inventory**, **(b) Audit verdict table**, **(c) Amended §4 schema block**, **(d) Migration notes** (where applicable).

Properties are ordered: identity (`id`, `story_id`, supersession), provenance (`created_at_page`), then class-specific fields in natural authoring order.

---

### §4.5a STENT (story-local entity)

**Source class**: `_source/entities/STENT-<integer>.yaml`. Mirrors a world-level `CHAR` dossier into the bundle for branch-local entity state. May also be a wholly story-local entity with no `bound_char_id`.

#### (a) Current-state inventory

| Property | Contract §4 | JSON schema | Skill prescription | Observed in wild |
|---|---|---|---|---|
| `id` | not defined | yes (required, `^STENT-[0-9]+$`) | yes (allocator) | yes |
| `story_id` | not defined | yes (required, `^STORY-[0-9]+$`) | yes | yes |
| `created_at_page` | not defined | no | yes (bootstrap Phase 6) | yes |
| `supersedes` | not defined | no | implicit (Phase 3 turn-cycle) | not yet observed; mandatory shape per §3 |
| `display_name` | not defined | no | yes (bootstrap Phase 6) | yes |
| `bound_char_id` | not defined | no | yes (bootstrap Phase 3) | yes (CHAR-0005 etc.) |
| `role_in_story` (list) | §4.4b closed taxonomy | no | yes (bootstrap Phase 3) | yes |
| `notes` | not defined | no | no (authorial) | yes (free-form prose) |

#### (b) Audit verdict table

| Property | Criteria passed | Cited consumer | Verdict | Action |
|---|---|---|---|---|
| `id` | 1, 4, 5 | every patch op; index node id; supersession lineage | keep | unchanged |
| `story_id` | 1, 5 | every patch op; bundle scoping | keep | unchanged |
| `created_at_page` | 1, 4, 5 | `recursive-reference-closure.ts` branch-scope check; supersession provenance | keep | promote to §4 required |
| `supersedes` | 1, 5 | contract §3 universal supersession discipline; replay equality | keep | promote to §4 as nullable default null |
| `display_name` | 2, 5 | skill prescription; INDEX.md cast roster table | keep | promote to §4 required |
| `bound_char_id` | 2, 5 | bootstrap Phase 3; story-fact-promotion-to-canon (CHAR-binding evidence) | keep | promote to §4 as optional (story-local-only entities omit it) |
| `role_in_story` | 2, 3 | bootstrap Phase 3 + closed taxonomy in §4.4b; INDEX.md role display | keep | promote to §4 required; reference §4.4b for enum |
| `notes` | none (authorial free-form) | nowhere; not validator, not skill, not predicate, not replay | **drop** | removed from canonical schema; authorial notes can live in `display_name` context or in the page plan if load-bearing |

#### (c) Amended §4.5a STENT schema

```yaml
id: STENT-<integer>*
story_id: STORY-<integer>*
created_at_page: PG-<integer>*
supersedes: STENT-<integer> | null            # default null
display_name: string*                          # cast roster label
bound_char_id: CHAR-<integer> | null          # null only for wholly story-local entities
role_in_story: [<role>]*                       # closed list per §4.4b; one or more
```

#### (d) Migration notes

Red-bunny STENT-1, STENT-2, STENT-3 carry `notes` (free-form prose), drifting from the amended schema. With red-bunny removed and re-bootstrapped from zero, no record cleanup is needed; the re-bootstrapped bundle conforms by construction (STENT records authored after SCAUD-001 omit `notes`).

---

### §4.5b STINT (intention)

**Source class**: `_source/intentions/STINT-<integer>.yaml`. An entity's active goal-state at a given page.

#### (a) Current-state inventory

| Property | Contract §4 | JSON schema | Skill prescription | Observed in wild |
|---|---|---|---|---|
| `id` | not defined | yes (required) | yes | yes |
| `story_id` | not defined | yes (required) | yes | yes |
| `created_at_page` | not defined | no | yes (Phase 6 bootstrap; Phase 3 turn-cycle) | yes |
| `supersedes` | not defined | no | implicit (turn-cycle Phase 3) | yes (STINT-4 only) |
| `holder` | not defined | no | yes (Phase 3) | yes (STENT-<integer> only) |
| `intent` | not defined | no | yes | yes (free-form prose) |
| `urgency` | not defined | no | yes (bootstrap Phase 4 implicit) | yes (`high` observed) |
| `expires_when` | not defined | no | yes (implicit) | yes (free-form prose) |

#### (b) Audit verdict table

| Property | Criteria passed | Cited consumer | Verdict | Action |
|---|---|---|---|---|
| `id` | 1, 4, 5 | patch ops; index | keep | unchanged |
| `story_id` | 1, 5 | patch ops; bundle scoping | keep | unchanged |
| `created_at_page` | 1, 4, 5 | branch-scope check; replay; supersession provenance | keep | promote required |
| `supersedes` | 1, 5 | append-only discipline §3; replay equality | keep | promote nullable default null |
| `holder` | 2, 4 | predicate `intention_active(STINT-<integer>)` implies STINT exists; skill prescription | keep | promote required; pattern `STENT-<integer>` |
| `intent` | 2, 5 | skill prescription; supersession provenance (closed-when text) | keep | promote required free-form string |
| `urgency` | 2, 5 | skill prescription; not in any current validator | keep | promote required enum `low | medium | high` (matching `SLT.saliency.urgency` for taxonomy consistency) |
| `expires_when` | 2, 5 | skill prescription as supersession trigger; consumed by author judgment in Phase 3 | keep | promote required free-form string |

#### (c) Amended §4.5b STINT schema

```yaml
id: STINT-<integer>*
story_id: STORY-<integer>*
created_at_page: PG-<integer>*
supersedes: STINT-<integer> | null            # default null
holder: STENT-<integer>*
intent: string*                                # natural-language goal statement
urgency: low | medium | high*
expires_when: string*                          # natural-language supersession trigger
```

#### (d) Migration notes

Red-bunny STINT-1..3 (bootstrap) omit `supersedes` entirely; STINT-4 (turn-cycle) includes `supersedes: null`. The amended schema makes it explicit-nullable-default-null. STINT-1..3 currently validate (additionalProperties:true tolerates omission) and do not require cleanup — the field is semantically absent for non-superseding records.

---

### §4.5c SF (story-local fact)

**Source class**: `_source/facts/SF-<integer>.yaml`. What is true in the branch (not what is believed; see `BEL`).

#### (a) Current-state inventory

| Property | Contract §4 | JSON schema | Skill prescription | Observed in wild |
|---|---|---|---|---|
| `id` | not defined | yes (required) | yes | yes |
| `story_id` | not defined | yes (required) | yes | yes |
| `created_at_page` | not defined | no | yes (bootstrap Phase 2; turn-cycle Phase 3) | yes |
| `supersedes` | not defined | no | implicit | yes (SF-9 only) |
| `statement` | not defined | no | yes | yes (free-form prose) |
| `certainty` | not defined | no | yes (bootstrap Phase 2) | yes (bootstrap-only; SF-1..8) |
| `scope.branch_id` | not defined | no | yes (bootstrap Phase 2) | yes (bootstrap-only) |
| `scope.story_id` | not defined | no | yes (bootstrap Phase 2) | yes (bootstrap-only; redundant with top-level story_id) |
| `who_knows` | not defined | no | yes (bootstrap Phase 2) | yes (bootstrap-only) |
| `derived_from_cf` | not defined | no | yes (bootstrap Phase 2; mirror discipline) | yes (bootstrap-only) |
| `why_it_matters_at_opening` | not defined | no | yes (bootstrap Phase 2) | yes (bootstrap-only) |
| `derived_from` (list) | not defined | no | no | yes (turn-cycle-only; SF-9 with empty list) |
| `trace_records` | not defined | no | no | yes (turn-cycle-only) |

#### (b) Audit verdict table

| Property | Criteria passed | Cited consumer | Verdict | Action |
|---|---|---|---|---|
| `id` | 1, 4, 5 | patch ops; predicate `fact_true(SF-<integer>)` (§5); replay | keep | unchanged |
| `story_id` | 1, 5 | patch ops; bundle scoping | keep | unchanged |
| `created_at_page` | 1, 4, 5 | branch-scope check; replay; supersession provenance | keep | promote required |
| `supersedes` | 1, 5 | append-only discipline §3 | keep | promote nullable default null |
| `statement` | 2, 4 | skill prescription; replay (the fact content) | keep | promote required free-form string |
| `certainty` | 2 | bootstrap Phase 2 prescription only; no validator, no predicate, no replay primitive | **drop** | removed; certainty belongs on `BEL` (which already has `confidence` field), not on `SF` (which records what IS true, not what's believed) |
| `scope.branch_id` | 4, 5 | branch isolation gate 4; replay | rename | **collapse with top-level**: there is no scope-vs-record distinction worth carrying. `SF` records are always scoped to the bundle (top-level `story_id`) and the branch they were created on (derivable from `created_at_page.branch_id`). Drop the nested `scope.*` block entirely. |
| `scope.story_id` | none (redundant with top-level) | nowhere | **drop** | duplicate of top-level `story_id` |
| `who_knows` | 2 | bootstrap Phase 2 prescription; predicate-DSL test file referenced as helper but no live consumer | **drop** | replaced by `BEL` records — who knows what a fact is true is the holder-axis on `BEL`, not a property of the fact itself. Documentation-only field violates §2 Schema-Minimalism. |
| `derived_from_cf` | 2, 5 | bootstrap Phase 2 mirror discipline; story-fact-promotion-to-canon evidence (criterion 5 audit trail) | keep | promote optional (only present when SF mirrors a world CF) |
| `why_it_matters_at_opening` | none | nowhere | **drop** | authorial notes; violates §2 |
| `derived_from` (empty list) | none | nowhere | **drop** | turn-cycle invented; never populated; redundant with `trace_records` if anything |
| `trace_records` | 2, 5 | turn-cycle skill prescription; supersession provenance | rename/keep | **promote as `derived_from` but with semantics — list of record ids (SE, SF, BEL, STENT, etc.) the fact's truth depends on**; collapse the bootstrap-era `derived_from_cf` and the turn-cycle-era `trace_records` into a single `derived_from: [<record_id>]` field where each entry may be `CF-<integer>` (for mirrored facts) or any story-local record id (for branch-derived facts) |

#### (c) Amended §4.5c SF schema

```yaml
id: SF-<integer>*
story_id: STORY-<integer>*
created_at_page: PG-<integer>*
supersedes: SF-<integer> | null               # default null
statement: string*                             # natural-language branch-local truth
derived_from: [CF-<integer> | <story-local record id>]   # default []; non-empty for mirrored or derived facts
```

#### (d) Migration notes

Red-bunny SF-1..8 (bootstrap) carry the dropped fields (`certainty`, `scope.*`, `who_knows`, `why_it_matters_at_opening`); SF-9 (turn-cycle) carries `derived_from: []` and `trace_records`. Both forms drift from the amended schema. With red-bunny removed and re-bootstrapped from zero, no record cleanup is needed; new SF records authored after SCAUD-001 conform by construction.

---

### §4.5d BEL (belief)

Already defined at contract §4.1. Re-audit for completeness.

#### (a) Current-state inventory

13 fields per contract §4.1, matching `story-belief.schema.json` exactly (strict schema, `additionalProperties: false`).

#### (b) Audit verdict table

All 13 fields pass criterion 1 (validator-enforced) plus criteria 2-5 as cited in §4.1. **All keep, no changes.** Re-audit confirms §4.1 is the model case: contract, validator, and skill prescriptions are aligned; the schema is minimal-but-load-bearing.

#### (c) Amended §4.5d / §4.1 BEL schema

Unchanged from current §4.1. Renumber §4.1 → §4.5d in the amended contract for ordering consistency with the rest of §4.5 per-class subsections, OR keep §4.1 numbering and reorder the other subsections — SCAUD-001 picks one numbering convention.

---

### §4.5e SE (story event)

Already defined at contract §4.3. Re-audit.

#### (a) Current-state inventory

| Property | Contract §4.3 | JSON schema | Skill prescription | Observed in wild |
|---|---|---|---|---|
| `id` | yes (required) | yes (required) | yes | yes |
| `story_id` | yes (required) | yes (required) | yes | yes |
| `created_at_page` | yes (required) | no | yes | yes |
| `parent_page_id` | yes (required, nullable) | no | yes | yes |
| `event_kind` | yes (required, enum) | yes (required, enum) | yes | yes |
| `actor` | yes (required) | no | yes | yes |
| `targets` | yes (optional list) | no | yes | yes |
| `outcome_route` | yes (required, enum) | no | yes | yes |
| `world_logic_rationale` | yes (required) | no | yes | yes |
| `state_delta.{create,supersede,close}` | yes | no | yes | yes |
| `promotion_claims` | yes (optional list of {source_record, authority}) | no | yes | yes (empty list) |

#### (b) Audit verdict table

All 11 properties pass criterion 1 OR 2+4+5. **All keep, no changes** at the contract level. SCAUD-003 strengthens `story-event.schema.json` to enforce the additional fields (criterion 1 promotion).

#### (c) Amended §4.5e / §4.3 SE schema

Unchanged from current §4.3. Same numbering note as §4.5d above.

---

### §4.5f OBL (obligation)

**Source class**: `_source/obligations/OBL-<integer>.yaml`. Promised, owed, or required behavior that constrains future choice.

#### (a) Current-state inventory

| Property | Contract §4 | JSON schema | Skill prescription | Observed in wild |
|---|---|---|---|---|
| `id` | not defined | yes (required) | yes | yes |
| `story_id` | not defined | yes (required) | yes | yes |
| `created_at_page` | not defined | no | yes (bootstrap Phase 4) | yes (OBL-1) |
| `introduced_at_page` | not defined | yes (consumed as fallback by `recursive-reference-closure.ts:192`) | no | yes (OBL-1; duplicate of `created_at_page`) |
| `supersedes` | not defined | no | implicit | not observed yet |
| `status` | not defined | no | yes (bootstrap Phase 4 implicit) | yes (`open`) |
| `obligation_kind` | not defined | no | yes | yes (`informal_dependency`) |
| `description` | not defined | no | yes | yes |
| `owed_by` | not defined | no | yes | yes (STENT-2) |
| `owed_to` | not defined | no | yes | yes (STENT-3) |
| `trigger_to_close` | not defined | no | yes | yes |
| `predicate `obligation_open(OBL-<integer>)`` consumer | n/a | n/a | §5 | n/a (predicate consumed in SLT preconditions) |

#### (b) Audit verdict table

| Property | Criteria passed | Cited consumer | Verdict | Action |
|---|---|---|---|---|
| `id` | 1, 3, 4, 5 | patch ops; predicate `obligation_open` (§5); replay | keep | unchanged |
| `story_id` | 1, 5 | patch ops | keep | unchanged |
| `created_at_page` | 1, 4, 5 | branch-scope check; replay; supersession provenance | **keep** (this is the canonical form) | promote required |
| `introduced_at_page` | 1 (fallback only) | `recursive-reference-closure.ts:192` reads it WHEN `created_at_page` is absent | **rename → drop** | the validator fallback exists ONLY because earlier authoring sessions emitted `introduced_at_page` instead of `created_at_page`. With the amended schema requiring `created_at_page`, the fallback becomes dead code; SCAUD-003 removes it. The duplicate-field on OBL-1 disappears with the red-bunny removal; the re-bootstrapped bundle's OBL records carry only `created_at_page`. |
| `supersedes` | 1, 5 | §3 discipline | keep | promote nullable default null |
| `status` | 2, 3, 4 | predicate `obligation_open` (open iff `status: open`); replay | keep | promote required enum `open | closed | escalated | abandoned | transferred` |
| `obligation_kind` | 2, 5 | bootstrap Phase 4 prescription; INDEX.md categorization | keep | promote required free-form string (open vocabulary; not a closed enum because obligation kinds vary by world) |
| `description` | 2, 5 | skill prescription; INDEX.md row content | keep | promote required free-form string |
| `owed_by` | 2, 4, 5 | death/incapacity reconciliation (turn-cycle Phase 3); replay | keep | promote required `STENT-<integer> | group:<name> | public | null` (mirror BEL holder shape; `null` for obligations owed by no specific party) |
| `owed_to` | 2, 4, 5 | death/incapacity reconciliation; replay | keep | promote required, same shape as `owed_by` |
| `trigger_to_close` | 2, 5 | skill prescription as supersession-to-closed trigger | keep | promote required free-form string |

#### (c) Amended §4.5f OBL schema

```yaml
id: OBL-<integer>*
story_id: STORY-<integer>*
created_at_page: PG-<integer>*
supersedes: OBL-<integer> | null              # default null
status: open | closed | escalated | abandoned | transferred*
obligation_kind: string*                       # open vocabulary
description: string*
owed_by: STENT-<integer> | group:<name> | public | null*
owed_to: STENT-<integer> | group:<name> | public | null*
trigger_to_close: string*                      # natural-language supersession trigger
```

#### (d) Migration notes

Red-bunny OBL-1 carries both `created_at_page: PG-1` and `introduced_at_page: PG-1` (identical values). With red-bunny removed and re-bootstrapped from zero, no record cleanup is needed. SCAUD-003 removes the `introduced_at_page` fallback from `recursive-reference-closure.ts:192`: with red-bunny gone, no record relies on the fallback, so it is unconditionally dead code.

---

### §4.5g CNSQ (consequence)

**Source class**: `_source/consequences/CNSQ-<integer>.yaml`. Realized or pending effect from a prior event or state.

#### (a) Current-state inventory

| Property | Contract §4 | JSON schema | Skill prescription | Observed in wild |
|---|---|---|---|---|
| `id` | not defined | yes (required) | yes | yes |
| `story_id` | not defined | yes (required) | yes | yes |
| `created_at_page` | not defined | no | yes | yes |
| `supersedes` | not defined | no | implicit | not observed yet |
| `status` | not defined | no | yes (implicit) | yes (`pending`) |
| `consequence_kind` | not defined | no | yes | yes (`physical_injury`) |
| `description` | not defined | no | yes | yes |
| `resolves_when` | not defined | no | yes | yes |
| `trace_records` | not defined | no | yes (turn-cycle Phase 3) | yes (list of source records) |

#### (b) Audit verdict table

| Property | Criteria passed | Cited consumer | Verdict | Action |
|---|---|---|---|---|
| `id` | 1, 3, 4, 5 | patch ops; predicate `consequence_pending`; replay | keep | unchanged |
| `story_id` | 1, 5 | patch ops | keep | unchanged |
| `created_at_page` | 1, 4, 5 | branch scope; replay; supersession | keep | promote required |
| `supersedes` | 1, 5 | §3 discipline | keep | promote nullable default null |
| `status` | 2, 3, 4 | predicate `consequence_pending` (pending iff `status: pending`); replay | keep | promote required enum `pending | resolved | escalated | abandoned` |
| `consequence_kind` | 2, 5 | skill prescription; INDEX.md categorization | keep | promote required free-form string (open vocabulary) |
| `description` | 2, 5 | skill prescription; INDEX.md | keep | promote required free-form string |
| `resolves_when` | 2, 5 | skill prescription as supersession-to-resolved trigger | keep | promote required free-form string |
| `trace_records` | 2, 5 | skill prescription; supersession-lineage audit trail | rename | **rename to `derived_from`** to match SF / CNSQ / THR / SREL convergence on a single provenance field name; list of record ids that caused the consequence |

#### (c) Amended §4.5g CNSQ schema

```yaml
id: CNSQ-<integer>*
story_id: STORY-<integer>*
created_at_page: PG-<integer>*
supersedes: CNSQ-<integer> | null             # default null
status: pending | resolved | escalated | abandoned*
consequence_kind: string*                      # open vocabulary
description: string*
resolves_when: string*                         # natural-language supersession trigger
derived_from: [<record_id>]                    # default []; record ids that caused this consequence
```

#### (d) Migration notes

Red-bunny CNSQ-1 and CNSQ-2 carry `trace_records` (turn-cycle convention). With red-bunny removed and re-bootstrapped from zero, no record cleanup is needed; new records after SCAUD-001 use `derived_from`.

---

### §4.5h THR (thread)

**Source class**: `_source/threads/THR-<integer>.yaml`. An active narrative tension tracked across pages.

#### (a) Current-state inventory

| Property | Contract §4 | JSON schema | Skill prescription | Observed in wild |
|---|---|---|---|---|
| `id` | not defined | yes (required) | yes | yes |
| `story_id` | not defined | yes (required) | yes | yes |
| `created_at_page` | not defined | no | yes | yes |
| `supersedes` | not defined | no | implicit | not observed yet |
| `status` | not defined | no | yes (implicit) | yes (`active`) |
| `title` | not defined | no | yes | yes |
| `summary` | not defined | no | yes | yes |
| `urgency` | not defined | no | yes | yes (`high`) |
| `trace_records` | not defined | no | yes | yes |

#### (b) Audit verdict table

| Property | Criteria passed | Cited consumer | Verdict | Action |
|---|---|---|---|---|
| `id` | 1, 3, 4, 5 | patch ops; predicate `thread_active`; replay | keep | unchanged |
| `story_id` | 1, 5 | patch ops | keep | unchanged |
| `created_at_page` | 1, 4, 5 | branch scope; replay | keep | promote required |
| `supersedes` | 1, 5 | §3 | keep | promote nullable default null |
| `status` | 2, 3, 4 | predicate `thread_active` (active iff `status: active`); replay | keep | promote required enum `active | resolved | escalated | abandoned` |
| `title` | 2, 5 | INDEX.md row content | keep | promote required short string |
| `summary` | 2, 5 | INDEX.md row content; skill prescription | keep | promote required free-form string |
| `urgency` | 2, 5 | skill prescription; INDEX.md prioritization | keep | promote required enum `low | medium | high` (taxonomy consistency with STINT / SLT) |
| `trace_records` | 2, 5 | skill prescription; audit trail | rename | **rename to `derived_from`** (taxonomy consistency) |

#### (c) Amended §4.5h THR schema

```yaml
id: THR-<integer>*
story_id: STORY-<integer>*
created_at_page: PG-<integer>*
supersedes: THR-<integer> | null              # default null
status: active | resolved | escalated | abandoned*
title: string*
summary: string*
urgency: low | medium | high*
derived_from: [<record_id>]                    # default []
```

#### (d) Migration notes

Red-bunny THR-1..3 carry `trace_records`. With red-bunny removed and re-bootstrapped from zero, no record cleanup is needed; new records use `derived_from`.

---

### §4.5i SREL (relationship)

**Source class**: `_source/relationships/SREL-<integer>.yaml`. Directed or symmetric relation between entities along a closed taxonomy axis.

#### (a) Current-state inventory

| Property | Contract §4 | JSON schema | Skill prescription | Observed in wild |
|---|---|---|---|---|
| `id` | not defined | yes (required) | yes | yes |
| `story_id` | not defined | yes (required) | yes | yes |
| `created_at_page` | not defined | no | yes | yes |
| `supersedes` | not defined | no | implicit | not observed yet |
| `axis` | §4.4b closed taxonomy | no | yes | yes (`attention`) |
| `participants` (list) | not defined | no | yes | yes |
| `direction` | not defined | no | yes | yes (`STENT-1 → STENT-2`) |
| `magnitude` | not defined | no | yes (implicit) | yes (`extreme`) |
| `valence` | not defined | no | yes (implicit) | yes (`asymmetric`) |
| `description` | not defined | no | yes | yes |
| `trace_records` | not defined | no | yes | yes |
| Predicate `relationship_axis(SREL-<integer>, axis, comparator, value)` consumer | n/a | n/a | §5 | n/a |

#### (b) Audit verdict table

| Property | Criteria passed | Cited consumer | Verdict | Action |
|---|---|---|---|---|
| `id` | 1, 3, 4, 5 | patch ops; predicate `relationship_axis`; replay | keep | unchanged |
| `story_id` | 1, 5 | patch ops | keep | unchanged |
| `created_at_page` | 1, 4, 5 | branch scope; replay | keep | promote required |
| `supersedes` | 1, 5 | §3; death/incapacity reconciliation (turn-cycle Phase 3) | keep | promote nullable default null |
| `axis` | 1, 3 | predicate `relationship_axis(SREL, axis, ...)`; §4.4b closed list | keep | promote required; reference §4.4b enum |
| `participants` | 2, 3, 4 | predicate consumer needs to know who; replay; INDEX.md display | keep | promote required `[STENT-<integer>]` 2-item list |
| `direction` | 2, 5 | skill prescription; replay (asymmetric relationships have direction) | keep | promote required string `"STENT-<from> → STENT-<to>"` or `bidirectional` |
| `magnitude` | 2, 3 | predicate `relationship_axis(SREL, axis, >=, value)` — magnitude IS the value compared; replay | rename | **rename to `value` and constrain to enum**: `none | trace | low | medium | high | extreme` (closed taxonomy enables predicate comparators to operate) |
| `valence` | 2, 5 | skill prescription; semantic disambiguation (asymmetric vs mutual vs adversarial) | keep | promote required enum `symmetric | asymmetric | bidirectional | adversarial` |
| `description` | 2, 5 | INDEX.md; skill prescription | keep | promote required free-form string |
| `trace_records` | 2, 5 | skill prescription | rename | **rename to `derived_from`** (taxonomy consistency) |

#### (c) Amended §4.5i SREL schema

```yaml
id: SREL-<integer>*
story_id: STORY-<integer>*
created_at_page: PG-<integer>*
supersedes: SREL-<integer> | null             # default null
axis: <axis>*                                   # §4.4b closed enum
participants: [STENT-<integer>]*                # exactly 2 participants
direction: string*                              # "STENT-<from> → STENT-<to>" | "bidirectional"
value: none | trace | low | medium | high | extreme*
valence: symmetric | asymmetric | bidirectional | adversarial*
description: string*
derived_from: [<record_id>]                    # default []
```

#### (d) Migration notes

Red-bunny SREL-1, SREL-2 carry `magnitude: extreme` (matches new `value` enum semantically) and `trace_records`. With red-bunny removed and re-bootstrapped from zero, no record cleanup is needed.

---

### §4.5j STLOC (story-local location)

**Source class**: `_source/locations/STLOC-<integer>.yaml`. A spatial referent grounded in world canon (`bound_ent: ENT-<integer>`) or wholly story-local.

#### (a) Current-state inventory

| Property | Contract §4 | JSON schema | Skill prescription | Observed in wild |
|---|---|---|---|---|
| `id` | not defined | yes (required) | yes | yes |
| `story_id` | not defined | yes (required) | yes | yes |
| `created_at_page` | not defined | no | yes | yes |
| `supersedes` | not defined | no | implicit | not observed yet |
| `label` | not defined | no | yes | yes |
| `description` | not defined | no | yes | yes |
| `bound_ent` | not defined | no | yes (Phase 4 bootstrap) | yes (`ENT-0002`) |
| `open_at_opening` | not defined | no | no | yes (bootstrap-only; `true`) |
| Predicate `location(STENT, STLOC)` consumer | n/a | n/a | §5 | n/a |

#### (b) Audit verdict table

| Property | Criteria passed | Cited consumer | Verdict | Action |
|---|---|---|---|---|
| `id` | 1, 3, 4 | patch ops; predicate `location(STENT, STLOC)`; replay | keep | unchanged |
| `story_id` | 1, 5 | patch ops | keep | unchanged |
| `created_at_page` | 1, 4, 5 | branch scope; replay | keep | promote required |
| `supersedes` | 1, 5 | §3 | keep | promote nullable default null |
| `label` | 2, 5 | INDEX.md; affordance display | keep | promote required short string |
| `description` | 2, 5 | INDEX.md; page plan context (§6) | keep | promote required free-form string |
| `bound_ent` | 2, 5 | bootstrap Phase 4 prescription; world-canon grounding evidence | keep | promote optional `ENT-<integer> | null` (null for wholly story-local locations) |
| `open_at_opening` | none | nowhere; not validator, not skill prescription beyond bootstrap, not predicate, not replay | **drop** | authorial relic; the location is "open" by virtue of being in `state_snapshot.active_records.STLOC` |

#### (c) Amended §4.5j STLOC schema

```yaml
id: STLOC-<integer>*
story_id: STORY-<integer>*
created_at_page: PG-<integer>*
supersedes: STLOC-<integer> | null            # default null
label: string*                                  # short display name
description: string*                            # natural-language description
bound_ent: ENT-<integer> | null               # null for wholly story-local locations
```

#### (d) Migration notes

Red-bunny STLOC-1, STLOC-2 carry `open_at_opening: true`. With red-bunny removed and re-bootstrapped from zero, no record cleanup is needed; new records omit the field.

---

### §4.5k STOBJ (story-local object)

**Source class**: `_source/objects/STOBJ-<integer>.yaml`. A movable or grounded object referenced by affordances or possession state.

#### (a) Current-state inventory

| Property | Contract §4 | JSON schema | Skill prescription | Observed in wild |
|---|---|---|---|---|
| `id` | not defined | yes (required) | yes | yes |
| `story_id` | not defined | yes (required) | yes | yes |
| `created_at_page` | not defined | no | yes | yes |
| `supersedes` | not defined | no | implicit | not observed yet |
| `label` | not defined | no | yes | yes |
| `description` | not defined | no | yes | yes |
| `owner` | not defined | no | yes | yes |
| `current_location` | not defined | no | yes | yes |
| Predicate `object_accessible(STENT, STOBJ)` consumer | n/a | n/a | §5 | n/a |

#### (b) Audit verdict table

| Property | Criteria passed | Cited consumer | Verdict | Action |
|---|---|---|---|---|
| `id` | 1, 3, 4 | patch ops; predicate `object_accessible`; replay | keep | unchanged |
| `story_id` | 1, 5 | patch ops | keep | unchanged |
| `created_at_page` | 1, 4, 5 | branch scope; replay | keep | promote required |
| `supersedes` | 1, 5 | §3; turn-cycle Phase 3 object-moved supersession | keep | promote nullable default null |
| `label` | 2, 5 | INDEX.md; affordance grounding | keep | promote required short string |
| `description` | 2, 5 | INDEX.md; page plan context | keep | promote required free-form string |
| `owner` | 2, 3, 4 | predicate `object_accessible(STENT, STOBJ)` implies owner-or-accessor binding; replay; turn-cycle Phase 3 transfer reconciliation | keep | promote required `STENT-<integer> | group:<name> | public | null` |
| `current_location` | 2, 3, 4 | predicate `object_accessible`; replay; turn-cycle Phase 3 movement | keep | promote required `STLOC-<integer> | offstage | unknown | carried_by:STENT-<integer>` |

#### (c) Amended §4.5k STOBJ schema

```yaml
id: STOBJ-<integer>*
story_id: STORY-<integer>*
created_at_page: PG-<integer>*
supersedes: STOBJ-<integer> | null            # default null
label: string*                                  # short display name
description: string*                            # natural-language description
owner: STENT-<integer> | group:<name> | public | null*
current_location: STLOC-<integer> | offstage | unknown | carried_by:STENT-<integer>*
```

#### (d) Migration notes

Red-bunny STOBJ-1, STOBJ-2 conform to the amended shape modulo `carried_by:` syntax (currently stored as `current_location: STLOC-1` with an implicit owner). New records use the amended enum.

---

### §4.5l DA (story-local diegetic artifact)

**Source class**: `_source/artifacts/DA-<integer>.yaml`. A diegetic in-story text or object whose authorship is in-world (a letter, a sermon, a ledger, a written confession). The story-local mirror of world-level `DA` records under `worlds/<slug>/diegetic-artifacts/`.

#### (a) Current-state inventory

| Property | Contract §4 | JSON schema | Skill prescription | Observed in wild |
|---|---|---|---|---|
| (no DA records in red-bunny) | — | yes (story-diegetic-artifact.schema.json exists; shape not inspected in this audit) | yes (skill prescriptions exist for promotion-to-canon flows) | none |

**Evidence: skill-prescription-only.** No wild records to audit against. The shape comes from the story-fact-promotion-to-canon flow and the world-level `DA` template.

#### (b) Audit verdict table

| Property | Verdict | Rationale |
|---|---|---|
| `id`, `story_id`, `created_at_page`, `supersedes` | keep | universal record-level identity + provenance + supersession |
| `title` | promote required | display label |
| `author` | promote required | in-world authorship attribution (`STENT-<integer> | group:<name> | unknown | anonymous`) |
| `genre` | promote required | open vocabulary (letter / sermon / ledger / etc.) |
| `body` | promote required | the diegetic text itself |
| `intended_audience` | promote required | who the artifact addresses (`STENT-<integer> | group:<name> | public | self | none`) |
| `circulation` | promote required | who currently has access (closed enum: `private | factional | public | concealed | suppressed` — mirrors `BEL.visibility` taxonomy) |
| `truth_relation` | promote required | matches `BEL.truth_relation` enum because diegetic texts can lie / misremember / report partly_true claims |
| `derived_from` | promote optional | list of source records that motivated the artifact's existence in the branch |

#### (c) Amended §4.5l DA schema

```yaml
id: DA-<integer>*                              # story-local id; distinct from world-level DA
story_id: STORY-<integer>*
created_at_page: PG-<integer>*
supersedes: DA-<integer> | null               # default null
title: string*                                  # display label
author: STENT-<integer> | group:<name> | unknown | anonymous*
genre: string*                                  # open vocabulary
body: string*                                   # the diegetic text content
intended_audience: STENT-<integer> | group:<name> | public | self | none*
circulation: private | factional | public | concealed | suppressed*
truth_relation: true | false | partly_true | unknown | contested | branch_counterfactual | future_contingent*
derived_from: [<record_id>]                    # default []
```

#### (d) Migration notes

No wild records to migrate. SCAUD-001 includes a verification step to inspect `story-diegetic-artifact.schema.json` and add or strengthen properties per this audit; SCAUD-003 brings the JSON schema into alignment.

---

### §4.5m BR (branch)

**Source class**: `_source/branches/BR-<integer>.yaml`. A causal lineage of pages. The root bundle has `BR-1`; forks allocate new BR ids.

#### (a) Current-state inventory

| Property | Contract §4 | JSON schema | Skill prescription | Observed in wild |
|---|---|---|---|---|
| `id` | not defined | yes (required) | yes | yes |
| `story_id` | not defined | yes (required) | yes | yes |
| `created_at_page` | not defined | no | yes (bootstrap; turn-cycle on fork) | yes |
| `label` | not defined | no | yes | yes (`Main branch — first encounter`) |
| `description` | not defined | no | yes (implicit) | yes |
| `parent_branch_id` | not defined | no | yes (turn-cycle fork detection) | yes (`null` for BR-1) |
| `forked_at_page_id` | not defined | no | yes | yes (`null` for BR-1) |
| `root_page_id` | not defined | no | yes | yes (`PG-1`) |
| `supersedes` | not defined | no | implicit | not observed |

#### (b) Audit verdict table

| Property | Criteria passed | Cited consumer | Verdict | Action |
|---|---|---|---|---|
| `id` | 1, 4, 5 | patch ops; PG.branch_id; replay | keep | unchanged |
| `story_id` | 1, 5 | patch ops | keep | unchanged |
| `created_at_page` | 1, 4, 5 | branch scope; replay | keep | promote required |
| `label` | 2, 5 | INDEX.md; UI display | keep | promote required short string |
| `description` | 2, 5 | INDEX.md | keep | promote optional free-form string (a short BR may not need extended description) |
| `parent_branch_id` | 4, 5 | fork lineage; replay; branch-isolation gate 4 | keep | promote required nullable (null only for root branch) |
| `forked_at_page_id` | 4, 5 | fork lineage; replay | keep | promote required nullable (null only for root branch) |
| `root_page_id` | 4, 5 | replay entry point; PG.branch_path[0] | keep | promote required |
| `supersedes` | none (branches do not supersede; they fork) | n/a | **drop** | branches are immutable once committed; the supersession concept does not apply at the branch level (it applies to records within branches) |

#### (c) Amended §4.5m BR schema

```yaml
id: BR-<integer>*
story_id: STORY-<integer>*
created_at_page: PG-<integer>*
label: string*                                  # short display name
description: string                             # optional free-form
parent_branch_id: BR-<integer> | null*         # null only for root branch
forked_at_page_id: PG-<integer> | null*        # null only for root branch
root_page_id: PG-<integer>*                    # first page on this branch
```

#### (d) Migration notes

Red-bunny BR-1 conforms to the amended shape. No cleanup needed.

---

### §4.5n PG (page snapshot)

Already defined at contract §4.2. Re-audit with the R3 reconciliation applied.

#### (a) Current-state inventory

PG carries ~22 sub-paths per current §4.2. The audit focuses on the prose-related fields (R3) plus a sweep of other fields against the rubric.

| Property | Contract §4.2 | JSON schema | Skill prescription | Observed in wild |
|---|---|---|---|---|
| `id`, `story_id`, `branch_id`, `parent_page_id`, `branch_path`, `turn_index`, `input.*`, `state_hash_parent`, `state_hash`, `state_snapshot.*`, `plan.{path,plan_hash}`, `emitted_choices`, `validation_trace` | yes (matches §4.2) | partial (state_hash, plan, prose_plan_path required) | yes (both SKILL.md) | yes |
| `rendered_prose.path` | yes (§4.2) | no | yes (both Phase 6) | yes (always null) |
| `rendered_prose.receipt_path` | yes (§4.2) | no | yes (both Phase 6) | yes (always null) |
| `prose_plan_path` (top-level) | no | yes (REQUIRED) | yes (documented as legacy in both SKILL.md) | yes |
| `prose_path` (top-level) | no | yes (optional, nullable) | no | yes (always null) |
| `prose_receipt_path` (proposed) | no | no | no | n/a |

#### (b) Audit verdict table (R3-affected fields only)

| Property | Criteria passed | Cited consumer | Verdict | Action |
|---|---|---|---|---|
| `prose_plan_path` (top-level) | 1, 2, 4 | schema validator (required); both SKILL.md; included in state-hash payload (immutable plan address) | **reconcile → keep canonical** | promote into §4.2 top-level required field |
| `prose_path` (top-level) | 1, 2 | schema validator (optional); branching-story-prose-attach writes this | **reconcile → keep canonical** | promote into §4.2 top-level optional/nullable field; EXCLUDED from state-hash payload (mutable publication receipt) |
| `prose_receipt_path` (top-level, new) | 2 | branching-story-prose-attach writes the receipt; current convention buries the path in `rendered_prose.receipt_path` which is dead | **promote** | add as top-level optional/nullable; EXCLUDED from state-hash payload |
| `rendered_prose.path` (nested) | none | dead write | **drop** | replaced by top-level `prose_path` |
| `rendered_prose.receipt_path` (nested) | none | dead write | **drop** | replaced by top-level `prose_receipt_path` |
| `rendered_prose` (nested block container) | none | dead write | **drop** | block removed entirely |

All other PG fields pass criteria 1 and/or 4. Keep as-is per current §4.2.

#### (c) Amended §4.5n / §4.2 PG schema

```yaml
id: PG-<integer>*
story_id: STORY-<integer>*
branch_id: BR-<integer>*
parent_page_id: PG-<integer> | null         # * null only for PG-1
branch_path: [PG-<integer>]*                # * ordered list root → here
turn_index: 0*
input:
  choice_id: CHC-<integer> | null           # exactly one of choice_id / manual_action_text is non-null
  manual_action_text: null | string
  resolved_event_id: SE-<integer>*
state_hash_parent: null | sha256            # null only for PG-1
state_hash: sha256*
state_snapshot:                              # * (unchanged from current §4.2)
  active_records: {...}
  entity_status: {...}
  visible_affordances: [...]
  unresolved_mystery_claims: [...]
  continuation: {...}
plan:
  path: pages-prose-plans/PG-<integer>.md*
  plan_hash: sha256*
prose_plan_path: pages-prose-plans/PG-<integer>.md*   # NEW canonical top-level (replaces rendered_prose.path semantics for the plan address)
prose_path: pages-prose/PG-<integer>.md | null        # NEW canonical top-level; default null until prose attaches
prose_receipt_path: pages-prose-receipts/PG-<integer>.yaml | null   # NEW canonical top-level; default null until receipt is written
emitted_choices: [CHC-<integer>]*
validation_trace:                            # * (unchanged from current §4.2)
  input_legality: "PASS: <rationale>"
  parent_snapshot_compatibility: "PASS: <rationale>"
  mystery_invariant_firewall: "PASS: <rationale>"
  branch_isolation: "PASS: <rationale>"
  append_only_delta: "PASS: <rationale>"
  consequence_or_terminal: "PASS: <rationale>"
  plan_grounding: "PASS: <rationale>"
  canon_promotion_hold: "PASS: <rationale>" | "NOT_APPLICABLE: <rationale>"
```

**SCAUD-001 resolution**: the contract collapses the redundant plan address. `plan` is `{plan_hash: sha256*}` only, and the top-level `prose_plan_path` is the canonical plan address included in the state-hash payload.

#### (d) Amended §4.2a hash-payload exclusion list

The fork-state payload for `state_hash` excludes:
- `state_hash` itself.
- `prose_path` (mutable publication receipt).
- `prose_receipt_path` (mutable publication receipt).

The fork-state payload INCLUDES (changed from current §4.2a):
- `prose_plan_path` (stable address tied to plan_hash and fork identity).
- All other PG fields per current §4.2a.

The current §4.2a clause "exclude `rendered_prose` entirely" is replaced by "exclude `prose_path` and `prose_receipt_path`".

#### (e) Migration notes

Red-bunny PG-1 and PG-2 carry both `rendered_prose: {path: null, receipt_path: null}` AND `prose_plan_path: ...` AND `prose_path: null`. The amended schema drops `rendered_prose:`. With red-bunny removed and re-bootstrapped from zero, no PG cleanup is needed; the re-bootstrapped bundle's PG records use the amended shape from PG-1.

Important: state-hash recomputation. The amended §4.2a hash-payload changes the exclusion list, so the question of state_hash continuity across the reconciliation only arises for pre-existing PG records. With red-bunny removed, no pre-existing PG records survive — the re-bootstrapped bundle computes every state_hash against the new payload definition from PG-1, so the parent-hash chain is internally consistent by construction.

---

### §4.5o CHC (emitted choice)

**Source class**: `_source/choices/CHC-<integer>.yaml`. A choice emitted by a page, selectable by the player on the next turn-cycle invocation.

#### (a) Current-state inventory

| Property | Contract §4 | JSON schema | Skill prescription | Observed in wild |
|---|---|---|---|---|
| `id` | not defined | yes (required) | yes (Phase 8 both) | yes (CHC-1..8) |
| `story_id` | not defined | yes (required) | yes | yes |
| `created_at_page` | not defined | no | implicit (Phase 8) | yes |
| `emitted_by_page` | not defined | no | no | yes (duplicate of `created_at_page`) |
| `emitted_at_branch` | not defined | no | no | yes |
| `supersedes` | not defined | no | implicit | not observed |
| `surface_label` | not defined | yes (optional) | yes | yes |
| `player_visible_intent` | not defined | yes (optional) | yes | yes |
| `target_or_action_family` (singular) | not defined | yes (optional, enum of 20+ values) | yes (Phase 8 both) | yes (CHC-5..8 only) |
| `target_or_action_families` (plural list) | not defined | no | no | yes (CHC-1..4 only) |
| `likely_state_pressure` | not defined | yes (optional) | yes (Phase 8 both) | yes (CHC-5..8) |
| `associated_commitment_block` | not defined | yes (optional, nullable `SLT-<integer>`) | yes (Phase 8 both) | yes |
| `success_policy` | not defined | yes (optional) | yes (Phase 8 both — conditional) | not observed |
| `choice_kind`, `choice_contract.*`, `choice_worthiness.*`, `commitment_class`, `commitment_detail`, `commitment_family`, `continuation_capacity.*`, `likely_effects`, `record_version`, `strategy_cluster` | not defined | no | bootstrap **explicitly forbids** `record_version` (line 358); none of the others prescribed | yes (CHC-1..4 only — LEGACY) |

#### (b) Audit verdict table

| Property | Criteria passed | Cited consumer | Verdict | Action |
|---|---|---|---|---|
| `id` | 1, 4, 5 | patch ops; PG.emitted_choices; replay | keep | unchanged |
| `story_id` | 1, 5 | patch ops | keep | unchanged |
| `created_at_page` | 1, 2, 4, 5 | `recursive-reference-closure.ts:17,174,179` (branch isolation); skill prescription; replay; `world-index/src/parse/atomic.ts:164,168` (index edge) | keep | promote required |
| `emitted_by_page` | none | nowhere — duplicate of `created_at_page` semantically | **drop** | redundant |
| `emitted_at_branch` | none | nowhere — derivable from `created_at_page.branch_id` via PG snapshot | **drop** | redundant |
| `supersedes` | 1, 5 | §3 (a retired choice supersedes its prior form, e.g., when audit_repair rewrites) | keep | promote nullable default null |
| `surface_label` | 1, 2 | schema validator (when present); skill prescription | keep | promote required short string |
| `player_visible_intent` | 1, 2 | schema validator; skill prescription | keep | promote required free-form string |
| `target_or_action_family` (singular) | 1 (validator) | `story-choice.schema.json:11-35` enum-validated | **replace** | replaced by `target_or_action_families` (plural list) per the R3-parallel decision; affordances are naturally multi-valued (compare PG.visible_affordances[].action_families which is already plural in §4.2). SCAUD-003 widens `story-choice.schema.json` to validate the plural form. |
| `target_or_action_families` (plural) | 2 (skill prescription pending update); 4 (replay grounding) | not yet a live consumer but structurally superior | **promote** | becomes canonical; SCAUD-001 updates both SKILL.md Phase 8 prescriptions accordingly |
| `likely_state_pressure` | 1, 2 | schema validator; skill prescription (both Phase 8) | keep | promote required free-form string |
| `associated_commitment_block` | 1, 2, 4 | schema validator; skill prescription; turn-cycle Phase 2 (block selection priority) | keep | promote required nullable `SLT-<integer> | null` |
| `success_policy` | 1, 2 | schema validator; skill prescription (only when `target_or_action_families` includes `attempt` family — but `attempt` is a SE outcome_route, not an action_family; this is a current contract bug: the `target_or_action_family` enum includes `attempt` mistakenly. Audit verdict: REMOVE `attempt` from the action_family enum since it's not an action family per §4.4a, and instead promote `success_policy` to required only when the resolving SE outcome_route is `attempt`) | keep with semantic fix | promote optional free-form string; conditional-required at SE-resolution time, not at CHC-emit time |
| `choice_kind`, `choice_contract`, `choice_worthiness.*`, `commitment_class`, `commitment_detail`, `commitment_family`, `continuation_capacity.*`, `likely_effects`, `record_version`, `strategy_cluster` | none | bootstrap SKILL.md line 358 explicitly forbids `record_version`; the rest appear only in test fixtures (`record-schema-compliance-arc.test.ts`); two — `commitment_class` and `commitment_family` — surface via `get-canonical-vocabulary.ts` but only as MCP vocabulary metadata, not as record requirements | **drop all** | full legacy debris removal; the affected CHC-1..4 records disappear with the red-bunny removal, and the re-bootstrapped bundle's CHC records omit all of them |

#### (c) Amended §4.5o CHC schema

```yaml
id: CHC-<integer>*
story_id: STORY-<integer>*
created_at_page: PG-<integer>*
supersedes: CHC-<integer> | null              # default null
surface_label: string*                          # short display label
player_visible_intent: string*                  # natural-language statement of what the player commits to
target_or_action_families: [<action_family>]*   # non-empty list; §4.4a closed enum, with `attempt` REMOVED from the enum per audit fix
likely_state_pressure: string*                  # natural-language pressure description
associated_commitment_block: SLT-<integer> | null*   # SLT id if known, null if turn-cycle will JIT
success_policy: string                          # optional; only present when the resolving SE.outcome_route is `attempt`
```

#### (d) Migration notes

Red-bunny CHC-1..8 ALL drift from the amended schema:
- CHC-1..4 (bootstrap) carry all 10+ dropped fields plus the plural `target_or_action_families` (which is the canonical form post-amendment — a happy accident that lined up with the audit verdict).
- CHC-5..8 (turn-cycle) carry the dropped `emitted_by_page` and `emitted_at_branch`, plus the singular `target_or_action_family` (now replaced by the plural form).

With red-bunny removed and re-bootstrapped from zero, all 8 drifted records disappear; the re-bootstrapped bundle's CHC records use the amended shape by construction.

#### (e) Action-family enum fix

Per the `success_policy` analysis above, the current `story-choice.schema.json` enum includes `attempt` as a value, but `attempt` is an SE `outcome_route` per §6, not an action_family per §4.4a. The action_family taxonomy in §4.4a does NOT include `attempt`. The CHC schema's enum is the bug; SCAUD-003 removes `attempt` from the validator enum, and SCAUD-001 ensures the contract's amended §4.5o uses the §4.4a enum verbatim.

---

### §4.5p SLT (commitment block)

Already defined at contract §4.4. Re-audit.

#### (a) Current-state inventory

~18 sub-paths per current §4.4, matching `story-storylet.schema.json` exactly (strict schema, `additionalProperties: false`).

#### (b) Audit verdict table

All properties pass criterion 1 (validator-enforced) plus 2-5 as cited in §4.4. **All keep, no changes** at the contract level.

The closed `move_family` and `action_family` taxonomies in §4.4 and §4.4a are also retained verbatim.

#### (c) Amended §4.5p / §4.4 SLT schema

Unchanged from current §4.4.

---

## Deliverables

Three artifacts result from this spec:

1. **Amended `story-state-contract.md` §4** — SCAUD-001 rewrote §4 to incorporate all 16 per-class schemas. Sub-numbering: §4.1 BEL stays, §4.2 PG stays (with R3 reconciliation applied), §4.3 SE stays, §4.4 SLT stays, §4.4a / §4.4b taxonomies stay, §4.5 is the container for the 12 additional classes as §4.5.1 through §4.5.12, and the prose receipt moved to §4.6. SCAUD-001 also updated the §4 preamble paragraph to reflect coverage of all 16 classes.

2. **Removed red-bunny bundle** — the one drifted user bundle carried only 2 pages, so rather than the supersession-cleanup originally scoped as SCAUD-002 (an `audit_repair` SE superseding CHC-1..8 and OBL-1 plus a new PG snapshot), the bundle is removed and re-bootstrapped from zero against the amended contract. The re-bootstrap is a local operation on a gitignored, per-user bundle (`worlds/` is gitignored per CLAUDE.md); SCAUD-003 should land first so the re-bootstrapped bundle is born under the tightened validators.

3. **Tightened JSON validator schemas** — SCAUD-003 (deferred) updates 13 minimal `tools/validators/src/schemas/story-*.schema.json` files to enforce the amended contract, removes `additionalProperties: true` where the audit allows, re-audits the 3 strict schemas, and updates the validator tests.

## FOUNDATIONS Alignment

| Principle | Stance | Mechanism |
|---|---|---|
| Schema-Minimalism Doctrine (contract §2) | aligns | Every retained field in amended §4 cites a load-bearing consumer per the 5-criterion rubric; every dropped field fails all 5 criteria. The doctrine that was silently violated for 12 of 16 classes becomes structurally enforceable. |
| FOUNDATIONS §Story Bundles §5b (Schema-Minimalism) | aligns | Same mechanism at FOUNDATIONS scope; the audit is the §5b enforcement gate for story-bundle records. |
| Rule 1 (No Floating Facts) | aligns | Plan-grounding gate 7 requires every affordance, beat, and CHC to be grounded in active records; the amended schemas make "grounded" unambiguous by fixing the property set. |
| Rule 5 (No Consequence Evasion) | aligns | OBL / CNSQ / THR field audit forces every retained field to constrain choice or close consequence — bad-debt fields fail criteria 2 + 3 + 4 and are dropped. The `status` enum on each class is also tightened to enable the corresponding §5 predicate (`obligation_open`, `consequence_pending`, `thread_active`) to operate on a closed value set. |
| Rule 6 (No Silent Retcons) | N/A | Story-bundle scope only; world canon untouched. The audit does not modify any CF / CH / INV / M / OQ / ENT / SEC record. |
| Rule 7 (Preserve Mystery Deliberately) | N/A | Audit does not touch mystery-firewall fields on PG / SE / SLT — those are already strict per current §4. |
| Canon Layers | N/A | Spec operates entirely below the world-canon boundary; promotion path (`story-fact-promotion-to-canon` → `canon-addition`) is unaffected. |
| §Story Bundles §3 (Append-Only / Supersession Discipline) | aligns | The amended §4 schemas respect §3: any future drift in a committed bundle is corrected by supersession via the patch engine, not in-place edit (Hook 3 structurally enforces). Red-bunny itself is removed rather than superseded — lawful because it is a gitignored, per-user working bundle that was never committed canon, not an exception to §3. |
| §Story Bundles §4a (Plan-Authority Boundary) | aligns | PG §4.2 reconciliation drops the dead `rendered_prose:` block but preserves the page-snapshot-as-fork-primitive semantics; `prose_plan_path` becomes the canonical plan address; `prose_path` and `prose_receipt_path` remain nullable until prose attaches. |

## Verification

Acceptance is proven by the following surfaces:

1. **Contract conformance proof** — A walk of `story-state-contract.md` §3 inventory verifies every listed class has a §4.x subsection post-SCAUD-001. Verification command documented in SCAUD-001 acceptance criteria.

2. **Skill-spec sweep** — Pipeline-wide grep across current story-skill operational prescriptions must show no stale emission or read guidance for retired fields. Legitimate negative guardrail wording and unrelated fields with the same spelling (for example `SLT.exit_options[].likely_effects` or `BEL.confidence` prose) are manually classified rather than forced to zero.

3. **Red-bunny removal proof** — the drifted `worlds/erotica-world/stories/red-bunny/` bundle no longer exists; the first bundle re-bootstrapped against the amended contract is the empirical conformance check. `branching-story-health-audit` in structural mode on that re-bootstrapped bundle returns clean.

4. **Validator-enforcement proof** (deferred to SCAUD-003) — Submitting a patch plan containing any dropped field for any record class fails validation with a typed `record_schema_compliance` error citing the dropped field by name. The test for this is added in SCAUD-003.

5. **Round-trip proof** (deferred to SCAUD-003) — Every §4 schema example in the amended contract validates against the corresponding JSON schema after SCAUD-003 lands. Test fixture in `tools/validators/src/__tests__/contract-schema-roundtrip.test.ts` (new).

## Risks & Open Questions

- **(resolved by SCAUD-001) PG state_hash continuity across the R3 reconciliation.** The amended §4.2a hash-payload changes the exclusion list. Existing PG records were hashed against the old definition. SCAUD-001 landed the tolerance/documentation approach: pre-SCAUD-001 PG records retain their original state_hash as opaque strings; new PG records authored post-SCAUD-001 use the new payload definition.

- **(resolved by red-bunny removal) `target_or_action_family` singular → plural replacement on CHC-5..8.** Originally a (pragmatic) risk: SCAUD-002 would have superseded red-bunny's CHC-5..8 to the plural form, expanding its record count from 5 to 9 supersessions. With red-bunny removed and re-bootstrapped from zero, no supersession is needed — the re-bootstrapped CHC records use the plural form by construction.

- **(structural) `DA` class has no wild evidence.** The §4.5l schema is derived from skill prescription only. First diegetic-artifact author in any story bundle will validate the schema empirically. If the audit's DA verdicts turn out to be wrong, an amendment ticket follows.

- **(structural) The action_family enum's `attempt` value is a contract bug discovered during this audit.** `attempt` is an SE `outcome_route`, not an action_family per §4.4a. SCAUD-001 removes it from the §4.4a taxonomy; SCAUD-003 removes it from `story-choice.schema.json`'s enum. This propagates through any record in any bundle that ever used `target_or_action_family: attempt` — currently none observed in red-bunny.

- **(pragmatic) Skill SKILL.md updates in SCAUD-001 scope.** Updating both `branching-story-bootstrap` and `branching-story-turn-cycle` Phase 8 (CHC field set), Phase 6 (PG field set), and Phase 3 (SF field set) is non-trivial. The ticket needs to enumerate every site that mentions a dropped or renamed field. Site enumeration is performed at ticket-authoring time per Step 5 sub-rule 4 of the brainstorm skill.

- **(structural) Once the contract changes, any pre-existing bundle in any user's `worlds/` becomes drifted by definition.** Per CLAUDE.md, `worlds/` content is gitignored and per-user; the spec assumes the only currently-affected user-bundle is red-bunny, which is removed and re-bootstrapped from zero. If a user has additional bundles, they either remove-and-re-bootstrap (for thin bundles) or run a supersession-cleanup pass manually with the bundle slug substituted; bulk migration is out of scope.

- **(resolved by SCAUD-001) The contract numbering question.** SCAUD-001 kept §4.1 BEL, §4.2 PG, §4.3 SE, §4.4 SLT, §4.4a action_family, and §4.4b STENT/SREL taxonomies; added §4.5 as the container for the 12 additional classes (§4.5.1 through §4.5.12); and moved the prose receipt to §4.6.

## Out of Scope

- **World-canon records (CF / CH / INV / M / OQ / ENT / SEC).** This spec operates entirely on story-bundle scope.
- **Bundles other than red-bunny.** Per CLAUDE.md `worlds/` content is per-user and gitignored; the spec assumes red-bunny is the only currently-affected bundle for this user.
- **Skill behavior changes beyond field-set conformance.** The Phase structures of `branching-story-bootstrap` and `branching-story-turn-cycle` remain unchanged; only the property prescriptions they emit (Phase 8 CHC, Phase 6 PG, Phase 3 SF, Phase 4 OBL/CNSQ/THR) are updated.
- **New record classes.** The audit covers the 16 classes currently inventoried in contract §3; introducing new classes is a separate amendment.
- **Migration tooling for hypothetical multi-bundle worlds.** If a user has additional drifted bundles, they remove-and-re-bootstrap or run a supersession-cleanup pass against each manually; bulk migration is not in scope.
- **Reformatting `story-state-contract.md` for general readability.** SCAUD-001 makes surgical §4 amendments; broader stylistic changes are out of scope.
