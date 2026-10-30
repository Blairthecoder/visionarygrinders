import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, 'dist');
const excluded = new Set(['.git', '.github', '.netlify', 'dist', 'netlify', 'node_modules', 'scripts']);

await rm(output, { recursive: true, force: true });
await mkdir(output);
for (const entry of await readdir(root, { withFileTypes: true })) {
  if (excluded.has(entry.name) || entry.name.startsWith('.lighthouse-')) continue;
  await cp(join(root, entry.name), join(output, entry.name), { recursive: true });
}

const styles = (await readFile(join(root, 'styles.css'), 'utf8')).trim();
const siteScriptHash = createHash('sha256').update(await readFile(join(root, 'site.js'))).digest('hex').slice(0, 8);
// The self-hosted face sits behind the inlined CSS, so preload it.
const fontPreloads = [
  '<link rel="preload" href="/fonts/hakter-variable.woff2" as="font" type="font/woff2" crossorigin>',
].join('\n');
const inlineStyles = `${fontPreloads}\n<style data-site-styles>\n${styles}\n</style>`;
const siteScript = `<script src="/site.js?v=${siteScriptHash}" defer></script>`;
const existingSiteScript = /<script src="\/site\.js(?:\?v=[^"]*)?" defer><\/script>/;
const googleTag = /<!-- Google tag \(gtag\.js\) -->\s*<script async src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-VW0LYN6GD6"><\/script>\s*<script>[\s\S]*?gtag\('config', 'G-VW0LYN6GD6'\);\s*<\/script>\s*/;
const fontAndCssLinks = /<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\s*<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin>\s*<link href="https:\/\/fonts\.googleapis\.com\/css2[^>]+>\s*<link rel="stylesheet" href="\/styles\.css">/;
// Site-wide announcement bar, placed under the skip link on every page that has
// one. site.js removes it once data-hide-after passes; delete these two lines
// (and the replace below) after the event.
const skipLink = '<a class="skip" href="#main">Skip to Content</a>';
const announcement = '<a class="announce" href="/events/#next-popup" data-hide-after="2026-11-01T16:00:00-06:00">Come see us Sunday, Nov 1 at the Tribeca Lifestyle Market, 12–4 PM. <span>Details</span></a>';
const oldInlineNavigation = /<script>document\.getElementById\('yr'\)\.textContent=new Date\(\)\.getFullYear\(\);\(function\(\)\{var b=document\.querySelector\('\.nav-toggle'\),h=document\.querySelector\('\.site-header'\);if\(!b\)return;b\.addEventListener\('click',function\(\)\{var o=h\.classList\.toggle\('open'\);b\.setAttribute\('aria-expanded',o\)\}\);\}\)\(\);<\/script>/;

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await htmlFiles(path));
    else if (entry.name.endsWith('.html')) files.push(path);
  }
  return files;
}

let updated = 0;
for (const file of await htmlFiles(output)) {
  let html = await readFile(file, 'utf8');
  html = html.replace(googleTag, '');
  html = html.replace(fontAndCssLinks, inlineStyles);
  html = html.replace('<link rel="stylesheet" href="/styles.css">', inlineStyles);
  html = html.replace(oldInlineNavigation, siteScript);
  if (existingSiteScript.test(html)) {
    html = html.replace(existingSiteScript, siteScript);
  } else {
    html = html.replace('</body>', `${siteScript}\n</body>`);
  }
  if (!html.includes('rel="icon"')) {
    html = html.replace('<meta name="theme-color" content="#14110f">', '<meta name="theme-color" content="#14110f">\n<link rel="icon" href="/favicon.svg" type="image/svg+xml">');
  }
  html = html.replace(skipLink, `${skipLink}\n${announcement}`);
  html = html.replace(/(\/images\/[A-Za-z0-9-]+)\.jpg/g, '$1.webp');
  if (basename(file) === 'index.html' && file === join(output, 'index.html')) {
    html = html.replace(
      '/images/pop-up-setup-sm.webp 700w, /images/pop-up-setup.webp 1200w',
      '/images/pop-up-setup-sm.webp 700w, /images/pop-up-setup-md.webp 800w, /images/pop-up-setup.webp 1200w',
    );
  }
  await writeFile(file, html);
  updated++;
}

console.log(`Built ${updated} optimized HTML files in dist/.`);
