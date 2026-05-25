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
      final_output: { title: "Dream report", summary: "A report" },
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
  });
});
