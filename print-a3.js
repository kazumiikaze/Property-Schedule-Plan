"use strict";

/* =========================================================
   PRINT-A3.JS — พิมพ์ A3 แนวนอน

   ปุ่มบน toolbar:
     [ 23% • 1 หน้า ]  → เปิดตั้งค่า: เนื้อหา / ขนาด (พอดี 1 หน้า หรือกำหนด %)
                          ตัวเลขบนปุ่มคำนวณจากขนาดกระดานจริงบนจอ
     [ 🖨 พิมพ์ A3 ]    → สร้างภาพตามที่เห็นบนจอ แล้วเปิดหน้าต่างพิมพ์ A3

   วิธีพิมพ์: ใช้ภาพจาก export-image.js (เหมือน Export รูปภาพ)
   แล้ววางลงหน้า A3 ในหน้าต่างพิมพ์แยก → ตำแหน่งตรงกับบนจอ 100%
   ถ้าขนาด % ใหญ่เกิน 1 หน้า จะแบ่งเป็นหลายหน้า (ต่อกันได้)

   โหลดหลัง export-image.js
========================================================= */

(function () {

    /* =====================================================
       BUTTONS (หาด้วย id ก่อน ถ้าไม่มีจะหาจาก class / ข้อความ)
    ===================================================== */

    function findButton(id, finder) {

        let button = document.getElementById(id);

        if (!button) {

            button = finder();

            if (button) {
                button.id = id;
            }
        }

        return button || null;
    }

    const scaleBtn =
        findButton("printScaleBtn", () => document.querySelector(".toolbar-print-scale"));

    const printBtn =
        findButton("printA3Btn", () =>
            Array.from(document.querySelectorAll(".workspace-toolbar button"))
                .find(item => item.textContent.includes("🖨"))
        );

    if (!scaleBtn && !printBtn) {

        console.error("[print-a3.js] ไม่พบปุ่มพิมพ์ A3 บน toolbar");

        return;
    }


    /* =====================================================
       CONFIG
    ===================================================== */

    const PAGE_W_MM = 420;          // A3 แนวนอน
    const PAGE_H_MM = 297;
    /* ระยะขอบ: ใช้ค่าที่เลือก (แคบ / ปกติ / กว้าง) จาก export-compact.js */
    let MARGIN_MM = 8;

    let PRINT_W_MM = PAGE_W_MM - MARGIN_MM * 2;
    let PRINT_H_MM = PAGE_H_MM - MARGIN_MM * 2;

    function refreshMargins() {
        const compact = window.ZGExportCompact;
        MARGIN_MM = compact ? compact.margin().mm : 8;
        PRINT_W_MM = PAGE_W_MM - MARGIN_MM * 2;
        PRINT_H_MM = PAGE_H_MM - MARGIN_MM * 2;
    }

    const PX_TO_MM = 25.4 / 96;    // 1px บนจอ (CSS px) = 0.2646 mm

    const SCALE_MIN = 10;
    const SCALE_MAX = 300;

    const STORAGE_KEY = "zg-property-schedule-print";


    /* =====================================================
       SETTINGS
       { kind: "image" | "table", mode: "fit" | "custom", percent }
    ===================================================== */

    let settings = { kind: "image", mode: "fit", percent: 100 };

    try {

        const saved =
            JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");

        if (saved && typeof saved === "object") {

            settings = {
                kind: saved.kind === "table" ? "table" : "image",
                mode: saved.mode === "custom" ? "custom" : "fit",
                percent: clampPercent(saved.percent)
            };
        }

    } catch (error) {
        /* ใช้ค่าเริ่มต้น */
    }


    function saveSettings() {

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        } catch (error) {
            /* เก็บไม่ได้ก็ยังใช้ได้ในหน้านี้ */
        }
    }


    function clampPercent(value) {

        const number = Math.round(Number(value));

        return Number.isFinite(number)
            ? Math.min(SCALE_MAX, Math.max(SCALE_MIN, number))
            : 100;
    }


    /* =====================================================
       LAYOUT MATH
    ===================================================== */

    function getBoardRect(kind) {

        if (window.ZGExportImage && typeof window.ZGExportImage.getCropRect === "function") {
            return window.ZGExportImage.getCropRect(kind);
        }

        const plan = document.querySelector(".plan");

        return plan
            ? plan.getBoundingClientRect()
            : { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
    }


    /* คำนวณ % และจำนวนหน้า จากขนาดกระดานบนจอ */
    function computeLayout(sizePx) {

        refreshMargins();

        const rect = getBoardRect(settings.kind);

        /* ภาพจริง (ตัดพื้นที่ว่างแล้ว) / ประมาณจากการ export ครั้งก่อน */
        const compact = window.ZGExportCompact;
        const shrink = !sizePx && compact && compact.shrinkOf ? compact.shrinkOf(settings.kind) : 1;

        const boardWmm = Math.max(1, (sizePx ? sizePx.w : rect.right - rect.left) * PX_TO_MM);
        const boardHmm = Math.max(1, (sizePx ? sizePx.h : (rect.bottom - rect.top) * shrink) * PX_TO_MM);

        const fitScale =
            Math.min(PRINT_W_MM / boardWmm, PRINT_H_MM / boardHmm);

        const scale =
            settings.mode === "fit"
                ? fitScale
                : settings.percent / 100;

        const imageWmm = boardWmm * scale;
        const imageHmm = boardHmm * scale;

        /* เผื่อเศษทศนิยมเล็กน้อย ไม่ให้เกินหน้าเพราะปัดเศษ */
        const cols = Math.max(1, Math.ceil(imageWmm / PRINT_W_MM - 0.001));
        const rows = Math.max(1, Math.ceil(imageHmm / PRINT_H_MM - 0.001));

        return {
            scale,
            percent: Math.max(1, Math.floor(scale * 100)),
            fitPercent: Math.max(1, Math.floor(fitScale * 100)),
            imageWmm,
            imageHmm,
            cols,
            rows,
            pages: cols * rows
        };
    }


    function updateScaleLabel() {

        if (!scaleBtn) {
            return;
        }

        const layout = computeLayout();

        scaleBtn.textContent =
            `${layout.percent}% • ${layout.pages} หน้า`;

        scaleBtn.title =
            settings.kind === "table" ? "ตั้งค่าการพิมพ์ (เฉพาะตาราง)" : "ตั้งค่าการพิมพ์ (ทั้งกระดาน)";
    }


    /* อัปเดตตัวเลขเมื่อหน้าจอเปลี่ยนขนาด */
    let resizeTimer = null;

    window.addEventListener("resize", () => {

        clearTimeout(resizeTimer);

        resizeTimer = setTimeout(updateScaleLabel, 150);
    });


    /* =====================================================
       STYLE
    ===================================================== */

    const style =
        document.createElement("style");

    style.textContent = `
.zg-print-panel {
    position: fixed;
    width: 250px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: #ffffff;
    border: 1px solid #d5dad7;
    border-radius: 10px;
    box-shadow: 0 8px 28px rgba(0, 0, 0, .16);
    z-index: 26000;
    font-size: 12px;
    color: #222222;
}
.zg-print-title { font-size: 13px; font-weight: 700; }
.zg-print-label { color: #7a827e; font-size: 10px; margin-bottom: 4px; }
.zg-print-seg { display: flex; gap: 4px; }
.zg-print-seg button {
    flex: 1;
    height: 28px;
    border: 1px solid #dde3e0;
    border-radius: 6px;
    background: #ffffff;
    color: #333333;
    font-family: inherit;
    font-size: 11px;
    cursor: pointer;
}
.zg-print-seg button.active {
    background: #e5f0e9;
    border-color: #3a8a4f;
    color: #1e7a46;
    font-weight: 700;
}
.zg-print-check { display: flex; align-items: center; gap: 6px; cursor: pointer; }
.zg-print-custom { display: flex; align-items: center; gap: 6px; margin-top: 6px; }
.zg-print-custom input[type="number"] {
    width: 70px;
    height: 28px;
    padding: 0 6px;
    border: 1px solid #dde3e0;
    border-radius: 6px;
    font-family: inherit;
    font-size: 12px;
}
.zg-print-custom input:disabled { opacity: .5; }
.zg-print-summary {
    padding: 8px 10px;
    border-radius: 8px;
    background: #fff9e8;
    color: #8a6b00;
    font-size: 12px;
    font-weight: 700;
    line-height: 1.4;
}
.zg-print-summary small { display: block; font-weight: 400; font-size: 10px; color: #8a7a3a; }
.zg-print-go {
    height: 32px;
    border: 0;
    border-radius: 7px;
    background: #3a8a4f;
    color: #ffffff;
    font-family: inherit;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
}
.zg-print-go:disabled { opacity: .6; cursor: default; }

.zg-print-toast {
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
.zg-print-toast.error { background: #d33b43; }

@media screen {
    body.zg-dark .zg-print-panel {
        background: #1f2527;
        border-color: #3a4441;
        color: #e3e8e5;
        box-shadow: 0 8px 28px rgba(0, 0, 0, .5);
    }
    body.zg-dark .zg-print-label { color: #9aa5a0; }
    body.zg-dark .zg-print-seg button,
    body.zg-dark .zg-print-custom input[type="number"] {
        background: #272e30;
        border-color: #3a4441;
        color: #e3e8e5;
    }
    body.zg-dark .zg-print-seg button.active { background: #1f3a2a; color: #8fe0a8; border-color: #3a8a4f; }
    body.zg-dark .zg-print-summary { background: #2a2617; color: #f0d77a; }
    body.zg-dark .zg-print-summary small { color: #c9b26a; }
}

@media print {
    .zg-print-panel, .zg-print-toast { display: none !important; }
}
`;

    document.head.appendChild(style);


    /* =====================================================
       TOAST
    ===================================================== */

    let toastEl = null;
    let toastTimer = null;

    function showToast(message, { error = false, sticky = false } = {}) {

        if (!toastEl) {

            toastEl = document.createElement("div");
            toastEl.className = "zg-print-toast";
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


    /* =====================================================
       SETTINGS PANEL
    ===================================================== */

    let panel = null;


    function closePanel() {

        if (panel) {
            panel.remove();
        }

        panel = null;
    }


    function renderSummary() {

        if (!panel) {
            return;
        }

        const layout = computeLayout();

        const summary =
            panel.querySelector(".zg-print-summary");

        const sizeText =
            `${Math.round(layout.imageWmm)} × ${Math.round(layout.imageHmm)} mm`;

        summary.innerHTML =
            `${layout.percent}% • ${layout.pages} หน้า` +
            `<small>${layout.pages > 1 ? `${layout.cols} × ${layout.rows} หน้า (ต่อกัน)` : "พอดีในหน้าเดียว"} · ${sizeText}</small>`;

        panel.querySelector('[data-field="percent"]').disabled =
            settings.mode === "fit";

        panel.querySelectorAll("[data-kind]").forEach(button => {
            button.classList.toggle("active", button.dataset.kind === settings.kind);
        });

        panel.querySelectorAll("[data-mode]").forEach(button => {
            button.classList.toggle("active", button.dataset.mode === settings.mode);
        });

        const compact = window.ZGExportCompact;

        if (compact) {
            const trimInput = panel.querySelector('[data-field="trim"]');
            if (trimInput) trimInput.checked = Boolean(compact.options.trim);
            const fillInput = panel.querySelector('[data-field="fill"]');
            if (fillInput) {
                fillInput.checked = Boolean(compact.options.fill);
                fillInput.disabled = !compact.options.trim || settings.mode !== "fit";
            }
            panel.querySelectorAll("[data-margin]").forEach(button => {
                button.classList.toggle("active", button.dataset.margin === compact.options.margin);
            });
        }

        updateScaleLabel();
    }


    function openPanel() {

        closePanel();

        const layout = computeLayout();

        const element =
            document.createElement("div");

        element.className =
            "zg-print-panel";

        element.innerHTML = `
            <div class="zg-print-title">พิมพ์ A3 แนวนอน</div>

            <div>
                <div class="zg-print-label">เนื้อหา</div>
                <div class="zg-print-seg">
                    <button type="button" data-kind="image">ทั้งกระดาน</button>
                    <button type="button" data-kind="table">เฉพาะตาราง</button>
                </div>
            </div>

            <div>
                <div class="zg-print-label">ขนาด</div>
                <div class="zg-print-seg">
                    <button type="button" data-mode="fit">พอดี 1 หน้า</button>
                    <button type="button" data-mode="custom">กำหนดเอง</button>
                </div>
                <div class="zg-print-custom">
                    <input type="number" data-field="percent"
                        min="${SCALE_MIN}" max="${SCALE_MAX}" step="1"
                        value="${settings.mode === "custom" ? settings.percent : layout.fitPercent}">
                    <span>%</span>
                </div>
            </div>

            <div data-field="trimbox">
                <div class="zg-print-label">พื้นที่ว่าง</div>
                <label class="zg-print-check"><input type="checkbox" data-field="trim"> ตัดพื้นที่ว่างบน-ล่าง</label>
                <label class="zg-print-check"><input type="checkbox" data-field="fill"> ขยายตารางให้เต็มหน้า (พอดี 1 หน้า)</label>
                <div class="zg-print-label" style="margin-top:6px">ระยะขอบ</div>
                <div class="zg-print-seg">
                    <button type="button" data-margin="narrow">แคบ</button>
                    <button type="button" data-margin="normal">ปกติ</button>
                    <button type="button" data-margin="wide">กว้าง</button>
                </div>
            </div>

            <div class="zg-print-summary"></div>

            <button type="button" class="zg-print-go">🖨 พิมพ์</button>
        `;

        element.addEventListener("click", event => {

            const kindBtn = event.target.closest("[data-kind]");
            const modeBtn = event.target.closest("[data-mode]");
            const marginBtn = event.target.closest("[data-margin]");

            if (marginBtn && window.ZGExportCompact) {

                window.ZGExportCompact.options.margin = marginBtn.dataset.margin;
                window.ZGExportCompact.save();

            } else if (kindBtn) {

                settings.kind = kindBtn.dataset.kind;

            } else if (modeBtn) {

                settings.mode = modeBtn.dataset.mode;

                if (settings.mode === "custom") {

                    const input = element.querySelector('[data-field="percent"]');

                    settings.percent = clampPercent(input.value);
                }

            } else if (event.target.closest(".zg-print-go")) {

                closePanel();

                printA3();

                return;

            } else {

                return;
            }

            saveSettings();
            renderSummary();
        });

        const trimInput = element.querySelector('[data-field="trim"]');

        if (!window.ZGExportCompact) {
            element.querySelector('[data-field="trimbox"]').style.display = "none";
        } else {
            trimInput.addEventListener("change", () => {
                window.ZGExportCompact.options.trim = trimInput.checked;
                window.ZGExportCompact.save();
                renderSummary();
            });

            const fillInput = element.querySelector('[data-field="fill"]');

            fillInput.addEventListener("change", () => {
                window.ZGExportCompact.options.fill = fillInput.checked;
                window.ZGExportCompact.save();
                renderSummary();
            });
        }

        const percentInput =
            element.querySelector('[data-field="percent"]');

        percentInput.addEventListener("input", () => {

            if (percentInput.value === "") {
                return;
            }

            settings.percent = clampPercent(percentInput.value);

            saveSettings();
            renderSummary();
        });

        percentInput.addEventListener("change", () => {

            percentInput.value = String(clampPercent(percentInput.value));
        });

        document.body.appendChild(element);

        panel = element;

        const anchor = scaleBtn || printBtn;
        const rect = anchor.getBoundingClientRect();

        element.style.left =
            `${Math.max(6, Math.min(rect.left, window.innerWidth - element.offsetWidth - 6))}px`;

        element.style.top =
            `${rect.bottom + 6}px`;

        renderSummary();
    }


    document.addEventListener("mousedown", event => {

        if (
            panel &&
            !panel.contains(event.target) &&
            !(event.target instanceof Element &&
              event.target.closest("#printScaleBtn"))
        ) {
            closePanel();
        }
    });


    document.addEventListener("keydown", event => {

        if (event.key === "Escape") {
            closePanel();
        }
    });


    /* =====================================================
       PRINT
    ===================================================== */

    let printing = false;


    function buildPrintHtml(dataUrl, layout) {

        const pages = [];

        /* หน้าเดียว → จัดกึ่งกลาง / หลายหน้า → เรียงต่อกันจากมุมซ้ายบน */
        const single = layout.pages === 1;

        const offsetX = single ? (PRINT_W_MM - layout.imageWmm) / 2 : 0;
        const offsetY = single ? (PRINT_H_MM - layout.imageHmm) / 2 : 0;

        for (let row = 0; row < layout.rows; row += 1) {

            for (let col = 0; col < layout.cols; col += 1) {

                const left = offsetX - col * PRINT_W_MM;
                const top = offsetY - row * PRINT_H_MM;

                pages.push(`
                    <div class="page">
                        <img src="${dataUrl}" style="left:${left}mm; top:${top}mm;
                            width:${layout.imageWmm}mm; height:${layout.imageHmm}mm;">
                        ${single ? "" : `<div class="page-no">${row * layout.cols + col + 1} / ${layout.pages}</div>`}
                    </div>
                `);
            }
        }

        return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Print A3</title>
<style>
    @page { size: A3 landscape; margin: ${MARGIN_MM}mm; }
    html, body { margin: 0; padding: 0; background: #ffffff; }
    .page {
        position: relative;
        width: ${PRINT_W_MM}mm;
        height: ${PRINT_H_MM}mm;
        overflow: hidden;
        page-break-after: always;
        break-after: page;
    }
    .page:last-child { page-break-after: auto; break-after: auto; }
    .page img { position: absolute; display: block; }
    .page-no {
        position: absolute;
        right: 0;
        bottom: 0;
        padding: 1mm 2mm;
        background: rgba(255, 255, 255, .85);
        font: 9pt Arial, sans-serif;
        color: #777777;
    }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
</style></head>
<body>${pages.join("")}</body></html>`;
    }


    async function printA3() {

        if (printing) {
            return;
        }

        if (!window.ZGExportImage || typeof window.ZGExportImage.capture !== "function") {

            showToast("พิมพ์ไม่ได้: ไม่พบ export-image.js ตัวใหม่", { error: true });

            return;
        }

        printing = true;

        closePanel();

        showToast("กำลังเตรียมหน้าพิมพ์...", { sticky: true });

        try {

            let layout = computeLayout();

            /* ความละเอียดตามขนาดที่พิมพ์ (ประมาณ 150–200 dpi บนกระดาษ) */
            const pixelRatio =
                Math.min(4, Math.max(2, Math.ceil(layout.scale * 2.5)));

            hideToast();

            let canvas =
                await window.ZGExportImage.capture(settings.kind, { pixelRatio });

            /* ตัดพื้นที่ว่างบน-ล่าง → คำนวณขนาดบนกระดาษจากภาพจริง (พอดีหน้า = ใหญ่ขึ้น) */
            const compact = window.ZGExportCompact;

            if (compact) {

                canvas = compact.process(canvas);

                /* พอดี 1 หน้า + ขยายตาราง: ภาพกว้างกว่ากระดาษ → ถ่ายใหม่ตอนแถวสูงขึ้นให้เต็มหน้า */
                if (compact.options.trim && compact.options.fill && settings.mode === "fit" &&
                    typeof compact.withStretch === "function") {

                    const factor = compact.fillFactor([canvas], PRINT_W_MM / PRINT_H_MM);

                    if (factor > 1.03) {
                        const tall = await compact.withStretch(factor, () =>
                            window.ZGExportImage.capture(settings.kind, { pixelRatio }));
                        canvas = compact.process(tall);
                    }
                }

                layout = computeLayout({
                    w: canvas.width / pixelRatio,
                    h: canvas.height / pixelRatio
                });
            }

            showToast("กำลังเปิดหน้าต่างพิมพ์...", { sticky: true });

            const blob =
                await new Promise(resolve => canvas.toBlob(resolve, "image/png"));

            const url = URL.createObjectURL(blob);

            const frame = document.createElement("iframe");

            frame.style.cssText =
                "position:fixed; right:0; bottom:0; width:0; height:0; border:0; visibility:hidden;";

            document.body.appendChild(frame);

            const doc = frame.contentDocument;

            doc.open();
            doc.write(buildPrintHtml(url, layout));
            doc.close();

            /* รอรูปโหลดครบก่อนสั่งพิมพ์ */
            await Promise.all(
                Array.from(doc.images).map(img =>
                    img.complete
                        ? Promise.resolve()
                        : new Promise(resolve => { img.onload = img.onerror = resolve; })
                )
            );

            hideToast();

            const cleanup = () => {

                setTimeout(() => {
                    frame.remove();
                    URL.revokeObjectURL(url);
                }, 1000);
            };

            frame.contentWindow.addEventListener("afterprint", cleanup, { once: true });

            /* เผื่อเบราว์เซอร์ไม่ส่ง afterprint */
            setTimeout(cleanup, 120000);

            frame.contentWindow.focus();
            frame.contentWindow.print();

        } catch (error) {

            console.error(error);

            const message =
                String(error && error.message).startsWith("LIB_MISSING")
                    ? "พิมพ์ไม่ได้: โหลดไลบรารีไม่สำเร็จ (ใส่โฟลเดอร์ lib/ ไว้ข้าง index.html หรือต่ออินเทอร์เน็ต)"
                    : "เตรียมหน้าพิมพ์ไม่สำเร็จ ลองอีกครั้ง";

            showToast(message, { error: true });

        } finally {

            printing = false;
        }
    }


    /* =====================================================
       EVENTS
    ===================================================== */

    if (scaleBtn) {

        scaleBtn.addEventListener("click", event => {

            event.stopPropagation();

            if (panel) {
                closePanel();
            } else {
                openPanel();
            }
        });
    }

    if (printBtn) {

        printBtn.addEventListener("click", event => {

            event.stopPropagation();

            printA3();
        });
    }


    /* Ctrl+P → พิมพ์ด้วยระบบนี้แทนการพิมพ์หน้าเว็บตรง ๆ */
    document.addEventListener("keydown", event => {

        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "p") {

            event.preventDefault();

            printA3();
        }
    });


    /* ตัวเลขบนปุ่มต้องรอให้ตารางวาดเสร็จก่อน */
    requestAnimationFrame(() =>
        requestAnimationFrame(() =>
            requestAnimationFrame(updateScaleLabel)
        )
    );


    window.ZGPrintA3 = {
        print: printA3,
        refresh: updateScaleLabel
    };

})();