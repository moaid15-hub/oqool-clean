// src/index.js
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
    features: ['توثيق تلقائي', 'تعاون ذكي', 'أمان متقدم', 'دعم متعدد اللغات', 'تحليل أداء'],
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '2.0.0',
  });
});

// تشغيل السيرفر
app.listen(PORT, () => {
  console.log(chalk.green(`✅ السيرفر يعمل على المنفذ ${PORT}`));
  console.log(chalk.cyan('🔗 http://localhost:' + PORT));
  console.log(chalk.yellow('📚 جرب: oqool-code docs search "express"'));
  console.log(chalk.yellow('🔐 جرب: oqool-code security scan src/index.js'));
  console.log(chalk.yellow('👥 جرب: oqool-code session create "Demo Project" "عرض توضيحي"'));
});

export default app;
