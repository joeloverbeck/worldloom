# SPEC95SCECOVIND-004: Annotate the §4.6 legacy-receipt deferral in the shared story-record schemas

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes (docs only) — `.claude/skills/_shared-templates/story-record-schemas.md` §4.6. No code, no schema, no validator change.
**Deps**: None

## Problem

SPEC-95 D4 set out to retire the legacy page-prose receipt schema surface. Two findings from the SPEC-95 reassessment reshaped it: (a) the schema file `tools/validators/src/schemas/prose-receipt.schema.json` was **already removed by SPEC-93** (commit `04100b18`), so no file removal remains; (b) the shared-schemas §4.6 "Legacy prose receipt" block is **retained/deferred**, because the §5 sweep confirms a live consumer — `story-fact-promotion-to-canon` still reads `pages-prose-receipts/<page_id>.yaml` and its `verdict` for prose-evidence source kinds on legacy bundles. Per SPEC-95 AC#5, §4.6 is kept **with a note** documenting that live consumer and the deferral. This ticket adds that note so the retention rationale is discoverable at the §4.6 block itself rather than only in the spec. (SPEC-95 §2 D4, AC#5; reassessment findings I1+I2.)

## Assumption Reassessment (2026-05-29)

1. `.claude/skills/_shared-templates/story-record-schemas.md` §4.6 "Legacy prose receipt" exists (heading at line 950) and documents the `pages-prose-receipts/PG-<integer>.yaml` shape. `tools/validators/src/schemas/prose-receipt.schema.json` does NOT exist at HEAD (`find tools -name '*prose-receipt*'` returns only `scene-prose-receipt.schema.json`) — already removed by SPEC-93 (`04100b18`, "SPEC93DECSTATUR-003 validator retirement"). No registered `prose_receipt_*` validator exists (only the scene variant). The live consumer is confirmed: `story-fact-promotion-to-canon/SKILL.md` (lines 155/167/195) loads `pages-prose-receipts/<page_id>.yaml` and reads `verdict` (PASS/WARN/FAIL) for prose-evidence source kinds.
2. SPEC-95 §2 D4 (post-reassessment) + AC#5: the file-removal portion is already-landed (no action); the §4.6 block is retained with a note documenting `story-fact-promotion-to-canon` as the live consumer and the removal deferred until that consumer is migrated. SPEC-95 §9 Risks schedules the eventual §4.6 removal behind a future migration of `story-fact-promotion-to-canon` off legacy receipts (likely the SPEC-96/97 explorer cutover), at which point the §5 sweep is re-run to confirm zero live consumers before deleting.
3. Cross-artifact boundary under audit: the shared-template §4.6 contract (consumed by story-pipeline skills that read the legacy receipt shape) and its live consumer `story-fact-promotion-to-canon`. This ticket only annotates §4.6; it does not alter the schema's field definitions, does not touch `story-fact-promotion-to-canon`, and does not remove the block.
4. FOUNDATIONS — Rule 6 (No Silent Retcons). Retaining a legacy surface without recording WHY would leave a future maintainer unsure whether §4.6 is dead-but-uncleaned or deliberately-kept. The deferral note is the Rule-6 audit-trail action: it attributes the retention (live consumer named) and the deferral condition (consumer migration), so the retention is a documented decision rather than a silent omission.

## Architecture Check

1. Placing the deferral note at the §4.6 block itself (rather than only in the SPEC-95 spec) makes the retention rationale discoverable to anyone reading the shared template — the natural place a maintainer looks before considering removing the legacy block. The note is a one-paragraph annotation; it changes no field definition.
2. No backwards-compatibility shim and no code change: the legacy block stays exactly as-is in its schema content; only an explanatory deferral note is added.

## Verification Layers

1. Deferral note present at §4.6 → codebase grep-proof: `grep -n "story-fact-promotion-to-canon" .claude/skills/_shared-templates/story-record-schemas.md` returns a match inside the §4.6 block, and the note names the deferral condition (consumer migration) + cites SPEC-95.
2. Single-layer ticket: this is a documentation annotation with no code, schema, or behavior change, so a grep-proof of the added note plus the §5 completeness sweep (no unexpected live `prose-receipt.schema` references) is the complete verification surface; no test or skill dry-run applies.

## What to Change

### 1. Add the deferral note to §4.6 (`.claude/skills/_shared-templates/story-record-schemas.md`)

Inside the §4.6 "Legacy prose receipt" block, add a short note recording: the block is deliberately retained (not dead inventory); the live consumer is `story-fact-promotion-to-canon` (reads `pages-prose-receipts/<page_id>.yaml` `verdict` for prose-evidence source kinds on legacy bundles); removal is deferred per SPEC-95 §9 until that consumer is migrated off legacy receipts (likely the SPEC-96/97 cutover), after which the §5 sweep is re-run to confirm zero live consumers before deleting. Note that the companion schema file `prose-receipt.schema.json` was already removed by SPEC-93. Do not alter the block's field definitions.

## Files to Touch

- `.claude/skills/_shared-templates/story-record-schemas.md` (modify)

## Out of Scope

- Removing the §4.6 block (deferred — this ticket retains it with a note).
- Any change to `story-fact-promotion-to-canon` or its legacy-receipt reads.
- Any change to the §4.7 scene-prose receipt block (the live surface) or `scene-prose-receipt.schema.json`.
- Re-creating or referencing `prose-receipt.schema.json` (already removed by SPEC-93).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "story-fact-promotion-to-canon" .claude/skills/_shared-templates/story-record-schemas.md` → match inside the §4.6 block; the note names the deferral condition and cites SPEC-95.
2. `find tools -name 'prose-receipt.schema.json'` → zero matches (confirms the already-landed removal; this ticket does not reintroduce it).
3. SPEC-95 §5 completeness sweep shows no unexpected live `prose-receipt.schema` reference reintroduced by this ticket.

### Invariants

1. The §4.6 block's field definitions are unchanged; only an explanatory deferral note is added.
2. The §4.7 scene-prose receipt block remains the live surface and is untouched.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based (grep-proof of the deferral note + the §5 completeness sweep) and the live-consumer coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n "story-fact-promotion-to-canon" .claude/skills/_shared-templates/story-record-schemas.md`
2. `grep -rn "prose-receipt.schema" .claude/skills/ docs/ tools/world-index/src tools/validators/src tools/world-mcp/src tools/story-explorer/src | grep -v archive/` (the §5 sweep slice — expect only intentional references)
3. A grep-only verification boundary is correct: this ticket adds documentation prose to a shared template with no code, schema, or test surface to exercise.
