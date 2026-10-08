"use strict";

/* =========================================================
   IMAGE-BOARD.JS — รูปภาพในตาราง + ศูนย์รวมเมนู "🖼 รูปภาพ"

   1) ปุ่ม "🖼 รูปภาพ ▾" บน Toolbar (ข้าง ＋ Text) → เมนูรวมงานรูปภาพ
      (image-task.js / image-logo.js มาเพิ่มเมนูเอง)
   2) วางรูปได้ 3 วิธี: เมนู "วางรูปบนกระดาน…" · ลากไฟล์มาวาง · Ctrl+V
   3) รูปอยู่ในตารางเหมือน object อื่น ๆ
        - เลื่อนซ้าย/ขวา/ขึ้น/ลง และซูมตามตาราง (ยึดตามวันที่และแถว)
        - ถูกซ่อนเมื่อเลื่อนออกนอกขอบตาราง
        - ชั้นหลัง (ค่าเริ่มต้น) = อยู่หลังเส้นวันที่/เส้นแนวตั้ง/กล่องงาน
          ชั้นหน้า = ทับ object อื่น
   4) คลิกรูป → ลากย้าย / ลากมุมย่อขยาย (คงสัดส่วน)
      แถบเครื่องมือ: ความโปร่งใส, ชั้นหน้า/หลัง, กรอบ, มุมโค้ง, ล็อก,
                     เปลี่ยนรูป, บันทึกรูป, ทำสำเนา, ลบ
      คีย์บอร์ด: Delete ลบ · ลูกศร ขยับ (Shift = ทีละ 10) · Esc เลิกเลือก
   5) รูปถูกย่อ/บีบอัดอัตโนมัติ · บันทึกไปกับแผน, Export/Import .json,
      เทมเพลต, ย้อนกลับ ได้ครบ · ลากไฟล์แผน .json มาวาง = Import

   ไม่แก้ app.js / style.css — โหลดหลัง io.js, plans.js, history.js
   และต้องโหลดก่อน image-task.js / image-logo.js
========================================================= */

(function () {

    const plan = document.querySelector(".plan");

    if (!plan || !window.ZGPlanIO || typeof window.ZGPlanIO.build !== "function") {

        console.error("[image-board.js] ไม่พบ .plan หรือ io.js (window.ZGPlanIO)");

        return;
    }


    /* =====================================================
       SHARED UTIL (ใช้ร่วมกับไฟล์ image-*.js อื่น)
    ===================================================== */

    const MAX_INPUT_BYTES = 30 * 1024 * 1024;

    const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|svg|avif|ico)$/i;

    function isImageFile(file) {

        if (!file) return false;

        if (file.type && file.type.startsWith("image/")) {
            return !/hei[cf]/i.test(file.type);
        }

        return IMAGE_EXT.test(file.name || "");
    }

    function isHeic(file) {
        return !!file && (/hei[cf]/i.test(file.type || "") || /\.hei[cf]$/i.test(file.name || ""));
    }

    function readAsDataURL(file) {

        return new Promise((resolve, reject) => {

            const reader = new FileReader();

            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(reader.error || new Error("read error"));

            reader.readAsDataURL(file);
        });
    }

    function loadImage(src) {

        return new Promise((resolve, reject) => {

            const image = new Image();

            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error("decode error"));

            image.src = src;
        });
    }

    let webpSupport = null;

    function canWebp() {

        if (webpSupport === null) {

            try {
                const canvas = document.createElement("canvas");
                canvas.width = canvas.height = 2;
                webpSupport = canvas.toDataURL("image/webp").startsWith("data:image/webp");
            } catch (error) {
                webpSupport = false;
            }
        }

        return webpSupport;
    }

    function hasTransparency(image) {

        try {

            const size = 64;
            const canvas = document.createElement("canvas");

            canvas.width = size;
            canvas.height = size;

            const context = canvas.getContext("2d");

            context.drawImage(image, 0, 0, size, size);

            const data = context.getImageData(0, 0, size, size).data;

            for (let index = 3; index < data.length; index += 4) {
                if (data[index] < 250) return true;
            }

        } catch (error) { /* ignore */ }

        return false;
    }

    /*
        อ่านไฟล์รูป → ย่อด้านยาวไม่เกิน maxSide → บีบอัด
        คืนค่า { src (dataURL), width, height }
    */
    async function processImage(input, options = {}) {

        const maxSide = options.maxSide || 1600;
        const quality = options.quality || 0.85;

        let original;

        if (typeof input === "string") {

            original = input;

        } else {

            if (isHeic(input)) {
                throw new Error("ยังไม่รองรับไฟล์ HEIC (รูปจาก iPhone) — แปลงเป็น JPG/PNG ก่อน");
            }

            if (!isImageFile(input)) {
                throw new Error("ไฟล์นี้ไม่ใช่รูปภาพ");
            }

            if (input.size > MAX_INPUT_BYTES) {
                throw new Error("ไฟล์รูปใหญ่เกินไป (เกิน 30 MB)");
            }

            original = await readAsDataURL(input);
        }

        let image;

        try {
            image = await loadImage(original);
        } catch (error) {
            throw new Error("เปิดรูปนี้ไม่ได้ (ไฟล์เสียหรือเป็นชนิดที่เบราว์เซอร์ไม่รองรับ)");
        }

        let width = image.naturalWidth || image.width || 300;
        let height = image.naturalHeight || image.height || 200;

        const scale = Math.min(1, maxSide / Math.max(width, height));

        const outWidth = Math.max(1, Math.round(width * scale));
        const outHeight = Math.max(1, Math.round(height * scale));

        const alpha = hasTransparency(image);

        /* รูปเล็กอยู่แล้ว และเป็นชนิดทั่วไป → ใช้ไฟล์เดิม */
        if (
            scale === 1 &&
            /^data:image\/(png|jpeg|webp|gif)/.test(original) &&
            original.length < (options.keepBelowChars || 160000)
        ) {
            return { src: original, width, height };
        }

        const canvas = document.createElement("canvas");

        canvas.width = outWidth;
        canvas.height = outHeight;

        const context = canvas.getContext("2d");

        if (!alpha) {
            context.fillStyle = "#ffffff";
            context.fillRect(0, 0, outWidth, outHeight);
        }

        context.imageSmoothingQuality = "high";
        context.drawImage(image, 0, 0, outWidth, outHeight);

        let src;

        if (canWebp()) {
            src = canvas.toDataURL("image/webp", quality);
        } else {
            src = alpha ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", quality);
        }

        /* ไฟล์เดิมเล็กกว่าผลบีบอัด → ใช้ไฟล์เดิม */
        if (scale === 1 && /^data:image\/(png|jpeg|webp|gif)/.test(original) && original.length <= src.length) {
            src = original;
        }

        return { src, width: outWidth, height: outHeight };
    }

    /* เปิดหน้าต่างเลือกไฟล์รูป (แสดงเฉพาะไฟล์รูป) */
    function pickImageFiles(options = {}) {

        return new Promise(resolve => {

            const input = document.createElement("input");

            input.type = "file";
            input.accept = "image/*";
            input.multiple = Boolean(options.multiple);
            input.style.display = "none";

            let done = false;

            const finish = files => {

                if (done) return;

                done = true;

                input.remove();

                resolve(files);
            };

            input.addEventListener("change", () => finish(Array.from(input.files || [])));
            input.addEventListener("cancel", () => finish([]));

            document.body.appendChild(input);

            input.click();
        });
    }

    function filesFromTransfer(transfer) {

        if (!transfer) return [];

        const files = [];

        if (transfer.items && transfer.items.length) {

            Array.from(transfer.items).forEach(item => {

                if (item.kind === "file") {

                    const file = item.getAsFile();

                    if (file) files.push(file);
                }
            });
        }

        if (!files.length && transfer.files) {
            files.push(...Array.from(transfer.files));
        }

        return files;
    }

    function transferHasFiles(transfer) {
        return !!transfer && Array.from(transfer.types || []).includes("Files");
    }

    function isTypingTarget(target) {

        if (!(target instanceof Element)) return false;

        return Boolean(
            target.closest("input, textarea, select, [contenteditable=''], [contenteditable='true']")
        );
    }

    function recordHistory() {

        if (window.ZGHistory && typeof window.ZGHistory.record === "function") {

            try {
                window.ZGHistory.record();
            } catch (error) { /* ignore */ }
        }
    }

    function escapeHtml(text) {

        return String(text == null ? "" : text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function createLocalId(prefix) {
        return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    }

    function downloadDataURL(src, name) {

        const link = document.createElement("a");

        link.href = src;

        const ext = (/^data:image\/(\w+)/.exec(src) || [])[1] || "png";

        link.download = `${name || "image"}.${ext === "jpeg" ? "jpg" : ext}`;

        document.body.appendChild(link);
        link.click();
        link.remove();
    }


    /* ---------- toast ---------- */

    let toastEl = null;
    let toastTimer = null;

    function toast(message, isError) {

        if (!toastEl) {

            toastEl = document.createElement("div");
            toastEl.className = "zg-img-toast";

            document.body.appendChild(toastEl);
        }

        toastEl.textContent = message;
        toastEl.classList.toggle("is-error", Boolean(isError));
        toastEl.classList.add("is-show");

        clearTimeout(toastTimer);

        toastTimer = setTimeout(() => toastEl.classList.remove("is-show"), isError ? 4200 : 2600);
    }


    /* =====================================================
       STYLE
    ===================================================== */

    const style = document.createElement("style");

    style.textContent = `
.zg-img-layer {
    position: absolute;
    left: 0;
    top: 0;
    overflow: hidden;
    pointer-events: none;
    will-change: transform;
}

.zg-img-layer--bracket { transform: none; will-change: auto; z-index: 900; overflow: visible; }

.zg-bimg {
    position: absolute;
    box-sizing: border-box;
    pointer-events: auto;
    cursor: move;
    user-select: none;
    touch-action: none;
}
.zg-bimg img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    pointer-events: none;
    -webkit-user-drag: none;
    border-radius: inherit;
}
.zg-bimg.has-border { border: 2px solid #ffffff; box-shadow: 0 2px 10px rgba(0, 0, 0, .22); }
.zg-bimg.is-round { border-radius: 12px; }
.zg-bimg.is-round img { border-radius: 10px; }
.zg-bimg.is-locked { pointer-events: none; cursor: default; }
.zg-bimg:hover:not(.is-selected) { outline: 1px dashed rgba(58, 138, 79, .7); outline-offset: 2px; }
.zg-bimg.is-selected { outline: 2px solid #3a8a4f; outline-offset: 2px; }
.zg-bimg-handle {
    position: absolute;
    width: 12px;
    height: 12px;
    border: 2px solid #3a8a4f;
    border-radius: 50%;
    background: #ffffff;
    box-sizing: border-box;
    z-index: 2;
}
.zg-bimg-handle[data-dir="nw"] { left: -8px;  top: -8px;    cursor: nwse-resize; }
.zg-bimg-handle[data-dir="ne"] { right: -8px; top: -8px;    cursor: nesw-resize; }
.zg-bimg-handle[data-dir="sw"] { left: -8px;  bottom: -8px; cursor: nesw-resize; }
.zg-bimg-handle[data-dir="se"] { right: -8px; bottom: -8px; cursor: nwse-resize; }
.zg-bimg-size {
    position: absolute;
    right: 0;
    bottom: -24px;
    padding: 2px 6px;
    border-radius: 6px;
    background: rgba(30, 41, 36, .8);
    color: #ffffff;
    font: 10px/1.4 Arial, Helvetica, sans-serif;
    white-space: nowrap;
    pointer-events: none;
}

/* แถบเครื่องมือของรูปที่เลือก */
.zg-bimg-bar {
    position: fixed;
    z-index: 24000;
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 4px;
    border: 1px solid #dde3e0;
    border-radius: 10px;
    background: #ffffff;
    box-shadow: 0 8px 24px rgba(0, 0, 0, .16);
    font-family: Arial, Helvetica, sans-serif;
    font-size: 12px;
    color: #1e2924;
    white-space: nowrap;
}
.zg-bimg-bar button {
    height: 28px;
    min-width: 28px;
    padding: 0 7px;
    border: 0;
    border-radius: 7px;
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
}
.zg-bimg-bar button:hover { background: #eef6f0; }
.zg-bimg-bar button.is-on { background: #e1f0e5; color: #1f6b38; font-weight: 700; }
.zg-bimg-bar button.is-danger:hover { background: #fdecea; color: #c0392b; }
.zg-bimg-bar .zg-bimg-sep { width: 1px; height: 20px; margin: 0 3px; background: #e3e7e5; }
.zg-bimg-bar label { display: inline-flex; align-items: center; gap: 4px; padding: 0 6px; color: #6f7873; }
.zg-bimg-bar input[type=range] { width: 74px; accent-color: #3a8a4f; }

/* ปุ่ม + เมนู "🖼 รูปภาพ" */
.zg-img-menu {
    position: fixed;
    z-index: 26000;
    min-width: 270px;
    padding: 6px;
    border: 1px solid #dde3e0;
    border-radius: 12px;
    background: #ffffff;
    box-shadow: 0 12px 32px rgba(0, 0, 0, .16);
    font-family: Arial, Helvetica, sans-serif;
    font-size: 13px;
    color: #1e2924;
}
.zg-img-menu button {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 8px 10px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
}
.zg-img-menu button:hover { background: #eef6f0; }
.zg-img-menu-icon { width: 20px; text-align: center; font-size: 15px; }
.zg-img-menu-text { display: flex; flex-direction: column; gap: 1px; }
.zg-img-menu-sub { color: #8a938d; font-size: 11px; }
.zg-img-menu-sep { height: 1px; margin: 4px 6px; background: #edf0ee; }
.zg-img-menu-hint { padding: 6px 10px 4px; color: #8a938d; font-size: 11px; line-height: 1.5; }

/* วางไฟล์ */
.zg-img-drop {
    position: fixed;
    z-index: 23000;
    display: none;
    align-items: center;
    justify-content: center;
    border: 3px dashed #3a8a4f;
    border-radius: 16px;
    background: rgba(58, 138, 79, .08);
    color: #1f6b38;
    font: 700 16px/1.4 Arial, Helvetica, sans-serif;
    pointer-events: none;
}
.zg-img-drop.is-show { display: flex; }
.zg-img-drop span { padding: 10px 18px; border-radius: 12px; background: rgba(255, 255, 255, .92); box-shadow: 0 6px 20px rgba(0, 0, 0, .12); }

.zg-img-toast {
    position: fixed;
    left: 50%;
    bottom: 26px;
    z-index: 33000;
    max-width: min(520px, 90vw);
    padding: 10px 16px;
    border-radius: 10px;
    background: #1f6b38;
    color: #ffffff;
    font: 13px/1.5 Arial, Helvetica, sans-serif;
    box-shadow: 0 8px 24px rgba(0, 0, 0, .2);
    transform: translate(-50%, 20px);
    opacity: 0;
    pointer-events: none;
    transition: opacity .18s ease, transform .18s ease;
}
.zg-img-toast.is-show { opacity: 1; transform: translate(-50%, 0); }
.zg-img-toast.is-error { background: #c0392b; }

body.zg-dark .zg-bimg-bar,
body.zg-dark .zg-img-menu { background: #222a27; border-color: #3a4440; color: #e3e9e5; }
body.zg-dark .zg-bimg-bar button:hover,
body.zg-dark .zg-img-menu button:hover { background: #2b3a31; }
body.zg-dark .zg-bimg-bar button.is-on { background: #26372d; color: #9fd3ad; }
body.zg-dark .zg-img-menu-sep,
body.zg-dark .zg-bimg-bar .zg-bimg-sep { background: #3a4440; }

body.zg-exporting .zg-bimg { outline: none !important; }
body.zg-exporting .zg-bimg-handle,
body.zg-exporting .zg-bimg-size,
body.zg-exporting .zg-bimg-bar,
body.zg-exporting .zg-img-menu,
body.zg-exporting .zg-img-drop,
body.zg-exporting .zg-img-toast { display: none !important; }
`;

    document.head.appendChild(style);


    /* =====================================================
       MENU HUB  (ไฟล์อื่นเพิ่มรายการได้ด้วย ZGImage.addMenuItem)
    ===================================================== */

    const menuItems = [];

    function addMenuItem(item) {

        if (!item || typeof item.run !== "function") return;

        menuItems.push(item);

        menuItems.sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    let menuEl = null;

    function closeMenu() {

        if (menuEl) {
            menuEl.remove();
            menuEl = null;
        }
    }

    function openMenu(anchor) {

        closeMenu();

        if (typeof closeObjectMenu === "function") closeObjectMenu();

        const menu = document.createElement("div");

        menu.className = "zg-img-menu";

        const visible = menuItems.filter(item => !item.visible || item.visible());

        let lastGroup = null;

        menu.innerHTML = visible.map((item, index) => {

            const group = item.group || "main";

            const sep = lastGroup !== null && group !== lastGroup ? `<div class="zg-img-menu-sep"></div>` : "";

            lastGroup = group;

            const label = typeof item.label === "function" ? item.label() : item.label;
            const sub = typeof item.sub === "function" ? item.sub() : item.sub;

            return `${sep}
                <button type="button" data-index="${index}">
                    <span class="zg-img-menu-icon">${escapeHtml(item.icon || "")}</span>
                    <span class="zg-img-menu-text">
                        <span>${escapeHtml(label)}</span>
                        ${sub ? `<span class="zg-img-menu-sub">${escapeHtml(sub)}</span>` : ""}
                    </span>
                </button>`;

        }).join("") + `
            <div class="zg-img-menu-sep"></div>
            <div class="zg-img-menu-hint">เคล็ดลับ: ลากไฟล์รูปมาวางบนกระดาน หรือกด Ctrl+V เพื่อวางรูปที่คัดลอกไว้ได้เลย</div>`;

        menu.addEventListener("click", event => {

            const button = event.target.closest("button[data-index]");

            if (!button) return;

            const item = visible[Number(button.dataset.index)];

            closeMenu();

            try {
                item.run();
            } catch (error) {
                console.error("[image]", error);
                toast("เกิดข้อผิดพลาด: " + error.message, true);
            }
        });

        document.body.appendChild(menu);

        const rect = anchor.getBoundingClientRect();

        const left = Math.max(6, Math.min(rect.left, window.innerWidth - menu.offsetWidth - 6));
        const top = Math.min(rect.bottom + 6, window.innerHeight - menu.offsetHeight - 6);

        menu.style.left = `${left}px`;
        menu.style.top = `${Math.max(6, top)}px`;

        menuEl = menu;
    }

    let toolbarButton = document.getElementById("addImageBtn");

    if (!toolbarButton) {

        toolbarButton = document.createElement("button");

        toolbarButton.type = "button";
        toolbarButton.id = "addImageBtn";
        toolbarButton.className = "toolbar-control";
        toolbarButton.textContent = "🖼 รูปภาพ ▾";
        toolbarButton.title = "รูปภาพ: วางรูปในตาราง, รูปในกล่องงาน, โลโก้แผน";

        const textButton = document.getElementById("addTextBtn");
        const insertGroup = document.querySelector(".toolbar-group--insert");

        if (textButton && textButton.parentNode) {
            textButton.parentNode.insertBefore(toolbarButton, textButton.nextSibling);
        } else if (insertGroup) {
            insertGroup.appendChild(toolbarButton);
        } else {
            const toolbar = document.querySelector(".workspace-toolbar, .toolbar");
            if (toolbar) toolbar.appendChild(toolbarButton);
        }
    }

    toolbarButton.addEventListener("click", event => {

        event.stopPropagation();

        if (menuEl) {
            closeMenu();
        } else {
            openMenu(toolbarButton);
        }
    });

    document.addEventListener("mousedown", event => {

        if (menuEl && !menuEl.contains(event.target) && event.target !== toolbarButton && !toolbarButton.contains(event.target)) {
            closeMenu();
        }
    });

    window.addEventListener("resize", closeMenu);


    /* =====================================================
       BOARD IMAGES — DATA
       รูปอยู่ในตารางเหมือน object อื่น ๆ (เลื่อน/ซูมตามตาราง ถูกตัดที่ขอบตาราง)
       { id, src,
         day   : วันที่ของขอบซ้าย (เลขวันแบบ UTC, ทศนิยมได้)
         wDays : ความกว้างเป็นจำนวนวัน
         row   : ขอบบน เป็นสัดส่วนของความสูงหมวดหมู่ (categoryHeight)
         hRows : ความสูง เป็นสัดส่วนของความสูงหมวดหมู่
         ar    : สัดส่วนกว้าง/สูงของรูปจริง
         opacity, layer: "back"(หลังเส้น/กล่องงาน) | "front", border, round, locked, name }
    ===================================================== */

    let images = [];

    let selectedId = null;

    const viewport = document.getElementById("objectLayerViewport");
    const objectLayerEl = document.getElementById("objectLayer");

    const layers = {
        back: document.createElement("div"),
        front: document.createElement("div")
    };

    layers.back.className = "zg-img-layer zg-img-layer--back";
    layers.front.className = "zg-img-layer zg-img-layer--front";

    /* v-sticker: ชั้นรูปในช่องเส้นวันที่ (bracket) — อยู่บนสุดของช่องนั้น */
    const bracketContentEl = document.getElementById("bracketContent");
    const bracketViewportEl = document.getElementById("bracketViewport");

    layers.bracket = document.createElement("div");
    layers.bracket.className = "zg-img-layer zg-img-layer--bracket";

    if (bracketContentEl) bracketContentEl.appendChild(layers.bracket);

    function bracketUnit() {
        return bracketContentEl && bracketContentEl.clientHeight > 0 ? bracketContentEl.clientHeight : 90;
    }

    function unitFor(zone, g) {
        return zone === "bracket" ? bracketUnit() : g.rowUnit;
    }

    function zoneRect(zone) {
        const element = zone === "bracket" ? bracketViewportEl : viewport;
        return (element || plan).getBoundingClientRect();
    }

    function inBracket(x, y) {
        if (!bracketViewportEl || !bracketContentEl) return false;
        const rect = bracketViewportEl.getBoundingClientRect();
        return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    }

    if (viewport && objectLayerEl) {

        /* หลัง = ใต้ object ทั้งหมด (เส้นวันที่ / กล่องงาน อยู่ด้านบน) · หน้า = ทับ object */
        viewport.insertBefore(layers.back, objectLayerEl);
        viewport.insertBefore(layers.front, objectLayerEl.nextSibling);

    } else {

        plan.appendChild(layers.back);
        plan.appendChild(layers.front);
    }

    const DAY_MS = 86400000;

    function dayNumber(date) {
        return Math.round(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);
    }

    function geometry() {

        const ppd = typeof pxPerDay === "number" && pxPerDay > 0 ? pxPerDay : 8;
        const rowUnit = typeof categoryHeight === "number" && categoryHeight > 0 ? categoryHeight : 120;
        const startDay = typeof timelineStartDate !== "undefined" && timelineStartDate ? dayNumber(timelineStartDate) : 0;

        const scrollX = typeof timelineViewport !== "undefined" && timelineViewport ? timelineViewport.scrollLeft : 0;
        const scrollY = typeof verticalScrollY === "number" ? verticalScrollY : 0;

        const vpRect = viewport ? viewport.getBoundingClientRect() : plan.getBoundingClientRect();

        return { ppd, rowUnit, startDay, scrollX, scrollY, vpRect };
    }

    function findImage(id) {
        return images.find(item => item.id === id) || null;
    }

    function clampNumber(value, min, max, fallback) {

        const number = Number(value);

        if (!Number.isFinite(number)) return fallback;

        return Math.min(max, Math.max(min, number));
    }

    /* px ในตาราง → หน่วยที่เก็บ */
    function fromPixels(left, top, width, height, zone) {

        const g = geometry();
        const unit = unitFor(zone, g);

        return {
            day: g.startDay + left / g.ppd,
            wDays: Math.max(0.2, width / g.ppd),
            row: top / unit,
            hRows: Math.max(0.02, height / unit)
        };
    }

    function normalize(raw) {

        if (!raw || typeof raw.src !== "string" || !raw.src.startsWith("data:image/")) {
            return null;
        }

        const ar = clampNumber(raw.ar, 0.02, 50, 1.5);

        let place;

        if (Number.isFinite(Number(raw.day)) && Number(raw.wDays) > 0) {

            place = {
                day: Number(raw.day),
                wDays: Number(raw.wDays),
                row: clampNumber(raw.row, -5, 500, 0),
                hRows: clampNumber(raw.hRows, 0.02, 500, 1)
            };

        } else {

            /* รูปแบบเดิม (x / y / w เป็นสัดส่วนของกระดาน) → แปลงมาอยู่ในตาราง */
            const g = geometry();
            const planRect = plan.getBoundingClientRect();

            const width = clampNumber(raw.w, 0.005, 3, 0.2) * plan.clientWidth;
            const left = clampNumber(raw.x, -0.5, 1.5, 0.1) * plan.clientWidth + planRect.left - g.vpRect.left + g.scrollX;
            const top = clampNumber(raw.y, -0.5, 1.5, 0.1) * plan.clientHeight + planRect.top - g.vpRect.top + g.scrollY;

            place = fromPixels(Math.max(0, left), Math.max(0, top), width, width / ar);
        }

        return {
            id: typeof raw.id === "string" && raw.id ? raw.id : createLocalId("img"),
            src: raw.src,
            ...place,
            ar,
            opacity: clampNumber(raw.opacity, 0.1, 1, 1),
            layer: raw.layer === "front" ? "front" : "back",
            border: Boolean(raw.border),
            round: Boolean(raw.round),
            locked: Boolean(raw.locked),
            name: typeof raw.name === "string" ? raw.name.slice(0, 80) : "",
            ...(raw.zone === "bracket" ? { zone: "bracket" } : {}),
            ...(raw.sticker ? { sticker: true } : {})
        };
    }

    function serialize() {
        return images.map(item => ({ ...item }));
    }

    function load(list) {

        images = (Array.isArray(list) ? list : []).map(normalize).filter(Boolean);

        selectedId = null;

        render();
    }


    /* =====================================================
       BOARD IMAGES — RENDER
    ===================================================== */

    function pixelBox(item, g = geometry()) {

        const unit = unitFor(item.zone, g);

        return {
            left: (item.day - g.startDay) * g.ppd,
            top: item.row * unit,
            width: item.wDays * g.ppd,
            height: item.hRows * unit
        };
    }

    /* ขนาด/ตำแหน่ง scroll ของเลเยอร์ = เท่ากับเลเยอร์ object ของตาราง */
    function syncLayers() {

        const width = typeof timelineContent !== "undefined" && timelineContent
            ? timelineContent.offsetWidth
            : (objectLayerEl ? objectLayerEl.scrollWidth : plan.clientWidth);

        const height = typeof totalContentHeight === "number" && totalContentHeight > 0
            ? totalContentHeight
            : (objectLayerEl ? objectLayerEl.offsetHeight : plan.clientHeight);

        const transform = objectLayerEl ? objectLayerEl.style.transform : "";

        if (bracketContentEl) {
            layers.bracket.style.width = `${bracketContentEl.offsetWidth}px`;
            layers.bracket.style.height = "100%";
        }

        [layers.back, layers.front].forEach(layer => {

            layer.style.width = `${width}px`;
            layer.style.height = `${height}px`;
            layer.style.transform = transform;
        });
    }

    function render() {

        syncLayers();

        layers.front.innerHTML = "";
        layers.back.innerHTML = "";
        layers.bracket.innerHTML = "";

        const g = geometry();

        /* รูปแปะ (สติ๊กเกอร์) วาดทีหลัง → อยู่บนรูปอื่น ๆ เสมอ */
        const ordered = images.filter(item => !item.sticker).concat(images.filter(item => item.sticker));

        ordered.forEach(item => {

            const box = pixelBox(item, g);

            const element = document.createElement("div");

            element.className = "zg-bimg";
            element.dataset.imgId = item.id;

            element.classList.toggle("has-border", item.border);
            element.classList.toggle("is-round", item.round);
            element.classList.toggle("is-locked", item.locked);
            element.classList.toggle("is-selected", item.id === selectedId && !item.locked);

            element.style.left = `${box.left}px`;
            element.style.top = `${box.top}px`;
            element.style.width = `${box.width}px`;
            element.style.height = `${box.height}px`;
            element.style.opacity = String(item.opacity);

            const img = document.createElement("img");

            img.src = item.src;
            img.alt = item.name || "";
            img.draggable = false;

            element.appendChild(img);

            if (item.id === selectedId && !item.locked) {

                ["nw", "ne", "sw", "se"].forEach(dir => {

                    const handle = document.createElement("div");

                    handle.className = "zg-bimg-handle";
                    handle.dataset.dir = dir;

                    element.appendChild(handle);
                });
            }

            layerOf(item).appendChild(element);
        });

        renderBar();
    }

    function layerOf(item) {
        return item.zone === "bracket" && bracketContentEl ? layers.bracket : layers[item.layer];
    }

    function elementOf(id) {
        return document.querySelector(`.zg-img-layer .zg-bimg[data-img-id="${CSS.escape(id)}"]`);
    }

    /* วาดใหม่ทุกครั้งที่ตารางวาด object ใหม่ (ซูม, เปลี่ยนช่วงวันที่, ย่อขยายหน้าต่าง) */
    if (typeof renderObjects === "function") {

        const originalRenderObjects = renderObjects;

        renderObjects = function () {

            const result = originalRenderObjects.apply(this, arguments);

            try {
                if (!drag) render();
            } catch (error) {
                console.error("[image-board.js]", error);
            }

            return result;
        };
    }

    /* ตารางเลื่อน (scroll) → เลเยอร์รูปเลื่อนตาม */
    if (objectLayerEl && typeof MutationObserver === "function") {

        new MutationObserver(() => {

            const transform = objectLayerEl.style.transform;

            if (layers.back.style.transform !== transform) {
                layers.back.style.transform = transform;
                layers.front.style.transform = transform;
            }

            positionBar();

        }).observe(objectLayerEl, { attributes: true, attributeFilter: ["style"] });
    }


    /* ---------- แถบเครื่องมือ ---------- */

    let barEl = null;

    function closeBar() {

        if (barEl) {
            barEl.remove();
            barEl = null;
        }
    }

    function renderBar() {

        const item = selectedId ? findImage(selectedId) : null;

        if (!item || item.locked) {
            closeBar();
            return;
        }

        if (!barEl) {

            barEl = document.createElement("div");
            barEl.className = "zg-bimg-bar";

            barEl.addEventListener("mousedown", event => event.stopPropagation());
            barEl.addEventListener("pointerdown", event => event.stopPropagation());

            barEl.addEventListener("click", onBarClick);
            barEl.addEventListener("input", onBarInput);
            barEl.addEventListener("change", () => recordHistory());

            document.body.appendChild(barEl);
        }

        barEl.innerHTML = `
            <label title="ความโปร่งใส">◐ <input type="range" min="10" max="100" step="5" value="${Math.round(item.opacity * 100)}" data-bar="opacity"></label>
            <span class="zg-bimg-sep"></span>
            <button type="button" data-bar="layer" title="หลัง = อยู่หลังเส้นและกล่องงาน / หน้า = ทับเส้นและกล่องงาน">${item.layer === "front" ? "⬆ ชั้นหน้า" : "⬇ ชั้นหลัง"}</button>
            <button type="button" data-bar="border" class="${item.border ? "is-on" : ""}" title="กรอบขาว + เงา">▢ กรอบ</button>
            <button type="button" data-bar="round" class="${item.round ? "is-on" : ""}" title="มุมโค้ง">◜ มุมโค้ง</button>
            <button type="button" data-bar="lock" title="ล็อกรูป (คลิกทะลุได้ ใช้เป็นภาพอ้างอิง) — ปลดล็อกได้ที่เมนู 🖼 รูปภาพ">🔒 ล็อก</button>
            <span class="zg-bimg-sep"></span>
            <button type="button" data-bar="replace" title="เปลี่ยนรูป (คงตำแหน่งและความกว้าง)">🔄</button>
            <button type="button" data-bar="download" title="บันทึกรูปลงเครื่อง">💾</button>
            <button type="button" data-bar="duplicate" title="ทำสำเนา">⧉</button>
            <button type="button" data-bar="delete" class="is-danger" title="ลบรูป (Delete)">🗑</button>
        `;

        positionBar();
    }

    function positionBar() {

        if (!barEl || !selectedId) return;

        const element = elementOf(selectedId);

        if (!element) {
            closeBar();
            return;
        }

        const rect = element.getBoundingClientRect();
        const item = findImage(selectedId);
        const area = zoneRect(item && item.zone);

        /* ส่วนที่มองเห็นของรูป (ภายในตาราง) */
        const visible = {
            left: Math.max(rect.left, area.left),
            right: Math.min(rect.right, area.right),
            top: Math.max(rect.top, area.top),
            bottom: Math.min(rect.bottom, area.bottom)
        };

        if (visible.right - visible.left < 8 || visible.bottom - visible.top < 8) {
            barEl.style.visibility = "hidden";
            return;
        }

        barEl.style.visibility = "";

        const barWidth = barEl.offsetWidth;
        const barHeight = barEl.offsetHeight;

        let left = (visible.left + visible.right) / 2 - barWidth / 2;
        let top = visible.top - barHeight - 10;

        const planTop = plan.getBoundingClientRect().top;

        if (top < planTop + 4) {
            top = visible.bottom + 10;
        }

        if (top + barHeight > window.innerHeight - 6) {
            top = Math.max(planTop + 4, visible.top + 8);
        }

        left = Math.max(6, Math.min(window.innerWidth - barWidth - 6, left));

        barEl.style.left = `${left}px`;
        barEl.style.top = `${top}px`;
    }

    function select(id) {

        if (selectedId === id) return;

        selectedId = id;

        render();
    }

    function onBarInput(event) {

        const item = findImage(selectedId);

        if (!item || event.target.dataset.bar !== "opacity") return;

        item.opacity = clampNumber(Number(event.target.value) / 100, 0.1, 1, 1);

        const element = elementOf(item.id);

        if (element) element.style.opacity = String(item.opacity);
    }

    async function onBarClick(event) {

        const button = event.target.closest("button[data-bar]");

        const item = findImage(selectedId);

        if (!button || !item) return;

        const action = button.dataset.bar;

        if (action === "layer") {
            item.layer = item.layer === "front" ? "back" : "front";
        } else if (action === "border") {
            item.border = !item.border;
        } else if (action === "round") {
            item.round = !item.round;
        } else if (action === "lock") {
            item.locked = true;
            selectedId = null;
            toast("ล็อกรูปแล้ว — ปลดล็อกได้ที่ปุ่ม 🖼 รูปภาพ");
        } else if (action === "delete") {
            removeImage(item.id);
            return;
        } else if (action === "duplicate") {
            const g = geometry();
            const copy = { ...item, id: createLocalId("img"), day: item.day + 18 / g.ppd, row: item.row + 18 / unitFor(item.zone, g) };
            images.push(copy);
            selectedId = copy.id;
        } else if (action === "download") {
            downloadDataURL(item.src, item.name || "รูปภาพ");
            return;
        } else if (action === "replace") {
            const files = await pickImageFiles();
            if (!files.length) return;
            try {
                const result = await processImage(files[0]);
                item.src = result.src;
                item.ar = result.width / result.height;
                /* คงความกว้าง ปรับความสูงตามรูปใหม่ */
                const g = geometry();
                item.hRows = (item.wDays * g.ppd / item.ar) / unitFor(item.zone, g);
                item.name = (files[0].name || "").replace(/\.[^.]+$/, "");
            } catch (error) {
                toast(error.message, true);
                return;
            }
        }

        render();
        recordHistory();
    }

    function removeImage(id) {

        images = images.filter(item => item.id !== id);

        if (selectedId === id) selectedId = null;

        render();
        recordHistory();
    }


    /* =====================================================
       BOARD IMAGES — ADD
    ===================================================== */

    let cascade = 0;

    /* point = {clientX, clientY} ตำแหน่งที่วาง (ถ้าไม่มี / อยู่นอกตาราง = กลางตารางที่มองเห็น) */
    async function addFiles(files, point) {

        const list = Array.from(files || []).filter(file => isImageFile(file) || isHeic(file));

        if (!list.length) {
            toast("ไม่พบไฟล์รูปภาพ", true);
            return [];
        }

        const added = [];

        for (const file of list) {

            try {

                const result = await processImage(file);

                const item = placeNew(result, point, (file.name || "").replace(/\.[^.]+$/, ""));

                added.push(item);

            } catch (error) {

                toast(`${file.name || "รูป"}: ${error.message}`, true);
            }
        }

        if (added.length) {

            selectedId = added[added.length - 1].id;

            render();
            recordHistory();

            toast(added.length > 1 ? `วางรูป ${added.length} รูปในตารางแล้ว` : "วางรูปในตารางแล้ว — ลากย้าย/ลากมุมเพื่อปรับขนาด");

            warnIfLarge();
        }

        return added;
    }

    function placeNew(result, point, name, extra = {}) {

        const g = geometry();

        /* วางในช่องเส้นวันที่ */
        if (point && inBracket(point.clientX, point.clientY)) {

            const rect = layers.bracket.getBoundingClientRect();
            const scale = layers.bracket.offsetWidth ? rect.width / layers.bracket.offsetWidth || 1 : 1;
            const area = bracketUnit();

            let width = Math.min(result.width, 360);
            let height = width * result.height / result.width;

            if (height > area) {
                height = area;
                width = height * result.width / result.height;
            }

            const left = (point.clientX - rect.left) / scale - width / 2;
            const top = Math.max(0, Math.min(area - height, (point.clientY - rect.top) / scale - height / 2));

            const item = normalize({
                src: result.src,
                ...fromPixels(left, top, width, height, "bracket"),
                ar: result.width / result.height,
                name,
                ...extra,
                zone: "bracket"
            });

            images.push(item);

            return item;
        }

        const viewW = Math.max(120, g.vpRect.width);
        const viewH = Math.max(80, g.vpRect.height);

        let width = Math.min(result.width, viewW * 0.35, 360);

        if (width < 60) width = Math.min(60, viewW * 0.35);

        let height = width * result.height / result.width;

        /* สูงเกินตารางที่มองเห็น → ย่อลง */
        if (height > viewH * 0.9) {
            height = viewH * 0.9;
            width = height * result.width / result.height;
        }

        const inside = point &&
            point.clientX >= g.vpRect.left && point.clientX <= g.vpRect.right &&
            point.clientY >= g.vpRect.top && point.clientY <= g.vpRect.bottom;

        let left;
        let top;

        if (inside) {

            left = point.clientX - g.vpRect.left + g.scrollX - width / 2;
            top = point.clientY - g.vpRect.top + g.scrollY - height / 2;

        } else {

            left = g.scrollX + (viewW - width) / 2 + cascade * 24;
            top = g.scrollY + (viewH - height) / 2 + cascade * 24;

            cascade = (cascade + 1) % 6;
        }

        left = Math.max(g.scrollX, Math.min(g.scrollX + viewW - width, left));
        top = Math.max(g.scrollY, Math.min(g.scrollY + Math.max(0, viewH - height), top));

        const item = normalize({
            src: result.src,
            ...fromPixels(left, top, width, height),
            ar: result.width / result.height,
            name,
            ...extra
        });

        images.push(item);

        return item;
    }

    function warnIfLarge() {

        const total = images.reduce((sum, item) => sum + item.src.length, 0);

        if (total > 2.5 * 1024 * 1024) {
            toast("รูปในแผนนี้มีขนาดรวมค่อนข้างใหญ่ — ถ้าบันทึกไม่ได้ ให้ลบรูปที่ไม่ใช้ หรือ Export เก็บไว้", true);
        }
    }


    /* =====================================================
       BOARD IMAGES — MOVE / RESIZE
    ===================================================== */

    let drag = null;

    document.addEventListener("pointerdown", event => {

        if (event.button !== 0 || !(event.target instanceof Element)) return;

        const element = event.target.closest(".zg-img-layer .zg-bimg");

        if (!element) return;

        const item = findImage(element.dataset.imgId);

        if (!item || item.locked) return;

        event.preventDefault();
        event.stopPropagation();

        if (typeof closeObjectMenu === "function") closeObjectMenu();

        if (document.activeElement && document.activeElement.blur) {
            document.activeElement.blur();
        }

        if (selectedId !== item.id) {
            select(item.id);
        }

        const target = elementOf(item.id);

        const handle = event.target.closest(".zg-bimg-handle");

        drag = {
            id: item.id,
            mode: handle ? "resize" : "move",
            dir: handle ? handle.dataset.dir : null,
            startX: event.clientX,
            startY: event.clientY,
            box: pixelBox(item),
            rect: target.getBoundingClientRect(),
            moved: false,
            pointerId: event.pointerId,
            element: target
        };

        try {
            target.setPointerCapture(event.pointerId);
        } catch (error) { /* ignore */ }

    }, true);

    document.addEventListener("pointermove", event => {

        if (!drag || event.pointerId !== drag.pointerId) return;

        const item = findImage(drag.id);

        if (!item) return;

        const dx = event.clientX - drag.startX;
        const dy = event.clientY - drag.startY;

        if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 3) return;

        drag.moved = true;

        const box = drag.box;

        let left = box.left;
        let top = box.top;
        let width = box.width;
        let height = box.height;

        if (drag.mode === "move") {

            left = box.left + dx;
            top = box.top + dy;

            /* ลากข้ามระหว่างตาราง ↔ ช่องเส้นวันที่ */
            if (bracketContentEl) {

                const zone = inBracket(event.clientX, event.clientY) ? "bracket" : "table";
                const layer = zone === "bracket" ? layers.bracket : layers[item.layer];
                const rect = layer.getBoundingClientRect();
                const scale = layer.offsetWidth ? rect.width / layer.offsetWidth || 1 : 1;

                left = (drag.rect.left + dx - rect.left) / scale;
                top = (drag.rect.top + dy - rect.top) / scale;
                width = drag.rect.width / scale;
                height = drag.rect.height / scale;

                if (zone === "bracket") item.zone = "bracket";
                else delete item.zone;

                const element = drag.element && drag.element.isConnected ? drag.element : elementOf(item.id);
                if (element && element.parentNode !== layer) layer.appendChild(element);
            }

        } else {

            const ratio = box.width / box.height;

            const sign = drag.dir.includes("w") ? -1 : 1;
            const signY = drag.dir.includes("n") ? -1 : 1;

            /* ใช้แกนที่ลากมากกว่า แต่คงสัดส่วน */
            const byX = box.width + dx * sign;
            const byY = (box.height + dy * signY) * ratio;

            width = Math.max(24, Math.abs(dx) >= Math.abs(dy) ? byX : byY);
            height = width / ratio;

            if (drag.dir.includes("w")) left = box.left + box.width - width;
            if (drag.dir.includes("n")) top = box.top + box.height - height;
        }

        Object.assign(item, fromPixels(left, top, width, height, item.zone));

        const element = drag.element && drag.element.isConnected ? drag.element : elementOf(item.id);

        if (element) {

            element.style.left = `${left}px`;
            element.style.top = `${top}px`;
            element.style.width = `${width}px`;
            element.style.height = `${height}px`;

            if (drag.mode === "resize") {

                let size = element.querySelector(".zg-bimg-size");

                if (!size) {
                    size = document.createElement("div");
                    size.className = "zg-bimg-size";
                    element.appendChild(size);
                }

                size.textContent = `${Math.round(width)} × ${Math.round(height)}`;
            }
        }

        positionBar();
    });

    function endDrag(event) {

        if (!drag || (event && event.pointerId !== drag.pointerId)) return;

        const moved = drag.moved;

        drag = null;

        if (moved) {
            render();
            recordHistory();
        }
    }

    document.addEventListener("pointerup", endDrag);
    document.addEventListener("pointercancel", endDrag);


    /* คลิกที่อื่น → เลิกเลือก */
    document.addEventListener("pointerdown", event => {

        if (!selectedId) return;

        const target = event.target;

        if (!(target instanceof Element)) return;

        if (target.closest(".zg-bimg, .zg-bimg-bar, .zg-img-menu")) return;

        selectedId = null;

        render();
    });


    /* คีย์บอร์ด */
    document.addEventListener("keydown", event => {

        if (!selectedId || isTypingTarget(event.target)) return;

        const item = findImage(selectedId);

        if (!item) return;

        if (event.key === "Delete" || event.key === "Backspace") {

            event.preventDefault();
            event.stopImmediatePropagation();

            removeImage(item.id);

            return;
        }

        if (event.key === "Escape") {

            selectedId = null;
            render();

            return;
        }

        const arrows = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

        if (arrows[event.key]) {

            event.preventDefault();
            event.stopImmediatePropagation();

            const step = event.shiftKey ? 10 : 1;
            const g = geometry();

            item.day += (arrows[event.key][0] * step) / g.ppd;
            item.row += (arrows[event.key][1] * step) / unitFor(item.zone, g);

            render();

            clearTimeout(nudgeTimer);
            nudgeTimer = setTimeout(recordHistory, 400);
        }

    }, true);

    let nudgeTimer = null;

    window.addEventListener("resize", () => positionBar());


    /* =====================================================
       PASTE (Ctrl+V) / DROP
    ===================================================== */

    function startPageOpen() {

        const start = document.querySelector(".zg-start");

        return Boolean(start && !start.hidden);
    }

    function anyDialogOpen() {

        return Boolean(document.querySelector(".zg-iplan, .zg-plan-overlay, .zg-tpl-overlay"));
    }

    document.addEventListener("paste", event => {

        if (startPageOpen() || anyDialogOpen()) return;

        const transfer = event.clipboardData;

        if (!transfer) return;

        const files = filesFromTransfer(transfer).filter(isImageFile);

        if (!files.length) return;

        /* กำลังพิมพ์ข้อความ และคลิปบอร์ดมีข้อความด้วย → ปล่อยให้วางข้อความตามปกติ */
        const text = transfer.getData && transfer.getData("text/plain");

        if (isTypingTarget(event.target) && text && text.trim()) return;

        event.preventDefault();
        event.stopImmediatePropagation();

        /* ไฟล์อื่นจัดการก่อนได้ (เช่น วางลงกล่องงานที่เลือก) */
        if (window.ZGImage.onPasteFiles && window.ZGImage.onPasteFiles(files)) return;

        addFiles(files);

    }, true);


    const dropHint = document.createElement("div");

    dropHint.className = "zg-img-drop";
    dropHint.innerHTML = `<span>🖼 วางรูปลงบนกระดาน</span>`;

    document.body.appendChild(dropHint);

    let dragDepth = 0;

    function showDropHint(show, message) {

        if (show) {

            const rect = plan.getBoundingClientRect();

            dropHint.style.left = `${rect.left + 8}px`;
            dropHint.style.top = `${rect.top + 8}px`;
            dropHint.style.width = `${rect.width - 16}px`;
            dropHint.style.height = `${rect.height - 16}px`;

            if (message) dropHint.firstElementChild.textContent = message;
        }

        dropHint.classList.toggle("is-show", Boolean(show));
    }

    document.addEventListener("dragenter", event => {

        if (!transferHasFiles(event.dataTransfer) || startPageOpen() || anyDialogOpen()) return;

        dragDepth += 1;

        showDropHint(true, "🖼 วางรูปในตาราง · วางบนกล่องงาน = ใส่รูปในกล่อง · 📄 ไฟล์ .json = Import");
    });

    /* วางที่ไหนก็ตาม (รวมถึงไฟล์อื่นที่จัดการเอง) → ซ่อนกรอบวาง */
    document.addEventListener("drop", () => {

        dragDepth = 0;

        showDropHint(false);

    }, true);

    document.addEventListener("dragleave", () => {

        dragDepth = Math.max(0, dragDepth - 1);

        if (!dragDepth) showDropHint(false);
    });

    document.addEventListener("dragover", event => {

        if (!transferHasFiles(event.dataTransfer) || startPageOpen() || anyDialogOpen()) return;

        event.preventDefault();

        event.dataTransfer.dropEffect = "copy";
    });

    document.addEventListener("drop", event => {

        dragDepth = 0;

        showDropHint(false);

        if (!transferHasFiles(event.dataTransfer) || startPageOpen() || anyDialogOpen()) return;

        event.preventDefault();

        const files = filesFromTransfer(event.dataTransfer);

        const jsonFile = files.find(file => /\.json$/i.test(file.name || ""));

        if (jsonFile && !files.some(isImageFile)) {
            importPlanJson(jsonFile);
            return;
        }

        if (!files.some(file => isImageFile(file) || isHeic(file))) {
            toast("วางได้เฉพาะไฟล์รูปภาพ หรือไฟล์แผน .json", true);
            return;
        }

        addFiles(files, { clientX: event.clientX, clientY: event.clientY });
    });

    function importPlanJson(file) {

        const reader = new FileReader();

        reader.onload = () => {

            let data;

            try {
                data = JSON.parse(String(reader.result));
            } catch (error) {
                toast("อ่านไฟล์ไม่ได้: ไฟล์ไม่ใช่ JSON ที่ถูกต้อง", true);
                return;
            }

            const problem = window.ZGPlanIO.validate ? window.ZGPlanIO.validate(data) : null;

            if (problem) {
                toast(problem, true);
                return;
            }

            if (window.ZGPlans && typeof window.ZGPlans.importData === "function") {
                window.ZGPlans.importData(data, file.name);
            } else {
                window.ZGPlanIO.apply(data);
            }
        };

        reader.readAsText(file);
    }


    /* =====================================================
       SAVE / LOAD กับแผน (ZGPlanIO)
    ===================================================== */

    const io = window.ZGPlanIO;

    const originalBuild = io.build;

    io.build = function () {

        const data = originalBuild.apply(this, arguments);

        if (data && typeof data === "object") {
            data.images = serialize();
        }

        return data;
    };

    const originalApply = io.apply;

    io.apply = function (data) {

        const result = originalApply.apply(this, arguments);

        try {
            load(data && data.images);
        } catch (error) {
            console.error("[image-board.js]", error);
        }

        return result;
    };

    /* Export ไฟล์แผน → ใช้ build ตัวเต็ม (มีรูป/โลโก้ด้วย) */
    function safeFileName(name) {

        return String(name || "plan")
            .replace(/[\\/:*?"<>|]+/g, "_")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 80) || "plan";
    }

    io.exportFile = function () {

        const data = io.build();

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });

        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");

        const today = new Date();

        const stamp = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

        link.href = url;
        link.download = `${safeFileName(data.title)}_${stamp}.json`;

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };


    /* =====================================================
       MENU ITEMS (ของไฟล์นี้)
    ===================================================== */

    addMenuItem({
        order: 10,
        group: "board",
        icon: "🖼",
        label: "วางรูปบนกระดาน…",
        sub: "อยู่ในตาราง เลื่อน/ซูมตามตาราง · เลือกได้หลายรูป",
        run: async () => {
            const files = await pickImageFiles({ multiple: true });
            if (files.length) addFiles(files);
        }
    });

    addMenuItem({
        order: 15,
        group: "board",
        icon: "📋",
        label: "วางรูปจากคลิปบอร์ด",
        sub: "รูปที่คัดลอกไว้ (หรือกด Ctrl+V)",
        visible: () => Boolean(navigator.clipboard && navigator.clipboard.read),
        run: async () => {

            try {

                const items = await navigator.clipboard.read();

                const files = [];

                for (const clip of items) {

                    const type = clip.types.find(item => item.startsWith("image/"));

                    if (type) {
                        const blob = await clip.getType(type);
                        files.push(new File([blob], "clipboard." + type.split("/")[1], { type }));
                    }
                }

                if (!files.length) {
                    toast("ในคลิปบอร์ดยังไม่มีรูป — คัดลอกรูปก่อน แล้วลองใหม่", true);
                    return;
                }

                addFiles(files);

            } catch (error) {

                toast("เบราว์เซอร์ไม่อนุญาตให้อ่านคลิปบอร์ด — ลองกด Ctrl+V แทน", true);
            }
        }
    });

    addMenuItem({
        order: 90,
        group: "manage",
        icon: "🔓",
        label: () => `ปลดล็อกรูปบนกระดาน (${images.filter(item => item.locked).length})`,
        sub: "รูปที่ล็อกไว้จะกลับมาลากย้ายได้",
        visible: () => images.some(item => item.locked),
        run: () => {
            images.forEach(item => { item.locked = false; });
            render();
            recordHistory();
            toast("ปลดล็อกรูปแล้ว");
        }
    });

    addMenuItem({
        order: 95,
        group: "manage",
        icon: "🗑",
        label: "ลบรูปบนกระดานทั้งหมด",
        visible: () => images.length > 0,
        run: () => {
            if (!window.confirm(`ลบรูปบนกระดานทั้งหมด ${images.length} รูป?\n(กดย้อนกลับ ↶ ได้)`)) return;
            images = [];
            selectedId = null;
            render();
            recordHistory();
        }
    });


    /* =====================================================
       PUBLIC
    ===================================================== */

    window.ZGImage = Object.assign(window.ZGImage || {}, {

        isImageFile,
        isHeic,
        processImage,
        loadImage,
        pickImageFiles,
        filesFromTransfer,
        transferHasFiles,
        isTypingTarget,
        recordHistory,
        escapeHtml,
        createLocalId,
        downloadDataURL,
        toast,
        addMenuItem,
        closeMenu,

        /* ไฟล์อื่นตั้งค่าได้: คืน true = จัดการรูปที่วางแล้ว */
        onPasteFiles: null
    });

    window.ZGBoardImages = {

        list: serialize,
        load,
        addFiles,

        /* เพิ่มรูปจาก dataURL (ใช้โดย image-plan.js) */
        async addSrc(src, options = {}) {

            const result = await processImage(src);

            const item = placeNew(result, null, options.name || "", options);

            render();
            recordHistory();

            return item;
        },

        /* ลากคลุม / ย้ายเป็นกลุ่ม (ใช้โดย marquee-select.js) */
        positions(ids) {
            const map = {};
            (ids || []).forEach(id => {
                const item = findImage(id);
                if (item && !item.locked) map[id] = { day: item.day, row: item.row };
            });
            return map;
        },

        moveFrom(base, dDays, dyPx) {
            const g = geometry();
            Object.keys(base || {}).forEach(id => {
                const item = findImage(id);
                if (!item) return;
                item.day = base[id].day + (Number(dDays) || 0);
                item.row = Math.max(-5, base[id].row + (Number(dyPx) || 0) / unitFor(item.zone, g));
            });
            render();
        },

        remove(ids) {
            const set = new Set(ids || []);
            if (!set.size) return;
            images = images.filter(item => !set.has(item.id));
            if (selectedId && set.has(selectedId)) selectedId = null;
            render();
            recordHistory();
        },

        /* แปะสติ๊กเกอร์ (ใช้โดย stickers.js): ขนาดเริ่ม = options.width px, วางตรง options.point */
        async addSticker(src, options = {}) {

            const result = await processImage(src, { maxSide: 800, keepBelowChars: 400000 });

            const width = Math.max(24, Number(options.width) || 96);

            const shown = { src: result.src, width, height: width * result.height / result.width };

            /* รูปแปะ → ชั้นหน้า อยู่บนสุดของ object ทุกชิ้น */
            const item = placeNew(shown, options.point || null, options.name || "", { layer: "front", sticker: true });

            selectedId = item.id;

            render();
            recordHistory();

            return item;
        },

        /* สร้างข้อมูลรูปสำหรับใส่ในแผนใหม่ (ยังไม่วาง) */
        makeEntry(raw) {
            return normalize(raw);
        },

        refresh: render
    };

})();
