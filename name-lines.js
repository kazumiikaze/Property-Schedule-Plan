"use strict";

/* =========================================================
   NAME-LINES.JS — ชื่อหมวด / ชื่อแถว / บทบาท เคาะบรรทัดได้
   - กด Enter (หรือ Shift+Enter) ในชื่อหมวด ชื่อบริษัท/ผู้ติดต่อ บทบาท = ขึ้นบรรทัดใหม่
     (เดิม Enter = จบการพิมพ์) · คลิกที่อื่น / Esc = จบการพิมพ์
   - บรรทัดที่มีจุด • กด Enter → บรรทัดใหม่มีจุดให้เอง (text-size.js)
   - เก็บเป็น \n ใน category.name / row.text / row.role → บันทึก Export Import เทมเพลต ได้ครบ
   - ไม่แก้ app.js — โหลดหลัง text-size.js
========================================================= */

(function () {

    if (typeof categories === "undefined") {
        console.warn("[name-lines.js] ต้องโหลดหลัง app.js");
        return;
    }

    const FIELDS = ".category[data-category-id] .category-name, .party-row[data-row-id] .party-main, .party-row[data-row-id] .party-role";

    const style = document.createElement("style");
    style.textContent = `
.category-name, .party-main, .party-role { white-space: pre-wrap; }
`;
    document.head.appendChild(style);

    function fieldOf(target) {
        return target instanceof Element ? target.closest(FIELDS) : null;
    }

    /* ข้อความที่เห็น (บรรทัดคั่นด้วย \n) — เบราว์เซอร์ใส่ \n ปิดท้ายไว้ให้เคอร์เซอร์ยืนบรรทัดว่าง */
    function textOf(element) {
        return (element.innerText || "").replace(/\r/g, "").replace(/\n$/, "");
    }

    function findRow(id) {
        for (const category of categories) {
            const row = (category.rows || []).find(item => item.id === id);
            if (row) return row;
        }
        return null;
    }

    /* app.js เก็บด้วย textContent (การขึ้นบรรทัดหาย) → เก็บซ้ำด้วยข้อความที่มีบรรทัด */
    function store(element) {
        const value = textOf(element);
        if (element.classList.contains("category-name")) {
            const category = categories.find(item => item.id === element.closest(".category").dataset.categoryId);
            if (category) category.name = value;
            return;
        }
        const row = findRow(element.closest(".party-row").dataset.rowId);
        if (!row) return;
        if (element.classList.contains("party-role")) row.role = value;
        else row.text = value;
    }

    document.addEventListener("input", event => {
        const field = fieldOf(event.target);
        if (field) store(field);
    });

    /*
        Enter = ขึ้นบรรทัดใหม่ (ก่อนตัวจัดการของ app.js ที่สั่งจบการพิมพ์)
        บรรทัดที่มีจุด text-size.js จัดการก่อนแล้ว (defaultPrevented) → ไม่ทำซ้ำ
    */
    document.addEventListener("keydown", event => {
        if (event.key !== "Enter" || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
        const field = fieldOf(event.target);
        if (!field || field.getAttribute("contenteditable") !== "true") return;
        event.stopPropagation();
        if (event.defaultPrevented) { store(field); return; }
        event.preventDefault();
        document.execCommand("insertLineBreak");
        store(field);
    }, true);

    window.ZGNameLines = { textOf };

})();
