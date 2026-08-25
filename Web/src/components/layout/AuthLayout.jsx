import React, { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";

const AUTH_ROUTES = ["/login", "/signup", "/register", "/forgot-password"];
const LOG_KEY = "auth_route_log";

const slides = [
  {
    id: 1,
    url: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2070&auto=format&fit=crop",
    title: "Inventory Mastery",
    text: "Gain total control over your stock operations.",
  },
  {
    id: 2,
    url: "https://images.unsplash.com/photo-1553413077-190dd305871c?q=80&w=2070&auto=format&fit=crop",
    title: "Real-time Tracking",
    text: "Monitor assets and transactions instantly.",
  }
];

const AuthLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const pathname = location.pathname;
    let routeLog = JSON.parse(sessionStorage.getItem(LOG_KEY) || "[]");
    if (routeLog[routeLog.length - 1] !== pathname) {
      routeLog.push(pathname);
      if (routeLog.length > 100) routeLog.shift();
      sessionStorage.setItem(LOG_KEY, JSON.stringify(routeLog));
    }
  }, [location.pathname]);

  const smartBack = () => {
    let routeLog = JSON.parse(sessionStorage.getItem(LOG_KEY) || "[]");
    if (!routeLog.length) return navigate("/");
    const current = location.pathname;
    let target = "/";
    for (let i = routeLog.length - 2; i >= 0; i--) {
      const route = routeLog[i];
      const isAuth = AUTH_ROUTES.some((r) => route.toLowerCase().includes(r.toLowerCase()));
      if (route !== current && !isAuth) {
        target = route;
        break;
      }
    }
    navigate(target);
  };

  useEffect(() => {
    const handlePopState = (e) => {
      e.preventDefault();
      smartBack();
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((p) => (p + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative flex h-screen w-screen overflow-hidden transition-colors duration-300 bg-[var(--color-bg-base)]">
      <div className="absolute inset-0 w-full h-full overflow-hidden z-0 hidden lg:block">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentSlide ? "opacity-100" : "opacity-0"
            }`}
          >
            <img src={slide.url} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40" />
          </div>
        ))}
        
        {/* Soft gradient fade into the form side */}
        <div
          className="absolute inset-0 z-10 bg-gradient-to-r from-transparent via-black/20 to-[var(--color-bg-base)]"
        />

        <div className="absolute bottom-12 left-12 z-20 max-w-lg">
          <h2 className="text-4xl font-bold text-white mb-2 shadow-sm drop-shadow-md">
            {slides[currentSlide].title}
          </h2>
          <p className="text-gray-200 text-lg drop-shadow-md">{slides[currentSlide].text}</p>
        </div>
      </div>

      {/* Auth Form Container */}
      <div className="relative z-10 w-full h-full lg:w-1/2 lg:ml-auto flex flex-col justify-center px-6 sm:px-12 xl:px-24 bg-[var(--color-bg-base)] shadow-2xl">
        <div className="w-full max-w-md mx-auto lg:mx-0 lg:max-w-sm">
          {children || <Outlet />}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
