#!/usr/bin/env node
// Backward-compatible visual-module check without external packages.
// The old version required jsdom but did not use it, which made the test fail
// on a clean machine. Keep this file as a lightweight wrapper.

const fs = require('fs');
const vm = require('vm');

const file = 'js/features/visual.js';
const code = fs.readFileSync(file, 'utf8');
new vm.Script(code, { filename: file });

const expectedFunctions = [
  'switchToCode',
  'switchToVisual',
  'switchToSplit',
  'execCmd',
  'insertImagePrompt',
  'insertLinkPrompt',
  'insertTablePrompt'
];

for (const name of expectedFunctions) {
  if (!new RegExp(`function\\s+${name}\\s*\\(`).test(code) && !new RegExp(`${name}\\s*[:=]`).test(code)) {
    throw new Error(`Missing visual feature entry: ${name}`);
  }
}

console.log('visual feature syntax ok');
