import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { LoginPage } from "./LoginPage";

describe("LoginPage", () => {
  it("validates phone, displays debug code, and submits phone login", async () => {
    const user = userEvent.setup();
    const sendCode = vi.fn().mockResolvedValue({ message: "ok", debug_code: "123456" });
    const login = vi.fn().mockResolvedValue(undefined);

    render(<LoginPage sendCode={sendCode} login={login} />);

    await user.type(screen.getByLabelText("手机号"), "12345");
    await user.click(screen.getByRole("button", { name: "获取验证码" }));

    expect(await screen.findByText("请输入有效的中国大陆手机号")).toBeInTheDocument();
    expect(sendCode).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText("手机号"));
    await user.type(screen.getByLabelText("手机号"), "13800000000");
    await user.click(screen.getByRole("button", { name: "获取验证码" }));

    expect(sendCode).toHaveBeenCalledWith("13800000000");
    expect(await screen.findByText("开发验证码：123456")).toBeInTheDocument();
    expect(screen.getByLabelText("验证码")).toHaveValue("123456");

    await user.click(screen.getByRole("button", { name: "进入梦境" }));

    expect(login).toHaveBeenCalledWith("13800000000", "123456");
  });
});
