# docs/manual-story-studio/

**Purpose**: this directory houses Manual Studio-specific renderer-contract files. SPEC-102 lands two files here:

- `prose-craft-contract.md` — Manual Studio-specific prose craft contract (variant of `docs/prose-renderer-contract/prose-craft-contract.md`, with scene/page-specific references and diagnostic verdict language removed for Manual Studio's segment-cluster context).
- `manual-render-instruction.md` — Manual Studio-specific render-time instruction (the existing `docs/prose-renderer-contract/render-time-instruction.md` is scene-range / PG-record specific and cannot be cleanly reused for Manual Studio).

Only `docs/prose-renderer-contract/content-policy.md` is reused **verbatim** (inlined byte-for-byte into Manual Studio's external prompts per SPEC-102 §11). No content files yet — SPEC-102 ships the two Manual Studio variants.
