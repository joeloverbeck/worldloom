# SPEC-75 — Branch-aware STCHAR supersession

**Status:** AUTHORED 2026-05-23
**Authored:** 2026-05-23
**Source report:** `reports/stchar-distillation-rework.md` §6.13
**Companion triage:** [`docs/triage/2026-05-23-stchar-distillation-rework-triage.md`](../docs/triage/2026-05-23-stchar-distillation-rework-triage.md)
**Prior lineage:** `archive/specs/SPEC-59-stchar-authority-fidelity-validators.md` (introduced reciprocity + supersession surfaces).
**Related:** SPEC-74 (STCHAR distillation boundary hardening — orthogonal scope split out of this spec at triage time).

## 1. Overview

Replace the page-ordinal-only supersession reachability check in `stchar_supersession_integrity` with branch-ancestry-aware reachability so a branch-local STCHAR regeneration on one branch does not force sibling branches to use the regenerated profile. Make branch-local durable STCHAR transformation (one of the 5 valid `regeneration_reason_class` values introduced by SPEC-74) actually safe to use without silently mutating sibling branch state.

This spec is independently sequenced from SPEC-74. It depends on the `regeneration_reason_class: durable_branch_transformation` enum value introduced by SPEC-74 §4.7 only for the doc-encouragement gate in §5 below; the validator changes themselves do not require any SPEC-74 surface to land first.

## 2. Context — verified evidence

### 2.1 The current ordinal-only reachability check

`tools/validators/src/structural/stchar-supersession-integrity.ts:33-42`:

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

### 2.2 Branch-ancestry primitives that already exist

PG records carry parent-page references via the page-snapshot lineage; BR records record branch lineage. The story-pipeline already reasons about ancestry in places like `branching-story-turn-cycle` parent-page selection and `branching-story-health-audit` cross-branch checks. A shared ancestry-walking utility exported from a single module would let the validator (and any future cross-branch consumer) reuse a verified implementation. The implementing ticket must inventory the existing ancestry traversal helpers before introducing a new one — if a usable primitive already exists, extend it; if not, add one in a shared `tools/validators/src/_helpers/` or `tools/world-index/src/...` module that both validator code and future story-pipeline consumers can import.

### 2.3 Why this is deferred from SPEC-74

The supersession fix is independent of the distillation-boundary work because:

- Its mechanism is branch-ancestry traversal, not record-class id parsing or body-subsection inspection.
- Its blast radius touches every STCHAR supersession event going forward, not just new authoring.
- Its test surface is a multi-page, multi-branch fixture set, distinct from the single-record body tests SPEC-74's new validators rely on.
- Per the source report's §9 blast-radius table, this change ranks Medium-high while all SPEC-74 changes are Low / Medium.

Bundling would have made SPEC-74 harder to review and would have coupled two orthogonal mechanisms in a single landing risk.

## 3. Out of Scope (deliberate)

| Item | Why excluded |
|---|---|
| Any STCHAR distillation-boundary, source-preservation, regeneration-reason, or page-packet work | All consolidated in SPEC-74. This spec touches only supersession reachability. |
| Reintroducing any STCHAR tamper hash to track supersession events | SPEC-71 removed all STCHAR hashes; the schema's `additionalProperties: false` plus the `forbidden_stchar_tamper_hash_fields` validator structurally prevent it. Branch reachability uses page/branch lineage, not hashes. |
| Cross-bundle or cross-world STCHAR supersession | STCHAR is per-bundle. Supersession across bundles is not a defined operation. |
| Changing the `supersedes` / `superseded_by` schema fields themselves | These remain as currently defined. This spec only changes how the validator interprets reachability. |

## 4. Changes

### 4.1 Branch-ancestry traversal primitive

**Inventory step (ticket prerequisite):** survey existing ancestry helpers across `tools/validators/src/_helpers/`, `tools/world-index/src/`, and any story-pipeline helper used by `branching-story-turn-cycle` or `branching-story-health-audit`. Extend the most appropriate existing primitive if one exists; otherwise add a new module exporting:

- `pageAncestry(pageId, maps): string[]` — returns the page-id chain from `pageId` back to the bundle's root page, walking PG parent-page references.
- `isAncestor(ancestorPageId, descendantPageId, maps): boolean` — true iff `ancestorPageId` appears in `pageAncestry(descendantPageId, maps)`.

The implementing ticket must verify the primitive handles: (a) the root page (empty ancestry); (b) multi-step ancestry chains; (c) cycles (defensive — should not occur but should fail closed rather than infinite-loop); (d) missing parent references (treat as ancestry-terminating, not error).

### 4.2 `stchar_supersession_integrity` reachability rule replacement

Replace the ordinal compare at `tools/validators/src/structural/stchar-supersession-integrity.ts:33-42` with a branch-ancestry-aware reachability check:

1. Resolve the `STCHAR` superseding event's page id — the page on which the regenerated/superseding STCHAR was committed (read from the superseding STCHAR's frontmatter `generated_at_page` or equivalent; the implementing ticket must verify the canonical field name on the current schema).
2. For each page that still carries the superseded STCHAR as active:
   - If the page IS a descendant of the supersession page (per §4.1 `isAncestor`), the superseded STCHAR must not be active there — FAIL.
   - If the page is NOT a descendant (sibling branch or pre-supersession ancestor), the superseded STCHAR remaining active is permitted — PASS.
3. Failure diagnostic: `superseded STCHAR <id> active on page <page-id>, which is a descendant of supersession page <supersession-page-id>. The successor STCHAR <successor-id> must be active here.`
4. Preserve the existing INACTIVE_STATUSES set and the existing structural checks (the change is scoped to the reachability compare; do not refactor adjacent logic).

### 4.3 Global-vs-branch-local supersession distinction

The `regeneration_reason_class` enum introduced by SPEC-74 §4.7 includes `durable_branch_transformation` as a branch-local reason and `source_world_char_material_change`, `profile_fidelity_failure`, `story_local_character_promotion`, `stable_source_material_omission_repair` as not-inherently-branch-local reasons.

For this spec's reachability check, the branch-ancestry rule applies UNIFORMLY regardless of the reason class — supersession is reachable from its descendants only, regardless of motivation. A "global" supersession (one that should apply to every later branch) is operationally achieved by superseding on the bundle's root branch, where every other page is a descendant of the root by construction. There is no separate "global supersession" mechanism; the ancestry semantics make this implicit.

The implementing ticket must NOT add a `scope: global | branch_local` discriminator field — that would be a schema change beyond this spec, and the existing ancestry semantics suffice.

### 4.4 Doc-encouragement gate update

In `.claude/skills/story-character-profile/SKILL.md` (the regenerate-mode section that SPEC-74 §4.1 establishes), add a note: "Branch-local durable STCHAR transformation (`regeneration_reason_class: durable_branch_transformation`) is enforced via branch-ancestry-aware supersession per SPEC-75. Before this spec lands, do not regenerate STCHAR mid-branch with the expectation that sibling branches will continue using the prior profile — the supersession validator does not yet distinguish ancestry."

This gate is a documentation note, not a runtime check. It exists to prevent authoring expectations that exceed the validator's actual semantics during the period before this spec lands.

## 5. Migration

**No fixture remediation required.** The current ordinal-only validator is over-strict for branch-local supersession but exactly-strict for any pure-linear branch. The 3 red-bunny STCHAR profiles do not have sibling-branch regeneration events on main, so the new reachability rule is a strict relaxation that does not invalidate any current fixture.

**Validation pass.** After landing, run the supersession validator against red-bunny and any other bundle with STCHAR profiles. Confirm no regressions — every page that was previously passing must still pass.

**Test fixtures.** Add a multi-branch test fixture under `tools/validators/tests/fixtures/` simulating the branch-A-regenerates-at-PG-6 / sibling-branch-B-at-PG-8 scenario. Use it in the new test cases (§6).

## 6. FOUNDATIONS Alignment

| Principle | Stance | How honored |
|---|---|---|
| §Story Bundles §4 (Write Discipline) | aligns | The branch-ancestry primitive operates on existing PG / BR ancestry data — no new mutation surface, no new write path. |
| §Story Bundles §6.1 (Story-Local Character Authority) | aligns | Reachability scoped to branch ancestry preserves the principle that STCHAR is story-local AND branch-local when regenerated mid-bundle — a sibling branch's character authority is not silently rewritten by another branch's events. |
| Rule 4 (No Globalization by Accident) | aligns | This spec's central thesis. The current ordinal-only check IS an accidental globalization: a branch-local supersession is silently treated as applying to every page with a higher ordinal. Branch-ancestry-aware reachability is the explicit fix. |
| Rule 6 (No Silent Retcons) | aligns | A sibling branch silently switching to a profile regenerated on a different branch is precisely the silent-retcon pattern Rule 6 forbids. Branch-aware reachability makes the supersession effect explicit and auditable. |
| §Tooling Recommendation (no operating on prose alone) | aligns | The reachability check operates on PG record fields and BR lineage — structural metadata, not prose. |

## 7. Testing strategy

Add to `tools/validators/tests/structural/stchar-supersession-integrity.test.ts`:

- **Positive (currently failing, will pass after this spec):**
  - Branch A regenerates `STCHAR-2` from `STCHAR-1` at PG-6. Descendant PG-7 in branch A uses `STCHAR-2` — PASS (unchanged).
  - Sibling branch B's page PG-8, whose ancestor path does not include PG-6, still uses `STCHAR-1` — PASS (was failing under ordinal-only).
- **Positive (currently passing, must still pass):**
  - Linear story: PG-5 supersedes `STCHAR-1` with `STCHAR-2`. PG-6 (descendant) uses `STCHAR-2` — PASS.
  - PG-4 (pre-supersession ancestor of the supersession page) uses `STCHAR-1` — PASS.
- **Negative (must continue to fail):**
  - Branch A at PG-6 supersedes `STCHAR-1` → `STCHAR-2`. Descendant PG-7 (branch A) still carries `STCHAR-1` as active — FAIL with the new diagnostic.
  - Successor `STCHAR-2` not active on a descendant page where the superseded `STCHAR-1` is active — FAIL.
- **Ancestry primitive unit tests** (in a separate test file matching the primitive's module location):
  - `pageAncestry(root)` returns `[root]` or `[]` (verify which contract the implementing ticket chooses; document).
  - `pageAncestry(PG-7)` for a multi-step chain returns `[PG-7, PG-6, ..., root]`.
  - `isAncestor(root, leaf)` returns true; `isAncestor(leaf, root)` returns false; `isAncestor(siblingA, siblingB)` returns false.
  - Defensive: cycle detection returns gracefully (no infinite loop).
  - Defensive: missing parent reference terminates ancestry without error.

## 8. Sequencing

1. **Stage 1 — Ancestry primitive:** §4.1 inventory + implementation + unit tests.
2. **Stage 2 — Validator reachability replacement:** §4.2 + extended supersession-integrity tests.
3. **Stage 3 — Doc-encouragement gate update:** §4.4 (skill note).
4. **Stage 4 — Validation pass:** run all validators against red-bunny and any other STCHAR-bearing bundle. Confirm no regressions.

This spec is independently sequenced from SPEC-74. The doc-encouragement gate in §4.4 references the `regeneration_reason_class: durable_branch_transformation` enum value from SPEC-74 §4.7 — if this spec lands before SPEC-74, the implementing ticket should defer the §4.4 doc update or stage it conditionally on SPEC-74's landing.

## 9. References

- Source report: `reports/stchar-distillation-rework.md` §6.13 (the supersession concern).
- Companion triage: [`docs/triage/2026-05-23-stchar-distillation-rework-triage.md`](../docs/triage/2026-05-23-stchar-distillation-rework-triage.md).
- Related: `specs/SPEC-74-stchar-distillation-boundary-hardening.md` (provides the `regeneration_reason_class: durable_branch_transformation` enum value the doc-gate references).
- Verified validator surface: `tools/validators/src/structural/stchar-supersession-integrity.ts:33-42` (ordinal-only reachability).
- FOUNDATIONS: Rule 4, Rule 6, §Story Bundles §6.1.

## Outcome

When this spec lands, a branch-local STCHAR regeneration (e.g., `regeneration_reason_class: durable_branch_transformation` on branch A at PG-6) no longer silently forces sibling branches to use the regenerated profile. The supersession validator distinguishes descendant pages (must use the successor) from non-descendant pages (may continue using the predecessor). A global supersession is achieved operationally by regenerating on the bundle's root branch, where every page is a descendant by construction — no new schema discriminator is needed. The branch-ancestry primitive becomes available for any future cross-branch validator that needs to reason about reachability.
