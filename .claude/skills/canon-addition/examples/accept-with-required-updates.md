# Example: ACCEPT_WITH_REQUIRED_UPDATES

Walks through a proposal that yields ACCEPT_WITH_REQUIRED_UPDATES — the most common "this is good but multiple records must update" outcome. Adapted from the canonical example in the source proposal (PA-0012: buried magical artifacts). Atomic-source op vocabulary.

## Scenario

Target world: a low-fantasy agrarian setting with ancient ruins in its mountainous regions. The world's Kernel establishes: magic is rare and dangerous, civilization is institutionally thin, frontier regions are hazardous.

## Proposal

> Magic artifacts are sometimes found buried, and they can cause corruption and wildly different and dangerous effects.

## Walkthrough

### Pre-flight

- `mcp__worldloom__allocate_next_id(world_slug, 'PA') → 'PA-0012'`
- `mcp__worldloom__allocate_next_id(world_slug, 'CF') → 'CF-0047'`
- `mcp__worldloom__allocate_next_id(world_slug, 'CH') → 'CH-0012'`
- `mcp__worldloom__get_context_packet(task_type='canon_addition', seed_nodes=[<proposal_seed>], token_budget=10000)` returns Kernel + relevant invariants (rarity-of-magic, institutional-thinness) + adjacent CF records + currently-loaded mystery-reserve entries + section neighbors under `_source/magic-or-tech-systems/`, `_source/geography/`, `_source/institutions/`, `_source/everyday-life/`, `_source/timeline/`.
- `mcp__worldloom__get_canonical_vocabulary({class: 'domain'})` and `({class: 'verdict'})` cached for reasoning-time validation.
- `mcp__worldloom__find_named_entities(['Bitter Range', 'ruin-warden'])` runs the pre-figuring scan: no character or diegetic-artifact records reference these names yet, so no `derived_from` citation is required.

### Phase 0: Normalize

- **Statement**: buried magical artifacts exist and can corrupt on contact.
- **Underlying world-change**: recurring relic emergence exists; relics remain active across time; contact risks corruption; effects are variable and difficult to predict; relic discovery is a repeating phenomenon producing treasure economies, ritual quarantines, black markets, cults, contamination zones, salvage specialists, and political struggles over containment.
- **Canon fact types**: artifact + hazard + metaphysical effect → primary `type: artifact` with hazard/metaphysical_rule sub-aspects in `notes`.
- **User-stated constraints**: no explicit scope preference; implicit "regional at most."
- **Selectively expanded packet** via `get_neighbors`: SEC-MTS-* (magic systems), SEC-GEO-* (mountain regions), SEC-INS-* (relevant institutional surfaces — religion + landholding), SEC-ELF-* (mountain-adjacent settlement clusters), SEC-TML-* (Bitter Range historical layer).

### Phase 1: Scope Detection

- Geographic: regional (specific geologies — mountain ruins only).
- Temporal: current, recurring.
- Social: uneven visibility — miners and scavengers aware, farmers not.
- Diffusion risk: **high**. Treasure is portable; without limiting mechanisms, relics spread to every trade node.

### Phase 2: Invariant Check

Tested against the Kernel invariants *magic is rare and dangerous* and *civilization is institutionally thin*. **Result**: compatible with repairs. The rarity invariant is honored if active relics are geographically clustered and most finds are inert. The institutional-thinness invariant is compatible because containment systems are patchwork, not state-run.

### Phase 3: Capability / Constraint Analysis

- Now possible: relic-sickness as a diagnosable hazard; ruin-quarantine as an institutional practice; relic-smuggling as a criminal industry.
- No longer safely assumed: that abandoned ruins are harmless; that graves are undisturbed; that border trade goods are metaphysically inert.

### Phase 4: Prerequisites and Bottlenecks

Ancient burial sites (rare), survivable relic persistence (rare material property), discoverability by scavengers/miners/grave robbers (uncommon), activation via disturbance + blood contact (uncommon), ritual containment knowledge (rare — held by specialists). All rare or uncommon. Good news: diffusion is naturally throttled.

### Phase 5: Diffusion and Copycat

- Primary adopters: scavenger crews, desperate peasants, ruin-hunters.
- Secondary adopters: black-market relic brokers.
- Suppressors: local priests, landowners, state ruin-wardens.
- Skeptics: educated urban populations.
- Profiteers: licensed relic identifiers, cleanup specialists.
- Victims: families of the corrupted; communities downstream of contaminated ruins.
- Non-adopters: farmers (no tools, no knowledge, reflexive ruin-avoidance).

### Phase 6: Consequence Propagation

**First-order**: relic sickness outbreaks near disturbed ruins; salvage cults emerge; fear of disturbed graves concentrates in ruin-adjacent regions.

**Second-order**: quarantine law codifies in affected regions; licensed relic wardens staff cleanup; anti-smuggling patrols form at borders between relic-heavy and relic-free zones; folk taxonomies of relic effects develop; churches integrate relic-sickness into pollution doctrine.

**Third-order**: funerary reform — some regions shift from burial to cremation or ritual disarticulation; border regions depopulate in extreme cases; prestige economy forms around safe relic identification; a new prejudice emerges — "ruin-touched" people are distrusted.

### Escalation Gate

Domains touched in Phase 6: economy, law, religion, architecture (ruin management), everyday-life, status order, kinship (funerary), mobility (border controls). **Eight domains — exceeds the 3-domain trigger.** Dispatch six critic sub-agents in parallel (one Agent invocation per critic, each receiving a per-role-substituted `templates/critic-prompt.md` plus a role-scoped `get_context_packet`).

**Critic synthesis (abbreviated)**:
- **Continuity Archivist**: no existing CF records conflict. Latent burden — existing SEC-TML "fall of the Ancient Kingdoms" record now inherits a plausibility test: did the ancients know about relic activation?
- **Systems/Economy Critic**: relic black market creates inflationary pressure on containment materials. Watch for second-order scarcity in cleansing incense, blessed salt, or whatever the containment economy settles on.
- **Politics/Institution Critic**: state ruin-wardens imply a state capable of regional enforcement — tension with "civilization is institutionally thin." Resolve: wardens are contract-based, not state-salaried; accountable to landowners, not crowns.
- **Everyday-Life Critic**: good coverage; relic-sickness penetrates daily life. No "only affects heroes" drift.
- **Theme/Tone Critic**: matches grim low-fantasy register. Enhances rather than violates the Kernel's "frontier is hazardous" frame.
- **Mystery Curator**: relics' origin is a natural Mystery Reserve expansion vector — "who made them, and why did it end" is a forbidden-answer candidate. Recommend a new `M-NNNN` record committed alongside this CF.

### Phase 7: Counterfactual Pressure Test

Why hasn't this already reshaped the world? Stabilizers: (1) active relics are rare and clustered in specific geologies (mountain ruins only); (2) disturbance + blood contact required for activation — most finds are inert; (3) high mortality among relic handlers — expertise is scarce and dies young; (4) containment knowledge is held by specialists, not institutionalized. No hand-waves.

### Phase 8: Contradiction Classification

- **Soft**: prior SEC-GEO record mentioned "the Bitter Range ruins" without hazard notation. Requires retroactive `append_extension` on the SEC-GEO record.
- **Latent**: ruin-containment economy begs questions about who the ancients were → seed via `create_oq_record` op.

### Phase 9: Repair Pass

Applied: (a) active artifacts rare and clustered in specific geologies (Phase 7 stabilizer #1); (b) activation requires disturbance + blood contact (Phase 7 stabilizer #2); (c) effects decay after exposure (new, added so salvage cults are a real but limited phenomenon).

### Phase 10: Narrative and Thematic Fit

- Deepens identity: yes — the world's "frontier is hazardous" frame now has a named, ritualized hazard.
- Creates tensions: yes — landowner vs warden, peasant vs priest, smuggler vs patrol.
- Universalizes specialness: no (rare, clustered, costly).
- Undermines mystery: no — in fact, expands Mystery Reserve.
- Enriches ordinary life: yes — rural folklore, funerary change, prejudice.
- OQ scan: 4 unchanged, 1 PRESSURED (`OQ-0003` — ancient civilization fall — receives an `append_extension` cross-referencing CF-0047), 1 NEW (`OQ-0007` — origin and persistence of relics).

### Phase 11: Adjudication

**Verdict**: `ACCEPT_WITH_REQUIRED_UPDATES`

**Phase-cited justification**: Phase 2 (compatible with repairs); Phase 7 (stabilizers hold without hand-waving); Phase 10 (identity deepened, tensions generated); Phase 6 (eight domains touched — section updates required across multiple file classes).

### Phase 12a: modification_history axis-(c) judgment

CF-0023 (existing "active wards on the Bitter Range" CF) — the new CF-0047 ADDS a metaphysical hazard surface that constrains how a future reader interprets CF-0023's ward-presence claims (a future reader of CF-0023 alone needs to know about the relic-hazard frame to read it correctly). → Substantive extension; emit `append_modification_history_entry` on CF-0023.

No axis-(a) entries (proposal carries empty `derived_from_cfs`); no axis-(b) entries (Phase 8 soft contradiction is at the SEC-GEO record, not a CF).

### Phase 13a: Patch Plan Assembly

```
patch_plan = [
  create_cf_record(CF-0047, full YAML — primary type: artifact, hazard sub-aspect, status: hard_canon, scope.geographic: regional, distribution.why_not_universal: 4-stabilizer chain, domains_affected: [magic, religion, law, daily_routine, kinship, status_signaling, mobility, economy], required_world_updates: [SEC-MTS-..., SEC-INS-..., SEC-ELF-..., SEC-TML-..., SEC-GEO-..., OQ-0007], source_basis.derived_from: []),
  create_ch_record(CH-0012, change_type: addition, affected_fact_ids: [CF-0047, CF-0023]),
  // bidirectional pointer for each touched section: extend CF's required_world_updates BEFORE touched_by_cf
  update_record_field(CF-0047, 'required_world_updates' → +SEC-MTS-XXX),
  append_touched_by_cf(SEC-MTS-XXX, CF-0047),
  append_extension(SEC-MTS-XXX, "Relic-effect system: source, access, training, cost, reliability, failure states..."),
  // ... repeated for SEC-INS, SEC-ELF, SEC-TML, SEC-GEO, OQ-0003 (PRESSURED extension), OQ-0007 (NEW)
  create_oq_record(OQ-0007, "Who were the ancients and why did relics persist?"),
  append_extension(OQ-0003, "Cross-referenced by CF-0047 — ancestral knowledge of relic activation now an open question"),
  append_modification_history_entry(CF-0023, change_id: CH-0012, originating_cf: CF-0047, summary: "Bitter Range ward-presence reading constrained by new relic-hazard frame"),
  append_adjudication_record(adjudications/PA-0012-accept_with_required_updates.md, frontmatter={pa_id: PA-0012, verdict: ACCEPT_WITH_REQUIRED_UPDATES, originating_skill: canon-addition, change_id: CH-0012, mystery_reserve_touched: [], invariants_touched: [<invariant-IDs touched>], cf_records_touched: [CF-0047, CF-0023], open_questions_touched: [OQ-0003, OQ-0007]}, body_markdown=<full Phase 0–11 + Phase 14a checklist>)
]
```

### Phase 14a: Validation

`mcp__worldloom__validate_patch_plan(patch_plan)` returns clean (mechanical layers — record_schema_compliance, id_uniqueness, cross_file_reference, touched_by_cf_completeness, modification_history_retrofit, yaml_parse_integrity, Rules 1/2/4/5/6/7).

Skill-side judgment Tests recorded in PA body_markdown:
- Test 3 (judgment layer — stabilizer quality): PASS — geological clustering + activation cost + handler mortality + specialist knowledge are all concrete mechanisms.
- Test 6 (judgment layer — forbidden-answer overlap): PASS — proposal does not commit on relic origin; new M-NNNN entry preserves the boundary.
- Test 8 (judgment layer — hand-wave detection): PASS — every stabilizer names a mechanism.
- Test 9: PASS — verdict cites Phases 2, 7, 10, 6.
- Test 10 (Rule 3): PASS — no superlative claims; "rare" and "clustered" are pragmatic-quantity language.

### Phase 15a: Commit

User reviews chunked deliverable summary (verdict + new CF YAML + modification_history op + per-section append summary + new OQ + PA file path). User approves; `approval_token` issued.

`mcp__worldloom__submit_patch_plan(patch_plan, approval_token)` → engine applies atomically. Receipt returned. Hook 5 runs `record_schema_compliance` + `id_uniqueness` + `cross_file_reference` + `touched_by_cf_completeness` against every patched path; clean.

## Takeaway

This is the typical "good addition with scope" verdict. The skill did three things that matter:
1. Caught the high diffusion risk at Phase 1 and narrowed it at Phase 4 and Phase 9.
2. Required six critic sub-agents at the escalation gate because 8 domains exceeded the 3-domain trigger.
3. Refused to call `submit_patch_plan` until every affected section had a concrete `append_extension` op paired with the bidirectional `update_record_field` + `append_touched_by_cf` ops — engine fail-fast rejects plans lacking the pair.
