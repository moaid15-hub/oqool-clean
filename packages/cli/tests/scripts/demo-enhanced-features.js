// demo-enhanced-features.js
// ============================================
// 🎬 عرض توضيحي للميزات المحسنة
// ============================================

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

// إنشاء مجلد العرض التوضيحي
async function createDemoProject() {
  console.log(chalk.cyan('🚀 إنشاء مشروع توضيحي...\n'));

  const demoDir = 'demo-enhanced-features';
  await fs.ensureDir(demoDir);

  // إنشاء package.json
  const packageJson = {
    name: 'demo-enhanced-features',
    version: '1.0.0',
    description: 'عرض توضيحي لميزات Oqool Code المحسنة',
    main: 'src/index.js',
    scripts: {
      start: 'node src/index.js',
      test: 'jest',
      build: 'tsc',
    },
    dependencies: {
      express: '^4.18.0',
      cors: '^2.8.5',
      dotenv: '^16.0.0',
    },
    devDependencies: {
      typescript: '^5.0.0',
      jest: '^29.0.0',
      eslint: '^8.0.0',
      prettier: '^3.0.0',
    },
  };

  await fs.writeJson(path.join(demoDir, 'package.json'), packageJson, { spaces: 2 });

  // إنشاء tsconfig.json
  const tsconfig = {
    compilerOptions: {
      target: 'ES2020',
      module: 'commonjs',
      outDir: './dist',
      rootDir: './src',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
    },
    include: ['src/**/*'],
    exclude: ['node_modules', 'dist'],
  };

  await fs.writeJson(path.join(demoDir, 'tsconfig.json'), tsconfig, { spaces: 2 });

  // إنشاء ملف .oqoolignore
  const oqoolIgnore = `# Dependencies
node_modules/
dist/
build/
coverage/

# Environment
.env*
*.log

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Oqool
.oqool/
.oqool-docs/`;

  await fs.writeFile(path.join(demoDir, '.oqoolignore'), oqoolIgnore);

  // إنشاء مجلد src
  await fs.ensureDir(path.join(demoDir, 'src'));

  // إنشاء ملف index.js
  const indexJs = `// src/index.js
// ============================================
// 🚀 ملف العرض التوضيحي - Oqool Code v2.0
// ============================================

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// تحميل متغيرات البيئة
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'مرحباً بك في Oqool Code v2.0! 🎉',
    features: [
      'توثيق تلقائي',
      'تعاون ذكي',
      'أمان متقدم',
      'دعم متعدد اللغات',
      'تحليل أداء'
    ],
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '2.0.0'
  });
});

// تشغيل السيرفر
app.listen(PORT, () => {
  console.log(chalk.green(\`✅ السيرفر يعمل على المنفذ \${PORT}\`));
  console.log(chalk.cyan('🔗 http://localhost:' + PORT));
  console.log(chalk.yellow('📚 جرب: oqool-code docs search "express"'));
  console.log(chalk.yellow('🔐 جرب: oqool-code security scan src/index.js'));
  console.log(chalk.yellow('👥 جرب: oqool-code session create "Demo Project" "عرض توضيحي"'));
});

export default app;`;

  await fs.writeFile(path.join(demoDir, 'src', 'index.js'), indexJs);

  // إنشاء ملف README للمشروع
  const readme = `# 🎬 عرض توضيحي لـ Oqool Code v2.0

## 🚀 ما الجديد في الإصدار 2.0

### 📚 توثيق تلقائي
\`\`\`bash
# البحث في تاريخ التفاعلات
oqool-code docs search "express"

# عرض الإحصائيات
oqool-code docs stats

# تصدير التوثيق
oqool-code docs export --format json
\`\`\`

### 👥 تعاون ذكي
\`\`\`bash
# إنشاء جلسة تعاون
oqool-code session create "Demo Project" "عرض الميزات الجديدة"

# دعوة أعضاء
oqool-code session invite user@example.com --role member

# عرض التقرير
oqool-code session list
\`\`\`

### 🔐 أمان متقدم
\`\`\`bash
# فحص الأمان
oqool-code security scan src/index.js

# فحص التبعيات
oqool-code security deps

# توقيع الكود
oqool-code security sign src/index.js

# إنشاء تقرير الأمان
oqool-code security report
\`\`\`

### 📋 قوالب الفريق
\`\`\`bash
# إنشاء قالب
oqool-code team-template create "Express API" "قالب API بسيط" backend --files src/index.js

# البحث في القوالب
oqool-code team-template search "express"
\`\`\`

## 🏃‍♂️ التشغيل

\`\`\`bash
# تثبيت التبعيات
npm install

# تشغيل السيرفر
npm start

# أو مع Oqool Code
oqool-code run src/index.js
\`\`\`

## 🧪 الاختبار

\`\`\`bash
# تشغيل الاختبارات
npm test

# تنسيق الكود
oqool-code format src/**/*.js

# فحص الكود
oqool-code lint src/**/*.js
\`\`\`

## 📊 مراقبة الأداء

\`\`\`bash
# إحصائيات المشروع
oqool-code stats

# تحليل الأداء
oqool-code analyze src/index.js
\`\`\`

---

**🎉 استمتع باستكشاف الميزات الجديدة!**

**صُنع بـ ❤️ بواسطة Oqool AI Team**
`;

  await fs.writeFile(path.join(demoDir, 'README.md'), readme);

  console.log(chalk.green('✅ تم إنشاء مشروع العرض التوضيحي!'));
  console.log(chalk.cyan(`\n📁 المجلد: ${demoDir}`));
  console.log(chalk.white(`\n📋 الملفات المُنشأة:`));
  console.log(chalk.gray(`   - package.json`));
  console.log(chalk.gray(`   - tsconfig.json`));
  console.log(chalk.gray(`   - .oqoolignore`));
  console.log(chalk.gray(`   - src/index.js`));
  console.log(chalk.gray(`   - README.md`));

  console.log(chalk.yellow(`\n🚀 للبدء:`));
  console.log(chalk.cyan(`   cd ${demoDir}`));
  console.log(chalk.cyan(`   npm install`));
  console.log(chalk.cyan(`   npm start`));

  console.log(chalk.yellow(`\n🛠️  جرب الميزات الجديدة:`));
  console.log(chalk.cyan(`   oqool-code docs search "express"`));
  console.log(chalk.cyan(`   oqool-code security scan src/index.js`));
  console.log(chalk.cyan(`   oqool-code session create "Demo" "عرض توضيحي"`));
  console.log(
    chalk.cyan(
      `   oqool-code team-template create "Simple API" "قالب بسيط" backend --files src/index.js`
    )
  );
}

// تشغيل العرض التوضيحي
createDemoProject().catch(console.error);
