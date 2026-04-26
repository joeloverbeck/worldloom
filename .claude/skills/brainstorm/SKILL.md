---
name: brainstorm
description: "Use when starting a new feature, design, or architectural decision that needs requirements discovery before implementation. Triggers: vague requests, exploration keywords, uncertainty about what to build, need for external research before designing."
user-invocable: true
arguments:
  - name: request
    description: "The brainstorming topic or question (string). Can be a simple sentence or a detailed description."
    required: true
  - name: reference_path
    description: "Optional path to a reference file (report, brainstorming doc, analysis) to read as context before starting the interview."
    required: false
---

# Brainstorm

Confidence-driven collaborative brainstorming. Interviews you until it understands what you **actually want** — not what you think you should want — then proposes approaches, builds a design, and lets you choose what happens next.

<HARD-GATE>
Do NOT write any code, scaffold any project, invoke any implementation skill, or take any implementation action until you have presented a design and the user has explicitly approved it. This applies to EVERY topic regardless of perceived simplicity.
</HARD-GATE>

## Process Flow

```
Read context (reference file + detect topic type)
         |
         v
Confidence-driven interview loop (target: 95%)
         |
         v
Propose 2-3 approaches with tradeoffs
         |
         v
Present design section by section, get approval per section
         |
         v
[If canon-related] Validate against FOUNDATIONS.md
         |
         v
Write design doc to docs/plans/
         |
         v
Next-steps menu (user chooses)
```

**In plan mode**: design doc writes to the plan file instead of `docs/plans/`, and `ExitPlanMode` replaces the next-steps menu.

## Step 1: Read Context

1. **Reference file**: If `reference_path` is provided, read the entire file. Extract key claims, proposals, and open questions from it. Summarize what it contains in 2-3 sentences before proceeding. If the user references files inline in their request text (rather than via the `reference_path` argument), treat those files as reference material with the same read-and-summarize treatment. Multiple inline references are common; read all of them. If a user-referenced inline filename does not resolve on first read, glob the parent directory for the closest match (pluralization, hyphen drift, capitalization) before asking the user to re-specify; announce the path correction inline (e.g., `Resolved 'post-pilot-retrieval-refinement.md' to 'post-pilot-retrieval-refinements.md' from globbed parent directory.`) so the user can confirm or redirect. If inline references include sibling skills (skills in the same pipeline or workflow), note their input/output interfaces (consumed/produced files, shared terminology, intermediate artifacts) and ensure the new design is compatible. For diagnostic/analysis reference files, treat claims about codebase state (e.g., "agent lacks profile X", "component Y is opt-in") as hypotheses to verify during codebase exploration (sub-step 7), not as established facts. Flag any claims that contradict what exploration reveals — these corrections should be prominently communicated to the user before proceeding to triage or approach proposal.

2. **Topic classification**: Determine which category this brainstorm falls into:
   - **canon-related**: Designs that affect the world model itself or the canon-handling logic that operates on it — new pipelines (e.g., `brainstorming/canon-addition.md`-style proposals), changes to how canon facts are validated/derived/scoped, new world-file types, modifications to invariants/ontology/relation handling, anything that produces or mutates files like `WORLD_KERNEL.md`, `INVARIANTS.md`, `CANON_LEDGER.md`.
   - **tooling-adjacent**: Project tooling that does not change canon semantics — CLI cosmetics, doc generators, build/test scripts, dev ergonomics.
   - **non-implementation**: No code changes — process, workflow, strategy, skill design, tooling configuration.

   After classifying, state the classification to the user in a single short sentence (e.g., "Topic classified as non-implementation — skipping FOUNDATIONS.md."). This gives the user a chance to redirect if the classification is wrong before it drives downstream decisions.

3. **If canon-related OR if the topic directly concerns FOUNDATIONS.md principles**: Read `docs/FOUNDATIONS.md`. You will need it in Steps 3 and 4 to validate proposed approaches against canon principles. For tooling-adjacent topics, reading FOUNDATIONS.md is optional — only read it if the topic touches canon-handling logic or canon artifacts.

4. **Confidence calibration from reference material and request**: If the reference file provides a comprehensive design (rationale, decisions, structure, adaptation notes), set initial confidence based on how much of the problem space it covers. A thorough reference file may start confidence at 70-85%, reducing the interview to closing operational gaps (naming, cleanup, customization preferences). The same calibration applies to the user's initial request text — if the request includes detailed problem analysis, specific evidence, root cause identification, and a clear ask, calibrate initial confidence from the request itself, not just from reference files. If the user's request includes root cause analysis, proposed solution, code locations, and FOUNDATIONS justification, set initial confidence to 85-95%. The interview becomes a gap-closing exercise (1-2 targeted questions about scope or edge cases), not a discovery process. Do not ask motivational questions ("what problem does this solve?") when the user has already demonstrated deep understanding of the problem. Research findings (sub-step 6 below) also contribute to confidence by narrowing the solution space before the interview begins. When the brainstorm is invoked mid-conversation after prior investigation (file analysis, debugging, exploration of related work), calibrate initial confidence from the accumulated conversation context — not just from reference files or the request text. Prior evidence gathering in the same session is a first-class confidence source.

5. **Interview skip threshold**: If Step 1 exploration and research bring confidence to 95%+ before the interview starts, skip Step 2 entirely and proceed directly to Step 3. Announce the confidence level and note that exploration resolved all gaps. This is common for well-specified requests where the user provides root cause analysis, code locations, and evidence — codebase exploration confirms rather than discovers.

   **Directed design question carve-out (non-plan-mode)**: If initial confidence is 85-94% AND either (a) the user's request is framed as a specific design decision with enumerated alternatives (i.e., the user has already stated the problem and proposed options, turning the brainstorm into an approach-selection task rather than a discovery task), OR (b) the user's request is a specific directive where the problem is fully constrained by the request text (clear deliverable, clear scope, minimal open choices — e.g., "port X from repo A into repo B, strip extraneous content, delete the reference"), skip the discovery interview and go directly to Step 3. Announce the confidence level, name any remaining gaps as assumptions to carry into the approach proposal, and let the user correct them during approach selection. This mirrors the plan-mode fast-track but applies in non-plan-mode when the user has effectively pre-conducted the interview themselves or fully constrained the problem space.

6. **External research**: If the topic requires domain knowledge beyond the codebase (academic algorithms, industry best practices, competing architectures, scaling solutions), launch research agents BEFORE the interview. The user's request may explicitly call for research ("research this online", "look for solutions") or the problem may implicitly require it (novel algorithms, scaling problems, unfamiliar domains). Summarize findings for the user before asking interview questions. Research findings inform both the confidence calibration (what solution space exists) and the approach proposal (what concrete options are available). If codebase exploration (sub-step 7) produces a clear root cause with concrete code-path evidence, external research may be skipped even if the user suggested it. Note the skip decision when presenting findings. When external research has already been completed and supplied as a reference file (e.g., ChatGPT / Claude / external-agent output saved to `brainstorming/` or referenced inline), the research-skip announcement is satisfied by the reference-file summarization step (sub-step 1) — no separate skip announcement is needed, since the summary serves the same audit-trail purpose. Note any corrections the summarization surfaces (reference-file claims that contradict repo reality) explicitly, since those corrections are the empirical-findings equivalent that would otherwise have been announced from new research. If the user's interview answer explicitly requests research or reveals a domain that requires it, pause the interview to launch research agents before continuing. Present research findings before the next interview question or approach proposal. This mid-interview research follows the same summarize-before-asking pattern as pre-interview research.

7. **Project context**: Explore existing implementations relevant to the topic before starting the interview — this context informs better questions. For tooling/process topics, examine existing instances of the thing being designed (e.g., existing skills, configs, workflows — their structure, size, patterns). For codebase topics, check relevant files, specs, tickets, brainstorming proposals, or world files. Launch Explore agents for broad surveys when needed. Keep exploration targeted to what informs the interview. For brainstorms triggered by frustration or repeated failure, also explore the history of attempted fixes — not just the current state. Patterns of repeated remediation attempts, escalating complexity, or accumulated workarounds are signals that the approaches (Step 3) should include radical options (reset, strip, rebuild from scratch) alongside incremental fixes. A long chain of narrowly-scoped fixes that didn't resolve the underlying problem is evidence that the problem may be structural, not tactical.

8. **Confidence checkpoint**: After all context reading is complete and before deciding whether to enter Step 2, announce the post-exploration confidence in one sentence (e.g., "Post-exploration confidence: ~90% — reference file is exhaustive, scope fully specified by user request"). This number drives the Step 2 skip decision (95%+ skip entirely; 85-94% directed-design carve-out check; <85% full interview) and makes the skip/interview branch point visible to the user before the skill takes action on it.

## Step 2: Confidence-Driven Interview

This is the core of the skill. Your goal is to reach **95% confidence** about what the user actually wants before proposing solutions.

### The Protocol

After each user answer, display a confidence block:

```
Confidence: X%
Gaps: [list of remaining unknowns]
```

Keep asking questions until confidence reaches 95%. Then announce: "I'm at 95% confidence. Moving to approaches."

**Auto mode prose alternative**: Under auto mode, when the interview is 0-2 questions (skipped entirely via Step 1 sub-step 5 or minimized via the directed-design carve-out in sub-step 5's nested note), the confidence block may be replaced by an inline prose statement (e.g., "Confidence: ~90% — gaps listed as named assumptions in the approach proposal below") provided the gaps are surfaced in the very next message as named assumptions, using the same `Assumptions (unresolved gaps): (1) X — assuming Y, (2) ...` format as Plan Mode §Fast-track assumption disclosure (below). This preserves the gap-visibility function of the block format without ceremony when the interview is short-circuited. The formal block format is still required in non-auto-mode sessions and whenever the interview runs 3+ questions.

### Interview Rules

1. **One question per message.** Never ask multiple questions at once.
2. **Prefer multiple-choice questions** when the answer space is bounded. Open-ended is fine when it isn't. Use `AskUserQuestion` with labeled options for multiple-choice interview questions, approach selection, and section approval prompts when its schema is already available in the session. Inline numbered options are an acceptable fallback when AskUserQuestion is deferred and fetching its schema would add friction. In plan mode, inline numbered options are preferred since the conversation flow is faster.
3. **Probe motivations before solutions.** Ask "What problem does this solve?" and "What happens if we don't do this?" before "What do you want built?" The user's first request often describes a solution, not the problem. Your job is to find the problem.
4. **Challenge premature specificity.** If the user jumps to implementation details early, ask why that specific approach matters. Often the constraint is softer than stated.
5. **Detect "should want" vs "actually want".** Watch for:
   - Buzzword-heavy descriptions (the user may be echoing best practices they read, not their real need)
   - Over-scoped requests (wanting everything when they need one thing)
   - Vague success criteria ("it should be good" — probe for what "good" means concretely)
   - Solutions stated as requirements ("I need a microservice" — do they need a microservice, or do they need X capability?)
6. **Name your uncertainty.** When you display gaps, be specific: "I don't know whether this needs to handle edge case X" is useful. "I need more information" is not.
7. **Respect user expertise.** If the user gives a clear, well-reasoned answer, don't re-ask the same thing in different words. Advance.
8. **Handle delegation gracefully.** If the user says "I'm not sure" or "you decide," treat it as a delegation: re-evaluate the options against FOUNDATIONS.md and project constraints, present your reasoned recommendation, and advance confidence accordingly. Do not re-ask the same question — the user has told you they trust your judgment on this point.
9. **Present empirical findings before asking questions.** When codebase exploration or simulation runs produce concrete findings (data tables, root cause evidence, confirmed/refuted hypotheses), present a concise evidence summary before the first interview question. Structure: hypothesis, evidence (table or list), verdict per hypothesis, then the question. This lets the user evaluate your analysis before being asked to decide on scope or approach.

### Confidence Scoring Guide

Confidence increases from **both user answers AND research findings**. If external research (Step 1, sub-step 6) narrows the solution space before or during the interview, factor that into the confidence score and note which gaps were closed by research vs. which require user input.

| Range | Meaning | Action |
|-------|---------|--------|
| 0-30% | Don't understand the problem yet | Ask about the problem, not the solution |
| 30-60% | Understand the problem, unclear on constraints | Ask about constraints, success criteria, scope |
| 60-80% | Understand problem + constraints, unclear on priorities | Ask about tradeoffs, what matters most |
| 80-95% | Clear picture, a few edge cases or preferences unknown | Ask targeted questions about specific gaps |
| 95%+ | Ready to propose | Transition to Step 3 |

### Plan Mode Interview

In plan mode, the confidence block is still required at the transition from interview to approach proposal. Display confidence and gaps at least once — when announcing the move to approaches. The transition announcement may be a prose statement (e.g., "Confidence at 95%, no remaining gaps") rather than the formal block format, provided it clearly states the confidence level and that gaps are resolved. Even in plan mode, use a visually distinct transition marker (bold heading, horizontal rule, or the standard phrase "I'm at 95% confidence. Moving to approaches.") when the confidence announcement is embedded in a longer analytical message. The reader should be able to scan and find it. The "visually distinct marker" requirement applies specifically to the interview-to-approaches transition (the moment confidence reaches 95%), not to initial confidence calibration displays from Step 1 — those are optional context-setting. Intermediate per-answer confidence blocks may be omitted if the interview is 1-2 questions. When the interview question IS the approach-selection question (the user's answer simultaneously closes the last gap and selects an approach), the transition announcement may be omitted — the approach selection implicitly demonstrates 95%+ confidence.

When initial confidence from Step 1 is >= 85% (detailed user request with evidence, root cause analysis, and clear deliverable), the expected plan-mode interview is 0-2 targeted questions. The confidence announcement, approach rationale, and design presentation may all appear in a single message sequence if no course correction is needed.

**Fast-track plan-mode flow**: When all three conditions are met — plan mode active, initial confidence >= 85%, single viable approach — Steps 2-4 may collapse into a single message sequence: confidence announcement, approach rationale, key design decisions, and plan file write. The Step 3 "wait for user to choose" gate is also collapsed — when there's a single viable approach, presenting it and proceeding to the plan file write is one flow. The user's approval comes via ExitPlanMode, not a separate approach-selection step. This is the expected flow for well-specified diagnostic-to-spec brainstorms where the user provides root cause analysis, evidence, and a clear deliverable type.

**Fast-track assumption disclosure**: When initial confidence is 85-94% (high but not complete), list remaining gaps as **named assumptions** in the design presentation — not just in the confidence block. Format: "Assumptions (unresolved gaps): (1) X — assuming Y, (2) ..." The user can correct them before ExitPlanMode. At 95%+ no assumption disclosure is needed since all gaps are resolved.

### Early Exit

If the user says something like "just go" or "that's enough questions", respect it. Announce your current confidence, list remaining gaps as assumptions you'll make, and proceed to Step 3. Mark those assumptions explicitly in the design so the user can correct them.

### Recovery/Reset Brainstorms

When the brainstorm is triggered by frustration indicators ("huge mistake", "wrong approach", "start over", "strip everything", "remove all"), adjust the interview:

1. **Validate the diagnosis before accepting it.** The user may be catastrophizing after a bad run, or missing that the system is more salvageable than they think. Present what exploration revealed — both what's broken AND what's working — before agreeing with a scorched-earth instinct.
2. **Focus confidence on "what's actually broken?"** before "what's the fix?" The confidence target shifts from requirements discovery to failure-mode agreement. Key gaps to close: is the problem structural (architecture) or tactical (configuration, content design, missing inputs)? Is the user's frustration proportional to the evidence?
3. **Always include a radical option.** When proposing approaches (Step 3), ensure at least one option represents the user's most aggressive instinct (strip, delete, rebuild). Even if you recommend a less radical path, validating the radical option as a real choice respects the user's judgment and prevents the feeling of being talked out of something.

## Step 3: Propose Approaches

Present **2-3 distinct approaches** with:

- **Name**: A short descriptive label
- **How it works**: 2-4 sentences
- **Tradeoffs**: What you gain, what you give up

After listing the approaches, close with a recommendation: name the chosen option upfront, then justify in 1–3 sentences. The recommendation is a global decision (which option to take), not a per-approach attribute — keep it out of the per-approach bullet list.

**If canon-related** (not tooling-adjacent): For each approach, note which FOUNDATIONS.md principles it aligns with or tensions it creates. Use format: `Foundations: <principle name> (aligns), <principle name> (tensions — [reason])`. Example: `Foundations: Canon Layering (aligns), Validation Rule 3 — No Specialness Inflation (tensions — proposed feature adds exceptional capability without integrating consequences).`

**If the problem space is fully constrained** (e.g., a reference document provides a proven design, or requirements eliminate alternatives), present a single approach. Include a one-sentence rationale on the same turn that explicitly names the constraint that narrows the solution space (e.g., "Only one approach fits because the user's directive fully specifies both the source and the transformations; alternatives would be stylistic, not architectural"). This explicit rationale gives the user a clean invitation to challenge the framing before committing. Do not invent artificial alternatives. In plan mode with a single viable approach, the rationale may be embedded in the plan file's Context section rather than presented as a separate conversational step.

**For triage/analysis brainstorms** where the deliverable is a set of work items (tickets, specs) derived from evaluating a report or findings, the "approaches" step may be replaced by presenting the triage recommendation: which items warrant action, which are dismissed, and why. The user's approval of the triage recommendation serves the same gating purpose as choosing an approach.

**Pragmatic-softening disclosure.** When recommending a softer form of a proposal than what the analysis supports, explicitly classify the softening: (a) **structural** — justified by problem shape (e.g., "not every fact-type carries this axis"); (b) **pragmatic** — justified by retrofit / migration / cost concerns on existing artifacts. Present pragmatic softenings as user-approveable tradeoffs, not author-side decisions. Pragmatic softenings tend to leak into new-scope (new worlds, new work) where the retrofit cost doesn't apply; disclose the leak so the user can apply scope-integrity pressure if they prefer paying retrofit cost for new-scope rigor. Structural softenings need no special disclosure — they're inherent to the problem.

When triage produces **multiple deliverables** (N specs, N tickets, or a mix), the single triage approval gates all N — do not re-prompt for approval per deliverable. Each deliverable still independently satisfies its own format requirements (spec-drafting-rules.md for specs, `tickets/_TEMPLATE.md` for tickets), but no per-item user approval is required. The Step 6 Next Steps menu is presented once per triage, summarizing all N produced deliverables. For spec deliverables, `specs/IMPLEMENTATION-ORDER.md` (if the file exists; see Step 5 for fallback handling) gets a single update encompassing all N specs. When the deliverable count crosses the multi-deliverable triage thresholds (≥2 specs or ≥3 tickets), the Step 5 triage-file rule also applies — write `docs/triage/YYYY-MM-DD-<topic>-triage.md` once per triage, summarizing source/accepted/dismissed/follow-ups.

**If the user challenges an option's dismissal**, do a fresh analysis from first principles rather than defending the prior reasoning. If the new analysis reverses the dismissal, state explicitly where the prior reasoning was incomplete. A revised approach (e.g., phased combination) is a valid output of this re-analysis.

**If the user clarifies a constraint or assumption** (rather than challenging an option's dismissal or signaling a register shift — see Step 2 §Recovery/Reset Brainstorms), redo the approach proposal under the refined constraint without restarting Step 2. The user has sharpened the input to the trade-off analysis, not invalidated the discovery work; the prior interview state is preserved while the approach scoring re-runs. Cite which assumption was sharpened so the user can confirm the read. Common shape: user originally said "X is too painful" and clarifies "by X I meant Y, not Z" — the new precision can flip which approach wins. Distinct from dismissal-challenge (user disagrees with a conclusion) and register-shift (user signals fundamental change of approach class); constraint-clarification adds precision to an input the analysis was already using.

**Wait for user to choose or ask questions.** Do not proceed until the user picks an approach (or asks you to refine/combine).

## Step 4: Present Design

**Plan mode**: Skip per-section gates. Present key decisions in 1-2 messages with conversation-level checkpoints, then write to plan file. See plan-mode details at the end of this section.

**Classification pivot check**: If the design reveals a deliverable type that differs from the Step 1 classification (e.g., "tooling configuration" now requires a new world-file type, or a spec now includes live code changes), re-state the refined classification to the user before presenting Section 1 of the design. Downstream sections (testing strategy, FOUNDATIONS alignment) follow the refined classification.

Once an approach is chosen, present the design **section by section**. Scale each section to its complexity — a sentence for trivial parts, up to 200 words for nuanced parts.

Sections to cover (skip irrelevant ones):

1. **Overview**: What this design achieves in 1-2 sentences
2. **Architecture / Structure**: How the pieces fit together
3. **Key decisions**: Important choices and why
4. **Data flow / Process**: How information moves through the system
5. **Edge cases**: Known tricky scenarios and how they're handled
6. **Testing strategy**: How to verify this works (if canon-related or tooling-adjacent)
7. **FOUNDATIONS.md alignment**: Table of relevant principles and how the design respects them. Mandatory for canon-related. Optional for tooling-adjacent — include when the design touches canon-handling logic, world-file persistence, canon-validation surfaces, or other concepts mapped to specific FOUNDATIONS principles; a 3–5 row table is usually sufficient. Omit when truly irrelevant (e.g., cosmetic CLI tweaks). Selection criteria: each row should state the principle, its stance (`aligns` / `tensions` / `N/A`), and a one-line rationale citing the specific design mechanism that honors or breaks the principle. Prefer 3-5 load-bearing rows over exhaustive enumeration. Omit principles that are merely not-violated — the default is non-violation, so only list principles the design actively engages (or actively tensions).

Section names are suggestions. Rename or combine sections to match the topic's natural structure. The key requirement is per-section approval, not specific section names.

**After each section**, ask: "Does this section look right?" Wait for confirmation before presenting the next section. If the user pushes back, revise that section before continuing. If the user approves 3+ sections consecutively without pushback or revisions, batch remaining sections into groups of 2-3, pausing for approval after each group rather than each section. Under auto mode, this threshold may shift to 2 consecutive approvals to reduce round-trips. Exception: keep a remaining section standalone if it is substantially more complex or higher-risk than the prior ones. Announce the batching: "You're clearly aligned — I'll present the remaining sections in groups." Under auto mode, after 5+ consecutive approvals with no substantive pushback, single-message batches covering all remaining sections are acceptable provided no remaining section is higher-risk (the "Exception" above still applies). The "groups of 2-3" rule remains the default; the 5+-sustained-approval case is the explicit relaxation for prolonged agreement, parallel to skill-creator's convention.

**Small-deliverable carve-out**: If the design comprises ≤4 distinct decisions or transformations AND initial confidence is ≥85%, the design may be presented as a single structured artifact (e.g., a transformations table, a bullet list of decisions, a short enumerated design summary) and approved in one turn rather than section-by-section. Under auto mode this is permitted by default; outside auto mode, announce the consolidation explicitly ("I'll present the design as a single summary rather than section-by-section because the deliverable is small enough to review at once"). The HARD-GATE still applies — explicit user approval of the consolidated design is required before any implementation action.

**What counts as a "decision"**: a *user-approveable choice point* — a moment where the user could meaningfully redirect (which fixture path, which workflow shape, what the refresh policy is). Atomic facts that follow from a parent decision (e.g., once "5 separate workflow files" is chosen, the contents of each file are not 5 additional decisions) count as one with the parent. A design with 3 logical parts each containing 2-3 sub-facts typically counts as 3 decisions, not 6-9. When the count is borderline, prefer consolidating — the gate that matters is "can the user review this in one turn", not the literal count.

**Multi-artifact-bundle carve-out**: When the design comprises ≥5 distinct architectural deliverables (specs, large documents, or independently-reviewable artifacts) AND each deliverable is itself substantive (e.g., a multi-hundred-line spec), logical-tier batching is permitted from the first presentation turn without requiring prior-approval precedent: group deliverables by natural architectural concern (read path / write path / governance / migration, or analogous domain-specific tiers) and present each tier in one message, pausing for approval per tier. Announce the tiering plan and its justification explicitly on the first batch (e.g., "I'll walk the design in 3 tiers: Tier 1 = read path (SPEC-01/02), Tier 2 = write path (SPEC-03/04/05), Tier 3 = skill-facing contract (SPEC-06/07/08 + implementation order) — redirect if the grouping is wrong before I start"). Within a tier, sections belong to the same architectural concern and are reviewed as a unit; the consecutive-approvals threshold (3 → 2 under auto mode) governs tier-to-tier batching, not section-to-section within a tier. The HARD-GATE still applies — per-tier approval is required before writing files, and the final commit gate fires only after the last tier is approved. Distinct from the Small-deliverable carve-out (which consolidates SMALL designs into one message); this carve-out STRUCTURES LARGE designs into coherent tiers rather than requiring N sequential per-section round trips that the literal rule would otherwise produce. Tier names are free-form and should reflect the brainstorm's natural architectural arc (read/write/migration tiers, contract-changes/implementation/world-content tiers, scope-by-deliverable-type tiers, or any analogous domain-specific shape); the naming itself isn't load-bearing — the per-tier approval gate is.

**Template-structured-deliverable carve-out**: When the deliverable type per Step 5 has its own canonical template (tickets following `tickets/_TEMPLATE.md`; specs following `docs/spec-drafting-rules.md` or the default spec sections; skill files; brainstorming proposals following `brainstorming/canon-addition.md` / `brainstorming/create-base-world.md` patterns), the template provides the section navigation; the full draft may be presented as a single artifact for approval regardless of internal item count. Step 4's enumerated section list (Overview / Architecture / Key decisions / etc.) above is the discipline for `docs/plans/<>-design.md` deliverables; for template-structured outputs the template's own sections substitute, and the per-section approval gate maps onto the consolidated draft (one approval covers the whole template). Distinct from the Small-deliverable carve-out (≤4 decisions, any deliverable type) and from the Multi-artifact-bundle carve-out (≥5 substantive deliverables → tiers); this carve-out covers the common case of a single template-structured deliverable with many small atomic line-items inside it (e.g., a ticket whose §What to Change has 6–8 numbered sub-changes that don't decompose naturally into the Step 4 section list). The HARD-GATE still applies — explicit user approval of the consolidated draft is required before writing the deliverable file.

**Re-emergent interview during design**: For complex deliverables (umbrella-spec amendments, multi-artifact triages, cross-spec reconciliations), specific design decisions sometimes surface during Step 3 approach selection or Step 4 design presentation rather than during initial Step 2 discovery. When the user asks a discovery-style question or requests enumeration of open decisions during Step 3/4 (e.g., "ask me the questions that need to be settled to amend SPEC-X"), conduct a constrained interview applying Step 2 rules (one question per message, prefer multiple-choice when answer space is bounded, name your uncertainty, respect user expertise, recommend an option when delegated). Label the questions for cross-referenceability (A, B, C, ... or numbered) so the consolidated decision registry that follows can cite them in the design presentation. The HARD-GATE still applies — implementation does not begin until the design (incorporating the newly-settled decisions) is approved. Distinct from Step 2's confidence-driven interview, which runs once before Step 3; this re-emergent form runs after design implications surface and the decisions it settles feed directly into the design rather than into approach selection.

**Recovery/Reset register inheritance**: For brainstorms whose chosen approach represents a structural-correction register (Step 2 §Recovery/Reset Brainstorms-flavored, or user language emphasizing "fundamental change" / "pivot" / "rebuild" / "permanent source of brittleness"), Step 3's "Always include a radical option" discipline extends through Step 4's sub-scope decisions within the approved approach. Default each sub-scope decision to the most aggressive position consistent with the approach's register (atomize more rather than less; eliminate legacy surfaces rather than preserve them; simplify execution rather than gold-plate it); offer conservative alternatives as user-approveable fallbacks rather than silent defaults. A user-framed mid-Step-4 pushback that simplifies, expands, or radicalizes the scope is evidence that the initial presentation was mis-calibrated — treat it as a register-calibration signal, not a neutral revision event. This discipline applies to atomic sub-scope decisions (what to include, what to retire, whether to generalize) within a chosen approach; it does NOT override Step 3's approach-selection gate (a user who wants to switch approaches mid-Step-4 is signaling an approach-selection gap, handled by revisiting Step 3).

**If plan mode is active**: Per-section approval is replaced by whole-plan approval via `ExitPlanMode`. Present the key design decisions inline in the conversation before writing the plan file, so the user can course-correct before the plan is finalized. For complex designs, present in 1-2 messages, grouping related sections. Pause after the first message to check for course corrections before continuing. The goal is conversation-level checkpoints, not per-section gates. In plan mode, the confidence-reached announcement and approach proposal may be folded into the same message as the design presentation when the approach is architecturally constrained (single viable option).

## Step 5: Persist the Deliverable

After design approval, do NOT apply changes or implement the design until the user selects an implementation option from the Step 6 menu. The design doc is typically the deliverable of this skill — implementation is a separate act that requires the user's explicit choice. Exception: for inline-implementation tasks (see the first deliverable category below), the deliverable is the in-conversation design + post-execution summary, and no design doc is persisted.

**Quick triage** (find the matching shape, then read the corresponding bullet below for the full rules):

| Deliverable shape | Output destination |
|---|---|
| Inline ops/setup task | execute inline + summary; no file persisted |
| New skill design | `.claude/skills/<name>/SKILL.md` |
| Modify existing skill file(s) | edit in place |
| Project documentation (`CLAUDE.md`, `docs/*.md`, etc.) | edit/create in place |
| Port external skill into repo | new `.claude/skills/<name>/SKILL.md` + delete source |
| Replaces an existing artifact | new file + delete old + update cross-references |
| System spec | `specs/<spec>.md` |
| Umbrella spec driving sibling amendments | `specs/<spec>.md` + named sibling-spec edits |
| Triage producing ≥2 specs / ≥3 tickets | deliverables + `docs/triage/YYYY-MM-DD-<topic>-triage.md` |
| Hybrid (code + spec) | plan file orchestrates sequence |
| Data-gathering required first | pre-deliverable phase + final deliverable |
| Implementation tickets | `tickets/<ID>.md` |
| New canon-pipeline proposal | `brainstorming/<topic>.md` |
| Modify canon-pipeline proposal(s) | edit in place |

**Deliverable classification**:
- If the brainstorm topic is a **small tooling or ops task executed inline with no persisted artifact** (e.g., one-shot shell commands, repo setup, local configuration, a short sequence of pre-approved steps), skip both the `docs/plans/` design doc write AND the Step 6 next-steps menu. The deliverable is the in-conversation design + post-execution summary of what was done. The HARD-GATE still applies — explicit user approval of the consolidated design is required before executing. Typical indicators: ≤4 design decisions, small-deliverable carve-out applied in Step 4, implementation is a bounded sequence (not an open-ended feature build). When applied, the skill flow concludes at Step 4 approval → inline execution → summary; Steps 5 (persist) and 6 (menu) are both elided. Distinct from the Step 6 `If implementation was completed inline` guardrail: this category PRE-DECLARES inline at Step 5 time based on deliverable shape; the Step 6 guardrail is the catchall for tasks that become inline-implemented at approval time without matching this category.
- If the brainstorm topic is itself a skill design, the deliverable is the skill file (written to the appropriate skills directory, e.g., `.claude/skills/<name>/SKILL.md`). Skip the `docs/plans/` design doc — the skill file IS the design. Adjust the Step 6 menu to reflect this (omit "create a spec" option, replace with "run skill-audit on the new skill"). When plan mode is active AND the deliverable is a skill file: the skill file cannot be written until after `ExitPlanMode` is called and the plan is approved. Write the plan file first with the skill design (process overview, key decisions, verification). After plan approval, write the full SKILL.md as the first implementation step. Keep the plan file under 120 lines for skill deliverables.
- If the brainstorm topic is modifying or reconciling existing skill files, the deliverable is the modified skill file(s) themselves. Skip the `docs/plans/` design doc — the edits ARE the design. If merging multiple skills, the deliverable includes the new unified skill file, deletion of superseded skill directories, and updating any cross-references in other skills or configuration files.
- If the brainstorm topic is **modifying project documentation or creating supporting `docs/` files** (e.g., `CLAUDE.md`, `README.md`, `docs/WORKFLOWS.md`, `docs/HARD-GATE-DISCIPLINE.md`) with no canon semantics, the deliverable is the edited/created documentation file(s) themselves. Skip the `docs/plans/` design doc — the edits ARE the design. The Step 6 next-steps menu may be omitted when implementation is completed inline in the same turn as design approval. Distinct from "modifying or reconciling existing skill files" (which covers `.claude/skills/*` edits) and from "small tooling or ops task executed inline with no persisted artifact" (which applies when no file is produced); this category covers project-root documentation and `docs/*` files that ARE produced and persist.
- If the brainstorm topic is **adopting/porting a skill from another repository or sibling directory**, the deliverable is (a) the new skill file at the target path (e.g., `.claude/skills/<name>/SKILL.md`), (b) deletion of the reference directory once the new file is verified, and (c) a transformations-table design enumerating per-element strip/replace/preserve decisions rather than fresh architecture. The approach proposal focuses on identifying extraneous source-repo elements (terminology, skill names, file paths, shared-surface triggers) and their worldloom-appropriate replacements. This is a variant of the "modifying or reconciling existing skill files" deliverable where the source lives outside the repo; the transformations-table format is preferred over section-by-section design because the source file already provides the architectural spine. **Row granularity**: the transformations table must enumerate one row per substitution site, not one row per source line. When multiple source-repo-flavored tokens share a single source line (e.g., a line that contains both an extraneous glob path and an extraneous example skill name), list each token as its own row, or as labeled sub-rows (`N.a`, `N.b`) under the line. A substitution that the implementer expects to apply "for consistency" but is not itemized in the table is out of scope — either itemize it or propose a table revision and re-request approval before applying it. The Step 6 next-steps menu may be omitted when implementation (write new + delete reference) is completed inline in the same turn as design approval.
- If the brainstorm produces a deliverable that **replaces** an existing artifact (skill, spec, config), the replacement plan should include: (a) confirming deletion of the old artifact, (b) checking for cross-references to the old artifact in other skills, CLAUDE.md, or MEMORY.md, (c) noting the replacement in the design doc or plan.
- If the brainstorm topic produces a system spec (architectural change, new subsystem, or any change requiring formal spec compliance), the deliverable is the spec file in `specs/`. Skip the `docs/plans/` design doc — the spec IS the design. If `docs/spec-drafting-rules.md` exists, follow it. If absent, write the spec with default sections (Problem Statement, Approach, FOUNDATIONS Alignment, Verification, Out of Scope) and add a top-of-file note: `<!-- spec-drafting-rules.md not present; using default structure. -->`. For specs with concrete code/file artifacts (package layouts, CLI contracts, schemas, file-level outputs), a **Deliverables** section between Approach and FOUNDATIONS Alignment is recommended — it houses the committed artifacts the spec enumerates. For specs with known unknowns worth surfacing to future readers, a **Risks & Open Questions** section after Out of Scope is recommended. Authors may add further sections (e.g., Migration, Testing Strategy, Performance Targets) as the spec's subject matter requires; update the top-of-file note to reflect any non-default sections added (e.g., `<!-- spec-drafting-rules.md not present; using default structure + Deliverables + Risks & Open Questions. -->`). Adjust the Step 6 menu accordingly — omit the "create a spec" option and use this template:

  ```
  Specs written: <list each spec with its full path>

  What would you like to do next?
  1. Reassess each spec against current codebase state
  2. Decompose each spec into tickets
  3. Start implementing a specific spec directly
  4. Done for now — specs are ready for review
  ```

  The menu's verbs are intentionally portable — substitute whatever reassessment or decomposition workflow your repo provides (e.g., a `/reassess-spec` slash command, a manual checklist, a `/spec-to-tickets` skill), or omit an item if no equivalent exists. The menu is presented once per triage, not once per spec. After writing the spec(s): if `specs/IMPLEMENTATION-ORDER.md` exists, update it in every structurally-relevant region — design read order chain if present, phased implementation sequence if phases exist, dependency tree if diagrammed, deliverable status table if tabulated, and any cross-spec history or summary paragraph at the file's end — rather than only appending to a single heading. For flat index files (single list of specs, no phase structure or dependency tree), a single append under an appropriate heading suffices. Missing a region leaves the file internally inconsistent: a new phase with no read-order mention, or a new spec with no deliverable-table row, breaks cross-region reconcilability. If absent: (a) default — skip the index update and note this in the Step 6 summary; (b) permitted — create a fresh `specs/IMPLEMENTATION-ORDER.md` when the brainstorm produces ≥3 specs as a logical bundle with meaningful sequencing (phase ordering, dependency tree, parallelization tiers). When creating fresh, note the file creation in the Step 6 summary alongside the spec list. For spec deliverables, the "Brainstorm Context" header is replaced by the spec's Problem Statement section, which should include the motivation, evidence sources, and key decisions that shaped the spec design — decisions made during the interview, during approach selection, and during any mid-design scope revisions (each captured as a one-to-two-sentence "considered X, chose Y because Z" note). Carve-out-shortened brainstorms that skipped the interview (Step 1 sub-step 5) still have decision points; they move from interview-time to design-time, and the Problem Statement should capture them. **Triage-file composition**: when the brainstorm produces ≥2 specs, the triage-file rule below ALSO applies — write `docs/triage/YYYY-MM-DD-<topic>-triage.md` in addition to the specs. The triage file is mandatory for multi-spec brainstorms; do not treat the spec-deliverable bullet as exhaustive.
- If the brainstorm produces an **umbrella spec that drives amendments to N existing specs and/or `docs/FOUNDATIONS.md` and/or project-root docs** (architectural-amendment shape — one new spec sets a new contract that several existing specs must be revised to reflect), treat the umbrella spec as the primary deliverable and the sibling-spec + FOUNDATIONS + CLAUDE.md amendments as collateral work tracked within the umbrella spec's §Deliverables or a dedicated "Amendments to sibling specs" section naming the specific edits each sibling receives. Skip the `docs/plans/` design doc — the new spec IS the design, and the amendments ARE the cascade. The Step 6 summary lists the new spec's path plus the inventory of files amended (paths and one-phrase summaries per amendment; not line-count details). No separate triage file is needed unless the scope is explicitly triage-flavored (triaging a report into action items) rather than design-flavored. Distinct from "hybrid deliverables" (which mixes code + spec and uses a plan file in plan mode) and from "produces a deliverable that replaces an existing artifact" (which is a wholesale supersession rather than multi-file amendment).

  **Archived-spec consideration**: if the umbrella spec's amendment scope would touch files under `archive/specs/`, those archived specs are completed historical records — in-place amendments are not appropriate (archived specs document what was implemented, not what to implement next). The new umbrella spec must contain ALL the new implementation work; it should include a `**Supersedes**:` header naming the specific sections of the archived spec(s) being replaced, so future readers see the live contract supersedes the archived record. The archived files themselves remain unedited as historical record. Active specs (under `specs/`) follow the normal collateral-amendment path — only `archive/specs/` triggers this carve-out. Worked precedent: SPEC-14 supersedes parts of archived SPEC-03 (`append_adjudication_record` payload shape; `append_touched_by_cf` semantics) and archived SPEC-04 (`record_schema_compliance` adjudication parsing; `rule7_mystery_reserve_preservation` enum; `rule2_no_pure_cosmetics` domain enum) without modifying the archived files.
- If the brainstorm is a **triage that produces ≥ 2 specs or ≥ 3 tickets**, additionally write a short `docs/triage/YYYY-MM-DD-<topic>-triage.md` summarizing: the source report/finding set, accepted items (with the full path to each written spec or ticket and a one-line rationale), dismissed items (with a one-line reason each), and any follow-up work items the triage identified but did not action. Keep the triage file under 80 lines. Do not duplicate spec or ticket content — reference by path. The triage file makes the brainstorm's decisions durable and shareable without re-running the brainstorm. For triage brainstorms producing a single spec or fewer than 3 tickets, skip this file — the individual deliverables are sufficient history.
- If the brainstorm produces **hybrid deliverables** (e.g., both implementation code AND a spec), the plan file describes the full implementation sequence — code changes, spec writing, and any other artifacts. The spec is still written after plan approval, but the plan may describe implementation steps for non-spec deliverables at normal detail. Keep the plan file under 100 lines when the spec is the primary deliverable; for plans with N independent deliverables, the line budget scales to approximately 100 + 20*(N-1) lines to accommodate per-deliverable summaries. Investigation findings that change the deliverable set (items added, dropped, or reframed) should be captured in the plan's Context section.
- If the brainstorm reveals that the deliverable **requires data that doesn't yet exist** (e.g., new instrumentation, enhanced diagnostics, or data-gathering tooling), the plan should include a pre-deliverable data-gathering phase. In plan mode, the plan file describes both the tooling enhancement and the final deliverable. The tooling work is executed after plan approval but before the spec/design doc is written, since the spec content depends on the gathered data.
- If the brainstorm produces **implementation tickets** (bounded fixes to existing code, not requiring full spec compliance), the deliverable is the ticket file(s) in `tickets/`. Skip the `docs/plans/` design doc — the tickets ARE the design. If `tickets/_TEMPLATE.md` and `tickets/README.md` exist, follow them. If absent, write a minimal ticket with Title, Context, Acceptance Criteria, Verification, and add a top-of-file note: `<!-- tickets/_TEMPLATE.md not present; using minimal format. -->`. Adjust the Step 6 menu accordingly (omit "create a spec" option, replace with "implement ticket" or "reassess ticket").
- If the brainstorm produces a **new worldloom canon-pipeline proposal** (a design for a new pipeline similar to existing files like `brainstorming/canon-addition.md`, `brainstorming/create-base-world.md`), the deliverable is the proposal file at `brainstorming/<topic>.md`. Skip `docs/plans/`. Read both `brainstorming/canon-addition.md` and `brainstorming/create-base-world.md` first as structural templates — match whichever pattern fits the proposal type (single-process pipelines like `canon-addition.md` use Purpose / Input / Output / Process / Validation; multi-phase pipelines like `create-base-world.md` use Purpose / Inputs / Output Bundle / Phase 0..N with domain-specific subsections). If the target filename already exists in `brainstorming/`, prompt the user for confirmation before overwriting (existing pipeline files may themselves be the *target* of a brainstorm). Adjust the Step 6 menu accordingly — omit "create a spec" option, replace with "reassess proposal" or "turn proposal into spec/tickets".
- If the brainstorm topic is **modifying or reconciling existing `brainstorming/*.md` canon-pipeline proposal(s)** (e.g., two proposals claim overlapping territory and need boundary definition, or a proposal needs architectural refinement in light of new sibling pipelines), the deliverable is the modified file(s) themselves. Skip the `docs/plans/` design doc — the edits ARE the design. When reconciling cross-file overlaps, the deliverable may include surgical edits to each affected file plus any cross-reference blocks needed to acknowledge newly-broken standalone-document properties (existing proposals frequently declare themselves "intentionally standalone and repeats repository assumptions on purpose" — adding a cross-reference to a sibling proposal is a deliberate exception that should be noted at the reference site). Adjust the Step 6 menu accordingly — omit the "write an implementation plan" and "create a spec" options; offer instead (1) run `skill-creator` on the edited proposal(s) when ready, (2) run `skill-audit` on any sibling brainstorming files that might be affected, (3) done — proposals are ready for later skill-creation.

**Deliverable pivot**: If the user redirects the deliverable type mid-brainstorm (e.g., "actually, make this a spec" or "create a spec for this"), reclassify using the rules above and adjust the flow accordingly. In plan mode, rewrite the plan file to match the new deliverable type before calling ExitPlanMode. Do not ask the user to confirm the pivot — they just told you what they want.

Once all sections are approved, write the complete design:

- **If plan mode is active**: Write the design to the plan file (the only writable file in plan mode). The plan file serves as the design doc. When plan mode is active AND the deliverable is a spec: the spec cannot be written to `specs/` until after `ExitPlanMode` is called and the plan is approved. Write the plan file first with the spec design (deliverables, FOUNDATIONS alignment, verification). After plan approval, write the spec to `specs/` as the first implementation step. The plan file references the spec and summarizes the implementation sequence — it is not the design itself. Keep the plan file under 100 lines when the spec is the primary deliverable; the plan should summarize intent, list deliverables, and describe the implementation sequence without duplicating the full spec content. If investigation during implementation changes the deliverable set (items added, dropped, or reframed), update the plan file's deliverables section to reflect the final state before presenting results to the user.
- **Otherwise**: Write to `docs/plans/YYYY-MM-DD-<topic>-design.md`, where `<topic>` is a kebab-case short name derived from the brainstorm topic.

The design doc should consolidate all approved sections into a clean document. Include a "Brainstorm Context" header at the top noting:
- The original request
- Reference file (if any)
- Key decisions that shaped the design (interview insights, approach selection, and mid-design scope revisions — whichever were load-bearing for this brainstorm)
- Final confidence score and any assumptions made

Do NOT commit the file. Leave it for user review.

**Post-implementation plan update**: If the brainstorm was in plan mode and implementation changed the deliverable set (new tickets created, scope expanded beyond the original plan), update the plan file's deliverable list before the final summary to the user. The plan file should reflect what was actually delivered, not just what was planned. This applies even when the original plan was approved via ExitPlanMode — the plan is a living document during implementation.

## Step 6: Next Steps Menu

Present the user with options for what to do next:

```
Design doc written to docs/plans/YYYY-MM-DD-<topic>-design.md

What would you like to do next?
1. Write an implementation plan (invoke writing-plans skill)
2. Create a spec from this design (write to specs/)
3. Start implementing directly
4. Done for now — I'll review the design doc later
```

Use AskUserQuestion when its schema is already available in the session. Inline numbered options (as shown above) are an acceptable fallback when AskUserQuestion is deferred and fetching its schema would add friction. If the user picks an option that invokes another skill, invoke it. If they pick "done", end the session.

**If plan mode is active**: Call `ExitPlanMode` instead of presenting the next-steps menu. The user will direct next steps after approving the plan.

**If implementation was completed inline**: If the task was simple enough that implementation was completed during or immediately after design approval, skip the menu and summarize what was done.

## Guardrails

- **YAGNI ruthlessly**: Remove unnecessary features from all designs. If a proposed approach has optional extras, strip them unless the user explicitly asked for them.
- **One question at a time**: Never batch questions. This is non-negotiable.
- **No implementation before approval**: The hard gate at the top means exactly what it says.
- **FOUNDATIONS.md is authoritative**: For canon-related topics, if a proposed approach violates a Foundation principle, flag it immediately. Do not propose approaches that violate Foundations without explicitly calling out the violation and getting user sign-off.
- **Worktree discipline**: If working in a worktree, all file paths use the worktree root.
- **No scope inflation**: The design covers what was asked for. Resist the urge to add "while we're at it" improvements.
- **Respect early exit**: If the user wants to skip ahead, let them. List your assumptions clearly.
- **Blocker discovery during implementation**: If implementation reveals a worldloom limitation or architectural issue that blocks the brainstorm's deliverable, present the blocker, options, and recommendation. If the fix is small enough to do inline (< 50 lines of change AND does not change a public interface — package exports, schema fields, hook surfaces — AND does not require modifying a package other than the one being implemented in), fix it and continue. Otherwise — separate architectural concern, public-interface change, or cross-package modification — create a ticket and either (a) work around the limitation in the current deliverable with a documented constraint, or (b) implement the fix if the user approves the scope expansion. Update the plan file to reflect the expanded deliverable set.
- **Auto mode interaction**: Under auto mode, (a) present the Next Steps menu unless implementation was already completed inline, (b) approach selection and section approval gates still hold — auto mode does not bypass user alignment, (c) the batching threshold in Step 4 may shift from 3 to 2 consecutive approvals to reduce round-trips. The HARD-GATE at the top of the skill is never relaxed by auto mode.
