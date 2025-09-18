import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "../components/Modal";
import { useDivisiStore } from "../stores/useDivisiStore";
import { useAuthStore } from "../stores/useAuthStore";

export default function Divisi() {
  const nav = useNavigate();
  const { rows, fetchAll, add, update, remove, loading, error } =
    useDivisiStore();
  const { user } = useAuthStore();

  // cek apakah superadmin
  const isSuperadmin = user?.role === "superadmin";

  // Modal & form
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", deskripsi: "" });
  const [err, setErr] = useState({});
  const title = editing ? "Edit Divisi" : "Tambah Divisi";

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = "Nama divisi wajib diisi";
    setErr(e);
    return Object.keys(e).length === 0;
  }

  function openAdd() {
    setEditing(null);
    setForm({ name: "", deskripsi: "" });
    setErr({});
    setOpen(true);
  }

  function openEdit(row) {
    setEditing(row);
    setForm({ name: row.name, deskripsi: row.deskripsi || "" });
    setErr({});
    setOpen(true);
  }

  async function save(e) {
    e?.preventDefault();
    if (!validate()) return;
    try {
      if (editing) {
        await update(editing.divisi_id, form);
      } else {
        await add(form);
      }
      setOpen(false);
    } catch (err) {
      alert(err.message || "Gagal menyimpan divisi");
    }
  }

  async function removeRow(row) {
    if (!confirm(`Hapus divisi: ${row.name}?`)) return;
    try {
      await remove(row.divisi_id);
    } catch (err) {
      alert(err.message || "Gagal menghapus");
    }
  }

  // Search & pagination
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        !s ||
        r.name.toLowerCase().includes(s) ||
        (r.deskripsi || "").toLowerCase().includes(s)
    );
  }, [rows, q]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [q, pageSize]);

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Divisi</h1>
          <div className="flex gap-2">
            {isSuperadmin && (
              <button
                onClick={openAdd}
                className=" px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
              >
                Tambah Divisi
              </button>
            )}
            <button
              onClick={() => nav("/")}
              className="px-4 py-2 text-sm rounded-lg border bg-gray-100 hover:bg-gray-200"
            >
              Kembali ke Dasbor
            </button>
          </div>
        </div>

        {loading && <p className="text-gray-500">Memuat data...</p>}
        {error && <p className="text-red-500">{error}</p>}

        {/* Search & page size */}
        <div className="flex gap-3 mb-4">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari divisi…"
            className="border rounded-xl px-3 py-2 w-full md:w-80"
          />
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
        </div>

        {/* Table */}
        <table className="w-full text-sm border">
          <thead>
            <tr className="bg-gray-100 text-center">
              <th className="px-4 py-2">Nama Divisi</th>
              <th className="px-4 py-2">Deskripsi</th>
              {isSuperadmin && <th className="px-4 py-2">Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {pageData.map((r) => (
              <tr key={r.divisi_id} className="border-t text-center">
                <td className="px-4 py-2">{r.name}</td>
                <td className="px-4 py-2">{r.deskripsi || "-"}</td>
                {isSuperadmin && (
                  <td className="px-4 py-2 space-x-2">
                    <button
                      onClick={() => openEdit(r)}
                      className=" px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => removeRow(r)}
                      className=" px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white"
                    >
                      Hapus
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {pageData.length === 0 && (
              <tr>
                <td
                  colSpan={isSuperadmin ? 3 : 2}
                  className="text-center py-4 text-gray-500"
                >
                  Tidak ada data.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-xs text-gray-500">
            Menampilkan {(currentPage - 1) * pageSize + (total ? 1 : 0)}–
            {Math.min(currentPage * pageSize, total)} dari {total} data
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Sebelumnya
            </button>
            <span className="text-sm">
              Hal. {currentPage}/{totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Berikutnya
            </button>
          </div>
        </div>
      </div>

      {/* Modal hanya superadmin */}
      {isSuperadmin && (
        <Modal open={open} title={title} onClose={() => setOpen(false)}>
          <form onSubmit={save} className="space-y-4">
            <div>
              <label className="text-xs text-gray-600">Nama Divisi</label>
              <input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                className={`mt-1 w-full border rounded-xl px-3 py-2 ${
                  err.name ? "border-red-400" : "border-gray-300"
                }`}
                placeholder="misalnya, Pemasaran"
              />
              {err.name && (
                <p className="text-xs text-red-500 mt-1">{err.name}</p>
              )}
            </div>

            <div>
              <label className="text-xs text-gray-600">Deskripsi</label>
              <textarea
                value={form.deskripsi}
                onChange={(e) =>
                  setForm((f) => ({ ...f, deskripsi: e.target.value }))
                }
                className="mt-1 w-full border rounded-xl px-3 py-2 min-h-[100px] border-gray-300"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 border rounded-lg text-sm"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm"
              >
                Simpan
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
