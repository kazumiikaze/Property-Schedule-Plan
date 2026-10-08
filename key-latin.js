"use strict";

/* =========================================================
   KEY-LATIN.JS — คีย์ลัด Ctrl/⌘ + ตัวอักษร ใช้ได้แม้เปิดแป้นพิมพ์ภาษาไทย
   ปัญหาเดิม: ตอนแป้นพิมพ์เป็นภาษาไทย กด Ctrl+Z เบราว์เซอร์ส่งตัวอักษร "ผ" แทน "z"
     → ย้อนกลับ (Ctrl+Z) / ทำซ้ำ (Ctrl+Y) / ทำสำเนา (Ctrl+D) / ค้นหา (Ctrl+K) ฯลฯ ไม่ทำงาน
   แก้: ตอนกด Ctrl/⌘ ค้างไว้ ให้ event.key เป็นตัวอักษรอังกฤษตามปุ่มจริงบนแป้น (event.code)
     (พิมพ์ภาษาไทยตามปกติไม่ได้รับผลกระทบ — มีผลเฉพาะตอนกด Ctrl/⌘)
   ไม่แก้ app.js / style.css
========================================================= */

(function () {

    const proto = window.KeyboardEvent && KeyboardEvent.prototype;
    if (!proto) return;

    const descriptor = Object.getOwnPropertyDescriptor(proto, "key");
    if (!descriptor || typeof descriptor.get !== "function" || proto.__zgLatinKey) return;

    const originalGet = descriptor.get;

    Object.defineProperty(proto, "key", {
        configurable: true,
        enumerable: descriptor.enumerable,
        get() {
            const key = originalGet.call(this);

            if ((this.ctrlKey || this.metaKey) && typeof key === "string" && key.length === 1 && !/[\x00-\x7F]/.test(key)) {
                const match = /^Key([A-Z])$/.exec(this.code || "");
                if (match) return this.shiftKey ? match[1] : match[1].toLowerCase();
                const digit = /^Digit([0-9])$/.exec(this.code || "");
                if (digit) return digit[1];
            }

            return key;
        }
    });

    proto.__zgLatinKey = true;

})();
