# Phase 0: Normalize Mining Parameters

Load this reference when entering Phase 0 to normalize the mining search-space parameters.

## Parameter Normalization

Parse `parameters_path` if provided; otherwise interview the user for each parameter.

| Parameter | Default | Valid values / notes |
|---|---|---|
| `max_cards` | 5 | Any integer ≥ 0. `0` is a dry-run / reconnaissance value: Phase 1-7 run normally but Phase 8 writes only a diagnostic empty-batch manifest with no cards. |
| `novelty_range` | `moderate` | `conservative` (prefer specification of existing CFs), `moderate`, or `bold` (prefer genuinely new mechanisms). Affects Phase 4 scoring weight, not hard filtering. |
| `taboo_areas` | `[]` | Free-form strings the user wants the mining to steer away from. Applied as Phase 5 R3 rejection trigger (`taboo-overlap`). |
| `allow_soft_canon_only` | `false` | If `true`, Phase 3 demotes all `hard_canon` candidates to `soft_canon` with scope narrowed to artifact's region. Use when the user wants a conservative pass that avoids any continental-level claim. |

## Interview Path (when parameters_path absent)

If `parameters_path` is not provided, Phase 0 interviews the user for each of the four parameters above with one-line prompts. Accept minimal responses (e.g., "5 / moderate / — / false" collapses to default).

## Gap-Filler Path (when parameters_path thin)

If `parameters_path` is provided but omits fields, Phase 0 runs a targeted gap-filler interview asking only for the missing fields. Do not re-ask for provided values.

## Discipline

- Parameters are **search-space constraints**, not content directives. A `parameters_path` that dictates specific candidate facts ("include a card about the lighthouse ritual") is rejected at parse time — the mining process extracts claims from the artifact, not from the parameters.
- `allow_soft_canon_only: true` does not invalidate Phase 3's narrator-reliability table; it adds a post-mapping demotion pass. A candidate that would have mapped to `contested_canon` stays `contested_canon`; only `hard_canon` candidates are demoted.
- `novelty_range` is a soft influence on Phase 4 scoring, not a Phase 5 rejection trigger. A `conservative` run does not auto-reject bold candidates; it biases scoring toward specification-of-existing-canon candidates.

## Output to Batch Manifest

Record normalized parameters in the batch manifest's `parameters` frontmatter block. Every downstream reviewer should be able to reconstruct the mining search-space from the manifest alone.
