# SPEC30STOCONHAR-006: Mystery-Accretion Audit + Context-Packet — Read/Consume Path

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/branching-story-health-audit/SKILL.md` Phase 2 sub-check + `tools/world-mcp/src/context-packet/story-bundle-context.ts` (+ `shared.ts` type extension if needed)
**Deps**: SPEC30STOCONHAR-005

## Problem

With `evidence_records[]` landed on `unresolved_mystery_claims[]` (SPEC30STOCONHAR-005), the §Mystery Accretion rule at `docs/FOUNDATIONS.md:616` becomes deterministically auditable. This ticket lands the two consumers: (a) `branching-story-health-audit` Phase 2 Mystery-Accretion sub-check walking the branch page chain and flagging `mystery_accretion_overflow` when the cumulative evidence count or status escalation exceeds the M-record's policy, and (b) `tools/world-mcp/src/context-packet/story-bundle-context.ts` surfacing per-mystery `evidence_records` cross-references in story-bundle context-packet assembly so retrieval consumers see the accretion chain alongside the mystery claim.

## Assumption Reassessment (2026-05-15)

1. Verified `branching-story-health-audit/SKILL.md` has a Phase 2 with multiple sub-checks (2a Replay events, 2b Branch isolation, 2c Debt health, 2d Belief/visibility, 2e Mystery/canon safety, 2f Continuation/terminal proof, 2g Causal dependency, 2h Canon baseline drift). Mystery-Accretion is a natural extension of Phase 2e (Mystery / canon safety per FOUNDATIONS Rule 7 + shared contract §11).
2. Verified `tools/world-mcp/src/context-packet/story-bundle-context.ts` (371 lines) assembles story-bundle context summaries from indexed story records. It does not currently reference `unresolved_mystery_claims` or `evidence_records`; this ticket adds the new surface. The existing test file is `tools/world-mcp/tests/context-packet/story-bundle-context.test.ts`.
3. Cross-skill / cross-artifact boundary under audit: this ticket's two surfaces (audit + MCP) consume the new `evidence_records` field landed by ticket 005. Without 005's contract+schema+validator changes, both consumers have nothing to read; `Deps: SPEC30STOCONHAR-005` is explicit.
4. FOUNDATIONS principle under audit: Rule 7 (Preserve Mystery Deliberately) — the audit's `mystery_accretion_overflow` finding is the operationalization of FOUNDATIONS:616. The audit surface must NOT auto-resolve an M record; it must only flag cumulative-narrowing patterns. Severity is `error` for forbidden-resolution patterns and `warning` for soft accretion overflow per the M-record's policy.
5. HARD-GATE / Mystery Reserve firewall verification: this ticket adds a health-audit-only finding; the audit never mutates story state per skill contract. The Mystery Reserve firewall semantics are unchanged.
6. Schema extension classification: NOT a CF / Change Log / proposal-card / dossier / artifact schema extension; this is consumer-side reading of the `evidence_records` field landed in 005. The MCP context-packet surface may extend its TypeScript type (`ContextPacketStoryBundleContext` or sibling) to include per-mystery cross-references; the existing schema for the context packet is internal to `tools/world-mcp/`.

## Architecture Check

1. Placing the Mystery-Accretion sub-check inside Phase 2e (existing Mystery / canon safety) keeps related Rule 7 enforcement co-located in the audit prose. Alternative — a new top-level Phase — would scatter Rule 7 across two phases.
2. MCP rendering of `evidence_records` reuses the existing context-packet's per-record cross-reference shape; no new top-level field on the packet is introduced. The TypeScript type extension (if needed) is additive.
3. No backwards-compatibility shim: missing `evidence_records` on PG records is impossible because no production bundles exist — pre-production is the lowest-cost moment.

## Verification Layers

1. Audit replay → skill dry-run: a branch with three PGs each adding evidence to M-1 (`clue_added` → `clue_added` → `narrowed`) walks the chain deterministically and (when the M-record's `accretion_policy.max_clues` or equivalent threshold is exceeded) emits `mystery_accretion_overflow` with severity per the policy.
2. Audit finding format → codebase grep-proof: `grep -n "mystery_accretion_overflow" .claude/skills/branching-story-health-audit/SKILL.md` returns the new finding code in Phase 2 prose.
3. MCP surfacing → validator/test surface: `tools/world-mcp/tests/context-packet/story-bundle-context.test.ts` gains a test case asserting per-mystery `evidence_records` ids appear in the rendered context.
4. FOUNDATIONS alignment check: Rule 7 prose at `docs/FOUNDATIONS.md:616` is unchanged; this ticket operationalizes the existing rule.
5. The four layers are distinct (audit prose, audit replay surface, MCP rendering surface, FOUNDATIONS textual unchanged) — none collapses into a single generic "validation" check.

## What to Change

### 1. Health-audit Phase 2 Mystery-Accretion sub-check

In `.claude/skills/branching-story-health-audit/SKILL.md` Phase 2e (Mystery / canon safety), add a sub-section "Mystery Accretion" that:
- Walks every scoped branch's page chain in order.
- For each `M-<integer>` referenced in any PG's `unresolved_mystery_claims[]`, collects the cumulative `evidence_records[]` across the branch chain.
- Reads the corresponding world-level M-record's accretion policy (or default thresholds when absent: e.g., >4 cumulative evidence records OR ≥1 status escalation to `narrowed` / `apparent_resolution` / `held_for_promotion`).
- Emits `mystery_accretion_overflow` with severity `error` when the M-record's policy is `forbidden`-leaning; severity `warning` when the policy is soft. Finding includes the M-id, the branch path, the cumulative evidence ids, and the status progression cited.

Document the finding alongside Phase 2e's existing mystery-firewall findings so reviewers see the per-page firewall (existing) and the cross-page accretion (new) as one cluster.

### 2. MCP context-packet rendering

In `tools/world-mcp/src/context-packet/story-bundle-context.ts`, add a per-mystery rendering surface to the story-bundle context that lists, for each `unresolved_mystery_claims[]` entry on a referenced PG, the entry's `mystery_id`, current `authority` + `status`, and the full `evidence_records[]` id list. Surface naming follows the existing context-packet field-shape conventions in `tools/world-mcp/src/context-packet/shared.ts`.

If the `ContextPacketStoryBundleContext` / `ContextPacketStoryBundleContextSummary` TypeScript type needs extension to carry the per-mystery cross-references, add the typed property additively (existing consumers continue to compile against the new union).

## Files to Touch

- `.claude/skills/branching-story-health-audit/SKILL.md` (modify — Phase 2e Mystery-Accretion sub-check + new finding code `mystery_accretion_overflow`)
- `tools/world-mcp/src/context-packet/story-bundle-context.ts` (modify — per-mystery `evidence_records` rendering)
- `tools/world-mcp/src/context-packet/shared.ts` (modify — type extension if rendering surface requires a new typed field; touch only if needed)
- `tools/world-mcp/tests/context-packet/story-bundle-context.test.ts` (modify — new test case asserting per-mystery `evidence_records` surfacing)

## Out of Scope

- Schema-side or validator-side enforcement of `evidence_records` (ticket 005).
- Any new mystery-status value or authority level.
- Any change to canon-addition's adjudication of Mystery Reserve.
- Any change to the M-record schema or its accretion policy field shape (read-only consumer here).
- Auto-resolution of M-records by the audit (deliberately read-only; emit finding, never mutate).

## Acceptance Criteria

### Tests That Must Pass

1. `npm --prefix tools/world-mcp run build` succeeds (the context-packet TS compiles).
2. `npm --prefix tools/world-mcp run test` — context-packet tests pass; the new test case asserting per-mystery `evidence_records` surfacing returns the expected rendering.
3. `grep -n "mystery_accretion_overflow" .claude/skills/branching-story-health-audit/SKILL.md` returns the new finding code.
4. `grep -nE "Mystery Accretion|mystery_accretion" .claude/skills/branching-story-health-audit/SKILL.md` returns a Phase 2 sub-section heading + finding code.

### Invariants

1. The audit never mutates story state — Mystery-Accretion is read-only.
2. Mystery Reserve firewall semantics at FOUNDATIONS:616 are unchanged; this ticket operationalizes the existing rule.
3. The MCP context packet's TypeScript types are additively extended (no existing consumer needs migration).

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/context-packet/story-bundle-context.test.ts` — new test case using a fixture story bundle whose PG snapshots reference M-1 with accumulated `evidence_records`; assert the rendered context surfaces `mystery_id`, `authority`, `status`, and the full `evidence_records[]` id list.
2. `None` for the health-audit Phase 2 prose change — verification is grep-based + skill dry-run-based per the skill's own discipline; existing audit tests stay green.

### Commands

1. `npm --prefix tools/world-mcp run build && npm --prefix tools/world-mcp run test`
2. `grep -nE "mystery_accretion_overflow|Mystery Accretion" .claude/skills/branching-story-health-audit/SKILL.md`
3. The full `tools/world-mcp` `test` command is the correct boundary because the context-packet TS sits inside that package; the health-audit prose change exercises through skill dry-run (no validator surface).
