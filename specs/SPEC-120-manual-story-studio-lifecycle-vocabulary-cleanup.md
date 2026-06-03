# SPEC-120 — Manual Story Studio: Lifecycle Vocabulary Cleanup (archived → inactive)

**Status:** DRAFT
**Date:** 2026-06-02
**Classification:** tooling-adjacent (`tools/manual-story-studio`; user-facing label/vocabulary change + optional internal-param rename; no LLM/MCP/patch-engine; no behavior change to the delete lifecycle).
**Depends on:** archive/specs/SPEC-114-manual-story-studio-mutable-record-delete-lifecycle.md (this completes the *vocabulary* half of the mutable-current-truth lifecycle whose *logic* SPEC-114 fixed).
**Blocks:** —
**Related:** `tools/manual-story-studio/web/src/components/RecordCard.tsx`, `tools/manual-story-studio/web/src/pages/Records.tsx`, `tools/manual-story-studio/web/src/pages/BeatTemplates.tsx`, `tools/manual-story-studio/web/src/api/records.ts`, `tools/manual-story-studio/src/read/records.ts`, `tools/manual-story-studio/src/health/compute.ts`.
**Source:** critical triage of `reports/manual-story-studio-fourth-iteration.md` §§5 / 11 / 35 + Stage 1 (ChatGPT-Pro, 2026-06-02). SPEC-114 fixed the delete *logic* (block-on-referrer, repair-forced delete) but left append-only "archived" vocabulary in the UI; this is the product-coherence cleanup the report flags as the remaining lifecycle smell.

---

## Implementation Notes

- 2026-06-03 — `archive/tickets/SPEC120MANSTOSTU-001.md` replaced the four user-facing web UI "archived" labels with "inactive" and added the inactive/deleted model note near both include-inactive toggles. Remaining `includeArchived` and `retired_reason` prose below is historical intake context until `archive/tickets/SPEC120MANSTOSTU-002.md` / `SPEC120MANSTOSTU-003` land.
- 2026-06-03 — `archive/tickets/SPEC120MANSTOSTU-002.md` renamed `includeArchived` to `includeInactive` across the Manual Studio records and beat-template API clients, Fastify routes, read layer, health/prompt callers, React callers, and the HTTP wire query string. Remaining `includeArchived` prose below is historical intake context; `retired_reason` remains active for `SPEC120MANSTOSTU-003`.

---

## 1. Context & Motivation

Manual Studio's records are **mutable current truth**, not an append-only ledger (report §6/§8/§11). The delete lifecycle is now correct (SPEC-114), but "archived" lifecycle vocabulary still leaks into the UI, implying a retirement/archive model the tool deliberately rejects. Verified user-facing occurrences:

- `RecordCard.tsx:88` — displays `"(archived)"` when `!summary.active`.
- `Records.tsx:258` — checkbox label "include archived".
- `BeatTemplates.tsx:189` — checkbox label "Include archived".
- `BeatTemplates.tsx:266` — per-template list badge displaying `"(archived)"` when `!tpl.active` (a fourth user-facing site; not in the original triage's three-site survey).

Internal carriers (the `includeArchived` request param — spanning **two** parallel API surfaces, `web/src/api/records.ts:72,76` and `web/src/api/beat-templates.ts:57,60`, plus their Fastify routes, the read layer, health/prompt callers, and the URL query-param **string**; and the `retired_reason` field declared at `web/src/types/manual-story.ts:185`, `src/schema/manual-story.ts:158`, and `src/validate/schema.ts:48,57`) are not user-facing but reinforce the wrong mental model. See §4 for the full surface and §8 for the implementation risks.

The intended four-state model (report §11): **Active** (eligible for authoring/prompt selection) · **Inactive** (kept for reference, hidden from normal selection unless requested) · **Deleted** (file gone) · **Repair-forced deleted** (file gone + repair log). No supersession, no hidden archive.

## 2. Scope

### In scope

1. **Replace user-facing "archive(d)" with "inactive"** at all four user-facing sites: `RecordCard.tsx:88` → "(inactive)"; `Records.tsx:258` → "include inactive"; `BeatTemplates.tsx:189` → "Include inactive"; `BeatTemplates.tsx:266` → "(inactive)".
2. **Rename the internal `includeArchived` param/option to `includeInactive`** end-to-end — for consistency with the user-facing model. The rename surface is wider than a single file; it spans **two parallel API surfaces** and their backends:
   - **records surface:** `web/src/api/records.ts:72,76,94` → `src/server/routes/records.ts:78,97,98` → `src/read/records.ts:19,23,45,92,133`.
   - **beat-templates surface:** `web/src/api/beat-templates.ts:57,60` → `src/server/routes/beat-templates.ts:136,146,148,360`.
   - **other callers:** `src/health/compute.ts:88,163,194`, `src/prompt/compose.ts:513`, `web/src/components/CurrentStatePanel.tsx:62`, `web/src/components/RecordPicker.tsx:102`, `web/src/pages/CastAndProfiles.tsx:50`, `web/src/pages/Records.tsx` (state + call sites), `web/src/pages/BeatTemplates.tsx` (state + call sites), and the test `test/read/records.test.ts:119,129`.
   - **HTTP wire-param string:** the URL query-param literal `"includeArchived"` (`url.searchParams.set(...)` on the client ↔ `request.query.includeArchived` on the routes) is a client↔server contract. It is renamed too, but client and server **must** change in lockstep — a half-rename breaks include-inactive filtering *silently* (the server reads a param the client no longer sends → defaults to false → inactive records stay hidden with no compile error). This wire-param lockstep is the one non-mechanical part; everything else is a pure TypeScript identifier rename caught by the build. (Per Q1=(a): the full rename is committed, not split.)
3. **Remove the vestigial `retired_reason` field.** Grep verdict (reassessment 2026-06-02): `retired_reason` is *declared* as a common optional scalar (`src/validate/schema.ts:48` `COMMON_OPTIONAL_FIELDS` + `:57` `COMMON_SCALARS`), typed at `src/schema/manual-story.ts:158` and `web/src/types/manual-story.ts:185`, but **never populated by production write code** — every write leaves it undefined and tests (`capstone-spec101`, `write/records`, `delete-lifecycle`) assert it stays `undefined`. It is dead-but-declared, so **remove** (not rename). Removal surface: `web/src/types/manual-story.ts:185`, `src/schema/manual-story.ts:158`, `src/validate/schema.ts:48` (drop from `COMMON_OPTIONAL_FIELDS`) + `:57` (drop from `COMMON_SCALARS`), and the read-test fixture `test/read/records.test.ts:126` (which sets `retired_reason: "retired"`). The `records-delete-ux.test.ts:23` absence assertion already guards against reintroduction.
4. **State the model once** in a short UI affordance / tooltip near the inactive toggle: "Inactive = kept for reference, hidden from normal selection. Deleted = file gone."

### Out of scope

- Any change to delete/force-delete behavior (SPEC-114 is correct; not touched).
- Building supersession or historical state views (report §11/§35: never).
- The `active` boolean field itself (it stays; only the *word* "archived" is wrong, not the active/inactive concept).
- On-disk file renames.

## 3. Key decisions

- **"Inactive," not "archived."** Archive implies append-only history; inactive implies "kept but not currently in play," which matches the mutable-current-truth model.
- **Consistency from UI to param (full rename, not split).** Renaming `includeArchived` → `includeInactive` keeps the vocabulary coherent end-to-end. Per Q1=(a), the rename is committed across both API surfaces (records + beat-templates) and the HTTP wire-param string, with the client/server wire-param edit done in lockstep (see §4 item 2 and §8). The earlier "labels may ship alone" hedge is withdrawn now that the blast radius is enumerated and the only non-mechanical step (the wire param) is bounded.
- **`retired_reason` is removed (verdict: vestigial).** The broad grep (reassessment 2026-06-02) confirmed the field is schema/validator-declared but never written by production code, so it is removed outright rather than renamed — touching the validator + both schema types + one test fixture (see §4 item 3).

## 4. Files to touch

**Modify (item 1 — user-facing strings, 4 sites):**
- `tools/manual-story-studio/web/src/components/RecordCard.tsx` (`:88`) — "(archived)" → "(inactive)".
- `tools/manual-story-studio/web/src/pages/Records.tsx` (`:258`) — checkbox label "include archived" → "include inactive".
- `tools/manual-story-studio/web/src/pages/BeatTemplates.tsx` (`:189`) — checkbox label "Include archived" → "Include inactive".
- `tools/manual-story-studio/web/src/pages/BeatTemplates.tsx` (`:266`) — list badge "(archived)" → "(inactive)".

**Modify (item 2 — `includeArchived` → `includeInactive` rename, both API surfaces + wire param):**
- records surface: `web/src/api/records.ts` (`:72,76,94`), `src/server/routes/records.ts` (`:78,97,98`), `src/read/records.ts` (`:19,23,45,92,133`).
- beat-templates surface: `web/src/api/beat-templates.ts` (`:57,60`), `src/server/routes/beat-templates.ts` (`:136,146,148,360`).
- other callers: `src/health/compute.ts` (`:88,163,194`), `src/prompt/compose.ts` (`:513`), `web/src/components/CurrentStatePanel.tsx` (`:62`), `web/src/components/RecordPicker.tsx` (`:102`), `web/src/pages/CastAndProfiles.tsx` (`:50`), `web/src/pages/Records.tsx` (state + call sites), `web/src/pages/BeatTemplates.tsx` (state + call sites), `test/read/records.test.ts` (`:119,129`).
- HTTP wire-param string `"includeArchived"` — renamed in client+server lockstep (see §8).

**Modify (item 3 — `retired_reason` removal):**
- `web/src/types/manual-story.ts` (`:185`), `src/schema/manual-story.ts` (`:158`) — drop the field from both type declarations.
- `src/validate/schema.ts` (`:48` `COMMON_OPTIONAL_FIELDS`, `:57` `COMMON_SCALARS`) — drop both entries.
- `test/read/records.test.ts` (`:126`) — drop the `retired_reason: "retired"` fixture line.

**Add (item 4):**
- a tooltip/affordance near the inactive toggle for the one-line model statement.

**Pre-implementation broad sweep (decides item 2/3 scope):**
```
grep -rni "archive\|includeArchived\|retired_reason\|retired" \
  tools/manual-story-studio docs/ .claude/skills/
```
Distinguish user-facing strings (must change) from internal identifiers (rename for consistency) from genuinely unrelated hits.

## 5. FOUNDATIONS alignment

| Principle | Stance | Rationale (with surface) |
| --- | --- | --- |
| Mutable local truth, distinct from canon (report §8; not a FOUNDATIONS canon layer) | aligns @ UI vocabulary | Manual Studio records live *outside* the canon layers — a mutable author-maintained sidecar, not Soft Canon (which is still canon, just scope-limited). "Inactive/deleted" matches that mutable-current-truth model; "archived" implied an append-only ledger the tool explicitly is not (report §6/§11). |
| Append-only canon vs. mutable sidecar (deliberate divergence) | aligns @ vocabulary | The report's §8 foundation statement — canon is append-only/patch-engine-owned; manual records are mutable local truth — is honored by removing append-only vocabulary from the sidecar. No FOUNDATIONS change; the tool stays outside canon authority. |
| §Canonical Storage Layer / Hook 3 | N/A @ write boundary | Cosmetic UI/param change; touches no world canon or `_source/`. Listed defensively only. |

## 6. Acceptance criteria

1. No user-facing "archive"/"archived" string remains in the Manual Studio web UI: `grep -rni "archive" tools/manual-story-studio/web/src` returns only non-user-facing hits (or none). All four user-facing sites (`RecordCard.tsx:88`, `Records.tsx:258`, `BeatTemplates.tsx:189`, `BeatTemplates.tsx:266`) read "inactive". The grep result, not a hardcoded site count, is the authority.
2. Internal `includeArchived` is renamed to `includeInactive` across both API surfaces (records + beat-templates), their backends, and the HTTP wire-param string, with no behavior change — `grep -rn "includeArchived" tools/manual-story-studio --include=*.ts --include=*.tsx` returns zero hits outside `dist/`, and existing include-inactive filtering still works end-to-end (client toggle still surfaces inactive records — the wire-param regression guard).
3. `retired_reason` is removed across the full surface (web type, `src/schema/manual-story.ts`, `src/validate/schema.ts` both lists, and the read-test fixture): `grep -rn "retired_reason" tools/manual-story-studio --include=*.ts --include=*.tsx` returns zero hits outside `dist/`, with no dangling reference and `records-delete-ux.test.ts` still green.
4. A one-line model statement (Active/Inactive/Deleted) is shown near the inactive toggle.
5. `cd tools/manual-story-studio && npm --prefix web test` and `npm run test:backend` pass; full `npm test` green.

## 7. Test plan

- Web typecheck: `cd tools/manual-story-studio && npm --prefix web test`
- Backend (param rename): `cd tools/manual-story-studio && npm run test:backend`
- Full: `cd tools/manual-story-studio && npm test`

## 8. Risks & Assumptions

- **HTTP wire-param lockstep (item 2).** The only non-mechanical edit is the URL query-param string `"includeArchived"`: the web client (`url.searchParams.set`) and the Fastify routes (`request.query.includeArchived`) must be renamed together. A half-rename compiles cleanly but silently disables include-inactive filtering (server reads a param the client no longer sends). AC#2's "filtering still works end-to-end" check is the guard; do not land the client and server edits in separate diffs without the integration check.
- **Two parallel API surfaces (item 2).** `includeArchived` exists independently on both the records surface and the beat-templates surface. Renaming only `web/src/api/records.ts` (the sole file the pre-reassessment spec named) leaves the beat-templates chain half-renamed. Both surfaces are in scope.
- **`retired_reason` removal touches the validator, not just a type (item 3).** Dropping the field from `web/src/types/manual-story.ts` alone leaves it declared in `src/schema/manual-story.ts` and live in `src/validate/schema.ts` (`COMMON_OPTIONAL_FIELDS` + `COMMON_SCALARS`). The removal is only complete when all five sites + the test fixture are updated. Assumption: no on-disk authored record carries `retired_reason` (verified — no production code ever wrote it); if a stray record did, it would begin failing validation as an unknown field after removal.
- **Assumption: `active` stays.** Only the *word* "archived" is wrong; the `active`/inactive boolean concept and field are correct and untouched (per §Out of scope).
