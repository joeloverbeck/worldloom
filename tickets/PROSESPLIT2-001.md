# PROSESPLIT2-001: Create `docs/prose-renderer-contract/` folder with 3 renderer-bound files + README

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — new `docs/prose-renderer-contract/` subdirectory containing four files (`content-policy.md`, `prose-craft-contract.md`, `render-time-instruction.md`, `README.md`)
**Deps**: None

## Problem

`reports/prose-quality-instructions.md` (279 lines) is a canonical-source contract document misfiled in `reports/*` — a directory whose other contents (e.g., `reports/page-plans-improvements-first-iteration.md`) are ephemeral analysis artifacts. The file's own header note says "This document is the source-of-truth bundle for the plan-authoring skills of the story-skill family"; the rebuild rotated the legacy "derivative" framing into "canonical" without relocating the file.

Worse, the file bundles **three section-pure renderer-bound contracts** (§Content Policy, §Prose Craft Contract, §Render-Time Instruction Template — each inlined verbatim into per-page plan §2 / §3 / §19 by `branching-story-bootstrap` Phase 8 and `branching-story-turn-cycle` Phase 7) with **three reformulations / operator references** that have no skill-side file-path consumer (§Anti-Pathology Checklist is a Diagnostic-Vocabulary reformulation; §Voice and Register Guidance is Rule 7 duplicated; §External-Renderer Usage Guide is operator docs). Every consumer references "`reports/prose-quality-instructions.md` §<Specific Section>" — the bundled shape forces every skill author to navigate a multi-section document to locate one block.

This ticket establishes the destination folder and the three renderer-bound files (one per inlined section) plus a folder README absorbing the §External-Renderer Usage Guide content. **No references are touched in this ticket** — that work belongs to PROSESPLIT2-002 / PROSESPLIT2-003. The bundle source file at `reports/prose-quality-instructions.md` also remains untouched until PROSESPLIT2-004; this is an additive ticket only.

## Assumption Reassessment (2026-05-26)

1. `reports/prose-quality-instructions.md` exists at the cited path and is 279 lines (verified). The current section boundaries are: §Content Policy lines 15-39; §Prose Craft Contract lines 43-162 (incl. Diagnostic Vocabulary table lines 149-162); §Render-Time Instruction Template lines 166-223; §Anti-Pathology Checklist lines 227-245; §Voice and Register Guidance lines 249-259; §External-Renderer Usage Guide lines 263-279. Ticket scope copies the first three sections verbatim into per-file form.
2. `docs/` directory exists and is the canonical location for permanent project documentation per `CLAUDE.md` §"Where To Look" routing. No `docs/prose-renderer-contract/` subdirectory exists (verified — namespace clear).
3. Cross-artifact boundary: the three renderer-bound files form a **single contract surface** that both `branching-story-bootstrap` and `branching-story-turn-cycle` consume identically (verbatim inline at page-plan-authoring time) and that `_shared-templates/story-state-contract.md` §8 declares as the §2 / §3 / §19 source of `pages-prose-plans/PG-<integer>.md`. This ticket creates the destination files only; the boundary is not modified until PROSESPLIT2-002 rewires the references.
4. FOUNDATIONS principle motivating the split: §LLM-facing Skill Prose Discipline (FOUNDATIONS.md:714) treats canonical-source consolidation as load-bearing — the cited path is the contract's hosting reference. This ticket prepares the new hosting locations without yet updating the §714 path; the path update lands in PROSESPLIT2-003.
5. The §Prose Craft Contract's Diagnostic Vocabulary table (lines 149-162) is **dual-purpose**: inlined as part of §3 into renderer prompts AND the internal citation vocabulary for `branching-story-prose-attach` Phase 4's 7-axis qualitative craft critic. The table stays bundled with the Prose Craft Contract file; no separate diagnostic-vocabulary file is created.
6. No adjacent contradictions exposed during reassessment. The legacy `archive/tickets/PROSESPLIT-001..009.md` series extracted this file FROM skill bodies and IS the lineage this ticket extends; the `PROSESPLIT2` prefix signals direct continuation.

## Architecture Check

1. Single-purpose-per-file is cleaner than multi-section bundle because each skill reference becomes "inline contents of `<file>`" with no section anchor — eliminating the navigate-to-section step that the current shape forces on every page-plan-authoring run. The byte-equality test in PROSESPLIT2-005 also becomes trivially expressible (one canonical file ↔ one plan section).
2. No backwards-compatibility aliasing/shims — the new files are greenfield. `reports/prose-quality-instructions.md` continues to exist until PROSESPLIT2-004 deletes it; during the PROSESPLIT2-001 → -004 window both locations resolve, but no new code references the new paths yet (PROSESPLIT2-002/003 swap them in one cut).

## Verification Layers

1. The three renderer-bound files contain byte-identical copies of their source sections → file-content equality check (`diff <(sed -n '15,39p' reports/prose-quality-instructions.md) docs/prose-renderer-contract/content-policy.md` minus the header-stripping adjustment) → manual review at write time + PROSESPLIT2-005 structural validator after that ticket lands.
2. The folder README cross-links the three renderer-bound files and absorbs §External-Renderer Usage Guide content → manual review against the source §External-Renderer Usage Guide section.
3. No skill / template / FOUNDATIONS reference points at the new paths yet (this is an additive-only ticket) → codebase grep-proof: `grep -rn "docs/prose-renderer-contract" /home/joeloverbeck/projects/worldloom --include="*.md" --include="*.ts"` returns only the new files themselves.

## What to Change

### 1. Create `docs/prose-renderer-contract/content-policy.md`

Copy lines 15-39 of `reports/prose-quality-instructions.md` (the §Content Policy block including the `<content_policy>...</content_policy>` tag wrap). Prepend a 1-paragraph framing header that names what the file is and how it is consumed:

```markdown
# Content Policy — page-plan §2 canonical source

This is the canonical source for the `<content_policy>...</content_policy>` block inlined verbatim as §2 of every `pages-prose-plans/PG-<integer>.md` page plan. Both `branching-story-bootstrap` (Phase 8) and `branching-story-turn-cycle` (Phase 7) inline this file's body byte-for-byte. The block binds the renderer before any other instruction; it is the FIRST item the external prose renderer sees.

Do not edit this file lightly. Any change here propagates to every newly-authored page plan; existing plans on disk retain the bytes they were written with.

---

<verbatim §Content Policy body from reports/prose-quality-instructions.md lines 15-39>
```

### 2. Create `docs/prose-renderer-contract/prose-craft-contract.md`

Copy lines 43-162 of `reports/prose-quality-instructions.md` (the 11-rule Prose Craft Contract + Diagnostic Vocabulary table). Prepend a 1-paragraph framing header:

```markdown
# Prose Craft Contract — page-plan §3 canonical source

This is the canonical source for the 11-rule Prose Craft Contract + Diagnostic Vocabulary table inlined verbatim as §3 of every `pages-prose-plans/PG-<integer>.md` page plan. Both `branching-story-bootstrap` (Phase 8) and `branching-story-turn-cycle` (Phase 7) inline this file's body byte-for-byte.

The Diagnostic Vocabulary table at the end is dual-purpose: it ships with every page plan as part of the verbatim §3 block, AND it is the internal citation vocabulary used by `branching-story-prose-attach` Phase 4's qualitative craft critic. Its axis names are the citation tokens used in verdicts.

Do not edit this file lightly. Any change here propagates to every newly-authored page plan; existing plans on disk retain the bytes they were written with.

---

<verbatim §Prose Craft Contract body from reports/prose-quality-instructions.md lines 43-162>
```

### 3. Create `docs/prose-renderer-contract/render-time-instruction.md`

Copy lines 166-223 of `reports/prose-quality-instructions.md` (the §Render-Time Instruction Template block). Prepend a 1-paragraph framing header:

```markdown
# Render-Time Instruction — page-plan §19 canonical source

This is the canonical source for the render-time instruction block inlined verbatim as §19 of every `pages-prose-plans/PG-<integer>.md` page plan. Both `branching-story-bootstrap` (Phase 8) and `branching-story-turn-cycle` (Phase 7) inline this file's body byte-for-byte. The block is the LLM-facing instruction the external renderer reads after the plan body; it covers both root scene-setter rendering (PG-1) and multi-beat arc rendering (PG-2+).

Do not edit this file lightly. Any change here propagates to every newly-authored page plan; existing plans on disk retain the bytes they were written with.

---

<verbatim §Render-Time Instruction Template body from reports/prose-quality-instructions.md lines 166-223>
```

### 4. Create `docs/prose-renderer-contract/README.md`

Folder entry. Absorbs the §External-Renderer Usage Guide content from `reports/prose-quality-instructions.md` lines 263-279 and adds folder-navigation context. Suggested structure:

```markdown
# Prose Renderer Contract

This folder is the canonical source for the three renderer-bound blocks inlined verbatim into every per-page plan body authored by the story-skill family:

| File | Inlined as | Authored by |
|---|---|---|
| `content-policy.md` | page-plan §2 | `branching-story-bootstrap` Phase 8, `branching-story-turn-cycle` Phase 7 |
| `prose-craft-contract.md` | page-plan §3 | (same) |
| `render-time-instruction.md` | page-plan §19 | (same) |

The page-plan minimum contract — what each of the 19 sections is and where each comes from — is documented at `.claude/skills/_shared-templates/story-state-contract.md` §8.

## External-Renderer Usage Guide

**The plan IS the prompt.** [...verbatim absorbed content from lines 263-279 of reports/prose-quality-instructions.md...]

## Forbidden compaction

§2, §3, and §19 are inlined verbatim on every page plan. This is operationally load-bearing: the external prose renderer has no cross-plan state — every page render is a cold context. Compacting these sections on subsequent pages would force the user to manually re-paste the canonical content on every render, defeating the self-contained-plan contract. Skills must not propose compacting these sections across pages.

## Diagnostic Vocabulary dual-purpose note

The Diagnostic Vocabulary table at the end of `prose-craft-contract.md` is consumed in two distinct modes:

1. As part of the verbatim §3 block shipped with every page plan.
2. As the internal citation vocabulary for `branching-story-prose-attach` Phase 4's qualitative craft critic. The eight axis names are the citation tokens used in verdicts.

Edits to the table must preserve both consumption modes.
```

## Files to Touch

- `docs/prose-renderer-contract/content-policy.md` (new)
- `docs/prose-renderer-contract/prose-craft-contract.md` (new)
- `docs/prose-renderer-contract/render-time-instruction.md` (new)
- `docs/prose-renderer-contract/README.md` (new)

## Out of Scope

- Updating any reference to `reports/prose-quality-instructions.md` anywhere in the codebase. Belongs to PROSESPLIT2-002 (skill / template references), PROSESPLIT2-003 (FOUNDATIONS / IMPL-ORDER / AGENTS / brainstorm precedent).
- Deleting `reports/prose-quality-instructions.md`. Belongs to PROSESPLIT2-004.
- Adding the byte-equality test. Belongs to PROSESPLIT2-005.
- Touching §Anti-Pathology Checklist, §Voice and Register Guidance, or §External-Renderer Usage Guide as standalone files — Approach C explicitly drops §Anti-Pathology Checklist and §Voice and Register Guidance as redundant duplicates; §External-Renderer Usage Guide is absorbed into the folder README.
- Modifying the Diagnostic Vocabulary table or any axis-name vocabulary — the table moves byte-identically as part of `prose-craft-contract.md`.

## Acceptance Criteria

### Tests That Must Pass

1. `diff <(awk '/^## Content Policy$/,/^---$/' reports/prose-quality-instructions.md | sed '1d;$d') docs/prose-renderer-contract/content-policy.md` — content matches after stripping the framing header (manual diff verification).
2. `diff <(awk '/^## Prose Craft Contract$/,/^## Render-Time Instruction Template$/' reports/prose-quality-instructions.md | sed '$d') docs/prose-renderer-contract/prose-craft-contract.md` — content matches after stripping the framing header.
3. `diff <(awk '/^## Render-Time Instruction Template$/,/^## Anti-Pathology Checklist$/' reports/prose-quality-instructions.md | sed '$d') docs/prose-renderer-contract/render-time-instruction.md` — content matches after stripping the framing header.
4. `grep -rn "docs/prose-renderer-contract" /home/joeloverbeck/projects/worldloom --include="*.md" --include="*.ts" | grep -v "^/home/joeloverbeck/projects/worldloom/docs/prose-renderer-contract/"` returns empty — no references to new paths exist outside the folder itself (PROSESPLIT2-001 is additive-only).

### Invariants

1. The three renderer-bound files contain byte-identical §Content Policy / §Prose Craft Contract / §Render-Time Instruction Template bodies as of write time. Any drift between source bundle and per-file copies is a bug.
2. The folder README is the single landing surface for operators consuming the rendered plan body — it explains what each renderer-bound file is and how the page plan stitches them together.
3. `reports/prose-quality-instructions.md` continues to be the live canonical source until PROSESPLIT2-004 deletes it. During the 001 → 004 window, both locations resolve, but no consumer references the new paths yet.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is the content-equality diffs in Acceptance Criteria Tests That Must Pass §1-§3, plus the grep-proof in §4. Structural verification of byte-equality between the new canonical files and rendered page plan bodies lands in PROSESPLIT2-005's validator.`

### Commands

1. `wc -l reports/prose-quality-instructions.md docs/prose-renderer-contract/*.md` — sanity-check line counts after extraction (the three renderer-bound files should sum to ~25 + 120 + 58 = ~203 lines of content excluding framing headers, plus the README's absorbed external-usage-guide content).
2. `grep -rn "docs/prose-renderer-contract" /home/joeloverbeck/projects/worldloom --include="*.md" --include="*.ts" | grep -v "^/home/joeloverbeck/projects/worldloom/docs/prose-renderer-contract/"` — confirms no external references exist (this is additive-only).
3. `git status docs/prose-renderer-contract/` — confirms only the four new files are staged.
