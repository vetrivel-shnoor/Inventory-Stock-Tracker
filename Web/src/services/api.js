import axios from "axios";
import toast from "react-hot-toast";

// 1. Configuration Constants
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
export const GOOGLE_AUTH_URL = `${API_URL}/auth/google`;

// 2. Create Axios Instance
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// 3. Response Interceptor (Global Error Handling)
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // ==============================================================
    // 🛑 SILENT ROUTES: Don't show popups for these endpoints
    // ==============================================================
    const silentRoutes = ["/auth/me", "/gallery"];

    // Check if the current request URL matches any silent route
    if (
      error.config &&
      silentRoutes.some((route) => error.config.url.includes(route))
    ) {
      return Promise.reject(error);
    }
    // ==============================================================

    // A. Network / Connection Errors
    if (!error.response) {
      toast.error("Network Error - Is the Network available?");
      return Promise.reject(error);
    }

    // B. Extract message
    const { status, data } = error.response;
    const backendMessage = data?.message || "An unexpected error occurred.";

    // C. Handle specific status codes
    if (status === 401) {
      toast.error(backendMessage);

      setTimeout(() => {
        // Prevent redirect loop if already on login page
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }, 1000);
    } else if (status === 403) {
      toast.error(backendMessage);
    } else if (status === 404) {
      toast.error(backendMessage);
    } else if (status >= 500) {
      toast.error(backendMessage);
    } else {
      toast.error(backendMessage);
    }

    return Promise.reject(error);
  }
);

// 4. Exporting only the api instance for modular API files
export default api;
