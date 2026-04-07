import { useState } from 'react';
import { Link } from 'react-router-dom';

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-navy-100">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo-lynk.jpg" alt="Paperbridge" className="h-8 rounded-lg object-contain" />
          <span className="text-xl font-bold text-navy-900 tracking-tight">Paperbridge</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          <Link to="/blog" className="text-sm text-navy-500 hover:text-navy-900 transition-colors">
            Blog
          </Link>
          <Link
            to="/canvas"
            className="px-4 py-2 text-sm font-medium bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-sm cursor-pointer"
          >
            Open Canvas
          </Link>
        </nav>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 text-navy-500 hover:text-navy-700 cursor-pointer"
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
      <div
        className={`md:hidden border-t border-navy-100 bg-white px-6 overflow-hidden transition-all duration-200 ease-out ${
          mobileOpen ? 'max-h-40 py-4 opacity-100' : 'max-h-0 py-0 opacity-0'
        }`}
      >
        <div className="space-y-3">
          <Link
            to="/blog"
            onClick={() => setMobileOpen(false)}
            className="block text-sm text-navy-600 hover:text-navy-900"
          >
            Blog
          </Link>
          <Link
            to="/canvas"
            onClick={() => setMobileOpen(false)}
            className="block w-full text-center px-4 py-2 text-sm font-medium bg-green-500 text-white rounded-lg"
          >
            Open Canvas
          </Link>
        </div>
      </div>
    </header>
  );
}
