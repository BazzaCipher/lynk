import { LynkCanvas } from './components/canvas/LynkCanvas';
import { ToastProvider } from './components/ui/Toast';
import { SessionRecovery } from './components/SessionRecovery';
import { useLocalStorageSync } from './hooks/useLocalStorageSync';

function App() {
  // Auto-save canvas to localStorage
  useLocalStorageSync();

  return (
    <ToastProvider>
      <div className="w-screen h-screen">
        <LynkCanvas />
        <SessionRecovery />
      </div>
    </ToastProvider>
  );
}

export default App;
