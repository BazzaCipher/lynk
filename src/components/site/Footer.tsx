import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-gray-50/50">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 18 18" fill="none" className="text-white">
                <path d="M3 6L9 3L15 6V12L9 15L3 12V6Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-gray-700">Lynk</span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <Link to="/canvas" className="hover:text-gray-600 transition-colors">
              Canvas
            </Link>
            <a href="#features" className="hover:text-gray-600 transition-colors">
              Features
            </a>
          </div>

          {/* Copyright */}
          <p className="text-xs text-gray-400">
            Visual document data extraction
          </p>
        </div>
      </div>
    </footer>
  );
}
