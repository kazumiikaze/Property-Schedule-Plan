"use strict";

/* =========================================================
   TASK-TEXT-FIT.JS — ข้อความไม่ล้นกล่องงาน
   1) ข้อความของกล่องงานเอง (พิมพ์ในกล่อง)
      → ล้นกล่อง: ย่อตัวอักษรลงทีละขั้น (ไม่ต่ำกว่า 60%)
      → ยังล้น: ตัดบรรทัดท้ายเป็น "…" + ชี้เมาส์ดูข้อความเต็ม
      → กำลังพิมพ์ (โฟกัส) แสดงเต็มขนาดเสมอ
   2) กล่อง Text ที่ติดแม่เหล็กกับกล่องงาน และวางกลางกล่องงาน
      → กว้างกว่ากล่องงานนิดหน่อย: ย่อลงให้พอดี (ไม่ต่ำกว่า 75%)
      → ชี้เมาส์ / เลือก / พิมพ์ → แสดงเต็มขนาด
      → กว้างกว่ามาก (งาน 1–3 วัน) ปล่อยตามที่ออกแบบไว้ — ดูละเอียดกด "3 เดือน"
   - ย่อแค่ตอนแสดงผล ไม่แก้ข้อมูลในแผน (บันทึก / Export / เทมเพลต ได้ข้อมูลเดิม)
   - ไม่แก้ app.js / text.js — โหลดหลัง text.js, text-size.js
========================================================= */

(function () {

    if (typeof renderObjects !== "function") {
        console.warn("[task-text-fit.js] ต้องโหลดหลัง app.js");
        return;
    }

    const LABEL_STEPS = [0.9, 0.8, 0.7, 0.6];

    const BOX_MIN_SCALE = 0.75;

    const style = document.createElement("style");

    style.textContent = `
.canvas-object-label.zg-fit-clamp {
    display: -webkit-box !important;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
.canvas-object-label:focus {
    zoom: 1 !important;
    display: block !important;
    -webkit-line-clamp: unset !important;
}
.zg-text-box.zg-fit-scaled { transform-origin: 50% 0; transition: transform .12s ease; }
.zg-text-box.zg-fit-scaled:hover,
.zg-text-box.zg-fit-scaled.is-selected,
.zg-text-box.zg-fit-scaled:focus-within { transform: none !important; z-index: 2; }
`;

    document.head.appendChild(style);


    /* ---------- 1) ข้อความในกล่องงาน ---------- */

    function rectFits(label, wrap) {
        const l = label.getBoundingClientRect();
        const w = wrap.getBoundingClientRect();
        return l.height <= w.height + 1 && l.width <= w.width + 1 && label.scrollWidth <= label.clientWidth + 1;
    }

    function resetLabel(label) {
        if (!label.dataset.zgFit) return;
        label.style.zoom = "";
        label.style.webkitLineClamp = "";
        label.classList.remove("zg-fit-clamp");
        if (label.dataset.zgFitTitle) label.removeAttribute("title");
        delete label.dataset.zgFit;
        delete label.dataset.zgFitTitle;
    }

    function fitLabel(label) {

        resetLabel(label);

        if (document.activeElement === label) return;

        const text = (label.textContent || "").trim();
        const wrap = label.parentElement;

        if (!text || !wrap || label.matches(".zg-rot-90, .zg-rot-270")) return;

        if (rectFits(label, wrap)) return;

        label.dataset.zgFit = "1";

        for (const step of LABEL_STEPS) {
            label.style.zoom = String(step);
            if (rectFits(label, wrap)) return;
        }

        /* เล็กสุดแล้วยังล้น → ตัดบรรทัดท้าย + ชี้ดูข้อความเต็ม */
        const lineHeight = parseFloat(getComputedStyle(label).lineHeight) ||
            (parseFloat(getComputedStyle(label).fontSize) || 11) * 1.25;

        const lines = Math.max(1, Math.floor(wrap.getBoundingClientRect().height / (lineHeight * LABEL_STEPS[LABEL_STEPS.length - 1])));

        label.classList.add("zg-fit-clamp");
        label.style.webkitLineClamp = String(lines);

        if (!label.hasAttribute("title")) {
            label.title = text;
            label.dataset.zgFitTitle = "1";
        }
    }


    /* ---------- 2) กล่อง Text ที่ติดกับกล่องงาน ---------- */

    function fitAttachedBoxes() {

        if (!window.ZGTextBoxes || typeof window.ZGTextBoxes.serialize !== "function") return;

        const objectLayer = document.getElementById("objectLayer");

        if (!objectLayer) return;

        const tasks = new Set(
            (typeof timelineObjects !== "undefined" ? timelineObjects : [])
                .filter(object => object && object.type === "task")
                .map(object => object.id)
        );

        window.ZGTextBoxes.serialize().forEach(data => {

            const el = document.querySelector(`.zg-text-box[data-text-id="${CSS.escape(String(data.id))}"]`);

            if (!el) return;

            /* วัดขนาดจริงก่อนย่อ */
            el.style.transform = "";

            let scale = 1;

            const objectId = data.attach && data.attach.objectId;

            const taskEl = objectId && tasks.has(objectId)
                ? objectLayer.querySelector(`[data-object-id="${CSS.escape(objectId)}"]`)
                : null;

            if (taskEl && !el.classList.contains("is-selected") && !el.matches(":focus-within")) {

                const box = el.getBoundingClientRect();
                const task = taskEl.getBoundingClientRect();

                const center = box.left + box.width / 2;

                /* วางกลางกล่องงาน และกว้างกว่ากล่องงานไม่มาก */
                if (box.width > 0 && task.width > 0 &&
                    center >= task.left && center <= task.right &&
                    box.width > task.width + 2) {

                    const need = (task.width + 2) / box.width;

                    if (need >= BOX_MIN_SCALE) scale = need;
                }
            }

            if (scale < 0.995) {
                el.classList.add("zg-fit-scaled");
                el.style.transform = `scale(${scale.toFixed(3)})`;
            } else {
                el.classList.remove("zg-fit-scaled");
            }
        });
    }


    /* ---------- เมื่อไรต้องคำนวณใหม่ ---------- */

    let frame = 0;

    function fitAll() {

        cancelAnimationFrame(frame);

        frame = requestAnimationFrame(() => {

            try {
                document.querySelectorAll("#objectLayer .canvas-object--task .canvas-object-label").forEach(fitLabel);
                fitAttachedBoxes();
            } catch (error) {
                console.error("[task-text-fit.js]", error);
            }
        });
    }

    const originalRenderObjects = renderObjects;

    renderObjects = function () {
        const result = originalRenderObjects.apply(this, arguments);
        fitAll();
        return result;
    };

    /* พิมพ์ในกล่องงานเสร็จ / แก้กล่อง Text / ปรับขนาดกล่อง */
    document.addEventListener("focusout", event => {
        if (event.target instanceof Element && event.target.closest(".canvas-object--task, .zg-text-box")) fitAll();
    });

    document.addEventListener("mouseup", () => setTimeout(fitAll, 30));

    window.addEventListener("resize", fitAll);

    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitAll);

    window.ZGTaskTextFit = { refresh: fitAll };

})();
