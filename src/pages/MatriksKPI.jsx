// src/pages/MatriksKPI.jsx
import { useEffect, useMemo, useState } from "react";
import useKpiStore from "../stores/useKpiStore";
import { useDivisiStore } from "../stores/useDivisiStore";
import { useAuthStore } from "../stores/useAuthStore";

export default function MatriksKPI() {
  const { kpis, loading, error, fetchKpis, addKpi, updateKpi, deleteKpi } =
    useKpiStore();
  const { rows: divisi, fetchAll: fetchDivisi } = useDivisiStore();

  // Ambil user dari store
  const user = useAuthStore((s) => s.user);
  const role = user?.role || "";
  const userDivisiId = String(user?.divisi_id || "");

  // Form state
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    indikator: "",
    satuan: "",
    target: "",
    bobot: "",
    divisi_id: role === "admin" ? userDivisiId : "",
  });
  const [err, setErr] = useState({});

  useEffect(() => {
    fetchKpis();
    fetchDivisi();
  }, [fetchKpis, fetchDivisi]);

  function validate() {
    const e = {};
    if (!form.indikator) e.indikator = "Indikator wajib diisi";
    if (!form.satuan) e.satuan = "Satuan wajib diisi";
    if (!form.target) e.target = "Target wajib diisi";
    if (!form.bobot) e.bobot = "Bobot wajib diisi";
    if (role === "superadmin" && !form.divisi_id)
      e.divisi_id = "Divisi wajib dipilih";
    setErr(e);
    return Object.keys(e).length === 0;
  }

  async function save(e) {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      indikator: form.indikator,
      satuan: form.satuan,
      target: form.target,
      bobot: form.bobot,
      divisi_id: role === "admin" ? userDivisiId : form.divisi_id,
    };

    try {
      if (editing) {
        await updateKpi(editing.kpi_id, payload);
      } else {
        await addKpi(payload);
      }
      resetForm();
    } catch (err) {
      alert(err.message || "Gagal menyimpan data");
    }
  }

  function openEdit(row) {
    setEditing(row);
    setForm({
      indikator: row.indikator,
      satuan: row.satuan,
      target: row.target,
      bobot: row.bobot,
      divisi_id: String(row.divisi_id),
    });
    setErr({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditing(null);
    setForm({
      indikator: "",
      satuan: "",
      target: "",
      bobot: "",
      divisi_id: role === "admin" ? userDivisiId : "",
    });
    setErr({});
  }

  async function removeRow(row) {
    if (!confirm(`Hapus KPI: ${row.indikator}?`)) return;
    try {
      await deleteKpi(row.kpi_id);
    } catch (err) {
      alert(err.message || "Gagal menghapus data");
    }
  }

  // Mapping divisi_id -> nama_divisi
  const divisiMap = useMemo(() => {
    const map = {};
    (divisi || []).forEach((d) => {
      map[String(d.divisi_id)] = d.name;
    });
    return map;
  }, [divisi]);

  // Filter KPI untuk admin
  const visibleKpis =
    role === "admin"
      ? (kpis || []).filter((kpi) => String(kpi.divisi_id) === userDivisiId)
      : kpis || [];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Konfigurasi Matriks KPI</h1>

      {/* Form Tambah/Edit */}
      <div className="mb-8">
        <h3 className="font-semibold mb-3">
          {editing ? "Edit KPI" : "Tambah KPI Baru"}
        </h3>
        <form onSubmit={save} className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-sm">Indikator</label>
            <input
              type="text"
              value={form.indikator}
              onChange={(e) => setForm({ ...form, indikator: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
            {err.indikator && (
              <p className="text-xs text-red-500">{err.indikator}</p>
            )}
          </div>

          <div>
            <label className="text-sm">Satuan</label>
            <input
              type="text"
              value={form.satuan}
              onChange={(e) => setForm({ ...form, satuan: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
            {err.satuan && <p className="text-xs text-red-500">{err.satuan}</p>}
          </div>

          <div>
            <label className="text-sm">Target</label>
            <input
              type="text"
              value={form.target}
              onChange={(e) => setForm({ ...form, target: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
            {err.target && <p className="text-xs text-red-500">{err.target}</p>}
          </div>

          <div>
            <label className="text-sm">Bobot</label>
            <input
              type="number"
              value={form.bobot}
              onChange={(e) => setForm({ ...form, bobot: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
            {err.bobot && <p className="text-xs text-red-500">{err.bobot}</p>}
          </div>

          {role === "superadmin" ? (
            <div>
              <label className="text-sm">Divisi</label>
              <select
                value={form.divisi_id}
                onChange={(e) =>
                  setForm({ ...form, divisi_id: e.target.value })
                }
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Pilih Divisi</option>
                {divisi.map((d) => (
                  <option key={d.divisi_id} value={d.divisi_id}>
                    {d.name}
                  </option>
                ))}
              </select>
              {err.divisi_id && (
                <p className="text-xs text-red-500">{err.divisi_id}</p>
              )}
            </div>
          ) : (
            role === "admin" && (
              <div>
                <label className="text-sm">Divisi</label>
                <input
                  type="text"
                  value={divisiMap[userDivisiId] || ""}
                  disabled
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                />
              </div>
            )
          )}

          <div className="flex gap-2 mt-3 md:col-span-2">
            {editing && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border rounded"
              >
                Batal
              </button>
            )}
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              Simpan
            </button>
          </div>
        </form>
      </div>

      {/* Table KPI */}
      {loading && <p className="text-gray-500">Memuat data...</p>}
      {error && <p className="text-red-500">{error}</p>}

      <table className="w-full text-sm border text-center">
        <thead>
          <tr className="bg-gray-100">
            <th className="px-4 py-2">Indikator</th>
            <th className="px-4 py-2">Satuan</th>
            <th className="px-4 py-2">Target</th>
            <th className="px-4 py-2">Bobot</th>
            <th className="px-4 py-2">Divisi</th>
            <th className="px-4 py-2">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(visibleKpis) && visibleKpis.length > 0 ? (
            visibleKpis.map((r) => (
              <tr key={r.kpi_id} className="border-t">
                <td className="px-4 py-2">{r.indikator}</td>
                <td className="px-4 py-2">{r.satuan}</td>
                <td className="px-4 py-2">{r.target}</td>
                <td className="px-4 py-2">{r.bobot}</td>
                <td className="px-4 py-2">
                  {divisiMap[String(r.divisi_id)] || "—"}
                </td>
                <td className="px-4 py-2 space-x-2">
                  <button
                    onClick={() => openEdit(r)}
                    className="text-blue-500 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => removeRow(r)}
                    className="text-red-500 hover:underline"
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} className="text-center py-4">
                Tidak ada data KPI
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
