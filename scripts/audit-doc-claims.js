#!/usr/bin/env node
/*
 * Documentation claim audit.
 *
 * The project is local-first, not automatically offline-only or fully isolated.
 * This script prevents the highest-risk public claims from returning to the
 * main README files after docs are edited.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const topLevelDocs = ['README.md', 'SYSTEM_DOC.md'].filter(rel => fs.existsSync(path.join(ROOT, rel)));
const docsDirDocs = fs.readdirSync(path.join(ROOT, 'docs'))
  .filter(name => /\.md$/.test(name))
  .map(name => path.join('docs', name));
const localeDocs = fs.readdirSync(path.join(ROOT, 'docs', 'locales'))
  .filter(name => /^README-.*\.md$/.test(name))
  .map(name => path.join('docs', 'locales', name));
const files = [...topLevelDocs, ...docsDirDocs, ...localeDocs];

const banned = [
  {
    pattern: /data never leave[s]? your computer/i,
    reason: 'Overpromises privacy while analytics, CDN fallback, and OCR language loading may exist.',
  },
  {
    pattern: /資料永遠不會離開你的?電腦/,
    reason: '過度承諾隱私，與第三方資源載入邊界不一致。',
  },
  {
    pattern: /100%\s+in your web browser/i,
    reason: 'Too broad; feature dependencies and external assets can still be loaded.',
  },
  {
    pattern: /100%\s*在\s*Web\s*瀏覽器中/,
    reason: '過度簡化，容易被理解為完全離線或完全不連線。',
  },
  {
    pattern: /zero latency/i,
    reason: 'OCR, PDF, Pyodide, and large dependency loading can be slow.',
  },
  {
    pattern: /零延遲/,
    reason: 'OCR、PDF、Pyodide 與大型套件載入不可能保證零延遲。',
  },
  {
    pattern: /fully local/i,
    reason: 'Use local-first instead; default build can still use third-party requests.',
  },
  {
    pattern: /完全在地化|完全本機|完全離線/,
    reason: '除非是已驗證的離線發佈版，否則應改成本機優先或本地優先。',
  },
  {
    pattern: /operates entirely client-side/i,
    reason: 'Too broad for a build with analytics and third-party dependency loading.',
  },
  {
    pattern: /完全在客戶端運作/,
    reason: '容易造成隱私與網路邊界誤解。',
  },
];

let failed = false;
for (const rel of files) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) {
    console.error(`Missing documentation file: ${rel}`);
    failed = true;
    continue;
  }
  const text = fs.readFileSync(full, 'utf8');
  for (const rule of banned) {
    const match = rule.pattern.exec(text);
    if (match) {
      console.error(`Risky documentation claim in ${rel}: "${match[0]}"`);
      console.error(`  ${rule.reason}`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);
console.log(`Documentation claim audit ok (${files.length} files)`);
