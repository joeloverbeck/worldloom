<!-- spec-drafting-rules.md not present; using default structure: Problem Statement, Approach, Deliverables, FOUNDATIONS Alignment, Verification, Out of Scope, Risks & Open Questions. -->

# SPEC-08: Migration & Phasing Plan

**Phase**: meta (orchestrates Phases 0–4)
**Depends on**: SPEC-01 through SPEC-07 (defines what ships per phase)
**Blocks**: nothing (this spec is the overview)

## Problem Statement

Landing the full machine-facing layer (SPEC-01 through SPEC-07) in a single change would be high-risk: all eight canon/content-generation skills break simultaneously if any one component regresses. The existing `animalia` world (47 CF + 18 CH + 17 PA + 3 characters + 3 diegetic artifacts + 14 proposals) is real user data — migration must be non-destructive and rollback-able. The greenfield framing permits clean architectural choices, but does not license data-loss-risking transitions.

**Source context**: `brainstorming/structure-aware-retrieval.md` §10 (migrate the ledger first, not the whole repo), §17 (phased implementation plan). Brainstorm decision: each phase ships standalone value; rollback preserves prior-phase wins.

## Approach

Four phases plus a prep phase. Each phase is independently valuable (token reduction, correctness wins, scalability wins) and independently rollback-able (later phases don't invalidate earlier phase benefits). Acceptance criteria are **measurable** (token counts, validator pass counts, elapsed time) — not aspirational.

## Deliverables

### Phase 0 — Prep

**Scope** (no user-visible behavior change):
- Create `tools/` directory tree scaffold (empty; populated in later phases)
- Create `specs/` directory and land this 9-file spec bundle (this deliverable)
- Update `.gitignore`:
  ```
  worlds/*/_index/
  worlds/*/_source/
  tools/*/dist/
  tools/*/node_modules/
  tools/world-mcp/.secret
  tools/hooks/logs/
  ```
- Add `.claude/settings.json.example` documenting the hook configuration (activated in later phases)

**Acceptance criteria**:
- Required repo structure present:
  - `specs/` bundle landed
  - `tools/` scaffold present with the five planned subdirectories
  - `.claude/settings.json.example` present
  - `.gitignore` contains the six Phase 0 machine-layer ignore entries
- `specs/IMPLEMENTATION-ORDER.md` updated to record Phase 0 completion once the structural check passes

**Status**: Completed on 2026-04-22. Structural acceptance passed against the live repo state.

**Rollback**: `git revert` the prep commit; no data loss.

**Out of scope**: any code; any skill edits.

### Phase 1 — Read Path + canon-addition Pilot

**Scope**:
- **SPEC-01** World Index (full build + sync + CLI)
- **SPEC-02** MCP Retrieval Server (full tool surface; `submit_patch_plan` stubbed — returns "not yet implemented" until Phase 2)
- **SPEC-05** Hooks 1, 2, 4 (read-side + subagent bootstrap; Hooks 3 and 5 dormant)
- **SPEC-06** `canon-addition` read-side rewrite only (Phase 1 pilot):
  - Replace pre-flight eager loads with `get_context_packet`
  - Replace pre-figuring scan with `find_named_entities`
  - Replace "Large-file method" with `get_node` / `search_nodes`
  - Writes continue via direct Edit for now
- **SPEC-07 Part A** FOUNDATIONS.md, CLAUDE.md, HARD-GATE-DISCIPLINE.md, WORKFLOWS.md foundational updates; new MACHINE-FACING-LAYER.md and CONTEXT-PACKET-CONTRACT.md

**Animalia bootstrap**:
1. `world-index build animalia` → produces `worlds/animalia/_index/world.db`
2. `world-validate animalia --structural` runs structural validators only (Rule 1–7 validators defer to Phase 2) — any failure is an existing latent defect
3. Resolve structural fails via one-off canon-addition cleanup runs OR grandfather with a `validation_results` row of severity `info` and human-authored reason
4. No markdown file is touched; current structure preserved

**Acceptance criteria**:
- `world-index build animalia` completes in <30 seconds on commodity hardware
- Node count sanity check matches manual enumeration (47 CF + 18 CH + 17 PA + 15+ MR entries + 3 characters + 3 diegetic artifacts + 14 proposal cards + sections/subsections per file)
- `world-validate animalia --structural` reports **zero `fail`** (all structural validators pass)
- A sample canon-addition run on animalia completes with **≥50% token reduction** vs current baseline (measured by tool-input token count across pre-flight + Phase 0–11 loads)
- Hook 2 blocks ≥1 raw `Read CANON_LEDGER.md` attempt during the test run; canon-addition completes without any such raw read
- Sibling skills (`character-generation`, `diegetic-artifact-generation`, `continuity-audit`, `propose-new-canon-facts`, `canon-facts-from-diegetic-artifacts`, `propose-new-characters`) continue to work unchanged (they operate primarily on sub-directory artifacts that Hook 2 doesn't block, and they don't yet depend on MCP)
- FOUNDATIONS.md references SPEC-01 through SPEC-05 by name in §Machine-Facing Layer; skill can cite FOUNDATIONS without contradiction

**Rollback**:
- Delete `worlds/*/_index/` directories
- Revert `canon-addition` SKILL.md to pre-Phase-1 version
- Remove Hook 1, 2, 4 entries from `.claude/settings.json`
- Keep `tools/` code dormant (unused but not deleted)
- Zero data loss; animalia markdown untouched

### Phase 2 — Write Path + All-Skill Migration

**Scope**:
- **SPEC-03** Patch Engine (full 13-op vocabulary; approval_token integration; two-phase commit)
- **SPEC-04** Validator Framework (full — all 14 validators, including Rules 1–7)
- **SPEC-05** Hooks 3, 5 (edit-side + auto-validate)
- **SPEC-06** Remaining 7 skill rewrites (character-generation, diegetic-artifact-generation, continuity-audit, propose-new-canon-facts, canon-facts-from-diegetic-artifacts, propose-new-characters, create-base-world) + canon-addition write-side completion
- **SPEC-07 Part B** HARD-GATE-DISCIPLINE.md write-order rewrite; CLAUDE.md non-negotiable phrasing refinement

**Animalia re-validation**:
1. After SPEC-04 ships, `world-validate animalia` runs **full** validator suite (including Rules 1–7)
2. Any Rule 1–7 fails on current animalia are latent defects from the prose-enforced era
3. Resolve via canon-addition runs (each fails is a retcon proposal); grandfather residuals with `info` severity

**Acceptance criteria**:
- All 8 skills run end-to-end via engine (verified by end-to-end integration test per skill)
- A canon-addition run on animalia with a large delivery (≥6 required_world_updates files) writes exclusively via engine; Hook 3 denies any raw Edit attempt on protected surfaces
- `world-validate animalia --all` reports zero Rule 1–7 `fail` (post-cleanup)
- **≥70% token reduction** vs Phase 0 baseline (measured across 3 representative runs per skill)
- Patch engine atomicity verified: inject failure at Phase A validate, Phase B temp-write, Phase B rename — no partial write on disk in any case
- One synthetic concurrency test: two skills operating on different worlds simultaneously both succeed; same-world concurrency serializes (second waits or errors with `world_locked`)
- Every sub-directory artifact creation (characters, diegetic artifacts, adjudications) goes through engine; direct Edit blocked by Hook 3

**Rollback**:
- Disable Hook 3 → skills fall back to raw Edit (higher friction but functional)
- Disable Hook 5 → post-write validation informational only
- Skills retain Phase 2 rewrites but can opt to route writes around engine if critical bug discovered
- No data loss; existing writes remain on disk

### Phase 3 — Optional: Atomic Source for CF/CH Records

**Condition**: only ship if Phase 2 stable for ≥4 weeks AND user separately approves.

**Scope**:
- Split `CANON_LEDGER.md` CF blocks into `worlds/<slug>/_source/canon/CF-NNNN.yaml`
- Split CH blocks into `worlds/<slug>/_source/change-log/CH-NNNN.yaml`
- Adjudications already per-file — no change
- Compile `CANON_LEDGER.md` as derived artifact from `_source/` on every write (engine adds a `compile_ledger` post-step)
- Update FOUNDATIONS.md §Canon Fact Record Schema + §Mandatory World Files per SPEC-07 Part C
- One-time animalia migration script: produces 47 CF files + 18 CH files from existing ledger; verify byte-identical ledger after compile

**Acceptance criteria**:
- Animalia migration completes without data loss (47 CF files + 18 CH files created; compiled ledger matches pre-migration ledger exactly)
- Engine's compile step runs in <1s for animalia-scale worlds
- New worlds created post-Phase-3 start in atomic-source form directly
- `world-validate animalia` reports zero new fails

**Rollback**:
- Recompile ledger from `_source/` one final time
- Delete `_source/` directories
- Update `.gitignore` to stop excluding `_source/`
- Engine's compile step becomes a no-op; fenced-YAML-in-ledger is the source of truth again
- Zero data loss

### Phase 4 — Deferred: Fragmentize High-Churn Prose

**Condition**: only ship if Phase 3 proven AND user separately approves. Separate spec required (not in this bundle).

**Scope** (summary only; detailed in a future spec):
- Split `EVERYDAY_LIFE.md`, `INSTITUTIONS.md`, `OPEN_QUESTIONS.md`, `MYSTERY_RESERVE.md` into per-section fragments
- Heading-scoped fragments, not sentence-level
- Compile published markdown from fragments

**Deferral rationale**: these files are less structurally regular than the ledger; fragment boundaries require more care to preserve narrative coherence. Phase 3 atomization buys most of the scalability win; Phase 4 is only needed if empirical token counts show these files as the remaining bottleneck.

### Animalia bootstrap detailed steps

Phase 0:
- No animalia changes

Phase 1:
1. Install Node.js runtime (assumed available)
2. `cd tools/world-index && npm install && npm run build`
3. `world-index build animalia`
4. `cd tools/world-mcp && npm install && npm run build`
5. Update `.mcp.json` to register the worldloom MCP server
6. `cd tools/hooks && npm install && npm run build`
7. Merge Phase 1 hooks into `.claude/settings.json` (from `.claude/settings.json.example`)
8. Restart Claude Code session
9. Run a sample canon-addition on animalia; measure token counts
10. Compare to baseline

Phase 2:
1. `cd tools/validators && npm install && npm run build`
2. `cd tools/patch-engine && npm install && npm run build`
3. Update `tools/world-mcp/` to enable `submit_patch_plan` (currently stubbed)
4. Add Hooks 3, 5 to `.claude/settings.json`
5. `world-validate animalia --all` → resolve any Rule 1–7 fails via canon-addition or grandfather
6. Restart Claude Code session
7. Run a sample canon-addition on animalia with a large delivery; measure token counts and verify Hook 3 enforcement

Phase 3 (optional):
1. Run migration script: `world-index migrate-to-atomic-source animalia`
2. Verify `CANON_LEDGER.md` re-compiles byte-identical to pre-migration
3. Check git diff is intended (addition of `_source/`; ledger compile artifact may or may not be committed based on user preference)

### Rollback posture summary

| Phase | Rollback cost | Data loss risk | Retained wins |
|---|---|---|---|
| 0 | Trivial (revert commit) | None | None (no changes yet) |
| 1 | Low (delete `_index/`, revert 1 skill) | None | Pre-Phase-1 behavior |
| 2 | Moderate (disable 2 hooks, all skills still functional on engine) | None | Phase 1 wins (index, MCP, read hooks) |
| 3 | Low (recompile ledger, delete `_source/`) | None | Phase 1+2 wins |
| 4 | Not yet defined | Not yet defined | Not yet defined |

### Greenfield caveats

- Phase 1+2 apply to the existing `animalia` world AND any future worlds
- Phase 3+4 apply only to worlds after user-initiated migration; no automatic migration
- A new world created post-Phase-3 starts in atomic-source form directly (no legacy compatibility burden)
- A new world created during Phase 1 or 2 uses fenced-YAML-in-ledger (same as animalia) until Phase 3 migration

## FOUNDATIONS Alignment

| Principle | Alignment |
|---|---|
| §Change Control Policy | Each phase is a change; acceptance criteria act as the "change is complete" test |
| §Mandatory World Files | 13 files preserved through Phase 2; Phase 3 adds `_source/` as derived-source without removing the human-facing ledger view |
| §Acceptance Tests | Each phase's acceptance criteria are measurable, not aspirational — honoring FOUNDATIONS' standard for "a world model is not ready until…" |
| Rule 6 No Silent Retcons | Migration is logged; animalia structural fails that get grandfathered receive explicit `info` validation_results entries |

## Verification

- **Phase 0 acceptance**: structural repo-state check passes for the required `specs/`, `tools/`, `.claude/settings.json.example`, and `.gitignore` Phase 0 entries; Phase 0 completion is then recorded in `specs/IMPLEMENTATION-ORDER.md`
- **Phase 1 acceptance**: measured token reduction ≥50%; zero structural fails; sibling skills regression-tested
- **Phase 2 acceptance**: measured token reduction ≥70%; zero Rule 1–7 fails; atomicity injection tests pass
- **Phase 3 acceptance** (if shipped): byte-identical ledger round-trip; zero new validator fails
- **Cross-phase stability**: each phase's acceptance test is re-run at every subsequent phase to catch regressions (e.g., Phase 1's token count should not regress in Phase 2)

## Out of Scope

- Telemetry dashboard
- Performance regression CI
- Automated world-health monitoring
- Distribution / packaging (tools run from source in Phase 1–4; packaging deferred)
- Cross-repo / cross-machine sync (local development assumption)
- Phase 4 detailed spec (separate spec when prioritized)

## Risks & Open Questions

- **Phase 1 token-reduction target**: ≥50% may be aggressive if canon-addition's current baseline is already efficient for small proposals. Mitigation: measure baseline first; if ≥50% unachievable, revise target to "best effort" with a concrete percentage documented.
- **Animalia structural fails**: unknown quantity until `world-validate animalia` runs. Mitigation: Phase 1 bootstrap step 3 explicitly allocates time for this; if fails are numerous, surface in a pre-Phase-2 cleanup plan.
- **Phase 2 skill migration order**: rewriting 7 skills in one phase is ambitious. Mitigation: canon-addition pilot proves the pattern; remaining 7 can land in sub-batches within Phase 2 (e.g., content-generation skills first, then continuity-audit, then proposal-generation).
- **Concurrent canon-addition runs**: engine per-world write lock is fine for single-user. Mitigation: documented limitation.
- **MCP server availability**: if the MCP server crashes mid-skill-run, the skill cannot complete. Mitigation: engine writes are atomic so no partial-state corruption; skill reports error and user retries.
- **Approval token expiry during long HARD-GATE deliberations**: 5-minute expiry may be too short for large-delivery review. Mitigation: token auto-refreshes if skill detects expiry approaching; re-issue requires no user re-approval if plan unchanged.
- **`.gitignore` discipline**: `_index/` and `_source/` conventions depend on users maintaining the gitignore correctly. Mitigation: Phase 0 commits the gitignore update; SPEC-07 documents it in CLAUDE.md.
