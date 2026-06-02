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
    world_slug: "ledger-fixture",
    manual_story_slug: "first-story",
    title: "Ledger fixture",
    created_at: "2026-06-02T00:00:00Z",
    updated_at: "2026-06-02T00:00:00Z",
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
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "ledger-fixture-"));
  const manualStoryRoot = path.join(
    tempRoot,
    "worlds",
    "ledger-fixture",
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
    fixtureFact("mfact-1", "Included fact", {
      importance: "high",
      summary: "The ledger-visible fact reaches the prompt.",
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
      importance: "high",
      summary: "The explicitly excluded fact must not reach the prompt.",
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
    fixtureFact("mfact-3", "Inactive fact", {
      active: false,
      importance: "high",
      summary: "The inactive fact must not reach the prompt.",
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
      summary: "This secret remains guarded.",
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
    active_secrets_questions: [],
    pinned_records: ["mfact-1", "mfact-2", "mfact-3"],
    excluded_records: ["mfact-2"],
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

test("composePrompt returns deterministic inclusion ledger buckets", async () => {
  const { tempRoot, manualStoryRoot } = mkFixture();
  try {
    const input = {
      manualStoryRoot,
      repoRoot: tempRoot,
      moment_directive: "Let Mara consider what to disclose.",
      included_cast: [],
      included_records: [],
    };

    const first = await composePrompt(input);
    const second = await composePrompt(input);

    assert.deepEqual(second.resolution, first.resolution);
    assert.equal(JSON.stringify(second.resolution), JSON.stringify(first.resolution));
    assert.deepEqual(first.resolution.section_map, {});

    assert.deepEqual(
      first.resolution.included.map((entry) => ({
        id: entry.id,
        class: entry.class,
        reason: entry.reason,
        section: entry.section,
      })),
      [
        { id: "mchar-1", class: "cast", reason: "current_cast", section: null },
        { id: "mfact-1", class: "facts", reason: "pinned", section: null },
      ],
    );

    assert.deepEqual(first.resolution.excluded, [
      {
        id: "mfact-2",
        title: "Excluded fact",
        class: "facts",
        reason: "working_set_excluded",
      },
      {
        id: "mfact-3",
        title: "Inactive fact",
        class: "facts",
        reason: "inactive",
      },
    ]);

    assert.deepEqual(first.resolution.suppressed, [
      {
        id: "msecret-1",
        title: "Suppressed secret",
        reason: "must_not_reveal",
      },
    ]);
    assert.deepEqual(first.resolution.blocked, []);

    assert.match(first.markdown, /The ledger-visible fact reaches the prompt\./);
    assert.doesNotMatch(first.markdown, /The explicitly excluded fact must not reach the prompt\./);
    assert.doesNotMatch(first.markdown, /The inactive fact must not reach the prompt\./);
    assert.equal(
      first.resolution.excluded.some((entry) => entry.id === "msecret-1"),
      false,
    );
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("composePrompt reports early-exit findings in resolution.blocked", async () => {
  const { tempRoot, manualStoryRoot } = mkFixture();
  try {
    const result = await composePrompt({
      manualStoryRoot,
      repoRoot: tempRoot,
      moment_directive: "   ",
      included_cast: [],
      included_records: [],
    });

    assert.equal(result.markdown, "");
    assert.deepEqual(result.resolution, {
      included: [],
      excluded: [],
      suppressed: [],
      blocked: [
        {
          ref: "moment_directive_present",
          reason: "The moment directive must be non-empty.",
        },
      ],
      section_map: {},
    });
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("composePrompt groups unresolved seeded records in resolution.blocked", async () => {
  const { tempRoot, manualStoryRoot } = mkFixture();
  try {
    const result = await composePrompt({
      manualStoryRoot,
      repoRoot: tempRoot,
      moment_directive: "Let Mara consider what to disclose.",
      included_cast: [],
      included_records: ["mfact-99"],
    });

    assert.ok(
      result.resolution.blocked.some(
        (entry) =>
          entry.ref === "selected_records_exist" &&
          entry.reason.includes("Selected record mfact-99 could not be read"),
      ),
    );
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
