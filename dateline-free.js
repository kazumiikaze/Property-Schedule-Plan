"use strict";

/* =========================================================
   DATELINE-FREE.JS — เก็บตำแหน่ง "ระหว่างวัน" ของเส้นวันที่ / เส้นแนวตั้ง
   - app.js v2: ลากเส้นวันที่ได้อิสระ (ไม่ดูดติดวัน) → linkedHeaderDate มีเวลาในวัน
   - ไฟล์แผน (.json) เก็บวันที่เป็น YYYY-MM-DD (io.js) → เวลาหาย
     ไฟล์นี้เพิ่ม linkedHeaderFrac (0–1 = เศษของวัน) ไว้คู่กัน
     ทั้งตอนบันทึกแผน / เทมเพลต / Export / ย้อนกลับ (Ctrl+Z)
   - ไฟล์แผนเก่าที่ไม่มี linkedHeaderFrac = ตรงวันพอดีเหมือนเดิม
   - โหลดหลัง io.js และไฟล์อื่นที่ครอบ ZGPlanIO (ก่อน lang.js)
========================================================= */

(function () {

    const io = window.ZGPlanIO;

    if (!io || typeof io.build !== "function" || typeof io.apply !== "function") {
        console.warn("[dateline-free.js] ไม่พบ ZGPlanIO");
        return;
    }

    const DAY_MS = 86400000;

    function fractionOf(date) {

        if (!(date instanceof Date) || isNaN(date)) return 0;

        const midnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());

        return Math.max(0, Math.min(0.999, (date - midnight) / DAY_MS));
    }

    const originalBuild = io.build;

    io.build = function () {

        const data = originalBuild.apply(this, arguments);

        if (data && Array.isArray(data.objects) && typeof timelineObjects !== "undefined") {

            const byId = new Map(timelineObjects.map(object => [object.id, object]));

            data.objects.forEach(item => {

                const live = item && byId.get(item.id);
                const fraction = live ? fractionOf(live.linkedHeaderDate) : 0;

                if (fraction > 0.0001) {
                    item.linkedHeaderFrac = Math.round(fraction * 10000) / 10000;
                } else if (item) {
                    delete item.linkedHeaderFrac;
                }
            });
        }

        return data;
    };

    const originalApply = io.apply;

    io.apply = function (data) {

        const result = originalApply.apply(this, arguments);

        try {

            const fractions = new Map(
                (data && Array.isArray(data.objects) ? data.objects : [])
                    .filter(item => item && item.id && Number(item.linkedHeaderFrac) > 0)
                    .map(item => [item.id, Number(item.linkedHeaderFrac)])
            );

            if (fractions.size && typeof timelineObjects !== "undefined") {

                timelineObjects.forEach(object => {

                    const fraction = fractions.get(object.id);

                    if (fraction && object.linkedHeaderDate instanceof Date) {
                        const date = object.linkedHeaderDate;
                        const midnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                        object.linkedHeaderDate = new Date(midnight.getTime() + Math.round(fraction * DAY_MS));
                    }
                });

                if (typeof renderObjects === "function") renderObjects();
            }

        } catch (error) {
            console.error("[dateline-free.js]", error);
        }

        return result;
    };

})();
