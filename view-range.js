"use strict";

/* =========================================================
   VIEW-RANGE.JS — ปุ่มสลับช่วงที่เห็น "6 เดือน / 3 เดือน"
   - 6 เดือน = ภาพรวม (ซูม 100%) · 3 เดือน = ช่องวันกว้าง 2 เท่า (ซูม 200%)
   - สลับแล้วยังดูวันเดิมอยู่กลางจอ
   - ปุ่ม − / ＋ ยังปรับละเอียดได้เหมือนเดิม (ไม่ตรง 6 หรือ 3 → ไม่มีปุ่มไหนติด)
   - หัวตารางโหมดวันจันทร์: เลขวันจันทร์ที่ชนกับวันที่ไฮไลต์ (สีแดง) → หลบให้วันไฮไลต์

   ไม่แก้ app.js — โหลดหลัง app.js, zoom-sync.js (ก่อน lang.js)
========================================================= */

(function () {

    if (typeof setZoomScale !== "function" || typeof zoomScale === "undefined") {
        console.warn("[view-range.js] ต้องโหลดหลัง app.js");
        return;
    }

    const RANGES = [
        { months: 6, zoom: 1 },
        { months: 3, zoom: 2 }
    ];

    function lang() {
        try {
            return (window.ZGLang && window.ZGLang.get && window.ZGLang.get()) || "th";
        } catch (error) {
            return "th";
        }
    }

    function label(months) {
        const current = lang();
        return current === "en" ? `${months} mo` : current === "ja" ? `${months}か月` : `${months} เดือน`;
    }


    /* =====================================================
       STYLE
    ===================================================== */

    const style = document.createElement("style");

    style.textContent = `
.zg-range {
    display: inline-flex;
    align-items: center;
    height: 26px;
    padding: 2px;
    margin-left: 2px;
    border: 1px solid #dde3e0;
    border-radius: 8px;
    background: #ffffff;
}
.zg-range button {
    height: 20px;
    padding: 0 8px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: #4f5853;
    font-family: inherit;
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
    cursor: pointer;
    transition: background-color .15s ease, color .15s ease;
}
.zg-range button:hover { background: #f0f4f2; color: #1e2924; }
.zg-range button[aria-pressed="true"] { background: #3a8a4f; color: #ffffff; }
.zg-range button:focus-visible { outline: 2px solid #3a8a4f; outline-offset: 1px; }
html.zg-screen-xl .zg-range { height: 30px; }
html.zg-screen-xl .zg-range button { height: 24px; font-size: 12px; }
body.zg-dark .zg-range { background: #2b3330; border-color: #3a4440; }
body.zg-dark .zg-range button { color: #c9d2cd; }
body.zg-dark .zg-range button:hover { background: #343d39; color: #ffffff; }
body.zg-dark .zg-range button[aria-pressed="true"] { background: #2f7a45; color: #ffffff; }
`;

    document.head.appendChild(style);


    /* =====================================================
       ปุ่มสลับ (อยู่ในกลุ่มมุมมอง ข้างธีม / ภาษา — แถวล่างของ toolbar ยังมีที่ว่าง
       ไม่ทำให้ toolbar ขึ้นแถวเพิ่ม)
    ===================================================== */

    const group = document.querySelector(".toolbar-group--view") || document.querySelector(".toolbar-group--zoom");
    const zoomTextEl = document.getElementById("zoomText");

    if (!group) return;

    const box = document.createElement("div");
    box.className = "zg-range";
    box.setAttribute("role", "group");
    box.setAttribute("aria-label", "ช่วงที่เห็นบนจอ");

    box.innerHTML = RANGES.map(range =>
        `<button type="button" data-months="${range.months}" aria-pressed="false"></button>`).join("");

    group.appendChild(box);

    function paint() {

        box.querySelectorAll("button").forEach(button => {

            const range = RANGES.find(item => String(item.months) === button.dataset.months);

            button.textContent = label(range.months);

            button.title = range.months === 6
                ? "ภาพรวม: เห็น 6 เดือนเต็มจอ"
                : "ดูละเอียด: เห็น 3 เดือน ช่องวันกว้างขึ้น 2 เท่า";

            button.setAttribute("aria-pressed", Math.abs(zoomScale - range.zoom) < 0.05 ? "true" : "false");
        });
    }

    /* สลับช่วง โดยให้วันที่อยู่กลางจอ ยังอยู่กลางจอ */
    function setRange(months) {

        const range = RANGES.find(item => item.months === months);

        if (!range || Math.abs(zoomScale - range.zoom) < 0.001) {
            paint();
            return;
        }

        const viewport = timelineViewport;
        const centerDay = (viewport.scrollLeft + viewport.clientWidth / 2) / pxPerDay;

        setZoomScale(range.zoom);

        viewport.scrollLeft = Math.max(0, centerDay * pxPerDay - viewport.clientWidth / 2);
        viewport.dispatchEvent(new Event("scroll"));

        if (typeof updateAllHorizontalRanges === "function") updateAllHorizontalRanges();

        if (window.ZGHistory && typeof window.ZGHistory.record === "function") window.ZGHistory.record();

        paint();
    }

    box.addEventListener("click", event => {
        const button = event.target instanceof Element ? event.target.closest("button[data-months]") : null;
        if (button) setRange(Number(button.dataset.months));
    });

    /* ซูมเปลี่ยนจากทางอื่น (− / ＋, เปิดแผน, ย้อนกลับ) → อัปเดตปุ่มที่ติด */
    if (zoomTextEl) {
        new MutationObserver(paint).observe(zoomTextEl, { childList: true, characterData: true, subtree: true });
    }

    /* เปลี่ยนภาษา */
    document.addEventListener("click", event => {
        if (event.target instanceof Element && event.target.closest("#langToggleBtn, [data-lang]")) {
            setTimeout(paint, 60);
        }
    });

    paint();


    /* =====================================================
       เลขวันจันทร์ที่ชิดวันไฮไลต์ (±1 วัน) → ซ่อนให้วันไฮไลต์อ่านได้
    ===================================================== */

    const header = document.getElementById("timelineHeaderInner");

    const HIGHLIGHT = ".day-number-label--highlight, .day-number-label--highlight-vline";

    function textRect(range, element) {
        range.selectNodeContents(element);
        return range.getBoundingClientRect();
    }

    /*
        1) วันไฮไลต์ที่ชนกันเอง (เช่น 16 กับ 17) → ขยับออกจากกันคนละครึ่ง
        2) เลขวันจันทร์ที่ทับวันไฮไลต์ (หลังขยับแล้ว) → ซ่อน ให้วันไฮไลต์อ่านได้
    */
    function yieldToHighlights() {

        if (!header) return;

        header.querySelectorAll(".zg-day-yield").forEach(element => element.classList.remove("zg-day-yield"));

        header.querySelectorAll("[data-zg-nudge]").forEach(element => {
            element.style.transform = "";
            delete element.dataset.zgNudge;
        });

        const root = document.documentElement.classList;

        if (!root.contains("zg-days-sparse") && !root.contains("zg-days-minimal")) return;

        const range = document.createRange();
        const GAP = 2;

        const highlights = Array.from(header.querySelectorAll(HIGHLIGHT))
            .filter(element => element.firstChild)
            .map(element => {
                const rect = textRect(range, element);
                return { element, left: rect.left, right: rect.right, shift: 0 };
            })
            .sort((a, b) => a.left - b.left);

        /* ขยับซ้ำจนไม่มีคู่ไหนชนกัน (กลุ่มที่ติดกันหลายวัน) */
        for (let pass = 0; pass < 6; pass += 1) {

            let moved = false;

            for (let i = 1; i < highlights.length; i += 1) {

                const prev = highlights[i - 1];
                const item = highlights[i];
                const overlap = (prev.right + prev.shift + GAP) - (item.left + item.shift);

                if (overlap > 0.1) {
                    prev.shift -= overlap / 2;
                    item.shift += overlap / 2;
                    moved = true;
                }
            }

            if (!moved) break;
        }

        highlights.forEach(item => {
            if (Math.abs(item.shift) > 0.1) {
                item.element.style.transform = `translateX(${item.shift.toFixed(1)}px)`;
                item.element.dataset.zgNudge = "1";
            }
        });

        const taken = highlights.map(item => [item.left + item.shift - GAP, item.right + item.shift + GAP]);

        if (!taken.length) return;

        header.querySelectorAll(".day-number-label").forEach(element => {

            if (element.matches(HIGHLIGHT) || !element.firstChild || getComputedStyle(element).visibility === "hidden") return;

            const rect = textRect(range, element);

            if (taken.some(([left, right]) => rect.right > left && rect.left < right)) {
                element.classList.add("zg-day-yield");
            }
        });
    }

    const originalRenderObjects = renderObjects;

    renderObjects = function () {

        const result = originalRenderObjects.apply(this, arguments);

        try {
            yieldToHighlights();
        } catch (error) {
            console.error("[view-range.js]", error);
        }

        return result;
    };

    /* ความหนาแน่นเลขวันเปลี่ยน (responsive.js ตั้ง class ที่ <html>) → คำนวณใหม่ */
    new MutationObserver(yieldToHighlights).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    window.ZGViewRange = { set: setRange };

})();
