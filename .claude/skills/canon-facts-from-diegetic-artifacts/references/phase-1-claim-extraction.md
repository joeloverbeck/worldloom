# Phase 1: Load and Parse Artifact — Claim Extraction

Load this reference when entering Phase 1 to extract the artifact's factual claims into the unified claim ledger.

## Prose-Primacy Discipline (load-bearing)

Read the artifact body prose as the PRIMARY source. Frontmatter claim tags (if present, typically from `diegetic-artifact-generation`-authored artifacts) are HINTS only — recorded per-claim, but prose-derived classification wins when they disagree. Disagreements are logged as diagnostic signals in the batch manifest's `claim_extraction_summary`.

**Why prose-primary is load-bearing**: Phase 6d.1 evidence-breadth assumes claims were extracted from prose with narrator-stance observed from the prose itself, not copied from potentially-stale frontmatter tags. If a future maintainer tilts Phase 1 toward frontmatter-primary for speed, Phase 6d.1 silently loses effectiveness. This ordering must be preserved across refactors.

## Unified Claim Ledger

Construct a ledger with one row per distinct factual assertion found in prose. Per claim, record:

- **Verbatim or paraphrased text** with line/paragraph citation into the artifact.
- **Narrator's stated stance**: asserted / hedged / conditional / rhetorical.
- **Frontmatter tag hint** (if present) — recorded, not copied-as-truth.

## Extraction Granularity (convention)

Extract at **independent-factual-assertion granularity**: one claim per independent factual assertion in prose.

- A sentence containing two independent factual assertions contributes **two** claim rows. Example: *"The contract was posted at forty silver, re-posted after a second caravan-ambush was reported"* → two claims (posting at forty silver; re-posting after a second ambush).
- Sentences joined by coordinate conjunctions ("and", "but", "or") where each clause carries its own factual content contribute one claim per clause.
- A sentence that asserts one fact with multiple qualifiers (e.g., *"the hunter-officer, who had been on duty since dawn, entered five names"*) contributes **one** claim — qualifiers are context, not additional facts.
- Purely descriptive or tonal prose without an institutional or world-level claim (e.g., *"Gresh vomited"*, *"The tracking took five days"* where the day-count is texture not institutional) does NOT produce a claim row unless the detail asserts a canonizable fact (*"Tracking took five days"* IS a claim row if the day-count implies tracking-difficulty texture that downstream phases will consider).
- Direct speech reported by the narrator is **one claim per speech-act** (the leader shouted *"nothing but meat"*), tagged `asserted` for the speech-act-occurred claim; the speech-act's CONTENT is not a separate claim at Phase 1 (content-reading is a Phase 6 diegetic-to-world-laundering concern).

**Expected counts calibration**: For a well-composed chronicle-length artifact of ~2500-3500 words in institutional-deposition register, expect 80-130 claims. Significantly fewer (< 50) suggests under-extraction or the artifact is unusually texture-dense; significantly more (> 160) suggests over-extraction of voice/flavor that Phase 5 R10 will winnow. Use these as sanity signals, not hard thresholds — a voice-heavy travelogue may legitimately produce 40 claims, and a dense charter-recital may produce 200.

## Factual-vs-Voice Distinction

Distinguish factual assertions (canonizable candidates) from voice/flavor (author preferences, sensory detail, rhetorical filigree) at this phase to shrink the Phase 5 R10 caseload. A rough test:

| Content | Factual assertion? |
|---|---|
| *"The contract was posted at forty silver"* | Yes — institutional fact |
| *"I do not agree with the public-silence order in all particulars"* | Not at the world-level — narrator opinion; contested narrator-belief, not canonizable |
| *"The cold-weather trace was not difficult"* | Marginal — if "cold-weather trace" is a tracking-craft term, the claim asserts a craft fact; if purely descriptive of this tracking session, it's voice. Default to recording with narrator-stance `hedged` and let Phase 5 R10 decide. |
| *"I killed the leader with the longsword"* | Yes — event-fact (personal-action narration contributing to CF-020-grounded combat claim) |
| *"He did not say this in the register of apology. He said it in the register of procedure."* | Yes — register-distinction fact about institutional ritual form |

When in doubt, record the claim. Over-extraction is cheap; under-extraction loses canonizable material that cannot be recovered downstream.

## Why This Phase is Load-Bearing

This is the single most mining-critical phase. If a claim is missed here, it cannot become a card at any downstream phase. If voice is mistaken for fact, R10 must catch it downstream — but R10 only sees what Phase 1 extracted. A missed claim is a missed card; a mis-classified voice fragment is R10's problem, not Phase 1's. Err toward over-extraction; Phase 5 R10 is the gate for mere texture.

## Output to Batch Manifest

Record at Phase 8 in `claim_extraction_summary`:

- **Total claims extracted**: exact count
- **By narrator stance**: asserted / hedged / conditional / rhetorical counts (exact sum equals total)
- **Frontmatter tags present**: yes/no
- **Prose/frontmatter disagreements**: exact count (zero is a diagnostic signal of a well-authored artifact; non-zero is a diagnostic signal of stale tags or Phase 3 claim-selection drift in the source diegetic-artifact-generation run)
