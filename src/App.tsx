import AppRouter from './routes/AppRouter';
import { PeriodProvider } from './context/PeriodContext';

export default function App() {
  return (
    <PeriodProvider>
      <AppRouter />
    </PeriodProvider>
  );
}
