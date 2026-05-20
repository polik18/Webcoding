#!/usr/bin/env node
/*
 * Build a reviewed offline release folder.
 *
 * This script does not download third-party packages. Run `npm run vendor:fetch`
 * first in a network-enabled environment, then run this script.
 *
 * Default output:
 *   dist/offline                  strict offline-style build, analytics removed
 *
 * Analytics-enabled output:
 *   node scripts/build-offline-release.js --with-analytics
 *   dist/offline-with-analytics   local-first build, Google Analytics preserved
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST_ROOT = path.join(ROOT, 'dist');
const KEEP_ANALYTICS = process.argv.includes('--with-analytics') || process.env.WEBCODING_KEEP_ANALYTICS === '1';
const OUT_NAME = KEEP_ANALYTICS ? 'offline-with-analytics' : 'offline';
const OUT = path.join(DIST_ROOT, OUT_NAME);
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'vendor-dependencies.json'), 'utf8'));

const EXCLUDE_DIRS = new Set(['.git', 'dist', 'node_modules']);
const EXCLUDE_FILES = new Set(['.DS_Store']);

function rmrf(target) {
  if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    const name = path.basename(src);
    if (EXCLUDE_DIRS.has(name)) return;
    ensureDir(dest);
    for (const entry of fs.readdirSync(src)) {
      if (EXCLUDE_FILES.has(entry)) continue;
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
    return;
  }
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function stripRemoteOnerrorAttrs(html) {
  return html.replace(/\s+onerror="[^"]*https?:\/\/[^"]*"/gi, '');
}

function removeAnalytics(html) {
  return html.replace(/\s*<!-- Google tag \(gtag\.js\) -->[\s\S]*?gtag\('config',\s*'G-[^']+'\);\s*<\/script>\s*/i, '\n    <!-- Analytics removed for strict offline release. -->\n');
}

function patchIndexHtml(html) {
  if (!KEEP_ANALYTICS) {
    html = removeAnalytics(html);
  }

  html = html.replace(/\s*<!-- Tailwind CSS[\s\S]*?<\/script>\s*<script>[\s\S]*?tailwind\.config[\s\S]*?<\/script>\s*/i, `
    <!-- Offline/local-first runtime flags. Keep before js/core/loader.js. -->
    <script>
        window.WEBCODING_OFFLINE = true;
        window.WEBCODING_DISABLE_ANALYTICS = ${KEEP_ANALYTICS ? 'false' : 'true'};
        window.WEBCODING_DISABLE_REMOTE_FALLBACKS = true;
        window.WEBCODING_TESSDATA_PATHS = {
            standard: 'libs/tessdata/standard',
            best: 'libs/tessdata/best',
            fast: 'libs/tessdata/fast'
        };
    </script>
    <link rel="stylesheet" href="css/offline-fallback.css">
`);

  html = html.replace(/\s*<!-- Font Awesome:[\s\S]*?<link[^>]+font-awesome[^>]+>\s*/i, '\n    <!-- Font Awesome CDN removed for offline release; css/offline-fallback.css keeps icon spacing stable. -->\n');

  html = stripRemoteOnerrorAttrs(html);
  html = html.replace(/\n{3,}/g, '\n\n');
  return html;
}

function writeManifest(outDir) {
  const missing = [];
  const present = [];
  for (const dep of manifest) {
    const full = path.join(outDir, dep.local);
    const row = {
      name: dep.name,
      category: dep.category,
      local: dep.local,
      present: fs.existsSync(full) && fs.statSync(full).size > 0
    };
    (row.present ? present : missing).push(row);
  }

  const releaseManifest = {
    name: KEEP_ANALYTICS ? 'Webcoding local-first release with Google Analytics' : 'Webcoding offline release',
    generatedAt: new Date().toISOString(),
    outputFolder: `dist/${OUT_NAME}`,
    analytics: {
      googleAnalytics: KEEP_ANALYTICS ? 'preserved' : 'removed',
      strictOffline: !KEEP_ANALYTICS,
      note: KEEP_ANALYTICS
        ? 'This build intentionally keeps Google Analytics and will contact Google when loaded online.'
        : 'This build removes Google Analytics from index.html.'
    },
    offlineFlags: {
      WEBCODING_OFFLINE: true,
      WEBCODING_DISABLE_ANALYTICS: !KEEP_ANALYTICS,
      WEBCODING_DISABLE_REMOTE_FALLBACKS: true
    },
    localVendorAssets: {
      present: present.length,
      missing: missing.length,
      total: present.length + missing.length,
      missingAssets: missing
    },
    notes: [
      KEEP_ANALYTICS
        ? 'This release keeps Google Analytics by request. It is local-first, not strictly offline/private.'
        : 'The offline index removes analytics, Tailwind CDN, Font Awesome CDN, and inline CDN fallback handlers.',
      'js/core/loader.js still contains CDN URLs for the normal web build, but offline mode disables remote fallback at runtime.',
      'Run npm run vendor:fetch in a network-enabled environment before building a full local-first package.',
      'service-worker.js and offline-assets.json are included so HTTPS/localhost deployments can prepare a browser cache after the first online visit.',
      'Run npm run offline:audit:strict after building when you need every optional vendor asset bundled.'
    ]
  };
  fs.writeFileSync(path.join(outDir, 'OFFLINE_RELEASE_MANIFEST.json'), JSON.stringify(releaseManifest, null, 2));

  const title = KEEP_ANALYTICS ? '# Webcoding Local-first Release with Google Analytics' : '# Webcoding Offline Release';
  const lines = [
    title,
    '',
    'This folder is generated by `npm run build:offline` or `npm run build:offline:analytics`.',
    '',
    'Runtime changes in this build:',
    '',
    KEEP_ANALYTICS ? '- Google Analytics is intentionally preserved.' : '- Google Analytics is removed.',
    '- Tailwind CDN runtime is replaced by `css/offline-fallback.css`.',
    '- Font Awesome CDN is removed. Icon spacing is preserved; exact icons require bundling Font Awesome webfonts separately.',
    '- HTML `onerror` CDN fallbacks are removed from `index.html`.',
    '- `window.WEBCODING_OFFLINE = true` and `window.WEBCODING_DISABLE_REMOTE_FALLBACKS = true` disable dependency-manager CDN fallback.',
    '- `service-worker.js`, `manifest.webmanifest`, and `offline-assets.json` are included for HTTPS/localhost browser cache preparation.',
    '',
  ];
  if (KEEP_ANALYTICS) {
    lines.push(
      'Important analytics note:',
      '',
      '- This build is not a strict offline/private build because it keeps the Google Analytics tag.',
      '- Use it for normal public deployment when traffic tracking is required.',
      '- Use `dist/offline` for sensitive or fully reviewed offline deployment.',
      ''
    );
  }
  lines.push(
    'Bundled vendor status:',
    '',
    `- Present local vendor assets: ${present.length}/${present.length + missing.length}`,
    `- Missing local vendor assets: ${missing.length}`,
    ''
  );
  if (missing.length) {
    lines.push('Missing assets that affect full offline functionality:', '', ...missing.map(dep => `- ${dep.local} (${dep.name})`), '');
    lines.push('Run these commands in a network-enabled environment, then rebuild:', '', '```bash', 'npm run vendor:fetch', KEEP_ANALYTICS ? 'npm run build:offline:analytics' : 'npm run build:offline', KEEP_ANALYTICS ? 'npm run offline:audit:analytics' : 'npm run offline:audit:strict', '```', '');
  } else {
    lines.push('All configured local vendor assets are present. Run the matching audit command for the final check.', '');
  }
  fs.writeFileSync(path.join(outDir, 'README-OFFLINE.md'), lines.join('\n'));
}

function main() {
  rmrf(OUT);
  ensureDir(DIST_ROOT);
  copyRecursive(ROOT, OUT);

  const indexPath = path.join(OUT, 'index.html');
  const patched = patchIndexHtml(fs.readFileSync(indexPath, 'utf8'));
  fs.writeFileSync(indexPath, patched);
  writeManifest(OUT);

  console.log(`${KEEP_ANALYTICS ? 'Local-first analytics' : 'Offline'} release folder created: ${path.relative(ROOT, OUT)}`);
  console.log(KEEP_ANALYTICS ? 'Next: npm run offline:audit:analytics' : 'Next: npm run offline:audit');
}

main();
