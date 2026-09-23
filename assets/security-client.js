(() => {
    'use strict';
    const key = 'huyip.webSetupLink';
    let token = '';
    try { token = sessionStorage.getItem(key) || ''; } catch (_) {}
    const fragment = new URLSearchParams(location.hash.slice(1));
    const incoming = fragment.get('huyip_setup');
    if (incoming) {
        token = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(incoming) && incoming.length <= 1024 ? incoming : '';
        try {
            if (token) sessionStorage.setItem(key, token);
            else sessionStorage.removeItem(key);
        } catch (_) {}
        // Remove the private link from the address bar before other page scripts run.
        history.replaceState(null, '', location.pathname + location.search);
    }
    const api = 'https://huyipgithubio-production.up.railway.app';
    async function request(route, signal) {
        const response = await fetch(api + route, {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
            signal, cache: 'no-store'
        });
        const result = await response.json();
        if (!response.ok) {
            const error = new Error('Setup request failed');
            error.linkRequired = response.status === 401;
            throw error;
        }
        if (result.success !== true || typeof result.configured !== 'boolean' ||
            !Number.isFinite(result.expiresAt) || !Number.isFinite(result.serverNow)) {
            throw new Error('Invalid setup response');
        }
        // Use server remaining time; the customer's device clock may be incorrect.
        result.localExpiresAt = result.configured
            ? Date.now() + Math.max(0, Math.min(300000, result.expiresAt - result.serverNow)) : 0;
        return result;
    }
    window.huyipSecurity = {
        hasLink: () => Boolean(token),
        setup: signal => request('/api/security/2fa', signal),
        status: signal => request('/api/security/2fa/status', signal)
    };
})();
