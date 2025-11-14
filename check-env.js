#!/usr/bin/env node

/**
 * Script to check environment variables and host configuration
 */

require('dotenv').config();

console.log('🔍 فحص إعدادات الاستضافة...\n');
console.log('='.repeat(50));

// Check PORT
const port = process.env.PORT || 3000;
console.log(`✅ PORT: ${port}`);
if (!process.env.PORT) {
  console.log('   ⚠️  استخدام المنفذ الافتراضي (3000)');
  console.log('   💡 نصيحة: عيّن PORT في ملف .env إذا كانت الاستضافة تحتاج منفذ محدد');
}

// Check HOST
const host = process.env.HOST || '0.0.0.0';
console.log(`✅ HOST: ${host}`);
if (!process.env.HOST) {
  console.log('   ⚠️  استخدام العنوان الافتراضي (0.0.0.0)');
}

// Check Discord OAuth2
console.log('\n📱 إعدادات Discord OAuth2:');
if (process.env.DISCORD_CLIENT_ID) {
  console.log(`✅ DISCORD_CLIENT_ID: ${process.env.DISCORD_CLIENT_ID.substring(0, 10)}...`);
} else {
  console.log('❌ DISCORD_CLIENT_ID: غير موجود');
  console.log('   ⚠️  هذا مطلوب لتسجيل الدخول');
}

if (process.env.DISCORD_CLIENT_SECRET) {
  console.log(`✅ DISCORD_CLIENT_SECRET: ${'*'.repeat(20)}`);
} else {
  console.log('❌ DISCORD_CLIENT_SECRET: غير موجود');
  console.log('   ⚠️  هذا مطلوب لتسجيل الدخول');
}

if (process.env.DISCORD_CALLBACK_URL) {
  console.log(`✅ DISCORD_CALLBACK_URL: ${process.env.DISCORD_CALLBACK_URL}`);
} else {
  console.log('⚠️  DISCORD_CALLBACK_URL: غير موجود (سيستخدم localhost)');
  console.log(`   💡 الافتراضي: http://localhost:${port}/auth/discord/callback`);
}

// Check Session Secret
console.log('\n🔐 إعدادات الجلسة:');
if (process.env.SESSION_SECRET && process.env.SESSION_SECRET !== 'fallback_secret') {
  console.log(`✅ SESSION_SECRET: ${'*'.repeat(20)}`);
} else {
  console.log('⚠️  SESSION_SECRET: غير موجود أو يستخدم القيمة الافتراضية');
  console.log('   ⚠️  هذا غير آمن للإنتاج!');
}

// Check Database
console.log('\n💾 إعدادات قاعدة البيانات:');
if (process.env.MONGODB_URI) {
  // Hide password in URI
  const uri = process.env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
  console.log(`✅ MONGODB_URI: ${uri}`);
} else {
  console.log('⚠️  MONGODB_URI: غير موجود');
  console.log('   ⚠️  سيستخدم MemoryStore للجلسات (غير مناسب للإنتاج)');
}

if (process.env.MONGODB_DB_NAME) {
  console.log(`✅ MONGODB_DB_NAME: ${process.env.MONGODB_DB_NAME}`);
} else {
  console.log('⚠️  MONGODB_DB_NAME: غير موجود (سيستخدم primebot)');
}

// Check Node Environment
console.log('\n🌍 بيئة العمل:');
const nodeEnv = process.env.NODE_ENV || 'development';
console.log(`✅ NODE_ENV: ${nodeEnv}`);
if (nodeEnv === 'development') {
  console.log('   ⚠️  أنت في وضع التطوير');
  console.log('   💡 نصيحة: عيّن NODE_ENV=production للاستضافة');
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 الملخص:\n');

const required = [
  { name: 'PORT', value: process.env.PORT, optional: true },
  { name: 'HOST', value: process.env.HOST, optional: true },
  { name: 'DISCORD_CLIENT_ID', value: process.env.DISCORD_CLIENT_ID, optional: false },
  { name: 'DISCORD_CLIENT_SECRET', value: process.env.DISCORD_CLIENT_SECRET, optional: false },
  { name: 'SESSION_SECRET', value: process.env.SESSION_SECRET, optional: true },
  { name: 'MONGODB_URI', value: process.env.MONGODB_URI, optional: true },
];

let allGood = true;
required.forEach(item => {
  if (!item.value && !item.optional) {
    console.log(`❌ ${item.name}: مطلوب`);
    allGood = false;
  } else if (!item.value && item.optional) {
    console.log(`⚠️  ${item.name}: غير موجود (اختياري)`);
  } else {
    console.log(`✅ ${item.name}: موجود`);
  }
});

console.log('\n' + '='.repeat(50));
console.log(`\n🚀 الخادم سيعمل على: http://${host}:${port}\n`);

if (allGood) {
  console.log('✅ جميع المتغيرات المطلوبة موجودة!');
} else {
  console.log('⚠️  بعض المتغيرات المطلوبة مفقودة. راجع ملف .env');
}

