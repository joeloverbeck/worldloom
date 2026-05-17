<!-- spec-drafting-rules.md not present; using default structure + Deliverables + Risks & Open Questions. -->

# SPEC-40 — Story Pipeline Eleventh-Iteration Fixes

**Status**: COMPLETED
**Date**: 2026-05-17
**Supersedes**: closes one inconsistency carried since SPEC-35 D4 (`non_propagation_tag_shape` rename landed with `severity_mode: "fail"` but the in-file malformed-verdict helper still emits `severity: "warn"`); adds three new hardening deliverables intaken from the eleventh external audit; folds a same-class docs-text drift surfaced by codebase verification into the F-04 deliverable.

**Implementation note (2026-05-17)**: D1 / `archive/tickets/SPEC40STOPIPELE-001.md` is implemented and archived. `non_propagation_tag_shape` now emits `severity: "fail"` for both malformed and missing tag verdicts, and the validators package build/test lane passed. D2 / `archive/tickets/SPEC40STOPIPELE-002.md` is implemented and archived: `expected_witness_coverage` now has fixture coverage for the `institutional_channel`, `rumor`, `location_trace`, and `object_trace` DA-anchored indirect routes, and `branching-story-health-audit` Phase 2d now classifies non-mechanized propagation routes as `judgment_assisted_indirect_propagation_unverified`. D3 / `archive/tickets/SPEC40STOPIPELE-003.md` is implemented and archived: Hook 6 now guards `pages-prose-plans/PG-*.md` and bundle `INDEX.md` plan-hash drift at the PreToolUse boundary, the hooks package build/test lane passed, and the active hook/docs/skill references name the new gate. D4 / `archive/tickets/SPEC40STOPIPELE-004.md` is implemented and archived: `tools/world-mcp/tests/integration/server-capabilities-hash-parity.test.ts` now spawns `dist/src/server.js`, checks capability hashes over stdio, and submits a known-bad causal-dependency fixture through the spawned process; `docs/MACHINE-FACING-LAYER.md` now distinguishes the in-memory `dispatch.test.ts` smoke from the spawned deployed-process smoke and names the pre-deploy capability-currency check.

## Problem Statement

`reports/story-related-improvements-eleventh-iteration.md` is the eleventh external review (ChatGPT-Pro, GitHub code-search + file-viewing integration, source-only — running MCP server not invoked, generated `dist/` not inspected). It produced a tenth-fix verification ledger (§4: every SPEC-37 deliverable confirmed `Fixed and test-backed` in inspected source), four explicit active findings (F-01 through F-04: 2 P1, 2 P2, 0 P0), a §10 amendments table mapping each finding to file-level operations, a §12 P1/P2/research test plan, a §13 research-synthesis section reaffirming the worldloom anti-recommendations, and a §14 anti-recommendations section reaffirming the no-act-structure / no-drama-manager / no-prose-as-state / no-hidden-memory / no-schema-bloat positions. The auditor's executive verdict — *"Worldloom's current story-related system is basically sound, not architecturally broken, and much stronger than the tenth-iteration baseline... The remaining problems are narrower: validator severity discipline, indirect social-propagation edge coverage, direct-write markdown/hash enforcement, and deployed/runtime capability verification"* — survives codebase verification verbatim.

Codebase verification (four parallel Explore agents across the four finding clusters — validator severity surface; expected-witness-coverage scope surface; hook coverage of story markdown surface; deployed-MCP capability surface) confirms all four findings hold against current source at HEAD:

- **F-01 verified**: `tools/validators/src/structural/non-propagation-tag-shape.ts:25` declares `severity_mode: "fail"` and the validator's `missing()` helper at `:123-133` correctly constructs verdicts with `severity: "fail"` (`expected_witness_tag_missing`), but the sibling `malformed()` helper at `:111-121` constructs verdicts with `severity: "warn"` (`expected_witness_tag_malformed`). The drift is within-validator — one verdict path at fail, the other at warn — not just an opt-in severity. Test at `tools/validators/tests/structural/non-propagation-tag-shape.test.ts:34-46` codifies the warning behavior verbatim (`"non_propagation_tag_shape warns on malformed non-propagation tags"`). A malformed `non_propagation:` tag inside `SE.world_logic_rationale` looks like an intentional propagation exemption but is unparseable by `expected_witness_coverage` — exactly the "paperwork says covered, machine can't read it" failure mode the validator is intended to prevent.

- **F-02 verified with important nuance**: `tools/validators/src/structural/expected-witness-coverage.ts:17-25` exposes an `INDIRECT_ACCESS_ROUTES` set that ALREADY consumes all seven `BEL.basis.access_route` indirect values (`document`, `object_trace`, `location_trace`, `rumor`, `surveillance`, `institutional_channel`, `magic_tech`). The gap is that `indirectPropagationVerdicts()` at `:164-193` ONLY triggers when an SE's `state_delta.create[]` contains a `DA-<integer>` with `circulation ∈ {public, factional}` — the route enum is read off the BEL that anchors to that DA, but no other event shape triggers the check. Skill prose at `.claude/skills/branching-story-turn-cycle/SKILL.md:338-340` already states the gap verbatim: *"Other indirect-witness obligations (multi-location supersession, STENT-death with SREL ties, environmental change) remain authorial discipline and are not yet enforced by the validator; see SPEC-37 D2 for the indirect-cue calibration roadmap."* The fixture coverage in `expected-witness-coverage.test.ts` exercises `document` (test at `:90-100`) but not the four other indirect access_route values; `branching-story-health-audit/SKILL.md` Phase 2d names broader routes (law / ritual / bureaucracy / STOBJ) the validator does not mechanize without classifying them as `judgment_assisted_indirect_propagation_unverified`. F-02's narrow remediation is fixture-and-prose only; full mechanization of multi-location / STENT-death-with-SREL / STOBJ-as-independent-route cues remains the validator-hardening-III cluster deferred from SPEC-37 D2 §Risks.

- **F-03 verified**: `tools/hooks/src/hook3-guard-direct-edit.ts:39-43` allows all paths outside `_source/` (returns `{ decision: "allow" }` for any path that is neither `worlds/<slug>/_source/` nor `stories/<slug>/_source/`). `tools/hooks/README.md:15` explicitly enumerates `pages-prose/`, `pages-prose-plans/`, `INDEX.md`, `storylet-batches/`, and `story-promotions/` as permitted surfaces. No sibling hook in `tools/hooks/src/` (hooks 1 / 2 / 4 / 5) intercepts markdown writes. Skill-level plan-hash verification at `.claude/skills/branching-story-prose-attach/SKILL.md` Phase 2 (lines 137-175) reads both the plan body and the PG record, computes fresh hashes via `tools/world-mcp/dist/src/cli/compute-pg-hashes.js --plan <plan> --pg <pg>` (CLI source at `tools/world-mcp/src/cli/compute-pg-hashes.ts`), and records FAIL in the receipt's `checks.hash_integrity` field — but the check fires only when `branching-story-prose-attach` is explicitly invoked and detects drift rather than blocking the INDEX update. A direct write to `pages-prose-plans/PG-<integer>.md` followed by a manual `INDEX.md` update bypasses verification entirely.

- **F-04 verified with bonus docs-text drift**: `tools/world-mcp/src/build-info.ts:96-104,106-114,116-125` computes `validator_registry_hash` (SHA-256 over sorted validator-source-file content) and `patch_operation_schema_hash` (SHA-256 over the sorted patch-op-schema manifest); `tools/world-mcp/src/tools/describe-capabilities.ts:18-32` returns them in the `build_info` field. `tools/world-mcp/tests/server/capability-parity.test.ts:60-74` uses `InMemoryTransport.createLinkedPair()` to wire client and server in the same process — not a spawned `dist/src/server.js`. `tools/world-mcp/tests/server/dispatch.test.ts:417-431` also uses `InMemoryTransport`; the SPEC-37 D3 `validate_patch_plan` known-bad smoke at `:1274-1326` runs in-memory. The only spawned-process test, `tools/world-mcp/tests/integration/server-stdio.test.ts:10-46`, verifies process lifecycle only — it spawns `dist/src/server.js` but never invokes `describe_capabilities` over the stdio boundary. Same-class drift surfaced during verification: `docs/MACHINE-FACING-LAYER.md:123` describes `dispatch.test.ts` as the *"deployed smoke test"* — but `dispatch.test.ts` is in-memory; the docs text is wrong and should be corrected as part of F-04's deliverable rather than spun out to a follow-up sweep.

Production-readiness window matches SPEC-37's: no active pilot story bundles depend on these surfaces yet. Blast radius: one validator-source one-line severity flip + test rename (D1, F-01), one validator-test extension + one health-audit skill-prose clarification (D2, F-02 scope-path-A), one new hook + new hook test + skill-prose / docs cross-references (D3, F-03), one new spawned-process integration test + one docs-text correction (D4, F-04 plus folded out-of-report drift). No new validators, no new patch-engine ops, no new MCP retrieval surfaces, no new schema fields — the report's §14 anti-recommendation against schema expansion for witness coverage and the "no new managers / no new ontology" position from every prior iteration are honored verbatim.

### Key design decisions

- **Considered implementing the full F-02 mechanization (STOBJ as independent indirect route; multi-location supersession cue; STENT-death-with-SREL cue); chose to scope D2 to fixture-and-prose work only and route the full mechanization to a follow-up validator-hardening-III spec `(structural)`.** The eleventh report itself does NOT push for full mechanization — its §10 amendments table row for F-02 names test-fixture additions plus a health-audit prose clarification, and its §F-02 Recommendation reads *"Do not add fields. Add deterministic checks only where current records already encode evidence... For non-mechanizable cases, add health-audit judgment-assisted fixtures that explicitly classify 'not mechanized' instead of silently passing."* The deferred cues (multi-location, STENT-death-with-SREL, STOBJ-as-independent) are scope-distinct from F-02's narrow goal of stress-testing the existing DA-anchored route coverage; the validator-hardening-III spec is the natural home. Worked precedent: SPEC-37 D2 landed only the public-DA-trace cue and deferred multi-location / STENT-death-with-SREL / environmental-change cues to its §Risks.

- **Considered designing F-03 as a CLI gate (run as a pre-commit hook by the user) vs a Claude Code PreToolUse hook; chose the PreToolUse hook pattern `(structural)`.** Worldloom's existing hook discipline (Hooks 1-5 in `.claude/settings.json.example`) intercepts at the assistant-tool-invocation boundary, where the failure modes the audit describes actually occur — an LLM-driven direct Edit/Write to `pages-prose-plans/PG-*.md` between PG-stamping and INDEX update. A CLI gate would only fire at git-commit time, which is too late to prevent the assistant from leaving the working tree in a drifted state, and depends on user-side git workflow rather than the harness-enforced hook surface every other write protection rides on. The new hook (D3) registers as `hook6-guard-story-markdown-hash` and follows the hook3 pattern verbatim (read `tool_input.file_path`, classify, deny with redirect prose).

- **Considered scoping D3's hook to `pages-prose-plans/PG-*.md` only vs covering both plan files and bundle `INDEX.md`; chose to cover both surfaces `(structural)`.** The auditor's recommendation names both: *"any write to `pages-prose-plans/PG-*.md` or bundle `INDEX.md` should run the canonical PG plan hash verifier or refuse the INDEX update until verification passes."* The plan-file gate prevents bytes-vs-PG.plan.plan_hash drift at the moment of edit; the INDEX gate prevents the INDEX update from completing while any referenced PG's plan body has drifted from its stamped hash. Both gates use the same canonical hash verifier (`tools/world-mcp/dist/src/cli/compute-pg-hashes.js`), so the per-surface cost is just classification + verifier invocation, not duplicate hash logic. Skipping the INDEX gate would let a direct plan-write evade verification by deferring the INDEX update to a separate Edit invocation — the worst-of-both shape the audit explicitly names.

- **Considered designing D4 as a hash-parity-only smoke vs combining hash parity with validator-bundle currency in one test; chose the combined shape `(structural)`.** The audit's recommendation pairs both: *"invokes `describe_capabilities`, compares `validator_registry_hash` and `patch_operation_schema_hash` to freshly computed source hashes, and submits known-bad patch plans that must fail."* Splitting into two tests doubles the spawn/teardown cost (each spawned `dist/src/server.js` is ~250ms of process startup); combining keeps the smoke under a single process lifecycle. The combined test also surfaces a real failure mode the in-memory tests cannot: a stale `dist/` returning the same hash as source (impossible) vs returning a stale hash with stale validators (the actual risk).

- **Considered including a fixture-rot lint + archive-citation lint in this spec (per audit §11.3 P2 tests #5 and #6); chose to defer both as repo-hygiene work outside the story-pipeline cluster `(structural)`.** Both are repo-wide CI lints whose scope crosses the story-pipeline boundary into general doc-hygiene work; the natural deliverable surface is a separate doc-hygiene spec or a tools/build CI extension, not this iteration's narrow validator/hook/docs hardening. Routed to §Risks & Open Questions for visibility without blocking SPEC-40.

- **Considered including the §11.3 P2 test #4 `story_local_seed_warning_for_pg_bel_se_da` in this spec; chose to defer `(pragmatic)`.** The test would extend the SPEC-35-D3 / SPEC-36-D6 context-packet surface, which is structurally orthogonal to the four findings here. Folding it in would dilute the spec's narrative-pipeline focus; a small follow-up ticket can land it cheaply against the existing test file.

- **Considered folding the MACHINE-FACING-LAYER.md:123 docs-text drift (calling `dispatch.test.ts` the "deployed smoke test" when it's in-memory) as a separate D5 deliverable; chose to fold it into D4 `(structural)`.** D4 already updates this file for the release-checklist prose; touching the same file twice (once for the new docs section, once for the wrong-label correction) doubles the file-touch ceremony without splitting the change surface. Folded into D4 with explicit attribution in the deliverable header so future audits can trace the fix.

---

## Approach

Each deliverable targets a single named finding (with F-04 absorbing one out-of-report finding of the same class). The four deliverables fall into three architectural concerns:

- **Validator severity discipline** (D1): flip the in-validator severity drift at the `malformed()` verdict-construction site. One-line source change + one test rename + assertion update; no schema/MCP/hook/patch-engine changes. Pure-validator fix per audit §10 row F-01.
- **Validator coverage breadth + skill-prose discipline** (D2): extend the validator-test fixture set to cover four indirect `access_route` values the validator code already handles (`institutional_channel`, `rumor`, `location_trace`, `object_trace` — the `document` route already has fixture coverage at `expected-witness-coverage.test.ts:90-100`); update `branching-story-health-audit/SKILL.md` Phase 2d prose to classify non-mechanized routes as `judgment_assisted_indirect_propagation_unverified` instead of implicitly passing. Test-and-prose only; the validator source already consumes the full `INDIRECT_ACCESS_ROUTES` set at `expected-witness-coverage.ts:17-25`. Full mechanization of multi-location / STENT-death-with-SREL / STOBJ-as-independent cues remains deferred to validator-hardening-III.
- **Direct-write hardening** (D3): add a new PreToolUse hook (`hook6-guard-story-markdown-hash.ts`) that intercepts Edit/Write on `pages-prose-plans/PG-<integer>.md` and bundle `INDEX.md` paths within a story bundle, invokes the canonical PG hash verifier, and denies the write when plan bytes drift from the stamped `PG.plan.plan_hash`. New hook test; settings.json.example registration; skill-prose cross-references in `story-state-contract.md` write-order discipline section and `branching-story-prose-attach/SKILL.md` Phase 2.
- **Deployed-runtime capability smoke + docs correction** (D4): add a new spawned-process integration test (`tools/world-mcp/tests/integration/server-capabilities-hash-parity.test.ts`) that builds `dist/`, spawns `dist/src/server.js`, invokes `describe_capabilities` over stdio, asserts returned `validator_registry_hash` and `patch_operation_schema_hash` match freshly computed source hashes, and submits one known-bad `validate_patch_plan` fixture that must fail-verdict over the same spawned process. Update `docs/MACHINE-FACING-LAYER.md` to (a) correct the `dispatch.test.ts` "deployed smoke test" misattribution at `:123` and (b) add a release-checklist item mandating the spawned-process smoke before claiming capability currency.

Cross-iteration discipline: D1 closes the within-validator drift that landed during SPEC-35 D4's rename of the witness-coverage surface to `non_propagation_tag_shape` (the rename moved the file but did not flip the malformed-verdict severity). D2 sharpens the test fixture coverage for the indirect-route work SPEC-36 D2 / SPEC-37 D2 landed; the deferred full mechanization cluster (multi-location + STENT-death-with-SREL + STOBJ-as-independent) carries forward to validator-hardening-III. D3 closes a fail-open path that has existed since story-bundle markdown surfaces were explicitly excluded from Hook 3 (SPEC-05 era). D4 closes the runtime/deployed parity carry-over SPEC-37 D3 left at in-memory coverage; the spawned-process smoke is the load-bearing addition the SPEC-37 in-memory `validate_patch_plan` smoke could not provide.

Implementation phasing recommendation (for ticket decomposition):

- **Phase 1 (independent, parallelizable)**: D1, D2, D4. All three touch separate surfaces and can land in any order.
  - D1 touches `tools/validators/src/structural/non-propagation-tag-shape.ts` and its test file.
  - D2 touches `tools/validators/tests/structural/expected-witness-coverage.test.ts` and `.claude/skills/branching-story-health-audit/SKILL.md` only.
  - D4 touches `tools/world-mcp/tests/integration/` (new file) and `docs/MACHINE-FACING-LAYER.md`.
- **Phase 2 (after Phase 1)**: D3. Larger; new hook source file + new hook test + settings registration + skill-prose / docs cross-references. Independent of D1/D2/D4 but benefits from landing after D4 so the deployed-capability smoke is in place to exercise any cross-hook interaction.

No new patch-engine ops, no new MCP retrieval surfaces, no new schema fields. The blast radius is one one-line validator source change + test (D1), one test-extension + one skill-prose update (D2), one new hook + new hook test + settings + cross-references (D3), one new integration test + one docs file edit (D4).

---

## Deliverables

Deliverables grouped by severity (P1 → P2). Each is self-contained and can land as its own ticket.

### D1 — Flip `non_propagation_tag_shape` malformed-tag severity from `warn` to `fail` (P1, intake F-01)

**Problem**: `tools/validators/src/structural/non-propagation-tag-shape.ts:25` declares `severity_mode: "fail"`. The validator's `missing()` helper at `:123-133` correctly emits `severity: "fail"` for the sibling `expected_witness_tag_missing` verdict. But the `malformed()` helper at `:111-121` emits the `expected_witness_tag_malformed` verdict with hardcoded `severity: "warn"`:

```typescript
function malformed(event: IndexedRecord, tag: string, detail: string): Verdict {
  return {
    validator: "non_propagation_tag_shape",
    severity: "warn",                              // ← drift; should be "fail"
    code: "expected_witness_tag_malformed",
    ...
  };
}
```

The test at `tools/validators/tests/structural/non-propagation-tag-shape.test.ts:34-46` codifies the warning behavior with the test name `"non_propagation_tag_shape warns on malformed non-propagation tags"`. A malformed `non_propagation:` tag in `SE.world_logic_rationale` is exactly the failure mode the validator is intended to prevent (paperwork says covered; machine can't read it) — it should fail-verdict, not warn-verdict.

**Change**:

1. **Source flip** (`tools/validators/src/structural/non-propagation-tag-shape.ts:114`): change `severity: "warn"` to `severity: "fail"`.

2. **Test rename + assertion update** (`tools/validators/tests/structural/non-propagation-tag-shape.test.ts:34`):
   - Rename test from `"non_propagation_tag_shape warns on malformed non-propagation tags"` to `"non_propagation_tag_shape rejects malformed non-propagation tags"`.
   - Add an explicit severity assertion: `assert.ok(verdicts.some((verdict) => verdict.code === "expected_witness_tag_malformed" && verdict.severity === "fail"));`
   - Add one negative test confirming a well-formed tag does not emit the malformed verdict.

**Acceptance criteria**:
- `cd tools/validators && npm test` passes after the change.
- Running the validator against a fixture SE with `world_logic_rationale: "...non_propagation:evidence_concealed group=public)..."` (the existing test fixture's malformed payload) returns a verdict with `severity === "fail"` and `code === "expected_witness_tag_malformed"`.
- No other validator's tests regress.

**Mechanical consumer**: `expected_witness_coverage` consumes the parseable tags emitted by this validator's `missing()` path; the malformed-tag severity flip ensures the upstream tag-shape check fail-stops before any consumer reads a tag that cannot be parsed.

**Blast radius**: 1 source line + 1 test file. No registry change, no schema change, no fixture cascade.

### D2 — Extend `expected_witness_coverage.test.ts` with four indirect-route fixtures + clarify health-audit Phase 2d prose (P1, intake F-02 scope-path-A)

**Problem**: `tools/validators/src/structural/expected-witness-coverage.ts:17-25` exposes `INDIRECT_ACCESS_ROUTES` consuming all seven indirect `BEL.basis.access_route` values, but `tools/validators/tests/structural/expected-witness-coverage.test.ts` only exercises the `document` route (test at `:90-100`). The four uncovered routes — `institutional_channel`, `rumor`, `location_trace`, `object_trace` — are mechanized in source but not fixture-stressed; a regression in `INDIRECT_ACCESS_ROUTES` membership or the route-vs-BEL-vs-DA matching logic at `hasIndirectBelForArtifact()` (`:195-210`) would land silently.

Separately, `.claude/skills/branching-story-health-audit/SKILL.md` Phase 2d (around line 198) names broader propagation routes — "law, ritual, bureaucracy, artifact circulation, public violence, visible environmental change, or accessible DA / STOBJ evidence" — that the validator does NOT mechanize. The skill prose does not currently classify non-mechanized routes as `judgment_assisted_indirect_propagation_unverified`, so an audit reader cannot tell which prose-named routes have deterministic enforcement and which are author-discipline only.

**Change**:

1. **Test fixture extensions** (`tools/validators/tests/structural/expected-witness-coverage.test.ts`): add four new tests, one per uncovered indirect access_route, modeled on the existing `expected_witness_coverage_accepts_public_da_with_indirect_route_bel` test at `:90-100`:
   - `expected_witness_coverage_accepts_public_da_with_institutional_channel_route` — fixture: SE creates public DA; BEL with `access_route: "institutional_channel"` and `access_records: ["DA-1"]`. Expect no verdict.
   - `expected_witness_coverage_accepts_factional_da_with_rumor_route` — fixture: SE creates factional DA; BEL with `access_route: "rumor"` and `access_records: ["DA-1"]`. Expect no verdict.
   - `expected_witness_coverage_accepts_public_da_with_location_trace_route` — fixture: SE creates public DA at a non-concealed STLOC; BEL with `access_route: "location_trace"` and `access_records: ["DA-1"]`. Expect no verdict.
   - `expected_witness_coverage_accepts_public_da_with_object_trace_route` — fixture: SE creates public DA referencing STOBJ-1; BEL with `access_route: "object_trace"` and `access_records: ["DA-1"]`. Expect no verdict.

   Each test should also include a paired negative variant asserting that missing the BEL or carrying a wrong `access_route` (e.g., `direct_observation` for an indirect-only fixture) emits `expected_witness_coverage_missing_indirect_propagation`.

2. **Skill-prose clarification** (`.claude/skills/branching-story-health-audit/SKILL.md`, Phase 2d witness-completeness section): replace the implicit-pass framing with explicit classification language. New prose (insert into the Phase 2d witness-completeness paragraph that begins *"compute `indirect` witnesses from public or factional holders reached through law, ritual, bureaucracy..."*):

   *"When a propagation route is named in prose or rationale but no `DA` / `STOBJ` / `STLOC` / `BEL.basis` record encodes the evidence path, classify the audit verdict as `judgment_assisted_indirect_propagation_unverified` and surface it in the audit report alongside the deterministic findings. The `expected_witness_coverage` validator mechanizes only the DA-anchored cue: SE creates a `DA` with `circulation ∈ {public, factional}`, and one of the created BELs references that DA via `basis.access_records[]` with `basis.access_route` in the indirect-route set `{document, object_trace, location_trace, rumor, surveillance, institutional_channel, magic_tech}`, OR `SE.world_logic_rationale` carries a parseable `non_propagation:event_leaves_no_accessible_trace(group=<label>, records=[<DA-id>])` tag. Other propagation routes — multi-location supersession, STENT-death with SREL ties, environmental change inferred from STLOC modification without DA evidence, STOBJ-as-independent-route propagation — remain authorial discipline and must be classified `judgment_assisted_indirect_propagation_unverified` in the audit report rather than silently treated as covered; see SPEC-40 §Risks for the validator-hardening-III deferral."*

**Acceptance criteria**:
- `cd tools/validators && npm test` passes with eight new tests (four accepts + four paired negatives).
- Each new test exercises a distinct indirect `access_route` value not previously covered by fixtures.
- Reading `.claude/skills/branching-story-health-audit/SKILL.md` Phase 2d after the change makes the deterministic-vs-judgment-assisted boundary explicit and quotable.

**Mechanical consumer**: `branching-story-health-audit` Phase 2d (now classifies non-mechanized routes deterministically rather than implicitly passing them).

**Blast radius**: 1 test file extension (eight tests) + 1 skill-prose paragraph rewrite. No source change to the validator; the test set exercises code paths the validator already implements.

### D3 — New `hook6-guard-story-markdown-hash` for plan-hash integrity at write time (P2, intake F-03)

**Problem**: `tools/hooks/src/hook3-guard-direct-edit.ts:39-43` allows all paths outside `_source/`; `tools/hooks/README.md:15` confirms the explicit allow of `pages-prose/`, `pages-prose-plans/`, `INDEX.md`, `storylet-batches/`, `story-promotions/` as intentional. Skill-level plan-hash verification in `branching-story-prose-attach/SKILL.md` Phase 2 detects drift only when prose-attach is explicitly invoked and records FAIL in the receipt rather than blocking the write. A direct Edit/Write to `pages-prose-plans/PG-<integer>.md` followed by an `INDEX.md` update bypasses verification entirely; the PG plan_hash audit bridge between machine state and rendered prose can drift before any later check fires.

**Change**:

1. **New hook source** (`tools/hooks/src/hook6-guard-story-markdown-hash.ts`):
   - Follow the hook3-guard-direct-edit pattern verbatim (`readHookInput`, `classifyPath`, `emitPermissionDecision`, `logDecision`).
   - `classifyPath` resolves the file path and returns one of three classifications:
     - `block` if the path matches `worlds/<slug>/stories/<story-slug>/pages-prose-plans/PG-<integer>.md` AND a corresponding `_source/pages/PG-<integer>.yaml` exists AND that PG record has a non-empty `plan.plan_hash` field that does NOT match the SHA-256 of the new file body (computed against the pending tool_input bytes if available, or — for `Edit` ops — the post-edit file body the assistant intends to write).
     - `block` if the path matches `worlds/<slug>/stories/<story-slug>/INDEX.md` AND any referenced `PG-<integer>` plan in `pages-prose-plans/` has a body whose SHA-256 does not match the corresponding `_source/pages/PG-<integer>.yaml` `plan.plan_hash`.
     - `allow` otherwise (including fresh-write cases where no PG record exists yet — bootstrap / first-write paths).
   - On `block`, the deny prose redirects to `tools/world-mcp/dist/src/cli/compute-pg-hashes.js --plan <plan-path> --pg <pg-path> --emit-updated-pg` or equivalent re-stamping ceremony per `story-state-contract.md` write-order discipline.
   - Compute fresh hashes via the same hashing logic that `compute-pg-hashes.ts` uses; ideally extract the plan-body hashing into a shared helper the new hook can import, OR replicate the SHA-256-over-raw-plan-bytes logic verbatim in the hook (mirror, don't fork — the canonical formula lives in `compute-pg-hashes.ts` / `computePlanHash(planResult.bytes)`).

2. **New hook test** (`tools/hooks/tests/hook6-guard-story-markdown-hash.test.ts`):
   - `hook6_blocks_pg_plan_write_when_hash_mismatches` — fixture: PG record with `plan_hash: "<H1>"`; pending Edit to plan file would produce bytes whose hash is `<H2>`. Expect deny.
   - `hook6_allows_pg_plan_write_when_hash_matches` — fixture: PG record with `plan_hash: "<H1>"`; pending Edit produces bytes whose hash is `<H1>`. Expect allow.
   - `hook6_allows_pg_plan_first_write_when_no_pg_record_exists` — fixture: write to `pages-prose-plans/PG-7.md` with no corresponding `_source/pages/PG-7.yaml`. Expect allow (fresh-bootstrap path).
   - `hook6_blocks_index_update_when_referenced_plan_hash_mismatches` — fixture: bundle INDEX references PG-1; PG-1's stamped `plan_hash` does not match the on-disk plan body. Expect deny.
   - `hook6_allows_index_update_when_all_referenced_plan_hashes_match` — fixture: bundle INDEX references PG-1 and PG-2; both stamped hashes match on-disk bytes. Expect allow.
   - `hook6_allows_unrelated_markdown_writes` — fixture: write to `worlds/<slug>/stories/<story-slug>/pages-prose/PG-1.md` (rendered prose, not plan). Expect allow.

3. **Settings registration** (`.claude/settings.json.example`): append a new `PreToolUse` entry following the hook3 pattern:
   ```jsonc
   {
     "_phase": 2,
     "_spec": "SPEC-40 Hook 6",
     "_purpose": "Block direct Edit/Write to pages-prose-plans/PG-*.md and bundle INDEX.md when stamped PG.plan.plan_hash does not match on-disk plan-body SHA-256. Redirect to compute-pg-hashes re-stamping CLI.",
     "matcher": "Edit|Write",
     "hooks": [
       {
         "type": "command",
         "command": "node tools/hooks/dist/src/hook6-guard-story-markdown-hash.js"
       }
     ]
   }
   ```

4. **Cross-reference updates**:
   - `tools/hooks/README.md`: amend the Hook 3 description to clarify that story-markdown surfaces are now hash-guarded by Hook 6 (not unconditionally allowed); add a Hook 6 entry summarizing the new gate.
   - `.claude/skills/_shared-templates/story-state-contract.md`: in the write-order discipline section that prescribes post-write plan-hash verification, add a note that direct-edit attempts on `pages-prose-plans/PG-*.md` and bundle `INDEX.md` are now Hook-6-blocked at the tool-invocation boundary; skill-level checks remain belt-and-suspenders.
   - `.claude/skills/branching-story-prose-attach/SKILL.md` Phase 2: add a one-line note that direct-edit drift between prose-attach invocations is now hook-blocked.

**Acceptance criteria**:
- `cd tools/hooks && npm test` passes with the six new tests above.
- The hook compiles to `tools/hooks/dist/src/hook6-guard-story-markdown-hash.js`.
- Running the hook against the `hook6_blocks_pg_plan_write_when_hash_mismatches` fixture emits a `decision: deny` permission decision with a redirect message naming `compute-pg-hashes.js`.

**Mechanical consumer**: the Claude Code PreToolUse hook chain; runs alongside hooks 1-5 in the `.claude/settings.json` configuration.

**Blast radius**: 1 new hook source file + 1 new hook test file + 1 settings example line + 3 cross-reference files (README, story-state-contract, branching-story-prose-attach). No validator changes, no MCP server changes, no schema changes.

### D4 — New spawned-process deployed-MCP capability-hash smoke test + MACHINE-FACING-LAYER.md correction (P2, intake F-04 + out-of-report docs drift)

**Problem**: `tools/world-mcp/tests/server/capability-parity.test.ts:60-74` uses `InMemoryTransport.createLinkedPair()` to wire client and server in the same Node process; the SPEC-37 D3 `validate_patch_plan` known-bad smoke at `tools/world-mcp/tests/server/dispatch.test.ts:1274-1326` is similarly in-memory. The only spawned-process test, `tools/world-mcp/tests/integration/server-stdio.test.ts:10-46`, spawns `dist/src/server.js` but verifies only process lifecycle — it never invokes `describe_capabilities` or `validate_patch_plan` over the stdio boundary. So a stale `dist/` bundle (`dist/src/server.js` built against an older validator-source revision) returns its OWN stale hash; the in-memory parity test compares the in-process server's hash to the in-process `computeValidatorRegistryHash()` and trivially matches because both run against the same source. The deployed bundle is never compared to source.

Separately, `docs/MACHINE-FACING-LAYER.md:123` describes `dispatch.test.ts` as the "deployed smoke test" — but `dispatch.test.ts` uses `InMemoryTransport`, not a spawned process. The docs-text is wrong and propagates the same misunderstanding the audit identified.

**Change**:

1. **New spawned-process integration test** (`tools/world-mcp/tests/integration/server-capabilities-hash-parity.test.ts`):
   - Setup: build `dist/` (`npm run build` from `tools/world-mcp/`) if not already present; create a temp repo root with a seeded minimal world; spawn `node tools/world-mcp/dist/src/server.js` as a child process per the `server-stdio.test.ts:10-46` pattern.
   - Wire a stdio client (the `@modelcontextprotocol/sdk` `Client` over stdio transport) to the spawned process.
   - **Hash parity assertion**: invoke `describe_capabilities` over the MCP boundary; parse the response's `build_info.validator_registry_hash` and `build_info.patch_operation_schema_hash`; compare each against fresh source-computed values (`computeValidatorRegistryHash()` and `computePatchOperationSchemaHash()` from `build-info.ts`); assert equality. Mismatch indicates `dist/` is stale relative to source.
   - **Known-bad fixture rejection**: in the same spawned process, invoke `validate_patch_plan` with a known-bad causal-dependency-clobbering fixture (re-use one of the existing dispatch.test.ts fixtures); assert the response carries a verdict with `severity === "fail"` and the expected code. This verifies the deployed validator bundle is wired correctly.
   - Teardown: close client, terminate child process.

2. **Docs correction + release-checklist addition** (`docs/MACHINE-FACING-LAYER.md`):
   - **Correction at `:122-125`**: replace the prose *"The deployed smoke test at `tools/world-mcp/tests/server/dispatch.test.ts` complements these passive fingerprints by actively exercising validator code paths against known-bad fixtures."* with prose that distinguishes the in-memory `dispatch.test.ts` smoke (catches source-level validator-bundle drift in-process) from the new spawned-process `server-capabilities-hash-parity.test.ts` smoke (catches deployed `dist/` staleness across the MCP stdio boundary). Both are valuable; the labeling must distinguish them.
   - **New release-checklist sub-section**: add a `### Pre-deploy capability-currency smoke` paragraph under the existing `describe_capabilities` documentation. Required steps before claiming capability currency on a freshly-built `dist/`:
     1. `cd tools/world-mcp && npm run build`
     2. `cd tools/world-mcp && npm test -- --grep server-capabilities-hash-parity` (or the equivalent test-selection flag for the chosen test runner)
     3. Confirm the test passes; mismatch indicates `dist/` is stale and must be rebuilt before the server is restarted in a live MCP session.

**Acceptance criteria**:
- `cd tools/world-mcp && npm test` passes with the new test included.
- The new test spawns the actual `dist/src/server.js` process (verified by inspecting `process.argv` of the child or by stdio-only assertions).
- The hash parity assertion passes when `dist/` is current and FAILS when `dist/` is intentionally stale (a manual regression check: rebuild source without rebuilding `dist/`, re-run the test, observe failure).
- The known-bad fixture rejection assertion confirms the deployed validator bundle rejects the same patch the in-memory `dispatch.test.ts` smoke rejects.
- `docs/MACHINE-FACING-LAYER.md:123` no longer mislabels `dispatch.test.ts` as the deployed smoke test.
- The release-checklist paragraph is quotable as a pre-deploy gate.

**Mechanical consumer**: CI / release process; documents the runtime/deployed parity gate that closes the SPEC-37 carry-over.

**Blast radius**: 1 new test file (~80-120 lines including spawn boilerplate) + 1 docs file edit (one paragraph correction + one new sub-section). No source changes, no validator changes, no hook changes.

---

## FOUNDATIONS Alignment

| Principle | Stance | Rationale |
|---|---|---|
| Rule 1 — Story/World Separation | aligns | All four deliverables touch story-pipeline mechanics (validators, hooks, tests, docs) without crossing into world-canon promotion or world-record mutation. No world-level `_source/` records are touched; the canon-promotion path (`story-fact-promotion-to-canon` → `canon-addition` → `story-promotion-closeout`) is unmodified. |
| Schema-Minimalism (FOUNDATIONS §Story Bundles §5c, §Canonical Storage Layer §Schema-Minimalism) | aligns | No new schema fields anywhere. D1 flips one severity literal; D2 adds test fixtures only; D3 reads existing fields (`PG.plan.plan_hash`, `BEL.basis.access_route`) to construct a hook gate; D4 spawns a process to verify currency of already-defined `build_info` fields. The audit's §14 anti-recommendation on schema bloat is honored. |
| HARD-GATE Discipline (FOUNDATIONS §Hard-Gate Sanctity, `docs/HARD-GATE-DISCIPLINE.md`) | aligns | D3's new hook strengthens the HARD-GATE perimeter by closing a fail-open path (direct-edit of plan markdown without re-stamping ceremony); D4's spawned-process smoke verifies that the deployed enforcement surface (`dist/src/server.js`) carries the validator bundle the source defines. No deliverable bypasses or weakens an existing HARD-GATE. |
| Validator Severity Discipline (FOUNDATIONS §Validation, validator `severity_mode` semantics) | aligns | D1 closes a within-validator severity drift where the validator declares `severity_mode: "fail"` but a verdict-construction site emits `severity: "warn"`. Bringing the malformed-tag verdict into alignment with the validator's declared severity mode is structurally correct, not a softening. |
| Present-Causal-State Discipline (FOUNDATIONS §Story Bundles §4 Plan-Authority Boundary) | aligns | D3's hook protects the PG plan-hash audit bridge that ties machine state to rendered prose; without it, the plan body can drift from `PG.plan.plan_hash` before any later check fires, eroding the present-causal-state guarantee. D2's prose clarification distinguishes deterministic-vs-judgment-assisted indirect-witness coverage, sharpening the audit's ability to surface non-mechanized routes rather than implicitly passing them. |
| Forbidden Narrative Machinery (FOUNDATIONS §Story Bundles §5 — no act structure, no drama manager, no fixed endings, no autonomous NPC simulation, no prose-as-state) | aligns | No deliverable introduces narrative machinery; all four are mechanical hardening (severity flip, test fixtures, hook, deployed smoke). The audit's §13 research-synthesis and §14 anti-recommendations are honored — this spec is exactly the "validators / tests / runtime smoke checks / hash retrieval guards, not new narrative ontology" path the auditor recommends. |
| Append-Only Discipline (FOUNDATIONS §Canonical Storage Layer §Append-Only) | N/A | No `_source/` mutation; this spec touches `tools/`, `.claude/skills/`, and `docs/` only. |

---

## Verification

Per-deliverable verification (each acceptance criterion above is the load-bearing gate):

- **D1**: `cd tools/validators && npm test` passes; the renamed test asserts `severity === "fail"`; no other validator regresses.
- **D2**: `cd tools/validators && npm test` passes with eight new tests; `.claude/skills/branching-story-health-audit/SKILL.md` Phase 2d quotably classifies non-mechanized routes.
- **D3**: `cd tools/hooks && npm test` passes with six new tests; the hook compiles to `dist/`; manual smoke confirms a direct-edit attempt on `pages-prose-plans/PG-1.md` with a stamped PG record and drifted bytes is denied.
- **D4**: `cd tools/world-mcp && npm test` passes with the new spawned-process test; a stale-dist manual regression (build source, do not rebuild dist, run test) fails the hash parity assertion; `docs/MACHINE-FACING-LAYER.md:123` is corrected.

Cross-spec verification:
- No `_source/` mutation paths are taken (verifies story/world separation).
- No new validator names appear in `tools/validators/src/public/registry.ts` (verifies "no new validators" claim — only existing validator severity + test surface changes).
- No new patch-engine op kinds appear in `tools/patch-engine/src/envelope/schema.ts` (verifies "no new patch-engine ops" claim).
- No new MCP tools appear in `tools/world-mcp/src/tool-names.ts` (verifies "no new MCP retrieval surfaces" claim).
- No schema files under `tools/validators/src/schemas/` are modified (verifies "no new schema fields" claim).

---

## Out of Scope

- **Full F-02 mechanization (validator-hardening-III cluster)**: multi-location supersession cue, STENT-death-with-SREL cue, STOBJ-as-independent-route cue, environmental-change-via-STLOC-modification cue. Routed to §Risks & Open Questions; the auditor's recommendation explicitly favors fixture-and-prose work here.
- **Audit §11.3 P2 test #4 `story_local_seed_warning_for_pg_bel_se_da`**: extends the SPEC-35-D3 / SPEC-36-D6 context-packet surface; orthogonal to this spec's story-pipeline-validator focus; routed to follow-up ticket.
- **Audit §11.3 P2 test #5 `fixture_unpadded_id_lint_current_only` and #6 `current_docs_do_not_cite_archive_as_authority`**: repo-wide CI lints; outside the story-pipeline cluster; routed to a separate doc-hygiene spec or tools/build CI extension.
- **Audit §12.4 optional research-inspired tests (narrative_qa, salience_starvation, intent_grounding, kg_retrieval)**: confirms-existing-position per the §12.4 / §13.5 verdict pattern in prior iterations; ongoing-discipline candidates rather than this spec's work.
- **The audit's §11.2 P1 test `proposal_package_safety_blocks_integration`**: effectively discharged by SPEC-37 D1's `proposal_package_shape` extension; the existing unit-test coverage exercises the same verdict shape. A separate integration test would mostly re-prove the same path; out of scope for SPEC-40.
- **Hash extraction refactor in `tools/world-mcp/src/cli/compute-pg-hashes.ts`**: D3 may extract the plan-body hashing into a shared helper for the new hook to import, but this is an implementation-detail option rather than a load-bearing deliverable. If the implementer chooses to mirror the SHA-256-of-utf8-bytes formula in the hook source rather than refactor, that is acceptable provided the formula stays in sync.

---

## Risks & Open Questions

- **Validator-hardening-III deferral `(structural)`**: F-02's full mechanization (multi-location supersession + STENT-death-with-SREL + STOBJ-as-independent route + environmental-change-via-STLOC-modification) is genuinely a separate scope from this iteration's narrow fixture-and-prose goal. The auditor's §F-02 Recommendation explicitly endorses the narrow path. A follow-up spec — provisionally validator-hardening-III — should land when the next external audit's findings or a tenth/eleventh-cycle equivalent surfaces the cues in active fixtures. Under no-scope-constraint conditions, the cleaner alternative is to mechanize all four cues; the auditor's explicit "Do not add fields. Add deterministic checks only where current records already encode evidence" guidance favors incremental hardening here.
- **Docs-hygiene CI lints `(pragmatic)`**: the auditor's `fixture_unpadded_id_lint_current_only` and `current_docs_do_not_cite_archive_as_authority` lints would close two recurring drift channels (padded IDs in fixtures; archive citations in current docs). Deferred because they belong in a repo-wide CI/hygiene spec rather than the story-pipeline cluster; the cost is that until they land, fixture rot and archive drift can recur.
- **Hash formula synchronization between hook and CLI**: D3's hook either imports a shared helper from `compute-pg-hashes.ts` or mirrors the SHA-256-over-raw-plan-bytes formula verbatim. If the CLI's hashing formula evolves (e.g., adds a normalization step) and the hook's mirror falls out of sync, both surfaces would compute different hashes for the same plan body — a silent drift. Mitigation: extract a shared helper at D3 implementation time and import it from both surfaces when package boundaries allow it; if mirroring is chosen, add a docstring at the hook's hash-computation site pointing to `compute-pg-hashes.ts` / `computePlanHash(planResult.bytes)` as the canonical formula.
- **Spawned-process test ergonomics**: D4's new test adds ~250ms of process-startup cost to the world-mcp test suite. If multiple deployed-smoke tests accrue over future iterations (D4 sets the pattern), the suite's wall-clock time grows linearly. Mitigation: keep deployed-process tests in `tools/world-mcp/tests/integration/` separate from `tools/world-mcp/tests/server/` so a fast-feedback `--grep server` selection can skip them during inner-loop iteration.
- **Runtime/deployed parity for non-MCP hooks `(pragmatic)`**: F-03's new Hook 6 has the same deployed/runtime question F-04 closes for the MCP server: a stale `tools/hooks/dist/src/hook6-guard-story-markdown-hash.js` would silently allow drift the source forbids. A follow-up spec could extend the deployed-smoke pattern to hooks (e.g., a CI smoke that invokes each hook through the actual Claude Code harness boundary). Out of scope for SPEC-40; mitigate by requiring `npm run build` before manual hook smoke during development.

---

## Implementation Order

Single-spec deliverable; `specs/IMPLEMENTATION-ORDER.md` not created (no other active specs require sequencing).

Recommended within-spec ordering per §Approach above:
- **Phase 1 (parallelizable)**: D1, D2, D4.
- **Phase 2 (after Phase 1)**: D3 (independent but cleanest after D4 lands the deployed-smoke pattern).

## Outcome

Completed on 2026-05-17.

- D1 is implemented and archived at `archive/tickets/SPEC40STOPIPELE-001.md`: `non_propagation_tag_shape` malformed and missing tag verdicts now align to fail severity.
- D2 is implemented and archived at `archive/tickets/SPEC40STOPIPELE-002.md`: `expected_witness_coverage` has indirect-route fixture coverage for `institutional_channel`, `rumor`, `location_trace`, and `object_trace`, and `branching-story-health-audit` classifies non-mechanized propagation routes explicitly.
- D3 is implemented and archived at `archive/tickets/SPEC40STOPIPELE-003.md`: Hook 6 guards story plan markdown and bundle `INDEX.md` plan-hash drift, with hook tests and active workflow references updated.
- D4 is implemented and archived at `archive/tickets/SPEC40STOPIPELE-004.md`: `tools/world-mcp/tests/integration/server-capabilities-hash-parity.test.ts` spawns `dist/src/server.js`, checks capability hashes over stdio, and submits a known-bad causal-dependency fixture through the spawned process; `docs/MACHINE-FACING-LAYER.md` distinguishes in-memory and deployed-process smoke tests.

Verification:

- `cd tools/validators && npm test` — passed; reported 367 passing tests.
- `cd tools/hooks && npm test` — passed; reported 28 passing tests.
- `cd tools/world-mcp && npm test` — passed during D4 closeout; reported 391 passing tests.
- Cross-spec source-surface check: no tracked diff touched `tools/validators/src/public/registry.ts`, `tools/patch-engine/src/envelope/schema.ts`, `tools/world-mcp/src/tool-names.ts`, or `tools/validators/src/schemas/`, preserving the no-new-validator, no-new-patch-op, no-new-MCP-tool, and no-new-schema-field boundaries.

Deviation:

- The D4 manual stale-`dist/` mutation regression was not performed; D4 closeout accepts the fresh build, spawned-process integration test, full package test, and docs grep proof instead.
