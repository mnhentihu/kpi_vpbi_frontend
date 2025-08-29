import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "../components/Modal";

const LS_EMP = "kpi-employees";
const LS_DIV = "kpi-divisions";
const LS_EVAL = "kpi-evaluations";

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

// seed contoh awal
const seed = (employees) => {
  const pick = (name) => employees.find((e) => e.nama.toLowerCase().includes(name.toLowerCase()));
  const fmt = (d) => d; // YYYY-MM-DD already

  const s1 = pick("Sophia") || employees[0];
  const s2 = pick("Ethan") || employees[1];
  const s3 = pick("Olivia") || employees[2];
  const s4 = pick("Liam") || employees[3];
  const s5 = pick("Ava") || employees[4];

  const now = "2024-01-15";
  const items = [
    s1 && { id: uid(), karyawanId: s1.id, nama: s1.nama, divisi: s1.divisi, skor: 92, tanggal: fmt(now), status: "Selesai" },
    s2 && { id: uid(), karyawanId: s2.id, nama: s2.nama, divisi: s2.divisi, skor: 85, tanggal: fmt(now), status: "Selesai" },
    s3 && { id: uid(), karyawanId: s3.id, nama: s3.nama, divisi: s3.divisi, skor: 78, tanggal: fmt(now), status: "Selesai" },
    s4 && { id: uid(), karyawanId: s4.id, nama: s4.nama, divisi: s4.divisi, skor: 95, tanggal: fmt(now), status: "Selesai" },
    s5 && { id: uid(), karyawanId: s5.id, nama: s5.nama, divisi: s5.divisi, skor: 88, tanggal: fmt(now), status: "Selesai" },
  ].filter(Boolean);
  return items;
};

export default function Penilaian() {
  const nav = useNavigate();

  // ====== Master data: Karyawan & Divisi ======
  const [employees, setEmployees] = useState([]);
  const [divisions, setDivisions] = useState([]);

  useEffect(() => {
    try {
      const emp = JSON.parse(localStorage.getItem(LS_EMP) || "[]");
      const div = JSON.parse(localStorage.getItem(LS_DIV) || "[]");
      setEmployees(emp);
      setDivisions(div);
      // seed penilaian jika belum ada
      const saved = localStorage.getItem(LS_EVAL);
      if (!saved) {
        const seeded = seed(emp);
        localStorage.setItem(LS_EVAL, JSON.stringify(seeded));
      }
    } catch {}
  }, []);

  // ====== Data Penilaian ======
  const [rows, setRows] = useState([]);
  useEffect(() => {
    const saved = localStorage.getItem(LS_EVAL);
    setRows(saved ? JSON.parse(saved) : []);
  }, []);
  useEffect(() => {
    localStorage.setItem(LS_EVAL, JSON.stringify(rows));
  }, [rows]);

  // ====== Filter ======
  const [fDivisi, setFDivisi] = useState("");
  const [fStatus, setFStatus] = useState(""); // "", "Selesai", "Proses"

  const filtered = useMemo(() => {
    return rows
      .filter((r) => (!fDivisi ? true : r.divisi === fDivisi))
      .filter((r) => (!fStatus ? true : r.status === fStatus))
      .sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1)); // terbaru di atas
  }, [rows, fDivisi, fStatus]);

  // ====== Modal Detail ======
  const [detail, setDetail] = useState(null);

  // ====== Form Tambah ======
  const [form, setForm] = useState({ karyawanId: "", skor: "", tanggal: "" });
  const [err, setErr] = useState({});

  const empOptions = useMemo(
    () => employees.map((e) => ({ id: e.id, label: `${e.nama} (${e.divisi || "-"})`, divisi: e.divisi || "" })),
    [employees]
  );

  function validate() {
    const e = {};
    if (!form.karyawanId) e.karyawanId = "Pilih karyawan";
    const skor = Number(form.skor);
    if (form.skor === "" || Number.isNaN(skor)) e.skor = "Skor wajib diisi";
    else if (skor < 0 || skor > 100) e.skor = "Skor 0–100";
    if (!form.tanggal) e.tanggal = "Tanggal wajib diisi";
    setErr(e);
    return Object.keys(e).length === 0;
  }

  function submit(e) {
    e.preventDefault();
    if (!validate()) return;

    const emp = employees.find((x) => x.id === form.karyawanId);
    if (!emp) return;

    const payload = {
      id: uid(),
      karyawanId: emp.id,
      nama: emp.nama,
      divisi: emp.divisi || "",
      skor: Number(form.skor),
      tanggal: form.tanggal, // YYYY-MM-DD
      status: "Selesai", // sesuai desain semua "Selesai"
    };
    setRows((prev) => [payload, ...prev]);
    setForm({ karyawanId: "", skor: "", tanggal: "" });
    setErr({});
  }

  function remove(row) {
    if (!confirm(`Hapus penilaian ${row.nama} (${row.tanggal})?`)) return;
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    if (detail?.id === row.id) setDetail(null);
  }

  const divisiOptions = useMemo(
    () => Array.from(new Set(divisions.map((d) => d.nama).filter(Boolean))),
    [divisions]
  );

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Penilaian KPI</h1>
            <p className="text-sm text-gray-500 mt-1">Lacak dan kelola kinerja karyawan</p>
          </div>
          <button
            onClick={() => nav("/")}
            className="px-3 py-2 rounded-lg border bg-gray-100 hover:bg-gray-200 text-sm"
          >
            Kembali ke Dasbor
          </button>
        </div>

        {/* Filter */}
        <div className="mt-6">
          <h3 className="font-semibold mb-2">Filter</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-xl">
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
                  <th className="px-5 py-3 w-28">Skor KPI</th>
                  <th className="px-5 py-3 w-40">Tanggal Penilaian</th>
                  <th className="px-5 py-3 w-28">Status</th>
                  <th className="px-5 py-3 w-32">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="px-5 py-4 text-gray-800">{r.nama}</td>
                    <td className="px-5 py-4">
                      <button className="text-blue-600 hover:underline">{r.divisi || "-"}</button>
                    </td>
                    <td className="px-5 py-4">{r.skor}</td>
                    <td className="px-5 py-4">{r.tanggal}</td>
                    <td className="px-5 py-4">
                      <span className="px-2 py-1 rounded-full text-xs bg-gray-100 border text-gray-700">
                        {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <button
                        onClick={() => setDetail(r)}
                        className="text-blue-600 hover:underline"
                      >
                        Lihat Detail
                      </button>
                      <span className="mx-2 text-gray-300">|</span>
                      <button
                        onClick={() => remove(r)}
                        className="text-gray-600 hover:underline"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-gray-500">
                      Tidak ada data.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Form Tambah */}
        <div className="mt-8 max-w-xl">
          <h3 className="font-semibold mb-3">Tambah Penilaian Baru</h3>
          <div className="card">
            <form onSubmit={submit} className="card-body space-y-4">
              <div>
                <label className="text-xs text-gray-600">Pilih Karyawan</label>
                <select
                  className={`mt-1 w-full border rounded-xl px-3 py-2 ${err.karyawanId ? "border-red-400" : "border-gray-300"}`}
                  value={form.karyawanId}
                  onChange={(e) => setForm({ ...form, karyawanId: e.target.value })}
                >
                  <option value="">Pilih</option>
                  {empOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {err.karyawanId && (
                  <p className="text-xs text-red-500 mt-1">{err.karyawanId}</p>
                )}
              </div>

              <div>
                <label className="text-xs text-gray-600">Skor KPI</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className={`mt-1 w-full border rounded-xl px-3 py-2 ${err.skor ? "border-red-400" : "border-gray-300"}`}
                  placeholder="Skor"
                  value={form.skor}
                  onChange={(e) =>
                    setForm({ ...form, skor: e.target.value.replace(/[^0-9.]/g, "") })
                  }
                />
                {err.skor && <p className="text-xs text-red-500 mt-1">{err.skor}</p>}
              </div>

              <div>
                <label className="text-xs text-gray-600">Tanggal Penilaian</label>
                <input
                  type="date"
                  className={`mt-1 w-full border rounded-xl px-3 py-2 ${err.tanggal ? "border-red-400" : "border-gray-300"}`}
                  value={form.tanggal}
                  onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                />
                {err.tanggal && <p className="text-xs text-red-500 mt-1">{err.tanggal}</p>}
              </div>

              <div className="flex items-center justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Tambah Penilaian
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

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
              <span className="font-medium">{detail.nama}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Divisi</span>
              <span className="font-medium">{detail.divisi || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Skor</span>
              <span className="font-medium">{detail.skor}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Tanggal</span>
              <span className="font-medium">{detail.tanggal}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <span className="font-medium">{detail.status}</span>
            </div>
            <p className="text-xs text-gray-500 pt-3">
              *Rincian per-metrik bisa ditambahkan nanti jika diperlukan.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
