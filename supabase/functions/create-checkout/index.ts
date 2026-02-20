// supabase/functions/create-checkout/index.ts
// Deploy with: supabase functions deploy create-checkout
// Set secrets:
//   supabase secrets set SQUARE_ACCESS_TOKEN=your_token
//   supabase secrets set SQUARE_LOCATION_ID=your_location_id
//   supabase secrets set SQUARE_ENVIRONMENT=sandbox  (or 'production')

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const SQUARE_ACCESS_TOKEN = Deno.env.get('SQUARE_ACCESS_TOKEN')
    const SQUARE_LOCATION_ID = Deno.env.get('SQUARE_LOCATION_ID')
    const SQUARE_ENV = Deno.env.get('SQUARE_ENVIRONMENT') || 'sandbox'

    if (!SQUARE_ACCESS_TOKEN || !SQUARE_LOCATION_ID) {
      throw new Error('Square credentials not configured')
    }

    const baseUrl = SQUARE_ENV === 'production'
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com'

    const { items } = await req.json()

    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Cart is empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build line items for Square order
    const lineItems = items.map((item) => ({
      name: item.size ? `${item.name} (${item.size})` : item.name,
      quantity: String(item.quantity),
      base_price_money: {
        amount: Math.round(item.price * 100), // Square uses cents
        currency: 'USD',
      },
    }))

    // Create payment link via Square Checkout API
    const response = await fetch(`${baseUrl}/v2/online-checkout/payment-links`, {
      method: 'POST',
      headers: {
        'Square-Version': '2026-01-22',
        'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        idempotency_key: crypto.randomUUID(),
        order: {
          location_id: SQUARE_LOCATION_ID,
          line_items: lineItems,
        },
        checkout_options: {
          redirect_url: 'https://rossimissionsf.com/checkout/success',
          ask_for_shipping_address: true,
        },
      }),
    })

    const data = await response.json()

    if (data.errors) {
      console.error('Square API errors:', data.errors)
      return new Response(
        JSON.stringify({ error: data.errors[0]?.detail || 'Square checkout failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        url: data.payment_link?.url || data.payment_link?.long_url,
        order_id: data.payment_link?.order_id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('Checkout error:', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
