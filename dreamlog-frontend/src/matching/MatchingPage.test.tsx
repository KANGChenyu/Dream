import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, api } from "../api/client";
import type { DreamMatchResponse, DreamResponse } from "../api/types";
import { MatchingPage } from "./MatchingPage";

vi.mock("../api/client", () => ({
  ApiError: class ApiError extends Error {
    constructor(message: string, public readonly status: number) {
      super(message);
      this.name = "ApiError";
    }
  },
  api: {
    get: vi.fn()
  }
}));

const mineDream: DreamResponse = {
  id: 1,
  content: "我梦见自己站在一扇发光的门前，水面上漂着月亮。",
  title: "昨夜的月光之门",
  dream_date: "2026-04-29",
  mood: "calm",
  clarity: 8,
  is_lucid: false,
  is_public: false,
  is_anonymous: true,
  image_url: null,
  image_style: null,
  share_card_url: null,
  like_count: 0,
  comment_count: 0,
  view_count: 0,
  interpretation: {
    psychology: "心理内容",
    symbolism: "象征内容",
    cultural: "文化内容",
    summary: "这段梦境正在寻找一个新的入口。",
    advice: "醒来后记录一个可以尝试的小行动。",
    keywords: ["月亮", "门"]
  },
  tags: [{ tag: "月亮" }, { tag: "门" }],
  created_at: "2026-04-29T00:00:00Z"
};

const matchedDream: DreamResponse = {
  ...mineDream,
  id: 8,
  content: "我梦见一条发光的河流通向远处的拱门。",
  title: "河流尽头的门",
  dream_date: "2026-04-27",
  is_public: true,
  like_count: 6,
  comment_count: 2,
  tags: [{ tag: "水面" }, { tag: "门" }]
};

function renderMatchingPage(initialPath = "/matching") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<MatchingPage />} path="/matching" />
        <Route element={<div>社区梦境详情</div>} path="/community/dreams/:id" />
        <Route element={<div>梦境详情</div>} path="/dreams/:id" />
      </Routes>
    </MemoryRouter>
  );
}

describe("MatchingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads my dreams and displays similarity matches for the selected dream", async () => {
    const user = userEvent.setup();
    const matches: DreamMatchResponse[] = [
      {
        dream: matchedDream,
        similarity: 0.87,
        match_reason: "你们都梦见了通向未知的门和发光的水面。"
      }
    ];

    vi.mocked(api.get)
      .mockResolvedValueOnce({ items: [mineDream], total: 1, page: 1, page_size: 20 })
      .mockResolvedValueOnce(matches);

    renderMatchingPage();

    expect(await screen.findByRole("heading", { name: "撞梦匹配" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /昨夜的月光之门/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "开始匹配" }));

    expect(api.get).toHaveBeenNthCalledWith(1, "/dreams");
    expect(api.get).toHaveBeenNthCalledWith(2, "/dreams/1/matches?limit=6");
    expect(await screen.findByText("河流尽头的门")).toBeInTheDocument();
    expect(screen.getByText("87%")).toBeInTheDocument();
    expect(screen.getByText("你们都梦见了通向未知的门和发光的水面。")).toBeInTheDocument();
  });

  it("explains that AI interpretation is required when the selected dream has no embedding", async () => {
    const user = userEvent.setup();
    vi.mocked(api.get)
      .mockResolvedValueOnce({ items: [mineDream], total: 1, page: 1, page_size: 20 })
      .mockRejectedValueOnce(new ApiError("梦境尚未生成向量，请先触发 AI 解读", 400));

    renderMatchingPage("/matching?dreamId=1");

    await user.click(await screen.findByRole("button", { name: "开始匹配" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("梦境尚未生成向量，请先触发 AI 解读");
    expect(screen.getByRole("link", { name: "去 AI 解梦" })).toHaveAttribute("href", "/dreams/1");
  });

  it("shows an empty result state after matching returns no dreams", async () => {
    const user = userEvent.setup();
    vi.mocked(api.get)
      .mockResolvedValueOnce({ items: [mineDream], total: 1, page: 1, page_size: 20 })
      .mockResolvedValueOnce([]);

    renderMatchingPage();

    await user.click(await screen.findByRole("button", { name: "开始匹配" }));

    expect(await screen.findByText("暂无匹配结果")).toBeInTheDocument();
    expect(screen.getByText("可以发布更多梦境，或等社区里出现更多已解析的公开梦境后再试。")).toBeInTheDocument();
    expect(screen.queryByText("等待匹配")).not.toBeInTheDocument();
  });
});
