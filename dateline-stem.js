"use strict";

/* =========================================================
   DATELINE-STEM.JS — เส้นวันที่ลากต่อลงไปถึงกล่องข้อความ
   - เส้นประในตารางเดิมจบที่ขอบล่างตาราง แล้วเว้นช่องว่างก่อนถึงกล่อง
   - ไฟล์นี้วาดเส้นประสีเดียวกันในช่อง bracket จากขอบบนลงไปถึงยอดสามเหลี่ยม
     ของกล่อง → เส้นคาดต่อเนื่อง เว้นไว้แค่ตรง scrollbar
   - เส้นแนวตั้ง (สีดำ) ก็ลากยาวลงไปในช่องเส้นวันที่ด้วย
   - เส้นวันที่ / เส้นแนวตั้ง ลอดใต้กล่องงาน (ไม่คาดทับตัวหนังสือในกล่อง)
   - ไม่แก้ app.js / style.css
========================================================= */

(function () {

    if (typeof renderObjects !== "function" || typeof bracketContent === "undefined") {
        console.warn("[dateline-stem.js] ไม่พบ renderObjects / bracketContent");
        return;
    }

    /* ความสูงสามเหลี่ยมบนกล่อง (.dateline-chip-caret top: -8px) */
    const CARET = 8;

    const style = document.createElement("style");

    style.textContent = `
.zg-dateline-stem {
    position: absolute;
    top: 0;
    width: 0;
    border-left: 2px dashed #d0342c;
    pointer-events: none;
    z-index: 4;
}
.zg-vline-stem {
    position: absolute;
    top: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 4;
}

/* เส้นวันที่ / เส้นแนวตั้ง อยู่ใต้กล่องงาน → ไม่คาดทับกล่องให้รก */
#objectLayer .canvas-object--dateline-line,
#objectLayer .canvas-object--vline { z-index: 1 !important; }
#objectLayer .canvas-object--task { z-index: 2; }
#objectLayer .canvas-object--task.zg-obj-selected,
#objectLayer .canvas-object--task:hover { z-index: 3; }
`;

    document.head.appendChild(style);


    /* เส้นแนวตั้ง: ลากต่อลงไปทั้งช่องเส้นวันที่ */
    function drawVlineStems() {

        bracketContent.querySelectorAll(".zg-vline-stem").forEach(node => node.remove());

        const contentRect = bracketContent.getBoundingClientRect();
        const scale = bracketContent.offsetWidth ? contentRect.width / bracketContent.offsetWidth : 1;

        document.querySelectorAll("#objectLayer .canvas-object--vline[data-object-id]").forEach(line => {

            const cs = getComputedStyle(line);
            const offset = parseFloat(cs.getPropertyValue("--vline-offset")) || 4;
            const thickness = parseFloat(cs.getPropertyValue("--vline-thickness")) || 1;
            const color = cs.getPropertyValue("--vline-color").trim() || "#000000";

            const stem = document.createElement("div");
            stem.className = "zg-vline-stem";
            stem.style.left = `${(line.getBoundingClientRect().left - contentRect.left) / (scale || 1) + offset}px`;
            stem.style.width = `${thickness}px`;
            stem.style.background = color;
            stem.dataset.stemFor = line.dataset.objectId;

            bracketContent.insertBefore(stem, bracketContent.firstChild);
        });
    }

    function drawStems() {

        drawVlineStems();

        bracketContent.querySelectorAll(".zg-dateline-stem").forEach(node => node.remove());

        bracketContent.querySelectorAll(".canvas-object--dateline-chip").forEach(chip => {

            const height = chip.offsetTop - CARET;

            if (height <= 0) return;

            const stem = document.createElement("div");

            stem.className = "zg-dateline-stem";
            /* ให้ตรงกับเส้นประในตารางพอดี (ถ้าหาเจอ) ไม่งั้นใช้กึ่งกลางกล่อง */
            const id = chip.dataset.objectId;
            const line = id && document.querySelector(`.canvas-object--dateline-line[data-object-id="${CSS.escape(id)}"]`);

            let left = chip.offsetLeft + chip.offsetWidth / 2 - 1;

            if (line) {
                const scale = bracketContent.offsetWidth ? bracketContent.getBoundingClientRect().width / bracketContent.offsetWidth : 1;
                left = (line.getBoundingClientRect().left - bracketContent.getBoundingClientRect().left) / (scale || 1);
            }

            stem.style.left = `${left}px`;
            stem.style.height = `${height}px`;

            if (chip.style.borderColor) stem.style.borderLeftColor = chip.style.borderColor;

            if (chip.dataset.objectId) stem.dataset.stemFor = chip.dataset.objectId;

            bracketContent.insertBefore(stem, bracketContent.firstChild);
        });
    }

    const originalRender = renderObjects;

    renderObjects = function () {

        const result = originalRender.apply(this, arguments);

        try {
            drawStems();
        } catch (error) {
            console.error("[dateline-stem.js]", error);
        }

        return result;
    };

    window.addEventListener("resize", () => requestAnimationFrame(drawStems));

    drawStems();

})();
