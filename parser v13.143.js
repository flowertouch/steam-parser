// ==UserScript==
// @name         pars
// @namespace    http://tampermonkey.net/
// @version      13.143
// @description  CS2 profile enhancement with KT patterns, Friend Code, XP charts, Language Selection and Custom Background.
// @author       flowertouch & snek
// @match        *://steamcommunity.com/id/*
// @match        *://steamcommunity.com/profiles/*
// @require      https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @connect      csxp.gg
// @connect      steamcommunity.com
// ==/UserScript==

(function() {
    'use strict';

    // === ЛОКАЛИЗАЦИЯ (RU / EN) ===
    const langConfig = {
        ru: {
            inf: "INFO", exp: "EXP", med: "PINS", banh: "BANS",
            kt: "COMMUNITY BANNED (КТ)", vac: "BANNED", priv: "PRIVATE PROFILE", clean: "CLEAN ACCOUNT",
            loading: "Loading...", fcode: "FRIEND CODE:",
            nodata: "NOT ENOUGH DATA", nobans: "NO BAN HISTORY FOUND", nomedals: "MEDALS NOT FOUND",
            min: "MIN:", max: "MAX:", last: "LAST:",
            total: "Total:", copied: "COPIED!", created: "Создан:", hidden: "Дата скрыта",
            steamLang: "russian", bgLabel: "Background Menu:", reset: "RESET BACKGROUND",
            trans: "TRANSPARENT"
        },
        en: {
            inf: "INFO", exp: "EXP", med: "PINS", banh: "BANS",
            kt: "COMMUNITY BANNED (KT)", vac: "BANNED", priv: "PRIVATE PROFILE", clean: "CLEAN ACCOUNT",
            loading: "Loading...", fcode: "FRIEND CODE:",
            nodata: "NOT ENOUGH DATA", nobans: "NO BAN HISTORY FOUND", nomedals: "MEDALS NOT FOUND",
            min: "MIN:", max: "MAX:", last: "LAST:",
            total: "Total:", copied: "COPIED!", created: "Created:", hidden: "Date hidden",
            steamLang: "english", bgLabel: "Background Menu:", reset: "RESET BACKGROUND",
            trans: "TRANSPARENT"
        }
    };

    const currentLang = GM_getValue('ft_lang', 'ru');
    const t = langConfig[currentLang] || langConfig.ru;

    // === ССЫЛКИ НА ФОНЫ ===
    const bgLinks = {
        anime: "https://images.wallpaperscraft.ru/image/single/devushka_tsvetok_plate_876877_1280x720.jpg",
        japan: "https://images.wallpaperscraft.ru/image/single/pagody_sakury_iaponiia_402453_1280x720.jpg"
    };

    // === ФУНКЦИЯ ПРИМЕНЕНИЯ ФОНА ===
    const applyCustomBg = (url) => {
        const box = document.getElementById('ft-box');
        if (!box) return;

        const isTransparent = GM_getValue('ft_is_trans', false);

        if (isTransparent) {
            box.classList.add('ft-transparent');
            box.style.backgroundImage = 'none';
        } else {
            box.classList.remove('ft-transparent');
            if (url) {
                box.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('${url}')`;
                box.style.backgroundSize = 'cover';
                box.style.backgroundPosition = 'center';
            } else {
                box.style.backgroundImage = 'none';
            }
        }
    };

    const ALNUM = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    function encodeFriendCode(steamID64) {
        try {
            let steamid = BigInt(steamID64);
            let account_id = steamid & 0xFFFFFFFFn;
            let strange = (0x4353474F00000000n | account_id);
            let buffer = new ArrayBuffer(8);
            let view = new DataView(buffer);
            view.setBigUint64(0, strange, true);
            let wordArray = CryptoJS.lib.WordArray.create(buffer);
            let hash = CryptoJS.MD5(wordArray);
            let h = BigInt(hash.words[3] >>> 0);
            h = ((h & 0xFFn) << 24n) | ((h & 0xFF00n) << 8n) | ((h & 0xFF0000n) >> 8n) | (h >> 24n);
            let r = 0n;
            let tempSteamID = steamid;
            for (let i = 0; i < 8; i++) {
                let id_nibble = tempSteamID & 0xFn;
                tempSteamID >>= 4n;
                let hash_bit = (h >> BigInt(i)) & 1n;
                r = (r << 5n) | ((id_nibble << 1n) | hash_bit);
            }
            let out = "";
            let x_buf = new ArrayBuffer(8);
            let x_view = new DataView(x_buf);
            x_view.setBigUint64(0, r, false);
            let x = x_view.getBigUint64(0, true);
            for (let i = 0; i < 13; i++) {
                if (i === 4 || i === 9) out += "-";
                let idx = Number(x & 0x1Fn);
                out += ALNUM[idx];
                x >>= 5n;
            }
            return out.startsWith("AAAA-") ? out.substring(5) : out;
        } catch (e) { return "ERROR"; }
    }

    GM_addStyle(`
        #ft-box {
            background-color: rgba(0, 0, 0, 0.4);
            box-sizing: border-box;
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 10px;
            margin-bottom: 5px;
            width: 100%;
            border-radius: 8px;
            overflow: hidden;
            position: relative;
            display: block;
            transition: background 0.3s, border 0.3s;
        }
        #ft-box.ft-transparent {
            background-color: transparent !important;
            border: none !important;
            box-shadow: none !important;
        }
        .ft-btn { background: rgba(255,255,255,0.1); border: 1px solid #444; color: #ccc; font-size: 8px; cursor: pointer; padding: 2px 6px; border-radius: 3px; text-transform: uppercase; }
        .ft-btn.active { border-color: #4dff4d; color: #4dff4d; background: rgba(77,255,77,0.1); }
        .ft-btn:hover { background: rgba(255,255,255,0.2); }
        .ft-btn-sh { background: rgba(255,255,255,0.05); color: #888; font-size: 10px; text-decoration: none; border-radius: 4px; border: 1px solid #333; padding: 4px; flex: 1; text-align: center; }
        .ft-btn-sh:hover { color: #fff; border-color: #555; }
        .ft-fcode-box { margin-top: 8px; font-size: 10px; color: #aaa; display: flex; align-items: center; gap: 5px; }
        .ft-fcode-val { color: #4dff4d; font-family: monospace; font-size: 11px; background: rgba(0,0,0,0.3); padding: 1px 4px; border-radius: 3px; border: 1px solid rgba(77,255,77,0.2); cursor: pointer; transition: 0.2s; }
        .ft-fcode-val:hover { background: rgba(77,255,77,0.1); }
        .ft-sid-val { cursor: pointer; transition: 0.2s; }
        .ft-sid-val:hover { color: #4dff4d !important; }
        .ft-medal-item { width: 34px; height: 34px; object-fit: contain; border-radius: 4px; background: rgba(0,0,0,0.3); padding: 2px; border: 1px solid transparent; }
        .ft-genuine { border-color: #4dff4d !important; box-shadow: 0 0 5px rgba(77,255,77,0.3); }
        .ft-ban-item { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; padding: 5px 8px; margin-bottom: 4px; display: flex; justify-content: space-between; align-items: center; }
        .ft-ban-date-time { font-size: 9px; color: #888; }
        #ft-chart-box svg { width: 100%; height: 80px; overflow: visible; }
        #ft-chart-box path { fill: none; stroke: #4dff4d; stroke-width: 1.5; }
        #ft-chart-box circle { fill: #4dff4d; cursor: pointer; transition: r 0.2s, fill 0.2s; }
        #ft-chart-box circle:hover { r: 5; fill: #fff; }
        .ft-medals { grid-template-columns: repeat(5, 1fr) !important; gap: 5px !important; }
        .ft-link-footer { color: #555; text-decoration: none; transition: 0.2s; }
        .ft-link-footer:hover { color: #fff; }

        #ft-bg-btn:hover { fill: #fff !important; transform: rotate(15deg); }
        #ft-lang-gear:hover { fill: #fff !important; }
        .ft-lang-opt:hover { background: rgba(255,255,255,0.1); color: #fff !important; }

        .ft-preset-btn { flex: 1; background: #333; border: 1px solid #555; color: #eee; font-size: 9px; padding: 5px; cursor: pointer; border-radius: 3px; text-align: center; transition: 0.2s; }
        .ft-preset-btn:hover { background: #444; border-color: #777; }
        #ft-bg-clear:hover { color: #ff6666 !important; background: rgba(255,51,51,0.1) !important; }
    `);

    const formatBanDate = (dateStr) => {
        const d = isNaN(dateStr) ? new Date(dateStr) : new Date(parseInt(dateStr) * 1000);
        if (isNaN(d.getTime())) return dateStr;
        const locale = currentLang === 'ru' ? 'ru-RU' : 'en-US';
        return d.toLocaleString(locale, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const renderBanHistory = (bans) => {
        const container = document.getElementById('ft-ban-list');
        if (!container) return;
        container.innerHTML = bans.length ? bans.map(b => `
            <div class="ft-ban-item">
                <span style="font-size:10px;color:#eee;">${b.status}</span>
                <time class="ft-ban-date-time">${formatBanDate(b.date)}</time>
            </div>
        `).join('') : `<div style="color:#666;font-size:10px;text-align:center;padding:10px;">${t.nobans}</div>`;
    };

    const fetchExtraFromCSXP = (sid) => {
        GM_xmlhttpRequest({
            method: "GET",
            url: `https://csxp.gg/players/${sid}`,
            onload: (res) => {
                const doc = new DOMParser().parseFromString(res.responseText, 'text/html');
                const canvas = doc.querySelector('canvas[data-points]');
                if (canvas) {
                    try {
                        const allPoints = JSON.parse(canvas.getAttribute('data-points'));
                        const limit = (Date.now() / 1000) - (20 * 24 * 60 * 60);
                        let filteredPoints = allPoints.filter(p => p[0] > limit);
                        if (filteredPoints.length < 2) filteredPoints = allPoints.slice(-20);
                        renderChart(filteredPoints);
                    } catch(e) {}
                }

                const banNodes = doc.querySelectorAll('.space-y-2 div.rounded-lg');
                const bans = [];
                banNodes.forEach(node => {
                    const status = node.querySelector('span')?.innerText;
                    const timeEl = node.querySelector('time');
                    const dateVal = timeEl?.getAttribute('datetime') || timeEl?.getAttribute('data-ts') || timeEl?.innerText;
                    if (status && dateVal && (status.toLowerCase().includes('ban') || status.toLowerCase().includes('блокировка'))) {
                        bans.push({ status, date: dateVal });
                    }
                });
                renderBanHistory(bans);

                const meds = [];
                const links = doc.querySelectorAll('a[href*="/medals/"], a[href*="/pickems/"], a[href*="/operations/"], a[href*="/pins"]');
                links.forEach(link => {
                    const img = link.querySelector('img');
                    if (img) {
                        const name = link.querySelector('.font-semibold')?.innerText || img.alt;
                        const src = img.getAttribute('src');
                        const fullImg = src.startsWith('http') ? src : `https://csxp.gg${src}`;
                        const isGen = link.href.includes('/genuine') || name.toLowerCase().includes('высшей пробы');
                        meds.push({ name, img: fullImg, genuine: isGen });
                    }
                });
                const container = document.querySelector('.ft-medals');
                if (container && container.children.length === 0) renderMedals(meds);
            }
        });
    };

    const renderChart = (points) => {
        const box = document.getElementById('ft-chart-box');
        if (!box || points.length < 2) {
            box.innerHTML = `<span style="font-size:10px;color:#666;">${t.nodata}</span>`;
            return;
        }
        const width = 300, height = 60;
        const levels = points.map(p => p[1]);
        const minL = Math.min(...levels), maxL = Math.max(...levels);
        const diff = (maxL - minL) || 1;
        const coords = points.map((p, i) => {
            const x = (i / (points.length - 1)) * width;
            const y = height - ((p[1] - minL) / diff) * height;
            return { x, y, lvl: Math.floor(p[1]), xp: Math.round((p[1] % 1) * 5000), date: new Date(p[0] * 1000).toLocaleString() };
        });
        const last = coords[coords.length - 1];
        box.innerHTML = `
            <svg viewBox="0 -5 ${width} ${height + 10}">
                <path d="M ${coords.map(c => `${c.x},${c.y}`).join(' L ')}" stroke="#4dff4d" fill="none" stroke-width="1.5" />
                ${coords.map(c => `<circle cx="${c.x}" cy="${c.y}" r="3" fill="#4dff4d"><title>${c.date}\nLevel: ${c.lvl} (${c.xp} XP)</title></circle>`).join('')}
            </svg>
            <div style="display:flex;justify-content:space-between;font-size:9px;color:#555;margin-top:2px;">
                <span>${t.min} ${minL.toFixed(1)}</span>
                <span style="color:#4dff4d; font-weight:bold;">${t.last} ${last.lvl} (${last.xp} XP)</span>
                <span>${t.max} ${maxL.toFixed(1)}</span>
            </div>
        `;
    };

    const renderMedals = (meds) => {
        const container = document.querySelector('.ft-medals');
        if (!container) return;
        container.innerHTML = meds.length ? meds.map(m => `
            <img src="${m.img}" class="ft-medal-item ${m.genuine ? 'ft-genuine' : ''}" title="${m.name}" onerror="this.src='https://community.cloudflare.steamstatic.com/economy/image/fWFc82jsWfmoRAPu609u5A2E6eia6S0Z_R15_D9_B-9m3vS_H-p9v_mXMXvX-98fS_D1tDVfhtXvMv6YCeY_u98_4p8G'">
        `).join('') : `<div style="color:#666;font-size:10px;grid-column:1/-1;text-align:center;padding:10px;">${t.nomedals}</div>`;
        document.getElementById('ft-counter').innerText = meds.length;
    };

    const draw = (sid, status) => {
        if (document.getElementById('ft-box')) return;
        const rightCol = document.querySelector('.profile_rightcol');
        if (!rightCol) return;
        const box = document.createElement('div');
        box.id = 'ft-box';

        let color = status.kt || status.vac ? '#ff4d4d' : (status.priv ? '#ffb84d' : '#4dff4d');
        let label = status.kt ? t.kt : (status.vac ? t.vac : (status.priv ? t.priv : t.clean));

        const fcode = encodeFriendCode(sid);
        const isCollapsed = GM_getValue('ft_collapsed', false);

        box.innerHTML = `
            <div style="font-size:9px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center; position:relative; z-index:2;">
                <span id="ft-copy-sid" class="ft-sid-val" style="font-weight:bold; color:#aaa; margin-right: 15px;">${sid}</span>
                <div style="display:flex; gap:3px;">
                    <button id="ft-btn-info" class="ft-btn active">${t.inf}</button>
                    <button id="ft-btn-exp" class="ft-btn">${t.exp}</button>
                    <button id="ft-btn-meds" class="ft-btn">${t.med}</button>
                    <button id="ft-btn-banh" class="ft-btn">${t.banh}</button>
                    <span id="ft-toggle" style="cursor:pointer; padding:0 5px; font-size:7px; opacity: 0.8; display:flex; align-items:center;">${isCollapsed ? '+' : '—'}</span>
                </div>
            </div>
            <div id="ft-content" style="display: ${isCollapsed ? 'none' : 'block'}; position:relative; z-index:2;">
                <div id="ft-status-banner" style="background:rgba(255,255,255,0.03);padding:4px 8px;border-left:4px solid ${color};margin-bottom:8px; border-radius:0 4px 4px 0;">
                    <b style="color:${color};text-transform:uppercase;font-size:9.5px;">${label}</b>
                </div>
                <div id="ft-extra-info">
                    <div id="ft-acc-creation" style="font-size:11px; color:#4dff4d; font-weight:bold;">${t.loading}</div>
                    <div class="ft-fcode-box">${t.fcode} <span id="ft-copy-code" class="ft-fcode-val">${fcode}</span></div>
                    <div style="display:flex; gap:5px; margin-top:10px;">
                        <a href="https://steamid.uk/profile/${sid}" target="_blank" class="ft-btn-sh">steamid.uk</a>
                        <a href="https://csst.at/profile/${sid}" target="_blank" class="ft-btn-sh">rip cs stats</a>
                    </div>
                </div>
                <div id="ft-exp-content" style="display:none; margin-top:10px;">
                    <div id="ft-chart-box">${t.loading}</div>
                </div>
                <div id="ft-banh-content" style="display:none; margin-top:10px; max-height:150px; overflow-y:auto;">
                    <div id="ft-ban-list">${t.loading}</div>
                </div>
                <div class="ft-medals" style="display:none; grid-template-columns: repeat(5, 1fr); gap:5px; margin-top:10px; max-height:200px; overflow-y:auto;"></div>

                <div style="margin-top:10px; border-top:1px solid rgba(255,255,255,0.1); padding-top:6px; display:flex; justify-content:space-between; font-size:9px;">
                    <div style="position:relative; display:flex; align-items:center; gap:8px;">
                        <span style="color:#ffca0a; margin-right:2px;">${t.total} <span id="ft-counter">0</span></span>
                        <svg id="ft-bg-btn" style="width:14px;height:14px;cursor:pointer;fill:#888;transition:transform 0.3s;" viewBox="0 0 24 24"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg>
                        <svg id="ft-lang-gear" style="width:14px;height:14px;cursor:pointer;fill:#888;transition:fill 0.3s;" viewBox="0 0 24 24"><path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/></svg>

                        <div id="ft-lang-menu" style="display:none; position:absolute; bottom:20px; left:40px; background:rgba(20,20,20,0.95); border:1px solid #444; border-radius:4px; padding:4px; z-index:999;">
                            <div class="ft-lang-opt" data-lang="ru" style="padding:4px 8px; cursor:pointer; font-size:10px; border-radius:3px; color:${currentLang === 'ru' ? '#4dff4d' : '#ccc'}; font-weight:${currentLang === 'ru' ? 'bold' : 'normal'};">🇷🇺 RU</div>
                            <div class="ft-lang-opt" data-lang="en" style="padding:4px 8px; cursor:pointer; font-size:10px; border-radius:3px; color:${currentLang === 'en' ? '#4dff4d' : '#ccc'}; font-weight:${currentLang === 'en' ? 'bold' : 'normal'};">🇬🇧 EN</div>
                        </div>

                        <div id="ft-bg-menu" style="display:none; position:absolute; bottom:25px; left:0px; background:rgba(20,20,20,0.95); border:1px solid #444; border-radius:4px; padding:8px; z-index:999; width: 180px; box-shadow: 0 4px 6px rgba(0,0,0,0.5);">
                            <div style="font-size:10px; color:#ccc; margin-bottom:8px; text-align: center; border-bottom: 1px solid #333; padding-bottom: 4px;">${t.bgLabel}</div>
                            <div style="display:flex; flex-direction:column; gap:6px;">
                                <div style="display:flex; gap:5px;">
                                    <div class="ft-preset-btn" id="ft-bg-anime">ANIME</div>
                                    <div class="ft-preset-btn" id="ft-bg-japan">JAPAN</div>
                                </div>
                                <div style="display:flex; gap:5px;">
                                    <div class="ft-preset-btn" id="ft-bg-trans">${t.trans}</div>
                                </div>
                                <div id="ft-bg-clear" style="color:#ff3333; cursor:pointer; font-weight:bold; font-size:10px; text-align:center; padding:4px; border-radius:3px; background: rgba(255,51,51,0.05); transition:0.2s;">${t.reset}</div>
                            </div>
                        </div>
                    </div>
                    <span style="color:#555;">by <a href="https://steamcommunity.com/id/413/" target="_blank" class="ft-link-footer">flowertouch</a> & <a href="https://steamcommunity.com/id/luapaster" target="_blank" class="ft-link-footer">snek</a></span>
                </div>
            </div>`;
        rightCol.insertBefore(box, rightCol.firstChild);

        applyCustomBg(GM_getValue('ft_custom_bg_menu', ''));

        const bgBtn = document.getElementById('ft-bg-btn');
        const bgMenu = document.getElementById('ft-bg-menu');
        const bgAnime = document.getElementById('ft-bg-anime');
        const bgJapan = document.getElementById('ft-bg-japan');
        const bgTrans = document.getElementById('ft-bg-trans');
        const bgClear = document.getElementById('ft-bg-clear');
        const gearIcon = document.getElementById('ft-lang-gear');
        const langMenu = document.getElementById('ft-lang-menu');

        bgBtn.onclick = (e) => {
            e.stopPropagation();
            bgMenu.style.display = bgMenu.style.display === 'block' ? 'none' : 'block';
            if (langMenu) langMenu.style.display = 'none';
        };

        bgAnime.onclick = (e) => {
            e.stopPropagation();
            GM_setValue('ft_is_trans', false);
            GM_setValue('ft_custom_bg_menu', bgLinks.anime);
            applyCustomBg(bgLinks.anime);
        };

        bgJapan.onclick = (e) => {
            e.stopPropagation();
            GM_setValue('ft_is_trans', false);
            GM_setValue('ft_custom_bg_menu', bgLinks.japan);
            applyCustomBg(bgLinks.japan);
        };

        bgTrans.onclick = (e) => {
            e.stopPropagation();
            GM_setValue('ft_is_trans', true);
            GM_setValue('ft_custom_bg_menu', '');
            applyCustomBg('');
        };

        bgClear.onclick = (e) => {
            e.stopPropagation();
            GM_setValue('ft_is_trans', false);
            GM_setValue('ft_custom_bg_menu', '');
            applyCustomBg('');
        };

        gearIcon.onclick = function(e) {
            e.stopPropagation();
            langMenu.style.display = langMenu.style.display === 'none' ? 'block' : 'none';
            if (bgMenu) bgMenu.style.display = 'none';
        };

        document.addEventListener('click', function(event) {
            if (langMenu && !langMenu.contains(event.target)) langMenu.style.display = 'none';
            if (bgMenu && !bgMenu.contains(event.target)) bgMenu.style.display = 'none';
        });

        document.querySelectorAll('.ft-lang-opt').forEach(opt => {
            opt.onclick = function(e) {
                e.stopPropagation();
                GM_setValue('ft_lang', this.getAttribute('data-lang'));
                window.location.reload();
            };
        });

        document.getElementById('ft-copy-sid').onclick = function() {
            navigator.clipboard.writeText(sid);
            const oldText = this.innerText;
            this.innerText = t.copied;
            setTimeout(() => this.innerText = oldText, 1000);
        };

        document.getElementById('ft-copy-code').onclick = function() {
            navigator.clipboard.writeText(fcode);
            const oldText = this.innerText;
            this.innerText = t.copied;
            setTimeout(() => this.innerText = oldText, 1000);
        };

        const toggleTab = (mode) => {
            const statusBanner = document.getElementById('ft-status-banner');
            if (statusBanner) statusBanner.style.display = mode === 'info' ? 'block' : 'none';

            document.getElementById('ft-extra-info').style.display = mode === 'info' ? 'block' : 'none';
            document.getElementById('ft-exp-content').style.display = mode === 'exp' ? 'block' : 'none';
            document.getElementById('ft-btn-info').classList.toggle('active', mode === 'info');
            document.getElementById('ft-btn-exp').classList.toggle('active', mode === 'exp');
            document.getElementById('ft-btn-meds').classList.toggle('active', mode === 'meds');
            document.getElementById('ft-btn-banh').classList.toggle('active', mode === 'banh');
            document.getElementById('ft-banh-content').style.display = mode === 'banh' ? 'block' : 'none';
            document.querySelector('.ft-medals').style.display = mode === 'meds' ? 'grid' : 'none';
        };

        document.getElementById('ft-btn-info').onclick = () => toggleTab('info');
        document.getElementById('ft-btn-exp').onclick = () => toggleTab('exp');
        document.getElementById('ft-btn-meds').onclick = () => toggleTab('meds');
        document.getElementById('ft-btn-banh').onclick = () => toggleTab('banh');

        document.getElementById('ft-toggle').onclick = () => {
            const c = document.getElementById('ft-content'), h = c.style.display === 'none';
            c.style.display = h ? 'block' : 'none';
            document.getElementById('ft-toggle').innerText = h ? '—' : '+';
            GM_setValue('ft_collapsed', !h);
        };

        GM_xmlhttpRequest({
            method: "GET",
            url: `${window.location.origin}${window.location.pathname}/badges/1?l=${t.steamLang}`,
            onload: (res) => {
                const match = res.responseText.match(/(?:Дата регистрации|Date registered|Member since):?\s*([^<"'>\)]+)/i);
                document.getElementById('ft-acc-creation').innerText = match ? `${t.created} ${match[1].trim()}` : t.hidden;
            }
        });
    };

    const run = () => {
        const sid = window.g_rgProfileData?.steamid || document.documentElement.innerHTML.match(/"steamid":"(\d+)"/)?.[1];
        if (!sid) return;

        const nameText = document.querySelector('.actual_persona_name')?.innerText.trim();
        const privateDiv = document.querySelector('.profile_private_info');
        let isHiddenKT = false;
        let isStandardPrivate = false;

        if (privateDiv) {
            const text = privateDiv.textContent.toLowerCase();
            if (text.includes('профиль скрыт') || text.includes('profile is private')) {
                isStandardPrivate = true;
            } else {
                isHiddenKT = true;
            }
        }

        const isKT = document.documentElement.innerHTML.includes('profile_ban_community') ||
                     (nameText === sid) ||
                     (document.querySelector('.profile_ban_status') &&
                      (document.documentElement.innerHTML.includes('Блокировка в сообществе') ||
                       document.documentElement.innerHTML.includes('Community Banned'))) ||
                     isHiddenKT;

        draw(sid, {
            vac: document.documentElement.innerHTML.includes('profile_ban_status'),
            kt: isKT,
            priv: isStandardPrivate
        });

        fetchExtraFromCSXP(sid);

        GM_xmlhttpRequest({
            method: "GET",
            url: `https://steamcommunity.com/inventory/${sid}/730/2?l=${t.steamLang}&count=2000`,
            onload: (res) => {
                try {
                    const data = JSON.parse(res.responseText);
                    if (data?.descriptions) {
                        const meds = data.descriptions
                            .filter(x => x.tags?.some(t => t.internal_name === "CSGO_Type_Collectible"))
                            .map(m => ({
                                name: m.name,
                                img: `https://community.cloudflare.steamstatic.com/economy/image/${m.icon_url}`,
                                genuine: m.name.toLowerCase().includes('высшей пробы') || m.name_color === "4dff4d"
                            }));
                        if (meds.length > 0) renderMedals(meds);
                    }
                } catch(e) {}
            }
        });
    };

    setTimeout(run, 500);
})();