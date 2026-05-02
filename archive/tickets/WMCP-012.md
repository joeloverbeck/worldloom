# WMCP-012: Reserve full-body delivery budget for governing-context invariants and Mystery Reserve in `character_generation` packet

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-mcp/src/context-packet/full-body-delivery.ts`, `tools/world-mcp/src/context-packet/assemble.ts`, `tools/world-mcp/src/context-packet/shared.ts`, context-packet tests, `docs/CONTEXT-PACKET-CONTRACT.md`, `docs/MACHINE-FACING-LAYER.md`, `tools/world-mcp/README.md`, `.claude/skills/character-generation/references/world-state-prerequisites.md`, `.claude/skills/diegetic-artifact-generation/references/world-state-prerequisites.md`
**Deps**: `archive/tickets/WMCP-005-reconcile-context-packet-budget-harness-ceiling.md` (dual-ceiling enforcement); `archive/tickets/WMCP-011.md` (envelope-overhead reserve, recommended landed first so the larger governing-context payload doesn't push the inline ceiling)

## Problem

At intake, the `character-generation` SKILL prose at `.claude/skills/character-generation/references/world-state-prerequisites.md:17` promised:

> "the packet returns Kernel + invariants (every INV record across all five categories, with full parsed `record` bodies) + seed-relevant CFs with full parsed `record` bodies + seed-touched priority SEC records ... with full parsed `record` bodies + Mystery Reserve nodes whose parsed `record` bodies carry the Phase 7b firewall fields"

This contract is the foundation for Phase 7a (Invariant Conformance — checks every capability/belief/material-reality fact against every INV record) and Phase 7b (Mystery Reserve Firewall — records every M-id checked, prevents `disallowed_cheap_answers` leakage). Both phases need full governing bodies or an explicit failure/recovery path, not silent body-previews.

In the May 2 character-generation session against `worlds/erotica-world` that produced `CHAR-0002` (`iker-aguirre`), `mcp__worldloom__get_context_packet(task_type='character_generation', seed_nodes=['entity:donostia', 'entity:basque-country', 'entity:spain', 'entity:mount-igueldo'], token_budget=18000)` returned `delivery_status: 'inline'` (technically successful), but the `task_header.full_body_downgrades` field listed EVERY governing-context full body as downgraded:

```
full_body_downgrades: [
  {layer: 'governing_world_context', node_id: 'AES-1', node_type: 'invariant', reason: 'high_value_full_body_budget_exceeded'},
  {layer: 'governing_world_context', node_id: 'AES-2', ...},
  ... (all 10 invariants ONT-1, ONT-2, CAU-1, CAU-2, DIS-1, DIS-2, SOC-1, SOC-2, AES-1, AES-2)
  {layer: 'governing_world_context', node_id: 'M-1', node_type: 'mystery_reserve_entry', reason: 'high_value_full_body_budget_exceeded'},
  ... (all 4 M records M-1, M-2, M-3, M-4)
]
```

The skill's promised full bodies were silently downgraded to body-previews. To complete Phase 7a/7b work, the operator had to issue a 17-record `get_records` follow-up call (10 INVs + 4 Ms + 3 CFs), which itself returned a 61-KB response that exceeded the harness inline cap and required a `jq`-on-persisted-file recovery (an issue WMCP-013 separately addresses for batch projections). The total cost: ~5 extra minutes of session time, two extra MCP round-trips, and a divergence between what the skill promised and what the packet delivered.

`worlds/erotica-world` is the world WMCP-005 calibrated against. It has 10 invariants (2 per category × 5 categories), 4 Mystery Reserve entries, and 3 CFs. It is the smallest production-shaped world locally available. At intake, the high-value full-body sub-budget could not accommodate `erotica-world`'s 14 governing-context records at the documented `token_budget=18000`, so production-shaped worlds could trigger a downgrade-and-refetch cycle.

The landed fix is in the assembler's high-value full-body allocation policy: governing-context invariants and Mystery Reserve records are reserve-prioritized before other layers consume full-body budget. If they still cannot fit under token and effective harness ceilings after lower-priority layers are dropped, the packet fails loudly instead of silently downgrading them.

## Assumption Reassessment (2026-05-02)

1. `tools/world-mcp/src/context-packet/full-body-delivery.ts` allocates full bodies in priority order. The current allocation behavior emits `full_body_downgrades` entries with `reason: 'high_value_full_body_budget_exceeded'` when the high-value sub-budget runs out. The May 2 session evidence shows that for the `character_generation` profile, this sub-budget is too small to fit the governing-context invariants and Mystery Reserve at the documented `token_budget=18000` for a 10+4-record world.
2. `tools/world-mcp/src/context-packet/assemble.ts` calls `full-body-delivery` after layer assembly, then reruns `enforceBudget` per WMCP-005 line 28 ("the assembler reruns layer-drop enforcement after full-body downgrade metadata is added"). The full-body sub-budget is presumably a fraction of the total `token_budget`; the calibration has been silently inadequate for governing-context-heavy contracts since WMCP-005 lowered the default from 33000 to 18000.
3. Cross-skill shared boundary: `character-generation` is the most affected skill because Phase 7a tests against EVERY INV record and Phase 7b tests against EVERY M record — both require full bodies. `diegetic-artifact-generation` Phase 7 has the same shape (its `references/world-state-prerequisites.md:17` promises "every INV record across all five categories"). `canon-addition` and the canon-pipeline-adjacent skills test against narrower sets and may not be affected. This ticket should fix the `character_generation` and `diegetic_artifact_generation` profiles together; other profiles remain at the existing allocation policy.
4. FOUNDATIONS principle under audit: §Tooling Recommendation lines 488-490 — "completeness guarantees" of the context-packet pattern. When the packet's documented contract ("every INV record ... with full parsed `record` bodies") is silently broken at the documented default, the completeness guarantee is degraded. The fallback (targeted `get_records` retrieval) preserves correctness but defeats the point of the packet abstraction; the operator pays for it in round-trips and recovery overhead.
5. FOUNDATIONS principle also under audit: §Validation Rules — Rule 7 (Preserve Mystery Deliberately) — Phase 7b firewall completeness is canon-safety-critical. A skill that silently operates on body-previews of M records carries elevated risk of letting a `disallowed_cheap_answer` slip through, because the body-preview may not surface the full `disallowed_cheap_answers` array. The full body MUST be available at Phase 7b without forcing operator-side recovery.
6. Schema extension audit per `tickets/README.md` Pre-Implementation Check 10: this ticket is additive for successful response telemetry (`task_header.governing_full_body_priority`) and additive for reserve-body insufficiency error details. The `full_body_downgrades` array continues to exist for opportunistic candidates. Under this ticket, `character_generation` and `diegetic_artifact_generation` profiles do not silently place governing-context INV/M reserve nodes in `full_body_downgrades`; they either deliver those full bodies or return `packet_incomplete_required_classes`.
7. Adjacent contradictions: this ticket assumes the `governing_world_context` layer's invariants and Mystery Reserve entries are first-class for the `character_generation` and `diegetic_artifact_generation` profiles. The landed policy is per-task: only those two profiles use `reserve` for governing invariant and Mystery Reserve full bodies; `canon_addition` and every other profile remain `opportunistic` to preserve pre-ticket behavior.
8. Mismatch + correction: the SKILL prose's "every INV record ... with full parsed `record` bodies" was aspirational at the documented default. The live `worlds/erotica-world` proof showed that the WMCP-011 effective inline ceiling (`60000 - 4000 = 56000` chars) cannot fit local authority plus all reserved governing full bodies for the representative `character_generation` request: the required serialized size is about `69930` chars. The truthful landed contract is therefore stronger no-silent-downgrade behavior, not guaranteed inline delivery under the current harness ceiling: reserved governing full bodies are delivered when they fit after lower-priority layers are dropped, otherwise the packet returns `packet_incomplete_required_classes` with `missing_classes: ['governing_world_context.full_body']`, `retry_with.token_budget`, `minimum_required_harness_ceiling_chars`, and `governing_full_body_priority`.

## Architecture Check

1. **Reserve-first allocation for governing-context full bodies is structurally cleaner than raising the default token_budget.** Raising the budget pushes more risk onto the harness ceiling (WMCP-005 + WMCP-011's surface) and bloats every packet for skills that don't need governing-context full bodies. A profile-aware allocation policy keeps the budget the same and just ensures the right records get the full-body slots.
2. **Per-profile priority configuration is structurally cleaner than a global priority table.** `character_generation` and `diegetic_artifact_generation` both need governing-context full bodies; `canon_addition` may have a different priority (e.g., the candidate CF's neighbors). Hardcoding a single priority would create cross-profile friction; a profile-keyed table preserves flexibility.
3. No backwards-compatibility aliasing/shims introduced. The `full_body_downgrades` field remains; under the new policy, fewer governing-context downgrades fire for `character_generation` and `diegetic_artifact_generation`, but other layers' downgrades continue to behave as before. Other profiles' allocation behavior is unchanged.

## Verification Layers

1. `character_generation` and `diegetic_artifact_generation` do not silently downgrade governing INV/M reserve bodies -> regression tests assert no governing INV/M downgrade entries on successful packets and assert `packet_incomplete_required_classes` with `missing_classes: ['governing_world_context.full_body']` when those bodies cannot fit.
2. Profile-keyed priority is honored at allocation -> codebase grep-proof: a `GOVERNING_FULL_BODY_PRIORITY_BY_TASK_TYPE` table in `tools/world-mcp/src/context-packet/shared.ts` keyed by `task_type` lists `character_generation` and `diegetic_artifact_generation` as governing-priority profiles.
3. Other profiles' allocation unchanged -> regression: existing `full-body-delivery.test.ts` cases for non-`character_generation` task_types continue to pass.
4. FOUNDATIONS alignment check: §Rule 7 (Preserve Mystery Deliberately) — Phase 7b firewall has either full-body access to every reserved M record in the packet or an explicit `packet_incomplete_required_classes` recovery path instead of body-preview-only operation.
5. Cross-skill SKILL prose update -> manual review that `character-generation/references/world-state-prerequisites.md` and `diegetic-artifact-generation/references/world-state-prerequisites.md` describe the reserve policy and fallback truthfully.

## Landed Changes

### 1. Added `GOVERNING_FULL_BODY_PRIORITY_BY_TASK_TYPE`

`tools/world-mcp/src/context-packet/shared.ts` now exports `GoverningFullBodyPriority`, `OPPORTUNISTIC_GOVERNING_FULL_BODY_PRIORITY`, and `GOVERNING_FULL_BODY_PRIORITY_BY_TASK_TYPE`. `character_generation` and `diegetic_artifact_generation` reserve governing invariant and Mystery Reserve full bodies; all other task types remain opportunistic.

### 2. Applied the priority in `full-body-delivery.ts`

`tools/world-mcp/src/context-packet/full-body-delivery.ts` now applies reserved governing bodies before opportunistic full-body allocation. Reserve-policy nodes are skipped by the normal downgrade path; opportunistic local/exact/governing candidates still downgrade node-by-node when they exceed budget.

### 3. Surfaced the per-profile priority in response telemetry

`task_header.governing_full_body_priority` is present on successful packet responses and on reserve-body insufficiency errors. Operators can see why governing invariant/Mystery Reserve bodies were delivered, or why the packet failed loudly instead of downgrading them.

### 4. Extended regression coverage

`tools/world-mcp/tests/context-packet/full-body-delivery.test.ts` covers reserve-before-opportunistic allocation, loud reserve-body insufficiency, and unchanged opportunistic behavior. `tools/world-mcp/tests/context-packet/erotica-world-fits.test.ts` now proves the live checkout either returns a bounded packet with zero governing INV/M downgrades or a structured `packet_incomplete_required_classes` error for reserved governing full bodies. Generic layer-drop tests that were not about reserve-policy behavior now use the `other` task type, and the SPEC-12 live-corpus integration test records the new 8000-budget reserve-policy outcome.

### 5. Documented the priority policy

`docs/CONTEXT-PACKET-CONTRACT.md`, `docs/MACHINE-FACING-LAYER.md`, `tools/world-mcp/README.md`, and the character/diegetic skill prerequisite references now document `governing_full_body_priority`, the reserve vs opportunistic semantics, and the loud failure path for Phase 7a/7b governing full bodies that cannot fit under the token or effective harness ceiling.

## Files to Touch

- `tools/world-mcp/src/context-packet/shared.ts` (modify — add `GOVERNING_FULL_BODY_PRIORITY_BY_TASK_TYPE` table + types)
- `tools/world-mcp/src/context-packet/full-body-delivery.ts` (modify — two-pass allocation honoring `'reserve'` policy)
- `tools/world-mcp/src/context-packet/assemble.ts` (modify — surface `task_header.governing_full_body_priority`)
- `tools/world-mcp/tests/context-packet/full-body-delivery.test.ts` (modify — `'reserve'` vs `'opportunistic'` allocation cases)
- `tools/world-mcp/tests/context-packet/erotica-world-fits.test.ts` (modify — assert no governing-context downgrades for `character_generation` and `diegetic_artifact_generation` profiles)
- `tools/world-mcp/tests/context-packet/budget-handling.test.ts` (modify — generic layer-drop proof now uses non-reserve task type)
- `tools/world-mcp/tests/context-packet/packet-budget.test.ts` (modify — generic budget proof now uses non-reserve task type)
- `tools/world-mcp/tests/context-packet/packet-class-filter.test.ts` (modify — tight reserve-profile budget updated to the truthful threshold)
- `tools/world-mcp/tests/context-packet/packet-drop-priority.test.ts` (modify — generic layer-drop proof now uses non-reserve task type)
- `tools/world-mcp/tests/context-packet/packet-truncation-summary.test.ts` (modify — generic truncation proof now uses non-reserve task type)
- `tools/world-mcp/tests/integration/spec12-live-corpus.test.ts` (modify — reserve-policy 8000-budget behavior)
- `docs/CONTEXT-PACKET-CONTRACT.md` (modify — priority policy docs)
- `docs/MACHINE-FACING-LAYER.md` (modify — telemetry docs)
- `tools/world-mcp/README.md` (modify — telemetry docs)
- `.claude/skills/character-generation/references/world-state-prerequisites.md` (modify — Phase-to-record mapping note about priority guarantee)
- `.claude/skills/diegetic-artifact-generation/references/world-state-prerequisites.md` (modify — Phase-to-record mapping note about priority guarantee)

## Out of Scope

- Adding new `task_type` profiles or changing the priority for existing profiles other than `character_generation` and `diegetic_artifact_generation` (separate effort; calibrate per-skill at next audit).
- Changing the layer-drop priority order (the existing `impact_surfaces → scoped_local_context → exact_record_links → governing_world_context` order is correct; this ticket only changes the WITHIN-governing-context full-body allocation).
- Adding a per-call client option to override the priority (env-var-only consistency with WMCP-005 §Out of Scope #4).
- Raising the default `token_budget` or default harness ceiling (the priority policy now fails loudly for `worlds/erotica-world` when the effective harness ceiling is too small; calibration belongs to a separate ticket).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm run build && node --test dist/tests/context-packet/full-body-delivery.test.js dist/tests/context-packet/erotica-world-fits.test.js` — proves the two-pass allocation honors `reserve` and `opportunistic` policies correctly and that live `worlds/erotica-world` does not silently downgrade governing full bodies.
2. `cd tools/world-mcp && npm test` — full package suite passes after updating same-seam tests for the reserve-policy contract.

### Invariants

1. After this ticket, `character_generation` and `diegetic_artifact_generation` packets return zero governing-context INV/M full-body downgrades: reserved governing full bodies are delivered when they fit, and otherwise the packet returns `packet_incomplete_required_classes`.
2. When the token budget or effective harness ceiling cannot accommodate all reserve nodes after lower-priority layers are dropped, the packet returns `packet_incomplete_required_classes` with `details.retry_with.token_budget`, `details.minimum_required_harness_ceiling_chars`, and `details.governing_full_body_priority` populated — silent downgrade of governing-context full bodies is structurally impossible.
3. `task_header.governing_full_body_priority` is always present on a successful packet response and matches the table for the requested `task_type`.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/context-packet/full-body-delivery.test.ts` — added cases: (a) `reserve`-policy node types are allocated first, (b) insufficient reserved governing bodies return `packet_incomplete_required_classes`, (c) `opportunistic` policy remains unchanged for non-reserve profiles.
2. `tools/world-mcp/tests/context-packet/erotica-world-fits.test.ts` — extended live-fit assertion that no governing-context downgrades fire for reserve-policy profiles; in this checkout the representative `erotica-world` call truthfully exercises the loud-failure path because the required serialized body exceeds the WMCP-011 effective harness ceiling.
3. Existing generic budget/drop/truncation tests — updated to use a non-reserve task type when testing generic layer-drop mechanics rather than Phase 7 reserve-policy behavior.

### Commands

1. `cd tools/world-mcp && node --test dist/tests/context-packet/full-body-delivery.test.js dist/tests/context-packet/erotica-world-fits.test.js` — targeted verification of the priority policy and the live checkout regression.
2. `cd tools/world-mcp && npm test` — full package proof.

## Outcome

Completion date: 2026-05-02.

Implemented WMCP-012 as a no-silent-downgrade reserve policy:

1. `character_generation` and `diegetic_artifact_generation` reserve governing-context invariant and Mystery Reserve full bodies before opportunistic full-body allocation.
2. `task_header.governing_full_body_priority` exposes the active policy.
3. Reserve-policy governing full bodies either survive allocation and layer enforcement or return `packet_incomplete_required_classes`; they are no longer silently downgraded into `truncation_summary.full_body_downgrades`.
4. Generic packet budget/drop/truncation tests now use non-reserve task types when they are testing layer mechanics rather than Phase 7 governing-body requirements.
5. Docs and skill prerequisite references now describe the reserve policy and the structured fallback.

## Verification Result

Passed:

1. `cd tools/world-mcp && npm run build`
2. `cd tools/world-mcp && node --test dist/tests/context-packet/full-body-delivery.test.js dist/tests/context-packet/erotica-world-fits.test.js`
3. `cd tools/world-mcp && npm run build && node --test dist/tests/context-packet/budget-handling.test.js dist/tests/context-packet/packet-budget.test.js dist/tests/context-packet/packet-class-filter.test.js dist/tests/context-packet/packet-drop-priority.test.js dist/tests/context-packet/packet-truncation-summary.test.js dist/tests/context-packet/full-body-delivery.test.js dist/tests/context-packet/erotica-world-fits.test.js`
4. `cd tools/world-mcp && node dist/tests/integration/spec12-live-corpus.test.js`
5. `cd tools/world-mcp && npm test` — passed with sandbox escalation; the sandboxed attempt failed because child-process tests hit `spawnSync node EPERM`.

Live checkout observation:

1. `worlds/erotica-world` at the documented `character_generation` request currently returns `packet_incomplete_required_classes` for `governing_world_context.full_body`, with `minimum_required_harness_ceiling_chars` about `69930` versus the WMCP-011 effective ceiling of `56000`. This is the intended loud-failure path and replaces the May 2 silent governing full-body downgrade.

Ignored package artifacts remain expected pre-existing/generated state: `tools/world-mcp/.secret`, `tools/world-mcp/dist/`, and `tools/world-mcp/node_modules/`.

## Deviations

- The draft claimed `worlds/erotica-world` would return zero governing-context downgrades inline at the documented defaults. Reassessment and proof showed the current effective harness ceiling cannot inline the required governing full bodies. The landed invariant is therefore zero silent governing downgrades: deliver reserved bodies when they fit, otherwise fail loudly with retry and ceiling metadata.
- The illustrative draft table included `canon_addition` as `reserve`, but the ticket's scope and out-of-scope text said only `character_generation` and `diegetic_artifact_generation` should change. `canon_addition` remains opportunistic.
- The first `npm test` attempt inside the sandbox failed on CLI child-process tests with `spawnSync node EPERM`; the escalated rerun passed.
