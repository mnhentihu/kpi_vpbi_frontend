import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  ResponsiveContainer,
  BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip,
  LineChart, Line,
} from "recharts";

const LS_EVAL = "kpi-evaluations";
const LS_DIV = "kpi-divisions";

const THRESHOLD_GOOD = 85;
const THRESHOLD_NEEDS_IMPROVE = 70;

const fmt = (n, d = 0) =>
  Number.isFinite(n) ? n.toLocaleString("id-ID", { maximumFractionDigits: d }) : "-";

export default function Laporan() {
  const nav = useNavigate();
  const printRef = useRef(null);

  // ===== Load data =====
  const [evaluations, setEvaluations] = useState([]);
  const [divisions, setDivisions] = useState([]);

  useEffect(() => {
    try {
      setEvaluations(JSON.parse(localStorage.getItem(LS_EVAL) || "[]"));
      setDivisions(JSON.parse(localStorage.getItem(LS_DIV) || "[]"));
    } catch {
      setEvaluations([]); setDivisions([]);
    }
  }, []);

  // ===== Filters =====
  const [fDiv, setFDiv] = useState("");
  const [fStatus, setFStatus] = useState(""); // "", "Selesai", "Proses"
  const [fQ, setFQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const divisiOptions = useMemo(
    () => Array.from(new Set(divisions.map((d) => d.nama).filter(Boolean))),
    [divisions]
  );

  const filtered = useMemo(() => {
    const s = fQ.trim().toLowerCase();
    return evaluations
      .filter((r) => (!fDiv ? true : r.divisi === fDiv))
      .filter((r) => (!fStatus ? true : r.status === fStatus))
      .filter((r) => (!from ? true : r.tanggal >= from))
      .filter((r) => (!to ? true : r.tanggal <= to))
      .filter((r) => {
        if (!s) return true;
        return (r.nama || "").toLowerCase().includes(s) ||
               (r.divisi || "").toLowerCase().includes(s);
      })
      .sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1));
  }, [evaluations, fDiv, fStatus, from, to, fQ]);

  // ===== Pagination =====
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);
  useEffect(() => setPage(1), [fDiv, fStatus, from, to, fQ, pageSize]);

  // ===== Summary =====
  const avg = useMemo(() => {
    if (!filtered.length) return 0;
    return filtered.reduce((a, r) => a + (Number(r.skor) || 0), 0) / filtered.length;
  }, [filtered]);
  const top = useMemo(() => {
    if (!filtered.length) return null;
    return filtered.reduce((acc, r) => (r.skor > (acc?.skor ?? -Infinity) ? r : acc), null);
  }, [filtered]);
  const low = useMemo(() => {
    if (!filtered.length) return null;
    return filtered.reduce((acc, r) => (r.skor < (acc?.skor ?? Infinity) ? r : acc), null);
  }, [filtered]);

  // ===== Pivot by Divisi =====
  const perDivisi = useMemo(() => {
    const map = new Map();
    for (const r of filtered) {
      const key = r.divisi || "-";
      const cur = map.get(key) || { divisi: key, count: 0, total: 0, good: 0, need: 0 };
      const s = Number(r.skor) || 0;
      cur.count += 1;
      cur.total += s;
      if (s >= THRESHOLD_GOOD) cur.good += 1;
      if (s < THRESHOLD_NEEDS_IMPROVE) cur.need += 1;
      map.set(key, cur);
    }
    return Array.from(map.values()).map((row) => ({
      ...row,
      avg: row.count ? row.total / row.count : 0,
      goodPct: row.count ? Math.round((row.good / row.count) * 100) : 0,
      needPct: row.count ? Math.round((row.need / row.count) * 100) : 0,
    }));
  }, [filtered]);

  // ===== Chart data (Recharts) =====
  // Distribusi skor (bins)
  const distData = useMemo(() => {
    const ranges = [
      { label: "0–59", min: 0, max: 59 },
      { label: "60–69", min: 60, max: 69 },
      { label: "70–79", min: 70, max: 79 },
      { label: "80–89", min: 80, max: 89 },
      { label: "90–100", min: 90, max: 100 },
    ];
    return ranges.map((r) => ({
      range: r.label,
      jumlah: filtered.filter((x) => {
        const s = Number(x.skor) || 0;
        return s >= r.min && s <= r.max;
      }).length,
    }));
  }, [filtered]);

  // Tren rata-rata per bulan
  const monthlyData = useMemo(() => {
    // map {YYYY-MM: {sum, count}}
    const m = new Map();
    for (const r of filtered) {
      const ym = (r.tanggal || "").slice(0, 7); // YYYY-MM
      if (!ym) continue;
      const cur = m.get(ym) || { sum: 0, count: 0 };
      cur.sum += Number(r.skor) || 0;
      cur.count += 1;
      m.set(ym, cur);
    }
    const rows = Array.from(m.entries())
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([ym, v]) => ({
        bulan: ym, rata2: v.count ? +(v.sum / v.count).toFixed(2) : 0,
      }));
    return rows;
  }, [filtered]);

  // ===== Export Excel =====
  function exportExcel() {
    const wb = XLSX.utils.book_new();

    const detail = filtered.map((r) => ({
      Karyawan: r.nama, Divisi: r.divisi, Skor: r.skor, Tanggal: r.tanggal, Status: r.status,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detail), "Detail");

    const ringkasan = perDivisi.map((r) => ({
      Divisi: r.divisi, Jumlah: r.count, "Rata-rata": Math.round(r.avg),
      "≥85 (org)": r.good, "<70 (org)": r.need, "≥85 (%)": r.goodPct, "<70 (%)": r.needPct,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ringkasan), "Ringkasan Divisi");

    const tren = monthlyData.map((r) => ({ Bulan: r.bulan, "Rata-rata": r.rata2 }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tren), "Tren Bulanan");

    XLSX.writeFile(wb, "laporan-kpi.xlsx");
  }

  // ===== Export PDF (multi-page) =====
  async function exportPDF() {
    const el = printRef.current;
    if (!el) return;

    // pastikan grafik sudah ukurannya final
    await new Promise((r) => setTimeout(r, 200));

    const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 8;

    const imgW = pageW - margin * 2;
    const imgH = (canvas.height * imgW) / canvas.width;

    let heightLeft = imgH;
    let position = margin;

    pdf.addImage(imgData, "PNG", margin, position, imgW, imgH);
    heightLeft -= pageH - margin * 2;

    while (heightLeft > 0) {
      pdf.addPage();
      position = margin - (imgH - heightLeft);
      pdf.addImage(imgData, "PNG", margin, position, imgW, imgH);
      heightLeft -= pageH - margin * 2;
    }

    pdf.save("laporan-kpi.pdf");
  }

  function resetFilters() {
    setFDiv(""); setFStatus(""); setFQ(""); setFrom(""); setTo("");
  }

  return (
    <div className="p-6">
      <style>{`
        @media print { .no-print { display:none!important } body{-webkit-print-color-adjust:exact;print-color-adjust:exact} }
      `}</style>

      <div className="max-w-7xl mx-auto" ref={printRef}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Laporan KPI</h1>
            <p className="text-sm text-gray-500">Ringkasan dan detail penilaian KPI</p>
          </div>
          <div className="no-print flex items-center gap-2">
            <button onClick={exportExcel} className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50">
              Export Excel
            </button>
            <button onClick={exportPDF} className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50">
              Export PDF
            </button>
            <button onClick={() => nav("/")} className="px-3 py-2 rounded-lg border bg-gray-100 hover:bg-gray-200 text-sm">
              Kembali ke Dasbor
            </button>
          </div>
        </div>

        {/* Filter */}
        <div className="no-print mt-5 card">
          <div className="card-body grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs text-gray-600">Cari Karyawan/Divisi</label>
              <input value={fQ} onChange={(e) => setFQ(e.target.value)} className="mt-1 w-full border rounded-xl px-3 py-2" placeholder="Ketik untuk mencari..." />
            </div>
            <div>
              <label className="text-xs text-gray-600">Divisi</label>
              <select value={fDiv} onChange={(e) => setFDiv(e.target.value)} className="mt-1 w-full border rounded-xl px-3 py-2">
                <option value="">Semua Divisi</option>
                {divisiOptions.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600">Dari Tanggal</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 w-full border rounded-xl px-3 py-2" />
            </div>
            <div>
              <label className="text-xs text-gray-600">Sampai Tanggal</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 w-full border rounded-xl px-3 py-2" />
            </div>
            <div>
              <label className="text-xs text-gray-600">Status</label>
              <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="mt-1 w-full border rounded-xl px-3 py-2">
                <option value="">Semua</option>
                <option value="Selesai">Selesai</option>
                <option value="Proses">Proses</option>
              </select>
            </div>
            <div className="md:col-span-6 flex items-end justify-end">
              <button onClick={resetFilters} className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50">Reset Filter</button>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card"><div className="card-body">
            <div className="text-xs text-gray-500">Total Penilaian</div>
            <div className="text-2xl font-bold mt-1">{fmt(total)}</div>
          </div></div>
          <div className="card"><div className="card-body">
            <div className="text-xs text-gray-500">Rata-rata Skor</div>
            <div className="text-2xl font-bold mt-1">{fmt(avg, 0)}</div>
          </div></div>
          <div className="card"><div className="card-body">
            <div className="text-xs text-gray-500">Skor Tertinggi</div>
            <div className="text-2xl font-bold mt-1">{top ? top.skor : "-"}</div>
            <div className="text-xs text-gray-500">{top ? top.nama : ""}</div>
          </div></div>
          <div className="card"><div className="card-body">
            <div className="text-xs text-gray-500">Skor Terendah</div>
            <div className="text-2xl font-bold mt-1">{low ? low.skor : "-"}</div>
            <div className="text-xs text-gray-500">{low ? low.nama : ""}</div>
          </div></div>
        </div>

        {/* Charts */}
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Distribusi */}
          <div className="card">
            <div className="card-body">
              <h3 className="font-semibold mb-3">Distribusi Skor</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="jumlah" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Tren Bulanan */}
          <div className="card">
            <div className="card-body">
              <h3 className="font-semibold mb-3">Tren Rata-rata Bulanan</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="bulan" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="rata2" dot />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Ringkasan per Divisi */}
        <div className="mt-5 card overflow-hidden">
          <div className="px-5 py-3 border-b">
            <h3 className="font-semibold">Ringkasan per Divisi</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-white">
              <tr className="text-left text-gray-600 border-b">
                <th className="px-5 py-3">Divisi</th>
                <th className="px-5 py-3 w-40">Jumlah</th>
                <th className="px-5 py-3 w-32">Rata-rata</th>
                <th className="px-5 py-3 w-40">≥ {THRESHOLD_GOOD} (org / %)</th>
                <th className="px-5 py-3 w-40">&lt; {THRESHOLD_NEEDS_IMPROVE} (org / %)</th>
              </tr>
            </thead>
            <tbody>
              {perDivisi.map((r) => (
                <tr key={r.divisi} className="border-b last:border-0">
                  <td className="px-5 py-3">{r.divisi}</td>
                  <td className="px-5 py-3">{fmt(r.count)}</td>
                  <td className="px-5 py-3">{fmt(r.avg, 0)}</td>
                  <td className="px-5 py-3">{r.good} / {r.goodPct}%</td>
                  <td className="px-5 py-3">{r.need} / {r.needPct}%</td>
                </tr>
              ))}
              {perDivisi.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-500">Tidak ada data.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Detail */}
        <div className="mt-6 card overflow-hidden">
          <div className="px-5 py-3 border-b flex items-center justify-between">
            <h3 className="font-semibold">Detail Penilaian</h3>
            <div className="text-xs text-gray-500">
              Menampilkan {(currentPage - 1) * pageSize + (total ? 1 : 0)}–
              {Math.min(currentPage * pageSize, total)} dari {total} baris
            </div>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-white">
              <tr className="text-left text-gray-600 border-b">
                <th className="px-5 py-3">Karyawan</th>
                <th className="px-5 py-3 w-40">Divisi</th>
                <th className="px-5 py-3 w-28">Skor</th>
                <th className="px-5 py-3 w-40">Tanggal</th>
                <th className="px-5 py-3 w-28">Status</th>
              </tr>
            </thead>
            <tbody>
              {pageData.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-5 py-3">{r.nama}</td>
                  <td className="px-5 py-3">{r.divisi || "-"}</td>
                  <td className="px-5 py-3">{r.skor}</td>
                  <td className="px-5 py-3">{r.tanggal}</td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-1 rounded-full text-xs bg-gray-100 border text-gray-700">
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
              {pageData.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-500">Tidak ada data.</td></tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="px-5 py-3 flex items-center justify-between">
            <div className="no-print">
              <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="border rounded-xl px-3 py-2">
                {[5, 10, 20, 50].map((n) => <option key={n} value={n}>{n} / halaman</option>)}
              </select>
            </div>
            <div className="no-print flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1.5 rounded-lg border disabled:opacity-50">Sebelumnya</button>
              <span className="text-sm">Hal. {currentPage}/{totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1.5 rounded-lg border disabled:opacity-50">Berikutnya</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
