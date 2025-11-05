/**
 * Voice Command Handler
 * معالج الأوامر الصوتية
 */

import { Command } from 'commander';
import { getWhisperClient } from '../../../shared/whisper-client';
import { getOllamaClient } from '../../../shared/ollama-client';

export function registerVoiceCommand(program: Command): void {
  const voice = program
    .command('voice')
    .description('Voice commands using Whisper + Ollama');

  // Transcribe audio file
  voice
    .command('transcribe <file>')
    .description('Transcribe audio file to text')
    .option('-m, --model <model>', 'Whisper model (tiny, base, small, medium, large)', 'base')
    .option('-l, --language <lang>', 'Language code (ar, en, etc.)', 'ar')
    .action(async (file, options) => {
      try {
        const whisper = getWhisperClient({
          model: options.model,
          language: options.language,
        });

        console.log('🎤 Transcribing audio...');

        const result = await whisper.transcribe(file);

        console.log('\n📝 Transcription:');
        console.log(result.text);

        if (result.language) {
          console.log(`\n🌍 Detected language: ${result.language}`);
        }

        if (result.duration) {
          console.log(`⏱️  Duration: ${result.duration.toFixed(2)}s`);
        }
      } catch (error: any) {
        console.error('❌ Error:', error.message);
        process.exit(1);
      }
    });

  // Voice command (record + transcribe + execute)
  voice
    .command('cmd')
    .description('Execute voice command')
    .option('-d, --duration <seconds>', 'Recording duration', '5')
    .action(async (options) => {
      try {
        const whisper = getWhisperClient();
        const ollama = getOllamaClient();

        // Check if Whisper is installed
        const isInstalled = await whisper.isInstalled();
        if (!isInstalled) {
          console.error('❌ Whisper is not installed!');
          console.log('Install: pip install openai-whisper');
          process.exit(1);
        }

        // Record and transcribe
        console.log('🎤 Recording... Speak your command!');
        const command = await whisper.captureVoiceCommand(parseInt(options.duration));

        if (!command) {
          console.log('❌ No command detected');
          return;
        }

        console.log(`\n📝 You said: "${command}"`);

        // Interpret command using Ollama
        console.log('\n🤖 Processing with AI...');

        const systemPrompt = `You are a CLI assistant. Convert voice commands into exact shell commands.
Only respond with the command, nothing else.
Examples:
- "list files" -> "ls -la"
- "find typescript files" -> "fd -e ts"
- "search for TODO" -> "rg TODO"`;

        const shellCommand = await ollama.generate(command, systemPrompt);

        console.log(`\n💻 Generated command: ${shellCommand}`);
        console.log('\n⚠️  Execute this command? (y/N)');

        // Note: In real implementation, add readline for confirmation
        // For now, just show the command
      } catch (error: any) {
        console.error('❌ Error:', error.message);
        process.exit(1);
      }
    });

  // Voice chat (interactive)
  voice
    .command('chat')
    .description('Interactive voice chat with AI')
    .option('-d, --duration <seconds>', 'Recording duration per turn', '10')
    .action(async (options) => {
      try {
        const whisper = getWhisperClient();
        const ollama = getOllamaClient();

        console.log('🎤 Voice Chat Started!');
        console.log('Speak for', options.duration, 'seconds when prompted');
        console.log('Press Ctrl+C to exit\n');

        const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

        // Chat loop
        while (true) {
          // Record user
          console.log('\n🎤 Your turn (recording...)');
          const userInput = await whisper.captureVoiceCommand(parseInt(options.duration));

          if (!userInput) {
            console.log('No input detected, try again...');
            continue;
          }

          messages.push({ role: 'user', content: userInput });

          // Get AI response
          console.log('\n🤖 AI thinking...');
          const response = await ollama.chat(messages);

          console.log('\n💬 AI:', response);

          messages.push({ role: 'assistant', content: response });

          // Optional: Text-to-speech for response
          // Could use 'espeak' or 'festival' on Linux
        }
      } catch (error: any) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
      }
    });
}
