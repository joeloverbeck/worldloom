# SPEC-63 — Offstage-Causal §16a Packet Tier

**Status:** NOT STARTED
**Date:** 2026-05-21
**Classification:** story-canon-related (Skill Category 2c surface — branching-story pipeline)
**Source:** `archive/specs/SPEC-59-stchar-authority-fidelity-validators.md` §5 (Out of scope: `offstage_causal_packet`) + `reports/stchar-audit-first-iteration.md` §8 (§16a contract amendment, lines ~391–426) + §9.8 (offstage packet fixture)
**Depends on:** SPEC-59 (`archive/specs/SPEC-59-stchar-authority-fidelity-validators.md`; completed — provides `page_plan_stchar_packet_integrity` and `prose_receipt_stchar_integrity`, the validators this spec extends) and transitively SPEC-58 (active_records.STCHAR required key)

## 1. Context

SPEC-59 deferred one feature in its §5 out-of-scope: a **reduced-scope §16a packet tier for
causally-relevant offstage characters**. It deferred it on the grounds that the §16a authoring
contract had no offstage tier — it offered only "emit a full present packet" or "omit a
background-only entity" — so a validator could not check a marker no authoring surface produces.
This spec adds the authoring-contract tier first, then teaches the existing validator to enforce it.

Verification against `main` refined the exact gap:

- The §16a contract (`.claude/skills/_shared-templates/story-state-contract.md` §16a, lines ~456–478)
  defines a single full-packet shape and a `Required because:` enum of
  `viewpoint | speaker | major_actor | direct_target | emotionally_salient | behavior_shapes_page |
  voice_shapes_page`. There is **no offstage value** and **no reduced shape**.
- The implemented `page_plan_stchar_packet_integrity` validator
  (`tools/validators/src/structural/page-plan-stchar-packet-integrity.ts`) demands a full packet for
  **every** active non-background STENT bound to an active STCHAR — **with no presence-awareness**.
  Entity location lives in `STSTAT.location` (enum includes `offstage`) and is projected into
  `PG.state_snapshot.entity_status[].location`. So today a causally-relevant offstage character
  forces a binary: emit a full packet (over-authoring a voice/dialogue block for someone not on the
  page — and if `required_because` is `speaker`/`viewpoint`, the validator demands a voice block they
  cannot have), or drop the character from `active_records` (losing the offstage causal authority —
  appraisal, pressure behavior, what the character is doing offstage that bears on the page).
- The prose-receipt schema (`tools/validators/src/schemas/prose-receipt.schema.json`) requires
  `voice_block_hash` per `stchar_authority[]` entry, and `prose_receipt_stchar_integrity` compares
  `required_because` as a free string and checks `profile_fidelity[]` entry **presence** only
  (never auto-grading the judgment-assisted axes). `profile_fidelity` verdicts already include a
  `not_applicable` enum value.

This spec adds the offstage tier as **one new `required_because` value** (not a new `packet_scope`
field — that would duplicate the discriminator and tension §5b Schema-Minimalism), keeps the three
integrity hashes on the reduced packet (so receipt-side hash comparison is unchanged and no schema
change is required), and makes the page-plan validator **presence-aware**. It never auto-grades
whether offstage causal relevance *warranted* a packet — that remains authoring judgment, mirroring
SPEC-59's deterministic-vs-judgment boundary.

## 2. Changes

### 2.1 §16a contract — add the offstage-causal tier

**Files:** `.claude/skills/_shared-templates/story-state-contract.md`

- Add `offstage_causal` to the §16a `Required because:` enum.
- Document the **reduced offstage packet shape**. The offstage packet:
  - **Carries** all three hashes (`profile_hash`, `voice_block_hash`, `page_packet_hash`) — declared
    from the STCHAR record's *stored* frontmatter hashes exactly as the full packet does. The hashes
    anchor STCHAR identity for receipt validation; carrying them keeps the integrity machinery uniform
    and is what lets the prose-receipt schema stay unchanged.
  - **Carries** `Relevant appraisal rules`, `Relevant pressure behavior` (when applicable), and a new
    `Offstage causal relevance:` line — the operational authority for what the offstage character is
    doing that bears on this page (driving an event, a belief, a consequence, a threat).
  - **Omits** the `Voice/dialogue authority:` block and the on-page rendering lines (perception and
    embodiment constraints, agency rendering, "prose must show" dialogue cues) — the character is not
    rendered on the page, so the voice projection is not authored.
- Document the **emit/omit boundary** as authoring judgment (not validator-graded): an active offstage
  character (`entity_status.location: offstage`) whose offstage activity causally bears on the page
  **should** carry an `offstage_causal` packet; an offstage character with no causal bearing this page
  **may** be omitted (the existing background-only omission), and the omission must still not ask the
  prose renderer to infer persona from an id.

**Acceptance:** the contract defines `offstage_causal`, its reduced shape, and the emit/omit boundary;
no new schema field is introduced.

### 2.2 Authoring surfaces — emit the tier

**Files:**
- `.claude/skills/branching-story-bootstrap/SKILL.md` (§16a authoring guidance — Phase 1-9 page-plan
  drafting and the Phase-10 §16a packet check)
- `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` (§16a authoring
  paragraph)

- Teach §16a authoring to emit an `offstage_causal` packet (reduced shape per 2.1) for an active
  offstage character whose activity causally bears on the page, and to omit non-causal offstage
  characters.
- Keep present-character authoring unchanged (full packet, voice block when speaker/viewpoint).

**Acceptance:** both surfaces describe the offstage tier and its reduced shape; neither relaxes the
full-packet requirement for present characters.

### 2.3 `page_plan_stchar_packet_integrity` — presence-awareness

**Files:**
- `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts`
- (no registry change — validator already registered)

Make the validator presence-aware using the page's `entity_status[].location` (derived from active
`STSTAT`), with these deterministic rules:

- **R1 (relax offstage):** For an active non-background STENT bound to an active STCHAR whose
  `entity_status.location` is `offstage`, a missing §16a packet is **not** a failure (packet optional).
  Present characters (any non-`offstage` location) still require a packet — `missing_packet` unchanged.
- **R2 (present-misuse):** A §16a packet with `Required because: offstage_causal` whose bound STENT is
  **present** (location ≠ `offstage`) fails `offstage_packet_for_present_character` — the packet
  asserts the character is offstage, but the snapshot places them on-page.
- **R3 (voice-block exemption):** `offstage_causal` is not in the speaker/viewpoint voice-block-required
  set, so the existing `missing_voice_block` check does not apply to it (no special-casing needed; the
  enum value simply is not a member of `SPEAKER_VOICE_REQUIRED`).
- **R4 (hashes unchanged):** All packets, including `offstage_causal`, still fail `hash_mismatch` on any
  declared-vs-stored hash discrepancy, and `inactive_stchar` if the cited STCHAR is not active.
- **R5 (location-enum handling):** the `entity_status[].location` enum has four values
  (`STLOC-<integer> | unknown | concealed | offstage`). R1's relaxation keys **strictly** on
  `location == offstage`; `unknown`, `concealed`, and any `STLOC-*` are all treated as present
  (fail-closed — a §16a packet is required, and an `offstage_causal` packet at any of these locations
  fails R2 per the present-misuse rule). Only an explicit `offstage` location earns the reduced tier.

A full packet authored for an offstage character remains valid (backward-compatible — R1 only relaxes
the *requirement*, it does not forbid a full packet). `severity_mode: "fail"` unchanged.

**Acceptance:** offstage character with no packet passes; offstage character with a conformant
`offstage_causal` packet passes; `offstage_causal` packet for a present character fails; present
character with no packet still fails `missing_packet`; hash mismatch on an offstage packet still fails.

### 2.4 `prose_receipt_stchar_integrity` — fixture coverage only (no code change)

**Files:** `tools/validators/src/structural/prose-receipt-stchar-integrity.ts` is **not** modified.

Verified: the receipt validator already accommodates the offstage tier. It compares `required_because`
as a free string (set-equality against the page-plan packet — the new value flows through), checks
`profile_fidelity[]` entry **presence** only, and compares all three hashes (the offstage packet
declares `voice_block_hash` from the STCHAR's stored hash, so the comparison passes). The
judgment-assisted axes stay judgment-assisted: an offstage entry records `voice_fidelity:
not_applicable` (already a valid `profileFidelityVerdict` enum value).

This spec adds **fixtures** (per §3) confirming an offstage `stchar_authority[]` entry validates; it
adds no receipt-validator behavior.

### 2.5 `prose-receipt.schema.json` — no change

Verified: `voice_block_hash` is a required-per-entry field and stays populated by the offstage packet's
declared STCHAR hash; `profileFidelityVerdict` already enumerates `not_applicable`. No schema change is
needed for the offstage tier. (Documented here so a future reader does not re-open the question.)

## 3. Test requirements (fixtures)

- `page_plan_stchar_packet_integrity`:
  - offstage character (`entity_status.location: offstage`), no §16a packet — **pass** (R1).
  - offstage character with a conformant `Required because: offstage_causal` packet (hashes match, no
    voice block) — **pass** (R1 + R3 + R4).
  - `offstage_causal` packet whose STENT is present on-page — **fail** `offstage_packet_for_present_character` (R2).
  - `offstage_causal` packet whose STENT is at a non-`offstage` location (`unknown` / `concealed`) — **fail** `offstage_packet_for_present_character` (R2 + R5; pins the location-enum fail-closed default).
  - `offstage_causal` packet with a hash mismatch — **fail** `hash_mismatch` (R4).
  - present non-background character with no packet — **fail** `missing_packet` (regression guard:
    R1 must not relax present characters).
- `prose_receipt_stchar_integrity`:
  - `stchar_authority[]` entry with `required_because: offstage_causal`, matching hashes,
    `profile_fidelity` entry present with `voice_fidelity: not_applicable` — **pass**.

## 4. FOUNDATIONS alignment

| Principle | Stance | Rationale |
|---|---|---|
| §4a Plan-Authority Boundary | aligns | The reduced packet still carries the page plan's full *operational* authority for the offstage character (appraisal, pressure, offstage causal relevance), so the renderer never infers offstage influence from a bare id. |
| §6.1 Story-Local Character Authority | aligns | Offstage authority stays STCHAR-sourced; the new tier keeps STCHAR the binding operational authority and forbids `CHAR-*` leakage (the existing `no_char_authority_in_story_runtime` class is unchanged). |
| §5b Schema-Minimalism At Story Scope | aligns | The tier is one new `required_because` enum value, not a new `packet_scope` field; no story-record schema field is added, and the prose-receipt schema is unchanged. |
| §9 Prose Length Discipline At Story Scope | aligns | The reduction is by *content sections omitted* (no voice/embodiment projection), never by word budget; "no maximum packet length" is preserved. |
| Judgment vs deterministic boundary (§Tooling Recommendation / HARD-GATE discipline) | aligns | The validator checks reduced-shape conformance and presence consistency deterministically; it never auto-grades whether offstage causal relevance *warranted* a packet, which remains authoring judgment. |

## 5. Out of scope

- **Auto-grading offstage causal relevance.** Whether an offstage character's activity causally bears
  on a page (and therefore *should* carry a packet vs. be omitted) is authoring judgment, not a
  deterministic check. The validator enforces only shape conformance and present/offstage consistency.
- **`stchar_body_contract` (body re-hashing).** Inherited from SPEC-59 §2.2 — the stored frontmatter
  hashes remain the integrity anchor; body re-hashing is still deferred.
- **A distinct `packet_scope` field.** Rejected in favor of the `required_because` enum value per §5b;
  recorded here so it is not re-proposed.
- **The broader §8 packet-shape amendments.** The source audit's §16a amendment
  (`reports/stchar-audit-first-iteration.md` §8, lines ~391–426) also proposes a full packet-shape
  redesign — a structured `page_relevant_projection`, an `included_stchar_sections` list,
  `omitted_sections_with_reason`, and an `active_in_pg_snapshot` field. This spec adopts **only** the
  offstage tier from §8; the broader packet-shape amendments are not adopted here (they were implicitly
  not-adopted at SPEC-59 scope, which validated the present-packet shape §16a specifies today) and
  remain a separate §16a-shape concern.
