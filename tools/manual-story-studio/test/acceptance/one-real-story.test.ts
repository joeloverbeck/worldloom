import assert from "node:assert/strict";
import {
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import YAML from "yaml";

import { computeHealth } from "../../src/health/compute.js";
import { compileManuscript } from "../../src/manuscript/compile.js";
import { composePrompt } from "../../src/prompt/compose.js";
import { INTERNAL_ID_REGEX } from "../../src/prompt/lint.js";
import { readWorldSource } from "../../src/read/world-source.js";
import type {
  ManualBeliefRecord,
  ManualCharacterRecord,
  ManualClockRecord,
  ManualConsequenceRecord,
  ManualEmotionRecord,
  ManualFactRecord,
  ManualPlanRecord,
  ManualQuestionRecord,
  ManualRelationshipRecord,
  ManualSecretRecord,
} from "../../src/schema/manual-story.js";
import { createServer } from "../../src/server/http.js";
import { writePromptWorkingSet } from "../../src/write/prompt-working-set.js";
import {
  createRecord,
  deleteRecord,
  updateRecord,
} from "../../src/write/records.js";
import { saveSegment } from "../../src/write/segments.js";
import { writePrompt } from "../../src/write/prompts.js";
import {
  fixtureBelief,
  fixtureCast,
  fixtureClock,
  fixtureConsequence,
  fixtureEmotion,
  fixtureFact,
  fixturePlan,
  fixtureQuestion,
  fixtureRelationship,
  fixtureSecret,
} from "../prompt/fixtures.js";
import {
  cleanupGlassOrchardFixture,
  makeGlassOrchardFixture,
} from "./glass-orchard-fixture.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REAL_REPO_ROOT = path.resolve(HERE, "../../../..");

test("SPEC-121: one synthetic Glass Orchard author loop completes end-to-end", async () => {
  const realGlassOrchardPath = path.join(
    REAL_REPO_ROOT,
    "worlds",
    "glass-orchard",
  );
  const realGlassOrchardExistedBefore = existsSync(realGlassOrchardPath);
  const fixture = makeGlassOrchardFixture();

  try {
    const worldSource = readWorldSource(fixture.repoRoot, fixture.worldSlug);
    assert.equal(worldSource.ok, true);
    assert.equal(worldSource.ok && worldSource.value.length, 5);
    assert.equal(
      worldSource.ok &&
        worldSource.value.some(
          (item) =>
            item.kind === "characters" &&
            item.path === "characters/mira.md" &&
            item.raw_text.includes("tax-guild inspector"),
        ),
      true,
    );

    const mira = mustCreate(
      "cast",
      omitId(
        fixtureCast("mchar-1", "Mira", {
          display_name: "Mira",
          roles: ["viewpoint", "authority"],
          summary: "Tax-guild inspector.",
          prompt_visibility: "always",
          identity: {
            one_line: "A tax-guild inspector in the glass orchard.",
            public_face: "Precise, polite, and difficult to distract.",
            private_pressure: "She suspects Len is hiding contraband.",
          },
        }),
      ),
      fixture.root,
    );
    const len = mustCreate(
      "cast",
      omitId(
        fixtureCast("mchar-2", "Len", {
          display_name: "Len",
          roles: ["primary_actor"],
          summary: "Orchard keeper.",
          prompt_visibility: "always",
          identity: {
            one_line: "The orchard keeper who knows which tree was grafted.",
            public_face: "Soft-spoken and practical.",
            private_pressure: "He hid a broken grafting knife.",
          },
        }),
      ),
      fixture.root,
    );
    assert.equal(mira.id, "mchar-1");
    assert.equal(len.id, "mchar-2");

    const orchardFact = mustCreate(
      "facts",
      omitId(
        fixtureFact("mfact-1", "Memory-fruit stores witness memories", {
          summary: "The glass orchard grows fruit that stores memories.",
          details: "A fruit can replay the memory it grew around when cracked.",
          tags: ["source-derived"],
          refs: { characters: [], locations: [], related_records: [] },
          prompt_visibility: "always",
        }),
      ),
      fixture.root,
    );
    const obsoleteFact = mustCreate(
      "facts",
      omitId(
        fixtureFact("mfact-2", "The old harvest bell still rings", {
          summary: "Obsolete working note for the first draft.",
          details: "This note should be removable without referrers.",
        }),
      ),
      fixture.root,
    );
    const trueAnswer = mustCreate(
      "facts",
      omitId(
        fixtureFact("mfact-3", "Len broke the grafting knife", {
          summary: "Len broke the grafting knife and hid it under a root.",
          details: "This is the true answer and must stay out of the prompt.",
          prompt_visibility: "always",
        }),
      ),
      fixture.root,
    );
    const belief = mustCreate(
      "beliefs",
      omitId(
        fixtureBelief("mbel-1", "Mira believes Len is concealing a tithe", {
          holder: mira.id,
          truth_relation: "partly_true",
          confidence: "high",
          summary: "Mira thinks Len concealed taxable memory-fruit.",
          prompt_visibility: "always",
        }),
      ),
      fixture.root,
    );
    const emotion = mustCreate(
      "emotions",
      omitId(
        fixtureEmotion("memo-1", "Len fears the audit", {
          holder: len.id,
          valence: "negative",
          intensity: "strong",
          summary: "Len is afraid Mira will find the knife.",
          prompt_visibility: "always",
        }),
      ),
      fixture.root,
    );
    const plan = mustCreate(
      "plans",
      omitId(
        fixturePlan("mplan-1", "Len stalls Mira at the north row", {
          holder: len.id,
          target: mira.id,
          visibility: "private",
          summary: "Len tries to keep Mira away from the broken graft.",
          prompt_visibility: "always",
        }),
      ),
      fixture.root,
    );
    const relationship = mustCreate(
      "relationships",
      omitId(
        fixtureRelationship("mrel-1", "Mira and Len are locked in audit pressure", {
          between: [mira.id, len.id],
          summary: "Mira and Len know each other well enough to notice evasions.",
          prompt_visibility: "always",
        }),
      ),
      fixture.root,
    );
    const clock = mustCreate(
      "clocks",
      omitId(
        fixtureClock("mclock-1", "Guild audit pressure", {
          axis: "audit",
          value: 2,
          direction: "rising",
          summary: "The inspection is moving toward seizure.",
          prompt_visibility: "always",
        }),
      ),
      fixture.root,
    );
    const secret = mustCreate(
      "secrets",
      omitId(
        fixtureSecret("msecret-1", "The broken grafting knife", {
          held_by: [len.id],
          audience_visibility: "hidden",
          forbidden_reveal_tags: ["knife"],
          summary: "Len hides the broken grafting knife.",
          refs: {
            characters: [],
            locations: [],
            related_records: [trueAnswer.id],
          },
          prompt_visibility: "always",
        }),
      ),
      fixture.root,
    );
    const question = mustCreate(
      "questions",
      omitId(
        fixtureQuestion("mq-1", "Will Mira find the grafting knife?", {
          kind: "mystery",
          answer_known: true,
          must_not_resolve_unless: ["Mira sees the root hollow"],
          summary: "Whether Mira finds the hidden knife remains unresolved.",
          prompt_visibility: "always",
        }),
      ),
      fixture.root,
    );

    writePromptWorkingSet(fixture.root, {
      current_location: null,
      current_cast: [mira.id, len.id],
      pov_holder: mira.id,
      active_pressure_clocks: [clock.id],
      active_secrets_questions: [secret.id, question.id],
      pinned_records: [
        orchardFact.id,
        belief.id,
        emotion.id,
        plan.id,
        relationship.id,
        clock.id,
        secret.id,
        question.id,
        trueAnswer.id,
      ],
      excluded_records: [trueAnswer.id],
      must_not_reveal: [secret.id, question.id],
      handoff_summary: "Mira has reached Len's oldest row of trees.",
      last_accepted_segment: null,
    });

    const prompt = await composePrompt({
      repoRoot: fixture.repoRoot,
      manualStoryRoot: fixture.root.absolutePath,
      moment_directive:
        "Mira asks Len to open the oldest glass tree while he decides whether to lie.",
      included_cast: [mira.id, len.id],
      included_records: [orchardFact.id],
    });
    assert.equal(prompt.lint.blockingForCopy, false);
    assert.equal(
      prompt.resolution.excluded.some(
        (entry) =>
          entry.id === trueAnswer.id && entry.reason === "working_set_excluded",
      ),
      true,
    );
    assert.equal(prompt.sidecar_draft.included_records.includes(trueAnswer.id), false);
    assert.equal(prompt.markdown.includes("Len broke the grafting knife"), false);
    assert.equal(INTERNAL_ID_REGEX.test(prompt.markdown), false);
    assert.match(prompt.markdown, /next 3-5 beats/);

    const savedPrompt = writePrompt({
      root: fixture.root,
      composeResult: prompt,
      now: () => "2026-06-03T01:00:00.000Z",
    });
    assert.equal(savedPrompt.id, "PROMPT-1");

    const segment = saveSegment({
      root: fixture.root,
      prompt_id: savedPrompt.id,
      prose:
        "Mira set the silver tax seal against the tree. Len smiled too late and reached for the branch she had not named.",
      title: "The old row opens",
      now: () => "2026-06-03T01:10:00.000Z",
    });
    assert.equal(segment.segment_id, "SEG-1");

    const manuscript = compileManuscript({ manualStoryRoot: fixture.root });
    assert.equal(manuscript.ok, true);
    assert.match(
      readFileSync(path.join(fixture.root.absolutePath, "manuscript.md"), "utf8"),
      /Mira set the silver tax seal/,
    );

    const server = await createServer({ repoRoot: fixture.repoRoot });
    try {
      const response = await server.inject({
        method: "GET",
        url: `/api/worlds/${fixture.worldSlug}/manual-stories/${fixture.manualStorySlug}/segments/${segment.segment_id}/post-segment-workbench`,
      });
      assert.equal(response.statusCode, 200);
      const body = response.json() as {
        linked_record_candidates: Array<{
          recordClass: string;
          id: string;
          fields: string[];
          target_ids: string[];
        }>;
      };
      assert.equal(
        body.linked_record_candidates.some(
          (entry) =>
            entry.id === belief.id &&
            entry.recordClass === "beliefs" &&
            entry.fields.includes("holder") &&
            entry.target_ids.includes(mira.id),
        ),
        true,
      );
      assert.equal(
        body.linked_record_candidates.some(
          (entry) =>
            entry.id === relationship.id &&
            entry.recordClass === "relationships" &&
            entry.fields.includes("between[0]"),
        ),
        true,
      );
      assert.equal(
        body.linked_record_candidates.some(
          (entry) =>
            entry.id === secret.id &&
            entry.recordClass === "secrets" &&
            entry.fields.includes("held_by[0]"),
        ),
        true,
      );
    } finally {
      await server.close();
    }

    const updatedPlan = updateRecord(fixture.root, "plans", plan.id, {
      ...plan.record,
      summary: "Len gives up on delay and tries to redirect Mira to the gate.",
    });
    assert.equal(updatedPlan.ok, true);
    const updatedBelief = updateRecord(fixture.root, "beliefs", belief.id, {
      ...belief.record,
      confidence: "certain",
      summary: "Mira is certain Len is hiding something taxable.",
    });
    assert.equal(updatedBelief.ok, true);
    const updatedClock = updateRecord(fixture.root, "clocks", clock.id, {
      ...clock.record,
      value: 3,
      summary: "The inspection is one step from seizure.",
    });
    assert.equal(updatedClock.ok, true);
    const consequence = mustCreate(
      "consequences",
      omitId(
        fixtureConsequence("mcnsq-1", "Mira marks the tree for seizure", {
          caused_by_segment: segment.segment_id,
          pending: true,
          urgency: "high",
          summary: "Mira's seal creates a pending seizure consequence.",
          prompt_visibility: "always",
        }),
      ),
      fixture.root,
    );
    assert.equal(consequence.id, "mcnsq-1");

    const obsoleteDelete = deleteRecord(fixture.root, "facts", obsoleteFact.id);
    assert.equal("outcome" in obsoleteDelete && obsoleteDelete.outcome, "hard_deleted");
    assert.equal(
      existsSync(
        path.join(
          fixture.root.absolutePath,
          "records",
          "facts",
          `${obsoleteFact.id}.yaml`,
        ),
      ),
      false,
    );

    const blockedDelete = deleteRecord(fixture.root, "secrets", secret.id);
    assert.equal("outcome" in blockedDelete && blockedDelete.outcome, "blocked");
    assert.equal(
      "outcome" in blockedDelete &&
        blockedDelete.outcome === "blocked" &&
        blockedDelete.referrers.some((entry) => entry.summary.id === "prompt-working-set"),
      true,
    );
    const forcedDelete = deleteRecord(fixture.root, "secrets", secret.id, {
      force: true,
      now: () => "2026-06-03T01:20:00.000Z",
    });
    assert.equal("outcome" in forcedDelete && forcedDelete.outcome, "force_deleted");
    const repairLog = YAML.parse(
      readFileSync(path.join(fixture.root.absolutePath, "repair-log.yaml"), "utf8"),
    ) as Array<{ deleted_class_and_id: string }>;
    assert.deepEqual(
      repairLog.map((entry) => entry.deleted_class_and_id),
      [`secrets/${secret.id}`],
    );

    writeFileSync(segment.prose_path, "Mira interrupted herself mid-sentence.\n");
    const repaired = saveSegment({
      root: fixture.root,
      prose:
        "Mira let the tax seal hang between them while Len stopped pretending not to see it.",
      title: "Repair replacement",
      now: () => "2026-06-03T01:30:00.000Z",
    });
    assert.equal(repaired.segment_id, "SEG-2");

    writeFileSync(
      path.join(fixture.root.absolutePath, "prompt-working-set.yaml"),
      "current_cast: [\n",
    );
    const health = computeHealth(fixture.root.absolutePath);
    assert.equal(health.status, "blocked");
    assert.deepEqual(health.blocked_actions.sort(), [
      "prompt_copy",
      "prompt_save",
    ]);

    assert.equal(existsSync(fixture.repoRoot), true);
  } finally {
    cleanupGlassOrchardFixture(fixture);
  }

  assert.equal(existsSync(fixture.repoRoot), false);
  assert.equal(existsSync(realGlassOrchardPath), realGlassOrchardExistedBefore);
});

function omitId<T extends { id: string }>(record: T): Omit<T, "id"> {
  const { id: _id, ...body } = record;
  return body;
}

function mustCreate<C extends Parameters<typeof createRecord>[1]>(
  recordClass: C,
  body: Parameters<typeof createRecord<C>>[2],
  root: Parameters<typeof createRecord<C>>[0],
): Extract<ReturnType<typeof createRecord<C>>, { ok: true }> {
  const result = createRecord(root, recordClass, body);
  if (!("ok" in result) || !result.ok) {
    throw new Error(`create ${recordClass} failed: ${JSON.stringify(result)}`);
  }
  return result;
}
