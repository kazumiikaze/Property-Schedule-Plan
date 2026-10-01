"use strict";

/* =========================================================
   ZOOM-SYNC.JS — ให้ object งาน (task) / เส้นแนวนอน (hline)
   และกล่อง text ที่ติดแม่เหล็ก ยึดตำแหน่งตาม "วันที่" บนตาราง

   ปัญหาเดิม: task / hline เก็บตำแหน่งเป็น px (x, width)
   พอซูม / ย่อขยายหน้าต่าง / เปลี่ยนวันเริ่มต้น ค่า px ต่อวันเปลี่ยน
   object เลยไม่ขยับตามวันที่

   วิธีแก้ (ไม่แก้โค้ดใน app.js):
   ครอบฟังก์ชัน calculateTimelineGeometry() ของ app.js
   หลังคำนวณ pxPerDay ใหม่เสร็จ → แปลง x / width ของ object
   ให้อยู่วันเดิม ก่อนที่ renderObjects() จะวาด

   โหลดหลัง app.js และ text.js
========================================================= */

(function () {

    if (typeof calculateTimelineGeometry !== "function") {

        return;
    }


    /* object ที่ใช้ตำแหน่งแบบ px และต้องยึดตามวันที่ */
    const SCALE_TYPES = ["task", "hline"];


    let lastPxPerDay = null;

    let lastStartDate = null;


    function rememberCurrent() {

        lastPxPerDay = pxPerDay;

        lastStartDate = new Date(timelineStartDate);
    }


    function syncObjectsToTimeline() {

        if (
            lastPxPerDay === null ||
            !lastStartDate ||
            !(lastPxPerDay > 0) ||
            !(pxPerDay > 0)
        ) {

            rememberCurrent();

            return;
        }


        const ratio =
            pxPerDay / lastPxPerDay;

        /* วันเริ่มต้นถูกเลื่อนไปกี่วัน (+ = เลื่อนไปก่อนหน้า) */
        const startShiftDays =
            daysBetween(timelineStartDate, lastStartDate);


        if (ratio === 1 && startShiftDays === 0) {

            return;
        }


        timelineObjects.forEach(object => {

            if (!SCALE_TYPES.includes(object.type)) {
                return;
            }

            /* ตำแหน่งเป็น "จำนวนวัน" นับจากวันเริ่มต้นเดิม */
            const dayPosition =
                object.x / lastPxPerDay;

            object.x =
                (dayPosition + startShiftDays) * pxPerDay;

            object.width =
                object.width * ratio;
        });


        /* กล่อง text ที่ติดแม่เหล็กกับ task / hline: ระยะแนวนอนต้องยืดหดตามด้วย */
        if (
            ratio !== 1 &&
            window.ZGTextBoxes &&
            typeof window.ZGTextBoxes.scaleAttachedX === "function"
        ) {

            window.ZGTextBoxes.scaleAttachedX(ratio);
        }


        rememberCurrent();
    }


    const originalCalculateTimelineGeometry =
        calculateTimelineGeometry;

    calculateTimelineGeometry = function () {

        originalCalculateTimelineGeometry();

        syncObjectsToTimeline();
    };


    /* =====================================================
       PUBLIC API (ใช้โดย io.js ตอน Import)
    ===================================================== */

    window.ZGZoomSync = {

        /*
            บอกว่า x / width ของ object ที่จะ render ต่อไป
            ถูกบันทึกไว้ที่ pxPerDay / วันเริ่มต้นเท่าไร
            (render ครั้งถัดไปจะแปลงให้ตรงกับหน้าจอนี้เอง)
        */
        setBaseline(savedPxPerDay, savedStartDate) {

            if (
                savedPxPerDay > 0 &&
                savedStartDate instanceof Date &&
                !isNaN(savedStartDate)
            ) {

                lastPxPerDay = savedPxPerDay;

                lastStartDate = new Date(savedStartDate);

            } else {

                lastPxPerDay = null;

                lastStartDate = null;
            }
        }
    };

})();