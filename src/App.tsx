import { BrowserRouter } from 'react-router-dom';

import AppRouter from './routes/AppRouter';
import { AuthProvider } from './context/AuthContext';
import { AnalysisProvider } from './context/AnalysisContext';
import { ChatProvider } from './context/ChatContext';
import { SubscriptionProvider } from './context/SubscriptionContext';
import { ReportSyncProvider } from './hooks/useReportSync';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SubscriptionProvider>
          <AnalysisProvider>
            <ReportSyncProvider>
              <ChatProvider>
                <AppRouter />
              </ChatProvider>
            </ReportSyncProvider>
          </AnalysisProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
