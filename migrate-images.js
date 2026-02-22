// migrate-images.js
// Run: node migrate-images.js
// Requires: npm install @supabase/supabase-js

import { createClient } from '@supabase/supabase-js'
import https from 'https'
import http from 'http'
import path from 'path'

// ⚠️ FILL THESE IN
const SUPABASE_URL = 'https://wsrkrzxiujrzxilasrvp.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzcmtyenhpdWpyenhpbGFzcnZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTUyODc2OSwiZXhwIjoyMDg3MTA0NzY5fQ.0MZdL7sbsxpolR875CQ9Nsjx-2VPdLJU86meiiQ04_k' // Use SERVICE ROLE key, not anon key
// Find service role key in: Supabase → Settings → API → service_role (secret)

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    client.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        downloadImage(res.headers.location).then(resolve).catch(reject)
        return
      }
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download: ${res.statusCode}`))
        return
      }
      const chunks = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    }).on('error', reject)
  })
}

function getContentType(filename) {
  const ext = path.extname(filename).toLowerCase()
  const types = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.heic': 'image/heic',
  }
  return types[ext] || 'image/jpeg'
}

function sanitizeFilename(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\-\.]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

async function migrate() {
  console.log('Fetching products from Supabase...\n')

  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, image_url')
    .not('image_url', 'is', null)

  if (error) {
    console.error('Error fetching products:', error)
    return
  }

  // Filter only Shopify CDN images
  const shopifyProducts = products.filter(p =>
    p.image_url && p.image_url.includes('cdn.shopify.com')
  )

  console.log(`Found ${shopifyProducts.length} products with Shopify images\n`)

  let success = 0
  let failed = 0

  for (const product of shopifyProducts) {
    try {
      console.log(`Processing: ${product.name}`)

      // Download image
      const imageData = await downloadImage(product.image_url)

      // Generate filename
      const urlPath = new URL(product.image_url).pathname
      const ext = path.extname(urlPath).toLowerCase() || '.jpg'
      const filename = sanitizeFilename(product.name) + ext
      const storagePath = `products/${filename}`

      const contentType = getContentType(filename)

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(storagePath, imageData, {
          contentType,
          upsert: true,
        })

      if (uploadError) {
        console.error(`  ✗ Upload failed: ${uploadError.message}`)
        failed++
        continue
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(storagePath)

      const newUrl = urlData.publicUrl

      // Update product in database
      const { error: updateError } = await supabase
        .from('products')
        .update({ image_url: newUrl })
        .eq('id', product.id)

      if (updateError) {
        console.error(`  ✗ DB update failed: ${updateError.message}`)
        failed++
        continue
      }

      console.log(`  ✓ Migrated → ${storagePath}`)
      success++
    } catch (err) {
      console.error(`  ✗ Error: ${err.message}`)
      failed++
    }
  }

  console.log(`\n=============================`)
  console.log(`Migration complete!`)
  console.log(`  ✓ Success: ${success}`)
  console.log(`  ✗ Failed:  ${failed}`)
  console.log(`=============================`)
}

migrate()