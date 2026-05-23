# Triage — `reports/stchar-distillation-rework.md`

**Date:** 2026-05-23
**Source report:** `reports/stchar-distillation-rework.md` (ChatGPT-Pro proposal, 820 lines, §§1–12)
**Triage authority:** User-pre-authorized in the request ("If changes aligned with `docs/FOUNDATIONS.md` are warranted, create specs in `specs/*` with the specifications. If more than one spec is created, create `specs/IMPLEMENTATION-ORDER.md`.")
**Spec partitioning chosen at triage:** Two specs.
**Migration severity chosen at triage:** Fail-everywhere on landing (more aggressive than the report's warn-legacy / fail-touched recommendation).

## Resulting deliverables

- [`specs/SPEC-74-stchar-distillation-boundary-hardening.md`](../../specs/SPEC-74-stchar-distillation-boundary-hardening.md) — distillation-boundary work (skills + templates + 1 schema field + 1 body subsection + 3 new validators + page-packet validator extension + fail-everywhere migration for red-bunny STCHAR-{1,2,3}).
- [`specs/SPEC-75-branch-aware-stchar-supersession.md`](../../specs/SPEC-75-branch-aware-stchar-supersession.md) — branch-ancestry traversal primitive + reachability rule replacement in `stchar_supersession_integrity`.
- [`specs/IMPLEMENTATION-ORDER.md`](../../specs/IMPLEMENTATION-ORDER.md) — recommended order SPEC-74 → SPEC-75; soft dependency only.

## Lead — reframing corrections discovered during verification

The source report's author worked from a manifest stale enough to predate SPEC-71, SPEC-72, and SPEC-73 — all merged within the four days preceding the triage. Three corrections materially reshape the deliverable:

1. **All STCHAR tamper-hash references are stale.** SPEC-71 ("strip-stchar-tamper-hashes", merged 2026-05-23) removed `profile_hash`, `voice_block_hash`, `page_packet_hash`, and `source_char_hash` from the schema, §16a packet contract, skills, INDEX renderer, CLI, and patch-engine ops. The schema declares `additionalProperties: false`; the new `forbidden_stchar_tamper_hash_fields` validator structurally prevents reintroduction. The report's §6.3 / §6.5 / §6.12 verbatim text references these hashes — they are dropped from SPEC-74's adapted version of those proposals, and their non-hash substance is preserved in alternative form.
2. **§6.12 sub-items (1) and (2) already landed via SPEC-73.** "Required because: multi-token parsing" and "voice block required when speaker/viewpoint in composite reason" are implemented at `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts:215, 169-184, 222-229`. The report's `Required because:` parsing proposal is duplicate work.
3. **`specs/` directory was absent before this triage.** All 73 prior specs are archived under `archive/specs/`. The triage created `specs/` and `specs/IMPLEMENTATION-ORDER.md` from scratch.

## Per-item verdict

Item identifiers follow the source report's §6.N numbering.

### ACCEPT (verbatim or near-verbatim — landed in SPEC-74)

| # | Item | Landing site in SPEC-74 |
|---|---|---|
| §6.1a | Tighten `regeneration_reason` argument description (constrained reason list, drop "or other reason") | §4.1 |
| §6.1b | Add "Durable-Authority Boundary" section to `story-character-profile/SKILL.md` after Modes | §4.1 |
| §6.1c | Rewrite `Page-Plan Voice Block` characterization from "compact projection" to "stable, context-free reusable voice-authority seed" | §4.1 |
| §6.1d | Add `Stable Source Material Inventory` authoring requirement under `## Source Distillation` | §4.1 |
| §6.1e | Replace `regenerate` mode description with constrained 5-reason list | §4.1 |
| §6.2 | Add Phase 1b Distillation Boundary Ledger + tighten Phase 2 / Phase 4-5 / Phase 8 in `branching-story-bootstrap/SKILL.md` | §4.2 |
| §6.4 | Add STCHAR-prose clarification + `regeneration_reason_class` field rule to `_shared-templates/story-record-schemas.md` | §4.4 |
| §6.7 | Add `regeneration_reason_class` schema property + conditional rule to `story-character-authority.schema.json` | §4.7 |
| §6.8 | Add `Stable Source Material Inventory` subsection to `stchar-body-integrity.ts` required-subsection list | §4.8 |
| §6.9 | Add `stchar_temporal_reference_boundary` validator | §4.9 (with modification — see ACCEPT-WITH-MODIFICATION below) |
| §6.10 | Add `stchar_regeneration_reason_integrity` validator | §4.10 (with modification — see below) |
| §6.11 | Add `stchar_source_material_inventory_integrity` validator | §4.11 |

### ACCEPT-WITH-MODIFICATION

| # | Item | Modification scope | Landing site |
|---|---|---|---|
| §6.3 | Rewrite `_shared-templates/story-state-contract.md` §16a (projection-vs-authority + Current-state grounding records field) | Drop all `profile_hash` / `voice_block_hash` / `page_packet_hash` citations (refuted by SPEC-71). The non-hash substance survives. | SPEC-74 §4.3 |
| §6.5 | Rewrite `branching-story-turn-cycle/references/phase-7-page-plan.md` §16a paragraph | Same hash-drop modification. | SPEC-74 §4.5 |
| §6.6 | Add 3 new findings (`stchar_temporal_authority_contamination`, `stchar_semantic_loss_risk`, `stchar_regeneration_reason_invalid`) to health-audit Phase 2m | Report misnames `Phase 2n source_drift`; current is `Phase 2j compatibility_drift`. Implementing tickets must use the correct current phase names. Migration severity escalated from warn-legacy/fail-touched to fail-everywhere per user choice at triage. | SPEC-74 §4.6 |
| §6.9 | `stchar_temporal_reference_boundary` validator | Reuse the existing `OPERATIONAL_TARGET_SECTIONS` constant from `stchar_source_fact_coverage` (verified at `stchar-source-fact-coverage.ts:23-35` — 11 H2s) rather than re-defining the section list. Extract to a shared module if both validators import it. | SPEC-74 §4.9 |
| §6.10 | `stchar_regeneration_reason_integrity` validator | The report's rule "When `regeneration_reason_class: source_world_char_material_change`, `source_char_hash` must be non-null and current source-drift evidence must be available" is partially refuted — `source_char_hash` no longer exists (SPEC-71). Modified rule requires `source_char_id` non-null and delegates source-drift evidence to the active source-drift mechanism (SPEC-71's compat layer), not a hash check. | SPEC-74 §4.10 |
| §6.12 (3) | Page-packet validator extension: cited current-state record IDs must resolve in bundle + be active in `PG.state_snapshot.active_records[]` (own-page SE/PG exception) | Accept as written. Independent of SPEC-73 work. Diagnostic id: `stale_current_state_reference`. | SPEC-74 §4.12 |
| §6.12 (4) | Page-packet validator extension: if packet says `Current-state grounding records: none`, packet text must not cite current-state IDs elsewhere | Accept; depends on §6.3 field convention being adopted in §16a packets. Diagnostic id: `grounding_records_none_with_citations`. | SPEC-74 §4.12 |

### REJECT — already-resolved

| # | Item | Resolution source |
|---|---|---|
| §6.12 (1) | Parse `Required because:` as multi-token, not raw string | Already-resolved by SPEC-73. Verified at `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts:215, 222-229`. |
| §6.12 (2) | Voice block required when speaker/viewpoint in composite reason | Already-resolved by SPEC-73. Verified at `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts:169-184` (set-intersection with `VOICE_REQUIRING_LABELS = {speaker, viewpoint, voice_shapes_page}`). |

### REJECT — refuted by verification

| # | Item | Refutation source |
|---|---|---|
| §6.12 (5) | "Cited active state records must not require an STCHAR hash change" | Refuted by SPEC-71 — there is no STCHAR hash to be stable across pages. The post-SPEC-71 packet has no hash fields. |
| §6.3 / §6.5 / §6.12 verbatim hash citations | All `profile_hash` / `voice_block_hash` / `page_packet_hash` strings in proposed text | Refuted by SPEC-71. Re-introducing them would reverse a recently-merged decision; the schema's `additionalProperties: false` plus the `forbidden_stchar_tamper_hash_fields` validator structurally prevent it. |

### DEFER

| # | Item | Deferred-to |
|---|---|---|
| §6.13 | Branch-aware STCHAR supersession (replace `stchar_supersession_integrity` ordinal-only reachability with branch-ancestry-aware reachability) | [`specs/SPEC-75-branch-aware-stchar-supersession.md`](../../specs/SPEC-75-branch-aware-stchar-supersession.md). Verified the current code IS ordinal-only at `tools/validators/src/structural/stchar-supersession-integrity.ts:33-42`. Spec-split rationale: orthogonal mechanism (branch-ancestry traversal vs body-subsection / record-class-id parsing), distinct test surface (multi-page multi-branch fixtures), source-report blast-radius ranking Medium-high vs SPEC-74's Low / Medium. |

### Out-of-report findings surfaced during verification

| Finding | Action |
|---|---|
| Report §6.6 names the source-drift phase as "Phase 2n"; current code names it `Phase 2j compatibility_drift` | Implementing tickets for SPEC-74 §4.6 must use the correct current phase name. Verification source: codebase grep returned `Phase 2j` not `2n`. |
| Report §6.7 enum includes `null` as an enum value alongside string types | Acceptable but the JSON Schema `if/then` conditional handles the null-allowed-when-not-regenerated case without needing `null` in the inner enum. Implementing ticket should verify which form the existing schema codebase prefers. |
| Active STCHAR fixtures on `main`: only `worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-{1,2,3}.md` exist | This bounds the migration scope. SPEC-74 §5 enumerates these 3 files explicitly for the pre-landing remediation pass. |
| `MEMORY.md` entry `project_red_bunny_hash_drift.md` (ENGINESYNC-005) records that the patch-engine `file_versions` hash basis mismatch blocks the first post-bootstrap patch to any story bundle | SPEC-74 §5 documents this as a prerequisite to verify before any engine-routed STCHAR remediation. The implementing ticket must check whether SPEC-71 / SPEC-72 incidentally cleared the mismatch via a probe patch before assuming it remains active. |

## FOUNDATIONS alignment

The bundle aligns with FOUNDATIONS §Story Bundles §5b (Schema-Minimalism — `regeneration_reason_class` is load-bearing), §5c (Present Causal State, Not Narrative Shape — STCHAR free of "today" markers), §6.1 (Story-Local Character Authority — durable persona vs active state split), §6a (Belief vs Fact — current-state facts route to BEL not STCHAR), §6b (Information / Observer Firewall — STCHAR is not an epistemic access route), §Tooling Recommendation (no operating on prose alone — all new validators are structural), and Rule 6 (No Silent Retcons — `regeneration_reason_class` is itself a retcon-audit field). SPEC-75 additionally aligns with Rule 4 (No Globalization by Accident — branch-ancestry-aware reachability is the explicit fix for an accidental ordinal-only globalization).

## Closeout

This triage closes evaluation of `reports/stchar-distillation-rework.md`. Both specs are AUTHORED 2026-05-23 and await ticket decomposition.
