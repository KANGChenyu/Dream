import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../api/client";
import type { DreamResponse } from "../api/types";
import { RecordPage } from "./RecordPage";

vi.mock("../api/client", () => ({
  api: {
    post: vi.fn()
  }
}));

const savedDream: DreamResponse = {
  id: 77,
  content: "我梦见月亮落在水面上，一扇发光的门慢慢打开。",
  title: "月光之门",
  dream_date: "2026-04-30",
  mood: "calm",
  clarity: 5,
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
  tags: [{ tag: "月亮" }, { tag: "门" }],
  created_at: "2026-04-30T00:00:00Z"
};

function renderRecord() {
  return render(
    <MemoryRouter initialEntries={["/record"]}>
      <Routes>
        <Route element={<RecordPage />} path="/record" />
        <Route element={<div>梦境详情页</div>} path="/dreams/:id" />
      </Routes>
    </MemoryRouter>
  );
}

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("梦境标题"), "月光之门");
  await user.type(screen.getByLabelText("梦境内容"), "我梦见月亮落在水面上，一扇发光的门慢慢打开。");
  await user.clear(screen.getByLabelText("做梦日期"));
  await user.type(screen.getByLabelText("做梦日期"), "2026-04-30");
  await user.clear(screen.getByLabelText("醒来时间"));
  await user.type(screen.getByLabelText("醒来时间"), "07:30");
  await user.selectOptions(screen.getByLabelText("醒来情绪"), "calm");
  await user.selectOptions(screen.getByLabelText("梦境类型"), "奇幻梦");
  await user.clear(screen.getByLabelText("梦境清晰度"));
  await user.type(screen.getByLabelText("梦境清晰度"), "5");
  await user.type(screen.getByLabelText("梦境标签"), "月亮，门");
}

describe("RecordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves a dream and stays on the record page", async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockResolvedValue(savedDream);

    renderRecord();
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "保存梦境" }));

    expect(api.post).toHaveBeenCalledWith(
      "/dreams",
      expect.objectContaining({
        title: "月光之门",
        dream_date: "2026-04-30",
        mood: "calm",
        clarity: 5,
        is_public: false,
        is_anonymous: true,
        tags: ["月亮", "门"]
      })
    );
    expect(await screen.findByRole("status")).toHaveTextContent("已保存");
    expect(screen.getByRole("heading", { name: "记录梦境" })).toBeInTheDocument();
  });

  it("saves then interprets the dream before navigating to detail", async () => {
    const user = userEvent.setup();
    let resolveInterpret: (value: DreamResponse) => void = () => undefined;
    const interpretPromise = new Promise<DreamResponse>((resolve) => {
      resolveInterpret = resolve;
    });
    vi.mocked(api.post)
      .mockResolvedValueOnce(savedDream)
      .mockReturnValueOnce(interpretPromise);

    renderRecord();
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "AI 解梦" }));

    expect(await screen.findByRole("status")).toHaveTextContent("正在解析");
    expect(api.post).toHaveBeenNthCalledWith(1, "/dreams", expect.any(Object));
    expect(api.post).toHaveBeenNthCalledWith(2, "/dreams/77/interpret");
    resolveInterpret({
      ...savedDream,
      interpretation: { psychology: "解析", symbolism: "象征", cultural: "文化", summary: "摘要", advice: "建议", keywords: ["月亮"] }
    });
    expect(await screen.findByText("梦境详情页")).toBeInTheDocument();
  });
});
