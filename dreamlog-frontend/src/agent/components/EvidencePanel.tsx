import type { AgentRun } from "../types";

function getEvidence(run: AgentRun | null, key: string) {
  const output = run?.final_output;
  const value = output?.[key];
  return Array.isArray(value) ? value : [];
}

export function EvidencePanel({ run }: { run: AgentRun | null }) {
  const knowledge = getEvidence(run, "knowledge_evidence");
  const personal = getEvidence(run, "personal_patterns");

  return (
    <section aria-label="Evidence" className="agent-panel">
      <h2>Evidence</h2>
      <h3>Knowledge</h3>
      {knowledge.length === 0 ? <p>No knowledge evidence yet.</p> : null}
      {knowledge.map((item, index) => (
        <article key={`knowledge-${index}`}>
          <strong>{String(item.source_title ?? "Knowledge source")}</strong>
          <p>{String(item.snippet ?? "")}</p>
        </article>
      ))}
      <h3>Personal patterns</h3>
      {personal.length === 0 ? <p>No personal patterns yet.</p> : null}
      {personal.map((item, index) => (
        <article key={`personal-${index}`}>
          <strong>{String(item.pattern ?? item.summary ?? "Dream memory")}</strong>
          <p>{String(item.reason ?? "")}</p>
        </article>
      ))}
    </section>
  );
}
