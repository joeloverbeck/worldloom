import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  readMetadata as apiReadMetadata,
  updateMetadata as apiUpdateMetadata,
} from "../api/records.js";
import type {
  ManualStoryContentIntensity,
  ManualStoryDialogueDensity,
  ManualStoryInteriority,
  ManualStoryLanguageRegister,
  ManualStoryMetadata,
  ManualStoryParagraphing,
  ManualStoryPov,
  ManualStoryPsychicDistance,
  ManualStoryTense,
  ManualStoryProsePreferences,
  ValidationError,
} from "../types/manual-story.js";

const POV_OPTIONS: ManualStoryPov[] = [
  "first",
  "close third",
  "distant third",
  "omniscient",
];

const TENSE_OPTIONS: ManualStoryTense[] = ["past", "present"];

const CONTENT_INTENSITY_OPTIONS: ManualStoryContentIntensity[] = [
  "general",
  "mature",
  "explicit",
];

const LANGUAGE_REGISTER_OPTIONS: ManualStoryLanguageRegister[] = [
  "casual",
  "literary",
  "formal",
  "period_voice",
  "colloquial",
  "mixed",
];

const PSYCHIC_DISTANCE_OPTIONS: ManualStoryPsychicDistance[] = [
  "deep_close",
  "close",
  "mid",
  "distant",
  "variable",
];

const DIALOGUE_DENSITY_OPTIONS: ManualStoryDialogueDensity[] = [
  "dense",
  "moment_led",
  "sparse",
  "mixed",
];

const INTERIORITY_OPTIONS: ManualStoryInteriority[] = [
  "free_indirect",
  "filtered",
  "minimal",
  "mixed",
];

const PARAGRAPHING_OPTIONS: ManualStoryParagraphing[] = [
  "literary",
  "journalistic",
  "dialogue_led",
  "mixed",
];

export function EditContract() {
  const { worldSlug, msSlug } = useParams<{
    worldSlug: string;
    msSlug: string;
  }>();
  const navigate = useNavigate();
  const [metadata, setMetadata] = useState<ManualStoryMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    ValidationError[] | null
  >(null);

  useEffect(() => {
    if (!worldSlug || !msSlug) return;
    let cancelled = false;
    setLoading(true);
    setLoadFailed(false);
    apiReadMetadata(worldSlug, msSlug)
      .then((m) => {
        if (cancelled) return;
        if (m === null) {
          setLoadFailed(true);
        } else {
          setMetadata(m);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [worldSlug, msSlug]);

  if (!worldSlug || !msSlug) {
    return <p role="alert">Missing world or manual story slug.</p>;
  }

  if (loading) {
    return <p>Loading metadata…</p>;
  }

  if (loadFailed || metadata === null) {
    return <p role="alert">Failed to load metadata.</p>;
  }

  const contract = metadata.story_contract;
  const prose = contract.prose_preferences;

  function updateContract(patch: Partial<ManualStoryMetadata["story_contract"]>) {
    setMetadata((prev) =>
      prev === null
        ? prev
        : {
            ...prev,
            story_contract: { ...prev.story_contract, ...patch },
          },
    );
  }

  function updateProse(patch: Partial<ManualStoryProsePreferences>) {
    setMetadata((prev) =>
      prev === null
        ? prev
        : {
            ...prev,
            story_contract: {
              ...prev.story_contract,
              prose_preferences: {
                ...prev.story_contract.prose_preferences,
                ...patch,
              },
            },
          },
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!worldSlug || !msSlug || metadata === null) return;
    setSubmitting(true);
    setError(null);
    setValidationErrors(null);
    try {
      const result = await apiUpdateMetadata(worldSlug, msSlug, metadata);
      if (result.ok) {
        navigate(`/worlds/${worldSlug}/manual-stories/${msSlug}/dashboard`);
        return;
      }
      const suffix = result.message ? `: ${result.message}` : "";
      setError(`${result.status} ${result.error}${suffix}`);
      setValidationErrors(result.errors ?? null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <h2>Story contract for {msSlug}</h2>
      <form onSubmit={handleSubmit}>
        <p>
          <label>
            Premise:
            <br />
            <textarea
              value={contract.premise}
              onChange={(e) => updateContract({ premise: e.target.value })}
              rows={4}
              style={{ width: "100%" }}
            />
          </label>
        </p>
        <p>
          <label>
            Tone:
            <input
              type="text"
              value={contract.tone}
              onChange={(e) => updateContract({ tone: e.target.value })}
            />
          </label>
        </p>
        <p>
          <label>
            POV:
            <select
              value={contract.pov}
              onChange={(e) =>
                updateContract({ pov: e.target.value as ManualStoryPov })
              }
            >
              {POV_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
        </p>
        <p>
          <label>
            Tense:
            <select
              value={contract.tense}
              onChange={(e) =>
                updateContract({ tense: e.target.value as ManualStoryTense })
              }
            >
              {TENSE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
        </p>
        <p>
          <label>
            Content intensity:
            <select
              value={contract.content_intensity}
              onChange={(e) =>
                updateContract({
                  content_intensity: e.target.value as ManualStoryContentIntensity,
                })
              }
            >
              {CONTENT_INTENSITY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
        </p>
        <p>
          <label>
            Explicitness:
            <input
              type="text"
              value={contract.explicitness}
              onChange={(e) => updateContract({ explicitness: e.target.value })}
            />
          </label>
        </p>
        <p>
          <label>
            Language register:
            <select
              value={contract.language_register}
              onChange={(e) =>
                updateContract({
                  language_register: e.target.value as ManualStoryLanguageRegister,
                })
              }
            >
              {LANGUAGE_REGISTER_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
        </p>
        <fieldset>
          <legend>Prose preferences</legend>
          <p>
            <label>
              Psychic distance:
              <select
                value={prose.psychic_distance}
                onChange={(e) =>
                  updateProse({
                    psychic_distance: e.target.value as ManualStoryPsychicDistance,
                  })
                }
              >
                {PSYCHIC_DISTANCE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
          </p>
          <p>
            <label>
              Dialogue density:
              <select
                value={prose.dialogue_density}
                onChange={(e) =>
                  updateProse({
                    dialogue_density: e.target.value as ManualStoryDialogueDensity,
                  })
                }
              >
                {DIALOGUE_DENSITY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
          </p>
          <p>
            <label>
              Interiority:
              <select
                value={prose.interiority}
                onChange={(e) =>
                  updateProse({
                    interiority: e.target.value as ManualStoryInteriority,
                  })
                }
              >
                {INTERIORITY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
          </p>
          <p>
            <label>
              Paragraphing:
              <select
                value={prose.paragraphing}
                onChange={(e) =>
                  updateProse({
                    paragraphing: e.target.value as ManualStoryParagraphing,
                  })
                }
              >
                {PARAGRAPHING_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
          </p>
        </fieldset>
        {error !== null ? <p role="alert">{error}</p> : null}
        {validationErrors !== null && validationErrors.length > 0 ? (
          <ul>
            {validationErrors.map((e, idx) => (
              <li key={`${e.field}-${idx}`}>
                {e.field}: {e.message}
              </li>
            ))}
          </ul>
        ) : null}
        <p>
          <button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : "Save contract"}
          </button>
        </p>
      </form>
    </section>
  );
}
