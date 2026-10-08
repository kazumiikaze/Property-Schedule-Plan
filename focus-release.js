"use strict";

/* =========================================================
   FOCUS-RELEASE.JS — คีย์ลัด (Ctrl+C / V / Z / Y, Delete, Shift เลือก) ใช้ได้หลังพิมพ์ข้อความ
   ปัญหาเดิม: พิมพ์ข้อความในช่องไหนก็ตาม (กล่องงาน, ชื่อหมวด, กล่อง Text ฯลฯ)
     แล้วไปคลิกกล่องงาน / เส้น / รูปบนตาราง → เคอร์เซอร์ยังค้างอยู่ในช่องเดิม
     (ระบบลาก object กันไม่ให้เบราว์เซอร์ย้ายโฟกัส)
     → คีย์ลัดคิดว่ายังพิมพ์อยู่ เลยไม่ทำงาน และกด Delete กลับไปลบตัวหนังสือในช่องเดิม
   แก้: คลิกที่ object / ตาราง / ช่องเส้นวันที่ (นอกช่องที่กำลังพิมพ์) → ออกจากโหมดพิมพ์ก่อน
   ไม่แก้ app.js / style.css
========================================================= */

(function () {

    /* คลิกตรงนี้ = ทำงานกับ object บนกระดาน */
    const BOARD = [
        ".canvas-object",
        ".zg-bimg",
        ".zg-text-box",
        ".zg-line-hit",
        "#scheduleArea",
        "#bracketArea",
        "#objectLayerViewport",
        ".category",
        ".party-row"
    ].join(", ");

    /* ปุ่ม / แถบที่ต้องคงโฟกัสไว้ (แถบปรับตัวอักษร, ที่จับยืดช่องพิมพ์) */
    const KEEP = ".zg-ts-bar, .zg-lbl-handle, .object-menu";

    function isEditable(element) {
        return element instanceof Element &&
            Boolean(element.closest("input, textarea, select, [contenteditable=''], [contenteditable='true']"));
    }

    window.addEventListener("mousedown", event => {

        const active = document.activeElement;

        if (!isEditable(active)) return;

        const target = event.target instanceof Element ? event.target : null;

        if (!target || active.contains(target) || target.closest(KEEP)) return;

        /* คลิกช่องพิมพ์อื่น → เบราว์เซอร์ย้ายโฟกัสเอง */
        if (isEditable(target)) return;

        if (!target.closest(BOARD)) return;

        active.blur();

        const selection = window.getSelection();
        if (selection) selection.removeAllRanges();

    }, true);

})();
