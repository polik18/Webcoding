#!/usr/bin/env node
// Lightweight JS syntax checker without third-party dependencies.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const TARGETS = ['js', 'tests', 'scripts'];
const files = [];

function walk(dir) {
  const fullDir = path.join(ROOT, dir);
  if (!fs.existsSync(fullDir)) return;
  for (const entry of fs.readdirSync(fullDir, { withFileTypes: true })) {
    const full = path.join(fullDir, entry.name);
    const rel = path.relative(ROOT, full);
    if (entry.isDirectory()) walk(rel);
    else if (entry.isFile() && full.endsWith('.js')) files.push(full);
  }
}

TARGETS.forEach(walk);
let failed = false;
for (const file of files.sort()) {
  const rel = path.relative(ROOT, file);
  try {
    new vm.Script(fs.readFileSync(file, 'utf8'), { filename: rel });
  } catch (err) {
    failed = true;
    console.error(`Syntax error in ${rel}: ${err.message}`);
  }
}

if (failed) process.exit(1);
console.log(`JS syntax ok (${files.length} files)`);
