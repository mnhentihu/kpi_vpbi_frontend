import { create } from "zustand";
import { devtools } from "zustand/middleware";
import API from "../auth/axiosInstance";

export const useKaryawanStore = create()(
  devtools((set, get) => ({
    rows: [],
    loading: false,
    error: null,

    // Fetch semua karyawan
    fetchAll: async () => {
      set({ loading: true, error: null });
      try {
        const res = await API.get("/karyawan");
        set({ rows: res.data, loading: false });
      } catch (err) {
        set({
          error: err.response?.data?.message || err.message,
          loading: false,
        });
      }
    },

    // Tambah karyawan
    add: async (data) => {
      try {
        const res = await API.post("/karyawan/add", data);
        await get().fetchAll();
        return res.data;
      } catch (err) {
        throw err.response?.data || { message: err.message };
      }
    },

    // Update karyawan
    update: async (id, data) => {
      try {
        await API.put(`/karyawan/update/${id}`, data);
        await get().fetchAll();
      } catch (err) {
        throw err.response?.data || { message: err.message };
      }
    },

    // Hapus karyawan
    remove: async (id) => {
      try {
        await API.delete(`/karyawan/delete/${id}`);
        await get().fetchAll();
      } catch (err) {
        throw err.response?.data || { message: err.message };
      }
    },
  }))
);
