// fix-stages/security-fixer.ts
// ============================================
// ✅ المرحلة 1 (P1): إصلاح الثغرات الأمنية
// يسأل المستخدم قبل الإصلاح
// ============================================

import { FixIssue } from '../auto-fix-system.js';
import { createClientFromConfig } from '../api-client.js';
import { createSecurityEnhancements } from '../security-enhancements.js';

export class SecurityFixer {
  private workingDir: string;
  private securityScanner: any;

  constructor(workingDir: string = process.cwd()) {
    this.workingDir = workingDir;
  }

  /**
   * تحليل الكود للبحث عن ثغرات أمنية
   */
  async analyze(code: string, file: string): Promise<FixIssue[]> {
    const issues: FixIssue[] = [];

    // 1. فحص أنماط الكود الخطيرة
    issues.push(...this.detectDangerousPatterns(code));

    // 2. فحص الحقن (Injection)
    issues.push(...this.detectInjectionVulnerabilities(code));

    // 3. فحص التشفير
    issues.push(...this.detectCryptoIssues(code));

    // 4. فحص المصادقة والتخويل
    issues.push(...this.detectAuthIssues(code));

    // 5. فحص معالجة الأخطاء
    issues.push(...this.detectErrorHandling(code));

    return issues;
  }

  /**
   * إصلاح الثغرات الأمنية
   */
  async fix(code: string, issues: FixIssue[]): Promise<string> {
    let fixedCode = code;

    // الإصلاحات المباشرة أولاً
    fixedCode = this.applyDirectSecurityFixes(fixedCode, issues);

    // الإصلاحات المعقدة بـ AI
    const complexIssues = issues.filter((i) => !i.fix || i.fix === 'complex');
    if (complexIssues.length > 0) {
      fixedCode = await this.fixWithAI(fixedCode, complexIssues);
    }

    return fixedCode;
  }

  /**
   * كشف الأنماط الخطيرة
   */
  private detectDangerousPatterns(code: string): FixIssue[] {
    const issues: FixIssue[] = [];
    const lines = code.split('\n');

    const dangerousPatterns = [
      {
        pattern: /eval\s*\(/g,
        message: 'استخدام eval() خطير جداً - يمكن تنفيذ كود عشوائي',
        severity: 'critical',
        fix: 'remove_eval',
        suggestion: 'استخدم JSON.parse() أو Function constructor إذا كان ضرورياً',
      },
      {
        pattern: /new\s+Function\s*\(/g,
        message: 'استخدام Function constructor خطير',
        severity: 'high',
        fix: 'complex',
        suggestion: 'أعد هيكلة الكود لتجنب إنشاء دوال ديناميكية',
      },
      {
        pattern: /innerHTML\s*=/g,
        message: 'innerHTML معرض لـ XSS attacks',
        severity: 'high',
        fix: 'replace_with_textcontent',
        suggestion: 'استخدم textContent أو createTextNode()',
      },
      {
        pattern: /document\.write\s*\(/g,
        message: 'document.write() معرض للثغرات',
        severity: 'medium',
        fix: 'complex',
        suggestion: 'استخدم طرق DOM الحديثة',
      },
      {
        pattern: /\.exec\(/g,
        message: 'استخدام exec() لتنفيذ أوامر النظام خطير',
        severity: 'critical',
        fix: 'complex',
        suggestion: 'تحقق من المدخلات وقم بعمل whitelist للأوامر',
      },
      {
        pattern: /dangerouslySetInnerHTML/g,
        message: 'dangerouslySetInnerHTML معرض لـ XSS',
        severity: 'high',
        fix: 'complex',
        suggestion: 'استخدم DOMPurify للتنظيف أو تجنب HTML الخام',
      },
    ];

    lines.forEach((line, index) => {
      dangerousPatterns.forEach(({ pattern, message, severity, fix, suggestion }) => {
        if (pattern.test(line)) {
          issues.push({
            stage: 'security',
            priority: 'P1',
            type: 'DangerousPattern',
            message,
            line: index + 1,
            fix,
            suggestion,
          });
        }
      });
    });

    return issues;
  }

  /**
   * كشف ثغرات الحقن
   */
  private detectInjectionVulnerabilities(code: string): FixIssue[] {
    const issues: FixIssue[] = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      // SQL Injection
      if (
        /['"]SELECT.*FROM.*WHERE.*\+.*['"]/.test(line) ||
        /['"]INSERT.*INTO.*VALUES.*\+.*['"]/.test(line)
      ) {
        issues.push({
          stage: 'security',
          priority: 'P1',
          type: 'SQLInjection',
          message: 'محتمل SQL Injection - استخدم prepared statements',
          line: index + 1,
          fix: 'use_prepared_statements',
          suggestion: 'استخدم parameterized queries أو ORM',
        });
      }

      // Command Injection
      if (/exec.*\+/.test(line) || /spawn.*\+/.test(line)) {
        issues.push({
          stage: 'security',
          priority: 'P1',
          type: 'CommandInjection',
          message: 'محتمل Command Injection',
          line: index + 1,
          fix: 'sanitize_input',
          suggestion: 'تحقق من المدخلات واستخدم whitelist',
        });
      }

      // Path Traversal
      if (/\.\.\//.test(line) || /\.\.\\/.test(line)) {
        issues.push({
          stage: 'security',
          priority: 'P1',
          type: 'PathTraversal',
          message: 'محتمل Path Traversal attack',
          line: index + 1,
          fix: 'validate_path',
          suggestion: 'استخدم path.resolve() وتحقق من المسار',
        });
      }
    });

    return issues;
  }

  /**
   * كشف مشاكل التشفير
   */
  private detectCryptoIssues(code: string): FixIssue[] {
    const issues: FixIssue[] = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      // خوارزميات تشفير قديمة
      if (/crypto\.createHash\(['"]md5['"]\)/.test(line)) {
        issues.push({
          stage: 'security',
          priority: 'P1',
          type: 'WeakCrypto',
          message: 'MD5 خوارزمية ضعيفة',
          line: index + 1,
          fix: 'use_strong_hash',
          suggestion: 'استخدم SHA-256 أو أفضل',
        });
      }

      if (/crypto\.createHash\(['"]sha1['"]\)/.test(line)) {
        issues.push({
          stage: 'security',
          priority: 'P1',
          type: 'WeakCrypto',
          message: 'SHA1 خوارزمية ضعيفة',
          line: index + 1,
          fix: 'use_strong_hash',
          suggestion: 'استخدم SHA-256 أو أفضل',
        });
      }

      // تشفير بدون salt
      if (/crypto\.createCipher/.test(line)) {
        issues.push({
          stage: 'security',
          priority: 'P1',
          type: 'WeakCrypto',
          message: 'createCipher مهمل - لا يستخدم salt',
          line: index + 1,
          fix: 'use_cipher_iv',
          suggestion: 'استخدم crypto.createCipheriv() مع IV عشوائي',
        });
      }

      // مفاتيح مشفرة في الكود
      if (
        /api[_-]?key|password|secret|token/.test(line.toLowerCase()) &&
        /'[^']{20,}'|"[^"]{20,}"/.test(line)
      ) {
        issues.push({
          stage: 'security',
          priority: 'P1',
          type: 'HardcodedSecret',
          message: 'مفتاح سري مُخزن في الكود',
          line: index + 1,
          fix: 'use_env_var',
          suggestion: 'استخدم متغيرات البيئة (process.env)',
        });
      }
    });

    return issues;
  }

  /**
   * كشف مشاكل المصادقة
   */
  private detectAuthIssues(code: string): FixIssue[] {
    const issues: FixIssue[] = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      // مقارنة كلمات مرور بسيطة
      if (/password\s*===?\s*['"]/.test(line) || /['"].*password.*['"]/.test(line)) {
        issues.push({
          stage: 'security',
          priority: 'P1',
          type: 'WeakAuth',
          message: 'مقارنة كلمة مرور غير آمنة',
          line: index + 1,
          fix: 'use_bcrypt',
          suggestion: 'استخدم bcrypt أو مكتبة hashing آمنة',
        });
      }

      // JWT بدون توقيع
      if (/jwt\.decode/.test(line) && !/verify/.test(line)) {
        issues.push({
          stage: 'security',
          priority: 'P1',
          type: 'WeakAuth',
          message: 'JWT decode بدون verify',
          line: index + 1,
          fix: 'use_jwt_verify',
          suggestion: 'استخدم jwt.verify() للتحقق من التوقيع',
        });
      }
    });

    return issues;
  }

  /**
   * كشف معالجة الأخطاء
   */
  private detectErrorHandling(code: string): FixIssue[] {
    const issues: FixIssue[] = [];
    const lines = code.split('\n');

    let inCatchBlock = false;
    lines.forEach((line, index) => {
      if (/catch\s*\(/.test(line)) {
        inCatchBlock = true;
      }

      if (inCatchBlock && /console\.(log|error)\(.*error/.test(line)) {
        issues.push({
          stage: 'security',
          priority: 'P1',
          type: 'InformationLeak',
          message: 'تسريب معلومات الخطأ في console',
          line: index + 1,
          fix: 'sanitize_error',
          suggestion: 'لا تعرض تفاصيل الأخطاء الحساسة',
        });
      }

      if (inCatchBlock && line.trim() === '}') {
        inCatchBlock = false;
      }
    });

    return issues;
  }

  /**
   * تطبيق الإصلاحات المباشرة
   */
  private applyDirectSecurityFixes(code: string, issues: FixIssue[]): string {
    let fixedCode = code;

    for (const issue of issues) {
      if (!issue.fix || issue.fix === 'complex') continue;

      switch (issue.fix) {
        case 'remove_eval':
          fixedCode = fixedCode.replace(/eval\s*\(/g, '// REMOVED: eval(');
          break;

        case 'replace_with_textcontent':
          fixedCode = fixedCode.replace(
            /(\w+)\.innerHTML\s*=\s*([^;]+);/g,
            '$1.textContent = $2; // Changed from innerHTML for security'
          );
          break;

        case 'use_strong_hash':
          fixedCode = fixedCode
            .replace(/crypto\.createHash\(['"]md5['"]\)/g, "crypto.createHash('sha256')")
            .replace(/crypto\.createHash\(['"]sha1['"]\)/g, "crypto.createHash('sha256')");
          break;

        case 'use_cipher_iv':
          fixedCode = fixedCode.replace(
            /crypto\.createCipher/g,
            'crypto.createCipheriv // TODO: Add IV parameter'
          );
          break;

        case 'use_env_var':
          // تعليق على الأسرار المشفرة
          if (issue.line) {
            const lines = fixedCode.split('\n');
            const lineIndex = issue.line - 1;
            lines[lineIndex] = `// TODO: Move to environment variable\n${lines[lineIndex]}`;
            fixedCode = lines.join('\n');
          }
          break;
      }
    }

    return fixedCode;
  }

  /**
   * إصلاح باستخدام AI
   */
  private async fixWithAI(code: string, issues: FixIssue[]): Promise<string> {
    const client = await createClientFromConfig();
    if (!client) {
      throw new Error('فشل الاتصال بـ AI');
    }

    const systemPrompt = `أنت خبير أمن سيبراني متخصص في تأمين الكود.

الكود به الثغرات الأمنية التالية:
${issues.map((i) => `- السطر ${i.line}: ${i.message}\n  الحل المقترح: ${i.suggestion}`).join('\n\n')}

الكود:
\`\`\`
${code}
\`\`\`

المطلوب:
1. قم بإصلاح جميع الثغرات الأمنية
2. اتبع أفضل الممارسات الأمنية (OWASP Top 10)
3. أضف التحققات الضرورية
4. استخدم المكتبات الآمنة
5. احتفظ بالوظيفة الأصلية
6. أرجع الكود المصلح فقط

استخدم صيغة:
\`\`\`typescript
// الكود المصلح والآمن هنا
\`\`\``;

    const response = await client.sendChatMessage([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'قم بتأمين الكود' },
    ]);

    if (!response.success) {
      throw new Error('فشل في الحصول على الإصلاح من AI');
    }

    // استخراج الكود المصلح
    const codeMatch = response.message.match(/```(?:typescript|javascript|ts|js)?\n([\s\S]*?)```/);
    if (codeMatch) {
      return codeMatch[1].trim();
    }

    return response.message.trim();
  }

  /**
   * تقييم مستوى الأمان
   */
  calculateSecurityScore(issues: FixIssue[]): number {
    let score = 100;

    for (const issue of issues) {
      if (issue.type === 'DangerousPattern') score -= 30;
      else if (issue.type === 'SQLInjection') score -= 25;
      else if (issue.type === 'CommandInjection') score -= 25;
      else if (issue.type === 'WeakCrypto') score -= 20;
      else if (issue.type === 'HardcodedSecret') score -= 20;
      else if (issue.type === 'PathTraversal') score -= 15;
      else score -= 10;
    }

    return Math.max(0, score);
  }
}
