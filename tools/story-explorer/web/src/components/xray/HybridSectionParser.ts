export type HybridSections = Record<string, string>;

interface ParseSectionsForRecordArgs {
  body: string;
  contentHash: string | null;
  recordId: string;
}

const sectionCache = new Map<string, HybridSections>();

function headingTitle(line: string): string | null {
  const match = /^(#{1,2})[ \t]+(.+?)[ \t]*#*[ \t]*$/.exec(line);
  if (match === null) {
    return null;
  }

  const rawTitle = match[2];
  if (rawTitle === undefined) {
    return null;
  }

  const title = rawTitle
    .trim()
    .replace(/^\*\*(.+)\*\*$/, '$1')
    .replace(/^__(.+)__$/, '$1')
    .trim();

  return title.length > 0 ? title : null;
}

function flushSection(sections: HybridSections, key: string | null, lines: string[]): void {
  if (key === null) {
    return;
  }

  const content = lines.join('\n').trim();
  sections[key] = content;
}

export function parseSections(body: string): HybridSections {
  try {
    if (body.trim().length === 0) {
      return {};
    }

    const sections: HybridSections = {};
    const lines = body.split(/\r?\n/);
    let currentKey: string | null = null;
    let currentLines: string[] = [];
    let sawPrimaryHeading = false;

    for (const line of lines) {
      const title = headingTitle(line);
      if (title !== null) {
        sawPrimaryHeading = true;
        flushSection(sections, currentKey, currentLines);
        currentKey = title;
        currentLines = [];
        continue;
      }

      if (currentKey === null) {
        currentKey = 'Body';
      }
      currentLines.push(line);
    }

    flushSection(sections, currentKey, currentLines);

    if (!sawPrimaryHeading) {
      return { Body: body };
    }

    return sections;
  } catch {
    return body.trim().length === 0 ? {} : { Body: body };
  }
}

export function parseSectionsForRecord({ body, contentHash, recordId }: ParseSectionsForRecordArgs): HybridSections {
  const cacheKey = `${recordId}:${contentHash ?? 'no-hash'}`;
  const cached = sectionCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const sections = parseSections(body);
  sectionCache.set(cacheKey, sections);
  return sections;
}

export function clearHybridSectionCache(): void {
  sectionCache.clear();
}
