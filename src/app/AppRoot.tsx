import { Outlet } from 'react-router-dom';
import { ThemeProvider } from './providers/ThemeProvider';

export function AppRoot() {
  return (
    <ThemeProvider>
      <Outlet />
    </ThemeProvider>
  );
}

