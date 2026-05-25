export function AgentChat({
  goal,
  onGoalChange,
  onSubmit,
  isSubmitting
}: {
  goal: string;
  onGoalChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  return (
    <section className="agent-chat-box">
      <textarea value={goal} onChange={(event) => onGoalChange(event.target.value)} />
      <button type="button" onClick={onSubmit} disabled={isSubmitting}>
        Start analysis
      </button>
    </section>
  );
}
