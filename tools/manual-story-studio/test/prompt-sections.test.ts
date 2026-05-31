import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Import side-effect translators so the registry is populated.
import "../src/prompt/translators/artifacts.js";
import "../src/prompt/translators/beliefs.js";
import "../src/prompt/translators/cast.js";
import "../src/prompt/translators/clocks.js";
import "../src/prompt/translators/consequences.js";
import "../src/prompt/translators/emotions.js";
import "../src/prompt/translators/entities.js";
import "../src/prompt/translators/facts.js";
import "../src/prompt/translators/intentions.js";
import "../src/prompt/translators/locations.js";
import "../src/prompt/translators/objects.js";
import "../src/prompt/translators/obligations.js";
import "../src/prompt/translators/plans.js";
import "../src/prompt/translators/questions.js";
import "../src/prompt/translators/relationships.js";
import "../src/prompt/translators/secrets.js";
import "../src/prompt/translators/statuses.js";
import "../src/prompt/translators/threads.js";

import {
  assembleSections,
  SECTION_DESCRIPTORS,
} from "../src/prompt/sections/index.js";
import type { ManualStoryMetadata } from "../src/schema/manual-story.js";
import type { SectionEmitterInput } from "../src/prompt/types.js";
import {
  fixtureCast,
  fixtureCtx,
  fixtureSecret,
} from "./prompt/fixtures.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
// Repo root is four levels up from dist/test/ (running compiled output):
// dist/test/ -> dist/ -> manual-story-studio/ -> tools/ -> repo
const REPO_ROOT = path.resolve(HERE, "../../../..");
const CONTENT_POLICY_PATH = path.join(
  REPO_ROOT,
  "docs/prose-renderer-contract/content-policy.md",
);
const PROSE_CRAFT_PATH = path.join(
  REPO_ROOT,
  "docs/manual-story-studio/prose-craft-contract.md",
);

function baseMetadata(
  overrides: Partial<ManualStoryMetadata> = {},
): ManualStoryMetadata {
  return {
    schema_version: "manual-story.v1",
    world_slug: "test-world",
    manual_story_slug: "test-story",
    title: "A Test Manual Story",
    created_at: "2026-05-30T12:00:00Z",
    updated_at: "2026-05-30T12:00:00Z",
    source: { world_commit: null, notes: "" },
    story_contract: {
      premise: "Two characters meet in a workshop",
      tone: "Patient, dread-edged",
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
      include_recent_segments: 0,
    },
    manuscript: {
      compile_on_segment_save: false,
      include_segment_titles: true,
      allow_reorder: false,
    },
    ...overrides,
  };
}

function baseInput(
  overrides: Partial<SectionEmitterInput> = {},
): SectionEmitterInput {
  return {
    metadata: baseMetadata(),
    cast: [
      fixtureCast("mchar-1", "Jon"),
      fixtureCast("mchar-2", "Ane"),
    ],
    records: [],
    included_cast_ids: ["mchar-1", "mchar-2"],
    moment_directive: "Jon asks Ane to stay.",
    included_template_body: null,
    recent_segment_last_paragraph: null,
    content_policy_body: readFileSync(CONTENT_POLICY_PATH, "utf8"),
    prose_craft_contract_body: readFileSync(PROSE_CRAFT_PATH, "utf8"),
    ...overrides,
  };
}

test("assembleSections emits 15 headings in strict order 1..15", () => {
  const ctx = fixtureCtx({ "mchar-1": "Jon", "mchar-2": "Ane" });
  const markdown = assembleSections(baseInput(), ctx);
  const headings = [...markdown.matchAll(/^## (\d+)\. /gm)].map((m) =>
    Number(m[1]),
  );
  assert.deepStrictEqual(headings, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
  assert.equal(SECTION_DESCRIPTORS.length, 15);
});

test("§1 body equals content-policy.md byte-for-byte", () => {
  const ctx = fixtureCtx({});
  const markdown = assembleSections(baseInput(), ctx);
  const contentPolicy = readFileSync(CONTENT_POLICY_PATH, "utf8").trim();
  assert.ok(
    markdown.includes(contentPolicy),
    "assembled markdown does not include the verbatim content-policy body",
  );
});

test("§13 body equals prose-craft-contract.md byte-for-byte", () => {
  const ctx = fixtureCtx({});
  const markdown = assembleSections(baseInput(), ctx);
  const proseCraft = readFileSync(PROSE_CRAFT_PATH, "utf8").trim();
  assert.ok(
    markdown.includes(proseCraft),
    "assembled markdown does not include the verbatim prose-craft-contract body",
  );
});

test("§6 emits '(none selected)' when no template body provided", () => {
  const ctx = fixtureCtx({});
  const markdown = assembleSections(baseInput(), ctx);
  const section6 = sectionBody(markdown, 6);
  assert.equal(section6.trim(), "(none selected)");
});

test("§6 emits template body when provided", () => {
  const ctx = fixtureCtx({});
  const markdown = assembleSections(
    baseInput({ included_template_body: "Use the wait-and-respond beat." }),
    ctx,
  );
  const section6 = sectionBody(markdown, 6);
  assert.ok(section6.includes("Use the wait-and-respond beat."));
});

test("§5 parameterizes by default_beat_count", () => {
  const ctx = fixtureCtx({});
  const md1 = assembleSections(baseInput(), ctx);
  assert.ok(sectionBody(md1, 5).includes("Render only the next 2-5 beats"));

  const md2 = assembleSections(
    baseInput({
      metadata: baseMetadata({
        prompt_policy: {
          save_prompts: true,
          require_moment_directive: true,
          default_beat_count: "3",
          include_recent_segments: 0,
        },
      }),
    }),
    ctx,
  );
  assert.ok(sectionBody(md2, 5).includes("Render only the next 3 beats"));
});

test("§15 contains the narrative-structure language ban", () => {
  const ctx = fixtureCtx({});
  const markdown = assembleSections(baseInput(), ctx);
  const s15 = sectionBody(markdown, 15);
  assert.ok(s15.includes("'page'"));
  assert.ok(s15.includes("'scene'"));
  assert.ok(s15.includes("'act'"));
  assert.ok(s15.includes("'arc'"));
  assert.ok(s15.includes("'midpoint'"));
  assert.ok(s15.includes("'climax'"));
});

test("§12 collects forbidden-reveal tags from secrets + cast constraints", () => {
  const ctx = fixtureCtx({ "mchar-1": "Jon" });
  const cast = fixtureCast("mchar-1", "Jon", {
    prose_constraints: {
      prose_must_not_imply: ["he is over the fire"],
      forbidden_inventions: ["a brother named Tomas"],
      voice_do_not_do: ["sarcasm"],
    },
  });
  const secret = fixtureSecret("msecret-1", "the meeting", {
    held_by: ["mchar-1"],
    audience_visibility: "hidden",
    forbidden_reveal_tags: ["the meeting at the granary"],
  });
  const markdown = assembleSections(
    baseInput({
      cast: [cast],
      included_cast_ids: ["mchar-1"],
      records: [secret],
    }),
    ctx,
  );
  const s12 = sectionBody(markdown, 12);
  assert.ok(s12.includes("Do not let the prose imply: he is over the fire"));
  assert.ok(s12.includes("Do not invent: a brother named Tomas"));
  assert.ok(s12.includes("Jon's voice — do not do: sarcasm"));
  assert.ok(s12.includes("Do not let the prose reveal: the meeting at the granary"));
});

function sectionBody(markdown: string, n: number): string {
  // Split on `## N. ` headings to recover per-section bodies. We keep the
  // delimiter in the split via lookahead so each chunk after [0] is one
  // section. Chunk [n] (1-indexed) is the section we want.
  const chunks = markdown.split(/(?=^## \d+\. )/m);
  for (const chunk of chunks) {
    const m = /^## (\d+)\. ([^\n]+)\n+([\s\S]*)$/.exec(chunk);
    if (m && Number(m[1]) === n) {
      return m[3] ?? "";
    }
  }
  return "";
}
