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

4. **Confidence calibration from reference material and request**: If the reference file provides a comprehensive design (rationale, decisions, structure, adaptation notes), set initial confidence based on how much of the problem space it covers. A thorough reference file may start confidence at 70-85%, reducing the interview to closing operational gaps (naming, cleanup, customization preferences). The same calibration applies to the user's initial request text — if the request includes detailed problem analysis, specific evidence, root cause identification, and a clear ask, calibrate initial confidence from the request itself, not just from reference files. If the user's request includes root cause analysis, proposed solution, code locations, and FOUNDATIONS justification, set initial confidence to 85-95%. The interview becomes a gap-closing exercise (1-2 targeted questions about scope or edge cases), not a discovery process. Do not ask motivational questions ("what problem does this solve?") when the user has already demonstrated deep understanding of the problem. Research findings (sub-step 6 below) also contribute to confidence by narrowing the solution space before the interview begins. When the brainstorm is invoked mid-conversation after prior investigation (prior investigation, file analysis, debugging), calibrate initial confidence from the accumulated conversation context — not just from reference files or the request text. Prior evidence gathering in the same session is a first-class confidence source.

5. **Interview skip threshold**: If Step 1 exploration and research bring confidence to 95%+ before the interview starts, skip Step 2 entirely and proceed directly to Step 3. Announce the confidence level and note that exploration resolved all gaps. This is common for well-specified requests where the user provides root cause analysis, code locations, and evidence — codebase exploration confirms rather than discovers.

   **Directed design question carve-out (non-plan-mode)**: If initial confidence is 85-94% AND the user's request is framed as a specific design decision with enumerated alternatives (i.e., the user has already stated the problem and proposed options, turning the brainstorm into an approach-selection task rather than a discovery task), skip the discovery interview and go directly to Step 3. Announce the confidence level, name any remaining gaps as assumptions to carry into the approach proposal, and let the user correct them during approach selection. This mirrors the plan-mode fast-track but applies in non-plan-mode when the user has effectively pre-conducted the interview themselves.

6. **External research**: If the topic requires domain knowledge beyond the codebase (academic algorithms, industry best practices, competing architectures, scaling solutions), launch research agents BEFORE the interview. The user's request may explicitly call for research ("research this online", "look for solutions") or the problem may implicitly require it (novel algorithms, scaling problems, unfamiliar domains). Summarize findings for the user before asking interview questions. Research findings inform both the confidence calibration (what solution space exists) and the approach proposal (what concrete options are available). If codebase exploration (sub-step 7) produces a clear root cause with concrete code-path evidence, external research may be skipped even if the user suggested it. Note the skip decision when presenting findings. If the user's interview answer explicitly requests research or reveals a domain that requires it, pause the interview to launch research agents before continuing. Present research findings before the next interview question or approach proposal. This mid-interview research follows the same summarize-before-asking pattern as pre-interview research.

7. **Project context**: Explore existing implementations relevant to the topic before starting the interview — this context informs better questions. For tooling/process topics, examine existing instances of the thing being designed (e.g., existing skills, configs, workflows — their structure, size, patterns). For codebase topics, check relevant files, specs, tickets, brainstorming proposals, or world files. Launch Explore agents for broad surveys when needed. Keep exploration targeted to what informs the interview. For brainstorms triggered by frustration or repeated failure, also explore the history of attempted fixes — not just the current state. Patterns of repeated remediation attempts, escalating complexity, or accumulated workarounds are signals that the approaches (Step 3) should include radical options (reset, strip, rebuild from scratch) alongside incremental fixes. A long chain of narrowly-scoped fixes that didn't resolve the underlying problem is evidence that the problem may be structural, not tactical.
