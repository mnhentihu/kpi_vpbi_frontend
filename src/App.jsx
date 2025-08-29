import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import { Routes, Route, useLocation } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Karyawan from "./pages/Karyawan";
import Divisi from "./pages/Divisi";
import MatriksKPI from "./pages/MatriksKPI";
import Penilaian from "./pages/Penilaian";
import Laporan from "./pages/Laporan";
import Notifikasi from "./pages/Notifications";
import ProtectedRoute from "./auth/ProtectedRoute";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import Notifications from "./pages/Notifications";

export default function App() {
  const location = useLocation();
  const isAuthPage = ["/login","/register","/forgot-password"].includes(location.pathname);

  if (isAuthPage) {
    return (
      <Routes>
        <Route path="/login" element={<Login/>} />
        <Route path="/register" element={<Register/>} />
        <Route path="/forgot-password" element={<ForgotPassword/>} />
        <Route path="*" element={<Login/>} />
      </Routes>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/karyawan" element={<ProtectedRoute><Karyawan /></ProtectedRoute>} />
            <Route path="/divisi" element={<ProtectedRoute><Divisi /></ProtectedRoute>} />
            <Route path="/matriks" element={<ProtectedRoute><MatriksKPI /></ProtectedRoute>} />
            <Route path="/penilaian" element={<ProtectedRoute><Penilaian /></ProtectedRoute>} />
            <Route path="/laporan" element={<ProtectedRoute><Laporan /></ProtectedRoute>} />
            <Route path="/notifikasi" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
