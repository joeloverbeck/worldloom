# PROSESPLIT2-002: Rewire `_shared-templates/story-state-contract.md` §8 + branching-story skill references to `docs/prose-renderer-contract/*`

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — modified `.claude/skills/_shared-templates/story-state-contract.md` §8 page-plan table; modified `.claude/skills/branching-story-bootstrap/SKILL.md` + `references/pre-flight-and-prerequisites.md` + `references/phase-8-9-page-plan-and-choices.md` + `references/governance-and-foundations.md`; modified `.claude/skills/branching-story-turn-cycle/SKILL.md` + `references/pre-flight-and-prerequisites.md` + `references/phase-7-page-plan.md` + `references/governance-and-foundations.md`
**Deps**: archive/tickets/PROSESPLIT2-001.md (new canonical-source files must exist at `docs/prose-renderer-contract/*` before references can point at them)

## Problem

At intake after PROSESPLIT2-001, the three renderer-bound canonical-source files existed at `docs/prose-renderer-contract/{content-policy,prose-craft-contract,render-time-instruction}.md` while the owned skill-side references still pointed at `reports/prose-quality-instructions.md` §<Specific Section>. This ticket migrated the skill-prose references to the new paths.

The user's framing was: "the skills that currently parse parts of this file should then use the entire content of the split documents accordingly." The skills do not programmatically parse — they direct the page-plan author (Claude) to inline a named section verbatim at authoring time. The "parsing" friction the user identified is the navigate-to-section step. After this rewire, each reference says to inline contents of `docs/prose-renderer-contract/<file>` — no section anchor needed, no navigation step.

`_shared-templates/story-state-contract.md` §8 is the **single page-plan-minimum-contract table** that both branching-story skills read; updating its three §2 / §3 / §19 source rows is the load-bearing change. The skill-side references (SKILL.md, pre-flight, phase-7 / phase-8-9, governance-and-foundations) are reminders and one-line mentions that propagate the same fact for emphasis and audit-trail integrity.

## Assumption Reassessment (2026-05-26)

1. At intake, `.claude/skills/_shared-templates/story-state-contract.md` existed and §8 Page Plan Minimum Contract table declared §2 / §3 / §19 sources as `reports/prose-quality-instructions.md §Content Policy / §Prose Craft Contract / §Render-Time Instruction Template` (verified before implementation at lines 428, 429, 450). It now declares `docs/prose-renderer-contract/content-policy.md`, `docs/prose-renderer-contract/prose-craft-contract.md`, and `docs/prose-renderer-contract/render-time-instruction.md`.
2. At intake, both branching-story skills existed and referenced the report at multiple sites:
   - `branching-story-bootstrap/SKILL.md:45` (pre-flight check enumeration), `:47` (Phase 1-9 completion language), `:167` (Phase 8 step instruction), `:217` (verbatim §2/§3/§19 mention) — verified.
   - `branching-story-bootstrap/references/pre-flight-and-prerequisites.md:14` (canonical-source enumeration), `:28` (Load instruction) — verified.
   - `branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md:11` (verbatim §2/§3/§19 paragraph) — verified.
   - `branching-story-bootstrap/references/governance-and-foundations.md:47` (verbatim §2/§3/§19 bullet) — verified.
   - `branching-story-turn-cycle/SKILL.md:46` (Phase 0-9 completion language), `:172` (Phase 7 step instruction), `:233` (verbatim §2/§3/§19 mention) — verified.
   - `branching-story-turn-cycle/references/pre-flight-and-prerequisites.md:10` (canonical-source enumeration), `:32` (Load instruction) — verified.
   - `branching-story-turn-cycle/references/phase-7-page-plan.md:7` (verbatim §2/§3/§19 paragraph) — verified.
   - `branching-story-turn-cycle/references/governance-and-foundations.md:46` (verbatim §2/§3/§19 bullet) — verified.
3. Cross-skill boundary: this ticket modified the **shared page-plan minimum contract** (`_shared-templates/story-state-contract.md` §8) — the canonical contract table both branching-story skills read at plan-authoring time. The boundary's invariant is that both skills inline the same byte-content into the same plan sections; this ticket changed the source path without changing the bytes or the inlining contract.
4. FOUNDATIONS principle motivating the rewire: §LLM-facing Skill Prose Discipline — the canonical hosting reference in `docs/FOUNDATIONS.md` still points at the old report in this checkout and is intentionally owned by PROSESPLIT2-003. This ticket migrated only the skill-side citations and shared story-state template.
5. **Reference shape choice**: every owned skill-side citation at intake had the form `reports/prose-quality-instructions.md §<Section>`. The landed replacement form is `docs/prose-renderer-contract/<file>.md` (no section anchor; the file IS the section after PROSESPLIT2-001). Where surrounding prose says "§Content Policy / §Prose Craft Contract / §Render-Time Instruction Template", the section names stay (they describe the page-plan sections being authored, §2 / §3 / §19) — only the source path changed.
6. No adjacent contradictions exposed. Stale reference at `_shared-templates/page-plan.md` (mentioned in `brainstorm/references/triage-workflow-rules.md:92`) remains outside this ticket and is owned by PROSESPLIT2-003; the live page-plan minimum contract is `_shared-templates/story-state-contract.md` §8.
7. HARD-GATE review: two path substitutions landed inside existing `<HARD-GATE>` blocks in `branching-story-bootstrap/SKILL.md` and `branching-story-turn-cycle/SKILL.md`. `docs/HARD-GATE-DISCIPLINE.md` and `references/hard-gate-read-triage.md` were read during implementation. The edit changes the required source files loaded by pre-flight but preserves gate order, approval timing, failure handling, operator approval surface, validation-trace semantics, patch-plan submission, and approval-token behavior.
8. Verification corrected the broad package lane: `pnpm turbo lint` and `pnpm turbo typecheck` are not executable from the repo root in this checkout because there is no root `package.json`, no root pnpm workspace manifest, and pnpm reports `Command "turbo" not found`. The accepted proof for this markdown-only skill rewire is grep/manual review plus `git diff --check`.

## Architecture Check

1. Migrating in one cut (one ticket, all skill-side citations) is cleaner than per-file rolling migration because the contract surface is **one shared template + N reminders** — leaving any reminder pointing at the old path would create a contradiction with the canonical contract. The grep-proof in Acceptance Criteria §4 enforces the all-or-nothing property.
2. No backwards-compatibility aliasing/shims — the new paths point at files freshly created by PROSESPLIT2-001; no symlink, no re-export, no transitional doc. After this ticket, `reports/prose-quality-instructions.md` remains present (PROSESPLIT2-004 deletes it) but has no citations in the owned skill-side surfaces.

## Verification Layers

1. Every skill-side citation of `reports/prose-quality-instructions.md` is replaced with the corresponding `docs/prose-renderer-contract/<file>.md` reference → codebase grep-proof: `grep -rn "reports/prose-quality-instructions.md" /home/joeloverbeck/projects/worldloom/.claude/skills` returns empty (excluding archive paths).
2. The `_shared-templates/story-state-contract.md` §8 table's §2 / §3 / §19 source rows now name the three new files → manual review of the table.
3. The branching-story skills still author the same page-plan §2 / §3 / §19 sections with the same bytes → no functional regression because the source bytes were copied byte-identically by PROSESPLIT2-001; the inlining instruction now points at the new path.
4. Reading both branching-story skills' SKILL.md + references end-to-end exposes no remaining "`reports/prose-quality-instructions.md`" string and no orphaned "§Content Policy / §Prose Craft Contract / §Render-Time Instruction Template" mention that no longer has a file association → manual review.

## Landed Changes

### 1. `_shared-templates/story-state-contract.md` §8 Page Plan Minimum Contract table

Updated rows for §2, §3, §19:

- §2 source cell: `inlined verbatim from docs/prose-renderer-contract/content-policy.md`
- §3 source cell: `inlined verbatim from docs/prose-renderer-contract/prose-craft-contract.md`
- §19 source cell: `inlined verbatim from docs/prose-renderer-contract/render-time-instruction.md`

Left the paragraph at lines 452 ("§2, §3, and §19 are inlined verbatim on every page plan...") unchanged — the load-bearing-rationale prose is path-agnostic.

### 2. `branching-story-bootstrap/SKILL.md`

- Replaced the pre-flight canonical sources list with the three `docs/prose-renderer-contract/*` files.
- Replaced Phases 1-9 completion language, Phase 8 instruction language, and the verbatim §2 / §3 / §19 guardrail bullet with the three-file source form.

### 3. `branching-story-bootstrap/references/pre-flight-and-prerequisites.md`

- Split the canonical-source bullet into three bullets, one per file:

  ```markdown
  - `docs/prose-renderer-contract/content-policy.md` — canonical source for the page plan's verbatim §2 (Content Policy)
  - `docs/prose-renderer-contract/prose-craft-contract.md` — canonical source for the page plan's verbatim §3 (Prose Craft Contract)
  - `docs/prose-renderer-contract/render-time-instruction.md` — canonical source for the page plan's verbatim §19 (Render-Time Instruction Template)
  ```

- Updated the load instruction to load the three renderer-contract files instead of the report bundle.

### 4. `branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md`

- Updated the verbatim §2 / §3 / §19 paragraph to cite `docs/prose-renderer-contract/content-policy.md`, `docs/prose-renderer-contract/prose-craft-contract.md`, and `docs/prose-renderer-contract/render-time-instruction.md` respectively.

### 5. `branching-story-bootstrap/references/governance-and-foundations.md`

- Updated the verbatim §2 / §3 / §19 bullet to cite the three new files.

### 6. `branching-story-turn-cycle/SKILL.md`

Applied the same three-file replacement pattern as the bootstrap SKILL.md changes in Phases 0-9 completion language, Phase 7 step instruction, and the verbatim §2 / §3 / §19 guardrail bullet.

### 7. `branching-story-turn-cycle/references/pre-flight-and-prerequisites.md`

- Split the canonical-source bullet into three bullets per the bootstrap pre-flight pattern in change §3.
- Updated the load instruction to load the three renderer-contract files instead of the report bundle.

### 8. `branching-story-turn-cycle/references/phase-7-page-plan.md`

- Updated the verbatim §2 / §3 / §19 paragraph with the same three-file source form as the bootstrap phase-8-9 reference in change §4.

### 9. `branching-story-turn-cycle/references/governance-and-foundations.md`

- Updated the verbatim §2 / §3 / §19 bullet with the same three-file source form as the bootstrap governance-and-foundations bullet in change §5.

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

- Updating `docs/FOUNDATIONS.md:714`, `specs/IMPLEMENTATION-ORDER.md:18`, or `.claude/skills/brainstorm/references/triage-workflow-rules.md:92`. Belongs to PROSESPLIT2-003. `AGENTS.md` has no literal old-path reference in this checkout.
- Deleting `reports/prose-quality-instructions.md`. Belongs to PROSESPLIT2-004.
- Adding the byte-equality test. Belongs to PROSESPLIT2-005.
- Changing the verbatim-inlining contract itself (the rule that §2 / §3 / §19 ship byte-for-byte every page). Out of scope for PROSESPLIT2 entirely; user-confirmed load-bearing 2026-05-12 per the feedback memory `page_plan_verbatim_sections`.
- Modifying anything inside `pages-prose-plans/PG-*.md` on disk (existing plans retain the bytes they were written with; the new contract is forward-only).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -rn "reports/prose-quality-instructions" .claude/skills/_shared-templates/ .claude/skills/branching-story-bootstrap/ .claude/skills/branching-story-turn-cycle/` returns empty after this ticket lands.
2. `grep -rn "docs/prose-renderer-contract" .claude/skills/_shared-templates/story-state-contract.md` returns exactly 3 lines (one for each of §2 / §3 / §19 in the §8 table).
3. `grep -rn "docs/prose-renderer-contract" .claude/skills/branching-story-bootstrap/ .claude/skills/branching-story-turn-cycle/` returns at least 10 lines (every SKILL.md site + every references/* site listed in the Files to Touch).
4. Manual review confirms both branching-story skills still author the same page-plan §2 / §3 / §19 sections with the same verbatim-inlining contract, now sourced from the three split files.
5. `git diff --check -- .claude/skills/_shared-templates/story-state-contract.md .claude/skills/branching-story-bootstrap .claude/skills/branching-story-turn-cycle archive/tickets/PROSESPLIT2-002.md` passes.

### Invariants

1. After this ticket, no owned skill body or shared template references `reports/prose-quality-instructions.md` by path. Remaining live non-skill references are owned by PROSESPLIT2-003; deletion of the source report is owned by PROSESPLIT2-004.
2. The §2 / §3 / §19 verbatim-inlining contract is unchanged. The bytes that get inlined into each newly-authored page plan are byte-identical to the bytes copied by PROSESPLIT2-001 (which were byte-identical to the original report).
3. Page plans on disk authored before this ticket continue to validate — they ship the original byte-content (now identical to the canonical content under the new path).

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is the grep-proof in Acceptance Criteria Tests That Must Pass §1-§3, manual review in §4, and `git diff --check` in §5. Structural byte-equality validator lands in PROSESPLIT2-005 and exercises the new paths.

### Commands

1. `grep -rn "reports/prose-quality-instructions" .claude/skills/_shared-templates/ .claude/skills/branching-story-bootstrap/ .claude/skills/branching-story-turn-cycle/` — should return empty.
2. `grep -rn "docs/prose-renderer-contract" .claude/skills/_shared-templates/story-state-contract.md | wc -l` — should return `3`.
3. `grep -rn "docs/prose-renderer-contract" .claude/skills/branching-story-bootstrap/ .claude/skills/branching-story-turn-cycle/ | wc -l` — should return at least `10`; this run returned `19`.
4. `git diff --check -- .claude/skills/_shared-templates/story-state-contract.md .claude/skills/branching-story-bootstrap .claude/skills/branching-story-turn-cycle archive/tickets/PROSESPLIT2-002.md` — whitespace/patch hygiene.

## Outcome

Completion date: 2026-05-26.

Rewired the shared page-plan minimum contract and both branching-story skills from the old report bundle to the three split canonical-source files:

- §2 Content Policy now cites `docs/prose-renderer-contract/content-policy.md`.
- §3 Prose Craft Contract now cites `docs/prose-renderer-contract/prose-craft-contract.md`.
- §19 Render-Time Instruction Template now cites `docs/prose-renderer-contract/render-time-instruction.md`.

The verbatim-inlining rule is unchanged. PROSESPLIT2-003, PROSESPLIT2-004, and PROSESPLIT2-005 remain active and untouched.

## Verification Result

1. `grep -rn "reports/prose-quality-instructions" .claude/skills/_shared-templates/ .claude/skills/branching-story-bootstrap/ .claude/skills/branching-story-turn-cycle/` — PASS; command returned no matches (exit 1 from grep is the expected no-match signal).
2. `grep -rn "docs/prose-renderer-contract" .claude/skills/_shared-templates/story-state-contract.md | wc -l` — PASS; returned `3`.
3. `grep -rn "docs/prose-renderer-contract" .claude/skills/branching-story-bootstrap/ .claude/skills/branching-story-turn-cycle/ | wc -l` — PASS; returned `19`.
4. `rg -n 'reports/prose-quality-instructions|prose-quality-instructions.md|§Content Policy|§Prose Craft Contract|§Render-Time Instruction Template' .claude/skills/_shared-templates/story-state-contract.md .claude/skills/branching-story-bootstrap .claude/skills/branching-story-turn-cycle` — PASS; command returned no matches (exit 1 from `rg` is the expected no-match signal), confirming no old report path or section-anchor citation remains in the owned skill/template surfaces.
5. Manual review of `.claude/skills/_shared-templates/story-state-contract.md`, `.claude/skills/branching-story-bootstrap/SKILL.md`, `.claude/skills/branching-story-bootstrap/references/*`, `.claude/skills/branching-story-turn-cycle/SKILL.md`, and `.claude/skills/branching-story-turn-cycle/references/*` — PASS; the authoring contract still requires verbatim §2 / §3 / §19 inlining and only the source paths changed.
6. `git diff --check -- .claude/skills/_shared-templates/story-state-contract.md .claude/skills/branching-story-bootstrap .claude/skills/branching-story-turn-cycle archive/tickets/PROSESPLIT2-002.md` — PASS; no whitespace errors.

## Deviations

- `pnpm turbo lint` and `pnpm turbo typecheck` were not accepted as final gates because this checkout has no root `package.json`, no root pnpm workspace manifest, and pnpm reports `Command "turbo" not found` for both commands. The ticket is markdown-only, so the accepted final proof is the focused grep/manual-review surface plus `git diff --check`.
- HARD-GATE read was performed during implementation because two source-list substitutions are inside existing `<HARD-GATE>` blocks. The edits preserve gate order, approval timing, failure handling, validation-trace semantics, patch-plan submission, and approval-token behavior.
