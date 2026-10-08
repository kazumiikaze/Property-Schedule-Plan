"use strict";

/* =========================================================
   TEXT-MAGNET.JS — ซ่อนปุ่มแม่เหล็ก 🧲 ของกล่อง Text ที่ติดกับ object แล้ว
   - เดิม: ติดแม่เหล็ก (ล็อกกับกล่องงาน/เส้น) แล้วปุ่ม 🧲 สีเขียวโชว์ค้างตลอด ดูรก
   - ใหม่: ซ่อนไว้ · เอาเมาส์ชี้ที่กล่อง Text ถึงจะเห็น (กดปลดได้เหมือนเดิม)
   - ตอนลากกล่องเข้าใกล้ object (กำลังจะติด) ยังเห็นปุ่มกระพริบเหมือนเดิม
   - ไม่แก้ text.js / style.css
========================================================= */

(function () {

    const style = document.createElement("style");

    style.textContent = `
/* v2: ติดแม่เหล็กแล้ว → ซ่อนปุ่ม 🧲 ทันที (ชี้กล่องก็ไม่โผล่)
   จะปลด: เอาเมาส์ชี้ตรงตำแหน่งปุ่ม (ซ้ายของ ⚙) ปุ่มจะโผล่ให้กด */
.zg-text-box.is-attached .zg-text-btn--magnet {
    opacity: 0;
    animation: none !important;
    transition: opacity .12s ease;
}
.zg-text-box.is-attached .zg-text-btn--magnet:hover,
.zg-text-box.is-attached .zg-text-btn--magnet:focus-visible { opacity: 1; }
.zg-text-box.is-attached:not(:hover):not(.is-selected) .zg-text-btn--magnet { visibility: hidden; }
`;

    document.head.appendChild(style);

})();
