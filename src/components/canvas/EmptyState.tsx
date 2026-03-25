import { templates } from '../../data/templates';
import { useCanvasStore } from '../../store/canvasStore';

export function EmptyState() {
  const importCanvas = useCanvasStore((state) => state.importCanvas);

  const handleSelectTemplate = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;
    importCanvas(template.canvas);
  };

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
      <div className="pointer-events-auto bg-white rounded-2xl shadow-xl border border-paper-100 p-8 max-w-2xl w-full mx-4">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-semibold text-bridge-800 mb-2">Welcome to Paperbridge</h2>
          <p className="text-bridge-500">
            Drop a PDF or image to start extracting data, or begin with a template.
          </p>
        </div>

        <div className="grid gap-3">
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => handleSelectTemplate(template.id)}
              className="text-left p-4 rounded-lg border border-paper-200 hover:border-copper-400 hover:bg-copper-400/10 transition-colors group"
            >
              <div className="font-medium text-bridge-800 group-hover:text-copper-600">
                {template.name}
              </div>
              <div className="text-sm text-bridge-500 mt-1">
                {template.description}
              </div>
              <div className="flex gap-1.5 mt-2">
                {template.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-0.5 bg-paper-100 text-bridge-500 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-bridge-400 mt-5">
          You can also use the toolbar above to add nodes manually.
        </p>
      </div>
    </div>
  );
}
