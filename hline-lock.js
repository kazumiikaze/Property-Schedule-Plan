"use strict";

/* =========================================================
   HLINE-LOCK.JS — เส้นแนวนอนที่ดูดติดยอดสามเหลี่ยมแล้ว "ติดตลอด"
   เดิม: จับเส้นแนวนอนลากย้าย / ลากปลาย → หลุดจากเส้นวันที่ทันที
   ใหม่: ติดกันจนกว่าจะลบเส้น (หรือลบเส้นวันที่ที่มันเกาะอยู่)
     - ลากย้ายทั้งเส้น  → เส้นวันที่ที่เกาะอยู่เลื่อนตามไปด้วย (ทั้งวันที่และความสูง)
     - ลากปลายที่เกาะอยู่ → เส้นวันที่ของปลายนั้นเลื่อนวันที่ตาม
     - ปลายที่ยังไม่เกาะ   → ลากไปดูดติดยอดสามเหลี่ยมได้เหมือนเดิม
     - ลากเส้นวันที่เอง    → เส้นแนวนอนยืดตามเหมือนเดิม

   ไม่แก้ app.js / line.js — โหลดหลัง app.js
========================================================= */

(function () {

    if (
        typeof handleObjectDragMove !== "function" ||
        typeof releaseHLineAnchors !== "function" ||
        typeof snapHLineAfterDrag !== "function"
    ) {
        console.error("[hline-lock.js] ไม่พบฟังก์ชันของ app.js / line.js (ต้องโหลดหลัง app.js)");
        return;
    }


    function isAnchored(object, end) {
        return end === "start"
            ? Boolean(findAnchorDateline(object.anchorStartId))
            : Boolean(findAnchorDateline(object.anchorEndId));
    }


    /* ไม่ปลดการเชื่อมตอนเริ่มลากอีกต่อไป */
    releaseHLineAnchors = function () { /* ติดตลอดจนกว่าจะลบ */ };


    /* ปลายที่เกาะอยู่ตั้งแต่ก่อนลาก → ไม่ต้องหาที่ดูดใหม่ */
    const originalSnap = snapHLineAfterDrag;

    snapHLineAfterDrag = function (object, mode) {

        const lock = objectDragState && objectDragState.zgLock;

        if (lock && lock.object === object) {

            if (mode === "resize-start" && lock.startAnchored) return;
            if (mode === "resize-end" && lock.endAnchored) return;
        }

        return originalSnap.apply(this, arguments);
    };


    function dragLimitsY(dateline) {

        const minY = typeof DATELINE_MIN_Y === "number" ? DATELINE_MIN_Y : 21;

        const maxY =
            bracketContent.clientHeight - Math.max(dateline.height || 46, 18);

        return [minY, Math.max(minY, maxY)];
    }


    /* เก็บค่าเริ่มต้นของเส้นวันที่ที่เกาะอยู่ (ครั้งแรกที่ขยับ) */
    function prepareLock(state) {

        if (state.zgLock !== undefined) {
            return state.zgLock;
        }

        const object = state.object;

        if (!object || object.type !== "hline") {
            state.zgLock = null;
            return null;
        }

        const startD = findAnchorDateline(object.anchorStartId);
        const endD = findAnchorDateline(object.anchorEndId);

        if (!startD && !endD) {
            state.zgLock = null;
            return null;
        }

        const origin = item => item
            ? {
                item,
                date: new Date(item.linkedHeaderDate || timelineStartDate),
                y: item.y
            }
            : null;

        state.zgLock = {
            object,
            startAnchored: Boolean(startD),
            endAnchored: Boolean(endD),
            start: origin(startD),
            end: origin(endD)
        };

        return state.zgLock;
    }


    function shiftDateline(origin, dayOffset, deltaY) {

        if (!origin) {
            return;
        }

        const date = new Date(origin.date);

        date.setDate(date.getDate() + dayOffset);

        origin.item.linkedHeaderDate = date;

        if (deltaY !== null) {

            const [minY, maxY] = dragLimitsY(origin.item);

            origin.item.y = Math.min(maxY, Math.max(minY, origin.y + deltaY));
        }
    }


    const originalMove = handleObjectDragMove;

    handleObjectDragMove = function (event) {

        const state = objectDragState;

        if (!state) {
            return originalMove.apply(this, arguments);
        }

        const lock = prepareLock(state);

        if (!lock) {
            return originalMove.apply(this, arguments);
        }

        const { mode } = state;

        const deltaX = event.clientX - state.startClientX;
        const deltaY = event.clientY - state.startClientY;

        const dayOffset = leftDeltaToDayOffset(deltaX);

        if (mode === "move") {

            /* ปลายที่ไม่ได้เกาะ (ถ้ามี) เลื่อนตามแบบเดิม */
            state.object.x = state.originX + dayOffset * pxPerDay;

            shiftDateline(lock.start, dayOffset, deltaY);
            shiftDateline(lock.end, dayOffset, deltaY);

            const reference = (lock.start || lock.end).item;

            syncLinkedDatelineY(reference);

        } else if (mode === "resize-start" && lock.startAnchored) {

            shiftDateline(lock.start, dayOffset, null);

        } else if (mode === "resize-end" && lock.endAnchored) {

            shiftDateline(lock.end, dayOffset, null);

        } else {

            /* ลากปลายที่ยังไม่เกาะ → ใช้ระบบเดิม (ดูดติดตอนปล่อย) */
            return originalMove.apply(this, arguments);
        }

        suppressNextClick = true;

        renderObjects();
    };

})();
