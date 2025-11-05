// tools.ts
// ============================================
// 🛠️ أدوات oqool - نفس قدرات Oqool
// ============================================

import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';

const execAsync = promisify(exec);

// ============================================
// 📖 أداة قراءة الملفات
// ============================================
export async function readFile(
  filePath: string
): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    const absolutePath = path.resolve(filePath);

    if (!existsSync(absolutePath)) {
      return {
        success: false,
        error: `الملف غير موجود: ${filePath}`,
      };
    }

    const content = await fs.readFile(absolutePath, 'utf-8');

    return {
      success: true,
      content,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

// ============================================
// ✍️ أداة كتابة الملفات
// ============================================
export async function writeFile(
  filePath: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const absolutePath = path.resolve(filePath);
    const dir = path.dirname(absolutePath);

    // إنشاء المجلد إذا لم يكن موجوداً
    await fs.mkdir(dir, { recursive: true });

    await fs.writeFile(absolutePath, content, 'utf-8');

    console.log(chalk.green(`✅ تم إنشاء الملف: ${filePath}`));

    return {
      success: true,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

// ============================================
// ✏️ أداة تعديل الملفات
// ============================================
export async function editFile(
  filePath: string,
  oldText: string,
  newText: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const absolutePath = path.resolve(filePath);

    if (!existsSync(absolutePath)) {
      return {
        success: false,
        error: `الملف غير موجود: ${filePath}`,
      };
    }

    const content = await fs.readFile(absolutePath, 'utf-8');

    if (!content.includes(oldText)) {
      return {
        success: false,
        error: `النص المطلوب تعديله غير موجود في الملف`,
      };
    }

    const newContent = content.replace(oldText, newText);
    await fs.writeFile(absolutePath, newContent, 'utf-8');

    console.log(chalk.green(`✅ تم تعديل الملف: ${filePath}`));

    return {
      success: true,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

// ============================================
// 💻 أداة تنفيذ الأوامر
// ============================================
export async function runCommand(
  command: string
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    console.log(chalk.cyan(`⚡ تنفيذ: ${command}`));

    const { stdout, stderr } = await execAsync(command, {
      maxBuffer: 10 * 1024 * 1024, // 10MB
    });

    const output = stdout + (stderr || '');

    console.log(chalk.gray(output));

    return {
      success: true,
      output,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      output: error.stdout || error.stderr,
    };
  }
}

// ============================================
// 📂 أداة قراءة محتويات مجلد
// ============================================
export async function listDirectory(
  dirPath: string
): Promise<{ success: boolean; files?: string[]; error?: string }> {
  try {
    const absolutePath = path.resolve(dirPath);

    if (!existsSync(absolutePath)) {
      return {
        success: false,
        error: `المجلد غير موجود: ${dirPath}`,
      };
    }

    const files = await fs.readdir(absolutePath);

    return {
      success: true,
      files,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

// ============================================
// 🔍 أداة البحث في الملفات
// ============================================
export async function searchInFiles(
  dirPath: string,
  searchPattern: string
): Promise<{ success: boolean; matches?: string[]; error?: string }> {
  try {
    const absolutePath = path.resolve(dirPath);
    const command = `grep -r "${searchPattern}" ${absolutePath} 2>/dev/null || true`;

    const { stdout } = await execAsync(command);
    const matches = stdout
      .trim()
      .split('\n')
      .filter((line) => line);

    return {
      success: true,
      matches,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

// ============================================
// 📊 تعريفات الأدوات لـ Claude API
// ============================================
export const toolDefinitions = [
  {
    name: 'read_file',
    description: 'قراءة محتويات ملف من المشروع',
    input_schema: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'مسار الملف المطلوب قراءته (نسبي أو مطلق)',
        },
      },
      required: ['file_path'],
    },
  },
  {
    name: 'write_file',
    description: 'إنشاء ملف جديد أو الكتابة فوق ملف موجود',
    input_schema: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'مسار الملف المطلوب كتابته',
        },
        content: {
          type: 'string',
          description: 'محتوى الملف',
        },
      },
      required: ['file_path', 'content'],
    },
  },
  {
    name: 'edit_file',
    description: 'تعديل جزء محدد من ملف موجود',
    input_schema: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'مسار الملف المطلوب تعديله',
        },
        old_text: {
          type: 'string',
          description: 'النص المطلوب استبداله',
        },
        new_text: {
          type: 'string',
          description: 'النص الجديد',
        },
      },
      required: ['file_path', 'old_text', 'new_text'],
    },
  },
  {
    name: 'run_command',
    description: 'تنفيذ أمر bash في الـ terminal',
    input_schema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'الأمر المطلوب تنفيذه',
        },
      },
      required: ['command'],
    },
  },
  {
    name: 'list_directory',
    description: 'عرض محتويات مجلد',
    input_schema: {
      type: 'object',
      properties: {
        dir_path: {
          type: 'string',
          description: 'مسار المجلد',
        },
      },
      required: ['dir_path'],
    },
  },
  {
    name: 'search_in_files',
    description: 'البحث عن نص في ملفات المشروع',
    input_schema: {
      type: 'object',
      properties: {
        dir_path: {
          type: 'string',
          description: 'مسار المجلد للبحث فيه',
        },
        search_pattern: {
          type: 'string',
          description: 'النص أو Pattern المطلوب البحث عنه',
        },
      },
      required: ['dir_path', 'search_pattern'],
    },
  },
];

// ============================================
// 🎯 تنفيذ الأداة المطلوبة
// ============================================
export async function executeTool(toolName: string, toolInput: any): Promise<any> {
  switch (toolName) {
    case 'read_file':
      return await readFile(toolInput.file_path);

    case 'write_file':
      return await writeFile(toolInput.file_path, toolInput.content);

    case 'edit_file':
      return await editFile(toolInput.file_path, toolInput.old_text, toolInput.new_text);

    case 'run_command':
      return await runCommand(toolInput.command);

    case 'list_directory':
      return await listDirectory(toolInput.dir_path);

    case 'search_in_files':
      return await searchInFiles(toolInput.dir_path, toolInput.search_pattern);

    default:
      return {
        success: false,
        error: `أداة غير معروفة: ${toolName}`,
      };
  }
}
