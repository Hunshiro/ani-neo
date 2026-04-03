import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '../layouts/AppShell';
import { HomePage } from '../pages/homepage/HomePage';
import { ExplorePage } from '../pages/ExplorePage';
import { AnimeDetailsPage } from '../pages/AnimeDetailsPage';
import { WatchPage } from '../pages/WatchPage';
import { NotFoundPage } from '../pages/NotFoundPage';

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/watch/:animeId" element={<WatchPage />} />
        <Route path="/anime/:animeId" element={<AnimeDetailsPage />} />
        <Route path="/404" element={<NotFoundPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
