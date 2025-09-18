// src/pages/Karyawan.jsx
import { useEffect, useMemo, useState } from "react";
import Modal from "../components/Modal";
import { useKaryawanStore } from "../stores/useKaryawanStore";
import { useAuthStore } from "../stores/useAuthStore";

export default function Karyawan() {
  const { rows, fetchAll, add, update, remove, loading, error } =
    useKaryawanStore();

  // Ambil user dari global store (Zustand)
  const user = useAuthStore((s) => s.user);

  // modal/form
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    nama: "",
    divisi: "",
    posisi: "",
    email: "",
  });
  const [err, setErr] = useState({});

  const [q, setQ] = useState("");
  const [divisi, setDivisi] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const title = editing ? "Edit Karyawan" : "Tambah Karyawan";

  // fetch data hanya jika role = superadmin/admin
  useEffect(() => {
    if (user && (user.role === "superadmin" || user.role === "admin")) {
      fetchAll();
    }
  }, [fetchAll, user]);

  function validate() {
    const e = {};
    if (!form.nama) e.nama = "Nama wajib diisi";
    if (!form.divisi) e.divisi = "Divisi wajib diisi";
    if (!form.posisi) e.posisi = "Posisi wajib diisi";
    if (!form.email) e.email = "Email wajib diisi";
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
    setForm({
      nama: row.fullname,
      divisi: row.divisi_name,
      posisi: row.jabatan,
      email: row.email,
    });
    setErr({});
    setOpen(true);
  }

  const divisiMap = useMemo(() => {
    const map = {};
    rows.forEach((r) => {
      if (r.divisi_name && r.divisi_id) {
        map[r.divisi_name] = r.divisi_id;
      }
    });
    return map;
  }, [rows]);

  async function save(e) {
    e?.preventDefault();
    if (!validate()) return;

    try {
      if (editing) {
        await update(editing.user_id, {
          fullname: form.nama,
          divisi_id: divisiMap[form.divisi] || editing.divisi_id,
          jabatan: form.posisi,
          email: form.email,
        });
      } else {
        await add({
          fullname: form.nama,
          divisi_id: divisiMap[form.divisi] || 1,
          jabatan: form.posisi,
          email: form.email,
        });
      }
      setOpen(false);
    } catch (err) {
      alert(err.message || "Gagal menyimpan data");
    }
  }

  async function removeRow(row) {
    if (!confirm(`Hapus karyawan: ${row.fullname}?`)) return;
    try {
      await remove(row.user_id);
    } catch (err) {
      alert(err.message || "Gagal menghapus");
    }
  }

  const divisiOptions = useMemo(
    () =>
      Array.from(
        new Set(rows.map((r) => r.divisi_name).filter(Boolean))
      ).sort(),
    [rows]
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      const matchQ =
        !s ||
        r.fullname.toLowerCase().includes(s) ||
        r.email.toLowerCase().includes(s) ||
        r.jabatan.toLowerCase().includes(s);
      const matchDiv = !divisi || r.divisi_name === divisi;
      return matchQ && matchDiv;
    });
  }, [rows, q, divisi]);

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

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Manajemen Karyawan</h1>
          {user && (user.role === "superadmin" || user.role === "admin") && (
            <button
              onClick={openAdd}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              + Tambah Karyawan
            </button>
          )}
        </div>

        {loading && <p className="text-gray-500">Memuat data...</p>}
        {error && <p className="text-red-500">{error}</p>}

        <table className="w-full mt-4 text-sm border text-center">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2">Nama</th>
              <th className="px-4 py-2">Divisi</th>
              <th className="px-4 py-2">Posisi</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {pageData.map((r) => (
              <tr key={r.user_id} className="border-t">
                <td className="px-4 py-2">{r.fullname}</td>
                <td className="px-4 py-2">{r.divisi_name}</td>
                <td className="px-4 py-2">{r.jabatan}</td>
                <td className="px-4 py-2">{r.email}</td>
                <td className="px-4 py-2 space-x-2">
                  {user &&
                    (user.role === "superadmin" || user.role === "admin") && (
                      <>
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
                      </>
                    )}
                </td>
              </tr>
            ))}
            {pageData.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-4 text-gray-500">
                  Tidak ada data.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={open}
        title={title}
        onClose={() => setOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-4 py-2 border rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              form="form-karyawan"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              Simpan
            </button>
          </div>
        }
      >
        <form id="form-karyawan" onSubmit={save} className="space-y-4">
          <div>
            <label className="block text-sm">Nama</label>
            <input
              type="text"
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
            {err.nama && <p className="text-red-500 text-sm">{err.nama}</p>}
          </div>

          <div>
            <label className="block text-sm">Divisi</label>
            <select
              value={form.divisi}
              onChange={(e) => setForm({ ...form, divisi: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">Pilih Divisi</option>
              {divisiOptions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            {err.divisi && <p className="text-red-500 text-sm">{err.divisi}</p>}
          </div>

          <div>
            <label className="block text-sm">Posisi</label>
            <input
              type="text"
              value={form.posisi}
              onChange={(e) => setForm({ ...form, posisi: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
            {err.posisi && <p className="text-red-500 text-sm">{err.posisi}</p>}
          </div>

          <div>
            <label className="block text-sm">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
            {err.email && <p className="text-red-500 text-sm">{err.email}</p>}
          </div>
        </form>
      </Modal>
    </div>
  );
}
