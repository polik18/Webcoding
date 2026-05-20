#!/usr/bin/env node
/* Audit the generated offline release folder. */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const strict = process.argv.includes('--strict');
const allowAnalytics = process.argv.includes('--allow-analytics');
const argPath = process.argv.find(arg => !arg.startsWith('--') && arg !== process.argv[0] && arg !== process.argv[1]);
const RELEASE = path.resolve(ROOT, argPath || (allowAnalytics ? 'dist/offline-with-analytics' : 'dist/offline'));
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'vendor-dependencies.json'), 'utf8'));
const failures = [];
const warnings = [];

function fail(message) { failures.push(message); }
function warn(message) { warnings.push(message); }
function read(rel) { return fs.readFileSync(path.join(RELEASE, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(RELEASE, rel)); }

if (!fs.existsSync(RELEASE)) {
  console.error(`Offline release folder not found: ${RELEASE}`);
  console.error('Run `npm run build:offline` first.');
  process.exit(1);
}

const index = read('index.html');
const runtimeExternalTags = [
  ...index.matchAll(/<(script|link)[^>]+(?:src|href)="(https?:[^"]+)"/gi)
].map(m => ({ tag: m[1], url: m[2] }));
const disallowedRuntimeExternalTags = runtimeExternalTags.filter(item => {
  if (allowAnalytics && /www\.googletagmanager\.com\/gtag\/js/i.test(item.url)) return false;
  return true;
});
if (disallowedRuntimeExternalTags.length) {
  fail('index.html still has direct external script/link URLs:\n' + disallowedRuntimeExternalTags.map(x => `- ${x.tag} ${x.url}`).join('\n'));
}

const externalOnerror = [...index.matchAll(/onerror="[^"]*https?:\/\/[^"]*"/gi)].map(m => m[0]);
if (externalOnerror.length) {
  fail('index.html still has CDN fallback onerror handlers:\n' + externalOnerror.map(x => `- ${x}`).join('\n'));
}

if (/googletagmanager|gtag\(/i.test(index)) {
  if (allowAnalytics) warn('Google Analytics is intentionally present; this is a local-first analytics build, not a strict offline build.');
  else fail('Google Analytics code is still present in offline index.html');
}
if (/cdn\.tailwindcss\.com/i.test(index)) fail('Tailwind CDN runtime is still present in offline index.html');
if (/font-awesome|cdnjs\.cloudflare\.com\/ajax\/libs\/font-awesome/i.test(index)) warn('Font Awesome reference remains; verify it is a local file or comment only.');
if (!/WEBCODING_OFFLINE\s*=\s*true/.test(index)) fail('WEBCODING_OFFLINE flag is missing from offline index.html');
if (!/WEBCODING_DISABLE_REMOTE_FALLBACKS\s*=\s*true/.test(index)) fail('WEBCODING_DISABLE_REMOTE_FALLBACKS flag is missing from offline index.html');
if (!exists('css/offline-fallback.css')) fail('css/offline-fallback.css is missing');
if (!exists('OFFLINE_RELEASE_MANIFEST.json')) fail('OFFLINE_RELEASE_MANIFEST.json is missing');

const loader = read('js/core/loader.js');
if (!/Remote script fallback disabled in offline mode/.test(loader)) fail('loader.js does not appear to enforce offline remote fallback blocking');

const missing = [];
const present = [];
for (const dep of manifest) {
  const full = path.join(RELEASE, dep.local);
  const ok = fs.existsSync(full) && fs.statSync(full).size > 0;
  (ok ? present : missing).push(dep);
}
if (missing.length) {
  const msg = `Missing local vendor assets: ${missing.length}/${manifest.length}\n` + missing.map(dep => `- ${dep.local} (${dep.name})`).join('\n');
  if (strict) fail(msg);
  else warn(msg + '\nRun `npm run vendor:fetch` before building a full offline release.');
}

console.log(`Offline release audit target: ${path.relative(ROOT, RELEASE)}`);
if (allowAnalytics) console.log('Analytics mode: Google Analytics allowed by audit flag.');
console.log(`Local vendor assets present: ${present.length}/${manifest.length}`);
if (warnings.length) {
  console.warn('\nWarnings:');
  for (const item of warnings) console.warn('- ' + item.replace(/\n/g, '\n  '));
}
if (failures.length) {
  console.error('\nOffline release audit failed:');
  for (const item of failures) console.error('- ' + item.replace(/\n/g, '\n  '));
  process.exit(1);
}
console.log('Offline release audit ok');
