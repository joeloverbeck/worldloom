# Phase 3-4: Mirror Facts, Initial Beliefs, and Opening DA Triage

Covers original §Phase 3 (Mirror load-bearing world facts) and §Phase 4 (Create initial belief state, including STENT/STSTAT seeding and DA triage at opening).

## Phase 3: Mirror load-bearing world facts

Create `SF` records for facts the opening state actually depends on. Each mirrored `SF` follows shared contract §4.5.3: `id`, `story_id`, `created_at_page`, `supersedes`, `statement`, `authority`, and `derived_from`. For ordinary mirrored world facts, set `authority: branch_local` and keep `derived_from` as a non-empty list containing the parent `CF-<integer>` ids. Use `authority: branch_local_counterfactual` only for deliberate branch-local contradictions that must not be laundered into world canon, and `authority: canon_candidate` only when the opening state intentionally creates a held-for-promotion claim. Record epistemic asymmetry with `BEL` records, not fact-side knowledge fields.

Do NOT mirror broad world background. The mirror exists so the turn-cycle does not re-query the world index for facts already known to constrain opening choices.

## Phase 4: Create initial belief state

Consume the Distillation Boundary Ledger before root `PG` and page-plan authoring. Every opening-current fact identified as temporal state must be represented in the appropriate initial record class, omitted as genuinely non-load-bearing, or rejected as unsupported; it must not be smuggled into STCHAR as durable authority.

For every cast member, create only the `BEL` records that affect immediate choice logic at the opening (per shared contract §4.1 schema, FOUNDATIONS §Story Bundles §6a Belief vs. Fact):

- What they want (use `STINT` if active goal; `BEL` if felt belief about possibility).
- What they think is happening.
- What they know or misunderstand about other cast members.
- What they can plausibly perceive at the opening (grounded in `state_snapshot.visible_affordances`).

Use `BEL` (not `SF`) for false beliefs, suspicions, rumors, lies, and private assumptions. `BEL.truth_relation` and `BEL.visibility` set per shared contract §4.1 — these are consumed by the social-state firewall per FOUNDATIONS §Story Bundles §6a.

For every cast-member `STENT`, set `role_in_story` as a list from the closed shared contract §4.4b values: `viewpoint`, `player_proxy`, `primary_actor`, `opposing_actor`, `allied_actor`, `authority`, `dependent`, `witness`, `information_source`, `pressure_source`, `social_bridge`, `background`. Use multiple values only when both are operationally true. Set `bound_stchar_id` to the cast member's validated `STCHAR-*` for every non-background cast member; only a cast member whose role list is exactly `[background]` may use `bound_stchar_id: null`.

For every active cast-member `STENT`, create exactly one initial `STSTAT` record carrying the opening life / agency / location state per shared contract §4.5.13. Use `life: alive` unless the premise explicitly starts with a dead or unknown-status entity; choose `agency` from the contract enum; set `location` to the opening `STLOC` when known, otherwise `unknown` / `concealed` / `offstage` as appropriate. `PG-1.state_snapshot.entity_status` is derived from these active `STSTAT` records; do not author an independent status block.

Ledger routing in this phase:

- injury / fatigue / visibility / current location -> STSTAT, STOBJ, STLOC, PG.state_snapshot
- distrust / suspicion / misunderstanding / knowledge / lie / witness access -> BEL
- page-local "seen as" presentation and current voice modulation -> root page-plan §16a, grounded in active records

If a fact is not durable enough for STCHAR and no state record is created for it, it must not appear in the root page plan as an unexplained assertion.

**DA triage at opening.** Scan the user premise, opening scene, starting inventory, faction briefings, rumors, public notices, private letters, requested clues, maps, recordings, inscriptions, object-with-text, and existing world-level DA references. For each candidate, apply the triage rubric and decision matrix at `.claude/skills/_shared-templates/da-authoring-reference.md` §Triage and §Decision matrix. Create a DA only when content / authorship / circulation / truth relation has persistent state value. For every bootstrap DA, satisfy the patch obligations at `.claude/skills/_shared-templates/da-authoring-reference.md` §Patch obligations: allocate via `story_da_ids`; create via `append_story_diegetic_artifact_record`; include it in `SE-1.state_delta.create[]` and `PG-1.state_snapshot.active_records.DA[]`; create BEL for initial readers with an appropriate `basis.access_route`; create STOBJ when physical custody, location, damage, or sealing matters; and satisfy `expected_witness_coverage` for `public` / `factional` circulation with same-event indirect-route BEL propagation or an `SE-1.non_propagation_facts[]` entry such as `{reason: event_leaves_no_accessible_trace, group: direct_witnesses, records: [DA-<N>]}`. Shared contract §5a.3 is the trigger/discharge authority: public/factional DA creation activates the validator, and direct-witness coverage requires public-coverage `BEL.visibility` (`public`, `shared`, `factional`, `rumored`) or a legal non-propagation fact; private BEL records do not discharge the validator.
