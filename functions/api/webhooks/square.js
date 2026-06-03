const SQUARE_API_VERSION = '2025-06-18';
const MAX_CLAIM_ATTEMPTS = 4;
const CLAIM_RETRY_DELAY_MS = 3000;

function squareBase(env) {
    return env.SQUARE_ENVIRONMENT === 'sandbox'
        ? 'https://connect.squareupsandbox.com'
        : 'https://connect.squareup.com';
}

function nowSecs() {
    return Math.floor(Date.now() / 1000);
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function verifySignature(request, rawBody, signatureKey) {
    const sig = request.headers.get('x-square-hmacsha256-signature');
    if (!sig) return false;
    const url = request.url;
    const message = url + rawBody;
    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(signatureKey),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const macBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
    const macB64 = btoa(String.fromCharCode(...new Uint8Array(macBuf)));
    if (macB64.length !== sig.length) return false;
    let diff = 0;
    for (let i = 0; i < macB64.length; i++) diff |= macB64.charCodeAt(i) ^ sig.charCodeAt(i);
    return diff === 0;
}

async function decrementInventory(env, items) {
    for (const it of items) {
        if (!it.product_id) continue;
        const res = await env.DB.prepare(
            `UPDATE products
         SET quantity = quantity - ?,
             updated_at = unixepoch()
       WHERE id = ?
         AND quantity >= ?`
        ).bind(it.quantity, it.product_id, it.quantity).run();
        if (res.meta.changes === 0) {
            console.warn(`inventory: could not decrement ${it.product_id} by ${it.quantity}`);
        }
        try {
            await env.DB.prepare(
                `INSERT INTO inventory_log
           (product_id, product_name, change_type, change_amount, note, order_id)
         VALUES (?, ?, 'sale', ?, ?, ?)`
            ).bind(it.product_id, it.name, -it.quantity, 'square checkout', null).run();
        } catch (e) {
            console.error('inventory_log insert failed', e.message);
        }
    }
}

async function fetchSquareOrder(env, squareOrderId) {
    try {
        const resp = await fetch(`${squareBase(env)}/v2/orders/${squareOrderId}`, {
            headers: {
                'Square-Version': SQUARE_API_VERSION,
                Authorization: `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
            },
        });
        if (!resp.ok) return null;
        const j = await resp.json();
        return j.order || null;
    } catch (e) {
        console.error('fetchSquareOrder failed', e.message);
        return null;
    }
}

async function fetchSquareCustomer(env, customerId) {
    try {
        const resp = await fetch(`${squareBase(env)}/v2/customers/${customerId}`, {
            headers: {
                'Square-Version': SQUARE_API_VERSION,
                Authorization: `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
            },
        });
        if (!resp.ok) return null;
        const j = await resp.json();
        return j.customer || null;
    } catch (e) {
        console.error('fetchSquareCustomer failed', e.message);
        return null;
    }
}

function addressFromSquare(a) {
    if (!a) return null;
    return {
        line1: a.address_line_1 || null,
        line2: a.address_line_2 || null,
        city: a.locality || null,
        state: a.administrative_district_level_1 || null,
        zip: a.postal_code || null,
        country: a.country || null,
    };
}

function nameFromAddress(a) {
    if (!a) return null;
    const parts = [a.first_name, a.last_name].filter(Boolean);
    return parts.length ? parts.join(' ') : null;
}

async function enrichCustomerInfo(env, payment, squareOrderId) {
    let name = null;
    let email = payment.buyer_email_address || null;
    let shipping = null;

    if (payment.shipping_address) {
        shipping = addressFromSquare(payment.shipping_address);
        name = nameFromAddress(payment.shipping_address);
    }

    if (!name || !email || !shipping) {
        const sqOrder = await fetchSquareOrder(env, squareOrderId);
        const recipient = sqOrder?.fulfillments?.[0]?.shipment_details?.recipient;
        if (recipient) {
            name = name || recipient.display_name || null;
            email = email || recipient.email_address || null;
            shipping = shipping || addressFromSquare(recipient.address);
        }
    }

    if ((!name || !email) && payment.customer_id) {
        const customer = await fetchSquareCustomer(env, payment.customer_id);
        if (customer) {
            email = email || customer.email_address || null;
            const fullName = [customer.given_name, customer.family_name].filter(Boolean).join(' ');
            name = name || fullName || null;
        }
    }

    console.log('WEBHOOK_ENRICH', JSON.stringify({ name, email, hasShipping: !!shipping }));
    return { name, email, shipping };
}

function itemsFromSquareOrder(sqOrder) {
    if (!sqOrder?.line_items) return [];
    return sqOrder.line_items.map((li) => ({
        name: li.name || 'Item',
        quantity: parseInt(li.quantity || '1', 10),
        price: li.base_price_money ? li.base_price_money.amount / 100 : 0,
        total_cents: li.total_money?.amount || 0,
        square_uid: li.uid || null,
    }));
}

async function captureInStoreSale(env, payment, squareOrderId) {
    const sqOrder = await fetchSquareOrder(env, squareOrderId);
    if (!sqOrder) {
        console.error(`webhook: in-store fetch failed for ${squareOrderId}`);
        return false;
    }

    const items = itemsFromSquareOrder(sqOrder);
    const totalCents = sqOrder.total_money?.amount || payment.total_money?.amount || 0;

    let customerName = null;
    let customerEmail = payment.buyer_email_address || null;
    if (payment.customer_id) {
        const customer = await fetchSquareCustomer(env, payment.customer_id);
        if (customer) {
            customerEmail = customerEmail || customer.email_address || null;
            const fullName = [customer.given_name, customer.family_name].filter(Boolean).join(' ');
            customerName = fullName || null;
        }
    }

    const id = crypto.randomUUID();
    try {
        await env.DB.prepare(
            `INSERT INTO orders
         (id, square_order_id, square_payment_id, square_receipt_url,
          status, source, total_cents, items, notified, paid_at,
          customer_name, customer_email)
       VALUES (?, ?, ?, ?, 'paid', 'in_store', ?, ?, 1, ?, ?, ?)`
        ).bind(
            id,
            squareOrderId,
            payment.id,
            payment.receipt_url || null,
            totalCents,
            JSON.stringify(items),
            nowSecs(),
            customerName,
            customerEmail
        ).run();
        console.log(`webhook: captured in-store sale ${id} ($${(totalCents / 100).toFixed(2)})`);
        return true;
    } catch (err) {
        console.error('webhook: in-store insert failed', err.message);
        return false;
    }
}

export async function onRequestPost({ request, env }) {
    const rawBody = await request.text();

    const valid = await verifySignature(request, rawBody, env.SQUARE_WEBHOOK_SIGNATURE_KEY);
    if (!valid) {
        console.warn('square webhook: bad signature');
        return new Response('invalid signature', { status: 401 });
    }

    let event;
    try { event = JSON.parse(rawBody); } catch {
        return new Response('invalid JSON', { status: 400 });
    }

    if (event.type !== 'payment.updated' && event.type !== 'payment.created') {
        return new Response('ok', { status: 200 });
    }
    const payment = event?.data?.object?.payment;
    if (!payment) return new Response('no payment in event', { status: 200 });
    if (payment.status !== 'COMPLETED') return new Response('ok', { status: 200 });

    const squareOrderId = payment.order_id;
    if (!squareOrderId) return new Response('no order_id', { status: 200 });

    let claimedRow = null;
    for (let attempt = 1; attempt <= MAX_CLAIM_ATTEMPTS; attempt++) {
        const res = await env.DB.prepare(
            `UPDATE orders
         SET notified = 1,
             status = 'paid',
             square_payment_id = ?,
             square_receipt_url = ?,
             paid_at = ?
       WHERE square_order_id = ?
         AND notified = 0
       RETURNING *`
        ).bind(
            payment.id,
            payment.receipt_url || null,
            nowSecs(),
            squareOrderId
        ).all();

        if (res.results && res.results.length) {
            claimedRow = res.results[0];
            break;
        }

        const existing = await env.DB.prepare(
            `SELECT id, notified FROM orders WHERE square_order_id = ?`
        ).bind(squareOrderId).first();

        if (existing) {
            return new Response('already processed', { status: 200 });
        }

        if (attempt < MAX_CLAIM_ATTEMPTS) {
            console.log(`webhook: order ${squareOrderId} not yet in D1, retry ${attempt}`);
            await sleep(CLAIM_RETRY_DELAY_MS);
        }
    }

    if (!claimedRow) {
        console.log(`webhook: no online order match for ${squareOrderId} after ${MAX_CLAIM_ATTEMPTS} attempts, capturing as in-store`);
        await captureInStoreSale(env, payment, squareOrderId);
        return new Response('ok', { status: 200 });
    }

    let items = [];
    try { items = JSON.parse(claimedRow.items || '[]'); } catch { }

    const { name: customerName, email: customerEmail, shipping } =
        await enrichCustomerInfo(env, payment, squareOrderId);

    await env.DB.prepare(
        `UPDATE orders
       SET customer_name = COALESCE(?, customer_name),
           customer_email = COALESCE(?, customer_email),
           shipping_address = COALESCE(?, shipping_address)
     WHERE id = ?`
    ).bind(
        customerName,
        customerEmail,
        shipping ? JSON.stringify(shipping) : null,
        claimedRow.id
    ).run();

    await decrementInventory(env, items);

    return new Response('ok', { status: 200 });
}