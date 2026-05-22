# SPEC70CHASTCHARSEM-002: STCHAR operational-home subsections + body-integrity extension

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/src/structural/stchar-body-integrity.ts` (structural validator) and `.claude/skills/story-character-profile/SKILL.md` Phase 3 template.
**Deps**: None

## Problem

SPEC-70 §1.2: a source `CHAR` capability or signature behavior can survive only inside the STCHAR `## Source Distillation` commentary and pass every current gate, because the 13 H2 sections have no explicit *operational home* for capabilities/affordances or signature-behavior rendering. This ticket adds three required H3 subsections so capabilities have an explicit home, and extends `stchar-body-integrity.ts` to require their presence (presence + non-empty only — no content-quality judgment), with the §3 warn-until-touched migration posture for legacy records.

## Assumption Reassessment (2026-05-22)

1. `tools/validators/src/structural/stchar-body-integrity.ts` exports `REQUIRED_STCHAR_SECTIONS` (the 13 H2 section list), validates each H2 present-exactly-once + non-empty, and recomputes `profile_hash` (full body) + `voice_block_hash` (`## Page-Plan Voice Block`); it shape-checks `page_packet_hash` (verified at SPEC-70 reassessment). The new subsections are H3 under existing H2s `## Agency and Planning Tendencies` and `## Prose Rendering Constraints` — the 13 H2 list is unchanged.
2. Spec source: SPEC-70 §2.2 (the three required subsections), §3 (migration: fail for new/superseding, warn for untouched legacy), §6 (body-integrity regression: new subsections required, existing 13-section fixtures stay green, `profile_hash` recompute over migrated bodies).
3. Cross-artifact boundary under audit: `story-character-profile/SKILL.md` Phase 3 (line ~211) explicitly notes `REQUIRED_STCHAR_SECTIONS` in the validator must be co-updated with the skill's section list. This ticket updates BOTH the Phase 3 template (add the H3 subsections to the drafted body skeleton) AND the validator's subsection-presence check — they are the paired surfaces under audit.
4. FOUNDATIONS §Story Bundles §6.1 (Story-Local Character Authority): "STCHAR shapes persona, voice, and pressure behavior; normal runtime consumes active STCHAR, not world CHAR." Giving capabilities an explicit operational home strengthens this boundary — operational facts land in STCHAR runtime-authority sections rather than being stranded where runtime cannot reach them. The subsections satisfy §6.1's completeness intent.
5. Canon-Safety surface: `stchar-body-integrity.ts` is a story-bundle structural validator under `tools/validators/src/structural/` (gates STCHAR record writes at engine pre-apply). The change is additive presence-checks; it does NOT touch the Mystery Reserve firewall, HARD-GATE semantics, or canon-write ordering, and cannot silently resolve an `M-<integer>` entry (STCHAR carries no mystery-resolution authority). Migration discipline: the new subsection-presence check must run at FAIL severity for new/superseding STCHAR and WARN for untouched legacy `world_char` records (the 3 red-bunny STCHAR) for one revision cycle.

## Architecture Check

1. Adding H3 subsections under the existing H2s (rather than new H2 sections) keeps the 13-H2 contract and the `profile_hash`/`voice_block_hash` boundaries intact while giving skills + validators a stable operational target — the medium-aggressive option SPEC-70 §2.2 chose over a new H2 (which would carry a larger migration blast radius). Presence-only enforcement keeps the validator deterministic (no literary-quality judgment, per FOUNDATIONS §Tooling Recommendation deterministic/judgment split).
2. No backwards-compatibility shim: the legacy WARN window is a time-bounded migration posture (one revision cycle), not a permanent dual-path alias; new and superseding records FAIL immediately.

## Verification Layers

1. New STCHAR missing any of the 3 subsections → FAIL → codebase grep-proof (validator emits a section-missing verdict for the absent H3) + schema-validation-style structural test.
2. Existing 13-section fixtures (no H3 subsections) stay green under the legacy WARN window → skill dry-run / structural test (legacy record → WARN, not FAIL).
3. `profile_hash` recompute remains canonical over a migrated body that adds the subsections → codebase grep-proof (`compute-stchar-hashes.ts` body hash recomputed; test asserts the post-migration body hashes deterministically).

## What to Change

### 1. Add required H3 subsections to the Phase 3 template

In `.claude/skills/story-character-profile/SKILL.md` Phase 3 (the stchar.v1 body skeleton), add under the named H2s:
- `## Agency and Planning Tendencies`: `### Operational capabilities and affordances`, `### Capability limits, costs, and access constraints`.
- `## Prose Rendering Constraints`: `### Signature scene behaviors to render`.

### 2. Extend `stchar-body-integrity.ts` to require the subsections

Add the three H3 subsections to the validator's required-subsection model (present + non-empty under their parent H2). Gate severity: FAIL for new/superseding STCHAR; WARN for untouched legacy `world_char` records during the one-revision-cycle migration window (mirror the migration-posture mechanism the §2.4 coverage validator (003) uses, so the two validators warn/fail in lockstep on the same legacy set).

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

### Tests That Must Pass

1. A new STCHAR body missing `### Operational capabilities and affordances` (or either sibling subsection) → FAIL verdict naming the absent subsection.
2. An untouched legacy `world_char` STCHAR (13 H2s, no new H3s) → WARN, not FAIL.
3. A migrated body that adds the 3 subsections recomputes `profile_hash` deterministically and passes.
4. `npm test` green in `tools/validators`.

### Invariants

1. The 13 H2 section list (`REQUIRED_STCHAR_SECTIONS`) is unchanged; the new requirements are H3 subsections under existing H2s.
2. The subsection check is presence + non-empty only — it never judges content adequacy.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/stchar-body-integrity.test.ts` (modify) — subsection-required FAIL case, legacy-WARN case, profile-hash-over-migrated-body case; assert existing 13-H2 fixtures stay green.

### Commands

1. `npm test --prefix tools/validators` — build + `node --test`.
2. `npm run build --prefix tools/validators` — tsc gate (no separate `typecheck` script).
