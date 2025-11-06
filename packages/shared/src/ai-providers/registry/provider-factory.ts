import { IAIProvider } from '../interfaces/iai-provider.interface';
import { ClaudeAdapter } from '../adapters/claude-adapter';
import { DeepSeekAdapter } from '../adapters/deepseek-adapter';
import { GeminiAdapter } from '../adapters/gemini-adapter';

export type ProviderType = 'claude' | 'deepseek' | 'gemini';

export interface ProviderFactoryConfig {
  apiKey: string;
  defaultModel?: string;
  baseURL?: string;
  [key: string]: any;
}

export class ProviderFactory {
  static createProvider(type: ProviderType, config: ProviderFactoryConfig): IAIProvider {
    switch (type) {
      case 'claude':
        return new ClaudeAdapter(config.apiKey, config);

      case 'deepseek':
        return new DeepSeekAdapter(config.apiKey, config);

      case 'gemini':
        return new GeminiAdapter(config.apiKey, config);

      default:
        throw new Error(`Unknown provider type: ${type}`);
    }
  }

  static createFromEnv(type: ProviderType): IAIProvider {
    const envKeyMap: Record<ProviderType, string> = {
      claude: 'ANTHROPIC_API_KEY',
      deepseek: 'DEEPSEEK_API_KEY',
      gemini: 'GEMINI_API_KEY'
    };

    const apiKey = process.env[envKeyMap[type]];

    if (!apiKey) {
      throw new Error(`${envKeyMap[type]} environment variable is not set`);
    }

    return this.createProvider(type, { apiKey });
  }

  static getSupportedProviders(): ProviderType[] {
    return ['claude', 'deepseek', 'gemini'];
  }
}
