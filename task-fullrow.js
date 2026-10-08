"use strict";

/* =========================================================
   TASK-FULLROW.JS — งาน (task) ใหม่สูงเต็มแถว บน-ล่าง
   - สร้างงานใหม่ (ปุ่ม "＋ งาน", หน้าต่างกำหนดวันที่, เมนู ⋮ หมวดหมู่)
     → กล่องชิดขอบบน-ล่างของแถว (เว้นขอบเล็กน้อย)
   - แถวสูง/เตี้ยลงภายหลัง (ซูม, ย่อ/ขยายหน้าต่าง, เพิ่ม/ลบแถว)
     → กล่องยังเต็มแถวตามเสมอ
   - ถ้าผู้ใช้ลากขึ้น-ลง หรือปรับความสูงกล่องเอง → เลิกยึดเต็มแถว
     (ลากซ้าย-ขวา / ปรับความยาว ยังยึดเต็มแถวเหมือนเดิม)

   ไม่แก้ app.js — โหลดหลัง app.js (ก่อน task-dialog.js)
========================================================= */

(function () {

    if (typeof createTimelineObject !== "function" || typeof renderObjects !== "function") {

        console.error("[task-fullrow.js] ไม่พบ app.js");

        return;
    }

    /* ระยะเว้นจากเส้นแถวด้านบน/ล่าง (px) */
    const GAP = 3;

    const MIN_HEIGHT = 18;

    function fitBox(slot) {

        const gap = slot.height >= MIN_HEIGHT + GAP * 2 ? GAP : 0;

        return {
            y: slot.top + gap,
            height: Math.max(MIN_HEIGHT, slot.height - gap * 2)
        };
    }

    function same(a, b) {
        return Math.abs(Number(a) - Number(b)) < 0.75;
    }


    /* ---------- สร้างงานใหม่ ---------- */

    const originalCreate = createTimelineObject;

    createTimelineObject = function (type) {

        const object = originalCreate.apply(this, arguments);

        if (type !== "task" || !object) {
            return object;
        }

        try {

            const rowId = selectedRowContext && selectedRowContext.rowId;

            const slot = rowId && rowSlotMap && rowSlotMap[rowId];

            if (slot && slot.height > 0) {

                const box = fitBox(slot);

                object.y = box.y;
                object.height = box.height;

                object.fullRowId = rowId;
                object.fullRowY = box.y;
                object.fullRowH = box.height;
            }

        } catch (error) {

            console.error("[task-fullrow.js]", error);
        }

        return object;
    };


    /* ---------- ทุกครั้งที่วาดใหม่ → ปรับให้เต็มแถวปัจจุบัน ---------- */

    function refit() {

        if (!Array.isArray(timelineObjects) || !rowSlotMap) return;

        timelineObjects.forEach(object => {

            if (!object || object.type !== "task" || !object.fullRowId) return;

            /* ผู้ใช้ย้ายขึ้นลง / ปรับความสูงเอง → เลิกยึด */
            if (!same(object.y, object.fullRowY) || !same(object.height, object.fullRowH)) {

                delete object.fullRowId;
                delete object.fullRowY;
                delete object.fullRowH;

                return;
            }

            const slot = rowSlotMap[object.fullRowId];

            /* แถวถูกลบ → ปล่อยไว้ที่เดิม */
            if (!slot || !(slot.height > 0)) return;

            const box = fitBox(slot);

            object.y = box.y;
            object.height = box.height;
            object.fullRowY = box.y;
            object.fullRowH = box.height;
        });
    }

    const originalRender = renderObjects;

    renderObjects = function () {

        try {
            refit();
        } catch (error) {
            console.error("[task-fullrow.js]", error);
        }

        return originalRender.apply(this, arguments);
    };

})();
