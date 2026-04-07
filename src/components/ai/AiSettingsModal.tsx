import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { AI_PROVIDERS, type ProviderId } from '../../types/ai';
import { useAiSettings } from '../../hooks/useAiSettings';
import { verifyApiKey } from '../../services/aiService';

interface AiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AiSettingsModal({ isOpen, onClose }: AiSettingsModalProps) {
  const {
    getProviderConfig,
    setApiKey,
    setVerified,
    setSelectedModel,
    setActiveProvider,
    activeProvider,
    removeProvider,
  } = useAiSettings();

  const [verifying, setVerifying] = useState<ProviderId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async (providerId: ProviderId) => {
    const config = getProviderConfig(providerId);

    if (!config?.apiKey) return;

    setVerifying(providerId);
    setError(null);

    const provider = AI_PROVIDERS.find((p) => p.id === providerId)!;
    const model = config.selectedModel ?? provider.models[0].id;
    const success = await verifyApiKey(providerId, model, config.apiKey);

    setVerified(providerId, success);
    if (!success) {
      setError(`Failed to verify ${provider.name} key. Check that it's correct.`);
    }
    setVerifying(null);
  };

  const handleRemove = (providerId: ProviderId) => {
    removeProvider(providerId);
    setError(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AI Settings" className="w-[480px]">
      <div className="p-4 space-y-4">
        {error && (
          <div className="px-3 py-2 text-xs bg-red-50 text-red-600 rounded-md border border-red-200">
            {error}
          </div>
        )}

        {AI_PROVIDERS.map((provider) => {
          const config = getProviderConfig(provider.id);
          const isActive = activeProvider?.id === provider.id;

          return (
            <div
              key={provider.id}
              className={`border rounded-lg p-3 transition-colors ${
                config?.verified
                  ? isActive
                    ? 'border-copper-500 bg-copper-400/5'
                    : 'border-emerald-300 bg-emerald-50/30'
                  : 'border-paper-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-bridge-900">
                    {provider.name}
                  </span>
                  {config?.verified && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-emerald-500"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {config?.verified && !isActive && (
                    <button
                      onClick={() => setActiveProvider(provider.id)}
                      className="px-2 py-1 text-xs rounded bg-paper-100 text-bridge-600 hover:bg-paper-200 transition-colors"
                    >
                      Set Active
                    </button>
                  )}
                  {isActive && (
                    <span className="px-2 py-1 text-xs rounded bg-copper-500 text-white">
                      Active
                    </span>
                  )}
                  {config && (
                    <button
                      onClick={() => handleRemove(provider.id)}
                      className="p-1 text-bridge-400 hover:text-red-500 transition-colors"
                      title="Remove"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* API Key input */}
              <div className="flex gap-2 mb-2">
                <input
                  type="password"
                  value={config?.apiKey ?? ''}
                  onChange={(e) => setApiKey(provider.id, e.target.value)}
                  placeholder={provider.apiKeyPlaceholder}
                  className="flex-1 px-2.5 py-1.5 text-xs border border-paper-200 rounded-md bg-white text-bridge-900 placeholder:text-bridge-400 focus:outline-none focus:ring-1 focus:ring-copper-400"
                />
                <button
                  onClick={() => handleVerify(provider.id)}
                  disabled={!config?.apiKey || verifying === provider.id}
                  className="px-3 py-1.5 text-xs rounded-md bg-copper-500 text-white hover:bg-copper-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                >
                  {verifying === provider.id ? 'Verifying...' : 'Verify'}
                </button>
              </div>
              {/* Model selection */}
              {config?.apiKey && (
                <select
                  value={config?.selectedModel ?? provider.models[0].id}
                  onChange={(e) => setSelectedModel(provider.id, e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-paper-200 rounded-md bg-white text-bridge-900 focus:outline-none focus:ring-1 focus:ring-copper-400"
                >
                  {provider.models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          );
        })}

        <p className="text-xs text-bridge-400">
          API keys are stored locally in your browser and sent directly to the provider.
        </p>
      </div>
    </Modal>
  );
}
