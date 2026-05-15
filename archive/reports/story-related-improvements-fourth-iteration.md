## **Verdict**

Your current architecture is fundamentally right. I would **not** replace it with an act model, a quest graph, a global drama manager, or a pure LLM improvisor. The strongest outside research points in the same direction your overhaul already chose: maintain a causal world/story state, track knowledge and social consequences explicitly, let reusable local story moves become eligible from state, and use hard coherence gates instead of global plot-shape steering.

The changes I recommend are **contract hardening and validation improvements**, not a redesign. The biggest production-risk gaps are small but important: a root-page input inconsistency, an ambiguous belief predicate, incomplete promotion-source coverage for status/relationship outcomes, and insufficient machine evidence for cumulative mystery narrowing.

---

## **Why the current direction is strong**

Interactive narrative research frames the core problem as allowing the user to influence the story while preserving meaningful consequences. Riedl and Bulitko describe interactive narrative as letting the user’s actions have meaningful story consequences and even alter story direction or outcome; they also highlight the classic failure case where a user kills the antagonist early and the system must still answer “what happens next?” rather than collapse.

Your current contract answers that better than most systems: every player action routes through one of six outcomes, including impossible actions and canon-promotion holds, and silent rejection is forbidden. Every action produces an `SE` plus a page plan, and accepted choices must have consequences.

The external research also warns against the thing you explicitly rejected. Classical “drama manager” systems are typically omniscient controllers that monitor the world and intervene to drive the story toward a quality model or preferred future trajectory. That is useful for some games, but it is exactly the mechanism that can suppress valid user choices to preserve shape. Your FOUNDATIONS doc already bans this: selection is local salience ranking gated by hard coherence checks, not a global “optimal story” search.

Your `SLT` commitment blocks also map well to storylet / quality-based narrative practice. Storylets are modular chunks unlocked by world-state qualities; saliency systems choose applicable content from a pool based on state rather than fixed flow order. Your commitment blocks are explicitly causal moves with preconditions, beats, effects, exits, and saliency, not acts, arcs, or mini-stories.

The social-state side is also a major strength. Versu’s simulationist model uses autonomous agents and “social practices” to coordinate behavior without controlling individual agents, and Comme il Faut / Prom Week show that reusable social-state machinery is how you avoid exponential authoring burden while keeping social consequences playable. Your split between `SF` truth and `BEL` belief, plus the observer firewall, expected witnesses, and social-state validation, is exactly the right foundation.

Finally, the LLM-era research reinforces your plan/prose split. Recent LLM storylet work argues for combining structural storylets with generation, while noting that pure LLM systems struggle with structurelessness and lack of pushback; another 2025 system paper says LLMs are not natively planners and need external verification for coherence and executability. Your plan-authority boundary is therefore one of the best decisions in the current design: story state is authoritative at `PG` commit, prose is a renderable receipt, and prose attach validates without mutating page state.

---

# **Proposal**

## **P0 — Fix before production stories**

### **1. Fix the `PG-1` input legality contradiction**

The shared `PG` schema says exactly one of `choice_id` and `manual_action_text` is non-null, but the root page is necessarily a `story_start` event with neither a chosen choice nor a write-in. The schema already has `parent_page_id: null only for PG-1`, so the root exception should be made explicit in the contract and validator.

**Change the invariant to:**

input:

 choice_id: CHC-<integer> | null

 manual_action_text: null | string

 resolved_event_id: SE-<integer>*

# Input legality:

# - If resolved_event.event_kind == story_start:

#     choice_id == null

#     manual_action_text == null

#     parent_page_id == null

# - Otherwise:

#     exactly one of choice_id / manual_action_text is non-null

This is not cosmetic. Without it, either bootstrap violates the contract or turn-cycle input legality gets diluted.

Also remove stale bootstrap wording that implies `branch_path` is omitted from the PG schema. `branch_path` is now canonical and validator-consumed.

---

### **2. Remove ambiguity from the belief predicate**

The predicate DSL currently describes `belief(holder, claim, mode?, confidence_floor?)`, while other execution guidance refers to exact active `BEL` records. This creates a dangerous ambiguity: is the predicate matching free text, a `BEL` id, or both? The current system forbids free-form predicate prose, so this needs to be crisp.

**Replace the single predicate with two explicit forms:**

belief_record(holder, BEL-<integer>, mode?, confidence_floor?)

Use this for hard execution eligibility and actor-specific plan grounding.

any_belief(alias, holder_role?, mode?, truth_relation?, visibility?)

Keep this for author-pool / branch-prefix prefiltering, as currently designed.

I would **not** add a broad `belief_claim(holder, string, ...)` predicate yet. Text matching belief claims will become a validator nightmare. If you later need claim-pattern matching, make it a separate, deliberately weaker predicate with exact allowed matching semantics.

---

### **3. Expand promotion-claim source records to include `STSTAT` and `SREL`**

Right now `SE.promotion_claims[].source_record` allows `SF | BEL | DA | STENT`, but your promotion skill supports `character_outcome` and `relationship_or_institutional_outcome`. Character outcomes often live in `STSTAT`, not `STENT`; relationship outcomes live in `SREL`. The closeout skill already acknowledges `SREL` and `STENT`/`BEL`/`DA` supersessions, but status-linked outcomes are underrepresented.

**Change:**

promotion_claims:

 - source_record: SF-<integer> | BEL-<integer> | DA-<integer> | STENT-<integer>

**To:**

promotion_claims:

 - source_record: SF-<integer> | BEL-<integer> | DA-<integer> | STENT-<integer> | STSTAT-<integer> | SREL-<integer>

Then update `story-fact-promotion-to-canon` so:

character_outcome:

 required source records: STENT + relevant STSTAT supersession chain

relationship_or_institutional_outcome:

 required source records: SREL + supporting SE/BEL chain

This avoids laundering status changes through identity records.

---

### **4. Add evidence pointers to mystery-claim snapshots**

Your Mystery Accretion rule is excellent: repeated “clue_added” or “narrowed” entries can collectively collapse a Mystery Reserve entry even if no page states the answer outright. But the current `PG.state_snapshot.unresolved_mystery_claims[]` records status and authority without naming the evidence that produced the narrowing. That makes the health audit rely too much on prose/plans or semantic reconstruction.

Add a minimal, load-bearing field:

unresolved_mystery_claims:

 - mystery_id: M-<integer>

   authority: apparent | branch_local_counterfactual | canon_candidate

   status: preserved | clue_added | narrowed | apparent_resolution | held_for_promotion

   evidence_records: [SF-<integer> | BEL-<integer> | DA-<integer> | SE-<integer>]

Rule:

evidence_records is required and non-empty when status is:

 clue_added | narrowed | apparent_resolution | held_for_promotion

evidence_records may be [] when status is:

 preserved

This gives `branching-story-health-audit` a deterministic chain to inspect when checking cumulative narrowing.

---

### **5. Clarify `SLT.effects.create` semantics**

The current commitment-block authoring skill says `effects.create/supersede/close` may be empty when contextual at runtime, but the batch-diversity check requires literal `effects` entries for belief/relationship coverage. That will pressure authors into fake effects just to satisfy the linter.

Do **not** add bulky new effect-model fields. Instead, change the diversity check to accept social-state coverage through any of these:

- effects.create/supersede/close references BEL/SREL or bound:<alias>

- exit_options[].likely_effects references BEL/SREL or bound:<alias>

- preconditions include any_belief(...) or any_relationship_axis(...)

Then keep the existing rule: actual runtime consequences remain authoritative in `SE.state_delta`.

This preserves schema minimalism while preventing author-pool blocks from pretending they can pre-author records that only exist at runtime.

---

## **P1 — High-value improvements**

### **6. Add motivation grounding for character actions**

Narrative planning research stresses that stories need both causal progression and character intentionality; characters should appear to act for reasons, not because the system needed a beat.

You already have the fields needed. Add a turn-cycle additional check and a health-audit finding:

motivation_grounding:

 Every non-system character action must be grounded in at least one active:

 STINT, BEL, OBL, CNSQ, THR, SREL, or immediate physical affordance.

For example, an NPC choosing to betray someone should be grounded in a `BEL`, `SREL`, `OBL`, `STINT`, or `CNSQ`, not merely in a convenient `SLT`.

No schema change is required at first. Record the rationale in `SE.world_logic_rationale`; the health audit can replay from existing active records.

---

### **7. Add `choice_set_noncollapse`**

Choice Consequence Integrity currently catches cosmetic choices after selection. But the menu itself can still collapse into fake variety: three differently worded choices that all point to the same commitment, same records, and same pressure.

Add a page-plan / turn-cycle validation check:

choice_set_noncollapse:

 On a non-terminal page with more than one CHC, at least two choices must differ materially in:

 - target_or_action_families, or

 - grounded_in.records, or

 - associated_commitment_block, or

 - likely_state_pressure.

Allow rhetorical variants only when the parent page plan explicitly marks them rhetorical before selection, matching the existing consequence-integrity rule.

This protects agency at the choice surface, not just after resolution.

---

### **8. Add a storylet-pool linter**

Commitment-block authoring already checks coverage targets such as recovery, belief repair, movement/evasion, consequence resolution, investigation, disclosure, opposition, and negotiation. Make that into a reusable linter mode, either inside `commitment-block-authoring` or `branching-story-health-audit`.

It should flag:

dead_storylet:

 No reachable page state can satisfy the hard predicates.

dominated_storylet:

 Another SLT covers the same preconditions, move_family, and exits with higher saliency.

generic_storylet:

 Hard preconditions are too weak to prevent bland repetition.

missing_debt_coverage:

 Open high-urgency OBL/CNSQ/THR/STINT has no eligible SLT.

cooldown_trap:

 Cooldown + pool size can leave a branch with no continuation.

branch_scope_leak:

 Global author-pool SLT references branch-local records.

This is directly aligned with your current hard-gate discipline and avoids global drama management.

---

### **9. Track saliency rationale without adding a new schema field yet**

Storylet and saliency systems work because selection is explainable from state. Your current architecture ranks eligible blocks by local relevance, urgency, target coverage, and diversity, which is right. But if a high-urgency debt keeps being outranked, the system needs to surface why.

Do not add a new field yet. Instead require `SE.world_logic_rationale` to include:

selected_slt:

 why this block was selected over other eligible high-salience blocks

Then let health audit flag:

saliency_starvation:

 High-urgency OBL/CNSQ/THR/STINT remains open while lower-urgency blocks are repeatedly selected without rationale.

If this becomes too hard to audit from prose rationale, then add a structured `SE.commitment.selection_rationale` later.

---

### **10. Add “story sifting” as audit/recap, not control**

Emergent narrative research distinguishes generating events from recognizing the story within a larger event chronicle. Felt et al. describe “story sifting” as identifying compelling narrative from a broader stream of simulated events.

Add a `branching-story-health-audit` mode:

mode: story_sift

It should produce a read-only branch recap:

significant_chains:

 - source_events: [SE-3, SE-5, SE-8]

   involved_records: [BEL-4, SREL-6, OBL-2]

   emergent_pattern: betrayal_discovered_and_debt_escalated

   open_followups: [OBL-7, THR-3]

This must never steer future pages. It is for author comprehension, recap generation, and QA. No act labels. No climax detection. No “this should happen next.”

---

### **11. Add property-based branch simulation tests**

Your system is complex enough that examples will not catch the real failures. Add tests that generate synthetic story states and random player actions, then dry-run turn-cycle logic and assert invariants:

- no sibling branch records enter active_records

- every accepted action has a consequence

- every unavailable actor’s obligations are closed/transferred

- observer firewall blocks unavailable knowledge

- forbidden mysteries are never resolved

- PG hashes remain replayable

- every non-terminal page has continuation capacity

This is the engineering counterpart to the current hard gates. It also matches the LLM-era lesson that generative systems need external coherence/executability verification.

---

## **P2 — Optional refinements**

### **12. Make `SREL.direction` structured or regex-enforced**

Current `SREL.direction` is a free string. That is fragile for validators. If you can afford the schema change now, use:

direction:

 kind: directed | bidirectional

 from: STENT-<integer> | null

 to: STENT-<integer> | null

If you want to preserve minimalism, keep the field but enforce a regex:

"STENT-<integer> -> STENT-<integer>" | "bidirectional"

My preference: use the structured form now, before production stories exist.

---

### **13. Defer a separate “social practice” class**

Versu’s “social practices” are tempting: recurring social situations that coordinate possible actions without micromanaging agents. But your `SLT + THR + OBL + BEL + SREL` stack already covers most of this. A new class would add authoring burden before you have evidence it is needed.

Do not add `STPRAC` yet. If playtests reveal recurring situations like trials, dinners, rituals, interrogations, or negotiations need persistent local rules, first try modeling them as:

THR = active situation

SLT = eligible moves inside the situation

BEL/SREL/OBL/CNSQ = social consequences

STLOC/STOBJ/DA = material anchors

Only add a new class after that fails.

---

### **14. Defer `STINT.target_records`**

A structured target list on intentions would help motivation checks:

target_records: [STENT | STLOC | STOBJ | DA | OBL | CNSQ | THR | SREL]

But it is another field every intention must carry. Current `STINT` already has holder, intent, urgency, and expiry.

I would defer this unless motivation grounding proves too fuzzy.

---

# **Changes I explicitly do not recommend**

Do **not** add act structure, midpoint state, climax state, “rising action” obligations, or dramatic-unit fields. Your FOUNDATIONS doc is right: act structure encodes future dramatic obligations, while your engine needs present causal obligations.

Do **not** add a global drama manager. The research version of a drama manager is an omniscient controller optimizing future trajectories; that is the back door to railroading. Your local salience + hard gates approach is better for your goals.

Do **not** make rendered prose authoritative. The plan-authority boundary is one of the cleanest parts of the design. Keep prose as receipt, not state.

Do **not** replace the state model with a pure LLM “narrator agent.” Current LLM interactive narrative work is useful, but the consistent lesson is that LLM generation needs structural constraints and verification.

---

# **Recommended implementation order**

1. Patch `story-state-contract.md` for the `PG-1` input exception, belief predicate split, promotion source expansion, and mystery evidence pointers.  
2. Update `branching-story-bootstrap`, `branching-story-turn-cycle`, `branching-story-health-audit`, `commitment-block-authoring`, `story-fact-promotion-to-canon`, and `story-promotion-closeout` to match those contract changes.  
3. Add validators for:  
   * root-page input legality,  
   * exact belief predicates,  
   * promotion source enum,  
   * mystery-claim evidence records,  
   * choice-set noncollapse,  
   * motivation grounding,  
   * SLT pool linting.  
4. Add property-based dry-run tests around branch isolation, action routing, observer firewall, death/incapacity reconciliation, and continuation capacity.  
5. Before writing production stories, run one red-team story where the player:  
   * kills or disables a major actor early,  
   * refuses the premise,  
   * abandons the current thread,  
   * lies publicly,  
   * acts on unavailable knowledge,  
   * attempts an impossible action,  
   * pushes toward a forbidden mystery resolution.

If that red-team branch remains coherent without silent rejection or hidden plot steering, the architecture is ready for production stories.

