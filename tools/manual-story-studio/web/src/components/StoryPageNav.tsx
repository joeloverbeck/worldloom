import { Link, NavLink } from "react-router-dom";

import { useStoryRouteMatch } from "../hooks/useStoryRouteMatch.js";

const STORY_PAGES = [
  { label: "Dashboard", path: "dashboard" },
  { label: "Current State", path: "current-context/edit" },
  { label: "Cast", path: "cast" },
  { label: "Records", path: "records" },
  { label: "Beat Templates", path: "beat-templates" },
  { label: "Moment Composer", path: "moment-composer" },
  { label: "Prompt Preview", path: "prompts/preview" },
  { label: "Prompt History", path: "prompt-history" },
  { label: "Paste Prose", path: "paste-prose" },
  { label: "Manuscript", path: "manuscript" },
  { label: "Edit Contract", path: "contract" },
  { label: "Repair", path: "repair" },
];

function storyBasePath(worldSlug: string, msSlug: string): string {
  return `/worlds/${encodeURIComponent(worldSlug)}/manual-stories/${encodeURIComponent(
    msSlug,
  )}`;
}

export function StoryPageNav() {
  const { worldSlug, msSlug } = useStoryRouteMatch();
  if (!worldSlug || !msSlug) return null;

  const basePath = storyBasePath(worldSlug, msSlug);

  return (
    <nav className="story-page-nav" aria-label="Story pages">
      <Link className="story-page-nav__home" to="/">
        Worlds
      </Link>
      <div className="story-page-nav__tabs">
        {STORY_PAGES.map((page) => (
          <NavLink
            key={page.path}
            to={`${basePath}/${page.path}`}
            end
            className={({ isActive }) =>
              isActive
                ? "story-page-nav__tab story-page-nav__tab--active"
                : "story-page-nav__tab"
            }
          >
            {page.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
