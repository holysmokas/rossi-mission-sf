const PBKDF2_ITERATIONS = 100000;

function b64encode(bytes) {
    return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

function b64decode(s) {
    const bin = atob(s);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
}

function b64urlEncode(bytes) {
    return b64encode(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return b64decode(s);
}

export async function hashPassword(password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const passKey = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
    );
    const hashBits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
        passKey,
        256
    );
    return `pbkdf2$${PBKDF2_ITERATIONS}$${b64encode(salt)}$${b64encode(hashBits)}`;
}

export async function verifyPassword(password, stored) {
    if (!stored?.startsWith('pbkdf2$')) return false;
    const parts = stored.split('$');
    if (parts.length !== 4) return false;
    const iterations = parseInt(parts[1], 10);
    const salt = b64decode(parts[2]);
    const expectedHash = parts[3];

    const passKey = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
    );
    const hashBits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
        passKey,
        256
    );
    const computedHash = b64encode(hashBits);

    if (computedHash.length !== expectedHash.length) return false;
    let diff = 0;
    for (let i = 0; i < computedHash.length; i++) {
        diff |= computedHash.charCodeAt(i) ^ expectedHash.charCodeAt(i);
    }
    return diff === 0;
}

export async function signJWT(payload, secret, expiresInSecs = 86400) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const body = { ...payload, iat: now, exp: now + expiresInSecs };
    const encodedHeader = b64urlEncode(new TextEncoder().encode(JSON.stringify(header)));
    const encodedPayload = b64urlEncode(new TextEncoder().encode(JSON.stringify(body)));
    const message = `${encodedHeader}.${encodedPayload}`;
    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
    const sig = b64urlEncode(new Uint8Array(sigBuf));
    return `${message}.${sig}`;
}

export async function verifyJWT(token, secret) {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [encodedHeader, encodedPayload, sig] = parts;
    const message = `${encodedHeader}.${encodedPayload}`;
    try {
        const key = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['verify']
        );
        const sigBytes = b64urlDecode(sig);
        const valid = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(message));
        if (!valid) return null;
        const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(encodedPayload)));
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
        return payload;
    } catch {
        return null;
    }
}

export function parseCookie(header, name) {
    if (!header) return null;
    const parts = header.split(/;\s*/);
    for (const part of parts) {
        const eq = part.indexOf('=');
        if (eq === -1) continue;
        if (part.substring(0, eq) === name) {
            return decodeURIComponent(part.substring(eq + 1));
        }
    }
    return null;
}

export function sessionCookie(token, maxAgeSecs = 86400) {
    return `admin_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAgeSecs}`;
}

export function clearSessionCookie() {
    return `admin_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}