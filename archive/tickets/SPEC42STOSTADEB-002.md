# SPEC42STOSTADEB-002: STSEC story secret — class foundation

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — adds new story-bundle record class `STSEC` (Story Secret) end-to-end across `tools/world-index/`, `tools/world-mcp/`, `tools/patch-engine/`, `tools/validators/`, and the canonical story state contract; introduces three new custom patch-engine ops (`append_secret_clue_carrier`, `mark_secret_clue_discovered`, `reveal_story_secret`) on top of the generic `create_<class>_record` / `supersede_<class>_record` pattern; integrates with the existing Mystery Reserve firewall via `protected_mystery_refs[]`; no impact on existing record classes
**Deps**: None

## Problem

Worldloom's story-bundle pipeline has no first-class structure for story-local hidden truth. `BEL` records what a holder claims/believes/suspects/denies/witnesses, `SF` records branch truth, `DA` preserves diegetic-artifact content, and `PG.state_snapshot.unresolved_mystery_claims[].status` (`preserved | clue_added | narrowed | apparent_resolution | held_for_promotion`) tracks accretion against world-level Mystery Reserve. What is missing is a *story-local* binding: a `BEL` records "Captain Sera lied about the manifests"; another `BEL` records "the margin nickname is her brother's"; nothing in the schema says "these point at the same hidden truth," so storylets cannot precondition on `revelation_ready`, validators cannot flag premature revelation, and health-audit cannot detect a critical revelation arriving without clue support. SPEC-42 introduces `STSEC` to bind these — with an embedded `clue_carriers[]` sub-array absorbing the clue-tracking concept the proposal originally framed as a parallel `STCLUE` class (rejected at brainstorm-triage to avoid duplicating existing `BEL.basis.access_route` / `access_records[]` and `unresolved_mystery_claims[].status` machinery). This ticket is the class's machine-layer foundation.

## Assumption Reassessment (2026-05-17)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. Codebase verified at SPEC-42 brainstorm + Step 2 codebase validation (2026-05-17): all spec-cited foundation files exist; existing SLT class confirmed as parity-scan baseline; existing Mystery Reserve firewall lives at `tools/validators/src/rules/rule7-mystery-reserve-preservation.ts` (verified present); existing `BEL.basis.access_route` + `access_records[]` schema verified at `.claude/skills/_shared-templates/story-state-contract.md` §4.1; existing `PG.state_snapshot.unresolved_mystery_claims[].status` enum (5 values including `clue_added`) verified at `tools/validators/src/schemas/story-page.schema.json`.
2. Spec verified at `archive/specs/SPEC-42-story-state-debt-secret-clock-records.md` §B (STSEC schema, 13 fields including `clue_carriers[]` sub-array), §D (active_records extension), §E Phase 2 (STSEC ships after CLK proves the pattern); ChatGPT-Pro proposal at `reports/new-narrative-features-first-iteration.md` §Feature 2 (STSEC + STCLUE source) with the STCLUE drop documented in SPEC-42 §Key design decisions (overlap with existing BEL.basis + unresolved_mystery_claims machinery); spec-level drops `audience_state: misled`, `criticality` (collapsed to `salience`), `secret_kind: other`, parallel `STCLUE` class.
3. Cross-skill / cross-tool shared boundary: the `_source/<class>/<ID>.yaml` atomic-source convention governs the new `secrets/` subdirectory; the same five machine-layer registration sites enumerated in SPEC42STOSTADEB-001 must register STSEC; the **Mystery Reserve firewall** at gate 3 of the eight shared hard gates (per `.claude/skills/_shared-templates/story-state-contract.md` §7) remains authoritative for any STSEC that touches a world `M-*` entry via `protected_mystery_refs[]` — STSEC is strictly story-local, never silently resolves world Mystery Reserve.
4. FOUNDATIONS §Rule 7 (Preserve Mystery Deliberately) + §Story Bundles §5b (Schema-Minimalism) motivate this ticket. Rule 7: `STSEC.protected_mystery_refs[]` cross-references world `M-*` entries; `STSEC.status: revealed` cannot resolve a `M-*` entry with `status: forbidden` regardless of clue coverage (enforced by `secret_mystery_firewall_compliance` validator in SPEC42STOSTADEB-006 and by the existing `rule7_mystery_reserve_preservation` validator). §5b: the 13-field schema is tight — `secret_kind` for predicate filtering, `secret_claim` for human readability, `truth_anchor` for branch-truth vs. believed-only distinction, `holders[]` for visibility-firewall enforcement, `salience` + `protected_mystery_refs[]` for criticality-gated validators + MR firewall, `clue_carriers[]` for revelation-readiness predicates + audit, `source_records[]` for grounding integrity, `status` + `reveal_event` + `reveal_records[]` for lifecycle. Four fields explicitly DROPPED per §5b: `audience_state: misled` (derivable from `truth_anchor` + holders' `BEL.truth_relation`), `criticality` (collapsed to `salience` for consistency with `SLT.saliency` / `THR.urgency`), `secret_kind: other` (anti-pattern), parallel `STCLUE` class (absorbed into `clue_carriers[]` sub-array).
5. HARD-GATE engine surfaces touched: same as SPEC42STOSTADEB-001 — `tools/patch-engine/src/envelope/schema.ts` OPERATION_KINDS extension + `tools/patch-engine/src/commit/order.ts` class registration. Mystery Reserve firewall verified: the change does NOT weaken the firewall. STSEC is story-local; `protected_mystery_refs[]` is a REFERENCE field naming the affected `M-*` entries — the firewall enforcement happens at validation time (SPEC42STOSTADEB-006's `secret_mystery_firewall_compliance` validator and the existing `rule7_mystery_reserve_preservation` validator), not at this ticket's op-layer. This ticket's structural correctness is that the op schema permits the field; the firewall check is owned by the validators ticket.
6. Existing output schema extended: `tools/validators/src/schemas/story-page.schema.json` — `state_snapshot.active_records[]` enum extended to add `STSEC` (co-edit with SPEC42STOSTADEB-001 + -003 at the same enum site). Additive-only extension; existing entries unchanged.

## Architecture Check

1. **Per-class machine-layer cohesion**: matches SPEC42STOSTADEB-001's pattern. STSEC-specific surface bundled in one PR.
2. **No backwards-compatibility shims**: existing bundles without STSEC records remain valid.
3. **`clue_carriers[]` sub-array preserves single-source clue tracking**: the design decision to absorb STCLUE into a sub-array on STSEC means clue-to-secret binding lives in ONE place (on the STSEC record) rather than as a separate class with two-way references. This avoids the maintenance cost of bidirectional consistency (every STCLUE.secret_id must point at a real STSEC; every STSEC must enumerate its STCLUEs).
4. **Mystery Reserve firewall is preserved by reference, not bypass**: `protected_mystery_refs[]` is the integration surface with world `M-*` records; the firewall validator (existing `rule7_mystery_reserve_preservation` + new `secret_mystery_firewall_compliance` from SPEC42STOSTADEB-006) HARD-REJECTs `STSEC.status: revealed` when the referenced `M-*` has `status: forbidden`, regardless of clue coverage.

## Verification Layers

1. STSEC schema (with clue_carriers[] sub-array) validates representative record cleanly → schema validation via `npm test --prefix tools/validators`
2. `_source/secrets/STSEC-1.yaml` file emission survives Hook 3 write-discipline check → engine pre-apply test via `npm test --prefix tools/patch-engine`
3. `mcp__worldloom__allocate_next_id(world_slug, id_class="STSEC", story_slug)` returns next integer → MCP retrieval test via `npm test --prefix tools/world-mcp`
4. `append_secret_clue_carrier` appends to STSEC.clue_carriers[] without race → patch-engine op test
5. `mark_secret_clue_discovered` updates carrier status to `discovered` and binds discoverer → patch-engine op test
6. `reveal_story_secret` sets STSEC.status = revealed, binds reveal_event and reveal_records → patch-engine op test
7. FOUNDATIONS §Rule 7 (Preserve Mystery Deliberately) alignment → FOUNDATIONS alignment check (the `protected_mystery_refs[]` integration is structurally validated; the firewall enforcement is owned by SPEC42STOSTADEB-006 — this ticket's contribution is providing the structurally-sound reference field for downstream validation)

## What to Change

### 1. STSEC JSON Schema (new file)

Create `tools/validators/src/schemas/story-secret.schema.json` with the 13-field schema per SPEC-42 §B. Required fields: `id`, `story_id`, `created_at_page`, `secret_kind`, `secret_claim`, `holders`, `salience`, `source_records`, `status`. Optional fields: `supersedes`, `truth_anchor`, `protected_mystery_refs`, `clue_carriers`, `reveal_event`, `reveal_records`. Enum constraints: `secret_kind ∈ {identity, motive, location, event_cause, artifact_truth, relationship, institutional}` (note: `other` excluded per spec §B drops); `salience ∈ {low, medium, high}`; `status ∈ {hidden, partially_revealed, revealed, disproven, abandoned}`. `clue_carriers[]` sub-array shape: `{kind: <enum DA|STOBJ|STLOC|BEL|SF|SE>, record: <record_id>, clue_text: string, clue_strength: <enum weak|suggestive|confirming|decisive|misleading>, discovered_by: [<STENT|group|public>], audience_visible: <enum hidden|visible|ambiguous>, status: <enum available|discovered|destroyed|suppressed|superseded>}`.

### 2. Contract document update — story-state-contract.md

Modify `.claude/skills/_shared-templates/story-state-contract.md`:
- §3 (class catalog): add row `STSEC | Story secret — story-local hidden truth binding multiple BEL/SF/DA records to one secret with clue_carriers[] sub-array; integrates with world Mystery Reserve via protected_mystery_refs[].`
- §4: insert new §4.7 (Story Secret — STSEC) with canonical schema text including the `clue_carriers[]` sub-array.
- §4.2 (PG.state_snapshot.active_records): add `STSEC: [STSEC-<integer>]` (co-edit with SPEC42STOSTADEB-001 / -003).

### 3. PG state-snapshot schema extension

Modify `tools/validators/src/schemas/story-page.schema.json`: add `STSEC` to the `state_snapshot.active_records[]` enum (co-edit with SPEC42STOSTADEB-001 / -003).

### 4. Allocator registration

Modify `tools/world-mcp/src/tools/allocate-next-id.ts:81-102`: add `STSEC` row. Subdirectory: `secrets/`.

### 5. World-index parser registration

Modify `tools/world-index/src/parse/atomic.ts`: register `STSEC-<integer>` ID prefix and the `secrets/` subdirectory.

### 6. Patch-engine OPERATION_KINDS extension

Modify `tools/patch-engine/src/envelope/schema.ts`: add five new operation kinds to `OPERATION_KINDS`:
- `create_stsec_record` — generic create-story-record handler
- `supersede_stsec_record` — generic supersede pattern
- `append_secret_clue_carrier` — custom op: appends entry to `STSEC.clue_carriers[]`
- `mark_secret_clue_discovered` — custom op: updates a `clue_carriers[].status` to `discovered`, appends discoverer to `discovered_by[]`
- `reveal_story_secret` — custom op: sets `STSEC.status = revealed`, binds `reveal_event` + `reveal_records[]`

### 7. Generic create-story-record class mapping

Modify `tools/patch-engine/src/ops/create-story-record.ts`: register `STSEC` in the class-prefix-to-subdirectory mapping.

### 8. Custom op implementations (three new files)

Create `tools/patch-engine/src/ops/append-secret-clue-carrier.ts`:
- Appends a new clue-carrier entry to `STSEC.clue_carriers[]`
- Validates the `record` reference exists in the branch path (deferred validator-side check via `secret_carrier_existence` in SPEC42STOSTADEB-006; structural shape check here)
- Writes updated STSEC record back

Create `tools/patch-engine/src/ops/mark-secret-clue-discovered.ts`:
- Updates the named `clue_carriers[].status` to `discovered`
- Appends the discoverer to `clue_carriers[].discovered_by[]`
- Writes updated STSEC record back

Create `tools/patch-engine/src/ops/reveal-story-secret.ts`:
- Sets `STSEC.status = revealed`
- Binds `STSEC.reveal_event = SE-<integer>`
- Appends to `STSEC.reveal_records[]`
- Writes updated STSEC record back

All three follow the existing `update_record_field.ts` pattern for non-create story-record ops.

### 9. Commit-ordering registration

Modify `tools/patch-engine/src/commit/order.ts`: add `STSEC` to the per-class commit ordering list. STSEC ordering: insert alongside state-record classes (parallel to CLK placement in SPEC42STOSTADEB-001).

### 10. Commit temp-file registration

Modify `tools/patch-engine/src/commit/temp-file.ts`: register `STSEC` in the per-class temp-file handling.

### 11. Pre-apply ID-allocation race check

Modify `tools/patch-engine/src/pre-apply-checks/id-allocation-race.ts`: add `STSEC` to the enumeration.

## Files to Touch

- `tools/validators/src/schemas/story-secret.schema.json` (new)
- `tools/validators/src/schemas/story-page.schema.json` (modify - add `STSEC` to `state_snapshot.active_records[]`)
- `tools/validators/src/structural/utils.ts` (modify - register `story_secret_record` schema and authority path)
- `tools/validators/src/_helpers/state-snapshot-replay.ts` (modify - include `STSEC` in active-record replay parity)
- `tools/validators/tests/structural/record-schema-compliance-story-secret.test.ts` (new)
- `tools/validators/tests/structural/record-schema-compliance-story-page.test.ts` (modify)
- `tools/validators/tests/structural/snapshot-replay-equality.test.ts` (modify)
- `tools/patch-engine/src/ops/append-secret-clue-carrier.ts` (new)
- `tools/patch-engine/src/ops/mark-secret-clue-discovered.ts` (new)
- `tools/patch-engine/src/ops/reveal-story-secret.ts` (new)
- `tools/patch-engine/src/envelope/schema.ts` (modify - operation kinds, payload types, and `expected_id_allocations.stsec_ids`)
- `tools/patch-engine/src/ops/create-story-record.ts` (modify - STSEC class-prefix mapping)
- `tools/patch-engine/src/ops/shared.ts` (modify - shared story-bundle ID pattern includes STSEC)
- `tools/patch-engine/src/commit/order.ts` (modify - STSEC class ordering)
- `tools/patch-engine/src/commit/temp-file.ts` (modify - STSEC class temp-file handling)
- `tools/patch-engine/src/pre-apply-checks/id-allocation-race.ts` (modify - STSEC class registration)
- `tools/patch-engine/tests/ops/create-story-record.test.ts` (modify)
- `tools/patch-engine/tests/ops/append-secret-clue-carrier.test.ts` (new)
- `tools/patch-engine/tests/ops/mark-secret-clue-discovered.test.ts` (new)
- `tools/patch-engine/tests/ops/reveal-story-secret.test.ts` (new)
- `tools/world-mcp/src/tools/allocate-next-id.ts` (modify - STSEC class registry row)
- `tools/world-mcp/src/server.ts` (modify - MCP input enum includes STSEC)
- `tools/world-mcp/src/tools/describe-envelope-schema.ts` (modify - exhaustive operation/schema manifest includes STSEC)
- `tools/world-mcp/tests/tools/allocate-next-id.test.ts` (modify)
- `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts` (modify)
- `tools/world-index/src/parse/atomic.ts` (modify - STSEC class-prefix and `secrets/` subdirectory registration)
- `tools/world-index/src/schema/types.ts` (modify - `story_secret_record` node type)
- `.claude/skills/_shared-templates/story-state-contract.md` (modify - class catalog and active-record contract)
- `.claude/skills/_shared-templates/story-record-schemas.md` (modify - canonical STSEC record schema section)

## Out of Scope

- STSEC validators (`secret_carrier_existence`, `critical_secret_clue_coverage_when_revealed`, `secret_mystery_firewall_compliance`) — owned by SPEC42STOSTADEB-006
- STSEC predicate DSL entries (`secret_unrevealed`, `secret_revealed`, `revelation_ready`, `any_secret_unrevealed`) — owned by SPEC42STOSTADEB-006
- MCP retrieval extensions — owned by `archive/tickets/SPEC42STOSTADEB-004.md`
- Shared validator extensions — owned by SPEC42STOSTADEB-008
- Skill integrations — owned by SPEC42STOSTADEB-009 through -013
- CLK and STQ class foundations — owned by SPEC42STOSTADEB-001 / -003
- The optional per-STSEC `coverage_policy.minimum_clues_required: <integer ≥ 1>` override field flagged in SPEC-42 §Risks — archive/tickets/SPEC42STOSTADEB-006.md implemented the default-2 validator baseline and left the override field out of scope

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/validators` — story-secret.schema.json validates representative STSEC records (positive: with and without clue_carriers[]; negative: invalid enum values, missing required fields, malformed clue_carriers[] sub-array)
2. `npm test --prefix tools/patch-engine` — `create_stsec_record` writes valid YAML at `_source/secrets/STSEC-1.yaml`; `append_secret_clue_carrier` appends correctly; `mark_secret_clue_discovered` updates carrier status; `reveal_story_secret` sets status + binds reveal_event
3. `npm test --prefix tools/world-mcp` — `allocate_next_id(id_class="STSEC")` returns next STSEC integer
4. `npm run build --prefix tools/world-index` — parser builds cleanly

### Invariants

1. STSEC records are stored exclusively at `worlds/<slug>/stories/<story-slug>/_source/secrets/STSEC-<integer>.yaml` — Hook 3 enforces engine-only writes
2. `STSEC.clue_carriers[]` is the canonical clue-to-secret binding; no separate `STCLUE` class exists (verified via grep across `tools/` for `STCLUE` patterns returning empty)
3. `STSEC.protected_mystery_refs[]` is structurally permitted in the schema; firewall enforcement (forbidden `M-*` cannot be resolved) is delegated to validators in SPEC42STOSTADEB-006 — this ticket's structural correctness is the reference field's presence
4. No existing record class is altered; existing bundles without STSEC records pass all validators with no warnings

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/schemas/story-secret.test.ts` (new) — schema-level positive + negative tests for STSEC including clue_carriers[] sub-array variants
2. `tools/validators/tests/schemas/story-page.test.ts` (modify — co-edit with SPEC42STOSTADEB-001 / -003) — `state_snapshot.active_records[STSEC]` enum entry test
3. `tools/patch-engine/tests/ops/append-secret-clue-carrier.test.ts` (new) — append-to-sub-array op test
4. `tools/patch-engine/tests/ops/mark-secret-clue-discovered.test.ts` (new) — clue status transition op test
5. `tools/patch-engine/tests/ops/reveal-story-secret.test.ts` (new) — secret-reveal op test
6. `tools/patch-engine/tests/ops/create-story-record.test.ts` (modify — co-edit with SPEC42STOSTADEB-001 / -003) — `create_stsec_record` test
7. `tools/world-mcp/tests/tools/allocate-next-id.test.ts` (modify — co-edit with SPEC42STOSTADEB-001 / -003) — `id_class="STSEC"` test

### Commands

1. `npm test --prefix tools/validators`
2. `npm test --prefix tools/patch-engine`
3. `npm test --prefix tools/world-mcp`
4. `npm run build --prefix tools/world-index`
5. The full-pipeline verification command lands in SPEC42STOSTADEB-015 capstone; this ticket's verification boundary is the per-package test surface above

## Outcome

Completed on 2026-05-17.

STSEC now has a first-class structural foundation across the machine layer:

1. Added `story-secret.schema.json` and structural validator registration for `story_secret_record` under `_source/secrets/STSEC-<integer>.yaml`.
2. Registered STSEC in story-page active records and snapshot/replay parity helpers.
3. Registered STSEC in world-index parser and node-type surfaces.
4. Registered STSEC ID allocation and MCP input enum support; `describe_envelope_schema` now exposes the STSEC create/supersede/custom operation schemas because that schema surface is exhaustive.
5. Registered patch-engine create/supersede support, ID-allocation race checks, commit ordering, temp-file dispatch, and shared STSEC ID matching.
6. Added custom patch-engine operations for appending clue carriers, marking clue carriers discovered, and revealing story secrets.
7. Updated shared story-state contract prose and the canonical story-record schema template.

Truthful boundary corrections:

1. `get_record_schema`, retrieval, predicates, and STSEC semantic validators remain out of scope for later SPEC42STOSTADEB tickets.
2. Mystery Reserve firewall enforcement is not implemented here; this ticket only preserves the structural reference field `protected_mystery_refs[]` for downstream validator enforcement.
3. The live validator test pattern is structural record compliance, not a standalone `tests/schemas/story-secret.test.ts` file.

## Verification Result

1. `npm test` in `tools/patch-engine` - pass, 89 tests.
2. `npm test` in `tools/validators` - pass, 375 tests.
3. `npm test` in `tools/world-mcp` - pass, 392 tests.
4. `npm run build` in `tools/world-index` - pass after registering `story_secret_record` in node types.
5. `git diff --check` - pass.
