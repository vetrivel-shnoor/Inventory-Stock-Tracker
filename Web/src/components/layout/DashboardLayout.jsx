import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Home, Package, Activity, LogOut, Menu, X, Sun, Moon, Settings, Users, ShieldAlert } from 'lucide-react';
import { useApp } from '../../context/Appcontext';
import { ThemeContext } from '../../context/ThemeContext';
import toast from 'react-hot-toast';

import { logout } from '../../services/authApi';

/**
 * AvatarImage component displays the user's profile picture or a fallback initial.
 * It handles image loading states and gracefully falls back on error.
 */
const AvatarImage = ({ user }) => {
  const [blobLoaded, setBlobLoaded] = React.useState(false);
  const [imgError, setImgError] = React.useState(false);

  const baseUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : '';
  const profileSrc = user?.profilePicture?.startsWith('http') 
    ? user.profilePicture 
    : user?.profilePicture 
      ? `${baseUrl}${user.profilePicture}` 
      : null;
      
  const isDirectUrl = profileSrc?.startsWith("http") && !profileSrc.includes("localhost");

  React.useEffect(() => {
    setImgError(false);
    if (!isDirectUrl) setBlobLoaded(false);
  }, [profileSrc, isDirectUrl]);

  if (!profileSrc || imgError) {
    return (
      <span className="text-white font-bold text-sm z-10 relative">
        {user?.fullname?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'U'}
      </span>
    );
  }

  return (
    <>
      {(!isDirectUrl && !blobLoaded && !imgError && profileSrc) && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-gray-200/20 dark:bg-white/10 backdrop-blur-md animate-pulse" />
      )}
      <img
        src={profileSrc}
        alt="Avatar"
        referrerPolicy="no-referrer"
        className={`w-full h-full object-cover absolute inset-0 z-10 transition-opacity duration-300 ${
          isDirectUrl || blobLoaded ? "opacity-100" : "opacity-0"
        }`}
        onLoad={() => setBlobLoaded(true)}
        onError={() => {
          setImgError(true);
          setBlobLoaded(true);
        }}
      />
    </>
  );
};

/**
 * DashboardLayout component wraps the main application routes.
 * It provides the sidebar, mobile navigation, and common layout structure.
 * Employs a glassmorphic aesthetic to match the overall design system.
 */
export const DashboardLayout = () => {
  const { user, setUser } = useApp();
  const { theme, toggleTheme } = React.useContext(ThemeContext);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    const checkLowStock = async () => {
      try {
        const { inventoryApi } = await import('../../services/inventoryApi');
        const stats = await inventoryApi.getStats();
        if (stats.lowStockCount > 0) {
          toast.error(`${stats.lowStockCount} product(s) are running low on stock!`, {
            duration: 6000,
            icon: '⚠️'
          });
        }
      } catch (err) {
        console.error('Failed to check low stock:', err);
      }
    };
    checkLowStock();
  }, []);

  const handleLogout = async () => {
    const res = await logout();
    if (res.success) {
      setUser(null);
      navigate('/login');
    }
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: Home },
    { name: 'Products', path: '/products', icon: Package },
    { name: 'Transactions', path: '/transactions', icon: Activity },
    ...(user?.role === 'superadmin' ? [
      { name: 'Users', path: '/users', icon: Users },
      { name: 'Audit Logs', path: '/audit-logs', icon: ShieldAlert }
    ] : []),
    { name: 'Profile', path: '/profile', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-[var(--color-bg-base)] text-[var(--color-text-primary)] transition-colors duration-300 overflow-hidden relative">
      
      {/* Desktop Sidebar - Glassmorphic */}
      <aside className="hidden md:flex flex-col w-64 border-r border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] backdrop-blur-xl relative z-10">
        {/* Subtle overlay gradient to give glass depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent dark:from-white/5 dark:to-transparent pointer-events-none" />
        
        <div className="p-6 flex items-center justify-between border-b border-[var(--color-border-subtle)] relative z-10">
          <h1 className="text-xl font-bold tracking-tight text-[var(--color-primary)]">StockTracker</h1>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto relative z-10">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 font-medium ${
                  isActive
                    ? 'bg-gradient-to-r from-[var(--color-primary)] to-blue-500/80 text-white shadow-[0_4px_12px_rgba(37,99,235,0.3)] backdrop-blur-md'
                    : 'text-[var(--color-text-secondary)] hover:bg-white/40 dark:hover:bg-white/5 hover:text-[var(--color-text-primary)] hover:backdrop-blur-sm'
                }`
              }
            >
              <item.icon size={20} />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-[var(--color-border-subtle)] relative z-10">
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-tr from-[var(--color-primary)] to-blue-400 flex items-center justify-center text-white font-bold text-sm overflow-hidden border border-[var(--color-border-subtle)] relative shadow-sm">
                <AvatarImage user={user} />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold truncate max-w-[100px]">{user?.fullname || user?.username || 'User'}</span>
                <span className="text-xs text-[var(--color-text-secondary)] flex items-center gap-1">
                  <span className="px-1.5 py-0.5 rounded-full bg-[var(--color-border-subtle)] text-[10px] font-bold tracking-wider">
                    {user?.role?.toUpperCase() || 'USER'}
                  </span>
                </span>
              </div>
            </div>
            <button 
              onClick={toggleTheme} 
              className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-500/10 via-purple-500/15 to-blue-500/10 hover:from-indigo-500/25 hover:to-purple-500/25 dark:from-amber-500/20 dark:via-orange-500/20 dark:to-yellow-500/10 dark:hover:from-amber-500/35 dark:hover:to-orange-500/35 backdrop-blur-md border border-indigo-500/20 dark:border-amber-500/30 hover:scale-105 active:scale-95 shadow-[0_2px_12px_rgba(99,102,241,0.15)] dark:shadow-[0_2px_12px_rgba(251,191,36,0.2)] transition-all duration-300 flex items-center justify-center cursor-pointer shrink-0"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? (
                <Sun size={18} className="text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)] animate-in spin-in-90 duration-300" />
              ) : (
                <Moon size={18} className="text-indigo-600 dark:text-indigo-400 drop-shadow-[0_0_10px_rgba(79,70,229,0.5)] animate-in spin-in-[-90deg] duration-300" />
              )}
            </button>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-500 bg-red-50/50 dark:bg-red-900/10 hover:bg-red-100/80 dark:hover:bg-red-900/30 backdrop-blur-sm rounded-lg transition-all duration-300"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-transparent">
        {/* Mobile Top Header (Tablet/Mobile) - Glassmorphic */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[var(--color-bg-surface)] backdrop-blur-xl border-b border-[var(--color-border-subtle)] z-20">
          <h1 className="text-lg font-bold tracking-tight text-[var(--color-primary)]">StockTracker</h1>
          <div className="flex items-center gap-2">
             <button 
              onClick={toggleTheme} 
              className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-500/10 via-purple-500/15 to-blue-500/10 hover:from-indigo-500/25 hover:to-purple-500/25 dark:from-amber-500/20 dark:via-orange-500/20 dark:to-yellow-500/10 dark:hover:from-amber-500/35 dark:hover:to-orange-500/35 backdrop-blur-md border border-indigo-500/20 dark:border-amber-500/30 hover:scale-105 active:scale-95 shadow-[0_2px_12px_rgba(99,102,241,0.15)] dark:shadow-[0_2px_12px_rgba(251,191,36,0.2)] transition-all duration-300 flex items-center justify-center cursor-pointer shrink-0"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? (
                <Sun size={18} className="text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)] animate-in spin-in-90 duration-300" />
              ) : (
                <Moon size={18} className="text-indigo-600 dark:text-indigo-400 drop-shadow-[0_0_10px_rgba(79,70,229,0.5)] animate-in spin-in-[-90deg] duration-300" />
              )}
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[var(--color-primary)] to-blue-400 flex items-center justify-center text-white font-bold text-sm overflow-hidden relative border border-[var(--color-border-subtle)] shadow-sm">
              <AvatarImage user={user} />
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-transparent relative scroll-smooth pb-20 md:pb-8">
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation - Glassmorphic */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--color-bg-surface)] backdrop-blur-xl border-t border-[var(--color-border-subtle)] flex justify-around p-2 z-20 pb-safe">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center p-2 rounded-lg transition-colors ${
                  isActive
                    ? 'text-[var(--color-primary)]'
                    : 'text-[var(--color-text-secondary)]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={22} className={isActive ? 'drop-shadow-md' : ''} />
                  <span className="text-[10px] font-medium mt-1">{item.name}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
};
