// stores/useDivisiStore.js
import { create } from "zustand";
import axios from "../auth/axiosInstance";

export const useDivisiStore = create((set, get) => ({
  rows: [],
  loading: false,
  error: null,

  fetchAll: async () => {
    set({ loading: true, error: null });
    try {
      const res = await axios.get("/divisi");
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
      const res = await axios.post("/divisi", data);
      await get().fetchAll();
      return res.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message);
    }
  },

  update: async (id, data) => {
    try {
      await axios.put(`/divisi/${id}`, data);
      await get().fetchAll();
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message);
    }
  },

  remove: async (id) => {
    try {
      await axios.delete(`/divisi/${id}`);
      await get().fetchAll();
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message);
    }
  },

  // 🔹 helper untuk ambil nama divisi by ID
  getDivisiName: (id) => {
    const rows = get().rows;
    return rows.find((d) => d.divisi_id === id)?.name || "-";
  },
}));
