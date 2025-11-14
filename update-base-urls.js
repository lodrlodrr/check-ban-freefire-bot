const fs = require('fs');
const path = require('path');

// New Vercel deployment URL
const NEW_DEPLOYMENT_URL = 'https://primeblacklist.vercel.app';

// List of HTML files to update
const htmlFiles = [
  'html/Banned.html',
  'html/about.html',
  'html/checkuser.html',
  'html/contact.html',
  'html/dashboard.html',
  'html/enhanced-dashboard.html',
  'html/features.html',
  'html/index.html',
  'html/login.html',
  'html/pricing.html',
  'html/settings.html',
  'new-website/about.html',
  'new-website/contact.html',
  'new-website/features.html',
  'new-website/index-complete.html',
  'new-website/index.html',
  'new-website/pricing.html'
];

function updateBaseUrls() {
  console.log('Updating base URLs in HTML files...');
  
  htmlFiles.forEach(file => {
    try {
      const filePath = path.join(__dirname, file);
      if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Replace the old base URL with the new one
        content = content.replace(
          /<base href="https:\/\/prime2-pv460h8te-lodrlodrrs-projects\.vercel\.app"\/>/g,
          `<base href="${NEW_DEPLOYMENT_URL}"/>`
        );
        
        // Also update any absolute links
        content = content.replace(
          /https:\/\/prime2-pv460h8te-lodrlodrrs-projects\.vercel\.app/g,
          NEW_DEPLOYMENT_URL
        );
        
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✓ Updated ${file}`);
      } else {
        console.log(`⚠ File not found: ${file}`);
      }
    } catch (err) {
      console.error(`✗ Error updating ${file}:`, err.message);
    }
  });
  
  console.log('Base URL updates completed!');
}

updateBaseUrls();