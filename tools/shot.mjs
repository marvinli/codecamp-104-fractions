// Screenshot slides with headless Chrome.
// Usage: node tools/shot.mjs <hash> [out.png] [--eval "js to run before the shot"] [--wait ms]
// e.g. node tools/shot.mjs ledger shots/ledger.png --eval "document.querySelector('.btn').click()" --wait 1500
import puppeteer from 'puppeteer-core';
import path from 'node:path';
import fs from 'node:fs';
const args = process.argv.slice(2);
const hash = args[0] || '';
const out = args[1] && !args[1].startsWith('--') ? args[1] : `shots/${hash || 'index'}.png`;
const ev = args.includes('--eval') ? args[args.indexOf('--eval') + 1] : null;
const wait = args.includes('--wait') ? +args[args.indexOf('--wait') + 1] : 900;
fs.mkdirSync(path.dirname(out), { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('file://' + path.resolve('index.html') + '#' + hash, { waitUntil: 'networkidle0' });
await page.evaluate(() => document.getElementById('curtain')?.click()); // open the start curtain
await new Promise(r => setTimeout(r, 1500));
if (ev) { await page.evaluate(ev); }
await new Promise(r => setTimeout(r, wait));
await page.screenshot({ path: out });
if (errors.length) console.log('ERRORS:\n' + errors.filter(e => !/ERR_FILE_NOT_FOUND|Failed to load resource/.test(e)).join('\n'));
console.log('saved', out);
await browser.close();
