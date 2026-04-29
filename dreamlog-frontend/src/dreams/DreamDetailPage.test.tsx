import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DreamResponse } from "../api/types";
import { api } from "../api/client";
import { DreamDetailPage } from "./DreamDetailPage";

vi.mock("../api/client", () => ({
  apiBaseUrl: "http://localhost:8001/api/v1",
  api: {
    get: vi.fn(),
    post: vi.fn()
  }
}));

const baseDream: DreamResponse = {
  id: 1,
  content: "我梦见自己走进一座会发光的图书馆，书页像星星一样漂浮在空中。",
  title: null,
  dream_date: "2026-04-28",
  mood: "calm",
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
  created_at: "2026-04-28T00:00:00Z"
};

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={["/dreams/1"]}>
      <Routes>
        <Route element={<DreamDetailPage />} path="/dreams/:id" />
      </Routes>
    </MemoryRouter>
  );
}

function renderCommunityDetail() {
  return render(
    <MemoryRouter initialEntries={["/community/dreams/1"]}>
      <Routes>
        <Route element={<DreamDetailPage source="community" />} path="/community/dreams/:id" />
      </Routes>
    </MemoryRouter>
  );
}

describe("DreamDetailPage interpretation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates and displays AI dream interpretation", async () => {
    const user = userEvent.setup();
    vi.mocked(api.get).mockResolvedValue(baseDream);
    vi.mocked(api.post).mockResolvedValue({
      ...baseDream,
      title: "星光图书馆",
      interpretation: {
        psychology: "这段梦像是在整理近期的知识和情绪。",
        symbolism: "图书馆象征记忆，星光象征灵感。",
        cultural: "周公解梦里，光与书常与明朗、求知相关。",
        summary: "你的内心正在点亮一间安静的书房。",
        advice: "醒来后可以记录一个最近想学习的问题。",
        keywords: ["图书馆", "星光", "书页"]
      },
      tags: [{ tag: "图书馆" }, { tag: "星光" }]
    });

    renderDetail();

    await user.click(await screen.findByRole("button", { name: "生成 AI 解读" }));

    expect(api.post).toHaveBeenCalledWith("/dreams/1/interpret");
    expect(await screen.findByText("你的内心正在点亮一间安静的书房。")).toBeInTheDocument();
    expect(screen.getByText("心理学解读")).toBeInTheDocument();
    expect(screen.getByText("象征意义")).toBeInTheDocument();
    expect(screen.getByText("文化视角")).toBeInTheDocument();
    expect(screen.getByText("图书馆")).toBeInTheDocument();
  });

  it("generates and displays AI dream image", async () => {
    const user = userEvent.setup();
    vi.mocked(api.get).mockResolvedValue(baseDream);
    vi.mocked(api.post).mockResolvedValue({
      ...baseDream,
      image_url: "data:image/png;base64,ZmFrZS1wbmc=",
      image_style: "surreal_dreamlike"
    });

    renderDetail();

    await user.click(await screen.findByRole("button", { name: "生成梦境画面" }));

    expect(api.post).toHaveBeenCalledWith("/dreams/1/generate-image", {
      style: "surreal_dreamlike"
    });
    expect(await screen.findByAltText("AI 生成的梦境画面")).toHaveAttribute(
      "src",
      "data:image/png;base64,ZmFrZS1wbmc="
    );
  });

  it("publishes the dream to the community", async () => {
    const user = userEvent.setup();
    vi.mocked(api.get).mockResolvedValue(baseDream);
    vi.mocked(api.post).mockResolvedValue({
      ...baseDream,
      is_public: true,
      is_anonymous: false
    });

    renderDetail();

    await user.click(await screen.findByRole("button", { name: "发布到社区" }));

    expect(api.post).toHaveBeenCalledWith("/dreams/1/publish", {
      is_anonymous: false
    });
    expect(await screen.findByText("已发布到社区")).toBeInTheDocument();
  });
  it("loads public community dreams through the community endpoint", async () => {
    vi.mocked(api.get).mockResolvedValue({
      ...baseDream,
      is_public: true
    });

    renderCommunityDetail();

    expect(api.get).toHaveBeenCalledWith("/community/dreams/1");
    expect((await screen.findAllByText(baseDream.content)).length).toBeGreaterThan(0);
  });
});
