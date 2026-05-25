import type { AgentRun } from "../types";

function asStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

export function FinalAnswerCard({ run }: { run: AgentRun }) {
  const output = run.final_output ?? {};
  const title = String(output.title ?? "Dream Agent report");
  const advice = asStringList(output.advice);
  const followUps = asStringList(output.follow_up_questions);

  return (
    <article className="agent-final-card">
      <h2>{title}</h2>
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
