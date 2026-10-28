"use strict";

/* =========================================================
   CHIP-RESIZE.JS — ยืด / ย่อ กล่องป้ายเส้นวันที่ (ชื่อ + วันที่ ในช่องเส้นวันที่)
   - คลิกป้าย (เลือก) → มีที่จับ 3 จุด: ขวา · ล่าง · มุมขวาล่าง (ซ้ายก็ได้ — กว้างออกเท่ากันทั้งสองข้าง)
       ซ้าย / ขวา = กว้างขึ้น / แคบลง (ป้ายยังอยู่กึ่งกลางเส้นวันที่)
       ล่าง       = สูงขึ้น / เตี้ยลง (ข้อความอยู่กลางกล่อง)
       มุม        = ทั้งกว้างและสูง
     ดับเบิลคลิกที่จับ = ขนาดเริ่มต้น
   - เก็บใน object.width (เดิม) + object.chipHeight → บันทึกไปกับแผน / เทมเพลต / ชุดสำเร็จ · Ctrl+Z ได้
   - ไม่แก้ app.js — โหลดหลัง object-precise.js
========================================================= */

(function () {

    if (typeof renderObjects !== "function" || typeof timelineObjects === "undefined") return;

    const DEFAULT_W = 130;
    const MIN_W = 60;
    const MAX_W = 600;
    const MIN_H = 30;
    const MAX_H = 240;

    const style = document.createElement("style");
    style.textContent = `
.zg-chip-handle {
    position: fixed; z-index: 26500; display: none; box-sizing: border-box;
    background: #ffffff; border: 2px solid #2e8b57; border-radius: 4px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, .25);
}
.zg-chip-handle:hover { background: #e9f6ee; }
.zg-chip-handle[data-dir="e"], .zg-chip-handle[data-dir="w"] { width: 10px; height: 22px; margin: -11px 0 0 -5px; cursor: ew-resize; }
.zg-chip-handle[data-dir="s"] { width: 22px; height: 10px; margin: -5px 0 0 -11px; cursor: ns-resize; }
.zg-chip-handle[data-dir="se"] { width: 12px; height: 12px; margin: -6px 0 0 -6px; border-radius: 50%; cursor: nwse-resize; }
.zg-chip-tip {
    position: fixed; z-index: 30000; pointer-events: none; padding: 3px 8px; border-radius: 6px;
    background: #1e2924; color: #fff; font-size: 11px; white-space: nowrap; transform: translate(12px, 14px);
}
body.zg-chip-resizing, body.zg-chip-resizing * { user-select: none !important; }
body.zg-exporting .zg-chip-handle, body.zg-exporting .zg-chip-tip { display: none !important; }
`;
    document.head.appendChild(style);

    function findObject(id) {
        return timelineObjects.find(object => object.id === id) || null;
    }

    function record() {
        if (window.ZGHistory && typeof window.ZGHistory.record === "function") {
            try { window.ZGHistory.record(); } catch (error) { /* ไม่เป็นไร */ }
        }
    }

    /* ความสูงที่ตั้งไว้ → ใส่ให้กล่องทุกครั้งที่วาดใหม่ */
    function applyHeights() {
        document.querySelectorAll(".canvas-object--dateline-chip[data-object-id]").forEach(chip => {
            const object = findObject(chip.dataset.objectId);
            const h = object ? Number(object.chipHeight) : 0;
            chip.style.minHeight = h > 0 ? `${h}px` : "";
            chip.style.boxSizing = h > 0 ? "border-box" : "";
        });
    }

    const originalRender = renderObjects;
    renderObjects = function () {
        const result = originalRender.apply(this, arguments);
        try { applyHeights(); } catch (error) { console.error("[chip-resize.js]", error); }
        return result;
    };
    applyHeights();


    /* ---------- ที่จับ ---------- */

    const handles = ["w", "e", "s", "se"].map(dir => {
        const handle = document.createElement("div");
        handle.className = "zg-chip-handle";
        handle.dataset.dir = dir;
        handle.title = dir === "s" ? "ลากเพื่อปรับความสูงกล่อง · ดับเบิลคลิก = ขนาดเริ่มต้น"
            : dir === "se" ? "ลากเพื่อปรับทั้งกว้างและสูง · ดับเบิลคลิก = ขนาดเริ่มต้น"
            : "ลากเพื่อปรับความกว้างกล่อง · ดับเบิลคลิก = ขนาดเริ่มต้น";
        document.body.appendChild(handle);
        return handle;
    });

    let target = null;
    let drag = null;

    function selectedChip() {
        if (drag) return drag.chip.isConnected ? drag.chip : null;
        const chip = document.querySelector(".canvas-object--dateline-chip.zg-obj-selected[data-object-id]");
        if (!chip) return null;
        const object = findObject(chip.dataset.objectId);
        if (!object || object.locked) return null;
        /* เลือกหลายชิ้น → ไม่โชว์ (ลากย้ายทั้งกลุ่มแทน) */
        const P = window.ZGObjectPrecise;
        if (P && P.getSelectedIds && P.getSelectedIds().length > 1) return null;
        return chip;
    }

    (function follow() {
        const chip = selectedChip();
        if (!chip || document.body.classList.contains("zg-exporting")) {
            handles.forEach(handle => { handle.style.display = "none"; });
            target = null;
        } else {
            target = chip;
            const r = chip.getBoundingClientRect();
            const view = (document.getElementById("bracketViewport") || chip.parentElement).getBoundingClientRect();
            const visible = r.width > 0 && r.right > view.left && r.left < view.right && r.bottom > view.top && r.top < view.bottom;
            handles.forEach(handle => {
                const dir = handle.dataset.dir;
                handle.style.display = visible ? "block" : "none";
                handle.style.left = `${dir === "w" ? r.left : dir === "s" ? r.left + r.width / 2 : r.right}px`;
                handle.style.top = `${dir === "e" || dir === "w" ? r.top + r.height / 2 : r.bottom}px`;
            });
        }
        requestAnimationFrame(follow);
    })();

    window.addEventListener("pointerdown", event => {

        const handle = event.target instanceof Element ? event.target.closest(".zg-chip-handle") : null;
        if (!handle) return;

        event.preventDefault();
        event.stopPropagation();

        if (event.button !== 0 || !target) return;

        const object = findObject(target.dataset.objectId);
        if (!object) return;

        const rect = target.getBoundingClientRect();
        const scale = target.offsetWidth ? rect.width / target.offsetWidth : 1;

        drag = {
            chip: target,
            object,
            dir: handle.dataset.dir,
            x: event.clientX,
            y: event.clientY,
            w: target.offsetWidth,
            h: target.offsetHeight,
            centre: target.offsetLeft + target.offsetWidth / 2,
            scale: scale || 1,
            tip: document.createElement("div")
        };

        drag.tip.className = "zg-chip-tip";
        document.body.appendChild(drag.tip);
        document.body.classList.add("zg-chip-resizing");
        try { handle.setPointerCapture(event.pointerId); } catch (error) { /* ไม่เป็นไร */ }

    }, true);

    ["mousedown", "click"].forEach(type => window.addEventListener(type, event => {
        if (event.target instanceof Element && event.target.closest(".zg-chip-handle")) {
            event.preventDefault();
            event.stopPropagation();
        }
    }, true));

    window.addEventListener("pointermove", event => {

        if (!drag) return;

        event.preventDefault();

        const dx = (event.clientX - drag.x) / drag.scale;
        const dy = (event.clientY - drag.y) / drag.scale;
        const dir = drag.dir;

        if (dir !== "s") {
            /* กว้างออกทั้งสองข้างเท่ากัน → ยังอยู่กึ่งกลางเส้นวันที่ */
            const grow = (dir === "w" ? -dx : dx) * 2;
            drag.width = Math.round(Math.max(MIN_W, Math.min(MAX_W, drag.w + grow)));
            drag.chip.style.width = `${drag.width}px`;
            drag.chip.style.left = `${drag.centre - drag.width / 2}px`;
        }

        if (dir === "s" || dir === "se") {
            drag.height = Math.round(Math.max(MIN_H, Math.min(MAX_H, drag.h + dy)));
            drag.chip.style.boxSizing = "border-box";
            drag.chip.style.minHeight = `${drag.height}px`;
        }

        const w = drag.width || drag.w;
        const h = drag.height || drag.h;
        drag.tip.textContent = `↔ ${w} × ↕ ${h}`;
        drag.tip.style.left = `${event.clientX}px`;
        drag.tip.style.top = `${event.clientY}px`;

    }, true);

    function endDrag() {
        const state = drag;
        if (!state) return;
        drag = null;
        state.tip.remove();
        document.body.classList.remove("zg-chip-resizing");
        if (!state.width && !state.height) return;
        if (state.width) state.object.width = state.width;
        if (state.height) state.object.chipHeight = state.height;
        renderObjects();
        record();
    }

    window.addEventListener("pointerup", endDrag, true);
    window.addEventListener("pointercancel", endDrag, true);

    window.addEventListener("dblclick", event => {
        const handle = event.target instanceof Element ? event.target.closest(".zg-chip-handle") : null;
        if (!handle) return;
        event.preventDefault();
        event.stopPropagation();
        if (!target) return;
        const object = findObject(target.dataset.objectId);
        if (!object) return;
        if (handle.dataset.dir !== "s") object.width = DEFAULT_W;
        if (handle.dataset.dir !== "e" && handle.dataset.dir !== "w") delete object.chipHeight;
        renderObjects();
        record();
    }, true);

    window.ZGChipResize = { apply: applyHeights };

})();
