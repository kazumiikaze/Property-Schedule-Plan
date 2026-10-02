"use strict";

/* =========================================================
   OBJECT-COLOR.JS — สีของแต่ละ object แยกกัน
   เดิม: เลือกสีในเมนูกล่องงาน = เปลี่ยนสี "บทบาท (Role)"
         → ทุกกล่องที่ใช้บทบาทเดียวกันเปลี่ยนตามหมด
   ใหม่: เลือกสีในเมนู = เปลี่ยนเฉพาะ object นั้น (object.color)
         - กล่องงาน / เส้นวันที่ / เส้นแนวนอน
         - เปลี่ยนบทบาท หรือกด "ใช้สีตามบทบาท" → กลับไปใช้สีของบทบาท
         - การแก้สีใน "⚙ บทบาท" ยังเปลี่ยนทุก object ที่ไม่ได้ตั้งสีเอง
         - ทำสำเนา / บันทึกแผน / Export-Import / ย้อนกลับ ใช้ได้ครบ

   ไม่แก้ app.js — โหลดหลัง app.js (ก่อน lang.js)
========================================================= */

(function () {

    if (typeof renderObjects !== "function" || typeof openObjectMenu !== "function") {

        console.error("[object-color.js] ไม่พบฟังก์ชันของ app.js (ต้องโหลดหลัง app.js)");

        return;
    }

    const COLOR_TYPES = ["task", "hline", "dateline"];

    const MENU_FLAG = "zgObjectColor";


    function isHex(value) {
        return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
    }

    function findObject(id) {
        return timelineObjects.find(object => object.id === id) || null;
    }

    function effectiveColor(object) {

        if (isHex(object.color)) {
            return object.color;
        }

        const role = object.roleId ? getRole(object.roleId) : null;

        return role ? role.color : "#888888";
    }


    /* =====================================================
       RENDER — ทาสีทับหลัง app.js วาด object เสร็จ
    ===================================================== */

    function paintObject(object) {

        if (!COLOR_TYPES.includes(object.type) || !isHex(object.color)) {
            return;
        }

        const color = object.color;

        document
            .querySelectorAll(`.canvas-object[data-object-id="${CSS.escape(object.id)}"]`)
            .forEach(element => {

                if (object.type === "task") {

                    element.style.background = color;

                } else if (object.type === "hline") {

                    element.style.borderTopColor = color;

                } else if (object.type === "dateline") {

                    element.style.borderColor = color;

                    const caret = element.querySelector(".dateline-chip-caret");

                    if (caret) {
                        caret.style.borderBottomColor = color;
                    }

                    const guide = element.querySelector(".canvas-object-vline");

                    if (guide) {
                        guide.style.borderColor = color;
                    }
                }

                /* เส้นแนวตั้งใต้กล่องงาน */
                if (object.type === "task") {

                    const guide = element.querySelector(".canvas-object-vline");

                    if (guide) {
                        guide.style.borderColor = color;
                    }
                }
            });
    }

    function paintAll() {
        timelineObjects.forEach(paintObject);
    }


    const originalRenderObjects = renderObjects;

    renderObjects = function () {

        const result = originalRenderObjects.apply(this, arguments);

        try {
            paintAll();
        } catch (error) {
            console.error("[object-color.js]", error);
        }

        return result;
    };


    /* =====================================================
       MENU — เมนูของ object (สร้างโดย openObjectMenu ใน app.js)
    ===================================================== */

    const style = document.createElement("style");

    style.textContent = `
.zg-objcolor-reset {
    margin-top: 6px;
    width: 100%;
    height: 26px;
    border-radius: 6px;
    border: 1px solid #dde3e0;
    background: #ffffff;
    cursor: pointer;
    font-family: inherit;
    font-size: 11px;
}
.zg-objcolor-reset:hover { background: #f3f6f4; }
.zg-objcolor-reset[disabled] { opacity: .45; cursor: default; }
.zg-objcolor-hint { margin-top: 4px; font-size: 10px; color: #7a827e; }
body.zg-dark .zg-objcolor-reset { background: #2b3330; border-color: #3a4440; color: inherit; }
body.zg-dark .zg-objcolor-hint { color: #a5b0aa; }
`;

    document.head.appendChild(style);


    function syncMenu(menu, object) {

        const color = effectiveColor(object).toLowerCase();

        menu.querySelectorAll(".object-menu-swatch").forEach(swatch => {
            swatch.classList.toggle("active", (swatch.dataset.color || "").toLowerCase() === color);
        });

        const input = menu.querySelector("#objMenuColorInput");

        if (input) {
            input.value = color;
        }

        const reset = menu.querySelector(".zg-objcolor-reset");

        if (reset) {
            reset.disabled = !isHex(object.color);
        }
    }


    function enhanceMenu(menu, object) {

        if (!menu || !COLOR_TYPES.includes(object.type)) {
            return;
        }

        const swatches = menu.querySelector("#objMenuSwatches");

        if (!swatches) {
            return;
        }

        menu.dataset[MENU_FLAG] = object.id;

        const section = swatches.closest(".object-menu-section") || swatches.parentNode;

        const reset = document.createElement("button");

        reset.type = "button";
        reset.className = "zg-objcolor-reset";
        reset.textContent = "↺ ใช้สีตามบทบาท";

        const hint = document.createElement("div");

        hint.className = "zg-objcolor-hint";
        hint.textContent = "สีที่เลือกจะเปลี่ยนเฉพาะ object นี้";

        section.appendChild(reset);
        section.appendChild(hint);

        reset.addEventListener("click", event => {

            event.stopPropagation();

            delete object.color;

            renderObjects();
            syncMenu(menu, object);
        });

        syncMenu(menu, object);
    }


    const originalOpenObjectMenu = openObjectMenu;

    openObjectMenu = function (object) {

        const result = originalOpenObjectMenu.apply(this, arguments);

        try {

            const menu =
                (typeof activeObjectMenu !== "undefined" && activeObjectMenu) ||
                document.querySelector("body > .object-menu:last-of-type");

            enhanceMenu(menu, object);

        } catch (error) {

            console.error("[object-color.js]", error);
        }

        return result;
    };


    function menuObject(target) {

        const menu = target && target.closest && target.closest(".object-menu");

        if (!menu || !menu.dataset[MENU_FLAG]) {
            return null;
        }

        const object = findObject(menu.dataset[MENU_FLAG]);

        return object ? { menu, object } : null;
    }


    /* capture: ทำงานก่อน handler ของ app.js แล้วหยุดไม่ให้ไปเปลี่ยนสีบทบาท */

    document.addEventListener("click", event => {

        const swatch = event.target.closest && event.target.closest(".object-menu-swatch");

        if (!swatch) {
            return;
        }

        const found = menuObject(swatch);

        if (!found) {
            return;
        }

        event.stopImmediatePropagation();
        event.stopPropagation();

        found.object.color = swatch.dataset.color;

        renderObjects();
        syncMenu(found.menu, found.object);

    }, true);


    document.addEventListener("input", event => {

        if (!event.target || event.target.id !== "objMenuColorInput") {
            return;
        }

        const found = menuObject(event.target);

        if (!found) {
            return;
        }

        event.stopImmediatePropagation();
        event.stopPropagation();

        found.object.color = event.target.value;

        renderObjects();
        syncMenu(found.menu, found.object);

    }, true);


    /* เปลี่ยนบทบาท → ใช้สีของบทบาทใหม่ (ล้างสีที่ตั้งเอง) แล้วให้ app.js ทำงานต่อ */
    document.addEventListener("change", event => {

        if (!event.target || event.target.id !== "objMenuRoleSelect") {
            return;
        }

        const found = menuObject(event.target);

        if (found) {
            delete found.object.color;
        }

    }, true);


    /* วาดทับสีครั้งแรก (กรณีแผนโหลดมาก่อนไฟล์นี้) */
    window.addEventListener("zg-plan-applied", () => requestAnimationFrame(paintAll));

    requestAnimationFrame(paintAll);


    window.ZGObjectColor = {
        refresh: paintAll,
        effectiveColor
    };

})();