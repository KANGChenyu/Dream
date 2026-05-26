import type { AgentStep } from "../types";

export function RunTimeline({ steps }: { steps: AgentStep[] }) {
  return (
    <section aria-label="Run timeline" className="agent-panel">
      <h2>Run timeline</h2>
      {steps.length === 0 ? <p>No steps yet.</p> : null}
      <ol className="agent-timeline">
        {steps.map((step) => (
          <li key={step.id}>
            <strong>{step.agent_name}</strong>
            <span>{step.step_type}</span>
            <small>{step.status}</small>
          </li>
        ))}
      </ol>
    </section>
  );
}
