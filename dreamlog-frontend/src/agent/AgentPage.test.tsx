import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentPage } from "./AgentPage";
import { api } from "../api/client";

vi.mock("../api/client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn()
  }
}));

describe("AgentPage", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockResolvedValue({
      items: [
        {
          id: 7,
          title: "迷路的城市",
          content: "我在陌生城市里迷路。",
          dream_date: "2026-05-25",
          mood: "anxious",
          clarity: 4,
          is_lucid: false,
          is_public: false,
          is_anonymous: true,
          image_url: null,
          image_style: null,
          share_card_url: null,
          like_count: 0,
          comment_count: 0,
          view_count: 0,
          interpretation: null,
          tags: [],
          created_at: "2026-05-25T00:00:00Z"
        }
      ],
      total: 1,
      page: 1,
      page_size: 20
    });
  });

  it("renders the Dream Agent workspace", async () => {
    render(<AgentPage />);

    expect(screen.getByRole("heading", { name: /Dream Agent/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Start analysis/i })).toBeInTheDocument();
    expect(await screen.findByRole("option", { name: /迷路的城市/ })).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith("/dreams");
  });

  it("starts analysis with the selected dream", async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockResolvedValue({
      id: 3,
      conversation_id: null,
      goal: "Please deeply analyze this dream.",
      intent: "single_dream_deep_analysis",
      target_dream_id: 7,
      status: "succeeded",
      final_output: { title: "Dream Agent report" },
      error_message: null,
      steps: []
    });

    render(<AgentPage />);

    await user.selectOptions(await screen.findByLabelText("Dream"), "7");
    await user.click(screen.getByRole("button", { name: /Start analysis/i }));

    expect(api.post).toHaveBeenCalledWith("/agent/runs", {
      goal: "Please deeply analyze this dream.",
      dream_id: 7
    });
  });
});
