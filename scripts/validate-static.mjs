import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const root = process.argv[2] ? join(projectRoot, process.argv[2]) : projectRoot;

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await htmlFiles(path));
    else if (entry.name.endsWith('.html')) files.push(path);
  }
  return files;
}

const missing = [];
const outdated = [];
const files = await htmlFiles(root);
for (const file of files) {
  const html = await readFile(file, 'utf8');
  if (!html.includes('<style data-site-styles>') || !html.includes('<script src="/site.js" defer></script>')) {
    outdated.push(file);
  }
  for (const match of html.matchAll(/(?:src|href)=["'](\/[^/"'#?]*)/g)) {
    const url = decodeURI(match[1]);
    let target = join(root, url);
    if (url.endsWith('/')) target = join(target, 'index.html');
    if (!existsSync(target)) missing.push({ file, url });
  }
}

if (missing.length || outdated.length) {
  console.error(JSON.stringify({ missing, outdated }, null, 2));
  process.exit(1);
}

console.log(`Validated ${files.length} HTML files with no missing local assets or stale critical-path markup.`);
