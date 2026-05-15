// functions/api/checkout.js
//
// POST /api/checkout
// Body: { items: [{ id, name, size, price, quantity, image_url? }] }
// Returns: { checkout_url, order_id }
//
// Creates a Square Online Checkout payment link, persists a pending order row.

const SQUARE_API_VERSION = '2025-06-18';
const CURRENCY = 'USD';

function squareBase(env) {
    return env.SQUARE_ENVIRONMENT === 'sandbox'
        ? 'https://connect.squareupsandbox.com'
        : 'https://connect.squareup.com';
}

function bad(message, status = 400) {
    return Response.json({ error: message }, { status });
}

function nowSecs() {
    return Math.floor(Date.now() / 1000);
}

export async function onRequestPost({ request, env }) {
  console.log("CHECKOUT_V3_MARKER", new Date().toISOString());
    let body;
    try {
        body = await request.json();
    } catch {
        return bad('invalid JSON');
    }

    const items = Array.isArray(body?.items) ? body.items : [];
    if (!items.length) return bad('cart is empty');

    // Normalize + validate items, hydrate prices from D1 (NEVER trust client prices)
    const ids = [...new Set(items.map(i => i.id))];
    const placeholders = ids.map(() => '?').join(',');
    const { results: dbProducts } = await env.DB.prepare(
        `SELECT id, name, price, quantity, active FROM products WHERE id IN (${placeholders})`
    ).bind(...ids).all();
    const productById = Object.fromEntries(dbProducts.map(p => [p.id, p]));

    const lineItems = [];
    const cartItems = [];
    let totalCents = 0;
    let itemCount = 0;

    for (const ci of items) {
        const p = productById[ci.id];
        if (!p) return bad(`product not found: ${ci.id}`);
        if (!p.active) return bad(`product unavailable: ${p.name}`);

        const qty = Math.max(1, Math.min(99, parseInt(ci.quantity, 10) || 1));
        if (p.quantity < qty) {
            return bad(`only ${p.quantity} of "${p.name}" available`);
        }

        const priceCents = Math.round(p.price * 100);
        const displayName = ci.size ? `${p.name} (${ci.size})` : p.name;

        lineItems.push({
            name: displayName,
            quantity: String(qty),
            base_price_money: { amount: priceCents, currency: CURRENCY },
        });

        cartItems.push({
            product_id: p.id,
            name: displayName,
            size: ci.size || null,
            price: p.price,
            quantity: qty,
        });

        totalCents += priceCents * qty;
        itemCount += qty;
    }

    // Generate our internal order id (UUID); webhook will look up by square_order_id
    const internalId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();

    // Create Square Payment Link
    const checkoutBody = {
        idempotency_key: idempotencyKey,
        order: {
            location_id: env.SQUARE_LOCATION_ID,
            line_items: lineItems,
            reference_id: internalId, // visible in Square dashboard
        },
        checkout_options: {
            ask_for_shipping_address: true,
            merchant_support_email: env.FROM_EMAIL,
            redirect_url: `https://www.rossimissionsf.com/order/success?id=${internalId}`,
            accepted_payment_methods: {
                apple_pay: true,
                google_pay: true,
                cash_app_pay: false,
                afterpay_clearpay: false,
            },
        },
    };

    const resp = await fetch(`${squareBase(env)}/v2/online-checkout/payment-links`, {
        method: 'POST',
        headers: {
            'Square-Version': SQUARE_API_VERSION,
            'Authorization': `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(checkoutBody),
    });

    if (!resp.ok) {
        const errText = await resp.text();
        console.error('square payment-link error', resp.status, errText);
        return Response.json(
            { error: 'payment link creation failed', detail: errText.slice(0, 400) },
            { status: 502 }
        );
    }

    const data = await resp.json();
    const paymentLink = data?.payment_link;
    if (!paymentLink?.url || !paymentLink?.order_id) {
        return Response.json({ error: 'unexpected square response', data }, { status: 502 });
    }

    console.log("CHECKOUT_V3_CART", JSON.stringify(cartItems));
  // Persist pending order; webhook will UPDATE this row when payment completes
    await env.DB.prepare(
        `INSERT INTO orders
       (id, square_order_id, status, items, item_count, total_cents, currency, notified, created_at)
     VALUES (?, ?, 'pending', ?, ?, ?, ?, 0, ?)`
    ).bind(
        internalId,
        paymentLink.order_id,
        JSON.stringify(cartItems),
        itemCount,
        totalCents,
        CURRENCY,
        nowSecs()
    ).run();

    return Response.json({
        checkout_url: paymentLink.url,
        order_id: internalId,
    });
}