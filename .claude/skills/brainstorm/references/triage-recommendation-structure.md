# Triage Recommendation Structure

Canonical structure for the triage recommendation emitted at SKILL.md Step 3's `For triage/analysis brainstorms` branch. SKILL.md retains the section name §Recommended triage-recommendation structure as the entry point; this file is the full specification.

## Per-item structure

Each triage item has three fields (parallel to the per-approach `Name / How it works / Tradeoffs` shape):

| Field | Always | Content |
|---|---|---|
| (i) **verdict** | yes | one of the 6 verdict types — see §Verdict types below |
| (ii) **rationale** | yes | 1-2 sentences naming the FOUNDATIONS / codebase / contract grounds for the verdict — content varies per verdict (see §Rationale field content per verdict) |
| (iii) **conditional sub-field** | conditional | `modification scope` (for `accept-with-modification`) / `alternative path` (for `reject`) / `deferred_to` (for `defer`); absent for `accept` / `already-resolved` / `confirms-existing-position` |

## Verdict types

| Verdict | Conditional sub-field | Common shape | When NOT to use |
|---|---|---|---|
| `accept` | none | source-report item warrants action as-recommended | when modification scope is needed (use `accept-with-modification`) |
| `accept-with-modification` | `modification scope` | item warrants action with refinements (scope-narrowed, severity-shifted, technique-substituted) | when the modification flips the verdict (use `reject` + alternative path) |
| `reject` | `alternative path` | item declined with no positive scheduling intent; pairs with what to do INSTEAD (or nothing) | when the item is sound but routes to later (use `defer`) |
| `defer` | `deferred_to` | item judged sound but routed to a follow-up deliverable (later spec / ticket / brainstorm); positive judgment with scheduling delay | when declining outright (use `reject`) |
| `already-resolved` | none | re-triage scenario where the item was actioned between the original triage and the new pass | when the item was never actioned (use `accept` or `confirms-existing-position` per shape) |
| `confirms-existing-position` | none | source-report item whose recommendation — positive or negative — matches the project's current state without implying new work | when the item was actioned between triages (use `already-resolved`); when the item requires new work (use `accept`) |

**Common `confirms-existing-position` shapes**: (a) a "do not recommend X" item from the source report that aligns with an existing architectural decision the project never adopted X under; (b) a "should keep doing Y" item that confirms an established convention.

**`confirms-existing-position` vs `already-resolved` distinction**: `already-resolved` applies when the project ACTIONED the item between triages; `confirms-existing-position` applies when NO action was needed because the project's position already aligned with the recommendation.

**`defer` vs `reject` distinction**: `reject` declines the proposal with no positive scheduling intent; `defer` carries a positive judgment with a scheduling delay. The `defer.deferred_to` sub-field names the follow-up deliverable shape (spec / ticket / brainstorm) plus the trigger condition for re-evaluation.

## Rationale field content per verdict

| Verdict | Rationale field content |
|---|---|
| `accept` / `accept-with-modification` | FOUNDATIONS / codebase / contract grounds for accepting |
| `reject` | FOUNDATIONS / codebase / contract grounds for declining |
| `defer` | proposal's own deferral recommendation OR operator's scope-distinct/cost-distinct rationale per SKILL.md §Pragmatic-softening disclosure site (4) |
| `already-resolved` | cites the resolving artifact (archived ticket / spec / commit / pull request) + the resolution date |
| `confirms-existing-position` | cites the architectural decision, prior triage, or canonical convention establishing the position |

## Sub-variant splitting within modification scope

When an `accept-with-modification` verdict has multiple modification-scope paths with materially different costs / risks (e.g., "swap to a CJS markdown lib" vs "use dynamic import + async parseMarkdown" — both viable realizations of the same accept verdict, with order-of-magnitude cost differences), label each path explicitly as `scope-path-A` / `scope-path-B` in the modification-scope field rather than bundle. The user's selection of an ambiguous `accept-with-modification` verdict otherwise forces the same clarification round that approach-level sub-variant bundling produces (parallel to SKILL.md §Approach proposal §Sub-variant splitting).

## Per-item identifier convention

Derive the convention from the source report's own numbering when present:

- `P1` for "P1 finding"
- `R10` for "Recommendation 10"
- `F-01` (or any custom prefix) for source-report-derived numbering

When the source report has no numbering, use sequential:

- `R<N>` for source-report items
- `O<N>` for out-of-report (auditor-introduced) findings — regardless of the source convention, out-of-report items always use the literal `O<N>` prefix to unambiguously distinguish them from source items in any cross-reference

IDs must be stable — the SKILL.md §Question-labeling discipline rule depends on stable IDs for question-vs-item disambiguation.

## Verdict-bucket grouping discipline

Group items by verdict bucket so the user can scan by verdict shape:

- All `accept` items together
- All `accept-with-modification` items together
- All `reject` items together
- All `defer` items together
- All `already-resolved` items together
- All `confirms-existing-position` items together

**Section header rendering**: any case/styling fitting the brainstorm's prose register (e.g., `**ACCEPT**`, `### Accept`, `## accept-with-modification`). **In cross-references, rationale prose, and the per-item verdict field itself, use the canonical lowercase-hyphenated form** (e.g., `accept-with-modification`) for consistency with the skill's internal vocabulary.

## Out-of-report findings sub-section

When the auditor surfaces findings that were NOT in the source report (e.g., pre-existing contract/schema drift discovered during codebase exploration), add a separate **pre-deliverable cleanup** or **out-of-report findings** sub-section AFTER the verdict buckets. These findings have different provenance from source-report items and benefit from being named distinctly.

For triage brainstorms, this sub-section is also where SKILL.md Step 1 sub-step 1's **Diagnostic/analysis reference files** rule lands ("communicate these corrections prominently to the user before proceeding to triage"):

- **Corrections that materially reframe the triage** → place in the triage's lead OR a **verification headline** (which precedes the verdict buckets, satisfying the "prominently, before" requirement).
- **Remaining (non-reframing) contradictions** → place in the out-of-report findings sub-section.

## Closing structure

Close the triage recommendation with:

1. **Deliverable-shape recommendation** — one spec / N tickets / mixed batch / etc., per SKILL.md Step 5's deliverable classification rule.
2. **Named assumptions** — any remaining gaps surfaced as named assumptions (per SKILL.md §The Protocol's worked-example format `(N) X — assuming Y`).

## Close-out decision tree — `AskUserQuestion` vs named-assumptions

| Remaining-gap shape | Mode / pre-authorization state | Action |
|---|---|---|
| Gap is **material-deliverable-shape** (changes deliverable type / substantive scope / count) | Any mode (including auto mode + user pre-authorization) | Prefer `AskUserQuestion` to settle before proceeding — design-approval HARD-GATE does NOT cleanly recover from deliverable-shape mismatches, which require rewriting rather than refining the deliverable |
| Gap is **content-level** within a stable deliverable shape | Non-auto mode, no pre-authorization | Prefer `AskUserQuestion` to settle before proceeding |
| Gap is **content-level** within a stable deliverable shape | Auto mode (or user pre-authorization in effect) | Default to **named-assumptions + design-approval HARD-GATE**; the HARD-GATE preserves the user-alignment function `AskUserQuestion` would otherwise serve, while honoring auto mode's no-pause directive |
| No remaining gaps | Any | Proceed directly |

**Rule routing**: the `AskUserQuestion` route satisfies SKILL.md §"Wait for user to choose or ask questions". The named-assumptions route is the directed-design carve-out's "name the open design decisions" path from SKILL.md Step 1 sub-step 5. `AskUserQuestion` remains the non-auto-mode preference.

**`multiSelect` close-out**: when the close-out `AskUserQuestion` is a `multiSelect` (e.g., "which borderline items should the deliverable include?"), surface the per-option operator lean inside each option's `description` field (`My lean: include — …` / `My lean: reject — …`) rather than relying on the recommended-option-first convention, which assumes a single recommended option and does not apply when options carry independent leans.

## Why this structure is reconcilable across sessions

Two operators triaging the same input arrive at comparable shape regardless of judgment differences on individual verdicts — verdict-bucket grouping + stable per-item IDs + canonical sub-field discipline give the triage a uniform shape that survives session boundaries.

## Worked triage skeleton

```markdown
## Verification headline (reframing corrections before verdicts)

[optional — only when a correction materially reframes the source report; otherwise omit and place non-reframing contradictions in §Out-of-report findings below]

## Triage verdicts

### Accept

- **R<N>** — <item summary>. _Rationale_: <FOUNDATIONS / codebase grounds>.
- ...

### Confirms-existing-position

- **R<N>** — <item summary>. _Rationale_: <cites architectural decision / convention establishing the position>.

### Accept-with-modification

- **R<N>** — <item summary>. _Modification scope_: <refinement>. _Rationale_: <grounds for accept + the modification>.

### Defer (to follow-up specs / waves)

- **R<N>** — <item summary>. _Rationale (pragmatic)_: <cost / scope-doubling reason>. _`deferred_to`_: <follow-up spec / ticket / brainstorm>; trigger condition for re-evaluation = <condition>.

### Reject

- **R<N>** — <item summary>. _Alternative path_: <what to do INSTEAD or "none">. _Rationale_: <grounds>.

## Out-of-report findings (auditor-introduced)

- **O<N>** — <item description>. <Resolution: landed in <site> | flagged for follow-up | etc.>

## Deliverable-shape recommendation

<one spec / N tickets / mixed batch — per SKILL.md Step 5's deliverable classification rule>

## Named assumptions

(1) <unknown> — assuming <assumption>; (2) <unknown> — assuming <assumption>; ...
```
