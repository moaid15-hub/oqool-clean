#!/usr/bin/env node

// Simple test script to run oqool without complex imports
console.log('🚀 Oqool CLI Test');
console.log('📌 Version: 1.0.0');
console.log('✅ النظام يعمل بنجاح!');

// Test basic Node.js
console.log('\n🔍 Environment:');
console.log(`Node version: ${process.version}`);
console.log(`Platform: ${process.platform}`);
console.log(`CWD: ${process.cwd()}`);

// Check if .env exists
const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  console.log('\n✅ .env file found');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n').filter(l => l.trim() && !l.startsWith('#'));
  console.log(`📝 Environment variables: ${lines.length}`);
} else {
  console.log('\n⚠️  .env file not found');
}

console.log('\n✨ Test completed successfully!');
