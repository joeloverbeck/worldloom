# Mid-Story State Introduction — Research Brief

**Audience**: ChatGPT-Pro deep-research mode (has repository access; this brief is also self-contained for cold-context reading).
**Author**: Claude Code (Opus 4.7 1M-context) on behalf of the worldloom maintainer.
**Date**: 2026-05-18.
**Status**: Research request — output will inform a follow-up worldloom spec and possible skill amendments.

---

## 1. Executive summary

Worldloom is a prose-and-YAML branching-story pipeline whose causal engine commits structured story-bundle records (events, pages, beliefs, threads, relationships, etc.) at the moment a page plan is approved. A recent merge (SPEC-42, completed 2026-05-18) added three new record classes — **CLK (pressure clocks), STSEC (story secrets), STQ (story questions / open setups)** — as additive present-causal state primitives.

Two concerns have surfaced that this research brief is meant to settle in collaboration with narrative theory and comparative art:

1. **Mid-story introduction gap.** The bootstrap skill can SEED CLK / STSEC / STQ at root, but the turn-cycle skill that advances the story by one causal tick only exposes **lifecycle transitions on existing records** (tick a clock, reveal a secret, answer a question). It cannot author a NEW CLK / STSEC / STQ mid-story. The same problem extends to THR (threads), SREL (relationships), and STENT (entities): turn-cycle's documented op set only describes supersession, not fresh introduction. The patch-engine ops for fresh creation EXIST — they are simply not invoked by the workflow. Authors who need a new pressure to enter mid-story (a faction arrives; a lie is told for the first time; a new dramatic question opens; a stranger walks on) have no documented authoring path. The question the maintainer wants answered: **under what conditions, drawn from narrative theory and observed dramatic practice, SHOULD each of these structures be introducible mid-story, and how can the engine recognize those conditions without drifting into narrative-shape pre-planning?**

2. **Validator coverage + playability migration.** A production branching story (`worlds/erotica-world/stories/red-bunny`) pre-dates SPEC-42 and SPEC-38; its `_source/` is missing the `clocks/`, `secrets/`, `story-questions/`, and `artifacts/` subdirectories, and its `PG.state_snapshot.active_records` enumerations do not include CLK / STSEC / STQ keys. SPEC-42 explicitly guarantees backwards compatibility (bundles without these classes pass all validators), so the bundle is technically valid. The deeper question: is there a workflow for **non-retcon compatibility repair** that lets an existing bundle gain new optional structure without formal canon amendment, while honoring the append-only / supersession discipline and routing through the patch engine?

**The non-negotiable constraint** for both concerns is alignment with `docs/FOUNDATIONS.md`, in particular `§Story Bundles §4a (Plan-Authority Boundary)`, `§5a (Commitment Blocks Are Causal Moves)`, `§5b (Schema Minimalism)`, and `§5c (Present Causal State, Not Narrative Shape)`. Any proposed solution that introduces narrative-shape constructs (act position, midpoint, climax, dramatic-curve labels, expected-payoff modes) will be rejected — this is the rollback territory that SPEC-19 through SPEC-22 (scene-commitment-arc) occupied before being archived.

---

## 2. Worldloom context (cold-read summary)

### 2.1 Pipeline shape

Worldloom is a prose-and-YAML worldbuilding-and-storytelling pipeline. World canon lives as atomic YAML records under `worlds/<slug>/_source/` (Canon Facts `CF-<integer>`, Change Log Entries `CH-<integer>`, Invariants, Mystery Reserve, Open Questions, Named Entities, prose Sections). Branching stories live under `worlds/<slug>/stories/<story-slug>/` with their own atomic-YAML `_source/` per-class subdirectories — 20 story-bundle record classes per the canonical contract.

### 2.2 The four story skills

- `branching-story-bootstrap` — initializes a new story bundle (root branch, root page, root event, opening cast, opening beliefs, opening threads/obligations/consequences, optional opening commitment blocks). Optionally seeds CLK / STSEC / STQ at root.
- `branching-story-turn-cycle` — advances the bundle by one causal tick from any committed page (continuation OR fork). Resolves a chosen `CHC` (choice) or write-in to one of six outcome routes (`accept | accommodate | attempt | world_block | promotion_hold | terminal`), selects or JIT-creates a commitment block (`SLT`), applies a single state delta, materializes the next page snapshot, authors the next page plan, and emits 3-5 next choices.
- `branching-story-prose-attach` — validates externally-supplied rendered prose against a page plan + state and emits a receipt. Never mutates state. Honors §4a Plan-Authority Boundary.
- `branching-story-health-audit` — diagnoses bundle health via deterministic structural-replay checks (10 sub-phases as of SPEC-42: replay, branch isolation, debt health, belief/visibility health, DA health, mystery/canon safety, continuation/terminal proof, causal dependency health, canon baseline drift, CLK/STSEC/STQ mechanism health). Never mutates state.

### 2.3 The Plan-Authority Boundary (§4a)

Story state is authoritative at page-plan commit. A `PG` (page) record is real the moment the patch engine accepts the page-cycle plan. **Rendered prose is supplied externally** (manual or LLM) and attached later via a prose receipt; prose is a rendering of state, not a second state engine. The page snapshot is the fork primitive — any committed page is a valid parent for the next turn-cycle invocation, regardless of whether its prose has been rendered.

### 2.4 Schema-Minimalism Doctrine (§5b)

Every field in every story-bundle record schema must be load-bearing — directly consumed by a validation gate, a replay primitive, a predicate, a fork operation, or recorded audit-trail discipline. Nice-to-have fields are dropped because each costs LLM tokens to author at every record and to read at every retrieval.

### 2.5 Present Causal State, Not Narrative Shape (§5c)

The engine asks: *"what's true now, what's about to be true if X happens, what pressures the cast right now, what state would the next page commit"*. It NEVER asks: *"are we before or after the midpoint, has the protagonist refused the call, is this the climax, does this choice preserve a planned act"*. Encoding categorical predictions of future state transitions (e.g., "this question expects a `revelation`-mode payoff in 3 pages") is exactly the failure mode that the archived SPEC-19 / SPEC-20 / SPEC-21 / SPEC-22 "scene-commitment-arc" specs ran into, prompting rollback and the canonical addition of §5c.

This is **the most load-bearing constraint** for the research request. The interesting line — and the central craft question — is: how can the engine recognize that a new pressure / secret / question / thread should ENTER without that recognition becoming itself a narrative-shape pre-commitment?

---

## 3. SPEC-42 — the merge that triggered these concerns

SPEC-42 added three additive, append-only story-bundle record classes. Full spec at `archive/specs/SPEC-42-story-state-debt-secret-clock-records.md` (the spec lives in `archive/specs/` because it's completed). The three classes:

### 3.1 CLK — Pressure Clock

Tracks pressure that advances over time or through events: danger clocks, faction activity, countdowns, pursuit, exposure, deadlines, worsening conditions. 16 fields including `value` / `max` / `thresholds[]` (each with effects that fire when the value crosses them), `tick_history[]`, `visibility` (`hidden | holder_specific | public | factional`), `salience`, `status` (`active | paused | resolved | fired | abandoned | superseded`).

### 3.2 STSEC — Story Secret

Binds together the multiple `BEL` (belief) records and optional `SF` (story-fact) or `DA` (diegetic artifact) anchors that all point at the same hidden truth. 13 fields including `secret_kind` (`identity | motive | location | event_cause | artifact_truth | relationship | institutional`), `secret_claim`, `truth_anchor`, `holders[]`, `clue_carriers[]` (sub-array with `discovered_by` / `audience_visible` / `status`), `status` (`hidden | partially_revealed | revealed | disproven | abandoned`).

### 3.3 STQ — Story Question / Open Setup

Encodes present-causal open-setup state: an element introduced into the branch (a dramatic question, an explicit narrative setup, a Chekhov's gun) that remains active until answered, paid off, abandoned, or intentionally inherited. 13 fields including `setup_kind` (`setup | dramatic_question | promise`), `question_or_setup`, `audience_visibility`, `payoff_of` (link to another STQ), `status` (`open | complicated | answered | paid_off | abandoned | inherited | superseded`).

**STQ explicitly forbids future-shape fields** at `record_schema_compliance` HARD-REJECT level: `expected_payoff_mode`, `act_position`, `midpoint`, `climax`, `dramatic_curve_position`, `kind: moral_question`, `expected_chapter`, `scene_sequence`, `holders[]` (audience-vs-character). These are the §5c prohibition.

### 3.4 The §5c discipline statement (load-bearing)

> `STQ` tracks **present open-setup state**, not **future dramatic obligation**. The distinction is operationally tested by what the engine asks at each page: it asks *"what setups are currently open, what state do they license, what would close them"* — not *"are we before or after the midpoint, what shape should the eventual payoff take, what arc position are we at."*

This is the analogue for story-scope of FOUNDATIONS §5c. The same discipline must extend to any solution proposed for the mid-story introduction question.

---

## 4. Concern 1 — Mid-story introduction gap (detailed mechanical analysis)

### 4.1 The evidence

`branching-story-turn-cycle/SKILL.md` Phase 10 step 1 enumerates the patch ops the skill builds into its envelope. The relevant fragments:

> Operations include `create_se_record`, `create_pg_record` (always), `create_br_record` (if fork), `create_*_record` for every changed record class (...), **CLK operations (`tick_pressure_clock`, `resolve_pressure_clock`)**, **STSEC operations (`append_secret_clue_carrier`, `mark_secret_clue_discovered`, `reveal_story_secret`)**, **STQ operations (`answer_story_question`, `abandon_story_question`)**, `create_chc_record` per emission, `create_slt_record` if Phase 2 created a JIT block.

And the Output table:

| Class | Created when (per turn-cycle) |
|---|---|
| `CLK-<integer>` (existing record update) | IF an accepted event advances or resolves a pressure clock through `tick_pressure_clock` / `resolve_pressure_clock` |
| `STSEC-<integer>` (existing record update) | IF an accepted event discovers a clue carrier or reveals a story secret through `mark_secret_clue_discovered` / `reveal_story_secret` |
| `STQ-<integer>` (existing record update) | IF an accepted event answers, pays off, or abandons an open setup through `answer_story_question` / `abandon_story_question` |
| `THR-<integer>` (supersession) | IF threads advance or close |
| `STENT-<integer>` (supersession) | IF identity mirror / role metadata changes; not for life / agency / location status |
| `SREL-<integer>` (supersession) | IF relationships change (mandatory after death/incapacity reconciliation) |
| `STSTAT`, `STINT`, `BEL`, `OBL`, `STOBJ` | "new or supersession" — these CAN be freshly authored mid-story |
| `SF`, `CNSQ`, `STLOC`, `DA` | Created when fresh facts / consequences / locations / artifacts emerge — no supersession marker |

**Compare with `branching-story-bootstrap/SKILL.md`**, which DOES include `create_clk_record`, `create_stsec_record`, `create_stq_record` in its Phase 10 patch op enumeration:

> ...`create_thr_record`, `create_srel_record`, `create_stloc_record`, `create_stobj_record`, **`create_clk_record`** (if optional CLK seeds are applicable), **`create_stsec_record`** (if optional STSEC seeds are applicable), **`create_stq_record`** (if optional STQ seeds are applicable)...

So the patch-engine ops EXIST — they are documented and registered in `tools/patch-engine/src/envelope/schema.ts` `OPERATION_KINDS` per SPEC-42 §Deliverables. The infrastructure supports creating new CLK / STSEC / STQ records at any time. **Only the turn-cycle SKILL prose fails to invoke them.**

### 4.2 SPEC-42's own framing of the motivation

The spec's Problem Statement §1 explicitly cites the workaround pattern that the gap forces:

> Authors approximating staged pressure (a danger that mounts page by page; a deadline that matures; a faction moving offscreen) must repeatedly supersede `THR` or `CNSQ` records — fragile, hard to validate, hard to predicate against in storylet preconditions.

SPEC-42 addressed this **for state that EXISTS at bootstrap**. It did NOT address the case where new pressure ENTERS mid-story — which is where most narrative pressure actually arrives in real branching fiction.

### 4.3 Why this matters narratively

In observed dramatic practice — across novels, films, prestige TV, video games, and tabletop RPGs — most pressure / secrets / dramatic questions ENTER mid-story rather than existing at opening. Examples:

- A messenger arrives bearing news of a faction's mobilization → new CLK (`faction`) opens.
- A character lies to another for the first time → new STSEC (`identity` / `motive` / `event_cause`) opens.
- A discovered letter raises a new question → new STQ (`dramatic_question`) opens.
- A previously-unmet character walks on stage → new STENT.
- A new alliance or rivalry forms → new SREL.
- A new ongoing pressure that didn't exist at opening becomes the dominant arc force → new THR.

If the engine can't introduce these mid-story, authors are forced into one of three failure modes:
1. **Over-seed at bootstrap** — pre-author every clock / secret / question that "might" become relevant. This drifts toward narrative-shape pre-planning, exactly what §5c forbids.
2. **Shoehorn into supersessions of unrelated records** — repurpose existing THR or BEL records to carry new pressure. This is the anti-pattern SPEC-42 cited.
3. **Drop the structure entirely** — author the relevant pressure in prose only, with no engine-readable representation. This breaks predicates, storylet selection, witness firewall, and audit trail.

### 4.4 The central craft question (for ChatGPT-Pro)

**Under what dramatic conditions, drawn from narrative theory and comparative art, should each structure be introducible mid-story?** Specifically:

- **CLK (pressure clock)**: when does a new pressure clock arise? Triggering events? Aesthetic conditions? Genre-dependent variations (thriller vs slice-of-life vs horror)? When is introducing a clock structurally healthy vs when does it feel mechanical or "video-gamey"?
- **STSEC (story secret)**: at what dramatic moments does a NEW secret enter the engine? Is "the moment of first lie" the canonical trigger, or does the secret exist (in some latent sense) before the first lie and only become engine-relevant when it starts affecting choices? How does narrative theory handle the seed-vs-emerge distinction?
- **STQ (story question / open setup)**: when SHOULD a new dramatic question open mid-story? Is there a craft tradition that distinguishes "raised question" from "implicit question that was always there"? How can the engine distinguish a genuine new open setup from a re-framing of existing material?
- **THR (thread)**: what's the dramaturgical line between "the existing threads have advanced" and "a genuinely new thread has appeared"? Robert McKee's "controlling idea", Lajos Egri's "premise", and Joseph Campbell's structural beats all suggest threads exist before they're recognized — does that map to a worldloom-engineerable predicate?
- **STENT (entity)**: when does a new story-local entity earn engine representation vs being treated as background flavor? What's the threshold for "this person has agency in the branch" vs "this person was mentioned"?
- **SREL (relationship)**: relationships exist (latently) before they're activated. When does the engine need to commit a new SREL vs let an existing BEL or SF cluster carry the relational state?

### 4.5 Constraints on solutions

Any proposed introduction-condition logic must:

1. Stay strictly within §5c — must not encode narrative-shape predictions (no expected_payoff_mode equivalents, no act-position triggers, no dramatic-curve triggers).
2. Stay within §5b — schema minimalism; any new field added to support introduction-condition logic must be load-bearing for a validator, predicate, or replay primitive, not just authorial guidance.
3. Stay within §4a — story state is authoritative at page-plan commit; the introduction condition must be evaluable BEFORE prose is rendered, since prose is downstream of plan commit.
4. Stay within §5a — commitment blocks (`SLT`) are causal moves, not dramatic units; introduction conditions must not become disguised dramatic-unit declarations.
5. Stay engine-deterministic — the introduction conditions must be predicate-DSL-expressible (per the closed grammar at `.claude/skills/_shared-templates/story-state-contract.md` §5 + `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`) and validator-checkable, not subjective.

---

## 5. Concern 2 — Validator coverage + non-retcon repair workflow

### 5.1 The production case

`worlds/erotica-world/stories/red-bunny/` is an active branching story (5 pages, 5 events, 20 beliefs, 17 story-facts, 3 threads, 2 obligations, 1 consequence, 4 SREL with one supersession). It was bootstrapped on 2026-05-17, before SPEC-42 (2026-05-18) and likely before SPEC-38 (story-local diegetic artifacts). Its `_source/` is missing `clocks/`, `secrets/`, `story-questions/`, and `artifacts/` directories. Its PG snapshots do not include CLK / STSEC / STQ keys in `active_records`.

### 5.2 The existing validator surface

Validators live in `tools/validators/src/` with two categories:
- **Rule validators** (`rules/rule1-no-floating-facts.ts` through `rule12-redundancy.ts` etc.) — enforce the FOUNDATIONS Rules 1-12 at the world-canon level.
- **Structural validators** (~30 files in `structural/`) — enforce record-level integrity: `record_schema_compliance`, `snapshot_replay_equality`, `state_snapshot_integrity`, `branch_isolation`, `cross_file_reference`, `id_uniqueness`, `expected_witness_coverage`, `observer_firewall`, `clock_value_in_range`, `clock_threshold_ordering`, `clock_terminal_debt_integrity`, `critical_secret_clue_coverage_when_revealed`, `secret_carrier_existence`, `secret_mystery_firewall_compliance`, `story_question_payoff_integrity`, `story_question_grounding_integrity`, `story_question_setup_predates_payoff`, `story_question_terminal_debt`, `validation_trace_shape_compliance`, and others.

CLI surface: `tools/validators/src/cli/world-validate.ts` exposes `world-validate <world-slug> --story <story-slug>` for whole-bundle validation.

### 5.3 What's covered and what isn't

- **Covered**: record-level schema integrity, snapshot replay determinism, branch isolation, mystery-firewall compliance, predicate-DSL parsability, observer firewall, plan-hash consistency between PG record and on-disk plan bytes.
- **Not covered**: "bundle-structure compatibility with the latest contract" — i.e., the fact that a pre-SPEC-42 bundle's PG snapshots don't enumerate CLK / STSEC / STQ keys is intentionally NOT a validator failure (SPEC-42 §Verification explicitly guarantees this), but there's also no workflow that recognizes "bundle is N specs behind current schema; here are optional structural additions you could backfill if you wanted."

### 5.4 The "modify to remain playable" framing

The maintainer's instinct is: "I don't want to formally retcon (registered amendments / story-fact-promotion-to-canon route); I want to modify the bundle files directly so it stays playable under the current pipeline."

Important: **Hook 3 structurally blocks raw `Edit` / `Write` on `_source/<class>/*.yaml`**. So any "modification" of red-bunny's records must route through the patch engine. The append-only / supersession discipline IS the non-retcon mechanism for normal narrative state changes — you author a new record with `supersedes:` pointing at the old. What's missing is a **structured workflow that distinguishes "schema-drift compatibility repair" from "narrative state change"** so an audit reader can tell why a record was superseded.

For example: if PG-1 needs to be reshaped so its `state_snapshot.active_records` includes empty `CLK: []` / `STSEC: []` / `STQ: []` keys to match the current expected enumeration, that's a **compatibility migration**, not a narrative event. There's no audit-trail mechanism to flag it as such today.

### 5.5 Research questions on Concern 2

1. In comparable systems (game-state save migrations, save-format versioning in long-running RPGs, schema-evolution patterns for narrative engines, document-store schema migration), what patterns successfully separate "the world changed" from "the schema changed"?
2. Is there a craft tradition in interactive fiction (Twine, Ink, Inform 7, Choice of Games, AI Dungeon, NovelAI) for "soft-migrating" an in-progress story to a newer engine version without breaking the in-fiction narrative? What do those communities do?
3. For the worldloom case specifically, what would a non-retcon compatibility-repair workflow look like that (a) routes through the patch engine, (b) preserves the append-only discipline, (c) marks the change as a schema-migration not a narrative event, and (d) leaves the bundle health-audit clean?

---

## 6. What I (the maintainer's assistant) have already determined

The triage I performed before this brief was written settled the mechanical questions:

### 6.1 On Concern 1
- The gap is real and pervasive: CLK, STSEC, STQ have NO mid-story creation path through turn-cycle; THR, STENT, SREL have no clearly-documented mid-story creation path (the supersession framing dominates the prose, and the wildcard `create_*_record` mention is ambiguous).
- The patch-engine infrastructure EXISTS — bootstrap uses `create_clk_record` / `create_stsec_record` / `create_stq_record` / `create_thr_record` / `create_srel_record` / `create_stent_record` already. This is a skill-prose / workflow gap, not a tooling gap.
- The likely deliverable is a follow-up spec (working title: SPEC-43, since SPEC-41/42 are taken) that amends turn-cycle's Phase 10 op list, Phase 3 / Phase 4 prose, Output table, and validation gates to support mid-story introduction.
- The hard question that THIS BRIEF asks ChatGPT-Pro is the upstream one: **what are the narrative-theory-grounded conditions under which each structure SHOULD be introducible mid-story, and what predicates / triggers / authorial guidance should the spec encode?**

### 6.2 On Concern 2
- A validator surface DOES exist (`world-validate --story <slug>`); the maintainer's "I suspect we don't have a validator" is partly inaccurate. But the validator scope is record-integrity, not bundle-compatibility-drift.
- SPEC-42 guarantees backwards compatibility; red-bunny SHOULD pass `world-validate` cleanly. (Empirical verification still pending — not yet executed at brief-authoring time.)
- The genuine gap is a non-retcon compatibility-repair workflow. This is a smaller / optional spec, contingent on the validate run revealing actual drift findings.

---

## 7. Possible solution sketches (for ChatGPT-Pro to validate, refine, or replace)

These are starting points — the brief is requesting ChatGPT-Pro to draw on narrative theory to either validate / refine / replace these sketches.

### 7.1 Concern 1 — mid-story introduction

**Solution sketch A: Trigger-event taxonomy.** Define a closed taxonomy of "introduction triggers" — events whose `SE.state_delta` lawfully creates new CLK / STSEC / STQ / etc. records. Examples: a CLK can be introduced when `SE.event_kind` reflects a faction-onstage event, a deadline being uttered, a pursuit beginning, an environmental degradation, etc. The taxonomy lives in the predicate DSL and is validator-checkable.

**Solution sketch B: Authorial-judgment + post-hoc validation.** Trust the author (skill operator) to introduce records when the narrative warrants, but enforce post-introduction integrity via existing validators (terminal-debt checks, grounding integrity, predicate satisfiability). The introduction itself is unconstrained; the obligations it creates downstream are checked.

**Solution sketch C: Storylet-mediated introduction.** Require new CLK / STSEC / STQ to be introduced ONLY via a commitment block (`SLT`) whose `effects.create[]` names the new record. This keeps introduction inside the existing causal-move primitive and forces the author to bind the introduction to a specific in-fiction commitment. Risk: storylets become bloated with introduction-only blocks; mitigation: introduction is a side-effect of broader storylets, not their primary purpose.

**Solution sketch D: §5c-bounded trigger predicates.** Define predicates like `pressure_emergent(actor, kind)`, `secret_first_spoken(holder, content)`, `setup_explicitly_introduced(narrator, content)` that are evaluable against current branch state and license a corresponding `create_*_record` op. The predicates are themselves present-causal (they describe what just happened, not what's about to happen), so they stay §5c-aligned. This is probably the most promising direction — but the actual predicate set needs narrative-theory grounding.

### 7.2 Concern 2 — non-retcon compatibility repair

**Solution sketch E: New `branching-story-health-audit` mode `compatibility_migration`.** The audit detects bundle-vs-current-schema drift (missing optional subdirs, missing optional snapshot keys, stale plan hashes from older hash algorithms) and emits RSP-style proposal cards. The cards are consumed by a new (small) skill or a turn-cycle mode that authors supersession records carrying a special flag — e.g., `supersedes_reason: schema_migration`. The patch engine recognizes this reason and treats it as non-narrative.

**Solution sketch F: `branching-story-compatibility-repair` skill (new).** A dedicated skill that takes a bundle path, runs all current validators, identifies compatibility-drift findings (vs narrative-integrity findings), and offers to author the minimum supersession set needed to bring the bundle to current-schema parity. All edits route through the patch engine.

**Solution sketch G: Inline-in-validator.** Add a `compatibility_drift` finding type to existing validators that distinguishes "bundle is structurally OK but missing optional newer structure" from "bundle is broken". The maintainer can then decide whether to act on the finding or accept the drift.

---

## 8. FOUNDATIONS alignment — the non-negotiable

**Any solution must satisfy `docs/FOUNDATIONS.md` §Story Bundles.** The key sections are:

- **§4a (Plan-Authority Boundary)**: Story state is authoritative at page-plan commit. Rendered prose is supplied externally and does not create state.
- **§4b (Canon Baseline Drift)**: When world canon evolves while a story is in-flight, the bundle's parent `canon_revision` is compared and drift is classified. This is precedent for "the world changed underneath the bundle" handling.
- **§5a (Commitment Blocks Are Causal Moves)**: `SLT` records are causal moves with preconditions / beats / effects / exit options — NOT dramatic units, arcs, or plot rails. No `arc_contract`, `dramatic_unit`, `execution_envelope`, `effect_model`, `stop_policy`, `record_version` discriminators above 1, or `shape:` discriminators.
- **§5b (Schema-Minimalism)**: Every field must be load-bearing for a validator / replay primitive / predicate / fork operation / audit trail.
- **§5c (Present Causal State, Not Narrative Shape)**: The engine tracks what's true NOW and what's about to be true if X happens. It does NOT track act position, midpoint, climax, dramatic-curve position, expected payoff shape, or any other categorical prediction of future state structure.
- **§6a (Belief vs. Fact)**: `BEL` records what a holder believes / claims / witnesses / lies about; `SF` records what's branch-truth. The two are kept separate so lies, secrets, betrayals, and witness asymmetry remain coherent.
- **§6b (Information / Observer Firewall)**: A move can only be grounded in information the acting entity can plausibly access. Narrator-only knowledge cannot license an actor's move.

**The archived SPEC-19 / SPEC-20 / SPEC-21 / SPEC-22 (scene-commitment-arc) sequence is the cautionary precedent.** Those specs attempted to introduce act / scene / arc structures and were rolled back; the §4a / §5a / §5c text in FOUNDATIONS today is the codified lesson. Any solution that proposes anything resembling "the engine should know the story is approaching its midpoint and introduce the inciting secret then" will be rejected.

---

## 9. Specific research questions for ChatGPT-Pro

### 9.1 On narrative theory

1. **Robert McKee, Lajos Egri, Joseph Campbell, John Truby, Syd Field, Linda Aronson** and related theorists have all addressed when new story elements should enter. Which of their frameworks are compatible with "present causal state, not narrative shape" — i.e., describe entry conditions in terms of current state rather than future structural position?
2. **Interactive fiction theory** (Janet Murray, Marie-Laure Ryan, Espen Aarseth, Jesper Juul, Emily Short, Aaron Reed): how do these theorists handle the question of when a branching-story system should recognize a new pressure / secret / question?
3. **Improv theory** (Keith Johnstone "Impro", "Truth in Comedy", "Long Form Improv Manual"): improv has a strong tradition of "yes-and" and "raising the stakes" that maps closely to the worldloom pressure-clock concept. What does improv theory say about WHEN a new stake should enter vs an existing stake should be raised?
4. **TTRPG game-mastering** (Apocalypse World "fronts" and "clocks"; Blades in the Dark "clocks" — actually DIRECTLY relevant; Dungeon World; The Sprawl): these systems have explicit pressure-clock and faction-clock primitives. When do their rulebooks tell GMs to introduce new clocks vs advance existing ones?
5. **Screenwriting / showrunning craft** (Vince Gilligan "Breaking Bad" writers room practices; Steven Knight; Damon Lindelof; Rian Johnson; Greta Gerwig): in writers' rooms, what's the discipline that distinguishes "we need a new thread starting at episode 4" from "we should let the existing threads compound"?

### 9.2 On comparative implementation

6. **Twine / SugarCube / Harlowe**: how do these systems handle introducing new state mid-story? Are there idioms?
7. **Inform 7 / TADS**: do parser IF engines have a notion of new threads emerging mid-game vs being declared at world initialization?
8. **AI Dungeon / NovelAI / character.ai**: how do LLM-driven branching systems handle new pressure introduction? What goes wrong when they don't?
9. **Choice of Games / ChoiceScript**: this is a major branching-narrative engine with statefulness; what introduces new flags / counters / variables mid-story?
10. **Blades in the Dark / Apocalypse World** rulebook excerpts on clock introduction — what triggers a new clock for the GM?

### 9.3 On worldloom-specific design

11. **What predicates** (in the closed DSL form) would license introduction of each new structure? Try to draft 5-15 concrete predicate signatures per class, with §5c-aligned semantics.
12. **What authorial guidance** should appear in `branching-story-turn-cycle/SKILL.md` Phase 3 / Phase 4 prose to help skill operators recognize when a new CLK / STSEC / STQ / THR / SREL / STENT is warranted?
13. **What validators** should fire on improper introduction — e.g., a CLK introduced without an originating event; a STSEC introduced without at least one BEL anchor; a STQ introduced without explicit narrative grounding?
14. **What introduction patterns** are anti-patterns and should be hard-rejected — e.g., introducing a CLK whose only purpose is to predict an authorial-planned ending?
15. **For Concern 2**, what's the best non-retcon compatibility-repair workflow shape — sketch E, F, G, or something else?

---

## 10. Reference materials in the repository

ChatGPT-Pro has repository access. The load-bearing files for this research are:

- `docs/FOUNDATIONS.md` — **the non-negotiable design contract**. Read §Story Bundles in full.
- `archive/specs/SPEC-42-story-state-debt-secret-clock-records.md` — the completed spec that added CLK / STSEC / STQ. Especially §Problem Statement, §Approach, §FOUNDATIONS Alignment, §Out of Scope.
- `archive/specs/SPEC-19-scene-commitment-arc-schema.md` through `archive/specs/SPEC-22-scene-commitment-arc-engine-and-cross-skill.md` — the **rolled-back attempt** at arc / act structures. The cautionary precedent.
- `.claude/skills/_shared-templates/story-state-contract.md` — canonical story-state contract (authority model, schema-minimalism, record class inventory, closed predicate DSL, action routing, eight hard gates, page-plan minimum contract, branching procedure, shared write order, mystery and canon authority).
- `.claude/skills/_shared-templates/story-record-schemas.md` — full schema for all 20 story-bundle record classes.
- `.claude/skills/branching-story-bootstrap/SKILL.md` — bootstrap skill (note: HAS create-ops for CLK / STSEC / STQ).
- `.claude/skills/branching-story-turn-cycle/SKILL.md` — turn-cycle skill (note: DOES NOT have create-ops for CLK / STSEC / STQ; only lifecycle ops).
- `.claude/skills/branching-story-health-audit/SKILL.md` — health audit skill (note: has Phase 2i for CLK / STSEC / STQ mechanism health).
- `.claude/skills/commitment-block-authoring/SKILL.md` — storylet authoring; see the 11-target → 14-target coverage extension at SPEC-42 Phase 4.
- `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` — closed predicate DSL grammar.
- `tools/validators/src/schemas/story-pressure-clock.schema.json`, `story-secret.schema.json`, `story-question.schema.json` — JSON Schemas for CLK / STSEC / STQ.
- `tools/validators/src/structural/clock-*.ts`, `secret-*.ts`, `story-question-*.ts` — the SPEC-42 validators.
- `worlds/erotica-world/stories/red-bunny/` — the production case study for Concern 2. Read `INDEX.md`, `STORY_KERNEL.md`, and at least one `pages-prose-plans/PG-<integer>.md` to understand what an in-flight bundle looks like.

---

## 11. Expected output

A research report — markdown is fine — that:

1. Engages directly with the research questions in §9 above (numbered responses ok).
2. Draws on narrative theory and comparative implementation evidence where it strengthens recommendations.
3. Verifies every recommendation against `docs/FOUNDATIONS.md` §Story Bundles, especially §5b and §5c. Each recommendation should include a one-line FOUNDATIONS-alignment statement.
4. Proposes concrete deliverable shapes — predicate signatures, authorial-guidance prose, validator coverage, workflow shapes — that can feed directly into a worldloom follow-up spec.
5. **Explicitly addresses the §5c slippage temptation** — for each proposed predicate / trigger / guidance, name HOW it avoids encoding narrative-shape predictions.
6. Highlights any places where the FOUNDATIONS constraints actively conflict with established narrative theory, so the maintainer can decide whether to amend FOUNDATIONS (rare; high bar) or accept the constraint (default).
7. Distinguishes "wave-2 spec scope" from "wave-3+ deferral" — what's worth shipping in the immediate follow-up vs what can wait.

Length: as long as the analysis requires. Quality of grounding over brevity. Worldloom's design culture values explicit reasoning chains and cited precedent over executive summaries.

---

## 12. Closing note

This brief is itself a worldloom artifact written by an LLM (Claude Opus 4.7) under a brainstorm workflow. It will be reviewed by the maintainer before being handed to ChatGPT-Pro. The maintainer's stated goal is for ChatGPT-Pro to "figure out from narrative theory and similar art the exact conditions at which new story structures should appear mid-story." The research questions in §9 are the operational form of that goal; ChatGPT-Pro should not feel constrained to a single answer per question — the maintainer values multiple framings with tradeoffs surfaced.

Alignment with `docs/FOUNDATIONS.md` is **necessary, not optional.** Recommendations that violate §5b or §5c will be rejected at triage and the corresponding work will not ship. When in doubt, err toward present-causal-state framings and away from narrative-shape framings.
