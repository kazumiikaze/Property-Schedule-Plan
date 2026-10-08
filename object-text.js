"use strict";

/* =========================================================
   OBJECT-TEXT.JS — พิมพ์ / แก้ข้อความใน object ให้ง่ายขึ้น

   1) คลิกเพื่อพิมพ์ (แบบ B)
        - คลิกครั้งแรก = เลือกกล่อง + เปิดเมนู (เหมือนเดิม)
        - คลิกซ้ำที่กล่องเดิมอีกครั้ง (ตรงไหนก็ได้ ยกเว้นขอบที่ใช้ยืด)
          = เข้าโหมดพิมพ์ทันที เคอร์เซอร์อยู่ตรงจุดที่คลิก
        - คลิกโดนตัวหนังสือตรง ๆ = พิมพ์ได้เลยเหมือนเดิม
        - ดับเบิลคลิกที่ว่างในกล่อง = แก้วันที่ (object-precise.js) เหมือนเดิม
      เมนูของ object จะไม่เปิดทับกล่อง (ย้ายไปด้านข้าง) ให้คลิกซ้ำได้
   2) เห็นชัดว่ากำลังพิมพ์: ชี้ข้อความ = เคอร์เซอร์ I · พิมพ์อยู่ = พื้นสว่าง + กรอบเขียว
   3) ข้อความเริ่มต้น ("title", "type..." ฯลฯ) ถูกเลือกทั้งหมดอัตโนมัติ → พิมพ์ทับได้เลย
   4) Enter = เสร็จ · Shift+Enter = ขึ้นบรรทัดใหม่ · Esc = ยกเลิก (คืนข้อความเดิม)
   5) ช่องพิมพ์ใหญ่: ปุ่ม "✏️ แก้ข้อความ" ในเมนู object
      และกล่องเล็ก / กล่องที่ซ่อนหัวข้อ → คลิกซ้ำแล้วเปิดช่องพิมพ์ใหญ่ให้เลย
   7) ป้ายเส้นวันที่ ใช้ข้อ 2–5 ด้วย · เส้นแนวนอน ดับเบิลคลิก = ช่องพิมพ์ใหญ่

   ไม่แก้ app.js / style.css — โหลดหลัง object-precise.js
========================================================= */

(function () {

    if (typeof renderObjects !== "function") {

        console.error("[object-text.js] ไม่พบฟังก์ชันของ app.js");

        return;
    }

    /* ช่องพิมพ์ใน object */
    const EDITABLE = ".canvas-object-label[contenteditable='true'], .dateline-chip-text[contenteditable='true']";

    /* ข้อความเริ่มต้นที่ควรพิมพ์ทับ */
    const PLACEHOLDERS = ["title", "type...", "category", "เส้นแนวนอน", "รายละเอียด...", "header"];

    /* กล่องเล็กกว่านี้ → ใช้ช่องพิมพ์ใหญ่ */
    const SMALL_W = 70;
    const SMALL_H = 22;

    const CLICK_WAIT = 240;

    const TEXT_TYPES = ["task", "dateline", "hline"];


    /* =====================================================
       STYLE
    ===================================================== */

    const style = document.createElement("style");

    style.textContent = `
/* 2) โหมดพิมพ์ */
.canvas-object .canvas-object-label[contenteditable="true"],
.canvas-object .dateline-chip-text[contenteditable="true"] {
    cursor: text;
    -webkit-user-select: text;
    user-select: text;
    border-radius: 3px;
    transition: background-color .12s ease, box-shadow .12s ease;
}
.canvas-object--task .canvas-object-label[contenteditable="true"] { padding: 1px 3px; min-width: 14px; }
.canvas-object.zg-obj-selected .canvas-object-label-wrap { cursor: text; }
.canvas-object .canvas-object-label[contenteditable="true"]:hover,
.canvas-object .dateline-chip-text[contenteditable="true"]:hover { box-shadow: 0 0 0 1px rgba(58, 138, 79, .45); }
.canvas-object .canvas-object-label[contenteditable="true"]:focus,
.canvas-object .dateline-chip-text[contenteditable="true"]:focus {
    background: rgba(255, 255, 255, .96);
    color: #1e2924 !important;
    box-shadow: 0 0 0 2px #3a8a4f;
    outline: none;
    text-overflow: clip;
}
.canvas-object.zg-text-editing { overflow: visible !important; z-index: 600 !important; }

/* 5) ช่องพิมพ์ใหญ่ */
.zg-text-edit { width: 320px; }
.zg-text-edit textarea {
    width: 100%;
    min-height: 96px;
    box-sizing: border-box;
    padding: 8px 10px;
    border: 1px solid #dde3e0;
    border-radius: 8px;
    font-family: inherit;
    font-size: 14px;
    line-height: 1.5;
    color: inherit;
    background: #ffffff;
    resize: vertical;
}
.zg-text-edit textarea:focus { outline: none; border-color: #8cc79c; box-shadow: 0 0 0 3px rgba(140, 199, 156, .25); }
.zg-text-edit .zgx-hint { color: #8a938d; font-size: 10px; line-height: 1.5; }

.zg-text-menu-btn {
    width: 100%;
    height: 30px;
    margin: 0 0 8px;
    border: 1px solid #c9d8ee;
    border-radius: 6px;
    background: #eef4fc;
    color: #2d5f9a;
    font-family: inherit;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
}
.zg-text-menu-btn:hover { background: #e2ecf9; }

body.zg-dark .zg-text-edit { background: #222a27; border-color: #3a4440; color: #e3e9e5; }
body.zg-dark .zg-text-edit textarea { background: #2b3330; border-color: #3a4440; color: #e3e9e5; }
body.zg-dark .zg-text-edit .ncd-actions button { background: #2b3330; border-color: #3a4440; color: #e3e9e5; }
body.zg-dark .zg-text-edit .ncd-actions .ncd-ok { background: #3a8a4f; border-color: #3a8a4f; color: #ffffff; }
body.zg-dark .zg-text-menu-btn { background: #23303d; border-color: #3a4a5c; color: #9cc3ef; }

body.zg-exporting .canvas-object .canvas-object-label,
body.zg-exporting .canvas-object .dateline-chip-text { box-shadow: none !important; }
`;

    document.head.appendChild(style);


    /* =====================================================
       HELPERS
    ===================================================== */

    function findObject(id) {
        return timelineObjects.find(object => object.id === id) || null;
    }

    function objectElementOf(node) {
        return node instanceof Element ? node.closest(".canvas-object[data-object-id]") : null;
    }

    function isPlaceholder(text) {

        const value = String(text || "").trim().toLowerCase();

        return !value || PLACEHOLDERS.includes(value);
    }

    function recordHistory() {

        if (window.ZGHistory && typeof window.ZGHistory.record === "function") {
            window.ZGHistory.record();
        }
    }

    function selectAll(element) {

        const range = document.createRange();

        range.selectNodeContents(element);

        const selection = window.getSelection();

        selection.removeAllRanges();
        selection.addRange(range);
    }

    function placeCaret(element, clientX, clientY) {

        let range = null;

        if (document.caretRangeFromPoint) {

            range = document.caretRangeFromPoint(clientX, clientY);

        } else if (document.caretPositionFromPoint) {

            const position = document.caretPositionFromPoint(clientX, clientY);

            if (position) {
                range = document.createRange();
                range.setStart(position.offsetNode, position.offset);
            }
        }

        if (!range || !element.contains(range.startContainer)) {

            range = document.createRange();
            range.selectNodeContents(element);
            range.collapse(false);

        } else {

            range.collapse(true);
        }

        const selection = window.getSelection();

        selection.removeAllRanges();
        selection.addRange(range);
    }


    /* =====================================================
       2) 3) 4) โหมดพิมพ์ในกล่อง
    ===================================================== */

    let editing = null;   // { element, object, original }

    document.addEventListener("focusin", event => {

        const target = event.target;

        if (!(target instanceof Element) || !target.matches(EDITABLE)) return;

        const holder = objectElementOf(target);
        const object = holder ? findObject(holder.dataset.objectId) : null;

        editing = { element: target, holder, object, original: target.innerText };

        if (holder) holder.classList.add("zg-text-editing");

        /* 3) ข้อความเริ่มต้น → เลือกทั้งหมด พิมพ์ทับได้ทันที */
        if (isPlaceholder(target.innerText)) {
            requestAnimationFrame(() => {
                if (document.activeElement === target) selectAll(target);
            });
        }

    }, true);

    document.addEventListener("focusout", event => {

        const target = event.target;

        if (!(target instanceof Element) || !target.matches(EDITABLE)) return;

        const holder = objectElementOf(target);

        if (holder) holder.classList.remove("zg-text-editing");

        const changed = editing && editing.element === target && target.innerText !== editing.original;

        editing = null;

        if (changed) setTimeout(recordHistory, 0);

    }, true);

    document.addEventListener("keydown", event => {

        const target = event.target;

        if (!(target instanceof Element) || !target.matches(EDITABLE)) return;

        if (event.isComposing) return;

        /* 4) Enter = เสร็จ (Shift+Enter = ขึ้นบรรทัดใหม่) */
        if (event.key === "Enter" && !event.shiftKey) {

            event.preventDefault();
            event.stopPropagation();

            target.blur();

            return;
        }

        /* 4) Esc = ยกเลิก คืนข้อความเดิม */
        if (event.key === "Escape" && editing && editing.element === target) {

            event.preventDefault();

            const original = editing.original;

            target.innerText = original;

            if (editing.object) editing.object.text = original;

            /* ให้ app.js ปรับความสูงกล่องกลับ */
            target.dispatchEvent(new Event("input", { bubbles: true }));

            editing.original = target.innerText;

            target.blur();
        }

    }, true);


    /* =====================================================
       1) คลิกซ้ำที่กล่องที่เลือกอยู่ → พิมพ์
    ===================================================== */

    let press = null;
    let pendingEdit = null;

    function cancelPendingEdit() {

        if (pendingEdit) {
            clearTimeout(pendingEdit);
            pendingEdit = null;
        }
    }

    /* window (capture) ทำงานก่อน document → รู้ว่า "เลือกไว้ก่อนแล้ว" หรือยัง */
    window.addEventListener("mousedown", event => {

        const holder = objectElementOf(event.target);

        if (!holder || event.button !== 0) {
            press = null;
            return;
        }

        press = {
            id: holder.dataset.objectId,
            wasSelected: holder.classList.contains("zg-obj-selected"),
            x: event.clientX,
            y: event.clientY
        };

    }, true);

    window.addEventListener("click", event => {

        const info = press;

        press = null;

        if (!info || !info.wasSelected || event.detail !== 1) return;

        const target = event.target instanceof Element ? event.target : null;

        const holder = objectElementOf(target);

        if (!holder || holder.dataset.objectId !== info.id) return;

        /* ลาก / ยืด แล้วปล่อย → ไม่ใช่การคลิก */
        if (Math.abs(event.clientX - info.x) + Math.abs(event.clientY - info.y) > 4) return;

        /* ตรงที่จับยืด / ปุ่ม / ตัวหนังสือที่พิมพ์ได้อยู่แล้ว → ปล่อยตามเดิม */
        if (target.closest(".canvas-object-handle, button, [contenteditable='true']")) return;

        const object = findObject(info.id);

        if (!object || !TEXT_TYPES.includes(object.type) || object.type === "hline") return;

        if (holder.classList.contains("canvas-object--dateline-line")) return;

        event.preventDefault();
        event.stopImmediatePropagation();

        const x = event.clientX;
        const y = event.clientY;

        /* รอเผื่อเป็นดับเบิลคลิก (แก้วันที่) */
        cancelPendingEdit();

        pendingEdit = setTimeout(() => {

            pendingEdit = null;

            startEditing(object, holder.isConnected ? holder : document.querySelector(`.canvas-object[data-object-id="${CSS.escape(object.id)}"]:not(.canvas-object--dateline-line)`), x, y);

        }, CLICK_WAIT);

    }, true);

    window.addEventListener("dblclick", cancelPendingEdit, true);

    function startEditing(object, holder, x, y) {

        if (!holder) return;

        if (typeof closeObjectMenu === "function") closeObjectMenu();

        const editable = holder.querySelector(EDITABLE);

        const rect = holder.getBoundingClientRect();

        const tooSmall = object.type === "task" && (rect.width < SMALL_W || rect.height < SMALL_H);

        if (!editable || tooSmall) {
            openTextEditor(object, holder);
            return;
        }

        editable.focus();

        if (isPlaceholder(editable.innerText)) {
            selectAll(editable);
        } else {
            placeCaret(editable, x, y);
        }
    }


    /* =====================================================
       เมนูของ object ไม่เปิดทับกล่อง (ให้คลิกซ้ำได้)
    ===================================================== */

    function selectedHolder() {

        /* เลือกหลายชิ้น → ใช้ชิ้นที่คลิกล่าสุด */
        const primary = window.ZGObjectPrecise && window.ZGObjectPrecise.primaryId && window.ZGObjectPrecise.primaryId();

        if (primary) {

            const nodes = Array.from(document.querySelectorAll(`.canvas-object[data-object-id="${CSS.escape(primary)}"]`));

            const node = nodes.find(item => !item.classList.contains("canvas-object--dateline-line")) || nodes[0];

            if (node) return node;
        }

        return document.querySelector(".canvas-object.zg-obj-selected:not(.canvas-object--dateline-line)") ||
            document.querySelector(".canvas-object.zg-obj-selected");
    }

    function overlaps(a, b) {
        return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    }

    function keepMenuBeside(menu) {

        const holder = selectedHolder();

        if (!holder || !menu.isConnected) return;

        const target = holder.getBoundingClientRect();
        const box = menu.getBoundingClientRect();

        if (!overlaps(target, box)) return;

        const margin = 10;

        let left = target.right + margin;

        if (left + box.width > window.innerWidth - 6) {
            left = target.left - box.width - margin;
        }

        if (left < 6) return;   /* ไม่มีที่ด้านข้าง → ปล่อยไว้ */

        const top = Math.max(6, Math.min(target.top, window.innerHeight - box.height - 6));

        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;
    }


    /* =====================================================
       5) ช่องพิมพ์ใหญ่ + ปุ่มในเมนู
    ===================================================== */

    let dialog = null;

    function closeDialog() {

        if (dialog) {
            dialog.remove();
            dialog = null;
        }
    }

    function openTextEditor(object, anchor) {

        if (!object || !TEXT_TYPES.includes(object.type)) return;

        closeDialog();

        if (typeof closeObjectMenu === "function") closeObjectMenu();

        const element = document.createElement("div");

        element.className = "new-category-dialog zg-text-edit";

        element.innerHTML = `
            <div class="ncd-title">✏️ แก้ข้อความ</div>
            <textarea spellcheck="false"></textarea>
            <div class="zgx-hint">Enter = บันทึก · Shift+Enter = ขึ้นบรรทัดใหม่ · Esc = ยกเลิก</div>
            <div class="ncd-actions">
                <button type="button" class="zgx-cancel">ยกเลิก</button>
                <button type="button" class="ncd-ok zgx-ok">บันทึก</button>
            </div>
        `;

        const textarea = element.querySelector("textarea");

        textarea.value = object.text || "";

        function save() {

            object.text = textarea.value;

            closeDialog();

            renderObjects();

            recordHistory();
        }

        element.querySelector(".zgx-ok").addEventListener("click", save);
        element.querySelector(".zgx-cancel").addEventListener("click", closeDialog);

        textarea.addEventListener("keydown", event => {

            if (event.isComposing) return;

            if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                save();
            }

            if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                closeDialog();
            }
        });

        element.addEventListener("mousedown", event => event.stopPropagation());

        document.body.appendChild(element);

        dialog = element;

        /* วางข้าง object */
        const holder = anchor && anchor.isConnected
            ? anchor
            : document.querySelector(`.canvas-object[data-object-id="${CSS.escape(object.id)}"]:not(.canvas-object--dateline-line)`);

        const rect = holder
            ? holder.getBoundingClientRect()
            : { left: window.innerWidth / 2, right: window.innerWidth / 2, top: window.innerHeight / 3 };

        const margin = 8;
        const width = element.offsetWidth;
        const height = element.offsetHeight;

        let left = rect.right + margin;

        if (left + width > window.innerWidth - margin) left = rect.left - width - margin;

        left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));

        const top = Math.max(margin, Math.min(rect.top, window.innerHeight - height - margin));

        element.style.left = `${left}px`;
        element.style.top = `${top}px`;

        textarea.focus();

        if (isPlaceholder(textarea.value)) {
            textarea.select();
        } else {
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        }
    }

    document.addEventListener("mousedown", event => {

        if (dialog && !dialog.contains(event.target)) closeDialog();
    });


    /* 7) ดับเบิลคลิกเส้นแนวนอน → ช่องพิมพ์ใหญ่ */
    document.addEventListener("dblclick", event => {

        const holder = objectElementOf(event.target);

        if (!holder) return;

        const object = findObject(holder.dataset.objectId);

        if (!object || object.type !== "hline") return;

        event.preventDefault();

        openTextEditor(object, holder);
    });


    /* ปุ่ม "✏️ แก้ข้อความ" ในเมนูของ object + จัดเมนูไม่ให้ทับกล่อง */
    function menuObject(menu) {

        const holder = selectedHolder();

        if (holder) return findObject(holder.dataset.objectId);

        const id = menu.dataset.zgObjectColor || menu.dataset.zgTimgId;

        return id ? findObject(id) : null;
    }

    function enhanceMenu(menu) {

        if (menu.dataset.zgTextMenu) return;

        menu.dataset.zgTextMenu = "1";

        const object = menuObject(menu);

        if (object && TEXT_TYPES.includes(object.type) && !menu.querySelector(".zg-text-menu-btn")) {

            const button = document.createElement("button");

            button.type = "button";
            button.className = "zg-text-menu-btn";
            button.textContent = "✏️ แก้ข้อความ";
            button.title = "เปิดช่องพิมพ์ใหญ่ (หรือคลิกที่กล่องซ้ำอีกครั้งเพื่อพิมพ์ในกล่อง)";

            button.addEventListener("click", event => {

                event.stopPropagation();

                openTextEditor(object, selectedHolder());
            });

            const dateButton = menu.querySelector(".zg-date-menu-btn");

            if (dateButton) {
                dateButton.insertAdjacentElement("afterend", button);
            } else {
                menu.insertBefore(button, menu.firstChild);
            }
        }

        /* รอให้ไฟล์อื่นจัดตำแหน่ง/ขนาดเมนูเสร็จก่อน */
        requestAnimationFrame(() => requestAnimationFrame(() => keepMenuBeside(menu)));
    }

    new MutationObserver(records => {

        records.forEach(record => record.addedNodes.forEach(node => {

            if (node instanceof Element && node.classList.contains("object-menu")) {

                /* ไฟล์อื่นเติมปุ่มในเมนูต่อจาก app.js → รอรอบถัดไปค่อยเพิ่ม */
                setTimeout(() => enhanceMenu(node), 0);
            }
        }));

    }).observe(document.body, { childList: true });


    window.ZGObjectText = {
        openEditor: id => openTextEditor(findObject(id)),
        isEditing: () => Boolean(editing)
    };

})();
