import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

interface WorldEntry {
  worldSlug: string;
  absolutePath: string;
  hasWorldKernel: boolean;
}

interface WorldsResponse {
  worlds: WorldEntry[];
}

export function Worlds() {
  const [worlds, setWorlds] = useState<WorldEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/worlds")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`GET /api/worlds returned ${response.status}`);
        }
        return (await response.json()) as WorldsResponse;
      })
      .then((body) => {
        if (!cancelled) {
          setWorlds(body.worlds);
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
  }, []);

  if (error !== null) {
    return <p role="alert">Failed to load worlds: {error}</p>;
  }
  if (worlds === null) {
    return <p>Loading worlds…</p>;
  }
  if (worlds.length === 0) {
    return <p>No worlds found.</p>;
  }

  return (
    <section>
      <h2>Worlds</h2>
      <ul>
        {worlds.map((world) => (
          <li key={world.worldSlug}>
            <Link to={`/worlds/${world.worldSlug}/manual-stories`}>
              {world.worldSlug}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
