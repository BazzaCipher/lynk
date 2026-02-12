import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { NodeProps } from '@xyflow/react';
import { useEdges, useReactFlow } from '@xyflow/react';
import { BaseNode } from './base/BaseNode';
import { DocumentViewer } from './file/DocumentViewer';
import { RegionSelector } from './file/RegionSelector';
import { ViewportOverlay } from './file/ViewportOverlay';
import { ViewportList } from './file/ViewportList';
import { FileNodePreview } from './file/FileNodePreview';
import { Modal } from '../ui/Modal';
import { CollapsiblePanel } from '../ui/CollapsiblePanel';
import { FileDropZone } from '../ui/FileDropZone';
import { useCanvasStore } from '../../store/canvasStore';
import { useFileUpload, type FileUploadResult } from '../../hooks/useFileUpload';
import { useNodeOutputs } from '../../hooks/useNodeOutputs';
import type {
  DisplayNode as DisplayNodeType,
  ExtractorNodeData,
  NodeOutput,
  RegionCoordinates,
  ViewportRegion,
  ViewportNodeData,
} from '../../types';
import { createImageView, createPdfView } from '../../types';

const VIEWER_WIDTH = 500;
const DEFAULT_WIDTH = 300;

export function DisplayNode({ id, data, selected }: NodeProps<DisplayNodeType>) {
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);
  const replaceNode = useCanvasStore((state) => state.replaceNode);
  const addEdge = useCanvasStore((state) => state.addEdge);
  const storeAddNode = useCanvasStore((state) => state.addNode);
  const removeEdge = useCanvasStore((state) => state.removeEdge);
  const edges = useEdges();
  const { getNode } = useReactFlow();
  const nodeOutputs = useNodeOutputs(id);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedViewportId, setSelectedViewportId] = useState<string | null>(null);
  const [viewerHeight, setViewerHeight] = useState(400);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pageOffsets, setPageOffsets] = useState<Map<number, number>>(new Map());

  // Get current page number from view target
  const currentPage = data.view.target.type === 'page' ? data.view.target.pageNumber : 1;
  const viewports = data.viewports || [];

  // Track viewer container dimensions for normalizing coordinates
  const viewerContainerRef = useRef<{ width: number; height: number }>({
    width: VIEWER_WIDTH,
    height: 400,
  });

  // ── Populate Exportable.outputs from viewports ──────────────────────────────
  const outputs = useMemo(() => {
    const map: Record<string, NodeOutput> = {};
    for (const viewport of viewports) {
      // Serialize viewport data as a JSON string for transport through the data flow system
      const value = JSON.stringify({
        fileUrl: data.fileUrl,
        fileType: data.fileType,
        normalizedRect: viewport.normalizedRect,
        pageNumber: viewport.pageNumber,
      });

      map[viewport.id] = {
        value,
        dataType: 'string',
        label: viewport.label,
      };
    }
    return map;
  }, [viewports, data.fileUrl, data.fileType]);

  // Sync outputs to node data
  useEffect(() => {
    if (Object.keys(outputs).length > 0) {
      nodeOutputs.update(outputs);
    } else {
      nodeOutputs.clearAll();
    }
  }, [outputs, nodeOutputs]);

  // ── File handling ──────────────────────────────────────────────────────────
  const onFileRegistered = useCallback(
    (result: FileUploadResult) => {
      if (result.fileType === 'image') {
        const img = new Image();
        img.onload = () => {
          const aspectRatio = img.naturalWidth / img.naturalHeight;
          let width = DEFAULT_WIDTH;
          let height = width / aspectRatio;
          if (height > 600) {
            height = 600;
            width = height * aspectRatio;
          }
          updateNodeData(id, {
            fileUrl: result.fileUrl,
            fileId: result.fileId,
            fileName: result.fileName,
            fileType: 'image',
            view: createImageView(Math.round(width), Math.round(height)),
            totalPages: 1,
            viewports: [],
            documentSize: { width: img.naturalWidth, height: img.naturalHeight },
          });
        };
        img.src = result.fileUrl;
      } else {
        updateNodeData(id, {
          fileUrl: result.fileUrl,
          fileId: result.fileId,
          fileName: result.fileName,
          fileType: 'pdf',
          view: createPdfView(1, 400, 300),
          totalPages: 1,
          viewports: [],
        });
      }
    },
    [id, updateNodeData]
  );

  const { handleFileSelect, handleFileDrop, handleDragOver } = useFileUpload({ onFileRegistered });

  // ── PDF handling ──────────────────────────────────────────────────────────
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

  const handleModalPageChange = useCallback(
    (page: number) => {
      updateNodeData(id, {
        view: {
          ...data.view,
          target: { type: 'page', pageNumber: page },
        },
      });
    },
    [id, data.view, updateNodeData]
  );

  const handleDocumentLoad = useCallback(
    (numPages: number) => {
      updateNodeData(id, { totalPages: numPages });
      // Set initial viewer height based on typical document aspect ratio
      setViewerHeight(VIEWER_WIDTH * 1.4);
    },
    [id, updateNodeData]
  );

  const handleContentResize = useCallback(
    (width: number, height: number) => {
      viewerContainerRef.current = { width, height };
      setViewerHeight(height);
      // Track document size for viewports (PDF only - images set this on load)
      if (data.fileType === 'pdf' && (!data.documentSize || data.documentSize.width !== width || data.documentSize.height !== height)) {
        updateNodeData(id, { documentSize: { width, height } });
      }
    },
    [id, data.fileType, data.documentSize, updateNodeData]
  );

  // ── Viewport region creation ──────────────────────────────────────────────
  const handleViewportCreate = useCallback(
    (coordinates: RegionCoordinates) => {
      const { width: containerW, height: containerH } = viewerContainerRef.current;

      // Normalize pixel coordinates to 0-1 range
      const normalizedRect = {
        x: coordinates.x / containerW,
        y: coordinates.y / containerH,
        width: coordinates.width / containerW,
        height: coordinates.height / containerH,
      };

      const newViewport: ViewportRegion = {
        id: `viewport-${Date.now()}`,
        label: `Viewport ${viewports.length + 1}`,
        normalizedRect,
        pixelRect: coordinates,
        pageNumber: currentPage,
      };

      const newViewports = [...viewports, newViewport];
      updateNodeData(id, { viewports: newViewports });
      setSelectedViewportId(newViewport.id);

      // Auto-spawn ViewportNode + create connecting edge
      const thisNode = getNode(id);
      const nodeX = thisNode?.position?.x ?? 0;
      const nodeY = thisNode?.position?.y ?? 0;
      const spawnX = nodeX + data.view.nodeSize.width + 100;
      const spawnY = nodeY + (newViewports.length - 1) * 220;

      // Determine size based on aspect ratio of the crop
      // Use pixel coordinates directly - they preserve the correct aspect ratio
      // (normalized coords are ratios against different dimensions, so dividing them doesn't give true aspect)
      const cropAspect = coordinates.width / coordinates.height;
      const MAX_SPAWN_SIZE = 350;
      let viewportWidth = 250;
      let viewportHeight = Math.round(viewportWidth / cropAspect);

      // Cap on spawn only - user can resize past this limit afterwards
      if (viewportHeight > MAX_SPAWN_SIZE) {
        viewportHeight = MAX_SPAWN_SIZE;
        viewportWidth = Math.round(viewportHeight * cropAspect);
      }
      if (viewportWidth > MAX_SPAWN_SIZE) {
        viewportWidth = MAX_SPAWN_SIZE;
        viewportHeight = Math.round(viewportWidth / cropAspect);
      }

      const viewportNodeData: ViewportNodeData = {
        label: newViewport.label,
        fileUrl: data.fileUrl,
        fileType: data.fileType,
        normalizedRect: newViewport.normalizedRect,
        pageNumber: newViewport.pageNumber,
        nodeSize: { width: viewportWidth, height: viewportHeight },
        aspectLocked: true,
      };

      const viewportNodeId = storeAddNode(
        'viewport',
        { x: spawnX, y: spawnY },
        viewportNodeData
      );

      // Create connecting edge to ViewportNode
      addEdge({
        id: `edge-${id}-${newViewport.id}-${viewportNodeId}`,
        source: id,
        sourceHandle: newViewport.id,
        target: viewportNodeId,
        targetHandle: 'viewport-in',
      });
    },
    [id, viewports, currentPage, data.fileUrl, data.fileType, data.view.nodeSize, updateNodeData, storeAddNode, getNode, addEdge]
  );

  // ── Viewport management ───────────────────────────────────────────────────
  const handleViewportSelect = useCallback((viewportId: string) => {
    setSelectedViewportId(viewportId);
  }, []);

  const handleViewportDelete = useCallback(
    (viewportId: string) => {
      // Remove connected edges
      const outgoingEdges = edges.filter(
        (e) => e.source === id && e.sourceHandle === viewportId
      );
      for (const edge of outgoingEdges) {
        // Also remove the connected ViewportNode
        const targetNode = getNode(edge.target);
        if (targetNode && targetNode.type === 'viewport') {
          useCanvasStore.getState().removeNode(edge.target);
        }
        removeEdge(edge.id);
      }

      updateNodeData(id, {
        viewports: viewports.filter((v) => v.id !== viewportId),
      });
      if (selectedViewportId === viewportId) {
        setSelectedViewportId(null);
      }
    },
    [id, viewports, edges, selectedViewportId, updateNodeData, removeEdge, getNode]
  );

  const handleViewportLabelChange = useCallback(
    (viewportId: string, label: string) => {
      updateNodeData(id, {
        viewports: viewports.map((v) =>
          v.id === viewportId ? { ...v, label } : v
        ),
      });
    },
    [id, viewports, updateNodeData]
  );

  // ── Modal ─────────────────────────────────────────────────────────────────
  const openModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  // ── Convert to ExtractorNode ──────────────────────────────────────────────
  const convertToExtractor = useCallback(() => {
    const extractorCurrentPage = data.view.target.type === 'page'
      ? data.view.target.pageNumber
      : 1;

    const extractorData: ExtractorNodeData = {
      label: data.label,
      fileType: data.fileType,
      fileUrl: data.fileUrl,
      fileId: data.fileId,
      fileName: data.fileName,
      regions: data.cachedExtractorEdges?.regions || [],
      currentPage: extractorCurrentPage,
      totalPages: data.totalPages,
    };

    // Remove viewport edges before converting
    const outgoingEdges = edges.filter((e) => e.source === id);
    for (const edge of outgoingEdges) {
      removeEdge(edge.id);
    }

    replaceNode(id, 'extractor', {
      ...extractorData,
      cachedExtractorEdges: undefined, // Don't carry over to extractor
    } as unknown as ExtractorNodeData);

    // Restore cached extractor edges if available
    if (data.cachedExtractorEdges?.edges) {
      for (const cached of data.cachedExtractorEdges.edges) {
        addEdge({
          id: cached.id,
          source: id,
          sourceHandle: cached.sourceHandle,
          target: cached.target,
          targetHandle: cached.targetHandle,
        });
      }
    }
  }, [id, data, edges, replaceNode, addEdge, removeEdge]);

  // ── Empty state ───────────────────────────────────────────────────────────
  if (!data.fileUrl) {
    return (
      <BaseNode label={data.label} selected={selected} className="w-[280px]">
        <div className="p-2">
          <FileDropZone
            onFileSelect={handleFileSelect}
            onDrop={handleFileDrop}
            onDragOver={handleDragOver}
            compact
          />
        </div>
      </BaseNode>
    );
  }

  // ── Loaded state ──────────────────────────────────────────────────────────
  return (
    <>
      {/* Main node with preview + viewport list */}
      <BaseNode label={data.label} selected={selected} className="w-[280px]">
        {/* Document preview using shared component */}
        <FileNodePreview
          fileUrl={data.fileUrl}
          fileType={data.fileType}
          fileName={data.fileName || ''}
          currentPage={currentPage}
          totalPages={data.totalPages}
          itemCount={viewports.length}
          itemLabel="viewport"
          onOpenClick={openModal}
          onConvertClick={convertToExtractor}
          convertLabel="Extractor"
          convertIcon="document"
          showThumbnail={true}
          thumbnailHeight={Math.min(data.view.nodeSize.height, 200)}
          onPdfLoad={handlePdfLoad}
          onPdfError={handlePdfError}
          pdfError={pdfError}
        />

        {/* Compact viewport list with source handles */}
        <ViewportList
          viewports={viewports}
          selectedViewportId={selectedViewportId}
          onViewportSelect={handleViewportSelect}
          onViewportDelete={handleViewportDelete}
          onViewportLabelChange={handleViewportLabelChange}
          compact
          nodeId={id}
        />
      </BaseNode>

      {/* Document viewer modal with region selector */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={data.fileName || 'Document Viewer'}
        className="w-[950px] max-w-[95vw]"
      >
        <div className="flex h-[75vh]">
          {/* Document viewer area */}
          <div className="flex-1 overflow-auto bg-gray-50">
            {/* Instruction bar */}
            <div className="sticky top-0 z-10 flex items-center justify-center gap-2 py-2 px-4 bg-white border-b border-gray-200 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 2h10v10H5V5z" />
              </svg>
              <span className="text-xs text-gray-600">
                Draw a box to create a viewport region
              </span>
            </div>

            {/* Document with overlays */}
            <div className="relative p-6 flex justify-center">
              <div className="relative bg-white shadow-lg">
                <DocumentViewer
                  fileUrl={data.fileUrl ?? null}
                  fileType={data.fileType}
                  currentPage={currentPage}
                  totalPages={data.totalPages}
                  onPageChange={handleModalPageChange}
                  onDocumentLoad={handleDocumentLoad}
                  onContentResize={handleContentResize}
                  onPageOffsetsChange={setPageOffsets}
                  enableTextSelection={false}
                  width={VIEWER_WIDTH}
                  scrollMode={false}
                >
                  {/* Viewport overlays */}
                  {data.fileUrl && (
                    <ViewportOverlay
                      viewports={viewports}
                      currentPage={currentPage}
                      selectedViewportId={selectedViewportId}
                      onViewportSelect={handleViewportSelect}
                      interactive
                      nodeId={id}
                    />
                  )}
                  {/* Box selection for creating viewports */}
                  {data.fileUrl && (
                    <RegionSelector
                      onRegionCreate={handleViewportCreate}
                      width={VIEWER_WIDTH}
                      height={viewerHeight}
                      pageOffsets={pageOffsets}
                    />
                  )}
                </DocumentViewer>
              </div>
            </div>
          </div>

          {/* Collapsible viewports panel */}
          <CollapsiblePanel
            title="Viewports"
            badge={viewports.length}
            defaultOpen={true}
            side="right"
          >
            <ViewportList
              viewports={viewports}
              selectedViewportId={selectedViewportId}
              onViewportSelect={handleViewportSelect}
              onViewportDelete={handleViewportDelete}
              onViewportLabelChange={handleViewportLabelChange}
              nodeId={id}
            />
          </CollapsiblePanel>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-gray-100 border-t border-gray-200 text-xs text-gray-500 flex items-center justify-between">
          <span>
            Draw a box on the document to create a viewport. Each viewport spawns a connected node.
          </span>
          <span className="text-gray-400">
            {viewports.length} viewport{viewports.length !== 1 ? 's' : ''}
          </span>
        </div>
      </Modal>
    </>
  );
}
