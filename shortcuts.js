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

        if (document.querySelector(
            ".zg-start:not([hidden]), .zg-plan-overlay, .zg-tpl-overlay, .zg-date-edit, .zg-text-edit, .zg-help, .new-category-dialog"
        )) return true;

        /* รูปเดียวที่คลิกเลือกไว้ → ระบบรูปจัดการเอง · แต่ถ้ามีกลุ่มที่ลากคลุมอยู่ → ทำทั้งกลุ่ม */
        if (document.querySelector(".zg-bimg.is-selected")) {
            const M = window.ZGMarquee;
            const extras = M && M.selectedImages ? M.selectedImages().length + M.selectedTexts().length : 0;
            return !(P.getSelectedIds().length || extras);
        }

        return false;
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

    /* ช่วงวันรวมของกลุ่ม → ใช้เป็นระยะเลื่อนตอนวาง (วางต่อท้ายพอดี) — รวมรูปในกลุ่มด้วย */
    function groupDays(objects, images = []) {

        const startDay = Math.round(Date.UTC(timelineStartDate.getFullYear(), timelineStartDate.getMonth(), timelineStartDate.getDate()) / 86400000);

        const spans = objects.map(daySpan).concat(images.map(item => {
            const start = Math.round(Number(item.day) - startDay);
            return { start, end: start + Math.max(1, Math.round(Number(item.wDays) || 1)) - 1 };
        }));

        if (!spans.length) return 1;

        const min = Math.min(...spans.map(span => span.start));
        const max = Math.max(...spans.map(span => span.end));

        return Math.max(1, max - min + 1);
    }

    function createId() {

        return typeof createObjectId === "function"
            ? createObjectId()
            : `object-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }

    /* สร้างสำเนาของกลุ่ม เลื่อนไป shiftDays วัน → เพิ่มเข้าแผน + เลือกชิ้นใหม่
       extras = { images, texts } (ลากคลุมแล้วได้รูป / กล่องข้อความมาด้วย) */
    function placeCopies(sources, shiftDays, extras) {

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

        const added = placeExtras(extras, shiftDays, idMap);

        if (window.ZGMarquee && typeof window.ZGMarquee.select === "function" && (added.images.length || added.texts.length)) {
            window.ZGMarquee.select({ ids: copies.map(copy => copy.id), images: added.images, texts: added.texts });
        } else {
            P.setSelection(copies.map(copy => copy.id));
        }

        recordHistory();

        return copies.length + added.images.length + added.texts.length;
    }

    /* =====================================================
       รูป + กล่องข้อความ ในกลุ่มที่ลากคลุม (คัดลอก / วาง / ทำสำเนา ให้ครบ)
    ===================================================== */

    function uidOf(prefix) {
        return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    }

    /* รูป / กล่องข้อความที่เลือกอยู่ + กล่องข้อความที่ติดแม่เหล็กกับชิ้นในกลุ่ม */
    function selectedExtras(objects) {

        const M = window.ZGMarquee;
        const B = window.ZGBoardImages;
        const T = window.ZGTextBoxes;
        const S = window.ZGTextSize;

        const imageIds = new Set(M && M.selectedImages ? M.selectedImages() : []);
        const textIds = new Set(M && M.selectedTexts ? M.selectedTexts() : []);

        const images = B && typeof B.list === "function" ? B.list().filter(item => imageIds.has(item.id)) : [];

        const owners = new Set([...objects.map(object => object.id), ...images.map(item => item.id)]);

        const texts = T && typeof T.serialize === "function"
            ? T.serialize()
                .filter(item => textIds.has(item.id) || (item.attach && owners.has(item.attach.objectId)))
                .map(item => ({
                    data: JSON.parse(JSON.stringify(item)),
                    style: S && typeof S.getStyle === "function" ? S.getStyle(`text:${item.id}`) : null
                }))
            : [];

        return { images: JSON.parse(JSON.stringify(images)), texts };
    }

    function placeExtras(extras, shiftDays, idMap) {

        const result = { images: [], texts: [] };

        if (!extras) return result;

        const B = window.ZGBoardImages;
        const T = window.ZGTextBoxes;
        const S = window.ZGTextSize;

        if (extras.images.length && B && typeof B.load === "function") {

            const copies = extras.images.map(item => {
                const copy = { ...JSON.parse(JSON.stringify(item)), id: uidOf("img"), day: Number(item.day) + shiftDays, locked: false };
                idMap[item.id] = copy.id;
                return typeof B.makeEntry === "function" ? B.makeEntry(copy) : copy;
            }).filter(Boolean);

            B.load([...B.list(), ...copies]);
            result.images = copies.map(copy => copy.id);
        }

        if (extras.texts.length && T && typeof T.load === "function") {

            const styles = [];
            const shiftPx = shiftDays * pxPerDay;

            const copies = extras.texts.map(entry => {
                const copy = JSON.parse(JSON.stringify(entry.data));
                copy.id = uidOf("text");
                if (copy.attach && idMap[copy.attach.objectId]) {
                    /* ติดกับชิ้นที่คัดลอกมาด้วย → ติดกับชิ้นใหม่ (ไปตามชิ้นนั้นเอง) */
                    copy.attach = { ...copy.attach, objectId: idMap[copy.attach.objectId] };
                } else {
                    /* กล่องลอย (หรือติดกับชิ้นที่ไม่ได้คัดลอก) → วางเลื่อนไปเท่ากลุ่ม */
                    copy.attach = null;
                    copy.x = Number(copy.x) + shiftPx;
                }
                if (entry.style) styles.push([copy.id, entry.style]);
                return copy;
            });

            T.load([...T.serialize(), ...copies]);

            if (S && typeof S.setStyle === "function") styles.forEach(([id, style]) => S.setStyle(`text:${id}`, style));

            result.texts = copies.map(copy => copy.id);
        }

        return result;
    }

    function selectionTotal() {
        const M = window.ZGMarquee;
        return P.getSelectedIds().length +
            (M && M.selectedImages ? M.selectedImages().length : 0) +
            (M && M.selectedTexts ? M.selectedTexts().length : 0);
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
        const extras = selectedExtras(objects);
        const total = objects.length + extras.images.length + extras.texts.length;

        if (!total) return null;

        const text = objects
            .map(object => String(object.text || "").trim())
            .concat(extras.texts.map(entry => String(entry.data.text || "").trim()))
            .filter(Boolean)
            .join("\n") || "[Property Schedule Plan]";

        buffer = {
            items: objects.map(cloneObject),
            extras,
            text,
            pasteCount: 0,
            days: groupDays(objects, extras.images)
        };

        toast(total > 1 ? `คัดลอก ${total} ชิ้นแล้ว — กด Ctrl+V เพื่อวาง` : "คัดลอกแล้ว — กด Ctrl+V เพื่อวาง");

        return buffer;
    }

    function pasteBuffer() {

        if (!buffer || !(buffer.items.length || buffer.extras.images.length || buffer.extras.texts.length)) return false;

        buffer.pasteCount += 1;

        const count = placeCopies(buffer.items, buffer.days * buffer.pasteCount, buffer.extras);

        toast(count > 1 ? `วาง ${count} ชิ้นแล้ว` : "วางแล้ว");

        return true;
    }

    function duplicateSelected() {

        const objects = selectedObjects();
        const extras = selectedExtras(objects);

        if (!objects.length && !extras.images.length && !extras.texts.length) return false;

        const count = placeCopies(objects, groupDays(objects, extras.images), extras);

        toast(count > 1 ? `ทำสำเนา ${count} ชิ้นแล้ว` : "ทำสำเนาแล้ว");

        return true;
    }

    /* Ctrl+C → event "copy" (ใส่ข้อความลงคลิปบอร์ดด้วย) */
    document.addEventListener("copy", event => {

        if (isTyping(event.target) || blocked()) return;

        const selection = window.getSelection();

        if (selection && String(selection).trim()) return;   /* มีข้อความถูกเลือกอยู่ → คัดลอกข้อความตามปกติ */

        if (!selectionTotal()) return;

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

            /* กันเบราว์เซอร์บุ๊กมาร์กหน้า · ลากคลุมแล้วมีรูปในกลุ่ม → ทำสำเนาทั้งกลุ่ม */
            if (P.getSelectedIds().length || (window.ZGMarquee && window.ZGMarquee.selectedImages && window.ZGMarquee.selectedImages().length)) {
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
