# SPEC-124 — Manual Story Studio: Source Browser Creation Narrowing (Cast + Fact primary)

**Status:** PROPOSED
**Date:** 2026-06-03
**Classification:** tooling-adjacent (`tools/manual-story-studio`; source-to-story creation surface; no LLM/MCP/patch-engine; world canon read-only). The change touches how world source seeds story-local records, so the §5 alignment table records the read-only and prose/state boundaries.
**Depends on:** — (independent surface; no file overlap with SPEC-122 or SPEC-123).
**Blocks:** —
**Related:** `tools/manual-story-studio/web/src/pages/SourceBrowser.tsx`, the source-derived record-creation client path, and any backend that attaches `source_world_character` (cast) or a `notes` backlink (fact).
**Source:** critical triage of `reports/manual-story-studio-fifth-iteration.md` §§1.2 / 9 / 34 (ChatGPT-Pro, 2026-06-03). See `docs/triage/2026-06-03-manual-story-studio-fifth-iteration-triage.md` item R7. **Lifts a prior deferral** (iter-4 D3, lift-condition "when source-distillation friction is observed"): the user confirmed via `AskUserQuestion` on 2026-06-03 that they hit this friction in real use.

---

## 1. Context & Motivation

The Source Browser lets the author pull world material into mutable story-local records. It currently offers **five** source-derived creation classes (verified `SourceBrowser.tsx:17-23`):

```ts
const SOURCE_RECORD_CLASSES = ["facts", "beliefs", "locations", "objects", "cast"] as const;
```

The problem (report §9/§34, confirmed by user experience): only two of these have an obvious, defensible source→story correlation —

- **world character → story-local cast** (carries `source_world_character`), and
- **world canon fact / selected source text → story-local fact** (carries a `notes` backlink to the source).

The other three invite the wrong gesture:

- **Belief** is a story-local *mental state held by a story character*. Creating a belief "from source" implies the world source asserts what a character believes — a semantic interpretation the deterministic tool should not be making. Beliefs should be authored manually (optionally with a copied source quote in `notes`).
- **Location / Object** *can* be story-local, but "direct source-to-location/object creation" lacks the clean correlation that canon-fact→story-fact and world-character→story-cast have. They belong in a generic "create a manual record using this selected text as a note" path, not as default source-derived classes.

The first impression the five-class dropdown gives — "the app distills world source into multiple story-local classes" — is exactly the semantic-interpretation posture Manual Studio avoids elsewhere.

## 2. Scope

### In scope

1. **Narrow the primary source-derived creation set to Cast + Fact.** Replace the 5-class `SOURCE_RECORD_CLASSES` dropdown with two primary, clearly-labeled actions:
   - **"Create story cast from world character"** (when a character source item is selected) → seeds a cast record carrying `source_world_character`.
   - **"Create story fact from selected text"** (when canon-fact / source text is selected) → seeds a fact record carrying a `notes` backlink to the source. (`source_paths` does not exist on the fact schema — verified — and is not added; see §4.)
2. **Remove Belief from the source-derived flow entirely.** No "create belief from source" path. (Beliefs remain fully creatable via the normal manual record-creation flow elsewhere.)
3. **Move Location / Object to an advanced path.** Provide a single generic **"Create manual record using selected text as note"** action that lets the author pick any class (including location/object) and drops the selected text into `notes` — never into `summary`/`details` (consistent with SPEC-122's prose/state discipline). This replaces location/object as default source-derived classes.
4. **Keep literal-copy helpers** (report §9): "Copy selected source text", "Copy source citation/path". These already-deterministic, no-distillation helpers stay (or are added if missing).
5. **Provenance stays lightweight and deterministic:** cast may store `source_world_character` (existing field on `ManualCharacterRecord`); fact stores a `notes` backlink (no `source_paths` field exists or is added); everything else is author-authored with at most a copied note. No automatic distillation, no provenance bureaucracy.

### Out of scope

- **Source-browser scale work** (grouping by kind/folder, result snippets, lazy backend re-read) — triage D-scale; premature for the current single small world (frontend already lazy-loads detail on selection).
- **The full "World Source → Story Seeds" tabbed redesign** (report §34 Characters / Canon-facts / Search-all tabs) — the narrowing above achieves the correctness goal; the tabbed IA is cockpit-era polish (defer with D-cockpit). This spec changes *which creation paths exist*, not the page's overall layout.
- **The §34 advanced action "Link source path to existing record"** — a distinct *linking* path, not a creation path; deferred alongside the tabbed redesign as advanced/cockpit-era. This spec narrows *creation* paths only.
- Any change to the read-only world-source read layer's coverage (it correctly reads world root + `_source` + characters + diegetic artifacts read-only via direct reads, no MCP).
- Schema changes — **none**. `source_world_character` already exists on the cast record (`ManualCharacterRecord`, `tools/manual-story-studio/src/schema/manual-story.ts:290`); fact provenance uses the existing `RecordCommonFields.notes` field. `source_paths` exists nowhere in the package (verified at reassessment) and is **not** added — adding it would require AC#6 justification.

## 3. Key decisions

- **Two primary actions keyed to selection type**, not a class dropdown. The dropdown invited "pick any of five classes"; the action model invites "do the obviously-correct thing for what you selected" (character → cast, text → fact).
- **Belief is removed, not demoted.** There is no defensible source→belief correlation; demoting it to "advanced" would still imply one. It stays a normal manual record.
- **Location/Object via the generic note path.** They are legitimately story-local but not source-*derived* in the strong sense; the generic "selected text as note" path serves them without asserting distillation. (Report §9/§34 also name Artifact/Entity for this path, but the live `SOURCE_RECORD_CLASSES` exposes only `locations`/`objects` as source-derived classes — artifact/entity were never source-derived — so the narrowing scopes to Location/Object only.)
- **Selected text goes to `notes`, never `summary`/`details`.** Same rule as SPEC-122: copied source prose is a quote/reference, not structured record content.

## 4. Files to touch

**Modify:**
- `tools/manual-story-studio/web/src/pages/SourceBrowser.tsx` (`:17-23` and the dropdown/action region `~:290-305`) — remove `SOURCE_RECORD_CLASSES`; add the two primary actions (cast-from-character, fact-from-text) gated on selection type; add the generic "create manual record using selected text as note" advanced action; ensure copy-text / copy-path helpers are present. Route the generic-note path through a **typed note-seed helper** whose return type permits only `notes` (not `summary`/`details`/`title`), so the web typecheck (`npm --prefix web test`) structurally enforces the notes-only guarantee.
- The source-derived record-creation client call(s) — ensure cast creation attaches `source_world_character`, fact creation attaches a `notes` backlink, and the generic path drops text into `notes` only.

**Verified (no schema change needed):**
- `source_world_character` already exists on the cast record (`ManualCharacterRecord`, `manual-story.ts:290`); it was *pre-existing* per SPEC-115 (which described it as "optional/informational per the existing schema" and added no provenance fields). `source_paths` exists nowhere in `tools/manual-story-studio/`. Fact provenance therefore uses the existing `RecordCommonFields.notes` field as a backlink carrier — no new field. Do **not** add `source_paths`.

**Tests:**
- No frontend test runner exists (web `test` = `tsc -p tsconfig.json --noEmit`; zero `web/**/*.test.*` files). The notes-only guarantee for the generic-note path is therefore enforced at the **type level** via the typed note-seed helper (caught by the web typecheck), not by a runtime assertion. The existing backend tests (`test/read/world-source.test.ts`, `test/server/world-source-readonly.test.ts`) cover the read-only source layer, which this spec does not change.

## 5. FOUNDATIONS alignment

| Principle | Stance | Rationale (with surface) |
| --- | --- | --- |
| World canon read-only from the tool (FOUNDATIONS §Write discipline; report §26/§30) | aligns @ source read path | Narrowing creation paths does not change the read-only world-source reads; world canon is never mutated, only copied into mutable story-local records. |
| §Tooling Recommendation — no prose-alone distillation / least-agency | aligns @ source-to-record creation | Removing source→belief (a semantic interpretation) and routing copied text to `notes` only keeps the deterministic tool from distilling world source into interpreted story state. Cast/fact carry deterministic provenance links, not inferred content. |
| Prose/state boundary (SPEC-122 sibling) | aligns @ generic-note path | Selected source text lands in `notes`, never `summary`/`details` — same discipline as the post-segment seeding fix. |
| §Canonical Storage Layer / Hook 3 | N/A @ write boundary | Manual Studio writes only under `manual-stories/`; world `_source/` is read-only and never written. Listed defensively only. |

## 6. Acceptance criteria

1. The Source Browser no longer exposes belief, location, or object as source-derived creation classes; `grep -n "SOURCE_RECORD_CLASSES" tools/manual-story-studio/web/src` returns no five-class array (the construct is removed or reduced to the two primary actions).
2. Two primary actions exist and are keyed to selection type: "Create story cast from world character" (attaches `source_world_character`) and "Create story fact from selected text" (attaches a `notes` backlink).
3. A generic "Create manual record using selected text as note" advanced action exists; the selected text it carries lands in `notes` only (never `summary`/`details`/`title`). Because no frontend test runner exists (web `test` is `tsc --noEmit`), this is enforced at the **type level**: the generic-note path routes through a typed note-seed helper whose return type permits only `notes`, so a violation fails `npm --prefix web test` (the typecheck).
4. Copy-selected-text and copy-source-path helpers are present.
5. No belief can be created from the source-derived path; beliefs remain creatable via the normal manual record-creation flow (regression: the manual belief path is untouched).
6. No new schema field is added. (`source_paths` was verified absent at reassessment and is intentionally **not** added — fact provenance uses the existing `notes` field.)
7. `cd tools/manual-story-studio && npm --prefix web test` and `npm run test:backend` pass; full `npm test` green.

## 7. Test plan

- Web typecheck: `cd tools/manual-story-studio && npm --prefix web test`
- Backend (if creation routing touches backend): `cd tools/manual-story-studio && npm run test:backend`
- Full: `cd tools/manual-story-studio && npm test`
- Manual smoke: select a world character → "Create story cast from world character" yields a cast record with `source_world_character`; select source text → "Create story fact" yields a fact with a `notes` backlink to the source; confirm no belief/location/object source-derived option remains; generic-note action drops text into `notes`.

## 8. Risks & Assumptions

- **Field-existence (verified at reassessment).** `source_world_character` pre-exists on the cast record (`ManualCharacterRecord`, `manual-story.ts:290`) — SPEC-115 treated it as existing and added no provenance fields; `source_paths` exists nowhere. Fact provenance uses the existing `notes` field. No schema field is added (AC#6 satisfied: the only candidate, `source_paths`, was proven absent and is deliberately not added).
- **Assumption: the read-only world-source read layer is unchanged.** This spec changes creation paths, not source enumeration/reading.
- **Assumption: beliefs have a complete manual-creation path** in the normal records UI (they do — belief is a standard record class). Removing the source-derived belief path must not be the only way to create a belief; confirm the manual path exists before removing.
- **Scope discipline.** The tabbed "World Source → Story Seeds" IA and the scale fixes are explicitly deferred; do not fold them in. This spec's correctness goal is achieved by narrowing creation paths alone.
