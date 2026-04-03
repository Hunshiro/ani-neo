import { Outlet } from 'react-router-dom';

export function AppShell() {
  return (
    <div className="app-shell">
      <div className="app-shell__bg app-shell__bg--left" />
      <div className="app-shell__bg app-shell__bg--right" />
      <main className="page">
        <Outlet />
      </main>
    </div>
  );
}
