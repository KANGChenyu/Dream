import { ArrowLeft, HeartHandshake, Sparkles } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";

import { api } from "../api/client";
import type { DreamListResponse, DreamMatchResponse, DreamResponse } from "../api/types";
import { GlassPanel } from "../components/GlassPanel";
import { StatusMessage } from "../components/StatusMessage";
import { getMoodLabel } from "../dreams/dreamOptions";

function getDreamTitle(dream: DreamResponse) {
  return dream.title ?? dream.content.slice(0, 32);
}

function preview(content: string, maxLength = 120) {
  return content.length > maxLength ? `${content.slice(0, maxLength)}...` : content;
}

function formatSimilarity(similarity: number) {
  return `${Math.round(similarity * 100)}%`;
}

export function MatchingPage() {
  const [searchParams] = useSearchParams();
  const dreamIdFromQuery = Number(searchParams.get("dreamId"));
  const [dreams, setDreams] = useState<DreamResponse[]>([]);
  const [selectedDreamId, setSelectedDreamId] = useState<number | null>(
    Number.isFinite(dreamIdFromQuery) && dreamIdFromQuery > 0 ? dreamIdFromQuery : null
  );
  const [matches, setMatches] = useState<DreamMatchResponse[]>([]);
  const [loadingDreams, setLoadingDreams] = useState(true);
  const [matching, setMatching] = useState(false);
  const [hasMatched, setHasMatched] = useState(false);
  const [error, setError] = useState("");

  const selectedDream = useMemo(
    () => dreams.find((dream) => dream.id === selectedDreamId) ?? dreams[0] ?? null,
    [dreams, selectedDreamId]
  );

  useEffect(() => {
    let isMounted = true;

    async function loadDreams() {
      setLoadingDreams(true);
      setError("");

      try {
        const response = await api.get<DreamListResponse>("/dreams");
        if (!isMounted) {
          return;
        }

        setDreams(response.items);
        if (response.items.length > 0) {
          const queryDream = response.items.find((dream) => dream.id === dreamIdFromQuery);
          setSelectedDreamId((current) => current ?? queryDream?.id ?? response.items[0].id);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "梦境档案加载失败，请稍后重试。");
        }
      } finally {
        if (isMounted) {
          setLoadingDreams(false);
        }
      }
    }

    void loadDreams();

    return () => {
      isMounted = false;
    };
  }, [dreamIdFromQuery]);

  const handleMatch = useCallback(async () => {
    if (!selectedDream) {
      return;
    }

    setMatching(true);
    setHasMatched(false);
    setError("");
    setMatches([]);

    try {
      const response = await api.get<DreamMatchResponse[]>(`/dreams/${selectedDream.id}/matches?limit=6`);
      setMatches(response);
      setHasMatched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "撞梦匹配失败，请稍后重试。");
    } finally {
      setMatching(false);
    }
  }, [selectedDream]);

  return (
    <main className="app-shell matching-shell">
      <header className="matching-hero">
        <div>
          <p className="eyebrow">DreamLog Matching</p>
          <h1>撞梦匹配</h1>
          <p>选择一段已经解析过的梦境，寻找社区里与你共享象征、情绪和场景的人。</p>
        </div>
        <Link className="ghost-button dream-detail-back" to="/">
          <ArrowLeft aria-hidden="true" size={17} />
          返回档案
        </Link>
      </header>

      <section className="matching-layout" aria-label="撞梦匹配工作台">
        <GlassPanel className="matching-dreams-panel" title="我的梦境">
          {loadingDreams ? (
            <StatusMessage title="正在读取梦境..." message="DreamLog 正在整理你的梦境档案。" />
          ) : null}
          {!loadingDreams && dreams.length === 0 ? (
            <StatusMessage title="还没有可匹配的梦境" message="先记录一段梦境，再回来寻找共鸣。" />
          ) : null}
          <div className="matching-dream-list">
            {dreams.map((dream) => (
              <button
                aria-pressed={selectedDream?.id === dream.id}
                className="matching-dream-option"
                key={dream.id}
                onClick={() => {
                  setSelectedDreamId(dream.id);
                  setMatches([]);
                  setHasMatched(false);
                  setError("");
                }}
                type="button"
              >
                <span>{dream.dream_date}</span>
                <strong>{getDreamTitle(dream)}</strong>
                <small>{preview(dream.content, 72)}</small>
              </button>
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="matching-focus-panel" title="匹配基准">
          {selectedDream ? (
            <article className="matching-selected-dream">
              <div>
                <p className="eyebrow">{selectedDream.dream_date}</p>
                <h2>{getDreamTitle(selectedDream)}</h2>
                <p>{preview(selectedDream.content, 180)}</p>
              </div>
              <div className="chip-row" aria-label="梦境关键词">
                {(selectedDream.interpretation?.keywords.length
                  ? selectedDream.interpretation.keywords
                  : selectedDream.tags.map((item) => item.tag)
                )
                  .slice(0, 6)
                  .map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
              </div>
              <button className="primary-action matching-run-button" disabled={matching} onClick={handleMatch} type="button">
                <HeartHandshake aria-hidden="true" size={18} />
                {matching ? "正在匹配..." : "开始匹配"}
              </button>
              {error ? (
                <div className="form-error matching-error" role="alert">
                  <p>{error}</p>
                  {selectedDream ? (
                    <Link className="ghost-button matching-error-link" to={`/dreams/${selectedDream.id}`}>
                      去 AI 解梦
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </article>
          ) : (
            <StatusMessage title="等待选择梦境" message="从左侧选择一段梦境作为撞梦匹配的起点。" />
          )}
        </GlassPanel>

        <GlassPanel className="matching-results-panel" title="共鸣结果">
          {matching ? <StatusMessage title="正在匹配..." message="正在计算梦境之间的象征距离。" /> : null}
          {!matching && !hasMatched && matches.length === 0 && !error ? (
            <StatusMessage title="等待匹配" message="点击开始匹配后，结果会显示在这里。" />
          ) : null}
          {!matching && hasMatched && matches.length === 0 && !error ? (
            <StatusMessage
              title="暂无匹配结果"
              message="可以发布更多梦境，或等社区里出现更多已解析的公开梦境后再试。"
            />
          ) : null}
          <div className="matching-results">
            {matches.map((match) => (
              <Link className="matching-card" key={match.dream.id} to={`/community/dreams/${match.dream.id}`}>
                <div className="matching-card__score">
                  <Sparkles aria-hidden="true" size={18} />
                  <strong>{formatSimilarity(match.similarity)}</strong>
                </div>
                <div className="matching-card__body">
                  <div className="matching-card__meta">
                    <span>{match.dream.dream_date}</span>
                    <span>{getMoodLabel(match.dream.mood)}</span>
                    <span>{match.dream.like_count} 喜欢</span>
                  </div>
                  <h2>{getDreamTitle(match.dream)}</h2>
                  <p>{preview(match.dream.content)}</p>
                  {match.match_reason ? <p className="matching-card__reason">{match.match_reason}</p> : null}
                  <div className="chip-row">
                    {match.dream.tags.slice(0, 4).map((tag) => (
                      <span key={tag.tag}>{tag.tag}</span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </GlassPanel>
      </section>
    </main>
  );
}
