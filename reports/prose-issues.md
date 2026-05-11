## **Bottom line**

**`keep-coding-instructions: false` is comprehensive for one specific thing: removing Claude Code’s software-engineering-specific default system-prompt instructions. It does not make Claude Code equivalent to raw OpenRouter/API Opus 4.7.**

So the answer is:

**A new prose-rendering skill alone will not ensure OpenRouter-equivalent prose.**  
 **A custom Claude Code output style with `keep-coding-instructions: false`, plus a deliberately isolated prose renderer, will probably improve things a lot.**  
 **For true equivalence, the only reliable route is to send the final prose prompt directly through the API/OpenRouter with the same model and effort settings.**

There is no public evidence I found that Anthropic deliberately cripples creative writing in Claude Code. There is strong public evidence that **Claude Code is a different product harness** from the raw API and that harness changes can materially alter quality. Anthropic’s April 23, 2026 postmortem says recent Claude Code quality reports came from product-layer changes while “the API was not impacted,” including a system-prompt verbosity instruction that hurt Claude Code quality and was reverted.

## **The key trap: `keep-coding-instructions` is not a skill setting**

Anthropic’s Claude Code docs place `keep-coding-instructions` in **output style** frontmatter, not ordinary `SKILL.md` frontmatter. The output-style docs say custom output styles exclude coding instructions unless `keep-coding-instructions` is true, and the frontmatter table lists `keep-coding-instructions` as controlling whether to keep the parts of Claude Code’s system prompt related to coding.

The skill docs’ frontmatter list includes fields like `name`, `description`, `allowed-tools`, `model`, `effort`, `context`, and `agent`, but not `keep-coding-instructions`. Skills are loaded as task-specific prompts; when invoked, the rendered `SKILL.md` enters the conversation as a message and stays in context, rather than rewriting Claude Code’s default system prompt.

That means this will **not** do what you want:

---  
name: creative-prose-renderer  
keep-coding-instructions: false  
---

inside `SKILL.md`.

Claude Code will not treat that as the magic switch, unless Anthropic has added undocumented behavior beyond the docs. The documented place for it is:

.claude/output-styles/<style-name>.md

## **What `keep-coding-instructions: false` actually removes**

Anthropic’s docs are unusually explicit here: output styles “directly modify Claude Code’s system prompt,” and the comparison section says output styles completely turn off the parts of Claude Code’s default system prompt specific to software engineering.

That is good news. It means `keep-coding-instructions: false` should remove things like:

* “verify code with tests”  
* “be concise between tool calls”  
* “act as a software engineer”  
* “prefer implementation / debugging / repository workflow behavior”

But the same docs also say output styles change how Claude responds while **keeping core capabilities like running scripts, reading and writing files, and tracking TODOs**. So even with coding instructions removed, Claude Code is still an agentic CLI environment, not a raw model call.

Also, output-style changes take effect at session start, so you need a fresh Claude Code session after selecting the style. I would also verify your installed Claude Code version: there is an open GitHub issue against v2.1.104 reporting that output styles with YAML frontmatter were recognized but their content was not injected, which would break `keep-coding-instructions: false` in practice on affected installs.

## **Why this still cannot guarantee OpenRouter-equivalent prose**

There are four remaining differences.

First, **Claude Code still has an agent loop and tool context.** Anthropic describes Claude Code as an agentic tool that reads a codebase, edits files, runs commands, and integrates with development tools. The Agent SDK docs say the SDK uses the same tools, agent loop, and context management that power Claude Code. That is a different environment from a single direct OpenRouter API call.

Second, **output styles only modify the system prompt; skills do not become raw API calls.** Anthropic distinguishes output styles from skills: output styles are always-active response/style shaping, while skills are task-specific prompts invoked by name or automatically.

Third, **Claude Code still loads project instructions and memory.** Claude Code loads `CLAUDE.md` and auto memory into sessions; the docs also say CLAUDE.md is context rather than enforced configuration, but it is still present and can influence output.

Fourth, **OpenRouter direct use is itself configuration-dependent.** OpenRouter’s Claude Opus 4.7 page exposes the model as `anthropic/claude-opus-4.7`, with 1M context and standard API usage. But OpenRouter also routes requests among providers unless configured otherwise, so apples-to-apples testing should force Anthropic first-party routing where possible. For Claude 4.7 specifically, OpenRouter says sampling parameters like `temperature`, `top_p`, and `top_k` are ignored, and that `verbosity` maps to Anthropic’s `output_config.effort`. Claude Code defaults Opus 4.7 to `xhigh` effort as of v2.1.117, so OpenRouter comparisons should use `verbosity: "xhigh"` unless you intentionally want a different effort level.

## **The bigger problem in your uploaded skills**

Your current prose pipeline is extremely intelligent structurally, but it is not cleanly separated from the prose act. It keeps telling the model that the page is a state transaction.

Your page-cycle skill literally ends with the rule:

“A page is not a passage of prose. It is a transaction against narrative state…”

That is probably true for your engine, but it is a toxic instruction for the model that must produce dream-state fiction. It trains the model to think like a ledger executor at the exact moment you need it to think like a novelist.

Your Phase 7 render prompt includes the story kernel, prose craft contract, arc contract, dramatic unit, beat plan, execution envelope, stop policy, required effects, scene context, recent prose continuity, and governor nudge before asking for continuous prose. Then the system runs an 8-axis prose critic over filter words, repeated metaphors, anchor recurrence, ledger jargon, abstract noun saturation, and padding/truncation. Your Prose Craft Contract is thoughtful, but it is still a diagnostic rubric full of prohibitions and pathology labels; embedded verbatim in the render prompt, it can push the model toward “avoid faults” prose instead of alive prose.

Phase 7.6 then extracts an ARC_TRACE from the rendered prose and validates it against selected arcs, effect variants, stop conditions, evidence spans, and semantic conformance. That may be excellent engineering, but it reinforces the model’s sense that prose is evidence for a validator.

My strong read: **Claude Code’s coding harness is probably only part of your problem. Your own Phase 7 prompt architecture is also flattening the prose.**

## **The fix I’d actually use**

Do not make “creative prose” just another big skill with more instructions. Make it a **different execution lane**.

Recommended setup:

1. A project output style that disables coding instructions.  
2. A custom prose-renderer agent or subagent.  
3. A tiny renderer skill that receives a prose packet, not the whole story engine.  
4. A post-render validator that runs after prose generation, not inside the prose-generation prompt.  
5. Optional direct OpenRouter/API rendering for final prose if exact equivalence matters.

### **1. Output style**

Create:

.claude/output-styles/fiction-prose.md

with:

---  
name: Fiction Prose  
description: Creative prose mode for rendering fiction scenes without software-engineering behavior.  
keep-coding-instructions: false  
---

You are not acting as a software engineer.

You are a literary fiction prose renderer. Your job is to produce immersive scene prose, not architecture, summaries, analysis, markdown outlines, validation commentary, or implementation notes.

Write continuous fiction prose unless explicitly instructed otherwise.

Treat any supplied structure as private scaffolding. Convert it into lived scene experience: perception, action, dialogue, interior pressure, gesture, silence, rhythm, and consequence.

Do not mention storylets, ledgers, records, validators, arcs, beats, obligations, state snapshots, affordance maps, effect variants, or any internal engine vocabulary.

Do not explain subtext after rendering it. Trust the reader.

Do not produce a plan, critique, checklist, or rationale.

The final answer should be prose only unless the user explicitly asks for commentary.

Then set it and restart the session.

### **2. Better: a custom prose agent**

Claude Code’s subagent docs say custom subagents have their own system prompt, specific tool access, and independent permissions; when run as the main session with `--agent`, the subagent’s system prompt replaces the default Claude Code system prompt entirely, while CLAUDE.md still loads through the normal message flow.

That is closer to raw API behavior than merely using an output style.

Create:

.claude/agents/prose-renderer.md  
---  
name: prose-renderer  
description: Renders final literary fiction prose from a compact prose packet. Use only for final scene/page prose, not planning or validation.  
model: opus  
effort: xhigh  
tools: Read  
---

You are a literary fiction prose renderer.

You receive compact prose packets from a story engine. The packet may contain continuity facts, scene pressure, required turns, voice notes, and a desired stopping point. Treat all of that as hidden scaffolding. Your output is the page itself.

Your job:  
- Render the scene as continuous prose.  
- Preserve all hard facts and required consequences.  
- Convert abstract structure into concrete lived experience.  
- Maintain the requested POV, tense, psychic distance, and voice.  
- Stop at the natural decision point or emotional hinge requested by the packet.

Never output:  
- analysis  
- markdown headings  
- beat labels  
- explanations  
- validator language  
- record IDs  
- “as an AI” language  
- summaries of what the scene means  
- lists of what you changed

Do not try to satisfy every possible prose-craft rule visibly. Write the scene. Make it breathe.

When the packet contains an authorial style sample, absorb its cadence and texture without copying distinctive phrases.

Output only the rendered prose.

Then run:

claude --agent prose-renderer

or have your main architecture skill invoke a prose skill with `context: fork` and `agent: prose-renderer`. The docs say a skill with `context: fork` uses the selected agent as the execution environment and passes the skill content as the task.

### **3. Replace the current Phase 7 prompt with a prose packet**

Your current Phase 7 prompt should not send the whole arc/ledger machinery into the creative call. It should compile a short prose packet like this:

<prose_packet>  
POV: close third, Iker  
TENSE: past  
REGISTER: restrained, tactile, unsentimental  
LOCATION: the municipal archive reading room after closing  
PRESENT: Iker, Mara  
VISIBLE FACTS:  
- The rain has trapped both of them inside.  
- Mara has the sealed envelope but has not opened it.  
- Iker knows the envelope may implicate his father.  
- Mara does not know Iker already recognized the handwriting.

SCENE PRESSURE:  
Mara offers him the envelope as if it is a favor. Iker must decide whether to accept the debt that comes with touching it.

REQUIRED TURN:  
By the end of the page, Iker takes the envelope but does not open it.

DO NOT REVEAL:  
- What the envelope contains.  
- Whether Iker’s father is guilty.  
- Any world/engine record identifiers.

STOPPING POINT:  
End when Mara notices that Iker recognized the handwriting.

VOICE SAMPLE:  
[300-700 words of target prose style from this story, not prior-page anchors to be reused]  
</prose_packet>

No `STENT-NNNN`. No `OBL-NNNN`. No `arc_trace`. No “choice-worthiness.” No “commitment class.” No “effect model.” The renderer should receive the world as a novelist would receive it.

### **4. Move the critic after the render**

Keep your Prose Craft Contract, but do not embed the entire diagnostic vocabulary in the first prose-generation call. Use it as a second-pass critic:

1. Render prose from prose packet.  
2. Run deterministic checks: no IDs, no forbidden facts, required turn happened.  
3. Run prose critic.  
4. If needed, produce a **natural-language revision instruction**, not a ledger instruction.

Bad re-prompt:

HARD_FAIL ledger_jargon_leakage and abstract_noun_saturation. Re-render with OBL preserved.

Good re-prompt:

Revise the page. Remove any engine-like phrasing. Replace abstract explanation with concrete gestures, objects, and spoken pressure. Preserve the fact that Iker takes the envelope but does not open it.

## **Will this match OpenRouter Opus 4.7 quality?**

**It can get close, but no, it cannot be guaranteed.**

A Claude Code session with:

* output style `keep-coding-instructions: false`,  
* custom `prose-renderer` agent,  
* `model: opus`,  
* `effort: xhigh`,  
* minimal prose packet,  
* no ledger vocabulary in the render prompt,

should remove the most obvious Claude Code coding bias.

But it still is not identical to direct OpenRouter/API because Claude Code still has its own environment, session state, tools, memory loading, and output-style reminders. Direct OpenRouter/API with `anthropic/claude-opus-4.7` and `verbosity: "xhigh"` is the cleaner control condition.

Also, routing Claude Code through OpenRouter is **not** the same as using raw OpenRouter Opus. OpenRouter’s Claude Code integration says Claude Code speaks its native protocol to OpenRouter, and OpenRouter’s Anthropic skin passes through features like thinking blocks and native tool use. That means the Claude Code harness remains; only the transport/provider path changes.

## **My practical recommendation**

Use Claude Code for what it is excellent at: **state, canon, branching logic, continuity, validation, file writes**.

Use a separate prose lane for the actual page:

architecture skill  
 → compiles prose_packet.md  
 → prose-renderer agent renders prose only  
 → validator checks prose against state  
 → architecture skill writes records/files

For the highest-quality final prose, make the renderer either:

Claude Code custom agent + output style

or:

direct OpenRouter/API Opus 4.7 call

Do not let the final prose call see the full transaction machinery. Your current system is telling the model, in a dozen different ways, that prose is an audit artifact. That is exactly the kind of thing that kills fiction.

