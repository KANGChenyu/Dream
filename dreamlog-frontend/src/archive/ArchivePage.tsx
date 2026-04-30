import { ArrowLeft, Brush, FileText, Search, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import { api } from "../api/client";
import type { DreamListResponse, DreamResponse, Mood } from "../api/types";
import { GlassPanel } from "../components/GlassPanel";
import { StatusMessage } from "../components/StatusMessage";
import { getClarityLabel, getMoodLabel, moodOptions } from "../dreams/dreamOptions";

type VisibilityFilter = "all" | "public" | "private";

function getDreamTitle(dream: DreamResponse) {
  return dream.title ?? dream.content.slice(0, 32);
}

function preview(content: string) {
  return content.length > 120 ? `${content.slice(0, 120)}...` : content;
}

function matchesSearch(dream: DreamResponse, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  const haystack = [
    dream.title ?? "",
    dream.content,
    ...dream.tags.map((tag) => tag.tag),
    ...(dream.interpretation?.keywords ?? [])
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalized);
}

export function ArchivePage() {
  const [dreams, setDreams] = useState<DreamResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [mood, setMood] = useState<Mood | "all">("all");
  const [visibility, setVisibility] = useState<VisibilityFilter>("all");

  useEffect(() => {
    let isMounted = true;

    async function loadDreams() {
      setLoading(true);
      setError("");
      try {
        const response = await api.get<DreamListResponse>("/dreams");
        if (isMounted) {
          setDreams(response.items);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "梦境档案加载失败，请稍后重试。");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadDreams();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredDreams = useMemo(
    () =>
      dreams.filter((dream) => {
        const moodMatches = mood === "all" || dream.mood === mood;
        const visibilityMatches =
          visibility === "all" ||
          (visibility === "public" ? dream.is_public : !dream.is_public);
        return moodMatches && visibilityMatches && matchesSearch(dream, query);
      }),
    [dreams, mood, query, visibility]
  );

  const parsedCount = dreams.filter((dream) => dream.interpretation).length;
  const imageCount = dreams.filter((dream) => dream.image_url).length;
  const publicCount = dreams.filter((dream) => dream.is_public).length;

  return (
    <main className="app-shell archive-shell">
      <header className="archive-hero">
        <div>
          <p className="eyebrow">DreamLog Archive</p>
          <h1>梦境档案</h1>
          <p>回看、筛选和整理你的梦境记录，快速找到已经解析、绘梦或发布过的片段。</p>
        </div>
        <Link className="ghost-button dream-detail-back" to="/">
          <ArrowLeft aria-hidden="true" size={17} />
          返回首页
        </Link>
      </header>

      <section className="archive-summary" aria-label="档案统计">
        <GlassPanel>
          <div className="archive-stat">
            <FileText aria-hidden="true" className="panel-icon" />
            <strong>{dreams.length}</strong>
            <span>梦境记录</span>
          </div>
        </GlassPanel>
        <GlassPanel>
          <div className="archive-stat">
            <Sparkles aria-hidden="true" className="panel-icon" />
            <strong>{parsedCount}</strong>
            <span>已解析</span>
          </div>
        </GlassPanel>
        <GlassPanel>
          <div className="archive-stat">
            <Brush aria-hidden="true" className="panel-icon" />
            <strong>{imageCount}</strong>
            <span>已绘梦</span>
          </div>
        </GlassPanel>
        <GlassPanel>
          <div className="archive-stat">
            <Sparkles aria-hidden="true" className="panel-icon" />
            <strong>{publicCount}</strong>
            <span>已公开</span>
          </div>
        </GlassPanel>
      </section>

      <GlassPanel className="archive-panel" title="全部梦境">
        <div className="archive-toolbar">
          <label className="archive-search">
            <span>搜索梦境</span>
            <div>
              <Search aria-hidden="true" size={17} />
              <input
                aria-label="搜索梦境"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="标题、正文或标签"
                type="search"
                value={query}
              />
            </div>
          </label>

          <label>
            <span>醒来情绪</span>
            <select
              aria-label="醒来情绪"
              onChange={(event) => setMood(event.target.value as Mood | "all")}
              value={mood}
            >
              <option value="all">全部情绪</option>
              {moodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>公开状态</span>
            <select
              aria-label="公开状态"
              onChange={(event) => setVisibility(event.target.value as VisibilityFilter)}
              value={visibility}
            >
              <option value="all">全部状态</option>
              <option value="public">公开</option>
              <option value="private">私密</option>
            </select>
          </label>
        </div>

        {loading ? <StatusMessage title="正在读取档案..." message="DreamLog 正在同步你的梦境记录。" /> : null}
        {error ? <StatusMessage title="加载失败" message={error} /> : null}
        {!loading && !error && filteredDreams.length === 0 ? (
          <StatusMessage title="没有符合条件的梦境" message="换一个关键词或筛选条件再试。" />
        ) : null}

        <div className="archive-grid" aria-label="梦境档案列表">
          {filteredDreams.map((dream) => (
            <Link className="archive-card" key={dream.id} to={`/dreams/${dream.id}`}>
              <div className="archive-card__header">
                <span>{dream.dream_date}</span>
                <span>{dream.is_public ? "公开" : "私密"}</span>
              </div>
              <h2>{getDreamTitle(dream)}</h2>
              <p>{preview(dream.content)}</p>
              <div className="dream-meta">
                <span>{getMoodLabel(dream.mood)}</span>
                <span>{getClarityLabel(dream.clarity)}</span>
                <span>{dream.interpretation ? "已解析" : "未解析"}</span>
                <span>{dream.image_url ? "已绘梦" : "未绘梦"}</span>
              </div>
              <div className="chip-row">
                {dream.tags.slice(0, 4).map((tag) => (
                  <span key={tag.tag}>{tag.tag}</span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </GlassPanel>
    </main>
  );
}
