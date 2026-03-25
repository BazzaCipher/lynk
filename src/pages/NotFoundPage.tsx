import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center py-32 px-6">
      <h1 className="text-7xl font-bold text-bridge-900">404</h1>
      <p className="mt-4 text-lg text-bridge-500">This page doesn't exist.</p>
      <Link
        to="/"
        className="mt-8 px-6 py-3 text-sm font-medium bg-copper-500 text-white rounded-lg hover:bg-copper-600 transition-colors"
      >
        Back to Home
      </Link>
    </div>
  );
}
