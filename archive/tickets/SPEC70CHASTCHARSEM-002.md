# SPEC70CHASTCHARSEM-002: STCHAR operational-home subsections + body-integrity extension

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/src/structural/stchar-body-integrity.ts` (structural validator), `tools/validators/tests/structural/stchar-body-integrity.test.ts`, and `.claude/skills/story-character-profile/SKILL.md` Phase 3 template.
**Deps**: None

## Problem

At intake, SPEC-70 §1.2 identified that a source `CHAR` capability or signature behavior could survive only inside the STCHAR `## Source Distillation` commentary and pass every current gate, because the 13 H2 sections had no explicit *operational home* for capabilities/affordances or signature-behavior rendering. This ticket added three required H3 subsections so capabilities have an explicit home, and extended `stchar-body-integrity.ts` to require their presence (presence + non-empty only — no content-quality judgment), with the §3 warn-until-touched migration posture for legacy records.

## Assumption Reassessment (2026-05-22)

1. `tools/validators/src/structural/stchar-body-integrity.ts` exports `REQUIRED_STCHAR_SECTIONS` (the 13 H2 section list), validates each H2 present-exactly-once + non-empty, recomputes `profile_hash` (full body) + `voice_block_hash` (`## Page-Plan Voice Block`), and shape-checks `page_packet_hash`. This ticket added `REQUIRED_STCHAR_SUBSECTIONS` under existing H2s `## Agency and Planning Tendencies` and `## Prose Rendering Constraints`; the 13 H2 list is unchanged.
2. Spec source: SPEC-70 §2.2 (the three required subsections), §3 (migration: fail for new/superseding, warn for untouched legacy), §6 (body-integrity regression: new subsections required, existing 13-section fixtures stay green, `profile_hash` recompute over migrated bodies).
3. Cross-artifact boundary under audit: `story-character-profile/SKILL.md` Phase 3 explicitly notes `REQUIRED_STCHAR_SECTIONS` in the validator must be co-updated with the skill's section list. This ticket updated BOTH the Phase 3 template (added the H3 subsections to the drafted body skeleton) AND the validator's subsection-presence check — they are the paired surfaces under audit.
4. FOUNDATIONS §Story Bundles §6.1 (Story-Local Character Authority): "STCHAR shapes persona, voice, and pressure behavior; normal runtime consumes active STCHAR, not world CHAR." Giving capabilities an explicit operational home strengthens this boundary — operational facts land in STCHAR runtime-authority sections rather than being stranded where runtime cannot reach them. The subsections satisfy §6.1's completeness intent.
5. Canon-Safety surface: `stchar-body-integrity.ts` is a story-bundle structural validator under `tools/validators/src/structural/` (gates STCHAR record writes at engine pre-apply). The change is additive presence-checks; it does NOT touch the Mystery Reserve firewall, HARD-GATE semantics, or canon-write ordering, and cannot silently resolve an `M-<integer>` entry (STCHAR carries no mystery-resolution authority). Migration discipline landed as FAIL severity for pre-apply/touched STCHAR records and WARN severity for untouched full-world legacy STCHAR records during the one-revision-cycle window.

## Architecture Check

1. Adding H3 subsections under the existing H2s (rather than new H2 sections) keeps the 13-H2 contract and the `profile_hash`/`voice_block_hash` boundaries intact while giving skills + validators a stable operational target — the medium-aggressive option SPEC-70 §2.2 chose over a new H2 (which would carry a larger migration blast radius). Presence-only enforcement keeps the validator deterministic (no literary-quality judgment, per FOUNDATIONS §Tooling Recommendation deterministic/judgment split).
2. No backwards-compatibility shim: the legacy WARN window is a time-bounded migration posture (one revision cycle), not a permanent dual-path alias; new and superseding records FAIL immediately.

## Verification Layers

1. New STCHAR missing any of the 3 subsections → FAIL → codebase grep-proof (validator emits a section-missing verdict for the absent H3) + schema-validation-style structural test.
2. Existing 13-section fixtures (no H3 subsections) stay green under the legacy WARN window → structural test (legacy record → WARN, not FAIL).
3. `profile_hash` recompute remains canonical over a migrated body that adds the subsections → codebase grep-proof (`compute-stchar-hashes.ts` body hash recomputed; test asserts the post-migration body hashes deterministically).

## Landed Changes

### 1. Added required H3 subsections to the Phase 3 template

In `.claude/skills/story-character-profile/SKILL.md` Phase 3 (the stchar.v1 body skeleton), added under the named H2s:
- `## Agency and Planning Tendencies`: `### Operational capabilities and affordances`, `### Capability limits, costs, and access constraints`.
- `## Prose Rendering Constraints`: `### Signature scene behaviors to render`.

### 2. Extended `stchar-body-integrity.ts` to require the subsections

Added the three H3 subsections to the validator's required-subsection model (present + non-empty under their parent H2). Gate severity is FAIL for pre-apply/touched STCHAR and WARN for untouched full-world legacy STCHAR records during the one-revision-cycle migration window.

## Files to Touch

- `tools/validators/src/structural/stchar-body-integrity.ts` (modify)
- `.claude/skills/story-character-profile/SKILL.md` (modify) — Phase 3 template skeleton
- `tools/validators/tests/structural/stchar-body-integrity.test.ts` (modify) — add subsection-required (FAIL), legacy-warn, and profile-hash-over-migrated-body cases

## Out of Scope

- The `source_operational_fact_map` frontmatter field (`archive/tickets/SPEC70CHASTCHARSEM-001.md`) and the coverage validator (SPEC70CHASTCHARSEM-003).
- The Semantic Preservation Contract prose / §16a capabilities line (SPEC70CHASTCHARSEM-004).
- Backfilling the subsections into the 3 existing red-bunny STCHAR bodies (handled by the warn-until-touched window when each is next regenerated).
- Any change to the 13 H2 section list or to `voice_block_hash` / `page_packet_hash`.

## Acceptance Criteria

### Tests That Passed

1. A new STCHAR body missing `### Operational capabilities and affordances` (or either sibling subsection) emits a FAIL verdict naming the absent subsection.
2. An untouched legacy `world_char` STCHAR (13 H2s, no new H3s) emits WARN, not FAIL.
3. A migrated body that adds the 3 subsections recomputes `profile_hash` deterministically and passes.
4. `npm test` passed in `tools/validators`.

### Invariants

1. The 13 H2 section list (`REQUIRED_STCHAR_SECTIONS`) is unchanged; the new requirements are H3 subsections under existing H2s.
2. The subsection check is presence + non-empty only — it never judges content adequacy.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/stchar-body-integrity.test.ts` (modify) — subsection-required FAIL case, legacy-WARN case, profile-hash-over-migrated-body case; assert existing 13-H2 fixtures stay green.

### Commands

1. From `tools/validators`: `npm run build` — tsc gate (no separate `typecheck` script).
2. From `tools/validators`: `node --test dist/tests/structural/stchar-body-integrity.test.js` — focused compiled test lane.
3. From `tools/validators`: `npm test` — build + full `node --test`.

## Outcome

Completed: 2026-05-22.

Implemented the SPEC-70 §2.2 operational-home requirement by adding `REQUIRED_STCHAR_SUBSECTIONS` to `stchar_body_integrity`, validating the three required H3s for presence and non-empty content under their parent H2 sections, and preserving the migration window by emitting FAIL for pre-apply/touched STCHAR records and WARN for untouched full-world legacy records. Updated the `story-character-profile` Phase 3 template skeleton so new STCHAR drafts include the same H3s.

The 13-H2 `REQUIRED_STCHAR_SECTIONS` list stayed unchanged. The new validation is structural only; it does not judge capability or signature-behavior content quality.

## Verification Result

1. `npm run build` from `tools/validators` — PASS.
2. `node --test dist/tests/structural/stchar-body-integrity.test.js` from `tools/validators` — PASS, 13/13 focused subtests.
3. `npm test` from `tools/validators` — PASS, 887/887 package subtests.

## Deviations

- The ticket's drafted root-prefixed commands were normalized to package-root commands because `tools/validators/package.json` is the live command authority and the package tests consume compiled `dist/` output.
- Existing ignored artifacts `tools/validators/dist/` and `tools/validators/node_modules/` were present before verification and left in place; `dist/` was refreshed by `npm run build` / `npm test`.
