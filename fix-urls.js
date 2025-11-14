const fs = require('fs');
const path = require('path');

// Latest Vercel deployment URL
const DEPLOYMENT_URL = 'https://primeblacklist.vercel.app';

function updateFile(filePath) {
    console.log(`Processing ${filePath}...`);
    
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const updatedContent = content
            .replace(
                /<base href="http:\/\/localhost:3000\/"\/>/g,
                `<base href="${DEPLOYMENT_URL}"/>`
            )
            .replace(
                /href="http:\/\/localhost:3000\//g,
                `href="${DEPLOYMENT_URL}/`
            );

        fs.writeFileSync(filePath, updatedContent, 'utf8');
        console.log(`Updated ${filePath}`);
    } catch (err) {
        console.error(`Error processing ${filePath}:`, err.message);
    }
}

function main() {
    const htmlFolders = ['html', 'new-website'];
    
    for (const folder of htmlFolders) {
        try {
            const files = fs.readdirSync(folder);
            console.log(`Found ${files.length} files in ${folder}`);
            
            for (const file of files) {
                if (file.endsWith('.html')) {
                    updateFile(path.join(folder, file));
                }
            }
        } catch (err) {
            console.warn(`Warning: Could not process folder ${folder}:`, err.message);
        }
    }
    console.log('HTML file updates completed');
}

main();