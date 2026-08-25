import "./App.css";
import { useContext, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

// CONTEXT
import { ThemeContext } from "./context/ThemeContext";
import { useApp } from "./context/Appcontext";

// COMPONENTS
import ScrollToTop from "./components/ScrollToTop";
import AuthLayout from "./components/layout/AuthLayout";
import { DashboardLayout } from "./components/layout/DashboardLayout";

// PAGES
import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import { MainLayout } from "./components/layout/MainLayout";
import ForgetPassword from "./pages/ForgetPassword";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Transactions from "./pages/Transactions";
import { UserManagement } from "./pages/UserManagement";
import AuditLogs from "./pages/AuditLogs";
// import GoogleOneTap from "./components/GoogleOneTap";

function App() {
  const { user } = useApp();
  const { theme } = useContext(ThemeContext);

  return (
    <>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: { background: "#333", color: "#fff" },
          success: { duration: 3000 },
        }}
      />

      <ScrollToTop />
      {/* {!user && <GoogleOneTap />} */}
      <Routes>
        {/* =============== AUTH ROUTES =============== */}
        <Route element={<AuthLayout />}>
          <Route
            path="/login"
            element={user ? <Navigate to="/dashboard" replace /> : <Login />}
          />
          <Route
            path="/signup"
            element={user ? <Navigate to="/dashboard" replace /> : <Signup />}
          />
          <Route
            path="/forgot-password"
            element={user ? <Navigate to="/dashboard" replace /> : <ForgetPassword />}
          />
        </Route>

        {/* =============== MAIN APP ROUTES =============== */}
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route 
            path="/dashboard" 
            element={user ? <Dashboard /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/products" 
            element={user ? <Products /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/transactions" 
            element={user ? <Transactions /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/users" 
            element={user?.role === 'superadmin' ? <UserManagement /> : <Navigate to="/dashboard" replace />} 
          />
          <Route 
            path="/audit-logs" 
            element={user?.role === 'superadmin' ? <AuditLogs /> : <Navigate to="/dashboard" replace />} 
          />
          <Route
            path="/profile"
            element={user ? <Profile /> : <Navigate to="/login" replace />}
          />
        </Route>

        {/* =============== PUBLIC / LEGACY ROUTES =============== */}
        <Route element={<MainLayout />}>
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        {/* =============================================== */}
      </Routes>
    </>
  );
}

export default App;
