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
  fixtureSecret,
} from "./fixtures.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "../../../../..");

function baseMetadata(): ManualStoryMetadata {
  return {
    schema_version: "manual-story.v1",
    world_slug: "never-prompt-fixture",
    manual_story_slug: "first-story",
    title: "Never prompt fixture",
    created_at: "2026-06-03T00:00:00Z",
    updated_at: "2026-06-03T00:00:00Z",
    source: { world_commit: null, notes: "" },
    story_contract: {
      premise: "Mara decides what the prompt may see",
      tone: "Measured",
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
    cast_order: ["mchar-1"],
    segment_order: [],
    prompt_policy: {
      save_prompts: true,
      require_moment_directive: true,
      default_beat_count: "2-5",
      include_recent_segments: 0,
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
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "never-prompt-fixture-"));
  const manualStoryRoot = path.join(
    tempRoot,
    "worlds",
    "never-prompt-fixture",
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
  writeRecord(
    manualStoryRoot,
    "facts",
    fixtureFact("mfact-1", "Pinned author answer", {
      prompt_visibility: "never_prompt",
      importance: "high",
      summary: "The author-only answer must never reach the prompt.",
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
    fixtureSecret("msecret-1", "Never title", {
      prompt_visibility: "never_prompt",
      summary: "This never-prompt secret must not be named.",
      held_by: ["mchar-1"],
    }),
  );
  writeRecord(
    manualStoryRoot,
    "secrets",
    fixtureSecret("msecret-2", "Visible suppressed title", {
      summary: "This ordinary must-not-reveal record may be named.",
      held_by: ["mchar-1"],
    }),
  );
  writeCurrentContext(manualStoryRoot);
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

function writeCurrentContext(manualStoryRoot: string): void {
  const ctx: CurrentContext = {
    current_location: null,
    current_cast: ["mchar-1"],
    pov_holder: "mchar-1",
    active_pressure_clocks: [],
    active_secrets_questions: ["msecret-1"],
    pinned_records: ["mfact-1", "msecret-1", "msecret-2"],
    excluded_records: [],
    must_not_reveal: ["msecret-1", "msecret-2"],
    current_handoff_summary: "",
    last_accepted_segment: null,
  };
  writeFileSync(
    path.join(manualStoryRoot, "current-context.yaml"),
    YAML.stringify(ctx),
  );
}

test("composePrompt keeps never_prompt records out of markdown and the reveal block", async () => {
  const { tempRoot, manualStoryRoot } = mkFixture();
  try {
    const result = await composePrompt({
      manualStoryRoot,
      repoRoot: tempRoot,
      moment_directive: "Let Mara decide what can be said.",
      included_cast: [],
      included_records: ["mfact-1", "msecret-1"],
    });

    assert.doesNotMatch(result.markdown, /Pinned author answer/);
    assert.doesNotMatch(result.markdown, /author-only answer/);
    assert.doesNotMatch(result.markdown, /Never title/);
    assert.doesNotMatch(result.markdown, /never-prompt secret/);
    assert.match(result.markdown, /Visible suppressed title/);
    assert.match(result.markdown, /This ordinary must-not-reveal record may be named\./);

    assert.deepEqual(
      result.resolution.excluded.filter((entry) => entry.reason === "never_prompt"),
      [
        {
          id: "mfact-1",
          title: "Pinned author answer",
          class: "facts",
          summary: "The author-only answer must never reach the prompt.",
          importance: "high",
          prompt_visibility: "never_prompt",
          involved_cast: ["mchar-1"],
          tags: [],
          reason: "never_prompt",
        },
        {
          id: "msecret-1",
          title: "Never title",
          class: "secrets",
          summary: "This never-prompt secret must not be named.",
          importance: "medium",
          prompt_visibility: "never_prompt",
          involved_cast: [],
          tags: [],
          reason: "never_prompt",
        },
      ],
    );
    assert.deepEqual(result.resolution.suppressed, [
      {
        id: "msecret-2",
        title: "Visible suppressed title",
        class: "secrets",
        summary: "This ordinary must-not-reveal record may be named.",
        importance: "medium",
        prompt_visibility: "include_when_relevant",
        involved_cast: [],
        tags: [],
        reason: "must_not_reveal",
      },
    ]);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
