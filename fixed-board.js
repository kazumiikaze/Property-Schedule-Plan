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
                /* ขนาดกระดานตอนบันทึก → แผนที่มีค่านี้ = จัดในกรอบขนาดคงที่แล้ว ไม่ต้องแปลงอีก */
                if (data.layout && typeof data.layout === "object" && window.top !== window) {
                    data.layout.board = { w: window.innerWidth, h: window.innerHeight };
                }
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
            const result = baseApply.apply(this, arguments);
            try {
                convertLegacyTexts(data);
            } catch (error) {
                console.error("[fixed-board.js] legacy texts", error);
            }
            return result;
        };
    }


    /* =====================================================
       แผนเก่า (บันทึกก่อนมีกรอบขนาดคงที่ บนจอขนาดอื่น)
       กล่องงาน / เส้น แปลงตามสัดส่วนอยู่แล้ว (io.js / zoom-sync.js)
       แต่กล่องข้อความแบบวางอิสระเก็บเป็นพิกัดจอ → แปลงครั้งเดียวตามส่วนของหน้า:
         แนวนอน  = ตามความกว้างช่องวัน
         แนวตั้ง  = หัวกระดานคงเดิม · ตาราง ย่อ/ขยายตามความสูงตาราง
                   · ช่องเส้นวันที่ ตามความสูงช่องนั้น · ส่วนล่าง เลื่อนตาม
       ทำก่อน io.js วางกล่อง (requestAnimationFrame) → กล่องที่ติดแม่เหล็กยังทำงานเหมือนเดิม
       หลังบันทึก แผนมี layout.board → ไม่แปลงซ้ำ · แผน/เทมเพลตที่จัดในกรอบแล้ว ไม่ถูกแตะ
    ===================================================== */

    function rectOf(selector) {
        const el = document.querySelector(selector);
        return el ? el.getBoundingClientRect() : null;
    }

    function convertLegacyTexts(data) {

        if (window.top === window || !data || typeof data !== "object") return;
        const layout = data.layout;
        if (!layout || typeof layout !== "object" || layout.board) return;
        if (!Array.isArray(data.texts) || !data.texts.some(t => t && !t.attach)) return;

        const savedPpd = Number(data.timeline && data.timeline.pxPerDay);
        const savedUnit = Number(layout.categoryHeight);
        const savedBracket = Number(layout.bracketHeight);
        if (!(savedPpd > 0) || !(savedUnit > 0) || !(pxPerDay > 0) || !(categoryHeight > 0)) return;

        const sx = pxPerDay / savedPpd;
        const sched = rectOf("#scheduleArea");
        const bracket = rectOf(".bracket-area");
        if (!sched || !bracket) return;

        const schedTop = sched.top;
        const schedNew = sched.height;
        const schedOld = schedNew * savedUnit / categoryHeight;
        const sy = schedNew / schedOld;
        const brTopOld = schedTop + schedOld;
        const brOld = savedBracket > 0 ? savedBracket : bracket.height;
        const by = bracket.height / brOld;

        /* ต่างกันน้อยมาก = จอเดียวกัน → ไม่แตะ */
        if (Math.abs(sx - 1) < 0.02 && Math.abs(sy - 1) < 0.02 && Math.abs(by - 1) < 0.02) return;

        const mapY = y => {
            if (y < schedTop) return y;
            if (y < brTopOld) return schedTop + (y - schedTop) * sy;
            if (y < brTopOld + brOld) return bracket.top + (y - brTopOld) * by;
            return bracket.top + bracket.height + (y - brTopOld - brOld);
        };

        let changed = 0;
        data.texts.forEach(text => {
            if (!text || text.attach || !Number.isFinite(text.x) || !Number.isFinite(text.y)) return;
            text.x = Math.round(text.x * sx * 10) / 10;
            text.y = Math.round(mapY(text.y) * 10) / 10;
            if (Number.isFinite(text.w)) text.w = Math.max(40, Math.round(text.w * sx));
            changed += 1;
        });

        if (changed) {
            noticeLegacy(changed);
            /* เก็บผลที่แปลงแล้ว (พร้อม layout.board) ทันที → เปิดครั้งหน้าไม่ต้องแปลงอีก */
            setTimeout(() => {
                if (window.ZGPlans && typeof window.ZGPlans.saveNow === "function") window.ZGPlans.saveNow();
            }, 1500);
        }
    }

    function noticeLegacy(count) {
        if (!document.getElementById("zgLegacyNoteStyle")) {
            const style = document.createElement("style");
            style.id = "zgLegacyNoteStyle";
            style.textContent = `
.zg-legacy-note { position: fixed; z-index: 29000; left: 50%; top: 10px; transform: translateX(-50%); max-width: min(900px, calc(100vw - 24px));
    display: flex; gap: 12px; align-items: center; padding: 9px 10px 9px 14px; border-radius: 10px; background: #eef7f1; border: 1px solid #9fcfb0;
    box-shadow: 0 8px 22px -10px rgba(20, 70, 40, .35); font: 13px/1.4 "Segoe UI", Tahoma, sans-serif; color: #1f4d33; }
.zg-legacy-note button { font: inherit; border: 1px solid #9fcfb0; background: #fff; border-radius: 7px; padding: 3px 10px; cursor: pointer; color: #1f4d33; white-space: nowrap; }
body.zg-print-capture .zg-legacy-note, body.zg-exporting .zg-legacy-note { display: none !important; }
@media print { .zg-legacy-note { display: none !important; } }`;
            document.head.appendChild(style);
        }
        document.querySelectorAll(".zg-legacy-note").forEach(el => el.remove());
        const bar = document.createElement("div");
        bar.className = "zg-legacy-note";
        bar.setAttribute("role", "status");
        bar.innerHTML = `<span>แผนนี้บันทึกจากจอขนาดอื่นก่อนอัปเดต — ระบบปรับตำแหน่งกล่องข้อความ ${count} กล่องให้แล้ว ตรวจดู / จัดเพิ่มได้ ระบบจะจำไว้ทุกเครื่อง</span><button type="button">รับทราบ</button>`;
        bar.querySelector("button").addEventListener("click", () => bar.remove());
        document.body.appendChild(bar);
        setTimeout(() => bar.remove(), 20000);
    }

})();
