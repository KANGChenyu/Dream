import {
  MemoryRouter,
  Navigate,
  Route,
  Routes,
  useInRouterContext
} from "react-router-dom";

import { AuthProvider, useAuth } from "./auth/AuthContext";
import { LoginPage } from "./auth/LoginPage";

function HomePage() {
  const { user, logout } = useAuth();

  return (
    <main className="app-shell">
      <section className="hero-title">
        <p className="eyebrow">DreamLog</p>
        <h1>AI 梦境日志与解析社区</h1>
        <p>{user?.nickname ?? "梦境旅人"}，你的梦境工作台即将抵达。</p>
        <button className="secondary-action" onClick={logout} type="button">
          退出登录
        </button>
      </section>
    </main>
  );
}

function ProtectedHome() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <HomePage /> : <Navigate replace to="/login" />;
}

function LoginRoute() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate replace to="/" /> : <LoginPage />;
}

function AppRoutes() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<LoginRoute />} path="/login" />
        <Route element={<ProtectedHome />} path="/" />
        <Route element={<Navigate replace to="/" />} path="*" />
      </Routes>
    </AuthProvider>
  );
}

export function App() {
  const inRouter = useInRouterContext();

  if (!inRouter) {
    return (
      <MemoryRouter>
        <AppRoutes />
      </MemoryRouter>
    );
  }

  return <AppRoutes />;
}
