import { Link } from "react-router-dom";

import type { DreamResponse } from "../api/types";
import { StatusMessage } from "../components/StatusMessage";
import { getClarityLabel, getMoodLabel } from "./dreamOptions";

interface DreamListProps {
  dreams: DreamResponse[];
  loading: boolean;
}

function previewContent(content: string) {
  return content.length > 120 ? `${content.slice(0, 120)}...` : content;
}

export function DreamList({ dreams, loading }: DreamListProps) {
  if (loading) {
    return (
      <StatusMessage
        message="Your dream archive is syncing with the cloud."
        title="Calling dreams back..."
      />
    );
  }

  if (dreams.length === 0) {
    return (
      <StatusMessage
        message="Write the first entry and DreamLog will keep it in your private archive."
        title="No dreams recorded yet"
      />
    );
  }

  return (
    <div className="dream-list" aria-label="Dream entries">
      {dreams.map((dream) => (
        <Link className="dream-card" key={dream.id} to={`/dreams/${dream.id}`}>
          <span className="dream-card__date">{dream.dream_date}</span>
          <strong>{dream.title ?? previewContent(dream.content).slice(0, 48)}</strong>
          <p>{previewContent(dream.content)}</p>
          <div className="dream-meta">
            <span>{getMoodLabel(dream.mood)}</span>
            <span>{getClarityLabel(dream.clarity)}</span>
            <span>{dream.is_lucid ? "Lucid" : "Regular"}</span>
            <span>{dream.is_public ? "Public" : "Private"}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
