/**
 * Fails the production build if the bundled JS still contains local-dev service URLs.
 * Run after `vite build` so localhost never ships to Vercel.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = join(process.cwd(), 'dist');
const BAD = /https?:\/\/(?:localhost|127\.0\.0\.1):\d+/gi;

/** Allowlisted patterns that are OK even in prod (docs, comments rarely remain). Prefer none. */
const ALLOW = [
  // none — prod browsers must not call local services
];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(js|css|html|map)$/i.test(name)) out.push(p);
  }
  return out;
}

let files;
try {
  files = walk(DIST);
} catch {
  console.error('guard:prod-urls: dist/ not found — run vite build first');
  process.exit(1);
}

const leaks = [];
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  const hits = text.match(BAD) || [];
  for (const hit of hits) {
    if (ALLOW.some((re) => re.test(hit))) continue;
    leaks.push(`${file}: ${hit}`);
  }
}

if (leaks.length) {
  console.error('Production bundle contains local-dev URLs (block deploy):\n');
  for (const line of [...new Set(leaks)].slice(0, 40)) {
    console.error(`  ${line}`);
  }
  console.error(
    '\nFix: wrap localhost defaults in import.meta.env.DEV branches and use resolvePublicUrl().',
  );
  process.exit(1);
}

console.log('guard:prod-urls OK — no localhost/127.0.0.1 service URLs in dist/');
