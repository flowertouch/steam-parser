// ==UserScript==
// @name         pars_fixed_full
// @namespace    http://tampermonkey.net/
// @version      13.179
// @description  Full CS2 enhancement: Fixed Friend Code, Inventory-based KT check, XP Charts, and Custom Backgrounds.
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
// @connect      steamtrades.com
// ==/UserScript==

(function() {
    'use strict';

    // === ЛОКАЛИЗАЦИЯ (RU / EN) ===
    const langConfig = {
        ru: {
            inf: "INFO", exp: "EXP", med: "PINS", banh: "BANS", con: "CON",
            kt: "COMMUNITY BANNED (КТ)", vac: "BANNED", priv: "PRIVATE PROFILE", clean: "CLEAN ACCOUNT",
            loading: "Loading...", fcode: "FRIEND CODE:",
            nodata: "NOT ENOUGH DATA", nobans: "NO BAN HISTORY FOUND", nomedals: "MEDALS NOT FOUND",
            min: "MIN:", max: "MAX:", last: "LAST:", lvl: "LVL:", curlvl: "ТЕКУЩИЙ УРОВЕНЬ",
            total: "Total:", copied: "COPIED!", created: "Создан:", hidden: "Дата скрыта",
            steamLang: "russian", bgLabel: "Background Menu:", reset: "RESET BACKGROUND",
            trans: "TRANSPARENT", contactsText: "Contacts for communication:"
        },
        en: {
            inf: "INFO", exp: "EXP", med: "PINS", banh: "BANS", con: "CON",
            kt: "COMMUNITY BANNED (KT)", vac: "BANNED", priv: "PRIVATE PROFILE", clean: "CLEAN ACCOUNT",
            loading: "Loading...", fcode: "FRIEND CODE:",
            nodata: "NOT ENOUGH DATA", nobans: "NO BAN HISTORY FOUND", nomedals: "MEDALS NOT FOUND",
            min: "MIN:", max: "MAX:", last: "LAST:", lvl: "LVL:", curlvl: "CURRENT LEVEL",
            total: "Total:", copied: "COPIED!", created: "Created:", hidden: "Date hidden",
            steamLang: "english", bgLabel: "Background Menu:", reset: "RESET BACKGROUND",
            trans: "TRANSPARENT", contactsText: "Contacts for communication:"
        }
    };

    const currentLang = GM_getValue('ft_lang', 'ru');
    const t = langConfig[currentLang] || langConfig.ru;

    // === ССЫЛКИ НА ФОНЫ ===
    const bgLinks = {
        anime: "https://images.wallpaperscraft.ru/image/single/devushka_tsvetok_plate_876877_1280x720.jpg",
        japan: "https://images.wallpaperscraft.ru/image/single/pagody_sakury_iaponiia_402453_1280x720.jpg"
    };

    // Подсветка активного пресета фона в меню
    const markBgActive = () => {
        const isTrans = GM_getValue('ft_is_trans', false);
        const cur = GM_getValue('ft_custom_bg_menu', '');
        const map = { 'ft-bg-anime': !isTrans && cur === bgLinks.anime, 'ft-bg-japan': !isTrans && cur === bgLinks.japan, 'ft-bg-trans': isTrans };
        Object.keys(map).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.toggle('ft-active', !!map[id]);
        });
    };

    // === ФУНКЦИЯ ПРИМЕНЕНИЯ ФОНА ===
    const applyCustomBg = (url) => {
        const box = document.getElementById('ft-box');
        if (!box) return;
        markBgActive();

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

    // === ФОРМУЛА КОДА ДРУЖБЫ ===
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

            let h = BigInt(hash.words[0] >>> 0);

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

    // === ИКОНКИ ВКЛАДОК (monochrome inline SVG, красятся через currentColor) ===
    const ftIcons = {
        info: '<svg viewBox="0 0 12 12" width="10" height="10"><circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="6" cy="3.6" r="0.9" fill="currentColor"/><rect x="5.3" y="5.3" width="1.4" height="4" rx="0.5" fill="currentColor"/></svg>',
        exp: '<svg viewBox="0 0 12 12" width="10" height="10"><rect x="1" y="7" width="2" height="4" rx="0.4" fill="currentColor"/><rect x="5" y="4" width="2" height="7" rx="0.4" fill="currentColor"/><rect x="9" y="1.5" width="2" height="9.5" rx="0.4" fill="currentColor"/></svg>',
        meds: '<svg viewBox="0 0 12 12" width="10" height="10"><path d="M6 0.5 L7.3 4.1 L11.2 4.1 L8.1 6.5 L9.3 10.3 L6 8 L2.7 10.3 L3.9 6.5 L0.8 4.1 L4.7 4.1 Z" fill="currentColor"/></svg>',
        banh: '<svg viewBox="0 0 12 12" width="10" height="10"><path d="M6 0.6 L10.6 2.1 V5.6 C10.6 8.4 8.6 10.4 6 11.4 C3.4 10.4 1.4 8.4 1.4 5.6 V2.1 Z" fill="none" stroke="currentColor" stroke-width="1.2"/><line x1="4.3" y1="5" x2="7.7" y2="8" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/><line x1="7.7" y1="5" x2="4.3" y2="8" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/></svg>',
        con: '<svg viewBox="0 0 12 12" width="10" height="10"><rect x="0.8" y="1.6" width="10.4" height="7.4" rx="1.4" fill="none" stroke="currentColor" stroke-width="1.1"/><path d="M1.2 2.2 L6 6 L10.8 2.2" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        ext: '<svg viewBox="0 0 10 10" width="8" height="8"><path d="M2 8 L8 2 M4 2 H8 V6" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    };

    const phoenixSvg = 'data:image/png;base64,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';

    GM_addStyle(`
        #ft-pin-btn { width:14px; height:14px; cursor:pointer; border-radius:50%; opacity:0.6; transition: transform 0.3s ease, opacity 0.3s ease; }
        #ft-pin-btn:hover { opacity:1; transform: scale(1.2) rotate(-8deg); }
        .ft-pin-fly {
            position: absolute;
            left: 50%; top: 50%;
            width: 74px; height: 74px;
            margin: -37px 0 0 -37px;
            z-index: 50;
            pointer-events: none;
            opacity: 0;
            filter: drop-shadow(0 0 10px rgba(255,255,255,0.45));
            animation: ft-pin-spin 2s cubic-bezier(.3,.7,.3,1) forwards;
        }
        @keyframes ft-pin-spin {
            0%   { opacity: 0; transform: scale(0.2) rotateY(0deg); }
            15%  { opacity: 1; transform: scale(1) rotateY(180deg); }
            80%  { opacity: 1; transform: scale(1) rotateY(1080deg); }
            100% { opacity: 0; transform: scale(0.6) rotateY(1260deg); }
        }
        @property --ft-angle {
            syntax: '<angle>';
            inherits: false;
            initial-value: 0deg;
        }

        #ft-box {
            --ft-accent: 255, 170, 60;
            background: linear-gradient(150deg, rgba(255,255,255,0.055), rgba(0,0,0,0.46));
            backdrop-filter: blur(14px) saturate(150%);
            -webkit-backdrop-filter: blur(14px) saturate(150%);
            box-sizing: border-box;
            border: 1px solid rgba(255, 255, 255, 0.08);
            padding: 11px;
            margin-bottom: 5px;
            width: 100%;
            border-radius: 10px;
            overflow: hidden;
            position: relative;
            display: block;
            box-shadow: 0 10px 28px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.05);
            transition: background 0.3s, border 0.3s, box-shadow 0.3s;
            animation: ft-box-in 0.55s cubic-bezier(.16,.84,.44,1) both;
        }
        #ft-box::before {
            content: "";
            position: absolute;
            inset: -1px;
            padding: 1px;
            border-radius: 10px;
            background: conic-gradient(from var(--ft-angle, 0deg),
                rgba(255,255,255,0) 0%,
                rgba(255,255,255,0.4) 12%,
                rgba(var(--ft-accent), 0.5) 26%,
                rgba(255,255,255,0) 45%,
                rgba(255,255,255,0) 100%);
            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor;
            mask-composite: exclude;
            opacity: 0.65;
            pointer-events: none;
            z-index: 0;
            animation: ft-border-spin 7s linear infinite;
        }
        #ft-box.ft-transparent {
            background-color: transparent !important;
            background-image: none !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            border: none !important;
            box-shadow: none !important;
        }
        #ft-box.ft-transparent::before { display: none; }

        @keyframes ft-box-in {
            from { opacity: 0; transform: translateY(-8px) scale(0.98); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes ft-border-spin { to { --ft-angle: 360deg; } }

        #ft-content {
            overflow: hidden;
            max-height: 2000px;
            opacity: 1;
            transition: max-height 0.42s cubic-bezier(.3,.8,.3,1), opacity 0.3s ease, margin 0.3s ease;
        }
        #ft-content.ft-collapsed { max-height: 0 !important; opacity: 0; }

        @keyframes ft-tab-in {
            from { opacity: 0; transform: translateY(6px); }
            to   { opacity: 1; transform: translateY(0); }
        }
        .ft-tab-anim { animation: ft-tab-in 0.35s cubic-bezier(.22,.8,.3,1) both; }

        #ft-status-banner { transition: border-color 0.3s, box-shadow 0.3s; }
        #ft-status-banner.ft-danger { animation: ft-pulse-danger 2s ease-in-out infinite; }
        @keyframes ft-pulse-danger {
            0%, 100% { box-shadow: 0 0 0 rgba(255,77,77,0); }
            50%      { box-shadow: 0 0 10px rgba(255,77,77,0.45); }
        }

        .ft-tabbar {
            position: relative;
            display: flex;
            gap: 1px;
            background: rgba(255,255,255,0.045);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 999px;
            padding: 3px;
            margin-bottom: 9px;
        }
        .ft-tab-indicator {
            position: absolute;
            top: 3px; bottom: 3px; left: 3px;
            width: 0;
            border-radius: 999px;
            background: linear-gradient(180deg, #ffd27a, #ff9d2e);
            box-shadow: 0 2px 10px rgba(255,157,46,0.5);
            transition: left 0.32s cubic-bezier(.22,.9,.3,1), width 0.32s cubic-bezier(.22,.9,.3,1);
            z-index: 0;
        }
        .ft-btn {
            position: relative;
            z-index: 1;
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 3px;
            background: transparent;
            border: none;
            color: #9a9a9a;
            font-size: 7.5px;
            letter-spacing: 0.3px;
            cursor: pointer;
            padding: 5px 2px;
            border-radius: 999px;
            text-transform: uppercase;
            transition: color 0.25s ease;
        }
        .ft-btn svg { flex: none; transition: transform 0.25s ease; }
        .ft-btn:hover { color: #fff; }
        .ft-btn:hover svg { transform: scale(1.12); }
        .ft-btn.active { color: #241804; font-weight: 700; }

        .ft-level-card {
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.07);
            border-radius: 8px;
            padding: 8px 10px;
            margin-bottom: 8px;
        }
        .ft-level-label { font-size: 8px; letter-spacing: 0.8px; text-transform: uppercase; color: #8a8a8a; margin-bottom: 2px; }
        .ft-level-row { display: flex; align-items: baseline; gap: 7px; }
        .ft-level-num {
            font-size: 25px;
            font-weight: 800;
            line-height: 1;
            background: linear-gradient(180deg, #ffe2a8, #ff9d2e);
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .ft-level-xp { font-size: 11px; font-weight: 600; color: #8fe3a0; }

        .ft-minmax-row { display: flex; justify-content: space-between; gap: 6px; margin-top: 6px; flex-wrap: wrap; }
        .ft-minmax-chip { font-size: 8.5px; color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 48%; }
        .ft-minmax-chip b { color: #ccc; font-weight: 600; }

        .ft-btn-sh { background: rgba(255,255,255,0.05); color: #888; font-size: 10px; text-decoration: none; border-radius: 4px; border: 1px solid #333; padding: 4px; flex: 1; text-align: center; transition: 0.2s; display: flex; align-items: center; justify-content: center; gap: 4px; }
        .ft-btn-sh svg { opacity: 0.6; transition: 0.2s; }
        .ft-btn-sh:hover { color: #fff; border-color: rgba(255,170,60,0.5); background: rgba(255,255,255,0.08); transform: translateY(-1px); }
        .ft-btn-sh:hover svg { opacity: 1; }
        .ft-fcode-box { margin-top: 8px; font-size: 10px; color: #aaa; display: flex; align-items: center; gap: 5px; }
        .ft-fcode-val { color: #ccc; font-family: monospace; font-size: 11px; background: rgba(0,0,0,0.3); padding: 1px 4px; border-radius: 3px; border: 1px solid rgba(255,255,255,0.2); cursor: pointer; transition: 0.2s; }
        .ft-fcode-val:hover { background: rgba(255,255,255,0.1); color: #fff; }
        .ft-sid-val { cursor: pointer; transition: 0.2s; font-family: monospace; font-size: 10px; }
        .ft-sid-val:hover { color: #fff !important; }
        .ft-copied-flash { color: #9cffb0 !important; }
        .ft-fcode-val.ft-copied-flash { background: rgba(80,255,140,0.18) !important; border-color: rgba(80,255,140,0.45) !important; }

        .ft-medal-wrap {
            position: relative;
            width: 100%;
            aspect-ratio: 1;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0,0,0,0.3);
            border: 1px solid transparent;
            box-sizing: border-box;
            opacity: 0;
            transform: scale(0.6);
            animation: ft-pop-in 0.4s cubic-bezier(.34,1.56,.64,1) forwards;
            transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }
        .ft-medal-wrap:hover { transform: scale(1.08); box-shadow: 0 0 10px rgba(255,255,255,0.25); z-index: 1; }
        .ft-medal-wrap.ft-genuine {
            border-color: #aaaaaa !important;
            box-shadow: 0 0 6px rgba(255,255,255,0.2);
            background: rgba(255,255,255,0.08) !important;
        }
        .ft-medal-wrap.ft-genuine:hover { box-shadow: 0 0 14px rgba(255,255,255,0.4); }
        @keyframes ft-pop-in {
            from { opacity: 0; transform: scale(0.6); }
            to   { opacity: 1; transform: scale(1); }
        }
        /* Чуть уменьшены медали, чтобы исключить горизонтальную полосу */
        .ft-medal-item { width: 80%; height: 80%; object-fit: contain; border-radius: 4px; }

        @keyframes ft-slide-in {
            from { opacity: 0; transform: translateX(-6px); }
            to   { opacity: 1; transform: translateX(0); }
        }
        .ft-ban-item {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 4px;
            padding: 5px 8px;
            margin-bottom: 4px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            opacity: 0;
            animation: ft-slide-in 0.35s ease forwards;
            transition: background 0.2s, border-color 0.2s;
        }
        .ft-ban-item:hover { background: rgba(255,255,255,0.09); border-color: rgba(255,255,255,0.2); }
        .ft-ban-date-time { font-size: 9px; color: #888; }
        .ft-ban-left { display: flex; align-items: center; gap: 6px; }
        .ft-ban-icon { flex: none; color: #ff6b6b; }

        #ft-chart-box svg { width: 100%; height: 80px; overflow: visible; }
        #ft-chart-box path {
            fill: none;
            stroke: #aaaaaa;
            stroke-width: 1.5;
            stroke-dasharray: 100;
            stroke-dashoffset: 100;
            animation: ft-draw-line 1.1s cubic-bezier(.3,.8,.3,1) forwards;
        }
        @keyframes ft-draw-line { to { stroke-dashoffset: 0; } }
        #ft-chart-box circle {
            fill: #aaaaaa;
            cursor: pointer;
            transition: r 0.2s, fill 0.2s, filter 0.2s;
            opacity: 0;
            transform-box: fill-box;
            transform-origin: center;
            animation: ft-pop-in 0.35s ease forwards;
        }
        #ft-chart-box circle:hover { r: 5; fill: #fff; filter: drop-shadow(0 0 4px rgba(255,255,255,0.8)); }

        /* Компактная сетка медалей с вертикальным скроллом без горизонтального */
        .ft-medals {
            display: grid;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 5px !important;
            margin-top: 10px;
            max-height: 190px !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            padding-right: 2px;
            box-sizing: border-box;
        }
        .ft-medals::-webkit-scrollbar, #ft-banh-content::-webkit-scrollbar { width: 5px; }
        .ft-medals::-webkit-scrollbar-thumb, #ft-banh-content::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 3px; }
        .ft-medals::-webkit-scrollbar-thumb:hover, #ft-banh-content::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }

        /* Фоновое фото поднят вверх (top center), чтобы были видны ушки */
        #ft-con-content {
            background-image: linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.65)), url('https://abrakadabra.fun/uploads/posts/2022-01/thumbs/1642955051_8-abrakadabra-fun-p-devochka-koshka-art-19.jpg') !important;
            background-size: cover !important;
            background-position: top center !important;
            border-radius: 6px;
            border: 1px solid rgba(255,255,255,0.1);
        }

        .ft-link-footer { color: #555; text-decoration: none; transition: 0.2s; }
        .ft-link-footer:hover { color: #fff; }

        #ft-bg-btn { transition: transform 0.3s ease, fill 0.3s ease; }
        #ft-bg-btn:hover { fill: #fff !important; transform: rotate(15deg); }
        #ft-bg-btn.ft-active-rot { transform: rotate(95deg); fill: #fff !important; }
        #ft-lang-gear { transition: transform 0.3s ease, fill 0.3s ease; }
        #ft-lang-gear:hover { fill: #fff !important; transform: scale(1.15); }
        .ft-seg { display: flex; gap: 3px; padding: 3px; border-radius: 9px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.07); }
        .ft-lang-opt { flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px; padding: 6px 8px; font-size: 10px; font-weight: 600; letter-spacing: .4px; color: #9a9a9a; cursor: pointer; border-radius: 6px; transition: background .2s, color .2s, transform .15s, box-shadow .2s; }
        .ft-lang-opt:hover { background: rgba(255,255,255,0.08); color: #fff; }
        .ft-lang-opt:active { transform: scale(0.95); }
        .ft-lang-opt.ft-lang-active { background: linear-gradient(180deg, #ffd27a, #ff9d2e); color: #241804; box-shadow: 0 2px 10px rgba(255,157,46,0.45); }

        .ft-menu {
            position: absolute;
            z-index: 999;
            opacity: 0;
            transform: translateY(8px) scale(0.94);
            pointer-events: none;
            transform-origin: bottom left;
            transition: opacity 0.22s ease, transform 0.26s cubic-bezier(.2,.9,.25,1.15);
            background: linear-gradient(160deg, rgba(34,34,40,0.92), rgba(14,14,18,0.94)) !important;
            backdrop-filter: blur(16px) saturate(160%);
            -webkit-backdrop-filter: blur(16px) saturate(160%);
            border: 1px solid rgba(255,255,255,0.12);
            border-radius: 12px;
            padding: 10px;
            box-shadow: 0 14px 34px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07);
        }
        .ft-menu.ft-menu-visible { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
        .ft-menu::after {
            content: ""; position: absolute; bottom: -5px; left: var(--ft-arrow, 14px);
            width: 9px; height: 9px; background: rgba(14,14,18,0.96);
            border-right: 1px solid rgba(255,255,255,0.12); border-bottom: 1px solid rgba(255,255,255,0.12);
            transform: rotate(45deg);
        }
        .ft-pop-title { font-size: 8px; letter-spacing: 1.2px; text-transform: uppercase; color: #8a8a8a; margin: 0 2px 7px; display: flex; align-items: center; gap: 6px; }
        .ft-pop-title::after { content: ""; flex: 1; height: 1px; background: linear-gradient(90deg, rgba(255,255,255,0.14), transparent); }

        .ft-bg-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
        .ft-bg-tile {
            position: relative; height: 46px; border-radius: 8px; cursor: pointer; overflow: hidden;
            background-size: cover; background-position: center;
            border: 1px solid rgba(255,255,255,0.14);
            display: flex; align-items: flex-end; justify-content: flex-start;
            transition: transform .2s, border-color .2s, box-shadow .2s;
        }
        .ft-bg-tile::before { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,0.75)); transition: opacity .2s; }
        .ft-bg-tile:hover { transform: translateY(-2px); border-color: rgba(255,170,60,0.6); box-shadow: 0 6px 14px rgba(0,0,0,0.5); }
        .ft-bg-tile:active { transform: scale(0.96); }
        .ft-bg-name { position: relative; z-index: 1; font-size: 8px; font-weight: 700; letter-spacing: .8px; color: #fff; padding: 0 6px 5px; text-shadow: 0 1px 3px rgba(0,0,0,0.8); }
        .ft-bg-check {
            position: absolute; top: 4px; right: 4px; z-index: 2; width: 14px; height: 14px; border-radius: 50%;
            background: linear-gradient(180deg, #ffd27a, #ff9d2e); color: #241804; font-size: 9px; font-weight: 800;
            display: flex; align-items: center; justify-content: center;
            opacity: 0; transform: scale(0.4); transition: opacity .2s, transform .25s cubic-bezier(.3,1.6,.5,1);
        }
        .ft-bg-tile.ft-active { border-color: #ffb84d; box-shadow: 0 0 0 1px #ffb84d, 0 4px 14px rgba(255,157,46,0.35); }
        .ft-bg-tile.ft-active .ft-bg-check { opacity: 1; transform: scale(1); }
        .ft-bg-tile-trans {
            grid-column: 1 / -1; height: 28px; align-items: center; justify-content: center;
            background-color: rgba(255,255,255,0.03);
            background-image: linear-gradient(45deg, rgba(255,255,255,0.07) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.07) 75%), linear-gradient(45deg, rgba(255,255,255,0.07) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.07) 75%);
            background-size: 8px 8px; background-position: 0 0, 4px 4px;
        }
        .ft-bg-tile-trans::before { display: none; }
        .ft-bg-tile-trans .ft-bg-name { padding: 0; color: #ddd; text-shadow: none; }
        #ft-bg-clear {
            margin-top: 7px; text-align: center; cursor: pointer; font-size: 9px; font-weight: 700; letter-spacing: .6px;
            color: #ff6b6b; padding: 6px; border-radius: 8px; background: rgba(255,77,77,0.07); border: 1px solid rgba(255,77,77,0.18);
            transition: background .2s, border-color .2s, transform .15s, color .2s;
        }
        #ft-bg-clear:hover { background: rgba(255,77,77,0.16); border-color: rgba(255,77,77,0.4); color: #ff9a9a; }
        #ft-bg-clear:active { transform: scale(0.96); }

        #ft-nya-btn { display: inline-block; transition: transform 0.25s ease, color 0.25s ease; }
        #ft-nya-btn:hover { color: #ff99cc !important; transform: scale(1.2) rotate(-4deg); }

        /* Эффект снега */
        .ft-snowflake {
            position: fixed;
            top: -10px;
            background: #ffffff;
            border-radius: 50%;
            pointer-events: none;
            z-index: 999999;
            opacity: 0.8;
            animation: ft-fall linear infinite;
            box-shadow: 0 0 4px rgba(255,255,255,0.6);
        }
        @keyframes ft-fall {
            0% { transform: translateY(0px) translateX(0px); }
            100% { transform: translateY(105vh) translateX(20px); }
        }

        @media (prefers-reduced-motion: reduce) {
            #ft-box, #ft-box::before, .ft-medal-wrap, .ft-ban-item, #ft-chart-box path, #ft-chart-box circle, .ft-tab-anim {
                animation: none !important;
            }
        }
    `);

    // === РЕАЛЬНЫЙ УРОВЕНЬ СО СТРАНИЦЫ (dt.hud-label "Current level" -> dd .stat-value) ===
    // Цифра из csxp.gg может "съезжать" (там копится уровень без сброса по 40),
    // поэтому настоящий уровень берём напрямую со страницы профиля.
    let ftLevelScraped = false;
    const scrapeCurrentLevel = (attemptsLeft = 8) => {
        try {
            const labels = Array.from(document.querySelectorAll('.hud-label'));
            const target = labels.find(el => {
                const txt = el.textContent.trim().toLowerCase();
                return txt === 'current level' || txt === 'текущий уровень' || txt === 'уровень' || txt === 'level';
            });
            if (target) {
                const dd = target.nextElementSibling;
                const valEl = dd ? (dd.querySelector('.stat-value') || dd) : null;
                const num = valEl ? parseInt(valEl.textContent.replace(/[^\d]/g, ''), 10) : NaN;
                if (!isNaN(num)) {
                    ftLevelScraped = true;
                    const numEl = document.getElementById('ft-exp-level-num');
                    if (numEl) numEl.innerText = num;
                    return;
                }
            }
        } catch (e) {}
        if (attemptsLeft > 0) setTimeout(() => scrapeCurrentLevel(attemptsLeft - 1), 350);
    };

    const formatBanDate = (dateStr) => {
        const d = isNaN(dateStr) ? new Date(dateStr) : new Date(parseInt(dateStr) * 1000);
        if (isNaN(d.getTime())) return dateStr;
        const locale = currentLang === 'ru' ? 'ru-RU' : 'en-US';
        return d.toLocaleString(locale, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const renderBanHistory = (bans) => {
        const container = document.getElementById('ft-ban-list');
        if (!container) return;
        container.innerHTML = bans.length ? bans.map((b, i) => `
            <div class="ft-ban-item" style="animation-delay:${Math.min(i * 40, 400)}ms">
                <div class="ft-ban-left">
                    <span class="ft-ban-icon">${ftIcons.banh}</span>
                    <span style="font-size:10px;color:#eee;">${b.status}</span>
                </div>
                <time class="ft-ban-date-time">${formatBanDate(b.date)}</time>
            </div>
        `).join('') : `<div style="color:#666;font-size:10px;text-align:center;padding:10px;">${t.nobans}</div>`;
    };

    const fetchSteamTradesLevel = (sid) => {
        GM_xmlhttpRequest({
            method: "GET",
            url: `https://www.steamtrades.com/user/${sid}`,
            onload: (res) => {
                try {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(res.responseText, 'text/html');
                    const elements = Array.from(doc.querySelectorAll('div, span, td, a'));
                    let lvlVal = null;

                    for (let el of elements) {
                        if (el.textContent.trim().toLowerCase() === 'steam level') {
                            const next = el.nextElementSibling || el.parentElement?.nextElementSibling;
                            if (next) {
                                lvlVal = next.textContent.trim();
                                break;
                            }
                        }
                    }

                    if (!lvlVal) {
                        const match = res.responseText.match(/Steam Level\s*<\/div>\s*<div>\s*([\d,]+)\s*<\/div>/i) ||
                                      res.responseText.match(/Steam Level[\s\S]*?>\s*([\d,]+)\s*</i);
                        if (match) lvlVal = match[1];
                    }

                    const targetEl = document.getElementById('ft-steam-lvl-val');
                    if (targetEl) {
                        targetEl.innerText = lvlVal ? lvlVal : '-';
                    }
                } catch(e) {}
            }
        });
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
                        renderChart(filteredPoints, readCsxpLevel(doc));
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
                let collectiblesSection = null;
                const sections = doc.querySelectorAll('section');
                for (let sec of sections) {
                    const h2 = sec.querySelector('h2');
                    if (h2 && h2.textContent.trim().toLowerCase() === 'collectibles') {
                        collectiblesSection = sec;
                        break;
                    }
                }

                if (collectiblesSection) {
                    const items = collectiblesSection.querySelectorAll('a, div.inline-flex');
                    items.forEach(item => {
                        const img = item.querySelector('img');
                        if (!img) return;

                        const name = item.querySelector('.font-semibold')?.innerText || img.alt || '';
                        const src = img.getAttribute('src');
                        if (!src) return;

                        const fullImg = src.startsWith('http') ? src : `https://csxp.gg${src}`;
                        const href = item.getAttribute('href') || '';
                        const parentCategory = item.closest('.rounded-xl')?.querySelector('.text-sm')?.textContent.trim().toLowerCase() || '';

                        const uniqueKey = `${parentCategory}_${fullImg}_${name}`;

                        if (!meds.some(m => m.uniqueKey === uniqueKey)) {
                            const isGen = href.includes('/genuine') || parentCategory.includes('genuine');
                            meds.push({ uniqueKey, name, img: fullImg, genuine: isGen });
                        }
                    });
                }

                renderMedals(meds);
            }
        });
    };

    // CS2-уровень циклический (1..40): csxp.gg копит уровень без сброса, поэтому приводим к 1..40
    const normLvl = (v) => ((Math.floor(v) - 1) % 40 + 40) % 40 + 1;

    // Пытаемся взять уровень ровно так, как его показывает csxp.gg ("Current level")
    const readCsxpLevel = (doc) => {
        try {
            const els = Array.from(doc.querySelectorAll('div, span, dt, p, h3, h4'));
            const label = els.find(el => el.children.length === 0 && /^current level$/i.test(el.textContent.trim()));
            if (label && label.parentElement) {
                const m = label.parentElement.textContent.replace(/current level/i, '').match(/\d+/);
                if (m) return parseInt(m[0], 10);
            }
        } catch (e) {}
        return null;
    };

    const renderChart = (points, siteLevel) => {
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
            return { x, y, lvl: normLvl(p[1]), xp: Math.round((p[1] % 1) * 5000), date: new Date(p[0] * 1000).toLocaleString() };
        });
        const last = coords[coords.length - 1];
        box.innerHTML = `
            <svg viewBox="0 -5 ${width} ${height + 10}">
                <path pathLength="100" d="M ${coords.map(c => `${c.x},${c.y}`).join(' L ')}" stroke="#aaaaaa" fill="none" stroke-width="1.5" />
                ${coords.map((c, i) => `<circle style="animation-delay:${0.9 + Math.min(i, 15) * 0.03}s" cx="${c.x}" cy="${c.y}" r="3" fill="#aaaaaa"><title>${c.date}\nLevel: ${c.lvl} (${c.xp} XP)</title></circle>`).join('')}
            </svg>
            <div class="ft-minmax-row">
                <span class="ft-minmax-chip">${t.min} <b>${minL.toFixed(1)}</b></span>
                <span class="ft-minmax-chip">${t.max} <b>${maxL.toFixed(1)}</b></span>
            </div>
        `;

        // Цифра уровня берётся из реального "Current level" на странице (см. scrapeCurrentLevel).
        // Если скрейп ещё не успел отработать — временно показываем вычисленное значение.
        const numEl = document.getElementById('ft-exp-level-num');
        if (numEl) numEl.innerText = (siteLevel && siteLevel >= 1 && siteLevel <= 40) ? siteLevel : last.lvl;
        const xpEl = document.getElementById('ft-exp-level-xp');
        if (xpEl) xpEl.innerText = `+${last.xp} XP`;
    };

    const renderMedals = (meds) => {
        const container = document.querySelector('.ft-medals');
        if (!container) return;
        container.innerHTML = meds.length ? meds.map((m, i) => `
            <div class="ft-medal-wrap ${m.genuine ? 'ft-genuine' : ''}" style="animation-delay:${Math.min(i * 30, 450)}ms" title="${m.name}">
                <img src="${m.img}" class="ft-medal-item" onerror="this.src='https://community.cloudflare.steamstatic.com/economy/image/fWFc82jsWfmoRAPu609u5A2E6eia6S0Z_R15_D9_B-9m3vS_H-p9v_mXMXvX-98fS_D1tDVfhtXvMv6YCeY_u98_4p8G'">
            </div>
        `).join('') : `<div style="color:#666;font-size:10px;grid-column:1/-1;text-align:center;padding:10px;">${t.nomedals}</div>`;
        document.getElementById('ft-counter').innerText = meds.length;
    };

    // Функция запуска снега
    const startSnow = () => {
        const snowCount = 40;
        for (let i = 0; i < snowCount; i++) {
            const snowflake = document.createElement('div');
            snowflake.className = 'ft-snowflake';
            const size = Math.random() * 4 + 2;
            snowflake.style.width = `${size}px`;
            snowflake.style.height = `${size}px`;
            snowflake.style.left = `${Math.random() * 100}vw`;
            const duration = Math.random() * 3 + 2;
            snowflake.style.animationDuration = `${duration}s`;
            snowflake.style.animationDelay = `${Math.random() * 2}s`;
            document.body.appendChild(snowflake);

            setTimeout(() => {
                snowflake.remove();
            }, (duration + 2) * 1000);
        }
    };

    const draw = (sid, status) => {
        if (document.getElementById('ft-box')) return;
        const rightCol = document.querySelector('.profile_rightcol');
        if (!rightCol) return;
        const box = document.createElement('div');
        box.id = 'ft-box';

        let color = status.kt || status.vac ? '#ff4d4d' : (status.priv ? '#ffb84d' : '#aaaaaa');
        let label = status.kt ? t.kt : (status.vac ? t.vac : (status.priv ? t.priv : t.clean));

        const fcode = encodeFriendCode(sid);
        const isCollapsed = GM_getValue('ft_collapsed', false);

        box.innerHTML = `
            <div style="font-size:9px;margin-bottom:7px;display:flex;justify-content:space-between;align-items:center; position:relative; z-index:2;">
                <span id="ft-copy-sid" class="ft-sid-val" style="font-weight:bold; color:#aaa;" title="Click to copy full ID64">id64</span>
                <span id="ft-toggle" style="cursor:pointer; width:16px; height:16px; border-radius:50%; background:rgba(255,255,255,0.07); font-size:9px; line-height:1; opacity:0.85; display:flex; align-items:center; justify-content:center; transition:background 0.2s, opacity 0.2s;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.85">${isCollapsed ? '+' : '—'}</span>
            </div>
            <div class="ft-tabbar" id="ft-tabbar" style="position:relative; z-index:2;">
                <div class="ft-tab-indicator" id="ft-tab-indicator"></div>
                <button id="ft-btn-info" class="ft-btn active">${ftIcons.info}<span>${t.inf}</span></button>
                <button id="ft-btn-exp" class="ft-btn">${ftIcons.exp}<span>${t.exp}</span></button>
                <button id="ft-btn-meds" class="ft-btn">${ftIcons.meds}<span>${t.med}</span></button>
                <button id="ft-btn-banh" class="ft-btn">${ftIcons.banh}<span>${t.banh}</span></button>
                <button id="ft-btn-con" class="ft-btn">${ftIcons.con}<span>${t.con}</span></button>
            </div>
            <div id="ft-content" class="${isCollapsed ? 'ft-collapsed' : ''}" style="position:relative; z-index:2;">
                <div id="ft-status-banner" class="${(status.kt || status.vac) ? 'ft-danger' : ''}" style="background:rgba(255,255,255,0.03);padding:4px 8px;border-left:4px solid ${color};margin-bottom:8px; border-radius:0 4px 4px 0; display:flex; justify-content:space-between; align-items:center;">
                    <b style="color:${color};text-transform:uppercase;font-size:9.5px;">${label}</b>
                    <span style="font-size:9.5px;font-family:monospace;color:#aaa;font-weight:600;">
                        ${t.lvl} <span id="ft-steam-lvl-val" style="color:#cccccc;font-weight:bold;">...</span>
                    </span>
                </div>
                <div id="ft-extra-info">
                    <div id="ft-acc-creation" style="font-size:11px; color:#aaa; font-weight:bold;">${t.loading}</div>
                    <div class="ft-fcode-box">${t.fcode} <span id="ft-copy-code" class="ft-fcode-val">${fcode}</span></div>
                    <div style="display:flex; gap:5px; margin-top:10px;">
                        <a href="https://steamid.uk/profile/${sid}" target="_blank" class="ft-btn-sh">steamid.uk ${ftIcons.ext}</a>
                        <a href="https://csst.at/profile/${sid}" target="_blank" class="ft-btn-sh">rip cs stats ${ftIcons.ext}</a>
                    </div>
                </div>
                <div id="ft-exp-content" style="display:none; margin-top:10px;">
                    <div class="ft-level-card">
                        <div class="ft-level-label">${t.curlvl}</div>
                        <div class="ft-level-row">
                            <span class="ft-level-num" id="ft-exp-level-num">—</span>
                            <span class="ft-level-xp" id="ft-exp-level-xp"></span>
                        </div>
                    </div>
                    <div id="ft-chart-box">${t.loading}</div>
                </div>
                <div id="ft-banh-content" style="display:none; margin-top:10px; max-height:150px; overflow-y:auto;">
                    <div id="ft-ban-list">${t.loading}</div>
                </div>
                <div id="ft-con-content" style="display:none; margin-top:10px; text-align:center; padding:12px;">
                    <div style="font-size:10px; color:#ccc; margin-bottom:6px; font-weight:600;">${t.contactsText}</div>
                    <a href="https://fakecrime.bio/413" target="_blank" style="font-size:11px; color:#cccccc; text-decoration:none; font-weight:bold; font-family:monospace; display:block; margin-bottom:10px;">https://fakecrime.bio/413</a>
                    <div>
                        <span id="ft-nya-btn" style="font-size:10px; color:#ff77aa; cursor:pointer; font-weight:bold; transition:0.2s;">nya</span>
                    </div>
                </div>
                <div class="ft-medals" style="display:none;"></div>

                <div style="margin-top:10px; border-top:1px solid rgba(255,255,255,0.1); padding-top:6px; display:flex; justify-content:space-between; font-size:9px;">
                    <div style="position:relative; display:flex; align-items:center; gap:8px;">
                        <span style="color:#ffca0a; margin-right:2px;">${t.total} <span id="ft-counter">0</span></span>
                        <svg id="ft-bg-btn" style="width:14px;height:14px;cursor:pointer;fill:#888;transition:transform 0.3s;" viewBox="0 0 24 24"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg>
                        <svg id="ft-lang-gear" style="width:14px;height:14px;cursor:pointer;fill:#888;transition:fill 0.3s;" viewBox="0 0 24 24"><path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/></svg>
                        <img id="ft-pin-btn" src="${phoenixSvg}" title="Valeria" alt="">

                        <div id="ft-lang-menu" class="ft-menu" style="left:34px; bottom:26px; width:132px; --ft-arrow:16px;">
                            <div class="ft-pop-title">Language</div>
                            <div class="ft-seg">
                                <div class="ft-lang-opt ${currentLang === 'ru' ? 'ft-lang-active' : ''}" data-lang="ru">🇷🇺 RU</div>
                                <div class="ft-lang-opt ${currentLang === 'en' ? 'ft-lang-active' : ''}" data-lang="en">🇬🇧 EN</div>
                            </div>
                        </div>

                        <div id="ft-bg-menu" class="ft-menu" style="left:-4px; bottom:26px; width:190px; --ft-arrow:12px;">
                            <div class="ft-pop-title">${t.bgLabel.replace(':','')}</div>
                            <div class="ft-bg-grid">
                                <div class="ft-bg-tile" id="ft-bg-anime" style="background-image:url('${bgLinks.anime}')"><span class="ft-bg-name">ANIME</span><span class="ft-bg-check">✓</span></div>
                                <div class="ft-bg-tile" id="ft-bg-japan" style="background-image:url('${bgLinks.japan}')"><span class="ft-bg-name">JAPAN</span><span class="ft-bg-check">✓</span></div>
                                <div class="ft-bg-tile ft-bg-tile-trans" id="ft-bg-trans"><span class="ft-bg-name">${t.trans}</span><span class="ft-bg-check">✓</span></div>
                            </div>
                            <div id="ft-bg-clear">${t.reset}</div>
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
            const willOpen = !bgMenu.classList.contains('ft-menu-visible');
            bgMenu.classList.toggle('ft-menu-visible', willOpen);
            bgBtn.classList.toggle('ft-active-rot', willOpen);
            if (langMenu) langMenu.classList.remove('ft-menu-visible');
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
            langMenu.classList.toggle('ft-menu-visible');
            if (bgMenu) { bgMenu.classList.remove('ft-menu-visible'); bgBtn.classList.remove('ft-active-rot'); }
        };

        document.addEventListener('click', function(event) {
            if (langMenu && !langMenu.contains(event.target)) langMenu.classList.remove('ft-menu-visible');
            if (bgMenu && !bgMenu.contains(event.target)) { bgMenu.classList.remove('ft-menu-visible'); bgBtn.classList.remove('ft-active-rot'); }
        });

        document.querySelectorAll('.ft-lang-opt').forEach(opt => {
            opt.onclick = function(e) {
                e.stopPropagation();
                GM_setValue('ft_lang', this.getAttribute('data-lang'));
                window.location.reload();
            };
        });

        document.getElementById('ft-pin-btn').onclick = function(e) {
            e.stopPropagation();
            const pin = document.createElement('img');
            pin.className = 'ft-pin-fly';
            pin.src = phoenixSvg;
            box.appendChild(pin);
            setTimeout(() => pin.remove(), 2100);
        };

        // Клик по надписи nya для запуска снега
        document.getElementById('ft-nya-btn').onclick = function() {
            startSnow();
        };

        document.getElementById('ft-copy-sid').onclick = function() {
            navigator.clipboard.writeText(sid);
            const oldText = this.innerText;
            this.innerText = t.copied;
            this.classList.add('ft-copied-flash');
            setTimeout(() => { this.innerText = oldText; this.classList.remove('ft-copied-flash'); }, 1000);
        };

        document.getElementById('ft-copy-code').onclick = function() {
            navigator.clipboard.writeText(fcode);
            const oldText = this.innerText;
            this.innerText = t.copied;
            this.classList.add('ft-copied-flash');
            setTimeout(() => { this.innerText = oldText; this.classList.remove('ft-copied-flash'); }, 1000);
        };

        const tabButtons = {
            info: document.getElementById('ft-btn-info'),
            exp: document.getElementById('ft-btn-exp'),
            meds: document.getElementById('ft-btn-meds'),
            banh: document.getElementById('ft-btn-banh'),
            con: document.getElementById('ft-btn-con')
        };
        const tabIndicator = document.getElementById('ft-tab-indicator');
        const moveIndicator = (mode) => {
            const btn = tabButtons[mode];
            if (!btn || !tabIndicator) return;
            tabIndicator.style.left = btn.offsetLeft + 'px';
            tabIndicator.style.width = btn.offsetWidth + 'px';
        };

        const toggleTab = (mode) => {
            const statusBanner = document.getElementById('ft-status-banner');
            if (statusBanner) statusBanner.style.display = mode === 'info' ? 'flex' : 'none';

            const panels = {
                info: document.getElementById('ft-extra-info'),
                exp: document.getElementById('ft-exp-content'),
                banh: document.getElementById('ft-banh-content'),
                con: document.getElementById('ft-con-content'),
                meds: document.querySelector('.ft-medals')
            };

            Object.keys(panels).forEach((key) => {
                const el = panels[key];
                if (!el) return;
                if (key === mode) {
                    el.style.display = key === 'meds' ? 'grid' : 'block';
                    el.classList.remove('ft-tab-anim');
                    void el.offsetWidth; // reflow, so the animation replays every time the tab is opened
                    el.classList.add('ft-tab-anim');
                } else {
                    el.style.display = 'none';
                    el.classList.remove('ft-tab-anim');
                }
            });

            Object.keys(tabButtons).forEach((key) => {
                if (tabButtons[key]) tabButtons[key].classList.toggle('active', key === mode);
            });

            moveIndicator(mode);
        };

        Object.keys(tabButtons).forEach((key) => {
            if (tabButtons[key]) tabButtons[key].onclick = () => toggleTab(key);
        });

        // Ставим бегунок под активную вкладку после того, как разметка реально встала в layout
        requestAnimationFrame(() => moveIndicator('info'));

        document.getElementById('ft-toggle').onclick = () => {
            const c = document.getElementById('ft-content');
            const willCollapse = !c.classList.contains('ft-collapsed');
            c.classList.toggle('ft-collapsed', willCollapse);
            document.getElementById('ft-toggle').innerText = willCollapse ? '+' : '—';
            GM_setValue('ft_collapsed', willCollapse);
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

        const hasInventoryTab = !!Array.from(document.querySelectorAll('.profile_count_link_label'))
                                     .find(el => el.textContent.includes('Инвентарь') || el.textContent.includes('Inventory'));

        const isKT = !hasInventoryTab && (
                   document.documentElement.innerHTML.includes('profile_ban_community') ||
                   (nameText === sid) ||
                   (document.querySelector('.profile_ban_status') &&
                    (document.documentElement.innerHTML.includes('Блокировка в сообществе') ||
                     document.documentElement.innerHTML.includes('Community Banned'))) ||
                   isHiddenKT);

        draw(sid, {
            vac: document.documentElement.innerHTML.includes('profile_ban_status'),
            kt: isKT,
            priv: isStandardPrivate && !isKT
        });

        fetchSteamTradesLevel(sid);
        fetchExtraFromCSXP(sid);
    };

    setTimeout(run, 500);
})();
