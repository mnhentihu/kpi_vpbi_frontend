import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import KPIChart from "../components/KPIChart";
import FilterForm from "../components/FilterForm";
import {
  Users, Grid3X3, BarChart3, Star, BellRing, FileText,
  TrendingUp, TrendingDown
} from "lucide-react";

const LS_EMP = "kpi-employees";
const LS_DIV = "kpi-divisions";
const LS_MET = "kpi-metrics";
const LS_EVAL = "kpi-evaluations";
const LS_NOTIF = "kpi-notifications";

const TARGET_GOOD = 85;
const TARGET_NEED = 70;

// parse periode dari FilterForm: "2025-Q3" | "2025-03" | "2025" | ""
function getRangeFromPeriod(period) {
  if (!period) return { from: "", to: "" };

  // YYYY-Qn
  const qMatch = period.match(/^(\d{4})-Q([1-4])$/i);
  if (qMatch) {
    const y = +qMatch[1];
    const q = +qMatch[2];
    const mStart = (q - 1) * 3 + 1; // 1,4,7,10
    const mEnd = mStart + 2;        // 3,6,9,12
    const pad = (n) => String(n).padStart(2, "0");
    const lastDay = (yy, mm) => new Date(yy, mm, 0).getDate(); // mm = 1-12 next month 0
    return {
      from: `${y}-${pad(mStart)}-01`,
      to: `${y}-${pad(mEnd)}-${lastDay(y, mEnd)}`
    };
  }

  // YYYY-MM
  const mMatch = period.match(/^(\d{4})-(\d{2})$/);
  if (mMatch) {
    const y = +mMatch[1];
    const m = +mMatch[2];
    const pad = (n) => String(n).padStart(2, "0");
    const last = new Date(y, m, 0).getDate();
    return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${last}` };
  }

  // YYYY
  const yMatch = period.match(/^(\d{4})$/);
  if (yMatch) {
    const y = +yMatch[1];
    return { from: `${y}-01-01`, to: `${y}-12-31` };
  }

  return { from: "", to: "" };
}

export default function Dashboard() {
  const nav = useNavigate();

  // ===== load data dari localStorage =====
  const [employees, setEmployees] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [notifs, setNotifs] = useState([]);

  useEffect(() => {
    try {
      setEmployees(JSON.parse(localStorage.getItem(LS_EMP) || "[]"));
      setDivisions(JSON.parse(localStorage.getItem(LS_DIV) || "[]"));
      setMetrics(JSON.parse(localStorage.getItem(LS_MET) || "[]"));
      setEvaluations(JSON.parse(localStorage.getItem(LS_EVAL) || "[]"));
      setNotifs(JSON.parse(localStorage.getItem(LS_NOTIF) || "[]"));
    } catch {
      setEmployees([]); setDivisions([]); setMetrics([]); setEvaluations([]); setNotifs([]);
    }
  }, []);

  // ===== filter state dari FilterForm =====
  const [filter, setFilter] = useState({ divisi: "", periode: "" });
  function handleFilter(f) {
    setFilter(f || { divisi: "", periode: "" });
  }

  // ===== apply filter ke data penilaian =====
  const { from, to } = useMemo(() => getRangeFromPeriod(filter.periode), [filter]);
  const evalFiltered = useMemo(() => {
    return evaluations
      .filter((r) => (!filter.divisi ? true : r.divisi === filter.divisi))
      .filter((r) => (!from ? true : (r.tanggal || "") >= from))
      .filter((r) => (!to ? true : (r.tanggal || "") <= to));
  }, [evaluations, filter, from, to]);

  // ===== angka ringkas =====
  const avg = useMemo(() => {
    if (!evalFiltered.length) return 0;
    const sum = evalFiltered.reduce((a, r) => a + (Number(r.skor) || 0), 0);
    return Math.round(sum / evalFiltered.length);
  }, [evalFiltered]);

  const pctAbove = useMemo(() => {
    if (!evalFiltered.length) return 0;
    const n = evalFiltered.filter((r) => (Number(r.skor) || 0) >= TARGET_GOOD).length;
    return Math.round((n / evalFiltered.length) * 100);
  }, [evalFiltered]);

  const pctNeed = useMemo(() => {
    if (!evalFiltered.length) return 0;
    const n = evalFiltered.filter((r) => (Number(r.skor) || 0) < TARGET_NEED).length;
    return Math.round((n / evalFiltered.length) * 100);
  }, [evalFiltered]);

  // ===== data untuk KPIChart (tren rata-rata per bulan) =====
  const chartData = useMemo(() => {
    // map {YYYY-MM: {sum, count}}
    const m = new Map();
    for (const r of evalFiltered) {
      const ym = (r.tanggal || "").slice(0, 7);
      if (!ym) continue;
      const cur = m.get(ym) || { sum: 0, count: 0 };
      cur.sum += Number(r.skor) || 0;
      cur.count += 1;
      m.set(ym, cur);
    }
    return Array.from(m.entries())
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([ym, v]) => ({ month: ym, avg: +(v.sum / v.count).toFixed(2) }));
  }, [evalFiltered]);

  // ===== top & bottom performers (ambil terbaru) =====
  const top5 = useMemo(() => {
    return [...evalFiltered]
      .sort((a, b) => (b.skor !== a.skor ? b.skor - a.skor : (b.tanggal || "").localeCompare(a.tanggal || "")))
      .slice(0, 5);
  }, [evalFiltered]);

  const bottom5 = useMemo(() => {
    return [...evalFiltered]
      .sort((a, b) => (a.skor !== b.skor ? a.skor - b.skor : (b.tanggal || "").localeCompare(a.tanggal || "")))
      .slice(0, 5);
  }, [evalFiltered]);

  const unread = notifs.filter((n) => !n.read).length;

  // ===== helpers =====
  const StatCard = ({ label, value, suffix, icon: Icon }) => (
    <div className="card">
      <div className="card-body">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">{label}</div>
            <div className="text-3xl font-bold">{value}{suffix || ""}</div>
          </div>
          {Icon && <Icon className="text-gray-400" size={24} />}
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard KPI</h1>
          <p className="text-sm text-gray-500">Analisis kinerja karyawan dari waktu ke waktu.</p>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <button onClick={() => nav("/penilaian")} className="px-3 py-2 rounded-lg border hover:bg-gray-50 text-sm">
            Tambah Penilaian
          </button>
          <button onClick={() => nav("/laporan")} className="px-3 py-2 rounded-lg border hover:bg-gray-50 text-sm">
            Buka Laporan
          </button>
        </div>
      </div>

      {/* Filter */}
      <FilterForm onFilter={handleFilter} />

      {/* KPI summary cards (dinamis) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <StatCard label="Rata-rata KPI" value={avg} icon={TrendingUp} />
        <StatCard label="Karyawan di Atas Target" value={pctAbove} suffix="%" icon={Star} />
        <StatCard label="Perlu Perbaikan" value={pctNeed} suffix="%" icon={TrendingDown} />
      </div>

      {/* Chart */}
      <div className="card">
        <div className="px-5 py-4 border-b">
          <div className="font-semibold">Riwayat KPI (Rata-rata per Bulan)</div>
        </div>
        <div className="p-5">
          {/* KPIChart boleh diabaikan jika belum support props; kalau sudah, pakai data= */}
          <KPIChart data={chartData} />
        </div>
      </div>

      {/* Quick stats & shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <button onClick={() => nav("/karyawan")} className="card text-left hover:shadow-md">
          <div className="card-body flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500">Karyawan</div>
              <div className="text-2xl font-bold">{employees.length}</div>
            </div>
            <Users size={22} className="text-gray-400" />
          </div>
        </button>
        <button onClick={() => nav("/divisi")} className="card text-left hover:shadow-md">
          <div className="card-body flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500">Divisi</div>
              <div className="text-2xl font-bold">{divisions.length}</div>
            </div>
            <Grid3X3 size={22} className="text-gray-400" />
          </div>
        </button>
        <button onClick={() => nav("/matriks")} className="card text-left hover:shadow-md">
          <div className="card-body flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500">Matriks KPI</div>
              <div className="text-2xl font-bold">{metrics.length}</div>
            </div>
            <BarChart3 size={22} className="text-gray-400" />
          </div>
        </button>
        <button onClick={() => nav("/penilaian")} className="card text-left hover:shadow-md">
          <div className="card-body flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500">Total Penilaian (filter)</div>
              <div className="text-2xl font-bold">{evalFiltered.length}</div>
            </div>
            <Star size={22} className="text-gray-400" />
          </div>
        </button>
        <button onClick={() => nav("/notifikasi")} className="card text-left hover:shadow-md">
          <div className="card-body flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500">Notifikasi Belum Dibaca</div>
              <div className="text-2xl font-bold">{unread}</div>
            </div>
            <BellRing size={22} className="text-gray-400" />
          </div>
        </button>
      </div>

      {/* Top / Bottom performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b">
            <div className="font-semibold">Top 5 Kinerja</div>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-white">
              <tr className="text-left text-gray-600 border-b">
                <th className="px-5 py-3">Karyawan</th>
                <th className="px-5 py-3 w-40">Divisi</th>
                <th className="px-5 py-3 w-24">Skor</th>
                <th className="px-5 py-3 w-36">Tanggal</th>
              </tr>
            </thead>
            <tbody>
              {top5.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-5 py-3">{r.nama}</td>
                  <td className="px-5 py-3">{r.divisi || "-"}</td>
                  <td className="px-5 py-3 font-semibold">{r.skor}</td>
                  <td className="px-5 py-3">{r.tanggal}</td>
                </tr>
              ))}
              {top5.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-10 text-center text-gray-500">Belum ada data.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b">
            <div className="font-semibold">Bottom 5 Kinerja</div>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-white">
              <tr className="text-left text-gray-600 border-b">
                <th className="px-5 py-3">Karyawan</th>
                <th className="px-5 py-3 w-40">Divisi</th>
                <th className="px-5 py-3 w-24">Skor</th>
                <th className="px-5 py-3 w-36">Tanggal</th>
              </tr>
            </thead>
            <tbody>
              {bottom5.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-5 py-3">{r.nama}</td>
                  <td className="px-5 py-3">{r.divisi || "-"}</td>
                  <td className="px-5 py-3 font-semibold">{r.skor}</td>
                  <td className="px-5 py-3">{r.tanggal}</td>
                </tr>
              ))}
              {bottom5.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-10 text-center text-gray-500">Belum ada data.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent notifications */}
      <div className="card">
        <div className="px-5 py-3 border-b flex items-center justify-between">
          <div className="font-semibold">Notifikasi Terbaru</div>
          <button onClick={() => nav("/notifikasi")} className="text-sm text-blue-600 hover:underline">
            Lihat semua
          </button>
        </div>
        <div className="p-5">
          {notifs.slice(0, 5).map((n) => (
            <div key={n.id} className="flex items-start gap-3 py-2 border-b last:border-0">
              <div className="w-2 h-2 rounded-full mt-2" style={{ background: n.read ? "#d1d5db" : "#2563eb" }} />
              <div className="flex-1">
                <div className={`text-sm ${n.read ? "text-gray-800" : "font-medium"}`}>{n.title || "Notification"}</div>
                <div className="text-xs text-gray-600">{n.text}</div>
              </div>
              <div className="text-xs text-gray-400">{(n.createdAt || "").slice(0, 16).replace("T"," ")}</div>
            </div>
          ))}
          {notifs.length === 0 && <div className="text-sm text-gray-500">Tidak ada notifikasi.</div>}
        </div>
      </div>

      {/* CTA laporan */}
      <div className="card">
        <div className="card-body flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">Siap ekspor rekap lengkap?</div>
            <div className="text-lg font-semibold">Buka Laporan KPI</div>
          </div>
          <button onClick={() => nav("/laporan")} className="px-4 py-2 rounded-lg border hover:bg-gray-50 flex items-center gap-2">
            <FileText size={18} /> Laporan
          </button>
        </div>
      </div>
    </div>
  );
}
