# IDXMD-001: world-index emits `unexpected_yaml_section` on story-bundle direct-write manifests (e.g. storylet-batches/SLB-*.md)

**Status**: ✅ COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `tools/world-index/src/parse/yaml.ts` (parser scoping); optionally `.claude/skills/commitment-block-authoring/references/phase-1-coverage-diagnosis.md` + `references/phase-5-batch-manifest.md` (template alignment).
**Deps**: None

## Problem

`get_context_packet` for red-bunny surfaced an `open_risks` entry: `code: unexpected_yaml_section`, `severity: info`, `file_path: stories/red-bunny/storylet-batches/SLB-1.md`, message "YAML block is outside the canonical ledger sections (found under SLB-1: direct_batch batch > Coverage diagnosis (Phase 1) > Driver / source / composition specialization)."

`storylet-batches/SLB-*.md` is a **direct-write markdown manifest** (story-state-contract §10; `phase-5-batch-manifest.md` explicitly: "The SLB file is a markdown direct-write manifest, not an atomic YAML record"). It is not a canonical-ledger file and carries no `_source/` records. The warning is spurious: the world-index's YAML-fence scanner treats the manifest's embedded ` ```yaml ` block (a copy of the Phase-1 coverage-diagnosis output shape) as a misplaced canonical-ledger section.

Impact is cosmetic today (info-level, no functional failure), but it is noise on every packet load for any bundle whose SLB manifest embeds a YAML fence, and it can mask genuine `unexpected_yaml_section` findings on real ledger files.

## Assumption Reassessment (2026-05-29)

1. **Codebase**: `tools/world-index/src/parse/yaml.ts` `extractYamlNodes` (lines 25-57) iterates every YAML code fence in the parsed markdown and, when `findContainingSection` returns `"other"` and the file is not the named-entity registry (`isNamedEntityRegistryYaml`), pushes `unexpected_yaml_section` (line 43-57). There is no exemption for story-bundle direct-write manifest surfaces (`storylet-batches/`, `audits/`, `scene-prose-plans/`, `story-promotions/`).
2. **Specs/docs**: `.claude/skills/_shared-templates/story-state-contract.md` §10 lists `storylet-batches/` among direct-write surfaces. `.claude/skills/commitment-block-authoring/references/phase-5-batch-manifest.md` defines the manifest as markdown, not a ledger record, and its template uses tables (no YAML fence). `references/phase-1-coverage-diagnosis.md` (lines 43-64) shows the coverage diagnosis as a ` ```yaml ` block; SLB-1's author embedded that block into the manifest, which is what trips the scanner. (SLB-2, authored this run, deliberately used inline prose to avoid it — confirming the skill-side mitigation works.)
3. **Shared boundary under audit**: the world-index markdown parser (`parse/yaml.ts` canonical-ledger YAML-section scan, intended for world-canon ledger files like CANON_LEDGER / named-entity registry) vs. story-bundle direct-write manifests. The scanner is being applied to a surface outside its intended ledger scope.
4. **FOUNDATIONS principle**: Canonical Storage Layer / write-boundary discipline — `_source/` atomic records and world-canon ledgers are the schema-governed surfaces; story-bundle manifests are free-form direct-write artifacts. The canonical-ledger YAML-section check should run against ledger surfaces, not narrative manifests.
8. **Adjacent contradiction (future cleanup)**: other direct-write manifest surfaces (`audits/`, `scene-prose-plans/`) could embed YAML fences and trip the same path; the scoping fix should cover the manifest surface class, not just SLB files.

## Architecture Check

1. Cleaner: scope the canonical-ledger YAML-section scan to the surfaces it is meant for (world-canon ledger files), rather than emitting info-noise for every narrative manifest and relying on each skill to avoid YAML fences. Removes a whole class of false positives at the source.
2. No backwards-compatibility shim: this narrows an over-broad scan; the named-entity-registry exemption pattern at line 43 already establishes the precedent for surface-scoped exemptions.

## Verification Layers

1. Manifest YAML fence no longer flagged -> skill dry-run (`get_context_packet` for a bundle whose SLB manifest contains a ` ```yaml ` block returns no `unexpected_yaml_section` open_risk for that manifest).
2. Genuine ledger misplacement still flagged -> codebase grep-proof / unit test (a misplaced YAML fence in a world-canon ledger file still emits `unexpected_yaml_section`).
3. Surface-scope correctness -> FOUNDATIONS alignment check (ledger scan applies to canonical ledger surfaces; direct-write manifests per story-state-contract §10 are exempt).

## What to Change

### 1. Scope the canonical-ledger YAML-section scan (primary)

In `tools/world-index/src/parse/yaml.ts`, restrict the `unexpected_yaml_section` emission to canonical-ledger surfaces (or add a `storylet-batches/`, `audits/`, `scene-prose-plans/`, `story-promotions/` direct-write-manifest exemption analogous to `isNamedEntityRegistryYaml`). Parsing/anchor behavior for those files is otherwise unchanged.

### 2. Skill template alignment (secondary / interim)

Note in `phase-5-batch-manifest.md` that the manifest is prose+tables and should not embed a ` ```yaml ` fence for the Phase-1 diagnosis (use inline prose, as SLB-2 does); clarify in `phase-1-coverage-diagnosis.md` that the YAML output shape is working-memory diagnosis, not verbatim manifest content. (Already applied in SLB-2; this just documents it.)

## Files to Touch

- `tools/world-index/src/parse/yaml.ts` (modify)
- `tools/world-index/src/parse/yaml.test.ts` (modify — manifest-surface exemption test)
- `.claude/skills/commitment-block-authoring/references/phase-5-batch-manifest.md` (modify — optional)
- `.claude/skills/commitment-block-authoring/references/phase-1-coverage-diagnosis.md` (modify — optional)

## Out of Scope

- Re-writing SLB-1.md's embedded YAML block (historical artifact; the parser scoping fix retires the warning without touching it).
- Any change to canonical-ledger or named-entity parsing semantics.

## Acceptance Criteria

### Tests That Must Pass

1. Unit test: a markdown file under a story-bundle direct-write manifest surface containing a ` ```yaml ` fence yields no `unexpected_yaml_section` parse issue.
2. Unit test: a YAML fence misplaced in a world-canon ledger file still yields `unexpected_yaml_section`.
3. `get_context_packet(task_type='commitment_block_authoring', world_slug='erotica-world', story_slug='red-bunny', seed_nodes=['M-3'])` returns no `unexpected_yaml_section` open_risk for `stories/red-bunny/storylet-batches/SLB-1.md`.

### Invariants

1. The canonical-ledger YAML-section scan runs only on canonical-ledger / registry surfaces, never on story-bundle direct-write manifests.

## Test Plan

### New/Modified Tests

1. `tools/world-index/src/parse/yaml.test.ts` — manifest-surface exemption + retained ledger-file detection (rationale: locks the surface-scope boundary so the fix neither over- nor under-suppresses).

### Commands

1. `npm --prefix tools/world-index test`
2. After rebuild + reindex: re-run the red-bunny `get_context_packet` and `jq '.task_header // .. | objects | select(.code=="unexpected_yaml_section")'` over the response → expect none for SLB manifests.


## Outcome

**Completed**: 2026-05-29

### What changed

- `tools/world-index/src/parse/yaml.ts`: added `isDirectWriteManifestYaml(filePath)` (regex `DIRECT_WRITE_MANIFEST_SURFACE_REGEX` matching path segments `storylet-batches` / `audits` / `scene-prose-plans` / `story-promotions`), analogous to the existing `isNamedEntityRegistryYaml` surface-scoped exemption. Extended the `unexpected_yaml_section` emission guard so the canonical-ledger YAML-section scan no longer fires on story-bundle direct-write manifest surfaces. Parsing/anchor behavior for those files is otherwise unchanged.
- `tools/world-index/tests/yaml.test.ts`: added (1) a `storylet-batches/SLB-1.md` manifest-with-yaml-fence exemption test, (2) a parameterized exemption test for `audits/` / `scene-prose-plans/` / `story-promotions/`, and (3) a retained-detection test proving a misplaced fence in a world-canon ledger file still emits `unexpected_yaml_section`.
- `.claude/skills/commitment-block-authoring/references/phase-5-batch-manifest.md` and `references/phase-1-coverage-diagnosis.md` (secondary/optional): documented that the SLB manifest is prose+tables (no embedded YAML fence) and that the Phase-1 `coverage_diagnosis` YAML shape is working-memory diagnosis, not verbatim manifest content.

### Deviations

- Chose the surface-scoped exemption approach (offered as the alternative in the ticket) over rewriting the scan to a positive canonical-ledger allowlist, because it reuses the established `isNamedEntityRegistryYaml` precedent, is minimal, and carries no risk of under-suppressing genuine ledger detection (proven by the retained-detection test).

### Verification

- `npm --prefix tools/world-index run build` (tsc typecheck) — clean.
- `node --test dist/tests/yaml.test.js` — 12/12 pass (8 prior + new manifest-exemption + retained-detection). Full world-index suite: 148/148 pass.
- Live `get_context_packet` for red-bunny still reports the `unexpected_yaml_section` open_risk for `stories/red-bunny/storylet-batches/SLB-1.md` only because the connected MCP server process predates the rebuild and does not reload `dist/` (nor reindex) mid-session; the rebuilt parser no longer emits it (unit-test-proven) and the warning will clear on the next index build + server restart.
