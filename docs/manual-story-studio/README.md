# docs/manual-story-studio/

**Purpose**: this directory houses Manual Studio-specific renderer-contract files. Manual Story Studio's renderer-contract surface lives here:

- `prose-craft-contract.md` — Manual Studio-specific prose craft contract (variant of `docs/prose-renderer-contract/prose-craft-contract.md`, with scene/page-specific references and diagnostic verdict language removed for Manual Studio's segment-cluster context).

Only `docs/prose-renderer-contract/content-policy.md` is reused **verbatim** (inlined byte-for-byte into Manual Studio's external prompts per archived SPEC-102 §11). The renderer-contract surface is `prose-craft-contract.md` alone; the stop rule and prompt structure are carried by the prompt section helpers under `tools/manual-story-studio/src/prompt/sections/`, not by a separate render-time-instruction doc.
