# Context Packet Contract

`mcp__worldloom__get_context_packet(task_type, seed_nodes, token_budget)` is the retrieval-side contract for giving a skill the minimum complete input bundle required by `docs/FOUNDATIONS.md` without forcing the skill to load raw world files opportunistically.

This contract is phase-defining for the machine-facing layer. Shape changes should be treated as breaking changes for retrieval consumers.

## Packet Shape

```yaml
task_header:
  task_type: canon_addition | character_generation | diegetic_artifact_generation | continuity_audit | other
  world_slug: animalia
  generated_at: "2026-04-23T00:00:00Z"
  token_budget:
    requested: 12000
    allocated: 9800
  seed_nodes:
    - CF-0012
    - animalia:INSTITUTIONS.md:market-regulation
  packet_version: 1
nucleus:
  nodes: []
  why_included: []
envelope:
  nodes: []
  why_included: []
constraints:
  active_rules: []
  protected_surfaces: []
  required_output_schema: []
  prohibited_moves: []
  open_risks: []
suggested_impact_surfaces:
  nodes: []
  rationale: []
```

## Layer Semantics

### 1. Task header

Declares the invocation context:

- task type
- world slug
- packet version
- budget request vs allocation
- seed nodes or seed ids that anchored retrieval
- generation timestamp for debugging and stale-packet diagnosis

The header is descriptive, not deliberative. It explains how the packet was assembled; it does not tell the skill what answer to produce.

### 2. Nucleus

The nucleus is the unquestionably relevant core.

It should contain only nodes the skill would be incorrect to omit, such as:

- directly requested canon facts
- the exact domain sections the seed nodes modify or depend on
- contradiction records or mystery-reserve entries that materially constrain the ask
- mandatory governing files for the task class when those files are below the direct-packet threshold

If a node lands in the nucleus, the retrieval layer is asserting that the downstream skill needs it, not just that it might be interesting.

### 3. Envelope

The envelope is the minimal surrounding context required to interpret the nucleus safely.

Typical envelope material:

- prerequisite facts upstream of a nucleus canon fact
- adjacent institution, geography, or timeline nodes needed for scope control
- neighboring records that prevent false novelty or silent contradiction
- nearby prose anchors that preserve local meaning for downstream edits

The envelope should be intentionally bounded. It exists to keep the skill from decontextualizing the nucleus, not to recreate whole-file reading.

### 4. Constraints

Constraints convert FOUNDATIONS and workflow policy into machine-delivered guardrails.

The layer should encode:

- active FOUNDATIONS rules or validator checks relevant to the task
- protected or engine-only surfaces
- output-shape requirements for the skill
- prohibited mutation patterns
- size or retrieval warnings
- open risks already known from the index or prior validation

This is where the packet tells the skill what must not be violated.

### 5. Suggested impact surfaces

This layer is advisory. It identifies likely downstream surfaces the skill should inspect or mention before claiming completion.

Examples:

- domain files likely to require updates
- related canon facts likely to be narrowed or contradicted
- dossier, artifact, or audit surfaces that would be invalidated by the requested change

Suggested impact surfaces should help the skill avoid consequence evasion without pretending to be a full dependency closure proof.

## Assembly Discipline

- Prefer exact ids and typed edges before lexical search.
- Keep nucleus and envelope separate; "important" and "helpful" are not the same.
- Budget pressure should trim the envelope before the nucleus.
- If completeness cannot be satisfied inside budget, the packet should surface that as a constraint rather than silently omitting required context.
- Retrieval should be deterministic for the same world state, task type, seed set, and budget.

## Example Shapes

### Canon addition

- **Task header**: `task_type=canon_addition`, seed nodes include proposal card, cited CF records, and affected domain file nodes.
- **Nucleus**: governing invariants, directly cited canon facts, relevant contradiction entries, target domain sections.
- **Envelope**: immediate prerequisite and consequence neighbors.
- **Constraints**: Rules 1 through 7, protected world-level surfaces, required adjudication outputs.
- **Suggested impact surfaces**: likely downstream domain files, ledger records, adjudication path.

### Character generation

- **Task header**: `task_type=character_generation`, seed nodes include brief-derived entities, relevant place nodes, and institution nodes.
- **Nucleus**: world kernel, invariants touching embodiment and society, directly relevant canon facts, mystery-reserve boundaries.
- **Envelope**: adjacent institutions, regional details, and distribution-limiting facts.
- **Constraints**: no world-level writes, Rule 4 distribution discipline, mystery-reserve firewall.
- **Suggested impact surfaces**: `characters/INDEX.md`, related local dossiers, open audits involving the same place or institution.

### Continuity audit

- **Task header**: `task_type=continuity_audit`, seed nodes include suspected contradictions or drift clusters.
- **Nucleus**: conflicting canon facts, impacted domain files, prior audit records, adjudications.
- **Envelope**: prerequisite facts and timeline or geography neighbors needed to classify the contradiction.
- **Constraints**: audit-only output surface, no canon mutation without a separate canon-addition flow.
- **Suggested impact surfaces**: retcon-proposal slots, affected artifacts or character dossiers, unresolved contradiction clusters.

## Non-Goals

- This packet is not a hidden full-world snapshot.
- It does not replace user approval or HARD-GATE discipline.
- It does not decide truth; it delivers structured context so the skill can decide truthfully.
