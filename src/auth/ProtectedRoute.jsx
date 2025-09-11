import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

import { Navigate } from "react-router-dom";
import { useAuthStore } from "../stores/useAuthStore";

export default function ProtectedRoute({ children, allowedRoles }) {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);

  // Jika masih proses login → tampilkan Skeleton
  if (loading) return <Skeleton count={5} />;

  // Kalau user belum ada → redirect ke login
  if (!user) return <Navigate to="/login" replace />;

  // Kalau role tidak sesuai → redirect ke dashboard
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
