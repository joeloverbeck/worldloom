<!-- spec-drafting-rules.md not present; using default structure + Deliverables + Risks & Open Questions. -->

# SPEC-38 — Story-Local Diegetic Artifact Authoring Discipline

**Status**: PROPOSED
**Date**: 2026-05-17
**Source**: `reports/story-local-diegetic-artifacts.md` (ChatGPT-Pro external review of story-local DA involvement); triage at `docs/triage/2026-05-17-story-local-diegetic-artifacts-triage.md`.

## Problem Statement

The story-bundle pipeline carries a full machine substrate for story-local diegetic artifacts (`DA-<integer>` records) but the authoring discipline that turns the substrate into reliable narrative infrastructure is missing or thin across the consumer skills. Codebase verification (four parallel Explore agents across the schema/contract, patch-engine, FOUNDATIONS, and skill-capability claim clusters) confirms the substrate is complete:

- **Schema**: `.claude/skills/_shared-templates/story-record-schemas.md` §4.5.10 (lines 554–571) defines the `DA` record with 12 fields (`id`, `story_id`, `created_at_page`, `supersedes`, `title`, `author`, `genre`, `body`, `intended_audience`, `circulation`, `truth_relation`, `derived_from`). `tools/validators/src/schemas/story-diegetic-artifact.schema.json` mirrors it (required: 10 fields; permits `supersedes`, `derived_from`; rejects additional properties).
- **Patch op**: `tools/patch-engine/src/envelope/schema.ts:91,260` registers `append_story_diegetic_artifact_record`; `tools/patch-engine/src/ops/create-story-record.ts:179-185` maps it to `_source/artifacts/DA-<integer>.yaml` under `story_da_ids` allocation key with node type `story_diegetic_artifact_record`.
- **ID allocation**: `tools/world-mcp/src/tools/allocate-next-id.ts:101,430-432` registers `DA` as a story-scoped class (requires `story_slug`); scans `worlds/<slug>/stories/<story-slug>/_source/artifacts/`.
- **Validator coverage**: `tools/validators/src/structural/expected-witness-coverage.ts:13,164-214` enforces the public/factional DA propagation discipline — when an `SE.state_delta.create[]` produces a DA with `circulation ∈ {public, factional}`, at least one BEL referencing it via `basis.access_records[]` must carry `basis.access_route` in the indirect set `{document, object_trace, location_trace, rumor, surveillance, institutional_channel, magic_tech}`, OR the SE's `world_logic_rationale` must carry a parseable `non_propagation:event_leaves_no_accessible_trace(group=<label>, records=[<DA-id>])` tag. `tools/validators/src/structural/record-schema-compliance.ts` (via `utils.ts:97`) validates DA schema enum violations on every patch-applied DA. `tools/validators/src/structural/non-propagation-tag-shape.ts:21` recognizes `DA` in the non-propagation tag record-ID pattern.
- **Predicate DSL**: `.claude/skills/_shared-templates/story-state-contract.md` §5 (lines 140–141) defines `artifact_accessible(STENT-<integer>, DA-<integer>)` for storylet eligibility and plan grounding; line 137 lists `DA` among `record_active(...)` recognized record types.
- **Promotion path**: `.claude/skills/story-fact-promotion-to-canon/SKILL.md:115` registers `artifact_canonization` as a `source_kind` taking a story-local `DA-<integer>` plus authoring `SE` (prose evidence required). `.claude/skills/story-promotion-closeout/SKILL.md:124,187,305` handles DA supersession post-adjudication via `append_story_diegetic_artifact_record` only when a §4.5.10 schema field changes.

Verified authoring gaps:

- **`branching-story-bootstrap`** (`SKILL.md:131,372`): DA appears only as an output-table row (`IF an in-story diegetic artifact is in play at opening`) and a conditional patch-op note. No triage step exists, no DA-vs-STOBJ-vs-BEL-vs-SF decision logic is prescribed, no opening-access guidance is given.
- **`branching-story-turn-cycle`** (`SKILL.md:289,325`): Phase 3 lists DA creation/alteration as one delta operation among many ("Create or alter story-local artifacts (`DA` new or supersession)") with no triage prompt. Phase 4 already documents the public/factional propagation discipline via `expected_witness_coverage`, but the triage that decides whether a turn should create a DA at all is missing.
- **`branching-story-health-audit`** (`SKILL.md` Phase 2a–2h): zero DA-specific checks. The audit covers BEL/visibility (2d), mystery/canon safety (2e), and continuation health (2f) but does not check DA active-record consistency, CHC.grounded_in.records[].DA accessibility, duplicate-DA presence, or body specificity.
- **`branching-story-prose-attach`** (`SKILL.md:204-218`): the `invented_structural_fact` deterministic check catches prose that asserts a named record id absent from state, but does not flag prose that mentions a load-bearing artifact ("a letter arrived bearing the king's seal") without a corresponding DA in `PG.state_snapshot.active_records.DA[]`.
- **`commitment-block-authoring`** (`SKILL.md`): the `artifact_accessible` predicate from story-state-contract §5 is not referenced in the skill's prose. The skill mentions "accessible `DA` / `STOBJ` evidence" in its Information / Observer Firewall guidance (line 256) but does not name the predicate or warn against fabricating DA existence in SLT preconditions.
- **`story-fact-promotion-to-canon`** (`SKILL.md`): handles `artifact_canonization` (line 115) but does not surface FOUNDATIONS.md line 365's explicit routing rule that "diegetic-artifact or character pre-figurement belongs in `source_basis.derived_from` alongside any contributing CF parents... not widening `pre_figured_by` beyond CF references." The omission risks producing CF candidates with DA references in the wrong field.

The report `reports/story-local-diegetic-artifacts.md` is a 1675-line ChatGPT-Pro external review (15 sections + a copy-pasteable spec section) proposing a single coordinated remediation: add a reusable DA authoring policy and embed it into the bootstrap / turn-cycle / health-audit / prose-attach / commitment-block-authoring / promotion skills. The report's verdict survives codebase verification verbatim across all four claim clusters; two design corrections (shared reference vs standalone skill; FOUNDATIONS §365 routing) sharpen the proposal without changing its thesis.

### Key design decisions

- **Considered creating a new standalone skill `.claude/skills/story-diegetic-artifact-authoring/`; chose a shared reference at `.claude/skills/_shared-templates/da-authoring-reference.md` `(structural)`.** The triage rubric and field-semantics commentary are never invoked independently — they always run inside `branching-story-bootstrap` (at opening-situation setup) or `branching-story-turn-cycle` (at Phase 3 state-delta authoring). Worldloom's established convention for cross-skill shared content is the `_shared-templates/` directory (`story-state-contract.md`, `story-record-schemas.md`, `clothing-consistency-vocabulary.md`, `persisted-packet-recovery.md`), and consumer skills load shared content by reference. A standalone skill would add HARD-GATE ceremony, ID allocation, `<system-reminder>` listing, and SKILL.md prose-budget overhead for content with no independent invocation path. Choosing the shared reference is structurally correct; the standalone-skill option is unavailable without violating the established cross-skill-content convention.

- **Considered implementing the report's full 9 FAIL + 8 WARN + 2 INFO health-audit / prose-attach / validator surface; chose a narrowed 3-validator + authorial-warning scope `(pragmatic — scoping)`.** The report's §10 lists 19 audit conditions. Six of them are already covered by existing structural validators (FAIL #5 `expected_witness_coverage`, FAIL #9 `record-schema-compliance`, derivable fragments of FAIL #1 / #2 / #7 / #8 via existing schema and active-record validation). Of the remaining 13, three are mechanically simple and load-bearing for the report's central thesis — (a) `chc_grounded_in_artifact_accessible` (Error #3 + #4 unified), (b) `story_da_duplicate_heuristic` (Warning #4), (c) prose-mention-without-DA detection (Warning #1) — and one is an authorial body-specificity warning that needs no validator code. The remaining 9 conditions are warning-level pattern detections (circulation/BEL mismatch, suppressed-artifact custody check, truth_relation:true without support, etc.) whose value depends on real audit patterns that have not yet emerged in any pilot story bundle. Landing the load-bearing three plus the body-specificity authorial warning establishes the discipline and gives the next iteration concrete evidence for which additional checks are worth implementing. Under no-scope-constraint conditions, more would land here; the remaining nine route to §Risks & Open Questions as a follow-up cluster.

- **Considered adding optional schema fields (`source_world_artifact`, `carrier_object`, `body_mode`, structured `claims[]`); chose to defer all schema changes `(structural for carrier_object / body_mode / claims; pragmatic for source_world_artifact)`.** Story-state-contract §2 Schema-Minimalism Doctrine (lines 17–21) requires every field be load-bearing for validation / replay / predicates / fork operations / audit discipline. `carrier_object` is structurally redundant: `derived_from: [STOBJ-*]` already expresses carrier linkage. `body_mode` is structurally redundant: `genre` and body content can encode full-text-vs-excerpt-vs-transcript-vs-visual-description. Structured `claims[]` would duplicate the world-level DA's heavyweight epistemic-horizon / claim-map / world-consistency frontmatter at story-local scale — exactly what the world-level DA skill carries and exactly what story-local DAs were designed not to carry. `source_world_artifact` addresses a real ambiguity (story-local and world-level DAs both use `DA-*` ID-space and `derived_from: [DA-12]` is ambiguous) but the ambiguity has not yet bitten any pilot story bundle; `body` text annotation or a body header line ("Story-local copy of world-level DA-12: Council Edict of the Salt Charter") expresses the linkage clearly enough until concrete cases demand machine-readable routing. Under no-migration-constraint and concrete-pattern-evidence conditions, `source_world_artifact` likely wins; flag if either constraint changes.

- **Considered placing example DA records in a `worlds/<slug>/examples/` or `tests/` location per the report's §14 step 7; chose inline embedding in the shared reference `(structural)`.** Per `CLAUDE.md` §Repository Layout, `worlds/<world-slug>/` is content-gitignored — freestanding example records there would not survive the repo's content/pipeline separation. A `tests/` location would push pipeline-internal examples into an unrelated surface. The shared reference is the natural home: examples sit adjacent to the field-semantics commentary they illustrate, get loaded into context whenever any consumer skill loads the reference, and remain editable as the discipline evolves. Three examples (private letter at bootstrap, public proclamation, found forged document) cover the bootstrap-vs-turn-cycle and private-vs-public-vs-concealed circulation axes adequately; the report's five-example set is reducible without losing coverage.

- **Considered citing FOUNDATIONS §365 routing as a footnote in `story-fact-promotion-to-canon`'s existing prose; chose to add a dedicated paragraph that names the routing rule explicitly.** FOUNDATIONS line 365 is binding: "Diegetic-artifact or character pre-figurement belongs in `source_basis.derived_from` alongside any contributing CF parents, preserving Rule 6 audit-trail routing without widening `pre_figured_by` beyond CF references." Without an explicit prose anchor, future operators authoring `artifact_canonization` promotion packages can plausibly place the source DA in `candidate.pre_figured_by[]` — schema validation will reject it (only CF references permitted), but the failure surfaces at adjudication time, not at proposal-authoring time, wasting one round-trip. The dedicated paragraph makes the routing rule discoverable at the authoring surface.

---

## Approach

The remediation has three architectural tiers, each landing as an independently shippable unit. The tiers compose: Tier 1 lands the shared reference + contract commentary; Tier 2 lands the consumer-skill amendments that load Tier 1 by reference; Tier 3 lands the validator additions that turn the discipline into enforceable structural and rule-based gates.

**Tier 1 — Reference + contract** (D1, D2): publishes the canonical DA-authoring rubric and decision matrix in `_shared-templates/`, plus rule-of-use commentary on the §4.5.10 schema fields. Once Tier 1 lands, every consumer skill has a single source of truth to reference.

**Tier 2 — Skill amendments** (D3–D9): adds DA-triage steps to the producer skills (bootstrap, turn-cycle), DA-specific check guidance to the audit and prose-attach skills, predicate references and anti-patterns to the commitment-block-authoring skill, and the FOUNDATIONS §365 routing rule to the promotion skills. Each amendment cross-references the Tier 1 shared reference rather than duplicating its content. Skill-prose-only changes; no code changes in Tier 2.

**Tier 3 — Validator additions** (D10–D12): three new validators close the prescription-vs-enforcement gap. D10 (`chc_grounded_in_artifact_accessible`) is a per-page rule that ensures CHCs do not ground in DAs absent from the emitting PG's active-record snapshot. D11 (`story_da_duplicate_heuristic`) is a health-audit structural check that warns on likely duplicate DAs lacking supersedes/derived_from. D12 (`prose_load_bearing_artifact_mention`) is a prose-attach rule that flags load-bearing artifact prose mentions without a DA in active state.

Cross-tier discipline: Tiers can land in order (1 → 2 → 3) or in parallel after Tier 1, but Tier 1 is a hard prerequisite for the others — every Tier 2 amendment references the Tier 1 file by path, and every Tier 3 validator's verdict messages reference the same field semantics the Tier 1 reference codifies.

Implementation phasing recommendation (for ticket decomposition):

- **Phase 1** (Tier 1, sequential): D1, D2. D1 must land first (D2's commentary cross-references the shared reference); D2 lands second.
- **Phase 2** (Tier 2, parallelizable): D3 / D4 / D5 / D6 / D7 / D8 / D9. All seven touch separate SKILL.md files; can land in any order after Phase 1.
- **Phase 3** (Tier 3, parallelizable): D10 / D11 / D12. Three independent validator additions; can land in any order. Phase 3 can run in parallel with Phase 2 (validators and skill prose are independent surfaces) but the skill-prose amendments in D5 (health-audit) and D6 (prose-attach) reference the new verdict codes and should land after their respective validators or be sequenced as a coupled pair.

No new patch-engine ops, no new MCP retrieval surfaces, no new schema fields, no new ID classes. The blast radius is one new shared reference file, edits to one shared contract and seven skill files, and three new validators with their tests.

---

## Deliverables

### Tier 1 — Reference + contract

#### D1 — Create `.claude/skills/_shared-templates/da-authoring-reference.md`

**Problem**: No single source of truth defines when a story-local DA should be created versus another record class, what field-semantic rules govern `truth_relation` / `circulation` / `body` / `derived_from` / `supersedes`, what patch obligations follow from creating a DA, or what anti-patterns to avoid. Consumer skills today either omit DA guidance entirely (bootstrap, health-audit, prose-attach) or treat it as one delta operation among many (turn-cycle Phase 3).

**Change**: Create a new shared-reference file with the following sections:

1. **Triage rubric — when to create a story-local DA.** The 8-property test from the report's §5 (diegetic authorship + recoverable content + belief-impact + choice-grounding + mystery-progression + circulation-mattering + truth-status-mattering + likely-cross-page-reference). Create when at least two properties hold.
2. **Decision matrix — DA vs STOBJ vs SF vs BEL vs prose-only.** Tabular form modeled on the report's §5 "Use another record class when..." table; cover the eight common confusions (physical possession vs content, branch truth vs claim, belief vs knowledge, atmospheric vs load-bearing, one-turn choice vs persistent, world-level vs story-local, accepted canon vs candidate, durable text vs rumor).
3. **Field semantics commentary.**
   - `truth_relation`: relation of artifact content to branch/canon truth, NOT reader belief; enum: `true | false | partly_true | unknown | contested | branch_counterfactual | future_contingent`; per-value usage table from the report §8.
   - `circulation`: access/distribution state, NOT intended audience; enum: `private | factional | public | concealed | suppressed`; trigger for `expected_witness_coverage` validator when `public` or `factional`.
   - `body`: full text for short/central artifacts; excerpt for long; transcript/description for non-text; material-uncertainty conventions (`[redacted]`, `[illegible]`, `[torn away]`, `[translation uncertain: ...]`); the "never write 'contains a clue', write the clue" rule.
   - `derived_from`: provenance/dependency; permitted reference types (`SE-*`, `DA-*`, `STOBJ-*`, `BEL-*`, `SF-*`); ambiguity note for cross-namespace `DA-*` (world-level vs story-local) — prefer body annotation until D1 sub-section on §Risks ships namespace resolution.
   - `supersedes`: same logical artifact replaced by a later version; contrast with `derived_from` (separate communicative object).
4. **Patch obligations checklist for every new DA.**
   - Allocate `DA-*` via `mcp__worldloom__allocate_next_id(world_slug, "DA", story_slug=<slug>)`.
   - Write via `append_story_diegetic_artifact_record` with `expected_id_allocations.story_da_ids: ["DA-<N>"]`.
   - Include `DA-<N>` in `SE.state_delta.create[]`.
   - Include `DA-<N>` in the relevant `PG.state_snapshot.active_records.DA[]`.
   - If any emitted `CHC` relies on the artifact, include `DA-<N>` in `CHC.grounded_in.records[]`.
   - If actor knowledge matters, create or supersede a `BEL` whose `basis.access_records[]` includes `DA-<N>` and whose `basis.access_route` is appropriate (see story-record-schemas.md §4.1 access-route enum).
   - If physical custody/location/damage/sealing matters, create or supersede a `STOBJ` carrier.
   - If `circulation ∈ {public, factional}`, create same-event BEL propagation through an indirect access route (`document | object_trace | location_trace | rumor | surveillance | institutional_channel | magic_tech`) OR include a parseable `non_propagation:event_leaves_no_accessible_trace(group=<label>, records=[DA-<N>])` tag in `SE.world_logic_rationale`. `expected_witness_coverage` enforces this.
5. **Three inline examples** (private letter at bootstrap, public proclamation, found forged document) showing the full DA + SE + PG + BEL + CHC bundle. Source from the report's §13 Examples 1, 2, 3.
6. **Anti-patterns.** From the report's copy-pasteable spec §Anti-patterns; eight items (creating DA for trivial signs, treating body as branch truth, using `truth_relation: true` without support, missing propagation, inaccessible choice grounding, modeling physical letter only as DA when custody matters, duplicating instead of superseding/BEL, promoting DA claims without `story-fact-promotion-to-canon`).

**FOUNDATIONS alignment**: §Story Bundles §6a Belief vs. Fact (DA does not collapse into SF); §Story Bundles §6b Information / Observer Firewall (DA access must be reachable through valid route); §Story Bundles §5b Schema-Minimalism (reference does not propose new fields); §Canon Layers §4 Contested Canon (DA is the story-local analogue of contested-canon legends / propaganda / testimony).

**Acceptance criteria**:
- File exists at `.claude/skills/_shared-templates/da-authoring-reference.md`.
- All six sections present with the specified content.
- Cross-references to `story-record-schemas.md` §4.5.10, story-state-contract.md §4.1 and §5 are concrete (file path + section).
- Three examples are full DA + SE + PG + BEL + CHC bundles with correct field syntax.

#### D2 — Amend `.claude/skills/_shared-templates/story-state-contract.md` §4.5.10 with DA-semantics commentary

**Implementation note (2026-05-17)**: `archive/tickets/SPEC38STOLOCDIE-002.md` landed this
as `story-state-contract.md` §4.5.10a. The live contract keeps the DA schema
definition in `story-record-schemas.md` §4.5.10 and records only additive
rules-of-use commentary in the main story-state contract.

**Problem**: §4.5.10 (lines 554–571 of `story-record-schemas.md`, contract-side commentary in `story-state-contract.md`) defines the DA schema fields but provides no rule-of-use commentary. Consumers cannot deduce from the schema alone that `truth_relation: true` requires branch/canon support, that `circulation: public|factional` triggers `expected_witness_coverage`, or that claims inside a DA do not propagate to SF or canon automatically.

**Change**: Add a §4.5.10a (or analogous adjacent subsection) commentary block to `story-state-contract.md` covering:

1. `truth_relation` is the relation of artifact CONTENT to branch/canon truth — not the reader's belief about the content. Reader belief lives in `BEL.belief_mode` / `BEL.truth_relation`.
2. `circulation` is artifact access/distribution state — not intended audience. `intended_audience` is who the artifact was meant for; `circulation` is who can actually access or receive it now.
3. Claims inside a DA do NOT become `SF` or `CF` automatically. Promotion to canon routes through `story-fact-promotion-to-canon` → `canon-addition`. Branch-truth establishment about DA content uses `SF` records that may cite the DA in `derived_from` but stand on independent branch evidence.
4. `circulation ∈ {public, factional}` triggers `expected_witness_coverage` enforcement: same-event BEL propagation through an indirect access route, or the `non_propagation:event_leaves_no_accessible_trace` tag in `SE.world_logic_rationale`.
5. `derived_from: [DA-N]` is ambiguous between world-level (`worlds/<slug>/diegetic-artifacts/DA-N.md`) and story-local (`worlds/<slug>/stories/<story>/_source/artifacts/DA-N.yaml`) namespaces. Until SPEC-N+ ships namespace resolution, prefer body annotation ("derived from world-level Council Edict DA-12") over `derived_from` for cross-namespace references.

Cross-reference `da-authoring-reference.md` from this commentary for the full triage rubric and decision matrix.

**FOUNDATIONS alignment**: §Story Bundles §5b Schema-Minimalism (commentary; no schema changes); §Story Bundles §6a Belief vs. Fact (DA claim vs reader belief distinction); §Story Bundles §6b Information / Observer Firewall (propagation discipline).

**Acceptance criteria**:
- §4.5.10 (or §4.5.10a) commentary block present in `story-state-contract.md` with all five rule-of-use points.
- Cross-reference to `da-authoring-reference.md` is concrete (file path).
- No schema fields added or removed.

### Tier 2 — Skill amendments

#### D3 — Amend `.claude/skills/branching-story-bootstrap/SKILL.md` with DA-triage step

**Implementation note (2026-05-17)**: `archive/tickets/SPEC38STOLOCDIE-003.md` landed the
bootstrap amendment as an additive Phase 3 DA-triage paragraph and updated the
DA output-table row to point operators at that sub-step. The landed wording
uses the shared reference path directly for §Triage, §Decision matrix, and
§Patch obligations.

**Problem**: `SKILL.md:131` mentions DA only in the output table as `IF an in-story diegetic artifact is in play at opening`. No triage step exists, no decision logic for DA-vs-STOBJ-vs-BEL-vs-SF, no opening-access guidance.

**Change**: Add a sub-step inside the bootstrap phase that authors initial story-bundle records (currently the Phase covering "Create initial debts / OBL / CNSQ / THR / SREL records"). Recommended placement: as an explicit sub-step before SE-1 state delta is finalized. Content:

```
**DA triage at opening.** Scan the user premise, opening scene, starting inventory,
faction briefings, rumors, public notices, private letters, requested clues,
maps, recordings, inscriptions, object-with-text, and existing world-level DA
references. For each candidate, apply the triage rubric and decision matrix at
`.claude/skills/_shared-templates/da-authoring-reference.md` §Triage and
§Decision matrix. Create a DA only when content / authorship / circulation /
truth relation has persistent state value. For every bootstrap DA, satisfy
the patch obligations at `da-authoring-reference.md` §Patch obligations
(allocate via `story_da_ids`; create via `append_story_diegetic_artifact_record`;
include in `SE-1.state_delta.create[]` and `PG-1.state_snapshot.active_records.DA[]`;
create BEL for initial readers; create STOBJ if physical custody matters;
satisfy `expected_witness_coverage` for `public`/`factional` circulation).
```

**FOUNDATIONS alignment**: §Story Bundles §6b Information / Observer Firewall (opening-access discipline); Rule 1 No Floating Facts (DA needs author, audience, circulation, truth relation, downstream use).

**Acceptance criteria**:
- DA-triage sub-step present in the relevant bootstrap phase.
- Cross-references to `da-authoring-reference.md` sections are concrete.
- Output table at line 131 cross-references the new sub-step.

#### D4 — Amend `.claude/skills/branching-story-turn-cycle/SKILL.md` Phase 3 with DA-triage step; reinforce Phase 4 cross-reference

**Problem**: Phase 3 (`SKILL.md:289`) lists DA creation/alteration as one delta operation among many ("Create or alter story-local artifacts (`DA` new or supersession)") with no triage prompt. Phase 4 (`SKILL.md:325`) correctly documents the `expected_witness_coverage` propagation discipline but does not cross-reference the shared reference's broader DA-authoring rubric.

**Change**:

1. Phase 3 amendment: add a sub-step immediately before the state-delta materialization step:

```
**DA creation / supersession / derivation triage.** Before finalizing
`SE.state_delta`, scan the selected choice / write-in / event effects for
written, found, read, posted, forged, translated, copied, redacted, damaged,
broadcast, suppressed, or destroyed communicative artifacts. Apply the
triage rubric and decision matrix at
`.claude/skills/_shared-templates/da-authoring-reference.md` §Triage and
§Decision matrix to decide whether the turn should create a new DA, supersede
an existing DA, create a derived DA (`derived_from: [DA-*]`), or modify only
BEL / SF / STOBJ. Satisfy the patch obligations at §Patch obligations for
every DA created or superseded.
```

2. Phase 4 amendment: tighten the existing propagation paragraph (currently at line 325) to add a sentence cross-referencing the shared reference:

```
For the full circulation-and-propagation rule set including the BEL access-route
enum, non-propagation tag syntax, and worked examples, see
`.claude/skills/_shared-templates/da-authoring-reference.md` §Field semantics
and §Patch obligations.
```

**FOUNDATIONS alignment**: §Story Bundles §4 Write Discipline (DA writes route through `append_story_diegetic_artifact_record`); §Story Bundles §6b Information / Observer Firewall (turn-cycle is the primary site where DA-driven access shifts manifest).

**Acceptance criteria**:
- Phase 3 DA-triage sub-step present and cross-referenced.
- Phase 4 propagation paragraph adds the cross-reference sentence without removing the existing `expected_witness_coverage` description.

#### D5 — Amend `.claude/skills/branching-story-health-audit/SKILL.md` with DA-specific Phase 2 checks

**Problem**: Phase 2a–2h has zero DA-specific checks (verified). The audit covers BEL/visibility, mystery/canon safety, and continuation health but does not check DA active-record consistency, CHC.grounded_in.records[].DA accessibility, duplicate-DA presence, or body specificity.

**Change**: Add a new Phase 2-sub-section `2x — DA health` (placement: after 2d belief/visibility health, before 2e mystery/canon safety). Content covers four checks:

1. **CHC active-record DA accessibility** (consumes D10 validator). Every `DA-<integer>` in any active `CHC.grounded_in.records[]` MUST be in the emitting PG's `state_snapshot.active_records.DA[]`. Verdict code `chc_grounded_in_da_not_active` (D10) surfaces violations. FAIL.
2. **Duplicate DA heuristic** (consumes D11 validator). WARN when multiple active DAs share `(title + author)` exactly, or when their `body` fields exceed a similarity threshold, without one referencing the other via `supersedes` or `derived_from`. Verdict code `story_da_duplicate_heuristic` (D11) surfaces candidates; the audit lists each cluster for operator review.
3. **DA body specificity** (authorial; no validator). WARN when a DA body matches non-specific patterns such as "contains a clue", "reveals a secret", "describes the truth", "explains everything", or otherwise lacks the clue-bearing content that later quotation / comparison / audit would require. Phase 2x scans active DA bodies and lists candidates for operator review; no verdict-code consumption — the audit prose names the DAs and points the operator at `da-authoring-reference.md` §Field semantics §body.
4. **Cross-reference to existing validators.** Phase 2x prose notes that `expected_witness_coverage` (public/factional DA propagation) and `record_schema_compliance` (DA schema enum violations) already cover their respective surfaces and are not re-implemented here.

**FOUNDATIONS alignment**: Rule 1 No Floating Facts (DA must remain reachable from its grounding choices); §Story Bundles §6b Observer Firewall (CHC grounding access is the runtime firewall enforcement point).

**Acceptance criteria**:
- Phase 2x section present at the specified placement.
- All four checks described with their verdict codes (where applicable) and operator-action guidance.
- Cross-reference to existing validators is concrete.

#### D6 — Amend `.claude/skills/branching-story-prose-attach/SKILL.md` with load-bearing artifact-mention check

**Problem**: The `invented_structural_fact` deterministic check at `SKILL.md:204-218` catches prose that asserts a named record id absent from state, but does not catch prose mentioning a load-bearing artifact in narrative phrasing ("a letter arrived bearing the king's seal", "she unfolded the map", "the proclamation was nailed to the door") without a corresponding DA in `PG.state_snapshot.active_records.DA[]`.

**Change**: Add a new deterministic check sub-section to Phase 3 (placement: immediately after the existing `invented_structural_fact` block at lines 204–218). Content:

```
**`prose_load_bearing_artifact_mention_without_da`**: scan rendered prose for
load-bearing artifact phrases (letter, map, diary, decree, log, recording,
inscription, confession, notice, ledger, transcript, briefing, proclamation,
seal, codex, marginalia, redaction) used in a way that grounds knowledge,
choice availability, mystery progression, or character action. If such a
phrase appears AND the emitting PG's `state_snapshot.active_records.DA[]`
contains no DA matching the artifact's diegetic role, emit verdict
`prose_load_bearing_artifact_mention_without_da` (WARN-level by default;
FAIL when the prose explicitly quotes the artifact's content or describes
the protagonist's access to it). Recommended repair: route the deviation
through the prose-attach disposition table (structural-fact issue → run a
repair turn that creates the DA + BEL + optional STOBJ).
```

D6 implementation depends on D12 (validator).

**FOUNDATIONS alignment**: §Story Bundles §4a Plan-Authority Boundary (prose is a rendering of state; prose-introduced load-bearing artifacts violate the boundary); Rule 1 No Floating Facts (load-bearing prose mentions without state-record backing are floating facts in prose).

**Acceptance criteria**:
- New check sub-section present with the specified verdict code.
- Pattern list explicitly enumerated.
- WARN/FAIL severity split documented.
- Repair routing references the existing disposition table.

#### D7 — Amend `.claude/skills/commitment-block-authoring/SKILL.md` with `artifact_accessible` reference + anti-pattern

**Problem**: The `artifact_accessible(STENT, DA)` predicate is defined at story-state-contract §5 line 140 but not referenced in commitment-block-authoring's SKILL.md prose. The skill mentions "accessible `DA` / `STOBJ` evidence" in its Information / Observer Firewall paragraph (line 256) but does not name the predicate or warn against SLT preconditions that depend on DAs whose existence the storylet author cannot guarantee at runtime.

**Change**:

1. In the Information / Observer Firewall paragraph (around `SKILL.md:256`), add an explicit predicate reference:

```
For DA-grounded eligibility, use the `artifact_accessible(STENT-<n>, DA-<n>)`
predicate (story-state-contract.md §5). Pair with `any_belief(...)` when the
content is known through belief rather than current artifact access. See
`.claude/skills/_shared-templates/da-authoring-reference.md` §Field semantics
for the access-route semantics that ground this predicate.
```

2. Add an anti-pattern entry to the skill's Anti-Patterns section (or equivalent):

```
**Do not fabricate DA existence in SLT preconditions.** An SLT may require
`artifact_accessible(...)` or `any_belief(... access_route=document ...)` over
an EXISTING DA, but the storylet itself does not create DA records. DA
creation belongs to runtime state deltas authored by `branching-story-bootstrap`
or `branching-story-turn-cycle`. An SLT precondition naming a `DA-<n>` that no
runtime delta has created will silently never bind; the validator's
`storylet_predicate_dsl_parsability` rule cannot detect this, since predicate
parsability does not verify record existence at authoring time.
```

**FOUNDATIONS alignment**: §Story Bundles §6b Information / Observer Firewall (SLT bindings must respect actor access); §Story Bundles §5b Schema-Minimalism (storylets do not extend record-creation surface).

**Acceptance criteria**:
- `artifact_accessible` predicate explicitly referenced in the firewall paragraph.
- Anti-pattern entry present with the no-fabrication rule.
- Cross-references to story-state-contract.md §5 and da-authoring-reference.md are concrete.

#### D8 — Amend `.claude/skills/story-fact-promotion-to-canon/SKILL.md` with FOUNDATIONS §365 routing rule

**Implementation note (2026-05-17)**: `archive/tickets/SPEC38STOLOCDIE-008.md` landed
the DA routing paragraph in `story-fact-promotion-to-canon` and truthed adjacent
`source_basis.derived_from[]` comments. `archive/tickets/SPEC38STOLOCDIE-013.md`
then aligned the Canon Fact schema with the live FOUNDATIONS/canon-addition
contract by allowing `CHAR-*` in `source_basis.derived_from[]` while keeping
`pre_figured_by[]` CF-only. The landed skill therefore keeps authoring `SE-*`
provenance in `proposal_evidence` and routes story-local `DA-*` / `CHAR-*`
pre-figurement through `candidate.source_basis.derived_from[]`.

**Problem**: `SKILL.md:115` registers `artifact_canonization` as a `source_kind` taking a story-local `DA-<integer>` plus authoring `SE`, but does not surface FOUNDATIONS line 365's binding rule: "Diegetic-artifact or character pre-figurement belongs in `source_basis.derived_from` alongside any contributing CF parents, preserving Rule 6 audit-trail routing without widening `pre_figured_by` beyond CF references." Without an explicit anchor, operators authoring `artifact_canonization` packages can plausibly place the source DA in `candidate.pre_figured_by[]`; schema validation will reject it at adjudication, wasting one round-trip.

**Change**: Add a paragraph in the proposal-package-authoring section (recommended placement: immediately adjacent to the existing `artifact_canonization` source-kind documentation at line 115). Content:

```
**DA-to-CF routing rule (FOUNDATIONS line 365).** When `source_kind:
artifact_canonization`, the source `DA-<integer>` is recorded in
`candidate.source_basis.derived_from[]` alongside any contributing CF parents
and any contributing `SE-<integer>` events. **Do NOT** place the source DA in
`candidate.pre_figured_by[]`; that field is CF-only per FOUNDATIONS line 365,
and `record_schema_compliance` will reject CF candidates with non-CF
`pre_figured_by[]` references at adjudication time. The same routing rule
applies to character pre-figurement (CHAR records also belong in
`source_basis.derived_from`, not `pre_figured_by`).
```

**FOUNDATIONS alignment**: line 365 verbatim; Rule 6 No Silent Retcons (audit-trail routing through `source_basis.derived_from` preserves the lineage).

**Acceptance criteria**:
- Routing-rule paragraph present at or near the `artifact_canonization` source-kind row.
- Explicit prohibition on `pre_figured_by[]` DA references.
- Cross-reference to FOUNDATIONS line 365.

#### D9 — Amend `.claude/skills/story-promotion-closeout/SKILL.md` with DA-supersession-only-on-field-change reinforcement

**Implementation note (2026-05-17)**: `archive/tickets/SPEC38STOLOCDIE-009.md` landed the
three worked examples immediately after the existing `artifact_canonization`
DA-supersession rule. The landed examples preserve the existing rule and clarify
ledger-only versus supersession outcomes for accepted unchanged claims, accepted
field clarifications, and rejected claims.

**Problem**: `SKILL.md:187` already states "For `source_kind: artifact_canonization`, supersede story-local `DA` only if a §4.5.10 field changes. World-level DA linkage is recorded in the closeout ledger." The rule is correct but compact; the worked-example set does not cover the common ambiguity cases (canon adds context but does not change a §4.5.10 field; canon clarifies truth_relation; canon contradicts the DA's claim but the DA's content is the artifact, not the claim).

**Change**: Expand the existing rule with three worked-disposition examples:

```
Worked examples of when DA supersession is and is NOT triggered by closeout:

- **NOT triggered**: canon-addition accepts the DA's central claim as a CF, but
  the DA's §4.5.10 fields (`title`, `author`, `genre`, `body`, `intended_audience`,
  `circulation`, `truth_relation`, `supersedes`, `derived_from`) are unchanged.
  Record the verdict in the closeout ledger; do not supersede the DA. The
  CF's `source_basis.derived_from[]` includes the DA-id as audit trail.
- **Triggered**: canon-addition accepts the DA's claim AND clarifies a field
  the DA carried in an ambiguous state — e.g., `truth_relation` was `contested`
  at authoring and is now `true` per the accepted CF; or `circulation` shifts
  because the closeout reveals factional propagation the original DA did not
  record. Supersede the DA via `append_story_diegetic_artifact_record` with
  `supersedes: DA-<old>` and the corrected fields; record the supersession
  cause in the closeout ledger.
- **NOT triggered**: canon-addition rejects the DA's claim. The DA remains
  active with its original `truth_relation` (typically `contested` or `false`);
  the rejection is recorded in the closeout ledger. The DA continues to exist
  as branch-local in-world evidence even when its claim does not promote.
```

**FOUNDATIONS alignment**: Rule 6 No Silent Retcons (supersession with cause vs ledger-only verdict); §Story Bundles §4 Write Discipline (DA supersession routes through patch engine).

**Acceptance criteria**:
- Three worked examples present at or adjacent to the existing rule at line 187.
- Each example names whether supersession is triggered and why.
- Closeout-ledger-vs-supersession distinction explicit.

### Tier 3 — Validator additions

#### D10 — New validator `chc_grounded_in_artifact_accessible` (rule)

**Problem**: A CHC's `grounded_in.records[]` may legitimately include `DA-<integer>` references (story-record-schemas.md §4.5.12 line 603), but no validator currently enforces that every such DA is active in the emitting page's `state_snapshot.active_records.DA[]`. The verified gap in the audit (D5 check 1) requires this validator.

**Change**: Add `tools/validators/src/rules/chc-grounded-in-artifact-accessible.ts`. The validator:

1. Iterates over every CHC record in scope.
2. For each `DA-<integer>` in `CHC.grounded_in.records[]`:
   - Locates the emitting PG (the page whose `state_snapshot.active_records.CHC[]` contains this CHC).
   - Verifies the DA is in that PG's `state_snapshot.active_records.DA[]`.
   - If missing, emits verdict `chc_grounded_in_da_not_active` with message naming the CHC id, DA id, and emitting PG id.
3. Registered in the validator registry alongside the existing CHC-related rules.

**Test extension** at `tools/validators/tests/rules/chc-grounded-in-artifact-accessible.test.ts`. Minimum four tests:

- `chc_grounds_in_active_da_passes` — CHC grounds in DA-1; DA-1 is in emitting PG's active records. Expect pass.
- `chc_grounds_in_inactive_da_fails` — CHC grounds in DA-1; DA-1 is NOT in emitting PG's active records. Expect verdict `chc_grounded_in_da_not_active`.
- `chc_grounds_in_superseded_da_fails` — CHC grounds in DA-1; DA-1 has been superseded by DA-2 and is no longer in active records. Expect verdict.
- `chc_with_no_da_grounding_passes` — CHC grounds in BEL + SF only, no DA. Expect pass (no DA-related verdicts).

**FOUNDATIONS alignment**: §Story Bundles §6b Information / Observer Firewall (choice grounding must respect runtime accessibility); Rule 1 No Floating Facts (CHC must remain reachable from its grounding records).

**Acceptance criteria**:
- Validator implemented and registered.
- All four tests pass.
- `npm test` in the `tools/validators` package produces no regressions.

#### D11 — New validator `story_da_duplicate_heuristic` (structural)

**Problem**: Health-audit (D5 check 2) needs duplicate-DA detection but no validator currently surfaces it. Duplicate DAs arise from operator error during turn-cycle authoring when the operator forgets to supersede an existing DA or to use `derived_from` for a copy.

**Change**: Add `tools/validators/src/structural/story-da-duplicate-heuristic.ts`. The validator:

1. Loads all active DA records in the story bundle (per the latest PG's `state_snapshot.active_records.DA[]`).
2. Clusters by `(title, author)` exact match.
3. For each cluster of size > 1, checks whether at least one supersession or derivation chain links them (`DA-A.supersedes == DA-B` or `DA-A.derived_from contains DA-B`).
4. If no chain, emits verdict `story_da_duplicate_heuristic` with WARN severity, message naming the cluster's DA ids.
5. Optionally extends to body-similarity clustering (Levenshtein or token-overlap threshold). Body-similarity is parameterized; default threshold disabled in v1, enabled via opt-in config. Title+author clustering is mandatory in v1.

**Test extension** at `tools/validators/tests/structural/story-da-duplicate-heuristic.test.ts`. Minimum three tests:

- `distinct_da_pair_passes` — DA-1 and DA-2 with different `(title, author)`. Expect pass.
- `title_author_cluster_without_chain_warns` — DA-1 and DA-2 share `(title, author)`, no supersession or derivation linking them. Expect verdict `story_da_duplicate_heuristic`.
- `title_author_cluster_with_supersession_passes` — DA-1 and DA-2 share `(title, author)`, DA-2 `supersedes: DA-1`. Expect pass.

**FOUNDATIONS alignment**: Rule 6 No Silent Retcons (duplicate DAs without supersedes/derived_from break the audit trail); §Story Bundles §5b Schema-Minimalism (supersedes/derived_from are the canonical reconciliation mechanism).

**Acceptance criteria**:
- Validator implemented and registered (structural class).
- Three tests pass.
- WARN severity confirmed; verdict surfaces in health-audit Phase 2x.

#### D12 — New validator `prose_load_bearing_artifact_mention` (rule)

**Problem**: Prose-attach (D6) needs the pattern-detection logic to catch prose mentioning load-bearing artifacts absent from state, but no validator currently surfaces this.

**Change**: Add `tools/validators/src/rules/prose-load-bearing-artifact-mention.ts`. The validator:

1. Loads the rendered prose at `pages-prose/PG-<integer>.md` and the corresponding PG's `state_snapshot.active_records.DA[]`.
2. Scans prose tokens for the load-bearing artifact pattern set: `letter, map, diary, decree, log, recording, inscription, confession, notice, ledger, transcript, briefing, proclamation, seal, codex, marginalia, redaction, warrant, testimony, missive, dispatch, manifest, charter, edict, treaty, will, oath` (extensible via constants module).
3. For each match, applies a context filter: the match must appear in a sentence that grounds knowledge, choice availability, mystery progression, or character action (heuristic: presence of action verbs like `read | quoted | cited | revealed | followed | found | discovered | unfolded | opened | sealed | hid | burned | translated | forged` near the noun, OR appearance in a paragraph that names a CHC the page emits).
4. Filters out matches whose context already names a DA-id in active records or whose surrounding prose explicitly disclaims the artifact ("not a real letter, just a metaphor").
5. For each surviving match, checks whether `PG.state_snapshot.active_records.DA[]` contains any DA whose `genre` or `title` plausibly matches the noun (loose matching; explicit DA-id mention satisfies; otherwise emits verdict).
6. Emits verdict `prose_load_bearing_artifact_mention_without_da` with WARN severity by default; FAIL when the prose explicitly quotes the artifact content (heuristic: presence of quoted-string spans naming the artifact).

**Test extension** at `tools/validators/tests/rules/prose-load-bearing-artifact-mention.test.ts`. Minimum four tests:

- `prose_mentions_letter_with_matching_da_passes` — prose says "Rell read the letter again", PG has DA-1 with `genre: private letter`. Expect pass.
- `prose_mentions_letter_without_da_warns` — prose says "Rell read the letter again", PG has no DA in active records. Expect verdict `prose_load_bearing_artifact_mention_without_da` at WARN.
- `prose_quotes_artifact_without_da_fails` — prose contains `"By order of the River Guard, no ferry shall cross after moonrise"` styled as artifact-content, PG has no DA. Expect verdict at FAIL.
- `prose_metaphor_passes` — prose says "her words were a letter to her future self", clear metaphor. Expect pass (context-filter exclusion).

**FOUNDATIONS alignment**: §Story Bundles §4a Plan-Authority Boundary (prose-introduced artifacts violate the boundary); Rule 1 No Floating Facts.

**Acceptance criteria**:
- Validator implemented and registered.
- All four tests pass.
- Pattern list, context-filter heuristics, and quoted-content detection documented inline.

---

## FOUNDATIONS Alignment

| Principle | Stance | Rationale |
|---|---|---|
| §Story Bundles §1 (per-world derived layer) | aligns | Spec lands inside the story-bundle pipeline; DA records remain story-local under `worlds/<slug>/stories/<story>/_source/artifacts/`. |
| §Story Bundles §4 Write Discipline | aligns | All DA mutations route through `append_story_diegetic_artifact_record` via the patch engine; no direct writes; no new ops. |
| §Story Bundles §4a Plan-Authority Boundary | aligns | D6 (prose-attach DA-mention check) operationalizes the boundary by detecting prose-introduced artifacts; spec does not weaken plan-authority. |
| §Story Bundles §5b Schema-Minimalism | aligns | Zero new schema fields; spec defers all four schema-extension options (`source_world_artifact`, `carrier_object`, `body_mode`, `claims[]`) to §Risks. |
| §Story Bundles §6a Belief vs. Fact | aligns | D2 commentary makes the DA-claim-vs-reader-belief distinction explicit; D5 audit checks preserve the separation; D8 routing rule preserves DA-as-evidence vs CF-as-canon distinction. |
| §Story Bundles §6b Information / Observer Firewall | aligns | D10 enforces CHC.grounded_in DA accessibility; D7 enforces SLT-precondition DA accessibility; D3/D4 prescribe BEL creation for initial DA readers; existing `expected_witness_coverage` covers public/factional propagation (R16 confirms position). |
| §Canon Layers §4 Contested Canon | aligns | DA is the story-local analogue of contested canon (legends, propaganda, testimony); D1 reference codifies this explicitly. |
| Rule 1 No Floating Facts | aligns | D1 triage rubric requires author / circulation / truth-relation / downstream-use before DA creation; D10 + D11 + D12 keep DAs reachable from their grounding context. |
| Rule 6 No Silent Retcons | aligns | D9 disambiguates supersession-vs-ledger discipline; D11 surfaces duplicate-DA candidates that would otherwise constitute silent retcons; FOUNDATIONS line 365 routing rule (D8) preserves the audit trail through `source_basis.derived_from`. |
| FOUNDATIONS line 365 (DA → `source_basis.derived_from`) | aligns | D8 surfaces the routing rule at the proposal-authoring surface; spec explicitly forbids `pre_figured_by[]` DA references. |

---

## Verification

Per-deliverable acceptance criteria above. Cross-cutting checks:

1. **No `_source/` schema files modified.** The DA schema at `tools/validators/src/schemas/story-diegetic-artifact.schema.json` is unchanged. Verify via `git diff` showing zero deletions from or additions to that file across the spec's implementation.
2. **No new patch-engine ops.** The op vocabulary at `tools/patch-engine/src/envelope/schema.ts:91` is unchanged. Verify via `git diff`.
3. **No new ID classes.** `tools/world-mcp/src/tools/allocate-next-id.ts` STORY_SCOPED_ID_CLASS_DIRECTORIES map is unchanged.
4. **Existing `expected_witness_coverage` test suite continues to pass.** `cd tools/validators && npm test` produces zero regressions on the existing public/factional-DA-propagation tests.
5. **All three new validators (D10, D11, D12) have ≥3 tests each and pass.**
6. **All seven amended SKILL.md files (D3–D9) cross-reference `_shared-templates/da-authoring-reference.md` by path.**
7. **`_shared-templates/da-authoring-reference.md` exists with all six sections and three worked examples.**

---

## Out of Scope

- **Schema additions**: `source_world_artifact`, `carrier_object`, `body_mode`, structured `claims[]`. All deferred to §Risks; spec does not introduce schema changes.
- **Standalone DA-authoring skill**: rejected in favor of the `_shared-templates/` reference. Worldloom's cross-skill-content convention is the controlling factor; revisit only if the reference grows past its scope and gains an independent invocation path.
- **Cross-namespace DA reference resolution** (world-level vs story-local `DA-*`): the ambiguity is real but no concrete pattern has yet bitten any pilot story bundle. D1 prescribes body annotation as the interim workaround; full namespace resolution (e.g., `world:DA-12` prefix in `derived_from`, or a new `source_world_artifact` field) routes to a future spec when pattern evidence emerges.
- **Remaining 9 audit checks from the report §10** beyond D5's three: circulation/BEL mismatch detection, suppressed-artifact custody check, `truth_relation: true` without support, body-overlength info-level warning, world-level DA import ambiguity warning, suppressor evidence check, and the further error-level conditions duplicating existing validator coverage. All routed to §Risks for follow-up.
- **DA-to-CF promotion criteria refinement**: this spec adds D8's routing rule but does not change the criteria under which `artifact_canonization` proposals get accepted/rejected. That surface lives in `canon-addition`'s Phase 5 / Phase 7 logic and is out of scope.
- **World-level DA skill (`.claude/skills/diegetic-artifact-generation/`) changes**: the world-level DA pipeline is unchanged; D1 references it only as a contrast point for the decision matrix (when to use world-level vs story-local).
- **Example freestanding world records** (report §14 step 7): rejected per §Key design decisions; examples embed in D1 inline.

---

## Risks & Open Questions

1. **World-level vs story-local `DA-*` namespacing** `(pragmatic — deferred)`. `derived_from: [DA-12]` is ambiguous between the two namespaces. D1 prescribes body annotation as the interim workaround; full resolution requires either (a) a new `source_world_artifact: DA-<integer>` optional field on the story-local DA schema, or (b) a namespaced reference convention (`world:DA-12`) in `derived_from`. Defer to a follow-up spec when concrete usage patterns demonstrate the workaround's friction.

2. **The remaining 9 audit conditions from the report §10** `(pragmatic — scoping)`. The narrowed Tier 3 surface (D10 + D11 + D12 + D5's body-specificity authorial warning) lands the load-bearing checks; the additional warnings (circulation/BEL mismatch, suppressed-artifact custody, `truth_relation: true` without support, body-overlength, world-level DA import ambiguity, suppressor evidence, multi-event BEL drift after DA supersession) await pilot-bundle evidence demonstrating audit value. Under no-scope-constraint conditions, more would land here. Worked precedent: SPEC-37 D2 landed `expected_witness_coverage` with public-DA-trace scope only, deferring multi-location-supersession and STENT-death cues to a future iteration on the same model.

3. **Body-similarity clustering for D11 duplicate detection** `(pragmatic — scoping)`. D11 lands title+author exact-match clustering in v1 with body-similarity as an opt-in extension. If pilot audit reveals duplicate DAs that share intent but differ in title (e.g., "Mira's Letter" vs "Letter from Mira" vs "The Blue Wax Letter"), enable the body-similarity threshold in a follow-up. Choice of similarity metric (Levenshtein, token-overlap, embedding) is left to the implementer and bounded by performance: the validator runs at health-audit time, not at every patch.

4. **D12 pattern-list completeness** `(pragmatic — corpus-driven)`. The artifact noun list in D12 is finite and English-only. As story bundles surface artifact types not in the list (relic, codex, banner-with-text, etc.), the list extends. Mitigation: list lives in a single constants module; pull-request friction is one file edit. Internationalization is out of scope (worldloom is currently English-only).

5. **Shared-reference scope creep risk**. The shared reference may accumulate additional discipline as story-pipeline maturity grows (cross-bundle DA dependencies, DA-driven Phase 4 cadence policy, DA promotion patterns). Mitigation: D1 ships with the six specified sections only; future additions route through skill-extract-references or skill-consolidate to keep the file scannable. Target ceiling: 600 lines.

6. **D6 false-positive rate**. The prose-attach pattern detector (D12) is heuristic; load-bearing-artifact prose is contextual and the heuristic will miss some cases (false negatives) and over-flag others (false positives). The WARN-default-FAIL-on-quotation split is the calibration handle; if pilot prose runs surface persistent false-positive churn, the threshold for FAIL escalation moves up. Quantitative tuning awaits pilot prose corpus.

7. **Skill-prose churn across seven SKILL.md files**. D3–D9 collectively edit seven SKILL.md files. Each edit is bounded and cross-references the same shared reference, but the implementation cost is non-trivial. Mitigation: per-file edits are independent and parallelizable; no cross-file edit dependencies. Ticket decomposition (one ticket per amended skill) maps cleanly.

---

## Outcome

(To be filled at implementation completion.)
