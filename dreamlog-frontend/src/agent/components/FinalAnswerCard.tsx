import type { AgentRun } from "../types";

function asStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

export function FinalAnswerCard({ run }: { run: AgentRun }) {
  const output = run.final_output ?? {};
  const title = String(output.title ?? "Dream Agent report");
  const advice = asStringList(output.advice);
  const followUps = asStringList(output.follow_up_questions);
  const provider = output.provider ? String(output.provider) : "";
  const model = output.model ? String(output.model) : "";
  const fallbackReason = output.fallback_reason ? String(output.fallback_reason) : "";

  return (
    <article className="agent-final-card">
      <h2>{title}</h2>
      {provider || model ? (
        <dl className="agent-provider-meta">
          {provider ? (
            <>
              <dt>Provider</dt>
              <dd>{provider}</dd>
            </>
          ) : null}
          {model ? (
            <>
              <dt>Model</dt>
              <dd>{model}</dd>
            </>
          ) : null}
        </dl>
      ) : null}
      {fallbackReason ? <p className="agent-fallback-note">{fallbackReason}</p> : null}
      {output.summary ? <p>{String(output.summary)}</p> : null}
      {output.psychology ? (
        <section>
          <h3>Psychology</h3>
          <p>{String(output.psychology)}</p>
        </section>
      ) : null}
      {output.symbolism ? (
        <section>
          <h3>Symbolism</h3>
          <p>{String(output.symbolism)}</p>
        </section>
      ) : null}
      {output.cultural ? (
        <section>
          <h3>Cultural</h3>
          <p>{String(output.cultural)}</p>
        </section>
      ) : null}
      {advice.length > 0 ? (
        <section>
          <h3>Advice</h3>
          <ul>
            {advice.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {followUps.length > 0 ? (
        <section>
          <h3>Follow-up questions</h3>
          <ul>
            {followUps.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
