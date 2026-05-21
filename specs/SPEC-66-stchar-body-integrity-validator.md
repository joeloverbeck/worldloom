# SPEC-66 — STCHAR Body-Integrity Validator

**Status:** PROPOSED
**Date:** 2026-05-21
**Classification:** story-canon-related (Skill Category 2c surface — branching-story pipeline validators)
**Source:** `reports/stchar-audit-second-iteration.md` §12 (deterministic validators to add, `stchar_body_integrity`), §17 Critical #5; triage `docs/triage/2026-05-21-stchar-audit-second-iteration-triage.md`
**Depends on:** none — independent of SPEC-65/67

## 1. Context

STCHAR is the load-bearing story-local character authority record: persona, voice, appraisal,
pressure behavior, agency, and relationship conduct all derive from its body sections (FOUNDATIONS
§6.1; story-character-profile/SKILL.md Phase 3). Verification against `main` confirmed that **no
validator checks the STCHAR authority record's own structural integrity** — there is no
`tools/validators/src/structural/stchar-body-integrity.ts`. The existing STCHAR validators check
*references to* STCHAR (resolution, active-for-bound-STENT, reciprocity, supersession), packet hashes
*against* STCHAR frontmatter (`page-plan-stchar-packet-integrity`), and receipt hashes
(`prose-receipt-stchar-integrity`) — but nothing verifies the record everything else trusts.

**Deferral-reversal note.** The first-iteration triage deferred `stchar_body_contract` "await a
concrete consumer." That condition is now satisfied: the consumer is authority-record integrity
itself — the producer-correctness guard on the one record class the entire story-character pipeline
treats as ground truth. The deferral invited reopening on a concrete consumer; this spec supplies it.
User confirmed the reversal (2026-05-21).

### Verified facts

- The 13 required H2 body sections are defined in `story-character-profile/SKILL.md` Phase 3
  (lines ~210–224), **not** in the shared contract:
  `Story-Facing Identity`, `Source Distillation`, `Stable Persona Core`, `Emotional Appraisal Map`,
  `Pressure Behavior`, `Voice Bible / Dialogue Authority`, `Page-Plan Voice Block`,
  `Perception and Embodiment`, `Agency and Planning Tendencies`, `Relationship-Specific Behavior`,
  `Story-State Derivation Guide`, `Prose Rendering Constraints`, `Validation / Audit Anchors`.
- The STCHAR schema (`tools/validators/src/schemas/story-character-authority.schema.json`) requires
  three frontmatter hashes: `profile_hash`, `voice_block_hash`, `page_packet_hash` (pattern
  `^sha256:[0-9a-f]{64}$`).
- `appliesToStcharStoryState` (`tools/validators/src/structural/stchar-utils.ts` lines ~35–42) already
  triggers on `append_story_character_authority_record` / `supersede_story_character_authority_record`
  ops and on the `story-characters/` touched directory — the new validator reuses this gate.

## 2. Changes

### 2.1 New validator `stchar_body_integrity`

**Files:** new `tools/validators/src/structural/stchar-body-integrity.ts`; register in
`tools/validators/src/public/registry.ts` (`structuralValidators[]`, alongside the other `stchar*`
validators); tests under `tools/validators/tests/structural/`.

The validator runs when `appliesToStcharStoryState` is true and inspects each STCHAR hybrid record
(`stories/<slug>/story-characters/STCHAR-*.md`):

**2.1a Section-presence checks (safe; primary deliverable).**
- All 13 required H2 sections are present, by exact heading text, sourced from a single canonical
  constant in this validator (the authoritative list is `story-character-profile/SKILL.md` Phase 3 —
  add a one-line cross-reference comment in both directions so the list cannot silently drift).
- No required section has an empty body (whitespace-only between the heading and the next H2 fails).
- The body is non-empty overall.

**2.1b Hash-shape checks (safe).**
- `profile_hash`, `voice_block_hash`, `page_packet_hash` are present and match
  `^sha256:[0-9a-f]{64}$` (defensive against a record that schema-validation somehow bypassed; cheap).

**Acceptance:** an STCHAR missing any of the 13 H2 sections fails; an STCHAR with an empty
`Voice Bible / Dialogue Authority` or `Page-Plan Voice Block` section fails; a malformed-hash STCHAR
fails; a complete 13-section STCHAR passes.

### 2.2 Hash-recompute check (contingent — implement only if canonicalization is pinned)

The report's strongest claim ("frontmatter hashes match canonical section projections") requires
**recomputing** `profile_hash`/`voice_block_hash`/`page_packet_hash` from the body and comparing. This
is only sound if the exact canonicalization story-character-profile uses to compute those hashes is
deterministic and documented. A recompute that guesses the canonicalization will emit false mismatches
and is worse than no check.

**Implementer task (ordered):**
1. Locate where `story-character-profile` computes the three hashes (the skill, or a shared hashing
   util under `tools/`). Determine the exact input projection (which body lines/sections, normalization,
   encoding).
2. **If** a deterministic, reusable canonicalization exists or can be extracted into a shared util
   without changing the producer's output: add the recompute-and-compare check to
   `stchar_body_integrity`, and add a stale-hash negative fixture.
3. **If not** (canonicalization is implicit/non-reproducible): do **not** add the recompute check.
   Record the gap in this spec's closeout and leave hash-staleness partially covered by the existing
   downstream `page-plan-stchar-packet-integrity` (which already fails when a page-plan packet's
   declared hash diverges from the STCHAR frontmatter hash in use).

**Acceptance:** either the recompute check ships with a stale-hash negative fixture AND a documented
canonicalization, OR the closeout records why it was held back. The §2.1 checks ship regardless.

## 3. Out of scope

- STCHAR section-projection discoverability in `get_record_schema` (report §17 Nice-to-have #12 / first
  triage N1) — still no consumer; remains deferred.
- Grading whether section *content* is faithful to the source character (voice fidelity, appraisal
  fidelity) — judgment-assisted, already housed in prose-attach `profile_fidelity[]` and
  health-audit advisories (report §12 judgment-assisted checks).
