<!-- spec-drafting-rules.md not present; using default structure. -->
# SPEC-71 — Strip STCHAR / Page-Packet Content-Tamper Hashes + Reintroduction Guard

**Status:** DRAFT
**Date:** 2026-05-22
**Classification:** story-canon-related (governs the STCHAR frontmatter schema, the prose-receipt schema, the §16a page-plan packet contract, the STCHAR/packet/receipt structural validators, the patch-engine STCHAR ops, the `compute-stchar-hashes` CLI, the MCP STCHAR retrieval surface, and five story-pipeline skills)
**Source:** in-chat hash-integrity audit + determination, 2026-05-22 (frustration-triggered brainstorm; surface map verified across schemas, validators, hooks, CLIs, and the live `erotica-world/red-bunny` bundle), then reassessed 2026-05-22 (the reassessment completed the §1.3 removal map — adding the patch-engine stamping ops, the validators stamping helper, the STCHAR-body hash note, and the MCP projection/op-schema surfaces that the original map missed — and corrected the §2.3 migration mechanism).
**Depends on:** none for logic. Shares edit surfaces with **SPEC-72** (`branching-story-prose-attach/SKILL.md`, `prose-receipt.schema.json`, `story-record-schemas.md §4.6`) — implement SPEC-71 first to avoid edit conflicts. **Compatible with SPEC-70, with one amendment**: SPEC-70's semantic-coverage layer (`source_operational_fact_map`, `stchar_source_fact_coverage`, operational-home subsections, the 13-section body model) is **retained** — but SPEC-70's `stchar_source_fact_coverage` validator currently uses `source_char_hash` as a staleness gate (`source_char_hash_mismatch`), and since this spec removes `source_char_hash`, that sub-check is dropped (coverage then keys off `source_char_id` resolution alone). The semantic-preservation machinery otherwise stands.

## 1. Context

### 1.1 The audit finding

A full audit of the story-bundle "hash integrity" system found **10 hash fields serving three distinct jobs**:

- **Job A — fork/replay integrity:** `PG.state_hash`, `state_hash_parent`, `plan_hash`. Load-bearing; the branching engine's fork primitive (FOUNDATIONS §Story Bundles §4a). **Out of scope here** (the `plan_hash` friction is SPEC-72; the `state_hash` chain is untouched).
- **Job B — content tamper-detection:** `STCHAR.profile_hash`, `STCHAR.voice_block_hash`, `page_packet_hash`, `STCHAR.source_char_hash`. **This spec's target.**
- **Job C — index freshness:** `file_versions.content_hash`. Fixed by ENGINESYNC-005 (commit `1aee39cf`; `story-characters` registered `hybrid: true`, raw `sha256Hex` basis matching the patch-engine guard). Out of scope.

### 1.2 Why Job B is not worth its cost

The four Job-B hashes detect whether STCHAR body, §16a packet, or source-CHAR content changed after commit. That model assumes content is immutable-after-commit and treats any edit as corruption — sensible with adversaries or multiple writers. Worldloom is a **single-author creative tool**: every "tamper" detected is the author improving their own character profile. The payoff is near-zero; the cost is high and concrete:

- Hand-editing an `STCHAR-*.md` body stales `profile_hash`/`voice_block_hash` and **FAILs** `stchar_body_integrity` (blocks the next patch).
- Each hash is **copied across 3–4 surfaces** (STCHAR frontmatter → §16a packet → prose receipt → INDEX table). A regeneration that restamps one copy but not the others produces the recurring "hash A ≠ hash B" failure — verified live: `red-bunny` PG-2's prose-attach FAILed and its INDEX authority table still shows stale `a006f0bf…` rows inconsistent with the current STCHAR frontmatter.

This is the FOUNDATIONS §Story Bundles §5b (Schema-Minimalism) test failing: a field that costs tokens to author and read at every record, and is not load-bearing for a validation gate that the single-author workflow actually needs.

### 1.3 Removal/keep map (verified against `main`; completed at reassessment)

The four hashes are not only *read* by validators — they are *stamped* by the patch-engine STCHAR write ops and the validators' frontmatter-normalization helper, *projected* by the MCP retrieval surface, and *carried* in an STCHAR-body note. The original map listed only the reader/recompute sites; the reassessment added the writer/projection sites below. The schema's existing `additionalProperties: false` makes the writer sites correctness-load-bearing: leaving a stamping op in place after the fields leave the schema's `properties` would write a now-forbidden field and break STCHAR creation.

| Surface | File | Action |
|---|---|---|
| STCHAR schema | `tools/validators/src/schemas/story-character-authority.schema.json` | remove `profile_hash`, `voice_block_hash`, `source_char_hash` from `properties` + `required`; **amend** the `source_kind`-conditional `allOf` to drop the `source_char_hash` clauses while **retaining** the `source_char_id` conditional (world_char → required; story_local → null); keep `source_kind`, `source_char_id`, `source_char_sections_used`, `source_operational_fact_map`. (The existing `additionalProperties: false` then rejects any reintroduced hash field for free — see §2.2.) |
| Prose-receipt schema | `tools/validators/src/schemas/prose-receipt.schema.json` | remove the `profile_hash`/`voice_block_hash`/`page_packet_hash` sub-objects from `stchar_authority[]`; keep `stchar_id`/`stent_id`/`display_name`/`required_because`/`packet_present`/`active_in_snapshot`/`deterministic_verdict` |
| §16a packet contract | `.claude/skills/_shared-templates/story-record-schemas.md` (§4.5.19, §4.6), `story-state-contract.md` (§8/§16a — both the full packet template `:467` and the `offstage_causal` reduced packet `:486`) | remove the `Hashes:` line + the three hash declarations from both §16a packet templates; delete the "Tooling (STCHAR and page-packet hash computation)" block |
| STCHAR body note | STCHAR markdown body (`story-characters/STCHAR-*.md`) | remove the body `- Hashes: profile_hash … voice_block_hash …` descriptive note; the dedicated `remove_story_character_authority_body_hash_note_field` patch op exists for this (see §2.3) |
| Patch-engine STCHAR ops | `tools/patch-engine/src/ops/create-story-record.ts` | on `append_story_character_authority_record` / `supersede_story_character_authority_record`, **stop stamping** `profile_hash`/`voice_block_hash` into frontmatter (lines ~271-272). **Correctness-critical**: with the schema's `additionalProperties: false`, continuing to stamp after the schema drops the fields breaks every STCHAR create/supersede. Update `tools/patch-engine/src/envelope/schema.ts` op-payload shape accordingly |
| Validators frontmatter stamping | `tools/validators/src/_helpers/index-access.ts` | remove the `profile_hash`/`voice_block_hash` compute+stamp (lines ~378-379, ~454-455) used by the pre-apply normalization path |
| Validator (structural) | `tools/validators/src/structural/stchar-body-integrity.ts` | **keep the validator**; remove only the `profile_hash`/`voice_block_hash` recompute; retain the 13-section + SPEC-70 subsection presence/non-empty checks |
| Validator (structural) | `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts` | remove the `page_packet_hash`/profile/voice recompute+compare; retain active-STCHAR membership, `required_because`, voice-block-presence-for-speaker, and `CHAR-*`-leak checks |
| Validator (structural) | `tools/validators/src/structural/prose-receipt-stchar-integrity.ts` | remove hash comparisons; retain `required_because` verbatim match + `packet_present`/`active_in_snapshot` consistency |
| Validator (structural) | `tools/validators/src/structural/prose-receipt-schema-compliance.ts` | re-align to the amended receipt schema (no hash fields) |
| Validator (structural) | `tools/validators/src/structural/stchar-source-fact-coverage.ts` (SPEC-70 — **keep validator**) | drop the `source_char_hash` staleness gate (the `source_char_hash_mismatch` sub-check, lines ~85-88); coverage then keys off `source_char_id` resolution alone (per Q1 = (a)) |
| Validator (structural) | `tools/validators/src/structural/stchar-source-hash-matches-source.ts` | **delete** (purely `source_char_hash`) |
| Validator registry | `tools/validators/src/public/registry.ts` | deregister `stcharSourceHashMatchesSource`; register the new guard (§2.2) |
| MCP retrieval surface | `tools/world-mcp/src/context-packet/shared.ts` (type, lines ~209-210), `tools/world-mcp/src/context-packet/story-bundle-context.ts` (projection, lines ~478-479) | drop the `profile_hash`/`voice_block_hash` projection from the STCHAR context-packet shape |
| MCP op-schema description | `tools/world-mcp/src/tools/describe-envelope-schema.ts` (line ~514) | drop the `page_packet_hash` reference from the op-payload schema description |
| CLI | `tools/world-mcp/src/cli/compute-stchar-hashes.ts` (+ dist) | **delete**; remove `computeStcharProfileHash`/`computeStcharVoiceBlockHash`/`computeStcharPagePacketHash` from `@worldloom/world-index/hash/content` (defined at `content.ts:146/150/169`) + `tools/world-mcp/src/package-interop.ts`; keep `normalizeProseWhitespace`/`contentHashForProse`/`sha256Hex` (still used by `file_versions` + node identity) |
| Skill | `branching-story-bootstrap/SKILL.md` | STCHAR phase: remove profile/voice/packet hash compute+stamp; §16a authoring: remove the `Hashes:` line |
| Skill | `story-character-profile/SKILL.md` | remove hash compute/stamp in create + regenerate; STCHAR frontmatter no longer carries the hashes |
| Skill | `branching-story-turn-cycle/SKILL.md` | Phase 7 §16a authoring: remove the `Hashes:` line (Phase 9 `plan_hash`/`state_hash` stamping is Job A — untouched) |
| Skill | `branching-story-prose-attach/SKILL.md` | Phase 3 `stchar_authority`: remove the profile/voice/packet expected-vs-observed verdicts; keep `packet_present`/`active`/`required_because`; remove the `compute-stchar-hashes` invocation |
| Skill | `branching-story-health-audit/SKILL.md` | remove the `source_drift` mode entirely (the only `source_char_hash` consumer — the `mode` enum value at the description + args + Phase 2n + the `stchar_source_drift` finding) and the `page_plan_stchar_hash_mismatch` finding from Phase 2m (keep the rest of Phase 2m STCHAR authority health). Source-CHAR drift detection is intentionally dropped per Q1 = (a) |
| INDEX rendering | bundle `INDEX.md` template / renderer | remove the `profile_hash`/`voice_block_hash`/`page_packet_hash` columns from the Story Character Authority table |

## 2. Changes

### 2.1 Remove the four Job-B hash fields

Strip `profile_hash`, `voice_block_hash`, `page_packet_hash`, and `source_char_hash` from every surface in the §1.3 table — **including the writer sites** (the patch-engine `append`/`supersede` STCHAR ops and the validators' `_helpers/index-access.ts` stamping path), not only the reader/validator sites. STCHAR provenance is preserved through the non-hash `source_char_id` + `source_char_sections_used` + `source_operational_fact_map` fields (a story still records *which* CHAR and *which* sections it distilled — it just no longer cryptographically pins their bytes).

The prose-receipt `stchar_authority[].deterministic_verdict` is retained but is now driven by `packet_present && active_in_snapshot` (a `CHAR`-leak / packet-presence structural check), not by hash equality.

### 2.2 NEW guard validator: `forbidden_stchar_tamper_hash_fields`

A structural validator that **FAILs** if any of `profile_hash`, `voice_block_hash`, `page_packet_hash`, `source_char_hash` reappears in:

- STCHAR frontmatter (`story-characters/STCHAR-*.md`)
- prose-receipt YAML (`pages-prose-receipts/PG-*.yaml`)
- page-plan §16a packets (`pages-prose-plans/PG-*.md`)

Register it in `registry.ts`. This is the explicit "do not let them come back in a future improvement" guard. **Schema-layer defense-in-depth is free**: `story-character-authority.schema.json` and the prose-receipt `stchar_authority[]` item already carry `additionalProperties: false` (schema line 98), so once the fields leave `properties` a reintroduced field is rejected at schema-validation time with no new schema work — the guard validator covers the §16a-packet and receipt-YAML surfaces the schemas don't validate.

A lightweight meta-test (repo-grep assertion) confirms the four field names do not reappear in the two schema files or the §16a contract text, so a future schema edit that re-adds them trips CI.

### 2.3 Migration of the existing `red-bunny` bundle

`erotica-world/red-bunny` is the only existing bundle and currently carries the fields in 3 STCHAR frontmatter blocks, 3 STCHAR body `Hashes:` notes, 2 page-plan §16a `Hashes:` lines, and 2 prose receipts. Implementation includes a one-time strip:

- STCHAR records are engine-routed by skill prescription (they live under `story-characters/`, not `_source/`, and are **not** Hook-3-blocked, but discipline keeps them engine-routed). Strip the now-de-schema'd frontmatter fields with the purpose-built `remove_story_character_authority_frontmatter_field` op, and the STCHAR-body `Hashes:` note with `remove_story_character_authority_body_hash_note_field` (both already exist — `tools/patch-engine/src/ops/create-story-record.ts:199,236`, `tools/patch-engine/src/commit/order.ts:43-44`). Regeneration via `story-character-profile` is the alternative when a full re-author is wanted. **Do not** use `update_record_field` — it updates a value, it does not remove a field.
- Page plans, receipts, and INDEX are direct-write surfaces — strip directly.

After migration the new guard (§2.2) must pass clean on the bundle.

## 3. Out of scope

- Job A `state_hash` / `state_hash_parent` chain and `snapshot_replay_equality` — untouched.
- `plan_hash` friction (Hook 6, prose-attach `hash_integrity`) — **SPEC-72**.
- Job C `file_versions.content_hash` — already fixed (ENGINESYNC-005).
- SPEC-70 semantic-coverage layer — retained (its `source_char_hash` staleness sub-check is dropped per §1.3 / Q1 = (a); the rest stands).
- Source-CHAR drift detection (the `source_drift` health-audit mode + `source_char_hash`) — intentionally removed per Q1 = (a); low value in a single-author tool.

## 4. FOUNDATIONS Alignment

| Principle | Stance | Rationale |
|---|---|---|
| §Story Bundles §5b (Schema-Minimalism) | aligns | Removes four non-load-bearing fields that cost authoring/read tokens at every STCHAR, packet, and receipt and are not consumed by a gate the single-author workflow needs. |
| §Story Bundles §6.1 (Story-Local Character Authority) | tensions | STCHAR authority drift is no longer hash-detected, and source-CHAR drift detection is removed. Mitigated: structural packet checks (active membership, `required_because`, `CHAR`-leak) and SPEC-70's `stchar_source_fact_coverage` (minus its `source_char_hash` staleness gate) remain; in a single-author tool the author *is* the authority. |
| Rule 6 (No Silent Retcons) | aligns | The removal — including the amendment to SPEC-70's `stchar_source_fact_coverage` staleness gate — is logged through this spec + IMPLEMENTATION-ORDER; the guard validator makes any silent reintroduction a hard failure. |
| §Story Bundles §4a (Plan-Authority Boundary) | N/A | This spec does not touch page/plan state authority (that is SPEC-72); listed defensively because §16a packets live in the page plan. |

## 5. Acceptance criteria

1. The four fields are absent from both schemas, the §16a contract (both packet templates), the STCHAR body note, all five skills, the INDEX renderer, **the patch-engine `append`/`supersede` STCHAR ops + their envelope-schema payload, the validators `_helpers/index-access.ts` stamping path, and the MCP context-packet projection + op-schema description**; `compute-stchar-hashes` and its three helper exports are deleted.
2. STCHAR create/supersede via the patch engine succeeds with the amended schema (no stamping site writes a field the schema's `additionalProperties: false` would reject).
3. `stchar_body_integrity` still enforces the 13 sections + SPEC-70 subsections (presence/non-empty); `page_plan_stchar_packet_integrity` still enforces membership/`required_because`/voice-block/`CHAR`-leak; `stchar_source_fact_coverage` still enforces source-fact-map coverage off `source_char_id` (no `source_char_hash` staleness gate).
4. `forbidden_stchar_tamper_hash_fields` FAILs on any reintroduced field across STCHAR/receipt/§16a; the existing schema `additionalProperties: false` rejects them too; the meta-test trips on schema/contract reintroduction.
5. After migration, `world-validate erotica-world --structural` is clean (no hash-field findings).
6. `state_hash` / `snapshot_replay_equality` behavior is byte-identical to pre-spec; `tools/` build + test suites green.

## 6. Test plan

- Unit: amended `stchar_body_integrity`, `page_plan_stchar_packet_integrity`, `prose_receipt_stchar_integrity`, `prose_receipt_schema_compliance`, `stchar_source_fact_coverage` (hash assertions removed, structural/coverage assertions retained).
- Patch-engine: `append`/`supersede` STCHAR ops produce frontmatter that passes the amended schema (regression against the `additionalProperties: false` rejection); the `remove_story_character_authority_frontmatter_field` / `…_body_hash_note_field` ops strip the migrated fields cleanly.
- New: `forbidden_stchar_tamper_hash_fields` — fixtures with each forbidden field in each of the three artifact surfaces (FAIL) and a clean fixture (PASS).
- Schema: `additionalProperties: false` rejection fixtures for STCHAR frontmatter and prose-receipt `stchar_authority[]`.
- Regression: a hand-edited STCHAR body no longer produces a validator FAIL.
- Migration smoke: `red-bunny` validates clean post-strip.
