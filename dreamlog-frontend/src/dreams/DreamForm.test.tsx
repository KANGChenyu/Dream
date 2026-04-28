import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DreamForm } from "./DreamForm";

describe("DreamForm", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-28T08:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("validates dream content and submits a backend-shaped create payload", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn().mockResolvedValue(undefined);

    render(<DreamForm onCreate={onCreate} />);
    vi.useRealTimers();

    expect(screen.getByLabelText("梦境日期")).toHaveValue("2026-04-28");

    await user.type(screen.getByLabelText("梦境内容"), "太短");
    await user.click(screen.getByRole("button", { name: "保存梦境" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("至少需要 10 个字符");
    expect(onCreate).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText("梦境内容"));
    await user.type(
      screen.getByLabelText("梦境内容"),
      "我穿过一座被月光照亮的花园，发现了一扇蓝色的门。"
    );
    await user.selectOptions(screen.getByLabelText("醒来情绪"), "happy");
    await user.clear(screen.getByLabelText("清晰度"));
    await user.type(screen.getByLabelText("清晰度"), "4");
    await user.click(screen.getByLabelText("清醒梦"));
    await user.click(screen.getByLabelText("公开到社区"));
    await user.click(screen.getByLabelText("匿名发布"));
    await user.click(screen.getByRole("button", { name: "保存梦境" }));

    expect(onCreate).toHaveBeenCalledWith({
      content: "我穿过一座被月光照亮的花园，发现了一扇蓝色的门。",
      dream_date: "2026-04-28",
      mood: "happy",
      clarity: 4,
      is_lucid: true,
      is_public: true,
      is_anonymous: false
    });
  });

  it("defaults the dream date from the local calendar day", () => {
    vi.setSystemTime(new Date("2026-04-27T16:30:00.000Z"));

    render(<DreamForm onCreate={vi.fn()} />);

    expect(screen.getByLabelText("梦境日期")).toHaveValue("2026-04-28");
  });

  it("does not submit when the dream date is empty", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn().mockResolvedValue(undefined);

    render(<DreamForm onCreate={onCreate} />);
    vi.useRealTimers();

    await user.type(
      screen.getByLabelText("梦境内容"),
      "我穿过一座被月光照亮的花园，发现了一扇蓝色的门。"
    );
    await user.clear(screen.getByLabelText("梦境日期"));
    await user.click(screen.getByRole("button", { name: "保存梦境" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("请选择梦境日期");
    expect(onCreate).not.toHaveBeenCalled();
  });
});
