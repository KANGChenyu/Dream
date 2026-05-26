import { Moon, Sparkles, Tag, Waves } from "lucide-react";

import { resolveAssetUrl } from "../api/assets";
import type { DreamResponse } from "../api/types";
import { getMoodLabel } from "./dreamOptions";

interface DreamShareCardProps {
  dream: DreamResponse;
  keywords: string[];
}

function getDreamTitle(dream: DreamResponse) {
  return dream.title ?? dream.content.slice(0, 18);
}

function getSummary(dream: DreamResponse) {
  return dream.interpretation?.summary ?? dream.content.slice(0, 96);
}

export function DreamShareCard({ dream, keywords }: DreamShareCardProps) {
  const visibleKeywords = keywords.slice(0, 6);
  const moodLabel = getMoodLabel(dream.mood);

  return (
    <article className="dream-share-card" aria-label="梦境分享卡片预览">
      <div className="dream-share-card__frame">
        <section className="dream-share-card__art">
          {dream.image_url ? (
            <img alt="" src={resolveAssetUrl(dream.image_url)} />
          ) : (
            <div className="dream-share-card__fallback-art" aria-hidden="true">
              <Moon size={54} />
              <Sparkles size={30} />
            </div>
          )}
          <div className="dream-share-card__art-copy">
            <h2>{getDreamTitle(dream)}</h2>
            <p>
              {dream.dream_date} · 梦境分享卡 · <span>AI 解析</span>
            </p>
          </div>
        </section>

        <section className="dream-share-card__section">
          <h3>
            <Sparkles size={20} />
            解读摘要
          </h3>
          <p>{getSummary(dream)}</p>
        </section>

        <section className="dream-share-card__section">
          <h3>
            <Tag size={20} />
            关键词
          </h3>
          <div className="dream-share-card__chips">
            {(visibleKeywords.length ? visibleKeywords : ["梦境", "探索", "潜意识"]).map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </section>

        <section className="dream-share-card__section">
          <h3>
            <Moon size={20} />
            情绪氛围
          </h3>
          <div className="dream-share-card__moods">
            <span>
              <Sparkles size={17} />
              神秘
            </span>
            <span>
              <Waves size={17} />
              {moodLabel}
            </span>
            <span>
              <Sparkles size={17} />
              期待
            </span>
          </div>
        </section>

        <footer className="dream-share-card__footer">
          <span className="dream-share-card__brand-icon">
            <Moon size={24} />
          </span>
          <strong>DreamLog</strong>
          <span>· 记录梦境，发现共鸣</span>
        </footer>
      </div>
    </article>
  );
}
