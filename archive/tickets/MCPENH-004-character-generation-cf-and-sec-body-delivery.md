# MCPENH-004: Deliver full parsed CF (and seed-relevant SEC) bodies in character_generation context packet

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-mcp/src/context-packet/governing-world-context.ts` (character_generation record projection for seed-relevant `canon_fact_record` and priority `section` nodes), packet-layer call sites, shared projection type, test coverage, `docs/CONTEXT-PACKET-CONTRACT.md`, and character-generation retrieval prose
**Deps**: `archive/tickets/MCPENH-003-mystery-reserve-projection-field-names.md` (independent fix; sequencing only matters because both edit the same projection function and MCPENH-003 is a smaller, less-risky bug fix that should ship first)

## Problem

At intake, during the 2026-04-28 CHAR-0004 (Rill) character-generation run, the bound CFs (CF-0006, CF-0017, CF-0020, CF-0021, CF-0024, CF-0034, CF-0036, CF-0037, CF-0014) came back from `mcp__worldloom__get_context_packet(task_type='character_generation')` with only `body_preview` populated — not full parsed `record` bodies. The most load-bearing CF for Rill was CF-0037 (family-handled waystations tradition); her stationkeeper-child profile derives directly from its `distribution.who_can_do_it` / `distribution.who_cannot_easily_do_it` / `costs_and_limits` / `visible_consequences` / `notes` blocks. The dossier-construction subagent could not work from the preview and read `worlds/animalia/_source/canon/CF-0037.yaml` directly from disk — bypassing the MCP entirely.

The same gap existed for seed-relevant SEC records: SEC-ELF-001 (canal-town heartland working households), SEC-INS-001 (family/clan/household), SEC-PAS-001 (humans baseline), SEC-MTS-002 (auxiliary contractor labor), and others were body_preview-only and the subagent fell back to direct disk reads.

Before this ticket, the character_generation projection in `tools/world-mcp/src/context-packet/governing-world-context.ts` returned parsed records only for `invariant` and `mystery_reserve_entry`. Returning `undefined` causes preview-only delivery via the shared body-trimming path. CFs and SECs that the brief identifies as seeds, or that resolve via `touched_by_cf` from seed CFs, deserve full parsed bodies for the same reason invariants and mystery records do — they are the load-bearing input to Phase 5 (capability validation) and Phases 1-6 (material reality, institutional embedding, voice).

The 40% of Rill's canon access that bypassed the MCP via direct disk reads of `_source/canon/*.yaml` and `_source/<sec-class>/*.yaml` was forced by this packet thinness, not by an architectural intent to support direct disk reads as a primary path. FOUNDATIONS' Tooling Recommendation expects MCP-mediated retrieval; the packet must deliver the bodies the consumer task needs.

## Assumption Reassessment (2026-04-29)

1. The live projection seam is now `createCharacterGenerationRecordProjection` / `projectCharacterGenerationRecord` in `tools/world-mcp/src/context-packet/governing-world-context.ts`. Reassessment corrected the drafted node type from `canon_fact` to the live `canon_fact_record` (`tools/world-index/src/schema/types.ts`, `tools/world-index/src/parse/atomic.ts`).
2. `body_preview` is set in `tools/world-mcp/src/context-packet/shared.ts` by `makeBodyPreview(row.body)`. The full body lives at `row.body` (the indexed YAML) but is intentionally trimmed for packet density. The character_generation profile needs the full body for seed CFs and seed-resolved SECs; other non-seed node types can remain preview-only.
3. The `character_generation` ranking profile at `tools/world-mcp/src/ranking/profiles/index.ts` and `tools/world-mcp/src/ranking/profiles/character-generation.ts` determines which nodes are pulled into the packet. Bound CFs already arrive in packet layers via seed/locality resolution; the gap was body delivery, not node selection.
4. Cross-tool boundary under audit: between `get_context_packet` (provider) and `task_type='character_generation'` consumers (the character-generation skill's Phase 5 capability validation, Phase 7c distribution conformance, and Phases 1-6 prose construction). Shared schema: the `record` field on packet nodes across `local_authority`, `exact_record_links`, `scoped_local_context`, `governing_world_context`, and `impact_surfaces`. Pre-fix, the packet under-delivered exactly where the skill's documented retrieval shape needed full content.
5. FOUNDATIONS principle motivating this ticket: §Tooling Recommendation. The packet's intent is to deliver, in one call, the world-state slice the task needs. Forcing the consumer to fall back to disk reads of `_source/canon/CF-NNNN.yaml` for seed CFs (and to `_source/<sec-class>/SEC-*.yaml` for seed-relevant sections) bypasses the MCP retrieval discipline FOUNDATIONS prescribes. Rule 4 (No Globalization by Accident) is the load-bearing FOUNDATIONS rule for character Phase 7c distribution conformance — performing that check requires the full `distribution.who_can_do_it` / `distribution.who_cannot_easily_do_it` blocks of every capability CF, which 282 chars of `body_preview` does not deliver.
6. Schema impact — additive only on the projection side. Character_generation packet nodes now receive populated parsed `record` objects for seed-relevant `canon_fact_record` nodes and seed-touched priority `section` nodes where they were previously undefined / missing. Existing consumers expecting `body_preview` continue to receive it in `delivery_mode='full'`. No consumer breaks; consumers gain access to a richer record body.
7. Pipeline-wide grep for callers that depend on `body_preview` being the only available content: `rg -n "body_preview" tools/world-mcp/src/ tools/patch-engine/src/ .claude/skills/`. The relevant consumer surface is the character-generation skill's Phase 5 / 7c references, which already document `get_record(cf_id)` as the per-id fallback. After this ticket, those references should be updated to note that bound CFs in the packet now arrive with full bodies; per-id `get_record` remains valid for non-seed CFs reached via deeper exploration.
8. Adjacent contradictions exposed: SEC body delivery is more nuanced than CF body delivery. The packet currently selects sections by relevance ranking; not every section in the packet is necessarily seed-relevant. Two implementation strategies:
   - (a) Deliver full bodies for every `section` node in the character_generation packet — simple, bloats the packet but predictable.
   - (b) Deliver full bodies only for sections whose `touched_by_cf` overlaps the seed CFs AND whose `file_class` matches the high-priority list for character_generation (`EVERYDAY_LIFE`, `PEOPLES_AND_SPECIES`, `INSTITUTIONS`, `ECONOMY_AND_RESOURCES`, `GEOGRAPHY`) — denser, more code.
   This ticket commits to strategy (b) because it preserves packet density while delivering full content for the SEC records the character-generation skill's Phase 1, Phase 2, and Phase 6 references explicitly cite by file_class. Sections not in the high-priority file_class list (e.g., `MAGIC_OR_TECH_SYSTEMS` for an ordinary-laborer character with no magical capability) remain preview-only and can be retrieved per-id via `get_record` if Phase 0's conditional-context-packet-expansion clause fires.
9. Token budget headroom: the character_generation `DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE` is 8000 (per `tools/world-mcp/src/ranking/profiles/index.ts:41`). Current packet sizes can already exceed transport limits (the Rill packet was 143KB and required subagent extraction). Adding full CF and seed-relevant SEC bodies will increase packet density in the seeds dimension and may push more packets over the inline-transport limit. The accepted operational fallback (subagent extraction of persisted-output redirect) is documented in `.claude/skills/character-generation/references/world-state-prerequisites.md` after the recent character-generation audit; this ticket does NOT need to solve oversize transport — it documents the trade as part of §Out of Scope.

## Architecture Check

1. Extending the character_generation record projection by node type and seed relevance (full body for seed-relevant CFs and priority SECs; preview for non-seed nodes) is the cleanest fit for the existing per-task projection pattern. The alternative — a global flag that toggles full-body delivery for all node types — would over-deliver content the consumer does not need (e.g., `change_log_entry` bodies are rarely useful at the packet level for character generation).
2. No backwards-compatibility shims. The projection's existing return shape (parsed object for some node types, undefined for others) is preserved for non-CF non-SEC types; the additive change extends the parsed-object branch to include the seed-relevant `canon_fact_record` and priority `section` subset.

## Verification Layers

1. The character_generation packet populates a parsed `record` object for every seed-relevant `canon_fact_record` node whose id appears in the request's seed-local authority set or is reached via seed-local edges → `tools/world-mcp/tests/context-packet/character-generation-completeness.test.ts` asserts fixture-based seed CF body delivery.
2. The character_generation packet populates a parsed `record` object for every `section` node whose `file_class` is one of `EVERYDAY_LIFE`, `PEOPLES_AND_SPECIES`, `INSTITUTIONS`, `ECONOMY_AND_RESOURCES`, `GEOGRAPHY` AND whose `touched_by_cf` overlaps the seed CFs → `tools/world-mcp/tests/context-packet/character-generation-completeness.test.ts` asserts SEC body delivery for the expected file_class subset.
3. Non-priority or non-seed-relevant sections (e.g., `MAGIC_OR_TECH_SYSTEMS` SECs in an ordinary-laborer fixture) remain `body_preview`-only → test fixture asserts the negative case.
4. Phase 5 capability validation prose no longer directs operators to disk-read `_source/canon/CF-NNNN.yaml` when the packet supplies seed CF `record` bodies → manual review + grep-proof on `.claude/skills/character-generation/`.
5. FOUNDATIONS alignment — the packet delivers the world-state slice the character_generation task needs without forcing disk-read fallbacks for seed CFs → FOUNDATIONS alignment check (Tooling Recommendation + Rule 4 No Globalization by Accident).

## What to Change

### 1. Extend the character_generation record projection to deliver full parsed bodies for seed-relevant CFs and SECs

`tools/world-mcp/src/context-packet/governing-world-context.ts` now exports `createCharacterGenerationRecordProjection(db, worldSlug, seedNodeIds)`. The projection keeps full parsed bodies for all invariants and Mystery Reserve firewall fields, and additively returns full parsed records for:

- seed-relevant `canon_fact_record` nodes
- `section` nodes whose `file_class` is in `EVERYDAY_LIFE`, `PEOPLES_AND_SPECIES`, `INSTITUTIONS`, `ECONOMY_AND_RESOURCES`, or `GEOGRAPHY` and whose `touched_by_cf` overlaps the seed-relevant CF ids

The projection is passed through all packet layers so seed CFs in `local_authority` and touched sections in `scoped_local_context` receive the same task-specific `record` behavior. Sections with file_class outside the priority set (for example, `MAGIC_OR_TECH_SYSTEMS`, `TIMELINE`) remain preview-only unless retrieved per-id via `get_record`.

### 2. Update test coverage

Extend `tools/world-mcp/tests/context-packet/character-generation-completeness.test.ts` with:

- A fixture world containing at least one CF with non-empty `distribution.who_can_do_it`, `costs_and_limits`, `notes`.
- A fixture seed_nodes list that includes that CF.
- Assert the packet node for that CF id contains the full parsed body, including the `distribution` and `notes` fields.
- A second fixture seed-touched SEC record (file_class in the priority set) similarly delivered with full body.
- A negative-case fixture: a SEC record with file_class `MAGIC_OR_TECH_SYSTEMS` that is seed-touched but not priority — assert its `record` field remains undefined and only `body_preview` is populated.

### 3. Update character-generation skill prose to reflect post-fix retrieval shape

In `.claude/skills/character-generation/references/world-state-prerequisites.md`, update the §Primary load: context packet body description to note that the packet now delivers full parsed bodies for seed-relevant CFs and SEC records (file_class in the priority set). Update the Phase-to-record mapping table rows for Phase 5 (capability CFs) and Phases 1-6 (SEC records) to note that direct `Read` of `_source/canon/CF-NNNN.yaml` is no longer needed for seed-relevant CFs; per-id `get_record` remains valid for deeper non-seed exploration.

In `.claude/skills/character-generation/references/phase-7-canon-safety-check.md` §Phase 7c, update the Phase 7c text to acknowledge that seed-relevant CFs already arrive in the packet with full bodies; `search_nodes(node_type='canon_fact_record')` + `get_record` remains the path for capability CFs not pulled in as seeds.

### 4. Update `world-state-prerequisites.md` oversize-packet guidance

The oversize-packet handling paragraph added during the recent character-generation audit (lines 21+ of `world-state-prerequisites.md`) is still correct — denser bodies will tend to push more packets over the inline-transport limit, making the subagent-extraction fallback more common, not less. Confirm the prose remains accurate; no edit required, but call out in the implementation report.

## Files to Touch

- `tools/world-mcp/src/context-packet/governing-world-context.ts` (modify — add seed-aware character_generation record projection helpers)
- `tools/world-mcp/src/context-packet/assemble.ts` (modify — create/pass character_generation record projection through packet layers)
- `tools/world-mcp/src/context-packet/shared.ts` (modify — shared `PacketRecordProjection` type)
- `tools/world-mcp/src/context-packet/local-authority.ts` (modify — accept optional record projection)
- `tools/world-mcp/src/context-packet/exact-record-links.ts` (modify — accept optional record projection)
- `tools/world-mcp/src/context-packet/scoped-local-context.ts` (modify — accept optional record projection)
- `tools/world-mcp/src/context-packet/impact-surfaces.ts` (modify — accept optional record projection)
- `tools/world-mcp/tests/context-packet/character-generation-completeness.test.ts` (modify — fixture + assertion coverage)
- `docs/CONTEXT-PACKET-CONTRACT.md` (modify — packet projection contract)
- `.claude/skills/character-generation/SKILL.md` (modify — retrieval summary)
- `.claude/skills/character-generation/references/phases-1-6-character-construction.md` (modify — Phase 5 retrieval path)
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

1. The new/extended test in `tools/world-mcp/tests/context-packet/character-generation-completeness.test.ts` confirms seed CF nodes return full parsed bodies (`distribution.*`, `costs_and_limits`, `notes`) in the character_generation packet.
2. The same test confirms seed-touched SEC nodes with file_class in `[EVERYDAY_LIFE, PEOPLES_AND_SPECIES, INSTITUTIONS, ECONOMY_AND_RESOURCES, GEOGRAPHY]` return full parsed bodies.
3. The same test confirms non-priority SEC nodes remain `body_preview`-only even when touched by a seed CF.
4. `cd tools/world-mcp && npm test` passes the full suite.
5. Skill prose reverts/updates land — `rg -n "directly when the packet exposes only body_preview" .claude/skills/character-generation/references/world-state-prerequisites.md` returns zero hits (the workaround language is replaced with positive delivery claims).

### Invariants

1. Seed-relevant CFs and SECs arrive in the character_generation packet with full parsed bodies — no per-id `get_record` fallback required to access `distribution`, `costs_and_limits`, or `notes` fields for a seed CF.
2. Non-seed-relevant SECs remain preview-only — packet density is preserved by not over-delivering bodies the consumer task does not need.
3. Existing `body_preview`-consuming code paths continue to work — `body_preview` is still populated for every node in the packet.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/context-packet/character-generation-completeness.test.ts` — fixture-based test of full-body delivery for seed CFs and seed-touched priority-file_class SECs; negative case for non-priority SECs.

### Commands

1. `cd tools/world-mcp && npm test` — package-local build + test proof.
2. `rg -n "createCharacterGenerationRecordProjection|CHARACTER_GENERATION_PRIORITY_SECTION_FILE_CLASSES" tools/world-mcp/src/context-packet/governing-world-context.ts` — confirms helper / constant additions land.
3. `if rg -n "directly when the packet exposes only body_preview|node_type='canon_fact'|node_type=\\\"canon_fact\\\"" .claude/skills/character-generation docs/CONTEXT-PACKET-CONTRACT.md; then exit 1; fi` — confirms the workaround wording and stale `canon_fact` node-type examples are gone from the updated consumer prose.

## Outcome

Completion date: 2026-04-29.

Completed. Character_generation packet assembly now creates a seed-aware record projection and passes it through all packet layers. The projection preserves existing invariant and Mystery Reserve behavior, adds full parsed records for seed-relevant `canon_fact_record` nodes, and adds full parsed records for seed-touched priority SEC sections while leaving non-priority or non-seed sections preview-only. Character-generation skill prose and `docs/CONTEXT-PACKET-CONTRACT.md` now describe the post-fix packet shape and use the live `canon_fact_record` node type in retrieval examples.

## Verification Result

1. `cd tools/world-mcp && npm test` — passed after rebuilding `dist/`; 206 tests passed.
2. `rg -n 'createCharacterGenerationRecordProjection|CHARACTER_GENERATION_PRIORITY_SECTION_FILE_CLASSES' tools/world-mcp/src/context-packet/governing-world-context.ts` — confirmed the landed projection helper and priority SEC class constant.
3. `if rg -n "directly when the packet exposes only body_preview|node_type='canon_fact'|node_type=\\\"canon_fact\\\"" .claude/skills/character-generation docs/CONTEXT-PACKET-CONTRACT.md; then exit 1; fi` — passed; updated consumer prose no longer contains the packet-thinness workaround or stale `canon_fact` node-type examples.
4. Manual FOUNDATIONS alignment check — the change keeps character-generation canon reads MCP-mediated and does not add any canon-mutating path.

Ignored artifact state: `tools/world-mcp/.secret`, `tools/world-mcp/dist/`, and `tools/world-mcp/node_modules/` were already ignored before this ticket's proof run; `npm test` refreshed expected generated `dist/`.

## Deviations

- The projection applies across all character_generation packet layers, not only `governing_world_context`, because seed CFs normally appear in `local_authority` or nearby packet layers.
- The live node type is `canon_fact_record`, not the drafted `canon_fact`; ticket, tests, and skill prose were corrected to that contract.
- The test landed in the existing `tools/world-mcp/tests/context-packet/character-generation-completeness.test.ts` rather than a new `governing-world-context.test.ts`, because that file already owns character_generation packet completeness.
- `docs/CONTEXT-PACKET-CONTRACT.md`, `.claude/skills/character-generation/SKILL.md`, and `.claude/skills/character-generation/references/phases-1-6-character-construction.md` were added to the touched set as same-seam contract/prose truthing.
- No live character-generation dry-run was executed; the owned invariant is the package packet projection plus consumer prose, so the final proof is package-local build/test plus grep/manual review.
