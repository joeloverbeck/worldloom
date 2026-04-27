# Phase 7: Canon Safety Check

The three sub-phases are independent checks with independent failure modes. All three must be run; failure on any triggers Phase 7d Repair Sub-Pass.

## Phase 7a: Invariant Conformance

For every capability, belief, knowledge claim, material-reality fact, and perception trait generated in Phases 1-6, test against every INV record retrieved by the context packet (the `character_generation` packet loads all five invariant categories — ONT-N / CAU-N / DIS-N / SOC-N / AES-N — by default, with full parsed `record` bodies in `governing_world_context.nodes`). For each invariant tested, record the result into `world_consistency.invariants_respected` as the invariant id.

Fail triggers (send to Phase 7d):
- direct violation of an ontological invariant (e.g., character "remembers a past life" in a no-resurrection world)
- violation of a causal invariant (e.g., character uses magic without any cost in a magic-always-exacts-a-cost world)
- violation of a distribution invariant (e.g., character has literacy in an elite-literacy world without an institutional embedding that grants it)
- violation of a social invariant (e.g., character holds a role their species/class is forbidden from in this world)
- violation of an aesthetic/thematic invariant (e.g., character's voice undermines the tonal contract — "clean heroism" in a heroism-is-costly world)

**Rule**: Never silently narrow or drop an invariant. A failed conformance goes to Phase 7d for repair, not to a quiet downgrade.

**FOUNDATIONS cross-ref**: Invariants §full schema — every invariant's `break conditions` and `revision difficulty` fields guide whether Phase 7d can repair or must loop to Phase 0.

## Phase 7b: Mystery Reserve Firewall

For every M-NNNN record retrieved by the context packet (the `character_generation` packet loads all Mystery Reserve records' Phase 7b firewall fields in `governing_world_context.nodes`), check whether its `what_is_unknown` block overlaps the character's `known_firsthand`, `known_by_rumor`, or `wrongly_believes` fields from Phase 3. **Record every checked entry's id into `world_consistency.mystery_reserve_firewall`, regardless of whether overlap was found** — the firewall list is a proof-of-check audit trail, not an overlap register. Document the overlap-or-no-overlap status per entry in the Canon Safety Check Trace prose.

For each entry where overlap IS found:

- the character MAY hold a folk-belief or rumor *about* the mystery (recorded in `known_by_rumor` or `wrongly_believes`). **Permitted content**: the M record's `common_in_world_interpretations` ARE allowed in these fields — they are contested-canon folk theories the world itself tracks. Only items in the M record's `disallowed_cheap_answers` list are forbidden.
- the character MUST NOT "know" the mystery's forbidden answer (i.e., no entry in `known_firsthand` or `wrongly_believes` may match any item in the M record's `disallowed_cheap_answers` list).

Fail triggers (send to Phase 7d):
- character's `known_firsthand` contains content that answers an M record's `what_is_unknown`
- character's `wrongly_believes` contains a statement matching any `disallowed_cheap_answers` item (even as "they are wrong about it" — this still commits the forbidden answer to canon-adjacent text)

**Rule**: The firewall list is the audit trail. An empty `world_consistency.mystery_reserve_firewall` when the world has any M records fails Phase 8 Test 5 — silent firewall means no firewall. Recording every checked entry (including no-overlap entries, with that status noted in the trace prose) is the only correct behavior.

**FOUNDATIONS cross-ref**: Rule 7 (Preserve Mystery Deliberately) — this sub-phase IS the Rule 7 audit point for canon-reading artifacts.

## Phase 7c: Distribution/Scope Conformance

For every capability listed in the character's `capabilities` block, look up matching Canon Fact Records via `mcp__worldloom__search_nodes(node_type='canon_fact', filters={domain: <capability domain>})` filtered to capability / technology / magic practice / artifact CFs and `get_record(cf_id)` for each candidate. For each match:

- if the character belongs to a group named in `distribution.who_can_do_it`, pass.
- if the character belongs to a group named in `distribution.who_cannot_easily_do_it`, fail unless Phase 2 institutional embedding explicitly justifies the exception (e.g., "daughter of a smuggler initiated into the craft at age eight, against her clan's taboo"). Exceptions are recorded in `world_consistency.distribution_exceptions` with the form `<CF-id>: <justification citing Phase 2 embedding>`.
- if no CF covers the capability, the capability is at ordinary-person scope and passes, UNLESS the relevant SEC-ELF section establishes that ordinary people in this region/class/species do not have this capability — in which case, fail and route to Phase 7d.

Fail triggers (send to Phase 7d):
- character has a capability listed in a CF's `who_cannot_easily_do_it` without a justified exception.
- character has a capability that the relevant SEC-ELF section places outside their class/region/species baseline without a stated training or initiation path in Phase 5.
- distribution exception exists but does not cite a Phase 2 institutional embedding (hand-wave exception).

**Rule**: No capability may silently universalize. Every exception is traceable to a specific institutional embedding. Record each CF-id consulted at this sub-phase into `world_consistency.canon_facts_consulted` (continuing the accumulation begun at Phase 5); the list combines Phase 5 and Phase 7c consultations.

**FOUNDATIONS cross-ref**: Rule 4 (No Globalization by Accident) — this sub-phase IS the Rule 4 hard gate for characters.

## Phase 7d: Repair Sub-Pass

If any of 7a/7b/7c fails, attempt repair in order of least destructive:
1. **Narrow the trait** — reduce capability scope, add bottlenecks, add costs.
2. **Reclassify the knowledge** — move a `known_firsthand` item to `known_by_rumor`, or move a `wrongly_believes` item to "holds no strong view."
3. **Add a stabilizer** — state why the exception does not universalize (secrecy, taboo, rare training, bodily cost, short window of access).
4. **Add institutional embedding** — retroactively bind the trait to a specific SEC-INS entity that justifies the exception (must be plausible for Phase 2 relations, not invented from thin air).
5. **Loop back to Phase 0** — if no repair preserves the user's intent without violating canon, abort to Phase 0 and ask the user to revise the brief. The failure reason is surfaced verbatim.

Every repair applied is recorded in the dossier's `notes` field with the form `Phase 7d repair: <trait> — <repair type> — <justification>`.

**Rule**: Repairs must preserve the user's Phase 0 narrative intent wherever possible. A repair that strips the character of their dramatic function is equivalent to a loop-to-Phase-0.

**FOUNDATIONS cross-ref**: Rule 3 (No Specialness Inflation) — every applied stabilizer must name a concrete mechanism; "they just don't use it much" fails.
