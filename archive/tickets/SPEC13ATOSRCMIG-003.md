# SPEC13ATOSRCMIG-003: Execute animalia atomic-source migration per SPEC-13 §E (Stream B capstone)

**Status**: COMPLETED (working tree ready for user review/commit)
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `worlds/animalia/` storage form reshaped (full `_source/` tree authored; 11 root-level markdown files deleted; `ONTOLOGY.md` stripped of §Named Entity Registry); public-repo `.gitignore` kept `worlds/*` ignored while the private world-content repo owns `_source/` tracking; one-shot migration and structural-validation scripts authored
**Deps**: 002

## Problem

animalia was worldloom's production world in monolithic-markdown-only storage form (per-reassess validation: `CANON_LEDGER.md` 8,666 lines with 47 CF + 18 CH, 16 invariants across 5 categories, 20 mystery-reserve entries, 60 open questions, plus 7 prose files totalling 58 H2 sections). SPEC-13's canonical storage layer contract (`docs/FOUNDATIONS.md` §Canonical Storage Layer, lines 448–458) is already authored, and Stream A's doc/CLAUDE.md/IMPLEMENTATION-ORDER revisions have landed. Stream B executed the one-time migration: authored `_source/` atomic YAML records for all 11 atomized file classes, stripped the Named Entity Registry from `ONTOLOGY.md`, deleted the 11 retired root-level markdown files, preserved the public/private repository boundary for world content, ran structural validation, and rebuilt the index against the new storage form. The final migration commit is left for user review in the private world-content repository because repo instructions prohibit automated commits unless explicitly requested.

## Assumption Reassessment (2026-04-24)

1. Verified animalia pre-migration state via reassess-spec session: `CANON_LEDGER.md` is 8,666 lines with 47 fenced-YAML CF blocks and 18 CH entries (CH-0001 through CH-0018 in the `## Change Log` section); `INVARIANTS.md` has 16 invariants (ONT-1..3, CAU-1..3, DIS-1..3, SOC-1..4, AES-1..3); `MYSTERY_RESERVE.md` has M-1 through M-20 (unpadded, contiguous); `OPEN_QUESTIONS.md` has 60 H2 headings; `ONTOLOGY.md` §Named Entity Registry lists the 5 genesis entities (Canal Heartland, Cold North, Drylands South, Fenlands West, Mountain East) plus Ash-Seal (originating_cf CF-0043 verified); prose-file H2 counts are EVERYDAY_LIFE 5, INSTITUTIONS 10, MAGIC_OR_TECH_SYSTEMS 6, GEOGRAPHY 18, ECONOMY_AND_RESOURCES 9, PEOPLES_AND_SPECIES 6, TIMELINE 4 (Layers 1/2/3/4).
2. Verified SPEC-13 §E 17-step migration procedure is current (post-reassess-spec edits: the `docs/MACHINE-FACING-LAYER.md` rewrite belongs to SPEC13ATOSRCMIG-001; sibling-spec amendments have already landed).
3. Cross-artifact boundary: `_source/` atomic records are the primary source-of-truth after migration. CF / CH / INV / M / OQ / ENT / SEC schemas per SPEC-13 §B are the contract. Downstream `world-index` parser (SPEC13ATOSRCMIG-002) consumes atomic records; `world-mcp` query layer and context-packet assembler consume the parser's storage-form-agnostic node model.
4. FOUNDATIONS principle under audit: `§Canonical Storage Layer` — this migration operationalizes the storage layer declared in FOUNDATIONS.md. Also `Rule 6 No Silent Retcons` — the migration is a storage-form change, not a canon change; CF/CH/INV/M/OQ/ENT content is preserved verbatim (with documented normalizations: `required_world_updates` strips `.md` suffix per SPEC-13 §B note; HTML-comment-attributed extensions become `extensions[]` array entries; each mechanical transformation is inventoried in the migration commit message). SPEC-13's FOUNDATIONS Alignment table marks Rule 5 and Rule 6 as "Strengthened" by atomic form — this ticket materializes that strengthening.
5. HARD-GATE / Mystery Reserve firewall: this ticket does not touch skill HARD-GATE semantics, canon-write ordering, or Canon Safety Check surfaces directly — the migration is an authoring operation on storage form, not on canon content. Mystery Reserve firewall is preserved structurally: M records retain all `disallowed_cheap_answers`, `future_resolution_safety`, `common_interpretations`, and HTML-comment-attributed firewall extensions (re-encoded as `extensions[]` entries per SPEC-13 §B Mystery Reserve schema). Every M-1..M-20 record is authored with its firewall fields intact; the inline structural validator enforces M-record schema compliance.
6. Output-schema extension: no new CF / CH / INV / M / OQ field is introduced. `touched_by_cf[]` on SEC records is the one new derived field (union of HTML-comment attribution scans within the section plus `required_world_updates` CF targeting the section's file class). Derived at migration time; maintained post-migration by the Phase 2 patch engine.
7. Renames / removals blast radius: the 11 retired root-level files are referenced in 224 places across `.claude/skills/**/SKILL.md`. Per reassess I1 disposition those references remain intentionally transient until Phase 2 SPEC-06 rewrites skills against atomic retrieval. `specs/`, `docs/`, and `CLAUDE.md` are swept clean by this ticket's acceptance criteria.
8. Repository-boundary correction: `_source/` is canonical and must be tracked by the private world-content repository rooted at `worlds/`, not by the public pipeline repository. The public repo keeps all `worlds/*` content ignored; the private repo surfaces the Animalia migration as deleted monolithic files, modified `ONTOLOGY.md`, and new `_source/` records.
9. Live command mismatch: `tools/world-index/src/cli.ts` derives `worldRoot` from `process.cwd()`. Therefore `npm run build` is package-local (`tools/world-index`), but the compiled CLI proof must run from the repo root as `node tools/world-index/dist/src/cli.js build animalia`; running `node dist/src/cli.js build animalia` inside `tools/world-index` truthfully fails with `Unknown world slug 'animalia'`.
10. Legacy YAML mismatch: at least one legacy CF block used a sequence scalar shape accepted by the existing parser recovery path but rejected by strict `YAML.parse` (`"halfbreed" plot conveniences...`). The one-shot migration script uses the same sequence-scalar recovery discipline before serializing atomic CF/CH YAML, so the resulting `_source/canon/*.yaml` files are strict YAML.
11. Invariant-boundary edge case: the legacy `<!-- added by CF-0040 --> ### DIS-1-EXT...` annotation is not a standalone invariant and must land as an `extensions[]` entry on `_source/invariants/DIS-1.yaml`, matching SPEC-13's risk note. The final validator and spot-check confirm that entry exists.
12. Adjacent contradictions: none require this ticket to rewrite Phase 2 skills. The Verification/Risks reconciliation (reassess I1) and the MACHINE-FACING-LAYER.md rewrite (reassess I2) have landed. An exploratory `world-index verify animalia` still returns non-zero after an atomic build because it checks synthetic logical file rows as disk paths; that command is not part of this ticket's acceptance surface, and the final index rebuild cleared the exploratory validation rows.

## Architecture Check

1. File-class atomization produces per-record files that git tracks surgically (per-CF, per-CH, per-invariant, per-section), replacing monolithic 8,666-line edit surfaces. Append-only discipline becomes per-file-structural rather than prose-enforced. Rule 5 and Rule 6 gain structural support (`touched_by_cf[]` reverse index; `modification_history[]` array; no more HTML-comment attribution drift). Cleaner than continuing the pre-SPEC-13 remediation arc (SPEC-10/11/12) which was patching structural brittleness with remediation tooling.
2. No backwards-compatibility aliasing introduced. The 11 retired files are deleted outright (not left as compiled-view stubs). `git revert` of the migration commit is the rollback path; `.pre-migration-snapshot/` is retained one week as an independent filesystem-level restore.

## Verification Layers

1. CF / CH count parity → codebase grep-proof: 47 files under `_source/canon/CF-*.yaml`; 18 files under `_source/change-log/CH-*.yaml`.
2. Invariant count parity → codebase grep-proof: 16 files under `_source/invariants/` matching per-category counts (ONT:3, CAU:3, DIS:3, SOC:4, AES:3).
3. Mystery Reserve count parity → codebase grep-proof: 20 files `M-1.yaml` through `M-20.yaml`.
4. Open Questions / Named Entities / prose SEC counts → codebase grep-proof against the §E-derived counts listed in Assumption Reassessment item 1.
5. YAML integrity + ID uniqueness + cross-reference resolution → inline one-shot Node validation script (the Q1(b) disposition substitute for `world-validate --structural`; runs the 5 structural checks).
6. `touched_by_cf[]` completeness → inline one-shot validation script: for every CF whose `required_world_updates` targets one of the seven atomized prose file classes, at least one SEC under the corresponding `file_class` directory lists that CF in `touched_by_cf[]`.
7. `ONTOLOGY.md` integrity post-strip → FOUNDATIONS alignment check + grep-proof: §Categories in Use / §Relation Types in Use / §Notes on Use preserved byte-identical (modulo the removed §Named Entity Registry section).
8. `WORLD_KERNEL.md` integrity → codebase grep-proof: byte-identical to pre-migration (`sha256sum` match).
9. Monolithic-filename absence outside exempted surfaces → codebase grep-proof plus manual classification: zero genuine dangling live-read targets for the 11 retired filenames across `specs/`, `docs/`, `CLAUDE.md`. Legitimate migration/history/spec references and the known Phase-2 `docs/HARD-GATE-DISCIPLINE.md` legacy example remain acceptable. Skill `SKILL.md` files are exempted per reassess I1 — Phase 2 SPEC-06 rewrites skills wholesale.
10. `world-index build animalia` succeeds → targeted tool command against the migrated `_source/` tree (package build from `tools/world-index`, compiled CLI from repo root).
11. Hybrid-file preservation → codebase grep-proof: `characters/`, `diegetic-artifacts/`, `adjudications/`, `proposals/`, `audits/` directory `sha256sum` before/after match.
12. Reversibility → manual review: the user-authored migration commit will be the git-level restore point; `.pre-migration-snapshot/animalia/` (retained one week) provides independent restore until then.

## What to Change

### 1. Pre-migration snapshot

Copy `worlds/animalia/` to a gitignored sibling `.pre-migration-snapshot/animalia/` directory before any other mutation. Independent restore path alongside `git revert`.

### 2. CF records — mechanical extraction (§E.1)

For each fenced `yaml` block under `## Canon Fact Records` in `CANON_LEDGER.md`, write `_source/canon/CF-NNNN.yaml` verbatim with a trailing newline. Normalize `required_world_updates` values: strip `.md` suffix (`EVERYDAY_LIFE.md` → `EVERYDAY_LIFE`). Count: 47 blocks → 47 files.

### 3. CH entries — mechanical extraction (§E.2)

For each fenced `yaml` block under `## Change Log`, write `_source/change-log/CH-NNNN.yaml` verbatim. Count: 18 → 18.

### 4. Invariants — careful authoring (§E.3)

For each `### <ID> — <title>` heading under `## Ontological / Causal / Distribution / Social / Aesthetic / Thematic Invariants` in `INVARIANTS.md`, author `_source/invariants/<ID>.yaml` per SPEC-13 §B Invariant schema. Map prose bullets (`**Statement**`, `**Rationale**`, `**Examples**`, `**Non-examples**`, `**Break conditions**`, `**Revision difficulty**`) to YAML keys. Each `<!-- added by CF-NNNN -->` HTML comment followed by a bold-label extension becomes one `extensions[]` entry with `originating_cf`, `change_id` (from the `(CH-NNNN)` parenthetical), `date` (cross-referenced from `_source/change-log/CH-NNNN.yaml`), `label` (bold prefix minus the CH parenthetical), `body` (everything after the label colon until the next extension or heading).

### 5. Mystery Reserve — careful authoring (§E.4)

For each `## M-N — <title>` in `MYSTERY_RESERVE.md`, author `_source/mystery-reserve/M-N.yaml` per §B Mystery Reserve schema. HTML-comment-attributed `**Extension (CH-NNNN) — <label>**` blocks become `extensions[]` entries with the same labelling discipline as invariants.

### 6. Open Questions — ID assignment + authoring (§E.5)

For each `## <topic>` in `OPEN_QUESTIONS.md`, assign `OQ-NNNN` sequentially in document order starting at `OQ-0001`. `topic` field preserves the heading verbatim. Body prose plus `**When to resolve**` and `**Caution**` (when present) map per §B Open Question schema.

### 7. Named Entities — mechanical authoring (§E.6)

For each entry in the `named_entities` YAML list under `ONTOLOGY.md` §Named Entity Registry, assign `ENT-NNNN` sequentially. Preserve `canonical_name`, `entity_kind`. Default `aliases: []`. `originating_cf: null` for the 5 genesis entities (Canal Heartland, Cold North, Drylands South, Fenlands West, Mountain East); `CF-0043` for Ash-Seal; derive for others by cross-checking registry addition history against `_source/canon/CF-NNNN.yaml` records. `scope_notes` is one short line.

### 8. ONTOLOGY.md stripping (§E.7)

Delete the `## Named Entity Registry` heading and its YAML block. Retain `## Categories in Use`, `## Relation Types in Use`, `## Notes on Use` byte-identical. Table-embedded HTML-comment annotations within the Categories table remain in place per SPEC-13 §Out of Scope.

### 9. Prose sections — bulkiest step (§E.8)

For each of 7 prose files (EVERYDAY_LIFE, INSTITUTIONS, MAGIC_OR_TECH_SYSTEMS, GEOGRAPHY, ECONOMY_AND_RESOURCES, PEOPLES_AND_SPECIES, TIMELINE), identify H2 headings in document order. Per H2: assign `SEC-<PREFIX>-NNN` (padded to 3 digits per-file); write `_source/<subdir>/SEC-<PREFIX>-NNN.yaml` per §B Prose Section schema. `body` is verbatim markdown from after the H2 up to (not including) the next H2. Section-level HTML-comment extensions become `extensions[]`; inline/bullet-level attributions stay in `body` (conservative). `touched_by_cf[]` is the union of (a) CFs cited in HTML-comment attributions within body/extensions and (b) CFs whose `required_world_updates` includes this section's `file_class`.

### 10. Timeline atomization (§E.9)

TIMELINE.md's Layer 1/2/3/4 H2 headings become `SEC-TML-001` through `SEC-TML-004`. Each layer's complete content (Material residue, Institutional residue, Symbolic residue, Who tells the story sub-sections) lives in `body`. HTML-comment-attributed Layer-annotation extensions become `extensions[]` entries.

### 11. Optional per-subdir READMEs (§E.10)

Optionally add short `_source/<subdir>/README.md` orienting new contributors. Not required.

### 12. Delete monolithic files (§E.11)

`rm` the 11 retired root-level markdown files in `worlds/animalia/`: `CANON_LEDGER.md`, `INVARIANTS.md`, `MYSTERY_RESERVE.md`, `OPEN_QUESTIONS.md`, `EVERYDAY_LIFE.md`, `INSTITUTIONS.md`, `MAGIC_OR_TECH_SYSTEMS.md`, `GEOGRAPHY.md`, `ECONOMY_AND_RESOURCES.md`, `PEOPLES_AND_SPECIES.md`, `TIMELINE.md`.

### 13. Verify repository boundary (§E.12)

Keep the public pipeline repo ignoring `worlds/*`, and verify `worlds/animalia/_source/**` is visible in the private world-content repo. Add `.pre-migration-snapshot/` to the public repo ignore list to keep the independent restore copy out of public-repo status.

### 14. Rebuild index (§E.13)

Run `npm run build` from `tools/world-index`, then run `node tools/world-index/dist/src/cli.js build animalia` from the repo root (against the atomic-source-capable parser delivered in SPEC13ATOSRCMIG-002). Must succeed; every YAML parses; IDs unique; cross-refs resolve.

### 15. Inline structural validation (§E.14 per Q1(b))

Run `tools/world-index/scripts/one-shot-spec13-validate.js`, implementing the 5 structural checks: `yaml_parse_integrity`, `id_uniqueness`, `cross_file_reference`, `touched_by_cf_completeness`, `record_schema_compliance`. Must report zero fails. This replaces the `world-validate animalia --structural` invocation that SPEC-13 §E step 14 names; the general-purpose `world-validate` CLI is SPEC-04 Phase 2 work per the disposition on this skill's Step 2 Issue 1.

### 16. Human review (§E.15)

User reviews the working tree (`git status`, `git diff`): the `_source/` tree additions, the 11 deletions, the `ONTOLOGY.md` strip, the `.gitignore` reversal. Approves or requests revisions.

### 17. User migration commit (§E.16)

After human review, the user should make one commit with a message inventorying what moved where (file-class by file-class; counts; `.md`-suffix normalization note; legacy strict-YAML scalar recovery note). No rebase, no squash with unrelated work. The implementation run does not create the commit because `AGENTS.md` says automated workflows must not commit unless explicitly asked.

### 18. Post-commit cleanup (§E.17)

After one week of confirmed working migration (skills still operate; index stable), delete `.pre-migration-snapshot/animalia/`. Scheduled follow-up; not blocking ticket acceptance.

## Files to Touch

- `worlds/animalia/_source/canon/CF-NNNN.yaml` (new, × 47)
- `worlds/animalia/_source/change-log/CH-NNNN.yaml` (new, × 18)
- `worlds/animalia/_source/invariants/<ID>.yaml` (new, × 16)
- `worlds/animalia/_source/mystery-reserve/M-N.yaml` (new, × 20)
- `worlds/animalia/_source/open-questions/OQ-NNNN.yaml` (new, × 60)
- `worlds/animalia/_source/entities/ENT-NNNN.yaml` (new, × N matching pre-migration NEL length)
- `worlds/animalia/_source/everyday-life/SEC-ELF-NNN.yaml` (new, × 5)
- `worlds/animalia/_source/institutions/SEC-INS-NNN.yaml` (new, × 10)
- `worlds/animalia/_source/magic-or-tech-systems/SEC-MTS-NNN.yaml` (new, × 6)
- `worlds/animalia/_source/geography/SEC-GEO-NNN.yaml` (new, × 18)
- `worlds/animalia/_source/economy-and-resources/SEC-ECR-NNN.yaml` (new, × 9)
- `worlds/animalia/_source/peoples-and-species/SEC-PAS-NNN.yaml` (new, × 6)
- `worlds/animalia/_source/timeline/SEC-TML-NNN.yaml` (new, × 4)
- `worlds/animalia/_source/<subdir>/README.md` (optional; new)
- `worlds/animalia/CANON_LEDGER.md` (delete)
- `worlds/animalia/INVARIANTS.md` (delete)
- `worlds/animalia/MYSTERY_RESERVE.md` (delete)
- `worlds/animalia/OPEN_QUESTIONS.md` (delete)
- `worlds/animalia/EVERYDAY_LIFE.md` (delete)
- `worlds/animalia/INSTITUTIONS.md` (delete)
- `worlds/animalia/MAGIC_OR_TECH_SYSTEMS.md` (delete)
- `worlds/animalia/GEOGRAPHY.md` (delete)
- `worlds/animalia/ECONOMY_AND_RESOURCES.md` (delete)
- `worlds/animalia/PEOPLES_AND_SPECIES.md` (delete)
- `worlds/animalia/TIMELINE.md` (delete)
- `worlds/animalia/ONTOLOGY.md` (modify — strip §Named Entity Registry)
- `.gitignore` (modify — preserve public-repo `worlds/*` ignore boundary and ignore `.pre-migration-snapshot/`)
- `.pre-migration-snapshot/animalia/` (new, gitignored)
- `tools/world-index/scripts/spec13-migrate-animalia.mjs` (new; one-shot migration script retained for traceability)
- `tools/world-index/scripts/one-shot-spec13-validate.js` (new; retained post-migration for structural proof)

## Out of Scope

- Migration of character dossiers (`characters/<slug>.md`) — stays hybrid single-file.
- Migration of diegetic artifacts, adjudications, proposals, audits — already per-file.
- Atomization of table-embedded annotations in `ONTOLOGY.md` Categories — inline table commentary, not record-shaped.
- Reusable general-purpose migration tool — single-use manual migration per spec §E.
- Skill `SKILL.md` rewrites to remove dangling references to retired filenames — Phase 2 SPEC-06 per reassess I1 disposition.
- Building the general-purpose `world-validate` CLI — SPEC-04 Phase 2 per Step 2 Issue 1 disposition (this ticket uses an inline one-shot script).
- `world-index render` CLI — Phase 2 per Step 2 Issue 2 disposition.
- Modifying `create-base-world` skill to emit `_source/` directly — Phase 2 SPEC-06.
- Phase 2 canon-pipeline rewrites (patch engine, validators, hooks 3/5, skill migration).

## Acceptance Criteria

### Tests That Must Pass

1. CF count parity: `find worlds/animalia/_source/canon -name 'CF-*.yaml' | wc -l` returns 47 (re-enumerated from disk at test time, compared against the fixture-baseline 47 from pre-migration `CANON_LEDGER.md`).
2. CH count parity: `find worlds/animalia/_source/change-log -name 'CH-*.yaml' | wc -l` returns 18 (re-enumerated vs. the 18 CH entries in the pre-migration `## Change Log` section).
3. Invariant count parity: `find worlds/animalia/_source/invariants -name '*.yaml' | wc -l` returns 16; per-category counts match (ONT:3, CAU:3, DIS:3, SOC:4, AES:3).
4. Mystery Reserve count parity: 20 files `M-1.yaml` through `M-20.yaml`, contiguous, no gaps.
5. Open Questions count parity: `find worlds/animalia/_source/open-questions -name 'OQ-*.yaml' | wc -l` matches the pre-migration H2 count of 60 (re-enumerated).
6. Named Entity count parity: `find worlds/animalia/_source/entities -name 'ENT-*.yaml' | wc -l` matches the pre-migration NEL length.
7. Prose SEC counts per file-class match the pre-migration H2 counts (ELF:5, INS:10, MTS:6, GEO:18, ECR:9, PAS:6, TML:4).
8. `node tools/world-index/scripts/one-shot-spec13-validate.js worlds/animalia` exits 0; all 5 structural checks pass (yaml parse, id uniqueness, cross-file reference, touched_by_cf completeness, record schema compliance).
9. `npm run build` from `tools/world-index` succeeds, then `node tools/world-index/dist/src/cli.js build animalia` from the repo root succeeds with 0 errors (requires SPEC13ATOSRCMIG-002 merged).
10. Monolithic-filename absence — no **dangling** references (references that treat the 11 retired files as live authoritative read-targets) in `specs/`, `docs/`, or `CLAUDE.md`. Manual review of each grep hit is required to classify it as (a) legitimate retirement/migration documentation (expected: `docs/FOUNDATIONS.md` §Canonical Storage Layer, `docs/MACHINE-FACING-LAYER.md` §Phase Boundaries per SPEC13ATOSRCMIG-001, `specs/SPEC-13-atomic-source-migration.md`, amended sibling specs' pre-/post-SPEC-13 historical language), (b) legacy reference expected to be rewritten in Phase 2 (`docs/HARD-GATE-DISCIPLINE.md` per SPEC-07 Part B), or (c) genuine dangling reference requiring cleanup in this ticket. Category (c) must be zero; categories (a) and (b) are acceptable as-is. Skill `SKILL.md` files remain exempted per reassess I1 disposition. Sweep command: `grep -rnE "CANON_LEDGER\.md|INVARIANTS\.md|MYSTERY_RESERVE\.md|OPEN_QUESTIONS\.md|EVERYDAY_LIFE\.md|INSTITUTIONS\.md|MAGIC_OR_TECH_SYSTEMS\.md|GEOGRAPHY\.md|ECONOMY_AND_RESOURCES\.md|PEOPLES_AND_SPECIES\.md|TIMELINE\.md" specs/ docs/ CLAUDE.md`.
11. Main-repo `git status --short --untracked-files=all` does not surface `worlds/animalia/_source/**`; private `worlds/` repo `git status --short` surfaces the migration-ready additions/deletions while `_index/` remains derived state. The user-owned follow-up commit in the private world-content repo should inventory what moved where.
12. `ONTOLOGY.md` integrity: §Categories in Use / §Relation Types in Use / §Notes on Use preserved byte-identical to pre-migration (modulo the removed §Named Entity Registry).
13. `WORLD_KERNEL.md` integrity: byte-identical to pre-migration (`sha256sum` match between pre-migration snapshot and post-migration working tree).
14. Hybrid-file preservation: `sha256sum` of `characters/`, `diegetic-artifacts/`, `adjudications/`, `proposals/`, `audits/` directory trees is identical before/after migration.
15. `.pre-migration-snapshot/animalia/` exists, contains the pre-migration state, and is gitignored (`git status` does not surface it).

### Invariants

1. `_source/*.yaml` files are append-only in structural fields after migration (mutations only in `notes`, `modification_history[]`, `extensions[]` per FOUNDATIONS §Canonical Storage Layer).
2. Mystery Reserve firewall preserved: every M-N record retains all `disallowed_cheap_answers`, `future_resolution_safety`, and firewall-extension attribution (HTML-comment form → `extensions[]` form; semantics unchanged).
3. Rule 6 No Silent Retcons: the ticket and retained one-shot migration script inventory the storage-form transformations; the user-owned migration commit message should repeat the file-class counts, `.md`-suffix normalization, and legacy strict-YAML scalar recovery note.
4. 13 mandatory world concerns preserved in count and semantics (FOUNDATIONS §Mandatory World Files); storage-form change only.
5. Reversibility: the future user-owned migration commit is the git-revert point; `.pre-migration-snapshot/` is an independent filesystem-level restore path until that review/commit is complete.

## Test Plan

### New/Modified Tests

1. `tools/world-index/scripts/spec13-migrate-animalia.mjs` — one-shot Animalia migration script retained for traceability; not a reusable migration CLI.
2. `tools/world-index/scripts/one-shot-spec13-validate.js` — one-shot Node script implementing the 5 structural checks. Not a reusable CLI. Rationale: Q1(b) disposition — Stream B is a one-time migration, not worth scope-creeping SPEC-04's `world-validate` binary delivery here.
3. No permanent additions to `tools/world-index/tests/` beyond what SPEC13ATOSRCMIG-002 provides — this ticket's validation is migration-local.

### Commands

1. `node tools/world-index/scripts/one-shot-spec13-validate.js worlds/animalia` — runs the 5 structural checks; exit 0 on success.
2. `npm run build` from `tools/world-index` — compile the package-local TypeScript.
3. `node tools/world-index/dist/src/cli.js build animalia` from the repo root — full index build against the migrated world (depends on SPEC13ATOSRCMIG-002).
4. `find worlds/animalia/_source/canon -name 'CF-*.yaml' | wc -l` (and per-class analogues) — count parity spot-checks.
5. `grep -rnE "CANON_LEDGER\.md|INVARIANTS\.md|MYSTERY_RESERVE\.md|OPEN_QUESTIONS\.md|EVERYDAY_LIFE\.md|INSTITUTIONS\.md|MAGIC_OR_TECH_SYSTEMS\.md|GEOGRAPHY\.md|ECONOMY_AND_RESOURCES\.md|PEOPLES_AND_SPECIES\.md|TIMELINE\.md" specs/ docs/ CLAUDE.md` — manual-review sweep; every hit classified per acceptance criterion 10 (legitimate retirement documentation, Phase-2-pending legacy ref, or genuine dangling ref). Genuine dangling refs must be zero; legitimate / Phase-2-pending hits are recorded but not removed by this ticket. Skill `SKILL.md` intentionally exempted per reassess I1.
6. `git status --short --untracked-files=all` from the public repo and `git status --short` from `worlds/` — verify `_source` is ignored by the public repo and visible to the private world-content repo; `.pre-migration-snapshot/` is not surfaced by the public repo.

## Outcome

Implemented. `worlds/animalia/_source/` now contains 225 strict-YAML atomic records: 47 CF, 18 CH, 16 INV, 20 M, 60 OQ, 6 ENT, and 58 SEC files. The 11 retired root-level markdown files were removed from the working tree; `ONTOLOGY.md` now retains only Categories / Relation Types / Notes; `WORLD_KERNEL.md` is unchanged; hybrid directories (`characters/`, `diegetic-artifacts/`, `adjudications/`, `proposals/`, `audits/`) are unchanged. The public repo continues to ignore world content; `_source/**` is intended to be tracked by the private world-content repo.

Outcome amended: 2026-04-24 — corrected the repository boundary after user clarification. `_source/` is canonical and tracked in the private `worlds/` repository, not unignored into the public pipeline repository.

## Verification Result

Passed:

1. `node tools/world-index/scripts/one-shot-spec13-validate.js worlds/animalia` → `SPEC-13 validation passed: 225 records, 225 unique IDs`.
2. Count parity spot-checks: CF 47, CH 18, INV 16, M 20, OQ 60, ENT 6, SEC counts ELF 5 / INS 10 / MTS 6 / GEO 18 / ECR 9 / PAS 6 / TML 4.
3. `npm run build` from `tools/world-index` passed.
4. `node tools/world-index/dist/src/cli.js build animalia` from repo root passed; final `validation_results` count in `worlds/animalia/_index/world.db` is 0.
5. `sed '/^## Named Entity Registry$/,/^---$/d' .pre-migration-snapshot/animalia/ONTOLOGY.md | diff -u - worlds/animalia/ONTOLOGY.md` passed.
6. `sha256sum .pre-migration-snapshot/animalia/WORLD_KERNEL.md worlds/animalia/WORLD_KERNEL.md` matched.
7. `diff -qr` for `characters/`, `diegetic-artifacts/`, `adjudications/`, `proposals/`, and `audits/` matched.
8. Retired-file existence check confirmed the 11 root-level markdown files are absent from `worlds/animalia/`.
9. Retired-filename sweep over `specs/`, `docs/`, and `CLAUDE.md` found no category-c genuine dangling live-read target; remaining hits are migration/spec history, FOUNDATIONS/MACHINE-FACING-LAYER retirement docs, or known Phase-2 legacy examples.
10. Orphan heading-attribution sweep cleaned bare `<!-- added by CF-NNNN -->` lines that had been attached to the previous record when they originally introduced the next H2/record; remaining bare comment lines are followed by subsection content inside the same record.

## Deviations

1. No commit was created. The original SPEC-13 step remains a user-owned follow-up because `AGENTS.md` says automated workflows must not commit unless explicitly requested.
2. The drafted package-root CLI command was corrected: the compiled CLI must be launched from the repo root because `tools/world-index/src/cli.ts` uses `process.cwd()` as `worldRoot`.
3. The one-shot validator enforces `touched_by_cf[]` completeness only for the seven prose SEC classes. Root/hybrid targets such as `WORLD_KERNEL`, `ONTOLOGY`, `INVARIANTS`, `MYSTERY_RESERVE`, and `OPEN_QUESTIONS` are valid normalized `required_world_updates` targets but do not all produce SEC records.
4. Strict YAML serialization repaired a legacy sequence scalar accepted by parser recovery but rejected by plain `YAML.parse`; no canon semantics changed.
5. The `DIS-1-EXT` special heading landed as an extension on `DIS-1.yaml`, not as a 17th invariant record.
6. A post-migration manual cleanup removed orphan pre-heading attribution comments from migrated YAML bodies; this did not recover or delete prose content, because the following section records already contained the original prose.
