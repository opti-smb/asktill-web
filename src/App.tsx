import AppRouter from './routes/AppRouter';
import { AuthProvider } from './context/AuthContext';
import { AnalysisProvider } from './context/AnalysisContext';
import { ChatProvider } from './context/ChatContext';

export default function App() {
  return (
    <AuthProvider>
      <AnalysisProvider>
        <ChatProvider>
          <AppRouter />
        </ChatProvider>
      </AnalysisProvider>
    </AuthProvider>
  );
}
