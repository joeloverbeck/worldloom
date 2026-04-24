# Findings Classification and Presentation (Steps 5-6)

## Step 5: Classify Findings

Organize findings from Steps 3 and 4 into:

- **Issues**: Factually wrong, stale, violates FOUNDATIONS, or proposes redundant deliverables when existing infrastructure suffices. Blocks ticket decomposition.
- **Improvements**: Not wrong, but a refinement would make implementation cleaner, safer, or more aligned.
- **Additions**: Beneficial features not in the spec that align with its goals. Apply YAGNI — only natural extensions of the spec's scope.

For each finding, record:

- What the spec says (or omits)
- What the codebase actually has (with file paths and line references)
- The recommended change

Tag severity: CRITICAL (blocks tickets), HIGH (fix before tickets), MEDIUM (improves quality), LOW (nice to fix).

## Step 6: Present Findings

**Redesign-count checkpoint (before drafting the presentation)**: Count the deliverables whose approach was materially changed by the reassessment — eliminated, replaced with a different mechanism, or restructured such that the implementation path is not a refinement of the original. Include this count as `N / total`. If `N / total > 50%`, the Substantial Redesign Flag section below MUST appear in the output immediately above Questions. If `N / total <= 50%`, omit the Substantial Redesign Flag section entirely. Emit the `N / total` count as a one-line note at the top of the Step 6 `### Classification` block regardless of whether the flag fires — e.g., `Redesign count: 1/6 deliverables materially changed (below 50% threshold; Substantial Redesign Flag omitted)` — so the checkpoint's decision is auditable from the user-facing report.

**Denominator convention**: `total` is the **pre-reassessment** deliverable count — the count in the spec as-read at Step 1. Dropped deliverables count as `materially changed` and stay in the denominator; added deliverables count as `materially changed` and increase the denominator. Rationale: the ratio measures how much of the spec the user originally wrote is changing, not how much of the spec post-reassessment is new. Use the same denominator through every emission of the redesign-count ratio in a single reassessment (initial Step 6 draft, revised post-question Step 6 output, Step 8 summary) — a reassessment that emits `1/4` in Step 6 and `1/3` in Step 8 is internally inconsistent even when both ratios fall on the same side of the 50% threshold.

**Material-change boundary — anchoring examples**: Examples of *refinements that do not count as material*: field renames (`content_hash` → `body_hash`), type-shape adjustments that preserve the deliverable's role (`Map<string, Node>` → `Record<string, Node>`), signature-preserving parameter reorderings, prose rewording of the deliverable's framing without changing what the implementation does. Examples of *material changes*: elimination of a deliverable, replacement of its mechanism (e.g., FTS5 replaced with a different full-text engine; SQLite replaced with a different store), restructuring that changes the set of packages or modules the deliverable touches, changing the read/write direction of data flow, introducing a new authoritative state where the original was a derived view (or vice versa). **Middle-intensity case — layer rename that restructures surface without changing mechanism**: when a deliverable renames multiple top-level layers / sections / classes AND adds new sub-semantics to them, but the underlying mechanism (code path, data sources, trim/budget/error-handling discipline) is preserved, the rename does NOT count as material *if consumers can adapt field-by-field* — i.e., each new layer name has a clear predecessor in the old shape and the transition is a mapping, not a rewrite. Worked example: context packet v1→v2 where the five top-level layers (`nucleus`, `envelope`, `constraints`, `suggested_impact_surfaces`, plus `task_header`) are renamed to completeness classes (`local_authority`, `exact_record_links`, `scoped_local_context`, `governing_world_context`, `impact_surfaces`) while the assembler's role, the trim-envelope-before-nucleus discipline, and the structured-error-on-insufficiency contract are preserved → non-material refinement. The rename DOES count as material if consumers must re-read the packet from scratch under the new shape — i.e., the mapping is not field-by-field and prior-shape mental models do not carry over. Decision rule: ask whether a consumer who knew the v1 shape can construct a correct v2 mental model by applying a rename table. If yes → refinement. If no → material change.

Present in this format:

```
## Reassessment: <spec-name>

### Classification
<spec type (a)-(d)> — <one-line description>. Steps applied: <list>. Steps skipped: <list>.
Redesign count: <N/total> deliverables materially changed (<above | below> 50% threshold; Substantial Redesign Flag <included | omitted>).

### Issues (must fix)
[If none: "No issues found."]
1. **[SEVERITY] <title>** — <spec says> vs. <codebase has>. Recommendation: <change>.

### Improvements (should fix)
[If none: "No improvements found."]
1. **[SEVERITY] <title>** — <current text> could be improved because <reason>. Recommendation: <change>.

### Additions (consider adding)
[If none: "No additions proposed."]
1. **[SEVERITY] <title>** — <what's missing> because <reason>. Recommendation: <new section>.

### FOUNDATIONS.md Alignment
- <Principle name>: <aligned | see Issue #N [SEVERITY]>

### Canon-Pipeline Impact Rule
[Only if Step 4.4 triggered. Otherwise omit. Format each point as:]
1. Write authority — pass | N/A | **flag** (reason)
2. Scope declaration — pass | N/A | **flag** (reason)
3. Audit trail — pass | N/A | **flag** (reason)
4. Mystery Reserve firewall — pass | N/A | **flag** (reason)
5. Invariant preservation — pass | N/A | **flag** (reason)
6. Canon-layer discipline — pass | N/A | **flag** (reason)
7. Rollback discipline — pass | N/A | **flag** (reason)

### Substantial Redesign Flag
[If >50% of deliverables change approach: "This reassessment proposes substantial redesign of N/M deliverables. Goals preserved but implementation path changes significantly."]
[If not triggered: omit section.]

### Questions
[If none: "No questions."]
1. <question>
```

**Finding-key convention**: In Step 7's Pre-Apply Verification table and Step 8's status reporting, Issues are keyed `I1, I2, …`; Improvements are keyed `M1, M2, …`; Additions are keyed `A1, A2, …`. Preserve the within-category number from this section (e.g., the third Improvement listed here becomes `M3` in Step 7). Candidate findings that get merged into another finding's recommendation during Step 6 drafting do NOT receive a Step 7 key — they dissolve into the consolidating finding's row. Key Step 7 strictly from Step 6's presented list: the first presented Improvement is `M1` regardless of any internal drafting-time labels you used before consolidation.

## Question Handling

- **Option fidelity**: Each option that names an existing type, field, or function must cite its current definition (grepped at presentation time), not a summary characterization. The user's approval binds to the option label, so an imprecise label — e.g., describing a field as `Map<string, Node>` when the actual type is `Record<string, NodeSummary>` — produces an ambiguously approved fix that the Step 7 pre-apply check must then disambiguate. Ground every option in current code before presenting.
- **Initial report**: At most 3 questions. If more, prioritize blockers and defer rest to follow-up.
- **Interdependent questions**: Present as a single combined question with labeled option combinations.
- **Discrete options (2-4), single question**: Use `AskUserQuestion` with a recommended default.
- **Discrete options (2-4), bundled (2–3 questions in one review round)**: Prefer plain-text bullets with labeled options `(a)/(b)/…` and a recommendation per question, under a single `### Questions` heading. This reads more cleanly than multiple `AskUserQuestion` calls and lets the user answer inline (e.g., "1) a, 2) b, 3) proceed with recommendation"). Use `AskUserQuestion` only when a single discrete-option question stands alone.
- **Open-ended questions**: Present as plain text in the report.
- **Follow-up rounds**: One question at a time. If answers raise new questions or invalidate findings, present a follow-up round (same format). Repeat until resolved.
- **Delegated resolution**: If the user delegates (e.g., "you decide based on FOUNDATIONS"), resolve by reasoning against the referenced constraint. If resolution requires additional codebase investigation, perform a mini Step 3 scoped to the question. If the investigation touches >3 files, consider launching a focused Explore agent rather than manual reads. If none of the original options are ideal, propose a new option with justification — scope investigation to 1-3 targeted checks. If the new option affects dependencies or package boundaries, present as a new finding first.
- **Conditional approval**: If the user's answer approves an option contingent on a verifiable premise (e.g., "proceed with (a) as long as we truly need those three new accessors", "go with (b) if X is the right entry point"), treat the premise as a mini Step 3 scoped to the condition — grep/read the relevant code, confirm or refute the premise, and proceed only if confirmed. Surface the verification outcome explicitly in the Step 7 Pre-Apply Verification Table row for the affected finding. If the premise is refuted, re-present the affected finding with a corrected recommendation and wait for follow-up approval before applying edits. A conditional approval is not a blanket approval: the condition is part of the contract. (See also `references/spec-writing-rules.md` §Pre-Apply Verification — the Hybrid user-answered + proactive-verification row shape is the proactive variant of this rule: auditor-initiated verification of a user-answered option's premise without a user-imposed condition.)

Wait for user response before proceeding to Step 7. (In plan mode, this wait is replaced by ExitPlanMode approval — see `references/plan-mode.md`.) Findings are approved unless explicitly objected to.

**Auto-mode interaction**: When auto mode is active AND the findings contain no Issues (CRITICAL/HIGH severity or FOUNDATIONS violations) AND no open Questions, proceed directly to Step 7. Report the auto-mode auto-approval inline in the Step 6 presentation (e.g., "Auto mode: no Issues, proceeding to Step 7"). If any Issue is present or any Question is open, the wait-for-user gate still applies even in auto mode.
