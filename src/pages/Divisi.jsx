import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";

// id aman (fallback)
const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const LS_KEY = "kpi-divisions";

const seed = [
  { id: uid(), nama: "Pemasaran", deskripsi: "Bertanggung jawab untuk mempromosikan produk dan layanan." },
  { id: uid(), nama: "Penjualan", deskripsi: "Bertanggung jawab untuk menjual produk dan layanan." },
  { id: uid(), nama: "Teknik", deskripsi: "Bertanggung jawab untuk mengembangkan dan memelihara produk." },
  { id: uid(), nama: "Operasi", deskripsi: "Bertanggung jawab atas operasi bisnis sehari-hari." },
  { id: uid(), nama: "Sumber Daya Manusia", deskripsi: "Bertanggung jawab untuk mengelola karyawan." },
];

export default function Divisi() {
  const nav = useNavigate();

  // data
  const [rows, setRows] = useState([]);
  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) setRows(JSON.parse(saved));
    else {
      setRows(seed);
      localStorage.setItem(LS_KEY, JSON.stringify(seed));
    }
  }, []);
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(rows));
  }, [rows]);

  // form
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nama: "", deskripsi: "" });
  const [err, setErr] = useState({});
  const title = editing ? "Edit Divisi" : "Tambah Divisi";
  const resetForm = () => { setEditing(null); setForm({ nama: "", deskripsi: "" }); setErr({}); };

  // search & pagination
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) =>
      !s || r.nama.toLowerCase().includes(s) || (r.deskripsi || "").toLowerCase().includes(s)
    );
  }, [rows, q]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  useEffect(() => { setPage(1); }, [q, pageSize]);

  // validasi & CRUD
  function validate() {
    const e = {};
    const nm = (form.nama || "").trim();
    if (!nm) e.nama = "Nama divisi wajib diisi";
    const dupe = rows.some((r) => r.nama.trim().toLowerCase() === nm.toLowerCase() && r.id !== editing?.id);
    if (!e.nama && dupe) e.nama = "Nama divisi sudah ada";
    setErr(e);
    return Object.keys(e).length === 0;
  }
  function simpan(e) {
    e.preventDefault();
    if (!validate()) return;
    if (editing) {
      setRows((prev) => prev.map((r) => (r.id === editing.id ? { ...editing, ...form } : r)));
    } else {
      setRows((prev) => [...prev, { id: uid(), ...form }]);
    }
    resetForm();
  }
  function onTambahClick() { resetForm(); }
  function onEditClick(row) { setEditing(row); setForm({ nama: row.nama, deskripsi: row.deskripsi || "" }); setErr({}); }
  function onHapus(row) {
    if (!confirm(`Hapus divisi: ${row.nama}?`)) return;
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    if (editing?.id === row.id) resetForm();
  }

  // import/export
  const fileRef = useRef(null);
  function exportExcel() {
    const exportRows = filtered.map(({ id, ...r }) => r);
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Divisi");
    XLSX.writeFile(wb, "divisi.xlsx");
  }
  function importExcel(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = new Uint8Array(reader.result);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { defval: "", raw: false });
        const mapRow = (r) => {
          const get = (...keys) => {
            for (const k of keys) if (r[k] != null && String(r[k]).trim() !== "") return String(r[k]).trim();
            return "";
          };
          return { id: uid(), nama: get("nama", "Nama", "divisi", "Division", "Departemen", "Department"), deskripsi: get("deskripsi", "Deskripsi", "description", "keterangan") };
        };
        const parsed = json.map(mapRow);
        const cleaned = parsed.filter((r) => r.nama.trim() !== "");
        const existing = new Set(rows.map((r) => r.nama.trim().toLowerCase()));
        const uniqueToAdd = cleaned.filter((r) => !existing.has(r.nama.trim().toLowerCase()));
        setRows((prev) => [...prev, ...uniqueToAdd]);
        alert(`Import selesai. Ditambahkan: ${uniqueToAdd.length} divisi.`);
      } catch (err) {
        console.error(err);
        alert("Gagal import. Pastikan sheet punya kolom minimal: nama (deskripsi opsional).");
      } finally {
        e.target.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  }

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Divisi</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => fileRef.current?.click()} className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50" title="Import Excel/CSV">
              Import Excel
            </button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={importExcel} />
            <button onClick={exportExcel} className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50" title="Export Excel">
              Export Excel
            </button>
            <button onClick={onTambahClick} className="px-4 py-2 text-sm rounded-lg border bg-gray-100 hover:bg-gray-200">
              Tambah Divisi
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <button onClick={() => nav("/")} className="text-sm px-3 py-1.5 rounded-lg border bg-gray-100 hover:bg-gray-200 w-fit">
            Kembali ke Dasbor
          </button>

          <div className="flex flex-col md:flex-row gap-3">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama atau deskripsi…" className="border rounded-xl px-3 py-2 w-full md:w-80" />
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="border rounded-xl px-3 py-2 w-full md:w-36">
              {[5, 10, 20].map((n) => (
                <option key={n} value={n}>
                  {n} / halaman
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Grid: table + form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Table */}
          <div className="lg:col-span-2">
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-white">
                  <tr className="text-left text-gray-600 border-b">
                    <th className="px-5 py-3 w-1/3">Nama Divisi</th>
                    <th className="px-5 py-3">Deskripsi</th>
                    <th className="px-5 py-3 w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {pageData.map((r) => (
                    <tr key={r.id} className="border-b last:border-0 align-top">
                      <td className="px-5 py-4 text-gray-800">{r.nama}</td>
                      <td className="px-5 py-4 text-gray-700">{r.deskripsi || "-"}</td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <button onClick={() => onEditClick(r)} className="text-blue-600 hover:underline">Edit</button>
                        <span className="mx-2 text-gray-300">|</span>
                        <button onClick={() => onHapus(r)} className="text-gray-600 hover:underline">Hapus</button>
                      </td>
                    </tr>
                  ))}
                  {pageData.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-5 py-10 text-center text-gray-500">Tidak ada data.</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="flex items-center justify-between px-5 py-3">
                <div className="text-xs text-gray-500">
                  Menampilkan {(currentPage - 1) * pageSize + (total ? 1 : 0)}–{Math.min(currentPage * pageSize, total)} dari {total} data
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1.5 rounded-lg border disabled:opacity-50">Sebelumnya</button>
                  <span className="text-sm">Hal. {currentPage}/{totalPages}</span>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1.5 rounded-lg border disabled:opacity-50">Berikutnya</button>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <div>
            <div className="card">
              <div className="card-body space-y-4">
                <h3 className="font-semibold">{title}</h3>

                <form onSubmit={simpan} className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-600">Nama Divisi</label>
                    <input
                      className={`mt-1 w-full border rounded-xl px-3 py-2 ${err.nama ? "border-red-400" : "border-gray-300"}`}
                      placeholder="misalnya, Pemasaran"
                      value={form.nama}
                      onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))}
                    />
                    {err.nama && <p className="text-xs text-red-500 mt-1">{err.nama}</p>}
                  </div>

                  <div>
                    <label className="text-xs text-gray-600">Deskripsi</label>
                    <textarea
                      className="mt-1 w-full border rounded-xl px-3 py-2 min-h-[120px] border-gray-300"
                      value={form.deskripsi}
                      onChange={(e) => setForm((f) => ({ ...f, deskripsi: e.target.value }))}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button type="button" onClick={() => nav("/")} className="px-3 py-2 rounded-lg border bg-gray-100 hover:bg-gray-200 text-sm">
                      Kembali ke Dasbor
                    </button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm">
                      Simpan
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {editing && (
              <div className="mt-3 text-xs text-gray-500">
                Sedang mengedit: <span className="font-medium">{editing.nama}</span>.{" "}
                <button onClick={resetForm} className="underline hover:no-underline">Batalkan edit</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
