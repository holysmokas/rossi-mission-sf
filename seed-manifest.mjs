// seed-manifest.mjs
// Marks every already-downloaded local file as "uploaded to R2" so the
// migration script's resume logic skips them.
import fs from 'node:fs';
import path from 'node:path';

const STORAGE = './supabase-export/storage';
const done = [];

for (const bucket of ['product-images', 'gallery', 'showcase']) {
  const dir = path.join(STORAGE, bucket);
  if (!fs.existsSync(dir)) continue;
  const walk = (p, rel = '') => {
    for (const e of fs.readdirSync(p, { withFileTypes: true })) {
      const full = path.join(p, e.name);
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(full, r);
      else done.push(`${bucket}/${r}`);
    }
  };
  walk(dir);
}

// Filter out any zero-byte/partial files from the crash
const good = done.filter(k => {
  try {
    return fs.statSync(path.join(STORAGE, k)).size > 0;
  } catch {
    return false;
  }
});

fs.mkdirSync('./supabase-export', { recursive: true });
fs.writeFileSync('./supabase-export/r2-uploaded.json', JSON.stringify(good));
console.log(`Manifest seeded with ${good.length} already-uploaded files`);
