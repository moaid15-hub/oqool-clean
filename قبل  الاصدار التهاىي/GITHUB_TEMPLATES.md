# 🐙 GitHub Templates & Best Practices

## 📋 محتويات الملف
1. Issue Templates
2. Pull Request Template
3. GitHub Actions Workflows
4. Contributing Guidelines
5. Code of Conduct
6. Release Process

---

## 1. 🐛 Issue Templates

### Bug Report Template
```markdown
---
name: Bug Report
about: Report a bug to help us improve
title: '[BUG] '
labels: bug
assignees: ''
---

## 🐛 وصف المشكلة
وصف واضح وموجز للمشكلة.

## 📝 خطوات إعادة الإنتاج
1. قم بـ '...'
2. انقر على '...'
3. scroll down to '...'
4. شاهد الخطأ

## ✅ السلوك المتوقع
وصف واضح لما كان يجب أن يحدث.

## 📸 لقطات الشاشة
إذا كان ممكناً، أضف لقطات شاشة للمساعدة في شرح المشكلة.

## 💻 البيئة
- OS: [e.g. Windows 11, macOS 14, Ubuntu 22.04]
- Oqool Version: [e.g. 1.0.0]
- Node Version: [e.g. 18.17.0]
- CLI/Desktop: [e.g. CLI]

## 📊 Logs
```bash
# أضف أي logs ذات صلة هنا
```

## 📌 سياق إضافي
أضف أي سياق آخر حول المشكلة هنا.

## ✔️ Checklist
- [ ] بحثت في المشكلات الموجودة
- [ ] المشكلة قابلة للإعادة
- [ ] أضفت logs/screenshots
```

### Feature Request Template
```markdown
---
name: Feature Request
about: Suggest an idea for this project
title: '[FEATURE] '
labels: enhancement
assignees: ''
---

## 🎯 الميزة المقترحة
وصف واضح وموجز للميزة المقترحة.

## 💡 الدافع
اشرح لماذا هذه الميزة ستكون مفيدة. ما المشكلة التي تحلها؟

## 📝 الحل المقترح
وصف واضح لكيف تتخيل أن تعمل هذه الميزة.

## 🔄 البدائل
اشرح أي بدائل أو حلول أخرى فكرت فيها.

## 📸 أمثلة
إذا كان ممكناً، أضف أمثلة، mockups، أو أدوات مشابهة تحقق هذا.

## ✨ قيمة مضافة
ما الفائدة التي ستقدمها هذه الميزة للمستخدمين؟

## 📊 الأولوية
- [ ] حرجة (Critical)
- [ ] عالية (High)
- [ ] متوسطة (Medium)
- [ ] منخفضة (Low)

## 🤝 هل أنت مستعد للمساهمة؟
- [ ] نعم، أستطيع العمل على هذا
- [ ] ربما، بحاجة للمساعدة
- [ ] لا، فقط اقتراح
```

### Documentation Request Template
```markdown
---
name: Documentation Request
about: Request documentation improvements
title: '[DOCS] '
labels: documentation
assignees: ''
---

## 📚 ما الذي يحتاج توثيق؟
وصف واضح للجزء الذي يحتاج توثيق أو تحسين.

## 🔍 الموقع الحالي
أين يجب أن يكون هذا التوثيق؟
- [ ] README
- [ ] Getting Started Guide
- [ ] API Reference
- [ ] Examples
- [ ] FAQ
- [ ] Other: ___

## ✏️ ماذا ينقص؟
- [ ] الوظيفة غير موثقة أصلاً
- [ ] التوثيق غير واضح
- [ ] أمثلة ناقصة
- [ ] معلومات قديمة
- [ ] Other: ___

## 💡 اقتراحات
ما هي المعلومات التي يجب إضافتها أو تحسينها؟

## 🤝 هل أنت مستعد للمساهمة؟
- [ ] نعم، أستطيع كتابة التوثيق
- [ ] لا، فقط اقتراح
```

---

## 2. 📝 Pull Request Template

```markdown
## 🎯 الوصف
وصف واضح وموجز للتغييرات في هذا الـ PR.

## 🔗 Issue ذو صلة
Fixes #(issue number)
أو
Related to #(issue number)

## 🔧 نوع التغيير
- [ ] 🐛 Bug fix (non-breaking change)
- [ ] ✨ New feature (non-breaking change)
- [ ] 💥 Breaking change
- [ ] 📝 Documentation update
- [ ] ♻️ Code refactoring
- [ ] ⚡ Performance improvement
- [ ] ✅ Test addition/modification

## 📋 Checklist
- [ ] الكود يتبع style guidelines المشروع
- [ ] قمت بمراجعة الكود بنفسي
- [ ] قمت بإضافة/تحديث التعليقات اللازمة
- [ ] قمت بتحديث التوثيق
- [ ] لا توجد warnings جديدة
- [ ] أضفت tests تغطي التغييرات
- [ ] جميع الـ tests تمر بنجاح
- [ ] أضفت أي dependencies جديدة إلى package.json

## 🧪 كيف تم الاختبار؟
صف الاختبارات التي قمت بها للتحقق من التغييرات:

**Test Configuration:**
- OS: [e.g. macOS 14]
- Node Version: [e.g. 18.17.0]
- Test Type: [manual/automated]

**Test Cases:**
1. ...
2. ...
3. ...

## 📸 لقطات الشاشة (إذا كان مناسباً)
أضف لقطات شاشة للتغييرات في الـ UI.

**قبل:**
[Screenshot]

**بعد:**
[Screenshot]

## 🔄 تأثير الأداء
هل هناك تأثير على الأداء؟
- [ ] تحسين في الأداء
- [ ] لا تأثير
- [ ] تباطؤ محتمل (مع تفسير)

## 📊 Breaking Changes
إذا كان هذا breaking change، اشرح:
1. ماذا تغير؟
2. لماذا كان ضرورياً؟
3. كيف يمكن للمستخدمين التعامل معه؟

## 📌 ملاحظات إضافية
أي معلومات أخرى مهمة للمراجعين.

## 👥 Reviewers
@mention specific people if needed
```

---

## 3. ⚙️ GitHub Actions Workflows

### CI Workflow
```yaml
# .github/workflows/ci.yml

name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    name: Test
    runs-on: ${{ matrix.os }}
    
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        node: [18, 20]
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node }}
          cache: 'npm'
      
      - name: Install Dependencies
        run: npm ci
      
      - name: Lint
        run: npm run lint
      
      - name: Type Check
        run: npm run type-check
      
      - name: Run Tests
        run: npm test -- --coverage
      
      - name: Upload Coverage
        uses: codecov/codecov-action@v3
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
  
  security:
    name: Security Scan
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Run npm audit
        run: npm audit --audit-level=moderate
      
      - name: Run Snyk
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

### Release Workflow
```yaml
# .github/workflows/release.yml

name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    name: Create Release
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
          registry-url: 'https://registry.npmjs.org'
      
      - name: Install Dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Run Tests
        run: npm test
      
      - name: Generate Changelog
        id: changelog
        uses: metcalfc/changelog-generator@v4.0.1
        with:
          myToken: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Create GitHub Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref }}
          body: ${{ steps.changelog.outputs.changelog }}
          draft: false
          prerelease: false
      
      - name: Publish to npm
        run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Desktop Build Workflow
```yaml
# .github/workflows/build-desktop.yml

name: Build Desktop Apps

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    name: Build ${{ matrix.os }}
    runs-on: ${{ matrix.os }}
    
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - name: Install Dependencies
        run: npm ci
      
      - name: Build Desktop App
        run: npm run build:desktop
      
      - name: Package (Ubuntu)
        if: matrix.os == 'ubuntu-latest'
        run: |
          npm run package:linux
      
      - name: Package (macOS)
        if: matrix.os == 'macos-latest'
        run: |
          npm run package:mac
        env:
          CSC_LINK: ${{ secrets.MAC_CERTIFICATE }}
          CSC_KEY_PASSWORD: ${{ secrets.MAC_CERTIFICATE_PASSWORD }}
      
      - name: Package (Windows)
        if: matrix.os == 'windows-latest'
        run: |
          npm run package:win
        env:
          CSC_LINK: ${{ secrets.WIN_CERTIFICATE }}
          CSC_KEY_PASSWORD: ${{ secrets.WIN_CERTIFICATE_PASSWORD }}
      
      - name: Upload Artifacts
        uses: actions/upload-artifact@v3
        with:
          name: desktop-${{ matrix.os }}
          path: dist/*.{exe,dmg,AppImage,deb}
```

---

## 4. 🤝 Contributing Guidelines

```markdown
# Contributing to Oqool AI

نحن نرحب بمساهماتك! 🎉

## 📋 جدول المحتويات
- [Code of Conduct](#code-of-conduct)
- [كيف أساهم؟](#كيف-أساهم)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Pull Request Process](#pull-request-process)
- [Community](#community)

## 📜 Code of Conduct

هذا المشروع يتبع [Code of Conduct](CODE_OF_CONDUCT.md). بالمشاركة، أنت توافق على احترام هذه القواعد.

## 🚀 كيف أساهم؟

### Reporting Bugs
1. تحقق من [existing issues](https://github.com/moaid15-hub/oqool-monorepo/issues)
2. إذا لم تجد المشكلة، [create a new issue](https://github.com/moaid15-hub/oqool-monorepo/issues/new?template=bug_report.md)
3. استخدم bug report template
4. قدم أكبر قدر من التفاصيل

### Suggesting Features
1. تحقق من [existing feature requests](https://github.com/moaid15-hub/oqool-monorepo/issues?q=is%3Aissue+is%3Aopen+label%3Aenhancement)
2. [Create a new feature request](https://github.com/moaid15-hub/oqool-monorepo/issues/new?template=feature_request.md)
3. اشرح use case والفائدة

### Contributing Code
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Write/update tests
5. Ensure tests pass
6. Commit your changes (`git commit -m 'Add some amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## 💻 Development Setup

### Prerequisites
```bash
- Node.js 18+
- npm 9+
- Git
```

### Installation
```bash
# Clone the repo
git clone https://github.com/moaid15-hub/oqool-monorepo.git
cd oqool-monorepo

# Install dependencies
npm install

# Build packages
npm run build

# Run tests
npm test

# Start development
npm run dev
```

### Project Structure
```
oqool-monorepo/
├── packages/
│   ├── cli/           # CLI package
│   ├── shared/        # Shared utilities
│   └── desktop/       # Desktop app
├── docs/              # Documentation
└── examples/          # Example projects
```

## 📏 Coding Standards

### TypeScript
- Use TypeScript for all new code
- Enable strict mode
- Avoid `any` types
- Add JSDoc comments for public APIs

### Code Style
```typescript
// ✅ Good
export async function processFile(
  filePath: string,
  options: ProcessOptions
): Promise<ProcessResult> {
  // Implementation
}

// ❌ Bad
export async function processFile(filePath, options) {
  // Implementation
}
```

### Testing
- Write tests for new features
- Maintain > 80% coverage
- Test edge cases
- Use descriptive test names

```typescript
// ✅ Good
describe('UnifiedAIAdapter', () => {
  it('should failover to Claude when DeepSeek is unavailable', async () => {
    // Test implementation
  });
});

// ❌ Bad
describe('Adapter', () => {
  it('works', () => {
    // Test implementation
  });
});
```

### Commit Messages
Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
feat: add voice coding feature
fix: resolve memory leak in file watcher
docs: update API documentation
style: format code with prettier
refactor: simplify error handling
test: add unit tests for optimizer
chore: update dependencies
```

### Documentation
- Update README if needed
- Add JSDoc comments
- Update CHANGELOG.md
- Add examples for new features

## 🔄 Pull Request Process

1. **Before submitting:**
   - [ ] Code follows style guidelines
   - [ ] Tests pass locally
   - [ ] Added/updated tests
   - [ ] Updated documentation
   - [ ] Resolved merge conflicts

2. **PR Title:**
   Use conventional commit format:
   ```
   feat: add amazing feature
   fix: resolve critical bug
   docs: update contributing guide
   ```

3. **PR Description:**
   - Fill out the PR template completely
   - Link related issues
   - Add screenshots if UI changes
   - Describe breaking changes

4. **Review Process:**
   - At least 1 approval required
   - CI must pass
   - Conflicts must be resolved
   - Code owner approval for core changes

5. **After Approval:**
   - Squash commits if needed
   - Merge using "Squash and merge"
   - Delete branch after merge

## 🎨 Areas for Contribution

### Good First Issues
Look for issues labeled `good first issue`:
- Documentation improvements
- Bug fixes
- Test additions
- Example projects

### High Priority
- Performance improvements
- Security fixes
- Core feature enhancements
- Critical bugs

### Future Features
- Plugin system
- More AI personalities
- Additional language support
- Integration with other tools

## 💬 Community

### Getting Help
- [GitHub Discussions](https://github.com/moaid15-hub/oqool-monorepo/discussions)
- [Discord Server](https://discord.gg/oqool)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/oqool)

### Stay Updated
- Star the repo
- Watch for updates
- Follow on Twitter: [@oqool_ai](https://twitter.com/oqool_ai)

## 🏆 Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Featured in monthly highlights
- Given contributor badge

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**شكراً لمساهمتك في جعل Oqool AI أفضل!** 🚀
```

---

## 5. 🤝 Code of Conduct

```markdown
# Code of Conduct

## 🎯 Our Pledge

We pledge to make participation in our project and community a harassment-free experience for everyone.

## 📜 Our Standards

### ✅ Positive Behavior:
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

### ❌ Unacceptable Behavior:
- Trolling, insulting/derogatory comments
- Public or private harassment
- Publishing others' private information
- Other conduct which could be considered inappropriate

## 🛡️ Enforcement

Project maintainers are responsible for clarifying standards and will take appropriate action in response to unacceptable behavior.

## 📧 Reporting

Instances of abusive, harassing, or otherwise unacceptable behavior may be reported by contacting the project team at conduct@oqool.ai.

## 🔍 Scope

This Code of Conduct applies within all project spaces and when an individual is representing the project or community.
```

---

## 6. 📦 Release Process

### Version Numbering
Follow [Semantic Versioning](https://semver.org/):
- MAJOR version for incompatible API changes
- MINOR version for backwards-compatible functionality
- PATCH version for backwards-compatible bug fixes

### Release Checklist
```markdown
## Pre-Release
- [ ] All tests pass
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version bumped in package.json
- [ ] Git tag created
- [ ] Release notes prepared

## Release
- [ ] Create GitHub release
- [ ] Publish to npm
- [ ] Build desktop apps
- [ ] Upload installers
- [ ] Update website

## Post-Release
- [ ] Announce on social media
- [ ] Update documentation site
- [ ] Monitor for issues
- [ ] Prepare hotfix if needed
```

---

**استخدم هذه Templates لتحسين workflow المشروع على GitHub!** 🚀
