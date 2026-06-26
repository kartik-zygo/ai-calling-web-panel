import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import AssistantsPage from './pages/AssistantsPage.jsx';
import PhoneNumbersPage from './pages/PhoneNumbersPage.jsx';
import LeadsPage from './pages/LeadsPage.jsx';
import CampaignPage from './pages/CampaignPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="assistants" element={<AssistantsPage />} />
        <Route path="phone-numbers" element={<PhoneNumbersPage />} />
        <Route path="leads" element={<LeadsPage />} />
        <Route path="campaign" element={<CampaignPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
