// يبني الملف الواحد من المصادر في src/ :  node tools/build.js   (أو --check للتحقق فقط دون كتابة)
// الترتيب: src/html/00-* ثم src/css/* ثم src/html/40-* ثم src/js/* ثم src/html/90-*  (كل مجلد بترتيب الاسم)
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), src = path.join(root, 'src');
const list = (d, re) => fs.readdirSync(path.join(src, d)).filter(f => re.test(f)).sort().map(f => path.join(src, d, f));
const files = [...list('html', /^00-/), ...list('css', /\.css$/), ...list('html', /^40-/), ...list('js', /\.js$/), ...list('html', /^90-/)];
// فحص صياغة كود الواجهة (سكربت واحد) قبل الكتابة: يوقف البناء عند أي خطأ نحوي
const jsAll = list('js', /\.js$/).map(f => fs.readFileSync(f, 'utf8')).join('');
try { new (require('vm').Script)(jsAll, { filename: 'src/js/*' }); } catch (e) { console.error('FAIL: خطأ نحوي في src/js — ' + e.message); process.exit(1); }
const out = files.map(f => fs.readFileSync(f, 'utf8')).join('');
const targets = [path.join(root, 'portist_invoice.html'), path.join(root, 'public', 'index.html')];
if (process.argv.includes('--check')) {
  const bad = targets.filter(t => !fs.existsSync(t) || fs.readFileSync(t, 'utf8') !== out);
  if (bad.length) { console.error('FAIL: الملف المبني لا يطابق المصادر — شغّل: node tools/build.js\n' + bad.join('\n')); process.exit(1); }
  console.log('build up to date (' + files.length + ' sources)'); process.exit(0);
}
targets.forEach(t => fs.writeFileSync(t, out));
console.log('built ' + out.length + ' bytes from ' + files.length + ' sources');
