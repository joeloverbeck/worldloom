# SPEC-75 — Branch-aware STCHAR supersession

**Status:** AUTHORED 2026-05-23
**Authored:** 2026-05-23
**Source report:** `reports/stchar-distillation-rework.md` §6.13
**Companion triage:** [`docs/triage/2026-05-23-stchar-distillation-rework-triage.md`](../docs/triage/2026-05-23-stchar-distillation-rework-triage.md)
**Prior lineage:** `archive/specs/SPEC-59-stchar-authority-fidelity-validators.md` (introduced reciprocity + supersession surfaces).
**Related:** [`archive/specs/SPEC-74-stchar-distillation-boundary-hardening.md`](../archive/specs/SPEC-74-stchar-distillation-boundary-hardening.md) (STCHAR distillation boundary hardening — orthogonal scope split out of this spec at triage time; landed 2026-05-23, archived same day).

## 1. Overview

Replace the page-ordinal-only supersession reachability check in `stchar_supersession_integrity` with branch-ancestry-aware reachability so a branch-local STCHAR regeneration on one branch does not force sibling branches to use the regenerated profile. Make branch-local durable STCHAR transformation (one of the 5 valid `regeneration_reason_class` values established by SPEC-74) actually safe to use without silently mutating sibling branch state.

This spec is independently sequenced from SPEC-74. SPEC-74 has already landed (2026-05-23, archived at `archive/specs/SPEC-74-...`), so the `regeneration_reason_class: durable_branch_transformation` enum value referenced by this spec exists in code today (`tools/validators/src/schemas/story-character-authority.schema.json:70-77` + `tools/validators/src/structural/stchar-regeneration-reason-integrity.ts:19-23`). The validator changes themselves never required any SPEC-74 surface to land first.

## 2. Context — verified evidence

### 2.1 The current ordinal-only reachability check

`tools/validators/src/structural/stchar-supersession-integrity.ts:33-44`:

```ts
const pageOrdinal = recordPageOrdinal(page);
for (const [index, id] of activeIds(page, "STCHAR").entries()) {
  const stchar = maps.byId.get(id);
  const parsed = asPlainRecord(stchar?.parsed);
  const status = stringValue(parsed.status);
  if (stchar?.node_type !== "story_character_authority_record" || !INACTIVE_STATUSES.has(status ?? "")) {
    continue;
  }
  const supersededAt = supersessionOrdinal(parsed, maps.byId);
  if (pageOrdinal !== null && supersededAt !== null && pageOrdinal < supersededAt) {
    continue;
  }
  // FAIL — superseded STCHAR is active on a "later" page by ordinal.
```

The validator compares a numeric `pageOrdinal` against `supersededAt`. It does not consult branch ancestry. The failure mode:

- Branch A at page PG-6 supersedes `STCHAR-1` with regenerated `STCHAR-2`.
- Sibling branch B at page PG-8 still uses `STCHAR-1`. Branch B's ancestor path does not include PG-6 — the supersession event is not reachable from PG-8.
- The validator's ordinal compare reports `PG-8 ≥ PG-6`, so it requires PG-8 to use `STCHAR-2` and fails when it doesn't. This silently couples sibling branches to a regeneration that happened on a different branch.

Conversely, a global supersession (one that should apply to every later branch) gets the same ordinal treatment, so the current logic is over-strict for branch-local supersession and exactly-strict for global supersession — but cannot distinguish the two.

### 2.2 Branch-ancestry data already present on every PG record

The PG record schema (`tools/validators/src/schemas/story-page.schema.json:9-31`) already includes `branch_path` as a **required** field — an array of `PG-<integer>` ids encoding the full root→self ancestry chain on every committed page. Multiple validators already consume `branch_path` directly for ancestry-style reachability:

- `tools/validators/src/structural/stemo-utils.ts:232` and `stemo-no-future-page-ids.ts` (sub-code `stemo_no_future_page_ids.not_on_branch_path`)
- `tools/validators/src/structural/stplan-utils.ts:225` and `stplan-no-future-page-ids.ts` (sub-code `stplan_no_future_page_ids.not_on_branch_path`)
- `tools/validators/src/structural/stemo-trigger-event-on-branch-path.ts`
- `tools/validators/src/structural/secret-utils.ts:156-167`
- `tools/validators/src/structural/recursive-reference-closure.ts:37-39`
- `tools/validators/src/structural/story-question-utils.ts:159`

The supersession reachability check is then a single set-inclusion lookup on this already-serialized field — no new walker, no defensive cycle-detection, no missing-parent edge cases. The §4.1 deliverable below collapses to documenting this mechanism and adding a small sibling-utils-style helper.

### 2.3 Why this is split from SPEC-74

This spec was split from SPEC-74's bundle at triage time because:

- Its mechanism is branch-ancestry inspection on PG records, not record-class id parsing or body-subsection inspection.
- Its blast radius touches every STCHAR supersession event going forward, not just new authoring.
- Its test surface is a multi-page, multi-branch scenario set, distinct from the single-record body tests SPEC-74's new validators rely on.
- Per the source report's §9 blast-radius table, this change ranks Medium-high while all SPEC-74 changes were Low / Medium.

Bundling would have made SPEC-74 harder to review and would have coupled two orthogonal mechanisms in a single landing risk.

## 3. Out of Scope (deliberate)

| Item | Why excluded |
|---|---|
| Any STCHAR distillation-boundary, source-preservation, regeneration-reason, or page-packet work | All consolidated in SPEC-74 (now archived). This spec touches only supersession reachability. |
| Reintroducing any STCHAR tamper hash to track supersession events | SPEC-71 removed all STCHAR hashes; the schema's `additionalProperties: false` plus the `forbidden_stchar_tamper_hash_fields` validator structurally prevent it. Branch reachability uses page/branch lineage, not hashes. |
| Cross-bundle or cross-world STCHAR supersession | STCHAR is per-bundle. Supersession across bundles is not a defined operation. |
| Changing the `supersedes` / `superseded_by` schema fields themselves | These remain as currently defined. This spec only changes how the validator interprets reachability. |
| A `scope: global \| branch_local` discriminator field on STCHAR | Rejected in §4.2; ancestry semantics make the distinction implicit (a global supersession is one performed on the bundle's root branch, where every later page is a descendant of the root by construction). The existing `branch_path` field carries enough information without a separate discriminator. |

## 4. Changes

### 4.1 Reachability via the existing `branch_path` PG field

No new ancestry-walking primitive is required. Every committed `PG` record carries `branch_path: string[]` — the ordered chain of `PG-<integer>` ids tracing the bundle's root page through every ancestor down to self. This field is **required** by `tools/validators/src/schemas/story-page.schema.json:9-31` (minItems 1) and is the canonical reachability mechanism the validator pipeline already uses (see §2.2 for the consumer list).

**Reachability semantics for this validator:** a page `T` is a descendant of supersession page `S` iff `S.id ∈ T.branch_path`. Sibling-branch and pre-supersession-ancestor pages do not contain `S.id` in their `branch_path` and therefore correctly fall outside the descendant set.

**Helper (optional, for readability):** add a small `branchPath(page): string[]` accessor to `tools/validators/src/structural/stchar-utils.ts` mirroring the sibling-utils pattern (`stemo-utils.ts:232`, `stplan-utils.ts:225`, `story-question-utils.ts:159`):

```ts
export function branchPath(page: IndexedRecord): string[] {
  return stringArray(asPlainRecord(page?.parsed).branch_path);
}
```

The validator may also call `stringArray(asPlainRecord(page.parsed).branch_path)` inline if the additional helper proves unnecessary — sibling validators do both.

The implementing ticket does NOT need to write a `pageAncestry` walker, defensive cycle detection, or missing-parent edge-case handling: `branch_path` is structurally validated by other validators (`recursive-reference-closure.ts` lines 19-20, 37+) and is the canonical serialized ancestry.

### 4.2 `stchar_supersession_integrity` reachability rule replacement

Replace the ordinal compare at `tools/validators/src/structural/stchar-supersession-integrity.ts:33-44` with a `branch_path`-based reachability check:

1. Resolve the supersession page id `S` — read `stringValue(successor.generated_at_page)` from the successor STCHAR (whose id is `stringValue(parsed.superseded_by)`). The successor STCHAR is reached through `maps.byId.get(stringValue(parsed.superseded_by))`, identical to the path the current `supersessionOrdinal` helper takes.
2. Resolve the successor STCHAR id `successorId = stringValue(parsed.superseded_by)`. Include this in the diagnostic context object — the current helper at lines 67-74 returns only the ordinal, so this is a new extraction.
3. For each page `T` that still carries the superseded STCHAR as active:
   - If `S ∈ T.branch_path`, `T` IS a descendant of `S` — the superseded STCHAR must not be active there — FAIL.
   - If `S ∉ T.branch_path`, `T` is NOT a descendant (sibling branch or pre-supersession ancestor) — the superseded STCHAR remaining active is permitted — PASS.
4. Failure diagnostic — new sub-code `stchar_supersession_integrity.inactive_stchar_active_on_descendant`. Message: `superseded STCHAR <id> active on page <page-id>, which is a descendant of supersession page <S>. The successor STCHAR <successorId> must be active here.` Context object extends the existing fields (`page_id`, `stchar_id`, `status`, `reference_path`) with `supersession_page_id: S` and `successor_stchar_id: successorId`. The existing sub-code `stchar_supersession_integrity.inactive_stchar_active_on_page` is retired in favor of the descendant-only form, since the new check is strictly more precise.
5. Preserve the existing `INACTIVE_STATUSES` set and the existing structural checks (the change is scoped to the reachability compare; do not refactor adjacent logic).

### 4.3 Global-vs-branch-local supersession distinction

The branch-ancestry rule in §4.2 applies UNIFORMLY regardless of `regeneration_reason_class` — supersession is reachable from its descendants only, regardless of motivation. A "global" supersession (one that should apply to every later branch) is operationally achieved by superseding on the bundle's root branch, where every other page is a descendant of the root by construction. There is no separate "global supersession" mechanism; the `branch_path` semantics make this implicit.

The implementing ticket must NOT add a `scope: global | branch_local` discriminator field — that would be a schema change beyond this spec, and the existing `branch_path` semantics suffice (see §3 Out of Scope).

## 5. Migration

**No fixture remediation required.** The current ordinal-only validator is over-strict for branch-local supersession but exactly-strict for any pure-linear branch. The 3 red-bunny STCHAR profiles do not have sibling-branch regeneration events on main, so the new reachability rule is a strict relaxation that does not invalidate any current fixture.

**Validation pass.** After landing, run the supersession validator against red-bunny and any other bundle with STCHAR profiles. Confirm no regressions — every page that was previously passing must still pass.

**Test scenarios.** The new test file (see §6) must construct the multi-branch scenario (branch-A-regenerates-at-PG-6 / sibling-branch-B-at-PG-8) inline via builder functions, following the established structural-test convention (`tools/validators/tests/structural/chc-slt-selected-commitment-trace.test.ts:265-307`, `branch-isolation.test.ts:168-176`). Do NOT add YAML page fixtures under `tools/validators/tests/fixtures/` — that directory holds individual record fixtures (`cf-*.yaml`, `patch-plan-*.json`), not multi-page bundle scenarios.

## 6. FOUNDATIONS Alignment

| Principle | Stance | How honored |
|---|---|---|
| §Story Bundles §4 (Write Discipline) | aligns | The reachability check operates on existing PG `branch_path` data — no new mutation surface, no new write path. |
| §Story Bundles §6.1 (Story-Local Character Authority) | aligns | Reachability scoped to branch ancestry preserves the principle that STCHAR is story-local AND branch-local when regenerated mid-bundle — a sibling branch's character authority is not silently rewritten by another branch's events. |
| Rule 4 (No Globalization by Accident) | aligns | This spec's central thesis. The current ordinal-only check IS an accidental globalization: a branch-local supersession is silently treated as applying to every page with a higher ordinal. Branch-ancestry-aware reachability via `branch_path` is the explicit fix. |
| Rule 6 (No Silent Retcons) | aligns | A sibling branch silently switching to a profile regenerated on a different branch is precisely the silent-retcon pattern Rule 6 forbids. Branch-aware reachability makes the supersession effect explicit and auditable. |
| §Tooling Recommendation (no operating on prose alone) | aligns | The reachability check operates on PG record fields (`branch_path`) — structural metadata, not prose. |

## 7. Testing strategy

The supersession validator does not currently have a dedicated test file. Create `tools/validators/tests/structural/stchar-supersession-integrity.test.ts` with the following cases (constructed inline per §5):

- **Positive (currently failing, will pass after this spec):**
  - Branch A regenerates `STCHAR-2` from `STCHAR-1` at PG-6. Descendant PG-7 in branch A uses `STCHAR-2` — PASS (unchanged).
  - Sibling branch B's page PG-8, whose `branch_path` does not include PG-6, still uses `STCHAR-1` — PASS (was failing under ordinal-only).
- **Positive (currently passing, must still pass):**
  - Linear story: PG-5 supersedes `STCHAR-1` with `STCHAR-2`. PG-6 (descendant; `branch_path` includes PG-5) uses `STCHAR-2` — PASS.
  - PG-4 (pre-supersession ancestor of the supersession page; `branch_path` does not include PG-5) uses `STCHAR-1` — PASS.
- **Negative (must fail with the new diagnostic):**
  - Branch A at PG-6 supersedes `STCHAR-1` → `STCHAR-2`. Descendant PG-7 (branch A; PG-6 ∈ PG-7.branch_path) still carries `STCHAR-1` as active — FAIL with sub-code `stchar_supersession_integrity.inactive_stchar_active_on_descendant`, diagnostic context including `supersession_page_id` and `successor_stchar_id`.
  - Successor `STCHAR-2` not active on a descendant page where the superseded `STCHAR-1` is active — FAIL.

No separate ancestry-primitive unit-test file is needed: `branch_path` is a serialized PG field whose integrity is already enforced by `recursive-reference-closure.ts` and the schema, and §4.1's optional `branchPath(page)` helper is a one-line accessor whose correctness is covered by the validator tests themselves.

## 8. Sequencing

1. **Stage 1 — Optional helper:** add `branchPath(page)` to `tools/validators/src/structural/stchar-utils.ts` if §4.1's readability case warrants it; otherwise inline the access.
2. **Stage 2 — Validator reachability replacement:** §4.2 + new test file at `tools/validators/tests/structural/stchar-supersession-integrity.test.ts`.
3. **Stage 3 — Validation pass:** run all validators against red-bunny and any other STCHAR-bearing bundle. Confirm no regressions.

## 9. References

- Source report: `reports/stchar-distillation-rework.md` §6.13 (the supersession concern).
- Companion triage: [`docs/triage/2026-05-23-stchar-distillation-rework-triage.md`](../docs/triage/2026-05-23-stchar-distillation-rework-triage.md).
- Related: [`archive/specs/SPEC-74-stchar-distillation-boundary-hardening.md`](../archive/specs/SPEC-74-stchar-distillation-boundary-hardening.md) (established the `regeneration_reason_class: durable_branch_transformation` enum value that names the branch-local-transformation reason class).
- Verified validator surface: `tools/validators/src/structural/stchar-supersession-integrity.ts:33-44` (ordinal-only reachability).
- Existing `branch_path` consumers (sibling-validator pattern this spec follows): `tools/validators/src/structural/stemo-utils.ts:232`, `stplan-utils.ts:225`, `secret-utils.ts:156-167`, `recursive-reference-closure.ts:19-39`, `story-question-utils.ts:159`.
- FOUNDATIONS: Rule 4, Rule 6, §Story Bundles §6.1.

## Outcome

When this spec lands, a branch-local STCHAR regeneration (e.g., `regeneration_reason_class: durable_branch_transformation` on branch A at PG-6) no longer silently forces sibling branches to use the regenerated profile. The supersession validator distinguishes descendant pages (PG-6 ∈ target.branch_path → must use the successor) from non-descendant pages (PG-6 ∉ target.branch_path → may continue using the predecessor). A global supersession is achieved operationally by regenerating on the bundle's root branch, where every page is a descendant by construction — no new schema discriminator is needed. The implementation reuses the already-serialized `branch_path` PG field that 7+ sibling validators already consume, avoiding any new traversal primitive.
