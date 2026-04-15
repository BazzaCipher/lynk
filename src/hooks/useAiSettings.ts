import { create } from 'zustand';
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

interface AiSettingsStore {
  settings: AiSettings;
  enabledProviders: AiProviderDefinition[];
  activeProvider: AiProviderDefinition | null;
  activeConfig: AiProviderConfig | null;
  getProviderConfig: (id: ProviderId) => AiProviderConfig | undefined;
  setApiKey: (id: ProviderId, apiKey: string) => void;
  setVerified: (id: ProviderId, verified: boolean) => void;
  setSelectedModel: (id: ProviderId, model: string) => void;
  setActiveProvider: (id: ProviderId) => void;
  removeProvider: (id: ProviderId) => void;
  setCustomInstructions: (text: string) => void;
}

function deriveFromSettings(settings: AiSettings) {
  const enabledProviders = AI_PROVIDERS.filter(
    (p) => settings.providers[p.id]?.verified
  );
  const activeProvider = settings.activeProvider
    ? AI_PROVIDERS.find((p) => p.id === settings.activeProvider) ?? null
    : null;
  const activeConfig = settings.activeProvider
    ? settings.providers[settings.activeProvider] ?? null
    : null;
  return { enabledProviders, activeProvider, activeConfig };
}

function update(set: (fn: (state: AiSettingsStore) => Partial<AiSettingsStore>) => void, updater: (prev: AiSettings) => AiSettings) {
  set((state) => {
    const settings = updater(state.settings);
    saveSettings(settings);
    return { settings, ...deriveFromSettings(settings) };
  });
}

export const useAiSettings = create<AiSettingsStore>((set, get) => {
  const initial = loadSettings();
  return {
    settings: initial,
    ...deriveFromSettings(initial),

    getProviderConfig: (id: ProviderId) => get().settings.providers[id],

    setApiKey: (id: ProviderId, apiKey: string) =>
      update(set, (prev) => ({
        ...prev,
        providers: {
          ...prev.providers,
          [id]: {
            ...prev.providers[id],
            apiKey,
            verified: false,
            selectedModel:
              prev.providers[id]?.selectedModel ??
              AI_PROVIDERS.find((p) => p.id === id)!.models[0].id,
          },
        },
      })),

    setVerified: (id: ProviderId, verified: boolean) =>
      update(set, (prev) => {
        const config = prev.providers[id];
        if (!config) return prev;
        const updated: AiSettings = {
          ...prev,
          providers: { ...prev.providers, [id]: { ...config, verified } },
        };
        if (verified && !prev.activeProvider) {
          updated.activeProvider = id;
        }
        return updated;
      }),

    setSelectedModel: (id: ProviderId, model: string) =>
      update(set, (prev) => {
        const config = prev.providers[id] ?? { apiKey: '', verified: false, selectedModel: model };
        return {
          ...prev,
          providers: {
            ...prev.providers,
            [id]: { ...config, selectedModel: model },
          },
        };
      }),

    setActiveProvider: (id: ProviderId) =>
      update(set, (prev) => ({ ...prev, activeProvider: id })),

    removeProvider: (id: ProviderId) =>
      update(set, (prev) => {
        const { [id]: _, ...rest } = prev.providers;
        return {
          ...prev,
          providers: rest,
          activeProvider: prev.activeProvider === id ? null : prev.activeProvider,
        };
      }),

    setCustomInstructions: (text: string) =>
      update(set, (prev) => ({ ...prev, customInstructions: text || undefined })),
  };
});
