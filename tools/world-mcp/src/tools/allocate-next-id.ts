import { openIndexDb } from "../db";
import type { McpError } from "../errors";

export const ID_CLASS_FORMATS = {
  CF: { width: 4, zeroPad: true, regex: /^CF-(\d{4})$/ },
  CH: { width: 4, zeroPad: true, regex: /^CH-(\d{4})$/ },
  PA: { width: 4, zeroPad: true, regex: /^PA-(\d{4})$/ },
  CHAR: { width: 4, zeroPad: true, regex: /^CHAR-(\d{4})$/ },
  DA: { width: 4, zeroPad: true, regex: /^DA-(\d{4})$/ },
  PR: { width: 4, zeroPad: true, regex: /^PR-(\d{4})$/ },
  BATCH: { width: 4, zeroPad: true, regex: /^BATCH-(\d{4})$/ },
  NCP: { width: 4, zeroPad: true, regex: /^NCP-(\d{4})$/ },
  NCB: { width: 4, zeroPad: true, regex: /^NCB-(\d{4})$/ },
  AU: { width: 4, zeroPad: true, regex: /^AU-(\d{4})$/ },
  RP: { width: 4, zeroPad: true, regex: /^RP-(\d{4})$/ },
  M: { width: 1, zeroPad: false, regex: /^M-(\d+)$/ }
} as const;

export type IdClass = keyof typeof ID_CLASS_FORMATS;

export interface AllocateNextIdArgs {
  world_slug: string;
  id_class: IdClass;
}

export interface AllocateNextIdResponse {
  next_id: string;
}

function isIdClass(value: string): value is IdClass {
  return value in ID_CLASS_FORMATS;
}

function formatNumericValue(value: number, width: number, zeroPad: boolean): string {
  return zeroPad ? String(value).padStart(width, "0") : String(value);
}

export async function allocateNextId(
  args: AllocateNextIdArgs
): Promise<AllocateNextIdResponse | McpError> {
  if (!isIdClass(args.id_class)) {
    throw new Error(`Unsupported id_class '${args.id_class}'.`);
  }

  const format = ID_CLASS_FORMATS[args.id_class];
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
