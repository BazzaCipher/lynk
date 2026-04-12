import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { useAiSettings } from '../../hooks/useAiSettings';
import { AiSettingsModal } from './AiSettingsModal';
import { askAI, detectFieldsWithAI, autoConnectWithAI } from '../../services/aiService';
import { useCanvasStore } from '../../store/canvasStore';
import { BlobRegistry } from '../../store/canvasPersistence';
import { extractFullPage } from '../../core/extraction/ocrExtractor';
import { AI_IMAGE_SIZE_LIMIT } from '../../config/ai';
import type { AiMessage, AiDetectedField, AiNodeContext, AiConnectionSuggestion } from '../../types/ai';
import type { ExtractorNodeData, CalculationNodeData, LabelNodeData, SheetNodeData } from '../../types/nodes';

interface AiPromptPanelProps {
  context: 'canvas' | 'extractor';
  /** OCR text for extractor context */
  ocrText?: string;
  onFieldsDetected?: (fields: AiDetectedField[]) => void;
  /** Called when detect fields is triggered on canvas (caller handles per-node OCR) */
  onCanvasDetect?: () => void;
  /** Called when AI suggests connections on canvas */
  onConnectionsSuggested?: (suggestions: AiConnectionSuggestion[]) => void;
  /** Render flat (no card border/shadow/fixed width) for use in a docked bottom strip */
  docked?: boolean;
}

/** Build node context from canvas store for AI auto-connect / summarise */
function gatherNodesContext(): AiNodeContext[] {
  const { nodes } = useCanvasStore.getState();
  const contexts: AiNodeContext[] = [];

  for (const node of nodes) {
    if (node.type === 'extractor') {
      const data = node.data as ExtractorNodeData;
      contexts.push({
        nodeId: node.id,
        nodeType: 'extractor',
        label: data.label,
        fields: data.regions.map((r) => ({
          id: r.id,
          label: r.label,
          dataType: r.dataType,
          value: String(r.extractedData.value || ''),
        })),
      });
    } else if (node.type === 'calculation') {
      const data = node.data as CalculationNodeData;
      contexts.push({
        nodeId: node.id,
        nodeType: 'calculation',
        label: data.label,
        fields: [{ id: 'result', label: data.operation, dataType: 'number' }],
      });
    } else if (node.type === 'label') {
      const data = node.data as LabelNodeData;
      contexts.push({
        nodeId: node.id,
        nodeType: 'label',
        label: data.label,
        fields: [{ id: 'label-in', label: data.label, dataType: data.format ?? 'string' }],
      });
    } else if (node.type === 'sheet') {
      const data = node.data as SheetNodeData;
      contexts.push({
        nodeId: node.id,
        nodeType: 'sheet',
        label: data.label,
        fields: data.subheaders?.flatMap((sh) =>
          sh.entries.map((e) => ({
            id: e.id,
            label: e.label,
            dataType: 'number',
          }))
        ) ?? [],
      });
    }
  }
  return contexts;
}

/** Get ALL image files from extractor nodes for vision-based detect */
async function getExtractorImages(): Promise<Array<{ mimeType: string; base64: string; size: number }>> {
  const { nodes } = useCanvasStore.getState();
  const results: Array<{ mimeType: string; base64: string; size: number }> = [];

  for (const node of nodes) {
    if (node.type !== 'extractor') continue;
    const data = node.data as ExtractorNodeData;
    const fileId = data.fileId;
    if (!fileId) continue;

    const blob = BlobRegistry.getBlob(fileId);
    const meta = BlobRegistry.getMetadata(fileId);
    if (!blob || !meta) continue;

    const buffer = await blob.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(buffer).reduce((d, byte) => d + String.fromCharCode(byte), '')
    );
    results.push({ mimeType: meta.mimeType, base64, size: meta.size });
  }
  return results;
}

export function AiPromptPanel({
  context,
  ocrText,
  onFieldsDetected,
  onCanvasDetect,
  onConnectionsSuggested,
  docked = false,
}: AiPromptPanelProps) {
  const { activeProvider, activeConfig, enabledProviders } = useAiSettings();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeToolCall, setActiveToolCall] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, response]);

  // Resolve human-readable model name
  const modelDisplayName = useMemo(() => {
    if (!activeProvider || !activeConfig?.selectedModel) return null;
    const model = activeProvider.models.find((m) => m.id === activeConfig.selectedModel);
    return model?.name ?? activeConfig.selectedModel;
  }, [activeProvider, activeConfig]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !activeProvider || !activeConfig) return;

    const question = input.trim();
    setInput('');
    setError(null);
    setIsLoading(true);

    const newMessages: AiMessage[] = [...messages, { role: 'user', content: question }];
    setMessages(newMessages);

    // Add a placeholder assistant message for streaming
    const streamingIdx = newMessages.length;
    setMessages([...newMessages, { role: 'assistant', content: '' }]);

    try {
      const reply = await askAI(
        question,
        ocrText,
        activeProvider.id,
        activeConfig.selectedModel,
        activeConfig.apiKey,
        messages,
        {
          stream: true,
          onChunk: (chunk) => {
            setMessages((prev) => {
              const updated = [...prev];
              if (updated[streamingIdx]) {
                updated[streamingIdx] = {
                  ...updated[streamingIdx],
                  content: updated[streamingIdx].content + chunk,
                };
              }
              return updated;
            });
          },
          onToolCall: (toolName) => setActiveToolCall(toolName),
        }
      );
      setActiveToolCall(null);
      // Finalize with the complete reply
      setMessages([...newMessages, { role: 'assistant', content: reply }]);
      setResponse(reply);
    } catch (err) {
      setActiveToolCall(null);
      // Remove the placeholder on error
      setMessages(newMessages);
      setError(err instanceof Error ? err.message : 'Failed to get response');
    } finally {
      setIsLoading(false);
    }
  }, [input, activeProvider, activeConfig, messages, ocrText]);

  const handleDetectFields = useCallback(async () => {
    if (context === 'canvas') {
      // Try vision-based detection for canvas context
      if (!activeProvider || !activeConfig) {
        onCanvasDetect?.();
        return;
      }

      setIsDetecting(true);
      setError(null);

      try {
        const allImages = await getExtractorImages();

        if (allImages.length === 0) {
          // No images found, fall back to caller
          onCanvasDetect?.();
          setIsDetecting(false);
          return;
        }

        // Split images into small (vision) and large (OCR) groups
        const smallImages = allImages.filter((img) => img.size <= AI_IMAGE_SIZE_LIMIT);
        const largeImages = allImages.filter((img) => img.size > AI_IMAGE_SIZE_LIMIT);

        let fields: AiDetectedField[] = [];

        // Process small images: send all together to vision model
        if (smallImages.length > 0) {
          const visionFields = await detectFieldsWithAI(
            { images: smallImages.map((img) => ({ mimeType: img.mimeType, base64: img.base64 })) },
            activeProvider.id,
            activeConfig.selectedModel,
            activeConfig.apiKey
          );
          fields.push(...visionFields);
        }

        // Process large images: run Tesseract OCR on each, combine words
        if (largeImages.length > 0) {
          const allOcrWords: import('../../core/extraction/ocrExtractor').OcrWord[] = [];
          const allOcrTexts: string[] = [];

          for (const imageData of largeImages) {
            const img = new Image();
            img.src = `data:${imageData.mimeType};base64,${imageData.base64}`;
            await new Promise((resolve) => { img.onload = resolve; });
            const ocrResult = await extractFullPage(img);
            allOcrWords.push(...ocrResult.words);
            allOcrTexts.push(ocrResult.text);
          }

          const ocrFields = await detectFieldsWithAI(
            { ocrWords: allOcrWords, ocrText: allOcrTexts.join('\n\n---\n\n') },
            activeProvider.id,
            activeConfig.selectedModel,
            activeConfig.apiKey
          );
          fields.push(...ocrFields);
        }

        onFieldsDetected?.(fields);
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: `Detected ${fields.length} field(s) across ${allImages.length} document(s):\n${fields.map((f) => `- **${f.label}**: ${f.text}`).join('\n')}`,
        }]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Detection failed');
      } finally {
        setIsDetecting(false);
      }
      return;
    }

    if (!ocrText || !activeProvider || !activeConfig) return;

    setIsDetecting(true);
    setError(null);

    try {
      const fields = await detectFieldsWithAI(
        { ocrText },
        activeProvider.id,
        activeConfig.selectedModel,
        activeConfig.apiKey
      );
      onFieldsDetected?.(fields);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Detection failed');
    } finally {
      setIsDetecting(false);
    }
  }, [context, ocrText, activeProvider, activeConfig, onFieldsDetected, onCanvasDetect]);

  const handleAutoConnect = useCallback(async () => {
    if (!activeProvider || !activeConfig) return;

    const nodesContext = gatherNodesContext();
    if (nodesContext.length < 2) {
      setError('Need at least 2 nodes with fields to auto-connect');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const suggestions = await autoConnectWithAI(
        nodesContext,
        activeProvider.id,
        activeConfig.selectedModel,
        activeConfig.apiKey
      );

      if (suggestions.length === 0) {
        setMessages((prev) => [...prev, { role: 'assistant', content: 'No connections suggested — the fields don\'t appear to have matching relationships.' }]);
      } else {
        onConnectionsSuggested?.(suggestions);
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: `Connected ${suggestions.length} field(s):\n${suggestions.map((s) => `• ${s.reason}`).join('\n')}`,
        }]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auto-connect failed');
    } finally {
      setIsConnecting(false);
    }
  }, [activeProvider, activeConfig, onConnectionsSuggested]);

const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasProvider = enabledProviders.length > 0;

  const outerStyle = docked
    ? undefined
    : (context === 'canvas' ? { width: 320, maxHeight: 400 } : { width: '100%', maxHeight: 300 });
  const outerClass = docked
    ? 'flex flex-col bg-white overflow-hidden'
    : 'flex flex-col bg-white border border-paper-200 rounded-lg shadow-lg overflow-hidden';

  return (
    <>
      <div className={outerClass} style={outerStyle}>
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-paper-200 bg-paper-50">
          <span className="text-xs font-medium text-bridge-900 flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-copper-500" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" />
            </svg>
            AI Assistant
          </span>
          <div className="flex items-center gap-1">
            {activeProvider && (
              <span className="text-[10px] text-bridge-400 px-1.5 py-0.5 bg-paper-100 rounded">
                {activeProvider.name}{modelDisplayName ? ` · ${modelDisplayName}` : ''}
              </span>
            )}
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-1 text-bridge-400 hover:text-copper-500 transition-colors"
              title="AI Settings"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        {!hasProvider ? (
          /* No provider configured */
          <div className="p-4 text-center">
            <p className="text-xs text-bridge-400 mb-2">No AI provider configured</p>
            <button
              onClick={() => setSettingsOpen(true)}
              className="px-3 py-1.5 text-xs rounded-md bg-copper-500 text-white hover:bg-copper-600 transition-colors"
            >
              Configure AI
            </button>
          </div>
        ) : (
          <>
            {/* Messages area */}
            {messages.length > 0 && (
              <div className="flex-1 overflow-auto px-3 py-2 space-y-2 min-h-0" style={{ maxHeight: docked ? 120 : 200 }}>
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`text-xs rounded-md px-2.5 py-1.5 max-w-[90%] ${
                      msg.role === 'user'
                        ? 'bg-copper-400/10 text-bridge-900 ml-auto'
                        : 'bg-paper-100 text-bridge-700'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="max-w-none leading-relaxed [&_*]:text-xs [&_*]:leading-relaxed [&_p]:m-0 [&_h1]:m-0 [&_h1]:font-semibold [&_h2]:m-0 [&_h2]:font-semibold [&_h3]:m-0 [&_h3]:font-semibold [&_h4]:m-0 [&_h4]:font-medium [&_h5]:m-0 [&_h6]:m-0 [&_ul]:m-0 [&_ul]:pl-4 [&_ul]:list-disc [&_ol]:m-0 [&_ol]:pl-4 [&_ol]:list-decimal [&_li]:m-0 [&_pre]:bg-paper-200 [&_pre]:rounded [&_pre]:px-2 [&_pre]:py-1 [&_code]:bg-paper-200 [&_code]:px-1 [&_code]:rounded [&_strong]:font-semibold [&_a]:text-copper-500 [&_a]:underline [&>*+*]:mt-1">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="text-xs text-bridge-400 px-2.5 py-1.5 flex items-center gap-1.5">
                    <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {activeToolCall ? `Using ${activeToolCall}...` : 'Thinking...'}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="px-3 py-1.5 text-xs text-red-600 bg-red-50 border-t border-red-100">
                {error}
              </div>
            )}

            {/* Actions & Input */}
            <div className="border-t border-paper-200 p-2 space-y-2">
              {/* Detect fields button */}
              <button
                onClick={handleDetectFields}
                disabled={isDetecting || (!ocrText && context === 'extractor')}
                className="w-full px-3 py-1.5 text-xs rounded-md bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
              >
                {isDetecting ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Detecting...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" />
                    </svg>
                    Detect Fields
                  </>
                )}
              </button>

              {/* Canvas-only: Auto-connect */}
              {context === 'canvas' && (
                <div className="flex gap-1.5">
                  <button
                    onClick={handleAutoConnect}
                    disabled={isConnecting}
                    className="flex-1 px-3 py-1.5 text-xs rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
                  >
                    {isConnecting ? (
                      <>
                        <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Connecting...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                          <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                        </svg>
                        Auto-connect
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Text input */}
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your documents..."
                  disabled={isLoading}
                  className="flex-1 px-2.5 py-1.5 text-xs border border-paper-200 rounded-md bg-white text-bridge-900 placeholder:text-bridge-400 focus:outline-none focus:ring-1 focus:ring-copper-400 disabled:opacity-50"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="px-2.5 py-1.5 text-xs rounded-md bg-copper-500 text-white hover:bg-copper-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <AiSettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
