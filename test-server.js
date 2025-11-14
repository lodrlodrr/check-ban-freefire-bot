#!/usr/bin/env node

/**
 * Simple test script to verify server can start
 */

require('dotenv').config();

const http = require('http');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

console.log('🧪 اختبار الخادم...\n');

// Test 1: Check if port is available
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('✅ الخادم يعمل!\nServer is working!');
});

server.listen(PORT, HOST, () => {
  console.log(`✅ الخادم يعمل على http://${HOST}:${PORT}`);
  console.log(`\n📝 يمكنك اختبار الخادم بفتح المتصفح على:`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`   أو http://${HOST}:${PORT}`);
  console.log(`\n⏹️  اضغط Ctrl+C لإيقاف الخادم\n`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ الخطأ: المنفذ ${PORT} مستخدم بالفعل`);
    console.error(`💡 الحل: غير المنفذ في ملف .env أو أوقف التطبيق الذي يستخدمه`);
  } else if (err.code === 'EACCES') {
    console.error(`❌ الخطأ: لا يمكن الوصول إلى المنفذ ${PORT}`);
    console.error(`💡 الحل: استخدم منفذ آخر (مثل 3000, 8080) أو شغّل كمسؤول`);
  } else {
    console.error(`❌ خطأ: ${err.message}`);
  }
  process.exit(1);
});

