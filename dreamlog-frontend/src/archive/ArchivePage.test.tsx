import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../api/client";
import type { DreamResponse } from "../api/types";
import { ArchivePage } from "./ArchivePage";

vi.mock("../api/client", () => ({
  api: {
    get: vi.fn()
  }
}));

const moonDream: DreamResponse = {
  id: 1,
  content: "我梦见月亮落在水面上，一扇发光的门慢慢打开。",
  title: "月光之门",
  dream_date: "2026-04-30",
  mood: "calm",
  clarity: 5,
  is_lucid: false,
  is_public: true,
  is_anonymous: true,
  image_url: "/generated-images/moon.png",
  image_style: "surreal_dreamlike",
  share_card_url: null,
  like_count: 2,
  comment_count: 1,
  view_count: 9,
  interpretation: {
    psychology: "平静的探索。",
    symbolism: "门与月亮。",
    cultural: "月亮象征照见。",
    summary: "你正在靠近新的入口。",
    advice: "慢慢靠近。",
    keywords: ["月亮", "门"]
  },
  tags: [{ tag: "月亮" }, { tag: "门" }],
  created_at: "2026-04-30T00:00:00Z"
};

const chaseDream: DreamResponse = {
  ...moonDream,
  id: 2,
  content: "有个黑影在走廊里追赶我，我怎么跑都跑不动。",
  title: "走廊追逐",
  dream_date: "2026-04-29",
  mood: "scared",
  clarity: 3,
  is_public: false,
  image_url: null,
  interpretation: null,
  tags: [{ tag: "追逐" }],
  created_at: "2026-04-29T00:00:00Z"
};

function renderArchive() {
  return render(
    <MemoryRouter initialEntries={["/archive"]}>
      <Routes>
        <Route element={<ArchivePage />} path="/archive" />
        <Route element={<div>梦境详情页</div>} path="/dreams/:id" />
      </Routes>
    </MemoryRouter>
  );
}

describe("ArchivePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads dreams and filters the archive by keyword, mood, and visibility", async () => {
    const user = userEvent.setup();
    vi.mocked(api.get).mockResolvedValue({
      items: [moonDream, chaseDream],
      total: 2,
      page: 1,
      page_size: 20
    });

    renderArchive();

    expect(api.get).toHaveBeenCalledWith("/dreams");
    expect(await screen.findByRole("heading", { name: "梦境档案" })).toBeInTheDocument();
    expect(screen.getByText("月光之门")).toBeInTheDocument();
    expect(screen.getByText("走廊追逐")).toBeInTheDocument();
    expect(screen.getAllByText("已解析").length).toBeGreaterThan(0);
    expect(screen.getAllByText("已绘梦").length).toBeGreaterThan(0);
    expect(screen.getByText("未解析")).toBeInTheDocument();

    await user.type(screen.getByLabelText("搜索梦境"), "月亮");
    expect(screen.getByText("月光之门")).toBeInTheDocument();
    expect(screen.queryByText("走廊追逐")).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText("搜索梦境"));
    await user.selectOptions(screen.getByLabelText("醒来情绪"), "scared");
    expect(screen.queryByText("月光之门")).not.toBeInTheDocument();
    expect(screen.getByText("走廊追逐")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("醒来情绪"), "all");
    await user.selectOptions(screen.getByLabelText("公开状态"), "public");
    expect(screen.getByText("月光之门")).toBeInTheDocument();
    expect(screen.queryByText("走廊追逐")).not.toBeInTheDocument();
  });
});
