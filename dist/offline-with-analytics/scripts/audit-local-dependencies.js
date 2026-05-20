#!/usr/bin/env node
/*
 * Local-first dependency audit.
 * By default this reports missing local vendor assets without failing, because
 * CDN fallback is still valid during development. Use --strict for release/offline builds.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const strict = process.argv.includes('--strict');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'vendor-dependencies.json'), 'utf8'));
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const loader = fs.readFileSync(path.join(ROOT, 'js/core/loader.js'), 'utf8');

const missing = [];
const present = [];
for (const dep of manifest) {
  const full = path.join(ROOT, dep.local);
  if (fs.existsSync(full) && fs.statSync(full).size > 0) present.push(dep);
  else missing.push(dep);
}

const directRemoteScripts = [...html.matchAll(/<script[^>]+src="(https:[^"]+)"/g)].map(m => m[1]);
const allowedDirect = [
  /^https:\/\/www\.googletagmanager\.com\//,
  /^https:\/\/cdn\.tailwindcss\.com\/?$/
];
const unexpectedDirect = directRemoteScripts.filter(src => !allowedDirect.some(re => re.test(src)));

const criticalDeps = ['qrcodejs', 'jsqr', 'tesseract', 'pdfjs', 'mammoth', 'xlsx', 'jszip', 'html2pdf', 'jspdf', 'jspdf-autotable', 'beautify-js', 'beautify-css', 'beautify-html', 'diff-match-patch'];
const missingLocalUrlConfig = criticalDeps.filter(depName => {
  const block = new RegExp(`defineDependency\\('${depName}'[\\s\\S]*?\\n    \\}\\);`).exec(loader);
  return !block || !/localUrls\s*:/.test(block[0]);
});

console.log(`Local vendor assets present: ${present.length}/${manifest.length}`);
if (missing.length) {
  console.log('Missing local vendor assets:');
  for (const dep of missing) console.log(`- ${dep.local} (${dep.name})`);
  console.log('\nRun `npm run vendor:fetch` to download the free local copies. CDN fallback will still work when online.');
}

if (unexpectedDirect.length) {
  console.error('Unexpected direct external <script src="https://..."> tags:');
  for (const src of unexpectedDirect) console.error(`- ${src}`);
}
if (missingLocalUrlConfig.length) {
  console.error('Dependencies missing localUrls in js/core/loader.js:');
  for (const dep of missingLocalUrlConfig) console.error(`- ${dep}`);
}

if (unexpectedDirect.length || missingLocalUrlConfig.length || (strict && missing.length)) {
  process.exit(1);
}

console.log('Local-first dependency audit ok');
