import { useCanvasStore } from '../../store/canvasStore';
import { BlobRegistry } from '../../store/canvasPersistence';
import type { ExtractorNodeData, CalculationNodeData, LabelNodeData, SheetNodeData } from '../../types/nodes';

export interface ToolResultContent {
  type: 'text' | 'image';
  text?: string;
  mimeType?: string;
  base64?: string;
}

export interface ToolExecutionResult {
  toolCallId: string;
  content: ToolResultContent[];
}

export async function executeToolCall(
  toolCallId: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<ToolExecutionResult> {
  const handler = toolHandlers[toolName];
  if (!handler) {
    return {
      toolCallId,
      content: [{ type: 'text', text: `Unknown tool: ${toolName}` }],
    };
  }

  const content = await handler(args);
  return { toolCallId, content };
}

type ToolHandler = (args: Record<string, unknown>) => Promise<ToolResultContent[]>;

const toolHandlers: Record<string, ToolHandler> = {
  async get_canvas_graph() {
    const { nodes, edges } = useCanvasStore.getState();

    const graph = {
      nodes: nodes.map((n) => {
        const base = { id: n.id, type: n.type, label: (n.data as { label?: string }).label ?? '' };

        if (n.type === 'extractor') {
          const data = n.data as ExtractorNodeData;
          return {
            ...base,
            fields: data.regions.map((r) => ({
              id: r.id,
              label: r.label,
              dataType: r.dataType,
              value: r.extractedData?.value ?? null,
            })),
          };
        }
        if (n.type === 'calculation') {
          const data = n.data as CalculationNodeData;
          return { ...base, operation: data.operation };
        }
        if (n.type === 'label') {
          const data = n.data as LabelNodeData;
          return { ...base, text: data.label };
        }
        if (n.type === 'sheet') {
          const data = n.data as SheetNodeData;
          return { ...base, columns: data.subheaders?.length ?? 0 };
        }
        return base;
      }),
      edges: edges.map((e) => ({
        source: e.source,
        sourceHandle: e.sourceHandle,
        target: e.target,
        targetHandle: e.targetHandle,
      })),
    };

    return [{ type: 'text' as const, text: JSON.stringify(graph, null, 2) }];
  },

  async get_node_details(args) {
    const nodeId = args.nodeId as string;
    const { nodes } = useCanvasStore.getState();
    const node = nodes.find((n) => n.id === nodeId);

    if (!node) {
      return [{ type: 'text' as const, text: `Node not found: ${nodeId}` }];
    }

    return [{ type: 'text' as const, text: JSON.stringify(node.data, null, 2) }];
  },

  async get_file_list() {
    const files = BlobRegistry.getAllMetadata().map((m) => ({
      fileId: m.fileId,
      fileName: m.fileName,
      mimeType: m.mimeType,
      size: m.size,
      fileType: m.fileType,
      nodeIds: Array.from(m.nodeIds),
    }));

    return [{ type: 'text' as const, text: JSON.stringify(files, null, 2) }];
  },

  async get_file_content(args) {
    const fileId = args.fileId as string;
    const blob = BlobRegistry.getBlob(fileId);
    const meta = BlobRegistry.getMetadata(fileId);

    if (!blob || !meta) {
      return [{ type: 'text' as const, text: `File not found: ${fileId}` }];
    }

    // Convert blob to base64
    const buffer = await blob.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    if (meta.fileType === 'image') {
      return [{ type: 'image' as const, mimeType: meta.mimeType, base64 }];
    }

    // For PDFs, return as image (first page would need rendering — return raw for now)
    return [{ type: 'image' as const, mimeType: meta.mimeType, base64 }];
  },

  async suggest_connection(args) {
    // This is a write operation — return confirmation, let the UI handle it
    return [{
      type: 'text' as const,
      text: JSON.stringify({
        status: 'suggested',
        sourceNodeId: args.sourceNodeId,
        sourceFieldId: args.sourceFieldId,
        targetNodeId: args.targetNodeId,
        targetHandle: args.targetHandle,
        reason: args.reason,
      }),
    }];
  },

  async create_region(args) {
    // Return the region spec — let the UI handle creation
    return [{
      type: 'text' as const,
      text: JSON.stringify({
        status: 'created',
        nodeId: args.nodeId,
        x: args.x,
        y: args.y,
        width: args.width,
        height: args.height,
        label: args.label,
        dataType: args.dataType,
      }),
    }];
  },
};
