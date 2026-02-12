import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { useEdges } from '@xyflow/react';
import { BaseNode } from './base/BaseNode';
import { DocumentViewer } from './file/DocumentViewer';
import { RegionSelector } from './file/RegionSelector';
import { HighlightOverlay } from './file/HighlightOverlay';
import { RegionList } from './file/RegionList';
import { FileNodePreview } from './file/FileNodePreview';
import { Modal } from '../ui/Modal';
import { CollapsiblePanel } from '../ui/CollapsiblePanel';
import { FileDropZone } from '../ui/FileDropZone';
import { extractTextFromRegion } from '../../core/extraction/ocrExtractor';
import { useCanvasStore } from '../../store/canvasStore';
import { useToast } from '../ui/Toast';
import { useFileUpload, type FileUploadResult } from '../../hooks/useFileUpload';
import { useNodeOutputs } from '../../hooks/useNodeOutputs';
import { getColorForType } from '../../utils/colors';
import type {
  ExtractorNode as ExtractorNodeType,
  NodeOutput,
  RegionCoordinates,
  ExtractedRegion,
  TextRange,
  SimpleDataType,
  DisplayNodeData,
  CachedExtractorEdges,
  DataSourceReference,
} from '../../types';

const VIEWER_WIDTH = 500;

// Confidence threshold for OCR warnings (0-100)
const LOW_CONFIDENCE_THRESHOLD = 50;

export function ExtractorNode({ id, data, selected }: NodeProps<ExtractorNodeType>) {
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);
  const replaceNode = useCanvasStore((state) => state.replaceNode);
  const removeEdge = useCanvasStore((state) => state.removeEdge);
  const edges = useEdges();
  const nodeOutputs = useNodeOutputs(id);
  const { showToast } = useToast();
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [viewerHeight, setViewerHeight] = useState(400);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState<'box' | 'text'>('box');
  const [pageOffsets, setPageOffsets] = useState<Map<number, number>>(new Map());
  const [pdfError, setPdfError] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement | HTMLCanvasElement | null>(null);

  // ── Populate Exportable.outputs from regions ──────────────────────────────
  const outputs = useMemo(() => {
    const map: Record<string, NodeOutput> = {};
    for (const region of data.regions) {
      const extractedValue = region.extractedData.value;
      let value: number | string | boolean | Date;

      if (region.dataType === 'boolean') {
        if (typeof extractedValue === 'boolean') {
          value = extractedValue;
        } else {
          const strVal = String(extractedValue).toLowerCase();
          value = strVal === 'yes' || strVal === 'true' || strVal === '1';
        }
      } else if (region.dataType === 'date') {
        value = typeof extractedValue === 'string' ? extractedValue : String(extractedValue);
      } else if (typeof extractedValue === 'number') {
        value = extractedValue;
      } else {
        value = String(extractedValue);
      }

      const source: DataSourceReference = {
        nodeId: id,
        regionId: region.id,
        pageNumber: region.pageNumber,
        coordinates: region.coordinates,
        textRange: region.textRange,
        extractionMethod: region.extractedData.source?.extractionMethod || 'manual',
        confidence: region.extractedData.source?.confidence,
      };

      map[region.id] = {
        value,
        dataType: region.dataType,
        // Add compatible types for numeric regions (number/currency are interchangeable)
        compatibleTypes: (region.dataType === 'number' || region.dataType === 'currency')
          ? ['number', 'currency']
          : undefined,
        label: region.label,
        source,
      };
    }
    return map;
  }, [data.regions, id]);

  // Sync outputs to node data
  useEffect(() => {
    if (Object.keys(outputs).length > 0) {
      nodeOutputs.update(outputs);
    } else {
      nodeOutputs.clearAll();
    }
  }, [outputs, nodeOutputs]);

  const onFileRegistered = useCallback(
    (result: FileUploadResult) => {
      updateNodeData(id, {
        fileUrl: result.fileUrl,
        fileId: result.fileId,
        fileName: result.fileName,
        fileType: result.fileType,
        currentPage: 1,
        totalPages: 1,
        regions: [],
      });
    },
    [id, updateNodeData]
  );

  const { handleFileSelect, handleFileDrop, handleDragOver } = useFileUpload({ onFileRegistered });

  const handlePdfLoad = useCallback(
    ({ numPages }: { numPages: number }) => {
      updateNodeData(id, { totalPages: numPages });
      setPdfError(null);
    },
    [id, updateNodeData]
  );

  const handlePdfError = useCallback((error: Error) => {
    console.error('PDF load error:', error);
    setPdfError('Failed to load PDF');
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
    (coordinates: RegionCoordinates, pageNumber?: number) => {
      const newRegion: ExtractedRegion = {
        id: `region-${Date.now()}`,
        label: `Field ${data.regions.length + 1}`,
        selectionType: 'box',
        coordinates,
        pageNumber: pageNumber ?? data.currentPage,
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
      viewports: [],
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
          onDrop={handleFileDrop}
          onDragOver={handleDragOver}
        >
          {data.fileUrl ? (
            <FileNodePreview
              fileUrl={data.fileUrl}
              fileType={data.fileType}
              fileName={data.fileName || ''}
              currentPage={data.currentPage}
              totalPages={data.totalPages}
              itemCount={data.regions.length}
              itemLabel="field"
              onOpenClick={openModal}
              onConvertClick={convertToDisplay}
              convertLabel="Display"
              convertIcon="image"
              showThumbnail={true}
              thumbnailHeight={150}
              onPdfLoad={handlePdfLoad}
              onPdfError={handlePdfError}
              pdfError={pdfError}
            />
          ) : (
            <div className="p-2">
              <FileDropZone
                onFileSelect={handleFileSelect}
                onDrop={handleFileDrop}
                onDragOver={handleDragOver}
                compact
              />
            </div>
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
                Box
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
                  onPageOffsetsChange={setPageOffsets}
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
                      scrollMode={true}
                      pageOffsets={pageOffsets}
                    />
                  )}
                  {data.fileUrl && selectionMode === 'box' && (
                    <RegionSelector
                      onRegionCreate={handleRegionCreate}
                      width={VIEWER_WIDTH}
                      height={viewerHeight}
                      pageOffsets={pageOffsets}
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
              showOcrButton={false}
            />
          </CollapsiblePanel>
        </div>

        {/* Footer instructions */}
        <div className="px-4 py-2 bg-gray-100 border-t border-gray-200 text-xs text-gray-500 flex items-center justify-between">
          <span>
            {selectionMode === 'box'
              ? 'Draw a box to create a field.'
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
