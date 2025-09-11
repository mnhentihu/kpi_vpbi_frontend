// src/App.jsx
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useAuthStore } from "./stores/useAuthStore";

import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";

import Dashboard from "./pages/Dashboard";
import Karyawan from "./pages/Karyawan";
import Divisi from "./pages/Divisi";
import MatriksKPI from "./pages/MatriksKPI";
import Penilaian from "./pages/Penilaian";
import Laporan from "./pages/Laporan";

import ProtectedRoute from "./auth/ProtectedRoute";

import Login from "./pages/auth/Login";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";

export default function App() {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);

  const authPaths = ["/login", "/register", "/forgot-password"];
  const isAuthPage =
    authPaths.includes(location.pathname) ||
    location.pathname.startsWith("/reset-password");

  if (isAuthPage) {
    return (
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/" replace /> : <Login />}
        />
        <Route
          path="/forgot-password"
          element={user ? <Navigate to="/" replace /> : <ForgotPassword />}
        />
        <Route
          path="/reset-password/:token"
          element={user ? <Navigate to="/" replace /> : <ResetPassword />}
        />
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/karyawan"
              element={
                <ProtectedRoute allowedRoles={["superadmin", "admin"]}>
                  <Karyawan />
                </ProtectedRoute>
              }
            />
            <Route
              path="/divisi"
              element={
                <ProtectedRoute>
                  <Divisi />
                </ProtectedRoute>
              }
            />
            <Route
              path="/konfigurasi-matriks"
              element={
                <ProtectedRoute allowedRoles={["superadmin", "admin"]}>
                  <MatriksKPI />
                </ProtectedRoute>
              }
            />
            <Route
              path="/penilaian"
              element={
                <ProtectedRoute>
                  <Penilaian />
                </ProtectedRoute>
              }
            />
            <Route
              path="/laporan"
              element={
                <ProtectedRoute>
                  <Laporan />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Dashboard />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
