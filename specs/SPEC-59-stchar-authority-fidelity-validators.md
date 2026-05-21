# SPEC-59 — STCHAR Authority-Fidelity Validators

**Status:** proposed
**Date:** 2026-05-21
**Classification:** story-canon-related (Skill Category 2c surface — branching-story pipeline)
**Source:** `reports/stchar-audit-first-iteration.md` §13 C5 + §6 cast_bind_list + §9.6 reciprocity (verified against `main`)
**Depends on:** SPEC-58 (`archive/specs/SPEC-58-stchar-contract-enforcement-reconciliation.md`; assumes schemas accept STCHAR and `active_records.STCHAR` is a required, fail-level key)
**Companion:** `docs/triage/2026-05-21-stchar-audit-first-iteration-triage.md`

## 1. Context

The page-plan §16a STCHAR authority packet and the prose-receipt STCHAR/profile-fidelity blocks
are **well-specified in the shared contract and the prose-receipt schema**, but their integrity is
currently enforced only as skill-prose discipline in `branching-story-prose-attach` (which
self-computes the receipt verdicts) and as an advisory audit-time finding
(`page_plan_stchar_hash_mismatch` in `branching-story-health-audit`), not by executable validators
that gate at validate-time / engine pre-apply / Hook 5. This spec adds those validators to
complement — not replace — the existing audit-time check.

Verification refined the actual gap (narrower than the report implies):

- `prose-receipt.schema.json` **already defines** `checks.char_authority_leak`,
  `stchar_authority[]` (with `profile_hash`, `voice_block_hash`, `page_packet_hash` required per
  entry), and `profile_fidelity[]` (lines ~34–196). They are **optional**, and no validator beyond
  schema-shape (`prose_receipt_schema_compliance`) checks packet presence, hash match, or
  active-in-snapshot consistency.
- One-way `STENT.bound_stchar_id → STCHAR` resolution exists (`stchar_resolves`); the reciprocal
  `STCHAR.bound_stent_ids[] → STENT` direction is unchecked.
- `STORY_KERNEL.md.cast_bind_list` has no structural validator.

This spec adds executable validators that convert these into deterministic checks **without**
auto-grading artistic fidelity (voice/appraisal/relationship quality remains judgment-assisted).

## 2. Changes

### 2.1 C5a — Require `checks.char_authority_leak`

**Files:** `tools/validators/src/schemas/prose-receipt.schema.json`

- Move `char_authority_leak` into the `checks.required` array (currently in `properties` with enum
  `["PASS","FAIL"]` but absent from `required` — lines ~36–56).

**Acceptance:** a prose receipt omitting `char_authority_leak` fails
`prose_receipt_schema_compliance`.

### 2.2 C5b — `page_plan_stchar_packet_integrity` (new validator)

**Files:**
- New: `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts`
- Register in `tools/validators/src/public/registry.ts`

Parse page-plan §16a and verify, deterministically:
- A packet exists for every qualifying present character implied by the page's
  `active_records.STENT` / `active_records.STCHAR` and the `required_because` enum.
- Each packet's `stchar_id` appears in `PG.state_snapshot.active_records.STCHAR`.
- Each packet declares `profile_hash`, `voice_block_hash`, `page_packet_hash`, and those hashes
  match the referenced STCHAR record's frontmatter hashes (recompute-free: compare declared vs the
  STCHAR record's stored hashes).
- A present speaker/viewpoint packet (`required_because: speaker | viewpoint`) includes the voice
  block.
- No packet cites `CHAR-*` as authority (delegates to existing `no_char_authority_in_story_runtime`
  for the leak class; this validator asserts packet *presence/shape*).

`severity_mode: "fail"` for missing required packet / hash mismatch / inactive STCHAR.

**Hash-integrity note:** comparison is declared-vs-stored hash equality, not body re-hashing. Body
re-hashing (the rejected `stchar_body_contract` validator) is deferred — the stored frontmatter
hashes are the integrity anchor STCHAR generation already commits to.

### 2.3 C5c — `prose_receipt_stchar_integrity` (new validator)

**Files:**
- New: `tools/validators/src/structural/prose-receipt-stchar-integrity.ts`
- Register in `tools/validators/src/public/registry.ts`

Verify, deterministically:
- Every required §16a packet for the page has a corresponding `stchar_authority[]` entry in the
  receipt (set equality on `stchar_id`).
- Each `stchar_authority[]` entry's hashes match the page-plan packet and the STCHAR record.
- `active_in_snapshot` is true for each entry and consistent with the page snapshot.
- A `profile_fidelity[]` entry exists for every STCHAR packet (presence/shape only).

`severity_mode: "fail"` for missing entry / hash mismatch / snapshot mismatch.
**Judgment-assisted fields stay judgment-assisted:** `voice_fidelity`, `appraisal_fidelity`,
`pressure_behavior_fidelity`, `relationship_conduct_fidelity` are checked for *presence and
actionability* only — never auto-graded PASS/FAIL on artistic merit.

### 2.4 `stchar_bound_stent_reciprocity` (new validator)

**Files:**
- New: `tools/validators/src/structural/stchar-bound-stent-reciprocity.ts`
- Register in `tools/validators/src/public/registry.ts`

- Every non-background `STENT.bound_stchar_id` must appear in that STCHAR's `bound_stent_ids[]`.
- Every `STCHAR.bound_stent_ids[]` entry must resolve to an STENT whose `bound_stchar_id` points
  back. `severity_mode: "fail"`.

This validator reads STENT / STCHAR records directly. SPEC-60 (I3) adds a complementary world-index
`stchar_bound_stent` edge for retrieval/ranking; the two are independent (no dependency — SPEC-60
runs in parallel per `specs/IMPLEMENTATION-ORDER.md`) but formalize the same binding, and this
validator may later consume that edge.

### 2.5 `story_kernel_cast_bind_list_integrity` (new validator)

**Files:**
- New: `tools/validators/src/structural/story-kernel-cast-bind-list-integrity.ts`
- Register in `tools/validators/src/public/registry.ts`

Parse `STORY_KERNEL.md.cast_bind_list` and verify:
- Every non-background STENT in the kernel cast list has a resolving `stchar_id`.
- `source_char_id`, if present, is provenance only (matches the STCHAR's `source_char_id`).
- No `bound_char_id` appears (legacy field — must be absent). `severity_mode: "fail"`.

## 3. Test requirements (fixtures)

- `page_plan_stchar_packet_integrity`: missing packet (fail); inactive STCHAR (fail); hash mismatch
  (fail); speaker packet missing voice block (fail).
- `prose_receipt_stchar_integrity`: missing `char_authority_leak` (fail via 2.1); missing
  `profile_fidelity` entry (fail); hash mismatch (fail); active-snapshot mismatch (fail); allowed
  judgment-assisted drift values present and actionable (pass).
- `stchar_bound_stent_reciprocity`: matched pair (pass); one-way binding (fail both directions).
- `story_kernel_cast_bind_list_integrity`: complete list (pass); missing `stchar_id` (fail);
  `bound_char_id` present (fail).

## 4. FOUNDATIONS alignment

| Principle | Stance | Rationale |
|---|---|---|
| §4a Plan-Authority Boundary | aligns | Deterministic §16a packet checks ensure the page plan — the prose writer's sole authority — actually carries story-local STCHAR authority rather than record IDs the renderer must infer. |
| §6.1 Story-Local Character Authority | aligns | Reciprocity + cast_bind_list + packet validators keep STCHAR the binding operational authority and forbid `CHAR-*`/`bound_char_id` leakage. |
| §9 Prose Length Discipline | aligns | Validators check packet *presence, hashes, and shape* — never word counts or length budgets; packets have "no maximum length." |
| §5b Schema-Minimalism | aligns | Each new validator targets a field already load-bearing in the contract / prose-receipt schema; no new schema fields are introduced. |
| Judgment vs deterministic boundary (§Tooling Recommendation / HARD-GATE discipline) | aligns | Hashes, packet presence, active IDs, and required-field shape are deterministic; voice/appraisal/relationship fidelity remains judgment-assisted and is never auto-graded. |

## 5. Out of scope

- **`offstage_causal_packet` (reduced-scope §16a packet for causally-relevant offstage characters).**
  Proposed in the source audit (`reports/stchar-audit-first-iteration.md` §426) as a smaller packet
  for characters who are *not present* on the page but whose offstage activity causally bears on it —
  carrying appraisal / pressure / causal-relevance authority while omitting the voice block. Deferred:
  §16a has no offstage packet tier today (it offers only "emit a full packet" or "omit a
  background-only entity"), so a validator cannot check a marker no authoring surface produces.
  Introducing one is an authoring-contract extension — define the reduced packet shape, define its
  emit trigger, update `branching-story-bootstrap` and `branching-story-turn-cycle` phase-7 to author
  it, and possibly extend `prose-receipt.schema.json` — and belongs in its own spec, not this
  validators spec. SPEC-59 validates only the present-character packets §16a specifies today.
