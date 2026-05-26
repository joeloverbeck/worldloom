# PROSESPLIT2-004: Verify §Anti-Pathology Checklist / §Voice and Register Guidance are unreferenced; delete `reports/prose-quality-instructions.md`

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — deletes `reports/prose-quality-instructions.md`; appends a verification-basis note to `docs/prose-renderer-contract/README.md` recording which sections were dropped and why
**Deps**: archive/tickets/PROSESPLIT2-001.md (canonical-source files in place), PROSESPLIT2-002 (skill-side references migrated), PROSESPLIT2-003 (FOUNDATIONS / IMPL-ORDER / brainstorm refs migrated). All three must land first or this ticket leaves dangling references.

## Problem

Approach C chose to drop two sub-sections of the original bundle as redundant duplicates:

- **§Anti-Pathology Checklist** (lines 227-245) is a reformulation of the Diagnostic Vocabulary table that already lives inside §Prose Craft Contract. SPEC-91 (archived, COMPLETED 2026-05-26) already directed plain-language craft framing rather than axis-name enumeration in renderer prompts — the §Anti-Pathology Checklist's value is operator-facing reformulation, not new content.
- **§Voice and Register Guidance** (lines 249-259) is Rule 7 of the Prose Craft Contract extracted as a standalone reminder. The content is duplicated verbatim from Rule 7; standalone duplication is exactly the drift surface FOUNDATIONS §LLM-facing Skill Prose Discipline argues against.

Dropping content is irreversible (without git history). This ticket VERIFIES the two sections have no skill-side or live-doc file-path consumer before deletion, then deletes the bundle source file. The verification is a grep-proof: any `.claude/skills/**/*.md`, `docs/**/*.md`, `specs/**/*.md`, or `tools/**/*.ts` file that references these section names AS PART OF A FILE-PATH CITATION targeting `reports/prose-quality-instructions.md` would block the deletion until the citation is migrated. Section names that appear in prose discussion of the rules (e.g., "Rule 7 says…") are fine — they reference the canonical content, which now lives in `prose-craft-contract.md`.

After the deletion, `reports/prose-quality-instructions.md` no longer exists. The file's bytes are recoverable via git history if anyone later disputes a deletion call.

## Assumption Reassessment (2026-05-26)

1. `reports/prose-quality-instructions.md` exists at the cited path and is 279 lines (verified). After PROSESPLIT2-001..003 land, all live-canon citations resolve to `docs/prose-renderer-contract/*`; the file retains only the (deleted) section content itself.
2. **§Anti-Pathology Checklist verification**: `grep -rn "Anti-Pathology Checklist\|anti-pathology checklist" /home/joeloverbeck/projects/worldloom --include="*.md" --include="*.ts" | grep -v "/archive/" | grep -v "/docs/triage/" | grep -v "/docs/plans/" | grep -v "/reports/page-plans-improvements"` is the source-of-truth grep. Expected matches (which do NOT block deletion):
   - `.claude/skills/_shared-templates/story-state-contract.md` §8 page-plan §18 row (`Anti-pathology checklist | per-skill`) — page-plan §18 is per-skill populated; the section name describes the page-plan section, not a file-path citation back to the old bundle.
   - `.claude/skills/branching-story-bootstrap/references/phase-8-9-page-plan-and-choices.md` (if it mentions §18) — same shape.
   - Tickets PROSESPLIT2-001..005 themselves (transient citations during the migration).
   
   Any UNEXPECTED match — particularly one of the form `reports/prose-quality-instructions.md §Anti-Pathology Checklist` — blocks deletion until migrated.
3. **§Voice and Register Guidance verification**: `grep -rn "Voice and Register Guidance\|voice and register guidance" /home/joeloverbeck/projects/worldloom --include="*.md" --include="*.ts" | grep -v "/archive/" | grep -v "/docs/triage/" | grep -v "/docs/plans/" | grep -v "/reports/page-plans-improvements"` is the source-of-truth grep. The expected match shape is empty or self-only — the section has no skill-side file-path consumer. Any external citation blocks deletion.
4. **§External-Renderer Usage Guide verification**: `grep -rn "External-Renderer Usage Guide\|external-renderer usage guide" /home/joeloverbeck/projects/worldloom --include="*.md" --include="*.ts" | grep -v "/archive/" | grep -v "/docs/triage/" | grep -v "/docs/plans/" | grep -v "/reports/page-plans-improvements"` is the source-of-truth grep. Expected match: `docs/prose-renderer-contract/README.md` itself (the folder README absorbed the content via PROSESPLIT2-001).
5. Cross-skill boundary: this ticket's only mutation is deletion + a note append to the README. The shared boundary is `docs/prose-renderer-contract/` as the canonical-source location; deletion of the bundle does not change the boundary (the boundary moved at PROSESPLIT2-001).
6. FOUNDATIONS principle: §LLM-facing Skill Prose Discipline argues against standalone duplicates that compete with a single canonical source. Dropping §Anti-Pathology Checklist (duplicate of Diagnostic Vocabulary table inside `prose-craft-contract.md`) and §Voice and Register Guidance (duplicate of Rule 7 inside `prose-craft-contract.md`) actively honors this principle.
7. **Recovery path**: if the deletion is later disputed, `git show <pre-delete-commit>:reports/prose-quality-instructions.md` returns the bytes verbatim; a follow-up ticket can resurrect any section as a new file under `docs/prose-renderer-contract/`. The deletion is reversible-via-git, not reversible-in-place.

## Architecture Check

1. Delete-after-verify is cleaner than keep-as-shim because a kept shim invites drift — future Claude sessions reading the bundle would re-cite the old path. A clean deletion forces every new reference to point at the canonical-source folder, which is the post-condition the user requested.
2. No backwards-compatibility aliasing/shims — `reports/prose-quality-instructions.md` is deleted, not symlinked. Historical references in dated `docs/triage/*` / `docs/plans/*` / `archive/*` continue to cite the path; their references resolve through git history rather than through a live file.

## Verification Layers

1. §Anti-Pathology Checklist is not file-path-referenced by any live skill, template, FOUNDATIONS, or spec → grep-proof (Assumption Reassessment §2).
2. §Voice and Register Guidance is not file-path-referenced by any live skill, template, FOUNDATIONS, or spec → grep-proof (Assumption Reassessment §3).
3. §External-Renderer Usage Guide content is preserved (absorbed into the folder README by PROSESPLIT2-001) and the README is the only reference site → grep-proof (Assumption Reassessment §4).
4. After deletion, the only remaining `reports/prose-quality-instructions` matches in the live codebase live in dated historical decision records and the IMPLEMENTATION-ORDER.md historical note added by PROSESPLIT2-003 → grep-proof: `grep -rn "reports/prose-quality-instructions" /home/joeloverbeck/projects/worldloom --include="*.md" --include="*.ts" | grep -v "/archive/" | grep -v "/docs/triage/" | grep -v "/docs/plans/" | grep -v "/reports/page-plans-improvements"` returns at most the IMPL-ORDER historical-note line + (transiently) tickets/PROSESPLIT2-*.md.

## What to Change

### 1. Verification grep (executed first; blocks deletion on UNEXPECTED match)

Run all three greps from Assumption Reassessment §2-§4. The expected match shape for each is documented inline. ANY unexpected match — particularly a `reports/prose-quality-instructions.md §<Section>` citation in a live (non-archive, non-historical-triage, non-plans) doc — blocks the deletion and triggers a follow-up migration step within this ticket's scope.

If the verification surfaces an unexpected citation, that citation must be migrated to point at the corresponding canonical-source location (per-section mapping: §Anti-Pathology Checklist → `docs/prose-renderer-contract/prose-craft-contract.md` Diagnostic Vocabulary table; §Voice and Register Guidance → `docs/prose-renderer-contract/prose-craft-contract.md` Rule 7; §External-Renderer Usage Guide → `docs/prose-renderer-contract/README.md`) BEFORE deletion proceeds.

### 2. Append verification-basis note to `docs/prose-renderer-contract/README.md`

Add a new section at the end of the README:

```markdown
## Sections dropped from the pre-2026-05-26 bundle

The pre-relocation bundle at `reports/prose-quality-instructions.md` (deleted 2026-MM-DD by PROSESPLIT2-004) contained three additional sub-sections that were dropped in the relocation as redundant duplicates of content elsewhere in this folder:

- **§Anti-Pathology Checklist**: reformulation of the Diagnostic Vocabulary table at the end of `prose-craft-contract.md`. Page-plan §18 ("Anti-pathology checklist") is per-skill populated; no live consumer cited the bundle's §Anti-Pathology Checklist by file path. SPEC-91 (archived 2026-05-26) already directed plain-language craft framing rather than axis-name enumeration in renderer prompts.
- **§Voice and Register Guidance**: standalone restatement of Prose Craft Contract Rule 7. The substance lives verbatim at `prose-craft-contract.md` §Rule 7; no live consumer cited the bundle's §Voice and Register Guidance by file path.
- **§External-Renderer Usage Guide**: operator documentation for how the rendered plan body is consumed. Absorbed into this README's earlier section by PROSESPLIT2-001.

The bytes of all three sections remain recoverable via `git show <pre-delete-commit>:reports/prose-quality-instructions.md`. If a future workflow surfaces a need for any dropped section as a standalone file, recovery is a follow-up ticket — not a backwards-compatibility concern of this folder's contract.
```

Replace `<pre-delete-commit>` with the actual SHA at implementation time (or the descriptive form `the commit prior to the one that lands PROSESPLIT2-004`).

### 3. Delete `reports/prose-quality-instructions.md`

After the verification grep passes (no unexpected citations) and the README note is appended, delete the file via `rm reports/prose-quality-instructions.md`. Stage the deletion for review; do not commit.

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

1. The three verification greps in Assumption Reassessment §2-§4 produce only EXPECTED matches; no UNEXPECTED citation blocks deletion.
2. After deletion: `test ! -f /home/joeloverbeck/projects/worldloom/reports/prose-quality-instructions.md` succeeds (the file is gone).
3. After deletion: `grep -rn "reports/prose-quality-instructions" /home/joeloverbeck/projects/worldloom --include="*.md" --include="*.ts" | grep -v "/archive/" | grep -v "/docs/triage/" | grep -v "/docs/plans/" | grep -v "/reports/page-plans-improvements" | grep -v "/tickets/PROSESPLIT2-"` returns at most the IMPL-ORDER historical-note line (preserved verbatim from PROSESPLIT2-003).
4. `docs/prose-renderer-contract/README.md` ends with the verification-basis "Sections dropped from the pre-2026-05-26 bundle" section, naming the three dropped sub-sections and citing the git-recovery path.
5. `pnpm turbo lint && pnpm turbo typecheck` continue to pass — this ticket only touches markdown and deletes one markdown file.
6. `git status` shows exactly one deletion (`reports/prose-quality-instructions.md`) and exactly one modification (`docs/prose-renderer-contract/README.md`).

### Invariants

1. After PROSESPLIT2-001..004, no live (non-archive, non-historical-decision-record) doc references `reports/prose-quality-instructions.md` by file path other than the IMPL-ORDER historical-note line.
2. The three renderer-bound canonical-source files at `docs/prose-renderer-contract/{content-policy,prose-craft-contract,render-time-instruction}.md` carry byte-identical content to the pre-deletion bundle's three corresponding sections.
3. The README's audit-trail note documents which sub-sections were dropped, why, and how to recover them — preserving the deletion's decision record for future readers.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is the grep-proofs in Assumption Reassessment §2-§4 + the post-condition grep-proof in Acceptance Criteria Tests That Must Pass §3 + existing pipeline coverage (lint, typecheck). The structural byte-equality test lands in PROSESPLIT2-005 and exercises the canonical-source files (now the sole authoritative location).`

### Commands

1. `grep -rn "Anti-Pathology Checklist\|anti-pathology checklist" /home/joeloverbeck/projects/worldloom --include="*.md" --include="*.ts" | grep -v "/archive/" | grep -v "/docs/triage/" | grep -v "/docs/plans/" | grep -v "/reports/page-plans-improvements" | grep -v "/tickets/PROSESPLIT2-"` — verification grep §2.
2. `grep -rn "Voice and Register Guidance\|voice and register guidance" /home/joeloverbeck/projects/worldloom --include="*.md" --include="*.ts" | grep -v "/archive/" | grep -v "/docs/triage/" | grep -v "/docs/plans/" | grep -v "/reports/page-plans-improvements" | grep -v "/tickets/PROSESPLIT2-"` — verification grep §3.
3. `grep -rn "External-Renderer Usage Guide\|external-renderer usage guide" /home/joeloverbeck/projects/worldloom --include="*.md" --include="*.ts" | grep -v "/archive/" | grep -v "/docs/triage/" | grep -v "/docs/plans/" | grep -v "/reports/page-plans-improvements" | grep -v "/tickets/PROSESPLIT2-"` — verification grep §4.
4. `rm reports/prose-quality-instructions.md` — deletion command.
5. `grep -rn "reports/prose-quality-instructions" /home/joeloverbeck/projects/worldloom --include="*.md" --include="*.ts" | grep -v "/archive/" | grep -v "/docs/triage/" | grep -v "/docs/plans/" | grep -v "/reports/page-plans-improvements" | grep -v "/tickets/PROSESPLIT2-"` — post-deletion confirmation grep.
6. `pnpm turbo lint && pnpm turbo typecheck` — full-pipeline confirmation.
