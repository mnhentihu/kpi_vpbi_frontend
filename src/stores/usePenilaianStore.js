import { create } from "zustand";
import axios from "../auth/axiosInstance";

export const usePenilaianStore = create((set, get) => ({
  rows: [],
  loading: false,
  error: null,

  fetchAll: async () => {
    set({ loading: true, error: null });
    try {
      const res = await axios.get("/history-kpi"); // sesuai router backend
      set({ rows: res.data, loading: false });
    } catch (err) {
      set({
        error: err.response?.data?.message || err.message,
        loading: false,
      });
    }
  },

  fetchById: async (id) => {
    try {
      const res = await axios.get(`/history-kpi/${id}`);
      return res.data;
    } catch (err) {
      throw err.response?.data || { message: err.message };
    }
  },

  add: async (data) => {
    try {
      const res = await axios.post("/history-kpi", data);
      await get().fetchAll();
      return res.data;
    } catch (err) {
      throw err.response?.data || { message: err.message };
    }
  },
}));
