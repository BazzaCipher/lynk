import { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useCanvasStore } from '../store/canvasStore';
import { useToast } from '../components/ui/Toast';
import { useFileUpload } from './useFileUpload';
import { BlobRegistry } from '../store/canvasPersistence';

export function useCanvasDrop() {
  const addNode = useCanvasStore((state) => state.addNode);
  const pushHistory = useCanvasStore((state) => state.pushHistory);
  const { showToast } = useToast();
  const { screenToFlowPosition } = useReactFlow();

  const { processFile } = useFileUpload({
    onFileRegistered: () => {},
  });

  const handleCanvasDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleCanvasDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault();

      const files = event.dataTransfer.files;
      if (!files || files.length === 0) return;

      const promises = Array.from(files).map((file) => processFile(file));
      const processed = await Promise.all(promises);
      const results = processed.filter((r): r is NonNullable<typeof r> => r !== null);

      if (results.length === 0) {
        showToast('No valid files (PDF or images only)', 'warning');
        return;
      }

      const dropPosition = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const VERTICAL_SPACING = 350;

      pushHistory();

      results.forEach((result, index) => {
        const position = {
          x: dropPosition.x,
          y: dropPosition.y + index * VERTICAL_SPACING,
        };

        const nodeId = addNode('extractor', position, {
          label: result.fileName,
          fileId: result.fileId,
          fileUrl: result.fileUrl,
          fileName: result.fileName,
          fileType: result.fileType,
          currentPage: 1,
          totalPages: 1,
          regions: [],
        });

        BlobRegistry.addNodeReference(result.fileId, nodeId);
      });

      useCanvasStore.getState().refreshFileRegistry();
      showToast(`Created ${results.length} extractor node(s)`, 'success');
    },
    [screenToFlowPosition, addNode, pushHistory, showToast, processFile]
  );

  return { handleCanvasDragOver, handleCanvasDrop };
}
