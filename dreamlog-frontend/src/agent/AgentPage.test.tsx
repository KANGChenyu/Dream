import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AgentPage } from "./AgentPage";

describe("AgentPage", () => {
  it("renders the Dream Agent workspace", () => {
    render(<AgentPage />);

    expect(screen.getByRole("heading", { name: /Dream Agent/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Start analysis/i })).toBeInTheDocument();
  });
});
