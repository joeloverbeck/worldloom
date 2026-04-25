# SPEC14PAVOC-004: Animalia PA Migration — Frontmatter Form, OQ Reconciliation, Synthesis-Block Move

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: No code changes — content-only migration. Uses the engine ops landed by `archive/tickets/SPEC14PAVOC-002.md` and validates against the schema landed by `archive/tickets/SPEC14PAVOC-001.md`.
**Deps**: SPEC-14, `archive/tickets/SPEC14PAVOC-001.md` (validator parses frontmatter; schema rename in place), `archive/tickets/SPEC14PAVOC-002.md` (engine emits canonical PA shape; `append_touched_by_cf` bidirectional check active so OQ allocations work via patch plans), `archive/tickets/SPEC14PAVOC-003.md` (canonical-vocab MCP available for spot-checks during reconciliation)

## Problem

All 17 animalia PA files (`worlds/animalia/adjudications/PA-0001-*.md` through `PA-0017-*.md`) predate the SPEC-14 contract:
- 15 of 17 lack any `## Discovery` block or YAML frontmatter; canonical fields live as bold-prefix lines at top level.
- 2 of 17 (PA-0009, PA-0014) have a `## Discovery` block with bold-emphasized non-canonical field names (`New CF`, `Critics dispatched`, `Modification_history entries`, `Critic consensus`, `Escalation Gate fired`, `Change Log Entry`, `New Mystery Reserve entries`).
- All 17 cite `open_questions_touched` as natural-language topic strings (e.g., `[Broker Charter Status (per polity), Contractor Liability Case Law, ...]`) instead of `OQ-NNNN[]` IDs.

This produces 136 GF-0004 findings (8 missing-required-field errors per PA × 17 PAs) + 7 GF-0001 non-canonical-field findings on PA-0009. Total: 143 of the 224 grandfathered findings. After this ticket: 0.

## Assumption Reassessment (2026-04-25)

1. PA filenames follow the pattern `PA-NNNN-<verdict-snake-case>.md`. Verdicts in filenames: 17 of 17 are `accept_with_required_updates`. Per SPEC14PAVOC-001 schema, the canonical verdict enum value is `ACCEPT_WITH_REQUIRED_UPDATES`. Filename verdict suffix stays as-is (cosmetic) but frontmatter `verdict: ACCEPT_WITH_REQUIRED_UPDATES` is what the validator reads.
2. `worlds/animalia/_source/open-questions/` contains 60 existing OQ records (`OQ-0001.yaml` through `OQ-0060.yaml`). Topic-string-to-OQ matching is the primary reconciliation work; unmatched topics get new OQ allocations.
3. PA bodies contain extensive Phase 0–11 analysis prose (PA-0001 is 528 lines; full corpus ~2k lines per spot check). The migration preserves all body content verbatim — only restructures the canonical fields out of the bold-prefix top section into YAML frontmatter.
4. PA-0009 and PA-0014 narrative metadata fields (`Critics dispatched`, `Critic consensus`, `Escalation Gate fired`, etc.) are load-bearing audit context. Per Decision A interview answer: kept as a sibling `## Synthesis` block in the body (renamed from the existing `## Discovery`), not stripped.
5. Engine-mediated migration: each PA is a `append_adjudication_record` op against a temp world, OR (alternative) direct file rewrite via `Write` tool followed by `world-index build animalia` reindex. Per CLAUDE.md "Never bypass the patch engine for `_source/` writes" — but adjudications are NOT `_source/` files (they're hybrid markdown under `adjudications/`). Hook 3 will eventually block direct edits there per SPEC-05 Phase 2; currently Hook 3 is not active. **Decision**: use `Write` tool for the migration (faster, simpler) since this is one-shot historical-data cleanup, not skill-emitted new content. Re-run `world-index build animalia` after the rewrites to refresh the index.
6. New OQ allocations during migration go through the patch engine via `create_oq_record` ops (per SPEC-14 §Migration). Each new OQ needs author-judgment fields: `id`, `title`, `surface_form` (the topic string from the PA), and per the `_source/open-questions/` schema, additional fields the existing OQ-0001..0060 use.
7. Per SPEC-14 Risks: ~10–30 new OQ allocations expected. Spot-check sample: PA-0002's 4 strings + PA-0003's 7 strings = 11 just from two PAs; multiplied across 17 PAs the total before deduplication could exceed 60. Reality: many strings will reference the SAME open question across multiple PAs (e.g., "Maker-Age Linguistic Recovery" likely appears in multiple ruin/translation-related PAs). After dedup expected ~20–35 distinct strings; after matching to existing 60 OQs expected ~10–20 new allocations. Confirmed at implementation time.
8. CHAR-0002 / DA-0002 frontmatter type fixes are NOT in this ticket's scope (lands in `SPEC14PAVOC-006`).

## Architecture Check

1. Migration as one-shot historical cleanup is justified — these 17 PAs were written before the contract existed. Going forward (post `archive/tickets/SPEC14PAVOC-002.md` + SPEC-06 canon-addition rewrite), new PAs flow through the engine and are born compliant.
2. OQ reconciliation centralizes scattered topic-strings into structured records. This is independent value: skills can now ask "what other PAs touch OQ-0061?" via the world index, where today the answer requires grepping topic-strings across all 17 PAs.
3. No backwards-compatibility for the legacy PA shape. After this ticket lands, all PAs are frontmatter-form; the legacy bold-prefix-lines pattern is purged from animalia.

## Verification Layers

1. PA frontmatter compliance → `world-validate animalia --json` reports zero `record_schema_compliance` findings against any `adjudications/*.md` file.
2. OQ-NNNN citations resolve → `world-validate animalia` `cross_file_reference` validator reports zero unresolved OQ-NNNN references in PA frontmatter.
3. Body prose preserved → `git diff worlds/animalia/adjudications/PA-NNNN-*.md | wc -l` per file shows ONLY frontmatter additions and bold-prefix-line removals; the Phase 0–11 analysis bodies are byte-identical with their pre-migration content (verified by an automated diff helper in the migration script if used, or by manual spot-check).
4. New OQ records valid → `world-validate animalia` reports zero `record_schema_compliance` findings on the newly-created `_source/open-questions/OQ-NNNN.yaml` files.
5. Synthesis-block move → PA-0009 and PA-0014 retain all narrative metadata fields under a `## Synthesis` heading (not in frontmatter); validator does not scan body content.

## What to Change

### 1. Inventory the canonical-field content in each PA

For each of the 17 PAs, extract:
- `pa_id`: from filename
- `date`: from existing `**Date**:` bold line (PA-0001 et al.) or `## Discovery` block (PA-0009, PA-0014)
- `verdict`: `ACCEPT_WITH_REQUIRED_UPDATES` (all 17)
- `originating_skill`: `canon-addition`
- `change_id`: from existing `**Resulting Change Log Entry**:` (PA-0001 et al.) or `## Discovery` `Change Log Entry` (PA-0009)
- `cf_records_touched`: from `**Resulting Canon Fact Records**:` + `**Modified Canon Fact Records**:` + (PA-0009) `New CF` + `Modification_history entries`
- `mystery_reserve_touched`: from `**New Mystery Reserve entry/entries**:` (parse the M-N IDs out of the topic-strings; M-6 (The Nature of Vessel-Hosted Agencies) → `["M-6"]`, etc.)
- `invariants_touched`: from `**Invariants_touched**:` if present, or extracted from Phase 2 analysis content (judgment-light: only invariant IDs explicitly listed in a section heading or bullet)
- `open_questions_touched`: TOPIC STRINGS — these need OQ-NNNN reconciliation in step 2

### 2. Reconcile open_questions_touched topic-strings to OQ-NNNN IDs

Build a mapping table: for each unique topic-string across all 17 PAs, search `worlds/animalia/_source/open-questions/OQ-*.yaml` for a matching `title` or `surface_form`. Where match found → record the OQ-NNNN ID. Where unmatched → allocate a new OQ-NNNN.

For each new OQ, author the minimal record per the `_source/open-questions/` schema: `id`, `title` (from topic-string), `surface_form` (verbatim topic-string), `originating_cf` (the PA's primary CF, if derivable), `extensions: []`, plus any other required fields per `tools/validators/src/schemas/open-question.schema.json`.

Submit new OQs via patch plan: one `create_oq_record` op per new OQ, batched by PA. (Each PA's plan can include the OQs it raises plus the PA file rewrite — though file rewrite is via `Write`, not engine.)

Document the topic-string → OQ-NNNN mapping in the ticket's implementation log for audit.

### 3. Rewrite each PA file

For each PA, write:

```markdown
---
pa_id: PA-NNNN
date: <YYYY-MM-DD>
verdict: ACCEPT_WITH_REQUIRED_UPDATES
originating_skill: canon-addition
change_id: CH-NNNN
cf_records_touched: [CF-NNNN, CF-NNNN, ...]
mystery_reserve_touched: [M-NN, ...]
invariants_touched: [<INV-IDs>, ...]
open_questions_touched: [OQ-NNNN, OQ-NNNN, ...]
---

# PA-NNNN — Adjudication Record

<original prose body, with the bold-prefix lines at the top removed>
<remainder unchanged>
```

For PA-0009 and PA-0014, the existing `## Discovery` heading + bullet block is renamed to `## Synthesis` and kept in the body for narrative-audit value. The canonical fields go in frontmatter.

### 4. Reindex animalia

After all 17 file rewrites + new OQ allocations applied via engine:
```bash
cd /home/joeloverbeck/projects/worldloom
node tools/world-index/dist/src/cli/world-index.js build animalia
```
Verifies each new OQ record is indexed; PA records are reparsed via the new frontmatter path; world index is consistent.

### 5. Update grandfathering YAML

Remove entries `GF-0001`, `GF-0004` (PA portion only — character entries stay until `SPEC14PAVOC-006` lands), `GF-0010` (handled by `SPEC14PAVOC-005`), etc. as their underlying findings close. **This ticket** removes:
- `GF-0001` (7 findings — all PA-0009 Discovery block; resolved by Synthesis-block move + frontmatter)
- `GF-0004` PA portion (136 findings — all 17 PAs now have canonical frontmatter)

If after the rewrite, the file has zero remaining entries → archive the file or delete (operator choice; recommend keeping as audit trail under a renamed `audits/validation-grandfathering-pre-spec14.yaml`).

## Files to Touch

- `worlds/animalia/adjudications/PA-0001-accept_with_required_updates.md` (modify)
- `worlds/animalia/adjudications/PA-0002-accept_with_required_updates.md` (modify)
- `worlds/animalia/adjudications/PA-0003-accept_with_required_updates.md` (modify)
- `worlds/animalia/adjudications/PA-0004-accept_with_required_updates.md` through `PA-0017-accept_with_required_updates.md` (modify — 14 more files)
- `worlds/animalia/_source/open-questions/OQ-0061.yaml` ... up to `OQ-NNNN.yaml` (new — count determined during reconciliation; expected 10–20)
- `worlds/animalia/audits/validation-grandfathering.yaml` (modify — remove closed entries)

## Out of Scope

- CF cleanup (domain re-tags, mystery enum normalizations, `required_world_updates` extensions) — lands in `SPEC14PAVOC-005`.
- One-off integrity fixes (CHAR-0002, DA-0002, M-5, CF-0003, CF-0020) — lands in `SPEC14PAVOC-006`.
- Deletion of the `validation-grandfathering.yaml` file entirely — leave as audit trail under a renamed path even when emptied.
- Skill-side changes to canon-addition's PA emission — that's downstream SPEC-06 work; this ticket is one-shot data migration.
- Updating the 17 PAs' analysis prose for content correctness — out of scope; verbatim preservation of body prose.

## Acceptance Criteria

### Tests That Must Pass

1. `cd /home/joeloverbeck/projects/worldloom && node tools/world-index/dist/src/cli/world-index.js build animalia` — succeeds; index reflects new OQ records and reparsed PAs.
2. `node tools/validators/dist/src/cli/world-validate.js animalia --json | jq '.verdicts | map(select(.location.file | startswith("adjudications/"))) | length'` returns `0`.
3. `jq '.verdicts | map(select(.code == "adjudication_discovery_fields.non_canonical")) | length'` returns `0` (validator retired in SPEC14PAVOC-001; no findings possible).
4. `jq '.verdicts | map(select(.code == "record_schema_compliance.required" and (.location.file | startswith("adjudications/")))) | length'` returns `0`.
5. Each new `_source/open-questions/OQ-NNNN.yaml` passes `record_schema_compliance` against `open-question.schema.json`.

### Invariants

1. Every PA file has YAML frontmatter as its first block (`---` on line 1).
2. Every `open_questions_touched[]` value matches `^OQ-[0-9]{4}$`.
3. PA bodies are byte-identical with their pre-migration analysis content (excluding the removed top bold-prefix lines + the renamed `## Discovery` → `## Synthesis` heading on PA-0009 and PA-0014).
4. The grandfathering file has zero entries from `GF-0001` and `GF-0004`'s PA-portion findings post-rewrite.
5. Total OQ records in `worlds/animalia/_source/open-questions/` is `60 + N` where N is the count of new allocations made during reconciliation.

## Test Plan

### New/Modified Tests

1. None — content migration; verification is command-based against the validator.
2. The `tools/validators/tests/integration/spec04-verification.test.ts` is the existing acceptance suite; it should continue to pass after this ticket and `SPEC14PAVOC-001` are both landed.

### Commands

1. `node tools/validators/dist/src/cli/world-validate.js animalia --json > /tmp/post-spec14-004.json` — full validator run.
2. `jq '.summary' /tmp/post-spec14-004.json` — post-this-ticket summary; PA-class findings should be zero.
3. `jq '.verdicts[] | select(.location.file | startswith("adjudications/")) | .code' /tmp/post-spec14-004.json | sort -u` — should output empty (no adjudication-related verdicts remain).
4. Spot-check one PA file: `head -15 worlds/animalia/adjudications/PA-0001-accept_with_required_updates.md` — confirms frontmatter shape; `grep -c "^**Verdict**:" worlds/animalia/adjudications/PA-0001*.md` should return `0` (bold-prefix lines removed from top).
