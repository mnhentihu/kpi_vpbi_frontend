import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "../components/Modal";
import * as XLSX from "xlsx";

// util id aman (fallback jika randomUUID tidak ada)
const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const LS_KEY = "kpi-employees";

// seed data awal
const seed = [
  { id: uid(), nama: "Sophia Bennett", divisi: "Pemasaran", posisi: "Manajer Pemasaran", email: "sophia.bennett@example.com" },
  { id: uid(), nama: "Ethan Harper", divisi: "Penjualan", posisi: "Perwakilan Penjualan", email: "ethan.harper@example.com" },
  { id: uid(), nama: "Olivia Carter", divisi: "Produk", posisi: "Manajer Produk", email: "olivia.carter@example.com" },
  { id: uid(), nama: "Liam Foster", divisi: "Teknik", posisi: "Insinyur Perangkat Lunak", email: "liam.foster@example.com" },
  { id: uid(), nama: "Ava Morgan", divisi: "SDM", posisi: "Spesialis SDM", email: "ava.morgan@example.com" },
];

// utils
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());

export default function Karyawan() {
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

  // modal/form
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null); // object | null
  const [form, setForm] = useState({ nama: "", divisi: "", posisi: "", email: "" });
  const [err, setErr] = useState({});

  // search/filter/pagination
  const [q, setQ] = useState("");
  const [divisi, setDivisi] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // import
  const fileRef = useRef(null);

  const title = editing ? "Edit Karyawan" : "Tambah Karyawan";

  function validate() {
    const e = {};
    if (!form.nama) e.nama = "Nama wajib diisi";
    if (!form.divisi) e.divisi = "Divisi wajib diisi";
    if (!form.posisi) e.posisi = "Posisi wajib diisi";
    if (!form.email) e.email = "Email wajib diisi";
    else if (!isEmail(form.email)) e.email = "Format email tidak valid";
    else {
      const dup = rows.some(
        (r) => r.email.toLowerCase() === form.email.toLowerCase() && r.id !== editing?.id
      );
      if (dup) e.email = "Email sudah terdaftar";
    }
    setErr(e);
    return Object.keys(e).length === 0;
  }

  function openAdd() {
    setEditing(null);
    setForm({ nama: "", divisi: "", posisi: "", email: "" });
    setErr({});
    setOpen(true);
  }
  function openEdit(row) {
    setEditing(row);
    setForm({ nama: row.nama, divisi: row.divisi, posisi: row.posisi, email: row.email });
    setErr({});
    setOpen(true);
  }
  function save(e) {
    e?.preventDefault();
    if (!validate()) return;
    if (editing) {
      setRows((prev) => prev.map((r) => (r.id === editing.id ? { ...editing, ...form } : r)));
    } else {
      setRows((prev) => [...prev, { id: uid(), ...form }]);
    }
    setOpen(false);
  }
  function remove(row) {
    if (!confirm(`Hapus karyawan: ${row.nama}?`)) return;
    setRows((prev) => prev.filter((r) => r.id !== row.id));
  }

  // opsi divisi unik
  const divisiOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.divisi).filter(Boolean))).sort(),
    [rows]
  );

  // filter + search
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      const matchQ =
        !s ||
        r.nama.toLowerCase().includes(s) ||
        r.email.toLowerCase().includes(s) ||
        r.posisi.toLowerCase().includes(s);
      const matchDiv = !divisi || r.divisi === divisi;
      return matchQ && matchDiv;
    });
  }, [rows, q, divisi]);

  // pagination
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [q, divisi, pageSize]);

  // EXPORT EXCEL
  function exportExcel() {
    // Buang id agar file bersih
    const exportRows = filtered.map(({ id, ...r }) => r);
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Karyawan");
    XLSX.writeFile(wb, "karyawan.xlsx");
  }

  // IMPORT EXCEL/CSV
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

        // map ke schema standar (nama, divisi, posisi, email)
        const mapRow = (r) => {
          const get = (...keys) => {
            for (const k of keys) {
              if (r[k] != null && String(r[k]).trim() !== "") return String(r[k]).trim();
            }
            return "";
          };
          return {
            id: uid(),
            nama: get("nama", "Nama", "name", "Name"),
            divisi: get("divisi", "Divisi", "division", "Department", "departemen"),
            posisi: get("posisi", "Posisi", "position", "Jabatan", "role"),
            email: get("email", "Email", "e-mail"),
          };
        };

        const parsed = json.map(mapRow);
        // bersihkan + validasi
        const cleaned = parsed.filter(
          (r) => r.nama && r.divisi && r.posisi && isEmail(r.email)
        );

        // cegah duplikasi email (prioritas data existing)
        const existing = new Set(rows.map((r) => r.email.toLowerCase()));
        const uniqueToAdd = cleaned.filter(
          (r) => !existing.has(r.email.toLowerCase())
        );

        setRows((prev) => [...prev, ...uniqueToAdd]);
        alert(`Import selesai. Ditambahkan: ${uniqueToAdd.length} baris.`);
      } catch (err) {
        console.error(err);
        alert(
          "Gagal import. Pastikan sheet pertama punya kolom: nama, divisi, posisi, email (boleh beda kapitalisasi)."
        );
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
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Manajemen Karyawan</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
              title="Import Excel/CSV"
            >
              Import Excel
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={importExcel}
            />
            <button
              onClick={exportExcel}
              className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
              title="Export Excel"
            >
              Export Excel
            </button>
            <button
              onClick={openAdd}
              className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg border"
            >
              Tambah Karyawan
            </button>
          </div>
        </div>

        {/* Back + Toolbar */}
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <button
            onClick={() => nav("/")}
            className="text-sm px-3 py-1.5 rounded-lg border bg-gray-100 hover:bg-gray-200 w-fit"
          >
            Kembali ke Dasbor
          </button>

          <div className="flex flex-col md:flex-row gap-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nama, email, atau posisi…"
              className="border rounded-xl px-3 py-2 w-full md:w-72"
            />
            <select
              value={divisi}
              onChange={(e) => setDivisi(e.target.value)}
              className="border rounded-xl px-3 py-2 w-full md:w-48"
            >
              <option value="">Semua Divisi</option>
              {divisiOptions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="border rounded-xl px-3 py-2 w-full md:w-36"
              title="Rows per page"
            >
              {[5, 10, 20].map((n) => (
                <option key={n} value={n}>
                  {n} / halaman
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="mt-4 card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white">
              <tr className="text-left text-gray-600 border-b">
                <th className="px-5 py-3">Nama</th>
                <th className="px-5 py-3">Divisi</th>
                <th className="px-5 py-3">Posisi</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {pageData.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-5 py-4 text-gray-800">{r.nama}</td>
                  <td className="px-5 py-4">
                    <button className="text-blue-600 hover:underline">{r.divisi}</button>
                  </td>
                  <td className="px-5 py-4">
                    <button className="text-blue-600 hover:underline">{r.posisi}</button>
                  </td>
                  <td className="px-5 py-4 text-gray-700">{r.email}</td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <button onClick={() => openEdit(r)} className="text-blue-600 hover:underline">
                      Edit
                    </button>
                    <span className="mx-2 text-gray-300">|</span>
                    <button onClick={() => remove(r)} className="text-gray-600 hover:underline">
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
              {pageData.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-gray-500">
                    Tidak ada data.
                  </td>
                </tr>
              )}
            </tbody>

            {/* Footer Pagination */}
          </table>
          <div className="flex items-center justify-between px-5 py-3">
            <div className="text-xs text-gray-500">
              Menampilkan {(currentPage - 1) * pageSize + (total ? 1 : 0)}–
              {Math.min(currentPage * pageSize, total)} dari {total} data
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

      {/* Modal Form */}
      <Modal open={open} title={title} onClose={() => setOpen(false)}>
        <form className="space-y-4" onSubmit={save}>
          <div>
            <label className="text-xs text-gray-600">Nama</label>
            <input
              className={`mt-1 w-full border rounded-xl px-3 py-2 ${err.nama ? "border-red-400" : "border-gray-300"}`}
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              placeholder="Nama lengkap"
            />
            {err.nama && <p className="text-xs text-red-500 mt-1">{err.nama}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-600">Divisi</label>
              <input
                className={`mt-1 w-full border rounded-xl px-3 py-2 ${err.divisi ? "border-red-400" : "border-gray-300"}`}
                value={form.divisi}
                onChange={(e) => setForm({ ...form, divisi: e.target.value })}
                placeholder="Contoh: Pemasaran"
              />
              {err.divisi && <p className="text-xs text-red-500 mt-1">{err.divisi}</p>}
            </div>
            <div>
              <label className="text-xs text-gray-600">Posisi</label>
              <input
                className={`mt-1 w-full border rounded-xl px-3 py-2 ${err.posisi ? "border-red-400" : "border-gray-300"}`}
                value={form.posisi}
                onChange={(e) => setForm({ ...form, posisi: e.target.value })}
                placeholder="Contoh: Manajer Produk"
              />
              {err.posisi && <p className="text-xs text-red-500 mt-1">{err.posisi}</p>}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-600">Email</label>
            <input
              className={`mt-1 w-full border rounded-xl px-3 py-2 ${err.email ? "border-red-400" : "border-gray-300"}`}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="nama@contoh.com"
              type="email"
            />
            {err.email && <p className="text-xs text-red-500 mt-1">{err.email}</p>}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 rounded-xl border">
              Batal
            </button>
            <button type="submit" className="px-4 py-2 rounded-xl bg-black text-white">
              Simpan
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
