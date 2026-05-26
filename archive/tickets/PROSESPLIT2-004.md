# PROSESPLIT2-004: Verify §Anti-Pathology Checklist / §Voice and Register Guidance are unreferenced; delete `reports/prose-quality-instructions.md`

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — deletes `reports/prose-quality-instructions.md`; appends a verification-basis note to `docs/prose-renderer-contract/README.md` recording which sections were dropped and why
**Deps**: archive/tickets/PROSESPLIT2-001.md (canonical-source files in place), archive/tickets/PROSESPLIT2-002.md (skill-side references migrated), archive/tickets/PROSESPLIT2-003.md (FOUNDATIONS / IMPL-ORDER / brainstorm refs migrated). All three must land first or this ticket leaves dangling references.

## Problem

Approach C chose to drop two sub-sections of the original bundle as redundant duplicates:

- **§Anti-Pathology Checklist** (lines 227-245) is a reformulation of the Diagnostic Vocabulary table that already lives inside §Prose Craft Contract. SPEC-91 (archived, COMPLETED 2026-05-26) already directed plain-language craft framing rather than axis-name enumeration in renderer prompts — the §Anti-Pathology Checklist's value is operator-facing reformulation, not new content.
- **§Voice and Register Guidance** (lines 249-259) is Rule 7 of the Prose Craft Contract extracted as a standalone reminder. The content is duplicated verbatim from Rule 7; standalone duplication is exactly the drift surface FOUNDATIONS §LLM-facing Skill Prose Discipline argues against.

Dropping content is irreversible (without git history). This ticket VERIFIES the two sections have no skill-side or live-doc file-path consumer before deletion, then deletes the bundle source file. The verification is a grep-proof: any `.claude/skills/**/*.md`, `docs/**/*.md`, `specs/**/*.md`, or `tools/**/*.ts` file that references these section names AS PART OF A FILE-PATH CITATION targeting `reports/prose-quality-instructions.md` would block the deletion until the citation is migrated. Section names that appear in prose discussion of the rules (e.g., "Rule 7 says…") are fine — they reference the canonical content, which now lives in `prose-craft-contract.md`.

After the deletion, `reports/prose-quality-instructions.md` no longer exists. The file's bytes are recoverable via git history if anyone later disputes a deletion call.

## Assumption Reassessment (2026-05-26)

1. At intake, `reports/prose-quality-instructions.md` existed at the cited path and was 279 lines. After this ticket, the file is deleted; all live-canon citations resolve to `docs/prose-renderer-contract/*`, and the README records the dropped-section decision plus git-history recovery path.
2. **§Anti-Pathology Checklist verification**: the drafted broad section-name grep is too broad in this checkout because it also finds legitimate page-plan §18 headings under `worlds/*/pages-prose-plans/` and a pre-existing untracked `.claude/worktrees/spec89stoexpsta/` copy. The blocking invariant is narrower: no live operational file may cite the dropped section by old report file path. Source-of-truth grep:

   `grep -rn "reports/prose-quality-instructions.md.*Anti-Pathology Checklist\|reports/prose-quality-instructions.md.*anti-pathology checklist\|Anti-Pathology Checklist.*reports/prose-quality-instructions.md\|anti-pathology checklist.*reports/prose-quality-instructions.md" /home/joeloverbeck/projects/worldloom --include="*.md" --include="*.ts" | grep -v "/archive/" | grep -v "/docs/triage/" | grep -v "/docs/plans/" | grep -v "/reports/page-plans-improvements" | grep -v "/tickets/PROSESPLIT2-" | grep -v "/.claude/worktrees/"`

   Expected result: no matches (grep exit 1 is the expected no-match signal). Non-blocking broad discovery hits remain:
   - `.claude/skills/_shared-templates/story-state-contract.md` §8 page-plan §18 row (`Anti-pathology checklist | per-skill`) — page-plan §18 is per-skill populated; the section name describes the page-plan section, not a file-path citation back to the old bundle.
   - `.claude/skills/branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md` (if it mentions §18) — same shape.
   - `worlds/*/stories/*/pages-prose-plans/PG-*.md` page-plan headings — authored plan content, not source-file citations.
   - `.claude/worktrees/spec89stoexpsta/` — pre-existing untracked nested worktree copy, excluded from this repo-root deletion proof.
   - Tickets PROSESPLIT2-001..005 themselves (transient citations during the migration).
   
   Any UNEXPECTED match — particularly one of the form `reports/prose-quality-instructions.md §Anti-Pathology Checklist` — blocks deletion until migrated.
3. **§Voice and Register Guidance verification**: source-of-truth grep:

   `grep -rn "reports/prose-quality-instructions.md.*Voice and Register Guidance\|reports/prose-quality-instructions.md.*voice and register guidance\|Voice and Register Guidance.*reports/prose-quality-instructions.md\|voice and register guidance.*reports/prose-quality-instructions.md" /home/joeloverbeck/projects/worldloom --include="*.md" --include="*.ts" | grep -v "/archive/" | grep -v "/docs/triage/" | grep -v "/docs/plans/" | grep -v "/reports/page-plans-improvements" | grep -v "/tickets/PROSESPLIT2-" | grep -v "/.claude/worktrees/"`

   Expected result: no matches (grep exit 1 is the expected no-match signal). The section has no skill-side file-path consumer. Any external old-report citation blocks deletion.
4. **§External-Renderer Usage Guide verification**: source-of-truth grep:

   `grep -rn "reports/prose-quality-instructions.md.*External-Renderer Usage Guide\|reports/prose-quality-instructions.md.*external-renderer usage guide\|External-Renderer Usage Guide.*reports/prose-quality-instructions.md\|external-renderer usage guide.*reports/prose-quality-instructions.md" /home/joeloverbeck/projects/worldloom --include="*.md" --include="*.ts" | grep -v "/archive/" | grep -v "/docs/triage/" | grep -v "/docs/plans/" | grep -v "/reports/page-plans-improvements" | grep -v "/tickets/PROSESPLIT2-" | grep -v "/.claude/worktrees/"`

   Expected result: no matches (grep exit 1 is the expected no-match signal). `docs/prose-renderer-contract/README.md` itself remains the canonical live location for the absorbed content.
5. Cross-skill boundary: this ticket's only mutation is deletion + a note append to the README. The shared boundary is `docs/prose-renderer-contract/` as the canonical-source location; deletion of the bundle does not change the boundary (the boundary moved at PROSESPLIT2-001).
6. FOUNDATIONS principle: §LLM-facing Skill Prose Discipline argues against standalone duplicates that compete with a single canonical source. Dropping §Anti-Pathology Checklist (duplicate of Diagnostic Vocabulary table inside `prose-craft-contract.md`) and §Voice and Register Guidance (duplicate of Rule 7 inside `prose-craft-contract.md`) actively honors this principle.
7. **Recovery path**: if the deletion is later disputed, `git show b0955a8da4e89716067d63c4aaf805aacfb69bfc:reports/prose-quality-instructions.md` returns the bytes verbatim; a follow-up ticket can resurrect any section as a new file under `docs/prose-renderer-contract/`. The deletion is reversible-via-git, not reversible-in-place.
8. The drafted `pnpm turbo lint && pnpm turbo typecheck` proof remains unavailable in this checkout: both `pnpm turbo lint` and `pnpm turbo typecheck` fail with `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command "turbo" not found`. This is the same repo-root package-boundary deviation recorded by PROSESPLIT2-002 and PROSESPLIT2-003; accepted proof is markdown grep/manual review plus `git diff --check`.

## Architecture Check

1. Delete-after-verify is cleaner than keep-as-shim because a kept shim invites drift — future Claude sessions reading the bundle would re-cite the old path. A clean deletion forces every new reference to point at the canonical-source folder, which is the post-condition the user requested.
2. No backwards-compatibility aliasing/shims — `reports/prose-quality-instructions.md` is deleted, not symlinked. Historical references in dated `docs/triage/*` / `docs/plans/*` / `archive/*` continue to cite the path; their references resolve through git history rather than through a live file.

## Verification Layers

1. §Anti-Pathology Checklist is not file-path-referenced through `reports/prose-quality-instructions.md` by any live operational surface → grep-proof (Assumption Reassessment §2).
2. §Voice and Register Guidance is not file-path-referenced through `reports/prose-quality-instructions.md` by any live operational surface → grep-proof (Assumption Reassessment §3).
3. §External-Renderer Usage Guide content is preserved (absorbed into the folder README by PROSESPLIT2-001) and no live operational surface still cites the old report section → grep-proof (Assumption Reassessment §4).
4. After deletion, the only remaining `reports/prose-quality-instructions` matches in the live codebase outside historical/ticket/worktree surfaces are the SPEC-91 historical note in `specs/IMPLEMENTATION-ORDER.md` and the new recovery/audit note in `docs/prose-renderer-contract/README.md` → grep-proof.

## Landed Changes

### 1. Verification grep

Ran all three greps from Assumption Reassessment §2-§4. All returned no matches, so no `reports/prose-quality-instructions.md §<Section>` citation in a live operational file blocked deletion.

The broad section-name discovery was intentionally not used as the deletion gate because it finds legitimate page-plan §18 headings, ticket prose, and the pre-existing untracked nested worktree copy.

### 2. Appended verification-basis note to `docs/prose-renderer-contract/README.md`

Added a new section at the end of the README:

```markdown
## Sections dropped from the pre-2026-05-26 bundle

The pre-relocation bundle at `reports/prose-quality-instructions.md` (deleted 2026-05-26 by PROSESPLIT2-004) contained three additional sub-sections that were dropped in the relocation as redundant duplicates of content elsewhere in this folder:

- **§Anti-Pathology Checklist**: reformulation of the Diagnostic Vocabulary table at the end of `prose-craft-contract.md`. Page-plan §18 ("Anti-pathology checklist") is per-skill populated; no live consumer cited the bundle's §Anti-Pathology Checklist by file path. SPEC-91 (archived 2026-05-26) already directed plain-language craft framing rather than axis-name enumeration in renderer prompts.
- **§Voice and Register Guidance**: standalone restatement of Prose Craft Contract Rule 7. The substance lives verbatim at `prose-craft-contract.md` §Rule 7; no live consumer cited the bundle's §Voice and Register Guidance by file path.
- **§External-Renderer Usage Guide**: operator documentation for how the rendered plan body is consumed. Absorbed into this README's earlier section by PROSESPLIT2-001.

The bytes of all three sections remain recoverable via `git show b0955a8da4e89716067d63c4aaf805aacfb69bfc:reports/prose-quality-instructions.md`. If a future workflow surfaces a need for any dropped section as a standalone file, recovery is a follow-up ticket — not a backwards-compatibility concern of this folder's contract.
```

### 3. Deleted `reports/prose-quality-instructions.md`

After the verification grep passed and the README note was appended, deleted the tracked source file. The deletion is present in the working tree for review; no commit was made.

## Files to Touch

- `reports/prose-quality-instructions.md` (delete)
- `docs/prose-renderer-contract/README.md` (modify — append verification-basis section)

## Out of Scope

- Editing dated historical decision records (`docs/triage/*`, `docs/plans/*`, `archive/*`, `reports/page-plans-improvements-first-iteration.md`). Their references continue to cite the prior path; git history preserves the bytes.
- Deleting or modifying any file under `docs/prose-renderer-contract/` other than the README note append.
- Restoring or re-creating §Anti-Pathology Checklist / §Voice and Register Guidance as standalone files. The Approach C decision drops them; recovery is a follow-up ticket if ever needed.
- Adding the byte-equality test. Belongs to PROSESPLIT2-005.

## Acceptance Criteria

### Tests That Must Pass

1. The three old-report file-path citation greps in Assumption Reassessment §2-§4 produce no matches; no UNEXPECTED citation blocks deletion.
2. After deletion: `test ! -f /home/joeloverbeck/projects/worldloom/reports/prose-quality-instructions.md` succeeds (the file is gone).
3. After deletion: `grep -rn "reports/prose-quality-instructions" /home/joeloverbeck/projects/worldloom --include="*.md" --include="*.ts" | grep -v "/archive/" | grep -v "/docs/triage/" | grep -v "/docs/plans/" | grep -v "/reports/page-plans-improvements" | grep -v "/tickets/PROSESPLIT2-" | grep -v "/.claude/worktrees/"` returns only the SPEC-91 historical-note row in `specs/IMPLEMENTATION-ORDER.md` plus the intentional README audit/recovery-note rows.
4. `docs/prose-renderer-contract/README.md` ends with the verification-basis "Sections dropped from the pre-2026-05-26 bundle" section, naming the three dropped sub-sections and citing the git-recovery path.
5. `pnpm turbo lint && pnpm turbo typecheck` are not available in this checkout; accepted verification is the markdown grep/manual-review surface plus `git diff --check`.
6. `git status` shows one deletion (`reports/prose-quality-instructions.md`), one README modification (`docs/prose-renderer-contract/README.md`), and this completed ticket update, with the pre-existing unrelated `.claude/worktrees/` directory left untouched.

### Invariants

1. After PROSESPLIT2-001..004, no live operational surface references `reports/prose-quality-instructions.md` by file path other than the SPEC-91 historical-note line in `specs/IMPLEMENTATION-ORDER.md` and this ticket's README audit/recovery note.
2. The three renderer-bound canonical-source files at `docs/prose-renderer-contract/{content-policy,prose-craft-contract,render-time-instruction}.md` carry byte-identical content to the pre-deletion bundle's three corresponding sections.
3. The README's audit-trail note documents which sub-sections were dropped, why, and how to recover them — preserving the deletion's decision record for future readers.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is the grep-proofs in Assumption Reassessment §2-§4, the post-condition grep-proof in Acceptance Criteria Tests That Must Pass §3, README manual review, and git diff hygiene. The drafted root lint/typecheck lane is unavailable in this checkout. The structural byte-equality test lands in PROSESPLIT2-005 and exercises the canonical-source files (now the sole authoritative location).`

### Commands

1. `grep -rn "reports/prose-quality-instructions.md.*Anti-Pathology Checklist\|reports/prose-quality-instructions.md.*anti-pathology checklist\|Anti-Pathology Checklist.*reports/prose-quality-instructions.md\|anti-pathology checklist.*reports/prose-quality-instructions.md" /home/joeloverbeck/projects/worldloom --include="*.md" --include="*.ts" | grep -v "/archive/" | grep -v "/docs/triage/" | grep -v "/docs/plans/" | grep -v "/reports/page-plans-improvements" | grep -v "/tickets/PROSESPLIT2-" | grep -v "/.claude/worktrees/"` — verification grep §2; no matches is PASS.
2. `grep -rn "reports/prose-quality-instructions.md.*Voice and Register Guidance\|reports/prose-quality-instructions.md.*voice and register guidance\|Voice and Register Guidance.*reports/prose-quality-instructions.md\|voice and register guidance.*reports/prose-quality-instructions.md" /home/joeloverbeck/projects/worldloom --include="*.md" --include="*.ts" | grep -v "/archive/" | grep -v "/docs/triage/" | grep -v "/docs/plans/" | grep -v "/reports/page-plans-improvements" | grep -v "/tickets/PROSESPLIT2-" | grep -v "/.claude/worktrees/"` — verification grep §3; no matches is PASS.
3. `grep -rn "reports/prose-quality-instructions.md.*External-Renderer Usage Guide\|reports/prose-quality-instructions.md.*external-renderer usage guide\|External-Renderer Usage Guide.*reports/prose-quality-instructions.md\|external-renderer usage guide.*reports/prose-quality-instructions.md" /home/joeloverbeck/projects/worldloom --include="*.md" --include="*.ts" | grep -v "/archive/" | grep -v "/docs/triage/" | grep -v "/docs/plans/" | grep -v "/reports/page-plans-improvements" | grep -v "/tickets/PROSESPLIT2-" | grep -v "/.claude/worktrees/"` — verification grep §4; no matches is PASS.
4. `test ! -f /home/joeloverbeck/projects/worldloom/reports/prose-quality-instructions.md` — deletion confirmation.
5. `grep -rn "reports/prose-quality-instructions" /home/joeloverbeck/projects/worldloom --include="*.md" --include="*.ts" | grep -v "/archive/" | grep -v "/docs/triage/" | grep -v "/docs/plans/" | grep -v "/reports/page-plans-improvements" | grep -v "/tickets/PROSESPLIT2-" | grep -v "/.claude/worktrees/"` — post-deletion confirmation grep; expected remaining matches are `specs/IMPLEMENTATION-ORDER.md` and `docs/prose-renderer-contract/README.md`.
6. `pnpm turbo lint` and `pnpm turbo typecheck` — attempted full-pipeline confirmation; both fail in this checkout with `Command "turbo" not found`.

## Outcome

Completion date: 2026-05-26.

Deleted the obsolete `reports/prose-quality-instructions.md` bundle after confirming no live operational surface cites the dropped sections by old report file path. Appended the README audit note documenting the three dropped sections, their canonical replacement locations, and the exact git-history recovery command.

The canonical renderer contract surface is now only `docs/prose-renderer-contract/{content-policy,prose-craft-contract,render-time-instruction}.md` plus the folder README.

## Verification Result

1. Old-report §Anti-Pathology Checklist file-path citation grep from Assumption Reassessment §2 — PASS; returned no matches (grep exit 1 is the expected no-match signal).
2. Old-report §Voice and Register Guidance file-path citation grep from Assumption Reassessment §3 — PASS; returned no matches (grep exit 1 is the expected no-match signal).
3. Old-report §External-Renderer Usage Guide file-path citation grep from Assumption Reassessment §4 — PASS; returned no matches (grep exit 1 is the expected no-match signal).
4. `test ! -f /home/joeloverbeck/projects/worldloom/reports/prose-quality-instructions.md` — PASS.
5. Post-deletion old-path grep from Test Plan §5 — PASS; remaining live non-ticket/non-worktree matches are the SPEC-91 historical-note row in `specs/IMPLEMENTATION-ORDER.md` and the intentional README audit/recovery-note rows.
6. Manual review of `docs/prose-renderer-contract/README.md` — PASS; it ends with "Sections dropped from the pre-2026-05-26 bundle" and names all three dropped sub-sections plus the recovery command.
7. `pnpm turbo lint` — NOT AVAILABLE; pnpm reports `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command "turbo" not found`.
8. `pnpm turbo typecheck` — NOT AVAILABLE; pnpm reports `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command "turbo" not found`.
9. `git diff --check -- docs/prose-renderer-contract/README.md reports/prose-quality-instructions.md archive/tickets/PROSESPLIT2-004.md` — PASS after archival path repair; no whitespace errors.

## Deviations

- The drafted broad section-name greps were narrowed to old-report file-path citation greps. The broad Anti-Pathology discovery finds legitimate page-plan §18 headings under `worlds/*/pages-prose-plans/` and a pre-existing untracked `.claude/worktrees/spec89stoexpsta/` copy; neither is a live citation to the old bundle's dropped section.
- The post-deletion old-path grep intentionally returns `docs/prose-renderer-contract/README.md` because this ticket added an audit/recovery note naming the deleted path. That README hit is not a stale consumer reference.
- The drafted root `pnpm turbo lint && pnpm turbo typecheck` gate remains unavailable in this checkout because there is no root turbo command. This markdown-only ticket accepts focused grep/manual-review proof plus `git diff --check`.
