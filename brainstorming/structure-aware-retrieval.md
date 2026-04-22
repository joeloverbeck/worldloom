# Proposal: add a structure-aware retrieval and patching layer for worldloom markdown

## Bottom line

Do not try to solve this by “better chunking” alone.

The real fix is to stop using raw published markdown as the only machine-facing interface.

Keep your human-facing markdown files.
Add a machine-facing layer under them:

1. a local world index
2. a retrieval MCP server
3. a deterministic patch engine
4. executable validators
5. thinner orchestration skills

That is the architecture that will let Claude Code retrieve only what it needs and make exact edits without constantly re-reading half the world.

---

## Diagnosis

Your current system has already done the first obvious optimization: targeted reads instead of whole-file reads.

That means the remaining token burn is coming from five places:

1. Huge persistent skill bodies and support logic
   Once a skill is invoked, its rendered body is part of session context. If the skill is enormous, you are paying a hidden tax every turn.

2. Procedural overhead expressed in prompt text instead of code
   Your skills currently force the model to carry workflow, validation, and formatting law in language. That is expensive and fragile.

3. Monolithic documents as the unit of reasoning
   Even when you grep first, the model still ends up thinking in terms of files and big sections instead of exact addressable facts, entries, or fragments.

4. Freeform writing as the edit primitive
   If the model is asked to “update this markdown file,” it wants too much context and tends to over-read and over-write.

5. Verification done after the fact, not as a gated patching operation
   The more your correctness rules live in the model prompt instead of in executable validators, the more context you have to feed the model to keep it behaving.

This is why the token bill stays high even after read-optimization.

---

## What I recommend

### Recommendation in one sentence

Make Claude retrieve nodes, not files, and make it emit edit operations, not prose rewrites.

---

## Necessary changes

## 1. Introduce a local structure-aware world index

Add a build step that parses your markdown world into atomic addressable nodes.

Each node should have:

- stable node id
- file path
- heading path
- byte span and line span
- node type
- entity names mentioned
- outgoing links
- incoming backlinks
- lightweight summary
- hash of current content

### Node types you should index

At minimum:

- canon_fact_record
- change_log_entry
- mystery_reserve_entry
- open_question_entry
- adjudication_record
- section
- subsection
- bullet_cluster
- character_record
- diegetic_artifact_record
- template
- invariant
- world_rule
- named_entity

### For your repo specifically

Exploit the structure you already have:

- fenced YAML records in `CANON_LEDGER.md`
- heading-scoped sections in `EVERYDAY_LIFE.md`
- heading-scoped sections in `INSTITUTIONS.md`
- heading-scoped sections in `OPEN_QUESTIONS.md`
- heading-scoped sections in `MYSTERY_RESERVE.md`
- attribution comments like `<!-- added by CF-NNNN -->`
- modification histories
- `derived_from`
- `required_world_updates`

You already have more structure than a normal markdown repo. Use it.

### Storage

Use SQLite.

Tables I would create:

- nodes
- edges
- entity_mentions
- file_versions
- anchor_checksums
- fts_nodes
- summaries
- validation_results

Use SQLite FTS5 for exact and lexical retrieval.
Add vector search only as an optional secondary layer, not the foundation.

Strong opinion: embeddings should be a fallback, not the source of truth.
Canon work is mostly exact-match, backlink, and impact-surface retrieval.

---

## 2. Build the index with a markdown parser, not regex spaghetti

Use TypeScript and the unified/remark ecosystem for markdown parsing and serialization.

Why TypeScript here:

- markdown AST tooling is better
- remark/unified is mature
- writing a compiler and patcher around mdast is straightforward
- MCP and hook tooling fit nicely in Node

Use parsing layers like this:

- Markdown AST pass:
  parse headings, lists, paragraphs, HTML comments, and block boundaries

- YAML extraction pass:
  extract fenced YAML records and normalize them into typed objects

- world-semantic pass:
  identify CF ids, CH ids, PA ids, M ids, OQ headings, named entities, backlinks

- compiler pass:
  reconstruct canonical markdown from the structured source where needed

Do not let the parser be optional.
The parser is the difference between “surgical edits” and “LLM guessing at text spans.”

---

## 3. Add a retrieval MCP server

Expose the world index to Claude Code through MCP tools.

The MCP server should offer tools like these:

- `search_nodes(query, filters)`
- `get_node(node_id)`
- `get_neighbors(node_id, edge_types, depth)`
- `get_context_packet(task_type, seed_nodes, token_budget)`
- `find_impacted_fragments(node_ids)`
- `find_named_entities(names)`
- `find_edit_anchors(targets)`
- `validate_patch_plan(patch_plan)`

### Retrieval policy

The retrieval order should be hard-coded like this:

1. exact ids first
   `CF-0021`, `CH-0014`, `M-7`, `PA-0017`

2. exact entity names second
   people, taverns, cities, artifacts, organizations

3. heading-path matches third

4. backlink and dependency expansion fourth

5. lexical search fifth

6. semantic retrieval last, and only to improve recall

That ordering matters.
For canon, semantic-first retrieval is a great way to fetch almost-right context and miss the one exact clause that matters.

---

## 4. Replace “read a file and edit it” with a deterministic patch engine

This is the most important change.

Claude should not directly perform final edits against your heavyweight markdown files.

Instead:

1. Claude asks the index for a context packet
2. Claude reasons over exact nodes and their minimal neighbors
3. Claude emits a patch plan in a strict schema
4. Code applies the patch
5. Validators accept or reject it
6. If rejected, Claude gets the validator errors and retries

### Patch plan shape

The patch plan should be structured operations such as:

- `insert_before_node`
- `insert_after_node`
- `replace_node`
- `replace_yaml_field`
- `append_list_item`
- `append_modification_history_entry`
- `insert_under_heading`
- `append_change_log_entry`
- `append_adjudication_record`
- `insert_attribution_comment`

Each op should carry:

- target node id
- target file
- expected current hash
- expected anchor checksum
- operation type
- payload
- failure mode

### Why this matters

If the file changed under Claude’s feet, or the anchor is no longer exact, the patch engine should fail closed.

That forces re-localization instead of silent corruption.

Do not let the model do blind text replacement against current file contents.
Do not let it rewrite whole docs “for simplicity.”
That is exactly how your token bill and edit risk explode together.

---

## 5. Move correctness out of prompts and into validators

Your world already has a lot of invariant and audit discipline.
Make code enforce it.

Validators should check, at minimum:

- YAML parse integrity
- unique CF / CH / PA ids
- required fields present
- `derived_from` targets exist
- `required_world_updates` actually correspond to touched fragments
- attribution comments present where required
- change log references resolve
- `modification_history` and notes stay consistent
- no broken markdown fence structure
- no orphaned named-entity references
- no patch against stale anchors
- no illegal whole-file rewrite
- no mutation outside approved surfaces

### World-specific validators you should add

For your repo specifically:

- `canon_ledger_validator`
- `mystery_reserve_validator`
- `open_questions_validator`
- `everyday_life_fragment_validator`
- `adjudication_discovery_fields_validator`
- `attribution_comment_validator`
- `cross_file_reference_validator`

The model should be allowed to propose.
Only code should be allowed to canonize.

---

## 6. Rewrite the skills to become thin orchestrators

Your current `SKILL.md` is trying to be:

- policy
- workflow
- retrieval strategy
- file-format spec
- validator
- patching guide
- audit framework

That is too much.

### The new role of `canon-addition/SKILL.md`

It should become a compact orchestrator that says, in effect:

1. normalize the proposal
2. call the index to get a context packet
3. call the impact scanner
4. produce a verdict and patch plan
5. hand the patch plan to the patch engine
6. inspect validator failures if any
7. refine once
8. stop

### The skill should stop containing

- exhaustive reference material
- giant examples
- line-by-line file surgery doctrine
- validation checklists that code can run
- long lists of anchor patterns
- giant “if X then Y” procedural law that can live in tools

Keep the skill small.
Keep the law in code.
Keep the data in the index.

---

## 7. Use Claude Code hooks aggressively

Hooks are how you turn “please do the efficient thing” into “you are not allowed to do the expensive dumb thing.”

### Hook 1: `UserPromptSubmit`
Attach a small context preface generated from the index:

- active world slug
- top relevant node ids
- likely impacted file fragments
- named entities detected in the prompt
- warnings if the request implies a wide-scope canon change

### Hook 2: `PreToolUse` on `Read`
Block or rewrite wasteful reads.

Policies I would implement:

- deny full `Read` on `CANON_LEDGER.md` above a size threshold unless the human explicitly asked for full file content
- deny full `Read` on `EVERYDAY_LIFE.md`, `INSTITUTIONS.md`, `MYSTERY_RESERVE.md`, and `OPEN_QUESTIONS.md` unless offset/limit is present
- when a broad read is attempted, inject a message telling Claude to use the MCP retrieval tool first
- optionally rewrite broad reads into a smaller offset/limit if an exact anchor is already known

### Hook 3: `PreToolUse` on `Edit` and `Write`
Disallow direct edits to compiled high-value docs unless the edit came from the patch engine workflow.

In plain English:

- Claude may not directly edit `CANON_LEDGER.md`
- Claude may not directly edit `EVERYDAY_LIFE.md`
- Claude may only submit structured patch ops
- the patch engine applies them

### Hook 4: `SubagentStart`
Inject a specialized instruction into research/localization subagents:

- search exact ids first
- entity names second
- headings third
- do not open large files wholesale
- return node ids, not narrative summaries, unless asked

### Hook 5: `PostToolUse` or end-of-patch validation hook
Run validators automatically and feed failures back into the conversation.

---

## 8. Split retrieval and editing into separate agents

Do not ask one context to do all of:

- localization
- impact analysis
- writing
- validation repair

Use at least two roles.

### Agent A: Localizer / explorer
Responsibilities:

- find exact nodes
- build context packets
- identify impacted fragments
- return small structured evidence bundles

This is the right place to use `context: fork` plus `agent: Explore`.

### Agent B: Editor
Responsibilities:

- decide the verdict
- draft the patch plan
- react to validator failures
- produce final structured ops

Optional:

### Agent C: Auditor
Responsibilities:

- verify references, ids, and back-links
- check that every declared update was actually patched
- reject patch plans with suspicious surface area

This split mirrors what works in the current literature:
localize first, then edit.

---

## 9. Add hierarchical summaries on top of exact retrieval

You need two retrieval layers:

### Layer 1: authoritative node retrieval
This is the exact canon layer.
Used for correctness.

### Layer 2: hierarchical summaries
This is the “understand the surrounding world” layer.
Used for reasoning economy.

Create summaries at:

- node level
- section level
- file level
- world level

Store them in the index and use them as budget fillers when the task is broad.

That gives you a RAPTOR-like hierarchy:
Claude first sees the compact section/world summary, then drills into exact nodes only where needed.

This is how you avoid reading 8 giant prose files just to learn that only one bullet in one subsection actually matters.

---

## 10. Migrate the ledger first, not the whole repo

Do not try to normalize everything in one pass.

### Phase 1: index-only over current files
No source-of-truth migration yet.
Just parse and index the current markdown.
Use MCP retrieval + hooks + patch engine against current files.

This alone should cut a lot of waste.

### Phase 2: make `CANON_LEDGER.md` generated
Move canonical CF and CH records into atomic source files:

- `worlds/<slug>/_source/canon/CF-0001.yaml`
- `worlds/<slug>/_source/change-log/CH-0001.yaml`

Then compile `CANON_LEDGER.md` from those atomic records.

This is the single highest-value migration because the ledger is already semi-structured and high-risk.

### Phase 3: fragmentize high-churn prose files
Break these into addressable fragments:

- `EVERYDAY_LIFE.md`
- `INSTITUTIONS.md`
- `OPEN_QUESTIONS.md`
- `MYSTERY_RESERVE.md`

Not into individual sentences.
Into meaningful world units:
sections, subsections, bullet clusters.

### Phase 4: optionally generate more compiled views
Once the source layer is stable, treat the published markdown docs as compiled artifacts.

That gives you human-readable docs and machine-safe editing.

---

## 11. Suggested repository layout

A sane incremental layout would look like this:

    .claude/
      hooks/
        user-prompt-context.ts
        guard-large-read.ts
        guard-direct-edit.ts
        validate-after-patch.ts
      skills/
        canon-addition/
          SKILL.md
          references/
          templates/

    tools/
      world-index/
        package.json
        src/
          build-index.ts
          parse-markdown.ts
          extract-yaml.ts
          entity-scan.ts
          context-packet.ts
          impact-scan.ts
          patch-engine.ts
          validators/
            canon-ledger.ts
            open-questions.ts
            mystery-reserve.ts
            attribution.ts
            references.ts
        schema.sql

      world-mcp/
        package.json
        src/
          server.ts
          tools/
            search-nodes.ts
            get-node.ts
            get-neighbors.ts
            get-context-packet.ts
            find-impacted-fragments.ts
            submit-patch-plan.ts

    worlds/
      animalia/
        _index/
          world.db
        _source/
          canon/
          change-log/
          fragments/
        CANON_LEDGER.md
        EVERYDAY_LIFE.md
        INSTITUTIONS.md
        OPEN_QUESTIONS.md
        MYSTERY_RESERVE.md
        characters/
        diegetic-artifacts/
        adjudications/

If you do not want `_source/` yet, skip it in Phase 1.
But add `_index/world.db` immediately.

---

## 12. The context packet contract

The context packet is the object Claude should reason over.

It should contain five layers:

### 1. Task header
- task type
- world slug
- proposal path
- detected entities
- detected ids
- token budget

### 2. Nucleus
The exact nodes that are unquestionably relevant.

Example:
- proposal target node
- exact `derived_from` CFs
- exact MR entries touched
- exact OQ entries touched
- exact target prose fragments

### 3. Envelope
Minimal surrounding context:

- parent section
- previous sibling
- next sibling
- backlink summary
- last modification history entries
- local style rules for the target surface

### 4. Constraints
- validator rules that matter for this patch
- prohibited surfaces
- required output schema
- max patch surface area

### 5. Suggested impact surfaces
- likely downstream file fragments
- likely named entities
- likely required updates

This packet should be assembled by code.
Claude should not have to discover all of this from scratch every time.

---

## 13. The edit contract

Make the editor emit something like this in strict JSON:

    {
      "verdict": "ACCEPT_WITH_REQUIRED_UPDATES",
      "target_world": "animalia",
      "patches": [
        {
          "op": "append_change_log_entry",
          "target_node": "change-log-tail",
          "expected_hash": "...",
          "payload": { ... }
        },
        {
          "op": "replace_yaml_field",
          "target_node": "CF-0017",
          "field": "modification_history",
          "expected_hash": "...",
          "payload": { ... }
        },
        {
          "op": "insert_under_heading",
          "target_node": "EVERYDAY_LIFE:(a):Leisure",
          "expected_hash": "...",
          "payload": "..."
        }
      ]
    }

The patch engine applies this.
Not Claude directly.

---

## 14. Ranking strategy for retrieval

Give every candidate node a score made from:

- exact id match
- exact entity match
- heading-path match
- node-type relevance
- graph distance from nucleus
- recency of modification
- file-class priority
- semantic similarity

But make the weights lopsided.

For canon work, I would weight them like this conceptually:

- exact id: huge
- exact entity in target field: huge
- graph proximity: high
- file-class relevance: high
- semantic similarity: modest

This prevents “close-enough” semantic hits from outranking exact canon anchors.

---

## 15. What to keep in markdown and what to move out

### Keep as markdown-first for now
- narrative prose
- characters
- diegetic artifacts
- long descriptive sections
- compiled world docs

### Move toward structured-source-first
- canon fact records
- change log entries
- adjudication metadata
- named invariants
- open question entries
- mystery reserve entries
- attribution/provenance surfaces

That split matches the actual risk profile.
You need deterministic edits for canon law and provenance.
You do not need the same level of normalization for every atmospheric prose paragraph on day one.

---

## 16. What not to do

Do not:

- rely on vector search as the primary retrieval method
- ask Claude to rewrite `CANON_LEDGER.md` directly
- keep adding more and more procedural law to a giant `SKILL.md`
- normalize the entire repo before proving the index + patch loop
- keep correctness rules only in prompt text
- let broad reads happen silently
- assume support files solve the problem if the skill still reads all of them

---

## 17. Phased implementation plan

### Phase 1: immediate win
Build:
- world index
- MCP retrieval tools
- read-guard hooks
- thin skill orchestrator

Do not migrate source of truth yet.

Expected outcome:
- much lower broad-read waste
- better localization
- smaller per-task context packets

### Phase 2: correctness win
Build:
- deterministic patch engine
- validators
- edit-guard hooks

Expected outcome:
- exact edits
- fail-closed behavior
- less need to stuff formatting law into prompts

### Phase 3: highest leverage migration
Move:
- CF records
- CH records
- adjudication metadata
into atomic source files and compile the ledger.

Expected outcome:
- massive reduction in ledger edit surface
- much safer canon mutations

### Phase 4: broad world scaling
Fragmentize:
- `EVERYDAY_LIFE.md`
- `INSTITUTIONS.md`
- `OPEN_QUESTIONS.md`
- `MYSTERY_RESERVE.md`

Expected outcome:
- broad tasks stop requiring broad reads

### Phase 5: optional future
If Claude Code still becomes the bottleneck, move the orchestration loop into your own runner and use:
- structured outputs for patch plans
- prompt caching for repeated world context

---

## 18. My blunt recommendation

If you only do one thing, do this:

Build a local SQLite-backed world index plus an MCP retrieval server, then stop letting Claude directly edit the heavyweight markdown files.

If you do two things, add a deterministic patch engine.

If you do three things, make `CANON_LEDGER.md` generated from atomic source records.

That is the path that turns your repo from “LLM reading a pile of giant markdown blobs” into “LLM operating a world compiler.”

That is also the path that will actually cut tokens without sacrificing correctness.