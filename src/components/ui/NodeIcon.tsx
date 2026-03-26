export function NodeIcon({ type }: { type: string }) {
  switch (type) {
    case 'extractor':
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="2" width="12" height="16" rx="1.5" />
          <line x1="7" y1="6" x2="13" y2="6" />
          <line x1="7" y1="9" x2="11" y2="9" />
          <circle cx="16.5" cy="16.5" r="5" strokeWidth={1.5} />
          <circle cx="16.5" cy="16.5" r="1.5" fill="currentColor" stroke="none" />
          <line x1="16.5" y1="10" x2="16.5" y2="13" />
          <line x1="16.5" y1="20" x2="16.5" y2="23" />
          <line x1="10" y1="16.5" x2="13" y2="16.5" />
          <line x1="20" y1="16.5" x2="23" y2="16.5" />
        </svg>
      );
    case 'display':
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="18" rx="2" />
          <circle cx="8" cy="9" r="2.5" />
          <polyline points="22,17 16,11 10,17" />
          <polyline points="14,15 17,12 22,17" />
        </svg>
      );
    case 'calculation':
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="3" />
          <line x1="7" y1="7" x2="7" y2="11" />
          <line x1="5" y1="9" x2="9" y2="9" />
          <line x1="15" y1="9" x2="19" y2="9" />
          <line x1="5.5" y1="15.5" x2="8.5" y2="18.5" />
          <line x1="8.5" y1="15.5" x2="5.5" y2="18.5" />
          <line x1="15" y1="16" x2="19" y2="16" />
          <line x1="15" y1="18.5" x2="19" y2="18.5" />
        </svg>
      );
    case 'sheet':
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="2" />
          <line x1="2" y1="8" x2="22" y2="8" />
          <line x1="2" y1="14" x2="22" y2="14" />
          <line x1="9" y1="2" x2="9" y2="22" />
          <line x1="16" y1="2" x2="16" y2="22" />
        </svg>
      );
    case 'label':
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 4.5A1.5 1.5 0 013.5 3h7.59a1.5 1.5 0 011.06.44l8.41 8.41a1.5 1.5 0 010 2.12l-7.59 7.59a1.5 1.5 0 01-2.12 0L2.44 13.15A1.5 1.5 0 012 12.09V4.5z" />
          <circle cx="7" cy="8" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      );
    default:
      return null;
  }
}
