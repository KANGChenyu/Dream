import type { DreamResponse } from "../../api/types";

export function DreamSelector({
  dreamId,
  dreams,
  loading,
  onDreamIdChange
}: {
  dreamId: string;
  dreams: DreamResponse[];
  loading: boolean;
  onDreamIdChange: (value: string) => void;
}) {
  return (
    <div className="agent-dream-selector">
      <label>
        Dream
        <select
          disabled={loading}
          value={dreamId}
          onChange={(event) => onDreamIdChange(event.target.value)}
        >
          <option value="">{loading ? "Loading dreams..." : "Choose a dream"}</option>
          {dreams.map((dream) => (
            <option key={dream.id} value={dream.id}>
              {dream.title ?? `${dream.dream_date} · ${dream.content.slice(0, 32)}`}
            </option>
          ))}
        </select>
      </label>
      <label>
        Manual Dream ID
        <input
          inputMode="numeric"
          value={dreamId}
          onChange={(event) => onDreamIdChange(event.target.value)}
        />
      </label>
    </div>
  );
}
