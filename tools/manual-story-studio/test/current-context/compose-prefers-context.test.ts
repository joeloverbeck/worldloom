import assert from "node:assert/strict";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import YAML from "yaml";

import { composePrompt } from "../../src/prompt/compose.js";
import type { CurrentContext } from "../../src/schema/current-context.js";
import type {
  ManualRecord,
  ManualRecordClass,
  ManualStoryMetadata,
} from "../../src/schema/manual-story.js";
import {
  fixtureCast,
  fixtureFact,
  fixtureQuestion,
  fixtureSecret,
} from "../prompt/fixtures.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "../../../../..");

function baseMetadata(): ManualStoryMetadata {
  return {
    schema_version: "manual-story.v1",
    world_slug: "compose-context",
    manual_story_slug: "first-story",
    title: "Compose context fixture",
    created_at: "2026-06-02T00:00:00Z",
    updated_at: "2026-06-02T00:00:00Z",
    source: { world_commit: null, notes: "" },
    story_contract: {
      premise: "Mara and Iven choose what not to say",
      tone: "Quiet pressure",
      pov: "close third",
      tense: "past",
      content_intensity: "mature",
      explicitness: "implied unless central",
      language_register: "literary",
      prose_preferences: {
        psychic_distance: "close",
        dialogue_density: "moment_led",
        interiority: "free_indirect",
        paragraphing: "literary",
      },
    },
    cast_order: ["mchar-1", "mchar-2"],
    segment_order: [],
    prompt_policy: {
      save_prompts: true,
      require_moment_directive: true,
      default_beat_count: "2-5",
      include_recent_segments: 1,
      recent_template_advisory_window: 2,
    },
    manuscript: {
      compile_on_segment_save: false,
      include_segment_titles: true,
      allow_reorder: false,
    },
  };
}

function mkFixture(): { tempRoot: string; manualStoryRoot: string } {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "compose-context-"));
  const manualStoryRoot = path.join(
    tempRoot,
    "worlds",
    "compose-context",
    "manual-stories",
    "first-story",
  );
  mkdirSync(manualStoryRoot, { recursive: true });
  mkdirSync(path.join(tempRoot, "docs"), { recursive: true });
  cpSync(
    path.join(REPO_ROOT, "docs", "prose-renderer-contract"),
    path.join(tempRoot, "docs", "prose-renderer-contract"),
    { recursive: true },
  );
  cpSync(
    path.join(REPO_ROOT, "docs", "manual-story-studio"),
    path.join(tempRoot, "docs", "manual-story-studio"),
    { recursive: true },
  );
  writeFileSync(
    path.join(manualStoryRoot, "manual-story.yaml"),
    YAML.stringify(baseMetadata()),
  );
  writeRecord(manualStoryRoot, "cast", fixtureCast("mchar-1", "Mara"));
  writeRecord(manualStoryRoot, "cast", fixtureCast("mchar-2", "Iven"));
  writeRecord(
    manualStoryRoot,
    "facts",
    fixtureFact("mfact-1", "Riverhouse pressure", {
      importance: "high",
      summary: "The riverhouse debt is due tonight.",
      refs: {
        characters: ["mchar-1"],
        locations: [],
        related_records: [],
      },
    }),
  );
  writeRecord(
    manualStoryRoot,
    "secrets",
    fixtureSecret("msecret-1", "Debt secret", {
      summary: "Mara hid the letter.",
      held_by: ["mchar-2"],
    }),
  );
  writeRecord(
    manualStoryRoot,
    "questions",
    fixtureQuestion("mq-1", "Who sent the letter?", {
      summary: "The sender is still unknown.",
    }),
  );
  const segmentsDir = path.join(manualStoryRoot, "segments");
  mkdirSync(segmentsDir, { recursive: true });
  writeFileSync(
    path.join(segmentsDir, "SEG-1.md"),
    "Mara watched the cups cool.\n\nIven stopped just inside the kitchen door.\n",
  );
  return { tempRoot, manualStoryRoot };
}

function writeRecord(
  manualStoryRoot: string,
  cls: ManualRecordClass,
  record: ManualRecord,
): void {
  const dir = path.join(manualStoryRoot, "records", cls);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, `${record.id}.yaml`), YAML.stringify(record));
}

function writeCurrentContext(
  manualStoryRoot: string,
  overrides: Partial<CurrentContext> = {},
): void {
  const ctx: CurrentContext = {
    current_location: null,
    current_cast: ["mchar-2", "mchar-1"],
    pov_holder: "mchar-2",
    active_pressure_clocks: [],
    active_secrets_questions: ["msecret-1", "mq-1"],
    pinned_records: ["mfact-1"],
    must_not_reveal: ["msecret-1"],
    current_handoff_summary: "Mara waits in the kitchen while Iven chooses whether to lie.",
    last_accepted_segment: null,
    ...overrides,
  };
  writeFileSync(
    path.join(manualStoryRoot, "current-context.yaml"),
    YAML.stringify(ctx),
  );
}

function section(markdown: string, number: number): string {
  const start = markdown.indexOf(`## ${number}. `);
  assert.notEqual(start, -1, `missing section ${number}`);
  const next = markdown.indexOf(`\n\n## ${number + 1}. `, start);
  return next === -1 ? markdown.slice(start) : markdown.slice(start, next);
}

test("compose prefers current-context handoff, cast order, and reveal limits", async () => {
  const { tempRoot, manualStoryRoot } = mkFixture();
  try {
    writeCurrentContext(manualStoryRoot);

    const result = await composePrompt({
      manualStoryRoot,
      repoRoot: tempRoot,
      moment_directive: "Let the interruption land.",
      included_cast: ["mchar-1"],
      included_records: [],
    });

    const s3 = section(result.markdown, 3);
    assert.match(s3, /Author's current handoff/);
    assert.match(s3, /Mara waits in the kitchen while Iven chooses whether to lie\./);
    assert.doesNotMatch(s3, /In the moment/);
    assert.doesNotMatch(s3, /Pinned situation context/);
    assert.match(s3, /Most recent prose/);
    assert.match(s3, /Iven stopped just inside the kitchen door\./);

    const s7 = section(result.markdown, 7);
    assert.match(s7, /\*\*POV:\*\* Iven/);
    assert.ok(s7.indexOf("Iven") < s7.indexOf("Mara"));

    const s10 = section(result.markdown, 10);
    assert.match(s10, /Secret: Mara hid the letter\./);
    assert.match(s10, /Open question: Who sent the letter\?/);
    assert.match(s10, /Must not reveal/);
    assert.match(s10, /Debt secret/);

    assert.deepEqual(result.sidecar_draft.included_cast, ["mchar-2", "mchar-1"]);
    assert.deepEqual(result.sidecar_draft.included_records, [
      "mfact-1",
      "msecret-1",
      "mq-1",
    ]);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("compose without current-context preserves selected-input fallback", async () => {
  const { tempRoot, manualStoryRoot } = mkFixture();
  try {
    const result = await composePrompt({
      manualStoryRoot,
      repoRoot: tempRoot,
      moment_directive: "Let Mara wait.",
      included_cast: ["mchar-1"],
      included_records: ["mfact-1"],
    });

    const s3 = section(result.markdown, 3);
    assert.match(s3, /In the moment:\*\* Mara\./);
    assert.match(s3, /Pinned situation context/);
    assert.match(s3, /The riverhouse debt is due tonight\./);
    assert.doesNotMatch(s3, /Author's current handoff/);
    assert.deepEqual(result.sidecar_draft.included_cast, ["mchar-1"]);
    assert.deepEqual(result.sidecar_draft.included_records, ["mfact-1"]);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("compose with current-context remains byte deterministic", async () => {
  const { tempRoot, manualStoryRoot } = mkFixture();
  try {
    writeCurrentContext(manualStoryRoot);
    const input = {
      manualStoryRoot,
      repoRoot: tempRoot,
      moment_directive: "Let the interruption land.",
      included_cast: ["mchar-1"],
      included_records: [],
    };

    const first = await composePrompt(input);
    const second = await composePrompt(input);

    assert.equal(second.markdown, first.markdown);
    assert.deepEqual(second.sidecar_draft, first.sidecar_draft);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
