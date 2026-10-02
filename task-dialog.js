"use strict";

/* =========================================================
   TASK-DIALOG.JS — กำหนดวันที่ก่อนสร้างกล่องงาน
   1) กด "＋ งาน" → หน้าต่างเลือก ชื่องาน / แถว / วันเริ่มต้น (ขอบซ้าย)
      / วันสิ้นสุด (ขอบขวา) → สร้าง กล่องจะวางตรงช่วงวันที่นั้นพอดี
   2) เมนู ⋮ ของหมวดหมู่ → "＋ เพิ่มงานในหมวดนี้" (เลือกแถวในหมวดนั้น)
      เมนู ⋮ ของแถว     → "＋ เพิ่มงานในแถวนี้"
      ใช้หน้าต่างเดียวกับข้อ 1

   ไม่แก้ app.js — โหลดหลัง app.js (ก่อน lang.js)
========================================================= */

(function () {

    const addTaskButton = document.getElementById("addTaskBtn");

    if (!addTaskButton || typeof createTimelineObject !== "function") {

        console.error("[task-dialog.js] ไม่พบปุ่ม ＋ งาน / ฟังก์ชันของ app.js");

        return;
    }

    const DEFAULT_DAYS =
        typeof DEFAULT_TASK_DURATION_DAYS === "number" ? DEFAULT_TASK_DURATION_DAYS : 14;


    /* =====================================================
       STYLE (ใช้หน้าตาเดียวกับหน้าต่าง "เพิ่มหมวดหมู่" ของ app.js)
    ===================================================== */

    const style = document.createElement("style");

    style.textContent = `
.zg-task-dialog { width: 270px; }
.zg-task-dialog select,
.zg-task-dialog input[type="date"] {
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
.zg-task-dialog .zgt-dates {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
}
.zg-task-dialog .zgt-summary {
    font-size: 11px;
    color: #3a8a4f;
    min-height: 14px;
}
.zg-task-dialog .zgt-summary.is-error { color: #d9534f; }
.zg-task-dialog .zgt-summary.is-warn { color: #c77c11; }
.zg-task-dialog .ncd-ok[disabled] { opacity: .5; cursor: default; }

.zg-task-menu-btn {
    width: 100%;
    height: 30px;
    margin: 6px 0 2px;
    border: 1px solid #b9d8c2;
    border-radius: 6px;
    background: #eaf4ed;
    color: #2f7442;
    font-family: inherit;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
}
.zg-task-menu-btn:hover { background: #dcefe2; }

body.zg-dark .zg-task-dialog { background: #222a27; border-color: #3a4440; color: #e3e9e5; }
body.zg-dark .zg-task-dialog select,
body.zg-dark .zg-task-dialog input { background: #2b3330; border-color: #3a4440; color: #e3e9e5; }
body.zg-dark .zg-task-dialog .ncd-actions button { background: #2b3330; border-color: #3a4440; color: #e3e9e5; }
body.zg-dark .zg-task-dialog .ncd-actions .ncd-ok { background: #3a8a4f; border-color: #3a8a4f; color: #ffffff; }
body.zg-dark .zg-task-menu-btn { background: #26372d; border-color: #3a5a44; color: #9fd3ad; }
`;

    document.head.appendChild(style);


    /* =====================================================
       HELPERS
    ===================================================== */

    function rowLabel(category, row, index) {

        const text = (row.text || "").trim();
        const role = (row.role || "").trim();

        const name = text && text !== "type..." ? text : `แถว ${index + 1}`;

        return role && role !== "type..." ? `${name} (${role})` : name;
    }

    function escapeAttr(value) {

        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    /* วันที่ตรงกลางส่วนตารางที่มองเห็นอยู่ */
    function visibleCenterDate() {

        const centerPx =
            timelineViewport.scrollLeft + timelineViewport.clientWidth / 2;

        const offset = clamp(
            Math.round(centerPx / pxPerDay) - Math.floor(DEFAULT_DAYS / 2),
            0,
            Math.max(0, timelineTotalDays - 1)
        );

        return addDays(timelineStartDate, offset);
    }

    function lastTimelineDate() {

        return addDays(timelineStartDate, Math.max(0, timelineTotalDays - 1));
    }


    /* =====================================================
       DIALOG
    ===================================================== */

    let dialog = null;

    function closeDialog() {

        if (dialog && dialog.parentNode) {
            dialog.parentNode.removeChild(dialog);
        }

        dialog = null;
    }


    /**
     * @param {object} options
     *   categoryId  จำกัดเฉพาะแถวในหมวดนี้ (ไม่ใส่ = ทุกหมวด)
     *   rowId       แถวที่เลือกไว้ก่อน
     *   anchorRect  ตำแหน่งที่จะวางหน้าต่าง
     */
    function openDialog(options = {}) {

        closeDialog();

        if (typeof closeCategoryMenu === "function") closeCategoryMenu();
        if (typeof closeRowMenu === "function") closeRowMenu();
        if (typeof closeObjectMenu === "function") closeObjectMenu();

        const list = (options.categoryId
            ? categories.filter(category => category.id === options.categoryId)
            : categories);

        if (!list.length) {
            return;
        }

        let preselect = options.rowId;

        if (!preselect && selectedRowContext) {

            const ok = list.some(category =>
                category.rows.some(row => row.id === selectedRowContext.rowId));

            if (ok) preselect = selectedRowContext.rowId;
        }

        if (!preselect) {
            preselect = list[0].rows[0] && list[0].rows[0].id;
        }

        const optionsHtml = list.map(category => {

            const items = category.rows.map((row, index) => `
                <option value="${escapeAttr(category.id)}|${escapeAttr(row.id)}"
                    ${row.id === preselect ? "selected" : ""}>${escapeAttr(rowLabel(category, row, index))}</option>
            `).join("");

            return list.length > 1 || !options.categoryId
                ? `<optgroup label="${escapeAttr(category.name)}">${items}</optgroup>`
                : items;

        }).join("");

        let start = visibleCenterDate();
        let end = addDays(start, DEFAULT_DAYS - 1);

        /* ชนท้ายตาราง → ถอยวันเริ่มให้ยังได้ช่วงเต็ม */
        if (end > lastTimelineDate()) {
            end = lastTimelineDate();
            start = addDays(end, -(DEFAULT_DAYS - 1));
            if (start < timelineStartDate) start = new Date(timelineStartDate);
        }

        const element = document.createElement("div");

        element.className = "new-category-dialog zg-task-dialog";

        element.innerHTML = `
            <div class="ncd-title">เพิ่มกล่องงาน</div>

            <div>
                <div class="ncd-label">ชื่องาน</div>
                <input type="text" class="zgt-name" value="title" maxlength="120">
            </div>

            <div>
                <div class="ncd-label">แถว</div>
                <select class="zgt-row">${optionsHtml}</select>
            </div>

            <div class="zgt-dates">
                <div>
                    <div class="ncd-label">วันเริ่มต้น (ขอบซ้าย)</div>
                    <input type="date" class="zgt-start" value="${formatDateInputValue(start)}">
                </div>
                <div>
                    <div class="ncd-label">วันสิ้นสุด (ขอบขวา)</div>
                    <input type="date" class="zgt-end" value="${formatDateInputValue(end)}">
                </div>
            </div>

            <div class="zgt-summary"></div>

            <div class="ncd-actions">
                <button type="button" class="zgt-cancel">ยกเลิก</button>
                <button type="button" class="ncd-ok zgt-ok">สร้าง</button>
            </div>
        `;

        const nameInput = element.querySelector(".zgt-name");
        const rowSelect = element.querySelector(".zgt-row");
        const startInput = element.querySelector(".zgt-start");
        const endInput = element.querySelector(".zgt-end");
        const summary = element.querySelector(".zgt-summary");
        const okButton = element.querySelector(".zgt-ok");

        function readDates() {

            if (!startInput.value || !endInput.value) {
                return null;
            }

            return {
                start: parseDateInputValue(startInput.value),
                end: parseDateInputValue(endInput.value)
            };
        }

        function validate() {

            const dates = readDates();

            summary.className = "zgt-summary";

            if (!dates) {
                summary.textContent = "กรุณาเลือกวันที่";
                summary.classList.add("is-error");
                okButton.disabled = true;
                return null;
            }

            const days = daysBetween(dates.start, dates.end) + 1;

            if (days < 1) {
                summary.textContent = "วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น";
                summary.classList.add("is-error");
                okButton.disabled = true;
                return null;
            }

            okButton.disabled = false;

            if (dates.start < timelineStartDate || dates.end > lastTimelineDate()) {
                summary.textContent = `รวม ${days} วัน · บางส่วนอยู่นอกช่วงวันที่ของตาราง`;
                summary.classList.add("is-warn");
            } else {
                summary.textContent = `รวม ${days} วัน`;
            }

            return { ...dates, days };
        }

        /* เลื่อนวันเริ่ม → ถ้าเลยวันสิ้นสุด ให้วันสิ้นสุดตามไป (รักษาจำนวนวันเดิม) */
        let lastDays = daysBetween(start, end) + 1;

        startInput.addEventListener("change", () => {

            const dates = readDates();

            if (dates && dates.end < dates.start) {
                endInput.value = formatDateInputValue(addDays(dates.start, Math.max(0, lastDays - 1)));
            }

            const result = validate();
            if (result) lastDays = result.days;
        });

        endInput.addEventListener("change", () => {
            const result = validate();
            if (result) lastDays = result.days;
        });

        function confirm() {

            const result = validate();

            if (!result) {
                return;
            }

            const [categoryId, rowId] = rowSelect.value.split("|");

            createTask({
                categoryId,
                rowId,
                start: result.start,
                days: result.days,
                text: nameInput.value.trim() || "title"
            });

            closeDialog();
        }

        okButton.addEventListener("click", confirm);
        element.querySelector(".zgt-cancel").addEventListener("click", closeDialog);

        element.addEventListener("keydown", event => {

            if (event.key === "Enter" && event.target.tagName !== "SELECT") {
                event.preventDefault();
                confirm();
            }

            if (event.key === "Escape") {
                event.stopPropagation();
                closeDialog();
            }
        });

        document.body.appendChild(element);

        dialog = element;

        validate();


        const width = element.offsetWidth;
        const height = element.offsetHeight;
        const margin = 6;

        let left;
        let top;

        if (options.besideRect) {

            /* เปิดจากปุ่ม ⋮ → วางข้างปุ่มเลย (ขวาของปุ่ม ถ้าไม่พอไปซ้าย) */
            const rect = options.besideRect;

            left = rect.right + margin;

            if (left + width > window.innerWidth - margin) {
                left = rect.left - width - margin;
            }

            top = rect.top;

        } else {

            /* วางหน้าต่างใต้ปุ่ม ＋ งาน */
            const rect = options.anchorRect || addTaskButton.getBoundingClientRect();

            left = rect.left;
            top = rect.bottom + margin;
        }

        left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));

        if (top + height > window.innerHeight - margin) {
            top = window.innerHeight - height - margin;
        }

        top = Math.max(margin, top);

        element.style.left = `${left}px`;
        element.style.top = `${top}px`;

        nameInput.focus();
        nameInput.select();
    }


    /* คลิกนอกหน้าต่าง = ปิด */
    document.addEventListener("mousedown", event => {

        if (
            dialog &&
            !dialog.contains(event.target) &&
            !event.target.closest("#addTaskBtn, .zg-task-menu-btn")
        ) {
            closeDialog();
        }
    });


    /* =====================================================
       CREATE
    ===================================================== */

    function createTask({ categoryId, rowId, start, days, text }) {

        if (typeof selectRow === "function") {
            selectRow(categoryId, rowId);
        } else {
            selectedRowContext = { categoryId, rowId };
        }

        const object = createTimelineObject("task");

        object.x = dateToLeft(start);
        object.width = Math.max(24, days * pxPerDay);
        object.text = text;

        timelineObjects.push(object);

        renderObjects();


        /* เลื่อนตารางให้เห็นกล่องที่สร้าง */
        const viewLeft = timelineViewport.scrollLeft;
        const viewRight = viewLeft + timelineViewport.clientWidth;

        if (object.x < viewLeft || object.x + Math.min(object.width, 200) > viewRight) {

            timelineViewport.scrollLeft = Math.max(0, object.x - 60);

            if (typeof syncTimelineHeaderScroll === "function") {
                syncTimelineHeaderScroll();
            }
        }

        return object;
    }


    /* =====================================================
       1) ปุ่ม "＋ งาน" → เปิดหน้าต่างแทนการสร้างทันที
    ===================================================== */

    addTaskButton.addEventListener("click", event => {

        event.stopImmediatePropagation();
        event.preventDefault();

        if (dialog) {
            closeDialog();
            return;
        }

        openDialog();

    }, true);


    /* =====================================================
       2) เมนู ⋮ ของหมวดหมู่
    ===================================================== */

    const categoryMenuEl = document.getElementById("categoryMenu");

    if (categoryMenuEl) {

        const button = document.createElement("button");

        button.type = "button";
        button.className = "zg-task-menu-btn";
        button.textContent = "＋ เพิ่มงานในหมวดนี้";

        const title = categoryMenuEl.querySelector(".menu-title");

        if (title && title.nextSibling) {
            categoryMenuEl.insertBefore(button, title.nextSibling);
        } else {
            categoryMenuEl.prepend(button);
        }

        button.addEventListener("click", event => {

            event.stopPropagation();

            const categoryId =
                typeof selectedCategoryId !== "undefined" ? selectedCategoryId : null;

            const besideRect = dotsRect() || categoryMenuEl.getBoundingClientRect();

            if (categoryId) {
                openDialog({ categoryId, besideRect });
            }
        });
    }


    /* =====================================================
       2) เมนู ⋮ ของแถว
    ===================================================== */

    let rowContext = null;

    /* ปุ่ม ⋮ ที่กดล่าสุด (หมวดหมู่ / แถว) ใช้วางหน้าต่างไว้ข้าง ๆ */
    let lastDotsButton = null;

    document.addEventListener("click", event => {

        const dots = event.target.closest && event.target.closest(".category-more-btn, .row-more-btn");

        if (dots) {
            lastDotsButton = dots;
        }

    }, true);

    function dotsRect() {

        return lastDotsButton && lastDotsButton.isConnected
            ? lastDotsButton.getBoundingClientRect()
            : null;
    }

    document.addEventListener("click", event => {

        const button = event.target.closest && event.target.closest(".row-more-btn");

        if (!button) {
            return;
        }

        const rowElement = button.closest(".party-row");

        rowContext = rowElement
            ? { categoryId: rowElement.dataset.categoryId, rowId: rowElement.dataset.rowId }
            : null;

    }, true);

    new MutationObserver(records => {

        records.forEach(record => {

            record.addedNodes.forEach(node => {

                if (
                    node.nodeType !== 1 ||
                    !node.classList.contains("row-action-menu") ||
                    node.querySelector(".zg-task-menu-btn") ||
                    !rowContext
                ) {
                    return;
                }

                const context = rowContext;

                const button = document.createElement("button");

                button.type = "button";
                button.className = "zg-task-menu-btn";
                button.textContent = "＋ เพิ่มงานในแถวนี้";

                node.prepend(button);

                button.addEventListener("click", event => {

                    event.stopPropagation();

                    const besideRect = dotsRect() || node.getBoundingClientRect();

                    openDialog({
                        categoryId: context.categoryId,
                        rowId: context.rowId,
                        besideRect
                    });
                });
            });
        });

    }).observe(document.body, { childList: true });


    window.ZGTaskDialog = {
        open: openDialog,
        create: createTask
    };

})();
