"use strict";

/* =========================================================
   PANEL-DRAG.JS — หน้าต่างตั้งค่าทุกบาน ลากย้ายได้อิสระ + ไม่ตกขอบจอ
   - ทุกเมนู / แผง / หน้าต่างตั้งค่า (เมนูกล่องงาน · สี · หมวดหมู่ · แถว · ข้อความ · รูป · บันทึก ·
     ชุดสำเร็จ · แปะรูป · ซ่อน/รวบวัน · เทมเพลต · หน้าต่างแก้ข้อความ / วันที่ ฯลฯ)
       → แถบจับ ⋮⋮ ด้านบน: กดค้างแล้วลากไปวางตรงไหนก็ได้ (ลากที่ขอบว่างของหน้าต่างก็ได้)
       → เปิดขึ้นมาล้นจอ → ดันกลับเข้าจอเอง · สูงกว่าจอ → เลื่อนดูในหน้าต่างได้
       → ดับเบิลคลิกแถบจับ = กลับตำแหน่งเดิม
   - ไม่แก้ไฟล์อื่น — ทำงานกับหน้าต่างที่เปิดอยู่บนจอ
========================================================= */

(function () {

    if (window.ZG_PREVIEW_MODE) return;

    const PANELS = [
        ".object-menu", ".category-menu", ".row-action-menu", ".toolbar-more-menu", ".role-manager-panel",
        ".zg-row-style-menu", ".zg-note-menu", ".zg-img-menu", ".zg-fold-panel", ".zg-fold-pop",
        ".zg-hd-pop", ".zg-logo-pop", ".zg-tpl-menu", ".zg-xpa-menu", ".zg-pre", ".zg-stk",
        ".new-category-dialog", ".zg-crop-dialog", ".zg-plan-overlay > *", ".zg-tpl-overlay > *"
    ].join(", ");

    const EDGE = 8;

    const style = document.createElement("style");
    style.textContent = `
.zg-pd-grip {
    display: flex; align-items: center; justify-content: center; gap: 6px;
    height: 14px; margin: -4px -4px 4px; border-radius: 7px;
    color: #9aa59f; font-size: 10px; letter-spacing: 1px; line-height: 1;
    cursor: grab; user-select: none; touch-action: none; flex: none;
}
.zg-pd-grip::before {
    content: ""; width: 34px; height: 4px; border-radius: 3px; background: #cfd8d3;
    transition: background-color .15s ease, width .15s ease;
}
.zg-pd-grip:hover::before { background: #3a8a4f; width: 44px; }
.zg-pd-moving, .zg-pd-moving * { cursor: grabbing !important; user-select: none !important; }
.zg-pd-panel.zg-pd-tall { overflow-y: auto !important; overscroll-behavior: contain; }
body.zg-dark .zg-pd-grip::before { background: #4a5752; }
body.zg-exporting .zg-pd-grip { display: none !important; }
`;
    document.head.appendChild(style);

    function visible(el) {
        if (!el.isConnected) return false;
        const cs = getComputedStyle(el);
        if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0) return false;
        const r = el.getBoundingClientRect();
        return r.width > 40 && r.height > 30;
    }

    /* ย้ายด้วย position: fixed (ใช้ได้ทุกแบบ ไม่ว่าเดิมวางแบบไหน) */
    function placeAt(el, left, top) {
        const r = el.getBoundingClientRect();
        const maxLeft = Math.max(EDGE, window.innerWidth - r.width - EDGE);
        const maxTop = Math.max(EDGE, window.innerHeight - Math.min(r.height, window.innerHeight - EDGE * 2) - EDGE);
        el.style.setProperty("position", "fixed", "important");
        el.style.setProperty("left", `${Math.round(Math.min(maxLeft, Math.max(EDGE, left)))}px`, "important");
        el.style.setProperty("top", `${Math.round(Math.min(maxTop, Math.max(EDGE, top)))}px`, "important");
        el.style.setProperty("right", "auto", "important");
        el.style.setProperty("bottom", "auto", "important");
        el.style.setProperty("margin", "0", "important");
        el.style.setProperty("transform", "none", "important");
    }

    function release(el) {
        ["position", "left", "top", "right", "bottom", "margin", "transform"].forEach(prop => el.style.removeProperty(prop));
        el.dataset.zgPdMoved = "";
    }

    /* สูงกว่าจอ → เลื่อนในหน้าต่าง · ล้นขอบ → ดันกลับเข้าจอ */
    function keepInside(el) {
        const r = el.getBoundingClientRect();
        const tooTall = r.height > window.innerHeight - EDGE * 2;
        el.classList.toggle("zg-pd-tall", tooTall);
        if (tooTall) el.style.setProperty("max-height", `${window.innerHeight - EDGE * 2}px`, "important");
        const after = el.getBoundingClientRect();
        const off = after.left < EDGE - 1 || after.top < EDGE - 1 ||
            after.right > window.innerWidth - EDGE + 1 || after.bottom > window.innerHeight - EDGE + 1;
        if (off || el.dataset.zgPdMoved === "1") placeAt(el, after.left, after.top);
    }

    function addGrip(el) {
        if (el.querySelector(":scope > .zg-pd-grip")) return;
        const grip = document.createElement("div");
        grip.className = "zg-pd-grip";
        grip.title = "ลากเพื่อย้ายหน้าต่าง · ดับเบิลคลิก = กลับที่เดิม";
        grip.setAttribute("aria-hidden", "true");
        el.insertBefore(grip, el.firstChild);
    }

    const seen = new WeakMap();   // panel → เปิดรอบไหนแล้ว

    (function scan() {
        document.querySelectorAll(PANELS).forEach(el => {
            if (el.classList.contains("zg-pd-grip")) return;
            if (!visible(el)) {
                /* ปิดแล้ว → คืนตำแหน่งให้ระบบเดิม (เปิดครั้งหน้าไปขึ้นข้างของที่เลือกตามปกติ) */
                if (seen.has(el)) {
                    seen.delete(el);
                    release(el);
                    el.classList.remove("zg-pd-tall");
                    el.style.removeProperty("max-height");
                }
                return;
            }
            el.classList.add("zg-pd-panel");
            addGrip(el);
            /* เพิ่งเปิด → เช็กไม่ให้ตกขอบ */
            if (!seen.has(el)) {
                seen.set(el, true);
                keepInside(el);
            }
        });
        requestAnimationFrame(scan);
    })();


    /* ---------- ลาก ---------- */

    let drag = null;

    function grabTarget(event) {
        if (event.button !== 0 || !(event.target instanceof Element)) return null;
        const grip = event.target.closest(".zg-pd-grip");
        if (grip) return grip.parentElement;
        /* ลากที่พื้นว่างของหน้าต่าง (ไม่ใช่ปุ่ม / ช่องพิมพ์ / รายการ) */
        const panel = event.target.closest(".zg-pd-panel");
        if (panel && event.target === panel) return panel;
        return null;
    }

    window.addEventListener("pointerdown", event => {
        const panel = grabTarget(event);
        if (!panel) return;
        event.preventDefault();
        event.stopPropagation();
        const r = panel.getBoundingClientRect();
        drag = { panel, dx: event.clientX - r.left, dy: event.clientY - r.top, moved: false, id: event.pointerId };
        try { (event.target.closest(".zg-pd-grip") || panel).setPointerCapture(event.pointerId); } catch (error) { /* ไม่เป็นไร */ }
    }, true);

    /* ไม่ให้ระบบอื่นเข้าใจว่ากดนอกหน้าต่าง (แล้วปิดหน้าต่าง) */
    ["mousedown", "click"].forEach(type => window.addEventListener(type, event => {
        if (event.target instanceof Element && event.target.closest(".zg-pd-grip")) event.stopPropagation();
    }, true));

    window.addEventListener("pointermove", event => {
        if (!drag || event.pointerId !== drag.id) return;
        event.preventDefault();
        if (!drag.moved) {
            drag.moved = true;
            document.body.classList.add("zg-pd-moving");
        }
        placeAt(drag.panel, event.clientX - drag.dx, event.clientY - drag.dy);
        drag.panel.dataset.zgPdMoved = "1";
    }, true);

    function endDrag(event) {
        if (!drag || (event && event.pointerId !== drag.id)) return;
        document.body.classList.remove("zg-pd-moving");
        drag = null;
    }

    window.addEventListener("pointerup", endDrag, true);
    window.addEventListener("pointercancel", endDrag, true);

    window.addEventListener("dblclick", event => {
        const grip = event.target instanceof Element ? event.target.closest(".zg-pd-grip") : null;
        if (!grip) return;
        event.preventDefault();
        event.stopPropagation();
        const panel = grip.parentElement;
        release(panel);
        keepInside(panel);
    }, true);

    /* หน้าจอเปลี่ยนขนาด → หน้าต่างที่เปิดอยู่ยังอยู่ในจอ */
    window.addEventListener("resize", () => {
        document.querySelectorAll(".zg-pd-panel").forEach(el => { if (visible(el)) keepInside(el); });
    });

    window.ZGPanelDrag = { keepInside };

})();
