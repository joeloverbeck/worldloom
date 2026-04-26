# Audit Category Reasoning

Eight load-bearing audit categories plus two structural cross-cuts. Each entry names the FOUNDATIONS rule it enforces, the enumeration entry-point (a typed MCP query, never raw `Read`), and the semantic judgment the operator must apply on top of the enumeration.

The eight named audit categories are: contradictions, scope drift, capability creep, dangling consequences, thematic erosion, hidden retcons, mystery corruption, diegetic leakage. Phase 4 implements them through ten sub-passes (4a–4j) because contradictions split across ontological / causal / distribution / timeline axes and consequence evasion splits across institutional / everyday-life surfaces. The audit report names the categories the audit ran. Categories with no findings produce explicit "no findings — audited and clean" entries; silent skipping is a Phase 1 violation.

## Sub-passes

### 4a — Ontological Contradictions

- **Rule**: 1 (No Floating Facts).
- **Enumeration**: `search_nodes(node_types=['canon_fact_record'], filters={type: ['species','entity','metaphysical_rule','hidden_truth']})`; cross-check against ONT-N invariants via `get_neighbors`.
- **Judgment**: a CF asserts X exists while an invariant or another CF asserts X cannot exist. The validator can flag direct boolean conflicts; the operator decides whether two ontologically adjacent claims (e.g., "ghosts walk" + "no incorporeal beings") collide or can coexist as different categories.

### 4b — Causal Contradictions

- **Rule**: 1.
- **Enumeration**: `search_nodes` for CFs with non-empty `costs_and_limits`; `get_neighbors(CF, edge_types=['referenced_by_cf'])` to surface usage without payment.
- **Judgment**: stated costs / prerequisites / dependencies are violated by another CF. Operator decides whether the violation is an oversight or a deliberate exception.

### 4c — Distribution Contradictions

- **Rule**: 4 (No Globalization by Accident).
- **Enumeration**: `search_nodes(filters={'scope.geographic': ['local','regional']})`; `get_neighbors` for downstream references.
- **Judgment**: a scoped capability is used as universal in a downstream CF. Distinct from 4j: 4c checks scope conflict at the CF level (CF-to-CF); 4j checks drift at the prose level in domain SEC records.

### 4d — Timeline Contradictions

- **Rule**: 1.
- **Enumeration**: `get_record` per SEC-TML record; `find_sections_touched_by(cf_id)` for any CF with temporal markers.
- **Judgment**: historical order, age, diffusion impossibilities. Operator decides between "impossibility" and "reasonable approximation under the world's calendar imprecision".

### 4e — Institutional Contradictions

- **Rule**: 5 (No Consequence Evasion).
- **Enumeration**: `search_nodes(node_types=['section_record'], filters={file_class: 'institutions'})`; cross-reference against CFs whose `domains_affected` includes institutional domains.
- **Judgment**: a major power fails to react to a fact that should affect it. Operator decides whether the silence is an audit gap or a deliberate institutional posture (reluctance, suppression, ignorance).

### 4f — Everyday-Life Contradictions

- **Rules**: 2 (No Pure Cosmetics) and 5.
- **Enumeration**: `search_nodes(node_types=['section_record'], filters={file_class: 'everyday-life'})`; flag CFs whose `visible_consequences` would reshape labor / kinship / law / ecology and are not reflected in any ELF SEC.
- **Judgment**: ordinary life ignores world-shaping conditions. Operator decides whether the gap is a missing patch or a legitimate scope limit (e.g., the change has not yet diffused).

### 4g — Tone / Identity Drift

- **Rule**: World Kernel §Tonal Contract.
- **Enumeration**: `get_record(WORLD_KERNEL)` for tonal contract; `search_nodes` over recent CFs' `notes` and `statement` fields.
- **Judgment**: accumulated additions drift from kernel. Operator weighs whether a single CF's drift is local color or part of a cumulative slide. A kernel-violating finding here typically rates severity 4–5.

### 4h — Mystery Corruption

- **Rule**: 7 (Preserve Mystery Deliberately).
- **Enumeration**: `search_nodes(node_types=['mystery_reserve_entry'])`; `get_neighbors(M-NNNN, edge_types=['threatened_by_cf'])`.
- **Judgment**: an MR entry is being explained too fast or becoming incoherent. Operator decides whether a CF accidentally resolves a `status: forbidden` mystery, or whether the resolution remains genre-safe under the entry's `future_resolution_safety` declaration. Validators (`rule7_mystery_reserve_preservation`) catch boolean violations; the firewall judgment stays here.
- **Sub-pattern — dossier MR-firewall staleness**: for each character dossier or diegetic artifact whose `generated_date` predates a subsequent CH that added MR entries, record the MR-list gap as a sev-2 audit-trail finding (below default floor of 3 — report-only, no retcon card). Verify the dossier/artifact body and `known_firsthand` / `wrongly_believes` / `epistemic_horizon` against the newer MR entries' `disallowed cheap answers`. If actual leakage IS present, severity escalates per Phase 5. Naming this sub-pattern explicitly prevents it being re-discovered ad-hoc per audit run.

### 4i — Diegetic Leakage

- **Rule**: 7.
- **Enumeration**: `find_named_entities` to list `characters/` and `diegetic-artifacts/` records; `get_record` per dossier/artifact frontmatter.
- **Judgment**: a character's `known_firsthand` or an artifact's body reveals a fact from MR `disallowed cheap answers`, OR a CF whose `scope.social` is `restricted_group` / `secret`, without diegetic justification. Operator decides whether the diegetic basis is plausible (e.g., a guild scribe who plausibly DID hear it) or implausible (a peasant narrator citing institutional secrets).

### 4j — Local/Global Drift

- **Rule**: 4.
- **Enumeration**: `search_nodes(filters={'scope.geographic': ['local'], 'scope.social': ['restricted_group']})`; `find_impacted_fragments(CF-id)` to enumerate prose surfaces.
- **Judgment**: scoped CF whose downstream prose has dropped the scope qualifier. Distinct from 4c: 4j is the prose-level drift detection.

## Phase 6 — Burden Debt (Cross-cut)

- **Rule**: 3 (No Specialness Inflation).
- **Enumeration**: `search_nodes(node_types=['canon_fact_record'], filters={type: ['capability','artifact','technology','institution','ritual','magic_practice']})`; for each CF, `find_impacted_fragments(CF)` to enumerate later references.
- **Judgment**: the post-acceptance check for Rule 3 (acceptance-time enforcement lives in `canon-addition` Phase 11). A CF accepted with stabilizers can silently become consequence-free over many subsequent CFs that each individually seemed innocent — Phase 6 is the only surface that catches this cumulative drift. Operator decides what counts as "drift" vs legitimate refinement of a previously over-burdened capability.

Distinct from 4c in time horizon: 4c checks new facts at adoption for scope conflict; 6 checks old facts for drift since adoption.

## Empty findings are diagnostic signals

A category that was audited and returned zero findings is a legitimate clean-audit outcome. The audit report names the category as audited-and-clean rather than suppressing it. A reader must always be able to distinguish "audited and clean" from "never audited" — the latter belongs in `categories_deferred` with a one-line rationale.
