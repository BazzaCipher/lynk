import { LynkCanvas } from './components/canvas/LynkCanvas';
import { ToastProvider } from './components/ui/Toast';

function App() {
  return (
    <ToastProvider>
      <div className="w-screen h-screen">
        <LynkCanvas />
      </div>
    </ToastProvider>
  );
}

export default App;
