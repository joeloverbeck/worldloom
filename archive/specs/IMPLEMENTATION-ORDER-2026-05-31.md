# Implementation Order — Manual Story Studio (First Iteration)

This iteration lands the Manual Story Studio writing cockpit at `tools/manual-story-studio/` (sibling to `tools/story-explorer/`) with author content under `worlds/<slug>/manual-stories/<slug>/`. The tool is deterministic, runs no LLM internally, makes no Claude Code skill invocations, makes no patch-engine or MCP calls, and writes nothing to world canon or normal story bundles. Its job: maintain manual records, compose deterministic external Markdown prompts (for use with a third-party LLM the author copies prose back from), accept and store pasted prose as durable manuscript segments, and prompt the author to update records manually after each segment.

**Source:** critical triage of `reports/manual-story-studio-first-iteration.md` (ChatGPT-Pro, 2026-05-30). The proposal's core architecture (sibling package; `worlds/<slug>/manual-stories/<slug>/` content surface; lowercase `m`-prefix IDs avoiding world-index uppercase pattern collision; no patch-engine / no MCP / no branching-story validators; reuse `docs/prose-renderer-contract/content-policy.md` verbatim; create Manual Studio variants of prose-craft-contract and render-time-instruction; Story Explorer kept read-only with UI tokens shared by copy not by import) was accepted with five modification clusters (`enumerate.ts` integration; closed-enum vocabulary gaps for `language_register` / `move_family` / `tone_fit` / `relationship_axes`; "sequences" interpretation user-confirmation gate; M6 deferral; explicit `prompt_sha256` informational-only disclosure).

---

## Triage summary

### Accepted (no modification)

- §1 Executive summary — package + content boundary.
- §2 Reuse vs not — reuse vocabulary / STCHAR profile sections / content-policy verbatim; do NOT reuse patch engine, MCP, branching validators wholesale.
- §3 Package boundary — Fastify + yaml stack mirroring Story Explorer; no patch-engine / world-mcp dependency; write-scope guard.
- §7 Manual Character Profile — borrow STCHAR's Stable Persona Core / World Pressure Core / Voice / Pressure Behavior / Perception / Agency / Relationship Behavior / Prose Constraints sections.
- §9 Storylet filtering staging — deterministic, traceable, no auto-selection.
- §10 Prompt composer pipeline — 12-stage deterministic composition.
- §11 External Markdown prompt format — 15-section structure.
- §12 Paste/save/append flow — manual save, no inferred state.
- §13 Manuscript and segment storage — durable segments + compiled manuscript.
- §14 Validation model — lightweight, no engine-grade validators.
- §17 Story Explorer relationship — kept read-only; component-level reuse by copy.
- §18 Renderer contract audit — reuse content-policy verbatim, create Manual Studio variants for prose-craft and render-time.

### Accepted with modification

- §4 Filesystem layout → **SPEC-100** adds `manual-stories` to `tools/world-index/src/enumerate.ts:112` `isExcludedPath()` to suppress `unexpected_path` warn-row noise on every `world-index build/sync`.
- §5 Metadata schema → **SPEC-101** defines closed enums for `language_register`, `prose_preferences.psychic_distance` / `dialogue_density` / `interiority` / `paragraphing` that the proposal sketched without defining.
- §6 Record classes → **SPEC-101** ships the proposal's "sequences" → "consequences" interpretation as `mcnsq-*` records; **user confirmed the consequences interpretation 2026-05-30**.
- §8 Beat template model → **SPEC-104** defines closed enums for `classification.move_family` (17 values), `classification.tone_fit` (11 values), and `requires.relationship_axes_any` (6 values aligned with SPEC-101 `mrel-*.axes`).
- §16 Safety rails → **SPEC-100** documents verified Hook 3 (`tools/hooks/src/hook3-guard-direct-edit.ts:39-40`) and Hook 2 (`tools/hooks/src/hook2-guard-large-read.ts:50-51`) path-pattern coverage; `manual-stories/` is naturally outside both. In-tool realpath sandbox is the primary write guard.
- §20 Staged implementation → 5 specs (SPEC-100 → SPEC-104) ship M1-M5; M6 polish (read-only canon/character lookup helpers, search/filter UX, keyboard shortcuts, optional rebuildable indexes) is deferred to post-SPEC-104 tickets as observed need surfaces — not specced now.

### Rejected

None. ChatGPT-Pro's proposal contains no items rejected outright.

### Deferred (M6 polish; not specced this iteration)

- §19 Open question "How much world canon to import" — MVP reads world canon read-only and lets the author manually copy summaries; auto-import is M6 deferral.
- §19 Open question "Optional indexes" — no DB in MVP; rebuildable JSON indexes (`indexes/records.json`, `indexes/manuscript.json`) are M6 deferral.
- Per-manual-story full-text search — M6 deferral.
- Cross-manual-story shared cast / shared beat-template library — M6 deferral.
- Per-segment edit history / diff view — M6 deferral.
- Export-to-other-format (PDF, EPUB) — M6 deferral.
- Persistent state-update checklist log — M6 deferral.

### Out-of-report findings surfaced during triage

- **O1 (integration gap, routed into SPEC-100):** `tools/world-index/src/enumerate.ts:77-110` recursively walks the world directory tree; every Manual Studio file under `worlds/<slug>/manual-stories/` would produce a warn-severity `unexpected_path` validation_result row (`tools/world-index/src/commands/shared.ts:551-571`) on each build/sync without explicit exclusion.
- **O2 (verified posture, documented in SPEC-100):** Hook 3 and Hook 2 path patterns only match `_source/` subtrees; `manual-stories/` is naturally outside. Manual Studio's in-tool realpath sandbox is defense-in-depth.
- **O3 (verified posture, documented in SPEC-100):** World-index story-directory patterns are uppercase (`^STENT-[0-9]+$`, `^SLT-[0-9]+$`, etc., at `tools/world-index/src/parse/story-directories.ts`); proposal's lowercase `m`-prefix IDs are pattern-safe by case discipline.
- **O4 (numbering, applied to all 5 specs):** `specs/` was empty at iteration start; archived specs reach SPEC-99; new specs land as SPEC-100 through SPEC-104.
- **O5 (design concern surfaced in SPEC-103):** Per saved feedback [[feedback_author_rejects_hash_coupling]], hash coupling on editable artifacts is rejected. SPEC-103 ships `prompt_sha256` in the segment sidecar as **informational only** — no flow gates on it, no post-save resync, no diff banner. If a future need surfaces, surface as a UI-only read-time hint, never a stored gate.

---

## Dependency sequence

```
SPEC-100  — Package boundary, write sandbox, enumerate.ts integration, docs scaffold, world picker UI shell
   │
   ▼
SPEC-101  — Manual story metadata, 18 record classes, Manual Character Profile, ref validation, hybrid delete, CRUD, dashboard
   │
   ▼
SPEC-102  — Deterministic prompt composer, content-policy verbatim, 15-section Markdown, prompt lint, Manual Studio prose-craft and render-time docs, Prompt Preview UI
   │
   ▼
SPEC-103  — Paste Prose editor, segment storage, deterministic manuscript compiler, State Update Checklist, Manuscript view, Prompt History
   │
   ▼
SPEC-104  — Beat templates, 9-stage deterministic filter, candidate cards UI, prompt composer §6 wiring
   │
   ▼
[M6 polish — post-SPEC-104 tickets as needed; no spec at this time]
```

**Strict ordering 100 → 101 → 102 → 103 → 104** is load-bearing:

- SPEC-100 establishes the package, sandbox, and world-index exclusion before anything reads or writes the content surface.
- SPEC-101 fills the data model before the prompt composer needs records to read.
- SPEC-102 composes prompts before the paste flow needs prompts to reference.
- SPEC-103 closed the round trip (paste → segment → manuscript) before beat templates layer on as an optional accelerator.
- SPEC-104 wires templates into the already-working composer + segment flow.

The author can use Manual Studio productively after SPEC-103 (without templates); SPEC-104 is the accelerator. M6 is pure polish on a working tool.

## Progress

- **2026-05-30** — SPEC-100 implemented and archived. Nine tickets SPEC100MANSTOSTU-001 through SPEC100MANSTOSTU-009 landed sequentially (package skeleton; `wrapRouterWritable` registration-time fence; realpath sandbox + denylist; `enumerate.ts` `manual-stories/` exclusion; world / manual-story read backends; Fastify server + CLI + `GET /api/worlds` + banner; manual-stories `GET` / `POST` routes; Vite + React frontend shell; capstone test covering AC 1-9). Backend suite (48 tests) and world-index suite (138 + CLI tests) green. SPEC-100 source archived at `archive/specs/SPEC-100-manual-story-studio-package-boundary.md`.
- **2026-05-30** — SPEC-101 implemented and archived. Twelve tickets SPEC101MANSTOMET-001 through SPEC101MANSTOMET-012 landed sequentially (schema types foundation; declarative schema validator; shallow ref-integrity validator with explicit `source_world_character` skip; per-class append-only ID allocator with gap preservation; read layer with `listAllKnownIds` + `scanReferences`; write layer composing sandbox + schema + refs + allocator, hybrid delete with `hard_deleted` / `inactive_default` / `force_deleted` outcomes and response-body audit entry; records + metadata CRUD routes under `wrapRouterWritable`; typed frontend API client; class-aware RecordForm + RecordCard + RefList components; Records three-pane screen + CastAndProfiles + Dashboard cockpit; README sections on record classes + hybrid delete + ref scope + ID allocation; capstone test covering AC #1-5 + #9 with manual dry-run runbook for AC #6-8). Backend suite (135 tests, including the SPEC-100 capstone) and web typecheck green. SPEC-101 source archived at `archive/specs/SPEC-101-manual-story-metadata-and-records.md`.
- **2026-05-30** — SPEC-102 implemented and archived. Fourteen tickets SPEC102PROCOMREN-001 through SPEC102PROCOMREN-014 landed sequentially (Manual Studio prose-craft contract doc; prompt module foundation with typed translator interface accepting a TranslatorContext; three bundles of six per-class translators covering all 18 Manual Studio record classes; 15 section emitters + `assembleSections` barrel with classifyManualRecordId helper; 12-stage deterministic compose pipeline; 8-rule lint module across closed hard/soft tiers; `PROMPT-<n>` ID allocator + write layer + SHA256 sidecar; four prompt HTTP routes wrapped in `wrapRouterWritable`; frontend API client + LintBadge component; MomentComposer + PromptPreview pages with App.tsx routes; capstone test covering AC #1-3, #5-9 with manual runbook for AC #4 and #9). Backend suite (236 tests, including the SPEC-100 and SPEC-101 capstones) and web typecheck green. Three test classes (compose, prompts-routes, capstone) seed fixtures by COPYING (never symlinking) the docs tree to avoid `rmSync(symlinkToDocs, recursive: true)` wiping the real `docs/prose-renderer-contract/content-policy.md`. SPEC-102 source archived at `archive/specs/SPEC-102-prompt-composer-and-renderer-contract.md`.
- **2026-05-31** — SPEC-103 implemented and archived. Sixteen tickets SPEC103PROPASSEG-001 through SPEC103PROPASSEG-016 landed sequentially (segment sidecar + manuscript policy schema; `SEG-<integer>` allocation and ID documentation; save/edit/delete segment write flow; deterministic manuscript compiler; segment/manuscript read helpers; segment/manuscript/prompts linked-segment routes; State Update Checklist payload and modal UI; Paste Prose, Manuscript, and Prompt History pages; Dashboard latest-segment and manuscript-word-count wiring; capstone test covering AC #1-12 plus the Plan-Authority no-record-mutation invariant). Backend suite (275 compiled Node tests, including SPEC-100/101/102/103 capstones) and web typecheck green. SPEC-103 source archived at `archive/specs/SPEC-103-prose-paste-segments-and-manuscript.md`.
- **2026-05-31** — SPEC-104 implemented and archived. Fourteen tickets SPEC104BEATEMDET-001 through SPEC104BEATEMDET-014 landed sequentially (`beat-templates` class registered in `MANUAL_RECORD_CLASSES` plus `prompt_policy.recent_template_advisory_window`; dedicated `BeatTemplate` schema + `validateBeatTemplate` declarative validator with closed enums for `move_family` / `tone_fit` / `relationship_axes` / `beat_guidance.function`; `computeRecentUseMap` pure function over the trailing N segment sidecars; `assembleWhySuggested` priority-capped 4-line trace; 9-stage deterministic `filterBeatTemplates` pipeline composing recent-use + why-suggested; dedicated `/beat-templates` CRUD routes + `/moment-composer/template-candidates` route with `routes/records.ts` skip; prompts routes accept `selected_template` ID with mutual-exclusion + 404 handling; composer stage 5 parses template YAML, renders `beat_guidance` into §6 as Markdown, threads `forbidden_inventions` into §12; `lintBeatTemplateGuidance` soft-tier CRUD-time lint; web types mirror + typed `api/beat-templates.ts` client; BeatTemplates CRUD UI page + BeatTemplateForm + App.tsx route; BeatTemplateCandidates component + MomentComposer integration + PromptHistory `selected_template` display; docs/ID-ALLOCATION.md `mtemplate` annotation flipped to "landed"; capstone E2E covering AC #7 / #10 / #11 + determinism + sandbox). One engine capability gap surfaced and fixed during capstone authoring: `write/segments.ts` was storing the full template path in the segment sidecar's `selected_template` field; per SPEC-104 §2.6 it now derives the `mtemplate-<integer>` id via `deriveTemplateIdFromPath`. Backend suite (342 compiled Node tests, including SPEC-100/101/102/103/104 capstones) and web typecheck green. SPEC-104 source archived at `archive/specs/SPEC-104-beat-templates-and-deterministic-filtering.md`. **All five M1-M5 specs landed.**

## Phase table

| Order | Spec | Scope | Depends on | Proposal milestone | Status |
|---|---|---|---|---|---|
| 1 | **SPEC-100** | Package boundary at `tools/manual-story-studio/`, write-scope guard, realpath sandbox, `enumerate.ts` exclusion of `manual-stories/`, Hook 3 / Hook 2 / lowercase-ID posture documentation, `docs/manual-story-studio/` scaffold, world picker + manual-story list/create UI shell | — | M1 | DONE (2026-05-30, archived to `archive/specs/`; SPEC100MANSTOSTU-001..009 landed) |
| 2 | **SPEC-101** | `manual-story.yaml` schema with closed enums; 18 manual record classes (17 MVP + beat-templates deferred to SPEC-104); Manual Character Profile schema; shallow ref validation; hybrid delete policy; record CRUD backend + frontend; Cast & Profiles editor; Dashboard cockpit | SPEC-100 | M2 | DONE (2026-05-30, archived to `archive/specs/`; SPEC101MANSTOMET-001..012 landed) |
| 3 | **SPEC-102** | Moment Composer screen; 12-stage deterministic prompt composition pipeline; content-policy verbatim reuse; 15-section Markdown prompt format; prompt lint (engine-jargon denylist + ID-leak sweep + verbatim-section check); `docs/manual-story-studio/prose-craft-contract.md` (sibling-only; the render-time-instruction was inlined into the §5/§14/§15 fixed strings rather than ported); Prompt Preview UI | SPEC-101 | M3 | DONE (2026-05-30, archived to `archive/specs/`; SPEC102PROCOMREN-001..014 landed) |
| 4 | **SPEC-103** | Paste Prose editor; segment write flow (`segments/SEG-<n>.md` + sidecar with `prompt_sha256` informational-only); deterministic `manuscript.md` compiler + Rebuild command; State Update Checklist UI (never asserts state changed); Manuscript view; Prompt History view | SPEC-102 | M4 | DONE (2026-05-31, archived to `archive/specs/`; SPEC103PROPASSEG-001..016 landed) |
| 5 | **SPEC-104** | Beat template schema with closed enums for `move_family` / `tone_fit` / `relationship_axes`; 9-stage deterministic filter; `why_suggested` trace; recent-use advisory; CRUD UI; Candidate Cards UI; prompt composer §6 wiring; lint extension | SPEC-103 | M5 | DONE (2026-05-31, archived to `archive/specs/`; SPEC104BEATEMDET-001..014 landed) |

## Resolved questions

**§6 "sequences" interpretation — RESOLVED 2026-05-30.** User confirmed "sequences" maps to **consequences** (CNSQ-shaped). SPEC-101 ships `consequences/mcnsq-*.yaml` records with `caused_by_segment` + `pending` + `urgency` fields as the proposal's §6 sketched.

## Notes

- **No standalone `docs/triage/...triage.md` file.** Triage decisions are documented inline in this IMPLEMENTATION-ORDER.md per archive precedent (e.g., `archive/specs/IMPLEMENTATION-ORDER-2026-05-30.md` embeds source + rejected items + rationale in its Source paragraph). If you'd prefer a standalone triage file, add it later as a post-write follow-up; the content here would migrate cleanly.
- **No worldloom canon mutation in any of the 5 specs.** Manual Studio is canon-adjacent but never canon-mutating; the patch engine and MCP retrieval remain the sole canon write/read pipeline.
- **Story Explorer remains untouched.** SPEC-100 explicitly forbids weakening Story Explorer's read-only guard; UI tokens / disclosure components / route-error UI may be copied (not imported) into Manual Studio's `web/`.
- **No new hooks.** Manual Studio's content surface is naturally outside Hook 3 and Hook 2 path patterns; the in-tool sandbox is the primary write guard.
- **The proposal's Final blunt recommendation** ("Build Manual Story Studio as a separate, boring, filesystem-backed writing cockpit. The 'boring' part is the point.") is the spirit honored by these specs: minimal new infrastructure, maximum reuse of established patterns, deliberate separation from engine machinery.
