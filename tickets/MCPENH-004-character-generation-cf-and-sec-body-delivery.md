# MCPENH-004: Deliver full parsed CF (and seed-relevant SEC) bodies in character_generation context packet

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-mcp/src/context-packet/governing-world-context.ts` (extend `projectCharacterGenerationGoverningRecord` to project parsed bodies for `canon_fact` and seed-relevant `section` nodes); test coverage; potentially `tools/world-mcp/src/context-packet/shared.ts` if the body-trimming helper needs a per-task escape hatch
**Deps**: `archive/tickets/MCPENH-003-mystery-reserve-projection-field-names.md` (independent fix; sequencing only matters because both edit the same projection function and MCPENH-003 is a smaller, less-risky bug fix that should ship first)

## Problem

During the 2026-04-28 CHAR-0004 (Rill) character-generation run, the bound CFs (CF-0006, CF-0017, CF-0020, CF-0021, CF-0024, CF-0034, CF-0036, CF-0037, CF-0014) came back from `mcp__worldloom__get_context_packet(task_type='character_generation')` with only `body_preview` (282 chars) populated — not full parsed `record` bodies. The most load-bearing CF for Rill was CF-0037 (family-handled waystations tradition); her stationkeeper-child profile derives directly from its `distribution.who_can_do_it` / `distribution.who_cannot_easily_do_it` / `costs_and_limits` / `visible_consequences` / `notes` blocks. The dossier-construction subagent could not work from the 282-char preview and read `worlds/animalia/_source/canon/CF-0037.yaml` directly from disk — bypassing the MCP entirely.

Same gap for seed-relevant SEC records: SEC-ELF-001 (canal-town heartland working households), SEC-INS-001 (family/clan/household), SEC-PAS-001 (humans baseline), SEC-MTS-002 (auxiliary contractor labor), and others were body_preview-only and the subagent fell back to direct disk reads.

The projection function at `tools/world-mcp/src/context-packet/governing-world-context.ts:272-295` (`projectCharacterGenerationGoverningRecord`) returns `undefined` for any node type other than `invariant` and `mystery_reserve_entry`. Returning `undefined` causes `body_preview`-only delivery via the shared body-trimming path. CFs and SECs that the brief identifies as seeds (or that resolve via `touched_by_cf` from the seed CFs) deserve full parsed bodies for the same reason invariants and mystery records do — they are the load-bearing input to Phase 5 (capability validation) and Phases 1-6 (material reality, institutional embedding, voice).

The 40% of Rill's canon access that bypassed the MCP via direct disk reads of `_source/canon/*.yaml` and `_source/<sec-class>/*.yaml` was forced by this packet thinness, not by an architectural intent to support direct disk reads as a primary path. FOUNDATIONS' Tooling Recommendation expects MCP-mediated retrieval; the packet must deliver the bodies the consumer task needs.

## Assumption Reassessment (2026-04-29)

1. The projection function is `projectCharacterGenerationGoverningRecord` at `tools/world-mcp/src/context-packet/governing-world-context.ts:272-295`. Verified by direct read in this session. The function returns full parsed body for `invariant`, projects six fields (post-MCPENH-003: nine fields) for `mystery_reserve_entry`, and returns `undefined` for all other node types — meaning `canon_fact`, `change_log_entry`, `open_question_entry`, `named_entity`, `section`, `subsection`, `bullet_cluster`, `character_record`, etc. all fall through to body_preview-only delivery.
2. The 282-char body_preview is set in `tools/world-mcp/src/context-packet/shared.ts:285` by `makeBodyPreview(row.body)`. The full body lives at `row.body` (the indexed YAML) but is intentionally trimmed for packet density. The character_generation profile needs the full body for seed CFs and seed-resolved SECs; other non-seed node types can remain preview-only.
3. The `character_generation` ranking profile at `tools/world-mcp/src/ranking/profiles/index.ts:29` and its sibling at `tools/world-mcp/src/ranking/profiles/character-generation.ts` (verify exact path during implementation) determines which nodes are pulled into the packet. Bound CFs already arrive in the packet via the ranking profile + seed_nodes resolution; the gap is body delivery, not node selection.
4. Cross-tool boundary under audit: between `get_context_packet` (provider) and `task_type='character_generation'` consumers (the character-generation skill's Phase 5 capability validation, Phase 7c distribution conformance, and Phases 1-6 prose construction). Shared schema: the `record` field on `governing_world_context.nodes[*]` and `local_authority.nodes[*]`. Pre-fix, the packet under-delivers exactly where the skill's documented retrieval shape needs full content.
5. FOUNDATIONS principle motivating this ticket: §Tooling Recommendation. The packet's intent is to deliver, in one call, the world-state slice the task needs. Forcing the consumer to fall back to disk reads of `_source/canon/CF-NNNN.yaml` for seed CFs (and to `_source/<sec-class>/SEC-*.yaml` for seed-relevant sections) bypasses the MCP retrieval discipline FOUNDATIONS prescribes. Rule 4 (No Globalization by Accident) is the load-bearing FOUNDATIONS rule for character Phase 7c distribution conformance — performing that check requires the full `distribution.who_can_do_it` / `distribution.who_cannot_easily_do_it` blocks of every capability CF, which 282 chars of `body_preview` does not deliver.
6. Schema impact — additive only on the projection side. `governing_world_context.nodes[*].record` becomes a populated parsed object for `canon_fact` nodes (and seed-relevant `section` nodes) where it was undefined / missing before. Existing consumers expecting `body_preview` continue to receive it. No consumer breaks; consumers gain access to a richer record body.
7. Pipeline-wide grep for callers that depend on `body_preview` being the only available content: `rg -n "body_preview" tools/world-mcp/src/ tools/patch-engine/src/ .claude/skills/`. The relevant consumer surface is the character-generation skill's Phase 5 / 7c references, which already document `get_record(cf_id)` as the per-id fallback. After this ticket, those references should be updated to note that bound CFs in the packet now arrive with full bodies; per-id `get_record` remains valid for non-seed CFs reached via deeper exploration.
8. Adjacent contradictions exposed: SEC body delivery is more nuanced than CF body delivery. The packet currently selects sections by relevance ranking; not every section in the packet is necessarily seed-relevant. Two implementation strategies:
   - (a) Deliver full bodies for every `section` node in the character_generation packet — simple, bloats the packet but predictable.
   - (b) Deliver full bodies only for sections whose `touched_by_cf` overlaps the seed CFs, OR whose `file_class` matches the high-priority list for character_generation (`everyday-life`, `peoples-and-species`, `institutions`, `economy-and-resources`, `geography`) — denser, more code.
   This ticket commits to strategy (b) because it preserves packet density while delivering full content for the SEC records the character-generation skill's Phase 1, Phase 2, and Phase 6 references explicitly cite by file_class. Sections not in the high-priority file_class list (e.g., `magic-or-tech-systems` for an ordinary-laborer character with no magical capability) remain preview-only and can be retrieved per-id via `get_record` if Phase 0's conditional-context-packet-expansion clause fires.
9. Token budget headroom: the character_generation `DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE` is 8000 (per `tools/world-mcp/src/ranking/profiles/index.ts:41`). Current packet sizes can already exceed transport limits (the Rill packet was 143KB and required subagent extraction). Adding full CF and seed-relevant SEC bodies will increase packet density in the seeds dimension and may push more packets over the inline-transport limit. The accepted operational fallback (subagent extraction of persisted-output redirect) is documented in `.claude/skills/character-generation/references/world-state-prerequisites.md` after the recent character-generation audit; this ticket does NOT need to solve oversize transport — it documents the trade as part of §Out of Scope.

## Architecture Check

1. Extending the projection by node type (full body for seed-relevant CFs and SECs; preview for non-seed nodes) is the cleanest fit for the existing per-task projection pattern at `projectCharacterGenerationGoverningRecord`. The alternative — a global flag that toggles full-body delivery for all node types — would over-deliver content the consumer does not need (e.g., `change_log_entry` bodies are rarely useful at the packet level for character generation).
2. No backwards-compatibility shims. The projection's existing return shape (parsed object for some node types, undefined for others) is preserved for non-CF non-SEC types; the additive change extends the parsed-object branch to include `canon_fact` and the seed-relevant `section` subset.

## Verification Layers

1. The character_generation packet's `governing_world_context.nodes[*].record` populates a parsed object for every `canon_fact` node whose id appears in the request's `seed_nodes` list (or is reached via seed-touched_by_cf within one hop) → `tools/world-mcp/tests/context-packet/governing-world-context.test.ts` (or sibling test path) asserts a fixture-based test of seed CF body delivery.
2. The character_generation packet's `governing_world_context.nodes[*].record` populates a parsed object for every `section` node whose `file_class` is one of `everyday-life`, `peoples-and-species`, `institutions`, `economy-and-resources`, `geography` AND whose `touched_by_cf` overlaps the seed CFs → test fixture asserts SEC body delivery for the expected file_class subset.
3. Non-seed-relevant sections (e.g., `magic-or-tech-systems` SECs in an ordinary-laborer fixture) remain `body_preview`-only → test fixture asserts the negative case.
4. Phase 5 capability validation in a character-generation dry-run for a CF-0037-shape brief no longer requires direct `Read` of `_source/canon/CF-0037.yaml` to access `distribution.who_can_do_it` content → skill dry-run.
5. FOUNDATIONS alignment — the packet delivers the world-state slice the character_generation task needs without forcing disk-read fallbacks for seed CFs → FOUNDATIONS alignment check (Tooling Recommendation + Rule 4 No Globalization by Accident).

## What to Change

### 1. Extend `projectCharacterGenerationGoverningRecord` to deliver full parsed bodies for seed-relevant CFs and SECs

In `tools/world-mcp/src/context-packet/governing-world-context.ts:272-295`, after the `mystery_reserve_entry` branch, add:

```ts
if (row.node_type === "canon_fact" && rowIsSeedOrSeedTouchedByCf(row, seedNodeIds, db)) {
  return parsed;
}

if (
  row.node_type === "section" &&
  CHARACTER_GENERATION_PRIORITY_FILE_CLASSES.has(row.file_class) &&
  sectionTouchesSeedCf(row, seedNodeIds, db)
) {
  return parsed;
}
```

`rowIsSeedOrSeedTouchedByCf` and `sectionTouchesSeedCf` are new helpers added in this ticket. `CHARACTER_GENERATION_PRIORITY_FILE_CLASSES` is a new constant set to `new Set(['everyday-life', 'peoples-and-species', 'institutions', 'economy-and-resources', 'geography'])`. Sections with file_class outside that set (e.g., `magic-or-tech-systems`, `timeline`) remain preview-only — Phase 0's conditional-context-packet-expansion clause already covers selective `magic-or-tech-systems` retrieval via `search_nodes` for characters with magical capability.

The exact signature of `projectCharacterGenerationGoverningRecord` may need to be extended to receive `seedNodeIds` and `db` (currently it receives only `row`). Confirm signature during implementation; if extending the signature, update callers in the same module.

### 2. Update test coverage

Extend (or create) `tools/world-mcp/tests/context-packet/governing-world-context.test.ts` (verify exact path during implementation) with:

- A fixture world containing at least one CF with non-empty `distribution.who_can_do_it`, `costs_and_limits`, `notes`.
- A fixture seed_nodes list that includes that CF.
- Assert `governing_world_context.nodes[<that CF id>].record` contains the full parsed body, including the `distribution` and `notes` fields.
- A second fixture seed-touched SEC record (file_class in the priority set) similarly delivered with full body.
- A negative-case fixture: a SEC record with file_class `magic-or-tech-systems` that is NOT seed-touched — assert its `record` field remains undefined and only `body_preview` is populated.

### 3. Update character-generation skill prose to reflect post-fix retrieval shape

In `.claude/skills/character-generation/references/world-state-prerequisites.md`, update the §Primary load: context packet body description to note that the packet now delivers full parsed bodies for seed-relevant CFs and SEC records (file_class in the priority set). Update the Phase-to-record mapping table rows for Phase 5 (capability CFs) and Phases 1-6 (SEC records) to note that direct `Read` of `_source/canon/CF-NNNN.yaml` is no longer needed for seed-relevant CFs; per-id `get_record` remains valid for deeper non-seed exploration.

In `.claude/skills/character-generation/references/phase-7-canon-safety-check.md` §Phase 7c, update the Phase 7c text from `look up matching Canon Fact Records via search_nodes(node_type='canon_fact', filters={domain: <capability domain>}) ... and get_record(cf_id) for each candidate` to acknowledge that seed-relevant CFs already arrive in the packet with full bodies; `search_nodes` + `get_record` remains the path for capability CFs not pulled in as seeds.

### 4. Update `world-state-prerequisites.md` oversize-packet guidance

The oversize-packet handling paragraph added during the recent character-generation audit (lines 21+ of `world-state-prerequisites.md`) is still correct — denser bodies will tend to push more packets over the inline-transport limit, making the subagent-extraction fallback more common, not less. Confirm the prose remains accurate; no edit required, but call out in the implementation report.

## Files to Touch

- `tools/world-mcp/src/context-packet/governing-world-context.ts` (modify — extend `projectCharacterGenerationGoverningRecord`; add helpers)
- `tools/world-mcp/tests/context-packet/governing-world-context.test.ts` (modify or new — fixture + assertion coverage)
- `.claude/skills/character-generation/references/world-state-prerequisites.md` (modify — body delivery description + Phase-to-record mapping table)
- `.claude/skills/character-generation/references/phase-7-canon-safety-check.md` (modify — Phase 7c retrieval-path update)

## Out of Scope

- Solving oversize-packet transport. The subagent-extraction fallback is already documented in the character-generation skill (added during the recent audit) and remains the operational path for packets exceeding the inline limit. This ticket increases the cases where the fallback fires (denser bodies = larger packets); it does not change the fallback itself.
- Extending the same body-delivery rule to other task types (`canon_addition`, `diegetic_artifact_generation`, `continuity_audit`, the four canon-pipeline-adjacent task types from MCPENH-002). Each task type's projection function makes its own per-node-type body-delivery decision based on what its consumer skill actually needs. A separate ticket per task type can extend body delivery there if the same gap surfaces during a sibling skill audit.
- Increasing `DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE['character_generation']` from 8000. The `token_budget` is a request-level parameter; callers can already override via the request. The default sets a baseline that callers can raise when needed.
- Repairing the M-record projection's field-name bug. That is completed in `archive/tickets/MCPENH-003-mystery-reserve-projection-field-names.md` (separate, smaller, landed first).
- Fixing the engine-side stale-index detection. That is ENGINESYNC-001.
- Propagating Phase 9 commit-guidance to sibling engine-submitting skills. That is COMMITGUIDE-001.

## Acceptance Criteria

### Tests That Must Pass

1. The new/extended test in `tools/world-mcp/tests/context-packet/` confirms seed CF nodes return full parsed bodies (`distribution.*`, `costs_and_limits`, `notes`) in the character_generation packet.
2. The same test confirms seed-touched SEC nodes with file_class in `[everyday-life, peoples-and-species, institutions, economy-and-resources, geography]` return full parsed bodies.
3. The same test confirms non-seed-relevant SEC nodes (file_class outside the priority set, OR not seed-touched) remain `body_preview`-only.
4. `cd tools/world-mcp && npm test` passes the full suite.
5. Skill prose reverts/updates land — `rg -n "directly when the packet exposes only body_preview" .claude/skills/character-generation/references/world-state-prerequisites.md` returns zero hits (the workaround language is replaced with positive delivery claims).

### Invariants

1. Seed-relevant CFs and SECs arrive in the character_generation packet with full parsed bodies — no per-id `get_record` fallback required to access `distribution`, `costs_and_limits`, or `notes` fields for a seed CF.
2. Non-seed-relevant SECs remain preview-only — packet density is preserved by not over-delivering bodies the consumer task does not need.
3. Existing `body_preview`-consuming code paths continue to work — `body_preview` is still populated for every node in the packet.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/context-packet/governing-world-context.test.ts` — fixture-based test of full-body delivery for seed CFs and seed-touched priority-file_class SECs; negative case for non-seed-relevant SECs.

### Commands

1. `cd tools/world-mcp && npm test` — package-local build + test proof.
2. `rg -n "rowIsSeedOrSeedTouchedByCf|CHARACTER_GENERATION_PRIORITY_FILE_CLASSES" tools/world-mcp/src/context-packet/governing-world-context.ts` — confirms helper / constant additions land.
3. Skill dry-run against a known-CF-0037-shape brief — confirms Phase 5 capability validation can read `distribution.who_can_do_it` from the packet's CF-0037 record without direct disk reads.
