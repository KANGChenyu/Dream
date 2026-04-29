import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DreamResponse } from "../api/types";
import { api } from "../api/client";
import { DreamDetailPage } from "./DreamDetailPage";
import { downloadDreamShareCard } from "./shareCardExport";

vi.mock("../api/client", () => ({
  apiBaseUrl: "http://localhost:8001/api/v1",
  api: {
    get: vi.fn(),
    post: vi.fn()
  }
}));

vi.mock("./shareCardExport", () => ({
  downloadDreamShareCard: vi.fn()
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

    await user.click(await screen.findByRole("button", { name: /\u68a6\u5883\u89e3\u6790/ }));
    await user.click(await screen.findByRole("button", { name: "\u751f\u6210 AI \u89e3\u8bfb" }));

    expect(api.post).toHaveBeenCalledWith("/dreams/1/interpret");
    expect(await screen.findByText("你的内心正在点亮一间安静的书房。")).toBeInTheDocument();
    expect(screen.getByText("心理学解读")).toBeInTheDocument();
    expect(screen.getByText("象征意义")).toBeInTheDocument();
    expect(screen.getByText("文化视角")).toBeInTheDocument();
    expect(screen.getByText("图书馆")).toBeInTheDocument();
  });

  it("opens AI interpretation inside a large modal instead of the side panel", async () => {
    const user = userEvent.setup();
    vi.mocked(api.get).mockResolvedValue({
      ...baseDream,
      interpretation: {
        psychology: "心理学弹窗内容",
        symbolism: "象征意义弹窗内容",
        cultural: "文化视角弹窗内容",
        summary: "解析摘要应该在弹窗里展示。",
        advice: "建议内容",
        keywords: ["弹窗"]
      }
    });

    renderDetail();

    await user.click(await screen.findByRole("button", { name: /\u68a6\u5883\u89e3\u6790/ }));

    const modal = await screen.findByRole("dialog", { name: "AI 梦境解析" });
    expect(modal).toHaveTextContent("解析摘要应该在弹窗里展示。");
    expect(modal).toHaveTextContent("心理学弹窗内容");
    expect(screen.getByRole("button", { name: "关闭弹窗" })).toBeInTheDocument();
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

    await user.click(await screen.findByRole("button", { name: /\u68a6\u5883\u56fe\u7247/ }));
    await user.click(await screen.findByRole("button", { name: "\u751f\u6210\u68a6\u5883\u753b\u9762" }));

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
  it("previews and downloads a private dream share card", async () => {
    const user = userEvent.setup();
    vi.mocked(api.get).mockResolvedValue({
      ...baseDream,
      title: "昨夜的月光之门",
      image_url: "data:image/png;base64,ZmFrZS1wbmc=",
      interpretation: {
        psychology: "心理学解读",
        symbolism: "象征意义",
        cultural: "文化视角",
        summary: "这个梦像是在提醒你：你正站在一个新的选择入口前。",
        advice: "醒来后可以记录下一件想尝试的新事。",
        keywords: ["月亮", "门", "水面", "选择"]
      },
      tags: [{ tag: "月亮" }, { tag: "门" }]
    });
    vi.mocked(downloadDreamShareCard).mockResolvedValue(undefined);

    renderDetail();

    await user.click(await screen.findByRole("button", { name: /\u5206\u4eab\u5361\u7247/ }));

    expect((await screen.findAllByText("昨夜的月光之门")).length).toBeGreaterThan(1);
    expect(screen.getAllByText("这个梦像是在提醒你：你正站在一个新的选择入口前。").length).toBeGreaterThan(0);
    expect(screen.getByText("DreamLog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "下载 PNG" }));

    expect(downloadDreamShareCard).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, title: "昨夜的月光之门" }),
      expect.objectContaining({ keywords: ["月亮", "门", "水面", "选择"] })
    );
  });

  it("loads public community dreams through the community endpoint", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      ...baseDream,
      is_public: true,
      interpretation: {
        psychology: "别人不应该看到这段心理学解读。",
        symbolism: "别人不应该看到这段象征意义。",
        cultural: "别人不应该看到这段文化视角。",
        summary: "别人不应该看到这段总结。",
        advice: "别人不应该看到这段建议。",
        keywords: ["隐私"]
      }
    }).mockResolvedValueOnce([]);

    renderCommunityDetail();

    expect(api.get).toHaveBeenCalledWith("/community/dreams/1");
    expect((await screen.findAllByText(baseDream.content)).length).toBeGreaterThan(0);
    expect(screen.queryByText("别人不应该看到这段总结。")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "生成 AI 解读" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "生成梦境画面" })).not.toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /点赞/ })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("写下温柔的共鸣或提问...")).toBeInTheDocument();
  });
});
