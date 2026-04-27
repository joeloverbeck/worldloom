# Triage — SPEC-04 Animalia Grandfathering (224 findings)

**Date**: 2026-04-25
**Source**: `worlds/animalia/audits/validation-grandfathering.yaml` baseline (10 GF entries; 224 individual findings, all currently emitted as `info` via grandfathering policy)
**Outcome**: 1 new umbrella spec (`SPEC-14`) + 3 collateral amendments + 7 implementation tickets
**Goal**: Reduce validations at the source where legitimate; align validator/engine/skill contracts to prevent recurrence.

---

## Source-of-truth pointers (do not duplicate content here — reference by path)

- Umbrella spec: `archive/specs/SPEC-14-pa-contract-and-vocabulary-reconciliation.md`
- Collateral amendments: `archive/specs/SPEC-06-skill-rewrite-patterns.md`, `archive/specs/SPEC-08-migration-and-phasing.md`, `docs/FOUNDATIONS.md`, `archive/specs/IMPLEMENTATION-ORDER-2026-04-27.md`
- Tickets: see SPEC-14 §Deliverables for the canonical decomposition

---

## Finding distribution

| GF | Count | % | Validator | Root cause (one-line) |
|---|---|---|---|---|
| GF-0004 | 140 | 62.5% | `record_schema_compliance.required` | PA files lack canonical `## Discovery`; CHAR/DA frontmatter type drift |
| GF-0010 | 45 | 20.1% | `touched_by_cf_completeness.sec_to_cf_miss` | Sections cite CFs whose `required_world_updates` doesn't include the section's file_class |
| GF-0006 | 17 | 7.6% | `rule2.non_canonical_domain` | CFs use `history`/`memory`/`geography` — not in canonical domain enum |
| GF-0008 | 8 | 3.6% | `rule7.invalid_future_resolution_safety` | Mysteries use `zero`/`medium-low`/`LOW`/`very` — validator only allows `low\|medium\|high` |
| GF-0001 | 7 | 3.1% | `adjudication_discovery_fields.non_canonical` | PA-0009/PA-0014 added narrative metadata fields to Discovery |
| GF-0003 | 2 | 0.9% | `record_schema_compliance.additionalProperties` | DA-0002 frontmatter has fields not in schema |
| GF-0005 | 2 | 0.9% | `record_schema_compliance.type` | CHAR-0002 `major_local_pressures[0]` is non-string |
| GF-0002 | 1 | 0.4% | `modification_history_retrofit.missing_entry` | CF-0003 notes mention CH-0002 but `modification_history[]` lacks the entry |
| GF-0007 | 1 | 0.4% | `rule6.dangling_modification_history` | CF-0020 references CH-0004; CH-0004 doesn't affect CF-0020 |
| GF-0009 | 1 | 0.4% | `rule7.missing_disallowed_cheap_answers` | M-5 has empty `disallowed_cheap_answers` |

---

## Three-way drift on PA file shape (the dominant deeper problem)

The bulk of GF-0004 (~136 of 140) is **structural disagreement across three layers**, not just legacy authoring drift. Without reconciliation, every new adjudication produced by the SPEC-06 pipeline reproduces the same failure pattern.

| Layer | What it expects on a PA file |
|---|---|
| Patch engine (`tools/patch-engine/src/ops/append-adjudication-record.ts`) | `---\n{YAML frontmatter}\n---\n{body_markdown}`; field `id`; free-form `verdict` |
| Validator schema (`tools/validators/src/schemas/adjudication-discovery.schema.json`) | Plain markdown body with `## Discovery` heading + bullet list; field `pa_id`; enum `verdict` (UPPERCASE) |
| Existing animalia PA files | 15 of 17 have neither; 2 have `## Discovery` with bold-emphasized non-canonical field names |

The schema's title comment even says: *"PA records are markdown with canonical discovery fields, not YAML frontmatter."* — directly contradicting what the engine writes today.

Engine test (`tools/patch-engine/tests/ops/append-adjudication-record.test.ts:13`) uses payload `{ id: "PA-0099", verdict: "accepted", … }`, which fails `record_schema_compliance` for two independent reasons (`pa_id` not `id`; `accepted` not `ACCEPT_*`) plus 6 missing-required-field errors because the canonical fields are in frontmatter but the validator scans the body for `## Discovery`.

---

## Decisions (A–H) — settled in this triage

| # | Topic | Decision |
|---|---|---|
| A | PA file shape | YAML frontmatter + free-form markdown body (consistent with characters / DAs) |
| B | Field naming | `id` → `pa_id`; verdict UPPERCASE per enum; `originating_skill` added to schema as optional |
| C | `open_questions_touched` | Tighten to `OQ-NNNN[]` IDs; canon-addition allocates new OQs at submit-time |
| D | `required_world_updates` ownership | Engine fail-fast: `append_touched_by_cf` rejects unless target CF lists section's file_class; skill must include `update_record_field` op when extending |
| E | Canonical vocabulary | New `mcp__worldloom__get_canonical_vocabulary(class)` MCP tool; single-source-of-truth refactor (validator + MCP read same enum module) |
| F | Domain enum | Add `geography` only; re-tag `history`/`memory` → `memory_and_myth`; update FOUNDATIONS Rule 2 list |
| G | Mystery future_resolution_safety | Couple to `status`: `forbidden` → `none`, `active`/`passive` → `low`/`medium`/`high`; cross-field validator rule |
| H | Animalia PA migration | Rewrite all 17 PAs in-place to frontmatter form; reconcile OQ topic-strings to OQ-NNNN |

---

## Classification per the user's three-bucket framing

### (1) Validation code/schema issues (legitimately worth changing the code)

- **Adjudication contract drift** (covers ~140 findings). Resolved by SPEC-14: validator reads YAML frontmatter for adjudications; engine emits `pa_id` + canonical verdict enum + `originating_skill` (optional); engine writes go through `append_adjudication_record` per the new contract. Decision references: A, B.
- **Open-questions citation format** (latent — would surface as fails on next animalia validate after PA reformat lifts `additionalProperties` blockers). Resolved by SPEC-14: `open_questions_touched` tightened to `OQ-NNNN[]`. Decision reference: C.
- **Canonical domain enum gap** (covers ~3 findings — `geography` use). Resolved by SPEC-14 + FOUNDATIONS amendment: `geography` added to canonical domain list. Decision reference: F.
- **Mystery `future_resolution_safety` semantic gap** (covers 8 findings). Resolved by SPEC-14: status-coupled cross-field rule (`forbidden` → `none`; `active`/`passive` → `low`/`medium`/`high`). Decision reference: G.
- **Bidirectional CF↔SEC consistency drift surface** (covers 45 findings). Resolved by SPEC-14: engine `append_touched_by_cf` fails fast unless CF lists section's file_class. Prevents recurrence. Decision reference: D.
- **Vocabulary reachability** (preventive — eliminates a class of latent fails). Resolved by SPEC-14: `mcp__worldloom__get_canonical_vocabulary` MCP tool. Decision reference: E.

### (2) Animalia world-content fixes (legitimate, fix at source)

- **17 PA files** rewritten to frontmatter form; OQ topic-strings reconciled to OQ-NNNN (some matched to existing 60 OQs; some allocated as new OQs). Decision reference: H. — closes ~136 findings.
- **17 CFs** with `history`/`memory` re-tagged to `memory_and_myth`; 1 CF (`CF-0027`) keeps `geography` once added to enum. — closes 17 findings (GF-0006).
- **8 Mystery records** normalized: `zero`-on-forbidden → `none`; `zero`/`medium-low`/`LOW`/`very`-on-non-forbidden → `low`. — closes 8 findings (GF-0008).
- **~10 CF records** extended with missing `required_world_updates` entries (from the GF-0010 inventory). — closes 45 findings.
- **PA-0009 / PA-0014 narrative metadata** moved out of `## Discovery` into a sibling `## Synthesis` block (or absorbed into body prose). — closes 7 findings (GF-0001).
- **DA-0002, CHAR-0002, M-5, CF-0003, CF-0020** one-off integrity fixes. — closes 6 findings (GF-0003 + 0005 + 0009 + 0002 + 0007).

### (3) Deeper problems (workflow / pipeline alignment)

- **Engine/validator/skill three-way drift** on adjudication shape. Resolved structurally by SPEC-14 (single contract, enforced by validator post-write and engine pre-flight where applicable).
- **Bidirectional CF↔SEC pointer fragility.** Resolved structurally by SPEC-14's engine fail-fast on `append_touched_by_cf` (decision D).
- **Vocabulary lives in code-only.** Resolved by SPEC-14's MCP surface + single-source-of-truth refactor (decision E).
- **Animalia bootstrap predates SPEC-04 contract.** Resolved by H's full migration; future canon-addition runs go through engine and pass validator end-to-end per SPEC-06 amendment's new acceptance criterion.

---

## Work plan (3 tiers)

**Tier 1 — Contract changes** (this triage's accompanying writes)

1. This triage doc.
2. New `archive/specs/SPEC-14-pa-contract-and-vocabulary-reconciliation.md`.
3. Collateral amendment to `specs/SPEC-06-skill-rewrite-patterns.md`.
4. Collateral amendment to `specs/SPEC-08-migration-and-phasing.md`.
5. Collateral amendment to `docs/FOUNDATIONS.md`.
6. Update to `archive/specs/IMPLEMENTATION-ORDER-2026-04-27.md`.

**Tier 2 — Implementation tickets** (decomposed from SPEC-14)

7. Validator framework update (adjudication frontmatter parser; status-coupled mystery rule; `geography` domain; `originating_skill` schema field).
8. Patch engine update (field rename + verdict enum; bidirectional `append_touched_by_cf`; OQ-allocation pre-flight in adjudication path).
9. Canonical-vocabulary MCP tool (`get_canonical_vocabulary`) + shared-enum-module refactor.

**Tier 3 — Animalia world fix + skill alignment**

10. Animalia PA migration (17 PAs; OQ reconciliation; Synthesis-block move).
11. Animalia CF cleanup (domain re-tags; mystery enum normalizations; `required_world_updates` extensions).
12. Animalia one-off fixes (CHAR-0002, DA-0002, M-5, CF-0003, CF-0020).
13. canon-addition skill rewrite acceptance (SPEC-06's new acceptance criterion holds end-to-end).

After Tiers 1–3 land: `worlds/animalia/audits/validation-grandfathering.yaml` empties to zero entries; `world-validate animalia` exits clean.

---

## Dismissed alternatives

- **Loosen validator regexes / accept legacy PA shapes.** Considered; rejected — would freeze the engine/validator drift into long-term policy, and the 17 legacy PAs would still need OQ reconciliation to satisfy any tightened-OQ contract.
- **Permanent grandfathering as the resolution path.** Considered (option H.2); rejected — leaves 224 `info` findings as permanent noise, doesn't address recurrence, and contradicts the goal of "reduce validations at the source."
- **Add `history` to canonical domain enum.** Considered (option F.3); rejected — `history` duplicates the `temporal: ancient/historical` scope axis on CFs; `memory_and_myth` captures the contested-account semantic that real authoring intends.
- **Tighten mystery enum to flat `low|medium|high` only.** Considered (option G.1); rejected — collapses the load-bearing distinction between forbidden mysteries (M-5's whole architecture) and rare-but-allowed mysteries.

---

## Follow-up work not actioned in this triage

- **`canon-addition` skill prose audit** for any remaining drift between its emitted PA template (when not going through the engine) and the SPEC-14 contract — folded into Tier 3 ticket 13.
- **`continuity-audit` skill alignment** — the audit-record shape isn't in this triage's scope; if a future triage finds drift, follow the same SPEC-14-style umbrella pattern.
- **OQ allocation discipline** for non-`canon-addition` skills (e.g., `propose-new-canon-facts`) — out of scope; follow up if a future audit shows OQ-citation drift in proposals.
