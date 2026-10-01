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
    const EXPORT_IMAGE_VERSION = "2026-10-01f (print api)";

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


    /* พื้นที่ที่จะตัดออกมา (พิกัดบนจอ) */
    function getCropRect(kind) {

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

        try {

            await nextFrames(2);

            const crop =
                getCropRect(kind);

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

                    cacheBust: true,

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

            document.body.classList.remove("zg-exporting");

            if (wasDark) {
                document.body.classList.add("zg-dark");
            }
        }
    }


    async function exportAs(kind, format) {

        if (busy) {
            return;
        }

        busy = true;

        showToast("กำลังสร้างไฟล์...", { sticky: true });

        try {

            const canvas =
                await capture(kind);

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

        getCropRect
    };

})();