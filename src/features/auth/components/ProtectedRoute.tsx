import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert, LogOut, RefreshCw, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const {
    user,
    loading,
    isAuthorizedAdmin,
    denialReason,
    restaurantId,
    logout,
    refreshPermissions,
  } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-stone-50 p-6">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-stone-300 border-t-amber-900" />
        <p className="mt-4 text-sm font-medium text-stone-600">
          Verifying administrator authorization for <span className="font-mono">{restaurantId}</span>...
        </p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (!isAuthorizedAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 p-6">
        <div className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3 text-red-700">
            <ShieldAlert className="h-8 w-8 shrink-0" />
            <h1 className="text-xl font-bold">Unauthorized Restaurant Access</h1>
          </div>

          <p className="mt-4 text-sm text-stone-700 leading-relaxed">
            You are signed in as <span className="font-semibold">{user.email ?? user.uid}</span>,
            but your account is not authorized to manage restaurant{' '}
            <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-xs font-semibold">
              {restaurantId}
            </code>
            .
          </p>

          {denialReason && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-950 leading-relaxed">
              <p className="font-semibold">Authorization Diagnostic:</p>
              <p className="mt-1 font-mono break-all">{denialReason}</p>
            </div>
          )}

          <div className="mt-4 rounded-xl bg-stone-50 p-4 text-xs text-stone-600 leading-relaxed">
            <p className="font-semibold text-stone-800">How to grant admin access in Firestore:</p>
            <p className="mt-1">
              Create document{' '}
              <code className="font-mono text-stone-900">
                restaurants/{restaurantId}/members/{user.uid}
              </code>{' '}
              with fields:
            </p>
            <pre className="mt-2 overflow-x-auto rounded bg-stone-900 p-3 text-stone-100">
{`{
  "uid": "${user.uid}",
  "restaurantId": "${restaurantId}",
  "role": "restaurantOwner",
  "status": "active",
  "email": "${user.email ?? ''}"
}`}
            </pre>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void refreshPermissions()}
              className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-800"
            >
              <RefreshCw className="h-4 w-4" />
              Re-check Permissions
            </button>
            <button
              type="button"
              onClick={() => void logout()}
              className="inline-flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
            <Link
              to="/menu"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600 hover:text-stone-900 ml-auto"
            >
              <ArrowLeft className="h-4 w-4" />
              Public Menu
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

