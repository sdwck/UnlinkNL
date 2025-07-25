import React from 'react';
import { Route, Routes } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import HomePage from './pages/Home/HomePage';
import SettingsPage from './pages/Settings/SettingsPage';
import ProfileDetailPage from './pages/ProfileDetail/ProfileDetailPage';
import CreateProfilePage from './pages/CreateProfile/CreateProfilePage';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="profiles/new" element={<CreateProfilePage />} />
        <Route path="profiles/:profileId" element={<ProfileDetailPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
};

export default App;