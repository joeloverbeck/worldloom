# Phase 7: Canon Safety Check

Four sub-phases (three per-card, one batch-level) are independent checks with independent failure modes. All four must run; failure on any triggers Phase 7e Repair Sub-Pass.

## Phase 7a: Per-card Invariant Conformance

For every card, test its `canon_fact_statement`, implied distribution, and implied consequences against every `INV` record (ONT-N / CAU-N / DIS-N / SOC-N / AES-N) returned in the context packet. The `'other'` packet profile loads invariants by default; if any are missing, retrieve via `mcp__worldloom__search_nodes(node_type='invariant')` then `get_record`. Record each invariant id tested into the card's `canon_safety_check.invariants_respected`.

Fail triggers (→ Phase 7e):
- violates an ontological invariant (card introduces an ontology the world disallows)
- violates a causal invariant (implies cost-free capability in a cost-required world)
- violates a distribution invariant (implies elite/restricted ability would be universally available)
- violates a social invariant (contradicts a stable institutional rule)
- violates an aesthetic/thematic invariant (consequence profile undermines the tonal contract)

**Exception**: if a card explicitly declares `proposed_status: invariant_revision`, 7a records the invariant it proposes to revise and flags the card for `canon-addition`'s invariant-revision pathway — not a fail.

**Rule**: Never silently narrow or drop an invariant. A failed conformance goes to 7e for repair, not to a quiet downgrade.

**FOUNDATIONS cross-ref**: Invariants §full schema — `break_conditions` and `revision_difficulty` guide 7e.

## Phase 7b: Per-card Mystery Reserve Firewall

For every `M-NNNN` record returned in the context packet (and any additional M records implicated by a seed but not in the packet — retrieve via `mcp__worldloom__search_nodes(node_type='mystery_record')` then `get_record`), check whether its `what_is_unknown` or `disallowed_cheap_answers` blocks overlap the card's `canon_fact_statement`, `immediate_consequences`, or `longer_term_consequences`. Record every checked M-NNNN id into the card's `canon_safety_check.mystery_reserve_firewall` **regardless of overlap** — the firewall list is a proof-of-check audit trail. Document overlap status per entry in the card's Canon Safety Check Trace prose.

**Bulk firewall retrieval**: prefer `mcp__worldloom__get_firewall_content(world_slug)` for the audit's projection step — one call returns every M record's `disallowed_cheap_answers`, `common_interpretations`, `unknowns`, `status`, and `title`. Fall back to `mcp__worldloom__get_record('M-NNNN')` per id when full M-record context (`notes`, `extensions`, `modification_history`) is needed.

For cards of Proposal Family J (Mystery Seeding), the check is **inverted**: they MUST open a new bounded unknown. A Family J card that closes an existing MR entry, or merely re-frames one without adding a new bounded unknown, fails.

Fail triggers (→ 7e):
- card's `canon_fact_statement` answers an MR entry's `what_is_unknown`
- card's consequences entail an answer to `disallowed_cheap_answers`
- Family J card does not open a new bounded unknown

**Rule**: Empty firewall list when the world has any `M-NNNN` records = Phase 8 fail. Silent firewall means no firewall.

**FOUNDATIONS cross-ref**: Rule 7 (Preserve Mystery Deliberately) — this IS the Rule 7 audit point for proposal generation.

## Phase 7c: Per-card Distribution Discipline

For each card introducing a capability / artifact / technology / magic practice:
- MUST specify `recommended_scope` (geographic: local/regional/global/cosmic; temporal: ancient/historical/current/future/cyclical; social: restricted_group/public/elite/secret/rumor)
- MUST specify `why_not_universal` UNLESS `social: rumor` (rumors are inherently un-localized by design)
- if the card's capability overlaps an existing CF's `who_cannot_easily_do_it`, the card's `why_not_universal` MUST NOT contradict the CF's stabilizers

Consult capability CFs via `mcp__worldloom__search_nodes(node_type='canon_fact', filters={domain: ...})` then `get_record` for each candidate. Record each consulted CF id into `canon_safety_check.distribution_discipline.canon_facts_consulted`.

Fail triggers (→ 7e):
- capability card missing `recommended_scope`
- capability card missing `why_not_universal` (and not scoped to rumor)
- `why_not_universal` contradicts an existing CF's stabilizers

**Rule**: No proposal may silently imply universalization. Every capability card carries the discipline cues `canon-addition`'s Phase 1 Scope Detection expects.

**FOUNDATIONS cross-ref**: Rule 4 (No Globalization by Accident) — pre-adjudication hardening.

## Phase 7d: Batch-level Light Check

Cross-card collision checks:
- **Joint-closure**: no two cards' statements together close the same MR entry (neither alone would, but jointly they do)
- **Direct contradiction**: no two cards whose implications invalidate each other if both accepted
- **Diagnosis redundancy**: no two cards redundantly target the same diagnosis finding with overlapping mechanisms — prune the lower-scoring card

Record into the batch manifest's Phase 7d check trace: which card pairs were tested, which passed, which triggered 7e action.

Fail triggers (→ 7e):
- card A + card B jointly answer MR-XXXX's `what_is_unknown`
- card A and card B directly contradict
- two cards redundantly address the same diagnosis finding

**Rule**: The batch is a design choice set. Collisions hide behind per-card safety; 7d is where jointly-forbidden outcomes are caught.

## Phase 7e: Repair Sub-Pass

If any of 7a/7b/7c/7d fails, repair in order of least destructive:
1. **Narrow `recommended_scope`** (e.g., global → regional; public → restricted_group).
2. **Reclassify `proposed_status`** (hard_canon → soft_canon; soft_canon → contested_canon).
3. **Add a stabilizer** — rephrase `canon_fact_statement` to include a cost, bottleneck, or why-not-universal mechanism.
4. **Drop the card from the batch**. Record the drop in the batch manifest; if the card's Phase-6 slot becomes empty, loop back to Phase 3 to regenerate a replacement seed **for that slot only** (not the whole batch).
5. **Loop to Phase 3 with batch-wide regeneration** — only if drop + single-seed regeneration cannot recover.

Every repair applied is recorded in the relevant card's `notes` field as `Phase 7e repair: <check-id> — <repair-type> — <justification>`.

**Rule**: Repairs must preserve the generative intent of the diagnosis finding. A repair that strips a card of all narrative function is equivalent to a drop.

**FOUNDATIONS cross-ref**: Rule 3 (No Specialness Inflation) — stabilizers at 7e must name concrete mechanisms.
