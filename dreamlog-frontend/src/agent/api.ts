import { api, apiBaseUrl } from "../api/client";
import type { AgentRun } from "./types";

export function createAgentRun(goal: string, dreamId: number | null) {
  return api.post<AgentRun>("/agent/runs", {
    goal,
    dream_id: dreamId
  });
}

export function getAgentRun(runId: number) {
  return api.get<AgentRun>(`/agent/runs/${runId}`);
}

export function createRunEventSource(runId: number) {
  return new EventSource(`${apiBaseUrl}/agent/runs/${runId}/events`);
}
