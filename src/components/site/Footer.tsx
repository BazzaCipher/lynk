import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="border-t border-navy-100 bg-white">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          {/* Brand */}
          <div>
            <Link to="/" className="focus-ring flex items-center gap-2 rounded">
              <img src="/logo-lynk.jpg" alt="Paperbridge" className="h-5 rounded object-contain" />
              <span className="text-sm font-semibold text-navy-700">Paperbridge</span>
            </Link>
            <p className="mt-1.5 text-xs text-navy-400 max-w-xs">
              Audit-ready document extraction for Australian tax practices.
            </p>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm text-navy-400">
            <Link to="/canvas" className="focus-ring hover:text-navy-700 transition-colors rounded px-1">
              Canvas
            </Link>
            <Link to="/blog" className="focus-ring hover:text-navy-700 transition-colors rounded px-1">
              Blog
            </Link>
          </div>

          {/* Trust + copyright */}
          <div className="flex flex-col items-start md:items-end gap-1.5">
            <div className="flex items-center gap-4 text-xs text-navy-400">
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                Data stays in your browser
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                ATO compliant
              </span>
            </div>
            <p className="text-xs text-navy-300">
              &copy; {new Date().getFullYear()} Paperbridge
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
