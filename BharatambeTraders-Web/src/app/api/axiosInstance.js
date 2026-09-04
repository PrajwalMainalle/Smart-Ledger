import axios from "axios";

const getFallbackApiUrl = () => {
  if (typeof window !== "undefined" && window.location.hostname) {
    const host = window.location.hostname;
    if (host !== "localhost" && host !== "127.0.0.1") {
      return `http://${host}:5000/api`;
    }
  }
  return "http://localhost:5000/api";
};

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || getFallbackApiUrl(),
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to attach JWT token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("bt_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiry
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear storage and redirect on unauthorized
      localStorage.removeItem("bt_token");
      localStorage.removeItem("bt_user");
      if (window.location.pathname !== "/") {
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
