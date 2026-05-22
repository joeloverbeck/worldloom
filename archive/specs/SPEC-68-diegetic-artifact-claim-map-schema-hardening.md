# SPEC-68 — Diegetic-Artifact Claim-Map & Loose-Object Schema Hardening

**Status:** COMPLETED
**Date:** 2026-05-22
**Classification:** canon-related (tightens the schema consumed by `record_schema_compliance` over the DA realized-hybrid surface; mechanizes existing skill discipline; no canon-semantics change)
**Source:** `archive/reports/world-system-consolidation-second-iteration.md` Fault 3 + Recommendation 3 — **corrected** at triage against `main` (the report's proposed `DAC-*` schema is misaligned with the real artifact and is NOT adopted; see §Out of Scope)
**Depends on:** none — independent of SPEC-69
**Companion:** `docs/triage/2026-05-22-world-system-consolidation-second-iteration-triage.md`

**Implementation note (2026-05-22, SPEC68DIEARTCLA-001):** `claim_map.items` and the `canonically_true ⇒ cf_id` / `mystery_adjacent ⇒ mr_id` schema rules landed in `tools/validators/src/schemas/diegetic-artifact-frontmatter.schema.json`. The first ticket also normalized checked-in validator/animalia DA fixtures that the package suite treats as current positive records. The remaining loose-object typing and live DA conformance regression stay with SPEC68DIEARTCLA-002.

**Implementation note (2026-05-22, SPEC68DIEARTCLA-002):** The remaining DA loose-object schema hardening landed for `genre_conventions`, `author_profile`, `epistemic_horizon`, `world_consistency`, and `source_basis`, including the promised `world_consistency` id regexes and a visible DA markdown conformance regression. The active checkout exposed three checked-in DA markdown records and no active `worlds/<slug>/diegetic-artifacts/*.md` files; checked-in positive fixtures were truthed to the current template, while private/live world repair remains out of scope.

## 1. Context

`diegetic-artifact-generation` produces a richly-disciplined `claim_map`: every in-world claim
is Phase-3-classified (`canon_status`, `narrator_belief`, `source`, `contradiction_risk`, `mode`),
and Phase 7/8 enforce a 12-test canon-safety regime plus the Rule 7 Mystery-Reserve firewall — but
**only in skill prose and the body-trace audit section.** The frontmatter schema that
`record_schema_compliance` actually runs (`tools/validators/src/schemas/diegetic-artifact-frontmatter.schema.json`)
leaves the highest-risk surfaces untyped:

| Field | Current schema (verified `diegetic-artifact-frontmatter.schema.json`) | Authoritative shape (`.claude/skills/diegetic-artifact-generation/templates/diegetic-artifact.md`) |
|---|---|---|
| `claim_map` | `{ "type": "array" }` — **no `items`** (line 62) | per-item: `claim`, `canon_status`, `narrator_belief`, `source`, `contradiction_risk`, `mode`, `adaptive_behavior_preserved_under_wrong_ontology`, `cf_id`, `mr_id`, `repair_trace` (lines 80–90) |
| `author_profile` | `{ "type": "object" }` (line 60) | 15 named fields, two nullable (lines 55–70) |
| `epistemic_horizon` | `{ "type": "object" }` (line 61) | 6 named arrays (lines 72–78) |
| `world_consistency` | `{ "type": "object" }` (line 65) | `canon_facts_consulted[]` `^CF-[0-9]+$`, `invariants_respected[]` `^(ONT\|CAU\|DIS\|SOC\|AES)-[0-9]+$`, `mystery_reserve_firewall[]` `^M-[0-9]+$`, `distribution_exceptions[]` (lines 95–99) |
| `source_basis` | `{ "type": "object" }` (line 66) | `world_slug`, `brief_path`, `character_path`, `generated_date`, `user_approved` (lines 101–106) |

The skill's own comments already assert that `record_schema_compliance` enforces the `world_consistency`
id-format regex ("`record_schema_compliance` rejects mixed-format entries", template line 96) — but the
loose `{ "type": "object" }` definition means **it does not**. The discipline is documented as mechanical
but is in fact prose-only. This is the report's strongest finding, restated against reality.

**Already-defended adjacent surface:** `world_relation` (corroborates/contests/conceals/mythologizes/ritualizes,
all `^CF-[0-9]+$`) **is** already strictly typed (lines 40–49) — the report missed this. And VALDA-002
(`mined-proposal-card.schema.json`) already enforces `diegetic_to_world_laundering` checks on the
**downstream** mined-proposal surface. This spec hardens the **upstream DA surface itself** as
defense-in-depth and to make the prose-asserted enforcement real.

**Key simplification vs the report:** `record_schema_compliance` already compiles every record-class
schema through an `Ajv2020` instance (`tools/validators/src/structural/record-schema-compliance.ts:29`
— `new Ajv2020({ allErrors: true, strict: true, formats: { date: true } })`) and applies
`diegetic-artifact-frontmatter` to DA records (`utils.ts` `RECORD_TYPE_TO_SCHEMA`), so cross-field
laundering rules (`canonically_true ⇒ cf_id required`) belong **in the schema** via draft-2020-12
`if/then`. Conditional validation is already exercised in-tree (`character-proposal-card.schema.json`,
`pressure-event-sidecar-proposal.schema.json`, `section.schema.json`), so no new validator is needed —
the report's proposed separate `da_claim_authority` / `da_mystery_claim_firewall` validators are
unnecessary; ajv enforcement at the existing validator is sufficient and lower-cost. **Implementer note:**
the ajv instance runs `strict: true`, so the added `if/then` blocks and tightened object schemas must be
strict-clean (no unknown keywords, well-formed conditionals) or `ajv.compile` throws at load.

## 2. Changes

Primary schema file: `tools/validators/src/schemas/diegetic-artifact-frontmatter.schema.json`. Implementing tickets may also update validator tests and checked-in fixture records required to prove the tightened schema.

### 2.1 Type `claim_map.items`

Replace `"claim_map": { "type": "array" }` with a typed item schema (`additionalProperties: false`,
`minItems: 1`) using the **template's actual vocabulary**:

- `claim`: string, `minLength: 1` (required)
- `canon_status`: enum `[canonically_true, canonically_false, partially_true, contested, mystery_adjacent, prohibited_for_this_artifact]` (required)
- `narrator_belief`: enum `[true, false, uncertain, performed_belief]` (required)
- `source`: enum `[witnessed, learned_from_authority, inherited_tradition, common_rumor, contested_scholarship, impossible_for_narrator_to_verify]` (required)
- `contradiction_risk`: enum `[none, soft, hard]` (required)
- `mode`: enum `[direct, implied, symbolic]` (required)
- `adaptive_behavior_preserved_under_wrong_ontology`: boolean (optional)
- `cf_id`: `^CF-[0-9]+$` or null
- `mr_id`: `^M-[0-9]+$` or null
- `repair_trace`: object or null (kept permissive — free-form repair record)

> The enum values above are normative-from-template; the implementing ticket MUST re-read
> `templates/diegetic-artifact.md` at implementation time and reconcile any drift (the template is the
> authoritative schema per `SKILL.md:103`). Do not import the report's `claim_kind` /
> `truth_relation_to_canon` / `canonization_allowed` enums — they do not exist in this pipeline.

### 2.2 Cross-field anti-laundering rules (the corrected Fault-3 enforcement)

Add JSON-Schema `if/then` on `claim_map.items` so ajv (via `record_schema_compliance`) rejects the
laundering shapes the skill forbids in prose:

- **`canon_status: canonically_true` ⇒ `cf_id` required and non-null** (must match `^CF-[0-9]+$`).
  A claim cannot assert it is canon-true without naming the accepted CF it rests on. (This is the report's
  "corroborates with empty cited_cf_ids" check, expressed in the real vocabulary.)
- **`canon_status: mystery_adjacent` ⇒ `mr_id` required and non-null** (`^M-[0-9]+$`).

CF/MR id *resolvability* (the id points to an existing record) remains a skill-Phase-7c/judgment concern,
not a schema concern — schema enforces presence + format only.

### 2.3 Type the four loose objects

Tighten each to the template shape. `world_consistency` carries the id-format regex the comments already
promise; `author_profile` and `epistemic_horizon` enumerate their named fields. For `author_profile` and
`epistemic_horizon`, set `additionalProperties: false` and mark the two nullable `author_profile` fields
(`sex_or_gender`, `trauma_history_if_relevant`) as `string|null`. `source_basis` keeps `user_approved`
as a boolean (no rename — see §Out of Scope). `genre_conventions` may also be tightened to
`{ honors: [], breaks: [] }` as a low-cost adjacency.

## 3. Edge cases / migration

- **Existing DA files** (e.g., under `worlds/erotica-world/diegetic-artifacts/`) must conform. The
  implementing ticket MUST enumerate on-disk DA files, run the candidate schema against them, and report
  any non-conformance as a compatibility finding — consistent with the SPEC-64 "report incompatibility
  with exact path/field + manual repair, do not auto-migrate" posture. DAs authored to the current
  template should already conform; deviations are repaired by hand, not by schema relaxation.
- **`repair_trace`** is deliberately left permissive (object|null) — its internal shape is a free-form
  Phase-7f record with no downstream machine consumer.
- The root object is already `additionalProperties: false`, so no new top-level fields are introduced.

## 4. Out of Scope (rejected / deferred at triage — see companion)

- The report's invented `claim_map` schema (`claim_id: ^DAC-`, `claim_kind: rumor|propaganda|myth|lie`,
  `truth_relation_to_canon`, `source_of_claim`, `canonization_allowed`). It is misaligned with the actual
  artifact vocabulary; adopting it would break `diegetic-artifact-generation` and `record_schema_compliance`.
- A separate `da_claim_authority` / `da_mystery_claim_firewall` validator — redundant with ajv-via-
  `record_schema_compliance` (§1) and with the skill's Phase 7b firewall.
- `resolution_intent` enum / cross-surface mystery validator (report Fault 5 / Rec 4) — explicitly dropped
  as YAGNI in `archive/tickets/SPEC62FOUANDDOC-003.md` §Out of Scope; honored, not reversed.
- `user_approved` → semantic-rename taxonomy (report Fault 1 / Rec 1) — already rejected at SPEC-61
  triage; not re-litigated here.

## 5. FOUNDATIONS Alignment

| Principle | Stance | Rationale |
|---|---|---|
| §Contested Canon ("Claims present in-world but not world-level truth", line 64) | aligns | Typed `canon_status` + the `canonically_true ⇒ cf_id` rule mechanize the in-world-claim/world-truth boundary at the schema layer. |
| §Artifact Authority and Maturity (line 101) | aligns | DA stays a realized canon-reading hybrid; nothing here grants its claims canon authority — it makes the non-authority machine-checkable. |
| Rule 7 (Preserve Mystery Deliberately) | aligns | `mystery_adjacent ⇒ mr_id` and the typed `mystery_reserve_firewall[]` regex back the skill's Phase 7b firewall with schema enforcement. |
| Rule 6 (No Silent Retcons) | aligns | Strict `world_consistency.canon_facts_consulted[]` typing preserves the audit trail the schema previously left unenforced. |
| §Canonical Storage Layer (engine-routed hybrid surfaces) | N/A | DA remains skill-prescribed engine-routed; this spec changes only the validating schema, not the write path. |

## 6. Testing strategy

- Schema-unit fixtures under the validators test suite: a conformant DA frontmatter passes; each of
  (untyped claim item, `canonically_true` without `cf_id`, `mystery_adjacent` without `mr_id`,
  malformed `world_consistency` id, unknown `canon_status` enum) fails with a precise ajv path.
- Regression: run `record_schema_compliance` over every existing on-disk DA file; all must pass or be
  reported for hand-repair (no green-by-relaxation).
- `npm run build` + `npm test` in `tools/validators` green before completion.

## Outcome

Completed: 2026-05-22.

SPEC-68 landed through `archive/tickets/SPEC68DIEARTCLA-001.md` and `archive/tickets/SPEC68DIEARTCLA-002.md`. The DA frontmatter schema now types `claim_map.items`, enforces `canonically_true ⇒ cf_id` and `mystery_adjacent ⇒ mr_id`, and tightens `genre_conventions`, `author_profile`, `epistemic_horizon`, `world_consistency`, and `source_basis` to the live diegetic-artifact template shape. The implementation stayed inside the existing `record_schema_compliance` Ajv path; no separate DA validator was added.

Checked-in DA positive fixtures were truthed to the current template where the stricter schema exposed old drift. The final conformance regression covered the three visible checked-in DA markdown records in this worktree; no active `worlds/<slug>/diegetic-artifacts/*.md` files were present, and no private/live world data was edited.

Verification:

- `node --test dist/tests/structural/record-schema-compliance-diegetic-artifact.test.js` from `tools/validators` — PASS, 7/7 subtests.
- `node --test dist/tests/structural/record-schema-compliance.test.js dist/tests/structural/record-schema-compliance-diegetic-artifact.test.js` from `tools/validators` — PASS, 41/41 subtests.
- `npm test` from `tools/validators` — PASS, 861/861 tests.
