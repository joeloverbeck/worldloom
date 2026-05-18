# SPEC42STOSTADEB-001: CLK pressure clock — class foundation

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — adds new story-bundle record class `CLK` (Pressure Clock) end-to-end across `tools/world-index/`, `tools/world-mcp/`, `tools/patch-engine/`, `tools/validators/`, and the canonical story state contract; introduces two new custom patch-engine ops (`tick_pressure_clock`, `resolve_pressure_clock`) on top of the generic `create_<class>_record` / `supersede_<class>_record` pattern; no impact on existing record classes
**Deps**: None

## Problem

Worldloom's story-bundle pipeline has no first-class structure for staged pressure. `THR` (thread) has 8 fields with no progress value, threshold ladder, deadline anchor, driver, firing condition, or offscreen advancement model. `OBL` carries `urgency: low | medium | high` and a natural-language `trigger_to_close: string` but no timer. `CNSQ` carries a 4-value status enum (`pending | resolved | escalated | abandoned`) with no stepwise escalation. Authors approximating staged pressure (a danger that mounts page by page, a deadline that matures, a faction moving offscreen) must repeatedly supersede `THR` or `CNSQ` records — fragile, hard to validate, and impossible to predicate against in storylet preconditions. SPEC-42 introduces `CLK` as a present-causal pressure record with `value`/`max`/`thresholds[]`/`tick_history[]` to close this gap; this ticket is the class's machine-layer foundation.

## Assumption Reassessment (2026-05-17)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. Codebase verified at implementation intake (2026-05-17): all spec-cited foundation files exist (`tools/patch-engine/src/envelope/schema.ts`, `tools/patch-engine/src/ops/create-story-record.ts`, `tools/patch-engine/src/commit/order.ts`, `tools/patch-engine/src/commit/temp-file.ts`, `tools/patch-engine/src/pre-apply-checks/id-allocation-race.ts`, `tools/world-mcp/src/tools/allocate-next-id.ts`, `tools/world-index/src/parse/atomic.ts`, `tools/validators/src/schemas/story-page.schema.json`); existing SLT class confirmed as parity-scan baseline with full registry surface across the same files.
2. Spec verified at `archive/specs/SPEC-42-story-state-debt-secret-clock-records.md` §A (CLK schema, 16 fields), §D (`PG.state_snapshot.active_records[]` extension from 12 to 15 classes), §E Phase 1 (CLK as cleanest §5c-aligned addition shipping first); ChatGPT-Pro proposal at `reports/new-narrative-features-first-iteration.md` §Feature 3 (CLK schema source) with spec-level drops (`deadline.natural_language`, `clock_kind: front`, `visibility: audience_only`) enumerated at §A drops; brainstorm-triage rationale at SPEC-42 §Key design decisions.
3. Cross-skill / cross-tool shared boundary: the `_source/<class>/<ID>.yaml` atomic-source convention established by SPEC-13 (atomic-source migration) and extended to story-bundle records by PEENH-001 governs the new `clocks/` subdirectory; the story-bundle id-class registry at `tools/world-mcp/src/tools/allocate-next-id.ts` is the canonical class-registration site; the OPERATION_KINDS enum at `tools/patch-engine/src/envelope/schema.ts` is the canonical op-registration site; the parser registrations at `tools/world-index/src/parse/atomic.ts` and commit-ordering at `tools/patch-engine/src/commit/order.ts` must enumerate the new class for end-to-end machine-layer integration. Live contract drift corrected before source edits: the canonical §4 schema text now lives in `.claude/skills/_shared-templates/story-record-schemas.md`, while `.claude/skills/_shared-templates/story-state-contract.md` only carries the §3 inventory and non-schema story-state contract. **§Step 2 New-class parity scan surfaced 5 machine-layer files the spec §Deliverables did not enumerate** (parser/atomic.ts, ops/create-story-record.ts, commit/order.ts, commit/temp-file.ts, pre-apply-checks/id-allocation-race.ts); propagated into Files to Touch per §Step 2 routing for under-enumeration that does not change spec intent.
4. FOUNDATIONS §Story Bundles §5b (Schema-Minimalism) motivates this ticket's tight 16-field schema: every field must be load-bearing — directly consumed by a validation gate, replay primitive, predicate, fork operation, or audit-trail discipline. `title` / `clock_kind` / `driver` for human and predicate scoping; `linked_records[]` for traceability + terminal-debt audit; `value` / `max` for present-causal state + threshold tests; `salience` / `visibility` for storylet preconditioning + witness-firewall integration; `thresholds[]` for staged-consequence firing (mirroring `SE.state_delta` and `SLT.effects` create/supersede/close triple); `tick_history[]` for replay determinism; `status` + `resolution_event` for lifecycle. Three fields explicitly DROPPED from the proposal as §5b-violating: `deadline.natural_language` (not validator-readable), `clock_kind: front` (plot-rail-flavored), `visibility: audience_only` (fourth-wall-breaking, §5c-violating).
5. HARD-GATE engine surfaces touched: `tools/patch-engine/src/envelope/schema.ts` OPERATION_KINDS extension (engine-pre-apply gate) + `tools/patch-engine/src/commit/order.ts` (commit-time class-prefix registration that orders engine writes); both surfaces gate canon and story-bundle record writes. Verified: the change does NOT weaken the Mystery Reserve firewall (CLK records are story-local; do not touch world `M-*` records); does NOT silently resolve any Mystery Reserve entry; does NOT alter Hook 3 (`_source/*.yaml` engine-only write enforcement) which continues to apply to the new `_source/clocks/CLK-<integer>.yaml` files. Hook 3 is path-pattern-based (`worlds/<slug>/stories/<story-slug>/_source/<class>/*.yaml`); the new `clocks/` subdirectory is covered by the existing pattern without modification.
6. Existing output schema extended: `tools/validators/src/schemas/story-page.schema.json` — `state_snapshot.active_records` is a permissive mapping in the current JSON Schema, so the ticket-owned schema change is to add the standalone `story-pressure-clock.schema.json` and prove PG records with `state_snapshot.active_records.CLK` remain schema-compliant. The deterministic class enumeration that actually replays bare active-record ID lists lives in `tools/validators/src/_helpers/state-snapshot-replay.ts` and shared structural validators; full cross-class validator enforcement for CLK/STSEC/STQ remains owned by SPEC42STOSTADEB-008.

## Architecture Check

1. **Per-class machine-layer cohesion**: this ticket bundles the entire CLK-specific machine-layer seam (schema + parser + allocator + ops + commit-time registration + pre-apply check) into one cohesive PR. Splitting per-file would force reviewers to context-switch between schema design (the substantive content) and registry one-liners (mechanical wiring) across multiple tickets; bundling per-class keeps the substantive content (schema + custom ops) as the review focus while the mechanical wiring is co-located.
2. **No backwards-compatibility shims**: existing bundles without CLK records remain valid (`branching-story-health-audit` does not flag CLK absence per spec §Verification Backwards-compatibility), but no aliasing path or shim is introduced. The CLK class is purely additive; older bundles simply omit the `_source/clocks/` subdirectory.
3. **Mirrors the canonical SLT pattern**: registration sites enumerate CLK identically to how SLT is enumerated (`allocate-next-id.ts:81-102` adds a row; `parse/atomic.ts` adds a class-prefix mapping; `commit/order.ts` adds the class to its ordered list; `pre-apply-checks/id-allocation-race.ts` adds CLK to its race-check enumeration). The parity-scan at Step 2 confirmed SLT occupies all five seams; this ticket extends each to include CLK.

## Verification Layers

1. CLK schema validates representative record cleanly → schema validation via `npm test --prefix tools/validators`
2. `_source/clocks/CLK-1.yaml` file emission survives Hook 3 write-discipline check → engine pre-apply test via `npm test --prefix tools/patch-engine`
3. `mcp__worldloom__allocate_next_id(world_slug, id_class="CLK", story_slug)` returns next integer → MCP retrieval test via `npm test --prefix tools/world-mcp`
4. `PG.state_snapshot.active_records.CLK` is accepted as an additive bare-ID list by the page schema and deterministic replay helpers know the CLK class → schema validation plus replay-helper unit coverage via `npm test --prefix tools/validators`
5. `tick_pressure_clock` op increments `value` and appends `tick_history[]` entry deterministically → patch-engine op test via `npm test --prefix tools/patch-engine`
6. `resolve_pressure_clock` op sets `status: resolved` and binds `resolution_event` → patch-engine op test via `npm test --prefix tools/patch-engine`
7. FOUNDATIONS §Story Bundles §5b (Schema-Minimalism) alignment → FOUNDATIONS alignment check (manual review against the 16-field roster; each field defended in §A schema-text comment)

## What to Change

### 1. CLK JSON Schema (new file)

Create `tools/validators/src/schemas/story-pressure-clock.schema.json` with the 16-field schema per SPEC-42 §A. Required fields: `id`, `story_id`, `created_at_page`, `title`, `clock_kind`, `driver`, `linked_records`, `value`, `max`, `salience`, `visibility`, `thresholds`, `tick_history`, `status`. Optional fields: `supersedes`, `resolution_event`. Enum constraints: `clock_kind ∈ {danger, racing, mission, faction, exposure, pursuit, deadline}` (note: `front` excluded per spec §A drops); `salience ∈ {low, medium, high}`; `visibility ∈ {hidden, holder_specific, public, factional}` (note: `audience_only` excluded per spec §A drops); `status ∈ {active, paused, resolved, fired, abandoned, superseded}`. Numeric constraints: `value` between 0 and `max`; `max ≥ 1`; `thresholds[].at` between 1 and `max`; `tick_history[].delta ≠ 0`. The `thresholds[].effects` shape mirrors `SE.state_delta` and `SLT.effects`: three keys `create | supersede | close`, each an array of `<record_id> | bound:<alias>`.

### 2. Contract document update — story-state-contract.md

Modify `.claude/skills/_shared-templates/story-state-contract.md` and `.claude/skills/_shared-templates/story-record-schemas.md`:
- §3 (class catalog): add row `CLK | Pressure clock — staged pressure with value/max/thresholds tracking faction/deadline/exposure/pursuit pressure that advances over time or via events.`
- §4 schema text lives in `story-record-schemas.md`; add a CLK subsection with canonical schema text matching the JSON Schema below. Keep the existing §4.1 / §4.2 / §4.3 / §4.4 / §4.5 numbering stable; add CLK as an added story-bundle schema subsection rather than repurposing the existing §4.6 prose-receipt section.
- `story-record-schemas.md` §4.2 (`PG.state_snapshot.active_records`): extend the bare-ID list from 12 classes to add `CLK: [CLK-<integer>]` (one new entry; STSEC + STQ added in SPEC42STOSTADEB-002 / -003 — note the cross-ticket co-edit in the prose; the inline ordering CLK / STSEC / STQ matches SPEC-42 §D).

### 3. PG state-snapshot schema extension

Modify `tools/validators/src/schemas/story-page.schema.json` only as needed to preserve schema acceptance for `state_snapshot.active_records.CLK`; the current schema already permits arbitrary `state_snapshot` keys, so the implementation proof is a positive PG schema test plus `ACTIVE_RECORDS_CLASSES` replay-helper extension in `tools/validators/src/_helpers/state-snapshot-replay.ts`. STSEC and STQ entries are added later by SPEC42STOSTADEB-002 / -003.

### 4. Allocator registration

Modify `tools/world-mcp/src/tools/allocate-next-id.ts:81-102`: add `CLK` to the story-scoped class registry. Subdirectory: `clocks/`. Pattern follows existing entries (e.g., the SLT row). Allocation signature: `allocate_next_id(world_slug, id_class="CLK", story_slug)`.

### 5. World-index parser registration

Modify `tools/world-index/src/parse/atomic.ts`: register `CLK-<integer>` ID prefix and the `clocks/` subdirectory in the atomic-source parser so `world-index build` indexes `_source/clocks/CLK-<integer>.yaml` files alongside existing classes.

### 6. Patch-engine OPERATION_KINDS extension

Modify `tools/patch-engine/src/envelope/schema.ts`: add four new operation kinds to `OPERATION_KINDS`:
- `create_clk_record` — generic create-story-record handler (uses existing `create-story-record.ts` pattern)
- `supersede_clk_record` — same story-record staging path as create, with the replacement record carrying `supersedes: CLK-<integer>`
- `tick_pressure_clock` — custom op: increments `CLK.value` by signed `delta` (positive ticks up, negative ticks down for pause/de-escalation), appends `tick_history[]` entry with `event` + `delta` + `cause`
- `resolve_pressure_clock` — custom op: sets `CLK.status = resolved`, binds `resolution_event`

### 7. Generic create-story-record class mapping

Modify `tools/patch-engine/src/ops/create-story-record.ts`: register `CLK` in the class-prefix-to-subdirectory mapping so `create_clk_record` ops resolve to `_source/clocks/CLK-<integer>.yaml` writes. Follow the existing SLT / STENT / STINT / etc. registration pattern.

### 8. Custom op implementations (two new files)

Create `tools/patch-engine/src/ops/tick-pressure-clock.ts` implementing the `tick_pressure_clock` op:
- Validates `CLK.value + delta` remains within `[0, max]`
- Appends `tick_history[]` entry with `{event: SE-<integer>, delta, cause}`
- Writes updated CLK record back via the same per-file YAML write path as `update-record-field.ts`

Create `tools/patch-engine/src/ops/resolve-pressure-clock.ts` implementing the `resolve_pressure_clock` op:
- Sets `CLK.status = resolved`
- Binds `CLK.resolution_event = SE-<integer>`
- Writes updated CLK record back

Both ops follow the existing `update_record_field.ts` pattern for non-create story-record ops.

### 9. Commit-ordering registration

Modify `tools/patch-engine/src/commit/order.ts`: add `CLK` to the per-class commit ordering list. CLK ordering: insert alongside existing state-record classes (STENT/STINT/SF/BEL/OBL/CNSQ/THR/SREL/STLOC/STOBJ/STSTAT) — pressure clocks are state records that participate in `PG.state_snapshot.active_records[]`.

### 10. Commit temp-file registration

Modify `tools/patch-engine/src/commit/temp-file.ts`: register `CLK` in the per-class temp-file handling so commit-time atomic writes target `_source/clocks/CLK-<integer>.yaml`.

### 11. Pre-apply ID-allocation race check

Modify `tools/patch-engine/src/pre-apply-checks/id-allocation-race.ts`: add `CLK` to the per-class id-allocation race-check enumeration so concurrent allocation attempts are detected per the existing pattern.

## Files to Touch

- `tools/validators/src/schemas/story-pressure-clock.schema.json` (new)
- `tools/patch-engine/src/ops/tick-pressure-clock.ts` (new)
- `tools/patch-engine/src/ops/resolve-pressure-clock.ts` (new)
- `.claude/skills/_shared-templates/story-state-contract.md` (modify — §3 row)
- `.claude/skills/_shared-templates/story-record-schemas.md` (modify — CLK schema sub-section, §4.2 active_records entry)
- `tools/validators/src/schemas/story-page.schema.json` (modify — state_snapshot.active_records enum extension)
- `tools/validators/src/_helpers/state-snapshot-replay.ts` (modify — active-record class enumeration)
- `tools/world-mcp/src/tools/allocate-next-id.ts` (modify — class registry row for CLK)
- `tools/world-index/src/parse/atomic.ts` (modify — CLK class-prefix + clocks/ subdirectory registration)
- `tools/patch-engine/src/envelope/schema.ts` (modify — OPERATION_KINDS adds 4 entries)
- `tools/patch-engine/src/ops/create-story-record.ts` (modify — CLK class-prefix mapping)
- `tools/patch-engine/src/commit/order.ts` (modify — CLK class ordering)
- `tools/patch-engine/src/commit/temp-file.ts` (modify — CLK class temp-file handling)
- `tools/patch-engine/src/pre-apply-checks/id-allocation-race.ts` (modify — CLK class registration)

## Out of Scope

- CLK validators (`clock_value_in_range`, `clock_threshold_ordering`, `clock_tick_provenance`, `clock_firing_threshold_integrity`, `clock_terminal_debt_integrity`) — owned by SPEC42STOSTADEB-005
- CLK predicate DSL entries (`clock_at_least`, `clock_below`, `clock_full`, `any_clock_active`) — owned by SPEC42STOSTADEB-005
- MCP retrieval extensions (`get_record` / `get_records` / `list_records` / `get_context_packet` / `get_record_schema`) — owned by `archive/tickets/SPEC42STOSTADEB-004.md`. Minimal `describe_envelope_schema` coverage landed here because the existing `OPERATION_KINDS` exhaustiveness test requires every patch operation to be introspectable when it is introduced.
- Shared validator extensions for `state_snapshot_integrity` / `snapshot_replay_equality` / `branch_isolation` / `observer_firewall` — owned by SPEC42STOSTADEB-008
- Skill integrations (turn-cycle / bootstrap / commitment-block-authoring / health-audit / prose-attach) — owned by SPEC42STOSTADEB-009 through -013
- STSEC and STQ class foundations — owned by SPEC42STOSTADEB-002 / -003

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/validators` — `story-pressure-clock.schema.json` validates a representative CLK record and rejects structural invalid records (enum violations and zero tick deltas); `story-page.schema.json` accepts `state_snapshot.active_records.CLK`, and replay-helper coverage proves CLK participates in active-record replay. Plain JSON Schema sibling comparisons (`value <= max`, `thresholds[].at <= max`) remain outside this ticket's structural schema proof and are enforced by the patch op or later semantic validators.
2. `npm test --prefix tools/patch-engine` — `create_clk_record` writes valid YAML at `_source/clocks/CLK-1.yaml`; `supersede_clk_record` writes superseding record; `tick_pressure_clock` increments `value` and appends `tick_history[]`; `resolve_pressure_clock` sets `status: resolved` and binds `resolution_event`; commit-ordering places CLK alongside state-record classes
3. `npm test --prefix tools/world-mcp` — `allocate_next_id(world_slug, id_class="CLK", story_slug)` returns next CLK integer scoped to the bundle
4. `npm run build --prefix tools/world-index` (build only — MCP retrieval integration for CLK landed later in `archive/tickets/SPEC42STOSTADEB-004.md`)

### Invariants

1. CLK records are stored exclusively at `worlds/<slug>/stories/<story-slug>/_source/clocks/CLK-<integer>.yaml` — Hook 3 enforces engine-only writes on this path pattern
2. Every `tick_history[]` entry references a real `SE-<integer>` event in the same branch path — `clock_tick_provenance` validator (owned by SPEC42STOSTADEB-005) enforces this at validation time; this ticket's structural correctness is that the op schema permits only `SE-<integer>` references in the `event` field
3. `CLK.value` is always in `[0, CLK.max]` post-tick — the `tick_pressure_clock` op rejects deltas that would violate this invariant
4. No existing record class is altered; existing bundles without CLK records pass all validators with no warnings — additive-only extension

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance-pressure-clock.test.ts` (new) — record-schema-compliance positive + negative tests for CLK structural schema coverage (enum constraints and nonzero tick deltas)
2. `tools/validators/tests/structural/record-schema-compliance-story-page.test.ts` (modify) — cover `state_snapshot.active_records.CLK` schema acceptance
3. `tools/validators/tests/structural/snapshot-replay-equality.test.ts` (modify) — cover CLK active-record replay
3. `tools/patch-engine/tests/ops/tick-pressure-clock.test.ts` (new) — op-level tests for `tick_pressure_clock` (positive ticks, negative ticks for pause/de-escalation, out-of-range rejection)
4. `tools/patch-engine/tests/ops/resolve-pressure-clock.test.ts` (new) — op-level tests for `resolve_pressure_clock` (status transition, resolution_event binding)
5. `tools/patch-engine/tests/ops/create-story-record.test.ts` (modify) — extend existing tests to cover `create_clk_record` writing to `_source/clocks/`
6. `tools/world-mcp/tests/tools/allocate-next-id.test.ts` (modify) — extend existing tests to cover `id_class="CLK"` allocation

### Commands

1. `npm test --prefix tools/validators` — schema-level validation
2. `npm test --prefix tools/patch-engine` — op-level + commit-pipeline tests
3. `npm test --prefix tools/world-mcp` — allocator tests
4. `npm run build --prefix tools/world-index` — parser builds cleanly with CLK registration (full retrieval integration deferred to `archive/tickets/SPEC42STOSTADEB-004.md`)
5. The full-pipeline verification command (representative CLK record round-tripping through allocator → patch-engine → world-index → retrieval) lands in SPEC42STOSTADEB-015 capstone; this ticket's verification boundary is the per-package test surface above

## Outcome

Implemented the CLK foundation across the machine-layer seams:

- Added `pressure_clock_record` / `CLK` registration to world-index parsing, validator structural discovery, MCP allocation, MCP input validation, patch-engine operation schemas, create/supersede staging, commit ordering/temp-file handling, and ID allocation race checks.
- Added `create_clk_record`, `supersede_clk_record`, `tick_pressure_clock`, and `resolve_pressure_clock` support. `tick_pressure_clock` rejects non-integer, zero, and out-of-range deltas; `resolve_pressure_clock` writes `status: resolved` and binds `resolution_event`.
- Added `story-pressure-clock.schema.json`, `state_snapshot.active_records.CLK` schema acceptance, and CLK replay-helper support.
- Updated the story-state and story-record schema templates so CLK is documented in the canonical class inventory and story-bundle schema text.

## Deviations / Truthing

- The ticket's drafted schema-level `value > max` and `thresholds[].at > max` negative tests were narrowed. Standard JSON Schema cannot compare sibling values without nonstandard `$data`; this ticket enforces post-tick `value` bounds in `tick_pressure_clock`, while richer semantic clock validators remain assigned to SPEC42STOSTADEB-005.
- `describe_envelope_schema` and the MCP `ID_CLASSES` input enum were updated in the same seam because the existing MCP build/tests require the public operation and allocator surfaces to remain exhaustive. Broader CLK retrieval remained out of scope here and later landed in `archive/tickets/SPEC42STOSTADEB-004.md`.
- `tools/validators/src/structural/utils.ts` needed both schema mapping and structural-authority recognition for `_source/clocks/CLK-<integer>.yaml`; without both, `record_schema_compliance` would silently skip CLK records.

## Verification Result

- PASS: `npm test` in `tools/patch-engine` (81 tests)
- PASS: `npm test` in `tools/validators` (371 tests)
- PASS: `npm test` in `tools/world-mcp` (392 tests)
- PASS: `npm run build` in `tools/world-index`
- PASS: `git diff --check`
