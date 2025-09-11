import { create } from "zustand";
import axios from "../auth/axiosInstance";

const useKpiStore = create((set, get) => ({
  kpis: [],
  loading: false,
  error: null,

  fetchKpis: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const res = await axios.get("/master-kpi", { params });
      set({ kpis: res.data, loading: false });
    } catch (err) {
      console.error(err);
      set({
        error: err.response?.data?.message || "Gagal mengambil data",
        loading: false,
      });
    }
  },

  addKpi: async (data) => {
    try {
      const res = await axios.post("/master-kpi", data);
      await get().fetchKpis();
      return res.data;
    } catch (err) {
      throw err.response?.data || { message: "Gagal menambah KPI" };
    }
  },

  updateKpi: async (id, data) => {
    try {
      await axios.put(`/master-kpi/${id}`, data);
      await get().fetchKpis();
    } catch (err) {
      throw err.response?.data || { message: "Gagal mengupdate KPI" };
    }
  },

  deleteKpi: async (id) => {
    try {
      await axios.delete(`/master-kpi/${id}`);
      await get().fetchKpis();
    } catch (err) {
      throw err.response?.data || { message: "Gagal menghapus KPI" };
    }
  },
}));

export default useKpiStore;
