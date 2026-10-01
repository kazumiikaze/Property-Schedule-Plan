"use strict";

/* =========================================================
   UPDATE-DATE.JS — ป้าย "Update" + ปฏิทินเลือกวันที่อัปเดตแผน
   วางที่มุมขวาล่างของกระดาน (ใต้ช่องบันทึกท้ายกระดาน)

   โหลดหลัง app.js (ไม่แก้โค้ดเดิม)
   ใช้ formatDateInputValue / parseDateInputValue ของ app.js
========================================================= */

(function () {

    const plan =
        document.querySelector(".plan");

    if (!plan) {

        return;
    }


    /* =====================================================
       STYLE
    ===================================================== */

    const style =
        document.createElement("style");

    style.textContent = `
.zg-update-date {
    position: absolute;
    right: .5%;
    bottom: calc((var(--footer-reserved-height) - 28px) / 2);
    height: 28px;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 4px 0 10px;
    background: #ffffff;
    border: 1px solid #dde3e0;
    border-radius: 8px;
    z-index: 130;
}
.zg-update-date-label {
    color: #3a8a4f;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: .3px;
    white-space: nowrap;
    cursor: pointer;
    user-select: none;
}
.zg-update-date-input {
    height: 22px;
    padding: 0 6px;
    border: 1px solid #dde3e0;
    border-radius: 6px;
    background: #ffffff;
    color: #252b28;
    font-family: inherit;
    font-size: 11px;
    cursor: pointer;
}
.zg-update-date-input:hover { border-color: #b9c4bd; }
`;

    document.head.appendChild(style);


    /* =====================================================
       ELEMENT
    ===================================================== */

    const wrap =
        document.createElement("div");

    wrap.className =
        "zg-update-date";

    wrap.innerHTML = `
        <label class="zg-update-date-label" for="zgUpdateDateInput">Update</label>
        <input type="date" id="zgUpdateDateInput" class="zg-update-date-input" title="วันที่อัปเดตแผน">
    `;

    plan.appendChild(wrap);


    const input =
        wrap.querySelector(".zg-update-date-input");

    /* ค่าเริ่มต้น = วันนี้ */
    input.value =
        formatDateInputValue(new Date());


    /* กดที่คำว่า Update หรือช่องวันที่ → เปิดปฏิทิน */
    function openPicker() {

        if (typeof input.showPicker === "function") {

            try {
                input.showPicker();
            } catch (error) {
                input.focus();
            }

        } else {

            input.focus();
        }
    }

    wrap.querySelector(".zg-update-date-label")
        .addEventListener("click", event => {

            event.preventDefault();

            openPicker();
        });

    input.addEventListener("click", openPicker);


    /* =====================================================
       PUBLIC API (ใช้โดย io.js สำหรับ Export / Import)
    ===================================================== */

    window.ZGUpdateDate = {

        /* คืนค่า "YYYY-MM-DD" หรือ "" ถ้าว่าง */
        get() {

            return input.value || "";
        },

        set(value) {

            if (
                typeof value === "string" &&
                /^\d{4}-\d{2}-\d{2}$/.test(value)
            ) {

                input.value = value;
            }
        }
    };

})();