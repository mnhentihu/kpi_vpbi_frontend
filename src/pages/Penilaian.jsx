import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "../components/Modal";
import useKpiStore from "../stores/useKpiStore";
import { useKaryawanStore } from "../stores/useKaryawanStore";
import { useDivisiStore } from "../stores/useDivisiStore";
import useHistoryKpiStore from "../stores/useHistoryKpiStore";
import { useAuthStore } from "../stores/useAuthStore";

export default function Penilaian() {
  const nav = useNavigate();

  // ====== Ambil user login ======
  const user = useAuthStore((s) => s.user);
  useEffect(() => {
    console.log("User login:", user);
  }, [user]);

  // ====== Store ======
  const { kpis, fetchKpis } = useKpiStore();
  const { rows: employees, fetchAll: fetchKaryawan } = useKaryawanStore();
  const { rows: divisions, fetchAll: fetchDivisi } = useDivisiStore();
  const { rows, fetchAll: fetchHistory, add } = useHistoryKpiStore();

  // ====== Effects ======
  useEffect(() => {
    if (!user) return;
    fetchKaryawan();
    fetchDivisi();

    if (user.role === "admin" && user.divisi_id) {
      fetchKpis({ divisi_id: user.divisi_id });
      fetchHistory({ divisiId: user.divisi_id });
    } else {
      fetchKpis();
      fetchHistory();
    }
  }, [user, fetchKaryawan, fetchDivisi, fetchKpis, fetchHistory]);

  // ====== Filter ======
  const [fDivisi, setFDivisi] = useState("");
  const [fStatus, setFStatus] = useState("");

  const filtered = useMemo(() => {
    return rows
      .filter((r) => (!fDivisi ? true : r.nama_divisi === fDivisi))
      .filter((r) => (!fStatus ? true : r.status === fStatus))
      .sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1));
  }, [rows, fDivisi, fStatus]);

  // ====== Modal State ======
  const [detail, setDetail] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // ====== Form State ======
  const [form, setForm] = useState({ karyawanId: "", tanggal: "", nilai: {} });
  const [err, setErr] = useState({});

  function validate() {
    const e = {};
    if (!form.karyawanId) e.karyawanId = "Pilih karyawan";
    if (!form.tanggal) e.tanggal = "Tanggal wajib diisi";
    setErr(e);
    return Object.keys(e).length === 0;
  }

  async function submit(e) {
    e.preventDefault();
    if (!validate()) return;

    // hitung skor otomatis
    let skor = 0;
    kpis.forEach((kpi) => {
      const real = parseFloat(form.nilai[kpi.id] || 0);
      const persen = (real / kpi.target) * 100;
      skor += (persen * kpi.bobot) / 100;
    });

    try {
      await add({
        karyawanId: form.karyawanId,
        tanggal: form.tanggal,
        nilai: form.nilai,
        skor,
        divisiId: user.divisi_id,
      });

      // reset
      setForm({ karyawanId: "", tanggal: "", nilai: {} });
      setShowForm(false);
    } catch (err) {
      alert(err.message || "Gagal menambah penilaian");
    }
  }

  // ====== Options ======
  const divisiOptions = useMemo(
    () => Array.from(new Set(divisions.map((d) => d.name).filter(Boolean))),
    [divisions]
  );

  const employeeOptions = useMemo(() => {
    let list = employees.filter((e) => e.role !== "admin");
    if (user?.role === "admin" && user.divisi_id) {
      list = list.filter((e) => e.divisi_id === user.divisi_id);
    }
    return list.map((e) => ({
      id: e.id,
      label: `${e.fullname} (${
        divisions.find((d) => d.id === e.divisi_id)?.name || "-"
      })`,
    }));
  }, [employees, divisions, user]);

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Penilaian KPI</h1>
            <p className="text-sm text-gray-500 mt-1">
              Lacak dan kelola kinerja karyawan
            </p>
          </div>
          <div className="space-x-2">
            <button
              onClick={() => setShowForm(true)}
              className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm"
            >
              + Tambah Penilaian
            </button>
            <button
              onClick={() => nav("/")}
              className="px-3 py-2 rounded-lg border bg-gray-100 hover:bg-gray-200 text-sm"
            >
              Kembali ke Dasbor
            </button>
          </div>
        </div>

        {/* Filter */}
        <div className="mt-6">
          <h3 className="font-semibold mb-2">Filter</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-xl">
            {user?.role !== "admin" && (
              <select
                value={fDivisi}
                onChange={(e) => setFDivisi(e.target.value)}
                className="border rounded-xl px-3 py-2"
              >
                <option value="">Pilih Divisi</option>
                {divisiOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            )}

            <select
              value={fStatus}
              onChange={(e) => setFStatus(e.target.value)}
              className="border rounded-xl px-3 py-2"
            >
              <option value="">Pilih Status</option>
              <option value="Selesai">Selesai</option>
              <option value="Proses">Proses</option>
            </select>
          </div>
        </div>

        {/* Tabel Penilaian */}
        <div className="mt-6">
          <h3 className="font-semibold mb-2">Tabel Penilaian KPI</h3>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white">
                <tr className="text-left text-gray-600 border-b">
                  <th className="px-5 py-3">Karyawan</th>
                  <th className="px-5 py-3 w-40">Divisi</th>
                  <th className="px-5 py-3 w-40">Tanggal</th>
                  <th className="px-5 py-3 w-28">Status</th>
                  <th className="px-5 py-3 w-32">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="px-5 py-4">{r.nama_karyawan}</td>
                    <td className="px-5 py-4">{r.nama_divisi || "-"}</td>
                    <td className="px-5 py-4">{r.tanggal}</td>
                    <td className="px-5 py-4">{r.status}</td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <button
                        onClick={() => setDetail(r)}
                        className="text-blue-600 hover:underline"
                      >
                        Lihat Detail
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-10 text-center text-gray-500"
                    >
                      Tidak ada data.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Tambah Penilaian */}
      <Modal
        open={showForm}
        title="Tambah Penilaian KPI"
        onClose={() => setShowForm(false)}
        size="lg"
      >
        <form onSubmit={submit} className="space-y-4">
          {/* Pilih Karyawan */}
          <div>
            <label className="text-xs text-gray-600">Pilih Karyawan</label>
            <select
              className={`mt-1 w-full border rounded-xl px-3 py-2 ${
                err.karyawanId ? "border-red-400" : "border-gray-300"
              }`}
              value={form.karyawanId}
              onChange={(e) => setForm({ ...form, karyawanId: e.target.value })}
            >
              <option value="">Pilih</option>
              {employeeOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            {err.karyawanId && (
              <p className="text-xs text-red-500 mt-1">{err.karyawanId}</p>
            )}
          </div>

          {/* Tanggal */}
          <div>
            <label className="text-xs text-gray-600">Tanggal Penilaian</label>
            <input
              type="date"
              className={`mt-1 w-full border rounded-xl px-3 py-2 ${
                err.tanggal ? "border-red-400" : "border-gray-300"
              }`}
              value={form.tanggal}
              onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
            />
            {err.tanggal && (
              <p className="text-xs text-red-500 mt-1">{err.tanggal}</p>
            )}
          </div>

          {/* Nilai KPI */}
          <div>
            <h4 className="text-sm font-medium mb-2">Nilai KPI</h4>
            {kpis?.length > 0 ? (
              kpis.map((kpi) => (
                <div
                  key={kpi.id}
                  className="border p-3 rounded-lg space-y-2 mb-2"
                >
                  <div className="text-sm font-medium">{kpi.indikator}</div>
                  <div className="text-xs text-gray-500">
                    Target: {kpi.target} {kpi.satuan} | Bobot: {kpi.bobot}%
                  </div>
                  <input
                    type="number"
                    className="w-full border rounded-xl px-3 py-2"
                    placeholder="Nilai Real"
                    value={form.nilai[kpi.id] || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        nilai: {
                          ...form.nilai,
                          [kpi.id]: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">
                Tidak ada KPI untuk divisi ini
              </p>
            )}
          </div>

          <div className="flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg border bg-gray-100 hover:bg-gray-200"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
            >
              Simpan
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Detail */}
      <Modal
        open={!!detail}
        title="Detail Penilaian"
        onClose={() => setDetail(null)}
      >
        {detail && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Karyawan</span>
              <span className="font-medium">{detail.nama_karyawan}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Divisi</span>
              <span className="font-medium">{detail.nama_divisi || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Tanggal</span>
              <span className="font-medium">{detail.tanggal}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <span className="font-medium">{detail.status}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
