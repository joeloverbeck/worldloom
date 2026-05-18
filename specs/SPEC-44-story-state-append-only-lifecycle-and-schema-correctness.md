<!-- spec-drafting-rules.md not present; using default structure + Deliverables + Risks & Open Questions. -->

# SPEC-44: Story-State Append-Only Lifecycle and Schema Correctness

**Status**: draft (2026-05-18)
**Brainstorm source**: `reports/story-system-consolidation.md` triage
**Companion**: `docs/triage/2026-05-18-story-system-consolidation-triage.md`

## Problem Statement

The story-bundle pipeline has two production-real correctness defects against the FOUNDATIONS contract that SPEC-43 (`Present-Causal Mid-Story State Introduction`, merged 2026-05-18) did not address. Both are surfaced by a third-party consolidation report (`reports/story-system-consolidation.md`); the report makes ~30 codebase claims, most verified, but several of its top-billed recommendations contradict SPEC-43 design decisions made 5 days earlier. The companion triage file enumerates the full verdict set; this spec scopes to the items not addressed by SPEC-43 and not deferred to Wave 3.

### Defect 1: Seven patch-engine lifecycle ops mutate story-state YAML in-place

`tools/patch-engine/src/ops/tick-pressure-clock.ts`, `resolve-pressure-clock.ts`, `append-secret-clue-carrier.ts`, `mark-secret-clue-discovered.ts`, `reveal-story-secret.ts`, `answer-story-question.ts`, and `abandon-story-question.ts` all follow the same pattern: load an existing record's YAML file → modify fields in memory → call `stageExistingRecordFile` to stage a write to the **same path**. For example, `tick-pressure-clock.ts:96-101` directly assigns `loaded.record.value = nextValue` and pushes to `loaded.record.tick_history`, then stages the same `CLK-<N>.yaml` file. There is no new record id; the prior CLK state is overwritten on disk.

This violates FOUNDATIONS §Story Bundles §8 ("atomic YAML records remain append-only at the filesystem level, following the same record-append-only discipline that governs `_source/<world-subdir>/*.yaml`") and the story-state-contract §7 Gate 5 ("append-only delta — All changes in `SE.state_delta` are creates / supersessions / closes. No in-place mutation of a prior record"). The ops are advertised to LLM callers via `tools/world-mcp/src/tools/describe-envelope-schema.ts` (their schemas appear in `OPERATION_KINDS`), so an LLM authoring story moves can — and the turn-cycle skill currently does — choose them over the supersession path.

The three ops named `supersede_clk_record` / `supersede_stsec_record` / `supersede_stq_record` exist but are misleadingly named: all three route to `stageCreateStoryRecord` (`commit/temp-file.ts:271-278`) and call `stageNewRecordFile`. They create a **new** record file with `supersedes: <prior_id>` set on the body; they do not mutate the prior record. This is the architecturally correct shape, but the lifecycle ops bypass it.

### Defect 2: `story-event.schema.json` `state_delta` regex rejects classes the patch-engine produces

`tools/validators/src/schemas/story-event.schema.json:90-108` defines the `state_delta.create/supersede/close` id pattern as:

```
^(STENT|STINT|SF|BEL|SE|OBL|CNSQ|THR|SREL|STLOC|STOBJ|DA|BR|PG|CHC|SLT)-[0-9]+$
```

Four classes that the patch-engine creates via `create_ststat_record`, `create_clk_record`, `create_stsec_record`, `create_stq_record` (and supersedes via the three create-with-supersedes ops above) are **omitted**: `STSTAT`, `CLK`, `STSEC`, `STQ`. A correctly-formed `SE.state_delta` referencing any of these classes fails schema validation. SPEC-42 (debt/secret/clock bootstrap) and SPEC-43 (mid-story introduction for these classes) both rely on these IDs being addressable in state_delta. The schema and the runtime are out of sync.

### Why not bundled with SPEC-43

SPEC-43 scoped to mid-story *introduction* of the six causal-engine classes (CLK/STSEC/STQ/THR/STENT/SREL); it did not touch the patch-engine op vocabulary or the SE schema id patterns. The report `reports/story-system-consolidation.md` independently surfaced both defects after SPEC-43 merged; verification confirms both are real and non-overlapping with SPEC-43's deliverables.

### Key design decisions

- Considered reversing SPEC-43's parseable-intro-tag choice and moving to structured `SE.record_introductions[]` (report §1 claim #1, §7); rejected. Reason (structural): SPEC-43 made the parseable form deterministic via closed regex + closed per-class trigger vocabularies + 9 enforcing validators. The machine-criticality concern is met by enforcement, not by storage shape. Reversing 5 days post-merge would undo 17 implementation tickets without changing what the validators check.
- Considered extending mid-story introduction grounding from 6 → 14 created classes (report §7 generalized provenance); deferred to Wave 3 with §7-a in the triage. Reason (pragmatic): each additional class needs its own trigger vocabulary + per-class grounding validator; the 6 SPEC-43 classes were chosen because they introduce *persistent causal pressure* that STSTAT/STINT/SF/BEL/OBL/CNSQ/STLOC/STOBJ/DA do not. Several already have alternate grounding (e.g., `entity_introduction_status_pairing` for STSTAT). Scope-distinct from this spec.
- Considered including the MCP/world-index provenance expansion (report §10, 18 new edge types + parser + 4 retrieval helpers + context-packet expansion) in this spec; deferred to a follow-up spec. Reason (structural): the expansion is a capability surface (retrievability), not a contract surface (correctness). Bundling would roughly double the spec's blast radius across `tools/world-index/`, `tools/world-mcp/`, and downstream consumers without sharing implementation surface with this spec's contract-correctness work.
- Considered renaming `supersede_clk_record` / `supersede_stsec_record` / `supersede_stq_record` to honest `create_<class>_record_with_supersedes` (or similar) since they don't mutate; rejected. Reason (pragmatic): the names appear in OPERATION_KINDS, MCP describe-envelope-schema, every consuming skill, all fixtures and tests; a rename touches dozens of sites for cosmetic clarity. Document the actual semantics in the spec deliverables and turn-cycle reference text instead.
- Considered making `PG.state_snapshot.active_records` strictly required (report §1 claim #5, §5b); deferred. Reason (structural): the SPEC-43 compatibility-drift validator + `OPTIONAL_ACTIVE_RECORDS_CLASSES` + `isLegacyCompatibilityPage` were explicitly designed as the SPEC-43→current-contract transition discipline. Strict enforcement awaits the Wave 3 `branching-story-compatibility-repair` skill (already in SPEC-43 deferral list lines 224-231). A `warn`-level diagnostic exists today via `compat_missing_active_record_key`.
- Considered making `srel_intro_duplicate_axis` upgrade-to-fail conditional on a deprecation window; rejected. Reason (structural): the validator already exists at warn; upgrading severity is mechanical and the report verifies the underlying invariant (no two active SREL records with same participants + axis + direction) is correct discipline regardless of when authoring catches the duplicate.

## Approach

Three phases, executed in order. Each phase is independently testable; later phases depend on earlier-phase invariants.

### Phase 1 — Schema correctness (mechanical, low-risk)

1. Update `tools/validators/src/schemas/story-event.schema.json` `state_delta.create/supersede/close` id pattern to:
   ```
   ^(STENT|STSTAT|STINT|SF|BEL|SE|OBL|CNSQ|THR|CLK|STSEC|STQ|SREL|STLOC|STOBJ|DA|BR|PG|CHC|SLT)-[0-9]+$
   ```
   (Adds STSTAT, CLK, STSEC, STQ.) Run the full validator test suite — pre-existing tests that built fixtures around the limited pattern may need fixture updates if they relied on the missing classes being rejected; the more likely outcome is that they previously couldn't exercise these classes and now can.

2. Refactor the inline `visible_affordances` shape in `tools/validators/src/schemas/story-page.schema.json` (lines 106-153) into a top-level `$defs.PageAffordance` component; reference it via `$ref` from the existing location. Mechanical structural refactor with no semantic change. Enables Phase 3 validator addition.

3. Upgrade `relationship-introduction-grounding-integrity.ts` severity for `srel_intro_duplicate_axis` from `warn` to `fail`. Update the corresponding validator test fixture if any test asserts the warn-level outcome.

### Phase 2 — Append-only supersession enforcement

4. Delete the 7 lifecycle ops from `tools/patch-engine/src/ops/`:
   - `tick-pressure-clock.ts`
   - `resolve-pressure-clock.ts`
   - `append-secret-clue-carrier.ts`
   - `mark-secret-clue-discovered.ts`
   - `reveal-story-secret.ts`
   - `answer-story-question.ts`
   - `abandon-story-question.ts`

5. Remove the 7 op kinds from `tools/patch-engine/src/envelope/schema.ts` `OPERATION_KINDS` (lines 95-104). Remove their routing in `tools/patch-engine/src/commit/temp-file.ts` and any dispatch tables.

6. Update `tools/world-mcp/src/tools/describe-envelope-schema.ts` (imports `OPERATION_KINDS` from `package-interop.js`; will pick up the schema removal automatically). Verify persisted-summary slice paths no longer reference removed ops.

7. Add new pre-apply validator `tools/validators/src/structural/no-story-state-in-place-mutation.ts`. Rule: a patch plan's staged writes must not target an existing `worlds/<slug>/stories/<slug>/_source/<class>/<ID>.yaml` file. The `stageNewRecordFile` path allocates fresh IDs via the allocator; any staged write whose target already exists on disk OR whose target matches a record-id already created earlier in the same plan with a different content hash signals an in-place mutation attempt. Severity: `fail`. Wire into the pre-apply gate registry.

8. Add new validator `tools/validators/src/structural/state-delta-class-integrity.ts`. Rule: every id in `SE.state_delta.create/supersede/close` matches one of the 20 story-bundle class prefixes (the full set, post-Phase-1 schema fix), and each id resolves to a record present in the patch plan or repository. Backstops Phase 1's schema fix at runtime (catches cases where the schema regex is correct but the resolved record is missing).

9. Update `.claude/skills/branching-story-turn-cycle/SKILL.md` Output table rows for CLK / STSEC / STQ to remove the "(existing record update)" framings that referenced the now-deleted lifecycle ops. Each lifecycle transition becomes a `supersede_<class>_record` (which is, mechanically, a create-with-supersedes call) per the existing op vocabulary. Document the create-with-supersedes semantics explicitly in `.claude/skills/branching-story-turn-cycle/references/phase-4-5-belief-and-mystery.md` or a new sub-section, noting that the "supersede" op name describes intent, not in-place edit.

### Phase 3 — Validator additions

10. Add validator `tools/validators/src/structural/page-affordance-integrity.ts`. Rules (all `fail`):
    - `ordinal` integers within a page are unique
    - `grounded_in` records are present in `state_snapshot.active_records[STLOC|STOBJ]`
    - `available_to` entities are present in `state_snapshot.active_records.STENT`
    - `action_families[]` values are drawn from the closed action-family enum (already in schema)
    Consumes the `$defs.PageAffordance` component extracted in Phase 1 step 2.

11. Reassess propagation-exception coverage against the live validator package. The semantic coverage validator already exists as `tools/validators/src/structural/expected-witness-coverage.ts`: it computes direct witnesses from active STSTAT/STLOC state, checks same-event BEL propagation, accepts parseable `non_propagation:<reason>(group=<label>, records=[...])` tags, and enforces the DA-anchored indirect propagation route. Keep `non-propagation-tag-shape.ts` as the tag-syntax validator and do not add a duplicate `propagation_exception_integrity` validator or a phantom `SE.expected_witnesses` schema field.

12. Add validator `tools/validators/src/structural/active-records-full-shape.ts`. Rule: emit a `warn`-level diagnostic when a `PG.state_snapshot.active_records` map omits any of the 15 documented record classes. Distinct from the existing SPEC-43 `compatibility_drift.compat_missing_active_record_key` which classifies the absence as `grandfathered_snapshot_shape`/`requires_migration_patch`; this validator is the consolidated check that the active_records map is shape-complete at child-PG commit time. The Wave 3 `branching-story-compatibility-repair` skill will eventually upgrade this to `fail`; ship as `warn` to preserve pre-SPEC-43 bundles consistent with §Story Bundles §4b drift discipline.

## Deliverables

| Phase | File | Action |
|---|---|---|
| 1 | `tools/validators/src/schemas/story-event.schema.json` | Add STSTAT/CLK/STSEC/STQ to state_delta id pattern (3 lines) |
| 1 | `tools/validators/src/schemas/story-page.schema.json` | Extract `visible_affordances` → `$defs.PageAffordance`, `$ref` from current location |
| 1 | `tools/validators/src/structural/relationship-introduction-grounding-integrity.ts` | Upgrade `srel_intro_duplicate_axis` from `warn` to `fail` |
| 2 | `tools/patch-engine/src/ops/tick-pressure-clock.ts` | Delete |
| 2 | `tools/patch-engine/src/ops/resolve-pressure-clock.ts` | Delete |
| 2 | `tools/patch-engine/src/ops/append-secret-clue-carrier.ts` | Delete |
| 2 | `tools/patch-engine/src/ops/mark-secret-clue-discovered.ts` | Delete |
| 2 | `tools/patch-engine/src/ops/reveal-story-secret.ts` | Delete |
| 2 | `tools/patch-engine/src/ops/answer-story-question.ts` | Delete |
| 2 | `tools/patch-engine/src/ops/abandon-story-question.ts` | Delete |
| 2 | `tools/patch-engine/src/envelope/schema.ts` | Remove 7 op kinds from OPERATION_KINDS array |
| 2 | `tools/patch-engine/src/commit/temp-file.ts` | Remove 7 op routing cases |
| 2 | `tools/patch-engine/src/ops/index.ts` (or barrel) | Remove 7 exports |
| 2 | `tools/validators/src/structural/no-story-state-in-place-mutation.ts` | New validator (pre-apply gate) |
| 2 | `tools/validators/src/structural/state-delta-class-integrity.ts` | New validator (pre-apply + full) |
| 2 | `tools/validators/src/public/registry.ts` | Register two new validators |
| 2 | `.claude/skills/branching-story-turn-cycle/SKILL.md` | Update Output table rows for CLK/STSEC/STQ |
| 2 | `.claude/skills/branching-story-turn-cycle/references/phase-4-5-belief-and-mystery.md` (or new ref) | Document create-with-supersedes semantics for lifecycle transitions |
| 3 | `tools/validators/src/structural/page-affordance-integrity.ts` | New validator (fail) |
| 3 | `tools/validators/src/structural/expected-witness-coverage.ts` | Existing validator confirmed as the semantic propagation-exception coverage gate |
| 3 | `tools/validators/src/structural/active-records-full-shape.ts` | New validator (warn) |
| 3 | `tools/validators/src/public/registry.ts` | Register three new validators |
| All | `tools/patch-engine/tests/` | Remove tests for 7 deleted ops; add tests for new validators |
| All | `tools/validators/tests/structural/` | Add tests for 4 new validators and preserve existing `expected_witness_coverage` / `non_propagation_tag_shape` coverage |
| All | `tools/validators/tests/integration/spec44-*.test.ts` | Integration test covering append-only enforcement across the 7 lifecycle scenarios via supersession |

## FOUNDATIONS Alignment

| Principle | Stance | Rationale |
|---|---|---|
| §Story Bundles §8 — atomic YAML records append-only at filesystem level | aligns | Phase 2 deletes the 7 ops that contradict this rule; the `no_story_state_in_place_mutation` validator backstops the contract at the pre-apply gate. |
| §Story Bundles §7 Gate 5 — append-only delta, no in-place mutation | aligns | Phase 2 ops removal closes the only authoring surface that bypassed this gate. |
| §Story Bundles §5b — schema minimalism (every field load-bearing) | aligns | No new schema fields added; new validators consume existing fields (`state_delta`, `visible_affordances`, `non_propagation:` tags, `active_records` map). |
| §Story Bundles §4b — canon baseline drift, no silent treatment | aligns | Phase 3 `active-records-full-shape` validator surfaces shape-drift at `warn` severity rather than silently normalizing; complements existing SPEC-43 `compatibility-drift` classifications without overriding them. |
| §Story Bundles §4 — engine-only write surface for story-bundle `_source/` | aligns | Phase 2 narrows the engine's own op vocabulary to match Hook 3's filesystem-level blocking (Hook 3 blocks raw Edit/Write; the lifecycle ops were the engine-routed bypass). |
| §Story Bundles §6b — observer firewall | N/A | Spec does not touch firewall logic. |
| §Story Bundles §5c — present causal state, not narrative shape | N/A | Spec adds enforcement, not authoring shape. |

## Verification

Phase 1:
- `npm run build` from `tools/validators` passes.
- The existing `record-schema-compliance-story-event` test passes with the expanded pattern.
- A new test asserting `SE.state_delta` carrying STSTAT, CLK, STSEC, STQ ids validates clean.
- A test asserting `srel_intro_duplicate_axis` emits `fail` (not `warn`) passes.

Phase 2:
- `tools/patch-engine` build passes after deletions (no leftover imports).
- `node --test dist/tests/...` for patch-engine passes; deleted-op tests are removed.
- New integration test `spec44-append-only-supersession.test.ts` covers: ticking a clock by writing a new CLK record with `supersedes: CLK-<prior>` and a `state_delta.supersede: [CLK-<prior>]` entry in the carrying SE; revealing a secret as a superseding STSEC; answering a question as a superseding STQ. Each scenario asserts the prior record file is unmodified on disk and the new record file is created.
- The `no_story_state_in_place_mutation` validator fires `fail` when a synthetic patch plan attempts to write to an existing CLK/STSEC/STQ file.
- The `state_delta_class_integrity` validator fires `fail` when an SE references a class not in the (post-Phase-1) permitted set, AND when an SE references a class-correct id that resolves to no record in the plan or repository.
- `.claude/skills/branching-story-turn-cycle/SKILL.md` Output table renders coherently with the new semantics (manual review).

Phase 3:
- `page_affordance_integrity` validator fires on synthetic fixtures: duplicate ordinals; affordance grounded in inactive STOBJ; affordance available_to inactive STENT; unknown action_family.
- `expected_witness_coverage` remains the semantic propagation-exception coverage validator: it fires when computed direct witnesses lack BEL coverage and no matching `non_propagation:` tag covers the group, and it also fires for public/factional DA indirect propagation gaps without an indirect-route BEL or `event_leaves_no_accessible_trace` tag.
- `active_records_full_shape` validator emits `warn` when a synthetic PG omits CLK/STSEC/STQ/DA keys; remains silent (or `info`) when the bundle is classified as legacy by `compatibility-drift`.
- Full validator suite passes (`npm test --prefix tools/validators`).
- `node tools/validators/dist/src/cli/world-validate.js erotica-world --story red-bunny --structural --json` exits 0 with `fail_count: 0` (the warn-only `active_records_full_shape` may add to `warn_count`; pre-SPEC-43 bundles may add to `info_count` via existing compatibility-drift; document expected counts).

End-to-end:
- The five-skill story-pipeline regression suite (turn-cycle bootstrap → turn → prose-attach → health-audit → promotion-closeout) runs against the red-bunny bundle without failures attributable to this spec's changes.

## Out of Scope

- **Reversing SPEC-43's parseable intro-tag choice** (report §1 claim #1, §7). The parseable form is deterministic; replacing it with structured `SE.record_introductions[]` would undo 17 implementation tickets without changing what validators enforce.
- **Removing compatibility/grandfathering/normalization paths** (report §1 claim #4, §8). `compatibility-drift.ts`, `OPTIONAL_ACTIVE_RECORDS_CLASSES`, and `isLegacyCompatibilityPage` exist by SPEC-43 design as the transition discipline; hard-fail is deferred to Wave 3.
- **Making `PG.state_snapshot.active_records` keys strictly required at the schema level** (report §1 claim #5). Awaits Wave 3 `branching-story-compatibility-repair` skill. Phase 3's `active-records-full-shape` `warn`-level diagnostic is the bridge.
- **Extending mid-story introduction grounding from 6 → 14 classes** (report §7-a). The 6 SPEC-43 classes were chosen because they carry persistent causal pressure; STSTAT/STINT/SF/BEL/OBL/CNSQ/STLOC/STOBJ/DA each have alternate grounding (e.g., `entity_introduction_status_pairing`).
- **World-index edge expansion and MCP context-packet provenance summaries** (report §10, 18 new edge types + parser + 4 retrieval helpers). Capability-expansion track; deferred to a follow-up spec. Roughly doubles this spec's blast radius without sharing implementation surface.
- **Renaming the `supersede_<class>_record` ops** to reflect their create-with-supersedes semantics. Cosmetic clarity at high downstream cost; documented in deliverables instead.
- **`STPLAN`, branch convergence contract, resource/capability records** (report §6 candidate-future, §15 optional). Future-work surfaces; not warranted by current audit evidence.
- **Manual repair guidance / `story-contract-repair-plan` skill** (report §13). Wave 3 per SPEC-43.

## Risks & Open Questions

- **Risk (pragmatic)**: deleting the 7 lifecycle ops will break any existing patch plans, fixtures, or tests authored against them. Verification step in Phase 2 includes grepping `tools/` and `.claude/skills/` for lingering references; the brainstorm's verification already shows the ops appear in `OPERATION_KINDS`, `temp-file.ts` routing, and turn-cycle's documented authoring path. Test fixtures under `tools/patch-engine/tests/` will need updates or deletion. The blast radius is bounded — there is no consumer outside the worldloom repo.
- **Risk (structural)**: the `no_story_state_in_place_mutation` validator's check needs to distinguish "this op is writing a new record that happens to land at a path the same as a prior plan-op staged" (a legitimate two-op plan that creates a record and supersedes-by-modifying-related-record) from "this op is overwriting an existing committed record." The deletion of the lifecycle ops removes the only legitimate-mutation case; post-deletion, any existing-file overwrite is a bug. Validator logic should be: target file path exists on disk OR target id was created earlier in the same plan and the staged content hash differs → fail.
- **Open question**: Phase 2 step 9 (skill text amendments) — should the turn-cycle skill's documentation of create-with-supersedes semantics live in a new dedicated reference file (e.g., `references/append-only-state-lifecycle.md`) or in the existing `phase-4-5-belief-and-mystery.md`? Default assumption: new dedicated file for surface area; can fold during implementation if reviewer prefers consolidation.
- **Open question (pragmatic)**: should Phase 3's `active_records_full_shape` validator's `warn` severity become tunable to `fail` via a CLI flag (anticipating the Wave 3 cutover)? Or wait until Wave 3 to introduce the severity-mode flag? Default: hardcoded `warn`; cleaner to introduce the flag as part of the Wave 3 spec.
- **Open question**: the report's R-MD8 deferral (world-index edge expansion + MCP provenance summaries) is genuinely scope-distinct, but the gap is real today. Should the follow-up spec be scheduled now (created in `specs/` as a placeholder) or deferred until SPEC-44 lands? Default: deferred — the placeholder spec creates noise without committing to a date.
