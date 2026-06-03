# SPEC104BEATEMDET-010: Web types mirror + typed beat-templates API client

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — extends `tools/manual-story-studio/web/src/types/manual-story.ts` (hand-maintained backend mirror per SPEC-103 §4 rule); creates `tools/manual-story-studio/web/src/api/beat-templates.ts` (typed client for the new HTTP surface)
**Deps**: 002

## Problem

SPEC-104 §2.4 (CRUD UI) and §2.5 (Candidate Cards UI) consume the new beat-template HTTP surface (ticket 006 — CRUD routes + `POST .../moment-composer/template-candidates`). The frontend pages (tickets 011 + 012) need a typed client to call those routes plus typed mirrors of the backend `BeatTemplate` schema (ticket 002). Per SPEC-103 §4's hand-maintained-mirror rule (the Vite frontend cannot import from the backend's Node16 module tree), every backend schema extension requires a parallel update in `web/src/types/manual-story.ts`. This ticket lands both surfaces so tickets 011 and 012 have a typed API to call.

## Assumption Reassessment (2026-05-31)

1. Codebase: `tools/manual-story-studio/web/src/types/manual-story.ts:113` is the hand-maintained mirror of `tools/manual-story-studio/src/schema/manual-story.ts` (per SPEC-103 §4 — the web bundle uses Vite (bundler) module resolution and cannot import from the backend's Node16 module tree, so the mirror must follow every backend schema extension). Existing typed clients live under `tools/manual-story-studio/web/src/api/` (e.g., `records.ts`, `prompts.ts`, `segments.ts`, `manuscript.ts`), each exporting fetch-based functions per the SPEC-101/102/103 pattern.
2. Spec: SPEC-104 §4 modify-frontend explicitly names `tools/manual-story-studio/web/src/types/manual-story.ts` as needing the beat-template TypeScript types mirror; §4 create-frontend names `tools/manual-story-studio/web/src/api/beat-templates.ts` as the typed client. SPEC-104 §2.6 also references the new `recent_template_advisory_window: number` field on `ManualStoryPromptPolicy` (added by ticket 001), which the web mirror must include for any UI that reads or edits prompt policy.
3. Cross-skill boundary: the typed client surface exposes the four HTTP operations (GET list, GET single, POST create, PUT update, DELETE) plus the candidate-computation route (POST template-candidates) that tickets 011 and 012 consume. The types mirror exposes the `BeatTemplate` + nested types (per ticket 002) to the frontend's TypeScript surface. No runtime dependency between backend and frontend trees — this is a hand-maintained mirror per the established SPEC-103 discipline.
4. Schema extension (was template item 6): this introduces a new typed client + extends the existing web types mirror with new beat-template types and the `recent_template_advisory_window` field. The mirror extension is additive (new types alongside existing ones; new optional field on `ManualStoryPromptPolicy`); the typed client is greenfield. No breaking changes to existing frontend code.

## Architecture Check

1. Hand-maintained mirror preserves SPEC-103 §4's established discipline (no runtime cross-tree imports). The alternative — sharing types via a workspace package — was considered and rejected at SPEC-101 / SPEC-103 time because the existing manual-story-studio package is structured as `src/` (Node16 backend) + `web/` (Vite frontend) with separate `package.json` files and no workspace root; introducing a shared types package would be a substantial architectural change disproportionate to a single class addition. The mirror is the established pattern; this ticket follows it for `BeatTemplate`.
2. No backwards-compatibility aliasing or shims introduced. The typed client is greenfield; the type mirror is additive.

## Verification Layers

1. The web types mirror compiles with the new types defined → TypeScript compile (`npm --prefix web run build`, or `cd web && tsc --noEmit` equivalent).
2. The typed client exports the expected functions (`listBeatTemplates`, `getBeatTemplate`, `createBeatTemplate`, `updateBeatTemplate`, `deleteBeatTemplate`, `getCandidates`) → codebase grep-proof.
3. The web mirror's `BeatTemplate` shape matches the backend `BeatTemplate` shape from ticket 002 (manual review at implementation time; subsequent backend schema changes require corresponding mirror updates per SPEC-103 §4's established discipline).
4. The web `ManualStoryPromptPolicy` mirror includes `recent_template_advisory_window: number` (matches backend ticket 001).

## What to Change

### 1. Extend `tools/manual-story-studio/web/src/types/manual-story.ts`

Mirror these types (parallel to the backend's `tools/manual-story-studio/src/schema/beat-template.ts` from ticket 002):

- `BeatTemplateMoveFamily` (17-value union literal type)
- `BeatTemplateToneFit` (11-value union literal type)
- `BeatTemplateRelationshipAxis` (6-value union literal type)
- `BeatTemplateBeatFunction` (5-value union literal type)
- `BeatTemplateClassification` (with `ManualStoryContentIntensity` from existing mirror)
- `BeatTemplateRoleSlot` (with `ManualStoryRole` from existing mirror at the equivalent web type)
- `BeatTemplateRequires`
- `BeatTemplateExcludes`
- `BeatTemplateBeat`
- `BeatTemplate` (top-level interface mirroring the backend)
- `BeatTemplateCandidate`: `{ template: BeatTemplate; why_suggested: string[]; advisory_flags: { recently_used: boolean; recently_used_at_segment?: string } }` (matches the filter output shape from ticket 005 + the candidate-route response from ticket 006)

Extend the existing `ManualStoryPromptPolicy` mirror with `recent_template_advisory_window: number` (matches ticket 001).

### 2. Create `tools/manual-story-studio/web/src/api/beat-templates.ts`

Typed fetch-based client following the SPEC-101/102/103 `web/src/api/*.ts` pattern:

```
listBeatTemplates(worldSlug, msSlug): Promise<BeatTemplate[]>
getBeatTemplate(worldSlug, msSlug, id): Promise<BeatTemplate>
createBeatTemplate(worldSlug, msSlug, template: Omit<BeatTemplate, 'id'>): Promise<BeatTemplate>
updateBeatTemplate(worldSlug, msSlug, id, template: BeatTemplate): Promise<BeatTemplate>
deleteBeatTemplate(worldSlug, msSlug, id, { force?: boolean }): Promise<{ archived: boolean; deleted: boolean }>
getCandidates(worldSlug, msSlug, input: CandidateRequestBody): Promise<BeatTemplateCandidate[]>
```

The `CandidateRequestBody` mirrors the `POST .../moment-composer/template-candidates` request body (ticket 006): selected cast, optional move_family/tags/location, moment directive. The response is `BeatTemplateCandidate[]` as defined in the mirror above.

## Files to Touch

- `tools/manual-story-studio/web/src/types/manual-story.ts` (modify)
- `tools/manual-story-studio/web/src/api/beat-templates.ts` (new)

## Out of Scope

- The frontend pages that use the typed client — tickets 011 + 012.
- The backend CRUD + candidates routes — ticket 006.
- The backend schema definition — ticket 002.
- Runtime cross-tree imports (rejected per SPEC-103 §4; mirror discipline applies).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm run build:backend && npm --prefix web test` succeeds (the web TypeScript check at `npm --prefix web test` validates the mirror types compile).
2. `grep -n 'BeatTemplate' tools/manual-story-studio/web/src/types/manual-story.ts` returns matches for each new typed interface (10+ matches expected).
3. `grep -n 'recent_template_advisory_window' tools/manual-story-studio/web/src/types/manual-story.ts` returns a match on the `ManualStoryPromptPolicy` mirror.
4. `grep -n 'listBeatTemplates\|getCandidates' tools/manual-story-studio/web/src/api/beat-templates.ts` returns matches for the typed client functions.

### Invariants

1. The web types mirror is hand-maintained — every backend schema extension requires a corresponding mirror update per SPEC-103 §4's discipline. The mirror is not generated; it is authored.
2. The typed client uses fetch with the established URL pattern (`/api/worlds/:slug/manual-stories/:msSlug/beat-templates` + `/api/worlds/:slug/manual-stories/:msSlug/moment-composer/template-candidates`); function signatures take typed args and return typed promises.
3. No runtime cross-tree imports introduced (web does not import from src/); the mirror discipline is preserved.

## Test Plan

### New/Modified Tests

1. `None — typed client + types mirror are validated by the existing 'cd web && npm test' TypeScript check; runtime behavior is exercised by ticket 011 (CRUD UI) and ticket 012 (Candidates UI + MomentComposer integration) tests.`

### Commands

1. `cd tools/manual-story-studio && npm --prefix web test` (TypeScript check; targeted verification).
2. `cd tools/manual-story-studio && npm test` (full-pipeline verification; runs backend build + tests + web TypeScript check).
3. The targeted command above is the correct verification boundary because this ticket's deliverable is type definitions + typed-function exports; runtime behavior is exercised by downstream tickets (011, 012, 014 capstone). The web TypeScript check catches type errors in the mirror or the client signatures.
