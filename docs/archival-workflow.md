# Archival Workflow

Use this as the canonical, single-source archival policy for tickets, specs, brainstorming docs, and reports.

## Required Steps

1. Edit the document to mark final status at the top:
   - `**Status**: ✅ COMPLETED` or `**Status**: COMPLETED`
   - `**Status**: ❌ REJECTED` or `**Status**: REJECTED`
   - `**Status**: ⏸️ DEFERRED` or `**Status**: DEFERRED`
   - `**Status**: 🚫 NOT IMPLEMENTED` or `**Status**: NOT IMPLEMENTED`
2. For completed items, add an `Outcome` section at the bottom with:
   - completion date
   - what actually changed
   - deviations from original plan
   - verification results
3. If implementation is refined after archival and the archived `Outcome` becomes stale, amend the archived document before merge/finalization so ownership, behavior, and verification facts remain accurate.
   - Add `Outcome amended: YYYY-MM-DD` inside `## Outcome` for each post-completion refinement update.
4. Ensure destination archive directory exists (create with `mkdir -p` if absent):
   - `archive/tickets/`
   - `archive/specs/`
   - `archive/brainstorming/`
   - `archive/reports/`
5. Move the document. Prefer `git mv <source> <destination>` when the source is tracked; fall back to plain `mv` when untracked. Detect via `git ls-files --error-unmatch <source>`; non-zero exit → untracked → use plain `mv`.
6. If there is a filename collision, pass an explicit non-colliding destination filename.
7. Confirm the original path no longer exists in its source folder (`tickets/`, `specs/`, `brainstorming/`, or `reports/`).
