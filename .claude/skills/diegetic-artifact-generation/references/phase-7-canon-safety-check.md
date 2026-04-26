# Phase 7: Canon Safety Check

Five independent sub-checks. All must run; failure on any triggers Phase 7f Repair Sub-Pass.

## Phase 7a: Invariant Conformance

For every claim in the artifact body and `claim_map`, and every asserted capability or knowledge of the Author, test against every INV record retrieved by the context packet (the `diegetic_artifact_generation` ranking profile loads all five invariant categories — ONT-N / CAU-N / DIS-N / SOC-N / AES-N — by default; if any are missing, fetch via `mcp__worldloom__search_nodes(node_type='invariant_record')`). Record each tested invariant's id into `world_consistency.invariants_respected`.

Fail triggers (send to Phase 7f):
- an objective claim (i.e., `canon_status: canonically_true` or `partially_true` with a direct-assertion mode) that breaks an ontological / causal / distribution / social / aesthetic invariant.
- an Author capability or knowledge claim that breaks an invariant.

**Permitted**: a claim tagged `canonically_false` or `contested` may describe invariant-violating content — a false folk theory is valid diegetic material because the world tracks it as a false belief. The invariant is broken when the narrator is *right and world-level-objective* about something the world forbids, not when the narrator is merely wrong.

**Also permitted (narrator-register performance)**: a narrator writing in a register a thematic invariant permits but discourages from mainstream application is NOT an invariant breach when tagged as performer-inflation. Worked example: AES-1 (heroism paid in coin and scars, not glory) explicitly permits the *existence* of romanticizing war-songs but marks them as sung mostly by those who never fought. An ambitious veteran writing romantic war-prose for audience-attraction is therefore exercising a permitted-but-discouraged register, not breaching AES-1 — provided each self-inflating claim in the body is tagged in `claim_map` as `canon_status: partially_true` with `narrator_belief: true` or `performed_belief`. The same pattern applies to other thematic invariants: a narrator mystifying an ordinary job in a low-magic world (AES-3-register performer-inflation of contested wonder), a narrator performing devotion in a performatively pious register (religious-invariant register performance), etc. Tag the inflation and the invariant holds; leave it untagged and Phase 7d.4 (no untagged intentional contradiction) fails.

## Phase 7b: Mystery Reserve Firewall

For every M-NNNN record retrieved by the context packet (or via `mcp__worldloom__search_nodes(node_type='mystery_record')` if any are missing), check overlap with the artifact body + `claim_map` + `epistemic_horizon.direct_knowledge` + `epistemic_horizon.inferred_knowledge` + `epistemic_horizon.wrongly_believed`. **Record every checked entry's id into `world_consistency.mystery_reserve_firewall`, regardless of overlap** — the firewall list is a proof-of-check audit trail.

For each entry where overlap IS found:
- the artifact MAY reference the mystery's `common in-world interpretations` (contested-canon folk theories the world itself tracks).
- the artifact MUST NOT assert, even as narrator error, any item from the mystery's `disallowed cheap answers`. A narrator holding a forbidden answer as `wrongly_believed` is still a commitment of the forbidden answer to text and fails this check.

Fail triggers (send to Phase 7f):
- artifact body contains a sentence that answers an MR entry's `what is unknown`.
- `claim_map` contains a claim whose content matches a `disallowed cheap answers` item, at any `narrator_belief` value.
- `epistemic_horizon.wrongly_believed` contains a `disallowed cheap answers` item.

## Phase 7c: Distribution/Scope Conformance

For every capability the artifact attributes to its Author, look up matching CFs via `mcp__worldloom__search_nodes(node_type='canon_fact', filters={domain: <capability domain>})` and `get_record(cf_id)` for each candidate. Apply the three-case rule:
- Author fits `distribution.who_can_do_it` → pass.
- Author fits `distribution.who_cannot_easily_do_it` → fail unless Phase 0b institutional embedding justifies the exception (recorded in `world_consistency.distribution_exceptions`).
- No matching CF → pass at ordinary-person scope, UNLESS the relevant SEC-ELF section places the capability outside the Author's class/region/species baseline without Phase 0b training path.

For every **world-fact claim** in the artifact body that carries a distribution block in the matching CF:
- the Author must have plausible access to that fact per Phase 1 `archive_access` / `rumor_access` — a claim's `source` tag must be consistent with the CF's distribution.
- an artifact cannot *assert* as `direct` / `canonically_true` a fact whose CF places the author outside `who_can_do_it`. The author may assert it as `secondhand` / `partially_true` / `contested` — distribution applies to *access*, not to *speaking about*.

Record each CF-id consulted into `world_consistency.canon_facts_consulted`.

## Phase 7d: Diegetic Safety Sub-Check

Four rules lifted from proposal Phase 7:

1. **No silent canon creation**: the artifact body must not introduce named entities, places, institutions, rituals, or facts absent from the loaded world files UNLESS they are bounded to the author's personal scope (e.g., a named grandmother in a letter; a local tavern nickname in a travelogue). Larger-scope silent introductions (a new god, a new polity, a new ritual-system, a new species cluster) fail this check.
2. **No restricted-knowledge leakage**: restricted vocabulary (e.g., guild-internal ward-inscription terms under CAU-3-style invariants) must not appear in the artifact body unless Phase 0b gave the Author institutional access to it.
3. **No local-as-global by accident**: a local custom stated in soft-canon scope must not be asserted as universal, UNLESS the Author would plausibly make that mistake given their mobility and epistemic horizon. If so, the overgeneralization is tagged `narrator_belief: true, canon_status: partially_true` in `claim_map` and permitted. An unmarked overgeneralization fails.
4. **No untagged intentional contradiction**: if the artifact deliberately contradicts current canon (e.g., propaganda asserting a king is divine in a no-divine-rulers world), the contradiction must be tagged in `claim_map` with `canon_status: canonically_false, narrator_belief: performed_belief` or `true`. An unmarked contradiction fails.

Fail triggers → Phase 7f. Each trigger names which of the four rules failed.

## Phase 7e: Truth Discipline Sub-Check

Two tests from proposal Phase 6:

1. **World-Truth Check**: does every claim with `mode: direct` and `canon_status: canonically_true` cite a `cf_id` resolvable via `mcp__worldloom__get_record`? If a direct-assertion claim is tagged `canonically_true` but cites no resolvable CF, it is either untagged canon-creation (routes to 7d.1) or a miscategorization (routes to re-tagging).
2. **Narrator-Truth Check**: given Author + date + place + audience, would this person plausibly *say* each claim the way it appears? A sentence's register, vocabulary, and rhetorical move must be reachable from the Author's Phase 0b profile.

Fail triggers → Phase 7f.

## Phase 7f: Repair Sub-Pass

If any of 7a/7b/7c/7d/7e fails, attempt repair in order of least destructive:
1. **Retag the claim** — move a `mode: direct` to `mode: implied` or `symbolic`; move `canonically_true` to `partially_true` or `contested`; move `narrator_belief: true` to `performed_belief` for propagandistic texts.
2. **Rescope the claim** — narrow a universal assertion to the author's local scope.
3. **Move the claim to another field** — a forbidden `direct_knowledge` item may move to `secondhand_knowledge` with a named source; a forbidden `wrongly_believed` item may be removed entirely.
4. **Remove the claim** — strip the sentence; record in `claim_map` as `prohibited_for_this_artifact` with the repair reason.
5. **Add institutional embedding to the Author** — if a capability exception is needed and a plausible institution exists, retroactively bind the Author to it. Must be plausible for Phase 0b, not invented from thin air.
6. **Loop back to Phase 0** — if no repair preserves the brief's intent without canon violation, abort to Phase 0 and ask the user to revise the brief.

Every repair applied is recorded in `notes` with the form `Phase 7f repair: <claim or field> — <repair type> — <justification>`.

**Rule**: Repairs preserve the brief's `communicative_purpose` and `desired_relation_to_truth` wherever possible. A repair that strips the artifact's rhetorical function is equivalent to a loop-to-Phase-0.
