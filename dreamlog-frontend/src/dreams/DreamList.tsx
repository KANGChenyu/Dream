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
        message="你的梦境档案正在与云端同步。"
        title="正在唤回梦境..."
      />
    );
  }

  if (dreams.length === 0) {
    return (
      <StatusMessage
        message="写下第一段梦境，DreamLog 会将它保存在你的私人档案中。"
        title="还没有记录梦境"
      />
    );
  }

  return (
    <div className="dream-list" aria-label="梦境条目">
      {dreams.map((dream) => (
        <Link className="dream-card" key={dream.id} to={`/dreams/${dream.id}`}>
          <span className="dream-card__date">{dream.dream_date}</span>
          <strong>{dream.title ?? previewContent(dream.content).slice(0, 48)}</strong>
          <p>{previewContent(dream.content)}</p>
          <div className="dream-meta">
            <span>{getMoodLabel(dream.mood)}</span>
            <span>{getClarityLabel(dream.clarity)}</span>
            <span>{dream.is_lucid ? "清醒梦" : "普通梦"}</span>
            <span>{dream.is_public ? "公开" : "私密"}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
