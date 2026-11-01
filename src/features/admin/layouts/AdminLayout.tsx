import type { ReactNode } from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Utensils,
  FolderKanban,
  Settings,
  ExternalLink,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../auth/hooks/useAuth';

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/products', label: 'Products', icon: Utensils, end: false },
  { to: '/admin/categories', label: 'Categories', icon: FolderKanban, end: false },
  { to: '/admin/settings', label: 'Settings', icon: Settings, end: false },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const { user, role, restaurantId, logout } = useAuth();

  return (
    <div className="flex min-h-dvh flex-col bg-stone-100/70 text-stone-900 lg:flex-row">
      {/* Sidebar */}
      <aside className="flex flex-col justify-between border-b border-stone-200 bg-white lg:w-64 lg:shrink-0 lg:border-r lg:border-b-0">
        <div>
          <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
            <Link to="/admin" className="flex items-center gap-2.5">
              <img src="/logo.svg" alt="Xutorok" className="h-8 w-auto" />
              <div>
                <span className="block text-sm font-bold text-stone-900">
                  Admin Console
                </span>
                <span className="block font-mono text-[11px] text-stone-500">
                  tenant: {restaurantId}
                </span>
              </div>
            </Link>

            <Link
              to="/menu"
              className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1 text-xs font-medium text-stone-600 hover:bg-stone-50 lg:hidden"
            >
              <span>Menu</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          <nav
            aria-label="Admin navigation"
            className="flex gap-1 overflow-x-auto p-3 lg:flex-col"
          >
            {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `inline-flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-amber-900 text-white'
                      : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="hidden border-t border-stone-100 p-4 lg:block space-y-3">
          <div className="rounded-xl bg-stone-50 p-3 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-stone-800">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>{role ?? 'Authorized Admin'}</span>
            </div>
            <p className="mt-1 truncate text-stone-500" title={user?.email ?? ''}>
              {user?.email ?? user?.uid}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/menu"
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
            >
              <span>Public Menu</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            <button
              type="button"
              onClick={() => void logout()}
              title="Sign Out"
              aria-label="Sign Out"
              className="inline-flex items-center justify-center rounded-xl border border-stone-200 bg-white p-2 text-stone-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}

