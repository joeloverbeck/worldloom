# SPEC109MANSTOSTU-001: Add CurrentContext schema type

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — adds `src/schema/current-context.ts` to `@worldloom/manual-story-studio`; no impact on existing record schemas.
**Deps**: None

## Problem

SPEC-109 introduces a per-story `current-context.yaml` author-authored config artifact that captures the cockpit's active point of view onto the record corpus (current location, current cast, POV holder, active pressure clocks, active secrets/questions, pinned records, must-not-reveal constraints, current handoff summary, last accepted segment, last reviewed-after segment). The new artifact requires a typed schema before any read / write / validate / route / composer / UI ticket can depend on it. This ticket lands the foundational TypeScript interface and is the head of the SPEC-109 dependency chain.

## Assumption Reassessment (2026-06-01)

1. **Codebase**: `tools/manual-story-studio/src/schema/` currently contains `manual-story.ts` (metadata + record types) and `beat-template.ts`. Adding `current-context.ts` follows the existing one-file-per-schema convention. No name collision; the `current-context.ts` filename does not exist in `src/schema/` today.
2. **Spec**: SPEC-109 §2 item 1 declares the `CurrentContext` interface verbatim with 10 fields: `current_location` (`string | null`), `current_cast` (`string[]`), `pov_holder` (`string | null`), `active_pressure_clocks` (`string[]`), `active_secrets_questions` (`string[]`), `pinned_records` (`string[]`), `must_not_reveal` (`string[]`), `current_handoff_summary` (`string`), `last_accepted_segment` (`string | null`), `last_reviewed_after_segment` (`string | null`). The spec's §3 Key decisions document the dual-surface `last_reviewed_after_segment` (per-record vs whole-story state-review-complete).
3. **Cross-skill boundary**: The `CurrentContext` type is the contract this batch's other tickets all consume — readers, validators, writers, route handlers, composer, UI form, and dashboard panel all import it. The shared boundary is the single exported interface; no per-consumer adapters are introduced.
4. **Live prefix correction (2026-06-02)**: `tools/manual-story-studio/src/schema/manual-story.ts` defines `MANUAL_RECORD_CLASS_PREFIXES.secrets` as `msecret`. SPEC-109 and the downstream validator ticket were corrected to use `msecret-<n>` for secret IDs so this new type does not imply a second secret-ID spelling.

## Architecture Check

1. A standalone schema file mirrors the existing `manual-story.ts` / `beat-template.ts` convention; co-locating the type definition with sibling schemas keeps import paths predictable for downstream tickets.
2. No backwards-compatibility shims: the type is new, the file is new, no aliasing is required.

## Verification Layers

1. `CurrentContext` interface exports → codebase grep-proof (`grep -n "export interface CurrentContext" tools/manual-story-studio/src/schema/current-context.ts`).
2. Field-set matches SPEC-109 §2 item 1 verbatim → codebase grep-proof (every field name from the spec resolves).
3. `tsc -p tsconfig.json` over the backend compiles → backend build command.
4. Single-layer ticket: no cross-skill or cross-artifact concern at this stage; downstream tickets (002-011) carry the cross-skill verification surface.

## Landed Changes

### 1. New schema file at `src/schema/current-context.ts`

Added the exported `CurrentContext` interface from SPEC-109 §2 item 1 with all 10 fields and comment annotations for ID-prefix hints plus the `last_reviewed_after_segment` SPEC-108 precondition note. The secret-ID comments use the live Manual Studio `msecret-<n>` prefix.

### 2. Same-family contract truthing

Corrected SPEC-109 and the downstream validator ticket to name the live `msecret-<n>` secret-ID prefix.

## Files to Touch

- `tools/manual-story-studio/src/schema/current-context.ts` (new)
- `specs/SPEC-109-manual-story-studio-current-context-layer.md` (modify — truth secret-ID prefix to live `msecret-`)
- `tickets/SPEC109MANSTOSTU-003.md` (modify — truth downstream validator-ticket prefix reference)

## Out of Scope

- Read / write / validate logic — owned by 002 / 004 / 003 respectively.
- Backend routes, frontend API wrapper, UI components — owned by 005 / 008 / 009 / 010 / 011.
- Health-integration consumer wiring — owned by 006.
- Composer wiring — owned by 007.
- Schema deepening of per-record fields (relationship/emotion/belief/plan/clock/secret/question/consequence) — explicitly deferred per SPEC-109 §Out of Scope and §3 Key decisions.

## Acceptance Criteria

### Tests That Must Pass

1. `tsc -p tsconfig.json` succeeds in `tools/manual-story-studio/` — confirms the new type compiles against the existing module graph.
2. The 10 fields listed in SPEC-109 §2 item 1 are all declared (verifiable by grep for each field name in the new file).

### Invariants

1. `CurrentContext` is exported; downstream tickets can `import { CurrentContext } from "./schema/current-context.js"` (or equivalent relative paths).
2. Field shapes match SPEC-109 verbatim — `null` is the typed absent value for nullable string fields; arrays are typed `string[]`.

## Test Plan

### New/Modified Tests

1. `None — schema-only ticket; verification is the backend tsc command and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `cd tools/manual-story-studio && npm run build:backend` — confirms the schema file compiles.
2. `grep -n "export interface CurrentContext" tools/manual-story-studio/src/schema/current-context.ts` — confirms the export landed.

## Outcome

Completed on 2026-06-02. Added `tools/manual-story-studio/src/schema/current-context.ts` with the exported `CurrentContext` interface and the 10 SPEC-109 fields. During reassessment, corrected the SPEC-109 current-context contract and downstream validator ticket to use the existing Manual Studio `msecret-<n>` secret-ID prefix.

## Verification Result

1. `cd tools/manual-story-studio && npm run build:backend` — PASS; backend TypeScript compile completed successfully before and after the schema edit.
2. `rg -n 'export interface CurrentContext|current_location|current_cast|pov_holder|active_pressure_clocks|active_secrets_questions|pinned_records|must_not_reveal|current_handoff_summary|last_accepted_segment|last_reviewed_after_segment' tools/manual-story-studio/src/schema/current-context.ts` — PASS; export and all 10 fields are present.
3. Manual review of the current-context secret-ID references in `specs/SPEC-109-manual-story-studio-current-context-layer.md`, `tickets/SPEC109MANSTOSTU-003.md`, and `tools/manual-story-studio/src/schema/current-context.ts` — PASS; current contract prose uses the live `msecret-<n>` prefix.

## Deviations

- SPEC-109's draft secret-ID examples used a stale shorthand. The landed interface and same-family prose use the live `MANUAL_RECORD_CLASS_PREFIXES.secrets = "msecret"` spelling instead.
