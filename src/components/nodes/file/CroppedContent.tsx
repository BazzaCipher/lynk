/**
 * CroppedContent Component
 *
 * Renders a specific pixel region of a document (image or PDF) with proper scaling.
 * Used by ViewportNode to display cropped views of documents from DisplayNode.
 */

import { Document, Page, pdfjs } from 'react-pdf';

// Initialize PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface CroppedContentProps {
  fileUrl: string;
  fileType: 'image' | 'pdf';
  pageNumber?: number;
  /** Source crop region (pixel coordinates in the source document at scale=1) */
  crop: { x: number; y: number; width: number; height: number };
  /** Display dimensions */
  displayWidth: number;
  displayHeight: number;
  /** Source document dimensions at scale=1 */
  sourceWidth: number;
  sourceHeight: number;
}

export function CroppedContent({
  fileUrl,
  fileType,
  pageNumber = 1,
  crop,
  displayWidth,
  displayHeight,
  sourceWidth,
  sourceHeight,
}: CroppedContentProps) {
  // Calculate scale: how much we need to scale the source to fit the display
  const scaleX = displayWidth / crop.width;
  const scaleY = displayHeight / crop.height;

  if (fileType === 'image') {
    return (
      <div
        style={{
          width: displayWidth,
          height: displayHeight,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <img
          src={fileUrl}
          alt=""
          draggable={false}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: sourceWidth * scaleX,
            height: sourceHeight * scaleY,
            transform: `translate(${-crop.x * scaleX}px, ${-crop.y * scaleY}px)`,
            transformOrigin: 'top left',
            maxWidth: 'none',
          }}
        />
      </div>
    );
  }

  // For PDFs: render the page at the scaled size, then clip to the crop region
  return (
    <div
      style={{
        width: displayWidth,
        height: displayHeight,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transform: `translate(${-crop.x * scaleX}px, ${-crop.y * scaleY}px)`,
          transformOrigin: 'top left',
        }}
      >
        <Document file={fileUrl} loading="">
          <Page
            pageNumber={pageNumber}
            width={sourceWidth * scaleX}
            renderTextLayer={false}
            renderAnnotationLayer={false}
          />
        </Document>
      </div>
    </div>
  );
}
