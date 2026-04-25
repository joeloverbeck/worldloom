# SPEC03PATENG-005: Approval-token verification

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — adds `tools/patch-engine/src/approval/verify-token.ts`, adds an `approval_tokens_consumed` world-index schema migration/version bump, and updates world-index schema tests for the new version/table. No impact on existing world-mcp behavior beyond the future ticket 006/007 call path.
**Deps**: SPEC03PATENG-001

## Problem

SPEC-03 §Integration with SPEC-02 approval token (post-reassessment spec lines 254–259) requires the engine to verify HMAC-signed approval tokens issued by SPEC-02's `submit_patch_plan` wrapper, check expiry, ensure single-use semantics (recorded in an `approval_tokens_consumed` table), and match the token's `patch_hashes[]` against the hash of each op in the envelope to detect tampering. Today `tools/world-mcp/src/tools/submit-patch-plan.ts:60-69` shape-checks the envelope but does not verify the token cryptographically — that stub returns `phase1_stub` without consuming tokens. This ticket implements the real verifier that ticket 006's `apply.ts` will invoke as Phase A step 1.

## Assumption Reassessment (2026-04-24)

1. SPEC-02's HMAC secret is stored at `tools/world-mcp/.secret` (per `tools/world-mcp/README.md` §Approval token; `.gitignored`). The engine must read this same secret. Design decision: the engine accepts the secret path via `OpContext` (or a dedicated `ApprovalContext`) rather than re-reading the file per op; ticket 006's apply orchestrator reads the secret once at entry.
2. Token shape per SPEC-02 (archived at `archive/specs/SPEC-02-retrieval-mcp-server.md` §Approval token) is `{plan_id: string; world_slug: string; patch_hashes: string[]; issued_at: string; expires_at: string}` signed with HMAC-SHA256. The older intake wording named a non-live `{plan_hash, nonce}` payload; this ticket corrects to the archived SPEC-02 payload and verifies `plan_id`, `world_slug`, expiry, and `patch_hashes[]` against the envelope.
3. Shared boundary: the `approval_tokens_consumed` table is a new addition to `tools/world-index`'s versioned SQLite schema. The live schema authority is `tools/world-index/src/schema/migrations/*.sql` plus `tools/world-index/src/schema/version.ts`, not inline DDL in `tools/world-index/src/index/open.ts`; this ticket adds migration `003_approval_tokens_consumed.sql` and bumps `CURRENT_INDEX_VERSION`.
4. FOUNDATIONS principle under audit: **HARD-GATE discipline** (docs/FOUNDATIONS.md §Tooling Recommendation, §Machine-Facing Layer, and CLAUDE.md §Non-Negotiables "Never bypass a HARD-GATE"). The approval token is the cryptographic proof-of-HARD-GATE-approval; verifying it correctly is the gate's teeth at the engine layer. A weak verifier (accepts expired tokens, accepts replay, accepts tampered hashes) would silently bypass the HARD-GATE.
5. This ticket touches HARD-GATE enforcement surface. Mystery Reserve firewall preservation: the engine's approval gate is the same gate that the upstream skill triggers during HARD-GATE approval; there is no path by which a patch plan touches MR records without user-approved skill HARD-GATE authorization. The engine does not independently enforce MR firewalls at apply time — that's SPEC-04 `rule7_mystery_reserve_preservation`, invoked pre-apply by ticket 006.

## Architecture Check

1. Separating approval verification into its own module (`src/approval/verify-token.ts`) rather than inlining in `apply.ts` keeps the crypto surface testable and auditable. Future rotation of the HMAC secret or migration to asymmetric signing (Ed25519) is a one-file change.
2. Storing consumed tokens in a SQL table (not an in-memory set) survives engine restarts. Restart-and-replay attacks where the adversary captures a token from a crashed engine run and replays it against a fresh engine are defeated by the table.
3. `approval_tokens_consumed` schema: `(token_hash TEXT PRIMARY KEY, consumed_at TEXT NOT NULL, plan_id TEXT NOT NULL)`. Storing `token_hash` (SHA-256 of the base64 token string) rather than the token itself means the DB cannot be used as a token cache if copied off-host. Primary key enforces single-use.
4. Returning a structured error code (`{code: 'approval_invalid_hmac' | 'approval_expired' | 'approval_replayed' | 'approval_hash_mismatch'}`) rather than a boolean lets apply.ts surface the failure to the caller without exposing crypto timing side channels — error codes are fixed strings.
5. No backwards-compatibility aliasing/shims introduced. The Phase 1 stub at world-mcp's submit-patch-plan.ts does not verify tokens cryptographically; ticket 007's rewire replaces the stub wholesale.

## Verification Layers

1. Valid token with matching hashes → success -> unit test (ticket 008 `verify-token.test.ts` synthesizes a token with a known HMAC secret; verifier returns `{ok: true}`).
2. Expired token rejected -> unit test (`expires_at` in past; returns `{code: 'approval_expired'}`).
3. Tampered HMAC rejected -> unit test (flip a bit in the base64-hmac half; returns `{code: 'approval_invalid_hmac'}`).
4. `patch_hashes` mismatch rejected -> unit test (token signed for patch-hash `A` but envelope contains op with hash `B`; returns `{code: 'approval_hash_mismatch'}`).
5. Replayed token rejected -> unit test (consume a token; re-submit the same token; returns `{code: 'approval_replayed'}`).
6. Migration adds `approval_tokens_consumed` table without breaking existing index queries -> targeted tool command (`world-index build` against a temp copied fixture world, then SQLite schema probe for `approval_tokens_consumed`).

## What to Change

### 1. Create `tools/patch-engine/src/approval/verify-token.ts`

Export:

```typescript
export interface ApprovalContext {
  db: BetterSqlite3.Database;
  hmac_secret: Buffer;    // read once at apply.ts entry
}

export interface ApprovalVerdict {
  ok: true;
  token_hash: string;     // for subsequent markConsumed() call
} | {
  ok: false;
  code: 'approval_invalid_hmac' | 'approval_expired' | 'approval_replayed' | 'approval_hash_mismatch' | 'approval_malformed';
  detail?: string;
}

export function verifyApprovalToken(
  token: string,
  envelope: PatchPlanEnvelope,
  ctx: ApprovalContext
): ApprovalVerdict;

export function markTokenConsumed(
  token_hash: string,
  plan_id: string,
  ctx: ApprovalContext
): void;
```

Implementation steps:
- Decode the live MCP signer token format: one base64 string containing `JSON.stringify(payload) + "." + signatureHex`; malformed decode/split/signature → `approval_malformed`.
- `computed_hmac = HMAC-SHA256(payloadJsonBytes, ctx.hmac_secret)`; constant-time compare against decoded signature bytes. Mismatch → `approval_invalid_hmac`.
- Parse payload JSON `{plan_id, world_slug, patch_hashes, issued_at, expires_at}`; validate shape and ensure `plan_id` / `world_slug` match the envelope.
- `Date.parse(expires_at) <= Date.now()` → `approval_expired`.
- Compute `envelope_patch_hashes = envelope.patches.map(canonicalOpHash)`; compare array to `payload.patch_hashes` (same length, element-wise equal). Mismatch → `approval_hash_mismatch`.
- Compute `token_hash = sha256Hex(token)`; query `SELECT 1 FROM approval_tokens_consumed WHERE token_hash = ?`. Row present → `approval_replayed`.
- Return `{ok: true, token_hash}`.

`markTokenConsumed` runs after Phase B apply succeeds (ticket 006 calls it from apply.ts): inserts `(token_hash, consumed_at = new Date().toISOString(), plan_id)` into `approval_tokens_consumed`.

Also export `canonicalOpHash(op: PatchOperation): string` — stable SHA-256 over `serializeStableYaml(op)` (uses the same stable serializer as create/update ops) so the token's `patch_hashes[]` can be computed deterministically by SPEC-02's signing code AND by the engine's verifier.

### 2. Add world-index migration for `approval_tokens_consumed` table

Touch `tools/world-index/src/schema/migrations/003_approval_tokens_consumed.sql` and bump `tools/world-index/src/schema/version.ts`:

```sql
CREATE TABLE IF NOT EXISTS approval_tokens_consumed (
  token_hash TEXT PRIMARY KEY,
  consumed_at TEXT NOT NULL,
  plan_id TEXT NOT NULL
);
```

Ensure the migration runs idempotently on existing indexes. The live `openIndex()` path applies sequential migration files and records `CURRENT_INDEX_VERSION` in `index_version.txt`.

## Files to Touch

- `tools/patch-engine/src/approval/verify-token.ts` (new)
- `tools/world-index/src/schema/migrations/003_approval_tokens_consumed.sql` (new)
- `tools/world-index/src/schema/version.ts` (modify)
- `tools/world-index/tests/schema.test.ts` (modify — keep schema-version and table-existence assertions truthful after the migration bump)

## Out of Scope

- HMAC-secret generation / rotation tooling — deferred to a separate ops-hygiene ticket; initial setup uses the existing `.secret` file per SPEC-02's convention.
- Asymmetric-signing migration (Ed25519 etc.) — spec explicitly chooses HMAC-SHA256 for SPEC-03.
- Cross-host token verification (tokens issued on host A consumed on host B) — single-host deployment assumed per worldloom's current architecture; cross-host would require the same secret on both hosts, no new code.
- Token-issuance code — lives in SPEC-02's HARD-GATE approval flow, not in this engine.
- Two-factor approval (approval + human keyboard confirmation) — out of scope; approval token is the sole cryptographic evidence of HARD-GATE consent.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/patch-engine && npm run build` exits 0 with `src/approval/verify-token.ts` compiled.
2. `grep -n "approval_tokens_consumed" tools/world-index/src/schema/migrations/*.sql` returns ≥1 match (DDL present).
3. After running `world-index build <slug>` on a temp fixture world, a SQLite schema probe prints the `approval_tokens_consumed` table schema matching the DDL above.
4. `grep -c "^export function verifyApprovalToken\|^export function markTokenConsumed\|^export function canonicalOpHash" tools/patch-engine/src/approval/verify-token.ts` returns 3.

### Invariants

1. HMAC comparison uses constant-time equality (`crypto.timingSafeEqual` or equivalent) — never a naïve `===` byte comparison on cryptographic inputs.
2. Tokens are consumed atomically: `markTokenConsumed` runs inside the same transaction that records the patch receipt (ticket 006 enforces the transaction boundary). Partial consumption (token consumed but apply failed) is impossible.
3. `patch_hashes` are computed via `serializeStableYaml` (same serializer as create/update ops) so signer and verifier produce byte-identical inputs to SHA-256.
4. The verifier has no timing side channel — all four rejection codes take constant time up to the earliest failing check; no short-circuit on user-controllable input like token length.
5. The `approval_tokens_consumed` table's primary key is `token_hash` (SHA-256 of the base64 token), not the raw token. A dump of the DB cannot be replayed as a token source.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/schema.test.ts` — updated existing schema tests to assert `CURRENT_INDEX_VERSION` and `approval_tokens_consumed` across create/upgrade paths.
2. `tools/patch-engine/tests/approval/verify-token.test.ts` — deferred to ticket 008 for the full table-driven verdict suite. This ticket landed the module and used a targeted inline verifier probe for success + replay behavior.

### Commands

1. `cd tools/patch-engine && npm run build` (targeted).
2. `cd tools/world-mcp && npm run build` (producer build for the live signer used by the cross-boundary proof).
3. `cd tools/world-index && npm run build && npm run test` (confirms the DDL migration compiles and does not break existing index tests).
4. Temp migration check: create a SPEC-13 atomic temp world, run `node tools/world-index/dist/src/cli.js build <slug>`, and probe the resulting `world.db` for `approval_tokens_consumed`.
5. Cross-boundary verifier probe: sign a token with `tools/world-mcp/src/approval/token.ts#signToken`, verify success with `tools/patch-engine/src/approval/verify-token.ts#verifyApprovalToken` against an in-memory DB, mark it consumed, and verify the same token returns `approval_replayed`.

## Outcome

Completed: 2026-04-25.
Outcome amended: 2026-04-25.

Implemented approval-token verification in `tools/patch-engine/src/approval/verify-token.ts`. The verifier decodes the live MCP signer format (`base64(JSON.stringify(payload) + "." + signatureHex)`), checks HMAC-SHA256 with `crypto.timingSafeEqual`, validates the archived SPEC-02 payload fields, binds `plan_id` and `world_slug` to the envelope, checks expiry, compares `patch_hashes[]` against `canonicalOpHash(op)`, and rejects replayed token hashes recorded in `approval_tokens_consumed`.

Added `tools/world-index/src/schema/migrations/003_approval_tokens_consumed.sql`, bumped `CURRENT_INDEX_VERSION` to 3, and updated schema tests to assert the new table during fresh-create and version-upgrade paths.

## Verification Result

1. `cd tools/patch-engine && npm run build` — passed.
2. `cd tools/world-mcp && npm run build` — passed.
3. Cross-boundary verifier probe using `tools/world-mcp/dist/src/approval/token.js#signToken` and `tools/patch-engine/dist/src/approval/verify-token.js#verifyApprovalToken` — passed success + replay behavior.
4. `cd tools/world-index && npm run build` — passed.
5. `cd tools/world-index && npm run test` — passed, 55/55 tests.
6. `grep -n "approval_tokens_consumed" tools/world-index/src/schema/migrations/*.sql` — found the DDL in `003_approval_tokens_consumed.sql`.
7. `grep -c "^export function verifyApprovalToken\|^export function markTokenConsumed\|^export function canonicalOpHash" tools/patch-engine/src/approval/verify-token.ts` — returned 3.
8. Temp SPEC-13 atomic world build with `node tools/world-index/dist/src/cli.js build atomic-world`, followed by a readonly SQLite schema probe — passed; `approval_tokens_consumed` exists with `token_hash TEXT PRIMARY KEY`.

## Deviations

1. The intake ticket pointed at inline DDL under `tools/world-index/src/index/open.ts`; live world-index schema ownership is versioned migrations plus `CURRENT_INDEX_VERSION`, so the implementation added migration `003_approval_tokens_consumed.sql` instead.
2. The intake ticket named an older `{plan_hash, nonce}` token payload. The verifier implements the archived SPEC-02 payload `{plan_id, world_slug, patch_hashes, issued_at, expires_at}` and treats envelope plan/world mismatch as `approval_hash_mismatch`.
3. Adjacent package docs were inspected during closeout. `tools/patch-engine/README.md` still documents the broader pre-SPEC-13 engine vocabulary, but that rewrite is explicitly owned by `tickets/SPEC03PATENG-006.md`; this ticket only lands the approval verifier and schema migration.

## Post-Review Blocker Resolution (2026-04-25)

Resolved. Post-ticket review found that `tools/world-mcp/src/approval/token.ts` emits the live approval token as one base64 string containing `JSON.stringify(payload) + "." + signatureHex`, while the initial `tools/patch-engine/src/approval/verify-token.ts` implementation expected `<base64-payload>.<base64-hmac>`. The verifier now parses the live MCP token format and the final proof signs with `signToken(...)`, verifies with `verifyApprovalToken(...)`, marks the token consumed, and confirms replay rejection.
