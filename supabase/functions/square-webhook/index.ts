// supabase/functions/square-webhook/index.ts
// Deploy with: supabase functions deploy square-webhook
//
// Secrets needed:
//   SQUARE_ACCESS_TOKEN
//   SQUARE_ENVIRONMENT (production or sandbox)
//   SQUARE_WEBHOOK_SIGNATURE_KEY (from Square Dashboard → Webhooks)
//   RESEND_API_KEY
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-set)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const NOTIFY_EMAILS = [
  'holysmokasthatscheap@gmail.com',
  'sahar@rossimissionsf.com',
]

// Helper: pause execution
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Helper: extract address from Square address object
function parseSquareAddress(addr) {
  if (!addr) return null
  const line1 = addr.address_line_1 || addr.addressLine1 || ''
  if (!line1) return null
  return {
    line1,
    line2: addr.address_line_2 || addr.addressLine2 || '',
    city: addr.locality || addr.city || '',
    state: addr.administrative_district_level_1 || addr.state || '',
    zip: addr.postal_code || addr.postalCode || '',
    country: addr.country || 'US',
  }
}

// Helper: fetch order from Square with retry
async function fetchSquareOrder(baseUrl, orderId, accessToken, attempt = 1) {
  console.log(`[Attempt ${attempt}] Fetching order ${orderId}...`)

  const res = await fetch(`${baseUrl}/v2/orders/${orderId}`, {
    headers: {
      'Square-Version': '2025-01-23',
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  const data = await res.json()

  if (data.errors) {
    console.error(`[Attempt ${attempt}] Order fetch errors:`, JSON.stringify(data.errors))
    return null
  }

  const order = data.order
  if (!order) {
    console.error(`[Attempt ${attempt}] No order in response`)
    return null
  }

  // Log the FULL order structure for debugging
  console.log(`[Attempt ${attempt}] Order state: ${order.state}`)
  console.log(`[Attempt ${attempt}] Fulfillments count: ${order.fulfillments?.length || 0}`)

  if (order.fulfillments) {
    for (let i = 0; i < order.fulfillments.length; i++) {
      const f = order.fulfillments[i]
      console.log(`[Attempt ${attempt}] Fulfillment[${i}] type=${f.type} state=${f.state}`)

      if (f.shipment_details) {
        console.log(`[Attempt ${attempt}] Fulfillment[${i}] shipment_details.recipient:`,
          JSON.stringify(f.shipment_details.recipient || 'NULL'))
      }

      if (f.delivery_details) {
        console.log(`[Attempt ${attempt}] Fulfillment[${i}] delivery_details.recipient:`,
          JSON.stringify(f.delivery_details.recipient || 'NULL'))
      }
    }
  } else {
    console.log(`[Attempt ${attempt}] NO fulfillments on order`)
  }

  // Check if fulfillment has shipping address
  const hasAddress = order.fulfillments?.some((f) => {
    const recipient = f.shipment_details?.recipient || f.delivery_details?.recipient
    return recipient?.address?.address_line_1
  })

  // If no address found and this is attempt 1 or 2, retry after delay
  if (!hasAddress && attempt < 3) {
    const delayMs = attempt * 3000 // 3s, 6s
    console.log(`[Attempt ${attempt}] No shipping address found yet, retrying in ${delayMs}ms...`)
    await sleep(delayMs)
    return fetchSquareOrder(baseUrl, orderId, accessToken, attempt + 1)
  }

  return order
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const body = await req.text()
    const event = JSON.parse(body)

    // ── Verify Square webhook signature ──
    const signatureKey = Deno.env.get('SQUARE_WEBHOOK_SIGNATURE_KEY')
    if (signatureKey) {
      const signature = req.headers.get('x-square-hmacsha256-signature')
      if (signature) {
        const notificationUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/square-webhook`
        const payload = notificationUrl + body
        const encoder = new TextEncoder()
        const key = await crypto.subtle.importKey(
          'raw',
          encoder.encode(signatureKey),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        )
        const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
        const expected = btoa(String.fromCharCode(...new Uint8Array(sig)))

        if (signature !== expected) {
          console.error('Invalid webhook signature')
          return new Response('Invalid signature', { status: 403 })
        }
      }
    }

    // ── Only handle payment.updated events ──
    if (event.type !== 'payment.updated') {
      console.log('Skipping event type:', event.type)
      return new Response(JSON.stringify({ received: true, skipped: event.type }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const payment = event.data?.object?.payment
    if (!payment) {
      return new Response('No payment data', { status: 400 })
    }

    // ── Only proceed if payment status is COMPLETED ──
    if (payment.status !== 'COMPLETED') {
      console.log('Skipping payment status:', payment.status)
      return new Response(JSON.stringify({ received: true, skipped: `status: ${payment.status}` }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const squareOrderId = payment.order_id
    const squarePaymentId = payment.id
    const receiptUrl = payment.receipt_url
    const amountCents = payment.amount_money?.amount || 0
    const currency = payment.amount_money?.currency || 'USD'

    console.log('========================================')
    console.log('PAYMENT COMPLETED')
    console.log('Order ID:', squareOrderId)
    console.log('Payment ID:', squarePaymentId)
    console.log('Amount:', amountCents, currency)
    console.log('========================================')

    // Log the full payment object to see what's available
    console.log('PAYMENT OBJECT KEYS:', Object.keys(payment))
    console.log('payment.shipping_address:', JSON.stringify(payment.shipping_address || 'NOT PRESENT'))
    console.log('payment.buyer_email_address:', payment.buyer_email_address || 'NOT PRESENT')
    console.log('payment.customer_id:', payment.customer_id || 'NOT PRESENT')

    // ── Init Supabase client ──
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const sb = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null

    // ── Check if already processed (prevent duplicates) ──
    if (sb) {
      const { data: existingOrder } = await sb
        .from('orders')
        .select('notified')
        .eq('square_order_id', squareOrderId)
        .single()

      if (existingOrder?.notified) {
        console.log('Already notified, skipping')
        return new Response(JSON.stringify({ received: true, skipped: 'already notified' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }

    // ══════════════════════════════════════════
    // COLLECT ALL DATA
    // ══════════════════════════════════════════
    const SQUARE_ACCESS_TOKEN = Deno.env.get('SQUARE_ACCESS_TOKEN')
    const SQUARE_ENV = Deno.env.get('SQUARE_ENVIRONMENT') || 'sandbox'
    const baseUrl = SQUARE_ENV === 'production'
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com'

    let customerName = ''
    let customerEmail = payment.buyer_email_address || ''
    let shippingAddress = null
    let lineItems = []

    // ── SOURCE 1: Payment object shipping_address ──
    if (payment.shipping_address) {
      shippingAddress = parseSquareAddress(payment.shipping_address)
      if (shippingAddress) {
        console.log('✅ SOURCE 1: Found shipping on payment object:', JSON.stringify(shippingAddress))
      }
    }

    // ── SOURCE 2: Fetch Order (with 3s delay + retry for race condition) ──
    if (squareOrderId && SQUARE_ACCESS_TOKEN) {
      // Wait 3 seconds before first fetch — gives Square time to populate fulfillment
      console.log('Waiting 3s before fetching order (race condition workaround)...')
      await sleep(3000)

      try {
        const order = await fetchSquareOrder(baseUrl, squareOrderId, SQUARE_ACCESS_TOKEN)

        if (order) {
          // Extract line items
          lineItems = (order.line_items || []).map((li) => ({
            name: li.name,
            quantity: parseInt(li.quantity, 10),
            price: (li.base_price_money?.amount || 0) / 100,
          }))

          // Check all fulfillments for shipping address
          if (order.fulfillments) {
            for (const fulfillment of order.fulfillments) {
              // SHIPMENT type
              const shipRecipient = fulfillment.shipment_details?.recipient
              if (shipRecipient) {
                if (!customerName && shipRecipient.display_name) {
                  customerName = shipRecipient.display_name
                }
                if (!customerEmail && shipRecipient.email_address) {
                  customerEmail = shipRecipient.email_address
                }
                if (!shippingAddress && shipRecipient.address) {
                  shippingAddress = parseSquareAddress(shipRecipient.address)
                  if (shippingAddress) {
                    console.log('✅ SOURCE 2a: Found shipping in SHIPMENT fulfillment:', JSON.stringify(shippingAddress))
                  }
                }
              }

              // DELIVERY type
              const delRecipient = fulfillment.delivery_details?.recipient
              if (delRecipient) {
                if (!customerName && delRecipient.display_name) {
                  customerName = delRecipient.display_name
                }
                if (!customerEmail && delRecipient.email_address) {
                  customerEmail = delRecipient.email_address
                }
                if (!shippingAddress && delRecipient.address) {
                  shippingAddress = parseSquareAddress(delRecipient.address)
                  if (shippingAddress) {
                    console.log('✅ SOURCE 2b: Found shipping in DELIVERY fulfillment:', JSON.stringify(shippingAddress))
                  }
                }
              }
            }
          }
        }
      } catch (fetchErr) {
        console.error('Failed to fetch order:', fetchErr)
      }
    }

    // ── SOURCE 3: Fetch Customer record ──
    if (!shippingAddress && payment.customer_id && SQUARE_ACCESS_TOKEN) {
      try {
        console.log('SOURCE 3: Fetching customer record:', payment.customer_id)
        const custRes = await fetch(`${baseUrl}/v2/customers/${payment.customer_id}`, {
          headers: {
            'Square-Version': '2025-01-23',
            'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
          },
        })
        const custData = await custRes.json()
        const customer = custData.customer

        if (customer) {
          if (!customerName) {
            customerName = [customer.given_name, customer.family_name].filter(Boolean).join(' ')
          }
          if (!customerEmail && customer.email_address) {
            customerEmail = customer.email_address
          }
          if (customer.address) {
            shippingAddress = parseSquareAddress(customer.address)
            if (shippingAddress) {
              console.log('✅ SOURCE 3: Found address on customer record:', JSON.stringify(shippingAddress))
            }
          }
        }
      } catch (custErr) {
        console.error('Failed to fetch customer:', custErr)
      }
    }

    // ── SOURCE 4: Billing address as last resort ──
    if (!shippingAddress && payment.card_details?.card?.billing_address) {
      shippingAddress = parseSquareAddress(payment.card_details.card.billing_address)
      if (shippingAddress) {
        console.log('⚠ SOURCE 4 FALLBACK: Using billing address:', JSON.stringify(shippingAddress))
      }
    }

    console.log('========================================')
    console.log('FINAL RESULTS')
    console.log('Customer Name:', customerName || '(empty)')
    console.log('Customer Email:', customerEmail || '(empty)')
    console.log('Shipping Address:', JSON.stringify(shippingAddress) || 'NULL')
    console.log('Line Items:', lineItems.length)
    console.log('========================================')

    // ── Update order in Supabase ──
    let savedItems = lineItems

    if (sb) {
      const { data: existingOrder } = await sb
        .from('orders')
        .select('items')
        .eq('square_order_id', squareOrderId)
        .single()

      if (existingOrder?.items && existingOrder.items.length > 0) {
        savedItems = existingOrder.items
      }

      await sb.from('orders').upsert({
        square_order_id: squareOrderId,
        square_payment_id: squarePaymentId,
        status: 'paid',
        items: savedItems.length > 0 ? savedItems : lineItems,
        item_count: lineItems.reduce((sum, li) => sum + li.quantity, 0) || savedItems.length,
        total_cents: amountCents,
        currency: currency,
        customer_name: customerName || null,
        customer_email: customerEmail || null,
        shipping_address: shippingAddress,
        square_receipt_url: receiptUrl || null,
        notified: false,
        paid_at: new Date().toISOString(),
      }, { onConflict: 'square_order_id' })

      // ── DECREMENT INVENTORY ──
      const itemsToDecrement = lineItems.length > 0 ? lineItems : savedItems
      for (const item of itemsToDecrement) {
        try {
          const { data: result, error: rpcErr } = await sb.rpc('decrement_inventory', {
            p_item_name: item.name,
            p_quantity: item.quantity || 1,
            p_order_id: squareOrderId,
          })

          if (rpcErr) {
            console.error(`Failed to decrement inventory for "${item.name}":`, rpcErr)
          } else {
            console.log(`Inventory updated for "${item.name}":`, result)
          }
        } catch (invErr) {
          console.error(`Inventory decrement error for "${item.name}":`, invErr)
        }
      }
    }

    // ── Send email notification via Resend ──
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

    if (RESEND_API_KEY) {
      const totalDollars = (amountCents / 100).toFixed(2)

      const itemsList = (savedItems.length > 0 ? savedItems : lineItems)
        .map((item) => {
          const size = item.size ? ` (${item.size})` : ''
          const qty = item.quantity || 1
          const price = item.price ? ` — $${Number(item.price).toFixed(2)}` : ''
          return `• ${item.name}${size} × ${qty}${price}`
        })
        .join('\n')

      let shippingBlock = '⚠ NOT COLLECTED — Square did not return a shipping address.\nCheck Square Dashboard → Sales → Transactions for this order.'
      if (shippingAddress && shippingAddress.line1) {
        const parts = [shippingAddress.line1]
        if (shippingAddress.line2) parts.push(shippingAddress.line2)
        parts.push(`${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zip}`)
        if (shippingAddress.country && shippingAddress.country !== 'US') {
          parts.push(shippingAddress.country)
        }
        shippingBlock = parts.join('\n')
      }

      const emailBody = `
New order on Rossi Mission SF!

━━━━━━━━━━━━━━━━━━━━━━━━━━
CUSTOMER
━━━━━━━━━━━━━━━━━━━━━━━━━━
Name:  ${customerName || 'Not available'}
Email: ${customerEmail || 'Not available'}

━━━━━━━━━━━━━━━━━━━━━━━━━━
SHIPPING ADDRESS
━━━━━━━━━━━━━━━━━━━━━━━━━━
${shippingBlock}

━━━━━━━━━━━━━━━━━━━━━━━━━━
ORDER ITEMS
━━━━━━━━━━━━━━━━━━━━━━━━━━
${itemsList || 'See Square Dashboard for details'}

━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL: $${totalDollars} ${currency}
━━━━━━━━━━━━━━━━━━━━━━━━━━

${receiptUrl ? `Square Receipt: ${receiptUrl}` : ''}
View full details: https://squareup.com/dashboard/sales/transactions
`.trim()

      for (const toEmail of NOTIFY_EMAILS) {
        try {
          const emailRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Rossi Mission SF <orders@milanilabs.com>',
              to: [toEmail],
              subject: `New Order — $${totalDollars} — ${customerName || 'Customer'}`,
              text: emailBody,
            }),
          })
          const emailResult = await emailRes.json()
          console.log(`Email sent to ${toEmail}:`, JSON.stringify(emailResult))
        } catch (emailErr) {
          console.error(`Failed to send to ${toEmail}:`, emailErr)
        }
      }

      // Mark as notified
      if (sb) {
        await sb.from('orders').update({ notified: true }).eq('square_order_id', squareOrderId)
      }
    }

    return new Response(
      JSON.stringify({ received: true, order_id: squareOrderId }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('Webhook error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})