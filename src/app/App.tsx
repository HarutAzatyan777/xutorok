import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './providers/AuthProvider';
import { ToastProvider } from './providers/ToastProvider';
import { appRouter } from './router';

export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <RouterProvider router={appRouter} />
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;

