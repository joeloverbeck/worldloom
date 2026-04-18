---
name: propose-new-canon-facts
description: "Use when generating candidate canon facts to enrich an existing worldloom world — proposal batches covering thinness gaps, institutional adaptations, contested knowledge, mystery seeds, and cross-domain couplings. Produces: proposal cards at worlds/<world-slug>/proposals/PR-NNNN-<slug>.md + batch manifest at worlds/<world-slug>/proposals/batches/BATCH-NNNN.md + auto-updated proposals/INDEX.md. Mutates: only worlds/<world-slug>/proposals/ (never WORLD_KERNEL.md, INVARIANTS.md, CANON_LEDGER.md, or any other world-level canon file). Each emitted card's path is directly consumable as canon-addition's proposal_path."
user-invocable: true
arguments:
  - name: world_slug
    description: "Directory slug of an existing world under worlds/<world-slug>/. The skill aborts if the directory is missing or any mandatory world file (WORLD_KERNEL.md, INVARIANTS.md, ONTOLOGY.md, PEOPLES_AND_SPECIES.md, GEOGRAPHY.md, INSTITUTIONS.md, ECONOMY_AND_RESOURCES.md, MAGIC_OR_TECH_SYSTEMS.md, EVERYDAY_LIFE.md, TIMELINE.md, CANON_LEDGER.md, OPEN_QUESTIONS.md, MYSTERY_RESERVE.md) is unreadable."
    required: true
  - name: parameters_path
    description: "Path to an optional markdown file declaring: desired enrichment type(s) from {darker, stranger, more_political, more_local_texture, more_danger, more_religious_depth, more_economic_realism, more_archaeology, more_species_differentiation, more_travel_texture}; taboo areas to avoid; desired novelty range (conservative / moderate / bold); desired number of proposals (default 7, covering all diversification categories); optional upstream_audit_path pointing to a continuity-audit report or weakness dossier. If omitted, Phase 0 interviews the user. If provided but thin, Phase 0 runs a targeted gap-filler."
    required: false
---

# Propose New Canon Facts

Generates a diversified batch of candidate canon-fact proposal cards for an existing worldloom world: reads all 12 world files + FOUNDATIONS, diagnoses thinness/overstability/overcomplexity, targets enrichment categories, generates seeds from world pressure points, scores and filters against FOUNDATIONS Rules 2/3/4/5/7, diversifies the batch, runs a Canon Safety Check firewall (invariants + Mystery Reserve + distribution discipline) on each card, and writes a batch of option cards whose paths are directly consumable by `canon-addition` for separate adjudication. These cards are **not canon** — they are candidates for the user to review, select, and submit to `canon-addition`.

<HARD-GATE>
Do NOT write any file — proposal card, batch manifest, INDEX.md update — until: (a) pre-flight check confirms worlds/<world-slug>/ exists, all 13 mandatory files (docs/FOUNDATIONS.md + 12 world files) are readable, and no batch manifest or card-slug collision would occur; (b) Phase 7 Canon Safety Check passes for every card in the batch with zero unrepaired violations across invariant conformance, Mystery Reserve firewall, and distribution discipline; (c) Phase 8 Validation and Rejection Tests pass with zero failures at both per-card and batch levels; (d) the user has explicitly approved the Phase 9 deliverable summary (full batch: diagnosis trace, diversification audit, every card's full content, every card's Canon Safety Check trace, any Phase 7d repairs that fired, any cards the user is dropping). The user's approval response may include a drop-list of card-IDs to exclude from the write; dropped cards are never written and are recorded in the batch manifest's `dropped_card_ids`. This gate is authoritative under Auto Mode or any other autonomous-execution context — invoking this skill does not constitute approval of the deliverable summary.
</HARD-GATE>

## Process Flow

```
Pre-flight Check (resolve worlds/<world-slug>/; verify all 13 mandatory
                  files readable — docs/FOUNDATIONS.md + 12 world files;
                  allocate next BATCH-NNNN and PR-NNNN range;
                  scan proposals/ for slug-collision risk)
      |
      v
Phase 0: Normalize Generation Parameters (parse parameters_path OR interview;
          bind enrichment types, taboo areas, novelty range, batch size;
          ingest upstream_audit_path if provided)
      |
      v
Phase 1: Diagnose the Current World (thinness / overstability / overcomplexity
          scan across all 12 world files; produce diagnosis dossier with
          concrete cited weaknesses per domain)
      |
      v
Phase 2: Identify Enrichment Targets (select categories A-J + Proposal
          Families 1-10 that address diagnosis + honor user parameters
          + avoid taboo areas)
      |
      v
Phase 3: Generate Proposal Seeds (seeds from world pressure points;
          prefer multi-fact connections over disconnected novelty)
      |
      v
Phase 4: Score Each Proposal (8 dimensions 1-5:
          coherence / propagation / story_yield / distinctiveness /
          ordinary_life_relevance / mystery_preservation /
          integration_burden / redundancy_risk)
      |
      v
Phase 5: Filter Out Bad Proposals (9 rejection triggers;
          each rejection cited with trigger)
      |
      v
Phase 6: Diversify the Batch (ensure coverage of 7 Phase-5 slots;
          fill under-represented, prune over-represented)
      |
      v
Phase 7: Canon Safety Check
         7a: Per-card Invariant Conformance   (vs INVARIANTS.md)
         7b: Per-card Mystery Reserve firewall (vs MYSTERY_RESERVE.md)
         7c: Per-card Distribution Discipline  (recommended_scope +
                                                why_not_universal)
         7d: Batch-level Light Check           (no two cards jointly
                                                close one mystery;
                                                no mutual contradictions)
         --any fail--> Phase 7e Repair Sub-Pass
                       (narrow / reclassify as contested / add cost /
                        drop card from batch /
                        --unrepairable--> loop to Phase 3 with
                        flagged seed to regenerate)
      |
      v
Phase 8: Validation and Rejection Tests (per-card + batch-level;
          any FAIL halts and loops to responsible phase)
      |
    pass
      |
      v
Phase 9: Commit (HARD-GATE approval with drop-list --> atomic write of
          surviving cards + BATCH-NNNN.md manifest + INDEX.md update)
```

## Inputs

### Required
- `world_slug` — string — directory slug of an existing world under `worlds/<world-slug>/`. Pre-flight verifies the directory exists and all 13 mandatory files are readable.

### Optional
- `parameters_path` — filesystem path — markdown file declaring: desired enrichment type(s) from the 10-value taxonomy; taboo areas to avoid (free-form); desired novelty range (`conservative` / `moderate` / `bold`); desired number of proposals (default 7); optional `upstream_audit_path` pointing to a continuity-audit report or weakness dossier whose findings short-circuit Phase 1's thinness scan. If omitted, Phase 0 interviews the user. If provided but thin, Phase 0 runs a targeted gap-filler.

## Output

- **Proposal cards** at `worlds/<world-slug>/proposals/PR-NNNN-<slug>.md` — one file per surviving card, hybrid YAML frontmatter + markdown body. Each card's filesystem path is directly consumable as `canon-addition`'s `proposal_path` argument. Matches `templates/proposal-card.md`.
- **Batch manifest** at `worlds/<world-slug>/proposals/batches/BATCH-NNNN.md` — hybrid YAML frontmatter (`batch_id`, `world_slug`, `generated_date`, `parameters`, `diagnosis_summary`, `card_ids`, `dropped_card_ids`, `user_approved`) + markdown body (diagnosis prose, Phase-6 diversification audit, Phase 7d batch-level check trace). Matches `templates/batch-manifest.md`.
- **INDEX.md update** at `worlds/<world-slug>/proposals/INDEX.md` — one line per non-dropped card in the form `- [<title>](PR-NNNN-<slug>.md) — <proposed_status> / <type> / <enrichment_category>, batch BATCH-NNNN`, sorted by PR-NNNN ascending. Created if absent.

**No canon-file mutations.** This skill never writes to `WORLD_KERNEL.md`, `INVARIANTS.md`, `ONTOLOGY.md`, `TIMELINE.md`, `GEOGRAPHY.md`, `PEOPLES_AND_SPECIES.md`, `INSTITUTIONS.md`, `ECONOMY_AND_RESOURCES.md`, `MAGIC_OR_TECH_SYSTEMS.md`, `EVERYDAY_LIFE.md`, `CANON_LEDGER.md`, `OPEN_QUESTIONS.md`, or `MYSTERY_RESERVE.md`. No Canon Fact Record emitted. No Change Log Entry emitted. Each card is a *candidate*; canonization happens only when `canon-addition` accepts it in a separate run.

## World-State Prerequisites

Before this skill acts, it MUST load (per FOUNDATIONS §Tooling Recommendation — non-negotiable):

### Mandatory — always loaded at Pre-flight
- `docs/FOUNDATIONS.md` — cited throughout (Canon Layers; Rules 2/3/4/5/7; Canon Fact Record Schema; Proposal Families alignment).
- `worlds/<world-slug>/WORLD_KERNEL.md` — Phase 1 diagnosis (tonal/genre contract for coherence filter); Phase 6 diversification (Core Pressures guide slot priorities).
- `worlds/<world-slug>/INVARIANTS.md` — Phase 7a invariant conformance for every card.
- `worlds/<world-slug>/ONTOLOGY.md` — Phase 2 enrichment targeting (each category maps to ontology categories).
- `worlds/<world-slug>/PEOPLES_AND_SPECIES.md` — Phase 1 thinness scan (species-without-material-consequence); Phase 3 species-adaptation seeds.
- `worlds/<world-slug>/GEOGRAPHY.md` — Phase 1 thinness scan (geography-without-trade-implications); Phase 3 travel-texture and region-differentiation seeds.
- `worlds/<world-slug>/INSTITUTIONS.md` — Phase 1 thinness scan (frictionless institutions, undermodeled classes); Phase 3 institutional-response and law-coupling seeds; structural anchor for Proposal Families 2, 5, 9.
- `worlds/<world-slug>/ECONOMY_AND_RESOURCES.md` — Phase 1 thinness scan (scarcity without black market, war without logistics); Phase 3 Scarcity and Hidden-Cost family seeds.
- `worlds/<world-slug>/MAGIC_OR_TECH_SYSTEMS.md` — Phase 1 thinness scan (magic-without-institutional-response); Phase 3 Cost-Deepening and Boundary family seeds. **Loaded unconditionally here** (unlike `character-generation`'s conditional load) because the diagnosis phase must detect magical/technological thinness across any world.
- `worlds/<world-slug>/EVERYDAY_LIFE.md` — Phase 1 thinness scan (missing daily-life texture); Phase 3 Local Practice and Material Culture seeds (Families 4, 10).
- `worlds/<world-slug>/TIMELINE.md` — Phase 1 thinness scan (catastrophe with weak residue); Phase 3 Residue Facts seeds (Family 3).
- `worlds/<world-slug>/CANON_LEDGER.md` — Phase 5 redundancy filter; Phase 7c distribution discipline. **Note on mature worlds**: may exceed Read tool's token limit. Prescribed pattern when it does: grep for `^id:` to enumerate CF IDs, then Read by line-range for CFs in the domains targeted by the current batch. Selective reading is the expected mode once enough CFs accumulate.
- `worlds/<world-slug>/OPEN_QUESTIONS.md` — Phase 1 thinness scan (what is already listed as open, so proposals do not duplicate); Phase 3 Mystery Seeding (new questions complement existing).
- `worlds/<world-slug>/MYSTERY_RESERVE.md` — Phase 7b firewall (non-negotiable — each entry's `disallowed cheap answers` and `what is unknown` blocks are the literal test material); Phase 3 Mystery Seeding (open new bounded unknowns without closing these).

### Pre-flight
- `worlds/<world-slug>/proposals/` directory listing — for `BATCH-NNNN` and `PR-NNNN` allocation and slug-collision checks. Read existing `INDEX.md` if present. Directory created at Phase 9 commit time if absent.
- `parameters_path` contents (if provided) — read once at Phase 0.
- `upstream_audit_path` contents (if provided via `parameters_path`) — read once at Phase 1 to short-circuit the thinness scan for domains it covers.

### Abort conditions
- `worlds/<world-slug>/` missing → abort: "World directory not found. Run `create-base-world` first, or supply a valid `world_slug`."
- Any of the 13 mandatory files missing or unreadable → abort naming the specific file.
- `parameters_path` or `upstream_audit_path` provided but unreadable → abort naming the file.

## Pre-flight Check

1. Verify `worlds/<world-slug>/` exists. If absent, abort: "World directory not found. Run `create-base-world` first, or supply a valid `world_slug`."
2. Verify all 13 mandatory files (docs/FOUNDATIONS.md + 12 world files) are readable. If any is missing or unreadable, abort naming the specific file.
3. Load `docs/FOUNDATIONS.md` into working context.
4. Load the 12 mandatory world files (with the `CANON_LEDGER.md` selective-read pattern if size warning triggers).
5. Scan `worlds/<world-slug>/proposals/` for highest existing `BATCH-NNNN` by grepping `^batch_id:` across `batches/*.md` frontmatters, and highest existing `PR-NNNN` by grepping `^proposal_id:` across card frontmatters. Allocate `next_batch_id = highest_batch + 1`; `next_pr_id = highest_pr + 1`. If the directory does not exist or contains no cards, `next_batch_id = BATCH-0001` and `next_pr_id = PR-0001`.
6. Read existing `worlds/<world-slug>/proposals/INDEX.md` if present.

## Phase 0: Normalize Generation Parameters

Parse `parameters_path` if provided; otherwise interview the user. Extract:

- `batch_size` (default 7)
- `novelty_range` (default `moderate`; valid: `conservative` / `moderate` / `bold`)
- `enrichment_types` (default: all 10 from the taxonomy; filter if user-specified)
- `taboo_areas` (default: empty; free-form list of topics to exclude)
- `upstream_audit_path` (optional)

If `upstream_audit_path` is provided, load it into working context for Phase 1.

**Rule**: Parameters define the *search space*, not the *content*. A `parameters_path` that attempts to dictate specific canon facts is rejected — those are proposals, not parameters, and belong in `canon-addition`'s `proposal_path`.

**FOUNDATIONS cross-ref**: Tooling Recommendation (parameters-to-world-state binding happens here — every generated seed in later phases must trace back to loaded state, not to a dictated fact).

## Phase 1: Diagnose the Current World

Execute three scans across all 12 loaded world files. Each finding must cite the specific file (and ideally section) demonstrating it.

**Thinness scan** — per the reference proposal's 12 indicators: species-without-material-consequence; magic-without-institutional-response; geography-without-trade-implication; religion-without-law-or-daily-life impact; catastrophe-with-weak-residue; well-modeled-class-with-blank-others; taboo-without-ritual; corruption-without-containment; war-without-logistics; cities-without-food-systems; relics-without-salvage-economies; multilingual-coexistence-without-language-politics.

**Overstability scan** — 6 indicators: no pressure systems; no unresolved tensions; too few local anomalies; frictionless institutions; mystery reserve too thin; everything important already known.

**Overcomplexity scan** — 4 indicators: too many disconnected facts; lore branches with low story yield; exotic detail without structural relevance; mysteries that are actually clutter.

Output: **diagnosis dossier** — each finding ranked `high` / `medium` / `low` remediation-value based on how many downstream gaps it creates. If `upstream_audit_path` was loaded, merge its findings — but do not skip this phase entirely, only skip scan-types the upstream report already covers.

**Rule**: Every finding must cite at least one loaded world file by name. A finding that cannot be cited is not a finding — it is a hunch, and hunches are disallowed here.

**FOUNDATIONS cross-ref**: Tooling Recommendation (diagnosis operates on loaded structured state, not prose intuition).

## Phase 2: Identify Enrichment Targets

For each `high`-value diagnosis finding from Phase 1, map to one or more enrichment categories (A–J from the proposal's Phase 1) AND one or more Proposal Families (1–10 from the proposal's Reference).

**Category ↔ Family mapping**:
- A: Structural Clarification → Families 2, 5, 9
- B: Constraint / Cost Deepening → Families 1, 7
- C: Institutional Response → Families 2, 9
- D: Historical Residue → Family 3
- E: Everyday-Life Texture → Families 4, 10
- F: Cross-Domain Coupling → any combination of 1–10
- G: Regional Differentiation → Families 4, 5, 10
- H: Contested Knowledge → Family 6
- I: Story Engine Injection → Families 2, 9
- J: Mystery Seeding → opens new unknowns rather than filling existing gaps

**Proposal Families (1–10)** — the 10 named families used to tag each seed's `proposal_family` frontmatter field. Source: the skill's reference brainstorming doc, archived at `archive/brainstorming/propose-new-canon-facts.md`.

1. **Hidden Cost Facts** — prevent systems from becoming frictionless.
2. **Institutionalization Facts** — show how the world adapts to its own realities.
3. **Residue Facts** — make history visible.
4. **Local Practice Facts** — make settings feel inhabited.
5. **Boundary Facts** — define who can and cannot do something.
6. **Misinterpretation Facts** — introduce useful false beliefs.
7. **Scarcity Facts** — clarify why something has not gone universal.
8. **Cross-Species Consequence Facts** — make embodiment socially real.
9. **Ritual / Law Coupling Facts** — bind metaphysics to governance.
10. **Material Culture Facts** — show values and constraints through objects and habits.

A seed may legitimately carry multiple family tags when its intent spans families (e.g., a local artisanal-guild subsection that encodes cross-species embodiment touches families 4, 10, and 8). The `proposal_family` frontmatter field accepts an integer or a list of integers.

**User label → A–J mapping** — Phase 0 extracts `enrichment_types` using the 10-value user-facing taxonomy declared in the arguments frontmatter (`darker`, `stranger`, etc.); Phase 2 maps each user label to the internal A–J analytical framework via the table below. Free-form user labels outside this table should be mapped by lexical-semantic fit or routed to Category F (Cross-Domain Coupling) by default.

| User label (`enrichment_types`) | Activates A–J categories |
|---|---|
| `darker` | B, I |
| `stranger` | H, J, D |
| `more_political` | C, I |
| `more_local_texture` | E, G |
| `more_danger` | B, I |
| `more_religious_depth` | H, I |
| `more_economic_realism` | B, C, F |
| `more_archaeology` | D, H |
| `more_species_differentiation` | A, E, G |
| `more_travel_texture` | E, G |

Apply user parameters: filter to `enrichment_types` if specified (map each label per the table above, then union the resulting A–J set); exclude findings touching `taboo_areas`; honor `novelty_range` (conservative favors A/C; bold favors H/J; moderate balances).

**Rule**: At least one target per `high`-value finding unless that finding is in `taboo_areas`. `medium`-value findings are targeted only if `batch_size` permits after high-value slots are filled.

## Phase 3: Generate Proposal Seeds

For each enrichment target, generate 1–3 candidate seeds using the proposal's 8 seed-generation prompts: what ordinary people would invent in response to known dangers; what institution must exist if a capability is real; what black market follows from a taboo; what local proverb/rite/profession/law current conditions naturally produce; what historical scar is still under-modeled; what species-specific adaptation has not been socially modeled; what material-culture detail implies a larger system; what conflict should exist but currently does not.

Each seed is a one-sentence candidate with implicit `proposed_status`, `type`, `domains_touched`, and a `diagnosis_finding_reference`.

**Rule** (from proposal): Prefer seeds that connect multiple existing facts to seeds introducing disconnected novelty. A seed referencing only one existing CF or invariant is weaker than one referencing two or more.

**FOUNDATIONS cross-ref**: Rule 5 (No Consequence Evasion) — seeds whose implications are not traceable through existing facts are rejected at Phase 5.

## Phase 4: Score Each Proposal

For every seed, score on 8 dimensions (1–5 each):
- `coherence`: fits world identity (WORLD_KERNEL tonal/genre/chronotope contract)
- `propagation_value`: how many domain files meaningful consequences touch
- `story_yield`: how many natural story engines it activates
- `distinctiveness`: differentiates from generic fantasy/scifi and from existing world elements
- `ordinary_life_relevance`: affects more than elite adventure scenes (Rule 2)
- `mystery_preservation`: deepens without flattening unknowns (Rule 7)
- `integration_burden`: lower is better; 5 = massive retcon, 1 = minimal
- `redundancy_risk`: lower is better (CANON_LEDGER cross-check)

**Aggregate**: `(coherence + propagation + story_yield + distinctiveness + ordinary_life_relevance + mystery_preservation) − (integration_burden + redundancy_risk)`. Range is [−10, +28]. Seeds with aggregate < +6 are flagged for Phase 5 removal unless the diagnosis finding they address is `high`-value.

**Rule**: A seed scoring 5 on `distinctiveness` but 1 on `coherence` is rejected — striking seeds that do not fit are noise.

## Phase 5: Filter Out Bad Proposals

Apply the proposal's 9 rejection triggers — each rejection is logged to the batch manifest's body with the specific trigger and the rejected seed's content, creating an audit trail:
1. trivializes major existing struggles
2. universalizes rare powers (Rule 4 violation)
3. overexplains important mysteries (Rule 7 violation)
4. duplicates current facts (redundancy)
5. exists only as aesthetic flourish (Rule 2 violation)
6. requires massive retcons for little gain
7. breaks tonal contract (WORLD_KERNEL tonal contract)
8. makes the world too "clever" and less believable
9. solves more problems than it creates

**Rule**: A seed rejected here is never resurrected later. If a diagnosis finding runs out of seeds, return to Phase 3 to regenerate — never relax Phase 5's filters.

**FOUNDATIONS cross-refs**: Rule 2 (trigger 5); Rule 3 (trigger 2 partial); Rule 4 (trigger 2); Rule 7 (trigger 3); WORLD_KERNEL §Tonal Contract (trigger 7).

## Phase 6: Diversify the Batch

The batch must cover, where possible, 7 Phase-5 slots from the reference proposal:
1. local texture fact
2. institutional adaptation
3. pressure-system intensifier
4. contested-belief proposal
5. history residue proposal
6. mystery-seeding proposal
7. cross-domain connection

Fill strategy:
- `batch_size = 7` (default): fill all 7 slots exactly once.
- `batch_size < 7`: fill in priority order `1, 2, 5, 7, 3, 4, 6` — local-texture and institutional-adaptation first because they are the highest-yield for user review per the proposal's example output style.
- `batch_size > 7`: fill all 7 slots once, then double up starting from slots with multiple strong-scoring candidates from Phase 4.

If a slot has zero surviving candidates, **record the empty slot** in the batch manifest and do NOT substitute from another slot. Empty slots are diagnostic signals — the world may genuinely not need that enrichment type right now.

**Rule** (from proposal): Do not present a batch dominated by one type. User design choice depends on variety.

## Phase 7: Canon Safety Check

Four sub-phases (three per-card, one batch-level) are independent checks with independent failure modes. All four must run; failure on any triggers Phase 7e Repair Sub-Pass.

### Phase 7a: Per-card Invariant Conformance

For every card, test its `canon_fact_statement`, implied distribution, and implied consequences against every invariant in `INVARIANTS.md`. Record each invariant tested into the card's `canon_safety_check.invariants_respected`.

Fail triggers (→ Phase 7e):
- violates an ontological invariant (card introduces an ontology the world disallows)
- violates a causal invariant (implies cost-free capability in a cost-required world)
- violates a distribution invariant (implies elite/restricted ability would be universally available)
- violates a social invariant (contradicts a stable institutional rule)
- violates an aesthetic/thematic invariant (consequence profile undermines the tonal contract)

**Exception**: if a card explicitly declares `proposed_status: invariant_revision`, 7a records the invariant it proposes to revise and flags the card for `canon-addition`'s invariant-revision pathway — not a fail.

**Rule**: Never silently narrow or drop an invariant. A failed conformance goes to 7e for repair, not to a quiet downgrade.

**FOUNDATIONS cross-ref**: Invariants §full schema — `break_conditions` and `revision_difficulty` guide 7e.

### Phase 7b: Per-card Mystery Reserve Firewall

For every entry in `MYSTERY_RESERVE.md`, check whether its `what_is_unknown` or `disallowed_cheap_answers` blocks overlap the card's `canon_fact_statement`, `immediate_consequences`, or `longer_term_consequences`. Record every checked MR entry's id into the card's `canon_safety_check.mystery_reserve_firewall` **regardless of overlap** — the firewall list is a proof-of-check audit trail. Document overlap status per entry in the card's Canon Safety Check Trace prose.

For cards of Proposal Family J (Mystery Seeding), the check is **inverted**: they MUST open a new bounded unknown. A Family J card that closes an existing MR entry, or merely re-frames one without adding a new bounded unknown, fails.

Fail triggers (→ 7e):
- card's `canon_fact_statement` answers an MR entry's `what_is_unknown`
- card's consequences entail an answer to `disallowed_cheap_answers`
- Family J card does not open a new bounded unknown

**Rule**: Empty firewall list when `MYSTERY_RESERVE.md` has entries = Phase 8 fail. Silent firewall means no firewall.

**FOUNDATIONS cross-ref**: Rule 7 (Preserve Mystery Deliberately) — this IS the Rule 7 audit point for proposal generation.

### Phase 7c: Per-card Distribution Discipline

For each card introducing a capability / artifact / technology / magic practice:
- MUST specify `recommended_scope` (geographic: local/regional/global/cosmic; temporal: ancient/historical/current/future/cyclical; social: restricted_group/public/elite/secret/rumor)
- MUST specify `why_not_universal` UNLESS `social: rumor` (rumors are inherently un-localized by design)
- if the card's capability overlaps an existing CF's `who_cannot_easily_do_it`, the card's `why_not_universal` MUST NOT contradict the CF's stabilizers

Record each consulted CF id into `canon_safety_check.distribution_discipline.canon_facts_consulted`.

Fail triggers (→ 7e):
- capability card missing `recommended_scope`
- capability card missing `why_not_universal` (and not scoped to rumor)
- `why_not_universal` contradicts an existing CF's stabilizers

**Rule**: No proposal may silently imply universalization. Every capability card carries the discipline cues `canon-addition`'s Phase 1 Scope Detection expects.

**FOUNDATIONS cross-ref**: Rule 4 (No Globalization by Accident) — pre-adjudication hardening.

### Phase 7d: Batch-level Light Check

Cross-card collision checks:
- **Joint-closure**: no two cards' statements together close the same MR entry (neither alone would, but jointly they do)
- **Direct contradiction**: no two cards whose implications invalidate each other if both accepted
- **Diagnosis redundancy**: no two cards redundantly target the same diagnosis finding with overlapping mechanisms — prune the lower-scoring card

Record into the batch manifest's Phase 7d check trace: which card pairs were tested, which passed, which triggered 7e action.

Fail triggers (→ 7e):
- card A + card B jointly answer MR-XXXX's `what_is_unknown`
- card A and card B directly contradict
- two cards redundantly address the same diagnosis finding

**Rule**: The batch is a design choice set. Collisions hide behind per-card safety; 7d is where jointly-forbidden outcomes are caught.

### Phase 7e: Repair Sub-Pass

If any of 7a/7b/7c/7d fails, repair in order of least destructive:
1. **Narrow `recommended_scope`** (e.g., global → regional; public → restricted_group).
2. **Reclassify `proposed_status`** (hard_canon → soft_canon; soft_canon → contested_canon).
3. **Add a stabilizer** — rephrase `canon_fact_statement` to include a cost, bottleneck, or why-not-universal mechanism.
4. **Drop the card from the batch**. Record the drop in the batch manifest; if the card's Phase-6 slot becomes empty, loop back to Phase 3 to regenerate a replacement seed **for that slot only** (not the whole batch).
5. **Loop to Phase 3 with batch-wide regeneration** — only if drop + single-seed regeneration cannot recover.

Every repair applied is recorded in the relevant card's `notes` field as `Phase 7e repair: <check-id> — <repair-type> — <justification>`.

**Rule**: Repairs must preserve the generative intent of the diagnosis finding. A repair that strips a card of all narrative function is equivalent to a drop.

**FOUNDATIONS cross-ref**: Rule 3 (No Specialness Inflation) — stabilizers at 7e must name concrete mechanisms.

## Phase 8: Validation and Rejection Tests

Run all 10 tests. Each records PASS / FAIL with a one-line rationale into the batch manifest's Canon Safety Check Trace. Any FAIL halts and loops to the responsible phase. Do NOT proceed to Phase 9 until all pass.

**Per-card tests** (run over every card):
1. **(Rule 2, Phase 5)** Each card's `canon_fact_statement` materially changes at least one of the 14 domains listed in FOUNDATIONS Rule 2 (labor / embodiment / social norms / architecture / mobility / law / trade / war / kinship / religion / language / status signaling / ecology / daily routine). A card that changes none is pure flavor; fail.
2. **(Rule 3, Phase 7c + 7e)** Each capability card has populated `recommended_scope`, `why_not_universal`, and `integration_burden`. No hand-wave stabilizers.
3. **(Rule 4, Phase 7c)** No capability card has `recommended_scope: global` without explicit `why_not_universal` referencing ontology or infrastructure.
4. **(Rule 5, Phase 3 + Phase 6 template)** Each card populates `immediate_consequences` AND `longer_term_consequences` AND `likely_required_downstream_updates`. No blank consequence fields.
5. **(Rule 7, Phase 7b)** Each card's `canon_safety_check.mystery_reserve_firewall` lists every MR entry checked, with overlap status documented in the Trace prose. Empty firewall + non-empty MR = fail.
6. **(Rule 7, Phase 7b)** No card's `canon_fact_statement` or consequences match any MR entry's `disallowed_cheap_answers`.

**Batch-level tests**:
7. **(Phase 6)** Every slot intended to be filled per `batch_size` selection is either filled or explicitly marked empty with a rationale. No silent gaps.
8. **(Phase 7d)** The batch manifest's Phase 7d trace lists every card-pair tested. Empty trace when batch has ≥2 cards = fail.
9. **(Phase 5 audit)** The batch manifest's rejected-seed log contains every seed rejected at Phase 5 with the trigger cited.
10. **(Schema completeness)** No card or batch manifest frontmatter field is left as TODO, placeholder, or empty where the schema requires content.

Recording format per test (in the batch manifest):

```
- Test N (Rule R / topic): PASS — <one-line rationale>
```

A PASS without rationale is treated as FAIL. The recorded trace is what the user reads at Phase 9 HARD-GATE; absent or undocumented validation breaks the audit trail.

## Phase 9: Commit

Present the deliverable summary:
1. Full batch: every surviving card's frontmatter + body
2. Batch manifest: diagnosis dossier, Phase-6 diversification audit, Phase 7d check trace, Phase 5 rejected-seed log, Phase 7e repair log
3. Canon Safety Check Trace (10 Phase-8 test results with rationales)
4. Target write paths: `worlds/<world-slug>/proposals/PR-NNNN-<slug>.md` (per card), `worlds/<world-slug>/proposals/batches/BATCH-NNNN.md`, `worlds/<world-slug>/proposals/INDEX.md`

**HARD-GATE fires here**: no file is written until the user explicitly approves. User may (a) approve as-is, (b) approve with a drop-list of card-IDs to exclude, (c) request specific revisions (loop to named phase), (d) reject and abort.

### Drop-list behavior

If the user's Phase 9 approval includes a drop-list:

- **Surviving cards retain their originally-allocated PR-NNNN IDs**. No renumbering. Dropped PR-NNNN IDs become permanent gaps in the monotonic sequence — pre-flight on the next batch scans existing cards for `highest_pr`, adds 1, and does not reuse the dropped IDs. Retention preserves audit-trail traceability between Phase 3 seeds, Phase 4/5/7 traces, and the manifest's `dropped_card_ids` entries; renumbering would break cross-references inside the manifest body.
- **Slots formerly filled by dropped cards become empty in the Phase 6 Diversification Audit** table of the written manifest, with `user-drop at Phase 9` cited as the rationale. No regeneration fires; empty-slot discipline (see Guardrails §Empty slots in a batch are features, not bugs) applies. The empty slot is a diagnostic signal that the user chose to defer that enrichment slot for this batch — a future batch or a targeted single-card run can fill it if desired.
- **Phase 7d trace in the written manifest covers all card-pairs tested at generation time, including pairs involving dropped cards**. Dropped-pair results are retained as audit evidence that the full batch passed 7d before the drop-list was applied. The manifest may additionally present a surviving-pair sub-trace for quick reading, but the full trace is the proof-of-work.
- **Phase 5 Rejected-Seed Log is not affected by drops**. Drops are editorial selection at Phase 9, not Phase 5 rejection. The `dropped_card_ids` frontmatter field is the audit trail for drops; the `Phase 5 Rejected-Seed Log` remains the audit trail for generation-time rejections. Do not merge the two.

On approval, write in this order — sequencing matters because the tool environment cannot guarantee transactional atomicity, and a deterministic order makes partial-state recovery tractable:

1. **Each non-dropped card first**: `worlds/<world-slug>/proposals/PR-NNNN-<slug>.md`. Set `source_basis.user_approved: true` on each card immediately before its write. This is the moment of card commitment; a card's `user_approved: true` means it was reviewed and kept in the batch, NOT that it has been accepted as canon.
2. **Batch manifest second**: `worlds/<world-slug>/proposals/batches/BATCH-NNNN.md` with `dropped_card_ids` populated from the user's drop-list and `user_approved: true`. Create the `batches/` directory if absent.
3. **INDEX.md last**: read existing file (create with header `# Proposal Cards — <World-Slug-TitleCased>` followed by a blank line if absent), append one line per non-dropped card in the form `- [<title>](PR-NNNN-<slug>.md) — <proposed_status> / <type> / <enrichment_category>, batch BATCH-NNNN`, sort by PR-NNNN ascending, write back.

Cards-first sequencing means a partial-failure state has either cards-without-index (detectable by grepping INDEX.md for card slugs) or a manifest-without-INDEX-row (detectable by grepping INDEX.md for the batch). **Recovery is manual**, not automatic: either manually update INDEX.md to add missing rows, or delete the orphaned files and re-run the skill with the same parameters (which allocates fresh IDs).

Report all written paths. Do NOT commit to git.

## Validation Rules This Skill Upholds

- **Rule 2: No Pure Cosmetics** — Phase 5 (trigger 5 rejects aesthetic flourishes) + Phase 6 card template (every card populates `domains_touched`) + Phase 8 Test 1 (14-domain check on each card's statement).
- **Rule 3: No Specialness Inflation** — Phase 4 scoring (`integration_burden` weighted against gain) + Phase 5 (trigger 2 rejects universalized rare powers) + Phase 7c (`why_not_universal` required for capability cards) + Phase 7e (repairs add concrete stabilizers, no hand-waves) + Phase 8 Test 2.
- **Rule 4: No Globalization by Accident** — Phase 7c (`recommended_scope` + `why_not_universal` required; rumor carve-out explicit) + Phase 7e (narrowing is the least-destructive repair) + Phase 8 Test 3.
- **Rule 5: No Consequence Evasion** — Phase 3 generation prompts favor multi-fact connections + Phase 6 card template requires `immediate_consequences` + `longer_term_consequences` + `likely_required_downstream_updates` + Phase 8 Test 4.
- **Rule 7: Preserve Mystery Deliberately** — Phase 5 (trigger 3 rejects overexplained mysteries) + Phase 7b (per-card firewall with inverted check for Family J) + Phase 7d (batch-level joint-closure detection) + Phase 8 Tests 5–6.

## Record Schemas

- **Proposal Card** → `templates/proposal-card.md` (hybrid YAML frontmatter + markdown body; original to this skill). Frontmatter fields: `proposal_id`, `batch_id`, `slug`, `title`, `canon_fact_statement`, `proposed_status` (`hard_canon` | `soft_canon` | `contested_canon` | `mystery_reserve` | `invariant_revision` — note: no separate `derived_canon` status; FOUNDATIONS's Derived Canon layer is represented by populating `source_basis.derived_from_cfs` with parent CFs while using `hard_canon` or `soft_canon` per the derivation's layer weight. The derivation audit trail is the field, not the status), `type` (capability | artifact | law | belief | event | institution | species | ritual | taboo | technology | resource_distribution | hidden_truth | local_anomaly | metaphysical_rule), `enrichment_category` (A–J), `proposal_family` (1–10), `domains_touched`, `recommended_scope` (geographic / temporal / social), `why_not_universal`, `scores` (coherence, propagation_value, story_yield, distinctiveness, ordinary_life_relevance, mystery_preservation, integration_burden, redundancy_risk — each 1–5), `score_aggregate`, `immediate_consequences`, `longer_term_consequences`, `likely_required_downstream_updates`, `risks`, `canon_safety_check` (with `invariants_respected`, `mystery_reserve_firewall`, `distribution_discipline.canon_facts_consulted`), `source_basis` (with `world_slug`, `batch_id`, `generated_date`, `user_approved`, `derived_from_cfs`), `notes`. Markdown body sections: What It Deepens, Why It Fits This World, Immediate Consequences (prose), Longer-Term Consequences (prose), Risks, Likely Burden If Accepted, Likely Story Yield, Would This Be Better As, Canon Safety Check Trace.

- **Batch Manifest** → `templates/batch-manifest.md` (hybrid YAML frontmatter + markdown body; original to this skill). Frontmatter fields: `batch_id`, `world_slug`, `generated_date`, `parameters` (with `batch_size`, `novelty_range`, `enrichment_types`, `taboo_areas`, `upstream_audit_path`), `diagnosis_summary`, `card_ids`, `dropped_card_ids`, `user_approved`. Markdown body sections: Diagnosis Dossier, Enrichment Targets, Seed Generation Log, Phase 4 Score Matrix, Phase 5 Rejected-Seed Log, Phase 6 Diversification Audit (slot × card table), Phase 7d Batch-level Check Trace, Phase 7e Repair Log, Phase 8 Test Results.

No Canon Fact Record emitted. No Change Log Entry emitted. This skill does not mutate world-level canon.

## FOUNDATIONS Alignment

| Principle | Phase | Mechanism |
|-----------|-------|-----------|
| Tooling Recommendation (non-negotiable) | Pre-flight | `docs/FOUNDATIONS.md` + all 12 world files loaded unconditionally (`MAGIC_OR_TECH_SYSTEMS.md` included) before any diagnosis/generation/filter phase |
| Canon Layers §Hard / Soft / Contested / Mystery Reserve | Phases 6, 7 | Each card declares `proposed_status`; 7a respects invariants; 7b firewalls MR; Family J opens new MR entries rather than closing old ones |
| Canon Layers §Derived Canon | Phases 3, 4, 6 | Seed generation + scoring's `propagation_value` favor seeds deriving from existing facts; card's `source_basis.derived_from_cfs` cites parent CFs explicitly |
| Ontology Categories | Phases 2, 6 | Enrichment categories map to ontology categories via card's `type` field |
| Invariants §full schema | Phases 7a, 7e | Every invariant tested; `break_conditions` and `revision_difficulty` guide 7e repairs; explicit `invariant_revision` pathway for proposals that legitimately propose revisions |
| Canon Fact Record Schema | Phase 6 | Card frontmatter is structurally compatible with the CF Record Schema — `canon-addition` accepting a card can emit a CF that borrows the card's fields rather than re-deriving them |
| Rule 1 (No Floating Facts) | Phases 6, 8 | Card template requires `domains_touched`, `recommended_scope`, `why_not_universal`, `immediate_consequences`, `longer_term_consequences`, `likely_required_downstream_updates` — the Rule 1 required-field set — enforced by Phase 8 Tests 1-4 |
| Rule 2 (No Pure Cosmetics) | Phases 5, 6, 8 | Phase 5 trigger 5 + Phase 6 `domains_touched` + Phase 8 Test 1 (14-domain check) |
| Rule 3 (No Specialness Inflation) | Phases 4, 5, 7c, 7e, 8 | Scoring penalty + Phase 5 trigger 2 + `why_not_universal` + concrete-mechanism repairs + Test 2 |
| Rule 4 (No Globalization by Accident) | Phases 7c, 7e, 8 | `recommended_scope` + `why_not_universal` + narrowing repairs + Test 3 |
| Rule 5 (No Consequence Evasion) | Phases 3, 6, 8 | Multi-fact seed preference + both-order consequences + downstream updates + Test 4 |
| Rule 6 (No Silent Retcons) | N/A | Not applicable — canon-reading skill emits no Change Log Entry. Retcon discipline is `canon-addition`'s responsibility when a card is accepted and its Change Log Entry is emitted there. |
| Rule 7 (Preserve Mystery Deliberately) | Phases 5, 7b, 7d, 8 | Phase 5 trigger 3 + per-card firewall with inverted check for Family J + batch-level joint-closure + Tests 5–6 |
| World Kernel §Tonal Contract | Phases 4, 5 | Scoring's `coherence` dimension + Phase 5 trigger 7 (tonal contract break) |
| World Kernel §Core Pressures | Phase 6 | Diversification slot priority references world's core pressures |
| Change Control Policy | N/A | Not applicable — canon-reading skill; Change Log Entry is `canon-addition`'s responsibility when a card is accepted. |

## Guardrails

- This skill operates on **exactly one existing world** per invocation. It never creates a new world (that is `create-base-world`'s job), never modifies `docs/FOUNDATIONS.md`, never touches other worlds, never touches `archive/` or `brainstorming/`.
- This skill **never writes to world-level canon files** — not `WORLD_KERNEL.md`, `INVARIANTS.md`, `ONTOLOGY.md`, `TIMELINE.md`, `GEOGRAPHY.md`, `PEOPLES_AND_SPECIES.md`, `INSTITUTIONS.md`, `ECONOMY_AND_RESOURCES.md`, `MAGIC_OR_TECH_SYSTEMS.md`, `EVERYDAY_LIFE.md`, `CANON_LEDGER.md`, `OPEN_QUESTIONS.md`, or `MYSTERY_RESERVE.md`. All writes are confined to `worlds/<world-slug>/proposals/` (card files, `batches/` subdirectory, and `INDEX.md`).
- All reads and writes are rooted at `worlds/<world-slug>/` or at the user-provided `parameters_path` / `upstream_audit_path`. Repo-root writes are forbidden.
- This skill **proposes candidates; it does not canonize them**. Every emitted card is a candidate for `canon-addition`'s separate adjudication. A card's existence on disk is NOT equivalent to accepted canon. Downstream users (both human and other skills) must verify a proposal card's `source_basis.user_approved: true` refers to *review approval for inclusion in the batch*, not to canon acceptance.
- If a pre-flight `next_batch_id`, `next_pr_id`, or `<slug>.md` would collide with an existing file, the skill aborts. Never overwrite an existing card, batch manifest, or INDEX row. Once written, a card is treated as existing proposal state; re-running with the same parameters produces a new `BATCH-NNNN` and new `PR-NNNN` IDs.
- **Interop seam with `canon-addition` is one-way, deliberate, and card-level**: this skill produces candidate cards; `canon-addition` consumes one card at a time (via `proposal_path`). This skill does not batch-submit cards to `canon-addition`, does not assume adjudication will succeed, and does not update its cards after adjudication. Adjudication outcomes are `canon-addition`'s territory; stale cards are the operator's cleanup concern, not this skill's.
- **Interop with future `continuity-audit` skill** is structural: `parameters_path` may declare an `upstream_audit_path` pointing to the audit report. If that sibling lands and changes its output format, this skill's Phase 1 merge logic adapts; the argument surface does not change.
- Phase 7b (per-card Mystery Reserve firewall) and Phase 7d (batch-level joint-closure check) are the two Rule 7 enforcement points. A future maintainer adding a phase that exposes cards to Mystery Reserve content between Phase 6 and Phase 8 must either extend both checks or explicitly classify the phase as out-of-scope for Rule 7 (documented in the batch manifest notes).
- **Empty slots in a batch are features, not bugs**. Phase 6's empty-slot discipline surfaces diagnostic signals about the world; the HARD-GATE deliverable summary names empty slots explicitly. Filling a slot with a lower-scoring card just to avoid the empty state is forbidden — that would hide diagnosis information the user needs.
- Worktree discipline: if invoked inside a worktree, all paths resolve from the worktree root (so `worlds/<slug>/proposals/` is under the worktree, not the main repo).
- Do NOT commit to git. Writes land in the working tree only; the user reviews and commits.
- The HARD-GATE at the top of this file is absolute. No `Write` or `Edit` to `worlds/<world-slug>/proposals/` until Phase 7 Canon Safety Check passes clean, Phase 8 validation tests pass clean, AND the user approves the Phase 9 deliverable summary (including any drop-list). Auto Mode does not override this — skill invocation is not deliverable approval.

## Final Rule

A proposal batch is not written until every card has a `recommended_scope`, a `why_not_universal` (or explicit rumor scope), both orders of consequences, a complete Mystery Reserve firewall audit, and an invariant-conformance trace; the batch has a diagnosis dossier, a diversification audit, and a batch-level collision trace; and the user has approved the complete deliverable — and once written, each card is a candidate for `canon-addition`'s separate adjudication, not canon itself.
