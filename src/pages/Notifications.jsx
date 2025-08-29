import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const LS_NOTIF = "kpi-notifications";

// id aman (fallback)
const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

// util waktu relatif (Bahasa Indonesia)
function timeAgo(iso) {
  const now = Date.now();
  const t = new Date(iso).getTime();
  const s = Math.max(1, Math.floor((now - t) / 1000));
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d} hari lalu`;
  if (h > 0) return `${h} jam lalu`;
  if (m > 0) return `${m} menit lalu`;
  return `${s} detik lalu`;
}

const TYPE_META = {
  new: { label: "New KPI" },
  reminder: { label: "KPI Reminder" },
  update: { label: "KPI Update" },
  complete: { label: "KPI Complete" },
  approved: { label: "KPI Approved" },
  rejected: { label: "KPI Rejected" },
  assigned: { label: "KPI Assigned" },
  reviewed: { label: "KPI Reviewed" },
  added: { label: "KPI Added" },
  removed: { label: "KPI Removed" },
};

// ikon lonceng sederhana (SVG)
function Bell({ className = "w-4 h-4 text-gray-500" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M14.5 18.5a2.5 2.5 0 11-5 0m9-1.5H5a2 2 0 01-2-2V13a7 7 0 017-7h2a7 7 0 017 7v2a2 2 0 01-2 2z"
      />
    </svg>
  );
}

// seed contoh (mirip screenshot)
function seedData() {
  const n = (hrs) => new Date(Date.now() - hrs * 3600 * 1000).toISOString();
  return [
    { id: uid(), type: "new", title: "New KPI", text: "A new KPI has been set for you.", createdAt: n(1), read: false },
    { id: uid(), type: "reminder", title: "KPI Reminder", text: "The deadline for the “Customer Satisfaction” KPI is approaching.", createdAt: n(2), read: false },
    { id: uid(), type: "update", title: "KPI Update", text: "The “Monthly Sales” KPI has been updated.", createdAt: n(3), read: false },
    { id: uid(), type: "complete", title: "KPI Complete", text: "The “Customer Feedback” KPI is complete.", createdAt: n(4), read: true },
    { id: uid(), type: "approved", title: "KPI Approved", text: "The “Operational Efficiency” KPI has been approved.", createdAt: n(5), read: true },
    { id: uid(), type: "rejected", title: "KPI Rejected", text: "The “New Product Development” KPI has been rejected.", createdAt: n(6), read: true },
    { id: uid(), type: "assigned", title: "KPI Assigned", text: "The “Employee Training” KPI has been assigned to you.", createdAt: n(7), read: true },
    { id: uid(), type: "reviewed", title: "KPI Reviewed", text: "The “Process Improvement” KPI has been reviewed.", createdAt: n(8), read: true },
    { id: uid(), type: "added", title: "KPI Added", text: "The “Service Quality” KPI has been added to your profile.", createdAt: n(9), read: true },
    { id: uid(), type: "removed", title: "KPI Removed", text: "The “Product Innovation” KPI has been removed from your profile.", createdAt: n(10), read: true },
  ];
}

export default function Notifications() {
  const nav = useNavigate();

  // ===== Data =====
  const [rows, setRows] = useState([]);
  useEffect(() => {
    const saved = localStorage.getItem(LS_NOTIF);
    if (saved) setRows(JSON.parse(saved));
    else {
      const seeded = seedData();
      setRows(seeded);
      localStorage.setItem(LS_NOTIF, JSON.stringify(seeded));
    }
  }, []);
  useEffect(() => {
    localStorage.setItem(LS_NOTIF, JSON.stringify(rows));
  }, [rows]);

  // ===== Search, Filter, Pagination =====
  const [q, setQ] = useState("");
  const [fType, setFType] = useState(""); // "" = semua
  const [fStatus, setFStatus] = useState(""); // "", "read", "unread"
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows
      .filter((r) => (!fType ? true : r.type === fType))
      .filter((r) => (!fStatus ? true : fStatus === "read" ? !!r.read : !r.read))
      .filter((r) => !s || r.title.toLowerCase().includes(s) || r.text.toLowerCase().includes(s))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [rows, q, fType, fStatus]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);
  useEffect(() => setPage(1), [q, fType, fStatus, pageSize]);

  // ===== Actions =====
  const toggleRead = (id) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, read: !r.read } : r)));
  const remove = (id) => setRows((prev) => prev.filter((r) => r.id !== id));
  const markAllRead = () => setRows((prev) => prev.map((r) => ({ ...r, read: true })));
  const clearRead = () => setRows((prev) => prev.filter((r) => !r.read));
  const clearAll = () => {
    if (!confirm("Hapus semua notifikasi?")) return;
    setRows([]);
  };

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Notifications</h1>
          <button
            onClick={() => nav("/")}
            className="px-3 py-2 rounded-lg border bg-gray-100 hover:bg-gray-200 text-sm"
          >
            Kembali ke Dasbor
          </button>
        </div>

        {/* Toolbar */}
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <button onClick={markAllRead} className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50">
              Tandai semua dibaca
            </button>
            <button onClick={clearRead} className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50">
              Bersihkan yang sudah dibaca
            </button>
            <button onClick={clearAll} className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50">
              Hapus semua
            </button>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari notifikasi…"
              className="border rounded-xl px-3 py-2 w-full md:w-72"
            />
            <select
              value={fType}
              onChange={(e) => setFType(e.target.value)}
              className="border rounded-xl px-3 py-2 w-full md:w-48"
            >
              <option value="">Semua Tipe</option>
              {Object.entries(TYPE_META).map(([key, v]) => (
                <option key={key} value={key}>
                  {v.label}
                </option>
              ))}
            </select>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="border rounded-xl px-3 py-2 w-full md:w-36"
            >
              {[5, 10, 20].map((n) => (
                <option key={n} value={n}>
                  {n} / halaman
                </option>
              ))}
            </select>
            <select
              value={fStatus}
              onChange={(e) => setFStatus(e.target.value)}
              className="border rounded-xl px-3 py-2 w-full md:w-36"
            >
              <option value="">Semua Status</option>
              <option value="unread">Belum dibaca</option>
              <option value="read">Sudah dibaca</option>
            </select>
          </div>
        </div>

        {/* List */}
        <div className="mt-5 card divide-y">
          {pageData.length === 0 && (
            <div className="p-6 text-center text-gray-500">Tidak ada notifikasi.</div>
          )}

          {pageData.map((n) => {
            const meta = TYPE_META[n.type] || { label: n.type };
            return (
              <div key={n.id} className="flex items-start gap-3 px-5 py-4">
                {/* icon */}
                <div className="relative shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gray-100 border flex items-center justify-center">
                    <Bell />
                  </div>
                  {!n.read && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-600 rounded-full" />
                  )}
                </div>

                {/* content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="truncate">
                      <div className={`text-sm ${n.read ? "font-medium text-gray-800" : "font-semibold text-gray-900"}`}>
                        {meta.label}
                      </div>
                      <div className="text-sm text-gray-600 truncate">{n.text}</div>
                    </div>
                    <div className="text-xs text-gray-400 shrink-0">{timeAgo(n.createdAt)}</div>
                  </div>

                  <div className="mt-2 flex items-center gap-3 text-xs">
                    <button
                      onClick={() => toggleRead(n.id)}
                      className="text-blue-600 hover:underline"
                    >
                      {n.read ? "Tandai belum dibaca" : "Tandai dibaca"}
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={() => remove(n.id)}
                      className="text-gray-600 hover:underline"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-1 py-4">
          <div className="text-xs text-gray-500">
            Menampilkan {(currentPage - 1) * pageSize + (total ? 1 : 0)}–
            {Math.min(currentPage * pageSize, total)} dari {total} notifikasi
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border disabled:opacity-50"
            >
              Sebelumnya
            </button>
            <span className="text-sm">Hal. {currentPage}/{totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg border disabled:opacity-50"
            >
              Berikutnya
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
