"use strict";

/* =========================================================
   EXPORT-IMAGE.JS — Export รูปภาพ / Export เฉพาะตาราง
   เป็นไฟล์ PNG หรือ PDF (A3 แนวนอน)

   - ถ่าย "ตามที่เห็นบนจอ" (ตำแหน่งที่เลื่อน/ซูมไว้) ความละเอียด 2 เท่าของจอ
   - Export รูปภาพ      = ทั้งกระดาน (หัวแผน ตาราง เส้นวันที่ บันทึก ป้าย Update)
   - Export เฉพาะตาราง  = หัวเดือน/วันที่ + ตารางหลัก + ช่องเส้นวันที่ (Bracket)
   - ซ่อนของที่ไม่ควรติดไปในรูป: เมนู ปุ่ม แถบเลื่อน เส้นกรอบตอนเลือก ฯลฯ
   - ออกเป็นธีมสว่างเสมอ (เหมือนตอนพิมพ์)

   ใช้ไลบรารี (โหลดตอนกดใช้ครั้งแรก):
     html-to-image  → แปลงหน้าเว็บเป็นภาพ
     jsPDF          → สร้าง PDF
   ลองโหลดจากโฟลเดอร์ lib/ ข้างไฟล์ก่อน ถ้าไม่มีจะโหลดจาก CDN

   ไม่แก้ app.js: ดักคลิกปุ่มเดิม (#toolbarExportImageBtn /
   #toolbarExportTableBtn) ก่อนที่ app.js จะสั่ง window.print()
========================================================= */

(function () {

    const imageBtn =
        document.getElementById("toolbarExportImageBtn");

    const tableBtn =
        document.getElementById("toolbarExportTableBtn");

    /* หาปุ่ม Export: ใช้ id ก่อน ถ้าไม่มีจะหาปุ่มที่มีคำว่า Export บน toolbar แล้วใส่ id ให้ */
    if (!document.getElementById("exportPlanBtn")) {

        const fallback =
            Array.from(document.querySelectorAll(".workspace-toolbar button"))
                .find(item => item.textContent.includes("Export"));

        if (fallback) {

            fallback.id = "exportPlanBtn";

        } else {

            console.error("[export-image.js] ไม่พบปุ่ม Export บน toolbar");

            return;
        }
    }


    /* ใช้เช็กว่าเบราว์เซอร์โหลดไฟล์ตัวใหม่แล้ว (ดูใน Console: F12) */
    const EXPORT_IMAGE_VERSION = "2026-10-01g (fit table)";

    console.info(`[export-image.js] loaded ${EXPORT_IMAGE_VERSION}`);


    /* =====================================================
       CONFIG
    ===================================================== */

    const PIXEL_RATIO = 2;

    const PDF_MARGIN_MM = 8;

    const LIBS = {

        htmlToImage: {
            global: () => window.htmlToImage,
            sources: [
                "lib/html-to-image.js",
                "https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.js",
                "https://unpkg.com/html-to-image@1.11.11/dist/html-to-image.js"
            ]
        },

        jsPDF: {
            global: () => window.jspdf && window.jspdf.jsPDF,
            sources: [
                "lib/jspdf.umd.min.js",
                "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
                "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js"
            ]
        }
    };

    /* ของที่ไม่ให้ติดไปในรูป */
    const EXCLUDE_SELECTOR = [
        ".workspace-toolbar",
        ".company-footer",
        ".bottom-hot-zone",
        ".category-toolbar",
        ".timeline-horizontal-scroll",
        ".category-scrollbar",
        ".notes-scrollbar",
        ".add-note-btn",
        ".note-delete-btn",
        ".category-more-btn",
        ".row-more-btn",
        ".object-menu",
        ".category-menu",
        ".toolbar-more-menu",
        ".row-action-menu",
        ".role-manager-panel",
        ".new-category-dialog",
        ".zg-plan-dropdown",
        ".zg-plan-overlay",
        ".zg-plan-toast",
        ".zg-export-chooser",
        ".zg-export-menu",
        ".zg-export-toast",
        ".zg-import-toast",
        ".zg-print-panel",
        ".zg-print-toast",
        ".zg-import-menu",
        ".zg-import-drop",
        ".zg-text-controls",
        ".zg-text-handle",
        ".zg-text-magnet-highlight",
        ".canvas-object-handle",
        "script",
        "style[data-zg-skip]"
    ].join(",");


    /* =====================================================
       STYLE
    ===================================================== */

    const style =
        document.createElement("style");

    style.textContent = `
/* ระหว่าง export: ซ่อนกรอบ/ตัวช่วยตอนแก้ไข */
body.zg-exporting .zg-text-box,
body.zg-exporting .zg-text-box:hover,
body.zg-exporting .zg-text-box.is-selected,
body.zg-exporting .zg-text-box.is-attached { border-color: transparent !important; }
body.zg-exporting .zg-text-box.is-empty { display: none !important; }
/* ถ่ายทั้งตารางแบบต่อภาพ: กล่อง Update วาดแยก / กล่อง text ลอย (ไม่ติด object) อยู่แค่ภาพแรก */
body.zg-xp-tiling .zg-update-date { visibility: hidden !important; }
body.zg-xp-tiling.zg-xp-tile-more .zg-text-box:not(.is-attached) { visibility: hidden !important; }
body.zg-exporting [contenteditable="true"]:focus {
    background: transparent !important;
    box-shadow: none !important;
}

.zg-export-chooser {
    position: fixed;
    width: 180px;
    padding: 6px;
    background: #ffffff;
    border: 1px solid #d5dad7;
    border-radius: 10px;
    box-shadow: 0 8px 28px rgba(0, 0, 0, .16);
    z-index: 26000;
    font-size: 12px;
}
.zg-export-chooser-title {
    padding: 4px 8px 6px;
    color: #7a827e;
    font-size: 10px;
}
.zg-export-chooser button {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 10px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: #333333;
    font-family: inherit;
    font-size: 12px;
    text-align: left;
    cursor: pointer;
}
.zg-export-chooser button:hover { background: #f0f4f2; }
.zg-export-menu { width: 230px; }
.zg-export-chooser-row { display: flex; gap: 4px; }
.zg-export-chooser-row button { flex: 1; justify-content: center; border: 1px solid #e3e8e5; }
.zg-export-chooser-sep { height: 1px; margin: 4px 2px; background: #eef1ef; }

.zg-export-toast {
    position: fixed;
    left: 50%;
    bottom: 70px;
    transform: translateX(-50%);
    padding: 8px 14px;
    background: #1e2924;
    color: #ffffff;
    border-radius: 8px;
    font-size: 12px;
    box-shadow: 0 6px 20px rgba(0, 0, 0, .2);
    z-index: 32000;
    pointer-events: none;
}
.zg-export-toast.error { background: #d33b43; }

@media screen {
    body.zg-dark .zg-export-chooser {
        background: #1f2527;
        border-color: #3a4441;
        box-shadow: 0 8px 28px rgba(0, 0, 0, .5);
    }
    body.zg-dark .zg-export-chooser button { color: #e3e8e5; }
    body.zg-dark .zg-export-chooser button:hover { background: #30383a; }
    body.zg-dark .zg-export-chooser-title { color: #9aa5a0; }
    body.zg-dark .zg-export-chooser-row button { border-color: #3a4441; }
    body.zg-dark .zg-export-chooser-sep { background: #3a4441; }
}
`;

    document.head.appendChild(style);


    /* =====================================================
       HELPERS
    ===================================================== */

    let toastEl = null;
    let toastTimer = null;

    function showToast(message, { error = false, sticky = false } = {}) {

        if (!toastEl) {

            toastEl = document.createElement("div");
            toastEl.className = "zg-export-toast";
            document.body.appendChild(toastEl);
        }

        clearTimeout(toastTimer);

        toastEl.textContent = message;
        toastEl.classList.toggle("error", error);
        toastEl.style.display = "";

        if (!sticky) {

            toastTimer = setTimeout(
                () => { toastEl.style.display = "none"; },
                error ? 5000 : 2000
            );
        }
    }


    function hideToast() {

        if (toastEl) {
            toastEl.style.display = "none";
        }
    }


    function nextFrames(count) {

        return new Promise(resolve => {

            const step = remaining => {

                if (remaining <= 0) {
                    resolve();
                    return;
                }

                requestAnimationFrame(() => step(remaining - 1));
            };

            step(count);
        });
    }


    function loadScript(src) {

        return new Promise((resolve, reject) => {

            const script = document.createElement("script");

            script.src = src;
            script.async = true;

            script.onload = () => resolve();
            script.onerror = () => {
                script.remove();
                reject(new Error(`load failed: ${src}`));
            };

            document.head.appendChild(script);
        });
    }


    async function ensureLib(name) {

        const lib = LIBS[name];

        if (lib.global()) {
            return lib.global();
        }

        for (const src of lib.sources) {

            try {

                await loadScript(src);

                if (lib.global()) {
                    return lib.global();
                }

            } catch (error) {
                /* ลองแหล่งถัดไป */
            }
        }

        throw new Error(`LIB_MISSING:${name}`);
    }


    function safeFileName(name) {

        return (
            String(name || "plan")
                .trim()
                .replace(/[\\/:*?"<>|\s]+/g, "-")
                .replace(/-+/g, "-")
                .slice(0, 60) ||
            "plan"
        );
    }


    function baseFileName(kind) {

        const titleEl =
            document.querySelector(".plan-header .title");

        const title =
            titleEl ? titleEl.innerText.trim() : "plan";

        const today =
            typeof formatDateInputValue === "function"
                ? formatDateInputValue(new Date())
                : new Date().toISOString().slice(0, 10);

        return `${safeFileName(title)}_${kind === "table" ? "table_" : ""}${today}`;
    }


    function downloadUrl(url, fileName) {

        const link = document.createElement("a");

        link.href = url;
        link.download = fileName;

        document.body.appendChild(link);

        link.click();

        link.remove();
    }


    /* ขอบขวาจริงของตาราง (ตารางหด/ขยายตามจำนวนเดือน — ดู table-fit.js)
       null = หาไม่ได้ / ตารางยาวเกินจอ (ใช้ขอบเดิม) */
    function tableVisibleRight() {

        const viewport = document.getElementById("timelineViewport");
        const area = document.getElementById("scheduleArea");

        if (!viewport || !area || typeof timelineWidthPx === "undefined" || !(timelineWidthPx > 0)) {
            return null;
        }

        const viewportRect = viewport.getBoundingClientRect();
        const areaRight = area.getBoundingClientRect().right;

        const endX = viewportRect.left + timelineWidthPx - viewport.scrollLeft;

        /* +2 = เส้นปิดท้ายตาราง */
        return endX + 2 < areaRight ? endX + 2 : null;
    }


    /* พื้นที่ที่จะตัดออกมา (พิกัดบนจอ) — ตัดขอบขวาให้พอดีกับตารางเสมอ */
    function getCropRect(kind) {

        const rect = getFullCropRect(kind);

        const tableRight = tableVisibleRight();

        if (tableRight === null) {
            return rect;
        }

        if (kind === "table") {

            rect.right = Math.min(rect.right, tableRight);

        } else {

            /* ทั้งกระดาน: เว้นขอบขวาเท่ากับขอบซ้าย (ระยะจากขอบกระดานถึงตาราง) */
            const area = document.getElementById("scheduleArea");

            const margin = area
                ? Math.max(8, area.getBoundingClientRect().left - rect.left)
                : 16;

            rect.right = Math.min(rect.right, tableRight + margin);
        }

        return rect;
    }


    /* ทั้งกระดานถูกตัดขอบขวา → ย้ายกล่อง Update มาไว้ในกรอบชั่วคราวตอนถ่าย */
    function moveUpdateDateInto(crop) {

        const element = document.querySelector(".zg-update-date");

        if (!element) {
            return () => {};
        }

        const rect = element.getBoundingClientRect();

        const margin = 8;

        if (!rect.width || rect.right <= crop.right - margin + 0.5) {
            return () => {};
        }

        const previous = element.style.transform;

        const shift = Math.max(crop.left + margin - rect.left, crop.right - margin - rect.right);

        element.style.transform = `translateX(${shift}px) ${previous || ""}`.trim();

        return () => {
            element.style.transform = previous;
        };
    }


    function getFullCropRect(kind) {

        if (kind === "table") {

            /* หัวเดือน/วันที่ → ตารางหลัก → ช่องเส้นวันที่ (Bracket) */
            const parts = [
                document.getElementById("timelineHeader"),
                document.getElementById("scheduleArea"),
                document.getElementById("bracketArea") || document.querySelector(".bracket-area")
            ].filter(Boolean).map(element => element.getBoundingClientRect());

            if (parts.length) {

                return {
                    left: Math.min(...parts.map(rect => rect.left)),
                    top: Math.min(...parts.map(rect => rect.top)),
                    right: Math.max(...parts.map(rect => rect.right)),
                    bottom: Math.max(...parts.map(rect => rect.bottom))
                };
            }
        }

        const plan =
            document.querySelector(".plan");

        const rect =
            plan
                ? plan.getBoundingClientRect()
                : { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };

        return {
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom
        };
    }


    /* =====================================================
       SCROLL → TRANSFORM
       html-to-image สร้างหน้าใหม่จากการ clone DOM และค่า scrollLeft /
       scrollTop ไม่ติดไปด้วย (กลายเป็น 0 หมด) ทำให้ของที่อยู่ในกล่อง
       ที่เลื่อนได้ (ตาราง, ช่องเส้นวันที่, บันทึก) เลื่อนไปจากที่เห็นบนจอ
       → ก่อนถ่าย: ขยับลูกของกล่องนั้นด้วย transform เท่ากับระยะ scroll
       → หลังถ่าย: คืนค่า transform เดิม
    ===================================================== */

    function freezeScrollOffsets() {

        const changes = [];

        document.querySelectorAll("body *").forEach(element => {

            const scrollX = element.scrollLeft;
            const scrollY = element.scrollTop;

            if (!scrollX && !scrollY) {
                return;
            }

            Array.from(element.children).forEach(child => {

                const previous = child.style.transform;

                changes.push([child, previous]);

                child.style.transform =
                    `translate(${-scrollX}px, ${-scrollY}px) ${previous || ""}`.trim();
            });
        });

        return () => {

            changes.reverse().forEach(([child, previous]) => {
                child.style.transform = previous;
            });
        };
    }


    /* =====================================================
       CAPTURE
    ===================================================== */

    let busy = false;


    async function capture(kind, options = {}) {

        const ratio =
            Number(options.pixelRatio) > 0 ? Number(options.pixelRatio) : PIXEL_RATIO;

        const htmlToImage =
            await ensureLib("htmlToImage");


        /* เตรียมหน้าจอ: ปิดเมนู เลิกโฟกัส ซ่อนตัวช่วย ใช้ธีมสว่าง */

        if (typeof closeToolbarMoreMenu === "function") closeToolbarMoreMenu();
        if (typeof closeObjectMenu === "function") closeObjectMenu();
        if (typeof closeCategoryMenu === "function") closeCategoryMenu();
        if (typeof closeRowMenu === "function") closeRowMenu();

        if (document.activeElement && document.activeElement.blur) {
            document.activeElement.blur();
        }

        const wasDark =
            document.body.classList.contains("zg-dark");

        document.body.classList.remove("zg-dark");
        document.body.classList.add("zg-exporting");

        hideToast();

        let restoreScroll = null;

        let restoreUpdateDate = null;

        try {

            await nextFrames(2);

            const crop = options.screen
                ? { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight }
                : getCropRect(kind);

            if (kind !== "table" && !options.screen) {
                restoreUpdateDate = moveUpdateDateInto(crop);
            }

            /* ไลบรารีถ่ายภาพไม่จำตำแหน่ง scroll → แปลง scroll เป็น transform ชั่วคราว */
            restoreScroll =
                freezeScrollOffsets();

            const width = window.innerWidth;
            const height = window.innerHeight;

            const fullCanvas =
                await htmlToImage.toCanvas(document.body, {

                    width,
                    height,

                    canvasWidth: width,
                    canvasHeight: height,

                    pixelRatio: ratio,

                    backgroundColor: "#ffffff",

                    /* ถ่ายต่อภาพ: โหลดรูปใหม่แค่ภาพแรก ภาพถัดไปใช้ที่โหลดไว้ (เร็วขึ้นมาก) */
                    cacheBust: options.cacheBust !== false,

                    skipFonts: true,

                    /* รูปที่โหลดไม่ได้ (เช่นเปิดไฟล์ตรง ๆ แบบ file://) จะเว้นว่างแทนการพัง */
                    imagePlaceholder:
                        "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==",

                    filter: node =>
                        !(node instanceof Element && node.matches(EXCLUDE_SELECTOR))
                });


            /* ตัดเฉพาะส่วนที่ต้องการ */

            const sx = Math.max(0, Math.round(crop.left * ratio));
            const sy = Math.max(0, Math.round(crop.top * ratio));
            const sw = Math.min(fullCanvas.width - sx, Math.round((crop.right - crop.left) * ratio));
            const sh = Math.min(fullCanvas.height - sy, Math.round((crop.bottom - crop.top) * ratio));

            const canvas = document.createElement("canvas");

            canvas.width = sw;
            canvas.height = sh;

            const context = canvas.getContext("2d");

            context.fillStyle = "#ffffff";
            context.fillRect(0, 0, sw, sh);
            context.drawImage(fullCanvas, sx, sy, sw, sh, 0, 0, sw, sh);

            return canvas;

        } finally {

            if (restoreScroll) {
                restoreScroll();
            }

            if (restoreUpdateDate) {
                restoreUpdateDate();
            }

            document.body.classList.remove("zg-exporting");

            if (wasDark) {
                document.body.classList.add("zg-dark");
            }
        }
    }


    /* =====================================================
       FULL CAPTURE — ถ่าย "ทุกอย่างในตาราง" ไม่สนขอบจอ
       - แนวนอน: ตั้งแต่วันเริ่มตาราง → 5 วันหลัง object ชิ้นสุดท้าย
       - แนวตั้ง: ทุกหมวดหมู่ (เกิน 3 หมวด = เลื่อนถ่ายทีละหน้าจอ)
       วิธี: เลื่อนตารางทีละช่วง ถ่ายทั้งหน้าจอ แล้วตัดเฉพาะแถบที่เลื่อนได้มาต่อกัน
             (ส่วนที่อยู่กับที่ เช่น หัวแผน / ชื่อหมวด / บันทึก เอาจากภาพแรก)
    ===================================================== */

    const TAIL_DAYS = 5;

    function hasGeometry() {
        return typeof timelineViewport !== "undefined" &&
            typeof timelineWidthPx !== "undefined" &&
            typeof pxPerDay !== "undefined" &&
            timelineWidthPx > 0 && pxPerDay > 0;
    }

    /* ขอบขวาสุดของ object ทุกชนิด (px นับจากวันเริ่มตาราง) */
    function contentRightX() {

        const viewport = document.getElementById("timelineViewport");
        const left = viewport.getBoundingClientRect().left - viewport.scrollLeft;

        const selectors = [
            "#objectLayer > *",
            "#hlineLayer > *",
            "#bracketContent .canvas-object",
            ".zg-img-layer [data-img-id], .zg-img-layer .zg-img",
            ".zg-text-box.is-attached"
        ];

        let right = 0;

        document.querySelectorAll(selectors.join(",")).forEach(element => {
            if (element.closest("[hidden]")) return;
            const rect = element.getBoundingClientRect();
            if (!(rect.width > 0 || rect.height > 0)) return;
            right = Math.max(right, rect.right - left);
        });

        /* ข้อมูล (ไม่พึ่ง DOM): task / hline / เส้นวันที่ */
        if (typeof timelineObjects !== "undefined" && Array.isArray(timelineObjects)) {
            timelineObjects.forEach(object => {
                if (!object) return;
                if (object.linkedHeaderDate instanceof Date && typeof dateToLeft === "function") {
                    right = Math.max(right, dateToLeft(object.linkedHeaderDate) + pxPerDay);
                } else if (Number.isFinite(object.x) && Number.isFinite(object.width)) {
                    right = Math.max(right, object.x + object.width);
                }
            });
        }

        return right;
    }

    /* ขอบขวาของภาพ = 5 วันหลัง object สุดท้าย (ไม่มี object = ทั้งตาราง) */
    function fullEndX() {

        const right = contentRightX();

        if (!(right > 0)) return timelineWidthPx;

        /* ปัดเป็นขอบวัน แล้วบวก 5 วัน */
        const endDay = Math.ceil(right / pxPerDay - 0.001) + TAIL_DAYS;

        return Math.max(pxPerDay * (TAIL_DAYS + 1), endDay * pxPerDay);
    }

    function rectOf(element) {
        return element ? element.getBoundingClientRect() : null;
    }

    function frames2(count) {
        return nextFrames(count);
    }

    /*
        options: { pixelRatio, fromX, toX }  (px นับจากวันเริ่มตาราง)
        คืน canvas (มี .zgCompact ให้ export-compact.js ตัดที่ว่างต่อได้)
    */
    async function captureFull(kind, options = {}) {

        if (!hasGeometry()) {
            return capture(kind, options);
        }

        const ratio = Number(options.pixelRatio) > 0 ? Number(options.pixelRatio) : PIXEL_RATIO;

        const viewport = document.getElementById("timelineViewport");
        const area = document.getElementById("scheduleArea");
        const header = document.getElementById("timelineHeader");
        const bracket = document.getElementById("bracketArea") || document.querySelector(".bracket-area");
        const bracketView = document.getElementById("bracketViewport");
        const content = document.getElementById("timelineContent");
        const bracketBox = document.getElementById("bracketContent");

        if (!viewport || !area) {
            return capture(kind, options);
        }

        const saved = {
            scrollX: viewport.scrollLeft,
            scrollY: typeof verticalScrollY !== "undefined" ? verticalScrollY : 0,
            content: content ? [content.style.width, content.style.minWidth] : null,
            bracket: bracketBox ? [bracketBox.style.width, bracketBox.style.minWidth] : null
        };

        const fromX = Math.max(0, Number.isFinite(options.fromX) ? options.fromX : 0);
        const toX = Math.max(fromX + pxPerDay, Number.isFinite(options.toX) ? options.toX : fullEndX());

        const scrollTo = (x, y) => {
            viewport.scrollLeft = x;
            if (bracketView) bracketView.scrollLeft = x;
            viewport.dispatchEvent(new Event("scroll"));
            if (typeof setVerticalScroll === "function") setVerticalScroll(y);
        };

        let updateCanvas = null;

        try {

            /* ขยายพื้นที่เลื่อนชั่วคราว ให้เลื่อนไปถึงช่วงสุดท้าย (หรือ object ที่เกินวันสิ้นสุด) ได้ */
            const extended = `${Math.max(timelineWidthPx, toX) + viewport.clientWidth + 40}px`;

            [content, bracketBox].forEach(element => {
                if (element) {
                    element.style.width = extended;
                    element.style.minWidth = extended;
                }
            });

            scrollTo(fromX, 0);

            await frames2(3);

            /* ---------- วัดตำแหน่ง (หลังซ่อนตัวช่วยแบบตอนถ่าย) ---------- */

            document.body.classList.add("zg-exporting");

            const crop = getFullCropRect(kind);
            const view = rectOf(viewport);
            const A = rectOf(area);
            const H = rectOf(header) || A;
            const B = rectOf(bracket) || A;

            /* ความกว้างช่องตารางที่เห็น (ไม่รวมแถบเลื่อนหมวดทางขวา) */
            const colLeft = view.left;
            const colWidth = Math.max(50, Math.floor(Math.min(view.right, A.right) - view.left));

            /* ทั้งกระดาน: ส่วนที่อยู่กับที่ทางขวา (การ์ดบันทึก / หัวแผน) ต้องไม่โดนตัด */
            let width = toX - fromX;

            if (kind !== "table") {
                let staticRight = 0;
                document.querySelectorAll(".plan-header .title-box, #notesTrack .note-card, .note-card").forEach(element => {
                    const rect = element.getBoundingClientRect();
                    if (rect.width > 0 && rect.right <= window.innerWidth + 1) {
                        staticRight = Math.max(staticRight, rect.right - colLeft + 8);
                    }
                });
                width = Math.max(width, Math.min(colWidth, staticRight));
            }

            const leftW = colLeft - crop.left;
            const pad = kind === "table" ? 2 : Math.max(8, A.left - crop.left);

            const rowsVisible = A.height;
            const rowsTotal = Math.max(rowsVisible, typeof totalContentHeight !== "undefined" ? totalContentHeight : rowsVisible);

            const topH = A.top - crop.top;
            const bottomH = crop.bottom - A.bottom;

            const outW = Math.round((leftW + width + pad) * ratio);
            const outH = Math.round((topH + rowsTotal + bottomH) * ratio);

            document.body.classList.remove("zg-exporting");

            /* กล่อง Update: ถ่ายแยกไว้ก่อน แล้ววางมุมขวาล่างของภาพ */
            const update = kind !== "table" ? document.querySelector(".zg-update-date") : null;

            if (update && update.getBoundingClientRect().width > 0) {
                try {
                    const htmlToImage = await ensureLib("htmlToImage");
                    updateCanvas = await htmlToImage.toCanvas(update, {
                        pixelRatio: ratio, cacheBust: true, skipFonts: true, backgroundColor: "#ffffff"
                    });
                    updateCanvas.zgRect = update.getBoundingClientRect();
                } catch (error) {
                    updateCanvas = null;
                }
            }

            const out = document.createElement("canvas");
            out.width = outW;
            out.height = outH;

            const ctx = out.getContext("2d");
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, outW, outH);

            const copy = (source, sx, sy, sw, sh, dx, dy) => {
                if (sw <= 0 || sh <= 0) return;
                const r = ratio;
                ctx.drawImage(source,
                    Math.round(sx * r), Math.round(sy * r), Math.round(sw * r), Math.round(sh * r),
                    Math.round(dx * r), Math.round(dy * r), Math.round(sw * r), Math.round(sh * r));
            };

            const pagesY = Math.max(1, Math.ceil((rowsTotal - 0.5) / rowsVisible));
            const pagesX = Math.max(1, Math.ceil((width - 0.5) / colWidth));

            document.body.classList.add("zg-xp-tiling");

            let firstShot = null;

            for (let j = 0; j < pagesY; j += 1) {

                for (let i = 0; i < pagesX; i += 1) {

                    document.body.classList.toggle("zg-xp-tile-more", i > 0 || j > 0);

                    scrollTo(fromX + i * colWidth, j * rowsVisible);

                    await frames2(3);

                    const sx = viewport.scrollLeft - fromX;                         /* ตำแหน่งจริงหลังเลื่อน */
                    const sy = typeof verticalScrollY !== "undefined" ? verticalScrollY : 0;

                    const shot = await capture(kind, { pixelRatio: ratio, screen: true, cacheBust: !firstShot });

                    if (!firstShot) firstShot = shot;

                    const w = Math.min(colWidth, width - sx);
                    const rowsH = Math.min(rowsVisible, rowsTotal - sy);

                    const dx = leftW + sx;

                    /* แถวในตาราง (ช่องวัน) */
                    copy(shot, colLeft, A.top, w, rowsH, dx, topH + sy);

                    /* ชื่อหมวด / แถว (อยู่ซ้าย ไม่เลื่อนซ้ายขวา) */
                    if (i === 0) copy(shot, crop.left, A.top, leftW, rowsH, 0, topH + sy);

                    if (j === 0) {
                        if (i === 0) {
                            /* หัวแผน + หัวเดือน/วันที่ ทั้งแถบ */
                            copy(shot, crop.left, crop.top, leftW + w, topH, 0, 0);
                        } else {
                            /* หัวเดือน/วันที่ ช่วงถัดไป */
                            copy(shot, colLeft, H.top, w, A.top - H.top, dx, H.top - crop.top);
                        }
                    }

                    if (j === pagesY - 1) {
                        const base = topH + rowsTotal;
                        if (i === 0) {
                            /* แถบเลื่อน + เส้นวันที่ (Bracket) + บันทึกท้ายกระดาน */
                            copy(shot, crop.left, A.bottom, leftW + w, bottomH, 0, base);
                        } else {
                            /* เส้นวันที่ (Bracket) ช่วงถัดไป */
                            copy(shot, colLeft, A.bottom, w, B.bottom - A.bottom, dx, base);
                        }
                    }
                }
            }

            /* ทั้งกระดานยาวเกินจอ → ต่อเส้นเขียวใต้หัวแผนให้ยาวถึงขอบขวาของภาพ */
            if (kind !== "table" && firstShot && width > colWidth && H.top > crop.top) {
                const r = ratio;
                const srcX = Math.round((colLeft + colWidth - 3 - 0) * r);
                const destX = Math.round((leftW + colWidth - 3) * r);
                ctx.drawImage(firstShot,
                    srcX, Math.round(crop.top * r), 1, Math.round((H.top - crop.top) * r),
                    destX, 0, Math.round((width - colWidth + 3) * r), Math.round((H.top - crop.top) * r));
            }

            /* ปิดท้ายตาราง: เส้นขอบขวา */
            ctx.fillStyle = "#c9d1cc";
            ctx.fillRect(Math.round((leftW + width) * ratio), Math.round((H.top - crop.top) * ratio),
                Math.max(1, Math.round(ratio)), Math.round((topH - (H.top - crop.top) + rowsTotal + (B.bottom - A.bottom)) * ratio));

            if (updateCanvas) {
                const rect = updateCanvas.zgRect;
                /* มุมขวาล่างของภาพ (อยู่ในกรอบเสมอ) */
                const maxY = outH / ratio - rect.height - 6;
                const dy = Math.max(0, Math.min(maxY, (topH + rowsTotal) + (rect.top - A.bottom)));
                const dx = leftW + width - rect.width;
                ctx.drawImage(updateCanvas, Math.round(dx * ratio), Math.round(dy * ratio));
            }

            /* ให้ export-compact.js ตัดพื้นที่ว่างบน-ล่างต่อได้ (ห้ามบีบช่วงตาราง) */
            const tableTop = Math.min(H.top, A.top);
            const tableBottom = Math.max(B.bottom, A.bottom) + (rowsTotal - rowsVisible);

            out.zgCompact = {
                ratio,
                kind,
                keepFrom: Math.max(0, Math.round((tableTop - crop.top) * ratio)),
                keepTo: Math.round((tableBottom - crop.top) * ratio)
            };

            out.zgRange = { fromX, toX: fromX + width };
            out.zgTiles = { x: pagesX, y: pagesY, rowsTotal, rowsVisible, colWidth };

            return out;

        } finally {

            document.body.classList.remove("zg-xp-tiling", "zg-xp-tile-more", "zg-exporting");

            if (content && saved.content) {
                content.style.width = saved.content[0];
                content.style.minWidth = saved.content[1];
            }

            if (bracketBox && saved.bracket) {
                bracketBox.style.width = saved.bracket[0];
                bracketBox.style.minWidth = saved.bracket[1];
            }

            scrollTo(saved.scrollX, saved.scrollY);
        }
    }


    async function exportAs(kind, format) {

        if (busy) {
            return;
        }

        busy = true;

        showToast("กำลังสร้างไฟล์...", { sticky: true });

        try {

            /* ทั้งตาราง ไม่สนขอบจอ → จบที่ 5 วันหลัง object สุดท้าย */
            const canvas =
                await captureFull(kind);

            const fileBase =
                baseFileName(kind);

            if (format === "pdf") {

                const JsPDF =
                    await ensureLib("jsPDF");

                const pdf =
                    new JsPDF({ orientation: "landscape", unit: "mm", format: "a3", compress: true });

                const pageW = pdf.internal.pageSize.getWidth();
                const pageH = pdf.internal.pageSize.getHeight();

                const maxW = pageW - PDF_MARGIN_MM * 2;
                const maxH = pageH - PDF_MARGIN_MM * 2;

                const scale =
                    Math.min(maxW / canvas.width, maxH / canvas.height);

                const drawW = canvas.width * scale;
                const drawH = canvas.height * scale;

                pdf.addImage(
                    canvas.toDataURL("image/png"),
                    "PNG",
                    (pageW - drawW) / 2,
                    (pageH - drawH) / 2,
                    drawW,
                    drawH,
                    undefined,
                    "FAST"      /* บีบอัดภาพ ไม่งั้นไฟล์ PDF ใหญ่หลาย MB */
                );

                pdf.save(`${fileBase}.pdf`);

            } else {

                const blob =
                    await new Promise(resolve => canvas.toBlob(resolve, "image/png"));

                const url = URL.createObjectURL(blob);

                downloadUrl(url, `${fileBase}.png`);

                setTimeout(() => URL.revokeObjectURL(url), 2000);
            }

            showToast("Export เสร็จแล้ว");

        } catch (error) {

            console.error(error);

            const message =
                String(error && error.message).startsWith("LIB_MISSING")
                    ? "Export ไม่ได้: โหลดไลบรารีไม่สำเร็จ (ใส่โฟลเดอร์ lib/ ไว้ข้าง index.html หรือต่ออินเทอร์เน็ต)"
                    : "Export ไม่สำเร็จ ลองอีกครั้ง";

            showToast(message, { error: true });

        } finally {

            busy = false;
        }
    }


    /* =====================================================
       CHOOSER (PNG / PDF)
    ===================================================== */

    let chooser = null;

    let chooserAnchor = null;


    function closeChooser() {

        if (chooser) {
            chooser.remove();
        }

        chooser = null;

        chooserAnchor = null;
    }


    function openExportMenu(anchor) {

        closeChooser();

        const menu =
            document.createElement("div");

        menu.className =
            "zg-export-chooser zg-export-menu";

        menu.innerHTML = `
            <div class="zg-export-chooser-title">ไฟล์แผน (ใช้ Import กลับได้)</div>
            <button type="button" data-action="plan">💾 ไฟล์แผน (.json)</button>

            <div class="zg-export-chooser-sep"></div>

            <div class="zg-export-chooser-title">รูปภาพทั้งกระดาน</div>
            <div class="zg-export-chooser-row">
                <button type="button" data-kind="image" data-format="png">🖼 PNG</button>
                <button type="button" data-kind="image" data-format="pdf">📄 PDF (A3)</button>
            </div>

            <div class="zg-export-chooser-sep"></div>

            <div class="zg-export-chooser-title">เฉพาะตาราง</div>
            <div class="zg-export-chooser-row">
                <button type="button" data-kind="table" data-format="png">🖼 PNG</button>
                <button type="button" data-kind="table" data-format="pdf">📄 PDF (A3)</button>
            </div>
        `;

        menu.addEventListener("click", event => {

            const item =
                event.target.closest("button");

            if (!item) {
                return;
            }

            closeChooser();

            if (item.dataset.action === "plan") {

                if (window.ZGPlanIO && typeof window.ZGPlanIO.exportFile === "function") {

                    window.ZGPlanIO.exportFile();

                } else {

                    showToast("Export ไฟล์แผนไม่ได้: ไม่พบ io.js ตัวใหม่", { error: true });
                }

                return;
            }

            exportAs(item.dataset.kind, item.dataset.format);
        });

        document.body.appendChild(menu);

        /* วางใต้ปุ่ม Export ชิดซ้ายของปุ่ม */
        const rect =
            anchor.getBoundingClientRect();

        const left =
            Math.max(6, Math.min(rect.left, window.innerWidth - menu.offsetWidth - 6));

        menu.style.left = `${left}px`;
        menu.style.top = `${rect.bottom + 6}px`;

        chooser = menu;

        chooserAnchor = anchor;
    }


    /*
        ปุ่ม Export (ข้าง Import): ดักคลิกตั้งแต่ระดับ document (capture)
        เพื่อเปิดเมนูแทนการดาวน์โหลด .json ทันทีแบบเดิมของ io.js
        ปุ่ม Export รูปภาพ / เฉพาะตาราง ในเมนู "เพิ่มเติม" ถูกซ่อน
        (กันไม่ให้ไปเรียก window.print() ของ app.js)
    */
    document.addEventListener("click", event => {

        const target =
            event.target instanceof Element ? event.target : null;

        if (!target) {
            return;
        }

        const exportButton =
            target.closest("#exportPlanBtn");

        if (exportButton) {

            event.stopPropagation();
            event.preventDefault();

            if (chooser && chooserAnchor === exportButton) {
                closeChooser();
            } else {
                openExportMenu(exportButton);
            }

            return;
        }

        /* เผื่อปุ่มเดิมในเมนู "เพิ่มเติม" ยังถูกกดได้ → ไม่ให้สั่งพิมพ์ */
        const oldButton =
            target.closest("#toolbarExportImageBtn, #toolbarExportTableBtn");

        if (oldButton) {

            event.stopPropagation();
            event.preventDefault();

            if (typeof closeToolbarMoreMenu === "function") {
                closeToolbarMoreMenu();
            }

            const exportButtonEl =
                document.getElementById("exportPlanBtn");

            if (exportButtonEl) {
                openExportMenu(exportButtonEl);
            }
        }

    }, true);


    /* ซ่อน 2 รายการเดิมในเมนู "เพิ่มเติม" (ย้ายมาอยู่ที่ปุ่ม Export แล้ว) */
    [imageBtn, tableBtn].forEach(button => {

        if (button) {
            button.style.display = "none";
        }
    });


    document.addEventListener("mousedown", event => {

        if (
            chooser &&
            !chooser.contains(event.target) &&
            !(event.target instanceof Element && event.target.closest("#exportPlanBtn"))
        ) {
            closeChooser();
        }
    });


    document.addEventListener("keydown", event => {

        if (event.key === "Escape") {
            closeChooser();
        }
    });


    window.ZGExportImage = {

        exportAs,

        /* ใช้โดย print-a3.js */
        capture,

        /* ถ่ายทั้งตาราง ไม่สนขอบจอ (ใช้โดย export-plus.js) */
        captureFull,

        fullEndX,

        getCropRect
    };

})();