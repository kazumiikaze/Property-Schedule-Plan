"use strict";

/* =========================================================
   ROW-STYLE.JS — สีช่องแถว + สีตัวอักษร (ช่อง type...)
   - กด ⋮ ที่แถว → ตั้งค่า สีช่อง / สีตัวหนา / สีตัวบาง ของแถวนั้น
   - ก่อนกด "＋ เพิ่มแถว" เลือกสีช่องของแถวใหม่ได้
   - ค่าเริ่มต้น: ตัวหนา = ส้ม, ตัวบาง = เขียว (เปลี่ยนค่าเริ่มต้นได้)
   - เก็บสีไว้ในข้อมูลแถว (row.bgColor / row.mainColor / row.roleColor)
     → บันทึกแผน / Export-Import / ย้อนกลับ-ทำซ้ำ ใช้ได้ครบ

   ไม่แก้ app.js / style.css — โหลดหลัง app.js
========================================================= */

(function () {

    const partySidebarEl = document.getElementById("partySidebar");

    if (!partySidebarEl || typeof categories === "undefined") {

        console.error("[row-style.js] ไม่พบ #partySidebar / categories (ต้องโหลดหลัง app.js)");

        return;
    }


    /* =====================================================
       CONFIG / DEFAULTS
    ===================================================== */

    const DEFAULTS_KEY = "zg-row-style-defaults-v1";

    const FACTORY_DEFAULTS = {
        bgColor: "",            // "" = ใช้สีเดิมของธีม
        mainColor: "#e67e22",   // ตัวหนา (type...) สีส้ม
        roleColor: "#3a8a4f"    // ตัวบาง (type...) สีเขียว
    };

    const BG_COLORS = [
        "#ffffff", "#f5f6f7", "#fff4e5", "#fdecea",
        "#e8f5ec", "#e8f1fb", "#f3ecfb", "#fffbe0",
        "#d9dcde", "#ffd8a8", "#f8c4c0", "#bfe3c9",
        "#c2d9f2", "#dccbf2", "#fff0a6"
    ];

    const TEXT_COLORS = [
        "#1e2924", "#555f5a", "#e67e22", "#3a8a4f",
        "#d9534f", "#4a90d9", "#876bd0", "#e64694",
        "#e1a638", "#16a085", "#2980b9", "#8e44ad",
        "#c0392b", "#7f8c8d", "#000000", "#ffffff"
    ];


    function loadDefaults() {

        try {

            const saved = JSON.parse(localStorage.getItem(DEFAULTS_KEY) || "null");

            if (saved && typeof saved === "object") {
                return { ...FACTORY_DEFAULTS, ...saved };
            }

        } catch (error) { /* ใช้ค่าโรงงาน */ }

        return { ...FACTORY_DEFAULTS };
    }

    let defaults = loadDefaults();

    function saveDefaults() {

        try {
            localStorage.setItem(DEFAULTS_KEY, JSON.stringify(defaults));
        } catch (error) { /* ignore */ }
    }


    /* =====================================================
       STYLE
    ===================================================== */

    const style = document.createElement("style");

    style.textContent = `

.zg-row-style {
    border-top: 1px solid #e3e7e5;
    margin-top: 6px;
    padding-top: 8px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
    font-size: 11px;
}
.row-action-menu.zg-row-style-menu {
    width: 268px !important;
    min-width: 268px !important;
    max-width: calc(100vw - 12px) !important;
    box-sizing: border-box !important;
    overflow-x: hidden !important;
    overflow-y: auto !important;
}
.row-action-menu.zg-row-style-menu .zg-row-style__new { box-sizing: border-box; width: 100%; }

.zg-cat-style {
    border-top: 1px solid #e3e7e5;
    margin: 8px 0;
    padding-top: 8px;
    font-size: 11px;
}
body.zg-dark .zg-cat-style { border-top-color: #3a4440; }
.zg-row-style__title { font-weight: 700; font-size: 12px; }
.zg-row-style__label {
    display: flex; align-items: center; justify-content: space-between;
    color: #6f7873; font-size: 10px; margin-bottom: 3px;
}
.zg-row-style__swatches {
    display: grid; grid-template-columns: repeat(8, 1fr); gap: 3px;
}
.zg-row-style__swatch {
    width: 100%; height: 20px; padding: 0; cursor: pointer;
    border-radius: 4px; border: 1px solid rgba(0, 0, 0, .15);
}
.zg-row-style__swatch.active { box-shadow: 0 0 0 2px #1e2924 inset, 0 0 0 1px #fff inset; }
.zg-row-style__swatch--none {
    background:
        linear-gradient(135deg, transparent 45%, #d9534f 45%, #d9534f 55%, transparent 55%),
        #ffffff;
}
.zg-row-style__custom {
    display: flex; align-items: center; gap: 6px; margin-top: 4px;
}
.zg-row-style__custom input[type="color"] {
    width: 34px; height: 22px; padding: 1px; cursor: pointer;
    border: 1px solid #dde3e0; border-radius: 4px; background: #fff;
}
.zg-row-style__preview {
    flex: 1; min-height: 34px; padding: 4px 8px;
    border: 1px solid #dde3e0; border-radius: 6px;
    display: flex; flex-direction: column; justify-content: center;
    overflow: hidden;
}
.zg-row-style__preview b { font-size: 12px; line-height: 1.2; }
.zg-row-style__preview span { font-size: 9px; line-height: 1.2; }
.zg-row-style__actions { display: flex; gap: 6px; }
.zg-row-style__actions button {
    flex: 1; height: 26px; border-radius: 6px; cursor: pointer;
    font-family: inherit; font-size: 11px;
    border: 1px solid #dde3e0; background: #ffffff;
}
.zg-row-style__actions button:hover { background: #f3f6f4; }
.zg-row-style__new {
    padding: 6px; border-radius: 6px; background: #f6f8f7;
    border: 1px dashed #cfd8d3;
}

body.zg-dark .zg-row-style { border-top-color: #3a4440; }
body.zg-dark .zg-row-style__label { color: #a5b0aa; }
body.zg-dark .zg-row-style__new { background: #252c29; border-color: #3a4440; }
body.zg-dark .zg-row-style__actions button { background: #2b3330; border-color: #3a4440; color: inherit; }
body.zg-dark .zg-row-style__preview { border-color: #3a4440; }
`;

    document.head.appendChild(style);


    /* =====================================================
       DATA HELPERS
    ===================================================== */

    function findRowData(categoryId, rowId) {

        const category = categories.find(item => item.id === categoryId);

        if (!category || !Array.isArray(category.rows)) {
            return { category: null, row: null };
        }

        return {
            category,
            row: category.rows.find(item => item.id === rowId) || null
        };
    }

    function resolvedColors(row) {

        return {
            bgColor: row && row.bgColor ? row.bgColor : defaults.bgColor,
            mainColor: row && row.mainColor ? row.mainColor : defaults.mainColor,
            roleColor: row && row.roleColor ? row.roleColor : defaults.roleColor
        };
    }


    /* =====================================================
       APPLY TO DOM
    ===================================================== */

    function setImportant(element, property, value) {

        if (!element) {
            return;
        }

        if (value) {
            element.style.setProperty(property, value, "important");
        } else {
            element.style.removeProperty(property);
        }
    }

    function applyRow(element) {

        const { row } = findRowData(element.dataset.categoryId, element.dataset.rowId);

        if (!row) {
            return;
        }

        const colors = resolvedColors(row);

        setImportant(element, "background-color", colors.bgColor);

        element.classList.toggle("zg-row-has-bg", Boolean(colors.bgColor));

        setImportant(element.querySelector(".party-main"), "color", colors.mainColor);
        setImportant(element.querySelector(".party-role"), "color", colors.roleColor);
    }

    function applyAll() {

        partySidebarEl.querySelectorAll(".party-row").forEach(applyRow);
    }

    /* app.js วาดแถวใหม่ทุกครั้ง (เพิ่ม/ลบแถว, เปลี่ยนแผน, ย้อนกลับ ฯลฯ) */
    new MutationObserver(applyAll).observe(partySidebarEl, { childList: true });

    window.addEventListener("zg-plan-applied", () => requestAnimationFrame(applyAll));

    applyAll();


    /* =====================================================
       ROW MENU — แทรกส่วนตั้งค่าสีในเมนู ⋮ ของแถว
    ===================================================== */

    let menuContext = null;     // { categoryId, rowId, button }

    /* capture: รู้ก่อน app.js ว่ากด ⋮ ของแถวไหน */
    document.addEventListener("click", event => {

        const button = event.target.closest && event.target.closest(".row-more-btn");

        if (!button) {
            return;
        }

        const rowElement = button.closest(".party-row");

        if (!rowElement) {
            return;
        }

        menuContext = {
            categoryId: rowElement.dataset.categoryId,
            rowId: rowElement.dataset.rowId,
            button
        };

    }, true);


    function swatchGrid(colors, current, allowNone) {

        const items = [];

        if (allowNone) {
            items.push(
                `<button type="button" class="zg-row-style__swatch zg-row-style__swatch--none ${!current ? "active" : ""}"
                    data-color="" title="ค่าเริ่มต้น"></button>`
            );
        }

        colors.forEach(color => {
            items.push(
                `<button type="button" class="zg-row-style__swatch ${current && current.toLowerCase() === color ? "active" : ""}"
                    data-color="${color}" style="background:${color}" title="${color}"></button>`
            );
        });

        return `<div class="zg-row-style__swatches">${items.join("")}</div>`;
    }


    function colorField(key, label, colors, current, allowNone) {

        return `
            <div class="zg-row-style__field" data-field="${key}">
                <div class="zg-row-style__label">${label}</div>
                ${swatchGrid(colors, current, allowNone)}
                <div class="zg-row-style__custom">
                    <input type="color" value="${current || "#ffffff"}" title="เลือกสีเอง">
                    <span class="zg-row-style__label" style="margin:0">เลือกสีเอง</span>
                </div>
            </div>
        `;
    }


    function enhanceRowMenu(menu) {

        if (!menuContext || menu.dataset.zgRowStyle) {
            return;
        }

        menu.dataset.zgRowStyle = "1";

        const context = menuContext;

        const { category, row } = findRowData(context.categoryId, context.rowId);

        if (!row) {
            return;
        }

        const addButton = menu.querySelector(".row-action-item:not(.row-delete-item)");


        /* ---------- สีแถวใหม่ (ก่อนกดเพิ่ม) ---------- */

        let newRowBg = defaults.bgColor || "";

        const newSection = document.createElement("div");

        newSection.className = "zg-row-style__new";

        newSection.innerHTML = colorField("newBg", "สีช่องของแถวใหม่ (เลือกก่อนกดเพิ่ม)", BG_COLORS, newRowBg, true);

        if (addButton) {
            menu.insertBefore(newSection, addButton);
        } else {
            menu.appendChild(newSection);
        }

        bindField(newSection.querySelector("[data-field]"), color => {
            newRowBg = color;
        });


        /* หลัง app.js เพิ่มแถวแล้ว → ใส่สีให้แถวใหม่ */
        if (addButton && category) {

            const knownIds = new Set(category.rows.map(item => item.id));

            addButton.addEventListener("click", () => {

                category.rows.forEach(item => {

                    if (knownIds.has(item.id)) {
                        return;
                    }

                    if (newRowBg) item.bgColor = newRowBg;
                    if (defaults.mainColor) item.mainColor = defaults.mainColor;
                    if (defaults.roleColor) item.roleColor = defaults.roleColor;
                });

                applyAll();
            });
        }


        /* ---------- ตั้งค่าแถวนี้ ---------- */

        const colors = resolvedColors(row);

        const section = document.createElement("div");

        section.className = "zg-row-style";

        section.innerHTML = `
            <div class="zg-row-style__title">ตั้งค่าสีแถวนี้</div>

            <div class="zg-row-style__preview">
                <b>${escapeText(row.text)}</b>
                <span>${escapeText(row.role)}</span>
            </div>

            ${colorField("bgColor", "สีช่อง", BG_COLORS, row.bgColor || "", true)}
            ${colorField("mainColor", "สีตัวหนา", TEXT_COLORS, colors.mainColor, false)}
            ${colorField("roleColor", "สีตัวบาง", TEXT_COLORS, colors.roleColor, false)}

            <div class="zg-row-style__actions">
                <button type="button" data-action="all">ใช้ทั้งหมวด</button>
                <button type="button" data-action="default">ตั้งเป็นค่าเริ่มต้น</button>
            </div>
            <div class="zg-row-style__actions">
                <button type="button" data-action="reset">คืนค่าเริ่มต้น</button>
            </div>
        `;

        menu.appendChild(section);

        const preview = section.querySelector(".zg-row-style__preview");

        function refreshPreview() {

            const current = resolvedColors(row);

            preview.style.background = current.bgColor || "#ffffff";
            preview.querySelector("b").style.color = current.mainColor;
            preview.querySelector("span").style.color = current.roleColor;
        }

        refreshPreview();

        section.querySelectorAll("[data-field]").forEach(field => {

            const key = field.dataset.field;

            bindField(field, color => {

                if (color) {
                    row[key] = color;
                } else {
                    delete row[key];
                }

                applyAll();
                refreshPreview();
            });
        });


        section.querySelector("[data-action='all']").addEventListener("click", () => {

            if (!category) return;

            category.rows.forEach(item => {

                ["bgColor", "mainColor", "roleColor"].forEach(key => {
                    if (row[key]) item[key] = row[key];
                    else delete item[key];
                });
            });

            applyAll();
            toast("ใช้สีนี้กับทุกแถวในหมวดแล้ว");
        });


        section.querySelector("[data-action='default']").addEventListener("click", () => {

            const current = resolvedColors(row);

            defaults = {
                bgColor: row.bgColor || "",
                mainColor: current.mainColor,
                roleColor: current.roleColor
            };

            saveDefaults();
            applyAll();
            toast("ตั้งเป็นค่าเริ่มต้นแล้ว (ใช้กับแถวใหม่ และแถวที่ยังไม่ได้ตั้งสี)");
        });


        section.querySelector("[data-action='reset']").addEventListener("click", () => {

            delete row.bgColor;
            delete row.mainColor;
            delete row.roleColor;

            applyAll();
            refreshPreview();

            section.querySelectorAll("[data-field]").forEach(field => {
                markActive(field, resolvedColors(row)[field.dataset.field] || "");
            });
        });


        /* เมนูเดิมแคบ → ขยายให้พอดีเนื้อหา แล้วจัดตำแหน่งใหม่ไม่ให้ล้นจอ */
        menu.classList.add("zg-row-style-menu");

        menu.style.maxHeight = `${window.innerHeight - 12}px`;

        if (typeof positionFloatingMenu === "function" && context.button) {
            positionFloatingMenu(menu, context.button);
        }
    }


    function markActive(field, color) {

        field.querySelectorAll(".zg-row-style__swatch").forEach(swatch => {
            swatch.classList.toggle(
                "active",
                (swatch.dataset.color || "").toLowerCase() === (color || "").toLowerCase()
            );
        });

        const input = field.querySelector("input[type='color']");

        if (input && color) {
            input.value = color;
        }
    }


    function bindField(field, onChange) {

        field.querySelectorAll(".zg-row-style__swatch").forEach(swatch => {

            swatch.addEventListener("click", event => {

                event.stopPropagation();

                const color = swatch.dataset.color || "";

                markActive(field, color);
                onChange(color);
            });
        });

        const input = field.querySelector("input[type='color']");

        input.addEventListener("input", () => {

            markActive(field, input.value);
            onChange(input.value);
        });
    }


    function escapeText(value) {

        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }


    function toast(message) {

        const element = document.createElement("div");

        element.textContent = message;

        element.style.cssText =
            "position:fixed;left:50%;bottom:28px;transform:translateX(-50%);" +
            "background:#1e2924;color:#fff;padding:8px 14px;border-radius:8px;" +
            "font-size:12px;z-index:30000;box-shadow:0 6px 20px rgba(0,0,0,.2);";

        document.body.appendChild(element);

        setTimeout(() => element.remove(), 1800);
    }


    /* เมนูแถวถูกสร้างใหม่ทุกครั้งที่กด ⋮ */
    new MutationObserver(records => {

        records.forEach(record => {

            record.addedNodes.forEach(node => {

                if (node.nodeType === 1 && node.classList.contains("row-action-menu")) {
                    enhanceRowMenu(node);
                }
            });
        });

    }).observe(document.body, { childList: true });


    /* =====================================================
       CATEGORY — สีตัวอักษรชื่อหมวดหมู่ (category.textColor)
    ===================================================== */

    const categorySidebarEl = document.getElementById("categorySidebar");
    const categoryMenuEl = document.getElementById("categoryMenu");

    function applyCategories() {

        if (!categorySidebarEl) {
            return;
        }

        categorySidebarEl.querySelectorAll(".category").forEach(element => {

            const category = categories.find(item => item.id === element.dataset.categoryId);

            setImportant(
                element.querySelector(".category-name"),
                "color",
                category && category.textColor ? category.textColor : ""
            );
        });
    }

    if (categorySidebarEl) {
        new MutationObserver(applyCategories).observe(categorySidebarEl, { childList: true });
    }

    window.addEventListener("zg-plan-applied", () => requestAnimationFrame(applyCategories));

    applyCategories();


    function currentCategory() {

        if (typeof selectedCategoryId === "undefined" || !selectedCategoryId) {
            return null;
        }

        return categories.find(item => item.id === selectedCategoryId) || null;
    }


    if (categoryMenuEl) {

        const catSection = document.createElement("div");

        catSection.className = "zg-cat-style";

        catSection.innerHTML =
            colorField("textColor", "สีตัวอักษรหมวดหมู่", TEXT_COLORS, "", true);

        const deleteBtn = categoryMenuEl.querySelector("#deleteCategoryBtn");

        if (deleteBtn) {
            categoryMenuEl.insertBefore(catSection, deleteBtn);
        } else {
            categoryMenuEl.appendChild(catSection);
        }

        const catField = catSection.querySelector("[data-field]");

        bindField(catField, color => {

            const category = currentCategory();

            if (!category) {
                return;
            }

            if (color) {
                category.textColor = color;
            } else {
                delete category.textColor;
            }

            applyCategories();
        });

        /* เปิดเมนูหมวดหมู่ → แสดงสีปัจจุบัน */
        new MutationObserver(() => {

            if (!categoryMenuEl.classList.contains("open")) {
                return;
            }

            const category = currentCategory();

            markActive(catField, category && category.textColor ? category.textColor : "");

        }).observe(categoryMenuEl, { attributes: true, attributeFilter: ["class"] });
    }


    window.ZGRowStyle = {
        refresh() { applyAll(); applyCategories(); },
        getDefaults: () => ({ ...defaults }),
        setDefaults(next) {
            defaults = { ...defaults, ...next };
            saveDefaults();
            applyAll();
        }
    };

})();