import axios from "axios";
import { apiUrl } from "../config/env";

const api = axios.create({
  baseURL: apiUrl,
  withCredentials: true,
});

export const setupInterceptors = (
  showToast: (message: string, type: "error" | "info") => void
) => {
  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const status = error.response?.status;
      const originalRequest = error.config;

      if (status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          await api.get("/auth/refresh", { withCredentials: true });
          return api(originalRequest);
        } catch {
          showToast("Session expired. Please log in again.", "error");
          setTimeout(() => { window.location.href = "/"; }, 1500);
          return Promise.reject(error);
        }
      }

      if (status !== 401) {
        const detail = error.response?.data?.detail ?? error.message ?? "Something went wrong";
        showToast(detail, "error");
      }

      return Promise.reject(error);
    }
  );
};

export default api;