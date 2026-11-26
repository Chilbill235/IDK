const fs = require('fs');
const h = fs.readFileSync('banned.html', 'utf8');
const re = /<script>([\s\S]*?)<\/script>/g;
let m, n = 0;
while ((m = re.exec(h))) {
  try { new Function(m[1]); n++; }
  catch (e) { console.log('INLINE ERROR:', e.message); process.exit(1); }
}
console.log('banned inline scripts OK:', n);