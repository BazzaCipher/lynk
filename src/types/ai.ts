/** AI provider and settings types */

export type ProviderId = 'anthropic' | 'openai';

export interface AiProviderDefinition {
  id: ProviderId;
  name: string;
  models: AiModel[];
  apiKeyLabel: string;
  apiKeyPlaceholder: string;
}

export interface AiModel {
  id: string;
  name: string;
}

export interface AiProviderConfig {
  apiKey: string;
  verified: boolean;
  selectedModel: string;
}

export interface AiSettings {
  providers: Partial<Record<ProviderId, AiProviderConfig>>;
  activeProvider: ProviderId | null;
}

export interface AiMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiChatRequest {
  provider: ProviderId;
  model: string;
  apiKey: string;
  mode: 'detect_fields' | 'freeform' | 'auto_connect' | 'summarise';
  ocrText?: string;
  /** For auto_connect: describes nodes and their fields */
  nodesContext?: AiNodeContext[];
  messages: AiMessage[];
}

/** Describes a node and its fields for AI auto-connect */
export interface AiNodeContext {
  nodeId: string;
  nodeType: string;
  label: string;
  fields: Array<{
    id: string;
    label: string;
    dataType: string;
    value?: string;
  }>;
}

/** AI-suggested connection between two fields */
export interface AiConnectionSuggestion {
  sourceNodeId: string;
  sourceFieldId: string;
  targetNodeId: string;
  targetHandle: string;
  reason: string;
}

export interface AiDetectedField {
  text: string;
  confidence: number;
  fieldType: string;
  label: string;
  dataType: string;
  bbox?: { x: number; y: number; width: number; height: number };
}

/** Registry of supported providers */
export const AI_PROVIDERS: AiProviderDefinition[] = [
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    models: [
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
      { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5' },
    ],
    apiKeyLabel: 'API Key',
    apiKeyPlaceholder: 'sk-ant-...',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    ],
    apiKeyLabel: 'API Key',
    apiKeyPlaceholder: 'sk-...',
  },
];

export const DEFAULT_AI_SETTINGS: AiSettings = {
  providers: {},
  activeProvider: null,
};
