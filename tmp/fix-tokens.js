const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    for (let file of list) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.tsx') && !file.includes('node_modules') && !file.includes('.next')) {
                results.push(file);
            }
        }
    }
    return results;
}

const frontendDir = path.resolve('c:/Users/hraj4/OneDrive/Desktop/Careconnect/frontend/app');
const files = walk(frontendDir);
let modifications = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Remove token from variables
    content = content.replace(/const\s+token\s*=\s*localStorage\.getItem\(['"]token['"]\);?\n?/g, '');
    
    // Remove if (!token) checks that redirect
    content = content.replace(/if\s*\(\!token\)\s*\{\s*router\.push\(['"]\/login['"]\);\s*return;\s*\}\n?/gm, '');

    // Sometimes they check patientId || token
    content = content.replace(/if\s*\(\!patientId\s*\|\|\s*\!token\)/g, 'if (!patientId)');
    content = content.replace(/if\s*\(\!userId\s*\|\|\s*\!token\)/g, 'if (!userId)');
    
    // Replace Authorization Object (in fetch)
    // headers: { Authorization: `Bearer ${token}` }  -> credentials: "include"
    content = content.replace(/headers\s*:\s*\{\s*Authorization\s*:\s*`Bearer \$\{token\}`\s*,?\s*\}/gm, 'credentials: "include"');
    
    // Replace Authorization nested in headers
    // headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    content = content.replace(/Authorization\s*:\s*`Bearer \$\{token\}`\s*,?\s*/gm, '');

    // if credentials: "include" is missing from a fetch payload that had headers
    // Actually, simply adding credentials: "include" to existing fetch options is safer:
    // Let's add credentials: "include" to fetchWithTimeout calls if it's not already there.
    
    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        modifications++;
        console.log(`Modified: ${file}`);
    }
});

console.log(`Total files modified: ${modifications}`);
