import { useState, useCallback, useEffect } from 'react';
import {
  AI_PROVIDERS,
  DEFAULT_AI_SETTINGS,
  type AiSettings,
  type AiProviderConfig,
  type ProviderId,
  type AiProviderDefinition,
} from '../types/ai';

const STORAGE_KEY = 'lynk:ai-settings';

function loadSettings(): AiSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // corrupted data
  }
  return DEFAULT_AI_SETTINGS;
}

function saveSettings(settings: AiSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function useAiSettings() {
  const [settings, setSettings] = useState<AiSettings>(loadSettings);

  // Persist on change
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const getProviderConfig = useCallback(
    (id: ProviderId): AiProviderConfig | undefined => settings.providers[id],
    [settings]
  );

  const setApiKey = useCallback((id: ProviderId, apiKey: string) => {
    setSettings((prev) => ({
      ...prev,
      providers: {
        ...prev.providers,
        [id]: {
          ...prev.providers[id],
          apiKey,
          verified: false, // reset on key change
          selectedModel:
            prev.providers[id]?.selectedModel ??
            AI_PROVIDERS.find((p) => p.id === id)!.models[0].id,
        },
      },
    }));
  }, []);

  const setVerified = useCallback((id: ProviderId, verified: boolean) => {
    setSettings((prev) => {
      const config = prev.providers[id];
      if (!config) return prev;
      const updated: AiSettings = {
        ...prev,
        providers: { ...prev.providers, [id]: { ...config, verified } },
      };
      // Auto-set active provider if none set
      if (verified && !prev.activeProvider) {
        updated.activeProvider = id;
      }
      return updated;
    });
  }, []);

  const setSelectedModel = useCallback((id: ProviderId, model: string) => {
    setSettings((prev) => {
      const config = prev.providers[id];
      if (!config) return prev;
      return {
        ...prev,
        providers: {
          ...prev.providers,
          [id]: { ...config, selectedModel: model },
        },
      };
    });
  }, []);

  const setActiveProvider = useCallback((id: ProviderId) => {
    setSettings((prev) => ({ ...prev, activeProvider: id }));
  }, []);

  const removeProvider = useCallback((id: ProviderId) => {
    setSettings((prev) => {
      const { [id]: _, ...rest } = prev.providers;
      return {
        ...prev,
        providers: rest,
        activeProvider: prev.activeProvider === id ? null : prev.activeProvider,
      };
    });
  }, []);

  const enabledProviders: AiProviderDefinition[] = AI_PROVIDERS.filter(
    (p) => settings.providers[p.id]?.verified
  );

  const activeProvider = settings.activeProvider
    ? AI_PROVIDERS.find((p) => p.id === settings.activeProvider) ?? null
    : null;

  const activeConfig = settings.activeProvider
    ? settings.providers[settings.activeProvider] ?? null
    : null;

  return {
    settings,
    enabledProviders,
    activeProvider,
    activeConfig,
    getProviderConfig,
    setApiKey,
    setVerified,
    setSelectedModel,
    setActiveProvider,
    removeProvider,
  };
}
