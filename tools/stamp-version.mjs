// Stamps a new version on every file link so browsers load the latest code after an update
// (GitHub Pages lets browsers keep old files for ~10 minutes otherwise).
// Run before each release: node tools/stamp-version.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const version = `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
const root = new URL('../', import.meta.url);

const stamp = (text) => text
  // local file links in index.html and between our modules: file.js / file.css (+ old ?v=)
  .replace(/((?:href|src)="(?:css|js)\/[\w-]+\.(?:css|js))(?:\?v=[\w.-]+)?"/g, `$1?v=${version}"`)
  .replace(/(from '\.\/[\w-]+\.js)(?:\?v=[\w.-]+)?'/g, `$1?v=${version}'`)
  .replace(/(import\('\.\/[\w-]+\.js)(?:\?v=[\w.-]+)?'\)/g, `$1?v=${version}')`)
  .replace(/export const APP_VERSION = '[^']*';/, `export const APP_VERSION = '${version}';`);

const files = ['index.html', ...readdirSync(new URL('js/', root)).filter((f) => f.endsWith('.js')).map((f) => 'js/' + f)];
for (const f of files) {
  const url = new URL(f, root);
  const before = readFileSync(url, 'utf8');
  const after = stamp(before);
  if (after !== before) writeFileSync(url, after);
}
console.log('version', version);
