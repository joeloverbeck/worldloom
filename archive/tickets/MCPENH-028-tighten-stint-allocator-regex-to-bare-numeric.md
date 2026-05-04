# MCPENH-028: Tighten STINT allocator regex to bare-numeric to match patch-engine + validator + structural-utility contract

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/tools/allocate-next-id.ts` STINT regex; corresponding test updates; one same-seam `branching-story-bootstrap` validation-gate prose correction.
**Deps**: `archive/tickets/MCPENH-011-story-bundle-id-classes-allocator.md` (the original ticket that introduced the suffix-tolerant STINT regex; this ticket retcons that decision per Rule 6).

## Problem

At intake, `mcp__worldloom__allocate_next_id` returned the wrong "next" id for STINT when legacy `STINT-NNNN-<char>` records existed on disk — diverging from the patch engine's race-check, the validator's schema regex, and the structural-utility regex. All three downstream surfaces used the strict bare-numeric form `^STINT-\d{4}$`; only the allocator used the suffix-tolerant form `^STINT-(\d{4})(?:-.+)?$`. The allocator was the outlier.

Concrete session failure: in this session's `branching-story-page-cycle` execution against `worlds/erotica-world/stories/marla-kern-seduction`, `allocate_next_id` saw `STINT-0001-iker.yaml` and `STINT-0001-marla.yaml` on disk, matched both via the suffix-tolerant regex, computed max=1, returned `STINT-0002`. The patch-engine race-check at `tools/patch-engine/src/apply.ts:250` then queried `world.db` (which had zero STINT entries — see MCPENH-029), computed max=0, expected `STINT-0001`. The submitted plan declared `expected_id_allocations.stint_ids: ["STINT-0002"]` and the engine returned `id_allocation_race: stint_ids allocation race for story 'marla-kern-seduction': expected STINT-0002, current next id is STINT-0001`.

The fix was to tighten the allocator's STINT regex to match the rest of the pipeline. After the corresponding skill-audit fix (this session) flipped the canonical STINT id form from `STINT-NNNN-<char>` to bare-numeric `STINT-NNNN`, MCPENH-011's original suffix-tolerant design was no longer correct; it now aligns with the strict form enforced elsewhere in the toolchain.

## Assumption Reassessment (2026-05-03)

1. **Allocator regex confirmed at intake** — before implementation, `tools/world-mcp/src/tools/allocate-next-id.ts:37` read `STINT: { width: 4, zeroPad: true, regex: /^STINT-(\d{4})(?:-.+)?$/ }`. The suffix-tolerant form was added by MCPENH-011 (see `archive/tickets/MCPENH-011-story-bundle-id-classes-allocator.md` lines 20, 69, 99 — explicit references to the `-<char>` suffix as the canonical form at that ticket's era). Final verification now confirms the allocator uses strict `^STINT-(\d{4})$`.
2. **Patch-engine race-check, validator schema, and structural-utility regexes use the strict form** — `tools/patch-engine/src/apply.ts:250` reads `["stint_ids", "STINT", /^STINT-(\d{4})$/, 4, true]`; `tools/validators/src/schemas/story-intention.schema.json:7` reads `"id": { "type": "string", "pattern": "^STINT-[0-9]{4}$" }`; `tools/validators/src/structural/utils.ts:263` reads `/^stories\/[^/]+\/_source\/intentions\/STINT-\d+\.yaml$/.test(filePath)`. The allocator alone tolerates suffixes.
3. **Cross-skill shared boundary under audit** — the contract that `allocate_next_id`'s output must match the patch engine's race-check expectation, otherwise every story-bundle-scoped allocation produces a guaranteed submission failure when legacy data exists. The boundary is implicit (no document codifies it), but is structurally load-bearing across the entire MCP-to-engine workflow.
4. **FOUNDATIONS / Validation Rule motivating this ticket** — `docs/FOUNDATIONS.md` §Story-Bundle ID Classes establishes `mcp__worldloom__allocate_next_id(world_slug, id_class, story_slug=...)` as the machine-facing allocation surface for story-bundle records; if its output diverges from the engine's expectation, every skill that uses it for STINT becomes structurally broken. The rule under audit is the unwritten "allocator output equals engine race-check expectation" invariant.
5. **HARD-GATE / patch-engine surface checked** — `docs/HARD-GATE-DISCIPLINE.md` confirms ID allocation is a pre-flight input to patch-plan submission and the engine's submit path enforces `expected_id_allocations` race checks. This ticket does not change approval-token behavior, validator verdict semantics, submit ordering, or the race-check regex; it only changes the allocator's pre-flight scan to agree with the existing strict submit-path contract.
6. **Schema narrowing scope** — breaking/narrowing at the regex level, not additive: the allocator stops counting suffixed legacy STINT filenames. Existing legacy records (`STINT-NNNN-<char>` on disk) are no longer matched by the allocator, which is the correct downstream behavior — the strict form is the new canonical contract per the recent skill-audit fix in `.claude/skills/branching-story-page-cycle/SKILL.md`, `.claude/skills/branching-story-bootstrap/SKILL.md`, and `.claude/skills/branching-story-bootstrap/templates/story-records.yaml`. Reassessment found one remaining stale bootstrap validation line (`STINT-0001-<slug>`); this ticket absorbs that one hunk as same-seam cross-skill truthing while leaving the pre-existing broader skill edits untouched. Legacy on-disk records remain readable as immutable history; new STINT records use bare-numeric ids and supersede via `logical_id` + `supersedes`.
7. **Rule 6 retcon attribution** — MCPENH-011's design decision (suffix-tolerant allocator) was correct for its era when STINT records were authored with the `-<char>` suffix as canonical form. The recent skill-audit on `branching-story-page-cycle` (this session) flipped the canonical form to bare-numeric to align with the patch-engine + validator + structural-utility consensus. This ticket retcons MCPENH-011's allocator regex to match the new canonical form. Existing on-disk legacy records (STINT-0001-iker.yaml, STINT-0001-marla.yaml in `worlds/erotica-world/stories/marla-kern-seduction/_source/intentions/`) are intentionally preserved as immutable history; the allocator no longer sees them, which is the intended migration story.
8. **Verification command correction** — the repo root has no `package.json`, so `npm test --workspace tools/world-mcp` and root `npm test` are not truthful command surfaces. The executable proof boundary is package-local: `cd tools/world-mcp && npm test`, plus targeted compiled allocator test execution after the package build.

## Architecture Check

1. **Why this approach is cleaner than alternatives**: the allocator regex is the single canonical surface; tightening it to match the strict form aligns every pipeline component on a single regex contract. The alternative — loosening the patch-engine race-check + validator schema + structural-utility to all accept suffixes — would re-spread the suffix tolerance across four surfaces and undo the skill-audit fix's premise (bare-numeric is the contract). Single-surface tightening is cheaper and structurally cleaner.
2. **No backwards-compatibility shims**: the legacy on-disk records remain readable (validator's `record_schema_compliance` would only fire on NEW writes via patch plans, not on read of existing files). No alias layer or dual-regex code path is introduced.

## Verification Layers

1. **Allocator regex matches strict form** → grep-proof: `tools/world-mcp/src/tools/allocate-next-id.ts` line 37 reads `STINT: { width: 4, zeroPad: true, regex: /^STINT-(\d{4})$/ }` (suffix-tolerance removed).
2. **Allocator + patch-engine race-check agree on next id** → allocator tests seed story bundles with legacy suffixed STINT files and bare-numeric STINT files and prove only bare-numeric records affect `allocate_next_id`; grep-proof confirms the patch-engine submit-path race check uses the same strict `^STINT-(\d{4})$` regex.
3. **No regression on world-canon-scoped allocators** → existing test suite passes (the regex change is STINT-only; CF / CH / M / OQ / ENT / SEC allocator regexes unchanged).
4. **Cross-skill alignment** → `branching-story-bootstrap`, `branching-story-page-cycle`, `storylet-pool-authoring` all assume bare-numeric STINT — the recent skill-audit fix (this session) confirms the alignment in skill prose.

## What to Change

### 1. Tighten the allocator's STINT regex

Update `tools/world-mcp/src/tools/allocate-next-id.ts:37` from:

```typescript
STINT: { width: 4, zeroPad: true, regex: /^STINT-(\d{4})(?:-.+)?$/ },
```

to:

```typescript
STINT: { width: 4, zeroPad: true, regex: /^STINT-(\d{4})$/ },
```

The `(?:-.+)?` non-capturing optional suffix group is removed. The capturing `(\d{4})` group is preserved (still extracts the numeric prefix for comparison).

### 2. Update or add tests

`tools/world-mcp/tests/tools/allocate-next-id.test.ts` — the existing test from MCPENH-011 includes a "STINT suffix" case (line 115 references "STINT suffix" coverage); convert that test from positive (suffix accepted) to negative (suffix rejected — legacy records are not counted by the allocator). Add a new positive test confirming bare-numeric records ARE counted.

### 3. Archived MCPENH-011 prose edit not required

Review determined that no archived MCPENH-011 prose edit was needed for engine correctness or dependency routing. The active live contract is proven by current code, tests, and skill prose; MCPENH-011 remains useful as historical provenance for the prior suffix-tolerant era.

## Files to Touch

- `tools/world-mcp/src/tools/allocate-next-id.ts` (modify)
- `tools/world-mcp/tests/tools/allocate-next-id.test.ts` (modify)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify one stale validation-gate line only; pre-existing skill-audit hunks remain separate)
- `archive/tickets/MCPENH-028-tighten-stint-allocator-regex-to-bare-numeric.md` (modify; moved here during post-ticket review)

## Out of Scope

- Migrating legacy on-disk `STINT-NNNN-<char>.yaml` records to bare-numeric form. This is a separate data migration; the audit explicitly preserves legacy records as immutable history per the skill-audit fix's `logical_id` / `supersedes` migration story.
- Changes to the patch engine's STINT regex, validator schema, or structural-utility regex. Those are already strict at HEAD and require no change.
- Cross-class regex audit (CF / CH / M / OQ / ENT / SEC) for similar allocator-vs-engine divergences. If pursued, file as a separate audit-driven ticket.
- Skill-prose updates documenting the new contract. Already landed via the parallel `/skill-audit` flow in this session (see `.claude/skills/branching-story-page-cycle/SKILL.md` + `.claude/skills/branching-story-bootstrap/SKILL.md` + `templates/story-records.yaml`).
- Informational edits to the archived MCPENH-011 ticket. The active live contract is proven by current code/tests/skills; no archived-ticket prose edit was required for this implementation-only pass.

## Acceptance Criteria

### Tests That Must Pass

1. Allocator unit test: `allocate_next_id(world_slug='<test-world>', id_class='STINT', story_slug='<test-story>')` against a story bundle containing `STINT-0001-iker.yaml` (legacy) returns `STINT-0001` (NOT `STINT-0002`).
2. Allocator unit test: same call against a story bundle containing `STINT-0001.yaml` (bare-numeric) returns `STINT-0002`.
3. Package proof: bootstrap-style allocator scenario where legacy + bare-numeric STINT records coexist on disk returns the same next id as the strict patch-engine race-check contract would compute from bare-numeric rows.
4. Full package suite passes: `cd tools/world-mcp && npm test`.

### Invariants

1. **Single-regex contract**: the STINT regex used by the allocator equals the regex used by the patch-engine race-check (both `^STINT-(\d{4})$`). No surface in the toolchain accepts the suffixed form for new writes.
2. **Legacy preservation**: on-disk legacy `STINT-NNNN-<char>.yaml` records are readable but invisible to the allocator scan; new writes use bare-numeric form per the recent skill-audit fix.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/allocate-next-id.test.ts` — convert the existing "STINT suffix" positive case (per MCPENH-011 acceptance line 115) to a negative case; add a positive case for bare-numeric.

### Commands

1. `cd tools/world-mcp && npm run build`.
2. `cd tools/world-mcp && node --test dist/tests/tools/allocate-next-id.test.js`.
3. `cd tools/world-mcp && npm test`.
4. `rg -n 'STINT-0001-<slug>|STINT-NNNN-<|STINT-\\*-|STINT suffix|STINT-0008-rill' .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-page-cycle/SKILL.md .claude/skills/branching-story-bootstrap/templates/story-records.yaml tools/world-mcp/src/tools/allocate-next-id.ts tools/world-mcp/tests/tools/allocate-next-id.test.ts tools/patch-engine/src/apply.ts tools/patch-engine/src/ops/create-story-record.ts tools/validators/src/schemas/story-intention.schema.json tools/validators/src/structural/utils.ts` — verifies stale suffixed-STINT contract references are gone from owned live surfaces while preserved legacy-history references remain explicit.

## Outcome

Completion date: 2026-05-03.

- Tightened `ID_CLASS_FORMATS.STINT.regex` in `tools/world-mcp/src/tools/allocate-next-id.ts` from suffix-tolerant `^STINT-(\d{4})(?:-.+)?$` to strict bare-numeric `^STINT-(\d{4})$`.
- Updated `tools/world-mcp/tests/tools/allocate-next-id.test.ts` so story-scoped STINT positive coverage uses `STINT-NNNN.yaml`, legacy suffixed STINT records are ignored, mixed legacy + bare-numeric bundles allocate from only the bare-numeric record, and the format-registry test rejects `STINT-0008-rill`.
- Corrected the remaining stale `branching-story-bootstrap` validation-gate line so cast-intention coverage requires a bare-numeric `STINT-NNNN` record linked by `character_id`.

## Verification Result

1. `cd tools/world-mcp && npm run build` — passed.
2. `cd tools/world-mcp && node --test dist/tests/tools/allocate-next-id.test.js` — passed.
3. `cd tools/world-mcp && npm test` — passed; compiled package suite reported 318 passing tests.
4. `rg -n 'STINT-0001-<slug>|STINT-NNNN-<|STINT-\\*-|STINT suffix|STINT-0008-rill' ...` over the owned live skill/package surfaces plus strict downstream regex authorities — remaining hits are truthful: the allocator test's explicit `assert.doesNotMatch("STINT-0008-rill", ...)` negative assertion and `branching-story-page-cycle`'s legacy-history note that old `STINT-NNNN-<char>` records remain readable as immutable history.
5. `rg -n 'STINT: \{ width: 4|stint_ids|idPattern: /\^STINT|story-intention|STINT-\[0-9\]|STINT-\\d' ...` confirmed the allocator, patch-engine submit race check, create-story-record op, validator schema, and structural utility all use strict bare-numeric STINT matching.

## Deviations

- The drafted root/workspace commands were not executable in this repo because there is no root `package.json`; verification used the package-local `tools/world-mcp` command surface instead.
- Direct external `mcp__worldloom__allocate_next_id(...)` invocation was not exposed in this Codex session; verification used the package-local handler tests and compiled package suite.
- The active path `tickets/MCPENH-028-tighten-stint-allocator-regex-to-bare-numeric.md` was already untracked at implementation intake. Post-ticket review moved it to `archive/tickets/MCPENH-028-tighten-stint-allocator-regex-to-bare-numeric.md` with plain `mv`.
- Pre-existing dirty skill-audit edits existed in `.claude/skills/branching-story-bootstrap/SKILL.md`, `.claude/skills/branching-story-bootstrap/templates/story-records.yaml`, and `.claude/skills/branching-story-page-cycle/SKILL.md`. This ticket only owns the additional bootstrap validation-gate hunk changing `STINT-0001-<slug>` to bare-numeric `STINT-NNNN`; the other skill/template hunks remain pre-existing same-seam work.
