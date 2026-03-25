import { useCanvasStore } from '../../store/canvasStore';
import { useToast } from '../ui/Toast';

export interface SessionProject {
  id: string;
  name: string;
  lastModified: number;
  nodeCount: number;
}

interface ProjectSidebarProps {
  open: boolean;
  onClose: () => void;
  projects: SessionProject[];
  activeProjectId: string;
  onSwitchProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onCloneProject: (id: string) => void;
  onCreateProject: () => void;
}

function formatTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return 'just now';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function ProjectSidebar({
  open,
  onClose,
  projects,
  activeProjectId,
  onSwitchProject,
  onDeleteProject,
  onCloneProject,
  onCreateProject,
}: ProjectSidebarProps) {
  const { showToast } = useToast();
  const canvasName = useCanvasStore((state) => state.canvasName);

  return (
    <div
      className="h-full shrink-0 overflow-hidden transition-[max-width] duration-300 ease-in-out"
      style={{
        maxWidth: open ? '16rem' : '0',
        pointerEvents: open ? 'auto' : 'none',
      }}
    >
      <div className="w-64 h-full bg-white border-r border-paper-200 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-paper-100">
        <h2 className="text-sm font-semibold text-bridge-700">Projects</h2>
        <button
          onClick={onClose}
          className="p-1 text-bridge-400 hover:text-bridge-600 rounded hover:bg-paper-100 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Create button */}
      <div className="px-3 pt-3 pb-1">
        <button
          onClick={onCreateProject}
          className="flex items-center justify-center gap-1.5 w-full px-3 py-2 text-sm font-medium text-copper-500 bg-copper-400/10 hover:bg-copper-400/20 rounded-lg transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Canvas
        </button>
      </div>

      {/* Project list */}
      <div className="flex-1 overflow-y-auto py-2">
        {projects.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-bridge-400">
            No projects open
          </div>
        )}
        {projects.map((project) => {
          const isActive = project.id === activeProjectId;
          return (
            <div
              key={project.id}
              className={`mx-2 mb-1 rounded-lg transition-colors ${
                isActive
                  ? 'bg-copper-400/10 border border-copper-400'
                  : 'hover:bg-copper-400/10 border border-transparent'
              }`}
            >
              <button
                className="w-full text-left px-3 py-2.5 cursor-pointer"
                onClick={() => !isActive && onSwitchProject(project.id)}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium truncate ${isActive ? 'text-copper-600' : 'text-bridge-700'}`}>
                    {isActive ? canvasName : project.name}
                  </span>
                  {isActive && (
                    <span className="text-[10px] font-medium text-copper-500 bg-copper-400/20 px-1.5 py-0.5 rounded">
                      active
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-bridge-400">
                  <span>{project.nodeCount} nodes</span>
                  <span>{formatTime(project.lastModified)}</span>
                </div>
              </button>

              {/* Actions */}
              <div className="flex items-center gap-1 px-3 pb-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloneProject(project.id);
                    showToast('Project cloned', 'success');
                  }}
                  className="p-1 text-bridge-400 hover:text-bridge-600 rounded hover:bg-paper-100 transition-colors"
                  title="Clone project"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (projects.length <= 1 && isActive) {
                      showToast('Cannot delete the only project', 'warning');
                      return;
                    }
                    onDeleteProject(project.id);
                    showToast('Project removed', 'info');
                  }}
                  className="p-1 text-bridge-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors"
                  title="Remove project"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 2h4M2.5 4h11M5.5 4v8.5a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1V4M6.5 7v4M9.5 7v4" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}
