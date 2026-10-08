"use strict";

/* =========================================================
   ROW-SYNC.JS — กล่องงาน (task) ยึดตาม "แถว" เวลาแถวสูง/เตี้ยลง

   ปัญหาเดิม: กล่องงานเก็บตำแหน่งแนวตั้งเป็น px (y, height)
   แต่ความสูงแถว (categoryHeight) เปลี่ยนตามขนาดหน้าต่าง
   → กด Ctrl+ ซูมเบราว์เซอร์ 110–150% / ย่อขยายหน้าต่าง / เปิดแผนบนจออื่น
     กล่องงานไม่ยืดตามแถว ล้นแถว / ลอยผิดแถว

   วิธีแก้ (ไม่แก้ app.js / style.css):
   ครอบ calculateGeometry() — แถวสูงเปลี่ยน → ปรับ y / height ของกล่องงานตามสัดส่วน
   (ตอนเปิดไฟล์แผน io.js ปรับให้อยู่แล้วด้วย layout.categoryHeight)

   โหลดหลัง app.js
========================================================= */

(function () {

    if (typeof calculateGeometry !== "function" || typeof timelineObjects === "undefined") {
        console.warn("[row-sync.js] ต้องโหลดหลัง app.js");
        return;
    }

    const TYPES = ["task"];

    let lastUnit = categoryHeight > 0 ? categoryHeight : 0;

    /* ช่องเส้นวันที่ / Bracket ก็สูง-เตี้ยตามหน้าจอ → เส้นวันที่ / เส้นแนวนอน ยึดตามสัดส่วนเหมือนกัน */
    const BRACKET_TYPES = ["dateline", "hline"];

    function bracketSize() {
        return typeof bracketContent !== "undefined" && bracketContent ? bracketContent.clientHeight : 0;
    }

    let lastBracket = bracketSize();

    /* ---------- 1) แถวสูงเปลี่ยนระหว่างใช้งาน ---------- */

    const originalCalculateGeometry = calculateGeometry;

    calculateGeometry = function () {

        const result = originalCalculateGeometry.apply(this, arguments);

        const unit = categoryHeight;

        if (unit > 0) {

            if (lastUnit > 0 && Math.abs(unit - lastUnit) > 0.01) {

                const ratio = unit / lastUnit;

                timelineObjects.forEach(object => {
                    if (!object || !TYPES.includes(object.type)) return;
                    if (Number.isFinite(object.y)) object.y *= ratio;
                    if (Number.isFinite(object.height)) object.height = Math.max(16, object.height * ratio);
                    /* ความสูงก่อนข้อความดันกล่องให้สูงขึ้น (app.js) → ย่อ/ขยายตามด้วย */
                    if (Number.isFinite(object.baseHeight)) object.baseHeight = Math.max(16, object.baseHeight * ratio);
                });
            }

            lastUnit = unit;
        }

        const bracket = bracketSize();

        if (bracket > 0) {

            if (lastBracket > 0 && Math.abs(bracket - lastBracket) > 0.5) {

                const ratio = bracket / lastBracket;

                timelineObjects.forEach(object => {
                    if (object && BRACKET_TYPES.includes(object.type) && Number.isFinite(object.y)) {
                        object.y *= ratio;
                    }
                });
            }

            lastBracket = bracket;
        }

        return result;
    };


    window.ZGRowSync = {
        unit: () => lastUnit,
        bracket: () => lastBracket
    };

})();
