"use strict";

/* =========================================================
   CAT-TEXT.JS — ตั้งค่าข้อความในหมวดหมู่ (เมนู ⋮ ของหมวดหมู่)
   - ตำแหน่งข้อความ 9 จุด: ซ้ายบน / กลางบน / ขวาบน / ซ้าย / กลาง / ขวา / ซ้ายล่าง / กลางล่าง / ขวาล่าง
   - ขนาดตัวอักษร A− / A+ / ↺ (ค่าเดียวกับแถบปรับตัวอักษรตอนพิมพ์ — text-size.js)
   - ตัวหนา B (ค่าเดียวกับแถบปรับตัวอักษร)
   - เก็บตำแหน่งที่ category.textPos (0–8) → บันทึกไปกับแผน / Export / เทมเพลต / ↶ ย้อนกลับ
   - ไม่แก้ app.js / style.css — โหลดหลัง row-style.js, text-size.js
========================================================= */

(function () {

    const menu = document.getElementById("categoryMenu");
    const sidebar = document.getElementById("categorySidebar");

    if (!menu || !sidebar || typeof categories === "undefined") {
        console.warn("[cat-text.js] ไม่พบเมนู / แถบหมวดหมู่");
        return;
    }

    const L = (th, en, ja) => {
        const lang = window.ZGLang && typeof window.ZGLang.get === "function" ? window.ZGLang.get() : "th";
        return lang === "en" ? en : lang === "ja" ? ja : th;
    };

    const CENTER = 4;
    const JUSTIFY = ["flex-start", "center", "flex-end"];
    const ALIGN = ["left", "center", "right"];
    const ARROWS = ["↖", "↑", "↗", "←", "•", "→", "↙", "↓", "↘"];

    const style = document.createElement("style");

    style.textContent = `
.zg-cat-text { margin-top: 10px; padding-top: 10px; border-top: 1px solid #e3e8e5; }
.zg-cat-text .zg-ct-label { color: #7a827e; font-size: 10px; margin: 0 0 5px; }
.zg-cat-text .zg-ct-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3px; width: 96px; }
.zg-cat-text .zg-ct-grid button {
    height: 24px; border: 1px solid #dde3e0; border-radius: 5px; background: #ffffff;
    color: #5f6a64; font-size: 12px; cursor: pointer; padding: 0;
}
.zg-cat-text .zg-ct-grid button:hover { background: #eef6f0; }
.zg-cat-text .zg-ct-grid button.is-on { background: #e5f0e9; border-color: #3a8a4f; color: #1e7a46; font-weight: 700; }
.zg-cat-text .zg-ct-size { display: flex; align-items: center; gap: 4px; margin-top: 8px; }
.zg-cat-text .zg-ct-size button {
    min-width: 28px; height: 26px; border: 1px solid #dde3e0; border-radius: 6px; background: #ffffff;
    color: #333333; font: 700 12px Arial, Helvetica, sans-serif; cursor: pointer; padding: 0 6px;
}
.zg-cat-text .zg-ct-size button:hover { background: #eef6f0; }
.zg-cat-text .zg-ct-size button.is-on { background: #e5f0e9; border-color: #3a8a4f; color: #1e7a46; }
.zg-cat-text .zg-ct-size [data-ct-val] { min-width: 40px; text-align: center; font-weight: 700; color: #2f7442; font-size: 12px; }
.zg-cat-text .zg-ct-row { display: flex; gap: 12px; align-items: flex-start; }
body.zg-dark .zg-cat-text { border-top-color: #3a4440; }
body.zg-dark .zg-cat-text .zg-ct-grid button,
body.zg-dark .zg-cat-text .zg-ct-size button { background: #272e30; border-color: #3a4441; color: #e3e8e5; }
body.zg-dark .zg-cat-text .zg-ct-grid button.is-on,
body.zg-dark .zg-cat-text .zg-ct-size button.is-on { background: #1f3a2a; color: #8fe0a8; border-color: #3a8a4f; }

/* ตำแหน่งข้อความในช่องหมวดหมู่ */
.category.zg-ct-pos .category-name { flex: 0 1 auto; }

/* เดิมเว้นขวา 24px (ที่ของปุ่ม ⋮) แต่ซ้ายแค่ 5px → ข้อความกลางเยื้องซ้าย
   → เว้นซ้ายเท่าขวา ข้อความอยู่กลางช่องพอดี / ชิดซ้ายเว้น 10px */
#categorySidebar .category { padding-left: 24px !important; }
/* ขยับไปทางขวาอีกนิด (ไม่ลดความกว้าง → ชื่อยาวไม่ขึ้นบรรทัดใหม่) */
#categorySidebar .category:not(.zg-ct-left) .category-name { position: relative; left: 8px; }
#categorySidebar .category.zg-ct-left { padding-left: 10px !important; }
`;

    document.head.appendChild(style);


    function findCategory(id) {
        return categories.find(item => item.id === id) || null;
    }

    function currentCategory() {
        return typeof selectedCategoryId !== "undefined" && selectedCategoryId ? findCategory(selectedCategoryId) : null;
    }

    function posOf(category) {
        const value = Number(category && category.textPos);
        return Number.isInteger(value) && value >= 0 && value <= 8 ? value : CENTER;
    }

    function record() {
        if (window.ZGHistory && typeof window.ZGHistory.record === "function") {
            try { window.ZGHistory.record(); } catch (error) { /* ไม่เป็นไร */ }
        }
    }


    /* =====================================================
       ใส่ตำแหน่งให้ช่องหมวดหมู่ (หลังวาดใหม่ทุกครั้ง)
    ===================================================== */

    function apply() {

        sidebar.querySelectorAll(".category[data-category-id]").forEach(element => {

            const category = findCategory(element.dataset.categoryId);
            const name = element.querySelector(".category-name");
            const pos = posOf(category);

            if (pos === CENTER) {
                element.classList.remove("zg-ct-pos", "zg-ct-left");
                element.style.removeProperty("justify-content");
                element.style.removeProperty("align-items");
                if (name) name.style.removeProperty("text-align");
                return;
            }

            const col = pos % 3;
            const row = Math.floor(pos / 3);

            element.classList.add("zg-ct-pos");
            element.classList.toggle("zg-ct-left", col === 0);
            element.style.setProperty("justify-content", JUSTIFY[col], "important");
            element.style.setProperty("align-items", JUSTIFY[row], "important");
            if (name) name.style.setProperty("text-align", ALIGN[col], "important");
        });
    }

    new MutationObserver(apply).observe(sidebar, { childList: true });
    window.addEventListener("zg-plan-applied", () => requestAnimationFrame(apply));


    /* =====================================================
       เมนู ⋮ ของหมวดหมู่
    ===================================================== */

    const section = document.createElement("div");
    section.className = "zg-cat-text";

    function render() {
        section.innerHTML = `
            <div class="zg-ct-label">${L("ตำแหน่งข้อความ", "Text position", "文字の位置")}</div>
            <div class="zg-ct-grid">
                ${ARROWS.map((arrow, index) => `<button type="button" data-ct-pos="${index}">${arrow}</button>`).join("")}
            </div>
            <div class="zg-ct-label" style="margin-top:9px">${L("ขนาดตัวอักษร", "Font size", "文字サイズ")}</div>
            <div class="zg-ct-size">
                <button type="button" data-ct="down" title="${L("เล็กลง", "Smaller", "小さく")}">A−</button>
                <span data-ct-val></span>
                <button type="button" data-ct="up" title="${L("ใหญ่ขึ้น", "Larger", "大きく")}">A+</button>
                <button type="button" data-ct="reset" title="${L("ขนาดเดิม", "Default size", "元のサイズ")}">↺</button>
                <button type="button" data-ct="bold" title="${L("ตัวหนา", "Bold", "太字")}">B</button>
            </div>`;
    }

    render();

    const deleteBtn = menu.querySelector("#deleteCategoryBtn");
    if (deleteBtn) menu.insertBefore(section, deleteBtn);
    else menu.appendChild(section);

    function nameElement(category) {
        const element = category && sidebar.querySelector(`.category[data-category-id="${CSS.escape(category.id)}"] .category-name`);
        return element || null;
    }

    function currentSize(category) {
        const api = window.ZGTextSize;
        const stored = api && api.getSize ? api.getSize(`cat:${category.id}`) : null;
        if (stored) return stored;
        const element = nameElement(category);
        return element ? Math.round(parseFloat(getComputedStyle(element).fontSize) || 12) : 12;
    }

    function isBold(category) {
        const element = nameElement(category);
        return element ? (parseInt(getComputedStyle(element).fontWeight, 10) || 400) >= 600 : true;
    }

    function sync() {

        const category = currentCategory();
        if (!category) return;

        const pos = posOf(category);

        section.querySelectorAll("[data-ct-pos]").forEach(button => {
            button.classList.toggle("is-on", Number(button.dataset.ctPos) === pos);
        });

        const api = window.ZGTextSize;
        const sizeRow = section.querySelector(".zg-ct-size");
        sizeRow.style.display = api && api.setSize ? "" : "none";

        section.querySelector("[data-ct-val]").textContent = `${currentSize(category)}px`;
        section.querySelector('[data-ct="reset"]').style.opacity = api && api.getSize && api.getSize(`cat:${category.id}`) ? "1" : ".4";
        section.querySelector('[data-ct="bold"]').classList.toggle("is-on", isBold(category));
    }

    section.addEventListener("mousedown", event => event.stopPropagation());

    section.addEventListener("click", event => {

        event.stopPropagation();

        const category = currentCategory();
        const target = event.target instanceof Element ? event.target : null;
        if (!category || !target) return;

        const posButton = target.closest("[data-ct-pos]");

        if (posButton) {
            const pos = Number(posButton.dataset.ctPos);
            if (pos === CENTER) delete category.textPos;
            else category.textPos = pos;
            apply();
            sync();
            record();
            return;
        }

        const button = target.closest("[data-ct]");
        if (!button) return;

        const api = window.ZGTextSize;
        if (!api || !api.setSize) return;

        const key = `cat:${category.id}`;
        const action = button.dataset.ct;

        if (action === "reset") {
            api.setSize(key, null);
        } else if (action === "up" || action === "down") {
            const size = currentSize(category);
            const step = size >= 24 ? 2 : 1;
            api.setSize(key, size + (action === "up" ? step : -step));
        } else if (action === "bold") {
            toggleBold(category);
        }

        sync();
    });

    function toggleBold(category) {
        const api = window.ZGTextSize;
        if (!api || !api.setBold) return;
        api.setBold(`cat:${category.id}`, !isBold(category));
    }

    /* เปิดเมนูหมวดหมู่ → แสดงค่าปัจจุบัน */
    new MutationObserver(() => {
        if (!menu.classList.contains("open")) return;
        render();
        sync();
    }).observe(menu, { attributes: true, attributeFilter: ["class"] });

    apply();

    window.ZGCatText = { apply };

})();
