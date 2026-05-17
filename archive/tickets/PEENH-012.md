# PEENH-012: Add recovery-hint `detail` clause to `approval_replayed` engine return (PEENH-003 follow-up)

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `tools/patch-engine/src/approval/verify-token.ts` (adds `APPROVAL_TOKEN_REPLAY_HINT` + `approvalReplayed()` parallel to the existing `APPROVAL_TOKEN_RECOVERY_HINT` + `approvalMalformed()` pattern; replaces the bare `approval_replayed` return with the helper call), `tools/patch-engine/tests/approval/verify-token.test.ts` (adds verifier-level recovery-hint coverage), `tools/patch-engine/tests/integration/end-to-end-canon-addition.test.ts` (adds submit-path preservation coverage).
**Deps**: `archive/tickets/PEENH-003-approval-malformed-error-detail-suggests-signing-cli.md` (the precedent; established the `APPROVAL_TOKEN_RECOVERY_HINT` constant + `approvalMalformed()` helper pattern and explicitly scoped `approval_replayed` out of its scope per its Out-of-Scope § pending parallel session evidence). `docs/HARD-GATE-DISCIPLINE.md` §Token re-use semantics (line 68 — the canonical operator-facing prose `"Token returned but submit returns approval_replayed — token already consumed by a prior successful submit. This is structural single-use enforcement; do not attempt to re-submit the same plan."` already exists; the engine-side hint clause points at this prose, no docs edit required).

## Problem

At intake (2026-05-17 session, `branching-story-turn-cycle` exercise against `worlds/erotica-world/stories/red-bunny` to advance PG-3 → PG-4 via CHC-10), the operator (assistant) hit `approval_replayed` on a freshly re-signed approval token. The recovery sequence cost roughly two minutes of source-grep navigation and prior-submit re-tracing because the engine error gave no recovery guidance.

Concrete session trace:

1. Submit #1 (token A, envelope v1 missing `saliency.urgency` on SLT-23): patch engine returned `validator_failed` on `record_schema_compliance.required` (SLT-23 schema violation at `/saliency: must have required property 'urgency'`). The validator-fail return correctly named the structural defect; the operator fixed the envelope.
2. Submit #2 (token B, envelope v2 with `urgency: medium` added): the operator ran `node tools/world-mcp/dist/src/cli/submit-patch-plan.js /tmp/envelope.json /tmp/token.txt 2>&1 | tail -80`. The tail showed all-validators-PASS rows but truncated the `{ "ok": true, ... }` header at the top. The operator inferred (incorrectly, at first) that the submit had not yet completed.
3. Submit #3 (token C, freshly re-signed over envelope v2): patch engine returned:

   ```json
   { "ok": false, "code": "approval_replayed", "message": "Approval token rejected: approval_replayed." }
   ```

   The `detail` field was absent. The operator then read `tools/patch-engine/src/approval/verify-token.ts` to understand the replay-gate semantics (line 92-97: `approval_tokens_consumed` table lookup keyed on `token_hash = sha256Hex(token)`), inferred that submit #2 must have actually succeeded and marked its token consumed, ran `ls worlds/erotica-world/stories/red-bunny/_source/.../PG-4.yaml` to verify all 12 records were on disk, and continued to the post-write phase.

The recovery cost would have been zero with a `detail` hint clause analogous to the `APPROVAL_TOKEN_RECOVERY_HINT` constant that already serves the malformed family (lines 46-49 of `verify-token.ts`). The hint should name the most common cause (prior submit succeeded silently) and the recovery action (inspect the target world's `_source/` for the applied records before re-submitting).

PEENH-003 (COMPLETED, archived) established the precedent: it added `APPROVAL_TOKEN_RECOVERY_HINT` and `approvalMalformed()` to extend every `approval_malformed` return with a recovery hint pointing at the signing CLI and `docs/HARD-GATE-DISCIPLINE.md` §Issuing a token. PEENH-003's Out-of-Scope § explicitly named `approval_replayed` (alongside `approval_invalid_hmac`, `approval_expired`, `approval_hash_mismatch`) as deferred pending parallel session evidence: *"these have distinct recovery paths (re-sign / no-resubmit / verify-correspondence) and warrant their own targeted hint clauses if a future ticket determines the operator-experience cost is similar."* This ticket is that follow-up for the `approval_replayed` family; the session evidence above is the operator-experience cost in parallel form.

At intake, `grep -nE 'approval_replayed' tools/patch-engine/src/approval/verify-token.ts` returned the bare replay return with no `detail` and no helper, confirming the parallel pattern PEENH-003 introduced for `approval_malformed` had not been extended to `approval_replayed`.

## Assumption Reassessment (2026-05-17)

1. **`verify-token.ts` `approval_replayed` return shape confirmed before implementation** — before this ticket, `tools/patch-engine/src/approval/verify-token.ts` performed the replay check with `ctx.db.prepare("SELECT 1 FROM approval_tokens_consumed WHERE token_hash = ?").get(tokenHash)` followed by a bare `return { ok: false, code: "approval_replayed" };`. The return omitted the `detail` field even though `ApprovalVerdict.ok=false` allows `detail?: string`. The parallel pattern from PEENH-003 already lived in the same file via `APPROVAL_TOKEN_RECOVERY_HINT` and `approvalMalformed()`. The `markTokenConsumed` helper is the write path that populates the `approval_tokens_consumed` table only after a successful apply (`tools/patch-engine/src/apply.ts` ordering); pre-apply validator failures do NOT consume the token, which is the operationally correct semantics. This ticket keeps that behavior unchanged and makes the replay verdict communicate the recovery path. The error construction in `tools/patch-engine/src/apply.ts` (`return error(approval.code, "Approval token rejected: ${approval.code}.", approval.detail);`) passes through whatever `detail` the verdict carries, so the engine-side hint clause surfaces automatically at both the MCP submit-path and the CLI submit-path without any consumer-side change.

2. **`docs/HARD-GATE-DISCIPLINE.md` operator-facing prose already exists at the anchor the hint clause points to** — `docs/HARD-GATE-DISCIPLINE.md:68` carries: *"Token returned but submit returns `approval_replayed` — token already consumed by a prior successful submit. This is structural single-use enforcement; do not attempt to re-submit the same plan."* This is the canonical operator-facing recovery prose; the engine-side hint clause references it by section name, parallel to how `APPROVAL_TOKEN_RECOVERY_HINT` (lines 46-49 of `verify-token.ts`) references `docs/HARD-GATE-DISCIPLINE.md section Issuing a token`. No edit to `docs/HARD-GATE-DISCIPLINE.md` is needed for this ticket; the docs prose was added when the single-use semantics landed and remains accurate at HEAD (verified via `grep -niE 'approval_replayed' docs/HARD-GATE-DISCIPLINE.md` returning lines 68 and 102 — the prose at 68 is the recovery-anchor; line 102 enumerates `approval_replayed` among CLI same-failure-mode codes, also accurate).

3. **Cross-skill / cross-artifact shared boundary under audit** — `tools/patch-engine/src/approval/verify-token.ts` is the canonical approval-token-verification surface consumed by both the MCP submit-path (`mcp__worldloom__submit_patch_plan` → `tools/patch-engine/src/apply.ts:101` → error envelope) and the CLI submit-path (`tools/world-mcp/dist/src/cli/submit-patch-plan.js` → same `apply.ts:101` → same error envelope). Both surfaces will pick up the new `detail` hint automatically. Per-skill consumers of either submit-path that surface `approval_replayed` to the operator include: `canon-addition` (CF/CH/PA mutation), `create-base-world` (genesis multi-record set), `character-generation` (hybrid CHAR file), `diegetic-artifact-generation` (hybrid DA file), `branching-story-bootstrap` (story-bundle `_source/` records), `branching-story-turn-cycle` (per-turn story-bundle records — the ticket's session-evidence source), `commitment-block-authoring` (SLT records), `story-fact-promotion-to-canon` (proposal package), `story-promotion-closeout` (story-bundle supersessions). Every one of these skills will surface the same `approval_replayed` error whenever an operator re-submits an envelope whose token has already been consumed (typical cause: prior successful submit whose output the operator missed in long CLI output, or accidentally re-running the submit command). Adding the hint clause is additive — the `detail` field is already an optional `string` on `ApprovalVerdict` per the type declaration at lines 28-29, the malformed family already populates it with the same shape, and no API contract changes. Existing consumers parsing `code === "approval_replayed"` continue to work unchanged; new consumers gain the recovery hint at no migration cost.

## Architecture Check

1. The minimum-blast-radius change parallels the proven PEENH-003 pattern: introduce a sibling `APPROVAL_TOKEN_REPLAY_HINT` constant and `approvalReplayed()` helper, replacing the bare replay return with the helper call. The same composition strategy (named-constant + helper at module scope, single call site) avoids ad-hoc inline string concatenation at the return statement. Alternative considered and rejected: passing the hint into the return inline (`return { ok: false, code: "approval_replayed", detail: "..." };`) — this inflates verify-token.ts with literal strings at the return site and makes a future second call site (if added) drift; the helper concentrates the hint in one place. Alternative also rejected: editing `apply.ts:101` to construct the hint from the code value — this couples the engine apply layer to per-error recovery wording, the wrong layer to own that responsibility (verify-token.ts owns the verdict; apply.ts owns the error envelope shape).

2. No backwards-compatibility aliasing or shims. The `detail` field is already optional on `ApprovalVerdict`; the change only populates it. The error envelope at `apply.ts:101` already forwards `detail` unchanged; no envelope-shape change. The CLI/MCP submit-paths inherit the hint automatically with zero downstream code changes.

## Verification Layers

1. **Engine-side detail-population invariant** → codebase grep-proof: `rg -n 'APPROVAL_TOKEN_REPLAY_HINT|approvalReplayed|return \{ ok: false, code: "approval_replayed" \}' tools/patch-engine/src/approval/verify-token.ts` returns the replay hint constant, helper call, helper declaration, and helper concatenation site; the prior bare `return { ok: false, code: "approval_replayed" };` literal is absent.
2. **Recovery-hint substring invariant** → unit test: `tools/patch-engine/tests/approval/verify-token.test.ts` asserts `verdict.detail` matches `/HARD-GATE-DISCIPLINE/` and `/single-use|already consumed|prior.*submit/` on the `approval_replayed` return, parallel to the existing lines 82-83 assertions for the malformed family.
3. **Cross-surface forwarding invariant (engine → MCP submit-path → CLI submit-path)** → manual review: confirm `tools/patch-engine/src/apply.ts:101` (`return error(approval.code, ..., approval.detail);`) is unchanged and forwards the `detail` field unmodified; confirm the CLI submit-path `submit-patch-plan.ts` prints the error envelope JSON to stderr including the new `detail` field without truncation or transformation.

## Landed Changes

### 1. Added `APPROVAL_TOKEN_REPLAY_HINT` constant and `approvalReplayed()` helper to `verify-token.ts`

Added a sibling hint constant after `APPROVAL_TOKEN_RECOVERY_HINT`:

```ts
const APPROVAL_TOKEN_REPLAY_HINT =
  " This token has already been consumed by a prior successful submit. " +
  "If the prior submit succeeded, inspect the target world for the applied records " +
  "before re-submitting; the patch engine enforces single-use approval tokens. " +
  "See docs/HARD-GATE-DISCIPLINE.md section Token re-use semantics.";
```

Added a sibling helper after `approvalMalformed()`:

```ts
function approvalReplayed(): ApprovalFailure {
  return {
    ok: false,
    code: "approval_replayed",
    detail: "approval token rejected: token already consumed." + APPROVAL_TOKEN_REPLAY_HINT
  };
}
```

### 2. Replaced the bare `approval_replayed` return with the helper call

Change:

```ts
if (existing !== undefined) {
  return { ok: false, code: "approval_replayed" };
}
```

to:

```ts
if (existing !== undefined) {
  return approvalReplayed();
}
```

### 3. Extended verifier and submit-path tests to assert the recovery-hint substrings on `approval_replayed`

The existing replay-gate assertion now checks `ok=false` and `code === "approval_replayed"` without asserting an exact object shape. A new verifier-level test asserts the `detail` field contains the recovery hint substrings, including `single-use` / `already consumed`, `prior successful submit`, and `HARD-GATE-DISCIPLINE`.

The existing `submitPatchPlan` integration test for replayed tokens now also asserts the same detail substrings on the public engine error envelope, proving `apply.ts` forwards the verifier detail unchanged.

## Files to Touch

- `tools/patch-engine/src/approval/verify-token.ts` (modify) — add the `APPROVAL_TOKEN_REPLAY_HINT` constant + `approvalReplayed()` helper + replace the bare replay return.
- `tools/patch-engine/tests/approval/verify-token.test.ts` (modify) — keeps the existing replay-gate test focused on `ok=false` / `code`, and adds a parallel verifier-level test asserting the `detail` substrings.
- `tools/patch-engine/tests/integration/end-to-end-canon-addition.test.ts` (modify) — extend the existing submit-path replay assertion to prove the engine error envelope carries the same detail.

## Out of Scope

- Recovery hints for the other approval-token error codes (`approval_invalid_hmac`, `approval_expired`, `approval_hash_mismatch`) — these have distinct recovery paths (regenerate-secret / re-sign / verify-plan-id-and-world-slug-correspondence) and warrant their own targeted hint clauses when matching session evidence surfaces. This ticket scopes specifically to the `approval_replayed` family because that's where the 2026-05-17 session evidence is grounded; expanding scope without parallel session evidence violates the audit's session-evidence-required guardrail (same scoping discipline PEENH-003 followed).
- Any change to `docs/HARD-GATE-DISCIPLINE.md` § Token re-use semantics — the operator-facing recovery prose already exists at line 68 and is accurate; this ticket adds the engine-side pointer to that existing docs surface.
- Any change to the `apply.ts:101` error envelope construction — the `detail` field forwarding already works; the change is upstream in the verdict producer, not in the envelope assembler.
- Refactoring the existing `APPROVAL_TOKEN_RECOVERY_HINT` constant to share structure with the new `APPROVAL_TOKEN_REPLAY_HINT` (e.g., a generic `hintClause(family, recovery, anchor)` builder). The two hints are short, the duplication is two lines per hint, and a premature shared abstraction would obscure the per-family wording differences. If a fourth/fifth/sixth hint lands, a shared builder becomes worth the refactor; with two hints, inline duplication is clearer.
- Adding deterministic-signing-window semantics or any other replay-detection beyond the existing `approval_tokens_consumed` single-use gate. The session-observed "freshly-resigned token still returns approval_replayed" symptom turned out to be operator confusion about whether submit #2 had succeeded (the CLI output's top-line `{ ok: true }` header was tail-truncated); the actual gate is the single-use enforcement working correctly. No engine-side detection change is needed; the hint clause makes the existing semantics legible.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/patch-engine && npm test` — full patch-engine test suite passes, including the new/updated `approval_replayed` assertion(s) in `tests/approval/verify-token.test.ts`.
2. `rg -n 'APPROVAL_TOKEN_REPLAY_HINT|approvalReplayed|return \{ ok: false, code: "approval_replayed" \}' tools/patch-engine/src/approval/verify-token.ts` returns the replay hint constant, helper call, helper declaration, and helper concatenation site; the bare `return { ok: false, code: "approval_replayed" };` literal is gone from the source.
3. `cd tools/patch-engine && node --test dist/tests/approval/verify-token.test.js dist/tests/integration/end-to-end-canon-addition.test.js` — focused verifier and submit-path proof passes and asserts the recovery-hint substrings at both surfaces.

### Invariants

1. The `approval_replayed` verdict from `verify-token.ts` always carries a non-empty `detail` field whose value names the recovery anchor (`docs/HARD-GATE-DISCIPLINE.md`) and the recovery action (inspect target world before re-submitting).
2. No other approval-token error family loses its `detail` field as a side effect of this change (only `approval_replayed` is touched; the existing malformed-family hints continue to land via the unchanged `approvalMalformed()` helper).
3. The `apply.ts:101` error envelope continues to forward `approval.detail` unchanged; no engine-apply-layer wording change.

## Test Plan

### New/Modified Tests

1. `tools/patch-engine/tests/approval/verify-token.test.ts` — adds a verifier-level test asserting the new `detail` field carries the recovery-hint substrings.
2. `tools/patch-engine/tests/integration/end-to-end-canon-addition.test.ts` — extends the existing replayed-token submit-path test to assert the engine error envelope carries the same `detail`.

### Commands

1. `cd tools/patch-engine && npm run build` — rebuilds the package and compiled test artifacts.
2. `cd tools/patch-engine && node --test dist/tests/approval/verify-token.test.js dist/tests/integration/end-to-end-canon-addition.test.js` — focused verifier and submit-path proof.
3. `cd tools/patch-engine && npm test` — full patch-engine package suite.
4. `rg -n 'APPROVAL_TOKEN_REPLAY_HINT|approvalReplayed|return \\{ ok: false, code: "approval_replayed" \\}' tools/patch-engine/src/approval/verify-token.ts` — confirms the replay hint/helper landed and the prior bare replay return is absent.

## Outcome

PEENH-012 is implemented. `approval_replayed` failures now keep the same single-use enforcement behavior but carry a `detail` hint that names the likely cause, tells the operator to inspect target-world records before re-submitting, and points to `docs/HARD-GATE-DISCIPLINE.md` section Token re-use semantics.

The `ApprovalFailure` envelope shape is unchanged; only the optional `detail` field is now populated for this error family. `apply.ts` continues to forward `approval.detail` unchanged, and the submit-path integration test now proves the public engine error envelope preserves the replay hint.

## Verification Result

Passed on 2026-05-17:

- Pre-edit baseline: `cd tools/patch-engine && npm test` — full package suite passed: 75 tests.
- `cd tools/patch-engine && npm run build` — TypeScript build passed after source/test edits.
- `cd tools/patch-engine && node --test dist/tests/approval/verify-token.test.js` — focused verifier proof passed: 4 tests.
- `cd tools/patch-engine && node --test dist/tests/approval/verify-token.test.js dist/tests/integration/end-to-end-canon-addition.test.js` — focused verifier plus submit-path proof passed: 12 tests.
- `cd tools/patch-engine && npm test` — full package suite passed after implementation: 76 tests.
- `rg -n 'APPROVAL_TOKEN_REPLAY_HINT|approvalReplayed|return \\{ ok: false, code: "approval_replayed" \\}' tools/patch-engine/src/approval/verify-token.ts` — returned the replay hint constant, helper call, helper declaration, and helper concatenation site; no bare replay return was present in source.
- `git diff --check -- tools/patch-engine/src/approval/verify-token.ts tools/patch-engine/tests/approval/verify-token.test.ts tools/patch-engine/tests/integration/end-to-end-canon-addition.test.ts archive/tickets/PEENH-012.md` — passed after making the untracked ticket visible with temporary intent-to-add and clearing that index marker afterward.

## Deviations

- The drafted manual `tools/world-mcp` CLI replay smoke was replaced with stronger package-local submit-path integration coverage. The manual CLI reproduction requires a previously applied envelope and fresh token state, while `tools/patch-engine/tests/integration/end-to-end-canon-addition.test.ts` exercises the same `submitPatchPlan` public engine path deterministically and asserts the replay `detail` survives the envelope assembly layer.
- Post-ticket review created `tickets/PEENH-013.md` for separate story-skill prose drift: uncommitted edits in `.claude/skills/branching-story-bootstrap/SKILL.md`, `.claude/skills/branching-story-turn-cycle/SKILL.md`, and `.claude/skills/commitment-block-authoring/SKILL.md` described `approval_replayed` as keyed on already-applied patch hashes, but live `verify-token.ts` checks consumed token hashes. That is follow-up skill wording, not unfinished PEENH-012 engine work.
