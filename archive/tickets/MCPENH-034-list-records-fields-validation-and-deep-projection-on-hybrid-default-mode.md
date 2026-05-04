# MCPENH-034: Validate `mcp__worldloom__list_records` `fields` against the response-shape top-level keys; surface `invalid_input` on silent-skip footgun for hybrid default mode

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/tools/list-records.ts` (`projectRecord` validation + new `unknownProjectionKeys` helper paralleling `unknownFilterKeys`), `tools/world-mcp/src/server.ts` (capability description note about `fields` validation behavior), `tools/world-mcp/tests/tools/list-records.test.ts` (new cases: unknown-key rejection on hybrid default mode, byte-identity preservation for valid keys, atomic-mode parallel coverage), `tools/world-mcp/README.md` (`list_records` API section — name the validation behavior alongside the existing metadata-mode field-set description), `docs/MACHINE-FACING-LAYER.md` (parallel update to the §MCP retrieval surface `list_records` row).
**Deps**: `archive/tickets/MCPENH-030-list-records-server-side-filter-params.md` (the `filters` arg's existing `unknownFilterKeys` validation + `invalid_input` rejection at `tools/world-mcp/src/tools/list-records.ts:229-240` and `tools/world-mcp/src/tools/list-records.ts:415-420` is the structural precedent this ticket extends to `fields`).

## Problem

Before this ticket, `mcp__worldloom__list_records(world_slug, record_type, fields=[...])` silently drops `fields` entries that do not match a top-level key of the response shape — with NO error, warning, or auto-promotion to surface the silent skip. The defect is most pronounced for hybrid record types (`character_record`, `diegetic_artifact_record`, `adjudication_record`) in default/projection mode (i.e., `include_full_body` absent or `false`), because the metadata wrapper exposes ONLY 5 top-level keys (`record_id`, `record_kind`, `title`, `content_hash`, `file_path`), and a natural operator request like `fields=['frontmatter.character_id', 'frontmatter.slug', 'frontmatter.name']` matches NONE of them — silently returning `{record_id}` per record with the requested fields stripped to nothing.

The asymmetry with `filters` makes this a footgun. `filters` validates dotted-path keys against parsed records via `valueAtDottedPath` and rejects unknown keys with a structured `invalid_input` error naming the offending key; `fields` does only `Object.prototype.hasOwnProperty.call(record, field)` (shallow, no dotted-path navigation) and silently drops mismatched keys. An operator who calls both paths in the same session expects parallel error semantics — and gets a debug nightmare instead because one path tells them what's wrong and the other says nothing.

Concrete session evidence (2026-05-04): in this session's `character-generation` execution against `worlds/erotica-world` to author CHAR-0004 Marisa Arrieta, the Pre-flight continuity-preservation read needed to map existing-character slugs to CHAR-NNNN ids (Marisa is daughter Ane's mother, so CHAR-0003's frontmatter carries non-negotiable continuity constraints). The operator called `mcp__worldloom__list_records(world_slug='erotica-world', record_type='character_record', fields=['frontmatter.character_id', 'frontmatter.slug', 'frontmatter.name'])` expecting `{character_id, slug, name}` triples per record. The response was:

```json
{"records":[{"record_id":"CHAR-0001"},{"record_id":"CHAR-0002"},{"record_id":"CHAR-0003"}],"total":3,"truncated":false}
```

— no `frontmatter.character_id`, no `frontmatter.slug`, no `frontmatter.name`, no error indicating the projection silently dropped all three keys. The operator then guessed CHAR-id from alphabetical INDEX.md ordering (incorrectly: assumed `ane-arrieta` → CHAR-0002, but CHAR-0002 was actually Iker Aguirre because IDs are by allocation order, not slug order), wasted one round trip on the wrong CHAR-id (`get_record('CHAR-0002', section_path='frontmatter')` returned Iker), and only on the second guess landed CHAR-0003 (Ane). The waste cost ~30 seconds + one unnecessary tool call; under the auto-mode discipline of the calling skill it also caused a wrong assumption that survived past the first lookup.

A now-supported call with the same args would return `invalid_input: Unknown list_records fields key 'frontmatter.character_id'` (parallel to `filters`'s existing behavior), letting the operator immediately see the skill-prose-recommended workaround (`include_full_body=true` to receive frontmatter content, OR drop `fields` entirely to receive the auto-derived `title` which IS the character's name for hybrid records). The skill-prose update for character-generation's Pre-flight (just landed via skill-audit Issue 1.cascade) recommends `list_records(world_slug, record_type='character_record', include_full_body=true)` as the canonical slug↔CHAR-id enumeration recipe; this ticket lands the engine-side validation that makes the wrong-arg-shape failure mode loud rather than silent.

At intake, the silent-skip was not theoretical: `tools/world-mcp/src/tools/list-records.ts` confirmed `projectRecord` did shallow `Object.prototype.hasOwnProperty.call(record, field)` only; no dotted-path navigation, no unknown-key validation. The asymmetric structural precedent (`unknownFilterKeys` + `invalid_input` rejection for `filters`) demonstrated the engine already knew how to do this validation — the gap was that `fields` did not.

## Assumption Reassessment (2026-05-04)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. **`list_records` arg surface and projection logic confirmed at HEAD before implementation** — at reassessment, `tools/world-mcp/src/tools/list-records.ts` exports `ListRecordsArgs` with five properties (`world_slug`, `record_type`, `story_slug?`, `fields?`, `include_full_body?`, `filters?`). `projectRecord` at lines 137-153 is shallow-only:
   ```typescript
   function projectRecord(record: ListedRecord, fields: string[] | undefined): ListedRecord {
     if (fields === undefined || fields.length === 0) {
       return record;
     }
     const projected: ListedRecord = { record_id: record.record_id };
     for (const field of fields) {
       if (field === "record_id") {
         continue;
       }
       if (Object.prototype.hasOwnProperty.call(record, field)) {
         projected[field] = record[field];
       }
     }
     return projected;
   }
   ```
   No dotted-path navigation, no validation, silent drop on mismatch. Hybrid default mode at lines 237-249 (`withHybridRecord`) returns exactly `{record_id, record_kind, title, content_hash, file_path}` — five top-level keys, none of which include frontmatter fields like `character_id` or `slug`. Atomic default mode at lines 130-135 (`withRecordId`) returns the parsed record's full top-level fields plus `record_id`, so atomic-record `fields` projection works for top-level body keys (e.g., `fields=['title', 'category']` for invariant_record) but still silently drops dotted-path keys (e.g., `fields=['distribution.who_can_do_it']` for canon_fact would silently drop because `distribution.who_can_do_it` is not a top-level key of the parsed CF record).

2. **Cross-skill / cross-artifact shared boundary under audit** — `mcp__worldloom__list_records` is the canonical whole-class enumeration tool consumed by every Category 2/2b/2c/3 skill that needs per-class iteration. Per-skill consumers include: `character-generation` (Pre-flight slug↔CHAR-id mapping enumeration — newly recommended after this session's skill-audit Issue 1.cascade); `diegetic-artifact-generation` (parallel slug↔DA-id mapping — same recipe class); `branching-story-bootstrap` (whole-class M + INV firewall loads); `branching-story-page-cycle` (Phase 4 storylet pool pre-filter — uses `filters` per MCPENH-030); `storylet-pool-authoring` (mode-specific pool loads); `continuity-audit` (per-class enumeration cross-checks); `branching-story-health-audit` (full per-class loads for cross-checks); `propose-new-characters` / `propose-new-canon-facts` (whole-class enumeration for diversity scoring); `emergent-pressure-events` Phase 6 (whole-class M + INV firewall loads). Adding validation to `fields` is additive — every existing consumer that calls with valid keys continues to work unchanged; existing consumers that silently relied on the no-validation behavior surface immediately as `invalid_input` (which is the desired audit-trail outcome — wrong arg shape should be loud, not silent).

3. **Pre-implementation verification that the gap was genuinely absent** — at intake, `grep -nE 'unknownProjectionKeys|projection.*invalid_input|fields.*invalid_input' tools/world-mcp/src/tools/list-records.ts` returned zero hits; `grep -nE 'unknownFilterKeys|filters.*invalid_input' tools/world-mcp/src/tools/list-records.ts` returned hits for the structural filter-validation precedent. The gap claim was concrete: `fields` lacked the validation symmetry that `filters` already had.

4. **FOUNDATIONS principle motivating this ticket** — `docs/FOUNDATIONS.md` §Tooling Recommendation commits to "the documented context-packet + targeted-retrieval pattern" with the corollary that retrieval-tool errors should surface meaningful failure modes the operator can debug, not silently degrade. The `filters` arg's existing `invalid_input` rejection is the spec-shape this principle implies; `fields`'s silent-drop is the asymmetric defect. Restated: a retrieval tool that lets the operator pass invalid args and silently returns a stripped-down result violates the "MCP is the canonical retrieval surface" commitment because operators cannot trust that an empty / minimal response means "no data" rather than "wrong arg shape" without out-of-band validation.

5. **Output schema extension scope** — ADDITIVE-only at the args contract; CHANGED at the validation contract. The `ListRecordsArgs` interface is unchanged. Behavior is unchanged for `fields` calls where every entry matches a top-level key of the response shape (atomic record's parsed body or hybrid metadata wrapper). Behavior CHANGES for `fields` calls where one or more entries do NOT match: previously silent-drop; now `invalid_input` error naming the offending key. This is a strict-validation extension — existing consumers passing valid keys see no change; existing consumers passing invalid keys (relying on silent-drop as defensive behavior) see a new error. Because this skill audit's session evidence is the canonical first observation that an operator passed invalid keys and was misled by the silent-drop, the change is judged a net-positive footgun fix rather than a breaking-change risk. The closeout grep over character-generation confirmed the recently-landed Issue 1.cascade prose recommends `include_full_body=true` for the slug↔CHAR-id mapping rather than invalid `frontmatter.*` projection fields.

6. **Adjacent contradictions classification** — the docs at `tools/world-mcp/README.md:19` and `docs/MACHINE-FACING-LAYER.md:71` described the hybrid default-mode field set (`record_id, record_kind, title, content_hash, file_path`) but did NOT explicitly warn that `fields` referencing other paths would silently drop. The doc gap was a docs-drift sub-finding consequent to this ticket. The README and machine-facing docs now name the new `invalid_input` behavior, keep valid `fields` examples scoped to top-level response keys, and preserve the larger "hybrid `fields` projection should support dotted-path navigation into frontmatter" feature as out of scope.

7. **Verification correction from live package reassessment** — the `unknownFilterKeys` precedent evaluates filter keys against the parsed-record stream, not against the response wrapper shape. The validation logic for `fields` addresses a subtly different surface: hybrid default mode's field set is the wrapper shape (a static 5-element set), not the parsed record body, so validation is eager against the static set. Atomic default mode's field set is the parsed record's top-level keys, which requires parsing at least one row to determine validity. The implementation mirrors `unknownFilterKeys`'s "evaluate after at least one row is parsed; empty result set returns empty success" discipline for atomic/story-bundle default mode and adds eager static-set validation for hybrid default mode. The split keeps each mode's validation tight to its actual response shape rather than over-rejecting valid keys.

## Architecture Check

1. **Why this approach is cleaner than alternatives**:
   - **Alternative A — extend `projectRecord` to navigate dotted paths into the parsed record body when `include_full_body` is true** (e.g., `fields=['frontmatter.character_id']` resolves to `body.frontmatter.character_id` in the response): rejected as out-of-scope here because the `include_full_body=true` mode explicitly ignores `fields` (per `tools/world-mcp/README.md:19`: "`include_full_body: true` ... ignores `fields`"). Changing that contract is a bigger API-shape decision (does the projected output keep the `body` wrapper? does it preserve `record_kind`? does it require dotted-path normalization across atomic vs hybrid modes?) and would produce a feature surface this ticket's session-evidence does not motivate. Alternative A may become a future ticket if a downstream skill demands lighter-weight per-record projections than full-body returns; the validation extension here is a pure footgun fix and does not foreclose Alternative A's design space.
   - **Alternative B — add a dedicated lightweight enumeration tool** (e.g., `mcp__worldloom__list_hybrid_record_index(world_slug, record_type)` returning `{record_id, slug, title}` per record without full bodies): rejected because the hybrid metadata wrapper at `withHybridRecord` already exposes `{record_id, record_kind, title, content_hash, file_path}` — `title` for `character_record` is `frontmatter.name` (auto-derived), and `file_path` (e.g., `characters/marisa-arrieta.md`) encodes the slug. A skill needing the slug↔CHAR-id↔name mapping can call `list_records(record_type='character_record')` (no `fields`, no `include_full_body`) and post-process `file_path` for the slug. Adding a new tool duplicates this surface; the validation fix in the chosen approach makes the existing tool usable without surprises.
   - **Alternative C — auto-promote `include_full_body=true` when `fields` references frontmatter/body paths**: rejected because automatic-promotion changes the response shape silently (full-body responses are 100KB+ for protagonist-tier dossiers; an operator who explicitly passed `include_full_body=false` (or omitted it, expecting metadata mode) would receive an unexpectedly large response). The chosen approach makes the wrong-arg-shape failure loud (`invalid_input`) and lets the operator decide whether to add `include_full_body=true`, drop `fields`, or use a different tool.
   - The chosen approach (extend `unknownFilterKeys`'s validation pattern to `fields`, applied to the response-shape top-level keys for the record_type's mode) follows the principle "the engine should validate args against the actual response shape it will produce, not silently degrade". `filters` already does this; `fields` should match.

2. **No backwards-compatibility shims**: the implementation rejects `fields` calls with unmatched keys outright via `invalid_input` (parallel to the existing `filters` rejection). There is no fallback / opt-out / deprecation-mode flag. Existing consumers passing valid keys see byte-identical output; existing consumers passing invalid keys see an immediate failure rather than a silent-degraded response — which is the desired correction, not a backwards-incompatible regression. Because the silent-drop behavior had no documented contract supporting it as intentional, removing it is a footgun fix, not a breaking change.

## Verification Layers

1. **`fields` arg validation rejects unknown keys for hybrid default mode** → codebase grep-proof: `grep -nE 'unknownProjectionKeys|invalid_input.*fields' tools/world-mcp/src/tools/list-records.ts` returns hits in the validation helper + invocation site.
2. **`fields` arg validation rejects unknown keys for atomic default mode** → unit test: `tools/world-mcp/tests/tools/list-records.test.ts` adds a case calling `list_records(record_type='invariant_record', fields=['nonexistent_field'])` and asserts the response is `invalid_input` naming the unknown key, parallel to existing filter-key rejection coverage.
3. **`fields` arg validation does not over-reject valid keys** → unit test: `tools/world-mcp/tests/tools/list-records.test.ts` adds a case calling `list_records(record_type='character_record', fields=['title'])` and asserts the response is the projected metadata wrapper (`{record_id, title}` per record), byte-identical to pre-change behavior. A parallel atomic case calls `list_records(record_type='invariant_record', fields=['title', 'category'])` and asserts the projection works for top-level body fields.
4. **`include_full_body=true` continues to ignore `fields` per existing contract** → unit test: existing test coverage for full-body mode continues to pass; new test asserts `list_records(record_type='character_record', fields=['frontmatter.character_id'], include_full_body=true)` returns the full-body wrapper (with `body` content) and ignores the (potentially-invalid) `fields` arg without raising `invalid_input` — full-body mode is the documented escape hatch for operators who want frontmatter content.
5. **Cross-skill prose surfaces remain valid** → grep-proof: `grep -nE "list_records.*include_full_body=true|list_records.*record_type='character_record'" .claude/skills/character-generation/SKILL.md .claude/skills/character-generation/references/world-state-prerequisites.md` confirms the recently-landed Issue 1.cascade prose recommends `include_full_body=true` rather than `fields` for the slug↔CHAR-id mapping (the skill-prose path is the operator's recommended escape from the silent-drop footgun this ticket structurally fixes).

## Landed Changes

### 1. Added `unknownProjectionKeys` helper paralleling `unknownFilterKeys`

In `tools/world-mcp/src/tools/list-records.ts`, `unknownProjectionKeys` now evaluates `fields` keys against the response-shape top-level keys for the record_type's mode. Hybrid default mode validates against the static 5-element wrapper shape (`record_id`, `record_kind`, `title`, `content_hash`, `file_path`). Atomic and story-bundle default/projection modes validate against parsed-record top-level keys after at least one row is parsed, matching the existing empty-record-set limitation of `unknownFilterKeys`. When `include_full_body=true`, validation is skipped because `fields` is ignored per the existing contract.

### 2. Invoked validation at the row-projection pipeline entry

After parsing rows but before `projectRecord` is applied, `listRecordsImpl` now calls `unknownProjectionKeys(...)` and returns `invalid_input` naming the first unknown key when the helper returns a non-empty list. The error response carries `field: 'fields'`, `unknown_projection_keys: [<list>]`, and `record_type` for parallelism with the existing `unknownFilterKeys` error response.

### 3. Server schema + capability description updated

`tools/world-mcp/src/server.ts` registered `list_records` capability description gains a brief note: `fields` is validated against the response-shape top-level keys for the record_type's mode and rejects unknown keys via `invalid_input` (parallel to `filters`). The Zod input schema is unchanged (the validation runs at handler-time after parse, not at schema-time).

### 4. Field-validation unit tests added

`tools/world-mcp/tests/tools/list-records.test.ts` adds:
- Hybrid default mode unknown-key rejection: `list_records(record_type='character_record', fields=['frontmatter.character_id'])` → `invalid_input` naming `frontmatter.character_id`.
- Hybrid default mode valid-key passthrough: `list_records(record_type='character_record', fields=['title'])` → projected response with `title` per record.
- Hybrid default mode multi-key partial-invalid rejection: `list_records(record_type='character_record', fields=['title', 'frontmatter.slug'])` → `invalid_input` naming `frontmatter.slug` (the first unknown key).
- Atomic default mode unknown-key rejection: `list_records(record_type='invariant_record', fields=['nonexistent_field'])` → `invalid_input`.
- Atomic default mode valid-key passthrough: `list_records(record_type='invariant_record', fields=['title', 'category'])` → projected response with both fields.
- Full-body mode `fields` ignored: `list_records(record_type='character_record', fields=['frontmatter.character_id'], include_full_body=true)` → full-body response, no `invalid_input` raised.
- Empty-fields and absent-fields baseline: byte-identical to pre-change behavior for both modes.

### 5. Updated `tools/world-mcp/README.md`

The `list_records` API section gains: "`fields` entries are validated against the response-shape top-level keys for the record_type's mode (`{record_id, record_kind, title, content_hash, file_path}` for hybrid default mode; the parsed record's top-level body keys for atomic default mode); unknown keys return `invalid_input` naming the offending key, parallel to `filters`. To project frontmatter or body content, use `include_full_body: true` (which returns the full body and ignores `fields`)."

### 6. Updated `docs/MACHINE-FACING-LAYER.md`

The §MCP retrieval surface `list_records` row gains a parallel one-sentence note about `fields` validation behavior, mirroring the README update at Item 5.

## Files to Touch

- `tools/world-mcp/src/tools/list-records.ts` (modify)
- `tools/world-mcp/src/server.ts` (modify)
- `tools/world-mcp/tests/tools/list-records.test.ts` (modify)
- `tools/world-mcp/README.md` (modify)
- `docs/MACHINE-FACING-LAYER.md` (modify)

## Out of Scope

- **Dotted-path navigation for `fields` (Alternative A)**: extending `fields` to navigate dotted paths into the parsed record body when `include_full_body=true` is a separate API-shape decision (does the projected output retain the `body` wrapper? how does the projection interact with hybrid `body.frontmatter` vs `body.body_sections`?). Out of scope here; may become a future ticket if downstream skill evidence demands it.
- **Dedicated lightweight hybrid-record enumeration tool (Alternative B)**: a new `list_hybrid_record_index` tool returning `{record_id, slug, title}` per record without full bodies. Rejected at Architecture Check because the existing `list_records(record_type=..., no fields)` already exposes `{record_id, record_kind, title, content_hash, file_path}` and `file_path` encodes the slug; a new tool would duplicate the surface.
- **Auto-promotion of `include_full_body=true` based on `fields` shape (Alternative C)**: silent shape changes are footguns. Rejected at Architecture Check.
- **Sibling cascade of `fields` validation into other MCP tools** (`get_records_field`, `get_record_field`, etc.): each tool has its own narrowing semantics and arg surface; unifying them would be a larger refactor. This ticket lands `list_records.fields` validation only.
- **Skill-prose updates to recommend `fields` over `include_full_body` for narrow projections**: out of scope because the existing skill-prose path (recommending `include_full_body=true` for slug↔CHAR-id enumeration) IS the documented escape hatch from this footgun. Changing skill-prose recommendations after Alternative A lands (if it ever does) is a separate skill-audit decision.
- **Validation of `filters` against `record_type`-specific field shapes**: the existing `unknownFilterKeys` already handles this correctly via `valueAtDottedPath` against parsed records. No change needed.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && node --test dist/tests/tools/list-records.test.js` — all field-validation cases pass per Item 4 above (hybrid + atomic unknown-key rejection, valid-key passthrough, full-body bypass, empty/absent baseline).
2. `cd tools/world-mcp && npm test` — full package suite passes after rebuild.
3. `grep -nE 'unknownProjectionKeys|invalid_input.*fields' tools/world-mcp/src/tools/list-records.ts` — at least one hit in the validation helper + invocation site.
4. `grep -nE 'fields.*validated|invalid_input.*fields' tools/world-mcp/README.md docs/MACHINE-FACING-LAYER.md` — at least one hit in each doc confirming the validation-behavior note landed.

### Invariants

1. **Symmetric validation between `fields` and `filters`**: both args reject unknown keys via `invalid_input` naming the offending key. Silent-drop on `fields` and silent-success on `filters` are forbidden (would re-introduce the footgun).
2. **Mode-aware field-set scope**: `fields` validation respects the response-shape mode (hybrid default mode's static 5-element wrapper vs atomic default mode's parsed-body top-level keys vs full-body mode's `fields`-ignored bypass). Validation rejecting a key valid in another mode is a defect.
3. **Additive-only contract for valid-key calls**: `list_records` calls passing only valid `fields` keys produce byte-identical output to the pre-change implementation. No existing consumer passing valid keys breaks.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/list-records.test.ts` — add field-validation coverage cases per Item 4 above.

### Commands

1. `cd tools/world-mcp && npm run build`.
2. `cd tools/world-mcp && node --test dist/tests/tools/list-records.test.js` — focused field-validation proof.
3. `cd tools/world-mcp && npm test` — full package suite.
4. `grep -nE 'unknownProjectionKeys|invalid_input.*fields' tools/world-mcp/src/tools/list-records.ts` — verify validation helper + invocation site landed.
5. `grep -nE 'fields.*validated|invalid_input.*fields' tools/world-mcp/README.md docs/MACHINE-FACING-LAYER.md` — verify docs updates.

## Outcome

Implemented mode-aware `fields` validation for `mcp__worldloom__list_records`.

- Hybrid default/projection mode now rejects `fields` outside the metadata wrapper keys (`record_id`, `record_kind`, `title`, `content_hash`, `file_path`).
- Atomic and story-bundle default/projection modes now reject `fields` that are absent from every parsed record in a non-empty result set.
- Full-body mode continues to ignore `fields`, so `include_full_body=true` remains the documented escape hatch for frontmatter/body access.
- Valid-key projection output remains unchanged.
- Server capability metadata, package README, and repo machine-facing docs now describe the validation behavior.

## Verification Result

Passed:

1. `cd tools/world-mcp && npm run build`.
2. `cd tools/world-mcp && node --test dist/tests/tools/list-records.test.js`.
3. `cd tools/world-mcp && npm test` — full package suite passed (`336` passing tests).
4. `rg -n 'unknownProjectionKeys|invalid_input.*fields' tools/world-mcp/src/tools/list-records.ts`.
5. `rg -n 'fields.*validated|invalid_input.*fields' tools/world-mcp/README.md docs/MACHINE-FACING-LAYER.md tools/world-mcp/src/server.ts`.
6. `rg -n "list_records.*include_full_body=true|list_records.*record_type='character_record'" .claude/skills/character-generation/SKILL.md .claude/skills/character-generation/references/world-state-prerequisites.md` — confirmed character-generation prose uses `include_full_body=true` for slug-to-CHAR-id enumeration rather than invalid `frontmatter.*` projection fields.

## Deviations

- Empty atomic/story-bundle record sets still cannot validate unknown `fields` keys because there is no parsed response shape to inspect. This mirrors the existing `filters` empty-set limitation. Hybrid default mode can validate eagerly because the metadata wrapper shape is static.
- Direct external `mcp__worldloom__list_records(...)` smoke was not claimed; this run changed source and validated through package-local build/tests and registered capability text, not through a restarted deployed MCP connector.
- `tools/world-mcp/.secret`, `tools/world-mcp/node_modules/`, and `tools/world-mcp/dist/` were ignored package artifacts in the package-scoped status snapshot; `dist/` was refreshed by `npm run build` / `npm test`.
