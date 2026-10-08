"use strict";

/* =========================================================
   OBJECT-PRECISE.JS — ปรับ object แบบแม่น ๆ ไม่ต้องลาก

   6) คีย์บอร์ด — คลิกเลือก object (กล่องงาน / เส้นวันที่ / เส้นแนวตั้ง)
        Shift + คลิก  เลือกหลายชิ้น → ลาก / กดลูกศร ขยับไปพร้อมกันทั้งกลุ่ม
        ← →          เลื่อนทีละ 1 วัน
        Shift + ← →  ยืด / หด วันจบทีละ 1 วัน (กล่องงาน)
        ↑ ↓          ย้ายกล่องงานไปแถวบน / แถวล่าง
        Esc          เลิกเลือก
      มีป้ายบอกวันที่ใหม่ทุกครั้งที่กด

   7) แก้วันที่เป็นตัวเลข
        - ดับเบิลคลิกกล่องงาน (ตรงที่ไม่ใช่ตัวหนังสือ) / เส้นวันที่ / เส้นแนวตั้ง
        - หรือปุ่ม "📅 แก้วันที่" ในเมนูของ object
      กล่องงาน: วันเริ่ม + วันจบ · เส้น: วันที่

   ไม่แก้ app.js — โหลดหลัง object-grab.js
========================================================= */

(function () {

    if (typeof renderObjects !== "function" || typeof openObjectMenu !== "function") {

        console.error("[object-precise.js] ไม่พบฟังก์ชันของ app.js");

        return;
    }

    const EDITABLE_TYPES = ["task", "dateline", "vline"];


    /* =====================================================
       STYLE
    ===================================================== */

    const style = document.createElement("style");

    style.textContent = `
.canvas-object--task.zg-obj-selected,
.canvas-object--dateline-chip.zg-obj-selected {
    outline: 2px solid rgba(58, 138, 79, .9);
    outline-offset: 2px;
}
.canvas-object--dateline-line.zg-obj-selected::before,
.canvas-object--vline.zg-obj-selected::before,
.canvas-object--hline.zg-obj-selected::before { background: rgba(58, 138, 79, .22); }

.zg-date-edit { width: 270px; }
.zg-date-edit .zgd-dates { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.zg-date-edit .zgd-dates.is-single { grid-template-columns: 1fr; }
.zg-date-edit input[type="date"] {
    width: 100%;
    height: 30px;
    padding: 0 8px;
    box-sizing: border-box;
    border: 1px solid #dde3e0;
    border-radius: 6px;
    background: #ffffff;
    font-family: inherit;
    font-size: 12px;
    color: inherit;
}
.zg-date-edit .zgd-summary { min-height: 14px; font-size: 11px; color: #3a8a4f; }
.zg-date-edit .zgd-summary.is-error { color: #d9534f; }
.zg-date-edit .zgd-summary.is-warn { color: #c77c11; }
.zg-date-edit .zgd-hint { color: #8a938d; font-size: 10px; line-height: 1.5; }
.zg-date-edit .ncd-ok[disabled] { opacity: .5; cursor: default; }

.zg-date-menu-btn {
    width: 100%;
    min-height: 30px;
    padding: 5px 8px;
    line-height: 1.35;
    margin: 0 0 8px;
    border: 1px solid #b9d8c2;
    border-radius: 6px;
    background: #eaf4ed;
    color: #2f7442;
    font-family: inherit;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
}
.zg-date-menu-btn:hover { background: #dcefe2; }

body.zg-dark .zg-date-edit { background: #222a27; border-color: #3a4440; color: #e3e9e5; }
body.zg-dark .zg-date-edit input { background: #2b3330; border-color: #3a4440; color: #e3e9e5; color-scheme: dark; }
body.zg-dark .zg-date-edit .ncd-actions button { background: #2b3330; border-color: #3a4440; color: #e3e9e5; }
body.zg-dark .zg-date-edit .ncd-actions .ncd-ok { background: #3a8a4f; border-color: #3a8a4f; color: #ffffff; }
body.zg-dark .zg-date-menu-btn { background: #26372d; border-color: #3a5a44; color: #9fd3ad; }

body.zg-exporting .zg-obj-selected { outline: none !important; }
body.zg-exporting .zg-obj-selected::before { background: transparent !important; }
`;

    document.head.appendChild(style);


    /* =====================================================
       HELPERS
    ===================================================== */

    function findObject(id) {
        return timelineObjects.find(object => object.id === id) || null;
    }

    function addDaysSafe(date, days) {

        const next = new Date(date);

        next.setDate(next.getDate() + days);

        return next;
    }

    function diffDays(a, b) {

        return Math.round(
            (Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) -
             Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 86400000
        );
    }

    function fmt(date) {

        return typeof formatThaiDateShort === "function"
            ? formatThaiDateShort(date)
            : `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
    }

    /* วันเริ่ม / วันจบ ของกล่องงาน (ปัดเป็นวันเต็ม) */
    function taskRange(object) {

        const startOffset = Math.round(object.x / pxPerDay);
        const days = Math.max(1, Math.round(object.width / pxPerDay));

        const start = addDaysSafe(timelineStartDate, startOffset);

        return { start, end: addDaysSafe(start, days - 1), days, startOffset };
    }

    function setTaskRange(object, start, end) {

        const days = Math.max(1, diffDays(start, end) + 1);

        object.x = diffDays(timelineStartDate, start) * pxPerDay;
        object.width = days * pxPerDay;
    }

    function isTyping(target) {

        return target instanceof Element &&
            Boolean(target.closest("input, textarea, select, [contenteditable=''], [contenteditable='true']"));
    }

    function recordHistorySoon() {

        clearTimeout(recordTimer);

        recordTimer = setTimeout(() => {
            if (window.ZGHistory && typeof window.ZGHistory.record === "function") {
                window.ZGHistory.record();
            }
        }, 450);
    }

    let recordTimer = null;

    function elementsOf(id) {
        return Array.from(document.querySelectorAll(`.canvas-object[data-object-id="${CSS.escape(id)}"]`));
    }

    /* ป้ายบอกค่า (ใช้ของ object-grab.js) ไว้ใกล้ object */
    function flashTip(object) {

        if (!window.ZGGrab) return;

        const element = elementsOf(object.id)
            .find(node => !node.classList.contains("canvas-object--dateline-line")) || elementsOf(object.id)[0];

        if (!element) return;

        const rect = element.getBoundingClientRect();

        window.ZGGrab.showTip(window.ZGGrab.describe(object), rect.left, rect.bottom, 1600);
    }


    /* =====================================================
       6) เลือก object (หลายชิ้นได้ด้วย Shift + คลิก) + คีย์บอร์ด
    ===================================================== */

    /* เลือกได้: กล่องงาน / เส้นวันที่ / เส้นแนวตั้ง / เส้นแนวนอน */
    const SELECTABLE_TYPES = ["task", "dateline", "vline", "hline"];

    const selected = new Set();

    /* ชิ้นที่คลิกล่าสุด (ใช้กับเมนู / หน้าต่างแก้วันที่) */
    let primaryId = null;

    function selectedObjects() {
        return Array.from(selected).map(findObject).filter(Boolean);
    }

    function clearSelection() {

        selected.clear();
        primaryId = null;

        paintSelection();
    }

    function paintSelection() {

        document.querySelectorAll(".zg-obj-selected").forEach(node => node.classList.remove("zg-obj-selected"));

        Array.from(selected).forEach(id => {
            if (!findObject(id)) selected.delete(id);
        });

        if (primaryId && !selected.has(primaryId)) {
            primaryId = selected.size ? Array.from(selected).pop() : null;
        }

        selected.forEach(id => elementsOf(id).forEach(node => node.classList.add("zg-obj-selected")));

        document.body.classList.toggle("zg-multi-selected", selected.size > 1);
    }

    const originalRender = renderObjects;

    renderObjects = function () {

        const result = originalRender.apply(this, arguments);

        try {
            paintSelection();
        } catch (error) {
            console.error("[object-precise.js]", error);
        }

        return result;
    };

    document.addEventListener("mousedown", event => {

        const target = event.target instanceof Element ? event.target : null;

        if (!target) return;

        const element = target.closest(".canvas-object[data-object-id]");

        if (element) {

            const object = findObject(element.dataset.objectId);

            if (!object || !SELECTABLE_TYPES.includes(object.type)) {
                if (!event.shiftKey) clearSelection();
                return;
            }

            if (event.shiftKey) {

                /* Shift + คลิก = เพิ่ม / เอาออกจากกลุ่ม */
                if (selected.has(object.id)) {
                    selected.delete(object.id);
                } else {
                    selected.add(object.id);
                    primaryId = object.id;
                }

            } else if (!(selected.has(object.id) && selected.size > 1)) {

                /* คลิกธรรมดา = เลือกชิ้นเดียว (ถ้าคลิกชิ้นในกลุ่ม → ยังเลือกทั้งกลุ่ม ลากไปพร้อมกันได้) */
                selected.clear();
                selected.add(object.id);
                primaryId = object.id;

            } else {

                primaryId = object.id;
            }

            paintSelection();

            return;
        }

        /* คลิกในเมนู / หน้าต่างของ object → ยังเลือกไว้ */
        if (target.closest(".object-menu, .zg-date-edit, .zg-drag-tip, .zg-text-edit, .zg-help, .toolbar, .workspace-toolbar")) return;

        if (selected.size && !event.shiftKey) clearSelection();

    }, true);


    /* ---------- ลากกลุ่ม: ลากชิ้นหนึ่ง ชิ้นอื่นที่เลือกไว้ไปด้วย ---------- */

    let group = null;

    if (typeof handleObjectDragMove === "function") {

        const originalDragMove = handleObjectDragMove;

        handleObjectDragMove = function () {

            const result = originalDragMove.apply(this, arguments);

            try {
                moveGroup();
            } catch (error) {
                console.error("[object-precise.js]", error);
            }

            return result;
        };
    }

    function moveGroup() {

        const state = typeof objectDragState !== "undefined" ? objectDragState : null;

        if (!state || selected.size < 2 || !selected.has(state.object.id)) {
            group = null;
            return;
        }

        if (state.mode !== "move" && state.mode !== "move-dateline") return;

        if (!group || group.state !== state) {

            group = {
                state,
                items: selectedObjects()
                    .filter(object => object !== state.object)
                    .map(object => ({
                        object,
                        x: object.x,
                        y: object.y,
                        date: object.linkedHeaderDate ? new Date(object.linkedHeaderDate) : null
                    }))
            };
        }

        const lead = state.object;

        /* ระยะที่ชิ้นหลักขยับไป (เป็นวัน + px แนวตั้ง) */
        let dayShift;
        let dy = 0;

        if (lead.type === "dateline" || lead.type === "vline") {
            dayShift = state.originDate ? diffDays(state.originDate, lead.linkedHeaderDate) : 0;
        } else {
            dayShift = (lead.x - state.originX) / pxPerDay;
            dy = lead.type === "task" ? lead.y - state.originY : 0;
        }

        group.items.forEach(item => {

            const object = item.object;

            if (object.type === "dateline" || object.type === "vline") {

                if (item.date) object.linkedHeaderDate = addDaysSafe(item.date, Math.round(dayShift));

            } else if (object.type === "task") {

                object.x = item.x + dayShift * pxPerDay;
                object.y = Math.max(0, item.y + dy);

            } else if (object.type === "hline") {

                object.x = item.x + dayShift * pxPerDay;
            }
        });

        /* วาดผ่านทุกไฟล์เสริม (ตำแหน่งตัวหนังสือ / ขนาดอักษร / เส้น ฯลฯ) ไม่ใช่แค่ app.js */
        renderObjects();
    }

    document.addEventListener("mouseup", () => { group = null; }, true);


    function rowSlots() {

        if (typeof rowSlotMap !== "object" || !rowSlotMap) return [];

        return Object.keys(rowSlotMap)
            .map(id => ({ id, ...rowSlotMap[id] }))
            .sort((a, b) => a.top - b.top);
    }

    function moveTaskRow(object, direction) {

        const slots = rowSlots();

        if (!slots.length) return false;

        const center = object.y + object.height / 2;

        let index = slots.findIndex(slot => center >= slot.top && center < slot.top + slot.height);

        if (index < 0) {
            index = center < slots[0].top ? 0 : slots.length - 1;
        }

        const targetIndex = index + direction;

        if (targetIndex < 0 || targetIndex >= slots.length) return false;

        const current = slots[index];
        const target = slots[targetIndex];

        if (object.fullRowId) {

            /* กล่องเต็มแถว (task-fullrow.js) → เต็มแถวใหม่ */
            const gap = target.height >= 24 ? 3 : 0;

            object.y = target.top + gap;
            object.height = Math.max(18, target.height - gap * 2);

            object.fullRowId = target.id;
            object.fullRowY = object.y;
            object.fullRowH = object.height;

        } else {

            object.y = Math.max(0, target.top + (object.y - current.top));
        }

        if (typeof selectedRowContext !== "undefined") {
            selectedRowContext = { categoryId: target.categoryId, rowId: target.id };
        }

        return true;
    }

    /* ขยับ object 1 ชิ้นตามปุ่ม (คืน true ถ้าเปลี่ยน) */
    function nudge(object, horizontal, vertical, shift) {

        if (object.type === "task") {

            if (horizontal) {

                const range = taskRange(object);

                if (shift) {

                    /* ยืด / หด วันจบ */
                    const end = addDaysSafe(range.end, horizontal);

                    if (end < range.start) return false;

                    setTaskRange(object, range.start, end);

                    return true;
                }

                setTaskRange(object, addDaysSafe(range.start, horizontal), addDaysSafe(range.end, horizontal));

                return true;
            }

            return !shift && moveTaskRow(object, vertical);
        }

        if ((object.type === "dateline" || object.type === "vline") && horizontal) {

            const date = new Date(object.linkedHeaderDate || timelineStartDate);

            object.linkedHeaderDate = addDaysSafe(date, horizontal);

            return true;
        }

        return false;
    }

    document.addEventListener("keydown", event => {

        if (!selected.size || isTyping(event.target) || event.ctrlKey || event.metaKey || event.altKey) return;

        /* มีรูปบนกระดานถูกเลือกอยู่ / มีหน้าต่างอื่นเปิด → ไม่ยุ่ง */
        if (document.querySelector(".zg-bimg.is-selected, .zg-start:not([hidden]), .zg-plan-overlay, .zg-tpl-overlay, .zg-date-edit, .zg-text-edit, .zg-help")) return;

        if (event.key === "Escape") {
            clearSelection();
            return;
        }

        const horizontal = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
        const vertical = event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;

        if (!horizontal && !vertical) return;

        const objects = selectedObjects();

        /* ย้ายแถว: ทั้งกลุ่มต้องย้ายได้ทุกชิ้น (กันกลุ่มเละ) */
        if (vertical && !event.shiftKey) {

            const tasks = objects.filter(object => object.type === "task");

            if (!tasks.length) return;

            const backup = tasks.map(object => ({ object, y: object.y, height: object.height, fullRowId: object.fullRowId, fullRowY: object.fullRowY, fullRowH: object.fullRowH }));

            const ok = tasks.every(object => moveTaskRow(object, vertical));

            if (!ok) {

                backup.forEach(item => Object.assign(item.object, {
                    y: item.y, height: item.height, fullRowId: item.fullRowId, fullRowY: item.fullRowY, fullRowH: item.fullRowH
                }));

                event.preventDefault();

                return;
            }

        } else {

            let changed = false;

            objects.forEach(object => {
                if (nudge(object, horizontal, 0, event.shiftKey)) changed = true;
            });

            if (!changed) return;
        }

        event.preventDefault();
        event.stopImmediatePropagation();

        renderObjects();

        const lead = findObject(primaryId) || objects[0];

        if (lead) flashTip(lead);

        recordHistorySoon();

    }, true);


    /* =====================================================
       7) หน้าต่างแก้วันที่
    ===================================================== */

    let dialog = null;

    function closeDialog() {

        if (dialog) {
            dialog.remove();
            dialog = null;
        }
    }

    function openDateEditor(object, anchorElement) {

        if (!object || !EDITABLE_TYPES.includes(object.type)) return;

        closeDialog();

        if (typeof closeObjectMenu === "function") closeObjectMenu();

        const isTask = object.type === "task";

        const range = isTask ? taskRange(object) : null;
        const date = isTask ? null : new Date(object.linkedHeaderDate || timelineStartDate);

        const element = document.createElement("div");

        element.className = "new-category-dialog zg-date-edit";

        element.innerHTML = `
            <div class="ncd-title">${isTask ? "📅 แก้วันที่กล่องงาน" : "📅 แก้วันที่ของเส้น"}</div>
            <div class="zgd-dates ${isTask ? "" : "is-single"}">
                ${isTask ? `
                <div>
                    <div class="ncd-label">วันเริ่มต้น (ขอบซ้าย)</div>
                    <input type="date" class="zgd-start" value="${formatDateInputValue(range.start)}">
                </div>
                <div>
                    <div class="ncd-label">วันสิ้นสุด (ขอบขวา)</div>
                    <input type="date" class="zgd-end" value="${formatDateInputValue(range.end)}">
                </div>` : `
                <div>
                    <div class="ncd-label">วันที่</div>
                    <input type="date" class="zgd-start" value="${formatDateInputValue(date)}">
                </div>`}
            </div>
            <div class="zgd-summary"></div>
            <div class="zgd-hint">${isTask ? "เคล็ดลับ: คลิกกล่องแล้วกด ← → เลื่อนทีละวัน · Shift + ← → ยืด/หด · ↑ ↓ ย้ายแถว" : "เคล็ดลับ: คลิกเส้นแล้วกด ← → เลื่อนทีละวัน"}</div>
            <div class="ncd-actions">
                <button type="button" class="zgd-cancel">ยกเลิก</button>
                <button type="button" class="ncd-ok zgd-ok">บันทึก</button>
            </div>
        `;

        const startInput = element.querySelector(".zgd-start");
        const endInput = element.querySelector(".zgd-end");
        const summary = element.querySelector(".zgd-summary");
        const okButton = element.querySelector(".zgd-ok");

        const lastDay = addDaysSafe(timelineStartDate, Math.max(0, timelineTotalDays - 1));

        function read() {

            const start = startInput.value ? parseDateInputValue(startInput.value) : null;
            const end = endInput ? (endInput.value ? parseDateInputValue(endInput.value) : null) : start;

            return { start, end };
        }

        function validate() {

            const { start, end } = read();

            summary.className = "zgd-summary";

            if (!start || !end || isNaN(start) || isNaN(end)) {
                summary.textContent = "กรุณาเลือกวันที่ให้ครบ";
                summary.classList.add("is-error");
                okButton.disabled = true;
                return null;
            }

            if (end < start) {
                summary.textContent = "วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น";
                summary.classList.add("is-error");
                okButton.disabled = true;
                return null;
            }

            okButton.disabled = false;

            const days = diffDays(start, end) + 1;

            summary.textContent = isTask ? `${fmt(start)} → ${fmt(end)} · ${days} วัน` : fmt(start);

            if (start < timelineStartDate || end > lastDay) {
                summary.textContent += " (เลยช่วงตาราง — ขยายเดือนเพื่อให้เห็น)";
                summary.classList.add("is-warn");
            }

            return { start, end };
        }

        function save() {

            const result = validate();

            if (!result) return;

            if (isTask) {
                setTaskRange(object, result.start, result.end);
            } else {
                object.linkedHeaderDate = result.start;
            }

            closeDialog();

            selected.clear();
            selected.add(object.id);
            primaryId = object.id;

            renderObjects();

            flashTip(object);

            if (window.ZGHistory && typeof window.ZGHistory.record === "function") {
                window.ZGHistory.record();
            }
        }

        startInput.addEventListener("change", () => {

            /* เปลี่ยนวันเริ่ม → เลื่อนวันจบตาม (ช่วงวันเท่าเดิม) */
            if (isTask && endInput) {

                const start = startInput.value ? parseDateInputValue(startInput.value) : null;

                if (start && !isNaN(start)) {
                    endInput.value = formatDateInputValue(addDaysSafe(start, range.days - 1));
                }
            }

            validate();
        });

        startInput.addEventListener("input", validate);

        if (endInput) {
            endInput.addEventListener("change", validate);
            endInput.addEventListener("input", validate);
        }

        okButton.addEventListener("click", save);

        element.querySelector(".zgd-cancel").addEventListener("click", closeDialog);

        element.addEventListener("keydown", event => {

            if (event.key === "Enter") {
                event.preventDefault();
                save();
            }

            if (event.key === "Escape") {
                event.stopPropagation();
                closeDialog();
            }
        });

        element.addEventListener("mousedown", event => event.stopPropagation());

        document.body.appendChild(element);

        dialog = element;

        validate();

        /* วางข้าง object */
        const anchor = anchorElement && anchorElement.isConnected
            ? anchorElement
            : elementsOf(object.id).find(node => !node.classList.contains("canvas-object--dateline-line")) || elementsOf(object.id)[0];

        const rect = anchor
            ? anchor.getBoundingClientRect()
            : { left: window.innerWidth / 2, right: window.innerWidth / 2, top: window.innerHeight / 3, bottom: window.innerHeight / 3 };

        const margin = 8;
        const width = element.offsetWidth;
        const height = element.offsetHeight;

        let left = rect.right + margin;

        if (left + width > window.innerWidth - margin) {
            left = rect.left - width - margin;
        }

        left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));

        let top = Math.min(rect.top, window.innerHeight - height - margin);

        top = Math.max(margin, top);

        element.style.left = `${left}px`;
        element.style.top = `${top}px`;

        startInput.focus();
    }

    /* คลิกนอกหน้าต่าง = ปิด */
    document.addEventListener("mousedown", event => {

        if (dialog && !dialog.contains(event.target)) closeDialog();
    });


    /* ดับเบิลคลิก object → แก้วันที่ */
    document.addEventListener("dblclick", event => {

        const target = event.target instanceof Element ? event.target : null;

        if (!target) return;

        const element = target.closest(".canvas-object[data-object-id]");

        if (!element) return;

        /* ดับเบิลคลิกตัวหนังสือ = เลือกคำเพื่อแก้ข้อความ (แบบเดิม) */
        if (target.closest("[contenteditable='true'], [contenteditable='']")) return;

        const object = findObject(element.dataset.objectId);

        if (!object || !EDITABLE_TYPES.includes(object.type)) return;

        event.preventDefault();

        cancelPendingMenu();

        openDateEditor(object, element);
    });


    /* ปุ่ม "📅 แก้วันที่" ในเมนูของ object */
    const originalOpenObjectMenu = openObjectMenu;

    /*
        คลิกครั้งเดียว → รอสักครู่ค่อยเปิดเมนู (ถ้าเป็นดับเบิลคลิก จะเปิดหน้าต่างแก้วันที่แทน)
        เพราะเมนูเปิดทับกล่อง คลิกที่ 2 จะไปโดนเมนูแทน
    */
    const DOUBLE_CLICK_WAIT = 240;

    let pendingMenu = null;

    function cancelPendingMenu() {

        if (pendingMenu) {
            clearTimeout(pendingMenu);
            pendingMenu = null;
        }
    }

    openObjectMenu = function (object, anchorElement) {

        const trigger = window.event;

        /* Shift + คลิก = เลือกหลายชิ้น → ไม่เปิดเมนู */
        if (trigger && trigger.type === "click" && trigger.shiftKey) return;

        if (
            trigger && trigger.type === "click" &&
            object && EDITABLE_TYPES.includes(object.type) &&
            trigger.target instanceof Element && trigger.target.closest(".canvas-object")
        ) {

            /* คลิกที่ 2 ของดับเบิลคลิก → ไม่เปิดเมนู */
            if (trigger.detail >= 2) {
                cancelPendingMenu();
                return;
            }

            const self = this;
            const args = arguments;

            cancelPendingMenu();

            pendingMenu = setTimeout(() => {
                pendingMenu = null;
                openNow.apply(self, args);
            }, DOUBLE_CLICK_WAIT);

            return;
        }

        return openNow.apply(this, arguments);
    };

    function openNow(object, anchorElement) {

        const result = originalOpenObjectMenu.apply(this, arguments);

        try {

            if (object && EDITABLE_TYPES.includes(object.type)) {

                const menu =
                    (typeof activeObjectMenu !== "undefined" && activeObjectMenu) ||
                    document.querySelector("body > .object-menu:last-of-type");

                if (menu && !menu.querySelector(".zg-date-menu-btn")) {

                    const button = document.createElement("button");

                    button.type = "button";
                    button.className = "zg-date-menu-btn";

                    const text = object.type === "task" ? describeTask(object) : fmt(new Date(object.linkedHeaderDate || timelineStartDate));

                    button.textContent = `📅 แก้วันที่ · ${text}`;
                    button.title = "แก้วันที่เป็นตัวเลข (หรือดับเบิลคลิกที่ object)";

                    button.addEventListener("click", event => {

                        event.stopPropagation();

                        openDateEditor(object, anchorElement);
                    });

                    menu.insertBefore(button, menu.firstChild);
                }
            }

        } catch (error) {

            console.error("[object-precise.js]", error);
        }

        return result;
    }

    function describeTask(object) {

        const range = taskRange(object);

        return `${fmt(range.start)} – ${fmt(range.end)}`;
    }


    window.ZGObjectPrecise = {
        openDateEditor: id => openDateEditor(findObject(id)),
        select: id => { selected.clear(); if (id) selected.add(id); primaryId = id || null; paintSelection(); },
        setSelection: ids => { selected.clear(); (ids || []).forEach(id => selected.add(id)); primaryId = ids && ids.length ? ids[ids.length - 1] : null; paintSelection(); },
        getSelectedIds: () => Array.from(selected),
        primaryId: () => primaryId,
        clear: clearSelection
    };

})();
