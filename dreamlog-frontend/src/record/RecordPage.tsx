import { ArrowLeft, Save, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { type FormEvent, useMemo, useState } from "react";

import { api } from "../api/client";
import type { DreamCreateRequest, DreamResponse, Mood } from "../api/types";
import { GlassPanel } from "../components/GlassPanel";
import { clarityOptions, moodOptions } from "../dreams/dreamOptions";

const dreamTypes = ["普通梦", "清醒梦", "奇幻梦", "重复梦", "追逐梦", "飞行梦", "噩梦"];

function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseTags(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[,，\s]+/)
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  ).slice(0, 12);
}

export function RecordPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [dreamDate, setDreamDate] = useState(getToday);
  const [wakeTime, setWakeTime] = useState("07:30");
  const [mood, setMood] = useState<Mood>("calm");
  const [dreamType, setDreamType] = useState(dreamTypes[0]);
  const [clarity, setClarity] = useState(3);
  const [visibility, setVisibility] = useState<"private" | "anonymous" | "public">("private");
  const [tagText, setTagText] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [interpreting, setInterpreting] = useState(false);

  const tags = useMemo(() => parseTags(tagText), [tagText]);

  const buildPayload = (): DreamCreateRequest => {
    const metadata = [`醒来时间：${wakeTime}`, `梦境类型：${dreamType}`];
    return {
      title: title.trim() || null,
      content: `${metadata.join("\n")}\n\n${content.trim()}`,
      dream_date: dreamDate,
      mood,
      clarity,
      is_lucid: dreamType === "清醒梦",
      is_public: visibility === "public",
      is_anonymous: visibility !== "public",
      tags
    };
  };

  const validate = () => {
    if (content.trim().length < 10) {
      return "梦境内容至少需要 10 个字符。";
    }
    if (!dreamDate) {
      return "请选择做梦日期。";
    }
    if (!wakeTime) {
      return "请选择醒来时间。";
    }
    return "";
  };

  const saveDream = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return null;
    }

    setError("");
    const response = await api.post<DreamResponse>("/dreams", { ...buildPayload() });
    return response;
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setStatus("");
    try {
      const response = await saveDream();
      if (response) {
        setStatus("已保存");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "梦境保存失败，请稍后重试。");
    } finally {
      setSaving(false);
    }
  };

  const handleInterpret = async () => {
    setInterpreting(true);
    setStatus("");
    try {
      const response = await saveDream();
      if (!response) {
        return;
      }
      setStatus("正在解析");
      await api.post<DreamResponse>(`/dreams/${response.id}/interpret`);
      navigate(`/dreams/${response.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI 解梦失败，请稍后重试。");
    } finally {
      setInterpreting(false);
    }
  };

  return (
    <main className="app-shell record-shell">
      <header className="record-hero">
        <div>
          <p className="eyebrow">DreamLog Record</p>
          <h1>记录梦境</h1>
          <p>把昨夜的片段轻轻写下，让梦境被看见，也为 AI 解梦和撞梦匹配留下线索。</p>
        </div>
        <Link className="ghost-button dream-detail-back" to="/">
          <ArrowLeft aria-hidden="true" size={17} />
          返回首页
        </Link>
      </header>

      <GlassPanel className="record-panel" title="梦境内容">
        <form className="record-form" noValidate onSubmit={handleSave}>
          <label className="dream-form__field">
            <span>梦境标题</span>
            <input
              aria-label="梦境标题"
              maxLength={100}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="给你的梦境起一个标题"
              value={title}
            />
          </label>

          <label className="dream-form__field dream-form__field--content">
            <span>梦境内容</span>
            <textarea
              aria-label="梦境内容"
              onChange={(event) => setContent(event.target.value)}
              placeholder="尽可能详细地记录梦中的场景、人物、情绪和对话..."
              rows={10}
              value={content}
            />
          </label>

          <div className="record-form__grid">
            <label className="dream-form__field">
              <span>做梦日期</span>
              <input aria-label="做梦日期" onChange={(event) => setDreamDate(event.target.value)} type="date" value={dreamDate} />
            </label>

            <label className="dream-form__field">
              <span>醒来时间</span>
              <input aria-label="醒来时间" onChange={(event) => setWakeTime(event.target.value)} type="time" value={wakeTime} />
            </label>

            <label className="dream-form__field">
              <span>醒来情绪</span>
              <select aria-label="醒来情绪" onChange={(event) => setMood(event.target.value as Mood)} value={mood}>
                {moodOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="dream-form__field">
              <span>梦境类型</span>
              <select aria-label="梦境类型" onChange={(event) => setDreamType(event.target.value)} value={dreamType}>
                {dreamTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <label className="dream-form__field">
              <span>梦境清晰度</span>
              <input
                aria-label="梦境清晰度"
                max={5}
                min={1}
                onChange={(event) => setClarity(Number(event.target.value))}
                type="number"
                value={clarity}
              />
              <small>{clarityOptions.find((option) => option.value === clarity)?.label}</small>
            </label>

            <label className="dream-form__field">
              <span>隐私设置</span>
              <select
                aria-label="隐私设置"
                onChange={(event) => setVisibility(event.target.value as "private" | "anonymous" | "public")}
                value={visibility}
              >
                <option value="private">私密</option>
                <option value="anonymous">匿名公开</option>
                <option value="public">公开</option>
              </select>
            </label>
          </div>

          <label className="dream-form__field">
            <span>梦境标签</span>
            <input
              aria-label="梦境标签"
              onChange={(event) => setTagText(event.target.value)}
              placeholder="月亮，门，水面"
              value={tagText}
            />
          </label>

          {tags.length > 0 ? (
            <div className="chip-row" aria-label="已填写标签">
              {tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          ) : null}

          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          {status ? (
            <p className="debug-code" role="status">
              {status}
            </p>
          ) : null}

          <div className="record-form__actions">
            <button className="secondary-action" disabled={saving || interpreting} type="submit">
              <Save aria-hidden="true" size={17} />
              {saving ? "保存中..." : "保存梦境"}
            </button>
            <button className="primary-action" disabled={saving || interpreting} onClick={handleInterpret} type="button">
              <Sparkles aria-hidden="true" size={17} />
              {interpreting ? "正在解析..." : "AI 解梦"}
            </button>
          </div>
        </form>
      </GlassPanel>
    </main>
  );
}
