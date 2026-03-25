import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useReactFlow } from '@xyflow/react';
import { useCanvasStore } from '../../store/canvasStore';
import { useToast } from '../ui/Toast';
import {
  defaultExtractorData,
  defaultDisplayData,
  defaultCalculationData,
  defaultSheetData,
  defaultLabelData,
} from './nodeDefaults';
import type { DisplayNodeData, ExtractorNodeData, CalculationNodeData, SheetNodeData, LabelNodeData } from '../../types';

interface ToolbarProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  focusName?: boolean;
  onFocusNameHandled?: () => void;
}

export function Toolbar({ onToggleSidebar, sidebarOpen, focusName, onFocusNameHandled }: ToolbarProps) {
  const addNode = useCanvasStore((state) => state.addNode);
  const saveToFile = useCanvasStore((state) => state.saveToFile);
  const loadFromFile = useCanvasStore((state) => state.loadFromFile);
  const canvasName = useCanvasStore((state) => state.canvasName);
  const setCanvasName = useCanvasStore((state) => state.setCanvasName);
  const toggleFileRegistry = useCanvasStore((state) => state.toggleFileRegistry);
  const fileRegistryOpen = useCanvasStore((state) => state.fileRegistryOpen);
  const { showToast } = useToast();
  const { screenToFlowPosition } = useReactFlow();
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focusName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
      onFocusNameHandled?.();
    }
  }, [focusName, onFocusNameHandled]);

  const handleAddNode = (
    type: 'display' | 'extractor' | 'calculation' | 'sheet' | 'label',
    data: DisplayNodeData | ExtractorNodeData | CalculationNodeData | SheetNodeData | LabelNodeData
  ) => {
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
      const errorMsg = result.error.startsWith('Invalid canvas file:')
        ? 'Invalid canvas file. The file may be corrupted or in an incompatible format.'
        : result.error;
      showToast(errorMsg, 'error');
      console.error('Load error details:', result.error);
    } else if (result.success) {
      showToast('Canvas loaded successfully', 'success');
    }
  };

  return (
    <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-white rounded-lg shadow-md p-2">
      {/* Sidebar toggle */}
      <button
        onClick={onToggleSidebar}
        className={`p-1.5 rounded transition-colors ${
          sidebarOpen
            ? 'bg-copper-400/20 text-copper-600'
            : 'text-bridge-400 hover:text-bridge-700 hover:bg-paper-100'
        }`}
        title="Toggle projects sidebar"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Back to site */}
      <Link
        to="/"
        className="p-1.5 text-bridge-400 hover:text-bridge-700 hover:bg-paper-100 rounded transition-colors"
        title="Back to home"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      </Link>

      <div className="w-px h-6 bg-paper-200" />

      {/* Canvas name + save/load */}
      <input
        ref={nameInputRef}
        type="text"
        value={canvasName}
        onChange={(e) => setCanvasName(e.target.value)}
        className="px-2 py-1 text-sm border border-paper-200 rounded w-32 focus:outline-none focus:ring-1 focus:ring-copper-400"
        title="Canvas name"
      />
      <button
        onClick={handleSave}
        className="p-1.5 text-bridge-400 hover:text-copper-500 hover:bg-copper-400/10 rounded transition-colors"
        title="Save canvas"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
          <polyline points="17 21 17 13 7 13 7 21" />
          <polyline points="7 3 7 8 15 8" />
        </svg>
      </button>
      <button
        onClick={handleLoad}
        className="p-1.5 text-bridge-400 hover:text-copper-500 hover:bg-copper-400/10 rounded transition-colors"
        title="Load canvas"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
          <line x1="3" y1="21" x2="21" y2="21" />
        </svg>
      </button>

      <div className="w-px h-6 bg-paper-200" />

      {/* Node creation buttons */}
      <button
        onClick={() => handleAddNode('extractor', defaultExtractorData)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm bg-paper-100 hover:bg-paper-200 rounded transition-colors"
        title="Add Extractor Node - Extract data from documents"
      >
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
        Extractor
      </button>
      <button
        onClick={() => handleAddNode('display', defaultDisplayData)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm bg-paper-100 hover:bg-paper-200 rounded transition-colors"
        title="Add Display Node - Visual reference for images and PDFs"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="18" rx="2" />
          <circle cx="8" cy="9" r="2.5" />
          <polyline points="22,17 16,11 10,17" />
          <polyline points="14,15 17,12 22,17" />
        </svg>
        Display
      </button>
      <button
        onClick={() => handleAddNode('calculation', defaultCalculationData)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm bg-paper-100 hover:bg-paper-200 rounded transition-colors"
        title="Add Calculation Node"
      >
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
        Calc
      </button>
      <button
        onClick={() => handleAddNode('sheet', defaultSheetData)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm bg-paper-100 hover:bg-paper-200 rounded transition-colors"
        title="Add Sheet Node"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="2" />
          <line x1="2" y1="8" x2="22" y2="8" />
          <line x1="2" y1="14" x2="22" y2="14" />
          <line x1="9" y1="2" x2="9" y2="22" />
          <line x1="16" y1="2" x2="16" y2="22" />
        </svg>
        Sheet
      </button>
      <button
        onClick={() => handleAddNode('label', defaultLabelData)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm bg-paper-100 hover:bg-paper-200 rounded transition-colors"
        title="Add Label Node"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 4.5A1.5 1.5 0 013.5 3h7.59a1.5 1.5 0 011.06.44l8.41 8.41a1.5 1.5 0 010 2.12l-7.59 7.59a1.5 1.5 0 01-2.12 0L2.44 13.15A1.5 1.5 0 012 12.09V4.5z" />
          <circle cx="7" cy="8" r="1.5" fill="currentColor" stroke="none" />
        </svg>
        Label
      </button>

      <div className="w-px h-6 bg-paper-200" />

      {/* File registry */}
      <button
        onClick={toggleFileRegistry}
        className={`px-3 py-1.5 text-sm rounded transition-colors ${
          fileRegistryOpen
            ? 'bg-copper-400/20 text-copper-600'
            : 'bg-paper-100 hover:bg-paper-200'
        }`}
        title="Toggle file registry panel"
      >
        Files
      </button>
    </div>
  );
}
