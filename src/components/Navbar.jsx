import { useAuthStore } from "../stores/useAuthStore";

export default function Navbar() {
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);

  return (
    <header className="h-14 bg-white border-b flex items-center justify-between px-6">
      <div className="text-sm text-gray-500">KPI Harisenin • Dashboard</div>
      <div className="flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-2">
            {user.photoURL && (
              <img
                src={user.photoURL}
                alt="avatar"
                className="w-8 h-8 rounded-full"
              />
            )}
            <span className="text-sm">
              Halo, {user.fullname} ({user.role})
            </span>
          </div>
        )}
        <button
          onClick={logout}
          className="text-sm px-3 py-1 rounded-lg border hover:bg-gray-50"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
