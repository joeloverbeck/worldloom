import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export function CreateManualStory() {
  const { worldSlug } = useParams<{ worldSlug: string }>();
  const navigate = useNavigate();
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!worldSlug) {
    return <p role="alert">Missing world slug.</p>;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!worldSlug) return;
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/worlds/${encodeURIComponent(worldSlug)}/manual-stories`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, title }),
        },
      );
      if (response.status === 201) {
        navigate(`/worlds/${worldSlug}/manual-stories`);
        return;
      }
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      setError(
        `${response.status} ${body.error ?? "error"}: ${body.message ?? "Unknown error"}`,
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <h2>Create manual story in {worldSlug}</h2>
      <form onSubmit={handleSubmit}>
        <p>
          <label>
            Slug (lowercase letters, digits, hyphens):
            <input
              type="text"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              pattern="[a-z0-9\-]+"
              required
            />
          </label>
        </p>
        <p>
          <label>
            Title:
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </label>
        </p>
        {error !== null ? (
          <p role="alert">{error}</p>
        ) : null}
        <p>
          <button type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create"}
          </button>
        </p>
      </form>
    </section>
  );
}
