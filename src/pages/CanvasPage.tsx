import { LynkCanvas } from '../components/canvas/LynkCanvas';
import { SessionRecovery } from '../components/SessionRecovery';
import { useLocalStorageSync } from '../hooks/useLocalStorageSync';

export function CanvasPage() {
  useLocalStorageSync();

  return (
    <>
      <LynkCanvas />
      <SessionRecovery />
    </>
  );
}
