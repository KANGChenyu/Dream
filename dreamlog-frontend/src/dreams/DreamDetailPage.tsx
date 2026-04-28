import { Brain, Brush, CalendarDays, Eye, Lock, Moon, Sparkles } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";

import { api } from "../api/client";
import type { DreamResponse } from "../api/types";
import { GlassPanel } from "../components/GlassPanel";
import { StatusMessage } from "../components/StatusMessage";
import { getClarityLabel, getMoodLabel } from "./dreamOptions";

const placeholderTags = ["意象", "情绪", "地点", "人物"];

function getDreamTitle(dream: DreamResponse) {
  return dream.title ?? dream.content.slice(0, 32);
}

export function DreamDetailPage() {
  const { id } = useParams();
  const [dream, setDream] = useState<DreamResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadDream() {
      if (!id) {
        setError("没有找到这段梦境的编号。");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await api.get<DreamResponse>(`/dreams/${id}`);
        if (isMounted) {
          setDream(response);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "梦境详情加载失败，请稍后重试。");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadDream();

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <main className="app-shell dream-detail-shell">
        <GlassPanel className="dream-detail-state" title="正在唤回梦境">
          <StatusMessage message="DreamLog 正在读取这段梦境的完整内容与记录信息。" title="梦境详情加载中..." />
        </GlassPanel>
      </main>
    );
  }

  if (error || !dream) {
    return (
      <main className="app-shell dream-detail-shell">
        <GlassPanel className="dream-detail-state" title="梦境没有抵达">
          <StatusMessage
            message={error || "没有找到这段梦境，可能它已经被删除或暂时无法访问。"}
            title="加载失败"
          />
          <Link className="ghost-button dream-detail-back" to="/">
            返回梦境档案
          </Link>
        </GlassPanel>
      </main>
    );
  }

  const tags = dream.tags.map((item) => item.tag).filter(Boolean);

  return (
    <main className="app-shell dream-detail-shell">
      <header className="dream-detail-hero">
        <div>
          <p className="eyebrow">DreamLog 详情</p>
          <h1>{getDreamTitle(dream)}</h1>
          <p>完整保存这一晚的梦境、情绪与清醒度，后续 AI 解析与绘梦会在这里继续展开。</p>
        </div>
        <Link className="ghost-button dream-detail-back" to="/">
          返回梦境档案
        </Link>
      </header>

      <section className="dream-detail-layout" aria-label="梦境详情">
        <GlassPanel className="dream-detail-main" title="梦境正文">
          <article className="dream-detail-content">
            <p>{dream.content}</p>
          </article>

          <dl className="dream-detail-meta" aria-label="梦境元数据">
            <div>
              <dt>
                <CalendarDays aria-hidden="true" size={17} />
                梦境日期
              </dt>
              <dd>{dream.dream_date}</dd>
            </div>
            <div>
              <dt>
                <Moon aria-hidden="true" size={17} />
                情绪
              </dt>
              <dd>{getMoodLabel(dream.mood)}</dd>
            </div>
            <div>
              <dt>
                <Sparkles aria-hidden="true" size={17} />
                清晰度
              </dt>
              <dd>{getClarityLabel(dream.clarity)}</dd>
            </div>
            <div>
              <dt>
                <Eye aria-hidden="true" size={17} />
                梦境状态
              </dt>
              <dd>{dream.is_lucid ? "清醒梦" : "普通梦"}</dd>
            </div>
            <div>
              <dt>
                <Lock aria-hidden="true" size={17} />
                可见范围
              </dt>
              <dd>{dream.is_public ? "公开" : "私密"}</dd>
            </div>
          </dl>
        </GlassPanel>

        <aside className="dream-detail-side" aria-label="AI 梦境辅助面板">
          <GlassPanel title="AI 梦境解析">
            <div className="detail-placeholder-panel">
              <Brain aria-hidden="true" className="panel-icon" />
              <p>心理学、象征意义与文化视角的解析将在后续版本接入。当前先为这段梦境保留解析位置。</p>
            </div>
          </GlassPanel>

          <GlassPanel title="AI 绘梦">
            <div className="detail-placeholder-panel">
              <Brush aria-hidden="true" className="panel-icon" />
              <p>梦境画面生成入口即将开放，未来可以把这段记录转化为专属视觉图像。</p>
            </div>
          </GlassPanel>

          <GlassPanel title="关键词">
            <div className="detail-placeholder-panel">
              <Sparkles aria-hidden="true" className="panel-icon" />
              <div className="chip-row" aria-label="梦境关键词">
                {(tags.length > 0 ? tags : placeholderTags).map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </div>
          </GlassPanel>
        </aside>
      </section>
    </main>
  );
}
