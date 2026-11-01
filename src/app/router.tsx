import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../features/auth/components/ProtectedRoute';
import { PublicMenuPage } from '../pages/public/PublicMenuPage';
import { AdminLoginPage } from '../pages/admin/AdminLoginPage';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import { AdminProductsPage } from '../pages/admin/AdminProductsPage';
import { AdminProductEditPage } from '../pages/admin/AdminProductEditPage';
import { AdminCategoriesPage } from '../pages/admin/AdminCategoriesPage';
import { AdminSettingsPage } from '../pages/admin/AdminSettingsPage';

export const appRouter = createBrowserRouter([
  {
    path: '/',
    element: <PublicMenuPage />,
  },
  {
    path: '/menu',
    element: <PublicMenuPage />,
  },
  {
    path: '/admin/login',
    element: <AdminLoginPage />,
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute>
        <AdminDashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/products',
    element: (
      <ProtectedRoute>
        <AdminProductsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/products/new',
    element: (
      <ProtectedRoute>
        <AdminProductEditPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/products/:id/edit',
    element: (
      <ProtectedRoute>
        <AdminProductEditPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/categories',
    element: (
      <ProtectedRoute>
        <AdminCategoriesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/settings',
    element: (
      <ProtectedRoute>
        <AdminSettingsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '*',
    element: <Navigate to="/menu" replace />,
  },
]);

