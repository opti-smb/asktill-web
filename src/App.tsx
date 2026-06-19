import AppRouter from './routes/AppRouter';
import { AuthProvider } from './context/AuthContext';
import { AnalysisProvider } from './context/AnalysisContext';
import { ChatProvider } from './context/ChatContext';
import { ReportSyncProvider } from './hooks/useReportSync';

export default function App() {
  return (
    <AuthProvider>
      <AnalysisProvider>
        <ReportSyncProvider>
          <ChatProvider>
            <AppRouter />
          </ChatProvider>
        </ReportSyncProvider>
      </AnalysisProvider>
    </AuthProvider>
  );
}
