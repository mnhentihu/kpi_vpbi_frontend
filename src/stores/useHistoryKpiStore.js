// stores/useHistoryKpiStore.js
import { create } from "zustand";
import axios from "../auth/axiosInstance";

const useHistoryKpiStore = create((set, get) => ({
  rows: [],
  loading: false,
  error: null,

  fetchAll: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const res = await axios.get("/history-kpi", { params });
      set({ rows: res.data, loading: false });
    } catch (err) {
      set({
        error: err.response?.data?.message || err.message,
        loading: false,
      });
    }
  },

  add: async (data) => {
    try {
      const res = await axios.post("/history-kpi", data);
      await get().fetchAll();
      return res.data;
    } catch (err) {
      throw err.response?.data || { message: "Gagal menambah history" };
    }
  },

  detail: async (id) => {
    try {
      const res = await axios.get(`/history-kpi/${id}`);
      return res.data;
    } catch (err) {
      throw err.response?.data || { message: "Gagal mengambil detail" };
    }
  },
}));

export default useHistoryKpiStore;
