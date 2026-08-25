import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Home, Package, Activity, LogOut, Menu, X, Sun, Moon } from 'lucide-react';
import { useApp } from '../../context/Appcontext';
import { ThemeContext } from '../../context/ThemeContext';
import toast from 'react-hot-toast';

export const DashboardLayout = () => {
  const { user, dispatch } = useApp();
  const { theme, toggleTheme } = React.useContext(ThemeContext);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch({ type: 'LOGOUT' });
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: Home },
    { name: 'Products', path: '/products', icon: Package },
    { name: 'Transactions', path: '/transactions', icon: Activity },
  ];

  return (
    <div className="flex h-screen bg-[var(--color-bg-base)] text-[var(--color-text-primary)] transition-colors duration-300 overflow-hidden">
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
        <div className="p-6 flex items-center justify-between border-b border-[var(--color-border-subtle)]">
          <h1 className="text-xl font-bold tracking-tight text-[var(--color-primary)]">StockTracker</h1>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${
                  isActive
                    ? 'bg-[var(--color-primary)] text-white shadow-md'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-base)] hover:text-[var(--color-text-primary)]'
                }`
              }
            >
              <item.icon size={20} />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-[var(--color-border-subtle)]">
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[var(--color-primary)] to-blue-400 flex items-center justify-center text-white font-bold text-sm">
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold truncate max-w-[100px]">{user?.username || 'User'}</span>
                <span className="text-xs text-[var(--color-text-secondary)] flex items-center gap-1">
                  <span className="px-1.5 py-0.5 rounded-full bg-[var(--color-border-subtle)] text-[10px] font-bold tracking-wider">
                    {user?.role?.toUpperCase() || 'USER'}
                  </span>
                </span>
              </div>
            </div>
            <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-[var(--color-bg-base)] text-[var(--color-text-secondary)] transition-colors">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-500 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Top Header (Tablet/Mobile) */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[var(--color-bg-surface)] border-b border-[var(--color-border-subtle)] z-20">
          <h1 className="text-lg font-bold tracking-tight text-[var(--color-primary)]">StockTracker</h1>
          <div className="flex items-center gap-2">
             <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-[var(--color-bg-base)] text-[var(--color-text-secondary)]">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[var(--color-primary)] to-blue-400 flex items-center justify-center text-white font-bold text-sm">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-[var(--color-bg-base)] relative scroll-smooth pb-20 md:pb-8">
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--color-bg-surface)] border-t border-[var(--color-border-subtle)] flex justify-around p-2 z-20 pb-safe">
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
