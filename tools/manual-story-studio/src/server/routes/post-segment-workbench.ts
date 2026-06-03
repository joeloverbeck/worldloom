import { existsSync } from "node:fs";

import type { FastifyInstance, FastifyReply } from "fastify";

import {
  readSegmentBody,
  readSegmentSidecar,
} from "../../read/segments.js";
import {
  readRecord,
  scanReferences,
  type ReferrerEntry,
} from "../../read/records.js";
import type { ReadError } from "../../read/result.js";
import {
  MANUAL_RECORD_CLASS_PREFIXES,
  type ManualRecordClass,
} from "../../schema/manual-story.js";
import {
  resolveManualStoryRoot,
  type ManualStoryRoot,
} from "../../write/sandbox.js";
import { mapReadErrorToHttpReply } from "../read-error-http.js";

export interface PostSegmentWorkbenchRouteOptions {
  repoRoot: string;
}

interface PostSegmentWorkbenchCandidate {
  recordClass: ManualRecordClass;
  id: string;
  title: string;
  active: boolean;
  target_ids: string[];
  fields: string[];
}

const REMINDER =
  "Segment saved. Manual Studio did not infer record changes. Update only the records you want to change.";

function resolveRootOrNull(
  repoRoot: string,
  worldSlug: string,
  msSlug: string,
): ManualStoryRoot | null {
  try {
    const root = resolveManualStoryRoot(repoRoot, worldSlug, msSlug);
    if (!existsSync(root.absolutePath)) return null;
    return root;
  } catch {
    return null;
  }
}

function badRequest(reply: FastifyReply, message: string): FastifyReply {
  return reply.code(400).send({ error: "bad_request", message });
}

function isSegmentId(value: string): boolean {
  return /^SEG-\d+$/.test(value);
}

function lastParagraph(markdown: string): string {
  const paragraphs = markdown
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  return paragraphs.at(-1) ?? "";
}

function uniqueTargets(sidecar: {
  id: string;
  included_record_summary: { characters: string[]; records: string[] };
}): string[] {
  return [
    ...new Set([
      sidecar.id,
      ...sidecar.included_record_summary.characters,
      ...sidecar.included_record_summary.records,
    ]),
  ];
}

function isManualRecordReferrer(referrer: ReferrerEntry): boolean {
  const prefix = MANUAL_RECORD_CLASS_PREFIXES[referrer.recordClass];
  return new RegExp(`^${prefix}-\\d+$`).test(referrer.id);
}

function candidateKey(referrer: ReferrerEntry): string {
  return `${referrer.recordClass}\0${referrer.id}`;
}

function sortedUnique(values: Iterable<string>): string[] {
  return [...new Set(values)].sort();
}

function mergeReferrersByCandidate(
  targetReferrers: Array<{ targetId: string; referrer: ReferrerEntry }>,
): Map<string, { referrer: ReferrerEntry; targetIds: Set<string>; fields: Set<string> }> {
  const grouped = new Map<
    string,
    { referrer: ReferrerEntry; targetIds: Set<string>; fields: Set<string> }
  >();
  for (const entry of targetReferrers) {
    if (!isManualRecordReferrer(entry.referrer)) continue;
    const key = candidateKey(entry.referrer);
    const existing = grouped.get(key);
    if (existing) {
      existing.targetIds.add(entry.targetId);
      existing.fields.add(entry.referrer.field);
      continue;
    }
    grouped.set(key, {
      referrer: entry.referrer,
      targetIds: new Set([entry.targetId]),
      fields: new Set([entry.referrer.field]),
    });
  }
  return grouped;
}

function candidateSortKey(candidate: PostSegmentWorkbenchCandidate): string {
  return `${candidate.recordClass}\0${candidate.id}`;
}

function buildCandidates(
  manualStoryRoot: string,
  targetReferrers: Array<{ targetId: string; referrer: ReferrerEntry }>,
): { ok: true; value: PostSegmentWorkbenchCandidate[] } | { ok: false; error: ReadError } {
  const candidates: PostSegmentWorkbenchCandidate[] = [];
  for (const grouped of mergeReferrersByCandidate(targetReferrers).values()) {
    const record = readRecord(
      manualStoryRoot,
      grouped.referrer.recordClass,
      grouped.referrer.id,
    );
    if (!record.ok) return { ok: false, error: record.error };
    candidates.push({
      recordClass: grouped.referrer.recordClass,
      id: grouped.referrer.id,
      title: record.value.title,
      active: record.value.active,
      target_ids: sortedUnique(grouped.targetIds),
      fields: sortedUnique(grouped.fields),
    });
  }
  candidates.sort((a, b) => candidateSortKey(a).localeCompare(candidateSortKey(b)));
  return { ok: true, value: candidates };
}

export async function registerPostSegmentWorkbenchReadRoute(
  server: FastifyInstance,
  options: PostSegmentWorkbenchRouteOptions,
): Promise<void> {
  server.get<{
    Params: { slug: string; msSlug: string; segmentId: string };
  }>(
    "/api/worlds/:slug/manual-stories/:msSlug/segments/:segmentId/post-segment-workbench",
    async (request, reply) => {
      const root = resolveRootOrNull(
        options.repoRoot,
        request.params.slug,
        request.params.msSlug,
      );
      if (!root) return reply.code(404).send({ error: "manual_story_not_found" });
      const segmentId = request.params.segmentId;
      if (!isSegmentId(segmentId)) {
        return badRequest(reply, "bad segment id");
      }

      const body = readSegmentBody({
        manualStoryRoot: root.absolutePath,
        segmentId,
      });
      const sidecar = readSegmentSidecar({
        manualStoryRoot: root.absolutePath,
        segmentId,
      });
      if (!body.ok) return mapReadErrorToHttpReply(reply, body.error);
      if (!sidecar.ok) return mapReadErrorToHttpReply(reply, sidecar.error);

      const targetReferrers: Array<{ targetId: string; referrer: ReferrerEntry }> = [];
      for (const targetId of uniqueTargets(sidecar.value)) {
        const referrers = scanReferences(root.absolutePath, targetId);
        if (!referrers.ok) return mapReadErrorToHttpReply(reply, referrers.error);
        for (const referrer of referrers.value) {
          targetReferrers.push({ targetId, referrer });
        }
      }

      const candidates = buildCandidates(root.absolutePath, targetReferrers);
      if (!candidates.ok) return mapReadErrorToHttpReply(reply, candidates.error);

      return {
        segment: {
          id: sidecar.value.id,
          body: body.value,
          title: sidecar.value.title,
          prompt_id: sidecar.value.prompt_id,
          moment_directive: sidecar.value.moment_directive,
          word_count: sidecar.value.word_count,
          last_paragraph: lastParagraph(body.value),
          included_record_summary: sidecar.value.included_record_summary,
        },
        reminder: REMINDER,
        linked_record_candidates: candidates.value,
      };
    },
  );
}
