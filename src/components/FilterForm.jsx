import { useState } from "react";

export default function FilterForm({ onFilter }) {
  const [divisi, setDivisi] = useState("");
  const [periode, setPeriode] = useState("2025-Q3");

  function apply() {
    onFilter?.({ divisi, periode });
  }

  return (
    <div className="card">
      <div className="card-body grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="text-xs text-gray-500">Divisi</label>
          <select className="w-full mt-1 border rounded-lg p-2" value={divisi} onChange={(e) => setDivisi(e.target.value)}>
            <option value="">Semua Divisi</option>
            <option>Produk</option>
            <option>Marketing</option>
            <option>Teknologi</option>
            <option>Operasional</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500">Periode</label>
          <select className="w-full mt-1 border rounded-lg p-2" value={periode} onChange={(e) => setPeriode(e.target.value)}>
            <option>2025-Q1</option>
            <option>2025-Q2</option>
            <option>2025-Q3</option>
            <option>2025-Q4</option>
          </select>
        </div>
        <div className="flex items-end">
          <button onClick={apply} className="px-4 py-2 bg-black text-white rounded-xl">Terapkan</button>
        </div>
      </div>
    </div>
  );
}
