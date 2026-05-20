const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
    await page.goto('file:///Users/chienche/Documents/Github/Webcoding/index.html', { waitUntil: 'networkidle0' });
    await browser.close();
})();
