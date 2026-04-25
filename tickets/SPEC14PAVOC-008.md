# SPEC14PAVOC-008: Animalia final 10 grandfathering closures via vocabulary expansion

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes (vocabulary-only) — extend `tools/world-index/src/public/canonical-vocabularies.ts` `CANONICAL_DOMAINS` with `institutions` and `everyday_life` (parallel to SPEC-14's prior `geography` + `technology` addition). No engine code changes. Animalia content fixes go through patch engine ops + direct edit on hybrid character frontmatter (per existing Tier-3 precedent).
**Deps**: SPEC-14 (umbrella), `archive/tickets/SPEC14PAVOC-005.md` (closed the history/memory/geography subset; the residual 6 GF-0006 entries were explicitly deferred to a follow-up ticket — this ticket is that follow-up)

## Problem

After SPEC14PAVOC-001 through -005, animalia retains exactly 10 grandfathered findings — two clusters:

- **GF-0004 (4 findings)**: `record_schema_compliance.required` against CHAR-0001 (`vespera-nightwhisper.md`) and CHAR-0002 (`melissa-threadscar.md`) — `world_consistency` is missing the required `continuity_checked_with` field. Both characters predate the schema's enforcement of that field.
- **GF-0006 (6 findings)**: `rule2.non_canonical_domain` against CF-0036 (`everyday_life`, `institutions`) and CF-0038 (`bardic_transmission`, `institution_form`, `migration`, `status`) — none of these six terms are in `CANONICAL_DOMAINS`. Two of them (`institutions`, `everyday_life`) name **mandatory FOUNDATIONS world concerns** (per `docs/FOUNDATIONS.md` §Mandatory World Files), which is the same precedent SPEC-14 used to add `geography` and `technology`. The other four are sub-concept terms with valid canonical re-tag targets.

The user-stated goal: `world-validate animalia` reports zero findings; `worlds/animalia/audits/validation-grandfathering.yaml` has zero entries (or is archived).

## Assumption Reassessment (2026-04-25)

1. `tools/world-index/src/public/canonical-vocabularies.ts:1-26` lists the 24 canonical domains. `institutions` and `everyday_life` are absent. SPEC-14's precedent (lines 33, 130 in `specs/SPEC-14-pa-contract-and-vocabulary-reconciliation.md`) added `geography` and `technology` on the FOUNDATIONS-mandatory-concerns argument; the same argument applies to `institutions` and `everyday_life`.
2. `docs/FOUNDATIONS.md:351-369` Rule 2 §No Pure Cosmetics lists a starter domain set. Line 371 explicitly notes the validator's superset extends this list. The starter list will gain `institutions` and `everyday_life` to match the new enum entries; `>` superset note is preserved.
3. `tools/validators/src/schemas/character-frontmatter.schema.json:41` requires `continuity_checked_with` inside `world_consistency`. CHAR-0001 and CHAR-0002 frontmatter lacks the key (verified by reading the files). Retrofit values: `[]` for CHAR-0001 (first character authored — nothing to check against); `["CHAR-0001"]` for CHAR-0002 (second character — only prior).
4. Schema extension is **not** in scope. The unstaged diff to `character-frontmatter.schema.json` and `diegetic-artifact-frontmatter.schema.json` (per `git status`) tightens the inner schema of `scoped_references` — orthogonal to this ticket. This ticket touches neither schema file.
5. CF-0036 keeps its existing `domains_affected` list verbatim — `everyday_life` and `institutions` become canonical via the enum expansion (no patch op needed against CF-0036).
6. CF-0038 needs four `domains_affected` re-tags via a single `update_record_field` op (operation `set`, field_path `["domains_affected"]`, new_value with the re-tagged list):
   - `institution_form` → `institutions` (now canonical)
   - `migration` → `mobility`
   - `bardic_transmission` → `memory_and_myth`
   - `status` → `status_signaling`
7. CHAR-0001 and CHAR-0002 frontmatter are hybrid YAML-frontmatter files in `worlds/animalia/characters/`. Per `archive/tickets/SPEC14PAVOC-006.md:100-101` precedent, direct edit on character frontmatter is currently writable (Hook 3 canon-aware enforcement is not active for hybrid character files in this phase). Direct edit is acceptable here; future Hook 3 activation will route this through the patch engine.
8. After this ticket lands and verification passes, `worlds/animalia/audits/validation-grandfathering.yaml` will have zero `entries`. Per `archive/tickets/SPEC14PAVOC-006.md:121` precedent, archive the file by renaming to `worlds/animalia/audits/validation-grandfathering-pre-spec14.yaml` for audit-trail value.
9. Cross-package blast radius for the enum expansion: `tools/world-index/src/public/canonical-vocabularies.ts` is consumed by `tools/validators/src/rules/rule2-no-pure-cosmetics.ts` (validates against the set) and `tools/world-mcp/` (`get_canonical_vocabulary` MCP tool returns the list). Both consume the symbol directly — no cached copies, no manual sync. The single-source-of-truth invariant established by SPEC-14 holds.

## Architecture Check

1. Approach B (vocabulary expansion + selective re-tagging) is cleaner than pure data re-tagging because two of the six non-canonical terms (`institutions`, `everyday_life`) name mandatory FOUNDATIONS world concerns. Re-tagging them would contradict the precedent SPEC-14 used to add `geography`. Expanding the enum honors the precedent.
2. No backwards-compatibility shim. Existing CFs that use `institutions` or `everyday_life` pass after the expansion (closing 2 GF-0006 findings without any record edit). Existing CFs that use the four non-canonical-and-not-mandatory-concern terms need explicit re-tags.
3. The MCP tool `get_canonical_vocabulary` requires no structural change — it returns whatever is in `CANONICAL_DOMAINS`. The list's contents are the only thing changing.
4. SPEC-06 (skill rewrite patterns) requires no amendment. Its acceptance criterion already says "every emitted record passes `record_schema_compliance`"; skills already consume `get_canonical_vocabulary` per SPEC-14. The bug isn't skill behavior — it's vocabulary contents.

## Verification Layers

1. Vocabulary surface — `tools/world-index/src/public/canonical-vocabularies.ts` `CANONICAL_DOMAINS` includes `institutions` and `everyday_life`; existing 24 entries preserved; total count = 26.
2. FOUNDATIONS contract — `docs/FOUNDATIONS.md` Rule 2 starter list updated; superset note (line 371) preserved.
3. CF-0036 closure — `world-validate animalia` reports zero `rule2.non_canonical_domain` findings against `_source/canon/CF-0036.yaml` (vocabulary expansion alone resolves both findings).
4. CF-0038 closure — `world-validate animalia` reports zero `rule2.non_canonical_domain` findings against `_source/canon/CF-0038.yaml` (post re-tag of four entries).
5. CHAR closure — `world-validate animalia` reports zero `record_schema_compliance.required` findings against `characters/*.md`.
6. Pipeline-level — `node tools/validators/dist/src/cli/world-validate.js animalia --json | jq '.summary.fail_count + .summary.warn_count + .summary.info_count'` returns `0`.
7. Grandfathering archival — `worlds/animalia/audits/validation-grandfathering.yaml` no longer exists at that path; `worlds/animalia/audits/validation-grandfathering-pre-spec14.yaml` exists with the historical content preserved.

## What to Change

### 1. Extend canonical-domain enum

In `tools/world-index/src/public/canonical-vocabularies.ts`, add to `CANONICAL_DOMAINS` (after `taboo_and_pollution`, alphabetical-adjacent ordering not required since the existing list is loosely thematic):

```ts
"institutions",
"everyday_life",
```

No other changes to the file.

### 2. Update FOUNDATIONS Rule 2 starter list

In `docs/FOUNDATIONS.md` §Rule 2 No Pure Cosmetics (line 351 onward), append to the bulleted starter list (after `geography` per existing alphabetical-ish convention):

```
- institutions
- everyday_life
```

The superset note at line 371 is preserved verbatim.

### 3. CF-0038 domain re-tags via patch engine

Build a single patch plan with one `update_record_field` op:

```ts
{
  op: "update_record_field",
  payload: {
    target_record_id: "CF-0038",
    field_path: ["domains_affected"],
    operation: "set",
    new_value: [
      "settlement_life",
      "trade",
      "labor",
      "mobility",          // was: migration
      "institutions",      // was: institution_form
      "memory_and_myth",   // was: bardic_transmission
      "status_signaling",
      "architecture",
      "daily_routine",
      "status_signaling"   // was: status — collapses to status_signaling; deduplicate post-set
    ]
  }
}
```

**Note**: After dedup, the new list is `[settlement_life, trade, labor, mobility, institutions, memory_and_myth, status_signaling, architecture, daily_routine]` (9 entries vs. original 10; the duplicate `status_signaling` collapses). Submit via `mcp__worldloom__submit_patch_plan`.

### 4. CHAR-0001 retrofit (direct frontmatter edit)

In `worlds/animalia/characters/vespera-nightwhisper.md`, inside `world_consistency:`, add as the last subkey:

```yaml
  continuity_checked_with: []
```

### 5. CHAR-0002 retrofit (direct frontmatter edit)

In `worlds/animalia/characters/melissa-threadscar.md`, inside `world_consistency:`, add as the last subkey:

```yaml
  continuity_checked_with:
    - CHAR-0001
```

### 6. Archive grandfathering file

After all the above changes land and `world-validate animalia` reports zero findings:

```bash
mv worlds/animalia/audits/validation-grandfathering.yaml \
   worlds/animalia/audits/validation-grandfathering-pre-spec14.yaml
```

The file content is preserved as audit-trail; the rename signals zero-current-state.

### 7. Reindex

After all writes:

```bash
node tools/world-index/dist/src/cli/world-index.js build animalia
```

## Files to Touch

- `tools/world-index/src/public/canonical-vocabularies.ts` (modify — add 2 enum entries)
- `docs/FOUNDATIONS.md` (modify — append 2 bullets to Rule 2 starter list)
- `worlds/animalia/_source/canon/CF-0038.yaml` (modify via patch engine — `domains_affected` re-tag)
- `worlds/animalia/characters/vespera-nightwhisper.md` (modify directly — frontmatter `world_consistency.continuity_checked_with: []`)
- `worlds/animalia/characters/melissa-threadscar.md` (modify directly — frontmatter `world_consistency.continuity_checked_with: ["CHAR-0001"]`)
- `worlds/animalia/audits/validation-grandfathering.yaml` (rename to `validation-grandfathering-pre-spec14.yaml`)
- `worlds/animalia/_index/world.db` (regenerated by `world-index build`)

## Out of Scope

- SPEC-14 spec-text amendment. The vocabulary expansion mirrors the prior `geography` + `technology` addition; tracking the further expansion in this ticket's record (and in `archive/tickets/SPEC14PAVOC-008.md` post-archival) is sufficient.
- SPEC-06 amendment. SPEC-06's existing acceptance criterion is unchanged.
- `scoped_references` schema tightening (the unstaged diff in `git status`). Separate concern.
- `record_schema_compliance` adjudication parsing changes. Already landed in SPEC14PAVOC-001.
- Re-evaluating CHAR-0001/CHAR-0002 prose content. The retrofit is structural-only — `continuity_checked_with` reflects authoring chronology, not a fresh continuity audit.
- Approach C (vocabulary-as-mandatory-concerns auto-derivation reform). Tracked as potential future work; not motivated by current trigger.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-index && npm run build && npm test` — canonical-vocabulary unit tests pass with the expanded list.
2. `cd tools/validators && npm run build && npm test` — `rule2_no_pure_cosmetics` tests pass against the expanded enum; `record_schema_compliance` tests pass.
3. `cd tools/world-mcp && npm run build && npm test` — `get_canonical_vocabulary` integration test asserts the returned list matches `CANONICAL_DOMAINS` exactly (the existing test should pick up the new entries automatically).
4. `node tools/validators/dist/src/cli/world-validate.js animalia --json | jq '.summary'` — `fail_count`, `warn_count`, `info_count` all return `0`.

### Invariants

1. After this ticket lands, `worlds/animalia/audits/validation-grandfathering.yaml` does not exist; `validation-grandfathering-pre-spec14.yaml` exists with the historical 10 entries preserved.
2. `CANONICAL_DOMAINS` is the single source of truth for canonical domain enumeration; `tools/validators/` and `tools/world-mcp/` consume it without duplication.
3. FOUNDATIONS Rule 2 starter list is a subset of `CANONICAL_DOMAINS` (the superset note documents this relation).
4. CF-0036's `domains_affected` is unchanged on disk; CF-0038's `domains_affected` has 9 entries, all canonical, with the four re-tags applied.
5. CHAR-0001 and CHAR-0002 frontmatter both carry `continuity_checked_with` (empty list and `[CHAR-0001]` respectively).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/rules/animalia-baseline.test.ts` — assert `world-validate animalia` reports zero findings post-cleanup. Update the expected counts to `0` across all severities. (File is already `M`-modified per `git status`; align with this ticket's expected end-state.)
2. None additional — the existing `get_canonical_vocabulary` test reads `CANONICAL_DOMAINS` at runtime and picks up the two new entries without test code changes.

### Commands

1. `cd tools/world-index && npm run build`
2. `cd tools/validators && npm run build && npm test`
3. `cd tools/world-mcp && npm run build && npm test`
4. Submit patch plan for CF-0038 re-tag via `mcp__worldloom__submit_patch_plan`.
5. Direct-edit CHAR-0001 and CHAR-0002 frontmatter.
6. `node tools/world-index/dist/src/cli/world-index.js build animalia`
7. `node tools/validators/dist/src/cli/world-validate.js animalia --json > /tmp/post-spec14-008.json`
8. `jq '.summary' /tmp/post-spec14-008.json` — confirm zero findings.
9. `mv worlds/animalia/audits/validation-grandfathering.yaml worlds/animalia/audits/validation-grandfathering-pre-spec14.yaml`
10. `node tools/validators/dist/src/cli/world-validate.js animalia --json | jq '.summary'` — final post-archive confirmation.
