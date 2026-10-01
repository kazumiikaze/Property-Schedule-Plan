"use strict";

/* =========================================================
   TABLE-FIT.JS — ขอบขวาสุดของตาราง ยืด/หด ตามจำนวนเดือนจริง

   เดิม: กรอบตาราง / หัวเดือน / ช่องเส้นวันที่ ยาวเต็มจอเสมอ
         ถ้าช่วงวันที่สั้นกว่าจอ จะเหลือพื้นที่ว่างต่อท้ายเดือนสุดท้าย
   ใหม่: ตารางจบที่ "วันสิ้นสุด" พอดี มีเส้นปิดท้าย
         เพิ่ม/ลดเดือน หรือซูม → เส้นท้ายตารางขยับตามเอง
         ถ้าช่วงยาวกว่าจอ (ต้องเลื่อน) → เลื่อนไปสุดขวาแล้วเส้นปิดท้ายพอดีขอบ

   วิธีทำ (ไม่แก้ app.js / style.css):
   วาง "แผ่นปิด" สีเดียวกับพื้นกระดาน ทับส่วนที่เกินวันสิ้นสุด
   ของ หัวเดือน / ตารางหลัก / ช่องเส้นวันที่ พร้อมเส้นขอบปิดท้าย
   (อยู่ใต้ object เสมอ ไม่บังกล่องงาน / กล่อง Text)

   โหลดหลัง app.js
========================================================= */

(function () {

    const plan = document.querySelector(".plan");

    const scheduleArea = document.getElementById("scheduleArea");

    const viewport = document.getElementById("timelineViewport");

    const header = document.getElementById("timelineHeader");

    const bracketArea = document.getElementById("bracketArea");

    const bracketViewport = document.getElementById("bracketViewport");

    if (!plan || !scheduleArea || !viewport) {

        console.error("[table-fit.js] ไม่พบตาราง (#scheduleArea / #timelineViewport)");

        return;
    }


    /* =====================================================
       รวม "วันสิ้นสุด" เข้าไปในตารางด้วย
       app.js เดิมนับวันแบบไม่รวมวันสุดท้าย (start → end-1)
       เช่น สิ้นสุด 31 ธ.ค. จะวาดเลขถึงแค่ 30
       → ห่อ calculateTimelineGeometry ให้นับเพิ่ม 1 วัน
         เลขวันที่ / เส้นตาราง / ช่อง bracket จึงไปถึงวันสุดท้ายครบ
    ===================================================== */

    if (
        typeof calculateTimelineGeometry === "function" &&
        !calculateTimelineGeometry.__zgIncludeEndDay
    ) {

        const originalCalculateTimelineGeometry =
            calculateTimelineGeometry;

        const wrappedCalculateTimelineGeometry = function () {

            const result =
                originalCalculateTimelineGeometry.apply(this, arguments);

            timelineTotalDays += 1;

            timelineWidthPx =
                timelineTotalDays * pxPerDay;

            timelineContent.style.width = `${timelineWidthPx}px`;
            timelineContent.style.minWidth = `${timelineWidthPx}px`;

            if (bracketContent) {
                bracketContent.style.width = `${timelineWidthPx}px`;
                bracketContent.style.minWidth = `${timelineWidthPx}px`;
            }

            return result;
        };

        wrappedCalculateTimelineGeometry.__zgIncludeEndDay = true;

        calculateTimelineGeometry =
            wrappedCalculateTimelineGeometry;

        /* ถ้าตารางวาดไปแล้วก่อนไฟล์นี้โหลด → วาดใหม่ให้รวมวันสุดท้าย */
        if (timelineWidthPx > 0 && typeof renderSchedule === "function") {
            renderSchedule();
        }
    }


    /* =====================================================
       STYLE
    ===================================================== */

    const style = document.createElement("style");

    style.textContent = `
.zg-table-end-mask {
    position: absolute;
    display: block;
    visibility: hidden;
    box-sizing: border-box;
    pointer-events: none;
    z-index: 450;              /* เหนือตาราง (10–60) แต่ใต้ object layer (500) */
}
.zg-table-end-mask.visible { visibility: visible; }
`;

    document.head.appendChild(style);


    function createMask(name) {

        const mask = document.createElement("div");

        mask.className = `zg-table-end-mask zg-table-end-mask--${name}`;

        plan.appendChild(mask);

        return mask;
    }

    const masks = {
        header: createMask("header"),
        table: createMask("table"),
        bracket: bracketArea ? createMask("bracket") : null
    };


    /* =====================================================
       UPDATE
    ===================================================== */

    function contentWidth() {

        if (typeof timelineWidthPx !== "undefined" && timelineWidthPx > 0) {
            return timelineWidthPx;
        }

        const content = document.getElementById("timelineContent");

        return content ? content.offsetWidth : viewport.scrollWidth;
    }


    function hideAll() {

        Object.values(masks).forEach(mask => {
            if (mask) mask.classList.remove("visible");
        });

        currentEnd.table = Infinity;
        currentEnd.bracket = Infinity;

        applyObjectClips();
    }


    /* =====================================================
       OBJECT CLIP — ตัด object ที่ยื่นเลยวันสิ้นสุด
       (กล่องงาน / เส้นวันที่ / เส้นแนวนอน / กล่อง Text ที่ติดแม่เหล็ก)
       ตัดเฉพาะด้านขวา ด้านบน/ล่าง/ซ้าย ยังล้นได้เหมือนเดิม
    ===================================================== */

    const objectLayerViewport = document.getElementById("objectLayerViewport");
    const hlineLayerViewport = document.getElementById("hlineLayerViewport");

    const currentEnd = { table: Infinity, bracket: Infinity };

    const FAR = 100000;

    function setRightClip(element, endX) {

        if (!element) {
            return;
        }

        const rect = element.getBoundingClientRect();

        const cut = rect.right - endX;

        const value =
            Number.isFinite(endX) && cut > 0.5
                ? `inset(-${FAR}px ${cut}px -${FAR}px -${FAR}px)`
                : "";

        if (element.style.clipPath !== value) {
            element.style.clipPath = value;
        }
    }


    let ignoreTextMutations = false;

    /* "inset(a b c d)" (เบราว์เซอร์อาจย่อเหลือ 1–3 ค่า) → [top, right, bottom, left] */
    function parseInset(value) {

        const match = /^inset\(([^)]*)\)$/.exec((value || "").trim());

        if (!match) {
            return null;
        }

        const parts = match[1].trim().split(/\s+/).map(part => parseFloat(part));

        if (!parts.length || parts.length > 4 || parts.some(n => !Number.isFinite(n))) {
            return null;
        }

        const [t, r = t, b = t, l = r] = parts;

        return [t, r, b, l];
    }


    function clipTextBox(box) {

        const raw = box.dataset.zgTfBaseClip !== undefined
            ? box.dataset.zgTfBaseClip
            : "";

        /* ค่า clip ที่ text.js ตั้งไว้ (เฉพาะกล่องที่ติดแม่เหล็กจะมี inset) */
        const current = box.style.clipPath || "";

        let base = raw;

        if (current !== box.dataset.zgTfAppliedClip) {
            base = current;
            box.dataset.zgTfBaseClip = current;
        }

        const inset = parseInset(base);

        let finalValue = base;

        if (inset) {

            const rect = box.getBoundingClientRect();

            const inBracket =
                bracketArea &&
                rect.top >= bracketArea.getBoundingClientRect().top - 2;

            const endX = inBracket ? currentEnd.bracket : currentEnd.table;

            if (Number.isFinite(endX)) {

                const right = Math.max(inset[1], rect.right - endX);

                finalValue =
                    `inset(${inset[0]}px ${right}px ${inset[2]}px ${inset[3]}px)`;
            }
        }

        box.dataset.zgTfAppliedClip = finalValue;

        if (box.style.clipPath !== finalValue) {
            box.style.clipPath = finalValue;
            box.dataset.zgTfAppliedClip = box.style.clipPath;
        }
    }


    function clipAllTextBoxes() {

        ignoreTextMutations = true;

        document
            .querySelectorAll(".zg-text-layer .zg-text-box")
            .forEach(clipTextBox);

        /* ปล่อย flag หลัง MutationObserver ส่งงานรอบนี้แล้ว */
        Promise.resolve().then(() => { ignoreTextMutations = false; });
    }


    function applyObjectClips() {

        setRightClip(objectLayerViewport, currentEnd.table);
        setRightClip(hlineLayerViewport, currentEnd.table);
        setRightClip(bracketViewport, currentEnd.bracket);

        clipAllTextBoxes();
    }


    /* text.js วางตำแหน่ง/ตั้ง clip ใหม่ทุกครั้งที่เลื่อน → ตัดซ้ำทันที */
    const textObserver = new MutationObserver(records => {

        if (ignoreTextMutations) {
            return;
        }

        const boxes = new Set();

        records.forEach(record => {
            const box = record.target.closest && record.target.closest(".zg-text-box");
            if (box) boxes.add(box);
        });

        if (!boxes.size) {
            return;
        }

        ignoreTextMutations = true;

        boxes.forEach(clipTextBox);

        Promise.resolve().then(() => { ignoreTextMutations = false; });
    });

    function observeTextLayers() {

        document.querySelectorAll(".zg-text-layer").forEach(layer => {

            if (layer.dataset.zgTfObserved) {
                return;
            }

            layer.dataset.zgTfObserved = "1";

            textObserver.observe(layer, {
                attributes: true,
                attributeFilter: ["style"],
                subtree: true
            });
        });
    }


    /* วางแผ่นปิดตั้งแต่ endX ถึงขอบขวาของ element (พิกัดเทียบกับ .plan) */
    function placeMask(mask, targetRect, planRect, endX, options) {

        if (!mask || !targetRect) {
            return;
        }

        const right = targetRect.right;

        if (endX >= right - 1) {

            mask.classList.remove("visible");

            return;
        }

        const extraTop = options.extraTop || 0;
        const extraBottom = options.extraBottom || 0;

        mask.style.left = `${endX - planRect.left}px`;
        mask.style.top = `${targetRect.top - planRect.top - extraTop}px`;
        mask.style.width = `${right - endX + (options.extraRight || 0)}px`;
        mask.style.height = `${targetRect.height + extraTop + extraBottom}px`;

        mask.style.background = options.background;
        mask.style.borderLeft = options.borderLeft || "none";

        mask.classList.add("visible");
    }


    function update() {

        frame = null;

        /* พิกัดอ้างอิง = กล่องแม่ที่ mask ใช้วางตำแหน่งจริง (กัน .plan เป็น static) */
        const parent = masks.table.offsetParent || plan;
        const parentBox = parent.getBoundingClientRect();
        const planRect = {
            left: parentBox.left + parent.clientLeft - parent.scrollLeft,
            top: parentBox.top + parent.clientTop - parent.scrollTop
        };

        const viewportRect = viewport.getBoundingClientRect();

        if (!viewportRect.width) {

            hideAll();

            return;
        }

        /* ตำแหน่ง "วันสิ้นสุด" บนจอ */
        const endX =
            viewportRect.left + contentWidth() - viewport.scrollLeft;

        /* ช่วงวันที่ยาวกว่าจอ → ไม่ต้องปิด (ขอบตารางเดิมคือเส้นท้าย) */
        if (endX >= viewportRect.right - 1) {

            hideAll();

            return;
        }

        currentEnd.table = endX;
        currentEnd.bracket = endX;

        const planBackground =
            getComputedStyle(plan).backgroundColor || "#ffffff";

        const areaStyle = getComputedStyle(scheduleArea);

        const lineColor = areaStyle.borderTopColor || "#777777";

        const lineWidth = parseFloat(areaStyle.borderTopWidth) || 1;

        /* ตารางหลัก: ปิดเกินขอบบน/ล่างนิดหน่อยให้กลบเส้นกรอบที่ยาวเกิน */
        placeMask(masks.table, scheduleArea.getBoundingClientRect(), planRect, endX, {
            background: planBackground,
            borderLeft: `${lineWidth}px solid ${lineColor}`,
            extraTop: 1,
            extraBottom: 1,
            extraRight: 2
        });

        /* หัวเดือน / วันที่ */
        if (header) {

            placeMask(masks.header, header.getBoundingClientRect(), planRect, endX + lineWidth, {
                background: planBackground,
                extraRight: 2
            });
        }

        /* ช่องเส้นวันที่ (Bracket): ใช้ตำแหน่งตาม scroll ของช่องนี้เอง */
        if (bracketArea && masks.bracket) {

            const bracketRect = bracketArea.getBoundingClientRect();

            const bracketStyle = getComputedStyle(bracketArea);

            const bracketEndX =
                bracketViewport
                    ? bracketViewport.getBoundingClientRect().left + contentWidth() - bracketViewport.scrollLeft
                    : endX;

            currentEnd.bracket =
                bracketEndX >= bracketRect.right - 1 ? Infinity : bracketEndX;

            placeMask(masks.bracket, bracketRect, planRect, bracketEndX, {
                background: planBackground,
                borderLeft: `${parseFloat(bracketStyle.borderTopWidth) || 1}px solid ${bracketStyle.borderTopColor || "#c7ceca"}`,
                extraTop: 1,
                extraBottom: 1,
                extraRight: 2
            });
        }

        observeTextLayers();

        applyObjectClips();
    }


    let frame = null;

    function scheduleUpdate() {

        if (frame === null) {
            frame = requestAnimationFrame(update);
        }
    }


    /* =====================================================
       EVENTS
    ===================================================== */

    viewport.addEventListener("scroll", scheduleUpdate, { passive: true });

    if (bracketViewport) {
        bracketViewport.addEventListener("scroll", scheduleUpdate, { passive: true });
    }

    window.addEventListener("resize", scheduleUpdate);

    window.addEventListener("scroll", scheduleUpdate, { passive: true, capture: true });

    /* ตารางวาดใหม่ (เพิ่ม/ลดเดือน, เปลี่ยนวันที่, ซูม, เพิ่มหมวด) */
    const headerInner = document.getElementById("timelineHeaderInner");

    if (headerInner) {
        new MutationObserver(scheduleUpdate).observe(headerInner, { childList: true });
    }

    const content = document.getElementById("timelineContent");

    if (content) {
        new MutationObserver(scheduleUpdate).observe(content, {
            attributes: true,
            attributeFilter: ["style"]
        });
    }

    /* เปลี่ยนธีม (สีพื้น) */
    new MutationObserver(scheduleUpdate).observe(document.body, {
        attributes: true,
        attributeFilter: ["class"]
    });

    scheduleUpdate();

    setTimeout(scheduleUpdate, 500);


    window.ZGTableFit = {
        refresh: scheduleUpdate
    };

})();