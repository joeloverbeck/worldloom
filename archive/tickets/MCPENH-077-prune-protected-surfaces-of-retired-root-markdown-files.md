# MCPENH-077: Prune `protected_surfaces` of retired root-markdown filenames after SPEC-13 atomic-source migration

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/context-packet/governing-world-context.ts` `PROTECTED_SURFACES` const and (consequently) every `governing_world_context.protected_surfaces` consumer; one focused `world-mcp` test file.
**Deps**: SPEC-13 Atomic-Source Migration (landed; documented in FOUNDATIONS §Canonical Storage Layer)

## Problem

`get_context_packet` returns a `governing_world_context.protected_surfaces` list that claims eleven retired root-level markdown files as live write-protected surfaces. During the 2026-05-30 `branching-story-turn-cycle` exercise on `red-bunny`, the packet response for `task_type: story_turn_cycle` returned:

```
protected_surfaces: [
  "WORLD_KERNEL.md", "INVARIANTS.md", "ONTOLOGY.md", "TIMELINE.md",
  "GEOGRAPHY.md", "PEOPLES_AND_SPECIES.md", "INSTITUTIONS.md",
  "ECONOMY_AND_RESOURCES.md", "MAGIC_OR_TECH_SYSTEMS.md", "EVERYDAY_LIFE.md",
  "CANON_LEDGER.md", "OPEN_QUESTIONS.md", "MYSTERY_RESERVE.md",
  "adjudications/", "characters/", "diegetic-artifacts/",
  "proposals/", "audits/"
]
```

Per `docs/FOUNDATIONS.md` §Canonical Storage Layer: *"The retired root-level markdown files (`CANON_LEDGER.md`, `INVARIANTS.md`, `MYSTERY_RESERVE.md`, `OPEN_QUESTIONS.md`, `TIMELINE.md`, and the five large prose files) do not exist on machine-layer-enabled worlds."* The packet is publishing protect-this-file directives for files that the canonical-storage contract explicitly says don't exist.

Operational cost is currently low (the directives are advisory, and no operator would attempt to create these legacy files), but the drift is a soft Rule 6 (No Silent Retcons) hazard: SPEC-13 was logged in canon, but a load-bearing machine-facing output still reports the pre-SPEC-13 surface as live. The risk compounds whenever a new task_type or audit tool consumes `protected_surfaces` and treats its presence as ground truth.

## Assumption Reassessment (2026-05-30)

1. `tools/world-mcp/src/context-packet/governing-world-context.ts:355-374` defines `PROTECTED_SURFACES` as an `as const` array of eighteen entries. Eleven of the eighteen entries (`INVARIANTS.md`, `TIMELINE.md`, `GEOGRAPHY.md`, `PEOPLES_AND_SPECIES.md`, `INSTITUTIONS.md`, `ECONOMY_AND_RESOURCES.md`, `MAGIC_OR_TECH_SYSTEMS.md`, `EVERYDAY_LIFE.md`, `CANON_LEDGER.md`, `OPEN_QUESTIONS.md`, `MYSTERY_RESERVE.md`) name retired files. The const is consumed at line 811 (`protected_surfaces: [...PROTECTED_SURFACES]`) into every world-canon governing context layer; `tools/world-mcp/src/context-packet/assemble.ts:185` lifts it into the packet's `governing_summary.protected_surfaces` and `governing_world_context.protected_surfaces`. The same const is also referenced by `tools/world-mcp/src/context-packet/shared.ts:58, 457, 652` (type + size accounting).
2. `docs/FOUNDATIONS.md` §Canonical Storage Layer (the SPEC-13 acceptance section) declares the eleven files retired on machine-layer-enabled worlds; §Mandatory World Files documents the replacement atomic-YAML storage form under `_source/<class>/*.yaml`. The retirement is therefore canon-level, not an in-flight migration assumption.
3. Cross-package boundary under audit: the `governing_world_context.protected_surfaces` contract is consumed at minimum by `tools/world-mcp/src/context-packet/assemble.ts` and `tools/world-mcp/src/context-packet/shared.ts`, plus every downstream skill that reads the field for guidance (currently `canon-addition`, `branching-story-turn-cycle`, `branching-story-bootstrap`, and similar story/canon skills). All consumers must accept the pruned list without referring to the dropped entries by name.
4. FOUNDATIONS Rule 6 (No Silent Retcons): the SPEC-13 retirement was logged, but a machine-facing surface still publishes the pre-retirement labels. Pruning is therefore an alignment of the machine surface with the already-logged retcon, not itself a silent retcon.
6. The change is a SHRINK to an existing exported const, not an extension of an output schema. `governing_world_context.protected_surfaces` is a `string[]` per `tools/world-mcp/src/context-packet/shared.ts:58, 457`; removing entries is additive-compatible from a type perspective. Consumers that depend on the *presence* of `INVARIANTS.md` or any other dropped entry would need to migrate to the SPEC-13 atomic-source equivalents (`_source/invariants/`, `_source/canon/`, etc.) — see Verification Layer 3.
7. No symbol is renamed or removed; only literal members of one `as const` array shrink. Grep coverage: every `PROTECTED_SURFACES` and `protected_surfaces` reference is enumerated above (4 source files in `tools/world-mcp/src/`, plus existing context-packet tests under `tools/world-mcp/tests/context-packet/`). No skill, doc, or spec file references the retired filenames AS protected_surfaces members (skills reference the filenames as content-files-to-read, which is a different concern handled by SPEC-13 atomic-source retrieval).
8. Adjacent contradiction: any spec or skill prose that still references `CANON_LEDGER.md` / `INVARIANTS.md` / etc. as a current write-protected surface (vs. as a historical or retired filename) is a separate cleanup belonging to its own ticket. Phase-1 grep for this ticket did not find such references in `tools/world-mcp/src/`; out-of-scope grep across `.claude/skills/` and `docs/` is deferred to a sibling skill-prose audit.

## Architecture Check

1. The pruned list reflects the canonical-storage truth — only `WORLD_KERNEL.md`, `ONTOLOGY.md`, and the four authored-primary directories (`adjudications/`, `characters/`, `diegetic-artifacts/`, `proposals/`, `audits/`) remain root-level write-protected surfaces on machine-layer-enabled worlds. Atomic `_source/<class>/` directories are write-protected by Hook 3 (engine-only mutation), which is a separate enforcement surface and does not need restating in `protected_surfaces`.
2. No backwards-compatibility aliasing is introduced. The retired filenames are dropped from the const wholesale; consumers that need pre-SPEC-13 behavior must read it from the SPEC-13 atomic-source equivalent or from prior packet snapshots. The packet response is a present-truth contract, not a historical record.

## Verification Layers

1. **`PROTECTED_SURFACES` membership matches FOUNDATIONS §Canonical Storage Layer** → unit test at `tools/world-mcp/tests/context-packet/protected-surfaces-foundations-alignment.test.ts` (new sibling to existing `active-rules-foundations-alignment.test.ts`) asserts: (a) `PROTECTED_SURFACES` contains `WORLD_KERNEL.md` and `ONTOLOGY.md`; (b) `PROTECTED_SURFACES` contains the four authored-primary directories; (c) `PROTECTED_SURFACES` does NOT contain any of the eleven retired filenames listed in Problem.
2. **No consumer depends on dropped entries** → repo-wide grep at test time (or as a documentation-only invariant in the test) that no file under `tools/world-mcp/src/` references the dropped filenames as a `PROTECTED_SURFACES` membership check; the grep is documented in the test rationale rather than executed as a programmatic assertion.
3. **Packet-shape regression coverage stays green** → existing `tools/world-mcp/tests/context-packet/shape-conformance.test.ts` and `tools/world-mcp/tests/context-packet/active-rules-foundations-alignment.test.ts` continue to pass; `governing_world_context.protected_surfaces` remains a `string[]` of present-tense write-protected surfaces.

## What to Change

### 1. Prune `PROTECTED_SURFACES` in `tools/world-mcp/src/context-packet/governing-world-context.ts`

Drop these eleven entries from the `PROTECTED_SURFACES` const:

```
"INVARIANTS.md",
"TIMELINE.md",
"GEOGRAPHY.md",
"PEOPLES_AND_SPECIES.md",
"INSTITUTIONS.md",
"ECONOMY_AND_RESOURCES.md",
"MAGIC_OR_TECH_SYSTEMS.md",
"EVERYDAY_LIFE.md",
"CANON_LEDGER.md",
"OPEN_QUESTIONS.md",
"MYSTERY_RESERVE.md",
```

Retain `WORLD_KERNEL.md`, `ONTOLOGY.md`, and the four authored-primary directories (`adjudications/`, `characters/`, `diegetic-artifacts/`, `proposals/`, `audits/`).

### 2. Add focused FOUNDATIONS-alignment test

Create `tools/world-mcp/tests/context-packet/protected-surfaces-foundations-alignment.test.ts` modeled on `active-rules-foundations-alignment.test.ts`. The test imports `PROTECTED_SURFACES` (or asserts via a packet call to `get_context_packet`) and verifies the membership invariants in Verification Layer 1.

### 3. No skill, doc, or spec edits in this ticket

Skill prose, FOUNDATIONS, and docs already reflect SPEC-13. Any drift discovered in `.claude/skills/` or `docs/` that still treats a dropped filename as a current `protected_surfaces` member is a separate cleanup ticket per Assumption Reassessment item 8.

## Files to Touch

- `tools/world-mcp/src/context-packet/governing-world-context.ts` (modify — shrink `PROTECTED_SURFACES`)
- `tools/world-mcp/tests/context-packet/protected-surfaces-foundations-alignment.test.ts` (new)

## Out of Scope

- Hook 3 / Hook 2 enforcement surfaces (already block `_source/` writes; not part of `protected_surfaces`).
- Renaming any consumer interface (`governing_world_context.protected_surfaces` stays a `string[]`).
- Sweeping skill prose for stale references to retired root markdown files (separate cleanup if discovered).
- Adjusting the `governing_summary.protected_surfaces` field that derives from `PROTECTED_SURFACES` — the derivation is unchanged; only the input shrinks.

## Acceptance Criteria

### Tests That Must Pass

1. New test `tools/world-mcp/tests/context-packet/protected-surfaces-foundations-alignment.test.ts` passes.
2. Existing tests under `tools/world-mcp/tests/context-packet/` stay green: `active-rules-foundations-alignment.test.ts`, `shape-conformance.test.ts`, `story-character-profile.test.ts`, `character-generation-completeness.test.ts`, `packet-class-filter-composition.test.ts`.
3. `npm --prefix tools/world-mcp test` exits 0.

### Invariants

1. `governing_world_context.protected_surfaces` and `governing_summary.protected_surfaces` contain only surfaces that exist on machine-layer-enabled worlds per FOUNDATIONS §Canonical Storage Layer.
2. The `PROTECTED_SURFACES` const stays a single source of truth — no duplicate retired-filename literals reintroduced in `assemble.ts` or `shared.ts`.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/context-packet/protected-surfaces-foundations-alignment.test.ts` — new sibling to the existing `active-rules-foundations-alignment.test.ts`. Asserts the three membership invariants in Verification Layer 1 directly against `PROTECTED_SURFACES` (and, optionally, against a freshly assembled packet).

### Commands

1. `npm --prefix tools/world-mcp test -- --grep protected-surfaces` — targeted run for the new test file.
2. `npm --prefix tools/world-mcp test` — full world-mcp suite.
3. The narrower world-mcp suite is the correct verification boundary because `PROTECTED_SURFACES` is local to the world-mcp package and not consumed by `tools/world-index/` or `tools/validators/`.

## Outcome

Completed 2026-05-30. `PROTECTED_SURFACES` in `tools/world-mcp/src/context-packet/governing-world-context.ts` now contains only the seven present-truth surfaces (`WORLD_KERNEL.md`, `ONTOLOGY.md`, and the five authored-primary directories), aligning the machine-facing `governing_world_context.protected_surfaces` and `governing_summary.protected_surfaces` outputs with FOUNDATIONS §Canonical Storage Layer. The const was promoted to `export` so the new foundations-alignment test can import it directly.

## Verification Result

1. `npm --prefix /home/joeloverbeck/projects/worldloom/tools/world-mcp run build` — PASS.
2. `node --test dist/tests/context-packet/protected-surfaces-foundations-alignment.test.js` (from `tools/world-mcp`) — PASS (4 tests).
3. `npm --prefix /home/joeloverbeck/projects/worldloom/tools/world-mcp test` — PASS (538 tests, 0 failures) after re-tightening two budget thresholds (see Deviations).

## Deviations

- Two budget-handling regression tests were re-tightened in lockstep with the packet-size shrink:
  - `tools/world-mcp/tests/context-packet/budget-handling.test.ts` — `token_budget` lowered from `700` to `650` (and the matching `allocated` assertion) so the "drop impact_surfaces first under budget pressure" scenario still triggers a drop now that `protected_surfaces` is ~49 tokens smaller.
  - `tools/world-mcp/tests/context-packet/packet-truncation-summary.test.ts` — `token_budget` lowered from `800` to `750` for the same reason.
  Both tests assert behavior at threshold-tight budgets; the threshold moved with the packet-size reduction. No assertion semantics changed.
