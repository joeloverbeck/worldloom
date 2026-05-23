# SPEC72PLAHASADV-001: Hook 6 — deny → warn-only on page-plan and INDEX edits

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/hooks/src/hook6-guard-story-markdown-hash.ts`, `.claude/settings.json.example` Hook 6 commentary, `tools/hooks/tests/hook6-guard-story-markdown-hash.test.ts`. No impact on Hook 3 (engine-only `_source/*.yaml` guard) or any other PreToolUse hook.
**Deps**: None

## Problem

At intake, Hook 6 denied any `Edit`/`Write` to `pages-prose-plans/PG-*.md` or bundle `INDEX.md` when the on-disk body no longer matched the stamped `PG.plan.plan_hash` (`tools/hooks/src/hook6-guard-story-markdown-hash.ts` — the drift branch emitted `permissionDecision: "deny"`). This blocked editing a committed page plan outright, even though the page plan is per FOUNDATIONS §Story Bundles §4a (Plan-Authority Boundary) a *rendering* of committed state — not a second state engine. Plan/prose deviation is meant to be routed by `branching-story-prose-attach` (revise / repair / promote), not prevented by locking the plan bytes. Historical SPEC-72 evidence named `red-bunny` PG-2 as the motivating case: regenerating the plan post-commit caused Hook 6 to deny the rewrite, even though all content checks would have passed at prose-attach.

This ticket lands SPEC-72 §2.1: Hook 6 is non-blocking — it allows the write and surfaces the drift as a notice rather than a denial.

## Assumption Reassessment (2026-05-23)

1. Hook 6's deny path lives at `tools/hooks/src/hook6-guard-story-markdown-hash.ts:297` (`emitPermissionDecision("deny", buildDenyReason(result))`). The hook fires for both `pages-prose-plans/<page-id>.md` writes (line 280-288 — plan-file match path) and bundle `INDEX.md` writes (line 289-291 — INDEX referenced-plans path). The `buildDenyReason` helper at line 249-259 composes a multi-line repair message; under warn-only semantics this prose stays useful as the drift notice but the decision flips to `allow`. Hook 6's test suite at `tools/hooks/tests/hook6-guard-story-markdown-hash.test.ts` has two `hook6_blocks_*` cases (`hook6_blocks_pg_plan_write_when_hash_mismatches` at line 57; `hook6_blocks_index_update_when_referenced_plan_hash_mismatches` at line 119) plus four `hook6_allows_*` pass-through cases that stay unchanged.
2. SPEC-72 §2.1 prescribes the change. `.claude/settings.json.example:32-55` wires Hook 6 with `_purpose: "Block direct Edit/Write to pages-prose-plans/PG-*.md and bundle INDEX.md when stamped PG.plan.plan_hash does not match on-disk plan-body SHA-256. Redirect to compute-pg-hashes re-stamping CLI."` — the `_purpose` commentary needs to be updated to reflect warn-not-block semantics. Hook 6 was originally introduced by SPEC-40 per the `_spec: "SPEC-40 Hook 6"` annotation; SPEC-72 narrows that prior enforcement without removing the wiring or the hook file itself.
3. Cross-skill boundary: Hook 6 and `branching-story-prose-attach` both react to the same plan_hash drift signal — Hook 6 at file-edit time, prose-attach at receipt-emit time. The shared boundary is the `PG.plan.plan_hash` stamp authority documented in `.claude/skills/_shared-templates/story-record-schemas.md` §4.6 and §4.2a. This ticket softens Hook 6's reaction (deny → warn); SPEC72PLAHASADV-003 lands prose-attach's analogous softening (FAIL → WARN) for plan-only drift. The two changes are independent in code (different files, different test suites) but share the conceptual drift-signal contract that SPEC72PLAHASADV-002 updates in the shared contract.
4. FOUNDATIONS §Story Bundles §4a (Plan-Authority Boundary) is the load-bearing principle: "Story state is authoritative at page-plan commit. Rendered prose is a rendering of that state, not a second state engine. ... Prose deviating from plan is routed by `branching-story-prose-attach` as either a prose-quality issue (revise prose), a structural-fact issue (run a repair turn), or a canon-candidate (run promotion)." Hook 6's current deny shape over-enforces this boundary by treating the plan file itself as committed state; SPEC-72 §1 Context names this directly. The warn shape preserves the drift signal as audit-trail evidence without blocking the lawful routes §4a enumerates.
5. HARD-GATE / Canon Safety: Hook 6 lives under `tools/hooks/` per the per-ticket-type granularity rule (modifications to hooks under `tools/hooks/` fire item 5). The narrowing from `deny` to `allow` weakens Hook 6's enforcement strictness, but does NOT weaken any canon-write gate — Hook 6 guards story-bundle markdown editing (`pages-prose-plans/`, bundle `INDEX.md`), NOT engine-only canon writes (`_source/*.yaml`, which Hook 3 still guards with `deny`). The `PG.state_hash` chain remains untouched per SPEC-72 §3 Out of scope. Mystery Reserve firewall is unaffected — Hook 6 has no MR-aware logic.

## Architecture Check

1. The `hook-io.ts` `emitPermissionDecision` API (lines 68-81) supports `"allow" | "deny" | "ask"` decisions; emitting `"allow"` with a descriptive `permissionDecisionReason` is the canonical Claude-Code hook shape for "let the action proceed but surface a notice to the user." The existing `buildDenyReason` prose composes a useful notice (drift detection, repair-CLI invocation hint, patch-engine routing reminder) that remains relevant under warn semantics — keep the prose, flip the decision token, optionally rename the helper to `buildDriftNotice` for clarity. The `logDecision("info", ...)` call (line 298-307) stays in place to preserve audit-trail logging; consider flipping the recorded `decision` field from `"deny"` to `"warn"` (or `"allow_with_notice"`) so log analysis can distinguish historical denials from advisory notices.
2. No backwards-compatibility aliasing/shims: the deny decision is replaced outright with allow-plus-notice. There is no `WORLDLOOM_HOOK6_DENY_LEGACY` env-var fallback or similar; SPEC-72 §1 Context explicitly identifies the deny shape as over-enforcement, and per CLAUDE.md §Core Rules and the project's "no backcompat shims" discipline the legacy behavior is replaced rather than gated.

## Verification Layers

1. Hook 6 emits `permissionDecision: "allow"` (or no permissionDecision and exit 0) instead of `"deny"` when the on-disk plan bytes mismatch the stamped `PG.plan.plan_hash` → `tools/hooks/tests/hook6-guard-story-markdown-hash.test.ts` test-suite assertion: the converted `hook6_warns_*` cases assert `permissionDecision: "allow"` (with reason text containing the drift notice) instead of `permissionDecision: "deny"`.
2. Hook 6's existing pass-through behavior remains intact (no PG record → allow; matching hash → allow; unrelated markdown writes → allow) → the four pre-existing `hook6_allows_*` test cases continue to pass unchanged.
3. `.claude/settings.json.example` Hook 6 `_purpose` commentary accurately describes the new warn shape → grep-proof: `grep -n "Block direct Edit" .claude/settings.json.example` returns zero matches for the Hook 6 entry post-edit; `grep -n "warn\|advisory\|allow with notice" .claude/settings.json.example` returns ≥1 match in the Hook 6 entry.
4. The `tools/` build + test suites remain green → `npm test --prefix tools/hooks` passes (acceptance criterion #5 partial).

## Landed Changes

### 1. Hook 6 implementation — flipped deny to allow-with-notice

Modified `tools/hooks/src/hook6-guard-story-markdown-hash.ts` to emit a non-blocking notice instead of a denial when the drift check fails. This implementation uses Shape A: `emitPermissionDecision("allow", buildDriftNotice(result))`.

The helper was renamed from `buildDenyReason` to `buildDriftNotice`; the notice says the write is allowed, plan-hash enforcement is advisory per SPEC-72, prose-attach records plan-only drift as WARN, and any PG record update still routes through patch-engine approval. The `logDecision` payload now records `decision: "allow_with_notice"`.

### 2. `.claude/settings.json.example` Hook 6 commentary

Updated the Hook 6 `_purpose` field to describe warn semantics and added `_spec_amendment: "SPEC-72 narrowed deny to warn-only"` while preserving `_spec: "SPEC-40 Hook 6"`.

### 3. Hook 6 test suite — renamed `_blocks_` cases to `_warns_`

Modified the two `hook6_blocks_*` mismatch cases:

- `hook6_warns_on_pg_plan_write_when_hash_mismatches`
- `hook6_warns_on_index_update_when_referenced_plan_hash_mismatches`

Both now assert `permissionDecision: "allow"`, the SPEC-72 advisory notice text, and the surviving `compute-pg-hashes.js` hint. The four `hook6_allows_*` pass-through cases stayed unchanged.

## Files to Touch

- `tools/hooks/src/hook6-guard-story-markdown-hash.ts` (modify) — flip deny → allow-with-notice at line 297; update `logDecision` `decision` field at lines 298-307; optionally rename `buildDenyReason` (line 249).
- `.claude/settings.json.example` (modify) — rewrite Hook 6 `_purpose` field at lines 44-55 to reflect warn semantics; add SPEC-72 amendment marker.
- `tools/hooks/tests/hook6-guard-story-markdown-hash.test.ts` (modify) — rename the two `hook6_blocks_*` cases and flip their assertions; the four `hook6_allows_*` cases stay unchanged.

## Out of Scope

- `branching-story-prose-attach` SKILL.md changes (split-signal `hash_integrity`, `accept_plan_drift` removal, Phase 5 repair-table updates) — those land in SPEC72PLAHASADV-003.
- Shared contract updates to `.claude/skills/_shared-templates/story-record-schemas.md` (§4.6 hash_integrity semantics, §4.2a Tooling paragraph) — those land in SPEC72PLAHASADV-002.
- Removing the `compute-pg-hashes` CLI's plan-file→state-hash coupling — SPEC-72 §3 Out of scope explicitly preserves the CLI's authoring-time behavior; the CLI continues to be used by `branching-story-bootstrap` Phase 7 and `branching-story-turn-cycle` Phase 9 with the coupling intact. Only prose-attach Phase 2's use of the CLI changes (in SPEC72PLAHASADV-003).
- Hook 3 / Hook 2 / any other PreToolUse hook — unaffected. Hook 6 is the only file-bytes hash-guard hook in the pipeline.
- The `PG.state_hash` chain and `snapshot_replay_equality` — SPEC-72 §3 Out of scope; Hook 6 does not touch state_hash logic.

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/hooks` — all hook tests pass after the two `hook6_blocks_*` cases were renamed and their assertions flipped to allow-with-notice.
2. `npm run build --prefix tools/hooks` — TypeScript compiles cleanly (no signature drift between hook6 and `hook-io.ts`).
3. Manual Claude Code verification on `red-bunny` PG-2 was not run in this Codex session; the compiled Hook 6 tests exercise the same `Edit` and `Write` hook decision path with seeded drift fixtures.

### Invariants

1. Hook 6 never emits `permissionDecision: "deny"` on `pages-prose-plans/PG-*.md` or bundle `INDEX.md` edits, regardless of drift state. The deny shape is removed from this hook entirely; any future re-introduction of deny semantics would require a new spec.
2. Hook 6 continues to ignore writes outside `worlds/<world>/stories/<story>/pages-prose-plans/PG-*.md` and `INDEX.md` (the `pages-prose/` directory, the `_source/` tree guarded by Hook 3, unrelated markdown) — the path-match scope at lines 274-291 is unchanged.
3. The drift detection logic at lines 192-247 (`checkPlanHash`, `checkReferencedPlans`, `extractPlanHash`, `computePlanHash`) is unchanged — only the response shape flips. A future implementer should be able to reinstate deny semantics in one line if SPEC-72 is ever retconned.

## Test Plan

### New/Modified Tests

1. `tools/hooks/tests/hook6-guard-story-markdown-hash.test.ts` — renamed two `hook6_blocks_*` cases to `hook6_warns_*`; flipped their `permissionDecision` assertions from `"deny"` to `"allow"`; preserved the four `hook6_allows_*` pass-through cases unchanged.

### Commands

1. `npm test --prefix tools/hooks` — targeted Hook 6 test verification.
2. `npm run build --prefix tools/hooks` — TypeScript build verification for the Hook 6 implementation change.
3. `awk '/"_spec": "SPEC-40 Hook 6"/,/]/' .claude/settings.json.example | grep -n "Block direct Edit"` — confirm the Hook 6 `_purpose` block-language wording is gone (returns zero matches in the Hook 6 entry; Hook 3 still legitimately uses "Block direct Edit" for `_source` writes).

## Outcome

Completed: 2026-05-23

Hook 6 now allows page-plan and bundle `INDEX.md` writes when the stamped `PG.plan.plan_hash` is drifted, while surfacing a user-visible advisory notice. The notice preserves the re-stamping CLI hint and the patch-engine routing reminder for any PG record update. Hook logs now classify this branch as `allow_with_notice` instead of `deny`.

The Hook 6 settings example now describes the warning behavior and records SPEC-72 as the amendment that narrowed SPEC-40 Hook 6 from deny to warn-only. The two Hook 6 mismatch tests were renamed from `hook6_blocks_*` to `hook6_warns_*` and assert the allow-with-notice output. No Hook 3 behavior, `_source` write gate, `PG.state_hash` logic, prose-attach behavior, shared contract wording, or world content changed in this ticket.

## Verification Result

1. `npm run build --prefix tools/hooks` — PASS. TypeScript compiled Hook 6 and its tests.
2. `npm test --prefix tools/hooks` — PASS. 28/28 hook tests passed, including both renamed Hook 6 warn tests and existing Hook 3 denial tests.
3. `awk '/"_spec": "SPEC-40 Hook 6"/,/]/' .claude/settings.json.example | grep -n "Block direct Edit"` — PASS by expected no-match exit. The Hook 6 settings block no longer uses block-language wording.
4. `rg -n 'hook6_blocks|permissionDecision":"deny|buildDenyReason|decision: "deny"' tools/hooks/src/hook6-guard-story-markdown-hash.ts tools/hooks/tests/hook6-guard-story-markdown-hash.test.ts .claude/settings.json.example` — PASS by expected no-match exit. The Hook 6 source/test/settings surfaces no longer carry the old deny/test-helper anchors.

## Deviations

- The manual Claude Code `red-bunny` PG-2 exercise was not run from Codex. The accepted proof is the compiled Hook 6 test fixture path, which invokes the same hook binary with representative `Edit` and `Write` payloads and seeded plan-hash drift.
- The drafted settings grep `grep -n "Block direct Edit" .claude/settings.json.example` was narrowed to the Hook 6 block because Hook 3 still legitimately says "Block direct Edit" for engine-only `_source` writes.
