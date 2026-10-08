"use strict";

/* =========================================================
   ROW-EDIT.JS — พิมพ์ชื่อแถว / บทบาท / ชื่อหมวดหมู่ ให้ง่ายและเป็นระบบ

   1) คำแนะนำจาง ๆ แทน "type..." / "Category"
        ช่องว่างจะขึ้นตัวเทา เช่น "ชื่อบริษัท / ผู้ติดต่อ"
        พิมพ์ทับได้เลย · ไม่ติดไปตอน Export / พิมพ์
   2) ขยายตอนพิมพ์: ตัวหนังสือใหญ่ 13px + พื้นขาว + กรอบเขียว
   3) พิมพ์ต่อเนื่องแบบ Excel
        Enter        เสร็จ → ไปช่องชื่อของแถวถัดไป
                     (แถวสุดท้ายของหมวด → ถามว่าจะเพิ่มแถวใหม่ไหม)
        Tab          ชื่อ → บทบาท → ชื่อแถวถัดไป
        Shift+Tab    ย้อนกลับ
        Shift+Enter  ขึ้นบรรทัดใหม่ (เฉพาะชื่อแถว)
        Esc          ยกเลิก คืนข้อความเดิม
      วางข้อความ = วางเป็นตัวหนังสือธรรมดา (ไม่ติดสี/ฟอนต์จากที่อื่น)
   4) ช่วยเติมคำ: รายชื่อ/บทบาท/หมวดที่เคยใช้ในทุกแผน + บทบาทสำเร็จรูป
        ↑ ↓ เลือก · Enter / คลิก = ใช้คำนั้น · Esc = ปิดรายการ
        บทบาท / หมวดหมู่: พิมพ์คำใหม่ → "＋ เพิ่ม ... ในรายการ" (จำไว้ในเบราว์เซอร์)
                          ชี้คำแล้วกด ✕ = เอาออกจากรายการ

   ไม่แก้ app.js / style.css — โหลดหลัง app.js
========================================================= */

(function () {

    const PLANS_KEY = "zg-property-schedule-plans-v1";

    const FIELDS = {
        main: {
            selector: ".party-main[contenteditable='true']",
            placeholder: "ชื่อบริษัท / ผู้ติดต่อ",
            defaults: ["type..."],
            multiline: true
        },
        role: {
            selector: ".party-role[contenteditable='true']",
            placeholder: "บทบาท (เช่น Seller / Buyer)",
            defaults: ["type..."],
            multiline: false
        },
        category: {
            selector: ".category-name[contenteditable='true']",
            placeholder: "ชื่อหมวดหมู่",
            defaults: ["Category"],
            multiline: false
        }
    };

    const ALL_SELECTOR = Object.values(FIELDS).map(field => field.selector).join(", ");

    const ROLE_PRESETS = [
        "Seller", "Buyer", "Agent", "Broker", "Land Office", "IEAT", "Bank", "Lawyer", "Consultant", "Contractor",
        "ผู้ขาย", "ผู้ซื้อ", "นายหน้า", "สำนักงานที่ดิน", "กนอ.", "ธนาคาร", "ทนายความ", "ผู้รับเหมา"
    ];

    const CATEGORY_PRESETS = ["Contact", "Payment", "IEAT / Land Office", "Document", "Permit", "Construction", "Handover"];


    /* =====================================================
       STYLE
    ===================================================== */

    const style = document.createElement("style");

    style.textContent = `
/* 1) คำแนะนำจาง ๆ */
.zg-ph:empty::before {
    content: attr(data-placeholder);
    color: #a9b2ad;
    font-style: italic;
    font-weight: 400;
    pointer-events: none;
}
.category-name.zg-ph:empty::before { color: rgba(255, 255, 255, .7); }
body.zg-exporting .zg-ph:empty::before { content: none !important; }

.party-main[contenteditable="true"],
.party-role[contenteditable="true"],
.category-name[contenteditable="true"] { cursor: text; border-radius: 3px; }
.party-main[contenteditable="true"]:hover,
.party-role[contenteditable="true"]:hover { box-shadow: 0 0 0 1px rgba(58, 138, 79, .4); }

/* 2) ขยายตอนพิมพ์ */
.zg-rowedit-host { overflow: visible !important; z-index: 6 !important; }
.party-main.zg-rowedit-on,
.party-role.zg-rowedit-on,
.category-name.zg-rowedit-on {
    position: relative;
    z-index: 7;
    font-size: 13px !important;
    line-height: 1.35 !important;
    font-weight: 600;
    padding: 3px 6px !important;
    background: #ffffff !important;
    color: #1e2924 !important;
    border-radius: 5px;
    box-shadow: 0 0 0 2px #3a8a4f, 0 4px 14px rgba(0, 0, 0, .18) !important;
    outline: none !important;
    white-space: normal;
    overflow: visible !important;
    text-overflow: clip !important;
    -webkit-line-clamp: unset !important;
    max-height: none !important;
}
.party-role.zg-rowedit-on { font-weight: 400; }
.zg-rowedit-on.zg-ph:empty::before { color: #9aa49f; }

/* 4) รายการคำแนะนำ */
.zg-suggest {
    position: fixed;
    z-index: 26500;
    min-width: 230px;
    max-width: 380px;
    display: flex;
    flex-direction: column;
    border: 1px solid #e1e7e3;
    border-radius: 12px;
    background: #ffffff;
    box-shadow: 0 16px 40px rgba(15, 35, 25, .18), 0 2px 6px rgba(0, 0, 0, .06);
    font: 13px/1.4 Arial, Helvetica, sans-serif;
    color: #1e2924;
    overflow: hidden;
    animation: zgSuggestIn .12s ease-out;
}
@keyframes zgSuggestIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
.zg-suggest-head {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 9px 12px 7px;
    border-bottom: 1px solid #eef2ef;
    background: linear-gradient(#f8fbf9, #ffffff);
    color: #4f5b55;
    font-size: 11.5px;
    font-weight: 700;
}
.zg-suggest-head-icon {
    width: 22px;
    height: 22px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 7px;
    background: #e7f3ea;
    font-size: 12px;
}
.zg-suggest-count {
    margin-left: auto;
    padding: 1px 7px;
    border-radius: 999px;
    background: #eef2ef;
    color: #7a857f;
    font-size: 10px;
    font-weight: 700;
}
.zg-suggest-list { max-height: 252px; overflow-y: auto; padding: 4px; }
.zg-suggest-list::-webkit-scrollbar { width: 8px; }
.zg-suggest-list::-webkit-scrollbar-thumb { background: #d3dbd6; border-radius: 8px; border: 2px solid #ffffff; }
.zg-suggest-item {
    position: relative;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 10px;
    border-radius: 8px;
    cursor: pointer;
    white-space: nowrap;
}
.zg-suggest-text { overflow: hidden; text-overflow: ellipsis; flex: 1; min-width: 0; }
.zg-suggest-item:hover { background: #f2f7f3; }
.zg-suggest-item.is-active { background: #e4f2e8; box-shadow: inset 3px 0 0 #3a8a4f; }
.zg-suggest-item mark { background: transparent; color: #2f7442; font-weight: 700; }
.zg-suggest-tag {
    flex: 0 0 auto;
    padding: 1px 6px;
    border-radius: 999px;
    background: #f1f4f2;
    color: #8a948f;
    font-size: 10px;
}
.zg-suggest-tag.is-custom { background: #e8f0fb; color: #3b6aa8; }
.zg-suggest-del {
    flex: 0 0 auto;
    width: 20px;
    height: 20px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    color: #a3aca7;
    font-size: 11px;
    opacity: 0;
    transition: opacity .1s ease, background-color .1s ease, color .1s ease;
}
.zg-suggest-item:hover .zg-suggest-del,
.zg-suggest-item.is-active .zg-suggest-del { opacity: 1; }
.zg-suggest-del:hover { background: #fdecea; color: #c0392b; }
.zg-suggest-add { color: #2f7442; }
.zg-suggest-add b { font-weight: 700; }
.zg-suggest-plus {
    width: 20px;
    height: 20px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    background: #3a8a4f;
    color: #ffffff;
    font-size: 12px;
    font-weight: 700;
}
.zg-suggest-hint {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    border-top: 1px solid #eef2ef;
    background: #fafcfb;
    color: #8f9893;
    font-size: 10.5px;
}
.zg-suggest-hint kbd {
    padding: 0 4px;
    border: 1px solid #d6ddd9;
    border-bottom-width: 2px;
    border-radius: 4px;
    background: #ffffff;
    color: #4f5b55;
    font: 700 9.5px/1.5 Arial, Helvetica, sans-serif;
}

/* 3) ถามเพิ่มแถว */
.zg-addrow-ask {
    position: fixed;
    z-index: 26500;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border: 1px solid #b9d8c2;
    border-radius: 10px;
    background: #ffffff;
    box-shadow: 0 10px 28px rgba(0, 0, 0, .16);
    font: 12.5px/1.4 Arial, Helvetica, sans-serif;
    color: #1e2924;
}
.zg-addrow-ask button {
    height: 28px;
    padding: 0 10px;
    border: 1px solid #dde3e0;
    border-radius: 7px;
    background: #ffffff;
    font: inherit;
    cursor: pointer;
}
.zg-addrow-ask button.is-ok { background: #3a8a4f; border-color: #3a8a4f; color: #ffffff; font-weight: 700; }
.zg-addrow-ask kbd { padding: 0 4px; border: 1px solid #cfd6d2; border-radius: 4px; font-size: 10px; background: #f6f8f7; color: #1e2924; }
.zg-addrow-ask button.is-ok kbd { background: rgba(255, 255, 255, .22); border-color: rgba(255, 255, 255, .5); color: #ffffff; }

body.zg-dark .zg-suggest,
body.zg-dark .zg-addrow-ask { background: #222a27; border-color: #3a4440; color: #e3e9e5; }
body.zg-dark .zg-suggest-item:hover { background: #26302c; }
body.zg-dark .zg-suggest-item.is-active { background: #2b3a31; }
body.zg-dark .zg-suggest-head,
body.zg-dark .zg-suggest-hint { background: #1f2623; border-color: #333c38; color: #a5b0aa; }
body.zg-dark .zg-suggest-head-icon { background: #26372d; }
body.zg-dark .zg-suggest-count,
body.zg-dark .zg-suggest-tag { background: #2b3330; color: #a5b0aa; }
body.zg-dark .zg-suggest-hint kbd { background: #2b3330; border-color: #3a4440; color: #c2ccc6; }
body.zg-dark .zg-addrow-ask button:not(.is-ok) { background: #2b3330; border-color: #3a4440; color: #e3e9e5; }
body.zg-exporting .zg-suggest,
body.zg-exporting .zg-addrow-ask { display: none !important; }
`;

    document.head.appendChild(style);


    /* =====================================================
       HELPERS
    ===================================================== */

    function fieldOf(element) {

        if (!(element instanceof Element)) return null;

        for (const key of Object.keys(FIELDS)) {
            if (element.matches(FIELDS[key].selector)) return key;
        }

        return null;
    }

    function cleanText(text) {
        return String(text || "").replace(/ /g, " ").trim();
    }

    function isDefault(key, text) {

        const value = cleanText(text);

        return !value || FIELDS[key].defaults.includes(value);
    }

    /* ใส่ข้อความ แล้วแจ้ง app.js (ฟัง input) ให้บันทึกลงข้อมูล */
    function setText(element, text) {

        element.textContent = text;

        element.dispatchEvent(new Event("input", { bubbles: true }));
    }

    function caretToEnd(element) {

        const range = document.createRange();

        range.selectNodeContents(element);
        range.collapse(false);

        const selection = window.getSelection();

        selection.removeAllRanges();
        selection.addRange(range);
    }

    function selectAll(element) {

        const range = document.createRange();

        range.selectNodeContents(element);

        const selection = window.getSelection();

        selection.removeAllRanges();
        selection.addRange(range);
    }

    function rowElementOf(element) {
        return element.closest(".party-row");
    }

    /* แถวทั้งหมดเรียงจากบนลงล่าง (ข้ามหมวด) */
    function orderedRows() {

        const list = [];

        (typeof categories !== "undefined" ? categories : []).forEach(category => {
            category.rows.forEach(row => list.push({ categoryId: category.id, rowId: row.id }));
        });

        return list;
    }

    function findField(rowId, key) {

        const row = document.querySelector(`.party-row[data-row-id="${CSS.escape(rowId)}"]`);

        return row ? row.querySelector(FIELDS[key].selector) : null;
    }

    function findCategoryField(categoryId) {

        const holder = document.querySelector(`[data-category-id="${CSS.escape(categoryId)}"] .category-name[contenteditable='true']`);

        if (holder) return holder;

        /* หาจากลำดับ (เผื่อ element หมวดไม่มี data-category-id) */
        const index = categories.findIndex(category => category.id === categoryId);

        return document.querySelectorAll(".category-name[contenteditable='true']")[index] || null;
    }

    function categoryIdOfName(element) {

        const holder = element.closest("[data-category-id]");

        if (holder) return holder.dataset.categoryId;

        const index = Array.from(document.querySelectorAll(".category-name[contenteditable='true']")).indexOf(element);

        return categories[index] ? categories[index].id : null;
    }

    /* ทำให้ช่องนั้นมองเห็น (เลื่อนตารางขึ้นลงถ้าอยู่นอกจอ) แล้วโฟกัส */
    function focusField(element, mode) {

        if (!element) return;

        const area = document.getElementById("scheduleArea");

        if (area && typeof verticalScrollY === "number" && typeof updateVerticalPosition === "function") {

            const rect = element.getBoundingClientRect();
            const box = area.getBoundingClientRect();

            let shift = 0;

            if (rect.bottom > box.bottom) shift = rect.bottom - box.bottom + 6;
            if (rect.top < box.top) shift = rect.top - box.top - 6;

            if (shift) {

                const max = typeof maxVerticalScroll === "number" ? maxVerticalScroll : Infinity;

                verticalScrollY = Math.max(0, Math.min(max, verticalScrollY + shift));

                updateVerticalPosition();

                if (typeof updateScrollbar === "function") updateScrollbar();
            }
        }

        element.focus();

        if (mode === "end") caretToEnd(element); else selectAll(element);
    }


    /* =====================================================
       1) คำแนะนำจาง ๆ
    ===================================================== */

    function decorate(element) {

        const key = fieldOf(element);

        if (!key) return;

        element.classList.add("zg-ph");
        element.dataset.placeholder = FIELDS[key].placeholder;

        /* ข้อความเริ่มต้น → แสดงเป็นช่องว่าง (ข้อมูลเดิมไม่เปลี่ยนจนกว่าจะพิมพ์) */
        if (document.activeElement !== element && isDefault(key, element.textContent) && element.textContent !== "") {
            element.textContent = "";
        }
    }

    function decorateAll(root) {

        (root || document).querySelectorAll(ALL_SELECTOR).forEach(decorate);
    }

    ["categorySidebar", "partySidebar"].forEach(id => {

        const node = document.getElementById(id);

        if (!node) return;

        new MutationObserver(records => {

            records.forEach(record => record.addedNodes.forEach(added => {

                if (!(added instanceof Element)) return;

                if (fieldOf(added)) decorate(added); else decorateAll(added);
            }));

        }).observe(node, { childList: true, subtree: true });
    });

    decorateAll();


    /* =====================================================
       2) โหมดพิมพ์ + เก็บข้อความเดิม (ไว้ยกเลิก)
    ===================================================== */

    let editing = null;   // { element, key, original }

    document.addEventListener("focusin", event => {

        const element = event.target;
        const key = fieldOf(element);

        if (!key) return;

        editing = { element, key, original: element.textContent };

        element.classList.add("zg-rowedit-on");

        const host = element.closest(".party-row, .category-cell, .category, .category-block") || element.parentElement;

        if (host) host.classList.add("zg-rowedit-host");

        const content = element.closest(".party-content");

        if (content) content.classList.add("zg-rowedit-host");

        showSuggestions(element, key, true);

    }, true);

    document.addEventListener("focusout", event => {

        const element = event.target;
        const key = fieldOf(element);

        if (!key) return;

        element.classList.remove("zg-rowedit-on");

        document.querySelectorAll(".zg-rowedit-host").forEach(node => node.classList.remove("zg-rowedit-host"));

        /* จัดข้อความให้สะอาด (ตัดช่องว่างหัวท้าย) */
        const clean = FIELDS[key].multiline
            ? element.textContent.replace(/ /g, " ").replace(/[ \t]+\n/g, "\n").trim()
            : cleanText(element.textContent).replace(/\s+/g, " ");

        if (clean !== element.textContent) setText(element, clean);

        const changed = editing && editing.element === element && element.textContent !== editing.original;

        editing = null;

        closeSuggestions();

        if (changed && window.ZGHistory && typeof window.ZGHistory.record === "function") {
            setTimeout(() => window.ZGHistory.record(), 0);
        }

    }, true);


    /* =====================================================
       3) Enter / Tab / Esc + วางข้อความธรรมดา
    ===================================================== */

    function nextTarget(element, key, direction) {

        if (key === "category") {

            /* ชื่อหมวด → แถวแรกของหมวด / ย้อน = แถวสุดท้ายของหมวดก่อนหน้า */
            const categoryId = categoryIdOfName(element);
            const index = categories.findIndex(category => category.id === categoryId);

            if (direction > 0) {
                const row = categories[index] && categories[index].rows[0];
                return row ? { element: findField(row.id, "main") } : null;
            }

            const previous = categories[index - 1];
            const last = previous && previous.rows[previous.rows.length - 1];

            return last ? { element: findField(last.id, "role") } : null;
        }

        const rowElement = rowElementOf(element);

        if (!rowElement) return null;

        const rows = orderedRows();
        const index = rows.findIndex(item => item.rowId === rowElement.dataset.rowId);

        if (index < 0) return null;

        return { index, rows, current: rows[index] };
    }

    function moveTab(element, key, backwards) {

        if (key === "category") {

            const target = nextTarget(element, key, backwards ? -1 : 1);

            if (target && target.element) focusField(target.element);

            return;
        }

        const info = nextTarget(element, key, 1);

        if (!info) return;

        const { index, rows, current } = info;

        if (!backwards) {

            if (key === "main") return focusField(findField(current.rowId, "role"));

            const next = rows[index + 1];

            if (next) return focusField(findField(next.rowId, "main"));

            element.blur();
            return;
        }

        if (key === "role") return focusField(findField(current.rowId, "main"));

        const previous = rows[index - 1];

        if (previous) return focusField(findField(previous.rowId, "role"));

        element.blur();
    }

    function moveEnter(element, key) {

        if (key === "category") {

            const target = nextTarget(element, key, 1);

            if (target && target.element) focusField(target.element); else element.blur();

            return;
        }

        const info = nextTarget(element, key, 1);

        if (!info) return element.blur();

        const { index, rows, current } = info;

        const next = rows[index + 1];

        /* แถวถัดไปอยู่หมวดเดียวกัน → ไปเลย */
        if (next && next.categoryId === current.categoryId) {
            focusField(findField(next.rowId, key === "role" ? "role" : "main"));
            return;
        }

        /* แถวสุดท้ายของหมวด → ถามเพิ่มแถว */
        askAddRow(element, current);
    }


    /* ---------- ถามว่าจะเพิ่มแถวใหม่ไหม ---------- */

    let ask = null;

    function closeAsk() {

        if (ask) {
            ask.element.remove();
            document.removeEventListener("keydown", ask.onKey, true);
            ask = null;
        }
    }

    function askAddRow(field, current) {

        closeAsk();

        const rect = field.getBoundingClientRect();

        field.blur();

        const element = document.createElement("div");

        element.className = "zg-addrow-ask";
        element.innerHTML = `
            <span>เพิ่มแถวใหม่ในหมวดนี้?</span>
            <button type="button" class="is-ok" data-ask="yes">＋ เพิ่ม <kbd>Enter</kbd></button>
            <button type="button" data-ask="no">ไม่ <kbd>Esc</kbd></button>
        `;

        document.body.appendChild(element);

        const left = Math.max(6, Math.min(rect.left, window.innerWidth - element.offsetWidth - 6));
        const top = Math.min(rect.bottom + 6, window.innerHeight - element.offsetHeight - 6);

        element.style.left = `${left}px`;
        element.style.top = `${top}px`;

        const yes = () => {

            closeAsk();

            if (typeof addRowAfter !== "function") return;

            const category = categories.find(item => item.id === current.categoryId);

            addRowAfter(current.categoryId, current.rowId);

            if (!category) return;

            const index = category.rows.findIndex(row => row.id === current.rowId);
            const created = category.rows[index + 1];

            if (window.ZGHistory && typeof window.ZGHistory.record === "function") window.ZGHistory.record();

            if (created) requestAnimationFrame(() => focusField(findField(created.id, "main")));
        };

        const onKey = event => {

            if (event.key === "Enter") {
                event.preventDefault();
                event.stopImmediatePropagation();
                yes();
            } else if (event.key === "Escape") {
                event.preventDefault();
                event.stopImmediatePropagation();
                closeAsk();
            }
        };

        element.addEventListener("mousedown", event => event.stopPropagation());

        element.addEventListener("click", event => {

            const button = event.target.closest("[data-ask]");

            if (!button) return;

            if (button.dataset.ask === "yes") yes(); else closeAsk();
        });

        document.addEventListener("keydown", onKey, true);

        ask = { element, onKey };

        /* ปิดเองถ้าไม่ตอบ */
        setTimeout(() => { if (ask && ask.element === element) closeAsk(); }, 6000);
    }

    document.addEventListener("mousedown", event => {

        if (ask && !ask.element.contains(event.target)) closeAsk();
    });


    document.addEventListener("keydown", event => {

        const element = event.target;
        const key = fieldOf(element);

        if (!key || event.isComposing) return;

        /* รายการคำแนะนำเปิดอยู่ → ใช้ ↑ ↓ Enter Esc กับรายการก่อน */
        if (suggest && handleSuggestKey(event)) return;

        if (event.key === "Enter" && !(event.shiftKey && FIELDS[key].multiline)) {

            event.preventDefault();
            event.stopPropagation();

            moveEnter(element, key);

            return;
        }

        if (event.key === "Tab") {

            event.preventDefault();
            event.stopPropagation();

            moveTab(element, key, event.shiftKey);

            return;
        }

        if (event.key === "Escape" && editing && editing.element === element) {

            event.preventDefault();
            event.stopPropagation();

            setText(element, editing.original);

            editing.original = element.textContent;

            element.blur();
        }

    }, true);

    /* วางข้อความ = ตัวหนังสือธรรมดา (ช่องบรรทัดเดียว → รวมเป็นบรรทัดเดียว) */
    document.addEventListener("paste", event => {

        const element = event.target instanceof Element ? event.target.closest(ALL_SELECTOR) : null;
        const key = fieldOf(element);

        if (!key || !event.clipboardData) return;

        const text = event.clipboardData.getData("text/plain");

        if (!text) return;

        event.preventDefault();
        event.stopImmediatePropagation();

        const value = FIELDS[key].multiline ? text.replace(/\r/g, "") : text.replace(/\s*[\r\n\t]+\s*/g, " ");

        document.execCommand("insertText", false, value);

    }, true);


    /* =====================================================
       4) ช่วยเติมคำ + เพิ่ม / ลบคำในรายการเองได้
    ===================================================== */

    const CUSTOM_KEY = "zg-row-suggest-custom-v1";

    /* { custom: {main:[], role:[], category:[]}, hidden: {main:[], role:[], category:[]} } */
    function loadLists() {

        const empty = () => ({ main: [], role: [], category: [] });

        try {

            const data = JSON.parse(localStorage.getItem(CUSTOM_KEY) || "null");

            if (data && data.custom && data.hidden) {
                ["main", "role", "category"].forEach(key => {
                    if (!Array.isArray(data.custom[key])) data.custom[key] = [];
                    if (!Array.isArray(data.hidden[key])) data.hidden[key] = [];
                });
                return data;
            }

        } catch (error) { /* ignore */ }

        return { custom: empty(), hidden: empty() };
    }

    function saveLists(lists) {

        try {
            localStorage.setItem(CUSTOM_KEY, JSON.stringify(lists));
        } catch (error) { /* ignore */ }
    }

    function addCustom(key, text) {

        const value = cleanText(text);

        if (!value) return;

        const lists = loadLists();
        const lower = value.toLowerCase();

        if (!lists.custom[key].some(item => item.toLowerCase() === lower)) lists.custom[key].push(value);

        lists.hidden[key] = lists.hidden[key].filter(item => item.toLowerCase() !== lower);

        saveLists(lists);
    }

    function removeFromList(key, text) {

        const lists = loadLists();
        const lower = cleanText(text).toLowerCase();

        lists.custom[key] = lists.custom[key].filter(item => item.toLowerCase() !== lower);

        if (!lists.hidden[key].some(item => item.toLowerCase() === lower)) lists.hidden[key].push(cleanText(text));

        saveLists(lists);
    }

    function collectFromPlans() {

        const names = new Map();
        const roles = new Map();
        const cats = new Map();

        const add = (map, value) => {

            const text = cleanText(value).replace(/\s+/g, " ");

            if (!text || text === "type..." || text === "Category" || text.length > 120) return;

            const keyText = text.toLowerCase();

            const entry = map.get(keyText) || { text, count: 0 };

            entry.count += 1;

            map.set(keyText, entry);
        };

        const scan = list => (Array.isArray(list) ? list : []).forEach(category => {

            add(cats, category && category.name);

            (category && Array.isArray(category.rows) ? category.rows : []).forEach(row => {
                add(names, row.text);
                add(roles, row.role);
            });
        });

        if (typeof categories !== "undefined") scan(categories);

        try {
            const store = JSON.parse(localStorage.getItem(PLANS_KEY) || "null");
            (store && Array.isArray(store.plans) ? store.plans : []).forEach(plan => scan(plan && plan.data && plan.data.categories));
        } catch (error) { /* ignore */ }

        (Array.isArray(window.ZG_TEMPLATES) ? window.ZG_TEMPLATES : []).forEach(template => scan(template && template.data && template.data.categories));

        return { main: names, role: roles, category: cats };
    }

    /* รายการคำของช่องนั้น: เพิ่มเอง → ใช้บ่อย → สำเร็จรูป (ไม่รวมคำที่ลบออก) */
    function candidates(key) {

        const maps = collectFromPlans();
        const lists = loadLists();

        const map = maps[key];
        const hidden = new Set(lists.hidden[key].map(item => item.toLowerCase()));

        const result = [];
        const seen = new Set();

        const push = entry => {

            const lower = entry.text.toLowerCase();

            if (seen.has(lower) || hidden.has(lower)) return;

            seen.add(lower);
            result.push(entry);
        };

        lists.custom[key].forEach(text => {
            const used = map.get(text.toLowerCase());
            push({ text, count: used ? used.count : 0, custom: true });
        });

        Array.from(map.values()).sort((a, b) => b.count - a.count).forEach(entry => push({ ...entry }));

        (key === "role" ? ROLE_PRESETS : key === "category" ? CATEGORY_PRESETS : [])
            .forEach(text => push({ text, count: 0, preset: true }));

        return result;
    }

    /* ใช้ได้ทั้งช่อง contenteditable และ <input> */
    function getValue(element) {
        return element.matches("input, textarea") ? element.value : element.textContent;
    }

    function setValue(element, text) {

        if (element.matches("input, textarea")) {
            element.value = text;
            element.dispatchEvent(new Event("input", { bubbles: true }));
        } else {
            setText(element, text);
        }
    }

    function placeEnd(element) {

        if (element.matches("input, textarea")) {
            const length = element.value.length;
            element.setSelectionRange(length, length);
        } else {
            caretToEnd(element);
        }
    }

    let suggest = null;   // { box, element, key, items, active }

    function closeSuggestions() {

        if (suggest) {
            suggest.box.remove();
            suggest = null;
        }
    }

    function escapeHtml(text) {

        return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    function highlight(text, query) {

        if (!query) return escapeHtml(text);

        const index = text.toLowerCase().indexOf(query.toLowerCase());

        if (index < 0) return escapeHtml(text);

        return escapeHtml(text.slice(0, index)) +
            `<mark>${escapeHtml(text.slice(index, index + query.length))}</mark>` +
            escapeHtml(text.slice(index + query.length));
    }

    const LIST_INFO = {
        main: { icon: "👤", title: "ชื่อที่เคยใช้", noun: "รายชื่อ" },
        role: { icon: "🏷", title: "บทบาท", noun: "รายการบทบาท" },
        category: { icon: "🗂", title: "ชื่อหมวดหมู่", noun: "รายการหมวดหมู่" }
    };

    function showSuggestions(element, key, onFocus) {

        const query = cleanText(getValue(element));

        /* ชื่อแถว: แนะนำเมื่อเริ่มพิมพ์ · บทบาท / หมวด: แนะนำตั้งแต่ยังว่าง */
        if (key === "main" && (!query || onFocus)) {
            closeSuggestions();
            return;
        }

        const lower = query.toLowerCase();

        const all = candidates(key);

        let items = all.filter(item => {

            const text = item.text.toLowerCase();

            return text !== lower && (!lower || text.includes(lower));
        });

        if (lower) {
            items.sort((a, b) => (b.text.toLowerCase().startsWith(lower) ? 1 : 0) - (a.text.toLowerCase().startsWith(lower) ? 1 : 0));
        }

        items = items.slice(0, 30);

        /* คำที่พิมพ์ยังไม่อยู่ในรายการ → ปุ่มเพิ่ม */
        const exists = all.some(item => item.text.toLowerCase() === lower);

        const canAdd = key !== "main" && query && !exists && query.length <= 60;

        if (canAdd) items.unshift({ text: query, add: true });

        if (!items.length) {
            closeSuggestions();
            return;
        }

        if (!suggest || suggest.element !== element) {

            closeSuggestions();

            const box = document.createElement("div");

            box.className = "zg-suggest";

            box.addEventListener("mousedown", event => {

                /* ไม่ให้ช่องพิมพ์หลุดโฟกัส */
                event.preventDefault();
                event.stopPropagation();

                const del = event.target.closest(".zg-suggest-del");

                if (del) {
                    removeItem(Number(del.dataset.index));
                    return;
                }

                const item = event.target.closest(".zg-suggest-item");

                if (item) pick(Number(item.dataset.index));
            });

            document.body.appendChild(box);

            suggest = { box, element, key, items, active: -1 };
        }

        suggest.items = items;
        suggest.key = key;

        /* มีปุ่มเพิ่ม + มีคำตรงกัน → เลือกคำแรกที่ตรงไว้ก่อน (กด Enter ได้เลย) */
        suggest.active = -1;

        const info = LIST_INFO[key];

        suggest.box.innerHTML = `
            <div class="zg-suggest-head">
                <span class="zg-suggest-head-icon">${info.icon}</span>
                <span>${info.title}</span>
                <span class="zg-suggest-count">${all.length}</span>
            </div>
            <div class="zg-suggest-list">
                ${items.map((item, index) => item.add ? `
                    <div class="zg-suggest-item zg-suggest-add" data-index="${index}">
                        <span class="zg-suggest-plus">＋</span>
                        <span class="zg-suggest-text">เพิ่ม "<b>${escapeHtml(item.text)}</b>" ใน${info.noun}</span>
                    </div>` : `
                    <div class="zg-suggest-item" data-index="${index}">
                        <span class="zg-suggest-text">${highlight(item.text, query)}</span>
                        ${item.custom ? `<span class="zg-suggest-tag is-custom">เพิ่มเอง</span>` : ""}
                        ${item.count > 1 ? `<span class="zg-suggest-tag">${item.count}×</span>` : ""}
                        ${key !== "main" ? `<span class="zg-suggest-del" data-index="${index}" title="เอาออกจากรายการ">✕</span>` : ""}
                    </div>`).join("")}
            </div>
            <div class="zg-suggest-hint"><kbd>↑</kbd><kbd>↓</kbd> เลือก · <kbd>Enter</kbd> ใช้ · <kbd>Esc</kbd> ปิด</div>
        `;

        positionSuggestions();
    }

    function positionSuggestions() {

        if (!suggest) return;

        const rect = suggest.element.getBoundingClientRect();
        const box = suggest.box;

        /*
            ช่องในแถบซ้าย (ชื่อหมวด / ชื่อแถว / บทบาท) → วางรายการ "ด้านขวาของแถบซ้าย"
            ไม่ทับหมวด / แถวถัดไป (เดิมวางใต้ช่อง → บังหมวดข้างล่าง คลิกแก้หมวดอื่นไม่ได้)
        */
        const sidebar = suggest.element.closest(".category-sidebar, #categorySidebar, .party-sidebar, #partySidebar") ||
            (suggest.element.closest(".category, .party-row") ? suggest.element.closest(".category, .party-row") : null);

        if (sidebar) {

            const party = document.getElementById("partySidebar") || document.querySelector(".party-sidebar");
            const edge = party ? party.getBoundingClientRect().right : rect.right;

            box.style.minWidth = "230px";

            const left = Math.max(6, Math.min(edge + 8, window.innerWidth - box.offsetWidth - 6));

            let top = rect.top + rect.height / 2 - 24;
            top = Math.max(6, Math.min(top, window.innerHeight - box.offsetHeight - 6));

            box.style.left = `${left}px`;
            box.style.top = `${top}px`;

            return;
        }

        box.style.minWidth = `${Math.max(230, rect.width)}px`;

        let top = rect.bottom + 6;

        if (top + box.offsetHeight > window.innerHeight - 6) {
            top = Math.max(6, rect.top - box.offsetHeight - 6);
        }

        const left = Math.max(6, Math.min(rect.left, window.innerWidth - box.offsetWidth - 6));

        box.style.left = `${left}px`;
        box.style.top = `${top}px`;
    }

    function setActive(index) {

        if (!suggest) return;

        suggest.active = index;

        suggest.box.querySelectorAll(".zg-suggest-item").forEach((node, i) => {
            node.classList.toggle("is-active", i === index);
            if (i === index) node.scrollIntoView({ block: "nearest" });
        });
    }

    function toast(message) {
        if (window.ZGImage && typeof window.ZGImage.toast === "function") window.ZGImage.toast(message);
    }

    function pick(index) {

        if (!suggest || !suggest.items[index]) return;

        const { element, key } = suggest;
        const item = suggest.items[index];

        if (item.add) {
            addCustom(key, item.text);
            toast(`เพิ่ม "${item.text}" ใน${LIST_INFO[key].noun}แล้ว`);
        }

        setValue(element, item.text);

        closeSuggestions();

        element.focus();
        placeEnd(element);
    }

    function removeItem(index) {

        if (!suggest || !suggest.items[index]) return;

        const { element, key } = suggest;

        removeFromList(key, suggest.items[index].text);

        showSuggestions(element, key, false);

        element.focus();
    }

    /* คืน true = จัดการปุ่มนี้แล้ว */
    function handleSuggestKey(event) {

        if (!suggest || suggest.element !== event.target) return false;

        const count = suggest.items.length;

        if (event.key === "ArrowDown") {
            event.preventDefault();
            event.stopPropagation();
            setActive((suggest.active + 1) % count);
            return true;
        }

        if (event.key === "ArrowUp") {
            event.preventDefault();
            event.stopPropagation();
            setActive(suggest.active <= 0 ? count - 1 : suggest.active - 1);
            return true;
        }

        if (event.key === "Enter" && suggest.active >= 0) {
            event.preventDefault();
            event.stopPropagation();
            pick(suggest.active);
            return true;
        }

        if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            closeSuggestions();
            return true;
        }

        return false;
    }

    document.addEventListener("input", event => {

        const key = fieldOf(event.target);

        if (key && document.activeElement === event.target) showSuggestions(event.target, key, false);

    }, true);

    window.addEventListener("resize", closeSuggestions);


    /* ต่อระบบแนะนำคำเข้ากับช่อง <input> อื่น (เช่น หน้าต่างเพิ่มหมวดหมู่) */
    function attach(input, key) {

        if (!input || input.dataset.zgSuggest) return;

        input.dataset.zgSuggest = key;

        /* ไม่เปิดเองตอนโฟกัส (ไม่บังส่วนอื่นของหน้าต่าง) → คลิกช่อง / พิมพ์ / กด ↓ ถึงเปิด */
        input.addEventListener("mousedown", () => setTimeout(() => showSuggestions(input, key, false), 0));
        input.addEventListener("input", () => showSuggestions(input, key, false));
        input.addEventListener("keydown", event => {

            if (handleSuggestKey(event)) return;

            if (event.key === "ArrowDown" && !suggest) {
                event.preventDefault();
                showSuggestions(input, key, false);
                setActive(0);
            }

        }, true);
        input.addEventListener("blur", () => setTimeout(() => {
            if (suggest && suggest.element === input && document.activeElement !== input) closeSuggestions();
        }, 0));

    }


    window.ZGRowEdit = {
        refresh: () => decorateAll(),
        suggestions: candidates,
        attach,
        addToList: addCustom,
        removeFromList,
        close: closeSuggestions
    };

})();
