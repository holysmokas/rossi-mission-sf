// migrate-from-supabase.mjs (v2 - resumable)
//
// Same usage as v1, but:
//   - Retries downloads on transient errors (3 attempts, exp backoff)
//   - Tracks completed R2 uploads in supabase-export/r2-uploaded.json
//     so reruns skip already-uploaded files
//
//   SUPABASE_URL='https://wsrkrzxiujrzxilasrvp.supabase.co' \
//   SUPABASE_SERVICE_KEY='<service-role-key>' \
//   node migrate-from-supabase.mjs

import { createClient } from '@supabase/supabase-js';
import { execSync } from 'node:child_process';
import { writeFileSync, readFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const R2_BUCKET = 'rossi-media';
const EXPORT_DIR = './supabase-export';
const MANIFEST_PATH = join(EXPORT_DIR, 'r2-uploaded.json');

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('ERROR: set SUPABASE_URL and SUPABASE_SERVICE_KEY in env');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ─────────────────────────────────────────────────────────────────────────────
// Upload manifest (so reruns skip files already in R2)
// ─────────────────────────────────────────────────────────────────────────────
mkdirSync(EXPORT_DIR, { recursive: true });
const uploaded = new Set(
  existsSync(MANIFEST_PATH) ? JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) : []
);
function markUploaded(key) {
  uploaded.add(key);
  writeFileSync(MANIFEST_PATH, JSON.stringify([...uploaded]));
}

// ─────────────────────────────────────────────────────────────────────────────
// Retry helper
// ─────────────────────────────────────────────────────────────────────────────
async function withRetry(fn, label, attempts = 4) {
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i < attempts) {
        const delayMs = 1000 * Math.pow(2, i - 1); // 1s, 2s, 4s
        process.stdout.write(` (retry ${i}/${attempts - 1} after ${delayMs}ms) `);
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
  }
  throw new Error(`${label} after ${attempts} attempts: ${lastErr.message}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// STORAGE
// ─────────────────────────────────────────────────────────────────────────────
async function listBucketRecursive(bucket, prefix = '') {
  const out = [];
  const { data, error } = await sb.storage
    .from(bucket)
    .list(prefix, { limit: 1000, sortBy: { column: 'name', order: 'asc' } });
  if (error) throw new Error(`list ${bucket}/${prefix}: ${error.message}`);
  for (const item of data) {
    const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id === null) {
      out.push(...(await listBucketRecursive(bucket, fullPath)));
    } else {
      out.push(fullPath);
    }
  }
  return out;
}

async function downloadFile(bucket, path, localPath) {
  return withRetry(async () => {
    const { data, error } = await sb.storage.from(bucket).download(path);
    if (error) throw new Error(error.message);
    const buf = Buffer.from(await data.arrayBuffer());
    mkdirSync(dirname(localPath), { recursive: true });
    writeFileSync(localPath, buf);
    return buf.length;
  }, `download ${bucket}/${path}`);
}

function uploadToR2(localPath, r2Key) {
  return withRetry(() => {
    const cmd = `npx wrangler r2 object put "${R2_BUCKET}/${r2Key}" --file="${localPath}" --remote`;
    try {
      execSync(cmd, { stdio: 'pipe' });
    } catch (e) {
      throw new Error((e.stderr?.toString() || e.message).slice(0, 300));
    }
  }, `r2 put ${r2Key}`);
}

async function migrateBucket(bucket) {
  console.log(`\n━━━ STORAGE: ${bucket} ━━━`);
  const files = await listBucketRecursive(bucket);
  const cachedCount = [...uploaded].filter(k => k.startsWith(bucket + '/')).length;
  console.log(`  ${files.length} files (${cachedCount} already in R2)\n`);

  let totalBytes = 0;
  let i = 0;
  for (const f of files) {
    i++;
    const localPath = join(EXPORT_DIR, 'storage', bucket, f);
    const r2Key = `${bucket}/${f}`;

    if (uploaded.has(r2Key)) {
      // Already uploaded in a previous run; skip silently
      if (existsSync(localPath)) totalBytes += statSync(localPath).size;
      continue;
    }

    process.stdout.write(`  [${i}/${files.length}] ${f.slice(0, 70)}... `);

    let size;
    if (existsSync(localPath)) {
      size = statSync(localPath).size;
      process.stdout.write('cached');
    } else {
      try {
        size = await downloadFile(bucket, f, localPath);
        process.stdout.write(`${(size / 1024).toFixed(0)}kb`);
      } catch (e) {
        console.log(` → DOWNLOAD FAILED ${e.message}`);
        continue;
      }
    }
    totalBytes += size;

    try {
      await uploadToR2(localPath, r2Key);
      markUploaded(r2Key);
      console.log(' → R2 ✓');
    } catch (e) {
      console.log(` → R2 FAILED ${e.message}`);
    }
  }
  console.log(`\n  Total: ${(totalBytes / 1024 / 1024).toFixed(1)}MB across ${files.length} files`);
}

// ─────────────────────────────────────────────────────────────────────────────
// TABLES
// ─────────────────────────────────────────────────────────────────────────────
async function dumpTable(table) {
  console.log(`\n━━━ TABLE: ${table} ━━━`);
  const { data, error } = await sb.from(table).select('*');
  if (error) { console.log(`  ✗ ${error.message}`); return null; }
  const path = join(EXPORT_DIR, 'tables', `${table}.json`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2));
  console.log(`  ${data.length} rows → ${path}`);
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTS → D1 UPSERT SQL
// ─────────────────────────────────────────────────────────────────────────────
function rewriteStorageUrl(url) {
  if (typeof url !== 'string') return url;
  const m = url.match(/\/storage\/v1\/object\/public\/(.+)$/);
  return m ? `/media/${m[1]}` : url;
}
function sqlEscape(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? '1' : '0';
  if (Array.isArray(v) || typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
  return `'${String(v).replace(/'/g, "''")}'`;
}
function toUnixSecs(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return v > 1e12 ? Math.floor(v / 1000) : v;
  const d = new Date(v);
  return isNaN(d) ? null : Math.floor(d.getTime() / 1000);
}
function buildProductUpserts(products) {
  if (!products?.length) return '';
  const cols = ['id', 'name', 'description', 'price', 'category', 'subcategory',
    'image_url', 'images', 'featured', 'active', 'quantity',
    'tags', 'artist', 'sizes', 'created_at', 'updated_at'];
  const lines = ['-- products: image URLs rewritten Supabase → /media/', 'BEGIN;'];
  for (const p of products) {
    const row = {
      id: p.id, name: p.name, description: p.description, price: p.price,
      category: p.category, subcategory: p.subcategory,
      image_url: rewriteStorageUrl(p.image_url),
      images: Array.isArray(p.images) ? p.images.map(rewriteStorageUrl) : [],
      featured: p.featured ? 1 : 0, active: p.active ? 1 : 0,
      quantity: p.quantity ?? 0,
      tags: Array.isArray(p.tags) ? p.tags : [],
      artist: p.artist,
      sizes: Array.isArray(p.sizes) ? p.sizes : [],
      created_at: toUnixSecs(p.created_at),
      updated_at: toUnixSecs(p.updated_at),
    };
    lines.push(`INSERT OR REPLACE INTO products (${cols.join(', ')}) VALUES (${cols.map(c => sqlEscape(row[c])).join(', ')});`);
  }
  lines.push('COMMIT;', '');
  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  const start = Date.now();

  for (const bucket of ['product-images', 'gallery', 'showcase']) {
    await migrateBucket(bucket);
  }

  const products = await dumpTable('products');
  await dumpTable('orders');
  await dumpTable('gallery_images');
  await dumpTable('showcase_images');
  await dumpTable('contact_messages');
  await dumpTable('newsletter');
  await dumpTable('inventory_log');

  if (products?.length) {
    const sql = buildProductUpserts(products);
    const sqlPath = join(EXPORT_DIR, 'update-products.sql');
    writeFileSync(sqlPath, sql);
    console.log(`\n━━━ D1 SQL ━━━`);
    console.log(`  ${sqlPath} (${products.length} products)`);
    console.log(`\n  Run:`);
    console.log(`    npx wrangler d1 execute rossi --remote --file=${sqlPath}`);
  }

  console.log(`\n✓ Done in ${((Date.now() - start) / 1000).toFixed(1)}s`);
}

main().catch(e => {
  console.error('\n✗ FATAL:', e.message);
  process.exit(1);
});
