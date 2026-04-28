# DreamLog Web MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first usable DreamLog Web MVP: phone login, dream creation, my dream list, dream detail, and a `Dream.png`-inspired visual shell.

**Architecture:** Add a new Vite + React + TypeScript frontend in `dreamlog-frontend/` that calls the existing FastAPI backend. Keep the first frontend slice client-rendered and focused; backend changes are limited to whatever is required to make local auth and dream CRUD work end to end.

**Tech Stack:** FastAPI, SQLAlchemy async, PostgreSQL/pgvector, Redis, Vite, React, TypeScript, React Router, Vitest, Testing Library, CSS modules/plain CSS.

---

## File Structure

### Backend files to inspect or modify

- `dreamlog-backend/app/main.py`
  - Keep CORS compatible with `http://localhost:5173`.
- `dreamlog-backend/app/core/database.py`
  - Ensure database initialization can create `pgvector` extension and tables.
- `dreamlog-backend/app/api/v1/auth.py`
  - Confirm development SMS flow returns `debug_code`.
- `dreamlog-backend/app/api/v1/dreams.py`
  - Confirm CRUD works and fix runtime issues encountered during smoke tests.
- `dreamlog-backend/requirements.txt`
  - Use existing backend dependency list.
- `dreamlog-backend/.env`
  - Create from `.env.example` locally if missing. Do not commit real secrets.

### Frontend files to create

- `dreamlog-frontend/package.json`
  - Scripts and dependencies.
- `dreamlog-frontend/index.html`
  - Vite entry document.
- `dreamlog-frontend/vite.config.ts`
  - React/Vitest config.
- `dreamlog-frontend/tsconfig.json`
  - TypeScript config.
- `dreamlog-frontend/src/main.tsx`
  - React bootstrap.
- `dreamlog-frontend/src/App.tsx`
  - Route layout and auth gate.
- `dreamlog-frontend/src/styles.css`
  - Global `Dream.png`-inspired visual system.
- `dreamlog-frontend/src/api/client.ts`
  - Fetch wrapper and auth token handling.
- `dreamlog-frontend/src/api/types.ts`
  - Backend response/request types.
- `dreamlog-frontend/src/auth/AuthContext.tsx`
  - Auth state provider.
- `dreamlog-frontend/src/auth/LoginPage.tsx`
  - Phone login page.
- `dreamlog-frontend/src/dreams/DreamWorkspace.tsx`
  - Main journaling workspace.
- `dreamlog-frontend/src/dreams/DreamForm.tsx`
  - Dream entry form.
- `dreamlog-frontend/src/dreams/DreamList.tsx`
  - My dreams panel.
- `dreamlog-frontend/src/dreams/DreamDetailPage.tsx`
  - Dream detail page.
- `dreamlog-frontend/src/dreams/dreamOptions.ts`
  - Mood and clarity options.
- `dreamlog-frontend/src/components/GlassPanel.tsx`
  - Reusable glass panel.
- `dreamlog-frontend/src/components/StatusMessage.tsx`
  - Loading/error/empty messages.
- `dreamlog-frontend/src/test/setup.ts`
  - Test setup.

---

## Task 1: Backend Local Smoke Path

**Files:**
- Inspect: `dreamlog-backend/.env.example`
- Inspect: `dreamlog-backend/docker-compose.yml`
- Inspect: `dreamlog-backend/app/core/database.py`
- Modify if needed: `dreamlog-backend/app/core/database.py`
- Create if needed: `dreamlog-backend/scripts/init_db.py`

- [ ] **Step 1: Confirm backend dependencies and environment**

Run:

```powershell
cd C:\Users\KCY\Test\Dream\Dream\dreamlog-backend
if (!(Test-Path .env)) { Copy-Item .env.example .env }
python -m pip install -r requirements.txt
```

Expected:

```text
Successfully installed ...
```

If local Python is not intended for this repo, use Docker instead:

```powershell
cd C:\Users\KCY\Test\Dream\Dream\dreamlog-backend
docker compose up -d postgres redis
```

- [ ] **Step 2: Write a minimal database init script if tables cannot be created**

Create `dreamlog-backend/scripts/init_db.py`:

```python
import asyncio

from sqlalchemy import text

from app.core.database import Base, engine
from app.models import community, dream, user  # noqa: F401


async def main() -> None:
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.run_sync(Base.metadata.create_all)


if __name__ == "__main__":
    asyncio.run(main())
```

- [ ] **Step 3: Run database initialization**

Run:

```powershell
cd C:\Users\KCY\Test\Dream\Dream\dreamlog-backend
python scripts/init_db.py
```

Expected:

```text
# no traceback
```

- [ ] **Step 4: Start backend**

Run:

```powershell
cd C:\Users\KCY\Test\Dream\Dream\dreamlog-backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Expected:

```text
Uvicorn running on http://0.0.0.0:8000
```

- [ ] **Step 5: Smoke test health endpoint**

In a second terminal:

```powershell
Invoke-RestMethod http://localhost:8000/health
```

Expected:

```text
status
------
ok
```

- [ ] **Step 6: Commit backend smoke support if files changed**

Run:

```powershell
cd C:\Users\KCY\Test\Dream\Dream
git add dreamlog-backend/app/core/database.py dreamlog-backend/scripts/init_db.py
git commit -m "chore: add backend local database init"
```

Only commit files that were actually created or modified.

---

## Task 2: Frontend Scaffold

**Files:**
- Create: `dreamlog-frontend/package.json`
- Create: `dreamlog-frontend/index.html`
- Create: `dreamlog-frontend/vite.config.ts`
- Create: `dreamlog-frontend/tsconfig.json`
- Create: `dreamlog-frontend/tsconfig.node.json`
- Create: `dreamlog-frontend/src/main.tsx`
- Create: `dreamlog-frontend/src/App.tsx`
- Create: `dreamlog-frontend/src/styles.css`
- Create: `dreamlog-frontend/src/test/setup.ts`

- [ ] **Step 1: Create frontend project files**

Create `dreamlog-frontend/package.json`:

```json
{
  "name": "dreamlog-frontend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0 --port 5173",
    "build": "tsc -b && vite build",
    "preview": "vite preview --host 0.0.0.0 --port 4173",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "lucide-react": "^0.468.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.18",
    "@types/react-dom": "^18.3.5",
    "jsdom": "^25.0.1",
    "typescript": "^5.7.2",
    "vite": "^6.0.7",
    "vitest": "^2.1.8"
  }
}
```

Create `dreamlog-frontend/index.html`:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>DreamLog | AI 梦境日志</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `dreamlog-frontend/vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true
  }
});
```

Create `dreamlog-frontend/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2020"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

Create `dreamlog-frontend/tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

Create `dreamlog-frontend/src/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

Create `dreamlog-frontend/src/main.tsx`:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

Create a temporary `dreamlog-frontend/src/App.tsx`:

```tsx
export function App() {
  return (
    <main className="app-shell">
      <section className="hero-title">
        <p className="eyebrow">DreamLog</p>
        <h1>AI 梦境日志与解析社区</h1>
        <p>记录梦境 · AI 解析 · 匿名共鸣</p>
      </section>
    </main>
  );
}
```

Create minimal `dreamlog-frontend/src/styles.css`:

```css
:root {
  color: #f7f2ff;
  background: #08091c;
  font-family: "Microsoft YaHei", "PingFang SC", system-ui, sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
}

.app-shell {
  min-height: 100vh;
  padding: 48px;
  background:
    radial-gradient(circle at 50% 35%, rgba(138, 99, 255, 0.45), transparent 32%),
    radial-gradient(circle at 18% 20%, rgba(75, 137, 255, 0.22), transparent 28%),
    linear-gradient(180deg, #060817 0%, #12143a 52%, #070818 100%);
}

.hero-title {
  max-width: 920px;
  margin: 0 auto;
  text-align: center;
}

.hero-title h1 {
  margin: 0;
  font-size: clamp(44px, 7vw, 92px);
  line-height: 1.05;
  letter-spacing: 0;
  text-shadow: 0 0 32px rgba(175, 143, 255, 0.75);
}

.hero-title p {
  color: #ddd4ff;
}

.eyebrow {
  color: #b99bff;
  font-weight: 700;
}
```

- [ ] **Step 2: Install dependencies**

Run:

```powershell
cd C:\Users\KCY\Test\Dream\Dream\dreamlog-frontend
npm install
```

Expected:

```text
added ... packages
```

- [ ] **Step 3: Verify build**

Run:

```powershell
npm run build
```

Expected:

```text
✓ built in ...
```

- [ ] **Step 4: Commit scaffold**

Run:

```powershell
cd C:\Users\KCY\Test\Dream\Dream
git add dreamlog-frontend
git commit -m "feat: scaffold DreamLog web frontend"
```

---

## Task 3: API Client And Types

**Files:**
- Create: `dreamlog-frontend/src/api/types.ts`
- Create: `dreamlog-frontend/src/api/client.ts`
- Create: `dreamlog-frontend/src/api/client.test.ts`

- [ ] **Step 1: Write API client tests**

Create `dreamlog-frontend/src/api/client.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, createApiClient } from "./client";

describe("createApiClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("attaches bearer token when available", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: "ok" })
    });

    const api = createApiClient({
      baseUrl: "http://localhost:8000/api/v1",
      getToken: () => "abc123",
      fetchImpl: fetchMock as typeof fetch
    });

    await api.get("/auth/me");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/auth/me",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer abc123"
        })
      })
    );
  });

  it("throws ApiError for failed responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ detail: "验证码错误" })
    });

    const api = createApiClient({
      baseUrl: "http://localhost:8000/api/v1",
      getToken: () => null,
      fetchImpl: fetchMock as typeof fetch
    });

    await expect(api.post("/auth/login/phone", { phone: "13800000000", code: "000000" }))
      .rejects.toMatchObject(new ApiError("验证码错误", 400));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
cd C:\Users\KCY\Test\Dream\Dream\dreamlog-frontend
npm test -- src/api/client.test.ts
```

Expected:

```text
FAIL src/api/client.test.ts
Cannot find module './client'
```

- [ ] **Step 3: Implement types**

Create `dreamlog-frontend/src/api/types.ts`:

```ts
export type Mood = "calm" | "happy" | "anxious" | "scared" | "confused" | "sad";

export interface UserResponse {
  id: number;
  nickname: string;
  avatar_url: string | null;
  bio: string | null;
  is_anonymous: boolean;
  is_vip: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: UserResponse;
}

export interface SendSmsResponse {
  message: string;
  debug_code?: string;
}

export interface DreamCreateRequest {
  content: string;
  dream_date: string;
  mood?: Mood;
  clarity?: number;
  is_lucid: boolean;
  is_public: boolean;
  is_anonymous: boolean;
}

export interface DreamTagResponse {
  tag: string;
}

export interface InterpretationResponse {
  psychology: string;
  symbolism: string;
  cultural: string;
  summary: string;
  advice: string | null;
  keywords: string[];
}

export interface DreamResponse {
  id: number;
  content: string;
  title: string | null;
  dream_date: string;
  mood: Mood | null;
  clarity: number | null;
  is_lucid: boolean;
  is_public: boolean;
  is_anonymous: boolean;
  image_url: string | null;
  image_style: string | null;
  share_card_url: string | null;
  like_count: number;
  comment_count: number;
  view_count: number;
  interpretation: InterpretationResponse | null;
  tags: DreamTagResponse[];
  created_at: string;
}

export interface DreamListResponse {
  items: DreamResponse[];
  total: number;
  page: number;
  page_size: number;
}
```

- [ ] **Step 4: Implement API client**

Create `dreamlog-frontend/src/api/client.ts`:

```ts
interface ApiClientOptions {
  baseUrl: string;
  getToken: () => string | null;
  fetchImpl?: typeof fetch;
}

type RequestBody = Record<string, unknown> | unknown[] | string | number | boolean | null;

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

export function createApiClient({ baseUrl, getToken, fetchImpl = fetch }: ApiClientOptions) {
  async function request<T>(method: string, path: string, body?: RequestBody): Promise<T> {
    const token = getToken();
    const headers: HeadersInit = {
      Accept: "application/json"
    };

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetchImpl(`${baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    });

    if (!response.ok) {
      let message = `请求失败：${response.status}`;
      try {
        const data = await response.json();
        if (typeof data.detail === "string") {
          message = data.detail;
        }
      } catch {
        message = `请求失败：${response.status}`;
      }
      throw new ApiError(message, response.status);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  return {
    get: <T>(path: string) => request<T>("GET", path),
    post: <T>(path: string, body?: RequestBody) => request<T>("POST", path, body),
    put: <T>(path: string, body?: RequestBody) => request<T>("PUT", path, body),
    delete: <T>(path: string) => request<T>("DELETE", path)
  };
}

export const api = createApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1",
  getToken: () => localStorage.getItem("dreamlog_token")
});
```

- [ ] **Step 5: Run API tests**

Run:

```powershell
cd C:\Users\KCY\Test\Dream\Dream\dreamlog-frontend
npm test -- src/api/client.test.ts
```

Expected:

```text
PASS src/api/client.test.ts
```

- [ ] **Step 6: Commit API client**

Run:

```powershell
cd C:\Users\KCY\Test\Dream\Dream
git add dreamlog-frontend/src/api
git commit -m "feat: add frontend API client"
```

---

## Task 4: Auth State And Login Page

**Files:**
- Create: `dreamlog-frontend/src/auth/AuthContext.tsx`
- Create: `dreamlog-frontend/src/auth/LoginPage.tsx`
- Create: `dreamlog-frontend/src/auth/LoginPage.test.tsx`
- Modify: `dreamlog-frontend/src/App.tsx`

- [ ] **Step 1: Write login page test**

Create `dreamlog-frontend/src/auth/LoginPage.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LoginPage } from "./LoginPage";

describe("LoginPage", () => {
  it("requests a development code and logs in", async () => {
    const user = userEvent.setup();
    const sendCode = vi.fn().mockResolvedValue({ message: "验证码已发送", debug_code: "123456" });
    const login = vi.fn().mockResolvedValue(undefined);

    render(<LoginPage sendCode={sendCode} login={login} />);

    await user.type(screen.getByLabelText("手机号"), "13800000000");
    await user.click(screen.getByRole("button", { name: "获取验证码" }));
    expect(await screen.findByText("开发验证码：123456")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "进入 DreamLog" }));
    expect(login).toHaveBeenCalledWith("13800000000", "123456");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
cd C:\Users\KCY\Test\Dream\Dream\dreamlog-frontend
npm test -- src/auth/LoginPage.test.tsx
```

Expected:

```text
FAIL src/auth/LoginPage.test.tsx
Cannot find module './LoginPage'
```

- [ ] **Step 3: Implement auth context**

Create `dreamlog-frontend/src/auth/AuthContext.tsx`:

```tsx
import { createContext, ReactNode, useContext, useMemo, useState } from "react";
import { api } from "../api/client";
import { SendSmsResponse, TokenResponse, UserResponse } from "../api/types";

interface AuthContextValue {
  user: UserResponse | null;
  token: string | null;
  sendCode: (phone: string) => Promise<SendSmsResponse>;
  login: (phone: string, code: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(() => localStorage.getItem("dreamlog_token"));
  const [user, setUser] = useState<UserResponse | null>(() => {
    const raw = localStorage.getItem("dreamlog_user");
    return raw ? JSON.parse(raw) as UserResponse : null;
  });

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    sendCode: (phone: string) => api.post<SendSmsResponse>("/auth/sms/send", { phone }),
    login: async (phone: string, code: string) => {
      const data = await api.post<TokenResponse>("/auth/login/phone", { phone, code });
      localStorage.setItem("dreamlog_token", data.access_token);
      localStorage.setItem("dreamlog_user", JSON.stringify(data.user));
      setToken(data.access_token);
      setUser(data.user);
    },
    logout: () => {
      localStorage.removeItem("dreamlog_token");
      localStorage.removeItem("dreamlog_user");
      setToken(null);
      setUser(null);
    }
  }), [token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return value;
}
```

- [ ] **Step 4: Implement login page**

Create `dreamlog-frontend/src/auth/LoginPage.tsx`:

```tsx
import { FormEvent, useState } from "react";
import { Moon, Sparkles } from "lucide-react";
import { SendSmsResponse } from "../api/types";
import { useAuth } from "./AuthContext";

interface LoginPageProps {
  sendCode?: (phone: string) => Promise<SendSmsResponse>;
  login?: (phone: string, code: string) => Promise<void>;
}

export function LoginPage(props: LoginPageProps) {
  const auth = useAuth();
  const sendCode = props.sendCode ?? auth.sendCode;
  const login = props.login ?? auth.login;

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [debugCode, setDebugCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSendCode() {
    setError("");
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError("请输入正确的手机号");
      return;
    }
    const result = await sendCode(phone);
    if (result.debug_code) {
      setDebugCode(result.debug_code);
      setCode(result.debug_code);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!code) {
      setError("请输入验证码");
      return;
    }
    setLoading(true);
    try {
      await login(phone, code);
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-hero">
        <div className="orbital-moon"><Moon size={72} /></div>
        <p className="eyebrow">DreamLog</p>
        <h1>AI 梦境日志与解析社区</h1>
        <p className="hero-copy">记录梦境 · AI 解析 · 匿名共鸣</p>
      </section>

      <form className="glass-panel login-card" onSubmit={handleSubmit}>
        <Sparkles className="panel-icon" size={28} />
        <h2>进入你的梦境日志</h2>
        <label>
          手机号
          <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="13800000000" />
        </label>
        <label>
          验证码
          <div className="inline-field">
            <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="6 位验证码" />
            <button type="button" className="ghost-button" onClick={handleSendCode}>获取验证码</button>
          </div>
        </label>
        {debugCode && <p className="debug-code">开发验证码：{debugCode}</p>}
        {error && <p className="error-text">{error}</p>}
        <button className="primary-button" type="submit" disabled={loading}>
          {loading ? "进入中..." : "进入 DreamLog"}
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 5: Wire auth provider and routes**

Modify `dreamlog-frontend/src/App.tsx`:

```tsx
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { LoginPage } from "./auth/LoginPage";

function HomePlaceholder() {
  const { logout, user } = useAuth();
  return (
    <main className="app-shell">
      <section className="hero-title">
        <p className="eyebrow">DreamLog</p>
        <h1>记录今晚的梦</h1>
        <p>欢迎，{user?.nickname ?? "梦旅人"}</p>
        <button className="ghost-button" onClick={logout}>退出登录</button>
      </section>
    </main>
  );
}

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

function LoginRoute() {
  const { token } = useAuth();
  return token ? <Navigate to="/" replace /> : <LoginPage />;
}

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/" element={<ProtectedRoute><HomePlaceholder /></ProtectedRoute>} />
      </Routes>
    </AuthProvider>
  );
}
```

- [ ] **Step 6: Run login test and build**

Run:

```powershell
cd C:\Users\KCY\Test\Dream\Dream\dreamlog-frontend
npm test -- src/auth/LoginPage.test.tsx
npm run build
```

Expected:

```text
PASS src/auth/LoginPage.test.tsx
✓ built in ...
```

- [ ] **Step 7: Commit auth flow**

Run:

```powershell
cd C:\Users\KCY\Test\Dream\Dream
git add dreamlog-frontend/src
git commit -m "feat: add phone login flow"
```

---

## Task 5: Dream Visual Shell

**Files:**
- Create: `dreamlog-frontend/src/components/GlassPanel.tsx`
- Create: `dreamlog-frontend/src/components/StatusMessage.tsx`
- Modify: `dreamlog-frontend/src/styles.css`

- [ ] **Step 1: Create reusable components**

Create `dreamlog-frontend/src/components/GlassPanel.tsx`:

```tsx
import { ReactNode } from "react";

interface GlassPanelProps {
  title?: string;
  className?: string;
  children: ReactNode;
}

export function GlassPanel({ title, className = "", children }: GlassPanelProps) {
  return (
    <section className={`glass-panel ${className}`.trim()}>
      {title && <h2>{title}</h2>}
      {children}
    </section>
  );
}
```

Create `dreamlog-frontend/src/components/StatusMessage.tsx`:

```tsx
interface StatusMessageProps {
  title: string;
  message?: string;
}

export function StatusMessage({ title, message }: StatusMessageProps) {
  return (
    <div className="status-message">
      <strong>{title}</strong>
      {message && <p>{message}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Replace global CSS with Dream.png-inspired visual system**

Modify `dreamlog-frontend/src/styles.css`:

```css
:root {
  color: #f7f2ff;
  background: #08091c;
  font-family: "Microsoft YaHei", "PingFang SC", system-ui, sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
}

button,
input,
select,
textarea {
  font: inherit;
}

button {
  cursor: pointer;
}

.app-shell,
.login-page {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  padding: 36px;
  background:
    radial-gradient(circle at 50% 34%, rgba(139, 105, 255, 0.45), transparent 30%),
    radial-gradient(circle at 18% 22%, rgba(78, 138, 255, 0.24), transparent 26%),
    radial-gradient(circle at 84% 28%, rgba(210, 119, 255, 0.22), transparent 26%),
    linear-gradient(180deg, #050717 0%, #12143b 52%, #08091d 100%);
}

.app-shell::before,
.login-page::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(circle, rgba(255, 255, 255, 0.75) 0 1px, transparent 1.5px),
    radial-gradient(circle, rgba(187, 163, 255, 0.62) 0 1px, transparent 1.4px);
  background-size: 92px 92px, 138px 138px;
  background-position: 0 0, 32px 44px;
  opacity: 0.32;
  pointer-events: none;
}

.login-page {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 420px;
  gap: 36px;
  align-items: center;
}

.login-hero,
.login-card,
.hero-title,
.workspace-grid {
  position: relative;
  z-index: 1;
}

.login-hero {
  text-align: center;
}

.orbital-moon {
  width: 220px;
  height: 220px;
  margin: 0 auto 28px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #f4efff;
  background:
    radial-gradient(circle at 50% 42%, rgba(255, 255, 255, 0.98), rgba(186, 166, 255, 0.38) 18%, transparent 42%),
    radial-gradient(circle, rgba(84, 58, 177, 0.72), transparent 70%);
  box-shadow: 0 0 80px rgba(151, 116, 255, 0.68), 0 0 170px rgba(65, 118, 255, 0.32);
}

.eyebrow {
  margin: 0 0 12px;
  color: #c7adff;
  font-weight: 700;
}

.login-hero h1,
.hero-title h1 {
  margin: 0;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(44px, 7vw, 92px);
  line-height: 1.05;
  letter-spacing: 0;
  text-shadow: 0 0 32px rgba(175, 143, 255, 0.75);
}

.hero-copy,
.hero-title p,
.glass-panel p,
.status-message p {
  color: #dcd4ff;
}

.glass-panel {
  border: 1px solid rgba(222, 208, 255, 0.28);
  border-radius: 24px;
  background: linear-gradient(145deg, rgba(25, 31, 75, 0.72), rgba(83, 57, 146, 0.34));
  box-shadow: 0 24px 80px rgba(19, 12, 66, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(18px);
}

.login-card {
  padding: 28px;
}

.panel-icon {
  color: #c6a7ff;
}

label {
  display: block;
  margin-top: 16px;
  color: #eee9ff;
}

input,
select,
textarea {
  width: 100%;
  margin-top: 8px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 15px;
  background: rgba(6, 9, 31, 0.52);
  color: #ffffff;
  outline: none;
  padding: 13px 14px;
}

textarea {
  min-height: 150px;
  resize: vertical;
}

.inline-field {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: end;
}

.primary-button,
.ghost-button {
  border: 0;
  border-radius: 999px;
  padding: 12px 18px;
  color: #ffffff;
}

.primary-button {
  width: 100%;
  margin-top: 18px;
  background: linear-gradient(90deg, #745bff, #b278ff);
  box-shadow: 0 12px 28px rgba(123, 88, 255, 0.42);
}

.ghost-button {
  background: rgba(255, 255, 255, 0.11);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.debug-code {
  color: #9ce7ff;
}

.error-text {
  color: #ffb9c7;
}

.status-message {
  padding: 18px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

@media (max-width: 900px) {
  .app-shell,
  .login-page {
    padding: 20px;
  }

  .login-page {
    grid-template-columns: 1fr;
  }

  .orbital-moon {
    width: 160px;
    height: 160px;
  }

  .inline-field {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 3: Run build**

Run:

```powershell
cd C:\Users\KCY\Test\Dream\Dream\dreamlog-frontend
npm run build
```

Expected:

```text
✓ built in ...
```

- [ ] **Step 4: Commit visual shell**

Run:

```powershell
cd C:\Users\KCY\Test\Dream\Dream
git add dreamlog-frontend/src
git commit -m "feat: add dream visual shell"
```

---

## Task 6: Dream Workspace, Form, And List

**Files:**
- Create: `dreamlog-frontend/src/dreams/dreamOptions.ts`
- Create: `dreamlog-frontend/src/dreams/DreamForm.tsx`
- Create: `dreamlog-frontend/src/dreams/DreamList.tsx`
- Create: `dreamlog-frontend/src/dreams/DreamWorkspace.tsx`
- Create: `dreamlog-frontend/src/dreams/DreamForm.test.tsx`
- Modify: `dreamlog-frontend/src/App.tsx`
- Modify: `dreamlog-frontend/src/styles.css`

- [ ] **Step 1: Write dream form test**

Create `dreamlog-frontend/src/dreams/DreamForm.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DreamForm } from "./DreamForm";

describe("DreamForm", () => {
  it("submits a valid dream payload", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn().mockResolvedValue(undefined);

    render(<DreamForm onCreate={onCreate} />);

    await user.type(screen.getByLabelText("梦境内容"), "我梦见自己在星空下穿过一扇发光的门。");
    await user.selectOptions(screen.getByLabelText("醒来情绪"), "calm");
    await user.click(screen.getByRole("button", { name: "保存梦境" }));

    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({
      content: "我梦见自己在星空下穿过一扇发光的门。",
      mood: "calm",
      is_lucid: false,
      is_public: false,
      is_anonymous: true
    }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
cd C:\Users\KCY\Test\Dream\Dream\dreamlog-frontend
npm test -- src/dreams/DreamForm.test.tsx
```

Expected:

```text
FAIL src/dreams/DreamForm.test.tsx
Cannot find module './DreamForm'
```

- [ ] **Step 3: Add dream options**

Create `dreamlog-frontend/src/dreams/dreamOptions.ts`:

```ts
import { Mood } from "../api/types";

export const moodOptions: { value: Mood; label: string }[] = [
  { value: "calm", label: "平静" },
  { value: "happy", label: "开心" },
  { value: "anxious", label: "焦虑" },
  { value: "scared", label: "害怕" },
  { value: "confused", label: "迷茫" },
  { value: "sad", label: "难过" }
];
```

- [ ] **Step 4: Implement dream form**

Create `dreamlog-frontend/src/dreams/DreamForm.tsx`:

```tsx
import { FormEvent, useState } from "react";
import { DreamCreateRequest, Mood } from "../api/types";
import { moodOptions } from "./dreamOptions";

interface DreamFormProps {
  onCreate: (payload: DreamCreateRequest) => Promise<void>;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function DreamForm({ onCreate }: DreamFormProps) {
  const [content, setContent] = useState("");
  const [dreamDate, setDreamDate] = useState(today());
  const [mood, setMood] = useState<Mood>("calm");
  const [clarity, setClarity] = useState(3);
  const [isLucid, setIsLucid] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (content.trim().length < 10) {
      setError("梦境内容至少需要 10 个字");
      return;
    }
    setSaving(true);
    try {
      await onCreate({
        content: content.trim(),
        dream_date: dreamDate,
        mood,
        clarity,
        is_lucid: isLucid,
        is_public: isPublic,
        is_anonymous: isAnonymous
      });
      setContent("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="dream-form" onSubmit={handleSubmit}>
      <label>
        梦境内容
        <textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="写下梦里的场景、人物、情绪..." />
      </label>

      <div className="form-grid">
        <label>
          做梦日期
          <input type="date" value={dreamDate} onChange={(event) => setDreamDate(event.target.value)} />
        </label>
        <label>
          醒来情绪
          <select value={mood} onChange={(event) => setMood(event.target.value as Mood)}>
            {moodOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label>
          清晰度：{clarity}
          <input type="range" min="1" max="5" value={clarity} onChange={(event) => setClarity(Number(event.target.value))} />
        </label>
      </div>

      <div className="toggle-row">
        <label><input type="checkbox" checked={isLucid} onChange={(event) => setIsLucid(event.target.checked)} /> 清醒梦</label>
        <label><input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} /> 公开到社区</label>
        <label><input type="checkbox" checked={isAnonymous} onChange={(event) => setIsAnonymous(event.target.checked)} /> 匿名展示</label>
      </div>

      {error && <p className="error-text">{error}</p>}
      <button className="primary-button" type="submit" disabled={saving}>{saving ? "保存中..." : "保存梦境"}</button>
    </form>
  );
}
```

- [ ] **Step 5: Implement dream list**

Create `dreamlog-frontend/src/dreams/DreamList.tsx`:

```tsx
import { Link } from "react-router-dom";
import { DreamResponse } from "../api/types";
import { StatusMessage } from "../components/StatusMessage";
import { moodOptions } from "./dreamOptions";

interface DreamListProps {
  dreams: DreamResponse[];
  loading: boolean;
}

function moodLabel(value: string | null) {
  return moodOptions.find((option) => option.value === value)?.label ?? "未标记";
}

export function DreamList({ dreams, loading }: DreamListProps) {
  if (loading) {
    return <StatusMessage title="正在召回梦境..." message="云端梦境日志同步中。" />;
  }

  if (dreams.length === 0) {
    return <StatusMessage title="还没有梦境" message="写下第一个梦，DreamLog 会帮你保存它。" />;
  }

  return (
    <div className="dream-list">
      {dreams.map((dream) => (
        <Link className="dream-card" key={dream.id} to={`/dreams/${dream.id}`}>
          <span>{dream.dream_date}</span>
          <strong>{dream.title ?? dream.content.slice(0, 18)}</strong>
          <p>{dream.content.slice(0, 70)}{dream.content.length > 70 ? "..." : ""}</p>
          <div className="dream-meta">
            <span>{moodLabel(dream.mood)}</span>
            <span>{dream.is_public ? "公开" : "私密"}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Implement dream workspace**

Create `dreamlog-frontend/src/dreams/DreamWorkspace.tsx`:

```tsx
import { useEffect, useState } from "react";
import { Brain, CloudMoon, LogOut, Sparkles } from "lucide-react";
import { api } from "../api/client";
import { DreamCreateRequest, DreamListResponse, DreamResponse } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { GlassPanel } from "../components/GlassPanel";
import { DreamForm } from "./DreamForm";
import { DreamList } from "./DreamList";

export function DreamWorkspace() {
  const { logout, user } = useAuth();
  const [dreams, setDreams] = useState<DreamResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDreams() {
    setLoading(true);
    setError("");
    try {
      const data = await api.get<DreamListResponse>("/dreams");
      setDreams(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "梦境列表加载失败");
    } finally {
      setLoading(false);
    }
  }

  async function createDream(payload: DreamCreateRequest) {
    await api.post<DreamResponse>("/dreams", payload);
    await loadDreams();
  }

  useEffect(() => {
    void loadDreams();
  }, []);

  return (
    <main className="app-shell">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">DreamLog</p>
          <h1>AI 梦境日志与解析社区</h1>
          <p>欢迎回来，{user?.nickname ?? "梦旅人"}。每一个梦，都是心灵深处的回响。</p>
        </div>
        <button className="ghost-button" onClick={logout}><LogOut size={16} /> 退出</button>
      </header>

      <section className="workspace-grid">
        <aside className="left-stack">
          <GlassPanel title="AI 梦境解析">
            <Brain className="panel-icon" />
            <p>心理学、象征意义、文化视角将在下一阶段接入。</p>
          </GlassPanel>
          <GlassPanel title="关键词提取">
            <Sparkles className="panel-icon" />
            <div className="chip-row"><span>森林</span><span>门</span><span>月光</span><span>水</span></div>
          </GlassPanel>
        </aside>

        <GlassPanel className="journal-panel" title="记录今晚的梦">
          <DreamForm onCreate={createDream} />
        </GlassPanel>

        <aside className="right-stack">
          <GlassPanel title="我的梦境">
            {error && <p className="error-text">{error}</p>}
            <DreamList dreams={dreams} loading={loading} />
          </GlassPanel>
          <GlassPanel title="云端同步">
            <CloudMoon className="panel-icon" />
            <p>当前梦境会保存到你的账号下，后续可同步到小程序端。</p>
          </GlassPanel>
        </aside>
      </section>
    </main>
  );
}
```

- [ ] **Step 7: Wire workspace route**

Modify `dreamlog-frontend/src/App.tsx`:

```tsx
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { LoginPage } from "./auth/LoginPage";
import { DreamWorkspace } from "./dreams/DreamWorkspace";

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

function LoginRoute() {
  const { token } = useAuth();
  return token ? <Navigate to="/" replace /> : <LoginPage />;
}

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/" element={<ProtectedRoute><DreamWorkspace /></ProtectedRoute>} />
      </Routes>
    </AuthProvider>
  );
}
```

- [ ] **Step 8: Add workspace CSS**

Append to `dreamlog-frontend/src/styles.css`:

```css
.workspace-header {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: flex-start;
  max-width: 1320px;
  margin: 0 auto 28px;
}

.workspace-header h1 {
  margin: 0;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(36px, 5vw, 72px);
  line-height: 1.05;
  text-shadow: 0 0 30px rgba(175, 143, 255, 0.72);
}

.workspace-header .ghost-button {
  display: inline-flex;
  gap: 8px;
  align-items: center;
}

.workspace-grid {
  max-width: 1320px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr) 340px;
  gap: 22px;
  align-items: start;
}

.left-stack,
.right-stack {
  display: grid;
  gap: 18px;
}

.journal-panel,
.left-stack .glass-panel,
.right-stack .glass-panel {
  padding: 20px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.toggle-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 14px;
}

.toggle-row label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0;
}

.toggle-row input {
  width: auto;
  margin: 0;
}

.dream-list {
  display: grid;
  gap: 12px;
}

.dream-card {
  display: block;
  text-decoration: none;
  color: #ffffff;
  padding: 14px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.dream-card span {
  color: #cfc4ff;
  font-size: 13px;
}

.dream-card strong {
  display: block;
  margin-top: 6px;
}

.dream-card p {
  margin: 8px 0 0;
}

.dream-meta,
.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.dream-meta span,
.chip-row span {
  border-radius: 999px;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.1);
  color: #eee9ff;
  font-size: 12px;
}

@media (max-width: 1120px) {
  .workspace-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .workspace-header {
    display: grid;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 9: Run tests and build**

Run:

```powershell
cd C:\Users\KCY\Test\Dream\Dream\dreamlog-frontend
npm test -- src/dreams/DreamForm.test.tsx
npm run build
```

Expected:

```text
PASS src/dreams/DreamForm.test.tsx
✓ built in ...
```

- [ ] **Step 10: Commit dream workspace**

Run:

```powershell
cd C:\Users\KCY\Test\Dream\Dream
git add dreamlog-frontend/src
git commit -m "feat: add dream journal workspace"
```

---

## Task 7: Dream Detail Page

**Files:**
- Create: `dreamlog-frontend/src/dreams/DreamDetailPage.tsx`
- Modify: `dreamlog-frontend/src/App.tsx`
- Modify: `dreamlog-frontend/src/styles.css`

- [ ] **Step 1: Implement detail page**

Create `dreamlog-frontend/src/dreams/DreamDetailPage.tsx`:

```tsx
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Brain, Image, Sparkles } from "lucide-react";
import { api } from "../api/client";
import { DreamResponse } from "../api/types";
import { GlassPanel } from "../components/GlassPanel";
import { StatusMessage } from "../components/StatusMessage";
import { moodOptions } from "./dreamOptions";

function moodLabel(value: string | null) {
  return moodOptions.find((option) => option.value === value)?.label ?? "未标记";
}

export function DreamDetailPage() {
  const { id } = useParams();
  const [dream, setDream] = useState<DreamResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDream() {
      setLoading(true);
      setError("");
      try {
        const data = await api.get<DreamResponse>(`/dreams/${id}`);
        setDream(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "梦境加载失败");
      } finally {
        setLoading(false);
      }
    }

    void loadDream();
  }, [id]);

  return (
    <main className="app-shell">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">DreamLog</p>
          <h1>{dream?.title ?? "梦境详情"}</h1>
          <p>完整记录、情绪、清晰度和后续 AI 解析入口。</p>
        </div>
        <Link className="ghost-button" to="/">返回记录台</Link>
      </header>

      <section className="detail-grid">
        {loading && <GlassPanel><StatusMessage title="正在打开梦境..." /></GlassPanel>}
        {error && <GlassPanel><StatusMessage title="梦境加载失败" message={error} /></GlassPanel>}
        {dream && (
          <>
            <GlassPanel className="detail-main" title="梦境原文">
              <p className="dream-content">{dream.content}</p>
              <div className="detail-meta">
                <span>日期：{dream.dream_date}</span>
                <span>情绪：{moodLabel(dream.mood)}</span>
                <span>清晰度：{dream.clarity ?? "未标记"}</span>
                <span>{dream.is_lucid ? "清醒梦" : "普通梦境"}</span>
                <span>{dream.is_public ? "公开" : "私密"}</span>
              </div>
            </GlassPanel>

            <div className="detail-side">
              <GlassPanel title="AI 梦境解析">
                <Brain className="panel-icon" />
                <p>下一阶段将展示心理学、象征意义、文化视角、总结和建议。</p>
              </GlassPanel>
              <GlassPanel title="AI 绘梦">
                <Image className="panel-icon" />
                <p>后续会根据梦境描述生成一张梦境画面。</p>
              </GlassPanel>
              <GlassPanel title="关键词">
                <Sparkles className="panel-icon" />
                <div className="chip-row">
                  {dream.tags.length > 0 ? dream.tags.map((tag) => <span key={tag.tag}>{tag.tag}</span>) : <span>等待 AI 提取</span>}
                </div>
              </GlassPanel>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Wire detail route**

Modify `dreamlog-frontend/src/App.tsx`:

```tsx
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { LoginPage } from "./auth/LoginPage";
import { DreamDetailPage } from "./dreams/DreamDetailPage";
import { DreamWorkspace } from "./dreams/DreamWorkspace";

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

function LoginRoute() {
  const { token } = useAuth();
  return token ? <Navigate to="/" replace /> : <LoginPage />;
}

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/" element={<ProtectedRoute><DreamWorkspace /></ProtectedRoute>} />
        <Route path="/dreams/:id" element={<ProtectedRoute><DreamDetailPage /></ProtectedRoute>} />
      </Routes>
    </AuthProvider>
  );
}
```

- [ ] **Step 3: Add detail CSS**

Append to `dreamlog-frontend/src/styles.css`:

```css
.detail-grid {
  position: relative;
  z-index: 1;
  max-width: 1180px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 22px;
}

.detail-main,
.detail-side .glass-panel {
  padding: 22px;
}

.detail-side {
  display: grid;
  gap: 18px;
}

.dream-content {
  font-size: 18px;
  line-height: 1.8;
  white-space: pre-wrap;
}

.detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 22px;
}

.detail-meta span {
  border-radius: 999px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.1);
  color: #eee9ff;
}

a.ghost-button {
  text-decoration: none;
}

@media (max-width: 900px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 4: Run build**

Run:

```powershell
cd C:\Users\KCY\Test\Dream\Dream\dreamlog-frontend
npm run build
```

Expected:

```text
✓ built in ...
```

- [ ] **Step 5: Commit detail page**

Run:

```powershell
cd C:\Users\KCY\Test\Dream\Dream
git add dreamlog-frontend/src
git commit -m "feat: add dream detail page"
```

---

## Task 8: End-To-End Browser Verification

**Files:**
- Modify if needed: frontend files touched in previous tasks.
- Modify if needed: backend files touched in previous tasks.

- [ ] **Step 1: Start backend**

Run:

```powershell
cd C:\Users\KCY\Test\Dream\Dream\dreamlog-backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Expected:

```text
Uvicorn running on http://0.0.0.0:8000
```

- [ ] **Step 2: Start frontend**

Run:

```powershell
cd C:\Users\KCY\Test\Dream\Dream\dreamlog-frontend
npm run dev
```

Expected:

```text
Local: http://localhost:5173/
```

- [ ] **Step 3: Browser test desktop flow**

Open `http://localhost:5173` in the in-app browser.

Verify:

- Login page appears with dark dream visual style.
- Enter phone `13800000000`.
- Click `获取验证码`.
- Development code appears.
- Click `进入 DreamLog`.
- Workspace appears.
- Enter dream content: `我梦见自己在星空下穿过一扇发光的门，门后是一片安静的海。`
- Save dream.
- The dream appears in the right-side list.
- Click the dream card.
- Detail page shows the full dream content.

- [ ] **Step 4: Browser test responsive flow**

Use browser viewport around `390x844`.

Verify:

- Login page stacks cleanly.
- Workspace panels stack vertically.
- Text does not overlap inside buttons, cards, or panels.
- Dream detail page stacks without horizontal scrolling.

- [ ] **Step 5: Run final commands**

Run:

```powershell
cd C:\Users\KCY\Test\Dream\Dream\dreamlog-frontend
npm test
npm run build
```

Expected:

```text
PASS ...
✓ built in ...
```

- [ ] **Step 6: Commit final verification fixes**

If verification required fixes:

```powershell
cd C:\Users\KCY\Test\Dream\Dream
git add dreamlog-frontend dreamlog-backend
git commit -m "fix: polish DreamLog web MVP verification"
```

If no fixes were required, do not create an empty commit.

---

## Self-Review Notes

- Spec coverage: Phase 1 Web MVP requirements are covered by Tasks 1-8.
- Full product roadmap is intentionally not implemented in this plan; later phases require separate plans.
- No placeholders are used for the Phase 1 implementation path.
- Type names match the existing FastAPI schema names and JSON field casing.
- Verification includes desktop and mobile browser checks for the `Dream.png` visual standard.
