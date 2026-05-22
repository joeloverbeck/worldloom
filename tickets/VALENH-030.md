# VALENH-030: Define and validate non-self-referential STCHAR page-packet hashes

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-index` hash helpers, `tools/world-mcp` `compute-stchar-hashes` CLI/help, `tools/validators` page-plan STCHAR packet validator/tests, and STCHAR authoring contract prose if the canonical slice wording changes.
**Deps**: `archive/tickets/VALENH-029.md` (body-owned `profile_hash` / `voice_block_hash` recompute landed; `page_packet_hash` recompute explicitly descoped pending this projection contract).

## Problem

VALENH-029 closed the body-owned STCHAR hash gap by recomputing `profile_hash` and `voice_block_hash` in `stchar_body_integrity`, but it deliberately left `page_packet_hash` as consistency-only. The reason is structural: live §16a page-plan packets include a `Hashes:` line containing `page_packet_hash` itself, while `computeStcharPagePacketHash(packetText)` currently hashes the packet text it is handed. A validator that hashes the whole parsed packet would therefore hash the stored hash value as part of its own input, producing a self-referential and untrustworthy check.

The remaining integrity gap is real: `page_plan_stchar_packet_integrity` and `prose_receipt_stchar_integrity` confirm the page plan and receipt copy the STCHAR frontmatter value faithfully, but no validator proves that the stored `page_packet_hash` describes the intended §16a packet projection bytes. The canonical projection slice must be specified before the validator can enforce it.

## Assumption Reassessment (2026-05-22)

1. **Codebase**: `tools/world-index/src/hash/content.ts` exports `computeStcharPagePacketHash(packetText)` as `sha256Hex(normalizeProseWhitespace(packetText))`, with no helper that removes, masks, or canonicalizes the `Hashes:` line. `tools/world-mcp/src/cli/compute-stchar-hashes.ts` passes the entire `--packet` file contents to that helper. `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts` parses packet text only far enough to extract declared `profile_hash`, `voice_block_hash`, and `page_packet_hash`, then compares those declarations with stored STCHAR frontmatter.
2. **Docs/skills**: `.claude/skills/_shared-templates/story-record-schemas.md` §4.5.19 and `.claude/skills/story-character-profile/SKILL.md` Phase 5 require the canonical CLI for all three STCHAR hashes, but they do not define whether the `--packet` input includes the `Hashes:` line, excludes it, or includes it with `page_packet_hash` blanked/placeholdered. `.claude/skills/_shared-templates/story-state-contract.md` §16a shows packet examples that include the `Hashes:` line.
3. **Shared boundary under audit**: the `page_packet_hash` contract shared by STCHAR authoring, `compute-stchar-hashes`, `@worldloom/world-index/hash/content`, page-plan §16a packet structure, `page_plan_stchar_packet_integrity`, and prose receipt STCHAR authority checks.
4. **FOUNDATIONS principle**: §Story Bundles §6.1 Story-Local Character Authority makes the STCHAR and its §16a packet the runtime character authority. A hash field that is only copied, never recomputed from a pinned projection, is not a trustworthy integrity signal.
5. **Canon Safety surface**: this ticket changes structural validator behavior that can run in validation contexts. It should strengthen fail-closed checking only, preserve existing HARD-GATE / approval-token semantics, and avoid any world-content mutation.
6. **Adjacent contradiction from VALENH-029**: `page_packet_hash` was originally grouped with body recompute, but the live packet includes its own hash value. This follow-up owns defining the non-self-referential projection before any validator equality assertion lands.

## Architecture Check

1. First define one canonical projection function or canonical packet-input rule, then reuse it from both the CLI and validator. That is cleaner than hand-editing validator extraction logic because the producer and consumer must agree on identical bytes.
2. No backwards-compatibility aliases or shape shims: after the projection is defined, records whose stored `page_packet_hash` does not reproduce from that projection should fail validation. Existing content repair/restamping remains separate.

## Verification Layers

1. `compute-stchar-hashes` and validator recompute use the same canonical page-packet projection helper → codebase grep-proof plus focused helper/CLI tests.
2. A §16a packet whose stored `page_packet_hash` does not match the canonical non-self-referential projection fails → `page-plan-stchar-packet-integrity.test.ts`.
3. A §16a packet whose hashes all reproduce from the canonical projection passes → focused validator test plus package build/test lane.
4. Skill/docs contract says exactly what bytes the `--packet` input represents → manual review / grep-proof over the edited STCHAR authoring contract surfaces.

## What to Change

### 1. Define the canonical page-packet projection

Choose and document a non-self-referential representation for `page_packet_hash`, such as a packet projection that excludes the `Hashes:` line entirely or replaces `page_packet_hash=<hash>` with a fixed placeholder before hashing. Implement it in the shared hash/helper layer so producer and validator consume the same rule.

### 2. Align the CLI and authoring contract

Update `compute-stchar-hashes` and the STCHAR authoring contract prose so operators and skills know exactly what `--packet` must contain. If the CLI can safely canonicalize a full §16a packet itself, prefer that over requiring hand-authored slice surgery.

### 3. Enforce recompute in `page_plan_stchar_packet_integrity`

After the projection rule is pinned, make the validator recompute `page_packet_hash` from the parsed packet projection and fail when it differs from the stored STCHAR frontmatter value.

## Files to Touch

- `tools/world-index/src/hash/content.ts` (modify)
- `tools/world-index/tests/hash/content.test.ts` (modify)
- `tools/world-mcp/src/cli/compute-stchar-hashes.ts` (modify)
- `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts` (modify)
- `tools/validators/tests/structural/page-plan-stchar-packet-integrity.test.ts` (modify)
- `.claude/skills/_shared-templates/story-record-schemas.md` (modify, if contract wording changes)
- `.claude/skills/story-character-profile/SKILL.md` (modify, if CLI input guidance changes)

## Out of Scope

- Restamping existing stale STCHAR records or page plans.
- Changing `profile_hash`, `voice_block_hash`, or `source_char_hash` semantics.
- Changing prose receipt schema shape; receipt validators should keep comparing declared observed/expected hashes after the page-plan validator owns recompute.

## Acceptance Criteria

### Tests That Must Pass

1. Focused hash-helper / CLI test proves the canonical page-packet projection is non-self-referential and stable under whitespace normalization.
2. `page_plan_stchar_packet_integrity` fails a packet whose stored `page_packet_hash` does not match the canonical projection.
3. `cd tools/world-index && npm run build && npm test`
4. `cd tools/world-mcp && npm run build` plus the focused compiled CLI test if one already exists or is added.
5. `cd tools/validators && npm run build && node --test dist/tests/structural/page-plan-stchar-packet-integrity.test.js`
6. `cd tools/validators && npm test`

### Invariants

1. `page_packet_hash` never hashes its own stored value.
2. Producer and validator use one shared canonical projection rule; no hand-rolled validator-only canonicalization.
3. Validator behavior is fail-closed and does not weaken HARD-GATE, approval-token, or Mystery Reserve enforcement.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/hash/content.test.ts` — canonical page-packet projection helper coverage.
2. `tools/world-mcp` CLI test surface — update or add coverage for `compute-stchar-hashes --packet` if a focused CLI test exists; otherwise record the build plus helper test as the package boundary.
3. `tools/validators/tests/structural/page-plan-stchar-packet-integrity.test.ts` — wrong-`page_packet_hash` fail fixture and matching projection pass fixture.

### Commands

1. `cd tools/world-index && npm run build && npm test`
2. `cd tools/world-mcp && npm run build`
3. `cd tools/validators && npm run build && node --test dist/tests/structural/page-plan-stchar-packet-integrity.test.js`
4. `cd tools/validators && npm test`
