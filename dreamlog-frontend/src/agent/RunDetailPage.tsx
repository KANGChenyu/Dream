import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getAgentRun } from "./api";
import type { AgentRun } from "./types";
import { RunTimeline } from "./components/RunTimeline";
import { EvidencePanel } from "./components/EvidencePanel";
import { FinalAnswerCard } from "./components/FinalAnswerCard";

export function RunDetailPage() {
  const { id } = useParams();
  const [run, setRun] = useState<AgentRun | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }
    void getAgentRun(Number(id)).then(setRun);
  }, [id]);

  return (
    <main className="agent-run-detail">
      <RunTimeline steps={run?.steps ?? []} />
      <EvidencePanel run={run} />
      {run ? <FinalAnswerCard run={run} /> : null}
    </main>
  );
}
