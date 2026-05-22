# VALENH-030: Define and validate non-self-referential STCHAR page-packet hashes

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-index` hash helpers, `tools/world-mcp` `compute-stchar-hashes` CLI/help/test, `tools/validators` page-plan STCHAR packet validator/tests, and STCHAR authoring contract prose.
**Deps**: `archive/tickets/VALENH-029.md` (body-owned `profile_hash` / `voice_block_hash` recompute landed; `page_packet_hash` recompute explicitly descoped pending this projection contract).

## Problem

At intake, VALENH-029 had closed the body-owned STCHAR hash gap by recomputing `profile_hash` and `voice_block_hash` in `stchar_body_integrity`, but it deliberately left `page_packet_hash` as consistency-only. The reason was structural: live §16a page-plan packets include a `Hashes:` line containing `page_packet_hash` itself, while `computeStcharPagePacketHash(packetText)` hashed the packet text it was handed. A validator that hashed the whole parsed packet would therefore hash the stored hash value as part of its own input, producing a self-referential and untrustworthy check.

Before this ticket, `page_plan_stchar_packet_integrity` and `prose_receipt_stchar_integrity` confirmed the page plan and receipt copied the STCHAR frontmatter value faithfully, but no validator proved that the stored `page_packet_hash` described the intended §16a packet projection bytes.

## Assumption Reassessment (2026-05-22)

1. **Codebase at intake**: `tools/world-index/src/hash/content.ts` exported `computeStcharPagePacketHash(packetText)` as `sha256Hex(normalizeProseWhitespace(packetText))`, with no helper that removed, masked, or canonicalized the `Hashes:` line. `tools/world-mcp/src/cli/compute-stchar-hashes.ts` passed the entire `--packet` file contents to that helper. `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts` parsed packet text only far enough to extract declared `profile_hash`, `voice_block_hash`, and `page_packet_hash`, then compared those declarations with stored STCHAR frontmatter.
2. **Docs/skills at intake**: `.claude/skills/_shared-templates/story-record-schemas.md` §4.5.19 and `.claude/skills/story-character-profile/SKILL.md` Phase 5 required the canonical CLI for all three STCHAR hashes, but did not define whether the `--packet` input included the `Hashes:` line, excluded it, or included it with `page_packet_hash` blanked/placeholdered. `.claude/skills/_shared-templates/story-state-contract.md` §16a showed packet examples that include the `Hashes:` line.
3. **Shared boundary under audit**: the `page_packet_hash` contract shared by STCHAR authoring, `compute-stchar-hashes`, `@worldloom/world-index/hash/content`, page-plan §16a packet structure, `page_plan_stchar_packet_integrity`, and prose receipt STCHAR authority checks.
4. **FOUNDATIONS principle**: §Story Bundles §6.1 Story-Local Character Authority makes the STCHAR and its §16a packet the runtime character authority. A hash field that is only copied, never recomputed from a pinned projection, is not a trustworthy integrity signal.
5. **Canon Safety surface**: this ticket changes structural validator behavior that can run in validation contexts. The landed change strengthens fail-closed checking only, preserves existing HARD-GATE / approval-token semantics, and avoids any world-content mutation.
6. **Adjacent contradiction from VALENH-029**: `page_packet_hash` was originally grouped with body recompute, but the live packet includes its own hash value. This follow-up owns defining the non-self-referential projection before any validator equality assertion lands.
7. **Relationship to `ENGINESYNC-005`**: `ENGINESYNC-005` owns the unrelated `file_versions.content_hash` basis used by the patch-engine stale-index guard for story-character files. It is not a blocker for this ticket. Do not change `file_versions` storage, `parseStoryBundleSourceFile` file-result hashes, or `detectStaleIndex` behavior while implementing this ticket.
8. **Chosen projection**: the landed contract masks only `page_packet_hash=sha256:<64 lowercase hex>` to the fixed placeholder `page_packet_hash=sha256:<page_packet_hash>` before applying the existing normalized-prose hash. The `Hashes:` line stays in the projection, so `profile_hash` / `voice_block_hash` declarations remain covered while `page_packet_hash` never hashes its own stored value.
9. **Same-seam prose fallout**: `.claude/skills/branching-story-bootstrap/SKILL.md` also contained current operational guidance for `compute-stchar-hashes --packet`, so it moved with the shared template and `story-character-profile` prose. `.claude/skills/_shared-templates/story-state-contract.md` §16a also moved because it is the packet-shape contract under audit.

## Architecture Check

1. First define one canonical projection function or canonical packet-input rule, then reuse it from both the CLI and validator. That is cleaner than hand-editing validator extraction logic because the producer and consumer must agree on identical bytes.
2. No backwards-compatibility aliases or shape shims: records whose stored `page_packet_hash` does not reproduce from the canonical projection fail validation. Existing content repair/restamping remains separate.

## Verification Layers

1. `compute-stchar-hashes` and validator recompute use the same canonical page-packet projection helper → codebase grep-proof plus focused helper/CLI tests.
2. A §16a packet whose stored `page_packet_hash` does not match the canonical non-self-referential projection fails → `page-plan-stchar-packet-integrity.test.ts`.
3. A §16a packet whose hashes all reproduce from the canonical projection passes → focused validator test plus package build/test lane.
4. Skill/docs contract says exactly what bytes the `--packet` input represents → manual review / grep-proof over the edited STCHAR authoring contract surfaces.

## Landed Changes

### 1. Defined the canonical page-packet projection

`tools/world-index/src/hash/content.ts` now exports `canonicalizeStcharPagePacketForHash(packetText)`, which replaces `page_packet_hash=sha256:<64 lowercase hex>` with `page_packet_hash=sha256:<page_packet_hash>`. `computeStcharPagePacketHash(packetText)` hashes that canonicalized projection via the existing normalized-prose hash path.

### 2. Aligned the CLI and authoring contract

`compute-stchar-hashes --packet` may now receive a full §16a packet including the `Hashes:` line. The CLI help and STCHAR authoring prose state that only `page_packet_hash` is masked; operators should not hand-remove the sibling hashes.

### 3. Enforced recompute in `page_plan_stchar_packet_integrity`

`page_plan_stchar_packet_integrity` now imports the shared `@worldloom/world-index/hash/content` helper, keeps the parsed raw packet text, recomputes `page_packet_hash`, and emits fail-closed `hash_mismatch` verdicts when stored STCHAR frontmatter does not match the canonical packet projection.

## Files to Touch

- `tools/world-index/src/hash/content.ts` (modify)
- `tools/world-index/tests/hash/content.test.ts` (modify)
- `tools/world-mcp/src/cli/compute-stchar-hashes.ts` (modify)
- `tools/world-mcp/src/package-interop.ts` (modify)
- `tools/world-mcp/tests/cli/compute-stchar-hashes.test.ts` (new)
- `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts` (modify)
- `tools/validators/tests/structural/page-plan-stchar-packet-integrity.test.ts` (modify)
- `.claude/skills/_shared-templates/story-record-schemas.md` (modify)
- `.claude/skills/_shared-templates/story-state-contract.md` (modify)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify)
- `.claude/skills/story-character-profile/SKILL.md` (modify)

## Out of Scope

- Restamping existing stale STCHAR records or page plans.
- Changing `profile_hash`, `voice_block_hash`, or `source_char_hash` semantics.
- Changing prose receipt schema shape; receipt validators should keep comparing declared observed/expected hashes after the page-plan validator owns recompute.
- Changing `file_versions.content_hash` or patch-engine stale-index behavior; that boundary belongs to `ENGINESYNC-005`.

## Acceptance Criteria

### Tests That Must Pass

1. Focused hash-helper / CLI tests prove the canonical page-packet projection is non-self-referential and stable under whitespace normalization.
2. `page_plan_stchar_packet_integrity` fails a packet whose stored `page_packet_hash` does not match the canonical projection.
3. `cd tools/world-index && npm run build && npm test`
4. `cd tools/world-mcp && npm run build` plus the focused compiled CLI test.
5. `cd tools/validators && npm run build && node --test dist/tests/structural/page-plan-stchar-packet-integrity.test.js`
6. `cd tools/validators && npm test`

### Invariants

1. `page_packet_hash` never hashes its own stored value.
2. Producer and validator use one shared canonical projection rule; no hand-rolled validator-only canonicalization.
3. Validator behavior is fail-closed and does not weaken HARD-GATE, approval-token, or Mystery Reserve enforcement.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/hash/content.test.ts` — canonical page-packet projection helper coverage.
2. `tools/world-mcp/tests/cli/compute-stchar-hashes.test.ts` — focused CLI coverage for `compute-stchar-hashes --packet` help text and non-self-referential page-packet output.
3. `tools/validators/tests/structural/page-plan-stchar-packet-integrity.test.ts` — wrong-`page_packet_hash` fail fixture and matching projection pass fixture.

### Commands

1. `cd tools/world-index && npm run build`
2. `cd tools/world-index && npm test`
3. `cd tools/world-mcp && npm run build`
4. `cd tools/world-mcp && node --test dist/tests/cli/compute-stchar-hashes.test.js`
5. `cd tools/validators && npm run build`
6. `cd tools/validators && node --test dist/tests/structural/page-plan-stchar-packet-integrity.test.js`
7. `cd tools/validators && npm test`

## Outcome

Completion date: 2026-05-22.

Implemented. `page_packet_hash` is now a normalized hash of the full §16a packet projection with only its own stored value masked to `sha256:<page_packet_hash>`. The shared `world-index` helper is the single computation path used by `compute-stchar-hashes` and by `page_plan_stchar_packet_integrity`.

The validator remains fail-closed: if a page plan faithfully copies a stale stored `page_packet_hash`, the copied-value consistency check can pass, but the new recompute check fails the packet against the canonical projection.

## Verification Result

1. `cd tools/world-index && npm run build` — pass.
2. `cd tools/world-index && npm test` — pass, 138 tests. The suite emitted expected existing fixture diagnostics for schema-pattern skips and legacy-world atomic-source absence.
3. `cd tools/world-mcp && npm run build` — pass.
4. `cd tools/world-mcp && node --test dist/tests/cli/compute-stchar-hashes.test.js` — pass, 2 tests.
5. `cd tools/validators && npm run build` — pass.
6. First focused validator proof: `cd tools/validators && node --test dist/tests/structural/page-plan-stchar-packet-integrity.test.js` — failed because existing positive fixtures still stamped placeholder `page_packet_hash` values for the exact packet variants. This was same-seam proof-surface fallout.
7. Final focused validator proof: `cd tools/validators && node --test dist/tests/structural/page-plan-stchar-packet-integrity.test.js` — pass, 12 tests.
8. `cd tools/validators && npm test` — pass, 860 tests.

## Deviations

- The final projection uses placeholder masking rather than excluding the entire `Hashes:` line. This preserves coverage of sibling `profile_hash` / `voice_block_hash` declarations while avoiding self-reference.
- The implementation touched `.claude/skills/branching-story-bootstrap/SKILL.md` and `.claude/skills/_shared-templates/story-state-contract.md` in addition to the originally listed STCHAR authoring prose because both are current same-seam packet/hash contract surfaces.
- The first focused validator run exposed required fixture truthing for positive packet variants. The final tests now compute each positive fixture's stored `page_packet_hash` from that exact packet text.
