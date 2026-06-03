import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import YAML from "yaml";

import { computeHealth } from "../../src/health/compute.js";
import type { PromptWorkingSet } from "../../src/schema/prompt-working-set.js";
import { makeDefaultManualStoryMetadata } from "../../src/write/manual-story-metadata.js";
import {
  resolveManualStoryRoot,
  safeWriteFile,
  type ManualStoryRoot,
} from "../../src/write/sandbox.js";

function mkWorld(): { repoRoot: string; root: ManualStoryRoot } {
  const repoRoot = mkdtempSync(
    path.join(os.tmpdir(), "manual-studio-prompt-working-set-health-"),
  );
  writeComposeDocs(repoRoot);
  const root = resolveManualStoryRoot(repoRoot, "test-world", "test-story");
  mkdirSync(root.absolutePath, { recursive: true });
  const metadata = makeDefaultManualStoryMetadata(
    root.worldSlug,
    root.manualStorySlug,
    "T",
    "2026-06-02T00:00:00.000Z",
  );
  safeWriteFile(root, "manual-story.yaml", YAML.stringify(metadata));
  writeRecordFixtures(root);
  return { repoRoot, root };
}

function writeComposeDocs(repoRoot: string): void {
  const contentPolicyPath = path.join(
    repoRoot,
    "docs/prose-renderer-contract/content-policy.md",
  );
  const proseCraftPath = path.join(
    repoRoot,
    "docs/manual-story-studio/prose-craft-contract.md",
  );
  mkdirSync(path.dirname(contentPolicyPath), { recursive: true });
  mkdirSync(path.dirname(proseCraftPath), { recursive: true });
  writeFileSync(contentPolicyPath, "Content policy\n");
  writeFileSync(proseCraftPath, "Prose craft contract\n");
}

function writeRecordFixtures(root: ManualStoryRoot): void {
  const fixtures: Array<[relativePath: string, record: Record<string, unknown>]> = [
    ["records/locations/mloc-1.yaml", commonFields("mloc-1")],
    ["records/cast/mchar-1.yaml", castProfile("mchar-1")],
    [
      "records/clocks/mclock-1.yaml",
      {
        ...commonFields("mclock-1"),
        axis: "trust",
        value: 3,
        direction: "rising",
      },
    ],
    [
      "records/secrets/msecret-1.yaml",
      {
        ...commonFields("msecret-1"),
        held_by: ["mchar-1"],
        audience_visibility: "hidden",
        forbidden_reveal_tags: [],
      },
    ],
    [
      "records/questions/mq-1.yaml",
      {
        ...commonFields("mq-1"),
        kind: "open",
        answer_known: false,
        must_not_resolve_unless: [],
      },
    ],
    ["records/facts/mfact-1.yaml", commonFields("mfact-1")],
  ];
  for (const [relativePath, record] of fixtures) {
    safeWriteFile(root, relativePath, YAML.stringify(record));
  }
}

function commonFields(id: string): Record<string, unknown> {
  return {
    id,
    title: "Title",
    active: true,
    importance: "medium",
    tags: [],
    summary: "summary",
    details: "details",
    refs: { characters: [], locations: [], related_records: [] },
    prompt_visibility: "always",
    notes: "",
  };
}

function castProfile(id: string): Record<string, unknown> {
  return {
    ...commonFields(id),
    display_name: "Display",
    roles: ["viewpoint"],
    identity: {
      one_line: "one",
      public_face: "pf",
      private_pressure: "pp",
    },
    world_pressure_core: {
      world_produced_wound: "w",
      active_appetite: "a",
      self_mythology: "s",
      irreconcilable_contradiction: "i",
      relational_charge: "r",
      moral_psychological_edge: "m",
      cannot_be_swapped_out_because: "c",
    },
    body_and_presence: {
      physicality: "p",
      body_limits: "b",
      habitual_gestures: "h",
      clothing_or_presentation: "c",
      social_presentation: "s",
    },
    voice: {
      baseline: "b",
      under_pressure: "u",
      intimacy: "i",
      evasion: "e",
      anger: "a",
      lying: "l",
      anti_generic_warnings: [],
    },
    pressure_behavior: {
      cornered: "c",
      tempted: "t",
      humiliated: "h",
      protecting_attachment: "p",
      offered_power: "o",
    },
    perception_and_embodiment: {
      notices: "n",
      misses: "m",
      misreads: "mr",
      sensory_bias: "s",
    },
    agency_and_planning: {
      default_strategy: "d",
      risk_style: "r",
      fallback_style: "f",
      planning_blind_spots: "p",
    },
    relationship_behavior: {},
    prose_constraints: {
      prose_must_not_imply: [],
      forbidden_inventions: [],
      voice_do_not_do: [],
    },
  };
}

function context(overrides: Partial<PromptWorkingSet> = {}): PromptWorkingSet {
  return {
    current_location: "mloc-1",
    current_cast: ["mchar-1"],
    pov_holder: "mchar-1",
    active_pressure_clocks: ["mclock-1"],
    active_secrets_questions: ["msecret-1", "mq-1"],
    pinned_records: ["mfact-1"],
    must_not_reveal: ["msecret-1"],
    current_handoff_summary: "Mara waits in the riverhouse kitchen.",
    last_accepted_segment: null,
    ...overrides,
  };
}

test("health: absent prompt-working-set produces no finding", () => {
  const { repoRoot, root } = mkWorld();
  try {
    const report = computeHealth(root.absolutePath);

    assert.equal(report.status, "ok");
    assert.deepEqual(report.findings, []);
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("health: valid prompt-working-set produces no finding", () => {
  const { repoRoot, root } = mkWorld();
  try {
    safeWriteFile(root, "prompt-working-set.yaml", YAML.stringify(context()));

    const report = computeHealth(root.absolutePath);

    assert.equal(report.status, "ok");
    assert.deepEqual(report.findings, []);
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("health: corrupt prompt-working-set blocks downstream actions", () => {
  const { repoRoot, root } = mkWorld();
  try {
    writeFileSync(
      path.join(root.absolutePath, "prompt-working-set.yaml"),
      "current_location: [unterminated\n",
    );

    const report = computeHealth(root.absolutePath);

    assert.equal(report.status, "blocked");
    assert.equal(report.findings.length, 1);
    assert.equal(report.findings[0]?.code, "prompt-working-set-yaml-parse-failed");
    assert.equal(report.findings[0]?.severity, "blocking");
    assert.deepEqual(report.blocked_actions, [
      "prompt_copy",
      "prompt_save",
    ]);
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("health: broken prompt-working-set references degrade health", () => {
  const { repoRoot, root } = mkWorld();
  try {
    safeWriteFile(
      root,
      "prompt-working-set.yaml",
      YAML.stringify(context({ pinned_records: ["mfact-99"] })),
    );

    const report = computeHealth(root.absolutePath);

    assert.equal(report.status, "degraded");
    assert.equal(report.findings.length, 1);
    assert.equal(report.findings[0]?.code, "prompt-working-set-reference-broken");
    assert.equal(report.findings[0]?.severity, "error");
    assert.match(report.findings[0]?.path ?? "", /prompt-working-set\.yaml$/);
    assert.deepEqual(report.blocked_actions, []);
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});
