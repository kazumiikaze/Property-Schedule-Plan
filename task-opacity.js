"use strict";

/* =========================================================
   TASK-OPACITY.JS — ปรับความโปร่งใสของกล่องงาน (task)
   - เมนูของกล่องงาน (แท็บ "ทั่วไป" ใต้ส่วนสี) มีแถบเลื่อน "ความโปร่งใส"
     0% = ทึบเหมือนเดิม … 90% = ใสมาก (เห็นเส้นตาราง/ของด้านหลัง)
   - โปร่งใสเฉพาะ "พื้นกล่อง" → ตัวหนังสือ / รูปไอคอนในกล่องยังชัดเหมือนเดิม
   - เก็บไว้ที่ object.opacity (บันทึกไปกับแผน / Export / ชุดสำเร็จ / ↶ ย้อนกลับ ได้)
   - ไม่แก้ app.js / style.css — โหลดหลัง object-color.js
========================================================= */

(function () {

    if (typeof renderObjects !== "function" || typeof openObjectMenu !== "function") {
        console.warn("[task-opacity.js] ต้องโหลดหลัง app.js");
        return;
    }

    const MAX_CLEAR = 90;   // ใสสุด 90% (กันกล่องหายจนหาไม่เจอ)

    const L = (th, en, ja) => {
        const lang = window.ZGLang && typeof window.ZGLang.get === "function" ? window.ZGLang.get() : "th";
        return lang === "en" ? en : lang === "ja" ? ja : th;
    };

    const style = document.createElement("style");

    style.textContent = `
.zg-op-section .zg-op-row { display: flex; align-items: center; gap: 8px; }
.zg-op-section input[type="range"] { flex: 1; min-width: 0; accent-color: #3a8a4f; cursor: pointer; }
.zg-op-section .zg-op-val { min-width: 38px; text-align: right; font-weight: 700; color: #2f7442; font-size: 12px; }
.zg-op-section .zg-op-reset {
    height: 24px; padding: 0 8px; border: 1px solid #d5dad7; border-radius: 6px; background: #fff;
    color: #5f6a64; font: inherit; font-size: 11px; cursor: pointer;
}
.zg-op-section .zg-op-reset:hover { background: #eef6f0; }
.zg-op-section .zg-op-reset[disabled] { opacity: .4; cursor: default; }
.zg-op-section .zg-op-track {
    flex: 1; min-width: 0; display: flex; align-items: center; height: 22px; padding: 0 4px; border-radius: 6px;
    background-image: linear-gradient(45deg, #e6e9e7 25%, transparent 25%, transparent 75%, #e6e9e7 75%),
                      linear-gradient(45deg, #e6e9e7 25%, transparent 25%, transparent 75%, #e6e9e7 75%);
    background-size: 10px 10px; background-position: 0 0, 5px 5px;
}
body.zg-dark .zg-op-section .zg-op-reset { background: #2b3330; border-color: #3a4440; color: inherit; }
body.zg-dark .zg-op-section .zg-op-val { color: #9fd3ad; }
`;

    document.head.appendChild(style);

    function findObject(id) {
        return timelineObjects.find(object => object.id === id) || null;
    }

    /* 0 = ทึบ … 90 = ใสมาก */
    function clearOf(object) {
        const opacity = Number(object && object.opacity);
        if (!Number.isFinite(opacity) || opacity >= 1) return 0;
        return Math.round((1 - Math.max(0.1, opacity)) * 100);
    }

    function record() {
        if (window.ZGHistory && typeof window.ZGHistory.record === "function") {
            try { window.ZGHistory.record(); } catch (error) { /* ไม่เป็นไร */ }
        }
    }


    /* =====================================================
       ใส่ความโปร่งใสให้พื้นกล่อง (หลังวาด / หลังทาสีเสร็จ)
    ===================================================== */

    function parseRgb(text) {
        const match = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/.exec(text || "");
        return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
    }

    function paint(element, object) {

        const alpha = Number(object.opacity);
        const want = Number.isFinite(alpha) && alpha < 1 ? Math.max(0.1, alpha) : 1;

        /* สีเต็มของกล่อง (อ่านครั้งแรกหลังวาด ก่อนใส่ความโปร่งใส) — กล่องถูกวาดใหม่ = อ่านใหม่ */
        if (element.dataset.zgOpBase === undefined) {
            const rgb = parseRgb(getComputedStyle(element).backgroundColor);
            element.dataset.zgOpBase = rgb ? rgb.join(",") : "";
        }

        const base = element.dataset.zgOpBase;

        if (!base) return;

        element.style.backgroundColor = want < 1 ? `rgba(${base},${want})` : `rgb(${base})`;
        element.classList.toggle("zg-op-clear", want < 1);
    }

    function applyAll() {
        document.querySelectorAll("#objectLayer .canvas-object--task[data-object-id]").forEach(element => {
            const object = findObject(element.dataset.objectId);
            if (!object) return;
            if (!(Number(object.opacity) < 1) && element.dataset.zgOpBase === undefined) return;
            paint(element, object);
        });
    }

    const originalRender = renderObjects;

    renderObjects = function () {

        const result = originalRender.apply(this, arguments);

        try {
            applyAll();
        } catch (error) {
            console.error("[task-opacity.js]", error);
        }

        return result;
    };


    /* =====================================================
       เมนูของกล่องงาน
    ===================================================== */

    function sectionHtml(object) {
        const clear = clearOf(object);
        return `
            <label class="object-menu-label">${L("ความโปร่งใส", "Transparency", "透明度")}</label>
            <div class="zg-op-row">
                <div class="zg-op-track"><input type="range" min="0" max="${MAX_CLEAR}" step="5" value="${clear}" data-op-range></div>
                <span class="zg-op-val" data-op-val>${clear}%</span>
                <button type="button" class="zg-op-reset" data-op-reset ${clear ? "" : "disabled"} title="${L("ทึบเหมือนเดิม", "Make solid again", "不透明に戻す")}">↺</button>
            </div>`;
    }

    function setClear(object, clear) {
        const value = Math.max(0, Math.min(MAX_CLEAR, Math.round(clear)));
        if (value <= 0) delete object.opacity;
        else object.opacity = Number((1 - value / 100).toFixed(2));
    }

    function syncSection(section, object) {
        const clear = clearOf(object);
        const range = section.querySelector("[data-op-range]");
        if (range && Number(range.value) !== clear) range.value = String(clear);
        section.querySelector("[data-op-val]").textContent = `${clear}%`;
        section.querySelector("[data-op-reset]").disabled = !clear;
    }

    function enhanceMenu(menu, object) {

        if (!menu || !object || object.type !== "task" || menu.querySelector(".zg-op-section")) return;

        const section = document.createElement("div");
        section.className = "object-menu-section zg-op-section";
        section.innerHTML = sectionHtml(object);

        /* วางต่อจากส่วน "สี" */
        const color = menu.querySelector("#objMenuColorInput");
        const colorSection = color ? color.closest(".object-menu-section") : null;

        if (colorSection && colorSection.parentNode === menu) {
            menu.insertBefore(section, colorSection.nextSibling);
        } else {
            const duplicate = menu.querySelector("#objMenuDuplicateBtn");
            const anchor = duplicate ? duplicate.closest(".object-menu-section") : null;
            if (anchor && anchor.parentNode === menu) menu.insertBefore(section, anchor);
            else menu.appendChild(section);
        }

        const id = object.id;
        let changed = false;

        section.addEventListener("input", event => {
            if (!event.target.matches("[data-op-range]")) return;
            event.stopPropagation();
            const target = findObject(id);
            if (!target) return;
            setClear(target, Number(event.target.value));
            changed = true;
            applyAll();
            syncSection(section, target);
        });

        section.addEventListener("change", event => {
            if (!event.target.matches("[data-op-range]")) return;
            event.stopPropagation();
            if (changed) { changed = false; record(); }
        });

        section.addEventListener("click", event => {
            const reset = event.target.closest("[data-op-reset]");
            event.stopPropagation();
            if (!reset) return;
            const target = findObject(id);
            if (!target) return;
            setClear(target, 0);
            applyAll();
            syncSection(section, target);
            record();
        });

        ["mousedown", "pointerdown"].forEach(type => section.addEventListener(type, event => event.stopPropagation()));
    }

    /*
        คลิกกล่องงาน → object-precise.js หน่วงเปิดเมนูไว้ครู่หนึ่ง (รอดูว่าเป็นดับเบิลคลิกไหม)
        เมนูจึงโผล่ทีหลัง → จำ object ที่ขอเปิดไว้ แล้วเติมส่วนนี้ตอนเมนูถูกใส่ลงหน้าเว็บ
    */
    let requested = null;

    function currentMenu() {
        return (typeof activeObjectMenu !== "undefined" && activeObjectMenu) ||
            document.querySelector("body > .object-menu:last-of-type");
    }

    const originalOpenObjectMenu = openObjectMenu;

    openObjectMenu = function (object) {

        requested = object && object.type === "task" ? object : null;

        const result = originalOpenObjectMenu.apply(this, arguments);

        try {
            const menu = currentMenu();
            if (menu && menu.isConnected && requested) enhanceMenu(menu, object);
        } catch (error) {
            console.error("[task-opacity.js]", error);
        }

        return result;
    };

    new MutationObserver(records => {

        if (!requested) return;

        records.forEach(record => record.addedNodes.forEach(node => {
            if (node instanceof Element && node.classList.contains("object-menu") && requested) {
                try {
                    /* เมนูนี้ต้องเป็นของกล่องงานที่ขอเปิด (มีส่วนสีของกล่องงาน) */
                    if (node.querySelector("#objMenuColorInput")) enhanceMenu(node, findObject(requested.id) || requested);
                } catch (error) {
                    console.error("[task-opacity.js]", error);
                }
            }
        }));

    }).observe(document.body, { childList: true });

    applyAll();

    window.ZGTaskOpacity = { apply: applyAll };

})();
