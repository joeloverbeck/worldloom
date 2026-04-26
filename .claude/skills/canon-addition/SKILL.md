---
name: canon-addition
description: "Use when evaluating a proposed new canon fact against an existing worldloom world. Produces: adjudication verdict + (on accept outcomes) new CF/CH atomic-YAML records under _source/, extension/touched_by_cf/modification_history appends to affected M-N / OQ-NNNN / SEC-* / CF records, and a hybrid PA adjudication record under adjudications/; (on non-accept outcomes) PA record only. All mutations route through the patch engine via mcp__worldloom__submit_patch_plan; direct writes to _source/ are blocked by Hook 3."
user-invocable: true
arguments:
  - name: world_slug
    description: "Directory slug of an existing world under worlds/<world-slug>/. Pre-flight aborts if the directory is missing."
    required: true
  - name: proposal_path
    description: "Path to a markdown brief: a new-fact proposal OR a continuity-audit retcon-proposal card (see proposal-normalization.md §Retcon-Proposal Inputs). If omitted, Phase 0 interviews the user."
    required: false
---

# Canon Addition

Evaluates a proposed canon fact against an existing world's atomic-source canon. On accept outcomes, assembles a single patch plan that creates new CF/CH records, extends affected mystery-reserve / open-question / section / CF records, and appends a hybrid PA record — all applied atomically by the engine. On non-accept outcomes, the patch plan carries only the PA record.

<HARD-GATE>
Do NOT call `mcp__worldloom__submit_patch_plan` until: (a) pre-flight resolves `worlds/<world-slug>/` and allocates the next `PA-NNNN` (plus `CF-NNNN` / `CH-NNNN` for accept branches) via `mcp__worldloom__allocate_next_id`; (b) Phase 11 produces an explicit verdict; (c) for accept branches the Phase 13a patch plan is assembled and Phase 14a `validate_patch_plan` returns clean (mechanical layers) AND skill-side Tests 9, 10 + judgment layers of Tests 3, 6, 8 record PASS with one-line rationale; (d) the user has explicitly approved the deliverable summary and the skill has issued an `approval_token` via the canonical signer (`node tools/world-mcp/dist/src/cli/sign-approval-token.js <plan-path>` per `docs/HARD-GATE-DISCIPLINE.md` §Issuing a token). The gate is absolute under Auto Mode — invoking the skill is not approval. Approval tokens are single-use, plan-bound, default-20-minute-expiry.
</HARD-GATE>

## Process Flow

```
Pre-flight (allocate_next_id PA/CF/CH; get_context_packet for world state;
            get_canonical_vocabulary for domain/verdict/mystery enums;
            find_named_entities for pre-figuring scan)
      |
      v
Phase 0:  Normalize the Proposal (parse OR interview; classify fact type)
      |
      v
Phases 1–6: Scope, Invariants, Capability, Prerequisites, Diffusion,
            Consequence Propagation across 13 exposition domains
      |
      v
Escalation Gate → 6 parallel critic sub-agents → Phase 6b synthesis
      |
      v
Phases 7–10: Counterfactual Pressure, Contradiction Classification,
             Repair Pass, Narrative and Thematic Fit
      |
      v
Phase 11: Verdict (phase-cited)
      |
      +--- accept ---->  Phase 12a (modification_history axis-(c) judgment)
      |                  Phase 13a (PatchOperation[] assembly)
      |                  Phase 14a (validate_patch_plan + judgment Tests 9/10
      |                             + judgment layers of Tests 3/6/8)
      |
      +--- non-accept -> Phase 13b (PA-only patch plan)
                              |
                              v
                    HARD-GATE → submit_patch_plan(plan, approval_token)
```

## Output

**Accept branch** (`ACCEPT` / `ACCEPT_WITH_REQUIRED_UPDATES` / `ACCEPT_AS_LOCAL_EXCEPTION` / `ACCEPT_AS_CONTESTED_BELIEF`) — one `submit_patch_plan` call carrying:

- `create_cf_record` op per accepted CF (engine writes `_source/canon/CF-NNNN.yaml`). `ACCEPT_AS_LOCAL_EXCEPTION` → `status: soft_canon`; `ACCEPT_AS_CONTESTED_BELIEF` → `status: contested_canon`. Clarificatory retcons (`change_type: clarification`, typically `retcon_type: A`) emit no `create_cf_record`.
- `create_ch_record` op for the Change Log Entry (`_source/change-log/CH-NNNN.yaml`).
- For each section the verdict cites in `touched_by_cf`: an `update_record_field` op extending the originating CF's `required_world_updates` PRECEDES the `append_touched_by_cf` op on the target SEC record. Engine fail-fast rejects plans lacking the bidirectional pair (SPEC-14).
- `append_extension` op per Mystery Reserve firewall extension (target `M-NNNN.yaml`).
- `append_modification_history_entry` op per CF identified by the Phase 12a axis-(c) judgment.
- `create_oq_record` op per new Open Question raised by reasoning, with the resulting `OQ-NNNN` cited in the PA frontmatter's `open_questions_touched[]`.
- `append_adjudication_record` op carrying SPEC-14 PA frontmatter (`pa_id`, canonical-enum `verdict`, `originating_skill: "canon-addition"`, `change_id`, four `*_touched` arrays) + `body_markdown` per §PA body_markdown structure.

**Non-accept branch** (`REVISE_AND_RESUBMIT` / `REJECT`) — single-op patch plan with `append_adjudication_record` only. No `_source/` mutations.

## World-State Prerequisites

`docs/FOUNDATIONS.md` plus the world-state slice the proposal touches load via `mcp__worldloom__get_context_packet(task_type='canon_addition', seed_nodes=[<proposal_seed_nodes>], token_budget=10000)` per `docs/CONTEXT-PACKET-CONTRACT.md`. The packet delivers Kernel + Invariants + relevant CF/CH/M/OQ records + named-entity neighbors + section context with completeness guarantees. Direct `Read` of `_source/<subdir>/` is redirected to MCP retrieval by Hook 2 — do not bulk-read. For specific records, use `mcp__worldloom__get_record(record_id)`. For `find_sections_touched_by(cf_id)` use the dedicated tool. For pre-figuring scans of named entities the proposal commits, use `mcp__worldloom__find_named_entities(names)` filtered to `node_type ∈ {character_record, diegetic_artifact_record}` — pre-figured names MUST cite the originating `DA-NNNN` / `CHAR-NNNN` in the new CF's `source_basis.derived_from` per Rule 6 (No Silent Retcons). Use `references/retrieval-tool-tree.md` for the phase-by-phase retrieval-tool decision tree, including when to pair `find_named_entities` with `search_nodes` for prose-body discovery.

If `worlds/<world-slug>/` is missing, abort and instruct the user to run `create-base-world` first.

## Procedure

1. **Pre-flight.** Normalize `world_slug` (strip `worlds/` prefix; verify `[a-z0-9-]+`). Allocate IDs: `mcp__worldloom__allocate_next_id(world_slug, 'PA' | 'CF' | 'CH')`. Load the context packet (per §World-State Prerequisites). Look up canonical vocabularies via `mcp__worldloom__get_canonical_vocabulary({class})` for `domain`, `verdict`, `mystery_status`, `mystery_resolution_safety` so values are validated at reasoning time, eliminating post-write vocabulary-drift fails. Run the pre-figuring scan if the proposal names specific entities. Load `templates/critic-prompt.md` and `templates/critic-report-format.md` if escalation is likely (proposal commits to >3 exposition domains in `domains_affected`, introduces a new invariant-level rule, or revises an existing invariant) — the only template files that load; CF/CH/PA schemas are engine-owned and validated by `record_schema_compliance`.

2. **Phase 0: Normalize the Proposal.** Load `references/proposal-normalization.md`. Parse `proposal_path` if provided, otherwise interview. Classify fact type(s); selectively expand the context packet via `get_neighbors` / `find_sections_touched_by` for the file classes the classification implicates. **Proposal self-assessment is advisory, not authoritative** — `canon_safety_check` blocks feed Phase 2 and Phase 6b but never replace independent verification.

3. **Phases 1–6: Scope → Consequence Propagation.** Load `references/consequence-analysis.md`. Run Phases 1–6 ending with the Escalation Gate. The 13 Phase 6 **exposition domains** are: everyday life, economy, law, religion, warfare, status order, kinship, architecture, mobility, environment, taboo/pollution, language/slang, memory/myth — distinct from the FOUNDATIONS §Mandatory World Files enumeration; do not conflate. The escalation gate fires when (a) the proposal's `domains_affected` substantively commits to >3 exposition domains, (b) a new invariant-level rule is introduced (ontological / causal / distribution / social / aesthetic), or (c) an existing invariant is revised. **Substantive-commitment vs investigation-touch**: Phase 6 inspects all 13 domains by definition; only domains receiving a `domains_affected` entry count toward the threshold. Secondary surfaces and tangential consequences (effects flowing from existing CFs rather than the new commitment) do NOT count. **De-escalation**: inline four-lens analysis (Continuity Archivist + Systems-Economy + Theme-Tone + Mystery Curator, adopted by the main agent) is acceptable in lieu of parallel six-critic dispatch when the proposal scores LOW on novelty (`distinctiveness ≤ 3` AND `propagation_value ≤ 2` AND `integration_burden ≤ 2`) AND fits a documented absorption pattern: sub-occasion-within-parent-CF (CF-0045 lock-night precedent), sub-specialty-within-parent-subtype (CF-0034 / CF-0035 / CF-0042 / CF-0043 precedents), retcon-clarification (`retcon_type: A`), or pre-figured-by-existing-DA (CF-0038 / CF-0045 precedent). The choice MUST be justified in the PA's notes section by naming the precedent CF and the absorption pattern; default behavior is parallel dispatch when in doubt. If the gate fires AND no de-escalation criterion applies, dispatch six parallel critic sub-agents using `templates/critic-prompt.md` (per-role substitution; do NOT pass the template literally to all six) and `templates/critic-report-format.md`. Produce Phase 6b multi-critic synthesis before Phase 7.

4. **Phases 7–11: Counterfactual → Adjudication.** Load `references/counterfactual-and-verdict.md`. Run Phases 7–10, then synthesize the Phase 11 verdict citing specific phase findings. Vague verdicts fail Test 9.

5. **Branch on verdict.**
   - **Accept** → Phases 12a → 13a → 14a → HARD-GATE → 15a (submit). For clarificatory retcons (`retcon_type: A`), no `create_cf_record` is emitted and the axis-(c) framing shifts to "does the correction change how a future reader should interpret the target CF's domain-file annotations?" — see `references/proposal-normalization.md` §Retcon-Proposal Inputs.
   - **Non-accept** → assemble a PA-only patch plan whose `body_markdown` carries the Phase 0–11 analysis plus a Resubmission Menu (REVISE) or Why-This-Cannot-Be-Repaired section (REJECT) naming specific invariants / genre-contract elements / Mystery Reserve entries. HARD-GATE fires before submit; user may approve, request revision, or override (Phase 14b override logs to PA per Rule 6).

6. **Phase 12a (accept-only): modification_history scan — axis-(c) judgment.** Inputs: CFs in the proposal's `derived_from_cfs` (axis a — verify each names a genuine semantic parent: EXTENDS / NARROWS / REPAIR-SPLIT, not mere conceptual adjacency; capture non-derivational relationships either in the new CF's `prerequisites` when the new CF USES the candidate's mechanic as substrate — copper-silver denomination, posting-wall infrastructure, etc. — or in the new CF's `notes` when the relationship is orthogonal cross-reference. CF-0045 precedent: CF-0015 canal substrate → prerequisites; CF-0024 posting-wall mechanism → prerequisites; CF-0038 Brinewick orthogonal-coexistence → notes) and CFs named in Phase 8 soft-contradiction findings (axis b). For each candidate, apply the **axis-(c) decision test** (load-bearing): after the new CF exists, does a future reader of the existing CF *alone* need to know about the relationship to read it correctly? **YES** → substantive extension; emit `append_modification_history_entry` op. **NO** → cross-reference only; capture in the new CF's `notes`, not the existing CF's `modification_history`. Named-polity-instance commitments on abstract polity-asymmetric distributions qualify (the axis CF's distribution stays abstract; its `modification_history` records the named instance). Phase 6b critic mod_history recommendations are **advisory**; the axis-(c) test governs and overrides are documented in the PA's Phase 6b Synthesis section. The mechanical layer — `find_impacted_fragments` retrieval and `rule6_no_silent_retcons` validator enforcement — runs in `validate_patch_plan` at Phase 14a; this step is the semantic gate the validator cannot make.

7. **Phase 13a: Patch plan assembly.** Build a single `PatchOperation[]` per §Output. Bidirectional pointer: every `append_touched_by_cf` op MUST be preceded in the same plan by an `update_record_field` op extending the target CF's `required_world_updates`.

8. **Phase 14a: Validation.** Call `mcp__worldloom__validate_patch_plan(plan)`. The validator exercises mechanical layers: `record_schema_compliance`, `id_uniqueness`, `cross_file_reference`, `touched_by_cf_completeness`, `modification_history_retrofit`, `yaml_parse_integrity`, plus Rules 1, 2, 4, 5, 6, 7. Loop back to the originating Phase on any fail. Record all 10 tests below as PASS or FAIL with a one-line rationale in the PA `body_markdown` "Phase 14a Validation Checklist" section; bare PASS is FAIL. SPEC-09 Phase 2.5 will append Tests 11 (action-space) and 12 (redundancy) atop this contiguous block — preserve the numbering.

   1. **Domains populated (Rule 2)** — mechanical (validator: `rule2_no_pure_cosmetics`).
   2. **Fact structure complete (Rule 1)** — mechanical (`rule1_no_floating_facts`).
   3. **Stabilizers for non-universal scope (Rule 4)** — mechanical layer (`rule4_no_globalization_by_accident`); **judgment layer**: stabilizer-quality assessment — does each stated mechanism credibly throttle universalization, or is it nominal?
   4. **Consequences materialized (Rule 5)** — mechanical (`rule5_no_consequence_evasion`).
   5. **Retcon policy observed (Rule 6)** — mechanical (`rule6_no_silent_retcons` + `modification_history_retrofit`).
   6. **Mystery Reserve preserved (Rule 7)** — mechanical layer (`rule7_mystery_reserve_preservation`); **judgment layer**: forbidden-answer overlap check against MR `disallowed cheap answers` lists is semantic — the validator catches `status: forbidden` + `future_resolution_safety` mismatches but cannot decide whether a stated reading collides with a forbidden answer.
   7. **Required updates enumerated AND patched** — mechanical (engine fail-fast on bidirectional pointer + `touched_by_cf_completeness`).
   8. **Stabilizer mechanisms named** — mechanical layer (Phase 7 stabilizers must name a concrete mechanism); **judgment layer**: hand-wave detection (e.g., "people just don't use it much" without mechanism) is semantic.
   9. **Verdict cites phases** — judgment only. Verdict reasoning cites specific phase findings; vague verdicts fail.
   10. **No specialness inflation (Rule 3)** — judgment only (Rule 3 is unmechanized per archived SPEC-04 §Risks). CF `statement`, `visible_consequences`, `distribution` clauses do not rely on unmotivated `#1` / `most` / `world-first` / `unparalleled` / `the only` claims. Either (a) cite a concrete stabilizer mechanism explaining the primacy, or (b) soften to pragmatic register (`among the foremost`, `notably large`, pragmatic-quantity comparisons). Under escalation, Phase 6b Theme/Tone critic is the primary catchment; under narrow proposals, this test is the only catchment.

9. **HARD-GATE → Phase 15a submit.** Present the deliverable summary. **Scale discipline** — large deliveries (≥6 affected sections OR ≥4 modification_history ops OR ≥3 new MR entries) present in thematic chunks: (1) verdict + phase-cited justification; (2) new CF YAML + CH YAML; (3) modification_history ops summarized per CF; (4) section appends summarized per file; (5) MR firewall extensions / new MR entries; (6) PA file path. Chunking is for review legibility; the HARD-GATE fires on a SINGLE approval moment covering the entire deliverable. On user approval, persist the patch plan envelope as JSON (e.g., `/tmp/<plan-id>.json`), invoke the canonical signer to issue the `approval_token` (`node tools/world-mcp/dist/src/cli/sign-approval-token.js <plan-path>` — see `docs/HARD-GATE-DISCIPLINE.md` §Issuing a token), then call `mcp__worldloom__submit_patch_plan(plan, approval_token)` with the same envelope object and the issued token. Two-phase commit and engine-controlled write order replace the prior 25+ Edit-with-checkpoint discipline — partial-failure recovery is structural, not procedural. On `approval_expired`, re-sign (plan unchanged, hashes match) and resubmit; on `approval_replayed`, do NOT resubmit (the prior submit already applied).

## PA `body_markdown` Structure

PA frontmatter is engine-validated against the SPEC-14 schema. The `body_markdown` payload of `append_adjudication_record` carries analysis prose and SHOULD include named sections in this order: `# Discovery` (top-of-file index mirroring the four `*_touched` frontmatter arrays for in-body grep); `# Proposal` (verbatim copy + user-stated constraints); `# Phase 0–11 Analysis` (full per-phase outputs); `# Phase 14a Validation Checklist` (10 tests with PASS/FAIL + one-line rationale); `# Verdict` + `# Justification` (phase-cited); `# Critic Reports` (verbatim, if escalation fired); `# Required World Updates Applied` (one-paragraph-per-section summary, accept only); `# Resubmission Menu` (REVISE) OR `# Why This Cannot Be Repaired` (REJECT); `# User Override` (if Phase 14b override fired). The Discovery-block `_touched` semantics (substantively-affected items only — items receiving extension blocks, firewall additions, mod_history entries, new entries, or pressured-deferral annotations; NOT items merely tested-and-found-compatible) is enforced for the frontmatter arrays by `record_schema_compliance`; body-markdown headings are free prose under those names.

## Guardrails

- **Single world per invocation.** Never creates a new world (`create-base-world` does that), never modifies `docs/FOUNDATIONS.md`, never touches other worlds, never touches `archive/` or `brainstorming/`.
- **Engine-only writes to `_source/`.** Direct `Edit`/`Write` on `_source/<subdir>/*.yaml` is blocked by Hook 3. Hybrid-file writes (PA, character, diegetic-artifact records) route through engine append ops; `WORLD_KERNEL.md` and `ONTOLOGY.md` are not in this skill's mutation surface.
- **ID-collision abort.** If the engine pre-apply check rejects an allocated ID as colliding (concurrent or interrupted prior run), abort and ask the user to resolve before retrying. Never overwrite an existing record.
- **Additive patches.** `append_extension` / `append_touched_by_cf` / `append_modification_history_entry` are append-only; structural-field rewrites require `update_record_field` with explicit retcon attestation.
- **Sub-agent dispatch.** Critic sub-agents receive only the minimum slice (typically a role-scoped `get_context_packet`) — not the full world. Sub-agents never write files.
- **HARD-GATE absoluteness.** Auto Mode does not relax the gate.
- **No git commit from inside the skill.** Writes land in the working tree; the user reviews and commits.
- **Worktree discipline.** All paths resolve from the worktree root if invoked inside a worktree.
- **No diegetic artifacts.** This skill operates on canon claims; in-world texts belong to `diegetic-artifact-generation`. If the proposal is shaped like a diegetic text, normalize at Phase 0 or abort with a pointer.

## Inherited-Drift Handling

If Phase 6b multi-critic synthesis OR inline-lens analysis flags pre-existing inconsistency inherited from prior CFs (counting drift, naming drift), resolve by counting/stating correctly in NEW prose only. Retroactive cleanup of pre-existing prose is out-of-scope and requires a separate retcon workflow. Log the inherited drift in the PA Justification section (or in the Critic Reports section when escalation fired). Silently correcting old prose violates Rule 6 even when factually right; perpetuating old drift squanders the chance to count honestly.

## Final Rule

A canon fact is not added until it has a scope, a consequence web, an ordinary-life signature, a stabilizer against universalization, an attribution trail in every record it touches, and a Change Log Entry the world can be audited against — and once added, the ledger is append-only; the only way to change an accepted fact is another run of this skill that produces an explicit retcon entry with retcon attestation on the patch op.
