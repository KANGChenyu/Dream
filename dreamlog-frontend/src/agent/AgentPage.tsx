import { useState } from "react";
import { createAgentRun } from "./api";
import type { AgentRun } from "./types";
import { AgentChat } from "./components/AgentChat";
import { DreamSelector } from "./components/DreamSelector";
import { RunTimeline } from "./components/RunTimeline";
import { EvidencePanel } from "./components/EvidencePanel";
import { FinalAnswerCard } from "./components/FinalAnswerCard";

export function AgentPage() {
  const [goal, setGoal] = useState("Please deeply analyze this dream.");
  const [dreamId, setDreamId] = useState("");
  const [run, setRun] = useState<AgentRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);
    try {
      const nextRun = await createAgentRun(goal, dreamId ? Number(dreamId) : null);
      setRun(nextRun);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start Agent run.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="agent-workspace">
      <aside className="agent-sidebar">
        <h1>Dream Agent</h1>
        <DreamSelector dreamId={dreamId} onDreamIdChange={setDreamId} />
      </aside>
      <section className="agent-chat-panel">
        <AgentChat
          goal={goal}
          onGoalChange={setGoal}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
        {error ? <p role="alert">{error}</p> : null}
        {run ? <FinalAnswerCard run={run} /> : null}
      </section>
      <aside className="agent-evidence-panel">
        <RunTimeline steps={run?.steps ?? []} />
        <EvidencePanel run={run} />
      </aside>
    </main>
  );
}
