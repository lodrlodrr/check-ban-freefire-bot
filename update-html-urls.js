const fs = require('fs').promises;
const path = require('path');

// Latest Vercel deployment URL
const DEPLOYMENT_URL = 'https://prime2-pv460h8te-lodrlodrrs-projects.vercel.app';

async function processFile(filePath) {
    console.log(`Processing ${filePath}...`);
    const content = await fs.readFile(filePath, 'utf8');
    
    // Replace base href and direct localhost:3000 links
    const updatedContent = content
        .replace(
            /<base href="http:\/\/localhost:3000\/"\/>/g,
            `<base href="${DEPLOYMENT_URL}"/>`
        )
        .replace(
            /href="http:\/\/localhost:3000\//g,
            `href="${DEPLOYMENT_URL}/`
        );

    await fs.writeFile(filePath, updatedContent, 'utf8');
    console.log(`Updated ${filePath}`);
}

async function main() {
    const htmlFolders = ['html', 'new-website'];
    
    try {
        for (const folder of htmlFolders) {
            try {
                const files = await fs.readdir(folder);
                console.log(`Found ${files.length} files in ${folder}`);
                
                for (const file of files) {
                    if (file.endsWith('.html')) {
                        await processFile(path.join(folder, file));
                    }
                }
            } catch (err) {
                console.warn(`Warning: Could not process folder ${folder}:`, err.message);
            }
        }
        console.log('HTML file updates completed');
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}

main().catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
});
    
    try {
        for (const folder of htmlFolders) {
            try {
                const files = await fs.readdir(folder);
                for (const file of files) {
                    if (file.endsWith('.html')) {
                        const filePath = path.join(folder, file);
                        
                        let content = await fs.readFile(filePath, 'utf8');
                        
                        // Replace base href
                        content = content.replace(
                            /<base href="http:\/\/localhost:3000\/"\/>/g,
                            `<base href="${DEPLOYMENT_URL}"/>`
                        );

                        // Replace direct localhost:3000 links
                        content = content.replace(
                            /href="http:\/\/localhost:3000\//g,
                            `href="${DEPLOYMENT_URL}/`
                        );

                        await fs.writeFile(filePath, content, 'utf8');
                        console.log(`Updated ${filePath}`);
                    }
                }
            } catch (err) {
                console.warn(`Warning: Could not process folder ${folder}:`, err.message);
            }
        }
        console.log('HTML file updates completed');
    } catch (error) {
        console.error('Fatal error updating HTML files:', error);
        process.exit(1);
    }
}

updateHtmlUrls().catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
});

        for (const file of files) {
            const filePath = path.resolve(file);
            let content = await fs.readFile(filePath, 'utf8');

            // Replace base href
            content = content.replace(
                /<base href="http:\/\/localhost:3000\/"\/>/g,
                `<base href="${deploymentUrl}"/>`
            );

            // Replace direct localhost:3000 links
            content = content.replace(
                /href="http:\/\/localhost:3000\//g,
                `href="${deploymentUrl}/`
            );

            await fs.writeFile(filePath, content, 'utf8');
            console.log(`Updated ${file}`);
        }

        console.log('All HTML files updated successfully');
    } catch (error) {
        console.error('Error updating HTML files:', error);
        process.exit(1);
    }
}

// Get the deployment URL from environment or use the latest preview URL
const deploymentUrl = process.env.VERCEL_URL || 'https://prime2-tau.vercel.app';

updateHtmlFiles(deploymentUrl).catch(console.error);