"use strict";

/* =========================================================
   OBJECT-GRAB.JS — จับ / ลาก / ยืด object ให้ง่ายขึ้น

   1) ที่จับใหญ่ขึ้น
      - กล่องงาน: ที่จับซ้าย/ขวากว้าง 12px, บน/ล่างสูง 8px
        อยู่ "ด้านใน" กล่อง (เดิมครึ่งหนึ่งอยู่นอกกล่องแล้วถูกตัด เหลือแค่ 4px)
        กล่องแคบ/เตี้ย → ที่จับย่อลงอัตโนมัติ ให้ยังเหลือที่ลากย้าย
      - ป้ายเส้นวันที่ / เส้นแนวนอน: ที่จับปลายกว้างขึ้น
   2) เอาเมาส์ชี้กล่อง → เห็นขีดที่จับ ซ้าย/ขวา/บน/ล่าง
      ชี้ตรงที่จับ → ขีดเป็นสีเขียว (รู้ว่ากดยืดได้)
   3) เส้นวันที่ / เส้นแนวตั้ง / เส้นแนวนอน มีโซนจับรอบเส้น 12–16px
      เมาส์เข้าใกล้ → เส้นไฮไลต์
   4) ต้องลากเกิน 5px (ยืดเกิน 2px) ถึงจะเริ่มขยับ
      → คลิกเปิดเมนูแล้วมือสั่นนิดหน่อย ของไม่เลื่อน
   5) ระหว่างลาก/ยืด มีป้ายบอกวันที่ข้างเมาส์
      เช่น "15 ก.ย. 2569 → 30 ก.ย. 2569 · 16 วัน"

   ไม่แก้ app.js / style.css — โหลดหลัง app.js และ hline-lock.js
========================================================= */

(function () {

    if (typeof renderObjects !== "function" || typeof handleObjectDragMove !== "function") {

        console.error("[object-grab.js] ไม่พบฟังก์ชันของ app.js");

        return;
    }

    /* ต้องลากเกินกี่ px ถึงเริ่มขยับ */
    const MOVE_THRESHOLD = 5;
    const RESIZE_THRESHOLD = 2;

    /* กล่องเล็กกว่านี้ → ที่จับย่อลง */
    const NARROW_PX = 64;
    const SHORT_PX = 30;


    /* =====================================================
       STYLE
    ===================================================== */

    const style = document.createElement("style");

    style.textContent = `
/* ---------- 1) ที่จับกล่องงาน: อยู่ในกล่อง ไม่ถูกตัด ---------- */
.canvas-object--task > .canvas-object-handle { z-index: 3; }
.canvas-object--task > .canvas-object-handle--start { left: 0; width: 12px; }
.canvas-object--task > .canvas-object-handle--end { right: 0; width: 12px; }
.canvas-object--task > .canvas-object-handle--top { top: 0; height: 8px; left: 12px; right: 12px; }
.canvas-object--task > .canvas-object-handle--bottom { bottom: 0; height: 8px; left: 12px; right: 12px; }
.canvas-object--task.zg-grab-narrow > .canvas-object-handle--start,
.canvas-object--task.zg-grab-narrow > .canvas-object-handle--end { width: 7px; }
.canvas-object--task.zg-grab-narrow > .canvas-object-handle--top,
.canvas-object--task.zg-grab-narrow > .canvas-object-handle--bottom { left: 7px; right: 7px; }
.canvas-object--task.zg-grab-short > .canvas-object-handle--top,
.canvas-object--task.zg-grab-short > .canvas-object-handle--bottom { height: 5px; }

/* ป้ายเส้นวันที่ / เส้นแนวนอน: ที่จับปลายกว้างขึ้น */
.canvas-object--dateline-chip > .canvas-object-handle--start { left: -7px; width: 14px; z-index: 3; }
.canvas-object--dateline-chip > .canvas-object-handle--end { right: -7px; width: 14px; z-index: 3; }
.canvas-object--hline > .canvas-object-handle--start { left: -8px; width: 16px; top: -9px; z-index: 3; }
.canvas-object--hline > .canvas-object-handle--end { right: -8px; width: 16px; top: -9px; z-index: 3; }

/* ---------- 2) ขีดที่จับ (เห็นตอนชี้) ---------- */
.canvas-object--task > .canvas-object-handle::after,
.canvas-object--dateline-chip > .canvas-object-handle::after,
.canvas-object--hline > .canvas-object-handle::after {
    content: "";
    position: absolute;
    border-radius: 3px;
    background: rgba(255, 255, 255, .96);
    box-shadow: 0 0 0 1px rgba(30, 41, 36, .45), 0 1px 3px rgba(0, 0, 0, .25);
    opacity: 0;
    transition: opacity .12s ease, background-color .12s ease;
    pointer-events: none;
}
.canvas-object--task > .canvas-object-handle--start::after,
.canvas-object--task > .canvas-object-handle--end::after,
.canvas-object--dateline-chip > .canvas-object-handle--start::after,
.canvas-object--dateline-chip > .canvas-object-handle--end::after {
    top: 50%;
    width: 4px;
    height: min(60%, 22px);
    min-height: 8px;
    transform: translateY(-50%);
}
.canvas-object--task > .canvas-object-handle--start::after { left: 3px; }
.canvas-object--task > .canvas-object-handle--end::after { right: 3px; }
.canvas-object--task.zg-grab-narrow > .canvas-object-handle--start::after { left: 1px; width: 3px; }
.canvas-object--task.zg-grab-narrow > .canvas-object-handle--end::after { right: 1px; width: 3px; }
.canvas-object--dateline-chip > .canvas-object-handle--start::after { left: 5px; }
.canvas-object--dateline-chip > .canvas-object-handle--end::after { right: 5px; }
.canvas-object--task > .canvas-object-handle--top::after,
.canvas-object--task > .canvas-object-handle--bottom::after {
    left: 50%;
    width: 22px;
    height: 4px;
    transform: translateX(-50%);
}
.canvas-object--task > .canvas-object-handle--top::after { top: 2px; }
.canvas-object--task > .canvas-object-handle--bottom::after { bottom: 2px; }
.canvas-object--task.zg-grab-short > .canvas-object-handle--top::after { top: 1px; height: 3px; }
.canvas-object--task.zg-grab-short > .canvas-object-handle--bottom::after { bottom: 1px; height: 3px; }
.canvas-object--hline > .canvas-object-handle--start::after,
.canvas-object--hline > .canvas-object-handle--end::after {
    top: 5px;
    left: 50%;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    transform: translateX(-50%);
}

.canvas-object--task:hover > .canvas-object-handle::after,
.canvas-object--dateline-chip:hover > .canvas-object-handle::after,
.canvas-object--hline:hover > .canvas-object-handle::after,
.zg-grab-dragging > .canvas-object-handle::after { opacity: 1; }

.canvas-object > .canvas-object-handle:hover::after,
.canvas-object > .canvas-object-handle.zg-grab-active::after {
    opacity: 1;
    background: #3a8a4f;
    box-shadow: 0 0 0 1px #ffffff, 0 1px 4px rgba(0, 0, 0, .3);
}

/* ---------- 3) เส้น: โซนจับกว้างขึ้น + ไฮไลต์ ---------- */
.canvas-object--dateline-line::before {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    left: -7px;
    width: 12px;
    border-radius: 8px;
    transition: background-color .12s ease;
}
.canvas-object--vline::before {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    left: -2px;
    right: -2px;
    border-radius: 8px;
    transition: background-color .12s ease;
}
.canvas-object--hline::before {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    top: -9px;
    height: 16px;
    border-radius: 8px;
    transition: background-color .12s ease;
}
.canvas-object--dateline-line:hover::before,
.canvas-object--vline:hover::before,
.canvas-object--hline:hover::before,
.zg-grab-dragging.canvas-object--dateline-line::before,
.zg-grab-dragging.canvas-object--vline::before,
.zg-grab-dragging.canvas-object--hline::before { background: rgba(58, 138, 79, .16); }
.canvas-object--hline:hover { cursor: grab; }

/* ---------- 5) ป้ายบอกค่าระหว่างลาก ---------- */
.zg-drag-tip {
    position: fixed;
    z-index: 33000;
    padding: 5px 10px;
    border-radius: 8px;
    background: rgba(30, 41, 36, .92);
    color: #ffffff;
    font: 12px/1.4 Arial, Helvetica, sans-serif;
    white-space: nowrap;
    pointer-events: none;
    box-shadow: 0 4px 14px rgba(0, 0, 0, .2);
    display: none;
}
.zg-drag-tip.is-show { display: block; }
.zg-drag-tip b { color: #9fe0b0; font-weight: 700; }

body.zg-exporting .canvas-object-handle::after,
body.zg-exporting .canvas-object--dateline-line::before,
body.zg-exporting .canvas-object--vline::before,
body.zg-exporting .canvas-object--hline::before,
body.zg-exporting .zg-drag-tip { display: none !important; }
`;

    document.head.appendChild(style);


    /* =====================================================
       1) ติดป้ายกล่องแคบ / เตี้ย หลังวาด
    ===================================================== */

    function markSizes() {

        timelineObjects.forEach(object => {

            if (object.type !== "task") return;

            const width = Math.max(Number(object.width) || 0, 24);
            const height = Math.max(Number(object.height) || 0, 18);

            document
                .querySelectorAll(`#objectLayer .canvas-object--task[data-object-id="${CSS.escape(object.id)}"]`)
                .forEach(element => {
                    element.classList.toggle("zg-grab-narrow", width < NARROW_PX);
                    element.classList.toggle("zg-grab-short", height < SHORT_PX);
                });
        });

        markDragging();
    }

    const originalRender = renderObjects;

    renderObjects = function () {

        const result = originalRender.apply(this, arguments);

        try {
            markSizes();
        } catch (error) {
            console.error("[object-grab.js]", error);
        }

        return result;
    };


    /* =====================================================
       5) ป้ายบอกวันที่
    ===================================================== */

    const tip = document.createElement("div");

    tip.className = "zg-drag-tip";

    document.body.appendChild(tip);

    let tipTimer = null;

    function fmt(date) {

        return typeof formatThaiDateShort === "function"
            ? formatThaiDateShort(date)
            : `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
    }

    function addDaysSafe(date, days) {

        const next = new Date(date);

        next.setDate(next.getDate() + days);

        return next;
    }

    /* ข้อความบอกตำแหน่งของ object (ใช้ทั้งตอนลาก และ object-precise.js) */
    function describe(object) {

        if (!object || !(pxPerDay > 0) || !timelineStartDate) return "";

        if (object.type === "dateline" || object.type === "vline") {

            const date = object.linkedHeaderDate || timelineStartDate;

            return `📅 <b>${fmt(date)}</b>`;
        }

        if (object.type === "task" || object.type === "hline") {

            const startOffset = Math.round(object.x / pxPerDay);
            const days = Math.max(1, Math.round(object.width / pxPerDay));

            const start = addDaysSafe(timelineStartDate, startOffset);
            const end = addDaysSafe(start, days - 1);

            return `${fmt(start)} → ${fmt(end)} · <b>${days} วัน</b>`;
        }

        return "";
    }

    function showTip(html, clientX, clientY, hideAfterMs) {

        if (!html) {
            hideTip();
            return;
        }

        tip.innerHTML = html;
        tip.classList.add("is-show");

        const width = tip.offsetWidth;
        const height = tip.offsetHeight;

        let left = clientX + 16;
        let top = clientY + 18;

        if (left + width > window.innerWidth - 6) left = clientX - width - 12;
        if (top + height > window.innerHeight - 6) top = clientY - height - 12;

        tip.style.left = `${Math.max(6, left)}px`;
        tip.style.top = `${Math.max(6, top)}px`;

        clearTimeout(tipTimer);

        if (hideAfterMs) {
            tipTimer = setTimeout(hideTip, hideAfterMs);
        }
    }

    function hideTip() {

        clearTimeout(tipTimer);

        tip.classList.remove("is-show");
    }


    /* =====================================================
       4) + 5) ห่อการลากของ app.js
    ===================================================== */

    let draggingId = null;
    let activeHandleClass = null;

    function markDragging() {

        if (!draggingId) return;

        document
            .querySelectorAll(`.canvas-object[data-object-id="${CSS.escape(draggingId)}"]`)
            .forEach(element => {

                element.classList.add("zg-grab-dragging");

                if (activeHandleClass) {

                    const handle = element.querySelector(`:scope > .${activeHandleClass}`);

                    if (handle) handle.classList.add("zg-grab-active");
                }
            });
    }

    const HANDLE_BY_MODE = {
        "resize-start": "canvas-object-handle--start",
        "resize-end": "canvas-object-handle--end",
        "resize-top": "canvas-object-handle--top",
        "resize-bottom": "canvas-object-handle--bottom"
    };

    const originalMove = handleObjectDragMove;

    handleObjectDragMove = function (event) {

        const state = typeof objectDragState !== "undefined" ? objectDragState : null;

        if (state && !state.zgStarted) {

            const distance =
                Math.abs(event.clientX - state.startClientX) +
                Math.abs(event.clientY - state.startClientY);

            const need = /^resize/.test(state.mode) ? RESIZE_THRESHOLD : MOVE_THRESHOLD;

            /* ยังขยับไม่ถึง → ไม่เลื่อน (คลิกแล้วยังเปิดเมนูได้ตามปกติ) */
            if (distance < need) return;

            state.zgStarted = true;

            draggingId = state.object.id;
            activeHandleClass = HANDLE_BY_MODE[state.mode] || null;

            document.body.classList.add("zg-grab-busy");
        }

        const result = originalMove.apply(this, arguments);

        if (state) {

            try {
                showTip(describe(state.object), event.clientX, event.clientY);
            } catch (error) { /* ignore */ }
        }

        return result;
    };

    /* ปล่อยเมาส์ → ซ่อนป้าย / เลิกไฮไลต์ */
    document.addEventListener("mouseup", () => {

        if (!draggingId && !tip.classList.contains("is-show")) return;

        draggingId = null;
        activeHandleClass = null;

        document.body.classList.remove("zg-grab-busy");

        document.querySelectorAll(".zg-grab-dragging").forEach(node => node.classList.remove("zg-grab-dragging"));
        document.querySelectorAll(".zg-grab-active").forEach(node => node.classList.remove("zg-grab-active"));

        hideTip();

    }, true);

    window.addEventListener("blur", hideTip);


    markSizes();


    window.ZGGrab = {
        describe,
        showTip,
        hideTip
    };

})();
