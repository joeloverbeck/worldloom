# HARD-GATE Discipline

Every canon-mutating or content-generating skill in `.claude/skills/` begins with a `<HARD-GATE>` block. These gates are **absolute under Auto Mode**. Invoking a skill is not approval of its deliverable.

## Execution pattern

1. **Pre-flight check** — verify prerequisites, allocate IDs, load required world state (current Kernel + Invariants + relevant CF records + affected domain files + open contradictions + mystery reserve entries).
2. **Analysis phases** — numbered; each named in the skill.
3. **Validation / Rejection tests** — numbered; each must record PASS with a one-line rationale. A bare "PASS" is treated as FAIL per the skill's own contract.
4. **Present deliverable summary** — to the user, in the conversation, before any write.
5. **Wait for explicit user approval** — before any `Write` or `Edit` to `worlds/<slug>/`.
6. **Write via the patch engine** — HARD-GATE user approval produces an `approval_token` (signed via `tools/world-mcp/dist/src/cli/sign-approval-token.js`); the skill assembles a patch plan and submits via `mcp__worldloom__submit_patch_plan(plan, approval_token)`. The engine enforces write order internally (see §Why write order matters). Skills no longer sequence `Edit`/`Write` calls by hand for `_source/` records or hybrid artifacts (characters, diegetic artifacts, adjudications). `WORLD_KERNEL.md` and `ONTOLOGY.md` remain primary-authored at the world root and may be written directly (Hook 3 carve-out per SPEC-05 Part B); `proposals/`, `audits/`, and the per-INDEX.md files of hybrid sub-directories likewise stay direct-`Edit` (Hook 3 hybrid-file allowlist).
7. **Never `git commit` from inside a skill** — writes land in the working tree; the user reviews the diff and commits.

## Approval token discipline

On machine-layer-enabled worlds, HARD-GATE approval is tied to an `approval_token` bound to the exact patch plan the user approved.

- Single-use: once consumed, the token cannot authorize a second write.
- Expiry-bound: tokens expire and must be reissued after the approval window lapses (default 20 minutes).
- Plan-bound: if the patch plan changes after approval, the old token is invalid and the skill must re-present the updated plan.

This keeps "user approved the plan" and "engine wrote the plan" as the same event rather than two loosely related steps.

### Issuing a token: `sign-approval-token` CLI

The `tools/world-mcp/` package exposes a CLI that signs HMAC-bound approval tokens for patch-plan envelopes. It is the canonical issuance path for skills.

**Invocation**:

```bash
# Default 20-minute window
node tools/world-mcp/dist/src/cli/sign-approval-token.js <plan-path>

# Custom expiry (e.g., 30 minutes for unusually large envelopes)
node tools/world-mcp/dist/src/cli/sign-approval-token.js <plan-path> --expiry-minutes 30

# Equivalently, via env var
WORLD_MCP_TOKEN_EXPIRY_MIN=30 node tools/world-mcp/dist/src/cli/sign-approval-token.js <plan-path>
```

**Inputs**:

- `<plan-path>` — JSON file containing the patch-plan envelope (`{plan_id, target_world, patches[], ...}`). Skills typically write this to `/tmp/<plan-id>.json` after Phase 14a validation passes. The envelope's `approval_token` field can be a placeholder (the real token is computed independently and passed alongside via `mcp__worldloom__submit_patch_plan(plan, approval_token)`).

**Output**: a base64-encoded token printed to stdout (single line, trailing newline). Capture into a shell variable or pass directly to the submit call.

**Defaults and rationale**:

- `--expiry-minutes` defaults to **20**. The dominant cost in submit round-trips is the engine receiving the JSON envelope (often 50KB+ for full canon-addition plans), parsing it, running pre-apply validators against the world index, and staging writes — round-trips of 5–10 minutes are routine for non-trivial submissions. A 5-minute window is too tight; a 20-minute window covers the realistic envelope sizes without unduly extending the window during which an approved-but-unsubmitted token sits live.
- The token's `expires_at` is verified server-side at submit time. There is no upper cap in the engine; longer windows are accepted but not encouraged.

**Skill-side flow**:

1. Skill assembles the patch plan envelope after Phase 14a validation.
2. Skill writes the envelope to a temporary JSON file (e.g., `/tmp/<plan-id>.json`).
3. Skill presents the deliverable summary to the user (HARD-GATE).
4. On user approval, skill invokes `sign-approval-token` to obtain the token.
5. Skill calls `mcp__worldloom__submit_patch_plan(plan, approval_token)` with the same envelope object and the issued token.

**Failure modes**:

- `Error: <plan-path> is required` — missing positional arg.
- `Plan must include a non-empty 'plan_id' string` (etc.) — malformed envelope.
- Token returned but submit returns `approval_expired` — round-trip exceeded the window. Re-sign (the plan is unchanged, hashes match, no other edits required) and resubmit.
- Token returned but submit returns `approval_replayed` — token already consumed by a prior successful submit. This is structural single-use enforcement; do not attempt to re-submit the same plan.

The HMAC secret lives at `tools/world-mcp/.secret` (gitignored, generated on first signer invocation if absent).

## Why write order matters (engine-enforced)

Post-SPEC-13, canonical storage is atomic YAML under `_source/`; there is no monolithic `CANON_LEDGER.md` to "announce" success last. Write order is now an engine concern, not a skill concern. The patch engine reorders every submitted plan into three tiers before staging (`tools/patch-engine/src/commit/order.ts`):

1. **Tier 1 — create-all**: `create_cf_record`, `create_ch_record`, `create_inv_record`, `create_m_record`, `create_oq_record`, `create_ent_record`, `create_sec_record`. New atomic records land first so subsequent ops can reference their IDs.
2. **Tier 2 — update-all**: `update_record_field`, `append_extension`, `append_touched_by_cf`, `append_modification_history_entry`. In-place mutations on existing records (including the freshly-created ones from Tier 1) and bidirectional `touched_by_cf[]` pointers settle next.
3. **Tier 3 — adjudication / hybrid-file appends**: `append_adjudication_record`, `append_character_record`, `append_diegetic_artifact_record`. The PA / character / diegetic-artifact hybrid files commit last, after every record they cite is on disk.

The engine applies the reordered plan via two-phase commit: every op stages to a temp file (`tools/patch-engine/src/commit/temp-file.ts`), and only after every stage succeeds does the engine atomically rename them into place (`tools/patch-engine/src/commit/rename.ts`). If any stage fails the temp files are unlinked; if any rename fails staged temps are unlinked. **Intermediate states never hit disk**, so partial-apply is structurally impossible — there is nothing for skills to "checkpoint" mid-write. The phase-15a inter-step structural-integrity grep checkpoints that lived in earlier `canon-addition` reference material are deleted; the engine's atomicity is their replacement.

A per-world write lock (`tools/patch-engine/src/commit/lock.ts`) serializes concurrent plans against the same world, so the 3-tier ordering applies cleanly within each plan and plans never interleave on the same world.

When a skill submits a plan, it does **not** order ops by hand. Ordering inside the submitted `patches[]` array is irrelevant — the engine reorders deterministically. Skills are free to assemble ops in whatever order their reasoning produces.

## Auto Mode does not relax gates

Auto Mode changes turn-taking cadence and approval batching. It never removes the gate at step 5. If you find yourself thinking "this one is simple enough to skip the gate," you are about to make a mistake.
