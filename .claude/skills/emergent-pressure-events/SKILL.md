---
name: emergent-pressure-events
description: "Use when generating candidate emergent-pressure-event cards for an existing worldloom world — diversified batches representing what the world is doing right now under its existing pressures. Produces: pressure-event cards at worlds/<world-slug>/pressure-events/EPE-NNNN-<slug>.md + canonize-routed sidecar proposal cards at worlds/<world-slug>/pressure-events/EPE-NNNN-<slug>.proposal.md + batch manifest at worlds/<world-slug>/pressure-events/batches/BATCH-NNNN.md + auto-updated pressure-events/INDEX.md. Mutates: only worlds/<world-slug>/pressure-events/ (never WORLD_KERNEL.md, ONTOLOGY.md, or any _source/ atomic record). Each canonize-routed card's sidecar path is directly consumable as canon-addition's proposal_path."
user-invocable: true
arguments:
  - name: world_slug
    description: "Directory slug of an existing world under worlds/<world-slug>/. Pre-flight aborts if the directory is missing."
    required: true
  - name: parameters_path
    description: "Path to an optional markdown file declaring: batch_size (default 5); novelty_range (conservative / moderate / bold); origin_type focus list (subset of the 14-value origin_type taxonomy; empty = unrestricted); taboo_areas (free-form); current_date / season override (default: today's date). If omitted, Phase 0 interviews the user."
    required: false
---

# Emergent Pressure Events

Generates a diversified batch of candidate pressure-event cards for an existing worldloom world — events the world's existing pressures plausibly produce right now, traceable to specific CFs, routed canonize / story_fuel / ambient with explicit rationale. Pre-flight loads world state via `mcp__worldloom__get_context_packet(task_type='other', ...)` (registered profile is a deferred MCPENH ticket) plus direct reads of FOUNDATIONS / WORLD_KERNEL / ONTOLOGY; per-record retrieval pulls atomic CF / INV / M / OQ / SEC records on demand via `search_nodes` / `get_record`; surviving cards write direct-Edit on hybrid files (pressure-events are NOT canon — Hook 3 hybrid-file allowlist permits the writes). Each canonize-routed card's sidecar path is directly consumable as `canon-addition`'s `proposal_path` for separate adjudication.

<HARD-GATE>
Do NOT write any file — pressure-event card, sidecar proposal card, batch manifest, INDEX.md update — until: (a) pre-flight resolves `worlds/<world-slug>/`, allocates the next `BATCH-NNNN` via `mcp__worldloom__allocate_next_id`, and loads the context packet plus FOUNDATIONS / WORLD_KERNEL / ONTOLOGY; (b) Phase 4 Traceability Anchoring has dropped every untraceable seed (slot left empty as diagnostic signal); (c) Phase 6 Canon Safety Check passes for every surviving card with zero unrepaired violations; (d) Phase 7 Validation Tests pass with zero failures at both per-card and batch levels; (e) the user has explicitly approved the Phase 8 deliverable summary (full batch + pressure inventory + diversification audit + Canon Safety Check Trace + sidecar `proposal_card_extract` previews for every canonize-routed card + any 6e repairs + any drops). The user's approval may include a drop-list of card-IDs to exclude; dropped cards are never written, and dropped cards' sidecars are never emitted. This gate is absolute under Auto Mode — invoking the skill is not deliverable approval.
</HARD-GATE>

## Process Flow

```
Pre-flight (allocate_next_id BATCH; get_context_packet for world state;
            direct Read FOUNDATIONS + WORLD_KERNEL + ONTOLOGY;
            list existing pressure-events/ pool for recurrence detection)
      |
      v
Phase 0:    Normalize Generation Parameters (parse OR interview)
      |
      v
Phase 1:    Pressure Inventory
            (enumerate active pressures from world-state via search_nodes /
             get_record over atomic _source/ records; cite each pressure to
             its source CF / SEC / M / OQ id)
      |
      v
Phase 2:    Origin-Type Mapping
            (cluster pressures across the 14-value origin_type taxonomy;
             map to 5-slot diversification grid; empty-slot discipline applies)
      |
      v
Phase 3:    Seed Generation
            (1-3 seeds per slot; allocate EPE-NNNN per seed via allocate_next_id)
      |
      v
Phase 4:    Traceability Anchoring
            (every seed cites >=1 CF-NNNN; untraceable seeds DROPPED — slot
             becomes empty as diagnostic signal; no regeneration)
      |
      v
Phase 5:    Routing Decision + Sidecar Pre-validation
            (per-card downstream_routing + routing_rationale;
             canonize-routed cards build proposal_card_extract block
             pre-validated for sidecar emission)
      |
      v
Phase 6:    Canon Safety Check
            6a Per-card Invariant Conformance (every INV record in packet)
            6b Per-card Mystery Reserve Firewall (every M record;
               ambient routing auto-rejected if mystery-edge touched)
            6c Per-card Distribution Discipline
               (scope.geographic + why_not_universal; rumor carve-out)
            6d Batch-level (joint-MR-resolution + direct-contradiction +
               redundant-origin_type detection)
            --any fail--> 6e Repair Sub-Pass
                          (narrow / reclassify / add_costs / drop / regenerate-slot)
      |
      v
Phase 7:    Validation Tests (8 tests; PASS/FAIL with one-line rationale)
      |
      v
Phase 8:    HARD-GATE deliverable summary --> on approval, direct-Edit
            cards + sidecars (canonize routing only) + batch manifest + INDEX.md
            (hybrid-file allowlist)
```

## Inputs

### Required

- `world_slug` — directory slug of an existing world (`worlds/<world_slug>/`). Pre-flight aborts on missing.

### Optional

- `parameters_path` — markdown file path for batch parameters. Schema:
  - `batch_size` (default 5; >=1)
  - `novelty_range` (conservative / moderate / bold; default moderate)
  - `origin_type_focus` (subset of the 14-value origin_type taxonomy; empty = unrestricted)
  - `taboo_areas` (free-form list of pressures or domains to exclude)
  - `current_date` (ISO date; default today's date)
  - `current_season` (free-form; default derived from current_date if the world has a calendar declaration in WORLD_KERNEL or ONTOLOGY, else null)

  Omitted → Phase 0 interview.

## Output

- **Pressure-event cards** at `worlds/<world-slug>/pressure-events/EPE-NNNN-<slug>.md` — one hybrid YAML-frontmatter + markdown-body file per surviving card. Frontmatter shape per `templates/pressure-event-card.md`.
- **Sidecar proposal cards** at `worlds/<world-slug>/pressure-events/EPE-NNNN-<slug>.proposal.md` — one hybrid file per **canonize-routed** card only. Frontmatter is byte-parallel to `propose-new-canon-facts/templates/proposal-card.md` (with `proposal_id` = freshly-allocated `PR-NNNN`, `source_basis.derived_from_cfs` populated from the parent EPE card's `traceability.cited_canon_facts`, `enrichment_category: derived_from_epe`, `proposal_family: 0`). Each sidecar's filesystem path is directly consumable as `canon-addition`'s `proposal_path`.
- **Batch manifest** at `worlds/<world-slug>/pressure-events/batches/BATCH-NNNN.md` — hybrid file per `templates/batch-manifest.md`. Frontmatter carries `batch_id`, `world_slug`, `parameters`, `card_ids`, `dropped_card_ids`, `sidecars_emitted`, `user_approved`. Body carries pressure inventory, origin-type mapping, seed log, Phase 4 drop log, diversification audit, Phase 6 trace, Phase 6e repair log, Phase 7 test results.
- **INDEX.md update** at `worlds/<world-slug>/pressure-events/INDEX.md` — partitioned by `status` (active / resolved / superseded), one line per non-dropped card sorted by EPE-NNNN within each partition. Created if absent.

**No canon-file mutations.** This skill never writes to `WORLD_KERNEL.md`, `ONTOLOGY.md`, or any `_source/<subdir>/*.yaml` record. Hook 3 enforces. No CF, CH, INV, M, OQ, ENT, or SEC record is emitted. Each card is a *candidate*; canonization happens only when `canon-addition` accepts the canonize-routed sidecar in a separate run.

## World-State Prerequisites

`docs/FOUNDATIONS.md`, `worlds/<slug>/WORLD_KERNEL.md`, and `worlds/<slug>/ONTOLOGY.md` load via direct `Read` (primary-authored at the world root; not in `_source/`). The atomic-record world-state slice loads via `mcp__worldloom__get_context_packet(task_type='other', seed_nodes=[<pressure-anchor seeds>], token_budget=15000)` per `docs/CONTEXT-PACKET-CONTRACT.md`. The `task_type='other'` choice is intentional and documented in §Guardrails: registering a dedicated `task_type='emergent_pressure_events'` profile is a deferred MCPENH ticket; the generic profile is sufficient for Phase 1 pressure inventory and Phase 6 Canon Safety Check, at the cost of a slightly broader / less prioritized load on every run. Pre-flight seeds the packet from a small set of high-pressure anchor nodes named in WORLD_KERNEL §Core Pressures plus any `parameters_path`-supplied origin_type_focus list.

For records the packet does not surface, retrieve on demand:

- `mcp__worldloom__get_record(record_id)` for a specific CF / CH / INV / M / OQ / ENT / SEC
- `mcp__worldloom__search_nodes(node_type=..., filters=...)` for domain-filtered scans (e.g., capability CFs whose distribution touches a candidate event's actors_involved cluster; recent CH records since the previous EPE batch's date)
- `mcp__worldloom__get_neighbors(node_id)` for the relation graph around a resolved entity (e.g., what institutions monopolize a contested resource named in a pressure)
- `mcp__worldloom__find_named_entities(names)` to resolve names from `parameters_path` or from prior EPE cards in the recurrence-detection scan

Direct `Read` of `_source/<subdir>/` is redirected to MCP retrieval by Hook 2 — do not bulk-read.

**Existing pressure-events pool — recurrence-detection load**: Pre-flight also lists `worlds/<slug>/pressure-events/EPE-*.md` to detect recurrence (the same origin_type firing repeatedly), escalation (a prior `ambient` card's pressure now triggering a `canonize` candidate), and supersession (a new card making a prior card's `status: active` → `superseded`). Listing-only, not a full Read; per-card content is loaded only when a candidate seed in Phase 3 textually overlaps with a prior card's slug or origin_type.

If `worlds/<world-slug>/` is missing, abort and instruct the user to run `create-base-world` first.

## Pre-flight Check

Runs before Phase 0. On any failure, abort before pipeline begins.

1. Normalize `world_slug` (strip `worlds/` prefix; verify `[a-z0-9-]+`).
2. Verify `worlds/<world-slug>/` exists. If absent, abort with the create-base-world instruction.
3. Allocate the batch id: `mcp__worldloom__allocate_next_id(world_slug, 'BATCH')` → `BATCH-NNNN`.
4. Load FOUNDATIONS + WORLD_KERNEL + ONTOLOGY via direct `Read`.
5. Load the context packet per §World-State Prerequisites with `seed_nodes` derived from `parameters_path.origin_type_focus` if present, else from a small set of high-pressure anchor nodes from WORLD_KERNEL §Core Pressures.
6. List `worlds/<slug>/pressure-events/EPE-*.md` (filenames + slug parsing only; no per-file Read) to populate the recurrence-detection registry. Empty pool is acceptable — first run.

## Procedure

### Phase 0: Normalize Generation Parameters

Parse `parameters_path` if provided. Else interview the user for: `batch_size` (default 5), `novelty_range` (conservative / moderate / bold; default moderate), `origin_type_focus` (subset of the 14-value taxonomy; empty = unrestricted), `taboo_areas`, `current_date` (default today), `current_season` (default null if no calendar declaration).

**Reject attempts to dictate specific events.** Parameters are search-space, not content. A `parameters_path` that names a specific event ("a plague hits the western city") is rejected with: "Phase 0 accepts pressure-space scoping, not pre-specified events; remove the dictated event and re-run."

### Phase 1: Pressure Inventory

Enumerate the world's currently-active pressures from atomic `_source/` records. Each enumerated pressure must cite at least one source-record id (CF / SEC / M / OQ / CH); pressures without record-citations are silently dropped (the pressure isn't actually in canon, so it can't seed events).

Drive enumeration via:

- `search_nodes(node_type='canon_fact', filters={status: 'hard_canon'})` — capability and resource-distribution CFs whose `costs_and_limits` or `visible_consequences` describe ongoing strain
- `search_nodes(node_type='section', filters={file_class: 'institutions'})` — institutions whose section text describes contestation or adaptive strain
- `search_nodes(node_type='section', filters={file_class: 'economy-and-resources'})` — scarcity gradients
- `search_nodes(node_type='mystery_reserve')` — mysteries-in-play whose `status: active` makes them current rumor-vectors
- `search_nodes(node_type='open_question')` — open questions touching distribution or institutional adaptation
- `search_nodes(node_type='change_log')` — recent CH entries since the prior batch's date (or since world creation if first batch)

Output: a structured **Pressure Inventory** with one entry per pressure, each shaped:

```yaml
- pressure_label: <short label>
  source_records: [CF-NNNN, SEC-INS-NN, M-NN, ...]
  pressure_type: scarcity | succession | ecological | taboo | ...   # one of the 14 origin_type values
  current_intensity: low | moderate | high
  recurrence_flag: <EPE-NNNN id from prior batches if same pressure_type fired before, else null>
```

### Phase 2: Origin-Type Mapping

Cluster the Pressure Inventory across the 14-value `origin_type` taxonomy. Map clusters to the **5-slot diversification grid**:

| Slot | Slot label | Acceptable origin_types |
|------|------------|-------------------------|
| 1 | Material pressure | scarcity, ecological_disruption, climate, trade_collapse |
| 2 | Social/political pressure | succession, faction_rivalry, migration |
| 3 | Ideological/ritual pressure | taboo_breach, theological_dispute, anniversary |
| 4 | Capability/economic edge | technology_leakage, black_market, relic_discovery |
| 5 | Public-health pressure | disease |

Slot assignment honors `parameters_path.origin_type_focus` (if present, restrict to listed types). Empty slots are preserved as diagnostic signals — **never substituted from another slot to fill the count**. The diversification audit names every empty slot at Phase 8.

### Phase 3: Seed Generation

For each non-empty slot, generate 1-3 seed events grounded in Pressure Inventory entries assigned to that slot. Each seed is a single sentence pairing one or more pressure-inventory entries with a concrete event-shape from the slot's `origin_type` set. Allocate `EPE-NNNN` per seed via `mcp__worldloom__allocate_next_id(world_slug, 'EPE')`.

Seeds inherit the pressure-inventory source records as **provisional traceability** — Phase 4 verifies and finalizes.

### Phase 4: Traceability Anchoring

For every seed, verify the proposal's Traceability Rule: at least one CF-NNNN id is cited. Optional fields (`cited_institutions`, `cited_material_conditions`, `cited_pressures`) populated from inventory entries.

**Drop-not-regenerate discipline.** Seeds whose provisional traceability resolves to zero CFs (e.g., a pressure entry that only cited SEC records, with no CF anchor) are **dropped**. The slot is marked empty for the diversification audit. Drops are logged to the batch manifest's Phase 4 Drop Log with: seed text, missing-anchor reason, slot label, dropped EPE-NNNN id.

Rationale: regenerating a seed against the same canon-thin slot will likely fail again; the empty slot is the diagnostic signal that the world's CF coverage of that origin_type is too thin for plausible event-seeding. The user reads this in Phase 8 and may follow up with `propose-new-canon-facts` to thicken the relevant domain.

### Phase 5: Routing Decision + Sidecar Pre-validation

For each surviving (non-dropped) card, assign `downstream_routing` ∈ {canonize, story_fuel, ambient} with `routing_rationale`:

- **canonize** — event implies a lasting world-level change (institutional / material / social) that other canon will rely on
- **story_fuel** — event creates a concrete pressure collision a protagonist could inherit; consequences are story-shaped but not world-truth-shaped
- **ambient** — routine fluctuation or seasonal change with non-empty consequence fields (per Rule 2; Phase 6b auto-rejects ambient cards that touch mystery-edge)

For **canonize-routed cards only**, build a `proposal_card_extract` block whose shape is byte-parallel to `propose-new-canon-facts/templates/proposal-card.md` frontmatter. Specifically:

- `proposal_id`: allocated via `mcp__worldloom__allocate_next_id(world_slug, 'PR')`
- `canon_fact_statement`: distilled single-sentence statement from the EPE event_seed (one canon-fact-shaped truth, not the multi-faceted event narrative)
- `proposed_status`: hard_canon | soft_canon | contested_canon (matches the event's stated permanence)
- `type`: capability | event | institution | etc. (per CF-schema type enum)
- `domains_touched`: derived from EPE `actors_involved` + `who_benefits` + `who_suffers`
- `recommended_scope`: `geographic` (from EPE `scope.geographic`) + `temporal` (derived from EPE `scope.temporal` mapped to CF temporal enum) + `social` (derived from `actors_involved` reach)
- `why_not_universal`: copied from EPE `scope.why_not_universal`
- `immediate_consequences`: copied from EPE `what_changes_immediately`
- `longer_term_consequences`: copied from EPE `what_might_change_if_unchecked`
- `enrichment_category: derived_from_epe`, `proposal_family: 0` — sentinel values signaling EPE-origin to `canon-addition`'s Phase 0 parser

The extract block is **pre-validated** here (every required PR-card field non-empty; type ∈ valid enum; recommended_scope all three axes populated). Pre-validation failures trigger Phase 6e repair (typically: card re-routed to story_fuel if the canon-fact-shape is too multi-faceted to extract). Sidecar files are NOT yet written — emission deferred to Phase 8 Commit.

For story_fuel and ambient routings, no `proposal_card_extract` is built; the field is null in the EPE card frontmatter.

### Phase 6: Canon Safety Check

Four sub-checks per the proposal's Canon Safety Check + 1 batch-level check + repair sub-pass.

**6a — Per-card Invariant Conformance.** For every card, test against every INV record in the loaded packet. For each invariant: does the card's event imply a fact incompatible with this invariant's statement? Pass / fail per invariant; record every tested invariant id into the card's `canon_safety_flags.invariants_tested` list (not just failed ones — full audit trail). On fail: card is either (a) rejected, (b) re-routed to `contested_canon`-flavored handling (canonize routing with `proposed_status: contested_canon`), or (c) re-scoped to `local` if the invariant violation is global-only.

**6b — Per-card Mystery Reserve Firewall.** For every card, test against every M record in the loaded packet — overlap or not. For each MR entry: does the card's event accidentally resolve, explain, contradict, or pre-empt a forbidden answer? Record every tested M id into the card's `canon_safety_flags.mystery_reserve_firewall` list. On fail with `status: forbidden` MR entries: card is dropped (no repair — forbidden-mystery violations cannot be narrowed). On fail with `status: active | passive` MR entries: card may add `mysteries_touched: [M-NN, ...]` and route `canonize` or `story_fuel` (per the proposal: "Events that brush against mystery (a high-value move) must be routed `canonize` or `story_fuel` with explicit `mysteries_touched` citation — never `ambient`"). Ambient routing on a card that touched any M record is **auto-rejected** at this sub-check.

**6c — Per-card Distribution Discipline.** For cards whose event implies institutional or capability change: `scope.geographic` non-null AND `scope.why_not_universal` non-empty. **Rumor carve-out**: if `actors_involved` reach is rumor-level only (no concrete actor named), `scope.geographic` may be `local` with `scope.why_not_universal: ["unverified rumor; geographic reach undefined"]`. Consult capability CFs in the packet via `search_nodes(node_type='canon_fact', filters={domain: <event_domain>})` to verify the event's distribution doesn't contradict an existing CF's `who_can_do_it` set.

**6d — Batch-level Light Check.** For every card pair (PR-A, PR-B):

- **Joint-MR-resolution check**: do the two cards together resolve an M record neither alone would? (e.g., card A reveals where the lost city is, card B reveals when it fell — neither alone fires 6b, jointly they pre-empt M-0007's forbidden answer)
- **Direct contradiction check**: do the two events claim incompatible visible_consequences in overlapping geographic+temporal scope?
- **Redundant-origin_type check**: are two cards filling the same slot with the same `origin_type` AND same primary pressure-inventory entry? (slot diversity is honored at Phase 2; this catches drift from Phase 6e regeneration that re-fills a slot with a near-duplicate)

**6e — Repair Sub-Pass.** Any 6a/6b/6c/6d failure triggers a repair from this menu:

1. **Narrow** — reduce `scope.geographic` or restrict `actors_involved` to a smaller set
2. **Reclassify** — move card from canonize → story_fuel, or story_fuel → ambient (or auto-rejection if 6b forbidden-MR)
3. **Add costs** — populate `who_suffers` or stabilizing entries that block universalization
4. **Drop** — remove the card; slot becomes empty (diagnostic signal)
5. **Regenerate-slot** — drop the failing card and re-run Phase 3 for that slot only (allowed once per slot per batch; second-pass failure forces drop)

Each repair is logged to the batch manifest's Phase 6e Repair Log: `card_id | sub-check that failed | repair-type | justification`. Repair entries also append to the card's `notes` field as `Phase 6e repair: <check-id> — <repair-type> — <justification>`.

### Phase 7: Validation Tests

Run all 8 tests (4 per-card + 4 batch-level). Each result is PASS / FAIL with a one-line rationale. A PASS without rationale is treated as FAIL. Any FAIL halts and loops to the responsible phase.

**Per-card tests**:

- **Test 1 (Rule 2, No Pure Cosmetics)**: card has at least one non-empty entry across `what_changes_immediately`, `who_benefits`, `who_suffers`, `rumor_waves`. PASS rationale must name which fields are populated.
- **Test 2 (Rule 4, No Globalization by Accident)**: for `scope.geographic ∈ {regional, global}`, `scope.why_not_universal` is non-empty. Local cards auto-pass with rationale `local scope; auto-pass`.
- **Test 3 (Rule 5, No Consequence Evasion)**: `what_changes_immediately` AND `what_might_change_if_unchecked` both non-empty (first-order and second-order propagation). Rationale lists one item from each.
- **Test 4 (Rule 7, Preserve Mystery Deliberately)**: for any card whose Phase 6b check produced a non-empty overlap with M records, `mysteries_touched` is populated AND `canon_safety_flags.mystery_reserve_firewall: pass` (not `needs_review`). Cards with no MR overlap auto-pass with rationale `no MR overlap; auto-pass`.

**Batch-level tests**:

- **Test 5 (Phase 2, no silent empty slots)**: every empty slot in the diversification audit names its rationale (CF-thinness drop / no inventory entry / other). PASS rationale: total slot count + empty count + each empty slot's stated reason summarized.
- **Test 6 (Phase 6d, batch-level collision trace complete)**: every card pair has all three 6d sub-checks recorded (pass or fail) in the manifest's Phase 6d Trace section. PASS rationale names total pair count.
- **Test 7 (Schema completeness)**: every required field on every card and on the batch manifest is non-empty (no TODO, no empty list where a list is required, no null where a value is required). Includes recurrence_flag handling: null is acceptable for first-time pressures; non-null requires the cited prior EPE id be a valid file in `pressure-events/`.
- **Test 8 (Sidecar parse-readiness)**: for every canonize-routed card, `proposal_card_extract` is non-null AND every PR-card-shaped required field is populated AND `recommended_scope.geographic`, `temporal`, `social` all non-null AND `proposal_id` is a freshly-allocated `PR-NNNN` not colliding with any existing PR file in `worlds/<slug>/proposals/`. Cards routed story_fuel / ambient auto-pass with rationale `non-canonize routing; sidecar N/A`.

### Phase 8: HARD-GATE Commit

Present the deliverable summary:

1. **Full batch**: every surviving card's frontmatter + body
2. **Sidecar previews**: every canonize-routed card's `proposal_card_extract` block (so the user can sanity-check parse-readiness before sidecars land)
3. **Batch manifest**: pressure inventory, origin-type mapping table, seed log, Phase 4 drop log, diversification audit (with empty-slot rationales), Phase 6d trace, Phase 6e repair log, Phase 7 test results
4. **Target write paths** (per card + per sidecar + batch manifest + INDEX.md)

**HARD-GATE fires here.** No file is written until the user explicitly approves. User may (a) approve as-is, (b) approve with a drop-list of card-IDs to exclude, (c) request specific revisions (loop to named phase), (d) reject and abort.

#### Drop-list behavior

- **Surviving cards retain their originally-allocated `EPE-NNNN` IDs.** No renumbering. Dropped IDs become permanent gaps; the next batch's `allocate_next_id` increments past them.
- **Dropped cards' allocated `PR-NNNN` IDs (sidecars) also become permanent gaps.** The sidecar is never written; the PR-NNNN ID is permanently retired.
- **Slots formerly filled by dropped cards become empty in the Phase 2 Diversification Audit table** of the written manifest, with `user-drop at Phase 8` cited as the rationale.
- **Phase 6d trace in the written manifest covers all card-pairs tested at generation time, including pairs involving dropped cards.** Dropped-pair results are retained as audit evidence.

#### Write order

Sequencing matters because the tool environment cannot guarantee transactional atomicity:

1. **Each non-dropped card first**: `worlds/<world-slug>/pressure-events/EPE-NNNN-<slug>.md` via direct `Write`. Set `source_basis.user_approved: true` on each card immediately before its write. `user_approved: true` here means "kept in batch after review", NOT "canonized".
2. **Each canonize-routed surviving card's sidecar second**: `worlds/<world-slug>/pressure-events/EPE-NNNN-<slug>.proposal.md` via direct `Write`. Set the sidecar's `source_basis.user_approved: true`.
3. **Batch manifest third**: `worlds/<world-slug>/pressure-events/batches/BATCH-NNNN.md` via direct `Write` with `dropped_card_ids` populated, `sidecars_emitted` listing every canonize-card EPE-NNNN, and `user_approved: true`. Create `batches/` if absent.
4. **INDEX.md last**: `Read` existing file (create with header `# Pressure Events — <World-Slug-TitleCased>` followed by status partition headers if absent), append one line per non-dropped card under its appropriate `status:` partition (active / resolved / superseded), sorted by EPE-NNNN ascending within each partition. Line shape: `- [<title>](EPE-NNNN-<slug>.md) — <origin_type> / <downstream_routing>, batch BATCH-NNNN [sidecar: <PR-NNNN>]` (sidecar suffix only if canonize-routed).

All paths sit under `worlds/<slug>/pressure-events/`, which Hook 3's hybrid-file allowlist permits for direct `Write` / `Edit`. Cards-first-then-sidecars sequencing means a partial-failure state has either cards-without-sidecars (detectable by listing files matching `EPE-*.md` and checking for matching `EPE-*.proposal.md` for canonize-routed) or a manifest-without-INDEX-row (detectable by grepping INDEX.md for the batch). **Recovery is manual.**

Report all written paths. Do NOT commit to git.

## Validation Rules This Skill Upholds

- **Rule 2 (No Pure Cosmetics)** — Phase 7 Test 1: per-card check that at least one of `what_changes_immediately`, `who_benefits`, `who_suffers`, `rumor_waves` is non-empty. Phase 5 routing additionally enforces this: ambient-routed cards with empty consequence fields fail 6b (auto-rejected).
- **Rule 4 (No Globalization by Accident)** — Phase 6c (Distribution Discipline) and Phase 7 Test 2: cards at regional/global scope must populate `scope.why_not_universal`. Rumor carve-out documented inline at Phase 6c.
- **Rule 5 (No Consequence Evasion)** — Phase 7 Test 3: per-card check that both `what_changes_immediately` (first-order) AND `what_might_change_if_unchecked` (second-order) are populated. Phase 5 routing rationale must name the consequence shape.
- **Rule 7 (Preserve Mystery Deliberately)** — Phase 6b (Mystery Reserve Firewall) and Phase 7 Test 4: per-card check against every M record in the loaded packet, with audit-trail-by-default (every tested M id recorded, not just overlapping ones); forbidden-MR overlaps cause auto-drop (no repair). Phase 6d's joint-MR-resolution check extends Rule 7 to batch-level.

## Record Schemas

- **Pressure-event card** → see `templates/pressure-event-card.md` (hybrid YAML frontmatter + markdown body)
- **Sidecar proposal card** → see `templates/sidecar-proposal-card.md` (hybrid YAML frontmatter + markdown body; byte-parallel to `propose-new-canon-facts/templates/proposal-card.md` with three explicit field overrides per Phase 5)
- **Batch manifest** → see `templates/batch-manifest.md` (hybrid YAML frontmatter + markdown body)

## FOUNDATIONS Alignment

| Principle | Phase | Mechanism |
|-----------|-------|-----------|
| Canon Layers (hard / soft / contested / mystery_reserve) | Phase 5 | Routing decision + sidecar `proposed_status` enum constrains canonize cards to layer-aware values. story_fuel and ambient cards do not assert canon layer. |
| Default Reality (silence is not permission) | Phase 1 | Pressures must cite source_records; un-cited pressures are silently dropped from inventory before Phase 3 seeding. |
| Tooling Recommendation (context-packet + targeted retrieval) | Pre-flight + Phase 1 | Pre-flight loads context packet via `mcp__worldloom__get_context_packet`; Phase 1 + Phase 6 expand via `search_nodes` / `get_record` / `get_neighbors`. Direct `_source/` reads redirected by Hook 2. |
| Rule 1 (No Floating Facts) | Schema-structural | EPE card frontmatter requires traceability + scope + actors_involved + visible-consequence fields; absent or empty fields cause Phase 7 Test 7 schema-completeness FAIL. Not a dedicated phase — enforced at the YAML schema level. |
| Rule 2 (No Pure Cosmetics) | Phase 7 Test 1 | Per-card non-empty consequence-field check. Ambient routing depends on it (Phase 5). |
| Rule 3 (No Specialness Inflation) | N/A | Not applicable — EPE cards are candidate events, not canonized exceptional capabilities. Distribution discipline at Phase 6c covers the overlapping ground (scope + why_not_universal). Rule 3's "exceptional element with no impact" failure mode is structurally prevented by Phase 1's pressure-must-cite-canon discipline. Handoff: `canon-addition` enforces Rule 3 when adjudicating a sidecar's proposed CF. |
| Rule 4 (No Globalization by Accident) | Phase 6c + Phase 7 Test 2 | Distribution Discipline sub-check + per-card validation test. |
| Rule 5 (No Consequence Evasion) | Phase 7 Test 3 | First-order + second-order consequence-field check. |
| Rule 6 (No Silent Retcons) | N/A | Not applicable — canon-reading skill, no canon mutation. Handoff: `canon-addition` emits CH-NNNN entries when a canonize-routed sidecar is accepted. |
| Rule 7 (Preserve Mystery Deliberately) | Phase 6b + Phase 7 Test 4 + Phase 6d | Per-card MR firewall (every M record tested, not just overlapping); forbidden-MR auto-drop; batch-level joint-MR-resolution check. |
| Rule 11 (No Spectator Castes by Accident) | N/A | Not applicable — EPE cards do not introduce world-level capabilities. The proposal_card_extract on a canonize-routed card may imply a capability, but Rule 11's three-leverage requirement is `canon-addition`'s adjudication concern. Handoff: `canon-addition` Phase 5+ enforces Rule 11 when a sidecar's proposal_card_extract proposes a capability fact. |
| Rule 12 (No Single-Trace Truths) | N/A | Not applicable — EPE cards are candidate events, not canonized truths. Two-register-trace requirement applies to accepted hard canon. Handoff: `canon-addition` enforces Rule 12 at adjudication time. |
| Change Control Policy | N/A | Not applicable — canon-reading skill, no Change Log Entry emitted. Handoff: `canon-addition` emits CH-NNNN per accepted sidecar. |
| Canonical Storage Layer (atomic-source discipline) | Pre-flight + Phase 1 + Phase 6 | All `_source/` reads via MCP retrieval (Hook 2 enforces); writes restricted to `worlds/<slug>/pressure-events/` (Hook 3 hybrid-file allowlist permits). |

## Guardrails

- **Single world per invocation.** Never creates a new world (`create-base-world` does that), never modifies `docs/FOUNDATIONS.md`, never touches other worlds, never touches `archive/` or `brainstorming/`.
- **No canon writes.** Direct `Edit`/`Write` on `_source/<subdir>/*.yaml` is blocked by Hook 3. WORLD_KERNEL.md and ONTOLOGY.md are not in this skill's mutation surface. All writes confined to `worlds/<slug>/pressure-events/` — Hook 3's hybrid-file allowlist permits these.
- **EPE cards are not canon.** Every emitted card is a candidate. A card on disk is NOT equivalent to accepted canon. canonize-routed sidecars are candidates for `canon-addition`'s separate adjudication; story_fuel cards are forward-compatible inputs for not-yet-implemented `branching-story-bootstrap` / `branching-story-page-cycle`; ambient cards are pure background. Downstream consumers must verify each card's `source_basis.user_approved: true` refers to *review approval for inclusion in the batch*, not to canon acceptance.
- **Skills do not chain.** This skill never invokes `propose-new-canon-facts`, `canon-addition`, `branching-story-bootstrap`, or any other sibling. `downstream_routing` is a passive label for future-consumer filtering, not a callback or trigger. The user separately invokes downstream skills with the EPE card or sidecar path as input.
- **Story-fuel routing names a planned consumer that does not yet exist.** `branching-story-bootstrap` and `branching-story-page-cycle` exist as `brainstorming/*.md` proposals. Cards routed `story_fuel` write to disk with the routing label and remain there until those siblings ship. The user is responsible for understanding that story_fuel cards are inert until a story-engine sibling consumes them. **Known concern to surface to maintainers**: when `branching-story-bootstrap` / `branching-story-page-cycle` ship, run `skill-audit` on this skill to verify that the EPE card schema still matches their consumption expectations.
- **Deferred MCPENH ticket: register `task_type='emergent_pressure_events'` profile.** Currently uses `task_type='other'` per the design decision. The generic profile is sufficient for Phase 1 pressure inventory and Phase 6 Canon Safety Check but produces a slightly broader / less prioritized packet load. A future MCPENH ticket should register an EPE-specific profile prioritizing: hard_canon CFs, every INV record, every M record (full firewall surface), section records for institutions / economy-and-resources / magic-or-tech-systems / peoples-and-species, recent CH records since the prior batch's date.
- **ID-collision abort.** If `allocate_next_id` returns an error or the resulting `EPE-NNNN-<slug>.md` / `EPE-NNNN-<slug>.proposal.md` would collide with an existing file (concurrent run), abort and ask the user to resolve before retrying. Never overwrite an existing card, sidecar, batch manifest, or INDEX row.
- **Sidecar emission is canonize-routing-conditional.** A story_fuel or ambient card never emits a sidecar. The `proposal_card_extract` field on those cards is null. A future maintainer adding a phase between Phase 5 and Phase 8 that touches sidecar emission must preserve this conditional or explicitly document the change.
- **Phase 4 drop-not-regenerate is intentional.** A future maintainer tempted to add a regeneration loop must read the Phase 4 rationale: regenerating against a canon-thin slot perpetuates the problem; the empty slot is the diagnostic signal that the world's CF coverage of that origin_type is too thin for plausible event-seeding. The user reads this in Phase 8 and may follow up with `propose-new-canon-facts` to thicken the relevant domain.
- **Phase 6b + Phase 6d are the two Rule 7 enforcement points.** A future maintainer adding a phase between Phase 5 and Phase 7 that exposes cards to Mystery Reserve content must either extend both checks or explicitly classify the phase as out-of-scope for Rule 7 (documented in the manifest notes).
- **Empty slots are features, not bugs.** Phase 2's empty-slot discipline surfaces diagnostic signals about the world's pressure model; the HARD-GATE deliverable summary names empty slots explicitly with their rationale. Filling a slot with a lower-quality seed just to avoid the empty state is forbidden.
- **Recurrence-detection is light-touch.** Pre-flight lists existing `pressure-events/EPE-*.md` filenames only; per-card content load is JIT at Phase 3 if a textual overlap is detected. A future maintainer must NOT escalate this to a bulk-Read pattern — Hook 2 redirects bulk `_source/` reads, but the `pressure-events/` directory is hybrid-file allowlisted, so bulk reads here would not be blocked. Discipline is the discipline.
- **HARD-GATE absoluteness.** Auto Mode does not relax the gate — invocation is not deliverable approval.
- **Worktree discipline.** All paths resolve from the worktree root if invoked inside a worktree.
- **Do NOT commit to git.** Writes land in the working tree only; the user reviews and commits.

## Final Rule

A pressure-event batch is not written until every card cites at least one CF, has populated visible-consequence fields, has a complete Mystery Reserve firewall trace, has explicit downstream_routing with rationale, and (for canonize-routed cards) carries a parse-ready `proposal_card_extract` that `canon-addition` can directly consume; the batch has a complete pressure inventory, a diversification audit naming every empty slot's reason, and a batch-level collision trace; and the user has approved the complete deliverable — and once written, every card is a candidate (canonize for `canon-addition`'s separate adjudication, story_fuel for future story-engine siblings, ambient for world background), never canon itself.
