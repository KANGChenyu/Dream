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
      setError(err instanceof Error ? err.message : "Unable to load dreams.");
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
      const message = err instanceof Error ? err.message : "Unable to create this dream.";
      setError(message);
      throw new Error(message);
    }
  };

  return (
    <main className="app-shell dream-workspace">
      <header className="workspace-header">
        <div className="workspace-title">
          <p className="eyebrow">DreamLog</p>
          <h1>AI dream journal and interpretation community</h1>
          <p>
            Welcome back, {user?.nickname ?? "dream traveler"}. Record the image before it fades,
            then let the archive hold it for later interpretation.
          </p>
        </div>
        <button className="ghost-button workspace-logout" onClick={logout} type="button">
          <LogOut aria-hidden="true" size={17} />
          <span>Logout</span>
        </button>
      </header>

      <section className="workspace-grid" aria-label="Dream journal workspace">
        <aside className="workspace-stack workspace-stack--left">
          <GlassPanel title="AI dream analysis">
            <div className="placeholder-panel">
              <Brain aria-hidden="true" className="panel-icon" />
              <p>Psychology, symbolism, and cultural interpretation will appear here.</p>
              <div className="progress-track" aria-hidden="true">
                <span />
              </div>
            </div>
          </GlassPanel>

          <GlassPanel title="Keyword extraction">
            <div className="placeholder-panel">
              <Sparkles aria-hidden="true" className="panel-icon" />
              <div className="chip-row">
                <span>forest</span>
                <span>door</span>
                <span>moonlight</span>
                <span>water</span>
              </div>
            </div>
          </GlassPanel>
        </aside>

        <GlassPanel className="journal-panel" title="Record tonight's dream">
          <DreamForm onCreate={createDream} />
        </GlassPanel>

        <aside className="workspace-stack workspace-stack--right">
          <GlassPanel title="My dream archive">
            {error ? (
              <p className="form-error" role="alert">
                {error}
              </p>
            ) : null}
            <DreamList dreams={dreams} loading={loading} />
          </GlassPanel>

          <GlassPanel title="Cloud sync">
            <div className="placeholder-panel">
              <CloudMoon aria-hidden="true" className="panel-icon" />
              <p>Entries are saved to your account and ready for future mobile sync.</p>
            </div>
          </GlassPanel>

          <GlassPanel title="Dream suggestions">
            <div className="placeholder-panel">
              <Feather aria-hidden="true" className="panel-icon" />
              <p>Gentle prompts and deeper analysis will arrive after the AI panels connect.</p>
            </div>
          </GlassPanel>
        </aside>
      </section>
    </main>
  );
}
