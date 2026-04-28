# Phases 7-11: Counterfactual Pressure, Contradiction Classification, Repair, Narrative Fit, Adjudication

This reference covers the four phases that stress-test the proposal and classify its conflicts, the repair pass that preserves dramatic intent, the narrative fit evaluation, and the synthesizing Phase 11 verdict step.

## Phase 7: Counterfactual Pressure Test

Ask: if this were true, why does the world not look more different already? Answer with explicit limiting conditions from Phase 4's bottlenecks plus any new stabilizers.

Typical stabilizers: rarity, secrecy, high mortality, unreliability, expensive prerequisites, monopoly control, taboo, hard-to-transport materials, activation conditions, geographic isolation, incompatibility with ordinary labor, short effect lifespan, self-destructive side effects, elite suppression, recent discovery, mistaken public understanding.

**Rule**: Do not hand-wave with "people just don't use it much." State *why*. Failed counterfactual → Phase 9 must repair or Phase 11 must reject.

**FOUNDATIONS cross-ref**: Rule 3 (No Specialness Inflation).

## Phase 8: Contradiction Classification

Using Phase 2 + Phase 6 output, classify every detected conflict:
- **Hard** — cannot coexist without changing established truths.
- **Soft** — can coexist, but existing canon owes explanation or visible consequences (seeds `required_updates`).
- **Latent Burden** — mandatory future lore work (tracked in CF `notes`; may seed a new `OQ-NNNN` record under `_source/open-questions/` via a `create_oq_record` op in the patch plan).
- **Scope Drift Risk** — acceptable only if kept local/temporary/secret (routes toward `ACCEPT_AS_LOCAL_EXCEPTION`).
- **Tone/Thematic Mismatch** — logic intact but world feels unlike itself (routes to REVISE/REJECT or `ACCEPT_AS_CONTESTED_BELIEF`).

## Phase 9: Repair Pass

If promising but destabilizing, propose repairs: reduce scope / reduce reproducibility / add cost / add side effects / add bottlenecks / localize geographically or temporally / make it recent / make it heritable to a narrow group / make it taboo / shift to contested belief / split into narrower facts / move into Mystery Reserve / create a *new* Mystery Reserve entry to hold a bounded unknown the proposal manufactures (Rule 7 obligation — distinct from "move into Mystery Reserve"; used when the fact itself enters open canon but its existence creates a new bounded unknown — typical patterns: a numeric parameter, a mechanism, or a reading whose resolution would destabilize the new fact's stabilizers).

**Split rubric** (for the "split into narrower facts" option): Choose a split when sub-facts have materially distinct (a) canon-fact-types under the template enum (see Phase 0 mapping), (b) Mystery Reserve exposure profiles requiring different firewall commitments, (c) `distribution` shapes that cannot share a single `who_can_do_it` / `who_cannot_easily_do_it` / `why_not_universal` block, or (d) `domains_affected` sets that would force an overly-broad coverage on a bundled record. Otherwise keep as a single CF with subtypes documented in `statement`, `notes`, and `visible_consequences` — unnecessary splitting fragments the fact's integrity and produces redundant `source_basis.derived_from` chains.

**Composite-CF positive criteria** (mirror image of the split rubric — when these are true, prefer ONE composite CF with primary type in the `type:` field and sub-types documented in `notes` and `statement`, per `proposal-normalization.md` §"Composite facts"):

- Sub-facts share the same stabilizer chain (one diffusion-prevention mechanism-set governs all sub-facts; no sub-fact has a stabilizer the others lack).
- Sub-facts share the same invariant-firewall set (the same ONT / CAU / SOC / AES firewalls apply to all sub-facts; no sub-fact manufactures a firewall the others don't need).
- Sub-facts share a near-identical `required_world_updates` footprint (splitting would produce CFs with almost-identical file lists).
- Splitting would force each split CF to list the others as `derived_from`, producing cross-referencing stubs rather than self-contained records.
- User-stated dramatic purpose treats the sub-facts as one phenomenon (the proposal describes them in one breath, not as separable threads).

**Ledger precedent** (Animalia):

- **Composite pattern (one CF with sub-types)**: CF-0021 (crafter-creation, primary `craft` with capability + artifact + taboo-pressure sub-aspects); CF-0029 (guardian constructions, primary `artifact` with hazard + non-sentience-firewall sub-aspects); CF-0034 (endemic banditry, primary `historical_process` with capability + law + distribution-asymmetry sub-aspects); CF-0035 (artifact-mutated non-sentient beasts, primary `hazard` with species + local_anomaly + historical_process sub-aspects).
- **Honest-split pattern (two or more paired CFs introduced in one CH)**: CF-0027 + CF-0028 (a single ruin-expedition proposal yielded two CFs — the enterable-ruin category and the patron-funded expedition mode — because each sub-fact carries its own stabilizer chain, `required_world_updates` footprint, and Mystery Reserve exposure profile; the pair is coordinated via `derived_from` without being fragmented into cross-referencing stubs).

**Rule of thumb**: if splitting would force you to write "see also CF-X, CF-Y, CF-Z" three times in a single CF's `notes` field, the phenomenon is tightly coupled and wants one composite CF. If the split CFs naturally diverge at Phase 6 consequence propagation (touching different files with little overlap), the split is honest.

**Merged vs. separate Mystery Reserve entries (for the "create a new MR entry" repair option)**: when a proposal manufactures multiple parallel bounded unknowns (e.g., origin of two adjacent infrastructure elements, cause of two related phenomena, mechanism of two distinct but surface-similar effects), decide between ONE merged entry vs. SEPARATE parallel entries before drafting. Prefer **one merged entry** when:
- The **relationship between the unknowns is itself contested** and part of the bounded unknown (e.g., "are the canals and the tunnels integrated infrastructure or two separate constructions?" — the relationship-question IS one of the in-world readings the MR entry holds).
- The **same in-world readings apply to both** (ancestral-consortium / Maker-substrate / divine-gift / composite readings apply identically; splitting would force redundant enumeration across two entries).
- **Resolution of one would constrain resolution of the other** (a reveal that answers one unknown would partial-constrain the other — the unknowns are not independent).
- The **disallowed cheap answers would overlap** (the same forbidden-reveal pattern — e.g., definitive Maker-Age attribution — would appear in both entries' disallowed lists).

Prefer **separate entries** when:
- The **in-world readings diverge mechanism-by-mechanism** (different sect-theoretical positions apply to each; splitting clarifies rather than duplicates).
- **One unknown belongs to an existing MR surface** (M-1 / M-2 / etc.) while the other manufactures a genuinely new one — the first is handled by an Extension clause on the existing MR; the second gets its own new MR entry.
- The **domains_touched differ substantively** — an entry with only partial-overlap disallowed answers and distinct domain scope is cleaner separated.

Worked precedent (CH-0013 / CF-0038 Brinewick): the proposal manufactured two bounded unknowns (canal-network origin; outskirts-estate underground-tunnel origin). Mystery Curator critic initially proposed M-19 + M-20 (separate parallel entries). Phase 6b synthesis merged them into one M-19 because (a) the relationship between canal and tunnel origin IS contested (are they integrated infrastructure or separate constructions?); (b) the same four readings apply (ancestral-consortium / lost-polity / composite / Maker-substrate); (c) a Maker-substrate reveal on one would partial-constrain the other; (d) the disallowed cheap answers overlap (definitive Maker-Age attribution forbidden in both). Merged M-19 captures "Brinewick Canal and Underground Network Origin" as one bounded-unknown surface.

**Rule**: Repairs must preserve the user's dramatic intent. Surface each option with its trade-off (preserved vs sacrificed) in the Phase 15a summary.

## Phase 10: Narrative and Thematic Fit

Evaluate: deepens identity? creates tensions? trivializes struggle? universalizes specialness? undermines mystery? enriches ordinary life or only exceptional scenes? creates story engines or clutter?

**Rule**: Reject technically consistent but dramatically flattening facts.

**FOUNDATIONS cross-ref**: Rule 7 (Preserve Mystery Deliberately) — collision with a `disallowed_answers[]` list on any `M-NNNN.yaml` record under `_source/mystery-reserve/` → REJECT or repair toward Mystery Reserve placement.

**Open Questions pressure scan (required)**: enumerate the `OQ-NNNN` records the context packet returned (or `mcp__worldloom__search_nodes` against `node_type: open_question_record` if the packet under-covered). For each, classify under this proposal as one of:

- **UNCHANGED** — no pressure from the proposal; the deferral scope is unaffected.
- **PRESSURED** — the proposal narrows the deferral scope, adds a cross-reference annotation, extends the caution clause, or otherwise touches the item without resolving the question. Pressured items receive an `append_extension` op on the target `OQ-NNNN.yaml` at Phase 13a and appear in the PA frontmatter's `open_questions_touched[]` array.
- **NEW** — the proposal creates a deferred item; emit a `create_oq_record` op for the new `OQ-NNNN` and cite the resulting id in `open_questions_touched[]`. PA frontmatter no longer carries free-form OQ topic-strings — it carries `OQ-NNNN` ids only (per SPEC-14).
- **RESOLVED** — the proposal commits on a previously-deferred question (rare). Treat with Phase 10 narrative-fit scrutiny — a resolved OQ is a deliberate commitment, not a silent one, and its resolution must be justified in the PA's Justification section. Silent OQ resolution violates Rule 6 (No Silent Retcons).

Record the full list (every OQ examined, with classification) in the PA `body_markdown` Discovery section, but populate the frontmatter `open_questions_touched[]` array with PRESSURED + NEW + RESOLVED ids only — UNCHANGED items are the unstated complement (do not enumerate them in the frontmatter array, but the scan itself MUST cover them to produce the PRESSURED / NEW / RESOLVED list correctly). Missing this scan produces silent OQ drift: a pressured item that receives no extension carries a reader into the next adjudication assuming the deferral is uncontested when in fact this proposal narrowed or cross-referenced it — a Rule 6 audit-trail gap parallel to the modification_history-array gap the Phase 12a scan prevents.

## Phase 11: Adjudication

Synthesize Phases 0–10 into one verdict:

- **ACCEPT** — invariant-safe, consequences manageable, scope clear, burden acceptable, world identity strengthened.
- **ACCEPT_WITH_REQUIRED_UPDATES** — good addition, but multiple files must update.
- **ACCEPT_AS_LOCAL_EXCEPTION** — globally destabilizing but valuable as regional anomaly / cult / hidden order / one-time event / bounded technology. CF `status: soft_canon`.
- **ACCEPT_AS_CONTESTED_BELIEF** — valuable for atmosphere / ideology / mystery / politics / diegetic texture but not wanted as objective truth. CF `status: contested_canon`.
- **REVISE_AND_RESUBMIT** — promising but underspecified.
- **REJECT** — breaks invariants / destroys genre contract / creates implausible omissions / weakens identity / imposes excessive retcon burden.

The verdict must cite the specific phase findings that drove it. Vague verdicts are themselves a failure.

## PA body-markdown structural template

The `append_adjudication_record` op carries the SPEC-14 PA frontmatter (`pa_id`, `verdict`, `date`, `originating_skill: "canon-addition"`, `change_id` for accept branches, and four `*_touched` arrays — `mystery_reserve_touched`, `invariants_touched`, `cf_records_touched`, `open_questions_touched`) plus a free-prose `body_markdown` payload. Use these named sections in this order — the headings are conventional (free prose under each), not engine-validated, but consistent ordering keeps adjudications grep-discoverable across the worlds:

- `# Discovery` — top-of-file index mirroring the four `*_touched` frontmatter arrays for in-body grep. Match the frontmatter exactly: do not re-include UNCHANGED items here either.
- `# Proposal` — verbatim copy of the proposal text + user-stated constraints (preferred scope, desired rarity, dramatic purpose, revision appetite, other).
- `# Phase 0–11 Analysis` — full per-phase outputs (Phase 0 normalize, including a required `## Phase 0 — Proposal Normalization and Misrecognition Probe` sub-heading with `misrecognition_probe:` layer-captured details OR `NONE` plus one-line rationale / Phase 1 scope / Phase 2 invariants / Phase 3 capability / Phase 4 prerequisites / Phase 5 diffusion / Phase 6 consequence propagation, with first/second/third-order subsections / Phase 7 counterfactual + stated stabilizers / Phase 8 contradiction classification / Phase 9 repair pass — options considered / declined / adopted / Phase 10 narrative-and-thematic fit + OQ pressure scan results).
- `# Phase 14a Validation Checklist` — required for accept branches (smaller subset for non-accept). Each of the 13 tests as PASS/FAIL with one-line rationale; bare PASS treated as FAIL. Tests 11, 12, and 13 use the detailed criteria below.
- `# Verdict` — one of `ACCEPT` / `ACCEPT_WITH_REQUIRED_UPDATES` / `ACCEPT_AS_LOCAL_EXCEPTION` / `ACCEPT_AS_CONTESTED_BELIEF` / `REVISE_AND_RESUBMIT` / `REJECT` (matches the canonical verdict enum).
- `# Justification` — phase-cited reasoning. Every claim cites a specific phase finding.
- `# Critic Reports` — verbatim, only if the Escalation Gate fired. One subsection per critic (Continuity Archivist, Systems/Economy, Politics/Institution, Everyday-Life, Theme/Tone, Mystery Curator) plus a Synthesis (Phase 6b) subsection covering convergent concerns, productive tensions resolved, and required CF-language commitments arising from synthesis.
- `# Required World Updates Applied` — accept-only. One paragraph per affected section record summarising what the corresponding `append_extension` / `update_record_field` op added.
- `# Resubmission Menu` (REVISE only) OR `# Why This Cannot Be Repaired` (REJECT only) — concrete; the user can act on it without further clarification.
- `# User Override` — only if a Phase 14b user override fired (original verdict, override verdict, user reasoning, converted accept-branch outputs). Rule 6 compliance: overrides are logged.

## Phase 14a Tests 11/12/13 Detailed Criteria

### Test 11: Action-Space Integrity

Applies when the CF introduces or depends on exceptional capability: bloodline power, high-leverage artifact, magical or technical discipline, divine action, or another fact that lets a narrow actor set decide outcomes ordinary actors could not normally decide.

PASS requires:
- State whether the CF is exceptional-capability-bearing. If no, PASS with a one-line rationale tied to the CF type.
- If yes, name at least three distinct leverage forms remaining to ordinary or mid-tier actors from the SPEC-09 enum: locality, secrecy, legitimacy, bureaucracy, numbers, ritual authority, domain expertise, access, timing, social trust, deniability, infrastructural control.
- Tie each leverage form to a concrete in-world mechanism. The mechanism can cite a law, route, institution, practice, material bottleneck, social norm, geography, taboo, or other canonical substrate. Generic claims such as "ordinary people still matter" are FAIL.

FAIL examples:
- A capability CF says elites remain balanced by "public resistance" without naming the public mechanism.
- Three leverage entries repeat the same mechanism under different labels.
- The leverage list satisfies the validator enum mechanically, but the rationale does not explain how those actors can actually exercise leverage in-world.

Edge cases:
- Local or soft-canon exceptions may PASS with a narrower leverage account if the rationale names the local scope and the actors who retain leverage inside that scope.
- Contested beliefs still need action-space scrutiny when belief in the exception changes behavior; the test evaluates the social leverage created by the belief, not whether the belief is objectively true.
- Hidden capabilities must name the actors or institutions whose secrecy, access, timing, or deniability governs use.

### Test 12: Redundancy

Applies to hard-canon core truths: world-level facts whose absence would materially change how the setting works. Soft, local, contested, or proposal-only claims can PASS trivially only with a status-based rationale.

PASS requires:
- Classify the CF status and whether it is a hard-canon core truth.
- If it is not a hard-canon core truth, PASS with a one-line status rationale.
- If it is hard-canon core truth, name at least two distinct trace registers and the concrete in-world form each trace takes. Registers include law, ritual, architecture, slang, ledgers, funerary practice, landscape, bodily scars, supply chains, songs, maps, educational customs, bureaucratic forms, or another named register.
- For intentionally hidden truths, cite the `M-NNNN` Mystery Reserve entry or other canonized hiding mechanism that explains why ordinary trace redundancy is suppressed.

FAIL examples:
- A core truth appears only in one archive, one artifact, or one scholar's claim with no second register.
- Two examples are both the same register, such as two laws or two maps, unless the rationale explains a genuinely distinct trace form.
- The truth is called hidden, but no canonized hiding mechanism is cited.

Edge cases:
- A truth can use indirect traces, such as missing maps plus euphemistic slang, if the rationale explains how both point to the same underlying fact.
- A new CF can create one trace immediately and require a second world update in the same patch plan; it must name both and the plan must include the corresponding updates.
- Mystery Reserve carve-outs do not authorize vague absence. They only pass when the hiding mechanism itself is already or newly canonized in the same approved plan.

### Test 13: Misrecognition probe addressed

Applies to every new canon fact after SPEC-18. The test is judgment-only and checks that FOUNDATIONS §Acceptance Tests #9 was explicitly addressed during Phase 0.

PASS requires one of these Phase 0 outcomes in the PA body:
- Misrecognition layer captured: state what people falsely believe, what is canon-true, the chosen `truth_scope.diegetic_status`, and at least one `epistemic_profile.distortion_vectors[]` or `knowledge_exclusions[]` entry on the new CF.
- `misrecognition_probe: NONE`: state the NONE result with a one-line rationale explaining why the fact has no observation-perspective asymmetry.

FAIL examples:
- The Phase 0 analysis does not mention misrecognition.
- The PA says `misrecognition_probe: NONE` with no rationale.
- The prose describes a false public belief but leaves both `epistemic_profile.distortion_vectors[]` and `knowledge_exclusions[]` empty.
