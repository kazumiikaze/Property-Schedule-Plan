"use strict";

/* =========================================================
   EXPORT-PLUS.JS — เพิ่มความสามารถให้ปุ่ม ↑ Export
   1) ตั้งชื่อไฟล์อัตโนมัติจาก ลูกค้า / ชื่อแผน + วันที่ (แก้ได้ก่อนดาวน์โหลด)
   2) หน้าตัวอย่างก่อนดาวน์โหลด
   3) ตัวเลือก PDF: กระดาษ A3 / A4, แบ่งหลายหน้าตามเดือน,
      เลขหน้า และข้อมูลบริษัทท้ายหน้า
   4) 🗄 สำรองทุกแผนในเครื่องเป็นไฟล์เดียว และกู้คืนจากไฟล์สำรอง
   - ใช้ ZGExportImage.capture (export-image.js) ถ่ายภาพเหมือนเดิม
   - ไม่แก้ app.js / style.css — โหลดหลัง export-image.js, plans.js, templates.js
========================================================= */

(function () {

    const exporter = window.ZGExportImage;

    if (!exporter || typeof exporter.capture !== "function") {
        console.warn("[export-plus.js] ไม่พบ export-image.js");
        return;
    }

    const PLANS_KEY = "zg-property-schedule-plans-v1";
    const TEMPLATES_KEY = "zg-property-schedule-templates-v1";
    const OPTS_KEY = "zg-export-options-v1";
    const LAST_BACKUP_KEY = "zg-backup-last-v1";
    const BACKUP_TYPE = "zg-property-schedule-backup";

    const PAPER = {
        a3: { w: 420, h: 297, label: "A3" },
        a4: { w: 297, h: 210, label: "A4" }
    };

    const JSPDF_SOURCES = [
        "lib/jspdf.umd.min.js",
        "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
        "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js"
    ];

    const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    /* ข้อความที่สร้างขึ้นเอง (ตัวเลขเปลี่ยนได้ / วาดลงภาพ) → เลือกภาษาตามปุ่ม 🌐 */
    function lang() {
        try {
            return (window.ZGLang && window.ZGLang.get && window.ZGLang.get()) || "th";
        } catch (error) {
            return "th";
        }
    }

    function L(th, en, ja) {
        const current = lang();
        return current === "en" ? en : current === "ja" ? ja : th;
    }

    const MONTHS_TH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];


    /* =====================================================
       STYLE
    ===================================================== */

    const style = document.createElement("style");

    style.textContent = `
.zg-xp-overlay {
    position: fixed; inset: 0; z-index: 31000;
    background: rgba(20, 30, 26, .45);
    display: flex; align-items: center; justify-content: center;
    padding: 16px; box-sizing: border-box;
}
.zg-xp-dialog {
    width: min(1060px, 100%); max-height: calc(100vh - 32px);
    background: #fff; border-radius: 14px;
    box-shadow: 0 18px 50px rgba(0,0,0,.25);
    display: flex; flex-direction: column; overflow: hidden;
    font-size: 13px; color: #1e2924;
}
.zg-xp-head {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 16px; border-bottom: 1px solid #e3ebe7;
}
.zg-xp-title { font-weight: 700; font-size: 15px; flex: 1; }
.zg-xp-x { border: 0; background: none; font-size: 20px; cursor: pointer; color: #66736d; line-height: 1; }
.zg-xp-body { display: flex; min-height: 0; flex: 1; }
.zg-xp-preview {
    flex: 1; min-width: 0; overflow: auto;
    background: #e9eeec; padding: 16px;
    display: flex; flex-wrap: wrap; gap: 14px; align-content: flex-start; justify-content: center;
}
.zg-xp-page { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.zg-xp-page canvas { background: #fff; box-shadow: 0 2px 10px rgba(0,0,0,.18); max-width: 100%; height: auto; }
.zg-xp-page-label { font-size: 11px; color: #5c6a64; }
.zg-xp-wait { margin: auto; color: #5c6a64; font-size: 13px; text-align: center; }
.zg-xp-side {
    width: 290px; flex: none; padding: 14px 16px;
    border-left: 1px solid #e3ebe7; overflow-y: auto;
    display: flex; flex-direction: column; gap: 12px;
}
.zg-xp-label { font-weight: 700; font-size: 12px; color: #3b4a43; margin-bottom: 5px; }
.zg-xp-name { display: flex; align-items: center; gap: 4px; }
.zg-xp-name input {
    flex: 1; min-width: 0; padding: 6px 8px; border: 1px solid #cbd8d2; border-radius: 7px; font: inherit;
}
.zg-xp-ext { color: #66736d; font-size: 12px; }
.zg-xp-seg { display: flex; border: 1px solid #cbd8d2; border-radius: 8px; overflow: hidden; }
.zg-xp-seg button {
    flex: 1; border: 0; background: #fff; padding: 6px 4px; cursor: pointer; font: inherit; font-size: 12px;
}
.zg-xp-seg button + button { border-left: 1px solid #cbd8d2; }
.zg-xp-seg button.on { background: #2e8b57; color: #fff; font-weight: 700; }
.zg-xp-check { display: flex; align-items: center; gap: 6px; margin: 4px 0; cursor: pointer; }
.zg-xp-hint { font-size: 11px; color: #74817b; line-height: 1.45; }
.zg-xp-disabled { opacity: .45; pointer-events: none; }
.zg-xp-foot {
    display: flex; align-items: center; gap: 8px;
    padding: 10px 16px; border-top: 1px solid #e3ebe7;
}
.zg-xp-info { flex: 1; font-size: 12px; color: #5c6a64; }
.zg-xp-btn {
    border: 1px solid #cbd8d2; background: #fff; border-radius: 8px;
    padding: 7px 14px; cursor: pointer; font: inherit;
}
.zg-xp-btn.primary { background: #2e8b57; border-color: #2e8b57; color: #fff; font-weight: 700; }
.zg-xp-btn:disabled { opacity: .5; cursor: default; }
.zg-xp-cover { position: fixed; background: #fff; z-index: 2147483000; pointer-events: none; }
.zg-xp-restore-list { max-height: 300px; overflow-y: auto; border: 1px solid #e3ebe7; border-radius: 8px; padding: 4px 8px; }
.zg-xp-restore-list label { display: flex; align-items: center; gap: 8px; padding: 5px 0; border-bottom: 1px solid #f0f4f2; }
.zg-xp-restore-list label:last-child { border-bottom: 0; }
.zg-xp-restore-list .meta { margin-left: auto; font-size: 11px; color: #74817b; white-space: nowrap; }
.zg-xp-tag { font-size: 10px; padding: 1px 6px; border-radius: 9px; background: #eef3f0; color: #5c6a64; }
.zg-xp-backup-note { font-size: 11px; color: #74817b; padding: 2px 10px 4px; }
.zg-xp-backup-note.old { color: #c0612b; }
body.zg-dark .zg-xp-dialog { background: #1f2724; color: #e6ece9; }
body.zg-dark .zg-xp-side, body.zg-dark .zg-xp-head, body.zg-dark .zg-xp-foot { border-color: #34403b; }
body.zg-dark .zg-xp-preview { background: #151b19; }
body.zg-dark .zg-xp-btn, body.zg-dark .zg-xp-seg button, body.zg-dark .zg-xp-name input { background: #26302c; color: #e6ece9; border-color: #3d4a44; }
body.zg-dark .zg-xp-seg button.on, body.zg-dark .zg-xp-btn.primary { background: #2e8b57; color: #fff; }
@media (max-width: 760px) {
    .zg-xp-body { flex-direction: column; }
    .zg-xp-side { width: auto; border-left: 0; border-top: 1px solid #e3ebe7; }
    .zg-xp-preview { min-height: 220px; }
}
`;

    document.head.appendChild(style);


    /* =====================================================
       HELPERS
    ===================================================== */

    function toast(message, isError) {

        if (window.ZGImage && typeof window.ZGImage.toast === "function") {
            window.ZGImage.toast(message, isError);
            return;
        }

        console.log("[export-plus]", message);
    }

    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    function pad(n) {
        return String(n).padStart(2, "0");
    }

    function isoDay(date) {
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    }

    function thaiDay(date) {
        return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
    }

    function wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function frames(count) {
        return new Promise(resolve => {
            const step = left => left <= 0 ? resolve() : requestAnimationFrame(() => step(left - 1));
            step(count);
        });
    }

    function readJson(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (error) {
            return fallback;
        }
    }

    function writeJson(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            return false;
        }
    }

    function downloadBlob(blob, fileName) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 3000);
    }

    function cleanFileName(text) {
        return String(text || "")
            .trim()
            .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "-")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .replace(/^[-.]+|[-.]+$/g, "")
            .slice(0, 90);
    }

    function closeExportMenu() {
        /* export-image.js ปิดเมนูเมื่อคลิกนอกเมนู */
        document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
        const menu = document.querySelector(".zg-export-menu");
        if (menu) menu.remove();
    }


    /* =====================================================
       2) ชื่อไฟล์อัตโนมัติ
    ===================================================== */

    const DEFAULT_TITLES = ["property schedule plan", "พิมพ์หัวข้อแผน", ""];

    function planInfo() {

        let data = {};

        try {
            data = window.ZGPlanIO && window.ZGPlanIO.build ? window.ZGPlanIO.build() : {};
        } catch (error) {
            data = {};
        }

        const header = window.ZGHeader && window.ZGHeader.get ? window.ZGHeader.get() : (data.header || {});
        const customer = String((header && header.info && header.info.customer) || "").trim();

        const title = String(data.title || "").trim();
        const subtitle = String(data.subtitle || "").trim();
        const planName = window.ZGPlans && window.ZGPlans.currentName ? String(window.ZGPlans.currentName() || "").trim() : "";

        const usefulTitle = DEFAULT_TITLES.includes(title.toLowerCase()) ? "" : title;

        return {
            customer,
            name: subtitle || usefulTitle || planName || "plan",
            title: usefulTitle || subtitle || planName || "Property schedule plan"
        };
    }

    function autoFileName(kind) {

        const info = planInfo();

        const parts = [];

        if (info.customer) parts.push(info.customer);
        if (info.name && info.name !== info.customer) parts.push(info.name);

        const base = cleanFileName(parts.join("-")) || "plan";

        return `${base}${kind === "table" ? "_ตาราง" : ""}_${isoDay(new Date())}`;
    }


    /* =====================================================
       OPTIONS (จำค่าที่เลือกล่าสุด)
    ===================================================== */

    const options = Object.assign(
        { paper: "a3", pages: "single", pageNumbers: true, footer: true },
        readJson(OPTS_KEY, {})
    );

    function saveOptions() {
        writeJson(OPTS_KEY, {
            paper: options.paper,
            pages: options.pages,
            pageNumbers: options.pageNumbers,
            footer: options.footer
        });
    }


    /* =====================================================
       CAPTURE — หน้าเดียว / หลายหน้าตามเดือน
    ===================================================== */

    function hasTimeline() {
        return typeof timelineViewport !== "undefined" &&
            typeof timelineWidthPx !== "undefined" &&
            typeof pxPerDay !== "undefined" &&
            typeof timelineStartDate !== "undefined" &&
            timelineWidthPx > 0 && pxPerDay > 0;
    }

    function dayAt(days) {
        const date = new Date(timelineStartDate);
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() + days);
        return date;
    }

    function monthBoundaries() {

        const list = [];
        const start = new Date(timelineStartDate);
        const cursor = new Date(start.getFullYear(), start.getMonth() + 1, 1);

        for (let guard = 0; guard < 600; guard += 1) {
            const x = Math.round(
                (Date.UTC(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()) -
                    Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / 86400000 * pxPerDay
            );
            if (x >= timelineWidthPx - 1) break;
            list.push(x);
            cursor.setMonth(cursor.getMonth() + 1);
        }

        return list;
    }

    function rangeLabel(fromX, toX) {

        const first = Math.round(fromX / pxPerDay);
        const a = dayAt(first);
        const b = dayAt(Math.max(first, Math.round(toX / pxPerDay) - 1));

        const fmt = date => L(
            `${MONTHS_TH[date.getMonth()]} ${date.getFullYear() + 543}`,
            `${MONTHS_EN[date.getMonth()]} ${date.getFullYear()}`,
            `${date.getFullYear()}年${date.getMonth() + 1}月`
        );

        const left = fmt(a);
        const right = fmt(b);

        return left === right ? left : `${left} – ${right}`;
    }

    /* ความกว้างของตารางที่เห็นบนจอ */
    function visibleTimelineWidth() {

        const rect = timelineViewport.getBoundingClientRect();
        const area = document.getElementById("scheduleArea");
        const right = area ? Math.min(rect.right, area.getBoundingClientRect().right) : rect.right;

        return Math.max(50, Math.floor(right - rect.left));
    }

    /* แบ่งช่วงตามเดือน: แต่ละหน้า = เดือนเต็ม ๆ ที่ใส่ในความกว้างจอได้ */
    function planSegments() {

        const total = timelineWidthPx;
        const visible = visibleTimelineWidth();
        const bounds = monthBoundaries();
        const segments = [];

        let start = 0;

        for (let guard = 0; guard < 200 && start < total - 1; guard += 1) {

            const limit = start + visible;

            let end;

            if (limit >= total) {
                end = total;
            } else {
                const fit = bounds.filter(x => x > start + 1 && x <= limit);
                end = fit.length ? fit[fit.length - 1] : limit;
            }

            segments.push({ start, end });

            start = end;
        }

        return segments;
    }

    async function captureSingle(kind) {

        const canvas = await exporter.capture(kind, { pixelRatio: 2 });

        let label = "";

        if (hasTimeline()) {
            const from = timelineViewport.scrollLeft;
            label = rangeLabel(from, Math.min(timelineWidthPx, from + visibleTimelineWidth()));
        }

        return [{ canvas, label }];
    }

    async function captureByMonths(kind, onProgress) {

        if (!hasTimeline()) return captureSingle(kind);

        const segments = planSegments();

        if (segments.length <= 1) return captureSingle(kind);

        const content = typeof timelineContent !== "undefined" ? timelineContent : null;
        const bracket = typeof bracketContent !== "undefined" ? bracketContent : null;
        const bracketView = typeof bracketViewport !== "undefined" ? bracketViewport : null;

        const saved = {
            scroll: timelineViewport.scrollLeft,
            content: content ? [content.style.width, content.style.minWidth] : null,
            bracket: bracket ? [bracket.style.width, bracket.style.minWidth] : null
        };

        /* ขยายพื้นที่เลื่อนชั่วคราว ให้หน้าสุดท้ายเลื่อนไปเริ่มที่เดือนแรกของหน้าได้ */
        const extended = `${timelineWidthPx + visibleTimelineWidth() + 40}px`;

        [content, bracket].forEach(element => {
            if (element) {
                element.style.width = extended;
                element.style.minWidth = extended;
            }
        });

        const pages = [];
        let cover = null;

        try {

            for (let i = 0; i < segments.length; i += 1) {

                const segment = segments[i];

                if (onProgress) onProgress(i + 1, segments.length);

                timelineViewport.scrollLeft = segment.start;
                if (bracketView) bracketView.scrollLeft = segment.start;
                timelineViewport.dispatchEvent(new Event("scroll"));

                await frames(3);
                await wait(40);

                /* ส่วนที่เกินเดือนสุดท้ายของหน้า → ปิดด้วยแผ่นขาว */
                const viewRect = timelineViewport.getBoundingClientRect();
                const coverLeft = viewRect.left + (segment.end - timelineViewport.scrollLeft) + 1;

                const parts = [
                    document.getElementById("timelineHeader"),
                    document.getElementById("scheduleArea"),
                    document.getElementById("bracketArea") || document.querySelector(".bracket-area")
                ].filter(Boolean).map(element => element.getBoundingClientRect());

                const right = Math.max(...parts.map(rect => rect.right));

                if (segment.end < timelineWidthPx && coverLeft < right - 1) {

                    cover = document.createElement("div");
                    cover.className = "zg-xp-cover";
                    cover.style.left = `${coverLeft}px`;
                    cover.style.top = `${Math.min(...parts.map(rect => rect.top))}px`;
                    cover.style.width = `${right - coverLeft}px`;
                    cover.style.height = `${Math.max(...parts.map(rect => rect.bottom)) - Math.min(...parts.map(rect => rect.top))}px`;
                    document.body.appendChild(cover);
                }

                const canvas = await exporter.capture(kind, { pixelRatio: 2 });

                if (cover) {
                    cover.remove();
                    cover = null;
                }

                pages.push({ canvas, label: rangeLabel(segment.start, segment.end) });
            }

        } finally {

            if (cover) cover.remove();

            if (content && saved.content) {
                content.style.width = saved.content[0];
                content.style.minWidth = saved.content[1];
            }

            if (bracket && saved.bracket) {
                bracket.style.width = saved.bracket[0];
                bracket.style.minWidth = saved.bracket[1];
            }

            timelineViewport.scrollLeft = saved.scroll;
            if (bracketView) bracketView.scrollLeft = saved.scroll;
            timelineViewport.dispatchEvent(new Event("scroll"));
        }

        return pages;
    }


    /* =====================================================
       COMPOSE — วางภาพลงหน้ากระดาษ + ท้ายหน้า
    ===================================================== */

    function companyText() {

        const footer = document.getElementById("companyFooter") || document.querySelector(".company-footer");

        if (!footer) return "";

        const logo = footer.querySelector("img[alt]");
        const contact = footer.querySelector(".footer-contact");

        const name = logo ? logo.getAttribute("alt").trim() : "";
        const text = contact ? contact.innerText.replace(/\s+/g, " ").trim() : "";

        return [name, text].filter(Boolean).join("  ·  ");
    }

    function fontFamily() {
        try {
            return getComputedStyle(document.body).fontFamily || "sans-serif";
        } catch (error) {
            return "sans-serif";
        }
    }

    /* ขนาดร่วมของทุกหน้า (ทุกหน้าใช้สเกลเดียวกัน ภาพต่อกันได้พอดี) */
    function layoutFor(pages, opts) {

        const paper = PAPER[opts.paper] || PAPER.a3;
        const ratio = paper.w / paper.h;

        const maxW = Math.max(...pages.map(page => page.canvas.width));
        const maxH = Math.max(...pages.map(page => page.canvas.height));

        /* ระยะขอบ แคบ / ปกติ / กว้าง (export-compact.js) */
        const compact = window.ZGExportCompact;
        const marginR = compact ? compact.margin().ratio : 0.022;
        const footerR = (opts.footer || opts.pageNumbers) ? 0.04 : 0;

        let pageW = Math.max(maxW / (1 - marginR * 2), (maxH / (1 - marginR * 2 * ratio - footerR)) * ratio);

        pageW = Math.min(pageW, 5200);

        const pageH = pageW / ratio;
        const margin = pageW * marginR;
        const footerH = pageH * footerR;

        const availW = pageW - margin * 2;
        const availH = pageH - margin * 2 - footerH;

        const scale = Math.min(availW / maxW, availH / maxH);

        return {
            pageW, pageH, margin, footerH, scale,
            offsetX: margin + (availW - maxW * scale) / 2,
            offsetY: margin + (availH - maxH * scale) / 2
        };
    }

    function composePage(pages, index, opts, layout, outWidth) {

        const k = outWidth / layout.pageW;

        const canvas = document.createElement("canvas");
        canvas.width = Math.round(layout.pageW * k);
        canvas.height = Math.round(layout.pageH * k);

        const ctx = canvas.getContext("2d");

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        const source = pages[index].canvas;

        ctx.drawImage(
            source,
            layout.offsetX * k,
            layout.offsetY * k,
            source.width * layout.scale * k,
            source.height * layout.scale * k
        );

        if (layout.footerH > 0) {

            const lineY = (layout.pageH - layout.margin - layout.footerH * 0.62) * k;
            const textY = (layout.pageH - layout.margin - layout.footerH * 0.18) * k;
            const left = layout.margin * k;
            const right = (layout.pageW - layout.margin) * k;
            const size = Math.max(6, layout.footerH * 0.36 * k);

            ctx.strokeStyle = "#cfdcd6";
            ctx.lineWidth = Math.max(1, 1.5 * k);
            ctx.beginPath();
            ctx.moveTo(left, lineY);
            ctx.lineTo(right, lineY);
            ctx.stroke();

            ctx.fillStyle = "#4f5d57";
            ctx.font = `${size}px ${fontFamily()}`;
            ctx.textBaseline = "alphabetic";

            let rightText = "";

            if (opts.pageNumbers) {
                rightText = L(`หน้า ${index + 1} / ${pages.length}`, `Page ${index + 1} / ${pages.length}`, `${index + 1} / ${pages.length} ページ`);
            }

            const centerText = [opts.planTitle, pages[index].label, L("พิมพ์ ", "Printed ", "印刷 ") + thaiDay(new Date())]
                .filter(Boolean).join("  ·  ");

            if (opts.footer) {
                ctx.textAlign = "left";
                ctx.fillText(companyText(), left, textY, (right - left) * 0.5);
            }

            if (rightText) {
                ctx.textAlign = "right";
                ctx.font = `bold ${size}px ${fontFamily()}`;
                ctx.fillText(rightText, right, textY);
                ctx.font = `${size}px ${fontFamily()}`;
            }

            if (opts.footer || opts.pageNumbers) {
                ctx.textAlign = opts.footer ? "right" : "left";
                const x = opts.footer
                    ? right - (rightText ? ctx.measureText(rightText).width + size * 2 : 0)
                    : left;
                ctx.fillStyle = "#7a8781";
                ctx.fillText(centerText, x, textY, (right - left) * (opts.footer ? 0.42 : 0.75));
            }
        }

        return canvas;
    }


    /* =====================================================
       PDF
    ===================================================== */

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async function getJsPDF() {

        if (window.jspdf && window.jspdf.jsPDF) return window.jspdf.jsPDF;

        for (const src of JSPDF_SOURCES) {
            try {
                await loadScript(src);
                if (window.jspdf && window.jspdf.jsPDF) return window.jspdf.jsPDF;
            } catch (error) {
                /* ลองแหล่งถัดไป */
            }
        }

        throw new Error("LIB_MISSING:jsPDF");
    }

    async function buildPdf(pages, opts) {

        const JsPDF = await getJsPDF();
        const paper = PAPER[opts.paper] || PAPER.a3;
        const layout = layoutFor(pages, opts);

        const pdf = new JsPDF({ orientation: "landscape", unit: "mm", format: opts.paper, compress: true });

        for (let i = 0; i < pages.length; i += 1) {

            if (i > 0) pdf.addPage(opts.paper, "landscape");

            const page = composePage(pages, i, opts, layout, Math.round(layout.pageW));

            pdf.addImage(page.toDataURL("image/png"), "PNG", 0, 0, paper.w, paper.h, undefined, "FAST");
        }

        return pdf;
    }


    /* =====================================================
       3) PREVIEW DIALOG
    ===================================================== */

    let overlay = null;
    let busy = false;

    function closePreview() {
        if (overlay) overlay.remove();
        overlay = null;
        document.removeEventListener("keydown", onKey, true);
    }

    function onKey(event) {
        if (event.key === "Escape" && overlay && !busy) {
            event.stopPropagation();
            closePreview();
        }
    }

    async function openPreview(kind, format) {

        if (overlay || busy) return;

        kind = kind === "table" ? "table" : "image";

        const state = {
            kind,
            format: format === "png" ? "png" : "pdf",
            pages: null,
            pagesMode: null,
            fileName: autoFileName(kind)
        };

        overlay = document.createElement("div");
        overlay.className = "zg-xp-overlay";

        overlay.innerHTML = `
<div class="zg-xp-dialog" role="dialog" aria-modal="true">
    <div class="zg-xp-head">
        <div class="zg-xp-title">👁 ตัวอย่างก่อน Export — ${kind === "table" ? "เฉพาะตาราง" : "ทั้งกระดาน"}</div>
        <button type="button" class="zg-xp-x" data-x="close" title="ปิด">×</button>
    </div>
    <div class="zg-xp-body">
        <div class="zg-xp-preview"><div class="zg-xp-wait">กำลังสร้างตัวอย่าง…</div></div>
        <div class="zg-xp-side">
            <div>
                <div class="zg-xp-label">ชื่อไฟล์</div>
                <div class="zg-xp-name"><input type="text" data-x="name" spellcheck="false"><span class="zg-xp-ext" data-x="ext"></span></div>
                <div class="zg-xp-hint">ตั้งให้อัตโนมัติจาก ลูกค้า / ชื่อแผน + วันที่ — แก้ได้</div>
            </div>
            <div>
                <div class="zg-xp-label">รูปแบบไฟล์</div>
                <div class="zg-xp-seg" data-x="format">
                    <button type="button" data-v="pdf">📄 PDF</button>
                    <button type="button" data-v="png">🖼 PNG</button>
                </div>
            </div>
            <div data-x="pdfopts">
                <div class="zg-xp-label">ขนาดกระดาษ (แนวนอน)</div>
                <div class="zg-xp-seg" data-x="paper">
                    <button type="button" data-v="a3">A3</button>
                    <button type="button" data-v="a4">A4</button>
                </div>
            </div>
            <div data-x="pageopts">
                <div class="zg-xp-label">การแบ่งหน้า</div>
                <div class="zg-xp-seg" data-x="pages">
                    <button type="button" data-v="single">หน้าเดียว</button>
                    <button type="button" data-v="months">แบ่งตามเดือน</button>
                </div>
                <div class="zg-xp-hint" data-x="pagehint"></div>
            </div>
            <div data-x="trimopts">
                <div class="zg-xp-label">พื้นที่ว่าง</div>
                <label class="zg-xp-check"><input type="checkbox" data-x="trim"> ตัดพื้นที่ว่างบน-ล่าง</label>
                <label class="zg-xp-check"><input type="checkbox" data-x="fill"> ขยายตารางให้เต็มหน้ากระดาษ (PDF)</label>
                <div class="zg-xp-hint">บีบช่องว่างใต้หัวแผน / ในช่องบันทึก แล้วให้แถวในตารางสูงขึ้นจนเต็มหน้า</div>
                <div class="zg-xp-label" style="margin-top:8px">ระยะขอบ</div>
                <div class="zg-xp-seg" data-x="margin">
                    <button type="button" data-v="narrow">แคบ</button>
                    <button type="button" data-v="normal">ปกติ</button>
                    <button type="button" data-v="wide">กว้าง</button>
                </div>
            </div>
            <div data-x="footopts">
                <div class="zg-xp-label">ท้ายหน้า</div>
                <label class="zg-xp-check"><input type="checkbox" data-x="pagenum"> ใส่เลขหน้า</label>
                <label class="zg-xp-check"><input type="checkbox" data-x="company"> ใส่ข้อมูลบริษัท</label>
            </div>
        </div>
    </div>
    <div class="zg-xp-foot">
        <div class="zg-xp-info" data-x="info"></div>
        <button type="button" class="zg-xp-btn" data-x="cancel">ยกเลิก</button>
        <button type="button" class="zg-xp-btn primary" data-x="go">⬆ ดาวน์โหลด</button>
    </div>
</div>`;

        document.body.appendChild(overlay);
        document.addEventListener("keydown", onKey, true);

        const $ = name => overlay.querySelector(`[data-x="${name}"]`);

        const nameInput = $("name");
        nameInput.value = state.fileName;

        function paintControls() {

            const isPdf = state.format === "pdf";

            $("ext").textContent = isPdf ? ".pdf" : ".png";

            [["format", state.format], ["paper", options.paper], ["pages", options.pages]].forEach(([key, value]) => {
                $(key).querySelectorAll("button").forEach(button => {
                    button.classList.toggle("on", button.dataset.v === value);
                });
            });

            ["pdfopts", "pageopts", "footopts"].forEach(key => {
                $(key).classList.toggle("zg-xp-disabled", !isPdf);
            });

            const compact = window.ZGExportCompact;
            $("trimopts").style.display = compact ? "" : "none";
            if (compact) {
                $("trim").checked = Boolean(compact.options.trim);
                $("fill").checked = Boolean(compact.options.fill);
                $("fill").disabled = !compact.options.trim || state.format !== "pdf";
                $("margin").querySelectorAll("button").forEach(button => {
                    button.classList.toggle("on", button.dataset.v === compact.options.margin);
                });
            }

            $("pagenum").checked = Boolean(options.pageNumbers);
            $("company").checked = Boolean(options.footer);

            $("pagehint").textContent = options.pages === "months"
                ? "ทั้งช่วงแผน หน้าละหลายเดือนเต็ม ๆ ตามที่เห็นบนจอ — อยากให้หน้าละหลายเดือนขึ้นให้ซูมออกก่อน"
                : "ตามที่เห็นบนจอตอนนี้";
        }

        function setBusy(on, text) {
            busy = on;
            $("go").disabled = on;
            if (text) $("info").textContent = text;
        }

        function currentOpts() {
            return {
                paper: options.paper,
                pageNumbers: Boolean(options.pageNumbers),
                footer: Boolean(options.footer),
                planTitle: planInfo().title
            };
        }

        /* หน้าที่จะใช้จริง (ตัดพื้นที่ว่างแล้ว ถ้าเปิดไว้) */
        function shownPages() {
            const compact = window.ZGExportCompact;
            if (!state.pages) return null;
            const useFill = compact && compact.options.trim && compact.options.fill;
            const source = useFill && state.format === "pdf" && state.fill && state.fill.key === fillKey() && state.fill.pages
                ? state.fill.pages
                : state.pages;
            return compact
                ? source.map(page => ({ ...page, canvas: compact.process(page.canvas) }))
                : source;
        }

        /* ---------- ขยายตารางให้เต็มหน้า (ถ่ายใหม่ตอนกระดานสูงขึ้น) ---------- */

        function fillKey() {
            const compact = window.ZGExportCompact;
            return [state.pagesMode, options.paper, options.footer || options.pageNumbers,
                compact ? compact.options.margin : ""].join("|");
        }

        function pageAspect(opts) {
            const paper = PAPER[opts.paper] || PAPER.a3;
            const compact = window.ZGExportCompact;
            const marginR = compact ? compact.margin().ratio : 0.022;
            const footerR = (opts.footer || opts.pageNumbers) ? 0.04 : 0;
            const pageH = paper.h / paper.w;
            return (1 - marginR * 2) / (pageH - marginR * 2 - pageH * footerR);
        }

        async function ensureFill() {

            const compact = window.ZGExportCompact;

            if (!compact || !state.pages || state.format !== "pdf" || !compact.options.trim ||
                !compact.options.fill || typeof compact.withStretch !== "function") return;

            const key = fillKey();

            if (state.fill && state.fill.key === key) return;

            const base = state.pages.map(page => compact.process(page.canvas));
            const factor = compact.fillFactor(base, pageAspect(currentOpts()));

            if (factor <= 1.03) {
                state.fill = { key, pages: null };
                return;
            }

            setBusy(true, L("กำลังขยายตารางให้เต็มหน้า…", "Fitting the table to the page…", "表をページに合わせています…"));
            overlay.style.visibility = "hidden";

            try {
                const pages = await compact.withStretch(factor, () =>
                    state.pagesMode === "months" ? captureByMonths(state.kind) : captureSingle(state.kind));
                state.fill = { key, pages };
            } catch (error) {
                console.error(error);
                state.fill = { key, pages: null };
            }

            if (overlay) overlay.style.visibility = "";
            setBusy(false);
        }

        let refreshing = null;

        async function refresh() {
            if (refreshing) return refreshing;
            refreshing = (async () => {
                try { await ensureFill(); } finally { refreshing = null; }
                renderPreview();
            })();
            return refreshing;
        }

        /* PNG: ใส่ระยะขอบรอบภาพ */
        function pngCanvas(page) {
            const compact = window.ZGExportCompact;
            return compact ? compact.withMargin(page.canvas) : page.canvas;
        }

        function renderPreview() {

            if (!overlay || !state.pages) return;

            const pages = shownPages();

            const box = overlay.querySelector(".zg-xp-preview");
            box.innerHTML = "";

            const isPdf = state.format === "pdf";

            if (!isPdf) {

                const page = { ...pages[0], canvas: pngCanvas(pages[0]) };
                const wrap = document.createElement("div");
                wrap.className = "zg-xp-page";

                const preview = document.createElement("canvas");
                const width = Math.min(900, page.canvas.width);
                preview.width = width;
                preview.height = Math.round(page.canvas.height * width / page.canvas.width);
                preview.getContext("2d").drawImage(page.canvas, 0, 0, preview.width, preview.height);
                preview.style.width = `${Math.min(760, width)}px`;

                wrap.appendChild(preview);
                box.appendChild(wrap);

                $("info").textContent =
                    `PNG ${page.canvas.width} × ${page.canvas.height} px${page.label ? ` · ${page.label}` : ""}`;

                return;
            }

            const opts = currentOpts();
            const layout = layoutFor(pages, opts);
            const single = pages.length === 1;
            const cssWidth = single ? 720 : 360;

            pages.forEach((page, index) => {

                const wrap = document.createElement("div");
                wrap.className = "zg-xp-page";

                const preview = composePage(pages, index, opts, layout, cssWidth * 2);
                preview.style.width = `${cssWidth}px`;

                const label = document.createElement("div");
                label.className = "zg-xp-page-label";
                label.textContent = L(`หน้า ${index + 1}`, `Page ${index + 1}`, `${index + 1} ページ`) + (page.label ? ` · ${page.label}` : "");

                wrap.appendChild(preview);
                wrap.appendChild(label);
                box.appendChild(wrap);
            });

            $("info").textContent =
                L(`PDF ${PAPER[options.paper].label} แนวนอน · ${state.pages.length} หน้า`,
                    `PDF ${PAPER[options.paper].label} landscape · ${state.pages.length} page(s)`,
                    `PDF ${PAPER[options.paper].label} 横 · ${state.pages.length} ページ`);
        }

        async function ensurePages() {

            const mode = state.format === "pdf" ? options.pages : "single";

            if (state.pages && state.pagesMode === mode) {
                refresh();
                return;
            }

            const box = overlay.querySelector(".zg-xp-preview");
            box.innerHTML = `<div class="zg-xp-wait">กำลังสร้างตัวอย่าง…</div>`;

            setBusy(true, "กำลังถ่ายภาพ…");

            /* ซ่อนหน้าต่างนี้ระหว่างถ่าย ไม่ให้ติดไปในภาพ */
            overlay.style.visibility = "hidden";

            try {

                state.pages = mode === "months"
                    ? await captureByMonths(state.kind, (i, n) => setBusy(true, L(`กำลังสร้างหน้า ${i} / ${n}…`, `Creating page ${i} / ${n}…`, `ページ作成中 ${i} / ${n}…`)))
                    : await captureSingle(state.kind);

                state.pagesMode = mode;

            } catch (error) {

                console.error(error);

                if (overlay) {
                    overlay.style.visibility = "";
                    box.innerHTML = `<div class="zg-xp-wait">สร้างตัวอย่างไม่สำเร็จ<br>${
                        String(error && error.message).startsWith("LIB_MISSING")
                            ? "โหลดไลบรารีไม่ได้ (ใส่โฟลเดอร์ lib/ ไว้ข้าง index.html หรือต่ออินเทอร์เน็ต)"
                            : "ลองอีกครั้ง"
                    }</div>`;
                }

                setBusy(false, "");
                $("go").disabled = true;
                return;
            }

            if (!overlay) {
                busy = false;
                return;
            }

            overlay.style.visibility = "";
            setBusy(false);
            refresh();
        }

        overlay.addEventListener("click", event => {

            const target = event.target instanceof Element ? event.target : null;
            if (!target) return;

            if (target === overlay || target.closest('[data-x="close"], [data-x="cancel"]')) {
                if (!busy) closePreview();
                return;
            }

            if (busy) return;

            const segButton = target.closest(".zg-xp-seg button");

            if (segButton) {

                const group = segButton.parentElement.dataset.x;
                const value = segButton.dataset.v;

                if (group === "format") state.format = value;
                if (group === "paper") options.paper = value;
                if (group === "pages") options.pages = value;

                if (group === "margin" && window.ZGExportCompact) {
                    window.ZGExportCompact.options.margin = value;
                    window.ZGExportCompact.save();
                }

                saveOptions();
                paintControls();

                if (group === "paper" || group === "margin") refresh();
                else ensurePages();

                return;
            }

            if (target.closest('[data-x="go"]')) {
                download();
            }
        });

        overlay.addEventListener("change", event => {

            if (event.target === $("pagenum")) options.pageNumbers = event.target.checked;
            if (event.target === $("company")) options.footer = event.target.checked;
            if (event.target === $("trim") && window.ZGExportCompact) {
                window.ZGExportCompact.options.trim = event.target.checked;
                window.ZGExportCompact.save();
            }
            if (event.target === $("fill") && window.ZGExportCompact) {
                window.ZGExportCompact.options.fill = event.target.checked;
                window.ZGExportCompact.save();
            }

            saveOptions();
            paintControls();
            refresh();
        });

        nameInput.addEventListener("keydown", event => {
            if (event.key === "Enter") {
                event.preventDefault();
                download();
            }
        });

        async function download() {

            if (busy || !state.pages) return;

            const name = cleanFileName(nameInput.value) || state.fileName;

            setBusy(true, "กำลังสร้างไฟล์…");

            try {

                if (state.format === "pdf") {

                    const pdf = await buildPdf(shownPages(), currentOpts());
                    downloadBlob(pdf.output("blob"), `${name}.pdf`);

                } else {

                    const blob = await new Promise(resolve => pngCanvas(shownPages()[0]).toBlob(resolve, "image/png"));
                    downloadBlob(blob, `${name}.png`);
                }

                busy = false;
                closePreview();
                toast(L("Export เสร็จแล้ว — ", "Export complete — ", "エクスポート完了 — ") + `${name}.${state.format}`);

            } catch (error) {

                console.error(error);

                setBusy(false, String(error && error.message).startsWith("LIB_MISSING")
                    ? "สร้าง PDF ไม่ได้: โหลดไลบรารีไม่สำเร็จ"
                    : "Export ไม่สำเร็จ ลองอีกครั้ง");
            }
        }

        paintControls();

        await frames(1);

        ensurePages();
    }


    /* ปุ่ม PNG / PDF ในเมนู Export → เปิดหน้าตัวอย่างแทนการดาวน์โหลดทันที
       (ดักที่ document capture — spell-plus.js ตรวจคำผิดก่อนที่ window capture ได้ตามเดิม) */
    document.addEventListener("click", event => {

        const target = event.target instanceof Element ? event.target : null;
        const item = target && target.closest(".zg-export-menu button[data-kind][data-format]");

        if (!item) return;

        event.preventDefault();
        event.stopPropagation();

        const kind = item.dataset.kind;
        const format = item.dataset.format;

        closeExportMenu();

        openPreview(kind, format);

    }, true);


    /* เผื่อมีโค้ดอื่นเรียก exportAs ตรง ๆ (เช่น spell-plus หลังตรวจคำผิด) → เปิดหน้าตัวอย่างเหมือนกัน */
    const originalExportAs = exporter.exportAs;

    exporter.exportAs = (kind, format) => openPreview(kind, format);
    exporter.exportDirect = originalExportAs;
    exporter.openPreview = openPreview;


    /* =====================================================
       4) BACKUP / RESTORE ทุกแผน
    ===================================================== */

    function currentStore() {

        const store = readJson(PLANS_KEY, null);

        if (!store || !Array.isArray(store.plans)) return null;

        /* แผนที่เปิดอยู่: ใช้ข้อมูลล่าสุดบนจอ (ยังไม่ทันบันทึกอัตโนมัติ) */
        try {
            const activeId = window.ZGPlans && window.ZGPlans.activeId ? window.ZGPlans.activeId() : store.activeId;
            const active = store.plans.find(plan => plan.id === activeId);
            if (active && window.ZGPlanIO && window.ZGPlanIO.build) {
                active.data = window.ZGPlanIO.build();
            }
        } catch (error) {
            /* ใช้ข้อมูลที่บันทึกไว้ */
        }

        return store;
    }

    function backupAll() {

        const store = currentStore();

        if (!store || !store.plans.length) {
            toast("ยังไม่มีแผนในเครื่องให้สำรอง", true);
            return;
        }

        const templates = readJson(TEMPLATES_KEY, []);

        const payload = {
            type: BACKUP_TYPE,
            version: 1,
            exportedAt: new Date().toISOString(),
            activeId: store.activeId,
            plans: store.plans,
            templates: Array.isArray(templates) ? templates : []
        };

        const blob = new Blob([JSON.stringify(payload, null, 1)], { type: "application/json" });

        downloadBlob(blob, `สำรองแผนทั้งหมด_ZG_${isoDay(new Date())}.json`);

        try {
            localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
        } catch (error) { /* ไม่เป็นไร */ }

        toast(L(
            `สำรองแล้ว ${store.plans.length} แผน${payload.templates.length ? ` + เทมเพลต ${payload.templates.length} รายการ` : ""}`,
            `Backed up ${store.plans.length} plan(s)${payload.templates.length ? ` + ${payload.templates.length} template(s)` : ""}`,
            `${store.plans.length} 件のプランをバックアップしました${payload.templates.length ? ` + テンプレート ${payload.templates.length} 件` : ""}`
        ));
    }

    function pickBackupFile() {

        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json,application/json";

        input.addEventListener("change", () => {

            const file = input.files && input.files[0];
            if (!file) return;

            const reader = new FileReader();

            reader.onload = () => {

                let data;

                try {
                    data = JSON.parse(String(reader.result));
                } catch (error) {
                    toast("อ่านไฟล์ไม่ได้: ไม่ใช่ไฟล์ JSON", true);
                    return;
                }

                openRestore(data);
            };

            reader.readAsText(file);
        });

        input.click();
    }

    function openRestore(data) {

        if (!data || data.type !== BACKUP_TYPE || !Array.isArray(data.plans)) {
            toast("ไฟล์นี้ไม่ใช่ไฟล์สำรองทุกแผน (ไฟล์แผนเดียวให้ใช้ปุ่ม ↓ Import)", true);
            return;
        }

        const plans = data.plans.filter(plan => plan && plan.data && typeof plan.data === "object");
        const templates = Array.isArray(data.templates) ? data.templates.filter(item => item && item.id && item.data) : [];

        const store = readJson(PLANS_KEY, { plans: [] }) || { plans: [] };
        const existing = Array.isArray(store.plans) ? store.plans : [];

        const rows = plans.map((plan, index) => {

            const sameName = existing.filter(item => item.name === plan.name);
            const same = sameName.some(item => JSON.stringify(item.data) === JSON.stringify(plan.data));

            const tag = same
                ? `<span class="zg-xp-tag">มีอยู่แล้ว</span>`
                : sameName.length ? `<span class="zg-xp-tag">ชื่อซ้ำ → เพิ่มเป็นแผนใหม่</span>` : "";

            const when = plan.updatedAt ? thaiDay(new Date(plan.updatedAt)) : "";

            return `<label><input type="checkbox" data-i="${index}" ${same ? "" : "checked"}>
                <span>${escapeHtml(plan.name || `แผน ${index + 1}`)}</span> ${tag}
                <span class="meta">${escapeHtml(when)}</span></label>`;
        }).join("");

        overlay = document.createElement("div");
        overlay.className = "zg-xp-overlay";

        overlay.innerHTML = `
<div class="zg-xp-dialog" style="width:min(520px,100%)" role="dialog" aria-modal="true">
    <div class="zg-xp-head">
        <div class="zg-xp-title">♻ กู้คืนจากไฟล์สำรอง</div>
        <button type="button" class="zg-xp-x" data-x="close" title="ปิด">×</button>
    </div>
    <div style="padding:14px 16px;display:flex;flex-direction:column;gap:10px;overflow-y:auto">
        <div class="zg-xp-hint">${escapeHtml(L("ไฟล์สำรองวันที่ ", "Backup date ", "バックアップ日 "))}${escapeHtml(data.exportedAt ? thaiDay(new Date(data.exportedAt)) : "-")} ·
            ${escapeHtml(L(`${plans.length} แผน`, `${plans.length} plan(s)`, `プラン ${plans.length} 件`))}${templates.length ? escapeHtml(L(` · เทมเพลต ${templates.length} รายการ`, ` · ${templates.length} template(s)`, ` · テンプレート ${templates.length} 件`)) : ""}</div>
        <div class="zg-xp-hint">แผนที่เลือกจะถูกเพิ่มเป็นแผนใหม่ — แผนที่มีอยู่ในเครื่องไม่ถูกลบหรือเขียนทับ</div>
        <label class="zg-xp-check"><input type="checkbox" data-x="all"> เลือกทั้งหมด</label>
        <div class="zg-xp-restore-list">${rows || "<div class='zg-xp-hint'>ไม่มีแผนในไฟล์</div>"}</div>
        ${templates.length ? `<label class="zg-xp-check"><input type="checkbox" data-x="tpl" checked> กู้คืนเทมเพลตของฉันด้วย (เฉพาะที่ยังไม่มี)</label>` : ""}
    </div>
    <div class="zg-xp-foot">
        <div class="zg-xp-info" data-x="info"></div>
        <button type="button" class="zg-xp-btn" data-x="cancel">ยกเลิก</button>
        <button type="button" class="zg-xp-btn primary" data-x="go">♻ กู้คืน</button>
    </div>
</div>`;

        document.body.appendChild(overlay);
        document.addEventListener("keydown", onKey, true);

        const $ = name => overlay.querySelector(`[data-x="${name}"]`);
        const boxes = () => Array.from(overlay.querySelectorAll("input[data-i]"));

        function paintCount() {
            const count = boxes().filter(box => box.checked).length;
            $("all").checked = count && count === boxes().length;
            $("info").textContent = L(`เลือก ${count} แผน`, `${count} selected`, `${count} 件選択`);
        }

        overlay.addEventListener("change", event => {
            if (event.target === $("all")) {
                boxes().forEach(box => { box.checked = event.target.checked; });
            }
            paintCount();
        });

        overlay.addEventListener("click", async event => {

            const target = event.target instanceof Element ? event.target : null;
            if (!target || busy) return;

            if (target === overlay || target.closest('[data-x="close"], [data-x="cancel"]')) {
                closePreview();
                return;
            }

            if (!target.closest('[data-x="go"]')) return;

            const chosen = boxes().filter(box => box.checked).map(box => plans[Number(box.dataset.i)]);
            const withTemplates = Boolean($("tpl") && $("tpl").checked);

            if (!chosen.length && !withTemplates) {
                $("info").textContent = "ยังไม่ได้เลือกแผน";
                return;
            }

            busy = true;
            $("go").disabled = true;

            let addedTemplates = 0;

            if (withTemplates) {

                const local = readJson(TEMPLATES_KEY, []);
                const list = Array.isArray(local) ? local : [];

                templates.forEach(item => {
                    if (!list.some(existingItem => existingItem && existingItem.id === item.id)) {
                        list.push(item);
                        addedTemplates += 1;
                    }
                });

                if (addedTemplates) writeJson(TEMPLATES_KEY, list);
            }

            const startId = window.ZGPlans && window.ZGPlans.activeId ? window.ZGPlans.activeId() : null;

            for (let i = 0; i < chosen.length; i += 1) {

                $("info").textContent = L(`กำลังกู้คืน ${i + 1} / ${chosen.length}…`, `Restoring ${i + 1} / ${chosen.length}…`, `復元中 ${i + 1} / ${chosen.length}…`);

                const plan = chosen[i];

                if (window.ZGPlans && window.ZGPlans.createFromData) {
                    window.ZGPlans.createFromData(plan.name || "แผนจากไฟล์สำรอง", plan.data);
                }

                await wait(450);
            }

            if (startId && chosen.length && window.ZGPlans && window.ZGPlans.switchTo) {
                window.ZGPlans.switchTo(startId);
                await wait(200);
            }

            busy = false;
            closePreview();

            toast(L(
                `กู้คืนแล้ว ${chosen.length} แผน${addedTemplates ? ` + เทมเพลต ${addedTemplates} รายการ` : ""} — ดูได้ที่ปุ่มเลือกแผน`,
                `Restored ${chosen.length} plan(s)${addedTemplates ? ` + ${addedTemplates} template(s)` : ""} — see the plan selector`,
                `${chosen.length} 件のプランを復元しました${addedTemplates ? ` + テンプレート ${addedTemplates} 件` : ""} — プラン選択から開けます`
            ));
        });

        paintCount();
    }


    /* เพิ่มหัวข้อ "สำรองข้อมูล" ท้ายเมนู Export */
    function lastBackupNote() {

        let iso = null;

        try { iso = localStorage.getItem(LAST_BACKUP_KEY); } catch (error) { iso = null; }

        if (!iso) return { text: "ยังไม่เคยสำรองในเครื่องนี้", old: true };

        const date = new Date(iso);
        const days = Math.floor((Date.now() - date.getTime()) / 86400000);

        return { text: L("สำรองล่าสุด ", "Last backup ", "前回のバックアップ ") + thaiDay(date), old: days >= 7 };
    }

    function decorateMenu(menu) {

        if (!menu || menu.querySelector("[data-xp]")) return;

        /* เลือกขนาดกระดาษได้ในหน้าตัวอย่างแล้ว → ไม่ต้องระบุ (A3) บนปุ่ม */
        menu.querySelectorAll('button[data-format="pdf"]').forEach(button => {
            button.textContent = "📄 PDF";
        });

        const note = lastBackupNote();

        const section = document.createElement("div");
        section.setAttribute("data-xp", "backup");

        section.innerHTML = `
            <div class="zg-export-chooser-sep"></div>
            <div class="zg-export-chooser-title">สำรองข้อมูล (ทุกแผนในเครื่อง)</div>
            <div class="zg-export-chooser-row">
                <button type="button" data-xp-action="backup">🗄 สำรอง</button>
                <button type="button" data-xp-action="restore">♻ กู้คืน</button>
            </div>
            <div class="zg-xp-backup-note${note.old ? " old" : ""}">${escapeHtml(note.text)}</div>`;

        section.addEventListener("click", event => {

            const button = event.target instanceof Element ? event.target.closest("[data-xp-action]") : null;
            if (!button) return;

            /* ไม่ให้เมนูเดิมของ export-image.js เข้าใจว่าเป็นปุ่ม Export */
            event.stopPropagation();

            closeExportMenu();

            if (button.dataset.xpAction === "backup") backupAll();
            else pickBackupFile();
        });

        menu.appendChild(section);

        /* เมนูยาวขึ้น → ไม่ให้ล้นขอบล่างจอ */
        const rect = menu.getBoundingClientRect();
        if (rect.bottom > window.innerHeight - 6) {
            menu.style.maxHeight = `${Math.max(200, window.innerHeight - rect.top - 8)}px`;
            menu.style.overflowY = "auto";
        }
    }

    new MutationObserver(records => {
        records.forEach(record => {
            record.addedNodes.forEach(node => {
                if (node instanceof Element && node.matches(".zg-export-menu")) {
                    decorateMenu(node);
                }
            });
        });
    }).observe(document.body, { childList: true });


    window.ZGExportPlus = {
        preview: openPreview,
        backup: backupAll,
        restore: pickBackupFile,
        restoreData: openRestore,
        fileName: autoFileName
    };

})();
