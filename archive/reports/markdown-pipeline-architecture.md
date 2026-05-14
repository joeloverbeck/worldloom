# The Markdown / DB / MCP Pipeline

A portable explanation of how worldloom keeps a structured knowledge base alive
inside a folder of markdown and YAML files, and what each layer of the local
machine-facing stack is *for*. Written so it can be re-applied to any other
repository whose source-of-truth is human-readable text and whose primary
authors are LLM agents and humans operating side-by-side.

The point of this document is not the specific schemas in this repo. It is the
**division of labor** between four artifacts that any similar system will need:

1. The text files themselves (the canonical truth).
2. A derived index (a queryable view of those files).
3. A local MCP server (a structured API on top of the index).
4. A patch engine + validators (the only way changes go back in).

If you keep that division clean, you get a system where humans can still read
the truth in a text editor, the LLM never has to load megabytes of prose to
answer one question, and no class of edit can land that violates the project's
invariants.

---

## 0. Why not just let the agent edit markdown directly?

Most "LLM + filesystem" workflows let the model `Read` and `Edit` arbitrary
files. That is fine for small or stateless tasks. It breaks down at exactly the
point where a project has these three properties:

- **Cross-file coupling.** Editing file A *implies* changes in files B, C, D,
  and forgetting any of them silently corrupts the project state.
- **Append-only invariants.** Some content is supposed to be a ledger — once
  written, it must never be silently rewritten, only superseded with an
  attached audit trail.
- **Scale beyond the context window.** The total project state is too large to
  read at once, so naive retrieval (load five plausibly-relevant files) is both
  slow and unreliable.

The pipeline described below exists because every one of those three
properties was true here. If only one is true in your case, you can collapse
some layers. If none are true, you don't need this architecture; you need a
linter and good naming.

---

## 1. What stays in the markdown / YAML files

The single most important design decision is *what counts as the source of
truth*. In this repo:

- **Plain markdown files at the world root** hold the things that are
  fundamentally narrative and primary-authored: a kernel summary, an ontology
  document. These are written by humans (or by skills as a one-time
  bootstrap), edited rarely, and read constantly. They never participate in
  the structured-mutation pipeline; they are edited like any other markdown.
- **Atomic YAML files under a `_source/` tree** hold every record that has an
  ID, a schema, cross-references, or a need to be queried in isolation. One
  file, one record. A canon fact lives at `_source/canon/CF-0001.yaml`. A
  prose section about geography lives at
  `_source/geography/SEC-GEO-001.yaml`. An invariant lives at
  `_source/invariants/SOC-1.yaml`.
- **Hybrid markdown files** (YAML frontmatter + prose body) hold the artifacts
  whose body is genuinely meant to be read as prose by humans but whose
  metadata participates in the structured graph: characters, in-world
  documents, audit reports, adjudication records.
- **Generated index** lives at `_source/.../_index/world.db`, gitignored and
  regenerable from the canonical files.

The rule of thumb that produced this layout:

> *If the agent will need to query, cross-reference, or validate this content,
> store it as one record per file in YAML. If it is a long human-written
> narrative or a discussion-style document, leave it as markdown. If it is
> both — store the structured part as frontmatter and the prose as the body.*

Everything below this section assumes that rule has been applied. The
**atomicity** — one record, one file — is what makes the rest of the pipeline
cheap. You can compute "the next available ID" by listing a directory. You
can detect what changed since the last build by comparing file hashes per
file. You can lock and rename files atomically without coordinating with any
peer. None of that works if you put 200 records in one giant markdown file.

### Two non-obvious consequences worth lifting verbatim

- **The index is derived, not authoritative.** The DB at `_index/world.db` is
  gitignored. If you delete it you lose nothing. This is the only thing that
  lets the markdown layer stay readable in a normal IDE — and it is the only
  thing that lets two contributors with different working trees not constantly
  fight over a binary file.
- **Hybrid files are an explicit category, not a smell.** It is tempting to
  push every record into pure YAML or every record into pure prose. Don't.
  Some artifacts (a character dossier, a published essay-style record) really
  do have a structured "card" *and* a meaningful body of prose. Splitting them
  produces two files that always have to be opened together, which is worse
  than YAML frontmatter + markdown body. Decide the split per artifact class,
  and document it.

---

## 2. The index: a queryable view of the files

The index is a SQLite database produced by a `world-index build` /
`world-index sync` command. It contains:

- A `nodes` table with one row per parsed unit (a YAML record, an H2 prose
  section, a frontmatter block, etc.) — keyed by a stable `node_id`, with
  body text, byte ranges, content hash, and an "anchor checksum" used by the
  patch engine to detect drift.
- An `edges` table with typed edges between nodes — references, derivations,
  containment, "this section is touched by this canon fact", etc.
- Entity tables (`entities`, `entity_aliases`, `entity_mentions`) so that
  named entities can be resolved canonically from prose mentions.
- A `file_versions` table mapping file path → content hash, used by `sync`
  to skip unchanged files.
- An `fts_nodes` virtual FTS5 table for full-text search, kept in sync with
  the `nodes` table via insert/delete/update triggers.
- A `validation_results` table where validator runs persist their verdicts.

The scale-shaping insight: **the index is the only thing that ever needs to
hold the whole project state in memory at once.** The skill code, the MCP
server, the patch engine, the validators — none of them ever loads the entire
project. They all query the index. So the system can scale to
"project-too-large-to-read" without rewriting any of the consumer code.

The index is also where the cost of "I want to do a Rule-6-style
presence/absence scan across every prose body" becomes a normal SQL query
instead of a "the agent reads 200 markdown files" disaster.

### Adapting this to another repo

You don't need this exact schema. You need three things:

1. **A node table** keyed by stable IDs that survive renames. Anything you
   want to refer to needs a `node_id` and a content hash so consumers can
   detect drift.
2. **An edge table** for typed relationships. The point is to make graph
   queries (neighbors, transitive references, "what depends on this") cheap.
3. **A full-text surface** that stays in lockstep with the node table.
   FTS5-with-triggers is the cheapest correct option in SQLite; if you use
   something else (Postgres + tsvector, Tantivy, Meilisearch), the trigger
   discipline is the same — you do not let the search index drift from the
   primary table.

Build / sync semantics:

- `build` does a full rebuild from disk. Idempotent. The DB is throwaway.
- `sync` is incremental: walk the working tree, compare per-file content
  hashes against `file_versions`, re-parse only what changed, regenerate the
  derived edges and entity rows for those files.
- A `verify` command re-parses indexed files and flags drift between the
  index and the disk. Useful as a health check; cheap because per-file
  hashes already exist.

Treat the index as a build artifact, not as a checkpoint. If anything ever
goes weird, `rm -rf _index/ && world-index build` is a legal first step.

---

## 3. The MCP server: a structured API on top of the index

The MCP server is a stdio process the LLM runs locally. It exposes a small set
of tools (about 16 in this repo). They split cleanly into three categories:

### a) Retrieval tools

These never write. They read the index. The reason they exist instead of "let
the agent run SQL" is that they encode the **retrieval policy** — what counts
as a high-trust hit, what counts as lexical evidence, what gets ranked first.
The agent should never hand-roll a join against the DB; it asks for the right
shape of result.

Concrete examples from this repo, generalizable to any structured-doc system:

- `search_nodes(query, filters, exhaustive?)` — full-text search with
  structured filters (node type, file path, entity name). Has two modes:
  default (ranked, capped) and `exhaustive: true` (every match, sorted, with
  match locations) for "is X mentioned anywhere?" audits.
- `get_node(node_id)` / `get_record(record_id)` — pull one specific record
  in full. Used after the search/packet step, never as a discovery tool.
- `list_records(record_type, fields?)` — bulk read of one record class with
  optional field projection. The projection matters: it's how a sweep over
  500 records doesn't blow the context window.
- `get_record_field(record_id, field_path)` — pull *one field* from a parsed
  record without loading the body. Underrated. Most agent queries do not
  actually need the whole record.
- `get_neighbors(node_id, edge_types, depth)` — graph expansion.
- `find_named_entities(names)` — exact-match resolution against the canonical
  entity table. Distinct from search by design: search is for "I have a
  string", entity lookup is for "I have a name".
- `get_context_packet(task_type, seed_nodes, token_budget)` — the
  highest-leverage tool. Composes a ranked, token-budgeted packet of the
  records most likely to matter for a given task type. Replaces the failure
  mode of "agent eagerly reads ten plausibly-related files".

### b) Allocation / vocabulary tools

- `allocate_next_id(world_slug, id_class)` — single source of truth for "what
  is the next free ID". Replaces `grep | sort | tail`. This eliminates an
  entire class of race / collision bugs that show up the moment two skills
  ever run concurrently or the moment a plan partially fails and is retried.
- `get_canonical_vocabulary(class)` — returns the enums an op or a record is
  allowed to use. Stops the agent from inventing new values.

### c) Mutation tools

- `validate_patch_plan(plan)` — runs the validator suite without writing.
- `submit_patch_plan(plan, approval_token)` — the only write path.

The split between (a) and (c) is the entire point of the architecture: the
agent has many ways to **read** the project state and exactly one way to
**write** to it. Direct file edits to canonical files are blocked at a layer
below (see §5).

### Why MCP specifically, and what to copy

MCP gives you three things that matter here:

- **A typed tool surface that the LLM can call directly**, without any
  "translate intent into a shell command" step.
- **Schemas the LLM sees at tool-discovery time**, so it doesn't hallucinate
  parameters.
- **Local-first operation** — runs as a stdio child process, no network, no
  auth surface, no deployment.

If you adapt this pattern to another repo, the heuristic for what to expose
as a tool is:

> *Any operation the agent will need to do more than three times across a
> session, and any operation whose policy you want to encode in one place
> rather than re-explained in every prompt.*

ID allocation, canonical vocabulary, and ranked retrieval all meet that bar.
"Read this specific file by path" doesn't, and indeed is not exposed as an
MCP tool here — the agent can still use plain `Read` for that.

---

## 4. The patch engine: the only write path

The patch engine accepts a **patch plan envelope** — a typed JSON document
describing every mutation as a discrete, named operation. This repo has a
fixed vocabulary of about 13 operations:

- `create_<class>_record` for each record class
- `update_record_field(target_id, field_path, op, value)` where `op` is
  `set | append_list | append_text`
- `append_extension(target_id, extension)` — extension-style append for
  ledgered records
- `append_touched_by_cf(target_sec_id, cf_id)` — bidirectional graph edge
- `append_modification_history_entry(target_cf_id, ...)` — audit-log append
- A handful of hybrid-file append ops for the markdown-frontmatter artifacts

Every operation is **typed** (the engine knows what shape its payload has),
**addressed by record ID** (not by file path or byte offset), and **append-or-
declare** (creates a new record, or extends an existing one in a structured
way — never overwrites silently).

The engine does five things, in order:

1. **Validate the envelope shape.** Refuses anything that isn't structurally
   well-formed, before touching the world.
2. **Verify the approval token.** A short-lived HMAC-signed, single-use,
   plan-bound token (default 20-minute window). The token's HMAC binds it to
   `plan_id + world_slug + canonical_op_hashes + issued_at + expires_at`. If
   the plan changes by even one byte after approval, the token no longer
   verifies. This is what closes the "agent silently mutates the plan
   between approval and submission" gap.
3. **Run pre-apply validators.** Same code that powers `world-validate`. Any
   `fail` verdict aborts the submission with no writes performed.
4. **Phase A — stage.** Apply every op against an in-memory overlay of the
   current world state, write the resulting files to *temp files* alongside
   their targets. No target is touched yet.
5. **Phase B — commit.** `fsync` each temp file, then atomically rename it
   over its target. After all renames succeed, fire `world-index sync` to
   refresh the index.

Per-file rename is atomic at the filesystem level. A mid-commit crash leaves
some files committed and others still as temp files — recoverable via `git`
(this is the "forward-only, no engine rollback" posture).

### The approval-token pattern is the load-bearing piece

This is the part most worth lifting wholesale into a new project, and the
hardest to get right by accident. The flow:

1. Agent assembles a patch plan.
2. Agent writes the plan to a temp JSON file.
3. Agent presents a deliverable summary to the human (the "HARD-GATE").
4. Human approves in conversation.
5. Agent invokes a CLI signer that reads the plan, hashes every op
   canonically, signs `(plan_id, world_slug, op_hashes, issued_at,
   expires_at)` with a local HMAC secret.
6. Agent submits the plan + token to the engine.
7. Engine verifies HMAC, expiry, and op hashes against the *exact bytes of
   the plan it just received*, then commits.

The crucial property: **a token approves a specific set of bytes, not a
"session" or a "user".** If anything in the plan changes — a typo fix, a
re-ordered op, an extra debug field — the old token is dead and the human
has to approve again.

This is what makes "the human approved the plan" and "the engine wrote the
plan" the same event. In a multi-agent or auto-mode setting, this is the
difference between "approval is real" and "approval is theatre".

If you don't have a human in the loop at all, you still want this discipline,
just with a different signer (a CI policy bot, a higher-tier agent, etc.).
The token model doesn't care who the approver is — it cares that approval is
bound to bytes.

### Append-only discipline at the record level

The op vocabulary deliberately has no `delete_record` and no
`overwrite_record`. The structural fields of a record are **append-only in
practice**: you change them only via an explicit retcon attestation that
records *why* the change happened. The audit fields (`notes`,
`modification_history[]`, `extensions[]`) are the in-place mutation surface.

In any system with a "ledger" component (legal records, compliance trails,
scientific provenance, audit logs), this discipline is the entire point.
Implementing it as the *shape of the op vocabulary* — rather than as a
runtime check — is what makes it impossible to violate by accident. There is
no `update_record` op. The agent cannot type one. It does not exist.

---

## 5. Validators and hooks: making the contract structural

Two more pieces close the loop.

### Validators

A small package that turns each project rule into an executable check. In
this repo: 8 rule-derived validators ("no floating facts", "no silent
retcons", etc.) and 6 structural ones (YAML parse integrity, ID uniqueness,
cross-file reference resolvability, schema compliance, bidirectional-edge
completeness, audit-trail format).

Each validator emits `Verdict { validator, severity, code, message,
location, suggested_fix? }`. Severity is `fail | warn | info`. The same
package serves three call sites:

- The patch engine's pre-apply gate (any `fail` blocks the write).
- A `world-validate` CLI for full-world sweeps in CI or before merge.
- A post-write hook that re-runs structural validators after a commit and
  surfaces drift via a Claude Code system-reminder.

If you adapt this, the most important property is that *the same validator
binary serves the engine, the CLI, and the hook*. The agent cannot find a
flow in which a check that exists is not running. There is one validator
implementation per rule, and it is the gate.

### Hooks

Hooks are Claude Code's pre/post-tool-use callbacks. This repo uses five:

| # | Event | Purpose |
|---|---|---|
| 1 | `UserPromptSubmit` | Inject a context preface naming the active world and any size warnings. |
| 2 | `PreToolUse:Read` | Block oversized reads of canonical-storage directories; redirect to MCP retrieval. |
| 3 | `PreToolUse:Edit\|Write` | Block direct mutation of `_source/*.yaml`; redirect to `submit_patch_plan`. |
| 4 | `SubagentStart` | Bootstrap subagents with retrieval discipline. |
| 5 | `PostToolUse:submit_patch_plan` | Auto-run structural validators on the just-written world; surface drift inline. |

Hook 3 is the load-bearing one. It is the difference between "skills are
asked nicely to use the patch engine" and "skills physically cannot bypass
the patch engine for canonical writes". Combined with the approval-token
discipline of §4, it means even an actively-misbehaving skill cannot land a
canonical write that the human did not approve.

The graceful-degrade posture matters too: if the hook binary is missing or
the index is stale, hooks pass through silently. Nothing breaks; the system
just falls back to prose-discipline enforcement. That is how this repo could
roll the machinery out incrementally without forking the world contents.

---

## 6. Putting it together

A typical mutation flow, end to end:

```text
1.  Skill runs.
2.  Skill calls allocate_next_id() and get_context_packet() via MCP.
3.  Skill drafts content from the packet's records.
4.  Skill assembles a patch plan envelope (typed ops only).
5.  Skill calls validate_patch_plan() — pure read; surfaces validator failures
    before the human ever sees a deliverable.
6.  Skill presents the deliverable to the human.
7.  Human approves.
8.  Skill writes the plan to /tmp, invokes the signer CLI, gets a token bound
    to those exact bytes.
9.  Skill calls submit_patch_plan(plan, token):
    a. Engine verifies envelope shape.
    b. Engine verifies token (HMAC + expiry + plan-hash binding + single-use).
    c. Engine runs pre-apply validators against the world index.
    d. Engine stages every op to temp files.
    e. Engine atomically renames each temp file over its target.
    f. Engine triggers world-index sync.
    g. Engine returns a PatchReceipt with files_written, new_nodes,
       id_allocations_consumed, and validators_run telemetry.
10. Hook 5 fires post-write, re-runs structural validators, surfaces drift if
    any landed.
11. Human reviews the diff and commits.
```

A typical read flow is much simpler:

```text
1. Skill calls get_context_packet() with a task type and seed nodes.
2. Skill reads selected nodes in full via get_record() / get_record_field().
3. Skill answers the question.
```

The shape of each flow is the answer to "why all four layers exist". The
markdown is for humans and durability. The index is for the LLM not to drown.
The MCP is so the LLM has typed tools instead of raw SQL. The engine is so
writes can be approved as bytes and validated before they land.

---

## 7. What to copy, what to skip, what to think about

**Copy without thinking** if your project has cross-file coupling, an audit
trail, or scale-beyond-context:

- One record per file in YAML for anything with an ID and a schema.
- Hybrid frontmatter+prose for artifacts with a meaningful body.
- A SQLite index with `nodes` / `edges` / FTS, derived from the files,
  gitignored, regenerable.
- A typed op vocabulary for mutations. No `update_record`, no
  `overwrite_record`. Append-only structural fields, mutable audit fields.
- The approval-token model: HMAC, single-use, expiry-bound, byte-bound to
  the exact plan.
- Two-phase commit: stage to temp files, fsync, rename. Forward-only on
  failure.
- One validator implementation per rule, called from engine + CLI + hook.

**Skip if you don't need it:**

- The hook layer if you aren't running this inside Claude Code (or another
  agent harness with comparable hooks). The discipline becomes prose
  discipline; the patch engine still enforces structural correctness.
- The full graph layer if your records don't have rich cross-references. A
  single `nodes` table with FTS may be enough.
- Multiple validator categories if the project only has structural rules.
  Skip the rule-derived suite and keep only the schema/uniqueness/reference
  validators.

**Think about before copying:**

- **What goes in markdown vs. YAML vs. hybrid.** This is the single decision
  that determines whether the rest of the architecture pays off. Get it
  wrong and you'll either have agents that can't query the data (too much
  prose) or humans that can't read it (too much YAML).
- **What the canonical IDs are.** ID format determines what `allocate_next_id`
  scans, how renames work, how cross-references survive. Pick a format that
  is human-typeable, sortable, and unambiguous from filename alone.
- **What "append-only" means in your domain.** In a worldbuilding project it
  means a canon fact's structural fields don't change without a retcon
  attestation. In a different project it might mean a contract clause never
  changes once signed, or a measurement never changes once recorded. The
  shape of that constraint is what determines your op vocabulary.
- **Who approves writes.** A solo human, a higher-tier agent, a CI policy.
  The token model works for any of them; the choice changes who runs the
  signer, not the engine.

---

## 8. Anti-patterns this architecture is designed to prevent

It's worth naming them, because they are the failure modes you are trading
the complexity of the pipeline for:

- **Silent retcons.** An agent edits an old record to "fix" it; downstream
  references that depended on the old wording silently rot. Prevented by
  append-only fields + retcon attestation + bidirectional-edge validators.
- **Phantom cross-references.** An agent writes "see CF-0042" when CF-0042
  doesn't exist or has been renamed. Prevented by the
  `cross_file_reference` validator running on every patch and via the CLI.
- **ID collisions.** Two skills or two retries allocate the same ID.
  Prevented by `allocate_next_id` over the indexed state plus engine-side
  collision detection at apply time.
- **Approval theatre.** The agent shows the human a plan, the human says
  "yes", the agent submits a slightly different plan. Prevented by the
  byte-bound approval token.
- **Eager retrieval.** The agent reads ten files to answer one question and
  exhausts the context window before doing real work. Prevented by
  `get_context_packet` and Hook 2 redirecting bulk-directory reads.
- **Index drift.** The DB and the disk disagree because someone edited a
  file outside the engine. Prevented at the canonical surfaces by Hook 3
  blocking direct edits; at hybrid surfaces by post-write `world-index
  sync` and the `index_stale` engine error code; recoverable in all cases
  by `world-index build`.
- **Orphaned writes after a partial failure.** Prevented by stage-then-
  rename, with git as the recovery surface (the temp files are easy to
  clean up; the committed subset is real and reviewable).

If your project will face any of those failure modes, the cost of building
this stack pays for itself the first time it catches one of them. If it
won't, the stack is overkill.

---

## 9. Where the design documents live in this repo (for reference)

- `docs/FOUNDATIONS.md` — the project-wide design contract this stack
  enforces.
- `docs/MACHINE-FACING-LAYER.md` — short operational overview.
- `docs/HARD-GATE-DISCIPLINE.md` — the human-approval flow in detail,
  including the signer CLI and the failure-mode catalog.
- `docs/CONTEXT-PACKET-CONTRACT.md` — the ranked-retrieval packet shape and
  index-then-follow-up retrieval pattern.
- `tools/world-index/README.md`, `tools/world-mcp/README.md`,
  `tools/patch-engine/README.md`, `tools/validators/README.md`,
  `tools/hooks/README.md` — per-package contracts. Read these in the order
  listed; each builds on the previous.

The order to read them in, if porting the architecture, is: foundations →
machine-facing-layer → world-index → world-mcp → patch-engine → validators →
hooks. That is also roughly the order to *build* the layers in. Everything
above the index depends on the index; everything above the engine depends on
the engine; the validator surface and the hook surface plug into the engine
last.
