"use strict";

/* =========================================================
   MONTH-UI.JS — หน้าตาปุ่ม เพิ่ม / ลด เดือน แบบใหม่

        ◀ [ + ] [ − ]   [ − ] [ + ] ▶
             เพิ่ม / ลด เดือน

   - ฝั่งซ้าย  : + เพิ่มเดือนด้านหน้า / − ลดเดือนด้านหน้า
   - ฝั่งขวา  : − ลดเดือนด้านท้าย   / + เพิ่มเดือนด้านท้าย
   - ◀ ▶ เป็นแค่สัญลักษณ์บอกทิศ (กดไม่ได้)
   - ใช้ปุ่มเดิมของ app.js (id เดิม) → การทำงานเหมือนเดิมทุกอย่าง

   ไม่แก้ app.js / style.css — โหลดหลัง app.js (ก่อน lang.js)
========================================================= */

(function () {

    const extendStart = document.getElementById("extendStartBtn");
    const shrinkStart = document.getElementById("shrinkStartBtn");
    const shrinkEnd = document.getElementById("shrinkEndBtn");
    const extendEnd = document.getElementById("extendEndBtn");

    if (!extendStart || !shrinkStart || !shrinkEnd || !extendEnd) {

        console.error("[month-ui.js] ไม่พบปุ่มเพิ่ม/ลดเดือน");

        return;
    }

    const group =
        extendStart.closest(".toolbar-group--month") ||
        extendStart.parentElement;


    /* =====================================================
       STYLE
    ===================================================== */

    const style = document.createElement("style");

    style.textContent = `
.toolbar-group--month.zg-month {
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 1px;
    padding: 0 8px;
}
.zg-month__row {
    display: flex;
    align-items: center;
    gap: 4px;
}
.zg-month__arrow {
    font-family: inherit;
    font-size: 11px;
    line-height: 1;
    color: #3d4541;
    padding: 0 1px;
    pointer-events: none;
}
.zg-month__divider {
    width: 1px;
    align-self: stretch;
    margin: 0 4px;
    background: #aab2ad;
    border-radius: 1px;
}
.toolbar-group--month.zg-month .zg-month__btn {
    width: 30px;
    min-width: 30px;
    height: 17px;
    padding: 0 !important;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    border: 1px solid #dde3e0;
    background: #ffffff;
    color: #222222;
    font-family: inherit;
    font-size: 16px;
    font-weight: 400;
    line-height: 1;
    cursor: pointer;
}
.toolbar-group--month.zg-month .zg-month__btn:hover { background: #eaf4ed; border-color: #b9d8c2; }
.toolbar-group--month.zg-month .zg-month__btn:active { transform: translateY(1px); }
.zg-month__label {
    padding: 1px 14px 0;
    height: 15px;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    border: 1px solid #dde3e0;
    background: #ffffff;
    color: #3d4541;
    font-family: inherit;
    font-size: 11px;
    font-weight: 400;
    line-height: 13px;
    white-space: nowrap;
    pointer-events: none;
}

body.zg-dark .zg-month__arrow,
body.zg-dark .zg-month__label,
body.zg-dark .toolbar-group--month.zg-month .zg-month__btn { color: #e3e9e5; }
body.zg-dark .toolbar-group--month.zg-month .zg-month__btn,
body.zg-dark .zg-month__label { background: #2b3330; border-color: #3a4440; }
body.zg-dark .toolbar-group--month.zg-month .zg-month__btn:hover { background: #33413a; }
body.zg-dark .zg-month__divider { background: #56615b; }
`;

    document.head.appendChild(style);


    /* =====================================================
       BUILD — ย้ายปุ่มเดิมเข้าโครงใหม่ (event เดิมติดไปด้วย)
    ===================================================== */

    function setup(button, symbol, title) {

        button.textContent = symbol;
        button.title = title;
        button.setAttribute("aria-label", title);
        button.classList.add("zg-month__btn");
    }

    setup(extendStart, "+", "เพิ่มเดือนด้านหน้า");
    setup(shrinkStart, "−", "ลดเดือนด้านหน้า");
    setup(shrinkEnd, "−", "ลดเดือนด้านท้าย");
    setup(extendEnd, "+", "เพิ่มเดือนด้านท้าย");

    const row = document.createElement("div");

    row.className = "zg-month__row";

    const leftArrow = document.createElement("span");
    leftArrow.className = "zg-month__arrow";
    leftArrow.textContent = "◀";

    const gap = document.createElement("span");
    gap.className = "zg-month__divider";

    const rightArrow = document.createElement("span");
    rightArrow.className = "zg-month__arrow";
    rightArrow.textContent = "▶";

    row.append(leftArrow, extendStart, shrinkStart, gap, shrinkEnd, extendEnd, rightArrow);

    const label = document.createElement("div");

    label.className = "zg-month__label";
    label.textContent = "เพิ่ม / ลด เดือน";

    group.innerHTML = "";

    group.classList.add("zg-month");

    group.append(row, label);

})();
