"use strict";

/* =========================================================
   HEADER-PLUS.JS — ลูกเล่นหัวกระดาน (กรอบชื่อแผนด้านบน)

   1) ป้ายข้อมูลโครงการ: 👤 ลูกค้า · 📍 ที่ตั้ง · 📐 ขนาดที่ดิน · 👔 เซลผู้ดูแล
   2) ป้ายสถานะดีล: กำลังเจรจา / เสนอราคาแล้ว / เซ็นสัญญาแล้ว / รอโอน / ปิดดีล
   3) สรุปบนเส้นหัวกระดาน: ระยะเวลา · จำนวนงาน · เหลืออีกกี่วัน
   4) แถบความคืบหน้าบนเส้น (จากงานแรก → งานสุดท้าย เทียบกับวันนี้)
   5) ธีมสีหัวกระดาน (เลือกเอง / ตามสีโลโก้ลูกค้า)
   6) รูปแบบหัวกระดาน: กรอบโค้ง / แถบเต็ม / มินิมอล
   7) โลโก้คู่: โลโก้บริษัทซ้าย + โลโก้ลูกค้าขวา
   8) บรรทัดรอง "title" → คำแนะนำจาง ๆ "ชื่อลูกค้า / โครงการ"
      ชื่อ/บรรทัดรอง: Enter = เสร็จ · Esc = ยกเลิก
   9) ชื่อแผน (ช่องเลือกแผน) เปลี่ยนตามบรรทัดรองอัตโนมัติ (ปิดได้)

   ตั้งค่าทั้งหมดที่ปุ่ม ⚙ มุมกรอบหัวกระดาน (เห็นตอนเอาเมาส์ชี้) หรือคลิกป้าย
   เก็บแยกตามแผน (data.header) → บันทึก, Export/Import, เทมเพลต, ย้อนกลับ ได้ครบ

   ไม่แก้ app.js / style.css — โหลดหลัง io.js, plans.js, image-logo.js
========================================================= */

(function () {

    const header = document.querySelector(".plan-header");
    const titleBox = header && header.querySelector(".title-box");
    const titleEl = header && header.querySelector(".title");
    const subtitleEl = header && header.querySelector(".subtitle");
    const line = header && header.querySelector(".header-green-line");
    const logo = header && header.querySelector(".title-logo");

    if (!header || !titleBox || !titleEl || !subtitleEl || !window.ZGPlanIO) {

        console.error("[header-plus.js] ไม่พบหัวกระดาน หรือ io.js");

        return;
    }

    const SUBTITLE_DEFAULTS = ["title", ""];
    const TITLE_DEFAULTS = ["Property schedule plan", ""];

    const STATUSES = [
        { key: "", label: "ไม่ระบุ", color: "#a7b0ab" },
        { key: "negotiating", label: "กำลังเจรจา", color: "#e1a638" },
        { key: "quoted", label: "เสนอราคาแล้ว", color: "#5b9bd5" },
        { key: "signed", label: "เซ็นสัญญาแล้ว", color: "#3a8a4f" },
        { key: "transfer", label: "รอโอน", color: "#8e6bbf" },
        { key: "closed", label: "ปิดดีล", color: "#7f8c8d" }
    ];

    const THEMES = [
        { key: "green", label: "เขียว", color: "#7ac143" },
        { key: "blue", label: "น้ำเงิน", color: "#3b82c4" },
        { key: "orange", label: "ส้ม", color: "#f08a24" },
        { key: "purple", label: "ม่วง", color: "#8e6bbf" },
        { key: "red", label: "แดง", color: "#d9534f" },
        { key: "slate", label: "เทาเข้ม", color: "#5f6b66" }
    ];

    const STYLES = [
        { key: "rounded", label: "กรอบโค้ง" },
        { key: "band", label: "แถบเต็ม" },
        { key: "minimal", label: "มินิมอล" }
    ];

    const INFO_FIELDS = [
        { key: "customer", icon: "👤", label: "ลูกค้า", placeholder: "ชื่อลูกค้า / บริษัท" },
        { key: "location", icon: "📍", label: "ที่ตั้ง", placeholder: "เช่น นิคมฯ อมตะซิตี้ ระยอง" },
        { key: "size", icon: "📐", label: "ขนาดที่ดิน", placeholder: "เช่น 25 ไร่" },
        { key: "owner", icon: "👔", label: "เซลผู้ดูแล", placeholder: "ชื่อเซล" }
    ];

    function defaults() {

        return {
            info: { customer: "", location: "", size: "", owner: "" },
            status: "",
            theme: "green",
            customColor: "",
            style: "rounded",
            dualLogo: false,
            showSummary: true,
            syncPlanName: true
        };
    }

    let settings = defaults();

    function normalize(raw) {

        const base = defaults();

        if (!raw || typeof raw !== "object") return base;

        const info = raw.info && typeof raw.info === "object" ? raw.info : {};

        INFO_FIELDS.forEach(field => {
            base.info[field.key] = typeof info[field.key] === "string" ? info[field.key].slice(0, 120) : "";
        });

        base.status = STATUSES.some(item => item.key === raw.status) ? raw.status : "";
        base.theme = raw.theme === "auto" || raw.theme === "custom" || THEMES.some(item => item.key === raw.theme) ? raw.theme : "green";
        base.customColor = /^#[0-9a-f]{6}$/i.test(raw.customColor || "") ? raw.customColor : "";
        base.style = STYLES.some(item => item.key === raw.style) ? raw.style : "rounded";
        base.dualLogo = Boolean(raw.dualLogo);
        base.showSummary = raw.showSummary !== false;
        base.syncPlanName = raw.syncPlanName !== false;

        return base;
    }


    /* =====================================================
       STYLE
    ===================================================== */

    const style = document.createElement("style");

    style.textContent = `
.plan-header { --zg-hd: #7ac143; --zg-hd-soft: rgba(122, 193, 67, .12); }
.plan-header .title-box { border-color: var(--zg-hd); transition: border-color .2s ease, background-color .2s ease; }
.plan-header .header-green-line { position: relative; background: var(--zg-hd); transition: background-color .2s ease; }

/* 8) คำแนะนำจาง ๆ */
.plan-header .title.zg-hd-empty:empty::before,
.plan-header .subtitle.zg-hd-empty:empty::before {
    content: attr(data-placeholder);
    color: #b3bbb6;
    font-style: italic;
    pointer-events: none;
}
.plan-header .title.zg-hd-empty:empty::before { font-style: normal; }
body.zg-exporting .plan-header .title.zg-hd-empty:empty::before,
body.zg-exporting .plan-header .subtitle.zg-hd-empty:empty::before { content: none; }
.plan-header .title[contenteditable="true"]:focus,
.plan-header .subtitle[contenteditable="true"]:focus {
    outline: none;
    border-radius: 4px;
    box-shadow: 0 0 0 2px var(--zg-hd);
    background: #ffffff;
}

/* 1) 2) ป้าย */
.zg-hd-chips {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 5px;
    max-width: 46vw;
    margin-left: 6px;
}
.zg-hd-chips:empty { display: none; }
.zg-hd-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    max-width: 240px;
    padding: 2px 8px;
    border: 1px solid #e3e8e5;
    border-radius: 999px;
    background: #f7f9f8;
    color: #3d4842;
    font: 11px/1.5 Arial, Helvetica, sans-serif;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: pointer;
}
.zg-hd-chip:hover { border-color: var(--zg-hd); }
.zg-hd-status {
    border: 0;
    color: #ffffff;
    font-weight: 700;
    box-shadow: 0 1px 3px rgba(0, 0, 0, .15);
}
.zg-hd-status::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: rgba(255, 255, 255, .85); }

/* 3) 4) สรุป + ความคืบหน้าบนเส้น */
.zg-hd-fill, .zg-hd-summary { display: none !important; }
.zg-hd-fill-unused {
    position: absolute;
    left: 0;
    top: 50%;
    height: 6px;
    transform: translateY(-50%);
    border-radius: 6px;
    background: var(--zg-hd);
    pointer-events: none;
    transition: width .3s ease;
}
.plan-header.zg-hd-has-progress .header-green-line { background: var(--zg-hd-soft); height: 6px; border-radius: 6px; }
.zg-hd-summary {
    position: absolute;
    right: 0;
    bottom: 9px;
    display: flex;
    align-items: center;
    gap: 6px;
    color: #66716b;
    font: 11px/1.3 Arial, Helvetica, sans-serif;
    white-space: nowrap;
    pointer-events: none;
}
.zg-hd-summary b { color: #1e2924; }
.zg-hd-summary .zg-hd-pct {
    padding: 0 6px;
    border-radius: 999px;
    background: var(--zg-hd);
    color: #ffffff;
    font-weight: 700;
}
.zg-hd-summary .zg-hd-late { color: #c0392b; font-weight: 700; }

/* 7) โลโก้คู่ */
.zg-hd-partner {
    flex: 0 0 auto;
    height: clamp(26px, 2.2vw, 44px);
    width: auto;
    max-width: 140px;
    margin-left: 8px;
    padding-left: 10px;
    border-left: 1px solid #e3e8e5;
    object-fit: contain;
}

/* ปุ่มตั้งค่า */
.zg-hd-gear {
    position: absolute;
    top: -11px;
    right: -11px;
    z-index: 3;
    width: 26px;
    height: 26px;
    display: none;
    align-items: center;
    justify-content: center;
    border: 1px solid #dfe5e1;
    border-radius: 50%;
    background: #ffffff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, .15);
    font-size: 13px;
    cursor: pointer;
}
.plan-header:hover .zg-hd-gear,
.zg-hd-gear.is-open { display: inline-flex; }
.zg-hd-gear:hover { border-color: var(--zg-hd); }
.zg-hd-add {
    display: none;
    padding: 2px 9px;
    border: 1px dashed #c7d0cb;
    border-radius: 999px;
    background: transparent;
    color: #8a948f;
    font: 11px/1.5 Arial, Helvetica, sans-serif;
    cursor: pointer;
    white-space: nowrap;
    margin-left: 6px;
}
.plan-header:hover .zg-hd-add { display: inline-block; }
.zg-hd-add[hidden] { display: none !important; }
body.zg-exporting .zg-hd-gear,
body.zg-exporting .zg-hd-add { display: none !important; }

/* 6) รูปแบบหัวกระดาน */
.plan-header.zg-hd-style-band {
    padding: 0 14px 0 0;
    border-radius: 16px;
    background: var(--zg-hd-soft);
}
.plan-header.zg-hd-style-band .title-box {
    border: 0;
    border-left: 6px solid var(--zg-hd);
    border-radius: 16px 0 0 16px;
    background: transparent;
    min-width: 0;
}
.plan-header.zg-hd-style-band .header-green-line { margin-left: 14px; }
.plan-header.zg-hd-style-minimal .title-box {
    border-color: transparent;
    background: transparent;
    padding-left: 0;
    min-width: 0;
}
.plan-header.zg-hd-style-minimal .title { font-weight: 700; }

/* ---------- หน้าต่างตั้งค่า ---------- */
.zg-hd-pop {
    position: fixed;
    z-index: 26500;
    width: 360px;
    max-height: calc(100vh - 20px);
    overflow-y: auto;
    padding: 16px;
    box-sizing: border-box;
    border: 1px solid #e1e7e3;
    border-radius: 14px;
    background: #ffffff;
    box-shadow: 0 18px 48px rgba(15, 35, 25, .22);
    font: 12.5px/1.4 Arial, Helvetica, sans-serif;
    color: #1e2924;
    animation: zgHdIn .14s ease-out;
}
@keyframes zgHdIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
.zg-hd-pop h4 { margin: 0 0 12px; font-size: 15px; display: flex; align-items: center; gap: 8px; }
.zg-hd-pop h4 .zg-hd-pop-x { margin-left: auto; border: 0; background: #f1f4f2; border-radius: 8px; width: 28px; height: 28px; cursor: pointer; }
.zg-hd-sec { margin-top: 14px; }
.zg-hd-sec-title { margin-bottom: 6px; color: #66716b; font-size: 11px; font-weight: 700; }
.zg-hd-field { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.zg-hd-field span { width: 22px; text-align: center; font-size: 14px; }
.zg-hd-field input {
    flex: 1;
    height: 32px;
    padding: 0 10px;
    border: 1px solid #d6ded9;
    border-radius: 8px;
    font: inherit;
    color: inherit;
    background: #ffffff;
    outline: none;
}
.zg-hd-field input:focus { border-color: #3a8a4f; box-shadow: 0 0 0 3px rgba(58, 138, 79, .18); }
.zg-hd-opts { display: flex; flex-wrap: wrap; gap: 6px; }
.zg-hd-opt {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 30px;
    padding: 0 10px;
    border: 1px solid #dfe5e1;
    border-radius: 999px;
    background: #ffffff;
    color: inherit;
    font: inherit;
    cursor: pointer;
}
.zg-hd-opt:hover { border-color: #9fd0aa; }
.zg-hd-opt.is-on { border-color: #3a8a4f; background: #eef8f1; color: #1f6b38; font-weight: 700; }
.zg-hd-dot { width: 10px; height: 10px; border-radius: 50%; flex: 0 0 auto; }
.zg-hd-swatch {
    width: 28px;
    height: 28px;
    padding: 0;
    border: 2px solid #ffffff;
    border-radius: 50%;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, .12);
    cursor: pointer;
}
.zg-hd-swatch.is-on { box-shadow: 0 0 0 2px #1e2924; }
.zg-hd-color { width: 34px; height: 28px; padding: 0; border: 1px solid #d6ded9; border-radius: 8px; cursor: pointer; background: #ffffff; }
.zg-hd-styles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.zg-hd-style {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px;
    border: 1px solid #dfe5e1;
    border-radius: 10px;
    background: #ffffff;
    font: inherit;
    font-size: 11.5px;
    cursor: pointer;
    color: inherit;
}
.zg-hd-style.is-on { border-color: #3a8a4f; background: #eef8f1; font-weight: 700; color: #1f6b38; }
.zg-hd-mini { height: 22px; display: flex; align-items: center; gap: 4px; }
.zg-hd-mini i { display: block; }
.zg-hd-mini .b { width: 46%; height: 16px; border: 2px solid var(--c); border-radius: 8px; }
.zg-hd-mini .l { flex: 1; height: 2px; background: var(--c); }
.zg-hd-mini.band { background: color-mix(in srgb, var(--c) 18%, white); border-radius: 6px; }
.zg-hd-mini.band .b { border: 0; border-left: 4px solid var(--c); border-radius: 6px 0 0 6px; height: 22px; }
.zg-hd-mini.minimal .b { border-color: transparent; background: linear-gradient(var(--c), var(--c)) left center / 70% 3px no-repeat; }
.zg-hd-toggle { display: flex; align-items: flex-start; gap: 8px; margin-top: 8px; cursor: pointer; }
.zg-hd-toggle input { margin-top: 2px; accent-color: #3a8a4f; }
.zg-hd-toggle small { display: block; color: #8a948f; font-size: 10.5px; }
.zg-hd-toggle.is-disabled { opacity: .5; cursor: default; }

body.zg-dark .zg-hd-chip { background: #2b3330; border-color: #3a4440; color: #e3e9e5; }
body.zg-dark .zg-hd-summary { color: #a5b0aa; }
body.zg-dark .zg-hd-summary b { color: #e3e9e5; }
body.zg-dark .zg-hd-gear { background: #2b3330; border-color: #3a4440; }
body.zg-dark .zg-hd-pop { background: #222a27; border-color: #3a4440; color: #e3e9e5; }
body.zg-dark .zg-hd-field input,
body.zg-dark .zg-hd-opt,
body.zg-dark .zg-hd-style { background: #2b3330; border-color: #3a4440; color: #e3e9e5; }
body.zg-dark .zg-hd-opt.is-on,
body.zg-dark .zg-hd-style.is-on { background: #26372d; color: #9fd3ad; }
body.zg-dark .plan-header .title[contenteditable="true"]:focus,
body.zg-dark .plan-header .subtitle[contenteditable="true"]:focus { background: #2b3330; }
body.zg-exporting .zg-hd-pop { display: none !important; }
`;

    document.head.appendChild(style);


    /* =====================================================
       ELEMENTS
    ===================================================== */

    const chips = document.createElement("div");

    chips.className = "zg-hd-chips";

    const addButton = document.createElement("button");

    addButton.type = "button";
    addButton.className = "zg-hd-add";
    addButton.textContent = "＋ ข้อมูลโครงการ";

    const gear = document.createElement("button");

    gear.type = "button";
    gear.className = "zg-hd-gear";
    gear.textContent = "⚙";
    gear.title = "ตั้งค่าหัวกระดาน (ข้อมูลโครงการ · สถานะ · สี · รูปแบบ)";

    const partner = document.createElement("img");

    partner.className = "zg-hd-partner";
    partner.alt = "";
    partner.hidden = true;

    /* รูปว่าง 1px — <img> ที่ไม่มี src ทำให้ Export รูป / PDF / พิมพ์ A3 พัง */
    const BLANK_IMG = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    partner.src = BLANK_IMG;

    const titleText = titleBox.querySelector(".title-text");

    titleText.insertAdjacentElement("afterend", chips);
    chips.insertAdjacentElement("afterend", addButton);
    titleBox.appendChild(partner);
    titleBox.appendChild(gear);

    const fill = document.createElement("div");
    const summary = document.createElement("div");

    fill.className = "zg-hd-fill";
    summary.className = "zg-hd-summary";

    if (line) {
        line.appendChild(fill);
        line.appendChild(summary);
    }


    /* =====================================================
       HELPERS
    ===================================================== */

    function escapeHtml(text) {
        return String(text == null ? "" : text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    function hexToRgb(hex) {

        const value = parseInt(String(hex).slice(1), 16);

        return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
    }

    function fmt(date) {

        return typeof formatThaiDateShort === "function"
            ? formatThaiDateShort(date)
            : `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
    }

    function dayDiff(a, b) {

        return Math.round(
            (Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) -
             Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 86400000
        );
    }

    function addDaysSafe(date, days) {

        const next = new Date(date);

        next.setDate(next.getDate() + days);

        return next;
    }

    function recordHistory() {

        if (window.ZGHistory && typeof window.ZGHistory.record === "function") window.ZGHistory.record();
    }

    let recordTimer = null;

    function recordSoon() {

        clearTimeout(recordTimer);

        recordTimer = setTimeout(recordHistory, 500);
    }


    /* ---------- 5) สีหลักจากโลโก้ลูกค้า ---------- */

    let autoColorCache = { src: "", color: "" };

    function logoColor(callback) {

        const src = window.ZGPlanLogo && window.ZGPlanLogo.get ? window.ZGPlanLogo.get() : null;

        if (!src) {
            callback("");
            return;
        }

        if (autoColorCache.src === src) {
            callback(autoColorCache.color);
            return;
        }

        const image = new Image();

        image.onload = () => {

            try {

                const size = 48;
                const canvas = document.createElement("canvas");

                canvas.width = size;
                canvas.height = size;

                const context = canvas.getContext("2d");

                context.drawImage(image, 0, 0, size, size);

                const data = context.getImageData(0, 0, size, size).data;

                const buckets = new Map();

                for (let index = 0; index < data.length; index += 4) {

                    const [r, g, b, a] = [data[index], data[index + 1], data[index + 2], data[index + 3]];

                    if (a < 200) continue;

                    const max = Math.max(r, g, b);
                    const min = Math.min(r, g, b);

                    /* ข้ามสีขาว / ดำ / เทา */
                    if (max > 235 && min > 225) continue;
                    if (max < 40) continue;
                    if (max - min < 40) continue;

                    const key = `${r >> 5},${g >> 5},${b >> 5}`;

                    const bucket = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 };

                    bucket.n += 1;
                    bucket.r += r;
                    bucket.g += g;
                    bucket.b += b;

                    buckets.set(key, bucket);
                }

                let best = null;

                buckets.forEach(bucket => { if (!best || bucket.n > best.n) best = bucket; });

                const color = best
                    ? "#" + [best.r / best.n, best.g / best.n, best.b / best.n].map(v => Math.round(v).toString(16).padStart(2, "0")).join("")
                    : "";

                autoColorCache = { src, color };

                callback(color);

            } catch (error) {

                callback("");
            }
        };

        image.onerror = () => callback("");

        image.src = src;
    }


    /* =====================================================
       RENDER
    ===================================================== */

    function applyColor(color) {

        const value = /^#[0-9a-f]{6}$/i.test(color || "") ? color : "#7ac143";

        const [r, g, b] = hexToRgb(value);

        header.style.setProperty("--zg-hd", value);
        header.style.setProperty("--zg-hd-soft", `rgba(${r}, ${g}, ${b}, .14)`);
    }

    function renderTheme() {

        if (settings.theme === "auto") {
            logoColor(color => applyColor(color || "#7ac143"));
        } else if (settings.theme === "custom") {
            applyColor(settings.customColor || "#7ac143");
        } else {
            const theme = THEMES.find(item => item.key === settings.theme) || THEMES[0];
            applyColor(theme.color);
        }

        STYLES.forEach(item => header.classList.toggle(`zg-hd-style-${item.key}`, settings.style === item.key));
    }

    function renderChips() {

        const status = STATUSES.find(item => item.key === settings.status);

        const parts = [];

        if (status && status.key) {
            parts.push(`<span class="zg-hd-chip zg-hd-status" data-hd="status" style="background:${status.color}">${escapeHtml(status.label)}</span>`);
        }

        INFO_FIELDS.forEach(field => {

            const value = (settings.info[field.key] || "").trim();

            if (value) {
                parts.push(`<span class="zg-hd-chip" data-hd="info" title="${escapeHtml(field.label)}: ${escapeHtml(value)}">${field.icon} ${escapeHtml(value)}</span>`);
            }
        });

        chips.innerHTML = parts.join("");

        addButton.style.visibility = parts.length ? "hidden" : "";
        addButton.hidden = Boolean(parts.length);
    }

    /* 3) 4) */
    function renderSummary() {

        if (!line) return;

        /* เอาสรุปบนเส้นหัวกระดานออก */
        summary.innerHTML = "";
        fill.style.width = "0";
        header.classList.remove("zg-hd-has-progress");

        if (line) return;

        const tasks = (typeof timelineObjects !== "undefined" ? timelineObjects : []).filter(object => object.type === "task");

        if (!settings.showSummary || typeof timelineStartDate === "undefined" || !timelineStartDate || !(pxPerDay > 0)) {

            summary.innerHTML = "";
            fill.style.width = "0";
            header.classList.remove("zg-hd-has-progress");

            return;
        }

        let start;
        let end;

        if (tasks.length) {

            const starts = tasks.map(task => Math.round(task.x / pxPerDay));
            const ends = tasks.map(task => Math.round((task.x + task.width) / pxPerDay) - 1);

            start = addDaysSafe(timelineStartDate, Math.min(...starts));
            end = addDaysSafe(timelineStartDate, Math.max(...ends));

        } else {

            start = new Date(timelineStartDate);
            end = new Date(timelineEndDate);
        }

        const totalDays = Math.max(1, dayDiff(start, end) + 1);

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const passed = Math.max(0, Math.min(totalDays, dayDiff(start, today) + 1));
        const pct = Math.round((passed / totalDays) * 100);

        const months = Math.max(1, Math.round(totalDays / 30.4));

        const left = dayDiff(today, end);

        let remain;

        if (today < start) {
            remain = `เริ่มอีก <b>${dayDiff(today, start)}</b> วัน`;
        } else if (left >= 0) {
            remain = `เหลืออีก <b>${left}</b> วัน`;
        } else {
            remain = `<span class="zg-hd-late">ครบกำหนดแล้ว</span>`;
        }

        summary.innerHTML = `
            <span>ระยะเวลา <b>${months}</b> เดือน</span><span>·</span>
            <span><b>${tasks.length}</b> งาน</span><span>·</span>
            <span>${remain}</span>
        `;

        /* ไม่แสดงหลอดความคืบหน้า */
        fill.style.width = "0";
        header.classList.remove("zg-hd-has-progress");
    }

    /* 7) โลโก้คู่ */
    let applyingLogo = false;

    function renderLogos() {

        if (!logo) return;

        const custom = window.ZGPlanLogo && window.ZGPlanLogo.get ? window.ZGPlanLogo.get() : null;
        const companySrc = logo.dataset.zgDefaultSrc || "logo.png";

        applyingLogo = true;

        if (settings.dualLogo && custom) {

            if (logo.getAttribute("src") !== companySrc) logo.setAttribute("src", companySrc);

            logo.classList.remove("zg-logo-custom");

            partner.src = custom;
            partner.hidden = false;

        } else {

            if (custom && logo.getAttribute("src") !== custom) {
                logo.setAttribute("src", custom);
                logo.classList.add("zg-logo-custom");
            }

            partner.hidden = true;
            partner.src = BLANK_IMG;
        }

        applyingLogo = false;
    }

    /* image-logo.js เปลี่ยนโลโก้ → จัดโลโก้คู่ใหม่ */
    if (logo) {

        new MutationObserver(() => {
            if (!applyingLogo) setTimeout(() => { renderLogos(); renderTheme(); }, 0);
        }).observe(logo, { attributes: true, attributeFilter: ["src"] });
    }

    /* 8) บรรทัดรอง */
    function decorateSubtitle() {

        titleEl.classList.add("zg-hd-empty");
        titleEl.dataset.placeholder = "พิมพ์หัวข้อแผน";

        if (document.activeElement !== titleEl && TITLE_DEFAULTS.includes(titleEl.textContent.trim())) {
            titleEl.textContent = "";
        }

        subtitleEl.classList.add("zg-hd-empty");
        subtitleEl.dataset.placeholder = "ชื่อลูกค้า / โครงการ";

        if (document.activeElement !== subtitleEl && SUBTITLE_DEFAULTS.includes(subtitleEl.textContent.trim())) {
            subtitleEl.textContent = "";
        }
    }

    function renderAll() {

        renderTheme();
        renderChips();
        renderSummary();
        renderLogos();
        decorateSubtitle();
        refreshLayout();
    }

    function refreshLayout() {

        if (window.ZGZoomFocus && typeof window.ZGZoomFocus.refresh === "function") {
            requestAnimationFrame(() => window.ZGZoomFocus.refresh());
        }
    }


    /* =====================================================
       8) 9) แก้ชื่อ / บรรทัดรอง
    ===================================================== */

    let original = null;

    [titleEl, subtitleEl].forEach(element => {

        element.addEventListener("focus", () => { original = element.textContent; });

        element.addEventListener("keydown", event => {

            if (event.isComposing) return;

            if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                element.blur();
            }

            if (event.key === "Escape") {
                event.preventDefault();
                if (original !== null) element.textContent = original;
                element.blur();
            }
        });

        element.addEventListener("paste", event => {

            const text = event.clipboardData && event.clipboardData.getData("text/plain");

            if (text == null) return;

            event.preventDefault();

            document.execCommand("insertText", false, text.replace(/\s*[\r\n]+\s*/g, " "));
        });

        element.addEventListener("blur", () => {

            const clean = element.textContent.replace(/\s+/g, " ").trim();

            if (clean !== element.textContent) element.textContent = clean;

            if (element === titleEl) decorateSubtitle();

            if (element === subtitleEl) {

                decorateSubtitle();

                /* 9) ชื่อแผนตามบรรทัดรอง */
                if (settings.syncPlanName && clean && window.ZGPlans && typeof window.ZGPlans.renameCurrent === "function") {

                    const current = typeof window.ZGPlans.currentName === "function" ? window.ZGPlans.currentName() : "";

                    if (current !== clean) window.ZGPlans.renameCurrent(clean);
                }
            }

            if (original !== null && original !== element.textContent) recordHistory();

            original = null;

            refreshLayout();
        });
    });


    /* =====================================================
       หน้าต่างตั้งค่า
    ===================================================== */

    let pop = null;

    function closePop() {

        if (pop) {
            pop.remove();
            pop = null;
        }

        gear.classList.remove("is-open");
    }

    function currentColor() {

        if (settings.theme === "custom") return settings.customColor || "#7ac143";

        const theme = THEMES.find(item => item.key === settings.theme);

        return theme ? theme.color : getComputedStyle(header).getPropertyValue("--zg-hd").trim() || "#7ac143";
    }

    function popHtml() {

        const hasLogo = Boolean(window.ZGPlanLogo && window.ZGPlanLogo.get && window.ZGPlanLogo.get());
        const color = currentColor();

        return `
            <h4>🗂 หัวกระดาน <button type="button" class="zg-hd-pop-x" data-hd-act="close">✕</button></h4>

            <div class="zg-hd-sec">
                <div class="zg-hd-sec-title">ข้อมูลโครงการ (ไม่ใส่ = ไม่แสดง)</div>
                ${INFO_FIELDS.map(field => `
                    <label class="zg-hd-field" title="${escapeHtml(field.label)}">
                        <span>${field.icon}</span>
                        <input type="text" data-hd-info="${field.key}" value="${escapeHtml(settings.info[field.key])}" placeholder="${escapeHtml(field.label)} — ${escapeHtml(field.placeholder)}" maxlength="120">
                    </label>`).join("")}
            </div>

            <div class="zg-hd-sec">
                <div class="zg-hd-sec-title">สถานะดีล</div>
                <div class="zg-hd-opts">
                    ${STATUSES.map(item => `
                        <button type="button" class="zg-hd-opt ${settings.status === item.key ? "is-on" : ""}" data-hd-status="${item.key}">
                            <span class="zg-hd-dot" style="background:${item.color}"></span>${escapeHtml(item.label)}
                        </button>`).join("")}
                </div>
            </div>

            <div class="zg-hd-sec">
                <div class="zg-hd-sec-title">สีหัวกระดาน</div>
                <div class="zg-hd-opts">
                    ${THEMES.map(item => `
                        <button type="button" class="zg-hd-swatch ${settings.theme === item.key ? "is-on" : ""}" data-hd-theme="${item.key}" title="${escapeHtml(item.label)}" style="background:${item.color}"></button>`).join("")}
                    <input type="color" class="zg-hd-color" data-hd-custom value="${escapeHtml(settings.customColor || color)}" title="เลือกสีเอง">
                    <button type="button" class="zg-hd-opt ${settings.theme === "auto" ? "is-on" : ""}" data-hd-theme="auto" ${hasLogo ? "" : "disabled title=\"ตั้งโลโก้ลูกค้าก่อน (คลิกที่โลโก้)\""}>🎨 ตามโลโก้ลูกค้า</button>
                </div>
            </div>

            <div class="zg-hd-sec">
                <div class="zg-hd-sec-title">รูปแบบ</div>
                <div class="zg-hd-styles">
                    ${STYLES.map(item => `
                        <button type="button" class="zg-hd-style ${settings.style === item.key ? "is-on" : ""}" data-hd-style="${item.key}">
                            <span class="zg-hd-mini ${item.key}" style="--c:${escapeHtml(color)}"><i class="b"></i><i class="l"></i></span>
                            ${escapeHtml(item.label)}
                        </button>`).join("")}
                </div>
            </div>

            <div class="zg-hd-sec">
                <label class="zg-hd-toggle ${hasLogo ? "" : "is-disabled"}">
                    <input type="checkbox" data-hd-toggle="dualLogo" ${settings.dualLogo ? "checked" : ""} ${hasLogo ? "" : "disabled"}>
                    <span>โลโก้คู่ (บริษัท + ลูกค้า)<small>${hasLogo ? "โลโก้บริษัทซ้าย · โลโก้ลูกค้าขวา" : "ตั้งโลโก้ลูกค้าก่อน — คลิกที่โลโก้มุมซ้าย"}</small></span>
                </label>
                <label class="zg-hd-toggle">
                    <input type="checkbox" data-hd-toggle="syncPlanName" ${settings.syncPlanName ? "checked" : ""}>
                    <span>ชื่อแผนตามบรรทัดรอง<small>แก้ชื่อลูกค้า/โครงการใต้หัวข้อ → ชื่อในช่องเลือกแผนเปลี่ยนตาม</small></span>
                </label>
            </div>
        `;
    }

    function openPop(focusKey) {

        closePop();

        if (typeof closeObjectMenu === "function") closeObjectMenu();

        pop = document.createElement("div");

        pop.className = "zg-hd-pop";
        pop.innerHTML = popHtml();

        pop.addEventListener("mousedown", event => event.stopPropagation());

        pop.addEventListener("input", event => {

            const target = event.target;

            if (target.dataset.hdInfo) {
                settings.info[target.dataset.hdInfo] = target.value;
                renderChips();
                refreshLayout();
                recordSoon();
            }

            if (target.matches("[data-hd-custom]")) {
                settings.theme = "custom";
                settings.customColor = target.value;
                renderTheme();
                syncPop();
                recordSoon();
            }
        });

        pop.addEventListener("change", event => {

            const target = event.target;

            if (target.dataset.hdToggle) {
                settings[target.dataset.hdToggle] = target.checked;
                renderAll();
                recordHistory();
            }
        });

        pop.addEventListener("click", event => {

            const button = event.target.closest("button");

            if (!button || button.disabled) return;

            if (button.dataset.hdAct === "close") {
                closePop();
                return;
            }

            if (button.dataset.hdStatus !== undefined) settings.status = button.dataset.hdStatus;
            if (button.dataset.hdTheme) settings.theme = button.dataset.hdTheme;
            if (button.dataset.hdStyle) settings.style = button.dataset.hdStyle;

            renderAll();
            syncPop();
            recordHistory();
        });

        pop.addEventListener("keydown", event => {

            if (event.key === "Escape") {
                event.stopPropagation();
                closePop();
            }

            if (event.key === "Enter" && event.target.matches("input[type=text]")) {
                event.preventDefault();
                const inputs = Array.from(pop.querySelectorAll("input[type=text]"));
                const next = inputs[inputs.indexOf(event.target) + 1];
                if (next) next.focus(); else event.target.blur();
            }
        });

        document.body.appendChild(pop);

        const rect = titleBox.getBoundingClientRect();

        const left = Math.max(8, Math.min(rect.left, window.innerWidth - pop.offsetWidth - 8));
        const top = Math.min(rect.bottom + 8, window.innerHeight - pop.offsetHeight - 8);

        pop.style.left = `${left}px`;
        pop.style.top = `${Math.max(8, top)}px`;

        gear.classList.add("is-open");

        const first = pop.querySelector(focusKey === "status" ? "[data-hd-status].is-on" : "input[data-hd-info]");

        if (first) first.focus();
    }

    /* ปุ่มที่เลือกอยู่ / ภาพตัวอย่างสี — อัปเดตโดยไม่สร้างใหม่ (ไม่เสียโฟกัสช่องพิมพ์) */
    function syncPop() {

        if (!pop) return;

        const color = currentColor();

        pop.querySelectorAll("[data-hd-status]").forEach(node => node.classList.toggle("is-on", node.dataset.hdStatus === settings.status));
        pop.querySelectorAll("[data-hd-theme]").forEach(node => node.classList.toggle("is-on", node.dataset.hdTheme === settings.theme));
        pop.querySelectorAll("[data-hd-style]").forEach(node => node.classList.toggle("is-on", node.dataset.hdStyle === settings.style));
        pop.querySelectorAll(".zg-hd-mini").forEach(node => node.style.setProperty("--c", color));
    }

    gear.addEventListener("click", event => {
        event.stopPropagation();
        if (pop) closePop(); else openPop();
    });

    addButton.addEventListener("click", event => {
        event.stopPropagation();
        openPop();
    });

    chips.addEventListener("click", event => {

        const chip = event.target.closest(".zg-hd-chip");

        if (!chip) return;

        event.stopPropagation();

        openPop(chip.dataset.hd);
    });

    document.addEventListener("mousedown", event => {

        if (pop && !pop.contains(event.target) && !gear.contains(event.target)) closePop();
    });

    window.addEventListener("resize", closePop);


    /* =====================================================
       SAVE / LOAD กับแผน + อัปเดตสรุปเมื่อแผนเปลี่ยน
    ===================================================== */

    const io = window.ZGPlanIO;

    const originalBuild = io.build;

    io.build = function () {

        const data = originalBuild.apply(this, arguments);

        if (data && typeof data === "object") {

            data.header = JSON.parse(JSON.stringify(settings));

            /* บรรทัดรองว่าง (คำแนะนำ) → บันทึกเป็นค่าว่าง */
            if (!subtitleEl.textContent.trim()) data.subtitle = "";
            if (!titleEl.textContent.trim()) data.title = "";
        }

        return data;
    };

    const originalApply = io.apply;

    io.apply = function (data) {

        const result = originalApply.apply(this, arguments);

        try {

            closePop();

            settings = normalize(data && data.header);

            renderAll();

        } catch (error) {

            console.error("[header-plus.js]", error);
        }

        return result;
    };

    if (typeof renderObjects === "function") {

        const originalRender = renderObjects;

        renderObjects = function () {

            const result = originalRender.apply(this, arguments);

            try {
                renderSummary();
            } catch (error) { /* ignore */ }

            return result;
        };
    }

    /* ข้ามวัน → อัปเดตความคืบหน้า */
    setInterval(renderSummary, 10 * 60 * 1000);

    renderAll();


    window.ZGHeader = {
        open: openPop,
        get: () => JSON.parse(JSON.stringify(settings)),
        refresh: renderAll
    };

})();
