export interface WorldSourceItemSummary {
  kind: string;
  path: string;
  title?: string;
  name?: string;
  tags: string[];
  class?: string;
  error?: {
    code: string;
    path: string;
    repair_hint: string;
  };
}

export interface WorldSourceItem extends WorldSourceItemSummary {
  raw_text: string;
}

const enc = encodeURIComponent;

function sourceBase(worldSlug: string): string {
  return `/api/worlds/${enc(worldSlug)}/source`;
}

export async function listWorldSourceItems(
  worldSlug: string,
): Promise<WorldSourceItemSummary[]> {
  const response = await fetch(sourceBase(worldSlug));
  if (!response.ok) throw new Error(`listWorldSourceItems → ${response.status}`);
  const body = (await response.json()) as { items: WorldSourceItemSummary[] };
  return body.items;
}

export async function readWorldSourceItem(
  worldSlug: string,
  itemPath: string,
): Promise<WorldSourceItem | null> {
  const url = new URL(`${sourceBase(worldSlug)}/item`, window.location.origin);
  url.searchParams.set("path", itemPath);
  const response = await fetch(url.pathname + url.search);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`readWorldSourceItem → ${response.status}`);
  const body = (await response.json()) as { item: WorldSourceItem };
  return body.item;
}
