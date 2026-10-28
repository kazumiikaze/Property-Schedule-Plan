"use strict";

/* =========================================================
   TASK-MAGNET.JS — แม่เหล็กหมวดหมู่ สำหรับกล่องงาน
   - กล่องงานเต็มหมวด (สร้างใหม่จาก ＋ งาน = ขอบบน-ล่างตรงเส้นหมวดพอดี)
       ลากขึ้น-ลง → ยังติดอยู่กับหมวดเดิม (ไม่หลุดง่าย)
       ลากไกลจนกึ่งกลางกล่องเข้าไปในหมวดอื่น → ย้ายไปหมวดนั้น และเต็มหมวดนั้นพอดี (หมวดเล็กก็พอดี)
   - กล่องงานทั่วไป: ขอบบน / ล่างเข้าใกล้เส้นหมวด (≤ 10px) → ดูดติดเส้นพอดี
   - ลากซ้าย-ขวา / ยืดความยาว เหมือนเดิม · Ctrl+Z ได้
   - ไม่แก้ app.js — โหลดหลัง day-fold.js (ครอบ handleObjectDragMove ชั้นนอกสุด)
========================================================= */

(function () {

    if (typeof handleObjectDragMove !== "function" || typeof renderObjects !== "function") return;

    const EDGE_SNAP = 10;
    /* ต้องลากกึ่งกลางกล่องเข้าไปในหมวดใหม่ลึกแค่ไหนถึงย้าย (สัดส่วนความสูงหมวดใหม่) */
    const STICK = 0.5;

    function categorySlots() {
        if (typeof categorySlotMap !== "object" || !categorySlotMap) return [];
        return Object.keys(categorySlotMap)
            .map(id => ({ id, top: categorySlotMap[id].top, height: categorySlotMap[id].height }))
            .filter(slot => slot.height > 0)
            .sort((a, b) => a.top - b.top);
    }

    function paint(object) {
        document.querySelectorAll(`#objectLayer .canvas-object[data-object-id="${CSS.escape(object.id)}"]`).forEach(element => {
            element.style.top = `${object.y}px`;
            element.style.height = `${object.height}px`;
        });
    }

    function magnet(state, fullRowId) {

        const object = state.object;
        const slots = categorySlots();
        if (!slots.length) return;

        const rawY = object.y;
        const originH = Number(state.originHeight) || object.height;

        /*
            กล่องเต็มหมวด: แม่เหล็กแน่น — ติดหมวดเดิมไว้ จนกว่ากึ่งกลางกล่องจะลากเข้าไป
            ถึงครึ่งหนึ่งของหมวดใหม่ (STICK) ถึงย้ายหมวด
        */
        if (typeof fullRowId === "string" && fullRowId.startsWith("cat:")) {
            const centre = rawY + originH / 2;
            const current = slots.find(s => `cat:${s.id}` === fullRowId) || slots[0];
            let slot = current;
            const target = slots.find(s => centre >= s.top && centre < s.top + s.height) ||
                (centre < slots[0].top ? slots[0] : slots[slots.length - 1]);
            if (target !== current) {
                const into = target.top > current.top
                    ? centre - target.top                      /* ลากลง: เข้าไปจากขอบบนของหมวดใหม่ */
                    : target.top + target.height - centre;     /* ลากขึ้น: เข้าไปจากขอบล่าง */
                if (into >= target.height * STICK) slot = target;
            }
            object.y = slot.top;
            object.height = slot.height;
            object.fullRowId = `cat:${slot.id}`;
            object.fullRowY = object.y;
            object.fullRowH = object.height;
            paint(object);
            return;
        }

        /* กล่องทั่วไป: ขอบบน / ล่าง ใกล้เส้นหมวด → ดูดติด */
        const edges = [];
        slots.forEach(s => { edges.push(s.top, s.top + s.height); });
        const top = rawY, bottom = rawY + object.height;
        let best = null;
        edges.forEach(edge => {
            const dTop = Math.abs(edge - top);
            const dBottom = Math.abs(edge - bottom);
            if (dTop <= EDGE_SNAP && (!best || dTop < best.d)) best = { d: dTop, y: edge };
            if (dBottom <= EDGE_SNAP && (!best || dBottom < best.d)) best = { d: dBottom, y: edge - object.height };
        });
        if (best) {
            object.y = Math.max(0, best.y);
            paint(object);
        }
    }

    const original = handleObjectDragMove;

    handleObjectDragMove = function (event) {
        /* app.js วาดใหม่ระหว่างลาก → task-fullrow.js เห็นกล่องขยับแล้วเลิกยึดเต็มหมวด → จำไว้ก่อน */
        const before = typeof objectDragState !== "undefined" && objectDragState && objectDragState.object
            ? objectDragState.object.fullRowId
            : null;
        const result = original.apply(this, arguments);
        try {
            const state = typeof objectDragState !== "undefined" ? objectDragState : null;
            /* ลากกลุ่ม (ลากคลุมหลายชิ้น) → ไม่ดูด ให้ทั้งกลุ่มเลื่อนเท่ากัน */
            const many = window.ZGObjectPrecise && window.ZGObjectPrecise.getSelectedIds && window.ZGObjectPrecise.getSelectedIds().length > 1;
            if (state && state.mode === "move" && state.object && state.object.type === "task" && !many && !(event && event.altKey)) {
                magnet(state, before || state.object.fullRowId);
                if (typeof renderObjects === "function" && state.object.fullRowId) renderObjects();
            }
        } catch (error) {
            console.error("[task-magnet.js]", error);
        }
        return result;
    };

})();
