# `select_storylet_candidates` test-coverage gap audit — triage (2026-05-28)

**Trigger**: User request to audit test coverage of `tools/world-mcp/src/tools/select-storylet-candidates.ts` — the MCP code that filters the available storylet pool (SLT records) into only those fitting for the current page-cycle invocation — after a recent production failure that required two remediation tickets. User asked to ensure coverage is "as comprehensive as possible, including edge cases" and to create tickets for any identified gaps.

**Method**: Source read of the selector (845 lines, 8 filter stages: scope / driver_kind / action_family / predicate_shape / predicate_class / source_record_id / mystery_policy / cooldown, plus `rankCandidates` and `max_candidates` truncation); audit of selector-only unit tests at `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts` (7 tests across 3 fixtures); audit of integration tests at `tools/world-mcp/tests/integration/spec81-storylet-candidate-retrieval.test.ts` (5 tests, 1000-SLT pool) and `spec84-replay-and-branch-scope.test.ts` (5 tests, 5-SLT fixture exercising branch-scope semantics); review of completed remediation tickets `archive/tickets/STSELECT-001.md` (predicate-class indexer fix), `archive/tickets/STSELECT-002.md` (package-graph cleanup follow-up), and `tickets/MCPENH-074.md` (per-stage rejected-sample observability); survey of real production-shape SLT distribution at `worlds/erotica-world/stories/red-bunny/_source/storylets/` (42 SLTs, heavily existential predicates, varied cooldowns and saliency).

**Classification**: story-canon-related (the audited code is the MCP retrieval surface for story-bundle storylet selection — operates on `_source/storylets/*` SLT records and consumes the index built from `_source/` story-bundle records).

**FOUNDATIONS engagement**: §Tooling Recommendation (MCP retrieval surface authors depend on for storylet shortlisting); §Story Bundles §5a (Commitment Blocks Are Causal Moves — predicate DSL is the schema layer); §Story Bundles Validation Rule 4 (No Globalization by Accident — branch-scope discipline at runtime selection); §Story Bundles Validation Rule 5 (No Consequence Evasion — eligibility-layer fairness via move-family round-robin); §Story Bundles Validation Rule 7 (Preserve Mystery Deliberately — authority-vs-claim matching at runtime selection).

**Deliverables**:

- `tickets/STSELECT-003.md` — End-to-end indexer→selector regression coverage for production-shape existential-predicate storylet pools
- `tickets/STSELECT-004.md` — Regression coverage for `rankCandidates` urgency-banded round-robin, alphabetical move-family ordering, node-id tie-break, and `max_candidates` truncation order
- `tickets/STSELECT-005.md` — Regression coverage for branch/scope/cooldown boundary cases
- `tickets/STSELECT-006.md` — Regression coverage for page-state, source-ref, and error-path boundary cases
- `archive/tickets/MCPENH-075.md` — Remove the declared-but-ignored `include_rejection_summary` flag

**Triage origin**: triage flow producing 5 tickets (≥3 → companion triage file MANDATORY per `references/deliverable-classification.md` §Triage-file composition). **Source-item count**: 17 evaluated findings (5 accepts producing 5 tickets, 6 defers, 1 reject, 2 out-of-report adjustments, plus 3 ranking sub-cases bundled into STSELECT-004 and 4 boundary sub-cases bundled each into STSELECT-005 / STSELECT-006). The bundling factor (multiple sub-cases per ticket) reflects shared fixture machinery and shared FOUNDATIONS-principle alignment.

## Accept → tickets

### A1 (→ STSELECT-003): No production-shape end-to-end fixture covering existential-predicate SLT pools

- **Surface**: `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts` (selector-only, bypasses indexer); `tools/world-mcp/tests/integration/spec81-storylet-candidate-retrieval.test.ts:190-226` (1000 SLTs but all share `record_active` + single class); `tools/world-mcp/tests/integration/spec84-replay-and-branch-scope.test.ts` (5 SLTs, branch-scope focused).
- **Mechanism**: The closest regression to the STSELECT-001 production failure (red-bunny PG-6 → SE-7: `SLT-42` dropped at `after_predicate_class` because the indexer extracted `holder_role` values instead of mapping `any_*` predicate names to record-class strings) lives at the **selector-with-synthetic-edges** layer (`buildExistentialCandidateWorld`, 1 SLT). The **indexer→selector end-to-end** layer has no fixture that exercises production-shape predicate distribution. Red-bunny's actual distribution: 34/42 SLTs use existential predicates spanning 13 distinct predicate names; the existing 5-SLT SPEC-84 fixture covers branch-scope semantics, not predicate breadth.
- **Verdict**: accept — HIGH priority. Strongest match to the user's framing ("most reliability-sensitive code... needs to be as reliable as possible").
- **Modification scope**: new generator-built fixture under `tools/world-mcp/tests/integration/`, ~30-50 SLTs covering every predicate name in `PREDICATE_REFERENCED_CLASSES`, multi-class hard preconditions, cooldown variation, saliency-urgency mix, all `global_author_pool` scope. Parity assertion at test time ensures the fixture stays in lockstep with the projection table.
- **FOUNDATIONS**: §Tooling Recommendation @ producer/consumer-contract (aligns); §Story Bundles §5a @ predicate-DSL schema (aligns).

### A2 (→ STSELECT-004): Ranking algorithm has the most complex code path with the weakest coverage

- **Surface**: `tools/world-mcp/src/tools/select-storylet-candidates.ts:595-637` (`rankCandidates`) + line 823 (`slice(0, maxCandidates)` truncation).
- **Mechanism**: The algorithm has four behaviors — (a) urgency-band descending sort, (b) alphabetical move-family round-robin within each urgency band, (c) `node_id.localeCompare` tie-break, (d) rank-order-preserving truncation. The existing fixtures leave at most one SLT per urgency band passing the filter pipeline, so behaviors (b), (c), and (d) are never exercised. A regression flipping any single behavior (e.g., `slice(0, maxCandidates)` to `slice(-maxCandidates)`) would pass the current test suite.
- **Verdict**: accept — HIGH priority. The eligibility-layer fairness contract is load-bearing for continuation diversity; silent regression here is strictly worse than a crash (subtly biased shortlists vs visible errors).
- **Modification scope**: ≥5 new tests in `select-storylet-candidates.test.ts` with focused ranking fixtures, one test per behavior (round-robin, urgency primary, tie-break, truncation order, unknown urgency).
- **FOUNDATIONS**: §Story Bundles Validation Rule 5 @ runtime selection (aligns); §Tooling Recommendation @ runtime selection (aligns).

### A3 (→ STSELECT-005): Branch/scope/cooldown boundary cases unexercised

- **Surface**: `tools/world-mcp/src/tools/select-storylet-candidates.ts:339-365` (`matchesScope`) + lines 553-584 (`cooldownRejectionSample`) + lines 501-551 (`loadSelectedStoryletPagesByBranch`).
- **Mechanism**: Five distinct boundary cases — (1) cooldown distance boundary at `distance === cooldown_pages` (rejects) vs `distance === cooldown_pages + 1` (passes); (2) cooldown for sibling-branch selection (does not reject; `branchPath.indexOf` returns -1); (3) genesis page with `branch_path: []`; (4) `branch_scoped` SLT when parent has `branch_id: null` (always rejects); (5) malformed `slt_scope_branch_path_prefix` JSON (defensive try/catch returns false). All five share the branch-isolation discipline Rule 4 protects at the runtime-selection layer. SPEC-84 covers branch_prefix positive/negative paths but none of these boundaries.
- **Verdict**: accept — MEDIUM priority. Five sub-cases bundled into one ticket because they share fixture machinery and one FOUNDATIONS principle.
- **Modification scope**: ≥6 new tests in `select-storylet-candidates.test.ts` with dedicated fixture-builder helpers per boundary class.
- **FOUNDATIONS**: §Story Bundles Validation Rule 4 @ runtime selection (aligns).

### A4 (→ STSELECT-006): Page-state, source-ref, and error-path boundary cases unexercised

- **Surface**: `tools/world-mcp/src/tools/select-storylet-candidates.ts:434-446` (`sourceRecordIdRejectionSample` second branch) + lines 220-262 (`loadParentPage` graceful-degradation paths) + lines 236-243 (`record_not_found` error path) + lines 488-499 (`mysteryPolicyRejectedSample` evidence-key labeling oddity — `forbidden_mystery_resolutions` carries `allowed_authority` value, semantically distinct from the SLT's `mystery_policy.forbidden_resolutions[]` schema field).
- **Mechanism**: Four sub-cases — (1) `global_author_pool` SLT carrying an existing story-local source ref (second-branch rejection unreached by current fixtures because SLT-7's STOBJ-99 doesn't exist); (2) malformed `state_snapshot` shapes degrade gracefully via defaulting; (3) `record_not_found` error contract for missing `parent_page_id`; (4) `mystery_policy_rejected_samples` evidence-key naming clarification — either rename to `allowed_authority_classes` (preferred) or document in source comment with assertion-with-comment in the test.
- **Verdict**: accept — MEDIUM priority. Four sub-cases bundled because they share defensive-contract analytical theme.
- **Modification scope**: ≥6 new tests; conditional rename of evidence-key name in selector + context-packet mirror + README + docs (preferred path); pre-implementation grep to enumerate downstream consumers before deciding rename-vs-document.
- **FOUNDATIONS**: §Tooling Recommendation @ error-shape (aligns); §Story Bundles Validation Rule 4 @ runtime selection (aligns); §Story Bundles Validation Rule 7 @ runtime selection (aligns).

### A5 (→ MCPENH-075): `include_rejection_summary` flag is declared but ignored

- **Surface**: `tools/world-mcp/src/tools/select-storylet-candidates.ts:38` (interface field) + `tools/world-mcp/src/server.ts:190` (Zod schema with `default(true)`) + `tools/world-mcp/src/context-packet/story-bundle-context.ts:848` (callsite sets `true`) + `tools/world-mcp/README.md:22` (documented surface). `selectStoryletCandidatesImpl` never reads the field — per-stage samples are returned regardless.
- **Mechanism**: Single-source-of-truth violation between the registered schema and the implementation. A downstream consumer passing `false` expecting suppression gets samples anyway — silent contract violation. The only caller passes `true`, which is the current effective behavior, so removing the flag preserves observed behavior.
- **Verdict**: accept — MEDIUM priority, but this is a defect-shaped finding (not a coverage gap). YAGNI recommendation: REMOVE the flag (no caller needs suppression; samples are bounded to 3 entries per stage; payload-size concern is weak). If a real suppression use case emerges later, re-introduce with a documented test.
- **Modification scope**: remove the field from the interface, Zod schema, callsite, README, and `docs/MACHINE-FACING-LAYER.md`; add regression test asserting samples populate without the flag.
- **FOUNDATIONS**: §Tooling Recommendation @ schema-surface (tensions current state — declared MCP arg is non-functional; resolution aligns).

## Defer (6)

### D1: `mystery_policy.allowed_authority: canon_linked` value untested

- **Surface**: `tools/world-mcp/src/tools/select-storylet-candidates.ts:483-486` (`matchesMysteryPolicy`).
- **Rationale**: Behaves identically to `apparent` via the `unresolvedMysteryAuthorities.has(authority)` path. No new code branch, no realistic regression mechanism.
- **Re-evaluate if**: A future canon_linked-specific code path is introduced.

### D2: SLT compatible with multiple driver_kinds untested

- **Surface**: `tools/world-mcp/src/tools/select-storylet-candidates.ts:714` (`candidate.compatibleDrivers.includes(args.turn_driver.kind)`).
- **Rationale**: `includes()` over a string array is trivial; multi-element fixture would cover but value is low. SLT-1 in red-bunny has multiple compatible drivers (`[player_action, player_write_in]`); production-shape coverage from STSELECT-003 will incidentally exercise this.
- **Re-evaluate if**: STSELECT-003's production-shape fixture does not include multi-driver SLTs.

### D3: Empty `intent_signature.action_families: []` vs `undefined` untested

- **Surface**: `tools/world-mcp/src/tools/select-storylet-candidates.ts:386-388` (`matchesActionFamily`).
- **Rationale**: `matchesActionFamily` collapses both to the same `true` branch (`actionFamilies === undefined || actionFamilies.length === 0`). Semantic equivalence is the intended contract.
- **Re-evaluate if**: A future divergence between empty-array and undefined is introduced (semantic change).

### D4: `candidate_projection_hash` composition format untested

- **Surface**: `tools/world-mcp/src/tools/select-storylet-candidates.ts:830` (`.join(":")` of per-candidate hashes).
- **Rationale**: Opaque to callers — the hash is a signature; no consumer asserts the format.
- **Re-evaluate if**: A consumer starts asserting hash format or relying on the join semantics.

### D5: Performance regression at >1000 SLT pools untested

- **Surface**: SPEC-81 §9.2 currently exercises 1000 SLTs.
- **Rationale**: Production pools won't realistically scale 10× without architecture review; the 1000-SLT integration test already covers the production-scale upper bound.
- **Re-evaluate if**: A real production bundle exceeds 1000 SLTs.

### D6: PG body parse error path untested

- **Surface**: `tools/world-mcp/src/tools/select-storylet-candidates.ts:245-248` (`isMcpError(parsed)`).
- **Rationale**: Defensive against malformed YAML in the page record body; depends on patch-engine producing well-formed YAML, which is enforced upstream. Low-stakes regression mechanism.
- **Re-evaluate if**: A patch-engine refactor changes page-record serialization.

## Reject (1)

### R1: `mystery_policy.forbidden_resolutions[]` enforcement at the selector layer

- **Surface**: SLT-42 in red-bunny (and every red-bunny SLT) declares `mystery_policy.forbidden_resolutions: [M-1, M-2, M-3, M-4, M-7]`. The selector currently uses only `allowed_authority`; `forbidden_resolutions[]` is unread.
- **Rationale**: This is intentionally downstream-evaluator territory. The selector's job is shortlisting based on indexed projections; per-mystery-per-branch resolution checks are post-shortlist evaluation. A test asserting the selector's NON-enforcement would be valuable as a doc-invariant but is not a coverage gap. STSELECT-006 surfaces the related evidence-key labeling oddity (where `forbidden_mystery_resolutions` is a misnamed key carrying `allowed_authority` data) as part of its scope; that surfaces the contract clarification without adding selector-side enforcement.
- **Re-evaluate if**: A FOUNDATIONS-level decision moves per-mystery-per-branch enforcement into the selector layer.

## Out-of-report findings (2)

### O1: SPEC-84 already covers branch_prefix positive AND negative paths

- **Surface**: `tools/world-mcp/tests/integration/spec84-replay-and-branch-scope.test.ts:116-129` — `PG-5 BR-1 includes SLT-5` (positive), `PG-4 BR-2 excludes SLT-5` (negative).
- **Observation during audit**: Initial gap-list draft would have flagged branch_prefix as missing; the existing coverage is real. Adjusted STSELECT-005's scope to bundle the **boundary cases the existing positive/negative tests don't reach** (cooldown distance, sibling-branch cooldown, genesis page, null parent branch_id, malformed JSON) rather than claiming the happy-path is absent.

### O2: `cooldown_active_samples` array ordering is unspecified but incidentally deterministic

- **Surface**: SPEC-81 §9.3 assertion at `tools/world-mcp/tests/integration/spec81-storylet-candidate-retrieval.test.ts:382-395` asserts samples emit in order `SLT-10` then `SLT-9` — i.e., storylet-table iteration order, not ranked.
- **Observation during audit**: This ordering is incidentally deterministic but unspecified in the source. Not a coverage gap (the existing test pins it down by assertion); just an unflagged ordering invariant worth noting for any future refactor of `loadSelectedStoryletPagesByBranch`.

## Update — (none)

(No subsequent revisions to this triage.)
