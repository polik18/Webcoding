#!/usr/bin/env node
/*
 * Webcoding smoke tests
 *
 * These tests intentionally avoid paid services, browsers, and third-party
 * Node packages. They catch the high-risk regressions introduced by the
 * dependency-manager / centralized-events / namespace refactors:
 *   - JavaScript syntax mistakes
 *   - inline UI handlers creeping back into index.html
 *   - legacy data-call paths returning to HTML
 *   - broken WebcodingApp namespace aliases
 *   - broken dependencyManager registration
 *   - broken centralized event callable resolution
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..');
const FAILURES = [];

function pass(message) {
  console.log(`✓ ${message}`);
}

function fail(message, error) {
  FAILURES.push({ message, error });
  console.error(`✗ ${message}`);
  if (error) console.error(`  ${error.message || error}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function walk(dir, predicate = () => true) {
  const out = [];
  const stack = [path.join(ROOT, dir)];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (predicate(full)) {
        out.push(full);
      }
    }
  }
  return out.sort();
}

function createFakeDom() {
  const listeners = {};
  const scripts = [];
  const styleSheets = [];
  const headChildren = [];

  function makeElement(tagName) {
    const attrs = {};
    const element = {
      tagName: String(tagName || '').toUpperCase(),
      dataset: {},
      style: {},
      children: [],
      classList: {
        add() {},
        remove() {},
        contains() { return false; }
      },
      addEventListener(type, handler) {
        this[`on${type}`] = handler;
      },
      removeEventListener(type) {
        delete this[`on${type}`];
      },
      dispatchEvent(event) {
        const handler = this[`on${event.type}`];
        if (typeof handler === 'function') handler.call(this, event);
      },
      setAttribute(name, value) {
        attrs[name] = String(value);
        this[name] = String(value);
      },
      getAttribute(name) {
        return attrs[name];
      },
      appendChild(child) {
        this.children.push(child);
        return child;
      },
      closest() { return null; },
      matches() { return false; }
    };
    return element;
  }

  const document = {
    baseURI: 'http://localhost/',
    readyState: 'complete',
    scripts,
    styleSheets,
    documentElement: {
      contains() { return true; }
    },
    head: {
      appendChild(el) {
        headChildren.push(el);
        if (el.tagName === 'SCRIPT') scripts.push(el);
        if (el.tagName === 'LINK') styleSheets.push({ href: el.href });
        // Simulate async script/link load enough for tests that do not fetch network.
        setTimeout(() => {
          if (typeof el.onload === 'function') el.onload();
        }, 0);
        return el;
      }
    },
    createElement: makeElement,
    querySelector() { return null; },
    querySelectorAll() { return []; },
    getElementById() { return null; },
    addEventListener(type, handler) {
      listeners[type] = listeners[type] || [];
      listeners[type].push(handler);
    },
    removeEventListener() {},
    __listeners: listeners,
    __headChildren: headChildren
  };

  return document;
}

function createBrowserContext() {
  const document = createFakeDom();
  const window = {
    document,
    console,
    location: { href: 'http://localhost/index.html' },
    setTimeout,
    clearTimeout,
    URL,
    Promise,
    Event: class Event {
      constructor(type, options = {}) {
        this.type = type;
        this.bubbles = !!options.bubbles;
      }
    },
    HTMLInputElement: class HTMLInputElement {},
    HTMLElement: class HTMLElement {},
    navigator: {},
  };
  window.window = window;
  window.self = window;
  window.globalThis = window;
  const context = vm.createContext({
    window,
    document,
    console,
    setTimeout,
    clearTimeout,
    URL,
    Promise,
    Event: window.Event,
    HTMLInputElement: window.HTMLInputElement,
    HTMLElement: window.HTMLElement,
    navigator: window.navigator,
  });
  return { context, window, document };
}

function runScript(relPath, context) {
  const code = read(relPath);
  const script = new vm.Script(code, { filename: relPath });
  script.runInContext(context);
}

function testJsSyntax() {
  const files = walk('js', file => file.endsWith('.js'));
  assert(files.length > 0, '找不到 js/*.js 檔案');
  for (const file of files) {
    const rel = path.relative(ROOT, file);
    try {
      new vm.Script(fs.readFileSync(file, 'utf8'), { filename: rel });
    } catch (err) {
      throw new Error(`${rel}: ${err.message}`);
    }
  }
  pass(`JS syntax ok (${files.length} files)`);
}

function testHtmlStaticAudit() {
  const html = read('index.html');
  const bannedInlineHandlers = ['onclick', 'onchange', 'ondragover', 'ondragleave', 'ondrop'];
  const offenders = bannedInlineHandlers.filter(attr => new RegExp(`\\s${attr}\\s*=`, 'i').test(html));
  assert(offenders.length === 0, `index.html 仍有功能型 inline handler: ${offenders.join(', ')}`);

  const dataCalls = [...html.matchAll(/data-call="([^"]+)"/g)].map(m => m[1]);
  const dataChangeCalls = [...html.matchAll(/data-change-call="([^"]+)"/g)].map(m => m[1]);
  const sequenceCalls = [];
  for (const match of html.matchAll(/data-sequence='([^']+)'/g)) {
    const raw = match[1]
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&');
    try {
      const parsed = JSON.parse(raw);
      for (const item of parsed) {
        if (typeof item === 'string') sequenceCalls.push(item);
        if (item && typeof item.call === 'string') sequenceCalls.push(item.call);
      }
    } catch (err) {
      throw new Error(`data-sequence JSON 無法解析: ${raw}`);
    }
  }

  const actionCalls = [...dataCalls, ...dataChangeCalls, ...sequenceCalls];
  assert(actionCalls.length > 0, '找不到 data-call / data-change-call / data-sequence 事件');

  const legacyCalls = actionCalls.filter(call => !call.includes('.') || call.startsWith('window.'));
  assert(legacyCalls.length === 0, `HTML 仍有裸露全域呼叫: ${[...new Set(legacyCalls)].join(', ')}`);

  const scriptOrder = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m => m[1]);
  const indexOf = src => scriptOrder.indexOf(src);
  assert(indexOf('js/core/app.js') !== -1, 'index.html 沒有載入 js/core/app.js');
  assert(indexOf('js/core/loader.js') !== -1, 'index.html 沒有載入 js/core/loader.js');
  assert(indexOf('js/core/events.js') !== -1, 'index.html 沒有載入 js/core/events.js');
  assert(indexOf('js/core/app.js') < indexOf('js/core/loader.js'), 'app.js 必須早於 loader.js');
  assert(indexOf('js/core/events.js') > indexOf('js/core/app.js'), 'events.js 必須晚於 app.js');
  assert(scriptOrder.filter(src => src === 'js/core/loader.js').length === 1, 'loader.js 不應重複載入');
  assert(scriptOrder.filter(src => src === 'js/core/events.js').length === 1, 'events.js 不應重複載入');

  pass(`HTML event audit ok (${actionCalls.length} action calls)`);
}

function testNamespaceCompatibility() {
  const { context, window } = createBrowserContext();
  runScript('js/core/app.js', context);

  const app = window.WebcodingApp;
  assert(app && app.namespace, 'WebcodingApp.namespace 不存在');

  const generate = function generate() { return 'qr-ok'; };
  app.namespace.set('tools.qr.generate', generate);
  assert(window.generateQrCode === generate, 'legacy getter generateQrCode 沒有指向 tools.qr.generate');

  const replacement = function replacement() { return 'qr-replaced'; };
  window.generateQrCode = replacement;
  assert(app.namespace.get('tools.qr.generate') === replacement, 'legacy setter generateQrCode 沒有回寫 namespace');

  window.showToast = function showToast(message) { return message; };
  const toastCallable = app.namespace.resolveCallable('core.ui.showToast');
  assert(toastCallable && toastCallable.fn === window.showToast, 'lazy alias showToast 無法透過 namespace resolve');

  const status = app.namespace.status();
  assert(status.some(row => row.legacy === 'generateQrCode' && row.path === 'tools.qr.generate'), 'namespace status 缺少 QR alias');
  assert(status.some(row => row.legacy === 'dependencyManager' && row.path === 'core.dependencies'), 'namespace status 缺少 dependency alias');

  pass('WebcodingApp namespace compatibility ok');
}

function testDependencyManager() {
  const { context, window } = createBrowserContext();
  runScript('js/core/app.js', context);
  runScript('js/core/loader.js', context);

  const app = window.WebcodingApp;
  const manager = app.namespace.get('core.dependencies');
  assert(manager, 'dependencyManager 沒有掛到 WebcodingApp.core.dependencies');

  const expectedDeps = [
    'qr', 'qrcodejs', 'jsqr', 'tesseract', 'pdfjs', 'mammoth',
    'xlsx', 'jszip', 'html2pdf', 'beautify', 'compare', 'spreadsheet-pdf', 'pyodide'
  ];
  for (const dep of expectedDeps) {
    assert(manager.has(dep), `dependencyManager 缺少 ${dep}`);
  }

  window.defineDependency('__smoke_ready__', {
    label: 'Smoke Ready',
    check: () => true,
    exports: () => ({ ready: true })
  });
  assert(manager.has('__smoke_ready__'), 'defineDependency 沒有註冊測試依賴');
  const status = manager.status();
  assert(status.some(row => row.name === 'qr' && row.label), 'dependency status 缺少 qr 狀態');

  pass(`dependencyManager registry ok (${status.length} dependencies)`);
}

function testLocalFirstDependencyConfig() {
  const { context, window } = createBrowserContext();
  runScript('js/core/app.js', context);
  runScript('js/core/loader.js', context);

  const manager = window.WebcodingApp.namespace.get('core.dependencies');
  assert(typeof manager.describe === 'function', 'dependencyManager.describe 不存在');

  const localFirstDeps = [
    'qrcodejs', 'jsqr', 'tesseract', 'pdfjs', 'mammoth', 'xlsx', 'jszip',
    'html2pdf', 'jspdf', 'jspdf-autotable', 'beautify-js', 'beautify-css',
    'beautify-html', 'diff-match-patch', 'codemirror-merge', 'pyodide'
  ];
  for (const dep of localFirstDeps) {
    const desc = manager.describe(dep);
    assert(desc, `dependencyManager.describe(${dep}) 回傳空值`);
    assert(desc.sources.local > 0, `${dep} 沒有 localUrls/localStyles 設定`);
    assert(desc.sources.remote > 0, `${dep} 沒有 CDN fallback 設定`);
  }

  const html = read('index.html');
  const directRemoteScripts = [...html.matchAll(/<script[^>]+src="(https:[^"]+)"/g)].map(m => m[1]);
  const allowedDirect = [
    /^https:\/\/www\.googletagmanager\.com\//,
    /^https:\/\/cdn\.tailwindcss\.com\/?$/
  ];
  const unexpected = directRemoteScripts.filter(src => !allowedDirect.some(re => re.test(src)));
  assert(unexpected.length === 0, `仍有核心腳本直接 CDN 載入: ${unexpected.join(', ')}`);

  const manifest = JSON.parse(read('scripts/vendor-dependencies.json'));
  assert(manifest.length >= 20, 'vendor dependency manifest 數量異常偏少');
  for (const dep of manifest) {
    assert(dep.name && dep.local && dep.url, `vendor manifest 欄位不足: ${JSON.stringify(dep)}`);
  }

  pass(`local-first dependency config ok (${localFirstDeps.length} managed deps, ${manifest.length} vendor assets)`);
}


function testOfflineRuntimePolicy() {
  const { context, window } = createBrowserContext();
  runScript('js/core/app.js', context);
  window.WEBCODING_OFFLINE = true;
  window.WEBCODING_DISABLE_REMOTE_FALLBACKS = true;
  runScript('js/core/loader.js', context);

  const manager = window.WebcodingApp.namespace.get('core.dependencies');
  assert(typeof manager.remoteFallbacksEnabled === 'function', 'dependencyManager.remoteFallbacksEnabled 不存在');
  assert(manager.remoteFallbacksEnabled() === false, 'offline mode 沒有關閉遠端 fallback');

  const desc = manager.describe('qrcodejs');
  assert(desc.sources.remote > 0, 'qrcodejs 應保留正常 web build 的 CDN 設定');
  assert(desc.sources.runtimeRemote === 0, 'offline mode runtime 不應暴露遠端來源');
  assert(desc.sources.runtimeLocal > 0, 'offline mode runtime 應保留本地來源');

  pass('offline dependency runtime policy ok');
}

function testOfflineReleaseTooling() {
  const requiredFiles = [
    'css/offline-fallback.css',
    'scripts/build-offline-release.js',
    'scripts/audit-offline-release.js',
    'docs/OFFLINE_RELEASE.md'
  ];
  for (const rel of requiredFiles) {
    assert(fs.existsSync(path.join(ROOT, rel)), `${rel} 不存在`);
  }
  const pkg = JSON.parse(read('package.json'));
  for (const name of ['build:offline', 'offline:audit', 'offline:audit:strict', 'build:offline:analytics', 'offline:audit:analytics']) {
    assert(pkg.scripts && pkg.scripts[name], `package.json 缺少 ${name}`);
  }
  const css = read('css/offline-fallback.css');
  assert(css.length > 5000, 'offline fallback CSS 異常過小');
  assert(/\.flex\{display:flex\}/.test(css), 'offline fallback CSS 缺少常用 utility');

  pass('offline release tooling ok');
}

function testCentralizedEvents() {
  const { context, window } = createBrowserContext();
  runScript('js/core/app.js', context);
  runScript('js/core/events.js', context);

  const app = window.WebcodingApp;
  const events = app.namespace.get('core.events');
  assert(events && typeof events.callNamed === 'function', 'core.events.callNamed 不存在');

  let called = false;
  const owner = app.namespace.ensureContainer('tools.qr');
  owner.generate = function generateForSmoke(arg) {
    called = true;
    assert(this === owner, 'callNamed 沒有保留 namespaced owner context');
    return `called:${arg}`;
  };

  const result = events.callNamed('tools.qr.generate', ['ok']);
  assert(result === 'called:ok' && called, 'events.callNamed 無法呼叫 namespaced handler');

  const parsed = events.parseArgs('["a",2,true]');
  assert(Array.isArray(parsed) && parsed.length === 3 && parsed[1] === 2, 'events.parseArgs 無法解析 JSON array');

  pass('centralized events resolver ok');
}

function testDocumentationClaims() {
  const topLevelDocs = ['README.md', 'SYSTEM_DOC.md'].filter(rel => fs.existsSync(path.join(ROOT, rel)));
  const docsDirDocs = fs.readdirSync(path.join(ROOT, 'docs'))
    .filter(name => /\.md$/.test(name))
    .map(name => path.join('docs', name));
  const localeDocs = fs.readdirSync(path.join(ROOT, 'docs', 'locales'))
    .filter(name => /^README-.*\.md$/.test(name))
    .map(name => path.join('docs', 'locales', name));
  const docs = [...topLevelDocs, ...docsDirDocs, ...localeDocs];
  const banned = [
    /data never leave[s]? your computer/i,
    /資料永遠不會離開你的?電腦/,
    /100%\s+in your web browser/i,
    /100%\s*在\s*Web\s*瀏覽器中/,
    /zero latency/i,
    /零延遲/,
    /fully local/i,
    /完全在地化|完全本機|完全離線/,
    /operates entirely client-side/i,
    /完全在客戶端運作/,
  ];
  for (const rel of docs) {
    const text = read(rel);
    for (const pattern of banned) {
      const match = pattern.exec(text);
      assert(!match, `${rel} 仍有過度宣稱: ${match && match[0]}`);
    }
  }
  pass(`documentation claim audit ok (${docs.length} files)`);
}

const tests = [
  testJsSyntax,
  testHtmlStaticAudit,
  testNamespaceCompatibility,
  testDependencyManager,
  testLocalFirstDependencyConfig,
  testOfflineRuntimePolicy,
  testOfflineReleaseTooling,
  testCentralizedEvents,
  testDocumentationClaims,
];

for (const test of tests) {
  try {
    test();
  } catch (err) {
    fail(test.name, err);
  }
}

if (FAILURES.length) {
  console.error('\nSmoke tests failed:');
  for (const item of FAILURES) {
    console.error(`- ${item.message}: ${item.error && item.error.message ? item.error.message : item.error}`);
  }
  process.exit(1);
}

console.log('\nAll smoke tests passed.');
