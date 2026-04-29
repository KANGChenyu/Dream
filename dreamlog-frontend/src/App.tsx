import {
  MemoryRouter,
  Navigate,
  Route,
  Routes,
  useInRouterContext
} from "react-router-dom";
import type { ReactNode } from "react";

import { AuthProvider, useAuth } from "./auth/AuthContext";
import { LoginPage } from "./auth/LoginPage";
import { CommunityPage } from "./community/CommunityPage";
import { DreamDetailPage } from "./dreams/DreamDetailPage";
import { DreamWorkspace } from "./dreams/DreamWorkspace";

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate replace to="/login" />;
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
        <Route
          element={
            <ProtectedRoute>
              <DreamWorkspace />
            </ProtectedRoute>
          }
          path="/"
        />
        <Route
          element={
            <ProtectedRoute>
              <DreamDetailPage />
            </ProtectedRoute>
          }
          path="/dreams/:id"
        />
        <Route
          element={
            <ProtectedRoute>
              <CommunityPage />
            </ProtectedRoute>
          }
          path="/community"
        />
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
