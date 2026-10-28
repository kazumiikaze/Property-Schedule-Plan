"use strict";

/* =========================================================
   DRAG-AUTOSCROLL.JS — ลาก object ไปชนขอบตาราง → ตารางเลื่อนไปทางเดือนฝั่งนั้นเอง
   - ใช้กับทุกการลาก: กล่องงาน / เส้นวันที่ / เส้นแนวตั้ง / เส้นแนวนอน
     กลุ่มที่ลากคลุมไว้ (marquee-select.js) และรูปภาพในตาราง (image-board.js)
   - เมาส์เข้าใกล้ขอบซ้าย/ขวาของตาราง (EDGE px) หรือเลยขอบ → เลื่อนตาราง
     ยิ่งชิด/เลยขอบมาก ยิ่งเลื่อนเร็ว · ชิ้นที่ลากยังติดอยู่ใต้เมาส์
   - เลื่อนจนสุดช่วงวันของแผนแล้ว → ขยายตารางเพิ่มทีละ 1 เดือนไปทางนั้น
     (ซ้าย = ขยายวันเริ่มต้น, ขวา = ขยายวันสิ้นสุด) object ทุกชิ้นอยู่วันเดิม
   - ไม่แก้ app.js — โหลดหลัง app.js, object-precise.js, marquee-select.js, image-board.js
========================================================= */

(function () {

    if (typeof timelineViewport === "undefined" || typeof renderSchedule !== "function") {
        console.warn("[drag-autoscroll.js] ต้องโหลดหลัง app.js");
        return;
    }

    const EDGE = 40;            // px จากขอบตารางที่เริ่มเลื่อน
    const MAX_SPEED = 26;       // px ต่อเฟรม (เมาส์เลยขอบไกล ๆ)
    const EXTEND_EVERY = 800;   // ms ขยายเดือนได้ถี่สุดเท่านี้ (ค้างไว้ = เพิ่มเดือนละ ~0.8 วินาที)

    let pointer = null;         // ตำแหน่งเมาส์ล่าสุด
    let imageDrag = false;      // กำลังลากรูป (image-board.js ไม่มี API บอก)
    let frame = 0;
    let lastExtend = 0;


    /* ---------- กำลังลากอะไรอยู่ไหม ---------- */

    function appDrag() {
        return typeof objectDragState !== "undefined" && objectDragState ? objectDragState : null;
    }

    function groupMoving() {
        return document.body.classList.contains("zg-group-moving");
    }

    function dragging() {
        return Boolean(pointer && pointer.buttons & 1 && (appDrag() || groupMoving() || imageDrag));
    }


    /* ---------- ติดตามเมาส์ ---------- */

    /* window + capture = ทำงานก่อนตัวดักของ image-board.js / marquee-select.js (บางตัวหยุดเหตุการณ์ไว้) */
    window.addEventListener("pointerdown", event => {

        const target = event.target instanceof Element ? event.target : null;

        imageDrag = Boolean(target && target.closest(".zg-img-layer .zg-bimg") && !target.closest(".zg-bimg-handle"));

        pointer = { x: event.clientX, y: event.clientY, id: event.pointerId, buttons: event.buttons };

    }, true);

    const track = event => {

        if (event.zgSynthetic) return;

        pointer = {
            x: event.clientX,
            y: event.clientY,
            id: event.pointerId !== undefined ? event.pointerId : (pointer ? pointer.id : 1),
            buttons: event.buttons
        };

        if (dragging()) start();
    };

    window.addEventListener("pointermove", track, true);
    window.addEventListener("mousemove", track, true);

    const finish = () => {
        imageDrag = false;
        if (pointer) pointer.buttons = 0;
        cancelAnimationFrame(frame);
        frame = 0;
    };

    window.addEventListener("pointerup", finish, true);
    window.addEventListener("mouseup", finish, true);
    window.addEventListener("blur", finish);


    /* ---------- เลื่อน / ขยายตาราง ---------- */

    function speedFor(x, rect) {

        if (x < rect.left + EDGE) {
            return -Math.min(MAX_SPEED, 3 + ((rect.left + EDGE - x) / EDGE) * 9);
        }

        if (x > rect.right - EDGE) {
            return Math.min(MAX_SPEED, 3 + ((x - (rect.right - EDGE)) / EDGE) * 9);
        }

        return 0;
    }

    /* ส่ง mousemove / pointermove ซ้ำที่ตำแหน่งเดิม → ระบบลากของแต่ละไฟล์วาดตำแหน่งใหม่ */
    function replayMove() {

        if (!pointer) return;

        const init = { clientX: pointer.x, clientY: pointer.y, buttons: 1, bubbles: true, cancelable: true };

        const mouse = new MouseEvent("mousemove", init);
        mouse.zgSynthetic = true;
        document.dispatchEvent(mouse);

        if (typeof PointerEvent === "function") {
            const move = new PointerEvent("pointermove", { ...init, pointerId: pointer.id, isPrimary: true });
            move.zgSynthetic = true;
            document.dispatchEvent(move);
        }
    }

    /* ตารางเลื่อนไป S px → ชิ้นที่ลาก (คิดตำแหน่งจากระยะเมาส์) ต้องไปไกลขึ้น S px ด้วย */
    function compensateScroll(scrolled) {

        const state = appDrag();

        if (state) state.startClientX -= scrolled;

        window.dispatchEvent(new CustomEvent("zg:drag-scroll", { detail: { px: scrolled } }));
    }

    function extend(direction) {

        const now = performance.now();

        if (now - lastExtend < EXTEND_EVERY) return false;

        lastExtend = now;

        if (direction > 0) {

            timelineEndDate = addMonths(timelineEndDate, 1);
            syncDateInputs();
            renderSchedule();
            return true;
        }

        /*
            ขยายไปทางซ้าย: เนื้อหาทั้งหมดเลื่อนขวา (object อยู่วันเดิม — zoom-sync.js แปลงให้)
            ความกว้างต่อวันคิดจาก "6 เดือนนับจากวันเริ่ม" → เปลี่ยนนิดหน่อยตามความยาวเดือน
            ตำแหน่งที่จำไว้ระหว่างลาก (px) ต้องแปลง: x ใหม่ = x เดิม × ratio + px
        */
        const oldStart = new Date(timelineStartDate);
        const oldPpd = pxPerDay;
        /* day-fold.js: จำตำแหน่งจริง (ไม่ใช่ px บนจอ) */
        const oldScroll = window.ZGFold ? window.ZGFold.inv(timelineViewport.scrollLeft) : timelineViewport.scrollLeft;

        timelineStartDate = addMonths(timelineStartDate, -1);
        syncDateInputs();
        renderSchedule();

        const ratio = pxPerDay / oldPpd;
        const shiftPx = daysBetween(timelineStartDate, oldStart) * pxPerDay;

        const newScroll = oldScroll * ratio + shiftPx;
        timelineViewport.scrollLeft = window.ZGFold ? window.ZGFold.x(newScroll) : newScroll;

        const state = appDrag();

        if (state) {
            if (Number.isFinite(state.originX)) state.originX = state.originX * ratio + shiftPx;
            if (Number.isFinite(state.originWidth)) state.originWidth *= ratio;
        }

        window.dispatchEvent(new CustomEvent("zg:timeline-shift", { detail: { px: shiftPx, ratio } }));

        return true;
    }

    function step() {

        frame = 0;

        if (!dragging()) return;

        const rect = timelineViewport.getBoundingClientRect();
        const speed = speedFor(pointer.x, rect);

        if (!speed) return;

        const max = timelineViewport.scrollWidth - timelineViewport.clientWidth;
        const before = timelineViewport.scrollLeft;

        if ((speed < 0 && before <= 0.5) || (speed > 0 && before >= max - 0.5)) {

            extend(speed > 0 ? 1 : -1);

        } else {

            timelineViewport.scrollLeft = Math.max(0, Math.min(max, before + speed));

            const scrolled = timelineViewport.scrollLeft - before;

            if (scrolled) {
                timelineViewport.dispatchEvent(new Event("scroll"));
                compensateScroll(scrolled);
            }
        }

        if (typeof updateAllHorizontalRanges === "function") updateAllHorizontalRanges();

        replayMove();

        frame = requestAnimationFrame(step);
    }

    function start() {
        if (!frame) frame = requestAnimationFrame(step);
    }

})();
