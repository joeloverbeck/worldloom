# MCPENH-045: compute-pg-hashes CLI + shared canonical-JSON helpers for deterministic PG hash computation

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/world-index/src/hash/content.ts` (new exports: `canonicalJsonStringify`, `sha256OfUtf8`, `computePgStateHash`, `computePlanHash`); `tools/world-mcp/src/cli/compute-pg-hashes.ts` (new CLI script); `tools/world-mcp/package.json` (register `compute-pg-hashes` bin entry and add to build script); `.claude/skills/_shared-templates/story-state-contract.md` (§4.2a "Tooling" paragraph naming the CLI as the canonical hash-computation surface for `branching-story-bootstrap` Phase 7 and `branching-story-turn-cycle` Phase 9). The validator package (VALENH-019) consumes the same `canonicalJsonStringify` / `computePgStateHash` helpers — single source of truth for canonical-JSON across authoring and validation paths.
**Deps**: `archive/tickets/VALENH-016-enforce-pg-plan-hash-and-state-hash-sha256.md` (predecessor: enforced sha256 shape on PG hash fields but provided no canonical computation tooling — every PG-authoring skill had to JIT a script); `tickets/VALENH-019.md` (companion: validator-side consumer of the shared helpers introduced here; the two tickets land together).

## Problem

The shared story state contract `.claude/skills/_shared-templates/story-state-contract.md` §4.2a specifies the deterministic PG hash computation in prose:

- `plan_hash` = sha256 over the exact UTF-8 bytes of `pages-prose-plans/PG-<integer>.md`
- `state_hash` = sha256 over the canonical-JSON serialization of the PG fork-state payload (the complete PG mapping except `state_hash` itself and `rendered_prose`)
- Canonical JSON = objects with keys sorted lexicographically at every depth, arrays in authored order, UTF-8 strings, no insignificant whitespace, no anchors

But §4.2a leaves the *implementation* to each skill. Every PG-authoring skill (`branching-story-bootstrap` Phase 7, `branching-story-turn-cycle` Phase 9) must rediscover the canonical-JSON algorithm in working memory. The canonical pattern is non-obvious — `localeCompare` vs byte-comparison sorts diverge on non-ASCII keys; whether to include `prose_path` / `prose_plan_path` legacy fields requires reading the schema; the exclusion set (`state_hash`, `rendered_prose`) must be applied to a buffer that is otherwise byte-identical to the on-disk record.

Concrete trigger this session (2026-05-13): `branching-story-turn-cycle` invoked on `worlds/erotica-world/stories/red-bunny/` for PG-2 had to JIT a script at `/tmp/compute-pg2-hash.js` to compute the hashes. The script had an authoring bug — `validation_trace.parent_snapshot_compatibility` contained truncated text (`d5acd57086758...4b639ae` ellipsis) while the actual patch envelope submitted the full hash. Result: the initially committed PG-2 record's `state_hash = f4f268d5b6ca0212b33a218351a7f2c307dfd77757cd3212ba97d10930742f93` differed from the canonical hash of its on-disk content (`25d7a8cb5be13e13d1d3163b68ee453359e1a529246673d12c76ba71db2909b3`). The validator did not catch this at the time because the new-schema replay branch (VALENH-019) did not yet exist; the PG-2 repair landed in `archive/tickets/PEENH-009-story-record-field-repair.md`.

The user's question in-session: "Shouldn't we make it into a permanent CLI app or something, and instruct its use in a common document shared by any story-related skill that may use it?" — the answer is yes; this ticket lands it.

## Assumption Reassessment (2026-05-13)

1. **Codebase reassessment.** `git show HEAD:tools/world-index/src/hash/content.ts` exports only `sha256Hex` (NFC-normalized), `normalizeProseWhitespace`, and `serializeStableYaml`. No `canonicalJsonStringify`. No `computePgStateHash`. `git show HEAD:tools/world-mcp/src/cli/` lists only `sign-approval-token.ts`, `submit-patch-plan.ts`, `validate-patch-plan.ts` — no `compute-pg-hashes.ts`. `git status --porcelain` at audit time shows `M tools/world-index/src/hash/content.ts`, `M tools/world-mcp/package.json`, `?? tools/world-mcp/src/cli/compute-pg-hashes.ts`, `M .claude/skills/_shared-templates/story-state-contract.md` — uncommitted in-session work implements this ticket; the landed version should match the working-tree shape. Verified by `ls tools/world-mcp/src/cli/` (working tree has the file) and `node tools/world-mcp/dist/src/cli/compute-pg-hashes.js --help` (CLI runs).
2. **Doc reassessment.** `.claude/skills/_shared-templates/story-state-contract.md` §4.2a is the contract specification; no implementation pointer at HEAD. `archive/tickets/VALENH-016.md` enforces sha256 shape via `^[0-9a-f]{64}$` regex but provides no computation surface. `archive/tickets/MCPENH-*` content-grep for `compute-pg-hashes|canonicalJsonStringify|plan_hash|computePgStateHash` returns zero matches — no prior ticket attempts this surface.
3. **Shared boundary under audit.** The canonical-JSON serialization sits at the intersection of (a) `branching-story-bootstrap` Phase 7 hash-computation steps, (b) `branching-story-turn-cycle` Phase 9 step 2/3 hash-computation steps, (c) `tools/validators/src/structural/snapshot-replay-equality.ts`'s drift-detection comparison (VALENH-019), and (d) any future PG-record-touching skill (e.g., `branching-story-health-audit` if it ever verifies hashes). All four consumers need byte-identical canonical-JSON output. The shared boundary is the canonical-JSON algorithm itself; the implementation must live in the lowest-level package depended on by all consumers — that is `@worldloom/world-index` (depended on by `@worldloom/validators` and `@worldloom/world-mcp`).
4. **FOUNDATIONS principle under audit.** Tooling Recommendation (§"non-negotiable"): "LLM agents should never operate on prose alone." For PG hash authoring, the prose surface is §4.2a's algorithm description; the machine-facing surface is the CLI this ticket introduces. Without the CLI, every skill operates on prose alone for canonical-JSON serialization — the empirically-observed bug (PG-2 truncated-text inconsistency) is the cost. Rule 6 (No Silent Retcons) retcon justification: existing skills compute hashes inline via ad-hoc scripts; this ticket replaces that with a single canonical CLI plus shared library helpers. The session-evidence one-liner (PG-2's bad hash) is the audit's emergence-warrant.
5. **Pipeline-wide blast-radius scan for the new symbols.** `grep -rn 'canonicalJsonStringify|computePgStateHash|computePlanHash|sha256OfUtf8' tools/ .claude/skills/ docs/ specs/` — at HEAD, zero matches anywhere. The new symbols are introduced cleanly; no rename / replace risk. Consumers added by this ticket: `tools/world-mcp/src/cli/compute-pg-hashes.ts` (the CLI); `tools/validators/src/structural/snapshot-replay-equality.ts` (replaces local `sortJson`/`stableJson` with `canonicalJsonStringify`, adds `computePgStateHash` for the state_hash equality check — landed by VALENH-019).
6. **Adjacent contradictions.** (a) At intake, PG-2 in `worlds/erotica-world/stories/red-bunny/` carried the inconsistent state_hash that motivated this ticket; classified as: separate bug, since repaired by `archive/tickets/PEENH-009-story-record-field-repair.md`. (b) Target skill `branching-story-turn-cycle` SKILL.md Phase 9 step 2/3 prose describes the hash computation inline rather than pointing at the new CLI; classified as: skill-prose drift, routed via `/skill-audit .claude/skills/branching-story-turn-cycle` (and `branching-story-bootstrap` for symmetry — its Phase 7 hash steps describe the same algorithm inline).
7. **Mismatch + correction.** Working-tree-vs-HEAD: uncommitted in-session edits to `tools/world-index/src/hash/content.ts`, `tools/world-mcp/package.json`, `.claude/skills/_shared-templates/story-state-contract.md` and the new file `tools/world-mcp/src/cli/compute-pg-hashes.ts` partially implement this ticket. The Phase 5 codebase verification was performed against HEAD (`git show HEAD:<path>` + directory listings); the landed version should match the working-tree shape. The CLI was smoke-tested in-session against PG-1 (root page, committed by `branching-story-bootstrap`): `node tools/world-mcp/dist/src/cli/compute-pg-hashes.js --plan worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-1.md --pg worlds/erotica-world/stories/red-bunny/_source/pages/PG-1.yaml` reproduces the committed `plan_hash = c58469f6…` and `state_hash = d5acd570…` exactly.

## Architecture Check

1. **Why this approach over alternatives.**
   - *Option A (chosen): shared canonical-JSON helpers in `@worldloom/world-index/hash/content` (lowest-level package), CLI wrapper in `@worldloom/world-mcp/cli/` (sibling to existing `sign-approval-token` / `submit-patch-plan` / `validate-patch-plan`), `bin` registration + build chmod.* The lowest-level package placement means both `@worldloom/validators` and `@worldloom/world-mcp` import the same helpers — single source of truth for canonical-JSON. The CLI placement is sibling-to-existing pattern; no new package, no new test framework, no new build step beyond `chmod +x`. The shared-template doc pointer at §4.2a is the discovery surface for every PG-authoring skill.
   - *Option B (rejected): a sibling package `@worldloom/canonical-hash` containing only the helpers.* Over-engineered. The hash utilities already cohabit `world-index/src/hash/content.ts` (existing `sha256Hex`); adding the canonical-JSON cousin is the natural extension.
   - *Option C (rejected): inline the helpers in `@worldloom/world-mcp` and have `@worldloom/validators` reimplement them locally.* Two implementations means two truths means drift is inevitable. The PG-2 truncated-text bug is the empirical demonstration of why ad-hoc rediscovery fails.
2. **No backwards-compatibility aliasing/shims introduced.** Existing exports from `world-index/hash/content` (`sha256Hex`, `normalizeProseWhitespace`, `serializeStableYaml`) are untouched. The new `canonicalJsonStringify` is additive. The new CLI is a new bin entry; it does not replace or alias any existing CLI. The shared-template §4.2a "Tooling" paragraph is a new section in the existing §4.2a; the prose-level algorithm description above it remains unchanged.

## Verification Layers

1. **Invariant**: every PG record's `plan_hash` equals `computePlanHash(<plan-bytes-on-disk>)` and every PG record's `state_hash` equals `computePgStateHash(<pg-record-with-state_hash-stripped>)` → CLI smoke test reproducing committed PG-1 hashes (the audit ran this in-session and got exact matches: `c58469f6…` and `d5acd570…`); validator-side state_hash equality verdict from VALENH-019.
2. **Invariant**: canonical-JSON serialization is deterministic and locale-independent → unit tests in `tools/world-index/tests/hash/content.test.ts` (or sibling test file) covering: key ordering with non-ASCII keys, nested object handling, array-order preservation, null/boolean/number/string fidelity, byte-exact reproducibility across runs.
3. **Invariant**: single source of truth for canonical-JSON across authoring and validation → codebase grep-proof that `tools/validators/src/` and `tools/world-mcp/src/cli/` import `canonicalJsonStringify` from `@worldloom/world-index/hash/content` and do NOT reimplement it locally.
4. **Invariant**: CLI argument-handling and error paths follow the existing world-mcp CLI pattern → unit / integration test on the CLI's `runComputePgHashesCli` exported function exercising help text, missing-argument errors, file-not-found errors, malformed-YAML errors, and the happy path.

## What to Change

### 1. `tools/world-index/src/hash/content.ts` — shared canonical-JSON helpers

Add (alongside existing exports):

```typescript
export const ACTIVE_RECORDS_CLASSES = [...]; // (see VALENH-019; alternatively colocate here)

function canonicalize(value: unknown): unknown {
  // recursive key-sort by < / > comparison (byte-order semantics, not localeCompare)
}

export function canonicalJsonStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function sha256OfUtf8(input: string | Buffer): string {
  // raw sha256 hex; no NFC normalization (vs the existing sha256Hex)
}

const PG_STATE_HASH_EXCLUDED_FIELDS: ReadonlySet<string> = new Set([
  "state_hash",
  "rendered_prose"
]);

export function computePgStateHash(pgRecord: Record<string, unknown>): string {
  // strip excluded fields; canonicalJsonStringify; sha256OfUtf8
}

export function computePlanHash(planBytes: string | Buffer): string {
  return sha256OfUtf8(planBytes);
}
```

`canonicalize` uses byte-order key comparison (`a < b ? -1 : a > b ? 1 : 0`), not `localeCompare`. Locale-sensitive sort can diverge on non-ASCII keys; byte-order is RFC-8785-aligned and matches what the validator's drift-detection uses.

### 2. `tools/world-mcp/src/cli/compute-pg-hashes.ts` — CLI wrapper

New file following the existing CLI pattern (`validate-patch-plan.ts` shape):
- `parseCli(argv)` accepts `--plan <path>` and `--pg <path>`; `--help` prints usage; missing args produce exit 2 with usage to stderr.
- `readPlanBytes(path)` reads the plan file as a `Buffer` (no encoding arg → no normalization).
- `readPgRecord(path)` reads the PG file as UTF-8 text, parses via `yaml` (handles both JSON and YAML inputs; YAML is a superset of JSON for our use cases).
- Compute `planHash` first via `computePlanHash`; then overwrite `pg.plan.plan_hash` with the computed value in the canonical payload (so callers can pass a draft PG record with placeholders for both hashes); then compute `stateHash` via `computePgStateHash`.
- Output `{ plan_hash, state_hash }` as pretty JSON to stdout; exit 0 on success.

### 3. `tools/world-mcp/package.json` — bin + build wiring

Add `compute-pg-hashes` to `bin` and `dist/src/cli/compute-pg-hashes.js` to the `build` script's chmod list. Sibling to existing `sign-approval-token` / `submit-patch-plan` / `validate-patch-plan`.

### 4. `.claude/skills/_shared-templates/story-state-contract.md` §4.2a — Tooling paragraph

Insert a "Tooling" paragraph after the existing prose-level algorithm description. Pattern:

> **Tooling.** Every PG-authoring skill (`branching-story-bootstrap` Phase 7 hash steps, `branching-story-turn-cycle` Phase 9) MUST compute these hashes through the canonical CLI at `tools/world-mcp/dist/src/cli/compute-pg-hashes.js`, not through ad-hoc one-off scripts. The CLI reuses the same `canonicalJsonStringify` / `computePgStateHash` / `computePlanHash` helpers exported from `@worldloom/world-index/hash/content` that the validator package (`snapshot_replay_equality`) uses for drift detection, so authoring-time hashes and validation-time drift comparisons are byte-identical by construction.
>
> ```
> node tools/world-mcp/dist/src/cli/compute-pg-hashes.js \
>   --plan <path-to-page-plan-bytes>.md \
>   --pg   <path-to-pg-draft>.{yaml,json}
> ```
>
> The CLI emits `{plan_hash, state_hash}` as JSON to stdout (exit 0 on success). Pass a draft PG record that contains placeholder values for both hashes (or omits them entirely); the CLI ignores the input's `state_hash` field and overwrites the input's `plan.plan_hash` in the canonical payload with the value computed from `--plan`. Hand-rolling the canonical-JSON serializer is a known source of drift bugs (truncated strings, locale-sensitive sort orders, accidentally-included `rendered_prose` block) and is forbidden; if the CLI does not fit a workflow, the workflow is incomplete — open a CLI-extension ticket before bypassing it.

## Files to Touch

- `tools/world-index/src/hash/content.ts` (modify)
- `tools/world-mcp/src/cli/compute-pg-hashes.ts` (new)
- `tools/world-mcp/package.json` (modify)
- `.claude/skills/_shared-templates/story-state-contract.md` (modify — §4.2a Tooling paragraph)
- `tools/world-index/tests/hash/content.test.ts` (new or modify — canonical-JSON / sha256OfUtf8 / computePgStateHash / computePlanHash unit tests)
- `tools/world-mcp/tests/cli/compute-pg-hashes.test.ts` (new — CLI parseCli / file-IO / happy-path / error-path tests)

## Out of Scope

- Updating `branching-story-turn-cycle` / `branching-story-bootstrap` SKILL.md Phase prose to instruct the operator to invoke the CLI (in addition to the shared-template §4.2a Tooling reference). Routed to `/skill-audit` per the audit's Phase 8 sibling handoff — the skills' Phase prose currently describes the hash algorithm inline.
- Validator-side consumption of the new helpers (`canonicalJsonStringify`, `computePgStateHash`). Owned by `tickets/VALENH-019.md` (companion).
- Engine-side enforcement that submitted PG records' hashes match the canonical values. The validator already gains a `state_hash_mismatch` verdict via VALENH-019; a separate engine-side gate is not in scope.
- Repairing the inconsistent PG-2.state_hash. Completed by `archive/tickets/PEENH-009-story-record-field-repair.md`.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-index && npm test` — all existing tests pass; new canonical-JSON / hash unit tests pass.
2. `cd tools/world-mcp && npm test` — all existing tests pass; new CLI tests pass.
3. `cd tools/validators && npm test` — VALENH-019's validator path now consumes the shared helpers cleanly; all 22+ tests pass.
4. `node tools/world-mcp/dist/src/cli/compute-pg-hashes.js --plan worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-1.md --pg worlds/erotica-world/stories/red-bunny/_source/pages/PG-1.yaml` → prints `{plan_hash: "c58469f6a87562fb9fcd8b8a5f31e62c03b599c3761c7ed8f2ebbf9564e7f5ce", state_hash: "d5acd5708675880e96d56b52a137f945d2681c913a82bed06f3c18a324b639ae"}` (reproduction of the committed PG-1 hashes).
5. `node tools/world-mcp/dist/src/cli/compute-pg-hashes.js --help` → prints the help text; exit 0.

### Invariants

1. The canonical-JSON serializer in `@worldloom/world-index/hash/content` is the SINGLE source of truth for canonical-JSON across worldloom. Codebase grep for `localeCompare|JSON\.stringify.*sort|sortJson|stableJson` in `tools/validators/src/`, `tools/world-mcp/src/`, `tools/patch-engine/src/` returns zero matches outside the shared helper file itself.
2. The CLI's output is deterministic and reproducible: identical input files always produce identical `plan_hash` / `state_hash` output. The output is locale-independent: `LC_ALL=C` and `LC_ALL=en_US.UTF-8` produce the same hashes.
3. The CLI ignores the input PG record's stale `state_hash` field (callers may pass drafts with placeholder values for both hashes); the CLI overwrites the input's `plan.plan_hash` in the canonical payload with the freshly-computed value from `--plan`.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/hash/content.test.ts` — unit tests for `canonicalJsonStringify` (key ordering, nested objects, arrays preserved, null/boolean/number/string fidelity), `sha256OfUtf8` (string vs Buffer input parity, NFC vs non-NFC divergence vs `sha256Hex`), `computePgStateHash` (excluded fields, byte-exact reproducibility), `computePlanHash` (Buffer input → byte-exact hash of file content).
2. `tools/world-mcp/tests/cli/compute-pg-hashes.test.ts` — CLI tests parallel to the existing `validate-patch-plan` test shape: help text, missing-arg errors, file-not-found errors, malformed-YAML errors, happy path against a fixture PG.

### Commands

1. `cd tools/world-index && npm test`
2. `cd tools/world-mcp && npm test`
3. `cd tools/validators && npm test` (VALENH-019's consumer-side test surface must pass against the new shared helpers)
4. `node tools/world-mcp/dist/src/cli/compute-pg-hashes.js --plan worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-1.md --pg worlds/erotica-world/stories/red-bunny/_source/pages/PG-1.yaml` — reproduction smoke test against committed PG-1.
