# SPEC-72 — Make `plan_hash` Advisory (Free Page-Plan Editing)

**Status:** DRAFT
**Date:** 2026-05-22
**Classification:** story-canon-related (governs Hook 6, the `branching-story-prose-attach` `hash_integrity` check, and the `PG.plan.plan_hash` enforcement semantics; does **not** alter the `state_hash` fork chain)
**Source:** in-chat hash-integrity audit + determination, 2026-05-22 (same brainstorm as SPEC-71).
**Depends on:** none for logic. Shares edit surfaces with **SPEC-71** (`branching-story-prose-attach/SKILL.md`, `prose-receipt.schema.json`/contract `§4.6`) — implement after SPEC-71 to avoid edit conflicts.
**Companion triage file:** N/A — not a report-triage flow; the originating in-chat determination is the decision record.

## 1. Context

`PG.plan.plan_hash` is `sha256` over the committed page-plan bytes. Two surfaces re-read the plan **file** and FAIL/block on drift:

- **Hook 6** (`tools/hooks/src/hook6-guard-story-markdown-hash.ts`, wired at `.claude/settings.json.example:52`) **DENIES** any `Edit`/`Write` to `pages-prose-plans/PG-*.md` or bundle `INDEX.md` when the body no longer matches the stamped `PG.plan.plan_hash`. Editing a committed page plan is therefore blocked outright.
- **`branching-story-prose-attach`** `hash_integrity` (Phase 2) recomputes `plan_hash` (and, via `compute-pg-hashes`, `state_hash`) from the current plan file and FAILs the receipt on drift.

This over-enforces a render input. Per FOUNDATIONS §Story Bundles §4a, the page plan is a *rendering* of committed state, not a second state engine — plan/prose deviation is meant to be **routed** by prose-attach (revise / repair / promote), not prevented by locking the plan bytes. Verified live: `red-bunny` PG-2's plan was regenerated post-commit, and prose-attach returned `verdict: FAIL` purely from `hash_integrity`, even though every content check and all three STCHAR authority checks passed.

Critically, the `state_hash` chain does **not** require the plan file: `snapshot_replay_equality` recomputes `state_hash` from the PG record's **stored** fields, never by re-reading the plan. So freeing plan editing needs no change to the `state_hash` payload — only the two file-re-reading surfaces are downgraded. The `compute-pg-hashes` CLI couples them (it overwrites the payload's `plan_hash` from `--plan` before computing `state_hash`); prose-attach must stop using that coupling for verdict purposes (§2.2).

## 2. Changes

### 2.1 Hook 6 → warn-only

Change Hook 6 from `emitPermissionDecision("deny", …)` to a non-blocking warning (allow the write, log/surface a drift notice) for both the `pages-prose-plans/PG-*.md` and `INDEX.md` cases. Update `.claude/settings.json.example` commentary and the Hook 6 test suite (`hook6_blocks_*` cases become `hook6_warns_*` / allow-with-notice).

### 2.2 prose-attach `hash_integrity` → split signal

Replace the single `plan_hash`+`state_hash` drift verdict with two independent signals:

- **`plan_hash` drift → WARN** (advisory). Recorded in the receipt `notes[]` as a breadcrumb; never drives `verdict: FAIL`; `repair_recommendation` for plan-only drift is `none` (advisory note), **not** `run_turn_cycle_repair`.
- **`state_hash` drift → FAIL** (PG-record tamper). `state_hash` is recomputed **from the committed PG record's own stored fields** (the `snapshot_replay_equality` basis — call `computePgStateHash` from `@worldloom/world-index/hash/content` directly on the parsed PG record; do **not** use the `compute-pg-hashes` CLI here, since the CLI re-reads the plan file and overwrites `plan.plan_hash` before computing `state_hash`, re-introducing the coupling this spec breaks). A mismatch means the committed PG was hand-edited — genuine corruption that stays a hard FAIL.

`PG.plan.plan_hash` remains stamped (an advisory breadcrumb that lets the receipt report "the plan body changed since commit"). The `accept_plan_drift` input becomes redundant (advisory is now the default) and is removed.

Structurally-invalid `plan_hash` (missing, placeholder, or non-sha256-shaped) is rejected at PG schema validation per `tools/validators/src/schemas/story-page.schema.json` (`plan_hash` is required with pattern `^[0-9a-f]{64}$`); prose-attach Phase 2 therefore sees only well-formed `plan_hash` values, whose drift is advisory per the rule above. No prose-attach branch handles plan_hash structural corruption — schema validation is the gate.

### 2.3 Contract + skill text

- `story-record-schemas.md §4.6`: update the `hash_integrity` field semantics — `PASS` when nothing drifted; `WARN` when only `plan_hash` drifted; `FAIL` only on `state_hash` drift or a missing/placeholder/non-sha256 `state_hash`.
- `story-record-schemas.md §4.2a` (Tooling paragraph at line 157): narrow the mandate so the `compute-pg-hashes` CLI is required only for PG-**authoring** skills (`branching-story-bootstrap` Phase 7, `branching-story-turn-cycle` Phase 9). Carve out `branching-story-prose-attach` Phase 2: it now recomputes `state_hash` via `computePgStateHash` from `@worldloom/world-index/hash/content` directly on the PG record's parsed contents (the `snapshot_replay_equality` basis). The CLI's plan-file→state-hash coupling is exactly the over-enforcement §2.2 removes, so the "PG-verifying" use of the CLI no longer holds — update the explanatory rationale accordingly.
- `branching-story-prose-attach/SKILL.md`: Phase 2 (split computation, drop the plan-file `state_hash` derivation), Phase 5 repair table (plan_hash drift → advisory, not `run_turn_cycle_repair`), and the HARD-GATE/`accept_plan_drift` references.
- `story-page.schema.json`: **unchanged** (`plan_hash` stays required-and-stamped).

## 3. Out of scope

- Removing `plan_hash` from `PG` or from the `state_hash` payload (the rejected "remove entirely" option — would force a `snapshot_replay_equality` discontinuity clause).
- Job-B STCHAR/packet hashes — **SPEC-71**.
- `state_hash` / `state_hash_parent` chain and `snapshot_replay_equality` — untouched.

## 4. FOUNDATIONS Alignment

| Principle | Stance | Rationale |
|---|---|---|
| §Story Bundles §4a (Plan-Authority Boundary) | aligns | Treats the page plan as a render input whose deviation is *routed*, not *blocked*; stops a render-surface edit from cascading into a fork-integrity FAIL. |
| §Story Bundles §5b (Schema-Minimalism) | aligns | Keeps the one useful breadcrumb (`plan_hash`) while removing the redundant `accept_plan_drift` toggle and over-enforcement. |
| Rule 6 (No Silent Retcons) | N/A | No canon mutation; PG-record tamper detection (the `state_hash` FAIL) is strengthened, not weakened, by decoupling it from the plan file. |

## 5. Acceptance criteria

1. Editing a committed `pages-prose-plans/PG-*.md` is no longer denied by Hook 6 (it warns and allows).
2. prose-attach on a page whose plan was edited post-commit yields `hash_integrity: WARN` (plan drift) with `verdict` driven only by the content/STCHAR checks — not an automatic `FAIL`.
3. Hand-editing a committed `PG` record's state fields still produces `hash_integrity: FAIL` (PG tamper retained).
4. Re-running prose-attach on `red-bunny` PG-2 (plan regenerated post-commit) now returns `WARN`/`PASS` rather than `FAIL`.
5. `snapshot_replay_equality` behavior and the `state_hash` chain are byte-identical to pre-spec; `tools/` build + test suites green.

## 6. Test plan

- Hook 6: warn-not-deny fixtures for plan-edit and INDEX-edit; allow-with-notice on mismatch; first-write (no PG) still allowed.
- prose-attach: plan-only drift → WARN + advisory `notes[]` + `repair_recommendation: none`; PG-record tamper → `state_hash` FAIL; clean page → PASS.
- `compute-pg-hashes` CLI behavior unchanged: bootstrap Phase 7 and turn-cycle Phase 9 still produce coupled (`plan_hash`, `state_hash`) pairs from `--plan` + `--pg` inputs; no CLI source or test edits.
- Regression: the live `red-bunny` PG-2 case attaches at WARN/PASS.
