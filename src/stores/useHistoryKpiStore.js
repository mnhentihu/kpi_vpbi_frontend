// stores/useHistoryKpiStore.js
import { create } from "zustand";
import axios from "../auth/axiosInstance";

const useHistoryKpiStore = create((set, get) => ({
  rows: [], // ✅ default array kosong
  total: 0,
  isLoading: false, // ✅ lebih semantik daripada "loading"
  error: null,
  selectedDetail: null, // ✅ bisa dipakai untuk caching detail

  // Fetch semua KPI history
  fetchAll: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const res = await axios.get("/history-kpi", { params });
      console.log("fetchAll response:", res.data);

      const rows = Array.isArray(res.data.data) ? res.data.data : [];
      const total = res.data.total || rows.length;

      set({
        rows,
        total,
        isLoading: false,
      });
    } catch (err) {
      set({
        rows: [],
        total: 0,
        error: err.response?.data?.message || err.message,
        isLoading: false,
      });
    }
  },

  // Tambah data KPI history
  add: async (data) => {
    try {
      const res = await axios.post("/history-kpi", data);
      await get().fetchAll();
      return res.data;
    } catch (err) {
      throw err.response?.data || { message: "Gagal menambah history" };
    }
  },

  // Ambil detail KPI tertentu
  detail: async (id) => {
    set({ isLoading: true, error: null, selectedDetail: null });
    try {
      const res = await axios.get(`/history-kpi/${id}`);
      set({ selectedDetail: res.data.data, isLoading: false });
      return res.data.data;
    } catch (err) {
      set({
        selectedDetail: null,
        error: err.response?.data?.message || err.message,
        isLoading: false,
      });
      throw err.response?.data || { message: "Gagal mengambil detail" };
    }
  },

  // Reset detail (misal saat modal ditutup)
  resetDetail: () => set({ selectedDetail: null }),
}));

export default useHistoryKpiStore;
