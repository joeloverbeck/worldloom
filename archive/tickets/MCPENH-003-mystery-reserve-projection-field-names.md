# MCPENH-003: Fix mystery_reserve_entry projection field-name mismatch in character_generation governing-record packet

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/context-packet/governing-world-context.ts` (`projectCharacterGenerationGoverningRecord` field names + extension/knowns inclusion); `tools/world-mcp/tests/context-packet/character-generation-completeness.test.ts` (assertion coverage); `docs/CONTEXT-PACKET-CONTRACT.md` and `.claude/skills/character-generation/references/world-state-prerequisites.md`, `references/phase-7-canon-safety-check.md`, `references/phases-1-6-character-construction.md`, and `SKILL.md` (truth packet field-shape prose now that the packet delivers the firewall fields)
**Deps**: none

## Problem

At intake, during the 2026-04-28 CHAR-0004 (Rill) character-generation run, `mcp__worldloom__get_context_packet(task_type='character_generation', world_slug='animalia', seed_nodes=[...11 seeds], token_budget=33000)` returned a packet whose `mystery_reserve_entry` parsed bodies under `governing_world_context.nodes[*].record` carried only three useful fields: `id`, `status`, and `disallowed_cheap_answers`. The fields the skill's `world-state-prerequisites.md` claimed were always loaded — `unknowns`, `common_interpretations`, `knowns` — were absent from the parsed payload (only the first 282 chars of raw YAML survived in `body_preview`). Cross-application firewall extensions (`extensions[]`, where CH-0009-and-later cross-CF firewall clauses live, including the CF-0037 stationkeeper / CF-0044 verse-keeper / CF-0047 well-keeper sub-specialty firewall holding clauses) were absent entirely.

The Rill dossier needed M-7, M-11, and M-14's `extensions[]` content to perform Phase 7b firewall checks correctly (CF-0037 stationkeeper-bandit-captain sub-register firewall in M-14; CF-0037 cross-application firewall in M-11; CF-0037 stationkeeper sub-specialty holding clause in M-7). The skill's only working path was three per-id `mcp__worldloom__get_record('M-N')` calls. That fallback worked but was forced by a mechanical bug rather than a deliberate retrieval-shape choice — the projection function literally referenced field names that do not exist on the indexed records.

Observed before this ticket by reading `tools/world-mcp/src/context-packet/governing-world-context.ts`: the projection returned `{ id, status, what_is_unknown: parsed.what_is_unknown, disallowed_cheap_answers, common_in_world_interpretations: parsed.common_in_world_interpretations }`. The on-disk records (e.g., `worlds/animalia/_source/mystery-reserve/M-1.yaml`) carry fields named `unknowns` and `common_interpretations` — the projection's `what_is_unknown` and `common_in_world_interpretations` resolved to `undefined` and JSON-serialized as missing keys.

## Assumption Reassessment (2026-04-29)

1. The projection lives at `tools/world-mcp/src/context-packet/governing-world-context.ts` (`projectCharacterGenerationGoverningRecord`). Verified by direct read of the file in this session. Before this ticket, the function projected four named M-record fields plus `id` and `status`; two of the four used field names that do not exist on the indexed record YAML.
2. The on-disk M-record schema is documented at `tools/validators/src/schemas/mystery-reserve.schema.json`. The actual records use `unknowns`, `common_interpretations`, `knowns` (verified by reading `worlds/animalia/_source/mystery-reserve/M-1.yaml`). No record uses `what_is_unknown` or `common_in_world_interpretations` as a key.
3. Cross-tool boundary under audit: the contract between `get_context_packet` (provider) and `task_type='character_generation'` consumers (`character-generation` skill's Phase 7b firewall check, plus the documented `world-state-prerequisites.md` retrieval-shape claim). The shared schema is the projected `record` body returned in `governing_world_context.nodes[*].record` for `mystery_reserve_entry` nodes. Pre-fix, the field-name mismatch silently strips three fields from every M-record in every character_generation packet.
4. FOUNDATIONS principle motivating this ticket: §Rule 7 (Preserve Mystery Deliberately). The Mystery Reserve firewall is Rule 7's enforcement surface. The character-generation skill's Phase 7b is the canonical instantiation of that firewall for character work. Delivering M-record bodies missing `unknowns` (the field that defines what the Mystery is) and `common_interpretations` (the permitted folk-belief layer) and `extensions[]` (cross-CF firewall clauses) silently weakens the operator's ability to perform Rule 7 checks against the data the packet was supposed to supply. The skill prose's claim that the packet delivers full firewall content was the ground truth; the projection bug forced every operator to either notice the absence (and fall back to per-id retrieval, which I did via subagent investigation) or accept the thin bodies as authoritative (and miss firewall content). The latter is a Rule 7 weakening this ticket fixes.
5. Not applicable — this ticket does not touch HARD-GATE semantics, canon-write ordering, or Canon Safety Check write surfaces. It restores the read-side packet content the skill's prose already documented.
6. The fix is additive on the projection side (adds `knowns`, `extensions`, `title`, `domains_touched`) and a rename on two field references (`what_is_unknown` → `unknowns`; `common_in_world_interpretations` → `common_interpretations`). No external schema changes; no consumer-skill schema migration. Skills that already consume `parsed.what_is_unknown` or `parsed.common_in_world_interpretations` from the packet are consuming `undefined` today — they have no working path to break.
7. Pipeline-wide grep for `what_is_unknown` and `common_in_world_interpretations` (the prose tokens this ticket fixes inside the projection): the only producer is `tools/world-mcp/src/context-packet/governing-world-context.ts:288,290`. The skill-side prose at `.claude/skills/character-generation/references/phase-7-canon-safety-check.md:22` and `references/world-state-prerequisites.md:17,61` reads as `unknowns` / `common_interpretations` / `knowns` (the actual record fields), so the skill prose is already correct against the schema; the recent updates to those skill files added qualifications about the gap that should be reverted once this ticket lands. No sibling tool consumes `what_is_unknown` or `common_in_world_interpretations` keys; safe to fix.
8. Adjacent contradictions exposed by reassessment: the recent character-generation skill updates (this session, MCPENH-002 follow-up audit implementation) added prose to `world-state-prerequisites.md` lines 17 and 61, and to `phase-7-canon-safety-check.md` line 22, that documents the gap as a permanent retrieval-shape feature ("M-record id / status / disallowed_cheap_answers in parsed payload; full firewall fields require `get_firewall_content` or per-id `get_record`"). Once this ticket lands, those skill files should revert to claiming the originally-documented full-firewall delivery via the packet, with `get_firewall_content` framed as a parallel bulk-projection alternative and per-id `get_record` framed as a more-context lookup (notes / modification_history) rather than a workaround. That revert is a required consequence of this ticket and is captured in §Files to Touch.
9. Same-seam doc drift found during implementation: `docs/CONTEXT-PACKET-CONTRACT.md` §Example Roles still documented the stale `what_is_unknown` / `common_in_world_interpretations` packet fields. Because that doc is the authoritative packet contract cited by the character-generation skill, this ticket absorbed that one-line doc truthing. `MCPENH-004` remains separate and still owns full parsed CF / seed-relevant SEC body delivery.

## Architecture Check

1. The fix is the smallest correct change: rename two field references and additively expand the projection to include `knowns`, `extensions`, `title`, and `domains_touched` — fields the skill's Phase 7b firewall and the tonal/genre register checks already use. Alternative (leave the bug, document the gap as permanent) was the prior approach during the recent skill audit; that approach forces every character-generation run on a CF-0035-and-later world to make per-id `get_record` calls for every M record relevant to a seed CF, defeating the packet's purpose. Fixing the projection restores the architecture's intended retrieval shape.
2. No backwards-compatibility shims. The renamed field references replace broken references; the additive fields are pure expansion. No skills produce or consume the `what_is_unknown` / `common_in_world_interpretations` aliases — they were never reachable on real records.

## Verification Layers

1. The projection literally returns the actual record schema's field names after the fix → codebase grep-proof: `rg -n "what_is_unknown|common_in_world_interpretations" tools/world-mcp/src/` returns no hits; `rg -n "unknowns|common_interpretations|knowns|extensions" tools/world-mcp/src/context-packet/governing-world-context.ts` returns hits inside `projectCharacterGenerationGoverningRecord`.
2. A character_generation packet built against a test fixture world contains M-record `record` bodies with `unknowns`, `common_interpretations`, `knowns`, `extensions[]`, `title`, and `domains_touched` populated (where the source record carries those values) → `tools/world-mcp/tests/context-packet/character-generation-completeness.test.ts` asserts these fields appear in `governing_world_context.nodes[*].record` for `mystery_reserve_entry` nodes.
3. Skill and packet-contract prose at `.claude/skills/character-generation/references/world-state-prerequisites.md`, `references/phase-7-canon-safety-check.md`, `references/phases-1-6-character-construction.md`, `.claude/skills/character-generation/SKILL.md`, and `docs/CONTEXT-PACKET-CONTRACT.md` describes the fixed packet shape → manual review + grep-proof that the workaround language is removed.
4. The character-generation Phase 7b firewall check no longer treats per-id `get_record('M-N')` as required for packet-delivered firewall extensions → package-local fixture proof confirms the M-record body in the packet carries a non-empty `extensions[]` entry.
5. FOUNDATIONS alignment — Rule 7's enforcement surface in character_generation is the packet's M-record body; this ticket restores the body to deliver the firewall fields the rule depends on → FOUNDATIONS alignment check.

## What to Change

### 1. Fix field-name references and expand the M-record projection

In `tools/world-mcp/src/context-packet/governing-world-context.ts:272-295`, replace the `mystery_reserve_entry` branch of `projectCharacterGenerationGoverningRecord` with:

```ts
if (row.node_type === "mystery_reserve_entry") {
  return {
    id: parsed.id,
    title: parsed.title,
    status: parsed.status,
    knowns: parsed.knowns,
    unknowns: parsed.unknowns,
    common_interpretations: parsed.common_interpretations,
    disallowed_cheap_answers: parsed.disallowed_cheap_answers,
    domains_touched: parsed.domains_touched,
    extensions: parsed.extensions
  };
}
```

The renamed two fields fix the bug; the four added fields (`title`, `knowns`, `domains_touched`, `extensions`) deliver content the skill's Phase 7b firewall and tonal/scope checks need. Fields not added (`future_resolution_safety`, `notes`, `modification_history`) remain available via per-id `get_record('M-N')` for power-user paths.

### 2. Update test coverage

Extend the existing character_generation governing-context completeness test in `tools/world-mcp/tests/context-packet/character-generation-completeness.test.ts` so it:

- Builds a character_generation packet against a fixture world containing at least one M record with non-empty `extensions[]`, `knowns`, `unknowns`, and `common_interpretations`.
- Asserts the returned `governing_world_context.nodes[*]` for that M record contains `record.unknowns`, `record.common_interpretations`, `record.knowns`, `record.extensions`, `record.title`, `record.domains_touched`, `record.disallowed_cheap_answers` populated.
- Asserts the projection does NOT carry the bug's old key names (`what_is_unknown`, `common_in_world_interpretations`).

### 3. Revert the character-generation skill's gap-documentation prose

Character-generation skill files were updated during the recent audit-implementation pass to document the projection bug as a permanent retrieval-shape feature. Revert those updates so the skill prose accurately reflects the post-fix packet contract:

- `.claude/skills/character-generation/references/world-state-prerequisites.md:17` — revert from `the parsed record body carries id / status / disallowed_cheap_answers; the full firewall fields — unknowns / common_interpretations / knowns — are NOT in the parsed payload and require either get_firewall_content as a bulk projection or get_record('M-NNNN') per id when extensions / modification_history are load-bearing` to a positive claim that the parsed body delivers the full Phase 7b firewall fields (id, title, status, knowns, unknowns, common_interpretations, disallowed_cheap_answers, domains_touched, extensions); per-id `get_record` remains the path for `notes` and `modification_history`.
- `.claude/skills/character-generation/references/world-state-prerequisites.md:61` (Phase 7b row in the Phase-to-record mapping table) — same revert.
- `.claude/skills/character-generation/references/phase-7-canon-safety-check.md:22` — revert the parallel claim and update the skill's data-field vocabulary from `what_is_unknown` / `common_in_world_interpretations` to `unknowns` / `common_interpretations`.
- `.claude/skills/character-generation/references/phases-1-6-character-construction.md:44` — update the character-construction reference to the same `unknowns` field vocabulary.
- `.claude/skills/character-generation/SKILL.md:92` (§World-State Prerequisites summary) — revert the parallel claim.
- `docs/CONTEXT-PACKET-CONTRACT.md` §Example Roles — update the character-generation packet role to list the actual projected M-record fields.

The Phase 7b reference's existing "Bulk firewall retrieval" paragraph (`prefer mcp__worldloom__get_firewall_content(world_slug) for the audit's projection step`) remains valid and should NOT be reverted — `get_firewall_content` is a legitimate cross-skill bulk-firewall projection alternative that returns every M record in a single call (useful when the seeds do not pull in every M record). Per-id `get_record` is framed in this ticket as the path to fields beyond Phase 7b firewall (`notes`, `modification_history`).

## Files to Touch

- `tools/world-mcp/src/context-packet/governing-world-context.ts` (modify — fix field references + expand projection)
- `tools/world-mcp/tests/context-packet/character-generation-completeness.test.ts` (modify — assertion coverage on the existing governing-context completeness seam)
- `.claude/skills/character-generation/references/world-state-prerequisites.md` (modify — revert lines 17, 61 to positive full-firewall-delivery claim)
- `.claude/skills/character-generation/references/phase-7-canon-safety-check.md` (modify — revert line 22 parallel claim)
- `.claude/skills/character-generation/references/phases-1-6-character-construction.md` (modify — align M-record field vocabulary)
- `.claude/skills/character-generation/SKILL.md` (modify — revert §World-State Prerequisites summary at line 92)
- `docs/CONTEXT-PACKET-CONTRACT.md` (modify — align character-generation packet contract prose)

## Out of Scope

- Adding a `notes` or `modification_history` field to the M-record projection. Those fields are large and carry per-record provenance; per-id `get_record` is the correct retrieval path for them.
- Changing the packet's CF or SEC body delivery (currently `body_preview` only for non-invariant non-mystery node types). That gap is real but architecturally distinct; see MCPENH-004.
- Fixing the engine-side stale-index detection that surfaced as a separate friction point during the same Rill run; see ENGINESYNC-001.
- Propagating the Phase 9 commit-guidance prose to sibling engine-submitting skills (canon-addition, create-base-world, diegetic-artifact-generation); see COMMITGUIDE-001.

## Acceptance Criteria

### Tests That Must Pass

1. The extended test in `tools/world-mcp/tests/context-packet/character-generation-completeness.test.ts` confirms the character_generation packet's M-record `record` bodies contain the nine Phase 7b firewall fields (`id`, `title`, `status`, `knowns`, `unknowns`, `common_interpretations`, `disallowed_cheap_answers`, `domains_touched`, `extensions`) populated against a fixture world with non-empty values for each.
2. `rg -n "what_is_unknown|common_in_world_interpretations" tools/world-mcp/src/` returns zero hits.
3. `cd tools/world-mcp && npm test` passes the full suite.
4. The four character-generation skill-prose reverts land and `rg -n "are NOT in the parsed payload" .claude/skills/character-generation/` returns zero hits.

### Invariants

1. The `mystery_reserve_entry` projection returns the actual record schema's field names — never aliases that are silently undefined on real records.
2. Phase 7b firewall content (the full `disallowed_cheap_answers`, `unknowns`, `common_interpretations`, `knowns`, `extensions[]` set) is reachable from the character_generation packet's `governing_world_context.nodes[*].record` payload without per-id fallback for any seed-relevant M record.
3. The skill prose accurately describes what the packet actually delivers — no documentation of permanent gaps that have since been closed.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/context-packet/character-generation-completeness.test.ts` — assert M-record projection field set against fixture; assert old keys absent; assert at least one M record's `extensions[]` is non-empty in the projection when the fixture record carries extensions.
2. None for skill-prose reverts (documentation-only); verification is the grep below.

### Commands

1. `cd tools/world-mcp && npm test` — package-local build + test proof.
2. `! rg -n "what_is_unknown|common_in_world_interpretations" tools/world-mcp/src/` — must return zero hits.
3. `! rg -n "are NOT in the parsed payload" .claude/skills/character-generation/` — must return zero hits after the skill-prose reverts land.
4. `rg -n "extensions" tools/world-mcp/src/context-packet/governing-world-context.ts` — confirms the `extensions` field is in the projection.

## Outcome

Completion date: 2026-04-29.

Completed. `projectCharacterGenerationGoverningRecord` now projects Mystery Reserve records using the live data-layer field names (`unknowns`, `common_interpretations`) and includes `title`, `knowns`, `domains_touched`, and `extensions`. The existing character-generation completeness test now seeds schema-shaped M records, asserts the expanded packet projection, and asserts the stale packet keys are absent. Character-generation skill prose and `docs/CONTEXT-PACKET-CONTRACT.md` now describe the post-fix packet contract.

## Verification Result

1. `cd tools/world-mcp && npm test` — passed after rebuilding `dist/`; 205 tests passed.
2. `if rg -n 'what_is_unknown|common_in_world_interpretations' tools/world-mcp/src/; then exit 1; fi` — passed; no stale source references remain.
3. `if rg -n 'are NOT in the parsed payload' .claude/skills/character-generation/; then exit 1; fi` — passed; the workaround wording is gone.
4. `rg -n 'unknowns|common_interpretations|knowns|extensions' tools/world-mcp/src/context-packet/governing-world-context.ts` — confirmed the fixed projection includes the required fields.

Ignored artifact state: `tools/world-mcp/.secret`, `tools/world-mcp/dist/`, and `tools/world-mcp/node_modules/` were already ignored before this ticket's proof run; `npm test` refreshed the expected generated `dist/` artifact.

## Deviations

- The test landed in the existing `tools/world-mcp/tests/context-packet/character-generation-completeness.test.ts` rather than a new `governing-world-context.test.ts`, because that file already owns the character_generation governing-record completeness seam.
- `docs/CONTEXT-PACKET-CONTRACT.md` and `.claude/skills/character-generation/references/phases-1-6-character-construction.md` were added to the touched set as same-seam contract/vocabulary truthing. `MCPENH-004` remains unabsorbed and still owns CF/SEC body delivery.
- No live character-generation dry-run was executed; the ticket-owned invariant is the package packet projection and its consumer prose, so the final proof is package-local build/test plus grep/manual review.
