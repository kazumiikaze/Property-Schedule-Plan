"use strict";

/* =========================================================
   LINE-GRAB.JS — จับเส้นในช่อง "เส้นวันที่ / Bracket" ได้
   - เส้นแนวตั้ง (กดจากเลขวันที่ข้างบน) และเส้นวันที่ (สีแดง)
     ส่วนที่ลากยาวลงมาในช่องเส้นวันที่ (dateline-stem.js) เดิมกดไม่ได้
   - ไฟล์นี้วางโซนจับใส ๆ กว้าง 14px ทับเส้นในช่องนั้น
     · ลากซ้าย-ขวา = ย้ายเส้นไปวันอื่น (ทีละวัน มีป้ายบอกวันที่)
       กล่องข้อความของเส้นวันที่ไม่ขยับขึ้นลง
     · คลิก = เปิดเมนูปรับแต่งเส้น (สี / ความหนา / ลบ ฯลฯ)
     · เอาเมาส์ชี้ = ไฮไลต์เส้นให้รู้ว่าจับได้
   - ไม่แก้ app.js / style.css — โหลดหลัง dateline-stem.js
========================================================= */

(function () {

    if (
        typeof renderObjects !== "function" ||
        typeof beginObjectDrag !== "function" ||
        typeof handleObjectDragMove !== "function" ||
        typeof bracketContent === "undefined"
    ) {
        console.warn("[line-grab.js] ต้องโหลดหลัง app.js / dateline-stem.js");
        return;
    }

    const HIT = 14;

    const style = document.createElement("style");

    style.textContent = `
.zg-line-hit {
    position: absolute;
    top: 0;
    width: ${HIT}px;
    margin-left: -${HIT / 2}px;
    z-index: 3;
    cursor: ew-resize;
    border-radius: 8px;
    transition: background-color .12s ease;
}
.zg-line-hit:hover,
.zg-line-hit.is-dragging { background: rgba(58, 138, 79, .18); }
body.zg-line-hit-dragging, body.zg-line-hit-dragging * { cursor: ew-resize !important; user-select: none !important; }
body.zg-exporting .zg-line-hit { display: none !important; }
@media print { .zg-line-hit { display: none !important; } }
`;

    document.head.appendChild(style);

    function findObject(id) {
        return timelineObjects.find(object => object.id === id) || null;
    }

    let dragging = null;


    /* =====================================================
       วาดโซนจับ (หลัง dateline-stem.js วาดเส้นเสร็จ)
    ===================================================== */

    function drawHits() {

        bracketContent.querySelectorAll(".zg-line-hit").forEach(node => node.remove());

        bracketContent.querySelectorAll(".zg-vline-stem[data-stem-for], .zg-dateline-stem[data-stem-for]").forEach(stem => {

            const object = findObject(stem.dataset.stemFor);
            if (!object) return;

            const isVline = stem.classList.contains("zg-vline-stem");

            const hit = document.createElement("div");
            hit.className = "zg-line-hit";
            hit.dataset.lineId = object.id;
            hit.title = "ลากซ้าย-ขวาเพื่อย้าย · คลิกเพื่อปรับแต่ง";

            const center = stem.offsetLeft + (isVline ? stem.offsetWidth / 2 : 1);
            hit.style.left = `${center}px`;
            hit.style.height = isVline ? "100%" : `${stem.offsetHeight}px`;

            if (dragging && dragging.id === object.id) hit.classList.add("is-dragging");

            hit.addEventListener("click", event => {

                event.stopPropagation();

                if (suppressNextClick) {
                    suppressNextClick = false;
                    return;
                }

                const target = findObject(object.id);
                if (target && typeof openObjectMenu === "function") openObjectMenu(target, hit);
            });

            bracketContent.appendChild(hit);
        });
    }


    /*
        กดที่โซนจับ: รับที่ window (capture) ก่อนระบบลากคลุม (marquee-select.js)
        ซึ่งดักที่ document (capture) และกินเหตุการณ์ไปก่อน
    */
    window.addEventListener("mousedown", event => {

        const hit = event.target instanceof Element ? event.target.closest(".zg-line-hit") : null;

        if (!hit || event.button !== 0) return;

        const target = findObject(hit.dataset.lineId);
        if (!target) return;

        if (typeof closeObjectMenu === "function") closeObjectMenu();

        beginObjectDrag(event, target, "move-dateline");

        if (typeof objectDragState !== "undefined" && objectDragState) {
            /* ลากจากช่องนี้ = เลื่อนแค่ซ้าย-ขวา (กล่องข้อความไม่ขยับขึ้นลง) */
            objectDragState.zgLockY = true;
            dragging = { id: target.id };
            hit.classList.add("is-dragging");
            document.body.classList.add("zg-line-hit-dragging");
        }
    }, true);

    /* ลากจากโซนจับ → ล็อกแนวตั้งไว้ที่จุดเริ่ม */
    const originalMove = handleObjectDragMove;

    handleObjectDragMove = function (event) {

        const state = typeof objectDragState !== "undefined" ? objectDragState : null;

        if (state && state.zgLockY && event) {

            const locked = {
                clientX: event.clientX,
                clientY: state.startClientY,
                pageX: event.pageX,
                pageY: event.pageY,
                screenX: event.screenX,
                screenY: event.screenY,
                shiftKey: event.shiftKey,
                altKey: event.altKey,
                ctrlKey: event.ctrlKey,
                metaKey: event.metaKey,
                buttons: event.buttons,
                target: event.target,
                type: event.type,
                preventDefault: () => event.preventDefault(),
                stopPropagation: () => event.stopPropagation()
            };

            return originalMove.call(this, locked);
        }

        return originalMove.apply(this, arguments);
    };

    document.addEventListener("mouseup", () => {
        if (!dragging) return;
        dragging = null;
        document.body.classList.remove("zg-line-hit-dragging");
        bracketContent.querySelectorAll(".zg-line-hit.is-dragging").forEach(node => node.classList.remove("is-dragging"));
    });


    const originalRender = renderObjects;

    renderObjects = function () {

        const result = originalRender.apply(this, arguments);

        try {
            drawHits();
        } catch (error) {
            console.error("[line-grab.js]", error);
        }

        return result;
    };

    window.addEventListener("resize", () => requestAnimationFrame(() => requestAnimationFrame(drawHits)));

    drawHits();

    window.ZGLineGrab = { refresh: drawHits };

})();
