"use strict";

/* =========================================================
   FIT-PLAN.JS — ตารางเห็นทั้งแผน เหมือนภาพที่พิมพ์ / Export
   - ซูม 100% = วันเริ่ม → วันจบ พอดีความกว้างตาราง — เห็นได้สูงสุด 6 เดือน (เกิน → เลื่อนด้วย scrollbar)
   - หมวดหมู่เห็นสูงสุด 3 หมวด (เกิน → เลื่อนด้วย scrollbar) เหมือนเดิม
   - หน้าเว็บส่วนอื่น (หัวแผน · ช่องเส้นวันที่ · บันทึก) เต็มจอเหมือนเดิม
   - ปุ่ม "↔ ทั้งแผน" ในกลุ่มมุมมอง: เปิด/ปิด (ปิด = เห็นทีละ 6 เดือน · 3 หมวด แบบเดิม) · จำไว้ในเครื่อง
   - ต้องโหลดก่อน app.js (app.js อ่าน window.ZG_FIT_PLAN.on ตอนคำนวณตาราง)
========================================================= */

(function () {

    const STORE_KEY = "zg-fit-plan";

    let on = true;
    try { on = localStorage.getItem(STORE_KEY) !== "0"; } catch (error) { /* ใช้ค่าเริ่มต้น */ }

    const state = { on };
    window.ZG_FIT_PLAN = state;

    if (window.ZG_PREVIEW_MODE) return;

    function rerender() {
        if (typeof renderSchedule !== "function") return;
        renderSchedule();
        if (typeof updateAllHorizontalRanges === "function") updateAllHorizontalRanges();
        window.dispatchEvent(new Event("resize"));
    }

    function setOn(value) {
        state.on = Boolean(value);
        try { localStorage.setItem(STORE_KEY, state.on ? "1" : "0"); } catch (error) { /* ไม่เป็นไร */ }
        paint();
        rerender();
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "toolbar-control zg-fit-plan-btn";
    button.innerHTML = "↔ ทั้งแผน";
    button.addEventListener("click", () => setOn(!state.on));

    function paint() {
        button.setAttribute("aria-pressed", state.on ? "true" : "false");
        button.title = state.on
            ? "ตารางเห็นทั้งแผน (เปิดอยู่) — ทุกเดือน ทุกหมวด เหมือนตอนพิมพ์ / Export · กดเพื่อดูทีละช่วงแบบเดิม"
            : "ให้ตารางเห็นทั้งแผน ทุกเดือน ทุกหมวด เหมือนตอนพิมพ์ / Export";
    }

    function place() {
        if (button.isConnected) return true;
        const host = document.querySelector(".zgc-group--view") ||
            (document.querySelector(".toolbar-group--zoom") || {}).parentElement;
        if (!host) return false;
        host.appendChild(button);
        return true;
    }

    paint();

    function boot() {
        if (!place()) setTimeout(place, 400);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
    window.addEventListener("load", () => setTimeout(place, 300));

    window.ZGFitPlan = { isOn: () => state.on, set: setOn };

})();
