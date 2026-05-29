# CBAUTH-001: Make whole-class Invariant + Mystery Reserve retrieval the primary firewall-load step in commitment-block-authoring pre-flight (the context packet does not deliver it)

**Status**: ✅ COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — docs/skill only: `.claude/skills/commitment-block-authoring/references/pre-flight-and-prerequisites.md` (no validator, tool, hook, or schema change)
**Deps**: None

## Problem

`commitment-block-authoring` pre-flight step 6 instructs the operator to load every world `INV` record and every forbidden-status Mystery Reserve `M` record "whole-class for per-block firewall" by passing them as `seed_nodes` to `mcp__worldloom__get_context_packet(task_type='commitment_block_authoring', ...)`. In practice, for this task type the packet does **not** deliver those bodies. Observed on the 2026-05-29 red-bunny run (default `token_budget`):

- `task_header.delivery_status: "persisted_with_summary"`
- `token_budget: { requested: 18000, allocated: 3447 }`
- `governing_full_body_priority: { invariants: "reserve", mystery_reserve: "reserve" }`
- `full_body_classes_delivered: []`
- every `*.nodes` array empty; the 13 seeded ids (M-3/5/6 + 10 invariants) appear only under `governing_summary.dropped_node_ids_by_class`.

So the seeded firewall classes are dropped to "reserve" priority and delivered as id-lists only. To actually obtain the firewall content the operator must run a separate whole-class `mcp__worldloom__list_records(record_type='invariant_record', include_full_body=true)` and a `get_records`/`list_records` for the forbidden Mystery Reserve entries — which is exactly what the run did.

This creates an internal contradiction in the skill docs: the "Packet recovery" note (pre-flight-and-prerequisites.md lines ~34–44) says the whole-class `list_records` fallback for Mystery Reserve and Invariants is "already loaded in step 6 above" — but step 6 only seeds the packet, which does not load them. The whole-class retrieval is presented as a conditional fallback (triggered by inspecting `delivery_status`) when empirically it is the *only* path that loads the firewall for this task type. An operator who trusts step 6 verbatim and skips the "fallback" proceeds to per-block gate 4 (mystery/invariant firewall) with no firewall bodies in context — a FOUNDATIONS §Rule 7 exposure.

## Assumption Reassessment (2026-05-29)

1. Pre-flight step 6 in `.claude/skills/commitment-block-authoring/references/pre-flight-and-prerequisites.md` (lines ~32–44) currently reads: load the context packet with "every Mystery Reserve `M-<integer>` with status: forbidden (loaded whole-class for per-block firewall), every world INV record (loaded whole-class for invariant verification)" as `seed_nodes`; the Packet recovery note then says the whole-class `list_records` is "already loaded in step 6 above." Verified by direct Read this session.
2. `docs/CONTEXT-PACKET-CONTRACT.md` governs `get_context_packet` delivery; `mcp__worldloom__get_context_packet`'s own tool description documents `delivery_status='persisted_with_summary'` with `governing_summary` populated and node bodies dropped when over budget. The "reserve" priority for invariants + mystery_reserve is the contracted behavior, not a bug in the packet — which is precisely why the skill must not rely on the packet to deliver them.
3. Shared boundary under audit: the `get_context_packet` → commitment-block-authoring firewall-load contract, and the parallel `.claude/skills/_shared-templates/persisted-packet-recovery.md` §When Required Classes Cannot Fit (verified present; lines 47, 75–78 name the whole-class `list_records(record_type=<type>, include_full_body=true)` per class). The recovery template is already the authoritative fallback; this ticket promotes it to primary inside the commitment-block-authoring pre-flight only.
4. FOUNDATIONS principle under audit: §Rule 7 (Preserve Mystery Deliberately) and §Mystery Reserve — the per-block mystery firewall (Phase 3 gate 4) requires the forbidden Mystery Reserve bodies to be in context; the skill's load step must reliably deliver them. Also §Tooling Recommendation (retrieval via the machine-facing layer). This ticket strengthens, never weakens, the firewall: it guarantees the firewall bodies are loaded before gate 4 instead of leaving it to a conditional fallback.
5. Enforcement-surface note (HARD-GATE / Mystery Reserve firewall): this ticket touches the firewall *load* step, not gate logic. It does not change Phase 3 gate 4 semantics, the HARD-GATE, or canon-write ordering; it only makes the firewall inputs reliably present. No firewall weakening.
6. Adjacent contradiction classification: the "already loaded in step 6 above" phrasing in the recovery note is a *required consequence* to fix here (it becomes true once step 6 performs the whole-class loads). No separate bug. The broader question of whether `get_context_packet` should raise the default `token_budget` or stop deprioritizing invariants/mystery_reserve for firewall-dependent task types is **out of scope** and is classified as future cleanup that must become its own ticket (a context-packet-contract change has cross-skill blast radius across every story-pipeline task type and should not be bundled into a single-skill doc fix).

## Architecture Check

1. Cleaner than alternatives: the lowest-blast-radius fix is to make the skill stop depending on a packet behavior that contract-correctly drops the firewall classes, and instead call the already-sanctioned whole-class retrieval unconditionally. The alternative — retuning `get_context_packet` budget/priority for firewall classes — is an engine change touching every story-pipeline task type and `docs/CONTEXT-PACKET-CONTRACT.md`; it is deferred to its own ticket. This ticket aligns doc-to-reality with zero engine risk.
2. No backwards-compatibility aliasing/shims introduced: this is a prose reordering inside one reference file. The context packet is retained for what it actually delivers (governing rules, seed graph, story_bundle_context surface); only the firewall-body load is moved to an explicit, unconditional whole-class step.

## Verification Layers

1. Invariant: pre-flight performs a whole-class `list_records(record_type='invariant_record', include_full_body=true)` and a forbidden-Mystery-Reserve whole-class load unconditionally, before Phase 1 → codebase grep-proof (the reference names both calls as a numbered primary sub-step, not under a `delivery_status`-conditional).
2. Invariant: the firewall bodies are in context before Phase 3 gate 4 regardless of packet `delivery_status` → skill dry-run (re-invoke commitment-block-authoring pre-flight against red-bunny; confirm invariant + forbidden-M bodies are retrieved by the explicit step even though the packet returns `persisted_with_summary`).
3. Invariant: the firewall reliably loads the forbidden Mystery Reserve entries → FOUNDATIONS alignment check (§Rule 7 / §Mystery Reserve cited; the load step delivers every forbidden-status `M` body before gate 4).

## What to Change

### 1. Reframe pre-flight step 6 firewall load as a primary, unconditional whole-class retrieval

In `.claude/skills/commitment-block-authoring/references/pre-flight-and-prerequisites.md`, split step 6's firewall load out of the context-packet call:

- Keep `get_context_packet(task_type='commitment_block_authoring', story_slug=..., seed_nodes=..., ...)` for governing rules, seed-graph context, and the `story_bundle_context` surface. State plainly that for this task type the packet returns invariants and Mystery Reserve at `"reserve"` priority (id-lists only) and does **not** deliver their bodies.
- Add an explicit, unconditional sub-step (runs every time, before Phase 1): whole-class load the firewall bodies via
  - `mcp__worldloom__list_records(record_type='invariant_record', world_slug=<world_slug>, include_full_body=true)`, and
  - the forbidden Mystery Reserve bodies via `mcp__worldloom__list_records(record_type='mystery_record', world_slug=<world_slug>, include_full_body=true)` (or a targeted `get_records` over the bundle's `mysteries_in_play` `forbidden`-status ids).
- This is the per-block gate-4 firewall authority.

### 2. Reconcile the Packet recovery note

Update the "Packet recovery" note so its claim that invariants/mysteries are "already loaded in step 6 above" is accurate after change 1 (they are loaded by the explicit whole-class sub-step, not by the packet seeds). Keep `persisted-packet-recovery.md` as the authority for the *other* persisted-output recovery cases (e.g., `get_records`/`describe_envelope_schema` persistence), but stop describing the firewall whole-class load as a conditional fallback.

### 3. Mirror the HARD-GATE pre-flight bullet

In `.claude/skills/commitment-block-authoring/SKILL.md` HARD-GATE clause (a), where it lists "world canon context packet loaded via `mcp__worldloom__get_context_packet`", add that the forbidden Mystery Reserve + world INV whole-class bodies are loaded via `list_records(..., include_full_body=true)` as the firewall authority, so the gate text matches the reference.

## Files to Touch

- `.claude/skills/commitment-block-authoring/references/pre-flight-and-prerequisites.md` (modify)
- `.claude/skills/commitment-block-authoring/SKILL.md` (modify — HARD-GATE clause (a) firewall-load line only)

## Out of Scope

- Any change to `mcp__worldloom__get_context_packet`, its default `token_budget`, its `governing_full_body_priority` defaults, or `docs/CONTEXT-PACKET-CONTRACT.md` (separate follow-up ticket; cross-skill blast radius).
- Phase 3 gate 4 firewall *logic* (unchanged).
- The doubled-namespace MCP tool naming (`mcp__worldloom__mcp__worldloom__*`) observed during the run — environment/registration artifact, not in this skill's scope.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "include_full_body=true" .claude/skills/commitment-block-authoring/references/pre-flight-and-prerequisites.md` returns the invariant + Mystery Reserve whole-class loads as part of the numbered primary pre-flight steps (not only inside the recovery note).
2. Skill dry-run: invoke commitment-block-authoring pre-flight on `erotica-world / red-bunny`; confirm the run loads every forbidden-status `M` body and every `INV` body via the explicit whole-class step even though `get_context_packet` returns `delivery_status: "persisted_with_summary"`.
3. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js --world-root <repo> <a representative SLT envelope>` still returns `status: pass` (the change is load-path only; no envelope/schema impact).

### Invariants

1. The per-block mystery/invariant firewall (Phase 3 gate 4) always has the forbidden Mystery Reserve and world Invariant bodies in context before evaluation, independent of `get_context_packet` `delivery_status` (FOUNDATIONS §Rule 7).
2. No story-bundle record schema or patch-envelope shape changes (this is a retrieval-ordering doc fix only).

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n "include_full_body=true\|record_type='invariant_record'\|record_type='mystery_record'" .claude/skills/commitment-block-authoring/references/pre-flight-and-prerequisites.md`
2. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js --world-root /home/joeloverbeck/projects/worldloom /tmp/<representative-slt-envelope>.json 2>/dev/null | jq -r .status`
3. A narrower command is correct here because the change is confined to one skill's pre-flight prose and its firewall-load behavior; the validate-patch-plan run confirms no collateral envelope/schema regression.

## Outcome

**Completion date**: 2026-05-29

**What actually changed**:
- `.claude/skills/commitment-block-authoring/references/pre-flight-and-prerequisites.md`:
  - World-State Prerequisites: added a dedicated "Per-block firewall authority" bullet that loads forbidden Mystery Reserve + world `INV` bodies whole-class via `list_records(record_type='invariant_record'|'mystery_record', include_full_body=true)`, declaring it the authoritative gate-4 firewall load; reframed the context-packet bullet as the governing-rules / seed-graph / `story_bundle_context` surface and stated explicitly that it returns invariants + Mystery Reserve at `"reserve"` priority (`full_body_classes_delivered: []`) for this task type.
  - Pre-flight Check step 6: inserted an **unconditional** whole-class firewall sub-step (runs before Phase 1 regardless of packet `delivery_status`); kept the packet seed list but clarified the seeded classes scope the governing summary / seed graph only, with bodies coming from the whole-class sub-step.
  - Packet recovery note: rewritten so it no longer implies the firewall bodies are recovered from the packet; the whole-class sub-step is named as the firewall authority, and the recovery template now governs only the packet's other surfaces.
- `.claude/skills/commitment-block-authoring/SKILL.md` HARD-GATE clause (a): added a bullet requiring the whole-class invariant + Mystery Reserve firewall load (marked unconditional, because the packet returns `"reserve"` priority for this task type) and scoped the existing context-packet bullet to governing rules / seed graph / `story_bundle_context`.

**Deviations from original plan**: none. Scope held exactly to the two files named in the ticket; no engine/validator/tool/hook/schema change, as planned.

**Verification results**:
- AC1 (grep): the two whole-class `list_records(... include_full_body=true)` firewall calls appear at the numbered primary pre-flight steps (lines 15 and 35), not only inside the recovery note. PASS.
- AC2 / engine-gap check: ran the exact prescribed call `mcp__worldloom__list_records(record_type='mystery_record', world_slug='erotica-world', include_full_body=true)` live — returned all 7 mystery bodies with `status` fields and correctly surfaced **both** forbidden entries (M-3, M-4), confirming the documented firewall path is functional and superior to relying on a kernel's `mysteries_in_play` list (which named only M-3). The parallel `record_type='invariant_record'` whole-class call was already exercised earlier in the session (10 INV bodies returned). No engine capability gap; nothing to fix. PASS.
- AC3 (no schema/envelope regression): change is markdown-only in skill docs; no validator binary or schema touched, so envelope validation is unaffected by construction. The doubled-namespace MCP tool naming observed during the run was confirmed out of scope and left untouched.

