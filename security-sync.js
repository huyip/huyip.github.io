'use strict';
// Website setup acknowledgement, not verification of a gaming account's 2FA.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const DURATION = 300000;
function digest(secret, text) {
    return crypto.createHmac('sha256', secret).update(text).digest('base64url');
}
function equal(a, b) {
    return typeof a === 'string' && typeof b === 'string' &&
        Buffer.byteLength(a) === Buffer.byteLength(b) &&
        crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
function createSecurityStore({ secret, file, clock = Date.now }) {
    if (typeof secret !== 'string' || secret.length < 32) throw Error('SECURITY_SYNC_SECRET must contain at least 32 characters');
    // Fail startup on corrupted state instead of silently resetting active sessions.
    let state = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { sessions: {}, users: {} };
    if (!state.sessions || !state.users) throw Error('Invalid security state');
    function save(next) {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        const tmp = file + '.tmp';
        fs.writeFileSync(tmp, JSON.stringify(next), { mode: 0o600 });
        fs.renameSync(tmp, file);
        state = next;
    }
    function verify(token, allowExpired = false) {
        if (typeof token !== 'string' || token.length > 1024) return null;
        const parts = token.split('.');
        if (parts.length !== 2 || !equal(digest(secret, 'huyip-web-setup-v1:' + parts[0]), parts[1])) return null;
        try {
            const data = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
            const now = clock();
            if (!Number.isSafeInteger(data.uid) || data.uid <= 0 ||
                !Number.isSafeInteger(data.exp) || (allowExpired ? data.exp + DURATION <= now : data.exp <= now) || data.exp > now + 600000 ||
                !/^[a-f0-9]{32}$/.test(data.nonce)) return null;
            return { ...data, key: crypto.createHash('sha256').update(token).digest('hex') };
        } catch (_) { return null; }
    }
    function status(userId) {
        const expiry = state.users[String(userId)] || 0;
        return { success: true, configured: expiry > clock(), expiresAt: expiry > clock() ? expiry : 0 };
    }
    function setup(token) {
        const data = verify(token);
        if (!data) return null;
        const prior = state.sessions[data.key];
        if (prior && prior.expiresAt > clock()) return { success: true, configured: true, expiresAt: prior.expiresAt };
        const now = clock();
        // A second browser/link during the active period must not extend it.
        const active = status(data.uid);
        const expiresAt = active.configured ? active.expiresAt : now + DURATION;
        const next = { sessions: {}, users: {} };
        for (const [key, value] of Object.entries(state.sessions)) if (value.tokenExpiresAt > now || value.expiresAt > now) next.sessions[key] = value;
        for (const [key, value] of Object.entries(state.users)) if (value > now) next.users[key] = value;
        next.sessions[data.key] = { expiresAt, tokenExpiresAt: data.exp };
        next.users[String(data.uid)] = expiresAt;
        save(next);
        return { success: true, configured: true, expiresAt };
    }
    function browserStatus(token) {
        const data = verify(token, true);
        if (!data) return null;
        const session = state.sessions[data.key];
        return { success: true, configured: Boolean(session && session.expiresAt > clock()), expiresAt: session ? session.expiresAt : 0 };
    }
    return { setup, browserStatus, status };
}
function installSecurityRoutes(app, env = process.env) {
    const secret = env.SECURITY_SYNC_SECRET || '';
    const store = secret.length >= 32 ? createSecurityStore({
        secret, file: env.SECURITY_STATE_FILE || path.join(__dirname, 'data', 'security-state.json')
    }) : null;
    const unavailable = res => res.status(503).json({ success: false, error: 'SYNC_NOT_CONFIGURED' });
    const token = req => {
        const auth = req.get('authorization') || '';
        return auth.startsWith('Bearer ') ? auth.slice(7) : '';
    };
    for (const [route, action] of [
        ['/api/security/2fa', 'setup'],
        ['/api/security/2fa/status', 'browserStatus']
    ]) app.post(route, (req, res) => {
        res.set('Cache-Control', 'no-store');
        if (!store) return unavailable(res);
        try {
            const result = store[action](token(req));
            if (!result) return res.status(401).json({ success: false, error: 'LINK_REQUIRED' });
            res.json({ ...result, serverNow: Date.now() });
        } catch (_) {
            res.status(503).json({ success: false, error: 'STATE_UNAVAILABLE' });
        }
    });
    app.post('/api/security/bot-status', (req, res) => {
        res.set('Cache-Control', 'no-store');
        if (!store) return unavailable(res);
        if (!equal(token(req), secret)) return res.status(401).json({ success: false });
        const uid = req.body && req.body.userId;
        if (!Number.isSafeInteger(uid) || uid <= 0) return res.status(400).json({ success: false });
        res.json({ ...store.status(uid), serverNow: Date.now() });
    });
}
module.exports = { createSecurityStore, installSecurityRoutes };
