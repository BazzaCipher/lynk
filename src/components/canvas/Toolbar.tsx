import { useCanvasStore } from '../../store/canvasStore';
import type { FileNodeData, CalculationNodeData, SheetNodeData, LabelNodeData } from '../../types';

const defaultFileData: FileNodeData = {
  label: 'File',
  fileType: 'pdf',
  fileName: undefined,
  fileUrl: undefined,
  regions: [],
  currentPage: 1,
  totalPages: 1,
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

  const handleAddNode = (
    type: 'file' | 'calculation' | 'sheet' | 'label',
    data: FileNodeData | CalculationNodeData | SheetNodeData | LabelNodeData
  ) => {
    // Add node at a random position in the viewport
    const position = {
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 200,
    };
    addNode(type, position, data);
  };

  const handleLoad = async () => {
    const result = await loadFromFile();
    if (!result.success && result.error) {
      alert(result.error);
    }
  };

  const handleClear = () => {
    if (confirm('Clear the canvas? This cannot be undone.')) {
      clearCanvas();
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
        onClick={() => handleAddNode('file', defaultFileData)}
        className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
        title="Add File Node"
      >
        + File
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
        onClick={saveToFile}
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
