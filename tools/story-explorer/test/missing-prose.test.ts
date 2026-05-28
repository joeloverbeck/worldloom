import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import YAML from "yaml";

import { getPageDetail } from "../src/read/page-detail.js";

test("getPageDetail treats absent rendered prose as a first-class missing state", async () => {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "story-explorer-missing-prose-"));
  const storyRoot = path.join(repoRoot, "worlds", "fixture-world", "stories", "red-bunny");
  mkdirSync(path.join(repoRoot, ".git"));
  for (const subdir of ["pages", "events", "entities"]) {
    mkdirSync(path.join(storyRoot, "_source", subdir), { recursive: true });
  }
  mkdirSync(path.join(storyRoot, "pages-prose-plans"), { recursive: true });
  mkdirSync(path.join(storyRoot, "pages-prose-receipts"), { recursive: true });
  writeFileSync(
    path.join(storyRoot, "_source", "pages", "PG-1.yaml"),
    YAML.stringify({
      id: "PG-1",
      story_id: "STORY-1",
      branch_id: "BR-1",
      parent_page_id: null,
      branch_path: ["PG-1"],
      turn_index: 0,
      input: {
        choice_id: null,
        manual_action_text: null,
        resolved_event_id: "SE-1",
      },
      state_snapshot: {
        active_records: {
          STENT: ["STENT-1"],
        },
        continuation: {
          terminal_status: "open",
          terminal_rationale: null,
        },
      },
      prose_plan_path: "pages-prose-plans/PG-1.md",
      emitted_choices: [],
      validation_trace: {
        checks: [{ name: "fixture", verdict: "PASS", rationale: "Missing prose must not block PG reads." }],
      },
    }),
    "utf8"
  );
  writeFileSync(
    path.join(storyRoot, "_source", "events", "SE-1.yaml"),
    YAML.stringify({
      id: "SE-1",
      story_id: "STORY-1",
      parent_page_id: "PG-1",
      commitment: { selected_slt_id: null, selection_source: "fixture", alias_bindings: [] },
      outcome_route: "accept",
      state_delta: { create: ["STENT-1"], supersede: [], close: [] },
      record_introductions: [{ record_id: "STENT-1" }],
      state_relations: [],
    }),
    "utf8"
  );
  writeFileSync(
    path.join(storyRoot, "_source", "entities", "STENT-1.yaml"),
    YAML.stringify({ id: "STENT-1", story_id: "STORY-1", name: "Red Bunny" }),
    "utf8"
  );
  writeFileSync(path.join(storyRoot, "pages-prose-plans", "PG-1.md"), "Plan body\n", "utf8");

  const detail = await getPageDetail("fixture-world", "red-bunny", "PG-1", repoRoot);

  assert.equal(detail.proseStatus, "missing");
  assert.equal(detail.prose, null);
  assert.equal(detail.page.id, "PG-1");
  assert.equal(detail.pagePlanSummary?.body, "Plan body\n");
  assert.deepEqual(detail.currentStateRecordIds, ["STENT-1"]);
  assert.equal(detail.eventDelta.createCount, 1);
  assert.deepEqual(
    detail.rawSources.map((source) => source.recordId),
    ["PG-1", "STENT-1"]
  );
});

test("getPageDetail treats absent page plans as a first-class missing state", async () => {
  const repoRoot = mkdtempSync(path.join(os.tmpdir(), "story-explorer-missing-page-plan-"));
  const storyRoot = path.join(repoRoot, "worlds", "fixture-world", "stories", "red-bunny");
  mkdirSync(path.join(repoRoot, ".git"));
  for (const subdir of ["pages", "events", "entities"]) {
    mkdirSync(path.join(storyRoot, "_source", subdir), { recursive: true });
  }
  mkdirSync(path.join(storyRoot, "pages-prose"), { recursive: true });
  writeFileSync(
    path.join(storyRoot, "_source", "pages", "PG-1.yaml"),
    YAML.stringify({
      id: "PG-1",
      story_id: "STORY-1",
      branch_id: "BR-1",
      parent_page_id: null,
      branch_path: ["PG-1"],
      turn_index: 0,
      input: {
        choice_id: null,
        manual_action_text: null,
        resolved_event_id: "SE-1",
      },
      state_snapshot: {
        active_records: {
          STENT: ["STENT-1"],
        },
        continuation: {
          terminal_status: "open",
          terminal_rationale: null,
        },
      },
      emitted_choices: [],
      validation_trace: {
        checks: [{ name: "fixture", verdict: "PASS", rationale: "Planless PG reads must not require a page-plan artifact." }],
      },
    }),
    "utf8"
  );
  writeFileSync(
    path.join(storyRoot, "_source", "events", "SE-1.yaml"),
    YAML.stringify({
      id: "SE-1",
      story_id: "STORY-1",
      parent_page_id: "PG-1",
      commitment: { selected_slt_id: null, selection_source: "fixture", alias_bindings: [] },
      outcome_route: "accept",
      state_delta: { create: ["STENT-1"], supersede: [], close: [] },
      record_introductions: [{ record_id: "STENT-1" }],
      state_relations: [],
    }),
    "utf8"
  );
  writeFileSync(
    path.join(storyRoot, "_source", "entities", "STENT-1.yaml"),
    YAML.stringify({ id: "STENT-1", story_id: "STORY-1", name: "Red Bunny" }),
    "utf8"
  );
  writeFileSync(path.join(storyRoot, "pages-prose", "PG-1.md"), "Rendered prose\n", "utf8");

  const detail = await getPageDetail("fixture-world", "red-bunny", "PG-1", repoRoot);

  assert.equal(detail.proseStatus, "present");
  assert.equal(detail.prose, "Rendered prose\n");
  assert.equal(detail.pagePlanSummary, null);
  assert.equal(detail.page.id, "PG-1");
  assert.deepEqual(detail.currentStateRecordIds, ["STENT-1"]);
});
