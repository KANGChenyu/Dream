import { type FormEvent, useState } from "react";

import type { DreamCreateRequest, Mood } from "../api/types";
import { clarityOptions, moodOptions } from "./dreamOptions";

interface DreamFormProps {
  onCreate: (payload: DreamCreateRequest) => Promise<void>;
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

export function DreamForm({ onCreate }: DreamFormProps) {
  const [content, setContent] = useState("");
  const [dreamDate, setDreamDate] = useState(getToday);
  const [mood, setMood] = useState<Mood>("calm");
  const [clarity, setClarity] = useState(3);
  const [isLucid, setIsLucid] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const trimmedContent = content.trim();
    if (trimmedContent.length < 10) {
      setError("Dream content must be at least 10 characters.");
      return;
    }

    setIsSaving(true);
    try {
      await onCreate({
        content: trimmedContent,
        dream_date: dreamDate,
        mood,
        clarity,
        is_lucid: isLucid,
        is_public: isPublic,
        is_anonymous: isAnonymous
      });
      setContent("");
      setMood("calm");
      setClarity(3);
      setIsLucid(false);
      setIsPublic(false);
      setIsAnonymous(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save this dream.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="dream-form" onSubmit={handleSubmit}>
      <label className="dream-form__field dream-form__field--content">
        <span>Dream content</span>
        <textarea
          name="content"
          onChange={(event) => setContent(event.target.value)}
          placeholder="Record the setting, symbols, people, colors, and what stayed with you after waking..."
          rows={9}
          value={content}
        />
      </label>

      <div className="dream-form__grid">
        <label className="dream-form__field">
          <span>Dream date</span>
          <input
            name="dream_date"
            onChange={(event) => setDreamDate(event.target.value)}
            type="date"
            value={dreamDate}
          />
        </label>

        <label className="dream-form__field">
          <span>Mood</span>
          <select
            name="mood"
            onChange={(event) => setMood(event.target.value as Mood)}
            value={mood}
          >
            {moodOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="dream-form__field">
          <span>Clarity</span>
          <input
            aria-label="Clarity"
            max={5}
            min={1}
            name="clarity"
            onChange={(event) => setClarity(Number(event.target.value))}
            type="number"
            value={clarity}
          />
          <small>{clarityOptions.find((option) => option.value === clarity)?.label}</small>
        </label>
      </div>

      <fieldset className="dream-form__toggles">
        <legend>Publishing</legend>
        <label>
          <input
            checked={isLucid}
            name="is_lucid"
            onChange={(event) => setIsLucid(event.target.checked)}
            type="checkbox"
          />
          <span>Lucid dream</span>
        </label>
        <label>
          <input
            checked={isPublic}
            name="is_public"
            onChange={(event) => setIsPublic(event.target.checked)}
            type="checkbox"
          />
          <span>Share publicly</span>
        </label>
        <label>
          <input
            checked={isAnonymous}
            name="is_anonymous"
            onChange={(event) => setIsAnonymous(event.target.checked)}
            type="checkbox"
          />
          <span>Post anonymously</span>
        </label>
      </fieldset>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <button className="primary-action dream-form__submit" disabled={isSaving} type="submit">
        {isSaving ? "Saving..." : "Save dream"}
      </button>
    </form>
  );
}
