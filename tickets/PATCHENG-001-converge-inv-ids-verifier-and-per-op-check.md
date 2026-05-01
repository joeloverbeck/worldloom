# PATCHENG-001: Converge inv_ids verifier and per-op check on per-category-prefix next-id taxonomy

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — modify `tools/patch-engine/src/apply.ts` `verifyExpectedIdAllocations`; tests in `tools/patch-engine/tests/`; remove the phantom-`INV-1` workaround documentation from `.claude/skills/create-base-world/references/engine-envelope-shape.md` §3 once the engine fix lands.
**Deps**: None (engine-internal bug fix; no upstream tickets blocking).

## Problem

When `create-base-world` submits a genesis envelope creating ≥1 invariant per FOUNDATIONS §Invariants category (one each: ontological, causal, distribution, social, aesthetic_thematic), the `expected_id_allocations.inv_ids` array has two layers of pre-apply enforcement that **disagree on the expected ID format**:

1. **`verifyExpectedIdAllocations`** (`tools/patch-engine/src/apply.ts:190`) treats `inv_ids` as a flat numeric counter:
   ```ts
   ["inv_ids", "INV", /^INV-(\d+)$/, 1, false],
   ```
   It checks `inv_ids[0]` against the world's next free `INV-N` id. For an empty world this yields `INV-1`.

2. **`stageCreateInvRecord`** (`tools/patch-engine/src/ops/create-inv-record.ts:20`) validates each emitted invariant's id against the per-category-prefix pattern:
   ```ts
   idPattern: /^(ONT|CAU|DIS|SOC|AES)-\d+$/,
   ```
   …and requires the record's id to appear in `inv_ids` via `.includes()` per `tools/patch-engine/src/ops/shared.ts:103`.

These two enforcement layers are **mutually exclusive at face value**:
- `inv_ids: ["ONT-1","ONT-2","CAU-1","CAU-2","DIS-1","DIS-2","SOC-1","SOC-2","AES-1","AES-2"]` passes the per-op `.includes()` check but fails the verifier (`inv_ids[0] = "ONT-1"` ≠ `INV-1`).
- `inv_ids: ["INV-1"]` passes the verifier but fails the per-op check for every category-prefix record.

**Discovered workaround**: place a phantom `INV-1` as the first entry, followed by the real category-prefix ids:
```yaml
inv_ids: ["INV-1", "ONT-1", "ONT-2", "CAU-1", "CAU-2", "DIS-1", "DIS-2", "SOC-1", "SOC-2", "AES-1", "AES-2"]
```
The verifier sees `INV-1` matching empty-world next-id and passes; the per-op check uses `.includes()` to find each real id and passes; **no `INV-N` record is actually created** because no `create_inv_record` op carries `id: "INV-1"`. The id sits in the allocation list as a sentinel only.

**Session evidence (2026-05-01 create-base-world genesis run for `worlds/erotica-world/`)**: the genesis envelope failed two submissions before this workaround was discovered. First submission with category-prefix-only ids returned `id_allocation_race: expected ONT-1, current next id is INV-1`. Second submission with `inv_ids` omitted returned `missing_expected_id_allocation: ONT-1 is not listed in expected_id_allocations.inv_ids`. Third submission with the phantom `INV-1` first entry succeeded. The receipt's `id_allocations_consumed.inv_ids` confirms `["INV-1","ONT-1","ONT-2",...]` was accepted as-is.

The workaround is now documented at `.claude/skills/create-base-world/references/engine-envelope-shape.md` §3 (added by the create-base-world skill audit on 2026-05-01) and is mirrored in any future canon-addition run that emits multiple invariants in one plan. Every operator running a genesis or multi-invariant patch will hit this asymmetry until the engine converges.

The cleaner end-state is to align `verifyExpectedIdAllocations`'s `inv_ids` handling with how `sec_ids` is already handled at `tools/patch-engine/src/apply.ts:211–222`:

```ts
const secIds = allocations.sec_ids ?? [];
for (const secId of secIds) {
  const match = /^(SEC-[A-Z]{3})-\d{3}$/.exec(secId);
  if (match === null) {
    return error("id_allocation_race", `Invalid sec_ids allocation ${secId}.`);
  }
  const prefix = match[1] ?? "";
  const nextId = nextIdFor(db, worldSlug, prefix, new RegExp(`^${prefix}-(\\d{3})$`), 3, true);
  if (secId !== nextId) {
    return error("id_allocation_race", `sec_ids allocation race: expected ${secId}, current next id is ${nextId}.`);
  }
}
```

The `sec_ids` verifier iterates each id, scans per-prefix in the index, and verifies the id is the next free for its specific prefix. It correctly handles the multi-prefix case (`SEC-GEO-001`, `SEC-PAS-001`, `SEC-INS-001`, ...). The `inv_ids` verifier should do the same — iterate, match against `^(ONT|CAU|DIS|SOC|AES)-(\d+)$`, scan per-prefix, verify each id is the next free for its specific prefix.

## Assumption Reassessment (2026-05-01)

1. `tools/patch-engine/src/apply.ts:182–225` defines `verifyExpectedIdAllocations`. The `classByKey` table at lines 187–197 lists `inv_ids` with the flat `INV-N` pattern; the `secIds` per-prefix loop at lines 211–222 demonstrates the desired multi-prefix shape. Confirmed by direct grep at audit time.
2. `tools/patch-engine/src/ops/create-inv-record.ts:20` enforces `^(ONT|CAU|DIS|SOC|AES)-\d+$` for each emitted record. `tools/patch-engine/src/ops/shared.ts:102–110` enforces the `.includes()` check against the allocation list. Both confirmed by direct grep.
3. Cross-skill / cross-tool boundary under audit: the contract between (a) the engine pre-apply verifier in `apply.ts` and (b) every consumer skill that emits ≥1 invariant in one envelope (currently `create-base-world` Phase 11; future canon-addition runs that emit a new invariant via `create_inv_record`). The shared contract is `expected_id_allocations.inv_ids`. After this fix, the workaround documentation in `.claude/skills/create-base-world/references/engine-envelope-shape.md` §3 must be removed in the same change (otherwise skill prose drifts from engine behavior).
4. **FOUNDATIONS principle motivating this ticket**: §Canonical Storage Layer — atomic-source canon records under `_source/<subdir>/*.yaml` are append-only with engine-only write surface; the engine should enforce id-allocation correctness without forcing skill authors to discover and document workarounds. Per `tickets/README.md` §Mandatory Pre-Implementation Checks item 9: this ticket touches Canon Safety Check surfaces (the engine pre-apply verifier IS a Canon Safety Check enforcement layer per `docs/FOUNDATIONS.md` §Machine-Facing Layer §4 Validator Framework), but the change does NOT weaken any rule — it converges two existing enforcement layers that currently disagree. Mystery Reserve firewall semantics are unchanged; no canon-mutation behavior changes; only the verifier's id-format check is refined to match the per-op check that already exists.
5. Schema extension: NO schema changes. The fix is to the verifier's runtime logic only. `expected_id_allocations.inv_ids: string[]` remains a string array — the change is in how the verifier interprets the array's contents (per-category-prefix instead of flat `INV-N`).
6. Pipeline-wide grep for current `inv_ids` callers: `create-base-world` Phase 11 step 4 emits the phantom-`INV-1` first entry pattern. No other skill currently calls `submit_patch_plan` with `inv_ids` (canon-addition runs typically extend invariants via `append_extension` rather than creating new ones; future canon-addition runs that DO create invariants will inherit the same workaround until this fix lands). After this fix, the phantom workaround removal is also a `.claude/skills/create-base-world/references/engine-envelope-shape.md` edit.
7. Adjacent contradiction surfaced during reassessment: the engine's per-op-prefix-aware verifier at `sec_ids` already exists and is the model. The `inv_ids` flat-counter form is older code that was not updated when invariant per-category-prefix conventions were canonized in FOUNDATIONS §Invariants. This is a separate-bug-uncovered-during-reassessment classification — an in-scope fix for this ticket because skill operators are paying the workaround cost today.

## Architecture Check

1. Aligning `inv_ids` verification with the existing `sec_ids` per-prefix verifier shape is the cleanest convergence — it keeps the verifier's design uniform across all multi-prefix id classes. The pattern is mechanical: `^(ONT|CAU|DIS|SOC|AES)-(\d+)$` parallel to `^(SEC-[A-Z]{3})-\d{3}$`. No new abstractions introduced.
2. No backwards-compatibility shims. After this fix, the phantom `INV-1` first entry is no longer required (and would actively fail the new verifier). The workaround was a structural failure of the engine, not a feature; removing the cause and the workaround in the same change keeps the engine and skill prose synchronized.
3. The fix preserves the engine's atomic-commit and per-world-write-lock invariants. Only the pre-apply id-allocation check is refined.

## Verification Layers

1. After fix: `verifyExpectedIdAllocations` accepts `inv_ids: ["ONT-1","ONT-2","CAU-1","CAU-2","DIS-1","DIS-2","SOC-1","SOC-2","AES-1","AES-2"]` on a fresh world without the phantom `INV-1` first entry → patch-engine integration test (`tools/patch-engine/tests/integration/end-to-end-canon-addition.test.ts` or new `tools/patch-engine/tests/preflight/inv-ids-per-prefix.test.ts`).
2. After fix: `verifyExpectedIdAllocations` REJECTS the phantom-`INV-1` first entry with a clear error (regression test ensuring the prior workaround no longer accidentally passes) → same test file.
3. After fix: every category-prefix appearing in `inv_ids` is verified as the next-free id for its specific prefix; mismatched ids (e.g., `inv_ids: ["ONT-2"]` on an empty world where `ONT-1` is the next free) return `id_allocation_race` with a per-prefix error message → same test file.
4. After fix: `.claude/skills/create-base-world/references/engine-envelope-shape.md` §3 no longer documents the phantom-`INV-1` workaround → grep-proof: `rg -n "phantom.*INV-1|INV-1.*phantom" .claude/skills/create-base-world/` returns no hits.
5. After fix: the `.claude/skills/create-base-world/references/engine-envelope-shape.md` §3.Full `expected_id_allocations` shape example uses category-prefix-only ids (no phantom `INV-1`) → grep-proof + visual review.

## What to Change

### 1. Refactor `verifyExpectedIdAllocations` to handle `inv_ids` per-prefix

In `tools/patch-engine/src/apply.ts`:

- Remove the `["inv_ids", "INV", /^INV-(\d+)$/, 1, false]` row from the `classByKey` table.
- Add an `inv_ids` per-prefix loop parallel to the existing `sec_ids` loop at lines 211–222:

```ts
const invIds = allocations.inv_ids ?? [];
for (const invId of invIds) {
  const match = /^(ONT|CAU|DIS|SOC|AES)-(\d+)$/.exec(invId);
  if (match === null) {
    return error("id_allocation_race", `Invalid inv_ids allocation ${invId}.`);
  }
  const prefix = match[1] ?? "";
  const nextId = nextIdFor(db, worldSlug, prefix, new RegExp(`^${prefix}-(\\d+)$`), 1, false);
  if (invId !== nextId) {
    return error("id_allocation_race", `inv_ids allocation race: expected ${invId}, current next id is ${nextId}.`);
  }
}
```

(Note: `nextIdFor`'s width=1 / zeroPad=false matches the existing per-op pattern `ONT-1` / `ONT-2` / etc. — no zero-padding for invariant counters per FOUNDATIONS §Invariants.)

### 2. Remove the phantom-`INV-1` workaround from skill prose

In `.claude/skills/create-base-world/references/engine-envelope-shape.md`:
- §3 `inv_ids` workaround (engine asymmetry) — replace the section with a brief note: "After PATCHENG-001 landed, `inv_ids` validates per-category-prefix without a phantom `INV-1` first entry. Use category-prefix ids directly (`ONT-1`, `CAU-1`, etc.); see §3 Full `expected_id_allocations` shape for the canonical form."
- §3 Full `expected_id_allocations` shape — update the example: remove the `"INV-1"` first entry from the `inv_ids` array.

### 3. Add tests

`tools/patch-engine/tests/preflight/inv-ids-per-prefix.test.ts` (or extend an existing apply-pre-flight test):
- Empty world + category-prefix-only `inv_ids` → verifier passes.
- Empty world + phantom-`INV-1` first entry → verifier REJECTS with `Invalid inv_ids allocation INV-1` (regression on the prior workaround).
- Mismatched per-prefix id (e.g., `inv_ids: ["ONT-2"]` on empty world) → verifier returns `id_allocation_race: expected ONT-2, current next id is ONT-1`.
- Mixed-prefix list with one mismatched per-prefix id → first-error semantics.
- Per-prefix monotonicity: `inv_ids: ["ONT-1","ONT-2"]` passes; `["ONT-1","ONT-3"]` fails (ONT-2 expected before ONT-3).

## Files to Touch

- `tools/patch-engine/src/apply.ts` (modify — `verifyExpectedIdAllocations`)
- `tools/patch-engine/tests/preflight/inv-ids-per-prefix.test.ts` (new) OR extend an existing apply-pre-flight test file
- `.claude/skills/create-base-world/references/engine-envelope-shape.md` (modify — §3 rewrites)
- `.claude/skills/create-base-world/SKILL.md` (verify Phase 11 step 4 references to inv_ids — should already point to the references file post-2026-05-01 audit)

## Out of Scope

- Retroactive modification of the existing `worlds/erotica-world/_source/invariants/` records (already applied with the workaround; no canon change required).
- Other id-class verifiers (`cf_ids`, `ch_ids`, `m_ids`, `oq_ids`, `ent_ids` are already consistent with their per-op checks; only `inv_ids` has the asymmetry).
- Schema-introspection improvements (covered by ENGINESYNC-003).
- CLI parity for validate-patch-plan (covered by PATCHENG-002).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/patch-engine && npm test` passes including the new per-prefix `inv_ids` tests.
2. A `create-base-world` dry-run on a fresh test world emits an envelope with category-prefix-only `inv_ids` and validates clean.
3. Phantom-`INV-1` first entry is REJECTED (regression test).

### Invariants

1. `inv_ids` and `sec_ids` use structurally identical per-prefix verifier patterns — divergence between multi-prefix id classes is an architectural smell and is removed by this ticket.
2. Skill prose at `.claude/skills/create-base-world/references/engine-envelope-shape.md` §3 reflects the post-fix engine behavior — no phantom workaround documented.
3. The engine's atomic-commit and per-world write-lock invariants are unchanged.

## Test Plan

### New/Modified Tests

1. `tools/patch-engine/tests/preflight/inv-ids-per-prefix.test.ts` — new per-prefix verifier behavior tests.
2. Possibly extension to `tools/patch-engine/tests/integration/end-to-end-canon-addition.test.ts` if it currently exercises a multi-invariant accept-path.

### Commands

1. `cd tools/patch-engine && npm test` — package-local pass.
2. Manual: invoke `create-base-world` dry-run on a fresh test slug and confirm clean validation with category-prefix-only `inv_ids` (no phantom `INV-1`).
