import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import YAML from "yaml";

import {
  resolveReferrerSummaries,
  scanReferences,
} from "../../src/read/records.js";
import type { PromptWorkingSet } from "../../src/schema/prompt-working-set.js";
import type {
  ManualBeliefRecord,
  ManualCharacterRecord,
  ManualFactRecord,
} from "../../src/schema/manual-story.js";

function mkRoot(): string {
  return mkdtempSync(path.join(os.tmpdir(), "manual-studio-referrers-"));
}

function commonFields(id: string): Pick<
  ManualFactRecord,
  | "id"
  | "title"
  | "active"
  | "importance"
  | "tags"
  | "summary"
  | "details"
  | "refs"
  | "prompt_visibility"
  | "notes"
> {
  return {
    id,
    title: `Title ${id}`,
    active: true,
    importance: "medium",
    tags: [],
    summary: `Summary ${id}`,
    details: "",
    refs: { characters: [], locations: [], related_records: [] },
    prompt_visibility: "always",
    notes: "",
  };
}

function castProfile(id: string): ManualCharacterRecord {
  return {
    ...commonFields(id),
    display_name: id,
    roles: ["viewpoint"],
    identity: { one_line: "", public_face: "", private_pressure: "" },
    world_pressure_core: {
      world_produced_wound: "",
      active_appetite: "",
      self_mythology: "",
      irreconcilable_contradiction: "",
      relational_charge: "",
      moral_psychological_edge: "",
      cannot_be_swapped_out_because: "",
    },
    body_and_presence: {
      physicality: "",
      body_limits: "",
      habitual_gestures: "",
      clothing_or_presentation: "",
      social_presentation: "",
    },
    voice: {
      baseline: "",
      under_pressure: "",
      intimacy: "",
      evasion: "",
      anger: "",
      lying: "",
      anti_generic_warnings: [],
    },
    pressure_behavior: {
      cornered: "",
      tempted: "",
      humiliated: "",
      protecting_attachment: "",
      offered_power: "",
    },
    perception_and_embodiment: {
      notices: "",
      misses: "",
      misreads: "",
      sensory_bias: "",
    },
    agency_and_planning: {
      default_strategy: "",
      risk_style: "",
      fallback_style: "",
      planning_blind_spots: "",
    },
    relationship_behavior: {},
    prose_constraints: {
      prose_must_not_imply: [],
      forbidden_inventions: [],
      voice_do_not_do: [],
    },
  };
}

function writeYaml(root: string, relativePath: string, body: unknown): void {
  const fullPath = path.join(root, relativePath);
  mkdirSync(path.dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, YAML.stringify(body));
}

function unwrap<T>(result: { ok: true; value: T } | { ok: false; error: unknown }): T {
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("expected ok");
  return result.value;
}

test("scanReferences: finds record refs, prompt-working-set refs, and selected-template sidecars", () => {
  const root = mkRoot();
  try {
    writeYaml(root, "records/cast/mchar-1.yaml", castProfile("mchar-1"));
    writeYaml(root, "records/beliefs/mbel-1.yaml", {
      ...commonFields("mbel-1"),
      refs: {
        characters: ["mchar-1"],
        locations: [],
        related_records: ["mfact-1"],
      },
      holder: "mchar-1",
      truth_relation: "true",
      confidence: "high",
    } satisfies ManualBeliefRecord);
    writeYaml(root, "records/facts/mfact-1.yaml", commonFields("mfact-1"));
    writeYaml(root, "records/beat-templates/mtemplate-1.yaml", {
      ...commonFields("mtemplate-1"),
      template_body: "Template text",
    });
    writeYaml(root, "prompt-working-set.yaml", {
      current_location: null,
      current_cast: ["mchar-1"],
      pov_holder: "mchar-1",
      active_pressure_clocks: [],
      active_secrets_questions: [],
      pinned_records: ["mfact-1"],
      excluded_records: [],
      must_not_reveal: [],
      handoff_summary: "",
      last_accepted_segment: "SEG-1",
    } satisfies PromptWorkingSet);
    writeYaml(root, "segments/SEG-1.yaml", {
      id: "SEG-1",
      selected_template: "mtemplate-1",
    });
    writeYaml(root, "prompt-runs/PROMPT-1.yaml", {
      id: "PROMPT-1",
      included_template_path: path.join(
        root,
        "records",
        "beat-templates",
        "mtemplate-1.yaml",
      ),
    });

    const characterFields = unwrap(scanReferences(root, "mchar-1"))
      .map((r) => `${r.id}:${r.field}`)
      .sort();
    assert.deepEqual(characterFields, [
      "mbel-1:holder",
      "mbel-1:refs.characters[0]",
      "prompt-working-set:prompt-working-set.current_cast[0]",
      "prompt-working-set:prompt-working-set.pov_holder",
    ]);

    const factFields = unwrap(scanReferences(root, "mfact-1"))
      .map((r) => `${r.id}:${r.field}`)
      .sort();
    assert.deepEqual(factFields, [
      "mbel-1:refs.related_records[0]",
      "prompt-working-set:prompt-working-set.pinned_records[0]",
    ]);

    const templateFields = unwrap(scanReferences(root, "mtemplate-1"))
      .map((r) => `${r.id}:${r.field}`)
      .sort();
    assert.deepEqual(templateFields, [
      "PROMPT-1:prompt-runs/PROMPT-1.yaml:included_template_path",
      "SEG-1:segments/SEG-1.yaml:selected_template",
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("resolveReferrerSummaries: dedupes by referrer and returns populated summaries", () => {
  const root = mkRoot();
  try {
    writeYaml(root, "records/cast/mchar-1.yaml", castProfile("mchar-1"));
    writeYaml(root, "records/beliefs/mbel-1.yaml", {
      ...commonFields("mbel-1"),
      title: "Belief Referrer",
      summary: "A belief summary",
      refs: { characters: ["mchar-1"], locations: [], related_records: [] },
      holder: "mchar-1",
      truth_relation: "true",
      confidence: "high",
    } satisfies ManualBeliefRecord);
    writeYaml(root, "prompt-working-set.yaml", {
      current_location: null,
      current_cast: ["mchar-1"],
      pov_holder: null,
      active_pressure_clocks: [],
      active_secrets_questions: [],
      pinned_records: [],
      excluded_records: [],
      must_not_reveal: [],
      handoff_summary: "",
      last_accepted_segment: null,
    } satisfies PromptWorkingSet);

    const summaries = unwrap(resolveReferrerSummaries(root, "mchar-1"));

    assert.equal(summaries.length, 2);
    assert.deepEqual(
      summaries.map((entry) => entry.summary.id).sort(),
      ["mbel-1", "prompt-working-set"],
    );
    const belief = summaries.find((entry) => entry.summary.id === "mbel-1");
    assert.equal(belief?.recordClass, "beliefs");
    assert.equal(belief?.summary.title, "Belief Referrer");
    assert.equal(belief?.summary.summary, "A belief summary");
    const context = summaries.find((entry) => entry.summary.id === "prompt-working-set");
    assert.equal(context?.summary.title, "Prompt working set");
    assert.match(context?.summary.summary ?? "", /prompt-working-set\.current_cast/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
