const fs = require('fs');
const path = require('path');

// List of key files to check
const keyFiles = [
  'html/index.html',
  'html/login.html',
  'html/dashboard.html',
  'html/settings.html'
];

// Expected base URL
const expectedBaseUrl = 'https://primeblacklist.vercel.app';

console.log('Verifying deployment configuration...\n');

let allCorrect = true;

keyFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes(`<base href="${expectedBaseUrl}"/>`)) {
      console.log(`✓ ${file} - Base URL is correct`);
    } else {
      console.log(`✗ ${file} - Base URL is incorrect or missing`);
      allCorrect = false;
    }
  } catch (err) {
    console.log(`✗ ${file} - Error reading file: ${err.message}`);
    allCorrect = false;
  }
});

console.log('\n' + '='.repeat(50));

if (allCorrect) {
  console.log('✅ All files have the correct base URL');
  console.log('✅ Ready for Vercel deployment');
} else {
  console.log('❌ Some files need to be updated');
  console.log('❌ Please run the fix-urls.js script or update manually');
}

console.log('\nNext steps:');
console.log('1. Set the required environment variables in Vercel');
console.log('2. Deploy to Vercel');
console.log('3. Update your Discord OAuth2 redirect URL');