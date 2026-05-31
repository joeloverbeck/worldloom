# Triage Recommendation Structure

Canonical structure for the triage recommendation emitted at SKILL.md Step 3's `For triage/analysis brainstorms` branch. SKILL.md retains the section name §Recommended triage-recommendation structure as the entry point; this file is the full specification.

## Per-item structure

Each triage item has three fields (parallel to the per-approach `Name / How it works / Tradeoffs` shape):

| Field | Always | Content |
|---|---|---|
| (i) **verdict** | yes | one of the 7 verdict types — see §Verdict types below |
| (ii) **rationale** | yes | 1-2 sentences naming the FOUNDATIONS / codebase / contract grounds for the verdict — content varies per verdict (see §Rationale field content per verdict) |
| (iii) **conditional sub-field** | conditional | `modification scope` (for `accept-with-modification`) / `alternative path` (for `reject`) / `deferred_to` (for `defer`) / `verification source` (for `refuted-by-verification`); absent for `accept` / `already-resolved` / `confirms-existing-position` |

## Verdict types

| Verdict | Conditional sub-field | Common shape | When NOT to use |
|---|---|---|---|
| `accept` | none | source-report item warrants action as-recommended | when modification scope is needed (use `accept-with-modification`) |
| `accept-with-modification` | `modification scope` | item warrants action with refinements (scope-narrowed, severity-shifted, technique-substituted) | when the modification flips the verdict (use `reject` + alternative path) |
| `reject` | `alternative path` | item declined with no positive scheduling intent; pairs with what to do INSTEAD (or nothing) | when the item is sound but routes to later (use `defer`) |
| `defer` | `deferred_to` | item judged sound but routed to a follow-up deliverable (later spec / ticket / brainstorm); positive judgment with scheduling delay | when declining outright (use `reject`) |
| `already-resolved` | none | re-triage scenario where the item was actioned between the original triage and the new pass | when the item was never actioned (use `accept` or `confirms-existing-position` per shape) |
| `confirms-existing-position` | none | source-report item whose recommendation — positive or negative — matches the project's current state without implying new work | when the item was actioned between triages (use `already-resolved`); when the item requires new work (use `accept`) |
| `refuted-by-verification` | `verification source` | source-report item whose claimed gap or recommendation premise is refuted by codebase / contract / agent verification at triage time (parallel-agent verification pattern or per-finding pre-emission verification per `triage-workflow-rules.md` §Schema/contract-claim verification before triage emission); the rationale field cites the file:line evidence refuting the premise | when the item was actioned between triages (use `already-resolved`); when the premise is sound but the proposal would violate architecture (use `reject` + alternative path); when the report endorses the existing position rather than challenging it (use `confirms-existing-position`) |

**Common `confirms-existing-position` shapes**: (a) a "do not recommend X" item from the source report that aligns with an existing architectural decision the project never adopted X under; (b) a "should keep doing Y" item that confirms an established convention.

**`confirms-existing-position` vs `already-resolved` distinction**: `already-resolved` applies when the project ACTIONED the item between triages; `confirms-existing-position` applies when NO action was needed because the project's position already aligned with the recommendation.

**`defer` vs `reject` distinction**: `reject` declines the proposal with no positive scheduling intent; `defer` carries a positive judgment with a scheduling delay. The `defer.deferred_to` sub-field names the follow-up deliverable shape (spec / ticket / brainstorm) plus the trigger condition for re-evaluation.

**Cross-item fold / subsume disposition**: when a source-report item's premise is refuted or declined but it carries a valid residual best absorbed into another finding rather than actioned standalone, express it via the dominant verdict (`refuted-by-verification` / `reject` / `accept-with-modification` as the item's shape fits) PLUS a rationale cross-reference to the absorbing finding's ID (e.g., `refuted-by-verification; residual test coverage folded into R1`). Do NOT coin a new verdict bucket for the fold — the seven verdicts above are closed; the fold is a rationale cross-reference, not a disposition of its own.

## Rationale field content per verdict

| Verdict | Rationale field content |
|---|---|
| `accept` / `accept-with-modification` | FOUNDATIONS / codebase / contract grounds for accepting |
| `reject` | FOUNDATIONS / codebase / contract grounds for declining |
| `defer` | proposal's own deferral recommendation OR operator's scope-distinct/cost-distinct rationale per SKILL.md §Pragmatic-softening disclosure site (4) |
| `already-resolved` | cites the resolving artifact (archived ticket / spec / commit / pull request) + the resolution date |
| `confirms-existing-position` | cites the architectural decision, prior triage, or canonical convention establishing the position |
| `refuted-by-verification` | cites the verification artifact (parallel-agent Explore finding, Read of cited file:line, grep of referenced section) + the specific premise refuted; quote the file:line evidence so a future reader can reconstruct the refutation without re-running the verification |

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

When the source report has **partial numbering** (some items numbered, others not — common when a report numbers its proposed specs/tickets but enumerates additional findings as un-numbered skill changes / contract additions / non-goals in a separate section), use the source numbering for the numbered items and extend with `R<N+1>`, `R<N+2>`, ... (continuing past the highest source-numbered item) for the un-numbered items, with a parenthetical source-location annotation on first reference (e.g., `R8 (report §10 — Player Agency Modes contract amendment)`). This keeps source-numbered items reconcilable to the report while giving un-numbered items stable IDs for cross-references within the triage. Do NOT use `O<N>` for un-numbered source items — `O<N>` is reserved for auditor-introduced findings that have no presence in the source report at all; partial-numbering items ARE source items and warrant the `R<N+1>` extension. Worked precedent: a triage brainstorm whose source report numbered its 7 proposed specs (SPEC-83 through SPEC-89) but enumerated 2 additional findings in an un-numbered §10 "Skill changes" sub-section invented verbose section-reference identifiers (`Report §10 Player Agency Modes contract addition`), breaking cross-session reconcilability that another operator's invented convention (`S1` / `S2`, or `R8` / `R9` extending past SPEC-89) would also have broken; the `R<N+1>` extension rule above gives both operators the same identifier.

IDs must be stable — the SKILL.md §Question-labeling discipline rule depends on stable IDs for question-vs-item disambiguation.

## Verdict-bucket grouping discipline

Group items by verdict bucket so the user can scan by verdict shape:

- All `accept` items together
- All `accept-with-modification` items together
- All `reject` items together
- All `defer` items together
- All `already-resolved` items together
- All `confirms-existing-position` items together
- All `refuted-by-verification` items together

**Section header rendering**: any case/styling fitting the brainstorm's prose register (e.g., `**ACCEPT**`, `### Accept`, `## accept-with-modification`). **In cross-references, rationale prose, and the per-item verdict field itself, use the canonical lowercase-hyphenated form** (e.g., `accept-with-modification`) for consistency with the skill's internal vocabulary.

## Out-of-report findings sub-section

When the auditor surfaces findings that were NOT in the source report (e.g., pre-existing contract/schema drift discovered during codebase exploration), add a separate **pre-deliverable cleanup** or **out-of-report findings** sub-section AFTER the verdict buckets. These findings have different provenance from source-report items and benefit from being named distinctly.

For triage brainstorms, this sub-section is also where SKILL.md Step 1 sub-step 1's **Diagnostic/analysis reference files** rule lands ("communicate these corrections prominently to the user before proceeding to triage"):

- **Corrections that materially reframe the triage** → place in the triage's lead OR a **verification headline** (which precedes the verdict buckets, satisfying the "prominently, before" requirement).
- **Remaining (non-reframing) contradictions** → place in the out-of-report findings sub-section.

## No-source-report diagnostic case

When the user's request is a diagnostic question, exploration prompt, or finding investigation rather than a formal numbered/tiered source report (the common shape for "figure out X" / "explore Y" / "what's happening with Z" requests), there is no source report to evaluate verdicts against. In this case:

- **Omit the verdict-bucket section entirely**. The seven verdict types (`accept` / `accept-with-modification` / `reject` / `defer` / `already-resolved` / `confirms-existing-position` / `refuted-by-verification`) are defined against source-report items; without a source report, none of them apply.
- **All findings route to the out-of-report findings sub-section**, keyed `O<N>` per §Per-item identifier convention. The sub-section heading may use the canonical `## Out-of-report findings (auditor-introduced)` form, or — when emphasis on the diagnostic provenance helps the reader — a register-matching variant like `## Findings discovered during diagnosis`.
- **The §Closing structure (deliverable-shape recommendation + named assumptions) still applies** — the absence of verdict buckets does not collapse the close-out discipline.

**Why this matters**: improvising verdict-bucket headers (e.g., placing diagnostic findings under an `accept (out-of-report)` header) conflates two structures the rest of this file keeps separate — verdict buckets are for source-report items; out-of-report findings live in their own sub-section. The conflation is forbidden by SKILL.md Step 3's `not to a new verdict bucket — the 7 verdicts above are closed` rule; this sub-section names what the structure looks like when no source-report items exist at all, so operators do not have to choose between conflict and improvisation.

**Common shape — answering user diagnostic questions**: when the user poses 1-2 diagnostic questions and the brainstorm produces findings that ANSWER those questions (e.g., "the bug is X" / "the contract-edit UI is missing"), the answers ARE the findings — emit them as `O1` / `O2` / ... in the out-of-report sub-section. Do NOT treat the user's questions as a synthetic source report and emit them as `R<N>` items with paired `confirms-existing-position` verdicts; the resulting `R<N>` items would just be restatements of the user's questions, which the user already knows.

**Worked precedent**: a Manual Story Studio diagnostic brainstorm (this session) was triggered by two user diagnostic questions ("what's causing the browser errors?" + "where does the user edit the story contract?"). The operator improvised by emitting one `confirms-existing-position` verdict (`V1: dashboard is read-only by design`) plus four out-of-report findings (`O1`–`O4`) under verdict-bucket headers (`accept (out-of-report findings discovered during diagnosis)` and `defer`). Under this rule, the verdict-bucket headers are omitted entirely — all five findings (the answer to Q1 plus the four adjacent findings) route to the out-of-report sub-section as `O1`–`O5`, and the close-out (`Companion triage file: …`; deliverable-shape recommendation; Step 6 menu) proceeds as normal.

## Closing structure

Close the triage recommendation with:

1. **Deliverable-shape recommendation** — one spec / N tickets / mixed batch / etc., per SKILL.md Step 5's deliverable classification rule.
2. **Named assumptions** — any remaining gaps surfaced as named assumptions (per SKILL.md §The Protocol's worked-example format `(N) X — assuming Y`).

**Deliverable assignment for multi-deliverable triages**: when the deliverable-shape recommendation produces ≥2 deliverables (≥2 specs or ≥3 tickets, per SKILL.md Step 5 / `deliverable-classification.md` §Triage producing ≥2 specs or ≥3 tickets), make the finding→deliverable mapping explicit in the in-chat recommendation rather than leaving the user to infer it — the in-chat recommendation is the artifact the user reviews to exercise (or confirm the pre-authorized) HARD-GATE, so which accepted finding lands in which deliverable is load-bearing at approval time. Use either (a) inline per-item annotation — append the target deliverable to each `accept` / `accept-with-modification` item (e.g., `R3 — <summary> → SPEC-58`), keeping verdict-bucket grouping as the primary axis; or (b) a `deliverable → findings` map placed beside the §Deliverable-shape recommendation (e.g., `SPEC-58: R1, R2, R4; SPEC-59: R5, R7`). This mirrors the item→path mapping `deliverable-classification.md` §Triage producing ≥2 specs or ≥3 tickets already requires for the durable companion triage file, keeping the live recommendation and the persisted file consistent. Single-deliverable triages omit this — no mapping is needed.

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

- **R<N>** — <item summary>[ → <target deliverable, when the triage produces ≥2 deliverables — per §Closing structure>]. _Rationale_: <FOUNDATIONS / codebase grounds>.
- ...

### Confirms-existing-position

- **R<N>** — <item summary>. _Rationale_: <cites architectural decision / convention establishing the position>.

### Accept-with-modification

- **R<N>** — <item summary>. _Modification scope_: <refinement>. _Rationale_: <grounds for accept + the modification>.

### Defer (to follow-up specs / waves)

- **R<N>** — <item summary>. _Rationale (pragmatic)_: <cost / scope-doubling reason>. _`deferred_to`_: <follow-up spec / ticket / brainstorm>; trigger condition for re-evaluation = <condition>.

### Reject

- **R<N>** — <item summary>. _Alternative path_: <what to do INSTEAD or "none">. _Rationale_: <grounds>.

### Refuted-by-verification

- **R<N>** — <item summary>. _`verification source`_: <agent finding / file:line / grep result>. _Rationale_: <verbatim evidence refuting the claim>.

## Out-of-report findings (auditor-introduced)

- **O<N>** — <item description>. <Resolution: landed in <site> | flagged for follow-up | etc.>

## Deliverable-shape recommendation

<one spec / N tickets / mixed batch — per SKILL.md Step 5's deliverable classification rule>
[For ≥2 deliverables, make the finding→deliverable mapping explicit per §Closing structure — inline `→ <deliverable>` annotations in the verdict buckets above, or a `deliverable → findings` map here.]

## Named assumptions

(1) <unknown> — assuming <assumption>; (2) <unknown> — assuming <assumption>; ...
```
