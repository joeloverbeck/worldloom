# HOOK-003: Block prose-receipt writes when stamped `prose_hash` does not match the on-disk prose-file sha256

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — new `tools/hooks/src/hook7-guard-prose-receipt-hash.ts` source + test, `tools/hooks/README.md` row, `.claude/settings.json.example` `PreToolUse` entry, and same-seam direct-write discipline notes in `docs/HARD-GATE-DISCIPLINE.md`, `.claude/skills/_shared-templates/story-state-contract.md`, and `.claude/skills/branching-story-prose-attach/SKILL.md`.
**Deps**: `archive/tickets/VALENH-023.md` (the validator that established the receipt schema and the shape-only `prose_hash` pattern check), `archive/tickets/VALENH-029.md` (the recompute-and-compare precedent in the author-time-hash-integrity family)

## Problem

At intake, `branching-story-prose-attach` Phase 6 step 4b wrote the receipt at `pages-prose-receipts/PG-<integer>.yaml` as a direct-write artifact (not patch-engine routed; FOUNDATIONS §Story Bundles §4 Write Discipline lists these among the story-bundle markdown/YAML direct-write surfaces). The receipt stamps `prose_hash: <computed_prose_hash>`, defined by the skill at Phase 1 as "sha256 over the prose file's bytes." The operator was expected to compute this value and stamp it into the receipt before the Write call landed.

Before this ticket, nothing structurally verified that the stamped `prose_hash` was actually the sha256 of the file at the receipt's `prose_path`. The intake chain was:

1. `tools/validators/src/schemas/prose-receipt.schema.json:26` requires `prose_hash` to match `^[0-9a-f]{64}$` — shape only.
2. `tools/validators/src/structural/prose-receipt-schema-compliance.ts` runs the shape check (per VALENH-023) — shape only.
3. At intake, no validator under `tools/validators/src/structural/` recomputed the prose-file sha256 and compared it to the stamped value. The intake `grep -rEn 'prose_hash|sha256.*prose' tools/validators/src tools/world-mcp/src tools/world-index/src tools/hooks` returned only the shape constraints and one description string in `story-page.schema.json`.
4. The symmetric write-surface case for `pages-prose-plans/PG-<integer>.md` ↔ `PG.plan.plan_hash` is covered by Hook 6 (`tools/hooks/src/hook6-guard-story-markdown-hash.ts`; configured in `.claude/settings.json.example:44-56` `PreToolUse:Edit|Write`). No analogous hook covers `pages-prose-receipts/`.

The session in which this ticket was filed exposed the gap concretely: a `branching-story-prose-attach` run for PG-4 of `worlds/erotica-world/stories/red-bunny/` stamped `prose_hash: 9ba816d57c0eb5cb6c3f5f1efaa2a4f51e35d10e91d4b5d3a0fdfb88f7f9c9aa` into `pages-prose-receipts/PG-4.yaml`. The actual sha256 of `pages-prose/PG-4.md` is `de609ff6b427623b1cf3770e9719ac20fc41f90152d7b9da557a13e3f350e5dd`. The fabricated 64-hex value passed `prose_receipt_schema_compliance` shape validation and landed silently — exactly the failure mode VALENH-029 named when it stated "A hash that is never recomputed is decorative."

The landed `PreToolUse:Edit|Write` hook is scoped to `pages-prose-receipts/PG-*.yaml`; it parses the pending receipt, resolves `prose_path` relative to the bundle root, computes sha256 of that file, and blocks on mismatch. This closes the silent-fabrication / silent-tampering surface at write time.

## Assumption Reassessment (2026-05-23)

1. **Codebase reassessment** — At intake, `grep -rEn 'prose_hash|prose.+hash|sha256.*prose|computed_prose_hash' tools/validators/src tools/world-mcp/src tools/world-index/src tools/hooks` returned: (a) `tools/validators/src/schemas/prose-receipt.schema.json:11` and `:26` — schema requires the field with `^[0-9a-f]{64}$` pattern; (b) `tools/validators/src/schemas/story-page.schema.json:134` — description string only on a sibling schema. No file under `tools/validators/src/structural/` recomputed the prose-file sha256. No file under `tools/hooks/src/` covered `pages-prose-receipts/`. Hook 6 (`tools/hooks/src/hook6-guard-story-markdown-hash.ts`) existed for the symmetric `pages-prose-plans/PG-*.md` ↔ `PG.plan.plan_hash` case and uses Node's `createHash("sha256").update(bytes).digest("hex")` directly; the same helper is the canonical pattern in `@worldloom/world-index/hash/content` (`tools/world-index/src/hash/content.ts` `sha256Hex`).
2. **Doc reassessment** — `.claude/skills/branching-story-prose-attach/SKILL.md` Phase 1 names `computed_prose_hash: sha256 over the prose file's bytes` and Phase 6 step 1 inlines `prose_hash: <computed_prose_hash>` in the receipt template, without naming the compute mechanism (shell `sha256sum` vs. CLI tool vs. helper invocation). At intake, `tools/hooks/README.md:15-18` already documented Hook 3 and Hook 6 entries; the README gained a Hook 7 row. `.claude/skills/_shared-templates/story-state-contract.md` §4.6 is the canonical receipt schema; this ticket did not change the schema, only the at-write enforcement around `prose_hash`.
3. **Shared boundary** — the prose-receipt audit-trail integrity contract shared by: `branching-story-prose-attach` Phase 6 step 4b (receipt write), `tools/validators/src/structural/prose-receipt-schema-compliance.ts` (shape validator from VALENH-023), `tools/validators/src/structural/prose-receipt-stchar-integrity.ts` (STCHAR consistency validator), and the broader author-time-hash-integrity family (VALENH-026/028/029/030 — recompute-and-compare for `SF.derived_from`, `STCHAR.source_char_hash`, `STCHAR.profile_hash`/`voice_block_hash`, `STCHAR.page_packet_hash`). The boundary under audit is the at-write surface for the receipt artifact; Hook 6 already covers the symmetric plan-file surface and is the structural precedent.
4. **FOUNDATIONS principle restatement** — FOUNDATIONS Rule 6 (No Silent Retcons) governs all canon changes; while prose receipts are not world canon, they are story-pipeline audit-trail artifacts that record the validation provenance of a rendered prose against committed state. A receipt whose `prose_hash` does not pin actual prose bytes is a silent retcon of the audit trail: it asserts "I validated this prose" while the bytes the assertion claims to pin are unverified. FOUNDATIONS §Story Bundles §4a (Plan-Authority Boundary) makes the page snapshot authoritative at page-plan commit; the receipt sits downstream and must not undermine that authority by recording fabricated content provenance. This ticket adds the integrity check that prevents the silent-audit-trail-retcon failure mode at the surface where it can land.
5. **Canon Safety surface** — modifications fall within `tools/hooks/` per the per-ticket-type granularity for Canon Safety surfaces (mcp-integration-audit §Phase 7 step 3). The hook does not modify HARD-GATE approval ordering, canon-write ordering, or the Mystery Reserve firewall; it adds a new write-time validator on the non-canon `pages-prose-receipts/` surface. Hook 3's engine-only-write enforcement on `_source/*.yaml` is untouched. Hook 6's pages-prose-plans coverage is untouched. The new Hook 7 entry sits in the existing `PreToolUse:Edit|Write` matcher group alongside Hook 3 and Hook 6 in `.claude/settings.json.example`.
6. **Adjacent contradiction (future cleanup that must become its own ticket)** — VALENH-029 ("A hash that is never recomputed is decorative") and the VALENH-026/028/029/030 author-time-hash-integrity family established the pattern of validator-side recompute-and-compare for hash fields. A symmetric VALENH ticket extending `prose_receipt_schema_compliance` (or adding a sibling `prose_receipt_hash_integrity`) would close the on-demand validation surface (catches later prose-file drift when `world-validate` runs incrementally on receipt files). This ticket scopes only the at-write hook because receipts are direct-write artifacts and Hook 6 is the closer structural precedent; the validator-parity follow-up is a separate ticket and must not be folded in.

## Architecture Check

1. **Hook over validator extension for at-write enforcement** — Hook 6 already establishes the at-write hash-integrity pattern for the symmetric pages-prose-plans surface; mirroring it for pages-prose-receipts keeps the at-write enforcement family coherent and discoverable from `tools/hooks/README.md`. Extending `prose_receipt_schema_compliance` would not fire on direct writes — that validator's `applies_to` skips `pre-apply` and runs only in `incremental` mode when invoked with a touched-files list (and prose-receipt direct writes do not trigger an automatic validator invocation; receipts are not patch-engine routed). The hook fires on every Write/Edit unconditionally.
2. **Deny over warn** — Hook 6 was narrowed to warn-only per SPEC-72 because plan-file drift after PG commit is advisory (the plan body is a render input, not committed state). Prose-receipt `prose_hash` drift is a different failure mode: it indicates either fabrication at receipt-authoring time or tampering after; both are audit-trail-integrity violations rather than advisory render drift. Deny is the correct enforcement mode.
3. **Reuse of `@worldloom/world-index/hash/content` `sha256Hex`** — the same helper used by `compute-pg-hashes`, the VALENH-029 body-recompute path, and Hook 6's direct `createHash` invocation. No new hash helper introduced; no backwards-compatibility shims.

## Verification Layers

1. Hook fires on `pages-prose-receipts/PG-*.yaml` Edit/Write only, not on other story-bundle markdown writes → unit test in `tools/hooks/tests/hook7-guard-prose-receipt-hash.test.ts` exercising path-scope inclusion (receipt match) and exclusion (sibling `pages-prose-plans/`, `STORY_KERNEL.md`, `INDEX.md`).
2. Hook denies when stamped `prose_hash` ≠ sha256 of file at receipt's `prose_path` → unit test with fixture pair: receipt stamping a fabricated 64-hex value vs. real prose file; expect deny verdict with diagnostic message naming both hashes.
3. Hook allows when stamped `prose_hash` = sha256 of file at receipt's `prose_path` → unit test with matching fixture pair; expect allow verdict.
4. Hook handles edge cases (receipt YAML unparseable, `prose_path` missing, prose file missing) → unit tests asserting deny verdict with explicit diagnostic for each case (do not silently allow on malformed input).
5. Hook 7 entry is reachable in the configured `PreToolUse:Edit|Write` matcher group → grep proof `grep -n 'hook7-guard-prose-receipt-hash' .claude/settings.json.example`.

## Landed Changes

### 1. New hook source `tools/hooks/src/hook7-guard-prose-receipt-hash.ts`

Created `tools/hooks/src/hook7-guard-prose-receipt-hash.ts`, mirroring `tools/hooks/src/hook6-guard-story-markdown-hash.ts` structure:

- Matches path pattern against `worlds/<world-slug>/stories/<story-slug>/pages-prose-receipts/PG-<integer>.yaml` (absolute or relative).
- Parses the pending body (Write's `content` or Edit's resulting body) for top-level YAML scalar fields; extracts `prose_path` and `prose_hash`. On parse error or missing fields, emits a deny verdict with explicit diagnostic.
- Resolves `prose_path` relative to the bundle root (the path captured by the regex prefix on the receipt path), denying absolute paths and path escapes.
- Reads the prose file; computes sha256 via `createHash("sha256").update(bytes).digest("hex")`.
- Compares the stamped and computed hashes; on mismatch, emits `permissionDecision: "deny"` with a diagnostic naming the receipt path, stamped hash, computed hash, and prose file path. On match, emits `permissionDecision: "allow"`.
- On prose file missing or unreadable, emits deny with diagnostic naming the missing path — never silently allows.
- Logs allow and deny decisions via `logDecision` from `tools/hooks/src/lib/logging.ts`.

### 2. New hook test `tools/hooks/tests/hook7-guard-prose-receipt-hash.test.ts`

Created `tools/hooks/tests/hook7-guard-prose-receipt-hash.test.ts` with one `node:test` case per condition:

1. Path outside receipt scope (e.g., `pages-prose-plans/PG-1.md`, `STORY_KERNEL.md`) → allow without parsing.
2. Receipt with matching `prose_hash` → allow.
3. Receipt with fabricated `prose_hash` (64-hex but wrong) → deny with diagnostic.
4. Receipt with missing `prose_hash` field → deny with diagnostic.
5. Receipt with missing `prose_path` field → deny with diagnostic.
6. Receipt with `prose_path` pointing at a non-existent file → deny with diagnostic.
7. Unparseable YAML body → deny with diagnostic.

The test uses `tools/hooks/tests/_shared.ts` helpers to mirror Hook 6's test scaffold.

### 3. `tools/hooks/README.md` row

Added the Hook 7 row to the table and updated package status/testing prose:

```
| 7 | `PreToolUse:Edit\|Write` | Block direct writes to story-bundle `pages-prose-receipts/PG-*.yaml` when the stamped `prose_hash` does not match sha256 of the file at the receipt's `prose_path`. Receipts are direct-write audit-trail artifacts and must pin actual prose bytes; fabrication or post-write prose-file edits are caught here. | 2 |
```

### 4. `.claude/settings.json.example` entry

Added a new entry in the `PreToolUse:Edit|Write` matcher group:

```json
{
  "_phase": 2,
  "_spec": "HOOK-003 Hook 7",
  "_purpose": "Block direct Edit/Write to pages-prose-receipts/PG-*.yaml when stamped prose_hash does not match on-disk prose-file SHA-256. Receipts are audit-trail artifacts; a mismatch indicates fabrication or tampering and must not land silently.",
  "matcher": "Edit|Write",
  "hooks": [
    {
      "type": "command",
      "command": "node tools/hooks/dist/src/hook7-guard-prose-receipt-hash.js"
    }
  ]
}
```

### 5. Same-seam direct-write discipline docs

Updated the current operational docs that describe direct-write story-bundle hash guards so they no longer imply Hook 6 is the only additional guard:

- `docs/HARD-GATE-DISCIPLINE.md` execution pattern
- `.claude/skills/_shared-templates/story-state-contract.md` write discipline summary
- `.claude/skills/branching-story-prose-attach/SKILL.md` Phase 6 receipt-write note

## Files to Touch

- `tools/hooks/src/hook7-guard-prose-receipt-hash.ts` (new)
- `tools/hooks/tests/hook7-guard-prose-receipt-hash.test.ts` (new)
- `tools/hooks/README.md` (modify)
- `.claude/settings.json.example` (modify)
- `docs/HARD-GATE-DISCIPLINE.md` (modify)
- `.claude/skills/_shared-templates/story-state-contract.md` (modify)
- `.claude/skills/branching-story-prose-attach/SKILL.md` (modify)

## Out of Scope

- Validator-side recompute parity (extending `prose_receipt_schema_compliance` or adding `prose_receipt_hash_integrity`) — Reassessment item 6 names this as future cleanup that must become its own ticket.
- Repairing the fabricated `prose_hash` in `worlds/erotica-world/stories/red-bunny/pages-prose-receipts/PG-4.yaml` — that is a one-shot world-content repair (operator re-stamps the correct sha256), not a pipeline-coverage change. Out of scope here.
- Changing the receipt schema (`tools/validators/src/schemas/prose-receipt.schema.json`) — the schema already requires `prose_hash`; this ticket adds enforcement of its value, not its presence.
- Changing the `prose-attach` skill prose to name a specific compute mechanism (e.g., `sha256sum` invocation) — that is a `/skill-audit` follow-up, not a pipeline ticket.
- Modifying Hook 6's warn-mode behavior on the plan-file surface; this ticket only touches receipts.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/hooks && npm run build` — compiles the new TypeScript hook and test.
2. `node --test tools/hooks/dist/tests/hook7-guard-prose-receipt-hash.test.js` — runs only the new Hook 7 suite; all seven cases (path-scope inclusion / exclusion, matching hash, fabricated hash, missing prose_hash, missing prose_path, missing prose file, unparseable YAML) pass.
3. `cd tools/hooks && npm test` — runs the existing Hook 1-6 suites plus the new Hook 7 suite; all pass.
4. `grep -n 'hook7-guard-prose-receipt-hash' .claude/settings.json.example tools/hooks/README.md` — proves Hook 7 is configured and documented.

### Invariants

1. Every successful Edit/Write to a `pages-prose-receipts/PG-<integer>.yaml` file leaves the receipt's `prose_hash` equal to the sha256 of the file at the receipt's `prose_path`. (At-write integrity guarantee on the audit-trail artifact.)
2. The hook never silently allows a malformed receipt — every parse failure, missing-field condition, or missing-file condition emits a deny verdict with an explicit diagnostic.

## Test Plan

### New/Modified Tests

1. `tools/hooks/tests/hook7-guard-prose-receipt-hash.test.ts` — new test file with the seven cases enumerated in §Landed Changes item 2. Test scaffold mirrors `tools/hooks/tests/hook6-guard-story-markdown-hash.test.ts`.

### Commands

1. `cd tools/hooks && npm run build` — verifies the new TS source compiles; required before the targeted command below because the `tools/hooks/package.json` test script runs against compiled `dist/tests/*.test.js`.
2. `node --test tools/hooks/dist/tests/hook7-guard-prose-receipt-hash.test.js` — targeted verification of only the new Hook 7 suite after build.
3. `cd tools/hooks && npm test` — package-local full suite (per audit's "prefer package-local invocations" rule; the repo has no root `package.json` with `workspaces` declared, so `npm test --workspace=tools/hooks` would not resolve from the repo root).
4. `grep -n 'Hook 7\\|hook7-guard-prose-receipt-hash\\|prose_hash' tools/hooks/README.md .claude/settings.json.example docs/HARD-GATE-DISCIPLINE.md .claude/skills/_shared-templates/story-state-contract.md .claude/skills/branching-story-prose-attach/SKILL.md` — same-seam current-doc proof.

## Outcome

Completed on 2026-05-23.

Hook 7 now guards direct `Edit` / `Write` attempts against `worlds/<world-slug>/stories/<story-slug>/pages-prose-receipts/PG-<integer>.yaml`. It simulates the pending Write/Edit body, extracts `prose_path` and `prose_hash`, resolves the prose file inside the story bundle, computes sha256 over the prose file bytes, and denies the write when the stamped hash is missing, malformed by parse failure, points at a missing prose file, escapes the bundle, or differs from the recomputed hash.

The hook is registered in `.claude/settings.json.example`, documented in `tools/hooks/README.md`, and reflected in the current direct-write discipline docs for story-bundle receipts.

## Verification Result

Passed on 2026-05-23:

1. Baseline before edits: `cd tools/hooks && npm test` passed, 28 tests.
2. `cd tools/hooks && npm run build` passed.
3. `node --test tools/hooks/dist/tests/hook7-guard-prose-receipt-hash.test.js` passed, 7 tests.
4. `cd tools/hooks && npm test` passed, 35 tests.
5. `grep -n 'Hook 7\|hook7-guard-prose-receipt-hash\|prose_hash' tools/hooks/README.md .claude/settings.json.example docs/HARD-GATE-DISCIPLINE.md .claude/skills/_shared-templates/story-state-contract.md .claude/skills/branching-story-prose-attach/SKILL.md` returned current Hook 7 config, package docs, HARD-GATE discipline, shared story-state contract, and prose-attach skill hits.

Manual review confirmed the new hook leaves unrelated story-bundle files silent, denies fabricated `prose_hash` values with both stamped and computed hashes in the diagnostic, denies malformed/missing-field/missing-file cases, and allows matching receipt/prose pairs.

## Deviations

- The drafted manual smoke that would write a fabricated receipt under `worlds/erotica-world/` was replaced by a temp-repo compiled hook test. This proves the same hook decision without mutating live or gitignored world content.
- Same-seam docs were added to the touched set during closeout because live direct-write discipline docs otherwise still described Hook 6 as the only additional story-bundle hash guard.
- Hook 7 emits the Claude hook `permissionDecision` vocabulary (`allow` / `deny`) rather than the ticket draft's prose word "approve"; matching receipts produce `allow`.
