"use strict";

/* =========================================================
   VSCROLL-LEFT.JS — แถบเลื่อนขึ้นลง + ลูกศร ▲ ▼ ซ้ายสุดของตาราง
   (ชิดขอบซ้ายของช่องหมวดหมู่)
   - ▲ / ▼ : เลื่อนทีละ 1 หมวดหมู่ (กดค้าง = เลื่อนต่อเนื่อง)
   - ลากแถบ : เลื่อนตามเมาส์
   - คลิกที่ราง : เลื่อนทีละหน้า
   - ใช้ระบบเลื่อนเดิมของ app.js (setVerticalScroll) จึงซิงค์กับ
     ล้อเมาส์และแถบเลื่อนเดิมด้านขวาเสมอ
   - ไม่ติดไปในภาพ Export / งานพิมพ์

   ไม่แก้ app.js / style.css — โหลดหลัง app.js
========================================================= */

(function () {

    const area = document.getElementById("scheduleArea");

    if (!area || typeof setVerticalScroll !== "function" || typeof updateVerticalPosition !== "function") {

        console.error("[vscroll-left.js] ไม่พบตาราง / ฟังก์ชันเลื่อนของ app.js (ต้องโหลดหลัง app.js)");

        return;
    }


    /* =====================================================
       STYLE
    ===================================================== */

    const style = document.createElement("style");

    style.textContent = `
.zg-vscroll {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 16px;
    z-index: 70;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 2px;
    padding: 2px 1px;
    box-sizing: border-box;
    background: rgba(255, 255, 255, .72);
    border-right: 1px solid rgba(0, 0, 0, .08);
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;
}
.zg-vscroll__btn {
    flex: 0 0 16px;
    height: 16px;
    padding: 0;
    border: 0;
    border-radius: 3px;
    background: transparent;
    color: #55605a;
    font-size: 9px;
    line-height: 16px;
    cursor: pointer;
}
.zg-vscroll__btn:hover:not(:disabled) { background: rgba(58, 138, 79, .16); color: #2f7442; }
.zg-vscroll__btn:disabled { opacity: .3; cursor: default; }
.zg-vscroll__track {
    position: relative;
    flex: 1 1 auto;
    margin: 0 3px;
    border-radius: 6px;
    background: rgba(0, 0, 0, .07);
    cursor: pointer;
}
.zg-vscroll__thumb {
    position: absolute;
    left: 0;
    right: 0;
    min-height: 18px;
    border-radius: 6px;
    background: #8a948f;
    cursor: grab;
}
.zg-vscroll__thumb:hover,
.zg-vscroll.is-dragging .zg-vscroll__thumb { background: #81a774; }
.zg-vscroll.is-dragging .zg-vscroll__thumb { cursor: grabbing; }
.zg-vscroll.is-disabled .zg-vscroll__track { cursor: default; }
.zg-vscroll.is-disabled .zg-vscroll__thumb { opacity: .35; cursor: default; background: #8a948f; }

body.zg-dark .zg-vscroll { background: rgba(30, 36, 33, .78); border-right-color: rgba(255, 255, 255, .08); }
body.zg-dark .zg-vscroll__btn { color: #c6d0ca; }
body.zg-dark .zg-vscroll__track { background: rgba(255, 255, 255, .1); }

body.zg-exporting .zg-vscroll { display: none !important; }
@media print { .zg-vscroll { display: none !important; } }
`;

    document.head.appendChild(style);


    /* =====================================================
       ELEMENT
    ===================================================== */

    const bar = document.createElement("div");

    bar.className = "zg-vscroll";

    bar.innerHTML = `
        <button type="button" class="zg-vscroll__btn zg-vscroll__btn--up" title="เลื่อนขึ้น">▲</button>
        <div class="zg-vscroll__track"><div class="zg-vscroll__thumb"></div></div>
        <button type="button" class="zg-vscroll__btn zg-vscroll__btn--down" title="เลื่อนลง">▼</button>
    `;

    area.appendChild(bar);

    const upBtn = bar.querySelector(".zg-vscroll__btn--up");
    const downBtn = bar.querySelector(".zg-vscroll__btn--down");
    const track = bar.querySelector(".zg-vscroll__track");
    const thumb = bar.querySelector(".zg-vscroll__thumb");


    /* =====================================================
       STATE → UI
    ===================================================== */

    function maxScroll() {
        return typeof maxVerticalScroll === "number" ? Math.max(0, maxVerticalScroll) : 0;
    }

    function currentScroll() {
        return typeof verticalScrollY === "number" ? verticalScrollY : 0;
    }

    function stepSize() {
        return typeof categoryHeight === "number" && categoryHeight > 0
            ? categoryHeight
            : Math.max(40, area.clientHeight / 3);
    }

    function thumbMetrics() {

        const trackHeight = track.clientHeight;
        const total = typeof totalContentHeight === "number" && totalContentHeight > 0
            ? totalContentHeight
            : area.clientHeight;

        const visible = area.clientHeight;

        const thumbHeight = Math.max(18, Math.min(trackHeight, trackHeight * (visible / Math.max(total, 1))));

        return { trackHeight, thumbHeight, room: Math.max(0, trackHeight - thumbHeight) };
    }

    function refresh() {

        const max = maxScroll();
        const value = currentScroll();
        const { thumbHeight, room } = thumbMetrics();

        const disabled = max <= 0.5;

        bar.classList.toggle("is-disabled", disabled);

        upBtn.disabled = disabled || value <= 0.5;
        downBtn.disabled = disabled || value >= max - 0.5;

        thumb.style.height = `${thumbHeight}px`;
        thumb.style.top = `${disabled ? 0 : (value / max) * room}px`;
    }


    /* ระบบเดิมเรียก updateVerticalPosition() ทุกครั้งที่เลื่อน / วาดตารางใหม่ */
    const originalUpdateVerticalPosition = updateVerticalPosition;

    updateVerticalPosition = function () {

        const result = originalUpdateVerticalPosition.apply(this, arguments);

        refresh();

        return result;
    };


    function scrollTo(value) {
        setVerticalScroll(value);
        refresh();
    }


    /* =====================================================
       ARROWS (กดค้าง = เลื่อนต่อเนื่อง)
    ===================================================== */

    let repeatTimer = null;

    function stopRepeat() {
        clearTimeout(repeatTimer);
        clearInterval(repeatTimer);
        repeatTimer = null;
    }

    function bindArrow(button, direction) {

        button.addEventListener("mousedown", event => {

            if (button.disabled) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            const step = () => scrollTo(currentScroll() + direction * stepSize());

            step();

            stopRepeat();

            repeatTimer = setTimeout(() => {
                repeatTimer = setInterval(() => {
                    if (button.disabled) {
                        stopRepeat();
                        return;
                    }
                    step();
                }, 160);
            }, 380);
        });

        /* กันคลิกซ้ำจาก event click หลัง mousedown */
        button.addEventListener("click", event => event.preventDefault());
    }

    bindArrow(upBtn, -1);
    bindArrow(downBtn, 1);

    window.addEventListener("mouseup", stopRepeat);
    window.addEventListener("blur", stopRepeat);


    /* =====================================================
       TRACK / THUMB
    ===================================================== */

    let drag = null;

    thumb.addEventListener("mousedown", event => {

        if (maxScroll() <= 0) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        drag = { startY: event.clientY, startValue: currentScroll() };

        bar.classList.add("is-dragging");
    });

    window.addEventListener("mousemove", event => {

        if (!drag) {
            return;
        }

        const { room } = thumbMetrics();

        if (room <= 0) {
            return;
        }

        const delta = (event.clientY - drag.startY) / room * maxScroll();

        scrollTo(drag.startValue + delta);
    });

    window.addEventListener("mouseup", () => {

        if (!drag) {
            return;
        }

        drag = null;

        bar.classList.remove("is-dragging");
    });


    /* คลิกรางว่าง → เลื่อนทีละหน้า ไปทางที่คลิก */
    track.addEventListener("mousedown", event => {

        if (event.target !== track || maxScroll() <= 0) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const thumbRect = thumb.getBoundingClientRect();

        const direction = event.clientY < thumbRect.top ? -1 : 1;

        scrollTo(currentScroll() + direction * area.clientHeight * 0.9);
    });


    /* ไม่ให้คลิกบนแถบไปเลือกแถว / หมวดหมู่ */
    bar.addEventListener("click", event => event.stopPropagation());


    /* =====================================================
       INIT
    ===================================================== */

    if (typeof ResizeObserver === "function") {
        new ResizeObserver(refresh).observe(area);
    }

    window.addEventListener("resize", refresh);

    requestAnimationFrame(refresh);

    setTimeout(refresh, 500);


    window.ZGVScrollLeft = { refresh };

})();
