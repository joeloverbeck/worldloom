# PROSESPLIT2-002: Rewire `_shared-templates/story-state-contract.md` §8 + branching-story skill references to `docs/prose-renderer-contract/*`

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — modifies `.claude/skills/_shared-templates/story-state-contract.md` §8 page-plan table; modifies `.claude/skills/branching-story-bootstrap/SKILL.md` + `references/pre-flight-and-prerequisites.md` + `references/phase-8-9-page-plan-and-choices.md` + `references/governance-and-foundations.md`; modifies `.claude/skills/branching-story-turn-cycle/SKILL.md` + `references/pre-flight-and-prerequisites.md` + `references/phase-7-page-plan.md` + `references/governance-and-foundations.md`
**Deps**: archive/tickets/PROSESPLIT2-001.md (new canonical-source files must exist at `docs/prose-renderer-contract/*` before references can point at them)

## Problem

After PROSESPLIT2-001 lands, the three renderer-bound canonical-source files exist at `docs/prose-renderer-contract/{content-policy,prose-craft-contract,render-time-instruction}.md` — but every skill-side reference still points at `reports/prose-quality-instructions.md` §<Specific Section>. This ticket migrates the skill-prose references to the new paths.

The user's framing was: "the skills that currently parse parts of this file should then use the entire content of the split documents accordingly." The skills do not programmatically parse — they direct the page-plan author (Claude) to inline a named section verbatim at authoring time. The "parsing" friction the user identified is the navigate-to-section step. After this rewire, each reference becomes "inline contents of `docs/prose-renderer-contract/<file>`" — no section anchor needed, no navigation step.

`_shared-templates/story-state-contract.md` §8 is the **single page-plan-minimum-contract table** that both branching-story skills read; updating its three §2 / §3 / §19 source rows is the load-bearing change. The skill-side references (SKILL.md, pre-flight, phase-7 / phase-8-9, governance-and-foundations) are reminders and one-line mentions that propagate the same fact for emphasis and audit-trail integrity.

## Assumption Reassessment (2026-05-26)

1. `.claude/skills/_shared-templates/story-state-contract.md` exists; §8 Page Plan Minimum Contract table at lines 421-450 declares §2 / §3 / §19 sources as `reports/prose-quality-instructions.md §Content Policy / §Prose Craft Contract / §Render-Time Instruction Template` (verified at lines 428, 429, 450).
2. Both branching-story skills exist and reference the report at multiple sites:
   - `branching-story-bootstrap/SKILL.md:45` (pre-flight check enumeration), `:47` (Phase 1-9 completion language), `:167` (Phase 8 step instruction), `:217` (verbatim §2/§3/§19 mention) — verified.
   - `branching-story-bootstrap/references/pre-flight-and-prerequisites.md:14` (canonical-source enumeration), `:28` (Load instruction) — verified.
   - `branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md:11` (verbatim §2/§3/§19 paragraph) — verified.
   - `branching-story-bootstrap/references/governance-and-foundations.md:47` (verbatim §2/§3/§19 bullet) — verified.
   - `branching-story-turn-cycle/SKILL.md:46` (Phase 0-9 completion language), `:172` (Phase 7 step instruction), `:233` (verbatim §2/§3/§19 mention) — verified.
   - `branching-story-turn-cycle/references/pre-flight-and-prerequisites.md:10` (canonical-source enumeration), `:32` (Load instruction) — verified.
   - `branching-story-turn-cycle/references/phase-7-page-plan.md:7` (verbatim §2/§3/§19 paragraph) — verified.
   - `branching-story-turn-cycle/references/governance-and-foundations.md:46` (verbatim §2/§3/§19 bullet) — verified.
3. Cross-skill boundary: this ticket modifies the **shared page-plan minimum contract** (`_shared-templates/story-state-contract.md` §8) — the canonical contract table both branching-story skills read at plan-authoring time. The boundary's invariant is that both skills inline the same byte-content into the same plan sections; this ticket changes the source path without changing the bytes or the inlining contract.
4. FOUNDATIONS principle motivating the rewire: §LLM-facing Skill Prose Discipline — the canonical hosting reference at `docs/FOUNDATIONS.md:714` (updated by PROSESPLIT2-003) points at the file's host path. This ticket migrates the skill-side citations to match.
5. **Reference shape choice**: every skill-side citation currently has the form `reports/prose-quality-instructions.md §<Section>`. The replacement form is `docs/prose-renderer-contract/<file>.md` (no section anchor; the file IS the section after PROSESPLIT2-001). Where surrounding prose says "§Content Policy / §Prose Craft Contract / §Render-Time Instruction Template", the section names stay (they describe the page-plan sections being authored, §2 / §3 / §19) — only the source path changes.
6. No adjacent contradictions exposed. Stale reference at `_shared-templates/page-plan.md` (mentioned in `brainstorm/references/triage-workflow-rules.md:92`) was already cleaned up — no such file exists; the live citation is `_shared-templates/story-state-contract.md`.

## Architecture Check

1. Migrating in one cut (one ticket, all skill-side citations) is cleaner than per-file rolling migration because the contract surface is **one shared template + N reminders** — leaving any reminder pointing at the old path would create a contradiction with the canonical contract. The grep-proof in Acceptance Criteria §4 enforces the all-or-nothing property.
2. No backwards-compatibility aliasing/shims — the new paths point at files freshly created by PROSESPLIT2-001; no symlink, no re-export, no transitional doc. After this ticket lands, `reports/prose-quality-instructions.md` retains the file (PROSESPLIT2-004 deletes it) but loses all skill-side citations.

## Verification Layers

1. Every skill-side citation of `reports/prose-quality-instructions.md` is replaced with the corresponding `docs/prose-renderer-contract/<file>.md` reference → codebase grep-proof: `grep -rn "reports/prose-quality-instructions.md" /home/joeloverbeck/projects/worldloom/.claude/skills` returns empty (excluding archive paths).
2. The `_shared-templates/story-state-contract.md` §8 table's §2 / §3 / §19 source rows now name the three new files → manual review of the table.
3. The branching-story skills still author the same page-plan §2 / §3 / §19 sections with the same bytes → no functional regression because the source bytes were copied byte-identically by PROSESPLIT2-001; the inlining instruction now points at the new path.
4. Reading both branching-story skills' SKILL.md + references end-to-end exposes no remaining "`reports/prose-quality-instructions.md`" string and no orphaned "§Content Policy / §Prose Craft Contract / §Render-Time Instruction Template" mention that no longer has a file association → manual review.

## What to Change

### 1. `_shared-templates/story-state-contract.md` §8 Page Plan Minimum Contract table

Replace rows for §2, §3, §19:

- Line 428 (§2 source cell): `inlined verbatim from reports/prose-quality-instructions.md §Content Policy` → `inlined verbatim from docs/prose-renderer-contract/content-policy.md`
- Line 429 (§3 source cell): `inlined verbatim from reports/prose-quality-instructions.md §Prose Craft Contract` → `inlined verbatim from docs/prose-renderer-contract/prose-craft-contract.md`
- Line 450 (§19 source cell): `inlined verbatim from reports/prose-quality-instructions.md §Render-Time Instruction Template` → `inlined verbatim from docs/prose-renderer-contract/render-time-instruction.md`

Keep the paragraph at lines 452 ("§2, §3, and §19 are inlined verbatim on every page plan...") unchanged — the load-bearing-rationale prose is path-agnostic.

### 2. `branching-story-bootstrap/SKILL.md`

- Line 45 (pre-flight canonical sources list): replace `reports/prose-quality-instructions.md` with `docs/prose-renderer-contract/content-policy.md, docs/prose-renderer-contract/prose-craft-contract.md, docs/prose-renderer-contract/render-time-instruction.md` (three files in the comma-separated list).
- Line 47 (Phases 1-9 completion language, "verbatim §2 / §3 / §19 inlined from `reports/prose-quality-instructions.md`"): replace with "verbatim §2 / §3 / §19 inlined from `docs/prose-renderer-contract/content-policy.md`, `docs/prose-renderer-contract/prose-craft-contract.md`, `docs/prose-renderer-contract/render-time-instruction.md` respectively".
- Line 167 (Phase 8 instruction): same replacement pattern as :47.
- Line 217 (verbatim §2 / §3 / §19 bullet): replace `inlined from reports/prose-quality-instructions.md` with `inlined from docs/prose-renderer-contract/{content-policy,prose-craft-contract,render-time-instruction}.md respectively`.

### 3. `branching-story-bootstrap/references/pre-flight-and-prerequisites.md`

- Line 14 (canonical-source bullet `reports/prose-quality-instructions.md — canonical source for the page plan's verbatim §2 (Content Policy), §3 (Prose Craft Contract), §19 (Render-Time Instruction Template)`): split into three bullets, one per file:

  ```markdown
  - `docs/prose-renderer-contract/content-policy.md` — canonical source for the page plan's verbatim §2 (Content Policy)
  - `docs/prose-renderer-contract/prose-craft-contract.md` — canonical source for the page plan's verbatim §3 (Prose Craft Contract)
  - `docs/prose-renderer-contract/render-time-instruction.md` — canonical source for the page plan's verbatim §19 (Render-Time Instruction Template)
  ```

- Line 28 (Load instruction `Load docs/FOUNDATIONS.md, .claude/skills/_shared-templates/story-state-contract.md, and reports/prose-quality-instructions.md into working context.`): replace the `reports/...` entry with the three file paths comma-separated.

### 4. `branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md`

- Line 11 (verbatim §2 / §3 / §19 paragraph `§2 (Content Policy), §3 (Prose Craft Contract), and §19 (Render-Time Instruction Template) are inlined verbatim from reports/prose-quality-instructions.md.`): replace the citation tail with `inlined verbatim from docs/prose-renderer-contract/content-policy.md, docs/prose-renderer-contract/prose-craft-contract.md, and docs/prose-renderer-contract/render-time-instruction.md respectively.`

### 5. `branching-story-bootstrap/references/governance-and-foundations.md`

- Line 47 (verbatim §2 / §3 / §19 bullet `The page-plan-authoring phase inlines reports/prose-quality-instructions.md §Content Policy / §Prose Craft Contract / §Render-Time Instruction Template verbatim`): replace with `The page-plan-authoring phase inlines docs/prose-renderer-contract/content-policy.md / prose-craft-contract.md / render-time-instruction.md verbatim`.

### 6. `branching-story-turn-cycle/SKILL.md`

Same replacement pattern as the bootstrap SKILL.md changes:

- Line 46 (Phases 0-9 completion language): replace `inlined from reports/prose-quality-instructions.md` with the three-file form.
- Line 172 (Phase 7 step instruction): same.
- Line 233 (verbatim §2 / §3 / §19 bullet): same.

### 7. `branching-story-turn-cycle/references/pre-flight-and-prerequisites.md`

- Line 10 (canonical-source bullet): split into three bullets per the bootstrap pre-flight pattern in change §3.
- Line 32 (Load instruction): replace the `reports/...` entry with the three file paths.

### 8. `branching-story-turn-cycle/references/phase-7-page-plan.md`

- Line 7 (verbatim §2 / §3 / §19 paragraph): same replacement as the bootstrap phase-8-9 reference in change §4.

### 9. `branching-story-turn-cycle/references/governance-and-foundations.md`

- Line 46 (verbatim §2 / §3 / §19 bullet): same replacement as the bootstrap governance-and-foundations bullet in change §5.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/pre-flight-and-prerequisites.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/governance-and-foundations.md` (modify)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)
- `.claude/skills/branching-story-turn-cycle/references/pre-flight-and-prerequisites.md` (modify)
- `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` (modify)
- `.claude/skills/branching-story-turn-cycle/references/governance-and-foundations.md` (modify)

## Out of Scope

- Updating `docs/FOUNDATIONS.md:714`, `specs/IMPLEMENTATION-ORDER.md:18`, `AGENTS.md`, or `.claude/skills/brainstorm/references/triage-workflow-rules.md:92`. Belongs to PROSESPLIT2-003.
- Deleting `reports/prose-quality-instructions.md`. Belongs to PROSESPLIT2-004.
- Adding the byte-equality test. Belongs to PROSESPLIT2-005.
- Changing the verbatim-inlining contract itself (the rule that §2 / §3 / §19 ship byte-for-byte every page). Out of scope for PROSESPLIT2 entirely; user-confirmed load-bearing 2026-05-12 per the feedback memory `page_plan_verbatim_sections`.
- Modifying anything inside `pages-prose-plans/PG-*.md` on disk (existing plans retain the bytes they were written with; the new contract is forward-only).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -rn "reports/prose-quality-instructions" .claude/skills/_shared-templates/ .claude/skills/branching-story-bootstrap/ .claude/skills/branching-story-turn-cycle/` returns empty after this ticket lands.
2. `grep -rn "docs/prose-renderer-contract" .claude/skills/_shared-templates/story-state-contract.md` returns exactly 3 lines (one for each of §2 / §3 / §19 in the §8 table).
3. `grep -rn "docs/prose-renderer-contract" .claude/skills/branching-story-bootstrap/ .claude/skills/branching-story-turn-cycle/` returns at least 10 lines (every SKILL.md site + every references/* site listed in the Files to Touch).
4. `pnpm turbo lint` and `pnpm turbo typecheck` continue to pass — this ticket only touches markdown.

### Invariants

1. After this ticket, no skill body or shared template references `reports/prose-quality-instructions.md` by path. The only remaining live references are in `docs/FOUNDATIONS.md`, `specs/IMPLEMENTATION-ORDER.md`, `AGENTS.md`, and the brainstorm worked precedent — those land in PROSESPLIT2-003.
2. The §2 / §3 / §19 verbatim-inlining contract is unchanged. The bytes that get inlined into each newly-authored page plan are byte-identical to the bytes copied by PROSESPLIT2-001 (which were byte-identical to the original report).
3. Page plans on disk authored before this ticket lands continue to validate — they ship the original byte-content (now identical to the canonical content under the new path).

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is the grep-proof in Acceptance Criteria Tests That Must Pass §1-§3, plus existing pipeline validators (lint, typecheck). Structural byte-equality validator lands in PROSESPLIT2-005 and exercises the new paths.`

### Commands

1. `grep -rn "reports/prose-quality-instructions" .claude/skills/_shared-templates/ .claude/skills/branching-story-bootstrap/ .claude/skills/branching-story-turn-cycle/` — should return empty.
2. `grep -rn "docs/prose-renderer-contract" .claude/skills/` — should return references in `_shared-templates/story-state-contract.md` + both branching-story skill trees.
3. `pnpm turbo lint && pnpm turbo typecheck` — full-pipeline confirmation that the markdown-only changes break nothing.
