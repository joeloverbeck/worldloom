# Repair Menu, Retcon Taxonomy, and Severity

The semantic glue between a Phase 4 finding and an emitted RP-NNNN card. Mechanism (anchor matching, write ordering) is not here — that lives in the engine and Hook 3.

## Severity Classification (Phase 5)

Each finding gets a severity 1–5 with a one-line rationale citing the specific drift mechanism. Bare severity numbers fail Phase 9.

| Severity | Name | Description |
|---|---|---|
| 1 | Cosmetic Mismatch | Minor wording / emphasis inconsistency. Surfaced in report body; no action recommended. |
| 2 | Soft Contradiction | Lore now feels underexplained. Surfaced only; no retcon card unless `severity_floor` was lowered. |
| 3 | Structural Tension | A domain SEC must be revised. Default `severity_floor` = 3 emits cards from here up. |
| 4 | World-Identity Risk | The world's core logic or feel is degrading. |
| 5 | Canon Break | Hard contradiction or catastrophic drift. |

Severity rationale must reference the specific drift mechanism: e.g., `"CF-0042's scope.geographic: local is treated as regional in SEC-GEO-007 ¶7 without diffusion history — structural tension, not yet world-identity risk, because no other CF depends on the regional reading"`. Bare "Severity 4" without rationale is treated as FAIL at Phase 9. Mirrors `canon-addition`'s discipline: PASS-without-rationale = FAIL.

## Repair Menu (Phase 7)

For each finding at or above `severity_floor`, select the **lightest viable repair**:

1. **Clarify Scope** — the fact was true only in one dynasty / region / species / century.
2. **Add Limiting Condition** — the power works only under specific conditions / materials / cost.
3. **Reclassify as Diegetic Belief** — reframe an accepted fact as propaganda, sectarian claim, or myth.
4. **Add Institutional Response** — a guild / church / office / taboo now explains why consequences were not previously visible.
5. **Insert Historical Change** — this became possible recently due to excavation / plague / reform / war.
6. **Narrow Adoption** — only one order / bloodline / biome / lineage can do this.
7. **Split the Fact** — separate one oversized canon claim into two smaller truths.
8. **Full De-Canonization** — use only when necessary; do not hide it; log it.

## Retcon Taxonomy

| Type | Meaning | Typical Repair |
|---|---|---|
| **A: Clarificatory** | Makes explicit what was already implicitly true | Clarify Scope (when no new constraint is added) |
| **B: Scope** | Limits what had been spoken too broadly | Narrow Adoption / Clarify Scope (with constraint) |
| **C: Perspective** | Reframes prior statements as incomplete, biased, or local | Reclassify as Diegetic Belief |
| **D: Cost** | Adds a missing burden or failure mode | Add Limiting Condition / Add Institutional Response |
| **E: Chronology** | Moves when something became true | Insert Historical Change |
| **F: Ontology** | Changes what the world fundamentally allows | Full De-Canonization (or Split the Fact when an ontology shift is forced) |

The mapping must be **consistent** — Phase 9 self-check fails any card where `retcon_type` does not match the chosen repair.

- **Split the Fact** typically produces a B+A pair (one narrower, one clarificatory), not a single card; emit two RP-NNNN cards.
- **Type D** can issue from either Add Limiting Condition (targeting the CF's `costs_and_limits`) or Add Institutional Response (targeting an institution-SEC patch). Misclassifying institution-routed D as "Type D on the CF directly" is a Phase 9 trigger — the difference shows in the card body's `required_world_updates`.

The `retcon_type` field is the semantic framing the Change Log Entry's `change_type` will carry when canon-addition later processes the card (Rule 6 — No Silent Retcons; field parity preserves the traceability chain).

## Retcon Policy Checklist (Phase 8)

Each card body carries a justified checklist. Bare booleans fail Phase 9 test 4.

- `no_silent_edit` — the resulting CH summary will name the change and cite the audit finding as origin.
- `replacement_noted` — if anything is deleted, what replaces it is named.
- `no_stealth_diegetic_rewrite` — world-level truth is not being changed via diegetic text alone.
- `no_net_contradiction_increase` — this retcon does not solve one contradiction by creating more.
- `world_identity_preserved` — this retcon does not weaken world identity for convenience.

If ANY entry would be `false`, the card cannot be emitted — the finding escalates to "requires user design decision" status, no RP id is consumed, and the audit report records the escalation explicitly.

## No-CF-Target Escalation

A finding whose repair is NOT a CF modification — ledger schema harmonization, cross-audit workflow recommendation, or any meta-level finding whose resolution lives outside CF records — also escalates. The retcon-card workflow requires a `target_cf_ids` that canon-addition can field-copy against; findings without that target are surfaced in the audit report body with explicit escalation framing and a list of options (typical: emit a harmonization CH via a future canon-addition; accept the non-CF drift as recorded state; manual patch with Rule 6 risk explicitly accepted). Phase 10 priority list ranks these alongside retcon-backed findings using the same sort key; the "retcon card" column reads "escalated" instead of an RP id.

## Update Priority List Sort Key (Phase 10)

`severity × domain_weight`. Reproducible: two audits against the same world-state with the same parameters must produce the same priority order.

| Domain class | Weight |
|---|---|
| Touches an invariant | 3.0 |
| Touches Mystery Reserve | 2.5 |
| Touches a core-pressure node | 2.0 |
| Touches ledger integrity | 1.5 |
| Single domain (default fallback) | 1.0 |

Ties break on `finding_id` ascending. Buckets:

- **now** — severity ≥ 4, OR `trigger_context: pre-publication` with severity ≥ 3
- **next-batch** — severity 3 (not pre-publication)
- **deferred** — severity 2 (surfaced only; no retcon card unless `severity_floor` was lowered)
- **cosmetic** — severity 1 (report body only, no action recommended)

## Inherited-Drift Discipline

If Phase 4 finds a pre-existing inconsistency inherited from prior CFs (a counting drift where the ledger's prose says "three" but names four items, naming drift, etc.), the skill surfaces the finding but does NOT recommend a silent-rewrite retcon. The retcon card (if emitted) explicitly names the drift as inherited-from-CH-NNNN, mirroring canon-addition's inherited-drift discipline. Silently correcting old prose via an audit-originated retcon violates Rule 6 even when factually right; the retcon must log the drift explicitly.
