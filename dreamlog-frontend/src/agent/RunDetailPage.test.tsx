import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RunDetailPage } from "./RunDetailPage";

vi.mock("./api", () => ({
  getAgentRun: () =>
    Promise.resolve({
      id: 1,
      conversation_id: null,
      goal: "analysis",
      intent: "single_dream_deep_analysis",
      target_dream_id: 1,
      status: "succeeded",
      final_output: {
        title: "Dream report",
        summary: "A report",
        provider: "fallback",
        model: "template",
        fallback_reason: "missing api key",
        cultural: "Roads are often read as life paths.",
        knowledge_evidence: [
          {
            source_title: "Lost",
            source_type: "zhougong",
            snippet: "Getting lost can relate to unclear direction.",
            relevance: "keyword_score:2"
          }
        ],
        personal_patterns: [
          {
            dream_id: 8,
            date: "2026-05-20",
            summary: "Another dream about looking for a road.",
            relation: "recent_user_dream"
          }
        ]
      },
      error_message: null,
      steps: []
    })
}));

describe("RunDetailPage", () => {
  it("loads a run by route id", async () => {
    render(
      <MemoryRouter initialEntries={["/agent/runs/1"]}>
        <Routes>
          <Route path="/agent/runs/:id" element={<RunDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("Dream report")).toBeInTheDocument();
    expect(screen.getByText("fallback")).toBeInTheDocument();
    expect(screen.getByText("template")).toBeInTheDocument();
    expect(screen.getByText(/missing api key/)).toBeInTheDocument();
    expect(screen.getByText("zhougong")).toBeInTheDocument();
    expect(screen.getByText("keyword_score:2")).toBeInTheDocument();
    expect(screen.getByText(/Dream #8/)).toBeInTheDocument();
  });
});
