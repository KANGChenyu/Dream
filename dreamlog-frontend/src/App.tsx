import {
  MemoryRouter,
  Navigate,
  Route,
  Routes,
  useInRouterContext
} from "react-router-dom";

import { AuthProvider, useAuth } from "./auth/AuthContext";
import { LoginPage } from "./auth/LoginPage";
import { DreamWorkspace } from "./dreams/DreamWorkspace";

function ProtectedHome() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <DreamWorkspace /> : <Navigate replace to="/login" />;
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
