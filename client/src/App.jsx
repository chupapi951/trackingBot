import { createContext, useContext } from 'react';
import { Routes, Route } from 'react-router-dom';
import BottomNav from './components/BottomNav.jsx';
import TrackersPage from './pages/TrackersPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import CreateTrackerPage from './pages/CreateTrackerPage.jsx';
import TrackerPage from './pages/TrackerPage.jsx';
import { useTheme } from './lib/useTheme.js';

export const ThemeContext = createContext(null);
export function useThemeContext() {
  return useContext(ThemeContext);
}

export default function App() {
  const themeState = useTheme();

  return (
    <ThemeContext.Provider value={themeState}>
      <div className="app">
        <Routes>
          <Route path="/" element={<TrackersPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/create" element={<CreateTrackerPage />} />
          <Route path="/tracker/:id" element={<TrackerPage />} />
        </Routes>
        <BottomNav />
      </div>
    </ThemeContext.Provider>
  );
}
