<!-- spec-drafting-rules.md not present; using default structure: Problem Statement, Approach, Deliverables, FOUNDATIONS Alignment, Verification, Out of Scope, Risks & Open Questions. -->

# SPEC-08: Migration & Phasing Plan

**Phase**: meta (orchestrates Phases 0 through 2.5)
**Depends on**: SPEC-01 through SPEC-07, **SPEC-13 (atomic-source migration — inserts Phase 1.5 and supersedes old Phase 3 + Phase 4)**
**Blocks**: nothing (this spec is the overview)

## SPEC-13 amendment summary

- **Phase 1.5** (Atomic-Source Migration) inserted between Phase 1 and Phase 2. Scope: storage-form change from monolithic markdown to atomic YAML under `worlds/<slug>/_source/` for 11 of 13 mandatory concerns (CF, CH, invariants, mystery reserve, open questions, named entities, and the seven prose-file concerns: everyday life, institutions, magic or tech systems, geography, economy and resources, peoples and species, timeline). WORLD_KERNEL.md and (reduced) ONTOLOGY.md remain primary-authored at the world root. No compiled views. See SPEC-13 for the full migration contract and the `worlds/animalia/` migration procedure.
- **Phase 3** ("Atomic Source for CF/CH Records"): **SUPERSEDED**. SPEC-13's Phase 1.5 scope is broader (all 11 atomized concerns, not just CF/CH) and lands earlier (before Phase 2 write path, not after Phase 2 stability). Phase 3 as a separate phase slot is retired.
- **Phase 4** ("High-Churn Prose Fragmentization"): **SUPERSEDED**. Prose fragmentization is incorporated into SPEC-13's Phase 1.5 scope via per-H2-section SEC records. Phase 4 as a separate phase slot is retired.
- **Phase 2 completion gate lifts from ≥70% to ≥80% token reduction** (per SPEC-13 §C amendment to SPEC-06).
- **`.gitignore` Phase 0 entry for `worlds/*/_source/` is reversed during Phase 1.5** — `_source/` is now source-of-truth and must be tracked in git.
- **Animalia bootstrap detailed steps Phase 3 block** (below) is also superseded; see SPEC-13 §E Migration Procedure for the authoritative animalia migration steps.

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
3. Resolve structural fails via one-off canon-addition cleanup runs OR grandfather through an exact-match `audits/validation-grandfathering.yaml` policy that emits matched findings as `info` verdicts with human-authored rationale
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
3. Resolve via canon-addition runs (each fail is a retcon proposal); grandfather residuals through an exact-match `audits/validation-grandfathering.yaml` policy that emits matched findings with `info` severity

**Acceptance criteria**:
- All 8 skills run end-to-end via engine (verified by end-to-end integration test per skill)
- A canon-addition run on animalia with a large delivery (≥6 required_world_updates files) writes exclusively via engine; Hook 3 denies any raw Edit attempt on protected surfaces
- `world-validate animalia --json` reports zero Rule 1–7 `fail` (post-cleanup)
- **≥70% token reduction** vs Phase 0 baseline (measured across 3 representative runs per skill)
- Patch engine atomicity verified: inject failure at Phase A validate, Phase B temp-write, Phase B rename — no partial write on disk in any case
- One synthetic concurrency test: two skills operating on different worlds simultaneously both succeed; same-world concurrency serializes (second waits or errors with `world_locked`)
- Every sub-directory artifact creation (characters, diegetic artifacts, adjudications) goes through engine; direct Edit blocked by Hook 3

**Rollback**:
- Disable Hook 3 → skills fall back to raw Edit (higher friction but functional)
- Disable Hook 5 → post-write validation informational only
- Skills retain Phase 2 rewrites but can opt to route writes around engine if critical bug discovered
- No data loss; existing writes remain on disk

### Phase 3 — SUPERSEDED by Phase 1.5 (SPEC-13)

Phase 3 previously covered optional atomic-source migration for CF/CH records only, conditionally deferred to Phase 2 stability-plus-four-weeks-plus-user-approval. SPEC-13 pulls a broader atomization forward into Phase 1.5 before Phase 2, retiring Phase 3 as a separate slot. See SPEC-13 for the authoritative migration scope and `worlds/animalia/` procedure.

### Phase 4 — SUPERSEDED by Phase 1.5 (SPEC-13)

Phase 4 previously covered optional high-churn-prose fragmentization, further-deferred and requiring a separate spec. SPEC-13's Phase 1.5 scope incorporates per-H2-section atomization of the seven prose concerns (EVERYDAY_LIFE, INSTITUTIONS, MAGIC_OR_TECH_SYSTEMS, GEOGRAPHY, ECONOMY_AND_RESOURCES, PEOPLES_AND_SPECIES, TIMELINE) directly. Phase 4 as a separate slot is retired.

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
5. `world-validate animalia --json` → resolve any Rule 1–7 fails via canon-addition or grandfather
6. Restart Claude Code session
7. Run a sample canon-addition on animalia with a large delivery; measure token counts and verify Hook 3 enforcement

Phase 1.5 (SPEC-13 animalia migration) — **authoritative procedure at SPEC-13 §E**. Summary:
1. Pre-migration snapshot (`.pre-migration-snapshot/` gitignored)
2. Manual file-class-by-file-class atomic record authoring (CF/CH mechanical extraction; INV/M/OQ/SEC careful authoring; ENT atomization)
3. ONTOLOGY.md stripping (Named Entity Registry removed, rest preserved)
4. Delete 11 retired monolithic markdown files
5. Reverse `worlds/*/_source/` `.gitignore` entry
6. `world-index build animalia` + `world-validate animalia --structural` must succeed
7. Human git-diff review
8. Single migration commit

Phase 3 and Phase 4 (old): superseded — not executed separately.

### Rollback posture summary

| Phase | Rollback cost | Data loss risk | Retained wins |
|---|---|---|---|
| 0 | Trivial (revert commit) | None | None (no changes yet) |
| 1 | Low (delete `_index/`, revert 1 skill) | None | Pre-Phase-1 behavior |
| 1.5 (SPEC-13) | Low (`git revert` of migration commit; pre-migration snapshot available for 1 week) | None | Phase 1 wins (index, MCP, read hooks) |
| 2 | Moderate (disable 2 hooks, all skills still functional on engine) | None | Phase 1 + 1.5 wins |
| 3 / 4 (old) | N/A — superseded | N/A | N/A |

### Greenfield caveats

- Phase 1 + 1.5 + 2 apply to the existing `animalia` world; the atomic-source migration in Phase 1.5 is manual (Claude-authored per SPEC-13 §E), not toolchain-driven
- Animalia is the only legacy-form world; no other legacy exists to migrate
- A new world created post-Phase-1.5 starts in atomic-source form directly via `create-base-world` (which is updated in Phase 2 to emit `_source/` directly); no legacy storage accumulates after the animalia migration
- A new world created between Phase 1 and Phase 1.5 (there shouldn't be any) would use the pre-migration fenced-YAML-in-ledger form and require a subsequent SPEC-13-style migration; this edge case is avoided by coordinating world creation around the Phase 1.5 timeline

## FOUNDATIONS Alignment

| Principle | Alignment |
|---|---|
| §Change Control Policy | Each phase is a change; acceptance criteria act as the "change is complete" test |
| §Mandatory World Files | 13 concerns preserved in count and semantics through all phases; Phase 1.5 (SPEC-13) relocates storage form from monolithic markdown to atomic YAML under `_source/` for 11 of 13 concerns; WORLD_KERNEL and (stripped) ONTOLOGY remain primary-authored |
| §Acceptance Tests | Each phase's acceptance criteria are measurable, not aspirational — honoring FOUNDATIONS' standard for "a world model is not ready until…" |
| Rule 6 No Silent Retcons | Migration is logged; animalia structural fails that get grandfathered are recorded in an exact-match audit policy and emitted as explicit `info` validation results |

## Verification

- **Phase 0 acceptance**: structural repo-state check passes for the required `specs/`, `tools/`, `.claude/settings.json.example`, and `.gitignore` Phase 0 entries; Phase 0 completion is then recorded in `specs/IMPLEMENTATION-ORDER.md`
- **Phase 1 acceptance**: measured token reduction ≥50%; zero structural fails; sibling skills regression-tested
- **Phase 2 acceptance**: measured token reduction ≥70%; zero Rule 1–7 fails; atomicity injection tests pass
- **Phase 1.5 acceptance** (SPEC-13): `world-index build animalia` succeeds against `_source/`; `world-validate animalia --structural` reports zero fails; no dangling references to retired monolithic filenames in skills / specs / docs (see SPEC-13 §Verification)
- **Cross-phase stability**: each phase's acceptance test is re-run at every subsequent phase to catch regressions (e.g., Phase 1's token count should not regress in Phase 2)

## Out of Scope

- Telemetry dashboard
- Performance regression CI
- Automated world-health monitoring
- Distribution / packaging (tools run from source in Phase 1–4; packaging deferred)
- Cross-repo / cross-machine sync (local development assumption)
- Phase 3 / Phase 4 (old) separate slots (superseded by Phase 1.5 / SPEC-13)

## Risks & Open Questions

- **Phase 1 token-reduction target**: ≥50% may be aggressive if canon-addition's current baseline is already efficient for small proposals. Mitigation: measure baseline first; if ≥50% unachievable, revise target to "best effort" with a concrete percentage documented.
- **Animalia structural fails**: unknown quantity until `world-validate animalia` runs. Mitigation: Phase 1 bootstrap step 3 explicitly allocates time for this; if fails are numerous, surface in a pre-Phase-2 cleanup plan.
- **Phase 2 skill migration order**: rewriting 7 skills in one phase is ambitious. Mitigation: canon-addition pilot proves the pattern; remaining 7 can land in sub-batches within Phase 2 (e.g., content-generation skills first, then continuity-audit, then proposal-generation).
- **Concurrent canon-addition runs**: engine per-world write lock is fine for single-user. Mitigation: documented limitation.
- **MCP server availability**: if the MCP server crashes mid-skill-run, the skill cannot complete. Mitigation: engine writes are atomic so no partial-state corruption; skill reports error and user retries.
- **Approval token expiry during long HARD-GATE deliberations**: 5-minute expiry may be too short for large-delivery review. Mitigation: token auto-refreshes if skill detects expiry approaching; re-issue requires no user re-approval if plan unchanged.
- **`.gitignore` discipline**: `_index/` and `_source/` conventions depend on users maintaining the gitignore correctly. Mitigation: Phase 0 commits the gitignore update; SPEC-07 documents it in CLAUDE.md.
