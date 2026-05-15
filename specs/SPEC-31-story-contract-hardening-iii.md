<!-- spec-drafting-rules.md not present; using default structure + Deliverables + Risks & Open Questions. -->

# SPEC-31 — Story Contract Hardening III

**Status**: PROPOSED
**Date**: 2026-05-15
**Supersedes**: none (extends `archive/specs/SPEC-28-story-contract-hardening.md` D1–D7 and `archive/specs/SPEC-30-story-contract-hardening-ii.md` D1–D10)
**Companion triage**: `docs/triage/2026-05-15-story-related-improvements-fifth-iteration-triage.md`

## Problem Statement

`reports/story-related-improvements-fifth-iteration.md` is the fifth external review (ChatGPT-Pro, no codebase access) of the branching-story pipeline. It evaluated 14 numbered findings (1 P0, 9 P1, 4 P2) plus 5 negative recommendations against `docs/FOUNDATIONS.md` + the seven story-pipeline skills + `.claude/skills/_shared-templates/story-state-contract.md` + `docs/CONTEXT-PACKET-CONTRACT.md` + `docs/MACHINE-FACING-LAYER.md`. Every finding was re-checked against the working tree; the companion triage file ledgers all 19 verdicts.

Fourteen findings reach this spec as deliverables D1–D14. Five negative recommendations confirm-existing-position with no action. The verification surfaced no out-of-report findings: this is the highest-quality external iteration to date — diagnoses hold up under codebase inspection, severity calls are mostly correct (F-11 reclassified upward from P2 to P1 because it names a non-existent field, not a hypothetical; F-06 and F-07 reclassified downward from P1 to P2 because consistency-of-retrieval matters but is not gating production-readiness).

The motivating production-readiness window: zero production stories exist yet — pre-greenfield is the cheapest moment to land schema/contract changes that would later require migration. The blast radius (mapped via parallel verification) touches `docs/CONTEXT-PACKET-CONTRACT.md`, `docs/MACHINE-FACING-LAYER.md`, `.claude/skills/_shared-templates/story-state-contract.md`, all seven story-pipeline skills, `tools/validators/src/schemas/story-{page,event}.schema.json`, the structural-validator surface (`tools/validators/src/structural/`), and the MCP retrieval surface (`tools/world-mcp/src/tools/`). No `_source/` story bundles exist anywhere in the repository to migrate; existing test bundles under `tools/validators/tests/fixtures/` will need their PG hashes recomputed and prose-publication-field references stripped after D1 lands (see D1's Migration sub-section).

### Key design decisions

- **Considered keeping `PG.prose_path` and `PG.prose_receipt_path` and instead requiring prose-attach to update PG; chose to delete the fields outright because prose-attach mutating PG would break the Plan-Authority Boundary** at FOUNDATIONS §Story Bundles §4a (rendered prose is not state; PG is committed at plan-commit and never thereafter). Deterministic-path discovery (`pages-prose/PG-<integer>.md` + `pages-prose-receipts/PG-<integer>.yaml`) costs one filesystem stat per audit lookup and is exactly what `INDEX.md` already presents for human navigation. The hash payload already excludes the fields per `_shared-templates/story-state-contract.md:181-182`, so removal is structurally a clean reduction.
- **Considered making story-local DA disambiguation implicit (treat any DA-id with `story_slug` argument as story-local); chose explicit documentation of the dual scope in MACHINE-FACING-LAYER's `get_record` row because world-level DA records exist** (per FOUNDATIONS §Mandatory World Files; DAs can be world-canon-flavored or story-local), so silently routing on `story_slug` presence-or-absence is fragile under callers who forget the argument. Explicit prose costs nothing and prevents a class of "wrong DA found" retrieval bugs.
- **Considered renaming `source_record_ids` parameter on `story-fact-promotion-to-canon` to disambiguate "governing firewall load" from "evidentiary source record"; chose to keep the existing parameter name and clarify the mapping table at line 113 because the parameter is user-facing input and a rename is a breaking change for any tooling or documentation pointing at it.** The clarification path: redocument the `mystery_resolution` row so the parameter takes SF/BEL (the actual evidentiary source per contract §4.3 promotion_claims), and the governing M record is loaded by the skill automatically from world context (not user-supplied as `source_record_ids`).
- **Considered an `accretion_policy` field addition to the M-record schema for F-11; chose conditional handling in health-audit Phase 2e because no production stories have exercised mystery accretion yet and adding a schema field with no validator-backed consumer would violate FOUNDATIONS Rule 5 (no fields without mechanical consumers).** The conditional form (enforce policy deterministically if and only if the M record carries a validator-backed accretion field; otherwise use schema-backed status progression rules and treat "collectively answers unknown" as judgment-assisted) preserves the option to add `accretion_policy` later under first-real-bundle pressure.
- **Considered adding a structured `non_propagation` array to `SE` for F-09; chose parseable tag inside `SE.world_logic_rationale` because the closed enum of 5 reasons already lives in `branching-story-turn-cycle/SKILL.md:292` and `branching-story-health-audit/SKILL.md:190` — adding a structured field would proliferate the schema, and a tag convention makes the existing free-form rationale mechanically replay-able for the cost of one parser.** If the parser proves insufficient under first-real-bundle pressure, promotion to a structured field is a single schema migration later.
- **Considered making D10 (closeout MCP retrieval, F-06) gating production-readiness; chose P2 framing because Hook 3 only blocks raw writes** — closeout reads `_source/canon/`, `_source/change-log/`, and `adjudications/` directly per `story-promotion-closeout/SKILL.md:140-141,155,167`, but the reads are read-only existence checks and the Phase-3 gate-1 verification still ensures zero world-canon write ops in the patch plan. The case for MCP conversion is **retrieval-contract consistency** (every other canon-reading skill goes through MCP), not safety. Treat as cleanup, not pre-production gate.
- **Considered splitting this spec into SPEC-31 (P0+P1, 9 items) and SPEC-32 (P2 cleanups, 5 items); chose a single SPEC-31 covering all 14 because the P2 items are small** (one is stale wording, one is documentation-only mapping clarification, three are minor clarification edits) and the verification context is freshest now. The pragmatic risk is PR review size; if the implementer prefers, the deliverables are independent enough that each could land as its own ticket (D1 → ticket; D2 → ticket; ... D14 → ticket), giving reviewer-grain finer than spec-grain.

---

## Deliverables

Deliverables are grouped by severity (P0 → P1 → P2). The implementation order in §Verification mirrors this grouping. Each deliverable is self-contained and can land as its own ticket.

### D1 — Delete `PG.prose_path` and `PG.prose_receipt_path` (P0)

**Problem**: The PG schema at `_shared-templates/story-state-contract.md:149-150` carries:
```yaml
prose_path: pages-prose/PG-<integer>.md | null
prose_receipt_path: pages-prose-receipts/PG-<integer>.yaml | null
```
Both fields are documented at `:163` as "informational publication receipts. They are not lifecycle status." But three skills key off them:
1. `branching-story-health-audit/SKILL.md:250-251` reports `missing_prose_file` ("`PG.prose_path` is set but the file is absent") and `missing_prose_receipt` ("prose has been rendered (file exists, `PG.prose_path` non-null) but no receipt exists").
2. `branching-story-turn-cycle/SKILL.md:162` reads `parent.prose_path` for the `accept_parent_unrendered: false` mode (abort when null).
3. Bootstrap and turn-cycle both commit PG with `prose_path: null` and `prose_receipt_path: null` (`branching-story-bootstrap/SKILL.md:313`, `branching-story-turn-cycle/SKILL.md:373`).

`branching-story-prose-attach/SKILL.md:31` declares it "never mutate[s] the page record". So once a PG commits with both fields null, they remain null forever — even after `pages-prose/PG-<integer>.md` and `pages-prose-receipts/PG-<integer>.yaml` exist on disk. The two health-audit checks silently pass; the turn-cycle `accept_parent_unrendered: false` mode silently aborts. This is a real lifecycle lie.

The hash payload already excludes both fields (`_shared-templates/story-state-contract.md:181-182` and the prose-attach computation at `branching-story-prose-attach/SKILL.md:150`), so fork-replay safety is unaffected by deletion.

**Change**:
1. **Contract** (`_shared-templates/story-state-contract.md` §4.2):
   - Delete lines defining `prose_path` and `prose_receipt_path` from the PG schema.
   - Delete the explanatory paragraph at `:163` referring to these as "informational publication receipts".
   - Add (after `validation_trace`):
     ```
     Rendered prose and prose receipts are publication artifacts discovered by
     deterministic paths: `pages-prose/PG-<integer>.md` and
     `pages-prose-receipts/PG-<integer>.yaml`. They are not page-state fields and
     are not included in `PG`. `INDEX.md` may render publication status for human
     navigation; `PG` remains the authoritative fork-state record.
     ```
2. **Contract §4.2a** (hash payload): replace the explicit exclusion list with:
   ```
   The fork-state payload is the complete PG mapping except `state_hash` itself.
   Rendered prose and prose receipts are not PG fields and therefore are not hash
   inputs.
   ```
3. **Schema** (`tools/validators/src/schemas/story-page.schema.json`): if the fields are currently present in `properties`, delete them; add `prose_path` and `prose_receipt_path` to a forbidden-properties enforcement (via `additionalProperties: false` on the relevant block — confirm current shape during implementation).
4. **Validator** (`tools/validators/src/structural/record-schema-compliance.ts`): the schema change above causes records with these fields to fail JSON-schema validation; no validator-rule-level change needed beyond confirming the rejection surfaces with a clear error.
5. **Bootstrap** (`branching-story-bootstrap/SKILL.md`): delete the `prose_path: null`, `prose_receipt_path: null` line at `:313` (Phase 6 PG-1 record shape). Update Phase 9 hash CLI prose at `:359` to drop the references to these fields from the exclusion comment (the canonical CLI behavior is unchanged since they're already excluded; only the prose explanation must be updated).
6. **Turn-cycle** (`branching-story-turn-cycle/SKILL.md`): 
   - Delete the `prose_path: null`, `prose_receipt_path: null` line at `:373` (PG record shape).
   - Replace the `accept_parent_unrendered: false` mode at `:162` to test file presence at `worlds/<world_slug>/stories/<story_slug>/pages-prose/<parent_page_id>.md` (filesystem stat), not `parent.prose_path`.
   - Update the `accept_parent_unrendered` argument description at `:28` accordingly.
   - Update the hash CLI prose at `:437` to drop the exclusion-list reference.
7. **Prose-attach** (`branching-story-prose-attach/SKILL.md`): update the hash computation prose at `:150` to drop `prose_path` and `prose_receipt_path` from the exclusion-list description (they no longer exist on PG, so the comment is misleading).
8. **Health-audit** (`branching-story-health-audit/SKILL.md`):
   - Replace `missing_prose_file` at `:250` with a check that fires when an expected `pages-prose/PG-<integer>.md` is absent for any PG (operational policy: every committed page is expected to eventually have rendered prose; this check identifies pages with stale or skipped rendering — emit as INFO when absent without a forcing signal, WARNING when paired with an outstanding promotion that requires prose-evidence).
   - Replace `missing_prose_receipt` at `:251` to fire when `pages-prose/PG-<integer>.md` exists but `pages-prose-receipts/PG-<integer>.yaml` is absent (filesystem stat, not record-field lookup).
9. **Tooling CLI** (`tools/world-mcp/src/cli/compute-pg-hashes.ts` if exists, or wherever `computePgStateHash` is implemented): update the canonical JSON serializer's exclusion list to drop `prose_path` and `prose_receipt_path` references (they're no longer in PG, so the exclusion is unreachable — clean it for clarity).

**Files touched**:
- `.claude/skills/_shared-templates/story-state-contract.md` (§4.2, §4.2a)
- `tools/validators/src/schemas/story-page.schema.json`
- `tools/validators/src/structural/record-schema-compliance.ts` (no rule change; confirm rejection path)
- `tools/world-mcp/src/cli/compute-pg-hashes.ts` (and underlying `@worldloom/world-index/hash/content`)
- `tools/validators/tests/structural/record-schema-compliance.test.ts` (new fixture: PG with prose_path → reject)
- `tools/validators/tests/fixtures/**/*.yaml` (every fixture PG record currently carrying `prose_path` / `prose_receipt_path` — strip the fields; recompute hashes)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (`:313`, `:359`)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (`:28`, `:162`, `:373`, `:437`)
- `.claude/skills/branching-story-prose-attach/SKILL.md` (`:150`)
- `.claude/skills/branching-story-health-audit/SKILL.md` (`:250-251`)

**Verification**:
- Validator test: PG record with `prose_path` field → `record_schema_compliance` FAIL (additional property).
- Validator test: PG record without `prose_path` / `prose_receipt_path` → PASS.
- Validator test: `snapshot_replay_equality` on parent → child page chain where the canonical hash is recomputed on the new payload → PASS (golden bundle: recompute golden hashes once during the implementation).
- Bootstrap dry-run produces a PG-1 record without `prose_path` / `prose_receipt_path` and passes `record_schema_compliance`.
- Turn-cycle dry-run with `accept_parent_unrendered: false` aborts when `pages-prose/<parent>.md` is absent on disk; succeeds when present.
- Health-audit dry-run on a bundle where `pages-prose/PG-2.md` exists but `pages-prose-receipts/PG-2.yaml` is absent → emits `missing_prose_receipt` (INFO).

**Migration impact**: No production stories exist. Test fixtures under `tools/validators/tests/fixtures/` carrying these fields must have them stripped and PG hashes recomputed using the canonical CLI; the implementer should do this as part of the same ticket so the validator suite stays green.

---

### D2 — Define audit-only SE lifecycle (P1)

**Problem**: Contract `_shared-templates/story-state-contract.md:209` enumerates `event_kind: prose_attach | promotion_closeout` and `:214,:242` specify `selection_source: none` and `selected_slt_id: null` for these. But the contract does NOT define whether these events:
- emit a page (do they appear as `PG.input.resolved_event_id`?),
- carry state delta (can their `state_delta.create | supersede | close` be non-empty?),
- participate in snapshot replay (does `snapshot_replay_equality` walk their delta?),
- require a `parent_page_id` (must they anchor to a page?).

Without specification, an audit-only event could corrupt replay if treated as page-producing, or quietly disappear from the audit trail if treated as no-op.

**Change**:
1. **Contract** (`_shared-templates/story-state-contract.md` §4.3): add a new sub-section §4.3a after the route consistency table:
   ```
   #### 4.3a Audit-only SE events
   
   `event_kind: prose_attach` and `event_kind: promotion_closeout` are audit-only
   event records. They do NOT produce a page, do NOT appear in any
   `PG.input.resolved_event_id`, and do NOT alter branch snapshots.
   
   Required shape:
   - `commitment.selected_slt_id: null`
   - `commitment.selection_source: none`
   - `commitment.alias_bindings: {}`
   - `outcome_route: accept`
   - `resolution` absent
   - `state_delta.create: []`
   - `state_delta.supersede: []`
   - `state_delta.close: []`
   - `promotion_claims: []`
   - `parent_page_id` names the page whose prose or promotion closeout is being
     audited; null only when the bundle has no relevant page anchor.
   
   `snapshot_replay_equality` ignores audit-only SE records except as ledger
   evidence. Health-audit's structural-replay phases (2a, 2c, 2d) treat
   audit-only SEs as no-op walkable events that do not alter cumulative state.
   ```
2. **Validator** (`tools/validators/src/structural/`): add a new rule `audit_only_se_shape` that:
   - Loads any SE with `event_kind ∈ {prose_attach, promotion_closeout}`.
   - Verifies each required-shape constraint above.
   - Emits `audit_only_se_shape_violation` (severity: fail) on any mismatch.
3. **Validator** (`tools/validators/src/structural/snapshot-replay-equality.ts`): the replay walk must skip audit-only SE records (or treat their empty delta as a structural no-op). Confirm the existing implementation handles this; if not, add the skip.
4. **Prose-attach** (`branching-story-prose-attach/SKILL.md`): the `emit_attach_event: true` path produces an SE with `event_kind: prose_attach`; update Phase prose to cite §4.3a as the conformance requirement (instead of free-floating "audit-only" wording).
5. **Closeout** (`story-promotion-closeout/SKILL.md`): the `emit_closeout_event: true` path produces an SE with `event_kind: promotion_closeout`; update Phase prose to cite §4.3a.
6. **Health-audit** (`branching-story-health-audit/SKILL.md`): Phase 2a replay walk explicitly notes audit-only SE records are ledger-only and not delta-contributing.

**Files touched**:
- `.claude/skills/_shared-templates/story-state-contract.md` (§4.3a, new)
- `tools/validators/src/structural/audit-only-se-shape.ts` (new rule)
- `tools/validators/src/registry.ts` (register new rule)
- `tools/validators/src/structural/snapshot-replay-equality.ts` (confirm skip path)
- `tools/validators/tests/structural/audit-only-se-shape.test.ts` (new)
- `.claude/skills/branching-story-prose-attach/SKILL.md` (Phase prose for `emit_attach_event: true`)
- `.claude/skills/story-promotion-closeout/SKILL.md` (Phase prose for `emit_closeout_event: true`)
- `.claude/skills/branching-story-health-audit/SKILL.md` (Phase 2a note)

**Verification**:
- Validator test: prose_attach SE with non-empty `state_delta.create` → `audit_only_se_shape_violation` FAIL.
- Validator test: prose_attach SE with `selected_slt_id` set → FAIL.
- Validator test: promotion_closeout SE with valid empty-delta shape → PASS.
- Replay test: a bundle with prose_attach SE between PG-2 and PG-3 → PG-3 snapshot matches PG-2 plus its own delta (audit-only SE contributes nothing).

---

### D3 — Fix `SLT.created_at_page` origin/scope rule (P1)

**Implementation note (2026-05-15)**: `SPEC31STOCONHAR-003` landed this deliverable. The operational contract now uses the origin-keyed `created_at_page` rule, commitment-block-authoring validates its authoring origins, and `tools/validators` registers `slt_created_at_page_origin_consistency`. The original problem/change text below is historical intake context for D3.

**Problem**: Contract `_shared-templates/story-state-contract.md:266`:
```yaml
created_at_page: PG-<integer> | null        # null only for global_author_pool
```
`commitment-block-authoring/SKILL.md:175`:
```yaml
created_at_page: null   # null for both modes; runtime_jit case lives in turn-cycle Phase 2
```
The skill writes `null` for both `direct_batch` and `audit_repair` modes — neither of which is `global_author_pool` scope. The contract rule (keyed off scope visibility) conflicts with the skill's actual behavior (keyed off origin and authoring time).

**Change**:
1. **Contract** (`_shared-templates/story-state-contract.md` §4.4): replace `:266`:
   ```yaml
   created_at_page: PG-<integer> | null        # required for provenance.origin: runtime_jit; nullable for page-independent authoring origins
   ```
   Add explanatory paragraph after the SLT field block:
   ```
   `created_at_page` is provenance for page-local creation, not branch scope. For
   `provenance.origin: runtime_jit`, it MUST name the page whose turn created the
   block. For `bootstrap_seed`, `author_batch`, `manual_authoring`, and
   `audit_repair`, it MAY be null when the block is authored outside a page turn.
   Branch legality is determined by `scope.visibility`, `scope.branch_id`, and
   `scope.visible_branch_path_prefix`, not by `created_at_page`.
   ```
2. **Commitment-block-authoring** (`commitment-block-authoring/SKILL.md`): update the Phase 2 schema comment at `:175` to reflect the origin-keyed rule:
   ```yaml
   created_at_page: null   # nullable for direct_batch and audit_repair (origin = author_batch or audit_repair, not runtime_jit)
   ```
   Update Phase 3 gate 1 (or equivalent gate) to validate origin/scope consistency.
3. **Turn-cycle** (`branching-story-turn-cycle/SKILL.md`): in the runtime-JIT SLT creation path, explicitly set `created_at_page: PG-<integer>` (the current turn's page id) and `provenance.origin: runtime_jit`. The skill prose should cite §4.4's rule.
4. **Validator** (`tools/validators/src/structural/`): add a new rule `slt_created_at_page_origin_consistency`:
   - When `provenance.origin == runtime_jit`: `created_at_page` MUST be a `PG-<integer>` (non-null, matching pattern).
   - When `provenance.origin ∈ {bootstrap_seed, author_batch, manual_authoring, audit_repair}`: `created_at_page` MAY be null.
   - Emit `slt_created_at_page_origin_mismatch` (severity: fail) on violation.

**Files touched**:
- `.claude/skills/_shared-templates/story-state-contract.md` (§4.4)
- `.claude/skills/commitment-block-authoring/SKILL.md` (Phase 2, Phase 3)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (runtime-JIT path)
- `tools/validators/src/structural/slt-created-at-page-origin-consistency.ts` (new)
- `tools/validators/src/registry.ts` (register)
- `tools/validators/tests/structural/slt-created-at-page-origin-consistency.test.ts` (new)

**Verification**:
- Validator test: SLT with `origin: runtime_jit` and `created_at_page: null` → FAIL.
- Validator test: SLT with `origin: author_batch` and `created_at_page: null` → PASS.
- Validator test: SLT with `origin: bootstrap_seed` and `created_at_page: PG-1` → PASS (page-creation context is allowed even for non-runtime-JIT origins).

---

### D4 — Normalize `story_bootstrap` context-packet behavior (P1)

**Problem**: Three documents tell three different stories:
- `docs/CONTEXT-PACKET-CONTRACT.md:125`: "For `story_bootstrap`, callers supply `story_slug` as the target slug before the bundle exists; `story_bundle_context` is `null`."
- `docs/MACHINE-FACING-LAYER.md:76`: lists `story_bootstrap` among task types that "require `story_slug` and return `story_bundle_context` populated from indexed story-bundle records plus `STORY_KERNEL.md` frontmatter".
- `branching-story-bootstrap/SKILL.md:209`: pre-flight call is `mcp__worldloom__get_context_packet(world_slug, task_type='story_bootstrap', seed_nodes=..., token_budget=...)` — **no `story_slug` argument supplied**.

The bundle does not yet exist at bootstrap time, so the contract's "story_bundle_context is null" is correct. The MACHINE-FACING-LAYER wording is wrong; the skill call is incomplete.

**Change**:
1. **CONTEXT-PACKET-CONTRACT.md**: keep `:125` as authoritative; ensure the full-body candidates table includes a `story_bootstrap` row:
   ```
   | `story_bootstrap` | `canon_fact_record`, `invariant`, `mystery_reserve_entry`, `open_question_entry` |
   ```
2. **MACHINE-FACING-LAYER.md:76**: replace the over-broad sentence about populated story_bundle_context with a split form:
   ```
   `story_bootstrap`, `story_turn_cycle`, `commitment_block_authoring`,
   `branching_story_health_audit`, and `story_fact_promotion_to_canon` require
   `story_slug`. For `story_bootstrap`, the slug is the target bundle slug and
   `story_bundle_context` is `null` because the bundle does not yet exist. For
   the other story-pipeline task types, `story_bundle_context` is populated from
   indexed story-bundle records plus `STORY_KERNEL.md` frontmatter.
   ```
3. **Bootstrap skill** (`branching-story-bootstrap/SKILL.md`): update pre-flight call at `:209` (and the matching prose at `:195`):
   ```
   mcp__worldloom__get_context_packet(
       world_slug,
       task_type='story_bootstrap',
       story_slug=<story_slug>,
       seed_nodes=<cast CHAR ids + initial_location label if provided>,
       token_budget=<default>
   )
   ```
4. **MCP server** (`tools/world-mcp/src/tools/get-context-packet.ts`): if the `story_bootstrap` task_type handler currently rejects `story_slug` (because the bundle doesn't exist), update it to accept the slug as a target identifier without requiring a corresponding indexed bundle. Implementation may need to short-circuit the bundle-lookup path: bundle existence is the prerequisite for *other* story task types, not for `story_bootstrap`. Return `story_bundle_context: null` per contract.
5. **MCP validator** (`tools/world-mcp/src/tools/get-context-packet.ts` or the equivalent input-schema layer): the `story_slug` argument is now required for `story_bootstrap`; emit a clear input-validation error if omitted.

**Files touched**:
- `docs/CONTEXT-PACKET-CONTRACT.md`
- `docs/MACHINE-FACING-LAYER.md`
- `.claude/skills/branching-story-bootstrap/SKILL.md` (`:195`, `:209`)
- `tools/world-mcp/src/tools/get-context-packet.ts` (story_bootstrap handler)
- `tools/world-mcp/tests/tools/get-context-packet.test.ts` (new fixtures: story_bootstrap with story_slug → null story_bundle_context; without story_slug → error)

**Verification**:
- MCP integration test: `get_context_packet(world_slug, task_type='story_bootstrap', story_slug='new-bundle')` returns `story_bundle_context: null` and populated INV / M / OQ full bodies.
- MCP integration test: same call without `story_slug` argument returns a required-argument error.
- Bootstrap dry-run produces a context packet with `story_bundle_context: null`.

---

### D5 — Remove `ARCTRACE`; disambiguate story-local `DA` (P1)

**Problem**: `docs/MACHINE-FACING-LAYER.md:67` still lists `ARCTRACE` among story-bundle id classes for `get_record`. FOUNDATIONS §Story Bundles §4a explicitly rejects ARC_TRACE; SPEC-29 (legacy tools vocabulary cleanup) was supposed to purge ARC machinery but missed this surface. Additionally, the line treats `DA` as both world-level (in the atomic-id list) and story-local (implicitly, via `story_slug`) without disambiguation.

**Change**:
1. **MACHINE-FACING-LAYER.md `:67`**: replace the story-bundle id list to remove `ARCTRACE` and explicitly disambiguate DA:
   ```
   | `get_record` | The full parsed record for a structured id such as CF / CH /
   M / OQ / SEC / PA / DA / CHAR (world-scope; no `story_slug` required for
   world-level DA). Story-bundle ids — PG / SE / SF / OBL / CNSQ / THR / SREL /
   STINT / STENT / STSTAT / STLOC / STOBJ / BR / CHC / SLT / SLB / SAU / SP /
   RSP — require `story_slug` because authored story ids are unique only within
   `(world_slug, story_slug)`. Story-local `DA-<integer>` records also require
   `story_slug`; the absence of `story_slug` resolves DA at world scope. `ARC_TRACE`
   is not a valid record class. ...
   ```
2. **MCP retrieval** (`tools/world-mcp/src/tools/get-record.ts`): if `ARCTRACE` is currently a recognized id class in the retrieval schema, remove it. Confirm DA scope-resolution logic: `story_slug` present → story-local DA path; absent → world-level DA path.
3. **Cross-file grep**: confirm no other docs / skills / templates / tools file references `ARCTRACE` or `ARC_TRACE` outside of FOUNDATIONS' explicit rejection statement. If found, strip.

**Files touched**:
- `docs/MACHINE-FACING-LAYER.md` (`:67`)
- `tools/world-mcp/src/tools/get-record.ts` (id-class enum, if applicable)
- `tools/world-mcp/tests/tools/get-record.test.ts` (new fixture: ARCTRACE → unsupported-id-class error)
- (Conditional) any other file surfaced by the cross-file grep.

**Verification**:
- MCP integration test: `get_record('ARC_TRACE-1', story_slug='bundle')` returns `unsupported_id_class` error.
- MCP integration test: `get_record('DA-3', world_slug='w')` resolves world-level DA at `worlds/w/diegetic-artifacts/DA-3-*.md`.
- MCP integration test: `get_record('DA-3', world_slug='w', story_slug='b')` resolves story-local DA at `worlds/w/stories/b/_source/artifacts/DA-3.yaml`.
- Cross-file grep for `ARCTRACE` / `ARC_TRACE` returns only FOUNDATIONS' rejection statement and SPEC-31's documentation of the removal.

---

### D6 — Split CF-shaped candidate from `proposal_evidence` (P1)

**Problem**: `story-fact-promotion-to-canon/SKILL.md:169` declares the candidate "matches FOUNDATIONS §Canon Fact Record Schema strictly", but `:197-210` embeds promotion-only fields inside `candidate:`:
```yaml
candidate:
  ...
  source_basis:
    direct_user_approval: false
    derived_from: []
    story_branch: <branch_path>         # NOT in CF schema
    story_evidence:                     # NOT in CF schema
      source_records: ...
      ...
  promotion_provenance:                 # NOT in CF schema
    story_slug: ...
    ...
```
A `record_schema_compliance` check on `candidate:` alone would reject these fields. The "stripped at accept by canon-addition" convention at `:121` works in practice, but the "strictly matches CF" claim is misleading and the design accumulates strip-on-accept fragility (canon-addition must remember which fields to drop).

**Change**:
1. **Skill** (`story-fact-promotion-to-canon/SKILL.md`) Phase 2: replace the candidate template at `:172-211` with a CF-compatible-only shape:
   ```yaml
   candidate:
     title: ...
     status: hard_canon | derived_canon | soft_canon | contested_canon
     type: ...
     statement: ...
     scope: ...
     truth_scope: ...
     domains_affected: ...
     prerequisites: ...
     distribution: ...
     costs_and_limits: ...
     visible_consequences: ...
     required_world_updates: ...
     contradiction_risk: ...
     source_basis:
       direct_user_approval: false   # pre-acceptance; canon-addition sets true on accept
       derived_from: []              # empty for novel candidate; [<parent CF id>] for mirrored
   ```
   No `story_branch`, `story_evidence`, or `promotion_provenance` inside `candidate`.
2. **Skill** Phase 6 (`:285-296` area): restructure the proposal package to lift promotion-only fields out of `candidate`:
   ```yaml
   promotion_id: SP-<integer>
   story_slug: <story_slug>
   source_kind: <source_kind>
   candidate: <CF-compatible shape per Phase 2>
   proposal_evidence:
     story_branch: BR-<integer>
     source_kind: <source_kind>
     source_records: [<source_record_ids>]
     supporting_pages: [<supporting_page_ids>]
     authoring_events: [SE-<integer>]
     belief_witnesses: [BEL-<integer>]
     rendered_prose_receipts: [pages-prose-receipts/PG-<integer>.yaml]
     rationale: <natural-language>
   scope_inflation_report: ...
   mystery_firewall_report: ...
   downstream_impact_report: ...
   ```
3. **Skill** prose at `:213` and `:121`: reword to remove the "strictly CF-shaped" claim — the candidate IS strictly CF-shaped after this change; the surrounding `proposal_evidence` is the strip-on-accept boundary. Restate canon-addition's consumption rule: accept the `candidate` block as a CF-compatible record body; ignore the top-level `proposal_evidence` block at canon-creation time (it remains in the file as proposal-time audit trail).
4. **Template** (`.claude/skills/story-fact-promotion-to-canon/templates/proposal-package.yaml` if exists): regenerate to match the new shape.
5. **Validator** (`tools/validators/src/structural/proposal-package-shape.ts` if exists, or new): add a structural check that `candidate` contains only CF-schema fields; promotion-only fields under `candidate` → `proposal_package_candidate_impurity` (severity: fail).
6. **Canon-addition** (`canon-addition/SKILL.md`): update the proposal-consumption prose (Phase 2 or wherever the proposal package is parsed) to read `candidate` as the CF body and `proposal_evidence` as audit-only context. Verify no current canon-addition code path references the soon-to-be-removed `candidate.source_basis.story_branch` / `candidate.source_basis.story_evidence` / `candidate.promotion_provenance` paths.

**Files touched**:
- `.claude/skills/story-fact-promotion-to-canon/SKILL.md` (Phase 2, Phase 6, `:121`, `:213`)
- `.claude/skills/story-fact-promotion-to-canon/templates/proposal-package.yaml` (if exists)
- `.claude/skills/canon-addition/SKILL.md` (proposal-consumption prose)
- `tools/validators/src/structural/proposal-package-shape.ts` (new or extend)
- `tools/validators/src/registry.ts` (register if new rule)
- `tools/validators/tests/structural/proposal-package-shape.test.ts` (new test cases)

**Verification**:
- Validator test: proposal package with `candidate.source_basis.story_branch` → `proposal_package_candidate_impurity` FAIL.
- Validator test: proposal package with proper split (`candidate` pure CF; `proposal_evidence` top-level) → PASS.
- Skill dry-run: `story-fact-promotion-to-canon` produces a package with the new shape; `canon-addition` consumes the `candidate` field directly as the CF body and emits a clean `create_cf_record` op.

---

### D7 — Parseable non-propagation tags inside `SE.world_logic_rationale` (P1)

**Problem**: The closed enum of 5 non-propagation reasons exists at `branching-story-turn-cycle/SKILL.md:292` and `branching-story-health-audit/SKILL.md:190`, but `branching-story-turn-cycle/SKILL.md:293` says rationales are recorded in "authoring notes and carry the load-bearing rationale into `SE.world_logic_rationale`" — free-form. Health-audit Phase 2d cannot deterministically replay coverage decisions because the rationale lives in unstructured prose.

**Change**:
1. **Contract** (`_shared-templates/story-state-contract.md` §4.3 SE block, near the existing `world_logic_rationale` documentation): add the parseable-tag convention:
   ```
   When an expected witness group receives no BEL create/supersession, the
   rationale MUST include a parseable non-propagation tag inside
   `SE.world_logic_rationale`:
   
       non_propagation:<reason>(group=<label>, records=[<record_ids>])
   
   Valid `<reason>` values: `no_witness`, `witness_incapacitated`,
   `evidence_concealed`, `institution_suppresses_report`,
   `event_leaves_no_accessible_trace`.
   
   The tag is carried inside `world_logic_rationale` to avoid adding a schema
   field, but it is mechanically consumed by turn-cycle validation and
   health-audit replay.
   ```
2. **Turn-cycle** (`branching-story-turn-cycle/SKILL.md` Phase 4 at `:293`): replace the free-form rationale instruction with the tagged form. Add a Phase 9 check (or extend an existing one) `expected_witness_tag_presence`: when a non-propagation rationale is required, the SE's `world_logic_rationale` MUST contain the tagged form for each uncovered witness group.
3. **Health-audit** (`branching-story-health-audit/SKILL.md` Phase 2d at `:190`): parse the tagged form during replay. Each `expected_witnesses.direct[]` and `expected_witnesses.indirect[]` member must be accounted for by either a created/superseded BEL OR a parseable non-propagation tag with a matching `group` and records.
4. **Validator** (`tools/validators/src/structural/expected-witness-coverage.ts` or new): add structural parsing of the tag format; emit `expected_witness_tag_malformed` (severity: warn) when the tag is present but doesn't match the regex; emit `expected_witness_tag_missing` (severity: fail) when a witness group is uncovered and no tag is present.

**Files touched**:
- `.claude/skills/_shared-templates/story-state-contract.md` (§4.3 SE)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (`:293`, Phase 9)
- `.claude/skills/branching-story-health-audit/SKILL.md` (Phase 2d, `:190`)
- `tools/validators/src/structural/expected-witness-coverage.ts` (new or extend)
- `tools/validators/src/registry.ts` (register if new)
- `tools/validators/tests/structural/expected-witness-coverage.test.ts` (new fixtures: tag-present-and-valid, tag-malformed, tag-absent-with-uncovered-witness)

**Verification**:
- Validator test: SE with `world_logic_rationale` containing `non_propagation:evidence_concealed(group=public, records=[BEL-12])` for an uncovered group → PASS.
- Validator test: SE with no BEL coverage for an expected witness group AND no tag → `expected_witness_tag_missing` FAIL.
- Validator test: SE with malformed tag (`non_propagation:evidence_concealed group=public)` — missing parens) → `expected_witness_tag_malformed` WARN.

---

### D8 — Require CH-window retrieval for canon drift (P1)

**Problem**: Drift classification compares parent baseline to current world-canon revision (latest CH), but skills do not load the intervening CH window. `branching-story-turn-cycle/SKILL.md:164-165` extracts "current world-canon revision from the latest `change_log_entry` in the context packet". `branching-story-health-audit/SKILL.md:131` and Phase 2h at `:238` similarly compare against "the latest" without walking intervening CH entries or affected records. A page could classify as "compatible" because only the latest CH was inspected, while an intervening CH invalidated active story state.

**Change**:
1. **Contract** (`_shared-templates/story-state-contract.md` §4b drift discipline if it exists, otherwise a new sub-section near §9): add the CH-window discipline:
   ```
   When `parent.state_snapshot.canon_revision != current_world_canon_revision`,
   drift classification MUST retrieve every CH entry newer than the parent
   baseline plus the affected CF / M / INV / SEC ids named by those CH records,
   not only the latest CH. The latest CH from the context packet is the trigger
   for drift detection; the CH window between baseline and current is the
   evidence for classification.
   ```
2. **Turn-cycle** (`branching-story-turn-cycle/SKILL.md`) Pre-flight (after `:165`): if `parent.state_snapshot.canon_revision != latest_ch_id`, before classifying drift, call:
   ```
   mcp__worldloom__get_records(
       record_ids=<every CH id newer than parent baseline>,
       world_slug=<world_slug>
   )
   ```
   Then follow each CH's `affects: [<CF | M | INV | SEC ids>]` (or equivalent field — confirm naming during implementation) and retrieve those records before classifying.
3. **Health-audit** (`branching-story-health-audit/SKILL.md`) Phase 2h at `:238`: same discipline — for each stale baseline, walk the CH window from `PG.state_snapshot.canon_revision` to current; classify based on full window.
4. **Context-packet contract** (`docs/CONTEXT-PACKET-CONTRACT.md`): document the CH-window retrieval pattern as a recommended follow-up call after `get_context_packet` returns a drift trigger. Optionally add a `task_type='canon_drift_classification'` packet variant that automatically delivers the CH window; defer that to a follow-up spec unless an MCP integration audit recommends it now.
5. **Validator** (`tools/validators/src/structural/`): add a new rule `canon_drift_classification_evidence`:
   - When a PG's drift classification cites `compatible` or `grandfathered` against a baseline ≥2 CH revisions stale, the SE's rationale (or PG's `validation_trace`) MUST cite at least one specific CH-id from the window justifying the classification.
   - Emit `canon_drift_classification_missing_evidence` (severity: warn) on absence.

**Files touched**:
- `.claude/skills/_shared-templates/story-state-contract.md` (§4b or new section)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (Pre-flight after `:165`)
- `.claude/skills/branching-story-health-audit/SKILL.md` (Phase 2h, `:238`)
- `docs/CONTEXT-PACKET-CONTRACT.md` (canon-drift recommendation)
- `tools/validators/src/structural/canon-drift-classification-evidence.ts` (new)
- `tools/validators/src/registry.ts` (register)
- `tools/validators/tests/structural/canon-drift-classification-evidence.test.ts` (new fixtures: compatible / repair-turn / promotion-conflict / grandfathered)

**Verification**:
- Validator test: PG with `canon_revision: CH-5`, current `CH-12`, classification `compatible`, no CH-window citation → `canon_drift_classification_missing_evidence` WARN.
- Validator test: same, classification `compatible` with rationale citing `CH-7` and `CH-10` from the window → PASS.
- Skill dry-run: turn-cycle on a drifted parent → loads CH window via `get_records`; classifies per loaded evidence.

---

### D9 — Make mystery accretion policy conditional (P1, reclassified from report's P2)

**Problem**: `branching-story-health-audit/SKILL.md:206` references `M-record's accretion_policy.max_clues / equivalent limit`, but FOUNDATIONS Mystery Reserve schema defines only known/unknown/forbidden-answer/future-resolution fields. The `accretion_policy` field does not exist. The "/ equivalent limit" wording was a hedge, but the broken reference compounds when an implementer reads Phase 2e and looks for the field.

**Change**:
1. **Health-audit** (`branching-story-health-audit/SKILL.md` Phase 2e at `:206`): replace the wording to make policy enforcement conditional:
   ```
   - `mystery_accretion_overflow` — cumulative narrowing / mystery accretion
     exceeds what the M record allows. Enforcement is conditional:
     
     - If the M record exposes a validator-backed accretion-policy field
       (`accretion_policy.max_clues` or equivalent — see Mystery Reserve schema
       at FOUNDATIONS §Mandatory World Files), enforce that policy
       deterministically.
     - Otherwise, enforce only the schema-backed progression:
       (a) `evidence_records` non-empty for non-`preserved` statuses,
       (b) no forbidden-status resolution,
       (c) no escalation to `apparent_resolution` or `held_for_promotion`
           without a corresponding promotion pause.
     
     Whether the accumulated evidence chain collectively answers the mystery
     is a judgment-assisted finding unless a validator-backed M policy makes
     it deterministic.
   ```
2. **Cross-file grep**: confirm no other doc / skill / template / tools file references `accretion_policy.max_clues`. If found, strip or align with the conditional form.

**Files touched**:
- `.claude/skills/branching-story-health-audit/SKILL.md` (`:206`, `:412`, `:438` if applicable)
- (Conditional) other files surfaced by grep

**Verification**:
- Cross-file grep for `accretion_policy.max_clues` returns only Phase 2e's conditional wording and SPEC-31's documentation.
- Health-audit dry-run on a bundle with an M record lacking accretion_policy: Phase 2e emits status-progression findings without referencing the absent field.
- Health-audit dry-run on a bundle whose M record DOES carry an accretion_policy (hypothetical, since no such schema exists yet): Phase 2e enforces the policy deterministically.

---

### D10 — Closeout uses MCP retrieval for linked world records (P2, reclassified from report's P1)

**Problem**: `story-promotion-closeout/SKILL.md:140-141, 155, 167` instructs raw filesystem reads of `worlds/<slug>/_source/canon/CF-<integer>.yaml`, `_source/change-log/CH-<integer>.yaml`, and `adjudications/PA-<integer>-*.md`. Every other canon-reading skill goes through MCP. The reads are read-only and Hook 3 only blocks writes, so this is safe in practice — but inconsistent.

**Change**:
1. **Closeout** (`story-promotion-closeout/SKILL.md`) Pre-flight step 5 at `:155`:
   ```
   On accepted-flavored verdicts: verify each linked CF / CH / PA id resolves
   through MCP retrieval. Abort with `linked_record_not_found` on any miss.
   Do not raw-read world-canon `_source/` paths.
   ```
2. **Closeout** Pre-flight step at `:140-141` and World-State Prerequisites at `:167`: replace direct path enumerations with retrieval calls:
   ```
   - mcp__worldloom__get_records(
         record_ids=<linked_cf_ids + linked_ch_ids>,
         world_slug=<world_slug>
     )
   - mcp__worldloom__get_records(
         record_ids=<linked_pa_ids>,
         world_slug=<world_slug>
     )  # uses hybrid PA retrieval path
   ```
3. **MCP retrieval** (`tools/world-mcp/src/tools/get-records.ts`): confirm that `get_records` supports PA hybrid retrieval — adjudication records are hybrid markdown files, so the existing retrieval path may need extension. If not yet supported, defer the PA portion to a follow-up ticket and use `get_record` per-PA as the v1 path.

**Files touched**:
- `.claude/skills/story-promotion-closeout/SKILL.md` (`:140-141`, `:155`, `:167`, related Phase prose)
- `tools/world-mcp/src/tools/get-records.ts` (confirm PA hybrid support; extend if needed)
- `tools/world-mcp/tests/tools/get-records.test.ts` (new fixture: get_records over PA hybrid records, if supported)

**Verification**:
- Closeout dry-run on an accepted promotion: each linked CF / CH / PA resolves through MCP retrieval; raw `_source/` path reads are not present in the execution trace.
- Cross-file grep on `story-promotion-closeout/SKILL.md` for raw `_source/canon/` or `_source/change-log/` reads returns no matches outside historical-reference contexts.

---

### D11 — Clarify `mystery_resolution` source-record mapping (P2, reclassified from report's P1)

**Problem**: `story-fact-promotion-to-canon/SKILL.md:113`:
```
| `mystery_resolution` | `M-<integer>` for Mystery Reserve audit; SE `promotion_claims[].source_record` cites `SF-<integer>` or `BEL-<integer>` | ...
```
The table muddles "governing firewall load" (M) with "source record" (SF/BEL). Contract `_shared-templates/story-state-contract.md:236` is clean: `promotion_claims[].source_record` enum is `SF | BEL`. The user-supplied `source_record_ids` parameter for `mystery_resolution` should take SF/BEL — the governing M record is loaded by the skill from world context, not user-supplied as a source record.

**Change**:
1. **Skill** (`story-fact-promotion-to-canon/SKILL.md` Inputs source-kind table at `:113`): replace the row to clearly separate evidentiary source from governing firewall load:
   ```
   | `mystery_resolution` | `SF-<integer>` or `BEL-<integer>` that states the apparent, held, or candidate resolution | resolving `SE`, pre-resolution BEL chain, relevant `PG.state_snapshot.unresolved_mystery_claims[].evidence_records[]` | Required | M records are governing firewall load (auto-loaded from world context; not user-supplied as source_record_ids) |
   ```
2. **Skill** Pre-flight (`:146` area): when `source_kind == mystery_resolution`, verify each `source_record_ids` entry is `SF-<integer>` or `BEL-<integer>` (not `M-<integer>`); abort with `source_kind_record_class_mismatch` if violated.
3. **Skill** Phase 4 (`:243-256` Mystery Firewall): explicitly note that M records are loaded by the skill from world canon context (whole-class Mystery Reserve seeded into the context packet); they are NOT user-supplied via `source_record_ids`. Fix the malformed YAML at `:256` (`mysteries_scanned: <count of M-<integer> records loaded` is missing a closing brace/quote).
4. **Validator** (`tools/validators/src/structural/proposal-package-shape.ts`): add a check that when `source_kind == mystery_resolution`, every `source_record` in `proposal_evidence.source_records[]` is `SF` or `BEL`, not `M`. Emit `mystery_resolution_source_record_misclass` (severity: fail) on violation.

**Files touched**:
- `.claude/skills/story-fact-promotion-to-canon/SKILL.md` (`:113`, `:146`, `:256`)
- `tools/validators/src/structural/proposal-package-shape.ts` (extend D6's rule or new check)
- `tools/validators/tests/structural/proposal-package-shape.test.ts` (new fixtures: mystery_resolution with SF source PASS; with M source FAIL)

**Verification**:
- Validator test: proposal package with `source_kind: mystery_resolution` and `source_records: [SF-4]` → PASS.
- Validator test: same with `source_records: [M-3]` → `mystery_resolution_source_record_misclass` FAIL.
- Skill dry-run: `story-fact-promotion-to-canon` invoked with `source_kind: mystery_resolution, source_record_ids: [M-3]` aborts at pre-flight with `source_kind_record_class_mismatch`.

---

### D12 — Split deterministic vs. judgment-assisted prose invention (P2)

**Problem**: `branching-story-prose-attach/SKILL.md:193` partially distinguishes deterministic and judgment-assisted cases for `invented_structural_fact`, but the current wording overstates determinism. Some structural inventions (implied faction alignment, new capability, institutional rule not present in the plan) require semantic judgment — regex patterns cannot catch them.

**Change**:
1. **Prose-attach** (`branching-story-prose-attach/SKILL.md`) Phase 3 (around `:193`): replace `invented_structural_fact` wording with an explicit split:
   ```
   `invented_structural_fact` has deterministic and judgment-assisted subchecks.
   
   Deterministic FAIL cases (regex or state-projection-driven):
   - prose contradicts active STSTAT life/agency/location (e.g., dead actor
     speaks; located actor appears in a different STLOC; incapacitated actor
     performs a complex action);
   - prose asserts a named record id or canon-fact id absent from the plan's
     §4 / §7 / state snapshot;
   - prose states a mystery resolution that the plan's §11 marks as forbidden.
   
   Judgment-assisted WARN/FAIL cases (semantic):
   - implied faction alignment shifts not present in the plan;
   - new capability or magical/technological affordance not present in the
     plan's §4 or active state;
   - institutional rule or law invoked but not present in active canon
     (CF / INV) or plan §4.
   
   The roll-up `invented_structural_fact` receipt field records the worst
   verdict across both sub-categories. Judgment-assisted findings are flagged
   in `notes` so the user can review and decide on `revise_prose` vs.
   `run_turn_cycle_repair` vs. canon-promotion.
   ```
2. **Validator** (`tools/validators/`): no validator-rule change; this is a skill-discipline clarification. If the existing prose-attach receipt schema does not already carry a `subcategory: deterministic | judgment` field on each finding, optionally add it — but defer if it would expand scope.

**Files touched**:
- `.claude/skills/branching-story-prose-attach/SKILL.md` (`:193` area)

**Verification**:
- Skill dry-run on a prose with dead-actor-speaks invention → deterministic FAIL.
- Skill dry-run on a prose introducing a new faction alignment → judgment-assisted finding with `notes` flagging the case for user review.

---

### D13 — Clean stale ID/status wording (P2)

**Problem**: Three documentation drift sites surface during verification:
- `_shared-templates/story-state-contract.md:60`: "next `-NNNN` id" — padded format conflicts with FOUNDATIONS-002 unpadded ID convention.
- `branching-story-turn-cycle/SKILL.md:402`: example `CHC-0003`, `CHC-0004` — padded.
- `story-promotion-closeout/SKILL.md:353`: "Read linked CF records' `status` (5 layer values)" — CF has 4 statuses (`hard_canon`, `derived_canon`, `soft_canon`, `contested_canon`); Mystery Reserve entries are separate `M-<integer>` records, not CF statuses.

**Change**:
1. **Contract** (`_shared-templates/story-state-contract.md:60`): replace "next `-NNNN` id" with "next `<CLASS>-<integer>` id" per FOUNDATIONS-002 unpadded natural-integer convention.
2. **Turn-cycle** (`branching-story-turn-cycle/SKILL.md:402`): replace `CHC-0003` and `CHC-0004` with `CHC-3` and `CHC-4`.
3. **Closeout** (`story-promotion-closeout/SKILL.md:353`): replace "Read linked CF records' `status` (5 layer values)" with:
   ```
   Read linked CF records' `status` values (`hard_canon`, `derived_canon`,
   `soft_canon`, `contested_canon`). Mystery Reserve entries are separate
   `M-<integer>` records, not CF status values.
   ```
4. **Cross-file grep**: confirm no other padded ID forms (`<CLASS>-\d{4,}`) exist in skills or shared templates.

**Files touched**:
- `.claude/skills/_shared-templates/story-state-contract.md` (`:60`)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (`:402`)
- `.claude/skills/story-promotion-closeout/SKILL.md` (`:353`)

**Verification**:
- Cross-file grep for `-NNNN` in skills and shared templates returns no matches.
- Cross-file grep for `CHC-0\d+` in skills returns no matches.
- Cross-file grep for "5 layer values" / "five layer values" in skills returns no matches.

---

### D14 — Clarify story-local retrieval vs. packet seed nodes (P2)

**Problem**: `seed_nodes` is world-record-oriented in `get_context_packet` semantics, but story-pipeline skills sometimes describe `seed_nodes` containing story-local ids. Story-local records are delivered through `story_slug` + `story_bundle_context` or via explicit `get_records(record_ids, story_slug=...)`. Mixing scopes risks under-delivered packets when story-local ids are passed as world seed nodes.

**Change**:
1. **Context-packet contract** (`docs/CONTEXT-PACKET-CONTRACT.md`): add a clarification section after the `seed_nodes` documentation:
   ```
   For story-pipeline task types (`story_bootstrap`, `story_turn_cycle`,
   `commitment_block_authoring`, `branching_story_health_audit`,
   `story_fact_promotion_to_canon`), `seed_nodes` should preferentially name
   world-canon or hybrid world records (CF / CH / M / OQ / INV / ENT / SEC /
   CHAR / DA-world / PA). Story-bundle records are supplied through
   `story_slug` and `story_bundle_context`; when exact story-local records
   are needed, use `get_records(record_ids, story_slug=<story_slug>)` or
   `list_records(record_type, story_slug=<story_slug>)`. Do not rely on
   world-scope `seed_nodes` expansion for story-local ids unless the
   deployed MCP capability explicitly documents that support.
   ```
2. **MACHINE-FACING-LAYER.md `:76`** `get_context_packet` row: add a one-line cross-reference to the new contract section.
3. **Skills**: audit `branching-story-health-audit`, `commitment-block-authoring`, and `story-fact-promotion-to-canon` pre-flight `get_context_packet` calls — if any pass story-local ids in `seed_nodes`, refactor to use `story_slug` + targeted `get_records`. (Verification during implementation: search each skill's pre-flight section for `seed_nodes=` and audit each id class.)
4. **MCP server** (`tools/world-mcp/src/tools/get-context-packet.ts`): if the implementation currently silently expands story-local ids passed as world `seed_nodes` (or silently drops them), emit a warning in the packet response (`task_header.warnings: ['story_local_seed_nodes_ignored']`). Implementation may choose strict rejection instead; warning is the lower-risk default.

**Files touched**:
- `docs/CONTEXT-PACKET-CONTRACT.md`
- `docs/MACHINE-FACING-LAYER.md` (`:76`)
- `.claude/skills/branching-story-health-audit/SKILL.md` (pre-flight, if applicable)
- `.claude/skills/commitment-block-authoring/SKILL.md` (pre-flight, if applicable)
- `.claude/skills/story-fact-promotion-to-canon/SKILL.md` (pre-flight, if applicable)
- `tools/world-mcp/src/tools/get-context-packet.ts` (warning surface)
- `tools/world-mcp/tests/tools/get-context-packet.test.ts` (new fixture: story-local id in seed_nodes → warning)

**Verification**:
- MCP integration test: `get_context_packet(story_turn_cycle, seed_nodes=['SF-3'])` (story-local id without `story_slug`) → warning in `task_header.warnings`.
- Cross-file audit: every story-pipeline skill's pre-flight `get_context_packet` call uses world ids in `seed_nodes` only.

---

## FOUNDATIONS Alignment

| Principle | Stance | Rationale |
|---|---|---|
| Rule 1 (No Floating Facts) | aligns | D6 enforces CF-shape purity on the candidate so canon-addition's existing record_schema_compliance enforcement is unblocked; D11 prevents M ids from leaking into proposal source records. |
| Rule 4 (No Globalization by Accident) | aligns | D8 (CH-window retrieval) ensures drift classification has full evidence; D6's candidate purity preserves the scope-inflation check's input. |
| Rule 5 (Schema Minimalism — no fields without consumers) | aligns | D1 removes two unused fields; D7 uses tag convention instead of new schema field; D9 makes the broken `accretion_policy` reference conditional rather than adding the field. |
| Rule 6 (No Silent Retcons) | aligns | D2 makes audit-only SE shape mechanically auditable; D8 forces drift classification to cite evidence. |
| Rule 7 (Preserve Mystery Deliberately) | aligns | D9 preserves the Mystery Reserve firewall's deterministic core; D11 prevents M ids from being treated as ordinary source records. |
| §Story Bundles §4a (Plan-Authority Boundary) | aligns | D1 removes the fields whose nullness contradicts the boundary; prose remains a publication artifact, never page state. |
| §Story Bundles §No-ARC_TRACE | aligns | D5 removes the last residual `ARCTRACE` reference from MACHINE-FACING-LAYER.md. |
| §Canonical Storage Layer | aligns | D10 routes closeout reads through MCP for retrieval-contract consistency without changing write surfaces. |

---

## Out of Scope

The following adjacent items are intentionally not in this spec:

- **SLT-pool linter cluster** (item P1.8 from fourth-iteration triage, deferred to a separate spec).
- **`story_sift` audit mode** (item P1.10 from fourth-iteration triage, deferred to a separate spec).
- **Property-based test fixtures** (deferred indefinitely per third-iteration triage; structural invariants require either a mocked-skill harness or pilot-bundle authoring, both priced out).
- **`get_records` PA hybrid retrieval extension** (referenced in D10): if `get_records` does not yet support hybrid PA records, D10's PA portion falls back to per-PA `get_record` calls. Adding hybrid-batch retrieval for PA is a follow-up MCP ticket.
- **`task_type='canon_drift_classification'` packet variant** (referenced in D8): the dedicated packet variant would deliver the CH window automatically; deferred to a follow-up MCP integration audit decision.
- **`subcategory: deterministic | judgment` field on prose-attach receipts** (referenced in D12): D12 documents the split in prose; the structured receipt-field extension is a follow-up if needed.
- **Negative recommendations from the report (R-01 through R-05)**: act structure, drama manager, rumor graph, word-count targets, auto-merge sibling branches — all confirm-existing-position with no action; documented in the companion triage file.

---

## Risks & Open Questions

- **PR review surface area**: 14 deliverables touching 7 skills + 2 docs + 4+ tools files is the largest worldloom contract-hardening spec to date. *(pragmatic — would be smaller if split into SPEC-31 P0+P1 and SPEC-32 P2; chose single-spec for verification-context-freshness, but the implementer may decompose into 14 tickets with no loss of correctness — see Key design decisions §6.)*
- **D1 fixture-suite migration**: the test bundles under `tools/validators/tests/fixtures/` currently carry `prose_path` / `prose_receipt_path` fields. They must be stripped and PG hashes recomputed as part of D1 implementation, not deferred. *(structural — no production stories means there's no harder migration to do, but the test suite is real state.)*
- **D2 audit-only SE retroactive shape check**: if any existing fixture bundle carries a `prose_attach` SE that violates the new §4.3a shape (e.g., non-empty `state_delta`), the new validator rule will fail it. Expected: zero such fixtures exist (the contract never documented otherwise), but verify during implementation. *(structural)*
- **D4 MCP server behavior change**: if the current `get_context_packet` implementation rejects `story_slug` for `story_bootstrap` (because no bundle exists), the change to require it is a server-behavior breaking change. Coordinate the skill-level change (bootstrap pre-flight) with the server-side change so neither path breaks the other mid-rollout. Pre-production-greenfield posture makes this low-risk but worth flagging. *(structural)*
- **D6 canon-addition consumption change**: D6 restructures the proposal package shape. Any current canon-addition code path that parses `candidate.source_basis.story_branch` / `candidate.source_basis.story_evidence` / `candidate.promotion_provenance` will need to be updated to read `proposal_evidence.*`. If those code paths exist in the canon-addition skill or its supporting validators, the change is a coordinated cross-skill rewrite, not a single-file edit. *(structural)*
- **D8 CH "affects" field naming**: the CH-window retrieval references "affected CF / M / INV / SEC ids named by those CH records". The exact field name on the CH schema (`affects`, `touched_records`, `extension_targets`, or other) needs confirmation during implementation. *(structural — naming detail.)*
- **D9 "/ equivalent limit" hedge in current wording**: the existing wording at `:206` includes "/ equivalent limit" which arguably absorbs the conditional case implicitly; the explicit split is clarity over correctness. If reviewers prefer a one-line edit ("If the M record exposes a validator-backed accretion-policy field, enforce it; otherwise enforce schema-backed progression only"), accept that as a smaller D9 footprint. *(pragmatic — cost vs. clarity trade.)*
- **D10 PA retrieval gap**: as flagged in Out of Scope, if `get_records` does not yet support hybrid PA records, D10's implementer must either extend `get_records` (broader scope) or fall back to per-PA `get_record` calls (narrower scope). The fallback is acceptable for v1; extension is recommended for v2. *(pragmatic — implementation strategy.)*
- **D14 retrofit-cost on existing skills**: if existing skills already pass story-local ids in `seed_nodes` and the MCP server tolerates it, retrofitting may require fixture updates. Audit during implementation. *(pragmatic)*

---

## Verification — phasing recommendation

Recommended implementation order, paralleling the report's own P0 → P1 → P2 staging:

**Phase 1 (P0, before any production story)**:
1. D1 (PG prose fields removal) — touches schema + 4 skills + tooling; new test fixtures.

**Phase 2 (P1, before large-scale testing)**:
2. D2 (audit-only SE lifecycle).
3. D3 (SLT.created_at_page origin/scope rule).
4. D4 (story_bootstrap context-packet normalization) — coordinate MCP server with skill.
5. D5 (ARCTRACE removal + story-local DA disambiguation).
6. D6 (CF-shaped candidate + proposal_evidence split) — coordinate with canon-addition.
7. D7 (parseable non-propagation tags).
8. D8 (CH-window drift retrieval).
9. D9 (mystery accretion conditional).

**Phase 3 (P2, after Phase 2 lands)**:
10. D10 (closeout MCP retrieval).
11. D11 (mystery_resolution source mapping clarity).
12. D12 (prose invention deterministic/judgment split).
13. D13 (stale ID/status wording).
14. D14 (story-local seed_nodes clarity).

Each deliverable is independent enough to land as its own ticket; phases group by risk severity, not interdependence. The implementer may parallelize within a phase.
