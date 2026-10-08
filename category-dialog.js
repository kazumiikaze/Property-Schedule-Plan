"use strict";

/* =========================================================
   CATEGORY-DIALOG.JS — หน้าต่าง "เพิ่มหมวดหมู่" ใหม่ให้สวยและใช้ง่าย
   - ชื่อหมวด: ช่องว่างพร้อมคำแนะนำ (ไม่ต้องลบ "Category" เอง)
     + รายการชื่อหมวดที่เคยใช้ / เพิ่มชื่อใหม่ในรายการได้ (row-edit.js)
   - สี: ปุ่มสีกลม มีเครื่องหมาย ✓ ตรงสีที่เลือก · "สีอื่น…" เลือกเองได้
   - ตัวอย่างหมวดหมู่แบบสด ๆ (สีพื้น + ชื่อ) ก่อนกดเพิ่ม
   - ปรับหน้าตาหน้าต่างทุกบานที่ใช้แบบเดียวกัน (เพิ่มงาน / แก้วันที่ /
     แก้ข้อความ) ให้เข้าชุดกัน: มุมโค้ง ช่องพิมพ์ใหญ่ขึ้น ปุ่มชัดขึ้น

   ไม่แก้ app.js / style.css — โหลดหลัง row-edit.js
========================================================= */

(function () {

    if (typeof openNewCategoryDialog !== "function") {

        console.error("[category-dialog.js] ไม่พบ openNewCategoryDialog ของ app.js");

        return;
    }


    /* =====================================================
       STYLE
    ===================================================== */

    const style = document.createElement("style");

    style.textContent = `
/* ---------- หน้าต่างทุกบาน (เข้าชุดกัน) ---------- */
body .new-category-dialog {
    padding: 16px 16px 14px;
    gap: 12px;
    border: 1px solid #e1e7e3;
    border-radius: 14px;
    box-shadow: 0 18px 48px rgba(15, 35, 25, .22), 0 2px 6px rgba(0, 0, 0, .06);
    font-family: Arial, Helvetica, sans-serif;
    color: #1e2924;
    animation: zgDialogIn .14s ease-out;
}
@keyframes zgDialogIn { from { opacity: 0; transform: translateY(-6px) scale(.98); } to { opacity: 1; transform: none; } }
body .new-category-dialog .ncd-title { font-size: 15px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
body .new-category-dialog .ncd-label { margin-bottom: 5px; color: #66716b; font-size: 11px; font-weight: 700; }
body .new-category-dialog input[type="text"],
body .new-category-dialog input[type="date"],
body .new-category-dialog select {
    height: 36px;
    padding: 0 11px;
    box-sizing: border-box;
    border: 1px solid #d6ded9;
    border-radius: 9px;
    background: #ffffff;
    font-family: inherit;
    font-size: 13px;
    color: #1e2924;
    outline: none;
    transition: border-color .12s ease, box-shadow .12s ease;
}
body .new-category-dialog input[type="text"] { width: 100%; }
body .new-category-dialog input[type="text"]:focus,
body .new-category-dialog input[type="date"]:focus,
body .new-category-dialog select:focus {
    border-color: #3a8a4f;
    box-shadow: 0 0 0 3px rgba(58, 138, 79, .18);
}
body .new-category-dialog input::placeholder { color: #a7b0ab; }
body .new-category-dialog .ncd-actions { gap: 8px; margin-top: 2px; }
body .new-category-dialog .ncd-actions button {
    height: 38px;
    border: 1px solid transparent;
    border-radius: 10px;
    background: #f1f4f2;
    color: #3d4842;
    font-family: inherit;
    font-size: 13px;
    font-weight: 700;
    transition: background-color .12s ease, transform .06s ease;
}
body .new-category-dialog .ncd-actions button:hover { background: #e6ebe8; }
body .new-category-dialog .ncd-actions button:active { transform: translateY(1px); }
body .new-category-dialog .ncd-actions .ncd-ok {
    background: #3a8a4f;
    border-color: #3a8a4f;
    color: #ffffff;
    box-shadow: 0 4px 12px rgba(58, 138, 79, .28);
}
body .new-category-dialog .ncd-actions .ncd-ok:hover { background: #317a44; }

/* ---------- หน้าต่างเพิ่มหมวดหมู่ ---------- */
body .new-category-dialog.zg-catdlg { width: 300px; }
.zg-catdlg-icon {
    width: 28px;
    height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 9px;
    background: #e7f3ea;
    font-size: 15px;
}
body .zg-catdlg .ncd-swatches { grid-template-columns: repeat(8, 1fr); gap: 7px; }
body .zg-catdlg .ncd-swatch {
    position: relative;
    width: 100%;
    aspect-ratio: 1;
    padding: 0;
    border: 2px solid #ffffff;
    border-radius: 50%;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, .12);
    cursor: pointer;
    transition: transform .1s ease, box-shadow .1s ease;
}
body .zg-catdlg .ncd-swatch:hover { transform: scale(1.12); }
body .zg-catdlg .ncd-swatch.active { box-shadow: 0 0 0 2px #1e2924; transform: scale(1.05); }
body .zg-catdlg .ncd-swatch.active::after {
    content: "✓";
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    font: 700 12px/1 Arial, Helvetica, sans-serif;
    text-shadow: 0 1px 2px rgba(0, 0, 0, .45);
}
.zg-catdlg-custom {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 9px;
    color: #66716b;
    font-size: 11.5px;
}
body .zg-catdlg .zg-catdlg-custom input[type="color"] {
    width: 34px;
    height: 26px;
    margin: 0 !important;
    padding: 0;
    border: 1px solid #d6ded9;
    border-radius: 8px;
    background: #ffffff;
    cursor: pointer;
}
.zg-catdlg-custom input[type="color"]::-webkit-color-swatch-wrapper { padding: 3px; }
.zg-catdlg-custom input[type="color"]::-webkit-color-swatch { border: none; border-radius: 5px; }
.zg-catdlg-hint { margin-top: 5px; color: #9aa39e; font-size: 10.5px; line-height: 1.45; }
.zg-catdlg-hex { font-family: Consolas, "Courier New", monospace; font-size: 11px; color: #8a948f; text-transform: uppercase; }
.zg-catdlg-preview {
    display: flex;
    align-items: stretch;
    height: 46px;
    border: 1px solid #dfe5e1;
    border-radius: 10px;
    overflow: hidden;
    background: #ffffff;
}
.zg-catdlg-preview-cat {
    flex: 0 0 46%;
    display: flex;
    align-items: center;
    padding: 0 12px;
    font-size: 13px;
    font-weight: 700;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    transition: background-color .15s ease, color .15s ease;
}
.zg-catdlg-preview-rows { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 5px; padding: 0 12px; }
.zg-catdlg-preview-rows span { display: block; height: 6px; border-radius: 4px; background: #e9edeb; }
.zg-catdlg-preview-rows span:first-child { width: 70%; background: #f6c9a5; }
.zg-catdlg-preview-rows span:last-child { width: 45%; background: #cfe5d5; }

body.zg-dark .new-category-dialog { background: #222a27; border-color: #3a4440; color: #e3e9e5; }
body.zg-dark .new-category-dialog input[type="text"],
body.zg-dark .new-category-dialog input[type="date"],
body.zg-dark .new-category-dialog select { background: #2b3330; border-color: #3a4440; color: #e3e9e5; }
body.zg-dark .new-category-dialog .ncd-actions button:not(.ncd-ok) { background: #2b3330; color: #e3e9e5; }
body.zg-dark .zg-catdlg-icon { background: #26372d; }
body.zg-dark .zg-catdlg-preview { background: #1f2623; border-color: #3a4440; }
body.zg-dark .zg-catdlg .ncd-swatch { border-color: #222a27; }
`;

    document.head.appendChild(style);


    /* =====================================================
       HELPERS
    ===================================================== */

    function textColorFor(hex) {

        const value = String(hex || "").replace("#", "");

        if (value.length !== 6) return "#1e2924";

        const r = parseInt(value.slice(0, 2), 16);
        const g = parseInt(value.slice(2, 4), 16);
        const b = parseInt(value.slice(4, 6), 16);

        /* ความสว่างตามสายตา */
        const light = (r * 299 + g * 587 + b * 114) / 1000;

        return light > 160 ? "#1e2924" : "#ffffff";
    }

    function escapeHtml(text) {
        return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }


    /* =====================================================
       ENHANCE
    ===================================================== */

    function enhance(dialog) {

        if (!dialog || dialog.dataset.zgCatdlg) return;

        dialog.dataset.zgCatdlg = "1";
        dialog.classList.add("zg-catdlg");

        const title = dialog.querySelector(".ncd-title");

        if (title && !title.querySelector(".zg-catdlg-icon")) {
            title.insertAdjacentHTML("afterbegin", `<span class="zg-catdlg-icon">🗂</span>`);
        }

        const nameInput = dialog.querySelector("#ncdName");
        const colorInput = dialog.querySelector("#ncdColor");

        /* ชื่อเริ่มต้น "Category" → ช่องว่าง + คำแนะนำ */
        if (nameInput) {

            const defaultName = typeof DEFAULT_CATEGORY_NAME !== "undefined" ? DEFAULT_CATEGORY_NAME : "Category";

            if (nameInput.value.trim() === defaultName) nameInput.value = "";

            nameInput.placeholder = "เช่น Contact, Payment, IEAT";

            const hint = document.createElement("div");

            hint.className = "zg-catdlg-hint";
            hint.textContent = "คลิกช่อง หรือกด ↓ เพื่อเลือกชื่อที่เคยใช้ · พิมพ์ชื่อใหม่แล้วกด ＋ เพื่อจำไว้";

            nameInput.insertAdjacentElement("afterend", hint);
            nameInput.setAttribute("autocomplete", "off");
        }

        /* "สีอื่น…" + รหัสสี */
        let hex = null;

        if (colorInput) {

            const row = document.createElement("div");

            row.className = "zg-catdlg-custom";
            row.innerHTML = `<span>หรือเลือกสีเอง</span>`;

            colorInput.parentNode.insertBefore(row, colorInput);

            row.appendChild(colorInput);

            hex = document.createElement("span");
            hex.className = "zg-catdlg-hex";

            row.appendChild(hex);
        }

        /* ตัวอย่างหมวดหมู่ */
        const previewWrap = document.createElement("div");

        previewWrap.innerHTML = `
            <div class="ncd-label">ตัวอย่าง</div>
            <div class="zg-catdlg-preview">
                <div class="zg-catdlg-preview-cat"></div>
                <div class="zg-catdlg-preview-rows"><span></span><span></span></div>
            </div>
        `;

        const actions = dialog.querySelector(".ncd-actions");

        dialog.insertBefore(previewWrap, actions);

        const previewCat = previewWrap.querySelector(".zg-catdlg-preview-cat");

        function update() {

            const color = colorInput ? colorInput.value : "#d9dcde";

            previewCat.style.background = color;
            previewCat.style.color = textColorFor(color);
            previewCat.innerHTML = escapeHtml((nameInput && nameInput.value.trim()) || "ชื่อหมวดหมู่");

            if (hex) hex.textContent = color;
        }

        if (nameInput) nameInput.addEventListener("input", update);
        if (colorInput) colorInput.addEventListener("input", update);

        dialog.querySelectorAll(".ncd-swatch").forEach(button => {
            button.addEventListener("click", () => setTimeout(update, 0));
        });

        update();

        /* หน้าต่างกว้างขึ้น → ไม่ให้ล้นจอ */
        requestAnimationFrame(() => {

            const rect = dialog.getBoundingClientRect();

            const margin = 8;

            if (rect.right > window.innerWidth - margin) {
                dialog.style.left = `${Math.max(margin, window.innerWidth - rect.width - margin)}px`;
            }

            if (rect.bottom > window.innerHeight - margin) {
                dialog.style.top = `${Math.max(margin, window.innerHeight - rect.height - margin)}px`;
            }
        });

        /* ชื่อที่เคยใช้ + เพิ่มชื่อใหม่ในรายการ */
        if (nameInput && window.ZGRowEdit && typeof window.ZGRowEdit.attach === "function") {

            window.ZGRowEdit.attach(nameInput, "category");

            nameInput.focus();
        }
    }

    const originalOpen = openNewCategoryDialog;

    openNewCategoryDialog = function () {

        const result = originalOpen.apply(this, arguments);

        try {

            const dialog =
                (typeof newCategoryDialog !== "undefined" && newCategoryDialog) ||
                document.querySelector(".new-category-dialog #ncdName")?.closest(".new-category-dialog");

            enhance(dialog);

        } catch (error) {

            console.error("[category-dialog.js]", error);
        }

        return result;
    };

    /* ปิดหน้าต่าง → ปิดรายการคำด้วย */
    if (typeof closeNewCategoryDialog === "function") {

        const originalClose = closeNewCategoryDialog;

        closeNewCategoryDialog = function () {

            if (window.ZGRowEdit && typeof window.ZGRowEdit.close === "function") window.ZGRowEdit.close();

            return originalClose.apply(this, arguments);
        };
    }

})();
