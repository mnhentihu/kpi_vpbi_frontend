// src/pages/Laporan.jsx
import { useEffect, useMemo, useState } from "react";
import Chart from "react-apexcharts";
import useHistoryKpiStore from "../stores/useHistoryKpiStore";
import { useAuthStore } from "../stores/useAuthStore";
import { useDivisiStore } from "../stores/useDivisiStore";
import Modal from "../components/Modal";

export default function Laporan() {
  const user = useAuthStore((s) => s.user);
  const {
    rows,
    isLoading,
    error,
    fetchAll,
    detail: getDetail,
    resetDetail,
  } = useHistoryKpiStore();
  const { rows: divisions, fetchAll: fetchDivisi } = useDivisiStore();

  // ====== State ======
  const [detail, setDetail] = useState(null); // modal detail
  const [fDivisi, setFDivisi] = useState(""); // filter divisi
  const [year, setYear] = useState(new Date().getFullYear());
  const [quarter, setQuarter] = useState("");

  // ====== Load divisi (superadmin only) ======
  useEffect(() => {
    if (user?.role === "superadmin") fetchDivisi();
  }, [user, fetchDivisi]);

  // ====== Quarter range ======
  const getQuarterRange = (y, q) => {
    if (!y || !q) return {};
    const map = {
      Q1: [`${y}-01-01`, `${y}-04-30`],
      Q2: [`${y}-05-01`, `${y}-08-31`],
      Q3: [`${y}-09-01`, `${y}-12-31`],
    };
    return { periode_from: map[q][0], periode_to: map[q][1] };
  };

  // ====== Fetch data ======
  useEffect(() => {
    if (!user) return;
    let filters = {};

    if (user.role === "karyawan") {
      filters.user_id = user.user_id;
    } else if (user.role === "admin") {
      filters.divisi_id = user.divisi_id;
    } else if (user.role === "superadmin" && fDivisi) {
      filters.divisi_id = fDivisi;
    }

    if (quarter) Object.assign(filters, getQuarterRange(year, quarter));
    fetchAll(filters);
  }, [user, fDivisi, year, quarter, fetchAll]);

  // ====== Modal handlers ======
  const handleOpenDetail = async (id) => {
    try {
      const data = await getDetail(id);
      if (data) setDetail(data);
    } catch (err) {
      console.error("Gagal ambil detail:", err);
    }
  };

  const handleCloseModal = () => {
    setDetail(null);
    resetDetail();
  };

  // ====== Summary ======
  const summary = useMemo(() => {
    if (!rows.length) return { avg: 0, max: 0, min: 0, divisiAvg: [] };

    const nilaiAll = rows.map((r) => Number(r.nilai_akhir) || 0);
    const avgAll = nilaiAll.reduce((a, b) => a + b, 0) / (nilaiAll.length || 1);

    const base = {
      avg: avgAll.toFixed(2),
      max: Math.max(...nilaiAll),
      min: Math.min(...nilaiAll),
      divisiAvg: [],
    };

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

      base.divisiAvg = Object.values(group).map((g) => ({
        nama: g.nama,
        avg: (g.total / g.count).toFixed(2),
      }));
    }

    return base;
  }, [rows, user]);

  // ====== Pie chart ======
  let belumTuntas = 0;
  let tuntas = 0;
  rows.forEach((r) => {
    const skor = Number(r.persen_akhir) || 0;
    if (skor < 70) belumTuntas++;
    else tuntas++;
  });
  const pieOptions = {
    labels: ["Belum Tuntas (<70)", "Tuntas (≥70)"],
    legend: { position: "bottom" },
    colors: ["#EF4444", "#10B981"],
  };
  const pieSeries = [belumTuntas, tuntas];

  // ====== Bar chart ======
  const barBuckets = { "<70%": 0, "70%-79%": 0, "80%-89%": 0, "90%-100%": 0 };
  rows.forEach((r) => {
    const skor = Number(r.persen_akhir) || 0;
    if (skor < 70) barBuckets["<70%"]++;
    else if (skor < 80) barBuckets["70%-79%"]++;
    else if (skor < 90) barBuckets["80%-89%"]++;
    else barBuckets["90%-100%"]++;
  });
  const barOptions = {
    chart: { type: "bar" },
    xaxis: { categories: Object.keys(barBuckets) },
  };
  const barSeries = [{ name: "Jumlah", data: Object.values(barBuckets) }];

  // ====== Line chart ======
  const monthly = {};
  rows.forEach((r) => {
    const month = r.periode?.slice(0, 7); // YYYY-MM
    if (!month) return;
    if (!monthly[month]) monthly[month] = { total: 0, count: 0 };
    monthly[month].total += Number(r.nilai_akhir) || 0;
    monthly[month].count++;
  });
  const lineOptions = {
    chart: { type: "line" },
    xaxis: { categories: Object.keys(monthly) },
  };
  const lineSeries = [
    {
      name: "Rata-rata",
      data: Object.values(monthly).map((m) => (m.total / m.count).toFixed(2)),
    },
  ];

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-bold">Laporan KPI</h1>

      {/* Filter */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {user?.role === "superadmin" && (
          <select
            value={fDivisi}
            onChange={(e) => setFDivisi(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="">Semua Divisi</option>
            {divisions.map((d) => (
              <option key={d.divisi_id} value={d.divisi_id}>
                {d.nama_divisi}
              </option>
            ))}
          </select>
        )}

        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="border p-2 rounded"
        >
          {[2023, 2024, 2025].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        <select
          value={quarter}
          onChange={(e) => setQuarter(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">Semua</option>
          <option value="Q1">Q1</option>
          <option value="Q2">Q2</option>
          <option value="Q3">Q3</option>
        </select>
      </div>

      {/* Status */}
      {isLoading && <p className="text-gray-500">Loading data...</p>}
      {error && <p className="text-red-500">Terjadi kesalahan: {error}</p>}
      {!isLoading && !error && rows.length === 0 && (
        <p className="text-gray-500">Belum ada data KPI.</p>
      )}

      {/* Summary */}
      {!isLoading && !error && rows.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white shadow rounded p-4">
              <p className="text-sm text-gray-500">Rata-rata Skor</p>
              <p className="text-lg font-bold">{summary.avg}</p>
            </div>
            <div className="bg-white shadow rounded p-4">
              <p className="text-sm text-gray-500">Skor Tertinggi</p>
              <p className="text-lg font-bold">{summary.max}</p>
            </div>
            <div className="bg-white shadow rounded p-4">
              <p className="text-sm text-gray-500">Skor Terendah</p>
              <p className="text-lg font-bold">{summary.min}</p>
            </div>
          </div>

          {user?.role === "superadmin" && summary.divisiAvg.length > 0 && (
            <div className="bg-white shadow rounded p-4 mt-4">
              <h3 className="font-semibold mb-2">Rata-rata per Divisi</h3>
              <ul className="list-disc pl-6 space-y-1">
                {summary.divisiAvg.map((d, i) => (
                  <li key={i}>
                    {d.nama}: <span className="font-bold">{d.avg}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {/* Charts */}
      {!isLoading && !error && rows.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Chart
            options={pieOptions}
            series={pieSeries}
            type="pie"
            height={300}
          />
          <Chart
            options={barOptions}
            series={barSeries}
            type="bar"
            height={300}
          />
          <Chart
            options={lineOptions}
            series={lineSeries}
            type="line"
            height={300}
          />
        </div>
      )}

      {/* Table */}
      {!isLoading && !error && rows.length > 0 && (
        <div className="overflow-x-auto mt-4">
          <table className="w-full border text-sm text-center">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2">No</th>
                <th className="border p-2">Nama</th>
                <th className="border p-2">Periode</th>
                <th className="border p-2">Skor</th>
                <th className="border p-2">Persentase</th>
                <th className="border p-2">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.history_id} className="hover:bg-gray-50">
                  <td className="border p-2">{idx + 1}</td>
                  <td className="border p-2">{row.fullname}</td>
                  <td className="border p-2">{row.periode?.slice(0, 7)}</td>
                  <td className="border p-2">{row.nilai_akhir}</td>
                  <td className="border p-2">{row.persen_akhir}</td>
                  <td className="border p-2">
                    <button
                      type="button"
                      onClick={() => handleOpenDetail(row.history_id)}
                      className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Detail */}
      <Modal
        open={!!detail}
        onClose={handleCloseModal}
        title="Detail Penilaian"
        size="lg"
      >
        {detail && (
          <div>
            <h3 className="font-semibold mb-2">
              {detail.fullname} -{" "}
              {divisions.find((d) => d.divisi_id === detail.divisi_id)?.name ||
                "-"}
            </h3>
            <p>
              <span className="font-semibold">Nilai Akhir:</span>{" "}
              {detail.nilai_akhir}
            </p>
            <p>
              <span className="font-semibold">Persen Akhir:</span>{" "}
              {detail.persen_akhir}%
            </p>

            <div className="mt-3">
              <h4 className="font-semibold mb-2">Detail KPI</h4>
              <table className="w-full border text-sm text-center">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-1">Indikator</th>
                    <th className="border p-1">Target</th>
                    <th className="border p-1">Satuan</th>
                    <th className="border p-1">Bobot</th>
                    <th className="border p-1">Nilai Real</th>
                    <th className="border p-1">Persen</th>
                  </tr>
                </thead>
                <tbody>
                  {detail?.details?.map((d, i) => (
                    <tr key={i}>
                      <td className="border p-1">{d.indikator}</td>
                      <td className="border p-1">{d.target}</td>
                      <td className="border p-1">{d.satuan}</td>
                      <td className="border p-1">{d.bobot}%</td>
                      <td className="border p-1">{d.nilai_real}</td>
                      <td className="border p-1">{d.persen_real}%</td>
                    </tr>
                  ))}
                  {(!detail.details || detail.details.length === 0) && (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center text-gray-500 py-4"
                      >
                        Tidak ada detail KPI
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
