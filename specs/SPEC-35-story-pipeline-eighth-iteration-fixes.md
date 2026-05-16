<!-- spec-drafting-rules.md not present; using default structure + Deliverables + Risks & Open Questions. -->

# SPEC-35 — Story Pipeline Eighth-Iteration Fixes

**Status**: ACTIVE
**Date**: 2026-05-16
**Supersedes**: none
**Companion triage**: `docs/triage/2026-05-16-story-related-improvements-eighth-iteration-triage.md`

## Implementation Progress

- 2026-05-16: D1 completed and archived in `archive/tickets/SPEC35STOPIPEIG-001.md`. `observer_firewall` now resolves the current choice from the child page whose `input.resolved_event_id` matches the SE id, and the validators package proof passed (`npm run build`, targeted observer-firewall test, full `npm test`).
- 2026-05-16: D2 completed and archived in `archive/tickets/SPEC35STOPIPEIG-002.md`. `branch_isolation` now derives bundle-genesis records from root branch/page state instead of hardcoding `PG-0001`, and the validators package proof passed (`npm run build`, targeted branch-isolation test, full `npm test`).
- 2026-05-16: D3 completed and archived in `archive/tickets/SPEC35STOPIPEIG-003.md`. `get_context_packet` now filters story-local seed IDs before context-packet assembly for story-pipeline task types while preserving the warning and all-story-local success path; the world-mcp package proof passed (`npm run build`, targeted story-pipeline context-packet test, full `npm test`).
- 2026-05-16: D4 completed and archived in `archive/tickets/SPEC35STOPIPEIG-004.md`. The former witness-coverage validator is now registered as `non_propagation_tag_shape`, with source/test file renames, registry/test/README updates, active skill and triage wording aligned, stale compiled artifacts removed by a clean rebuild, and the validators package proof passed (`npm run build`, full `npm test`).
- 2026-05-16: D5 completed and archived in `archive/tickets/SPEC35STOPIPEIG-005.md`. `causal_dependency_threat_scan` references in `branching-story-turn-cycle` and `branching-story-health-audit` now describe judgment-based pre-apply/replay review with a SPEC-35 §Risks & Open Questions forward-pointer; no validator registry/source, FOUNDATIONS, or shared contract edits were needed.
- 2026-05-16: D6 completed and archived in `archive/tickets/SPEC35STOPIPEIG-006.md`. `allocate_next_id` capability metadata now describes unpadded natural-integer IDs such as `<CLASS>-1`, with MCP-boundary `describe_capabilities` coverage in `tools/world-mcp/tests/server/dispatch.test.ts`; `tools/world-mcp` build and full `npm test` proof passed.
- 2026-05-16: D7 completed and archived in `archive/tickets/SPEC35STOPIPEIG-007.md`. `create_bel_record` envelope discovery now resolves through the full `belief_record` schema instead of the old BEL ID-only generic wrapper, with `describe-envelope-schema` test coverage, README surface alignment, and `tools/world-mcp` build and full `npm test` proof passed.

## Problem Statement

`reports/story-related-improvements-eighth-iteration.md` is the eighth external review (ChatGPT-Pro, with GitHub code-search and file-viewing integration this iteration — unlike the seventh's docs-only access). It evaluated 9 findings (4 P1, 5 P2, 0 P0), proposed 8 amendments (A1–A8 plus an A9-area docs-hygiene item), produced a multi-tier validator/test plan (§11), a research-synthesis section (§12), and an anti-recommendations list (§13). The auditor's executive verdict — "architecture sound; remaining work is validators, MCP behavior, schema discovery, capability wording, and archive-reference hygiene; no new fields, no new managers" — survives intact.

Codebase verification (four parallel Explore agents across the four claim clusters — validator drift; MCP behavior; fixture/docs drift; SPEC-34 deliverable scope) confirms all nine findings hold up verbatim against current source at HEAD. Two are immediate post-SPEC-34 implementation drift in newly-landed validators (F1 `observer_firewall` page-choice resolution; F2 `branch_isolation` padded-literal genesis check). Seven are pre-existing drift surfaced by the eighth iteration but not introduced by SPEC-34: F3 (story-local context-packet seed handling — predates SPEC-31 D14's warning surface); F4 (`expected_witness_coverage` name overpromises scope — predates SPEC-34); F5 (`causal_dependency_threat_scan` documented but never implemented — predates SPEC-30 era); F6, F7 (MCP allocator capability text + BEL envelope discovery wiring); F8 (fixture rot — wider scope than the auditor named; see §Out-of-report findings below); F9 (FOUNDATIONS archive-reference hygiene).

Verification also surfaced one out-of-report finding orthogonal to the auditor's scope: F8's retired-field rot extends beyond the two test files the auditor cited (`story-bundle-fixture.ts`, `observer-firewall.test.ts`) into at least two more structural test files (`snapshot-replay-equality.test.ts:346`, `recursive-reference-closure.test.ts:311,331` — all using the retired `storylet_realized` field). D8 sweeps all four files in one operation.

Production-readiness window: zero active `_source/` story bundles depend on the surfaces this spec touches; pilot-tier story bundles remain pending (per the most recent `archive/specs/IMPLEMENTATION-ORDER-2026-05-09.md`). The blast radius is two validator-file fixes (D1, D2), one validator-file rename (D4), one MCP-side behavior fix (D3), two MCP-side text/wiring fixes (D6, D7), a multi-file fixture refresh sweep (D8), a docs-hygiene fix (D9), and a multi-file skill-prose alignment (D5). No new patch-engine ops, no new MCP retrieval surfaces, no new schema fields. Hook 3 coverage is verified solid (`tools/hooks/src/hook3-guard-direct-edit.ts:39–40` blocks both `worlds/<slug>/_source/` and story-bundle `_source/<subdir>/*.yaml`); patch-engine story-record op uniformity is verified (`create-story-record.ts` STORY_RECORD_SPECS dispatches all 16 story-record ops via uniform lookup, including `create_bel_record` with no special-case wiring — the BEL envelope-discovery gap in F7 is MCP-side, not patch-engine-side).

### Key design decisions

- **Considered implementing full witness coverage for `expected_witness_coverage` per the auditor's A4 "better change" path (computing direct/indirect witnesses from active `STSTAT.location/agency`, event kind/targets, and BEL `basis.source_event`); chose to rename to `non_propagation_tag_shape` and defer full witness coverage to a follow-up validator-hardening-II spec `(pragmatic)`.** Full implementation is multi-file (validator rewrite + fixture set + integration with health-audit and turn-cycle); under the no-pragmatic-cost-constraint conditions, the structurally-cleaner path wins and the full validator joins this spec. The deferral is cost-driven and reversible; flagged in §Risks & Open Questions. The immediate rename closes the audit-trail drift (validator name now accurately describes what the validator does) without requiring the larger implementation. Parallels the seventh-iteration triage's deferral of the four missing audit-named validators to SPEC-34.

- **Considered implementing `causal_dependency_threat_scan` per the auditor's A5 "prefer implementing it because its named subcases are deterministic" path; chose to downgrade skill prose to "judgment-based pre-apply review" and defer validator implementation to the same follow-up validator-hardening-II spec `(pragmatic)`.** The four subcases (`choice_dependency_clobbered`, `affordance_dependency_clobbered`, `obligation_counterparty_unavailable_without_transfer`, `slt_precondition_clobbered`) each require non-trivial state-snapshot analysis with cross-record dependency walks; combined, the validator's blast radius roughly doubles SPEC-35's scope. The immediate skill-prose downgrade closes the contract-vs-code drift (skill prose no longer claims a validator that does not exist) without committing to implementation. Under stronger production-readiness pressure (active story bundles authored at scale, where the four subcases would be load-bearing), the validator becomes critical-path. Flagged in §Risks & Open Questions.

- **Considered combining D3's story-local-seed filter behavior with the auditor's "return `invalid_input` when only story-local seeds are supplied" sub-recommendation; chose to filter and proceed with an empty world-seed set instead of raising an error.** Several story-pipeline task types (`story_prose_attach`, `story_turn_cycle`, `story_health_audit`) legitimately need no world-scope seeds because they rely on `story_slug` + `story_bundle_context` for state retrieval. Forcing `invalid_input` would either break those task types or push the consumers to invent dummy world seeds — both worse outcomes than the current behavior plus a clearer warning. The filter still emits the documented `story_local_seed_nodes_ignored` warning; consumers loading story-local records via targeted retrieval is the documented happy path.

- **Considered renaming `expected_witness_coverage` to a name that preserves the "this validator will eventually do witness coverage" intent (e.g., `expected_witness_coverage_tag_shape`); chose the cleaner `non_propagation_tag_shape` rename because the eventual full-witness-coverage validator will land under its own name in validator-hardening-II.** A compound name (`expected_witness_coverage_tag_shape`) carries the implementation-deferral semantic into a name that should be neutral about what the validator does today. The cleaner rename describes the current behavior accurately; the future validator earns its own name.

- **Considered keeping the old `expected_witness_coverage` name as an alias for `non_propagation_tag_shape` during a deprecation window; chose a clean rename without alias because all consumers (registry, skill prose, contract docs) are in-tree and can be updated in the same patch.** The aliasing pattern is justified when consumers are out-of-tree (third-party plugins, external scripts) and break-on-rename would surface only at runtime; here, all consumers are static and the rename + sweep is a bounded operation. Acceptance criteria below enforce the sweep (zero hits for the old name after D4 lands).

- **Considered including the seventh-iteration triage's deferred validator-hardening-II items (`expected_witness_coverage` full implementation, `causal_dependency_threat_scan` implementation) in this spec; chose to keep them deferred and route both items into a single follow-up spec to land alongside any future production-readiness work.** Validator-hardening-II's natural scope grows over time: the current eighth iteration adds these two; future audits will likely add more. Routing them as a planned cluster (rather than scattering them into discrete bug-fix specs) preserves the SPEC-34 precedent of "all validator hardening of comparable scope ships together." Flagged in §Risks & Open Questions.

- **Considered scoping D8's fixture refresh to only the two test files the auditor cited; chose to sweep all four files where the retired-field rot was verified (the auditor's `story-bundle-fixture.ts` and `observer-firewall.test.ts`, plus the operator-verified `snapshot-replay-equality.test.ts` and `recursive-reference-closure.test.ts`).** Authoring-time site enumeration per the brainstorm skill's discipline: the auditor's scope underspecifies the change surface; the operator's grep sweep extends it; landing the full set in one deliverable is cheaper than a follow-up sweep ticket.

---

## Approach

Each deliverable targets a single named drift, bug, or wording defect. The nine deliverables fall into four architectural concerns:

- **Validator-implementation bugs** (D1, D2): two validators landed in SPEC-34 (`observer_firewall` D2, `branch_isolation` D1) with implementation bugs masked by F8's padded-fixture rot. Pure-validator fixes — find the wrong code, write the right code, add a test fixture that would catch the bug. Both fixes are self-contained (no schema changes, no patch-engine changes, no MCP changes).
- **Validator-name realignment** (D4): one validator is misnamed — `expected_witness_coverage` does not perform witness coverage, only `non_propagation:` tag-shape checks. Rename the file, the registered name, the registry entry, and every skill/contract reference.
- **MCP behavior + wiring fixes** (D3, D6, D7): one behavior bug (`get_context_packet` story-local seed leakage), one capability-text drift (`allocate_next_id` description), one schema-discovery wiring gap (`create_bel_record` envelope schema). All MCP-side; require rebuilding `dist/` after landing.
- **Cross-skill prose alignment** (D5, D9) + **test-fixture refresh** (D8): D5 downgrades `causal_dependency_threat_scan` references in skill prose from "validator" to "judgment-based pre-apply review" with a forward-pointer to validator-hardening-II; D9 replaces three `archive/specs/` references in FOUNDATIONS.md with current-doc citations; D8 sweeps four test files for retired schema fields and padded IDs.

Cross-iteration discipline: D1 and D2 are immediate corrections of SPEC-34 D2 and D1 deliverables; their proof artifacts (tickets, fixtures) build on SPEC-34's. D4 follows SPEC-33 D7's pattern of "rename surface + sweep all consumers in the same patch." D5 follows SPEC-33 D9's pattern of skill-prose alignment with archived-ticket / future-spec references substituting for in-skill implementation claims. D6 and D7 follow SPEC-31 D14's pattern (MCP-side text/wiring fixes verified against the canonical source). D8 follows SPEC-34 D5's pattern (test-artifact sweep covering all sibling test files).

Implementation phasing recommendation (for ticket decomposition):

- **Phase 1 (independent, parallelizable)**: D1, D2, D4 (validators); D6, D7 (MCP text/wiring); D8 (fixtures); D9 (FOUNDATIONS docs). All seven are self-contained and can land independently.
- **Phase 2 (after D4 lands)**: D5's skill-prose downgrade — wait until D4 has shifted the `expected_witness_coverage` name so the D5 prose change doesn't have to re-thread D4's rename. Small ordering preference, not a hard dependency.
- **Phase 3 (after D1 + D2 land)**: D3 — landing the MCP-side seed-partitioning change after the validators it interacts with avoids any test-cross-coupling surprises during the same `npm test` run. Small ordering preference, not a hard dependency.

No new patch-engine ops, no new MCP retrieval surfaces, no new schema fields. The blast radius is two validator-file edits (D1, D2), one validator-file rename + registry update (D4), one MCP behavior file (D3), two MCP text/wiring files (D6, D7), four test files (D8), and one docs file (D9) — plus skill-prose edits at the consumers of D4 and D5 (the seven story-pipeline skills + the shared story-state contract; each touched only at the specific lines naming the renamed validator or the downgraded check).

---

## Deliverables

Deliverables grouped by severity (P1 → P2). Each is self-contained and can land as its own ticket.

### D1 — Fix `observer_firewall` current-choice page resolution (P1, intake F1 / A1)

**Problem**: `tools/validators/src/structural/observer-firewall.ts:138–150` (`selectedChoiceForEvent`) resolves the selected choice via `event.parent_page_id`, then reads that parent page's `input.choice_id`. Under the shared story-state contract at `.claude/skills/_shared-templates/story-state-contract.md` §4.2 / §4.3, the PG↔SE link is forward: the CHILD page is the page whose `input.resolved_event_id` names the current SE; the child page's `input.choice_id` is the action source. The parent page's input is the action that produced the parent. The current validator inspects the previous page's choice instead of the current page's choice — exactly the observer-firewall failure mode the validator is intended to catch.

This is SPEC-34 D2 immediate drift. The deterministic-subset coverage SPEC-34 D2 promised is constructed against the wrong page; F8's padded-fixture rot in the SPEC-34 D2 test (`observer-firewall.test.ts`) prevented the bug from surfacing in CI.

**Change**:

1. **Validator** (`tools/validators/src/structural/observer-firewall.ts`): replace `selectedChoiceForEvent` and add a `pageResolvedByEvent` helper:

   ```typescript
   function pageResolvedByEvent(event: Record<string, unknown>, maps: RecordMaps): IndexedRecord | undefined {
     const eventIdValue = stringValue(event.id);
     if (eventIdValue === undefined) return undefined;
     return (maps.byType.get("page_record") ?? []).find((page) => {
       const input = asPlainRecord(asPlainRecord(page.parsed).input);
       return stringValue(input.resolved_event_id) === eventIdValue;
     });
   }

   function selectedChoiceForEvent(event: Record<string, unknown>, maps: RecordMaps): IndexedRecord | undefined {
     const childPage = pageResolvedByEvent(event, maps);
     const choiceId = stringValue(asPlainRecord(asPlainRecord(childPage?.parsed).input).choice_id);
     if (choiceId === undefined) return undefined;
     const choice = maps.byId.get(choiceId);
     return choice?.node_type === "choice_record" ? choice : undefined;
   }
   ```

   Keep `SE.parent_page_id` only as the state-before anchor for state-snapshot lookups; do not use it for choice resolution.

2. **Test fixture** (`tools/validators/tests/structural/observer-firewall.test.ts`): add a fixture where parent `PG-1` has `input.choice_id: CHC-1` (grounded in a public record), child `PG-2` has `input.choice_id: CHC-2` and `input.resolved_event_id: SE-2`, and `CHC-2.grounded_in.records[]` contains a `BEL-X` whose holder is not the SE.actor (private belief leak). Pre-fix: validator inspects `CHC-1` and passes; post-fix: validator inspects `CHC-2` and fails with `observer_firewall_violation`.

**FOUNDATIONS alignment**: §Story Bundles §6b (Information / Observer Firewall — actor actions must be groundable in information accessible to that actor); §Story Bundles §7 gate 7 (Observer Firewall hard gate).

**Acceptance criteria**:
- `selectedChoiceForEvent` reads from the child page (the one whose `input.resolved_event_id` matches the SE id), not the parent page.
- New test fixture from change-step 2 fails on the pre-fix validator and passes on the post-fix validator.
- Existing observer-firewall tests still pass (after fixture refresh per D8).
- Full `tools/validators/` test suite green.

---

### D2 — Fix `branch_isolation` genesis detection (P1, intake F2 / A2)

**Problem**: `tools/validators/src/structural/branch-isolation.ts:160` (`isBundleGenesisRecord`) returns true only when `created_at_page === "PG-0001"`. The current ID convention per FOUNDATIONS-002 (`docs/FOUNDATIONS.md:552–559`) is unpadded natural-integer suffixes: `PG-1`, not `PG-0001`. Genesis records can never match the padded literal, so global author-pool storylets referencing legal genesis records (e.g., `BEL-1.created_at_page === PG-1`) are falsely flagged as branch-local leaks.

This is SPEC-34 D1 immediate drift. The padded literal was almost certainly copy-pasted from the SPEC-34 D1 test fixture (`branch-isolation.test.ts`), which itself uses padded IDs per the broader F8 rot.

**Change**:

1. **Validator** (`tools/validators/src/structural/branch-isolation.ts`): replace `isBundleGenesisRecord` with root-page-aware logic:

   ```typescript
   function rootPageIdsForStory(maps: RecordMaps): Set<string> {
     const roots = new Set<string>();
     for (const branch of maps.byType.get("branch_record") ?? []) {
       const parsed = asPlainRecord(branch.parsed);
       const parent = stringValue(parsed.parent_branch_id);
       const rootPage = stringValue(parsed.root_page_id);
       if (parent === undefined || parent === null || parent === "null") {
         if (rootPage !== undefined) roots.add(rootPage);
       }
     }
     for (const page of maps.byType.get("page_record") ?? []) {
       const parsed = asPlainRecord(page.parsed);
       if (parsed.parent_page_id === null && parsed.turn_index === 0) {
         const id = stringValue(parsed.id);
         if (id !== undefined) roots.add(id);
       }
     }
     return roots;
   }

   function isBundleGenesisRecord(record: IndexedRecord, rootPageIds: ReadonlySet<string>): boolean {
     const created = stringValue(asPlainRecord(record.parsed).created_at_page);
     return created !== undefined && rootPageIds.has(created);
   }
   ```

   Thread `rootPageIds` through the call sites currently calling `isBundleGenesisRecord(record)` (a single read at validator-init time is sufficient — pre-compute once, pass into the per-record check).

2. **Test fixture** (`tools/validators/tests/structural/branch-isolation.test.ts`): add a fixture where `BR-1.root_page_id: PG-1`, `BEL-1.created_at_page: PG-1` (legal genesis record), and global author-pool `SLT-1` references `BEL-1`. Pre-fix: validator flags `SLT-1` as branch-local leak (padded-literal check fails); post-fix: validator recognizes `BEL-1` as bundle-genesis and passes. The existing padded-ID fixtures in `branch-isolation.test.ts` are refreshed by D8.

**FOUNDATIONS alignment**: §Story Bundles §5 Rule 4 (No Globalization by Accident — branch-local records do not leak into global author-pool storylets); §Story Bundles §7 gate 4 (Branch Isolation hard gate); FOUNDATIONS-002 (unpadded natural-integer ID convention).

**Acceptance criteria**:
- `isBundleGenesisRecord` resolves genesis pages via root-branch / root-page traversal, not a hardcoded literal.
- New test fixture from change-step 2 fails on the pre-fix validator and passes on the post-fix validator.
- Grep `tools/validators/src/structural/branch-isolation.ts` for `PG-0001` returns zero matches.
- Existing branch-isolation tests still pass (after fixture refresh per D8).
- Full `tools/validators/` test suite green.

---

### D3 — Partition story-local context-packet seeds before assembly (P1, intake F3 / A3)

**Problem**: `tools/world-mcp/src/tools/get-context-packet.ts:86–94` passes the original `args.seed_nodes` (unfiltered) into `assembleContextPacket`; the `story_local_seed_nodes_ignored` warning (lines 33–41) is computed and appended AFTER assembly completes (lines 97–99). `tools/world-mcp/src/context-packet/local-authority.ts:152–168` (`findLocalAuthoritySourceNodeIds`) queries every seed-node ID against the world database; a story-local ID like `SF-1` will return a `node_not_found` McpError or — if a future schema accident indexes story-local records in the world schema — leak the story-local node into world-scope packet layers. The existing test at `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts:93–114` only asserts the warning is present; it does NOT assert that story-local IDs are excluded from `local_authority.nodes`.

**Change**:

1. **MCP** (`tools/world-mcp/src/tools/get-context-packet.ts`): partition seeds before assembly, only for story-pipeline task types. Pseudocode:

   ```typescript
   const isStoryTask = isStoryPipelineTaskType(args.task_type);
   const seedsForAssembly = isStoryTask
     ? args.seed_nodes.filter((seed) => !STORY_LOCAL_SEED_NODE_PATTERN.test(seed))
     : args.seed_nodes;
   ```

   Pass `seedsForAssembly` (not `args.seed_nodes`) to `assembleContextPacket`. Continue to emit the existing `story_local_seed_nodes_ignored` warning when any partitioned seed matched the pattern.

   When `seedsForAssembly` is empty AND `isStoryTask` is true, proceed with assembly using the empty seed set — story-pipeline task types legitimately rely on `story_slug` + `story_bundle_context` for state retrieval and do not require world-scope seeds. Do NOT raise `invalid_input` (rejects the auditor's A3 sub-recommendation; see §Key design decisions).

2. **Integration test** (`tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts`): extend the existing `getContextPacket warns when story-pipeline seed_nodes contain story-local ids` test to additionally assert that story-local IDs do NOT appear in `result.local_authority.nodes` and do NOT trigger `node_not_found`. Add a second test where ALL seeds are story-local (and `seed_nodes: []` results from partitioning) — assembly succeeds with the warning, and the packet's world-scope layers are populated only from `story_bundle_context` + targeted retrieval.

**FOUNDATIONS alignment**: §Story Bundles §3 (Read Discipline — story-local records load through `story_slug`-scoped tools); §Story Bundles §4a (Plan-Authority Boundary — story-local truth separate from world canon at retrieval time).

**Acceptance criteria**:
- Story-local IDs matching `STORY_LOCAL_SEED_NODE_PATTERN` are filtered from `seed_nodes` for story-pipeline task types before `assembleContextPacket` is called.
- The `story_local_seed_nodes_ignored` warning continues to fire when filtering removes at least one seed.
- New test assertions confirm story-local nodes do not appear in `local_authority.nodes`.
- A story-pipeline call with ALL story-local seeds succeeds with the warning rather than failing with `node_not_found` or `invalid_input`.
- Full `tools/world-mcp/` test suite green.

---

### D4 — Rename `expected_witness_coverage` → `non_propagation_tag_shape` (P1, intake F4 / A4)

**Problem**: `tools/validators/src/structural/expected-witness-coverage.ts` only validates `non_propagation:` tag syntax + closed-reason coverage; it does NOT compute direct/indirect expected witnesses from active `STSTAT.location/agency`, does NOT compare `group=` labels to computed witness groups, and does NOT verify BEL create/supersession coverage for those groups. The validator's name promises witness coverage; the validator's implementation performs tag-shape checking. This is overclaim drift — a future operator reading the validator name in the registry assumes coverage that isn't there.

Full witness coverage (the auditor's A4 "better change" path) is structurally cleaner but materially larger in scope; deferred to a follow-up validator-hardening-II spec (see §Risks & Open Questions). The immediate fix is to rename the validator to accurately describe what it does today: tag-shape checking on the `non_propagation:` token convention.

**Change**:

1. **Rename validator file**: `tools/validators/src/structural/expected-witness-coverage.ts` → `tools/validators/src/structural/non-propagation-tag-shape.ts`.

2. **Rename exported validator name**: change `name: "expected_witness_coverage"` to `name: "non_propagation_tag_shape"`. Update the corresponding `verdict.code` strings if any embed the validator name.

3. **Registry update**: in `tools/validators/src/public/registry.ts`, replace the `expectedWitnessCoverage` import with `nonPropagationTagShape`, and update the entry in the `structuralValidators` array accordingly.

4. **Rename test file**: `tools/validators/tests/structural/expected-witness-coverage.test.ts` → `tools/validators/tests/structural/non-propagation-tag-shape.test.ts`. Update describe-blocks and assertion messages.

5. **Sweep all consumers**: grep the repo for `expected_witness_coverage` and `expectedWitnessCoverage` (and any kebab-case `expected-witness-coverage` references in import paths). Update:
   - `.claude/skills/branching-story-turn-cycle/SKILL.md` references
   - `.claude/skills/branching-story-health-audit/SKILL.md` references
   - `.claude/skills/_shared-templates/story-state-contract.md` §7 hard-gate-to-validator mapping references
   - any other skill or doc reference

   Replace each with `non_propagation_tag_shape` (the new validator name) AND a parenthetical noting that full witness coverage is planned but not yet implemented (one-time forward-pointer; do not repeat at every reference site).

6. **Add forward-pointer in validator-file prose**: a one-paragraph comment block at the top of the renamed validator file explaining the deferral — `// This validator checks non_propagation: tag syntax and closed-reason coverage. Full witness coverage (computing direct/indirect witnesses from active STSTAT.location/agency, event kind/targets, BEL.basis.source_event) is planned for validator-hardening-II; see SPEC-35 §Risks & Open Questions.`

**FOUNDATIONS alignment**: §Validation Rules §Rule 5 (No Consequence Evasion — non-propagation tags are the documented mechanism for justifying why an event did NOT produce expected social consequences; the tag-shape check enforces the syntactic precondition of that mechanism).

**Acceptance criteria**:
- Grep the repo for `expected_witness_coverage`, `expectedWitnessCoverage`, `expected-witness-coverage` returns ZERO matches outside of `archive/` and SPEC-35 itself (the spec body may reference the old name in the §Problem Statement / §Deliverables prose).
- The validator is registered under the new name and runs on the same fixtures as before (no behavior change, only rename).
- Forward-pointer comment present at the top of the renamed validator file.
- Full `tools/validators/` test suite green.

---

### D5 — Downgrade `causal_dependency_threat_scan` references from "validator" to "judgment-based pre-apply review" (P2, intake F5 / A5)

**Problem**: `tools/validators/src/public/registry.ts` registers 20 structural validators; none is `causal_dependency_threat_scan`. Grep across `tools/validators/src/{structural,rules}/` returns zero implementation matches. The name appears extensively in skill prose (`.claude/skills/branching-story-turn-cycle/SKILL.md`, `.claude/skills/branching-story-health-audit/SKILL.md`) and FOUNDATIONS as if it were a registered validator. This is documented-but-missing drift — skill prose promises a deterministic check that does not exist.

Implementation (the auditor's A5 "prefer implementing it because the named subcases are deterministic" path) is multi-file (validator + fixture set + integration with turn-cycle pre-apply and health-audit; four subcases — `choice_dependency_clobbered`, `affordance_dependency_clobbered`, `obligation_counterparty_unavailable_without_transfer`, `slt_precondition_clobbered`). Deferred to the same validator-hardening-II spec as D4's full witness coverage (see §Risks & Open Questions). The immediate fix is to downgrade the skill prose to "judgment-based pre-apply review" with a forward-pointer.

**Change**:

1. **Grep + edit pass**: find every reference to `causal_dependency_threat_scan` in:
   - `.claude/skills/branching-story-turn-cycle/SKILL.md`
   - `.claude/skills/branching-story-health-audit/SKILL.md`
   - `.claude/skills/_shared-templates/story-state-contract.md`
   - `docs/FOUNDATIONS.md` (the engine-scope reference if any remains; FOUNDATIONS may keep the principle-level naming since it describes the desired check, not a deployed validator — operator judgment at edit time)

2. **Per skill-prose reference**: replace the "this is a validator" framing with "this is a judgment-based pre-apply review (see SPEC-35 §Risks & Open Questions for the deferred validator-hardening-II implementation)." Specifically:
   - Where skill prose lists `causal_dependency_threat_scan` alongside registered validators (e.g., turn-cycle's pre-apply validator list), move it to a separate "judgment-based reviews" sub-list with the forward-pointer.
   - Where skill prose says "the validator emits X" or similar mechanism claims, rephrase as "the operator's judgment-based review confirms X" with the forward-pointer.

3. **FOUNDATIONS treatment**: leave the principle-level naming (`docs/FOUNDATIONS.md` may continue to describe causal-dependency threat scanning as the desired engine-scope check) provided the surrounding prose does not imply a deployed validator. Operator judgment at edit time.

4. **No registry change**: the validator is not registered today; this deliverable does NOT add a registry entry.

**FOUNDATIONS alignment**: §Validation Rules §Rule 5 (No Consequence Evasion — causal-dependency scanning is the engine-scope expression of Rule 5; documenting it as a judgment-based review when no validator is registered is honest framing).

**Acceptance criteria**:
- Grep the seven story-pipeline skill files for `causal_dependency_threat_scan` returns matches ONLY in contexts framed as judgment-based reviews with the forward-pointer.
- No skill prose claims `causal_dependency_threat_scan` is a registered validator after this deliverable lands.
- The forward-pointer references SPEC-35 §Risks & Open Questions (where the validator-hardening-II deferral is recorded).
- Full skill suite parses cleanly (markdown syntax check).

---

### D6 — Fix `allocate_next_id` capability description text (P2, intake F6 / A6)

**Problem**: `tools/world-mcp/src/server.ts:438–441` describes `allocate_next_id` as returning `<CLASS>-0001` (padded) for fresh story-bundle-scoped classes. The implementation at `tools/world-mcp/src/tools/allocate-next-id.ts:11–61` declares `zeroPad: false` for all classes; `formatNumericValue` (lines 128–130) respects `zeroPad`, so the actual return is `PG-1` (unpadded) per FOUNDATIONS-002.

**Change**:

1. **MCP** (`tools/world-mcp/src/server.ts:438–441`): replace the description text. New text:

   ```
   Allocate the next append-only id for a world-specific, story-bundle-scoped,
   sub-audit-scoped, or pipeline-scoped record class. Story-bundle-scoped
   classes return unpadded natural-integer IDs such as <CLASS>-1 for a fresh
   missing bundle under an existing world (per FOUNDATIONS-002). RSP requires
   story_slug and audit_id.
   ```

2. **Capability snapshot test**: add or extend the existing `describe_capabilities` test (if present) to assert the `allocate_next_id` description does NOT contain the substring `0001` and DOES mention `unpadded natural-integer`. If no capability-description snapshot test exists, add a minimal one at `tools/world-mcp/tests/server/describe-capabilities-snapshot.test.ts`.

**FOUNDATIONS alignment**: FOUNDATIONS-002 (unpadded natural-integer ID convention); §Machine-Facing Layer (capability discovery accuracy).

**Acceptance criteria**:
- The description text at `tools/world-mcp/src/server.ts` for `allocate_next_id` contains no `0001` and explicitly mentions `unpadded natural-integer`.
- Capability snapshot test asserts the new wording.
- Full `tools/world-mcp/` test suite green.
- Note in commit / ticket: requires rebuilding `dist/` before the MCP server restart picks up the new text.

---

### D7 — Wire full BEL schema in `describe_envelope_schema(create_bel_record)` (P2, intake F7 / A7)

**Problem**: `tools/world-mcp/src/tools/describe-envelope-schema.ts:425–426` handles `create_bel_record` as:

```typescript
case "create_bel_record":
  return baseOperationProperties(kind, storyPayloadWithGenericRecord("^BEL-[0-9]+$"));
```

Every sibling story-record op at `tools/world-mcp/src/tools/describe-envelope-schema.ts:397–424` uses `storyPayloadWithRecord(KEY)` to validate against the full record schema. The BEL schema file exists at `tools/validators/src/schemas/story-belief.schema.json` but is not registered in `RECORD_SCHEMA_BY_PAYLOAD_KEY` (`tools/world-mcp/src/tools/describe-envelope-schema.ts:76–103`). Schema discovery for `create_bel_record` under-teaches the schema; skills authoring BEL records have only the ID-pattern check at discovery time.

Note: this is MCP-side only. The patch engine's `create_bel_record` op IS wired to the full BEL schema via `tools/patch-engine/src/ops/create-story-record.ts` (verified — `create_bel_record` dispatches through `STORY_RECORD_SPECS` like every other story-record op with no special-case wiring). Final validation at submit time catches BEL schema errors; the bug is in the schema-discovery surface, which exists precisely so skills can validate before submission.

**Change**:

1. **MCP** (`tools/world-mcp/src/tools/describe-envelope-schema.ts:76–103`): add `belief_record: "story-belief.schema.json"` to the `RECORD_SCHEMA_BY_PAYLOAD_KEY` mapping. Confirm the schema file path matches the actual filename at `tools/validators/src/schemas/story-belief.schema.json` (operator: verify at implementation time and adjust the value if the canonical name differs).

2. **MCP dispatch** (`tools/world-mcp/src/tools/describe-envelope-schema.ts:425–426`): replace with:

   ```typescript
   case "create_bel_record":
     return baseOperationProperties(kind, storyPayloadWithRecord("belief_record"));
   ```

3. **Schema-discovery test**: add a test at `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts` (extending the existing file if present, or new) that calls `describeEnvelopeSchema({ op_kind: "create_bel_record" })` and asserts the returned schema requires the full BEL field set (e.g., `holder`, `claim`, `belief_mode`, `truth_relation`, `confidence`, `visibility`, `basis`) — not just the `id` field.

**FOUNDATIONS alignment**: §Machine-Facing Layer (schema discovery currency — discovery output must match the schema used at validation time).

**Acceptance criteria**:
- `RECORD_SCHEMA_BY_PAYLOAD_KEY` contains a `belief_record` entry mapping to the BEL schema filename.
- `create_bel_record` case in the dispatch uses `storyPayloadWithRecord("belief_record")`, not `storyPayloadWithGenericRecord`.
- Schema-discovery test asserts full BEL field set surfaces.
- Full `tools/world-mcp/` test suite green.
- Note in commit / ticket: requires rebuilding `dist/` before the MCP server restart picks up the new schema discovery.

---

### D8 — Refresh test fixtures for retired schema fields and padded IDs (P2, intake F8 / A8; scope wider than auditor's)

**Problem**: Verified retired-field and padded-ID rot across four test files:

- `tools/world-mcp/tests/tools/story-bundle-fixture.ts:65` (`world_ent_id` — current is `bound_char_id`)
- `tools/world-mcp/tests/tools/story-bundle-fixture.ts:79` (`derived_from_cf` — current is `derived_from`)
- `tools/world-mcp/tests/tools/story-bundle-fixture.ts:123` (numeric `urgency: 5` — current is `low | medium | high`)
- `tools/world-mcp/tests/tools/story-bundle-fixture.ts:159` (`storylet_realized` — retired; no replacement in PG schema)
- `tools/world-mcp/tests/tools/story-bundle-fixture.ts:160` (`chosen_choice_id` — current is `input.choice_id`)
- `tools/validators/tests/structural/observer-firewall.test.ts` (padded IDs and same retired fields per the auditor's F8)
- `tools/validators/tests/structural/snapshot-replay-equality.test.ts:346` (`storylet_realized`)
- `tools/validators/tests/structural/recursive-reference-closure.test.ts:311` and `:331` (`storylet_realized`)

The auditor's F8 covered only the first two files; verification surfaced the latter two. Single-pass sweep is cheaper than a follow-up.

**Change**:

1. **Refresh each fixture**: rewrite the four files to use current story-state-contract field names and unpadded IDs:
   - `world_ent_id` → `bound_char_id` (STENT)
   - `derived_from_cf` → `derived_from` (SF)
   - numeric `urgency: <int>` → `urgency: low | medium | high` (OBL / CNSQ / THR / STINT) — pick the appropriate level based on the test's intent
   - `storylet_realized` → REMOVE (no replacement field; the PG schema no longer carries this) — restructure the test if it depended on this field's presence
   - `chosen_choice_id` → `input.choice_id` (PG)
   - Padded IDs (`PG-0001`, `CF-0001`, `BEL-0001`, etc.) → unpadded (`PG-1`, `CF-1`, `BEL-1`, etc.)

2. **Cross-fixture sweep**: after editing the four files, grep `tools/validators/tests/` and `tools/world-mcp/tests/` for the suspect tokens (`world_ent_id`, `derived_from_cf`, `chosen_choice_id`, `storylet_realized`, numeric urgency assignments to non-numeric fields, padded-ID patterns like `-0001`, `-0002`, etc.). Any residue beyond the four named files lands in the same deliverable (authoring-time site enumeration discipline; the sweep is procedurally required per the brainstorm skill's multi-file-triage convention).

3. **Verification step**: after the sweep, re-run the validator and MCP test suites to confirm no fixture is silently broken by the refresh (a test that depended on the retired-field presence as a load-bearing assertion needs to be either rewritten or removed; operator judgment at refresh time).

**FOUNDATIONS alignment**: §Test Discipline (tests must encode the contract they're protecting — fixtures using retired fields encode obsolete contracts).

**Acceptance criteria**:
- Grep `tools/validators/tests/` and `tools/world-mcp/tests/` for `world_ent_id`, `derived_from_cf`, `chosen_choice_id`, `storylet_realized` returns ZERO matches.
- Grep the same directories for padded-ID patterns (`-0001`, `-0002`, `-0010`, etc.) returns matches ONLY in tests that explicitly verify padded-ID rejection (if any such test exists).
- Urgency assignments use the string enum (`low | medium | high`) not numeric values.
- Full `tools/validators/` and `tools/world-mcp/` test suites green.

---

### D9 — Replace FOUNDATIONS archive-spec references with current-doc citations (P2, intake F9)

**Problem**: `docs/FOUNDATIONS.md` cites `archive/specs/SPEC-02-retrieval-mcp-server.md` (line 537), `archive/specs/SPEC-03-patch-engine.md` (line 538), and `archive/specs/SPEC-05-hooks-discipline.md` (line 540) as design references in the §Machine-Facing Layer section. The eighth-iteration prompt explicitly treats archived specs as non-authoritative; FOUNDATIONS as the top-of-stack authority document should not lean on archived references for current design.

**Change**:

1. **FOUNDATIONS** (`docs/FOUNDATIONS.md:537,538,540`): replace each `archive/specs/SPEC-NN-*.md` citation with the corresponding current authority:

   - Line 537 (`SPEC-02-retrieval-mcp-server.md`) → `docs/MACHINE-FACING-LAYER.md` + `tools/world-mcp/` (the canonical source plus the operational doc).
   - Line 538 (`SPEC-03-patch-engine.md`) → `docs/HARD-GATE-DISCIPLINE.md` + `tools/patch-engine/` (the canonical source plus the operational discipline doc).
   - Line 540 (`SPEC-05-hooks-discipline.md`) → `.claude/settings.json` + `tools/hooks/` (the configuration surface plus the canonical source).

2. **Marker convention**: if any archive reference must remain (e.g., for historical context where no current doc covers the equivalent surface), label it explicitly: `(historical reference — superseded by <current authority>)`. Operator judgment at edit time.

3. **Optional grep test**: a deterministic doc-hygiene grep that fails if `docs/FOUNDATIONS.md` contains `archive/specs/` references not followed by the `(historical reference — ...)` marker. Out of scope for this deliverable unless the operator chooses to add it during implementation.

**FOUNDATIONS alignment**: §Read Discipline (current-source-over-archived discipline applies to FOUNDATIONS itself).

**Acceptance criteria**:
- Grep `docs/FOUNDATIONS.md` for `archive/specs/` returns ZERO matches, OR every match is annotated with the `(historical reference — ...)` marker.
- Each replaced reference points to a current doc or source path that genuinely covers the equivalent surface.
- No broken cross-references introduced (the cited current docs exist and the cited paths resolve).

---

## FOUNDATIONS Alignment

| Principle | Stance | Rationale |
|---|---|---|
| §Story Bundles §6b (Information / Observer Firewall) | aligns | D1 corrects the validator that protects against actors grounding actions in inaccessible information; the deterministic-subset check now resolves the correct child page per the PG↔SE link convention. |
| §Story Bundles §5 Rule 4 (No Globalization by Accident) | aligns | D2 corrects the validator that protects against branch-local records leaking into global author-pool storylets; the genesis-detection logic now matches the unpadded-ID convention. |
| §Story Bundles §3 (Read Discipline) | aligns | D3 enforces the documented discipline that story-local records load through `story_slug`-scoped tools rather than as world-scope context-packet seeds. |
| §Validation Rules §Rule 5 (No Consequence Evasion) | tensions (acknowledged) | D4 renames the validator to accurately describe what it does today (tag-shape checking, not full witness coverage); the full Rule-5-supporting witness-coverage validator is deferred. D5 likewise downgrades skill prose around causal-dependency scanning. Both deferrals are flagged in §Risks & Open Questions. |
| §Machine-Facing Layer (capability and schema-discovery currency) | aligns | D6 and D7 close the two verified MCP discovery-vs-implementation gaps. |
| FOUNDATIONS-002 (unpadded natural-integer ID convention) | aligns | D2 (validator) and D8 (fixtures) bring the validator surface and the test surface into consistency with the canonical ID convention. |
| §Read Discipline (current-source-over-archived) | aligns | D9 replaces archived-spec references in FOUNDATIONS with current-doc citations. |

---

## Verification

Test artifacts per deliverable:

| Deliverable | Test artifact |
|---|---|
| D1 | `observer_firewall_uses_child_page_input_choice` — fixture in `tools/validators/tests/structural/observer-firewall.test.ts` exercising the parent-vs-child-page distinction. |
| D2 | `branch_isolation_allows_unpadded_bundle_genesis_records` — fixture in `tools/validators/tests/structural/branch-isolation.test.ts` exercising root-page-aware genesis detection. |
| D3 | `story_local_seed_nodes_are_excluded_from_packet_layers` — integration test in `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts`. |
| D4 | Existing `expected-witness-coverage.test.ts` test cases pass under the renamed file/name. |
| D5 | Grep-based acceptance check (no test artifact); skill files parse cleanly. |
| D6 | `describe_capabilities_allocator_unpadded_wording` — capability snapshot test in `tools/world-mcp/tests/server/`. |
| D7 | `create_bel_record_describe_schema_requires_full_bel_fields` — schema-discovery test in `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts`. |
| D8 | Grep-based acceptance check across `tools/validators/tests/` and `tools/world-mcp/tests/`; full test-suite green after refresh. |
| D9 | Grep-based acceptance check on `docs/FOUNDATIONS.md`. |

Full-suite proof at spec close: `npm test` green across `tools/validators/`, `tools/world-mcp/`, `tools/patch-engine/`, and `tools/hooks/`. CLI integration sanity via `world-validate` against a representative story-bundle fixture (the SPEC-34 D5 capstone fixture, or its successor if D8 reshaped it).

---

## Out of Scope

- **Full witness-coverage validator implementation** (the auditor's A4 "better change" path): computing direct/indirect witnesses from active `STSTAT.location/agency`, event kind/targets, and BEL `basis.source_event`. Deferred to a follow-up validator-hardening-II spec; see §Risks & Open Questions.
- **`causal_dependency_threat_scan` validator implementation** (the auditor's A5 "prefer implementing" path): four subcases requiring cross-record dependency walks. Deferred to the same validator-hardening-II spec.
- **Refactor of `tools/validators/src/structural/canon-drift-classification-evidence.ts`**: not in audit scope; the existing validator and SPEC-34 D4's `canon_baseline_drift` complement each other correctly per SPEC-34's design decisions.
- **Patch-engine op additions**: zero — `create_bel_record` is correctly wired engine-side; only the MCP discovery surface is wrong (D7).
- **MCP retrieval surface additions**: zero — D3 is a behavior fix on the existing `get_context_packet` tool.
- **Hook 3 modifications**: zero — Hook 3 coverage of story-bundle `_source/` is verified solid.
- **Skill workflow restructuring**: none — D4 and D5 are surgical prose alignments at specific reference sites, not skill redesigns.
- **Test plan items beyond per-deliverable fixtures**: the auditor's §11.1 P0/P1 blocking tests (5 tests) are covered by D1–D7 fixtures; the §11.2 P1 red-team tests (10 tests) and §11.3 P2 production-hardening tests (6 tests) are routed to the validator-hardening-II spec alongside D4 / D5 full implementation (where the witness-coverage and causal-dependency tests become directly executable against new validators).
- **`describe_capabilities` capability-call discipline in story-pipeline skill pre-flights** (the auditor's A11-equivalent if reframed for this iteration): not raised in eighth-iteration findings; SPEC-33 D9 chose the archived-ticket-link form as the lower-cost audit-trail backstop and that decision continues to hold.

---

## Risks & Open Questions

- **Validator-hardening-II spec — deferred.** Two validator-implementation items (D4 full witness coverage, D5 `causal_dependency_threat_scan` four-subcase implementation) deferred under the `(pragmatic)` softening framing (see §Key design decisions). The deferral acknowledges that the structurally-cleaner paths exist but are disproportionately scoped for this spec. Under stronger production-readiness pressure (active story bundles authored at scale, where Rule-5 witness propagation and causal-dependency clobbering would be load-bearing), these become critical-path. A follow-up validator-hardening-II spec should pick up both items together — pattern matches SPEC-34's bundling of the four seventh-iteration-deferred validators.

- **D7 BEL schema filename verification.** D7 assumes the BEL JSON schema lives at `tools/validators/src/schemas/story-belief.schema.json`. Operator must verify the actual filename at implementation time (the file definitely exists per Explore-agent verification, but the canonical naming may differ from `story-belief.schema.json`). If the actual filename differs, adjust the `RECORD_SCHEMA_BY_PAYLOAD_KEY` value accordingly. The `belief_record` payload-key name itself is the operator's call; matching the existing pattern (`story_event_record`, `story_fact_record`, etc.) would suggest `story_belief_record` if consistency is preferred over the shorter form.

- **D9 marker convention adoption.** D9 introduces the `(historical reference — superseded by <current authority>)` marker convention for FOUNDATIONS. If the operator wants this convention to propagate (e.g., to other docs that still cite archived material), a follow-up doc-hygiene sweep would extend it; out of scope for this spec but worth noting in case the operator chooses to widen the discipline.

- **D8 fixture-rewrite test impact.** Some tests in the four refreshed fixture files may have been authored to verify the legacy field presence as a structural assertion (e.g., a test that read `chosen_choice_id` from a fixture and asserted equality). Such tests need to be rewritten to read the new field name; operator judgment at refresh time. The test-suite-green acceptance criterion catches any silent breakage.

- **D5 FOUNDATIONS treatment is operator-judgment.** D5 instructs the operator to use judgment when editing `docs/FOUNDATIONS.md` references to `causal_dependency_threat_scan` (vs the seven skill files where the framing is more rigid). FOUNDATIONS uses the term at the principle level rather than the validator level in some places; leaving those references intact may be correct. The acceptance criterion is "no skill prose claims the validator is registered," which does not constrain FOUNDATIONS prose.
