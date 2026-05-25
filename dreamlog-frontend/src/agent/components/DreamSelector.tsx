export function DreamSelector({
  dreamId,
  onDreamIdChange
}: {
  dreamId: string;
  onDreamIdChange: (value: string) => void;
}) {
  return (
    <label>
      Dream ID
      <input
        inputMode="numeric"
        value={dreamId}
        onChange={(event) => onDreamIdChange(event.target.value)}
      />
    </label>
  );
}
