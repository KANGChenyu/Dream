import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("renders the DreamLog placeholder", () => {
    render(<App />);

    expect(screen.getByText("DreamLog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "AI 梦境日志与解析社区" })).toBeInTheDocument();
  });
});
