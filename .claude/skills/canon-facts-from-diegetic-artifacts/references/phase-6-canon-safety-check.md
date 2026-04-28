# Phase 6: Canon Safety Check

Load this reference when entering Phase 6 to run the five-layer canon safety check across surviving cards.

## Overview

Five sub-checks run per card (6a-6d) then one batch-level check (6e). Any fail triggers Phase 6f Repair Sub-Pass. Every sub-check's result is recorded in the card's `canon_safety_check` frontmatter block; Phase 7 Test T5 verifies completeness.

## 6a. Per-card Invariant Conformance

Test against every INV record retrieved into the packet; expand via `mcp__worldloom__search_nodes(node_type='invariant')` then `mcp__worldloom__get_record(<INV-id>)` if a card implicates an invariant not in the packet. Record tested invariant ids in `canon_safety_check.invariants_respected` (pass) or `invariants_violated` (fail).

The sibling skill's `invariant_revision` status exception does NOT fire in this skill — a card requiring invariant revision must route to flagged-contradictions at Phase 2 (with R12 as Phase 5 safety net), never emit. Mining is a candidate-gathering operation, not a retcon-proposing operation.

## 6b. Per-card Mystery Reserve Firewall

Iterate every M record retrieved into the packet and record overlap status in `canon_safety_check.mystery_reserve_firewall`; expand via `mcp__worldloom__get_firewall_content(world_slug)` if a card implicates an MR entry not in the packet, using `mcp__worldloom__get_record('M-NNNN')` only when full M-record context is needed beyond the firewall projection. Every MR id is recorded, overlap or not — an absent id is indistinguishable from an un-checked id, which Phase 7 Test T5 will flag as incomplete.

**Bulk firewall retrieval**: prefer `mcp__worldloom__get_firewall_content(world_slug)` for the audit's projection step — one call returns every M record's `disallowed_cheap_answers`, `common_interpretations`, `unknowns`, `status`, and `title`. Fall back to `mcp__worldloom__get_record('M-NNNN')` per id when full M-record context (`notes`, `extensions`, `modification_history`) is needed.

Decision rule per entry:
- **Card overlaps an MR entry's forbidden-answer set** → reject.
- **Card narrows or shapes an MR entry without resolving it** → allowed (this is the productive-shaping pathway).
- **Card does not touch the MR entry** → record `overlap: false` with a one-line note.

## 6c. Per-card Distribution Discipline

Validate `recommended_scope` + `why_not_universal` conformance per FOUNDATIONS Rule 4.

- **`proposed_status = hard_canon` with `geographic: global`**: each `why_not_universal` entry must cite concrete CF ids (resolved via `mcp__worldloom__get_record`) or `SEC-*` atomic-record prose (`mcp__worldloom__search_nodes(node_type='section', filters={file_class: ...})` then `get_record`). Without citations, the scope is a bare assertion and 6c fails.
- **`proposed_status = soft_canon`**: scope must name the author's region or institution, cross-referenced against `SEC-GEO-*` or `SEC-INS-*` atomic records (retrieve via `mcp__worldloom__search_nodes(node_type='section', filters={file_class: 'geography'})` or `filters={file_class: 'institutions'}` then `get_record`) so a reviewer can verify the scope's real-world anchor.
- **`proposed_status = contested_canon`**: scope typically `social: restricted_group` (the sect / faction / minority holding the belief); `why_not_universal` names why the broader population does NOT hold it.
- **Rumor carve-out**: `social: rumor` does not require `why_not_universal` — rumors are definitionally distribution-constrained.

Record CFs consulted in `canon_safety_check.distribution_discipline.canon_facts_consulted`.

## 6d. Per-card Diegetic-to-World Laundering Firewall

This mining-specific CSC layer is absent from the sibling skill. Three sub-tests per card:

### 6d.1 Evidence-breadth test

Can the fact be inferred from existing world state independent of this artifact? Cross-reference CF records (`mcp__worldloom__search_nodes(node_type='canon_fact', filters={domain: ...})` then `mcp__worldloom__get_record`), `SEC-*` atomic-record prose (`search_nodes(node_type='section', filters={file_class: ...})` then `get_record`), and other diegetic artifacts on disk.

Three pathways:

- **Full support (`pass`)**: the fact is already partially or fully inferrable from world state; the artifact corroborates but is not sole source. `proposed_status: hard_canon` is defensible against evidence-breadth. Record independent evidence (CF ids or domain-file prose) in `independent_evidence`.
- **Partial support + specification (`partial`)**: existing CFs commit the mechanic partially, and the card specifies operational detail not yet in canon (e.g., a CF establishes CF-0036 silence-protocol existence; the card specifies the ritual form of the clergy-witness recital during protocol application). The artifact is the sole source FOR THE SPECIFICATION but not for the underlying mechanic. `proposed_status` is appropriately `soft_canon` with adjudication-appetite explicitly flagged higher than pure sole-source. Record the partial-supporting CFs in `independent_evidence` and note the specification-delta in `rationale`.
- **Sole source (`fail`)**: no existing CF or domain-file prose commits the mechanic; the artifact is the sole source. `proposed_status` MUST be `soft_canon` or `contested_canon` (or card rejected). If Phase 3 mapped to `hard_canon`, Phase 6f repair demotes or rejects.

The three-pathway framing matters at Phase 4 scoring calibration: pure-sole-source candidates should score lower on `coherence` (typically 3-4) and higher on `redundancy_risk` (typically 2-3 not 1) than partial-support candidates (coherence 5, redundancy_risk 1-2). This gives visible score-level differentiation inside a batch where all cards map to `soft_canon` by evidence-breadth.

### 6d.2 Epistemic-horizon test

Is the claim within the author's plausible reach? Consult `SEC-PAS-*` atomic records (species-typical capability + embodiment), `SEC-GEO-*` atomic records (author's mobility + region), `SEC-INS-*` atomic records (author's institutional access + taboos) — retrieve each set via `mcp__worldloom__search_nodes(node_type='section', filters={file_class: 'peoples-and-species' | 'geography' | 'institutions'})` then `mcp__worldloom__get_record` selectively — and any author dossier lifted via the artifact's frontmatter `author` binding.

- **Within horizon** → pass. Record consulted files in `author_position_consulted`.
- **Outside horizon** → Phase 6f repair: narrow scope (the author can speak only to their own region/institution, not the broader claim), OR reclassify as contested_canon (the author reports what they heard, not what they knew), OR reject.

### 6d.3 Mystery Reserve positional check

Does the author's world-position + the claim's content put them in a position to have known an MR forbidden answer?

- **No** → pass.
- **Yes** → reject card + flag prominently in batch manifest `mr_positional_flags`. **This is a HARD-GATE visible signal** — the user must see that the artifact's author is a potential MR leakage vector before approving any other cards from this batch. A positional flag is an AUTHOR-LEVEL warning, not a card-level warning; it should raise caution for mining OTHER artifacts from the same author.

#### Worked examples (6d.3 reasoning pattern)

- **Author X = CF-0024 contractor-veteran; claim engages M-5 (sentience-as-artifact-effect forbidden)**. Contractor-veterans are not in civic-archive, progenitor-cult lineage-keeper, or Maker-mystic-sectarian positions; their claims concern chartered-body operational mechanics. X is not positioned to access M-5 cosmological territory → **PASS** (no positional overlap).
- **Author Y = chartered ruin-expedition authentication-specialist; claim engages M-8 (guardian-construction mechanism)**. Y's chartered specialization places Y close to guardian-encounter territory; authentication specialists are named in CF-0029 notes as the institutional readers of guardian craft-signatures. If Y's claim touches mechanism (not just observed-behavior), **6d.3 fires** — the positional vulnerability is real. Reject card; flag Y as a potential MR leakage vector for future mining.
- **Author Z = Maker-mystic sectarian pamphleteer; claim engages M-1 (Maker cause-of-fall)**. Z's sectarian position is specifically doctrinal-cosmological — positional access to M-1 territory is by definition. Even a claim that merely *shapes* M-1 interpretation risks positional leakage because Z's voice would itself narrow the bounded-unknown. Reject card; flag Z with elevated caution.
- **Author W = unchartered itinerant bard; claim engages M-7 (occult-fallout specialist reputation-genealogy)**. W's bardic narrative-custody position is a co-creator of M-7's contestation — bardic accretion IS one of the four contested readings. W can contribute to M-7's shape without resolving it. Record `partial overlap; shaping allowed; bardic-custody is M-7's ordinary activity` → **PASS** with note.

The pattern: 6d.3 asks (a) does the author's world-position grant them ordinary access to the MR's forbidden-answer territory, and (b) does the claim's specific content trespass into that territory? PASS requires at least one "no"; FAIL requires both "yes."

## 6e. Batch-level Check

Three batch-wide tests over surviving cards:

- **Joint-closure**: no two cards jointly resolve one MR entry that neither alone would. Iterate all C(N,2) card-pairs against each MR entry. Any hit → drop one card via 6f.
- **Mutual-contradiction**: no two cards assert incompatible facts. Iterate all C(N,2) card-pairs. Any hit → drop one card via 6f.
- **Single-narrator concentration**: if **> 3** cards hinge on the artifact's sole testimony (i.e., fail 6d.1 individually but pass via `proposed_status` demotion), flag in manifest `single_narrator_concentration_flag` with count + per-card contribution. Not auto-reject; HARD-GATE surfaces this. If **> 6** sole-testimony cards (i.e., 7 or more), loop to Phase 3 with user decision. The 4-6 range is flag-only; 7+ triggers loop.

  **Post-drop-list re-evaluation.** After Phase 8 HARD-GATE drop-list application, re-evaluate the concentration count against the post-drop card count before final manifest write. If the post-drop count falls below the 4-card flag threshold, set `triggered: false` and record both counts in the `rationale` field (e.g., "pre-drop count 5 in 4-6 flag band; post-drop count 3 sub-threshold after user-drop of PR-NNNN, PR-MMMM"). If the post-drop count remains in the 4-6 band, leave `triggered: true` with the updated count and an analogous rationale. Do NOT preserve a pre-drop `triggered: true` with a sub-threshold count — that state is internally contradictory. Joint-closure and mutual-contradiction checks may be left in their pre-drop evaluation state, since dropping cards can only REDUCE pair-coverage and cannot introduce new hits; dropped-pair results are retained as audit evidence per existing drop-list behavior (see `phases-7-8-validate-and-commit.md` Drop-list behavior).

## Phase 6f Repair Sub-Pass

Fires on any 6a-6e fail. Four repair types, applied in preference order:

1. **Narrow scope** — tighten `recommended_scope` (e.g., `regional` → narrower region; `social: public` → `restricted_group` or `rumor`) to resolve distribution-discipline or epistemic-horizon failures.
2. **Reclassify** — demote `hard_canon` → `soft_canon` or reclassify as `contested_canon` to resolve 6d.1 sole-source failures or propagandistic-register horizon failures.
3. **Add stabilizer** — append a `why_not_universal` entry or a `costs_and_limits` entry that addresses the specific failure.
4. **Drop card** — remove from batch; record reason in batch manifest `dropped_card_ids` with per-card rationale.

If a repair does not resolve the failure: **Unrepairable** — loop to Phase 3 for the flagged candidate with a note on what Phase 6 rejected. **After 2 loop attempts, unrepairable candidates become drop-only.** Do not loop indefinitely.

Every repair recorded in `canon_safety_check.repairs_applied` per card, duplicated to batch manifest Phase 6f Repair Log.
