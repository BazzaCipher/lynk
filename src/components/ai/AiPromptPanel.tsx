import { useState, useCallback, useRef, useEffect } from 'react';
import { useAiSettings } from '../../hooks/useAiSettings';
import { AiSettingsModal } from './AiSettingsModal';
import { askAI, detectFieldsWithAI } from '../../services/aiService';
import type { AiMessage, AiDetectedField } from '../../types/ai';

interface AiPromptPanelProps {
  context: 'canvas' | 'extractor';
  /** OCR text for extractor context */
  ocrText?: string;
  onFieldsDetected?: (fields: AiDetectedField[]) => void;
  /** Called when detect fields is triggered on canvas (caller handles per-node OCR) */
  onCanvasDetect?: () => void;
}

export function AiPromptPanel({
  context,
  ocrText,
  onFieldsDetected,
  onCanvasDetect,
}: AiPromptPanelProps) {
  const { activeProvider, activeConfig, enabledProviders } = useAiSettings();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, response]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !activeProvider || !activeConfig) return;

    const question = input.trim();
    setInput('');
    setError(null);
    setIsLoading(true);

    const newMessages: AiMessage[] = [...messages, { role: 'user', content: question }];
    setMessages(newMessages);

    try {
      const reply = await askAI(
        question,
        ocrText,
        activeProvider.id,
        activeConfig.selectedModel,
        activeConfig.apiKey,
        messages
      );
      setMessages([...newMessages, { role: 'assistant', content: reply }]);
      setResponse(reply);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get response');
    } finally {
      setIsLoading(false);
    }
  }, [input, activeProvider, activeConfig, messages, ocrText]);

  const handleDetectFields = useCallback(async () => {
    if (context === 'canvas') {
      onCanvasDetect?.();
      return;
    }

    if (!ocrText || !activeProvider || !activeConfig) return;

    setIsDetecting(true);
    setError(null);

    try {
      const fields = await detectFieldsWithAI(
        ocrText,
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasProvider = enabledProviders.length > 0;

  return (
    <>
      <div className="flex flex-col bg-white border border-paper-200 rounded-lg shadow-lg overflow-hidden"
        style={context === 'canvas' ? { width: 320, maxHeight: 400 } : { width: '100%', maxHeight: 300 }}
      >
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
                {activeProvider.name}
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
              <div className="flex-1 overflow-auto px-3 py-2 space-y-2 min-h-0" style={{ maxHeight: 200 }}>
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`text-xs rounded-md px-2.5 py-1.5 max-w-[90%] ${
                      msg.role === 'user'
                        ? 'bg-copper-400/10 text-bridge-900 ml-auto'
                        : 'bg-paper-100 text-bridge-700'
                    }`}
                  >
                    {msg.content}
                  </div>
                ))}
                {isLoading && (
                  <div className="text-xs text-bridge-400 px-2.5 py-1.5">
                    Thinking...
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
