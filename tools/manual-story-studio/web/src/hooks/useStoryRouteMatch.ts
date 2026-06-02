import { useLocation } from "react-router-dom";

export interface StoryRouteMatch {
  worldSlug?: string;
  msSlug?: string;
}

function decodeSegment(segment: string): string | undefined {
  try {
    return decodeURIComponent(segment);
  } catch {
    return undefined;
  }
}

export function parseStoryPath(pathname: string): StoryRouteMatch {
  const parts = pathname.split("/").filter(Boolean);
  if (
    parts[0] !== "worlds" ||
    parts[2] !== "manual-stories" ||
    !parts[1] ||
    !parts[3] ||
    parts[3] === "new"
  ) {
    return {};
  }

  const worldSlug = decodeSegment(parts[1]);
  const msSlug = decodeSegment(parts[3]);
  if (!worldSlug || !msSlug) return {};
  return { worldSlug, msSlug };
}

export function useStoryRouteMatch(): StoryRouteMatch {
  const { pathname } = useLocation();
  return parseStoryPath(pathname);
}
