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

    expect(screen.getByLabelText("Dream date")).toHaveValue("2026-04-28");

    await user.type(screen.getByLabelText("Dream content"), "short");
    await user.click(screen.getByRole("button", { name: "Save dream" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("at least 10 characters");
    expect(onCreate).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText("Dream content"));
    await user.type(
      screen.getByLabelText("Dream content"),
      "I walked through a moonlit garden and found a blue door."
    );
    await user.selectOptions(screen.getByLabelText("Mood"), "happy");
    await user.clear(screen.getByLabelText("Clarity"));
    await user.type(screen.getByLabelText("Clarity"), "4");
    await user.click(screen.getByLabelText("Lucid dream"));
    await user.click(screen.getByLabelText("Share publicly"));
    await user.click(screen.getByLabelText("Post anonymously"));
    await user.click(screen.getByRole("button", { name: "Save dream" }));

    expect(onCreate).toHaveBeenCalledWith({
      content: "I walked through a moonlit garden and found a blue door.",
      dream_date: "2026-04-28",
      mood: "happy",
      clarity: 4,
      is_lucid: true,
      is_public: true,
      is_anonymous: false
    });
  });
});
