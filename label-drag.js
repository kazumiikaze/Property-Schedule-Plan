"use strict";

/* =========================================================
   LABEL-DRAG.JS — ลากย้ายข้อความในกล่องงานด้วยเมาส์
   - กดที่ตัวหนังสือในกล่องงานแล้วลาก = ย้ายข้อความไปตรงไหนก็ได้ในกล่อง
     (คลิกเฉย ๆ ไม่ลาก = พิมพ์แก้ข้อความเหมือนเดิม)
   - ใกล้ 9 ตำแหน่งมาตรฐาน (ซ้าย/กลาง/ขวา × บน/กลาง/ล่าง) → ดูดเข้าที่ให้เอง
     และตั้ง "ตำแหน่งข้อความ" ในเมนู object ให้ตรงกัน
   - ตำแหน่งเก็บเป็นสัดส่วนของกล่อง → ยืด/ย่อ/ซูมแล้วข้อความยังอยู่ที่เดิม
   - เลือกตำแหน่งข้อความจากเมนู object = กลับไปใช้ตำแหน่งมาตรฐาน
   - ยืดช่องพิมพ์ซ้าย-ขวา: เลือกกล่อง / กำลังพิมพ์ → มีที่จับ ◂ ▸ สองข้างข้อความ
     ลากเพื่อกว้างขึ้น/แคบลง (พิมพ์ได้ยาวขึ้นก่อนขึ้นบรรทัดใหม่) · ดับเบิลคลิกที่จับ = กว้างอัตโนมัติ
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

    function applyWidth(element, object, label) {
        const width = Number(object.labelWidth);
        if (width > 0) {
            label.classList.add("zg-lbl-wide");
            label.style.width = `calc((100% - var(--zg-li, 0px)) * ${Math.min(1, width).toFixed(4)})`;
            const align = element.classList.contains("zg-lbl-free") ? "c" : alignOf(element);
            label.style.textAlign = align === "l" ? "left" : align === "r" ? "right" : "center";
        } else {
            label.classList.remove("zg-lbl-wide");
            label.style.width = "";
            label.style.textAlign = "";
        }
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

        x = Math.min(1 - minX, Math.max(minX, x));
        y = Math.min(1 - minY, Math.max(minY, y));

        /* ดูดเข้าตำแหน่งมาตรฐาน */
        const targets = GRID.map(([gx, gy]) => [
            gx === 0 ? minX : gx === 1 ? 1 - minX : 0.5,
            gy === 0 ? minY : gy === 1 ? 1 - minY : 0.5
        ]);

        let snapIndex = -1;
        targets.forEach(([tx, ty], index) => {
            if (Math.abs(x - tx) < SNAP && Math.abs(y - ty) < SNAP) snapIndex = index;
        });

        if (snapIndex >= 0) {
            [x, y] = targets[snapIndex];
        } else {
            if (Math.abs(x - 0.5) < SNAP / 2) x = 0.5;
            if (Math.abs(y - 0.5) < SNAP / 2) y = 0.5;
        }

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

        drag.tip.textContent = snapIndex >= 0 ? `📍 ${POSITION_NAMES[snapIndex]}` : "✋ ลากวางตรงไหนก็ได้";
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
        /* ข้อความแนวตั้ง (หมุนแล้ว) → ไม่ใช้ที่จับยืดซ้าย-ขวา */
        if (label.classList.contains("zg-rot-90") || label.classList.contains("zg-rot-270")) return null;
        return { label, element, object };
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
                handle.style.left = `${handle.dataset.side === "l" ? rect.left - 3 : rect.right + 3}px`;
                handle.style.top = `${rect.top + rect.height / 2}px`;
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

            resizing = {
                ...target,
                side: handle.dataset.side,
                align,
                startX: event.clientX,
                startW: rect.width,
                boxW: Math.max(1, box.width - inset),
                before: target.object.labelWidth,
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
        delete target.object.labelWidth;
        applyAll();
        record();
    }, true);

    ["pointerdown", "click"].forEach(type => window.addEventListener(type, event => {
        if (event.target instanceof Element && event.target.closest(".zg-lbl-handle")) event.stopPropagation();
    }, true));

    window.addEventListener("mousemove", event => {

        if (!resizing) return;

        event.preventDefault();

        let dx = event.clientX - resizing.startX;
        if (resizing.side === "l") dx = -dx;

        /* ข้อความอยู่กลาง → ยืดออกทั้งสองข้างเท่ากัน */
        const grow = resizing.align === "c" ? dx * 2 : dx;
        const maxW = resizing.boxW - 8;
        const width = Math.max(24, Math.min(maxW, resizing.startW + grow));

        resizing.width = width;
        resizing.label.classList.add("zg-lbl-wide");
        resizing.label.style.width = `calc((100% - var(--zg-li, 0px)) * ${(width / resizing.boxW).toFixed(4)})`;
        resizing.label.style.textAlign = resizing.align === "l" ? "left" : resizing.align === "r" ? "right" : "center";

        resizing.tip.textContent = width >= maxW - 1 ? "↔ เต็มกล่อง" : `↔ ${Math.round(width / resizing.boxW * 100)}% ของกล่อง`;
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

        state.object.labelWidth = Number(Math.min(1, state.width / state.boxW).toFixed(4));

        /* ไม่วาดกล่องใหม่ทั้งหมด → ช่องที่กำลังพิมพ์ไม่หลุดโฟกัส */
        applyAll();
        record();

    }, true);


    window.ZGLabelDrag = { apply: applyAll };

})();
