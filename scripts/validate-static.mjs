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
const invalidStructuredData = [];
const files = await htmlFiles(root);
for (const file of files) {
  const html = await readFile(file, 'utf8');
  if (!html.includes('<style data-site-styles>') || !/<script src="\/site\.js\?v=[a-f0-9]{8}" defer><\/script>/.test(html)) {
    outdated.push(file);
  }
  for (const match of html.matchAll(/(?:src|href)=["'](\/[^/"'#?]*)/g)) {
    const url = decodeURI(match[1]);
    let target = join(root, url);
    if (url.endsWith('/')) target = join(target, 'index.html');
    if (!existsSync(target)) missing.push({ file, url });
  }
  for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      JSON.parse(match[1]);
    } catch (error) {
      invalidStructuredData.push({ file, error: error.message });
    }
  }
}

const homeHtml = await readFile(join(root, 'index.html'), 'utf8');
if (!homeHtml.includes('"@type": "Caterer"') ||
    !homeHtml.includes('"hasMenu": "https://visionarygrinderscoffee.com/menu/"') ||
    !homeHtml.includes('https://www.instagram.com/visionarygrinderscoffee/')) {
  invalidStructuredData.push({ file: join(root, 'index.html'), error: 'Homepage business schema is missing GBP-aligned type, menu or profile data.' });
}

if (missing.length || outdated.length || invalidStructuredData.length) {
  console.error(JSON.stringify({ missing, outdated, invalidStructuredData }, null, 2));
  process.exit(1);
}

console.log(`Validated ${files.length} HTML files, local assets, critical-path markup and JSON-LD.`);
