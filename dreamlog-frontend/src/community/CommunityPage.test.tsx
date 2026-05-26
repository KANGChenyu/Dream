import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../api/client";
import { CommunityPage } from "./CommunityPage";

vi.mock("../api/client", () => ({
  apiBaseUrl: "http://localhost:8001/api/v1",
  api: {
    get: vi.fn()
  }
}));

describe("CommunityPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads and displays public dream feed", async () => {
    vi.mocked(api.get).mockResolvedValue({
      items: [
        {
          id: 7,
          title: "星河图书馆",
          content_preview: "我梦见书页像星星一样漂浮在空中。",
          dream_date: "2026-04-29",
          mood: "calm",
          image_url: "/generated-images/dream-7.png",
          user_nickname: "梦旅人",
          user_avatar: null,
          like_count: 3,
          comment_count: 1,
          tags: ["星光", "图书馆"],
          is_liked: false,
          created_at: "2026-04-29T00:00:00Z"
        }
      ],
      total: 1,
      page: 1,
      page_size: 20
    });

    render(
      <MemoryRouter>
        <CommunityPage />
      </MemoryRouter>
    );

    expect(api.get).toHaveBeenCalledWith("/community/feed");
    expect(await screen.findByText("星河图书馆")).toBeInTheDocument();
    expect(screen.getByText("我梦见书页像星星一样漂浮在空中。")).toBeInTheDocument();
    expect(screen.getByAltText("星河图书馆")).toHaveAttribute(
      "src",
      "http://localhost:8001/generated-images/dream-7.png"
    );
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("星光")).toBeInTheDocument();
  });
});
