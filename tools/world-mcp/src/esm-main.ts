import { pathToFileURL } from "node:url";

export function isMainModule(metaUrl: string): boolean {
  const entrypoint = process.argv[1];
  return entrypoint !== undefined && pathToFileURL(entrypoint).href === metaUrl;
}
