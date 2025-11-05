// tools.ts
// ============================================
// 🛠️ الأدوات الحقيقية - Real Function Tools
// ============================================

import fs from 'fs-extra';
import path from 'path';
import { spawn } from 'child_process';
import { glob } from 'glob';

// ============================================
// 📖 الأداة 1: قراءة ملف
// ============================================
export async function readFile(params: { path: string }): Promise<string> {
  try {
    const content = await fs.readFile(params.path, 'utf-8');
    return JSON.stringify({
      success: true,
      path: params.path,
      content: content,
      lines: content.split('\n').length,
      size: content.length,
    });
  } catch (error: any) {
    return JSON.stringify({
      success: false,
      error: error.message,
    });
  }
}

// ============================================
// 📝 الأداة 2: كتابة ملف
// ============================================
export async function writeFile(params: { path: string; content: string }): Promise<string> {
  try {
    // إنشاء المجلد إذا لم يكن موجوداً
    const dir = path.dirname(params.path);
    await fs.ensureDir(dir);

    // كتابة الملف
    await fs.writeFile(params.path, params.content, 'utf-8');

    return JSON.stringify({
      success: true,
      path: params.path,
      size: params.content.length,
    });
  } catch (error: any) {
    return JSON.stringify({
      success: false,
      error: error.message,
    });
  }
}

// ============================================
// 📂 الأداة 3: قراءة مجلد
// ============================================
export async function listDirectory(params: {
  path: string;
  recursive?: boolean;
}): Promise<string> {
  try {
    if (params.recursive) {
      // قراءة متداخلة
      const files = await glob('**/*', {
        cwd: params.path,
        nodir: false,
        dot: true,
      });

      return JSON.stringify({
        success: true,
        path: params.path,
        items: files.slice(0, 100), // أول 100 ملف
        total: files.length,
      });
    } else {
      // قراءة المجلد الحالي فقط
      const items = await fs.readdir(params.path);

      // معلومات مفصلة عن كل عنصر
      const details = await Promise.all(
        items.map(async (item) => {
          const fullPath = path.join(params.path, item);
          const stats = await fs.stat(fullPath);
          return {
            name: item,
            type: stats.isDirectory() ? 'directory' : 'file',
            size: stats.size,
            modified: stats.mtime,
          };
        })
      );

      return JSON.stringify({
        success: true,
        path: params.path,
        items: details,
      });
    }
  } catch (error: any) {
    return JSON.stringify({
      success: false,
      error: error.message,
    });
  }
}

// ============================================
// ✏️ الأداة 4: تعديل ملف (Patch)
// ============================================
export async function editFile(params: {
  path: string;
  old_text: string;
  new_text: string;
}): Promise<string> {
  try {
    // قراءة الملف
    let content = await fs.readFile(params.path, 'utf-8');

    // التعديل
    if (!content.includes(params.old_text)) {
      return JSON.stringify({
        success: false,
        error: 'النص المطلوب تعديله غير موجود في الملف',
      });
    }

    content = content.replace(params.old_text, params.new_text);

    // حفظ الملف
    await fs.writeFile(params.path, content, 'utf-8');

    return JSON.stringify({
      success: true,
      path: params.path,
      message: 'تم التعديل بنجاح',
    });
  } catch (error: any) {
    return JSON.stringify({
      success: false,
      error: error.message,
    });
  }
}

// ============================================
// 💻 الأداة 5: تنفيذ أمر
// ============================================
export async function executeCommand(params: {
  command: string;
  cwd?: string;
  timeout?: number;
}): Promise<string> {
  return new Promise((resolve) => {
    const timeoutMs = params.timeout || 30000; // 30 ثانية افتراضياً

    // تقسيم الأمر
    const parts = params.command.split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);

    const childProcess = spawn(cmd, args, {
      cwd: params.cwd || process.cwd(),
      shell: true,
    });

    let stdout = '';
    let stderr = '';

    childProcess.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    childProcess.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    // Timeout
    const timer = setTimeout(() => {
      childProcess.kill();
      resolve(
        JSON.stringify({
          success: false,
          error: 'انتهى الوقت المسموح للأمر',
          timeout: true,
        })
      );
    }, timeoutMs);

    childProcess.on('close', (code: number | null) => {
      clearTimeout(timer);

      resolve(
        JSON.stringify({
          success: code === 0,
          command: params.command,
          exitCode: code,
          stdout: stdout.slice(0, 5000), // أول 5000 حرف
          stderr: stderr.slice(0, 1000),
        })
      );
    });

    childProcess.on('error', (error: Error) => {
      clearTimeout(timer);

      resolve(
        JSON.stringify({
          success: false,
          error: error.message,
        })
      );
    });
  });
}

// ============================================
// 🔍 الأداة 6: البحث في ملفات
// ============================================
export async function searchInFiles(params: {
  pattern: string;
  directory: string;
  filePattern?: string;
}): Promise<string> {
  try {
    const fileGlob = params.filePattern || '**/*';
    const files = await glob(fileGlob, {
      cwd: params.directory,
      nodir: true,
      absolute: true,
    });

    const results: Array<{
      file: string;
      matches: Array<{ line: number; text: string }>;
    }> = [];

    for (const file of files.slice(0, 100)) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const lines = content.split('\n');

        const matches = lines
          .map((line, index) => ({
            line: index + 1,
            text: line,
          }))
          .filter((item) => item.text.includes(params.pattern));

        if (matches.length > 0) {
          results.push({
            file: path.relative(params.directory, file),
            matches: matches.slice(0, 10), // أول 10 نتائج لكل ملف
          });
        }
      } catch (error) {
        // تجاهل الملفات الثنائية أو غير القابلة للقراءة
      }
    }

    return JSON.stringify({
      success: true,
      pattern: params.pattern,
      totalFiles: files.length,
      filesWithMatches: results.length,
      results: results.slice(0, 20), // أول 20 ملف
    });
  } catch (error: any) {
    return JSON.stringify({
      success: false,
      error: error.message,
    });
  }
}

// ============================================
// 📋 تعريف الأدوات لـ Claude API
// ============================================
export const TOOL_DEFINITIONS = [
  {
    name: 'read_file',
    description: 'قراءة محتوى ملف من النظام',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'المسار الكامل للملف',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'write_file',
    description: 'كتابة محتوى إلى ملف (إنشاء أو استبدال)',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'المسار الكامل للملف',
        },
        content: {
          type: 'string',
          description: 'المحتوى المراد كتابته',
        },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'list_directory',
    description: 'قراءة محتويات مجلد',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'مسار المجلد',
        },
        recursive: {
          type: 'boolean',
          description: 'قراءة متداخلة للمجلدات الفرعية',
          default: false,
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'edit_file',
    description: 'تعديل جزء محدد من ملف موجود',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'مسار الملف',
        },
        old_text: {
          type: 'string',
          description: 'النص المراد استبداله',
        },
        new_text: {
          type: 'string',
          description: 'النص الجديد',
        },
      },
      required: ['path', 'old_text', 'new_text'],
    },
  },
  {
    name: 'execute_command',
    description: 'تنفيذ أمر في الطرفية (Terminal)',
    input_schema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'الأمر المراد تنفيذه',
        },
        cwd: {
          type: 'string',
          description: 'مسار التنفيذ (اختياري)',
        },
        timeout: {
          type: 'number',
          description: 'الوقت الأقصى بالميلي ثانية (افتراضي: 30000)',
        },
      },
      required: ['command'],
    },
  },
  {
    name: 'search_in_files',
    description: 'البحث عن نص في ملفات المشروع',
    input_schema: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'النص المراد البحث عنه',
        },
        directory: {
          type: 'string',
          description: 'المجلد المراد البحث فيه',
        },
        filePattern: {
          type: 'string',
          description: 'نمط الملفات (مثل: **/*.ts)',
          default: '**/*',
        },
      },
      required: ['pattern', 'directory'],
    },
  },
];

// ============================================
// ⚙️ تنفيذ الأداة
// ============================================
export async function executeTool(toolName: string, toolInput: any): Promise<string> {
  switch (toolName) {
    case 'read_file':
      return await readFile(toolInput);
    case 'write_file':
      return await writeFile(toolInput);
    case 'list_directory':
      return await listDirectory(toolInput);
    case 'edit_file':
      return await editFile(toolInput);
    case 'execute_command':
      return await executeCommand(toolInput);
    case 'search_in_files':
      return await searchInFiles(toolInput);
    default:
      return JSON.stringify({
        success: false,
        error: `أداة غير معروفة: ${toolName}`,
      });
  }
}
