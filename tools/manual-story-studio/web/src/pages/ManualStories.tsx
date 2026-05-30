import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

interface ManualStoryEntry {
  worldSlug: string;
  manualStorySlug: string;
  absolutePath: string;
  title: string | null;
}

interface ManualStoriesResponse {
  manualStories: ManualStoryEntry[];
}

export function ManualStories() {
  const { worldSlug } = useParams<{ worldSlug: string }>();
  const [stories, setStories] = useState<ManualStoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!worldSlug) return;
    let cancelled = false;
    fetch(`/api/worlds/${encodeURIComponent(worldSlug)}/manual-stories`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(
            `GET /api/worlds/${worldSlug}/manual-stories returned ${response.status}`,
          );
        }
        return (await response.json()) as ManualStoriesResponse;
      })
      .then((body) => {
        if (!cancelled) {
          setStories(body.manualStories);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [worldSlug]);

  if (!worldSlug) {
    return <p role="alert">Missing world slug.</p>;
  }
  if (error !== null) {
    return <p role="alert">Failed to load manual stories: {error}</p>;
  }
  if (stories === null) {
    return <p>Loading manual stories…</p>;
  }

  return (
    <section>
      <h2>Manual stories — {worldSlug}</h2>
      <p>
        <Link to={`/worlds/${worldSlug}/manual-stories/new`}>
          Create manual story
        </Link>
      </p>
      {stories.length === 0 ? (
        <p>No manual stories yet for this world.</p>
      ) : (
        <ul>
          {stories.map((story) => (
            <li key={story.manualStorySlug}>
              <strong>{story.manualStorySlug}</strong>
              {story.title !== null ? ` — ${story.title}` : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
