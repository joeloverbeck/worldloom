# SPEC94SCNPUBSTA-001: Contract — remove `SCN.status`, define derived publication indicator

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None — edits shared-template markdown contracts only (`story-record-schemas.md`, `story-state-contract.md`); no tool/skill/hook/schema code.
**Deps**: None

## Problem

The `SCN` record (`story-record-schemas.md §4.5.20`) carries a required `status: planned | rendered | attached` field, but the only reachable value is `planned`: `branching-story-scene-plan` writes `planned` on every create and supersede, and `branching-story-scene-prose-attach` is forbidden from mutating `SCN`. `rendered` and `attached` are dead enum members, and a permanently-`planned` field on an append-only record misrepresents publication state to its consumers (INDEX rendering, `previous_scene_id` resolution). Publication state is a function of artifact presence + receipt verdict — volatile facts that must be derived at read time, not snapshotted into the append-only record. This ticket establishes the authoritative contract: remove the stored field from the canonical schema definition and document the read-time derived indicator that replaces it.

## Assumption Reassessment (2026-05-29)

1. `story-record-schemas.md` §4.5.20 heading is at L926; the `status: planned | rendered | attached*` field line is at L933; the SCN role note ("Range/status changes use the patch engine's append-only supersession path") is at L949. `story-state-contract.md` L434 describes `SCN` as "the only engine-routed membership/status artifact". Verified by grep this session.
2. SPEC-94 §2 item 1 (remove status line + add derived-publication note to §4.5.20, reconcile L949) and §2 item 5 (define the minimal derived indicator in the shared contract, per §3) name these two shared-template files as the contract surface. §3's indicator table (`planned` / `prose-present` / `attached:PASS|WARN|FAIL` / `superseded`) is the derivation to document.
3. Cross-artifact shared boundary under audit: the SCN schema definition in `story-record-schemas.md` is the canonical contract that `tools/validators/src/schemas/story-scene.schema.json` (SPEC94SCNPUBSTA-002) mirrors and that the skills (003, 004) and docs (005) reference. This ticket is the authoritative source; the JSON schema + skills + docs must land coherently with it.
4. FOUNDATIONS principle motivated: "Rendered prose is non-authoritative and derived from committed state, never a second state engine" + the append-only `_source/` discipline (FOUNDATIONS §Story Bundles §4/§4a; story-state-contract §1). Removing a stored field whose value is always derivable, and documenting the derivation instead, is the derive-don't-store discipline applied to publication state. No hash coupling is introduced (the indicator is file-presence + receipt-verdict only), consistent with the author's rejection of hash coupling on editable artifacts.

## Architecture Check

1. The schema definition is the single authoritative place to remove the field; documenting the derived indicator in the shared contract gives every read surface (INDEX today, the SPEC-95 coverage layer next) one canonical derivation to implement, rather than each surface inventing its own. This is cleaner than Option B (redefine `status` to a `active | superseded` lifecycle enum), which would still require read-time derivation of publication state AND duplicate the `supersedes` pointer.
2. No backwards-compatibility shim: there are zero `SCN` records in the repository, so no grandfathering clause is added. A stray legacy `status` is simply ignored by the read-time indicator.

## Verification Layers

1. `status` field absent from §4.5.20 → codebase grep-proof (`grep -n "status: planned" .claude/skills/_shared-templates/story-record-schemas.md` returns zero).
2. Derived-indicator definition present in the shared contract → codebase grep-proof (`grep -n "prose-present\|attached:PASS" .claude/skills/_shared-templates/story-state-contract.md` returns matches).
3. Role-note + membership/status language reconciled → codebase grep-proof (no "Range/status changes" at §4.5.20 L949; no "membership/status artifact" at story-state-contract L434).
4. FOUNDATIONS alignment → manual review: the derived indicator uses file presence + receipt verdict only, adds no hash/freshness fingerprint.

## What to Change

### 1. `story-record-schemas.md` §4.5.20 (`SCN`)

- Remove the `status: planned | rendered | attached*` field line (L933).
- Add a one-line note: scene publication state is **derived at read time** from scene-artifact presence (`prose_path` / `receipt_path` files) plus the scene-prose receipt `verdict`, and is never stored on the append-only `SCN`.
- Reconcile the role note (L949): "**Range/status** changes use the patch engine's append-only supersession path" → "**Range** changes use the patch engine's append-only supersession path" (only the range can change now that `status` is gone).

### 2. `story-state-contract.md`

- Reconcile L434: "The `SCN` record remains the only engine-routed **membership/status** artifact" → "…engine-routed **membership** artifact".
- Add the derived publication indicator definition (the §3 table) where the contract describes scene publication, presentational-only, no stored field:
  - `planned` — `prose_path` file absent.
  - `prose-present` — `prose_path` present, `receipt_path` absent.
  - `attached:PASS` / `attached:WARN` / `attached:FAIL` — `receipt_path` present; label carries the receipt `verdict`.
  - `superseded` — the `SCN` is named in another `SCN`'s `supersedes` (not the latest in its lineage).
  - State explicitly: not a schema field, not validated, not authoritative for any state turn; deliberately omits any "stale"/freshness state (which would require hashing editable artifacts).

## Files to Touch

- `.claude/skills/_shared-templates/story-record-schemas.md` (modify)
- `.claude/skills/_shared-templates/story-state-contract.md` (modify)

## Out of Scope

- The validator JSON schema (`story-scene.schema.json`) and its tests — SPEC94SCNPUBSTA-002.
- The two scene skills' prose — SPEC94SCNPUBSTA-003 / -004.
- FOUNDATIONS / docs / fixture reconciliation — SPEC94SCNPUBSTA-005.
- Any hash/freshness fingerprint; any `ScenePublicationState` 8-state machine; any change to the verbatim scene-plan contract (all rejected per SPEC-94 §1).
- Any change to `SCN` membership fields, scene-range validators, or the `SE`/`PG`/`CHC` engine.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "status" .claude/skills/_shared-templates/story-record-schemas.md` shows no `SCN` publication-status field in §4.5.20 (entity/clock/thread `status` references elsewhere untouched).
2. The §4.5.20 derived-publication note and the `story-state-contract.md` derived-indicator definition are present and describe file-presence + receipt-verdict derivation with no hashing.
3. `grep -n "membership/status artifact" .claude/skills/_shared-templates/story-state-contract.md` returns zero.

### Invariants

1. `SCN` remains an append-only membership record; no volatile/derived field is stored on it.
2. The derived indicator is presentational only — never validated, never an input to a state turn.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n "status: planned\|Range/status changes" .claude/skills/_shared-templates/story-record-schemas.md` (expect zero)
2. `grep -n "membership/status artifact" .claude/skills/_shared-templates/story-state-contract.md` (expect zero)
3. Markdown contract files have no build step; the §6 completeness sweep in SPEC94SCNPUBSTA-006 is the cross-cutting acceptance boundary.
