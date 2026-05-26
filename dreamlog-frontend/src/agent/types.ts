export interface AgentStep {
  id: number;
  step_index: number;
  agent_name: string;
  step_type: string;
  status: string;
  input_payload: Record<string, unknown> | null;
  output_payload: Record<string, unknown> | null;
  error_message: string | null;
}

export interface AgentRun {
  id: number;
  conversation_id: number | null;
  goal: string;
  intent: string;
  target_dream_id: number | null;
  status: string;
  final_output: Record<string, unknown> | null;
  error_message: string | null;
  steps: AgentStep[];
}
