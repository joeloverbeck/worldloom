# SPEC104BEATEMDET-012: Candidate cards UI + MomentComposer integration + PromptHistory template display

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — new frontend component `tools/manual-story-studio/web/src/components/BeatTemplateCandidates.tsx`; modifies `tools/manual-story-studio/web/src/pages/MomentComposer.tsx` (replaces the existing beat-template placeholder fieldset at lines 234-237 with the BeatTemplateCandidates component; threads `selected_template` through the compose-preview call); modifies `tools/manual-story-studio/web/src/pages/PromptHistory.tsx` (displays template per prompt per SPEC-104 §6 acceptance criterion 11)
**Deps**: 010, 006, 008

## Problem

SPEC-104 §2.5 mandates the Candidate Cards UI rendered in the Moment Composer screen (below the relevant records picker). Each candidate is a card showing title, move_family, beat count, `why_suggested` lines (from ticket 005), "Use this template" / "Skip" actions, and a recent-use advisory badge. "No template" is always an option. The selected template flows through to the prompt composer's §6 section via the routes-layer ID→path resolution (ticket 007 → ticket 008). Additionally, SPEC-104 §6 acceptance criterion 11 requires the Prompt History view (existing SPEC-103 page) to display the template used per prompt — a small UI tweak that fits naturally alongside the MomentComposer integration since both consume the same `included_template_path` data.

## Assumption Reassessment (2026-05-31)

1. Codebase: `tools/manual-story-studio/web/src/pages/MomentComposer.tsx:234-237` contains the existing beat-template placeholder fieldset (verified during /reassess-spec session) reading *"Reserved for SPEC-104. No template selector in this iteration."* This is the exact replacement target. `tools/manual-story-studio/web/src/pages/PromptHistory.tsx` (existing per SPEC-103 §2 item 8 — verified to exist) displays saved prompts with id, created_at, moment_directive snippet, links to segments; it currently does not display the template. The typed client from ticket 010 (`web/src/api/beat-templates.ts`) exposes `getCandidates(worldSlug, msSlug, input)` returning `BeatTemplateCandidate[]`.
2. Spec: SPEC-104 §2.5 enumerates the card content (title, move_family, beat count, why_suggested lines, recent-use advisory badge, Use/Skip actions, "No template" always an option). §2.6 declares the Moment Composer passes the selected template ID through to the routes layer (ticket 007). §6 acceptance criterion 11 declares the Prompt History view displays the template used per prompt.
3. Cross-skill boundary: this ticket touches three frontend surfaces — a new component (BeatTemplateCandidates), an existing page (MomentComposer placeholder replacement + selected_template thread-through), and another existing page (PromptHistory template display). The component consumes the typed client from ticket 010; the MomentComposer integration consumes ticket 007's routes-layer surface; the PromptHistory tweak consumes the existing prompts-listing endpoint (which already returns `included_template_path` per SPEC-102's landed sidecar shape, with a tweak to surface template id derived from the path).

## Architecture Check

1. The BeatTemplateCandidates component is the natural integration boundary — it owns candidate-fetch, candidate-render, selection-state, and the "Use this template" / "Skip" / "No template" action surface. MomentComposer composes the component below the records picker per spec §2.5 without needing to know candidate-rendering internals. Alternative considered and rejected: inline candidate rendering directly in MomentComposer.tsx — rejected because the candidate UI is substantial (per-card layout, advisory badges, action buttons) and would bloat MomentComposer beyond its current scope.
2. The PromptHistory tweak is a small co-located change (3-5 lines) that displays the template name/ID alongside the existing per-prompt metadata; co-locating in this ticket avoids creating a 1-line standalone ticket and keeps the §6 acceptance criterion 11 coverage with the related frontend changes.
3. No backwards-compatibility aliasing or shims introduced. The MomentComposer placeholder is replaced, not aliased; the PromptHistory tweak is additive (new display element).

## Verification Layers

1. BeatTemplateCandidates renders a list of candidates with per-card title + move_family + beat count + why_suggested lines + advisory badge + Use/Skip actions → component test against fixture `BeatTemplateCandidate[]`.
2. Selecting a candidate sets the selected_template state in MomentComposer; subsequent compose-preview calls pass the selected template ID → component test asserting the API client call signature.
3. "No template" action clears the selected_template state → component test.
4. The MomentComposer placeholder fieldset at lines 234-237 is removed; the BeatTemplateCandidates component renders in its place → component test + grep-proof (`grep -n "Reserved for SPEC-104" tools/manual-story-studio/web/src/pages/MomentComposer.tsx` returns zero matches).
5. PromptHistory displays the template per prompt when `included_template_path` is non-null → component test against fixture prompts (some with templates, some without).
6. End-to-end flow (covered by ticket 014 capstone): the candidate is selected → compose-preview → segment save → segment sidecar's `selected_template` is populated.

## What to Change

### 1. Create `tools/manual-story-studio/web/src/components/BeatTemplateCandidates.tsx`

Props:
- `worldSlug`, `msSlug` (for the typed client call).
- `candidateInput` (selected cast, optional move_family/tags/location, moment directive — passed from MomentComposer state).
- `selectedTemplateId: string | null` (controlled by parent).
- `onSelect(templateId: string | null): void` (callback; null when "No template" is chosen).

Behavior:
- On mount and on `candidateInput` change, call `getCandidates(worldSlug, msSlug, candidateInput)` from the typed client (ticket 010).
- Render the response `BeatTemplateCandidate[]` as a list of cards. Each card shows:
  - Title (large)
  - move_family badge (colored chip)
  - Beat count (e.g., "3 beats")
  - Up to 4 `why_suggested` lines (per ticket 004's cap)
  - Advisory badge when `advisory_flags.recently_used === true` (e.g., "Recently used at SEG-N")
  - "Use this template" button (sets selected) or "Selected ✓" indicator when already selected
  - "Skip" button (clears selection when this candidate is selected)
- A persistent "No template" option above the candidate list, always selectable.

### 2. Modify `tools/manual-story-studio/web/src/pages/MomentComposer.tsx`

- Replace the placeholder fieldset at lines 234-237 with `<BeatTemplateCandidates ... />`.
- Add `selectedTemplateId` to the component state; pass it as the `selected_template` field in the compose-preview API call (consumed by ticket 007's routes-layer surface).
- Wire the `onSelect` callback to update local state.

### 3. Modify `tools/manual-story-studio/web/src/pages/PromptHistory.tsx`

- For each listed prompt, when the prompt sidecar's `included_template_path` is non-null, derive the template ID from the path (e.g., `mtemplate-3` from `records/beat-templates/mtemplate-3.yaml`) and display it as a small badge or label alongside the existing prompt metadata.
- When `included_template_path` is null, display nothing (or "No template" as a low-emphasis subtitle).

## Files to Touch

- `tools/manual-story-studio/web/src/components/BeatTemplateCandidates.tsx` (new)
- `tools/manual-story-studio/web/src/pages/MomentComposer.tsx` (modify)
- `tools/manual-story-studio/web/src/pages/PromptHistory.tsx` (modify)

## Out of Scope

- The CRUD UI page (BeatTemplates.tsx + BeatTemplateForm.tsx) — ticket 011.
- The typed client + types mirror — ticket 010.
- The backend candidate-computation route — ticket 006.
- The composer-side stage 5 + section 6 / 12 changes — ticket 008.

## Acceptance Criteria

### Tests That Must Pass

1. BeatTemplateCandidates renders a fixture list with per-card title + move_family + beat count + why_suggested lines + advisory badge + actions.
2. Selecting a candidate updates the parent state and the next compose-preview API call includes `selected_template: "mtemplate-N"`.
3. The "No template" action clears the selection; subsequent compose-preview calls omit `selected_template` (or pass null).
4. MomentComposer no longer contains the "Reserved for SPEC-104" placeholder string → `grep -n "Reserved for SPEC-104" tools/manual-story-studio/web/src/pages/MomentComposer.tsx` returns zero matches.
5. PromptHistory displays the template ID for prompts with non-null `included_template_path`; displays nothing (or low-emphasis "No template") for prompts with null.
6. `cd tools/manual-story-studio && npm --prefix web test` succeeds (TypeScript + component tests).

### Invariants

1. The candidate cards consume the typed client from ticket 010 (no inline fetch calls; no parallel typedefs).
2. "No template" is always selectable; the user can compose a prompt without any template (selected_template === null).
3. The MomentComposer placeholder is fully replaced (no commented-out remnants).
4. The PromptHistory display is read-only — clicking the template badge does not trigger a navigation or mutation (display-only).

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/web/src/components/BeatTemplateCandidates.test.tsx` (new) — covers the component-level acceptance criteria (render, select, skip, no-template).
2. `tools/manual-story-studio/web/src/pages/MomentComposer.test.tsx` (modify, existing per SPEC-102) — extend with a test asserting the BeatTemplateCandidates integration replaces the placeholder.
3. `tools/manual-story-studio/web/src/pages/PromptHistory.test.tsx` (modify if existing per SPEC-103, else new) — assert template display for fixtures with both null and non-null included_template_path.

### Commands

1. `cd tools/manual-story-studio && npm --prefix web test` (targeted verification — runs the web TypeScript check + component tests).
2. `cd tools/manual-story-studio && npm test` (full-pipeline verification).
3. The targeted command above is the correct verification boundary because this ticket's deliverables are frontend components + page tweaks; backend integration is exercised by tickets 006/007/008's tests and end-to-end flow by ticket 014's capstone.
