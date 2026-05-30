import assert from "node:assert/strict";
import test from "node:test";

import { PROTECTED_SURFACES } from "../../src/context-packet/governing-world-context.js";
import { getContextPacket } from "../../src/tools/get-context-packet.js";

import { createTempRepoRoot, destroyTempRepoRoot, withRepoRoot } from "../tools/_shared.js";
import {
  buildStoryBundleWorld,
  STORY_FIXTURE_SLUG,
  STORY_FIXTURE_WORLD
} from "../tools/story-bundle-fixture.js";

const RETIRED_ROOT_MARKDOWN_FILES = [
  "INVARIANTS.md",
  "TIMELINE.md",
  "GEOGRAPHY.md",
  "PEOPLES_AND_SPECIES.md",
  "INSTITUTIONS.md",
  "ECONOMY_AND_RESOURCES.md",
  "MAGIC_OR_TECH_SYSTEMS.md",
  "EVERYDAY_LIFE.md",
  "CANON_LEDGER.md",
  "OPEN_QUESTIONS.md",
  "MYSTERY_RESERVE.md"
] as const;

const EXPECTED_LIVE_ROOT_FILES = ["WORLD_KERNEL.md", "ONTOLOGY.md"] as const;

const EXPECTED_AUTHORED_PRIMARY_DIRECTORIES = [
  "adjudications/",
  "characters/",
  "diegetic-artifacts/",
  "proposals/",
  "audits/"
] as const;

test("PROTECTED_SURFACES contains the two live root-markdown files on machine-layer-enabled worlds", () => {
  const surfaces = new Set<string>(PROTECTED_SURFACES);
  for (const liveFile of EXPECTED_LIVE_ROOT_FILES) {
    assert.equal(
      surfaces.has(liveFile),
      true,
      `PROTECTED_SURFACES is missing required root-markdown file: ${liveFile}`
    );
  }
});

test("PROTECTED_SURFACES contains the four authored-primary directories", () => {
  const surfaces = new Set<string>(PROTECTED_SURFACES);
  for (const directory of EXPECTED_AUTHORED_PRIMARY_DIRECTORIES) {
    assert.equal(
      surfaces.has(directory),
      true,
      `PROTECTED_SURFACES is missing authored-primary directory: ${directory}`
    );
  }
});

test("PROTECTED_SURFACES contains no SPEC-13 retired root-markdown filenames", () => {
  const surfaces = new Set<string>(PROTECTED_SURFACES);
  for (const retired of RETIRED_ROOT_MARKDOWN_FILES) {
    assert.equal(
      surfaces.has(retired),
      false,
      `PROTECTED_SURFACES still lists retired root-markdown file: ${retired} ` +
        "(per FOUNDATIONS §Canonical Storage Layer the file does not exist on machine-layer-enabled worlds)"
    );
  }
});

test("get_context_packet protected_surfaces publishes only present-truth surfaces", async () => {
  const root = createTempRepoRoot();

  try {
    buildStoryBundleWorld(root);

    const result = await withRepoRoot(root, () =>
      getContextPacket({
        task_type: "story_turn_cycle",
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        seed_nodes: ["entity:marla-kern"],
        token_budget: 100000
      })
    );

    assert.ok(
      !("code" in result),
      `expected packet response, got ${"code" in result ? result.code : "n/a"}`
    );

    const published = new Set<string>(result.governing_world_context.protected_surfaces);
    for (const retired of RETIRED_ROOT_MARKDOWN_FILES) {
      assert.equal(
        published.has(retired),
        false,
        `governing_world_context.protected_surfaces still publishes retired file: ${retired}`
      );
    }
    for (const liveFile of EXPECTED_LIVE_ROOT_FILES) {
      assert.equal(
        published.has(liveFile),
        true,
        `governing_world_context.protected_surfaces is missing live root-markdown file: ${liveFile}`
      );
    }
    for (const directory of EXPECTED_AUTHORED_PRIMARY_DIRECTORIES) {
      assert.equal(
        published.has(directory),
        true,
        `governing_world_context.protected_surfaces is missing authored-primary directory: ${directory}`
      );
    }
  } finally {
    destroyTempRepoRoot(root);
  }
});
