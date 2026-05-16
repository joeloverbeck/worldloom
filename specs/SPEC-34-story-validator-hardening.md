<!-- spec-drafting-rules.md not present; using default structure + Deliverables + Risks & Open Questions. -->

# SPEC-34 — Story Validator Hardening

**Status**: ACTIVE
**Date**: 2026-05-16
**Supersedes**: none (extends `archive/specs/SPEC-33-story-pipeline-seventh-iteration-fixes.md` §Risks "Missing audit-named validators")
**Companion triage**: `docs/triage/2026-05-16-story-related-improvements-seventh-iteration-triage.md` — SPEC-34 is the validator-hardening follow-up named in the triage's "Cross-spec follow-ups" section under SPEC-33.
**Implementation note (2026-05-16)**: D1 `branch_isolation` landed and was archived at `archive/tickets/SPEC34STOVALHAR-001.md`; D2 `observer_firewall` landed and was archived at `archive/tickets/SPEC34STOVALHAR-002.md` with schema-valid CHC enforcement focused on BEL grounding plus SLT holder consistency and defensive malformed-SF coverage; D3 `lie_promoted_silently` landed and was archived at `archive/tickets/SPEC34STOVALHAR-003.md` with same-package registry/inventory proof; D4 `canon_baseline_drift` landed and was archived at `archive/tickets/SPEC34STOVALHAR-004.md` with CH-window, closed-enum, registry, and full-suite proof; D5 remains active as the capstone.

## Problem Statement

The seventh-iteration audit (per `reports/story-related-improvements-seventh-iteration.md` §11.3) and the seven story-pipeline skills' prose name four structural validators — `branch_isolation`, `observer_firewall`, `lie_promoted_silently`, and `canon_baseline_drift` — as the deterministic enforcement surfaces for FOUNDATIONS §Story Bundles §4b (Canon Baseline Drift), §5 (Validation Rules at Story Scope — Rule 4 No Globalization by Accident), §6a (Belief vs. Fact), and §6b (Information / Observer Firewall). Audit §11.3's prompt-coverage test plan expects each as a deterministic gate (or deterministic-subset gate for observer_firewall) — see lines 824 (`observer_firewall_violation`), 829 (`branch_isolation`), 834 (`canon_baseline_full_ch_window`), 844 (`global_author_pool_branch_local_leakage`), 855 (`belief_fact_separation_lies_rumors` → `lie_promoted_silently`). The shared story-state contract at `.claude/skills/_shared-templates/story-state-contract.md` §7 explicitly names `branch_isolation` as Eight-Shared-Hard-Gate 4 and Observer Firewall as part of gate 7. At spec intake, none of the four was implemented as a standalone validator in `tools/validators/src/structural/`; D1-D3 have since landed, while D4 remains the active implementation gap.

The closest current D4 coverage is `tools/validators/src/structural/canon-drift-classification-evidence.ts`, which audits drift-classification rationale evidence (does a classification cite a CH entry?) but does NOT perform the full CH-window traversal the audit's `canon_baseline_full_ch_window` test requires (a classification citing only the latest CH passes the existing validator even when intervening CH entries should have been considered). After D1-D3, the remaining absent standalone validator is `canon_baseline_drift`; its discipline lives at the hard-gate layer in PG-authoring skills (`branching-story-bootstrap`, `branching-story-turn-cycle`) but no validator-layer enforcement catches the remaining D4 violation when it slips past the hard gates or surfaces in non-authoring contexts (replay, drift classification, sibling-bundle audits).

This spec is **NOT** an implementation of unimplemented concepts. Each validator formalizes an existing skill-side discipline as a standalone structural validator that runs independently of the skills, parallel to the existing structural validators in `tools/validators/src/structural/` (16 at spec intake; 17 after D1). The validator-layer enforcement closes the gap audit §11.3 identified: deterministic gates must be exercisable as deterministic tests, and skill-side hard gates are not equivalent to standalone validators (the hard gate fires only when the skill is authoring; the validator fires whenever `world-validate` runs).

### Key design decisions

- **Considered combining the four validators into one cross-cutting `story-state-integrity` validator; chose four standalone validators because each targets a distinct FOUNDATIONS principle and a distinct invariant** (§5 Rule 4 for branch_isolation; §6b for observer_firewall; §6a for lie_promoted_silently; §4b for canon_baseline_drift). Combining them would obscure which principle each diagnostic enforces, force unrelated co-changes across the implementation, and complicate fixture authoring (one fixture per invariant is far cleaner than four invariants interleaved in one fixture set).

- **Considered deferring `observer_firewall` as judgment-assisted only (no validator); chose to implement a deterministic-subset validator** that enforces the verifiable rule at SE-binding time: for each SE that selects a CHC or accepts a write-in, the SE's actor must have an access route — recorded via active `BEL.basis.access_records[]` membership for the cited SF/BEL, or via public SE witness — to every load-bearing record cited in `CHC.grounded_in.records[]`; additionally, every `SLT` precondition of shape `belief_record(holder, BEL-<integer>, ...)` must bind to a BEL whose `holder` matches the predicate's `holder` argument. Semantic plausibility ("actor *could* have inferred this without an explicit BEL record") remains judgment-assisted at audit time per audit §11.3's "deterministic/judgment-assisted" classification. The deterministic subset is large enough to catch genuine information leakage (an SE referencing another actor's `visibility: private` BEL; a CHC.grounded_in.records[] entry the SE.actor cannot access; a `belief_record` predicate whose stated holder mismatches the BEL.holder) without overreaching into semantic territory where validator FAILs would be false positives.

- **Considered including the missing validators in SPEC-33; chose a separate spec `(pragmatic)` because each validator is a multi-file undertaking** (implementation + fixtures + registry update + tests) and combining all four with SPEC-33's nine deliverables would roughly double SPEC-33's blast radius. SPEC-33 §Risks named this deferral explicitly. Under no-scope-doubling-constraint conditions, the validators are structurally needed and would join SPEC-33; the deferral is cost-driven and reversible.

- **Considered making `canon_baseline_drift` extend the existing `canon-drift-classification-evidence.ts` rather than ship a new file; chose a new standalone file because the existing validator checks classification evidence (the rationale text and its CH-citation form), not the underlying classification correctness (latest-CH-only vs full-window traversal)** — extending the existing validator would conflate two distinct invariants. The standalone validator complements `canon-drift-classification-evidence.ts`: the existing validator answers "is there a classification rationale that cites a CH?", the new validator answers "is the classification itself correct under full CH-window traversal?". A child page can pass the existing validator (rationale cites latest CH) while the new validator flags it (the rationale missed an intervening CH that materially affects classification).

- **Considered cross-references between the four validators (e.g., `observer_firewall` consuming `branch_isolation`'s branch-path computation); chose validator independence — each validator self-contains its traversal logic.** Cross-validator coupling would create ordering dependencies in the registry and complicate fixture authoring. Modest duplication of branch-path / BEL-state extraction logic is acceptable; if duplication grows past 2-3 validator-internal copies, factor common helpers into `tools/validators/src/structural/utils.ts` (the existing shared utility module) as a follow-up refactor — out of scope for this spec.

- **Considered making `lie_promoted_silently` enforce on ALL SF supersession chains; chose to enforce only on the SF-derived-from-BEL case** — an SF whose `derived_from[]` contains a BEL ID with non-true `truth_relation` and whose `authority` is `branch_local` / `canon_candidate` / `canon_linked` (the lawful path is `branch_local_counterfactual`, which the validator allows). General SF supersession (SF derived from another SF, or from an SE event) is not "lie promotion" and is out of scope; the validator targets the specific belief → fact silent-conversion path that FOUNDATIONS §6a calls out.

---

## Approach

Four standalone structural validators, each following the established sibling pattern shared by the structural validators in `tools/validators/src/structural/` (16 at spec intake; 17 after D1):

- Implementation file at `tools/validators/src/structural/<name>.ts`. Each validator declares `severity_mode: "fail"` (15/16 existing structural validators use `"fail"`; only `canon-drift-classification-evidence` uses `"warn"` — D4 chooses `"fail"` because the §4b drift-classification contract is mandatory, not advisory).
- Each validator declares an `applies_to(ctx)` predicate mirroring sibling convention: gate execution to `ctx.run_mode === "full-world"` OR to the specific patch ops the validator targets (e.g., `create_pg_record` / `create_slt_record` / `create_chc_record` / `create_se_record` / `create_sf_record`) OR to touched files matching the relevant `_source/<class>/*.yaml` glob.
- Import + array-append in `tools/validators/src/public/registry.ts` (the `structuralValidators` array starting at line 29).
- Test fixture at `tools/validators/tests/structural/<name>.test.ts` exercising PASS and FAIL cases.

Each validator targets one FOUNDATIONS principle, walks story-bundle records under `worlds/<slug>/stories/<slug>/_source/`, and emits diagnostics with specific codes. The validators run via `world-validate` (the existing CLI bound at `tools/validators/dist/src/cli/world-validate.js`) without further CLI changes.

Implementation phasing recommendation (for ticket decomposition):

- **Phase 1**: D1 (`branch_isolation`) and D3 (`lie_promoted_silently`) — pure structural validators that don't need world-canon retrieval. Land first; they're the simplest deterministic checks.
- **Phase 2**: D2 (`observer_firewall`, deterministic subset) — requires walking actor BEL state and predicate-DSL preconditions. Heavier than Phase 1 but still story-bundle-internal.
- **Phase 3**: D4 (`canon_baseline_drift`) — requires world-canon CH-record retrieval (via `mcp__worldloom__get_records` or direct read of `worlds/<slug>/_source/change-log/`). Lands last because it's the only validator that crosses the story-bundle / world-canon boundary; it also coordinates with the existing `canon-drift-classification-evidence.ts` validator (the two complement each other; verify the boundary at implementation time).

No new patch-engine ops, no new MCP retrieval surfaces, no new schema fields. The blast radius is four new validator files + four new test fixtures + four registry edits.

---

## Deliverables

Deliverables grouped by FOUNDATIONS principle. Each is a single ticket boundary (one validator per ticket).

### D1 — `branch_isolation` structural validator (intake FOUNDATIONS §Story Bundles §5 Rule 4 + §7 gate 4; audit §11.3 line 829 `branch_isolation` + audit §11.3 line 844 `global_author_pool_branch_local_leakage`)

**Validator**: `tools/validators/src/structural/branch-isolation.ts`

**Severity mode**: `"fail"`.

**Applies to**: `run_mode === "full-world"` OR `create_pg_record` / `create_slt_record` patch ops OR touched files matching `^stories/[^/]+/_source/(pages|storylets)/(PG|SLT)-\d+\.yaml$`.

**Problem**: Eight-Shared-Hard-Gate 4 at story-state contract §7 states "No record from a sibling branch appears in this page's `state_snapshot.active_records`. No author-pool commitment block references branch-local record ids." This is enforced at the skill layer (PG-authoring) but not at the validator layer — a malformed bundle authored outside the skill (or a regression in skill enforcement) can pass `world-validate` today.

**Logic**:

1. For each `BR-<integer>` (branch record) in the bundle, compute its `branch_path` via the `parent_branch_id` chain (root → … → this branch). This is the lawful-ancestry set for branch-local records visible on this branch.

2. For each `PG-<integer>` (page record):
   - Determine the PG's branch from `PG.branch_id`.
   - For each story-local record ID in `PG.state_snapshot.active_records` (across all class-keyed sub-arrays per §4.2):
     - Look up the referenced record's `created_at_page` (the canonical "created in this branch" anchor per story-state contract §Branch-scope vocabulary).
     - Determine the referenced record's branch by walking `created_at_page → PG.branch_id` for that page.
     - Verify the referenced record's branch is in the current PG's branch_path (ancestor or self), OR the referenced record is a `bundle_genesis_record` (created at `PG-1`, visible globally unless later superseded).
     - If the referenced record's branch is a sibling (not in the branch_path and not bundle_genesis), emit `branch_isolation_violation`.

3. For each `SLT-<integer>` with `scope.visibility: global_author_pool`:
   - Walk `SLT.preconditions.hard` and `SLT.preconditions.soft` predicate-DSL expressions.
   - Walk `SLT.effects.create | supersede | close` and `SLT.exit_options[].likely_effects` for record-ID references.
   - For each record-ID reference, verify it is a `bundle_genesis_record` OR a world-scope ID (e.g., `CF-<integer>`, `CHAR-<integer>`, `ENT-<integer>`). If it is a `branch_local_record`, emit `global_storylet_references_branch_local`.
   - The closed predicate-DSL existential predicates (e.g., `any_belief(alias, …)`) bind aliases at runtime — these are NOT static record references and are NOT flagged by this check. The same exclusion applies to `bound:<alias>` references appearing inside `SLT.effects.{create,supersede,close}` and `SLT.exit_options[].likely_effects` (per contract §4.4 lines 324-326, 330): an alias-bound reference is resolved at SE-commitment time from the precondition that bound it and is NOT a static cross-branch leak.

**Diagnostics**:

- `branch_isolation_violation` — error. Cites the PG, the offending record ID, and the sibling-branch ID.
- `global_storylet_references_branch_local` — error. Cites the SLT, the offending record-ID reference, and the branch_local record's owning branch.

**Test fixtures** (`tools/validators/tests/structural/branch-isolation.test.ts`):

- Case 1: PG snapshot referencing only ancestor-branch + bundle-genesis records → PASS.
- Case 2: PG snapshot referencing an SF whose `created_at_page` is on a sibling branch → FAIL with `branch_isolation_violation`.
- Case 3: Global SLT with only bundle-genesis and world-scope references → PASS.
- Case 4: Global SLT citing a branch-local SF in its preconditions → FAIL with `global_storylet_references_branch_local`.
- Case 5: Global SLT using only existential predicates (e.g., `any_belief(alias, …)`) with no static record-ID references → PASS (existential aliases are runtime-bound, not static cross-branch leaks).

**Registration**: import + array-append in `tools/validators/src/public/registry.ts`.

**FOUNDATIONS alignment**: §Story Bundles §5 Rule 4 (No Globalization by Accident at story scope); §Story Bundles §7 gate 4 (Eight-Shared-Hard-Gate 4 — branch isolation).

---

### D2 — `observer_firewall` structural validator, deterministic subset (intake FOUNDATIONS §Story Bundles §6b + §7 gate 7; audit §11.3 line 824 `observer_firewall_violation`)

**Validator**: `tools/validators/src/structural/observer-firewall.ts`

**Severity mode**: `"fail"`.

**Applies to**: `run_mode === "full-world"` OR `create_se_record` / `create_slt_record` patch ops OR touched files matching `^stories/[^/]+/_source/(events|storylets)/(SE|SLT)-\d+\.yaml$`.

**Problem**: FOUNDATIONS §Story Bundles §6b (Information / Observer Firewall) requires that "storylet selection, emitted choices, and character actions must not rely on information unavailable to the acting entity." Story-state contract §7 gate 7 (plan grounding) names the firewall explicitly: "Observer Firewall also applies here: selected `SLT` actor-bindings, emitted choices, and character actions must rely only on information available to the acting entity or record a valid access route." Health-audit Phase 2d emits `observer_firewall_violation` findings at audit time, but no standalone validator catches violations at `world-validate` time.

**Where the actor comes from**: CHC has no `actor` field, and SLT.scope has no `actor_role` field (contract §4.5.12 lines 642-654; contract §4.4 lines 304-340 SLT.scope = {`visibility`, `branch_id`, `visible_branch_path_prefix`}). The acting entity is bound at SE-creation time via `SE.actor` (contract §4.3 line 220) and `SE.commitment.alias_bindings` (line 225). The validator therefore drives observer-firewall checks from SE records, not from CHCs or SLT preconditions in isolation.

**Logic** (deterministic subset — full firewall remains partially judgment-assisted):

1. For each `SE-<integer>` with `event_kind ∈ {selected_choice, write_in_attempt}`:
   - Resolve the acting entity from `SE.actor` (or, for alias-bound actor cases, the `STENT-<integer>` value in `SE.commitment.alias_bindings`).
   - Locate the CHC the SE resolves: walk `parent_page_id` → that PG's `input.choice_id` (which names the selected CHC) when `SE.event_kind == selected_choice`. For `write_in_attempt`, there is no CHC; the firewall check on this branch consumes only the SLT precondition checks at step 3.
   - For each record-ID in `CHC.grounded_in.records[]` (BEL/SF/STENT/STLOC/STOBJ/OBL/CNSQ/THR/SREL/DA per contract §4.5.12 line 652):
     - If the reference is a `BEL-<integer>`: verify the BEL's `holder` equals the acting entity, OR the BEL's `visibility ∈ {public, rumored, shared, factional}` (factional matches only when the actor belongs to the same faction). If neither holds, emit `observer_firewall_violation_actor_lacks_access`.
     - If the reference is a `BEL-<integer>` held by another actor with `visibility ∈ {private, suppressed, concealed}`: emit `observer_firewall_violation_private_belief_leak` (a stricter shape of `_actor_lacks_access` for the explicit-leak case).
     - If the reference is an `SF-<integer>`: verify the actor has an active BEL whose `holder` equals the acting entity AND whose `basis.access_records[]` contains the SF id (the recorded "actor learned this fact" route per contract §4.1 lines 79-82), OR the SF has been publicly witnessed via a prior public SE the actor was present for (matched by the actor's `STSTAT.location` matching `SE.targets`-or-`SE.actor`-co-located STLOC at the SE's page). If neither route exists, emit `observer_firewall_violation_no_access_route`.

2. For each `CHC-<integer>` emitted by a PG but never resolved by any SE in the bundle: the firewall check defers to the resolving SE; emitted-but-unresolved CHCs are not flagged.

3. For each `SLT-<integer>` precondition (`hard` + `soft`) — these are actor-unbound at schema time, so this is a schema-consistency check, not an actor-binding check:
   - For each `belief_record(holder, BEL-<integer>, mode?, confidence_floor?)` predicate: verify the BEL's actual `holder` matches the predicate's `holder` argument. Mismatch emits `observer_firewall_violation_predicate_holder_mismatch`. (This catches a class of authoring bugs where the SLT cites a BEL whose recorded holder cannot satisfy the predicate, regardless of which actor the SLT eventually binds.)
   - Existential predicates (`any_belief`, `any_consequence_pending`, …) are runtime-bound and not statically checked here.
   - `record_active(SF-<integer>)` and other actor-unbound exact-ID predicates do not carry actor information at SLT-schema time and are not checked here; their binding-time check is covered by step 1 (the SE that selects an SLT with such preconditions will be exercised via step 1's CHC.grounded_in or — for write-in attempts whose SE references the SF directly via state_delta or world_logic_rationale — by a parallel SE-grounded check that future iterations of this validator may add).

4. **Judgment-assisted carve-out** (NOT flagged by this validator):
   - "Actor could have inferred this from contextual clues" — semantic plausibility outside record-grounded access routes. This is the audit-finding territory health-audit Phase 2d currently covers via review of `BEL.basis.access_route` reasonableness; the standalone validator does not adjudicate.

**Diagnostics**:

- `observer_firewall_violation_actor_lacks_access` — error. Cites the SE, the actor, the resolved CHC, and the referenced BEL/SF id.
- `observer_firewall_violation_no_access_route` — error. Cites the SE, the actor, the SF, and the absent BEL/SE-witness evidence chain.
- `observer_firewall_violation_private_belief_leak` — error. Cites the SE, the leaking BEL, its actual holder, and the borrowing actor.
- `observer_firewall_violation_predicate_holder_mismatch` — error. Cites the SLT precondition, the predicate's holder argument, and the BEL's actual holder.

**Test fixtures** (`tools/validators/tests/structural/observer-firewall.test.ts`):

- Case 1: SE with `event_kind: selected_choice`, SE.actor = A; resolved CHC grounded in actor A's own active BEL (BEL.holder = A) → PASS.
- Case 2: SE with `event_kind: selected_choice`, SE.actor = A; resolved CHC grounded in another actor B's `visibility: private` BEL → FAIL with `observer_firewall_violation_private_belief_leak`.
- Case 3: SE with `event_kind: selected_choice`, SE.actor = A; resolved CHC grounded in SF-X; actor A has an active BEL with BEL.holder = A and BEL.basis.access_records contains SF-X → PASS.
- Case 4: SE with `event_kind: selected_choice`, SE.actor = A; resolved CHC grounded in SF-X; actor A has no active BEL with that SF in `basis.access_records[]` and no co-located prior public SE-witness chain → FAIL with `observer_firewall_violation_no_access_route`.
- Case 5: SLT precondition `belief_record(holder=role_protagonist, BEL-X, ...)` where BEL-X.holder ≠ the STENT bound to `role_protagonist` at any SE that selects this SLT → FAIL with `observer_firewall_violation_predicate_holder_mismatch`.
- Case 6: SE with `event_kind: selected_choice`, SE.actor = A; resolved CHC grounded only in `public` BEL records and world-scope CHAR/ENT references → PASS.

**Registration**: import + array-append in `tools/validators/src/public/registry.ts`.

**FOUNDATIONS alignment**: §Story Bundles §6b (Information / Observer Firewall); §Story Bundles §7 gate 7 (plan grounding — Observer Firewall clause).

---

### D3 — `lie_promoted_silently` structural validator (intake FOUNDATIONS §Story Bundles §6a; audit §11.3 line 855 `belief_fact_separation_lies_rumors`)

**Validator**: `tools/validators/src/structural/lie-promoted-silently.ts`

**Severity mode**: `"fail"`.

**Applies to**: `run_mode === "full-world"` OR `create_sf_record` patch op OR touched files matching `^stories/[^/]+/_source/facts/SF-\d+\.yaml$`.

**Problem**: FOUNDATIONS §Story Bundles §6a (Belief vs. Fact) requires `SF` records (branch truth) and `BEL` records (belief / claim / witness / lie) to remain separate so that "lies, secrets, betrayals, witness asymmetry, and contested public claims remain coherent." The lawful path for converting a counterfactual / false BEL into branch state is `SF.authority: branch_local_counterfactual` (explicit). The audit-failing pattern is BEL with `truth_relation: false | partly_true | contested | branch_counterfactual` silently promoted to `SF.authority: branch_local | canon_candidate | canon_linked` without the counterfactual marker — this collapses the belief / fact boundary.

**Boundary with `story-fact-authority.ts`**: the existing structural validator `tools/validators/src/structural/story-fact-authority.ts` enforces one orthogonal SF-authority invariant — `SF.authority == canon_linked` requires at least one `CF-<integer>` id in `derived_from[]` (`story_fact_authority.canon_linked_missing_cf_parent` diagnostic). It does NOT inspect BEL `truth_relation` for any of the four authority values; an SF with `authority: canon_linked` and `derived_from: [CF-3, BEL-13]` (where BEL-13 has `truth_relation: branch_counterfactual`) passes `story-fact-authority.ts` because CF-3 satisfies the CF-parent requirement. D3 catches that case (Case 6 below). The two validators are complementary: `story-fact-authority.ts` answers "does this canon-linked SF cite a CF?"; D3 answers "does any SF promoting from a non-true BEL carry the lawful `branch_local_counterfactual` authority?". Modest overlap on the canon_linked case is by design — different invariants converging on the same record class.

**Logic**:

1. For each `SF-<integer>` in the bundle:
   - If `SF.authority ∈ {branch_local, canon_candidate, canon_linked}`:
     - For each `record_id` in `SF.derived_from[]`:
       - If `record_id` matches `BEL-<integer>`:
         - Look up the referenced BEL.
         - If `BEL.truth_relation ∈ {false, partly_true, contested, branch_counterfactual}`: emit `lie_promoted_silently`. Cite the SF, the BEL, the BEL's `truth_relation`, and the SF's `authority`.
   - If `SF.authority == branch_local_counterfactual`: PASS regardless of BEL `truth_relation` in `derived_from` (this is the lawful path).
   - If `SF.derived_from[]` contains only CF or SE record IDs (no BEL): PASS (not the BEL-to-SF promotion path this validator targets).

**Diagnostics**:

- `lie_promoted_silently` — error. Cites the SF, its `authority`, the offending BEL in `derived_from[]`, and the BEL's `truth_relation`.

**Test fixtures** (`tools/validators/tests/structural/lie-promoted-silently.test.ts`):

- Case 1: SF with `authority: branch_local` and `derived_from: [CF-1, SE-3]` (no BEL) → PASS.
- Case 2: SF with `authority: branch_local_counterfactual` and `derived_from: [BEL-5]` where BEL-5 has `truth_relation: false` → PASS (lawful counterfactual).
- Case 3: SF with `authority: branch_local` and `derived_from: [BEL-7]` where BEL-7 has `truth_relation: true` → PASS (true belief promoted to fact is lawful).
- Case 4: SF with `authority: branch_local` and `derived_from: [BEL-9]` where BEL-9 has `truth_relation: false` → FAIL with `lie_promoted_silently`.
- Case 5: SF with `authority: canon_candidate` and `derived_from: [BEL-11]` where BEL-11 has `truth_relation: contested` → FAIL with `lie_promoted_silently`.
- Case 6: SF with `authority: canon_linked` and `derived_from: [CF-3, BEL-13]` where BEL-13 has `truth_relation: branch_counterfactual` → FAIL (a canon-linked SF must trace to a CF only; promoting from a counterfactual BEL to canon-linked is the worst-case silent retcon).

**Registration**: import + array-append in `tools/validators/src/public/registry.ts`.

**FOUNDATIONS alignment**: §Story Bundles §6a (Belief vs. Fact — `truth_relation` distinguishes belief from truth; lawful authority for non-true BEL promotion is `branch_local_counterfactual` only).

---

### D4 — `canon_baseline_drift` structural validator with full CH-window traversal (intake FOUNDATIONS §Story Bundles §4b + §7 gate 2; audit §11.3 line 834 `canon_baseline_full_ch_window`)

**Validator**: `tools/validators/src/structural/canon-baseline-drift.ts`

**Severity mode**: `"fail"`. D4 differs from its complementary sibling `canon-drift-classification-evidence.ts` (which uses `"warn"`) because the §4b drift-classification discipline is mandatory per contract §4.2 lines 165-179: "drift classification MUST retrieve every CH entry newer than the parent baseline before classifying compatibility."

**Applies to**: mirrors the existing `canon-drift-classification-evidence.ts` pattern — `run_mode === "full-world"` OR `create_pg_record` patch op OR touched files matching `^stories/[^/]+/_source/pages/PG-\d+\.yaml$`.

**Problem**: FOUNDATIONS §Story Bundles §4b (Canon Baseline Drift) requires "story-pipeline skills must compare the parent page's recorded baseline against the current world-canon revision and classify drift as exactly one of: `compatible`, `grandfathered`, `requires_health_audit`, `requires_repair_turn`, or `promotion_or_retcon_conflict`." Eight-Shared-Hard-Gate 2 (parent snapshot compatibility) reinforces this: "the parent `state_snapshot.canon_revision` has been compared against the current world-canon revision and canon-baseline drift is classified before proceeding." Audit §11.3's `canon_baseline_full_ch_window` test requires the comparison to walk the FULL CH window between recorded baseline and current head AND to inspect each intervening CH's `affected_fact_ids[]` to identify affected CFs. The existing `canon-drift-classification-evidence.ts` validator already walks the full CH window via `changeWindow(baseline, latest)` and checks that the rationale cites at least one CH id from that window — but it does NOT cross-reference each CH's `affected_fact_ids[]` against the bundle's active mirrored SF records. A classification citing only the latest CH passes the existing validator (latest CH is in the window) even when an intervening CH affected a CF the bundle's SF records depend on.

**Logic**:

1. Determine the current world-canon `CH-<integer>` head by reading the latest CH entry in `worlds/<slug>/_source/change-log/`. (Direct file read or MCP retrieval; deterministic in either case for `world-validate`.)

2. For each `PG-<integer>` in the bundle:
   - If `PG.state_snapshot.canon_revision` is null: PASS (no baseline recorded; world has no CH entries to drift against).
   - If `PG.state_snapshot.canon_revision == current_world_canon_head`: PASS (no drift; the page was authored against the current head).
   - Otherwise, **walk the CH window** from `PG.state_snapshot.canon_revision + 1` through `current_world_canon_head`:
     - For each intervening `CH-<integer>` entry, read `CH.affected_fact_ids[]` (the CFs created, modified, or superseded by this change-log entry — canonical schema name per contract §4.2 line 170 and `tools/world-index/src/parse/{yaml.ts:348, atomic.ts:514, semantic.ts:82}`; the legacy alias `affected_cf_ids` was removed and is explicitly rejected by `record_schema_compliance`).
     - For each affected CF, scan the bundle for active mirrored SF records whose `derived_from[]` contains that CF id.
     - If any active mirrored SF references an affected CF AND the page's recorded drift classification does not cite this CH entry, emit `canon_baseline_drift_window_incomplete`.

3. **Classification read location** (per contract §4.2 lines 167-179 and `canon-drift-classification-evidence.ts:79-89`): the drift classification is recorded in `PG.validation_trace.parent_snapshot_compatibility` (primary; the eighth gate's flat-mapping entry per contract §4.2 line 152) OR in the page-producing SE's `world_logic_rationale` (secondary, when the classification rationale lives on the issuing event rather than the gate trace). D4 reads from both surfaces matching the existing validator's pattern.

4. Additionally:
   - If `PG.state_snapshot.canon_revision != current_world_canon_head` AND no drift classification is recorded on the PG (or its issuing SE): emit `canon_baseline_drift_unclassified`. This complements the existing `canon-drift-classification-evidence.ts` validator (which checks classification rationale form; this validator checks classification *presence* when drift exists).
   - If a recorded classification exists but the classification value is not in the closed set `{compatible, grandfathered, requires_health_audit, requires_repair_turn, promotion_or_retcon_conflict}`: emit `canon_baseline_drift_classification_invalid`.

5. **Boundary with `canon-drift-classification-evidence.ts`**:
   - Existing validator: "does the rationale cite at least one CH from the drift window (via `changeWindow(baseline, latest)`)?" (severity `warn`, only fires when the window has ≥2 entries and the regex finds `compatible|grandfathered` in the rationale text).
   - New validator: "(a) is the classification value present-when-required AND in the closed enum, AND (b) for every intervening CH whose `affected_fact_ids[]` intersects the bundle's active mirrored SFs, does the cited classification reference that CH?" (severity `fail`).
   - The two are complementary by design. D4 does NOT re-implement the rationale-form check that the existing validator owns; D4 focuses exclusively on per-CF window-intersection coverage, classification-value presence, and closed-enum membership.

**Diagnostics**:

- `canon_baseline_drift_window_incomplete` — error. Cites the PG, the missed CH-<integer>, the affected CF the bundle references, and the active mirrored SF.
- `canon_baseline_drift_unclassified` — error. Cites the PG with drift but no recorded classification.
- `canon_baseline_drift_classification_invalid` — error. Cites the PG, the offending classification value, and the closed-set values.

**Test fixtures** (`tools/validators/tests/structural/canon-baseline-drift.test.ts`):

- Case 1: PG with `canon_revision == current_head` → PASS.
- Case 2: PG with `canon_revision: CH-3`, current head `CH-7`, intervening CHs do not affect any CF the bundle references → PASS (compatible drift, no window-traversal failure).
- Case 3: PG with `canon_revision: CH-3`, current head `CH-7`, intervening `CH-5` affects a CF referenced by active mirrored SF in the bundle, classification cites only `CH-7` → FAIL with `canon_baseline_drift_window_incomplete`.
- Case 4: PG with `canon_revision: CH-3`, current head `CH-7`, no classification recorded → FAIL with `canon_baseline_drift_unclassified`.
- Case 5: PG with classification value `latest_only_drift` (not in closed set) → FAIL with `canon_baseline_drift_classification_invalid`.

**Registration**: import + array-append in `tools/validators/src/public/registry.ts`.

**FOUNDATIONS alignment**: §Story Bundles §4b (Canon Baseline Drift); §Story Bundles §7 gate 2 (parent snapshot compatibility).

---

## FOUNDATIONS Alignment

| Principle | Stance | Rationale |
|---|---|---|
| §Story Bundles §5 (Validation Rules at Story Scope — Rule 4 No Globalization by Accident) | aligns | D1 enforces branch-isolation at the validator layer, formalizing the discipline gate 4 documents and Rule 4 grounds. |
| §Story Bundles §6a (Belief vs. Fact) | aligns | D3 enforces the BEL-to-SF authority-promotion firewall — `branch_local_counterfactual` is the only lawful authority for promoting a non-true BEL to an SF. |
| §Story Bundles §6b (Information / Observer Firewall) | aligns | D2 enforces the deterministic subset of the firewall at the validator layer; semantic plausibility remains judgment-assisted per the §6b "valid access route" clause's open-ended adjudication wording. |
| §Story Bundles §4b (Canon Baseline Drift) | aligns | D4 enforces per-CF window-intersection coverage and classification-value enforcement — closing the gap audit §11.3's `canon_baseline_full_ch_window` test identified between the existing classification-evidence validator (which already walks the window and checks at-least-one-CH-cited) and the deterministic per-CF-affected check. |
| §Story Bundles §7 (Eight Shared Hard Gates — gates 2, 4, 7) | aligns | D1 (gate 4), D2 (gate 7's Observer Firewall clause), D4 (gate 2). The validators formalize the hard-gate disciplines as standalone validator-layer checks runnable outside the PG-authoring skills. |
| §Story Bundles §5b (Schema-Minimalism) | aligns | No new schema fields are added by this spec. Every validator reads existing canonical fields. |
| §Canonical Storage Layer (record-schema-compliance gate) | aligns | The four new validators register in `tools/validators/src/public/registry.ts` alongside the existing structural validators, integrating with the established validator-framework surface without altering the framework itself. |
| Rule 2 / Rule 3 (No Pure Cosmetics / No Specialness Inflation) | N/A | Validators are structural enforcement, not canon writes; these rules govern canon-mutation surfaces. |
| Rule 6 (No Silent Retcons) | indirectly aligns | D3's `lie_promoted_silently` catches one class of silent retcon (silent belief-to-fact authority promotion). The other Rule 6 surfaces (CF retcon attestation) remain `canon-addition`'s responsibility. |

---

## Verification

After all deliverables land, the following acceptance evidence is required:

1. **D1**: `cd tools/validators && npm run test -- --grep 'branch-isolation'` passes all 5 fixture cases; `grep -nE 'branchIsolation' tools/validators/src/public/registry.ts` returns the import + array-entry matches.
2. **D2**: `cd tools/validators && npm run test -- --grep 'observer-firewall'` passes all 6 fixture cases; registry import + array-entry confirmed.
3. **D3**: `cd tools/validators && npm run build && node --test dist/tests/structural/lie-promoted-silently.test.js` passes all fixture cases; registry import + array-entry confirmed.
4. **D4**: `cd tools/validators && npm run test -- --grep 'canon-baseline-drift'` passes all 5 fixture cases; registry import + array-entry confirmed; the boundary with `canon-drift-classification-evidence.ts` is documented in the implementation comments.
5. **Cross-cutting**: `cd tools/validators && npm run test` (full suite) passes — no sibling validator regresses due to the four new validators registering.
6. **Integration sanity**: a fixture story-bundle exercising at least one PASS and one FAIL case across all four validators is validated end-to-end via `world-validate` CLI; the FAIL diagnostics match the expected diagnostic codes.

---

## Out of Scope

- **Full semantic-plausibility judgment for `observer_firewall`**: the validator enforces the deterministic subset only; "actor could have inferred this without an explicit BEL record" remains audit-finding territory in `branching-story-health-audit` Phase 2d. Not implemented as a validator FAIL.
- **General SF-supersession audit**: `lie_promoted_silently` targets the BEL → SF authority-promotion path only. SF supersession chains in general (SF derived from another SF, or from an SE event) are not "lie promotion" and are out of scope for D3.
- **Refactor of `canon-drift-classification-evidence.ts`**: D4 ships as a standalone validator complementing the existing one; merging or refactoring the existing validator is out of scope. If the boundary check at D4 implementation time reveals genuine overlap, propose a follow-up refactor spec; do not modify the existing validator in this spec.
- **Common helpers refactor**: factoring branch-path / BEL-state extraction helpers into `tools/validators/src/structural/utils.ts` is out of scope; revisit if duplication across validators grows past 2-3 internal copies.
- **MCP retrieval surface changes**: zero. D4's CH-record retrieval uses the existing `mcp__worldloom__get_records` / direct read of `worlds/<slug>/_source/change-log/`.
- **Patch-engine op additions**: zero. Validators don't write records.
- **Skill-side discipline changes**: the four validators DO NOT modify the seven story-pipeline skills' hard-gate-side discipline; they complement it at the validator layer. Skill-side discipline updates are scoped to other specs (SPEC-33 for skill-prose drift fixes; future specs for any skill-side hard-gate strengthening).
- **Audit §11.3/§11.4/§11.5 deferred test fixtures unrelated to these four validators**: the remaining red-team / prompt-coverage / production-hardening / research-inspired fixtures (e.g., `social_witness_propagation` at §11.3 line 825, `death_incapacity_reconciliation` at §11.3 line 828, `forbidden_mystery_protection` at §11.3 line 833, `cosmetic_choice_detection` at §11.3 line 846) belong to the testing-hardening spec named in `archive/specs/SPEC-33-story-pipeline-seventh-iteration-fixes.md` §Out of Scope line 536 and §Risks & Open Questions line 543; not in scope here.

---

## Risks & Open Questions

- **Classification-result field location for D4** — **RESOLVED**: FOUNDATIONS §Story Bundles §4b and story-state contract §4.2 lines 165-179 specify that drift classification is recorded in `PG.validation_trace.parent_snapshot_compatibility` (the eighth gate's flat-mapping entry per contract §4.2 line 152) OR in the page-producing SE's `world_logic_rationale` (when the classification rationale lives on the issuing event rather than the gate trace). The existing `canon-drift-classification-evidence.ts:79-89` reads from both surfaces. D4's §Logic step 3 cites this resolution explicitly; no further amendment dependency.

- **D2 deterministic-subset coverage breadth** `(pragmatic)`: the chosen deterministic subset catches the most common information-leakage patterns (CHC/SLT references to BELs not held by the actor; private-BEL leaks; predicate holder mismatches). It does NOT catch semantically subtle cases (actor "should have" known via contextual clues; institutional channels not modeled as BEL records). The full firewall remains partially judgment-assisted. Under stronger production-readiness constraints, the validator could be extended with additional access-route patterns (e.g., STSTAT-based co-location witness detection); the current scope balances coverage against false-positive risk.

- **CH-window traversal performance for D4** `(pragmatic)`: walking the full CH window per PG scales linearly with both bundle PG count and CH-window depth. For a deep bundle (many pages) against a long-running world (many CH entries), the validator's per-`world-validate` cost grows quadratic in the worst case. The MVP implementation is correctness-first; if `world-validate` runtime regresses materially, profile and consider CH-window memoization across PG iterations (compute the affected-CF set once per CH range, reuse across PGs in the same bundle). Out of scope for D4's initial landing; revisit if measurements warrant.

- **D1 / D2 / D3 ordering against D4** `(pragmatic)`: implementation phasing recommends D4 last because it crosses the story-bundle / world-canon boundary. If the schema-field verification (open question above) reveals D4 requires a contract amendment, D4 may land later than D1/D2/D3 with no rollup risk — D1/D2/D3 are independent and self-contained.

- **Mid-implementation cascade to `branching-story-health-audit`** `(pragmatic)`: health-audit Phase 2d currently emits `observer_firewall_violation` as an audit finding without a backing standalone validator. Once D2 lands, health-audit Phase 2d could optionally call the new validator and reformat its findings against the validator's diagnostic codes. This cascade is NOT in scope for SPEC-34; the validator stands alone, and any health-audit alignment is a follow-up consideration after D2 lands and stabilizes.

- **Shared-template proliferation continuity from SPEC-33**: SPEC-33 §Risks noted growing `.claude/skills/_shared-templates/` contents. This spec adds zero shared-template files; no continuity risk. (Noted here only for cross-spec audit-trail clarity.)
