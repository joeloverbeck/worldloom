# Example — Mining a Short Monastic Chronicle

This example walks through one invocation of `canon-facts-from-diegetic-artifacts`
on a hypothetical short chronicle artifact. It is illustrative — exact phase
outputs will vary with artifact content and world state.

## Input

```
/canon-facts-from-diegetic-artifacts
  world_slug: mirelands
  artifact_path: worlds/mirelands/diegetic-artifacts/DA-0012-ash-chronicle-of-brother-tel.md
  parameters_path: (none — Phase 0 interviews)
```

## Artifact Summary (source)

`DA-0012-ash-chronicle-of-brother-tel.md` is a short chronicle written in-world
by Brother Tel, a monastic scribe at the Ash Cloister in the northern
Mirelands (circa current-era 847). The chronicle records six years of the
Cloister's observances. Its frontmatter (generated earlier by
`diegetic-artifact-generation`) records: `author: Brother Tel`, `artifact_type:
chronicle`, `desired_relation_to_truth: partially-reliable-narrator`.

## Phase 1 — Claim Extraction (summary)

11 distinct factual claims extracted from prose. Examples:

1. *"In the third year, the Smoke-Mass was held on the eleventh night of the
   second-cold month."* → **claim**: the Ash Cloister holds an annual ritual
   called the Smoke-Mass on a fixed calendrical night.
2. *"Brother Ivor brought word from the southern valleys that the salt-miners'
   lanterns no longer lit before the fourth watch."* → **claim**: salt-mining
   lantern practice has changed in the southern valleys (secondhand report).
3. *"As is known, the Ash Cloister's ledgers record the passing of stars by
   the old method."* → **claim**: star-observation methodology is preserved
   in Cloister ledgers (central to artifact; author's direct domain).
4. *"The fifth-year drought lifted only when the Abbot made procession to the
   old god-mound and kept vigil three nights."* → **claim**: procession-to-mound
   ritual resolved a drought (author believes; causation is diegetic).
5. *"We keep the five festivals in order: Thaw, Smoke, Long-Sun, Blood-Moon,
   and the Quiet."* → **claim**: annual cycle of five named festivals (central
   to artifact; author's direct domain).

Prose/frontmatter disagreements: 1 (frontmatter tagged claim 4 as
`narrator_belief_status: objective`; prose stance is clearly propagandistic —
the author is defending the Abbot's authority. Prose wins.)

## Phase 2 — Classification

| Count | Classification | Outcome |
|---|---|---|
| 2 | grounded | claims 7 and 9 already in CF-0033 and CF-0041; discarded |
| 7 | not_addressed | claims 1, 2, 3, 4, 5, 10, 11; carried to Phase 3 |
| 1 | contradicts | claim 8 (author claims the northern Cloister has no walls; INVARIANTS.md §Monastic Defense establishes that all Cloisters are walled after the Third Schism). **Flagged for continuity-audit.** |
| 1 | extends_soft | claim 6 (author mentions the Smoke-Mass is held in multiple regions; CF-0028 scopes Smoke-Mass to the Ash Cloister only. **Flagged for continuity-audit** — diffusion question.) |

T8 accounting: 2 + 7 + 1 + 1 = 11. ✓

## Phase 3 — Narrator-Reliability Mapping (7 candidates)

- **Claim 1** (Smoke-Mass calendrical night): firsthand + central + sole-source → `soft_canon` (scope: Ash Cloister)
- **Claim 2** (salt-miners' lanterns): secondhand → `contested_canon` [disputed]
- **Claim 3** (star-observation ledger method): firsthand + central + cross-referenced in CF-0015 → `hard_canon`
- **Claim 4** (procession-drought causation): propagandistic framing → `contested_canon` [propagandistic]
- **Claim 5** (five-festival cycle): firsthand + central + cross-referenced in ECONOMY_AND_RESOURCES.md §Seasonal Labor → `hard_canon`
- **Claim 10** (Brother Ivor as itinerant): firsthand + incidental → `soft_canon` (scope: Ash Cloister)
- **Claim 11** (old god-mound location): firsthand + central but outside epistemic horizon (the author has never traveled there; cites "as the elders say") → `horizon-flagged`; Phase 6d.2 will narrow or reject

## Phase 4/5 — Score + Filter

- Candidate 10 (Brother Ivor as itinerant) scores +3 aggregate; below +6 threshold. **Rejected (R2: score below threshold).**
- Candidate 11 (god-mound location) fails Phase 6d.2 epistemic-horizon test — repaired to narrowed scope (author-reported-location-with-hedging) at `contested_canon [legendary]`.
- Default `max_cards: 5`. After rejections and Phase 6 repairs, 6 candidates remain. Score-rank and keep top 5:
  1. **Claim 5** (hard_canon, score +15)
  2. **Claim 3** (hard_canon, score +14)
  3. **Claim 1** (soft_canon, score +11)
  4. **Claim 4** (contested_canon, score +9)
  5. **Claim 2** (contested_canon, score +8)
  - Claim 11 (contested_canon, score +7) dropped by cap.

## Phase 6 — Canon Safety Check

- **6a Invariants**: all 5 surviving cards pass.
- **6b MR firewall**: all 5 surviving cards record full MR id list; no overlaps with forbidden-answer sets.
- **6c Distribution**: all 5 cards have `recommended_scope` + `why_not_universal` populated. Claim 3's `hard_canon global` scope is anchored in CF-0015.
- **6d Diegetic-to-World Laundering**:
  - Claim 5 (6d.1): pass — cross-referenced in ECONOMY_AND_RESOURCES.md.
  - Claim 3 (6d.1): pass — cross-referenced in CF-0015.
  - Claim 1 (6d.1): sole-source → held at `soft_canon` as Phase 3 mapped. Pass.
  - Claim 4 (6d.1): sole-source + propagandistic → `contested_canon` appropriate. Pass.
  - Claim 2 (6d.1): sole-source + secondhand → `contested_canon` appropriate. Pass.
  - 6d.2 (epistemic horizon): all surviving cards pass (author is within horizon for all 5).
  - 6d.3 (MR positional): Claim 4 flagged — the old god-mound may overlap MR-0007 ("origin of the mound-spirits"). **Card rejected**. Batch manifest records `mr_positional_flag` for Brother Tel's position as monastic-authority-proximate-to-mound-spirits.
- **6e Batch-level**: after Claim 4 rejection, 4 surviving cards. No joint-closure collisions. No mutual contradictions. Single-narrator concentration: 4 cards all from Brother Tel; 2 are sole-source (claims 1, 2). Below >3 threshold → concentration flag not triggered, but `single_narrator_concentration.count: 2` recorded.

## Phase 7 — Validation Tests

All 11 tests pass with rationales.

## Phase 8 — Commit

**HARD-GATE deliverable summary to user:**
- 11 claims extracted from DA-0012
- 2 grounded (discarded)
- 7 carried forward; 2 routed to flagged_contradictions
- 5 scored-and-capped candidates
- 1 MR-positional rejection (Claim 4)
- 4 surviving cards: PR-0017 (Claim 5, hard_canon), PR-0018 (Claim 3, hard_canon), PR-0019 (Claim 1, soft_canon), PR-0020 (Claim 2, contested_canon)
- `mr_positional_flags`: Brother Tel → MR-0007 (session warning for future mining)
- 2 flagged contradictions for `continuity-audit`: claims 6 and 8

**User approves as-is.**

**Files written**:
1. `worlds/mirelands/proposals/PR-0017-five-festival-cycle-mirelands.md`
2. `worlds/mirelands/proposals/PR-0018-ash-cloister-star-ledger-method.md`
3. `worlds/mirelands/proposals/PR-0019-ash-cloister-smoke-mass-calendrical.md`
4. `worlds/mirelands/proposals/PR-0020-southern-salt-miners-lantern-change.md`
5. `worlds/mirelands/proposals/batches/BATCH-0007.md`
6. `worlds/mirelands/proposals/INDEX.md` (appended 4 rows)

## User Next Steps

1. Run `canon-addition worlds/mirelands/proposals/PR-0017-five-festival-cycle-mirelands.md` to adjudicate the first card.
2. Run `continuity-audit mirelands` with focus on DA-0012 + CF-0028 + INVARIANTS.md §Monastic Defense to address the two flagged contradictions.
3. Carry the `mr_positional_flag` for Brother Tel into any future mining of his artifacts — elevated MR-0007 caution.
