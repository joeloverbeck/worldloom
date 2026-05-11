# Prose Craft Contract

This file is embedded VERBATIM into the LLM prompt at Phase 7 of `branching-story-page-cycle` and at Phase 7 of `branching-story-bootstrap`. The post-render prose critic (`phase-7-page-render.md` §Post-Render Prose Critic) checks the rendered prose against the named pathologies in §Diagnostic Vocabulary at the end of this file. Both surfaces share this single source of truth so the prompt instructions and the critic agree on the rules.

The rules below are the contract. Each rule is one principle with a concrete revision example. The critic's verdicts cite these rules by number.

---

## 1. Pick the psychic-distance level for the moment

Default to deep close-third / first-person (Gardner level 4): the narration borrows the POV character's diction, judgments, and rhythms. Move to standard third (level 3) for transit and summary; reserve stream-of-consciousness (level 5) for genuine emotional peaks, sparingly. Most prose drift is "wrong level for the moment" — abstract analysis where deep close was needed, or stream where the beat called for plain action.

## 2. Use free indirect discourse over labeled interiority

The POV's vocabulary, judgments, and rhythms appear in the narration WITHOUT `I thought / I felt / I knew / I noticed / I realized` tags. The thought IS the word choice; the tag is overhead.

- *Bad:* "I noticed the bench wood was grey and felt that it was somehow important."
- *Better:* "The bench wood was grey. Of course it was."

## 3. Cut filter words

`I saw / heard / felt / noticed / knew / realized / watched / clocked / named / wondered / decided / remembered / sensed` interpose a pane of glass between reader and POV. Default: cut them. Keep them only when the act of perceiving is itself the load-bearing thing — a sentry's perimeter check, a moment of sudden recognition where the noticing IS the event, a deliberate filter at a POV transition.

- *Bad:* "I saw the bruise on her arm."
- *Better:* "The bruise on her arm. Four fingers."

## 4. Put the action in the verb

`was / were / had / made / did / took + nominalized noun` is a sentence with the action smuggled into the noun and propped up by a weak helper. Watch the suffixes `-tion / -ment / -ance / -ence / -ness / -ing` followed by `of`.

- *Bad:* "She was in possession of the keys." / "I made a decision to walk over."
- *Better:* "She held the keys." / "I walked over."

Adverb + weak verb signals a missing vigorous verb: "walked quickly" → "hurried"; "pulled hard" → "yanked"; "spoke loudly" → "shouted".

## 5. Anchor abstraction to sensory specifics

Every abstract claim pairs with a concrete instance — a sensory image, a named object, a specific gesture. Move down and up the ladder of abstraction; don't dwell at either rung.

- *Bad:* "The interior pressure had compounded by two clicks; the disclosure was now in the air and the cost was fully owed."
- *Better:* "I'd said it. Her eyes hadn't moved. The bag at my ankle suddenly weighed twice what it had a minute ago."

## 6. Repetition is fault unless it earns weight

A metaphor stock used identically across consecutive pages is a tic, not a motif. Motif: the repeated element acquires new meaning each return. Tic: it just re-appears.

**Hard rule: no metaphor token, no specific concrete anchor, and no characteristic phrasing from the prior 1–2 pages may be reused verbatim or near-verbatim.** Voice persists across pages; phrasings rotate. If "the bench wood was grey" appeared last page, find a different sensory anchor this page — the splinter at the edge, the cold of the slat through the trousers, the mark where someone carved initials. If the prior page used "the simulator did not converge" as a metaphor for indecision, this page uses something else, or names the indecision plainly.

## 7. Voice and modality from substrate, not from checklist

A character's profession, class, formative reading, and regional speech shape *what vocabulary is available* to them. They do NOT dictate which idiom-types must appear each page. A programmer-protagonist may go an entire page without a programming metaphor and still sound like himself — he sounds like himself in word-choice, sentence rhythm, and what he attends to.

**Do not deploy `STORY_KERNEL.language_register` hints as a per-page checklist.** If the kernel says the character draws on programmer-idiom, weightlifting metaphors, and pornographic vocabulary, that is a substrate to draw from selectively — not a list to deploy each page. Deploying all three each page produces tic-language across the bundle.

**The same principle applies to rendering modality.** Action, dialogue, interiority, and sensory anchor are the modalities available to a page; they are NOT a four-item checklist to deploy each page. The selected storylet's beat and the scene's natural shape determine which modalities show up and in what mix:

- A confession or interrogation may be almost entirely dialogue.
- A perimeter check, a chase, or an extraction may be almost entirely action.
- A vigil, a wait, or a moment of decision may be almost entirely interiority and sensory anchor with no dialogue at all.
- A page may legitimately be one modality, two, three, or four — the storylet's beat decides, not a render-time directive.

Forcing all four modalities onto every page produces four-modality boilerplate — the modality-equivalent of language-register tic-deployment. The page renders what the beat requires; what the beat does not require is not added for completeness.

## 8. Trust the reader; cut the paraphrase

Do not follow a dialogue turn with an italicized analytical paragraph that names the dialogue's subtext. Do not narrate the meaning of the gesture you just rendered. Do not explain what the silence means.

**Deletion test:** cut the meta-clause. If the scene's meaning survives, the meta-clause was deadweight.

- *Bad:* "She said nothing. *That is the call-the-bluff move; that is the operational-specificity demand; that is the cost arriving in the form of an asked-for accounting.*"
- *Better:* "She said nothing. The bench wood was cold against the back of my hand."

Self-narrating-self ("I noticed I was noticing", "I clocked it as I said it", "I heard myself say it before the simulator confirmed I would say it") is the same pathology in first person — narrating the act of narrating. Cut it.

## 9. No ledger-jargon in prose, ever

`CF-NNNN`, `M-N`, `CAU-N`, `SOC-N`, `AES-N`, `ONT-N`, `DIS-N`, `OBL-NNNN`, `SF-NNNN`, `STENT-NNNN`, `SE-NNNN`, `THR-NNNN`, `CHC-NNNN`, `INV-N`, `SLT-NNNN`, `STINT-NNNN`, `SREL-NNNN`, `CNSQ-NNNN`, `STLOC-NNNN`, `STOBJ-NNNN`, `DA-NNNN`, `BR-NNNN`, `PG-NNNN`, `ENT-NNNN`, `SEC-*`, `ARCTRACE-NNNN`, `SAU-NNNN`, `RSP-NNNN`, `SP-NNNN`, `SLB-NNNN`, `PA-NNNN`, `CHAR-NNNN`, `STORY-NNNN` are engine vocabulary. They never appear in narration, dialogue, or interiority — not as labels, not as references, not as hyphenated phrasings like "the secrecy-compounding-CAU-2 register" or "the M-3 substrate".

The POV's interior may name a *secret*, a *taboo*, a *promise*, a *threat*, a *bruise* — never a record id. The character does not know they live inside a ledger.

## 10. Sentence rhythm rotates

Long compound chains followed by short choppy declaratives is a default cadence. Vary clause length, opening word, and grammatical shape. Two sentences in a row that share a syntactic frame are a smell; three are a fault.

- *Bad rhythm pattern, repeated three times:* "The X was Y. The Z was W. The A was B."
- *Bad rhythm pattern, repeated three times:* "I had not done X. I had not done Y. I had not done Z. I had not done W."

These constructions are useful sparingly for emphasis. As default cadence they flatten everything into the same beat.

## 11. Length follows content

Page length is not a target. The page is exactly as long as the storylet's beat, the cast's reactions, and the natural end-where-choices-emerge require — no longer, no shorter. There is no words-per-page range to hit, no minimum to clear, no maximum to honor; the prose stops when the beat is complete and the next decision point is naturally available, and not a sentence sooner or later.

Real prose does not pad to fill space and does not truncate to fit a budget. A scene that resolves in two hundred words resolves in two hundred words; a scene that needs a thousand to land its turn lands in a thousand. The author goes in with a plan for what must be present — surroundings, character reactions, the storylet's load-bearing transaction, the moment that opens the next decision — and writes until those elements are realized. Word count does not enter the consideration.

**Anti-patterns to flag as `padding_or_truncation`:**

- Filler sentences with no new information — restated emotional beats, repeated environmental description, summary recapitulation of what just happened on the page.
- Content-summarizing closers ("she would think about this later", "the night's weight settled in") that exist only to bring the page to a length-appropriate stopping point rather than to a content-appropriate one.
- Premature exit before the storylet's beat completes or before the next decision point is naturally available — the page ends because it is "long enough" rather than because the moment has arrived.
- Stretched-out moments — a single gesture or thought elaborated across multiple paragraphs without new information per paragraph — to extend a short page toward a target.

- *Bad (padded close):* "She walked away. The corridor was long and dim, and her footsteps echoed in the silence. She would have time, she knew, to think about all of it later." (The first sentence is the page's actual ending; the rest is filler to reach length.)
- *Better:* "She walked away."

- *Bad (premature exit):* page ends at a moment that does NOT naturally generate 4–6 distinct choices, because the prose has hit "long enough."
- *Better:* page continues until the next decision point is naturally available, even if the page is short.

---

## Diagnostic Vocabulary

The post-render prose critic checks for these named pathologies. Each maps to one or more rules above.

| Pathology | Definition | Rule(s) |
|---|---|---|
| `filter_word_saturation` | High density of `I saw / heard / felt / noticed / knew / realized / clocked / named` constructions per 100 words | 2, 3 |
| `recurring_metaphor_across_pages` | Any metaphor token (e.g., "the simulator", "the discipline", "the plates rattled") from the prior 1–2 pages reused verbatim or near-verbatim | 6, 7 |
| `identical_anchor_recurrence` | Specific concrete anchor (named object + sensory predicate, e.g., "the bench wood was grey", "the McCarthy strap was warm") reused verbatim from prior page | 6 |
| `self_narrating_self` | "I X-ed it as I X-ed it", "I noticed I was noticing", "I heard myself say it before I knew I would" — narrating the act of narrating | 8 |
| `bracket_paraphrasing_dialogue` | Italicized or non-italicized analytical paragraph immediately following a dialogue turn or gesture that paraphrases its subtext | 8 |
| `ledger_jargon_leakage` | Engine vocabulary tokens (`CF-NNNN`, `M-N`, `CAU-N`, `SOC-N`, `OBL-NNNN`, etc.) appearing in narration, dialogue, or interiority — including hyphenated compounds like "the CAU-2 register" | 9 |
| `abstract_noun_saturation` | Ratio of nominalizations (`-tion / -ment / -ance / -ness`-suffix nouns) to vigorous action-verbs is high; `was/were/had + noun` constructions cluster | 4, 5 |
| `padding_or_truncation` | Filler sentences with no new information; content-summarizing closers ("she would think about this later") that exist to hit a length rather than to land a beat; premature exit before the storylet's beat completes or before the next decision point is naturally available; stretched-out moments without new information per paragraph | 11 |
