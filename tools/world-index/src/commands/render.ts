import { openExistingWorldIndex } from "./shared";

interface StoryRenderRow {
  node_id: string;
  node_type: string;
  heading_path: string | null;
  body: string;
  file_path: string;
}

export function render(
  worldRoot: string,
  worldSlug: string,
  options: { storySlug?: string }
): number {
  if (!options.storySlug) {
    console.error("render requires --story <story-slug> in this build.");
    return 1;
  }

  const opened = openExistingWorldIndex(worldRoot, worldSlug);
  if (opened instanceof Error) {
    console.error(opened.message);
    return 1;
  }

  try {
    const rows = opened
      .prepare(
        `
          SELECT node_id, node_type, heading_path, body, file_path
          FROM nodes
          WHERE world_slug = ?
            AND story_slug = ?
          ORDER BY file_path, node_id
        `
      )
      .all(worldSlug, options.storySlug) as StoryRenderRow[];

    if (rows.length === 0) {
      console.error(`No indexed story-bundle records found for '${worldSlug}/${options.storySlug}'.`);
      return 1;
    }

    process.stdout.write(`# Story Bundle: ${options.storySlug}\n\n`);
    for (const row of rows) {
      process.stdout.write(`## ${row.heading_path ?? row.node_id}\n\n`);
      process.stdout.write(`- node_id: ${row.node_id}\n`);
      process.stdout.write(`- node_type: ${row.node_type}\n`);
      process.stdout.write(`- file_path: ${row.file_path}\n\n`);
      process.stdout.write("```yaml\n");
      process.stdout.write(row.body.endsWith("\n") ? row.body : `${row.body}\n`);
      process.stdout.write("```\n\n");
    }

    return 0;
  } finally {
    opened.close();
  }
}
