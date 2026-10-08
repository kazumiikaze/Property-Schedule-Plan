"use strict";

/* =========================================================
   SHORTCUTS.JS — ปุ่มลัดสำหรับ object ที่เลือก
   (เลือกด้วยการคลิก · Shift + คลิก = เลือกหลายชิ้น — object-precise.js)

     Delete / Backspace   ลบ object ที่เลือก
     Ctrl + C             คัดลอก
     Ctrl + V             วาง (ต่อท้ายช่วงวันของชิ้นที่คัดลอก ในแถวเดิม)
     Ctrl + D             ทำสำเนาทันที (ต่อท้ายชิ้นเดิม)
     Ctrl + Z / Ctrl + Y  ย้อนกลับ / ทำซ้ำ (ระบบเดิมของ history.js)

   ไม่ทำงานตอนกำลังพิมพ์ในช่องข้อความ
   ไม่แก้ app.js — โหลดหลัง object-precise.js
========================================================= */

(function () {

    const P = window.ZGObjectPrecise;

    if (!P || typeof renderObjects !== "function") {

        console.error("[shortcuts.js] ต้องโหลดหลัง object-precise.js");

        return;
    }


    /* =====================================================
       HELPERS
    ===================================================== */

    function findObject(id) {
        return timelineObjects.find(object => object.id === id) || null;
    }

    function selectedObjects() {
        return P.getSelectedIds().map(findObject).filter(Boolean);
    }

    function isTyping(target) {

        return target instanceof Element &&
            Boolean(target.closest("input, textarea, select, [contenteditable=''], [contenteditable='true']"));
    }

    function blocked() {

        return Boolean(document.querySelector(
            ".zg-bimg.is-selected, .zg-start:not([hidden]), .zg-plan-overlay, .zg-tpl-overlay, .zg-date-edit, .zg-text-edit, .zg-help, .new-category-dialog"
        ));
    }

    function toast(message) {

        if (window.ZGImage && typeof window.ZGImage.toast === "function") {
            window.ZGImage.toast(message);
        }
    }

    function recordHistory() {

        if (window.ZGHistory && typeof window.ZGHistory.record === "function") {
            window.ZGHistory.record();
        }
    }

    function addDaysSafe(date, days) {

        const next = new Date(date);

        next.setDate(next.getDate() + days);

        return next;
    }

    function cloneObject(object) {

        return {
            ...JSON.parse(JSON.stringify({ ...object, linkedHeaderDate: null })),
            linkedHeaderDate: object.linkedHeaderDate ? new Date(object.linkedHeaderDate) : null
        };
    }

    /* วันเริ่ม (เลขวันนับจากต้นตาราง) / จำนวนวัน ของ object */
    function daySpan(object) {

        if (object.type === "dateline" || object.type === "vline") {

            const date = object.linkedHeaderDate || timelineStartDate;

            const start = Math.round((date - timelineStartDate) / 86400000);

            return { start, end: start };
        }

        const start = Math.round(object.x / pxPerDay);
        const days = Math.max(1, Math.round(object.width / pxPerDay));

        return { start, end: start + days - 1 };
    }

    /* ช่วงวันรวมของกลุ่ม → ใช้เป็นระยะเลื่อนตอนวาง (วางต่อท้ายพอดี) */
    function groupDays(objects) {

        const spans = objects.map(daySpan);

        const min = Math.min(...spans.map(span => span.start));
        const max = Math.max(...spans.map(span => span.end));

        return Math.max(1, max - min + 1);
    }

    function createId() {

        return typeof createObjectId === "function"
            ? createObjectId()
            : `object-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }

    /* สร้างสำเนาของกลุ่ม เลื่อนไป shiftDays วัน → เพิ่มเข้าแผน + เลือกชิ้นใหม่ */
    function placeCopies(sources, shiftDays) {

        const idMap = {};

        sources.forEach(source => { idMap[source.id] = createId(); });

        const copies = sources.map(source => {

            const copy = cloneObject(source);

            copy.id = idMap[source.id];

            if (copy.type === "dateline" || copy.type === "vline") {

                copy.linkedHeaderDate = addDaysSafe(copy.linkedHeaderDate || timelineStartDate, shiftDays);

            } else {

                copy.x = copy.x + shiftDays * pxPerDay;
            }

            /* เส้นแนวนอนที่เกาะเส้นวันที่ → เกาะชิ้นที่คัดลอกมาด้วย (ถ้ามี) */
            if (copy.type === "hline") {
                copy.anchorStartId = copy.anchorStartId && idMap[copy.anchorStartId] ? idMap[copy.anchorStartId] : null;
                copy.anchorEndId = copy.anchorEndId && idMap[copy.anchorEndId] ? idMap[copy.anchorEndId] : null;
            }

            /* กล่องเต็มแถว (task-fullrow.js) → ยังเต็มแถวเดิม */
            if (copy.fullRowId) {
                copy.fullRowY = copy.y;
                copy.fullRowH = copy.height;
            }

            return copy;
        });

        timelineObjects.push(...copies);

        renderObjects();

        P.setSelection(copies.map(copy => copy.id));

        recordHistory();

        return copies;
    }


    /* =====================================================
       ลบ
    ===================================================== */

    function deleteSelected() {

        const objects = selectedObjects();

        if (!objects.length) return false;

        if (typeof closeObjectMenu === "function") closeObjectMenu();

        const ids = new Set(objects.map(object => object.id));

        timelineObjects = timelineObjects.filter(object => !ids.has(object.id));

        /* เส้นแนวนอนที่เกาะเส้นที่ถูกลบ → ปล่อย */
        timelineObjects.forEach(object => {
            if (object.type === "hline") {
                if (ids.has(object.anchorStartId)) object.anchorStartId = null;
                if (ids.has(object.anchorEndId)) object.anchorEndId = null;
            }
        });

        P.clear();

        renderObjects();

        recordHistory();

        toast(objects.length > 1 ? `ลบ ${objects.length} ชิ้นแล้ว — กด Ctrl+Z เพื่อย้อน` : "ลบแล้ว — กด Ctrl+Z เพื่อย้อน");

        return true;
    }


    /* =====================================================
       คัดลอก / วาง / ทำสำเนา
    ===================================================== */

    let buffer = null;   // { items, text, pasteCount, days }

    function copySelected() {

        const objects = selectedObjects();

        if (!objects.length) return null;

        const text = objects
            .map(object => String(object.text || "").trim())
            .filter(Boolean)
            .join("\n") || "[Property Schedule Plan]";

        buffer = {
            items: objects.map(cloneObject),
            text,
            pasteCount: 0,
            days: groupDays(objects)
        };

        toast(objects.length > 1 ? `คัดลอก ${objects.length} ชิ้นแล้ว — กด Ctrl+V เพื่อวาง` : "คัดลอกแล้ว — กด Ctrl+V เพื่อวาง");

        return buffer;
    }

    function pasteBuffer() {

        if (!buffer || !buffer.items.length) return false;

        buffer.pasteCount += 1;

        const copies = placeCopies(buffer.items, buffer.days * buffer.pasteCount);

        toast(copies.length > 1 ? `วาง ${copies.length} ชิ้นแล้ว` : "วางแล้ว");

        return true;
    }

    function duplicateSelected() {

        const objects = selectedObjects();

        if (!objects.length) return false;

        const copies = placeCopies(objects, groupDays(objects));

        toast(copies.length > 1 ? `ทำสำเนา ${copies.length} ชิ้นแล้ว` : "ทำสำเนาแล้ว");

        return true;
    }

    /* Ctrl+C → event "copy" (ใส่ข้อความลงคลิปบอร์ดด้วย) */
    document.addEventListener("copy", event => {

        if (isTyping(event.target) || blocked()) return;

        const selection = window.getSelection();

        if (selection && String(selection).trim()) return;   /* มีข้อความถูกเลือกอยู่ → คัดลอกข้อความตามปกติ */

        if (!P.getSelectedIds().length) return;

        const result = copySelected();

        if (!result) return;

        event.preventDefault();

        if (event.clipboardData) {
            event.clipboardData.setData("text/plain", result.text);
        }
    });

    /* Ctrl+V → event "paste" (ทำก่อนระบบวางรูป) */
    window.addEventListener("paste", event => {

        if (!buffer || isTyping(event.target) || blocked()) return;

        const data = event.clipboardData;

        /* มีไฟล์รูปในคลิปบอร์ด → ให้ระบบรูปภาพจัดการ */
        if (data && Array.from(data.items || []).some(item => item.kind === "file")) return;

        /* คลิปบอร์ดเปลี่ยนเป็นข้อความอื่นแล้ว → ไม่ใช่ของที่เราคัดลอก */
        const text = data ? data.getData("text/plain") : "";

        if (text && text !== buffer.text) return;

        event.preventDefault();
        event.stopImmediatePropagation();

        pasteBuffer();

    }, true);


    /* =====================================================
       ปุ่ม
    ===================================================== */

    document.addEventListener("keydown", event => {

        if (isTyping(event.target) || blocked()) return;

        const ctrl = event.ctrlKey || event.metaKey;
        const key = (event.key || "").toLowerCase();

        if (!ctrl && !event.altKey && (event.key === "Delete" || event.key === "Backspace")) {

            if (deleteSelected()) {
                event.preventDefault();
                event.stopImmediatePropagation();
            }

            return;
        }

        if (ctrl && !event.shiftKey && key === "d") {

            /* กันเบราว์เซอร์บุ๊กมาร์กหน้า */
            if (P.getSelectedIds().length) {
                event.preventDefault();
                event.stopImmediatePropagation();
                duplicateSelected();
            }
        }

    }, true);


    window.ZGShortcuts = {
        copy: copySelected,
        paste: pasteBuffer,
        duplicate: duplicateSelected,
        remove: deleteSelected
    };

})();
