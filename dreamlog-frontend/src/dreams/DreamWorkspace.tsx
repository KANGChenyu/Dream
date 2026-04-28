import { Brain, CloudMoon, Feather, LogOut, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { api } from "../api/client";
import type { DreamCreateRequest, DreamListResponse, DreamResponse } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { GlassPanel } from "../components/GlassPanel";
import { DreamForm } from "./DreamForm";
import { DreamList } from "./DreamList";

export function DreamWorkspace() {
  const { logout, user } = useAuth();
  const [dreams, setDreams] = useState<DreamResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDreams = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get<DreamListResponse>("/dreams");
      setDreams(response.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "梦境列表加载失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDreams();
  }, [loadDreams]);

  const createDream = async (payload: DreamCreateRequest) => {
    setError("");
    try {
      await api.post<DreamResponse>("/dreams", { ...payload });
      await loadDreams();
    } catch (err) {
      const message = err instanceof Error ? err.message : "梦境创建失败，请稍后重试。";
      setError(message);
      throw new Error(message);
    }
  };

  return (
    <main className="app-shell dream-workspace">
      <header className="workspace-header">
        <div className="workspace-title">
          <p className="eyebrow">DreamLog</p>
          <h1>AI 梦境日志与解析社区</h1>
          <p>
            欢迎回来，{user?.nickname ?? "梦境旅人"}。在画面消散之前记录它，
            让梦境档案替你保存每一次心灵深处的回响。
          </p>
        </div>
        <button className="ghost-button workspace-logout" onClick={logout} type="button">
          <LogOut aria-hidden="true" size={17} />
          <span>退出登录</span>
        </button>
      </header>

      <section className="workspace-grid" aria-label="梦境日志工作台">
        <aside className="workspace-stack workspace-stack--left">
          <GlassPanel title="AI 梦境解析">
            <div className="placeholder-panel">
              <Brain aria-hidden="true" className="panel-icon" />
              <p>心理学、象征意义与文化视角会在后续阶段接入这里。</p>
              <div className="progress-track" aria-hidden="true">
                <span />
              </div>
            </div>
          </GlassPanel>

          <GlassPanel title="关键词提取">
            <div className="placeholder-panel">
              <Sparkles aria-hidden="true" className="panel-icon" />
              <div className="chip-row">
                <span>森林</span>
                <span>门</span>
                <span>月光</span>
                <span>水</span>
              </div>
            </div>
          </GlassPanel>
        </aside>

        <GlassPanel className="journal-panel" title="记录今夜的梦">
          <DreamForm onCreate={createDream} />
        </GlassPanel>

        <aside className="workspace-stack workspace-stack--right">
          <GlassPanel title="我的梦境档案">
            {error ? (
              <p className="form-error" role="alert">
                {error}
              </p>
            ) : null}
            <DreamList dreams={dreams} loading={loading} />
          </GlassPanel>

          <GlassPanel title="云端同步">
            <div className="placeholder-panel">
              <CloudMoon aria-hidden="true" className="panel-icon" />
              <p>当前梦境会保存到你的账号下，后续可同步到小程序端。</p>
            </div>
          </GlassPanel>

          <GlassPanel title="梦境建议">
            <div className="placeholder-panel">
              <Feather aria-hidden="true" className="panel-icon" />
              <p>温柔提示与深度解析会在 AI 面板接入后显示。</p>
            </div>
          </GlassPanel>
        </aside>
      </section>
    </main>
  );
}
