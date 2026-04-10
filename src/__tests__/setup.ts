// Vitest setup - mock browser APIs not available in jsdom

// Mock navigator.language for locale-dependent tests
Object.defineProperty(globalThis.navigator, 'language', {
  value: 'en-US',
  configurable: true,
});
