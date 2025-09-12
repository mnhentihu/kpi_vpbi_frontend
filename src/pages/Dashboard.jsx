// src/pages/Dashboard.jsx
import { useEffect, useMemo } from "react";
import Chart from "react-apexcharts";
import { useAuthStore } from "../stores/useAuthStore";
import useHistoryKpiStore from "../stores/useHistoryKpiStore";
import { useDivisiStore } from "../stores/useDivisiStore";
import { useKaryawanStore } from "../stores/useKaryawanStore";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const nav = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { rows, isLoading, error, fetchAll } = useHistoryKpiStore();
  const { rows: divisions, fetchAll: fetchDivisi } = useDivisiStore();
  const { rows: karyawans, fetchAll: fetchKaryawan } = useKaryawanStore();

  // Load data KPI sesuai role
  useEffect(() => {
    if (!user) return;

    let filters = {};
    if (user.role === "karyawan") {
      filters.user_id = user.user_id;
    } else if (user.role === "admin") {
      filters.divisi_id = user.divisi_id;
    } else if (user.role === "superadmin") {
      fetchDivisi();
      fetchKaryawan();
    }

    fetchAll(filters);
  }, [user, fetchAll, fetchDivisi, fetchKaryawan]);

  // === Utility rata-rata ===
  const avg = (arr) => {
    if (!arr.length) return 0;
    return (
      arr.reduce((a, b) => a + (Number(b.nilai_akhir) || 0), 0) / arr.length
    ).toFixed(2);
  };

  // === Summary sesuai role ===
  const summary = useMemo(() => {
    if (!rows || !rows.length) return {};

    if (user?.role === "karyawan") {
      return {
        avg: avg(rows),
        last: rows[rows.length - 1],
        recent: rows.slice(-5).reverse(),
      };
    }

    if (user?.role === "admin") {
      const skor = rows.map((r) => Number(r.nilai_akhir) || 0);
      const aboveTarget = skor.filter((s) => s >= 70).length;
      return {
        avg: avg(rows),
        total: rows.length,
        abovePct: ((aboveTarget / (skor.length || 1)) * 100).toFixed(1),
      };
    }

    if (user?.role === "superadmin") {
      const group = {};
      rows.forEach((r) => {
        if (!r.divisi_id) return;
        if (!group[r.divisi_id]) {
          group[r.divisi_id] = { total: 0, count: 0, nama: r.nama_divisi };
        }
        group[r.divisi_id].total += Number(r.nilai_akhir) || 0;
        group[r.divisi_id].count++;
      });

      return {
        avg: avg(rows),
        divisiAvg: Object.values(group).map((g) => ({
          nama: g.nama,
          avg: (g.total / g.count).toFixed(2),
        })),
        totalKaryawan: karyawans?.length || 0, // FIX pakai store karyawan
        totalDivisi: divisions?.length || 0,
        totalPenilaian: rows.length,
      };
    }

    return {};
  }, [rows, user, divisions, karyawans]);

  // === Chart Data ===
  const lineData = useMemo(() => {
    const monthly = {};
    rows.forEach((r) => {
      const month = r.periode?.slice(0, 7);
      if (!month) return;
      if (!monthly[month]) monthly[month] = { total: 0, count: 0 };
      monthly[month].total += Number(r.nilai_akhir) || 0;
      monthly[month].count++;
    });
    return Object.entries(monthly).map(([m, { total, count }]) => ({
      x: m,
      y: (total / count).toFixed(2),
    }));
  }, [rows]);

  const barData = useMemo(() => {
    if (user?.role !== "superadmin" || !summary.divisiAvg) return [];
    return summary.divisiAvg.map((d) => ({ x: d.nama, y: d.avg }));
  }, [summary, user]);

  // === Top / Bottom ===
  const topBottom = useMemo(() => {
    if (!rows.length) return { top: [], bottom: [] };
    const sorted = [...rows].sort(
      (a, b) => (Number(b.nilai_akhir) || 0) - (Number(a.nilai_akhir) || 0)
    );
    return {
      top: sorted.slice(0, 5),
      bottom: sorted.slice(-5),
    };
  }, [rows]);

  // === UI ===
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard KPI</h1>
        {user?.role === "superadmin" && (
          <button
            onClick={() => nav("/laporan")}
            className="px-3 py-2 rounded border hover:bg-gray-50 text-sm"
          >
            Lihat Laporan Lengkap
          </button>
        )}
      </div>

      {isLoading && <p className="text-gray-500">Loading data...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!isLoading && !error && rows.length === 0 && (
        <p className="text-gray-500">Belum ada data KPI.</p>
      )}

      {/* Karyawan */}
      {user?.role === "karyawan" && rows.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white shadow rounded p-4">
              <p className="text-sm text-gray-500">Rata-rata Saya</p>
              <p className="text-xl font-bold">{summary.avg}</p>
            </div>
            <div className="bg-white shadow rounded p-4">
              <p className="text-sm text-gray-500">Skor Terakhir</p>
              <p className="text-xl font-bold">
                {summary.last?.nilai_akhir || "-"}
              </p>
            </div>
          </div>

          <div className="bg-white shadow rounded p-4">
            <h3 className="font-semibold mb-2">Tren KPI Pribadi</h3>
            <Chart
              type="line"
              height={300}
              series={[{ name: "Rata-rata", data: lineData }]}
              options={{
                chart: { id: "karyawan-line" },
                xaxis: { type: "category" },
              }}
            />
          </div>
        </>
      )}

      {/* Admin */}
      {user?.role === "admin" && rows.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white shadow rounded p-4">
              <p className="text-sm text-gray-500">Rata-rata Divisi</p>
              <p className="text-xl font-bold">{summary.avg}</p>
            </div>
            <div className="bg-white shadow rounded p-4">
              <p className="text-sm text-gray-500">Jumlah Penilaian</p>
              <p className="text-xl font-bold">{summary.total}</p>
            </div>
            <div className="bg-white shadow rounded p-4">
              <p className="text-sm text-gray-500">% Di Atas Target</p>
              <p className="text-xl font-bold">{summary.abovePct}%</p>
            </div>
          </div>

          <div className="bg-white shadow rounded p-4">
            <h3 className="font-semibold mb-2">Tren Rata-rata Divisi</h3>
            <Chart
              type="line"
              height={300}
              series={[{ name: "Rata-rata", data: lineData }]}
              options={{
                chart: { id: "admin-line" },
                xaxis: { type: "category" },
              }}
            />
          </div>
        </>
      )}

      {/* Superadmin */}
      {user?.role === "superadmin" && rows.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white shadow rounded p-4">
              <p className="text-sm text-gray-500">Rata-rata Global</p>
              <p className="text-xl font-bold">{summary.avg}</p>
            </div>
            <div className="bg-white shadow rounded p-4">
              <p className="text-sm text-gray-500">Total Divisi</p>
              <p className="text-xl font-bold">{summary.totalDivisi}</p>
            </div>
            <div className="bg-white shadow rounded p-4">
              <p className="text-sm text-gray-500">Total Karyawan</p>
              <p className="text-xl font-bold">{summary.totalKaryawan}</p>
            </div>
          </div>

          <div className="bg-white shadow rounded p-4">
            <h3 className="font-semibold mb-2">Tren Global</h3>
            <Chart
              type="line"
              height={300}
              series={[{ name: "Rata-rata Global", data: lineData }]}
              options={{
                chart: { id: "super-line" },
                xaxis: { type: "category" },
              }}
            />
          </div>

          <div className="bg-white shadow rounded p-4">
            <h3 className="font-semibold mb-2">Rata-rata per Divisi</h3>
            <Chart
              type="bar"
              height={300}
              series={[{ name: "Rata-rata", data: barData }]}
              options={{
                chart: { id: "divisi-bar" },
                xaxis: { type: "category" },
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
