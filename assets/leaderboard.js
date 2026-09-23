(() => {
    'use strict';
    const list = document.getElementById('leaderboardList');
    const time = document.getElementById('leaderboardTime');
    if (!list || !time) return;
    // Simulation only. U888 changes within 91–99%; other gateways stay at or below 84%.
    const names = [
        'U888', 'OPEN88', 'MM88', 'GC88', 'FLY88', 'SC88',
        'ON68', 'CM88', 'LLWIN', 'QH88', 'MB66', '8DAY',
        '78WIN', 'XX88', 'RR88', 'SHBET', 'NEW88', '789BET',
        'C168', 'UU88', 'J88', 'ABC8', '88CLB', 'GG88', 'TT88', 'QQ88'
    ];
    const initialRates = names.map((name, index) => index === 0 ? 98 : Math.max(55, 84 - Math.floor((index - 1) * 1.5)));
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const entries = names.map((name, index) => {
        const row = document.createElement('li');
        row.className = 'leaderboard-row'; row.hidden = index >= 10;
        const parts = ['rank', 'name', 'move', 'value'].map(part => {
            const el = document.createElement(part === 'name' || part === 'value' ? 'strong' : 'span');
            el.className = 'leaderboard-' + part;
            row.appendChild(el);
            return el;
        });
        parts[1].textContent = name;
        // Initial simulated direction is visible immediately, before the first tick.
        const initialUp = index === 0 || index % 3 !== 2;
        parts[2].textContent = initialUp ? '↑' : '↓';
        parts[2].classList.toggle('is-up', initialUp);
        parts[2].classList.toggle('is-down', !initialUp);
        parts[2].setAttribute('aria-label', initialUp ? 'Xu hướng mô phỏng ban đầu: tăng' : 'Xu hướng mô phỏng ban đầu: giảm');
        parts[0].textContent = 'TOP ' + (index + 1);
        parts[3].textContent = initialRates[index] + '%';
        row.classList.toggle('is-first', index === 0);
        list.appendChild(row);
        return { name, row, parts, rate: initialRates[index], rank: index };
    });
    const updateMinutes = 3;
    function updateTime() {
        const start = new Date();
        start.setMinutes(Math.floor(start.getMinutes() / 30) * 30, 0, 0);
        const end = new Date(start.getTime() + 30 * 60 * 1000);
        const format = date => String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
        const dateLabel = String(start.getDate()).padStart(2, '0') + '/' + String(start.getMonth() + 1).padStart(2, '0') + '/' + start.getFullYear();
        const label = 'Ngày ' + dateLabel + ' • Thời gian từ ' + format(start) + ' – ' + format(end);
        if (time.textContent !== label) time.textContent = label;
    }
    let highlightTimer;
    function update() {
        if (document.hidden) return;
        // Update U888 and 2–4 candidates within their separate rate limits.
        const leader = entries.find(entry => entry.name === 'U888');
        const candidates = entries.filter(entry => entry !== leader);
        for (let i = candidates.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
        }
        const entryTop = list.getBoundingClientRect().bottom; const first = new Map(entries.map(entry => [entry, entry.row.hidden ? entryTop : entry.row.getBoundingClientRect().top]));
        const leaderRates = [-3, -2, -1, 1, 2, 3]
            .map(delta => leader.rate + delta)
            .filter(rate => rate >= 91 && rate <= 99);
        const nextLeaderRate = leaderRates[Math.floor(Math.random() * leaderRates.length)];
        const selected = new Set(candidates.slice(0, 2 + Math.floor(Math.random() * 3)));
        const ceiling = 84;
        entries.forEach(entry => {
            const delta = selected.has(entry) ? Math.floor(Math.random() * 7) - 3 : 0;
            // Keep all other gateways strictly below 85%.
            // Since U888 falls by at most 3, this correction also stays within 3 points.
            const next = entry === leader ? nextLeaderRate
                : Math.max(55, Math.min(ceiling, entry.rate + delta));
            entry.parts[3].classList.toggle('is-changed', next !== entry.rate);
            entry.rate = next;
            entry.parts[3].textContent = next + '%';
        });
        entries.sort((a, b) => b.rate - a.rate || a.rank - b.rank);
        entries.forEach((entry, rank) => {
            const direction = Math.sign(entry.rank - rank);
            entry.parts[0].textContent = 'TOP ' + (rank + 1);
            // Keep the last movement visible through unchanged ranks and later ticks.
            if (direction !== 0) {
                entry.parts[2].textContent = direction > 0 ? '↑' : '↓';
                entry.parts[2].classList.toggle('is-up', direction > 0);
                entry.parts[2].classList.toggle('is-down', direction < 0);
                entry.parts[2].setAttribute('aria-label', direction > 0 ? 'Lần đổi hạng gần nhất: tăng hạng' : 'Lần đổi hạng gần nhất: giảm hạng');
            }
            entry.row.classList.toggle('is-first', rank === 0);
            entry.rank = rank; entry.row.hidden = rank >= 10;
            // FLIP: reorder the same nodes, measure Last, then Invert and Play.
            list.appendChild(entry.row);
        });
        const offsets = entries.map(entry => first.get(entry) - entry.row.getBoundingClientRect().top);
        entries.forEach((entry, index) => {
            if (!entry.row.hidden && offsets[index] && !reducedMotion.matches && entry.row.animate) {
                entry.row.animate([
                    { transform: 'translateY(' + offsets[index] + 'px)' },
                    { transform: 'translateY(0)' }
                ], { duration: 700, easing: 'cubic-bezier(.22,1,.36,1)' });
            }
        });
        clearTimeout(highlightTimer);
        highlightTimer = setTimeout(() => entries.forEach(entry => {
            entry.parts[3].classList.remove('is-changed');
        }), 2200);
    }
    updateTime();
    setInterval(updateTime, 1000);
    setInterval(update, updateMinutes * 60 * 1000);
    document.addEventListener('visibilitychange', updateTime);
})();