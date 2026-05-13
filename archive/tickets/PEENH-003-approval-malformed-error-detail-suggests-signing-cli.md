# PEENH-003: Improve `approval_malformed` error detail to point at the `sign-approval-token` CLI and `docs/HARD-GATE-DISCIPLINE.md` §Issuing a token

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `tools/patch-engine/src/approval/verify-token.ts` (extend every runtime `approval_malformed` return to include a hint clause naming the canonical signing CLI invocation and the docs reference), `tools/patch-engine/tests/approval/verify-token.test.ts` (new cases asserting the hint clause is present in each `approval_malformed` family — base64-decode failure, signature-separator absence, hex-signature shape, payload JSON parse, payload-must-be-object, payload-fields-shape), `tools/patch-engine/tests/integration/end-to-end-canon-addition.test.ts` (submit-path proof that the engine error envelope carries the hint).
**Deps**: `archive/tickets/PEENH-001.md` (the patch-engine skill-bundle ops baseline that established the engine-routed write discipline; `submit_patch_plan` is the operator's canonical entry point that surfaces the `approval_malformed` family). `docs/HARD-GATE-DISCIPLINE.md` §Issuing a token (the canonical operator-facing documentation that the engine error should point at — already exists at line 25; this ticket adds the engine-side pointer to the existing docs surface, no docs edit required).

## Problem

At intake, when an operator (skill, CLI user, or API consumer) called `mcp__worldloom__submit_patch_plan` with a freeform string in the `approval_token` field — the most common first-time failure mode — the patch engine's `verify-token.ts` returned `approval_malformed` with a terse `detail` that named the structural defect (e.g., `"token must contain a signature separator"`, `"token contains invalid base64"`, `"token signature must be hex"`) but did NOT tell the operator how to obtain a properly signed token. The operator had to either (a) search the codebase for `approval_malformed` to find the verify-token source and reverse-engineer the signing format, or (b) consult `docs/HARD-GATE-DISCIPLINE.md` §Issuing a token (which documents `node tools/world-mcp/dist/src/cli/sign-approval-token.js <plan-path>`) — but the engine error gave them no hint that this docs section exists.

Concrete session evidence (2026-05-04): during this session's `branching-story-bootstrap` execution against `worlds/erotica-world` to bootstrap STORY-2 / red-bunny, the operator (assistant) assembled the first split envelope's patch-plan JSON, persisted it to `/tmp/red-bunny-envA-cast.json`, and called `mcp__worldloom__submit_patch_plan(patch_plan=<envelope>, approval_token="user-accept-bootstrap-red-bunny-2026-05-04")`. The engine returned:

```json
{
  "ok": false,
  "code": "approval_malformed",
  "message": "Approval token rejected: approval_malformed.",
  "detail": "token must contain a signature separator"
}
```

The `detail` field correctly named the structural defect but provided no recovery path. The operator then ran `grep -r "signature separator" tools/patch-engine/src/`, located `tools/patch-engine/src/approval/verify-token.ts:127`, read the file end-to-end to reverse-engineer the `<base64-payload>.<hex-signature>` format, then ran a second grep `grep -r "sign-approval-token" tools/world-mcp/` to discover the existing CLI tool at `tools/world-mcp/dist/src/cli/sign-approval-token.js`. The recovery cost roughly 5 minutes of source-grep navigation plus several Read calls. The operator could have shaved this to one tool call (running the CLI directly) had the engine error included a hint like:

```json
"detail": "token must contain a signature separator. To obtain a valid signed token, run: node tools/world-mcp/dist/src/cli/sign-approval-token.js <plan-path>. See docs/HARD-GATE-DISCIPLINE.md §Issuing a token."
```

The skill prose for `branching-story-bootstrap` was subsequently updated to document the signing CLI inline (via the prior `/skill-audit` follow-up implementation that landed `references/engine-envelope-shape.md` §4), but five sibling skills (`canon-addition`, `create-base-world`, `character-generation`, `diegetic-artifact-generation`, `branching-story-page-cycle`) had already documented the same CLI invocation independently — confirming the gap is operator-experience-wide, not bootstrap-specific. Future operators of any other skill that submits patch plans (or future direct-API users / CLI users without skill prose in scope) hit the same terse-error / source-grep recovery cycle. The fix lands once at the engine and surfaces at every approval-token failure family across the entire pipeline.

At intake, `grep -nE "sign-approval-token|HARD-GATE-DISCIPLINE|Issuing a token" tools/patch-engine/src/approval/verify-token.ts` returned zero hits — the engine error returns were entirely silent on recovery paths, even though the canonical documentation (`docs/HARD-GATE-DISCIPLINE.md` §Issuing a token) existed and was well-maintained.

## Assumption Reassessment (2026-05-04)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. **`verify-token.ts` error-return surface confirmed at HEAD before implementation** — `tools/patch-engine/src/approval/verify-token.ts` exports `verifyApprovalToken` and emits `approval_malformed` at six runtime call sites: `token contains invalid base64`, `token must contain a signature separator`, `token signature must be hex`, `payload is not valid JSON`, `payload must be an object`, and `payload has invalid fields`; the seventh grep hit is the type-only enum entry. All six runtime returns share the shape `{ ok: false, code: "approval_malformed", detail: "<terse description>" }` with no hint, no recovery suggestion, no docs pointer. The signing CLI exists at `tools/world-mcp/dist/src/cli/sign-approval-token.js` (built artifact) sourced from `tools/world-mcp/src/cli/sign-approval-token.ts`. The docs surface at `docs/HARD-GATE-DISCIPLINE.md` §Issuing a token is the canonical pointer the engine error should reference.

2. **Cross-skill / cross-artifact shared boundary under audit** — `mcp__worldloom__submit_patch_plan` is the canonical write surface consumed by every Category 2b/2c/3 skill that mutates `_source/` records or hybrid files. Per-skill consumers include: `canon-addition` (CF/CH/PA mutation), `create-base-world` (genesis multi-record set), `character-generation` (hybrid CHAR file), `diegetic-artifact-generation` (hybrid DA file), `branching-story-bootstrap` (story-bundle `_source/` records), `branching-story-page-cycle` (per-page-tick story-bundle records), `storylet-pool-authoring` (SLT record batches via direct invocation). Every one of these skills will surface the same `approval_malformed` error when an operator's first submission lacks a properly signed token. Adding the hint clause is additive — no behavior change for valid tokens, no API-shape change for the error envelope (the `detail` field is already a free-form string); only the content of the `detail` string extends. Existing consumers parsing `code === "approval_malformed"` continue to work unchanged; existing consumers parsing the exact `detail` string verbatim (none observed in the pipeline) would see a longer string but no breaking change.

3. **Pre-implementation verification that the gap was genuinely absent** — at intake, `grep -nE "sign-approval-token|HARD-GATE-DISCIPLINE|Issuing a token" tools/patch-engine/src/approval/verify-token.ts` returned zero hits. `grep -nE "approval_malformed" tools/patch-engine/src/approval/verify-token.ts` returned 7 hits: six runtime returns plus the type-only enum entry. The gap claim was concrete: the engine error returns name the structural defect but contain no recovery pointer.

4. **FOUNDATIONS principle motivating this ticket** — `docs/FOUNDATIONS.md` §Tooling Recommendation commits to "the documented context-packet + targeted-retrieval pattern" with the corollary that the machine-facing layer's error surfaces should be self-describing — operators should be able to recover from common failure modes without reading source code. The `approval_malformed` family is the most common first-time failure mode for `submit_patch_plan` (any operator who hasn't yet learned the signed-token discipline hits it on their first attempt); a self-describing error preserves the "machine-facing layer is the canonical surface" commitment by surfacing the canonical recovery path inline. The MCPENH-029 precedent (warn-on-skipped-schema-failed-records) is the structural sibling of this fix at the index-sync layer — both fixes preserve operator-facing audit-trail completeness by extending error / warning content to surface the recovery path the operator needs.

5. **Adjacent contradictions classification** — two factual corrections surfaced during reassessment, both same-seam and safe to correct in this ticket. First, the live runtime surface has six `approval_malformed` returns, not seven; the seventh grep hit is the enum entry. Second, the drafted end-to-end smoke used an empty `patches: []` envelope, which would fail envelope-shape validation before approval-token verification and would not prove this ticket's invariant. The corrected proof surface is a focused `verifyApprovalToken` parameterized unit test for all six malformed families plus a `submitPatchPlan` integration assertion that the engine error envelope preserves the hint in `detail`. The engine error envelope shape (`{ ok, code, message, detail }`) is stable and the `detail` field is already a free-form string per `tools/patch-engine/src/approval/verify-token.ts`'s `ApprovalVerdict.detail` type (`detail?: string` on the `ApprovalFailure` discriminant). Extending the string content is the established pattern; no schema migration is needed. The six different `detail` strings are already heterogeneous (base64-decode vs separator-absence vs hex-shape vs payload-JSON-parse vs payload-shape), so adding a uniform hint suffix to all six keeps the recovery surface uniform.

## Architecture Check

1. **Why this approach is cleaner than alternatives**:
   - **Alternative A — return a structured `recovery_hint` field instead of extending the `detail` string**: rejected because the `ApprovalVerdict` shape is stable and adding a new field is a wider API change. The `detail` field is already free-form; extending it preserves the API shape and is sufficient for operators reading the error envelope. If structured-recovery-hint becomes a pipeline-wide pattern in the future (e.g., for `validator_failed` recovery hints), that's a separate, larger refactor.
   - **Alternative B — surface the hint only when the error is `signature-separator-absence` (the most common first-time failure)**: rejected because the six runtime `approval_malformed` families share the same root cause (operator passed something that isn't a properly signed token). Selectively suffixing only one family creates a cliff: an operator whose first error is `signature-separator-absence` gets the hint, but an operator whose first error is `payload is not valid JSON` (e.g., they pasted a half-formed token) gets the terse error and has to grep the source. Uniformly suffixing all six preserves the operator-experience invariant.
   - **Alternative C — point only at `docs/HARD-GATE-DISCIPLINE.md` and not at the CLI command**: rejected because the docs reference is the right canonical pointer for the FULL signing discipline (HMAC binding, expiry semantics, single-use enforcement) but the operator-recovery shortest-path is the literal CLI command. Including both lets the operator either (a) run the command immediately (60-second recovery) or (b) read the docs first (slower but more thorough). Including only the docs pointer adds a layer of indirection the operator must navigate before recovery.
   - The chosen approach (suffix every `approval_malformed` `detail` with the same hint clause naming both the CLI invocation AND the docs reference) follows the principle "the engine error should be the operator's first complete recovery surface". An operator who hits the error and reads only the engine response should be able to fix the problem without leaving the response.

2. **No backwards-compatibility shims**: the `detail` string content extends from terse to terse-plus-hint with no opt-out / deprecation flag / verbose-mode toggle. Existing consumers parsing `code === "approval_malformed"` see no change. Existing consumers parsing the exact `detail` string verbatim (none found in the pipeline at intake-time grep) would observe a longer string; the test plan below confirms no in-tree consumer matches `detail` exactly. Because the silent-detail behavior had no documented contract supporting it as intentional terseness, extending the content is a UX improvement, not a breaking change.

## Verification Layers

1. **Every runtime `approval_malformed` return includes the recovery hint clause** → codebase grep-proof: `grep -nE "sign-approval-token.*approval_malformed|approval_malformed.*sign-approval-token|APPROVAL_TOKEN_RECOVERY_HINT" tools/patch-engine/src/approval/verify-token.ts` returns the centralized hint constant and helper reuse.
2. **Recovery hint format is uniform across all six runtime malformed families** → unit test: `tools/patch-engine/tests/approval/verify-token.test.ts` adds a parameterized test that, for each `approval_malformed`-triggering input shape (invalid-base64 / no-separator / non-hex-signature / invalid-payload-JSON / payload-not-object / payload-missing-fields), asserts the returned `detail` string contains BOTH the structural-defect description (preserved from current behavior) AND the new hint substring (`sign-approval-token` and `HARD-GATE-DISCIPLINE`). The parameterization keeps the test maintainable as new `approval_malformed` families are added in future work.
3. **No regression on valid-token verification** → existing test coverage in `tools/patch-engine/tests/approval/verify-token.test.ts` for the `ok: true` path continues to pass byte-identical. The hint-clause extension only affects the `ok: false, code: "approval_malformed"` returns.
4. **Cross-skill prose remains valid** → grep-proof: `grep -nE "approval_malformed|sign-approval-token" .claude/skills/canon-addition/SKILL.md .claude/skills/create-base-world/SKILL.md .claude/skills/branching-story-bootstrap/references/engine-envelope-shape.md .claude/skills/branching-story-page-cycle/SKILL.md .claude/skills/character-generation/SKILL.md .claude/skills/diegetic-artifact-generation/SKILL.md` confirms five sibling skills' prose already names the signing CLI; the engine-side hint complements skill-prose without contradicting it. No skill-prose edits required.

## Landed Changes

### 1. Centralize the recovery hint string in `verify-token.ts`

Added a module-private constant at the top of `tools/patch-engine/src/approval/verify-token.ts` carrying the canonical hint clause:

```typescript
const APPROVAL_TOKEN_RECOVERY_HINT =
  " To obtain a valid signed token, run: " +
  "node tools/world-mcp/dist/src/cli/sign-approval-token.js <plan-path>. " +
  "See docs/HARD-GATE-DISCIPLINE.md section Issuing a token.";
```

The constant is reused through a small `approvalMalformed(detail)` helper so any future wording change lands in one place. The leading space is intentional because the helper appends it after the structural-defect sentence.

### 2. Suffix every `approval_malformed` return's `detail` with the hint constant

Applied at all six existing runtime `approval_malformed` return sites. Worked example for the signature-separator branch:

```typescript
// before:
return { ok: false, code: "approval_malformed", detail: "token must contain a signature separator" };

// after:
return {
  ok: false,
  code: "approval_malformed",
  detail: "token must contain a signature separator." + APPROVAL_TOKEN_RECOVERY_HINT
};
```

The helper preserves the structural-defect sentence as the leading content and appends the shared recovery hint.

### 3. Add parameterized unit-test coverage for the hint clause

Added to `tools/patch-engine/tests/approval/verify-token.test.ts` a parameterized test case that constructs the six `approval_malformed`-triggering input shapes and asserts:
- The verdict is `{ ok: false, code: "approval_malformed" }`.
- The `detail` string includes the structural defect description (the current terse content).
- The `detail` string includes BOTH `sign-approval-token` AND `HARD-GATE-DISCIPLINE` substrings (the recovery hint clause).

The payload JSON / payload shape cases use a valid HMAC over malformed payload bytes because live verification checks HMAC before parsing payload JSON.

### 4. Assert submit-path preservation of the detail field

Extended the existing `submitPatchPlan` approval-token integration test so the malformed-token branch asserts the returned engine error `detail` includes the same recovery hint. This proves the helper-level string survives the public patch-engine submit path (`apply.ts`), not just direct verifier calls.

## Files to Touch

- `tools/patch-engine/src/approval/verify-token.ts` (modify)
- `tools/patch-engine/tests/approval/verify-token.test.ts` (modify)
- `tools/patch-engine/tests/integration/end-to-end-canon-addition.test.ts` (modify)

## Out of Scope

- **Structured `recovery_hint` field in the `ApprovalFailure` envelope (Alternative A)**: extending the response shape with a new field is a wider API-shape change. Out of scope here; if structured recovery hints become a pipeline-wide pattern (e.g., for `validator_failed` recovery hints), that is a separate, larger refactor.
- **Recovery hints for other approval-token error codes (`approval_invalid_hmac`, `approval_expired`, `approval_replayed`, `approval_hash_mismatch`)**: these have distinct recovery paths (re-sign / no-resubmit / verify-correspondence) and warrant their own targeted hint clauses if a future ticket determines the operator-experience cost is similar. This ticket scopes specifically to the `approval_malformed` family because that's where the session evidence is grounded; expanding scope without parallel session evidence violates the audit's session-evidence-required guardrail.
- **Recovery hints for `validator_failed`, `index_stale`, or other patch-engine error codes outside the approval family**: each of those codes has its own recovery-path nuance (validator-specific fix-and-resubmit for `validator_failed`; `world-index sync` for `index_stale`). Out of scope here; could be a follow-up PEENH ticket if session evidence surfaces the same operator-experience cost.
- **Updates to `docs/HARD-GATE-DISCIPLINE.md`**: the docs are already correct (§Issuing a token at line 25 documents the CLI invocation); this ticket adds the engine-side pointer to the existing docs surface, no docs edit required.
- **Updates to skill prose**: five sibling skills (`canon-addition`, `create-base-world`, `character-generation`, `diegetic-artifact-generation`, `branching-story-page-cycle`) already document the CLI invocation in their respective skill-prose surfaces; `branching-story-bootstrap` was just updated via the prior `/skill-audit` follow-up implementation. No skill-prose edits required.
- **CLI signing tool implementation changes**: the `sign-approval-token.js` CLI works correctly as-shipped (this session exercised it 4 times across 4 envelopes; all signed tokens verified correctly at submit). Out of scope.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/patch-engine && npm test` — full package suite passes after rebuild, including the new parameterized coverage cases.
2. `cd tools/patch-engine && node --test dist/tests/approval/verify-token.test.js dist/tests/integration/end-to-end-canon-addition.test.js` — focused approval-token verification and submit-path proof passes.
3. `grep -nE "sign-approval-token.*approval_malformed|approval_malformed.*sign-approval-token|APPROVAL_TOKEN_RECOVERY_HINT" tools/patch-engine/src/approval/verify-token.ts` — at least one hit confirming the hint constant landed and is reused by every `approval_malformed` return site.

### Invariants

1. **Hint clause uniformity across all runtime `approval_malformed` returns**: every `approval_malformed` `detail` string contains the same recovery hint substring (`sign-approval-token` AND `HARD-GATE-DISCIPLINE`). A new `approval_malformed` family added in future work that omits the hint clause is a regression.
2. **No structural-defect description loss**: every `approval_malformed` `detail` string preserves the current terse defect description (e.g., `"token must contain a signature separator"`) as the LEADING content of the string, with the hint clause SUFFIXED. Operators reading only the first sentence of `detail` continue to see the structural defect; operators reading further see the recovery path.
3. **No envelope-shape change**: the `ApprovalFailure` discriminant continues to expose `{ ok: false, code, detail? }` only — no new fields. Existing consumers parsing `code === "approval_malformed"` continue to work unchanged.

## Test Plan

### New/Modified Tests

1. `tools/patch-engine/tests/approval/verify-token.test.ts` — add parameterized coverage for the six runtime `approval_malformed` families asserting the hint substrings are present in each family's `detail`.
2. `tools/patch-engine/tests/integration/end-to-end-canon-addition.test.ts` — extend the existing approval-token submit test to assert the malformed-token `detail` carries the hint through `submitPatchPlan`.

### Commands

1. `cd tools/patch-engine && npm run build`.
2. `cd tools/patch-engine && node --test dist/tests/approval/verify-token.test.js dist/tests/integration/end-to-end-canon-addition.test.js` — focused approval-token verification and submit-path proof.
3. `cd tools/patch-engine && npm test` — full package suite.
4. `grep -nE "sign-approval-token.*approval_malformed|approval_malformed.*sign-approval-token|APPROVAL_TOKEN_RECOVERY_HINT" tools/patch-engine/src/approval/verify-token.ts` — confirm the hint constant landed at every `approval_malformed` return site.

## Outcome

PEENH-003 is implemented. `approval_malformed` failures now keep the original structural defect as the leading sentence and append the shared recovery hint naming `node tools/world-mcp/dist/src/cli/sign-approval-token.js <plan-path>` plus `docs/HARD-GATE-DISCIPLINE.md` section Issuing a token. The `ApprovalFailure` envelope shape is unchanged; only `detail` text is extended.

The runtime malformed-token surface remains six branches. The earlier ticket wording that counted seven runtime families was corrected because the seventh grep hit is the `approval_malformed` enum member.

## Verification Result

Passed on 2026-05-04:

- `cd tools/patch-engine && npm run build` — TypeScript build passed.
- `cd tools/patch-engine && node --test dist/tests/approval/verify-token.test.js dist/tests/integration/end-to-end-canon-addition.test.js` — focused approval-token and submit-path proof passed.
- `cd tools/patch-engine && npm test` — full package suite passed: 59 tests.
- `grep -nE "sign-approval-token.*approval_malformed|approval_malformed.*sign-approval-token|APPROVAL_TOKEN_RECOVERY_HINT" tools/patch-engine/src/approval/verify-token.ts` — returned the centralized `APPROVAL_TOKEN_RECOVERY_HINT` definition and helper reuse.

## Deviations

- The drafted manual CLI smoke used an invalid empty patch list and would have failed envelope-shape validation before approval-token verification. The accepted proof was corrected to package-local verifier coverage plus `submitPatchPlan` integration coverage that reaches `approval_malformed`.
- Payload JSON / payload shape malformed cases require a valid HMAC to reach parsing because live verification checks HMAC before `parsePayload`; the unit fixtures sign those malformed payload bytes directly.
