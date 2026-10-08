"use strict";

/* =========================================================
   BRACKET-SIZE.JS — ช่อง "เส้นวันที่ / Bracket" สูงขึ้น (บน-ล่างกว้างขึ้น)
   - เดิมสูง 9.5% ของกระดาน → 13%
   - ช่องบันทึกท้ายกระดานขยับลงตาม (เตี้ยลงเท่ากัน) ตารางด้านบนขนาดเท่าเดิม
   - เส้นวันที่ / เส้นแนวนอนที่วางไว้ ขยับตามสัดส่วนเอง (row-sync.js)
   - ตอนซูมเบราว์เซอร์ (zoom-focus.js) ใช้ความสูงชุดเดียวกัน
   - ไม่แก้ app.js / style.css
========================================================= */

(function () {

    const EXTRA = 3.5;              // % ที่เพิ่ม (9.5 → 13)
    const HEIGHT = 9.5 + EXTRA;     // ความสูงช่องเส้นวันที่ (% ของกระดาน)

    window.ZG_BRACKET_RATIO = HEIGHT / 100;

    const style = document.createElement("style");

    style.textContent = `
.bracket-area { height: ${HEIGHT}%; }
.hline-layer-viewport { height: calc(${50 + EXTRA}% - var(--timeline-header-height)); }
.board-notes-section { top: ${69.2 + EXTRA}%; }
`;

    document.head.appendChild(style);

})();
