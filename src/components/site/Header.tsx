import { useState } from 'react';
import { Link } from 'react-router-dom';

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-white">
              <path d="M3 6L9 3L15 6V12L9 15L3 12V6Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M9 3V15" stroke="currentColor" strokeWidth="1.5" />
              <path d="M3 6L9 9L15 6" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>
          <span className="text-xl font-bold text-gray-900 tracking-tight">Lynk</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            Features
          </a>
          <a href="#how-it-works" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            How it Works
          </a>
          <Link
            to="/canvas"
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            Open Canvas
          </Link>
        </nav>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 text-gray-500 hover:text-gray-700"
          aria-label="Toggle menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-6 py-4 space-y-3">
          <a
            href="#features"
            onClick={() => setMobileOpen(false)}
            className="block text-sm text-gray-600 hover:text-gray-900"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            onClick={() => setMobileOpen(false)}
            className="block text-sm text-gray-600 hover:text-gray-900"
          >
            How it Works
          </a>
          <Link
            to="/canvas"
            onClick={() => setMobileOpen(false)}
            className="block w-full text-center px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg"
          >
            Open Canvas
          </Link>
        </div>
      )}
    </header>
  );
}
