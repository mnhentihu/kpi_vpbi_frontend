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

  // ====== Store ======
  const { kpis, fetchKpis } = useKpiStore();
  const { rows: employees, fetchAll: fetchKaryawan } = useKaryawanStore();
  const { rows: divisions, fetchAll: fetchDivisi } = useDivisiStore();
  const { rows, fetchAll: fetchHistory, add } = useHistoryKpiStore();

  const { getDivisiName } = useDivisiStore();

  // ====== Effects ======
  useEffect(() => {
    if (!user) return;
    fetchKaryawan();
    fetchDivisi();

    if (user.role === "admin" && user.divisi_id) {
      fetchKpis({ divisi_id: user.divisi_id });
      fetchHistory({ divisi_id: user.divisi_id });
    } else {
      fetchKpis();
      fetchHistory();
    }
  }, [user, fetchKaryawan, fetchDivisi, fetchKpis, fetchHistory]);

  // ====== Filter ======
  const [fDivisi, setFDivisi] = useState("");

  const filtered = useMemo(() => {
    return rows
      .filter((r) => (!fDivisi ? true : r.nama_divisi === fDivisi))
      .sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1));
  }, [rows, fDivisi]);

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

    const details = kpis.map((kpi) => {
      const real = parseFloat(form.nilai[kpi.kpi_id] || 0);
      const persen = kpi.target ? (real / kpi.target) * 100 : 0;
      const persenReal = Math.min(persen, 100);
      return {
        kpi_id: kpi.kpi_id,
        nilai_real: real,
        persen_real: persenReal,
      };
    });

    const payload = {
      user_id: form.karyawanId ? Number(form.karyawanId) : null,
      user_id_acc: user?.user_id,
      periode: form.tanggal,
      details,
    };

    try {
      await add(payload);
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
      id: e.user_id,
      label: `${e.fullname} (${
        divisions.find((d) => d.divisi_id === e.divisi_id)?.name || "-"
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
            {user.role === "admin" && (
              <button
                onClick={() => setShowForm(true)}
                className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm"
              >
                + Tambah Penilaian
              </button>
            )}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-xl">
            {user?.role === "superadmin" && (
              <div className="mt-6">
                <h3 className="font-semibold mb-2">Filter</h3>
                <div className="max-w-xs">
                  <select
                    value={fDivisi}
                    onChange={(e) => setFDivisi(e.target.value)}
                    className="border rounded-xl px-3 py-2"
                  >
                    <option value="">Semua Divisi</option>
                    {divisiOptions.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tabel Penilaian */}
        <div className="mt-6">
          <h3 className="font-semibold mb-2">Tabel Penilaian KPI</h3>
          <div className="overflow-x-auto">
            <table className="w-full border text-sm text-center">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border p-2">No</th>
                  <th className="border p-2">Nama Karyawan</th>
                  <th className="border p-2">Divisi</th>
                  <th className="border p-2">Nilai Akhir</th>
                  <th className="border p-2">Persen Akhir</th>
                  <th className="border p-2">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, idx) => (
                  <tr key={r.history_id}>
                    <td className="border p-2">{idx + 1}</td>
                    <td className="border p-2">{r.fullname}</td>
                    <td className="border p-2">
                      {getDivisiName(r.divisi_id) || "-"}
                    </td>
                    <td className="border p-2">{r.nilai_akhir}</td>
                    <td className="border p-2">{r.persen_akhir}%</td>
                    <td className="border p-2 whitespace-nowrap">
                      <button
                        onClick={async () => {
                          const data = await useHistoryKpiStore
                            .getState()
                            .detail(r.history_id);
                          setDetail(data);
                        }}
                        className="px-2 py-1 bg-blue-500 text-white rounded"
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-gray-500 py-4">
                      Tidak ada data.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Penilaian */}
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
              onChange={
                (e) =>
                  setForm({
                    ...form,
                    karyawanId: e.target.value ? Number(e.target.value) : null,
                  }) // <-- parse number
              }
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
              kpis.map((kpi) => {
                const currentValue = form.nilai[kpi.kpi_id] ?? "";
                return (
                  <div
                    key={kpi.kpi_id}
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
                      value={currentValue}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          nilai: {
                            ...prev.nilai,
                            [kpi.kpi_id]: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                );
              })
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
        size="lg"
      >
        {detail && (
          <div>
            <h3 className="font-semibold mb-2">
              {employees.find((e) => e.user_id === detail.user_id)?.fullname} -{" "}
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
