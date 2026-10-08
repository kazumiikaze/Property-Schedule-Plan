"use strict";

/* =========================================================
   ZOOM-FOCUS.JS — กด Ctrl+ ซูมเบราว์เซอร์ → เน้นที่ตาราง
   - ส่วนประกอบรอบ ๆ (หัวกระดาน, ปุ่ม + หมวดหมู่, บันทึกท้ายกระดาน,
     ช่อง Update, ป้าย "เส้นวันที่ / Bracket", แถบเลื่อน) ใหญ่ตามซูมแค่นิดเดียว
   - ตารางได้พื้นที่แนวตั้งมากขึ้น → แถวสูงขึ้น โครงสร้างตารางเห็นชัด
   - ตัวหนังสือชื่อหมวดหมู่ / แถว ใหญ่ตามซูมครึ่งเดียว (ไม่ล้นจนตัดคำ)
   - ซูม 100% (หรือมือถือ/แท็บเล็ต) → หน้าตาเดิมทุกอย่าง

   ไม่แก้ app.js / style.css — โหลดหลัง app.js (ก่อน lang.js)
========================================================= */

(function () {

    const plan = document.querySelector(".plan");

    if (!plan) {
        return;
    }

    /* ซูมเท่าไรขึ้นไปถึงเริ่มเน้นตาราง */
    const FOCUS_FROM = 1.1;

    /* ส่วนประกอบรอบ ๆ ใหญ่ตามซูมกี่ส่วน (0 = เท่าเดิม, 1 = ตามเต็มที่) */
    const CHROME_FOLLOW = 0.3;

    /* ตัวหนังสือในช่องหมวดหมู่ / แถว ใหญ่ตามซูมกี่ส่วน */
    const TEXT_FOLLOW = 0.5;

    const root = document.documentElement;

    const isTouch =
        window.matchMedia && window.matchMedia("(pointer: coarse)").matches;


    /* =====================================================
       STYLE (ทำงานเฉพาะตอน html.zg-zoom-focus)
    ===================================================== */

    const style = document.createElement("style");

    style.textContent = `
html.zg-zoom-focus .plan-header,
html.zg-zoom-focus .category-toolbar,
html.zg-zoom-focus .board-notes-section,
html.zg-zoom-focus .zg-update-date,
html.zg-zoom-focus .bracket-label,
html.zg-zoom-focus .timeline-horizontal-scroll,
html.zg-zoom-focus .company-footer {
    zoom: var(--zg-chrome-zoom, 1);
}
html.zg-zoom-focus .category-name,
html.zg-zoom-focus .party-content {
    zoom: var(--zg-text-zoom, 1);
}
html.zg-zoom-focus .board-notes-section { min-height: 0 !important; }
`;

    document.head.appendChild(style);


    /* =====================================================
       HELPERS
    ===================================================== */

    function detectZoom() {

        if (isTouch || !window.outerWidth || !window.innerWidth) {
            return 1;
        }

        const ratio = Math.round((window.outerWidth / window.innerWidth) * 20) / 20;

        if (!Number.isFinite(ratio)) {
            return 1;
        }

        return Math.min(5, Math.max(0.25, ratio));
    }

    const el = selector => document.querySelector(selector);

    const parts = {
        header: () => el(".plan-header"),
        titleBox: () => el(".title-box"),
        category: () => el(".category-toolbar"),
        timelineHeader: () => el("#timelineHeader"),
        schedule: () => el("#scheduleArea"),
        hlineViewport: () => el("#hlineLayerViewport"),
        scroll: () => el(".timeline-horizontal-scroll"),
        bracket: () => el("#bracketArea"),
        notes: () => el("#boardNotesSection"),
        footer: () => el(".footer-reserved-space")
    };

    const TOUCHED = ["header", "category", "timelineHeader", "schedule", "hlineViewport", "scroll", "bracket", "notes"];

    /* ---------- โหมดเลื่อนหน้า (ซูมมากจนจอไม่พอ) ---------- */

    let spacer = null;

    function setScrollMode(on, contentBottom, footerH, chromeZoom) {

        const update = el(".zg-update-date");

        if (!on) {

            plan.style.removeProperty("overflow-y");
            plan.style.removeProperty("overflow-x");

            if (spacer) {
                spacer.remove();
                spacer = null;
            }

            if (update) {
                update.style.removeProperty("top");
                update.style.removeProperty("bottom");
            }

            plan.scrollTop = 0;

            return;
        }

        plan.style.overflowY = "auto";
        plan.style.overflowX = "hidden";

        if (!spacer) {

            spacer = document.createElement("div");
            spacer.className = "zg-zoom-spacer";
            spacer.style.cssText = "position:absolute;left:0;width:1px;height:1px;pointer-events:none;visibility:hidden;";

            plan.appendChild(spacer);
        }

        const total = contentBottom + footerH;

        spacer.style.top = `${Math.round(total - 1)}px`;

        /* ช่อง Update ตามไปอยู่ใต้บันทึก (ไม่ลอยทับตาราง) */
        if (update) {

            const updateH = update.getBoundingClientRect().height || 28 * chromeZoom;

            update.style.top = `${((contentBottom + (footerH - updateH) / 2) / chromeZoom).toFixed(2)}px`;
            update.style.bottom = "auto";
        }
    }

    function clearLayout() {

        setScrollMode(false);

        TOUCHED.forEach(name => {

            const node = parts[name]();

            if (!node) return;

            ["top", "height", "bottom"].forEach(prop => node.style.removeProperty(prop));
        });

        root.classList.remove("zg-zoom-focus");
        root.style.removeProperty("--zg-chrome-zoom");
        root.style.removeProperty("--zg-text-zoom");
    }

    /* scale = zoom ของ element นั้น (ค่า px ของ element ที่ถูก zoom จะถูกคูณด้วย zoom → หารกลับ) */
    function setBox(node, top, height, scale = 1) {

        if (!node) return;

        node.style.top = `${(top / scale).toFixed(2)}px`;
        node.style.height = `${(Math.max(0, height) / scale).toFixed(2)}px`;
        node.style.bottom = "auto";
    }

    function cssNumber(name, fallback) {

        const value = parseFloat(getComputedStyle(root).getPropertyValue(name));

        return Number.isFinite(value) ? value : fallback;
    }


    /* =====================================================
       LAYOUT
    ===================================================== */

    let lastKey = "";

    function layout() {

        const zoom = detectZoom();

        const H = plan.clientHeight;

        const key = `${zoom}:${H}:${plan.clientWidth}`;

        if (key === lastKey) {
            return false;
        }

        lastKey = key;

        if (zoom < FOCUS_FROM || !H) {

            const wasFocused = root.classList.contains("zg-zoom-focus");

            clearLayout();

            return wasFocused;
        }

        const chromeZoom = (1 + (zoom - 1) * CHROME_FOLLOW) / zoom;
        const textZoom = (1 + (zoom - 1) * TEXT_FOLLOW) / zoom;

        root.classList.add("zg-zoom-focus");
        root.style.setProperty("--zg-chrome-zoom", chromeZoom.toFixed(4));
        root.style.setProperty("--zg-text-zoom", textZoom.toFixed(4));


        const gap = 6;

        /* ---------- ด้านบน: หัวกระดาน → ปุ่มหมวดหมู่ → หัวเดือน ---------- */

        const header = parts.header();
        const titleBox = parts.titleBox();

        const titleH = titleBox ? titleBox.getBoundingClientRect().height : 40 * chromeZoom;

        const headerTop = Math.max(4, H * 0.008);
        const headerH = titleH + 6;

        setBox(header, headerTop, headerH, chromeZoom);

        const category = parts.category();

        let y = headerTop + headerH + 4;

        if (category) {

            category.style.top = `${(y / chromeZoom).toFixed(2)}px`;
            category.style.bottom = "auto";

            y += category.getBoundingClientRect().height + gap;
        }

        const timelineHeaderH = cssNumber("--timeline-header-height", 40);

        setBox(parts.timelineHeader(), y, timelineHeaderH);

        const scheduleTop = y + timelineHeaderH;

        /* ---------- ด้านล่าง: บันทึก ← Bracket ← แถบเลื่อน ---------- */

        /* ที่ว่างด้านล่างสำหรับแถบบริษัท/ช่อง Update (ย่อตาม chrome) */
        const footerH = cssNumber("--footer-reserved-height", 54) * chromeZoom;

        let notesH = Math.max(80, 150 * chromeZoom, H * 0.12);

        const scrollH = Math.max(14, 20 * chromeZoom);

        /* ช่อง Bracket ต้องสูงพอให้ป้ายเส้นวันที่ (ใหญ่ตามซูม) ไม่ล้น */
        const bracketH = Math.max(H * (window.ZG_BRACKET_RATIO || 0.095), 80);

        /*
            ตารางต้องสูงอย่างน้อยเท่านี้ (px ของหน้าเว็บ) ให้ 3 หมวดหมู่ยังอ่านง่าย
            ซูมมาก ๆ จอไม่พอ → ให้กระดานเลื่อนขึ้นลงได้แทนการบีบตาราง
        */
        const minSchedule = Math.max(210, H * 0.3);

        let available =
            H - footerH - notesH - gap - bracketH - 4 - scrollH - 4 - scheduleTop;

        /* ตารางเล็กเกินไป → ลดพื้นที่บันทึกก่อน (ไม่ต่ำกว่า 60) */
        if (available < minSchedule) {

            const cut = Math.min(Math.max(0, notesH - 60), minSchedule - available);

            notesH -= cut;

            available += cut;
        }

        /* ยังไม่พอ → โหมดเลื่อนหน้า: ตารางสูงตามที่ควร บันทึกเต็มขนาด กระดานเลื่อนลงดูได้ */
        const scrollMode = available < minSchedule;

        if (scrollMode) {
            notesH = Math.max(80, 150 * chromeZoom);
        }

        const scheduleH = scrollMode ? minSchedule : Math.max(80, available);

        setBox(parts.schedule(), scheduleTop, scheduleH);

        const scrollTop = scheduleTop + scheduleH + 4;

        setBox(parts.scroll(), scrollTop, scrollH, chromeZoom);

        const bracketTop = scrollTop + scrollH + 4;

        setBox(parts.bracket(), bracketTop, bracketH);

        setBox(parts.hlineViewport(), scheduleTop, bracketTop + bracketH - scheduleTop);

        const notesTop = bracketTop + bracketH + gap;

        const notesBoxH = scrollMode ? notesH : Math.max(40, H - footerH - notesTop);

        setBox(parts.notes(), notesTop, notesBoxH, chromeZoom);

        setScrollMode(scrollMode, notesTop + notesBoxH, footerH, chromeZoom);

        return true;
    }


    /* =====================================================
       EVENTS
    ===================================================== */

    let dispatching = false;

    function relayout() {

        if (dispatching) return;

        if (layout()) {

            /* ให้ app.js วาดตารางใหม่ตามความสูงใหม่ (แถวสูงขึ้น) */
            dispatching = true;

            window.dispatchEvent(new Event("resize"));

            dispatching = false;
        }
    }

    window.addEventListener("resize", relayout);

    /* toolbar เปลี่ยนความสูง (ขึ้นบรรทัด/ย่อ) → กระดานขยับ */
    if (typeof ResizeObserver === "function") {
        new ResizeObserver(() => { lastKey = ""; relayout(); }).observe(plan);
    }

    relayout();

    setTimeout(() => { lastKey = ""; relayout(); }, 600);


    window.ZGZoomFocus = {
        refresh() {
            lastKey = "";
            relayout();
        }
    };

})();
