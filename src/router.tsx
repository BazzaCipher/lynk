import { createBrowserRouter } from 'react-router-dom';
import { SiteLayout } from './layouts/SiteLayout';
import { CanvasLayout } from './layouts/CanvasLayout';
import { LandingPage } from './pages/LandingPage';
import { CanvasPage } from './pages/CanvasPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { BlogListPage } from './blog/BlogListPage';
import { BlogPostPage } from './blog/BlogPostPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <SiteLayout />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'blog', element: <BlogListPage /> },
      { path: 'blog/:slug', element: <BlogPostPage /> },
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
