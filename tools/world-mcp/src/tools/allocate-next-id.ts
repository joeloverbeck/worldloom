import { readdirSync } from "node:fs";
import path from "node:path";

import { openIndexDb } from "../db";
import { resolveRepoRoot } from "../db/path";
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
}

export interface AllocateNextIdResponse {
  next_id: string;
}

const PIPELINE_WORLD_SLUG = "__pipeline__";
const PIPELINE_ID_CLASSES = new Set<IdClass>(["NWB", "NWP"]);

function isIdClass(value: string): value is IdClass {
  return value in ID_CLASS_FORMATS;
}

function isPipelineIdClass(value: IdClass): boolean {
  return PIPELINE_ID_CLASSES.has(value);
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

export async function allocateNextId(
  args: AllocateNextIdArgs
): Promise<AllocateNextIdResponse | McpError> {
  if (!isIdClass(args.id_class)) {
    throw new Error(`Unsupported id_class '${args.id_class}'.`);
  }

  const format = ID_CLASS_FORMATS[args.id_class];
  const pipelineIdClass = isPipelineIdClass(args.id_class);

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

  if (pipelineIdClass) {
    const nextValue = findHighestPipelineId(args.id_class) + 1;
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
