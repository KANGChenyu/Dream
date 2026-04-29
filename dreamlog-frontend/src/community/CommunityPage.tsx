import { ArrowLeft, Heart, MessageCircle, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

import { resolveAssetUrl } from "../api/assets";
import { api } from "../api/client";
import type { FeedItemResponse, FeedResponse } from "../api/types";
import { GlassPanel } from "../components/GlassPanel";
import { StatusMessage } from "../components/StatusMessage";
import { getMoodLabel } from "../dreams/dreamOptions";

function getFeedTitle(item: FeedItemResponse) {
  return item.title ?? item.content_preview;
}

export function CommunityPage() {
  const [items, setItems] = useState<FeedItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadFeed() {
      setLoading(true);
      setError("");

      try {
        const response = await api.get<FeedResponse>("/community/feed");
        if (isMounted) {
          setItems(response.items);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "社区梦境加载失败，请稍后重试。");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadFeed();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="app-shell community-shell">
      <header className="community-hero">
        <div>
          <p className="eyebrow">DreamLog Community</p>
          <h1>星河图书馆</h1>
          <p>浏览已经公开的梦境、图像与关键词，把个人记录延伸成可互相照见的梦境档案。</p>
        </div>
        <Link className="ghost-button dream-detail-back" to="/">
          <ArrowLeft aria-hidden="true" size={17} />
          返回档案
        </Link>
      </header>

      <GlassPanel className="community-feed-panel" title="公开梦境">
        {loading ? (
          <StatusMessage message="正在读取社区里的公开梦境。" title="加载中..." />
        ) : null}
        {error ? <StatusMessage message={error} title="加载失败" /> : null}
        {!loading && !error && items.length === 0 ? (
          <StatusMessage message="还没有公开梦境。你可以先从梦境详情页发布一条。" title="社区暂时安静" />
        ) : null}
        <div className="community-feed">
          {items.map((item) => (
            <Link className="community-card" key={item.id} to={`/dreams/${item.id}`}>
              {item.image_url ? (
                <img alt={getFeedTitle(item)} src={resolveAssetUrl(item.image_url)} />
              ) : (
                <div className="community-card__image-placeholder" aria-hidden="true">
                  <Sparkles size={28} />
                </div>
              )}
              <div className="community-card__body">
                <div className="community-card__meta">
                  <span>{item.user_nickname}</span>
                  <span>{item.dream_date}</span>
                  <span>{getMoodLabel(item.mood)}</span>
                </div>
                <h2>{getFeedTitle(item)}</h2>
                <p>{item.content_preview}</p>
                <div className="chip-row">
                  {item.tags.slice(0, 4).map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <div className="community-card__stats">
                  <span>
                    <Heart aria-hidden="true" size={16} />
                    {item.like_count}
                  </span>
                  <span>
                    <MessageCircle aria-hidden="true" size={16} />
                    {item.comment_count}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </GlassPanel>
    </main>
  );
}
