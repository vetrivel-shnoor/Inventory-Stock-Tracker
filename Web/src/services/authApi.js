import api from "./api";
import toast from "react-hot-toast";

export async function loginUser(email, password) {
  try {
    const response = await api.post("/auth/login", { email, password });
    toast.success(response.data.message || "Login Successful!");
    return {
      success: true,
      user: response.data.user,
      message: response.data.message,
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || "Login failed.",
    };
  }
}

export async function SignUp(name, email, password, confirmPassword) {
  if (password !== confirmPassword) {
    toast.error("Passwords do not match!");
    return { success: false, message: "Passwords do not match" };
  }

  try {
    const response = await api.post("/auth/signup", {
      fullname: name,
      username: email.split("@")[0],
      email,
      password,
      confirmPassword,
    });
    toast.success(response.data.message || "Account created successfully!");
    return {
      success: true,
      user: response.data.user,
      message: response.data.message,
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || "Signup failed.",
    };
  }
}

export async function checkAuth() {
  try {
    const response = await api.get("/auth/me");
    return {
      isAuthenticated: true,
      user: response.data.user,
    };
  } catch (error) {
    if (error.response && error.response.status === 401) {
      return {
        isAuthenticated: false,
        user: null,
      };
    }
    throw error;
  }
}

export async function logout() {
  try {
    await api.get("/auth/logout");
    toast.success("Logged out successfully");
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}

export async function ResetPassword(email) {
  try {
    await api.post("/auth/reset-password", { email });
    toast.success("Email sent successfully!");
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}

export async function googleOneTapLogin(token) {
  try {
    const response = await api.post("/auth/google/onetap", { token });
    toast.success(response.data.message || "Google Login Successful!");
    return {
      success: true,
      user: response.data.user,
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || "Google Login Failed",
    };
  }
}
