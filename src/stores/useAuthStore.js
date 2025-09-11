// stores/useAuthStore.js
import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "../auth/axiosInstance";

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null, // { user_id, fullname, role, divisi_id, token }
      loading: false, // untuk state loading auth

      // ===== LOGIN =====
      login: async (payload) => {
        set({ loading: true });
        try {
          const res = await api.post("/auth/login", payload);
          const data = res.data; // { user, token }
          set({ user: data.user, loading: false });
          localStorage.setItem("token", data.token);
          return data;
        } catch (err) {
          set({ loading: false });
          throw err;
        }
      },

      // ===== LOGOUT =====
      logout: () => {
        set({ user: null });
        localStorage.removeItem("token");
      },

      // ===== REQUEST RESET PASSWORD =====
      requestReset: async ({ email }) => {
        const res = await api.post("/auth/request-reset", { email });
        return res.data;
      },

      // ===== RESET PASSWORD =====
      resetPassword: async ({ token, password }) => {
        const res = await api.post("/auth/reset-password", {
          token,
          password,
        });
        return res.data;
      },

      // ===== UTIL =====
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null }),
    }),
    {
      name: "session",
    }
  )
);
