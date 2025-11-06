# 🎨 دليل تطبيق نظام UI الاحترافي

## 📋 الملفات المُنشأة

```
✅ ui.ts - نظام UI شامل وموحد
✅ cli-example.ts - أمثلة استخدام في الأوامر الرئيسية
✅ cli-agent-example.ts - أمثلة استخدام مع AI Agents
```

---

## 🚀 خطوات التطبيق

### الخطوة 1: نقل ui.ts للمشروع

```bash
# انقل ui.ts إلى packages/cli/src/
cp ui.ts packages/cli/src/ui.ts
```

### الخطوة 2: تثبيت المكتبات المطلوبة

```bash
cd packages/cli
npm install boxen cli-table3 figures gradient-string diff
```

أو أضفها في `package.json`:

```json
{
  "dependencies": {
    "chalk": "^4.1.2",
    "ora": "^5.4.1",
    "inquirer": "^8.2.5",
    "boxen": "^5.1.2",
    "cli-table3": "^0.6.3",
    "figures": "^3.2.0",
    "gradient-string": "^2.0.2",
    "diff": "^5.1.0"
  }
}
```

### الخطوة 3: تحديث الملفات الموجودة

#### في `packages/cli/src/cli.ts`:

**قبل (سيء):**
```typescript
console.log('Starting...');
console.log('Done!');
```

**بعد (احترافي):**
```typescript
import { ui } from './ui';

ui.startSpinner('Starting...');
await doSomething();
ui.succeedSpinner('Done!');
```

#### في `packages/cli/src/cli-new-commands.ts`:

**ابحث عن:**
```typescript
console.log(chalk.green('✅ تم!'));
console.log('الملفات:', files.length);
```

**استبدل بـ:**
```typescript
ui.printSuccess('تم بنجاح!', `${files.length} ملف تم إنشاؤه`);
```

#### في `packages/cli/src/cli-agent.ts`:

**ابحث عن:**
```typescript
const spinner = ora('جاري...').start();
// ... code
spinner.succeed('تم');
```

**استبدل بـ:**
```typescript
ui.startSpinner('جاري...');
// ... code
ui.succeedSpinner('تم');
```

---

## 📝 أمثلة استخدام سريعة

### 1. Spinner بسيط
```typescript
import { ui } from './ui';

ui.startSpinner('جاري التحميل...');
await loadData();
ui.succeedSpinner('تم التحميل!');
```

### 2. خطوات متعددة
```typescript
await ui.runSteps([
  {
    name: 'تحليل المشروع',
    action: async () => {
      await analyzeProject();
    }
  },
  {
    name: 'توليد الكود',
    action: async () => {
      await generateCode();
    }
  }
]);
```

### 3. عرض التغييرات
```typescript
ui.printFileChanges([
  { type: 'create', path: 'src/user.ts', lines: 45 },
  { type: 'modify', path: 'src/app.ts', lines: 3 },
  { type: 'delete', path: 'src/old.ts' }
]);
```

### 4. ملخص احترافي
```typescript
ui.printSummary('نتائج العملية', [
  { label: 'الملفات المنشأة', value: '12', color: 'green' },
  { label: 'الوقت المستغرق', value: '2.3s', color: 'cyan' },
  { label: 'التكلفة', value: '$0.05', color: 'yellow' }
]);
```

### 5. رسائل النجاح/الخطأ
```typescript
// نجاح
ui.printSuccess(
  'تمت العملية بنجاح!',
  'تم إنشاء 5 ملفات جديدة'
);

// خطأ
ui.printError(
  'فشلت العملية',
  'تأكد من الاتصال بالإنترنت'
);

// تحذير
ui.printWarning(
  'انتبه',
  'بعض الملفات موجودة مسبقاً'
);
```

### 6. جداول البيانات
```typescript
const data = [
  { Name: 'Claude', Version: '4', Status: 'Active' },
  { Name: 'GPT', Version: '4', Status: 'Active' },
  { Name: 'DeepSeek', Version: '3', Status: 'Active' }
];

ui.printTable(data, ['Name', 'Version', 'Status']);
```

### 7. عرض الكود
```typescript
ui.printCode(`
async function example() {
  const result = await api.call();
  return result;
}
`, 'typescript');
```

### 8. Next Steps
```typescript
ui.printNextSteps([
  'oqool test - تشغيل الاختبارات',
  'oqool dev - بدء السيرفر',
  'git commit -m "feat: add feature"'
]);
```

---

## 🔄 استبدال الأكواد القديمة

### Pattern 1: Spinner
**ابحث عن:**
```typescript
const spinner = ora('text').start();
spinner.succeed('done');
```

**استبدل بـ:**
```typescript
ui.startSpinner('text');
ui.succeedSpinner('done');
```

### Pattern 2: Console Logs
**ابحث عن:**
```typescript
console.log(chalk.green('✓ Success'));
console.log(chalk.red('✗ Error'));
```

**استبدل بـ:**
```typescript
ui.success('Success');
ui.error('Error');
```

### Pattern 3: Lists
**ابحث عن:**
```typescript
items.forEach(item => {
  console.log(`- ${item}`);
});
```

**استبدل بـ:**
```typescript
ui.printList(items);
```

### Pattern 4: Progress
**ابحث عن:**
```typescript
for (let i = 0; i < total; i++) {
  console.log(`Progress: ${i}/${total}`);
}
```

**استبدل بـ:**
```typescript
for (let i = 0; i < total; i++) {
  ui.printProgress(i + 1, total, 'Processing...');
}
```

---

## 🎯 أولويات التطبيق

### أسبوع 1: الأوامر الأساسية
```
[ ] cli.ts - الأوامر الرئيسية (init, chat, god)
[ ] استبدال كل console.log بـ ui methods
[ ] اختبار الأوامر الأساسية
```

### أسبوع 2: أوامر AI Agents
```
[ ] cli-agent.ts - أوامر الوكلاء
[ ] تحسين عرض نتائج الـ agents
[ ] إضافة progress indicators
```

### أسبوع 3: الأوامر الجديدة
```
[ ] cli-new-commands.ts
[ ] توحيد كل الإخراج
[ ] إضافة summaries احترافية
```

### أسبوع 4: التحسينات النهائية
```
[ ] مراجعة كل الأوامر
[ ] توحيد الألوان والأيقونات
[ ] اختبار شامل
[ ] documentation
```

---

## ✅ Checklist التطبيق

### تثبيت المكتبات
- [ ] npm install boxen cli-table3 figures gradient-string diff

### نقل الملفات
- [ ] نقل ui.ts إلى packages/cli/src/
- [ ] تحديث imports في الملفات

### تحديث الأوامر الأساسية
- [ ] init command
- [ ] chat command
- [ ] god command
- [ ] review command
- [ ] stats command

### تحديث أوامر Agents
- [ ] architect command
- [ ] developer command
- [ ] reviewer command
- [ ] security command
- [ ] tester command
- [ ] optimizer command
- [ ] team command

### تحديث الأوامر الجديدة
- [ ] complete command
- [ ] improve command
- [ ] db commands
- [ ] test commands

### Testing
- [ ] اختبار كل أمر
- [ ] التأكد من الألوان والتنسيق
- [ ] اختبار على أنظمة مختلفة

---

## 🎨 معايير التصميم

### الألوان
```typescript
// استخدم هذه الألوان بشكل متناسق:
- cyan: للعناوين والأوامر
- green: للنجاح والإيجابي
- red: للأخطاء والحرج
- yellow: للتحذيرات والانتباه
- blue: للمعلومات
- gray: للتفاصيل الثانوية
```

### الأيقونات
```typescript
// استخدم هذه الأيقونات:
✓ - نجاح
✗ - فشل
⚠ - تحذير
ℹ - معلومات
💡 - نصيحة
🚀 - بدء عملية
📄 - ملف
📁 - مجلد
🔍 - بحث/مراجعة
🛡️ - أمان
⚡ - أداء/سرعة
```

### التنسيق
```typescript
// Headers دائماً بهذا الشكل:
ui.printHeader('العنوان', 'الوصف الفرعي');

// Sections للتقسيم:
ui.printSection('اسم القسم');

// Summaries للنتائج:
ui.printSummary('العنوان', stats);
```

---

## 🐛 حل المشاكل الشائعة

### مشكلة: الألوان لا تظهر
```bash
# تأكد من:
export FORCE_COLOR=1
```

### مشكلة: Spinner لا يعمل
```typescript
// تأكد من استدعاء stop أو succeed/fail
ui.startSpinner('text');
// ... code
ui.succeedSpinner('done'); // أو stopSpinner()
```

### مشكلة: Table غير منسقة
```typescript
// تأكد من أن الأعمدة موجودة في كل row
const data = [
  { col1: 'value', col2: 'value' }, // ✓
  { col1: 'value' } // ✗ ناقص col2
];
```

---

## 📚 المراجع السريعة

```typescript
// UI Instance
import { ui } from './ui';

// Logging
ui.info('message');
ui.success('message');
ui.warning('message');
ui.error('message');
ui.debug('message');

// Spinners
ui.startSpinner('text');
ui.updateSpinner('new text');
ui.succeedSpinner('done');
ui.failSpinner('failed');

// Display
ui.printHeader('title', 'subtitle');
ui.printSection('section name');
ui.printList(['item1', 'item2']);
ui.printTable(data, columns);
ui.printCode(code, 'language');
ui.printFileChanges(changes);

// Boxes
ui.printSuccess('message', 'details');
ui.printError('message', 'details');
ui.printWarning('message', 'details');
ui.printInfo('message', 'details');

// Interactive
await ui.confirm('question?');
await ui.input('question:', 'default');

// Helpers
ui.printTip('tip message');
ui.printNextSteps(['step1', 'step2']);
ui.printSummary('title', stats);
```

---

## 🎉 النتيجة المتوقعة

بعد تطبيق هذا النظام، ستحصل على:

✅ إخراج موحد واحترافي
✅ تجربة مستخدم ممتازة
✅ كود منظم وقابل للصيانة
✅ رسائل واضحة ومفيدة
✅ مظهر احترافي مثل Cursor/VS Code
✅ سهولة في التطوير والتحديث

---

**ابدأ بتطبيق ui.ts في ملف واحد أولاً، ثم انتقل للباقي تدريجياً!** 🚀
