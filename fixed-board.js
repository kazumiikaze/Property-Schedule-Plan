/* =========================================================
   fixed-board.js — จำหน้ากระดานให้เหมือนเดิมทุกเครื่อง

   คู่กับ index.html (กรอบขนาดคงที่):
   - แอปทำงานในหน้าต่างเสมือนขนาดเดียวเสมอ → ความสูงหมวด / ความกว้างช่องวัน / ตัวอักษร
     คำนวณเท่ากันทุกเครื่อง แล้วกรอบย่อ-ขยายทั้งก้อนให้พอดีจอ (ไม่มีการแปลงตำแหน่งตามจอ → ไม่เพี้ยน)
   - แผน / เทมเพลต จำโหมดมุมมองไว้ด้วย: ↕ เท่ากระดาษ · ↔ ทั้งแผน
     (เดิมจำแยกตามเครื่อง → เปิดอีกเครื่องที่ตั้งไม่เหมือนกัน ผังเปลี่ยน)
   - Ctrl+P ในโปรแกรม = พิมพ์ A3 อยู่แล้ว (print-fit.js) · กรอบด้านนอกส่งต่อให้เมื่อโฟกัสอยู่ที่ขอบ

   โหลดหลัง io.js · day-fold.js · fit-plan.js · tall-board.js
========================================================= */

(function () {

    "use strict";

    const io = window.ZGPlanIO;

    if (io && typeof io.build === "function" && typeof io.apply === "function") {

        const baseBuild = io.build;

        io.build = function () {
            const data = baseBuild.apply(this, arguments);
            if (data && typeof data === "object") {
                const view = {};
                if (window.ZGTallBoard && typeof window.ZGTallBoard.wanted === "function") view.tall = window.ZGTallBoard.wanted();
                if (window.ZG_FIT_PLAN && typeof window.ZG_FIT_PLAN.on === "boolean") view.fitPlan = window.ZG_FIT_PLAN.on;
                data.view = view;
            }
            return data;
        };

        const baseApply = io.apply;

        /* ตั้งโหมดตามแผนก่อน แล้วค่อยวางของ (ตำแหน่งในแผนแปลงจากขนาดตอนบันทึกครั้งเดียว) */
        io.apply = function (data) {
            const view = data && typeof data === "object" ? data.view : null;
            if (view && typeof view === "object") {
                try {
                    if (typeof view.fitPlan === "boolean" && window.ZG_FIT_PLAN && typeof window.ZG_FIT_PLAN.set === "function") {
                        window.ZG_FIT_PLAN.set(view.fitPlan);
                    }
                    if (typeof view.tall === "boolean" && window.ZGTallBoard && typeof window.ZGTallBoard.set === "function") {
                        window.ZGTallBoard.set(view.tall);
                    }
                } catch (error) {
                    console.error("[fixed-board.js] view", error);
                }
            }
            return baseApply.apply(this, arguments);
        };
    }

})();
