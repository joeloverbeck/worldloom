import { unified } from "unified";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import type { Root } from "mdast";

const markdownProcessor = unified().use(remarkParse).use(remarkGfm);

export interface ParsedMarkdown {
  tree: Root;
  lines: string[];
}

export function parseMarkdown(source: string): ParsedMarkdown {
  const tree = markdownProcessor.parse(source) as Root;
  const lines = source.split(/\r?\n/);
  return { tree, lines };
}
