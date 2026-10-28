"use strict";

/* =========================================================
   MARQUEE-SELECT.JS — ลากคลุมเพื่อเลือกหลาย object แล้วย้ายพร้อมกัน
   - ลากบนพื้นที่ว่างในตาราง หรือช่องเส้นวันที่ (bracket) = ตีกรอบเลือก
       โดนกรอบ (แม้แค่บางส่วน) = ถูกเลือก:
       กล่องงาน · เส้นวันที่ · เส้นแนวตั้ง · เส้นแนวนอน · กล่องข้อความ (Text)
       · รูป / สติ๊กเกอร์ในตาราง (ที่ไม่ได้ล็อก)
     Shift + ลาก = เพิ่มเข้าไปในกลุ่มเดิม
   - ลากชิ้นไหนก็ได้ในกลุ่ม = ทั้งกลุ่มย้ายตาม (เลื่อนทีละวัน)
   - Delete = ลบทั้งกลุ่ม · Esc / คลิกที่ว่าง = เลิกเลือก
   - เลื่อนตารางด้วยการลาก: กด Space ค้างไว้ หรือใช้ปุ่มกลางเมาส์
   - ไม่แก้ app.js / style.css — โหลดหลัง object-precise.js, image-board.js, text.js
========================================================= */

(function () {

    const P = window.ZGObjectPrecise;

    if (!P || typeof timelineViewport === "undefined" || typeof objectLayer === "undefined") {
        console.warn("[marquee-select.js] ต้องโหลดหลัง object-precise.js");
        return;
    }

    const board = window.ZGBoardImages || null;
    const canImages = Boolean(board && typeof board.positions === "function" && typeof board.moveFrom === "function");

    const T = window.ZGTextBoxes || null;
    const canTexts = Boolean(T && typeof T.serialize === "function" && typeof T.load === "function");

    const bracketVp = typeof bracketViewport !== "undefined" ? bracketViewport : null;
    const bracketBox = typeof bracketContent !== "undefined" ? bracketContent : null;

    const TYPES = ["task", "dateline", "vline", "hline"];
    const START_DISTANCE = 4;


    /* =====================================================
       STYLE
    ===================================================== */

    const style = document.createElement("style");

    style.textContent = `
.zg-marquee {
    position: fixed;
    z-index: 9000;
    border: 1.5px solid #4f9a2f;
    border-radius: 3px;
    background: rgba(122, 193, 67, .12);
    pointer-events: none;
}
body.zg-marquee-on, body.zg-marquee-on * { cursor: crosshair !important; user-select: none !important; }
body.zg-group-moving, body.zg-group-moving * { cursor: grabbing !important; user-select: none !important; }
body.zg-space-scroll #timelineViewport,
body.zg-space-scroll #bracketViewport { cursor: grab !important; }

.zg-img-layer .zg-bimg.zg-marq-img,
.zg-text-box.zg-marq-text {
    outline: 2px solid #4f9a2f;
    outline-offset: 2px;
    border-radius: 4px;
    cursor: grab;
}

.zg-marq-count {
    position: fixed;
    z-index: 9001;
    padding: 3px 9px;
    border-radius: 10px;
    background: #2f6e1f;
    color: #ffffff;
    font: 700 11px Arial, Helvetica, sans-serif;
    pointer-events: none;
    transform: translate(10px, 12px);
    white-space: nowrap;
}
body.zg-exporting .zg-marquee,
body.zg-exporting .zg-marq-count { display: none !important; }
body.zg-exporting .zg-img-layer .zg-bimg.zg-marq-img,
body.zg-exporting .zg-text-box.zg-marq-text { outline: none !important; }
`;

    document.head.appendChild(style);


    /* =====================================================
       HELPERS
    ===================================================== */

    const selectedImages = new Set();
    const selectedTexts = new Set();

    function findObject(id) {
        return (Array.isArray(timelineObjects) ? timelineObjects : []).find(object => object.id === id) || null;
    }

    function addDays(date, days) {
        const next = new Date(date);
        next.setDate(next.getDate() + days);
        return next;
    }

    function dayDiff(from, to) {
        const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
        const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
        return Math.round((b - a) / 86400000);
    }

    function layerScale() {
        const width = objectLayer.offsetWidth;
        return width ? objectLayer.getBoundingClientRect().width / width || 1 : 1;
    }

    function record() {
        if (window.ZGHistory && typeof window.ZGHistory.record === "function") {
            setTimeout(() => window.ZGHistory.record(), 0);
        }
    }

    function isTyping(target) {
        return target instanceof Element && Boolean(target.closest("input, textarea, select, [contenteditable='true'], [contenteditable='']"));
    }

    function intersects(a, b) {
        return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    }

    function textElement(id) {
        return document.querySelector(`.zg-text-box[data-text-id="${CSS.escape(id)}"]`);
    }

    function paintExtras() {

        document.querySelectorAll(".zg-img-layer .zg-bimg").forEach(node => {
            node.classList.toggle("zg-marq-img", selectedImages.has(node.dataset.imgId));
        });

        document.querySelectorAll(".zg-text-box[data-text-id]").forEach(node => {
            node.classList.toggle("zg-marq-text", selectedTexts.has(node.dataset.textId));
        });
    }

    function clearExtras() {
        if (!selectedImages.size && !selectedTexts.size) return;
        selectedImages.clear();
        selectedTexts.clear();
        paintExtras();
    }

    function groupSize() {
        return P.getSelectedIds().length + selectedImages.size + selectedTexts.size;
    }

    /* รูป / กล่องข้อความวาดใหม่ → ใส่กรอบเลือกกลับ */
    new MutationObserver(() => {
        if (selectedImages.size || selectedTexts.size) paintExtras();
    }).observe(document.body, { childList: true, subtree: true });


    /* =====================================================
       กล่องข้อความ: ขยับระหว่างลาก (ภาพ) แล้วบันทึกตอนปล่อย
    ===================================================== */

    /* กล่องที่ติดแม่เหล็กกับ object ที่อยู่ในกลุ่มอยู่แล้ว → ไปเองไม่ต้องขยับ */
    function textsToShift() {

        if (!canTexts || !selectedTexts.size) return [];

        const groupIds = new Set(P.getSelectedIds());

        return T.serialize()
            .filter(item => selectedTexts.has(item.id))
            .filter(item => !(item.attach && groupIds.has(item.attach.objectId)))
            .map(item => item.id);
    }

    function previewTexts(ids, dx, dy) {
        ids.forEach(id => {
            const node = textElement(id);
            if (node) node.style.translate = `${dx}px ${dy}px`;
        });
    }

    function commitTexts(ids, dx, dy) {

        ids.forEach(id => {
            const node = textElement(id);
            if (node) node.style.translate = "";
        });

        if (!ids.length || (!dx && !dy)) return;

        const set = new Set(ids);

        const list = T.serialize().map(item => {

            if (!set.has(item.id)) return item;

            const next = { ...item };

            if (next.attach) {
                next.attach = { ...next.attach, dx: next.attach.dx + dx, dy: next.attach.dy + dy };
            } else {
                next.x = item.x + dx;
                next.y = Math.max(0, item.y + dy);
            }

            return next;
        });

        T.load(list);

        paintExtras();
    }


    /* =====================================================
       ลากเลื่อนตาราง: Space ค้าง / ปุ่มกลาง
    ===================================================== */

    const AREA_PAN = "#timelineViewport, #bracketViewport, #objectLayerViewport";

    let spaceHeld = false;
    let pointerOverTable = false;

    /* v2: เมาส์อยู่บนตาราง → Space ไม่ไปกดปุ่มที่โฟกัสค้างอยู่ (เช่นปุ่มแถบเครื่องมือที่เพิ่งคลิก) */
    window.addEventListener("pointermove", event => {
        pointerOverTable = event.target instanceof Element && Boolean(event.target.closest(AREA_PAN));
    }, { passive: true });

    window.addEventListener("keydown", event => {
        if (event.code === "Space" && !isTyping(event.target)) {
            if (!spaceHeld) document.body.classList.add("zg-space-scroll");
            spaceHeld = true;
            if (event.target === document.body || pointerOverTable) event.preventDefault();
        }
    }, true);

    window.addEventListener("keyup", event => {
        if (event.code === "Space" && pointerOverTable && !isTyping(event.target)) event.preventDefault();
    }, true);

    /*
        v2: ลากด้วยปุ่มกลางเมาส์ = เลื่อนตาราง (เดิมเขียนไว้ในวิธีใช้ แต่ยังไม่มีจริง)
        ทั้งแนวนอน (ตาราง + ช่องเส้นวันที่ไปพร้อมกัน) และแนวตั้ง
    */
    let middlePan = null;

    window.addEventListener("pointerdown", event => {
        if ((event.button === 1 || (event.button === 0 && spaceHeld)) && event.target instanceof Element && event.target.closest(AREA_PAN)) event.stopPropagation();
    }, true);

    window.addEventListener("mousedown", event => {

        /* ปุ่มกลาง หรือ Space ค้าง + ปุ่มซ้าย (แม้กดบน object ก็เลื่อนตาราง ไม่ลาก object) */
        if (event.button !== 1 && !(event.button === 0 && spaceHeld)) return;

        const target = event.target instanceof Element ? event.target : null;

        if (!target || !target.closest(AREA_PAN)) return;

        event.preventDefault();   /* ปิด autoscroll วงกลมของเบราว์เซอร์ */
        event.stopPropagation();  /* ปุ่มกลางบน object = เลื่อนตาราง ไม่ใช่ลาก/ยืด object */

        middlePan = {
            mask: event.button === 1 ? 4 : 1,
            x: event.clientX,
            y: event.clientY,
            left: timelineViewport.scrollLeft,
            top: typeof verticalScrollY === "number" ? verticalScrollY : 0
        };

        document.body.classList.add("zg-space-scroll", "zg-middle-pan");

    }, true);

    window.addEventListener("mousemove", event => {

        if (!middlePan) return;

        if (!(event.buttons & middlePan.mask)) { endMiddlePan(); return; }

        timelineViewport.scrollLeft = middlePan.left - (event.clientX - middlePan.x);

        if (typeof setVerticalScroll === "function") {
            setVerticalScroll(middlePan.top - (event.clientY - middlePan.y));
        }

        timelineViewport.dispatchEvent(new Event("scroll"));

        if (typeof updateAllHorizontalRanges === "function") updateAllHorizontalRanges();
    });

    function endMiddlePan() {
        if (!middlePan) return;
        middlePan = null;
        document.body.classList.remove("zg-middle-pan");
        if (!spaceHeld) document.body.classList.remove("zg-space-scroll");
    }

    window.addEventListener("mouseup", event => { if (middlePan && (event.button === 1 || event.button === 0)) endMiddlePan(); });
    window.addEventListener("auxclick", event => { if (event.button === 1 && event.target instanceof Element && event.target.closest(AREA_PAN)) event.preventDefault(); });

    window.addEventListener("keyup", event => {
        if (event.code === "Space") {
            spaceHeld = false;
            document.body.classList.remove("zg-space-scroll");
        }
    });

    window.addEventListener("blur", () => {
        spaceHeld = false;
        endMiddlePan();
        document.body.classList.remove("zg-space-scroll");
    });


    /* =====================================================
       1) ลากคลุม
    ===================================================== */

    let marquee = null;

    const EMPTY_EXCLUDE = [
        ".canvas-object",
        ".zg-bimg",
        ".zg-img-layer",
        "[class*='zg-text']",
        ".zg-dateline-stem",
        "input", "textarea", "select", "button",
        "[contenteditable='true']",
        ".object-menu",
        ".day-number-label"
    ].join(", ");

    const AREA = "#timelineViewport, #bracketViewport";

    /*
        v3: ตารางแคบกว่าพื้นที่บนจอ (ซ่อน / รวบวัน หรือแผนไม่กี่เดือน) → ด้านขวาเป็นที่ว่าง
        เดิมเริ่มลากคลุมจากตรงนั้นไม่ได้ (เบราว์เซอร์ไปเลือกข้อความแทน → กด Delete แล้วลบไม่ได้)
        ตอนนี้: ที่ว่างในกรอบตาราง / ช่องเส้นวันที่ ทางขวาของคอลัมน์ชื่อ ก็เริ่มลากคลุมได้
    */
    const AREA_SPARE = "#scheduleArea, #bracketArea, .bracket-area, .zg-table-end-mask";
    const SIDE_COLUMNS = "#categorySidebar, #partySidebar, .bracket-label, .category-scrollbar, .zg-vscroll, .timeline-horizontal-scroll";

    function inMarqueeArea(target, clientX) {

        if (target.closest(AREA)) return true;

        if (!target.closest(AREA_SPARE) || target.closest(SIDE_COLUMNS)) return false;

        /* ต้องอยู่ทางขวาของคอลัมน์ชื่อหมวด / ผู้เกี่ยวข้อง */
        const left = timelineViewport.getBoundingClientRect().left;

        return clientX >= left;
    }

    document.addEventListener("mousedown", event => {

        if (event.button !== 0 || spaceHeld || event.altKey || event.ctrlKey || event.metaKey) return;

        const target = event.target instanceof Element ? event.target : null;

        if (!target || !inMarqueeArea(target, event.clientX) || target.closest(EMPTY_EXCLUDE)) return;

        /* กัน drag-scroll ของตาราง */
        event.preventDefault();
        event.stopPropagation();

        /* ให้เมนู / หน้าต่างอื่นที่ปิดเมื่อคลิกข้างนอก ยังปิดได้ตามปกติ */
        document.body.dispatchEvent(new MouseEvent("mousedown", {
            bubbles: true,
            cancelable: true,
            clientX: event.clientX,
            clientY: event.clientY,
            shiftKey: event.shiftKey,
            button: 0
        }));

        if (document.activeElement && document.activeElement.blur && isTyping(document.activeElement)) {
            document.activeElement.blur();
        }

        if (typeof closeObjectMenu === "function") closeObjectMenu();

        if (!event.shiftKey) {
            P.clear();
            clearExtras();
        }

        marquee = {
            x: event.clientX,
            y: event.clientY,
            additive: event.shiftKey,
            baseIds: P.getSelectedIds(),
            baseImages: new Set(selectedImages),
            baseTexts: new Set(selectedTexts),
            box: null,
            count: null,
            started: false
        };

    }, true);

    /* พื้นที่ที่ตีกรอบได้ = ตาราง + ช่องเส้นวันที่ */
    function areaRect() {

        const a = timelineViewport.getBoundingClientRect();
        const b = bracketVp ? bracketVp.getBoundingClientRect() : a;

        return {
            left: Math.min(a.left, b.left),
            right: Math.max(a.right, b.right),
            top: Math.min(a.top, b.top),
            bottom: Math.max(a.bottom, b.bottom)
        };
    }

    function marqueeRect(event) {

        const area = areaRect();

        const x = Math.max(area.left, Math.min(area.right, event.clientX));
        const y = Math.max(area.top, Math.min(area.bottom, event.clientY));

        return {
            left: Math.min(marquee.x, x),
            top: Math.min(marquee.y, y),
            right: Math.max(marquee.x, x),
            bottom: Math.max(marquee.y, y)
        };
    }

    function visibleRect(node, clipEl) {

        const box = node.getBoundingClientRect();

        if (!clipEl) return box;

        const clip = clipEl.getBoundingClientRect();

        return {
            left: Math.max(box.left, clip.left),
            right: Math.min(box.right, clip.right),
            top: Math.max(box.top, clip.top),
            bottom: Math.min(box.bottom, clip.bottom)
        };
    }

    function hitsIn(rect) {

        const ids = [];

        const scan = (container, clipEl) => {

            if (!container) return;

            container.querySelectorAll(".canvas-object[data-object-id]").forEach(node => {

                const object = findObject(node.dataset.objectId);

                if (!object || !TYPES.includes(object.type) || ids.includes(object.id)) return;

                const box = visibleRect(node, clipEl);

                if (box.right <= box.left && box.bottom <= box.top) return;

                /* เส้นบาง ๆ → ขยายพื้นที่โดนเล็กน้อย */
                const hit = {
                    left: box.left - 3, right: box.right + 3,
                    top: box.top - 3, bottom: box.bottom + 3
                };

                if (intersects(rect, hit)) ids.push(object.id);
            });
        };

        scan(objectLayer, timelineViewport);
        scan(bracketBox, bracketVp);

        const images = [];

        if (canImages) {
            document.querySelectorAll(".zg-img-layer .zg-bimg:not(.is-locked)").forEach(node => {
                if (intersects(rect, node.getBoundingClientRect())) images.push(node.dataset.imgId);
            });
        }

        const texts = [];

        if (canTexts) {
            document.querySelectorAll(".zg-text-box[data-text-id]").forEach(node => {
                if (node.style.visibility === "hidden" || node.offsetParent === null) return;
                if (intersects(rect, node.getBoundingClientRect())) texts.push(node.dataset.textId);
            });
        }

        return { ids, images, texts };
    }

    function applyHits(hits) {

        const ids = marquee.additive ? Array.from(new Set([...marquee.baseIds, ...hits.ids])) : hits.ids;

        P.setSelection(ids);

        selectedImages.clear();
        selectedTexts.clear();

        if (marquee.additive) {
            marquee.baseImages.forEach(id => selectedImages.add(id));
            marquee.baseTexts.forEach(id => selectedTexts.add(id));
        }

        hits.images.forEach(id => selectedImages.add(id));
        hits.texts.forEach(id => selectedTexts.add(id));

        paintExtras();

        return groupSize();
    }

    window.addEventListener("mousemove", event => {

        if (!marquee) return;

        if (!marquee.started) {

            if (Math.hypot(event.clientX - marquee.x, event.clientY - marquee.y) < START_DISTANCE) return;

            marquee.started = true;

            marquee.box = document.createElement("div");
            marquee.box.className = "zg-marquee";

            marquee.count = document.createElement("div");
            marquee.count.className = "zg-marq-count";

            document.body.appendChild(marquee.box);
            document.body.appendChild(marquee.count);
            document.body.classList.add("zg-marquee-on");
        }

        const rect = marqueeRect(event);

        Object.assign(marquee.box.style, {
            left: `${rect.left}px`,
            top: `${rect.top}px`,
            width: `${rect.right - rect.left}px`,
            height: `${rect.bottom - rect.top}px`
        });

        const total = applyHits(hitsIn(rect));

        marquee.count.textContent = total ? `เลือก ${total} ชิ้น` : "ลากคลุม object";
        marquee.count.style.left = `${event.clientX}px`;
        marquee.count.style.top = `${event.clientY}px`;
    });

    window.addEventListener("mouseup", () => {

        if (!marquee) return;

        const current = marquee;

        marquee = null;

        if (current.box) current.box.remove();
        if (current.count) current.count.remove();

        document.body.classList.remove("zg-marquee-on");

        if (current.started) {

            const total = groupSize();

            if (total > 1 && window.ZGImage && window.ZGImage.toast) {
                window.ZGImage.toast(`เลือก ${total} ชิ้น — ลากชิ้นไหนก็ได้เพื่อย้ายทั้งกลุ่ม · Delete = ลบ`);
            }
        }
    });


    /* =====================================================
       2) ลาก object ในกลุ่ม (ระบบลากเดิม)
          → object อื่นในกลุ่ม object-precise.js ย้ายให้
          → รูป + กล่องข้อความในกลุ่ม ไฟล์นี้ย้ายตาม
    ===================================================== */

    let follow = null;

    if (typeof handleObjectDragMove === "function") {

        const previous = handleObjectDragMove;

        handleObjectDragMove = function () {

            const result = previous.apply(this, arguments);

            try {
                followExtras();
            } catch (error) {
                console.error("[marquee-select.js]", error);
            }

            return result;
        };
    }

    function followExtras() {

        const state = typeof objectDragState !== "undefined" ? objectDragState : null;

        if (!state || (!selectedImages.size && !selectedTexts.size) || !P.getSelectedIds().includes(state.object.id)) {
            return;
        }

        if (state.mode !== "move" && state.mode !== "move-dateline") return;

        if (!follow || follow.state !== state) {
            follow = {
                state,
                images: canImages ? board.positions(Array.from(selectedImages)) : {},
                texts: textsToShift(),
                scale: layerScale(),
                dx: 0,
                dy: 0
            };
        }

        const lead = state.object;

        let dDays;
        let dy = 0;

        if (lead.type === "dateline" || lead.type === "vline") {
            /* เส้นวันที่ลากได้อิสระ (ระหว่างวัน) → รูป / กล่องข้อความที่เลือกไว้เลื่อนตามเท่ากันเป๊ะ */
            dDays = state.originDate ? (dateToLeft(lead.linkedHeaderDate) - dateToLeft(new Date(state.originDate))) / pxPerDay : 0;
        } else {
            /* กล่องงานเลื่อนแบบ px อิสระ (ไม่ปัดเป็นวัน) → รูป / กล่องข้อความต้องเลื่อนเท่ากันเป๊ะ ไม่งั้นเหลื่อมทีละนิด */
            dDays = (lead.x - state.originX) / pxPerDay;
            dy = lead.type === "task" ? lead.y - state.originY : 0;
        }

        if (canImages) board.moveFrom(follow.images, dDays, dy);

        follow.dx = dDays * pxPerDay * follow.scale;
        follow.dy = dy * follow.scale;

        previewTexts(follow.texts, follow.dx, follow.dy);
    }

    document.addEventListener("mouseup", () => {

        if (!follow) return;

        const current = follow;

        follow = null;

        commitTexts(current.texts, current.dx, current.dy);

        record();

    }, true);


    /* =====================================================
       3) ลากรูป / กล่องข้อความในกลุ่ม → ทั้งกลุ่มย้ายตาม
    ===================================================== */

    let move = null;

    /* window (capture) = ทำงานก่อน image-board.js / text.js */
    window.addEventListener("pointerdown", event => {

        if (event.button !== 0 || groupSize() < 2) return;

        const target = event.target instanceof Element ? event.target : null;

        if (!target) return;

        const image = target.closest(".zg-img-layer .zg-bimg");
        const text = target.closest(".zg-text-box[data-text-id]");

        const onImage = image && selectedImages.has(image.dataset.imgId) && !target.closest(".zg-bimg-handle");
        /* v2: กดที่ตัวหนังสือก็ลากทั้งกลุ่ม (ยกเว้นกำลังพิมพ์อยู่ในกล่องนั้น) — เดิมกล่องข้อความหลุดออกมาชิ้นเดียว */
        const content = text ? text.querySelector(".zg-text-content") : null;
        const typing = Boolean(content && document.activeElement === content && target.closest(".zg-text-content"));
        const onText = text && selectedTexts.has(text.dataset.textId) && !typing &&
            !target.closest(".zg-text-controls, .zg-text-handle");

        if (!onImage && !onText) return;

        /* กันการลากชิ้นเดี่ยวของ image-board.js / text.js */
        event.preventDefault();
        event.stopPropagation();

        const objects = P.getSelectedIds().map(findObject).filter(Boolean).map(object => ({
            object,
            x: object.x,
            y: object.y,
            date: object.linkedHeaderDate ? new Date(object.linkedHeaderDate) : null
        }));

        move = {
            x: event.clientX,
            y: event.clientY,
            scale: layerScale(),
            objects,
            images: canImages ? board.positions(Array.from(selectedImages)) : {},
            texts: textsToShift(),
            dxScreen: 0,
            dyScreen: 0,
            moved: false,
            content: onText && target.closest(".zg-text-content") ? content : null
        };

    }, true);

    /* drag-autoscroll.js: ตารางเลื่อนเองระหว่างลากกลุ่ม → กลุ่มต้องไปไกลขึ้นเท่าที่ตารางเลื่อน */
    window.addEventListener("zg:drag-scroll", event => {
        const px = event.detail && Number(event.detail.px);
        if (move && Number.isFinite(px)) move.x -= px * move.scale;
    });

    /* ขยายตารางไปทางซ้ายระหว่างลาก → เนื้อหาเลื่อนขวา */
    window.addEventListener("zg:timeline-shift", event => {
        const px = event.detail && Number(event.detail.px);
        const ratio = event.detail && Number(event.detail.ratio) > 0 ? Number(event.detail.ratio) : 1;
        if (!move || !Number.isFinite(px)) return;
        move.objects.forEach(item => { if (Number.isFinite(item.x)) item.x = item.x * ratio + px; });
    });

    window.addEventListener("pointermove", event => {

        if (!move) return;

        /* day-fold.js: ข้ามแถบวันที่ซ่อน = ข้ามหลายวัน */
        const dxPx = (window.ZGFold ? window.ZGFold.delta(move.x, event.clientX) : event.clientX - move.x) / move.scale;
        const dyPx = (event.clientY - move.y) / move.scale;

        if (!move.moved && Math.hypot(dxPx, dyPx) < START_DISTANCE) return;

        if (!move.moved) {
            move.moved = true;
            document.body.classList.add("zg-group-moving");
        }

        const dDays = Math.round(dxPx / pxPerDay);

        move.objects.forEach(item => {

            const object = item.object;

            if (object.type === "dateline" || object.type === "vline") {
                if (item.date) object.linkedHeaderDate = addDays(item.date, dDays);
            } else if (object.type === "task") {
                object.x = item.x + dDays * pxPerDay;
                object.y = Math.max(0, item.y + dyPx);
            } else if (object.type === "hline") {
                object.x = item.x + dDays * pxPerDay;
            }
        });

        if (move.objects.length && typeof renderObjects === "function") renderObjects();

        if (canImages) board.moveFrom(move.images, dDays, dyPx);

        /* กล่องข้อความ: แนวนอนตามวัน แนวตั้งตามเมาส์ */
        move.dxScreen = dDays * pxPerDay * move.scale;
        move.dyScreen = event.clientY - move.y;

        previewTexts(move.texts, move.dxScreen, move.dyScreen);
    });

    function endMove() {

        if (!move) return;

        const current = move;

        move = null;

        document.body.classList.remove("zg-group-moving");

        if (!current.moved) {
            /* คลิกตัวหนังสือเฉย ๆ (ไม่ได้ลาก) → เข้าโหมดพิมพ์เหมือนเดิม */
            if (current.content && current.content.isConnected) {
                current.content.focus();
                const range = document.createRange();
                range.selectNodeContents(current.content);
                range.collapse(false);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
            }
            return;
        }

        commitTexts(current.texts, current.dxScreen, current.dyScreen);

        record();
    }

    window.addEventListener("pointerup", endMove);
    window.addEventListener("pointercancel", endMove);


    /* =====================================================
       4) เลิกเลือก / ลบ
    ===================================================== */

    /* คลิกที่อื่น (ไม่ใช่ชิ้นในกลุ่ม) → เลิกเลือกรูป / กล่องข้อความในกลุ่ม */
    document.addEventListener("mousedown", event => {

        if (marquee || (!selectedImages.size && !selectedTexts.size) || event.shiftKey) return;

        const target = event.target instanceof Element ? event.target : null;

        if (!target) return;

        const image = target.closest(".zg-img-layer .zg-bimg");
        if (image && selectedImages.has(image.dataset.imgId)) return;

        const text = target.closest(".zg-text-box[data-text-id]");
        if (text && selectedTexts.has(text.dataset.textId)) return;

        const element = target.closest(".canvas-object[data-object-id]");
        if (element && P.getSelectedIds().includes(element.dataset.objectId)) return;

        if (target.closest(".object-menu, .zg-help, .toolbar, .workspace-toolbar")) return;

        clearExtras();
    });

    /* Delete: ลบรูป + กล่องข้อความในกลุ่ม (ส่วน object อื่น shortcuts.js ลบให้) */
    window.addEventListener("keydown", event => {

        if ((!selectedImages.size && !selectedTexts.size) || isTyping(event.target)) return;

        if (event.key === "Escape") {
            clearExtras();
            P.clear();
            return;
        }

        if (event.key !== "Delete" && event.key !== "Backspace") return;

        const images = Array.from(selectedImages);
        const texts = new Set(selectedTexts);

        selectedImages.clear();
        selectedTexts.clear();

        if (images.length && canImages && typeof board.remove === "function") board.remove(images);

        if (texts.size && canTexts) {
            T.load(T.serialize().filter(item => !texts.has(item.id)));
            record();
        }

        if (!P.getSelectedIds().length) event.preventDefault();

    }, true);


    window.ZGMarquee = {
        selectedImages: () => Array.from(selectedImages),
        selectedTexts: () => Array.from(selectedTexts),
        clear() { clearExtras(); P.clear(); },
        /* เลือกทั้งกลุ่มจากโค้ด (ใช้โดย presets.js) */
        select(group) {
            const g = group || {};
            P.setSelection(Array.isArray(g.ids) ? g.ids : []);
            selectedImages.clear();
            selectedTexts.clear();
            (g.images || []).forEach(id => selectedImages.add(id));
            (g.texts || []).forEach(id => selectedTexts.add(id));
            paintExtras();
        }
    };

})();
