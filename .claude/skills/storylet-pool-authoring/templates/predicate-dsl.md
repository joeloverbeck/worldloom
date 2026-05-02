# Predicate DSL — Storylet Pool Authoring

Storylet `hard_preconds`, `soft_preconds`, `cast_requirements`, `location_requirements`, and choice-template preconditions all depend on engine-checkable predicates. The runtime `branching-story-page-cycle`'s choice-validation, consequence-capacity, and invariant-compatibility checks consume these predicates. Free-form prose predicates make the engine LLM-dependent for what should be deterministic — the DSL closes the grammar.

The DSL is **closed**: LLM proposers may NOT invent new `pred` types. Extending the DSL is an authorial change to this document, not a runtime act.

This file is inlined verbatim into Phase 3's LLM prompt and consulted by Phase 4 gate 7 (Predicate DSL parsability).

## Allowed Predicate Forms

```yaml
- pred: fact_true
  fact: SF-NNNN

- pred: fact_matches
  subject: STENT-NNNN | role:<role>
  predicate: alive | present | has_object | knows | believes | relationship_axis | location
  object: <value or record-id>

- pred: entity_state
  entity: STENT-NNNN | role:<role>
  property: alive | conscious | present | willing | armed | injured | mobile | restrained
  op: == | != | > | < | >= | <=
  value: <value>

- pred: relationship
  from: STENT-NNNN | role:<role>
  to: STENT-NNNN | role:<role>
  axis: trust | fear | desire | debt | intimacy | loyalty | resentment | power_imbalance
  op: == | != | > | < | >= | <=
  value: <number>

- pred: consequence_pending
  kind: <CNSQ kind>
  salience_min: 0..10

- pred: obligation_open
  matcher: {...}                    # OBL field-matcher (type, owner, salience_min, etc.)

- pred: location
  current_location: STLOC-NNNN | role:<location-role>

- pred: epistemic
  fact: SF-NNNN
  class: objective | belief | rumor | reader_inference | apparent | disputed
  certainty_min: 0.0..1.0

- pred: not
  predicate: {...}

- pred: all
  predicates: [...]

- pred: any
  predicates: [...]
```

## Validation Rules

- Every predicate MUST be one of the eleven `pred` forms above. Unknown `pred` values are HARD-REJECTed at Phase 4 gate 7.
- Every `subject` / `entity` / `from` / `to` value MUST be either a `STENT-NNNN` id (declared in this story bundle's `_source/entities/`) OR a `role:<name>` matcher (resolved at runtime by the page-cycle to a STENT bound to that role).
- Every `fact` value MUST be an `SF-NNNN` id (declared in this story bundle's `_source/facts/`) OR a `fact_template` shape consumed by the engine at apply time.
- `op` values are restricted to the six relational operators listed; arithmetic operators (`+`, `-`, etc.) are NOT permitted.
- `not` takes exactly one nested `predicate`; `all` and `any` take a list of nested predicates (each itself one of the eleven forms or a recursive `not`/`all`/`any`).
- Free-form prose anywhere within a predicate body fails parse.

## Why this discipline

The runtime page-cycle's Phase 4 storylet selection scores eligibility against `state_snapshot` deterministically. Free-form prose predicates would force the engine to invoke an LLM for every eligibility check, making selection slow and non-reproducible across re-runs. The closed DSL keeps selection deterministic, replayable, and auditable; LLM authorial input is preserved for the storylet's *content* (title, prose, choice_templates, tone), not its *eligibility*.
