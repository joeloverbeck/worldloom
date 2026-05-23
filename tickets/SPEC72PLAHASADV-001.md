# SPEC72PLAHASADV-001: Hook 6 — deny → warn-only on page-plan and INDEX edits

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/hooks/src/hook6-guard-story-markdown-hash.ts`, `.claude/settings.json.example` Hook 6 commentary, `tools/hooks/tests/hook6-guard-story-markdown-hash.test.ts`. No impact on Hook 3 (engine-only `_source/*.yaml` guard) or any other PreToolUse hook.
**Deps**: None

## Problem

Hook 6 currently denies any `Edit`/`Write` to `pages-prose-plans/PG-*.md` or bundle `INDEX.md` when the on-disk body no longer matches the stamped `PG.plan.plan_hash` (`tools/hooks/src/hook6-guard-story-markdown-hash.ts:297` — `emitPermissionDecision("deny", buildDenyReason(result))`). This blocks editing a committed page plan outright, even though the page plan is per FOUNDATIONS §Story Bundles §4a (Plan-Authority Boundary) a *rendering* of committed state — not a second state engine. Plan/prose deviation is meant to be routed by `branching-story-prose-attach` (revise / repair / promote), not prevented by locking the plan bytes. Verified live on `red-bunny` PG-2: regenerating the plan post-commit caused Hook 6 to deny the rewrite, even though all content checks would have passed at prose-attach.

This ticket lands SPEC-72 §2.1: Hook 6 becomes non-blocking — it allows the write and surfaces the drift as a notice rather than a denial.

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

## What to Change

### 1. Hook 6 implementation — flip deny to allow-with-notice

Modify `tools/hooks/src/hook6-guard-story-markdown-hash.ts:297` to emit a non-blocking notice instead of a denial when the drift check fails. Two shapes are acceptable; implementer chooses based on user-visibility preference:

- **Shape A (preferred — surfaces the notice)**: `emitPermissionDecision("allow", buildDriftNotice(result))` where the reason text is the existing repair guidance, optionally re-worded to read as advisory ("Plan body has drifted from stamped `PG.plan.plan_hash`; the write is allowed because plan-hash enforcement is advisory per SPEC-72. To re-stamp: `node tools/world-mcp/dist/src/cli/compute-pg-hashes.js ...`. The PG-record itself remains the authoritative state — prose-attach's `hash_integrity` check will record the drift as a WARN, not a FAIL, when the receipt is emitted."). The `hookSpecificOutput.permissionDecisionReason` field surfaces in Claude's transcript and gives the user actionable context.
- **Shape B (silent allow)**: do not call `emitPermissionDecision` at all when the drift check fails; rely on the existing `logDecision("info", ...)` call to capture the drift in hook logs. Simpler but loses the user-facing notice. Discouraged unless SPEC-72's "log/surface a drift notice" wording is interpreted as log-only.

Whichever shape is chosen, update the `logDecision` call at lines 298-307 so the recorded `decision` field reflects warn semantics (e.g., `"warn"` or `"allow_with_notice"`) rather than `"deny"`. Optionally rename `buildDenyReason` (line 249) to `buildDriftNotice` for clarity; if renamed, update the test-suite assertions that match against the rendered prose accordingly.

### 2. `.claude/settings.json.example` Hook 6 commentary

Update the Hook 6 entry at lines 44-55: rewrite the `_purpose` field from *"Block direct Edit/Write to pages-prose-plans/PG-*.md and bundle INDEX.md when stamped PG.plan.plan_hash does not match on-disk plan-body SHA-256. Redirect to compute-pg-hashes re-stamping CLI."* to reflect the warn semantics, for example: *"Warn on direct Edit/Write to pages-prose-plans/PG-*.md and bundle INDEX.md when stamped PG.plan.plan_hash does not match on-disk plan-body SHA-256. The write proceeds (plan-hash enforcement is advisory per SPEC-72); the notice surfaces the drift and points at the compute-pg-hashes re-stamping CLI."* Preserve the `_spec: "SPEC-40 Hook 6"` annotation and add an inline marker that SPEC-72 narrowed the enforcement (e.g., add `_spec_amendment: "SPEC-72 narrowed deny → warn-only"`), so an auditor can reconstruct the historical change-of-stance chain.

### 3. Hook 6 test suite — rename `_blocks_` cases to `_warns_` / `_allows_with_notice_`

Modify `tools/hooks/tests/hook6-guard-story-markdown-hash.test.ts` two `hook6_blocks_*` cases:

- `hook6_blocks_pg_plan_write_when_hash_mismatches` (line 57) → rename to `hook6_warns_on_pg_plan_write_when_hash_mismatches` (or `hook6_allows_with_notice_on_pg_plan_write_when_hash_mismatches`). The test's setup (`seedPlan`, `seedPg`, `runHook`) is unchanged. The assertions flip:
  - `assert.match(result.stdout, /"permissionDecision":"deny"/)` → `assert.match(result.stdout, /"permissionDecision":"allow"/)` (Shape A) OR `assert.equal(result.stdout, "")` (Shape B).
  - `assert.match(result.stdout, /compute-pg-hashes\.js/)` stays for Shape A (the repair-CLI hint remains in the notice prose); drop for Shape B.
  - `assert.match(result.stdout, new RegExp(hash(nextBody)))` stays for Shape A; drop for Shape B.
- `hook6_blocks_index_update_when_referenced_plan_hash_mismatches` (line 119) → analogous rename + assertion flip.

The four `hook6_allows_*` pass-through cases (`hook6_allows_pg_plan_write_when_hash_matches` at line 81, `hook6_allows_pg_plan_first_write_when_no_pg_record_exists` at line 102, `hook6_allows_index_update_when_all_referenced_plan_hashes_match` at line 142, `hook6_allows_unrelated_markdown_writes` at line 166) stay unchanged — these test the pre-existing pass-through code paths Hook 6 still honors.

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

1. `npm test --prefix tools/hooks` — all hook tests pass after the two `hook6_blocks_*` cases are renamed and their assertions flipped to allow-with-notice.
2. Manual verification on `red-bunny` PG-2: regenerate `worlds/animalia/stories/red-bunny/pages-prose-plans/PG-2.md` post-commit, attempt to `Edit` it via Claude Code — Hook 6 surfaces a drift notice and the edit proceeds (no `permissionDecision: deny` blocks the write).
3. `npm run build --prefix tools/hooks` — TypeScript compiles cleanly (no signature drift between hook6 and `hook-io.ts`).

### Invariants

1. Hook 6 never emits `permissionDecision: "deny"` on `pages-prose-plans/PG-*.md` or bundle `INDEX.md` edits, regardless of drift state. The deny shape is removed from this hook entirely; any future re-introduction of deny semantics would require a new spec.
2. Hook 6 continues to ignore writes outside `worlds/<world>/stories/<story>/pages-prose-plans/PG-*.md` and `INDEX.md` (the `pages-prose/` directory, the `_source/` tree guarded by Hook 3, unrelated markdown) — the path-match scope at lines 274-291 is unchanged.
3. The drift detection logic at lines 192-247 (`checkPlanHash`, `checkReferencedPlans`, `extractPlanHash`, `computePlanHash`) is unchanged — only the response shape flips. A future implementer should be able to reinstate deny semantics in one line if SPEC-72 is ever retconned.

## Test Plan

### New/Modified Tests

1. `tools/hooks/tests/hook6-guard-story-markdown-hash.test.ts` — rename two `hook6_blocks_*` cases to `hook6_warns_*` / `hook6_allows_with_notice_*`; flip their `permissionDecision` assertions from `"deny"` to `"allow"` (Shape A) or to empty stdout (Shape B); preserve the four `hook6_allows_*` pass-through cases unchanged.

### Commands

1. `npm test --prefix tools/hooks` — targeted Hook 6 test verification.
2. `npm run build --prefix tools/hooks` — TypeScript build verification for the Hook 6 implementation change.
3. `grep -n "Block direct Edit" .claude/settings.json.example` — confirm the Hook 6 `_purpose` block-language wording is gone (should return zero matches in the Hook 6 entry).
