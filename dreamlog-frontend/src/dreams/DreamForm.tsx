import { type FormEvent, useState } from "react";

import type { DreamCreateRequest, Mood } from "../api/types";
import { clarityOptions, moodOptions } from "./dreamOptions";

interface DreamFormProps {
  onCreate: (payload: DreamCreateRequest) => Promise<void>;
}

function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
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
      setError("梦境内容至少需要 10 个字符。");
      return;
    }

    if (!dreamDate) {
      setError("请选择梦境日期。");
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
      setError(err instanceof Error ? err.message : "梦境保存失败，请稍后重试。");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="dream-form" noValidate onSubmit={handleSubmit}>
      <label className="dream-form__field dream-form__field--content">
        <span>梦境内容</span>
        <textarea
          name="content"
          onChange={(event) => setContent(event.target.value)}
          placeholder="记录梦里的场景、符号、人物、颜色，以及醒来后仍然停留在心里的感觉..."
          rows={9}
          value={content}
        />
      </label>

      <div className="dream-form__grid">
        <label className="dream-form__field">
          <span>梦境日期</span>
          <input
            name="dream_date"
            onChange={(event) => setDreamDate(event.target.value)}
            required
            type="date"
            value={dreamDate}
          />
        </label>

        <label className="dream-form__field">
          <span>醒来情绪</span>
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
          <span>清晰度</span>
          <input
            aria-label="清晰度"
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
        <legend>发布设置</legend>
        <label>
          <input
            checked={isLucid}
            name="is_lucid"
            onChange={(event) => setIsLucid(event.target.checked)}
            type="checkbox"
          />
          <span>清醒梦</span>
        </label>
        <label>
          <input
            checked={isPublic}
            name="is_public"
            onChange={(event) => setIsPublic(event.target.checked)}
            type="checkbox"
          />
          <span>公开到社区</span>
        </label>
        <label>
          <input
            checked={isAnonymous}
            name="is_anonymous"
            onChange={(event) => setIsAnonymous(event.target.checked)}
            type="checkbox"
          />
          <span>匿名发布</span>
        </label>
      </fieldset>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <button className="primary-action dream-form__submit" disabled={isSaving} type="submit">
        {isSaving ? "保存中..." : "保存梦境"}
      </button>
    </form>
  );
}
