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
  'info@rossimissionsf.com',
]

// ── Helper: extract address from Square address object ──
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

    console.log('=== PAYMENT COMPLETED ===')
    console.log('Order ID:', squareOrderId)
    console.log('Payment ID:', squarePaymentId)

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
        return new Response(JSON.stringify({ received: true, skipped: 'already notified' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }

    // ══════════════════════════════════════════
    // COLLECT SHIPPING ADDRESS FROM ALL SOURCES
    // ══════════════════════════════════════════
    const SQUARE_ACCESS_TOKEN = Deno.env.get('SQUARE_ACCESS_TOKEN')
    const SQUARE_ENV = Deno.env.get('SQUARE_ENVIRONMENT') || 'sandbox'
    const baseUrl = SQUARE_ENV === 'production'
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com'

    let customerName = ''
    let customerEmail = ''
    let shippingAddress = null
    let lineItems = []

    // ── SOURCE 1: Payment object itself ──
    // Square Payment Links often put shipping_address directly on the payment
    console.log('--- Checking payment object for shipping ---')
    console.log('payment.shipping_address:', JSON.stringify(payment.shipping_address))
    console.log('payment.buyer_email_address:', payment.buyer_email_address)

    if (payment.shipping_address) {
      shippingAddress = parseSquareAddress(payment.shipping_address)
      console.log('>> Found shipping on payment object:', JSON.stringify(shippingAddress))
    }

    if (payment.buyer_email_address) {
      customerEmail = payment.buyer_email_address
    }

    // ── SOURCE 2: Fetch the full Order from Square ──
    if (squareOrderId && SQUARE_ACCESS_TOKEN) {
      try {
        // Use batch-retrieve for more complete data
        const orderRes = await fetch(`${baseUrl}/v2/orders/batch-retrieve`, {
          method: 'POST',
          headers: {
            'Square-Version': '2025-01-23',
            'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            location_id: Deno.env.get('SQUARE_LOCATION_ID') || undefined,
            order_ids: [squareOrderId],
          }),
        })
        const orderData = await orderRes.json()
        const orderDetails = orderData.orders?.[0]

        console.log('--- Full order response keys ---')
        if (orderDetails) {
          console.log('Order keys:', Object.keys(orderDetails))
          console.log('Fulfillments count:', orderDetails.fulfillments?.length || 0)

          // Extract line items
          lineItems = (orderDetails.line_items || []).map((li) => ({
            name: li.name,
            quantity: parseInt(li.quantity, 10),
            price: (li.base_price_money?.amount || 0) / 100,
          }))

          // ── SOURCE 2a: Order fulfillments ──
          if (orderDetails.fulfillments && orderDetails.fulfillments.length > 0) {
            for (const fulfillment of orderDetails.fulfillments) {
              console.log('Fulfillment type:', fulfillment.type)
              console.log('Fulfillment state:', fulfillment.state)

              // SHIPMENT type (most common for Payment Links with shipping)
              if (fulfillment.shipment_details?.recipient) {
                const recipient = fulfillment.shipment_details.recipient
                console.log('Shipment recipient:', JSON.stringify(recipient))

                if (!customerName && recipient.display_name) {
                  customerName = recipient.display_name
                }
                if (!customerEmail && recipient.email_address) {
                  customerEmail = recipient.email_address
                }
                if (!shippingAddress && recipient.address) {
                  shippingAddress = parseSquareAddress(recipient.address)
                  console.log('>> Found shipping in shipment fulfillment:', JSON.stringify(shippingAddress))
                }
              }

              // DELIVERY type (alternative fulfillment structure)
              if (fulfillment.delivery_details?.recipient) {
                const recipient = fulfillment.delivery_details.recipient
                console.log('Delivery recipient:', JSON.stringify(recipient))

                if (!customerName && recipient.display_name) {
                  customerName = recipient.display_name
                }
                if (!customerEmail && recipient.email_address) {
                  customerEmail = recipient.email_address
                }
                if (!shippingAddress && recipient.address) {
                  shippingAddress = parseSquareAddress(recipient.address)
                  console.log('>> Found shipping in delivery fulfillment:', JSON.stringify(shippingAddress))
                }
              }
            }
          }

          // ── SOURCE 2b: Order-level net amounts / recipient (some Square versions) ──
          if (orderDetails.recipient?.address && !shippingAddress) {
            shippingAddress = parseSquareAddress(orderDetails.recipient.address)
            console.log('>> Found shipping on order.recipient:', JSON.stringify(shippingAddress))
          }

          // ── SOURCE 2c: Order metadata/note ──
          if (orderDetails.metadata) {
            console.log('Order metadata:', JSON.stringify(orderDetails.metadata))
          }
        } else {
          console.log('No order details returned. Response:', JSON.stringify(orderData))
        }
      } catch (fetchErr) {
        console.error('Failed to fetch Square order:', fetchErr)
      }
    }

    // ── SOURCE 3: Fetch Customer record if we have a customer_id ──
    if (!shippingAddress && payment.customer_id && SQUARE_ACCESS_TOKEN) {
      try {
        console.log('--- Fetching customer record:', payment.customer_id, '---')
        const custRes = await fetch(`${baseUrl}/v2/customers/${payment.customer_id}`, {
          headers: {
            'Square-Version': '2025-01-23',
            'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
          },
        })
        const custData = await custRes.json()
        const customer = custData.customer

        if (customer) {
          console.log('Customer data keys:', Object.keys(customer))

          if (!customerName) {
            customerName = [customer.given_name, customer.family_name].filter(Boolean).join(' ')
          }
          if (!customerEmail && customer.email_address) {
            customerEmail = customer.email_address
          }
          // Customer address
          if (customer.address) {
            shippingAddress = parseSquareAddress(customer.address)
            console.log('>> Found shipping on customer record:', JSON.stringify(shippingAddress))
          }
        }
      } catch (custErr) {
        console.error('Failed to fetch customer:', custErr)
      }
    }

    // ── SOURCE 4: Check the payment tender for card details (billing as fallback) ──
    if (!shippingAddress && payment.card_details?.card?.billing_address) {
      shippingAddress = parseSquareAddress(payment.card_details.card.billing_address)
      console.log('>> Fallback: Using billing address from card:', JSON.stringify(shippingAddress))
    }

    console.log('=== FINAL RESULTS ===')
    console.log('Customer Name:', customerName)
    console.log('Customer Email:', customerEmail)
    console.log('Shipping Address:', JSON.stringify(shippingAddress))
    console.log('Line Items:', lineItems.length)

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

      // Build shipping block with clear messaging
      let shippingBlock = '⚠ Not collected — check Square Dashboard'
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
              from: 'Rossi Mission SF <orders@rossimissionsf.com>',
              to: [toEmail],
              subject: `New Order — $${totalDollars} — ${customerName || 'Customer'}`,
              text: emailBody,
            }),
          })
          const emailResult = await emailRes.json()
          console.log(`Email to ${toEmail}:`, JSON.stringify(emailResult))
        } catch (emailErr) {
          console.error(`Failed to send notification to ${toEmail}:`, emailErr)
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