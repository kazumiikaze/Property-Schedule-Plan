"use strict";

/* =========================================================
   TODAY-LINE.JS — เส้น "วันนี้" บนตาราง
   - เส้นแนวตั้งสีส้มตรงวันนี้ + ป้าย "วันนี้" ที่หัววันที่
   - เห็นทันทีว่างานไหนเลยกำหนด / ใกล้ถึง
   - ไม่ขวางการคลิก object · วันนี้อยู่นอกช่วงตาราง = ไม่แสดง
   - ข้ามเที่ยงคืน → ขยับเอง
   - ปิด/เปิดได้ที่ปุ่ม ⌨ (หน้าวิธีใช้) หรือกด T

   ไม่แก้ app.js — โหลดหลัง app.js
========================================================= */

(function () {

    if (typeof renderObjects !== "function" || typeof dateToLeft !== "function") {

        console.error("[today-line.js] ไม่พบฟังก์ชันของ app.js");

        return;
    }

    const STORE_KEY = "zg-today-line-v1";

    let visible = true;

    try {
        visible = localStorage.getItem(STORE_KEY) !== "0";
    } catch (error) { /* ignore */ }


    const style = document.createElement("style");

    style.textContent = `
.zg-today-line {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 0;
    border-left: 2px solid #f08a24;
    box-shadow: 0 0 0 1px rgba(240, 138, 36, .18);
    pointer-events: none;
    z-index: 2;
}
.zg-today-badge {
    position: absolute;
    bottom: 1px;
    z-index: 3;
    transform: translateX(-50%);
    padding: 0 6px;
    border-radius: 999px;
    background: #f08a24;
    color: #ffffff;
    font: 700 9px/14px Arial, Helvetica, sans-serif;
    white-space: nowrap;
    pointer-events: none;
    box-shadow: 0 1px 3px rgba(0, 0, 0, .2);
}
`;

    document.head.appendChild(style);


    function startOfToday() {

        const now = new Date();

        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    function lastDay() {

        const date = new Date(timelineStartDate);

        date.setDate(date.getDate() + Math.max(0, timelineTotalDays - 1));

        return date;
    }

    function draw() {

        document.querySelectorAll(".zg-today-line, .zg-today-badge").forEach(node => node.remove());

        if (!visible || !timelineStartDate || !(pxPerDay > 0)) return;

        const today = startOfToday();

        if (today < timelineStartDate || today > lastDay()) return;

        /* กึ่งกลางช่องของวันนี้ */
        const left = dateToLeft(today) + pxPerDay / 2;

        const layer = document.getElementById("objectLayer");

        if (layer) {

            const line = document.createElement("div");

            line.className = "zg-today-line";
            line.style.left = `${left - 1}px`;
            line.title = "วันนี้";

            layer.insertBefore(line, layer.firstChild);
        }

        const header = typeof timelineHeaderInner !== "undefined" ? timelineHeaderInner : document.getElementById("timelineHeaderInner");

        if (header) {

            const badge = document.createElement("div");

            badge.className = "zg-today-badge";
            badge.style.left = `${left}px`;
            badge.textContent = "วันนี้";

            header.appendChild(badge);
        }
    }

    const originalRender = renderObjects;

    renderObjects = function () {

        const result = originalRender.apply(this, arguments);

        try {
            draw();
        } catch (error) {
            console.error("[today-line.js]", error);
        }

        return result;
    };


    /* ข้ามเที่ยงคืน → วาดใหม่ */
    let drawnFor = startOfToday().getTime();

    setInterval(() => {

        const now = startOfToday().getTime();

        if (now !== drawnFor) {
            drawnFor = now;
            draw();
        }

    }, 60 * 1000);


    function setVisible(value) {

        visible = Boolean(value);

        try {
            localStorage.setItem(STORE_KEY, visible ? "1" : "0");
        } catch (error) { /* ignore */ }

        draw();
    }

    /* กด T = เปิด/ปิดเส้นวันนี้ */
    document.addEventListener("keydown", event => {

        if (event.ctrlKey || event.metaKey || event.altKey) return;

        if ((event.key || "").toLowerCase() !== "t") return;

        const target = event.target;

        if (target instanceof Element && target.closest("input, textarea, select, [contenteditable=''], [contenteditable='true']")) return;

        setVisible(!visible);
    });

    draw();

    window.ZGTodayLine = {
        isVisible: () => visible,
        setVisible,
        refresh: draw
    };

})();
