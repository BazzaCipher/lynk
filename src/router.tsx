import { createBrowserRouter } from 'react-router-dom';
import { SiteLayout } from './layouts/SiteLayout';
import { CanvasLayout } from './layouts/CanvasLayout';
import { LandingPage } from './pages/LandingPage';
import { CanvasPage } from './pages/CanvasPage';
import { NotFoundPage } from './pages/NotFoundPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <SiteLayout />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    path: '/canvas',
    element: <CanvasLayout />,
    children: [
      { index: true, element: <CanvasPage /> },
    ],
  },
]);
