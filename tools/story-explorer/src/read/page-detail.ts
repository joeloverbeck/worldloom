import { readFile } from "node:fs/promises";
import path from "node:path";

import { resolveRepoRoot } from "../config/repo-root.js";
import { readProse } from "./prose-direct.js";
import { listPageRecords, parseRecordBody, readRecord, storyDirectory } from "./record-io.js";
import type { ChildOutcomeVariant } from "../view-models/child-outcome-variant.js";
import type { ChoiceNavigation } from "../view-models/choice-navigation.js";
import type {
  BranchContext,
  EventDeltaSummary,
  PageDetail,
  PagePlanSummary,
  RawSourceReference,
  ReceiptSummary,
  ValidationIntegritySummary,
} from "../view-models/page-detail.js";

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function stringList(value: unknown): string[] {
  if (typeof value === "string" && value.length > 0) {
    return [value];
  }
  return stringArray(value);
}

const STORY_RECORD_CLASSES = new Set([
  "BEL",
  "BR",
  "CHC",
  "CLK",
  "CNSQ",
  "DA",
  "OBL",
  "PG",
  "RSP",
  "SAU",
  "SE",
  "SF",
  "SLB",
  "SLT",
  "SP",
  "STCHAR",
  "STEMO",
  "STENT",
  "STINT",
  "STLOC",
  "STOBJ",
  "STPLAN",
  "STQ",
  "SREL",
  "STSEC",
  "STSTAT",
  "THR",
]);

const RECORD_ID_PATTERN = /\b([A-Z]+-\d+)\b/g;

export class PageDetailNotFoundError extends Error {
  readonly pageId: string;
  readonly worldSlug: string;
  readonly storySlug: string;

  constructor(worldSlug: string, storySlug: string, pageId: string) {
    super(`Page ${pageId} not found in ${worldSlug}/${storySlug}`);
    this.name = "PageDetailNotFoundError";
    this.pageId = pageId;
    this.worldSlug = worldSlug;
    this.storySlug = storySlug;
  }
}

function storyRecordClass(recordId: string): string {
  return recordId.split("-", 1)[0] ?? recordId;
}

function linkedRecordIdsFrom(value: unknown, key: string | null = null): string[] {
  if (key === "id" || key === "story_id" || key === "created_at_page") {
    return [];
  }
  if (typeof value === "string") {
    return [...value.matchAll(RECORD_ID_PATTERN)]
      .map((match) => match[1])
      .filter((recordId): recordId is string => recordId !== undefined && STORY_RECORD_CLASSES.has(storyRecordClass(recordId)));
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => linkedRecordIdsFrom(entry));
  }
  if (value !== null && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([childKey, childValue]) => linkedRecordIdsFrom(childValue, childKey));
  }
  return [];
}

function recordIdArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => {
      if (typeof entry === "string") {
        return entry;
      }
      return stringValue(record(entry).record_id) ?? stringValue(record(entry).id);
    })
    .filter((entry): entry is string => entry !== null);
}

function pageId(page: Record<string, unknown>): string {
  return stringValue(page.id) ?? "";
}

function pageInput(page: Record<string, unknown>): Record<string, unknown> {
  return record(page.input);
}

function activeRecordIds(page: Record<string, unknown>): string[] {
  const activeRecords = record(record(page.state_snapshot).active_records);
  return Object.values(activeRecords).flatMap(recordIdArray).sort();
}

function stateDeltaCounts(event: Record<string, unknown> | null): { create: number; supersede: number; close: number } {
  const stateDelta = record(event?.state_delta);
  return {
    create: recordIdArray(stateDelta.create).length,
    supersede: recordIdArray(stateDelta.supersede).length,
    close: recordIdArray(stateDelta.close).length,
  };
}

function resolutionPreview(event: Record<string, unknown> | null): string | null {
  const resolution = record(event?.resolution);
  return (
    stringValue(resolution.player_visible_feedback) ??
    stringValue(resolution.result) ??
    stringValue(event?.world_logic_rationale) ??
    null
  );
}

async function readOptionalText(sourcePath: string): Promise<string | null> {
  try {
    return await readFile(sourcePath, "utf8");
  } catch (error) {
    const candidate = error as NodeJS.ErrnoException;
    if (candidate.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function pagePlanSummary(base: string, page: Record<string, unknown>): Promise<PagePlanSummary | null> {
  const planPath = path.join(base, "pages-prose-plans", `${pageId(page)}.md`);
  const body = await readOptionalText(planPath);
  return body === null ? null : { path: planPath, body };
}

async function receiptSummary(base: string, page: Record<string, unknown>): Promise<ReceiptSummary | null> {
  const receiptPath = path.join(base, "pages-prose-receipts", `${pageId(page)}.yaml`);
  const body = await readOptionalText(receiptPath);
  if (body === null) {
    return null;
  }

  const parsed = parseRecordBody(body);
  return {
    path: receiptPath,
    verdict: stringValue(parsed.verdict) ?? stringValue(parsed.status),
    stateHash: stringValue(parsed.state_hash) ?? stringValue(parsed.prose_hash) ?? stringValue(parsed.rendered_prose_hash),
    body: parsed,
  };
}

async function eventFor(
  worldSlug: string,
  storySlug: string,
  eventId: string | null,
  repoRoot: string
): Promise<Record<string, unknown> | null> {
  if (eventId === null) {
    return null;
  }
  try {
    return (await readRecord(worldSlug, storySlug, eventId, repoRoot)).parsed;
  } catch (error) {
    const candidate = error as NodeJS.ErrnoException;
    if (candidate.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function childVariant(
  worldSlug: string,
  storySlug: string,
  childPage: Record<string, unknown>,
  repoRoot: string
): Promise<ChildOutcomeVariant> {
  const input = pageInput(childPage);
  const eventId = stringValue(input.resolved_event_id);
  const event = await eventFor(worldSlug, storySlug, eventId, repoRoot);
  const commitment = record(event?.commitment);

  return {
    pageId: pageId(childPage),
    branchId: stringValue(childPage.branch_id) ?? "",
    turnIndex: numberValue(childPage.turn_index),
    resolvedEventId: eventId,
    outcomeRoute: stringValue(event?.outcome_route),
    resolutionPreview: resolutionPreview(event),
    selectedStoryletId: stringValue(commitment.selected_slt_id),
    hasRenderedProse: await readOptionalText(path.join(storyDirectory(repoRoot, worldSlug, storySlug), "pages-prose", `${pageId(childPage)}.md`)) !== null,
    stateDeltaCounts: stateDeltaCounts(event),
  };
}

async function choiceNavigation(
  worldSlug: string,
  storySlug: string,
  page: Record<string, unknown>,
  pages: Record<string, unknown>[],
  repoRoot: string
): Promise<ChoiceNavigation[]> {
  const childrenByChoice = new Map<string, Record<string, unknown>[]>();
  for (const candidate of pages) {
    if (stringValue(candidate.parent_page_id) !== pageId(page)) {
      continue;
    }
    const choiceId = stringValue(pageInput(candidate).choice_id);
    if (choiceId === null) {
      continue;
    }
    const list = childrenByChoice.get(choiceId) ?? [];
    list.push(candidate);
    childrenByChoice.set(choiceId, list);
  }

  const choiceIds = [...new Set([...stringArray(page.emitted_choices), ...childrenByChoice.keys()])].sort((left, right) =>
    left.localeCompare(right, undefined, { numeric: true })
  );

  return Promise.all(
    choiceIds.map(async (choiceId) => {
      const children = childrenByChoice.get(choiceId) ?? [];
      const variants = await Promise.all(
        children
          .sort((left, right) => numberValue(left.turn_index) - numberValue(right.turn_index) || pageId(left).localeCompare(pageId(right)))
          .map((child) => childVariant(worldSlug, storySlug, child, repoRoot))
      );
      let choice: Record<string, unknown> | null = null;
      try {
        choice = (await readRecord(worldSlug, storySlug, choiceId, repoRoot)).parsed;
      } catch (error) {
        const candidate = error as NodeJS.ErrnoException;
        if (candidate.code !== "ENOENT") {
          throw error;
        }
      }

      return {
        choiceId,
        surfaceLabel: stringValue(choice?.surface_label) ?? choiceId,
        playerVisibleIntent: stringValue(choice?.player_visible_intent) ?? "",
        pressure: stringList(choice?.likely_state_pressure),
        groundedInCount: recordIdArray(choice?.grounded_in).length,
        childOutcomeVariants: variants,
        isNavigable: variants.length > 0,
      };
    })
  );
}

function eventDeltaSummary(eventId: string | null, event: Record<string, unknown> | null): EventDeltaSummary {
  const counts = stateDeltaCounts(event);
  return {
    eventId,
    createCount: counts.create,
    supersedeCount: counts.supersede,
    closeCount: counts.close,
    introducedRecordIds: recordIdArray(event?.record_introductions),
    relationCount: Array.isArray(event?.state_relations) ? event.state_relations.length : 0,
  };
}

async function activeRecordDiagnostics(
  worldSlug: string,
  storySlug: string,
  page: Record<string, unknown>,
  repoRoot: string
): Promise<{ brokenRefs: string[]; malformedYamlWarnings: string[]; skippedRecords: string[] }> {
  const activeIds = activeRecordIds(page);
  const linkedIds = new Set<string>();
  const malformedYamlWarnings: string[] = [];
  const skippedRecords: string[] = [];

  for (const activeId of activeIds) {
    try {
      const activeRecord = await readRecord(worldSlug, storySlug, activeId, repoRoot);
      for (const linkedId of linkedRecordIdsFrom(activeRecord.parsed)) {
        linkedIds.add(linkedId);
      }
    } catch (error) {
      const candidate = error as NodeJS.ErrnoException;
      if (candidate.code === "ENOENT") {
        skippedRecords.push(activeId);
      } else {
        malformedYamlWarnings.push(activeId);
      }
    }
  }

  const brokenRefs: string[] = [];
  for (const linkedId of [...linkedIds].sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))) {
    if (activeIds.includes(linkedId)) {
      continue;
    }
    try {
      await readRecord(worldSlug, storySlug, linkedId, repoRoot);
    } catch (error) {
      const candidate = error as NodeJS.ErrnoException;
      if (candidate.code === "ENOENT") {
        brokenRefs.push(linkedId);
      }
    }
  }

  return { brokenRefs, malformedYamlWarnings, skippedRecords };
}

function planHashStatus(receipt: ReceiptSummary | null): ValidationIntegritySummary["planHashStatus"] {
  if (receipt === null) {
    return "not_checked";
  }
  return stringValue(receipt.body.plan_hash) === null ? "missing" : "present";
}

function stateHashStatus(receipt: ReceiptSummary | null, proseStatus: PageDetail["proseStatus"]): ValidationIntegritySummary["stateHashStatus"] {
  if (proseStatus === "hash_mismatch") {
    return "mismatch";
  }
  if (receipt?.stateHash !== null && receipt?.stateHash !== undefined && proseStatus === "present") {
    return "match";
  }
  return "not_checked";
}

async function validationIntegritySummary(
  worldSlug: string,
  storySlug: string,
  page: Record<string, unknown>,
  receipt: ReceiptSummary | null,
  proseStatus: PageDetail["proseStatus"],
  repoRoot: string
): Promise<ValidationIntegritySummary> {
  const diagnostics = await activeRecordDiagnostics(worldSlug, storySlug, page, repoRoot);
  return {
    validationTrace: record(page.validation_trace),
    receiptVerdict: receipt?.verdict ?? null,
    proseStatus,
    receiptPresence: receipt === null ? "missing" : "present",
    stateHashStatus: stateHashStatus(receipt, proseStatus),
    planHashStatus: planHashStatus(receipt),
    malformedYamlWarnings: diagnostics.malformedYamlWarnings,
    skippedRecords: diagnostics.skippedRecords,
    brokenRefs: diagnostics.brokenRefs,
  };
}

function branchContext(page: Record<string, unknown>): BranchContext {
  return {
    branchId: stringValue(page.branch_id) ?? "",
    branchPath: stringArray(page.branch_path),
    parentPageId: stringValue(page.parent_page_id),
    turnIndex: numberValue(page.turn_index),
  };
}

async function rawSources(
  worldSlug: string,
  storySlug: string,
  page: Record<string, unknown>,
  repoRoot: string
): Promise<RawSourceReference[]> {
  const ids = [pageId(page), ...activeRecordIds(page)];
  const uniqueIds = [...new Set(ids)].filter(Boolean);
  const sources = await Promise.all(
    uniqueIds.map(async (recordId) => {
      try {
        const raw = await readRecord(worldSlug, storySlug, recordId, repoRoot);
        return {
          recordId,
          sourcePath: raw.sourcePath,
          contentHash: raw.contentHash,
        };
      } catch (error) {
        const candidate = error as NodeJS.ErrnoException;
        if (candidate.code === "ENOENT") {
          return null;
        }
        throw error;
      }
    })
  );
  return sources
    .filter((source): source is RawSourceReference => source !== null)
    .sort((left, right) => left.recordId.localeCompare(right.recordId, undefined, { numeric: true }));
}

export async function getPageDetail(
  worldSlug: string,
  storySlug: string,
  targetPageId: string,
  repoRoot = resolveRepoRoot()
): Promise<PageDetail> {
  const pages = (await listPageRecords(worldSlug, storySlug, repoRoot)).map((entry) => entry.parsed);
  const page = pages.find((candidate) => pageId(candidate) === targetPageId);
  if (page === undefined) {
    throw new PageDetailNotFoundError(worldSlug, storySlug, targetPageId);
  }

  const base = storyDirectory(repoRoot, worldSlug, storySlug);
  const prose = await readProse(worldSlug, storySlug, targetPageId, repoRoot);
  const plan = await pagePlanSummary(base, page);
  const receipt = await receiptSummary(base, page);
  const eventId = stringValue(pageInput(page).resolved_event_id);
  const event = await eventFor(worldSlug, storySlug, eventId, repoRoot);

  return {
    page,
    prose: prose.body,
    proseStatus: prose.status,
    pagePlanSummary: plan,
    receiptSummary: receipt,
    choiceNavigation: await choiceNavigation(worldSlug, storySlug, page, pages, repoRoot),
    currentStateRecordIds: activeRecordIds(page),
    eventDelta: eventDeltaSummary(eventId, event),
    validationIntegrity: await validationIntegritySummary(worldSlug, storySlug, page, receipt, prose.status, repoRoot),
    branchContext: branchContext(page),
    rawSources: await rawSources(worldSlug, storySlug, page, repoRoot),
  };
}
