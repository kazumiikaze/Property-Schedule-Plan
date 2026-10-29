"use strict";

/* =========================================================
   PRINT-FIT.JS — พิมพ์ A3 แนวนอน "ตามที่เห็นบนจอ"
   ---------------------------------------------------------
   v2: ถ่ายภาพกระดานตามที่เห็นบนจอ (หัวแผน · ตาราง · ช่องเส้นวันที่ · บันทึกท้ายกระดาน · Update)
       แล้ววางลงกระดาษ A3 แนวนอน — ขยายให้ใหญ่ที่สุดที่ยังพอดีกระดาษ (ไม่ยืด ไม่บิดสัดส่วน)
       - ไม่จัดหน้าใหม่ ไม่เปลี่ยนขนาดตาราง → ได้หน้าตาเหมือนบนจอทุกอย่าง
       - ไม่มีปุ่ม / แถบเลื่อน / กรอบเลือก ติดไปในภาพ (ใช้ตัวถ่ายภาพของ export-image.js)
   ปุ่ม 🖨 พิมพ์ A3 บนแถบเครื่องมือ · Ctrl+P ก็ใช้ระบบนี้
   โหลดหลัง export-image.js / export-compact.js
========================================================= */

(function () {

    /* A3 แนวนอน 420 × 297 mm · ขอบกระดาษ 6 mm (เครื่องพิมพ์ส่วนใหญ่พิมพ์ชิดขอบไม่ได้) */
    const MARGIN_MM = 6;
    const AREA_W_MM = 420 - MARGIN_MM * 2;
    const AREA_H_MM = 297 - MARGIN_MM * 2;

    /* ความละเอียดภาพ (×2 = คมพอสำหรับ A3) */
    const PIXEL_RATIO = 2;


    const style = document.createElement("style");
    style.id = "zg-print-fit-style";
    style.textContent = `
.zg-print-btn { display: inline-flex; align-items: center; gap: 6px; }
.zg-print-btn svg { flex: 0 0 auto; }
.zg-print-btn[aria-busy="true"] { opacity: .6; pointer-events: none; cursor: progress; }
.zg-xpa-caret { font-size: 9px; opacity: .6; }
.zg-xpa-menu {
    position: fixed;
    z-index: 20001;
    min-width: 230px;
    padding: 6px;
    border-radius: 12px;
    background: #ffffff;
    border: 1px solid rgba(30, 41, 36, .1);
    box-shadow: 0 1px 2px rgba(20, 34, 27, .06), 0 10px 28px -10px rgba(20, 34, 27, .28);
    font-size: 13px;
    color: #26302b;
}
.zg-xpa-head { padding: 6px 10px; font-size: 11px; font-weight: 600; color: #6f7a74; }
.zg-xpa-menu button {
    width: 100%;
    display: flex;
    align-items: baseline;
    gap: 10px;
    padding: 8px 10px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    font: inherit;
    color: inherit;
    text-align: left;
    cursor: pointer;
}
.zg-xpa-menu button b { min-width: 42px; font-weight: 600; }
.zg-xpa-menu button span { font-size: 11px; color: #6f7a74; }
.zg-xpa-menu button:hover,
.zg-xpa-menu button:focus-visible { background: #f1f4f2; outline: none; }
.zg-xpa-sep { height: 1px; margin: 4px 6px; background: rgba(30, 41, 36, .08); }
body.zg-dark .zg-xpa-menu { background: #222a27; border-color: #3a4440; color: #e3e9e5; }
body.zg-dark .zg-xpa-menu button:hover { background: #2b3330; }
body.zg-exporting .zg-xpa-menu { display: none !important; }

/* ตอนถ่ายภาพเพื่อพิมพ์: กล่องหัวข้อแผนใหญ่ขึ้น ~1.8 เท่า (บนจอขนาดเดิม) — zoom = เส้นเขียวหดตามให้เอง */
body.zg-print-capture .plan-header .title-box { zoom: 1.8; }
/* ตอนถ่ายภาพเพื่อพิมพ์ / Export: ช่องเส้นวันที่ติดใต้ตารางเหมือนบนจอ → เส้นวันที่ต่อกันไม่ขาด
   (เดิมเว้นที่ไว้ให้แถบเลื่อน ซึ่งซ่อนตอนถ่ายภาพ → เหลือช่องว่างตัดเส้น) */
body.zg-print-capture .bracket-area { top: 53%; }
body.zg-print-capture .hline-layer-viewport { height: calc(50% - var(--timeline-header-height)); }
/* ตอนถ่ายภาพเพื่อพิมพ์: ข้อความในบันทึกท้ายกระดาน (Term of Payment ฯลฯ) ใหญ่ขึ้น ~1.45 เท่า
   ใช้ zoom → ขนาดที่ผู้ใช้ตั้งเอง (A− / A+) ก็ขยายตามสัดส่วน */
body.zg-print-capture:not(.zg-print-legacy) .note-card .note-header,
body.zg-print-capture:not(.zg-print-legacy) .note-card .note-body { zoom: 1.45; }

/* ตอนถ่ายภาพเพื่อพิมพ์: แถบบริษัท โลโก้ + ตัวอักษรใหญ่ขึ้น ~1.7 เท่า (บนจอขนาดเดิม) */
body.zg-print-footer #companyFooter { height: 112px; }
/* ชิดซ้ายเหมือนบนจอ · อยู่กึ่งกลางแนวตั้งของแถบ (ระยะบน = ล่าง) */
body.zg-print-footer #companyFooter .company-footer-inner { padding: 0 30px; }
body.zg-print-footer #companyFooter .footer-logo { height: 90px; }
body.zg-print-footer #companyFooter .footer-separator { height: 52px; flex-basis: 3px; width: 3px; margin: 0 30px; }
body.zg-print-footer #companyFooter .footer-contact { font-size: calc(clamp(9px, .85vw, 17px) * 1.7); gap: .35em; }
body.zg-print-footer #companyFooter .footer-brand { font-size: calc(clamp(9px, .85vw, 17px) * 1.7); margin-left: 24px; }
`;
    document.head.appendChild(style);


    function toast(message) {
        if (window.ZGImage && typeof window.ZGImage.toast === "function") window.ZGImage.toast(message);
    }

    function wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }


    /* =====================================================
       ภาพ → หน้า A3
    ===================================================== */

    function pageHtml(url) {

        /* ภาพทำมาเป็นสัดส่วน A3 แล้ว → วางเต็มพื้นที่พิมพ์ทั้งแผ่น (ส่วนต่างเล็กน้อยยืดให้พอดี) */
        const w = AREA_W_MM;
        const h = AREA_H_MM;
        const left = 0;

        return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Print A3</title>
<style>
    @page { size: A3 landscape; margin: ${MARGIN_MM}mm; }
    html, body { margin: 0; padding: 0; background: #ffffff; }
    .page { position: relative; width: ${AREA_W_MM}mm; height: ${AREA_H_MM}mm; overflow: hidden; }
    .page img { position: absolute; left: ${left.toFixed(2)}mm; top: 0; width: ${w.toFixed(2)}mm; height: ${h.toFixed(2)}mm; display: block; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
</style></head>
<body><div class="page"><img src="${url}" alt=""></div></body></html>`;
    }


    /* แถบบริษัท (fixed ชิดล่างจอ) → ถ่ายแยกแบบวางปกติ (ไม่งั้นหลุดนอกภาพ ได้ภาพว่าง) */
    async function shootFooter() {

        const footer = document.getElementById("companyFooter");
        const lib = window.htmlToImage;

        if (!footer || !lib || typeof lib.toCanvas !== "function") return null;

        /* ใหญ่ขึ้นเฉพาะตอนถ่ายแถบนี้ (ไม่ไปบังกระดานตอนถ่ายภาพกระดาน) */
        document.body.classList.add("zg-print-footer");

        const box = footer.getBoundingClientRect();
        if (!(box.width > 0 && box.height > 0)) {
            document.body.classList.remove("zg-print-footer");
            return null;
        }

        try {
            return await lib.toCanvas(footer, {
                pixelRatio: PIXEL_RATIO, cacheBust: true, skipFonts: true, backgroundColor: "#ffffff",
                width: Math.ceil(box.width), height: Math.ceil(box.height),
                style: { position: "static", left: "auto", top: "auto", right: "auto", bottom: "auto", transform: "none", margin: "0", boxShadow: "none" }
            });
        } catch (error) {
            console.warn("[print-fit.js] ถ่ายแถบบริษัทไม่สำเร็จ", error);
            return null;
        } finally {
            document.body.classList.remove("zg-print-footer");
        }
    }

    /* ต่อแถบบริษัทใต้ภาพกระดาน (ย่อ/ขยายให้กว้างเท่ากัน) */
    function stackFooter(board, footer) {

        const h = Math.round(footer.height * (board.width / footer.width));
        const out = document.createElement("canvas");

        out.width = board.width;
        out.height = board.height + h;

        const ctx = out.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, out.width, out.height);
        ctx.drawImage(board, 0, 0);
        ctx.drawImage(footer, 0, board.height, board.width, h);

        return out;
    }

    /* =====================================================
       กล่องข้อความตอนยืดกระดาน
       กล่องข้อความวางเป็น px (ลอย = ตามจอ · ติด object = ระยะจากมุมกล่อง)
       กระดานสูงขึ้นแต่ระยะเท่าเดิม → ข้อความเขยิบขึ้น
       → ตอนถ่ายภาพ: ย้ายจุดกึ่งกลางกล่องข้อความตามสัดส่วนความสูงที่ยืด แล้วคืนค่าเดิมทันที
         (ชั้นหน้า / ชั้นหลัง เหมือนเดิม · ขนาดตัวอักษรเท่าเดิม)
    ===================================================== */

    /* ส่วนของกระดาน (เรียงจากเฉพาะเจาะจง → กว้าง) */
    const SECTIONS = ["#scheduleArea", "#bracketArea", ".bracket-area", ".board-notes-section", ".timeline-header", ".plan-header"];

    function attachTarget(attach) {
        if (!attach || !attach.objectId) return null;
        const id = CSS.escape(attach.objectId);
        if (attach.part === "image") return document.querySelector(`.zg-img-layer .zg-bimg[data-img-id="${id}"]`);
        return document.querySelector(`.canvas-object${attach.part ? "." + attach.part : ""}[data-object-id="${id}"]`);
    }

    function measureTexts() {

        const T = window.ZGTextBoxes;
        const plan = document.querySelector(".plan");

        if (!T || typeof T.serialize !== "function" || !plan) return null;

        const list = T.serialize();
        if (!list.length) return null;

        const planRect = plan.getBoundingClientRect();
        const info = {};

        list.forEach(item => {
            const box = document.querySelector(`.zg-text-box[data-text-id="${CSS.escape(item.id)}"]`);
            const target = item.attach ? attachTarget(item.attach) : null;
            const h = box ? box.offsetHeight : 0;
            /* กล่องลอย: จำว่าอยู่ส่วนไหนของกระดาน (ตาราง / ช่องเส้นวันที่ / บันทึก …) ที่ระดับกี่ % */
            let section = null;
            if (!item.attach && Number.isFinite(item.y)) {
                const cy = item.y + h / 2;
                const found = SECTIONS.map(sel => document.querySelector(sel)).find(el => {
                    if (!el) return false;
                    const r = el.getBoundingClientRect();
                    return r.height > 0 && cy >= r.top && cy <= r.bottom;
                });
                if (found) {
                    const r = found.getBoundingClientRect();
                    section = { el: found, frac: (cy - r.top) / r.height };
                }
            }
            info[item.id] = { h, section, target: target ? target.getBoundingClientRect() : null };
        });

        return { list, info, planTop: planRect.top, planH: planRect.height };
    }

    async function shootWithTexts(before, shoot) {

        const T = window.ZGTextBoxes;
        const plan = document.querySelector(".plan");

        if (!before || !T || !plan) return shoot();

        const ratio = plan.getBoundingClientRect().height / before.planH;

        const moved = before.list.map(item => {

            const next = JSON.parse(JSON.stringify(item));
            const m = before.info[item.id] || { h: 0 };
            const half = m.h / 2;

            if (next.attach) {
                const target = attachTarget(next.attach);
                if (m.target && target && m.target.height > 0) {
                    const r = target.getBoundingClientRect().height / m.target.height;
                    next.attach.dy = (next.attach.dy + half) * r - half;
                }
            } else if (Number.isFinite(next.y)) {
                if (m.section && m.section.el.isConnected) {
                    const r = m.section.el.getBoundingClientRect();
                    next.y = r.top + m.section.frac * r.height - half;
                } else {
                    next.y = before.planTop + (next.y + half - before.planTop) * ratio - half;
                }
            }

            return next;
        });

        try {
            T.load(moved);
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve))));
            return await shoot();
        } finally {
            T.load(before.list);
        }
    }

    /* =====================================================
       ภาพกระดานแบบ A3 (ใช้ร่วมกัน: พิมพ์ A3 + Export PDF / PNG / JPEG)
       ถ่ายตามจอ → ยืดกระดานเป็นสัดส่วน A3 → ต่อแถบบริษัทด้านล่าง
    ===================================================== */

    /*
        options.legacy = พิมพ์ A3 แบบเดิม (เช้า 27 ต.ค. ก่อนแก้วันนั้น — ผู้ใช้สั่งย้อน)
          ไม่จัดตำแหน่งกล่องข้อความตอนยืด · บันทึกท้ายกระดานไม่ขยาย · ไม่ใช้ชุดกันชิ้นที่เลือกลอยขึ้น (object-skin.js)
        Export ▾ (PDF / PNG / JPEG) ใช้แบบปัจจุบันเหมือนเดิม
    */
    async function buildA3Canvas(options = {}) {

        const legacy = options.legacy === true;

        const exporter = window.ZGExportImage;

        if (!exporter || typeof exporter.capture !== "function") {
            throw new Error("NO_EXPORTER");
        }

        /* ถ่ายทั้งกระดานตามที่เห็นบนจอ */
        const shoot = () => exporter.capture("image", { pixelRatio: PIXEL_RATIO });

        document.body.classList.add("zg-print-capture");
        document.body.classList.toggle("zg-print-legacy", legacy);

        try {

            let canvas = await shoot();

            /* แถบบริษัทด้านล่าง (โลโก้ · เบอร์โทร · อีเมล) → ถ่ายแยก แล้วต่อใต้กระดาน */
            const footer = await shootFooter();
            const footerH = footer ? footer.height * (canvas.width / footer.width) : 0;

            /*
                เต็มแผ่น: จอกว้างกว่ากระดาษ → ทำกระดานให้สูงขึ้นชั่วคราว (แถว / ช่องต่าง ๆ สูงตามสัดส่วน)
                ให้ภาพ (กระดาน + แถบบริษัท) ออกมาเป็นสัดส่วน A3 พอดี แล้วถ่ายใหม่ → วางเต็มกระดาษ ตัวหนังสือไม่เบี้ยว
            */
            const compact = window.ZGExportCompact;
            const wantBoardH = canvas.width / (AREA_W_MM / AREA_H_MM) - footerH;
            const factor = wantBoardH / canvas.height;

            if (factor > 1.02 && compact && typeof compact.withStretch === "function") {
                /* จำตำแหน่งกล่องข้อความก่อนยืด → ตอนยืดย้ายตามสัดส่วน (ไม่งั้นข้อความดูเขยิบขึ้นด้านบน) */
                if (legacy) {
                    canvas = await compact.withStretch(Math.min(3, factor), shoot);
                } else {
                    const texts = measureTexts();
                    canvas = await compact.withStretch(Math.min(3, factor), () => shootWithTexts(texts, shoot));
                }
            }

            if (footer) canvas = stackFooter(canvas, footer);

            return canvas;

        } finally {
            /* ถ่ายเสร็จ → หัวข้อ / บันทึก บนจอกลับขนาดเดิมทันที */
            document.body.classList.remove("zg-print-capture", "zg-print-legacy");
            /* ซูมเบราว์เซอร์ (zoom-focus.js) → จัดกระดานใหม่ตามจอจริง ไม่ให้ตาราง / กล่องงานหดหรือเลื่อนค้าง */
            if (window.ZGZoomFocus && typeof window.ZGZoomFocus.refresh === "function") window.ZGZoomFocus.refresh();
        }
    }

    function errorText(error, verb) {
        const message = String(error && error.message);
        if (message.startsWith("LIB_MISSING")) {
            return `${verb}ไม่ได้: โหลดไลบรารีไม่สำเร็จ (ใส่โฟลเดอร์ lib/ ไว้ข้าง index.html หรือต่ออินเทอร์เน็ต)`;
        }
        if (message === "NO_EXPORTER") {
            return `${verb}ไม่ได้: ไม่พบตัวถ่ายภาพกระดาน (export-image.js)`;
        }
        return `${verb}ไม่สำเร็จ ลองอีกครั้ง`;
    }

    let busy = false;

    function setBusy(value) {
        busy = value;
        [button, exportButton].forEach(el => {
            if (!el) return;
            if (value) el.setAttribute("aria-busy", "true");
            else el.removeAttribute("aria-busy");
        });
    }

    async function print() {

        if (busy) return;

        setBusy(true);

        toast("กำลังเตรียมหน้าพิมพ์…");

        let frame = null;
        let url = "";

        try {

            const canvas = await buildA3Canvas({ legacy: true });

            const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
            url = URL.createObjectURL(blob);

            frame = document.createElement("iframe");
            frame.setAttribute("aria-hidden", "true");
            frame.style.cssText = "position:fixed; right:0; bottom:0; width:0; height:0; border:0; visibility:hidden;";
            document.body.appendChild(frame);

            const doc = frame.contentDocument;
            doc.open();
            doc.write(pageHtml(url));
            doc.close();

            /* รอรูปโหลดครบก่อนสั่งพิมพ์ */
            await Promise.all(Array.from(doc.images).map(img =>
                img.complete ? Promise.resolve() : new Promise(resolve => { img.onload = img.onerror = resolve; })
            ));

            await wait(50);

            frame.contentWindow.focus();
            frame.contentWindow.print();

        } catch (error) {

            console.error("[print-fit.js]", error);
            toast(errorText(error, "พิมพ์"));

        } finally {

            /* หน้าต่างพิมพ์ปิดแล้ว (print() รอจนปิด) → เก็บกวาด */
            setTimeout(() => {
                if (frame) frame.remove();
                if (url) URL.revokeObjectURL(url);
            }, 1000);

            setBusy(false);
        }
    }


    /* =====================================================
       EXPORT — PDF (A3) · PNG · JPEG · JSON (ไฟล์แผน)
       ภาพเหมือนพิมพ์ A3 ทุกอย่าง (ระบบเดียวกัน)
    ===================================================== */

    function fileBase() {
        const title = document.querySelector(".plan-header .title");
        const subtitle = document.querySelector(".plan-header .subtitle");
        const name = [title, subtitle].map(el => (el ? el.innerText.trim() : "")).find(Boolean) || "plan";
        const now = new Date();
        const ymd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        const safe = name.replace(/[\\/:*?"<>|\s]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "plan";
        return `${safe}_${ymd}`;
    }

    function download(blob, fileName) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
    }

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async function jsPDFClass() {
        const get = () => window.jspdf && window.jspdf.jsPDF;
        if (get()) return get();
        for (const src of ["lib/jspdf.umd.min.js", "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"]) {
            try {
                await loadScript(src);
                if (get()) return get();
            } catch (error) { /* ลองแหล่งถัดไป */ }
        }
        throw new Error("LIB_MISSING:jsPDF");
    }

    /* PDF A3 แนวนอนจากภาพกระดาน (ใช้ทั้ง Export PDF และบันทึกเข้า CRM → ได้ไฟล์เหมือนกัน) */
    async function pdfBlob(canvas) {
        const JsPDF = await jsPDFClass();
        const pdf = new JsPDF({ orientation: "landscape", unit: "mm", format: "a3", compress: true });
        /* วางเต็มพื้นที่ A3 เหมือนพิมพ์ (ขอบ 6 mm) */
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", MARGIN_MM, MARGIN_MM, AREA_W_MM, AREA_H_MM);
        return pdf.output("blob");
    }

    async function exportAs(format) {

        if (busy) return;

        /* ไฟล์แผน: ข้อมูลล้วน ไม่ต้องถ่ายภาพ */
        if (format === "json") {
            const io = window.ZGPlanIO;
            if (io && typeof io.exportFile === "function") {
                io.exportFile();
                toast("Export ไฟล์แผน (.json) แล้ว");
            } else {
                toast("Export ไฟล์แผนไม่ได้");
            }
            return;
        }

        const label = format === "jpeg" ? "JPEG" : format.toUpperCase();

        setBusy(true);
        toast(`กำลังสร้างไฟล์ ${label}…`);

        try {

            const canvas = await buildA3Canvas();
            const base = fileBase();

            if (format === "png") {
                download(await new Promise(resolve => canvas.toBlob(resolve, "image/png")), `${base}.png`);
            } else if (format === "jpeg") {
                /* JPEG ไม่มีพื้นใส → รองพื้นขาวให้ก่อน */
                const flat = document.createElement("canvas");
                flat.width = canvas.width;
                flat.height = canvas.height;
                const ctx = flat.getContext("2d");
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, flat.width, flat.height);
                ctx.drawImage(canvas, 0, 0);
                download(await new Promise(resolve => flat.toBlob(resolve, "image/jpeg", 0.92)), `${base}.jpg`);
            } else if (format === "pdf") {
                download(await pdfBlob(canvas), `${base}.pdf`);
            }

            toast(`Export ${label} แล้ว`);

        } catch (error) {

            console.error("[print-fit.js]", error);
            toast(errorText(error, "Export "));

        } finally {
            setBusy(false);
        }
    }

    let exportButton = null;
    let exportMenu = null;

    function closeExportMenu() {
        if (exportMenu) exportMenu.remove();
        exportMenu = null;
        if (exportButton) exportButton.setAttribute("aria-expanded", "false");
    }

    function openExportMenu() {

        closeExportMenu();

        exportMenu = document.createElement("div");
        exportMenu.className = "zg-xpa-menu";
        exportMenu.setAttribute("role", "menu");
        exportMenu.innerHTML = `
            <div class="zg-xpa-head">Export (แบบเดียวกับพิมพ์ A3)</div>
            <button type="button" role="menuitem" data-xpa="pdf"><b>PDF</b><span>A3 แนวนอน เต็มแผ่น</span></button>
            <button type="button" role="menuitem" data-xpa="png"><b>PNG</b><span>รูปภาพ คมชัด</span></button>
            <button type="button" role="menuitem" data-xpa="jpeg"><b>JPEG</b><span>รูปภาพ ไฟล์เล็ก</span></button>
            <div class="zg-xpa-sep"></div>
            <button type="button" role="menuitem" data-xpa="json"><b>JSON</b><span>ไฟล์แผน (เปิดแก้ต่อด้วย Import)</span></button>
        `;

        exportMenu.querySelectorAll("[data-xpa]").forEach(item => {
            item.addEventListener("click", () => {
                const format = item.dataset.xpa;
                closeExportMenu();
                exportAs(format);
            });
        });

        document.body.appendChild(exportMenu);

        const r = exportButton.getBoundingClientRect();
        exportMenu.style.left = `${Math.max(8, Math.min(window.innerWidth - exportMenu.offsetWidth - 8, r.left))}px`;
        exportMenu.style.top = `${r.bottom + 6}px`;

        exportButton.setAttribute("aria-expanded", "true");

        const first = exportMenu.querySelector("button");
        if (first) first.focus({ preventScroll: true });
    }

    document.addEventListener("mousedown", event => {
        if (!exportMenu) return;
        const target = event.target instanceof Element ? event.target : null;
        if (target && target.closest(".zg-xpa-menu, .zg-xpa-btn")) return;
        closeExportMenu();
    }, true);

    window.addEventListener("keydown", event => {
        if (event.key === "Escape" && exportMenu) closeExportMenu();
    });


    /* Ctrl+P → ใช้ระบบนี้แทนการพิมพ์หน้าเว็บตรง ๆ */
    window.addEventListener("keydown", event => {
        if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey && (event.key || "").toLowerCase() === "p") {
            event.preventDefault();
            event.stopImmediatePropagation();
            print();
        }
    }, true);


    /* =====================================================
       ปุ่มบนแถบเครื่องมือ
    ===================================================== */

    let button = null;

    function mountButton() {

        const anchor = document.getElementById("importPlanBtn");
        if (!anchor || document.querySelector(".zg-print-btn")) return;

        button = document.createElement("button");
        button.type = "button";
        button.id = "printA3Btn";
        button.className = "toolbar-control zg-print-btn";
        button.title = "พิมพ์ A3 แนวนอน ตามที่เห็นบนจอ (Ctrl+P)";
        button.innerHTML = `<svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true" focusable="false"><path d="M6 7V3h8v4M6 14H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-2M6 11h8v6H6z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg><span>พิมพ์ A3</span>`;
        button.addEventListener("click", print);

        anchor.parentNode.insertBefore(button, anchor);

        exportButton = document.createElement("button");
        exportButton.type = "button";
        exportButton.id = "exportA3Btn";
        exportButton.className = "toolbar-control zg-print-btn zg-xpa-btn";
        exportButton.title = "Export เป็น PDF / PNG / JPEG / JSON (ภาพเหมือนพิมพ์ A3)";
        exportButton.setAttribute("aria-haspopup", "menu");
        exportButton.setAttribute("aria-expanded", "false");
        exportButton.innerHTML = `<svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true" focusable="false"><path d="M10 13V3m0 0L6 7m4-4 4 4M4 12v4h12v-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Export</span><span class="zg-xpa-caret" aria-hidden="true">▾</span>`;
        exportButton.addEventListener("click", event => {
            event.stopPropagation();
            if (exportMenu) closeExportMenu(); else openExportMenu();
        });

        anchor.parentNode.insertBefore(exportButton, anchor);
    }

    mountButton();

    window.ZGPrintA3 = { print, pageHtml, exportAs, buildA3Canvas, pdfBlob };

})();
