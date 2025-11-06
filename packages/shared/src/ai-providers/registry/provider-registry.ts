import { IAIProvider } from '../interfaces/iai-provider.interface';

export class ProviderRegistry {
  private providers: Map<string, IAIProvider> = new Map();
  private defaultProvider: string = 'claude';

  registerProvider(name: string, provider: IAIProvider): void {
    this.providers.set(name, provider);
  }

  getProvider(name: string): IAIProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Provider '${name}' not found`);
    }
    return provider;
  }

  getDefaultProvider(): IAIProvider {
    return this.getProvider(this.defaultProvider);
  }

  setDefaultProvider(name: string): void {
    if (!this.providers.has(name)) {
      throw new Error(`Provider '${name}' not registered`);
    }
    this.defaultProvider = name;
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  async validateAllProviders(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const [name, provider] of this.providers) {
      results[name] = await provider.validate();
    }

    return results;
  }

  hasProvider(name: string): boolean {
    return this.providers.has(name);
  }

  removeProvider(name: string): boolean {
    return this.providers.delete(name);
  }

  clear(): void {
    this.providers.clear();
  }

  get size(): number {
    return this.providers.size;
  }
}
