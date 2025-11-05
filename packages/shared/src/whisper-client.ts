/**
 * Whisper Voice Interface Client
 * عميل للتعامل مع Whisper لتحويل الصوت إلى نص
 * بدون تكاليف API!
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

export interface WhisperConfig {
  model?: 'tiny' | 'base' | 'small' | 'medium' | 'large';
  language?: string;
  task?: 'transcribe' | 'translate';
  outputFormat?: 'txt' | 'json' | 'srt' | 'vtt';
}

export interface TranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

export class WhisperClient {
  private model: string;
  private language: string;
  private task: string;
  private outputFormat: string;

  constructor(config: WhisperConfig = {}) {
    this.model = config.model || process.env.WHISPER_MODEL || 'base';
    this.language = config.language || process.env.WHISPER_LANGUAGE || 'ar'; // Arabic by default
    this.task = config.task || 'transcribe';
    this.outputFormat = config.outputFormat || 'json';
  }

  /**
   * Transcribe audio file to text
   */
  async transcribe(audioPath: string): Promise<TranscriptionResult> {
    try {
      // Verify file exists
      await fs.access(audioPath);

      // Prepare output path
      const outputDir = path.dirname(audioPath);
      const outputName = path.basename(audioPath, path.extname(audioPath));

      // Run Whisper
      const command = [
        'whisper',
        `"${audioPath}"`,
        `--model ${this.model}`,
        `--language ${this.language}`,
        `--task ${this.task}`,
        `--output_format ${this.outputFormat}`,
        `--output_dir "${outputDir}"`,
      ].join(' ');

      console.log('[Whisper] Running:', command);

      const { stdout, stderr } = await execAsync(command);

      if (stderr && !stderr.includes('Detecting language')) {
        console.error('[Whisper] Error:', stderr);
      }

      // Read result
      const resultPath = path.join(outputDir, `${outputName}.${this.outputFormat}`);
      const result = await fs.readFile(resultPath, 'utf-8');

      // Parse based on format
      if (this.outputFormat === 'json') {
        const data = JSON.parse(result);
        return {
          text: data.text,
          language: data.language,
          duration: data.duration,
          segments: data.segments,
        };
      } else {
        return {
          text: result.trim(),
        };
      }
    } catch (error) {
      console.error('[Whisper] Transcription error:', error);
      throw new Error(`Whisper transcription failed: ${error}`);
    }
  }

  /**
   * Transcribe from microphone (live recording)
   */
  async transcribeFromMicrophone(duration: number = 10): Promise<TranscriptionResult> {
    try {
      // Record audio using ffmpeg
      const tempFile = `/tmp/recording-${Date.now()}.wav`;

      const recordCommand = [
        'ffmpeg',
        '-f alsa',
        '-i default',
        `-t ${duration}`,
        '-acodec pcm_s16le',
        '-ar 16000',
        '-ac 1',
        `"${tempFile}"`,
        '-y',
      ].join(' ');

      console.log('[Whisper] Recording for', duration, 'seconds...');
      await execAsync(recordCommand);

      // Transcribe
      const result = await this.transcribe(tempFile);

      // Clean up
      await fs.unlink(tempFile);

      return result;
    } catch (error) {
      console.error('[Whisper] Microphone transcription error:', error);
      throw error;
    }
  }

  /**
   * Check if Whisper is installed
   */
  async isInstalled(): Promise<boolean> {
    try {
      await execAsync('whisper --help');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get available models
   */
  getAvailableModels(): string[] {
    return ['tiny', 'base', 'small', 'medium', 'large'];
  }

  /**
   * Estimate model size
   */
  getModelSize(model: string): string {
    const sizes: Record<string, string> = {
      tiny: '~75 MB',
      base: '~150 MB',
      small: '~500 MB',
      medium: '~1.5 GB',
      large: '~3 GB',
    };
    return sizes[model] || 'Unknown';
  }

  /**
   * Voice command helper (for CLI)
   */
  async captureVoiceCommand(duration: number = 5): Promise<string> {
    console.log('🎤 Listening... Speak your command!');

    const result = await this.transcribeFromMicrophone(duration);

    console.log('📝 Transcribed:', result.text);

    return result.text;
  }
}

// Singleton instance
let whisperInstance: WhisperClient | null = null;

export function getWhisperClient(config?: WhisperConfig): WhisperClient {
  if (!whisperInstance) {
    whisperInstance = new WhisperClient(config);
  }
  return whisperInstance;
}

export default WhisperClient;
