import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import YAML from "yaml";

import { openIndexDb } from "../db";
import { resolveRepoRoot, resolveWorldDirectory } from "../db/path";
import { createMcpError } from "../errors";
import type { McpError } from "../errors";

export const ID_CLASS_FORMATS = {
  CF: { width: 4, zeroPad: true, regex: /^CF-(\d{4})$/ },
  CH: { width: 4, zeroPad: true, regex: /^CH-(\d{4})$/ },
  PA: { width: 4, zeroPad: true, regex: /^PA-(\d{4})$/ },
  CHAR: { width: 4, zeroPad: true, regex: /^CHAR-(\d{4})$/ },
  DA: { width: 4, zeroPad: true, regex: /^DA-(\d{4})$/ },
  PR: { width: 4, zeroPad: true, regex: /^PR-(\d{4})$/ },
  BATCH: { width: 4, zeroPad: true, regex: /^BATCH-(\d{4})$/ },
  NWB: { width: 4, zeroPad: true, regex: /^NWB-(\d{4})$/ },
  NWP: { width: 4, zeroPad: true, regex: /^NWP-(\d{4})$/ },
  NCP: { width: 4, zeroPad: true, regex: /^NCP-(\d{4})$/ },
  NCB: { width: 4, zeroPad: true, regex: /^NCB-(\d{4})$/ },
  AU: { width: 4, zeroPad: true, regex: /^AU-(\d{4})$/ },
  RP: { width: 4, zeroPad: true, regex: /^RP-(\d{4})$/ },
  RSP: { width: 4, zeroPad: true, regex: /^RSP-(\d{4})(?:-.+)?$/ },
  SAU: { width: 4, zeroPad: true, regex: /^SAU-(\d{4})(?:-.+)?$/ },
  SP: { width: 4, zeroPad: true, regex: /^SP-(\d{4})(?:-proposal-package)?$/ },
  EPE: { width: 4, zeroPad: true, regex: /^EPE-(\d{4})$/ },
  STORY: { width: 4, zeroPad: true, regex: /^STORY-(\d{4})$/ },
  PG: { width: 4, zeroPad: true, regex: /^PG-(\d{4})$/ },
  SE: { width: 4, zeroPad: true, regex: /^SE-(\d{4})$/ },
  SF: { width: 4, zeroPad: true, regex: /^SF-(\d{4})$/ },
  BEL: { width: 4, zeroPad: true, regex: /^BEL-(\d{4})$/ },
  OBL: { width: 4, zeroPad: true, regex: /^OBL-(\d{4})$/ },
  CNSQ: { width: 4, zeroPad: true, regex: /^CNSQ-(\d{4})$/ },
  THR: { width: 4, zeroPad: true, regex: /^THR-(\d{4})$/ },
  SREL: { width: 4, zeroPad: true, regex: /^SREL-(\d{4})$/ },
  STINT: { width: 4, zeroPad: true, regex: /^STINT-(\d{4})$/ },
  SLT: { width: 4, zeroPad: true, regex: /^SLT-(\d{4})$/ },
  SLB: { width: 4, zeroPad: true, regex: /^SLB-(\d{4})$/ },
  STLOC: { width: 4, zeroPad: true, regex: /^STLOC-(\d{4})$/ },
  STOBJ: { width: 4, zeroPad: true, regex: /^STOBJ-(\d{4})$/ },
  BR: { width: 4, zeroPad: true, regex: /^BR-(\d{4})$/ },
  CHC: { width: 4, zeroPad: true, regex: /^CHC-(\d{4})$/ },
  STENT: { width: 4, zeroPad: true, regex: /^STENT-(\d{4})$/ },
  M: { width: 1, zeroPad: false, regex: /^M-(\d+)$/ },
  ONT: { width: 1, zeroPad: false, regex: /^ONT-(\d+)$/ },
  CAU: { width: 1, zeroPad: false, regex: /^CAU-(\d+)$/ },
  DIS: { width: 1, zeroPad: false, regex: /^DIS-(\d+)$/ },
  SOC: { width: 1, zeroPad: false, regex: /^SOC-(\d+)$/ },
  AES: { width: 1, zeroPad: false, regex: /^AES-(\d+)$/ },
  OQ: { width: 4, zeroPad: true, regex: /^OQ-(\d{4})$/ },
  ENT: { width: 4, zeroPad: true, regex: /^ENT-(\d{4})$/ },
  "SEC-ELF": { width: 3, zeroPad: true, regex: /^SEC-ELF-(\d{3})$/ },
  "SEC-INS": { width: 3, zeroPad: true, regex: /^SEC-INS-(\d{3})$/ },
  "SEC-MTS": { width: 3, zeroPad: true, regex: /^SEC-MTS-(\d{3})$/ },
  "SEC-GEO": { width: 3, zeroPad: true, regex: /^SEC-GEO-(\d{3})$/ },
  "SEC-ECR": { width: 3, zeroPad: true, regex: /^SEC-ECR-(\d{3})$/ },
  "SEC-PAS": { width: 3, zeroPad: true, regex: /^SEC-PAS-(\d{3})$/ },
  "SEC-TML": { width: 3, zeroPad: true, regex: /^SEC-TML-(\d{3})$/ }
} as const;

export type IdClass = keyof typeof ID_CLASS_FORMATS;

export interface AllocateNextIdArgs {
  world_slug: string;
  id_class: IdClass;
  story_slug?: string;
  audit_id?: string;
}

export interface AllocateNextIdResponse {
  next_id: string;
}

const PIPELINE_WORLD_SLUG = "__pipeline__";
const PIPELINE_ID_CLASSES = new Set<IdClass>(["NWB", "NWP"]);
const PRESSURE_EVENT_ID_CLASSES = new Set<IdClass>(["EPE"]);
const STORY_ID_CLASSES = new Set<IdClass>(["STORY"]);
const STORY_SCOPED_ID_CLASS_DIRECTORIES = {
  PG: "pages",
  SE: "events",
  SF: "facts",
  BEL: "beliefs",
  OBL: "obligations",
  CNSQ: "consequences",
  THR: "threads",
  SREL: "relationships",
  STINT: "intentions",
  SLT: "storylets",
  SLB: "storylet-batches",
  SAU: "audits",
  SP: "story-promotions",
  STLOC: "locations",
  STOBJ: "objects",
  BR: "branches",
  CHC: "choices",
  STENT: "entities",
  DA: "artifacts"
} as const satisfies Partial<Record<IdClass, string>>;

type StoryScopedIdClass = keyof typeof STORY_SCOPED_ID_CLASS_DIRECTORIES;

const SUB_AUDIT_SCOPED_ID_CLASS_DIRECTORIES = {
  RSP: "remediation-storylet-proposals"
} as const satisfies Partial<Record<IdClass, string>>;

type SubAuditScopedIdClass = keyof typeof SUB_AUDIT_SCOPED_ID_CLASS_DIRECTORIES;

function isIdClass(value: string): value is IdClass {
  return value in ID_CLASS_FORMATS;
}

function isPipelineIdClass(value: IdClass): boolean {
  return PIPELINE_ID_CLASSES.has(value);
}

function isStoryScopedIdClass(value: IdClass): value is StoryScopedIdClass {
  return value in STORY_SCOPED_ID_CLASS_DIRECTORIES;
}

function isSubAuditScopedIdClass(value: IdClass): value is SubAuditScopedIdClass {
  return value in SUB_AUDIT_SCOPED_ID_CLASS_DIRECTORIES;
}

function formatNumericValue(value: number, width: number, zeroPad: boolean): string {
  return zeroPad ? String(value).padStart(width, "0") : String(value);
}

function findHighestPipelineId(idClass: IdClass): number {
  const format = ID_CLASS_FORMATS[idClass];
  const relativeDirectory =
    idClass === "NWB" ? path.join("world-proposals", "batches") : "world-proposals";
  const directory = path.join(resolveRepoRoot(), relativeDirectory);
  let maxValue = 0;

  let fileNames: string[];
  try {
    fileNames = readdirSync(directory);
  } catch {
    return maxValue;
  }

  for (const fileName of fileNames) {
    if (!fileName.endsWith(".md")) {
      continue;
    }

    const stem = fileName.slice(0, -".md".length);
    const idCandidate = idClass === "NWP" ? stem.slice(0, "NWP-0000".length) : stem;
    const match = format.regex.exec(idCandidate);
    if (match === null) {
      continue;
    }

    const parsedValue = Number.parseInt(match[1] ?? "", 10);
    if (Number.isNaN(parsedValue)) {
      continue;
    }

    maxValue = Math.max(maxValue, parsedValue);
  }

  return maxValue;
}

function findHighestPressureEventId(worldSlug: string): number | McpError {
  const worldDirectory = resolveWorldDirectory(worldSlug);
  if (!existsSync(worldDirectory)) {
    return createMcpError("world_not_found", `World '${worldSlug}' does not exist.`, {
      world_slug: worldSlug
    });
  }

  const format = ID_CLASS_FORMATS.EPE;
  const directory = path.join(worldDirectory, "pressure-events");
  let maxValue = 0;

  let fileNames: string[];
  try {
    fileNames = readdirSync(directory);
  } catch {
    return maxValue;
  }

  for (const fileName of fileNames) {
    if (!fileName.endsWith(".md") || fileName.endsWith(".proposal.md")) {
      continue;
    }

    const idCandidate = fileName.slice(0, "EPE-0000".length);
    const match = format.regex.exec(idCandidate);
    if (match === null) {
      continue;
    }

    const parsedValue = Number.parseInt(match[1] ?? "", 10);
    if (Number.isNaN(parsedValue)) {
      continue;
    }

    maxValue = Math.max(maxValue, parsedValue);
  }

  return maxValue;
}

function extractFrontmatter(raw: string): string | null {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(raw);
  return match?.[1] ?? null;
}

function extractStoryIdFromKernel(kernelPath: string): string | null {
  let raw: string;
  try {
    raw = readFileSync(kernelPath, "utf8");
  } catch {
    return null;
  }

  const frontmatter = extractFrontmatter(raw);
  if (frontmatter === null) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = YAML.parse(frontmatter);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return null;
  }

  const storyId = (parsed as Record<string, unknown>).story_id;
  return typeof storyId === "string" ? storyId : null;
}

function findHighestStoryId(worldSlug: string): number | McpError {
  const worldDirectory = resolveWorldDirectory(worldSlug);
  if (!existsSync(worldDirectory)) {
    return createMcpError("world_not_found", `World '${worldSlug}' does not exist.`, {
      world_slug: worldSlug
    });
  }

  const format = ID_CLASS_FORMATS.STORY;
  const directory = path.join(worldDirectory, "stories");
  let maxValue = 0;

  let entries: Array<{ name: string; isDirectory: () => boolean }>;
  try {
    entries = readdirSync(directory, { withFileTypes: true });
  } catch {
    return maxValue;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const storyId = extractStoryIdFromKernel(path.join(directory, entry.name, "STORY_KERNEL.md"));
    if (storyId === null) {
      continue;
    }

    const match = format.regex.exec(storyId);
    if (match === null) {
      continue;
    }

    const parsedValue = Number.parseInt(match[1] ?? "", 10);
    if (Number.isNaN(parsedValue)) {
      continue;
    }

    maxValue = Math.max(maxValue, parsedValue);
  }

  return maxValue;
}

function findHighestStoryScopedId(
  worldSlug: string,
  storySlug: string,
  idClass: StoryScopedIdClass
): number | McpError {
  const worldDirectory = resolveWorldDirectory(worldSlug);
  if (!existsSync(worldDirectory)) {
    return createMcpError("world_not_found", `World '${worldSlug}' does not exist.`, {
      world_slug: worldSlug
    });
  }

  const storyDirectory = path.join(worldDirectory, "stories", storySlug);
  if (!existsSync(storyDirectory)) {
    return 0;
  }

  const format = ID_CLASS_FORMATS[idClass];
  const directStoryDirectoryClasses = new Set<StoryScopedIdClass>(["SLB", "SAU", "SP"]);
  const directory =
    directStoryDirectoryClasses.has(idClass)
      ? path.join(storyDirectory, STORY_SCOPED_ID_CLASS_DIRECTORIES[idClass])
      : path.join(storyDirectory, "_source", STORY_SCOPED_ID_CLASS_DIRECTORIES[idClass]);
  const extensions =
    idClass === "SP"
      ? [".md", ".yaml"]
      : directStoryDirectoryClasses.has(idClass)
        ? [".md"]
        : [".yaml"];
  let maxValue = 0;

  let fileNames: string[];
  try {
    fileNames = readdirSync(directory);
  } catch {
    return maxValue;
  }

  for (const fileName of fileNames) {
    const extension = extensions.find((candidate) => fileName.endsWith(candidate));
    if (extension === undefined) {
      continue;
    }

    const stem = fileName.slice(0, -extension.length);
    const match = format.regex.exec(stem);
    if (match === null) {
      continue;
    }

    const parsedValue = Number.parseInt(match[1] ?? "", 10);
    if (Number.isNaN(parsedValue)) {
      continue;
    }

    maxValue = Math.max(maxValue, parsedValue);
  }

  return maxValue;
}

function findHighestSubAuditScopedId(
  worldSlug: string,
  storySlug: string,
  auditId: string,
  idClass: SubAuditScopedIdClass
): number | McpError {
  const worldDirectory = resolveWorldDirectory(worldSlug);
  if (!existsSync(worldDirectory)) {
    return createMcpError("world_not_found", `World '${worldSlug}' does not exist.`, {
      world_slug: worldSlug
    });
  }

  const storyDirectory = path.join(worldDirectory, "stories", storySlug);
  if (!existsSync(storyDirectory)) {
    return createMcpError(
      "invalid_input",
      `Story '${storySlug}' does not exist in world '${worldSlug}'.`,
      { world_slug: worldSlug, story_slug: storySlug }
    );
  }

  if (!/^SAU-\d{4}$/.test(auditId)) {
    return createMcpError(
      "invalid_input",
      `audit_id must match pattern 'SAU-NNNN'; got '${auditId}'.`,
      { audit_id: auditId }
    );
  }

  const format = ID_CLASS_FORMATS[idClass];
  const directory = path.join(
    storyDirectory,
    "audits",
    auditId,
    SUB_AUDIT_SCOPED_ID_CLASS_DIRECTORIES[idClass]
  );
  let maxValue = 0;

  let fileNames: string[];
  try {
    fileNames = readdirSync(directory);
  } catch {
    return maxValue;
  }

  for (const fileName of fileNames) {
    if (!fileName.endsWith(".md")) {
      continue;
    }

    const stem = fileName.slice(0, -".md".length);
    const match = format.regex.exec(stem);
    if (match === null) {
      continue;
    }

    const parsedValue = Number.parseInt(match[1] ?? "", 10);
    if (Number.isNaN(parsedValue)) {
      continue;
    }

    maxValue = Math.max(maxValue, parsedValue);
  }

  return maxValue;
}

export async function allocateNextId(
  args: AllocateNextIdArgs
): Promise<AllocateNextIdResponse | McpError> {
  if (!isIdClass(args.id_class)) {
    throw new Error(`Unsupported id_class '${args.id_class}'.`);
  }

  const format = ID_CLASS_FORMATS[args.id_class];
  const pipelineIdClass = isPipelineIdClass(args.id_class);
  const storySlug = args.story_slug?.trim();
  const hasStorySlug = storySlug !== undefined && storySlug.length > 0;
  const auditId = args.audit_id?.trim();
  const hasAuditId = auditId !== undefined && auditId.length > 0;
  const storyScopedIdClass =
    isStoryScopedIdClass(args.id_class) && (args.id_class !== "DA" || hasStorySlug)
      ? args.id_class
      : null;
  const subAuditScopedIdClass = isSubAuditScopedIdClass(args.id_class) ? args.id_class : null;

  if (pipelineIdClass && args.world_slug !== PIPELINE_WORLD_SLUG) {
    return createMcpError(
      "invalid_input",
      `id_class '${args.id_class}' is pipeline-scoped and requires world_slug '${PIPELINE_WORLD_SLUG}'.`,
      { required_world_slug: PIPELINE_WORLD_SLUG, id_class: args.id_class }
    );
  }

  if (!pipelineIdClass && args.world_slug === PIPELINE_WORLD_SLUG) {
    return createMcpError(
      "invalid_input",
      `world_slug '${PIPELINE_WORLD_SLUG}' is only valid for pipeline-scoped id_class values: NWB, NWP.`,
      { pipeline_id_classes: [...PIPELINE_ID_CLASSES].sort() }
    );
  }

  if (pipelineIdClass && hasStorySlug) {
    return createMcpError(
      "invalid_input",
      `id_class '${args.id_class}' is pipeline-scoped and does not accept story_slug.`,
      { id_class: args.id_class, story_slug: storySlug }
    );
  }

  if (hasAuditId && subAuditScopedIdClass === null) {
    return createMcpError(
      "invalid_input",
      `id_class '${args.id_class}' is not sub-audit-scoped and does not accept audit_id.`,
      { id_class: args.id_class, audit_id: auditId }
    );
  }

  if (hasStorySlug && storyScopedIdClass === null && subAuditScopedIdClass === null) {
    return createMcpError(
      "invalid_input",
      `id_class '${args.id_class}' is world-scoped and does not accept story_slug.`,
      { id_class: args.id_class, story_slug: storySlug }
    );
  }

  if (!hasStorySlug && (storyScopedIdClass !== null || subAuditScopedIdClass !== null)) {
    return createMcpError(
      "invalid_input",
      `story-scoped id_class '${args.id_class}' requires story_slug.`,
      { id_class: args.id_class }
    );
  }

  if (subAuditScopedIdClass !== null && !hasAuditId) {
    return createMcpError(
      "invalid_input",
      `sub-audit-scoped id_class '${args.id_class}' requires audit_id.`,
      { id_class: args.id_class }
    );
  }

  if (pipelineIdClass) {
    const nextValue = findHighestPipelineId(args.id_class) + 1;
    return {
      next_id: `${args.id_class}-${formatNumericValue(nextValue, format.width, format.zeroPad)}`
    };
  }

  if (PRESSURE_EVENT_ID_CLASSES.has(args.id_class)) {
    const highestValue = findHighestPressureEventId(args.world_slug);
    if (typeof highestValue !== "number") {
      return highestValue;
    }

    const nextValue = highestValue + 1;
    return {
      next_id: `${args.id_class}-${formatNumericValue(nextValue, format.width, format.zeroPad)}`
    };
  }

  if (STORY_ID_CLASSES.has(args.id_class)) {
    const highestValue = findHighestStoryId(args.world_slug);
    if (typeof highestValue !== "number") {
      return highestValue;
    }

    const nextValue = highestValue + 1;
    return {
      next_id: `${args.id_class}-${formatNumericValue(nextValue, format.width, format.zeroPad)}`
    };
  }

  if (storyScopedIdClass !== null && storySlug !== undefined) {
    const highestValue = findHighestStoryScopedId(args.world_slug, storySlug, storyScopedIdClass);
    if (typeof highestValue !== "number") {
      return highestValue;
    }

    const nextValue = highestValue + 1;
    return {
      next_id: `${args.id_class}-${formatNumericValue(nextValue, format.width, format.zeroPad)}`
    };
  }

  if (subAuditScopedIdClass !== null && storySlug !== undefined && auditId !== undefined) {
    const highestValue = findHighestSubAuditScopedId(
      args.world_slug,
      storySlug,
      auditId,
      subAuditScopedIdClass
    );
    if (typeof highestValue !== "number") {
      return highestValue;
    }

    const nextValue = highestValue + 1;
    return {
      next_id: `${args.id_class}-${formatNumericValue(nextValue, format.width, format.zeroPad)}`
    };
  }

  const opened = openIndexDb(args.world_slug);
  if (!("db" in opened)) {
    return opened;
  }

  try {
    const rows = opened.db
      .prepare(
        `
          SELECT node_id
          FROM nodes
          WHERE world_slug = ?
          ORDER BY node_id
        `
      )
      .all(args.world_slug) as Array<{ node_id: string }>;

    let maxValue = 0;

    for (const row of rows) {
      const match = format.regex.exec(row.node_id);
      if (match === null) {
        continue;
      }

      const parsedValue = Number.parseInt(match[1] ?? "", 10);
      if (Number.isNaN(parsedValue)) {
        continue;
      }

      maxValue = Math.max(maxValue, parsedValue);
    }

    const nextValue = maxValue + 1;
    return {
      next_id: `${args.id_class}-${formatNumericValue(nextValue, format.width, format.zeroPad)}`
    };
  } finally {
    opened.db.close();
  }
}
