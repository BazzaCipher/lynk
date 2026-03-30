import type { AiToolDefinition } from './adapters/types';

/** All available tool definitions in provider-agnostic format */
const TOOL_DEFINITIONS: AiToolDefinition[] = [
  {
    name: 'get_canvas_graph',
    description: 'Get the simplified canvas graph: all nodes (id, type, label, fields summary) and edges (source→target with handles). Use this to understand the current document processing layout.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_node_details',
    description: 'Get full details for a specific node: regions with coordinates, extracted values, data types, and confidence scores.',
    parameters: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'The node ID to get details for' },
      },
      required: ['nodeId'],
    },
  },
  {
    name: 'get_file_list',
    description: 'Get the list of files in the project: name, MIME type, size, and associated node ID.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_file_content',
    description: 'Get a file\'s content. Returns the file as a base64 image (for images) or OCR text (for PDFs). Use this to visually inspect documents.',
    parameters: {
      type: 'object',
      properties: {
        fileId: { type: 'string', description: 'The file ID to retrieve' },
      },
      required: ['fileId'],
    },
  },
  {
    name: 'suggest_connection',
    description: 'Propose a connection between two nodes on the canvas.',
    parameters: {
      type: 'object',
      properties: {
        sourceNodeId: { type: 'string', description: 'Source node ID' },
        sourceFieldId: { type: 'string', description: 'Source field/region ID (used as output handle)' },
        targetNodeId: { type: 'string', description: 'Target node ID' },
        targetHandle: { type: 'string', description: 'Target handle name (e.g. "input-0", "label-in")' },
        reason: { type: 'string', description: 'Brief reason for this connection' },
      },
      required: ['sourceNodeId', 'sourceFieldId', 'targetNodeId', 'targetHandle', 'reason'],
    },
  },
  {
    name: 'create_region',
    description: 'Create an extraction region on an extractor node to extract a field from the document.',
    parameters: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'Extractor node ID' },
        x: { type: 'number', description: 'X coordinate (pixels from left)' },
        y: { type: 'number', description: 'Y coordinate (pixels from top)' },
        width: { type: 'number', description: 'Region width in pixels' },
        height: { type: 'number', description: 'Region height in pixels' },
        label: { type: 'string', description: 'Human-readable label for the field' },
        dataType: { type: 'string', description: 'Data type: "string", "number", "date", "currency", or "boolean"' },
      },
      required: ['nodeId', 'x', 'y', 'width', 'height', 'label', 'dataType'],
    },
  },
];

const toolMap = new Map(TOOL_DEFINITIONS.map((t) => [t.name, t]));

export function getAllToolDefinitions(): AiToolDefinition[] {
  return TOOL_DEFINITIONS;
}

export function getToolsByNames(names: string[]): AiToolDefinition[] {
  return names.map((n) => toolMap.get(n)).filter((t): t is AiToolDefinition => !!t);
}
