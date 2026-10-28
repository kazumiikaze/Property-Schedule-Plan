"use strict";

/* =========================================================
   LABEL-DRAG.JS — ลากย้ายข้อความในกล่องงานด้วยเมาส์
   - กดที่ตัวหนังสือในกล่องงานแล้วลาก = ย้ายข้อความไปตรงไหนก็ได้ในกล่อง
     (คลิกเฉย ๆ ไม่ลาก = พิมพ์แก้ข้อความเหมือนเดิม)
   - v8: ลากอิสระจริง ไม่ดูดเข้าหมุดตำแหน่งในเมนูตั้งค่า · ลากออกนอกกล่องได้
     กด Alt ค้างระหว่างลาก = ดูดเข้า 9 ตำแหน่งมาตรฐาน (ซ้าย/กลาง/ขวา × บน/กลาง/ล่าง)
   - ข้อความแนวตั้ง (หมุนแล้ว) → ที่จับ ▴ ▾ บน-ล่าง ยืดความยาวบรรทัดได้ (object.labelHeight)
   - ตำแหน่งเก็บเป็นสัดส่วนของกล่อง → ยืด/ย่อ/ซูมแล้วข้อความยังอยู่ที่เดิม
   - เลือกตำแหน่งข้อความจากเมนู object = กลับไปใช้ตำแหน่งมาตรฐาน
   - ยืดช่องพิมพ์ซ้าย-ขวา: เลือกกล่อง / กำลังพิมพ์ → มีที่จับ ◂ ▸ สองข้างข้อความ
     ลากเพื่อกว้างขึ้น/แคบลง (พิมพ์ได้ยาวขึ้นก่อนขึ้นบรรทัดใหม่) · ดับเบิลคลิกที่จับ = กว้างอัตโนมัติ
     ลากออกเกินกล่องได้ (สูงสุด 6 เท่าของกล่อง) → ข้อความยื่นออกนอกกล่องทั้งสองข้าง/ข้างที่ชิด
   - บันทึกไปกับแผน · Ctrl+Z ย้อนกลับได้
   - ไม่แก้ app.js / style.css — โหลดหลัง object-text.js
========================================================= */

(function () {

    if (typeof renderObjects !== "function" || typeof timelineObjects === "undefined") {
        console.warn("[label-drag.js] ต้องโหลดหลัง app.js");
        return;
    }

    const LABEL = ".canvas-object--task .canvas-object-label";
    const START_PX = 4;
    const SNAP = 0.07;
    const MAX_RATIO = 6;          // ช่องพิมพ์กว้างได้สูงสุดกี่เท่าของกล่อง (เกิน 1 = ยื่นออกนอกกล่อง)

    const style = document.createElement("style");

    style.textContent = `
.canvas-object--task.zg-lbl-free .canvas-object-label-wrap { position: relative; }
.canvas-object--task.zg-lbl-free .canvas-object-label {
    position: absolute; transform: translate(-50%, -50%);
    width: max-content; max-width: calc(100% - var(--zg-li, 0px) - 4px); text-align: center;
}
/* กล่องที่มีรูปไอคอน + ข้อความตำแหน่งอิสระ → รูปชิดซ้ายเสมอ ข้อความวางในพื้นที่ที่เหลือ (ไม่ทับรูป) */
.canvas-object--task.zg-lbl-free.zg-has-timg .canvas-object-label-wrap { justify-content: flex-start !important; align-items: center !important; }
.canvas-object--task .canvas-object-label:not(:focus) { cursor: grab; }
body.zg-lbl-dragging, body.zg-lbl-dragging * { cursor: grabbing !important; user-select: none !important; }
.canvas-object--task.zg-lbl-dragging-box { outline: 2px dashed rgba(46, 139, 87, .55); outline-offset: -2px; }
.zg-lbl-guide { position: absolute; pointer-events: none; background: rgba(46, 139, 87, .65); z-index: 5; }
.zg-lbl-tip {
    position: fixed; z-index: 30000; pointer-events: none; padding: 3px 8px; border-radius: 6px;
    background: #1e2924; color: #fff; font-size: 11px; white-space: nowrap; transform: translate(12px, 14px);
}
.canvas-object--task .canvas-object-label.zg-lbl-wide { display: inline-block; box-sizing: border-box; flex: none; }
/* ช่องพิมพ์กว้างกว่ากล่อง → ข้อความยื่นออกนอกกล่องได้ (กล่องอื่นที่ไม่ยืดเกิน ไม่เปลี่ยน) */
.canvas-object--task.zg-lbl-over,
.canvas-object--task.zg-lbl-over .canvas-object-label-wrap { overflow: visible !important; }
.canvas-object--task.zg-lbl-over .canvas-object-label { max-width: none !important; max-height: none !important; overflow: visible; }
/* ข้อความที่ลากออกนอกกล่อง: แค่ไม่ตัดส่วนที่ยื่น (ความกว้าง/การตัดบรรทัดเท่าเดิม) */
.canvas-object--task.zg-lbl-out,
.canvas-object--task.zg-lbl-out .canvas-object-label-wrap { overflow: visible !important; }
.zg-lbl-handle.zg-lbl-handle--v { width: 22px; height: 10px; margin: -5px 0 0 -11px; cursor: ns-resize; }
.zg-lbl-handle.zg-lbl-handle--v::after { left: 5px; right: 5px; top: 2px; bottom: 2px; border: 0; border-top: 1px solid #2e8b57; border-bottom: 1px solid #2e8b57; }
.canvas-object--task.zg-lbl-over.text-light .canvas-object-label { text-shadow: 0 0 3px rgba(0, 0, 0, .55), 0 0 1px rgba(0, 0, 0, .6); }
.zg-lbl-handle {
    position: fixed; z-index: 26500; width: 10px; height: 22px; margin: -11px 0 0 -5px;
    border-radius: 4px; background: #ffffff; border: 2px solid #2e8b57; box-sizing: border-box;
    cursor: ew-resize; box-shadow: 0 1px 4px rgba(0,0,0,.25); display: none;
}
.zg-lbl-handle::after { content: ""; position: absolute; left: 2px; right: 2px; top: 5px; bottom: 5px; border-left: 1px solid #2e8b57; border-right: 1px solid #2e8b57; }
.zg-lbl-handle:hover { background: #e9f6ee; }
.zg-lbl-width-tip {
    position: fixed; z-index: 30000; pointer-events: none; padding: 3px 8px; border-radius: 6px;
    background: #1e2924; color: #fff; font-size: 11px; white-space: nowrap; transform: translate(12px, 14px);
}
body.zg-exporting .zg-lbl-guide, body.zg-exporting .zg-lbl-tip,
body.zg-exporting .zg-lbl-handle, body.zg-exporting .zg-lbl-width-tip { display: none !important; }
`;

    document.head.appendChild(style);

    function findObject(id) {
        return timelineObjects.find(object => object.id === id);
    }

    function record() {
        if (window.ZGHistory && typeof window.ZGHistory.record === "function") {
            try { window.ZGHistory.record(); } catch (error) { /* ไม่เป็นไร */ }
        }
    }

    /* 9 ตำแหน่งมาตรฐาน (ลำดับเดียวกับ TEXT_POSITION_CLASSES ของ app.js) */
    const GRID = [
        [0, 0], [0.5, 0], [1, 0],
        [0, 0.5], [0.5, 0.5], [1, 0.5],
        [0, 1], [0.5, 1], [1, 1]
    ];

    const POSITION_NAMES = ["ซ้ายบน", "กลางบน", "ขวาบน", "ซ้ายกลาง", "กึ่งกลาง", "ขวากลาง", "ซ้ายล่าง", "กลางล่าง", "ขวาล่าง"];


    /* =====================================================
       วาดตำแหน่งที่ลากไว้ (หลัง app.js วาดกล่องใหม่ทุกครั้ง)
    ===================================================== */

    function alignOf(element) {
        const match = /align-([tmb])([lcr])/.exec(element.className);
        return match ? match[2] : "c";
    }

    function isRotated(object) {
        const value = Number(object && object.textRotate);
        return value === 90 || value === 270;
    }

    /*
        ข้อความลอยที่ลากไว้ยื่นออกนอกกล่อง → แสดงส่วนที่ยื่น (ไม่ตัดทิ้ง)
        นับว่า "ออกนอก" เฉพาะตำแหน่งที่ระบบเดิมลากไปไม่ถึง (เดิมกันไว้ในกล่อง)
        → แผนเก่าหน้าตาเหมือนเดิมทุกกล่อง
    */
    function isOutside(x, y, halfW, halfH) {
        const minX = Math.min(0.5, halfW + 0.02) - 0.01;
        const minY = Math.min(0.5, halfH + 0.02) - 0.01;
        return x < minX || x > 1 - minX || y < minY || y > 1 - minY;
    }

    function outsideBox(element, label, object) {
        const pos = object && object.labelPos;
        if (!pos || !element.classList.contains("zg-lbl-free")) return false;
        const box = element.getBoundingClientRect();
        const rect = label.getBoundingClientRect();
        if (!box.width || !box.height || !rect.width) return false;
        const inset = insetOf(element) * screenScale(element);
        return isOutside(pos.x, pos.y, rect.width / 2 / Math.max(1, box.width - inset), rect.height / 2 / box.height);
    }

    function applyWidth(element, object, label) {
        const rotated = isRotated(object);
        const width = Number(object.labelWidth);
        const height = Number(object.labelHeight);
        const ratio = rotated ? height : width;
        if (ratio > 0) {
            label.classList.add("zg-lbl-wide");
            if (rotated) {
                label.style.width = "";
                label.style.height = `calc(100% * ${Math.min(MAX_RATIO, ratio).toFixed(4)})`;
            } else {
                label.style.height = "";
                label.style.width = `calc((100% - var(--zg-li, 0px)) * ${Math.min(MAX_RATIO, ratio).toFixed(4)})`;
            }
            const align = element.classList.contains("zg-lbl-free") ? "c" : alignOf(element);
            label.style.textAlign = rotated ? "center" : align === "l" ? "left" : align === "r" ? "right" : "center";
        } else {
            label.classList.remove("zg-lbl-wide");
            label.style.width = "";
            label.style.height = "";
            label.style.textAlign = "";
        }
        element.classList.toggle("zg-lbl-over", ratio > 1);
        element.classList.toggle("zg-lbl-out", outsideBox(element, label, object));
    }

    /*
        รูปไอคอนในกล่อง (image-task.js) กินที่ด้านซ้าย
        → ตำแหน่ง/ความกว้างข้อความคิดจาก "พื้นที่ที่เหลือ" ทางขวาของรูป
        (ซูมเบราว์เซอร์ 110–150% กล่องแคบลง ข้อความจะไม่ทับรูป)
    */
    function insetOf(element) {
        const icon = element.querySelector(".zg-timg-icon");
        if (!icon || !icon.offsetWidth) return 0;
        return icon.offsetLeft + icon.offsetWidth + 4;
    }

    function updateInset(element) {
        const wrap = element.querySelector(".canvas-object-label-wrap");
        if (!wrap) return 0;
        const icon = element.querySelector(".zg-timg-icon");
        if (icon && !icon.complete && !icon.dataset.zgLiWait) {
            icon.dataset.zgLiWait = "1";
            icon.addEventListener("load", () => updateInset(element), { once: true });
        }
        const inset = insetOf(element);
        if (inset > 0) wrap.style.setProperty("--zg-li", `${inset}px`);
        else wrap.style.removeProperty("--zg-li");
        return inset;
    }

    /* สเกลจอ (objectLayer อาจถูกย่อ/ขยายด้วย transform) */
    function screenScale(element) {
        return element.offsetWidth ? element.getBoundingClientRect().width / element.offsetWidth : 1;
    }

    function setPos(label, x, y) {
        label.style.left = `calc(var(--zg-li, 0px) + (100% - var(--zg-li, 0px)) * ${x.toFixed(4)})`;
        label.style.top = `${(y * 100).toFixed(2)}%`;
    }

    function applyLabel(element, object) {

        const label = element.querySelector(".canvas-object-label");
        const pos = object.labelPos;

        if (label) {
            /* ใส่ความกว้างหลังจัดตำแหน่ง (ต้องรู้ว่าเป็นตำแหน่งอิสระหรือไม่) */
            queueMicrotask(() => applyWidth(element, object, label));
        }

        if (!label || !pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.y)) {
            element.classList.remove("zg-lbl-free");
            if (label) { label.style.left = ""; label.style.top = ""; }
            updateInset(element);
            return;
        }

        element.classList.add("zg-lbl-free");
        updateInset(element);
        setPos(label, pos.x, pos.y);
    }

    function applyAll() {
        document.querySelectorAll(".canvas-object--task[data-object-id]").forEach(element => {
            const object = findObject(element.dataset.objectId);
            if (object) applyLabel(element, object);
        });
    }

    const originalRender = renderObjects;

    renderObjects = function () {
        const result = originalRender.apply(this, arguments);
        try { applyAll(); } catch (error) { console.error("[label-drag.js]", error); }
        return result;
    };

    applyAll();


    /* เลือกตำแหน่งข้อความจากเมนู object → ใช้ตำแหน่งมาตรฐาน (ล้างตำแหน่งที่ลากไว้) */
    let menuObject = null;

    if (typeof openObjectMenu === "function") {
        const originalOpen = openObjectMenu;
        openObjectMenu = function (object) {
            menuObject = object || null;
            return originalOpen.apply(this, arguments);
        };
    }

    document.addEventListener("click", event => {
        const button = event.target instanceof Element ? event.target.closest(".object-menu-position-btn") : null;
        if (button && menuObject && menuObject.labelPos) {
            delete menuObject.labelPos;
        }
    }, true);


    /* =====================================================
       ลากข้อความ
    ===================================================== */

    let press = null;
    let drag = null;

    function countOf(value) {
        const list = typeof value === "function" ? value() : value;
        if (!list) return 0;
        return Array.isArray(list) ? list.length : (list.size || 0);
    }

    function inMultiSelection(id) {
        try {
            const precise = window.ZGObjectPrecise;
            const ids = precise && typeof precise.getSelectedIds === "function" ? precise.getSelectedIds() : [];
            if (!ids.includes(id)) return false;
            const marquee = window.ZGMarquee;
            const extras = marquee
                ? countOf(marquee.selectedImages) + countOf(marquee.selectedTexts)
                : 0;
            return ids.length + extras > 1;
        } catch (error) {
            return false;
        }
    }

    window.addEventListener("mousedown", event => {

        if (event.button !== 0 || event.shiftKey || event.altKey) return;

        const label = event.target instanceof Element ? event.target.closest(LABEL) : null;
        if (!label) return;

        /* กำลังพิมพ์อยู่ → ลากเพื่อเลือกตัวอักษรตามปกติ */
        if (document.activeElement === label) return;

        const element = label.closest(".canvas-object[data-object-id]");
        const object = element && findObject(element.dataset.objectId);
        if (!object || object.type !== "task" || object.locked) return;

        /*
            กล่องนี้อยู่ในกลุ่มที่เลือกไว้หลายชิ้น → จับที่ตัวหนังสือแล้วลาก = ย้ายทั้งกลุ่ม
            (ไม่ย้ายตำแหน่งตัวหนังสือ) — ส่งการกดต่อให้ตัวกล่องแทน เหมือนกดที่พื้นกล่อง
        */
        if (inMultiSelection(object.id)) {
            const wrap = label.parentElement && label.parentElement !== element ? label.parentElement : element;
            event.preventDefault();
            event.stopPropagation();
            wrap.dispatchEvent(new MouseEvent("mousedown", {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX: event.clientX,
                clientY: event.clientY,
                screenX: event.screenX,
                screenY: event.screenY,
                button: 0,
                buttons: 1
            }));
            return;
        }

        press = { label, element, object, x: event.clientX, y: event.clientY };

    }, true);

    window.addEventListener("mousemove", event => {

        if (!press) return;

        if (!drag) {

            if (Math.hypot(event.clientX - press.x, event.clientY - press.y) < START_PX) return;

            /* เริ่มลาก: ไม่ให้เบราว์เซอร์เลือกตัวหนังสือ / เข้าโหมดพิมพ์ */
            const selection = window.getSelection();
            if (selection) selection.removeAllRanges();
            if (document.activeElement && document.activeElement.blur) document.activeElement.blur();

            press.element.classList.add("zg-lbl-free");
            const inset = updateInset(press.element) * screenScale(press.element);
            const box = press.element.getBoundingClientRect();
            const labelRect = press.label.getBoundingClientRect();

            drag = {
                ...press,
                inset,
                offsetX: event.clientX - (labelRect.left + labelRect.width / 2),
                offsetY: event.clientY - (labelRect.top + labelRect.height / 2),
                halfW: labelRect.width / 2 / Math.max(1, box.width - inset),
                halfH: labelRect.height / 2 / Math.max(1, box.height),
                before: press.object.labelPos ? { ...press.object.labelPos } : null,
                beforePosition: press.object.textPosition,
                guides: [],
                tip: null
            };

            document.body.classList.add("zg-lbl-dragging");
            press.element.classList.add("zg-lbl-dragging-box", "zg-lbl-free");

            drag.tip = document.createElement("div");
            drag.tip.className = "zg-lbl-tip";
            document.body.appendChild(drag.tip);

            ["v", "h"].forEach(kind => {
                const guide = document.createElement("div");
                guide.className = "zg-lbl-guide";
                guide.dataset.kind = kind;
                guide.style.display = "none";
                guide.style.setProperty("--zg-li", `${inset / Math.max(0.01, screenScale(press.element))}px`);
                press.element.appendChild(guide);
                drag.guides.push(guide);
            });
        }

        event.preventDefault();

        const box = drag.element.getBoundingClientRect();
        const minX = Math.min(0.5, drag.halfW + 0.02), minY = Math.min(0.5, drag.halfH + 0.02);

        let x = (event.clientX - drag.offsetX - box.left - drag.inset) / Math.max(1, box.width - drag.inset);
        let y = (event.clientY - drag.offsetY - box.top) / Math.max(1, box.height);

        /* v8: อิสระ — ลากออกนอกกล่องได้ (กันหลุดไกลเกินไปเท่านั้น) */
        x = Math.min(2.5, Math.max(-1.5, x));
        y = Math.min(2.5, Math.max(-1.5, y));

        /* กด Alt ค้าง = ดูดเข้าตำแหน่งมาตรฐาน (9 จุด) — ปกติไม่ดูด */
        let snapIndex = -1;

        if (event.altKey) {
            const targets = GRID.map(([gx, gy]) => [
                gx === 0 ? minX : gx === 1 ? 1 - minX : 0.5,
                gy === 0 ? minY : gy === 1 ? 1 - minY : 0.5
            ]);
            targets.forEach(([tx, ty], index) => {
                if (Math.abs(x - tx) < SNAP * 1.5 && Math.abs(y - ty) < SNAP * 1.5) snapIndex = index;
            });
            if (snapIndex >= 0) [x, y] = targets[snapIndex];
        }

        drag.element.classList.toggle("zg-lbl-out", isOutside(x, y, drag.halfW, drag.halfH));

        drag.x = x;
        drag.y = y;
        drag.snapIndex = snapIndex;

        setPos(drag.label, x, y);

        /* เส้นช่วยกึ่งกลาง */
        drag.guides.forEach(guide => {
            if (guide.dataset.kind === "v") {
                const show = x === 0.5;
                guide.style.display = show ? "" : "none";
                guide.style.left = "calc(var(--zg-li, 0px) / 2 + 50%)"; guide.style.top = "0"; guide.style.bottom = "0"; guide.style.width = "1px";
            } else {
                const show = y === 0.5;
                guide.style.display = show ? "" : "none";
                guide.style.top = "50%"; guide.style.left = "0"; guide.style.right = "0"; guide.style.height = "1px";
            }
        });

        drag.tip.textContent = snapIndex >= 0 ? `📍 ${POSITION_NAMES[snapIndex]}` : "✋ ลากวางตรงไหนก็ได้ (ออกนอกกล่องได้) · กด Alt = ดูดเข้าตำแหน่ง";
        drag.tip.style.left = `${event.clientX}px`;
        drag.tip.style.top = `${event.clientY}px`;

    }, true);

    window.addEventListener("mouseup", () => {

        const state = drag;

        press = null;
        drag = null;

        if (!state) return;

        document.body.classList.remove("zg-lbl-dragging");
        state.element.classList.remove("zg-lbl-dragging-box");
        state.guides.forEach(guide => guide.remove());
        if (state.tip) state.tip.remove();

        /* ไม่ให้ object-text.js เข้าโหมดพิมพ์จากคลิกนี้ */
        const swallow = event => { event.stopPropagation(); event.preventDefault(); };
        window.addEventListener("click", swallow, { capture: true, once: true });
        setTimeout(() => window.removeEventListener("click", swallow, true), 0);

        if (!Number.isFinite(state.x)) return;

        if (state.snapIndex >= 0) {
            /* ตรงตำแหน่งมาตรฐาน → ใช้ตัวเลือกเดิมของ app.js */
            delete state.object.labelPos;
            state.object.textPosition = state.snapIndex;
        } else {
            state.object.labelPos = { x: Number(state.x.toFixed(4)), y: Number(state.y.toFixed(4)) };
        }

        renderObjects();
        record();

    }, true);


    /* =====================================================
       ยืดช่องพิมพ์ซ้าย-ขวา
    ===================================================== */

    const handles = ["l", "r"].map(side => {
        const handle = document.createElement("div");
        handle.className = "zg-lbl-handle";
        handle.dataset.side = side;
        handle.title = "ลากเพื่อยืดช่องพิมพ์ · ดับเบิลคลิก = กว้างอัตโนมัติ";
        document.body.appendChild(handle);
        return handle;
    });

    let target = null;
    let resizing = null;

    function pickTarget() {

        if (resizing) return resizing;

        const focused = document.activeElement instanceof Element ? document.activeElement.closest(LABEL) : null;
        const label = focused || document.querySelector(".canvas-object--task.zg-obj-selected .canvas-object-label");
        if (!label) return null;

        const element = label.closest(".canvas-object[data-object-id]");
        const object = element && findObject(element.dataset.objectId);
        if (!object || object.locked) return null;
        /* เลือกไว้หลายชิ้น (ยังไม่ได้คลิกเข้าไปพิมพ์) → ไม่ต้องโชว์ที่จับยืดช่องพิมพ์ */
        if (!focused && inMultiSelection(object.id)) return null;
        /* ข้อความแนวตั้ง (หมุนแล้ว) → ที่จับบน-ล่าง ยืดความยาวบรรทัด */
        const vertical = isRotated(object) || label.classList.contains("zg-rot-90") || label.classList.contains("zg-rot-270");
        return { label, element, object, vertical };
    }

    (function follow() {

        target = pickTarget();

        if (!target || drag || document.body.classList.contains("zg-exporting")) {
            handles.forEach(handle => { handle.style.display = "none"; });
        } else {
            const rect = target.label.getBoundingClientRect();
            const box = target.element.getBoundingClientRect();
            const visible = rect.width > 0 && rect.bottom > box.top && rect.top < box.bottom;
            handles.forEach(handle => {
                handle.style.display = visible ? "block" : "none";
                handle.classList.toggle("zg-lbl-handle--v", target.vertical);
                handle.title = target.vertical
                    ? "ลากเพื่อยืดข้อความแนวตั้ง (ขึ้น-ลง) · ดับเบิลคลิก = ยาวอัตโนมัติ"
                    : "ลากเพื่อยืดช่องพิมพ์ · ดับเบิลคลิก = กว้างอัตโนมัติ";
                const first = handle.dataset.side === "l";
                if (target.vertical) {
                    handle.style.left = `${rect.left + rect.width / 2}px`;
                    handle.style.top = `${first ? rect.top - 3 : rect.bottom + 3}px`;
                } else {
                    handle.style.left = `${first ? rect.left - 3 : rect.right + 3}px`;
                    handle.style.top = `${rect.top + rect.height / 2}px`;
                }
            });
        }

        requestAnimationFrame(follow);
    })();

    /* ดักที่ window (capture) ก่อนระบบเลือก object จะล้างการเลือก */
    window.addEventListener("mousedown", event => {

        const handle = event.target instanceof Element ? event.target.closest(".zg-lbl-handle") : null;
        if (!handle) return;

        /* ไม่ให้ช่องพิมพ์หลุดโฟกัส และไม่ให้ระบบอื่นเข้าใจว่ากดที่ตาราง */
        event.preventDefault();
        event.stopPropagation();

        if (event.button !== 0 || !target) return;

        {

            const inset = updateInset(target.element) * screenScale(target.element);
            const box = target.element.getBoundingClientRect();
            const rect = target.label.getBoundingClientRect();
            const align = target.element.classList.contains("zg-lbl-free") ? "c" : alignOf(target.element);

            const wrap = target.element.querySelector(".canvas-object-label-wrap");
            const vAlign = target.element.classList.contains("zg-lbl-free") ? "m" : ((/align-([tmb])/.exec(target.element.className) || [])[1] || "m");

            resizing = {
                ...target,
                side: handle.dataset.side,
                align,
                vAlign,
                startX: event.clientX,
                startY: event.clientY,
                startW: rect.width,
                startH: rect.height,
                boxW: Math.max(1, box.width - inset),
                boxH: Math.max(1, (wrap || target.element).getBoundingClientRect().height),
                before: target.vertical ? target.object.labelHeight : target.object.labelWidth,
                tip: document.createElement("div")
            };

            resizing.tip.className = "zg-lbl-width-tip";
            document.body.appendChild(resizing.tip);
            document.body.classList.add("zg-lbl-dragging");
        }
    }, true);

    window.addEventListener("dblclick", event => {
        const handle = event.target instanceof Element ? event.target.closest(".zg-lbl-handle") : null;
        if (!handle) return;
        event.preventDefault();
        event.stopPropagation();
        if (!target) return;
        if (target.vertical) delete target.object.labelHeight;
        else delete target.object.labelWidth;
        applyAll();
        record();
    }, true);

    ["pointerdown", "click"].forEach(type => window.addEventListener(type, event => {
        if (event.target instanceof Element && event.target.closest(".zg-lbl-handle")) event.stopPropagation();
    }, true));

    window.addEventListener("mousemove", event => {

        if (!resizing) return;

        event.preventDefault();

        /* ข้อความแนวตั้ง: ยืดขึ้น-ลง (ความยาวบรรทัด = ความสูง) */
        if (resizing.vertical) {
            let dy = event.clientY - resizing.startY;
            if (resizing.side === "l") dy = -dy;
            const growV = resizing.vAlign === "m" ? dy * 2 : dy;
            const fitV = resizing.boxH - 8;
            let length = Math.max(24, Math.min(resizing.boxH * MAX_RATIO, resizing.startH + growV));
            if (Math.abs(length - fitV) < 6) length = fitV;
            resizing.width = length;
            resizing.element.classList.toggle("zg-lbl-over", length > resizing.boxH);
            resizing.label.classList.add("zg-lbl-wide");
            resizing.label.style.width = "";
            resizing.label.style.height = `calc(100% * ${(length / resizing.boxH).toFixed(4)})`;
            resizing.tip.textContent = length === fitV ? "↕ เต็มกล่อง"
                : length > resizing.boxH ? `↕ ยื่นออกนอกกล่อง (${Math.round(length / resizing.boxH * 100)}%)`
                : `↕ ${Math.round(length / resizing.boxH * 100)}% ของกล่อง`;
            resizing.tip.style.left = `${event.clientX}px`;
            resizing.tip.style.top = `${event.clientY}px`;
            return;
        }

        let dx = event.clientX - resizing.startX;
        if (resizing.side === "l") dx = -dx;

        /* ข้อความอยู่กลาง → ยืดออกทั้งสองข้างเท่ากัน */
        const grow = resizing.align === "c" ? dx * 2 : dx;
        const fit = resizing.boxW - 8;
        let width = Math.max(24, Math.min(resizing.boxW * MAX_RATIO, resizing.startW + grow));
        /* ใกล้ขอบกล่อง → ดูดให้พอดีกล่อง (ลากเลยออกไปอีก = ยื่นออกนอกกล่อง) */
        if (Math.abs(width - fit) < 6) width = fit;

        resizing.width = width;
        resizing.element.classList.toggle("zg-lbl-over", width > resizing.boxW);
        resizing.label.classList.add("zg-lbl-wide");
        resizing.label.style.width = `calc((100% - var(--zg-li, 0px)) * ${(width / resizing.boxW).toFixed(4)})`;
        resizing.label.style.textAlign = resizing.align === "l" ? "left" : resizing.align === "r" ? "right" : "center";

        resizing.tip.textContent = width === fit ? "↔ เต็มกล่อง"
            : width > resizing.boxW ? `↔ ยื่นออกนอกกล่อง (${Math.round(width / resizing.boxW * 100)}%)`
            : `↔ ${Math.round(width / resizing.boxW * 100)}% ของกล่อง`;
        resizing.tip.style.left = `${event.clientX}px`;
        resizing.tip.style.top = `${event.clientY}px`;

    }, true);

    window.addEventListener("mouseup", () => {

        const state = resizing;
        if (!state) return;

        resizing = null;
        state.tip.remove();
        document.body.classList.remove("zg-lbl-dragging");

        if (!Number.isFinite(state.width)) return;

        if (state.vertical) state.object.labelHeight = Number(Math.min(MAX_RATIO, state.width / state.boxH).toFixed(4));
        else state.object.labelWidth = Number(Math.min(MAX_RATIO, state.width / state.boxW).toFixed(4));

        /* ไม่วาดกล่องใหม่ทั้งหมด → ช่องที่กำลังพิมพ์ไม่หลุดโฟกัส */
        applyAll();
        record();

    }, true);


    window.ZGLabelDrag = { apply: applyAll };

})();
