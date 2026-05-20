#!/usr/bin/env node
/*
 * Download free browser dependencies listed in scripts/vendor-dependencies.json
 * into libs/ so the app can run local-first and fall back to CDN only when a
 * local file is missing or corrupted.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST = path.join(ROOT, 'scripts', 'vendor-dependencies.json');
const deps = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const force = process.argv.includes('--force');
const onlyArg = process.argv.find(arg => arg.startsWith('--only='));
const timeoutArg = process.argv.find(arg => arg.startsWith('--timeout-ms='));
const timeoutMs = timeoutArg ? Number(timeoutArg.slice('--timeout-ms='.length)) : Number(process.env.WEBCODING_VENDOR_FETCH_TIMEOUT_MS || 10000);
const only = onlyArg ? new Set(onlyArg.slice('--only='.length).split(',').map(s => s.trim()).filter(Boolean)) : null;
if (!Number.isFinite(timeoutMs) || timeoutMs < 1000) {
  console.error('Invalid --timeout-ms value. Use milliseconds, e.g. --timeout-ms=10000');
  process.exit(1);
}

function download(url, dest, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    const req = client.get(url, { headers: { 'User-Agent': 'Webcoding vendor fetcher' } }, res => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirectsLeft > 0) {
        res.resume();
        const next = new URL(res.headers.location, url).href;
        return resolve(download(next, dest, redirectsLeft - 1));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      const tmp = `${dest}.tmp`;
      const out = fs.createWriteStream(tmp);
      res.pipe(out);
      out.on('finish', () => {
        out.close(() => {
          fs.renameSync(tmp, dest);
          resolve();
        });
      });
      out.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => req.destroy(new Error(`Timeout after ${timeoutMs}ms: ${url}`)));
  });
}

(async () => {
  let downloaded = 0;
  let skipped = 0;
  const selected = deps.filter(dep => !only || only.has(dep.name) || only.has(dep.category));
  for (const dep of selected) {
    const dest = path.join(ROOT, dep.local);
    if (!force && fs.existsSync(dest) && fs.statSync(dest).size > 0) {
      console.log(`skip   ${dep.local}`);
      skipped++;
      continue;
    }
    process.stdout.write(`fetch  ${dep.name} -> ${dep.local} ... `);
    try {
      await download(dep.url, dest);
      console.log(`${fs.statSync(dest).size} bytes`);
      downloaded++;
    } catch (err) {
      console.log('failed');
      console.error(`       ${err.message}`);
      process.exitCode = 1;
    }
  }
  console.log(`\nVendor fetch complete. downloaded=${downloaded}, skipped=${skipped}, selected=${selected.length}, timeoutMs=${timeoutMs}`);
})();
