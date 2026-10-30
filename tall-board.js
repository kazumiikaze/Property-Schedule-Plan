"use strict";

/* =========================================================
   TALL-BOARD.JS — ตารางสูงเท่าตอนพิมพ์ ในจอเดียว (ไม่ต้องเลื่อนหน้า)
   ตอนพิมพ์ / Export ระบบยืดกระดานเป็นสัดส่วน A3 → ตารางบนกระดาษสูงขึ้น ~1.4 เท่า
   → บนจอ: ตั้งความสูงตารางให้เท่าที่จะได้บนกระดาษพอดี (กล่องงานรูปทรงเหมือนกระดาษ)
     แล้วจัดส่วนอื่นให้กะทัดรัดจนทุกอย่างอยู่ในจอเดียว
       · ปุ่ม ＋ หมวดหมู่ ย้ายไปอยู่ที่ว่างซ้ายหัวเดือน (เดิมกินแถวของตัวเอง)
       · หัวแผนเตี้ยลง · ช่องเส้นวันที่ + บันทึกท้ายกระดาน ใช้ที่ที่เหลือ
   - ช่องเส้นวันที่กะทัดรัด · บันทึกท้ายกระดานได้ที่ที่เหลือ
   - ตอนถ่ายภาพพิมพ์ / Export: กลับไปผังเดิมชั่วคราว → ภาพพิมพ์ / Export เหมือนเดิมทุกอย่าง (ไม่ได้แก้ระบบพิมพ์)
   - ปุ่ม "↕ เท่ากระดาษ" ในกลุ่มมุมมอง เปิด/ปิด · จำไว้ในเครื่อง
   - ไม่ทำงานตอนซูมเบราว์เซอร์ (zoom-focus.js จัดเอง) / จอแคบ / มือถือ
========================================================= */

(function () {

    /* กรอบภาพตัวอย่างเทมเพลต (?zgPreview=1) ก็จัดแบบเดียวกัน → ภาพตัวอย่างเหมือนหน้าเว็บ */
    const plan = document.querySelector(".plan");
    if (!plan || typeof renderSchedule !== "function") return;

    const STORE_KEY = "zg-tall-board";
    /* ต้องตรงกับ print-fit.js / style.css */
    const PAGE_RATIO = (420 - 12) / (297 - 12);
    const PRINT_FOOTER_H = 112;
    const SCHEDULE_SHARE = 0.37;     // .schedule-area เดิม: calc(37% − หัวเดือน)
    const MIN_WIDTH = 900;

    const root = document.documentElement;
    const isTouch = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;

    let on = true;
    try { on = localStorage.getItem(STORE_KEY) !== "0"; } catch (error) { /* ค่าเริ่มต้น */ }

    /*
        ผังกระดาน (px คำนวณใน JS → ตัวแปร CSS บน .plan)
        บน → ล่าง: หัวแผน · หัวเดือน (+ หมวดหมู่ อยู่ซ้าย) · ตาราง · ช่องเส้นวันที่ (ติดตาราง เส้นวันที่ต่อกัน)
                   · แถบเลื่อน · บันทึก · แถบบริษัท
    */
    const style = document.createElement("style");
    style.textContent = `
html.zg-fit-board .plan-header { top: var(--fb-head-top); height: var(--fb-head-h); }
html.zg-fit-board .category-toolbar { top: calc(var(--fb-tl-top) + (var(--timeline-header-height) - 28px) / 2); }
html.zg-fit-board .timeline-header { top: var(--fb-tl-top); }
html.zg-fit-board .schedule-area,
html.zg-fit-board .object-layer-viewport { top: var(--fb-sched-top); height: var(--fb-sched-h); }
html.zg-fit-board .hline-layer-viewport { top: var(--fb-sched-top); height: calc(var(--fb-br-top) + var(--fb-br-h) - var(--fb-sched-top)); }
html.zg-fit-board .timeline-horizontal-scroll { top: var(--fb-scroll-top); }
html.zg-fit-board .bracket-area { top: var(--fb-br-top); height: var(--fb-br-h); }
html.zg-fit-board .board-notes-section { top: var(--fb-notes-top); min-height: 0; }
/* ↕ ปิด: ผังเดิม แต่ช่องเส้นวันที่ติดตาราง · แถบเลื่อนอยู่ใต้ช่องเส้นวันที่ (เฉพาะบนจอ)
   ช่องเส้นวันที่สูง 13% (bracket-size.js) → จบที่ 66% · บันทึกเริ่ม 72.7% */
html:not(.zg-fit-board):not(.zg-zoom-focus) body:not(.zg-print-capture):not(.zg-exporting) .bracket-area { top: 53%; }
html:not(.zg-fit-board):not(.zg-zoom-focus) body:not(.zg-print-capture):not(.zg-exporting) .timeline-horizontal-scroll { top: calc(53% + 13% + 4px); }
html:not(.zg-fit-board):not(.zg-zoom-focus) body:not(.zg-print-capture):not(.zg-exporting) .hline-layer-viewport { height: calc(50% - var(--timeline-header-height)); }
`;
    document.head.appendChild(style);

    function usable() {
        return on && !isTouch && window.innerWidth >= MIN_WIDTH &&
            !root.classList.contains("zg-zoom-focus") &&
            !document.body.classList.contains("zg-print-capture");
    }

    function cssPx(name, fallback) {
        const value = parseFloat(getComputedStyle(root).getPropertyValue(name));
        return Number.isFinite(value) ? value : fallback;
    }

    let lastKey = "";

    function apply(vars) {
        const key = Object.values(vars).map(v => v.toFixed(1)).join("|");
        const changed = key !== lastKey || !root.classList.contains("zg-fit-board");
        lastKey = key;
        Object.keys(vars).forEach(name => plan.style.setProperty(name, `${vars[name].toFixed(2)}px`));
        if (!root.classList.contains("zg-fit-board")) root.classList.add("zg-fit-board");
        return changed;
    }

    function layout() {

        const active = usable();

        if (!active) {
            const was = root.classList.contains("zg-fit-board");
            if (was) root.classList.remove("zg-fit-board");
            lastKey = "";
            return was;
        }

        const W = plan.clientWidth;
        const H = plan.clientHeight;
        if (!W || !H) return false;

        const header = cssPx("--timeline-header-height", 40);
        const footer = cssPx("--footer-reserved-height", 54);

        /* ตารางบนกระดาษ: กระดานถูกยืดเป็น W / A3 − แถบบริษัท → ตาราง = 37% ของความสูงนั้น − หัวเดือน */
        const printH = W / PAGE_RATIO - PRINT_FOOTER_H * W / window.innerWidth;
        const stretch = Math.max(1, printH / H);
        let schedH = SCHEDULE_SHARE * H * stretch - header;

        /* ส่วนบน กะทัดรัด */
        const headTop = Math.round(Math.max(4, H * 0.008));
        const headH = Math.round(Math.max(56, Math.min(80, H * 0.08)));
        const tlTop = headTop + headH + 6;
        const schedTop = tlTop + header;

        /* ส่วนล่าง: ช่องเส้นวันที่กะทัดรัด (ครึ่งหนึ่งของเดิม) · บันทึกได้ที่ที่เหลือ */
        const notesBottom = H - footer - 6;
        /* ช่องเส้นวันที่ +1 ซม. · บันทึก −1 ซม. (ผู้ใช้ขอ) */
        const CM = 96 / 2.54;
        const minBracket = Math.round(76 + CM);
        const minNotes = Math.round(96 - CM);

        /* ทุกอย่างต้องอยู่ในจอเดียว: ตารางยาวได้ไม่เกินที่เหลือ */
        const room = notesBottom - minNotes - 8 - minBracket - 4 - 20 - 4 - schedTop;
        schedH = Math.max(120, Math.min(schedH, room));

        /* ช่องเส้นวันที่ติดใต้ตาราง (เส้นวันที่ลากต่อกันไม่ขาด) → แถบเลื่อนอยู่ใต้ช่องเส้นวันที่ */
        const brTop = schedTop + schedH;
        const bottomRoom = notesBottom - brTop - 4 - 20 - 4;
        const brH = Math.round(Math.max(minBracket, Math.min(bottomRoom - 8 - minNotes, bottomRoom * 0.3 + CM)));
        const scrollTop = brTop + brH + 4;
        const notesTop = scrollTop + 20 + 8;

        const vars = {
            "--fb-head-top": headTop, "--fb-head-h": headH, "--fb-tl-top": tlTop,
            "--fb-sched-top": schedTop, "--fb-sched-h": schedH, "--fb-scroll-top": scrollTop,
            "--fb-br-top": brTop, "--fb-br-h": brH, "--fb-notes-top": notesTop
        };

        return apply(vars);
    }

    let busy = false;

    function relayout(force) {
        if (busy) return;
        const changed = layout();
        if (!changed && !force) return;
        busy = true;
        try {
            renderSchedule();
            if (typeof updateAllHorizontalRanges === "function") updateAllHorizontalRanges();
            window.dispatchEvent(new Event("resize"));
        } finally {
            busy = false;
        }
    }

    window.addEventListener("resize", () => relayout(false));

    /* กระดานเปลี่ยนความสูง (พิมพ์ / Export ยืดชั่วคราว · responsive.js) → จัดใหม่ */
    if (typeof ResizeObserver === "function") new ResizeObserver(() => relayout(false)).observe(plan);

    /* zoom-focus เปิด/ปิด → จัดใหม่ทันที */
    let zoomFocus = root.classList.contains("zg-zoom-focus");
    new MutationObserver(() => {
        const now = root.classList.contains("zg-zoom-focus");
        if (now === zoomFocus) return;
        zoomFocus = now;
        relayout(false);
    }).observe(root, { attributes: true, attributeFilter: ["class"] });

    /*
        ตอนถ่ายภาพพิมพ์ / Export: กลับไปผังเดิมก่อนถ่าย (ภาพเหมือนเดิมทุกอย่าง) · ถ่ายเสร็จ → กลับมาผังนี้
    */
    function wrapCapture() {
        const X = window.ZGExportImage;
        if (!X || typeof X.capture !== "function" || X.capture.__zgFit) return;
        const original = X.capture;
        const wrapped = async function () {
            if (root.classList.contains("zg-fit-board") && document.body.classList.contains("zg-print-capture")) {
                relayout(true);
                await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            }
            return original.apply(this, arguments);
        };
        wrapped.__zgFit = true;
        X.capture = wrapped;
    }

    let capturing = false;
    new MutationObserver(() => {
        const now = document.body.classList.contains("zg-print-capture");
        if (now === capturing) return;
        capturing = now;
        if (!now && on) relayout(true);
    }).observe(document.body, { attributes: true, attributeFilter: ["class"] });


    /* ---------- ปุ่ม ↕ เท่ากระดาษ ---------- */

    const button = document.createElement("button");
    button.type = "button";
    button.className = "toolbar-control zg-tall-btn";
    button.textContent = "↕ เท่ากระดาษ";

    function paint() {
        button.setAttribute("aria-pressed", on ? "true" : "false");
        button.title = on
            ? "ตารางสูงเท่าตอนพิมพ์ (เปิดอยู่) — กล่องงานบนจอรูปทรงเหมือนบนกระดาษ ทุกอย่างอยู่ในจอเดียว · กดเพื่อกลับไปผังเดิม"
            : "ให้ตารางสูงเท่าตอนพิมพ์ — กล่องงานบนจอรูปทรงเหมือนบนกระดาษ";
    }

    button.addEventListener("click", () => {
        on = !on;
        try { localStorage.setItem(STORE_KEY, on ? "1" : "0"); } catch (error) { /* ไม่เป็นไร */ }
        paint();
        relayout(true);
    });

    function place() {
        if (button.isConnected) return;
        const host = document.querySelector(".zgc-group--view") ||
            (document.querySelector(".toolbar-group--zoom") || {}).parentElement;
        if (host) host.appendChild(button);
    }

    paint();
    place();
    setTimeout(place, 400);
    wrapCapture();
    setTimeout(wrapCapture, 500);

    relayout(true);
    setTimeout(() => relayout(true), 300);
    setTimeout(() => relayout(false), 1200);

    window.ZGTallBoard = {
        isOn: () => root.classList.contains("zg-fit-board"),
        refresh: () => relayout(true),
        /* ค่าที่เลือกไว้ (แผนจำไว้ — fixed-board.js) */
        wanted: () => on,
        set(value) {
            value = Boolean(value);
            if (value === on) return;
            on = value;
            paint();
            relayout(true);
        }
    };

})();
