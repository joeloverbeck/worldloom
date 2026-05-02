# MCPENH-016: Add RSP id-class to allocator (sub-audit-scoped tier — new nesting)

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-mcp/src/tools/allocate-next-id.ts` (extend `ID_CLASS_FORMATS`, add new `audit_id` argument + a sub-audit-scoped resolution branch alongside the completed story-scoped `SAU` branch); `tools/world-mcp/tests/tools/allocate-next-id.test.ts` (add RSP coverage + new error cases for missing audit_id); `branching-story-health-audit/SKILL.md` (switch lazy manual-scan to allocator after landing); `archive/tickets/MCPENH-015-add-sau-id-class-to-allocator.md` precondition (SAU id-class exists; this ticket extends the RSP-vs-SAU nesting hierarchy)
**Deps**: `archive/tickets/MCPENH-015-add-sau-id-class-to-allocator.md` (completed SAU id-class allocator support — RSP allocation requires the SAU directory to exist; the API contract here also wants `id_class='SAU'` to already be in the enum)

## Problem

`branching-story-health-audit` allocates `RSP-NNNN` ids lazily at Phase 8 per emitted card by manual scan of `worlds/<world-slug>/stories/<story-slug>/audits/SAU-NNNN/remediation-storylet-proposals/RSP-*.md`. RSP is a NEW ALLOCATOR TIER not currently representable in `tools/world-mcp/src/tools/allocate-next-id.ts`: the existing tiers are pipeline-scoped (NWB / NWP via `__pipeline__`), world-scoped (CF / CH / AU / RP / etc.), per-world-pressure-event (EPE), per-world-story (STORY), and story-bundle-scoped (including completed `SAU` support from `archive/tickets/MCPENH-015-add-sau-id-class-to-allocator.md`). RSP is one tier deeper — sub-audit-scoped. Each SAU-NNNN audit owns its own RSP-NNNN namespace; RSP-0001 in SAU-0003 is a different record from RSP-0001 in SAU-0007.

This nesting is structurally analogous to how `continuity-audit` writes RP-NNNN cards under `worlds/<world-slug>/audits/AU-NNNN/retcon-proposals/RP-*.md` — but `continuity-audit` ships with `RP` as a world-scoped class in the allocator (line 24 of `allocate-next-id.ts`) which scans the world's index DB for the highest RP node. RP allocation works because RP cards across all AU directories share a single per-world namespace, which the world index can answer. RSP's namespace is per-SAU, not per-bundle and not per-world — so the world-index branch (default branch in `allocateNextId`) cannot answer the question.

Without allocator support, the skill's lazy-scan pattern works but cannot reuse the canonical allocator contract, and concurrent audit invocations on the same SAU directory (rare but possible during multi-pass authoring) can race.

## Assumption Reassessment (2026-05-03)

1. `tools/world-mcp/src/tools/allocate-next-id.ts` enumerates the current allocator tiers: pipeline, pressure-event, story, story-scoped (including `SAU`). The `AllocateNextIdArgs` interface accepts `world_slug`, `id_class`, and optional `story_slug`. Adding RSP requires ONE more optional argument (`audit_id`) and ONE more resolution branch (`findHighestSubAuditScopedId`). The existing function's argument-validation cascade already handles "id_class requires extra argument" patterns — extend with the `audit_id` analog.
2. `continuity-audit`'s RP cards are world-scoped (allocator scans the world-index DB for highest `RP-*` node). This works for RP because it's a single-namespace-per-world flat allocation. RSP is structurally different: per-audit nesting requires the allocator to know which audit. The cleanest API is `mcp__worldloom__allocate_next_id(world_slug, 'RSP', story_slug=<story_slug>, audit_id=<SAU-NNNN>)` — three identifiers required, parallel to how SAU requires `world_slug + story_slug`.
3. Cross-skill / cross-artifact boundary: RSP cards are emitted ONLY by `branching-story-health-audit` (Phase 8) and consumed ONLY by `storylet-pool-authoring` (mode=audit, post-STPOOL-001). The schema is fully owned by these two skills; this ticket is concerned only with the id-allocation surface, not the card schema (which lives at `.claude/skills/branching-story-health-audit/templates/remediation-storylet-proposal-card.md`).
4. FOUNDATIONS Rule 6 spirit: RSP cards are append-only audit artifacts; allocator support enforces per-SAU uniqueness structurally. Drop-list-at-Phase-9 semantics in the audit skill require that dropped RSP ids become permanent gaps (parallels SLT drop-list); the allocator's natural "highest + 1" behavior preserves this without further work.
5. Schema parity: the RSP card frontmatter mirrors `storylet-pool-authoring`'s `source_audit_path` parse-time consumer schema (per the audit skill's templates/remediation-storylet-proposal-card.md frontmatter comment). This ticket does NOT change that schema; it only changes the allocation surface.

## Architecture Check

1. The new tier is structurally analogous to story-scoped allocation but one nesting level deeper. Add `findHighestSubAuditScopedId(worldSlug, storySlug, auditId, idClass)` paralleling `findHighestStoryScopedId`. The path resolution is `path.join(worldDirectory, "stories", storySlug, "audits", auditId, "remediation-storylet-proposals")` and the file extension is `.md`. The function follows the same shape as the existing helpers — no new abstractions required.
2. Argument-validation cascade extends mechanically: add a `SUB_AUDIT_SCOPED_ID_CLASSES` constant set (initially `{ "RSP" }`); add `audit_id?: string` to `AllocateNextIdArgs`; add corresponding error-case branches in `allocateNextId` for "RSP requires audit_id" and "id_class is not sub-audit-scoped but audit_id was supplied." Mechanical, parallel to existing `story_slug` validation.
3. No backwards-compatibility shim needed: the audit skill's Phase 8 already documents "Switch to `mcp__worldloom__allocate_next_id(world_slug, 'RSP', story_slug=<story_slug>, audit_id=<SAU-NNNN>)` once MCPENH-016 lands"; landing this ticket is the trigger for the one-line skill update.
4. No collision with existing `RP` (continuity-audit's retcon-proposal). `RP-NNNN` and `RSP-NNNN` are distinct id-classes with distinct regex patterns (`/^RP-(\d{4})$/` vs `/^RSP-(\d{4})$/`); the longer prefix means there is no risk of one regex matching the other's ids. The semantic distinction (world-scoped retcon proposals from `continuity-audit` vs sub-audit-scoped remediation storylet proposals from `branching-story-health-audit`) is preserved by the namespace separation.

## Verification Layers

1. **Allocator returns next free RSP id given an existing remediation-storylet-proposals directory** → `allocate-next-id.test.ts` adds RSP cases (empty SAU directory → RSP-0001; RSP-0001..0003 present → RSP-0004; non-RSP files in remediation-storylet-proposals/ ignored).
2. **Allocator rejects RSP without audit_id** → "sub-audit-scoped id_class 'RSP' requires audit_id" error.
3. **Allocator rejects RSP without story_slug** → existing "story-scoped id_class requires story_slug" error (RSP is a sub-tier under story-scoped; both arguments required).
4. **Allocator rejects audit_id on a non-sub-audit-scoped id_class** → "id_class 'X' is not sub-audit-scoped and does not accept audit_id" error.
5. **Allocator returns RSP-0001 when SAU directory does not yet exist** → graceful degradation (the parent SAU directory is created at audit-write time; if RSP allocation is called before that, the empty-directory case applies).
6. **Skill Pre-flight + Phase 8 switch to allocator on landing** → `branching-story-health-audit/SKILL.md` Phase 8 + §ID Allocation + HARD-GATE references switch from manual-scan-with-future-allocator to unconditional allocator call.

## What to Change

### 1. Extend `ID_CLASS_FORMATS`

Add `RSP: { width: 4, zeroPad: true, regex: /^RSP-(\d{4})$/ }` (alphabetic position consistent with other entries).

### 2. Introduce `SUB_AUDIT_SCOPED_ID_CLASS_DIRECTORIES`

```typescript
const SUB_AUDIT_SCOPED_ID_CLASS_DIRECTORIES = {
  RSP: "remediation-storylet-proposals"
} as const satisfies Partial<Record<IdClass, string>>;

type SubAuditScopedIdClass = keyof typeof SUB_AUDIT_SCOPED_ID_CLASS_DIRECTORIES;

function isSubAuditScopedIdClass(value: IdClass): value is SubAuditScopedIdClass {
  return value in SUB_AUDIT_SCOPED_ID_CLASS_DIRECTORIES;
}
```

### 3. Extend `AllocateNextIdArgs`

```typescript
export interface AllocateNextIdArgs {
  world_slug: string;
  id_class: IdClass;
  story_slug?: string;
  audit_id?: string;       // NEW — required for SUB_AUDIT_SCOPED_ID_CLASSES; rejected for others
}
```

### 4. Add `findHighestSubAuditScopedId`

```typescript
function findHighestSubAuditScopedId(
  worldSlug: string,
  storySlug: string,
  auditId: string,
  idClass: SubAuditScopedIdClass
): number | McpError {
  const worldDirectory = resolveWorldDirectory(worldSlug);
  if (!existsSync(worldDirectory)) {
    return createMcpError("world_not_found", `World '${worldSlug}' does not exist.`, {
      world_slug: worldSlug
    });
  }

  const storyDirectory = path.join(worldDirectory, "stories", storySlug);
  if (!existsSync(storyDirectory)) {
    return createMcpError(
      "invalid_input",
      `Story '${storySlug}' does not exist in world '${worldSlug}'.`,
      { world_slug: worldSlug, story_slug: storySlug }
    );
  }

  // The audit_id MUST validate against the SAU regex (don't accept arbitrary strings).
  if (!/^SAU-\d{4}$/.test(auditId)) {
    return createMcpError(
      "invalid_input",
      `audit_id must match pattern 'SAU-NNNN'; got '${auditId}'.`,
      { audit_id: auditId }
    );
  }

  const format = ID_CLASS_FORMATS[idClass];
  // remediation-storylet-proposals/ lives under audits/<auditId>/, NOT audits/<auditId>-<date>/.
  // The audit_id is the bare SAU-NNNN; the SAU file's filename has a date suffix but the directory
  // name uses the bare id. Match the audit skill's Phase 10 step 1 directory creation.
  const directory = path.join(
    storyDirectory,
    "audits",
    auditId,
    SUB_AUDIT_SCOPED_ID_CLASS_DIRECTORIES[idClass]
  );

  let maxValue = 0;
  let fileNames: string[];
  try {
    fileNames = readdirSync(directory);
  } catch {
    return maxValue;  // Empty / missing dir → next id is 1
  }

  for (const fileName of fileNames) {
    if (!fileName.endsWith(".md")) continue;
    const stem = fileName.slice(0, -".md".length);
    const match = format.regex.exec(stem);  // Or stem-prefix slice if RSP-NNNN-<slug>.md format used
    if (match === null) continue;
    const parsedValue = Number.parseInt(match[1] ?? "", 10);
    if (Number.isNaN(parsedValue)) continue;
    maxValue = Math.max(maxValue, parsedValue);
  }
  return maxValue;
}
```

Note on regex match: RSP filenames include a slug suffix (`RSP-NNNN-<slug>.md`), so the regex either needs the optional-suffix form `/^RSP-(\d{4})(?:-.+)?$/` (paralleling STINT) OR a stem-prefix slice like NWP / EPE handle. Adopt the optional-suffix regex form for consistency with STINT.

### 5. Wire the new branch into `allocateNextId`

After existing argument-validation cascade, add:

```typescript
const auditId = args.audit_id?.trim();
const hasAuditId = auditId !== undefined && auditId.length > 0;
const subAuditScopedIdClass = isSubAuditScopedIdClass(args.id_class) ? args.id_class : null;

if (subAuditScopedIdClass !== null && !hasAuditId) {
  return createMcpError(
    "invalid_input",
    `sub-audit-scoped id_class '${args.id_class}' requires audit_id.`,
    { id_class: args.id_class }
  );
}

if (hasAuditId && subAuditScopedIdClass === null) {
  return createMcpError(
    "invalid_input",
    `id_class '${args.id_class}' is not sub-audit-scoped and does not accept audit_id.`,
    { id_class: args.id_class, audit_id: auditId }
  );
}

if (subAuditScopedIdClass !== null && storySlug !== undefined && auditId !== undefined) {
  const highestValue = findHighestSubAuditScopedId(
    args.world_slug,
    storySlug,
    auditId,
    subAuditScopedIdClass
  );
  if (typeof highestValue !== "number") return highestValue;
  const nextValue = highestValue + 1;
  return {
    next_id: `${args.id_class}-${formatNumericValue(nextValue, format.width, format.zeroPad)}`
  };
}
```

The `story_slug` requirement for RSP is implicit — the existing story-scoped check covers it because RSP is also tagged as story-scoped (it lives under `worlds/<slug>/stories/<slug>/audits/...`). Verify the cascade ordering puts the story-scoped check BEFORE the sub-audit-scoped check, OR make RSP NOT in `STORY_SCOPED_ID_CLASS_DIRECTORIES` (since it has its own directory tier) and add the story-slug check independently in the sub-audit branch.

### 6. Update describe-capabilities

`mcp__worldloom__describe_capabilities` should enumerate RSP and document the `audit_id` argument requirement.

### 7. Update generated skill

Once landed, edit `.claude/skills/branching-story-health-audit/SKILL.md`:
- Phase 8 § "Allocate `RSP-NNNN` lazily per emitted card by manual scan": replace with the unconditional allocator call.
- §ID Allocation: simplify the RSP entry.
- §HARD-GATE clause (a): drop the "[allocate lazily; manual scan until MCPENH-016]" parenthetical.

### 8. Update CLAUDE.md

Add `RSP-NNNN` to §ID Allocation Conventions parallel to AU-NNNN / RP-NNNN, noting the sub-audit-scoped tier.

## Files to Touch

- `tools/world-mcp/src/tools/allocate-next-id.ts` (modify — extend types, add helper, wire branch)
- `tools/world-mcp/tests/tools/allocate-next-id.test.ts` (modify — add RSP test cases including new error paths)
- `tools/world-mcp/src/tools/describe-capabilities.ts` (modify — verify RSP + audit_id appear in the enumeration)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify — switch RSP allocation from manual-scan-with-future-allocator to unconditional allocator call in Phase 8 + §ID Allocation + HARD-GATE clause (a))
- `CLAUDE.md` (modify — add `RSP-NNNN` to §ID Allocation Conventions)

## Out of Scope

- `SAU` allocator support — completed in `archive/tickets/MCPENH-015-add-sau-id-class-to-allocator.md` (precondition for this ticket).
- `branching_story_health_audit` task_type registration — tracked in MCPENH-017.
- Generalizing the sub-audit-scoped tier to other future skills — none currently named; if a future audit skill emits per-AU sub-records (e.g., a continuity-audit-style "remediation worker" sub-class), revisit. Don't pre-emptively design for it.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm test -- allocate-next-id` passes with new RSP test cases.
2. Manual integration: invoke `branching-story-health-audit` end-to-end on a real bundle producing two RSP cards → allocator returns `RSP-0001` and `RSP-0002` in the same audit run.
3. Negative: invoke allocator with `id_class='RSP'` and no `audit_id` → returns "sub-audit-scoped id_class 'RSP' requires audit_id" error.
4. Negative: invoke allocator with `id_class='SAU'` and an `audit_id` → returns "id_class 'SAU' is not sub-audit-scoped and does not accept audit_id" error.
5. Negative: invoke allocator with `id_class='RSP'` and `audit_id='SAU-99'` (malformed) → returns "audit_id must match pattern 'SAU-NNNN'" error.

### Invariants

1. RSP ids are monotonic per-(world, story, audit) tuple (highest existing + 1; no reuse).
2. RSP allocation never collides with another SAU's RSP allocation (per-SAU namespace isolation).
3. RSP allocation degrades gracefully when the SAU sub-directory does not yet exist (returns RSP-0001 — the audit-skill creates the directory at write time, after Phase 8 allocation).

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/allocate-next-id.test.ts` — add a new describe-block for sub-audit-scoped allocation covering: empty directory case, partial-fill case, non-RSP files ignored, missing audit_id error, malformed audit_id error, audit_id-on-non-sub-audit-scoped error.

### Commands

1. `cd tools/world-mcp && npm test -- allocate-next-id` — targeted RSP coverage.
2. `cd tools/world-mcp && npm test` — full world-mcp test suite.
3. `cd tools/world-mcp && npm run typecheck` — verify TypeScript compilation passes after `AllocateNextIdArgs` extension.
