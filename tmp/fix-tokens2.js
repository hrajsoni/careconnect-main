const fs = require('fs');
function fixFile(file, regex, replacement) {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content.replace(regex, replacement);
  if(content !== newContent) {
    fs.writeFileSync(file, newContent);
    console.log('Fixed', file);
  }
}
const b = 'c:/Users/hraj4/OneDrive/Desktop/Careconnect/frontend/app';

fixFile(b+'/dashboard/page.tsx', /if\s*\(\!userId\s*\|\|\s*\!role\s*\|\|\s*\!token\)/g, 'if (!userId || !role)');
fixFile(b+'/dashboard/nurse/pricing/page.tsx', /if\s*\(\!userId\s*\|\|\s*\!token\)/g, 'if (!userId)');
fixFile(b+'/dashboard/nurse/profile/page.tsx', /if\s*\(\!userId\s*\|\|\s*\!token\)/g, 'if (!userId)');
fixFile(b+'/dashboard/nurse/services/page.tsx', /if\s*\(\!userId\s*\|\|\s*\!token\)/g, 'if (!userId)');

fixFile(b+'/dashboard/page.tsx', /if\s*\(token\s*&&\s*role\)\s*\{/g, 'if (role) {');
fixFile(b+'/page.tsx', /if\s*\(token\s*&&\s*role\)\s*\{/g, 'if (role) {');
fixFile(b+'/login/page.tsx', /if\s*\(token\s*&&\s*role\)\s*\{/g, 'if (role) {');
fixFile(b+'/signup/page.tsx', /if\s*\(token\s*&&\s*role\)\s*\{/g, 'if (role) {');

fixFile(b+'/dashboard/nurse/pricing/page.tsx', /if\s*\(\!token\)/g, 'if (false)');
fixFile(b+'/dashboard/nurse/profile/page.tsx', /if\s*\(\!token\)/g, 'if (false)');
fixFile(b+'/dashboard/nurse/services/page.tsx', /if\s*\(\!token\)/g, 'if (false)');
