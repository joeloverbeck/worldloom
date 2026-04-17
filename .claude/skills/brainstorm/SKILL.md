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

1. **Reference file**: If `reference_path` is provided, read the entire file. Extract key claims, proposals, and open questions from it. Summarize what it contains in 2-3 sentences before proceeding. If the user references files inline in their request text (rather than via the `reference_path` argument), treat those files as reference material with the same read-and-summarize treatment. Multiple inline references are common; read all of them. If inline references include sibling skills (skills in the same pipeline or workflow), note their input/output interfaces (consumed/produced files, shared terminology, intermediate artifacts) and ensure the new design is compatible. For diagnostic/analysis reference files, treat claims about codebase state (e.g., "agent lacks profile X", "component Y is opt-in") as hypotheses to verify during codebase exploration (sub-step 7), not as established facts. Flag any claims that contradict what exploration reveals — these corrections should be prominently communicated to the user before proceeding to triage or approach proposal.

2. **Topic classification**: Determine which category this brainstorm falls into:
   - **canon-related**: Designs that affect the world model itself or the canon-handling logic that operates on it — new pipelines (e.g., `brainstorming/canon-addition.md`-style proposals), changes to how canon facts are validated/derived/scoped, new world-file types, modifications to invariants/ontology/relation handling, anything that produces or mutates files like `WORLD_KERNEL.md`, `INVARIANTS.md`, `CANON_LEDGER.md`.
   - **tooling-adjacent**: Project tooling that does not change canon semantics — CLI cosmetics, doc generators, build/test scripts, dev ergonomics.
   - **non-implementation**: No code changes — process, workflow, strategy, skill design, tooling configuration.

   After classifying, state the classification to the user in a single short sentence (e.g., "Topic classified as non-implementation — skipping FOUNDATIONS.md."). This gives the user a chance to redirect if the classification is wrong before it drives downstream decisions.

3. **If canon-related OR if the topic directly concerns FOUNDATIONS.md principles**: Read `docs/FOUNDATIONS.md`. You will need it in Steps 3 and 4 to validate proposed approaches against canon principles. For tooling-adjacent topics, reading FOUNDATIONS.md is optional — only read it if the topic touches canon-handling logic or canon artifacts.

4. **Confidence calibration from reference material and request**: If the reference file provides a comprehensive design (rationale, decisions, structure, adaptation notes), set initial confidence based on how much of the problem space it covers. A thorough reference file may start confidence at 70-85%, reducing the interview to closing operational gaps (naming, cleanup, customization preferences). The same calibration applies to the user's initial request text — if the request includes detailed problem analysis, specific evidence, root cause identification, and a clear ask, calibrate initial confidence from the request itself, not just from reference files. If the user's request includes root cause analysis, proposed solution, code locations, and FOUNDATIONS justification, set initial confidence to 85-95%. The interview becomes a gap-closing exercise (1-2 targeted questions about scope or edge cases), not a discovery process. Do not ask motivational questions ("what problem does this solve?") when the user has already demonstrated deep understanding of the problem. Research findings (sub-step 6 below) also contribute to confidence by narrowing the solution space before the interview begins. When the brainstorm is invoked mid-conversation after prior investigation (file analysis, debugging, exploration of related work), calibrate initial confidence from the accumulated conversation context — not just from reference files or the request text. Prior evidence gathering in the same session is a first-class confidence source.

5. **Interview skip threshold**: If Step 1 exploration and research bring confidence to 95%+ before the interview starts, skip Step 2 entirely and proceed directly to Step 3. Announce the confidence level and note that exploration resolved all gaps. This is common for well-specified requests where the user provides root cause analysis, code locations, and evidence — codebase exploration confirms rather than discovers.

   **Directed design question carve-out (non-plan-mode)**: If initial confidence is 85-94% AND the user's request is framed as a specific design decision with enumerated alternatives (i.e., the user has already stated the problem and proposed options, turning the brainstorm into an approach-selection task rather than a discovery task), skip the discovery interview and go directly to Step 3. Announce the confidence level, name any remaining gaps as assumptions to carry into the approach proposal, and let the user correct them during approach selection. This mirrors the plan-mode fast-track but applies in non-plan-mode when the user has effectively pre-conducted the interview themselves.

6. **External research**: If the topic requires domain knowledge beyond the codebase (academic algorithms, industry best practices, competing architectures, scaling solutions), launch research agents BEFORE the interview. The user's request may explicitly call for research ("research this online", "look for solutions") or the problem may implicitly require it (novel algorithms, scaling problems, unfamiliar domains). Summarize findings for the user before asking interview questions. Research findings inform both the confidence calibration (what solution space exists) and the approach proposal (what concrete options are available). If codebase exploration (sub-step 7) produces a clear root cause with concrete code-path evidence, external research may be skipped even if the user suggested it. Note the skip decision when presenting findings. If the user's interview answer explicitly requests research or reveals a domain that requires it, pause the interview to launch research agents before continuing. Present research findings before the next interview question or approach proposal. This mid-interview research follows the same summarize-before-asking pattern as pre-interview research.

7. **Project context**: Explore existing implementations relevant to the topic before starting the interview — this context informs better questions. For tooling/process topics, examine existing instances of the thing being designed (e.g., existing skills, configs, workflows — their structure, size, patterns). For codebase topics, check relevant files, specs, tickets, brainstorming proposals, or world files. Launch Explore agents for broad surveys when needed. Keep exploration targeted to what informs the interview. For brainstorms triggered by frustration or repeated failure, also explore the history of attempted fixes — not just the current state. Patterns of repeated remediation attempts, escalating complexity, or accumulated workarounds are signals that the approaches (Step 3) should include radical options (reset, strip, rebuild from scratch) alongside incremental fixes. A long chain of narrowly-scoped fixes that didn't resolve the underlying problem is evidence that the problem may be structural, not tactical.

## Step 2: Confidence-Driven Interview

This is the core of the skill. Your goal is to reach **95% confidence** about what the user actually wants before proposing solutions.

### The Protocol

After each user answer, display a confidence block:

```
Confidence: X%
Gaps: [list of remaining unknowns]
```

Keep asking questions until confidence reaches 95%. Then announce: "I'm at 95% confidence. Moving to approaches."

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
