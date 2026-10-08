"use strict";

/* =========================================================
   IMAGE-CROP.JS — ✂ ครอบตัดรูปในตาราง (รูปที่วาง / แปะรูป)
   - เลือกรูป → แถบเครื่องมือของรูปมีปุ่ม "✂ ครอบตัด"
     (หรือดับเบิลคลิกที่รูป)
   - หน้าต่างครอบตัด: ลากกรอบ / ลากมุม-ขอบ ปรับขนาด
     สัดส่วน: อิสระ · เดิม · 1:1 · 4:3 · 16:9 · 3:4
   - ครอบแล้วรูปยังอยู่ที่เดิมในตาราง (เหลือเฉพาะส่วนที่เลือก) · Ctrl+Z ย้อนกลับได้
   - ไม่แก้ app.js / style.css — โหลดหลัง image-board.js
========================================================= */

(function () {

    const board = window.ZGBoardImages;

    if (!board || typeof board.list !== "function" || typeof board.load !== "function") {
        console.warn("[image-crop.js] ต้องโหลดหลัง image-board.js");
        return;
    }

    function toast(message, isError) {
        if (window.ZGImage && typeof window.ZGImage.toast === "function") window.ZGImage.toast(message, isError);
    }

    const style = document.createElement("style");

    style.textContent = `
.zg-crop-overlay {
    position: fixed; inset: 0; z-index: 30500; background: rgba(15, 25, 20, .62);
    display: flex; align-items: center; justify-content: center; padding: 16px; box-sizing: border-box;
}
.zg-crop-dialog {
    background: #fff; border-radius: 14px; box-shadow: 0 20px 50px rgba(0,0,0,.35);
    padding: 14px 16px; max-width: 100%; box-sizing: border-box; color: #1e2924; font-size: 13px;
}
.zg-crop-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.zg-crop-title { font-weight: 700; font-size: 15px; flex: 1; }
.zg-crop-size { font-size: 11px; color: #74817b; }
.zg-crop-stage {
    position: relative; margin: 0 auto; user-select: none; touch-action: none; overflow: hidden;
    background-color: #f3f5f4;
    background-image: linear-gradient(45deg,#e7ebe9 25%,transparent 25%),linear-gradient(-45deg,#e7ebe9 25%,transparent 25%),
        linear-gradient(45deg,transparent 75%,#e7ebe9 75%),linear-gradient(-45deg,transparent 75%,#e7ebe9 75%);
    background-size: 16px 16px; background-position: 0 0,0 8px,8px -8px,-8px 0;
}
.zg-crop-stage img { display: block; width: 100%; height: 100%; pointer-events: none; -webkit-user-drag: none; }
.zg-crop-box {
    position: absolute; box-sizing: border-box; border: 2px solid #ffffff; cursor: move;
    box-shadow: 0 0 0 9999px rgba(10, 20, 15, .55), 0 0 0 1px rgba(0,0,0,.4);
}
.zg-crop-box::before, .zg-crop-box::after {
    content: ""; position: absolute; pointer-events: none; border: 0 solid rgba(255,255,255,.55);
}
.zg-crop-box::before { left: 33.33%; right: 33.33%; top: 0; bottom: 0; border-left-width: 1px; border-right-width: 1px; }
.zg-crop-box::after { top: 33.33%; bottom: 33.33%; left: 0; right: 0; border-top-width: 1px; border-bottom-width: 1px; }
.zg-crop-h { position: absolute; width: 14px; height: 14px; background: #fff; border: 2px solid #2e8b57; border-radius: 3px; box-sizing: border-box; z-index: 1; }
.zg-crop-h[data-h="nw"] { left: -1px; top: -1px; cursor: nwse-resize; }
.zg-crop-h[data-h="ne"] { right: -1px; top: -1px; cursor: nesw-resize; }
.zg-crop-h[data-h="sw"] { left: -1px; bottom: -1px; cursor: nesw-resize; }
.zg-crop-h[data-h="se"] { right: -1px; bottom: -1px; cursor: nwse-resize; }
.zg-crop-h[data-h="n"] { left: calc(50% - 7px); top: -1px; cursor: ns-resize; }
.zg-crop-h[data-h="s"] { left: calc(50% - 7px); bottom: -1px; cursor: ns-resize; }
.zg-crop-h[data-h="w"] { top: calc(50% - 7px); left: -1px; cursor: ew-resize; }
.zg-crop-h[data-h="e"] { top: calc(50% - 7px); right: -1px; cursor: ew-resize; }
.zg-crop-tools { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 12px; }
.zg-crop-tools .lbl { color: #5c6a64; font-size: 12px; margin-right: 2px; }
.zg-crop-tools button {
    height: 28px; padding: 0 10px; border: 1px solid #d6dfda; border-radius: 7px; background: #fff;
    font: inherit; font-size: 12px; cursor: pointer; color: inherit;
}
.zg-crop-tools button.on { background: #2e8b57; border-color: #2e8b57; color: #fff; font-weight: 700; }
.zg-crop-tools .grow { flex: 1; }
.zg-crop-tools button.primary { background: #2e8b57; border-color: #2e8b57; color: #fff; font-weight: 700; padding: 0 16px; }
.zg-crop-hint { margin-top: 8px; font-size: 11px; color: #8a948f; }
body.zg-dark .zg-crop-dialog { background: #222a27; color: #e3e9e5; }
body.zg-dark .zg-crop-tools button { background: #2b3330; border-color: #3a4440; }
body.zg-exporting .zg-crop-overlay { display: none !important; }
`;

    document.head.appendChild(style);


    /* =====================================================
       ปุ่ม ✂ ในแถบเครื่องมือของรูป
    ===================================================== */

    function selectedImageId() {
        const element = document.querySelector(".zg-img-layer .zg-bimg.is-selected");
        return element ? element.dataset.imgId : null;
    }

    function addCropButton(bar) {

        if (!bar || bar.querySelector("[data-crop]")) return;

        const button = document.createElement("button");
        button.type = "button";
        button.setAttribute("data-crop", "1");
        button.title = "ครอบตัดรูป (ดับเบิลคลิกที่รูปก็ได้)";
        button.textContent = "✂ ครอบตัด";

        button.addEventListener("click", event => {
            event.stopPropagation();
            const id = selectedImageId();
            if (id) openCrop(id);
        });

        const replace = bar.querySelector('[data-bar="replace"]');
        if (replace) bar.insertBefore(button, replace);
        else bar.appendChild(button);
    }

    new MutationObserver(() => {
        const bar = document.querySelector(".zg-bimg-bar");
        if (bar && !bar.querySelector("[data-crop]")) addCropButton(bar);
    }).observe(document.body, { childList: true, subtree: true });

    document.addEventListener("dblclick", event => {
        const element = event.target instanceof Element ? event.target.closest(".zg-img-layer .zg-bimg") : null;
        if (!element) return;
        const item = board.list().find(entry => entry.id === element.dataset.imgId);
        if (!item || item.locked) return;
        event.preventDefault();
        event.stopPropagation();
        openCrop(item.id);
    }, true);


    /* =====================================================
       หน้าต่างครอบตัด
    ===================================================== */

    const RATIOS = [
        { key: "free", label: "อิสระ" },
        { key: "orig", label: "เดิม" },
        { key: "1:1", label: "1:1", r: 1 },
        { key: "4:3", label: "4:3", r: 4 / 3 },
        { key: "16:9", label: "16:9", r: 16 / 9 },
        { key: "3:4", label: "3:4", r: 3 / 4 }
    ];

    let overlay = null;

    function closeCrop() {
        if (overlay) overlay.remove();
        overlay = null;
        document.removeEventListener("keydown", onKey, true);
    }

    let applyFn = null;

    function onKey(event) {
        if (!overlay) return;
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeCrop(); }
        if (event.key === "Enter") { event.preventDefault(); event.stopPropagation(); if (applyFn) applyFn(); }
    }

    function loadImage(src) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error("โหลดรูปไม่ได้"));
            image.src = src;
        });
    }

    async function openCrop(id) {

        const item = board.list().find(entry => entry.id === id);
        if (!item) return;

        let image;
        try {
            image = await loadImage(item.src);
        } catch (error) {
            toast("เปิดรูปเพื่อครอบตัดไม่ได้", true);
            return;
        }

        closeCrop();

        const natW = image.naturalWidth, natH = image.naturalHeight;
        const maxW = Math.min(760, window.innerWidth - 80);
        const maxH = Math.min(520, window.innerHeight - 220);
        const scale = Math.min(maxW / natW, maxH / natH, 4);
        const stageW = Math.round(natW * scale), stageH = Math.round(natH * scale);

        overlay = document.createElement("div");
        overlay.className = "zg-crop-overlay";
        overlay.innerHTML = `
<div class="zg-crop-dialog" role="dialog" aria-modal="true">
    <div class="zg-crop-head">
        <span class="zg-crop-title">✂ ครอบตัดรูป</span>
        <span class="zg-crop-size" data-size></span>
    </div>
    <div class="zg-crop-stage" style="width:${stageW}px;height:${stageH}px">
        <img alt="" src="${item.src}">
        <div class="zg-crop-box">
            ${["nw", "n", "ne", "e", "se", "s", "sw", "w"].map(h => `<span class="zg-crop-h" data-h="${h}"></span>`).join("")}
        </div>
    </div>
    <div class="zg-crop-tools">
        <span class="lbl">สัดส่วน</span>
        ${RATIOS.map(ratio => `<button type="button" data-ratio="${ratio.key}">${ratio.label}</button>`).join("")}
        <button type="button" data-reset title="เลือกทั้งรูป">↺ ทั้งรูป</button>
        <span class="grow"></span>
        <button type="button" data-cancel>ยกเลิก</button>
        <button type="button" class="primary" data-apply>✂ ครอบตัด</button>
    </div>
    <div class="zg-crop-hint">ลากกรอบเพื่อย้าย · ลากมุม / ขอบเพื่อปรับขนาด · Enter = ครอบตัด · Esc = ยกเลิก · ครอบแล้วกด Ctrl+Z ย้อนกลับได้</div>
</div>`;

        document.body.appendChild(overlay);
        document.addEventListener("keydown", onKey, true);

        const stage = overlay.querySelector(".zg-crop-stage");
        const box = overlay.querySelector(".zg-crop-box");
        const sizeEl = overlay.querySelector("[data-size]");

        /* กรอบในพิกัดของ stage (px) */
        let rect = { x: 0, y: 0, w: stageW, h: stageH };
        let ratio = null;
        let ratioKey = "free";

        const MIN = 12;

        function paint() {
            box.style.left = `${rect.x}px`;
            box.style.top = `${rect.y}px`;
            box.style.width = `${rect.w}px`;
            box.style.height = `${rect.h}px`;
            sizeEl.textContent = `${Math.round(rect.w / scale)} × ${Math.round(rect.h / scale)} px`;
            overlay.querySelectorAll("[data-ratio]").forEach(button => button.classList.toggle("on", button.dataset.ratio === ratioKey));
        }

        function fitRatio(r) {
            /* กรอบใหญ่สุดตามสัดส่วน กึ่งกลางกรอบเดิม */
            const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
            let w = stageW, h = w / r;
            if (h > stageH) { h = stageH; w = h * r; }
            rect = { w, h, x: Math.min(Math.max(0, cx - w / 2), stageW - w), y: Math.min(Math.max(0, cy - h / 2), stageH - h) };
        }

        overlay.addEventListener("click", event => {
            const target = event.target instanceof Element ? event.target : null;
            if (!target) return;
            if (target === overlay || target.closest("[data-cancel]")) { closeCrop(); return; }
            if (target.closest("[data-reset]")) { rect = { x: 0, y: 0, w: stageW, h: stageH }; ratio = null; ratioKey = "free"; paint(); return; }
            const ratioButton = target.closest("[data-ratio]");
            if (ratioButton) {
                ratioKey = ratioButton.dataset.ratio;
                const found = RATIOS.find(entry => entry.key === ratioKey);
                ratio = ratioKey === "orig" ? natW / natH : (found && found.r) || null;
                if (ratio) fitRatio(ratio);
                paint();
                return;
            }
            if (target.closest("[data-apply]")) apply();
        });

        /* ลากกรอบ / มุม / ขอบ */
        stage.addEventListener("pointerdown", event => {

            const handle = event.target instanceof Element ? event.target.closest("[data-h]") : null;
            const onBox = event.target instanceof Element && event.target.closest(".zg-crop-box");
            const stageRect = stage.getBoundingClientRect();
            const px = event.clientX - stageRect.left, py = event.clientY - stageRect.top;

            let mode;
            let start = { ...rect };

            if (handle) mode = handle.dataset.h;
            else if (onBox) mode = "move";
            else {
                /* ลากบนพื้นที่ว่าง = วาดกรอบใหม่ */
                mode = "se";
                start = { x: px, y: py, w: 0, h: 0 };
                rect = { ...start };
            }

            event.preventDefault();
            stage.setPointerCapture(event.pointerId);

            const move = moveEvent => {

                const dx = moveEvent.clientX - stageRect.left - px;
                const dy = moveEvent.clientY - stageRect.top - py;

                if (mode === "move") {
                    rect.x = Math.min(Math.max(0, start.x + dx), stageW - rect.w);
                    rect.y = Math.min(Math.max(0, start.y + dy), stageH - rect.h);
                    paint();
                    return;
                }

                let left = start.x, top = start.y, right = start.x + start.w, bottom = start.y + start.h;

                if (mode.includes("w")) left = Math.min(right - MIN, Math.max(0, start.x + dx));
                if (mode.includes("e")) right = Math.max(left + MIN, Math.min(stageW, start.x + start.w + dx));
                if (mode.includes("n")) top = Math.min(bottom - MIN, Math.max(0, start.y + dy));
                if (mode.includes("s")) bottom = Math.max(top + MIN, Math.min(stageH, start.y + start.h + dy));

                let w = right - left, h = bottom - top;

                if (ratio) {
                    /* ล็อกสัดส่วน: ยึดด้านที่ลากเป็นหลัก */
                    if (mode === "n" || mode === "s") w = h * ratio;
                    else if (mode === "e" || mode === "w") h = w / ratio;
                    else if (w / h > ratio) w = h * ratio;
                    else h = w / ratio;

                    if (mode.includes("w")) left = right - w;
                    else right = left + w;
                    if (mode.includes("n")) top = bottom - h;
                    else bottom = top + h;

                    if (mode === "n" || mode === "s") { left = start.x + start.w / 2 - w / 2; }
                    if (mode === "e" || mode === "w") { top = start.y + start.h / 2 - h / 2; }

                    /* ห้ามล้นขอบรูป */
                    if (left < 0 || top < 0 || left + w > stageW || top + h > stageH) return;
                }

                rect = { x: left, y: top, w, h };
                paint();
            };

            const up = () => {
                stage.removeEventListener("pointermove", move);
                stage.removeEventListener("pointerup", up);
                if (rect.w < MIN || rect.h < MIN) { rect = { ...start, w: Math.max(start.w, MIN), h: Math.max(start.h, MIN) }; paint(); }
            };

            stage.addEventListener("pointermove", move);
            stage.addEventListener("pointerup", up);
        });

        function apply() {

            const sx = Math.max(0, Math.round(rect.x / scale));
            const sy = Math.max(0, Math.round(rect.y / scale));
            const sw = Math.min(natW - sx, Math.max(1, Math.round(rect.w / scale)));
            const sh = Math.min(natH - sy, Math.max(1, Math.round(rect.h / scale)));

            if (sx === 0 && sy === 0 && sw >= natW - 1 && sh >= natH - 1) {
                closeCrop();
                return;
            }

            const canvas = document.createElement("canvas");
            canvas.width = sw;
            canvas.height = sh;
            const ctx = canvas.getContext("2d");
            const isJpeg = /^data:image\/jpe?g/i.test(item.src);
            if (isJpeg) { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, sw, sh); }
            ctx.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);

            let src;
            try {
                src = isJpeg ? canvas.toDataURL("image/jpeg", 0.92) : canvas.toDataURL("image/png");
            } catch (error) {
                toast("ครอบตัดไม่ได้: รูปนี้ถูกป้องกันการแก้ไข", true);
                return;
            }

            /* รูปยังอยู่ที่เดิม: เหลือเฉพาะส่วนที่ครอบไว้ */
            const list = board.list().map(entry => {
                if (entry.id !== item.id) return entry;
                return {
                    ...entry,
                    src,
                    ar: sw / sh,
                    day: entry.day + entry.wDays * (sx / natW),
                    row: entry.row + entry.hRows * (sy / natH),
                    wDays: entry.wDays * (sw / natW),
                    hRows: entry.hRows * (sh / natH)
                };
            });

            board.load(list);

            if (window.ZGHistory && typeof window.ZGHistory.record === "function") {
                try { window.ZGHistory.record(); } catch (error) { /* ไม่เป็นไร */ }
            }

            closeCrop();
            toast("ครอบตัดรูปแล้ว — Ctrl+Z เพื่อย้อนกลับ");
        }

        applyFn = apply;
        paint();
    }

    window.ZGImageCrop = { open: openCrop };

})();
