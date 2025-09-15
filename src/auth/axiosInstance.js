import axios from "axios";
import { useAuthStore } from "../stores/useAuthStore";

const api = axios.create({
  baseURL: process.env.BACKEND_URL ||"http://localhost:5000/api", 
});

// Interceptor Request → Tambahin Authorization Header
api.interceptors.request.use(
  (config) => {
    // ambil token dari localStorage (diset di useAuthStore.login)
    const token = localStorage.getItem("token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor Response → Handle Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // clear state di zustand juga
      const { clearUser } = useAuthStore.getState();
      clearUser();
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
