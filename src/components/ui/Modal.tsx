import { useEffect, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  fullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export function Modal({ isOpen, onClose, title, children, className = '', fullscreen, onToggleFullscreen }: ModalProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal content */}
      <div
        className={`relative bg-white shadow-xl overflow-hidden flex flex-col ${
          fullscreen
            ? 'w-screen h-screen max-w-none max-h-none rounded-none'
            : `rounded-lg max-h-[90vh] max-w-[90vw] ${className}`
        }`}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-paper-200">
            <h2 className="text-lg font-medium text-bridge-900">{title}</h2>
            <div className="flex items-center gap-1">
              {onToggleFullscreen && (
                <button
                  onClick={onToggleFullscreen}
                  className="p-1 text-bridge-400 hover:text-bridge-600 transition-colors"
                  aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                >
                  {fullscreen ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7 9a1 1 0 011 1v1.586l2.293-2.293a1 1 0 111.414 1.414L9.414 13H11a1 1 0 110 2H7a1 1 0 01-1-1v-4a1 1 0 011-1zm6-4a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 100-2h-1.586l2.293-2.293a1 1 0 00-1.414-1.414L14 7.586V6a1 1 0 00-1-1zM3.707 3.293a1 1 0 00-1.414 1.414L4.586 7H3a1 1 0 000 2h4a1 1 0 001-1V4a1 1 0 10-2 0v1.586L3.707 3.293zM13 12a1 1 0 10-2 0v4a1 1 0 001 1h4a1 1 0 100-2h-1.586l2.293-2.293a1 1 0 00-1.414-1.414L13 13.586V12z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 110-2h4a1 1 0 011 1v4a1 1 0 11-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 112 0v1.586l2.293-2.293a1 1 0 011.414 1.414L6.414 15H8a1 1 0 110 2H4a1 1 0 01-1-1v-4zm13 0a1 1 0 10-2 0v1.586l-2.293-2.293a1 1 0 00-1.414 1.414L13.586 15H12a1 1 0 100 2h4a1 1 0 001-1v-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1 text-bridge-400 hover:text-bridge-600 transition-colors"
                aria-label="Close modal"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </div>,
    document.body
  );
}
