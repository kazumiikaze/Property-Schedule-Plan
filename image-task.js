"use strict";

/* =========================================================
   IMAGE-TASK.JS — รูปภาพในกล่องงาน (task)

   ใส่รูปได้ 4 วิธี
     1) เมนูของกล่องงาน → ส่วน "รูปภาพในกล่อง" → 🖼 ใส่รูป
     2) ลากไฟล์รูปมาวางบนกล่องงาน
     3) เปิดเมนูกล่องงานค้างไว้ แล้วกด Ctrl+V
     4) ปุ่ม 🖼 รูปภาพ ▾ → "ใส่รูปในกล่องงาน…" แล้วคลิกกล่องที่ต้องการ
   แสดงได้ 3 แบบ
     - ไอคอน     : รูปเล็กหน้าข้อความ
     - เต็มกล่อง : รูปเต็มกล่อง (ตัดขอบให้พอดี)
     - พอดีกล่อง : เห็นรูปครบทั้งรูป
   รูปเก็บใน object (object.image / object.imageMode)
   → บันทึกแผน, Export/Import, ทำสำเนา, ย้อนกลับ ได้ครบ

   ไม่แก้ app.js — โหลดหลัง image-board.js
========================================================= */

(function () {

    const Z = window.ZGImage;

    if (!Z || typeof renderObjects !== "function" || typeof openObjectMenu !== "function") {

        console.error("[image-task.js] ต้องโหลดหลัง app.js และ image-board.js");

        return;
    }

    const MODES = [
        { key: "icon", label: "ไอคอน" },
        { key: "cover", label: "เต็มกล่อง" },
        { key: "contain", label: "พอดีกล่อง" }
    ];

    const MENU_FLAG = "zgTimgId";

    function findObject(id) {
        return timelineObjects.find(object => object.id === id) || null;
    }

    function hasImage(object) {
        return Boolean(object && typeof object.image === "string" && object.image.startsWith("data:image/"));
    }

    function modeOf(object) {
        return MODES.some(mode => mode.key === object.imageMode) ? object.imageMode : "icon";
    }


    /* =====================================================
       STYLE
    ===================================================== */

    const style = document.createElement("style");

    style.textContent = `
.canvas-object--task.zg-has-timg .canvas-object-label-wrap { position: relative; z-index: 1; }
.zg-timg-icon {
    flex: 0 0 auto;
    align-self: center;
    height: min(calc(100% - 4px), 56px);
    min-height: 14px;
    max-width: 45%;
    aspect-ratio: auto;
    object-fit: contain;
    border-radius: 4px;
    pointer-events: none;
    -webkit-user-drag: none;
}
.zg-timg-bg {
    position: absolute;
    inset: 0;
    z-index: 0;
    border-radius: inherit;
    background-repeat: no-repeat;
    background-position: center;
    pointer-events: none;
}
.zg-timg-bg--cover { background-size: cover; }
.zg-timg-bg--contain { background-size: contain; }
.canvas-object--task.zg-timg-mode-cover .canvas-object-label,
.canvas-object--task.zg-timg-mode-contain .canvas-object-label {
    padding: 1px 6px;
    border-radius: 4px;
    background: rgba(255, 255, 255, .82);
    color: #1e2924 !important;
}
.canvas-object--task.zg-timg-drop { outline: 3px dashed #3a8a4f; outline-offset: 2px; }

body.zg-timg-picking .canvas-object--task { cursor: copy !important; }
body.zg-timg-picking .canvas-object--task:hover { outline: 3px solid #3a8a4f; outline-offset: 2px; }

.zg-timg-section .zg-timg-row { display: flex; align-items: center; gap: 6px; }
.zg-timg-thumb {
    width: 44px;
    height: 32px;
    flex: 0 0 auto;
    border: 1px dashed #c9d1cd;
    border-radius: 6px;
    background: #f6f8f7 center / contain no-repeat;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #a0a8a4;
    font-size: 14px;
}
.zg-timg-thumb.has-img { border-style: solid; color: transparent; }
.zg-timg-btn {
    height: 28px;
    padding: 0 9px;
    border: 1px solid #dde3e0;
    border-radius: 6px;
    background: #ffffff;
    font-family: inherit;
    font-size: 11.5px;
    cursor: pointer;
    white-space: nowrap;
}
.zg-timg-btn:hover { background: #eef6f0; }
.zg-timg-btn--danger:hover { background: #fdecea; color: #c0392b; }
.zg-timg-modes { display: flex; gap: 4px; margin-top: 6px; }
.zg-timg-modes button {
    flex: 1;
    height: 26px;
    border: 1px solid #dde3e0;
    border-radius: 6px;
    background: #ffffff;
    font-family: inherit;
    font-size: 11px;
    cursor: pointer;
}
.zg-timg-modes button.is-on { border-color: #3a8a4f; background: #e9f5ec; color: #1f6b38; font-weight: 700; }
.zg-timg-hint { margin-top: 5px; color: #7a827e; font-size: 10px; line-height: 1.4; }

body.zg-dark .zg-timg-btn,
body.zg-dark .zg-timg-modes button { background: #2b3330; border-color: #3a4440; color: inherit; }
body.zg-dark .zg-timg-modes button.is-on { background: #26372d; color: #9fd3ad; }
body.zg-dark .zg-timg-thumb { background-color: #2b3330; border-color: #3a4440; }

body.zg-exporting .canvas-object--task.zg-timg-drop { outline: none !important; }
`;

    document.head.appendChild(style);


    /* =====================================================
       RENDER — แต่งกล่องหลัง app.js วาดเสร็จ
    ===================================================== */

    function decorate(object) {

        if (object.type !== "task" || !hasImage(object)) return;

        document
            .querySelectorAll(`#objectLayer .canvas-object[data-object-id="${CSS.escape(object.id)}"]`)
            .forEach(element => {

                const mode = modeOf(object);

                element.classList.add("zg-has-timg", `zg-timg-mode-${mode}`);

                if (mode === "icon") {

                    const wrap = element.querySelector(".canvas-object-label-wrap");

                    if (!wrap) return;

                    const img = document.createElement("img");

                    img.className = "zg-timg-icon";
                    img.src = object.image;
                    img.alt = "";
                    img.draggable = false;

                    wrap.insertBefore(img, wrap.firstChild);

                } else {

                    const bg = document.createElement("div");

                    bg.className = `zg-timg-bg zg-timg-bg--${mode}`;
                    bg.style.backgroundImage = `url("${object.image}")`;

                    element.insertBefore(bg, element.firstChild);
                }
            });
    }

    const originalRender = renderObjects;

    renderObjects = function () {

        const result = originalRender.apply(this, arguments);

        try {
            timelineObjects.forEach(decorate);
        } catch (error) {
            console.error("[image-task.js]", error);
        }

        return result;
    };


    /* =====================================================
       SET / REMOVE
    ===================================================== */

    async function setImageFromFile(object, file, options = {}) {

        try {

            const result = await Z.processImage(file, { maxSide: options.cover ? 900 : 480, keepBelowChars: 90000 });

            object.image = result.src;

            if (!object.imageMode) {

                /* กล่องสูงพอ → เต็มกล่อง, กล่องเตี้ย → ไอคอน */
                object.imageMode = Number(object.height) >= 70 ? "cover" : "icon";
            }

            renderObjects();
            refreshMenu(object);
            Z.recordHistory();

            Z.toast("ใส่รูปในกล่องงานแล้ว");

        } catch (error) {

            Z.toast(error.message, true);
        }
    }

    function removeImage(object) {

        delete object.image;
        delete object.imageMode;

        renderObjects();
        refreshMenu(object);
        Z.recordHistory();
    }


    /* =====================================================
       MENU — ส่วน "รูปภาพในกล่อง" ในเมนูของกล่องงาน
    ===================================================== */

    function currentMenu() {

        return (
            (typeof activeObjectMenu !== "undefined" && activeObjectMenu) ||
            document.querySelector("body > .object-menu:last-of-type")
        );
    }

    function sectionHtml(object) {

        const image = hasImage(object);

        const mode = modeOf(object);

        return `
            <label class="object-menu-label">รูปภาพในกล่อง</label>
            <div class="zg-timg-row">
                <span class="zg-timg-thumb ${image ? "has-img" : ""}" ${image ? `style="background-image:url('${object.image}')"` : ""}>🖼</span>
                <button type="button" class="zg-timg-btn" data-timg="pick">${image ? "🔄 เปลี่ยนรูป" : "🖼 ใส่รูป"}</button>
                ${image ? `<button type="button" class="zg-timg-btn zg-timg-btn--danger" data-timg="remove">🗑 ลบรูป</button>` : ""}
            </div>
            ${image ? `
            <div class="zg-timg-modes">
                ${MODES.map(item => `<button type="button" data-timg-mode="${item.key}" class="${item.key === mode ? "is-on" : ""}">${item.label}</button>`).join("")}
            </div>` : ""}
            ${image ? "" : `<div class="zg-timg-hint">หรือลากรูปมาวางบนกล่อง / กด Ctrl+V ตอนเปิดเมนูนี้</div>`}
        `;
    }

    function refreshMenu(object) {

        const menu = currentMenu();

        if (!menu || menu.dataset[MENU_FLAG] !== object.id) return;

        const section = menu.querySelector(".zg-timg-section");

        if (section) section.innerHTML = sectionHtml(object);

        fitMenu(menu);
    }

    function enhanceMenu(menu, object) {

        if (!menu || !object || object.type !== "task" || menu.querySelector(".zg-timg-section")) return;

        menu.dataset[MENU_FLAG] = object.id;

        const section = document.createElement("div");

        section.className = "object-menu-section zg-timg-section";
        section.innerHTML = sectionHtml(object);

        const duplicate = menu.querySelector("#objMenuDuplicateBtn");

        const anchor = duplicate ? duplicate.closest(".object-menu-section") || duplicate.parentNode : null;

        if (anchor && anchor.parentNode === menu) {
            menu.insertBefore(section, anchor);
        } else {
            menu.appendChild(section);
        }

        section.addEventListener("click", async event => {

            const button = event.target.closest("button");

            if (!button) return;

            event.stopPropagation();

            const target = findObject(menu.dataset[MENU_FLAG]);

            if (!target) return;

            if (button.dataset.timg === "pick") {

                const files = await Z.pickImageFiles();

                if (files.length) setImageFromFile(target, files[0]);

            } else if (button.dataset.timg === "remove") {

                removeImage(target);

            } else if (button.dataset.timgMode) {

                target.imageMode = button.dataset.timgMode;

                renderObjects();
                refreshMenu(target);
                Z.recordHistory();
            }
        });

        /* เมนูอาจล้นจอเพราะมีส่วนเพิ่ม → เลื่อนขึ้น / ให้เลื่อนดูในเมนูได้ */
        fitMenu(menu);
    }

    function fitMenu(menu) {

        requestAnimationFrame(() => {

            if (!menu.isConnected) return;

            const margin = 6;

            const maxHeight = window.innerHeight - margin * 2;

            if (menu.offsetHeight > maxHeight) {
                menu.style.maxHeight = `${maxHeight}px`;
                menu.style.overflowY = "auto";
            }

            const rect = menu.getBoundingClientRect();

            let shift = 0;

            if (rect.bottom > window.innerHeight - margin) shift = rect.bottom - (window.innerHeight - margin);
            if (rect.top - shift < margin) shift = rect.top - margin;

            if (shift) {

                const top = parseFloat(menu.style.top);

                if (Number.isFinite(top)) menu.style.top = `${top - shift}px`;
            }
        });
    }

    const originalOpenObjectMenu = openObjectMenu;

    openObjectMenu = function (object) {

        const result = originalOpenObjectMenu.apply(this, arguments);

        try {
            enhanceMenu(currentMenu(), object);
        } catch (error) {
            console.error("[image-task.js]", error);
        }

        return result;
    };


    /* Ctrl+V ตอนเปิดเมนูกล่องงาน → ใส่รูปในกล่องนั้น */
    const previousPaste = Z.onPasteFiles;

    Z.onPasteFiles = function (files) {

        const menu = currentMenu();

        const object = menu && menu.isConnected && menu.dataset[MENU_FLAG]
            ? findObject(menu.dataset[MENU_FLAG])
            : null;

        if (object && files.length) {

            setImageFromFile(object, files[0]);

            return true;
        }

        return previousPaste ? previousPaste(files) : false;
    };


    /* =====================================================
       DROP — ลากไฟล์รูปมาวางบนกล่องงาน
    ===================================================== */

    function taskAt(event) {

        const target = event.target instanceof Element ? event.target : null;

        /* มีหน้าต่างอื่นเปิดทับอยู่ → ไม่ใช่การวางบนกล่องงาน */
        if (target && target.closest(BLOCKERS)) return null;

        let element = target && target.closest("#objectLayer .canvas-object--task");

        if (!element) {

            /* อาจมีชั้นอื่นทับ → หาจากพิกัด */
            element = document
                .elementsFromPoint(event.clientX, event.clientY)
                .find(node => node.matches && node.matches("#objectLayer .canvas-object--task")) || null;
        }

        return element;
    }

    const BLOCKERS = ".zg-iplan, .zg-start, .zg-plan-overlay, .zg-tpl-overlay, .object-menu, .zg-img-menu";

    let dropTarget = null;

    function setDropTarget(element) {

        if (dropTarget === element) return;

        if (dropTarget) dropTarget.classList.remove("zg-timg-drop");

        dropTarget = element;

        if (dropTarget) dropTarget.classList.add("zg-timg-drop");
    }

    document.addEventListener("dragover", event => {

        if (!Z.transferHasFiles(event.dataTransfer)) return;

        setDropTarget(taskAt(event));

    }, true);

    document.addEventListener("dragleave", event => {

        if (!event.relatedTarget) setDropTarget(null);

    }, true);

    document.addEventListener("drop", event => {

        const element = Z.transferHasFiles(event.dataTransfer) ? taskAt(event) : null;

        setDropTarget(null);

        if (!element) return;

        const files = Z.filesFromTransfer(event.dataTransfer).filter(file => Z.isImageFile(file) || Z.isHeic(file));

        if (!files.length) return;

        const object = findObject(element.dataset.objectId);

        if (!object) return;

        event.preventDefault();
        event.stopImmediatePropagation();

        document.querySelectorAll(".zg-img-drop.is-show").forEach(node => node.classList.remove("is-show"));

        setImageFromFile(object, files[0]);

    }, true);


    /* =====================================================
       PICK MODE — เมนู 🖼 → "ใส่รูปในกล่องงาน…" → คลิกกล่อง
    ===================================================== */

    let picking = false;

    function startPicking() {

        if (!timelineObjects.some(object => object.type === "task")) {
            Z.toast("ยังไม่มีกล่องงานในแผนนี้ — กด ＋ งาน ก่อน", true);
            return;
        }

        picking = true;

        document.body.classList.add("zg-timg-picking");

        Z.toast("คลิกกล่องงานที่ต้องการใส่รูป (Esc = ยกเลิก)");
    }

    function stopPicking() {

        picking = false;

        document.body.classList.remove("zg-timg-picking");
    }

    ["pointerdown", "mousedown"].forEach(type => {

        document.addEventListener(type, event => {

            if (!picking) return;

            const element = event.target instanceof Element
                ? event.target.closest("#objectLayer .canvas-object--task")
                : null;

            if (!element) {

                if (type === "pointerdown") stopPicking();

                return;
            }

            event.preventDefault();
            event.stopImmediatePropagation();

        }, true);
    });

    document.addEventListener("click", async event => {

        if (!picking) return;

        const element = event.target instanceof Element
            ? event.target.closest("#objectLayer .canvas-object--task")
            : null;

        if (!element) return;

        event.preventDefault();
        event.stopImmediatePropagation();

        stopPicking();

        const object = findObject(element.dataset.objectId);

        if (!object) return;

        const files = await Z.pickImageFiles();

        if (files.length) setImageFromFile(object, files[0]);

    }, true);

    document.addEventListener("keydown", event => {

        if (picking && event.key === "Escape") stopPicking();
    });


    Z.addMenuItem({
        order: 30,
        group: "task",
        icon: "🧩",
        label: "ใส่รูปในกล่องงาน…",
        sub: "คลิกเลือกกล่องงาน แล้วเลือกรูป (หรือลากรูปไปวางบนกล่อง)",
        run: startPicking
    });

    window.ZGTaskImages = {
        setFromFile: setImageFromFile,
        remove: removeImage
    };

})();
