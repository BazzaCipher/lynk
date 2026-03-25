import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-gray-50/50">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo-lynk.jpg" alt="Lynk" className="w-6 h-6 rounded-md object-cover" />
            <span className="text-sm font-semibold text-gray-700">Lynk</span>
          </Link>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <Link to="/canvas" className="hover:text-gray-600 transition-colors">
              Canvas
            </Link>
            <a href="#features" className="hover:text-gray-600 transition-colors">
              Features
            </a>
            <Link to="/blog" className="hover:text-gray-600 transition-colors">
              Blog
            </Link>
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
