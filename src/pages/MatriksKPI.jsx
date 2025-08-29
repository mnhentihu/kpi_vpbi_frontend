import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";

const LS_METRICS = "kpi-metrics";
const LS_DIVISI = "kpi-divisions";

// id aman (fallback)
const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

// seed contoh (sesuai desain)
const seed = [
  { id: uid(), nama: "Pertumbuhan Penjualan", bobot: 30, kategori: "Penjualan" },
  { id: uid(), nama: "Kepuasan Pelanggan", bobot: 25, kategori: "Layanan Pelanggan" },
  { id: uid(), nama: "Efisiensi Operasional", bobot: 20, kategori: "Operasi" },
  { id: uid(), nama: "Keterlibatan Karyawan", bobot: 15, kategori: "Sumber Daya Manusia" },
  { id: uid(), nama: "Inovasi Produk", bobot: 10, kategori: "Penelitian dan Pengembangan" },
];

export default function MatriksKPI() {
  const nav = useNavigate();

  // ===== Data =====
  const [rows, setRows] = useState([]);
  useEffect(() => {
    const saved = localStorage.getItem(LS_METRICS);
    if (saved) setRows(JSON.parse(saved));
    else {
      setRows(seed);
      localStorage.setItem(LS_METRICS, JSON.stringify(seed));
    }
  }, []);
  useEffect(() => {
    localStorage.setItem(LS_METRICS, JSON.stringify(rows));
  }, [rows]);

  // kategori (ambil dari Divisi kalau ada)
  const kategoriOptions = useMemo(() => {
    try {
      const raw = localStorage.getItem(LS_DIVISI);
      const divisi = raw ? JSON.parse(raw) : [];
      const names = Array.from(new Set(divisi.map((d) => d.nama).filter(Boolean)));
      if (names.length) return [...names, "Lainnya"];
    } catch {}
    return [
      "Penjualan",
      "Layanan Pelanggan",
      "Operasi",
      "Sumber Daya Manusia",
      "Penelitian dan Pengembangan",
      "Lainnya",
    ];
  }, [rows]);

  // ===== Search & Pagination =====
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        !s ||
        r.nama.toLowerCase().includes(s) ||
        (r.kategori || "").toLowerCase().includes(s)
    );
  }, [rows, q]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  useEffect(() => setPage(1), [q, pageSize]);

  // ===== Form Tambah/Edit =====
  const [editing, setEditing] = useState(null); // row | null
  const [form, setForm] = useState({ nama: "", bobot: "", kategori: "" });
  const [err, setErr] = useState({});
  const titleBtn = editing ? "Simpan Perubahan" : "Tambahkan Matriks";

  const totalBobotAll = useMemo(
    () => rows.reduce((a, r) => a + (Number(r.bobot) || 0), 0),
    [rows]
  );
  const totalTanpaCurrent = useMemo(() => {
    const id = editing?.id;
    return rows.reduce(
      (acc, r) => acc + (id && r.id === id ? 0 : Number(r.bobot) || 0),
      0
    );
  }, [rows, editing]);
  const bobotInput = Number(form.bobot) || 0;
  const totalSetelah = totalTanpaCurrent + bobotInput;
  const sisaAll = Math.max(0, 100 - totalBobotAll);

  function resetForm() {
    setEditing(null);
    setForm({ nama: "", bobot: "", kategori: "" });
    setErr({});
  }
  function onEdit(row) {
    setEditing(row);
    setForm({ nama: row.nama, bobot: String(row.bobot), kategori: row.kategori });
    setErr({});
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  function validate() {
    const e = {};
    const nama = (form.nama || "").trim();
    const bobot = Number(form.bobot);
    const kategori = (form.kategori || "").trim();

    if (!nama) e.nama = "Nama matriks wajib diisi";
    // unik by nama (case-insensitive)
    const dupe = rows.some(
      (r) => r.nama.trim().toLowerCase() === nama.toLowerCase() && r.id !== editing?.id
    );
    if (!e.nama && dupe) e.nama = "Nama matriks sudah ada";

    if (Number.isNaN(bobot) || form.bobot === "") e.bobot = "Bobot wajib diisi";
    else if (bobot < 0 || bobot > 100) e.bobot = "Bobot harus 0–100";
    else if (totalTanpaCurrent + bobot > 100)
      e.bobot = `Total bobot melebihi 100% (sisa ${Math.max(
        0,
        100 - totalTanpaCurrent
      )}%)`;

    if (!kategori) e.kategori = "Kategori wajib dipilih/diisi";

    setErr(e);
    return Object.keys(e).length === 0;
  }

  function submit(e) {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      id: editing ? editing.id : uid(),
      nama: form.nama.trim(),
      bobot: Number(form.bobot),
      kategori: form.kategori.trim(),
    };

    if (editing) {
      setRows((prev) => prev.map((r) => (r.id === editing.id ? payload : r)));
    } else {
      setRows((prev) => [...prev, payload]);
    }
    resetForm();
  }

  function remove(row) {
    if (!confirm(`Hapus matriks: ${row.nama}?`)) return;
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    if (editing?.id === row.id) resetForm();
  }

  // ===== Import / Export =====
  const fileRef = useRef(null);

  function exportExcel() {
    const exportRows = filtered.map(({ id, ...r }) => r);
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MatriksKPI");
    XLSX.writeFile(wb, "matriks-kpi.xlsx");
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
            for (const k of keys) {
              if (r[k] != null && String(r[k]).trim() !== "") return String(r[k]).trim();
            }
            return "";
          };
          const nm = get("nama", "Nama", "metric", "Metrik", "Matriks");
          const bb = Number(get("bobot", "Bobot", "weight", "Weight"));
          const kt = get("kategori", "Kategori", "category", "Category");

          return { id: uid(), nama: nm, bobot: bb, kategori: kt };
        };

        // proses satu-per-satu dengan validasi + kontrol total <= 100
        let added = 0;
        let skipped = 0;
        let totalNow = rows.reduce((a, r) => a + (Number(r.bobot) || 0), 0);
        const existingNames = new Set(rows.map((r) => r.nama.trim().toLowerCase()));
        const toAdd = [];

        for (const rec of json.map(mapRow)) {
          const nm = (rec.nama || "").trim();
          const bb = Number(rec.bobot);
          const kt = (rec.kategori || "").trim();

          const valid =
            nm &&
            !Number.isNaN(bb) &&
            bb >= 0 &&
            bb <= 100 &&
            kt &&
            !existingNames.has(nm.toLowerCase()) &&
            totalNow + bb <= 100;

          if (valid) {
            toAdd.push({ id: uid(), nama: nm, bobot: bb, kategori: kt });
            existingNames.add(nm.toLowerCase());
            totalNow += bb;
            added++;
          } else {
            skipped++;
          }
        }

        if (toAdd.length) setRows((prev) => [...prev, ...toAdd]);
        alert(
          `Import selesai. Ditambahkan: ${added} item. Dilewati: ${skipped} (duplikat/nama kosong/bobot tidak valid/total > 100%).`
        );
      } catch (err) {
        console.error(err);
        alert("Gagal import. Pastikan ada kolom: nama, bobot, kategori.");
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
          <div>
            <h1 className="text-2xl font-bold">Konfigurasi Matriks KPI</h1>
            <p className="text-sm text-gray-500 mt-1">
              Kelola dan konfigurasi matriks KPI untuk organisasi Anda.
            </p>
          </div>
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
              onClick={() => nav("/")}
              className="px-3 py-2 rounded-lg border bg-gray-100 hover:bg-gray-200 text-sm"
            >
              Kembali ke Dasbor
            </button>
          </div>
        </div>

        {/* Toolbar: Search & PageSize + indikator total */}
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-xs text-gray-600">
            Total terpakai: <span className="font-medium">{totalBobotAll}%</span> • Sisa:{" "}
            <span className="font-medium">{Math.max(0, 100 - totalBobotAll)}%</span>
          </div>
          <div className="flex flex-col md:flex-row gap-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nama/kategori…"
              className="border rounded-xl px-3 py-2 w-full md:w-72"
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
        </div>

        {/* Tabel */}
        <div className="mt-4">
          <h3 className="font-semibold mb-2">Matriks KPI yang Ada</h3>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white">
                <tr className="text-left text-gray-600 border-b">
                  <th className="px-5 py-3">Nama</th>
                  <th className="px-5 py-3 w-32">Bobot</th>
                  <th className="px-5 py-3 w-56">Kategori</th>
                  <th className="px-5 py-3 w-28">Tindakan</th>
                </tr>
              </thead>
              <tbody>
                {pageData.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="px-5 py-4 text-gray-800">{r.nama}</td>
                    <td className="px-5 py-4">
                      <span className="text-blue-600">{r.bobot}%</span>
                    </td>
                    <td className="px-5 py-4 text-gray-700">{r.kategori}</td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <button onClick={() => onEdit(r)} className="text-blue-600 hover:underline">
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
                    <td colSpan={4} className="px-5 py-10 text-center text-gray-500">
                      Tidak ada matriks.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination */}
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

        {/* Form Tambah / Edit */}
        <div className="mt-8">
          <h3 className="font-semibold mb-3">Tambahkan Matriks KPI Baru</h3>
          <div className="card">
            <form onSubmit={submit} className="card-body space-y-4">
              <div>
                <label className="text-xs text-gray-600">Nama Matriks</label>
                <input
                  className={`mt-1 w-full border rounded-xl px-3 py-2 ${err.nama ? "border-red-400" : "border-gray-300"}`}
                  placeholder="Masukkan nama matriks"
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                />
                {err.nama && <p className="text-xs text-red-500 mt-1">{err.nama}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-600">Bobot (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className={`mt-1 w-full border rounded-xl px-3 py-2 ${err.bobot ? "border-red-400" : "border-gray-300"}`}
                    placeholder="Masukkan bobot"
                    value={form.bobot}
                    onChange={(e) =>
                      setForm({ ...form, bobot: e.target.value.replace(/[^0-9.]/g, "") })
                    }
                  />
                  <div className="mt-1 text-xs text-gray-500">
                    Total setelah simpan: {Math.min(100, totalSetelah)}% • Sisa:{" "}
                    {Math.max(0, 100 - totalSetelah)}%
                  </div>
                  {err.bobot && <p className="text-xs text-red-500 mt-1">{err.bobot}</p>}
                </div>

                <div>
                  <label className="text-xs text-gray-600">Kategori</label>
                  <select
                    className={`mt-1 w-full border rounded-xl px-3 py-2 ${err.kategori ? "border-red-400" : "border-gray-300"}`}
                    value={form.kategori}
                    onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                  >
                    <option value="">Pilih</option>
                    {kategoriOptions.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                  {err.kategori && <p className="text-xs text-red-500 mt-1">{err.kategori}</p>}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                {editing && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 rounded-lg border hover:bg-gray-50"
                  >
                    Batalkan Edit
                  </button>
                )}
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {titleBtn}
                </button>
              </div>
            </form>
          </div>

          {/* Hint total */}
          <div className="mt-3 text-xs text-gray-600">
            Total terpakai semua matriks saat ini: <b>{totalBobotAll}%</b>. Sisa:{" "}
            <b>{sisaAll}%</b>.
          </div>
        </div>
      </div>
    </div>
  );
}
