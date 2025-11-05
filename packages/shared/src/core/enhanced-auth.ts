/**
 * Enhanced Authentication Service for CLI
 *
 * نظام مصادقة محسّن يدعم:
 * - تخزين آمن لـ API Keys (مشفّر)
 * - Multi-provider support (Gemini, Claude, OpenAI, etc.)
 * - Session management
 * - Token validation
 * - Secure credential storage
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

const CONFIG_DIR = path.join(os.homedir(), '.oqool');
const CREDENTIALS_FILE = path.join(CONFIG_DIR, 'credentials.enc');
const SESSION_FILE = path.join(CONFIG_DIR, 'session.json');

// Encryption algorithm
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

export interface ProviderCredentials {
  gemini?: string;
  claude?: string;
  openai?: string;
  deepseek?: string;
  ollama?: string;
}

export interface UserSession {
  userId?: string;
  email?: string;
  provider?: string;
  createdAt: string;
  expiresAt: string;
  lastUsed: string;
}

export interface StoredCredentials {
  providers: ProviderCredentials;
  defaultProvider?: string;
  metadata?: {
    createdAt: string;
    lastUpdated: string;
  };
}

/**
 * Enhanced Authentication Service
 */
export class EnhancedAuthService {
  private machineId: string;

  constructor() {
    // Generate machine-specific encryption key
    this.machineId = this.getMachineId();
  }

  /**
   * Get machine-specific ID for encryption
   */
  private getMachineId(): string {
    // Use machine hostname + username as base for encryption key
    const base = `${os.hostname()}-${os.userInfo().username}`;
    return crypto.createHash('sha256').update(base).digest('hex').substring(0, KEY_LENGTH);
  }

  /**
   * Ensure config directory exists
   */
  private async ensureConfigDir(): Promise<void> {
    await fs.ensureDir(CONFIG_DIR);
    // Set directory permissions (owner only)
    if (process.platform !== 'win32') {
      await fs.chmod(CONFIG_DIR, 0o700);
    }
  }

  /**
   * Encrypt data
   */
  private encrypt(data: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(this.machineId, 'hex'), iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    // Combine IV + encrypted data + auth tag
    return iv.toString('hex') + ':' + encrypted + ':' + tag.toString('hex');
  }

  /**
   * Decrypt data
   */
  private decrypt(encryptedData: string): string {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const tag = Buffer.from(parts[2], 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(this.machineId, 'hex'), iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Save credentials (encrypted)
   */
  async saveCredentials(credentials: ProviderCredentials, defaultProvider?: string): Promise<void> {
    await this.ensureConfigDir();

    const stored: StoredCredentials = {
      providers: credentials,
      defaultProvider,
      metadata: {
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      },
    };

    const encrypted = this.encrypt(JSON.stringify(stored));
    await fs.writeFile(CREDENTIALS_FILE, encrypted, 'utf8');

    // Set file permissions (owner only)
    if (process.platform !== 'win32') {
      await fs.chmod(CREDENTIALS_FILE, 0o600);
    }
  }

  /**
   * Load credentials (decrypted)
   */
  async loadCredentials(): Promise<StoredCredentials | null> {
    try {
      if (!(await fs.pathExists(CREDENTIALS_FILE))) {
        return null;
      }

      const encrypted = await fs.readFile(CREDENTIALS_FILE, 'utf8');
      const decrypted = this.decrypt(encrypted);
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Failed to load credentials:', error);
      return null;
    }
  }

  /**
   * Get API key for a specific provider
   */
  async getAPIKey(provider: keyof ProviderCredentials): Promise<string | null> {
    const credentials = await this.loadCredentials();
    return credentials?.providers[provider] || null;
  }

  /**
   * Set API key for a provider
   */
  async setAPIKey(provider: keyof ProviderCredentials, apiKey: string): Promise<void> {
    const existing = (await this.loadCredentials()) || {
      providers: {},
      metadata: {
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      },
    };

    existing.providers[provider] = apiKey;
    existing.metadata!.lastUpdated = new Date().toISOString();

    await this.saveCredentials(existing.providers, existing.defaultProvider);
  }

  /**
   * Remove API key for a provider
   */
  async removeAPIKey(provider: keyof ProviderCredentials): Promise<void> {
    const existing = await this.loadCredentials();
    if (!existing) return;

    delete existing.providers[provider];
    existing.metadata!.lastUpdated = new Date().toISOString();

    await this.saveCredentials(existing.providers, existing.defaultProvider);
  }

  /**
   * Set default provider
   */
  async setDefaultProvider(provider: keyof ProviderCredentials): Promise<void> {
    const existing = await this.loadCredentials();
    if (!existing) {
      throw new Error('No credentials stored');
    }

    if (!existing.providers[provider]) {
      throw new Error(`No API key stored for ${provider}`);
    }

    existing.defaultProvider = provider;
    existing.metadata!.lastUpdated = new Date().toISOString();

    await this.saveCredentials(existing.providers, provider);
  }

  /**
   * Get default provider
   */
  async getDefaultProvider(): Promise<string | null> {
    const credentials = await this.loadCredentials();
    return credentials?.defaultProvider || null;
  }

  /**
   * Check if any credentials exist
   */
  async hasCredentials(): Promise<boolean> {
    const credentials = await this.loadCredentials();
    return credentials !== null && Object.keys(credentials.providers).length > 0;
  }

  /**
   * List available providers
   */
  async listProviders(): Promise<string[]> {
    const credentials = await this.loadCredentials();
    return credentials ? Object.keys(credentials.providers) : [];
  }

  /**
   * Validate API key format
   */
  validateAPIKeyFormat(provider: string, apiKey: string): boolean {
    const formats: Record<string, RegExp> = {
      gemini: /^AIzaSy[A-Za-z0-9_-]{33}$/,
      claude: /^sk-ant-[A-Za-z0-9_-]+$/,
      openai: /^sk-proj-[A-Za-z0-9_-]+$|^sk-[A-Za-z0-9_-]{48}$/,
      deepseek: /^sk-[A-Za-z0-9_-]+$/,
    };

    const format = formats[provider.toLowerCase()];
    return format ? format.test(apiKey) : true; // Allow unknown providers
  }

  /**
   * Create session
   */
  async createSession(userId: string, email: string, provider: string): Promise<UserSession> {
    await this.ensureConfigDir();

    const session: UserSession = {
      userId,
      email,
      provider,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      lastUsed: new Date().toISOString(),
    };

    await fs.writeJson(SESSION_FILE, session, { spaces: 2 });

    // Set file permissions
    if (process.platform !== 'win32') {
      await fs.chmod(SESSION_FILE, 0o600);
    }

    return session;
  }

  /**
   * Get current session
   */
  async getSession(): Promise<UserSession | null> {
    try {
      if (!(await fs.pathExists(SESSION_FILE))) {
        return null;
      }

      const session = await fs.readJson(SESSION_FILE);

      // Check if expired
      if (new Date(session.expiresAt) < new Date()) {
        await this.clearSession();
        return null;
      }

      // Update last used
      session.lastUsed = new Date().toISOString();
      await fs.writeJson(SESSION_FILE, session, { spaces: 2 });

      return session;
    } catch (error) {
      console.error('Failed to load session:', error);
      return null;
    }
  }

  /**
   * Clear session
   */
  async clearSession(): Promise<void> {
    if (await fs.pathExists(SESSION_FILE)) {
      await fs.remove(SESSION_FILE);
    }
  }

  /**
   * Clear all credentials and session
   */
  async clearAll(): Promise<void> {
    if (await fs.pathExists(CREDENTIALS_FILE)) {
      await fs.remove(CREDENTIALS_FILE);
    }
    await this.clearSession();
  }

  /**
   * Export credentials (for backup)
   */
  async exportCredentials(): Promise<string> {
    const credentials = await this.loadCredentials();
    if (!credentials) {
      throw new Error('No credentials to export');
    }
    // Return encrypted data (can be imported later)
    return await fs.readFile(CREDENTIALS_FILE, 'utf8');
  }

  /**
   * Import credentials (from backup)
   */
  async importCredentials(encryptedData: string): Promise<void> {
    await this.ensureConfigDir();

    // Validate by trying to decrypt
    this.decrypt(encryptedData);

    // Save if valid
    await fs.writeFile(CREDENTIALS_FILE, encryptedData, 'utf8');

    if (process.platform !== 'win32') {
      await fs.chmod(CREDENTIALS_FILE, 0o600);
    }
  }

  /**
   * Get credentials info (without exposing keys)
   */
  async getCredentialsInfo(): Promise<{
    providers: string[];
    defaultProvider: string | null;
    createdAt: string | null;
    lastUpdated: string | null;
  }> {
    const credentials = await this.loadCredentials();

    if (!credentials) {
      return {
        providers: [],
        defaultProvider: null,
        createdAt: null,
        lastUpdated: null,
      };
    }

    return {
      providers: Object.keys(credentials.providers),
      defaultProvider: credentials.defaultProvider || null,
      createdAt: credentials.metadata?.createdAt || null,
      lastUpdated: credentials.metadata?.lastUpdated || null,
    };
  }
}

/**
 * Global instance
 */
export const authService = new EnhancedAuthService();

/**
 * Helper functions for CLI usage
 */
export async function login(provider: string, apiKey: string): Promise<void> {
  if (!authService.validateAPIKeyFormat(provider, apiKey)) {
    throw new Error(`Invalid API key format for ${provider}`);
  }

  await authService.setAPIKey(provider as keyof ProviderCredentials, apiKey);
  await authService.setDefaultProvider(provider as keyof ProviderCredentials);
}

export async function logout(): Promise<void> {
  await authService.clearAll();
}

export async function getAPIKey(provider?: string): Promise<string | null> {
  const targetProvider = provider || (await authService.getDefaultProvider());

  if (!targetProvider) {
    return null;
  }

  return await authService.getAPIKey(targetProvider as keyof ProviderCredentials);
}
