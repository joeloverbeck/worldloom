# MCPENH-047: Separate `narrative_section` node_type for WORLD_KERNEL.md H2 spans so `list_records(record_type='section_record')` cleanly enumerates atomic SEC-*-NNN records only

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-index/src/schema/types.ts` (add `narrative_section` to `NODE_TYPES`), `tools/world-index/src/schema/version.ts` (bump `CURRENT_INDEX_VERSION` to 5 to force re-index), `tools/world-index/src/schema/migrations/005_narrative_section_node_type.sql` (add no-op migration sentinel), `tools/world-index/src/parse/prose.ts` (`nodeTypeForHeading` returns `narrative_section` for WORLD_KERNEL.md depth-2 spans before the generic `depth === 2 → "section"` fallback), `tools/world-index/src/parse/entities.ts` / `semantic.ts` (preserve narrative-span evidence and attribution behavior), `tools/world-mcp/src/context-packet/local-authority.ts` (extend the `seedRow.node_type` filter to include `narrative_section`), `tools/world-mcp/src/ranking/profiles/canon-pipeline-adjacent.ts` (preserve section-equivalent ranking weights for narrative spans), `tools/world-mcp/src/context-packet/governing-world-context.ts` (audited and left unchanged because its `row.node_type === "section"` checks parse atomic SEC record bodies), `tools/world-mcp/tests/tools/list-records.test.ts` (new test: `list_records(section_record)` returns only atomic SEC-*-NNN.yaml file_paths and succeeds even when WORLD_KERNEL.md narrative-section rows exist in the index), `tools/world-index/tests/prose-domain-file.test.ts` and `tools/world-index/tests/types.test.ts` (new parser case and registry count update), `tools/world-mcp/tests/fixtures/build-fixture.ts` / `context-packet/locality-first.test.ts` (fixture truthing), `tools/world-mcp/README.md` and `docs/MACHINE-FACING-LAYER.md` (`list_records` API section — note that `section_record` returns atomic SEC files only; narrative spans of `WORLD_KERNEL.md` are accessed via `get_record(record_id=<path-based-id>)`).
**Deps**: None — this is a self-contained world-index + MCP retrieval fix.

## Problem

Mid-session during a `canon-addition` run on `erotica-world` (2026-05-16), `mcp__worldloom__list_records({world_slug:'erotica-world', record_type:'section_record'})` returned an error rather than the enumeration of atomic SEC files:

```
{"code":"invalid_input",
 "message":"Record 'erotica-world:WORLD_KERNEL.md:Acknowledgements of Inferred Items:0' body is not a YAML mapping.",
 "details":{"field":"record_id","record_id":"erotica-world:WORLD_KERNEL.md:Acknowledgements of Inferred Items:0"}}
```

Root cause: the world-index prose parser at `tools/world-index/src/parse/prose.ts:nodeTypeForHeading` (lines 273-308) routes every depth-2 heading of every indexed markdown file to `node_type: "section"` by default (line 294-295), with only a small list of legacy exceptions (`MYSTERY_RESERVE.md` / `OPEN_QUESTIONS.md` / `INVARIANTS.md` / `ONTOLOGY.md` — three of which are pre-SPEC-13 single-markdown surfaces that no longer exist on modern worlds). `WORLD_KERNEL.md` is in `MANDATORY_WORLD_FILES`, so its H2 sections (`## Genre Contract`, `## Chronotope`, `## Primary Difference`, `## Acknowledgements of Inferred Items`, etc.) are indexed alongside the atomic SEC-*-NNN.yaml records under the same `"section"` node_type. `tools/world-mcp/src/tools/list-records.ts:382` selects rows by `node_type` alone (`WHERE world_slug = ? AND node_type = ? AND story_slug IS NULL`), with no `file_path` or origin predicate scoping the result set to atomic SEC files. When `parseRecordBody` at line 414 then attempts to YAML-parse a narrative-prose section body, the parse fails and the entire `list_records` call hard-fails on the first bad row.

Operator workaround used during the canon-addition run: switched from bulk `list_records(section_record)` to per-file-class `get_record(record_id='SEC-ELF-001'…SEC-TML-001)` to assemble the SEC-record set manually. This worked but defeats the purpose of `list_records` as a class-enumeration API and won't scale once a world has many sections per class (`erotica-world` has only one record per SEC file class today; richer worlds will surface the per-record-call burden).

The blast radius is bounded: only `list_records` is a bulk enumerator of `"section"` rows. Other consumers (`tools/world-mcp/src/context-packet/governing-world-context.ts:539,646`, `tools/world-mcp/src/context-packet/local-authority.ts:98`, `tools/world-index/src/parse/atomic.ts:529,751`, `tools/world-index/src/parse/prose.ts:256`) all access single rows or already file-class-scoped selections (`tools/world-mcp/src/context-packet/full-body-delivery.ts:40,46,58` scopes by `sectionFileClasses` matching SEC-PAS / EVERYDAY_LIFE / TIMELINE / INSTITUTIONS — i.e., atomic SEC file classes only). But the conflation at the index layer is the architecturally honest defect — splitting WORLD_KERNEL.md narrative-section spans into a distinct `narrative_section` node_type makes the taxonomy self-correcting and avoids the need for downstream filter discipline at every new consumer.

## Assumption Reassessment (2026-05-16)

1. **Codebase reassessment.** At intake (HEAD plus this session's working-tree state), `tools/world-index/src/parse/prose.ts:nodeTypeForHeading` (lines 273-308) handles four named markdown files as legacy special cases (MYSTERY_RESERVE.md → mystery_reserve_entry; OPEN_QUESTIONS.md → open_question_entry; INVARIANTS.md → invariant; ONTOLOGY.md → ontology_category) and falls through to `if (depth === 2) return "section"` (lines 294-295) for everything else — which includes `WORLD_KERNEL.md` H2 spans. `tools/world-index/src/enumerate.ts:10,25` confirms WORLD_KERNEL.md is in `PRIMARY_AUTHORED_ROOT_FILES` and is therefore indexed. `tools/world-index/src/schema/types.ts:15` confirms `"section"` is the only section-style NodeType in the enum; there is no `narrative_section` variant. `tools/world-mcp/src/tools/list-records.ts:382-388` selects section rows by `node_type` alone with no `file_path` predicate. `tools/world-mcp/src/tools/list-records.ts:414` calls `parseRecordBody` which attempts YAML parse on every row regardless of source. `tools/world-index/src/schema/version.ts` shows `CURRENT_INDEX_VERSION = 4` (would need bump to force re-index). `git status --porcelain` at Phase 5 returned only `.codex/skills/implement-spec-tickets/SKILL.md` and `reports/story-related-improvements-sixth-iteration.md` plus this-session canon-addition writes under `worlds/erotica-world/` — none in the Phase 5 grep scope; the gap is genuinely present at HEAD.
2. **Doc reassessment.** Archive content-grep `grep -niE '(WORLD_KERNEL|section_record|list_records.*section|narrative.*section|Acknowledgements of Inferred)' archive/tickets/MCPENH-*.md archive/tickets/VALENH-*.md archive/tickets/PEENH-*.md` returned hits at MCPENH-012 / MCPENH-024 / MCPENH-026 / MCPENH-030 / MCPENH-034 / MCPENH-037 / MCPENH-009 / MCPENH-007 / MCPENH-005 — but each names WORLD_KERNEL.md or `section_record` in adjacent context (governing-context inclusion, hybrid record_type extension, story-bundle inventory) and none has an Outcome that resolves THIS gap (the over-broad `node_type === "section"` selection from a parser that emits narrative-prose H2 spans alongside atomic SEC files). MCPENH-037 specifically extended `isIndexablePath` enumeration for story-bundle markdown paths but did NOT address the node_type collision in the prose parser. `docs/MACHINE-FACING-LAYER.md` and `docs/CONTEXT-PACKET-CONTRACT.md` are silent on `narrative_section` vs `section` (they discuss `section` as the SEC-*-NNN atomic-section node_type only).
3. **Shared boundary under audit.** The cross-package boundary between `@worldloom/world-index` (the parser-and-schema package that emits NodeType rows) and `@worldloom/world-mcp` (consumers of those rows via retrieval tools). The boundary contract is the `NodeType` enum at `tools/world-index/src/schema/types.ts`. The fix amends the enum (adds `narrative_section`), bumps the schema version (forces re-index so existing index DBs migrate), and updates consumer logic in world-mcp where the existing `"section"` checks were ambiguous between "atomic SEC file" and "any depth-2 narrative span". Downstream consumer audits at `tools/world-mcp/src/context-packet/local-authority.ts:98` and `tools/world-mcp/src/context-packet/governing-world-context.ts:539,646` ensure the new node_type is included where the intent was "any narrative span" (most likely at local-authority's seed-filter list) and excluded where the intent was "atomic SEC record" (list_records section_record, full-body-delivery sectionFileClasses, atomic.ts edge resolution).
4. **FOUNDATIONS principle under audit.** §Canonical Storage Layer + §Mandatory World Files (SPEC-13): canonical storage is atomic YAML under `_source/<subdir>/<ID>.yaml`. The `section_record` MCP `record_type` is operator-facing as "atomic SEC-*-NNN.yaml records under `_source/<file-class>/`". WORLD_KERNEL.md is primary-authored narrative prose at the world root and is NOT a section_record in the FOUNDATIONS taxonomy — it is its own file class (the world kernel). The current world-index conflation violates FOUNDATIONS by routing the world-kernel's prose spans into the `section_record` retrieval surface, where the operator expectation is atomic SEC YAML records only.
5. **Existing output schema extension.** The `NodeType` enum at `tools/world-index/src/schema/types.ts` is an existing schema consumed by every world-index parse path and every world-mcp retrieval tool. Adding `narrative_section` is additive-only: existing consumers that check `node_type === "section"` continue to work; new consumers can opt into the broader `["section", "narrative_section"]` set where the intent is "any structured-or-narrative span". The schema-version bump from 4 to 5 triggers re-index of existing world DBs on next `world-validate` / `world-index init` invocation; the migration is automatic per the existing version-gate pattern. No downstream tickets are blocked on the rename; the change is structurally additive.
6. **Adjacent contradictions exposed by reassessment.** The legacy special-case branches at `tools/world-index/src/parse/prose.ts:278-288` (MYSTERY_RESERVE.md → mystery_reserve_entry; OPEN_QUESTIONS.md → open_question_entry; INVARIANTS.md → invariant) are pre-SPEC-13 single-markdown-file paths that no longer exist on modern worlds (those file classes are atomized to `_source/<subdir>/*.yaml`). They are dead code on post-SPEC-13 worlds. Classification: **future cleanup that must become its own ticket**, not bundled here. Rationale for non-inclusion: (a) the dead-code branches don't cause incorrect behavior on modern worlds (the files simply don't exist, so the branches are never reached); (b) any legacy worlds still in `archive/` may have those files present and rely on the branches; (c) removing them would inflate this ticket's scope without addressing the WORLD_KERNEL.md section_record conflation that is the actual blocker. A separate follow-up can remove the dead-code branches and update the parser's test fixtures to drop pre-SPEC-13 markdown surfaces.
7. **Rename/remove blast radius.** Pipeline-wide grep `grep -rnE '"section"' tools/world-index/src/ tools/world-mcp/src/` returned 11 hits across `schema/types.ts:15`, `tools/world-mcp/src/tools/get-record-schema.ts:21` (schema discovery; unchanged), `tools/world-index/src/parse/prose.ts:159,256,295,304` (the parser itself; one of these — line 295 — is the bug site), `tools/world-index/src/parse/semantic.ts:224` (edge weight; unchanged behavior preserved), `tools/world-mcp/src/context-packet/local-authority.ts:98` (seed-row filter; extend to include narrative_section), `tools/world-mcp/src/context-packet/full-body-delivery.ts:40,46,58` (sectionFileClasses scope; already atomic-only, unchanged), `tools/world-index/src/parse/yaml.ts:508` (single-record edge resolution; unchanged), `tools/world-mcp/src/tools/list-records.ts:115` (record_type → node_type mapping; the section_record mapping STAYS at "section" — `narrative_section` is intentionally not surfaced via list_records since the operator-facing record_type taxonomy is for atomic records only), `tools/world-index/src/parse/atomic.ts:59-65,529,751` (atomic SEC-*-NNN.yaml emits node_type "section"; this is the correct atomic-section path, unchanged). Net: only `prose.ts:295` (1 line), `local-authority.ts:98` (extend array), and `governing-world-context.ts:539,646` (audit only — likely unchanged once narrative_section is in scope) require behavior changes; everything else either continues to work or is already correct.
8. **Proof-shape correction.** The drafted parser-test path `tools/world-index/tests/parse/prose.test.ts` does not exist in the live checkout. The existing parser test surface is `tools/world-index/tests/prose-domain-file.test.ts` / `tools/world-index/tests/prose-whole-file.test.ts`; this ticket uses `prose-domain-file.test.ts` for the WORLD_KERNEL.md H2 routing assertion. Direct post-change `mcp__worldloom__...` smoke calls are not exposed in this Codex session, so acceptance is package-local build/tests plus direct compiled handlers. External MCP calls remain operational smoke after rebuild/restart, not the proof surface for this run.

## Architecture Check

1. **Why this approach is cleaner than alternatives.** Three options were considered: (A) add a `file_path` predicate at the `list_records` SQL query restricting section_record to `_source/%/SEC-*-*.yaml`; (B) introduce graceful-error-skip in `parseRecordBody` for rows whose body fails YAML parse; (C) **introduce `narrative_section` NodeType and separate the parse-time classification at source** (this ticket). Option A masks the underlying conflation at one consumer and risks recurrence at every new section-enumerating consumer (the conflation is at the index layer, but only filtered at the retrieval-query layer). Option B silently drops legitimate index errors and would mask future malformed-YAML bugs that ARE genuine corruption. Option C names the actual taxonomy distinction — narrative-prose spans of primary-authored world files vs. atomic structured SEC records under `_source/` — at the same layer where it originates (the parser), making the fix self-correcting at every consumer and FOUNDATIONS-aligned (atomic-source taxonomy at §Canonical Storage Layer + §Mandatory World Files reserves `section_record` for atomic-section records).
2. **No backwards-compatibility aliasing/shims introduced.** The schema-version bump from 4 to 5 forces a clean re-index on next world-validate / world-index init invocation; there is no migration path that aliases old `"section"` rows for WORLD_KERNEL.md into both node_types. The `NodeType` enum addition is additive (existing consumers reading `"section"` continue to work because atomic SEC records still emit `"section"` exactly as before — only the WORLD_KERNEL.md narrative spans move to `narrative_section`). No `--legacy-section-mode` flag, no fallback union-type at consumer sites, no SQL view that pretends WORLD_KERNEL spans are still `"section"`. Consumers that need the union explicitly query both node_types.

## Verification Layers

1. **`list_records(section_record)` enumerates atomic SEC files only, including on worlds with WORLD_KERNEL.md narrative-section content** → schema validation + skill dry-run: rebuild `tools/world-index`, re-init the `erotica-world` index, call `mcp__worldloom__list_records({world_slug:'erotica-world', record_type:'section_record'})`, verify the response contains seven rows (one per atomic SEC file class) and zero rows whose `file_path` starts with `WORLD_KERNEL.md`.
2. **WORLD_KERNEL.md narrative spans remain retrievable via `get_record(record_id='erotica-world:WORLD_KERNEL.md:<H2-text>:0')`** → schema validation + skill dry-run: same procedure, then call `get_record` on one of the WORLD_KERNEL.md narrative-section record IDs (e.g., `erotica-world:WORLD_KERNEL.md:Acknowledgements of Inferred Items:0`) and verify the response delivers the narrative-prose body without error (no YAML-parse attempt on non-YAML content).
3. **Context packets continue to seed from WORLD_KERNEL.md narrative spans** → codebase grep-proof: after the `local-authority.ts:98` filter extension, run `mcp__worldloom__get_context_packet({world_slug:'erotica-world', task_type:'canon_addition', seed_nodes:['CF-0001'], token_budget:10000})` and verify the packet's governing context still includes WORLD_KERNEL.md prose (the narrative-section spans participate in semantic search as before).
4. **Schema-version migration is automatic** → skill dry-run: after the version bump, run `node tools/world-index/dist/src/cli.js sync erotica-world` and confirm the re-index completes without manual intervention.
5. **No existing context-packet consumer regresses** → manual review: cross-reference each `node_type === "section"` site in `tools/world-mcp/src/context-packet/` against the new narrative_section taxonomy, verify intent preserved.
6. **FOUNDATIONS Canonical Storage Layer alignment** → FOUNDATIONS alignment check: §Mandatory World Files reserves `section_record` for atomic SEC-*-NNN.yaml records under `_source/<file-class>/`; this fix surfaces that contract structurally at the index layer rather than via per-consumer filter discipline.

## What to Change

### 1. Add `narrative_section` to NodeType enum

In `tools/world-index/src/schema/types.ts`, extend `NODE_TYPES` to include `"narrative_section"` adjacent to `"section"` and `"subsection"`. Update the type alias `NodeType` (automatically derived from the const tuple). No other type-system changes needed; downstream consumers that check `node_type === "section"` are unaffected unless they need the union explicitly (audit per below).

### 2. Bump CURRENT_INDEX_VERSION

In `tools/world-index/src/schema/version.ts`, change `CURRENT_INDEX_VERSION = 4` to `CURRENT_INDEX_VERSION = 5`. The existing version-gate pattern at `tools/world-index/src/commands/` triggers re-index of stale DBs on next sync/validate.

### 3. Route WORLD_KERNEL.md depth-2 spans to `narrative_section`

In `tools/world-index/src/parse/prose.ts:nodeTypeForHeading` (lines 273-308), add an explicit `WORLD_KERNEL.md` branch BEFORE the generic depth-2 fallback:

```ts
if (relativeFilePath === "WORLD_KERNEL.md" && depth === 2) {
  return "narrative_section";
}
```

Place this clause adjacent to the existing `ONTOLOGY.md && depth === 2 → "ontology_category"` clause (line 290-292) so the special-case routing remains consolidated.

### 4. Audit downstream consumers of `node_type === "section"`

Per the blast-radius scan in Assumption Reassessment item 7, audit each `"section"` consumer site and extend to `narrative_section` where the intent is "any structured-or-narrative span". Most likely changes:

- `tools/world-mcp/src/context-packet/local-authority.ts:98` — extend `["section", "subsection", "bullet_cluster"]` to `["section", "narrative_section", "subsection", "bullet_cluster"]` so context-packet seeding continues to consider WORLD_KERNEL.md narrative spans.
- `tools/world-mcp/src/context-packet/governing-world-context.ts:539,646` — audit each `row.node_type === "section"` check; if the intent was atomic SEC retrieval, leave unchanged; if the intent was "any narrative span", extend to include `narrative_section`. Verify by reading the surrounding logic.
- `tools/world-index/src/parse/atomic.ts:529,751` — atomic-record edge resolution; unchanged (these handle `recordSpec("section", …)` from atomic SEC-*-NNN.yaml emission paths, which still emit `"section"`).
- `tools/world-index/src/parse/semantic.ts:224` — semantic-edge weight for `"section"` rows; unchanged (atomic SEC weight is unchanged; narrative_section gets the default weight).
- `tools/world-index/src/parse/prose.ts:256` — `(span.nodeType === "section" || span.nodeType === "subsection")` in `createBulletClusterSpans`; extend to include `narrative_section` if bullet clusters should be created under WORLD_KERNEL.md H2 chunks (most likely yes, for parity).
- `tools/world-mcp/src/tools/list-records.ts:115` — the `record_type → node_type` mapping for `section_record` STAYS at `"section"` (intentional: `section_record` is operator-facing for atomic SEC records only).

### 5. Tests

- New test in `tools/world-mcp/tests/tools/list-records.test.ts`: `list_records({record_type:'section_record'})` on a world whose WORLD_KERNEL.md has H2 sections returns only rows whose `file_path` starts with `_source/<file-class>/` and matches the SEC-*-NNN.yaml pattern; the response succeeds without error.
- New test in `tools/world-index/tests/prose-domain-file.test.ts`: parsing WORLD_KERNEL.md produces `narrative_section` rows for H2 headings; existing atomic-source tests continue to prove atomic SEC-*-NNN.yaml files produce `section` rows through `parse/atomic.ts`.
- Update any existing test that asserts WORLD_KERNEL.md spans are `node_type: "section"` to expect `narrative_section`; this is the explicit retcon surface.

### 6. Documentation

- `tools/world-mcp/README.md` `list_records` API section: note that `section_record` returns atomic SEC-*-NNN.yaml records only; WORLD_KERNEL.md narrative-prose H2 spans are accessed via `get_record(record_id='<world>:WORLD_KERNEL.md:<H2-text>:0')` directly when needed.

## Files to Touch

- `tools/world-index/src/schema/types.ts` (modify)
- `tools/world-index/src/schema/version.ts` (modify)
- `tools/world-index/src/schema/migrations/005_narrative_section_node_type.sql` (new — version-bump migration sentinel)
- `tools/world-index/src/parse/prose.ts` (modify)
- `tools/world-index/src/parse/entities.ts` (modify — preserve entity mention evidence from narrative spans)
- `tools/world-index/src/parse/semantic.ts` (modify — preserve attribution attachment to narrative spans)
- `tools/world-mcp/src/context-packet/local-authority.ts` (modify)
- `tools/world-mcp/src/context-packet/governing-world-context.ts` (audit + modify if intent is "any narrative span" at the cited sites)
- `tools/world-mcp/src/ranking/profiles/canon-pipeline-adjacent.ts` (modify — preserve section-equivalent ranking weights for narrative spans)
- `tools/world-mcp/tests/tools/list-records.test.ts` (modify — add new case)
- `tools/world-index/tests/prose-domain-file.test.ts` (modify — add new case)
- `tools/world-index/tests/types.test.ts` (modify — update node-type registry count)
- `tools/world-mcp/tests/fixtures/build-fixture.ts` (modify — update WORLD_KERNEL fixture row)
- `tools/world-mcp/tests/context-packet/locality-first.test.ts` (modify — update WORLD_KERNEL narrative fixture)
- `tools/world-mcp/README.md` (modify — `list_records` API section)
- `docs/MACHINE-FACING-LAYER.md` (modify — same machine-facing `list_records` clarification as README)

## Out of Scope

- Removing the legacy `MYSTERY_RESERVE.md` / `OPEN_QUESTIONS.md` / `INVARIANTS.md` special-case branches at `tools/world-index/src/parse/prose.ts:278-288`. These files don't exist on modern post-SPEC-13 worlds (atomized to `_source/<subdir>/*.yaml`); the branches are dead code. Removal is a separate cleanup ticket — not bundled here because (a) the dead-code branches don't cause incorrect behavior on modern worlds (the files simply don't exist), and (b) some legacy worlds in archive may still have those files in their working trees.
- Removing or refactoring `tools/world-index/src/parse/prose.ts` itself wholesale (e.g., to a fully YAML-centric world-index post-SPEC-13). The prose parser still has legitimate roles (indexing primary-authored WORLD_KERNEL.md / ONTOLOGY.md / hybrid `proposals/` / `audits/` markdown content for search and semantic indexing); the surgical fix here preserves that role while resolving the section_record taxonomy collision.
- A `narrative_section` MCP record_type at `list_records`. The operator-facing `section_record` taxonomy intentionally excludes narrative spans; if a future use case needs bulk enumeration of WORLD_KERNEL.md narrative spans, that's a separate retrieval-API enhancement (likely scoped via `get_records` or a new `domain_file_section` record_type rather than via `section_record`).
- `tools/world-mcp/src/tools/list-records.ts:382` SQL-level `file_path` predicate. The fix at the index parser layer makes this unnecessary; the query stays as `WHERE node_type = ?` because `"section"` now unambiguously means atomic SEC file.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-index && npm run build && node --test dist/tests/prose-domain-file.test.js dist/tests/atomic-source-input.test.js dist/tests/schema.test.js` passes, including the new test that WORLD_KERNEL.md H2 spans emit `narrative_section`, existing atomic-source coverage that atomic SEC YAML emits `section`, and the schema-version upgrade proof.
2. `cd tools/world-mcp && npm run build && node --test dist/tests/tools/list-records.test.js dist/tests/context-packet/locality-first.test.js` passes, including the new list-records fixture regression and context-packet seed-parent coverage for `narrative_section`.
3. Optional live-world smoke after rebuild/restart: `node tools/world-index/dist/src/cli.js sync erotica-world`, then `mcp__worldloom__list_records({world_slug:'erotica-world', record_type:'section_record'})` returns only atomic SEC rows and no WORLD_KERNEL.md rows. This is checkout-local operational smoke, not required package acceptance in this Codex run.

### Invariants

1. `record_type='section_record'` retrieval is structurally restricted to atomic SEC-*-NNN.yaml records by the world-index taxonomy itself, not by per-consumer filter discipline.
2. WORLD_KERNEL.md narrative-section spans remain searchable and retrievable via `get_record` and via context-packet seeding; the new `narrative_section` node_type is included in every consumer site whose intent was "any narrative span".
3. The schema-version bump from 4 to 5 triggers automatic re-index of stale world DBs on next `world-validate` / `world-index sync` invocation; no manual migration step is required.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/list-records.test.ts` — new case: `list_records(section_record)` on a fixture world with WORLD_KERNEL.md narrative content; assert response shape excludes narrative rows; assert no error response.
2. `tools/world-index/tests/prose-domain-file.test.ts` — new case: parsing `WORLD_KERNEL.md` returns a depth-2 `narrative_section` row; existing atomic-source coverage remains the `section` proof for SEC YAML records.
3. `tools/world-index/tests/schema.test.ts` — existing schema-version upgrade test proves the version bump triggers migration to the new `CURRENT_INDEX_VERSION`.

### Commands

1. `cd tools/world-index && npm run build && node --test dist/tests/prose-domain-file.test.js dist/tests/atomic-source-input.test.js dist/tests/schema.test.js`
2. `cd tools/world-mcp && npm run build && node --test dist/tests/tools/list-records.test.js dist/tests/context-packet/locality-first.test.js`
3. Optional checkout-local operational smoke after package proof: `node tools/world-index/dist/src/cli.js sync erotica-world`, then call `mcp__worldloom__list_records({world_slug:'erotica-world', record_type:'section_record'})` from a rebuilt/restarted MCP server session.

## Outcome

Completed: 2026-05-16.

Implemented the parser-level taxonomy split:

- `NODE_TYPES` now includes `narrative_section`, with `CURRENT_INDEX_VERSION = 5` and a no-op `005_narrative_section_node_type.sql` migration sentinel so version-gated indexes upgrade cleanly.
- `WORLD_KERNEL.md` depth-2 spans now emit `node_type: "narrative_section"` before the generic `depth === 2 -> "section"` fallback; bullet clusters, entity evidence, semantic attribution, context-packet seed-parent lookup, and ranking profiles preserve narrative-span behavior.
- `list_records(record_type='section_record')` still maps only to storage `node_type: "section"`, so it enumerates atomic SEC YAML records and excludes WORLD_KERNEL narrative spans.
- `tools/world-mcp/src/context-packet/governing-world-context.ts` was audited and left unchanged because its remaining `row.node_type === "section"` branches parse atomic SEC record bodies, not arbitrary narrative spans.
- Package docs and repo machine-facing docs now state that `section_record` is atomic SEC-only and WORLD_KERNEL H2 spans are retrieved by direct record id.

## Verification Result

Passed:

1. `cd tools/world-index && npm run build`
2. `cd tools/world-index && node --test dist/tests/prose-domain-file.test.js dist/tests/atomic-source-input.test.js dist/tests/schema.test.js`
3. `cd tools/world-index && npm test`
4. `cd tools/world-mcp && npm run build`
5. `cd tools/world-mcp && node --test dist/tests/tools/list-records.test.js dist/tests/context-packet/locality-first.test.js`
6. `node tools/world-index/dist/src/cli.js sync erotica-world`
7. `cd tools/world-mcp && npm test`

Focused proof added:

- `tools/world-index/tests/prose-domain-file.test.ts` proves WORLD_KERNEL H2 spans emit `narrative_section`.
- `tools/world-mcp/tests/tools/list-records.test.ts` proves `section_record` excludes a WORLD_KERNEL narrative row and returns the atomic SEC row.
- `tools/world-mcp/tests/context-packet/locality-first.test.ts` proves context-packet governing context still includes a WORLD_KERNEL narrative row.

## Deviations

- The drafted `tools/world-index/tests/parse/prose.test.ts` proof path did not exist; the implemented parser proof uses the live `tools/world-index/tests/prose-domain-file.test.ts` surface.
- The schema-version bump requires a contiguous migration file in this package, so a no-op `005_narrative_section_node_type.sql` migration sentinel was added as same-seam version-gate fallout.
- The first broad `tools/world-mcp` run failed with `index_version_mismatch` against the gitignored live `worlds/erotica-world/_index` artifact after the version bump. Refreshing that derived index with `node tools/world-index/dist/src/cli.js sync erotica-world` cleared the failure; no world source files were intentionally edited.
