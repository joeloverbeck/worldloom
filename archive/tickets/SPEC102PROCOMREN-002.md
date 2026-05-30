# SPEC102PROCOMREN-002: Backend prompt module foundation (types + translator interface)

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — introduces the `tools/manual-story-studio/src/prompt/` module subtree (types + translator interface barrel). No impact on existing code paths.
**Deps**: None

## Problem

The compose pipeline (007), 18 per-class translators (003 / 004 / 005), 15 section emitters (006), the lint module (008), the write layer (009), and the HTTP routes (010) all consume a shared type surface: the compose-input shape, the translator function signature, the section-emitter contract, the lint-finding tier enum (`hard` / `soft`), and the sidecar shape. Authoring those types up front lets the downstream tickets land independently against a stable boundary and prevents circular imports.

## Assumption Reassessment (2026-05-30)

1. Verified `tools/manual-story-studio/src/prompt/` does not exist (`ls tools/manual-story-studio/src/` shows `cli.ts`, `read/`, `schema/`, `server/`, `validate/`, `write/` only). The existing schema source-of-truth lives at `tools/manual-story-studio/src/schema/manual-story.ts` (518 lines; exports `ManualRecordClass`, `ManualRecordOfClass<C>`, `MANUAL_RECORD_CLASSES`, `MANUAL_RECORD_CLASS_PREFIXES`, and the Manual Character Profile types verified at lines 209-276) — translators consume that schema.
2. SPEC-102 §Scope item 2 enumerates the 12 stage signatures of the compose pipeline; §Scope item 4 enumerates the lint-rule tiers (`hard` structural input-presence; `soft` conservative denylist with author override); §Scope item 2 stage 12 enumerates the sidecar shape (`id, created_at, manual_story_slug, included_cast, included_records, included_template, moment_directive, prompt_sha256`). The type surface here is the shape compose / sections / lint / write exchange across module boundaries.
3. Cross-artifact shared boundary: this module is the shared contract for tickets 003-014. The translator-function interface (`(record: ManualRecordOfClass<C>) => string` returning a prose fragment) is the smallest stable boundary; the section-emitter contract (`(input: SectionEmitterInput) => string` returning a Markdown section body without heading) is the next; the lint-finding shape (with closed `tier: "hard" | "soft"` enum) is the third.

## Architecture Check

1. Authoring types first keeps the downstream tickets free of circular dependencies: section emitters can import the translator interface without depending on a concrete translator file; compose can import section emitters without depending on lint; lint can import the finding shape without depending on compose.
2. No backwards-compatibility aliasing — `src/prompt/` is greenfield; no aliasing or shim layer introduced.

## Verification Layers

1. Module presence — codebase grep-proof (`test -f tools/manual-story-studio/src/prompt/types.ts && test -f tools/manual-story-studio/src/prompt/translators/index.ts`).
2. Type compile-check — schema validation (`cd tools/manual-story-studio && npm run build:backend` succeeds with the new types exported but consumed nowhere yet).
3. Single-layer ticket — additional layers not applicable; this foundation has no runtime behavior. Verification is type-shape inspection plus successful compile.

## What to Change

### 1. Create `tools/manual-story-studio/src/prompt/types.ts`

Export the shared types consumed across the prompt module:

```ts
import type {
  ManualRecord,
  ManualRecordClass,
  ManualStoryMetadata,
  ManualCharacterRecord,
} from "../schema/manual-story.js";

export interface PromptComposeInput {
  manualStoryRoot: string;
  moment_directive: string;
  included_cast: string[];
  included_records: string[];
  included_template_path?: string;
}

export interface SectionEmitterInput {
  metadata: ManualStoryMetadata;
  cast: ManualCharacterRecord[];
  records: ManualRecord[];
  moment_directive: string;
  included_template_body: string | null;
  recent_segment_last_paragraph: string | null;
  content_policy_body: string;
  prose_craft_contract_body: string;
}

export type PromptLintTier = "hard" | "soft";

export interface PromptLintFinding {
  rule: string;
  tier: PromptLintTier;
  message: string;
  section?: string;
  snippet?: string;
}

export interface PromptLintResult {
  findings: PromptLintFinding[];
  cleanForCopy: boolean;
  blockingForCopy: boolean;
}

export interface PromptRunSidecar {
  id: string;
  created_at: string;
  manual_story_slug: string;
  included_cast: string[];
  included_records: string[];
  included_template_path: string | null;
  moment_directive: string;
  prompt_sha256: string;
  lint_override?: {
    findings: PromptLintFinding[];
    copied_anyway_at: string;
  };
}

export interface PromptComposeResult {
  markdown: string;
  lint: PromptLintResult;
  sidecar_draft: Omit<PromptRunSidecar, "id" | "created_at" | "prompt_sha256">;
}
```

### 2. Create `tools/manual-story-studio/src/prompt/translators/index.ts`

Declare the translator function shape and the registry placeholder; the concrete translator entries land in tickets 003 / 004 / 005:

```ts
import type {
  ManualRecord,
  ManualRecordClass,
  ManualRecordOfClass,
} from "../../schema/manual-story.js";

export type RecordTranslator<C extends ManualRecordClass> = (
  record: ManualRecordOfClass<C>,
) => string;

export type AnyRecordTranslator = (record: ManualRecord) => string;

// Populated incrementally by tickets 003 / 004 / 005. Each entry is a pure
// function: ManualRecordOfClass<C> -> Markdown prose fragment.
export const translatorRegistry: Partial<Record<ManualRecordClass, AnyRecordTranslator>> = {};
```

## Files to Touch

- `tools/manual-story-studio/src/prompt/types.ts` (new)
- `tools/manual-story-studio/src/prompt/translators/index.ts` (new)

## Out of Scope

- Implementing any concrete translator (tickets 003 / 004 / 005).
- Implementing any concrete section emitter (ticket 006).
- Implementing compose orchestration (ticket 007).
- Implementing lint rules (ticket 008).
- Wiring routes or write layer (tickets 009 / 010).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm run build:backend` succeeds — the new types compile against the existing schema source.
2. `grep -n 'export interface PromptComposeInput' tools/manual-story-studio/src/prompt/types.ts` returns a match.
3. `grep -n 'export interface SectionEmitterInput' tools/manual-story-studio/src/prompt/types.ts` returns a match.
4. `grep -n 'export type PromptLintTier' tools/manual-story-studio/src/prompt/types.ts` returns a match — closed-enum tier surface confirmed.
5. `grep -n 'export type RecordTranslator' tools/manual-story-studio/src/prompt/translators/index.ts` returns a match.

### Invariants

1. Translator interface is `(record: ManualRecordOfClass<C>) => string` — pure function; no I/O, no LLM, no inferencing beyond the record's own fields per SPEC-102 §3 Key Decisions.
2. `PromptLintFinding.tier` is a closed enum (`"hard" | "soft"`) per SPEC-102 §Scope item 4.
3. `SectionEmitterInput` carries `content_policy_body` and `prose_craft_contract_body` as already-loaded strings — the load happens in compose (ticket 007), not inside the section emitter (per SPEC-102 §Scope item 2 stages 6, 7).

## Test Plan

### New/Modified Tests

1. None — type-surface scaffolding; the consumer tickets exercise the types at runtime.

### Commands

1. `cd tools/manual-story-studio && npm run build:backend` — verifies type compile against the existing schema.
2. `cd tools/manual-story-studio && npm test` — full pipeline including type-check across the rest of the package.
