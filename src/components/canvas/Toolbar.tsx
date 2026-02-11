import { useReactFlow } from '@xyflow/react';
import { useCanvasStore } from '../../store/canvasStore';
import { useToast } from '../ui/Toast';
import type { DisplayNodeData, ExtractorNodeData, CalculationNodeData, SheetNodeData, LabelNodeData } from '../../types';
import { createImageView } from '../../types';

const defaultExtractorData: ExtractorNodeData = {
  label: 'Extractor',
  fileType: 'pdf',
  fileName: undefined,
  fileUrl: undefined,
  regions: [],
  currentPage: 1,
  totalPages: 1,
};

const defaultDisplayData: DisplayNodeData = {
  label: 'Display',
  fileType: 'image',
  fileUrl: undefined,
  fileId: undefined,
  fileName: undefined,
  view: createImageView(300, 200),
  totalPages: 1,
  viewports: [],
};

const defaultCalculationData: CalculationNodeData = {
  label: 'Calculation',
  operation: 'sum',  // Default to sum (references operation registry)
  precision: 2,
  inputs: [],
  result: undefined,
  inputCache: {},  // Initialize empty input cache for operation switching
};

const defaultSheetData: SheetNodeData = {
  label: 'Sheet',
  subheaders: [],
};

const defaultLabelData: LabelNodeData = {
  label: 'Label',
  format: 'number',
  value: undefined,
  fontSize: 'medium',
  alignment: 'center',
};

export function Toolbar() {
  const addNode = useCanvasStore((state) => state.addNode);
  const saveToFile = useCanvasStore((state) => state.saveToFile);
  const loadFromFile = useCanvasStore((state) => state.loadFromFile);
  const clearCanvas = useCanvasStore((state) => state.clearCanvas);
  const canvasName = useCanvasStore((state) => state.canvasName);
  const setCanvasName = useCanvasStore((state) => state.setCanvasName);
  const { showToast } = useToast();
  const { screenToFlowPosition } = useReactFlow();

  const handleAddNode = (
    type: 'display' | 'extractor' | 'calculation' | 'sheet' | 'label',
    data: DisplayNodeData | ExtractorNodeData | CalculationNodeData | SheetNodeData | LabelNodeData
  ) => {
    // Add node at the center of the visible canvas with a small random offset
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const position = screenToFlowPosition({
      x: centerX + (Math.random() - 0.5) * 100,
      y: centerY + (Math.random() - 0.5) * 100,
    });
    addNode(type, position, data);
  };

  const handleSave = async () => {
    const result = await saveToFile();
    if (!result.success) {
      showToast('Save failed: ' + result.warnings.join(', '), 'error');
    } else if (result.warnings.length > 0) {
      showToast('Saved with warnings: ' + result.warnings.join(', '), 'warning');
    } else {
      showToast('Canvas saved successfully', 'success');
    }
  };

  const handleLoad = async () => {
    const result = await loadFromFile();
    if (!result.success && result.error) {
      // Format the error message for readability
      const errorMsg = result.error.startsWith('Invalid canvas file:')
        ? 'Invalid canvas file. The file may be corrupted or in an incompatible format.'
        : result.error;
      showToast(errorMsg, 'error');
      console.error('Load error details:', result.error);
    } else if (result.success) {
      showToast('Canvas loaded successfully', 'success');
    }
  };

  const handleClear = () => {
    if (confirm('Clear the canvas? This cannot be undone.')) {
      clearCanvas();
      showToast('Canvas cleared', 'info');
    }
  };

  return (
    <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-white rounded-lg shadow-md p-2">
      {/* Canvas name input */}
      <input
        type="text"
        value={canvasName}
        onChange={(e) => setCanvasName(e.target.value)}
        className="px-2 py-1 text-sm border border-gray-200 rounded w-32 focus:outline-none focus:ring-1 focus:ring-blue-400"
        title="Canvas name"
      />

      <div className="w-px h-6 bg-gray-200" />

      {/* Node creation buttons */}
      <button
        onClick={() => handleAddNode('extractor', defaultExtractorData)}
        className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
        title="Add Extractor Node - Extract data from documents"
      >
        + Extractor
      </button>
      <button
        onClick={() => handleAddNode('display', defaultDisplayData)}
        className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
        title="Add Display Node - Visual reference for images and PDFs"
      >
        + Display
      </button>
      <button
        onClick={() => handleAddNode('calculation', defaultCalculationData)}
        className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
        title="Add Calculation Node"
      >
        + Calc
      </button>
      <button
        onClick={() => handleAddNode('sheet', defaultSheetData)}
        className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
        title="Add Sheet Node"
      >
        + Sheet
      </button>
      <button
        onClick={() => handleAddNode('label', defaultLabelData)}
        className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
        title="Add Label Node"
      >
        + Label
      </button>

      <div className="w-px h-6 bg-gray-200" />

      {/* File operations */}
      <button
        onClick={handleSave}
        className="px-3 py-1.5 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
        title="Save canvas to file"
      >
        Save
      </button>
      <button
        onClick={handleLoad}
        className="px-3 py-1.5 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
        title="Load canvas from file"
      >
        Load
      </button>
      <button
        onClick={handleClear}
        className="px-3 py-1.5 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
        title="Clear canvas"
      >
        Clear
      </button>
    </div>
  );
}
