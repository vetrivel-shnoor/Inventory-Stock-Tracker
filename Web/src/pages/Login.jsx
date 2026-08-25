/**
 * Web/src/pages/Login.jsx
 * 
 * Renders the login page, allowing existing users to authenticate with their email and password,
 * or using Google OAuth.
 */
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { GOOGLE_AUTH_URL } from "../services/api";
import { loginUser } from "../services/authApi";
import { useApp } from "../context/Appcontext";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const { setUser } = useApp();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await loginUser(formData.email, formData.password);
    if (res.success) {
      setUser(res.user);
      navigate('/dashboard');
    }
    console.log("Login Data:", res);
  };

  // SVG Icons
  const EyeIcon = ({ visible }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="w-5 h-5 opacity-70 hover:opacity-100 transition-opacity text-[var(--color-text-secondary)]"
    >
      {visible ? (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
        />
      ) : (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
        />
      )}
      {visible && (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      )}
    </svg>
  );

  return (
    <div
      className="animate-in fade-in slide-in-from-bottom-4 duration-700"
    >
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 drop-shadow-sm text-[var(--color-text-primary)]">
          Welcome back
        </h1>
        <p className="text-sm font-medium text-[var(--color-text-secondary)]">
          Please enter your details to sign in.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest opacity-80 ml-3 text-[var(--color-text-primary)]">
            Email
          </label>
          <div className="relative group">
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full px-5 py-4 rounded-2xl outline-none bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] text-sm transition-all"
              placeholder="name@company.com"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest opacity-80 ml-3 text-[var(--color-text-primary)]">
            Password
          </label>
          <div className="relative group">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              className="w-full px-5 py-4 rounded-2xl outline-none bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] text-sm pr-12 transition-all"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 cursor-pointer z-10"
            >
              <EyeIcon visible={showPassword} />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs pt-1 px-1">
          <label className="flex items-center cursor-pointer group"></label>
          <Link
            to="/forgot-password"
            replace
            className="font-medium text-blue-500 hover:text-blue-400 transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          className="w-full py-3.5 mt-2 rounded-2xl font-bold text-xs tracking-widest uppercase transition-all duration-300 transform hover:-translate-y-0.5 active:scale-95 shadow-lg shadow-[var(--color-primary)]/20 bg-[var(--color-primary)] text-white hover:opacity-90"
        >
          Sign In
        </button>

        <div className="space-y-4 mt-6">
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-[var(--color-border-subtle)]"></div>
            <span className="flex-shrink-0 mx-3 text-[var(--color-text-secondary)] text-[10px] uppercase tracking-widest font-semibold">
              Or
            </span>
            <div className="flex-grow border-t border-[var(--color-border-subtle)]"></div>
          </div>
          <button
            onClick={() => (window.location.href = GOOGLE_AUTH_URL)}
            type="button"
            className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] font-medium text-sm transition-all duration-300 hover:bg-[var(--color-border-subtle)] active:scale-[0.98] text-[var(--color-text-primary)]"
          >
            <img
              src="https://www.svgrepo.com/show/475656/google-color.svg"
              alt="Google"
              className="h-4 w-4"
            />
            Continue with Google
          </button>
        </div>
      </form>

      <div className="mt-8 text-center">
        <p className="text-xs text-[var(--color-text-secondary)]">
          Don't have an account?{" "}
          <Link
            to="/signup"
            replace
            className="font-bold text-blue-500 hover:text-blue-400 transition-colors"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
