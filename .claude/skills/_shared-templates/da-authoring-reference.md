# Story-Local Diegetic Artifact Authoring Reference

This reference is shared by the story-pipeline skills that create, interpret,
audit, or promote story-local `DA-*` records. It documents the existing schema
from `.claude/skills/_shared-templates/story-record-schemas.md` §4.5.10 and the
access predicates from `.claude/skills/_shared-templates/story-state-contract.md`
§5; it does not add fields or bypass story-bundle append-only write discipline.

## Triage

Create a story-local `DA-*` when at least two of these properties matter to the
page, branch, or downstream choice surface:

1. **Diegetic authorship**: the artifact has an in-world author, issuer,
   witness, scribe, translator, compiler, anonymous source, or factional voice.
2. **Recoverable content**: the artifact has text, image, sound, seal, map,
   inscription, notation, or other communicative content that can be quoted,
   compared, mistranslated, forged, damaged, copied, or remembered later.
3. **Belief impact**: reading, hearing, possessing, suppressing, or disputing
   the artifact changes a `BEL-*` record or should explain why a belief exists.
4. **Choice grounding**: an emitted `CHC-*`, selected `SLT-*`, or visible
   affordance relies on the artifact's content or on access to the artifact.
5. **Mystery progression**: the artifact preserves, narrows, misdirects, or
   appears to resolve an unresolved mystery without collapsing Mystery Reserve.
6. **Circulation matters**: who can access the artifact is load-bearing:
   `private`, `factional`, `public`, `concealed`, or `suppressed`.
7. **Truth status matters**: the difference between artifact claim, branch-local
   truth, world canon, lie, propaganda, damaged text, or prediction matters.
8. **Cross-page reference is likely**: later pages may cite, copy, supersede,
   contest, promote, or audit this artifact.

If fewer than two properties apply, prefer `STOBJ-*`, `SF-*`, `BEL-*`, or prose
only as described in the decision matrix below.

## Decision matrix

| Candidate | Use `DA-*` when | Use another record class when |
|---|---|---|
| Physical possession vs content | The communicative content matters: a letter, map, decree, diary, log, transcript, inscription, seal description, or recording transcript. | Physical custody, damage, hiding, carrying, stealing, burning, sealing, or trading matters; create or supersede `STOBJ-*` for the carrier and cite it from `DA.derived_from` when needed. |
| Branch truth vs claim | The artifact makes a claim whose source, circulation, and truth relation must remain auditable. | The branch itself establishes the claim as true; create `SF-*` with `derived_from` citing the DA plus the event or belief evidence. |
| Belief vs knowledge | The artifact is evidence or testimony that can cause beliefs. | A holder's epistemic state is the load-bearing fact; create or supersede `BEL-*` and cite the DA in `basis.access_records[]`. |
| Atmospheric detail vs load-bearing clue | The artifact can ground later quotation, comparison, choice, access, or audit. | The artifact is local color with no durable state value; keep it in prose or page-plan beats. |
| One-turn choice vs persistent record | The content, access, or dispute must survive across pages or branches. | The artifact only labels a one-off affordance with no later content/access implications; use `CHC.grounded_in.records[]` for existing records or prose-only context. |
| World-level vs story-local artifact | The artifact exists only inside this story bundle, branch, or page sequence. | The artifact is accepted world canon under `worlds/<slug>/diegetic-artifacts/`; use the world-level DA skill and cite story-local use as provenance rather than creating a conflicting story-local authority. |
| Accepted canon vs candidate | The artifact is a story-local source, rumor, forgery, prophecy, propaganda, or branch-local object of interpretation. | The claim is already accepted world canon; use `CF-*` / `SF-*` derivation or promotion closeout, not a DA as authority by itself. |
| Durable text vs rumor | The communicative object has persistent body content, authorship, and circulation. | The information spreads only as rumor, testimony, suspicion, or institutional report with no durable artifact; use `BEL-*` and access routes such as `rumor`, `testimony`, or `institutional_channel`. |

## Field semantics

The `DA-*` field list is defined in
`.claude/skills/_shared-templates/story-record-schemas.md` §4.5.10. Story-local
DA ids are distinct from world-level diegetic artifacts; do not rely on a bare
`DA-*` id to communicate cross-namespace authority.

### `truth_relation`

`truth_relation` describes the relation of the artifact's content to branch or
world truth. It does not describe reader belief; reader belief belongs in
`BEL.belief_mode`, `BEL.truth_relation`, and `BEL.confidence` per
`story-record-schemas.md` §4.1.

| Value | Use when |
|---|---|
| `true` | The key content is corroborated by branch-local `SF-*`, world-level `CF-*`, or explicit event evidence. |
| `false` | The key content is false, forged, deceptive, or known to contradict branch/canon truth. |
| `partly_true` | The content is mixed, incomplete, misleading, redacted, damaged, outdated, or true only with missing context. |
| `unknown` | The content is unverified, encoded, unreadable, inaccessible, or not yet adjudicated. |
| `contested` | The content is disputed, propagandistic, factional, testimonial, opinionated, mythic, or contradicted by other sources. |
| `branch_counterfactual` | The content is meaningful only in this branch or contradicts canon/sibling-branch state by design. |
| `future_contingent` | The content is a prophecy, forecast, threat, order, contract, plan, or prediction whose truth depends on later events. |

A DA claim does not become `SF-*` or `CF-*` merely because the artifact exists.
If the branch establishes the claim, create an `SF-*` with appropriate
`derived_from` evidence. If the story proposes world canon, route through
`story-fact-promotion-to-canon`.

### `circulation`

`circulation` describes actual access or distribution state, not intended
audience. `intended_audience` is who the artifact was meant for; `circulation`
is who can access or receive it now.

| Value | Use when |
|---|---|
| `private` | One character, a private recipient, or a small closed group can access it. |
| `factional` | Access runs through a faction, institution, crew, cult, bureaucracy, army, guild, or other defined group. |
| `public` | It is posted, broadcast, archived, printed, read aloud, openly visible, or otherwise generally accessible. |
| `concealed` | It is hidden, sealed, locked, buried, encoded, undiscovered, or secret but discoverable. |
| `suppressed` | It is censored, confiscated, destroyed, banned, or institutionally contained. |

`circulation: public` and `circulation: factional` trigger the
`expected_witness_coverage` propagation discipline: the same event must create
BEL propagation through an indirect route, or `SE.world_logic_rationale` must
include a parseable non-propagation tag.

### `body`

`body` preserves the diegetic content needed for later quotes, comparisons,
clues, beliefs, choices, promotions, and audits.

Use full text for short or central artifacts such as a letter, notice,
confession, diary entry, oath, or decree. Use an excerpt for long artifacts.
Use a transcript or concrete description for maps, diagrams, seals, photos,
recordings, inscriptions, or visual artifacts. Represent material uncertainty
inside the body with `[redacted]`, `[illegible]`, `[torn away]`, or
`[translation uncertain: ...]`.

Never write only "contains a clue." Write the clue.

### `derived_from`

`derived_from` records provenance or dependency for a separate artifact. It may
cite `SE-*`, `DA-*`, `STOBJ-*`, `BEL-*`, `SF-*`, or other story-local records
accepted by the current schema. Use it for copies, excerpts, translations,
forgeries, transcripts, annotated versions, leaked versions, damaged fragments,
testimony-derived documents, or event-created documents.

`derived_from: [DA-N]` is ambiguous between world-level DA files and
story-local DA records because both id spaces use `DA-*`. Until a later spec
adds namespace resolution, prefer an explicit body note for cross-namespace
provenance, such as `Story-local copy of world-level DA-12: Council Edict of
the Salt Charter`, instead of relying on a bare `derived_from` entry.

### `supersedes`

`supersedes` means the same logical artifact has a later version: altered text,
corrected edition, redacted version, circulation change, restored fragment, or
promotion-closeout field correction. Use `derived_from` when the new record is a
separate communicative object rather than a later version of the same one.

## Patch obligations

For every new or superseded story-local DA:

1. Allocate the id with
   `mcp__worldloom__allocate_next_id(world_slug, "DA", story_slug=<story-slug>)`.
2. Write it through `append_story_diegetic_artifact_record` with
   `expected_id_allocations.story_da_ids: ["DA-<N>"]`.
3. Include `DA-<N>` in the relevant `SE.state_delta.create[]` or
   `SE.state_delta.supersede[]`.
4. Include the active `DA-<N>` in the relevant
   `PG.state_snapshot.active_records.DA[]`.
5. If an emitted choice relies on the artifact, include `DA-<N>` in
   `CHC.grounded_in.records[]`.
6. If actor knowledge matters, create or supersede a `BEL-*` whose
   `basis.access_records[]` includes `DA-<N>` and whose `basis.access_route`
   uses the enum from `story-record-schemas.md` §4.1:
   `direct_observation`, `testimony`, `document`, `object_trace`,
   `location_trace`, `inference`, `surveillance`, `institutional_channel`,
   `magic_tech`, `rumor`, or `authorial_initialization`.
7. If physical custody, location, damage, sealing, destruction, or trade
   matters, create or supersede a `STOBJ-*` carrier and cite it when useful.
8. If `circulation` is `public` or `factional`, create same-event BEL
   propagation through an indirect route (`document`, `object_trace`,
   `location_trace`, `rumor`, `surveillance`, `institutional_channel`,
   `magic_tech`) or include a parseable
   `non_propagation:event_leaves_no_accessible_trace(group=<label>, records=[DA-<N>])`
   tag in `SE.world_logic_rationale`. `expected_witness_coverage` enforces this.
9. If a future `SLT-*` or page plan requires access to the artifact, use
   `artifact_accessible(STENT-<integer>, DA-<integer>)` from
   `story-state-contract.md` §5, paired with `any_belief(...)` or
   `belief_record(...)` when knowledge persists through belief rather than
   current artifact access.

## Worked examples

These examples use compact YAML fragments to show the required DA + SE + PG +
BEL + CHC bundle. They are illustrative, not complete page records.

### Bootstrap Private Letter

Premise: the protagonist starts with a private letter from their missing sister.
The DA is warranted because it has in-world authorship, concrete body text,
private circulation, belief impact, and choice consequences.

```yaml
da_record:
  id: DA-1
  story_id: STORY-1
  created_at_page: PG-1
  supersedes: null
  title: "Mira's Last Letter"
  author: STENT-2
  genre: "private letter"
  body: >-
    Rell, if the east bell rings before dawn, do not come to the house.
    The ledger is not in Father's desk. It is under the blue tile where
    Mother used to hide the winter salt. Trust no seal stamped in green wax.
  intended_audience: STENT-1
  circulation: private
  truth_relation: unknown
  derived_from: []

se_delta:
  create: [STENT-1, STENT-2, DA-1, BEL-1, STOBJ-1, CHC-1, CHC-2, CHC-3]
  supersede: []
  close: []

pg_snapshot:
  active_records:
    DA: [DA-1]
    BEL: [BEL-1]
    STOBJ: [STOBJ-1]

bel_record:
  id: BEL-1
  holder: STENT-1
  claim: "Rell has read Mira's warning about the green wax seal and the blue tile."
  belief_mode: knows
  truth_relation: unknown
  confidence: high
  visibility: private
  basis:
    source_event: SE-1
    access_route: authorial_initialization
    access_records: [DA-1, SE-1]

choice:
  id: CHC-1
  surface_label: "Search beneath the blue tile"
  grounded_in:
    records: [DA-1, BEL-1]
```

Do not canonize the ledger's location, Mira's trustworthiness, or the meaning of
green wax seals merely because the letter says so.

### Public Proclamation

Premise: the opening scene begins under a posted decree by the River Guard. The
DA is warranted because it has factional authorship, public circulation, public
belief propagation, and choice consequences.

```yaml
da_record:
  id: DA-2
  story_id: STORY-1
  created_at_page: PG-1
  supersedes: null
  title: "River Guard Quarantine Notice"
  author: group:river_guard
  genre: "public proclamation"
  body: >-
    By order of the River Guard, no ferry shall cross after moonrise.
    All grain barges are subject to search. Harbor bells mark lawful passage;
    unmarked crossings will be treated as plague-running.
  intended_audience: public
  circulation: public
  truth_relation: contested
  derived_from: []

se_delta:
  create: [DA-2, BEL-2, CHC-4, CHC-5]
  supersede: []
  close: []

pg_snapshot:
  active_records:
    DA: [DA-2]
    BEL: [BEL-2]

bel_record:
  id: BEL-2
  holder: public
  claim: "The River Guard has posted a quarantine notice restricting ferry crossings."
  belief_mode: reports
  truth_relation: true
  confidence: high
  visibility: public
  basis:
    source_event: SE-1
    access_route: document
    access_records: [DA-2, SE-1]

choices:
  - id: CHC-4
    surface_label: "Challenge the notice at the guard post"
    grounded_in:
      records: [DA-2, BEL-2]
  - id: CHC-5
    surface_label: "Look for an unmarked crossing"
    grounded_in:
      records: [DA-2, BEL-2]
```

Do not canonize the plague, the River Guard's honesty, or the danger of unmarked
crossings merely because the proclamation claims them.

### Found Forged Document

Premise: during a turn cycle, the protagonist finds a warrant that appears to
authorize an arrest, but the seal is wrong. The DA is warranted because it is a
discovered in-world document with forged content and choice consequences.

```yaml
da_record:
  id: DA-7
  story_id: STORY-1
  created_at_page: PG-5
  supersedes: null
  title: "Arrest Warrant Bearing the Green Seal"
  author: unknown
  genre: "forged warrant"
  body: >-
    By authority of the South Court, bearer is empowered to detain
    Tavin Ors for debt evasion and river-theft. Witnessed under green wax.
  intended_audience: group:city_watch
  circulation: concealed
  truth_relation: false
  derived_from: [STOBJ-5, SE-5]

se_delta:
  create: [DA-7, BEL-14, STOBJ-5, CHC-18, CHC-19]
  supersede: []
  close: []

pg_snapshot:
  active_records:
    DA: [DA-1, DA-2, DA-7]
    BEL: [BEL-14]
    STOBJ: [STOBJ-5]

bel_record:
  id: BEL-14
  holder: STENT-1
  claim: "Rell has found a warrant whose green seal suggests forgery."
  belief_mode: suspects
  truth_relation: false
  confidence: medium
  visibility: private
  basis:
    source_event: SE-5
    access_route: document
    access_records: [DA-7, STOBJ-5, SE-5]

choice:
  id: CHC-18
  surface_label: "Confront the watch captain with the warrant"
  grounded_in:
    records: [DA-7, BEL-14]
```

If the same warrant is later copied, redacted, translated, or publicly leaked,
create a new `DA-*` with `derived_from: [DA-7]`. If the same physical warrant is
burned, stolen, sealed, or moved, supersede the `STOBJ-*` carrier.

## Anti-patterns

1. Creating `DA-*` for every trivial sign, label, prop, or atmospheric note.
2. Treating `DA.body` as branch truth. The body is artifact content, not proof.
3. Using `truth_relation: true` without supporting `SF-*`, `CF-*`, or explicit
   event evidence.
4. Creating `public` or `factional` DAs without same-event BEL propagation or a
   valid non-propagation tag.
5. Grounding a choice, action, or `SLT-*` in a DA the acting entity cannot access.
6. Modeling a physical letter, map, warrant, or recording only as `DA-*` when
   custody, damage, sealing, destruction, or trade matters; use `STOBJ-*` too.
7. Duplicating the same artifact when the correct move is BEL propagation,
   supersession, or a derived copy.
8. Promoting DA claims to world canon directly instead of routing through
   `story-fact-promotion-to-canon` and preserving artifact provenance.
