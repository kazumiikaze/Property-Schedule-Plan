"use strict";

/* =========================================================
   HISTORY.JS — ย้อนกลับ / ทำซ้ำ (Undo / Redo)

   ปุ่ม ↶ ↷ บน toolbar + ปุ่มลัด
     Ctrl+Z            = ย้อนกลับ
     Ctrl+Y / Ctrl+Shift+Z = ทำซ้ำ

   วิธีทำงาน:
   - หลังผู้ใช้ทำอะไรก็ตาม (คลิก ลาก พิมพ์ เลือกสี ลบ ฯลฯ) จะเก็บ
     "ภาพรวมของแผน" ไว้ 1 ขั้น ถ้ามีอะไรเปลี่ยนจริง
     (ใช้ข้อมูลชุดเดียวกับ Export ไฟล์แผน → ครอบคลุมทุกอย่างในแผน)
   - พิมพ์ข้อความต่อเนื่อง = นับเป็น 1 ขั้น (เว้นจังหวะ ~0.7 วินาที)
   - เลื่อนตาราง / ย่อขยายหน้าต่าง ไม่นับเป็นขั้น
   - แยกประวัติตามแผน และเก็บไว้ใน sessionStorage
     → รีเฟรชหน้าแล้วยังย้อนกลับได้ (หายเมื่อปิดแท็บ)
   - เก็บได้สูงสุด 100 ขั้น

   โหลดหลัง io.js และ plans.js (ไม่แก้ app.js)
========================================================= */

(function () {

    if (!window.ZGPlanIO || typeof window.ZGPlanIO.build !== "function") {

        console.error("[history.js] ไม่พบ io.js ตัวใหม่ (window.ZGPlanIO)");

        return;
    }


    /* =====================================================
       CONFIG
    ===================================================== */

    const MAX_STEPS = 100;

    const CHECK_DELAY_MS = 350;      // รอให้การกระทำจบก่อนค่อยเก็บ

    const TYPING_DELAY_MS = 700;     // พิมพ์ต่อเนื่อง → รวมเป็นขั้นเดียว

    const START_DELAY_MS = 1500;     // รอแผนจากเบราว์เซอร์โหลดเสร็จก่อนเริ่ม

    const SCALED_TYPES = ["task", "hline"];

    const SCALED_PARTS = ["canvas-object--task", "canvas-object--hline"];


    /* =====================================================
       BUTTONS (สร้างเองถ้ายังไม่มีใน index.html)
    ===================================================== */

    let undoBtn = document.getElementById("undoBtn");
    let redoBtn = document.getElementById("redoBtn");

    if (!undoBtn || !redoBtn) {

        const group = document.createElement("div");

        group.className = "toolbar-group toolbar-group--history";

        group.innerHTML = `
            <button type="button" id="undoBtn" class="toolbar-square-btn" title="ย้อนกลับ (Ctrl+Z)">↶</button>
            <button type="button" id="redoBtn" class="toolbar-square-btn" title="ทำซ้ำ (Ctrl+Y)">↷</button>
        `;

        const anchor =
            document.querySelector(".toolbar-group--insert") ||
            document.querySelector(".toolbar-row-main .toolbar-group");

        if (anchor && anchor.parentNode) {
            anchor.parentNode.insertBefore(group, anchor);
        } else {
            (document.querySelector(".workspace-toolbar") || document.body).appendChild(group);
        }

        undoBtn = group.querySelector("#undoBtn");
        redoBtn = group.querySelector("#redoBtn");
    }


    const style = document.createElement("style");

    style.textContent = `
#undoBtn, #redoBtn { font-size: 16px; font-weight: 700; }
#undoBtn:disabled, #redoBtn:disabled {
    opacity: .35;
    cursor: default;
    transform: none !important;
    box-shadow: none !important;
}
.zg-history-toast {
    position: fixed;
    left: 50%;
    bottom: 70px;
    transform: translateX(-50%);
    padding: 6px 12px;
    background: #1e2924;
    color: #ffffff;
    border-radius: 8px;
    font-size: 12px;
    box-shadow: 0 6px 20px rgba(0, 0, 0, .2);
    z-index: 32000;
    pointer-events: none;
}
@media print { .zg-history-toast { display: none !important; } }
`;

    document.head.appendChild(style);


    /* =====================================================
       SNAPSHOT
    ===================================================== */

    /*
        key = ข้อมูลไว้ "เทียบ" ว่ามีอะไรเปลี่ยนไหม
        ตัดส่วนที่เปลี่ยนเองโดยผู้ใช้ไม่ได้ทำอะไร: เวลา export, ตำแหน่ง scroll,
        ขนาด px ต่อวัน (เปลี่ยนตามขนาดหน้าต่าง), ตำแหน่งบนจอของกล่อง Text ที่ติดแม่เหล็ก
    */
    function makeKey(data) {

        const copy = JSON.parse(JSON.stringify(data));

        const px = Number(copy.timeline && copy.timeline.pxPerDay) || 1;

        delete copy.exportedAt;

        if (copy.timeline) {
            delete copy.timeline.scrollLeft;
            delete copy.timeline.pxPerDay;
        }

        (copy.objects || []).forEach(object => {

            if (SCALED_TYPES.includes(object.type)) {
                object.x = Math.round((Number(object.x) / px) * 100) / 100;
                object.width = Math.round((Number(object.width) / px) * 100) / 100;
            }
        });

        (copy.texts || []).forEach(text => {

            if (text.attach) {

                delete text.x;
                delete text.y;

                if (SCALED_PARTS.includes(text.attach.part)) {
                    text.attach.dx = Math.round((Number(text.attach.dx) / px) * 100) / 100;
                }
            }
        });

        return JSON.stringify(copy);
    }


    function takeSnapshot() {

        const data = window.ZGPlanIO.build();

        return { data, key: makeKey(data) };
    }


    /* =====================================================
       STACK
    ===================================================== */

    let stack = [];

    let index = -1;

    let ready = false;

    let applying = false;


    function updateButtons() {

        undoBtn.disabled = !ready || index <= 0;
        redoBtn.disabled = !ready || index >= stack.length - 1;
    }


    function resetHistory() {

        try {

            stack = [takeSnapshot()];
            index = 0;
            ready = true;

        } catch (error) {

            console.error("[history.js]", error);

            stack = [];
            index = -1;
            ready = false;
        }

        updateButtons();
    }


    /* เทียบกับขั้นปัจจุบัน ถ้าเปลี่ยน → เพิ่มขั้นใหม่ (ตัดขั้นที่ "ทำซ้ำ" ได้ทิ้ง) */
    function record() {

        if (!ready || applying) {
            return;
        }

        let snapshot;

        try {
            snapshot = takeSnapshot();
        } catch (error) {
            return;
        }

        if (stack[index] && stack[index].key === snapshot.key) {
            return;
        }

        stack = stack.slice(0, index + 1);

        stack.push(snapshot);

        if (stack.length > MAX_STEPS + 1) {
            stack.shift();
        }

        index = stack.length - 1;

        updateButtons();

        schedulePersist();
    }


    let checkTimer = null;

    function scheduleRecord(delay = CHECK_DELAY_MS) {

        clearTimeout(checkTimer);

        checkTimer = setTimeout(record, delay);
    }


    /* ทำขั้นที่ค้างอยู่ให้เสร็จทันที (ก่อนกดย้อนกลับ) */
    function flushPending() {

        if (checkTimer) {

            clearTimeout(checkTimer);

            checkTimer = null;

            record();
        }
    }


    /* =====================================================
       APPLY (ย้อน / ทำซ้ำ)
    ===================================================== */

    let toastEl = null;
    let toastTimer = null;

    function showToast(message) {

        if (!toastEl) {
            toastEl = document.createElement("div");
            toastEl.className = "zg-history-toast";
            document.body.appendChild(toastEl);
        }

        clearTimeout(toastTimer);

        toastEl.textContent = message;
        toastEl.style.display = "";

        toastTimer = setTimeout(() => { toastEl.style.display = "none"; }, 900);
    }


    function goTo(targetIndex, label) {

        if (!ready || applying || targetIndex < 0 || targetIndex >= stack.length) {
            return;
        }

        applying = true;

        /* เก็บตำแหน่งที่ดูอยู่ไว้ ไม่ให้จอกระโดดหลังย้อน */
        const keepScrollLeft =
            typeof timelineViewport !== "undefined" ? timelineViewport.scrollLeft : 0;

        const keepScrollY =
            typeof verticalScrollY !== "undefined" ? verticalScrollY : 0;

        const data = JSON.parse(JSON.stringify(stack[targetIndex].data));

        if (data.timeline) {
            data.timeline.scrollLeft = keepScrollLeft;
        }

        if (document.activeElement && document.activeElement.blur) {
            document.activeElement.blur();
        }

        try {

            window.ZGPlanIO.apply(data);

        } catch (error) {

            console.error("[history.js]", error);

            applying = false;

            return;
        }

        index = targetIndex;

        /* รอให้ตาราง + กล่อง Text วาดเสร็จ */
        requestAnimationFrame(() => requestAnimationFrame(() => {

            if (typeof setVerticalScroll === "function") {
                setVerticalScroll(keepScrollY);
            }

            requestAnimationFrame(() => {

                /* ใช้ภาพที่วาดจริงเป็นขั้นปัจจุบัน (ค่า px อาจปัดเศษต่างนิดหน่อย) */
                try {
                    stack[index] = takeSnapshot();
                } catch (error) {
                    /* ใช้ของเดิม */
                }

                applying = false;

                updateButtons();

                schedulePersist();

                showToast(label);
            });
        }));

        updateButtons();
    }


    function undo() {

        flushPending();

        goTo(index - 1, "↶ ย้อนกลับ");
    }


    function redo() {

        flushPending();

        goTo(index + 1, "↷ ทำซ้ำ");
    }


    /* =====================================================
       EVENTS
    ===================================================== */

    undoBtn.addEventListener("click", event => {

        event.stopPropagation();

        undo();
    });

    redoBtn.addEventListener("click", event => {

        event.stopPropagation();

        redo();
    });


    function isOurButton(target) {

        return target instanceof Element && !!target.closest("#undoBtn, #redoBtn");
    }


    /* การกระทำทั่วไป → เช็กว่ามีอะไรเปลี่ยนไหม */
    ["mouseup", "click", "change", "drop", "paste"].forEach(type => {

        document.addEventListener(type, event => {

            if (!isOurButton(event.target)) {
                scheduleRecord();
            }

        }, true);
    });


    /* พิมพ์ → รวมเป็นขั้นเดียวจนกว่าจะหยุดพิมพ์ */
    document.addEventListener("input", () => scheduleRecord(TYPING_DELAY_MS), true);

    document.addEventListener("focusout", () => scheduleRecord(), true);


    document.addEventListener("keydown", event => {

        const key = event.key.toLowerCase();

        const ctrl = event.ctrlKey || event.metaKey;

        const isUndo = ctrl && key === "z" && !event.shiftKey;

        const isRedo = ctrl && (key === "y" || (key === "z" && event.shiftKey));

        if (!isUndo && !isRedo) {

            /* ปุ่มลบ / Enter ฯลฯ ที่ไม่ได้อยู่ในช่องพิมพ์ ก็อาจเปลี่ยนแผน */
            if (!ctrl) {
                scheduleRecord(TYPING_DELAY_MS);
            }

            return;
        }

        /* ช่องกรอกในเมนู (input / textarea) → ให้เบราว์เซอร์ย้อนข้อความตามปกติ */
        const active = document.activeElement;

        if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) {
            return;
        }

        event.preventDefault();

        if (isUndo) {
            undo();
        } else {
            redo();
        }

    }, true);


    /* =====================================================
       เก็บประวัติไว้ใน sessionStorage → รีเฟรชแล้วยังย้อนได้
       (แยกตามแผน, หายเมื่อปิดแท็บ)
    ===================================================== */

    const SESSION_PREFIX = "zg-property-schedule-history:";

    const PLANS_STORAGE_KEY = "zg-property-schedule-plans-v1";

    let currentPlanId = null;

    let persistTimer = null;


    /* หา id แผนที่เปิดอยู่ (กรณี plans.js ยังไม่ได้ส่ง event มา) */
    function readActivePlanId() {

        try {

            const store = JSON.parse(localStorage.getItem(PLANS_STORAGE_KEY) || "null");

            return (store && store.activeId) || "default";

        } catch (error) {

            return "default";
        }
    }


    function sessionKey() {

        return SESSION_PREFIX + (currentPlanId || "default");
    }


    function persist() {

        persistTimer = null;

        if (!ready || !stack.length) {
            return;
        }

        const key = sessionKey();

        /* เก็บไม่พอ (มีรูปเยอะ) → ตัดขั้นเก่าสุดทิ้งทีละครึ่งจนพอ */
        let from = 0;

        while (true) {

            try {

                sessionStorage.setItem(key, JSON.stringify({
                    index: index - from,
                    steps: stack.slice(from).map(step => step.data)
                }));

                return;

            } catch (error) {

                if (from >= index) {

                    /* ตัดจนเหลือขั้นปัจจุบันแล้วยังไม่พอ → เก็บแค่ขั้นปัจจุบัน หรือไม่เก็บเลย */
                    try {
                        sessionStorage.setItem(key, JSON.stringify({
                            index: 0,
                            steps: [stack[index].data]
                        }));
                    } catch (finalError) {
                        try { sessionStorage.removeItem(key); } catch (ignore) { /* ไม่เป็นไร */ }
                    }

                    return;
                }

                from += Math.max(1, Math.ceil((index - from) / 2));
            }
        }
    }


    function schedulePersist() {

        clearTimeout(persistTimer);

        persistTimer = setTimeout(persist, 400);
    }


    /* เริ่มประวัติของแผนนี้: ถ้ามีประวัติเดิมที่ตรงกับหน้าจอตอนนี้ → ใช้ต่อ */
    function startForPlan(planId) {

        clearTimeout(checkTimer);

        currentPlanId = planId || readActivePlanId();

        let restored = false;

        try {

            const raw = sessionStorage.getItem(sessionKey());

            const saved = raw ? JSON.parse(raw) : null;

            if (
                saved &&
                Array.isArray(saved.steps) &&
                saved.steps.length &&
                Number.isInteger(saved.index) &&
                saved.index >= 0 &&
                saved.index < saved.steps.length
            ) {

                const current = takeSnapshot();

                /* ขั้นที่เคยอยู่ ต้องตรงกับแผนที่เปิดอยู่ตอนนี้ (กันใช้ประวัติผิดแผน/ผิดเวอร์ชัน) */
                if (makeKey(saved.steps[saved.index]) === current.key) {

                    stack = saved.steps.map(data => ({ data, key: makeKey(data) }));

                    stack[saved.index] = current;

                    index = saved.index;

                    ready = true;

                    restored = true;

                    updateButtons();
                }
            }

        } catch (error) {

            restored = false;
        }

        if (!restored) {

            resetHistory();

            schedulePersist();
        }
    }


    /* เปิด/สลับแผน (plans.js แจ้งมา) → ใช้ประวัติของแผนนั้น */
    window.addEventListener("zg-plan-applied", event => {

        if (applying) {
            return;
        }

        /* เก็บของแผนเดิมก่อนสลับ */
        if (persistTimer) {
            clearTimeout(persistTimer);
            persist();
        }

        startForPlan(event.detail && event.detail.planId);
    });


    /* ปิด/รีเฟรชหน้า → เก็บขั้นล่าสุดให้ทัน */
    window.addEventListener("pagehide", () => {

        flushPending();

        if (persistTimer) {
            clearTimeout(persistTimer);
        }

        persist();
    });


    /* =====================================================
       START
    ===================================================== */

    updateButtons();

    setTimeout(() => {

        if (!ready) {
            startForPlan(null);
        }

    }, START_DELAY_MS);


    window.ZGHistory = {
        undo,
        redo,
        record,
        reset: resetHistory,
        get size() {
            return { steps: stack.length, index };
        }
    };

})();