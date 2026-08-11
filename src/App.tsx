import { BrowserRouter } from 'react-router-dom';

import AppRouter from './routes/AppRouter';
import ViewBeacon from './components/analytics/ViewBeacon';
import PostLoginDestination from './components/auth/PostLoginDestination';
import { AuthProvider } from './context/AuthContext';
import { AnalysisProvider } from './context/AnalysisContext';
import { ChatProvider } from './context/ChatContext';
import { RiskThresholdProvider } from './context/RiskThresholdContext';
import { SubscriptionProvider } from './context/SubscriptionContext';
import { ReportSyncProvider } from './hooks/useReportSync';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SubscriptionProvider>
          <AnalysisProvider>
            <ReportSyncProvider>
              <RiskThresholdProvider>
                <ChatProvider>
                  <ViewBeacon />
                  <PostLoginDestination />
                  <AppRouter />
                </ChatProvider>
              </RiskThresholdProvider>
            </ReportSyncProvider>
          </AnalysisProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
