import { ReactFlowProvider } from '@xyflow/react';
import { Outlet } from 'react-router-dom';
import { Providers } from '../providers/Providers';

export function CanvasLayout() {
  return (
    <Providers>
      <ReactFlowProvider>
        <div className="w-screen h-screen overflow-hidden">
          <Outlet />
        </div>
      </ReactFlowProvider>
    </Providers>
  );
}
