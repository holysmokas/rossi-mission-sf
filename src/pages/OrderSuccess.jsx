import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'

export default function OrderSuccess() {
    const [params] = useSearchParams()
    const orderId = params.get('id')
    const [status, setStatus] = useState('loading') // loading | confirmed | pending | not_found
    const [order, setOrder] = useState(null)

    useEffect(() => {
        if (!orderId) {
            setStatus('not_found')
            return
        }
        let cancelled = false
        let attempts = 0
        const maxAttempts = 10

        async function poll() {
            while (!cancelled && attempts < maxAttempts) {
                attempts++
                try {
                    const resp = await fetch(`/api/orders/${orderId}`)
                    if (resp.ok) {
                        const { data } = await resp.json()
                        if (cancelled) return
                        setOrder(data)
                        if (data?.status === 'paid') {
                            setStatus('confirmed')
                            return
                        }
                    } else if (resp.status === 404) {
                        if (cancelled) return
                        setStatus('not_found')
                        return
                    }
                } catch (e) {
                    // network blip; retry
                }
                // Wait 1.5s then re-poll (webhook may still be processing)
                await new Promise(r => setTimeout(r, 1500))
            }
            if (!cancelled) setStatus('pending')
        }
        poll()
        return () => { cancelled = true }
    }, [orderId])

    return (
        <div style={{
            maxWidth: 560,
            margin: '60px auto',
            padding: '0 20px',
            fontFamily: "'Space Mono', monospace",
            color: 'var(--gray-light, #ddd)',
            textAlign: 'center',
        }}>
            {status === 'loading' && (
                <>
                    <h1 style={{ letterSpacing: '4px', fontWeight: 500, fontSize: '1.4rem' }}>
                        CONFIRMING ORDER…
                    </h1>
                    <p style={{ marginTop: 24, fontSize: '0.8rem', letterSpacing: '2px', opacity: 0.7 }}>
                        One moment while we verify your payment.
                    </p>
                </>
            )}

            {status === 'confirmed' && (
                <>
                    <h1 style={{ letterSpacing: '4px', fontWeight: 500, fontSize: '1.4rem' }}>
                        ORDER CONFIRMED
                    </h1>
                    <p style={{ marginTop: 24, fontSize: '0.85rem', letterSpacing: '2px', lineHeight: 1.8 }}>
                        Thanks for supporting independent art.<br />
                        A confirmation email is on its way.
                    </p>
                    {order?.id && (
                        <p style={{ marginTop: 32, fontSize: '0.7rem', letterSpacing: '2px', opacity: 0.5 }}>
                            ORDER #{order.id.slice(0, 8).toUpperCase()}
                        </p>
                    )}
                    <Link to="/" style={{
                        display: 'inline-block',
                        marginTop: 40,
                        padding: '12px 24px',
                        border: '1px solid var(--gray-mid, #555)',
                        color: 'inherit',
                        textDecoration: 'none',
                        fontSize: '0.7rem',
                        letterSpacing: '3px',
                    }}>
                        CONTINUE SHOPPING
                    </Link>
                </>
            )}

            {status === 'pending' && (
                <>
                    <h1 style={{ letterSpacing: '4px', fontWeight: 500, fontSize: '1.4rem' }}>
                        PAYMENT RECEIVED
                    </h1>
                    <p style={{ marginTop: 24, fontSize: '0.85rem', letterSpacing: '2px', lineHeight: 1.8 }}>
                        Your payment went through. We're processing the confirmation —<br />
                        you'll receive an email shortly.
                    </p>
                    <Link to="/" style={{
                        display: 'inline-block',
                        marginTop: 40,
                        padding: '12px 24px',
                        border: '1px solid var(--gray-mid, #555)',
                        color: 'inherit',
                        textDecoration: 'none',
                        fontSize: '0.7rem',
                        letterSpacing: '3px',
                    }}>
                        CONTINUE SHOPPING
                    </Link>
                </>
            )}

            {status === 'not_found' && (
                <>
                    <h1 style={{ letterSpacing: '4px', fontWeight: 500, fontSize: '1.4rem' }}>
                        ORDER NOT FOUND
                    </h1>
                    <p style={{ marginTop: 24, fontSize: '0.85rem', letterSpacing: '2px', lineHeight: 1.8 }}>
                        If you completed payment, check your email for confirmation.<br />
                        Otherwise, please reach out and we'll sort it out.
                    </p>
                    <Link to="/" style={{
                        display: 'inline-block',
                        marginTop: 40,
                        padding: '12px 24px',
                        border: '1px solid var(--gray-mid, #555)',
                        color: 'inherit',
                        textDecoration: 'none',
                        fontSize: '0.7rem',
                        letterSpacing: '3px',
                    }}>
                        BACK TO STORE
                    </Link>
                </>
            )}
        </div>
    )
}