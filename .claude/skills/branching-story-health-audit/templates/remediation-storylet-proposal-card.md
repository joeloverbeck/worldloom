<!--
Remediation Storylet Proposal (RSP) card — template
Authored for branching-story-health-audit Phase 8 + Phase 10 step 1.
Hybrid YAML frontmatter + markdown body. Direct-`Write` is the correct mutation
surface (audits/SAU-NNNN/remediation-storylet-proposals/ lives outside _source/,
so Hook 3 doesn't apply).

Sub-class (a) consumer parity (per skill-creator §write-files step 5(c) for
sub-class (a) templates whose downstream consumer parses the frontmatter at
parse time): this card's frontmatter mirrors storylet-pool-authoring's
`source_audit_path` parse-time consumer schema byte-for-byte. Preserve every
field name and shape on schema evolution; downstream acceptance is a field-copy,
NOT a field-re-derivation. Named consumer: storylet-pool-authoring (mode=audit;
abort-until-shipping currently per §Pre-flight; STPOOL-001 wires consumption).
-->
---
rsp_id: RSP-NNNN
audit_id: SAU-NNNN
story_id: STORY-NNN

# Findings this RSP card addresses (one or more F-NN ids from the SAU report's consolidated findings list).
finding_ids: []

# Targeting fields — at least one MUST be non-null. Drives storylet-pool-authoring's mode=audit seed selection.
target_obligation: null              # OBL-NNNN | null
target_thread: null                  # THR-NNNN | null
target_consequence: null             # CNSQ-NNNN | null
target_relationship: null            # SREL-NNNN | null

# Per the SLT shape enum (storylet-pool-authoring templates/storylet-record.yaml).
proposed_shape: entry_pressure       # entry_pressure | cast_introduction | threat_escalation | relational_dynamics | routine_disruption | aftermath_sequel | reflection_dilemma | mystery_edge_brush | fork_recovery | thread_resolution | aftermath_residue | intimacy | confrontation | other

# Within STORY_KERNEL.content_intensity_baseline ± 1 band (Phase 8 Per-Card Validation test 6).
proposed_intensity: mature           # tame | mature | explicit

# Where the resulting storylet should be visible. Matches proposed_visibility.scope per Phase 8 Per-Card Validation test 4.
target_branch: "all branches"        # branch_path (e.g., "PG-0001 → PG-0007 → PG-0019") | "all branches" | "global pool"

proposed_visibility:
  scope: global_author_pool          # global_author_pool | branch_scoped | branch_prefix_scoped
  visible_branch_path_prefix: null   # required when scope is branch_prefix_scoped or branch_scoped; null otherwise

# Sketch of the storylet storylet-pool-authoring (mode=audit) will draft.
sketch:
  hard_preconds: []                  # predicate forms per storylet-pool-authoring's Predicate DSL
  fact_effects: []                   # fact_template entries with epistemic_class
  pays_off_obligations: []           # OBL-NNNN ids matched by the OBL matcher
  opens_obligations: []              # new OBL templates the storylet would emit
  addresses_consequences: []         # CNSQ kind matchers
  choice_templates: []               # 4-6 entries; each with operation + target_role + likely_effects + choice_mode + poetic_effect

rationale: >
  One short paragraph stating why this storylet would close the finding(s)
  cited in finding_ids. Read by storylet-pool-authoring's audit-mode Phase 1
  diagnosis loop and surfaced in the SLB batch manifest's provenance trail.
---

# RSP-NNNN: <one-line title>

## Diagnosis

<What the source finding(s) identified — one paragraph, citing the specific OBL/THR/CNSQ/SREL state and the audit phase that surfaced the issue.>

## Proposed remediation

<The storylet shape and effects this RSP proposes, expressed in narrative terms (the structured fields above carry the machine-consumable form). Name the dramatic transaction the storylet would create, the cast it would engage, and the obligation/thread/consequence it would close or escalate.>

## Routing

Consume this card as `storylet-pool-authoring`'s `source_audit_path` input:

```
storylet-pool-authoring
  world_slug=<world-slug>
  story_slug=<story-slug>
  mode=audit
  source_audit_path=worlds/<world-slug>/stories/<story-slug>/audits/SAU-NNNN/remediation-storylet-proposals/RSP-NNNN-<slug>.md
```

The downstream skill's mode=audit Phase 1 diagnosis loop reads this card's frontmatter targeting fields and `sketch` block to seed Phase 2 generation. Visibility scope is inherited from `proposed_visibility.scope`. Mystery firewall enforcement (storylet-pool-authoring Phase 4 gate 1) cross-checks against the world's whole-class M load — an RSP card proposing resolution of a `forbidden`-status M would be caught here even if Phase 8 Per-Card Validation test 2 missed it.
