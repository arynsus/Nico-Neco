import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { clearSession } from '../auth';
import { useAuth } from '../hooks/useAuth';

const navItems = [
  { to: '/', icon: 'dashboard', label: 'Dashboard' },
  { to: '/sources', icon: 'cloud_sync', label: 'Sources' },
  { to: '/users', icon: 'group', label: 'Users' },
  { to: '/tiers', icon: 'coffee', label: 'Tiers' },
  { to: '/rules', icon: 'route', label: 'Routing' },
  { to: '/settings', icon: 'settings', label: 'Settings' },
];

function Icon({ name, filled }: { name: string; filled?: boolean }) {
  return (
    <span
      className="material-symbols-outlined"
      style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
    >
      {name}
    </span>
  );
}

export default function Layout() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col h-screen w-72 bg-stone-50 font-medium text-sm py-8 sticky top-0">
        <div className="px-8 mb-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-container rounded-full flex items-center justify-center text-primary">
            <Icon name="coffee" filled />
          </div>
          <div>
            <h1 className="text-xl font-black text-stone-800 leading-tight">NicoNeco</h1>
            <p className="text-[10px] uppercase tracking-widest text-secondary font-bold">
              Coffee & Connectivity
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-4 mx-4 px-4 py-3 rounded-full transition-all duration-300 ${
                  isActive
                    ? 'bg-stone-200 text-orange-900 shadow-inner translate-x-1 font-semibold'
                    : 'text-stone-500 hover:bg-stone-200/50'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon name={item.icon} filled={isActive} />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 mt-auto pt-6 border-t border-stone-200/30">
          <button
            onClick={handleLogout}
            className="flex items-center gap-4 text-stone-500 mx-4 px-4 py-3 hover:bg-stone-200/50 rounded-full transition-all w-full"
          >
            <Icon name="logout" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 flex flex-col min-w-0 bg-surface">
        {/* Top bar */}
        <header className="sticky top-0 z-50 flex justify-between items-center px-6 h-20 glass-header shadow-sm">
          <div className="flex items-center gap-8">
            <span className="text-2xl font-bold text-stone-800 italic md:hidden">
              NicoNeco
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button className="btn-ghost">
              <Icon name="notifications" />
            </button>
            <button className="btn-ghost">
              <Icon name="settings" />
            </button>
            <div className="h-10 w-10 rounded-full border-2 border-primary-container shadow-sm bg-primary-container flex items-center justify-center text-primary font-bold">
              {user?.username?.[0]?.toUpperCase() || 'A'}
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 mt-0 p-6 lg:p-10 max-w-7xl mx-auto w-full">
          <Outlet />
        </div>
      </main>

      {/* Mobile nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-white/95 backdrop-blur-xl shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.1)] flex justify-around items-center px-4 z-50">
        {navItems.slice(0, 4).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 ${
                isActive ? 'text-orange-900 font-semibold' : 'text-stone-500'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon name={item.icon} filled={isActive} />
                <span className="text-[10px] font-bold">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
