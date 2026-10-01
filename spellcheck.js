"use strict";

/* =========================================================
   SPELLCHECK.JS — ปุ่ม 🔎 ตรวจคำผิด (เปิด/ปิด)

   ใช้ตัวตรวจคำผิดของเบราว์เซอร์ (ขีดเส้นหยักสีแดงใต้คำที่ผิด)

   ปัญหาของเบราว์เซอร์ (Chrome / Edge):
     ช่องที่แก้ไขได้จะถูกตรวจก็ต่อเมื่อ "เคยถูกโฟกัส" และต้องค้างโฟกัส
     ไว้ชั่วครู่ให้ตัวตรวจทำงาน — แค่เปิด spellcheck ยังไม่ขีดเส้น
   วิธีแก้:
     ตอนเปิด (และตอนมีช่องใหม่ถูกวาด) จะโฟกัสทีละช่องแบบไม่เลื่อนจอ
     ค้างไว้สั้น ๆ ให้เบราว์เซอร์ตรวจ แล้วไปช่องถัดไป ซ่อนกรอบโฟกัส
     ระหว่างนั้นไม่ให้กะพริบ — ถ้าผู้ใช้คลิก/พิมพ์ระหว่างนั้น จะหยุดทันที

   ดักคลิกปุ่มก่อน app.js (ไม่แก้ app.js)
========================================================= */

(function () {

    const button =
        document.getElementById("toolbarSpellcheckBtn");

    if (!button) {

        console.error("[spellcheck.js] ไม่พบปุ่ม #toolbarSpellcheckBtn");

        return;
    }


    const STORAGE_KEY = "zg-property-schedule-spellcheck";

    const EDITABLE_SELECTOR =
        '[contenteditable="true"], textarea, input[type="text"], input:not([type])';

    const FOCUS_HOLD_MS = 40;       // เวลาค้างโฟกัสต่อช่อง ให้เบราว์เซอร์ตรวจ

    const NEW_ITEMS_DELAY_MS = 700; // รอช่องใหม่วาดเสร็จก่อนค่อยตรวจ

    const MAX_PER_RUN = 300;


    let enabled = false;

    try {
        enabled = localStorage.getItem(STORAGE_KEY) === "on";
    } catch (error) {
        /* ใช้ค่าเริ่มต้น = ปิด */
    }


    /* ซ่อนกรอบ/พื้นหลังโฟกัสระหว่างไล่ตรวจ จะได้ไม่กะพริบ */
    const style =
        document.createElement("style");

    style.textContent = `
body.zg-spell-refreshing [contenteditable="true"]:focus {
    background: transparent !important;
    box-shadow: none !important;
    outline: none !important;
}
body.zg-spell-refreshing { caret-color: transparent; }
`;

    document.head.appendChild(style);


    /* =====================================================
       HELPERS
    ===================================================== */

    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));


    function isEditable(element) {

        return !!(
            element &&
            element instanceof Element &&
            element.matches(EDITABLE_SELECTOR)
        );
    }


    function applyTo(root) {

        if (!(root instanceof Element)) {
            return;
        }

        if (root.matches(EDITABLE_SELECTOR)) {
            root.spellcheck = enabled;
        }

        root.querySelectorAll(EDITABLE_SELECTOR).forEach(element => {
            element.spellcheck = enabled;
        });
    }


    function isVisible(element) {

        if (!element.isConnected || element.offsetParent === null) {
            return false;
        }

        const rect = element.getBoundingClientRect();

        return rect.width > 0 && rect.height > 0;
    }


    /* =====================================================
       REFRESH (โฟกัสทีละช่องให้เบราว์เซอร์ตรวจ)
    ===================================================== */

    let running = false;

    let cancelled = false;

    const pending = new Set();


    function cancelRefresh() {

        if (running) {
            cancelled = true;
        }
    }


    async function refresh(elements) {

        if (!enabled) {
            return;
        }

        elements
            .filter(element => element.matches('[contenteditable="true"]'))
            .forEach(element => pending.add(element));

        if (running) {
            return;
        }

        running = true;

        cancelled = false;

        const previous =
            document.activeElement !== document.body
                ? document.activeElement
                : null;

        document.body.classList.add("zg-spell-refreshing");

        try {

            let count = 0;

            while (pending.size && !cancelled && enabled && count < MAX_PER_RUN) {

                const element = pending.values().next().value;

                pending.delete(element);

                if (!isVisible(element) || element === previous) {
                    continue;
                }

                try {
                    element.focus({ preventScroll: true });
                } catch (error) {
                    continue;
                }

                count += 1;

                await sleep(FOCUS_HOLD_MS);
            }

        } finally {

            document.body.classList.remove("zg-spell-refreshing");

            /* ผู้ใช้ไม่ได้ขัดจังหวะ → คืนโฟกัสเดิม / ปล่อยโฟกัส */
            if (!cancelled) {

                if (previous && previous.isConnected && typeof previous.focus === "function") {

                    previous.focus({ preventScroll: true });

                } else if (isEditable(document.activeElement)) {

                    document.activeElement.blur();
                }
            }

            running = false;

            cancelled = false;
        }
    }


    function refreshAll() {

        refresh(Array.from(document.querySelectorAll('[contenteditable="true"]')));
    }


    /* ผู้ใช้คลิก/พิมพ์ระหว่างไล่ตรวจ → หยุด ไม่แย่งโฟกัส */
    document.addEventListener("mousedown", cancelRefresh, true);
    document.addEventListener("keydown", cancelRefresh, true);


    /* =====================================================
       TOGGLE
    ===================================================== */

    function updateButton() {

        button.classList.toggle("active", enabled);

        button.setAttribute("aria-pressed", String(enabled));

        button.title =
            enabled
                ? "ตรวจคำผิด: เปิดอยู่ (กดเพื่อปิด)"
                : "ตรวจคำผิด: ปิดอยู่ (กดเพื่อเปิด)";
    }


    function setEnabled(value) {

        enabled = !!value;

        try {
            localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
        } catch (error) {
            /* เก็บไม่ได้ก็ยังใช้ได้ในหน้านี้ */
        }

        applyTo(document.body);

        updateButton();

        if (enabled) {

            /* รอให้คลิกปุ่มจบก่อน (ไม่งั้น mousedown/click จะยกเลิกทันที) */
            setTimeout(refreshAll, 50);

        } else {

            pending.clear();

            cancelRefresh();
        }
    }


    /* ดักก่อน app.js (ไม่ให้ app.js สลับค่าซ้อนอีกรอบ) */
    document.addEventListener("click", event => {

        if (
            !(event.target instanceof Element) ||
            !event.target.closest("#toolbarSpellcheckBtn")
        ) {
            return;
        }

        event.stopPropagation();
        event.preventDefault();

        setEnabled(!enabled);

    }, true);


    /* =====================================================
       ช่องใหม่ที่ถูกวาดทีหลัง (ซูม / เพิ่มแถว / กล่อง Text ใหม่ ฯลฯ)
    ===================================================== */

    let newItemsTimer = null;

    const newItems = new Set();


    function scheduleNewItems() {

        clearTimeout(newItemsTimer);

        newItemsTimer = setTimeout(() => {

            /* ผู้ใช้กำลังพิมพ์อยู่ → รอจนเลิกพิมพ์ก่อน */
            if (isEditable(document.activeElement) && !running) {

                scheduleNewItems();

                return;
            }

            const list = Array.from(newItems);

            newItems.clear();

            refresh(list);

        }, NEW_ITEMS_DELAY_MS);
    }


    const observer =
        new MutationObserver(records => {

            let found = false;

            records.forEach(record => {

                const roots =
                    record.type === "attributes"
                        ? [record.target]
                        : Array.from(record.addedNodes);

                roots.forEach(root => {

                    if (!(root instanceof Element)) {
                        return;
                    }

                    applyTo(root);

                    if (!enabled) {
                        return;
                    }

                    if (root.matches('[contenteditable="true"]')) {
                        newItems.add(root);
                        found = true;
                    }

                    root.querySelectorAll('[contenteditable="true"]').forEach(element => {
                        newItems.add(element);
                        found = true;
                    });
                });
            });

            if (found) {
                scheduleNewItems();
            }
        });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["contenteditable"]
    });


    /* =====================================================
       START
    ===================================================== */

    applyTo(document.body);

    updateButton();

    if (enabled) {

        /* รอให้ตาราง/กล่อง Text/แผนจากเบราว์เซอร์ วาดเสร็จก่อน */
        setTimeout(refreshAll, 1200);
    }


    window.ZGSpellcheck = {

        get() {
            return enabled;
        },

        set: setEnabled,

        refresh: refreshAll
    };

})();