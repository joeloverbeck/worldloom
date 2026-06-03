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
    world_slug: "inspector-payload-fixture",
    manual_story_slug: "first-story",
    title: "Inspector payload fixture",
    created_at: "2026-06-03T00:00:00Z",
    updated_at: "2026-06-03T00:00:00Z",
    source: { world_commit: null, notes: "" },
    story_contract: {
      premise: "Mara checks why each record shaped the prompt",
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
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "inspector-payload-"));
  const manualStoryRoot = path.join(
    tempRoot,
    "worlds",
    "inspector-payload-fixture",
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
  writeRecord(
    manualStoryRoot,
    "cast",
    fixtureCast("mchar-1", "Mara", {
      summary: "Mara is the viewpoint pressure holder.",
      importance: "central",
      tags: ["viewpoint"],
    }),
  );
  writeRecord(
    manualStoryRoot,
    "facts",
    fixtureFact("mfact-1", "Included fact", {
      importance: "high",
      tags: ["ledger"],
      summary: "The included fact's real proposition reaches the inspector.",
      refs: {
        characters: ["mchar-1"],
        locations: [],
        related_records: [],
      },
    }),
  );
  writeRecord(
    manualStoryRoot,
    "facts",
    fixtureFact("mfact-2", "Excluded fact", {
      prompt_visibility: "never_prompt",
      summary: "The excluded fact's real proposition stays out of markdown.",
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
    fixtureSecret("msecret-1", "Suppressed secret", {
      summary: "The suppressed secret's real state is still inspectable.",
      refs: {
        characters: ["mchar-1"],
        locations: [],
        related_records: [],
      },
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
    active_secrets_questions: [],
    pinned_records: ["mfact-1", "mfact-2", "msecret-1"],
    excluded_records: [],
    must_not_reveal: ["msecret-1"],
    current_handoff_summary: "",
    last_accepted_segment: null,
    last_reviewed_after_segment: null,
  };
  writeFileSync(
    path.join(manualStoryRoot, "current-context.yaml"),
    YAML.stringify(ctx),
  );
}

test("composePrompt enriches inspector ledger entries with real record identity", async () => {
  const { tempRoot, manualStoryRoot } = mkFixture();
  try {
    const input = {
      manualStoryRoot,
      repoRoot: tempRoot,
      moment_directive: "Let Mara decide what can be safely disclosed.",
      included_cast: [],
      included_records: [],
    };

    const first = await composePrompt(input);
    const second = await composePrompt(input);

    assert.equal(second.markdown, first.markdown);

    const includedFact = first.resolution.included.find(
      (entry) => entry.id === "mfact-1",
    );
    assert.deepEqual(includedFact, {
      id: "mfact-1",
      title: "Included fact",
      class: "facts",
      summary: "The included fact's real proposition reaches the inspector.",
      importance: "high",
      prompt_visibility: "include_when_relevant",
      involved_cast: ["mchar-1"],
      tags: ["ledger"],
      reason: "pinned",
      section: "§3",
    });

    const excludedFact = first.resolution.excluded.find(
      (entry) => entry.id === "mfact-2",
    );
    assert.deepEqual(excludedFact, {
      id: "mfact-2",
      title: "Excluded fact",
      class: "facts",
      summary: "The excluded fact's real proposition stays out of markdown.",
      importance: "medium",
      prompt_visibility: "never_prompt",
      involved_cast: ["mchar-1"],
      tags: [],
      reason: "never_prompt",
    });

    const suppressedSecret = first.resolution.suppressed.find(
      (entry) => entry.id === "msecret-1",
    );
    assert.deepEqual(suppressedSecret, {
      id: "msecret-1",
      title: "Suppressed secret",
      class: "secrets",
      summary: "The suppressed secret's real state is still inspectable.",
      importance: "medium",
      prompt_visibility: "include_when_relevant",
      involved_cast: ["mchar-1"],
      tags: [],
      reason: "must_not_reveal",
    });

    for (const entry of [
      includedFact,
      excludedFact,
      suppressedSecret,
    ]) {
      assert.notEqual(entry?.summary, `Reason: ${entry?.reason}`);
    }
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
