"use strict";

/* =========================================================
   HLINE-VLINE.JS — เส้นแนวนอน (ช่วงเวลา) ยืดไปติด "เส้นแนวตั้ง" ได้ด้วย
   - เดิม: ปลายเส้นแนวนอนดูดติดได้แค่ยอดสามเหลี่ยมของ "เส้นวันที่"
   - ใหม่: ลากปลายไปใกล้ "เส้นแนวตั้ง" (กดจากเลขวันที่ข้างบน) → ดูดติดเหมือนกัน
     · เส้นแนวตั้งยาวตลอดช่องเส้นวันที่ → ติดได้ที่ความสูงไหนก็ได้ (เส้นแนวนอนอยู่ระดับเดิม)
     · ติดแล้ว: ย้ายเส้นแนวตั้ง → ปลายเส้นแนวนอนยืด/หดตาม
                 ลากเส้นแนวนอนทั้งเส้น → เส้นแนวตั้งเลื่อนวันตาม (เหมือนเส้นวันที่)
     · ปลายหนึ่งติดเส้นวันที่ อีกปลายติดเส้นแนวตั้งก็ได้ (ความสูงตามเส้นวันที่)
   - ไม่แก้ app.js / line.js — โหลดหลัง line.js, hline-lock.js, line-center.js
========================================================= */

(function () {

    if (
        typeof findAnchorDateline !== "function" ||
        typeof resolveHLineAnchors !== "function" ||
        typeof snapHLineAfterDrag !== "function" ||
        typeof handleObjectDragMove !== "function"
    ) {
        console.warn("[hline-vline.js] ไม่พบฟังก์ชันของ line.js / app.js");
        return;
    }

    const SNAP_X = typeof SNAP_DISTANCE_X === "number" ? SNAP_DISTANCE_X : 30;

    function tipX(item) {
        return datelineTipX(item);
    }

    function byId(id) {
        return id ? timelineObjects.find(item => item.id === id) || null : null;
    }


    /* ---------- 1) ปลายที่ผูกไว้ หาได้ทั้งเส้นวันที่และเส้นแนวตั้ง ---------- */

    const originalFind = findAnchorDateline;

    findAnchorDateline = function (id) {
        const found = originalFind.apply(this, arguments);
        if (found) return found;
        const item = byId(id);
        return item && item.type === "vline" ? item : null;
    };


    /* ---------- 2) คำนวณตำแหน่งเส้นแนวนอนที่ผูกกับเส้นแนวตั้ง ---------- */

    const originalResolve = resolveHLineAnchors;

    resolveHLineAnchors = function (object) {

        const start = findAnchorDateline(object.anchorStartId);
        const end = findAnchorDateline(object.anchorEndId);

        const hasVline = (start && start.type === "vline") || (end && end.type === "vline");

        if (!hasVline) {
            return originalResolve.apply(this, arguments);
        }

        if (object.anchorStartId && !start) object.anchorStartId = null;
        if (object.anchorEndId && !end) object.anchorEndId = null;

        const startX = start ? tipX(start) : object.x;
        const endX = end ? tipX(end) : object.x + object.width;

        object.x = Math.min(startX, endX);
        object.width = Math.max(24, Math.abs(endX - startX));

        /* ความสูง: มีเส้นวันที่ → ยึดยอดสามเหลี่ยม / มีแต่เส้นแนวตั้ง → อยู่ระดับเดิม */
        const dateline = [start, end].find(item => item && item.type === "dateline");

        if (dateline) {
            const caret = typeof CARET_TIP_OFFSET === "number" ? CARET_TIP_OFFSET : 6;
            const center = typeof HLINE_CENTER_OFFSET === "number" ? HLINE_CENTER_OFFSET : 1;
            object.y = Math.max(0, dateline.y - caret - center);
        }
    };


    /* ---------- 3) ปล่อยปลายเส้นใกล้เส้นแนวตั้ง → ดูดติด ---------- */

    const originalSnap = snapHLineAfterDrag;

    snapHLineAfterDrag = function (object, mode) {

        if (mode !== "resize-start" && mode !== "resize-end") {
            return originalSnap.apply(this, arguments);
        }

        const before = { start: object.anchorStartId, end: object.anchorEndId };

        const fixedAnchorId = mode === "resize-start" ? before.end : before.start;
        const fixedX = mode === "resize-start" ? object.x + object.width : object.x;

        const pointX = typeof hlineDragPointX === "number" && hlineDragPointX !== null
            ? hlineDragPointX
            : (mode === "resize-start" ? object.x : object.x + object.width);

        const result = originalSnap.apply(this, arguments);

        /* hline-lock.js: ปลายนี้ติดอยู่ก่อนแล้ว → ไม่ต้องหาใหม่ */
        if (object.anchorStartId === before.start && object.anchorEndId === before.end &&
            (mode === "resize-start" ? before.start : before.end)) {
            return result;
        }

        const movedIsStart = pointX < fixedX;
        const movedId = movedIsStart ? object.anchorStartId : object.anchorEndId;
        const moved = byId(movedId);
        const movedDx = moved ? Math.abs(pointX - tipX(moved)) : Infinity;

        let best = null;
        let bestDx = SNAP_X;

        timelineObjects.forEach(item => {
            if (item.type !== "vline" || item.id === fixedAnchorId) return;
            const dx = Math.abs(pointX - tipX(item));
            if (dx <= bestDx) { best = item; bestDx = dx; }
        });

        if (best && bestDx < movedDx) {
            if (movedIsStart) object.anchorStartId = best.id;
            else object.anchorEndId = best.id;
        }

        return result;
    };


    /* ---------- 4) ลากเส้นแนวนอนที่ผูกแต่เส้นแนวตั้ง → ขึ้นลงได้ตามเมาส์ ---------- */

    const originalMove = handleObjectDragMove;

    handleObjectDragMove = function (event) {

        const state = typeof objectDragState !== "undefined" ? objectDragState : null;

        const result = originalMove.apply(this, arguments);

        try {
            if (state && state.mode === "move" && state.object && state.object.type === "hline" && event) {
                const object = state.object;
                const start = findAnchorDateline(object.anchorStartId);
                const end = findAnchorDateline(object.anchorEndId);
                const anchors = [start, end].filter(Boolean);
                if (anchors.length && anchors.every(item => item.type === "vline")) {
                    const maxY = Math.max(0, bracketContent.clientHeight - 6);
                    object.y = Math.min(maxY, Math.max(0, state.originY + (event.clientY - state.startClientY)));
                    renderObjects();
                }
            }
        } catch (error) {
            console.error("[hline-vline.js]", error);
        }

        return result;
    };

    window.ZGHlineVline = true;

})();
