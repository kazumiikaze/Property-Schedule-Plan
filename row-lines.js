"use strict";

/* =========================================================
   ROW-LINES.JS — เส้นคั่นแนวนอนระหว่างแถว (ในหมวดเดียวกัน) ให้บางและจางลง
   - เส้นปิดท้ายหมวด (Category) คงไว้เท่าเดิม เพื่อให้ยังเห็นการแบ่งหมวดชัด
   - ใช้ทั้งในตาราง (ช่องเวลา) และช่องชื่อแถวด้านซ้าย
   - ไม่แก้ app.js / style.css — โหลดหลัง app.js
========================================================= */

(function () {

    if (typeof createGridLine !== "function" || typeof scheduleGrid === "undefined") {
        console.warn("[row-lines.js] ไม่พบ createGridLine / scheduleGrid");
        return;
    }

    const style = document.createElement("style");

    style.textContent = `
:root { --zg-row-line-color: #c3cac7; }
body.zg-dark { --zg-row-line-color: #3b4542; }
.dynamic-h-line.zg-row-line {
    border-top-width: .5px !important;
    border-top-color: var(--zg-row-line-color) !important;
}
.party-row.zg-row-line {
    border-bottom-width: .5px !important;
    border-bottom-color: var(--zg-row-line-color) !important;
}
`;

    document.head.appendChild(style);


    /* เส้นในตาราง: เส้นที่ไม่ตรงขอบหมวด = เส้นระหว่างแถว */
    const originalCreateGridLine = createGridLine;

    createGridLine = function (top) {

        const result = originalCreateGridLine.apply(this, arguments);

        const line = scheduleGrid.lastElementChild;

        if (line && line.classList.contains("dynamic-h-line") && categoryHeight > 0) {

            const ratio = Number(top) / categoryHeight;

            if (Math.abs(ratio - Math.round(ratio)) > 0.001) {
                line.classList.add("zg-row-line");
            }
        }

        return result;
    };


    /* ช่องชื่อแถวด้านซ้าย: ทุกแถวยกเว้นแถวสุดท้ายของแต่ละหมวด */
    const sidebar = typeof partySidebar !== "undefined" ? partySidebar : document.querySelector(".party-sidebar");

    function markSidebar() {

        if (!sidebar || typeof categories === "undefined" || !Array.isArray(categories)) return;

        const rows = Array.from(sidebar.querySelectorAll(":scope > .party-row"));

        const lastIndexes = new Set();
        let count = 0;

        categories.forEach(category => {
            count += Math.max(1, (category.rows || []).length);
            lastIndexes.add(count - 1);
        });

        rows.forEach((row, index) => {
            row.classList.toggle("zg-row-line", !lastIndexes.has(index));
        });
    }

    if (sidebar) {
        new MutationObserver(markSidebar).observe(sidebar, { childList: true });
    }

    /* วาดตารางใหม่ให้เส้นที่มีอยู่แล้วได้ class */
    if (typeof renderSchedule === "function") {
        try { renderSchedule(); } catch (error) { /* ไม่เป็นไร */ }
    }

    markSidebar();

})();
