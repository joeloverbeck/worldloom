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

## 7. Voice from substrate, not from checklist

A character's profession, class, formative reading, and regional speech shape *what vocabulary is available* to them. They do NOT dictate which idiom-types must appear each page. A programmer-protagonist may go an entire page without a programming metaphor and still sound like himself — he sounds like himself in word-choice, sentence rhythm, and what he attends to.

**Do not deploy `STORY_KERNEL.language_register` hints as a per-page checklist.** If the kernel says the character draws on programmer-idiom, weightlifting metaphors, and pornographic vocabulary, that is a substrate to draw from selectively — not a list to deploy each page. Deploying all three each page produces tic-language across the bundle.

## 8. Trust the reader; cut the paraphrase

Do not follow a dialogue turn with an italicized analytical paragraph that names the dialogue's subtext. Do not narrate the meaning of the gesture you just rendered. Do not explain what the silence means.

**Deletion test:** cut the meta-clause. If the scene's meaning survives, the meta-clause was deadweight.

- *Bad:* "She said nothing. *That is the call-the-bluff move; that is the operational-specificity demand; that is the cost arriving in the form of an asked-for accounting.*"
- *Better:* "She said nothing. The bench wood was cold against the back of my hand."

Self-narrating-self ("I noticed I was noticing", "I clocked it as I said it", "I heard myself say it before the simulator confirmed I would say it") is the same pathology in first person — narrating the act of narrating. Cut it.

## 9. No ledger-jargon in prose, ever

`CF-NNNN`, `M-N`, `CAU-N`, `SOC-N`, `AES-N`, `ONT-N`, `DIS-N`, `OBL-NNNN`, `SF-NNNN`, `STENT-NNNN`, `SE-NNNN`, `THR-NNNN`, `CHC-NNNN`, `INV-N`, `SLT-NNNN`, `STINT-NNNN`, `SREL-NNNN`, `CNSQ-NNNN`, `STLOC-NNNN`, `STOBJ-NNNN`, `DA-NNNN`, `BR-NNNN`, `PG-NNNN`, `ENT-NNNN`, `SEC-*` are engine vocabulary. They never appear in narration, dialogue, or interiority — not as labels, not as references, not as hyphenated phrasings like "the secrecy-compounding-CAU-2 register" or "the M-3 substrate".

The POV's interior may name a *secret*, a *taboo*, a *promise*, a *threat*, a *bruise* — never a record id. The character does not know they live inside a ledger.

## 10. Sentence rhythm rotates

Long compound chains followed by short choppy declaratives is a default cadence. Vary clause length, opening word, and grammatical shape. Two sentences in a row that share a syntactic frame are a smell; three are a fault.

- *Bad rhythm pattern, repeated three times:* "The X was Y. The Z was W. The A was B."
- *Bad rhythm pattern, repeated three times:* "I had not done X. I had not done Y. I had not done Z. I had not done W."

These constructions are useful sparingly for emphasis. As default cadence they flatten everything into the same beat.

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
