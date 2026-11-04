import axios from "axios";

export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001/api";

axios.interceptors.request.use((config) => {
  const token = localStorage.getItem("engmaster-token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, (error) => Promise.reject(error));

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    const isFormData = typeof FormData !== "undefined" && config?.data instanceof FormData;
    // Tự động thử lại khi Render đang khởi động (Cold Start) cho các request thông thường (KHÔNG retry file upload lớn)
    if (config && !isFormData && (!error.response || [502, 503, 504].includes(error.response.status))) {
      config._retryCount = (config._retryCount || 0) + 1;
      if (config._retryCount <= 3) {
        console.warn(`[API Retry ${config._retryCount}/3] Đang thử kết nối lại do server đang khởi động...`);
        await new Promise(resolve => setTimeout(resolve, 2000 * config._retryCount));
        return axios(config);
      }
    }

    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem("engmaster-token");
      localStorage.removeItem("engmaster-user");
      window.dispatchEvent(new Event("auth-expired"));
    }
    return Promise.reject(error);
  }
);

export default axios;
