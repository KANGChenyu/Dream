import { FormEvent, useState } from "react";

import type { SendSmsResponse } from "../api/types";
import { useAuth } from "./AuthContext";

const PHONE_PATTERN = /^1[3-9]\d{9}$/;

interface LoginPageProps {
  sendCode?: (phone: string) => Promise<SendSmsResponse>;
  login?: (phone: string, code: string) => Promise<void>;
}

interface LoginFormProps {
  sendCode: (phone: string) => Promise<SendSmsResponse>;
  login: (phone: string, code: string) => Promise<void>;
}

export function LoginPage({ sendCode, login }: LoginPageProps) {
  if (sendCode && login) {
    return <LoginForm sendCode={sendCode} login={login} />;
  }

  return <ConnectedLoginPage />;
}

function ConnectedLoginPage() {
  const auth = useAuth();
  return <LoginForm sendCode={auth.sendCode} login={auth.login} />;
}

function LoginForm({ sendCode, login }: LoginFormProps) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [debugCode, setDebugCode] = useState("");
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const validatePhone = () => {
    if (!PHONE_PATTERN.test(phone)) {
      setError("请输入有效的中国大陆手机号");
      return false;
    }

    return true;
  };

  const handleSendCode = async () => {
    setError("");
    setDebugCode("");
    if (!validatePhone()) {
      return;
    }

    setIsSending(true);
    try {
      const response = await sendCode(phone);
      if (response.debug_code) {
        setDebugCode(response.debug_code);
        setCode(response.debug_code);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "验证码发送失败");
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!validatePhone()) {
      return;
    }

    if (!code.trim()) {
      setError("请输入验证码");
      return;
    }

    setIsLoggingIn(true);
    try {
      await login(phone, code.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败，请稍后重试");
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <main className="app-shell auth-shell">
      <section className="hero-title auth-panel">
        <p className="eyebrow">DreamLog</p>
        <h1>AI 梦境日志与解析社区</h1>
        <p>用手机号验证码进入你的梦境记录空间</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            <span>手机号</span>
            <input
              autoComplete="tel"
              inputMode="tel"
              name="phone"
              onChange={(event) => setPhone(event.target.value.trim())}
              placeholder="13800000000"
              value={phone}
            />
          </label>

          <label>
            <span>验证码</span>
            <div className="code-row">
              <input
                autoComplete="one-time-code"
                inputMode="numeric"
                name="code"
                onChange={(event) => setCode(event.target.value.trim())}
                placeholder="6 位验证码"
                value={code}
              />
              <button disabled={isSending || isLoggingIn} onClick={handleSendCode} type="button">
                {isSending ? "发送中" : "获取验证码"}
              </button>
            </div>
          </label>

          {debugCode ? <p className="debug-code">开发验证码：{debugCode}</p> : null}
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}

          <button className="primary-action" disabled={isLoggingIn || isSending} type="submit">
            {isLoggingIn ? "进入中" : "进入梦境"}
          </button>
        </form>
      </section>
    </main>
  );
}
