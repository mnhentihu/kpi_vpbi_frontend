import { useAuth } from "../auth/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  return (
    <header className="h-14 bg-white border-b flex items-center justify-between px-6">
      <div className="text-sm text-gray-500">KPI Harisenin • Dashboard</div>
      <div className="flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-2">
            {user.photoURL && <img src={user.photoURL} alt="avatar" className="w-8 h-8 rounded-full" />}
            <span className="text-sm">Halo, {user.name}</span>
          </div>
        )}
        <button onClick={logout} className="text-sm px-3 py-1 rounded-lg border hover:bg-gray-50">
          Logout
        </button>
      </div>
    </header>
  );
}
