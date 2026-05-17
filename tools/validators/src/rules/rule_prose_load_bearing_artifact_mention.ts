import type { Context, IndexedRecord, Validator, Verdict } from "../framework/types.js";
import {
  asPlainRecord,
  fileInputsFrom,
  locationFor,
  stringArray,
  stringValue,
  touchedFilesInclude
} from "../structural/utils.js";

const VALIDATOR = "prose_load_bearing_artifact_mention";
const CODE = "prose_load_bearing_artifact_mention_without_da";
const PAGE_PROSE_PATH = /(?:^|\/)stories\/[^/]+\/pages-prose\/(PG-\d+)\.md$|(?:^|\/)pages-prose\/(PG-\d+)\.md$/;
const DA_ID = /^DA-\d+$/;

// V1 pattern set from SPEC-38 D12. Keep additions here so false-positive tuning
// stays in one place as pilot story prose exposes more artifact language.
const ARTIFACT_NOUNS = [
  "letter",
  "map",
  "diary",
  "decree",
  "log",
  "recording",
  "inscription",
  "confession",
  "notice",
  "ledger",
  "transcript",
  "briefing",
  "proclamation",
  "seal",
  "codex",
  "marginalia",
  "redaction",
  "warrant",
  "testimony",
  "missive",
  "dispatch",
  "manifest",
  "charter",
  "edict",
  "treaty",
  "will",
  "oath"
] as const;

const ACTION_WORDS = [
  "read",
  "reads",
  "reading",
  "quoted",
  "quotes",
  "cited",
  "cites",
  "revealed",
  "reveals",
  "followed",
  "follows",
  "found",
  "finds",
  "discovered",
  "discovers",
  "unfolded",
  "unfolds",
  "opened",
  "opens",
  "sealed",
  "seals",
  "hid",
  "hides",
  "hidden",
  "burned",
  "burns",
  "translated",
  "translates",
  "forged",
  "forges"
] as const;

const NOUN_PATTERN = new RegExp(`\\b(${ARTIFACT_NOUNS.join("|")})s?\\b`, "i");
const ACTION_PATTERN = new RegExp(`\\b(${ACTION_WORDS.join("|")})\\b`, "i");
const CHC_PATTERN = /\bCHC-\d+\b/;
const QUOTED_CONTENT_PATTERN = /"[^"\r\n]{8,}"|'[^'\r\n]{8,}'/;

interface ProseMention {
  pageId: string;
  filePath: string;
  sentence: string;
  noun: string;
  quoted: boolean;
}

export const ruleProseLoadBearingArtifactMention: Validator = {
  name: VALIDATOR,
  severity_mode: "warn",
  applies_to: (ctx: Context): boolean =>
    ctx.run_mode === "full-world" ||
    (ctx.run_mode === "pre-apply" && (ctx.patch_plan?.patches ?? []).some(isStoryPagePatch)) ||
    (ctx.run_mode === "incremental" &&
      touchedFilesInclude(
        ctx,
        /(?:^|\/)stories\/[^/]+\/(?:pages-prose\/PG-\d+\.md|_source\/(?:pages\/PG-\d+|artifacts\/DA-\d+)\.yaml)$/
      )),
  skip_reason: "story page prose or DA active-record context only",
  run: async (input: unknown, ctx: Context): Promise<Verdict[]> => {
    const storyScope = ctx.story_slug === undefined ? {} : { story_slug: ctx.story_slug };
    const pages = await ctx.index.query({
      record_type: "page_record",
      world_slug: ctx.world_slug,
      ...storyScope
    });
    const artifacts = await ctx.index.query({
      record_type: "story_diegetic_artifact_record",
      world_slug: ctx.world_slug,
      ...storyScope
    });
    const pagesById = new Map(pages.map((page) => [recordId(page), page]));
    const artifactsById = new Map(artifacts.map((artifact) => [recordId(artifact), artifact]));

    const verdicts: Verdict[] = [];
    for (const mention of proseMentions(input, ctx)) {
      const page = pagesById.get(mention.pageId);
      if (!page) {
        continue;
      }
      const activeDaIds = activeRecordIds(page, "DA");
      if (activeDaIds.size === 0 || !hasMatchingActiveArtifact(mention, activeDaIds, artifactsById)) {
        verdicts.push(artifactMentionVerdict(mention, page));
      }
    }
    return verdicts;
  }
};

function isStoryPagePatch(patch: { op: string }): boolean {
  return patch.op === "create_pg_record";
}

function proseMentions(input: unknown, ctx: Context): ProseMention[] {
  const mentions: ProseMention[] = [];
  for (const file of fileInputsFrom(input, ctx)) {
    const match = PAGE_PROSE_PATH.exec(file.path);
    const pageId = match?.[1] ?? match?.[2];
    if (!pageId) {
      continue;
    }
    for (const paragraph of file.content.split(/\n\s*\n/)) {
      for (const sentence of paragraph.split(/(?<=[.!?])\s+/)) {
        const nounMatch = NOUN_PATTERN.exec(sentence);
        if (!nounMatch || isMetaphor(sentence) || mentionsExplicitDa(sentence)) {
          continue;
        }
        const groundsLoadBearingUse =
          ACTION_PATTERN.test(sentence) || CHC_PATTERN.test(paragraph) || QUOTED_CONTENT_PATTERN.test(sentence);
        if (!groundsLoadBearingUse) {
          continue;
        }
        mentions.push({
          pageId,
          filePath: file.path,
          sentence: sentence.trim(),
          noun: nounMatch[1]!.toLowerCase(),
          quoted: QUOTED_CONTENT_PATTERN.test(sentence)
        });
      }
    }
  }
  return mentions;
}

function activeRecordIds(page: IndexedRecord, recordClass: string): Set<string> {
  const snapshotActiveRecords = asPlainRecord(asPlainRecord(page.parsed).state_snapshot).active_records;
  const activeRecords = asPlainRecord(snapshotActiveRecords);
  const value = activeRecords[recordClass];
  if (Array.isArray(value)) {
    return new Set(stringArray(value));
  }
  if (Array.isArray(snapshotActiveRecords)) {
    return new Set(
      stringArray(snapshotActiveRecords).filter((id) =>
        recordClass === "DA" ? DA_ID.test(id) : id.startsWith(`${recordClass}-`)
      )
    );
  }
  return new Set();
}

function hasMatchingActiveArtifact(
  mention: ProseMention,
  activeDaIds: Set<string>,
  artifactsById: Map<string, IndexedRecord>
): boolean {
  for (const daId of activeDaIds) {
    const artifact = artifactsById.get(daId);
    if (!artifact) {
      continue;
    }
    const parsed = asPlainRecord(artifact.parsed);
    const title = stringValue(parsed.title)?.toLowerCase() ?? "";
    const genre = stringValue(parsed.genre)?.toLowerCase() ?? "";
    if (title.includes(mention.noun) || genre.includes(mention.noun)) {
      return true;
    }
  }
  return false;
}

function mentionsExplicitDa(sentence: string): boolean {
  return /\bDA-\d+\b/.test(sentence);
}

function isMetaphor(sentence: string): boolean {
  return /\b(?:not a real|just a metaphor|only a metaphor|like a|as if|were a)\b/i.test(sentence);
}

function recordId(record: IndexedRecord): string {
  return stringValue(asPlainRecord(record.parsed).id) ?? record.node_id.split(":").pop() ?? record.node_id;
}

function artifactMentionVerdict(mention: ProseMention, page: IndexedRecord): Verdict {
  const pageId = recordId(page);
  return {
    validator: VALIDATOR,
    severity: mention.quoted ? "fail" : "warn",
    code: CODE,
    message: `${mention.filePath} mentions a load-bearing ${mention.noun} in ${pageId} prose without a matching active DA record.`,
    location: {
      ...locationFor(page),
      file: mention.filePath
    },
    detail: {
      page_id: pageId,
      artifact_noun: mention.noun,
      sentence: mention.sentence,
      quoted_content_detected: mention.quoted
    },
    suggested_fix:
      "Create or activate a matching story-local DA, add the necessary BEL and optional STOBJ records, or revise the prose so it does not introduce load-bearing artifact state."
  };
}
