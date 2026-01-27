import { useState, useCallback, useRef } from 'react';
import type { NodeProps } from '@xyflow/react';
import { useEdges } from '@xyflow/react';
import { BaseNode } from './base/BaseNode';
import { DocumentViewer } from './file/DocumentViewer';
import { RegionSelector } from './file/RegionSelector';
import { HighlightOverlay } from './file/HighlightOverlay';
import { RegionList } from './file/RegionList';
import { Modal } from '../ui/Modal';
import { CollapsiblePanel } from '../ui/CollapsiblePanel';
import { extractTextFromRegion } from '../../core/extraction/ocrExtractor';
import { useCanvasStore } from '../../store/canvasStore';
import { useToast } from '../ui/Toast';
import { BlobRegistry } from '../../store/canvasPersistence';
import { getColorForType } from '../../utils/colors';
import type {
  ExtractorNode as ExtractorNodeType,
  RegionCoordinates,
  ExtractedRegion,
  TextRange,
  SimpleDataType,
  DisplayNodeData,
  CachedExtractorEdges,
} from '../../types';

const VIEWER_WIDTH = 500;

// Confidence threshold for OCR warnings (0-100)
const LOW_CONFIDENCE_THRESHOLD = 50;

export function ExtractorNode({ id, data, selected }: NodeProps<ExtractorNodeType>) {
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);
  const replaceNode = useCanvasStore((state) => state.replaceNode);
  const removeEdge = useCanvasStore((state) => state.removeEdge);
  const edges = useEdges();
  const { showToast } = useToast();
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [viewerHeight, setViewerHeight] = useState(400);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState<'box' | 'text'>('box');
  const imageRef = useRef<HTMLImageElement | HTMLCanvasElement | null>(null);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Register file with BlobRegistry for persistence
      const { fileId, blobUrl } = BlobRegistry.register(file);
      const fileType = file.type.startsWith('image/') ? 'image' : 'pdf';

      updateNodeData(id, {
        fileUrl: blobUrl,
        fileId,
        fileName: file.name,
        fileType,
        currentPage: 1,
        totalPages: 1,
        regions: [],
      });
    },
    [id, updateNodeData]
  );

  const handleFileDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (!file) return;

      // Register file with BlobRegistry for persistence
      const { fileId, blobUrl } = BlobRegistry.register(file);
      const fileType = file.type.startsWith('image/') ? 'image' : 'pdf';

      updateNodeData(id, {
        fileUrl: blobUrl,
        fileId,
        fileName: file.name,
        fileType,
        currentPage: 1,
        totalPages: 1,
        regions: [],
      });
    },
    [id, updateNodeData]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDocumentLoad = useCallback(
    (numPages: number) => {
      updateNodeData(id, { totalPages: numPages });
      setViewerHeight(VIEWER_WIDTH * 1.4);
    },
    [id, updateNodeData]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      updateNodeData(id, { currentPage: page });
    },
    [id, updateNodeData]
  );

  const handleRegionCreate = useCallback(
    (coordinates: RegionCoordinates) => {
      const newRegion: ExtractedRegion = {
        id: `region-${Date.now()}`,
        label: `Field ${data.regions.length + 1}`,
        selectionType: 'box',
        coordinates,
        pageNumber: data.currentPage,
        extractedData: { type: 'string', value: '' },
        dataType: 'string',
        color: getColorForType('string').border,
      };

      updateNodeData(id, {
        regions: [...data.regions, newRegion],
      });
      setSelectedRegionId(newRegion.id);
    },
    [id, data.regions, data.currentPage, updateNodeData]
  );

  const handleTextSelect = useCallback(
    (textRange: TextRange) => {
      const newRegion: ExtractedRegion = {
        id: `region-${Date.now()}`,
        label: `Text ${data.regions.length + 1}`,
        selectionType: 'text',
        textRange,
        pageNumber: data.currentPage,
        extractedData: { type: 'string', value: textRange.text },
        dataType: 'string',
        color: getColorForType('string').border,
      };

      updateNodeData(id, {
        regions: [...data.regions, newRegion],
      });
      setSelectedRegionId(newRegion.id);
    },
    [id, data.regions, data.currentPage, updateNodeData]
  );

  const handleRegionSelect = useCallback((regionId: string) => {
    setSelectedRegionId(regionId);
  }, []);

  const handleRegionDelete = useCallback(
    (regionId: string) => {
      updateNodeData(id, {
        regions: data.regions.filter((r) => r.id !== regionId),
      });
      if (selectedRegionId === regionId) {
        setSelectedRegionId(null);
      }
    },
    [id, data.regions, selectedRegionId, updateNodeData]
  );

  const handleRegionLabelChange = useCallback(
    (regionId: string, label: string) => {
      updateNodeData(id, {
        regions: data.regions.map((r) =>
          r.id === regionId ? { ...r, label } : r
        ),
      });
    },
    [id, data.regions, updateNodeData]
  );

  const handleRegionDataTypeChange = useCallback(
    (regionId: string, newDataType: SimpleDataType) => {
      updateNodeData(id, {
        regions: data.regions.map((r) => {
          if (r.id !== regionId) return r;

          const currentValue = String(r.extractedData.value || '');
          const updatedCache = { ...(r.valueCache || {}), [r.dataType]: currentValue };
          const cachedValue = updatedCache[newDataType];

          return {
            ...r,
            dataType: newDataType,
            color: getColorForType(newDataType).border,
            valueCache: updatedCache,
            extractedData: {
              ...r.extractedData,
              value: cachedValue ?? currentValue,
            },
          };
        }),
      });
    },
    [id, data.regions, updateNodeData]
  );

  const handleValueChange = useCallback(
    (regionId: string, value: string) => {
      updateNodeData(id, {
        regions: data.regions.map((r) =>
          r.id === regionId
            ? {
                ...r,
                extractedData: { ...r.extractedData, value },
                // Also update textRange if it's a text selection
                ...(r.selectionType === 'text' && r.textRange
                  ? { textRange: { ...r.textRange, text: value } }
                  : {}),
              }
            : r
        ),
      });
    },
    [id, data.regions, updateNodeData]
  );

  const handleExtract = useCallback(
    async (regionId: string) => {
      const region = data.regions.find((r) => r.id === regionId);
      if (!region || !data.fileUrl || !region.coordinates) return;

      setIsExtracting(true);
      try {
        const result = await extractTextFromRegion(
          data.fileUrl,
          region.coordinates
        );

        // Warn if confidence is low
        if (result.confidence < LOW_CONFIDENCE_THRESHOLD) {
          showToast(
            `Low OCR confidence (${Math.round(result.confidence)}%). Results may be inaccurate.`,
            'warning'
          );
        }

        // Warn if no text was extracted
        if (!result.text.trim()) {
          showToast('No text detected in selection. Try a different region.', 'warning');
        }

        updateNodeData(id, {
          regions: data.regions.map((r) =>
            r.id === regionId
              ? {
                  ...r,
                  extractedData: {
                    ...result.dataValue,
                    source: {
                      nodeId: id,
                      regionId: r.id,
                      pageNumber: r.pageNumber,
                      coordinates: r.coordinates,
                      extractionMethod: 'ocr' as const,
                      confidence: result.confidence,
                    },
                  },
                }
              : r
          ),
        });
      } catch (error) {
        console.error('OCR extraction failed:', error);
        // Show user-friendly error message
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (errorMessage.includes('canvas context')) {
          showToast('Failed to process image. Please try again.', 'error');
        } else if (errorMessage.includes('load') || errorMessage.includes('image')) {
          showToast('Failed to load image for OCR. The file may be corrupted.', 'error');
        } else {
          showToast(`OCR extraction failed: ${errorMessage}`, 'error');
        }
      } finally {
        setIsExtracting(false);
      }
    },
    [id, data.regions, data.fileUrl, updateNodeData, showToast]
  );

  const openModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  // Convert to DisplayNode
  const convertToDisplay = useCallback(() => {
    // Cache current edges and regions
    const outgoingEdges = edges.filter((e) => e.source === id);
    const cachedExtractorEdges: CachedExtractorEdges = {
      edges: outgoingEdges.map((e) => ({
        id: e.id,
        target: e.target,
        targetHandle: e.targetHandle ?? undefined,
        sourceHandle: e.sourceHandle ?? '',
      })),
      regions: data.regions,
      cachedAt: new Date().toISOString(),
    };

    // Create DisplayNode with view from current page
    const displayData: DisplayNodeData = {
      label: data.label,
      fileType: data.fileType,
      fileUrl: data.fileUrl,
      fileId: data.fileId,
      fileName: data.fileName,
      view: {
        viewport: { x: 0, y: 0, width: 1, height: 1 },
        target: data.fileType === 'pdf'
          ? { type: 'page', pageNumber: data.currentPage }
          : { type: 'image' },
        nodeSize: { width: 400, height: 300 },
        aspectLocked: true,
      },
      totalPages: data.totalPages,
      cachedExtractorEdges,
    };

    // Remove outgoing edges (DisplayNode has no outputs)
    for (const edge of outgoingEdges) {
      removeEdge(edge.id);
    }

    // Replace node
    replaceNode(id, 'display', displayData);
  }, [id, data, edges, replaceNode, removeEdge]);

  return (
    <>
      <BaseNode label={data.label} selected={selected} className="w-[280px]">
        {/* File info and open button */}
        <div
          className="border-b border-gray-100"
          onDrop={handleFileDrop}
          onDragOver={handleDragOver}
        >
          {data.fileUrl ? (
            <div className="p-3">
              {/* File info */}
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-gray-500">
                  {data.fileType === 'pdf' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {data.fileName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {data.regions.length} field{data.regions.length !== 1 ? 's' : ''}
                    {data.fileType === 'pdf' && data.totalPages > 1
                      ? ` · Page ${data.currentPage}/${data.totalPages}`
                      : ''}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={openModal}
                  className="flex-1 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                  Open
                </button>
                <button
                  onClick={convertToDisplay}
                  className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors flex items-center justify-center gap-1"
                  title="Convert to Display Node"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center h-28 cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="file"
                accept="application/pdf,image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-300 mb-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <div className="text-sm text-gray-400 text-center">
                <p>Drop a PDF or image</p>
                <p className="text-xs mt-1">or click to browse</p>
              </div>
            </label>
          )}
        </div>

        {/* Compact region list with values - no OCR button here */}
        <RegionList
          regions={data.regions}
          selectedRegionId={selectedRegionId}
          onRegionSelect={handleRegionSelect}
          onRegionDelete={handleRegionDelete}
          onRegionLabelChange={handleRegionLabelChange}
          onRegionDataTypeChange={handleRegionDataTypeChange}
          compact
          nodeId={id}
        />
      </BaseNode>

      {/* Document viewer modal with side panel */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={data.fileName || 'Document Viewer'}
        className="w-[950px] max-w-[95vw]"
      >
        <div className="flex h-[75vh]">
          {/* Document viewer area */}
          <div className="flex-1 overflow-auto bg-gray-50">
            {/* Selection mode toggle */}
            <div className="sticky top-0 z-10 flex items-center justify-center gap-2 py-2 px-4 bg-white border-b border-gray-200 shadow-sm">
              <span className="text-xs text-gray-500 mr-2">Selection:</span>
              <button
                onClick={() => setSelectionMode('box')}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors flex items-center gap-1.5 ${
                  selectionMode === 'box'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 2h10v10H5V5z" />
                </svg>
                Box (OCR)
              </button>
              <button
                onClick={() => setSelectionMode('text')}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors flex items-center gap-1.5 ${
                  selectionMode === 'text'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                Text Select
              </button>
            </div>

            {/* Document with overlays */}
            <div className="relative p-6 flex justify-center">
              <div className="relative bg-white shadow-lg">
                <DocumentViewer
                  fileUrl={data.fileUrl ?? null}
                  fileType={data.fileType}
                  currentPage={data.currentPage}
                  totalPages={data.totalPages}
                  onPageChange={handlePageChange}
                  onDocumentLoad={handleDocumentLoad}
                  onImageRef={(ref) => {
                    imageRef.current = ref;
                  }}
                  onTextSelect={selectionMode === 'text' ? handleTextSelect : undefined}
                  enableTextSelection={selectionMode === 'text'}
                  width={VIEWER_WIDTH}
                  scrollMode={true}
                >
                  {/* Overlays rendered as children to share coordinate space with content */}
                  {data.fileUrl && (
                    <HighlightOverlay
                      regions={data.regions}
                      currentPage={data.currentPage}
                      selectedRegionId={selectedRegionId}
                      onRegionSelect={handleRegionSelect}
                      interactive={selectionMode === 'box'}
                      nodeId={id}
                    />
                  )}
                  {data.fileUrl && selectionMode === 'box' && (
                    <RegionSelector
                      onRegionCreate={handleRegionCreate}
                      width={VIEWER_WIDTH}
                      height={viewerHeight}
                    />
                  )}
                </DocumentViewer>
              </div>
            </div>
          </div>

          {/* Collapsible fields panel - with OCR and value editing */}
          <CollapsiblePanel
            title="Fields"
            badge={data.regions.length}
            defaultOpen={true}
            side="right"
          >
            <RegionList
              regions={data.regions}
              selectedRegionId={selectedRegionId}
              onRegionSelect={handleRegionSelect}
              onRegionDelete={handleRegionDelete}
              onRegionLabelChange={handleRegionLabelChange}
              onRegionDataTypeChange={handleRegionDataTypeChange}
              onValueChange={handleValueChange}
              onExtract={handleExtract}
              isExtracting={isExtracting}
              showOcrButton={true}
            />
          </CollapsiblePanel>
        </div>

        {/* Footer instructions */}
        <div className="px-4 py-2 bg-gray-100 border-t border-gray-200 text-xs text-gray-500 flex items-center justify-between">
          <span>
            {selectionMode === 'box'
              ? 'Draw a box to create a field, then run OCR to extract text.'
              : 'Select text directly to create a field with that value.'}
          </span>
          <span className="text-gray-400">
            {data.regions.length} field{data.regions.length !== 1 ? 's' : ''}
          </span>
        </div>
      </Modal>
    </>
  );
}
