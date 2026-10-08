"use strict";

/* =========================================================
   (v3: เส้นอยู่ "ตรงกลางช่องของวันนั้น" = เส้นตารางขอบซ้ายของช่องวัน + ครึ่งช่องวัน
    → วัดเส้นตารางจากขอบซ้ายของเลขวันจริง แล้วบวกครึ่งช่อง)
   LINE-CENTER.JS — เส้นวันที่ / เส้นแนวตั้ง อยู่ "กึ่งกลางเลขวัน"
   - เดิม app.js วาดเส้นที่ขอบซ้ายของช่องวัน → เส้นอยู่ชิดซ้ายเลขวัน ดูไม่ตรง
   - ไฟล์นี้เลื่อนเส้นไปครึ่งช่องวัน ให้ตรงกลางเลขวันพอดี
     · เส้นแนวตั้ง (กดจากเลขวันที่ข้างบน)
     · เส้นวันที่ (เส้นประ + กล่องข้อความใต้ตาราง)
     · เส้นแนวนอนที่ผูกกับเส้นวันที่ → ปลายเส้นไปตรงกลางวันด้วย
   - ไม่เปลี่ยนข้อมูลวันที่ที่บันทึกไว้ (แค่ตำแหน่งที่วาด)
   - ไม่แก้ app.js / style.css — โหลดหลัง line.js และก่อน dateline-stem.js
========================================================= */

(function () {

    if (typeof renderObjects !== "function" || typeof objectLayer === "undefined" || typeof bracketContent === "undefined") {
        console.warn("[line-center.js] ต้องโหลดหลัง app.js");
        return;
    }

    /*
        ระยะจากขอบซ้ายช่องวัน (ที่ app.js วาดเส้น) ไปถึงกึ่งกลางเลขวันบนหัวตาราง
        วัดจากเลขวันจริง (เลขวันอาจไม่ได้อยู่กลางช่องพอดี) — ไม่เจอ → ครึ่งช่องวัน
    */
    let cache = null;

    function half() {

        const fallback = typeof pxPerDay === "number" && pxPerDay > 0 ? pxPerDay / 2 : 0;

        const now = performance.now();
        if (cache && now - cache.time < 60 && cache.ppd === pxPerDay) return cache.value;

        let value = fallback;

        try {
            const label = document.querySelector("#timelineHeaderInner .day-number-label[data-date]");
            const layerRect = objectLayer.getBoundingClientRect();
            const scale = objectLayer.offsetWidth ? layerRect.width / objectLayer.offsetWidth : 1;
            const match = label && /^(\d{4})-(\d{2})-(\d{2})$/.exec(label.dataset.date);

            if (match && layerRect.width && typeof dateToLeft === "function") {
                const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
                const rect = label.getBoundingClientRect();
                /* กลางช่องวัน = เส้นตารางขอบซ้าย (= ขอบซ้ายของเลขวัน) + ครึ่งช่อง */
                const measured = (rect.left - layerRect.left) / (scale || 1) - dateToLeft(date) + pxPerDay / 2;
                /* ค่าแปลก ๆ (เช่นหัวตารางยังไม่วาด) → ใช้ครึ่งช่องวัน */
                if (Number.isFinite(measured) && measured >= -pxPerDay && measured <= pxPerDay * 1.5) value = measured;
            }
        } catch (error) {
            value = fallback;
        }

        cache = { time: now, ppd: pxPerDay, value };
        return value;
    }

    function snap(value) {
        const ratio = window.devicePixelRatio || 1;
        return Math.round(value * ratio) / ratio;
    }

    function shift(element, amount) {
        const left = parseFloat(element.style.left);
        if (Number.isFinite(left)) element.style.left = `${snap(left + amount)}px`;
    }


    /* ปลายเส้นแนวนอนที่ผูกกับเส้นวันที่ (line.js) → กลางวัน */
    if (typeof datelineTipX === "function") {
        const originalTipX = datelineTipX;
        datelineTipX = function () {
            return originalTipX.apply(this, arguments) + half();
        };
    }


    /* หลัง app.js วาดเส้น → เลื่อนครึ่งช่องวัน (ก่อน dateline-stem.js วาดเส้นต่อในช่องล่าง) */
    const originalRender = renderObjects;

    renderObjects = function () {

        cache = null;

        const result = originalRender.apply(this, arguments);

        try {
            cache = null;
            const amount = half();

            if (amount || amount === 0) {
                objectLayer.querySelectorAll(".canvas-object--vline").forEach(node => shift(node, amount));
                /* เส้นประหนา 2px เริ่มที่ขอบซ้าย → ถอย 1px ให้กึ่งกลางเส้นตรงกลางเลขวัน */
                objectLayer.querySelectorAll(".canvas-object--dateline-line").forEach(node => shift(node, amount - 1));
                bracketContent.querySelectorAll(".canvas-object--dateline-chip").forEach(node => shift(node, amount));
            }
        } catch (error) {
            console.error("[line-center.js]", error);
        }

        return result;
    };

    window.ZGLineCenter = { offset: half };

})();
