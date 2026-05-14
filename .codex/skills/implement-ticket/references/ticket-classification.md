# Ticket Classification

Use one primary classification during intake.

## docs-only / contract-truthing

Use when the ticket mainly corrects specs, docs, ticket text, references, or workflow wording.

Check:

- exact path and section references
- whether ticket prose names a section label but the live document places the owned paragraph before that heading, under a different heading, or in opening prose; if so, patch the ticket to the live section or paragraph boundary before source edits or during closeout
- whether the claimed contract already matches live behavior
- whether acceptance criteria should be grep/manual-review based rather than runtime/tool based
- if acceptance relies on positive grep-count proof commands, dry-run or manually validate the exact command shape before source edits; confirm the command can count every intended term, not only the easiest literal subset
- if acceptance relies on negative grep removal, run the exact grep before edits and record all hit locations as owned hits or explicitly excluded hits

## skill rewrite or skill-local behavior

Use when the ticket changes `.claude/skills/<slug>/`.

Check:

- trigger description and arguments
- required reads and world-state prerequisites
- HARD-GATE semantics, if present
- references/templates/examples used by the skill
- sibling-skill interop named in docs or specs
- if acceptance relies on positive grep-count proof commands over the skill or templates, dry-run or manually validate the exact command shape before source edits; patch stale counts, alternation, anchoring, or aggregation before implementation
- if acceptance relies on negative grep or stale-anchor removal, run the exact drafted grep before edits and classify hits as stale, legitimate, excluded sibling-scope, or too-broad proof; if the pattern mixes stale anchors with legitimate hits, patch the acceptance/proof surface before source edits per `references/verification-closeout.md`

## tool or script implementation

Use when the ticket changes `tools/` code, hook scripts, validators, or supporting scripts.

Check:

- exact package/script path ownership
- command names and CLI examples
- config/schema fallout
- whether verification should include a real command run

### Mixed package plus engine-routed world repair

Use this sub-route when a package/tool ticket also includes a live `_source` repair that becomes possible only after the package change lands, such as a patch-engine operation enhancement followed by a one-record maintenance repair.

Keep the primary classification as `tool or script implementation`, then also apply the world-content safeguards for the repair phase:

- read `docs/HARD-GATE-DISCIPLINE.md` before preparing or submitting the live repair plan
- load `references/patch-engine-codex-fallback.md` if `mcp__worldloom__submit_patch_plan` is unavailable or the run uses the world-mcp CLI path
- keep source edits and repair-plan submission sequential: prove/build the package change first, then validate and submit the live repair through the engine
- present the validated repair plan and wait for explicit user approval before signing/submitting
- classify the repair as `semantic canon mutation` or `schema or maintenance migration` in `Assumption Reassessment` / closeout
- verify the engine receipt, direct on-disk `_source` record state, and any synced `_index/` artifact directly because `worlds/<slug>/` content may be gitignored
- keep tracked package/source/test edits separate from ignored/private world-content changes in the dirty-worktree ledger

## cross-skill or cross-artifact contract

Use when a ticket changes a shared template, schema, doc contract, or handoff between tools and skills.

Check:

- producers
- consumers
- doc references
- whether the change is additive-only or breaking
- if acceptance relies on positive grep-count proof commands across the shared surface, dry-run or manually validate the exact command shape before source edits; confirm the count proves the intended producer/consumer invariant rather than a coincidental subset
- if acceptance relies on negative grep or stale-anchor removal across consumers, run the exact drafted grep before edits and classify hits as stale, legitimate, excluded sibling-scope, or too-broad proof; if the pattern mixes stale anchors with legitimate hits, patch the acceptance/proof surface before source edits per `references/verification-closeout.md`

Map each invariant to its own verification layer in the ticket.

## schema or template extension

Use when a ticket changes:

- Canon Fact Record shape
- Change Log Entry shape
- proposal card shape
- character dossier shape
- diegetic artifact shape
- ticket/spec template fields

Check whether downstream consumers need updates or whether the change is truly additive-only.

If acceptance relies on positive grep-count proof commands for schema/template fields, dry-run or manually validate the exact command shape before source edits. Pay special attention to grouped alternations with suffixes or anchors; a colon, word boundary, or line anchor outside the intended group can make the command count only part of the claimed field set.

## canon-mutating world-content cleanup

Use when the ticket mutates live world canon through the patch engine without changing the engine, validator, or schema implementation. Examples include retcon cleanup, `_source/*.yaml` record reconciliation, canon-history repair, or schema-maintenance migration of world records using existing patch-engine operations.

Check:

- `docs/HARD-GATE-DISCIPLINE.md` has been read before plan preparation or submit
- the exact `_source` records and ignored derived artifacts owned by the ticket
- whether `mcp__worldloom__submit_patch_plan` is exposed; if not, load `references/patch-engine-codex-fallback.md`
- whether `_index/world.db`, `world-index sync`, or `world-index verify` is part of proof; if so, load `references/world-index.md`
- the semantic basis for any retcon, merge, deletion, or field reconciliation is explicit and not mechanically guessed
- final proof reads the changed world files or derived artifact directly, because `worlds/<slug>/` content may be gitignored

## archive / rejection / no-op validation

Use when reassessment shows the work already landed, the premise is false, or the ticket should be archived without new implementation.

Check:

- whether the ticket's claimed gap still exists
- whether closeout should be `COMPLETED`, `REJECTED`, `DEFERRED`, or `NOT IMPLEMENTED`
- whether archival was explicitly requested
