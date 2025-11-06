import { apiKeyManager } from './api-config';

describe('API Key Manager', () => {
  it('should load API keys correctly', () => {
    const providersInfo = apiKeyManager.getProvidersInfo();
    
    console.log('Providers Configuration:', providersInfo);
    
    expect(apiKeyManager.validateKeys()).toBe(true);
    
    const defaultProvider = apiKeyManager.getDefaultProvider();
    console.log('Default Provider:', defaultProvider);
    
    expect(defaultProvider).toBeTruthy();
  });

  it('should retrieve specific keys', () => {
    const geminiKey = apiKeyManager.getKey('gemini');
    expect(geminiKey).toBeTruthy();
  });
});