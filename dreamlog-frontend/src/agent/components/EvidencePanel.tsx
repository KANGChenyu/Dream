import type { AgentRun } from "../types";

function getEvidence(run: AgentRun | null, key: string) {
  const output = run?.final_output;
  const value = output?.[key];
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown): string {
  return value ? String(value) : "";
}

function EvidenceMeta({ parts }: { parts: string[] }) {
  const values = parts.filter(Boolean);
  if (values.length === 0) {
    return null;
  }

  return (
    <p className="agent-evidence-meta">
      {values.map((value) => (
        <span key={value}>{value}</span>
      ))}
    </p>
  );
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
          <EvidenceMeta parts={[stringValue(item.source_type), stringValue(item.relevance)]} />
          <p>{String(item.snippet ?? "")}</p>
        </article>
      ))}
      <h3>Personal patterns</h3>
      {personal.length === 0 ? <p>No personal patterns yet.</p> : null}
      {personal.map((item, index) => (
        <article key={`personal-${index}`}>
          <strong>{item.dream_id ? `Dream #${String(item.dream_id)}` : "Dream memory"}</strong>
          <EvidenceMeta parts={[stringValue(item.date), stringValue(item.relation)]} />
          <p>{String(item.pattern ?? item.summary ?? item.reason ?? "")}</p>
          {item.reason && (item.pattern || item.summary) ? <p>{String(item.reason)}</p> : null}
        </article>
      ))}
    </section>
  );
}
