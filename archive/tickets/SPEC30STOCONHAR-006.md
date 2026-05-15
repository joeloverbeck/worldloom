# SPEC30STOCONHAR-006: Mystery-Accretion Audit + Context-Packet — Read/Consume Path

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/branching-story-health-audit/SKILL.md` Phase 2 sub-check + `tools/world-mcp` context-packet type/rendering/test coverage + same-seam docs/spec truthing
**Deps**: archive/tickets/SPEC30STOCONHAR-005.md

## Problem

With `evidence_records[]` landed on `unresolved_mystery_claims[]` (`archive/tickets/SPEC30STOCONHAR-005.md`), the §Mystery Accretion rule at `docs/FOUNDATIONS.md:616` became deterministically auditable. This ticket landed the two consumers: (a) `branching-story-health-audit` Phase 2 Mystery-Accretion sub-check walking the branch page chain and flagging `mystery_accretion_overflow` when the cumulative evidence count or status escalation exceeds the M-record's policy, and (b) `tools/world-mcp/src/context-packet/story-bundle-context.ts` surfacing per-mystery `evidence_records` cross-references in story-bundle context-packet assembly so retrieval consumers see the accretion chain alongside the mystery claim.

## Assumption Reassessment (2026-05-15)

1. Verified `branching-story-health-audit/SKILL.md` has a Phase 2 with multiple sub-checks (2a Replay events, 2b Branch isolation, 2c Debt health, 2d Belief/visibility, 2e Mystery/canon safety, 2f Continuation/terminal proof, 2g Causal dependency, 2h Canon baseline drift). Mystery-Accretion is a natural extension of Phase 2e (Mystery / canon safety per FOUNDATIONS Rule 7 + shared contract §11).
2. At intake, verified `tools/world-mcp/src/context-packet/story-bundle-context.ts` assembled story-bundle context summaries from indexed story records without referencing `unresolved_mystery_claims` or `evidence_records`. This ticket added that surface. The existing test file is `tools/world-mcp/tests/context-packet/story-bundle-context.test.ts`.
3. Cross-skill / cross-artifact boundary under audit: this ticket's two surfaces (audit + MCP) consume the new `evidence_records` field landed by ticket 005. Without 005's contract+schema+validator changes, both consumers have nothing to read; `Deps: archive/tickets/SPEC30STOCONHAR-005.md` is explicit.
4. FOUNDATIONS principle under audit: Rule 7 (Preserve Mystery Deliberately) — the audit's `mystery_accretion_overflow` finding is the operationalization of FOUNDATIONS:616. The audit surface must NOT auto-resolve an M record; it must only flag cumulative-narrowing patterns. Severity is `error` for forbidden-resolution patterns and `warning` for soft accretion overflow per the M-record's policy.
5. HARD-GATE / Mystery Reserve firewall verification: this ticket adds a health-audit-only finding; the audit never mutates story state per skill contract. The Mystery Reserve firewall semantics are unchanged.
6. Schema extension classification: NOT a CF / Change Log / proposal-card / dossier / artifact schema extension; this is consumer-side reading of the `evidence_records` field landed in 005. The MCP context-packet surface may extend its TypeScript type (`ContextPacketStoryBundleContext` or sibling) to include per-mystery cross-references; the existing schema for the context packet is internal to `tools/world-mcp/`.
7. At intake, `.claude/skills/branching-story-health-audit/SKILL.md` already had a generic `mystery_accretion_resolved` finding in Phase 2e, but it did not name the `evidence_records[]` chain, threshold/status-escalation overflow rule, or `mystery_accretion_overflow` code required by this ticket. This ticket replaced that prose in place; it did not add an executable validator.
8. Package proof baseline: from `tools/world-mcp`, pre-edit `npm test` builds successfully but exits red because `dist/tests/context-packet/erotica-world-fits.test.js` expects `packet_incomplete_required_classes` while the local gitignored erotica-world index returns `index_version_mismatch`. The active acceptance boundary is therefore `npm run build` plus the focused compiled context-packet test file; the broad package wrapper remains contextual baseline noise unless the owned focused lane fails.
9. Health-audit proof substitution: no executable skill dry-run runner is present in the repo for `.claude/skills/branching-story-health-audit/SKILL.md`; verification is manual review of Phase 2e plus grep proof for the new finding code/heading.
10. Same-seam docs/spec truthing: `docs/CONTEXT-PACKET-CONTRACT.md` enumerates `story_bundle_context` contents and `archive/specs/SPEC-30-story-contract-hardening-ii.md` had a D5 note from before ticket 006 landed. Both were updated. `tools/world-mcp/README.md` mentions story-bundle context at a high level without enumerating this field shape, so no README edit was required.

## Architecture Check

1. Placing the Mystery-Accretion sub-check inside Phase 2e (existing Mystery / canon safety) keeps related Rule 7 enforcement co-located in the audit prose. Alternative — a new top-level Phase — would scatter Rule 7 across two phases.
2. MCP rendering of `evidence_records` reuses the existing context-packet's per-record cross-reference shape; no new top-level field on the packet is introduced. The TypeScript type extension is additive.
3. No backwards-compatibility shim: missing `evidence_records` on PG records is impossible because no production bundles exist — pre-production is the lowest-cost moment.

## Verification Layers

1. Audit replay prescription → manual review: Phase 2e directs the audit to walk each branch page chain, accumulate `evidence_records[]`, compare status progression / cumulative evidence to the M-record policy or defaults, and emit `mystery_accretion_overflow` with severity per the policy.
2. Audit finding format → codebase grep-proof: `grep -n "mystery_accretion_overflow" .claude/skills/branching-story-health-audit/SKILL.md` returns the new finding code in Phase 2 prose.
3. MCP surfacing → package test surface: `tools/world-mcp/tests/context-packet/story-bundle-context.test.ts` gains a test case asserting per-mystery `evidence_records` ids appear in the rendered context.
4. FOUNDATIONS alignment check: Rule 7 prose at `docs/FOUNDATIONS.md:616` is unchanged; this ticket operationalizes the existing rule.
5. The four layers are distinct (audit prose, audit replay surface, MCP rendering surface, FOUNDATIONS textual unchanged) — none collapses into a single generic "validation" check.

## Landed Changes

### 1. Health-audit Phase 2 Mystery-Accretion sub-check

`.claude/skills/branching-story-health-audit/SKILL.md` Phase 2e (Mystery / canon safety) now has a "Mystery Accretion" sub-check that:
- Walks every scoped branch's page chain in order.
- For each `M-<integer>` referenced in any PG's `unresolved_mystery_claims[]`, collects the cumulative `evidence_records[]` across the branch chain.
- Reads the corresponding world-level M-record's accretion policy (or default thresholds when absent: e.g., >4 cumulative evidence records OR ≥1 status escalation to `narrowed` / `apparent_resolution` / `held_for_promotion`).
- Emits `mystery_accretion_overflow` with severity `error` when the M-record's policy is `forbidden`-leaning; severity `warning` when the policy is soft. The finding includes the M-id, the branch path, the cumulative evidence ids, and the status progression cited.

The finding lives alongside Phase 2e's existing mystery-firewall findings so reviewers see the per-page firewall and the cross-page accretion as one cluster.

### 2. MCP context-packet rendering

`tools/world-mcp/src/context-packet/story-bundle-context.ts` now builds `mystery_evidence_chains` from indexed PG snapshots. The field groups claims by `mystery_id`; each claim records `page_id`, `authority`, `status`, and the full `evidence_records[]` id list.

`ContextPacketStoryBundleContext` was extended additively in `tools/world-mcp/src/context-packet/shared.ts`; `ContextPacketStoryBundleContextSummary` was left unchanged because the evidence-chain detail belongs in the full story-bundle context, not the persisted summary.

## Files to Touch

- `.claude/skills/branching-story-health-audit/SKILL.md` (modify — Phase 2e Mystery-Accretion sub-check + new finding code `mystery_accretion_overflow`)
- `tools/world-mcp/src/context-packet/story-bundle-context.ts` (modify — per-mystery `evidence_records` rendering)
- `tools/world-mcp/src/context-packet/shared.ts` (modify — additive `mystery_evidence_chains` type field)
- `tools/world-mcp/tests/context-packet/story-bundle-context.test.ts` (modify — new test case asserting per-mystery `evidence_records` surfacing)
- `tools/world-mcp/tests/tools/story-bundle-fixture.ts` (modify — fixture PG snapshot with `unresolved_mystery_claims[].evidence_records[]`)
- `docs/CONTEXT-PACKET-CONTRACT.md` (modify — story-bundle context contents list)
- `archive/specs/SPEC-30-story-contract-hardening-ii.md` (modify — implementation note for ticket 006)

## Out of Scope

- Schema-side or validator-side enforcement of `evidence_records` (ticket 005).
- Any new mystery-status value or authority level.
- Any change to canon-addition's adjudication of Mystery Reserve.
- Any change to the M-record schema or its accretion policy field shape (read-only consumer here).
- Auto-resolution of M-records by the audit (deliberately read-only; emit finding, never mutate).

## Acceptance Criteria

### Tests That Must Pass

1. From `tools/world-mcp`, `npm run build` succeeds (the context-packet TS compiles).
2. From `tools/world-mcp`, `node --test dist/tests/context-packet/story-bundle-context.test.js` passes; the new test case asserting per-mystery `evidence_records` surfacing returns the expected rendering.
3. `grep -n "mystery_accretion_overflow" .claude/skills/branching-story-health-audit/SKILL.md` returns the new finding code.
4. `grep -nE "Mystery Accretion|mystery_accretion" .claude/skills/branching-story-health-audit/SKILL.md` returns a Phase 2 sub-section heading + finding code.

### Invariants

1. The audit never mutates story state — Mystery-Accretion is read-only.
2. Mystery Reserve firewall semantics at FOUNDATIONS:616 are unchanged; this ticket operationalizes the existing rule.
3. The MCP context packet's TypeScript types are additively extended (no existing consumer needs migration).

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/context-packet/story-bundle-context.test.ts` — new test case using a fixture story bundle whose PG snapshots reference M-1 with accumulated `evidence_records`; assert the rendered context surfaces `mystery_id`, `authority`, `status`, and the full `evidence_records[]` id list.
2. `None` for the health-audit Phase 2 prose change — verification is grep-based plus manual review because no executable skill dry-run runner exists in this repo.

### Commands

1. From `tools/world-mcp`: `npm run build`
2. From `tools/world-mcp`: `node --test dist/tests/context-packet/story-bundle-context.test.js`
3. From repo root: `grep -nE "mystery_accretion_overflow|Mystery Accretion" .claude/skills/branching-story-health-audit/SKILL.md`
4. Focused compiled context-packet proof is the correct package boundary because pre-edit `npm test` is red on checkout-local gitignored index freshness, while this ticket changes only context-packet assembly and a prose audit prescription.

## Outcome

Completed. Health-audit Phase 2e now prescribes `mystery_accretion_overflow` from ordered PG mystery-claim evidence chains and status progression, without changing audit write surfaces or Mystery Reserve resolution semantics. `tools/world-mcp` story-bundle context packets now include `mystery_evidence_chains`, populated from indexed PG `state_snapshot.unresolved_mystery_claims[]` entries and covered by the existing context-packet fixture/test. `docs/CONTEXT-PACKET-CONTRACT.md` and SPEC-30 now reflect the landed read/consume surface.

## Verification Result

1. Pre-edit baseline: from `tools/world-mcp`, `npm test` built successfully but exited red on the existing `dist/tests/context-packet/erotica-world-fits.test.js` assertion: actual `index_version_mismatch`, expected `packet_incomplete_required_classes`.
2. Post-change build: from `tools/world-mcp`, `npm run build` passed.
3. Focused context-packet proof: from `tools/world-mcp`, `node --test dist/tests/context-packet/story-bundle-context.test.js` passed 3 tests.
4. Broad package wrapper after the change: from `tools/world-mcp`, `npm test` remained red on the same `erotica-world` `index_version_mismatch` assertion; 355 tests passed and 1 failed.
5. Grep proof: `grep -nE "mystery_accretion_overflow|Mystery Accretion" .claude/skills/branching-story-health-audit/SKILL.md` returned the Phase 2e heading and finding code.
6. Manual review: Phase 2e remains read-only and only emits findings; the HARD-GATE block and write approval sequence were not changed. `docs/FOUNDATIONS.md` Rule 7 / Mystery Accretion text remains unchanged.

## Deviations

1. The drafted health-audit "skill dry-run" proof was replaced with manual review plus grep proof because the repo has no executable runner for `.claude/skills/branching-story-health-audit/SKILL.md`.
2. The drafted broad `tools/world-mcp` `test` acceptance gate was narrowed after a pre-edit baseline showed an unrelated checkout-local gitignored erotica-world index freshness failure. The focused compiled context-packet test proves the owned MCP packet invariant.
3. `ContextPacketStoryBundleContextSummary` was not extended; the full `story_bundle_context` carries the evidence-chain detail, while persisted summaries keep their existing compact id-only shape.
4. Pre-existing ignored package artifacts under `tools/world-mcp/.secret`, `tools/world-mcp/dist/`, and `tools/world-mcp/node_modules/` were present at intake. `dist/` was refreshed by build/test commands; `.secret` and `node_modules/` were left in place.
