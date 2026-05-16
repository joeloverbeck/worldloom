<!-- spec-drafting-rules.md not present; using default structure + Deliverables + Risks & Open Questions. -->

# SPEC-34 — Story Validator Hardening

**Status**: ACTIVE
**Date**: 2026-05-16
**Supersedes**: none (extends `specs/SPEC-33-story-pipeline-seventh-iteration-fixes.md` §Risks "Missing audit-named validators")
**Companion triage**: `docs/triage/2026-05-16-story-related-improvements-seventh-iteration-triage.md` — SPEC-34 is the validator-hardening follow-up named in the triage's "Cross-spec follow-ups" section under SPEC-33.

## Problem Statement

The seventh-iteration audit (per `reports/story-related-improvements-seventh-iteration.md` §11.2) and the seven story-pipeline skills' prose name four structural validators — `branch_isolation`, `observer_firewall`, `lie_promoted_silently`, and `canon_baseline_drift` — as the deterministic enforcement surfaces for FOUNDATIONS §Story Bundles §4b (Canon Baseline Drift), §5 (Validation Rules at Story Scope — Rule 4 No Globalization by Accident), §6a (Belief vs. Fact), and §6b (Information / Observer Firewall). Audit §11.2's red-team test plan expects each as a deterministic gate (or deterministic-subset gate for observer_firewall). The shared story-state contract at `.claude/skills/_shared-templates/story-state-contract.md` §7 explicitly names `branch_isolation` as Eight-Shared-Hard-Gate 4 and Observer Firewall as part of gate 7. But none of the four is implemented as a standalone validator in `tools/validators/src/structural/`.

The closest current coverage is `tools/validators/src/structural/canon-drift-classification-evidence.ts`, which audits drift-classification rationale evidence (does a classification cite a CH entry?) but does NOT perform the full CH-window traversal the audit's `canon_baseline_full_ch_window` test requires (a classification citing only the latest CH passes the existing validator even when intervening CH entries should have been considered). The other three validators have no current standalone implementation; their discipline lives at the hard-gate layer in PG-authoring skills (`branching-story-bootstrap`, `branching-story-turn-cycle`) and at the audit-finding layer in `branching-story-health-audit` Phase 2d (for observer_firewall) — but no validator-layer enforcement catches violations that slip past the hard gates or that surface in non-authoring contexts (replay, drift classification, sibling-bundle audits).

This spec is **NOT** an implementation of unimplemented concepts. Each validator formalizes an existing skill-side discipline as a standalone structural validator that runs independently of the skills, parallel to the existing 15 structural validators in `tools/validators/src/structural/`. The validator-layer enforcement closes the gap audit §11.2 identified: deterministic gates must be exercisable as deterministic tests, and skill-side hard gates are not equivalent to standalone validators (the hard gate fires only when the skill is authoring; the validator fires whenever `world-validate` runs).

### Key design decisions

- **Considered combining the four validators into one cross-cutting `story-state-integrity` validator; chose four standalone validators because each targets a distinct FOUNDATIONS principle and a distinct invariant** (§5 Rule 4 for branch_isolation; §6b for observer_firewall; §6a for lie_promoted_silently; §4b for canon_baseline_drift). Combining them would obscure which principle each diagnostic enforces, force unrelated co-changes across the implementation, and complicate fixture authoring (one fixture per invariant is far cleaner than four invariants interleaved in one fixture set).

- **Considered deferring `observer_firewall` as judgment-assisted only (no validator); chose to implement a deterministic-subset validator** that enforces the verifiable rule (actor's active `BEL` state must contain a reference resolvable to the load-bearing information cited in `CHC`/`SLT` preconditions, OR the precondition's `belief_record(holder, BEL-<integer>, ...)` predicate must bind to a BEL whose `holder` matches the acting entity), leaving semantic plausibility ("actor *could* have inferred this without an explicit BEL record") as judgment-assisted at audit time per audit §11.2's "deterministic/judgment-assisted" classification. The deterministic subset is large enough to catch genuine information leakage (an unbound BEL reference, a precondition citing another actor's BEL without an access route) without overreaching into semantic territory where validator FAILs would be false positives.

- **Considered including the missing validators in SPEC-33; chose a separate spec `(pragmatic)` because each validator is a multi-file undertaking** (implementation + fixtures + registry update + tests) and combining all four with SPEC-33's nine deliverables would roughly double SPEC-33's blast radius. SPEC-33 §Risks named this deferral explicitly. Under no-scope-doubling-constraint conditions, the validators are structurally needed and would join SPEC-33; the deferral is cost-driven and reversible.

- **Considered making `canon_baseline_drift` extend the existing `canon-drift-classification-evidence.ts` rather than ship a new file; chose a new standalone file because the existing validator checks classification evidence (the rationale text and its CH-citation form), not the underlying classification correctness (latest-CH-only vs full-window traversal)** — extending the existing validator would conflate two distinct invariants. The standalone validator complements `canon-drift-classification-evidence.ts`: the existing validator answers "is there a classification rationale that cites a CH?", the new validator answers "is the classification itself correct under full CH-window traversal?". A child page can pass the existing validator (rationale cites latest CH) while the new validator flags it (the rationale missed an intervening CH that materially affects classification).

- **Considered cross-references between the four validators (e.g., `observer_firewall` consuming `branch_isolation`'s branch-path computation); chose validator independence — each validator self-contains its traversal logic.** Cross-validator coupling would create ordering dependencies in the registry and complicate fixture authoring. Modest duplication of branch-path / BEL-state extraction logic is acceptable; if duplication grows past 2-3 validator-internal copies, factor common helpers into `tools/validators/src/structural/utils.ts` (the existing shared utility module) as a follow-up refactor — out of scope for this spec.

- **Considered making `lie_promoted_silently` enforce on ALL SF supersession chains; chose to enforce only on the SF-derived-from-BEL case** — an SF whose `derived_from[]` contains a BEL ID with non-true `truth_relation` and whose `authority` is `branch_local` / `canon_candidate` / `canon_linked` (the lawful path is `branch_local_counterfactual`, which the validator allows). General SF supersession (SF derived from another SF, or from an SE event) is not "lie promotion" and is out of scope; the validator targets the specific belief → fact silent-conversion path that FOUNDATIONS §6a calls out.

---

## Approach

Four standalone structural validators, each following the established sibling pattern shared by the 15 existing validators in `tools/validators/src/structural/`:

- Implementation file at `tools/validators/src/structural/<name>.ts`.
- Import + array-append in `tools/validators/src/public/registry.ts` (the `structuralValidators` array at line ~28).
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

### D1 — `branch_isolation` structural validator (intake FOUNDATIONS §Story Bundles §5 Rule 4 + §7 gate 4)

**Validator**: `tools/validators/src/structural/branch-isolation.ts`

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

3. For each `SLT-<integer>` with `scope.visibility: global_author_pool` (or analogous global scope per §4.4):
   - Walk `SLT.preconditions.hard` and `SLT.preconditions.soft` predicate-DSL expressions.
   - Walk `SLT.effects.create | supersede | close` and `SLT.exit_options[].likely_effects` for record-ID references.
   - For each record-ID reference, verify it is a `bundle_genesis_record` OR a world-scope ID (e.g., `CF-<integer>`, `CHAR-<integer>`, `ENT-<integer>`). If it is a `branch_local_record`, emit `global_storylet_references_branch_local`.
   - The closed predicate-DSL existential predicates (e.g., `any_belief(alias, …)`) bind aliases at runtime — these are NOT static record references and are NOT flagged by this check.

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

### D2 — `observer_firewall` structural validator, deterministic subset (intake FOUNDATIONS §Story Bundles §6b + §7 gate 7)

**Validator**: `tools/validators/src/structural/observer-firewall.ts`

**Problem**: FOUNDATIONS §Story Bundles §6b (Information / Observer Firewall) requires that "storylet selection, emitted choices, and character actions must not rely on information unavailable to the acting entity." Story-state contract §7 gate 7 (plan grounding) names the firewall explicitly: "Observer Firewall also applies here: selected `SLT` actor-bindings, emitted choices, and character actions must rely only on information available to the acting entity or record a valid access route." Health-audit Phase 2d emits `observer_firewall_violation` findings at audit time, but no standalone validator catches violations at `world-validate` time.

**Logic** (deterministic subset — full firewall remains partially judgment-assisted):

1. For each `CHC-<integer>` (choice record):
   - Determine the acting entity (the actor whose binding produced the choice; typically from the parent SLT's `scope.actor_role` resolved against PG state).
   - For each record-ID referenced in the CHC's grounding (per `CHC.grounded_in` and the predicate-DSL bindings carried from the parent SLT):
     - If the reference is a `BEL-<integer>`: verify the BEL's `holder` matches the acting entity, OR the BEL's `visibility` is `public | rumored | shared | factional` (in a faction the actor belongs to). If neither holds, emit `observer_firewall_violation_actor_lacks_access`.
     - If the reference is an `SF-<integer>`: verify the actor has an active BEL with `derived_from` containing that SF (the lawful "actor learned this fact" pattern), OR the SF has been publicly witnessed (per a related public SE event the actor was present for, via the actor's STLOC at the SE's page). If neither holds, emit `observer_firewall_violation_no_access_route`.
     - If the reference is a `BEL-<integer>` held by another actor with `visibility: private | suppressed | concealed`: emit `observer_firewall_violation_private_belief_leak`.

2. For each `SLT-<integer>` precondition (`hard` + `soft`):
   - For each `belief_record(holder, BEL-<integer>, mode?, confidence_floor?)` predicate: this is structurally fine (the predicate explicitly names the holder); verify the BEL's actual `holder` matches the predicate's `holder` argument. Mismatch emits `observer_firewall_violation_predicate_holder_mismatch`.
   - For each `record_active(SF-<integer>)` predicate where the SLT's `scope.actor_role` is non-null: the actor must have an access route to the SF per the CHC check above. Lacking access emits `observer_firewall_violation_precondition_actor_lacks_access`.
   - Existential predicates (`any_belief`, `any_consequence_pending`, …) are runtime-bound and not statically checked here.

3. **Judgment-assisted carve-out** (NOT flagged by this validator):
   - "Actor could have inferred this from contextual clues" — semantic plausibility outside record-grounded access routes. This is the audit-finding territory health-audit Phase 2d currently covers via review of BEL `basis.access_route` reasonableness; the standalone validator does not adjudicate.

**Diagnostics**:

- `observer_firewall_violation_actor_lacks_access` — error. Cites the CHC/SLT, the actor, and the referenced BEL/SF id.
- `observer_firewall_violation_no_access_route` — error. Cites the actor, the SF, and the absent BEL/SE evidence chain.
- `observer_firewall_violation_private_belief_leak` — error. Cites the leaking BEL, its actual holder, and the borrowing actor.
- `observer_firewall_violation_predicate_holder_mismatch` — error. Cites the SLT precondition, the predicate's holder argument, and the BEL's actual holder.
- `observer_firewall_violation_precondition_actor_lacks_access` — error. Cites the SLT precondition, the actor, and the SF without an access route.

**Test fixtures** (`tools/validators/tests/structural/observer-firewall.test.ts`):

- Case 1: CHC grounded in actor's own active BEL → PASS.
- Case 2: CHC grounded in another actor's `visibility: private` BEL → FAIL with `observer_firewall_violation_private_belief_leak`.
- Case 3: CHC grounded in an SF the actor has a witness-BEL for → PASS.
- Case 4: CHC grounded in an SF the actor has no BEL or SE-witness evidence for → FAIL with `observer_firewall_violation_no_access_route`.
- Case 5: SLT `belief_record(actor_role, BEL-X)` predicate where BEL-X.holder ≠ resolved actor_role → FAIL with `observer_firewall_violation_predicate_holder_mismatch`.
- Case 6: SLT `record_active(SF-X)` with actor_role grounded via witness-BEL → PASS.

**Registration**: import + array-append in `tools/validators/src/public/registry.ts`.

**FOUNDATIONS alignment**: §Story Bundles §6b (Information / Observer Firewall); §Story Bundles §7 gate 7 (plan grounding — Observer Firewall clause).

---

### D3 — `lie_promoted_silently` structural validator (intake FOUNDATIONS §Story Bundles §6a)

**Validator**: `tools/validators/src/structural/lie-promoted-silently.ts`

**Problem**: FOUNDATIONS §Story Bundles §6a (Belief vs. Fact) requires `SF` records (branch truth) and `BEL` records (belief / claim / witness / lie) to remain separate so that "lies, secrets, betrayals, witness asymmetry, and contested public claims remain coherent." The lawful path for converting a counterfactual / false BEL into branch state is `SF.authority: branch_local_counterfactual` (explicit). The audit-failing pattern is BEL with `truth_relation: false | partly_true | contested | branch_counterfactual` silently promoted to `SF.authority: branch_local | canon_candidate | canon_linked` without the counterfactual marker — this collapses the belief / fact boundary.

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

### D4 — `canon_baseline_drift` structural validator with full CH-window traversal (intake FOUNDATIONS §Story Bundles §4b + §7 gate 2)

**Validator**: `tools/validators/src/structural/canon-baseline-drift.ts`

**Problem**: FOUNDATIONS §Story Bundles §4b (Canon Baseline Drift) requires "story-pipeline skills must compare the parent page's recorded baseline against the current world-canon revision and classify drift as exactly one of: `compatible`, `grandfathered`, `requires_health_audit`, `requires_repair_turn`, or `promotion_or_retcon_conflict`." Eight-Shared-Hard-Gate 2 (parent snapshot compatibility) reinforces this: "the parent `state_snapshot.canon_revision` has been compared against the current world-canon revision and canon-baseline drift is classified before proceeding." Audit §11.2's `canon_baseline_full_ch_window` test requires the comparison to walk the FULL CH window between recorded baseline and current head, not just consult the latest CH. The existing `canon-drift-classification-evidence.ts` validator audits classification *rationale evidence* (does the recorded classification cite a CH entry?), but a classification citing only the latest CH passes the existing validator even when intervening CH entries materially affect the correct classification.

**Logic**:

1. Determine the current world-canon `CH-<integer>` head by reading the latest CH entry in `worlds/<slug>/_source/change-log/`. (Direct file read or MCP retrieval; deterministic in either case for `world-validate`.)

2. For each `PG-<integer>` in the bundle:
   - If `PG.state_snapshot.canon_revision` is null: PASS (no baseline recorded; world has no CH entries to drift against).
   - If `PG.state_snapshot.canon_revision == current_world_canon_head`: PASS (no drift; the page was authored against the current head).
   - Otherwise, **walk the CH window** from `PG.state_snapshot.canon_revision + 1` through `current_world_canon_head`:
     - For each intervening `CH-<integer>` entry, read `CH.affected_cf_ids[]` (the CFs created, modified, or superseded by this change-log entry).
     - For each affected CF, scan the bundle for active mirrored SF records whose `derived_from[]` contains that CF id.
     - If any active mirrored SF references an affected CF AND the page's recorded drift classification (location TBD per §Risks below) does not cite this CH entry, emit `canon_baseline_drift_window_incomplete`.

3. Additionally:
   - If `PG.state_snapshot.canon_revision != current_world_canon_head` AND no drift classification is recorded on the PG (or its issuing SE): emit `canon_baseline_drift_unclassified`. This complements the existing `canon-drift-classification-evidence.ts` validator (which checks classification rationale form; this validator checks classification *presence* when drift exists).
   - If a recorded classification exists but the classification value is not in the closed set `{compatible, grandfathered, requires_health_audit, requires_repair_turn, promotion_or_retcon_conflict}`: emit `canon_baseline_drift_classification_invalid`.

4. **Boundary with `canon-drift-classification-evidence.ts`**:
   - Existing validator: "is the classification rationale present and does it cite a CH?"
   - New validator: "is the classification value lawful, present-when-required, and does the cited CH window cover the full drift?"
   - The two are complementary; verify the exact boundary at implementation time by reading the existing validator. If overlap exceeds expectations, the new validator may delegate the rationale-form check to the existing validator and focus exclusively on window-traversal and classification-value enforcement.

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
| §Story Bundles §4b (Canon Baseline Drift) | aligns | D4 enforces full CH-window traversal — closing the gap audit §11.2's `canon_baseline_full_ch_window` test identified between the existing classification-evidence validator and the deterministic full-window check. |
| §Story Bundles §7 (Eight Shared Hard Gates — gates 2, 4, 7) | aligns | D1 (gate 4), D2 (gate 7's Observer Firewall clause), D4 (gate 2). The validators formalize the hard-gate disciplines as standalone validator-layer checks runnable outside the PG-authoring skills. |
| §Story Bundles §5b (Schema-Minimalism) | aligns | No new schema fields are added by this spec. Every validator reads existing canonical fields. |
| §Canonical Storage Layer (record-schema-compliance gate) | aligns | The four new validators register in `tools/validators/src/public/registry.ts` alongside the existing 15 structural validators, integrating with the established validator-framework surface without altering the framework itself. |
| Rule 2 / Rule 3 (No Pure Cosmetics / No Specialness Inflation) | N/A | Validators are structural enforcement, not canon writes; these rules govern canon-mutation surfaces. |
| Rule 6 (No Silent Retcons) | indirectly aligns | D3's `lie_promoted_silently` catches one class of silent retcon (silent belief-to-fact authority promotion). The other Rule 6 surfaces (CF retcon attestation) remain `canon-addition`'s responsibility. |

---

## Verification

After all deliverables land, the following acceptance evidence is required:

1. **D1**: `cd tools/validators && npm run test -- --grep 'branch-isolation'` passes all 5 fixture cases; `grep -nE 'branchIsolation' tools/validators/src/public/registry.ts` returns the import + array-entry matches.
2. **D2**: `cd tools/validators && npm run test -- --grep 'observer-firewall'` passes all 6 fixture cases; registry import + array-entry confirmed.
3. **D3**: `cd tools/validators && npm run test -- --grep 'lie-promoted-silently'` passes all 6 fixture cases; registry import + array-entry confirmed.
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
- **Audit §11.2 deferred test fixtures unrelated to these four validators**: the remaining red-team fixtures (e.g., `social_witness_propagation`, `death_incapacity_reconciliation`, `forbidden_mystery_protection`, `cosmetic_choice_detection`) belong to the testing-hardening spec named as the third cross-spec follow-up in SPEC-33's Step 6 summary; not in scope here.

---

## Risks & Open Questions

- **Classification-result field location for D4** `(structural)`: FOUNDATIONS §4b and story-state contract §165-167 require a drift classification but do not name the exact field where the classification value is recorded on the new PG (or its issuing SE event). At implementation time, verify against the existing `canon-drift-classification-evidence.ts` validator's reads to identify the canonical field; if the field name is genuinely undecided in the schema, this is a contract amendment dependency that must land before D4. Flag at implementation kickoff.

- **D2 deterministic-subset coverage breadth** `(pragmatic)`: the chosen deterministic subset catches the most common information-leakage patterns (CHC/SLT references to BELs not held by the actor; private-BEL leaks; predicate holder mismatches). It does NOT catch semantically subtle cases (actor "should have" known via contextual clues; institutional channels not modeled as BEL records). The full firewall remains partially judgment-assisted. Under stronger production-readiness constraints, the validator could be extended with additional access-route patterns (e.g., STSTAT-based co-location witness detection); the current scope balances coverage against false-positive risk.

- **CH-window traversal performance for D4** `(pragmatic)`: walking the full CH window per PG scales linearly with both bundle PG count and CH-window depth. For a deep bundle (many pages) against a long-running world (many CH entries), the validator's per-`world-validate` cost grows quadratic in the worst case. The MVP implementation is correctness-first; if `world-validate` runtime regresses materially, profile and consider CH-window memoization across PG iterations (compute the affected-CF set once per CH range, reuse across PGs in the same bundle). Out of scope for D4's initial landing; revisit if measurements warrant.

- **D1 / D2 / D3 ordering against D4** `(pragmatic)`: implementation phasing recommends D4 last because it crosses the story-bundle / world-canon boundary. If the schema-field verification (open question above) reveals D4 requires a contract amendment, D4 may land later than D1/D2/D3 with no rollup risk — D1/D2/D3 are independent and self-contained.

- **Mid-implementation cascade to `branching-story-health-audit`** `(pragmatic)`: health-audit Phase 2d currently emits `observer_firewall_violation` as an audit finding without a backing standalone validator. Once D2 lands, health-audit Phase 2d could optionally call the new validator and reformat its findings against the validator's diagnostic codes. This cascade is NOT in scope for SPEC-34; the validator stands alone, and any health-audit alignment is a follow-up consideration after D2 lands and stabilizes.

- **Shared-template proliferation continuity from SPEC-33**: SPEC-33 §Risks noted growing `.claude/skills/_shared-templates/` contents. This spec adds zero shared-template files; no continuity risk. (Noted here only for cross-spec audit-trail clarity.)
