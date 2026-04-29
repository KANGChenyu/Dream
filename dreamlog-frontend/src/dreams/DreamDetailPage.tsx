import { Brain, Brush, CalendarDays, Download, Eye, Heart, Lock, MessageCircle, Moon, Send, Sparkles } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";

import { resolveAssetUrl } from "../api/assets";
import { api } from "../api/client";
import type { CommentResponse, DreamResponse } from "../api/types";
import { GlassPanel } from "../components/GlassPanel";
import { StatusMessage } from "../components/StatusMessage";
import { getClarityLabel, getMoodLabel } from "./dreamOptions";
import { DreamShareCard } from "./DreamShareCard";
import { downloadDreamShareCard } from "./shareCardExport";

const placeholderTags = ["意象", "情绪", "地点", "人物"];

function getDreamTitle(dream: DreamResponse) {
  return dream.title ?? dream.content.slice(0, 32);
}

function CommunityInteractionPanel({ dream }: { dream: DreamResponse }) {
  const [comments, setComments] = useState<CommentResponse[]>([]);
  const [commentContent, setCommentContent] = useState("");
  const [likeCount, setLikeCount] = useState(dream.like_count);
  const [commentError, setCommentError] = useState("");
  const [isLiking, setIsLiking] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadComments() {
      try {
        const response = await api.get<CommentResponse[]>(`/community/dreams/${dream.id}/comments`);
        if (isMounted) {
          setComments(response);
        }
      } catch (err) {
        if (isMounted) {
          setCommentError(err instanceof Error ? err.message : "评论加载失败，请稍后重试。");
        }
      }
    }

    void loadComments();

    return () => {
      isMounted = false;
    };
  }, [dream.id]);

  const handleLike = async () => {
    setIsLiking(true);
    setCommentError("");
    try {
      const response = await api.post<{ liked: boolean; like_count: number }>(
        `/community/dreams/${dream.id}/like`
      );
      setLikeCount(response.like_count);
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : "点赞失败，请稍后重试。");
    } finally {
      setIsLiking(false);
    }
  };

  const handleSubmitComment = async () => {
    const content = commentContent.trim();
    if (!content) {
      return;
    }

    setIsSubmittingComment(true);
    setCommentError("");
    try {
      const response = await api.post<CommentResponse>(`/community/dreams/${dream.id}/comments`, {
        content
      });
      setComments((current) => [response, ...current]);
      setCommentContent("");
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : "评论发布失败，请稍后重试。");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  return (
    <GlassPanel title="社区互动">
      <div className="community-actions-panel">
        <button className="secondary-action" disabled={isLiking} onClick={handleLike} type="button">
          <Heart aria-hidden="true" size={17} />
          点赞
          <span>{likeCount}</span>
        </button>
        <div className="community-comment-box">
          <label htmlFor="community-comment">评论</label>
          <textarea
            id="community-comment"
            maxLength={500}
            onChange={(event) => setCommentContent(event.target.value)}
            placeholder="写下温柔的共鸣或提问..."
            value={commentContent}
          />
          <button
            className="secondary-action"
            disabled={isSubmittingComment || !commentContent.trim()}
            onClick={handleSubmitComment}
            type="button"
          >
            <MessageCircle aria-hidden="true" size={17} />
            发表评论
          </button>
        </div>
        {commentError ? (
          <p className="form-error" role="alert">
            {commentError}
          </p>
        ) : null}
        <div className="community-comments" aria-label="社区评论">
          {comments.length === 0 ? (
            <p>还没有评论。</p>
          ) : (
            comments.map((comment) => (
              <article key={comment.id}>
                <strong>{comment.user_nickname}</strong>
                <p>{comment.content}</p>
              </article>
            ))
          )}
        </div>
      </div>
    </GlassPanel>
  );
}

interface DreamDetailPageProps {
  source?: "mine" | "community";
}

export function DreamDetailPage({ source = "mine" }: DreamDetailPageProps) {
  const { id } = useParams();
  const isCommunitySource = source === "community";
  const [dream, setDream] = useState<DreamResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [interpretError, setInterpretError] = useState("");
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [imageError, setImageError] = useState("");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [publishError, setPublishError] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [isShareCardOpen, setIsShareCardOpen] = useState(false);
  const [shareCardError, setShareCardError] = useState("");
  const [isDownloadingShareCard, setIsDownloadingShareCard] = useState(false);

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
        const path = isCommunitySource ? `/community/dreams/${id}` : `/dreams/${id}`;
        const response = await api.get<DreamResponse>(path);
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
  }, [id, isCommunitySource]);

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
  const keywords = dream.interpretation?.keywords.length ? dream.interpretation.keywords : tags;

  const handleInterpret = async () => {
    if (!id) {
      return;
    }

    setIsInterpreting(true);
    setInterpretError("");
    try {
      const response = await api.post<DreamResponse>(`/dreams/${id}/interpret`);
      setDream(response);
    } catch (err) {
      setInterpretError(err instanceof Error ? err.message : "AI 解读生成失败，请稍后重试。");
    } finally {
      setIsInterpreting(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!id) {
      return;
    }

    setIsGeneratingImage(true);
    setImageError("");
    try {
      const response = await api.post<DreamResponse>(`/dreams/${id}/generate-image`, {
        style: "surreal_dreamlike"
      });
      setDream(response);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "AI 绘梦生成失败，请稍后重试。");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handlePublish = async () => {
    if (!id) {
      return;
    }

    setIsPublishing(true);
    setPublishError("");
    try {
      const response = await api.post<DreamResponse>(`/dreams/${id}/publish`, {
        is_anonymous: false
      });
      setDream(response);
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : "发布到社区失败，请稍后重试。");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDownloadShareCard = async () => {
    setIsDownloadingShareCard(true);
    setShareCardError("");
    try {
      await downloadDreamShareCard(dream, { keywords });
    } catch (err) {
      setShareCardError(err instanceof Error ? err.message : "分享卡片下载失败，请稍后重试。");
    } finally {
      setIsDownloadingShareCard(false);
    }
  };

  return (
    <main className="app-shell dream-detail-shell">
      <header className="dream-detail-hero">
        <div>
          <p className="eyebrow">{isCommunitySource ? "DreamLog Community" : "DreamLog 详情"}</p>
          <h1>{getDreamTitle(dream)}</h1>
          <p>
            {isCommunitySource
              ? "在社区里与这段公开梦境轻轻相遇，留下共鸣或一点提问。"
              : "完整保存这一晚的梦境、情绪与清醒度，后续 AI 解析与绘梦会在这里继续展开。"}
          </p>
        </div>
        <Link className="ghost-button dream-detail-back" to={isCommunitySource ? "/community" : "/"}>
          {isCommunitySource ? "返回社区" : "返回梦境档案"}
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

        <aside className="dream-detail-side" aria-label={isCommunitySource ? "社区互动面板" : "AI 梦境辅助面板"}>
          {isCommunitySource ? (
            <>
              {dream.image_url ? (
                <GlassPanel title="梦境画面">
                  <div className="dream-image-panel">
                    <img alt="公开梦境画面" src={resolveAssetUrl(dream.image_url)} />
                  </div>
                </GlassPanel>
              ) : null}

              <GlassPanel title="关键词">
                <div className="detail-placeholder-panel">
                  <Sparkles aria-hidden="true" className="panel-icon" />
                  <div className="chip-row" aria-label="梦境关键词">
                    {(keywords.length > 0 ? keywords : placeholderTags).map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                </div>
              </GlassPanel>

              <CommunityInteractionPanel dream={dream} />
            </>
          ) : (
            <>
          <GlassPanel title="AI 梦境解析">
            {dream.interpretation ? (
              <div className="interpretation-panel">
                <p className="interpretation-summary">{dream.interpretation.summary}</p>
                <section>
                  <h3>心理学解读</h3>
                  <p>{dream.interpretation.psychology}</p>
                </section>
                <section>
                  <h3>象征意义</h3>
                  <p>{dream.interpretation.symbolism}</p>
                </section>
                <section>
                  <h3>文化视角</h3>
                  <p>{dream.interpretation.cultural}</p>
                </section>
                {dream.interpretation.advice ? (
                  <section>
                    <h3>梦境建议</h3>
                    <p>{dream.interpretation.advice}</p>
                  </section>
                ) : null}
              </div>
            ) : (
              <div className="detail-placeholder-panel">
                <Brain aria-hidden="true" className="panel-icon" />
                <p>基于产品文档中的梦境解读 Prompt，调用 DeepSeek 生成心理学、象征意义与文化视角报告。</p>
                {interpretError ? (
                  <p className="form-error" role="alert">
                    {interpretError}
                  </p>
                ) : null}
                <button
                  className="secondary-action"
                  disabled={isInterpreting}
                  onClick={handleInterpret}
                  type="button"
                >
                  {isInterpreting ? "生成中..." : "生成 AI 解读"}
                </button>
              </div>
            )}
          </GlassPanel>

          <GlassPanel title="AI 绘梦">
            {dream.image_url ? (
              <div className="dream-image-panel">
                <img alt="AI 生成的梦境画面" src={resolveAssetUrl(dream.image_url)} />
                <button
                  className="secondary-action"
                  disabled={isGeneratingImage}
                  onClick={handleGenerateImage}
                  type="button"
                >
                  {isGeneratingImage ? "生成中..." : "重新生成"}
                </button>
              </div>
            ) : (
              <div className="detail-placeholder-panel">
                <Brush aria-hidden="true" className="panel-icon" />
                <p>把这段梦境转化为一张柔和、超现实的专属视觉图像。</p>
                {imageError ? (
                  <p className="form-error" role="alert">
                    {imageError}
                  </p>
                ) : null}
                <button
                  className="secondary-action"
                  disabled={isGeneratingImage}
                  onClick={handleGenerateImage}
                  type="button"
                >
                  {isGeneratingImage ? "生成中..." : "生成梦境画面"}
                </button>
              </div>
            )}
          </GlassPanel>

          <GlassPanel title="关键词">
            <div className="detail-placeholder-panel">
              <Sparkles aria-hidden="true" className="panel-icon" />
              <div className="chip-row" aria-label="梦境关键词">
                {(keywords.length > 0 ? keywords : placeholderTags).map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </div>
          </GlassPanel>
          <GlassPanel title="社区分享">
            <div className="share-card-builder">
              <p>生成一张适合保存和分享的梦境卡片，只包含图片、摘要、关键词和情绪氛围。</p>
              <div className="share-card-actions">
                <button
                  className="secondary-action"
                  onClick={() => {
                    setIsShareCardOpen(true);
                    setShareCardError("");
                  }}
                  type="button"
                >
                  生成分享卡片
                </button>
                {isShareCardOpen ? (
                  <button
                    className="secondary-action"
                    disabled={isDownloadingShareCard}
                    onClick={handleDownloadShareCard}
                    type="button"
                  >
                    <Download aria-hidden="true" size={17} />
                    {isDownloadingShareCard ? "下载中..." : "下载 PNG"}
                  </button>
                ) : null}
              </div>
              {shareCardError ? (
                <p className="form-error" role="alert">
                  {shareCardError}
                </p>
              ) : null}
              {isShareCardOpen ? <DreamShareCard dream={dream} keywords={keywords} /> : null}
            </div>
            <div className="share-card-preview">
              {dream.image_url ? (
                <img alt="" src={resolveAssetUrl(dream.image_url)} />
              ) : (
                <div className="share-card-preview__empty" aria-hidden="true">
                  <Send size={24} />
                </div>
              )}
              <div>
                <strong>{getDreamTitle(dream)}</strong>
                <p>{dream.content.slice(0, 72)}</p>
              </div>
            </div>
            {publishError ? (
              <p className="form-error" role="alert">
                {publishError}
              </p>
            ) : null}
            {isCommunitySource ? (
              <Link className="secondary-action share-action-link" to="/community">
                返回社区
              </Link>
            ) : dream.is_public ? (
              <Link className="secondary-action share-action-link" to="/community">
                已发布到社区
              </Link>
            ) : (
              <button
                className="secondary-action"
                disabled={isPublishing}
                onClick={handlePublish}
                type="button"
              >
                {isPublishing ? "发布中..." : "发布到社区"}
              </button>
            )}
          </GlassPanel>
            </>
          )}
        </aside>
      </section>
    </main>
  );
}
