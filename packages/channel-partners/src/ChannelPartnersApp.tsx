import { Navigate, Route, Routes } from 'react-router-dom';

import { PartnersCallbacksProvider, type PartnersCallbacks } from './PartnersCallbacks';
import AdvisorsPage from './pages/AdvisorsPage';
import HomePage from './pages/HomePage';
import LoanProductPage from './pages/LoanProductPage';
import LoansPage from './pages/LoansPage';

/**
 * Channel Partners marketplace UI (Policybazaar-style nested navigation).
 * Mount under `/dashboard/channel-partners/*` in asktill-web.
 */
export default function ChannelPartnersApp({ onBookAdvisor }: PartnersCallbacks = {}) {
  return (
    <PartnersCallbacksProvider value={{ onBookAdvisor }}>
      <Routes>
        <Route index element={<HomePage />} />
        <Route path="loans" element={<LoansPage />} />
        <Route path="loans/:productId" element={<LoanProductPage />} />
        <Route path="advisors" element={<AdvisorsPage />} />
        <Route path="*" element={<Navigate to="" replace />} />
      </Routes>
    </PartnersCallbacksProvider>
  );
}
