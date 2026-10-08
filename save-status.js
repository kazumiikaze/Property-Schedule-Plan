"use strict";

/* =========================================================
   SAVE-STATUS.JS — ป้ายสถานะการบันทึกบน Toolbar
     ● รอบันทึก…        มีการแก้ไข กำลังรอระบบบันทึกอัตโนมัติ (ทุก ~3 วินาที)
     ✓ บันทึกแล้ว 10:42  บันทึกลงเบราว์เซอร์เรียบร้อย
     ⚠ บันทึกไม่ได้      พื้นที่เต็ม / เบราว์เซอร์ไม่ให้เก็บ → ควร Export
   ดูจากการบันทึกจริงของ plans.js (ไม่บันทึกเอง ไม่แก้ plans.js)
========================================================= */

(function () {

    const PLANS_KEY = "zg-property-schedule-plans-v1";

    /* แก้แล้วไม่มีการบันทึกภายในเวลานี้ = ไม่มีอะไรเปลี่ยนจริง */
    const PENDING_TIMEOUT = 6000;


    const style = document.createElement("style");

    style.textContent = `
.zg-save-status {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 24px;
    padding: 0 9px;
    margin-left: 4px;
    border-radius: 999px;
    background: #eef6f0;
    color: #2f7442;
    font: 11px/1 Arial, Helvetica, sans-serif;
    white-space: nowrap;
    cursor: default;
    user-select: none;
    transition: background-color .2s ease, color .2s ease;
}
.zg-save-status.is-pending { background: #fff5e6; color: #b06a0c; }
.zg-save-status.is-error { background: #fdecea; color: #c0392b; cursor: pointer; }
.zg-save-status.is-pending .zg-save-dot { animation: zgSavePulse 1s ease-in-out infinite; }
@keyframes zgSavePulse { 50% { opacity: .3; } }
body.zg-dark .zg-save-status { background: #26372d; color: #9fd3ad; }
body.zg-dark .zg-save-status.is-pending { background: #3a3020; color: #f0c27a; }
body.zg-dark .zg-save-status.is-error { background: #3d2522; color: #f1a39b; }
body.zg-exporting .zg-save-status { display: none !important; }
`;

    document.head.appendChild(style);


    const badge = document.createElement("span");

    badge.className = "zg-save-status";
    badge.setAttribute("role", "status");

    const group = document.querySelector(".toolbar-group--plan");

    if (group) {
        group.appendChild(badge);
    } else {
        const toolbar = document.querySelector(".workspace-toolbar, .toolbar");
        if (toolbar) toolbar.appendChild(badge);
    }

    let lastSaved = null;
    let pendingTimer = null;

    function timeText(date) {
        return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
    }

    function showSaved() {

        badge.className = "zg-save-status";

        badge.innerHTML = lastSaved
            ? `<span>✓</span><span>บันทึกแล้ว ${timeText(lastSaved)}</span>`
            : `<span>✓</span><span>บันทึกอัตโนมัติ</span>`;

        badge.title = "แผนบันทึกในเบราว์เซอร์นี้อัตโนมัติ — ถ้าจะใช้เครื่องอื่น ให้ Export ไฟล์ .json";
    }

    function showPending() {

        if (badge.classList.contains("is-error")) return;

        badge.className = "zg-save-status is-pending";
        badge.innerHTML = `<span class="zg-save-dot">●</span><span>รอบันทึก…</span>`;

        clearTimeout(pendingTimer);

        pendingTimer = setTimeout(showSaved, PENDING_TIMEOUT);
    }

    function showError() {

        clearTimeout(pendingTimer);

        badge.className = "zg-save-status is-error";
        badge.innerHTML = `<span>⚠</span><span>บันทึกไม่ได้</span>`;
        badge.title = "บันทึกในเบราว์เซอร์ไม่ได้ (พื้นที่เต็มหรือถูกปิดไว้) — คลิกเพื่อ Export ไฟล์เก็บไว้";
    }

    badge.addEventListener("click", () => {

        if (badge.classList.contains("is-error") && window.ZGPlanIO && typeof window.ZGPlanIO.exportFile === "function") {
            window.ZGPlanIO.exportFile();
        }
    });


    /* ดูการบันทึกจริง (plans.js เขียน localStorage) */
    try {

        const originalSetItem = Storage.prototype.setItem;

        Storage.prototype.setItem = function (key, value) {

            if (this === window.localStorage && key === PLANS_KEY) {

                try {

                    const result = originalSetItem.apply(this, arguments);

                    lastSaved = new Date();

                    clearTimeout(pendingTimer);

                    showSaved();

                    return result;

                } catch (error) {

                    showError();

                    throw error;
                }
            }

            return originalSetItem.apply(this, arguments);
        };

    } catch (error) {

        console.error("[save-status.js]", error);
    }


    /*
        ผู้ใช้ทำอะไรบนกระดาน → ดูว่าประวัติ (ย้อนกลับ) มีขั้นใหม่ไหม
        มี = แก้ไขจริง → "รอบันทึก…" จนกว่า plans.js จะบันทึก
    */
    function historyMark() {

        const size = window.ZGHistory && window.ZGHistory.size;

        return size ? `${size.steps}:${size.index}` : "";
    }

    let lastMark = "";
    let checkTimers = [];

    function scheduleCheck() {

        const actionTime = Date.now();

        checkTimers.forEach(clearTimeout);

        checkTimers = [700, 1600, 2600].map(delay => setTimeout(() => {

            const mark = historyMark();

            if (mark && mark !== lastMark) {

                lastMark = mark;

                /* บันทึกไปแล้วหลังจากแก้ → ไม่ต้องแสดงรอ */
                if (lastSaved && lastSaved.getTime() >= actionTime) {
                    showSaved();
                } else {
                    showPending();
                }
            }

        }, delay));
    }

    ["input", "change", "drop", "paste", "mouseup", "keyup"].forEach(type => {
        document.addEventListener(type, scheduleCheck, true);
    });

    setTimeout(() => { lastMark = historyMark(); }, 1500);

    showSaved();

    window.ZGSaveStatus = { pending: showPending, saved: showSaved };

})();
