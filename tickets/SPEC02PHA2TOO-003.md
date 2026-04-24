# SPEC02PHA2TOO-003: `allocate_next_id` extension to INV / OQ / ENT / SEC record classes

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — extends `tools/world-mcp/src/tools/allocate-next-id.ts` (`ID_CLASS_FORMATS` grows from 12 entries to 24) and `tools/world-mcp/src/server.ts` (`ID_CLASSES` Zod enum expands in lockstep). No new files; no impact on existing tools beyond this strictly-additive enum extension.
**Deps**: None

## Problem

SPEC-02-PHASE2 §Deliverable 3 commits extending `mcp__worldloom__allocate_next_id` to support 5 INV per-category sub-classes (`ONT`/`CAU`/`DIS`/`SOC`/`AES`), `OQ`, `ENT`, and 7 SEC per-file-class sub-classes (`SEC-ELF`/`SEC-INS`/`SEC-MTS`/`SEC-GEO`/`SEC-ECR`/`SEC-PAS`/`SEC-TML`). Today `tools/world-mcp/src/tools/allocate-next-id.ts:4-17` supports only `CF`, `CH`, `PA`, `CHAR`, `DA`, `PR`, `BATCH`, `NCP`, `NCB`, `AU`, `RP`, `M` — 12 classes. Any plan creating an INV / OQ / ENT / SEC record today fails allocation.

Consumers named in the spec:
- **Direct**: SPEC-03 ticket SPEC03PATENG-009 (integration capstone — exercises new-class allocations in its plan-creation test matrix).
- **Indirect**: SPEC03PATENG-006 (apply orchestration — Phase A step 4 re-queries `allocate_next_id` for envelope allocation verification; without the extension, any plan containing INV/OQ/ENT/SEC creates fails at runtime).

## Assumption Reassessment (2026-04-25)

1. `tools/world-mcp/src/tools/allocate-next-id.ts:4-17` defines `ID_CLASS_FORMATS` as a const record of 12 classes. Each entry has `{ width, zeroPad, regex }`. Adding 12 new entries (5 INV + 1 OQ + 1 ENT + 7 SEC, minus 1 for M already present = 12) extends the const without removing any existing entry. Confirmed via `worlds/animalia/_source/invariants/` (files like `AES-1.yaml`, `ONT-1.yaml`) and `worlds/animalia/_source/geography/` (files like `SEC-GEO-001.yaml`) that the ID patterns already exist in live data.
2. `tools/world-mcp/src/server.ts:120-138` defines `ID_CLASSES` as a closed Zod enum matching the current 12 classes. The Zod enum MUST expand in lockstep with `ID_CLASS_FORMATS` — otherwise `allocateNextIdInputSchema` rejects the new `id_class` values at the MCP boundary before `allocateNextId` sees them. Confirmed via reassessment pre-apply verification table.
3. Shared boundary: the `ID_CLASS_FORMATS` keys and the `ID_CLASSES` Zod enum must stay in lockstep. Both act as closed unions; divergence silently breaks allocation. `CLAUDE.md:82` §Machine-facing layer integration documents the intended final class list, which this ticket brings into reality.
4. FOUNDATIONS principle under audit: Rule 5 (No Consequence Evasion). The spec's Problem Statement calls out that SPEC-03 ticket 006's `allocate_next_id` re-query fails for INV/OQ/ENT/SEC without this extension. Landing the extension is the consequence-resolution for that failure mode; skipping any sub-class (e.g., skipping `SEC-TML` because no timeline extension is currently imminent) would re-open the Rule-5 gap.
5. Extension shape: `ID_CLASS_FORMATS` is internal to `tools/world-mcp`; no other package imports it. The Zod enum `ID_CLASSES` is declared in `server.ts` and used only by `allocateNextIdInputSchema`. Both are additive-only extensions — no existing class changes format, no existing consumer breaks.

## Architecture Check

1. Strictly-additive extension: the 12 existing classes keep their exact formats (`CF`: width 4 zero-padded; `M`: width 1 unpadded; etc.). New classes are appended. This guarantees no allocation drift for existing consumers (canon-addition, create-base-world, etc.).
2. The per-prefix literal design rule (each `id_class` value IS the literal prefix of the allocated ID — `"ONT"` → `"ONT-7"`, `"SEC-GEO"` → `"SEC-GEO-004"`) keeps the tool's input surface flat. A nested discriminator (`{ class: "INV", sub_class: "ONT" }`) would force every caller to learn a two-level structure for no semantic benefit.
3. Per-category INV sub-class scanning is correct because INV records use a per-category 1-based counter (confirmed via `worlds/animalia/_source/invariants/AES-1.yaml`, `AES-2.yaml`, ..., `ONT-1.yaml`, etc.). A cross-category monotonic counter would produce collisions the first time two categories are extended in the same world.
4. No backwards-compatibility aliasing/shims introduced. Existing 12 classes retain their exact regexes; the allocator scan loop at `allocate-next-id.ts:52-77` works unchanged against the expanded `ID_CLASS_FORMATS`.

## Verification Layers

1. New `id_class` values accepted by Zod → codebase grep-proof (`grep -n "ONT\|CAU\|DIS\|SOC\|AES\|OQ\|ENT\|SEC-" tools/world-mcp/src/server.ts` confirms the enum expanded).
2. New `id_class` values produce correctly-formatted IDs → unit test per new class against animalia fixture: `allocateNextId({ world_slug: "<fixture>", id_class: "ONT" })` returns `ONT-N+1` where `N` is the highest existing `ONT-*` ID.
3. Existing class allocation unchanged → unit test: call `allocateNextId({ id_class: "CF" })` on a fixture and verify the result matches the pre-extension format (still zero-padded width-4).
4. Per-category scanning for INV sub-classes → unit test: fixture with `ONT-1.yaml`, `ONT-2.yaml` but NO `AES-*.yaml`; `allocateNextId({ id_class: "AES" })` returns `AES-1` (NOT `AES-3`).
5. Per-file-class scanning for SEC sub-classes → unit test: fixture with `SEC-GEO-001..003.yaml` but `SEC-TML-001.yaml`; `allocateNextId({ id_class: "SEC-TML" })` returns `SEC-TML-002` (scoped per prefix, not per SEC-\*).
6. Rule 5 alignment → FOUNDATIONS alignment check: SPEC03PATENG-006 / 009's allocation re-query paths succeed against the expanded enum.

## What to Change

### 1. Extend `tools/world-mcp/src/tools/allocate-next-id.ts` (modify)

Append 12 entries to `ID_CLASS_FORMATS` after the existing 12:

```typescript
export const ID_CLASS_FORMATS = {
  // ...existing 12 entries unchanged...
  ONT: { width: 1, zeroPad: false, regex: /^ONT-(\d+)$/ },
  CAU: { width: 1, zeroPad: false, regex: /^CAU-(\d+)$/ },
  DIS: { width: 1, zeroPad: false, regex: /^DIS-(\d+)$/ },
  SOC: { width: 1, zeroPad: false, regex: /^SOC-(\d+)$/ },
  AES: { width: 1, zeroPad: false, regex: /^AES-(\d+)$/ },
  OQ: { width: 4, zeroPad: true, regex: /^OQ-(\d{4})$/ },
  ENT: { width: 4, zeroPad: true, regex: /^ENT-(\d{4})$/ },
  "SEC-ELF": { width: 3, zeroPad: true, regex: /^SEC-ELF-(\d{3})$/ },
  "SEC-INS": { width: 3, zeroPad: true, regex: /^SEC-INS-(\d{3})$/ },
  "SEC-MTS": { width: 3, zeroPad: true, regex: /^SEC-MTS-(\d{3})$/ },
  "SEC-GEO": { width: 3, zeroPad: true, regex: /^SEC-GEO-(\d{3})$/ },
  "SEC-ECR": { width: 3, zeroPad: true, regex: /^SEC-ECR-(\d{3})$/ },
  "SEC-PAS": { width: 3, zeroPad: true, regex: /^SEC-PAS-(\d{3})$/ },
  "SEC-TML": { width: 3, zeroPad: true, regex: /^SEC-TML-(\d{3})$/ }
} as const;
```

The existing `allocateNextId` function body requires NO changes — the scan loop at lines 52-77 already iterates over all nodes and picks the highest matching ID per `format.regex`. The per-prefix literal approach means each class's regex matches only its own IDs, so the scan is already correctly scoped per class/sub-class.

Return ID construction at line 80-82 already honors `format.width` and `format.zeroPad`, so per-class padding is automatic.

### 2. Extend `ID_CLASSES` in `tools/world-mcp/src/server.ts` (modify)

Expand the Zod enum at `server.ts:120-133` to include the 12 new values:

```typescript
const ID_CLASSES = [
  "CF",
  "CH",
  "PA",
  "CHAR",
  "DA",
  "PR",
  "BATCH",
  "NCP",
  "NCB",
  "AU",
  "RP",
  "M",
  "ONT",
  "CAU",
  "DIS",
  "SOC",
  "AES",
  "OQ",
  "ENT",
  "SEC-ELF",
  "SEC-INS",
  "SEC-MTS",
  "SEC-GEO",
  "SEC-ECR",
  "SEC-PAS",
  "SEC-TML"
] as const;
```

24 total; `allocateNextIdInputSchema` picks them up automatically.

## Files to Touch

- `tools/world-mcp/src/tools/allocate-next-id.ts` (modify — extend `ID_CLASS_FORMATS`)
- `tools/world-mcp/src/server.ts` (modify — extend `ID_CLASSES` Zod enum)

## Out of Scope

- Re-padding existing animalia ID space (e.g., migrating `M-1`…`M-20` to a padded `M-01`…`M-20` form). The extension preserves existing conventions; no migration.
- New record-class creation logic in `canon-addition` or `create-base-world`. Those skills don't call `allocate_next_id` for the new classes today; enabling them is scope for SPEC-06 skill rewrites.
- Concurrency safety across parallel allocations — the existing `allocate_next_id` implementation relies on the patch engine's pre-apply race detection (SPEC-03 §Pre-apply step 4). No change.
- Parametric validation of allocated IDs against live records (e.g., "there is no gap before `N`"). The allocator returns `highest + 1`; gap detection is SPEC-04's `id_uniqueness` validator, out of scope here.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm run build` exits 0.
2. `grep -c "^\s*\(ONT\|CAU\|DIS\|SOC\|AES\|OQ\|ENT\|\"SEC-\)" tools/world-mcp/src/tools/allocate-next-id.ts` returns 14 (5 INV + OQ + ENT + 7 SEC — one per new entry in `ID_CLASS_FORMATS`).
3. `grep -c "^\s*\"\(ONT\|CAU\|DIS\|SOC\|AES\|OQ\|ENT\|SEC-\)" tools/world-mcp/src/server.ts` returns 14 (one per new entry in the `ID_CLASSES` Zod enum).
4. Unit test per new class against an animalia fixture — all 12 new classes:
   - `allocateNextId({ id_class: "ONT" })` returns `ONT-4` (animalia currently has `ONT-1`..`ONT-3`; confirmed via `ls worlds/animalia/_source/invariants/ONT-*.yaml`).
   - `allocateNextId({ id_class: "AES" })` returns `AES-4` (animalia currently has `AES-1`..`AES-3`).
   - `allocateNextId({ id_class: "SOC" })` returns `SOC-5` (animalia currently has `SOC-1`..`SOC-4`).
   - `allocateNextId({ id_class: "OQ" })` returns `OQ-NNNN` where NNNN is one greater than animalia's current highest `OQ-*` (fixture-derived, not hardcoded).
   - `allocateNextId({ id_class: "SEC-GEO" })` returns `SEC-GEO-019` (animalia currently has `SEC-GEO-001`..`SEC-GEO-018`; count re-enumerated at test start, not hardcoded).
   - ...same pattern for the remaining new classes.
5. Existing class allocation regression test: `allocateNextId({ id_class: "CF" })` still returns a `CF-NNNN` format ID strictly greater than the current highest.
6. Zod-level rejection of unsupported class: `allocate_next_id` MCP call with `id_class: "NOT_A_CLASS"` rejected by `allocateNextIdInputSchema` before reaching the tool function.

### Invariants

1. Every new entry's regex is mutually exclusive with every other entry's regex (verified by construction: each regex anchors on a unique prefix literal).
2. Existing 12 entries' formats are byte-identical before and after this ticket — no width / zeroPad changes.
3. `ID_CLASS_FORMATS` keys and `ID_CLASSES` Zod enum are in lockstep. A test asserts `Object.keys(ID_CLASS_FORMATS).sort()` equals `[...ID_CLASSES].sort()`.
4. Per-category / per-prefix scanning: the regex anchors guarantee that `allocateNextId({ id_class: "AES" })` never matches an `ONT-*` node and vice versa.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/allocate-next-id.test.ts` (modify existing test file OR add a new one if none exists) — add table-driven cases for each of the 12 new classes, plus a regression case per existing class to confirm byte-identical format preservation. Rationale: per-class allocation correctness is the tool's core contract; each new class needs independent coverage.
2. Lockstep invariant test in the same suite: assert `Object.keys(ID_CLASS_FORMATS).sort()` equals the Zod enum's values sorted. Rationale: this is the only lockstep guarantee between two independently-defined closed unions; drift silently breaks allocation without surfacing until a user-facing request.

### Commands

1. `cd tools/world-mcp && npm run build` (targeted — tsc compile).
2. `cd tools/world-mcp && npm run test` (full package suite — covers the new table-driven cases + existing-class regressions + lockstep invariant).
3. `grep -c "ID_CLASS_FORMATS\|ID_CLASSES" tools/world-mcp/src/` — cross-file grep confirming both surfaces were modified in lockstep.
