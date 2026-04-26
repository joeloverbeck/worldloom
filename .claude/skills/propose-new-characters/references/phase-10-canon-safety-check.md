# Phase 10: Canon Safety Check

Four independent sub-phases with independent failure modes. All four MUST run per seed; failure on any triggers Phase 10e Repair Sub-Pass.

## Phase 10a: Per-seed Invariant Conformance

For every capability, belief, knowledge claim, material-reality fact, and perception trait in the seed, test against every invariant returned in the context packet (ONT-N / CAU-N / DIS-N / SOC-N / AES-N). The `'other'` packet profile loads invariants by default; if any are missing, retrieve via `mcp__worldloom__search_nodes(node_type='invariant')` then `get_record`. Record each invariant id into the seed's `canon_safety_check.invariants_respected`, pass or fail.

Fail triggers (→ Phase 10e):

- direct ontological invariant violation (the seed introduces an ontology the world disallows)
- direct causal invariant violation (cost-free capability in a cost-required world)
- direct distribution invariant violation (elite/restricted ability available to ordinary scope)
- direct social invariant violation (contradicts a stable institutional rule)
- direct aesthetic / thematic invariant violation (the seed's tonal posture undermines the contract)

**Rule**: Never silently narrow or drop an invariant. Failure → Phase 10e for repair, not a quiet downgrade.

**FOUNDATIONS cross-ref**: Invariants §full schema — `break_conditions` and `revision_difficulty` guide 10e repair paths.

## Phase 10b: Per-seed Mystery Reserve Firewall

For every `M-NNNN` record returned in the context packet (and any additional M records implicated by a seed but not in the packet — retrieve via `search_nodes(node_type='mystery_record')` then `get_record`), check whether its `what_is_unknown` overlaps the seed's `known_firsthand`, `known_by_rumor`, or `wrongly_believes`. Record every checked M-NNNN id into `canon_safety_check.mystery_reserve_firewall` regardless of overlap — the list is proof-of-check audit trail.

For each overlap: the seed MAY hold folk-belief or rumor about the mystery (MR entry's `common in-world interpretations` ARE permitted in `known_by_rumor` / `wrongly_believes`); the seed MUST NOT contain any `disallowed cheap answers` item in `known_firsthand` or `wrongly_believes`.

Fail triggers (→ 10e):

- `known_firsthand` answers an MR entry's unknown
- `wrongly_believes` matches a `disallowed cheap answer` (even as "they're wrong about it" — still commits the forbidden answer to canon-adjacent text)

**Rule**: Empty firewall audit list on a non-empty MR fails Phase 15 Test 5. Silent firewall = no firewall.

**FOUNDATIONS cross-ref**: Rule 7 (Preserve Mystery Deliberately) — this IS the Rule 7 audit point for character proposals.

## Phase 10c: Per-seed Distribution Discipline

For each capability implied by the seed, look up matching CFs via `mcp__worldloom__search_nodes(node_type='canon_fact', filters={domain: ...})` then `get_record` on each candidate. Record every consulted CF id into `canon_safety_check.distribution_discipline.canon_facts_consulted` regardless of outcome.

Tag the seed's `canon_assumption_flags.status` as one of:

- **canon-safe** — every implied capability fits a CF's `who_can_do_it` OR is ordinary-person scope with no CF opposition; every institutional embedding is derivable from loaded world state.
- **canon-edge** — the seed leans on interpretation / distribution assumptions / lightly implied lore; each leaning-point listed in `canon_assumption_flags.edge_assumptions`.
- **canon-requiring** — the seed implies a new fact / institution / capability / law / taboo / resource pattern / historical residue not present in current canon. Each implied new fact listed in `canon_assumption_flags.implied_new_facts` with a preferred route (`direct_to_canon_addition` / `first_through_propose_new_canon_facts`).

Fail triggers for 10c itself (NOT for canon-edge / canon-requiring tagging — those are routing metadata):

- seed has a capability in a CF's `who_cannot_easily_do_it` without a Phase-7-derived institutional embedding justifying the exception
- seed's claimed capability falls outside ordinary baseline (per `SEC-ELF-*` records via `search_nodes(node_type='section', filters={file_class: 'everyday-life'})`) without a Phase 7 `capability_path`

**Rule**: canon-edge and canon-requiring are NOT failures — they are routing metadata. The seed proceeds to Phase 11 with the tag attached. Failure at 10c means the seed's capability story is structurally broken, not that it implies new canon.

**FOUNDATIONS cross-ref**: Rule 4 (distribution discipline); Change Control Policy (`implied_new_facts` routing preserves the adjudication boundary — this skill never canonizes, only flags).

## Phase 10d: Batch-level Registry Non-Duplication + Joint-Closure

Run four batch-level checks across all seeds surviving 10a + 10b + 10c:

- **Registry non-duplication** — no seed's niche signature hard-duplicates any registry entry's niche signature.
- **Pairwise hard-duplication** — no two seeds in the batch hard-duplicate each other.
- **Joint mystery-closure** — no two seeds, taken together, close one MR entry that neither alone would.
- **Joint registry-duplication** — no two seeds, taken together, hard-duplicate one existing registry entry.

Record results into the batch manifest's Phase 10d trace table.

**Rule**: Joint-closure cases trigger Phase 10e on both seeds.

## Phase 10e: Repair Sub-Pass

On any 10a / b / c / d failure, attempt in order of least-destructive:

1. **Narrow the trait** — reduce capability scope, add bottlenecks, add costs.
2. **Reclassify knowledge** — move `known_firsthand` item to `known_by_rumor` or to "holds no strong view."
3. **Add a stabilizer** — state why the exception does not universalize.
4. **Add institutional embedding** — retroactively bind the trait to a specific institution or role surfaced by `search_nodes(node_type='section', filters={file_class: 'institutions'})` (plausible, not invented).
5. **Drop the seed from the batch** — slot becomes empty (Phase 13 handles).
6. **Loop to Phase 6 with flagged seed-slot to regenerate** — only if no repair preserves intent.

Each repair records into the card's `notes` field as `Phase 10e repair: <check-id> — <repair-type> — <justification>` AND into the batch manifest's Phase 10e Repair Log.

**FOUNDATIONS cross-ref**: Rule 3 (stabilizers must name concrete mechanisms — no hand-waves).
