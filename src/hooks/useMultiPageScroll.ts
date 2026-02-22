import { useState, useCallback, useRef, useEffect } from 'react';

interface UseMultiPageScrollOptions {
  totalPages: number;
  /** Number of pages to buffer above/below the viewport */
  buffer?: number;
  /** When true, no pages render until activate() is called */
  deferLoading?: boolean;
}

interface SinglePageSize {
  width: number;
  height: number;
}

interface UseMultiPageScrollReturn {
  /** Callback-ref factory: pass to each page wrapper's ref */
  setPageRef: (pageNum: number) => (el: HTMLDivElement | null) => void;
  /** Set of currently visible (+ buffered) page numbers */
  visiblePages: Set<number>;
  /** Y offset of each page wrapper, keyed by page number */
  pageOffsets: Map<number, number>;
  /** Intrinsic dimensions of the first rendered page */
  singlePageSize: SinglePageSize | null;
  /** Whether the viewer has been activated (always true when deferLoading=false) */
  isActivated: boolean;
  /** Call to activate the viewer when deferLoading=true */
  activate: () => void;
  /** Ref to attach to the scrollable container for IntersectionObserver root */
  scrollContainerRef: React.RefObject<HTMLElement | null>;
}

export function useMultiPageScroll({
  totalPages,
  buffer = 2,
  deferLoading = false,
}: UseMultiPageScrollOptions): UseMultiPageScrollReturn {
  const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set());
  const [pageOffsets, setPageOffsets] = useState<Map<number, number>>(new Map());
  const [singlePageSize, setSinglePageSize] = useState<SinglePageSize | null>(null);
  const [isActivated, setIsActivated] = useState(!deferLoading);

  const pageRefsMap = useRef<Map<number, HTMLDivElement>>(new Map());
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // Activate the viewer
  const activate = useCallback(() => {
    setIsActivated(true);
  }, []);

  // Recalculate page offsets using rAF debounce
  const recalcOffsets = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }
    rafIdRef.current = requestAnimationFrame(() => {
      const offsets = new Map<number, number>();
      pageRefsMap.current.forEach((el, pageNum) => {
        offsets.set(pageNum, el.offsetTop);
      });
      if (offsets.size > 0) {
        setPageOffsets(offsets);
      }
      rafIdRef.current = null;
    });
  }, []);

  // Callback-ref factory for page wrappers
  const setPageRef = useCallback(
    (pageNum: number) => (el: HTMLDivElement | null) => {
      if (el) {
        pageRefsMap.current.set(pageNum, el);

        // Observe for resize to recalculate offsets
        resizeObserverRef.current?.observe(el);

        // Observe for intersection (visibility)
        intersectionObserverRef.current?.observe(el);
      } else {
        const existing = pageRefsMap.current.get(pageNum);
        if (existing) {
          resizeObserverRef.current?.unobserve(existing);
          intersectionObserverRef.current?.unobserve(existing);
        }
        pageRefsMap.current.delete(pageNum);
      }
    },
    []
  );

  // Track single page dimensions from the first rendered page
  useEffect(() => {
    if (!isActivated || singlePageSize) return;

    // Watch for page 1's canvas/content to get intrinsic dimensions
    const checkFirstPage = () => {
      const pageEl = pageRefsMap.current.get(1);
      if (!pageEl) return;

      const canvas = pageEl.querySelector('canvas');
      if (canvas && canvas.clientWidth > 0 && canvas.clientHeight > 0) {
        setSinglePageSize({ width: canvas.clientWidth, height: canvas.clientHeight });
        return;
      }

      // Fallback: measure the page div itself (minus the page label)
      const pageContent = pageEl.querySelector('.react-pdf__Page');
      if (pageContent) {
        const rect = pageContent.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setSinglePageSize({ width: rect.width, height: rect.height });
        }
      }
    };

    // Check periodically until we get it
    const interval = setInterval(checkFirstPage, 100);
    checkFirstPage();

    return () => clearInterval(interval);
  }, [isActivated, singlePageSize]);

  // Set up ResizeObserver for page offset calculation
  useEffect(() => {
    resizeObserverRef.current = new ResizeObserver(() => {
      recalcOffsets();
    });

    // Observe any already-mounted pages (refs fire before effects)
    pageRefsMap.current.forEach((el) => {
      resizeObserverRef.current?.observe(el);
    });

    // Trigger initial offset calculation
    recalcOffsets();

    return () => {
      resizeObserverRef.current?.disconnect();
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [recalcOffsets]);

  // Set up IntersectionObserver for visibility tracking
  useEffect(() => {
    if (!isActivated) return;

    intersectionObserverRef.current = new IntersectionObserver(
      (entries) => {
        setVisiblePages((prev) => {
          const next = new Set(prev);
          for (const entry of entries) {
            const pageNum = Number(
              (entry.target as HTMLElement).dataset.pageNumber
            );
            if (isNaN(pageNum)) continue;

            if (entry.isIntersecting) {
              // Add this page and buffered pages
              for (
                let p = Math.max(1, pageNum - buffer);
                p <= Math.min(totalPages, pageNum + buffer);
                p++
              ) {
                next.add(p);
              }
            }
          }
          // Only update if actually changed
          if (next.size === prev.size && [...next].every((p) => prev.has(p))) {
            return prev;
          }
          return next;
        });
      },
      {
        root: scrollContainerRef.current,
        rootMargin: '200px 0px',
        threshold: 0,
      }
    );

    // Re-observe any already-mounted pages
    pageRefsMap.current.forEach((el) => {
      intersectionObserverRef.current?.observe(el);
    });

    return () => {
      intersectionObserverRef.current?.disconnect();
    };
  }, [isActivated, totalPages, buffer]);

  // When activated, ensure page 1 is in visiblePages
  useEffect(() => {
    if (isActivated && totalPages > 0) {
      setVisiblePages((prev) => {
        if (prev.has(1)) return prev;
        const next = new Set(prev);
        next.add(1);
        return next;
      });
    }
  }, [isActivated, totalPages]);

  return {
    setPageRef,
    visiblePages,
    pageOffsets,
    singlePageSize,
    isActivated,
    activate,
    scrollContainerRef,
  };
}
