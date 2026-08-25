import api from "./api";
import toast from "react-hot-toast";

export async function UpdatePersonalInfo(data) {
  try {
    const res = await api.put("/profile/info", data);
    toast.success(res.data?.message || "Profile updated successfully!");
    return {
      success: true,
      user: res.data?.user,
      message: res.data?.message,
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || "Update failed",
    };
  }
}

export async function uploadProfileImage(file) {
  try {
    const formData = new FormData();
    formData.append("image", file);

    const res = await api.post("/profile/profile-image", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    toast.success(res.data?.message || "Upload started! Updating soon...");
    return {
      success: true,
      message: res.data?.message,
    };
  } catch (error) {
    console.error("Profile Upload Error:", error);
    return {
      success: false,
      message: error.response?.data?.message || "Upload failed",
    };
  }
}
