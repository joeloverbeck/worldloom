# SPEC-66 — STCHAR Body-Integrity Validator

**Status:** COMPLETED
**Date:** 2026-05-21
**Classification:** story-canon-related (Skill Category 2c surface — branching-story pipeline validators)
**Source:** `reports/stchar-audit-second-iteration.md` §12 (deterministic validators to add, `stchar_body_integrity`), §17 Critical #5; triage `docs/triage/2026-05-21-stchar-audit-second-iteration-triage.md`
**Depends on:** none — independent of SPEC-65/67

## 1. Context

STCHAR is the load-bearing story-local character authority record: persona, voice, appraisal,
pressure behavior, agency, and relationship conduct all derive from its body sections (FOUNDATIONS
§6.1; story-character-profile/SKILL.md Phase 3). Verification against `main` confirmed that **no
deterministic validator checks the STCHAR authority record's own structural integrity** — there is no
`tools/validators/src/structural/stchar-body-integrity.ts`. The existing STCHAR validators check
*references to* STCHAR (resolution, active-for-bound-STENT, reciprocity, supersession), packet hashes
*against* STCHAR frontmatter (`page-plan-stchar-packet-integrity`), and receipt hashes
(`prose-receipt-stchar-integrity`) — but none re-runnably verifies the record everything else trusts.

The one existing structural check is **generation-time only**: `story-character-profile/SKILL.md`
Phase 7 check #7 ("Body sections present — PASS only if all 13 required H2 sections are present exactly
once") is an LLM-judgment self-check performed by the producing skill at generation. It does not run on
supersession, on external edits to a committed STCHAR file, or in CI. This spec's validator is the
**deterministic, re-runnable counterpart** to Phase 7 #7 — it enforces the same section discipline at
the validator-framework layer, where the generation-time judgment cannot reach.

**Deferral-reversal note.** The first-iteration triage deferred `stchar_body_contract` "await a
concrete consumer." That condition is now satisfied: the consumer is authority-record integrity
itself — the producer-correctness guard on the one record class the entire story-character pipeline
treats as ground truth. The deferral invited reopening on a concrete consumer; this spec supplies it.
User confirmed the reversal (2026-05-21).

### Verified facts

- The 13 required H2 body sections are defined in `story-character-profile/SKILL.md` Phase 3
  (lines 212–224), **not** in the shared contract:
  `Story-Facing Identity`, `Source Distillation`, `Stable Persona Core`, `Emotional Appraisal Map`,
  `Pressure Behavior`, `Voice Bible / Dialogue Authority`, `Page-Plan Voice Block`,
  `Perception and Embodiment`, `Agency and Planning Tendencies`, `Relationship-Specific Behavior`,
  `Story-State Derivation Guide`, `Prose Rendering Constraints`, `Validation / Audit Anchors`.
- The STCHAR schema (`tools/validators/src/schemas/story-character-authority.schema.json`) requires
  three frontmatter hashes: `profile_hash`, `voice_block_hash`, `page_packet_hash` (pattern
  `^sha256:[0-9a-f]{64}$`, lines 21–23 / 58–60). The `record-schema-compliance` validator (registered
  at `tools/validators/src/public/registry.ts`) already enforces presence and pattern against this
  schema.
- `appliesToStcharStoryState` (`tools/validators/src/structural/stchar-utils.ts` line 35) already
  triggers on `append_story_character_authority_record` / `supersede_story_character_authority_record`
  ops and on the `story-characters/` touched directory (the touched-path regex at ~line 40) — the new
  validator reuses this gate.
- The hash canonicalization is documented at `story-character-profile/SKILL.md` Phase 5 (lines
  303–311): `profile_hash` hashes the complete STCHAR body markdown; `voice_block_hash` hashes only
  `## Page-Plan Voice Block`; `page_packet_hash` hashes the *projected page-plan packet fields* the
  profile authorizes for section 16a. There is **no shared hashing util under `tools/`** — line 311
  instructs the generator to "use a deterministic byte-for-byte SHA-256 over UTF-8 text and record the
  exact source slices in `## Validation / Audit Anchors`." The exact byte boundaries are therefore
  recorded per-record, not pinned in reusable code. (See §2.2.)
- `character-memorability-structure` (`tools/validators/src/structural/character-memorability-structure.ts`)
  is the closest implementation precedent: a structural validator that checks required H2 sections on a
  hybrid markdown record via a `REQUIRED_*_SECTIONS` constant + frontmatter parse + fail-on-missing,
  with placeholder/empty-body discipline and `severity_mode: "fail"`. The new validator should follow
  this pattern.

## 2. Changes

### 2.1 New validator `stchar_body_integrity`

**Files:** new `tools/validators/src/structural/stchar-body-integrity.ts`; register in
`tools/validators/src/public/registry.ts` (`structuralValidators[]`, alongside the other `stchar*`
validators); tests under `tools/validators/tests/structural/`.

Follow the `character-memorability-structure` implementation pattern (canonical-section constant +
frontmatter parse + fail-on-missing). The validator runs when `appliesToStcharStoryState` is true and
inspects each STCHAR hybrid record (`stories/<slug>/story-characters/STCHAR-*.md`). Use
`severity_mode: "fail"` — a body-integrity failure blocks the engine pre-apply gate and `world-validate`,
matching every sibling `stchar*` validator.

**2.1a Section-presence checks (safe; primary deliverable).**
- All 13 required H2 sections are present, by exact heading text and **exactly once** (matching
  story-character-profile Phase 7 check #7's duplicate-detection discipline), sourced from a single
  canonical constant in this validator (the authoritative list is `story-character-profile/SKILL.md`
  Phase 3 — add a one-line cross-reference comment in both directions so the list cannot silently drift).
- No required section has an empty body (whitespace-only between the heading and the next H2 fails).
- The body is non-empty overall.

**2.1b Hash-shape checks (safe; defensive).**
- `profile_hash`, `voice_block_hash`, `page_packet_hash` are present and match
  `^sha256:[0-9a-f]{64}$`. This is intentionally redundant with the `record-schema-compliance`
  validator (which already enforces the same presence + pattern against
  `story-character-authority.schema.json`); it is a cheap defense against a record that schema-validation
  somehow bypassed. Keep it as a defensive duplicate, or drop it if the redundancy is judged
  unnecessary at implementation time.

**Acceptance:** an STCHAR missing any of the 13 H2 sections (or with a duplicated section heading)
fails; an STCHAR with an empty `Voice Bible / Dialogue Authority` or `Page-Plan Voice Block` section
fails; a malformed-hash STCHAR fails; a complete, exactly-13-section STCHAR passes.

### 2.2 Hash-recompute check (contingent — implement only if canonicalization is pinned)

The report's strongest claim ("frontmatter hashes match canonical section projections") requires
**recomputing** `profile_hash`/`voice_block_hash`/`page_packet_hash` from the body and comparing. This
is only sound if the exact canonicalization story-character-profile uses to compute those hashes is
deterministic and reproducible from a pinned, shared input projection. A recompute that guesses the
canonicalization will emit false mismatches and is worse than no check.

The canonicalization is **documented but not pinned** (see §1 Verified facts):

- It lives in `story-character-profile/SKILL.md` Phase 5 (lines 303–311), not in a shared `tools/` util
  — a `tools/` grep confirms **no reusable hashing helper exists**.
- `profile_hash` (complete body markdown) and `voice_block_hash` (`## Page-Plan Voice Block` section)
  are byte-sliceable from the body — but the exact slice boundaries (heading-line inclusion, trailing
  newline) are recorded per-record in `## Validation / Audit Anchors`, not fixed in code, so different
  records may have hashed slightly different slices.
- `page_packet_hash` hashes a *field projection* (the page-plan packet fields authorized for section
  16a), not a raw body slice — it is definitionally **not** reproducible from the STCHAR body alone.

**Implementer task (ordered):**
1. The canonicalization is at `story-character-profile/SKILL.md` Phase 5; no shared util exists. Decide
   whether a deterministic, reusable canonicalization can be **extracted into a shared util** (consumed
   by both the producer skill's hashing step and this validator) **without changing the producer's
   output** — pinning the exact byte boundaries for `profile_hash` and `voice_block_hash`.
2. **If** such a shared, pinned canonicalization is extracted: add the recompute-and-compare check for
   `profile_hash` and `voice_block_hash` to `stchar_body_integrity`, and add a stale-hash negative
   fixture. `page_packet_hash` recompute remains out of reach (field projection, not a body slice) and
   stays covered downstream by `page-plan-stchar-packet-integrity`.
3. **If not** (no shared util is extracted, or the byte boundaries cannot be pinned without altering
   producer output): do **not** add the recompute check. Record the gap in this spec's closeout and
   leave hash-staleness partially covered by the existing downstream `page-plan-stchar-packet-integrity`
   (which already fails when a page-plan packet's declared hash diverges from the STCHAR frontmatter
   hash in use).

**Acceptance:** either the recompute check (for `profile_hash` / `voice_block_hash`) ships with a
stale-hash negative fixture AND a pinned, shared canonicalization util, OR the closeout records why it
was held back. The §2.1 checks ship regardless.

## 3. FOUNDATIONS Alignment

| Principle | Mechanism |
|-----------|-----------|
| Rule 1: No Floating Facts | The validator declares its scope (STCHAR records under validation, gated by `appliesToStcharStoryState`), reads no world canon, and names its failure consequence (`severity_mode: "fail"` → blocks the engine pre-apply gate / `world-validate`). |
| §Story Bundles §6.1 (Story-Local Character Authority) | Directly guards the integrity of the load-bearing STCHAR authority record that normal story runtime consumes; the producer-correctness counterpart to the reference-side `stchar*` validators. |
| Rule 7: Preserve Mystery Deliberately | N/A — this is a story-scope read-only structural validator (Skill Category 2c); it mediates no world-canon reads/writes and resolves no Mystery Reserve entry. No validator pass can narrow a forbidden-status `M`. |
| §Tooling Recommendation | The validator reads only the STCHAR record(s) in its validation input; it makes no world-state reads (no World Kernel / Invariants / CF retrieval), consistent with its story-scope, record-local check surface. |

## 4. Verification

- `cd tools/validators && npm run build` — compiles the new validator and its registration.
- `cd tools/validators && npm test` — new fixtures pass: a complete exactly-13-section STCHAR passes;
  a missing-section, duplicated-section, empty-`Page-Plan Voice Block`, empty-`Voice Bible`, and
  malformed-hash STCHAR each fail. If §2.2 ships, a stale-`profile_hash`/`voice_block_hash` fixture
  fails the recompute check.
- `world-validate` against a story bundle containing a fixture STCHAR — confirms the validator fires
  under the `appliesToStcharStoryState` gate (op-triggered and `story-characters/` touched-dir-triggered)
  and reports `stchar_body_integrity` verdicts.

## 5. Out of scope

- STCHAR section-projection discoverability in `get_record_schema` (report §17 Nice-to-have #12 / first
  triage N1) — still no consumer; remains deferred.
- Grading whether section *content* is faithful to the source character (voice fidelity, appraisal
  fidelity) — judgment-assisted, already housed in prose-attach `profile_fidelity[]` and
  health-audit advisories (report §12 judgment-assisted checks).
- Expanding `appliesToStcharStoryState`'s applicability (report §17 Critical #4) — a separate change;
  this validator reuses the gate as-is and inherits any future expansion automatically.

## 6. Closeout (2026-05-22)

Delivered §2.1 through `archive/tickets/SPEC66STCHARBODINT-001.md`: `stchar_body_integrity` is registered as a fail-mode structural validator, enforces the 13 required STCHAR H2 sections exactly once, rejects empty required sections and empty bodies, checks STCHAR hash shape defensively, and runs through the STCHAR pre-apply path after STCHAR hybrid overlay/read-surface support was added.

Closed §2.2 through `archive/tickets/SPEC66STCHARBODINT-002.md` using the held-back branch. The recompute check did not ship because no pinned shared canonicalization exists for the producer's hash slices, `voice_block_hash` byte boundaries are not machine-specified, and `page_packet_hash` is a field projection rather than a body slice.

Verification:
- `cd tools/validators && npm run build` — passed.
- `cd tools/validators && node --test dist/tests/structural/stchar-body-integrity.test.js` — passed.
- `cd tools/validators && npm test` — passed, 833 tests.
- `cd tools/world-mcp && npm run build` — passed.
- `cd tools/world-mcp && node --test dist/tests/tools/validate-patch-plan.test.js` — passed, 11 tests.
