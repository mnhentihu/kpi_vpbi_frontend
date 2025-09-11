import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Grid3X3,
  BarChart3,
  Star,
  FileText,
  Bell,
} from "lucide-react";

// hook kecil untuk baca jumlah notifikasi belum dibaca
function useUnreadNotif() {
  const [n, setN] = useState(0);

  useEffect(() => {
    const load = () => {
      try {
        const arr = JSON.parse(
          localStorage.getItem("kpi-notifications") || "[]"
        );
        setN(arr.filter((x) => !x.read).length);
      } catch {
        setN(0);
      }
    };
    load();

    // update saat tab lain mengubah localStorage
    const onStorage = (e) => {
      if (e.key === "kpi-notifications") load();
    };
    window.addEventListener("storage", onStorage);

    // polling ringan biar pasti sinkron (opsional)
    const id = setInterval(load, 1000);

    return () => {
      window.removeEventListener("storage", onStorage);
      clearInterval(id);
    };
  }, []);

  return n;
}

export default function Sidebar() {
  const unread = useUnreadNotif();

  const menu = [
    { name: "Dashboard", icon: LayoutDashboard, path: "/" },
    { name: "Karyawan", icon: Users, path: "/karyawan" },
    { name: "Divisi", icon: Grid3X3, path: "/divisi" },
    { name: "Matriks KPI", icon: BarChart3, path: "/konfigurasi-matriks" },
    { name: "Penilaian", icon: Star, path: "/penilaian" },
    { name: "Laporan", icon: FileText, path: "/laporan" },
  ];

  return (
    <aside className="w-64 bg-white border-r min-h-screen p-4">
      <div className="mb-6">
        <div className="text-xl font-bold">KPI Tracker</div>
        <div className="text-xs text-gray-500">Harisenin</div>
      </div>

      <nav className="space-y-1">
        {menu.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium ${
                isActive ? "bg-gray-100" : "hover:bg-gray-50"
              }`
            }
          >
            <item.icon size={18} className="shrink-0" />
            <span className="truncate">{item.name}</span>

            {/* badge unread untuk Notifikasi */}
            {typeof item.badge === "number" && item.badge > 0 && (
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-blue-600 text-white">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-8 text-xs text-gray-400">PT. CMLABS</div>
    </aside>
  );
}
