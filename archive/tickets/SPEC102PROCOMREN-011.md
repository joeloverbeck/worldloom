# SPEC102PROCOMREN-011: Frontend API client + LintBadge component

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — adds `tools/manual-story-studio/web/src/api/prompts.ts` + `tools/manual-story-studio/web/src/components/LintBadge.tsx`. No impact on existing frontend modules.
**Deps**: 010

## Problem

The MomentComposer page (ticket 012) and PromptPreview page (ticket 013) need a typed API client that calls the four prompt routes shipped in ticket 010 (`POST /prompts/preview`, `POST /prompts`, `GET /prompts`, `GET /prompts/:id`). Both pages also need a shared `LintBadge` component that renders the lint findings consistently — clean / soft-warning / hard-blocking states — with the exact violating substring, section name, and tier per SPEC-102 §Scope item 4 ("Lint failures show as red banner items in the Prompt Preview UI with the exact violating substring, section name, and tier").

## Assumption Reassessment (2026-05-30)

1. Verified the existing API client pattern at `tools/manual-story-studio/web/src/api/records.ts` exports typed functions (`fetch`-based, JSON request/response). The same pattern applies to prompts. The existing frontend types module at `tools/manual-story-studio/web/src/types/manual-story.ts` mirrors backend types per the header comment ("Minimal mirror of tools/manual-story-studio/src/schema/manual-story.ts ... If a closed-enum value or per-class field is added in the backend schema module, mirror it here").
2. SPEC-102 §Scope item 4 enumerates the UI surface requirements for lint findings: red banner, exact violating substring, section name, tier; hard findings block the Copy button; soft findings show a "copy anyway?" override. SPEC-102 §Scope item 6 places the lint badge inside the Prompt Preview screen ("Shows lint status: 'clean external prompt' with section count, or numbered list of violations with section + offset"); the badge is also useful on the Moment Composer screen as a pre-generation summary signal.
3. Cross-artifact shared boundary: the `PromptLintResult`, `PromptLintFinding`, `PromptLintTier` types are backend-authored in ticket 002; the frontend mirrors them in `web/src/types/manual-story.ts` per the existing drift-policy comment. The API client returns the wire-shape result (compose + lint + sidecar draft). LintBadge consumes the lint result and decides rendering.

## Architecture Check

1. Co-locating the lint-finding mirror types with the existing `web/src/types/manual-story.ts` extends the established drift policy. Adding a separate types file for prompts would fragment the frontend types surface.
2. LintBadge is a presentation-only component: takes `lint: PromptLintResult` as a prop and renders. It does NOT manage state, navigation, or copy/save logic — those live on the consuming pages (012 / 013).
3. No backwards-compatibility aliasing — both files are greenfield; the existing API client pattern is followed without modification.

## Verification Layers

1. API client wraps all 4 routes — codebase grep-proof (`grep -nE 'prompts/preview|prompts/?(['\\`"]|\\$)|prompts/.+/(:id)?' tools/manual-story-studio/web/src/api/prompts.ts` returns 4 distinct endpoint references).
2. LintBadge renders all 3 visual states — schema validation (component snapshot or assertion test against a fixture lint result: `cleanForCopy: true`; `findings: [{tier: "soft"}]`; `findings: [{tier: "hard"}]`).
3. Frontend types mirror backend types — codebase grep-proof (`grep -n 'PromptLintTier\\|PromptLintFinding\\|PromptLintResult' tools/manual-story-studio/web/src/types/manual-story.ts` returns matches with the same field names).

## What to Change

### 1. Extend `tools/manual-story-studio/web/src/types/manual-story.ts`

Mirror the backend prompt types (`PromptLintTier`, `PromptLintFinding`, `PromptLintResult`, `PromptRunSidecar`, `PromptComposeResult`, `PromptComposeRequestInput`). Keep the comment policy ("mirror backend; drift is caught at runtime by the validator").

### 2. Create `tools/manual-story-studio/web/src/api/prompts.ts`

Following the records.ts pattern, export typed functions:

```ts
export async function previewPrompt(
  worldSlug: string,
  msSlug: string,
  input: PromptComposeRequestInput,
): Promise<PromptComposeResult>;

export async function savePrompt(
  worldSlug: string,
  msSlug: string,
  input: PromptComposeRequestInput & { lint_override?: { findings: PromptLintFinding[]; copied_anyway_at: string } },
): Promise<{ id: string; markdown_path: string; sidecar: PromptRunSidecar; lint: PromptLintResult }>;

export async function listPrompts(
  worldSlug: string,
  msSlug: string,
): Promise<{ prompts: Array<{ id: string; created_at: string; moment_directive_snippet: string }> }>;

export async function getPrompt(
  worldSlug: string,
  msSlug: string,
  promptId: string,
): Promise<{ markdown: string; sidecar: PromptRunSidecar }>;
```

Each function uses `fetch` against the corresponding endpoint; non-2xx responses are thrown as `Error` with the parsed error body.

### 3. Create `tools/manual-story-studio/web/src/components/LintBadge.tsx`

A small presentation component:

```tsx
import type { PromptLintResult } from "../types/manual-story.js";

interface LintBadgeProps {
  lint: PromptLintResult;
  sectionCount?: number;
}

export function LintBadge({ lint, sectionCount }: LintBadgeProps) {
  if (lint.cleanForCopy) {
    return (
      <div role="status" className="lint-badge lint-badge--clean">
        Clean external prompt
        {sectionCount !== undefined ? ` (${sectionCount} sections)` : ""}
      </div>
    );
  }

  const hardFindings = lint.findings.filter((f) => f.tier === "hard");
  const softFindings = lint.findings.filter((f) => f.tier === "soft");

  return (
    <div role="alert" className={`lint-badge ${hardFindings.length > 0 ? "lint-badge--hard" : "lint-badge--soft"}`}>
      <h3>
        {hardFindings.length > 0 ? `${hardFindings.length} hard violations (Copy blocked)` : `${softFindings.length} soft violations`}
      </h3>
      <ol>
        {lint.findings.map((finding, idx) => (
          <li key={idx}>
            <strong>{finding.tier}</strong> · {finding.section ?? "—"} · {finding.rule}: {finding.message}
            {finding.snippet ? <code>{finding.snippet}</code> : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
```

## Files to Touch

- `tools/manual-story-studio/web/src/types/manual-story.ts` (modify) — appends prompt-side type mirrors
- `tools/manual-story-studio/web/src/api/prompts.ts` (new)
- `tools/manual-story-studio/web/src/components/LintBadge.tsx` (new)

## Out of Scope

- MomentComposer page (ticket 012).
- PromptPreview page (ticket 013).
- App.tsx route wiring (ticket 013).
- Backend route registration (ticket 010).
- Visual styling beyond functional className hooks — the existing CSS surface is shared (no styled-components or CSS-in-JS in this package).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio/web && npm run build` (the web `test` script is `tsc --noEmit` per `web/package.json`) — the API client and LintBadge typecheck against the existing types.
2. `grep -nE '^export async function (preview|save|list|get)Prompt' tools/manual-story-studio/web/src/api/prompts.ts` returns exactly 4 matches.
3. `grep -nE 'role="alert"|role="status"' tools/manual-story-studio/web/src/components/LintBadge.tsx` returns both matches (clean state + violation state).
4. `grep -nE 'PromptLintTier|PromptLintFinding|PromptLintResult' tools/manual-story-studio/web/src/types/manual-story.ts` returns matches (frontend types mirror backend).

### Invariants

1. The API client returns wire-shape results without transformation; pages consume the result directly.
2. LintBadge is presentation-only — no fetch, no state management.
3. Frontend prompt types mirror backend prompt types per the existing comment policy.

## Test Plan

### New/Modified Tests

1. None — frontend typecheck is the existing validation surface per `web/package.json`'s `test` script (`tsc -p tsconfig.json --noEmit`). The capstone (ticket 014) covers integration.

### Commands

1. `cd tools/manual-story-studio/web && npm run build` — typecheck.
2. `cd tools/manual-story-studio && npm test` — full pipeline including frontend typecheck.
