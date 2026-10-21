"use strict";

/* =========================================================
   RESPONSIVE.JS — ปรับการแสดงผลให้พอดีทุกหน้าจออัตโนมัติ
   (มือถือ / iPad / แท็บเล็ต / จอคอมทุกขนาด)

   ใส่ไว้ใน <head> ต่อจาก <meta name="viewport"> (ทำงานได้ก่อนหน้าเว็บโหลด)
   ไม่แก้ app.js / style.css

   หลักการ:
   1) มือถือ / แท็บเล็ตจอเล็ก
      → ให้เบราว์เซอร์จัดหน้าเหมือนจอคอมกว้าง 1366px แล้วย่อลงพอดีจอ
        (ตำแหน่งทุกอย่างคำนวณเหมือนบนคอม 100%) นิ้วถ่างซูมดูใกล้ ๆ ได้
   2) จอแนวตั้ง (มือถือ / iPad ตั้ง / หน้าต่างคอมที่สูงกว่ากว้าง)
      → จำกัดความสูงกระดานให้ได้สัดส่วนเหมือนจอแนวนอน ไม่ยืดยาว
        พร้อมป้ายแนะนำให้หมุนจอ
   3) จอสัมผัส
      → ลากกล่องงาน / เส้น / กล่อง Text / จุดยืดขนาด ด้วยนิ้วได้
      → ปัดขึ้นลงบนตาราง = เลื่อนหมวดหมู่, ปัดซ้ายขวา = เลื่อนเดือน
      → ปุ่ม ⋮ แสดงตลอด, จุดจับขนาดใหญ่ขึ้นให้กดง่าย
   4) จอคอมใหญ่มาก (2K / 4K) → toolbar ใหญ่ขึ้นให้อ่านง่าย
      จอคอมเล็ก / หน้าต่างแคบ → ปรับความกว้างคอลัมน์ซ้ายให้พอดี
========================================================= */

(function () {

    /* =====================================================
       CONFIG
    ===================================================== */

    const DESIGN_WIDTH = 1366;          // ความกว้างที่ใช้จัดหน้าบนมือถือ/แท็บเล็ต

    const SMALL_DEVICE_MAX_SIDE = 900;  // ด้านสั้นของจอเล็กกว่านี้ = มือถือ/แท็บเล็ตเล็ก

    const BOARD_RATIO = 0.6;            // สัดส่วน สูง : กว้าง ของกระดานในจอแนวตั้ง

    const BOARD_MIN_HEIGHT = 560;

    const DRAG_THRESHOLD = 6;           // px ก่อนนับว่าเป็นการลาก (ไม่ใช่แตะ)

    /* ความกว้างช่องวัน (px) ที่ต่ำกว่านี้ถึงจะเริ่มซ่อนเลขวันบางวัน */
    /*
        เลข 2 หลักขนาดอ่านสบาย (11px) ต้องการช่อง ~13px
        แคบกว่านี้ → แสดงเลขเฉพาะวันจันทร์ (ห่างกันสัปดาห์ละช่อง ไม่ชนกัน)
        แคบมาก ๆ → แค่วันที่ 1 กับ 15
    */
    const DAY_SPARSE_PX = 13;

    const DAY_MINIMAL_PX = 2.6;

    const DRAG_SELECTOR = [
        ".canvas-object",
        ".zg-text-box",
        ".canvas-object-handle",
        ".zg-text-handle"
    ].join(",");


    /* =====================================================
       DEVICE
    ===================================================== */

    const isTouch =
        (navigator.maxTouchPoints || 0) > 0 ||
        (window.matchMedia && window.matchMedia("(pointer: coarse)").matches);

    const shortSide =
        Math.min(window.screen.width || 0, window.screen.height || 0) ||
        Math.min(window.innerWidth, window.innerHeight);

    const isSmallDevice =
        isTouch && shortSide < SMALL_DEVICE_MAX_SIDE;


    /* =====================================================
       1) VIEWPORT (ทำทันที ก่อนหน้าเว็บวาด)
    ===================================================== */

    function setViewport() {

        let meta =
            document.querySelector('meta[name="viewport"]');

        if (!meta) {

            meta = document.createElement("meta");

            meta.name = "viewport";

            document.head.appendChild(meta);
        }

        meta.content =
            isSmallDevice
                ? `width=${DESIGN_WIDTH}, user-scalable=yes, maximum-scale=5`
                : "width=device-width, initial-scale=1.0";
    }

    setViewport();


    const root = document.documentElement;

    root.classList.add(
        isSmallDevice ? "zg-device-small" : (isTouch ? "zg-device-touch" : "zg-device-desktop")
    );

    if (isTouch) {
        root.classList.add("zg-touch");
    }


    /* =====================================================
       STYLE
    ===================================================== */

    const style =
        document.createElement("style");

    style.textContent = `
/* ---------- จอสัมผัส ---------- */
html.zg-touch button,
html.zg-touch .toolbar-control,
html.zg-touch .toolbar-square-btn { touch-action: manipulation; }

/* เริ่มลากบน object ด้วยนิ้ว → ไม่ให้หน้าเลื่อนแทน */
html.zg-touch .canvas-object,
html.zg-touch .zg-text-box,
html.zg-touch .canvas-object-handle,
html.zg-touch .zg-text-handle { touch-action: none; }

/* ตาราง: ปัดซ้ายขวาเลื่อนเดือน (เบราว์เซอร์ทำ), ปัดขึ้นลงเลื่อนหมวด (ไฟล์นี้ทำ) */
html.zg-touch #scheduleArea { touch-action: pan-x pinch-zoom; }

/* ไม่มีเมาส์ชี้ → ปุ่ม ⋮ แสดงตลอด */
html.zg-touch .category-more-btn,
html.zg-touch .row-more-btn {
    opacity: .7;
    pointer-events: auto;
}

/* จุดจับยืดขนาดใหญ่ขึ้น */
html.zg-touch .canvas-object-handle { width: 16px; }
html.zg-touch .canvas-object-handle--start { left: -8px; }
html.zg-touch .canvas-object-handle--end { right: -8px; }
html.zg-touch .canvas-object-handle--top,
html.zg-touch .canvas-object-handle--bottom { width: auto; height: 16px; }
html.zg-touch .canvas-object-handle--top { top: -8px; }
html.zg-touch .canvas-object-handle--bottom { bottom: -8px; }

html.zg-touch .zg-text-handle { width: 16px; height: 16px; }
html.zg-touch .zg-text-handle--n  { top: -8px; margin-left: -8px; }
html.zg-touch .zg-text-handle--s  { bottom: -8px; margin-left: -8px; }
html.zg-touch .zg-text-handle--e  { right: -8px; margin-top: -8px; }
html.zg-touch .zg-text-handle--w  { left: -8px; margin-top: -8px; }
html.zg-touch .zg-text-handle--ne { top: -8px; right: -8px; }
html.zg-touch .zg-text-handle--nw { top: -8px; left: -8px; }
html.zg-touch .zg-text-handle--se { bottom: -8px; right: -8px; }
html.zg-touch .zg-text-handle--sw { bottom: -8px; left: -8px; }

html.zg-touch .zg-text-btn { width: 28px; height: 28px; font-size: 13px; }
html.zg-touch .zg-text-controls { top: -32px; }

/* ---------- จอคอมใหญ่มาก (2K / 4K) ---------- */
html.zg-screen-xl {
    --toolbar-height: 92px;
}
html.zg-screen-xl .toolbar-row { flex-basis: 40px; }
html.zg-screen-xl .toolbar-control,
html.zg-screen-xl .toolbar-square-btn,
html.zg-screen-xl .toolbar-print-scale,
html.zg-screen-xl .toolbar-date-input { height: 32px; font-size: 14px; }
html.zg-screen-xl .toolbar-square-btn { width: 34px; }
html.zg-screen-xl .toolbar-label { font-size: 12px; }
html.zg-screen-xl .toolbar-search { height: 32px; width: 260px; }
html.zg-screen-xl .toolbar-search input { font-size: 13px; }

/* ---------- จอคอมเล็ก / หน้าต่างแคบ ---------- */
html.zg-screen-s {
    /* หน้าต่างแคบ (แบ่งครึ่งจอ) → ช่องชื่อหมวด/แถว ไม่แคบกว่านี้ (ชื่อไม่หักกลางคำ) */
    --category-width: max(12%, 96px);
    --party-width: max(20%, 132px);
}
html.zg-screen-s #categorySidebar .category { padding-right: 18px; }

/* ---------- toolbar ล้นจอ (หน้าต่างแคบ / กด Ctrl+ ซูมเบราว์เซอร์) → ขึ้นบรรทัดใหม่ ---------- */
html.zg-toolbar-wrap .workspace-toolbar {
    height: auto;
    overflow: visible;
    padding-bottom: 6px;
}
html.zg-toolbar-wrap .toolbar-row {
    flex: 0 0 auto;
    flex-wrap: wrap;
    min-width: 0;
    row-gap: 4px;
}
html.zg-toolbar-wrap .toolbar-row-secondary { margin-top: 4px; }

/* ---------- toolbar ขึ้นหลายบรรทัดจนกินจอ (หน้าต่างแคบ / ซูมเบราว์เซอร์มาก)
   → เหลือ 2 แถว แต่ละแถวเลื่อนซ้ายขวาได้ (ล้อเมาส์ / ลากแถบ / ปัดนิ้ว) ---------- */
html.zg-toolbar-scroll .workspace-toolbar {
    height: auto;
    overflow: visible;
    padding-bottom: 4px;
}
html.zg-toolbar-scroll .toolbar-row {
    flex: 0 0 auto;
    flex-wrap: nowrap;
    min-width: 0;
    overflow-x: auto;
    overflow-y: hidden;
    overscroll-behavior-x: contain;
    padding-bottom: 4px;
    scrollbar-width: thin;
    scrollbar-color: #c3ccc7 transparent;
    -webkit-mask-image: linear-gradient(to right, #000 calc(100% - 28px), transparent);
            mask-image: linear-gradient(to right, #000 calc(100% - 28px), transparent);
}
/* กล่องขวาบน (ตรวจคำผิด / ค้นหา) ลอยอยู่ → แถวต้องจบก่อนกล่อง ไม่ใช่เลื่อนลอดใต้กล่อง */
html.zg-toolbar-scroll .workspace-toolbar .toolbar-row {
    margin-right: var(--zg-toolbar-right-space, 0px);
    padding-right: 0;
}
html.zg-toolbar-scroll .toolbar-row.zg-row-end {
    -webkit-mask-image: none;
            mask-image: none;
}
html.zg-toolbar-scroll .toolbar-row::-webkit-scrollbar { height: 5px; }
html.zg-toolbar-scroll .toolbar-row::-webkit-scrollbar-thumb { background: #c3ccc7; border-radius: 3px; }
html.zg-toolbar-scroll .toolbar-row-secondary { margin-top: 2px; }
html.zg-toolbar-scroll .toolbar-row > * { flex-shrink: 0; }
html.zg-toolbar-scroll body.zg-dark .toolbar-row { scrollbar-color: #4a5550 transparent; }

/* ---------- เลขวันบนหัวตารางแน่นเกิน → แสดงเฉพาะวันจันทร์ (ต้นสัปดาห์) ---------- */
html.zg-days-sparse .day-number-label,
html.zg-days-minimal .day-number-label { visibility: hidden; }

html.zg-days-sparse .day-number-label[data-dow="1"]:not(.zg-day-yield),
html.zg-days-minimal .day-number-label[data-date$="-01"]:not(.zg-day-yield),
html.zg-days-minimal .day-number-label[data-date$="-15"]:not(.zg-day-yield),
html.zg-days-sparse .day-number-label--highlight,
html.zg-days-sparse .day-number-label--highlight-vline,
html.zg-days-minimal .day-number-label--highlight,
html.zg-days-minimal .day-number-label--highlight-vline {
    visibility: visible;
    font-size: 11px !important;
    overflow: visible;
    display: flex;
    justify-content: center;
}
html.zg-days-sparse .day-number-label[data-dow="1"] { color: #4f5853; font-weight: 600; }

/* ช่องวันแคบ: เส้นรายวันจางลง เส้นวันจันทร์ (ต้นสัปดาห์) ชัดขึ้น */
html.zg-days-sparse .dynamic-v-line--day:not(.is-monday),
html.zg-days-minimal .dynamic-v-line--day:not(.is-monday) { opacity: .45; }
html.zg-days-sparse .dynamic-v-line--day.is-monday { border-left: 1px dashed #c3cbc6; }
html.zg-days-sparse body.zg-dark .dynamic-v-line--day.is-monday { border-left-color: #3a4341; }
html.zg-days-sparse body.zg-dark .day-number-label[data-dow="1"] { color: #b7c1bc; }

/* ---------- จอแนวตั้ง ---------- */
.zg-rotate-hint {
    position: fixed;
    left: 50%;
    transform: translateX(-50%);
    display: none;
    align-items: center;
    gap: 10px;
    padding: 14px 20px;
    border: 1px dashed #b9c4bd;
    border-radius: 12px;
    background: #f4f7f5;
    color: #5a635f;
    font-size: 15px;
    z-index: 100;
    pointer-events: none;
    white-space: nowrap;
}
.zg-rotate-hint-icon { font-size: 26px; }
html.zg-portrait .zg-rotate-hint { display: flex; }

@media screen {
    body.zg-dark .zg-rotate-hint {
        background: #1f2527;
        border-color: #3a4441;
        color: #9aa5a0;
    }
}

@media print {
    .zg-rotate-hint { display: none !important; }
}
`;

    document.head.appendChild(style);


    /* =====================================================
       2) LAYOUT: ขนาดจอ / แนวตั้ง
    ===================================================== */

    let plan = null;

    let hint = null;

    let lastKey = "";


    function applyLayout() {

        const width = window.innerWidth;
        const height = window.innerHeight;

        root.classList.toggle("zg-screen-xl", width >= 2200);
        root.classList.toggle("zg-screen-s", width < 1100 && !isSmallDevice);

        plan = plan || document.querySelector(".plan");

        if (!plan) {
            return;
        }

        const toolbar = document.querySelector(".workspace-toolbar");

        const toolbarHeight = updateToolbarWrap(toolbar);

        updateDayDensity();

        const available = height - toolbarHeight;

        const idealHeight =
            Math.max(BOARD_MIN_HEIGHT, Math.round(width * BOARD_RATIO));

        /*
            สูงกว่าที่ควรเกิน 25% = จอแนวตั้ง → จำกัดความสูงกระดาน
            จอคอม (เมาส์) เช่น แบ่งครึ่งจอ 960×1040 → ใช้เต็มความสูง ไม่ขึ้นป้ายหมุนจอ
            (หมุนจอคอมไม่ได้ และพื้นที่ว่างด้านล่างดูเหมือนหน้าพัง)
            ยกเว้นหน้าต่างสูงมาก ๆ (สูง > 2 เท่าของกว้าง) ค่อยจำกัด
        */
        const portrait = isTouch
            ? available > idealHeight * 1.25
            : available > Math.max(idealHeight * 1.25, width * 2);

        root.classList.toggle("zg-portrait", portrait);

        const key = `${width}x${height}:${portrait}:${toolbarHeight}:${browserZoom}`;

        if (key === lastKey) {
            return;
        }

        lastKey = key;

        if (portrait) {

            plan.style.bottom = "auto";
            plan.style.height = `${idealHeight}px`;

            if (!hint && isTouch) {

                hint = document.createElement("div");

                hint.className = "zg-rotate-hint";

                hint.innerHTML =
                    `<span class="zg-rotate-hint-icon">⟳</span>` +
                    `<span>หมุนจอเป็นแนวนอน เพื่อดูแผนได้ใหญ่ขึ้น</span>`;

                document.body.appendChild(hint);
            }

            if (hint) hint.style.top = `${toolbarHeight + idealHeight + 40}px`;

        } else {

            plan.style.bottom = "";
            plan.style.height = "";
        }

        /* ให้ตาราง / ปุ่มพิมพ์ / กล่อง Text คำนวณขนาดใหม่ */
        window.dispatchEvent(new Event("resize"));
    }


    /*
        toolbar ล้น (กว้างกว่าจอ) → ให้ขึ้นบรรทัดใหม่แทนการซ่อนไว้ทางขวา
        แล้วบอก style.css ความสูงใหม่ผ่าน --toolbar-height (กระดานจะเลื่อนลงตาม)
    */
    /*
        ระดับซูมของเบราว์เซอร์ (Ctrl+ / Ctrl−) บนคอม
        ประมาณจาก ความกว้างหน้าต่างจริง ÷ ความกว้างพื้นที่หน้าเว็บ
        (มือถือ/แท็บเล็ตใช้นิ้วถ่างซูม → ไม่ต้องคำนวณ)
    */
    function detectBrowserZoom() {

        if (isTouch || !window.outerWidth || !window.innerWidth) {
            return 1;
        }

        const ratio = window.outerWidth / window.innerWidth;

        /* ปัดเป็นขั้นละ 5% (ขอบหน้าต่างทำให้คลาดนิดหน่อย) */
        const rounded = Math.round(ratio * 20) / 20;

        if (!Number.isFinite(rounded) || Math.abs(rounded - 1) < 0.04) {
            return 1;
        }

        return Math.min(5, Math.max(0.25, rounded));
    }


    let browserZoom = 1;

    /* toolbar ตามซูมเบราว์เซอร์กี่ส่วน (0 = ขนาดคงที่, 1 = ใหญ่ตามเต็มที่) */
    const TOOLBAR_ZOOM_FOLLOW = 0.5;
    const TOOLBAR_ZOOM_MIN = 0.8;
    const TOOLBAR_ZOOM_MAX = 1.6;


    /*
        toolbar:
        - กด Ctrl+ ซูมเบราว์เซอร์ → ย่อ toolbar กลับให้ขนาดเท่าเดิม
          (กระดาน/ตารางใหญ่ขึ้นตามซูม แต่ toolbar ไม่ใหญ่ตาม)
        - ถ้ายังล้นจอ (หน้าต่างแคบจริง ๆ) → ขึ้นบรรทัดใหม่
        แล้วบอก style.css ความสูงใหม่ผ่าน --toolbar-height (กระดานเลื่อนตาม)
    */
    function updateToolbarWrap(toolbar) {

        if (!toolbar) {
            return 76;
        }

        browserZoom = detectBrowserZoom();

        /*
            ซูมเบราว์เซอร์ → toolbar โตตามแค่ครึ่งเดียวของกระดาน (ไม่ค้างเล็กเท่าเดิม
            จนดูไม่เข้ากับหน้า และไม่ใหญ่จนกินพื้นที่) เช่น ซูม 150% → toolbar 125%
        */
        const toolbarScale =
            Math.min(TOOLBAR_ZOOM_MAX, Math.max(TOOLBAR_ZOOM_MIN, 1 + (browserZoom - 1) * TOOLBAR_ZOOM_FOLLOW));

        toolbar.style.zoom =
            browserZoom === 1 ? "" : String(toolbarScale / browserZoom);

        root.classList.toggle("zg-browser-zoomed", browserZoom !== 1);

        /* วัดแบบไม่ wrap ก่อน (ล้างโหมดแถวเลื่อนด้วย ไม่งั้นวัดได้ว่า "ไม่ล้น" แล้วสลับไปมา) */
        root.classList.remove("zg-toolbar-wrap", "zg-toolbar-scroll");
        root.style.removeProperty("--toolbar-height");
        toolbar.style.height = "";

        /* ความสูงปกติของ toolbar จาก style.css (76px หรือ 92px บนจอใหญ่) */
        const baseHeight =
            parseFloat(getComputedStyle(root).getPropertyValue("--toolbar-height")) || 76;

        let overflow =
            toolbar.scrollWidth > toolbar.clientWidth + 2;

        /* ใหญ่จนล้นจอ → ลดขนาด toolbar ลงให้พอดีแถวเดียวก่อน (ไม่เล็กกว่าขนาดปกติ) */
        if (overflow && browserZoom !== 1 && toolbarScale > 0.8) {

            let scale = toolbarScale;

            for (let pass = 0; pass < 4 && overflow && scale > 0.8; pass += 1) {

                const fit = scale * (toolbar.clientWidth / toolbar.scrollWidth) * 0.97;

                scale = Math.max(0.8, Math.min(scale - 0.01, fit));

                toolbar.style.zoom = String(scale / browserZoom);

                overflow = toolbar.scrollWidth > toolbar.clientWidth + 2;
            }
        }

        if (overflow) {

            root.classList.add("zg-toolbar-wrap");

            /*
                ขึ้นบรรทัดแล้วสูงเกิน (เกิน ~3 แถว และเกิน 24% ของความสูงจอ)
                → ตารางแทบไม่เหลือที่ (เช่น ซูม 175% / แบ่งครึ่งจอ) เปลี่ยนเป็น 2 แถวเลื่อนซ้ายขวาแทน
            */
            const wrappedHeight = toolbar.getBoundingClientRect().height;

            if (wrappedHeight > Math.max(132, window.innerHeight * 0.24)) {
                root.classList.remove("zg-toolbar-wrap");
                root.classList.add("zg-toolbar-scroll");
                updateRowEnds(toolbar);
            }

        } else if (browserZoom !== 1) {

            /* toolbar ใช้ --toolbar-height เป็นความสูงตัวเองด้วย → ล็อกไว้ก่อนเปลี่ยนตัวแปร */
            toolbar.style.height = `${baseHeight + 4}px`;
        }

        /* ความสูงที่เห็นจริงบนหน้าเว็บ (หลังย่อ/ขึ้นบรรทัด) */
        const height =
            Math.round(toolbar.getBoundingClientRect().height);

        if (overflow || browserZoom !== 1) {
            root.style.setProperty("--toolbar-height", `${height}px`);
        }

        return height;
    }


    /* แถว toolbar ที่เลื่อนจนสุดแล้ว → ไม่ต้องจางขอบขวา */
    function updateRowEnds(toolbar) {
        (toolbar || document).querySelectorAll(".workspace-toolbar .toolbar-row, .toolbar-row").forEach(row => {
            row.classList.toggle("zg-row-end", row.scrollLeft + row.clientWidth >= row.scrollWidth - 2);
        });
    }

    /* โหมดแถวเลื่อน: หมุนล้อเมาส์บน toolbar = เลื่อนแถวซ้ายขวา */
    document.addEventListener("wheel", event => {

        if (!root.classList.contains("zg-toolbar-scroll") || event.ctrlKey) return;

        const row = event.target instanceof Element ? event.target.closest(".workspace-toolbar .toolbar-row") : null;

        if (!row || row.scrollWidth <= row.clientWidth + 1) return;

        const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;

        if (!delta) return;

        event.preventDefault();
        row.scrollLeft += delta;

    }, { passive: false });

    document.addEventListener("scroll", event => {
        if (event.target instanceof Element && event.target.matches(".toolbar-row")) updateRowEnds();
    }, true);

    /* เลขวันบนหัวตารางแคบเกินอ่าน → แสดงทุก 5 วัน หรือแค่วันที่ 1 กับ 15 */
    function updateDayDensity() {

        const px =
            typeof pxPerDay !== "undefined" ? Number(pxPerDay) : 0;

        if (!(px > 0)) {
            return;
        }

        /*
            ซ่อนเฉพาะตอนแน่นจนอ่านไม่ออกจริง ๆ
            (ช่องวันแคบกว่า DAY_SPARSE_PX → เฉพาะวันจันทร์, แคบกว่า DAY_MINIMAL_PX → วันที่ 1 กับ 15)
        */
        root.classList.toggle("zg-days-sparse", px < DAY_SPARSE_PX && px >= DAY_MINIMAL_PX);
        root.classList.toggle("zg-days-minimal", px < DAY_MINIMAL_PX);
    }


    /* ซูมด้วยปุ่ม ＋/− (หัวตารางวาดใหม่) → เช็กความแน่นของเลขวันใหม่ */
    function watchTimelineHeader() {

        const header = document.getElementById("timelineHeaderInner");

        if (!header) {
            return;
        }

        let densityTimer = null;

        new MutationObserver(() => {

            clearTimeout(densityTimer);

            densityTimer = setTimeout(updateDayDensity, 50);

        }).observe(header, { childList: true });
    }


    let layoutTimer = null;

    function scheduleLayout() {

        clearTimeout(layoutTimer);

        layoutTimer = setTimeout(applyLayout, 120);
    }


    /* resize ที่เราส่งเองไม่ต้องคำนวณซ้ำ (key เดิม → จบเร็ว) */
    window.addEventListener("resize", scheduleLayout);

    window.addEventListener("orientationchange", () => setTimeout(applyLayout, 300));


    /* =====================================================
       3) TOUCH → MOUSE (ลาก object ด้วยนิ้ว)
       ระบบเดิมรับแต่เมาส์ (mousedown / mousemove / mouseup)
       → แปลงการลากนิ้วเป็นเหตุการณ์เมาส์ แตะเฉย ๆ ยังเป็นการแตะปกติ
    ===================================================== */

    function fireMouse(target, type, x, y) {

        const event = new MouseEvent(type, {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: x,
            clientY: y,
            screenX: x,
            screenY: y,
            button: 0,
            buttons: type === "mouseup" ? 0 : 1
        });

        target.dispatchEvent(event);
    }


    let touchState = null;


    function onTouchStart(event) {

        if (event.touches.length !== 1) {

            /* สองนิ้ว = ถ่างซูม → ยกเลิกการลาก */
            if (touchState && touchState.started) {
                fireMouse(document, "mouseup", touchState.lastX, touchState.lastY);
            }

            touchState = null;

            return;
        }

        const element =
            event.target instanceof Element ? event.target : event.target.parentElement;

        if (!element) {
            return;
        }

        const touch = event.touches[0];

        const dragElement = element.closest(DRAG_SELECTOR);

        const onSchedule =
            !dragElement && element.closest("#scheduleArea");

        if (!dragElement && !onSchedule) {
            touchState = null;
            return;
        }

        touchState = {
            mode: dragElement ? "drag" : "scroll",
            target: element,
            startX: touch.clientX,
            startY: touch.clientY,
            lastX: touch.clientX,
            lastY: touch.clientY,
            started: false,
            direction: null,
            startScrollY:
                typeof verticalScrollY !== "undefined" ? verticalScrollY : 0
        };
    }


    function onTouchMove(event) {

        if (!touchState || event.touches.length !== 1) {
            return;
        }

        const touch = event.touches[0];

        const dx = touch.clientX - touchState.startX;
        const dy = touch.clientY - touchState.startY;

        touchState.lastX = touch.clientX;
        touchState.lastY = touch.clientY;


        /* ----- ลาก object ----- */

        if (touchState.mode === "drag") {

            if (!touchState.started) {

                if (Math.hypot(dx, dy) < DRAG_THRESHOLD) {
                    return;
                }

                /* กำลังเลือกข้อความในช่องที่พิมพ์อยู่ → ปล่อยให้เบราว์เซอร์ทำ */
                const editable =
                    touchState.target.closest('[contenteditable="true"]');

                if (editable && document.activeElement === editable) {
                    touchState = null;
                    return;
                }

                touchState.started = true;

                fireMouse(touchState.target, "mousedown", touchState.startX, touchState.startY);
            }

            event.preventDefault();

            fireMouse(document, "mousemove", touch.clientX, touch.clientY);

            return;
        }


        /* ----- ปัดบนตาราง: ขึ้นลง = เลื่อนหมวดหมู่ ----- */

        if (!touchState.direction) {

            if (Math.abs(dy) > DRAG_THRESHOLD && Math.abs(dy) > Math.abs(dx)) {

                touchState.direction = "vertical";

            } else if (Math.abs(dx) > DRAG_THRESHOLD) {

                /* ซ้ายขวา → ให้เบราว์เซอร์เลื่อนตารางเอง */
                touchState = null;

                return;

            } else {

                return;
            }
        }

        if (touchState.direction === "vertical" && typeof setVerticalScroll === "function") {

            event.preventDefault();

            setVerticalScroll(touchState.startScrollY - dy);
        }
    }


    function onTouchEnd() {

        if (touchState && touchState.started) {

            fireMouse(document, "mouseup", touchState.lastX, touchState.lastY);
        }

        touchState = null;
    }


    if (isTouch) {

        document.addEventListener("touchstart", onTouchStart, { passive: true });
        document.addEventListener("touchmove", onTouchMove, { passive: false });
        document.addEventListener("touchend", onTouchEnd, { passive: true });
        document.addEventListener("touchcancel", onTouchEnd, { passive: true });
    }


    /* =====================================================
       START
    ===================================================== */

    function start() {

        watchTimelineHeader();

        applyLayout();

        /* app.js วาดตารางหลังโหลดเสร็จ 2 เฟรม → เช็กซ้ำอีกรอบ */
        setTimeout(() => {
            lastKey = "";
            applyLayout();
        }, 400);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }


    window.ZGResponsive = {
        isTouch,
        isSmallDevice,
        refresh() {
            lastKey = "";
            applyLayout();
        }
    };

})();