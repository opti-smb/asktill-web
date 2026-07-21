import { Navigate, Route, Routes } from 'react-router-dom';

import HomePage from './pages/HomePage';
import LoanProductPage from './pages/LoanProductPage';
import LoansPage from './pages/LoansPage';

/**
 * Channel Partners marketplace UI (Policybazaar-style nested navigation).
 * Mount under `/dashboard/channel-partners/*` in asktill-web.
 */
export default function ChannelPartnersApp() {
  return (
    <Routes>
      <Route index element={<HomePage />} />
      <Route path="loans" element={<LoansPage />} />
      <Route path="loans/:productId" element={<LoanProductPage />} />
      <Route path="*" element={<Navigate to="" replace />} />
    </Routes>
  );
}
