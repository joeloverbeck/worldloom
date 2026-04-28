# Phases 4-6: Text Composition

Embed material and social texture (Phase 4), apply the author's bias and distortion (Phase 5), then draft the artifact body in continuous in-world prose (Phase 6). These three phases convert the Phase 1-3 claim substrate into the artifact text as it would exist in-world.

## Phase 4: Material and Social Texture

Embed the artifact in world texture. For the author's place + class + profession + era, select texture details from SEC-GEO, SEC-ECR, SEC-ELF, SEC-INS, and SEC-PAS records (retrieve via the context packet or `search_nodes(node_type='section', filters={file_class: ...})`):

- local measurements (currency, weight, distance, time — per the world's own units, not generic)
- proper names (places, persons, institutions, rituals — drawn from ENT / SEC records, not invented freely)
- food, weather, tools, animals
- ritual gestures, insults, honorifics, legal phrases
- body metaphors (inflected by author's species per SEC-PAS)
- architecture, writing surfaces, smells, stains, fabrics
- local calendrical markers
- class markers in diction

**Rule (from proposal)**: Do not add texture randomly. Texture should imply the world. Each texture element must cite its source record-id (SEC-id, CF-id, ENT-id) and the world-embedded reason it belongs.

**FOUNDATIONS cross-ref**: Rule 2 (No Pure Cosmetics) — this phase IS the Rule 2 enforcement point for the artifact body.

## Phase 5: Bias and Distortion Pass

Apply the author's worldview pressure. For the bound Author, populate:
- **omissions**: what they won't mention
- **overstatements**: what they exaggerate
- **moralizations**: what they frame as good/bad
- **unthinkables**: what they cannot imagine otherwise
- **audience pressures**: what their audience expects, fears, rewards, punishes
- **institutional pressures**: which SEC-INS body they must flatter or fear
- **adaptive-but-wrong distortion** (Pattern #80): whether a claim preserves correct adaptive behavior under a wrong ontology / explanation

These do not appear as editor's notes — they are **baked into the composition**. An omission is text-that-isn't-there; an overstatement is a phrase calibrated to the bias, not annotated; a moralization is a sentence the author writes believing it is true.

**Adaptive-but-wrong distortion**: If the artifact is composed for an in-world explanatory genre (folk myth, cult tract, propaganda, herbal, settlement law, oral history, sermon, prayer, folk tale) AND the author is plausibly mistaken about mechanism while plausibly correct about prescribed action, tag the relevant claim's `adaptive_behavior_preserved_under_wrong_ontology: true`. The wrong explanation IS the distortion; the right behavior is what the distortion preserves. Not every claim needs the tag; tag only claims where the divergence between explanation and behavior is the load-bearing rhetorical shape. For artifacts whose author is canonically informed (trained scholar, primary witness), this prompt may yield zero tagged claims — that is acceptable and is captured at Phase 8 Test 12 via the NONE-with-rationale path.

**Rule (from proposal)**: This is where the text becomes alive.

**FOUNDATIONS cross-refs**: Canon Layers §Contested Canon; World Kernel §Core Pressures.

**Voice-author + framing-author dual-bias case** (cross-ref `references/phase-0-normalize-and-author.md` §Voice-author + framing-author sub-pattern). When the artifact captures a speaker's voice within an editorial frame by a different person (interview-transcription, oral-history, dictated-monologue letter, ethnographic interview, prison confession recorded by a clerk), Phase 5 carries TWO bias layers: (a) the speaker's bias (omissions / overstatements / moralizations / unthinkables / private register lifted from dossier), AND (b) the framing-author's editorial bias (which questions they asked, which answers they cut, which audience they framed for, which translation choices they imposed). Both layers shape what appears in the body. The framing-author's editorial choices are NOT annotated in the body — they are baked into what's present and absent. Record both bias layers in frontmatter `notes` (speaker's under the standard Phase 5 fields; framing-author's under a *"Framing-author editorial bias"* line in `notes`).

## Phase 6: Draft Artifact Text

Compose the artifact body honoring Phases 1-5. The text as it would exist in-world — in the author's voice, in the genre's register, with Phase 4's texture embedded, Phase 5's distortions baked, and Phase 3's claims made (with prohibited claims absent).

The body must be **continuous in-world prose** (or continuous in-world verse / list / inscription / letter, as appropriate to the artifact_type). No editorial framing. No scare quotes around claims the narrator believes. No parenthetical "(this is of course false)" notes. The artifact IS the text — audit trails are for the frontmatter and the trace, not the body.

Length honors SOFT input `desired_length` if specified; otherwise a length natural to the artifact_type.

**Voice-author + framing-author composition case** (cross-ref `references/phase-0-normalize-and-author.md` §Voice-author + framing-author sub-pattern). When the artifact captures a speaker's voice within an editorial frame, the body is composed in the SPEAKER's voice (the dossier-lifted register at the artifact-date stage per Phase 0b §Back-projection math), shaped by the framing-author's editorial conventions: which questions are visible vs cut, what the framing-author chose to preserve verbatim vs paraphrase, where paragraph breaks land in transcribed monologue, what register the speaker uses knowing the framing-author's audience. The framing-author's voice does NOT appear in the body — only their editorial CHOICES (the cut questions, the kept passages, the framing-imposed paragraphing) appear. In-body editorial framing (preface, footnotes, parentheticals) is permissible only when the artifact_type's genre conventions specifically include it; otherwise the body remains pure speaker-voice and the editorial frame lives in `genre_conventions.breaks` per Phase 2.

**Rule**: If the artifact body reads like a world-wiki summary, Phase 6 has failed. Diegetic texts are voices from within; they are not encyclopedia entries in disguise.

**FOUNDATIONS cross-ref**: Canon Layers §Contested Canon.
